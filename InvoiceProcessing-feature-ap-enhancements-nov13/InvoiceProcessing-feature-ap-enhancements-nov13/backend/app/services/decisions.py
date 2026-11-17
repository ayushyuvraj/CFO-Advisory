"""The decision step: submit for posting, park, or request clarification."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Invoice, ZBill
from . import approvals, payments, pipeline
from .common import activity, audit, now, policies
from .posting import post_bill
from .zoho.sync import read_back_bill, refresh_for_invoice, refresh_po_for


class DecisionError(ValueError):
    pass


FINAL = {"Posted", "Paid"}


async def submit(db: AsyncSession, inv: Invoice, user: str, note: str | None = None) -> Invoice:
    if inv.status in FINAL:
        raise DecisionError(f"{inv.invoice_number} is already {inv.status.lower()}")
    if inv.match_status != "pass":
        raise DecisionError("Only an invoice whose match has passed can be submitted — park it or correct it")
    if not approvals.fully_approved(inv):
        pending = approvals.pending(inv)
        raise DecisionError(f"Approval pending with {pending.role} ({pending.approver})" if pending
                            else "The invoice has not been routed for approval")

    # The bill's receipt allocation must reflect Zoho now, not the last check.
    note = await refresh_for_invoice(db, inv, for_posting=True)
    if note:
        activity(db, inv, note, "⚠")
    bill_id = await post_bill(db, inv)
    inv.zoho_bill_id = bill_id or None
    inv.status, inv.stage, inv.decision, inv.decision_note, inv.decided_at = "Posted", "pay", "submit", note, now()
    where = f"Zoho Books bill {bill_id}" if bill_id else "Zoho Books"
    audit(db, user, f"Invoice {inv.invoice_number} posted to {where} · case {inv.case_id}", inv, bill_id=bill_id)
    activity(db, inv, f"Posted to {where}")
    # The new bill, and the PO and receipts it billed, into the local copy of Zoho.
    note = await read_back_bill(db, inv)
    if note:
        activity(db, inv, note, "⚠")
    await payments.propose(db, inv, user)
    return inv


async def park(db: AsyncSession, inv: Invoice, user: str, reason: str, note: str | None = None) -> Invoice:
    if inv.status in FINAL:
        raise DecisionError(f"{inv.invoice_number} is already {inv.status.lower()}")
    if reason not in policies()["park_reasons"]:
        raise DecisionError(f"Unknown park reason '{reason}'")
    inv.status, inv.decision, inv.park_reason, inv.decision_note, inv.decided_at = "Parked", "park", reason, note, now()
    audit(db, user, f"Invoice {inv.invoice_number} parked — {reason} · case {inv.case_id}", inv, note=note)
    activity(db, inv, f"Parked — {reason}", "⚠")
    return inv


async def clarify(db: AsyncSession, inv: Invoice, user: str, to: str, note: str) -> Invoice:
    if inv.status in FINAL:
        raise DecisionError(f"{inv.invoice_number} is already {inv.status.lower()}")
    inv.status, inv.decision, inv.decision_note, inv.decided_at = "Clarification Requested", "clarify", note, now()
    audit(db, user, f"Clarification requested from {to} on {inv.invoice_number} · case {inv.case_id}", inv,
          to=to, note=note)
    activity(db, inv, f"Clarification requested from {to}", "→")
    return inv


async def resume(db: AsyncSession, inv: Invoice, user: str) -> Invoice:
    if inv.status not in ("Parked", "Clarification Requested"):
        raise DecisionError("Only a parked invoice or one awaiting clarification can be resumed")
    inv.decision = inv.park_reason = None
    approvals.reset(inv)
    audit(db, user, f"Invoice {inv.invoice_number} resumed", inv)
    await pipeline.revalidate(db, inv, user)
    return inv


async def bills_deleted_in_zoho(db: AsyncSession, actor: str) -> int:
    """After a full sync: posted invoices whose Zoho bill no longer exists.

    Nothing has been paid yet — the invoice returns to Approved (checks and approvals
    still stand), its proposed payment is withdrawn and the PO and its receipts are
    re-read, so they show as unbilled again. Money already released or paid is never
    unwound automatically: the invoice is flagged for a person to decide.
    """
    if not (await db.execute(select(func.count()).select_from(ZBill))).scalar():
        return 0  # an empty mirror proves nothing — every bill would look deleted
    gone = (await db.execute(
        select(Invoice).where(Invoice.status.in_(FINAL), Invoice.zoho_bill_id.is_not(None),
                              Invoice.zoho_bill_id.not_in(select(ZBill.zoho_id)))
    )).scalars().all()
    returned = 0
    for inv in gone:
        bill_id = inv.zoho_bill_id
        moved = inv.status == "Paid" or any(p.status in ("released", "confirmed") for p in inv.payments)
        if moved:
            text = (f"Zoho bill {bill_id} was deleted in Zoho Books after payment was released — "
                    "review with the Zoho team; the payment stands")
            if not any(a.text == text for a in inv.activity):
                audit(db, actor, f"{inv.invoice_number}: {text}", inv, bill_id=bill_id)
                activity(db, inv, text, "⚠")
            continue

        for p in [p for p in inv.payments if p.status == "proposed"]:
            audit(db, actor, f"Payment {p.ref} withdrawn — its Zoho bill {bill_id} was deleted", inv, payment=p.ref)
            inv.payments.remove(p)
        inv.zoho_bill_id = None
        inv.status, inv.stage = "Approved", "submit"
        inv.decision = inv.decision_note = inv.decided_at = None
        audit(db, actor, f"Zoho bill {bill_id} for {inv.invoice_number} was deleted in Zoho Books — "
                         "invoice returned to Approved", inv, bill_id=bill_id)
        activity(db, inv, f"Zoho bill {bill_id} deleted in Zoho Books — returned to Approved, ready to submit again", "⚠")
        # The receipts it billed are open again in Zoho.
        note = await refresh_po_for(db, inv)
        if note:
            activity(db, inv, note, "⚠")
        returned += 1
    return returned
