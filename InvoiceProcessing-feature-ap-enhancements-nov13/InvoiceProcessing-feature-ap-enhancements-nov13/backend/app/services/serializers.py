"""Response shaping. Names follow the front-end's types (``app/src/types.ts``)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import AuditEvent, Invoice, ZRequisition
from . import gst, matching
from .common import fmt_date, fmt_dt, inr, money, policies
from .pipeline import HEADER_KEYS, PIPELINE_STEPS
from .bank_details import bank_accounts


def pct(x: float | None) -> str:
    return f"{(x or 0) * 100:.1f}%"


def _match_label(inv: Invoice) -> str:
    return {"pass": "✓ Passed", "fail": "⚠ Failed", "exception": "⚠ Exception"}.get(inv.match_status or "", "In review")


def _exception(inv: Invoice) -> str:
    reasons = [c["reason"] for c in inv.checks or [] if c["status"] == "fail" and c.get("reason")]
    reasons += (inv.match_result or {}).get("reasons", [])
    if inv.status in ("Exception", "Validation Required", "Parked") and reasons:
        return reasons[0]
    if inv.status == "Parked":
        return inv.park_reason or "—"
    return "—"


def _action(inv: Invoice) -> str:
    if inv.status in ("Exception", "Validation Required"):
        return "Review"
    if inv.status in ("Parked", "Clarification Requested"):
        return "Resume"
    if inv.status in ("Awaiting Approval", "Approved"):
        return "Approve" if inv.status == "Awaiting Approval" else "Submit"
    return "View"


# Explicit whitelist: Inbox columns expose saved values, not raw provider payloads.
INBOX_EXTRACTION_KEYS = frozenset({
    "vendorId", "gstin", "tinNumber", "vatNo", "terms", "entity", "subtotal", "tax",
    "pan", "buyerGstin", "pos", "shipTo", "dueDate", "irn", "tds", "netPayable",
})


def case_row(inv: Invoice) -> dict:
    """A row in the AP inbox (front-end ``CaseRow``)."""
    return {
        "id": inv.id,
        "caseId": inv.case_id,
        "txnId": inv.txn_id,
        "number": inv.invoice_number or inv.file_name,
        "zohoBillId": inv.zoho_bill_id,
        "vendor": inv.vendor_name or "—",
        "sourceFile": inv.file_name,
        "extractionValues": {f.key: f.value for f in inv.fields if f.key in INBOX_EXTRACTION_KEYS},
        "currency": inv.currency,
        "date": fmt_date(inv.invoice_date),
        "received": fmt_date(inv.received_at),
        "po": inv.po_number or "— (Non-PO)",
        "poType": "PO" if inv.po_number else "Non-PO",
        "amount": inv.total,
        "amountText": money(inv.total, inv.currency),
        "conf": pct(inv.extraction_confidence) if inv.pipeline_state == "done" else "—",
        "status": inv.status,
        "stage": inv.stage,
        "match": _match_label(inv),
        "exception": _exception(inv),
        "action": _action(inv),
        "note": inv.recommendation or inv.error or "Processing",
        "timeline": [{"time": fmt_dt(a.at)[-5:], "text": a.text, "mark": a.mark} for a in inv.activity],
    }


def invoice_detail(inv: Invoice) -> dict:
    res = inv.match_result or {}
    kind = gst.supply_type(inv.vendor_gstin, inv.place_of_supply, inv.buyer_gstin)
    tax_label = "No GST — import" if inv.is_import else {"inter": "IGST", "intra": "CGST + SGST"}.get(kind, "GST")
    rates = sorted({ln.tax_rate for ln in inv.lines if ln.tax_rate})
    if len(rates) == 1 and not inv.is_import:
        tax_label += f" {rates[0]:g}%" if kind == "inter" else f" ({rates[0] / 2:g}% + {rates[0] / 2:g}%)"
    po = res.get("po") or {}
    header_fields = [f for f in inv.fields if f.key in HEADER_KEYS]
    # Use TIN only when GSTIN is absent; VAT has its own optional card.
    tin = next((f for f in header_fields if f.key == "tinNumber" and f.value), None)
    header_fields = [f for f in header_fields
                     if not (f.key in ("tinNumber", "vatNo") and not f.value)
                     and not (f.key == "gstin" and not inv.vendor_gstin and tin)]
    order = list(HEADER_KEYS)
    if tin and not inv.vendor_gstin:
        order.remove("tinNumber")
        order.insert(order.index("gstin"), "tinNumber")
    header_fields.sort(key=lambda f: order.index(f.key))

    return {
        "id": inv.id,
        "txnId": inv.txn_id,
        "caseId": inv.case_id,
        "status": inv.status,
        "stage": inv.stage,
        "channel": inv.channel,
        "fileName": inv.file_name,
        "documentInvoices": ((inv.raw_extraction or {}).get('_document_context') or {}).get('invoices', []),
        "invoiceStartPage": ((inv.raw_extraction or {}).get('_document_context') or {}).get('startPage', 1),
        "invoiceEndPage": ((inv.raw_extraction or {}).get('_document_context') or {}).get('endPage', inv.pages),
        "pages": inv.pages,
        "receivedAt": fmt_dt(inv.received_at),
        "pipeline": {
            "state": inv.pipeline_state,
            "step": inv.pipeline_step,
            "steps": PIPELINE_STEPS,
            "error": inv.error,
        },
        # Supplier
        "vendor": inv.vendor_name,
        "vendorId": inv.vendor_zoho_id,
        "gstin": inv.vendor_gstin,
        "pan": inv.vendor_pan,
        "addr": inv.vendor_address or [],
        "docType": (inv.doc_type or "").replace("_", " ").title() or None,
        "kind": ("PO-backed" if inv.po_number else "Non-PO") + (f" · {inv.pages} pages" if inv.pages > 1 else ""),
        # Document
        "number": inv.invoice_number,
        "date": fmt_date(inv.invoice_date),
        "dateIso": inv.invoice_date.isoformat() if inv.invoice_date else None,
        "dueDate": fmt_date(inv.due_date),
        "po": inv.po_number or "",
        "poLabel": f"PO {inv.po_number}" if inv.po_number else "PO: not referenced",
        "currency": inv.currency,
        "fxRate": inv.fx_rate,
        "totalInr": inv.total_inr,
        "isImport": inv.is_import,
        "terms": inv.payment_terms or po.get("terms"),
        "irn": inv.irn,
        # Buyer
        "entity": inv.buyer_name,
        "entityAddr": inv.buyer_address or [],
        "buyerGstin": inv.buyer_gstin,
        "shipTo": inv.ship_to,
        "pos": inv.place_of_supply,
        "supplyType": kind,
        # Coding
        "costCentre": inv.cost_centre,
        "glAccount": inv.gl_account,
        "businessUnit": inv.business_unit,
        # Lines and totals
        "items": [
            {"lineNo": ln.line_no, "desc": ln.description, "hsn": ln.hsn_sac, "uom": ln.uom, "qty": ln.quantity,
             "rate": ln.rate, "discount": ln.discount, "taxable": ln.taxable_value, "taxPct": ln.tax_rate,
             "cgst": ln.cgst, "sgst": ln.sgst, "igst": ln.igst, "page": ln.page, "bbox": ln.bbox,
             "confidence": round(ln.confidence * 100, 1), "originalQty": ln.original_quantity,
             "poLineItemId": ln.po_line_item_id}
            for ln in inv.lines
        ],
        "subtotal": inv.subtotal,
        "cgst": inv.cgst,
        "sgst": inv.sgst,
        "igst": inv.igst,
        "tax": inv.tax_total,
        "roundOff": inv.round_off,
        "total": inv.total,
        "tds": {"section": inv.tds_section, "rate": inv.tds_rate, "amount": inv.tds_amount},
        "netPayable": inv.net_payable,
        "subtotalText": money(inv.subtotal, inv.currency),
        "taxText": money(inv.tax_total, inv.currency),
        "totalText": money(inv.total, inv.currency),
        "netPayableText": money(inv.net_payable, inv.currency),
        "taxLabel": tax_label,
        "grandLabel": "Net payable after TDS" if inv.tds_amount else "Total payable",
        # Extraction
        "fields": [
            {"key": f.key, "label": f.label, "value": f.value, "original": f.original_value,
             "confidence": round(f.confidence * 100, 1), "page": f.page, "bbox": f.bbox, "corrected": f.corrected}
            for f in header_fields
        ],
        "bankAccounts": bank_accounts(inv.fields),
        "bankDetailsExtracted": isinstance((inv.raw_extraction or {}).get("bank_accounts"), list),
        "supportingFields": [
            {"key": f.key, "label": f.label, "value": f.value, "confidence": round(f.confidence * 100, 1),
             "page": f.page, "bbox": f.bbox}
            for f in inv.fields if f.key not in HEADER_KEYS
        ],
        "fieldConf": {f.label: round(f.confidence * 100, 1) for f in header_fields},
        "extractionConfidence": pct(inv.extraction_confidence),
        # Verdict
        "checks": inv.checks or [],
        "matchStatus": inv.match_status,
        "matchMode": res.get("mode"),
        "matchConfidence": pct(inv.match_confidence),
        "riskLevel": inv.risk_level,
        "recommendedAction": inv.recommended_action,
        "recommendation": inv.recommendation,
        "validationNarrative": inv.narrative,
        "discrepancy": matching.discrepancy(inv) if inv.match_result else None,
        "match": matching.cards(inv) if inv.match_result else [],
        "recon": matching.recon_rows(inv) if inv.match_result else [],
        "matchLines": res.get("lines", []),
        "advisory": advisory(inv),
        "timeline": [{"time": fmt_dt(a.at), "text": a.text, "mark": a.mark} for a in inv.activity],
        # Journey
        "corrected": inv.corrected,
        "corrections": [
            {"when": fmt_dt(c.at), "user": c.user, "target": c.target, "lineNo": c.line_no, "field": c.field,
             "old": c.old_value, "new": c.new_value, "reason": c.reason, "comment": c.comment,
             "text": (f"Invoice line {c.line_no} {c.field} " if c.line_no else f"{c.field} ")
                     + f"{c.old_value} → {c.new_value} · {c.reason}"}
            for c in inv.corrections
        ],
        "sourceRequests": [
            {"ref": r.ref, "document": r.document, "documentRef": r.document_ref, "field": r.field,
             "current": r.current_value, "requested": r.requested_value, "reason": r.reason,
             "status": r.status, "raisedBy": r.raised_by, "when": fmt_dt(r.at)}
            for r in inv.source_requests
        ],
        "approvals": approval_chain(inv),
        "decision": {"type": inv.decision, "parkReason": inv.park_reason, "note": inv.decision_note,
                     "when": fmt_dt(inv.decided_at) if inv.decided_at else None},
        "zohoBillId": inv.zoho_bill_id,
        "payments": [payment_row(p) for p in inv.payments],
    }


def approval_chain(inv: Invoice) -> list[dict]:
    tone = {"approved": "ok", "pending": "warn", "rejected": "err", "waiting": "plain", "not_required": "plain"}
    mark = {"approved": "✓", "pending": "•", "rejected": "✕", "waiting": "○", "not_required": "–"}
    label = {"approved": "Approved", "pending": "Pending", "rejected": "Rejected", "waiting": "Waiting",
             "not_required": "Not applicable"}
    out = []
    for a in inv.approvals:
        when = fmt_dt(a.acted_at) if a.acted_at else ("SLA " + fmt_dt(a.sla_due) if a.sla_due else "—")
        out.append({"level": a.level, "role": a.role, "name": a.approver, "email": a.approver_email,
                    "limit": a.limit_text, "state": label[a.status], "status": a.status, "tone": tone[a.status],
                    "mark": mark[a.status], "when": when, "actedBy": a.acted_by, "comment": a.comment})
    return out


def payment_row(p) -> dict:
    return {"id": p.id, "ref": p.ref, "runId": p.run_id, "invoiceId": p.invoice_id, "vendor": p.vendor_name,
            "gross": p.gross, "tds": p.tds, "amount": p.amount, "amountText": inr(p.amount), "currency": p.currency,
            "dueDate": fmt_date(p.due_date), "mode": p.mode, "bankAccount": policies()["payments"]["bank_account"],
            "status": p.status, "preparedBy": p.prepared_by, "releasedBy": p.released_by,
            "releasedAt": fmt_dt(p.released_at) if p.released_at else None, "utr": p.utr,
            "confirmedAt": fmt_dt(p.confirmed_at) if p.confirmed_at else None, "zohoPaymentId": p.zoho_payment_id,
            "stages": payment_stages(p)}


def payment_stages(p) -> list[dict]:
    released = p.status in ("released", "confirmed")
    confirmed = p.status == "confirmed"

    def st(done: bool, ok: str, waiting: str, active: bool = False) -> dict:
        return {"state": ok if done else waiting, "tone": "ok" if done else ("warn" if active else "plain"),
                "mark": "✓" if done else ("•" if active else "○")}

    return [
        {"label": "Payment proposal", "note": "Built by the Payment Agent from settlement-ready invoices",
         **st(True, "Completed", "")},
        {"label": "AP review", "note": "Duplicate, bank-detail and TDS checks re-run before release",
         **st(True, "Completed", "")},
        {"label": "Treasury approval", "note": "Two-person release rule",
         **st(released, "Approved", "Pending release", active=True)},
        {"label": "Bank transmission", "note": f"{p.mode} batch · {policies()['payments']['bank_account']}",
         **st(released, "Transmitted", "Queued")},
        {"label": "UTR confirmation",
         "note": f"UTR {p.utr} received · vendor payment recorded in Zoho Books" if confirmed
         else "Awaiting bank acknowledgement",
         **st(confirmed, "Confirmed", "Awaiting", active=released)},
    ]


def advisory(inv: Invoice) -> dict | None:
    """The system-raised AI advisory for the transaction, if there is something to say."""
    if not inv.match_status:
        return None
    res = inv.match_result or {}
    d = matching.discrepancy(inv) if inv.match_result else None
    if inv.match_status == "pass":
        if not inv.corrected:
            return None
        return {"title": "Variance resolved", "tone": "ok", "state": "Resolved",
                "text": "An authorised correction brought the invoice into agreement; the match was re-run and "
                        "passed.", "actions": ["View match", "Audit trail"], "figures": []}
    if inv.match_status == "exception":
        return {"title": "No purchase order identified", "tone": "warn", "state": "Under review",
                "text": inv.recommendation,
                "figures": [{"k": "PO on document", "v": inv.po_number or "Not stated"},
                            {"k": "Open PO search", "v": f"{len(res.get('candidates', []))} candidate(s)"},
                            {"k": "Cost centre", "v": inv.cost_centre or "Not stated"},
                            {"k": "Invoice value", "v": inr(inv.total)}],
                "actions": ["Park invoice", "Raise query", "Review evidence"]}
    return {"title": d["title"] if d else "Match exception", "tone": "err", "state": "Under review",
            "text": inv.recommendation, "figures": d["figures"] if d else [],
            "actions": ["Correct & revalidate", "Park invoice", "Review evidence"]}


# ── Source evidence ──────────────────────────────────────────────────────────

EVIDENCE_COLUMNS = [
    "Source", "Document No.", "Line", "Date", "Vendor", "GSTIN", "Item / Service", "HSN / SAC", "Qty", "Rate",
    "Taxable Value", "CGST", "SGST", "IGST", "GST %", "TDS", "Cost Centre", "GL Account", "Business Unit",
    "Curr.", "Terms", "System",
]


def evidence(db: AsyncSession, inv: Invoice, line_no: int | None = None) -> dict:
    res = inv.match_result or {}
    po = res.get("po")
    intra = gst.supply_type(inv.vendor_gstin, inv.place_of_supply, inv.buyer_gstin) != "inter"
    lines = res.get("lines", [])
    focus = None
    if line_no:
        focus = next((r for r in lines if r["line_no"] == line_no), None)
    focus = focus or next((r for r in lines if r["status"] == "fail"), None) or (lines[0] if lines else None)
    inv_line = next((ln for ln in inv.lines if focus and ln.line_no == focus["line_no"]), None)
    if inv_line is None and inv.lines:
        inv_line = inv.lines[0]

    def row(kind, doc, line, date, qty, rate, tax_pct, system, variance=False, editable=False):
        taxable = round((qty or 0) * (rate or 0), 2)
        tax = taxable * (tax_pct or 0) / 100
        return {
            "kind": kind, "docNo": doc or "—", "line": line or "—", "date": date or "—",
            "vendor": inv.vendor_name, "gstin": inv.vendor_gstin,
            "item": inv_line.description if inv_line else "—", "hsn": inv_line.hsn_sac if inv_line else "—",
            "qty": qty, "rate": rate, "taxable": taxable,
            "cgst": round(tax / 2, 2) if intra and taxable else None,
            "sgst": round(tax / 2, 2) if intra and taxable else None,
            "igst": round(tax, 2) if not intra and taxable else None,
            "gstPct": tax_pct, "tds": inv.tds_amount if kind == "INVOICE" and inv.tds_amount else None,
            "costCentre": inv.cost_centre, "glAccount": inv.gl_account or (po or {}).get("gl"),
            "businessUnit": inv.business_unit, "currency": inv.currency,
            "terms": inv.payment_terms or (po or {}).get("terms"), "system": system,
            "variance": variance, "editable": editable, "locked": not editable,
        }

    rows = []
    if po and focus and focus.get("po_line_item_id"):
        rows.append(row("PURCHASE ORDER", po["number"], focus["po_line_no"], po["date"], focus["ordered"],
                        focus["po_rate"], focus["po_tax_rate"], "Zoho Books"))
        receipts = ", ".join(r["number"] for r in res.get("receipts", []))
        rows.append(row("GOODS RECEIPT", receipts, focus["po_line_no"],
                        (res.get("receipts") or [{}])[0].get("date"), focus.get("accepted"), focus["po_rate"],
                        focus["po_tax_rate"], "Zoho Books"))
    elif not po:
        rows.append(row("PURCHASE ORDER", None, None, None, None, None, None, "Zoho Books — searched"))
        rows.append(row("GOODS RECEIPT", None, None, None, None, None, None, "None recorded"))
    if inv_line:
        rows.append(row("INVOICE", inv.invoice_number, inv_line.line_no, fmt_date(inv.invoice_date),
                        inv_line.quantity, inv_line.rate, inv_line.tax_rate, "Command Center — extracted",
                        variance=bool(focus and focus["status"] == "fail"), editable=True))

    dup = next((c for c in inv.checks or [] if c["code"] == "duplicate"), {})
    vendor = next((c for c in inv.checks or [] if c["code"] == "vendor"), {})
    tone = {"pass": "ok", "warn": "warn", "fail": "err"}
    if po:
        mapped = sum(1 for r in lines if r.get("po_line_item_id"))
        linkage = [
            {"k": "Vendor match (GSTIN + PAN)", "v": vendor.get("detail", "—"), "tone": tone.get(vendor.get("status"), "plain")},
            {"k": "PO linkage", "v": f"{po['number']} — {'exact' if inv.po_number else 'inferred'}", "tone": "ok"},
            {"k": "Goods receipt linkage",
             "v": ", ".join(r["number"] for r in res.get("receipts", [])) or "No receipt recorded",
             "tone": "ok" if res.get("receipts") else "warn"},
            {"k": "Line-level mapping", "v": f"{mapped} of {len(lines)} lines mapped",
             "tone": "ok" if mapped == len(lines) else "warn"},
            {"k": "Duplicate check", "v": dup.get("detail", "—"), "tone": tone.get(dup.get("status"), "plain")},
        ]
        sources = [{"doc": "Purchase order", "system": "Zoho Books", "tone": "ok"},
                   {"doc": "Goods receipt", "system": "Zoho Books" if res.get("receipts") else "Not found",
                    "tone": "ok" if res.get("receipts") else "warn"},
                   {"doc": "Invoice", "system": "Command Center", "tone": "info"}]
    else:
        linkage = [
            {"k": "Vendor match (GSTIN + PAN)", "v": vendor.get("detail", "—"), "tone": tone.get(vendor.get("status"), "plain")},
            {"k": "PO reference on document", "v": inv.po_number or "Absent", "tone": "warn"},
            {"k": "Open PO search", "v": f"{len(res.get('candidates', []))} candidate(s)", "tone": "warn"},
            {"k": "Service entry sheet", "v": "Not recorded", "tone": "plain"},
            {"k": "Duplicate check", "v": dup.get("detail", "—"), "tone": tone.get(dup.get("status"), "plain")},
        ]
        sources = [{"doc": "Purchase order", "system": "Not found", "tone": "warn"},
                   {"doc": "Goods receipt", "system": "Not applicable", "tone": "plain"},
                   {"doc": "Invoice", "system": "Command Center", "tone": "info"}]

    return {
        "columns": EVIDENCE_COLUMNS,
        "focusLine": focus["line_no"] if focus else None,
        "rows": rows,
        "lines": lines,
        "sources": sources,
        "linkage": linkage,
        "narrative": inv.narrative,
        "candidates": res.get("candidates", []),
        "correctionReasons": policies()["correction_reasons"],
    }


# ── Transaction 360 ──────────────────────────────────────────────────────────


async def transaction360(db: AsyncSession, inv: Invoice) -> list[dict]:
    res = inv.match_result or {}
    po = res.get("po") or {}
    pr = await db.get(ZRequisition, po["pr"]) if po.get("pr") else None
    receipts = res.get("receipts", [])
    pay = next((p for p in inv.payments if p.status != "failed"), None)
    status = inv.match_status
    approved = any(a.status == "approved" for a in inv.approvals) and all(
        a.status in ("approved", "not_required") for a in inv.approvals)
    last = inv.corrections[0] if inv.corrections else None

    def stage(label, detail, system, done, jump):
        return {"label": label, "detail": detail, "system": system, "done": done, "jump": jump}

    return [
        stage("Requisition", f"{pr.pr_number} · approved {fmt_date(pr.date)}" if pr else
              (po.get("pr") or "Not applicable — non-PO invoice"), "Zoho Books", bool(pr or po.get("pr")), "procure"),
        stage("Purchase order", f"{po['number']} · {inr(po['value'])}" if po else "None identified", "Zoho Books",
              bool(po), "procure"),
        stage("Goods receipt", ", ".join(f"{r['number']} ({r['date']})" for r in receipts) or "Not applicable",
              "Zoho Books", bool(receipts), "receipt"),
        stage("Invoice received", f"{inv.invoice_number or inv.file_name} · {fmt_date(inv.invoice_date)} · {inr(inv.total)}",
              "Command Center", True, "processing"),
        stage("Extraction & GST validation",
              f"{pct(inv.extraction_confidence)} confidence · {len(inv.lines)} lines", "Command Center",
              inv.pipeline_state == "done", "processing"),
        stage("Source evidence retrieved", "PO, GRN and invoice values consolidated" if po else "PO search executed",
              "Command Center", inv.pipeline_state == "done", "match"),
        stage("Match", {"pass": "Passed after authorised correction" if inv.corrected else "Passed — no material variance",
                        "fail": "Failed — " + ", ".join(res.get("reasons", [])).lower(),
                        "exception": "Exception — no purchase order"}.get(status or "", "Pending"),
              "Command Center", status == "pass", "match"),
        stage("Correction & revalidation",
              f"{last.field} {last.old_value} → {last.new_value} · {last.reason}" if last else "No correction required",
              "Command Center", bool(last), "match"),
        stage("Verification & DOA approval",
              "Approved" if approved else (f"Pending {next((a.role for a in inv.approvals if a.status == 'pending'), '')}"
                                           if inv.approvals else "Not yet routed"),
              "Command Center", approved, "match"),
        stage("Posted to Zoho Books", f"Bill {inv.zoho_bill_id} · {inv.case_id}" if inv.zoho_bill_id or inv.status in
              ("Posted", "Paid") else "Awaiting decision", "Zoho Books", inv.status in ("Posted", "Paid"), "ap"),
        stage("Payment", f"{pay.ref} · {pay.mode} · {pay.status}" if pay else "Awaiting posting", "Bank",
              bool(pay and pay.status in ("released", "confirmed")), "pay"),
        stage("UTR & vendor payment", f"{pay.utr} · recorded in Zoho" if pay and pay.utr else "Pending",
              "Bank → Zoho Books", bool(pay and pay.utr), "pay"),
        stage("Reconciliation", "Invoice ↔ payment reconciled" if inv.status == "Paid" else "Opens once paid",
              "Command Center", inv.status == "Paid", "recon"),
    ]


async def audit_rows(db: AsyncSession, invoice_id: str | None = None, limit: int = 200) -> list[dict]:
    stmt = select(AuditEvent).order_by(AuditEvent.id.desc()).limit(limit)
    if invoice_id:
        stmt = stmt.where(AuditEvent.invoice_id == invoice_id)
    return [{"when": fmt_dt(e.at), "actor": e.actor, "event": e.event, "invoiceId": e.invoice_id}
            for e in (await db.execute(stmt)).scalars()]
