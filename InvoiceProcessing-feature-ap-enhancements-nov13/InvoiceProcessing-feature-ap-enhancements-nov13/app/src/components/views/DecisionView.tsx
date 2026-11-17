import { useState } from 'react'
import { useStore } from '../../state/store'
import { verdictTone } from '../../state/selectors'
import { tone } from '../../lib/tone'
import { Card } from '../ui/Card'
import { Split, Stack } from '../ui/Layout'

/**
 * Agent Decision — submit for posting to Zoho Books, park, or request
 * clarification; or resume a parked invoice. The backend refuses anything the
 * controls do not allow, and the reason is shown as it comes back.
 */
export function DecisionView() {
  const { state, actions } = useStore()
  const inv = state.inv
  const [note, setNote] = useState('')
  const [to, setTo] = useState('Business owner')
  if (!inv) return null

  const t = tone(verdictTone(inv.matchStatus))
  const parked = inv.status === 'Parked' || inv.status === 'Clarification Requested'
  const approved = inv.status === 'Approved'
  const pending = inv.approvals.find((a) => a.status === 'pending')

  const summary = [
    { k: 'Vendor', v: inv.vendor ?? '—', color: undefined as string | undefined },
    { k: 'Invoice number', v: inv.number ?? '—', color: undefined },
    { k: 'PO number', v: inv.po || 'Not referenced', color: undefined },
    { k: 'Total amount', v: inv.totalText, color: undefined },
    { k: 'Net payable', v: inv.netPayableText + (inv.tds.amount ? ` (TDS ${inv.tds.section})` : ''), color: undefined },
    { k: 'Match status', v: inv.matchStatus === 'pass' ? 'Passed' : inv.matchStatus === 'fail' ? 'Failed' : 'Exception', color: t.fg },
    { k: 'Approval', v: approved ? 'Fully approved' : pending ? `Pending — ${pending.role}` : 'Not routed', color: approved ? 'var(--ok)' : 'var(--warn)' },
    { k: 'Status', v: inv.status + (inv.decision.parkReason ? ` — ${inv.decision.parkReason}` : ''), color: undefined },
  ]

  return (
    <Split ratio="minmax(0, 1fr) minmax(0, .82fr)" gap={24} style={{ padding: '22px 30px 60px' }}>
      <Card padding={24}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 23, letterSpacing: '.02em' }}>Agent Decision</div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            padding: '5px 11px',
            border: `1px solid ${t.line}`,
            borderRadius: 7,
            background: t.bg,
            color: t.fg,
            fontSize: 12,
          }}
        >
          <span style={{ width: 7, height: 7, background: t.fg }} />
          {approved ? 'Ready to post to Zoho Books' : parked ? 'Parked — awaiting information' : 'Action required'}
        </div>

        <Stack gap={9} style={{ marginTop: 20 }}>
          {summary.map((r) => (
            <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, paddingBottom: 7, borderBottom: '1px dashed var(--color-divider)' }}>
              <span className="kicker" style={{ paddingTop: 4 }}>
                {r.k}
              </span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-heading)', fontSize: 17, color: r.color ?? 'var(--color-text)' }}>{r.v}</span>
            </div>
          ))}
        </Stack>
        {inv.decision.note && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-neutral-700)' }}>Note: {inv.decision.note}</div>
        )}
      </Card>

      <Stack gap={14}>
        {parked ? (
          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!!state.busy} onClick={() => void actions.decide('resume')}>
            Resume &amp; revalidate
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            disabled={!!state.busy}
            title={!approved ? 'Needs a passed match and full approval — the backend will say what is missing' : undefined}
            onClick={() => void actions.decide('submit')}
          >
            Submit for Posting to Zoho Books
          </button>
        )}
        {!parked && (
          <button
            type="button"
            className="btn btn-secondary btn-lg btn-block"
            onClick={() =>
              actions.set({
                parkOpen: true,
                parkReason:
                  inv.matchStatus === 'exception' ? 'Missing PO' : inv.matchStatus === 'fail' ? 'Quantity discrepancy' : 'Missing approval',
              })
            }
          >
            Park Invoice
          </button>
        )}
        {!parked && (
          <button type="button" className="btn btn-secondary btn-lg btn-block" onClick={() => actions.set({ clarifyOpen: !state.clarifyOpen })}>
            Request Clarification
          </button>
        )}

        {state.clarifyOpen && !parked && (
          <Card>
            <div className="field">
              <label htmlFor="clarify-to">Ask</label>
              <select id="clarify-to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>
                {['Business owner', 'Vendor', 'Buyer', 'Plant stores'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="clarify-note">Question</label>
              <textarea
                id="clarify-note"
                className="input"
                rows={3}
                value={note}
                placeholder="e.g. Please confirm the cost centre and attach approval evidence."
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 10 }}
              disabled={!note.trim() || !!state.busy}
              onClick={() => void actions.decide('clarify', { note, to })}
            >
              Send request
            </button>
          </Card>
        )}

        <div
          style={{
            border: '1px solid var(--color-divider)',
            borderLeft: '3px solid var(--color-accent-700)',
            borderRadius: 10,
            padding: '15px 16px',
            color: 'var(--color-neutral-800)',
            fontSize: 12.5,
            background: '#fff',
          }}
        >
          <div className="kicker" style={{ marginBottom: 6 }}>
            Agent recommendation
          </div>
          {inv.recommendation}
        </div>
      </Stack>
    </Split>
  )
}
