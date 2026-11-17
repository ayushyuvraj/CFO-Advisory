"""Verify the actual SDK request schemas, not only mocked final extraction data."""
import asyncio
from types import SimpleNamespace
import pytest
from app.services.extraction import (
    XInvoice, BankCells, BankCell, EnrichedInvoice, GeminiExtractor, bank_cells_to_accounts,
)


def test_bank_schema_is_separate_and_flat():
    assert 'bank_accounts' not in XInvoice.model_fields
    assert 'XBankAccount' not in XInvoice.model_json_schema().get('$defs', {})
    assert set(BankCell.model_fields) == {'account','field','value','confidence','page','box_2d'}
    assert set(BankCells.model_fields) == {'fields'}
    assert 'bank_accounts' in EnrichedInvoice.model_fields  # local storage shape retained


def test_real_call_sends_two_independent_schemas(fake, samples):
    # Exercise the real _call, mocking only the remote transport.
    payload = next(iter(fake.by_hash.values()))
    invoice = XInvoice.model_validate(payload)
    calls = []
    async def generate_content(**kwargs):
        schema = kwargs['config'].response_schema
        calls.append(schema)
        if schema is XInvoice:
            return SimpleNamespace(parsed=invoice)
        assert schema is BankCells
        return SimpleNamespace(parsed=None, text='{"fields":[{"account":1,"field":"account_number","value":"00001234","confidence":0.98,"page":1,"box_2d":[100,100,120,300]}]}')
    extractor = object.__new__(GeminiExtractor)
    extractor.model = 'fake-test-model'
    extractor.client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))
    result = asyncio.run(extractor._call([b'image'], 'synthetic fixture only')).model_dump()
    assert calls == [XInvoice, BankCells]
    assert result['invoice_number'] == invoice.invoice_number.model_dump()
    assert result['bank_accounts'][0]['account_number']['value'] == '00001234'
    assert result['bank_accounts'][0]['iban']['value'] is None


def test_bank_groups_do_not_merge_accounts():
    cells = BankCells(fields=[BankCell(account=i, field='account_number', value=f'000{i}',
                             confidence=.9, page=1, box_2d=[]) for i in (2, 1, 3)])
    assert [a.account_number.value for a in bank_cells_to_accounts(cells, 1)] == ['0001','0002','0003']
    cells.fields[0].page = 2
    with pytest.raises(ValueError, match='metadata'):
        bank_cells_to_accounts(cells, 1)


def test_conflicting_values_are_rejected():
    cells = BankCells(fields=[BankCell(account=1, field='account_number', value=v,
                             confidence=.9, page=1, box_2d=[]) for v in ('001','002')])
    with pytest.raises(ValueError, match='Conflicting'):
        bank_cells_to_accounts(cells, 1)
