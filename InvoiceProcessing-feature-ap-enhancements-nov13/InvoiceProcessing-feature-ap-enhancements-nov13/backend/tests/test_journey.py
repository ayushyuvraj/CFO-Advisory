"""End-to-end: upload → extraction → validation → match → approval → posting → payment → reconciliation."""

from conftest import upload

AP = {"X-User": "s.joshi@genstar-demo.in"}
OWNER = {"X-User": "p.avale@genstar-demo.in"}
CONTROLLER = {"X-User": "a.shah@genstar-demo.in"}
TREASURY = {"X-User": "u.gupta@genstar-demo.in"}


def approve_all(client, inv_id, approvers=(AP, OWNER, CONTROLLER)):
    for headers in approvers:
        detail = client.get(f"/api/invoices/{inv_id}").json()
        if not any(a["status"] == "pending" for a in detail["approvals"]):
            break
        r = client.post(f"/api/invoices/{inv_id}/approve", json={"comment": "ok"}, headers=headers)
        assert r.status_code == 200, r.text
    return client.get(f"/api/invoices/{inv_id}").json()


def _mirrored_bill(bill_id: str) -> tuple[str | None, float] | None:
    """Status and balance of a bill in the local copy of Zoho."""
    import sqlite3

    from app.config import get_settings

    path = get_settings().database_url.split("///", 1)[1]
    with sqlite3.connect(path) as con:
        row = con.execute("SELECT status, balance FROM z_bills WHERE zoho_id = ?", (bill_id,)).fetchone()
    return tuple(row) if row else None


def test_bharat_straight_through_to_payment(client, samples):
    inv = upload(client, samples["bharat"], "bharat.pdf")
    assert inv["pipeline"]["state"] == "done", inv["pipeline"]
    assert inv["matchStatus"] == "pass"
    assert inv["matchMode"] == "3-way"
    assert inv["status"] == "Awaiting Approval"
    assert inv["recommendedAction"] == "Submit for posting"
    assert inv["vendorId"] == "V-100482"
    assert all(c["status"] == "pass" for c in inv["checks"]), inv["checks"]
    # Every header field can be traced to the page.
    po_field = next(f for f in inv["fields"] if f["key"] == "po")
    assert po_field["value"] == "4500127845" and po_field["bbox"] and po_field["page"] == 1
    assert len(inv["items"]) == 6 and all(i["poLineItemId"] for i in inv["items"])

    # Cannot submit before approval.
    r = client.post(f"/api/invoices/{inv['id']}/decision", json={"action": "submit"})
    assert r.status_code == 409

    # ₹45.96 L: AP Processor, Business Owner and Finance Controller; CFO not required.
    roles = {a["role"]: a["status"] for a in inv["approvals"]}
    assert roles == {"AP Processor": "pending", "Business Owner": "waiting",
                     "Finance Controller": "waiting", "CFO": "not_required"}
    # Segregation of duties: one person cannot approve twice.
    assert client.post(f"/api/invoices/{inv['id']}/approve", headers=AP).status_code == 200
    assert client.post(f"/api/invoices/{inv['id']}/approve", headers=AP).status_code == 409
    inv = approve_all(client, inv["id"], approvers=(OWNER, CONTROLLER))
    assert inv["status"] == "Approved"

    r = client.post(f"/api/invoices/{inv['id']}/decision", json={"action": "submit"}, headers=AP)
    assert r.status_code == 200, r.text
    inv = r.json()
    assert inv["status"] == "Posted" and inv["zohoBillId"]
    pay = inv["payments"][0]
    # A goods invoice with incidental commissioning lines: no TDS, so the payment is the full total.
    assert inv["tds"]["amount"] == 0
    assert pay["status"] == "proposed" and pay["amount"] == inv["total"] and pay["mode"] == "RTGS"

    # Two-person rule on release.
    assert client.post(f"/api/payments/{pay['id']}/release", headers=AP).status_code == 409
    assert client.post(f"/api/payments/{pay['id']}/release", headers=TREASURY).status_code == 200
    r = client.post(f"/api/payments/{pay['id']}/confirm", json={"utr": "HDFCN26091812847"}, headers=TREASURY)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "confirmed" and r.json()["zohoPaymentId"]

    inv = client.get(f"/api/invoices/{inv['id']}").json()
    assert inv["status"] == "Paid"
    # The bill was read back from Zoho on posting and on payment — no "Sync now" in between.
    rec = client.get("/api/reconciliation").json()["workspace"]
    bills_row = next(r for r in rec if r["label"] == "Command Center ↔ Zoho bills")
    assert bills_row["state"] == "Reconciled", bills_row
    assert _mirrored_bill(inv["zohoBillId"]) == ("paid", 0)
    stages = client.get(f"/api/invoices/{inv['id']}/t360").json()["stages"]
    assert all(s["done"] for s in stages if s["label"] not in ("Correction & revalidation",)), stages
    events = [e["event"] for e in client.get(f"/api/invoices/{inv['id']}/audit").json()]
    assert any("UTR HDFCN26091812847" in e for e in events)


def test_apex_quantity_variance_then_correction(client, samples):
    inv = upload(client, samples["apex"], "apex.pdf")
    assert inv["pages"] == 3
    assert inv["matchStatus"] == "fail"
    assert inv["status"] == "Exception"
    assert inv["recommendedAction"] == "Park invoice"
    d = inv["discrepancy"]
    assert d["line_no"] == 4 and "Quantity discrepancy" in d["title"]
    assert {"k": "Difference", "v": "+20 units", "tone": "err"} in d["figures"]
    total_before = inv["total"]
    # The totals block sits on page 3.
    assert next(f for f in inv["fields"] if f["key"] == "total")["page"] == 3

    # Evidence focuses on the failing line; PO/GRN rows are locked, the invoice row is editable.
    ev = client.get(f"/api/invoices/{inv['id']}/evidence").json()
    assert ev["focusLine"] == 4
    po_row, grn_row, inv_row = ev["rows"]
    assert (po_row["qty"], grn_row["qty"], inv_row["qty"]) == (100, 100, 120)
    assert po_row["locked"] and grn_row["locked"] and inv_row["editable"] and inv_row["variance"]

    # Approval is blocked while the exception stands.
    assert client.post(f"/api/invoices/{inv['id']}/approve").status_code == 409

    # Zoho-owned values are never overwritten — a source request is raised instead.
    r = client.post(f"/api/invoices/{inv['id']}/source-requests",
                    json={"document": "purchase_order", "field": "quantity", "requested_value": "120",
                          "reason": "Plant accepted 120 units"})
    assert r.status_code == 201 and r.json()["documentRef"] == "4500131207"

    # Correct the invoice quantity to the goods receipt; the match re-runs and passes.
    r = client.post(f"/api/invoices/{inv['id']}/corrections",
                    json={"target": "line", "line_no": 4, "field": "quantity", "value": "100",
                          "reason": "Quantity corrected to goods receipt"})
    assert r.status_code == 200, r.text
    inv = r.json()
    assert inv["matchStatus"] == "pass" and inv["corrected"]
    assert inv["status"] == "Awaiting Approval"
    assert round(total_before - inv["total"], 2) == round(20 * 4380 * 1.18, 2)
    assert inv["corrections"][0]["old"] == "120" and inv["corrections"][0]["new"] == "100"
    assert inv["advisory"]["state"] == "Resolved"
    events = [e["event"] for e in client.get(f"/api/invoices/{inv['id']}/audit").json()]
    assert any("line 4 quantity 120 → 100" in e for e in events)
    assert any("Match re-run · result: PASS" in e for e in events)


def test_vertex_non_po_with_tds(client, samples):
    inv = upload(client, samples["vertex"], "vertex.pdf")
    assert inv["matchStatus"] == "exception"
    assert inv["tds"] == {"section": "194J", "rate": 10.0, "amount": 80200.0}
    assert inv["netPayable"] == round(inv["total"] - 80200, 2)
    assert "GPO sign-off" in inv["recommendation"]

    # Park, then resume with a cost centre supplied.
    r = client.post(f"/api/invoices/{inv['id']}/decision", json={"action": "park", "reason": "Missing PO"})
    assert r.json()["status"] == "Parked"
    r = client.post(f"/api/invoices/{inv['id']}/decision", json={"action": "resume"})
    assert r.json()["status"] == "Exception"
    r = client.post(f"/api/invoices/{inv['id']}/corrections",
                    json={"target": "field", "key": "cost_centre", "value": "CC-COR-FIN-01",
                          "reason": "Cost centre confirmed by business owner"})
    inv = r.json()
    assert inv["matchStatus"] == "pass" and inv["costCentre"] == "CC-COR-FIN-01"
    assert any(a["status"] == "pending" for a in inv["approvals"])


def test_duplicate_upload_is_blocked(client, samples):
    inv = upload(client, samples["bharat"], "bharat-again.pdf")
    dup = next(c for c in inv["checks"] if c["code"] == "duplicate")
    assert dup["status"] == "fail"
    assert inv["recommendedAction"] == "Reject — duplicate"


def test_rejects_files_that_are_not_documents(client):
    r = client.post("/api/invoices", files={"file": ("x.pdf", b"not a pdf", "application/pdf")})
    assert r.status_code == 422


def test_inbox_filters_and_analytics(client, samples):
    cases = client.get("/api/invoices").json()
    assert cases["total"] >= 4
    assert all(r["caseId"].startswith("AP-") for r in cases["items"])
    non_po = client.get("/api/invoices", params={"type": "Non-PO"}).json()["items"]
    assert non_po and all(r["poType"] == "Non-PO" for r in non_po)
    assert client.get("/api/invoices", params={"q": "Apex"}).json()["total"] >= 1

    for persona in ("CFO", "AP Lead", "Finance Controller", "Finance User"):
        d = client.get("/api/dashboard", params={"persona": persona}).json()
        assert len(d["kpis"]) == 6 and d["funnel"][0][0] == "Received"

    recon = client.get("/api/reconciliation").json()
    assert recon["workspace"][0]["label"] == "Invoice ↔ payment"
    pos = client.get("/api/registers/purchase-orders").json()
    assert any(r["po"] == "4500131207" for r in pos["rows"])
    grns = client.get("/api/registers/receipts").json()
    assert any(r["status"] == "Quality hold" for r in grns["rows"])
    pr = client.get("/api/registers/purchase-orders/4500131207/requisition").json()
    assert pr["pr"] == "PR-2026-00512"
    assert client.get("/api/connectors").json()[0]["status"] == "connected"
    assert "parkReasons" in client.get("/api/config").json()


def test_copilot_answers_without_a_model(client, samples):
    inv_id = client.get("/api/invoices", params={"q": "AIS/26-27/1184"}).json()["items"][0]["id"]
    r = client.post(f"/api/invoices/{inv_id}/copilot", json={"question": "Where did the PO number come from?"})
    assert r.status_code == 200
    assert "4500131207" in r.json()["text"]
    assert len(client.get(f"/api/invoices/{inv_id}/copilot").json()["messages"]) == 2


def test_page_image_renders(client, samples):
    inv_id = client.get("/api/invoices", params={"q": "AIS/26-27/1184"}).json()["items"][0]["id"]
    r = client.get(f"/api/invoices/{inv_id}/pages/3")
    assert r.status_code == 200 and r.content.startswith(b"\x89PNG")
    assert client.get(f"/api/invoices/{inv_id}/pages/9").status_code == 404


def _pdf(text: str) -> bytes:
    import pymupdf

    doc = pymupdf.open()
    doc.new_page().insert_text((50, 50), text)
    return doc.tobytes()


def test_import_invoice_in_eur(client, fake):
    """INV-05 shape: non-resident supplier, no GSTIN, no GST, EUR, PO + goods receipt."""
    content = _pdf("Helvetia Instruments GmbH — HI-2026-004417")

    def f(v, page=1):
        return {"value": None if v is None else str(v), "confidence": 0.98 if v is not None else 0,
                "page": page, "box_2d": [100, 100, 120, 300] if v is not None else []}

    lines = [("Coordinate measuring probe kit CMM-40", "90319000", 4, 3850),
             ("Calibration master set, ceramic (Class 0)", "90318000", 2, 2470),
             ("Surface roughness tester SRT-210", "90318000", 1, 2150),
             ("Freight to CIP Bengaluru", "996521", 1, 520),
             ("Marine insurance", "997136", 1, 130)]
    payload = {
        "is_invoice": True, "document_type": "commercial_invoice",
        "vendor_name": f("Helvetia Instruments GmbH"), "vendor_gstin": f(None), "vendor_pan": f(None),
        "vendor_address": f("Landsberger Strasse 302\n80687 München"), "invoice_number": f("HI-2026-004417"),
        "invoice_date": f("2026-09-02"), "due_date": f("2026-10-02"), "po_number": f("4500134902"),
        "currency": f("EUR"), "payment_terms": f("30 days from bill of lading date"),
        "buyer_name": f("Aurora Manufacturing India Pvt Ltd"), "buyer_gstin": f("29AAACA9988R1ZG"),
        "buyer_address": f(None), "ship_to": f(None), "place_of_supply": f("Karnataka (29) — import"),
        "irn": f(None), "subtotal": f(23140), "cgst": f(None), "sgst": f(None), "igst": f(None), "cess": f(None),
        "round_off": f(None), "total": f(23140), "tds_section": f(None), "tds_amount": f(None),
        "net_payable": f(None),
        "line_items": [{"description": d, "hsn_sac": h, "quantity": q, "uom": None, "rate": r, "discount": 0,
                        "taxable_value": q * r, "tax_rate": 0, "cgst": 0, "sgst": 0, "igst": 0, "page": 1,
                        "box_2d": [200, 50, 215, 400], "confidence": 0.98} for d, h, q, r in lines],
    }
    fake.register(content, payload)
    inv = upload(client, content, "helvetia.pdf")
    assert inv["isImport"] and inv["currency"] == "EUR" and inv["fxRate"] == 94.2
    assert inv["totalInr"] == round(23140 * 94.2, 2)
    assert inv["matchStatus"] == "pass", inv["matchLines"]
    assert all(c["status"] == "pass" for c in inv["checks"]), inv["checks"]
    assert inv["tax"] == 0 and inv["tds"]["amount"] == 0
    # DOA uses the INR equivalent (₹21.8 L): Finance Controller required, CFO not.
    roles = {a["role"]: a["status"] for a in inv["approvals"]}
    assert roles["Finance Controller"] == "waiting" and roles["CFO"] == "not_required"


def test_revalidating_the_original_never_flags_it_as_the_duplicate(client, samples):
    original = client.get("/api/invoices", params={"q": "INV-2026-08452"}).json()["items"][-1]
    r = client.post(f"/api/invoices/{original['id']}/revalidate")
    if r.status_code == 409:  # already posted / paid in an earlier test — still must not be a duplicate
        r = client.get(f"/api/invoices/{original['id']}")
    dup = next(c for c in r.json()["checks"] if c["code"] == "duplicate")
    assert dup["status"] == "pass"


def test_scheduler_validates_in_arrival_order_even_when_extraction_finishes_out_of_order(client, fake):
    """The original is slow to extract and its copy is fast — the original must still win."""
    import asyncio
    import time

    import sample_invoices
    from app.config import get_settings

    original, copy = _pdf("ORDER-TEST original"), _pdf("ORDER-TEST copy (duplicate for transporter)")
    payload = sample_invoices.fake_extraction(
        "vertex", {}, invoice_number={"value": "ORD/2026/0001", "confidence": 0.99, "page": 1, "box_2d": []})
    fake.register(original, payload)
    fake.register(copy, payload)

    inner = fake.extract
    slow = {__import__("hashlib").sha256(original).hexdigest()}

    async def delayed(path, mime, pages):
        from pathlib import Path
        if __import__("hashlib").sha256(Path(path).read_bytes()).hexdigest() in slow:
            await asyncio.sleep(0.6)
        return await inner(path, mime, pages)

    fake.extract = delayed
    settings = get_settings()
    settings.async_processing = True
    try:
        first = upload(client, original, "original.pdf")
        second = upload(client, copy, "copy.pdf")
        deadline = time.time() + 15
        while time.time() < deadline:
            states = [client.get(f"/api/invoices/{i['id']}/progress").json()["state"] for i in (first, second)]
            if all(s in ("done", "error") for s in states):
                break
            time.sleep(0.1)
    finally:
        settings.async_processing = False
        fake.extract = inner

    a = client.get(f"/api/invoices/{first['id']}").json()
    b = client.get(f"/api/invoices/{second['id']}").json()
    assert next(c for c in a["checks"] if c["code"] == "duplicate")["status"] == "pass"
    assert next(c for c in b["checks"] if c["code"] == "duplicate")["status"] == "fail"


def test_posted_bills_are_not_double_counted_after_sync(client, samples):
    """Once Zoho reflects a posted bill in the PO's billed quantity, the app must not add it again."""
    from app.services.zoho.sync import get_client

    payload = next(p for p in get_client().bill_payloads if p["bill_number"] == "INV-2026-08452")
    # The bill ties each line to its PO line and its item (the receipt link).
    assert all(li.get("purchaseorder_item_id") and li.get("item_id") for li in payload["line_items"])
    # Received goods: every line cites the receipt line(s) it bills, for its full quantity.
    for li in payload["line_items"]:
        assert li["receive_line_items"] and all(r["receive_item_id"] for r in li["receive_line_items"])
        assert sum(r["quantity"] for r in li["receive_line_items"]) == li["quantity"]

    # Posting read the bill, the PO and its receipts back at once — current without a sync.
    rows = client.get("/api/registers/purchase-orders").json()["rows"]
    bharat_po = next(r for r in rows if r["po"] == "4500127845")
    assert bharat_po["invoiced"] == "100%", bharat_po

    assert client.post("/api/connectors/zoho/sync").status_code == 200
    rows = client.get("/api/registers/purchase-orders").json()["rows"]
    bharat_po = next(r for r in rows if r["po"] == "4500127845")
    assert bharat_po["invoiced"] == "100%", bharat_po  # 200% if counted in Zoho and locally


def test_tds_is_carried_on_the_zoho_bill(client, samples):
    """Service lines carry the matching Zoho TDS code; the bill's balance is net of TDS."""
    from app.services.zoho.sync import get_client

    inv = client.get("/api/invoices", params={"q": "VCS/2026/0417"}).json()["items"][0]
    for headers in (AP, OWNER):
        r = client.post(f"/api/invoices/{inv['id']}/approve", headers=headers)
        assert r.status_code == 200, r.text
    r = client.post(f"/api/invoices/{inv['id']}/decision", json={"action": "submit"}, headers=AP)
    assert r.status_code == 200, r.text
    posted = r.json()

    zoho = get_client()
    payload = next(p for p in zoho.bill_payloads if p["bill_number"] == "VCS/2026/0417")
    assert all(li.get("tds_tax_id") == "TDS-194J-10" for li in payload["line_items"])
    bill = next(b for b in zoho.bills if b["bill_id"] == posted["zohoBillId"])
    assert round(bill["total"] - bill["balance"], 2) == 80200.0
    assert posted["payments"][0]["amount"] == bill["balance"]  # the payment settles the bill exactly


def test_bill_posts_even_if_zoho_rejects_an_optional_field(client):
    """Organisations differ in which bill fields they accept; optional ones are dropped and recorded."""
    import asyncio

    from app.services.posting import create_bill_tolerant
    from app.services.zoho.client import ZohoError

    class Picky:
        def __init__(self):
            self.calls = 0

        async def create_bill(self, payload):
            self.calls += 1
            for bad in ("adjustment_description", "item_id"):
                if bad in payload or any(bad in li for li in payload["line_items"]):
                    raise ZohoError(f"Zoho POST /bills failed: Invalid Element {bad}", 400)
            return {"bill_id": "B-1", "payload": payload}

    warnings: list[str] = []
    payload = {"vendor_id": "V", "bill_number": "X", "date": "2026-09-01", "adjustment_description": "Round off",
               "line_items": [{"account_id": "A", "quantity": 1, "rate": 5, "item_id": "I"}]}
    out = asyncio.run(create_bill_tolerant(Picky(), payload, warnings))
    assert out["bill_id"] == "B-1" and len(warnings) == 2
    assert "item_id" not in out["payload"]["line_items"][0]

    class Strict:
        async def create_bill(self, payload):
            raise ZohoError("Zoho POST /bills failed: Invalid Element vendor_id", 400)

    try:
        asyncio.run(create_bill_tolerant(Strict(), dict(payload), []))
        raise AssertionError("an essential field must never be dropped")
    except ZohoError:
        pass


def test_a_line_cannot_be_corrected_to_zero(client, samples):
    inv = client.get("/api/invoices", params={"q": "INV-2026-08452"}).json()["items"][-1]
    detail = client.get(f"/api/invoices/{inv['id']}").json()
    if detail["status"] in ("Posted", "Paid"):  # posted in an earlier test — use the Apex invoice instead
        inv = client.get("/api/invoices", params={"q": "AIS/26-27/1184"}).json()["items"][0]
    r = client.post(f"/api/invoices/{inv['id']}/corrections",
                    json={"target": "line", "line_no": 1, "field": "quantity", "value": "0",
                          "reason": "Quantity corrected to goods receipt"})
    assert r.status_code == 409 and "greater than zero" in r.json()["detail"]


def _helvetia(fake, number: str) -> bytes:
    """A Helvetia invoice against PO 4500134902 (receipt 5001291884 in the demo organisation)."""
    import sample_invoices  # noqa: F401  (keeps the helper import path consistent)

    content = _pdf(f"Helvetia Instruments GmbH — {number}")

    def f(v):
        return {"value": None if v is None else str(v), "confidence": 0.98 if v is not None else 0,
                "page": 1, "box_2d": [100, 100, 120, 300] if v is not None else []}

    lines = [("Coordinate measuring probe kit CMM-40", "90319000", 4, 3850)]
    payload = {
        "is_invoice": True, "document_type": "commercial_invoice",
        "vendor_name": f("Helvetia Instruments GmbH"), "vendor_gstin": f(None), "vendor_pan": f(None),
        "vendor_address": f("Landsberger Strasse 302\n80687 München"), "invoice_number": f(number),
        "invoice_date": f("2026-09-12"), "due_date": f("2026-10-12"), "po_number": f("4500134902"),
        "currency": f("EUR"), "payment_terms": f("30 days"), "buyer_name": f("Aurora Manufacturing India Pvt Ltd"),
        "buyer_gstin": f("29AAACA9988R1ZG"), "buyer_address": f(None), "ship_to": f(None),
        "place_of_supply": f("Karnataka (29) — import"), "irn": f(None), "subtotal": f(15400), "cgst": f(None),
        "sgst": f(None), "igst": f(None), "cess": f(None), "round_off": f(None), "total": f(15400),
        "tds_section": f(None), "tds_amount": f(None), "net_payable": f(None),
        "line_items": [{"description": d, "hsn_sac": h, "quantity": q, "uom": None, "rate": r, "discount": 0,
                        "taxable_value": q * r, "tax_rate": 0, "cgst": 0, "sgst": 0, "igst": 0, "page": 1,
                        "box_2d": [200, 50, 215, 400], "confidence": 0.98} for d, h, q, r in lines],
    }
    fake.register(content, payload)
    return content


def test_a_receipt_recorded_in_zoho_counts_without_a_sync(client, fake):
    """The invoice's PO and receipts are re-read when it is checked — no "Sync now" in between."""
    from app.config import get_settings
    from app.services.zoho import mock

    settings = get_settings()
    ttl, settings.zoho_refresh_ttl_seconds = settings.zoho_refresh_ttl_seconds, 0
    receipt = next(r for r in mock.RECEIVES if r["receive_number"] == "5001291884")
    mock.RECEIVES.remove(receipt)  # Zoho: the goods have not been received yet
    try:
        inv = upload(client, _helvetia(fake, "HI-2026-004501"), "helvetia-2.pdf")
        assert inv["matchStatus"] != "pass", inv["matchLines"]

        mock.RECEIVES.append(receipt)  # the stores team records the receipt in Zoho
        r = client.post(f"/api/invoices/{inv['id']}/revalidate")
        assert r.status_code == 200, r.text
        assert r.json()["matchStatus"] == "pass", r.json()["matchLines"]
    finally:
        if receipt not in mock.RECEIVES:
            mock.RECEIVES.append(receipt)
        settings.zoho_refresh_ttl_seconds = ttl


def test_checks_fall_back_to_the_last_sync_when_zoho_is_unreachable(client, fake):
    from app.config import get_settings
    from app.services.zoho.client import ZohoError
    from app.services.zoho.sync import get_client

    settings = get_settings()
    ttl, settings.zoho_refresh_ttl_seconds = settings.zoho_refresh_ttl_seconds, 0
    zoho = get_client()

    async def down(*_a, **_k):
        raise ZohoError("Zoho daily API limit reached")

    try:
        inv = upload(client, _helvetia(fake, "HI-2026-004502"), "helvetia-3.pdf")
        zoho.get_purchase_order = down
        r = client.post(f"/api/invoices/{inv['id']}/revalidate")
        assert r.status_code == 200, r.text
        detail = client.get(f"/api/invoices/{inv['id']}").json()
        assert detail["matchStatus"] == "pass"  # the mirror still holds PO and receipt
        assert any("Could not re-read Zoho Books" in t["text"] for t in detail["timeline"]), detail["timeline"]
    finally:
        del zoho.get_purchase_order
        settings.zoho_refresh_ttl_seconds = ttl



def test_a_receipt_in_transit_does_not_count_as_received(client, fake):
    """Zoho's "In Transit" receipt: nothing has arrived, so the 3-way match must not pass."""
    from app.config import get_settings
    from app.services.zoho import mock

    settings = get_settings()
    ttl, settings.zoho_refresh_ttl_seconds = settings.zoho_refresh_ttl_seconds, 0
    receipt = next(r for r in mock.RECEIVES if r["receive_number"] == "5001291884")
    status = receipt["status"]
    receipt["status"] = "in_transit"
    try:
        inv = upload(client, _helvetia(fake, "HI-2026-004503"), "helvetia-4.pdf")
        assert inv["matchStatus"] == "fail", inv["matchLines"]
        issue = next(i for i in inv["matchLines"][0]["issues"] if i["code"] == "qty_grn")
        assert "in transit" in issue["text"] and "5001291884" in issue["text"]
        assert "in transit" in inv["recommendation"]

        receipt["status"] = status  # marked Received in Zoho
        r = client.post(f"/api/invoices/{inv['id']}/revalidate")
        assert r.status_code == 200, r.text
        assert r.json()["matchStatus"] == "pass", r.json()["matchLines"]
    finally:
        receipt["status"] = status
        settings.zoho_refresh_ttl_seconds = ttl


def test_receipt_register_shows_receive_and_bill_status(client, samples):
    """Each receipt carries Zoho's two statuses: received / in transit, and billed / yet to be billed."""
    rows = client.get("/api/registers/receipts").json()["rows"]
    billed = next(r for r in rows if r["grn"] == "5001279043")  # Bharat's receipt, posted in the first test
    assert billed["billStatus"] == "Billed", billed
    assert all(r["billStatus"] in ("Billed", "Partially billed", "Yet to be billed") for r in rows)
    assert all(r["status"] for r in rows)


def test_a_bill_deleted_in_zoho_returns_the_invoice_to_approved(client, samples):
    """Sync now notices the bill is gone: back to Approved, payment withdrawn, submittable again."""
    from app.services.zoho.sync import get_client

    inv = client.get("/api/invoices", params={"q": "VCS/2026/0417"}).json()["items"][0]
    inv = client.get(f"/api/invoices/{inv['id']}").json()
    assert inv["status"] == "Posted" and inv["zohoBillId"], inv["status"]
    bill_id = inv["zohoBillId"]
    zoho = get_client()
    zoho.bills = [b for b in zoho.bills if b["bill_id"] != bill_id]  # deleted in Zoho Books

    r = client.post("/api/connectors/zoho/sync", headers=AP)
    assert r.status_code == 200 and r.json()["billsDeleted"] == 1, r.text
    inv = client.get(f"/api/invoices/{inv['id']}").json()
    assert inv["status"] == "Approved" and inv["zohoBillId"] is None
    assert not inv["payments"]
    assert any("deleted in Zoho Books" in t["text"] for t in inv["timeline"])
    row = client.get("/api/invoices", params={"q": "VCS/2026/0417"}).json()["items"][0]
    assert row["zohoBillId"] is None and row["status"] == "Approved"

    # A paid invoice whose bill disappears is flagged, never unwound.
    paid = client.get("/api/invoices", params={"q": "INV-2026-08452"}).json()["items"][-1]
    paid_bill = client.get(f"/api/invoices/{paid['id']}").json()["zohoBillId"]
    kept = [b for b in zoho.bills if b["bill_id"] == paid_bill]
    zoho.bills = [b for b in zoho.bills if b["bill_id"] != paid_bill]
    try:
        client.post("/api/connectors/zoho/sync", headers=AP)
        paid = client.get(f"/api/invoices/{paid['id']}").json()
        assert paid["status"] == "Paid" and paid["zohoBillId"] == paid_bill
        assert any("after payment" in t["text"] for t in paid["timeline"])
    finally:
        zoho.bills += kept

    # Submitted again: a new bill, a new payment proposal.
    r = client.post(f"/api/invoices/{inv['id']}/decision", json={"action": "submit"}, headers=AP)
    assert r.status_code == 200, r.text
    again = r.json()
    assert again["status"] == "Posted" and again["zohoBillId"] and again["zohoBillId"] != bill_id
    assert [p["status"] for p in again["payments"]] == ["proposed"]


def test_cost_centre_comes_from_zoho_and_reaches_the_bill(client, samples):
    """Zoho's cost centre field: its values are offered to the UI and written onto the bill."""
    from app.services.zoho.sync import get_client

    assert "CC-COR-FIN-01" in client.get("/api/config").json()["costCentres"]
    # The non-PO invoice was coded to CC-COR-FIN-01 before posting.
    payload = next(p for p in get_client().bill_payloads if p["bill_number"] == "VCS/2026/0417")
    assert payload["custom_fields"] == [{"api_name": "cf_cost_centre", "value": "CC-COR-FIN-01"}]
