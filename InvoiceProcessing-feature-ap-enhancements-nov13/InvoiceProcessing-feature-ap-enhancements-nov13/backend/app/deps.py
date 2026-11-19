"""Request dependencies."""

import re

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .db import get_db
from .models import Invoice

_USER_RE = re.compile(r"^[A-Za-z0-9._%+-]+(@[A-Za-z0-9.-]+)?$")


def current_user(x_user: str | None = Header(default=None, description="Acting user (email)")) -> str:
    """The acting user. Phase 1 trusts the X-User header — put SSO in front before production."""
    user = (x_user or get_settings().default_user).strip()
    if not _USER_RE.match(user) or len(user) > 120:
        raise HTTPException(400, "Invalid X-User header")
    return user


def current_company(x_company_id: str | None = Header(default=None, description="Company ID")) -> str | None:
    return x_company_id.strip() if x_company_id and x_company_id.strip() else None


def current_persona(x_persona_id: str | None = Header(default=None, description="Persona ID")) -> str | None:
    return x_persona_id.strip() if x_persona_id and x_persona_id.strip() else None


async def invoice_or_404(invoice_id: str, db: AsyncSession = Depends(get_db)) -> Invoice:
    inv = await db.get(Invoice, invoice_id)
    if inv is None:
        raise HTTPException(404, "Invoice not found")
    return inv
