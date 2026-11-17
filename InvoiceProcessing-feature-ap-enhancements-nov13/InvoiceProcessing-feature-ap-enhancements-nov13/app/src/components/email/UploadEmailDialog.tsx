import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useEmailUi } from './EmailUiContext'
import { useEmailDetail } from './useEmailDetail'
import { isActive, jobError } from './emailApi'

export function UploadEmailDialog() {
  const ui = useEmailUi()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploaded, setUploaded] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const detail = useEmailDetail(ui.open ? uploaded : null)
  const limits = useApi<{ max_email_bytes: number }>(ui.open ? '/email-inbox/limits' : null)
  const maxBytes = limits.data?.max_email_bytes ?? 20 * 1024 * 1024
  useEffect(() => {
    if (!ui.open) return
    const previous = document.activeElement as HTMLElement | null
    input.current?.focus()
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ui.setOpen(false)
      if (e.key !== 'Tab') return
      const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')
      if (!items?.length) return
      const first = items[0], last = items[items.length-1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keys)
    return () => { document.removeEventListener('keydown', keys); previous?.focus() }
  }, [ui.open, ui.setOpen])
  const choose = (chosen: File | undefined) => {
    if (!chosen || busy) return
    setUploaded(null); setDuplicate(false)
    if (! /\.(eml|msg)$/i.test(chosen.name)) { setError('Select a downloaded .eml or Outlook .msg email file.'); setFile(null); return }
    if (!chosen.size || chosen.size > maxBytes) { setError(`Select a non-empty email up to ${Math.floor(maxBytes/1024/1024)} MB.`); setFile(null); return }
    setFile(chosen); setError(null)
  }
  const upload = async () => {
    if (!file || busy) return
    setBusy(true); setError(null)
    try {
      const form = new FormData(); form.append('file', file)
      const result = await api<{ email_id: string; duplicate: boolean }>('/email-inbox/upload', 'POST', form)
      setUploaded(result.email_id); setDuplicate(result.duplicate); ui.setSelected(result.email_id); ui.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed. Retrying the same email is safe.') }
    finally { setBusy(false) }
  }
  if (!ui.open) return null
  const active = isActive(detail.data?.job ?? null)
  return <div className="dialog-backdrop" style={{ zIndex: 90 }} onMouseDown={e => { if (e.target === e.currentTarget) ui.setOpen(false) }}>
    <div ref={dialog} className="dialog" role="dialog" aria-modal="true" aria-labelledby="email-upload-title" style={{ width:600, maxWidth:'94vw', padding:26, maxHeight:'90vh', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:16 }}>
        <h2 id="email-upload-title" style={{ margin:0 }}>Upload Email</h2>
        <button className="btn btn-ghost" aria-label="Close email upload" onClick={() => ui.setOpen(false)}>Close</button>
      </div>
      <p>Choose a downloaded .eml or Outlook .msg email. Its PDF attachments will be classified individually; confirmed Invoices enter the existing workflow.</p>
      <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragging(false); choose(e.dataTransfer.files[0]) }}
        style={{ padding:22, border:'2px dashed var(--color-accent-700)', borderRadius:10, background:dragging ? 'var(--color-accent-100)' : undefined }}>
        <label htmlFor="email-upload-file" style={{ display:'block', marginBottom:10 }}>Browse or drop one .eml or .msg file · up to {Math.floor(maxBytes/1024/1024)} MB</label>
        <input ref={input} id="email-upload-file" type="file" accept=".eml,.msg,message/rfc822,application/vnd.ms-outlook" disabled={busy} onChange={e => choose(e.target.files?.[0])} />
        {file && <p style={{ overflowWrap:'anywhere' }}>Selected: {file.name}</p>}
      </div>
      {error && <p role="alert" style={{ color:'var(--err)' }}>{error}</p>}
      {detail.error && <p role="alert">Status could not be loaded: {detail.error} <button className="btn btn-ghost" onClick={() => void detail.reload()}>Retry status</button></p>}
      <div aria-live="polite">
        {busy && <p>Uploading email… You can close this dialog; check Email Inbox for the saved result.</p>}
        {uploaded && <p>{duplicate ? 'This email already exists. Existing records and cases are retained.' : 'Email uploaded successfully.'}</p>}
        {detail.data?.job && <p>{detail.data.job.stage}{detail.data.job.total > 0 ? ` (${detail.data.job.processed}/${detail.data.job.total} attachments)` : ''}</p>}
        {detail.data?.job?.error_code && <p style={{ color:'var(--err)' }}>{jobError(detail.data.job.error_code)}</p>}
      </div>
      <div style={{ display:'flex', gap:10, marginTop:20, flexWrap:'wrap' }}>
        <button className="btn btn-primary" disabled={!file || busy || !!uploaded || active} onClick={() => void upload()}>{busy ? 'Uploading…' : 'Upload & Process'}</button>
        {uploaded && <button className="btn btn-secondary" onClick={() => ui.showInbox(uploaded)}>View in Email Inbox</button>}
      </div>
    </div>
  </div>
}
