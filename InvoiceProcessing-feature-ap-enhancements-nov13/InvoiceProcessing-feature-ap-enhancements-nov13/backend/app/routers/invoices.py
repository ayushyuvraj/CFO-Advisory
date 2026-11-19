"""Invoice intake and the transaction journey."""

import shutil
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from ..config import get_settings
from ..db import get_db
from ..deps import current_user, current_company, current_persona, invoice_or_404
from ..models import Invoice
from ..schemas import (
    ApprovalIn,
    AskIn,
    DecisionIn,
    FieldCorrection,
    LineCorrection,
    RejectIn,
    SourceRequestIn,
)
from ..services import approvals, copilot, corrections, decisions, documents, pipeline, serializers
from ..services.common import activity, audit, new_case_id, new_txn_id

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


async def _schedule(invoice_id: str) -> None:
    """Called after the upload is committed, so the worker always sees the row."""
    if get_settings().async_processing:
        pipeline.enqueue(invoice_id)
    else:
        await pipeline.process(invoice_id)


# ── Intake ───────────────────────────────────────────────────────────────────


@router.get("/upload-capabilities", summary="Bulk upload screening availability")
async def upload_capabilities():
    return {"documentScreening": True, "version": "invoice-screening-v1"}


@router.post("", status_code=202, summary="Upload an invoice (PDF, JPG, PNG, TIFF) and start processing")
async def upload(
    file: UploadFile = File(...),
    channel: Literal["upload", "mailbox", "connector"] = Form("upload"),
    db: AsyncSession = Depends(get_db),
    user: str = Depends(current_user),
    company_id: str | None = Depends(current_company),
    persona_id: str | None = Depends(current_persona),
    request_id: str | None = Form(default=None, max_length=36),
    screen_document: bool = Form(default=False),
):
    limit = get_settings().max_upload_mb * 1024 * 1024
    content = await file.read(limit + 1)
    from ..services.upload_requests import upload_invoice_id, verify_upload
    stable_id = upload_invoice_id(user, request_id) if request_id else None
    if stable_id:
        existing = await db.get(Invoice, stable_id)
        if existing is not None:
            verify_upload(existing, content, user)
            return await _resume_upload(db, existing)
    if screen_document:
        # Classification precedes identifiers, storage and case creation.
        await db.rollback()  # Release a read-only retry lookup during provider work.
        from ..services.upload_screening import screen_upload
        screening = await screen_upload(
            content,
            documents.safe_name(file.filename or "document"),
            user=user,
            company_id=company_id,
            persona_id=persona_id,
        )
        if screening["outcome"] != "invoice":
            return screening
    inv = Invoice(**({"id": stable_id} if stable_id else {}), txn_id=await new_txn_id(db), case_id=await new_case_id(db), channel=channel,
                  file_name=documents.safe_name(file.filename or "invoice"), uploaded_by=user,
                  file_path="", mime_type="", file_sha256="", status="Received", stage="intake")
    db.add(inv)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        existing = await db.get(Invoice, stable_id) if stable_id else None
        if existing is None:
            raise
        verify_upload(existing, content, user)
        return await _resume_upload(db, existing)
    try:
        path, mime, sha, pages = await documents.astore(inv.id, inv.file_name, content)
    except documents.DocumentError as e:
        await db.rollback()
        shutil.rmtree(get_settings().storage_dir / inv.id, ignore_errors=True)
        raise HTTPException(422, str(e))
    inv.file_path, inv.mime_type, inv.file_sha256, inv.pages = str(path), mime, sha, pages
    activity(db, inv, f"Document received — {inv.file_name} ({pages} page{'s' if pages > 1 else ''})")
    audit(db, user, f"Invoice document {inv.file_name} received via {channel} · {inv.case_id}", inv)
    from ..services.document_context import prepare_upload
    from ..services.invoice_parts import BoundaryError
    try:
        case_ids = await prepare_upload(db, inv, content, user)
    except BoundaryError as error:
        await db.rollback()
        raise HTTPException(422, str(error)) from None
    await db.commit()
    for case_id in case_ids:
        await _schedule(case_id)
    # Reload with collections eager-loaded (a new object's are unloaded, and an
    # inline run has changed it in another session).
    inv = await db.get(Invoice, inv.id, populate_existing=True)
    return serializers.invoice_detail(inv)


async def _resume_upload(db: AsyncSession, inv: Invoice):
    """Retry after a lost response: retain cases and only reschedule queued work."""
    root_id = inv.id
    entries = ((inv.raw_extraction or {}).get("_document_context") or {}).get("invoices", [])
    case_ids = list(dict.fromkeys([root_id] + [entry["id"] for entry in entries]))
    queued = []
    for case_id in case_ids:
        case = await db.get(Invoice, case_id)
        if case is not None and case.pipeline_state == "queued":
            queued.append(case_id)
    await db.commit()
    for case_id in queued:
        await _schedule(case_id)
    inv = await db.get(Invoice, root_id, populate_existing=True)
    return serializers.invoice_detail(inv)


@router.post("/{invoice_id}/reprocess", status_code=202, summary="Run extraction again from the source document")
async def reprocess(inv: Invoice = Depends(invoice_or_404),
              db: AsyncSession = Depends(get_db), user: str = Depends(current_user)):
    if inv.status in ("Posted", "Paid"):
        raise HTTPException(409, f"Invoice is {inv.status.lower()} and cannot be reprocessed")
    if inv.pipeline_state == "running":
        raise HTTPException(409, "Invoice is already being processed")
    inv.pipeline_state, inv.pipeline_step, inv.corrected = "queued", 0, False
    approvals.reset(inv)
    inv.corrections.clear()
    audit(db, user, f"Reprocessing requested for {inv.case_id}", inv)
    await db.commit()
    await _schedule(inv.id)
    return {"id": inv.id, "pipeline": "queued"}


# ── Reads ────────────────────────────────────────────────────────────────────


@router.get("", summary="AP inbox — cases with filters")
async def list_invoices(
    q: str | None = None,
    status: str | None = None,
    type: Literal["PO", "Non-PO"] | None = None,
    currency: str | None = None,
    exception: str | None = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Invoice).order_by(Invoice.received_at.desc())
    if status and status != "All statuses":
        stmt = stmt.where(Invoice.status == status)
    if currency and currency != "All":
        stmt = stmt.where(Invoice.currency == currency)
    if type == "PO":
        stmt = stmt.where(Invoice.po_number.is_not(None), Invoice.po_number != "")
    elif type == "Non-PO":
        stmt = stmt.where(or_(Invoice.po_number.is_(None), Invoice.po_number == ""))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Invoice.invoice_number.ilike(like), Invoice.vendor_name.ilike(like),
                              Invoice.case_id.ilike(like), Invoice.po_number.ilike(like),
                              Invoice.txn_id.ilike(like), Invoice.zoho_bill_id.ilike(like)))
    rows = [serializers.case_row(i) for i in (await db.execute(stmt)).scalars()]
    if exception and exception != "All":
        rows = [r for r in rows if r["exception"] == exception]
    return {"total": len(rows), "items": rows[offset: offset + limit]}


@router.get("/{invoice_id}", summary="Full transaction: extraction, checks, match, approvals, payments")
async def get_invoice(inv: Invoice = Depends(invoice_or_404)):
    return serializers.invoice_detail(inv)


@router.post("/{invoice_id}/refresh-locations", summary="Verify PDF highlights without changing invoice values")
async def refresh_locations(inv: Invoice = Depends(invoice_or_404),
                            db: AsyncSession = Depends(get_db), user: str = Depends(current_user)):
    inv = (await db.execute(select(Invoice).where(Invoice.id == inv.id).with_for_update()
                            .execution_options(populate_existing=True))).scalar_one()
    if inv.pipeline_state in ('queued', 'running'):
        raise HTTPException(409, "Wait for invoice processing to finish before refreshing highlights.")
    try:
        await pipeline.snap_locations(inv)
    except Exception:
        # Do not expose OCR internals, document text, paths or credentials.
        raise HTTPException(503, "Highlight verification unavailable. Check that the OCR dependencies and model files are installed.") from None
    for field in inv.fields:
        if not field.value:
            field.bbox = None
    available = sum(bool(f.value and f.bbox) for f in inv.fields if f.key != 'vendorId')
    missing = sum(bool(f.value and not f.bbox) for f in inv.fields if f.key != 'vendorId')
    audit(db, user, "Refreshed document highlight coordinates", inv,
          verified_fields=available, unavailable_fields=missing)
    await db.commit()
    return {"verified": available, "unavailable": missing}


@router.get("/{invoice_id}/progress", summary="Lightweight pipeline progress for polling")
async def progress(inv: Invoice = Depends(invoice_or_404)):
    return {"state": inv.pipeline_state, "step": inv.pipeline_step, "steps": pipeline.PIPELINE_STEPS,
            "status": inv.status, "error": inv.error}


@router.get("/{invoice_id}/document", summary="The original uploaded file")
async def document(inv: Invoice = Depends(invoice_or_404)):
    return FileResponse(inv.file_path, media_type=inv.mime_type, filename=inv.file_name,
                        content_disposition_type="inline")


@router.get("/{invoice_id}/pages/{page}", summary="A rendered page image for the trace viewer")
async def page_image(page: int, dpi: int = Query(110, ge=50, le=200), inv: Invoice = Depends(invoice_or_404)):
    try:
        png = await documents.arender_page(inv.file_path, page, dpi)
    except documents.DocumentError as e:
        raise HTTPException(404, str(e))
    return Response(png, media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})


@router.get("/{invoice_id}/evidence", summary="Source evidence: PO, GRN and invoice values side by side")
async def evidence(line_no: int | None = None, inv: Invoice = Depends(invoice_or_404), db: AsyncSession = Depends(get_db)):
    return serializers.evidence(db, inv, line_no)


@router.get("/{invoice_id}/t360", summary="Transaction 360 lifecycle")
async def t360(inv: Invoice = Depends(invoice_or_404), db: AsyncSession = Depends(get_db)):
    return {"txnId": inv.txn_id, "stages": await serializers.transaction360(db, inv)}


@router.get("/{invoice_id}/audit", summary="Audit trail for this transaction, newest first")
async def invoice_audit(inv: Invoice = Depends(invoice_or_404), db: AsyncSession = Depends(get_db)):
    return await serializers.audit_rows(db, inv.id)


# ── Resolution ───────────────────────────────────────────────────────────────


@router.post("/{invoice_id}/corrections", summary="Correct an invoice value with a reason; the match re-runs")
async def correct(body: LineCorrection | FieldCorrection, inv: Invoice = Depends(invoice_or_404),
            db: AsyncSession = Depends(get_db), user: str = Depends(current_user)):
    try:
        if isinstance(body, LineCorrection):
            await corrections.correct_line(db, inv, body.line_no, body.field, body.value, body.reason, body.comment, user)
        else:
            await corrections.correct_field(db, inv, body.key, body.value, body.reason, body.comment, user)
    except corrections.CorrectionError as e:
        raise HTTPException(409, str(e))
    await db.commit()
    return serializers.invoice_detail(inv)


@router.post("/{invoice_id}/source-requests", status_code=201,
             summary="Ask Zoho's owner to correct a PO or goods-receipt value")
async def source_request(body: SourceRequestIn, inv: Invoice = Depends(invoice_or_404),
                   db: AsyncSession = Depends(get_db), user: str = Depends(current_user)):
    try:
        req = await corrections.raise_source_request(db, inv, body.document, body.field, body.requested_value,
                                               body.reason, user)
    except corrections.CorrectionError as e:
        raise HTTPException(409, str(e))
    await db.commit()
    return {"ref": req.ref, "status": req.status, "documentRef": req.document_ref}


@router.post("/{invoice_id}/revalidate", summary="Re-run validation and the match against fresh Zoho data")
async def revalidate(inv: Invoice = Depends(invoice_or_404), db: AsyncSession = Depends(get_db),
               user: str = Depends(current_user)):
    if inv.pipeline_state != "done":
        raise HTTPException(409, "The invoice has not finished processing")
    if inv.status in ("Posted", "Paid"):
        raise HTTPException(409, f"Invoice is {inv.status.lower()}")
    approvals.reset(inv)
    await pipeline.revalidate(db, inv, user)
    await db.commit()
    return serializers.invoice_detail(inv)


# ── Approval and decision ────────────────────────────────────────────────────


@router.post("/{invoice_id}/approve", summary="Approve the pending DOA level")
async def approve(body: ApprovalIn | None = None, inv: Invoice = Depends(invoice_or_404),
            db: AsyncSession = Depends(get_db), user: str = Depends(current_user)):
    try:
        approvals.approve(db, inv, user, body.comment if body else None)
    except approvals.ApprovalError as e:
        raise HTTPException(409, str(e))
    await db.commit()
    return serializers.invoice_detail(inv)


@router.post("/{invoice_id}/reject", summary="Reject at the pending DOA level (parks the invoice)")
async def reject(body: RejectIn, inv: Invoice = Depends(invoice_or_404), db: AsyncSession = Depends(get_db),
           user: str = Depends(current_user)):
    try:
        approvals.reject(db, inv, user, body.comment)
    except approvals.ApprovalError as e:
        raise HTTPException(409, str(e))
    await db.commit()
    return serializers.invoice_detail(inv)


@router.post("/{invoice_id}/decision", summary="Submit for posting to Zoho, park, request clarification, or resume")
async def decide(body: DecisionIn, inv: Invoice = Depends(invoice_or_404), db: AsyncSession = Depends(get_db),
           user: str = Depends(current_user)):
    try:
        if body.action == "submit":
            await decisions.submit(db, inv, user, body.note)
        elif body.action == "park":
            await decisions.park(db, inv, user, body.reason or "Other", body.note)
        elif body.action == "clarify":
            if not body.note:
                raise HTTPException(422, "A clarification needs a note")
            await decisions.clarify(db, inv, user, body.to or "Business owner", body.note)
        else:
            await decisions.resume(db, inv, user)
    except decisions.DecisionError as e:
        raise HTTPException(409, str(e))
    await db.commit()
    return serializers.invoice_detail(inv)


# ── Copilot ──────────────────────────────────────────────────────────────────


@router.get("/{invoice_id}/copilot", summary="Conversation history and suggested prompts")
async def chat_history(inv: Invoice = Depends(invoice_or_404)):
    return {"suggested": copilot.SUGGESTED,
            "messages": [{"role": m.role, "text": m.text, "sources": m.sources, "recommendation": m.recommendation}
                         for m in inv.chat]}


@router.post("/{invoice_id}/copilot", summary="Ask the agent about this transaction")
async def ask(body: AskIn, inv: Invoice = Depends(invoice_or_404), db: AsyncSession = Depends(get_db),
        user: str = Depends(current_user)):
    msg = await copilot.ask(db, inv, body.question, user)
    await db.commit()
    return {"role": msg.role, "text": msg.text, "sources": msg.sources, "recommendation": msg.recommendation}
