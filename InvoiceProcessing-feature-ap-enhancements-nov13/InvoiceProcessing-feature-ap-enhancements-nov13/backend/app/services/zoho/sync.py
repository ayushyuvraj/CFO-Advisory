"""Mirrors Zoho Books into the local cache.

The Zoho team maintains vendors, POs and receipts in Zoho; the Command Center
reads them. Sync is idempotent (upsert by Zoho id) and PO detail is fetched only
for POs that are new or modified since the last run, to stay within Zoho's API
limits.

Between full syncs, ``refresh_for_invoice`` re-reads only what one invoice is
checked against — its PO, that PO's receipts, its vendor and any Zoho bill with
the same number — so a receipt recorded in Zoho counts without a "Sync now".
"""

import logging
import time
from functools import lru_cache

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...config import get_settings
from ...models import (
    ConnectorState,
    ZAccount,
    ZBill,
    ZPoLine,
    ZPurchaseOrder,
    ZReceive,
    ZReceiveLine,
    ZRequisition,
    ZTax,
    ZVendor,
)
from ..common import audit, norm_doc_no, now, parse_amount, parse_date
from ..gst import clean_gstin, pan_from_gstin
from .client import ZohoClient, ZohoError
from .mock import MockZohoClient

log = logging.getLogger(__name__)


@lru_cache
def get_client() -> ZohoClient | MockZohoClient:
    s = get_settings()
    return MockZohoClient() if s.zoho_mode == "mock" else ZohoClient(s)


def _label(text: str | None) -> str:
    """Custom field labels are spelt freely in Zoho: "Cost centre", "Cost_Center", "cost-center"."""
    return " ".join(str(text or "").replace("_", " ").replace("-", " ").lower().split())


def _cf(obj: dict, *labels: str) -> str | None:
    """Reads a custom field by label, case-insensitively, accepting synonyms."""
    wanted = {_label(label) for label in labels}
    for f in obj.get("custom_fields") or []:
        if _label(f.get("label")) in wanted and f.get("value") not in (None, ""):
            return str(f["value"]).strip()
    return None


# Labels the Zoho team may have used for the cost centre field.
COST_CENTRE_LABELS = ("cost centre", "cost center", "costcentre", "costcenter")


def _cost_centre_field(fields: list[dict] | None) -> dict | None:
    return next((f for f in fields or [] if _label(f.get("label")) in COST_CENTRE_LABELS), None)


async def _cost_centres(client) -> dict:
    """The cost centre dropdown as configured in Zoho: its values, and the field to write on a bill."""
    try:
        groups = await client.list_custom_fields()
    except ZohoError as e:  # settings scope missing — the app falls back to free text
        log.warning("Custom fields unavailable: %s", e)
        return {}
    po_field = _cost_centre_field(groups.get("purchaseorder"))
    bill_field = _cost_centre_field(groups.get("bill"))
    values = [str(v.get("name", "")).strip() for v in ((po_field or bill_field or {}).get("values") or [])]
    return {"values": [v for v in values if v],
            "bill_field": (bill_field or {}).get("api_name"),
            "po_field": (po_field or {}).get("api_name")}


async def sync_all(db: AsyncSession, actor: str = "connector.zoho") -> dict[str, int]:
    client = get_client()
    settings = get_settings()
    counts: dict[str, int] = {}

    state = await db.get(ConnectorState, "zoho") or ConnectorState(key="zoho")
    db.add(state)

    # Switching between the demo organisation and a real one (or between real
    # organisations): the old mirror must not mix with the new data.
    previous = state.meta or {}
    if previous and (previous.get("mode") != settings.zoho_mode
                     or (settings.zoho_mode == "live" and previous.get("organization_id") != settings.zoho_org_id)):
        for model in (ZReceiveLine, ZReceive, ZPoLine, ZPurchaseOrder, ZBill, ZRequisition, ZTax, ZAccount, ZVendor):
            await db.execute(delete(model))
        log.warning("Zoho source changed (%s → %s) — local mirror cleared", previous.get("mode"), settings.zoho_mode)
        audit(db, actor, f"Zoho source changed to {settings.zoho_mode} organisation {settings.zoho_org_id or ''} "
                         "— local mirror cleared before sync")
        state.meta = None
    state.status = "syncing"
    await db.flush()
    warning: str | None = None

    try:
        counts["vendors"] = await _sync_vendors(db, await client.list_vendors())
        counts["accounts"] = await _sync_accounts(db, await client.list_accounts())
        counts["taxes"] = await _sync_taxes(db, await client.list_taxes())
        try:
            counts["tds_taxes"] = await _sync_taxes(db, await client.list_tds_taxes(), kind="tds")
        except ZohoError as e:  # TDS not enabled for the organisation — bills post without it
            log.warning("TDS taxes unavailable: %s", e)
            counts["tds_taxes"] = 0
        counts["purchase_orders"] = await _sync_pos(db, client)
        if settings.zoho_receives_enabled:
            try:
                counts["receives"] = await _sync_receives(db, client)
                # Real receipts supersede any derived from PO lines by an earlier fallback sync.
                for old in (await db.execute(select(ZReceive).where(ZReceive.zoho_id.like("PORCV-%")))).scalars():
                    await db.delete(old)
            except ZohoError as e:
                # Receives are unavailable without inventory tracking; matching
                # falls back to a 2-way (invoice ↔ PO) match.
                log.warning("Purchase receives unavailable: %s", e)
                counts["receives"] = await _receives_from_po_lines(db)
                warning = (f"Purchase receives API unavailable ({e}) — using received quantities from the PO lines"
                           if counts["receives"] else f"Purchase receives unavailable — 2-way match only ({e})")
        bills = await client.list_bills()
        counts["bills"] = await _sync_bills(db, bills)
        counts["bills_deleted"] = await _purge_deleted_bills(db, {str(b["bill_id"]) for b in bills})
        counts["requisitions"] = await _sync_requisitions(db, await client.list_requisitions())
    except Exception as e:
        state.status = "error"
        state.error = str(e)
        audit(db, actor, f"Zoho Books synchronisation failed: {e}")
        raise

    org = await client.get_organization()
    cost_centres = await _cost_centres(client)
    state.status = "connected"
    state.last_sync_at = now()
    gstin = (org.get("tax_settings") or {}).get("tax_reg_no") or org.get("gst_no")
    state.meta = {"organization": org.get("name"), "organization_id": org.get("organization_id"),
                  "gstin": gstin, "mode": settings.zoho_mode, "counts": counts,
                  "cost_centres": cost_centres}
    state.error = warning
    _recent["sync"] = time.monotonic()
    total = sum(v for k, v in counts.items() if k != "bills_deleted")
    audit(db, actor, f"Zoho Books synchronisation completed — {total} records", counts=counts)
    return counts


async def _sync_vendors(db: AsyncSession, rows: list[dict]) -> int:
    for r in rows:
        await _upsert_vendor(db, r)
    return len(rows)


async def _upsert_vendor(db: AsyncSession, r: dict) -> None:
    gstin = clean_gstin(r.get("gst_no")) or None
    v = await db.get(ZVendor, r["contact_id"]) or ZVendor(zoho_id=r["contact_id"])
    v.name = r.get("contact_name") or r.get("company_name") or ""
    v.gstin = gstin
    v.pan = r.get("pan_no") or pan_from_gstin(gstin)
    v.gst_treatment = r.get("gst_treatment")
    v.state_code = gstin[:2] if gstin else None
    v.payment_terms_days = r.get("payment_terms")
    v.payment_terms_label = r.get("payment_terms_label")
    v.email = r.get("email")
    v.bank_account = _cf(r, "bank account")
    v.tds_section = _cf(r, "tds section")
    v.msme = (_cf(r, "msme") or "").lower() in ("true", "yes", "1") or bool(r.get("msme_type"))
    v.raw = r
    await db.merge(v)


async def _sync_accounts(db: AsyncSession, rows: list[dict]) -> int:
    for r in rows:
        await db.merge(ZAccount(zoho_id=r["account_id"], name=r.get("account_name", ""),
                          code=r.get("account_code"), type=r.get("account_type")))
    return len(rows)


async def _sync_taxes(db: AsyncSession, rows: list[dict], kind: str | None = None) -> int:
    for r in rows:
        k = kind or ("group" if r.get("tax_type") == "tax_group" else (r.get("tax_specific_type") or "igst").lower())
        await db.merge(ZTax(zoho_id=r["tax_id"], name=r.get("tax_name", ""),
                      rate=float(r.get("tax_percentage") or 0), kind=k))
    return len(rows)


async def _sync_pos(db: AsyncSession, client) -> int:
    summaries = await client.list_purchase_orders()
    for s in summaries:
        existing = await db.get(ZPurchaseOrder, s["purchaseorder_id"])
        modified = s.get("last_modified_time")
        if existing and modified and (existing.raw or {}).get("last_modified_time") == modified \
                and (existing.raw or {}).get("_rx"):
            continue
        await _upsert_po(db, await client.get_purchase_order(s["purchaseorder_id"]))
    return len(summaries)


async def _upsert_po(db: AsyncSession, d: dict) -> ZPurchaseOrder:
    """Writes one PO detail (header and lines) into the mirror."""
    po = await db.get(ZPurchaseOrder, d["purchaseorder_id"]) or ZPurchaseOrder(zoho_id=d["purchaseorder_id"])
    po.number = d["purchaseorder_number"]
    po.vendor_zoho_id = d.get("vendor_id")
    po.vendor_name = d.get("vendor_name")
    po.date = parse_date(d.get("date"))
    po.delivery_date = parse_date(d.get("delivery_date"))
    po.status = d.get("status")
    po.currency = d.get("currency_code") or "INR"
    po.total = parse_amount(d.get("total"))
    po.cost_centre = _cf(d, *COST_CENTRE_LABELS)
    po.business_unit = _cf(d, "business unit")
    po.pr_number = _cf(d, "pr number", "requisition", "purchase requisition")
    po.buyer = _cf(d, "buyer")
    po.place_of_supply = d.get("destination_of_supply")
    po.payment_terms_label = d.get("payment_terms_label")
    po.raw = {**{k: v for k, v in d.items() if k != "line_items"}, "_rx": True}
    db.add(po)
    await db.flush()
    items = d.get("line_items", [])
    await db.execute(
        delete(ZPoLine).where(
            ZPoLine.po_zoho_id == po.zoho_id,
            ZPoLine.line_item_id.not_in([li["line_item_id"] for li in items]),
        )
    )
    for i, li in enumerate(items):
        await db.merge(ZPoLine(
            line_item_id=li["line_item_id"], po_zoho_id=po.zoho_id,
            line_no=int(li.get("item_order") or (i + 1) * 10),
            item_name=li.get("name") or li.get("description") or "",
            description=li.get("description"), hsn_sac=li.get("hsn_or_sac"), uom=li.get("unit"),
            quantity=float(li.get("quantity") or 0), quantity_billed=float(li.get("quantity_billed") or 0),
            quantity_received=float(li.get("quantity_received") or 0), item_id=li.get("item_id"),
            rate=float(li.get("rate") or 0), tax_rate=float(li.get("tax_percentage") or 0),
            account_id=li.get("account_id"), account_name=li.get("account_name"),
        ))
    # Sessions disable autoflush. Receipt linking immediately queries these PO
    # lines, so newly loaded lines must be written before that query runs.
    await db.flush()
    return po


async def _receives_from_po_lines(db: AsyncSession) -> int:
    """Receipts derived from each PO line's received quantity (Zoho Books PO detail)."""
    await db.flush()
    for old in (await db.execute(select(ZReceive).where(ZReceive.zoho_id.like("PORCV-%")))).scalars():
        await db.delete(old)
    await db.flush()
    made = 0
    pos = (await db.execute(select(ZPurchaseOrder).execution_options(populate_existing=True))).scalars().all()
    for po in pos:
        received = [pl for pl in po.lines if pl.quantity_received > 0]
        if not received:
            continue
        refs = (po.raw or {}).get("purchasereceives") or []
        rec = ZReceive(
            zoho_id=f"PORCV-{po.zoho_id}",
            number=", ".join(r.get("receive_number", "") for r in refs if r.get("receive_number")) or f"Received on {po.number}",
            po_zoho_id=po.zoho_id,
            date=max((parse_date(r.get("date")) for r in refs if r.get("date")), default=None),
            kind="Goods",
            status=(po.raw or {}).get("received_status") or "received",
            raw={"source": "purchase order line quantity_received", "receives": refs},
        )
        rec.lines = [ZReceiveLine(po_line_item_id=pl.line_item_id, quantity_received=pl.quantity_received,
                                  quantity_accepted=pl.quantity_received) for pl in received]
        db.add(rec)
        made += 1
    return made


async def _sync_receives(db: AsyncSession, client) -> int:
    """Purchase receives (Zoho Inventory). Detail — and its lines — is fetched only for
    receipts that are new or changed since the last sync, to stay inside API limits."""
    summaries = await client.list_purchase_receives()
    await db.flush()
    for s in summaries:
        rid = s.get("purchasereceive_id") or s.get("receive_id")
        if not rid:
            continue
        existing = await db.get(ZReceive, rid)
        modified = s.get("last_modified_time")
        if existing and modified and (existing.raw or {}).get("last_modified_time") == modified                 and (existing.raw or {}).get("_rv"):
            continue
        await _upsert_receive(db, rid, await client.get_purchase_receive(rid), s, existing)
    return len(summaries)


async def _upsert_receive(db: AsyncSession, rid: str, r: dict, s: dict | None = None,
                          existing: ZReceive | None = None) -> None:
    """Writes one receipt detail into the mirror; ``s`` is its list summary (or the PO's reference to it)."""
    s = s or {}
    rec = existing or ZReceive(zoho_id=rid)
    rec.number = (s.get("purchasereceive_number") or r.get("purchasereceive_number") or r.get("receive_number")
                  or s.get("receive_number") or "")
    rec.po_zoho_id = r.get("purchaseorder_id") or s.get("purchaseorder_id")
    rec.date = parse_date(s.get("receive_date") or r.get("receive_date") or r.get("date") or s.get("date"))
    rec.kind = _cf(r, "receipt type") or "Goods"
    rec.status = r.get("received_status") or r.get("status")
    rec.plant = _cf(r, "plant") or r.get("location_name") or s.get("location_name")
    modified = s.get("last_modified_time") or r.get("last_modified_time")
    rec.raw = {**{k: v for k, v in r.items() if k != "line_items"}, "last_modified_time": modified, "_rv": True}
    po_lines = (await db.execute(select(ZPoLine).where(ZPoLine.po_zoho_id == rec.po_zoho_id))).scalars().all()
    if existing is None:
        rec.lines = []
        db.add(rec)
    rec.lines.clear()
    for li in r.get("line_items", []):
        received = float(li.get("quantity") or 0)
        rec.lines.append(ZReceiveLine(
            po_line_item_id=_po_line_for(li, po_lines),
            receive_item_id=li.get("line_item_id"),
            quantity_received=received,
            # Zoho has no acceptance concept; a custom field or quality module
            # can supply it — otherwise accepted equals received.
            quantity_accepted=float(li.get("quantity_accepted", received)),
        ))


def _po_line_for(li: dict, po_lines: list[ZPoLine]) -> str | None:
    """Ties a receipt line to its PO line: explicit PO line reference, then item, then name."""
    explicit = li.get("purchaseorder_item_id") or li.get("po_line_item_id")
    if explicit:
        return explicit
    if li.get("item_id"):
        hit = next((pl for pl in po_lines if pl.item_id and pl.item_id == li["item_id"]), None)
        if hit:
            return hit.line_item_id
    name = " ".join(str(li.get("name") or li.get("description") or "").lower().split())
    hit = next((pl for pl in po_lines if " ".join((pl.item_name or "").lower().split()) == name), None)
    if hit:
        return hit.line_item_id
    return po_lines[0].line_item_id if len(po_lines) == 1 else li.get("line_item_id")


async def _sync_bills(db: AsyncSession, rows: list[dict]) -> int:
    for r in rows:
        await _upsert_bill(db, r)
    return len(rows)


async def _purge_deleted_bills(db: AsyncSession, live_ids: set[str]) -> int:
    """Bills deleted in Zoho leave the mirror too — otherwise they would still count as billed
    and flag re-submitted invoices as duplicates."""
    await db.flush()
    stale = (await db.execute(select(ZBill).where(ZBill.zoho_id.not_in(live_ids or {""})))).scalars().all()
    if not live_ids and stale:
        # An empty list from Zoho beside a populated mirror is more likely a fault than a purge.
        log.warning("Zoho returned no bills; %s mirrored bills kept", len(stale))
        return 0
    for b in stale:
        await db.delete(b)
    if stale:
        log.info("Removed %s bill(s) deleted in Zoho: %s", len(stale), ", ".join(b.bill_number for b in stale))
    return len(stale)


async def _upsert_bill(db: AsyncSession, r: dict) -> None:
    await db.merge(ZBill(
        zoho_id=r["bill_id"], bill_number=r.get("bill_number", ""), vendor_zoho_id=r.get("vendor_id"),
        vendor_name=r.get("vendor_name"), date=parse_date(r.get("date")),
        due_date=parse_date(r.get("due_date")), total=parse_amount(r.get("total")),
        balance=parse_amount(r.get("balance")), status=r.get("status"),
    ))


async def _sync_requisitions(db: AsyncSession, rows: list[dict]) -> int:
    for r in rows:
        await db.merge(ZRequisition(
            pr_number=r["pr_number"], title=r.get("title", ""), raised_by=r.get("raised_by"),
            department=r.get("department"), date=parse_date(r.get("date")), value=parse_amount(r.get("value")),
            approved_by=r.get("approved_by"), approval_route=r.get("approval_route"),
            status=r.get("status"), po_number=r.get("po_number"),
        ))
    return len(rows)


async def is_synced(db: AsyncSession) -> bool:
    return (await db.execute(select(ZVendor.zoho_id).limit(1))).first() is not None


# ── Targeted refresh ─────────────────────────────────────────────────────────

# Keys (PO, bill number, vendor search) read from Zoho recently — repeated
# corrections on one invoice must not spend an API call each.
_recent: dict[str, float] = {}


def _fresh(key: str) -> bool:
    t = _recent.get(key)
    return t is not None and time.monotonic() - t < get_settings().zoho_refresh_ttl_seconds


def _mark(key: str) -> None:
    _recent[key] = time.monotonic()


async def refresh_for_invoice(db: AsyncSession, inv, for_posting: bool = False) -> str | None:
    """Re-reads from Zoho only what this invoice is checked against (typically 2–5 calls).

    For posting, the PO and its receipts are re-read regardless of the recent-read
    window: the bill's receipt allocation must reflect Zoho at that moment.
    Returns a note when Zoho could not be reached — the checks then run on the
    last synchronised data rather than failing.
    """
    if not get_settings().zoho_targeted_refresh or not await is_synced(db):
        return None
    if _fresh("sync") and not for_posting:  # a full sync just ran — the mirror is current
        return None
    client = get_client()
    try:
        po = await _refresh_po(db, client, inv, force=for_posting)
        if not for_posting:
            await _refresh_vendor(db, client, inv, po)
            await _refresh_bills(db, client, inv)
        await db.flush()
    except ZohoError as e:
        log.warning("Targeted Zoho refresh for %s failed: %s", inv.invoice_number, e)
        return f"Could not re-read Zoho Books ({e}) — checked against the data from the last sync"
    return None


async def refresh_po_for(db: AsyncSession, inv) -> str | None:
    """Re-reads the invoice's PO and every one of its receipts — billed ones included, as after
    a bill is deleted in Zoho. Returns a note if Zoho could not be read."""
    try:
        await _refresh_po(db, get_client(), inv, force=True, include_billed=True)
        await db.flush()
    except ZohoError as e:
        log.warning("PO for %s not re-read: %s", inv.invoice_number, e)
        return f"Could not re-read the PO from Zoho ({e}) — its receipts update at the next Sync now"
    return None


async def _refresh_po(db: AsyncSession, client, inv, force: bool, include_billed: bool = False) -> ZPurchaseOrder | None:
    from ..matching import find_po

    ref = norm_doc_no(inv.po_number)
    if not ref:
        return None
    po = await find_po(db, inv)
    key = f"po:{po.zoho_id if po else ref}"
    if _fresh(key) and not force:
        return po
    if po is None:
        # A PO raised in Zoho after the last sync.
        hits = await client.search_purchase_orders(inv.po_number.strip())
        hit = next((h for h in hits if norm_doc_no(h.get("purchaseorder_number")) == ref), None)
        if hit is None:
            _mark(key)
            return None
        po_id = hit["purchaseorder_id"]
    else:
        po_id = po.zoho_id
    d = await client.get_purchase_order(po_id)
    po = await _upsert_po(db, d)
    if get_settings().zoho_receives_enabled and "purchasereceives" in d:
        try:
            await _refresh_receives(db, client, po, d["purchasereceives"] or [], include_billed)
        except ZohoError as e:  # no Inventory scope — the last synced receipts stand
            log.warning("Receipts for %s not refreshed: %s", po.number, e)
    await db.flush()
    _mark(key)
    # Reload so the PO's lines (and the receipts) reflect what was just written.
    return await db.get(ZPurchaseOrder, po.zoho_id, populate_existing=True)


async def _refresh_receives(db: AsyncSession, client, po: ZPurchaseOrder, refs: list[dict],
                            include_billed: bool = False) -> None:
    """The PO's receipts: new ones and those not fully billed are re-read; billed ones cannot change."""
    by_id = {(r.get("purchasereceive_id") or r.get("receive_id")): r for r in refs}
    by_id.pop(None, None)
    if refs and not by_id:  # unrecognised shape — never read it as "no receipts"
        log.warning("PO %s lists receipts without an id — receipts not refreshed", po.number)
        return
    fetched = {}
    for rid, ref in by_id.items():
        existing = await db.get(ZReceive, rid)
        if (not include_billed and existing and (existing.raw or {}).get("_rv")
                and (existing.raw or {}).get("billed_status") == "billed"):
            continue
        fetched[rid] = (await client.get_purchase_receive(rid), ref, existing)
    for rid, (r, ref, existing) in fetched.items():
        await _upsert_receive(db, rid, r, {**ref, "purchaseorder_id": po.zoho_id}, existing)
    # Receipts deleted in Zoho, and receipts derived from PO lines by a fallback sync.
    stale = (await db.execute(select(ZReceive).where(ZReceive.po_zoho_id == po.zoho_id,
                                                     ZReceive.zoho_id.not_in(list(by_id) or [""])))).scalars().all()
    for old in stale:
        if by_id or not old.zoho_id.startswith("PORCV-"):
            await db.delete(old)


async def _refresh_vendor(db: AsyncSession, client, inv, po: ZPurchaseOrder | None) -> None:
    """A vendor created in Zoho after the last sync: via the PO, else by the invoice's vendor name."""
    if po is not None:
        if po.vendor_zoho_id and await db.get(ZVendor, po.vendor_zoho_id) is None:
            await _upsert_vendor(db, await client.get_vendor(po.vendor_zoho_id))
        return
    gstin = clean_gstin(inv.vendor_gstin)
    if gstin and (await db.execute(select(ZVendor.zoho_id).where(ZVendor.gstin == gstin).limit(1))).first():
        return
    name = (inv.vendor_name or "").strip()
    key = f"vendor:{name.lower()}"
    if not name or _fresh(key):
        return
    for r in await client.search_vendors(name):
        await _upsert_vendor(db, r)
    _mark(key)


async def _refresh_bills(db: AsyncSession, client, inv) -> None:
    """Bills in Zoho with this invoice's number — the duplicate check must see them."""
    number = (inv.invoice_number or "").strip()
    key = f"bill:{number.lower()}"
    if not number or _fresh(key):
        return
    for r in await client.find_bills(number):
        await _upsert_bill(db, r)
    _mark(key)


async def read_back_bill(db: AsyncSession, inv, with_po: bool = True) -> str | None:
    """After the app writes to Zoho (a bill, a payment), reads back what that changed — so
    the mirror matches Zoho at once, without a "Sync now".

    The PO (with its receipts) is read before the bill: once the bill is in the mirror the
    app stops counting the posted quantity itself, so Zoho's billed quantity must already
    include it. Returns a note if Zoho could not be read — the posting itself stands.
    """
    if not inv.zoho_bill_id:
        return None
    client = get_client()
    try:
        if with_po and inv.po_number:
            await _refresh_po(db, client, inv, force=True)
        await _upsert_bill(db, await client.get_bill(inv.zoho_bill_id))
        await db.flush()
    except ZohoError as e:
        log.warning("Read-back of bill %s failed: %s", inv.zoho_bill_id, e)
        return f"Could not read the bill back from Zoho ({e}) — the local copy updates at the next Sync now"
    return None
