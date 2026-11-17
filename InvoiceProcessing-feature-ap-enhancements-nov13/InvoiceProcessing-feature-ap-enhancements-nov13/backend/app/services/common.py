"""Small shared helpers: policies, identifiers, audit, formatting, parsing."""

import json
import re
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

from dateutil import parser as dateparser
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import Activity, AuditEvent, Invoice, Sequence

AGENT = "invoice_agent"


# ── Policies ─────────────────────────────────────────────────────────────────


@lru_cache
def policies() -> dict[str, Any]:
    with open(get_settings().policies_file, encoding="utf-8") as f:
        return json.load(f)


# ── Identifiers ──────────────────────────────────────────────────────────────


async def next_seq(db: AsyncSession, name: str, start: int) -> int:
    """Increments and returns a named counter, row-locked for the transaction."""
    row = await db.get(Sequence, name, with_for_update=True)
    if row is None:
        row = Sequence(name=name, value=start)
        db.add(row)
    row.value += 1
    await db.flush()
    return row.value


async def new_txn_id(db: AsyncSession) -> str:
    return f"TXN-{date.today().year}-{await next_seq(db, 'txn', 4000):06d}"


async def new_case_id(db: AsyncSession) -> str:
    return f"AP-{date.today().year}-{await next_seq(db, 'case', 1300):06d}"


async def new_ref(db: AsyncSession, prefix: str, start: int = 0) -> str:
    return f"{prefix}-{date.today().year}-{await next_seq(db, prefix, start):05d}"


# ── Audit and activity ───────────────────────────────────────────────────────


def audit(
    db: AsyncSession, actor: str, event: str, invoice: Invoice | None = None, **data: Any
) -> None:
    db.add(
        AuditEvent(
            actor=actor,
            invoice_id=invoice.id if invoice else None,
            event=event,
            data=data or None,
        )
    )


def activity(db: AsyncSession, invoice: Invoice, text: str, mark: str = "✓") -> None:
    db.add(Activity(invoice_id=invoice.id, text=text, mark=mark))


# ── Formatting ───────────────────────────────────────────────────────────────


def inr(n: float | None, decimals: int = 2) -> str:
    """Indian digit grouping: ₹12,34,567.00."""
    if n is None:
        return "—"
    neg = n < 0
    s = f"{abs(n):.{decimals}f}"
    whole, _, frac = s.partition(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        head = re.sub(r"(\d)(?=(\d{2})+$)", r"\1,", head)
        whole = head + "," + tail
    out = "₹" + whole + ("." + frac if frac else "")
    return "-" + out if neg else out


def money(n: float, currency: str) -> str:
    if currency == "INR":
        return inr(n)
    symbol = {"USD": "$", "EUR": "€", "GBP": "£"}.get(currency, currency + " ")
    return f"{symbol}{n:,.2f}"


def fmt_date(d: date | datetime | None) -> str:
    return d.strftime("%d %b %Y") if d else "—"


def fmt_dt(d: datetime | None) -> str:
    if not d:
        return "—"
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(IST).strftime("%d %b %Y, %H:%M")


IST = timezone(timedelta(hours=5, minutes=30), "IST")


# ── Parsing ──────────────────────────────────────────────────────────────────


def parse_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    try:
        return date.fromisoformat(text[:10])  # the model is asked for ISO dates
    except ValueError:
        pass
    try:
        # Otherwise as printed — Indian invoices are day-first.
        return dateparser.parse(text, dayfirst=True, fuzzy=True).date()
    except (ValueError, OverflowError):
        return None


def parse_amount(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).replace("₹", "").replace(",", "").replace("INR", "").replace("Rs.", "").strip()
    neg = s.startswith("(") and s.endswith(")") or s.startswith("-")
    s = s.strip("()-").strip()
    try:
        n = float(s)
    except ValueError:
        return 0.0
    return -n if neg else n


def norm_doc_no(s: str | None) -> str:
    """Normalises a document number for duplicate comparison."""
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def terms_days(label: str | None, default: int = 45) -> int:
    if not label:
        return default
    m = re.search(r"(\d+)", label)
    return int(m.group(1)) if m else default


def now() -> datetime:
    return datetime.now(timezone.utc)


async def first(db: AsyncSession, stmt):
    return (await db.execute(stmt)).scalars().first()


async def all_of(db: AsyncSession, stmt) -> list:
    return list((await db.execute(stmt)).scalars().all())
