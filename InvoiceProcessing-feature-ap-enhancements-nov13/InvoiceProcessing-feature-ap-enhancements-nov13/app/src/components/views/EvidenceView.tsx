import { useEffect, useState } from 'react'
import type { Evidence, EvidenceRow, InvoiceDetail, MatchLine } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { inr, money } from '../../lib/format'
import { tone } from '../../lib/tone'
import { Card, SectionTitle } from '../ui/Card'
import { Grid, Page, Row, Stack } from '../ui/Layout'

/**
 * Source Transaction Evidence — "evidence before decision".
 *
 * The raw values Zoho Books returned for the PO and receipt, beside what was
 * extracted from the invoice, for the line the match engine flagged (or any
 * line you pick). The resolution section fixes what the Command Center owns and
 * raises source requests for what Zoho owns. It opens by itself when the match
 * flags a variance; the ☰ button opens it on demand for any line, until posting.
 */
export function EvidenceView() {
  const { state, actions } = useStore()
  const inv = state.inv
  const [line, setLine] = useState<number | null>(null)
  const [manual, setManual] = useState(false)
  const version = inv ? inv.status + inv.corrections.length + inv.matchStatus : ''
  const ev = useApi<Evidence>(inv ? `/invoices/${inv.id}/evidence${line ? `?line_no=${line}` : ''}` : null, [version])

  useEffect(() => {
    setLine(null)
    setManual(false)
  }, [inv?.id])
  if (!inv) return null
  const e = ev.data
  const needsResolution = inv.matchStatus === 'fail' || inv.matchStatus === 'exception' || inv.corrected
  // Invoice values stay correctable until the invoice is posted to Zoho.
  const canCorrect = inv.pipeline.state === 'done' && !['Posted', 'Paid', 'Submitted'].includes(inv.status)
  const onDemand = manual && canCorrect

  return (
    <Page>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div className="page-title">Source Transaction Evidence</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-neutral-700)', maxWidth: '72ch' }}>
              The raw values retrieved from each system of record for {inv.number}, before the match engine forms an
              opinion. Scroll horizontally for the full field set.
            </div>
          </div>
          <Row gap={10}>
            {(e?.sources ?? []).map((s) => {
              const t = tone(s.tone)
              return (
                <div key={s.doc} style={{ border: `1px solid ${t.line}`, borderRadius: 8, background: t.bg, padding: '9px 12px' }}>
                  <div className="kicker" style={{ letterSpacing: '.12em' }}>
                    {s.doc}
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: t.fg }}>{s.system}</div>
                </div>
              )
            })}
            {canCorrect && (
              <button
                type="button"
                className={'btn ' + (onDemand ? 'btn-primary' : 'btn-secondary')}
                onClick={() => setManual((m) => !m)}
                aria-pressed={onDemand}
                aria-label={onDemand ? 'Close the correction panel' : 'Open the correction panel'}
                title={onDemand ? 'Close the correction panel' : 'Correct an invoice value'}
                style={{ alignSelf: 'stretch', minWidth: 50, padding: '0 14px', fontSize: 21, lineHeight: 1 }}
              >
                ☰
              </button>
            )}
          </Row>
        </div>

        {e && e.lines.length > 1 && (
          <Row gap={8} style={{ marginTop: 16 }}>
            <span className="kicker">Invoice line</span>
            {e.lines.map((l) => (
              <button
                key={l.line_no}
                type="button"
                className={'btn btn-sm ' + (e.focusLine === l.line_no ? 'btn-primary' : 'btn-secondary')}
                onClick={() => setLine(l.line_no)}
                title={l.description}
                style={{ borderColor: l.status === 'fail' ? 'var(--err)' : l.status === 'warn' ? 'var(--warn)' : undefined }}
              >
                {l.line_no}
                {l.status === 'fail' ? ' ⚠' : ''}
              </button>
            ))}
          </Row>
        )}

        <div className="scroll-x" style={{ marginTop: 14, border: '1px solid var(--color-divider)', borderRadius: 10 }}>
          <table className="table" style={{ width: '100%', minWidth: 1680, fontSize: 11.5, margin: 0 }}>
            <thead>
              <tr>
                {(e?.columns ?? []).map((c, i) => (
                  <th key={c} style={{ textAlign: i >= 8 && i <= 15 ? 'right' : 'left' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(e?.rows ?? []).map((r, i) => (
                <EvidenceTr key={i} row={r} currency={inv.currency} />
              ))}
            </tbody>
          </table>
        </div>
        {ev.error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--err)' }}>{ev.error}</div>}

        {(needsResolution || onDemand) && e && (
          <ResolutionSection inv={inv} evidence={e} manual={onDemand} onLine={setLine} />
        )}

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-neutral-600)' }}>
          PO and receipt read from Zoho Books · invoice values extracted by Gemini and validated by the Command Center
        </div>
      </Card>

      <Grid min={300}>
        <Card>
          <SectionTitle>Linkage Confidence</SectionTitle>
          <Stack gap={9} style={{ marginTop: 14 }}>
            {(e?.linkage ?? []).map((l) => (
              <div
                key={l.k}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 7, borderBottom: '1px dashed var(--color-divider)' }}
              >
                <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{l.k}</span>
                <span style={{ fontSize: 12, color: tone(l.tone).fg, textAlign: 'right' }}>{l.v}</span>
              </div>
            ))}
          </Stack>
          {e && e.candidates.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12 }}>
              <div className="kicker">Candidate POs for this vendor</div>
              {e.candidates.map((c) => (
                <div key={c.po}>
                  {c.po} · {c.date} · {c.value}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Matching Agent — Pre-read</SectionTitle>
          <div
            style={{
              borderLeft: '3px solid var(--color-accent-700)',
              padding: '4px 0 4px 13px',
              marginTop: 13,
              fontSize: 12.5,
              color: 'var(--color-neutral-800)',
            }}
          >
            {e?.narrative ?? inv.validationNarrative}
          </div>
          <Row style={{ marginTop: 18 }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => actions.goStage('validation')}>
              View Match Result
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => actions.goStage('review')}>
              Back to extraction
            </button>
          </Row>
        </Card>
      </Grid>
    </Page>
  )
}

function EvidenceTr({ row, currency }: { row: EvidenceRow; currency: string }) {
  const m = (n: number | null) => (n == null || n === 0 ? '—' : money(n, currency))
  const bg = row.variance ? 'var(--err-bg)' : row.kind === 'INVOICE' ? 'var(--color-accent-100)' : 'transparent'
  const cells: [string, 'left' | 'right'][] = [
    [row.kind, 'left'],
    [row.docNo, 'left'],
    [String(row.line), 'right'],
    [row.date, 'left'],
    [row.vendor ?? '—', 'left'],
    [row.gstin ?? '—', 'left'],
    [row.item, 'left'],
    [row.hsn ?? '—', 'left'],
    [row.qty == null ? '—' : row.qty.toLocaleString('en-IN'), 'right'],
    [m(row.rate), 'right'],
    [m(row.taxable), 'right'],
    [m(row.cgst), 'right'],
    [m(row.sgst), 'right'],
    [m(row.igst), 'right'],
    [row.gstPct == null ? '—' : row.gstPct + '%', 'right'],
    [row.tds ? inr(row.tds) : '—', 'right'],
    [row.costCentre ?? '—', 'left'],
    [row.glAccount ?? '—', 'left'],
    [row.businessUnit ?? '—', 'left'],
    [row.currency, 'left'],
    [row.terms ?? '—', 'left'],
    [row.system, 'left'],
  ]
  return (
    <tr style={{ background: bg }}>
      {cells.map(([v, align], j) => (
        <td
          key={j}
          style={{
            textAlign: align,
            whiteSpace: 'nowrap',
            color: j === 0 ? 'var(--color-accent-800)' : j === 8 && row.variance ? 'var(--err)' : 'var(--color-text)',
            fontWeight: j === 0 || (j === 8 && row.variance) ? 600 : 400,
          }}
        >
          {v}
        </td>
      ))}
    </tr>
  )
}

type Field = 'quantity' | 'rate' | 'tax_rate'

const FIELD_LABEL: Record<Field, string> = { quantity: 'Invoice quantity', rate: 'Invoice rate', tax_rate: 'Invoice GST %' }

/** The field the match flagged on this line, if any. */
function flaggedField(line: MatchLine): Field | null {
  const code = line.issues.find((i) => i.status === 'fail')?.code
  if (!code) return null
  return code === 'price' ? 'rate' : code === 'tax_rate' ? 'tax_rate' : 'quantity'
}

function currentOf(line: MatchLine, field: Field): number {
  return field === 'rate' ? line.rate : field === 'tax_rate' ? line.tax_rate : line.invoiced
}

/** What Zoho says the value should be — never zero: when nothing is open, the fix is a receipt in Zoho. */
function suggestionFor(line: MatchLine, field: Field): number | null {
  const v =
    field === 'quantity'
      ? Math.min(...[line.ordered, line.accepted].filter((x): x is number => x != null)) - line.billed_before
      : field === 'rate'
        ? line.po_rate
        : line.po_tax_rate
  return v != null && Number.isFinite(v) && v > 0 && v !== currentOf(line, field) ? v : null
}

/**
 * Resolution columns. Command-Center-owned values are corrected in place and the
 * match re-runs; Zoho-owned values are locked and raise a source request instead.
 */
function ResolutionSection({
  inv,
  evidence,
  manual,
  onLine,
}: {
  inv: InvoiceDetail
  evidence: Evidence
  /** Opened with ☰: any line and any field, whether or not the match flagged it. */
  manual: boolean
  onLine: (lineNo: number) => void
}) {
  const { state, actions } = useStore()
  const reasons = evidence.correctionReasons
  const failing = evidence.lines.find((l) => l.line_no === evidence.focusLine && l.status === 'fail')
    ?? evidence.lines.find((l) => l.status === 'fail')
  // On demand: the line picked above (the evidence focuses the flagged line first).
  const line = manual ? evidence.lines.find((l) => l.line_no === evidence.focusLine) ?? evidence.lines[0] : failing
  const [field, setField] = useState<Field>(() => (line && flaggedField(line)) ?? 'quantity')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState(reasons[0] ?? '')
  const [po, setPo] = useState(inv.po)
  const [cc, setCc] = useState(inv.costCentre ?? '')
  const [ccReason, setCcReason] = useState('Assigned by business owner')

  // A new line starts on the field the match flagged there.
  useEffect(() => {
    if (line) setField(flaggedField(line) ?? 'quantity')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.line_no, manual])

  const target = line ? { field, label: FIELD_LABEL[field], current: currentOf(line, field) } : null
  useEffect(() => {
    const suggested = line ? suggestionFor(line, field) : null
    setValue(suggested != null ? String(suggested) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.line_no, field, inv.corrections.length])

  const resolved = inv.matchStatus === 'pass' && !manual
  const plain = manual && !failing && inv.matchStatus !== 'exception'
  const title = plain
    ? 'Correct an invoice value'
    : resolved
    ? inv.matchMode === 'non-po'
      ? '✓ Coded as a non-PO invoice — routed for business-owner approval'
      : '✓ Variance resolved — match revalidated'
    : inv.matchStatus === 'exception'
      ? '⚠ ' + (inv.discrepancy?.title ?? 'No purchase order identified')
      : '⚠ ' + (inv.discrepancy?.title ?? 'Match variance')

  const requestSource = (document: 'purchase_order' | 'goods_receipt') => {
    const reasonText = window.prompt(
      `Why should the ${document === 'purchase_order' ? 'purchase order' : 'goods receipt'} be corrected in Zoho Books?`,
      field === 'quantity' ? 'Plant confirms the invoiced quantity was received and accepted' : 'Price agreed with the vendor',
    )
    if (reasonText && target) void actions.sourceRequest(document, target.field, String(target.current), reasonText)
  }
  const tones = plain
    ? { line: 'var(--color-accent-300)', bg: 'var(--color-accent-100)', fg: 'var(--color-accent-800)' }
    : resolved
      ? { line: 'var(--ok-line)', bg: 'var(--ok-bg)', fg: 'var(--ok)' }
      : { line: 'var(--warn-line)', bg: 'var(--warn-bg)', fg: 'var(--warn)' }

  return (
    <div
      style={{
        marginTop: 18,
        border: `1px solid ${tones.line}`,
        background: tones.bg,
        borderRadius: 10,
        padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 17,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: tones.fg,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>Resolve here — no need to leave this transaction</div>
      </div>

      {manual && line && (
        <Row gap={12} style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span className="kicker">Invoice line</span>
            <select
              className="input"
              value={line.line_no}
              onChange={(e) => onLine(Number(e.target.value))}
              style={{ minWidth: 240, padding: '5px 8px', minHeight: 0 }}
            >
              {evidence.lines.map((l) => (
                <option key={l.line_no} value={l.line_no}>
                  {l.line_no} · {l.description}
                  {l.status === 'fail' ? ' — flagged' : ''}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span className="kicker">Value</span>
            <select
              className="input"
              value={field}
              onChange={(e) => setField(e.target.value as Field)}
              style={{ minWidth: 150, padding: '5px 8px', minHeight: 0 }}
            >
              <option value="quantity">Quantity</option>
              <option value="rate">Rate</option>
              <option value="tax_rate">GST %</option>
            </select>
          </label>
        </Row>
      )}

      {!resolved && (
        <div className="scroll-x" style={{ marginTop: 12 }}>
          <table className="table" style={{ width: '100%', minWidth: 900, fontSize: 11.5, margin: 0 }}>
            <thead>
              <tr>
                <th>Field to correct</th>
                <th>Source of truth</th>
                <th style={{ textAlign: 'right' }}>Current value</th>
                <th>Corrected value</th>
                <th>Reason</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {line && target && (
                <>
                  <tr>
                    <td style={{ fontWeight: 600, color: line.status === 'fail' ? 'var(--err)' : 'var(--color-text)' }}>
                      {target.label} (line {line.line_no})
                    </td>
                    <td style={{ color: 'var(--color-neutral-700)' }}>Command Center — extracted</td>
                    <td className="tabnum" style={{ textAlign: 'right', color: line.status === 'fail' ? 'var(--err)' : 'var(--color-text)' }}>
                      {target.current}
                    </td>
                    <td>
                      <input
                        className="input"
                        value={value}
                        placeholder={target.field === 'quantity' ? 'Nothing open to bill' : ''}
                        onChange={(e) => setValue(e.target.value)}
                        style={{ width: 150, padding: '5px 8px', minHeight: 0 }}
                      />
                    </td>
                    <td>
                      <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minWidth: 210, padding: '5px 8px', minHeight: 0 }}>
                        {reasons.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={!!state.busy || !value || Number(value) === target.current}
                        onClick={() => void actions.correctLine(line.line_no, target.field, value, reason)}
                      >
                        Apply &amp; Revalidate
                      </button>
                    </td>
                  </tr>
                  {field === 'quantity' && line.accepted != null && (
                    <LockedRow
                      field={`Accepted quantity (receipt, line ${line.po_line_no ?? ''})`}
                      value={line.accepted}
                      note="Raise a receipt correction in Zoho Books"
                      onRequest={() => requestSource('goods_receipt')}
                    />
                  )}
                  {field === 'quantity' && line.ordered != null && (
                    <LockedRow
                      field={`Ordered quantity (PO line ${line.po_line_no ?? ''})`}
                      value={line.ordered}
                      note="PO amendment required in Zoho Books"
                      onRequest={() => requestSource('purchase_order')}
                    />
                  )}
                  {field === 'rate' && line.po_rate != null && (
                    <LockedRow
                      field={`PO rate (PO line ${line.po_line_no ?? ''})`}
                      value={line.po_rate}
                      note="PO amendment required in Zoho Books"
                      onRequest={() => requestSource('purchase_order')}
                    />
                  )}
                  {field === 'tax_rate' && line.po_tax_rate != null && (
                    <LockedRow
                      field={`PO GST % (PO line ${line.po_line_no ?? ''})`}
                      value={line.po_tax_rate}
                      note="PO amendment required in Zoho Books"
                      onRequest={() => requestSource('purchase_order')}
                    />
                  )}
                </>
              )}

              {inv.matchStatus === 'exception' && (
                <>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--warn)' }}>PO reference</td>
                    <td style={{ color: 'var(--color-neutral-700)' }}>Command Center — extracted</td>
                    <td style={{ textAlign: 'right', color: 'var(--warn)' }}>{inv.po || 'Not found'}</td>
                    <td>
                      <input className="input" value={po} placeholder="e.g. 4500131207" onChange={(e) => setPo(e.target.value)} style={{ width: 150, padding: '5px 8px', minHeight: 0 }} />
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>PO reference omitted by vendor</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={!!state.busy || !po || po === inv.po}
                        onClick={() => void actions.correctField('po', po, 'PO reference omitted by vendor')}
                      >
                        Apply &amp; Revalidate
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: 'var(--warn)' }}>Cost centre</td>
                    <td style={{ color: 'var(--color-neutral-700)' }}>Command Center — codeable</td>
                    <td style={{ textAlign: 'right', color: 'var(--warn)' }}>{inv.costCentre ?? 'Not stated'}</td>
                    <td>
                      {/* Zoho's own cost centre list where it exists; free text otherwise. */}
                      {(state.config?.costCentres ?? []).length > 0 ? (
                        <select className="input" value={cc} onChange={(e) => setCc(e.target.value)} style={{ minWidth: 150, padding: '5px 8px', minHeight: 0 }}>
                          <option value="">Select…</option>
                          {(state.config?.costCentres ?? []).map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input className="input" value={cc} placeholder="e.g. CC-COR-FIN-01" onChange={(e) => setCc(e.target.value)} style={{ width: 150, padding: '5px 8px', minHeight: 0 }} />
                      )}
                    </td>
                    <td>
                      <select className="input" value={ccReason} onChange={(e) => setCcReason(e.target.value)} style={{ minWidth: 210, padding: '5px 8px', minHeight: 0 }}>
                        {['Assigned by business owner', 'Default cost centre for department', 'Corrected coding'].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={!!state.busy || !cc}
                        onClick={() => void actions.correctField('cost_centre', cc, ccReason)}
                      >
                        Apply coding
                      </button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {inv.sourceRequests.length > 0 && (
        <Stack gap={6} style={{ marginTop: 12 }}>
          {inv.sourceRequests.map((r) => (
            <div
              key={r.ref}
              style={{
                border: '1px solid var(--color-accent-300)',
                background: 'var(--color-accent-100)',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                color: 'var(--color-accent-800)',
              }}
            >
              {r.ref} · {r.document.replace('_', ' ')} {r.documentRef} · {r.field} {r.current ?? ''} → {r.requested ?? '—'} ·{' '}
              {r.status} · {r.raisedBy}
            </div>
          ))}
        </Stack>
      )}

      <div style={{ marginTop: 11, fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
        {resolved && inv.corrected
          ? 'Correction applied and the match re-run automatically. Original value, new value, user, timestamp and reason are in the audit trail.'
          : 'Only values the Command Center owns can be corrected here. Values in Zoho Books are corrected at source — Request Source Correction raises a case rather than overwriting the record.'}
      </div>
    </div>
  )
}

function LockedRow({ field, value, note, onRequest }: { field: string; value: number; note: string; onRequest: () => void }) {
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{field}</td>
      <td style={{ color: 'var(--color-neutral-700)' }}>Zoho Books — authoritative</td>
      <td className="tabnum" style={{ textAlign: 'right' }}>
        {value}
      </td>
      <td>
        <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Locked at source</span>
      </td>
      <td>
        <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{note}</span>
      </td>
      <td style={{ textAlign: 'right' }}>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onRequest}>
          Request Source Correction
        </button>
      </td>
    </tr>
  )
}
