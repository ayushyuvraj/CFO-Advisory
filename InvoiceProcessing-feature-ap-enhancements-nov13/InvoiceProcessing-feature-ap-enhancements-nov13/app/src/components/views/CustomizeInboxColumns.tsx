import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AP_INBOX_COLUMNS, DEFAULT_COLUMNS, normalizeColumns } from './apInboxColumns'
import type { ColumnKey } from './apInboxColumns'
import { Icon } from '../ui/Icon'
import './apInboxColumns.css'

export function CustomizeInboxColumns({ value, onApply, onClose }: {
  value: readonly ColumnKey[]; onApply: (keys: ColumnKey[]) => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(() => normalizeColumns(value))
  const [query, setQuery] = useState('')
  const [reset, setReset] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null), search = useRef<HTMLInputElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    search.current?.focus()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])
  const toggle = (key: ColumnKey) => {
    if (AP_INBOX_COLUMNS.find(c => c.key === key)?.mandatory) return
    setReset(false)
    setDraft(current => normalizeColumns(current.includes(key) ? current.filter(k => k !== key) : [...current, key]))
  }
  const term = query.trim().toLowerCase()
  const filtered = AP_INBOX_COLUMNS.filter(c => [c.label, c.excelLabel ?? '', c.key, c.group].some(text => text.toLowerCase().includes(term)))
  const groups = [
    { title: 'Required columns', columns: filtered.filter(c => c.mandatory) },
    ...[...new Set(AP_INBOX_COLUMNS.filter(c => !c.mandatory).map(c => c.group))].map(title => ({ title, columns: filtered.filter(c => !c.mandatory && c.group === title) })),
  ].filter(group => group.columns.length)
  const downOutside = useRef(false)
  return createPortal(<dialog ref={dialog} className="dialog ap-columns-dialog" aria-modal="true"
    aria-labelledby="ap-columns-title" aria-describedby="ap-columns-subtitle"
    onCancel={event => { event.preventDefault(); close.current() }}
    onMouseDown={event => {
      const r = event.currentTarget.getBoundingClientRect()
      downOutside.current = event.target === event.currentTarget && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
    }}
    onClick={event => { if (event.target === event.currentTarget && downOutside.current) close.current(); downOutside.current = false }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]'))
      const first = controls[0], last = controls[controls.length-1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
    <div className="ap-columns-panel">
      <header className="ap-columns-header">
        <div className="ap-columns-title-row"><h2 id="ap-columns-title">Customize Columns</h2>
          <button type="button" className="btn btn-ghost" aria-label="Close Customize Columns" onClick={onClose}>×</button></div>
        <p id="ap-columns-subtitle">Choose the columns you want to see in the AP Processing Inbox.</p>
        <label className="field" htmlFor="ap-columns-search"><span>Find a column</span>
          <input ref={search} id="ap-columns-search" className="input" value={query} placeholder="Search columns" onChange={e => setQuery(e.target.value)} /></label>
        <div className="ap-columns-quick">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDraft(AP_INBOX_COLUMNS.map(c => c.key)); setReset(false) }}>Select all</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDraft(normalizeColumns([])); setReset(false) }}>Clear optional</button>
          <span className="ap-columns-counter" role="status" aria-live="polite">{draft.length} of {AP_INBOX_COLUMNS.length} columns selected</span>
        </div>
      </header>
      <div className="ap-columns-list" aria-label="Available columns">
        {filtered.length ? groups.map(group => <section key={group.title} className="ap-columns-group" aria-label={group.title}>
          <div className="ap-columns-group-heading"><h3>{group.title}</h3>
            <span>{group.columns.filter(column => draft.includes(column.key)).length} / {group.columns.length} selected</span></div>
          <div className="ap-columns-options">{group.columns.map(column => <label key={column.key}
            className={`ap-column-option${draft.includes(column.key) ? ' is-selected' : ''}${column.mandatory ? ' is-required' : ''}`}>
            <input type="checkbox" checked={draft.includes(column.key)} disabled={column.mandatory}
              aria-label={column.label} onChange={() => toggle(column.key)} />
            <span className="ap-column-description"><strong>{column.label}</strong>
              {column.excelLabel && column.excelLabel !== column.label && <small>Excel: {column.excelLabel}</small>}
            </span>
            {column.mandatory && <span className="ap-column-required" title="This column is required and cannot be hidden.">
              <Icon path="M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3" size={11} />Required</span>}
          </label>)}</div>
        </section>) : <p className="ap-columns-empty">No columns match your search.</p>}
      </div>
      <footer className="ap-columns-footer">
        <p className="ap-columns-export-note">Excel exports all saved fields, including hidden columns.</p>
        {reset && <p className="ap-columns-reset-note" role="status">Default columns selected. Click Apply to save.</p>}
        <button type="button" className="btn btn-ghost" onClick={() => { setDraft([...DEFAULT_COLUMNS]); setReset(true) }}>Reset to default</button>
        <div className="ap-columns-footer-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onApply(normalizeColumns(draft))}>Apply</button></div>
      </footer>
    </div>
  </dialog>, document.body)
}
