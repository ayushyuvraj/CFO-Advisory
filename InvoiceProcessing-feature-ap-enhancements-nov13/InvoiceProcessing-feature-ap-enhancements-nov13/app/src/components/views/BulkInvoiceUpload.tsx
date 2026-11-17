import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useApi } from '../../api/useApi'
import { useStore } from '../../state/store'
import { BATCH_LIMIT, INVOICE_ACCEPT, invoiceBatch } from '../../lib/invoiceBatch'
import './bulkInvoiceUpload.css'

const size = (bytes: number) => bytes >= 1024*1024 ? `${(bytes/1024/1024).toFixed(1)} MB` : `${Math.max(1,Math.ceil(bytes/1024))} KB`
export function BulkInvoiceUpload() {
  const { state, actions } = useStore()
  const capability=useApi<{documentScreening:boolean;version:string}>('/invoices/upload-capabilities')
  const screeningReady=capability.data?.documentScreening===true && capability.data.version==='invoice-screening-v1'
  const actor=state.user || state.config?.defaultUser || ''
  const batch=invoiceBatch(actor)
  const jobs=useSyncExternalStore(batch.subscribe,batch.getSnapshot,batch.getSnapshot)
  const input=useRef<HTMLInputElement>(null)
  const [dragging,setDragging]=useState(false),[adding,setAdding]=useState(false),[errors,setErrors]=useState<string[]>([])
  const ready=jobs.filter(job=>job.stage==='Ready').length, failed=jobs.filter(job=>job.stage==='Failed').length
  const completed=jobs.filter(job=>job.stage==='Completed').length
  const skipped=jobs.filter(job=>job.stage==='Not an invoice').length, review=jobs.filter(job=>job.stage==='Needs review').length
  const busy=batch.busy, disabled=busy || adding || !actor || !state.config || !!state.busy || !screeningReady
  const marker=jobs.map(job=>job.cases.map(item=>`${item.id}:${item.state}`).join(',')).join('|')
  const previous=useRef({actor,marker:''})
  useEffect(()=>{
    if (previous.current.actor!==actor) { previous.current={actor,marker};return }
    if (marker!==previous.current.marker) { previous.current.marker=marker;actions.set(value=>({refresh:value.refresh+1})) }
  },[marker,actor,actions])
  useEffect(()=>{
    if (!busy) return
    const leave=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',leave)
    return ()=>window.removeEventListener('beforeunload',leave)
  },[busy])
  useEffect(()=>{setErrors([])},[actor])
  const add=async(files:FileList|null)=>{
    if (!files || disabled) return
    const selected=Array.from(files)
    setAdding(true);actions.set({method:'upload'})
    try { setErrors(await batch.add(selected,state.config?.maxUploadMb ?? 20)) }
    finally {setAdding(false)}
  }
  return <section className="bulk-invoice-upload" aria-label="Invoice upload batch">
    <input ref={input} type="file" multiple accept={INVOICE_ACCEPT} hidden disabled={disabled}
      aria-label="Choose invoice files" onChange={event=>{void add(event.target.files);event.target.value=''}} />
    <button type="button" className={`bulk-invoice-drop${dragging?' is-dragging':''}`} disabled={disabled}
      onClick={()=>input.current?.click()}
      onDragOver={event=>{event.preventDefault();if(!disabled)setDragging(true)}}
      onDragLeave={()=>setDragging(false)}
      onDrop={event=>{event.preventDefault();setDragging(false);void add(event.dataTransfer.files)}}>
      <strong>{adding?'Checking selected files…':busy?'Invoice batch in progress':'Drop invoices here'}</strong>
      <span>or click to browse · PDF, JPG, PNG or TIFF · up to {state.config?.maxUploadMb ?? 20} MB per file</span>
      <small>Up to {BATCH_LIMIT} files · 100 MB per batch</small>
    </button>
    {!screeningReady && <div className="bulk-invoice-help" role="status">{capability.loading?'Checking document screening…':'Document screening is not available. Update/restart the backend before uploading.'}
      {!capability.loading && <button type="button" className="btn btn-ghost btn-sm" onClick={()=>void capability.reload()}>Check availability</button>}
    </div>}
    {errors.length>0 && <div className="bulk-invoice-errors" role="alert"><ul>{errors.map((error,index)=><li key={index}>{error}</li>)}</ul></div>}
    {jobs.length>0 && <>
      <div className="bulk-invoice-heading"><h3>Invoice files <span>({jobs.length})</span></h3>
        <span role="status">{completed} processed{skipped?` · ${skipped} non-invoices skipped`:''}{review?` · ${review} needs review`:''}{failed?` · ${failed} failed`:''}{ready?` · ${ready} ready`:''}</span></div>
      <div className="bulk-invoice-list">
        {jobs.map(job=><article key={job.id} className="bulk-invoice-file" aria-label={job.file.name}>
          <div className="bulk-invoice-file-heading"><div><strong title={job.file.name}>{job.file.name}</strong><small>{size(job.file.size)}</small></div>
            <span className={`bulk-invoice-status status-${job.stage.toLowerCase().replace(/\s+/g,'-')}`}>{job.stage}</span>
            {(job.stage==='Ready' || job.stage==='Not an invoice' || job.stage==='Needs review' || (job.stage==='Failed' && job.rejected && !job.cases.length)) && <button type="button" className="btn btn-ghost btn-sm"
              aria-label={`Remove ${job.file.name}`} disabled={busy || adding} onClick={()=>batch.remove(job.id)}>Remove</button>}
          </div>
          <p role="status">{job.message}</p>
          {['Queued','Uploading','Processing'].includes(job.stage) && <progress aria-label={`Progress for ${job.file.name}`}
            max={job.cases.length || 1} value={job.stage==='Processing'?job.cases.filter(item=>item.state==='done'||item.state==='error').length:undefined} />}
          {job.stage==='Needs review' && <button type="button" className="btn btn-secondary btn-sm" disabled={disabled}
            onClick={()=>void batch.start(false,job.id)}>Check classification again</button>}
          {job.cases.length>0 && <div className="bulk-invoice-case-links">{job.cases.map(item=><button type="button" key={item.id} className="btn btn-secondary btn-sm"
            disabled={!!state.busy} onClick={()=>void actions.open(item.id,'review')}>{item.caseId} · {item.state==='error'?'Failed':item.state==='done'?'Processed':'Processing'}</button>)}</div>}
        </article>)}
      </div>
      <div className="bulk-invoice-controls">
        <button type="button" className="btn btn-primary" disabled={disabled || !ready} onClick={()=>void batch.start()}>Upload &amp; Process ({ready})</button>
        {failed>0 && <button type="button" className="btn btn-secondary" disabled={disabled} onClick={()=>void batch.start(true)}>Retry Failed ({failed})</button>}
        {jobs.some(job=>job.statusIssue) && <button type="button" className="btn btn-secondary" onClick={()=>void batch.checkStatus()}>Check status</button>}
        {(completed>0 || skipped>0) && <button type="button" className="btn btn-ghost" disabled={busy || adding} onClick={()=>batch.clearFinished()}>{skipped?'Clear finished':'Clear completed'}</button>}
      </div>
      <p className="bulk-invoice-help">Only confirmed invoices create cases. Other documents are skipped and uncertain documents need review. Each PDF stays intact; separate invoices create separate cases. Completed means extraction and validation finished, not approved or paid. Keep this tab open until uploads finish.</p>
    </>}
  </section>
}
