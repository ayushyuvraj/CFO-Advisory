import type { InvoiceDetail, Progress } from '../api/types'

export const BATCH_LIMIT = 20
export const BATCH_BYTES = 100 * 1024 * 1024
export const INVOICE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.tif,.tiff,application/pdf,image/jpeg,image/png,image/tiff'
export type FileStage = 'Ready' | 'Queued' | 'Uploading' | 'Processing' | 'Completed' | 'Failed' | 'Not an invoice' | 'Needs review'
export interface BatchCase { id: string; caseId: string; state: Progress['state']; status: string; error: string | null }
export interface BatchFile { id: string; file: File; hash: string; stage: FileStage; cases: BatchCase[]; message: string; statusIssue: boolean; rejected: boolean }
export interface UploadScreening { outcome: 'not_invoice' | 'needs_review'; documentType: string; message: string }
export interface BatchTransport {
  upload: (file: File, requestId: string) => Promise<InvoiceDetail | UploadScreening>
  progress: (id: string) => Promise<Progress>
  reprocess: (id: string) => Promise<unknown>
}
export class BatchRequestError extends Error { constructor(public status: number, message: string) { super(message) } }

/** Captures the acting user for every request, including work after navigating away. */
async function request<T>(actor: string, path: string, body?: FormData | object): Promise<T> {
  const headers: Record<string,string> = { 'X-User': actor }
  if (typeof window !== 'undefined') {
    try {
      const cid = localStorage.getItem('kpmg_cfo_company_id')
      if (cid) headers['X-Company-Id'] = cid
      const pid = localStorage.getItem('kpmg_cfo_persona_id')
      if (pid) headers['X-Persona-Id'] = pid
    } catch {
      /* storage unavailable */
    }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), body ? 900000 : 30000)
  try {
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
    const response = await fetch('/api'+path, {method:body ? 'POST':'GET', headers,
      body:body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, signal:controller.signal})
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new BatchRequestError(response.status, typeof data?.detail === 'string' ? data.detail : `Request failed (${response.status}).`)
    return data as T
  } catch (error) {
    if (error instanceof BatchRequestError) throw error
    throw new BatchRequestError(0, 'Connection interrupted. Retry safely to check or resume this file.')
  } finally { clearTimeout(timer) }
}
export const batchTransport = (actor: string): BatchTransport => ({
  upload(file, token) { const form = new FormData(); form.append('file',file); form.append('channel','upload'); form.append('request_id',token); form.append('screen_document','true'); return request(actor,'/invoices',form) },
  progress: id => request(actor,`/invoices/${encodeURIComponent(id)}/progress`),
  reprocess: id => request(actor,`/invoices/${encodeURIComponent(id)}/reprocess`,{}),
})
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to process this file. Retry it.'

/** In-memory per-user queue: retained across app navigation, never persisted to disk. */
export class InvoiceBatch {
  private jobs: BatchFile[] = []
  private snapshot: BatchFile[] = []
  private listeners = new Set<() => void>()
  private runner = false
  private adding = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private polling = false
  private interval: number
  constructor(private transport: BatchTransport, interval = 2000) { this.interval = interval }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.snapshot
  private emit() { this.snapshot = [...this.jobs]; this.listeners.forEach(listener => listener()) }
  get busy() { return this.runner || this.jobs.some(job => ['Queued','Uploading','Processing'].includes(job.stage)) }
  async add(files: File[], maxMb: number): Promise<string[]> {
    if (this.busy || this.adding) return ['Wait for this batch to finish before adding more files.']
    this.adding = true
    const errors: string[] = []
    try {
      for (const file of files) {
        if (!/\.(pdf|jpe?g|png|tiff?)$/i.test(file.name)) { errors.push(`${file.name}: use PDF, JPG, PNG or TIFF.`); continue }
        if (!file.size || file.size > maxMb*1024*1024) { errors.push(`${file.name}: select a non-empty file up to ${maxMb} MB.`); continue }
        if (this.jobs.length >= BATCH_LIMIT) { errors.push(`Up to ${BATCH_LIMIT} files per batch. Clear finished files before adding more.`); break }
        if (this.jobs.reduce((sum,job)=>sum+job.file.size,0)+file.size > BATCH_BYTES) { errors.push(`${file.name}: the batch cannot exceed 100 MB.`); continue }
        const bytes = await file.arrayBuffer()
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), byte=>byte.toString(16).padStart(2,'0')).join('')
        if (this.jobs.some(job=>job.hash===hash)) { errors.push(`${file.name}: this file is already in the list.`); continue }
        this.jobs.push({id:crypto.randomUUID(),file,hash,stage:'Ready',cases:[],message:'Ready to upload',statusIssue:false,rejected:false})
      }
    } catch { errors.push('Unable to read a selected file. Add it again using HTTPS or localhost.') }
    finally { this.adding = false; this.emit() }
    return errors
  }
  remove(id: string) {
    if (this.busy) return
    this.jobs = this.jobs.filter(job=>job.id!==id || !(job.stage==='Ready' || job.stage==='Not an invoice' || job.stage==='Needs review' || (job.stage==='Failed' && job.rejected && !job.cases.length)))
    this.emit()
  }
  clearFinished() { if (!this.busy) { this.jobs = this.jobs.filter(job=>job.stage!=='Completed' && job.stage!=='Not an invoice'); this.emit() } }
  async start(retry = false, reviewId?: string) {
    if (this.busy || this.adding) return
    const wanted = this.jobs.filter(job=>reviewId ? job.id===reviewId && job.stage==='Needs review' : retry ? job.stage==='Failed' : job.stage==='Ready')
    if (!wanted.length) return
    this.runner = true
    for (const job of wanted) { job.stage='Queued'; job.statusIssue=false; job.message=retry?'Waiting to retry':'Waiting to upload' }
    this.emit()
    try {
      for (const job of wanted) {
        if (job.cases.length) {
          job.stage='Queued'; job.message='Retrying failed invoice cases'
          for (const item of job.cases.filter(item=>item.state==='error')) {
            try { await this.transport.reprocess(item.id); item.state='queued'; item.error=null }
            catch (error) {
              // A lost retry response may already have queued work. Poll its known ID.
              item.state='queued'; job.statusIssue=true; job.message=message(error)
            }
          }
          job.stage='Processing'; this.emit(); this.schedule(); continue
        }
        job.stage='Uploading'; job.message='Uploading and verifying document type'; this.emit()
        try {
          const inv = await this.transport.upload(job.file,job.id)
          if (inv && 'outcome' in inv) {
            if (!['not_invoice','needs_review'].includes(inv.outcome)) throw new Error('Invalid screening result. Retry safely.')
            job.stage=inv.outcome==='not_invoice'?'Not an invoice':'Needs review'
            job.message=inv.message;job.cases=[];job.rejected=false
            this.emit();continue
          }
          if (!inv?.id || !inv.pipeline) throw new Error('Upload response was incomplete. Retry safely.')
          const entries = inv.documentInvoices?.length ? inv.documentInvoices : [{id:inv.id,caseId:inv.caseId}]
          job.cases = entries.map(entry=>({id:entry.id,caseId:entry.caseId,
            state:entry.id===inv.id ? inv.pipeline.state : 'queued',status:entry.id===inv.id ? inv.status : 'Received',error:entry.id===inv.id ? inv.pipeline.error : null}))
          job.rejected=false; this.aggregate(job); this.schedule()
        } catch (error) {
          job.stage='Failed'; job.message=message(error)
          job.rejected=error instanceof BatchRequestError && error.status>=400 && error.status<500 && error.status!==409
        }
        this.emit()
      }
    } finally { this.runner=false; this.emit(); this.schedule() }
  }
  private aggregate(job: BatchFile) {
    const pending = job.cases.some(item=>item.state!=='done' && item.state!=='error')
    const errors = job.cases.filter(item=>item.state==='error')
    job.stage=pending?'Processing':errors.length?'Failed':'Completed'
    const done=job.cases.filter(item=>item.state==='done').length
    job.message=pending ? `${done} of ${job.cases.length} invoice cases processed` : errors.length ? `${errors.length} of ${job.cases.length} cases failed. Retry will keep successful cases.` : `${job.cases.length} invoice case${job.cases.length===1?'':'s'} processed. Business review may still be required.`
  }
  private schedule() {
    if (this.timer || this.polling || !this.jobs.some(job=>job.stage==='Processing')) return
    this.timer=setTimeout(()=>{this.timer=undefined;void this.poll()},this.jobs.some(job=>job.statusIssue) ? Math.max(5000,this.interval) : this.interval)
  }
  async checkStatus() { if (this.timer) { clearTimeout(this.timer); this.timer=undefined }; await this.poll() }
  private async poll() {
    if (this.polling) return
    this.polling=true
    const jobs=this.jobs.filter(job=>job.stage==='Processing')
    const entries=jobs.flatMap(job=>job.cases.filter(item=>item.state!=='done').map(item=>({job,item})))
    let next=0
    const issues=new Set<BatchFile>()
    const worker=async()=>{
      while (next<entries.length) {
        const {job,item}=entries[next++]
        try {
          const progress=await this.transport.progress(item.id)
          if (!progress || !['queued','running','done','error'].includes(progress.state)) throw new Error('Invalid status')
          item.state=progress.state;item.status=progress.status;item.error=progress.error
        } catch { issues.add(job) }
      }
    }
    try { await Promise.all(Array.from({length:Math.min(4,entries.length)},worker)) }
    finally {
      for (const job of jobs) {
        this.aggregate(job);job.statusIssue=issues.has(job)
        if (job.statusIssue) job.message='Status temporarily unavailable. Your uploaded cases are retained; checking again.'
      }
      this.polling=false;this.emit();this.schedule()
    }
  }
}
const sessions=new Map<string,InvoiceBatch>()
export function invoiceBatch(actor: string) {
  let batch=sessions.get(actor)
  if (!batch) { batch=new InvoiceBatch(batchTransport(actor));sessions.set(actor,batch) }
  return batch
}
