import { useLayoutEffect, useRef } from 'react'
import type { InvoiceDetail } from '../../api/types'

/** A read-only indicator for the currently displayed invoice and PDF page. */
export function CurrentInvoice({ inv, page }: { inv: InvoiceDetail; page: number }) {
  const invoices = inv.documentInvoices?.length
    ? [...inv.documentInvoices].sort((a, b) => a.startPage - b.startPage)
    : [{ id: inv.id, startPage: inv.invoiceStartPage ?? 1, endPage: inv.invoiceEndPage ?? inv.pages }]
  const index = invoices.findIndex(invoice => invoice.id === inv.id)
  const current = invoices[index]
  // Never label a supporting page or show a different case while it loads.
  if (!current || page < current.startPage || page > current.endPage) return null
  const label = `Invoice ${index+1} · ${inv.number || 'Number unavailable'} · Page ${page}`
  return <span role="status" aria-label="Current invoice" title={label} style={{
    display: 'inline-flex', alignItems: 'center', minHeight: 32, maxWidth: '100%',
    boxSizing: 'border-box', padding: '6px 10px', borderRadius: 7,
    border: '1px solid var(--color-divider)', background: 'var(--color-accent-100)',
    color: 'var(--color-accent-900)', fontSize: 12, fontWeight: 600, overflowWrap: 'anywhere',
  }}>{label}</span>
}

/** Uses existing case/page metadata; never creates, splits or extracts invoices. */
export function InvoiceNavigation({ inv, page, disabled = false, onSelect }: {
  inv: InvoiceDetail
  page: number
  disabled?: boolean
  onSelect: (id: string, startPage: number) => void
}) {
  const container = useRef<HTMLElement>(null)
  const invoices = inv.documentInvoices?.length
    ? [...inv.documentInvoices].sort((a, b) => a.startPage - b.startPage)
    : [{ id: inv.id, caseId: inv.caseId, number: inv.number,
         startPage: inv.invoiceStartPage ?? 1, endPage: inv.invoiceEndPage ?? inv.pages }]
  useLayoutEffect(() => {
    const nav = container.current
    const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !selected) return
    // Scroll only this strip, never the whole extraction page.
    const item = selected.getBoundingClientRect(), viewport = nav.getBoundingClientRect()
    if (item.left < viewport.left) nav.scrollLeft -= viewport.left - item.left
    else if (item.right > viewport.right) nav.scrollLeft += item.right - viewport.right
  }, [inv.id, page, inv.documentInvoices])

  return <nav ref={container} aria-label="Invoice navigation" style={{
    display: 'flex', gap: 8, overflowX: 'auto', minWidth: 0, maxWidth: '100%',
    padding: '3px 2px 7px', flex: '1 1 260px',
  }}>
    {invoices.map((invoice, index) => {
      const active = invoice.id === inv.id && page >= invoice.startPage && page <= invoice.endPage
      const pages = invoice.startPage === invoice.endPage ? `Page ${invoice.startPage}` : `Pages ${invoice.startPage}–${invoice.endPage}`
      const label = `Invoice ${index+1} · ${invoice.number || 'Number unavailable'} · ${pages}`
      return <button key={invoice.id} type="button"
        className={`btn btn-${active ? 'primary' : 'secondary'} btn-sm`}
        aria-current={active ? 'page' : undefined}
        disabled={disabled}
        title={label}
        onClick={() => onSelect(invoice.id, invoice.startPage)}
        style={{ flexShrink: 0, whiteSpace: 'nowrap', minHeight: 32,
                 padding: '0 9px', fontSize: 10.5, letterSpacing: '.02em' }}>
        {label}
      </button>
    })}
  </nav>
}
