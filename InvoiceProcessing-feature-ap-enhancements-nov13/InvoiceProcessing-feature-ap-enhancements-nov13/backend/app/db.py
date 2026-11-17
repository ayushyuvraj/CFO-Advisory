"""Async database engine and sessions (asyncpg for PostgreSQL / Cloud SQL, aiosqlite locally)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings


class Base(DeclarativeBase):
    pass


def normalise_url(url: str) -> str:
    """Any Postgres URL form uses asyncpg; SQLite uses aiosqlite."""
    for prefix in ("postgresql+psycopg://", "postgresql+psycopg2://", "postgresql+asyncpg://",
                   "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url[len(prefix):]
    if url.startswith("sqlite:///"):
        return "sqlite+aiosqlite:///" + url[len("sqlite:///"):]
    return url


def _make_engine(url: str):
    url = normalise_url(url)
    if url.startswith("sqlite"):
        Path(url.split("///", 1)[1]).parent.mkdir(parents=True, exist_ok=True)
        engine = create_async_engine(url, connect_args={"timeout": 30})

        @event.listens_for(engine.sync_engine, "connect")
        def _pragma(conn, _):
            cur = conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.execute("PRAGMA journal_mode=WAL")
            cur.close()

        return engine
    s = get_settings()
    return create_async_engine(url, pool_size=s.db_pool_size, max_overflow=s.db_max_overflow,
                               pool_pre_ping=True, pool_recycle=1800)


engine = _make_engine(get_settings().database_url)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


async def init_db() -> None:
    from . import models, email_invoice_models, email_upload_models  # noqa: F401 — registers tables

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_check_email_parts_schema)
        await conn.run_sync(_add_missing_columns)


def _check_email_parts_schema(sync_conn):
    from sqlalchemy import inspect
    inspector = inspect(sync_conn)
    if inspector.get_pk_constraint('email_invoice_links')['constrained_columns'] != ['attachment_id', 'part_index']:
        raise RuntimeError('Email invoice links require migration. Stop the backend and run: python scripts/migrate_email_parts.py --apply. Back up the database first. Cloud SQL users may run the supplied migration SQL before deploying.')


# (table, column, DDL type) added after the first release.
_ADDED_COLUMNS = [
    ("z_po_lines", "quantity_received", "FLOAT DEFAULT 0"),
    ("z_po_lines", "item_id", "VARCHAR(40)"),
    ("z_receive_lines", "receive_item_id", "VARCHAR(40)"),
]


def _add_missing_columns(sync_conn) -> None:
    from sqlalchemy import inspect, text

    insp = inspect(sync_conn)
    for table, column, ddl in _ADDED_COLUMNS:
        if table in insp.get_table_names() and column not in {c["name"] for c in insp.get_columns(table)}:
            sync_conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {ddl}'))


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency."""
    async with SessionLocal() as db:
        yield db


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """For background jobs: commit on success, roll back on error."""
    async with SessionLocal() as db:
        try:
            yield db
            await db.commit()
        except Exception:
            await db.rollback()
            raise
