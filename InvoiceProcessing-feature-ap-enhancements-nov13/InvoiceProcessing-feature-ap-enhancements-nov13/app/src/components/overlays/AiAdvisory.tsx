import { useEffect } from 'react'
import { useStore } from '../../state/store'
import { tone } from '../../lib/tone'

/**
 * AI Advisory — raised by the agent itself (the backend's `advisory` for the
 * open invoice), distinct from Ask Agent. It states the finding, the evidence
 * values and the recommendation, with direct actions. Closing collapses it to
 * an edge tab rather than dismissing the finding.
 */
export function AiAdvisory() {
  const { state, actions } = useStore()
  const inv = state.inv
  const adv = inv?.advisory
  const onTransactionScreen = ['processing', 'match', 'ap'].includes(state.view) && state.stage !== 'intake'
  const findingStage = ['review', 'evidence', 'validation'].includes(state.stage)

  // Past the match stages, or once resolved, the finding steps aside to its edge
  // tab so it never covers approval or decision controls. The tab re-opens it.
  useEffect(() => {
    if (adv && (adv.tone === 'ok' || !findingStage)) actions.set({ advisoryOpen: false })
  }, [inv?.id, adv?.tone, findingStage, actions])

  if (!inv || !adv || !onTransactionScreen || state.advisoryDismissed) return null

  const t = tone(adv.tone)

  const handlers: Record<string, () => void> = {
    'Review evidence': () => actions.goStage('evidence'),
    'Correct & revalidate': () =>
      inv.discrepancy ? actions.set({ editOpen: true, editLine: inv.discrepancy.line_no }) : actions.goStage('evidence'),
    'Park invoice': () => actions.set({ view: 'ap', stage: 'submit', parkOpen: true }),
    'Raise query': () => actions.set({ view: 'ap', stage: 'submit', clarifyOpen: true }),
    'View match': () => actions.goStage('validation'),
    'Audit trail': () => actions.go('recon'),
  }

  if (!state.advisoryOpen) {
    return (
      <button
        type="button"
        onClick={() => actions.set({ advisoryOpen: true })}
        aria-label="Show AI advisory"
        style={{
          position: 'fixed',
          right: 0,
          top: 150,
          zIndex: 44,
          cursor: 'pointer',
          background: t.bg,
          border: `1px solid ${t.line}`,
          borderRight: 'none',
          borderRadius: '10px 0 0 10px',
          padding: '11px 13px',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 16, color: t.fg, lineHeight: 1 }}>{adv.tone === 'ok' ? '✓' : '⚠'}</div>
        <div style={{ fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: t.fg, marginTop: 3 }}>AI flag</div>
      </button>
    )
  }

  return (
    <aside
      style={{
        position: 'fixed',
        right: 20,
        top: 128,
        zIndex: 44,
        width: 330,
        maxWidth: '90vw',
        background: '#fff',
        border: `1px solid ${t.line}`,
        borderLeft: `4px solid ${t.fg}`,
        boxShadow: 'var(--shadow-lg)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
      aria-label="AI advisory"
    >
      <div style={{ background: t.bg, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div className="kicker" style={{ color: t.fg }}>
            AI Advisory · {adv.state}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, lineHeight: 1.15, marginTop: 2 }}>{adv.title}</div>
        </div>
        <button
          type="button"
          aria-label="Collapse advisory"
          onClick={() => actions.set({ advisoryOpen: false })}
          style={{
            cursor: 'pointer',
            width: 24,
            height: 24,
            flex: '0 0 24px',
            display: 'grid',
            placeItems: 'center',
            border: `1px solid ${t.line}`,
            background: 'transparent',
            color: t.fg,
            fontSize: 12,
            borderRadius: 7,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '13px 14px 15px' }}>
        {adv.figures.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {adv.figures.map((f) => (
              <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, paddingBottom: 5, borderBottom: '1px dashed var(--color-divider)' }}>
                <span style={{ color: 'var(--color-neutral-700)' }}>{f.k}</span>
                <span style={{ fontWeight: 600 }}>{f.v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="kicker" style={{ letterSpacing: '.12em', marginTop: 13 }}>
          Recommendation
        </div>
        <div style={{ fontSize: 12, marginTop: 3 }}>{adv.text}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
          {adv.actions.map((label, i) => (
            <button
              key={label}
              type="button"
              className={'btn ' + (i === 0 ? 'btn-primary' : 'btn-secondary')}
              onClick={handlers[label] ?? (() => undefined)}
              style={{ padding: '7px 12px', minHeight: 0, fontSize: 12 }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => actions.set({ advisoryDismissed: true })}
            style={{ padding: '7px 12px', minHeight: 0, fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </aside>
  )
}
