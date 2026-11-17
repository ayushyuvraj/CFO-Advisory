import type { PoRow, RegisterKpi, Requisition } from '../../api/types'
import { api } from '../../api/client'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { RefreshButton } from '../ui/RefreshButton'
import { tone } from '../../lib/tone'
import { Card } from '../ui/Card'
import { KpiStrip, KpiTile } from '../ui/Kpi'
import { Grid, Page } from '../ui/Layout'
import { RawPill, SourceBadge } from '../ui/Pill'

/**
 * Requisition & Procurement.
 *
 * Executed in Zoho Books, presented in the Command Center's own chrome — the
 * user should not feel they have crossed into another application. A purchase
 * order drills back to the requisition that raised it, so an invoice can always
 * be traced to the original business need.
 */
export function ProcurementView() {
  const { state, actions } = useStore()
  const reg = useApi<{ kpis: RegisterKpi[]; rows: PoRow[] }>('/registers/purchase-orders', [state.refresh])

  const drill = async (po: string) => {
    try {
      actions.set({ prDrill: await api<Requisition>(`/registers/purchase-orders/${encodeURIComponent(po)}/requisition`) })
    } catch (e) {
      actions.notify('err', e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page>
      <KpiStrip min={210}>
        {(reg.data?.kpis ?? []).map((k) => {
          const t = tone(k.tone)
          return (
            <KpiTile key={k.label} label={k.label} value={k.value} note={k.note} line={t.line} fg={t.fg} />
          )
        })}
      </KpiStrip>

      <Card padding={18}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 17,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                }}
              >
                Purchase Orders
              </div>
              <SourceBadge>Source: Zoho Books</SourceBadge>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
              Created and approved in Zoho Books · consolidated here with invoice and receipt
              linkage
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
              Click a PO to view its originating requisition
            </div>
            <RefreshButton />
          </div>
        </div>

        <div className="scroll-x" style={{ marginTop: 12 }}>
          <table
            className="table table-rows"
            style={{ width: '100%', minWidth: 1020, fontSize: 11.5 }}
          >
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>PO Date</th>
                <th style={{ textAlign: 'right' }}>PO Value</th>
                <th style={{ textAlign: 'right' }}>Received</th>
                <th style={{ textAlign: 'right' }}>Invoiced</th>
                <th>Cost Centre</th>
                <th>Buyer</th>
                <th>Status</th>
                <th>Originating PR</th>
              </tr>
            </thead>
            <tbody>
              {(reg.data?.rows ?? []).map((p) => {
                const t = tone(p.tone)
                return (
                  <tr
                    key={p.po}
                    onClick={() => void drill(p.po)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{p.po}</td>
                    <td>{p.vendor}</td>
                    <td>{p.date}</td>
                    <td className="tabnum" style={{ textAlign: 'right' }}>
                      {p.value}
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.received}</td>
                    <td style={{ textAlign: 'right' }}>{p.invoiced}</td>
                    <td>{p.cc ?? '—'}</td>
                    <td>{p.buyer ?? '—'}</td>
                    <td>
                      <RawPill fg={t.fg} bg={t.bg} line={t.line}>
                        {p.status}
                      </RawPill>
                    </td>
                    <td style={{ color: 'var(--color-accent-700)' }}>{p.pr ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {state.prDrill && (
        <Card leftLine="var(--color-accent-700)">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="kicker" style={{ letterSpacing: '.13em', color: 'var(--color-accent-700)' }}>
                Originating requisition
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginTop: 3 }}>
                {state.prDrill.pr} — {state.prDrill.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
                Raised by {state.prDrill.raisedBy} · {state.prDrill.dept} · {state.prDrill.date}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => actions.set({ prDrill: null })}
            >
              Close
            </button>
          </div>

          <Grid min={180} gap={12} style={{ marginTop: 16 }}>
            {state.prDrill.facts.map((f) => (
              <div
                key={f.k}
                style={{
                  border: '1px solid var(--color-divider)',
                  borderRadius: 8,
                  padding: '11px 12px',
                }}
              >
                <div className="kicker" style={{ letterSpacing: '.12em' }}>
                  {f.k}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginTop: 3 }}>
                  {f.v}
                </div>
              </div>
            ))}
          </Grid>

          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-neutral-700)' }}>
            Requisitions and their approval chain execute in Zoho; the Command Center holds the
            linkage so an invoice can be traced back to the original business need.
          </div>
        </Card>
      )}
    </Page>
  )
}
