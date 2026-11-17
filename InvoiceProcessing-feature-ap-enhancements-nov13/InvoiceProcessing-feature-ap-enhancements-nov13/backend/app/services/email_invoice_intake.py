"""Create one invoice case per invoice within a classified email attachment, then dispatch it.

New intake only: matching, validation, approvals, posting and payments continue
through the original invoice code. No Step 5 routing guesses are forced onto it.
"""
import asyncio
import hashlib
import math
from pathlib import Path

from sqlalchemy import select

from ..config import get_settings
from ..db import session_scope
from ..email_invoice_models import EmailInvoiceLink
from ..models import Email, EmailAttachment, Invoice
from . import documents, invoice_parts, document_context
from .common import activity, audit, new_case_id, new_txn_id


class IntakeError(ValueError):
    def __init__(self, status, code):
        self.status, self.code = status, code
        super().__init__(code)


def eligibility(attachment):
    if attachment.document_type != "Invoice":
        return False, "not_invoice"
    info = attachment.extracted_information
    decision = info.get("classification") if isinstance(info, dict) else None
    if not isinstance(decision, dict):
        return False, "classification_missing"
    if (decision.get("document_type") != "Invoice"
            or decision.get("version") != "step5-v4"
            or decision.get("method") != "pdf_gemini"):
        return False, "classification_requires_v4_content_verification"
    confidence = decision.get("confidence")
    if (isinstance(confidence, bool) or not isinstance(confidence, (int, float))
            or not math.isfinite(confidence) or confidence < .85 or confidence > 1):
        return False, "classification_confidence_insufficient"
    if (decision.get("document_needs_review") is not False
            or decision.get("needs_review") is not False
            or decision.get("pdf_readable") is not True):
        return False, "document_classification_needs_review"
    evidence = decision.get("document_evidence")
    if not isinstance(evidence, list) or len([item for item in evidence if isinstance(item, str) and item.strip()]) < 2:
        return False, "document_evidence_insufficient"
    digest = decision.get("source_sha256")
    if not isinstance(digest, str) or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        return False, "classification_source_hash_missing"
    # Unknown purchasing route is not an uncertain document classification.
    return True, "eligible"


def describe(attachment, link=None, invoice=None):
    allowed, reason = eligibility(attachment)
    return {
        "attachment_id": attachment.attachment_id, "email_id": attachment.email_id,
        "filename": attachment.filename, "document_type": attachment.document_type,
        "eligible": allowed, "eligibility_reason": reason,
        "invoice_id": link.invoice_id if link else None,
        "case_id": invoice.case_id if invoice else None,
        "pipeline_state": invoice.pipeline_state if invoice else None,
        "invoice_status": invoice.status if invoice else None,
        "dispatch_state": link.dispatch_state if link else None,
        "part_index": link.part_index if link else None,
        "source_page_start": link.source_page_start if link else None,
        "source_page_end": link.source_page_end if link else None,
        "source_invoice_number": link.source_invoice_number if link else None,
    }


async def list_attachments(email_id=None, limit=100, offset=0):
    async with session_scope() as db:
        query = (select(EmailAttachment, EmailInvoiceLink, Invoice)
                 .outerjoin(EmailInvoiceLink, EmailInvoiceLink.attachment_id == EmailAttachment.attachment_id)
                 .outerjoin(Invoice, Invoice.id == EmailInvoiceLink.invoice_id)
                 .order_by(EmailAttachment.attachment_id).limit(limit).offset(offset))
        if email_id:
            query = query.where(EmailAttachment.email_id == email_id)
        rows = (await db.execute(query)).all()
        return {"items": [describe(*row) for row in rows], "limit": limit, "offset": offset}


async def create_case(attachment_id, actor):
    async with session_scope() as db:
        # The source row exists before forwarding. This lock serializes even the
        # first requests, before a link row exists. PK/UNIQUE enforce it too.
        row = (await db.execute(select(EmailAttachment, Email)
               .join(Email, Email.email_id == EmailAttachment.email_id)
               .where(EmailAttachment.attachment_id == attachment_id)
               .with_for_update(of=EmailAttachment))).one_or_none()
        if row is None:
            raise IntakeError(404, "attachment_not_found")
        attachment, email = row
        links = list((await db.scalars(select(EmailInvoiceLink).where(
            EmailInvoiceLink.attachment_id == attachment_id).order_by(EmailInvoiceLink.part_index))).all())
        allowed, reason = eligibility(attachment)
        if not allowed:
            return {"outcome": "skipped" if reason == "not_invoice" else "held",
                    **describe(attachment)}
        limit = get_settings().max_upload_mb * 1024 * 1024
        try:
            def read_source():
                path = Path(attachment.file_path).resolve()
                if not path.is_relative_to(Path(email.folder_path).resolve()):
                    raise IntakeError(409, "attachment_outside_email_folder")
                with path.open("rb") as handle:
                    return handle.read(limit + 1)
            content = await asyncio.to_thread(read_source)
        except OSError:
            raise IntakeError(409, "attachment_file_unavailable") from None
        if not content or len(content) > limit:
            raise IntakeError(422, "attachment_empty_or_exceeds_upload_limit")
        digest = hashlib.sha256(content).hexdigest()
        decision = attachment.extracted_information["classification"]
        if digest != decision["source_sha256"]:
            raise IntakeError(409, "attachment_changed_reclassify_first")
        if not content.startswith(b"%PDF-"):
            raise IntakeError(422, "attachment_is_not_a_supported_pdf")

        if links and all(link.part_index > 0 for link in links):
            saved = (attachment.extracted_information or {}).get("invoice_parts") or []
            if [link.part_index for link in links] != list(range(1, len(saved)+1)):
                raise IntakeError(409, "invoice_part_links_changed_review_required")
            if any(link.source_sha256 != digest for link in links):
                raise IntakeError(409, "attachment_changed_reclassify_first")
            cases = [describe(attachment, link, await db.get(Invoice, link.invoice_id)) for link in links]
            return {"outcome":"already_linked", **cases[0], "cases":cases}

        try:
            parts = await invoice_parts.find_parts(content)
        except invoice_parts.BoundaryError as error:
            raise IntakeError(422, str(error)) from None
        if links:
            # Never rewrite or silently delete an existing workflow/approval.
            if any(link.part_index == 0 for link in links) and len(parts) > 1:
                raise IntakeError(409, "legacy_multi_invoice_case_requires_explicit_repair")
            expected = list(range(1, len(parts)+1))
            actual = [link.part_index for link in links]
            if actual != [0] and actual != expected:
                raise IntakeError(409, "invoice_part_links_changed_review_required")
            invoices = [await db.get(Invoice, link.invoice_id) for link in links]
            cases = [describe(attachment, link, inv) for link, inv in zip(links, invoices)]
            return {"outcome":"already_linked", **cases[0], "cases":cases}
        cases = []
        invoices = []
        stored = None
        for index, part in enumerate(parts, 1):
            filename = attachment.filename
            invoice = Invoice(txn_id=await new_txn_id(db), case_id=await new_case_id(db),
                channel="mailbox", file_name=documents.safe_name(filename), uploaded_by=actor,
                file_path="", mime_type="", file_sha256="", status="Received", stage="intake",
                received_at=email.received_datetime)
            db.add(invoice)
            await db.flush()
            try:
                if stored is None:
                    stored = await documents.astore(invoice.id, invoice.file_name, content)
                path, mime, sha, pages = stored
            except documents.DocumentError:
                raise IntakeError(422, "invoice_document_storage_validation_failed") from None
            invoice.file_path, invoice.mime_type = str(path), mime
            invoice.file_sha256, invoice.pages = sha, pages
            link = EmailInvoiceLink(attachment_id=attachment_id, part_index=index, invoice_id=invoice.id,
                source_page_start=part.start if len(parts)>1 else 1,
                source_page_end=part.end if len(parts)>1 else pages,
                source_invoice_number=part.number, source_sha256=digest,
                classification_version=decision["version"], forwarded_by=actor, dispatch_state="pending")
            db.add(link)
            activity(db, invoice, f"Document received — {invoice.file_name} ({pages} pages)")
            activity(db, invoice, f"Email {attachment.email_id}; attachment {attachment_id}; original pages {link.source_page_start}-{link.source_page_end}")
            audit(db, actor, f"Invoice document received via mailbox · {invoice.case_id}", invoice,
                email_id=attachment.email_id, attachment_id=attachment_id, part_index=index)
            await db.flush()
            cases.append(describe(attachment, link, invoice))
            invoices.append(invoice)
        document_context.assign(invoices, parts)
        result = {"outcome":"created", **cases[0], "cases":cases}
        attachment.extracted_information = {**attachment.extracted_information,
            "invoice_parts":[{"number":p.number,"start":p.start,"end":p.end} for p in parts],
            "invoice_parts_error":None}
    return result


async def dispatch_case(attachment_id, schedule):
    async with session_scope() as db:
        indexes = list((await db.scalars(select(EmailInvoiceLink.part_index).where(
            EmailInvoiceLink.attachment_id == attachment_id).order_by(EmailInvoiceLink.part_index))).all())
    if not indexes:
        raise IntakeError(404, "invoice_link_not_found")
    results = [await _dispatch_part(attachment_id, index, schedule) for index in indexes]
    return "dispatched" if "dispatched" in results else "already_dispatched"


async def _dispatch_part(attachment_id, part_index, schedule):
    async with session_scope() as db:
        link = (await db.scalars(select(EmailInvoiceLink)
                .where(EmailInvoiceLink.attachment_id == attachment_id, EmailInvoiceLink.part_index == part_index)
                .with_for_update())).one_or_none()
        if not link:
            raise IntakeError(404, "invoice_link_not_found")
        invoice = await db.get(Invoice, link.invoice_id)
        invoice_id = link.invoice_id
        if invoice.pipeline_state != "queued":
            # Existing worker/requeue has already picked it up; never run twice.
            link.dispatch_state = "dispatched"
            return "already_dispatched"
        if link.dispatch_state not in ("pending", "failed"):
            return "already_dispatched"
        link.dispatch_state = "dispatching"
    try:
        # For API async mode, this enqueues on the SAME existing scheduler.
        # For inline mode, it awaits the SAME existing pipeline.process().
        await schedule(invoice_id)
    except Exception:
        async with session_scope() as db:
            link = await db.get(EmailInvoiceLink, (attachment_id, part_index))
            if link:
                link.dispatch_state = "failed"
        raise IntakeError(503, "case_saved_dispatch_failed_retry_forwarding") from None
    async with session_scope() as db:
        link = await db.get(EmailInvoiceLink, (attachment_id, part_index))
        if link:
            link.dispatch_state = "dispatched"
    return "dispatched"


async def linked_result(attachment_id):
    async with session_scope() as db:
        row = (await db.execute(select(EmailAttachment, EmailInvoiceLink, Invoice)
               .join(EmailInvoiceLink, EmailInvoiceLink.attachment_id == EmailAttachment.attachment_id)
               .join(Invoice, Invoice.id == EmailInvoiceLink.invoice_id)
               .where(EmailAttachment.attachment_id == attachment_id)
               .order_by(EmailInvoiceLink.part_index))).all()
        if not row:
            raise IntakeError(404, "invoice_link_not_found")
        cases = [describe(*item) for item in row]
        return {**cases[0], "cases":cases}
