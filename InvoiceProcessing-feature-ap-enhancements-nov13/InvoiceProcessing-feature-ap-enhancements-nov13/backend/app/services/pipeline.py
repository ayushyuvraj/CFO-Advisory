"""The invoice processing pipeline.

Ten stages, matching the Extraction screen's progress list. Progress is
committed after each stage so the UI can poll ``pipeline_step``. Stages 2–10
are pure functions of the database, so ``revalidate`` re-runs them after a
correction without calling the model again.
"""

import asyncio
import logging
import traceback

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import session_scope
from ..models import ConnectorState, Invoice, InvoiceField, InvoiceLine, ZReceive
from . import locate, matching, validation
from .common import AGENT, activity, audit, inr, now, parse_amount, parse_date, policies, terms_days
from .extraction import get_extractor, to_bbox
from .zoho.sync import refresh_for_invoice

log = logging.getLogger(__name__)

PIPELINE_STEPS = [
    "Reading invoice structure…",
    "Identifying supplier…",
    "Validating GSTIN…",
    "Interpreting line items…",
    "Recomputing GST…",
    "Checking invoice against PO…",
    "Validating quantities…",
    "Checking for duplicate invoices…",
    "Assessing exception risk…",
    "Recommending next action…",
]

# UI field key → (label, extraction key). The first fourteen are extraction fields.
FIELD_MAP: list[tuple[str, str, str]] = [
    ("vendor", "Vendor Name", "vendor_name"),
    ("vendorId", "Vendor ID", ""),
    ("gstin", "GSTIN", "vendor_gstin"),
    ("number", "Invoice Number", "invoice_number"),
    ("date", "Invoice Date", "invoice_date"),
    ("po", "PO Number", "po_number"),
    ("currency", "Currency", "currency"),
    ("terms", "Payment Terms", "payment_terms"),
    ("entity", "Billing Entity", "buyer_name"),
    ("subtotal", "Taxable Value", "subtotal"),
    ("tax", "Tax Amount", "total_tax"),
    ("total", "Total Amount", "total"),
    ("tinNumber", "TIN_NUMBER", "vendor_tin"),
    ("vatNo", "VAT_NO", "vendor_vat"),
    # Supporting fields
    ("pan", "Vendor PAN", "vendor_pan"),
    ("buyerGstin", "Buyer GSTIN", "buyer_gstin"),
    ("pos", "Place of Supply", "place_of_supply"),
    ("shipTo", "Ship To", "ship_to"),
    ("dueDate", "Due Date", "due_date"),
    ("irn", "E-invoice IRN", "irn"),
    ("tds", "TDS", "tds_amount"),
    ("netPayable", "Net Payable", "net_payable"),
]
HEADER_KEYS = [k for k, _, _ in FIELD_MAP[:14]]


class Scheduler:
    """Extract concurrently, validate in order.

    Up to ``extraction_concurrency`` invoices are read by Gemini at the same
    time — that is where the wall-clock goes. Validation and matching then run
    one at a time in the order invoices were queued, so the first copy of a
    duplicate pair is always the one treated as the original, and quantities
    billed against a PO line are counted in arrival order.
    """

    def __init__(self, concurrency: int) -> None:
        self._slots = asyncio.Semaphore(concurrency)
        self._turn = asyncio.Condition()
        self._issued = 0
        self._serving = 0
        self._tasks: set[asyncio.Task] = set()

    def enqueue(self, invoice_id: str) -> None:
        ticket, self._issued = self._issued, self._issued + 1
        task = asyncio.create_task(self._run(invoice_id, ticket), name=f"invoice-{invoice_id}")
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _run(self, invoice_id: str, ticket: int) -> None:
        data, error = None, None
        try:
            async with self._slots:
                data = await _extract(invoice_id)
        except Exception as e:  # recorded on the invoice when its turn comes
            error = e
        async with self._turn:
            await self._turn.wait_for(lambda: self._serving == ticket)
        try:
            await _validate(invoice_id, data, error)
        finally:
            async with self._turn:
                self._serving += 1
                self._turn.notify_all()

    @property
    def pending(self) -> int:
        return len(self._tasks)

    async def drain(self, timeout: float = 30) -> None:
        """On shutdown: let in-flight invoices finish; anything left is re-queued at next start."""
        if self._tasks:
            await asyncio.wait(self._tasks, timeout=timeout)


_scheduler: Scheduler | None = None


def scheduler() -> Scheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = Scheduler(get_settings().extraction_concurrency)
    return _scheduler


def enqueue(invoice_id: str) -> None:
    scheduler().enqueue(invoice_id)


async def requeue_interrupted() -> int:
    """On startup: re-run invoices a previous process left queued or half-done."""
    async with session_scope() as db:
        ids = (await db.execute(
            select(Invoice.id).where(Invoice.pipeline_state.in_(("queued", "running"))).order_by(Invoice.case_id)
        )).scalars().all()
    for invoice_id in ids:
        enqueue(invoice_id)
    return len(ids)


async def _step(db: AsyncSession, inv: Invoice, idx: int) -> None:
    inv.pipeline_step = idx
    await db.commit()


async def process(invoice_id: str) -> None:
    """Extract, then validate and match — inline, without the scheduler."""
    data, error = None, None
    try:
        data = await _extract(invoice_id)
    except Exception as e:
        error = e
    await _validate(invoice_id, data, error)


async def _extract(invoice_id: str) -> dict:
    async with session_scope() as db:
        inv = await db.get(Invoice, invoice_id)
        inv.pipeline_state, inv.pipeline_step, inv.status, inv.stage = "running", 0, "In Progress", "review"
        inv.error = None
        path, mime, pages = inv.file_path, inv.mime_type, inv.pages
        from .document_context import context
        part = context(inv)
    extractor = get_extractor()
    if part:
        method = getattr(extractor, 'extract_pages', None)
        if method is None:
            raise RuntimeError('Configured extractor does not support original-document page contexts')
        return await method(path, mime, pages, part['startPage'], part['endPage'])
    return await extractor.extract(path, mime, pages)


async def _validate(invoice_id: str, data: dict | None, error: Exception | None) -> None:
    try:
        if error is not None:
            raise error
        async with session_scope() as db:
            inv = await db.get(Invoice, invoice_id)
            await apply_extraction(db, inv, data)
            if not data.get("is_invoice", True):
                inv.status, inv.pipeline_state = "Exception", "done"
                inv.checks = [validation.check("doctype", "Document classified", "fail",
                                               f"The document was classified as {data.get('document_type')}, "
                                               "not a supplier invoice", "Other")]
                inv.recommended_action, inv.risk_level = "Reject document", "High"
                inv.recommendation = "This is not a supplier invoice. Reject it or route it to the right team."
                activity(db, inv, "Document is not a supplier invoice", "⚠")
                return
            await db.commit()
            await run_checks(db, inv, stepwise=True, first_run=True)
            inv.pipeline_state = "done"
            inv.processed_at = now()
            audit(db, AGENT, f"Invoice {inv.invoice_number} processed — match {inv.match_status}", inv,
                  status=inv.status, extraction_confidence=inv.extraction_confidence)
    except Exception as e:  # surfaced on the invoice rather than lost in a worker log
        log.exception("Processing failed for %s", invoice_id)
        async with session_scope() as db:
            inv = await db.get(Invoice, invoice_id)
            if inv:
                inv.pipeline_state, inv.status = "error", "Failed"
                inv.error = f"{type(e).__name__}: {e}"
                activity(db, inv, f"Processing failed — {e}", "⚠")
                audit(db, AGENT, f"Processing failed: {e}", inv,
                      trace="".join(traceback.format_exception(e))[-2000:])
        try:
            from .telemetry import fire_cfo_telemetry
            from ..config import get_settings
            fire_cfo_telemetry(
                action_name="AP_INVOICE_PROCESSING_PIPELINE",
                target_entity_id=str(invoice_id),
                model_name=get_settings().gemini_model,
                status="FAILED",
                sanitized_query=f"AP validation and matching pipeline for invoice {invoice_id}",
                sanitized_response=f"Pipeline exception: {type(e).__name__}: {str(e)}",
            )
        except Exception:
            pass


async def apply_extraction(db: AsyncSession, inv: Invoice, data: dict) -> None:
    """Writes the model's output onto the invoice, its fields and its lines."""
    def val(key: str):
        f = data.get(key) or {}
        return f.get("value") if isinstance(f, dict) else None

    from .document_context import KEY, context
    part = context(inv)
    inv.raw_extraction = {**data, **({KEY:part} if part else {})}
    inv.doc_type = data.get("document_type")
    inv.vendor_name = val("vendor_name")
    inv.vendor_gstin = (val("vendor_gstin") or "").replace(" ", "").upper() or None
    inv.vendor_pan = val("vendor_pan")
    inv.vendor_address = [s.strip() for s in (val("vendor_address") or "").split("\n") if s.strip()] or None
    inv.invoice_number = val("invoice_number")
    inv.invoice_date = parse_date(val("invoice_date"))
    inv.due_date = parse_date(val("due_date"))
    inv.po_number = val("po_number")
    inv.currency = (val("currency") or "INR").upper()[:3]
    inv.payment_terms = val("payment_terms")
    inv.buyer_name = val("buyer_name")
    inv.buyer_gstin = (val("buyer_gstin") or "").replace(" ", "").upper() or None
    inv.buyer_address = [s.strip() for s in (val("buyer_address") or "").split("\n") if s.strip()] or None
    inv.ship_to = val("ship_to")
    inv.place_of_supply = val("place_of_supply")
    inv.irn = val("irn")
    for key in ("subtotal", "cgst", "sgst", "igst", "cess", "round_off", "total", "tds_amount", "net_payable"):
        setattr(inv, key, parse_amount(val(key)))
    printed_tax = val("total_tax")
    inv.tax_total = (parse_amount(printed_tax) if printed_tax is not None
                     else round(inv.cgst + inv.sgst + inv.igst + inv.cess, 2))
    inv.tds_section = val("tds_section")

    inv.fields.clear()
    inv.lines.clear()
    await db.flush()

    for key, label, src in FIELD_MAP:
        if key == "vendorId":
            continue  # filled by vendor identification
        if key == "tax":
            f = data.get("total_tax") or {}
            if f.get("value") is not None:
                value, conf = f"{inv.tax_total:.2f}", f.get("confidence", 0)
            else:
                # Legacy payloads retain the previous GST-sum behavior.
                parts = [data.get(k) or {} for k in ("igst", "cgst", "sgst")]
                present = [p for p in parts if p.get("value")]
                f = present[0] if present else {}
                value = f"{inv.tax_total:.2f}" if inv.tax_total else None
                conf = min((p.get("confidence", 0) for p in present), default=0)
        else:
            f = data.get(src) or {}
            value, conf = f.get("value"), f.get("confidence", 0)
        inv.fields.append(InvoiceField(
            key=key, label=label, value=value, original_value=value,
            confidence=float(conf or 0), model_confidence=float(conf or 0),
            page=int(f.get("page") or 1), bbox=to_bbox(f.get("box_2d")),
        ))

    # Store dynamic accounts in existing invoice_fields: no schema migration.
    from .bank_details import account_fields
    for field in account_fields(data.get("bank_accounts"), inv.pages, part):
        inv.fields.append(InvoiceField(**field))

    for i, ln in enumerate(data.get("line_items") or [], start=1):
        inv.lines.append(InvoiceLine(
            line_no=i, description=ln.get("description") or "", hsn_sac=(ln.get("hsn_sac") or "").strip() or None,
            uom=ln.get("uom"), quantity=float(ln.get("quantity") or 0), rate=float(ln.get("rate") or 0),
            discount=float(ln.get("discount") or 0), taxable_value=float(ln.get("taxable_value") or 0),
            tax_rate=float(ln.get("tax_rate") or 0), cgst=float(ln.get("cgst") or 0),
            sgst=float(ln.get("sgst") or 0), igst=float(ln.get("igst") or 0),
            page=int(ln.get("page") or 1), bbox=to_bbox(ln.get("box_2d")),
            confidence=float(ln.get("confidence") or 0),
            original_quantity=float(ln.get("quantity") or 0), original_rate=float(ln.get("rate") or 0),
        ))

    await snap_locations(inv)

    pages = inv.pages
    activity(db, inv, f"Invoice received via {_channel(inv.channel)}")
    if pages > 1:
        activity(db, inv, f"{pages} pages merged into one document")
    activity(db, inv, f"Document classified as {(inv.doc_type or 'invoice').replace('_', ' ')}")
    await db.flush()


async def snap_locations(inv: Invoice) -> int:
    """Replaces Gemini's estimated boxes with exact ones from the PDF text layer where possible."""
    fields = [{"key": f.key, "value": f.value, "page": f.page, "bbox": f.bbox}
              for f in inv.fields if f.value and f.key != "vendorId"]
    lines = [{"line_no": ln.line_no, "description": ln.description, "page": ln.page, "bbox": ln.bbox}
             for ln in inv.lines]
    from .document_context import context
    part = context(inv)
    kwargs = {'page_range':(part['startPage'],part['endPage'])} if part else {}
    found_fields, found_lines = await asyncio.to_thread(locate.snap, inv.file_path, fields, lines, **kwargs)
    for f in inv.fields:
        if f.key in found_fields:
            f.page, f.bbox = found_fields[f.key]
    for ln in inv.lines:
        if ln.line_no in found_lines:
            ln.page, ln.bbox = found_lines[ln.line_no]
    return len(found_fields) + len(found_lines)


def _channel(channel: str) -> str:
    return {"upload": "manual upload", "mailbox": "AP shared mailbox", "connector": "Zoho Books connector"}.get(
        channel, channel)


async def run_checks(db: AsyncSession, inv: Invoice, stepwise: bool = False, first_run: bool = False) -> None:
    """Stages 2–10: validation, match, risk and recommendation."""
    async def step(i: int) -> None:
        if stepwise:
            await _step(db, inv, i)

    checks: list[dict] = []
    # Cross-checks adjust confidence from the model's figure, so re-runs do not compound.
    for f in inv.fields:
        f.confidence = 1.0 if f.corrected else f.model_confidence
    await ensure_zoho(db)
    # Fresh PO, receipts, vendor and same-numbered bills for this invoice only.
    note = await refresh_for_invoice(db, inv)
    if note:
        activity(db, inv, note, "⚠")

    await step(1)
    inv.is_import = False
    checks.append(await validation.identify_vendor(db, inv))
    checks.append(validation.currency_check(inv))
    await step(2)
    checks.append(validation.gstin_check(inv))
    checks.append(validation.buyer_check(inv, await _org_gstins(db)))
    await step(3)
    checks.append(validation.lines_check(inv))
    checks.append(validation.date_check(inv))
    await step(4)
    checks.append(validation.gst_check(inv))
    checks.append(validation.tds_check(inv))
    await step(5)
    # 3-way only when Zoho actually supplies receipts; otherwise invoice ↔ PO (2-way).
    three_way = get_settings().zoho_receives_enabled and (
        await db.execute(select(ZReceive.zoho_id).limit(1))).first() is not None
    await matching.run(db, inv, receives_enabled=three_way)
    await step(6)
    await step(7)
    checks.append(await validation.duplicate_check(db, inv))
    await step(8)
    inv.checks = checks
    _extraction_confidence(inv)
    assess(db, inv, first_run)
    await step(9)
    inv.pipeline_step = len(PIPELINE_STEPS)


def _extraction_confidence(inv: Invoice) -> None:
    confs = [f.confidence for f in inv.fields if f.key in HEADER_KEYS and f.value]
    inv.extraction_confidence = round(sum(confs) / len(confs), 4) if confs else 0


def assess(db: AsyncSession, inv: Invoice, first_run: bool = False) -> None:
    """Sets processing status, risk, recommendation and narrative from checks and match."""
    checks = inv.checks or []
    fails = [c for c in checks if c["status"] == "fail"]
    warns = [c for c in checks if c["status"] == "warn"]
    res = inv.match_result or {}
    status = inv.match_status
    reasons = list(dict.fromkeys([c["reason"] for c in fails if c.get("reason")] + res.get("reasons", [])))
    duplicate = any(c["code"] == "duplicate" for c in fails)

    if not inv.due_date and inv.invoice_date:
        from datetime import timedelta

        days = terms_days(inv.payment_terms or (res.get("po") or {}).get("terms"),
                          policies()["payments"]["default_terms_days"])
        inv.due_date = inv.invoice_date + timedelta(days=days)

    value_at_risk = sum(
        (r["invoiced"] - min(x for x in (r.get("ordered"), r.get("accepted")) if x is not None)) * r["rate"]
        for r in res.get("lines", [])
        if r["status"] == "fail" and r.get("ordered") is not None
    )

    if duplicate:
        inv.status, inv.risk_level = "Exception", "High"
        inv.recommended_action = "Reject — duplicate"
        inv.recommendation = next(c["detail"] for c in fails if c["code"] == "duplicate") + \
            ". Do not post; reject the document or confirm it is a genuine re-issue."
    elif fails or status == "fail":
        inv.status = "Exception"
        inv.risk_level = "High" if value_at_risk > 500000 or len(fails) > 1 else "Medium"
        inv.recommended_action = "Park invoice"
        d = matching.discrepancy(inv)
        line = next((r for r in res.get("lines", []) if d and r["line_no"] == d.get("line_no")), None)
        open_received = (line["accepted"] - line["billed_before"]) if line and line.get("accepted") is not None else None
        if d and d["code"].startswith("qty") and open_received is not None and open_received <= 0:
            transit = res.get("in_transit") or []
            inv.recommendation = (
                f"Do not post. {d['where']} Receipt {', '.join(transit)} is still in transit in Zoho — nothing on "
                "this PO line has arrived yet. Mark the receipt Received in Zoho Books, then revalidate this "
                "invoice — or park it until the goods arrive." if transit else
                f"Do not post. {d['where']} Everything received on this PO line is already billed "
                f"(received {line['accepted']:g}, billed {line['billed_before']:g}), so nothing on "
                "this invoice is billable yet. Record the goods receipt in Zoho Books, then revalidate this "
                "invoice — or park it until the goods arrive.")
        elif d and d["code"].startswith("qty"):
            inv.recommendation = (f"Do not post automatically. {d['where']} Park the invoice pending business "
                                  "confirmation, or correct the invoice quantity to the goods receipt if the "
                                  "excess was not accepted.")
        elif d:
            inv.recommendation = f"Do not post automatically. {d['where']} Resolve the variance before posting."
        else:
            inv.recommendation = "Do not post automatically. " + " ".join(c["detail"] + "." for c in fails)
    elif status == "exception":
        inv.status, inv.risk_level = "Exception", "Medium"
        inv.recommended_action = "Park invoice"
        threshold = policies()["non_po"]["gpo_threshold"]
        inv.recommendation = (res.get("note", "No purchase order identified") + ". Park the invoice and request "
                              "a cost centre and business-owner approval"
                              + (f"; above {inr(threshold, 0)} GPO sign-off is also required." if inv.total_inr > threshold else "."))
    elif warns or inv.extraction_confidence < 0.9:
        inv.status, inv.risk_level = "Validation Required", "Low"
        inv.recommended_action = "Review and approve"
        inv.recommendation = ("The match passed, but review these before approving: "
                              + "; ".join(c["detail"] for c in warns)
                              + ("; extraction confidence is below 90%" if inv.extraction_confidence < 0.9 else "") + ".")
    else:
        inv.status, inv.risk_level = "Awaiting Approval", "Low"
        inv.recommended_action = "Submit for posting"
        inv.recommendation = ("Straight-through posting recommended. The match passed with no material variance; "
                              "the invoice is eligible for approval and posting to Zoho Books.")

    inv.stage = "validation" if inv.status == "Exception" else "approve"
    inv.narrative = _narrative(inv, fails, warns)
    if first_run:
        _timeline(db, inv, fails, reasons)
    else:
        activity(db, inv, f"Match re-run — {(inv.match_status or '').upper()} · {inv.recommended_action}",
                 "✓" if inv.match_status == "pass" else "⚠")

    # Approvals are routed once there is nothing left to resolve.
    from .approvals import ensure_chain

    if inv.status in ("Awaiting Approval", "Validation Required"):
        ensure_chain(db, inv)


def _narrative(inv: Invoice, fails: list[dict], warns: list[dict]) -> str:
    res = inv.match_result or {}
    if inv.match_status == "exception":
        return (f"{res.get('note', 'No purchase order was identified')}. The invoice values are internally consistent"
                + (f" and TDS of {inr(inv.tds_amount)} applies u/s {inv.tds_section}" if inv.tds_amount else "")
                + ", so this reads as a legitimate non-PO invoice requiring business-owner validation rather than a "
                  "data error.")
    if inv.match_status == "fail":
        d = matching.discrepancy(inv)
        return ("Exception detected. " + (d["where"] if d else "") +
                " The invoice should not be posted automatically.").strip()
    if fails:
        return "Validation failed: " + "; ".join(c["detail"] for c in fails) + "."
    mode = res.get("mode") or "match"
    if mode == "non-po":
        return (f"No purchase order applies; the invoice is coded to {inv.cost_centre} and routed for business-owner "
                "approval. GSTIN verified and GST recomputed line by line"
                + ("; review the warnings before approval." if warns else "; no material discrepancies identified."))
    return (f"Invoice data reconciled against the purchase order{' and goods receipt' if mode == '3-way' else ''} "
            f"({mode}). GSTIN verified, GST recomputed line by line"
            + ("; review the warnings before approval." if warns else "; no material discrepancies identified."))


def _timeline(db: AsyncSession, inv: Invoice, fails: list[dict], reasons: list[str]) -> None:
    res = inv.match_result or {}
    activity(db, inv, f"Vendor identified — {inv.vendor_name}" if inv.vendor_zoho_id
             else f"Vendor not found in Zoho master — {inv.vendor_name}", "✓" if inv.vendor_zoho_id else "⚠")
    activity(db, inv, f"Invoice fields and {len(inv.lines)} line items extracted")
    if res.get("po"):
        grs = ", ".join(r["number"] for r in res.get("receipts", []))
        activity(db, inv, f"PO {res['po']['number']}" + (f" and GR {grs}" if grs else "") + " identified in Zoho Books")
    else:
        activity(db, inv, "PO search executed — no match", "⚠")
    dup = next((c for c in inv.checks or [] if c["code"] == "duplicate"), None)
    activity(db, inv, "Duplicate check completed — " + ("no match found" if dup and dup["status"] == "pass"
                                                          else "possible duplicate"),
             "✓" if dup and dup["status"] == "pass" else "⚠")
    if inv.match_status == "pass":
        activity(db, inv, f"{res.get('mode', 'Match')} completed — passed")
    elif inv.match_status == "fail":
        activity(db, inv, f"{res.get('mode', 'Match')} exception detected — {', '.join(reasons).lower()}", "⚠")
    activity(db, inv, f"Risk assessed as {(inv.risk_level or 'low').lower()}")
    activity(db, inv, f"Recommended action: {inv.recommended_action}", "→")


async def _org_gstins(db: AsyncSession) -> set[str]:
    state = await db.get(ConnectorState, "zoho")
    gstin = ((state.meta or {}).get("gstin") if state else None) or ""
    return {gstin.strip().upper()} if gstin else set()


async def ensure_zoho(db: AsyncSession) -> None:
    """Never validate against an empty Zoho cache — every vendor and PO would look missing."""
    from .zoho.sync import is_synced, sync_all

    if not await is_synced(db):
        log.warning("Zoho cache empty at validation time — synchronising first")
        await sync_all(db, actor="connector.zoho (on demand)")


async def revalidate_open_exceptions(db: AsyncSession, actor: str) -> int:
    """After fresh Zoho data arrives, re-check invoices that are still in exception.

    Cheap and deterministic (no model call). Parked invoices are left alone —
    parking is a user decision; they revalidate when resumed.
    """
    ids = (await db.execute(
        select(Invoice.id).where(Invoice.status == "Exception", Invoice.pipeline_state == "done")
    )).scalars().all()
    for invoice_id in ids:
        inv = await db.get(Invoice, invoice_id)
        await revalidate(db, inv, actor)
    return len(ids)


async def revalidate(db: AsyncSession, inv: Invoice, actor: str) -> None:
    """Re-runs validation and the match after a correction — no model call."""
    await run_checks(db, inv)
    audit(db, "system", f"Match re-run · result: {(inv.match_status or '').upper()}", inv, by=actor)
