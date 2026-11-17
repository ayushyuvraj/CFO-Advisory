"""Zoho Books v3 REST client (India data centre by default).

Authentication is OAuth 2.0 with a long-lived refresh token (self-client or
server-based app created in the Zoho API console). Access tokens last an hour
and are refreshed transparently; a 401 triggers one refresh and a retry.

Scopes needed:
  ZohoBooks.contacts.READ, ZohoBooks.purchaseorders.READ, ZohoBooks.bills.ALL,
  ZohoBooks.vendorpayments.CREATE, ZohoBooks.accountants.READ,
  ZohoBooks.settings.READ, ZohoInventory.purchasereceives.READ
  (purchase receives are served by the Zoho Inventory API — one grant code can
  carry scopes from both products)
"""

import asyncio
import logging
import time
from typing import Any, AsyncIterator

import httpx

from ...config import Settings

log = logging.getLogger(__name__)


class ZohoError(RuntimeError):
    def __init__(self, message: str, status: int | None = None, code: int | None = None):
        super().__init__(message)
        self.status = status
        self.code = code


class ZohoClient:
    """Thin, typed-by-convention wrapper. Methods return Zoho's own JSON shapes."""

    def __init__(self, settings: Settings):
        if not (settings.zoho_org_id and settings.zoho_client_id and settings.zoho_refresh_token):
            raise ZohoError(
                "Zoho live mode needs ZOHO_ORG_ID, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET and "
                "ZOHO_REFRESH_TOKEN in backend/.env"
            )
        self.s = settings
        self._token: str | None = None
        self._expires = 0.0
        self._lock = asyncio.Lock()
        self._http = httpx.AsyncClient(timeout=60)

    # ── Auth ────────────────────────────────────────────────────────────────

    async def _access_token(self, force: bool = False) -> str:
        async with self._lock:
            if not force and self._token and time.time() < self._expires - 60:
                return self._token
            r = await self._http.post(
                f"{self.s.zoho_accounts_url}/oauth/v2/token",
                params={
                    "refresh_token": self.s.zoho_refresh_token,
                    "client_id": self.s.zoho_client_id,
                    "client_secret": self.s.zoho_client_secret,
                    "grant_type": "refresh_token",
                },
            )
            data = r.json()
            if "access_token" not in data:
                raise ZohoError(f"Zoho token refresh failed: {data.get('error', r.text)}", r.status_code)
            self._token = data["access_token"]
            self._expires = time.time() + int(data.get("expires_in", 3600))
            return self._token

    # ── Transport ───────────────────────────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        params: dict | None = None,
        json: dict | None = None,
        files: dict | None = None,
        base: str | None = None,
    ) -> dict[str, Any]:
        url = (base or self.s.zoho_api_url) + path
        params = {"organization_id": self.s.zoho_org_id, **(params or {})}
        refreshed = False
        for attempt in range(4):
            headers = {"Authorization": f"Zoho-oauthtoken {await self._access_token()}"}
            r = await self._http.request(method, url, params=params, json=json, files=files, headers=headers)
            if r.status_code == 401 and not refreshed:
                await self._access_token(force=True)
                refreshed = True
                continue
            if r.status_code == 429 and r.headers.get("x-rate-limit-remaining") == "0":
                # The organisation's daily quota is spent — retrying cannot help until it resets.
                hours = int(r.headers.get("x-rate-limit-reset", "0") or 0) / 3600
                raise ZohoError(f"Zoho daily API limit reached for this organisation "
                                f"({r.headers.get('x-rate-limit-limit', '?')} calls); resets in about {hours:.1f} h", 429, 45)
            if r.status_code in (429, 502, 503, 504):
                # Per-minute rate limit or a transient gateway error — back off and retry.
                wait = 2 ** attempt * 5
                log.warning("Zoho %s on %s; retrying in %ss", r.status_code, path, wait)
                await asyncio.sleep(wait)
                continue
            try:
                data = r.json()
            except ValueError:
                raise ZohoError(f"Zoho returned non-JSON ({r.status_code}) for {path}", r.status_code)
            if r.status_code >= 400 or data.get("code", 0) != 0:
                raise ZohoError(
                    f"Zoho {method} {path} failed: {data.get('message', r.text)}",
                    r.status_code,
                    data.get("code"),
                )
            return data
        raise ZohoError(f"Zoho {method} {path} failed after retries", 429)

    async def _paginate(self, path: str, key: str, base: str | None = None, **params: Any) -> AsyncIterator[dict]:
        page = 1
        while True:
            data = await self._request("GET", path, params={**params, "page": page, "per_page": 200}, base=base)
            for row in data.get(key, []):
                yield row
            if not data.get("page_context", {}).get("has_more_page"):
                return
            page += 1

    # ── Reads ───────────────────────────────────────────────────────────────

    async def get_organization(self) -> dict:
        return (await self._request("GET", f"/organizations/{self.s.zoho_org_id}"))["organization"]

    async def list_vendors(self) -> list[dict]:
        return [r async for r in self._paginate("/contacts", "contacts", contact_type="vendor")]

    async def get_vendor(self, contact_id: str) -> dict:
        return (await self._request("GET", f"/contacts/{contact_id}"))["contact"]

    async def search_vendors(self, name: str) -> list[dict]:
        params = {"contact_type": "vendor", "search_text": name, "per_page": 25}
        return (await self._request("GET", "/contacts", params=params)).get("contacts", [])

    async def list_accounts(self) -> list[dict]:
        return [r async for r in self._paginate("/chartofaccounts", "chartofaccounts")]

    async def list_taxes(self) -> list[dict]:
        return (await self._request("GET", "/settings/taxes")).get("taxes", [])

    async def list_tds_taxes(self) -> list[dict]:
        """TDS tax codes (Zoho Books India). Raises ZohoError where TDS is not enabled."""
        return (await self._request("GET", "/settings/taxes", params={"is_tds_request": "true"})).get("taxes", [])

    async def list_custom_fields(self) -> dict:
        """Custom field definitions per record type, as configured in Zoho."""
        return (await self._request("GET", "/settings/customfields")).get("customfields") or {}

    async def list_purchase_orders(self) -> list[dict]:
        return [r async for r in self._paginate("/purchaseorders", "purchaseorders")]

    async def get_purchase_order(self, po_id: str) -> dict:
        return (await self._request("GET", f"/purchaseorders/{po_id}"))["purchaseorder"]

    async def search_purchase_orders(self, number: str) -> list[dict]:
        params = {"search_text": number, "per_page": 25}
        return (await self._request("GET", "/purchaseorders", params=params)).get("purchaseorders", [])

    async def list_purchase_receives(self) -> list[dict]:
        """Receipt summaries (no lines). Raises ZohoError without the Inventory scope."""
        inv = self.s.zoho_inventory_api_url
        return [r async for r in self._paginate("/purchasereceives", "purchasereceives", base=inv)]

    async def get_purchase_receive(self, receive_id: str) -> dict:
        inv = self.s.zoho_inventory_api_url
        return (await self._request("GET", f"/purchasereceives/{receive_id}", base=inv))["purchasereceive"]

    async def list_bills(self) -> list[dict]:
        return [r async for r in self._paginate("/bills", "bills")]

    async def get_bill(self, bill_id: str) -> dict:
        return (await self._request("GET", f"/bills/{bill_id}"))["bill"]

    async def find_bills(self, bill_number: str) -> list[dict]:
        return (await self._request("GET", "/bills", params={"bill_number": bill_number})).get("bills", [])

    async def list_requisitions(self) -> list[dict]:
        # Zoho Books has no native purchase requisition. Wire a custom module here
        # if the organisation keeps PRs in Zoho; until then PR drill-back shows
        # what the PO's custom fields carry.
        return []

    # ── Writes ──────────────────────────────────────────────────────────────

    async def create_bill(self, payload: dict) -> dict:
        return (await self._request("POST", "/bills", json=payload))["bill"]

    async def attach_to_bill(self, bill_id: str, filename: str, content: bytes, mime: str) -> None:
        await self._request(
            "POST", f"/bills/{bill_id}/attachment", files={"attachment": (filename, content, mime)}
        )

    async def create_vendor_payment(self, payload: dict) -> dict:
        return (await self._request("POST", "/vendorpayments", json=payload))["vendorpayment"]

    async def aclose(self) -> None:
        await self._http.aclose()
