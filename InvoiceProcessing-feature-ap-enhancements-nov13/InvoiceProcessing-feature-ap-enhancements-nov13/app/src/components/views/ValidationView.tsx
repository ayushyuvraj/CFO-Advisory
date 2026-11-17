import { useStore } from '../../state/store'
import { verdictText, verdictTone } from '../../state/selectors'
import { inr } from '../../lib/format'
import { tone } from '../../lib/tone'
import { Card, SectionTitle } from '../ui/Card'
import { Page, Row, Split, Stack } from '../ui/Layout'

/**
 * Match result — detect → understand → explain → recommend.
 *
 * Everything here is the match engine's own output: the verdict, the three
 * documents side by side, the discrepancy it found, a per-line breakdown and
 * the reconciliation it rests on.
 */
export function ValidationView() {
  const { state, actions } = useStore()
  const inv = state.inv
  if (!inv) return null
  const status = inv.matchStatus
  const t = tone(verdictTone(status))
  const { verdict, reason } = verdictText(inv)
  const failedLine = inv.discrepancy?.line_no
  // Lines stay correctable until the invoice is posted to Zoho.
  const editable = !['Posted', 'Paid', 'Submitted'].includes(inv.status)
  const edit = (lineNo: number) => actions.set({ editOpen: true, editLine: lineNo })

  return (
    <Page gap={22} style={{ padding: '22px 30px 60px' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 23, letterSpacing: '.02em' }}>
          AI Validation &amp; {inv.matchMode === '2-way' ? '2-Way' : inv.matchMode === 'non-po' ? 'Non-PO' : '3-Way'} Match
        </div>
        <div style={{ color: 'var(--color-neutral-700)', fontSize: 12.5 }}>
          Invoice ↔ Purchase Order ↔ Goods Receipt, checked against Zoho Books records.
        </div>
      </div>

      {state.busy && (
        <div
          style={{
            border: '1px solid var(--color-accent-300)',
            background: 'var(--color-accent-100)',
            borderRadius: 10,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ width: 8, height: 8, background: 'var(--color-accent-700)', animation: 'ipa-pulse 1s infinite' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {state.busy}…
          </span>
        </div>
      )}

      <div
        style={{
          border: `1px solid ${t.line}`,
          borderLeft: `4px solid ${t.line}`,
          borderRadius: 10,
          background: t.bg,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21, letterSpacing: '.04em', textTransform: 'uppercase', color: t.fg }}>
            {verdict}
          </div>
          <div style={{ fontSize: 12.5, color: t.fg, marginTop: 3, maxWidth: '90ch' }}>{reason}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: t.fg }}>
          <div>Agent confidence: {inv.matchConfidence}</div>
          <div>Risk level: {inv.riskLevel ?? '—'}</div>
          <div>Status: {inv.status}</div>
        </div>
      </div>

      <div className="match-cards">
        {inv.match.map((c, i) => {
          const ct = tone(c.tone)
          return (
            <div key={c.title} style={{ display: 'contents' }}>
              {i > 0 && (
                <div
                  aria-hidden="true"
                  className="match-link"
                  style={{ display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontSize: 19, color: 'var(--color-accent-700)' }}
                >
                  ↔
                </div>
              )}
              <Card topLine={ct.fg} padding={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                    {c.title}
                  </div>
                  <span className="pill" style={{ borderColor: ct.line, background: ct.bg, color: ct.fg }}>
                    {c.status}
                  </span>
                </div>
                <Stack gap={6} style={{ marginTop: 12 }}>
                  {c.rows.map((r) => (
                    <div
                      key={r.k}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, borderBottom: '1px dashed var(--color-divider)', paddingBottom: 5 }}
                    >
                      <span style={{ color: 'var(--color-neutral-700)' }}>{r.k}</span>
                      <span style={{ textAlign: 'right', color: r.tone ? tone(r.tone).fg : 'var(--color-text)' }}>{r.v}</span>
                    </div>
                  ))}
                </Stack>
              </Card>
            </div>
          )
        })}
      </div>

      {inv.discrepancy && status !== 'pass' && (
        <Card leftLine="var(--err)">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div className="kicker" style={{ color: 'var(--err)' }}>
                Discrepancy detected
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginTop: 4 }}>{inv.discrepancy.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-neutral-700)', maxWidth: '60ch', marginTop: 4 }}>
                {inv.discrepancy.where}
              </div>
            </div>
            <Row gap={12}>
              {inv.discrepancy.figures.map((f) => {
                const isErr = f.tone === 'err'
                return (
                  <div
                    key={f.k}
                    style={{
                      border: `1px solid ${isErr ? 'var(--err-line)' : 'var(--color-divider)'}`,
                      borderRadius: 8,
                      background: isErr ? 'var(--err-bg)' : 'transparent',
                      padding: '11px 15px',
                      minWidth: 118,
                    }}
                  >
                    <div className="kicker" style={{ letterSpacing: '.12em', color: 'var(--color-neutral-700)' }}>
                      {f.k}
                    </div>
                    <div className="metric" style={{ fontSize: 22, color: isErr ? 'var(--err)' : 'var(--color-text)' }}>
                      {f.v}
                    </div>
                  </div>
                )
              })}
            </Row>
          </div>
        </Card>
      )}

      {inv.matchLines.length > 0 && (
        <Card>
          <SectionTitle
            right={<span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>How each invoice line was matched and tested</span>}
          >
            Line-by-line Match
          </SectionTitle>
          <div className="scroll-x" style={{ marginTop: 12 }}>
            <table className="table" style={{ width: '100%', minWidth: 900, fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Description</th>
                  <th>PO line</th>
                  <th style={{ textAlign: 'right' }}>Invoiced</th>
                  <th style={{ textAlign: 'right' }}>Ordered</th>
                  <th style={{ textAlign: 'right' }}>Accepted</th>
                  <th style={{ textAlign: 'right' }}>Billed before</th>
                  <th style={{ textAlign: 'right' }}>Rate / PO rate</th>
                  <th>Result</th>
                  {editable && <th />}
                </tr>
              </thead>
              <tbody>
                {inv.matchLines.map((l) => {
                  const lt = tone(l.status === 'pass' ? 'ok' : l.status === 'warn' ? 'warn' : 'err')
                  return (
                    <tr key={l.line_no} style={{ background: l.line_no === failedLine && status === 'fail' ? 'var(--err-bg)' : 'transparent' }}>
                      <td>{l.line_no}</td>
                      <td>{l.description}</td>
                      <td>{l.po_line_no ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{l.invoiced}</td>
                      <td style={{ textAlign: 'right' }}>{l.ordered ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{l.accepted ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{l.billed_before || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {inr(l.rate)}
                        {l.po_rate != null && ` / ${inr(l.po_rate)}`}
                      </td>
                      <td style={{ color: lt.fg }}>
                        {l.issues.length ? l.issues.map((i) => i.text).join('; ') : '✓ Matched'}
                      </td>
                      {editable && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '3px 10px', minHeight: 0, fontSize: 11.5 }}
                            title={`Correct invoice line ${l.line_no}`}
                            onClick={() => edit(l.line_no)}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Split ratio="minmax(0, 1.35fr) minmax(0, 1fr)">
        <Card>
          <SectionTitle>Reconciliation</SectionTitle>
          <table className="table" style={{ width: '100%', fontSize: 12, marginTop: 12 }}>
            <thead>
              <tr>
                <th>Validation</th>
                <th style={{ textAlign: 'right' }}>Invoice</th>
                <th style={{ textAlign: 'right' }}>PO / GR</th>
                <th style={{ textAlign: 'right' }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {inv.recon.map((r) => (
                <tr key={r.k}>
                  <td>{r.k}</td>
                  <td style={{ textAlign: 'right' }}>{r.inv}</td>
                  <td style={{ textAlign: 'right' }}>{r.ref}</td>
                  <td style={{ textAlign: 'right', color: r.res.startsWith('⚠') ? 'var(--err)' : 'var(--ok)' }}>{r.res}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Stack gap={18}>
          <Card>
            <SectionTitle>{status === 'pass' ? 'Validation Summary' : 'AI Validation Summary — Exception'}</SectionTitle>
            <div
              style={{ borderLeft: '3px solid var(--color-accent-700)', padding: '5px 0 5px 14px', marginTop: 12, color: 'var(--color-neutral-800)', fontSize: 12.5 }}
            >
              {inv.validationNarrative}
            </div>
            <Row gap={22} style={{ marginTop: 14 }}>
              <div>
                <div className="kicker" style={{ letterSpacing: '.12em' }}>
                  Risk level
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: inv.riskLevel === 'Low' ? 'var(--ok)' : 'var(--warn)' }}>
                  {inv.riskLevel ?? '—'}
                </div>
              </div>
              <div>
                <div className="kicker" style={{ letterSpacing: '.12em' }}>
                  Agent recommendation
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{inv.recommendedAction}</div>
              </div>
            </Row>
            <div style={{ fontSize: 12, marginTop: 10, color: 'var(--color-neutral-700)' }}>{inv.recommendation}</div>

            {status !== 'pass' && <RecommendedActions />}
          </Card>

          <Row>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={inv.status === 'Exception'}
              title={inv.status === 'Exception' ? 'Resolve the exception first' : undefined}
              onClick={() => actions.goStage('approve')}
            >
              Continue to Approval
            </button>
            {status === 'fail' && inv.discrepancy && (
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => edit(inv.discrepancy!.line_no)}
              >
                Correct &amp; Revalidate
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => actions.goStage('evidence')}>
              Back to evidence
            </button>
          </Row>
        </Stack>
      </Split>
    </Page>
  )
}

/** What the agent proposes next — the recommended option first, blocked ones dimmed. */
function RecommendedActions() {
  const { state, actions } = useStore()
  const inv = state.inv!
  const exception = inv.matchStatus === 'exception'

  const options = [
    {
      title: 'Park Invoice',
      badge: 'Recommended',
      tone: 'ok' as const,
      reason: exception ? 'Await business approval and cost centre assignment.' : 'Hold pending confirmation of the variance.',
      enabled: true,
      go: () =>
        actions.set({
          view: 'ap',
          stage: 'submit',
          parkOpen: true,
          parkReason: exception ? 'Missing PO' : inv.discrepancy?.code === 'price' ? 'Amount discrepancy' : 'Quantity discrepancy',
        }),
    },
    {
      title: 'Request Clarification',
      badge: 'Alternative',
      tone: 'info' as const,
      reason: exception ? 'Ask the business owner for a cost centre / approval evidence.' : 'Ask the vendor for a credit note or delivery evidence.',
      enabled: true,
      go: () => actions.set({ view: 'ap', stage: 'submit', clarifyOpen: true }),
    },
    {
      title: 'Continue Processing',
      badge: 'Blocked',
      tone: 'plain' as const,
      reason: 'Available once the exception is resolved.',
      enabled: false,
      go: () => {},
    },
  ]

  return (
    <div style={{ marginTop: 18 }}>
      <div className="kicker">Recommended agent action</div>
      <Stack gap={9} style={{ marginTop: 9 }}>
        {options.map((o) => {
          const t = tone(o.tone)
          return (
            <div
              key={o.title}
              onClick={o.enabled ? o.go : undefined}
              className={o.enabled ? 'tile-click' : undefined}
              style={{
                border: `1px solid ${o.tone === 'ok' ? 'var(--ok-line)' : 'var(--color-divider)'}`,
                borderLeft: `3px solid ${t.fg}`,
                borderRadius: 8,
                background: o.tone === 'ok' ? 'var(--ok-bg)' : 'transparent',
                padding: '12px 13px',
                cursor: o.enabled ? 'pointer' : 'not-allowed',
                opacity: o.enabled ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{o.title}</span>
                <span className="pill" style={{ borderColor: t.line, background: t.bg, color: t.fg }}>
                  {o.badge}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 4 }}>{o.reason}</div>
            </div>
          )
        })}
      </Stack>
    </div>
  )
}
