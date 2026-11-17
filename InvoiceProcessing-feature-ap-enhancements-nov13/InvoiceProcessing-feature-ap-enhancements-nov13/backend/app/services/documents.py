"""Invoice document storage and page rendering."""

import asyncio
import hashlib
import re
from pathlib import Path

import pymupdf as fitz

from ..config import get_settings

# Magic bytes → (mime type, extension). The declared content type is not trusted.
_SIGNATURES: list[tuple[bytes, str, str]] = [
    (b"%PDF-", "application/pdf", ".pdf"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"II*\x00", "image/tiff", ".tif"),
    (b"MM\x00*", "image/tiff", ".tif"),
]


class DocumentError(ValueError):
    pass


def sniff(content: bytes) -> tuple[str, str]:
    for magic, mime, ext in _SIGNATURES:
        if content.startswith(magic):
            return mime, ext
    raise DocumentError("Unsupported file type — upload a PDF, JPG, PNG or TIFF invoice")


def safe_name(name: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9._ -]", "_", Path(name or "invoice").name).strip(" .") or "invoice"
    return stem[:120]


def store(invoice_id: str, filename: str, content: bytes) -> tuple[Path, str, str, int]:
    """Saves the upload. Returns (path, mime, sha256, page count)."""
    settings = get_settings()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise DocumentError(f"File exceeds the {settings.max_upload_mb} MB limit")
    if not content:
        raise DocumentError("The uploaded file is empty")
    mime, ext = sniff(content)

    folder = settings.storage_dir / invoice_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / ("source" + ext)
    path.write_bytes(content)

    try:
        with fitz.open(path) as doc:
            pages = doc.page_count
    except Exception as e:  # corrupt or encrypted
        raise DocumentError(f"The document could not be opened: {e}") from e
    if pages < 1:
        raise DocumentError("The document has no pages")
    return path, mime, hashlib.sha256(content).hexdigest(), pages


def render_page(path: str | Path, page: int, dpi: int | None = None) -> bytes:
    """PNG bytes for a 1-based page. Rendered once and cached beside the source."""
    dpi = dpi or get_settings().render_dpi
    path = Path(path)
    cached = path.parent / f"page-{page}@{dpi}.png"
    if cached.exists():
        return cached.read_bytes()
    with fitz.open(path) as doc:
        if not 1 <= page <= doc.page_count:
            raise DocumentError(f"Page {page} does not exist")
        png = doc[page - 1].get_pixmap(dpi=dpi).tobytes("png")
    cached.write_bytes(png)
    return png


def render_all(path: str | Path, dpi: int | None = None) -> list[bytes]:
    with fitz.open(path) as doc:
        count = doc.page_count
    return [render_page(path, i, dpi) for i in range(1, count + 1)]


def page_text(path: str | Path) -> list[str]:
    """Embedded text per page — empty for scans. Used as extraction context."""
    try:
        with fitz.open(path) as doc:
            return [p.get_text("text") for p in doc]
    except Exception:
        return []


# ── Async wrappers: PyMuPDF and disk I/O run in worker threads, off the event loop ──


async def astore(invoice_id: str, filename: str, content: bytes) -> tuple[Path, str, str, int]:
    return await asyncio.to_thread(store, invoice_id, filename, content)


async def arender_page(path: str | Path, page: int, dpi: int | None = None) -> bytes:
    return await asyncio.to_thread(render_page, path, page, dpi)


async def arender_all(path: str | Path, dpi: int | None = None) -> list[bytes]:
    return await asyncio.to_thread(render_all, path, dpi)


async def apage_text(path: str | Path) -> list[str]:
    return await asyncio.to_thread(page_text, path)


async def aread(path: str | Path) -> bytes:
    return await asyncio.to_thread(Path(path).read_bytes)
