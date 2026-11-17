"""Writes an approved invoice to Zoho Books as a Bill, with the source PDF attached."""

import re
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import ConnectorState, Invoice, ZAccount, ZPoLine, ZReceive, ZTax
from . import documents, gst
from .common import activity, audit
from .matching import arrived
from .zoho.client import ZohoError
from .zoho.sync import get_client


class PostingError(RuntimeError):
    pass


async def _tax_id(db: AsyncSession, rate: float, intra: bool) -> str | None:
    if not rate:
        return None
    kind = "group" if intra else "igst"
    tax = (await db.execute(select(ZTax).where(ZTax.rate == rate, ZTax.kind == kind))).scalars().first()
    if tax is None:
        raise PostingError(f"No {'GST' if intra else 'IGST'} {rate:g}% tax is configured in Zoho Books")
    return tax.zoho_id


async def _account_id(db: AsyncSession, po_line: ZPoLine | None) -> str:
    if po_line and po_line.account_id:
        return po_line.account_id
    s = get_settings()
    if s.zoho_default_expense_account_id:
        return s.zoho_default_expense_account_id
    acct = (await db.execute(select(ZAccount).where(ZAccount.type == "expense"))).scalars().first()
    if acct is None:
        raise PostingError("No expense account to post to — set ZOHO_DEFAULT_EXPENSE_ACCOUNT_ID")
    return acct.zoho_id


async def _tds_tax_id(db: AsyncSession, section: str | None, rate: float) -> str | None:
    """The Zoho TDS code for this section and rate — by section in the name when possible, else by rate."""
    if not rate:
        return None
    codes = (await db.execute(select(ZTax).where(ZTax.kind == "tds", ZTax.rate == rate))).scalars().all()
    if section:
        named = [t for t in codes if section.lower() in (t.name or "").lower()]
        if named:
            return named[0].zoho_id
    return codes[0].zoho_id if codes else None


async def _receipt_allocation(db: AsyncSession, pl: ZPoLine, quantity: float) -> list[dict]:
    receives = (await db.execute(
        select(ZReceive).where(ZReceive.po_zoho_id == pl.po_zoho_id, ZReceive.zoho_id.not_like("PORCV-%"))
        .order_by(ZReceive.date)
    )).scalars().all()
    out, left = [], quantity
    for rec in receives:
        if (rec.raw or {}).get("billed_status") == "billed" or not arrived(rec):
            continue
        for rl in rec.lines:
            if left <= 0:
                break
            if rl.po_line_item_id == pl.line_item_id and rl.receive_item_id and rl.quantity_received > 0:
                take = min(left, rl.quantity_received)
                out.append({"receive_item_id": rl.receive_item_id, "quantity": take})
                left -= take
    return out


async def build_bill(db: AsyncSession, inv: Invoice, warnings: list[str] | None = None) -> dict:
    if not inv.vendor_zoho_id:
        raise PostingError("The vendor is not in the Zoho vendor master")
    intra = gst.supply_type(inv.vendor_gstin, inv.place_of_supply, inv.buyer_gstin) == "intra"
    po = (inv.match_result or {}).get("po")
    tds_id = await _tds_tax_id(db, inv.tds_section, inv.tds_rate) if inv.tds_amount else None
    if inv.tds_amount and not tds_id and warnings is not None:
        warnings.append(f"No Zoho TDS tax code for {inv.tds_rate:g}% u/s {inv.tds_section} — bill posted gross; "
                        "configure the TDS tax in Zoho so the bill balance nets off")
    lines = []
    for ln in inv.lines:
        pl = await db.get(ZPoLine, ln.po_line_item_id) if ln.po_line_item_id else None
        item = {
            "account_id": await _account_id(db, pl),
            "description": ln.description,
            "quantity": ln.quantity,
            "rate": ln.rate,
            "hsn_or_sac": ln.hsn_sac,
            "tax_id": await _tax_id(db, ln.tax_rate, intra),
        }
        if pl:
            item["purchaseorder_item_id"] = pl.line_item_id
            # The item ties the billed quantity back to what Zoho Inventory received.
            item["item_id"] = pl.item_id
            # Zoho refuses a bill against a PO that has un-billed receipts unless the
            # bill cites them: allocate this line across those receipts, oldest first.
            received = await _receipt_allocation(db, pl, ln.quantity)
            if received:
                item["receive_line_items"] = received
        if tds_id and gst.is_sac(ln.hsn_sac):
            item["tds_tax_id"] = tds_id
        lines.append({k: v for k, v in item.items() if v not in (None, "")})

    payload = {
        "vendor_id": inv.vendor_zoho_id,
        "bill_number": inv.invoice_number,
        "date": inv.invoice_date.isoformat() if inv.invoice_date else None,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "reference_number": inv.po_number or inv.txn_id,
        "gst_treatment": "overseas" if inv.is_import else "business_gst",
        "gst_no": None if inv.is_import else inv.vendor_gstin,
        "source_of_supply": None if inv.is_import else gst.zoho_state(inv.vendor_gstin),
        "exchange_rate": inv.fx_rate if inv.currency != "INR" else None,
        "destination_of_supply": gst.zoho_state(inv.place_of_supply) or gst.zoho_state(inv.buyer_gstin),
        "is_inclusive_tax": False,
        "adjustment": inv.round_off or None,
        "adjustment_description": "Round off" if inv.round_off else None,
        "line_items": lines,
    }
    if po:
        payload["purchaseorder_ids"] = [po["zoho_id"]]
    # The cost centre, if Zoho has that custom field on bills.
    state = await db.get(ConnectorState, "zoho")
    field = ((state.meta or {}).get("cost_centres") or {}).get("bill_field") if state else None
    if field and inv.cost_centre:
        payload["custom_fields"] = [{"api_name": field, "value": inv.cost_centre}]
    return {k: v for k, v in payload.items() if v not in (None, "")}


# Fields Zoho must accept — never dropped. Anything else Zoho rejects as an
# "Invalid Element" is optional enrichment: removed, retried, and recorded.
ESSENTIAL = {"vendor_id", "bill_number", "date", "line_items", "account_id", "quantity", "rate",
             "receive_line_items", "receive_item_id", "purchaseorder_item_id"}
INVALID_ELEMENT = re.compile(r"Invalid Element\s+([A-Za-z_]+)")


async def create_bill_tolerant(client, payload: dict, warnings: list[str], attempts: int = 6) -> dict:
    for _ in range(attempts):
        try:
            return await client.create_bill(payload)
        except ZohoError as e:
            m = INVALID_ELEMENT.search(str(e))
            field_name = m.group(1) if m else None
            if not field_name or field_name in ESSENTIAL:
                raise
            removed = payload.pop(field_name, None) is not None
            for li in payload.get("line_items", []):
                removed = (li.pop(field_name, None) is not None) or removed
            if not removed:
                raise
            warnings.append(f"Zoho rejected the bill field '{field_name}' for this organisation — posted without it")
    raise ZohoError("Zoho kept rejecting bill fields — see the audit trail")


async def post_bill(db: AsyncSession, inv: Invoice) -> str:
    settings = get_settings()
    if settings.zoho_mode == "live" and not settings.zoho_write_bills:
        return ""
    client = get_client()
    warnings: list[str] = []
    bill = await create_bill_tolerant(client, await build_bill(db, inv, warnings), warnings)
    bill_id = str(bill["bill_id"])
    for w in warnings:
        audit(db, "zoho_posting", w, inv)
        activity(db, inv, w, "⚠")
    path = Path(inv.file_path)
    if path.exists():
        await client.attach_to_bill(bill_id, inv.file_name, await documents.aread(path), inv.mime_type)
    return bill_id
