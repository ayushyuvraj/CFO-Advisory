import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CaseRow } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { RefreshButton } from '../ui/RefreshButton'
import { DownloadInvoicesButton } from './DownloadInvoicesButton'
import { ICON } from '../../data/icons'
import { tone } from '../../lib/tone'
import { Card } from '../ui/Card'
import { KpiStrip, KpiTile } from '../ui/Kpi'
import { Page, Row } from '../ui/Layout'
import { Icon } from '../ui/Icon'
import { CustomizeInboxColumns } from './CustomizeInboxColumns'
import { AP_INBOX_COLUMNS, isDefaultColumns, loadColumns, normalizeColumns, saveColumns } from './apInboxColumns'
import type { ColumnKey } from './apInboxColumns'

/** Every invoice in the Command Center, filtered on the server. */
export function ApInboxView() {
  const { state, actions } = useStore()
  const [q, setQ] = useState(state.q)
  const [columnPreference, setColumnPreference] = useState(() => ({ user: state.user, keys: loadColumns(state.user) }))
  const [columnsOpenFor, setColumnsOpenFor] = useState<string | null>(null)
  const columnsButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    setColumnPreference({ user: state.user, keys: loadColumns(state.user) })
    setColumnsOpenFor(null)
  }, [state.user])
  const visibleKeys = columnPreference.user === state.user ? columnPreference.keys : loadColumns(state.user)
  const visibleColumns = AP_INBOX_COLUMNS.filter(column => column.mandatory || visibleKeys.includes(column.key))
  const customized = !isDefaultColumns(visibleKeys)
  const applyColumns = (keys: ColumnKey[]) => {
    const normalized = normalizeColumns(keys)
    setColumnPreference({ user: state.user, keys: normalized })
    if (!saveColumns(state.user, normalized)) actions.notify('err', 'Columns applied for this visit. Your browser could not save the preference for next time.')
    setColumnsOpenFor(null)
  }

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => actions.set({ q }), 300)
    return () => window.clearTimeout(t)
  }, [q, actions])

  const params = new URLSearchParams({ limit: '500' })
  if (state.q) params.set('q', state.q)
  if (state.fStatus !== 'All statuses') params.set('status', state.fStatus)
  if (state.fType !== 'All') params.set('type', state.fType)
  if (state.fCurrency !== 'All') params.set('currency', state.fCurrency)
  if (state.fException !== 'All') params.set('exception', state.fException)

  const all = useApi<{ total: number; items: CaseRow[] }>('/invoices?limit=500', [state.refresh])
  const filtered = useApi<{ total: number; items: CaseRow[] }>('/invoices?' + params.toString(), [state.refresh])
  const everything = all.data?.items ?? []
  const rows = filtered.data?.items ?? []
  const snapshot = [state.user, params.toString(), q, state.refresh, rows.map(row => row.id).join(',')].join('|')
  const [selection, setSelection] = useState<{ snapshot: string; ids: Set<string> } | null>(null)
  const [exporting, setExporting] = useState(false)
  useEffect(() => { setSelection(null) }, [snapshot])
  const selecting = selection?.snapshot === snapshot
  const selected = selecting ? selection.ids : new Set<string>()
  const selectionDisabled = filtered.loading || !!filtered.error || !!state.busy || q !== state.q || exporting
  const toggle = (id: string) => setSelection(previous => {
    const ids = new Set(previous?.snapshot === snapshot ? previous.ids : [])
    if (ids.has(id)) ids.delete(id); else ids.add(id)
    return { snapshot, ids }
  })
  const count = (...s: string[]) => everything.filter((r) => s.includes(r.status)).length

  const kpis = [
    { label: 'Total invoices', value: everything.length, note: 'In the Command Center', tone: 'info' as const, icon: ICON.file },
    { label: 'Posted / paid', value: count('Posted', 'Paid'), note: 'In Zoho Books', tone: 'ok' as const, icon: ICON.check },
    { label: 'In progress', value: count('Received', 'In Progress', 'Validation Required', 'Awaiting Approval', 'Approved'), note: 'Agent or approver working', tone: 'info' as const, icon: ICON.clock },
    { label: 'Exceptions', value: count('Exception', 'Failed'), note: 'Business action', tone: 'err' as const, icon: ICON.alert },
    { label: 'Parked', value: count('Parked', 'Clarification Requested'), note: 'Awaiting information', tone: 'warn' as const, icon: ICON.pause },
  ]

  const statuses = ['All statuses', ...(state.config?.processingStatuses ?? [])]
  const exceptions = ['All', ...(state.config?.exceptionTypes ?? [])]

  return (
    <Page gap={20}>
      <KpiStrip>
        {kpis.map((k) => {
          const t = tone(k.tone)
          return <KpiTile key={k.label} label={k.label} value={String(k.value)} note={k.note} icon={k.icon} line={t.line} fg={t.fg} chipBg={t.bg} />
        })}
      </KpiStrip>

      <Row align="flex-end">
        <div className="field" style={{ flex: '1 1 220px', minWidth: 180 }}>
          <label htmlFor="ap-search">Search</label>
          <input id="ap-search" className="input" value={q} placeholder="Case, invoice, vendor, PO" onChange={(e) => setQ(e.target.value)} />
        </div>
        <Filter label="Processing status" value={state.fStatus} options={statuses} onChange={(v) => actions.set({ fStatus: v })} />
        <Filter label="PO type" value={state.fType} options={['All', 'PO', 'Non-PO']} onChange={(v) => actions.set({ fType: v })} />
        <Filter label="Currency" value={state.fCurrency} options={['All', 'INR', 'USD', 'EUR', 'GBP']} onChange={(v) => actions.set({ fCurrency: v })} />
        <Filter label="Exception type" value={state.fException} options={exceptions} onChange={(v) => actions.set({ fException: v })} />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setQ('')
            actions.set({ q: '', fStatus: 'All statuses', fType: 'All', fCurrency: 'All', fException: 'All' })
          }}
        >
          Clear filters
        </button>
      </Row>

      <Card padding={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, letterSpacing: '.05em', textTransform: 'uppercase' }}>AP Processing Inbox</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
              {rows.length} of {everything.length} cases
            </div>
            {selecting ? <>
              <span role="status" style={{ fontSize: 12 }}>{selected.size} selected</span>
              <DownloadInvoicesButton
                key={snapshot + ':' + rows.filter(row => selected.has(row.id)).map(row => row.id).join(',')}
                rows={rows.filter(row => selected.has(row.id))}
                disabled={filtered.loading || !!filtered.error || !!state.busy || q !== state.q}
                onBusy={setExporting}
                onError={message => actions.notify('err', message)}
              />
              <button type="button" className="btn btn-secondary btn-sm" disabled={exporting}
                onClick={() => setSelection(null)}>Cancel selection</button>
            </> : <button type="button" className="btn btn-primary btn-sm" disabled={selectionDisabled || !rows.length}
              onClick={() => setSelection({ snapshot, ids: new Set() })}>Download Excel ({rows.length})</button>}
            <button ref={columnsButton} type="button" className="btn btn-secondary btn-sm ap-columns-button"
              title="Choose the invoice fields shown in this table"
              aria-haspopup="dialog" aria-expanded={columnsOpenFor === state.user}
              onClick={() => setColumnsOpenFor(state.user)}>
              <Icon path="M3 7h5m4 0h9M3 17h9m4 0h5M8 4v6m4 4v6" size={15} />
              <span>Columns</span><span className="ap-columns-button-count">{visibleColumns.length}/{AP_INBOX_COLUMNS.length}</span>
              {customized && <span className="ap-columns-custom-dot" role="img" aria-label="Custom view" title="Custom view" />}
            </button>
            <RefreshButton />
          </div>
        </div>

        <div className="scroll-x ap-inbox-grid" role="region" aria-label="AP Processing Inbox table" tabIndex={0}
          style={{ '--ap-case-left': selecting ? '72px' : '0px' } as CSSProperties}>
          <table className="table table-rows" style={{ width: '100%', fontSize: 11.5, minWidth: visibleColumns.reduce((width, column) => width + column.width, selecting ? 72 : 0) }}>
            <colgroup>{selecting && <col style={{ width: 72 }} />}{visibleColumns.map(column => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
            <thead>
              <tr>
                {selecting && <th data-pin="selection" scope="col" style={{ width: 72 }}><SelectAllCheckbox checked={rows.length > 0 && selected.size === rows.length}
                  mixed={selected.size > 0 && selected.size < rows.length} disabled={selectionDisabled}
                  onChange={checked => setSelection({ snapshot, ids: new Set(checked ? rows.map(row => row.id) : []) })} /></th>}
                {visibleColumns.map(column => <th key={column.key} scope="col" data-column={column.key}
                  data-pin={column.key === 'caseId' ? 'left' : undefined}
                  style={{ textAlign: column.align ?? 'left' }}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                return (
                  <tr key={r.id} className={state.sel === r.id ? 'ap-case-selected' : undefined} onClick={() => actions.set({ detail: r })} style={{ cursor: 'pointer', background: state.sel === r.id ? 'var(--color-accent-100)' : 'transparent' }}>
                    {selecting && <td data-pin="selection" onClick={event => event.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${r.caseId}`} checked={selected.has(r.id)}
                        disabled={selectionDisabled} onChange={() => toggle(r.id)} />
                    </td>}
                    {visibleColumns.map(column => {
                      const content = column.cell(r, id => { void actions.open(id) })
                      return <td key={column.key} title={typeof content === 'string' ? content : undefined} data-column={column.key}
                      data-pin={column.key === 'caseId' ? 'left' : undefined}
                      className={['caseId', 'number', 'amount', 'date', 'action'].includes(column.key) ? 'tabnum ap-nowrap' : undefined}
                      style={{ textAlign: column.align ?? 'left' }}>
                      {content}
                    </td>})}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + (selecting ? 1 : 0)} style={{ color: 'var(--color-neutral-600)' }}>
                    {filtered.loading ? 'Loading…' : 'No invoices match these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {columnsOpenFor === state.user && <CustomizeInboxColumns key={state.user} value={visibleKeys}
        onApply={applyColumns} onClose={() => setColumnsOpenFor(null)} />}
    </Page>
  )
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const id = 'filter-' + label.replace(/\s+/g, '-').toLowerCase()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function SelectAllCheckbox({ checked, mixed, disabled, onChange }: {
  checked: boolean; mixed: boolean; disabled: boolean; onChange: (checked: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed }, [mixed])
  return <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
    <input ref={ref} type="checkbox" aria-label="Select all displayed invoices" checked={checked}
      disabled={disabled} onChange={event => onChange(event.target.checked)} />All
  </label>
}
