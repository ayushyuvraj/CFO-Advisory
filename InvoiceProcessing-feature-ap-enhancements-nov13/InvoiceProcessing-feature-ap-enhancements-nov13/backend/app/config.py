"""Runtime settings, read from environment variables or backend/.env."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            BACKEND_DIR / ".env",
            BACKEND_DIR.parent / ".env",
            BACKEND_DIR.parent.parent / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    org_name: str = "GENSTAR NETWORK SOLUTIONS PVT. LTD."
    default_user: str = "s.joshi@genstar-demo.in"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'fcc.db').as_posix()}"
    storage_dir: Path = BACKEND_DIR / "data" / "documents"
    # Email intake only. Defaults preserve the existing laptop folders and DB guard.
    email_allow_cloud_db: bool = False
    email_raw_dir: Path | None = None  # None uses test_emails/ui_uploads.
    email_attachment_dir: Path = BACKEND_DIR / "email_attachments"
    policies_file: Path = BACKEND_DIR / "policies.json"
    max_upload_mb: int = 20
    # Process uploads in the background (False runs inline — used by tests).
    async_processing: bool = True
    # How many invoices Gemini reads at once. Validation and matching still run
    # one at a time, in the order invoices were received.
    extraction_concurrency: int = 4
    db_pool_size: int = 10
    db_max_overflow: int = 10
    # Seconds to let in-flight invoices finish on shutdown (Cloud Run allows 10 s after SIGTERM).
    shutdown_grace_seconds: float = 8

    # ── Gemini ───────────────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    # Page render resolution sent to the model. 150 dpi reads dense invoices well.
    render_dpi: int = 150
    # A second, independent extraction pass to cross-check low-confidence fields.
    extraction_second_pass: bool = False

    # ── Zoho Books ───────────────────────────────────────────────────────────
    # "mock" serves a seeded demo organisation so the app runs without credentials.
    zoho_mode: Literal["mock", "live"] = "mock"
    zoho_org_id: str = ""
    zoho_client_id: str = ""
    zoho_client_secret: str = ""
    zoho_refresh_token: str = ""
    zoho_accounts_url: str = "https://accounts.zoho.in"
    zoho_api_url: str = "https://www.zohoapis.in/books/v3"
    # Purchase receives live in the Zoho Inventory API (same organisation ID).
    zoho_inventory_api_url: str = "https://www.zohoapis.in/inventory/v1"
    # Purchase receives exist only when inventory tracking is enabled in Zoho.
    zoho_receives_enabled: bool = True
    # Sync Zoho into the local cache on startup.
    zoho_sync_on_startup: bool = True
    # Before checking or posting an invoice, re-read just its PO, receipts, vendor
    # and same-numbered bills from Zoho (no "Sync now" needed after a receipt).
    zoho_targeted_refresh: bool = True
    # A PO / bill number read within this window is not read again.
    zoho_refresh_ttl_seconds: int = 60
    # Write approved invoices back to Zoho as Bills (live mode only).
    zoho_write_bills: bool = True
    zoho_default_expense_account_id: str = ""
    zoho_paid_through_account_id: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
