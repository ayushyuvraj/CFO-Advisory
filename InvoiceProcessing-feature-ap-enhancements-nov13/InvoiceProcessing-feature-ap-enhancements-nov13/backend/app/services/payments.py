"""Payment proposal, treasury release and UTR confirmation.

Bank host-to-host is out of scope for phase 1: release queues the payment for
the bank, and the UTR is confirmed by treasury (or, later, from the bank
statement / H2H acknowledgement). On confirmation the payment is recorded
against the bill in Zoho Books with the UTR as its reference.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import Invoice, Payment
from .common import activity, audit, money, new_ref, now, policies
from .zoho.sync import get_client, read_back_bill


class PaymentError(ValueError):
    pass


async def propose(db: AsyncSession, inv: Invoice, user: str) -> Payment:
    existing = next((p for p in inv.payments if p.status != "failed"), None)
    if existing:
        return existing
    pol = policies()["payments"]
    amount = round(inv.net_payable or inv.total, 2)
    p = Payment(
        ref=await new_ref(db, "PAY", 4200),
        run_id=f"PR-RUN-{(inv.due_date or date.today()):%Y-%m%d}",
        invoice_id=inv.id, vendor_name=inv.vendor_name, gross=inv.total, tds=inv.tds_amount, amount=amount,
        currency=inv.currency, due_date=inv.due_date,
        mode="SWIFT" if inv.currency != "INR" else "RTGS" if amount > pol["rtgs_above"] else pol["default_mode"],
        status="proposed", prepared_by=user,
    )
    inv.payments.append(p)
    await db.flush()
    audit(db, "payment_agent", f"Payment {p.ref} proposed — {money(amount, inv.currency)} to {inv.vendor_name}", inv,
          payment=p.ref)
    return p


def release(db: AsyncSession, p: Payment, user: str) -> Payment:
    if p.status != "proposed":
        raise PaymentError(f"Payment {p.ref} is {p.status}, not awaiting release")
    if policies()["payments"]["two_person_release"] and user == p.prepared_by:
        raise PaymentError("Two-person rule: the payment must be released by someone other than who prepared it")
    p.status, p.released_by, p.released_at = "released", user, now()
    inv = p.invoice
    inv.stage = "pay"
    audit(db, user, f"Payment {p.ref} released to bank — {p.mode} {money(p.amount, p.currency)}", inv)
    activity(db, inv, f"Treasury released {p.ref} — {p.mode} {money(p.amount, p.currency)}")
    return p


async def confirm(db: AsyncSession, p: Payment, utr: str, user: str) -> Payment:
    if p.status != "released":
        raise PaymentError(f"Payment {p.ref} has not been released")
    utr = utr.strip().upper()
    if not 10 <= len(utr) <= 22 or not utr.isalnum():
        raise PaymentError("A UTR is 10–22 letters and digits")
    if (await db.execute(select(Payment.id).where(Payment.utr == utr))).first():
        raise PaymentError(f"UTR {utr} is already recorded against another payment")

    inv = p.invoice
    if inv.zoho_bill_id and inv.vendor_zoho_id:
        s = get_settings()
        payload = {
            "vendor_id": inv.vendor_zoho_id,
            "amount": p.amount,
            "date": date.today().isoformat(),
            "payment_mode": "Bank Transfer",
            "reference_number": utr,
            "description": f"{p.ref} · {inv.invoice_number} · {inv.txn_id}",
            "bills": [{"bill_id": inv.zoho_bill_id, "amount_applied": p.amount}],
        }
        if s.zoho_paid_through_account_id:
            payload["paid_through_account_id"] = s.zoho_paid_through_account_id
        p.zoho_payment_id = str((await get_client().create_vendor_payment(payload)).get("payment_id", ""))

    p.status, p.utr, p.confirmed_at = "confirmed", utr, now()
    inv.status, inv.stage, inv.paid_at = "Paid", "done", now()
    audit(db, user, f"Payment {p.ref} confirmed · UTR {utr} · vendor payment recorded in Zoho Books", inv)
    activity(db, inv, f"UTR {utr} received — payment recorded in Zoho Books")
    # The bill's new balance and status (paid / partially paid) into the local copy.
    note = await read_back_bill(db, inv, with_po=False)
    if note:
        activity(db, inv, note, "⚠")
    return p
