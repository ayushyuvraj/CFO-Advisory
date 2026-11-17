"""Bank additions are isolated from invoice validation, totals and payment routing."""
import asyncio
from copy import deepcopy
from types import SimpleNamespace

import pymupdf
import pytest

from app.services import bank_details, extraction, locate, pipeline
from conftest import upload


def field(value, page=1, box=None):
    return dict(value=value, confidence=.98, page=page, box_2d=box or [100, 100, 120, 400])


def account(name='Example Bank', number='00123456789', page=1):
    return dict(bank_name=field(name, page), account_number=field(number, page),
                currency=field('TZS', page))


@pytest.mark.parametrize('count', [0, 1, 3, 27])
def test_variable_count_and_missing_values(count):
    rows = list(bank_details.account_fields([account(number=f'000{i:04}') for i in range(count)], 2))
    result = bank_details.bank_accounts([SimpleNamespace(**row) for row in rows])
    assert len(result) == count
    for i, item in enumerate(result):
        values = {f['label']: f['value'] for f in item['fields']}
        assert values['Account Number'] == f'000{i:04}'
        assert values['Branch'] is None
        assert len(item['fields']) == 8


def test_same_bank_separate_accounts_not_collapsed():
    assert len(list(bank_details.account_fields([account(number='001'), account(number='002')], 1))) == 16


def test_exact_repeated_account_block_is_not_duplicated():
    assert len(list(bank_details.account_fields([account(), account()], 1))) == 8


def test_malformed_numeric_and_empty_entries_not_coerced():
    assert list(bank_details.account_fields([{}, None, {'account_number': field(123)}], 1)) == []


def test_original_page_context_is_enforced():
    context = {'startPage': 2, 'endPage': 3}
    rows = list(bank_details.account_fields([account(page=2)], 5, context))
    assert all(row['page'] == 2 for row in rows)
    with pytest.raises(ValueError, match='outside'):
        list(bank_details.account_fields([account(page=4)], 5, context))


def test_missing_bbox_never_invented():
    a = account()
    a['account_number']['box_2d'] = [500, 500, 100, 100]
    rows = list(bank_details.account_fields([a], 1))
    assert next(row for row in rows if row['label'] == 'Account Number')['bbox'] is None


def test_digital_bank_boxes_use_full_names(tmp_path):
    path = tmp_path / 'banks.pdf'
    with pymupdf.open() as pdf:
        page = pdf.new_page()
        page.insert_text((60, 80), 'Example National Bank East')
        page.insert_text((60, 120), 'Example National Bank West')
        pdf.save(path)
    boxes, _ = locate.snap(str(path), [dict(key='bank.2.bank_name', value='Example National Bank West', page=1, bbox=None)], [])
    assert boxes['bank.2.bank_name'][1][1] > .12


def test_schema_defaults_and_identifier_strings():
    a = extraction.XBankAccount.model_validate(account())
    assert a.account_number.value == '00123456789'
    assert a.iban.value is None
    with pytest.raises(Exception):
        extraction.XBankAccount.model_validate({'account_number': field(1234)})


def test_selected_pages_remap_all_bank_fields(monkeypatch):
    from app.services import documents, invoice_tax_evidence
    from app.config import get_settings
    async def render(*args): return b'image'
    async def text(*args): return ['', '', '', '']
    payload = dict(bank_accounts=[account(page=1)], line_items=[])
    class Payload:
        def model_dump(self): return deepcopy(payload)
    async def call(*args): return Payload()
    extractor = object.__new__(extraction.GeminiExtractor)
    extractor._call = call
    monkeypatch.setattr(documents, 'arender_page', render)
    monkeypatch.setattr(documents, 'apage_text', text)
    monkeypatch.setattr(invoice_tax_evidence, 'anchor_total_tax', lambda path, result, page_range: result)
    monkeypatch.setattr(get_settings(), 'extraction_second_pass', False)
    result = asyncio.run(extractor.extract_pages('unused', 'application/pdf', 4, 3, 4))
    assert result['bank_accounts'][0]['account_number']['page'] == 3


def test_bank_api_persistence_highlight_refresh_and_totals(client, samples, fake):
    """Real upload/pipeline/DB/serializer plus coordinates-only refresh."""
    import hashlib
    content = samples[next(iter(samples))]
    digest = hashlib.sha256(content).hexdigest()
    original = deepcopy(fake.by_hash[digest])
    augmented = deepcopy(original)
    augmented['bank_accounts'] = [account(number='000001'), account(number='000002'), account(number='000003')]
    fake.by_hash[digest] = augmented
    invoice_id = None
    try:
        result = upload(client, content, 'bank-test.pdf')
        invoice_id = result['id']
        response = client.get(f'/api/invoices/{invoice_id}', headers={'X-User': 's.joshi@genstar-demo.in'})
        assert response.status_code == 200
        data = response.json()
        assert data['bankDetailsExtracted'] is True
        assert len(data['bankAccounts']) == 3
        assert data['bankAccounts'][0]['fields'][2]['value'] == '000001'
        old_values = [f['value'] for a in data['bankAccounts'] for f in a['fields']]
        refreshed = client.post(f'/api/invoices/{invoice_id}/refresh-locations', headers={'X-User': 's.joshi@genstar-demo.in'})
        assert refreshed.status_code == 200, refreshed.text
        after = client.get(f'/api/invoices/{invoice_id}', headers={'X-User': 's.joshi@genstar-demo.in'}).json()
        assert [f['value'] for a in after['bankAccounts'] for f in a['fields']] == old_values
        assert after['total'] == data['total']
        assert after['number'] == data['number']
    finally:
        fake.by_hash[digest] = original
        if invoice_id:
            from sqlalchemy import delete
            from app.db import session_scope
            from app.models import AuditEvent, Invoice
            async def cleanup():
                async with session_scope() as db:
                    await db.execute(delete(AuditEvent).where(AuditEvent.invoice_id == invoice_id))
                    await db.delete(await db.get(Invoice, invoice_id))
            client.portal.call(cleanup)
