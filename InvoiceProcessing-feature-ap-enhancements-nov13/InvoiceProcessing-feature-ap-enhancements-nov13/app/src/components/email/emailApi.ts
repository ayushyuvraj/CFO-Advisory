export interface UploadJob {
  status: string; stage: string; processed: number; total: number
  error_code: string | null; updated_at: string
}
export interface EmailSummary {
  email_id: string; subject: string; sender: string; received_datetime: string
  recipient?: string; linked_case_count?: number
  attachment_count: number; job: UploadJob | null
}
export interface EmailAttachment {
  invoice_parts_error?: string | null
  part_index?: number | null; source_page_start?: number | null; source_page_end?: number | null; source_invoice_number?: string | null
  attachment_id: string; email_id: string; filename: string; document_type: string | null
  eligible: boolean; eligibility_reason: string; invoice_id: string | null; case_id: string | null
  pipeline_state: string | null; invoice_status: string | null; dispatch_state: string | null
  invoice_number?: string | null; vendor_name?: string | null; invoice_total?: number | null; invoice_currency?: string | null
  size_bytes: number; content_type: string
  invoice_po_reference: string | null; invoice_match_status: string | null; invoice_match_mode: string | null
  classification: {
    confidence: number | null; needs_review: boolean | null; reason: string | null
    method: string | null; version: string | null; invoice_subtype: string | null
    invoice_route: string | null; routing_needs_review: boolean | null; routing_reason: string | null
    document_evidence: string[] | null
  }
}
export interface EmailDetail {
  email_id: string; subject: string; sender: string; recipient: string; body: string
  received_datetime: string; job: UploadJob | null; attachments: EmailAttachment[]; retry_available: boolean
}
export function isActive(job: UploadJob | null) { return !!job && ['queued', 'running'].includes(job.status) }
export function dateTime(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
export const jobError = (code: string | null) => ({
  import_failed: 'Email import failed. Check attachment filenames and existing folder conflicts, then retry.',
  classification_or_forwarding_failed: 'Some processing could not finish. Retry keeps successful records and cases.',
  attachment_processing_requires_retry: 'Some attachments could not finish processing. Retry incomplete work.',
  processing_interrupted: 'Processing was interrupted. It can resume safely.',
}[code ?? ''] ?? (code ? 'Email processing needs attention. Retry incomplete work.' : ''))
