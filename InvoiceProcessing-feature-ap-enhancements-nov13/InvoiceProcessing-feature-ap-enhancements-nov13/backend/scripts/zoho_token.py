"""Zoho Books connection helper.

    # 1. Check what the current refresh token is allowed to do (read-only):
    .venv/Scripts/python scripts/zoho_token.py check

    # 2. Exchange a new grant code (Zoho API console → Self Client → Generate Code)
    #    for a refresh token, and write it into backend/.env:
    .venv/Scripts/python scripts/zoho_token.py exchange <grant-code>

Scopes to request when generating the grant code (paste as one line):
    ZohoBooks.contacts.READ,ZohoBooks.purchaseorders.READ,ZohoBooks.bills.ALL,ZohoBooks.vendorpayments.CREATE,ZohoBooks.accountants.READ,ZohoBooks.settings.READ,ZohoInventory.purchasereceives.READ
For a test organisation, ZohoBooks.fullaccess.all,ZohoInventory.purchasereceives.READ also works.
"""

import asyncio
import re
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import BACKEND_DIR, get_settings  # noqa: E402
from app.services.zoho.client import ZohoClient, ZohoError  # noqa: E402

CHECKS = [
    ("Organisation", "get_organization"),
    ("Taxes", "list_taxes"),
    ("TDS taxes", "list_tds_taxes"),
    ("Chart of accounts", "list_accounts"),
    ("Vendors", "list_vendors"),
    ("Purchase orders", "list_purchase_orders"),
    ("Bills", "list_bills"),
    ("Purchase receives", "list_purchase_receives"),
]


async def check() -> None:
    client = ZohoClient(get_settings())
    try:
        for label, method in CHECKS:
            try:
                out = await getattr(client, method)()
                size = len(out) if isinstance(out, list) else 1
                print(f"  OK       {label:<18} {size} record(s)")
            except ZohoError as e:
                print(f"  REFUSED  {label:<18} {e}")
    finally:
        await client.aclose()


def exchange(code: str) -> None:
    s = get_settings()
    r = httpx.post(
        f"{s.zoho_accounts_url}/oauth/v2/token",
        params={"code": code, "client_id": s.zoho_client_id, "client_secret": s.zoho_client_secret,
                "grant_type": "authorization_code"},
        timeout=30,
    )
    data = r.json()
    token = data.get("refresh_token")
    if not token:
        print("Exchange failed:", data.get("error", r.text))
        print("Grant codes expire within minutes and work once — generate a fresh one and retry.")
        sys.exit(1)
    env = BACKEND_DIR / ".env"
    text = env.read_text(encoding="utf-8")
    line = f"ZOHO_REFRESH_TOKEN={token}"
    text = re.sub(r"^ZOHO_REFRESH_TOKEN=.*$", line, text, flags=re.M) if "ZOHO_REFRESH_TOKEN=" in text else text + "\n" + line + "\n"
    env.write_text(text, encoding="utf-8")
    print("New refresh token written to backend/.env")
    if data.get("scope"):
        print("Granted scopes:", data["scope"])
    get_settings.cache_clear()
    asyncio.run(check())


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "check":
        asyncio.run(check())
    elif len(sys.argv) >= 3 and sys.argv[1] == "exchange":
        exchange(sys.argv[2].strip())
    else:
        print(__doc__)
