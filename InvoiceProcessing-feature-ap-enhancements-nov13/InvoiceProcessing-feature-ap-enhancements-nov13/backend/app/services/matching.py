"""The match engine — deterministic, explainable, policy-driven.

Invoice lines are mapped to PO lines (description similarity, HSN/SAC and
rate), then each line is tested against:

* ordered quantity, net of quantity already billed          (2-way)
* accepted goods-receipt / service-entry quantity           (3-way)
* unit price, within the price tolerance
* GST rate

Charges that commonly sit outside a PO (freight, packing) are allowed through
with a note when policy says so. No PO at all is an *exception*, not a failure:
the non-PO route needs a cost centre and business-owner approval instead.
"""

from dataclasses import dataclass, field
from difflib import SequenceMatcher

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Invoice, InvoiceLine, ZBill, ZPoLine, ZPurchaseOrder, ZReceive, ZReceiveLine
from . import gst
from .common import fmt_date, inr, norm_doc_no, policies

# Invoices whose quantities count as already billed against a PO line.
BILLED_STATUSES = ("Posted", "Submitted", "Paid")


@dataclass
class LineResult:
    line_no: int
    description: str
    page: int
    invoiced: float
    rate: float
    tax_rate: float
    po_line_item_id: str | None = None
    po_line_no: int | None = None
    ordered: float | None = None
    billed_before: float = 0
    received: float | None = None
    accepted: float | None = None
    po_rate: float | None = None
    po_tax_rate: float | None = None
    score: float = 0
    status: str = "pass"  # pass | warn | fail
    issues: list[dict] = field(default_factory=list)

    def flag(self, status: str, code: str, text: str) -> None:
        self.issues.append({"code": code, "text": text, "status": status})
        if status == "fail" or (status == "warn" and self.status == "pass"):
            self.status = status


def _sim(a: str | None, b: str | None) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


async def find_po(db: AsyncSession, inv: Invoice) -> ZPurchaseOrder | None:
    ref = norm_doc_no(inv.po_number)
    if not ref:
        return None
    exact = (await db.execute(select(ZPurchaseOrder).where(ZPurchaseOrder.number == inv.po_number.strip()))
             ).scalars().first()
    if exact:
        return exact
    # A reformatted or prefixed reference such as "PO-4500131207" or "4500131207/10".
    numbers = (await db.execute(select(ZPurchaseOrder.zoho_id, ZPurchaseOrder.number))).all()
    hit = next((zid for zid, n in numbers if norm_doc_no(n) == ref), None) or next(
        (zid for zid, n in numbers if norm_doc_no(n) and norm_doc_no(n) in ref), None)
    return await db.get(ZPurchaseOrder, hit) if hit else None


async def candidate_pos(db: AsyncSession, inv: Invoice) -> list[ZPurchaseOrder]:
    """Open POs for the vendor whose value or lines resemble the invoice."""
    if not inv.vendor_zoho_id:
        return []
    pos = (await db.execute(
        select(ZPurchaseOrder).where(
            ZPurchaseOrder.vendor_zoho_id == inv.vendor_zoho_id,
            ZPurchaseOrder.status.not_in(["closed", "cancelled", "billed"]),
        )
    )).scalars().all()
    out = []
    for po in pos:
        value_close = po.total and abs(po.total - inv.total) / po.total < 0.1
        lines_close = any(_sim(pl.item_name, ln.description) > 0.75 for pl in po.lines for ln in inv.lines)
        if value_close or lines_close:
            out.append(po)
    return out


# Zoho receipt statuses whose goods have not arrived — they count as nothing received.
NOT_ARRIVED = ("in_transit", "draft")


def arrived(rec: ZReceive) -> bool:
    return (rec.status or "").strip().lower() not in NOT_ARRIVED


def arrived_filter():
    """SQL form of ``arrived`` for queries over ZReceive."""
    return or_(ZReceive.status.is_(None), func.lower(ZReceive.status).not_in(NOT_ARRIVED))


async def receipts_by_line(db: AsyncSession, po: ZPurchaseOrder) -> dict[str, tuple[float, float]]:
    """Received and accepted quantity per PO line — receipts still in transit do not count."""
    rows = (await db.execute(
        select(ZReceiveLine.po_line_item_id,
               func.sum(ZReceiveLine.quantity_received), func.sum(ZReceiveLine.quantity_accepted))
        .join(ZReceive, ZReceive.zoho_id == ZReceiveLine.receive_zoho_id)
        .where(ZReceive.po_zoho_id == po.zoho_id, arrived_filter())
        .group_by(ZReceiveLine.po_line_item_id)
    )).all()
    return {r[0]: (float(r[1] or 0), float(r[2] or 0)) for r in rows}



def not_yet_in_zoho():
    """Posted invoices whose bill Zoho does not know yet (not synced back, or bill writing off).

    Once a bill is in the Zoho mirror, the PO line's ``quantity_billed`` from Zoho
    already includes it — counting it locally as well would double it.
    """
    return or_(Invoice.zoho_bill_id.is_(None), Invoice.zoho_bill_id.not_in(select(ZBill.zoho_id)))


async def billed_locally(db: AsyncSession, inv: Invoice) -> dict[str, float]:
    """Quantity billed through the Command Center on each PO line that Zoho does not reflect yet."""
    rows = (await db.execute(
        select(InvoiceLine.po_line_item_id, func.sum(InvoiceLine.quantity))
        .join(Invoice, Invoice.id == InvoiceLine.invoice_id)
        .where(Invoice.id != inv.id, Invoice.status.in_(BILLED_STATUSES),
               InvoiceLine.po_line_item_id.is_not(None), not_yet_in_zoho())
        .group_by(InvoiceLine.po_line_item_id)
    )).all()
    return {r[0]: float(r[1] or 0) for r in rows}


def _assign_lines(inv: Invoice, po: ZPurchaseOrder) -> dict[int, tuple[ZPoLine, float]]:
    """Greedy best-first assignment of invoice lines to PO lines."""
    tol = policies()["tolerances"]["price_pct"] / 100
    pairs = []
    for ln in inv.lines:
        for pl in po.lines:
            score = 0.55 * max(_sim(ln.description, pl.item_name), _sim(ln.description, pl.description))
            score += 0.25 if ln.hsn_sac and pl.hsn_sac and str(ln.hsn_sac) == str(pl.hsn_sac) else 0
            score += 0.2 if pl.rate and abs(ln.rate - pl.rate) / pl.rate <= tol else 0
            pairs.append((score, ln.line_no, pl))
    pairs.sort(key=lambda p: -p[0])
    used_inv, used_po, out = set(), set(), {}
    for score, line_no, pl in pairs:
        if score < 0.45 or line_no in used_inv or pl.line_item_id in used_po:
            continue
        out[line_no] = (pl, score)
        used_inv.add(line_no)
        used_po.add(pl.line_item_id)
    return out


async def run(db: AsyncSession, inv: Invoice, receives_enabled: bool = True) -> dict:
    """Runs the match and writes the verdict onto the invoice. Returns the result."""
    pol = policies()
    qty_tol = pol["tolerances"]["quantity_pct"] / 100
    price_tol = pol["tolerances"]["price_pct"] / 100
    charges = [c.lower() for c in pol["tolerances"]["allow_unmatched_charges"]]

    po = await find_po(db, inv)
    result: dict = {"po": None, "receipts": [], "lines": [], "reasons": [], "mode": None}

    # ── Non-PO route ────────────────────────────────────────────────────────
    if po is None:
        candidates = await candidate_pos(db, inv)
        result["mode"] = "non-po"
        result["searched"] = "All open POs for the vendor"
        result["candidates"] = [{"po": p.number, "date": fmt_date(p.date), "value": inr(p.total)} for p in candidates]
        if inv.po_number:
            result["reasons"].append("Missing PO")
            status = "exception"
            note = f"PO {inv.po_number} printed on the invoice does not exist in Zoho Books"
        else:
            note = "No purchase order referenced on the invoice"
            threshold = pol["non_po"]["gpo_threshold"]
            needs_cc = pol["non_po"]["require_cost_centre"] and not inv.cost_centre
            if needs_cc:
                result["reasons"].append("Missing PO")
                status = "exception"
                note += " — a cost centre and business-owner approval are required"
            else:
                status = "pass"
                note += f" — coded to {inv.cost_centre}; business-owner approval applies"
            if inv.total_inr > threshold:
                note += f" (above {inr(threshold, 0)}: GPO sign-off required)"
        result["note"] = note
        return _finish(inv, result, status)

    # ── PO route ────────────────────────────────────────────────────────────
    result["po"] = {"number": po.number, "zoho_id": po.zoho_id, "date": fmt_date(po.date), "vendor": po.vendor_name,
                    "value": po.total, "cost_centre": po.cost_centre, "business_unit": po.business_unit,
                    "pr": po.pr_number, "terms": po.payment_terms_label}
    inv.cost_centre = inv.cost_centre or po.cost_centre
    inv.business_unit = inv.business_unit or po.business_unit

    if inv.vendor_zoho_id and po.vendor_zoho_id and inv.vendor_zoho_id != po.vendor_zoho_id:
        result["reasons"].append("Vendor mismatch")
        result["note"] = f"PO {po.number} belongs to {po.vendor_name}, not the invoicing vendor"
        return _finish(inv, result, "fail")

    receipts = await receipts_by_line(db, po) if receives_enabled else {}
    receives = (await db.execute(select(ZReceive).where(ZReceive.po_zoho_id == po.zoho_id))).scalars().all()
    result["receipts"] = [{"number": r.number, "date": fmt_date(r.date), "kind": r.kind, "plant": r.plant,
                           "status": r.status} for r in receives if arrived(r)]
    in_transit = [r.number for r in receives if not arrived(r)]
    result["in_transit"] = in_transit
    three_way = receives_enabled
    result["mode"] = "3-way" if three_way else "2-way"
    billed_here = await billed_locally(db, inv)
    assigned = _assign_lines(inv, po)

    for ln in inv.lines:
        lr = LineResult(line_no=ln.line_no, description=ln.description, page=ln.page,
                        invoiced=ln.quantity, rate=ln.rate, tax_rate=ln.tax_rate)
        match = assigned.get(ln.line_no)
        if not match:
            ln.po_line_item_id = None
            if any(c in ln.description.lower() for c in charges):
                lr.flag("warn", "charge", "Charge not on the PO — allowed by policy")
            else:
                lr.flag("fail", "unmatched", "No corresponding PO line")
                result["reasons"].append("Line not on PO")
            result["lines"].append(lr.__dict__)
            continue

        pl, score = match
        ln.po_line_item_id = pl.line_item_id
        lr.po_line_item_id, lr.po_line_no, lr.score = pl.line_item_id, pl.line_no, round(score, 3)
        lr.ordered, lr.po_rate, lr.po_tax_rate = pl.quantity, pl.rate, pl.tax_rate
        lr.billed_before = pl.quantity_billed + billed_here.get(pl.line_item_id, 0)

        open_qty = pl.quantity - lr.billed_before
        if ln.quantity > open_qty * (1 + qty_tol) + 1e-9:
            over = ln.quantity - open_qty
            lr.flag("fail", "qty_po", f"Invoiced {ln.quantity:g} against {open_qty:g} open on the PO (+{over:g})")
            result["reasons"].append("Quantity variance")

        if three_way:
            rec, acc = receipts.get(pl.line_item_id, (0.0, 0.0))
            lr.received, lr.accepted = rec, acc
            unbilled_accepted = acc - lr.billed_before
            service = gst.is_sac(pl.hsn_sac) or gst.is_sac(ln.hsn_sac)
            if rec == 0 and service:
                lr.flag("warn", "no_ses", "Service line — no service receipt recorded in Zoho; matched 2-way against the PO")
            elif ln.quantity > unbilled_accepted * (1 + qty_tol) + 1e-9:
                gap = ln.quantity - unbilled_accepted
                pending = (f" — receipt {', '.join(in_transit)} is still in transit in Zoho; mark it Received "
                           "there, then revalidate") if in_transit else ""
                lr.flag("fail", "qty_grn",
                        f"Invoiced {ln.quantity:g} against {unbilled_accepted:g} accepted and unbilled (+{gap:g})"
                        + pending)
                if "Quantity variance" not in result["reasons"]:
                    result["reasons"].append("Quantity variance")

        if pl.rate and abs(ln.rate - pl.rate) / pl.rate > price_tol:
            pct = (ln.rate - pl.rate) / pl.rate * 100
            lr.flag("fail", "price", f"Rate {inr(ln.rate)} vs PO {inr(pl.rate)} ({pct:+.1f}%)")
            result["reasons"].append("Price variance")

        if ln.tax_rate and pl.tax_rate and abs(ln.tax_rate - pl.tax_rate) > 0.01:
            lr.flag("fail", "tax_rate", f"GST {ln.tax_rate:g}% vs PO {pl.tax_rate:g}%")
            result["reasons"].append("GST mismatch")

        result["lines"].append(lr.__dict__)

    result["reasons"] = list(dict.fromkeys(result["reasons"]))
    status = "fail" if any(r["status"] == "fail" for r in result["lines"]) else "pass"
    mapped = sum(1 for r in result["lines"] if r["po_line_item_id"])
    result["note"] = f"{mapped} of {len(inv.lines)} lines mapped to PO {po.number}"
    return _finish(inv, result, status)


def _finish(inv: Invoice, result: dict, status: str) -> dict:
    result["status"] = status
    scores = [r["score"] for r in result["lines"] if r.get("score")]
    base = sum(scores) / len(scores) if scores else (0.9 if result["mode"] == "non-po" else 0.5)
    conf = min(0.999, 0.5 + base * 0.5) * (inv.extraction_confidence or 0.9)
    inv.match_status = status
    inv.match_confidence = round(conf, 4)
    inv.match_result = result
    return result


# ── Presentation helpers (match cards, reconciliation rows, discrepancy) ─────


def discrepancy(inv: Invoice) -> dict | None:
    res = inv.match_result or {}
    for r in res.get("lines", []):
        fails = [i for i in r["issues"] if i["status"] == "fail"]
        if not fails:
            continue
        first = fails[0]
        figures = [{"k": "Invoice qty", "v": f"{r['invoiced']:g}", "tone": "err"}]
        if r.get("ordered") is not None:
            figures.append({"k": "PO qty", "v": f"{r['ordered']:g}", "tone": "plain"})
        if r.get("accepted") is not None:
            figures.append({"k": "Goods receipt", "v": f"{r['accepted']:g}", "tone": "plain"})
        if first["code"].startswith("qty"):
            base = min(x for x in (r.get("ordered"), r.get("accepted")) if x is not None)
            diff = r["invoiced"] - (base - r.get("billed_before", 0))
            figures.append({"k": "Difference", "v": f"{diff:+g} units", "tone": "err"})
            title = f"Quantity discrepancy — {r['description']}"
        elif first["code"] == "price":
            figures = [{"k": "Invoice rate", "v": inr(r["rate"]), "tone": "err"},
                       {"k": "PO rate", "v": inr(r["po_rate"]), "tone": "plain"}]
            title = f"Price variance — {r['description']}"
        elif first["code"] == "tax_rate":
            figures = [{"k": "Invoice GST", "v": f"{r['tax_rate']:g}%", "tone": "err"},
                       {"k": "PO GST", "v": f"{r['po_tax_rate']:g}%", "tone": "plain"}]
            title = f"GST rate mismatch — {r['description']}"
        else:
            title = f"Line not on purchase order — {r['description']}"
        return {"title": title, "line_no": r["line_no"], "code": first["code"],
                "where": f"Line {r['line_no']}, page {r['page']} of the invoice. {first['text']}.",
                "figures": figures}
    return None


def cards(inv: Invoice) -> list[dict]:
    res = inv.match_result or {}
    status = inv.match_status
    qty = sum(ln.quantity for ln in inv.lines)
    inv_card = {"title": "Invoice", "status": "⚠ Variance" if status == "fail" else "✓ Validated",
                "tone": "err" if status == "fail" else "ok",
                "rows": [{"k": "Invoice No.", "v": inv.invoice_number or "—"},
                         {"k": "Vendor", "v": inv.vendor_name or "—"},
                         {"k": "Amount", "v": inr(inv.total)},
                         {"k": "Quantity", "v": f"{qty:g} units"}]}
    po = res.get("po")
    if not po:
        return [inv_card,
                {"title": "Purchase Order", "status": "⚠ Not found", "tone": "warn",
                 "rows": [{"k": "PO Number", "v": inv.po_number or "—", "tone": "warn"},
                          {"k": "Search scope", "v": res.get("searched", "—")},
                          {"k": "Candidates", "v": str(len(res.get("candidates", [])))}]},
                {"title": "Goods Receipt", "status": "Not applicable", "tone": "plain",
                 "rows": [{"k": "GR Number", "v": "—"}, {"k": "Basis", "v": "Non-PO invoice"}]}]
    ordered = sum(r["ordered"] or 0 for r in res["lines"] if r.get("ordered") is not None)
    accepted = sum(r["accepted"] or 0 for r in res["lines"] if r.get("accepted") is not None)
    rec = res["receipts"][0] if res["receipts"] else None
    return [
        inv_card,
        {"title": "Purchase Order", "status": "✓ Matched" if status == "pass" else "✓ Found", "tone": "ok",
         "rows": [{"k": "PO Number", "v": po["number"]}, {"k": "PO Amount", "v": inr(po["value"])},
                  {"k": "Ordered Qty", "v": f"{ordered:g} units"}, {"k": "Vendor", "v": po["vendor"] or "—"}]},
        {"title": "Goods Receipt", "status": ("✓ Matched" if status == "pass" else "✓ Found") if rec else "⚠ Not found",
         "tone": "ok" if rec else "warn",
         "rows": [{"k": "GR Number", "v": ", ".join(r["number"] for r in res["receipts"]) or "—"},
                  {"k": "Accepted Qty", "v": f"{accepted:g} units" if rec else "—"},
                  {"k": "Receipt Date", "v": rec["date"] if rec else "—"},
                  {"k": "Plant", "v": (rec or {}).get("plant") or "—"}]},
    ]


def recon_rows(inv: Invoice) -> list[dict]:
    res = inv.match_result or {}
    po = res.get("po")
    heads = "IGST" if inv.igst else "CGST + SGST"
    rows = [{"k": "Vendor / GSTIN", "inv": inv.vendor_gstin or "—",
             "ref": inv.vendor_gstin if inv.vendor_zoho_id else "Not in master",
             "res": "✓" if inv.vendor_zoho_id else "⚠ Mismatch"}]
    if not po:
        rows += [{"k": "PO Number", "inv": inv.po_number or "Not referenced", "ref": "No match", "res": "⚠ Exception"},
                 {"k": "Cost centre", "inv": inv.cost_centre or "Not stated", "ref": "Required",
                  "res": "✓" if inv.cost_centre else "⚠ Missing"},
                 {"k": "Taxable value", "inv": inr(inv.subtotal), "ref": "n/a", "res": "✓"},
                 {"k": heads, "inv": inr(inv.tax_total), "ref": inr(inv.tax_total), "res": "✓"}]
        if inv.tds_amount:
            rows.append({"k": f"TDS u/s {inv.tds_section}", "inv": inr(inv.tds_amount), "ref": inr(inv.tds_amount), "res": "✓"})
        return rows

    lines = res["lines"]
    ref_qty = sum(min(x for x in (r.get("ordered"), r.get("accepted")) if x is not None)
                  for r in lines if r.get("ordered") is not None)
    inv_qty = sum(r["invoiced"] for r in lines if r.get("ordered") is not None)
    ref_taxable = sum(min(r["invoiced"], min(x for x in (r.get("ordered"), r.get("accepted")) if x is not None))
                      * (r["po_rate"] or 0) for r in lines if r.get("ordered") is not None)
    ref_taxable += sum(r["invoiced"] * r["rate"] for r in lines if r.get("ordered") is None)
    qty_ok = inv_qty <= ref_qty + 1e-9
    val_ok = abs(ref_taxable - inv.subtotal) <= max(1, len(lines) * 0.5)
    price_ok = not any(i["code"] == "price" for r in lines for i in r["issues"])
    rows += [
        {"k": "PO Number", "inv": inv.po_number or "—", "ref": po["number"], "res": "✓"},
        {"k": "Quantity", "inv": f"{inv_qty:g}", "ref": f"{ref_qty:g}",
         "res": "✓" if qty_ok else f"⚠ {inv_qty - ref_qty:+g} units"},
        {"k": "Unit prices", "inv": "As invoiced", "ref": "PO rates", "res": "✓" if price_ok else "⚠ Variance"},
        {"k": "Taxable value", "inv": inr(inv.subtotal), "ref": inr(ref_taxable), "res": "✓" if val_ok else "⚠ Variance"},
        {"k": heads, "inv": inr(inv.tax_total), "ref": inr(inv.tax_total), "res": "✓"},
        {"k": "Total", "inv": inr(inv.total), "ref": inr(ref_taxable + inv.tax_total * (ref_taxable / inv.subtotal if inv.subtotal else 1)),
         "res": "✓" if val_ok else "⚠ Variance"},
    ]
    return rows
