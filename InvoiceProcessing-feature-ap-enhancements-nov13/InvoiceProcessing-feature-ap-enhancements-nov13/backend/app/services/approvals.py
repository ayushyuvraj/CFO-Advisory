"""Delegation-of-authority routing and approval actions."""

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Approval, Invoice
from .common import activity, audit, inr, now, policies


class ApprovalError(ValueError):
    pass


def ensure_chain(db: AsyncSession, inv: Invoice) -> None:
    """Builds the chain once. Levels above the invoice value are shown as not required."""
    if inv.approvals:
        return
    doa = policies()["doa"]
    first_pending = True
    for i, lvl in enumerate(doa["levels"], start=1):
        required = inv.total_inr > lvl["above"]
        status = "not_required"
        if required:
            status = "pending" if first_pending else "waiting"
            first_pending = False
        inv.approvals.append(Approval(
            level=i, role=lvl["role"], approver=lvl["name"] if required else "Not required at this value",
            approver_email=lvl.get("email"), limit_text=lvl["limit_text"], status=status,
            sla_due=now() + timedelta(hours=lvl.get("sla_hours", 24)) if status == "pending" else None,
        ))
    activity(db, inv, f"Routed for approval — DOA route {doa['route']} ({inr(inv.total_inr)})", "→")


def pending(inv: Invoice) -> Approval | None:
    return next((a for a in inv.approvals if a.status == "pending"), None)


def fully_approved(inv: Invoice) -> bool:
    return bool(inv.approvals) and all(a.status in ("approved", "not_required") for a in inv.approvals)


def approve(db: AsyncSession, inv: Invoice, user: str, comment: str | None = None) -> Approval:
    if inv.match_status != "pass" or inv.status == "Exception":
        raise ApprovalError("Resolve the exception before approving — the match has not passed")
    ensure_chain(db, inv)
    level = pending(inv)
    if level is None:
        raise ApprovalError("No approval is pending on this invoice")
    if policies()["doa"].get("enforce_approver_identity") and user.lower() != (level.approver_email or "").lower():
        raise ApprovalError(f"This level is assigned to {level.approver} ({level.approver_email})")
    if policies()["doa"].get("segregation_of_duties") and any(
        a.acted_by == user and a.status == "approved" for a in inv.approvals
    ):
        # Segregation of duties: one person cannot approve two levels.
        raise ApprovalError(f"{user} has already approved a level of this invoice")

    level.status, level.acted_by, level.acted_at, level.comment = "approved", user, now(), comment
    nxt = next((a for a in inv.approvals if a.status == "waiting"), None)
    if nxt:
        nxt.status = "pending"
        nxt.sla_due = now() + timedelta(hours=_sla(nxt.role))
        inv.status = "Awaiting Approval"
    else:
        inv.status, inv.stage = "Approved", "submit"
    audit(db, user, f"Approved invoice {inv.invoice_number} — {level.role} · DOA route {policies()['doa']['route']}",
          inv, level=level.level, comment=comment)
    activity(db, inv, f"Approved by {level.role} ({user})")
    return level


def reject(db: AsyncSession, inv: Invoice, user: str, comment: str) -> Approval:
    level = pending(inv)
    if level is None:
        raise ApprovalError("No approval is pending on this invoice")
    level.status, level.acted_by, level.acted_at, level.comment = "rejected", user, now(), comment
    inv.status, inv.decision, inv.park_reason = "Parked", "park", "Rejected by approver"
    inv.decision_note = comment
    audit(db, user, f"Rejected invoice {inv.invoice_number} — {level.role}: {comment}", inv, level=level.level)
    activity(db, inv, f"Rejected by {level.role} — {comment}", "⚠")
    return level


def reset(inv: Invoice) -> None:
    """A correction changes what was approved, so approvals start again."""
    inv.approvals.clear()


def _sla(role: str) -> int:
    return next((lvl.get("sla_hours", 24) for lvl in policies()["doa"]["levels"] if lvl["role"] == role), 24)
