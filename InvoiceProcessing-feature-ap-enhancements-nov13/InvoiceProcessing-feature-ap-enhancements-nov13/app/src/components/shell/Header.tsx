import type { View } from '../../types'
import { useStore } from '../../state/store'
import { tone } from '../../lib/tone'

const VIEW_META: Record<View, [title: string, sub: string]> = {
  home: [
    'Finance Command Center',
    'One P2P platform · Zoho Books executes and records, the Command Center orchestrates, the bank pays',
  ],
  processing: ['Invoice Intake & Intelligence', 'Upload · Gemini document understanding · GST validation'],
  procure: ['Requisition & Procurement', 'Purchase orders executed in Zoho Books · consolidated here'],
  receipt: ['Goods / Service Receipt', 'Purchase receives and service entries from Zoho Books'],
  match: ['Match, Verify & Approve', 'Evidence before decision · source data, match, DOA approval'],
  ap: ['AP Processing & Settlement', 'Decision, TDS, coding and posting to Zoho Books'],
  pay: ['Payment & Treasury', 'Payment proposal, two-person release and UTR confirmation'],
  recon: ['Reconciliation & P2P Insights', 'Transaction 360, closure and end-to-end P2P intelligence'],
  inbox: ['AP Inbox', 'Every invoice in the Command Center, with its status and next action'],
}

export function Header() {
  const { state, actions } = useStore()
  const [title, sub] = VIEW_META[state.view]
  const pipeline = state.inv?.pipeline
  const working = !!state.busy || pipeline?.state === 'running' || pipeline?.state === 'queued'
  const status = state.busy
    ? state.busy + '…'
    : pipeline?.state === 'running' || pipeline?.state === 'queued'
      ? 'Analyzing'
      : pipeline?.state === 'error'
        ? 'Extraction failed'
        : state.inv
          ? state.inv.status
          : 'Ready'

  const users = state.config?.users ?? []
  const me = users.find((u) => u.email === state.user)

  return (
    <header
      style={{
        borderBottom: '1px solid var(--color-divider)',
        background: '#fff',
        padding: '15px 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        position: 'relative',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 21,
            letterSpacing: '.02em',
            textTransform: 'uppercase',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>{sub}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Approvals and payment release depend on who is acting. */}
        <div className="field" style={{ minWidth: 230 }}>
          <label htmlFor="acting-user" style={{ fontSize: 9.5 }}>
            Acting as{me ? ` · ${me.role}` : ''}
          </label>
          <select
            id="acting-user"
            className="input"
            value={state.user}
            onChange={(e) => actions.setUser(e.target.value)}
            style={{ minHeight: 36, padding: '4px 8px' }}
          >
            {!me && state.user && <option value={state.user}>{state.user}</option>}
            {users.map((u) => (
              <option key={u.email} value={u.email}>
                {u.name} — {u.role}
              </option>
            ))}
          </select>
        </div>

        {state.sel && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: 40 }}
            onClick={() => actions.set((p) => ({ t360Open: !p.t360Open }))}
          >
            Transaction 360
          </button>
        )}
        {state.sel && (state.chatClosed || !state.chatOpen) && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: 40 }}
            onClick={() => actions.set({ chatClosed: false, chatOpen: true })}
          >
            Ask Agent
          </button>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '1px solid var(--color-divider)',
            borderLeft: '3px solid var(--color-accent-700)',
            borderRadius: 10,
            padding: '9px 16px',
            minWidth: 170,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: working ? 'var(--color-accent-700)' : 'var(--ok)',
              animation: working ? 'ipa-pulse 1s infinite' : 'none',
            }}
          />
          <div>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--color-neutral-600)',
              }}
            >
              Agent Status
            </div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 15,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
              }}
            >
              {status}
            </div>
          </div>
        </div>
      </div>

      {state.toast && <Toast />}
    </header>
  )
}

/** The outcome of the last action — and, on refusal, the backend's reason. */
function Toast() {
  const { state, actions } = useStore()
  const t = tone(state.toast!.tone)
  return (
    <div
      role="status"
      onClick={() => actions.set({ toast: null })}
      style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        maxWidth: 'min(640px, 92vw)',
        cursor: 'pointer',
        border: `1px solid ${t.line}`,
        borderLeft: `4px solid ${t.fg}`,
        borderRadius: 10,
        background: state.toast!.tone === 'plain' ? '#fff' : t.bg,
        boxShadow: 'var(--shadow-lg)',
        padding: '11px 16px',
        fontSize: 13,
        color: t.fg,
      }}
    >
      {state.toast!.text}
    </div>
  )
}
