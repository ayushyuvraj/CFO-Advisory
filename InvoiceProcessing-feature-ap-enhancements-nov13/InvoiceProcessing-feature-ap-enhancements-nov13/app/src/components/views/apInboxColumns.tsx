import type { ReactNode } from 'react'
import type { CaseRow } from '../../api/types'
import { statusTone, tone } from '../../lib/tone'
import { RawPill } from '../ui/Pill'

interface Definition {
  key: string; label: string; width: number; defaultVisible: boolean
  align?: 'right'; group: string; excelLabel?: string; aliases?: string
  cell: (row: CaseRow, open: (id: string) => void) => ReactNode
}
// These keys mirror the saved extraction fields used by the Excel export.
export const EXTRACTION_COLUMNS = [
  { key: 'vendorId', label: 'Vendor ID', group: 'Supplier & tax IDs', width: 150 },
  { key: 'gstin', label: 'GSTIN', group: 'Supplier & tax IDs', width: 165 },
  { key: 'tinNumber', label: 'TIN Number', excelLabel: 'TIN_NUMBER', group: 'Supplier & tax IDs', width: 155 },
  { key: 'vatNo', label: 'VAT Number', excelLabel: 'VAT_NO', group: 'Supplier & tax IDs', width: 155 },
  { key: 'terms', label: 'Payment Terms', group: 'Invoice details', width: 190 },
  { key: 'entity', label: 'Billing Entity', group: 'Buyer & delivery', width: 250 },
  { key: 'subtotal', label: 'Taxable Value', group: 'Amounts', width: 150 },
  { key: 'tax', label: 'Tax Amount', group: 'Amounts', width: 150 },
  { key: 'pan', label: 'Vendor PAN', group: 'Supplier & tax IDs', width: 150 },
  { key: 'buyerGstin', label: 'Buyer GSTIN', group: 'Buyer & delivery', width: 165 },
  { key: 'pos', label: 'Place of Supply', group: 'Buyer & delivery', width: 170 },
  { key: 'shipTo', label: 'Ship To', group: 'Buyer & delivery', width: 260 },
  { key: 'dueDate', label: 'Due Date', group: 'Invoice details', width: 135 },
  { key: 'irn', label: 'E-invoice IRN', group: 'Invoice details', width: 260 },
  { key: 'tds', label: 'TDS', group: 'Amounts', width: 135 },
  { key: 'netPayable', label: 'Net Payable', group: 'Amounts', width: 150 },
] as const
const extraValue = (row: CaseRow, key: string) => row.extractionValues?.[key] ?? '—'
// Labels, order, widths and cell rendering live together. Add new columns here.
const definitions = [
  { key: 'caseId', label: 'Case ID', width: 130, defaultVisible: true, group: 'Invoice details', cell: (r) => r.caseId },
  { key: 'number', label: 'Invoice No.', excelLabel: 'Invoice Number', width: 110, defaultVisible: true, group: 'Invoice details', cell: (r) => r.number },
  { key: 'zohoBill', label: 'Zoho Bill', width: 110, defaultVisible: true, group: 'Invoice details', cell: (r) => <span style={{ color: r.zohoBillId ? 'var(--color-text)' : 'var(--color-neutral-500)' }}>{r.zohoBillId ?? '—'}</span> },
  { key: 'vendor', label: 'Vendor', excelLabel: 'Vendor Name', width: 250, defaultVisible: true, group: 'Supplier', cell: (r) => r.vendor },
  { key: 'supplier', label: 'Supplier Name', width: 250, defaultVisible: true, group: 'Supplier', cell: (r) => <span title={r.vendor && r.vendor !== '—' ? r.vendor : 'Supplier name not available'}>{r.vendor?.trim() || '—'}</span> },
  { key: 'date', label: 'Invoice Date', width: 120, defaultVisible: true, group: 'Invoice details', cell: (r) => r.date },
  { key: 'po', label: 'PO Number', width: 135, defaultVisible: true, group: 'Invoice details', cell: (r) => r.po },
  { key: 'amount', label: 'Amount', excelLabel: 'Total Amount', width: 150, defaultVisible: true, group: 'Amounts', align: 'right', cell: (r) => r.amountText },
  { key: 'currency', label: 'Curr.', excelLabel: 'Currency', width: 75, defaultVisible: true, group: 'Amounts', cell: (r) => r.currency },
  { key: 'confidence', label: 'AI Conf.', width: 90, defaultVisible: true, group: 'Matching & status', align: 'right', cell: (r) => r.conf },
  { key: 'match', label: 'Match', width: 115, defaultVisible: true, group: 'Matching & status', cell: (r) => <span style={{ color: r.match.startsWith('⚠') ? 'var(--err)' : r.match === 'In review' ? 'var(--warn)' : 'var(--ok)' }}>{r.match}</span> },
  { key: 'status', label: 'Status', excelLabel: 'Invoice Status', width: 135, defaultVisible: true, group: 'Matching & status', cell: (r) => { const t = tone(statusTone(r.status)); return <RawPill fg={t.fg} bg={t.bg} line={t.line}>{r.status}</RawPill> } },
  { key: 'exception', label: 'Exception', width: 150, defaultVisible: true, group: 'Matching & status', cell: (r) => <span style={{ color: r.exception === '—' ? 'var(--color-neutral-500)' : 'var(--err)' }}>{r.exception}</span> },
  { key: 'action', label: 'Action', width: 105, defaultVisible: true, group: 'Matching & status', align: 'right', cell: (r, open) => <button type="button" className="btn btn-secondary btn-sm" onClick={event => { event.stopPropagation(); open(r.id) }}>{r.action}</button> },
  ...EXTRACTION_COLUMNS.map(column => ({ ...column, defaultVisible: false, cell: (row: CaseRow) => extraValue(row, column.key) })),
  { key: 'sourceFile', label: 'Source File', width: 280, defaultVisible: false, group: 'Invoice details', cell: (row) => row.sourceFile || '—' },
] as const satisfies readonly Definition[]
export type ColumnKey = typeof definitions[number]['key']
// Change the mandatory list ONLY here. It is enforced for UI and saved settings.
export const MANDATORY_COLUMNS: readonly ColumnKey[] = ['caseId', 'number', 'vendor', 'amount', 'status', 'action']
export const AP_INBOX_COLUMNS: (Definition & { key: ColumnKey; mandatory: boolean })[] = definitions.map(column => ({ ...column, mandatory: MANDATORY_COLUMNS.includes(column.key) }))
export const DEFAULT_COLUMNS: ColumnKey[] = AP_INBOX_COLUMNS.filter(c => c.defaultVisible || c.mandatory).map(c => c.key)

/** Discard unknown/duplicate keys and always restore required columns, in config order. */
export function normalizeColumns(value: unknown): ColumnKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_COLUMNS]
  const requested = new Set(value.filter((key): key is string => typeof key === 'string'))
  return AP_INBOX_COLUMNS.filter(c => c.mandatory || requested.has(c.key)).map(c => c.key)
}
export function isDefaultColumns(keys: readonly ColumnKey[]) {
  const normalized = normalizeColumns(keys)
  return normalized.length === DEFAULT_COLUMNS.length && normalized.every((key, i) => key === DEFAULT_COLUMNS[i])
}
export const COLUMNS_STORAGE_KEY = 'apInbox.visibleColumns.v1'
// Preferences are local to this browser and the acting user; no invoice data is stored.
export const columnsStorageKey = (user: string) => `${COLUMNS_STORAGE_KEY}:${encodeURIComponent(user)}`
export function loadColumns(user: string): ColumnKey[] {
  try {
    const saved = localStorage.getItem(columnsStorageKey(user))
    return saved === null ? [...DEFAULT_COLUMNS] : normalizeColumns(JSON.parse(saved))
  } catch { return [...DEFAULT_COLUMNS] }
}
export function saveColumns(user: string, value: readonly ColumnKey[]) {
  try {
    if (isDefaultColumns(value)) localStorage.removeItem(columnsStorageKey(user))
    else localStorage.setItem(columnsStorageKey(user), JSON.stringify(normalizeColumns(value)))
    return true
  } catch { return false }
}
