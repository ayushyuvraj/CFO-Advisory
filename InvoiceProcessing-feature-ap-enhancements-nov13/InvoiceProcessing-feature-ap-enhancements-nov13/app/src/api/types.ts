/** Response shapes from the backend (see backend/app/services/serializers.py). */

import type { Tone, View } from '../types'

export type MatchStatus = 'pass' | 'fail' | 'exception'
export type CheckStatus = 'pass' | 'warn' | 'fail'
/** [x0, y0, x1, y1] normalised to 0–1, origin top-left. */
export type BBox = [number, number, number, number]

export interface Check {
  code: string
  label: string
  status: CheckStatus
  detail: string
  reason: string | null
}

export interface Field {
  key: string
  label: string
  value: string | null
  original?: string | null
  confidence: number
  page: number
  bbox: BBox | null
  corrected?: boolean
}

export interface Item {
  lineNo: number
  desc: string
  hsn: string | null
  uom: string | null
  qty: number
  rate: number
  discount: number
  taxable: number
  taxPct: number
  cgst: number
  sgst: number
  igst: number
  page: number
  bbox: BBox | null
  confidence: number
  originalQty: number | null
  poLineItemId: string | null
}

export interface MatchIssue {
  code: string
  text: string
  status: CheckStatus
}

export interface MatchLine {
  line_no: number
  description: string
  page: number
  invoiced: number
  rate: number
  tax_rate: number
  po_line_item_id: string | null
  po_line_no: number | null
  ordered: number | null
  billed_before: number
  received: number | null
  accepted: number | null
  po_rate: number | null
  po_tax_rate: number | null
  score: number
  status: CheckStatus
  issues: MatchIssue[]
}

export interface MatchCard {
  title: string
  status: string
  tone: Tone
  rows: { k: string; v: string; tone?: Tone }[]
}

export interface ReconRow {
  k: string
  inv: string
  ref: string
  res: string
}

export interface Discrepancy {
  title: string
  line_no: number
  code: string
  where: string
  figures: { k: string; v: string; tone: Tone }[]
}

export interface Advisory {
  title: string
  tone: Tone
  state: string
  text: string | null
  figures: { k: string; v: string }[]
  actions: string[]
}

export interface Approval {
  level: number
  role: string
  name: string
  email: string | null
  limit: string
  state: string
  status: 'approved' | 'pending' | 'rejected' | 'waiting' | 'not_required'
  tone: Tone
  mark: string
  when: string
  actedBy: string | null
  comment: string | null
}

export interface PaymentStage {
  label: string
  note: string
  state: string
  tone: Tone
  mark: string
}

export interface Payment {
  id: number
  ref: string
  runId: string
  invoiceId: string
  vendor: string | null
  gross: number
  tds: number
  amount: number
  amountText: string
  currency: string
  dueDate: string
  mode: string
  bankAccount: string
  status: 'proposed' | 'released' | 'confirmed' | 'failed'
  preparedBy: string
  releasedBy: string | null
  releasedAt: string | null
  utr: string | null
  confirmedAt: string | null
  zohoPaymentId: string | null
  stages: PaymentStage[]
}

export interface CorrectionEntry {
  when: string
  user: string
  target: string
  lineNo: number | null
  field: string
  old: string | null
  new: string | null
  reason: string
  comment: string | null
  text: string
}

export interface SourceRequest {
  ref: string
  document: string
  documentRef: string | null
  field: string
  current: string | null
  requested: string | null
  reason: string
  status: string
  raisedBy: string
  when: string
}

export interface TimelineEntry {
  time: string
  text: string
  mark: string
}

export interface BankAccount {
  id: string
  fields: Field[]
}

export interface InvoiceDetail {
  bankAccounts?: BankAccount[]
  bankDetailsExtracted?: boolean
  documentInvoices?: { id:string; caseId:string; number:string | null; startPage:number; endPage:number }[]
  invoiceStartPage?: number
  invoiceEndPage?: number
  id: string
  txnId: string
  caseId: string
  status: string
  stage: string
  channel: string
  fileName: string
  pages: number
  receivedAt: string
  pipeline: { state: 'queued' | 'running' | 'done' | 'error'; step: number; steps: string[]; error: string | null }
  vendor: string | null
  vendorId: string | null
  gstin: string | null
  pan: string | null
  addr: string[]
  docType: string | null
  kind: string
  number: string | null
  date: string
  dateIso: string | null
  dueDate: string
  po: string
  poLabel: string
  currency: string
  fxRate: number
  totalInr: number
  isImport: boolean
  terms: string | null
  irn: string | null
  entity: string | null
  entityAddr: string[]
  buyerGstin: string | null
  shipTo: string | null
  pos: string | null
  supplyType: string
  costCentre: string | null
  glAccount: string | null
  businessUnit: string | null
  items: Item[]
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  tax: number
  roundOff: number
  total: number
  tds: { section: string | null; rate: number; amount: number }
  netPayable: number
  subtotalText: string
  taxText: string
  totalText: string
  netPayableText: string
  taxLabel: string
  grandLabel: string
  fields: Field[]
  supportingFields: Field[]
  fieldConf: Record<string, number>
  extractionConfidence: string
  checks: Check[]
  matchStatus: MatchStatus | null
  matchMode: string | null
  matchConfidence: string
  riskLevel: string | null
  recommendedAction: string | null
  recommendation: string | null
  validationNarrative: string | null
  discrepancy: Discrepancy | null
  match: MatchCard[]
  recon: ReconRow[]
  matchLines: MatchLine[]
  advisory: Advisory | null
  timeline: TimelineEntry[]
  corrected: boolean
  corrections: CorrectionEntry[]
  sourceRequests: SourceRequest[]
  approvals: Approval[]
  decision: { type: 'submit' | 'park' | 'clarify' | null; parkReason: string | null; note: string | null; when: string | null }
  zohoBillId: string | null
  payments: Payment[]
}

export interface Progress {
  state: InvoiceDetail['pipeline']['state']
  step: number
  steps: string[]
  status: string
  error: string | null
}

export interface CaseRow {
  /** Read-only saved extraction values for optional Inbox columns. */
  extractionValues?: Record<string, string | null>
  sourceFile?: string | null
  id: string
  caseId: string
  txnId: string
  number: string
  /** Zoho Books bill ID, once the invoice is posted. */
  zohoBillId: string | null
  vendor: string
  currency: string
  date: string
  received: string
  po: string
  poType: 'PO' | 'Non-PO'
  amount: number
  amountText: string
  conf: string
  status: string
  stage: string
  match: string
  exception: string
  action: string
  note: string
  timeline: TimelineEntry[]
}

export interface EvidenceRow {
  kind: string
  docNo: string
  line: number | string
  date: string
  vendor: string | null
  gstin: string | null
  item: string
  hsn: string | null
  qty: number | null
  rate: number | null
  taxable: number
  cgst: number | null
  sgst: number | null
  igst: number | null
  gstPct: number | null
  tds: number | null
  costCentre: string | null
  glAccount: string | null
  businessUnit: string | null
  currency: string
  terms: string | null
  system: string
  variance: boolean
  editable: boolean
  locked: boolean
}

export interface Evidence {
  columns: string[]
  focusLine: number | null
  rows: EvidenceRow[]
  lines: MatchLine[]
  sources: { doc: string; system: string; tone: Tone }[]
  linkage: { k: string; v: string; tone: Tone }[]
  narrative: string | null
  candidates: { po: string; date: string; value: string }[]
  correctionReasons: string[]
}

export interface T360Stage {
  label: string
  detail: string
  system: string
  done: boolean
  jump: View | null
}

export interface ChatMessage {
  role: string
  text: string
  sources: string | null
  recommendation: string | null
}

export interface Kpi {
  label: string
  value: string
  note: string
  tone: Tone
  target: View
}

export interface Dashboard {
  persona: string
  kpis: Kpi[]
  attention: { title: string; meta: string; badge: string; tone: Tone; invoiceId?: string; view?: View }[]
  insights: { agent: string; text: string }[]
  exec: {
    invoicesProcessed: number
    stpPct: number
    extractionAccuracy: number
    matchRate: number
    exceptionRate: number
    avgCycleMinutes: number | null
  }
  funnel: [string, number][]
  outcomes: [string, number][]
  exceptionBars: [string, number][]
  statusCounts: Record<string, number>
  liveFeed: { time: string; text: string; actor: string }[]
  flow: string[]
}

export interface ReconWorkRow {
  label: string
  sources: string
  items: number | string
  matched: number | string
  open: number | string
  diff: string
  owner: string
  state: string
  tone: Tone
}

export interface Reconciliation {
  workspace: ReconWorkRow[]
  openItems: { ref: string; type: string; value: string; age: string; reason: string }[]
  checklist: { label: string; owner: string; done: boolean; derived: boolean }[]
  status: { label: string; state: string; tone: Tone; note: string }[]
  asOf: string
}

export interface RegisterKpi {
  label: string
  value: string
  note: string
  tone: Tone
}

export interface PoRow {
  po: string
  vendor: string
  date: string
  value: string
  rawValue: number
  currency: string
  received: string
  invoiced: string
  cc: string | null
  buyer: string | null
  status: string
  tone: Tone
  pr: string | null
}

export interface GrnRow {
  grn: string
  po: string
  vendor: string
  date: string
  type: string
  ordered: number
  received: number
  accepted: number
  pending: number
  plant: string | null
  /** Receive status, as Zoho shows it on the purchase receive. */
  status: string
  tone: Tone
  /** Bill status: Billed / Partially billed / Yet to be billed. */
  billStatus: string
  billTone: Tone
}

export interface Requisition {
  pr: string
  title: string
  raisedBy: string | null
  dept: string | null
  date: string
  facts: { k: string; v: string }[]
}

export interface Connector {
  key: string
  name: string
  category: string
  status: string
  mode?: string
  lastSync?: string | null
  meta?: { organization?: string; counts?: Record<string, number> }
  warning?: string | null
  objects?: string
  model?: string
}

export interface AppUser {
  email: string
  name: string
  role: string
}

export interface AppConfig {
  orgName: string
  mailbox: string
  defaultUser: string
  pipelineSteps: string[]
  /** Cost centres as configured in Zoho Books; empty when that field does not exist. */
  costCentres: string[]
  parkReasons: string[]
  correctionReasons: string[]
  processingStatuses: string[]
  exceptionTypes: string[]
  users: AppUser[]
  maxUploadMb: number
}

export interface AuditRow {
  when: string
  actor: string
  event: string
  invoiceId: string | null
}
