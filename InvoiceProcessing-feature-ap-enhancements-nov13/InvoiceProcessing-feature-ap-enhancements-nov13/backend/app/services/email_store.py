"""Step 4 local PostgreSQL import. Run from backend: python -m app.services.email_store"""

import asyncio
import hashlib
from datetime import datetime
from email import policy
from .email_formats import parse_email_bytes, email_identity
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select, text

from ..config import get_settings
from ..db import engine, session_scope
from ..models import Email, EmailAttachment
from . import email_reader


def require_local_postgres(url):
    # Refuse accidental use of the existing cloud database.
    if (url.get_backend_name() != "postgresql"
            or url.host not in {"localhost", "127.0.0.1", "::1"}
            or any(k in url.query for k in ("host", "hostaddr", "service"))):
        raise RuntimeError("Step 4 requires a local PostgreSQL connection")


def require_email_postgres(url):
    """Allow only PostgreSQL; remote/socket connections require explicit opt-in.

    Uses the application's existing DATABASE_URL, never a separate cloud connection.
    The strict local-only helper remains available for existing callers.
    """
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("Email processing requires PostgreSQL")
    if not get_settings().email_allow_cloud_db:
        require_local_postgres(url)


async def import_email(path):
    require_email_postgres(engine.url)
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    msg = parse_email_bytes(raw, path.suffix)
    identity = email_identity(raw, msg, path.suffix)
    email_id = str(uuid5(NAMESPACE_URL, identity))
    async with session_scope() as db:
        # Serialize this local importer across processes, including folder choices.
        await db.execute(text("SELECT pg_advisory_xact_lock(49201864001)"))
        existing = await db.get(Email, email_id)
        if existing is not None:
            if existing.source_sha256 != digest:
                raise ValueError("Email ID already exists with different source content")
            return "already stored", len(existing.attachments)

        # Let the reader calculate the original subject/timestamp path, without
        # changing its ID rules. Folder ownership is checked before any writes.
        from email.utils import parsedate_to_datetime
        from datetime import timezone
        try:
            received = parsedate_to_datetime(str(msg.get("Date", "")))
            if received is None:
                raise ValueError("Missing date")
            if received.tzinfo is None:
                received = received.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError, IndexError):
            received = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
        folder = email_reader.OUTPUT_DIR / (
            f"{email_reader.safe_name(str(msg.get('Subject') or 'No Subject'))}_"
            f"{received.strftime('%Y%m%d_%H%M%S')}"
        )
        folder = folder.resolve()
        owner = await db.scalar(select(Email.email_id).where(Email.folder_path == str(folder)))
        if owner is not None:
            folder = folder.with_name(f"{folder.name}_{email_id}")
        # Existing Step 2/3 files may be reused only if every existing file
        # matches this email's expected filename and bytes.
        data = email_reader.process_email(path, folder_path=folder, reuse_existing=True)
        if data["email_id"] != email_id or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("Email source changed during import; retry with an unchanged file")
        attachments = data.pop("attachments")
        data["received_datetime"] = datetime.fromisoformat(data["received_datetime"])
        data["source_sha256"] = digest
        record = Email(**data)
        record.attachments = [EmailAttachment(**attachment) for attachment in attachments]
        db.add(record)
        # session_scope commits parent and children together; any failure rolls
        # back database rows. Files remain available for a validated retry.
    return "stored", len(attachments)


async def main():
    try:
        require_email_postgres(engine.url)
        async with engine.begin() as conn:
            # Create ONLY the two new tables. Do not run legacy ALTER statements.
            await conn.run_sync(lambda sync: Email.metadata.create_all(
                sync, tables=[Email.__table__, EmailAttachment.__table__]
            ))
        files = sorted(p for p in email_reader.INPUT_DIR.iterdir() if p.is_file() and p.suffix.lower() in (".eml", ".msg")) if email_reader.INPUT_DIR.exists() else []
        if not files:
            print("No .eml or .msg files found in backend/test_emails")
        for index, path in enumerate(files, 1):
            try:
                status, count = await import_email(path)
                print(f"Email {index}: {status}; {count} PDF attachment(s)")
            except Exception:
                # Do not echo credentials, message contents, or SQL parameters.
                raise RuntimeError(f"Email {index} failed; import stopped") from None
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
