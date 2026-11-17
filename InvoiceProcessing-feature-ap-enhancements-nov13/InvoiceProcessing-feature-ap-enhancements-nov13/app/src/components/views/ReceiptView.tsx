import type { GrnRow, RegisterKpi } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { RefreshButton } from '../ui/RefreshButton'
import { qty } from '../../lib/format'
import { tone } from '../../lib/tone'
import { Card } from '../ui/Card'
import { KpiStrip, KpiTile } from '../ui/Kpi'
import { Page } from '../ui/Layout'
import { RawPill, SourceBadge } from '../ui/Pill'

/**
 * Goods / Service Receipt.
 *
 * Receipt quantities are authoritative for matching — which is exactly why they
 * are read-only in the resolution columns and can only be changed at source.
 */
export function ReceiptView() {
  const { state } = useStore()
  const reg = useApi<{ kpis: RegisterKpi[]; rows: GrnRow[] }>('/registers/receipts', [state.refresh])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 17,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
            }}
          >
            Goods &amp; Service Receipts
          </div>
          <SourceBadge>Source: Zoho Books</SourceBadge>
          <div style={{ marginLeft: 'auto' }}>
            <RefreshButton />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
          Purchase receives and service entries in Zoho Books · quantities are authoritative for matching
        </div>

        <div className="scroll-x" style={{ marginTop: 12 }}>
          <table
            className="table table-rows"
            style={{ width: '100%', minWidth: 1180, fontSize: 11.5 }}
          >
            <thead>
              <tr>
                <th>GRN / SES</th>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Receipt Date</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Ordered</th>
                <th style={{ textAlign: 'right' }}>Received</th>
                <th style={{ textAlign: 'right' }}>Accepted</th>
                <th style={{ textAlign: 'right' }}>Pending</th>
                <th>Plant / Location</th>
                <th>Receive Status</th>
                <th>Bill Status</th>
              </tr>
            </thead>
            <tbody>
              {(reg.data?.rows ?? []).map((g) => {
                const t = tone(g.tone)
                const b = tone(g.billTone)
                return (
                  <tr key={g.grn}>
                    <td>{g.grn}</td>
                    <td>{g.po}</td>
                    <td>{g.vendor}</td>
                    <td>{g.date}</td>
                    <td>{g.type}</td>
                    <td style={{ textAlign: 'right' }}>{qty(g.ordered)}</td>
                    <td style={{ textAlign: 'right' }}>{qty(g.received)}</td>
                    <td style={{ textAlign: 'right' }}>{qty(g.accepted)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: g.pending ? 'var(--warn)' : 'var(--color-neutral-600)',
                      }}
                    >
                      {g.pending ? qty(g.pending) : '—'}
                    </td>
                    <td>{g.plant ?? '—'}</td>
                    <td>
                      <RawPill fg={t.fg} bg={t.bg} line={t.line}>
                        {g.status}
                      </RawPill>
                    </td>
                    <td>
                      <RawPill fg={b.fg} bg={b.bg} line={b.line}>
                        {g.billStatus}
                      </RawPill>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  )
}
