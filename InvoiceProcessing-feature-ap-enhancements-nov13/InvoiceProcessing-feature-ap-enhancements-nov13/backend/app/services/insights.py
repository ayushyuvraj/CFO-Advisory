"""Dashboards, reconciliation and registers — all computed from live data."""

from collections import Counter
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import (AuditEvent, Invoice, InvoiceLine, Payment, ZBill, ZPoLine, ZPurchaseOrder, ZReceive,
                      ZReceiveLine, ZRequisition)
from .common import all_of, fmt_date, fmt_dt, inr, now, policies
from .matching import arrived, arrived_filter, not_yet_in_zoho

OPEN_REVIEW = ("Exception", "Validation Required")


def _crore(n: float) -> str:
    if n >= 1e7:
        return f"₹{n / 1e7:.2f} Cr"
    if n >= 1e5:
        return f"₹{n / 1e5:.1f} L"
    return inr(n, 0)


def _pct(a: float, b: float) -> float:
    return round(a / b * 100, 1) if b else 0.0


def _reasons(inv: Invoice) -> list[str]:
    out = [c["reason"] for c in inv.checks or [] if c["status"] == "fail" and c.get("reason")]
    out += (inv.match_result or {}).get("reasons", [])
    return list(dict.fromkeys(out))


async def metrics(db: AsyncSession) -> dict:
    invs = await all_of(db, select(Invoice))
    done = [i for i in invs if i.pipeline_state == "done"]
    by_status = Counter(i.status for i in invs)
    posted = [i for i in invs if i.status in ("Posted", "Paid")]
    touchless = [i for i in posted if not i.corrected and not any(a.status == "rejected" for a in i.approvals)]
    matched = [i for i in done if i.match_status == "pass"]
    exceptions = [i for i in done if i.status in OPEN_REVIEW or i.match_status in ("fail", "exception")]
    cycle = [(i.decided_at - i.received_at).total_seconds() / 60 for i in invs if i.decided_at and i.received_at]
    reasons = Counter(r for i in done for r in _reasons(i))
    pending_approvals = [i for i in invs if i.status == "Awaiting Approval"]
    today = date.today()
    liability = [i for i in invs if i.status == "Posted"]
    due_30 = [i for i in liability if i.due_date and i.due_date <= today + timedelta(days=30)]
    payments = await all_of(db, select(Payment))
    awaiting_release = [p for p in payments if p.status == "proposed"]
    in_transit = [p for p in payments if p.status == "released"]
    fx = {i.id: i.fx_rate or 1 for i in invs}
    breaches = [a for i in pending_approvals for a in i.approvals
                if a.status == "pending" and a.sla_due and a.sla_due < now()]

    return {
        "total": len(invs),
        "processed": len(done),
        "received_today": sum(1 for i in invs if i.received_at and i.received_at.date() == today),
        "by_status": dict(by_status),
        "posted": len(posted),
        "stp_pct": _pct(len(touchless), len(posted)),
        "match_rate": _pct(len(matched), len(done)),
        "exception_rate": _pct(len(exceptions), len(done)),
        "extraction_accuracy": round(sum(i.extraction_confidence for i in done) / len(done) * 100, 1) if done else 0,
        "avg_cycle_min": round(sum(cycle) / len(cycle), 1) if cycle else None,
        "exception_reasons": dict(reasons),
        "open_exceptions": len([i for i in invs if i.status in OPEN_REVIEW]),
        "parked": by_status.get("Parked", 0) + by_status.get("Clarification Requested", 0),
        "pending_approvals": len(pending_approvals),
        "sla_breaches": len(breaches),
        "liability": sum(i.net_payable * fx[i.id] for i in liability),
        "liability_count": len(liability),
        "due_30": sum(i.net_payable * fx[i.id] for i in due_30),
        "awaiting_release": len(awaiting_release),
        "awaiting_release_value": sum(p.amount * fx.get(p.invoice_id, 1) for p in awaiting_release),
        "in_transit": len(in_transit),
        "paid_value": sum(p.amount * fx.get(p.invoice_id, 1) for p in payments if p.status == "confirmed"),
        "paid_count": sum(1 for p in payments if p.status == "confirmed"),
        "corrections": sum(len(i.corrections) for i in invs),
        "high_value_pending": [i for i in pending_approvals if i.total_inr > 2500000],
        "invoices": invs,
    }


async def dashboard(db: AsyncSession, persona: str) -> dict:
    m = await metrics(db)
    invs: list[Invoice] = m.pop("invoices")
    cycle = f"{m['avg_cycle_min']} min" if m["avg_cycle_min"] is not None else "—"
    funnel = [
        ("Received", m["total"]),
        ("Extracted", m["processed"]),
        ("Validated", sum(1 for i in invs if i.pipeline_state == "done" and not any(
            c["status"] == "fail" for c in i.checks or []))),
        ("Matched", sum(1 for i in invs if i.match_status == "pass")),
        ("Posted", m["posted"]),
        ("Paid", m["paid_count"]),
    ]
    outcomes_total = max(1, m["total"])
    outcomes = [
        ("Straight-through", round(m["stp_pct"] * m["posted"] / outcomes_total)),
        ("Exception", round(m["open_exceptions"] / outcomes_total * 100)),
        ("Parked", round(m["parked"] / outcomes_total * 100)),
        ("Awaiting approval", round(m["pending_approvals"] / outcomes_total * 100)),
    ]

    def kpi(label, value, note, tone, target):
        return {"label": label, "value": value, "note": note, "tone": tone, "target": target}

    kpis = {
        "CFO": [
            kpi("AP liability outstanding", _crore(m["liability"]), f"{m['liability_count']} posted invoices", "info", "ap"),
            kpi("Upcoming payment exposure", _crore(m["due_30"]), "Due within 30 days", "warn", "pay"),
            kpi("P2P processing performance", f"{m['stp_pct']:g}%", f"Touchless · cycle time {cycle}", "ok", "recon"),
            kpi("Compliance exceptions", str(m["exception_reasons"].get("GST mismatch", 0)), "GST / GSTIN issues", "err", "recon"),
            kpi("Payments awaiting release", str(m["awaiting_release"]), _crore(m["awaiting_release_value"]), "warn", "pay"),
            kpi("High-value approvals", str(len(m["high_value_pending"])),
                _crore(sum(i.total_inr for i in m["high_value_pending"])) + " above ₹25 L", "err", "match"),
        ],
        "AP Lead": [
            kpi("Invoice pipeline", str(m["total"]), f"{m['received_today']} received today", "info", "processing"),
            kpi("P2P match status", f"{m['match_rate']:g}%", f"{funnel[3][1]} of {m['processed']} matched", "ok", "match"),
            kpi("SLA breaches", str(m["sla_breaches"]), "Approvals past SLA", "warn", "ap"),
            kpi("Exception queue", str(m["open_exceptions"]), ", ".join(list(m["exception_reasons"])[:3]) or "None open", "err", "match"),
            kpi("Approval pending", str(m["pending_approvals"]), "DOA route " + policies()["doa"]["route"], "warn", "match"),
            kpi("Payment-ready invoices", str(m["awaiting_release"]), _crore(m["awaiting_release_value"]) + " settlement-ready", "info", "pay"),
        ],
        "Finance Controller": [
            kpi("Match compliance", f"{m['match_rate']:g}%", "Invoices matched before posting", "ok", "match"),
            kpi("GST / tax exceptions", str(m["exception_reasons"].get("GST mismatch", 0)), "GSTIN, heads, recomputation", "err", "recon"),
            kpi("Manual corrections", str(m["corrections"]), "Each with user, timestamp, reason", "warn", "recon"),
            kpi("Duplicates blocked", str(m["exception_reasons"].get("Duplicate suspected", 0)), "Before posting", "ok", "recon"),
            kpi("Payments in transit", str(m["in_transit"]), "Released, UTR awaited", "warn", "pay"),
            kpi("Parked invoices", str(m["parked"]), "Awaiting business action", "warn", "ap"),
        ],
        "Finance User": [
            kpi("Corrections required", str(m["open_exceptions"]), "Exceptions to resolve", "err", "match"),
            kpi("Awaiting approval", str(m["pending_approvals"]), "In the DOA chain", "warn", "match"),
            kpi("Parked / clarification", str(m["parked"]), "Resume when answered", "warn", "ap"),
            kpi("Processed", str(m["processed"]), f"Extraction accuracy {m['extraction_accuracy']:g}%", "ok", "processing"),
            kpi("Posted", str(m["posted"]), "To Zoho Books", "ok", "ap"),
            kpi("Paid", str(m["paid_count"]), _crore(m["paid_value"]), "ok", "pay"),
        ],
    }

    attention = []
    for i in sorted((i for i in invs if i.status in OPEN_REVIEW), key=lambda i: -i.total)[:4]:
        attention.append({"title": f"{i.invoice_number} — {(_reasons(i) or ['review required'])[0].lower()}",
                          "meta": f"{i.vendor_name} · {inr(i.total)} · {i.risk_level or '—'} risk",
                          "badge": "Exception", "tone": "err", "invoiceId": i.id, "view": "match"})
    if m["pending_approvals"]:
        attention.append({"title": f"{m['pending_approvals']} invoice(s) awaiting approval",
                          "meta": f"{m['sla_breaches']} breaching SLA", "badge": "Approval", "tone": "warn", "view": "match"})
    if m["awaiting_release"]:
        attention.append({"title": f"{m['awaiting_release']} payment(s) awaiting treasury release",
                          "meta": _crore(m["awaiting_release_value"]), "badge": "Payment", "tone": "info", "view": "pay"})

    insights = _insights(m, invs)
    po_rows = (await po_register(db))["rows"]
    grn_rows = (await grn_register(db))["rows"]
    recon = await reconciliation(db)
    unreconciled = sum(w["open"] for w in recon["workspace"] if isinstance(w["open"], int))
    approved = m["by_status"].get("Approved", 0)
    flow = [
        f"{m['received_today']} received today · {m['total']} in total",
        f"{sum(1 for r in po_rows if r['status'] != 'Fully invoiced')} open purchase orders",
        f"{sum(1 for r in grn_rows if r['pending'] > 0)} partial receipts",
        f"{m['open_exceptions']} exceptions · {m['pending_approvals']} awaiting approval",
        f"{approved} approved, awaiting posting",
        f"{m['awaiting_release']} awaiting release · {m['in_transit']} in transit",
        f"{unreconciled} unreconciled items",
    ]
    feed = [{"time": fmt_dt(e.at)[-5:], "text": e.event, "actor": e.actor}
            for e in await all_of(db, select(AuditEvent).order_by(AuditEvent.id.desc()).limit(10))]

    return {
        "persona": persona,
        "kpis": kpis.get(persona, kpis["AP Lead"]),
        "attention": attention,
        "insights": insights,
        "exec": {
            "invoicesProcessed": m["processed"], "stpPct": m["stp_pct"], "extractionAccuracy": m["extraction_accuracy"],
            "matchRate": m["match_rate"], "exceptionRate": m["exception_rate"], "avgCycleMinutes": m["avg_cycle_min"],
        },
        "funnel": funnel,
        "outcomes": outcomes,
        "exceptionBars": sorted(m["exception_reasons"].items(), key=lambda kv: -kv[1]),
        "statusCounts": m["by_status"],
        "liveFeed": feed,
        "flow": flow,
    }


def _insights(m: dict, invs: list[Invoice]) -> list[dict]:
    out = []
    if m["exception_reasons"]:
        top, n = max(m["exception_reasons"].items(), key=lambda kv: kv[1])
        vendors = Counter(i.vendor_name for i in invs if top in _reasons(i))
        v, vn = vendors.most_common(1)[0]
        out.append({"agent": "Exception Agent",
                    "text": f"{top} is the most common exception ({n}); {v} accounts for {vn} of them."})
    if m["sla_breaches"]:
        out.append({"agent": "Approval Agent",
                    "text": f"{m['sla_breaches']} approval(s) are past SLA — a delegate on route "
                            f"{policies()['doa']['route']} would clear them."})
    if m["posted"]:
        out.append({"agent": "P2P Copilot",
                    "text": f"{m['stp_pct']:g}% of posted invoices went through without a manual correction."})
    if m["awaiting_release"]:
        out.append({"agent": "Payment Agent",
                    "text": f"{m['awaiting_release']} payment(s) worth {_crore(m['awaiting_release_value'])} "
                            "are ready for the next payment run."})
    return out or [{"agent": "P2P Copilot", "text": "Upload an invoice to start — insights build as data arrives."}]


# ── Reconciliation ───────────────────────────────────────────────────────────


async def reconciliation(db: AsyncSession) -> dict:
    invs = await all_of(db, select(Invoice))
    payments = await all_of(db, select(Payment))
    posted = [i for i in invs if i.status in ("Posted", "Paid")]
    paid = [i for i in invs if i.status == "Paid"]
    in_transit = [p for p in payments if p.status == "released"]

    bills = {b.zoho_id: b for b in await all_of(db, select(ZBill))}
    with_bill = [i for i in posted if i.zoho_bill_id]
    bill_ok = [i for i in with_bill if i.zoho_bill_id in bills and abs(bills[i.zoho_bill_id].total - i.total) <= 1]

    grir = await _grir_open(db)
    parked = [i for i in invs if i.status in ("Parked", "Clarification Requested")]

    def row(label, sources, items, matched, diff, owner, state, tone):
        return {"label": label, "sources": sources, "items": items, "matched": matched,
                "open": items - matched if isinstance(items, int) else "—", "diff": diff,
                "owner": owner, "state": state, "tone": tone}

    workspace = [
        row("Invoice ↔ payment", "Command Center · Bank", len(posted), len(paid),
            inr(sum(i.net_payable * (i.fx_rate or 1) for i in posted if i.status != "Paid"), 0), "AP Lead",
            "Reconciled" if len(posted) == len(paid) else "In progress",
            "ok" if len(posted) == len(paid) else "warn"),
        row("Command Center ↔ Zoho bills", "Command Center · Zoho Books", len(with_bill), len(bill_ok),
            inr(sum(abs(bills[i.zoho_bill_id].total - i.total) for i in with_bill if i.zoho_bill_id in bills), 0),
            "Controller", "Reconciled" if len(with_bill) == len(bill_ok) else "Differences",
            "ok" if len(with_bill) == len(bill_ok) else "err"),
        row("GR/IR clearing", "Zoho Books", grir["lines"], grir["lines"] - grir["open"], inr(grir["value"], 0),
            "AP Lead", "Ageing" if grir["open"] else "Clear", "warn" if grir["open"] else "ok"),
        row("Payment ↔ bank statement", "Bank", "—", "—", "—", "Treasury", "Not connected", "plain"),
        row("GSTR-2B ↔ purchase register", "GSTN", "—", "—", "—", "Tax", "Not connected", "plain"),
    ]

    open_items = [
        {"ref": p.ref, "type": "Payment in transit", "value": inr(p.amount), "age": _age(p.released_at),
         "reason": "UTR / bank acknowledgement pending"} for p in in_transit
    ] + [
        {"ref": i.invoice_number, "type": "Parked invoice", "value": inr(i.total_inr), "age": _age(i.decided_at),
         "reason": i.park_reason or "Clarification requested"} for i in parked
    ] + grir["items"][:10]

    checklist = []
    for item in policies()["close_checklist"]:
        done = None
        if "posted" in item["label"].lower():
            done = not any(i.status == "Approved" for i in invs)
        elif "bank reconciliation" in item["label"].lower():
            done = not in_transit
        elif "gr/ir" in item["label"].lower():
            done = grir["open"] == 0
        checklist.append({**item, "done": bool(done), "derived": done is not None})

    return {
        "workspace": workspace,
        "openItems": open_items,
        "checklist": checklist,
        "status": [{"label": w["label"], "state": w["state"], "tone": w["tone"],
                    "note": f"{w['matched']} of {w['items']} matched" if w["items"] != "—" else "Phase 2"}
                   for w in workspace],
        "asOf": date.today().isoformat(),
    }


def _age(at) -> str:
    if not at:
        return "—"
    return f"{max(0, (now() - at).days)} d"


async def _billed_here(db: AsyncSession, value: bool = False) -> Counter:
    """Quantity (or value) billed through the Command Center per PO line — one aggregate query."""
    measure = InvoiceLine.quantity * InvoiceLine.rate if value else InvoiceLine.quantity
    rows = (await db.execute(
        select(InvoiceLine.po_line_item_id, func.sum(measure))
        .join(Invoice, Invoice.id == InvoiceLine.invoice_id)
        .where(Invoice.status.in_(("Posted", "Paid")), InvoiceLine.po_line_item_id.is_not(None),
               not_yet_in_zoho())
        .group_by(InvoiceLine.po_line_item_id)
    )).all()
    return Counter({k: float(v or 0) for k, v in rows})


async def _accepted_by_line(db: AsyncSession) -> Counter:
    rows = (await db.execute(
        select(ZReceiveLine.po_line_item_id, func.sum(ZReceiveLine.quantity_accepted))
        .join(ZReceive, ZReceive.zoho_id == ZReceiveLine.receive_zoho_id)
        .where(arrived_filter())
        .group_by(ZReceiveLine.po_line_item_id)
    )).all()
    return Counter({k: float(v or 0) for k, v in rows})


async def _grir_open(db: AsyncSession) -> dict:
    """Receipt lines accepted but not yet billed — goods received, invoice awaited."""
    items, value, lines, open_count = [], 0.0, 0, 0
    billed_here = await _billed_here(db)
    po_lines = {pl.line_item_id: pl for pl in await all_of(db, select(ZPoLine))}
    for rec in await all_of(db, select(ZReceive).where(arrived_filter())):
        for rl in rec.lines:
            pl = po_lines.get(rl.po_line_item_id)
            if not pl:
                continue
            lines += 1
            unbilled = rl.quantity_accepted - pl.quantity_billed - billed_here[pl.line_item_id]
            if unbilled > 1e-9:
                open_count += 1
                v = unbilled * pl.rate
                value += v
                items.append({"ref": f"GR {rec.number}", "type": "GR/IR open", "value": inr(v),
                              "age": f"{(date.today() - rec.date).days} d" if rec.date else "—",
                              "reason": f"{unbilled:g} × {pl.item_name} received, invoice awaited"})
    return {"lines": lines, "open": open_count, "value": value, "items": items}


# ── Registers ────────────────────────────────────────────────────────────────


async def po_register(db: AsyncSession) -> dict:
    rows = []
    billed_here = await _billed_here(db, value=True)
    accepted_by_line = await _accepted_by_line(db)
    variance = set((await db.execute(select(Invoice.po_number).where(Invoice.status == "Exception"))).scalars())

    for po in await all_of(db, select(ZPurchaseOrder).order_by(ZPurchaseOrder.date.desc())):
        ordered = sum(pl.quantity * pl.rate for pl in po.lines) or 1
        accepted = sum(accepted_by_line[pl.line_item_id] * pl.rate for pl in po.lines)
        invoiced = sum(pl.quantity_billed * pl.rate + billed_here[pl.line_item_id] for pl in po.lines)
        rec_pct, inv_pct = round(accepted / ordered * 100), round(invoiced / ordered * 100)
        if po.number in variance:
            status, tone = "Invoice variance", "err"
        elif inv_pct >= 100:
            status, tone = "Fully invoiced", "ok"
        elif rec_pct == 0:
            status, tone = "Awaiting receipt", "warn"
        elif rec_pct < 100:
            status, tone = "Partially received", "warn"
        else:
            status, tone = "Open", "info"
        rows.append({"po": po.number, "vendor": po.vendor_name, "date": fmt_date(po.date), "value": inr(po.total),
                     "rawValue": po.total, "currency": po.currency, "received": f"{rec_pct}%",
                     "invoiced": f"{inv_pct}%", "cc": po.cost_centre, "buyer": po.buyer, "status": status,
                     "tone": tone, "pr": po.pr_number})

    open_rows = [r for r in rows if r["status"] != "Fully invoiced"]
    fx = policies().get("fx_rates", {})
    requisitions = (await db.execute(select(func.count()).select_from(ZRequisition))).scalar_one()
    return {
        "kpis": [
            {"label": "Open purchase orders", "value": str(len(open_rows)),
             "note": _crore(sum(r["rawValue"] * fx.get(r["currency"], 1) for r in open_rows)) + " committed",
             "tone": "info"},
            {"label": "POs pending receipt", "value": str(sum(1 for r in rows if r["received"] != "100%")),
             "note": "Receipt below ordered value", "tone": "warn"},
            {"label": "Invoice variances", "value": str(sum(1 for r in rows if r["tone"] == "err")),
             "note": "Invoices in exception", "tone": "err"},
            {"label": "Requisitions on file", "value": str(requisitions), "note": "From Zoho", "tone": "info"},
        ],
        "rows": rows,
    }


_RECEIVE_LABEL = {"received": "Received", "in_transit": "In transit", "draft": "Draft",
                  "partially_received": "Partially received"}
_BILL_LABEL = {"billed": ("Billed", "ok"), "partially_billed": ("Partially billed", "warn")}


def _bill_status(rec: ZReceive, po: ZPurchaseOrder | None, billed_here: Counter) -> tuple[str, str]:
    """Zoho's own bill status for the receipt; derived from the PO's billed quantity where Zoho gives none."""
    raw = rec.raw or {}
    if "billed_status" in raw:
        return _BILL_LABEL.get(str(raw.get("billed_status") or "").lower(), ("Yet to be billed", "info"))
    lines = {pl.line_item_id: pl for pl in po.lines} if po else {}
    received = [(lines.get(rl.po_line_item_id), rl.quantity_received) for rl in rec.lines]
    billed = [(pl.quantity_billed + billed_here[pl.line_item_id], q) for pl, q in received if pl]
    if billed and all(b >= q for b, q in billed):
        return "Billed", "ok"
    if any(b > 0 for b, _ in billed):
        return "Partially billed", "warn"
    return "Yet to be billed", "info"


async def grn_register(db: AsyncSession) -> dict:
    rows = []
    billed_here = await _billed_here(db)
    pos = {po.zoho_id: po for po in await all_of(db, select(ZPurchaseOrder))}
    for rec in await all_of(db, select(ZReceive).order_by(ZReceive.date.desc())):
        po = pos.get(rec.po_zoho_id)
        ordered = sum(pl.quantity for pl in po.lines) if po else 0
        received = sum(rl.quantity_received for rl in rec.lines)
        accepted = sum(rl.quantity_accepted for rl in rec.lines)
        status = _RECEIVE_LABEL.get((rec.status or "").lower(), rec.status) or (
            "Posted" if received >= ordered else "Partial receipt")
        tone = ("err" if "hold" in status.lower() else "warn" if received < ordered or not arrived(rec)
                else "ok")
        bill_status, bill_tone = _bill_status(rec, po, billed_here)
        rows.append({"grn": rec.number, "po": po.number if po else "—", "vendor": po.vendor_name if po else "—",
                     "date": fmt_date(rec.date), "type": rec.kind, "ordered": ordered, "received": received,
                     "accepted": accepted, "pending": max(0, ordered - received), "plant": rec.plant,
                     "status": status, "tone": tone, "billStatus": bill_status, "billTone": bill_tone})
    return {
        "kpis": [
            {"label": "Receipts", "value": str(len(rows)),
             "note": f"Goods {sum(1 for r in rows if r['type'] == 'Goods')} · services "
                     f"{sum(1 for r in rows if r['type'] == 'Service')}", "tone": "ok"},
            {"label": "Partial receipts", "value": str(sum(1 for r in rows if r["pending"] > 0)),
             "note": "Blocking invoice match", "tone": "warn"},
            {"label": "Quality holds", "value": str(sum(1 for r in rows if r["tone"] == "err")),
             "note": "Quantity not accepted", "tone": "err"},
            {"label": "GR/IR open lines", "value": str((await _grir_open(db))["open"]),
             "note": "Receipt without invoice", "tone": "info"},
        ],
        "rows": rows,
    }


async def requisition(db: AsyncSession, po_number: str) -> dict:
    po = (await db.execute(select(ZPurchaseOrder).where(ZPurchaseOrder.number == po_number))).scalars().first()
    if not po:
        return {}
    pr = await db.get(ZRequisition, po.pr_number) if po.pr_number else None
    if pr:
        return {"pr": pr.pr_number, "title": pr.title, "raisedBy": pr.raised_by, "dept": pr.department,
                "date": fmt_date(pr.date),
                "facts": [{"k": "PR value", "v": inr(pr.value)}, {"k": "Approved by", "v": pr.approved_by or "—"},
                          {"k": "Approval route", "v": pr.approval_route or "—"}, {"k": "Converted to PO", "v": po.number}]}
    return {"pr": po.pr_number or "—", "title": "Requisition detail held in Zoho", "raisedBy": po.buyer,
            "dept": "Procurement", "date": fmt_date(po.date),
            "facts": [{"k": "PO value", "v": inr(po.total)}, {"k": "Converted to PO", "v": po.number},
                      {"k": "Status", "v": po.status or "—"}]}
