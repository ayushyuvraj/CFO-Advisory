import type { Tone } from '../types'
import type { Field, InvoiceDetail, Item, MatchStatus } from '../api/types'

/** The match verdict as a headline and a reason, from what the engine returned. */
export function verdictText(inv: InvoiceDetail): { verdict: string; reason: string } {
  const mode = inv.matchMode === '2-way' ? '2-Way Match' : inv.matchMode === 'non-po' ? 'Non-PO' : '3-Way Match'
  const status = inv.matchStatus
  if (status === 'pass') {
    return {
      verdict: inv.matchMode === 'non-po' ? '✓ Non-PO invoice cleared' : `✓ ${mode} Passed`,
      reason: inv.corrected
        ? 'Passed after an authorised correction — the change is in the audit trail.'
        : inv.matchMode === 'non-po'
          ? 'No purchase order applies; the invoice is coded and routed for business-owner approval.'
          : 'Invoice, purchase order and goods receipt reconcile with no material variance.',
    }
  }
  if (status === 'fail') {
    return {
      verdict: `⚠ ${mode} Failed`,
      reason: inv.discrepancy?.where ?? 'The match found a variance that blocks posting.',
    }
  }
  if (status === 'exception') {
    return { verdict: '⚠ Exception detected', reason: inv.recommendation ?? 'No purchase order was identified.' }
  }
  return { verdict: 'Awaiting match', reason: 'The invoice has not been matched yet.' }
}

export function verdictTone(status: MatchStatus | null): Tone {
  return status === 'pass' ? 'ok' : status === 'fail' ? 'err' : status === 'exception' ? 'warn' : 'plain'
}

/** The twelve header fields of the extraction panel, in display order. */
export function headerFields(inv: InvoiceDetail): Field[] {
  return inv.fields
}

/** Every traceable thing on the document: header fields and line items. */
export interface Traceable {
  key: string
  label: string
  page: number
  bbox: Field['bbox']
}

export function traceables(inv: InvoiceDetail): Traceable[] {
  const fields = [...inv.fields, ...inv.supportingFields]
    .filter((f) => f.value)
    .map((f) => ({ key: f.key, label: f.label, page: f.page, bbox: f.bbox }))
  const items = inv.items.map((it: Item) => ({
    key: 'item' + it.lineNo,
    label: `Line ${it.lineNo} — ${it.desc}`,
    page: it.page,
    bbox: it.bbox,
  }))
  return [...fields, ...items]
}

export function findTraceable(inv: InvoiceDetail, key: string | null): Traceable | null {
  if (!key) return null
  return traceables(inv).find((t) => t.key === key) ?? null
}

/** Status tone for the whole transaction, for pills and advisories. */
export function invoiceTone(inv: InvoiceDetail): Tone {
  if (inv.pipeline.state === 'error') return 'err'
  if (inv.status === 'Exception') return inv.matchStatus === 'exception' ? 'warn' : 'err'
  if (inv.status === 'Posted' || inv.status === 'Paid' || inv.status === 'Approved') return 'ok'
  if (inv.status === 'Parked' || inv.status === 'Validation Required' || inv.status === 'Awaiting Approval') return 'warn'
  return 'info'
}

export function isFinal(inv: InvoiceDetail): boolean {
  return inv.status === 'Posted' || inv.status === 'Paid'
}
