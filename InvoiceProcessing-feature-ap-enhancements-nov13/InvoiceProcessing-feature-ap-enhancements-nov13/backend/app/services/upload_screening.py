"""Content-based screening before a bulk invoice case is created.

Reuse the email classifier and its eligibility policy. Images are converted to
PDF in memory for classification only; stored invoice sources remain unchanged.
"""
import asyncio
import hashlib
from types import SimpleNamespace

import pymupdf
from fastapi import HTTPException

from ..config import get_settings
from . import document_classification as classifier, documents
from .email_invoice_intake import eligibility


def _pdf_payload(content):
    limit = get_settings().max_upload_mb * 1024 * 1024
    if not content or len(content) > limit:
        raise HTTPException(422, f"Select a non-empty document up to {get_settings().max_upload_mb} MB.")
    try:
        mime, extension = documents.sniff(content)
        with pymupdf.open(stream=content, filetype=extension.lstrip(".")) as doc:
            if doc.is_encrypted or doc.page_count < 1:
                raise ValueError("Unreadable")
            pdf = content if mime == "application/pdf" else doc.convert_to_pdf()
        if len(pdf) > limit:
            raise HTTPException(422, "Document is too large for screening after conversion. Use a smaller file.")
        with pymupdf.open(stream=pdf, filetype="pdf") as doc:
            text = "\n".join(page.get_text() for page in doc)
        return pdf, text
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Document could not be read. Use a valid, unencrypted PDF, JPG, PNG or TIFF.") from None


async def screen_upload(content: bytes, filename: str):
    pdf, text = await asyncio.to_thread(_pdf_payload, content)
    try:
        answer = await classifier.gemini_classification("", "", filename, text, pdf)
        decision = classifier.finalise(answer, hashlib.sha256(content).hexdigest())
    except Exception as error:
        # Fixed diagnostic labels only; never return provider payloads or secrets.
        raise HTTPException(503, classifier.safe_error(error, "gemini_classification")) from None
    allowed, _ = eligibility(SimpleNamespace(document_type=decision["document_type"],
                                             extracted_information={"classification": decision}))
    if allowed:
        return {"outcome": "invoice", "decision": decision}
    uncertain = decision.get("document_needs_review") is not False or decision["document_type"] == "Invoice"
    outcome = "needs_review" if uncertain else "not_invoice"
    kind = decision["document_type"]
    return {"outcome": outcome, "documentType": kind,
            "message": ("Could not confidently confirm an invoice. No invoice case created. Review the original file or check classification again."
                        if uncertain else f"Identified as {kind}. Invoice processing skipped; no invoice case created.")}
