"""Additive UI orchestration. Reuses Steps 2–6; GET endpoints never process data."""
import asyncio
import hashlib
from email import policy
from .email_formats import parse_email_bytes, email_identity
from pathlib import Path
from uuid import NAMESPACE_URL, uuid4, uuid5

from sqlalchemy import func, or_, select, text, update

from ..config import get_settings
from ..db import session_scope
from ..models import Email, EmailAttachment, utcnow
from ..email_upload_models import EmailUploadJob
from ..email_invoice_models import EmailInvoiceLink
from ..models import Invoice
from . import email_reader, email_store, classify_emails, email_invoice_intake

_tasks = {}
_slots = None
ACTIVE = {"queued", "running"}


class EmailUiError(ValueError):
    def __init__(self, status, code):
        self.status, self.code = status, code
        super().__init__(code)


def upload_folder():
    return get_settings().email_raw_dir or email_reader.INPUT_DIR / "ui_uploads"


def job_data(job):
    if not job:
        return None
    return {"status":job.status, "stage":job.stage, "processed":job.processed,
            "total":job.total, "error_code":job.error_code, "updated_at":job.updated_at}


async def serialise_uploads(db):
    # Same lock as Step 4, coordinating source IDs/folders with CLI imports.
    if db.bind.dialect.name == "postgresql":
        await db.execute(text("SELECT pg_advisory_xact_lock(49201864001)"))


async def accept_upload(raw, filename, actor):
    suffix = Path(filename).suffix.lower()
    if suffix not in (".eml", ".msg"):
        raise EmailUiError(422, "Select an .eml or Outlook .msg email file.")
    try:
        message = await asyncio.to_thread(parse_email_bytes, raw, suffix)
    except ValueError:
        raise EmailUiError(422, "The file is not a valid supported email. Use .eml or Outlook .msg.") from None
    if not raw or not any(message.get(key) for key in ("From", "To", "Message-ID")):
        raise EmailUiError(422, "The file does not contain valid email headers.")
    digest = hashlib.sha256(raw).hexdigest()
    identity = email_identity(raw, message, suffix)
    email_id = str(uuid5(NAMESPACE_URL, identity))
    should_launch = False
    async with session_scope() as db:
        await serialise_uploads(db)
        existing = await db.get(Email, email_id)
        job = await db.get(EmailUploadJob, email_id)
        if any(item and item.source_sha256 != digest for item in (existing, job)):
            raise EmailUiError(409, "This Message-ID already belongs to different email content.")
        path = upload_folder() / f"{email_id}{suffix}"
        def save():
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.exists():
                if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                    raise EmailUiError(409, "Stored upload content conflicts with this email.")
                return
            temporary = path.with_suffix(f".{uuid4().hex}.tmp")
            temporary.write_bytes(raw)
            temporary.replace(path)
        await asyncio.to_thread(save)
        duplicate = bool(existing or job)
        if job is None:
            job = EmailUploadJob(email_id=email_id, source_sha256=digest, raw_path=str(path.resolve()),
                subject=str(message.get("Subject") or "No Subject"), sender=str(message.get("From") or ""),
                recipient=str(message.get("To") or ""), actor=actor,
                status="completed" if existing else "queued",
                stage="Existing email retained; use Retry processing if needed" if existing else "Waiting to process")
            db.add(job)
            await db.flush()
        should_launch = job.status == "queued"
    if should_launch:
        launch(email_id)
    return {"email_id":email_id, "duplicate":duplicate}


async def mark(email_id, **values):
    async with session_scope() as db:
        values["updated_at"] = utcnow()
        await db.execute(update(EmailUploadJob).where(EmailUploadJob.email_id == email_id).values(**values))


def launch(email_id):
    if email_id in _tasks and not _tasks[email_id].done():
        return
    task = asyncio.create_task(process_job(email_id), name=f"email-upload-{email_id}")
    _tasks[email_id] = task
    def finished(done):
        if _tasks.get(email_id) is done:
            _tasks.pop(email_id, None)
        if not done.cancelled():
            done.exception()  # Retrieve failures; errors are recorded without secrets.
    task.add_done_callback(finished)


async def process_job(email_id):
    global _slots
    if _slots is None:
        _slots = asyncio.Semaphore(2)
    async with _slots:
        async with session_scope() as db:
            claimed = await db.execute(update(EmailUploadJob).where(
                EmailUploadJob.email_id == email_id, EmailUploadJob.status == "queued")
                .values(status="running", stage="Storing email and PDF attachments", error_code=None, updated_at=utcnow()))
            if claimed.rowcount != 1:
                return
            job = await db.get(EmailUploadJob, email_id)
            source, actor = Path(job.raw_path), job.actor
        stage = "import_failed"
        try:
            if not source.resolve().is_relative_to(upload_folder().resolve()) or not source.is_file():
                raise EmailUiError(409, "stored_upload_unavailable")
            await email_store.import_email(source)
            async with session_scope() as db:
                ids = list((await db.scalars(select(EmailAttachment.attachment_id)
                    .where(EmailAttachment.email_id == email_id).order_by(EmailAttachment.attachment_id))).all())
            await mark(email_id, total=len(ids), processed=0)
            technical_errors = False
            for index, attachment_id in enumerate(ids):
                stage = "classification_or_forwarding_failed"
                await mark(email_id, stage=f"Classifying attachment {index+1} of {len(ids)}")
                # Existing successful v4 decisions are skipped, only review failures retried.
                try:
                    await classify_emails.process_one(attachment_id, retry_review=True)
                    async with session_scope() as db:
                        attachment = await db.get(EmailAttachment, attachment_id)
                        info = attachment.extracted_information or {}
                        decision = info.get("classification") or {}
                        if decision.get("method") in ("file_error", "processing_error"):
                            technical_errors = True
                    await mark(email_id, stage=f"Linking eligible Invoice {index+1} of {len(ids)}")
                    result = await email_invoice_intake.create_case(attachment_id, actor)
                    if result["outcome"] in ("created", "already_linked"):
                        from ..routers.invoices import _schedule
                        await email_invoice_intake.dispatch_case(attachment_id, _schedule)
                    async with session_scope() as db:
                        attachment = await db.get(EmailAttachment, attachment_id)
                        if attachment and (attachment.extracted_information or {}).get('invoice_parts_error'):
                            attachment.extracted_information = {**attachment.extracted_information, 'invoice_parts_error':None}
                except Exception as error:
                    technical_errors = True
                    async with session_scope() as db:
                        attachment = await db.get(EmailAttachment, attachment_id)
                        if attachment:
                            attachment.extracted_information = {**(attachment.extracted_information or {}),
                                "invoice_parts_error":error.code if isinstance(error, email_invoice_intake.IntakeError)
                                else "attachment_processing_requires_retry"}
                await mark(email_id, processed=index+1)
            await mark(email_id, status="partial" if technical_errors else "completed",
                stage="Some attachments need retry" if technical_errors else "Email processed; see attachment/case statuses",
                error_code="attachment_processing_requires_retry" if technical_errors else None)
        except asyncio.CancelledError:
            await mark(email_id, status="interrupted", stage="Interrupted; will resume on backend restart",
                       error_code="processing_interrupted")
            raise
        except Exception:
            await mark(email_id, status="failed", stage="Email processing stopped", error_code=stage)


async def start():
    global _slots
    _slots = asyncio.Semaphore(2)
    async with session_scope() as db:
        jobs = (await db.scalars(select(EmailUploadJob).where(
            EmailUploadJob.status.in_(("queued", "running", "interrupted"))))).all()
        ids = [job.email_id for job in jobs]
        for job in jobs:
            job.status, job.stage, job.updated_at = "queued", "Resuming saved upload", utcnow()
    for email_id in ids:
        launch(email_id)


async def stop():
    tasks = list(_tasks.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


async def retry(email_id, actor):
    async with session_scope() as db:
        job = (await db.scalars(select(EmailUploadJob).where(
            EmailUploadJob.email_id == email_id).with_for_update())).one_or_none()
        if job is None:
            raise EmailUiError(409, "Upload the original .eml or .msg once to enable UI retries for this email.")
        if job.status not in ACTIVE:
            job.status, job.stage, job.actor = "queued", "Waiting to retry incomplete work", actor
            job.updated_at = utcnow()
    launch(email_id)
    return {"email_id":email_id}


async def list_emails(q="", limit=20, offset=0):
    async with session_scope() as db:
        identities = select(Email.email_id).union(select(EmailUploadJob.email_id)).subquery()
        counts = select(EmailAttachment.email_id, func.count().label("count")).group_by(EmailAttachment.email_id).subquery()
        links = (select(EmailAttachment.email_id, func.count(func.distinct(EmailInvoiceLink.invoice_id)).label("linked_count"))
            .join(EmailInvoiceLink, EmailInvoiceLink.attachment_id == EmailAttachment.attachment_id)
            .group_by(EmailAttachment.email_id).subquery())
        query = (select(identities.c.email_id, Email, EmailUploadJob, counts.c.count, links.c.linked_count).select_from(identities)
            .outerjoin(Email, Email.email_id == identities.c.email_id)
            .outerjoin(EmailUploadJob, EmailUploadJob.email_id == identities.c.email_id)
            .outerjoin(counts, counts.c.email_id == identities.c.email_id)
            .outerjoin(links, links.c.email_id == identities.c.email_id))
        if q.strip():
            pattern = "%" + q.strip() + "%"
            query = query.where(or_(func.coalesce(Email.subject, EmailUploadJob.subject).ilike(pattern),
                func.coalesce(Email.sender, EmailUploadJob.sender).ilike(pattern)))
        total = await db.scalar(select(func.count()).select_from(query.subquery()))
        rows = (await db.execute(query.order_by(
            func.coalesce(Email.received_datetime, EmailUploadJob.created_at).desc(), identities.c.email_id)
            .limit(limit).offset(offset))).all()
        items = []
        for identity, email, job, count, linked_count in rows:
            items.append({"email_id":identity, "subject":email.subject if email else job.subject,
                "sender":email.sender if email else job.sender,
                "recipient":email.recipient if email else job.recipient,
                "linked_case_count":linked_count or 0,
                "received_datetime":email.received_datetime if email else job.created_at,
                "attachment_count":count or 0, "job":job_data(job)})
        return {"items":items, "total":total or 0}


async def email_detail(email_id):
    async with session_scope() as db:
        email, job = await db.get(Email, email_id), await db.get(EmailUploadJob, email_id)
        if not email and not job:
            raise EmailUiError(404, "Email not found.")
        rows = (await db.execute(select(EmailAttachment, EmailInvoiceLink, Invoice)
            .outerjoin(EmailInvoiceLink, EmailInvoiceLink.attachment_id == EmailAttachment.attachment_id)
            .outerjoin(Invoice, Invoice.id == EmailInvoiceLink.invoice_id)
            .where(EmailAttachment.email_id == email_id).order_by(EmailAttachment.filename, EmailInvoiceLink.part_index))).all()
        attachments = []
        for attachment, link, invoice in rows:
            decision = (attachment.extracted_information or {}).get("classification") or {}
            attachments.append({**email_invoice_intake.describe(attachment, link, invoice),
                "invoice_parts_error":(attachment.extracted_information or {}).get("invoice_parts_error"),
                "size_bytes":attachment.size_bytes, "content_type":attachment.content_type,
                "invoice_number":invoice.invoice_number if invoice else None,
                "vendor_name":invoice.vendor_name if invoice else None,
                "invoice_total":invoice.total if invoice else None,
                "invoice_currency":invoice.currency if invoice else None,
                "invoice_po_reference":invoice.po_number if invoice else None,
                "invoice_match_status":invoice.match_status if invoice else None,
                "invoice_match_mode":(invoice.match_result or {}).get("mode") if invoice else None,
                "classification":{key:decision.get(key) for key in (
                    "confidence", "needs_review", "reason", "method", "version", "invoice_subtype",
                    "invoice_route", "routing_needs_review", "routing_reason", "document_evidence")}})
        return {"email_id":email_id, "subject":email.subject if email else job.subject,
            "sender":email.sender if email else job.sender, "recipient":email.recipient if email else job.recipient,
            "body":email.body if email else "", "received_datetime":email.received_datetime if email else job.created_at,
            "job":job_data(job), "attachments":attachments, "retry_available":bool(job)}


async def pdf_location(attachment_id):
    async with session_scope() as db:
        row = (await db.execute(select(EmailAttachment, Email).join(Email,
            Email.email_id == EmailAttachment.email_id).where(EmailAttachment.attachment_id == attachment_id))).one_or_none()
        if row is None:
            raise EmailUiError(404, "Attachment not found.")
        attachment, email = row
        path = Path(attachment.file_path).resolve()
        if not path.is_relative_to(Path(email.folder_path).resolve()) or path.suffix.lower() != ".pdf" or not path.is_file():
            raise EmailUiError(404, "Attachment PDF is unavailable.")
        return path, attachment.filename
