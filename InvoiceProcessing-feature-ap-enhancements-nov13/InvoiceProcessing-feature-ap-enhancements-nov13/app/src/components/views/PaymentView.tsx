import { useState } from 'react'
import type { Payment } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { inr, money } from '../../lib/format'
import { tone } from '../../lib/tone'
import { Card, FactRow, SectionTitle } from '../ui/Card'
import { KpiStrip, KpiTile } from '../ui/Kpi'
import { Grid, Page, Row, Stack } from '../ui/Layout'
import { RawPill } from '../ui/Pill'

const STATUS_TONE: Record<Payment['status'], 'ok' | 'warn' | 'info' | 'err'> = {
  proposed: 'warn',
  released: 'info',
  confirmed: 'ok',
  failed: 'err',
}

/**
 * Payment & Treasury — proposal → two-person release → UTR confirmation, after
 * which the vendor payment is written to Zoho Books against the bill.
 */
export function PaymentView() {
  const { state } = useStore()
  const list = useApi<{ items: Payment[]; kpis: Record<string, number> }>('/payments', [state.refresh])
  const payments = list.data?.items ?? []
  const current = state.inv?.payments[0] ?? null
  const [selected, setSelected] = useState<number | null>(null)
  const pay = payments.find((p) => p.id === (selected ?? current?.id)) ?? current

  const sum = (s: Payment['status']) => payments.filter((p) => p.status === s)
  const kpis = [
    { label: 'Awaiting release', items: sum('proposed'), tone: 'warn' as const },
    { label: 'Released · UTR awaited', items: sum('released'), tone: 'info' as const },
    { label: 'Paid', items: sum('confirmed'), tone: 'ok' as const },
  ]

  return (
    <Page gap={20} style={{ padding: '22px 30px 50px' }}>
      <KpiStrip min={210}>
        {kpis.map((k) => {
          const t = tone(k.tone)
          const inrTotal = k.items.reduce((a, p) => a + (p.currency === 'INR' ? p.amount : 0), 0)
          return (
            <KpiTile
              key={k.label}
              label={k.label}
              value={String(k.items.length)}
              note={inrTotal ? inr(inrTotal, false) + (k.items.some((p) => p.currency !== 'INR') ? ' + foreign' : '') : '—'}
              line={t.line}
              fg={t.fg}
            />
          )
        })}
      </KpiStrip>

      {pay ? (
        <PaymentDetail pay={pay} />
      ) : (
        <Card>
          <SectionTitle>No payment selected</SectionTitle>
          <div style={{ fontSize: 12.5, color: 'var(--color-neutral-700)', marginTop: 8 }}>
            A payment proposal is created when an approved invoice is submitted for posting. Pick one from the pipeline below.
          </div>
        </Card>
      )}

      <Card padding={16}>
        <SectionTitle right={<span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>Click a row to open it</span>}>
          Payment Pipeline
        </SectionTitle>
        <div className="scroll-x" style={{ marginTop: 10 }}>
          <table className="table table-rows" style={{ width: '100%', minWidth: 900, fontSize: 11.5 }}>
            <thead>
              <tr>
                <th>Payment</th>
                <th>Vendor</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Mode</th>
                <th>Due</th>
                <th>Prepared by</th>
                <th>Released by</th>
                <th>UTR</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const t = tone(STATUS_TONE[p.status])
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    style={{ cursor: 'pointer', background: pay?.id === p.id ? 'var(--color-accent-100)' : 'transparent' }}
                  >
                    <td>{p.ref}</td>
                    <td>{p.vendor}</td>
                    <td className="tabnum" style={{ textAlign: 'right' }}>
                      {money(p.amount, p.currency)}
                    </td>
                    <td>{p.mode}</td>
                    <td>{p.dueDate}</td>
                    <td>{p.preparedBy}</td>
                    <td>{p.releasedBy ?? '—'}</td>
                    <td>{p.utr ?? '—'}</td>
                    <td>
                      <RawPill fg={t.fg} bg={t.bg} line={t.line}>
                        {p.status}
                      </RawPill>
                    </td>
                  </tr>
                )
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ color: 'var(--color-neutral-600)' }}>
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  )
}

function PaymentDetail({ pay }: { pay: Payment }) {
  const { state, actions } = useStore()
  const [utr, setUtr] = useState('')
  const treasury = state.config?.users.find((u) => u.role === 'Treasury')
  const sameAsPreparer = state.user === pay.preparedBy

  const detail = [
    { k: 'Vendor', v: pay.vendor ?? '—' },
    { k: 'Gross invoice value', v: money(pay.gross, pay.currency) },
    { k: 'TDS withheld', v: pay.tds ? '-' + money(pay.tds, pay.currency) : 'Not applicable' },
    { k: 'Net payable', v: money(pay.amount, pay.currency) },
    { k: 'Due date', v: pay.dueDate },
    { k: 'Bank account', v: `${pay.bankAccount} · ${pay.mode}` },
    { k: 'Prepared by', v: pay.preparedBy },
    { k: 'UTR', v: pay.utr ?? 'Pending' },
  ]

  return (
    <Grid min={320}>
      <Card padding={22}>
        <div className="page-title">
          {pay.ref} · {pay.runId}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-700)' }}>
          Proposal from the posted invoice · two-person release · UTR confirms and records the payment in Zoho Books.
        </div>

        <Stack style={{ marginTop: 18 }}>
          {pay.stages.map((p) => {
            const t = tone(p.tone)
            return (
              <div key={p.label} style={{ display: 'flex', gap: 13, alignItems: 'flex-start', border: `1px solid ${t.line}`, borderRadius: 10, background: t.bg, padding: '13px 14px' }}>
                <span style={{ width: 24, height: 24, flex: '0 0 24px', display: 'grid', placeItems: 'center', border: `1px solid ${t.fg}`, color: t.fg, fontSize: 12, borderRadius: 8 }}>
                  {p.mark}
                </span>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{p.label}</span>
                    <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: t.fg }}>{p.state}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 3 }}>{p.note}</div>
                </div>
              </div>
            )
          })}
        </Stack>

        {pay.status === 'proposed' && (
          <div style={{ marginTop: 18 }}>
            {sameAsPreparer && (
              <div style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 8 }}>
                Two-person rule: you prepared this payment, so someone else must release it.
                {treasury && (
                  <>
                    {' '}
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0 }} onClick={() => actions.setUser(treasury.email)}>
                      Act as {treasury.name} (Treasury) →
                    </button>
                  </>
                )}
              </div>
            )}
            <button type="button" className="btn btn-primary btn-lg" disabled={!!state.busy} onClick={() => void actions.release(pay.id)}>
              Release payment to bank
            </button>
          </div>
        )}

        {pay.status === 'released' && (
          <Row style={{ marginTop: 18 }} align="flex-end">
            <div className="field" style={{ flex: '1 1 220px' }}>
              <label htmlFor="utr">Bank UTR</label>
              <input id="utr" className="input" value={utr} placeholder="e.g. HDFCN26092100001" onChange={(e) => setUtr(e.target.value.toUpperCase())} />
            </div>
            <button type="button" className="btn btn-primary btn-lg" disabled={!!state.busy || utr.length < 10} onClick={() => void actions.confirm(pay.id, utr)}>
              Confirm UTR
            </button>
          </Row>
        )}

        {pay.status === 'confirmed' && (
          <Row style={{ marginTop: 18 }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => actions.go('recon')}>
              Payment complete — view reconciliation
            </button>
          </Row>
        )}
      </Card>

      <Card padding={22}>
        <SectionTitle>Settlement Detail</SectionTitle>
        <Stack gap={9} style={{ marginTop: 14 }}>
          {detail.map((d) => (
            <FactRow key={d.k} k={d.k} v={d.v} color={d.k === 'UTR' ? (pay.utr ? 'var(--ok)' : 'var(--warn)') : undefined} />
          ))}
        </Stack>
        {state.sel !== pay.invoiceId && (
          <button type="button" className="btn btn-secondary" style={{ marginTop: 14 }} onClick={() => void actions.open(pay.invoiceId, 'pay')}>
            Open the invoice
          </button>
        )}
      </Card>
    </Grid>
  )
}
