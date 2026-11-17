"""Run from backend: python -m app.services.classify_emails"""
import argparse
import asyncio
import hashlib
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from ..db import engine, session_scope
from ..models import Email, EmailAttachment
from .document_classification import VERSION, classify_attachment
from .email_store import require_email_postgres


async def process_one(attachment_id, *, force=False, retry_review=False, confirmed_hashes=()):
    async with session_scope() as db:
        # Only one worker can classify/update this row at a time.
        row = (await db.execute(select(EmailAttachment, Email.subject, Email.body)
               .join(Email, Email.email_id == EmailAttachment.email_id)
               .where(EmailAttachment.attachment_id == attachment_id)
               .with_for_update(of=EmailAttachment))).one_or_none()
        if row is None:
            return "missing"
        attachment, subject, body = row
        info = dict(attachment.extracted_information or {})
        previous = info.get("classification", {})
        if not isinstance(previous, dict):
            previous = {}
        if previous.get("version") == VERSION and not force and not confirmed_hashes:
            if not (retry_review and previous.get("needs_review")):
                return "skipped"
        hashes = set(confirmed_hashes)
        if previous.get("routing_source") == "user_confirmation" and previous.get("source_sha256"):
            hashes.add(previous["source_sha256"])
        decision, extracted_text = await classify_attachment(
            subject, body, attachment.filename, attachment.file_path,
            confirmed_non_po_sha256s=hashes)
        decision["classified_at"] = datetime.now(timezone.utc).isoformat()
        info["classification"] = decision
        attachment.document_type = decision["document_type"]
        attachment.extracted_information = info
        if extracted_text is not None:
            attachment.extracted_text = extracted_text
    route = decision["invoice_route"]
    outcome = decision["document_type"]
    if outcome == "Invoice":
        outcome += f" ({decision['invoice_subtype']})"
        if route == "Pending verification":
            outcome += "; PO/Non-PO status not established"
        elif route == "PO":
            outcome += "; PO reference present; matching pending"
        else:
            outcome += f"; route={route}"
    if decision["needs_review"]:
        outcome += "; document classification review required"
    return outcome


async def run(args):
    try:
        require_email_postgres(engine.url)
        confirmed_hashes = set()
        for filename in args.confirm_non_po_file:
            try:
                digest = await asyncio.to_thread(lambda: hashlib.sha256(Path(filename).read_bytes()).hexdigest())
            except OSError:
                raise RuntimeError("Cannot read a Non-PO confirmation file") from None
            confirmed_hashes.add(digest)
        async with session_scope() as db:
            query = select(EmailAttachment.attachment_id).order_by(EmailAttachment.attachment_id)
            if args.email_id:
                query = query.where(EmailAttachment.email_id == args.email_id)
            ids = list((await db.scalars(query)).all())
        if not ids:
            print("No stored attachments found. Run the Step 4 importer first.")
        totals = {}
        for index, attachment_id in enumerate(ids, 1):
            try:
                outcome = await process_one(attachment_id, force=args.force,
                                            retry_review=args.retry_review, confirmed_hashes=confirmed_hashes)
            except Exception:
                raise RuntimeError(f"Attachment {index}: database operation failed; stopped") from None
            totals[outcome] = totals.get(outcome, 0) + 1
            print(f"Attachment {index}/{len(ids)}: {outcome}", flush=True)
        print("Summary:", totals)
    finally:
        await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Classify Step 4 attachments in local PostgreSQL")
    parser.add_argument("--email-id", help="Process only this stored Email ID")
    parser.add_argument("--confirm-non-po-file", action="append", default=[], metavar="PDF_PATH",
                        help="Explicitly confirm Non-PO for invoices matching this PDF's exact SHA-256; repeatable")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--force", action="store_true", help="Reclassify all selected attachments")
    group.add_argument("--retry-review", action="store_true", help="Also retry flagged attachments")
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
