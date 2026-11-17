import type { Item } from '../api/types'

/** Saved line values only: do not invent missing amounts or currency symbols. */
export function lineItemRows(items: Item[], caseId: string, invoiceNumber: string, currency: string = ''): string[][] {
  const text = (value: unknown) => value == null ? '' : String(value)
  return items.map(item => [caseId, invoiceNumber, text(item.lineNo), text(item.desc), text(item.hsn),
    text(item.uom), text(item.qty), text(item.rate), text(item.discount), text(item.taxPct),
    text(item.taxable), text(item.cgst), text(item.sgst), text(item.igst), currency, text(item.page)])
}
export const LINE_HEADERS = ['Case ID', 'Invoice Number', 'Line Number', 'Description', 'HSN/SAC',
  'Unit', 'Quantity', 'Unit Price', 'Discount', 'Tax Rate (%)', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Currency', 'Source Page']
