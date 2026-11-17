import { useState } from 'react'
import { useStore } from '../../state/store'
import { verdictTone } from '../../state/selectors'
import { tone } from '../../lib/tone'
import { Card, FactRow, SectionTitle } from '../ui/Card'
import { Grid, Row, Stack } from '../ui/Layout'

/**
 * Verification & DOA approval.
 *
 * The chain comes from the delegation-of-authority matrix for this invoice's
 * value. Each level is approved by the user in the header's "Acting as" — one
 * person cannot approve two levels (segregation of duties).
 */
export function ApprovalView() {
  const { state, actions } = useStore()
  const [comment, setComment] = useState('')
  const inv = state.inv
  if (!inv) return null

  const vTone = tone(verdictTone(inv.matchStatus))
  const pending = inv.approvals.find((a) => a.status === 'pending')
  const actingIsPending = pending?.email && pending.email === state.user
  const fullyApproved = inv.approvals.length > 0 && inv.approvals.every((a) => a.status === 'approved' || a.status === 'not_required')
  const warns = inv.checks.filter((c) => c.status !== 'pass')

  const facts = [
    { k: 'Transaction value', v: inv.totalText + (inv.currency !== 'INR' ? ` (≈ ₹${Math.round(inv.totalInr).toLocaleString('en-IN')})` : ''), color: undefined as string | undefined },
    { k: 'Match status', v: inv.matchStatus === 'pass' ? `${inv.matchMode ?? ''} match passed` : inv.matchStatus === 'fail' ? 'Variance open' : 'Exception open', color: vTone.fg },
    { k: 'Corrections', v: inv.corrections.length ? `${inv.corrections.length} — with reason` : 'None', color: inv.corrections.length ? 'var(--warn)' : 'var(--ok)' },
    { k: 'Checks needing review', v: warns.length ? String(warns.length) : 'None', color: warns.length ? 'var(--warn)' : 'var(--ok)' },
    { k: 'TDS', v: inv.tds.amount ? `u/s ${inv.tds.section} · ${inv.tds.amount.toLocaleString('en-IN')}` : 'Not applicable', color: undefined },
    { k: 'Processing status', v: inv.status, color: undefined },
  ]

  return (
    <Grid min={320} style={{ padding: '22px 30px 50px' }}>
      <Card padding={22}>
        <div className="page-title">Verification &amp; DOA Approval</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-700)' }}>
          Delegation of authority by invoice value · segregation of duties enforced.
        </div>

        {inv.approvals.length === 0 ? (
          <div style={{ marginTop: 18, border: '1px solid var(--warn-line)', background: 'var(--warn-bg)', borderRadius: 10, padding: '13px 14px', fontSize: 12.5, color: 'var(--warn)' }}>
            Not routed for approval yet — the invoice is <b>{inv.status}</b>. Resolve the exception in Source Evidence; approval
            routing starts automatically once the match passes.
          </div>
        ) : (
          <Stack style={{ marginTop: 18 }}>
            {inv.approvals.map((a) => {
              const t = tone(a.tone)
              return (
                <div
                  key={a.level}
                  style={{ display: 'flex', gap: 13, alignItems: 'flex-start', border: `1px solid ${t.line}`, borderRadius: 10, background: t.bg, padding: '13px 14px' }}
                >
                  <span
                    style={{ width: 24, height: 24, flex: '0 0 24px', display: 'grid', placeItems: 'center', border: `1px solid ${t.fg}`, color: t.fg, fontSize: 12, borderRadius: 8 }}
                  >
                    {a.mark}
                  </span>
                  <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{a.role}</span>
                      <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: t.fg }}>{a.state}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 3 }}>
                      {a.name} · {a.limit}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 3 }}>
                      {a.actedBy ? `${a.actedBy} · ${a.when}` : a.when}
                      {a.comment ? ` · “${a.comment}”` : ''}
                    </div>
                    {a.status === 'pending' && a.email && a.email !== state.user && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: 6, paddingLeft: 0 }}
                        onClick={() => actions.setUser(a.email!)}
                      >
                        Act as {a.name} →
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </Stack>
        )}
      </Card>

      <Stack gap={16}>
        <Card>
          <SectionTitle>Why this needs action</SectionTitle>
          <Stack gap={9} style={{ marginTop: 13 }}>
            {facts.map((f) => (
              <FactRow key={f.k} k={f.k} v={f.v} color={f.color} />
            ))}
          </Stack>
          {warns.length > 0 && (
            <Stack gap={4} style={{ marginTop: 12 }}>
              {warns.map((c) => (
                <div key={c.code} style={{ fontSize: 11.5, color: c.status === 'fail' ? 'var(--err)' : 'var(--warn)' }}>
                  {c.label}: {c.detail}
                </div>
              ))}
            </Stack>
          )}
        </Card>

        {pending && (
          <Card>
            <SectionTitle>Your action</SectionTitle>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)', marginTop: 6 }}>
              Pending with <b>{pending.role}</b> ({pending.name}). You are acting as <b>{state.user}</b>
              {actingIsPending ? ' — the assigned approver.' : '.'}
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="approval-comment">Comment</label>
              <input id="approval-comment" className="input" value={comment} placeholder="Optional for approval, required to reject" onChange={(e) => setComment(e.target.value)} />
            </div>
            <Row style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                disabled={!!state.busy}
                onClick={() => void actions.approve(comment).then(() => setComment(''))}
              >
                Approve as {pending.role}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!!state.busy || comment.trim().length < 3}
                title={comment.trim().length < 3 ? 'Enter a comment to reject' : undefined}
                onClick={() => void actions.reject(comment)}
              >
                Reject
              </button>
            </Row>
          </Card>
        )}

        <Row>
          {fullyApproved && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => actions.goStage('submit')}>
              Continue to decision
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => actions.goStage('validation')}>
            Back to match
          </button>
        </Row>
      </Stack>
    </Grid>
  )
}
