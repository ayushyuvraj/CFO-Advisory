"""Finance Command Center — API.

Run:  uvicorn app.main:app --reload --port 8000   (from backend/)
Docs: http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db, session_scope
from .routers import invoices, operations
from .routers import email_intake
from .routers import email_inbox
from .services.zoho.client import ZohoError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
log = logging.getLogger("fcc")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from .db import engine
    from .services import decisions, pipeline
    from .services.zoho.sync import get_client, sync_all

    settings = get_settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    if settings.zoho_sync_on_startup:
        try:
            async with session_scope() as db:
                counts = await sync_all(db, actor="connector.zoho (startup)")
                await db.commit()
                await decisions.bills_deleted_in_zoho(db, actor="connector.zoho (startup)")
                await db.commit()
                await pipeline.revalidate_open_exceptions(db, actor="connector.zoho (startup)")
            log.info("Zoho Books (%s) synchronised: %s", settings.zoho_mode, counts)
        except Exception as e:  # the API still serves; the connector shows the error
            log.error("Zoho sync on startup failed: %s", e)
    if settings.async_processing and (n := await pipeline.requeue_interrupted()):
        log.info("Re-queued %s interrupted invoice(s)", n)
    if not settings.gemini_api_key:
        log.warning("GEMINI_API_KEY is not set — uploads will fail at extraction")

    yield

    # Graceful shutdown (Cloud Run sends SIGTERM): finish in-flight invoices where
    # possible; anything cut off stays queued/running and is re-queued on next start.
    await pipeline.scheduler().drain(timeout=settings.shutdown_grace_seconds)
    await get_client().aclose()
    await engine.dispose()


app = FastAPI(
    title="Finance Command Center API",
    version="1.0.0",
    description="AI-native accounts payable over Zoho Books: intake → extraction → validation → match → "
                "approval → posting → payment → reconciliation.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-User"],
)
app.include_router(invoices.router)
app.include_router(operations.router)
app.include_router(email_intake.router)
app.include_router(email_inbox.router)


@app.exception_handler(ZohoError)
async def zoho_error(_: Request, exc: ZohoError) -> JSONResponse:
    # The transaction is not committed, so the invoice stays exactly as it was.
    return JSONResponse(status_code=502, content={"detail": f"Zoho Books: {exc}"})
