"""Additive email intake API. Existing invoice endpoints are unchanged."""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import current_user
from ..services import email_invoice_intake as intake
from .invoices import _schedule

router = APIRouter(prefix="/api/email-intake", tags=["email-intake"])


@router.get("/attachments")
async def attachments(email_id: str | None = None, limit: int = Query(100, ge=1, le=500),
                      offset: int = Query(0, ge=0), user: str = Depends(current_user)):
    return await intake.list_attachments(email_id, limit, offset)


@router.post("/attachments/{attachment_id}/forward")
async def forward(attachment_id: str, user: str = Depends(current_user)):
    try:
        result = await intake.create_case(attachment_id, user)
        if result["outcome"] in ("created", "already_linked"):
            dispatch = await intake.dispatch_case(attachment_id, _schedule)
            outcome = result["outcome"]
            result = {"outcome": outcome, "dispatch": dispatch, **await intake.linked_result(attachment_id)}
        return result
    except intake.IntakeError as error:
        raise HTTPException(error.status, error.code) from None
