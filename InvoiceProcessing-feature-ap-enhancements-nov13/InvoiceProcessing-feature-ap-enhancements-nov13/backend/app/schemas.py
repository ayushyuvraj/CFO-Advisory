"""Request bodies."""

from typing import Literal

from pydantic import BaseModel, Field


class LineCorrection(BaseModel):
    target: Literal["line"] = "line"
    line_no: int = Field(ge=1)
    field: Literal["quantity", "rate", "tax_rate", "hsn_sac", "description", "discount"]
    value: str
    reason: str = Field(min_length=3, max_length=200)
    comment: str | None = Field(default=None, max_length=1000)


class FieldCorrection(BaseModel):
    target: Literal["field"] = "field"
    key: str = Field(description="UI field key (po, number, date, gstin, …) or cost_centre / gl_account / business_unit")
    value: str = Field(max_length=255)
    reason: str = Field(min_length=3, max_length=200)
    comment: str | None = Field(default=None, max_length=1000)


class SourceRequestIn(BaseModel):
    document: Literal["purchase_order", "goods_receipt"]
    field: str = Field(max_length=40)
    requested_value: str | None = Field(default=None, max_length=255)
    reason: str = Field(min_length=3, max_length=1000)


class ApprovalIn(BaseModel):
    comment: str | None = Field(default=None, max_length=1000)


class RejectIn(BaseModel):
    comment: str = Field(min_length=3, max_length=1000)


class DecisionIn(BaseModel):
    action: Literal["submit", "park", "clarify", "resume"]
    reason: str | None = Field(default=None, description="Park reason (from /api/config parkReasons)")
    note: str | None = Field(default=None, max_length=2000)
    to: str | None = Field(default=None, description="Clarification recipient", max_length=160)


class ConfirmPaymentIn(BaseModel):
    utr: str = Field(min_length=10, max_length=22)


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
