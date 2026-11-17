import type { AuditRow, Dashboard, Reconciliation, T360Stage } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { ICON } from '../../data/icons'
import { tone } from '../../lib/tone'
import { Card, SectionTitle } from '../ui/Card'
import { ColumnChart, Donut, MeterBar } from '../ui/Chart'
import { KpiStrip, KpiTile } from '../ui/Kpi'
import { Grid, Row, Split, Stack } from '../ui/Layout'
import { RawPill } from '../ui/Pill'

const OUTCOME_COLORS = ['var(--color-accent-700)', 'var(--err)', 'var(--warn)', 'var(--color-accent-400)']

/**
 * Reconciliation & P2P Insights — what is unreconciled and who owns it, the
 * executive view, Transaction 360 for the open invoice, and the audit trail.
 */
export function ReconciliationView() {
  const { state, actions } = useStore()
  const recon = useApi<Reconciliation>('/reconciliation', [state.refresh])
  const dash = useApi<Dashboard>('/dashboard?persona=Finance%20Controller', [state.refresh])
  const audit = useApi<AuditRow[]>('/audit?limit=150', [state.refresh])
  const t360 = useApi<{ txnId: string; stages: T360Stage[] }>(state.sel ? `/invoices/${state.sel}/t360` : null, [state.refresh, state.inv?.status])
  const r = recon.data
  const d = dash.data
  const funnelMax = Math.max(1, ...(d?.funnel ?? []).map(([, v]) => v))

  const exec = d
    ? [
        { label: 'Invoices processed', value: String(d.exec.invoicesProcessed), note: 'Extracted and validated', icon: ICON.file },
        { label: 'Straight-through', value: d.exec.stpPct + '%', note: 'Posted without a correction', icon: ICON.pulse },
        { label: 'Extraction confidence', value: d.exec.extractionAccuracy + '%', note: 'Average across header fields', icon: ICON.target },
        { label: 'Match rate', value: d.exec.matchRate + '%', note: 'Passed of processed', icon: ICON.layers },
        { label: 'Exception rate', value: d.exec.exceptionRate + '%', note: 'Needed business action', icon: ICON.alert },
        { label: 'Avg. time to decision', value: d.exec.avgCycleMinutes != null ? d.exec.avgCycleMinutes + ' min' : '—', note: 'Received → decision', icon: ICON.gauge },
      ]
    : []

  return (
    <>
      <div style={{ padding: '24px 30px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.03em', textTransform: 'uppercase' }}>Reconciliation Workspace</div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>As of {r?.asOf ?? '—'}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Sources: Command Center · Zoho Books · Bank (phase 2) · GSTN (phase 2)</div>
          </div>

          <div className="scroll-x" style={{ marginTop: 14 }}>
            <table className="table" style={{ width: '100%', minWidth: 980, fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th>Reconciliation</th>
                  <th>Sources</th>
                  <th style={{ textAlign: 'right' }}>Items</th>
                  <th style={{ textAlign: 'right' }}>Matched</th>
                  <th style={{ textAlign: 'right' }}>Open</th>
                  <th style={{ textAlign: 'right' }}>Difference</th>
                  <th>Owner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(r?.workspace ?? []).map((w) => {
                  const t = tone(w.tone)
                  return (
                    <tr key={w.label}>
                      <td>{w.label}</td>
                      <td style={{ color: 'var(--color-neutral-700)' }}>{w.sources}</td>
                      <td style={{ textAlign: 'right' }}>{w.items}</td>
                      <td style={{ textAlign: 'right' }}>{w.matched}</td>
                      <td style={{ textAlign: 'right', color: w.open === 0 ? 'var(--ok)' : t.fg }}>{w.open}</td>
                      <td className="tabnum" style={{ textAlign: 'right' }}>
                        {w.diff}
                      </td>
                      <td>{w.owner}</td>
                      <td>
                        <RawPill fg={t.fg} bg={t.bg} line={t.line}>
                          {w.state}
                        </RawPill>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Grid min={320}>
          <Card>
            <SectionTitle>Open &amp; Unreconciled Items</SectionTitle>
            <div className="scroll-x" style={{ marginTop: 12 }}>
              <table className="table" style={{ width: '100%', minWidth: 520, fontSize: 11.5 }}>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Value</th>
                    <th style={{ textAlign: 'right' }}>Age</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(r?.openItems ?? []).map((o, i) => (
                    <tr key={o.ref + i}>
                      <td>{o.ref}</td>
                      <td>{o.type}</td>
                      <td className="tabnum" style={{ textAlign: 'right' }}>
                        {o.value}
                      </td>
                      <td style={{ textAlign: 'right' }}>{o.age}</td>
                      <td style={{ color: 'var(--color-neutral-700)' }}>{o.reason}</td>
                    </tr>
                  ))}
                  {r && r.openItems.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: 'var(--ok)' }}>
                        Nothing open.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionTitle>Period Close Checklist</SectionTitle>
            <Stack gap={9} style={{ marginTop: 13 }}>
              {(r?.checklist ?? []).map((c) => (
                <div
                  key={c.label}
                  style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', gap: 10, alignItems: 'baseline', paddingBottom: 7, borderBottom: '1px dashed var(--color-divider)' }}
                >
                  <span style={{ color: c.done ? 'var(--ok)' : 'var(--color-neutral-500)' }}>{c.done ? '✓' : '○'}</span>
                  <span style={{ fontSize: 12.5 }}>
                    {c.label}
                    {!c.derived && <span style={{ color: 'var(--color-neutral-500)', fontSize: 11 }}> · manual</span>}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', whiteSpace: 'nowrap' }}>{c.owner}</span>
                </div>
              ))}
            </Stack>
          </Card>
        </Grid>
      </div>

      <div style={{ padding: '24px 30px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <KpiStrip>
          {exec.map((k) => (
            <KpiTile key={k.label} label={k.label} value={k.value} note={k.note} icon={k.icon} />
          ))}
        </KpiStrip>

        <Split ratio="minmax(0, 1.25fr) minmax(0, 1fr)" gap={20}>
          <Card>
            <SectionTitle>Invoice Processing Funnel</SectionTitle>
            <Stack gap={11} style={{ marginTop: 16 }}>
              {(d?.funnel ?? []).map(([label, v]) => (
                <MeterBar key={label} label={label} value={v.toLocaleString('en-IN')} width={((v / funnelMax) * 100).toFixed(1) + '%'} height={18} valueSize={12} />
              ))}
            </Stack>
          </Card>

          <Card>
            <SectionTitle>Processing Outcome</SectionTitle>
            <Row gap={22} style={{ marginTop: 16 }}>
              <Donut
                slices={(d?.outcomes ?? []).map(([label, pct], i) => ({ label, pct, color: OUTCOME_COLORS[i % 4] }))}
                centerValue={d ? d.exec.stpPct + '%' : '—'}
                centerLabel="Touchless"
              />
              <div style={{ flex: '1 1 180px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {(d?.outcomes ?? []).map(([label, pct], i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, borderBottom: '1px dashed var(--color-divider)', paddingBottom: 6 }}>
                    <span style={{ width: 10, height: 10, flex: '0 0 10px', background: OUTCOME_COLORS[i % 4] }} />
                    <span style={{ flex: '1 1 auto', minWidth: 0 }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </Row>
          </Card>
        </Split>

        <Card>
          <SectionTitle>Exception Breakdown</SectionTitle>
          {d && d.exceptionBars.length > 0 ? (
            <ColumnChart bars={d.exceptionBars.map(([label, value]) => ({ label, value }))} />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 10 }}>No exceptions recorded.</div>
          )}
        </Card>
      </div>

      <Grid min={330} style={{ padding: '24px 30px 0' }}>
        <Card padding={22}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="page-title">Transaction 360</div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
                {state.inv ? `${state.inv.txnId} · ${state.inv.vendor ?? ''}` : 'Open an invoice to see its full lifecycle.'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
            {(t360.data?.stages ?? []).map((t) => (
              <T360Row key={t.label} stage={t} onJump={() => t.jump && actions.go(t.jump)} />
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Reconciliation Status</SectionTitle>
          <Stack gap={10} style={{ marginTop: 14 }}>
            {(r?.status ?? []).map((s) => {
              const t = tone(s.tone)
              return (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', paddingBottom: 8, borderBottom: '1px dashed var(--color-divider)' }}>
                  <div>
                    <div style={{ fontSize: 12.5 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{s.note}</div>
                  </div>
                  <RawPill fg={t.fg} bg={t.bg} line={t.line}>
                    {s.state}
                  </RawPill>
                </div>
              )
            })}
          </Stack>
        </Card>
      </Grid>

      <div style={{ padding: '24px 30px 50px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.03em', textTransform: 'uppercase' }}>Audit Trail</div>
            <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Immutable · every user and system event, newest first</div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
            {(audit.data ?? []).map((a, i) => (
              <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px dashed var(--color-divider)', fontSize: 12 }}>
                <span className="tabnum" style={{ color: 'var(--color-neutral-600)' }}>
                  {a.when}
                </span>
                <span style={{ color: 'var(--color-accent-700)' }}>{a.actor}</span>
                <span style={{ flex: '1 1 200px', minWidth: 160 }}>{a.event}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

export function T360Row({ stage, onJump }: { stage: T360Stage; onJump: () => void }) {
  const c = tone(stage.done ? 'ok' : 'plain')
  return (
    <div className="row-click" onClick={onJump} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr)', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ width: 20, height: 20, display: 'grid', placeItems: 'center', border: `1px solid ${c.fg}`, color: c.fg, background: c.bg, fontSize: 11, borderRadius: 7 }}>
          {stage.done ? '✓' : '○'}
        </span>
        <span style={{ flex: '1 1 auto', width: 1, background: 'var(--color-divider)', minHeight: 12 }} />
      </div>
      <div style={{ paddingBottom: 12, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: stage.done ? 'var(--color-text)' : 'var(--color-neutral-600)' }}>{stage.label}</span>
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{stage.system}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 2 }}>{stage.detail}</div>
      </div>
    </div>
  )
}
