"""Location-only regression checks using generated/mocked documents."""
import copy

import pymupdf

from conftest import upload
from app.services import locate, scan_locations


def test_scan_fields_never_use_neighbouring_estimates(tmp_path, monkeypatch):
    pdf = pymupdf.open()
    pdf.new_page(width=600, height=800)
    path = tmp_path / 'blank-scan.pdf'
    pdf.save(path)
    pdf.close()
    rows = [('TZS', .99, [400, 200, 430, 210]),
            ('123-456-789', .99, [400, 220, 480, 230]),
            ('VAT-999', .99, [400, 240, 470, 250]),
            ('1,234.50', .99, [400, 600, 460, 610]),
            ('TAX TOTAL', .99, [280, 650, 350, 660]),
            ('1,234.50', .99, [400, 650, 460, 660])]
    monkeypatch.setattr(scan_locations, 'read_page', lambda page: rows)
    fields = [{'key': k, 'value': v, 'page': 1, 'bbox': [.66, .25, .8, .265]}
              for k, v in [('tinNumber', '123-456-789'), ('vatNo', 'VAT-999'),
                           ('currency', 'TZS'), ('tax', '1234.50'), ('po', 'NOT-PRINTED')]]
    before = copy.deepcopy(fields)
    found, _ = locate.snap(str(path), fields, [])
    assert fields == before
    assert found['currency'][1][1] < found['tinNumber'][1][1] < found['vatNo'][1][1]
    assert found['tax'][1][1] > .80  # explicit total-tax row, not repeated amount
    assert found['po'][1] is None


def test_out_of_context_locations_are_cleared(tmp_path, monkeypatch):
    pdf = pymupdf.open()
    pdf.new_page()
    pdf.new_page()
    path = tmp_path / 'two.pdf'
    pdf.save(path)
    pdf.close()
    def unexpected(page):
        raise AssertionError('must not OCR another invoice page')
    monkeypatch.setattr(scan_locations, 'read_page', unexpected)
    found, _ = locate.snap(str(path), [{'key': 'number', 'value': 'A123', 'page': 2,
                                       'bbox': [.1, .1, .2, .2]}], [], page_range=(1, 1))
    assert found['number'] == (2, None)


def test_location_refresh_preserves_business_state(client, samples):
    inv = upload(client, samples['apex'], 'location-test.pdf')
    before = client.get('/api/invoices/' + inv['id']).json()
    response = client.post('/api/invoices/' + inv['id'] + '/refresh-locations')
    assert response.status_code == 200, response.text
    after = client.get('/api/invoices/' + inv['id']).json()
    for key in ('id', 'caseId', 'status', 'pipeline', 'number', 'total', 'tax',
                'checks', 'approvals', 'payments', 'match', 'decision'):
        assert after.get(key) == before.get(key), key
    for a, b in zip(before['fields'], after['fields']):
        assert {k:v for k,v in a.items() if k not in ('bbox', 'page')} == {
            k:v for k,v in b.items() if k not in ('bbox', 'page')}


def test_location_refresh_masks_errors_and_rolls_back(client, samples, monkeypatch):
    from app.services import pipeline
    inv = upload(client, samples['apex'], 'error-test.pdf')
    before = client.get('/api/invoices/' + inv['id']).json()
    async def fail(target):
        target.fields[0].bbox = [.9, .9, 1, 1]
        raise RuntimeError('private document text and credentials must never be returned')
    monkeypatch.setattr(pipeline, 'snap_locations', fail)
    response = client.post('/api/invoices/' + inv['id'] + '/refresh-locations')
    assert response.status_code == 503
    assert 'credentials' not in response.text and 'private document' not in response.text
    after = client.get('/api/invoices/' + inv['id']).json()
    assert after['fields'] == before['fields']
