import type { CaseRow } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { statusTone, tone } from '../../lib/tone'
import { Card } from '../ui/Card'
import { KpiStrip, KpiTile } from '../ui/Kpi'
import { Page, Stack } from '../ui/Layout'

const QUEUE = ['Exception', 'Validation Required', 'Awaiting Approval', 'Approved']

/**
 * The match and approval work queue — what a user sees when they open the area
 * without a transaction in hand. Selecting a row opens it where it stands.
 */
export function MatchQueueView() {
  const { state, actions } = useStore()
  const cases = useApi<{ total: number; items: CaseRow[] }>('/invoices?limit=500', [state.refresh])
  const rows = (cases.data?.items ?? []).filter((r) => QUEUE.includes(r.status))
  const count = (s: string) => rows.filter((r) => r.status === s).length

  const kpis = [
    { label: 'Match exceptions', value: count('Exception'), note: 'Quantity, price, GST, missing PO', tone: 'err' as const },
    { label: 'Review required', value: count('Validation Required'), note: 'Passed with warnings', tone: 'warn' as const },
    { label: 'Awaiting approval', value: count('Awaiting Approval'), note: 'DOA chain in progress', tone: 'warn' as const },
    { label: 'Approved', value: count('Approved'), note: 'Ready to post', tone: 'ok' as const },
  ]

  return (
    <Page gap={20} style={{ padding: '22px 30px 50px' }}>
      <KpiStrip min={210}>
        {kpis.map((k) => {
          const t = tone(k.tone)
          return <KpiTile key={k.label} label={k.label} value={String(k.value)} note={k.note} line={t.line} fg={t.fg} />
        })}
      </KpiStrip>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.03em', textTransform: 'uppercase' }}>
              Match &amp; Approval Work Queue
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
              Select a transaction to open its source evidence, match result and approval chain.
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Evidence before decision</div>
        </div>

        <Stack style={{ marginTop: 16 }}>
          {rows.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>
              {cases.loading ? 'Loading…' : 'Nothing waiting — every invoice is either posted or still being read.'}
            </div>
          )}
          {rows.map((r) => {
            const t = tone(statusTone(r.status))
            return (
              <div
                key={r.id}
                className="lift"
                onClick={() => void actions.open(r.id)}
                style={{
                  cursor: 'pointer',
                  border: `1px solid ${t.line}`,
                  borderLeft: `3px solid ${t.fg}`,
                  borderRadius: 10,
                  background: t.bg,
                  padding: '14px 15px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{r.vendor}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
                    {r.caseId} · {r.number} · {r.poType === 'PO' ? 'PO ' + r.po : 'Non-PO'}
                  </div>
                </div>
                <div>
                  <div className="kicker" style={{ letterSpacing: '.12em' }}>
                    Value
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{r.amountText}</div>
                </div>
                <div>
                  <div className="kicker" style={{ letterSpacing: '.12em' }}>
                    Match
                  </div>
                  <div style={{ fontSize: 12.5, color: t.fg }}>
                    {r.match}
                    {r.exception !== '—' ? ` · ${r.exception}` : ''}
                  </div>
                </div>
                <div>
                  <div className="kicker" style={{ letterSpacing: '.12em' }}>
                    Status · next action
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    {r.status} · {r.action}
                  </div>
                </div>
              </div>
            )
          })}
        </Stack>
      </Card>
    </Page>
  )
}
