"""Additive email-to-invoice link; existing table definitions are unchanged."""
from datetime import datetime

from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .models import UTCDateTime, utcnow


class EmailInvoiceLink(Base):
    __tablename__ = "email_invoice_links"

    attachment_id: Mapped[str] = mapped_column(
        ForeignKey("email_attachments.attachment_id", ondelete="CASCADE"), primary_key=True)
    # 0 marks a pre-multi-invoice legacy link; new parts are numbered from 1.
    part_index: Mapped[int] = mapped_column(Integer, primary_key=True, default=0)
    source_page_start: Mapped[int | None] = mapped_column(Integer)
    source_page_end: Mapped[int | None] = mapped_column(Integer)
    source_invoice_number: Mapped[str | None] = mapped_column(String(120))
    invoice_id: Mapped[str] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), unique=True, nullable=False)
    source_sha256: Mapped[str] = mapped_column(String(64))
    classification_version: Mapped[str] = mapped_column(String(40))
    forwarded_by: Mapped[str] = mapped_column(String(120))
    forwarded_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    dispatch_state: Mapped[str] = mapped_column(String(20), default="pending")
