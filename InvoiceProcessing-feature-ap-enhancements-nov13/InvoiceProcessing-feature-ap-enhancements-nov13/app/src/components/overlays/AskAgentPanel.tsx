import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../../state/store'

/**
 * Ask Agent — the global copilot.
 *
 * Draggable, minimisable and closable, so it never sits on top of the data the
 * user is reading. It knows the current transaction, cites what it checked,
 * states the finding and recommends — it is not a general chatbot.
 */
export function AskAgentPanel() {
  const { state, actions } = useStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ dx: number; dy: number; width: number } | null>(null)

  const inv = state.inv
  const greeting = inv
    ? {
        role: 'Invoice Processing Agent',
        text:
          inv.pipeline.state === 'done'
            ? `I have read ${inv.number ?? inv.fileName} from ${inv.vendor ?? 'the supplier'} and completed validation. Ask me about the extraction, the match or what should happen next.`
            : 'I am still reading this document — ask me once extraction completes.',
        sources: 'Invoice · Purchase Order · Goods Receipt · Vendor master',
        recommendation: inv.recommendedAction ? inv.recommendedAction + '.' : null,
      }
    : null
  const log = greeting ? [greeting, ...state.chat] : state.chat

  const onMove = useCallback(
    (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      actions.set({
        chatX: Math.max(8, Math.min(window.innerWidth - d.width - 8, e.clientX - d.dx)),
        chatY: Math.max(8, Math.min(window.innerHeight - 60, e.clientY - d.dy)),
      })
    },
    [actions],
  )

  const onUp = useCallback(() => {
    drag.current = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }, [onMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onMove, onUp])

  const startDrag = (e: React.MouseEvent) => {
    const panel = panelRef.current
    if (!panel) return
    const r = panel.getBoundingClientRect()
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, width: r.width }
    e.preventDefault()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (state.chatClosed || !inv) return null

  const prompts = state.suggested

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        // Docked bottom-right until dragged, clear of the content and of the
        // AI Advisory in the top-right band.
        left: state.chatX === null ? 'calc(100vw - 412px)' : state.chatX,
        top: state.chatY === null ? (state.chatOpen ? 'calc(100vh - 560px)' : 'calc(100vh - 84px)') : state.chatY,
        zIndex: 45,
        width: 392,
        maxWidth: '92vw',
        background: '#fff',
        border: '1px solid var(--color-accent-700)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '74vh',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        onMouseDown={startDrag}
        style={{
          cursor: 'move',
          background: 'var(--color-accent-700)',
          color: '#fff',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          userSelect: 'none',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 16,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
            }}
          >
            Ask Agent
          </div>
          <div style={{ fontSize: 11, opacity: 0.82 }}>
            Ask about {inv.number ?? inv.fileName} or its validation.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <PanelButton
            label={state.chatOpen ? 'Minimise' : 'Expand'}
            onClick={() => actions.set((p) => ({ chatOpen: !p.chatOpen }))}
          >
            {state.chatOpen ? '–' : '+'}
          </PanelButton>
          <PanelButton label="Close" onClick={() => actions.set({ chatClosed: true })}>
            ✕
          </PanelButton>
        </div>
      </div>

      {state.chatOpen && (
        <>
          <div
            style={{
              padding: '14px 16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {state.chatBusy && (
              <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', order: 1 }}>The agent is checking the transaction…</div>
            )}
            {log.map((m, i) => {
              const you = m.role === 'You'
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: you ? 'flex-end' : 'flex-start',
                    maxWidth: '92%',
                    border: `1px solid ${you ? 'var(--color-accent-300)' : 'var(--color-divider)'}`,
                    borderLeft: `3px solid ${you ? 'var(--color-accent-500)' : 'var(--color-accent-700)'}`,
                    borderRadius: 8,
                    background: you ? 'var(--color-accent-100)' : '#fff',
                    padding: '10px 12px',
                  }}
                >
                  <div
                    className="kicker"
                    style={{ letterSpacing: '.12em', color: you ? 'var(--color-accent-800)' : 'var(--color-accent-700)' }}
                  >
                    {m.role}
                  </div>
                  {m.sources && (
                    <div
                      style={{ marginTop: 7, fontSize: 11, color: 'var(--color-neutral-700)' }}
                    >
                      <div className="kicker" style={{ letterSpacing: '.1em' }}>
                        Agent checked
                      </div>
                      <div>{m.sources}</div>
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, marginTop: 6, color: 'var(--color-text)' }}>
                    {m.text}
                  </div>
                  {m.recommendation && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 7,
                        borderTop: '1px dashed var(--color-divider)',
                        fontSize: 11.5,
                      }}
                    >
                      <span className="kicker" style={{ letterSpacing: '.1em' }}>
                        Recommendation
                      </span>
                      <br />
                      {m.recommendation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div
            style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}
          >
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                disabled={state.chatBusy}
                onClick={() => void actions.ask(p)}
                style={{
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '5px 9px',
                  border: '1px solid var(--color-accent-300)',
                  borderRadius: 6,
                  background: '#fff',
                  color: 'var(--color-accent-800)',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (state.chatDraft.trim() && !state.chatBusy) void actions.ask(state.chatDraft.trim())
            }}
            style={{
              padding: '10px 16px 14px',
              borderTop: '1px solid var(--color-divider)',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              className="input"
              aria-label="Ask the Invoice Processing Agent"
              value={state.chatDraft}
              placeholder="Ask about this invoice…"
              onChange={(e) => actions.set({ chatDraft: e.target.value })}
              style={{ flex: '1 1 auto', minWidth: 0 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ minHeight: 38, padding: '0 14px', fontSize: 13 }}
            >
              Ask
            </button>
          </form>
        </>
      )}
    </div>
  )
}

function PanelButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        width: 26,
        height: 26,
        display: 'grid',
        placeItems: 'center',
        border: '1px solid rgba(255,255,255,.45)',
        background: 'transparent',
        color: '#fff',
        fontSize: 14,
        lineHeight: 1,
        borderRadius: 7,
      }}
    >
      {children}
    </button>
  )
}
