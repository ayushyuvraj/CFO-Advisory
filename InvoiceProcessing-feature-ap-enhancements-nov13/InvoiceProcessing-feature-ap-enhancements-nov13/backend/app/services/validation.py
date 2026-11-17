"""Deterministic invoice validation.

Each check returns pass / warn / fail with a plain-English detail. Checks also
feed back into field confidence: a value that independently verifies (a GSTIN
that passes its checksum and matches the vendor master) earns confidence; one
that contradicts the evidence loses it.
"""

from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Invoice, InvoiceField, ZBill, ZVendor
from . import gst
from .common import inr, norm_doc_no, policies, parse_amount


def check(code: str, label: str, status: str, detail: str, reason: str | None = None) -> dict:
    """``reason`` is the exception category shown in the AP inbox when the check fails."""
    return {"code": code, "label": label, "status": status, "detail": detail, "reason": reason}


def similar(a: str | None, b: str | None) -> float:
    def norm(s: str) -> str:
        s = s.lower()
        for token in (" private", " pvt", " limited", " ltd", " llp", " india", ".", ","):
            s = s.replace(token, " ")
        return " ".join(s.split())

    if not a or not b:
        return 0.0
    return SequenceMatcher(None, norm(a), norm(b)).ratio()


def field(inv: Invoice, key: str) -> InvoiceField | None:
    return next((f for f in inv.fields if f.key == key), None)


def adjust(inv: Invoice, key: str, verified: bool) -> None:
    """Verified: remove 70% of the remaining doubt. Contradicted: cut confidence by 40%."""
    f = field(inv, key)
    if not f or not f.value:
        return
    f.confidence = round(1 - (1 - f.confidence) * 0.3 if verified else f.confidence * 0.6, 4)


# ── Individual checks ────────────────────────────────────────────────────────


async def identify_vendor(db: AsyncSession, inv: Invoice) -> dict:
    gstin = gst.clean_gstin(inv.vendor_gstin)
    same_gstin = []
    if gstin:
        same_gstin = (await db.execute(select(ZVendor).where(ZVendor.gstin == gstin))).scalars().all()
    if same_gstin:
        # Several vendor records can share a GSTIN (branches, or duplicate master data):
        # take the one whose name matches the invoice, and say so.
        vendor = max(same_gstin, key=lambda v: similar(v.name, inv.vendor_name))
        inv.vendor_zoho_id = vendor.zoho_id
        adjust(inv, "vendor", similar(vendor.name, inv.vendor_name) > 0.8)
        _set_vendor_id(inv, vendor.zoho_id, 0.995 if len(same_gstin) == 1 else 0.9)
        if len(same_gstin) > 1:
            others = ", ".join(v.name for v in same_gstin if v is not vendor)
            return check("vendor", "Vendor identified", "warn",
                         f"{vendor.name} ({vendor.zoho_id}) chosen by name — {len(same_gstin)} vendor records in Zoho "
                         f"share GSTIN {gstin} (also: {others}); clean up the vendor master")
        return check("vendor", "Vendor identified", "pass",
                     f"{vendor.name} ({vendor.zoho_id}) matched on GSTIN in the Zoho vendor master")

    # Fall back to the name — and say so, because a GSTIN mismatch matters.
    vendors = (await db.execute(select(ZVendor))).scalars().all()
    best = max(vendors, key=lambda v: similar(v.name, inv.vendor_name), default=None)
    if best and similar(best.name, inv.vendor_name) >= 0.85 and not gstin and _overseas(best, inv):
        inv.vendor_zoho_id, inv.is_import = best.zoho_id, True
        _set_vendor_id(inv, best.zoho_id, 0.97)
        return check("vendor", "Vendor identified", "pass",
                     f"{best.name} ({best.zoho_id}) matched by name — non-resident supplier, no Indian GSTIN")
    if best and similar(best.name, inv.vendor_name) >= 0.85:
        inv.vendor_zoho_id = best.zoho_id
        _set_vendor_id(inv, best.zoho_id, 0.8)
        adjust(inv, "gstin", False)
        return check("vendor", "Vendor identified", "warn",
                     f"Matched to {best.name} by name only — invoice GSTIN {gstin or 'absent'} "
                     f"differs from master {best.gstin or 'blank'}", "Vendor mismatch")

    inv.vendor_zoho_id = None
    _set_vendor_id(inv, None, 0)
    return check("vendor", "Vendor identified", "fail",
                 f"{inv.vendor_name or 'The supplier'} is not in the Zoho vendor master", "Vendor mismatch")


def _overseas(vendor: ZVendor, inv: Invoice) -> bool:
    return vendor.gst_treatment in ("overseas", "non_gst_supply") or (not vendor.gstin and inv.currency != "INR")


def currency_check(inv: Invoice) -> dict:
    """Sets the INR conversion used for DOA limits, dashboards and posting."""
    if inv.currency == "INR":
        inv.fx_rate = 1
        return check("currency", "Currency", "pass", "INR")
    rate = policies().get("fx_rates", {}).get(inv.currency)
    if not rate:
        inv.fx_rate = 1
        return check("currency", "Currency", "fail",
                     f"No exchange rate configured for {inv.currency} in policies.json", "Other")
    inv.fx_rate = float(rate)
    return check("currency", "Currency", "pass",
                 f"{inv.currency} at ₹{rate:g} — INR equivalent {inr(inv.total_inr)}")


def _set_vendor_id(inv: Invoice, vendor_id: str | None, conf: float) -> None:
    f = field(inv, "vendorId")
    if f is None:
        f = InvoiceField(key="vendorId", label="Vendor ID", page=1)
        inv.fields.append(f)
    f.value = vendor_id
    f.original_value = f.original_value or vendor_id
    f.confidence = conf


def gstin_check(inv: Invoice) -> dict:
    from .invoice_tax_evidence import is_foreign_tax_document
    if is_foreign_tax_document(inv):
        return check("gstin", "Tax registration reviewed", "warn",
                     "Supplier TIN/VAT captured separately; Indian GSTIN is not stated. Foreign registration is not validated.")
    if inv.is_import and not inv.vendor_gstin:
        return check("gstin", "GSTIN validated", "pass",
                     "Non-resident supplier — no Indian GSTIN; IGST is paid by the importer on the Bill of Entry")
    ok, detail = gst.validate_gstin(inv.vendor_gstin)
    adjust(inv, "gstin", ok)
    if not ok:
        return check("gstin", "GSTIN validated", "fail", detail, "GST mismatch")
    pan = gst.pan_from_gstin(inv.vendor_gstin)
    if inv.vendor_pan and gst.clean_gstin(inv.vendor_pan) != pan:
        return check("gstin", "GSTIN validated", "warn",
                     f"{detail}; printed PAN {inv.vendor_pan} does not match the PAN in the GSTIN ({pan})")
    inv.vendor_pan = inv.vendor_pan or pan
    return check("gstin", "GSTIN validated", "pass", detail)


def buyer_check(inv: Invoice, org_gstins: set[str] | None = None) -> dict:
    """``org_gstins``: the connected Zoho organisation's own registration(s), added to policy."""
    ours = set(policies()["organisation"]["gstins"]) | (org_gstins or set())
    buyer = gst.clean_gstin(inv.buyer_gstin)
    if not buyer:
        return check("buyer", "Billed to our entity", "warn", "Buyer GSTIN not printed — ITC claim needs it")
    if buyer not in ours:
        adjust(inv, "entity", False)
        return check("buyer", "Billed to our entity", "fail",
                     f"Buyer GSTIN {buyer} is not one of the organisation's registrations", "GST mismatch")
    adjust(inv, "entity", True)
    return check("buyer", "Billed to our entity", "pass",
                 f"Billed to {inv.buyer_name or 'the organisation'} — GSTIN {buyer}")


def lines_check(inv: Invoice) -> dict:
    tol = policies()["tolerances"]["arithmetic_abs"]
    if not inv.lines:
        return check("lines", "Line items interpreted", "fail", "No line items could be read", "Missing supporting document")
    zero = [ln.line_no for ln in inv.lines if ln.quantity <= 0 or ln.rate <= 0]
    if zero:
        return check("lines", "Line items interpreted", "fail",
                     f"Line {', '.join(map(str, zero))} has zero quantity or rate — nothing can be billed for it",
                     "Quantity variance")
    problems = []
    for ln in inv.lines:
        expected = round(ln.quantity * ln.rate - ln.discount, 2)
        if ln.taxable_value and abs(expected - ln.taxable_value) > tol:
            problems.append(f"line {ln.line_no}: {ln.quantity:g} × {inr(ln.rate)} ≠ {inr(ln.taxable_value)}")
        elif not ln.taxable_value:
            ln.taxable_value = expected
        if not gst.valid_hsn_sac(ln.hsn_sac):
            problems.append(f"line {ln.line_no}: HSN/SAC '{ln.hsn_sac or 'missing'}' is not 4, 6 or 8 digits")
    if problems:
        return check("lines", "Line items interpreted", "warn", "; ".join(problems[:4]))
    return check("lines", "Line items interpreted", "pass",
                 f"{len(inv.lines)} line items; quantity × rate agrees on every line")


def gst_check(inv: Invoice) -> dict:
    """Recomputes GST line by line and checks the tax heads against the supply type."""
    tol = policies()["tolerances"]["arithmetic_abs"]
    from .invoice_tax_evidence import is_foreign_tax_document, foreign_tax_check
    if is_foreign_tax_document(inv):
        # Foreign invoice tax is not an Indian GST component.
        return foreign_tax_check(inv, tol, check, adjust)
    if inv.is_import:
        return _import_gst_check(inv, tol)
    kind = gst.supply_type(inv.vendor_gstin, inv.place_of_supply, inv.buyer_gstin)
    issues = []

    line_tax = 0.0
    for ln in inv.lines:
        tax = round(ln.taxable_value * ln.tax_rate / 100, 2)
        line_tax += tax
        if kind == "intra":
            ln.cgst = ln.cgst or round(tax / 2, 2)
            ln.sgst = ln.sgst or round(tax / 2, 2)
            ln.igst = 0
        elif kind == "inter":
            ln.igst = ln.igst or tax

    subtotal = round(sum(ln.taxable_value for ln in inv.lines), 2)
    if inv.subtotal and abs(subtotal - inv.subtotal) > max(tol, len(inv.lines) * 0.5):
        issues.append(f"lines sum to {inr(subtotal)} but taxable value printed is {inr(inv.subtotal)}")
    if not inv.subtotal:
        inv.subtotal = subtotal

    printed_tax = round(inv.cgst + inv.sgst + inv.igst, 2)
    if not printed_tax:
        if kind == "inter":
            inv.igst = round(line_tax, 2)
        else:
            inv.cgst = inv.sgst = round(line_tax / 2, 2)
        printed_tax = round(line_tax, 2)
    component_total = round(printed_tax + inv.cess, 2)
    explicit_total = (inv.raw_extraction or {}).get('total_tax') or {}
    total_field = field(inv, 'tax')
    if explicit_total.get('value') is not None and total_field and total_field.value is not None:
        inv.tax_total = parse_amount(total_field.value)
        if abs(inv.tax_total - component_total) > tol:
            issues.append('Printed total tax differs from the sum of GST components')
    else:
        inv.tax_total = component_total

    if abs(printed_tax - line_tax) > max(tol, len(inv.lines) * 0.5):
        issues.append(f"GST recomputes to {inr(line_tax)} against {inr(printed_tax)} printed")
    if kind == "intra" and inv.igst:
        issues.append("IGST charged on an intra-state supply — CGST + SGST expected")
    if kind == "inter" and (inv.cgst or inv.sgst):
        issues.append("CGST + SGST charged on an inter-state supply — IGST expected")
    if inv.cgst and inv.sgst and abs(inv.cgst - inv.sgst) > tol:
        issues.append("CGST and SGST are not equal")

    expected_total = round(inv.subtotal + inv.tax_total + inv.round_off, 2)
    if not inv.total:
        inv.total = expected_total
    elif abs(expected_total - inv.total) > max(tol, abs(inv.round_off) + 1):
        issues.append(f"taxable value + GST = {inr(expected_total)} but total printed is {inr(inv.total)}")

    for key in ("subtotal", "tax", "total"):
        adjust(inv, key, not issues)
    heads = {"intra": "CGST + SGST", "inter": "IGST"}.get(kind, "GST")
    if issues:
        return check("gst", "GST recomputed", "fail", "; ".join(issues), "GST mismatch")
    return check("gst", "GST recomputed", "pass",
                 f"{heads} of {inr(inv.tax_total)} agrees with a line-by-line recomputation")


def _import_gst_check(inv: Invoice, tol: float) -> dict:
    for ln in inv.lines:
        ln.cgst = ln.sgst = ln.igst = 0
    subtotal = round(sum(ln.taxable_value for ln in inv.lines), 2)
    inv.subtotal = inv.subtotal or subtotal
    charged = round(inv.cgst + inv.sgst + inv.igst, 2)
    inv.tax_total = round(charged + inv.cess, 2)
    inv.total = inv.total or round(inv.subtotal + inv.round_off, 2)
    issues = []
    if charged:
        issues.append(f"Indian GST of {inv.tax_total:,.2f} charged by a non-resident supplier")
    if abs(subtotal - inv.subtotal) > max(tol, len(inv.lines) * 0.5):
        issues.append(f"lines sum to {subtotal:,.2f} but taxable value printed is {inv.subtotal:,.2f}")
    if abs(inv.subtotal + inv.tax_total + inv.round_off - inv.total) > max(tol, 1):
        issues.append(f"taxable value does not add up to the invoice total {inv.total:,.2f}")
    for key in ("subtotal", "total"):
        adjust(inv, key, not issues)
    if issues:
        return check("gst", "GST recomputed", "fail", "; ".join(issues), "GST mismatch")
    return check("gst", "GST recomputed", "pass",
                 "Import — no GST on the invoice; IGST and customs duty are paid on the Bill of Entry "
                 "and IGST is claimed as input tax credit")


def tds_check(inv: Invoice) -> dict:
    if inv.is_import:
        inv.tds_section, inv.tds_rate, inv.tds_amount, inv.net_payable = None, 0, 0, inv.total
        return check("tds", "TDS computed", "pass", "Import of goods — no TDS")
    section, rate, amount = gst.expected_tds([(ln.hsn_sac, ln.taxable_value) for ln in inv.lines])
    printed = abs(inv.tds_amount)  # printed as a deduction, often with a minus sign
    tol = policies()["tolerances"]["arithmetic_abs"]
    if section:
        inv.tds_section, inv.tds_rate = section, rate
        if printed and abs(printed - amount) > tol:
            inv.net_payable = round(inv.total - amount, 2)
            status, detail = "warn", (f"Vendor deducted {inr(printed)}; policy gives {inr(amount)} "
                                      f"@{rate:g}% u/s {section} — payable uses the policy figure")
            inv.tds_amount = amount
        else:
            inv.tds_amount = amount
            inv.net_payable = round(inv.total - amount, 2)
            status, detail = "pass", f"TDS {inr(amount)} @{rate:g}% u/s {section} on {inr(amount * 100 / rate)}"
        return check("tds", "TDS computed", status, detail)
    inv.tds_section, inv.tds_rate, inv.tds_amount = None, 0, 0
    inv.net_payable = inv.total
    return check("tds", "TDS computed", "pass", "No TDS — the invoice is predominantly a supply of goods")


async def duplicate_check(db: AsyncSession, inv: Invoice) -> dict:
    number = norm_doc_no(inv.invoice_number)
    if not number:
        return check("duplicate", "Duplicate check", "warn", "No invoice number to check against")

    # Only earlier receipts count: the first copy received is the original, and
    # re-validating it later must not flag it against the copy.
    from .document_context import context
    related = [entry['id'] for entry in context(inv).get('invoices', [])]
    others = (await db.execute(
        select(Invoice.case_id, Invoice.file_sha256, Invoice.vendor_gstin, Invoice.vendor_zoho_id,
               Invoice.invoice_number)
        .where(Invoice.id != inv.id, Invoice.pipeline_state != "error", Invoice.case_id < inv.case_id, Invoice.id.not_in(related))
    )).all()
    for o in others:
        if o.file_sha256 == inv.file_sha256:
            return check("duplicate", "Duplicate check", "fail",
                         f"The same file was already received as {o.case_id}", "Duplicate suspected")
        same_vendor = (gst.clean_gstin(o.vendor_gstin) == gst.clean_gstin(inv.vendor_gstin)
                       or (o.vendor_zoho_id and o.vendor_zoho_id == inv.vendor_zoho_id))
        if same_vendor and norm_doc_no(o.invoice_number) == number:
            return check("duplicate", "Duplicate check", "fail",
                         f"{inv.invoice_number} from this vendor already exists as {o.case_id}", "Duplicate suspected")

    if inv.vendor_zoho_id:
        bills = (await db.execute(select(ZBill).where(ZBill.vendor_zoho_id == inv.vendor_zoho_id))).scalars().all()
        for b in bills:
            if norm_doc_no(b.bill_number) == number:
                return check("duplicate", "Duplicate check", "fail",
                             f"Bill {b.bill_number} is already recorded in Zoho Books", "Duplicate suspected")

    return check("duplicate", "Duplicate check", "pass",
                 f"No match across {len(others) + 1} Command Center documents and Zoho bills")


def date_check(inv: Invoice) -> dict:
    from datetime import date, timedelta

    if not inv.invoice_date:
        return check("date", "Invoice date", "warn", "Invoice date could not be read")
    if inv.invoice_date > date.today() + timedelta(days=1):
        return check("date", "Invoice date", "fail", f"Invoice is dated in the future ({inv.invoice_date})", "Other")
    if inv.invoice_date < date.today() - timedelta(days=365):
        return check("date", "Invoice date", "warn", "Invoice is more than a year old — check ITC time limits")
    return check("date", "Invoice date", "pass", f"Dated {inv.invoice_date:%d %b %Y}")
