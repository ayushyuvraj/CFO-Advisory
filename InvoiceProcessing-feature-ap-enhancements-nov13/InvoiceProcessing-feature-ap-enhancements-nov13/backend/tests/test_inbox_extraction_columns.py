"""Read-only Inbox projection; no database or provider calls required."""
from types import SimpleNamespace

from app.services.serializers import INBOX_EXTRACTION_KEYS, case_row


def invoice(fields):
    return SimpleNamespace(
        id="one", case_id="AP-001", txn_id="TX-001", invoice_number="00031121",
        zoho_bill_id=None, vendor_name="Supplier", file_name="source.pdf", fields=fields,
        currency="TZS", invoice_date=None, received_at=None, po_number=None, total=100,
        extraction_confidence=.98, pipeline_state="done", status="Exception", stage="review",
        match_status="exception", checks=[], match_result={}, park_reason=None,
        recommendation=None, error=None, activity=[],
    )


def test_extra_fields_match_saved_values_without_changing_existing_columns():
    fields = [SimpleNamespace(key=key, value="saved-" + key) for key in INBOX_EXTRACTION_KEYS]
    inv = invoice(fields)
    row = case_row(inv)
    assert row["extractionValues"] == {field.key: field.value for field in fields}
    assert row["sourceFile"] == "source.pdf"
    assert row["vendor"] == "Supplier"
    assert row["number"] == "00031121"
    assert row["caseId"] == "AP-001"
    assert inv.fields == fields  # Serialization does not mutate extraction records.


def test_projection_preserves_nulls_zero_and_leading_zeros_and_omits_unrelated_values():
    row = case_row(invoice([
        SimpleNamespace(key="tinNumber", value="000123"),
        SimpleNamespace(key="tds", value="0"),
        SimpleNamespace(key="gstin", value=None),
        SimpleNamespace(key="terms", value=""),
        SimpleNamespace(key="bank.1.account_number", value="not-an-inbox-column"),
        SimpleNamespace(key="provider_error", value="not-exposed"),
    ]))
    assert row["extractionValues"] == {"tinNumber": "000123", "tds": "0", "gstin": None, "terms": ""}


def test_old_or_incomplete_invoices_have_an_empty_optional_projection():
    assert case_row(invoice([]))["extractionValues"] == {}


def test_inbox_api_matches_saved_detail_and_reading_does_not_change_it(client, samples):
    from conftest import upload
    detail = upload(client, samples["bharat"], "inbox-columns.pdf")
    assert detail["pipeline"]["state"] == "done"
    response = client.get("/api/invoices?limit=500")
    assert response.status_code == 200
    row = next(row for row in response.json()["items"] if row["id"] == detail["id"])
    saved = {field["key"]: field["value"] for field in detail["fields"] + detail["supportingFields"]}
    for key in INBOX_EXTRACTION_KEYS:
        assert row["extractionValues"].get(key) == saved.get(key)
    assert row["sourceFile"] == detail["fileName"]
    again = client.get(f"/api/invoices/{detail['id']}").json()
    assert again["fields"] == detail["fields"]
    assert again["supportingFields"] == detail["supportingFields"]
    assert again["status"] == detail["status"]
