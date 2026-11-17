"""Stable IDs make an explicitly retried upload safe without a new DB table."""
import hashlib
from uuid import UUID

from fastapi import HTTPException


def upload_invoice_id(actor: str, request_id: str) -> str:
    try:
        token = str(UUID(request_id))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(422, "Invalid upload request ID") from None
    return hashlib.sha256(("invoice-upload-v1:" + actor + ":" + token).encode()).hexdigest()[:32]


def verify_upload(inv, content: bytes, actor: str) -> None:
    if inv.uploaded_by != actor or inv.file_sha256 != hashlib.sha256(content).hexdigest():
        raise HTTPException(409, "This upload request ID belongs to different content. Select the file again.")
