import type { CaseRow, Field, InvoiceDetail } from '../api/types'
import { xml, zip } from './extractionExcel'
import { LINE_HEADERS, lineItemRows } from './lineItemsExcel'

/** Full details for exactly the displayed rows, in displayed order. No partial export. */
export async function loadDisplayedInvoices(
  rows: Pick<CaseRow, 'id' | 'caseId'>[],
  fetchInvoice: (id: string) => Promise<InvoiceDetail>,
  onProgress: (done: number) => void = () => {},
  isActive: () => boolean = () => true,
): Promise<InvoiceDetail[]> {
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate cases in the displayed list. Refresh and retry.')
  const results: InvoiceDetail[] = new Array(rows.length)
  let next = 0, done = 0, failed = false
  async function worker() {
    while (!failed && isActive()) {
      const index = next++
      if (index >= rows.length) return
      try {
        const result = await fetchInvoice(rows[index].id)
        if (result.id !== rows[index].id) throw new Error('Unexpected invoice response')
        if (!isActive() || failed) return
        results[index] = result
        onProgress(++done)
      } catch {
        failed = true
        throw new Error(`Could not load ${rows[index].caseId}. Nothing was downloaded. Refresh the list and retry.`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, worker))
  if (!isActive() || done !== rows.length) throw new Error('Export cancelled because the displayed list changed.')
  return results
}

const DEFAULT_FIELDS: [string, string][] = [
  ['number','Invoice Number'], ['vendor','Vendor Name'], ['vendorId','Vendor ID'], ['gstin','GSTIN'],
  ['tinNumber','TIN_NUMBER'], ['vatNo','VAT_NO'],
  ['date','Invoice Date'], ['po','PO Number'], ['currency','Currency'],
  ['terms','Payment Terms'], ['entity','Billing Entity'], ['subtotal','Taxable Value'],
  ['tax','Tax Amount'], ['total','Total Amount'],
]
const BANK_FIELDS = [
  ['bank_name','Bank Name'], ['account_holder','Account Holder'], ['account_number','Account Number'],
  ['branch','Branch'], ['swift_bic','SWIFT/BIC'], ['ifsc','IFSC'], ['iban','IBAN'], ['currency','Currency'],
]
const fieldsOf = (invoice: InvoiceDetail): Field[] =>
  [...(invoice.fields ?? []), ...(invoice.supportingFields ?? [])].filter(field => !field.key.startsWith('bank.'))

export function allInvoiceTables(invoices: InvoiceDetail[]): { name: string; rows: string[][] }[] {
  const columns = new Map(DEFAULT_FIELDS)
  // A union of extraction field keys keeps TIN/GSTIN/VAT and optional supporting
  // fields aligned even when different invoices expose different field sets.
  for (const invoice of invoices) for (const field of fieldsOf(invoice)) columns.set(field.key, field.label)
  const keys = [...columns.keys()]
  const extractionRows = [
    ['Case ID', 'Supplier Name', ...columns.values(), 'Source File', 'Invoice Status'],
    ...invoices.map(invoice => {
      const fields = new Map(fieldsOf(invoice).map(field => [field.key, field.value]))
      return [invoice.caseId ?? '', fields.get('vendor') ?? invoice.vendor ?? '', ...keys.map(key => {
        // Never substitute inbox display placeholders or computed totals for a
        // genuinely missing extracted field. Identifiers remain exact strings.
        const value = fields.get(key)
        return value == null ? '' : String(value)
      }), invoice.fileName ?? '', invoice.status ?? '']
    }),
  ]
  const bankRows: string[][] = [['Case ID', 'Invoice Number', 'Bank Account', ...BANK_FIELDS.map(([, label]) => label)]]
  for (const invoice of invoices) {
    const invoiceNumber = invoice.fields?.find(field => field.key === 'number')?.value ?? invoice.number ?? ''
    for (const [index, account] of (invoice.bankAccounts ?? []).entries()) {
      bankRows.push([invoice.caseId ?? '', invoiceNumber, String(index+1), ...BANK_FIELDS.map(([key]) =>
        account.fields.find(field => field.key.endsWith('.'+key))?.value ?? '')])
    }
  }
  const lineRows = [LINE_HEADERS, ...invoices.flatMap(invoice => lineItemRows(invoice.items ?? [], invoice.caseId ?? '',
    invoice.fields?.find(field => field.key === 'number')?.value ?? invoice.number ?? '',
    invoice.fields?.find(field => field.key === 'currency')?.value ?? ''))]
  return [{ name: 'Extraction', rows: extractionRows }, { name: 'Bank Details', rows: bankRows }, { name: 'Line Items', rows: lineRows }]
}

function columnName(index: number): string {
  let name = ''
  for (let n = index+1; n > 0; n = Math.floor((n-1)/26)) name = String.fromCharCode(65+(n-1)%26)+name
  return name
}

export function allInvoicesWorkbook(invoices: InvoiceDetail[]): Uint8Array {
  if (!invoices.length) throw new Error('There are no displayed invoices to export.')
  const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const tables = allInvoiceTables(invoices)
  const namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const relation = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const sheets: [string,string][] = tables.map((table, index) => {
    const width = table.rows[0].length, end = `${columnName(width-1)}${table.rows.length}`
    if (width > 16384 || table.rows.length > 1048576) throw new Error('Too many rows or columns for one Excel sheet.')
    const rows = table.rows.map((cells, row) => {
      const height = Math.min(180, Math.max(30, ...cells.map(value => 15*Math.max(1, Math.ceil(value.length/30)))))
      return `<row r="${row+1}" ht="${height}" customHeight="1">${cells.map((value, col) => {
        if (value.length > 32767) throw new Error('An extracted field exceeds Excel’s cell length limit. No file was downloaded.')
        const ref = `${columnName(col)}${row+1}`
        // Explicit text cells preserve zero prefixes and cannot execute formulas.
        return value === '' ? `<c r="${ref}" s="0"/>` : `<c r="${ref}" s="${row ? 0 : 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`
      }).join('')}</row>`
    }).join('')
    return [`xl/worksheets/sheet${index+1}.xml`, `${declaration}<worksheet xmlns="${namespace}"><dimension ref="A1:${end}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols><col min="1" max="${width}" width="30" customWidth="1"/></cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${end}"/></worksheet>`]
  })
  return zip([
    ['[Content_Types].xml', `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${tables.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relation}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${declaration}<workbook xmlns="${namespace}" xmlns:r="${relation}"><sheets>${tables.map((table,i) => `<sheet name="${xml(table.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${tables.map((_, i) => `<Relationship Id="rId${i+1}" Type="${relation}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rIdStyles" Type="${relation}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `${declaration}<styleSheet xmlns="${namespace}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00338D"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ...sheets,
  ])
}

export function downloadAllInvoicesExcel(invoices: InvoiceDetail[]) {
  const bytes = allInvoicesWorkbook(invoices)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = 'AP_Invoices_Extraction.xlsx'; link.hidden = true
  document.body.append(link)
  try { link.click() }
  finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000) }
}
