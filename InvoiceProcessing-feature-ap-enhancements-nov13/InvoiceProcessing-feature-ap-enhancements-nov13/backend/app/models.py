"""ORM models.

Two groups:

* Command Center records — invoices and everything the agent and users do to
  them (fields, lines, corrections, approvals, payments, audit). These are owned
  here.
* Zoho cache (``Z*``) — a read-only mirror of the Zoho Books objects the match
  engine needs. Zoho is authoritative; these rows are only ever written by sync.
"""

import datetime as dt
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from .db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """Stores UTC; always returns timezone-aware values (SQLite drops the zone)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


# ── Command Center records ───────────────────────────────────────────────────


class Invoice(Base):
    """One transaction: the invoice document and its journey to payment."""

    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    txn_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    case_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)

    # Processing status as shown in the AP inbox, and the journey stage.
    status: Mapped[str] = mapped_column(String(40), default="Received", index=True)
    stage: Mapped[str] = mapped_column(String(20), default="intake")

    # Source document
    channel: Mapped[str] = mapped_column(String(20), default="upload")
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(80))
    file_sha256: Mapped[str] = mapped_column(String(64), index=True)
    pages: Mapped[int] = mapped_column(Integer, default=1)
    uploaded_by: Mapped[str] = mapped_column(String(120))
    received_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    decided_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    paid_at: Mapped[datetime | None] = mapped_column(UTCDateTime())

    # Pipeline progress, polled by the extraction screen.
    pipeline_state: Mapped[str] = mapped_column(String(20), default="queued")
    pipeline_step: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)

    # Extracted header
    doc_type: Mapped[str | None] = mapped_column(String(80))
    vendor_name: Mapped[str | None] = mapped_column(String(255))
    vendor_gstin: Mapped[str | None] = mapped_column(String(20), index=True)
    vendor_pan: Mapped[str | None] = mapped_column(String(12))
    vendor_address: Mapped[list | None] = mapped_column(JSON)
    vendor_zoho_id: Mapped[str | None] = mapped_column(String(40))
    invoice_number: Mapped[str | None] = mapped_column(String(80), index=True)
    invoice_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    po_number: Mapped[str | None] = mapped_column(String(80))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    # INR per unit of ``currency``; 1 for INR invoices.
    fx_rate: Mapped[float] = mapped_column(Float, default=1)
    # Supply from a non-resident supplier: no GSTIN, no GST on the invoice.
    is_import: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_terms: Mapped[str | None] = mapped_column(String(80))
    buyer_name: Mapped[str | None] = mapped_column(String(255))
    buyer_gstin: Mapped[str | None] = mapped_column(String(20))
    buyer_address: Mapped[list | None] = mapped_column(JSON)
    ship_to: Mapped[str | None] = mapped_column(String(255))
    place_of_supply: Mapped[str | None] = mapped_column(String(80))
    irn: Mapped[str | None] = mapped_column(String(80))

    subtotal: Mapped[float] = mapped_column(Float, default=0)
    cgst: Mapped[float] = mapped_column(Float, default=0)
    sgst: Mapped[float] = mapped_column(Float, default=0)
    igst: Mapped[float] = mapped_column(Float, default=0)
    cess: Mapped[float] = mapped_column(Float, default=0)
    tax_total: Mapped[float] = mapped_column(Float, default=0)
    round_off: Mapped[float] = mapped_column(Float, default=0)
    other_charges: Mapped[list | None] = mapped_column(JSON)  # [{label, amount}]
    total: Mapped[float] = mapped_column(Float, default=0)  # invoice value incl. GST
    tds_section: Mapped[str | None] = mapped_column(String(20))
    tds_rate: Mapped[float] = mapped_column(Float, default=0)
    tds_amount: Mapped[float] = mapped_column(Float, default=0)
    net_payable: Mapped[float] = mapped_column(Float, default=0)

    # Cost coding — defaulted from the PO, or supplied by the user for non-PO.
    cost_centre: Mapped[str | None] = mapped_column(String(80))
    gl_account: Mapped[str | None] = mapped_column(String(120))
    business_unit: Mapped[str | None] = mapped_column(String(120))

    extraction_confidence: Mapped[float] = mapped_column(Float, default=0)
    raw_extraction: Mapped[dict | None] = mapped_column(JSON)

    @property
    def total_inr(self) -> float:
        return round((self.total or 0) * (self.fx_rate or 1), 2)

    # Validation and match
    checks: Mapped[list | None] = mapped_column(JSON)
    match_status: Mapped[str | None] = mapped_column(String(20))  # pass | fail | exception
    match_confidence: Mapped[float] = mapped_column(Float, default=0)
    match_result: Mapped[dict | None] = mapped_column(JSON)
    risk_level: Mapped[str | None] = mapped_column(String(20))
    recommended_action: Mapped[str | None] = mapped_column(String(80))
    recommendation: Mapped[str | None] = mapped_column(Text)
    narrative: Mapped[str | None] = mapped_column(Text)
    corrected: Mapped[bool] = mapped_column(Boolean, default=False)

    # Decision and posting
    decision: Mapped[str | None] = mapped_column(String(20))  # submit | park | clarify
    park_reason: Mapped[str | None] = mapped_column(String(120))
    decision_note: Mapped[str | None] = mapped_column(Text)
    zoho_bill_id: Mapped[str | None] = mapped_column(String(40))

    fields: Mapped[list["InvoiceField"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="InvoiceField.id"
    )
    lines: Mapped[list["InvoiceLine"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="InvoiceLine.line_no"
    )
    activity: Mapped[list["Activity"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="Activity.id"
    )
    corrections: Mapped[list["Correction"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="Correction.id.desc()"
    )
    source_requests: Mapped[list["SourceRequest"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="SourceRequest.id.desc()"
    )
    approvals: Mapped[list["Approval"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="Approval.level"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="Payment.id"
    )
    chat: Mapped[list["ChatMessage"]] = relationship(back_populates="invoice", cascade="all, delete-orphan", lazy="selectin", order_by="ChatMessage.id"
    )


class InvoiceField(Base):
    """An extracted header field with its confidence and location on the page."""

    __tablename__ = "invoice_fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(80))
    value: Mapped[str | None] = mapped_column(Text)
    original_value: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    # What the model reported, before cross-checks adjusted it.
    model_confidence: Mapped[float] = mapped_column(Float, default=0)
    page: Mapped[int] = mapped_column(Integer, default=1)
    # Normalised [x0, y0, x1, y1] in 0..1 page coordinates, origin top-left.
    bbox: Mapped[list | None] = mapped_column(JSON)
    corrected: Mapped[bool] = mapped_column(Boolean, default=False)

    invoice: Mapped[Invoice] = relationship(back_populates="fields", lazy="raise")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    line_no: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text)
    hsn_sac: Mapped[str | None] = mapped_column(String(12))
    uom: Mapped[str | None] = mapped_column(String(20))
    quantity: Mapped[float] = mapped_column(Float, default=0)
    rate: Mapped[float] = mapped_column(Float, default=0)
    discount: Mapped[float] = mapped_column(Float, default=0)
    taxable_value: Mapped[float] = mapped_column(Float, default=0)
    tax_rate: Mapped[float] = mapped_column(Float, default=0)
    cgst: Mapped[float] = mapped_column(Float, default=0)
    sgst: Mapped[float] = mapped_column(Float, default=0)
    igst: Mapped[float] = mapped_column(Float, default=0)
    page: Mapped[int] = mapped_column(Integer, default=1)
    bbox: Mapped[list | None] = mapped_column(JSON)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    original_quantity: Mapped[float | None] = mapped_column(Float)
    original_rate: Mapped[float | None] = mapped_column(Float)
    # The Zoho PO line this invoice line was matched to.
    po_line_item_id: Mapped[str | None] = mapped_column(String(40))

    invoice: Mapped[Invoice] = relationship(back_populates="lines", lazy="raise")


class Activity(Base):
    """The agent activity timeline for a transaction."""

    __tablename__ = "activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    text: Mapped[str] = mapped_column(Text)
    mark: Mapped[str] = mapped_column(String(4), default="✓")

    invoice: Mapped[Invoice] = relationship(back_populates="activity", lazy="raise")


class Correction(Base):
    """An authorised change to a Command-Center-owned value."""

    __tablename__ = "corrections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    target: Mapped[str] = mapped_column(String(20))  # field | line | coding
    line_no: Mapped[int | None] = mapped_column(Integer)
    field: Mapped[str] = mapped_column(String(40))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(String(200))
    comment: Mapped[str | None] = mapped_column(Text)
    user: Mapped[str] = mapped_column(String(120))
    at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    invoice: Mapped[Invoice] = relationship(back_populates="corrections", lazy="raise")


class SourceRequest(Base):
    """A request to correct a value owned by Zoho — never overwritten here."""

    __tablename__ = "source_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    ref: Mapped[str] = mapped_column(String(32), unique=True)
    system: Mapped[str] = mapped_column(String(40), default="Zoho Books")
    document: Mapped[str] = mapped_column(String(40))  # purchase_order | goods_receipt
    document_ref: Mapped[str | None] = mapped_column(String(80))
    field: Mapped[str] = mapped_column(String(40))
    current_value: Mapped[str | None] = mapped_column(Text)
    requested_value: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")
    raised_by: Mapped[str] = mapped_column(String(120))
    at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    invoice: Mapped[Invoice] = relationship(back_populates="source_requests", lazy="raise")


class Approval(Base):
    """One level of the delegation-of-authority chain."""

    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    level: Mapped[int] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String(60))
    approver: Mapped[str] = mapped_column(String(160))
    approver_email: Mapped[str | None] = mapped_column(String(160))
    limit_text: Mapped[str] = mapped_column(String(80))
    # pending | approved | rejected | not_required | waiting
    status: Mapped[str] = mapped_column(String(20), default="waiting")
    acted_by: Mapped[str | None] = mapped_column(String(160))
    acted_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    comment: Mapped[str | None] = mapped_column(Text)
    sla_due: Mapped[datetime | None] = mapped_column(UTCDateTime())

    invoice: Mapped[Invoice] = relationship(back_populates="approvals", lazy="raise")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ref: Mapped[str] = mapped_column(String(32), unique=True)
    run_id: Mapped[str] = mapped_column(String(40), index=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    vendor_name: Mapped[str | None] = mapped_column(String(255))
    gross: Mapped[float] = mapped_column(Float)
    tds: Mapped[float] = mapped_column(Float, default=0)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    due_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    mode: Mapped[str] = mapped_column(String(20), default="NEFT")
    # proposed → released → confirmed (UTR received); or failed
    status: Mapped[str] = mapped_column(String(20), default="proposed")
    prepared_by: Mapped[str] = mapped_column(String(120))
    released_by: Mapped[str | None] = mapped_column(String(120))
    released_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    utr: Mapped[str | None] = mapped_column(String(40))
    confirmed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    zoho_payment_id: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    invoice: Mapped[Invoice] = relationship(back_populates="payments", lazy="selectin")


class AuditEvent(Base):
    """Append-only audit trail. Never updated or deleted."""

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, index=True)
    actor: Mapped[str] = mapped_column(String(120))
    invoice_id: Mapped[str | None] = mapped_column(String(32), index=True)
    event: Mapped[str] = mapped_column(Text)
    data: Mapped[dict | None] = mapped_column(JSON)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[str] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(40))
    text: Mapped[str] = mapped_column(Text)
    sources: Mapped[str | None] = mapped_column(Text)
    recommendation: Mapped[str | None] = mapped_column(Text)
    at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    invoice: Mapped[Invoice] = relationship(back_populates="chat", lazy="raise")


class Sequence(Base):
    """Monotonic counters for human-readable identifiers."""

    __tablename__ = "sequences"

    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, default=0)


class ConnectorState(Base):
    __tablename__ = "connectors"

    key: Mapped[str] = mapped_column(String(20), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="available")
    last_sync_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    meta: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)


# ── Zoho Books cache (read-only mirror) ──────────────────────────────────────


class ZVendor(Base):
    __tablename__ = "z_vendors"

    zoho_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    gstin: Mapped[str | None] = mapped_column(String(20), index=True)
    pan: Mapped[str | None] = mapped_column(String(12))
    gst_treatment: Mapped[str | None] = mapped_column(String(40))
    state_code: Mapped[str | None] = mapped_column(String(4))
    payment_terms_days: Mapped[int | None] = mapped_column(Integer)
    payment_terms_label: Mapped[str | None] = mapped_column(String(60))
    email: Mapped[str | None] = mapped_column(String(160))
    bank_account: Mapped[str | None] = mapped_column(String(40))
    tds_section: Mapped[str | None] = mapped_column(String(20))
    msme: Mapped[bool] = mapped_column(Boolean, default=False)
    raw: Mapped[dict | None] = mapped_column(JSON)


class ZAccount(Base):
    __tablename__ = "z_accounts"

    zoho_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    code: Mapped[str | None] = mapped_column(String(40))
    type: Mapped[str | None] = mapped_column(String(40))


class ZTax(Base):
    __tablename__ = "z_taxes"

    zoho_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    rate: Mapped[float] = mapped_column(Float)
    # igst | cgst | sgst | group (a CGST+SGST pair)
    kind: Mapped[str] = mapped_column(String(10))


class ZPurchaseOrder(Base):
    __tablename__ = "z_purchase_orders"

    zoho_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    number: Mapped[str] = mapped_column(String(80), index=True)
    vendor_zoho_id: Mapped[str | None] = mapped_column(String(40), index=True)
    vendor_name: Mapped[str | None] = mapped_column(String(255))
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    delivery_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str | None] = mapped_column(String(40))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    total: Mapped[float] = mapped_column(Float, default=0)
    cost_centre: Mapped[str | None] = mapped_column(String(80))
    business_unit: Mapped[str | None] = mapped_column(String(120))
    pr_number: Mapped[str | None] = mapped_column(String(40))
    buyer: Mapped[str | None] = mapped_column(String(120))
    place_of_supply: Mapped[str | None] = mapped_column(String(10))
    payment_terms_label: Mapped[str | None] = mapped_column(String(60))
    raw: Mapped[dict | None] = mapped_column(JSON)

    lines: Mapped[list["ZPoLine"]] = relationship(back_populates="po", cascade="all, delete-orphan", lazy="selectin", order_by="ZPoLine.line_no"
    )


class ZPoLine(Base):
    __tablename__ = "z_po_lines"

    line_item_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    po_zoho_id: Mapped[str] = mapped_column(
        ForeignKey("z_purchase_orders.zoho_id", ondelete="CASCADE"), index=True
    )
    line_no: Mapped[int] = mapped_column(Integer)
    item_name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    hsn_sac: Mapped[str | None] = mapped_column(String(12))
    uom: Mapped[str | None] = mapped_column(String(20))
    quantity: Mapped[float] = mapped_column(Float, default=0)
    quantity_billed: Mapped[float] = mapped_column(Float, default=0)
    # Received quantity as Zoho reports it on the PO line — the fallback source
    # for 3-way matching when the purchase-receives API is not available.
    quantity_received: Mapped[float] = mapped_column(Float, default=0)
    item_id: Mapped[str | None] = mapped_column(String(40))
    rate: Mapped[float] = mapped_column(Float, default=0)
    tax_rate: Mapped[float] = mapped_column(Float, default=0)
    account_id: Mapped[str | None] = mapped_column(String(40))
    account_name: Mapped[str | None] = mapped_column(String(160))

    po: Mapped[ZPurchaseOrder] = relationship(back_populates="lines", lazy="raise")


class ZReceive(Base):
    """Purchase receive (goods receipt) or service confirmation."""

    __tablename__ = "z_receives"

    zoho_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    number: Mapped[str] = mapped_column(String(80), index=True)
    po_zoho_id: Mapped[str | None] = mapped_column(String(40), index=True)
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    kind: Mapped[str] = mapped_column(String(20), default="Goods")
    status: Mapped[str | None] = mapped_column(String(40))
    plant: Mapped[str | None] = mapped_column(String(120))
    raw: Mapped[dict | None] = mapped_column(JSON)

    lines: Mapped[list["ZReceiveLine"]] = relationship(back_populates="receive", cascade="all, delete-orphan", lazy="selectin"
    )


class ZReceiveLine(Base):
    __tablename__ = "z_receive_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    receive_zoho_id: Mapped[str] = mapped_column(
        ForeignKey("z_receives.zoho_id", ondelete="CASCADE"), index=True
    )
    po_line_item_id: Mapped[str | None] = mapped_column(String(40), index=True)
    # The receipt line's own Zoho ID — a bill against received goods must cite it.
    receive_item_id: Mapped[str | None] = mapped_column(String(40))
    quantity_received: Mapped[float] = mapped_column(Float, default=0)
    quantity_accepted: Mapped[float] = mapped_column(Float, default=0)

    receive: Mapped[ZReceive] = relationship(back_populates="lines", lazy="raise")


class ZBill(Base):
    """Bills already in Zoho — used for duplicate detection and reconciliation."""

    __tablename__ = "z_bills"

    zoho_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    bill_number: Mapped[str] = mapped_column(String(80), index=True)
    vendor_zoho_id: Mapped[str | None] = mapped_column(String(40), index=True)
    vendor_name: Mapped[str | None] = mapped_column(String(255))
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    total: Mapped[float] = mapped_column(Float, default=0)
    balance: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str | None] = mapped_column(String(40))


class ZRequisition(Base):
    """Purchase requisitions. Zoho Books has no native PR object; these come from
    a custom module (live) or the demo organisation (mock)."""

    __tablename__ = "z_requisitions"

    pr_number: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    raised_by: Mapped[str | None] = mapped_column(String(120))
    department: Mapped[str | None] = mapped_column(String(120))
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    value: Mapped[float] = mapped_column(Float, default=0)
    approved_by: Mapped[str | None] = mapped_column(String(120))
    approval_route: Mapped[str | None] = mapped_column(String(60))
    status: Mapped[str | None] = mapped_column(String(40))
    po_number: Mapped[str | None] = mapped_column(String(80))


class Email(Base):
    __tablename__ = "emails"

    # IDs are generated by email_reader.py; never regenerate them here.
    email_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    message_id: Mapped[str | None] = mapped_column(Text)
    source_sha256: Mapped[str] = mapped_column(String(64))
    sender: Mapped[str] = mapped_column(Text)
    recipient: Mapped[str] = mapped_column(Text)
    subject: Mapped[str] = mapped_column(Text)
    received_datetime: Mapped[datetime] = mapped_column(UTCDateTime(), index=True)
    body: Mapped[str] = mapped_column(Text)
    folder_path: Mapped[str] = mapped_column(String(500), unique=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    attachments: Mapped[list["EmailAttachment"]] = relationship(
        back_populates="email", cascade="all, delete-orphan", lazy="selectin"
    )


class EmailAttachment(Base):
    __tablename__ = "email_attachments"

    attachment_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email_id: Mapped[str] = mapped_column(
        ForeignKey("emails.email_id", ondelete="CASCADE"), index=True
    )
    filename: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer)
    file_path: Mapped[str] = mapped_column(Text)
    # Populated by the later attachment extraction/classification steps.
    extracted_text: Mapped[str | None] = mapped_column(Text)
    extracted_information: Mapped[dict | None] = mapped_column(JSON)
    document_type: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    email: Mapped[Email] = relationship(back_populates="attachments", lazy="raise")
