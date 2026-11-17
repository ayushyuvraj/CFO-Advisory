/** Small, dependency-free XLSX export of the extraction fields on screen.
 * Values are explicit text cells, preserving identifiers/leading zeroes and
 * preventing any value from being interpreted as an Excel formula.
 */
import { LINE_HEADERS, lineItemRows } from './lineItemsExcel'
import type { Item, BankAccount } from '../api/types'

export interface ExportField { label: string; value: string | null | undefined }

const utf8 = new TextEncoder()
export const xml = (value: string) => Array.from(value).filter(c => {
  const n = c.codePointAt(0)!
  return n === 9 || n === 10 || n === 13 || (n >= 32 && n <= 0xd7ff) || (n >= 0xe000 && n <= 0xfffd) || n >= 0x10000
}).join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** ZIP STORE records: XLSX is an Open Packaging Convention ZIP container. */
export function zip(entries: [string, string][]): Uint8Array {
  const local: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0, directorySize = 0
  for (const [path, text] of entries) {
    const name = utf8.encode(path), data = utf8.encode(text), crc = crc32(data)
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer)
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true)
    h.setUint16(6, 0x0800, true); h.setUint16(12, 0x0021, true)
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true)
    h.setUint16(26, name.length, true); header.set(name, 30)
    local.push(header, data)
    const record = new Uint8Array(46 + name.length), c = new DataView(record.buffer)
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true); c.setUint16(14, 0x0021, true)
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true)
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true); record.set(name, 46)
    central.push(record); directorySize += record.length; offset += header.length + data.length
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true)
  e.setUint32(12, directorySize, true); e.setUint32(16, offset, true)
  const result = new Uint8Array(offset + directorySize + end.length)
  let position = 0
  for (const bytes of [...local, ...central, end]) { result.set(bytes, position); position += bytes.length }
  return result
}

export function extractionWorkbook(fields: ExportField[], accounts: BankAccount[] = [], items: Item[] = [], caseId = '', invoiceNumber = '', currency = ''): Uint8Array {
  const values = [['Field Name', 'Value'], ...fields.map(f => [f.label, f.value ?? ''])]
  const rows = values.map((cells, index) => {
    const row = index + 1
    const height = Math.max(22, Math.min(400, 16 * Math.max(...cells.map((s, i) => s.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / (i ? 85 : 30))), 0)))))
    return `<row r="${row}" ht="${height}" customHeight="1">${cells.map((text, col) => {
      if (text.length > 32767) throw new Error('A field is too long for an Excel cell (maximum 32,767 characters).')
      const ref = `${col ? 'B' : 'A'}${row}`
      return text === '' ? `<c r="${ref}" s="0"/>` : `<c r="${ref}" s="${index ? 0 : 1}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`
    }).join('')}</row>`
  }).join('')
  const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const bankKeys = ['bank_name', 'account_holder', 'account_number', 'branch', 'swift_bic', 'ifsc', 'iban', 'currency']
  const bankRows = [
    ['Bank Name', 'Account Holder', 'Account Number', 'Branch', 'SWIFT/BIC', 'IFSC', 'IBAN', 'Currency'],
    ...accounts.map(account => bankKeys.map(key => account.fields.find(f => f.key.endsWith('.' + key))?.value ?? '')),
  ]
  const bankSheet = `${declaration}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:H${bankRows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="32"/><cols><col min="1" max="2" width="42" customWidth="1"/><col min="3" max="8" width="26" customWidth="1"/></cols><sheetData>${bankRows.map((cells, i) => `<row r="${i+1}">${cells.map((text, col) => {
    if (text.length > 32767) throw new Error('A bank field is too long for an Excel cell.')
    const ref = `${String.fromCharCode(65+col)}${i+1}`
    return text === '' ? `<c r="${ref}" s="0"/>` : `<c r="${ref}" s="${i ? 0 : 1}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`
  }).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:H${bankRows.length}"/></worksheet>`
  const lineRows = [LINE_HEADERS, ...lineItemRows(items, caseId, invoiceNumber, currency)]
  const lineSheet = `${declaration}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:P${lineRows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="16" width="28" customWidth="1"/></cols><sheetData>${lineRows.map((cells, i) => `<row r="${i+1}" ht="48" customHeight="1">${cells.map((text,col) => {
    if (text.length > 32767) throw new Error('A line item is too long for an Excel cell.')
    return `<c r="${String.fromCharCode(65+col)}${i+1}" s="${i ? 0 : 1}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`
  }).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:P${lineRows.length}"/></worksheet>`
  return zip([
    ['[Content_Types].xml', `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${declaration}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Extraction" sheetId="1" r:id="rId1"/><sheet name="Bank Details" sheetId="2" r:id="rId3"/><sheet name="Line Items" sheetId="3" r:id="rId4"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `${declaration}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00338D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet2.xml', bankSheet],
    ['xl/worksheets/sheet3.xml', lineSheet],
    ['xl/worksheets/sheet1.xml', `${declaration}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:B${values.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="2" width="90" customWidth="1"/></cols><sheetData>${rows}</sheetData><autoFilter ref="A1:B${values.length}"/></worksheet>`],
  ])
}

export function downloadExtractionExcel(fields: ExportField[], invoiceNumber: string, caseId: string, accounts: BankAccount[] = [], items: Item[] = [], currency = '') {
  const bytes = extractionWorkbook(fields, accounts, items, caseId, invoiceNumber, currency)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  const name = `${invoiceNumber || caseId}_extraction`.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140)
  link.href = url; link.download = `${name}.xlsx`; link.hidden = true
  document.body.append(link)
  try { link.click() }
  finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000) }
}
