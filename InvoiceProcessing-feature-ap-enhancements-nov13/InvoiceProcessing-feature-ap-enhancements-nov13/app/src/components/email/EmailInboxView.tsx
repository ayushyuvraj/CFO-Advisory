import { Fragment, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useStore } from '../../state/store'
import { Card } from '../ui/Card'
import { RawPill } from '../ui/Pill'
import { tone } from '../../lib/tone'
import { useEmailUi } from './EmailUiContext'
import { useEmailDetail } from './useEmailDetail'
import { type EmailSummary, type EmailAttachment, isActive, dateTime, jobError } from './emailApi'

export function EmailInboxView() {
  const { state } = useStore()
  const ui = useEmailUi()
  const [q, setQ] = useState(''), [search, setSearch] = useState(''), [offset, setOffset] = useState(0)
  useEffect(() => { const t = window.setTimeout(() => { setSearch(q); setOffset(0) },300); return () => clearTimeout(t) },[q])
  const query = new URLSearchParams({ q:search, limit:'20', offset:String(offset) })
  const list = useApi<{ items:EmailSummary[]; total:number }>('/email-inbox/emails?' + query, [state.refresh])
  const active = list.data?.items.some(e => isActive(e.job))
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void list.reload() },3000)
    return () => window.clearInterval(t)
  }, [active,list.reload])
  return <div style={{ padding:'0 30px 32px', display:'grid', gridTemplateColumns:'minmax(0, 1fr)', minWidth:0, maxWidth:'100%', boxSizing:'border-box', gap:18 }}>
    <Card padding={20} style={{ minWidth:0, maxWidth:'100%', boxSizing:'border-box' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div><h2 style={{ margin:0 }}>Email Inbox</h2><p style={{ margin:'5px 0' }}>Emails, individual documents and their linked invoice cases.</p></div>
        <div style={{ display:'flex', gap:10 }}><button className="btn btn-secondary" onClick={ui.refresh} disabled={list.loading}>Refresh emails</button><button className="btn btn-primary" onClick={ui.openUpload}>Upload Email (.eml / .msg)</button></div>
      </div>
      <label className="field" style={{ display:'block', marginTop:14 }}>Search subject or sender
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search emails" style={{ marginTop:5 }} />
      </label>
      {list.error && <p role="alert" style={{ color:'var(--err)' }}>Unable to load emails: {list.error} <button className="btn btn-ghost" onClick={() => void list.reload()}>Retry</button></p>}
      {list.loading && !list.data && <p role="status">Loading emails…</p>}
      {!list.loading && !list.error && !list.data?.items.length && <p>No emails found. Upload a .eml or Outlook .msg file to begin.</p>}
      <div className="scroll-x" style={{ marginTop:16, minWidth:0, maxWidth:'100%', overflowX:'auto' }}>
        <table className="table table-rows" aria-label="Email inbox" style={{ width:'100%', fontSize:11.5, minWidth:1150 }}>
          <thead><tr><th>Subject</th><th>From</th><th>To</th><th>Received</th><th>PDF Attachments</th><th>Linked Cases</th><th>Processing Status</th><th>Progress</th><th style={{ textAlign:'right' }}>Action</th></tr></thead>
          <tbody>{list.data?.items.map(email => <Fragment key={email.email_id}>
            <tr style={{ background:ui.selected === email.email_id ? 'var(--color-accent-100)' : undefined }}>
              <td style={{ minWidth:220, maxWidth:340, whiteSpace:'normal', overflowWrap:'anywhere' }}><strong>{email.subject || 'No Subject'}</strong></td>
              <td style={{ maxWidth:220, whiteSpace:'normal', overflowWrap:'anywhere' }}>{email.sender || '—'}</td>
              <td style={{ maxWidth:220, whiteSpace:'normal', overflowWrap:'anywhere' }}>{email.recipient || '—'}</td>
              <td>{dateTime(email.received_datetime)}</td><td className="tabnum">{email.attachment_count}</td>
              <td className="tabnum">{email.linked_case_count ?? '—'}</td>
              <td><EmailStatus status={email.job?.status ?? 'Stored'} /><div style={{ marginTop:5, maxWidth:240, whiteSpace:'normal' }}>{email.job?.stage ?? 'View details for attachment and case statuses'}</div></td>
              <td className="tabnum">{email.job ? `${email.job.processed} / ${email.job.total}` : '—'}</td>
              <td style={{ textAlign:'right' }}><button className="btn btn-secondary btn-sm" aria-expanded={ui.selected === email.email_id} aria-controls={'email-detail-' + email.email_id}
                onClick={() => ui.setSelected(ui.selected === email.email_id ? null : email.email_id)}>{ui.selected === email.email_id ? 'Hide details' : 'View details'}</button></td>
            </tr>
            {ui.selected === email.email_id && <tr><td colSpan={9}><div id={'email-detail-' + email.email_id} style={{ minWidth:0, contain:'inline-size' }}><EmailDetailPanel id={email.email_id} /></div></td></tr>}
          </Fragment>)}</tbody>
        </table>
      </div>
      {ui.selected && list.data && !list.data.items.some(e => e.email_id === ui.selected) && <EmailDetailPanel id={ui.selected} />}
      <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginTop:12 }}>
        <span>{list.data?.total ?? 0} email(s) · Page {Math.floor(offset/20)+1}</span>
        <div style={{ display:'flex', gap:8 }}><button className="btn btn-secondary btn-sm" disabled={!offset || list.loading} onClick={() => setOffset(n => Math.max(0,n-20))}>Previous</button>
          <button className="btn btn-secondary btn-sm" disabled={!list.data || offset+20 >= list.data.total || list.loading} onClick={() => setOffset(n => n+20)}>Next</button></div>
      </div>
    </Card>
  </div>
}

function EmailDetailPanel({ id }: { id:string }) {
  const ui = useEmailUi()
  const detail = useEmailDetail(id)
  const [busy,setBusy] = useState(false), [error,setError] = useState<string | null>(null)
  const data = detail.data
  const retry = async () => {
    setBusy(true); setError(null)
    try { await api('/email-inbox/emails/' + encodeURIComponent(id) + '/retry','POST'); ui.refresh(); await detail.reload() }
    catch(e) { setError(e instanceof Error ? e.message : 'Retry failed') }
    finally { setBusy(false) }
  }
  if (!data) return <div role={detail.error ? 'alert' : 'status'}>{detail.error ?? 'Loading email details…'}</div>
  const retryUseful = ['partial','failed','interrupted'].includes(data.job?.status ?? '') || data.attachments.some(a => !a.invoice_id && (!a.document_type || a.classification.needs_review || a.document_type === 'Invoice'))
  return <section aria-label="Email details" style={{ marginTop:12, minWidth:0, maxWidth:'100%', boxSizing:'border-box', padding:16, background:'var(--color-accent-100)', borderRadius:10 }}>
    <div style={{ overflowWrap:'anywhere', fontSize:12 }}><strong>From:</strong> {data.sender}<br/><strong>To:</strong> {data.recipient}<br/><strong>Received:</strong> {dateTime(data.received_datetime)}<br/><strong>Email ID:</strong> {data.email_id}</div>
    <details style={{ marginTop:12 }}><summary>Email body</summary><pre style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere', fontFamily:'inherit', maxHeight:240, overflowY:'auto' }}>{data.body || 'No plain-text email body.'}</pre></details>
    {isActive(data.job) && <p role="status">{data.job?.stage}</p>}
    {data.job?.error_code && <p role="alert" style={{ color:'var(--err)' }}>{jobError(data.job.error_code)}</p>}
    {error && <p role="alert" style={{ color:'var(--err)' }}>{error}</p>}
    {detail.error && <p role="alert">Status refresh failed: {detail.error}</p>}
    {retryUseful && data.retry_available && <button className="btn btn-secondary btn-sm" disabled={busy || isActive(data.job)} onClick={() => void retry()}>{busy ? 'Requesting retry…' : 'Retry incomplete processing'}</button>}
    {retryUseful && !data.retry_available && <p>Upload this email’s original .eml or .msg file once to enable UI processing/retry.</p>}
    {!data.attachments.length && <p>{isActive(data.job) ? 'PDF attachments will appear after email import.' : 'This email has no stored PDF attachments.'}</p>}
    {!!data.attachments.length && <div className="scroll-x" role="region" aria-label="Attachment table scroll area" tabIndex={0} style={{ marginTop:14, minWidth:0, maxWidth:'100%', overflowX:'auto', background:'#fff', borderRadius:8, contain:'inline-size' }}>
      <table className="table table-rows" aria-label="Email attachments" style={{ width:'100%', fontSize:11.5, minWidth:1700 }}>
        <thead><tr><th>File Name / Evidence</th><th>Document Type</th><th>AI Conf.</th><th>Classification Review</th><th>Case ID</th><th>Invoice No.</th><th>Vendor</th><th>Amount</th><th>Currency</th><th>PO Number</th><th>Match</th><th>Processing Status</th><th style={{ textAlign:'right' }}>Action</th></tr></thead>
        <tbody>{data.attachments.map(a => <AttachmentRow key={a.attachment_id + ':' + (a.part_index ?? 0)} attachment={a} />)}</tbody>
      </table>
    </div>}
  </section>
}

function AttachmentRow({ attachment:a }: { attachment:EmailAttachment }) {
  const { actions } = useStore()
  const c = a.classification
  const label = a.document_type ?? 'Awaiting classification'
  const status = a.invoice_id ? (a.pipeline_state === 'error' ? 'Processing failed — open case' : a.invoice_status ?? a.pipeline_state ?? 'Linked')
    : !a.document_type ? 'Waiting for classification' : c.needs_review ? 'Held for classification review'
    : a.document_type === 'Invoice' ? 'Not forwarded yet' : 'Kept separate — no invoice case'
  return <tr>
    <td style={{ minWidth:340, whiteSpace:'normal' }}><strong style={{ display:'block', whiteSpace:'nowrap', overflowWrap:'normal', wordBreak:'normal' }}>{a.filename}</strong>
      {a.source_page_start != null && <div style={{ marginTop:5 }}>Invoice {a.invoice_number ?? a.source_invoice_number ?? a.part_index} · Original PDF pages {a.source_page_start}–{a.source_page_end}</div>}
      {a.invoice_parts_error && <p role="alert" style={{ color:'var(--err)', whiteSpace:'normal' }}>{a.invoice_parts_error === 'legacy_multi_invoice_case_requires_explicit_repair'
        ? 'Existing unsplit case needs review before separate invoice cases can be created.'
        : 'Invoice separation needs review or retry. No additional case has been created for uncertain pages.'}</p>}
    <details style={{ marginTop:8 }}><summary>Classification evidence and IDs</summary><p>{c.reason ?? 'No classification result yet.'}</p>
      {c.document_evidence?.length ? <p>PDF fields: {c.document_evidence.join(', ')}</p> : null}
      {a.document_type === 'Invoice' && <p>Routing: {c.routing_reason ?? 'Not established'}</p>}
      <p style={{ fontSize:11, overflowWrap:'anywhere' }}>Attachment ID: {a.attachment_id} · Method: {c.method ?? 'Pending'}</p>
    </details>
    </td>
    <td>{label}{c.invoice_subtype === 'Tax Invoice' && <div>Tax Invoice</div>}</td>
    <td>{typeof c.confidence === 'number' ? `${(c.confidence*100).toFixed(0)}%` : '—'}</td>
    <td>{!a.document_type ? 'Pending' : c.needs_review == null ? 'Not available' : c.needs_review ? 'Required' : 'Not required'}</td>
    <td className="tabnum" style={{ minWidth:135, whiteSpace:'nowrap', overflowWrap:'normal', wordBreak:'normal' }}>{a.case_id ?? '—'}</td><td>{a.invoice_number ?? '—'}</td>
    <td style={{ minWidth:180, maxWidth:260, whiteSpace:'normal' }}>{a.vendor_name ?? '—'}</td>
    <td className="tabnum" style={{ textAlign:'right' }}>{typeof a.invoice_total === 'number' ? a.invoice_total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'}</td><td>{a.invoice_currency ?? '—'}</td><td>{a.invoice_po_reference ?? '—'}</td>
    <td style={{ whiteSpace:'normal' }}>{a.invoice_id ? <>{a.invoice_match_mode ?? 'Pending'}<br/>{a.invoice_match_status ?? 'Pending'}</> : '—'}</td>
    <td style={{ whiteSpace:'normal', minWidth:160 }}><strong>{status}</strong>{a.pipeline_state === 'done' && <div>Pipeline completed</div>}
      {a.document_type === 'Invoice' && <div style={{ marginTop:5 }}>Route evidence: {c.invoice_route === 'Pending verification' ? 'Not established' : c.invoice_route ?? 'Not established'}</div>}</td>
    <td><div style={{ display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'wrap' }}>
      <a className="btn btn-secondary btn-sm" href={'/api/email-inbox/attachments/' + encodeURIComponent(a.attachment_id) + '/pdf'} target="_blank" rel="noopener noreferrer">View PDF</a>
      {a.invoice_id && <button className="btn btn-primary btn-sm" onClick={() => void actions.open(a.invoice_id!, 'review', a.source_page_start ?? 1)}>Open Case</button>}
    </div></td>
  </tr>
}

function EmailStatus({ status }: { status:string }) {
  const t = tone(['failed','interrupted','partial'].includes(status) ? 'err' : status === 'completed' ? 'ok' : 'info')
  return <RawPill fg={t.fg} bg={t.bg} line={t.line}>{status === 'completed' ? 'Email processed' : status === 'running' ? 'Processing' : status}</RawPill>
}
