import { useState } from 'react'
import type { Persona } from '../../types'
import type { Connector, Dashboard } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { JOURNEY, PERSONA_NAMES, PERSONA_SUB } from '../../data/personas'
import { ICON } from '../../data/icons'
import { tone } from '../../lib/tone'
import { Card, SectionTitle } from '../ui/Card'
import { IconChip } from '../ui/Icon'
import { MeterBar } from '../ui/Chart'
import { Grid, Page, Stack } from '../ui/Layout'
import { StatusDot } from '../ui/Pill'

const KPI_ICONS = [ICON.file, ICON.pulse, ICON.gauge, ICON.alert, ICON.clock, ICON.target]

/**
 * The control tower: persona KPIs that drill into their workspace, the seven-step
 * control flow, what needs attention now, the pipeline and the agents' insights —
 * all computed live by the backend.
 */
export function CommandCenterView() {
  const { state, actions } = useStore()
  const persona = state.persona
  const dash = useApi<Dashboard>(`/dashboard?persona=${encodeURIComponent(persona)}`, [state.refresh])
  const connectors = useApi<Connector[]>('/connectors', [state.refresh])
  const d = dash.data
  const funnelMax = Math.max(1, ...(d?.funnel ?? []).map(([, v]) => v))

  return (
    <Page>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, letterSpacing: '.02em' }}>{persona} view</div>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{PERSONA_SUB[persona]}</div>
        </div>
        <div className="field" style={{ minWidth: 210 }}>
          <label htmlFor="persona">Persona</label>
          <select id="persona" className="input" value={persona} onChange={(e) => actions.set({ persona: e.target.value as Persona })}>
            {PERSONA_NAMES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dash.error && <Card leftLine="var(--err)">{dash.error}</Card>}

      <Grid min={270} gap={16}>
        {(d?.kpis ?? []).map((k, i) => {
          const t = tone(k.tone)
          return (
            <Card
              key={k.label}
              topLine={t.line}
              padding="18px 19px"
              onClick={() => actions.go(k.target)}
              style={{ minHeight: 148, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div className="kicker" style={{ fontSize: 10, letterSpacing: '.13em', minHeight: 28 }}>
                  {k.label}
                </div>
                <IconChip path={KPI_ICONS[i % KPI_ICONS.length]} line={t.line} fg={t.fg} bg={t.bg} />
              </div>
              <div className="metric" style={{ fontSize: 36, color: t.fg }}>
                {k.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-700)', marginTop: 3 }}>{k.note}</div>
              <div style={{ marginTop: 'auto', paddingTop: 12, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>
                Open detail →
              </div>
            </Card>
          )
        })}
      </Grid>

      <ControlFlow flow={d?.flow ?? []} />

      <Grid min={320}>
        <Card>
          <SectionTitle right={<div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Highest value first</div>}>Critical Action Items</SectionTitle>
          <Stack gap={10} style={{ marginTop: 14 }}>
            {d && d.attention.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>Nothing needs attention.</div>}
            {(d?.attention ?? []).map((a) => {
              const t = tone(a.tone)
              return (
                <div
                  key={a.title}
                  className="lift"
                  onClick={() => (a.invoiceId ? void actions.open(a.invoiceId) : actions.go(a.view ?? 'home'))}
                  style={{ cursor: 'pointer', border: `1px solid ${t.line}`, borderLeft: `3px solid ${t.fg}`, borderRadius: 10, background: t.bg, padding: '12px 13px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{a.title}</span>
                    <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: t.fg }}>{a.badge}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 4 }}>{a.meta}</div>
                </div>
              )
            })}
          </Stack>
        </Card>

        <Card>
          <SectionTitle>P2P Pipeline</SectionTitle>
          <Stack gap={11} style={{ marginTop: 16 }}>
            {(d?.funnel ?? []).map(([label, value], i) => (
              <MeterBar
                key={label}
                label={label}
                value={value.toLocaleString('en-IN')}
                width={((value / funnelMax) * 100).toFixed(1) + '%'}
                color={i >= 4 ? 'var(--ok)' : 'var(--color-accent-700)'}
                height={12}
                valueSize={14}
                rounded
              />
            ))}
          </Stack>
        </Card>

        <Card>
          <SectionTitle
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--ok)' }}>
                <StatusDot pulse />
                Live
              </div>
            }
          >
            AI Insights
          </SectionTitle>
          <Stack gap={11} style={{ marginTop: 14 }}>
            {(d?.insights ?? []).map((i) => (
              <div key={i.agent + i.text} style={{ borderLeft: '3px solid var(--color-accent-700)', padding: '2px 0 2px 12px' }}>
                <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>{i.agent}</div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>{i.text}</div>
              </div>
            ))}
          </Stack>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-divider)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(connectors.data ?? []).map((c) => {
              const t = tone(c.status === 'connected' ? 'ok' : 'warn')
              return (
                <span
                  key={c.key}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, padding: '5px 10px', border: `1px solid ${t.line}`, borderRadius: 7, background: t.bg, color: t.fg }}
                >
                  <span style={{ width: 6, height: 6, background: t.fg, borderRadius: '50%' }} />
                  {c.name}
                  {c.mode === 'mock' ? ' (demo org)' : ''}
                </span>
              )
            })}
          </div>
        </Card>
      </Grid>
    </Page>
  )
}

/** The seven areas as numbered nodes. Hover explains the step; click opens it. */
function ControlFlow({ flow }: { flow: string[] }) {
  const { state, actions } = useStore()
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <Card padding="22px 24px 18px">
      <SectionTitle right={<div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Hover a step for detail · click to open its workspace</div>}>
        P2P Control Flow
      </SectionTitle>

      <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 22, flexWrap: 'wrap', rowGap: 26, position: 'relative' }}>
        {JOURNEY.map((step, i) => {
          const active = state.view === step.view
          return (
            <div
              key={step.view}
              style={{ flex: '1 1 0', minWidth: 118, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => actions.go(step.view)}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 19,
                  left: i === 0 ? '50%' : 0,
                  right: i === JOURNEY.length - 1 ? '50%' : 0,
                  height: 1,
                  background: 'var(--color-accent-300)',
                }}
              />
              <div
                style={{
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: `2px solid ${active ? 'var(--color-accent-700)' : 'var(--color-accent-400)'}`,
                  background: active ? 'var(--color-accent-700)' : '#fff',
                  color: active ? '#fff' : 'var(--color-accent-800)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 15,
                  boxShadow: hovered === i ? '0 0 0 5px var(--color-accent-100)' : 'none',
                }}
              >
                {i + 1}
              </div>
              <div style={{ cursor: 'pointer', marginTop: 10, textAlign: 'center', fontSize: 11.5, lineHeight: 1.3, padding: '0 6px', color: 'var(--color-neutral-800)' }}>
                {step.label}
              </div>
              {flow[i] && <div style={{ marginTop: 4, textAlign: 'center', fontSize: 10.5, color: tone(step.tone).fg, padding: '0 6px' }}>{flow[i]}</div>}

              {hovered === i && (
                <div
                  style={{
                    position: 'absolute',
                    top: 100,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    width: 232,
                    background: '#fff',
                    border: '1px solid var(--color-accent-700)',
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 10,
                    padding: '13px 14px',
                    textAlign: 'left',
                  }}
                >
                  <div className="kicker" style={{ letterSpacing: '.13em', color: 'var(--color-accent-700)' }}>
                    Step {i + 1}
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, lineHeight: 1.15, marginTop: 3 }}>{step.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 7 }}>{step.source}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>{step.activities}</div>
                  {flow[i] && <div style={{ fontSize: 11.5, color: tone(step.tone).fg, marginTop: 6 }}>{flow[i]}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
