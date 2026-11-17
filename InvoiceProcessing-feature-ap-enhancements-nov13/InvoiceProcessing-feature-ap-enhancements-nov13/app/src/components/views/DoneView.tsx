import { useStore } from '../../state/store'
import { Card } from '../ui/Card'
import { Row } from '../ui/Layout'

/** Confirmation after submit, park or clarification — with the case ID and, on posting, the Zoho bill. */
export function DoneView() {
  const { state, actions } = useStore()
  const inv = state.inv
  const done = state.done
  if (!done || !inv) return null

  const line = done.type === 'submit' ? 'var(--ok)' : 'var(--warn)'
  const kicker = { submit: 'Posted to Zoho Books', park: 'Parked — Awaiting Action', clarify: 'Awaiting Business Action' }[done.type]
  const title = {
    submit: `Invoice ${inv.number} posted`,
    park: `Invoice ${inv.number} has been parked`,
    clarify: `Clarification requested for ${inv.number}`,
  }[done.type]
  const body = {
    submit: `A bill was created in Zoho Books${inv.zohoBillId ? ` (${inv.zohoBillId})` : ''} with the PDF attached, and a payment proposal was raised for ${inv.netPayableText}.`,
    park: `Reason recorded: ${inv.decision.parkReason ?? '—'}. Resume it from AP Processing once the missing information arrives — validation re-runs automatically.`,
    clarify: 'The request is recorded against the case. Resume the invoice from AP Processing once the answer arrives.',
  }[done.type]

  const stats = [
    { k: 'Case ID', v: done.id },
    { k: 'Amount', v: inv.totalText },
    { k: done.type === 'submit' ? 'Zoho bill' : 'Status', v: done.type === 'submit' ? inv.zohoBillId ?? '—' : inv.status },
  ]

  return (
    <div style={{ padding: '46px 30px', display: 'grid', placeItems: 'center' }}>
      <Card topLine={line} padding="32px 34px" style={{ maxWidth: 620, width: '100%', textAlign: 'center' }}>
        <div className="kicker" style={{ letterSpacing: '.16em', color: line }}>
          {kicker}
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, letterSpacing: '.01em', marginTop: 8, lineHeight: 1.15 }}>{title}</div>
        <div style={{ color: 'var(--color-neutral-700)', fontSize: 12.5, marginTop: 8 }}>{body}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginTop: 24, textAlign: 'left' }}>
          {stats.map((s) => (
            <div key={s.k} style={{ border: '1px solid var(--color-divider)', borderRadius: 8, padding: '12px 13px' }}>
              <div className="kicker" style={{ letterSpacing: '.12em' }}>
                {s.k}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginTop: 3, whiteSpace: 'nowrap' }}>{s.v}</div>
            </div>
          ))}
        </div>

        <Row justify="center" style={{ marginTop: 24 }}>
          {done.type === 'submit' && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => actions.goStage('pay')}>
              Continue to Payment
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={actions.resetFlow}>
            Process another invoice
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => actions.go('inbox')}>
            AP Inbox
          </button>
        </Row>
      </Card>
    </div>
  )
}
