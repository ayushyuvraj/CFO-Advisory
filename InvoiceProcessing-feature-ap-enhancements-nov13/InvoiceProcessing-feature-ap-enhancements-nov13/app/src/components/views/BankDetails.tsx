import { useEffect, useState } from 'react'
import type { Field, InvoiceDetail } from '../../api/types'

/** Read-only invoice evidence. No preferred account or payment instruction. */
export function BankDetails({ inv, focusKey, onFocus }: {
  inv: InvoiceDetail; focusKey: string | null; onFocus: (field: Field) => void
}) {
  const accounts = inv.bankAccounts ?? []
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(accounts.length === 1 ? [accounts[0].id] : []))
  useEffect(() => {
    if (focusKey?.startsWith('bank.')) {
      const id = focusKey.split('.').slice(0, 2).join('.')
      setExpanded(previous => new Set([...previous, id]))
    }
  }, [focusKey])
  const value = (fields: Field[], name: string) => fields.find(f => f.key.endsWith('.' + name))?.value ?? ''
  return <section aria-label="Bank details" style={{ marginTop: 24, borderTop: '1px solid var(--color-divider)', paddingTop: 18 }}>
    <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>Bank Details ({accounts.length})</h3>
    <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-neutral-600)' }}>
      {accounts.length ? 'Accounts printed on this invoice. Expand an account and select a value to view its PDF evidence.'
        : inv.bankDetailsExtracted ? 'No bank details found.' : 'Bank details have not been extracted for this existing case.'}
    </p>
    <div style={{ display: 'grid', gap: 10 }}>
      {accounts.map((account, index) => {
        const open = expanded.has(account.id)
        const region = `bank-details-${index}`
        return <div key={account.id} style={{ border: '1px solid var(--color-divider)', borderRadius: 10, overflow: 'hidden' }}>
          <button type="button" aria-expanded={open} aria-controls={region}
            onClick={() => setExpanded(previous => {
              const next = new Set(previous)
              if (next.has(account.id)) next.delete(account.id); else next.add(account.id)
              return next
            })}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', background: 'var(--color-neutral-100)', border: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>Account {index+1} · {value(account.fields, 'bank_name') || 'Bank name not found'}</strong>
              <span style={{ display: 'block', marginTop: 4, fontSize: 12 }}>Account: {value(account.fields, 'account_number') || value(account.fields, 'iban') || 'Not found'}{value(account.fields, 'currency') ? ` · ${value(account.fields, 'currency')}` : ''}</span>
            </span>
            <span aria-hidden="true" style={{ flexShrink: 0 }}>{open ? '−' : '+'}</span>
          </button>
          <div id={region} hidden={!open} style={{ padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 10 }}>
              {account.fields.map(field => <div key={field.key} style={{ minWidth: 0 }}>
                <label htmlFor={field.key} style={{ display: 'block', fontSize: 11, marginBottom: 5 }}>{field.label}</label>
                <input id={field.key} aria-label={`Account ${index+1} ${field.label}`} className="input" value={field.value ?? ''} readOnly
                  onFocus={() => { if (field.value) onFocus(field) }}
                  onClick={() => { if (field.value) onFocus(field) }}
                  style={{ width: '100%', boxSizing: 'border-box', borderColor: focusKey === field.key ? 'var(--trace)' : 'var(--color-divider)' }} />
                <div style={{ fontSize: 10, marginTop: 4, color: 'var(--color-neutral-600)' }}>
                  {field.value ? `${field.confidence.toFixed(1)}% confidence · ${field.bbox ? `Source: page ${field.page}` : 'PDF location unavailable'}` : 'Not found'}
                </div>
              </div>)}
            </div>
          </div>
        </div>
      })}
    </div>
  </section>
}
