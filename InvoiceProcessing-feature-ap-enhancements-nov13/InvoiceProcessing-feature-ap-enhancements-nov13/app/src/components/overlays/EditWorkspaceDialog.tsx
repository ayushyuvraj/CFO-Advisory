import { useEffect, useState } from 'react'
import { useStore } from '../../state/store'

/**
 * The line correction workspace.
 *
 * Four values side by side — the AI-extracted value, the two Zoho-owned values
 * and the variance — so the user sees exactly what they are changing and
 * against what. Only the invoice value is editable; the correction is captured
 * with reason, comment and user, then the match re-runs.
 *
 * Opens on any line until the invoice is posted — a line can be wrong without
 * failing the match (a quantity below what is open, for instance). The field
 * defaults to the one the match flagged, and can be switched.
 */
type Field = 'quantity' | 'rate' | 'tax_rate'

export function EditWorkspaceDialog() {
  const { state, actions } = useStore()
  const inv = state.inv
  const line = inv?.matchLines.find((l) => l.line_no === state.editLine)
  const code = line?.issues.find((i) => i.status === 'fail')?.code
  const flagged: Field = code === 'price' ? 'rate' : code === 'tax_rate' ? 'tax_rate' : 'quantity'
  const [field, setField] = useState<Field>(flagged)
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    setField(flagged)
    setReason(state.config?.correctionReasons[0] ?? '')
    setComment('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.editOpen, state.editLine])

  useEffect(() => {
    if (!line) return
    const current = field === 'quantity' ? line.invoiced : field === 'rate' ? line.rate : line.tax_rate
    const suggested =
      field === 'quantity'
        ? Math.min(...[line.ordered, line.accepted].filter((x): x is number => x != null)) - line.billed_before
        : field === 'rate'
          ? line.po_rate
          : line.po_tax_rate
    // Never suggest zero (when nothing is open, the fix is a receipt in Zoho, not a
    // correction), nor the value the line already has.
    const usable = suggested != null && Number.isFinite(suggested) && suggested > 0 && suggested !== current
    setValue(usable ? String(suggested) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.editOpen, state.editLine, field])

  if (!state.editOpen || !inv || !line) return null
  const close = () => actions.set({ editOpen: false })

  const current = field === 'quantity' ? line.invoiced : field === 'rate' ? line.rate : line.tax_rate
  const po = field === 'quantity' ? line.ordered : field === 'rate' ? line.po_rate : line.po_tax_rate
  const grn = field === 'quantity' ? line.accepted : null
  const label = { quantity: 'quantity', rate: 'rate', tax_rate: 'GST %' }[field]

  const values = [
    { k: 'Invoice (current)', v: String(current), note: `Invoice line ${line.line_no}`, err: line.status === 'fail' },
    { k: 'PO value (Zoho)', v: po == null ? '—' : String(po), note: 'Authoritative — read only', err: false },
    { k: 'Receipt (Zoho)', v: grn == null ? '—' : String(grn), note: grn == null ? 'Not applicable' : 'Authoritative — read only', err: false },
    { k: 'Proposed', v: value || '—', note: 'Your corrected value', err: false },
  ]

  const apply = async () => {
    const ok = await actions.correctLine(line.line_no, field, value, reason, comment)
    if (ok) actions.set({ editOpen: false, stage: 'validation', view: 'match' })
  }

  return (
    <div className="dialog-backdrop" style={{ zIndex: 60 }} onClick={close}>
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label="Line correction workspace"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720, maxWidth: '96vw', maxHeight: '88vh', overflowY: 'auto', padding: 26 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <div className="page-title">Line Correction Workspace</div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
              {inv.number} · line {line.line_no} · {line.description}
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 18 }}>
          {values.map((e) => (
            <div
              key={e.k}
              style={{
                border: `1px solid ${e.err ? 'var(--err-line)' : 'var(--color-divider)'}`,
                borderRadius: 8,
                background: e.err ? 'var(--err-bg)' : 'transparent',
                padding: '12px 13px',
              }}
            >
              <div className="kicker" style={{ letterSpacing: '.12em' }}>
                {e.k}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginTop: 3, color: e.err ? 'var(--err)' : 'var(--color-text)' }}>{e.v}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)' }}>{e.note}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 18 }}>
          <div className="field">
            <label htmlFor="edit-field">Value to correct</label>
            <select id="edit-field" className="input" value={field} onChange={(e) => setField(e.target.value as Field)}>
              <option value="quantity">Quantity</option>
              <option value="rate">Rate</option>
              <option value="tax_rate">GST %</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-value">Corrected invoice {label}</label>
            <input id="edit-value" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="edit-reason">Correction reason</label>
            <select id="edit-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {(state.config?.correctionReasons ?? []).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-comment">Comment</label>
            <input id="edit-comment" className="input" value={comment} placeholder="Evidence or reference" onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            border: '1px solid var(--color-divider)',
            borderRadius: 8,
            background: 'var(--color-neutral-100)',
            padding: '13px 14px',
            fontSize: 12,
            color: 'var(--color-neutral-800)',
          }}
        >
          The line's taxable value, the GST and the invoice total are recomputed from the corrected {label}, then validation and
          the match re-run. PO and receipt values belong to Zoho Books and cannot be edited here — raise a source correction
          from Source Evidence instead.
        </div>

        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, letterSpacing: '.05em', textTransform: 'uppercase', margin: '18px 0 8px' }}>
          Change audit
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {inv.corrections.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', padding: '8px 0', borderBottom: '1px dashed var(--color-divider)', fontSize: 11.5 }}>
              <span className="tabnum" style={{ color: 'var(--color-neutral-600)' }}>
                {c.when}
              </span>
              <span style={{ color: 'var(--color-accent-700)' }}>{c.user}</span>
              <span style={{ flex: '1 1 200px', minWidth: 160 }}>{c.text}</span>
            </div>
          ))}
          {inv.corrections.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>No corrections recorded for this invoice yet.</div>}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 22, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-lg" disabled={!value || value === String(current) || !!state.busy} onClick={() => void apply()}>
            Apply &amp; Revalidate
          </button>
        </div>
      </div>
    </div>
  )
}
