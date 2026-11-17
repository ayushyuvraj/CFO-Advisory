"""Authorised corrections and source-correction requests.

Ownership decides what may change here:

* Invoice values were extracted by the Command Center, so a user can correct
  them — with a reason, recorded with user and timestamp, followed by an
  automatic re-run of validation and the match.
* PO and goods-receipt values belong to Zoho Books. They are never overwritten;
  a source-correction request is raised instead.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Correction, Invoice, SourceRequest
from . import approvals, pipeline
from .common import activity, audit, new_ref, parse_amount, parse_date


class CorrectionError(ValueError):
    pass


LINE_FIELDS = {"quantity", "rate", "tax_rate", "hsn_sac", "description", "discount"}

# UI field key → invoice attribute. Totals follow the lines and are not edited directly.
HEADER_FIELDS = {
    "vendor": "vendor_name",
    "gstin": "vendor_gstin",
    "number": "invoice_number",
    "date": "invoice_date",
    "po": "po_number",
    "currency": "currency",
    "terms": "payment_terms",
    "entity": "buyer_name",
    "buyerGstin": "buyer_gstin",
    "pos": "place_of_supply",
    "dueDate": "due_date",
    "pan": "vendor_pan",
    "shipTo": "ship_to",
}
CODING_FIELDS = {"cost_centre", "gl_account", "business_unit"}
LOCKED_STATUSES = {"Posted", "Paid", "Submitted"}


def _guard(inv: Invoice) -> None:
    if inv.status in LOCKED_STATUSES:
        raise CorrectionError(f"{inv.invoice_number} is {inv.status.lower()} — raise a credit or debit note instead")
    if inv.pipeline_state != "done":
        raise CorrectionError("The invoice is still being processed")


async def correct_line(db: AsyncSession, inv: Invoice, line_no: int, fld: str, value: str,
                 reason: str, comment: str | None, user: str) -> Correction:
    _guard(inv)
    if fld not in LINE_FIELDS:
        raise CorrectionError(f"Line field '{fld}' cannot be corrected")
    line = next((ln for ln in inv.lines if ln.line_no == line_no), None)
    if line is None:
        raise CorrectionError(f"Line {line_no} does not exist")

    old = getattr(line, fld)
    new: object = value
    if fld in ("quantity", "rate", "tax_rate", "discount"):
        new = parse_amount(value)
        if new < 0:
            raise CorrectionError("Value cannot be negative")
        if fld in ("quantity", "rate") and new == 0:
            raise CorrectionError(f"{fld.capitalize()} must be greater than zero — if nothing on this line is "
                                  "billable yet, park the invoice or reject it instead")
    if str(old) == str(new):
        raise CorrectionError("The new value is the same as the current value")
    setattr(line, fld, new)

    # The correction is not cosmetic: the line, the GST and the totals move with it.
    line.taxable_value = round(line.quantity * line.rate - line.discount, 2)
    tax = round(line.taxable_value * line.tax_rate / 100, 2)
    from .invoice_tax_evidence import is_foreign_tax_document
    if is_foreign_tax_document(inv):
        line.igst = line.cgst = line.sgst = 0
    elif line.igst or (inv.igst and not inv.cgst):
        line.igst, line.cgst, line.sgst = tax, 0, 0
    else:
        line.cgst = line.sgst = round(tax / 2, 2)
        line.igst = 0
    _retotal(inv)

    entry = Correction(target="line", line_no=line_no, field=fld, old_value=_fmt(old), new_value=_fmt(new),
                       reason=reason, comment=comment, user=user)
    return await _commit(db, inv, entry, f"Invoice line {line_no} {fld.replace('_', ' ')} {_fmt(old)} → {_fmt(new)}")


async def correct_field(db: AsyncSession, inv: Invoice, key: str, value: str,
                  reason: str, comment: str | None, user: str) -> Correction:
    _guard(inv)
    if key in CODING_FIELDS:
        old = getattr(inv, key)
        setattr(inv, key, value.strip() or None)
        entry = Correction(target="coding", field=key, old_value=old, new_value=value, reason=reason,
                           comment=comment, user=user)
        return await _commit(db, inv, entry, f"{key.replace('_', ' ').capitalize()} {old or 'blank'} → {value}")

    if key in ("tinNumber", "vatNo"):
        field = next((f for f in inv.fields if f.key == key), None)
        if field is None:
            raise CorrectionError("Tax identifier field is not available; reprocess this invoice first")
        new = value.strip() or None
        if field.value == new:
            raise CorrectionError("The new value is the same as the current value")
        old = field.value
        field.value, field.corrected, field.confidence = new, True, 1.0
        entry = Correction(target="field", field=key, old_value=old, new_value=new,
                           reason=reason, comment=comment, user=user)
        return await _commit(db, inv, entry, f"{field.label} {old or 'blank'} → {new or 'blank'}")

    attr = HEADER_FIELDS.get(key)
    if attr is None:
        raise CorrectionError(f"Field '{key}' cannot be corrected directly")
    old = getattr(inv, attr)
    new: object = value.strip()
    if attr in ("invoice_date", "due_date"):
        new = parse_date(value)
        if new is None:
            raise CorrectionError(f"'{value}' is not a date")
    elif attr in ("vendor_gstin", "buyer_gstin", "vendor_pan"):
        new = value.replace(" ", "").upper()
    setattr(inv, attr, new or None)

    f = next((f for f in inv.fields if f.key == key), None)
    if f:
        f.value, f.corrected, f.confidence = _fmt(new), True, 1.0
    if key == "po":
        inv.cost_centre = inv.business_unit = None  # re-derived from the new PO
    entry = Correction(target="field", field=key, old_value=_fmt(old), new_value=_fmt(new), reason=reason,
                       comment=comment, user=user)
    label = f.label if f else key
    return await _commit(db, inv, entry, f"{label} {_fmt(old) or 'blank'} → {_fmt(new)}")


def _retotal(inv: Invoice) -> None:
    inv.subtotal = round(sum(ln.taxable_value for ln in inv.lines), 2)
    inv.cgst = round(sum(ln.cgst for ln in inv.lines), 2)
    inv.sgst = round(sum(ln.sgst for ln in inv.lines), 2)
    inv.igst = round(sum(ln.igst for ln in inv.lines), 2)
    from .invoice_tax_evidence import is_foreign_tax_document
    inv.tax_total = (round(sum(ln.taxable_value * ln.tax_rate / 100 for ln in inv.lines), 2)
                     if is_foreign_tax_document(inv)
                     else round(inv.cgst + inv.sgst + inv.igst + inv.cess, 2))
    inv.total = round(inv.subtotal + inv.tax_total + inv.round_off, 2)
    for f in inv.fields:
        value = {"subtotal": inv.subtotal, "tax": inv.tax_total, "total": inv.total}.get(f.key)
        if value is not None and f.value != f"{value:.2f}":
            f.value, f.corrected, f.confidence = f"{value:.2f}", True, 1.0


async def _commit(db: AsyncSession, inv: Invoice, entry: Correction, text: str) -> Correction:
    inv.corrections.append(entry)
    inv.corrected = True
    approvals.reset(inv)
    await db.flush()
    audit(db, entry.user, f"Changed {text} · {entry.reason}", inv,
          field=entry.field, line=entry.line_no, old=entry.old_value, new=entry.new_value, comment=entry.comment)
    activity(db, inv, f"Correction applied by {entry.user} — {text}")
    await pipeline.revalidate(db, inv, entry.user)
    return entry


async def raise_source_request(db: AsyncSession, inv: Invoice, document: str, fld: str, requested: str | None,
                         reason: str, user: str) -> SourceRequest:
    res = inv.match_result or {}
    po = res.get("po") or {}
    if document not in ("purchase_order", "goods_receipt"):
        raise CorrectionError("Source requests apply to a purchase order or goods receipt")
    ref = po.get("number") if document == "purchase_order" else ", ".join(r["number"] for r in res.get("receipts", []))
    if not ref:
        raise CorrectionError(f"No {document.replace('_', ' ')} is linked to this invoice")
    current = None
    focus = next((ln for ln in res.get("lines", []) if ln["status"] == "fail"), None)
    if focus:
        current = str(focus.get("ordered") if document == "purchase_order" else focus.get("accepted"))

    req = SourceRequest(ref=await new_ref(db, "SRQ"), document=document, document_ref=ref, field=fld,
                        current_value=current, requested_value=requested, reason=reason, raised_by=user)
    inv.source_requests.append(req)
    await db.flush()
    audit(db, user, f"Source correction requested on {document.replace('_', ' ')} {ref} ({fld}) — {req.ref}", inv,
          requested=requested, reason=reason)
    activity(db, inv, f"Source correction {req.ref} raised with the Zoho Books owner", "→")
    return req


def _fmt(v: object) -> str | None:
    if v is None:
        return None
    if isinstance(v, float):
        return f"{v:g}"
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")  # type: ignore[union-attr]
    return str(v)
