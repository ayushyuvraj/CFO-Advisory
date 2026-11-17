"""Payments, analytics, registers, connectors, audit and configuration."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_db
from ..deps import current_user
from ..models import ConnectorState, Payment
from ..schemas import ConfirmPaymentIn
from ..services import insights, payments, serializers
from ..services.common import fmt_dt, policies
from ..services.pipeline import PIPELINE_STEPS
from ..services.zoho.client import ZohoError
from ..services.zoho.sync import get_client, sync_all

router = APIRouter(prefix="/api")


# ── Payments ─────────────────────────────────────────────────────────────────


@router.get("/payments", tags=["payments"], summary="Payment pipeline")
async def list_payments(status: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Payment).order_by(Payment.id.desc())
    if status:
        stmt = stmt.where(Payment.status == status)
    rows = [serializers.payment_row(p) for p in (await db.execute(stmt)).scalars()]
    return {"items": rows,
            "kpis": {"proposed": sum(r["amount"] for r in rows if r["status"] == "proposed"),
                     "released": sum(r["amount"] for r in rows if r["status"] == "released"),
                     "confirmed": sum(r["amount"] for r in rows if r["status"] == "confirmed")}}


async def _payment(db: AsyncSession, payment_id: int) -> Payment:
    p = await db.get(Payment, payment_id)
    if p is None:
        raise HTTPException(404, "Payment not found")
    return p


@router.post("/payments/{payment_id}/release", tags=["payments"], summary="Treasury release (two-person rule)")
async def release(payment_id: int, db: AsyncSession = Depends(get_db), user: str = Depends(current_user)):
    p = await _payment(db, payment_id)
    try:
        payments.release(db, p, user)
    except payments.PaymentError as e:
        raise HTTPException(409, str(e))
    await db.commit()
    return serializers.payment_row(p)


@router.post("/payments/{payment_id}/confirm", tags=["payments"],
             summary="Record the bank UTR; the vendor payment is written to Zoho Books")
async def confirm(payment_id: int, body: ConfirmPaymentIn, db: AsyncSession = Depends(get_db),
            user: str = Depends(current_user)):
    p = await _payment(db, payment_id)
    try:
        await payments.confirm(db, p, body.utr, user)
    except payments.PaymentError as e:
        raise HTTPException(409, str(e))
    await db.commit()
    return serializers.payment_row(p)


# ── Analytics ────────────────────────────────────────────────────────────────


@router.get("/dashboard", tags=["analytics"], summary="Command Center KPIs, attention items and insights")
async def dashboard(persona: Literal["CFO", "AP Lead", "Finance Controller", "Finance User"] = "AP Lead",
              db: AsyncSession = Depends(get_db)):
    return await insights.dashboard(db, persona)


@router.get("/reconciliation", tags=["analytics"])
async def reconciliation(db: AsyncSession = Depends(get_db)):
    return await insights.reconciliation(db)


@router.get("/registers/purchase-orders", tags=["registers"])
async def po_register(db: AsyncSession = Depends(get_db)):
    return await insights.po_register(db)


@router.get("/registers/receipts", tags=["registers"])
async def grn_register(db: AsyncSession = Depends(get_db)):
    return await insights.grn_register(db)


@router.get("/registers/purchase-orders/{po_number}/requisition", tags=["registers"],
            summary="Drill back from a PO to the requisition that raised it")
async def requisition(po_number: str, db: AsyncSession = Depends(get_db)):
    out = await insights.requisition(db, po_number)
    if not out:
        raise HTTPException(404, "Purchase order not found")
    return out


@router.get("/audit", tags=["audit"], summary="Audit trail, newest first")
async def audit_trail(limit: int = 200, db: AsyncSession = Depends(get_db)):
    return await serializers.audit_rows(db, limit=min(limit, 1000))


# ── Connectors ───────────────────────────────────────────────────────────────


@router.get("/connectors", tags=["connectors"])
async def connectors(db: AsyncSession = Depends(get_db)):
    s = get_settings()
    zoho = await db.get(ConnectorState, "zoho")
    return [
        {"key": "zoho", "name": "Zoho Books", "category": "Procurement, workflow & books",
         "mode": s.zoho_mode, "status": zoho.status if zoho else "available",
         "lastSync": fmt_dt(zoho.last_sync_at) if zoho and zoho.last_sync_at else None,
         "meta": (zoho.meta or {}) if zoho else {}, "warning": zoho.error if zoho else None,
         "objects": "Vendors · Purchase orders · Purchase receives · Bills · Chart of accounts · Taxes"},
        {"key": "upload", "name": "Manual upload", "category": "Invoice intake", "status": "connected"},
        {"key": "gemini", "name": "Gemini document intelligence", "category": "Extraction",
         "status": "connected" if s.gemini_api_key else "not_configured", "model": s.gemini_model},
    ]


@router.post("/connectors/zoho/test", tags=["connectors"], summary="Verify Zoho credentials")
async def zoho_test():
    try:
        org = await get_client().get_organization()
    except ZohoError as e:
        raise HTTPException(502, str(e))
    return {"ok": True, "organization": org.get("name"), "organizationId": org.get("organization_id")}


@router.post("/connectors/zoho/sync", tags=["connectors"], summary="Pull vendors, POs, receipts and bills from Zoho")
async def zoho_sync(db: AsyncSession = Depends(get_db), user: str = Depends(current_user)):
    try:
        counts = await sync_all(db, actor=f"connector.zoho ({user})")
    except ZohoError as e:
        await db.commit()  # keep the error state and audit entry
        raise HTTPException(502, str(e))
    await db.commit()
    from ..services.decisions import bills_deleted_in_zoho
    from ..services.pipeline import revalidate_open_exceptions

    returned = await bills_deleted_in_zoho(db, actor=f"connector.zoho ({user})")
    await db.commit()
    rechecked = await revalidate_open_exceptions(db, actor=f"connector.zoho ({user})")
    await db.commit()
    return {"ok": True, "counts": counts, "revalidated": rechecked, "billsDeleted": returned}


# ── Config ───────────────────────────────────────────────────────────────────


@router.get("/config", tags=["system"], summary="Reference data the UI needs")
async def config(db: AsyncSession = Depends(get_db)):
    s = get_settings()
    p = policies()
    return {
        "orgName": s.org_name,
        "mailbox": p["organisation"]["mailbox"],
        "defaultUser": s.default_user,
        "pipelineSteps": PIPELINE_STEPS,
        "costCentres": ((await db.get(ConnectorState, "zoho") or ConnectorState()).meta or {})
                       .get("cost_centres", {}).get("values", []),
        "parkReasons": p["park_reasons"],
        "correctionReasons": p["correction_reasons"],
        "processingStatuses": ["Received", "In Progress", "Validation Required", "Exception", "Awaiting Approval",
                               "Approved", "Posted", "Paid", "Parked", "Clarification Requested", "Failed"],
        "exceptionTypes": ["Missing PO", "Price variance", "Quantity variance", "GST mismatch",
                           "Duplicate suspected", "Vendor mismatch", "Line not on PO", "Other"],
        "users": [{"email": lvl["email"], "name": lvl["name"].split(" · ")[0], "role": lvl["role"]}
                  for lvl in p["doa"]["levels"]] + [p["payments"]["treasury"]],
        "tolerances": p["tolerances"],
        "doa": p["doa"],
        "maxUploadMb": s.max_upload_mb,
    }


@router.get("/health", tags=["system"])
async def health():
    s = get_settings()
    return {"ok": True, "zohoMode": s.zoho_mode, "gemini": bool(s.gemini_api_key)}
