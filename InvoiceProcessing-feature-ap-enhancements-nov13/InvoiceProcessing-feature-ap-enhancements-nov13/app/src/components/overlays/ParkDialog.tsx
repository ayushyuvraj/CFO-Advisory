import { useState } from 'react'
import { useStore } from '../../state/store'

/**
 * Park dialog. The reason is seeded from the agent's own finding so the user
 * confirms rather than re-diagnoses; the note travels with the case.
 */
export function ParkDialog() {
  const { state, actions } = useStore()
  const [note, setNote] = useState('')
  if (!state.parkOpen) return null
  const close = () => actions.set({ parkOpen: false })
  const reasons = state.config?.parkReasons ?? []

  return (
    <div className="dialog-backdrop" style={{ zIndex: 60 }} onClick={close}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Park invoice"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 460, maxWidth: '92vw', padding: 26 }}
      >
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21, letterSpacing: '.02em' }}>Why is this invoice being parked?</div>

        <div style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="park-reason">Parking reason</label>
            <select id="park-reason" className="input" value={state.parkReason} onChange={(e) => actions.set({ parkReason: e.target.value })}>
              {reasons.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="park-note">Note</label>
            <input id="park-note" className="input" value={note} placeholder="Optional — what is awaited" onChange={(e) => setNote(e.target.value)} />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 12 }}>
            The invoice is held. Resume it once the information arrives — validation and the match re-run automatically.
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!!state.busy}
            onClick={() => void actions.decide('park', { reason: state.parkReason, note: note || undefined }).then(() => setNote(''))}
          >
            Park Invoice
          </button>
        </div>
      </div>
    </div>
  )
}
