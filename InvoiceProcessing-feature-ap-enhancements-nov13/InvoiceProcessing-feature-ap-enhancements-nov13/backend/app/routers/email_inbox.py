"""New UI-only upload and read endpoints, separate from original invoice APIs."""
from contextlib import asynccontextmanager
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from ..config import get_settings
from ..deps import current_user
from ..services import email_inbox


@asynccontextmanager
async def lifespan(app):
    await email_inbox.start()
    try:
        yield
    finally:
        await email_inbox.stop()


router = APIRouter(prefix="/api/email-inbox", tags=["email-inbox"], lifespan=lifespan)


@router.get("/limits")
async def limits(user: str = Depends(current_user)):
    return {"max_email_bytes": get_settings().max_upload_mb * 1024 * 1024}


@router.post("/upload", status_code=202)
async def upload(file: UploadFile = File(...), user: str = Depends(current_user)):
    limit = get_settings().max_upload_mb * 1024 * 1024
    raw = await file.read(limit+1)
    await file.close()
    if len(raw) > limit:
        raise HTTPException(413, f"Email file exceeds {get_settings().max_upload_mb} MB.")
    try:
        return await email_inbox.accept_upload(raw, file.filename or "", user)
    except email_inbox.EmailUiError as error:
        raise HTTPException(error.status, error.code) from None


@router.get("/emails")
async def emails(q: str = Query("", max_length=300), limit: int = Query(20, ge=1, le=100),
                 offset: int = Query(0, ge=0), user: str = Depends(current_user)):
    return await email_inbox.list_emails(q, limit, offset)


@router.get("/emails/{email_id}")
async def detail(email_id: str, user: str = Depends(current_user)):
    try:
        return await email_inbox.email_detail(email_id)
    except email_inbox.EmailUiError as error:
        raise HTTPException(error.status, error.code) from None


@router.post("/emails/{email_id}/retry", status_code=202)
async def retry(email_id: str, user: str = Depends(current_user)):
    try:
        return await email_inbox.retry(email_id, user)
    except email_inbox.EmailUiError as error:
        raise HTTPException(error.status, error.code) from None


@router.get("/attachments/{attachment_id}/pdf")
async def pdf(attachment_id: str, user: str = Depends(current_user)):
    try:
        path, filename = await email_inbox.pdf_location(attachment_id)
        return FileResponse(path, media_type="application/pdf", filename=filename, content_disposition_type="inline",
                            headers={"X-Content-Type-Options":"nosniff", "Cache-Control":"private, no-store"})
    except email_inbox.EmailUiError as error:
        raise HTTPException(error.status, error.code) from None
