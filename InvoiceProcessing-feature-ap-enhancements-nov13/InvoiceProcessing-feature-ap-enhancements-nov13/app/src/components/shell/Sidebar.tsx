import type { View } from '../../types'
import { ICON } from '../../data/icons'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import type { CaseRow, Connector } from '../../api/types'
import { Icon } from '../ui/Icon'

/**
 * Navigation is the business process, not the underlying systems. A user never
 * sees "Zoho" or "Invoice Engine" in the sidebar — they see the P2P area they
 * are working in.
 */
export function Sidebar() {
  const { state, actions } = useStore()
  const cases = useApi<{ total: number; items: CaseRow[] }>('/invoices?limit=500', [state.refresh])
  const connectors = useApi<Connector[]>('/connectors', [state.refresh])

  const rows = cases.data?.items ?? []
  const count = (...statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).length
  const badge = (n: number) => (n ? String(n) : undefined)

  const items: { label: string; view: View; badge?: string; icon: string }[] = [
    { label: 'Command Center', view: 'home', icon: ICON.grid },
    { label: 'Invoice Intake & Intelligence', view: 'processing', badge: badge(count('Received', 'In Progress')), icon: ICON.file },
    { label: 'Requisition & Procurement', view: 'procure', icon: ICON.db },
    { label: 'Goods / Service Receipt', view: 'receipt', icon: ICON.layers },
    {
      label: 'Match, Verify & Approve',
      view: 'match',
      badge: badge(count('Exception', 'Validation Required', 'Awaiting Approval')),
      icon: ICON.target,
    },
    {
      label: 'AP Processing & Settlement',
      view: 'ap',
      badge: badge(count('Approved', 'Parked', 'Clarification Requested')),
      icon: ICON.inbox,
    },
    { label: 'Payment & Treasury', view: 'pay', badge: badge(count('Posted')), icon: ICON.pulse },
    { label: 'Reconciliation & P2P Insights', view: 'recon', icon: ICON.gauge },
    { label: 'AP Inbox', view: 'inbox', badge: badge(rows.length), icon: ICON.inbox },
  ]

  const connectedCount = (connectors.data ?? []).filter((c) => c.status === 'connected').length

  return (
    <nav
      style={{
        width: 250,
        flex: '0 0 250px',
        borderRight: '1px solid var(--color-divider)',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '1px 0 3px rgba(16, 26, 44, .04)',
      }}
      aria-label="P2P process areas"
    >
      <div
        style={{
          padding: '20px 18px 17px',
          borderBottom: '1px solid var(--color-divider)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            flex: '0 0 30px',
            background: 'var(--color-accent-700)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            borderRadius: 9,
          }}
        >
          FC
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 16.5,
              lineHeight: 1.08,
              letterSpacing: '.02em',
              textTransform: 'uppercase',
            }}
          >
            Finance Command
            <br />
            Center — P2P
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--color-neutral-700)',
              marginTop: 5,
              lineHeight: 1.35,
            }}
          >
            Procure-to-pay orchestration with GST invoice intelligence
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: 'var(--color-neutral-600)',
            padding: '0 10px 10px',
          }}
        >
          P2P Process
        </div>
        {items.map((item) => {
          const active = state.view === item.view
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => actions.go(item.view)}
              aria-current={active ? 'page' : undefined}
              className="nav-item"
              style={{
                cursor: 'pointer',
                padding: '10px 11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                border: 0,
                borderLeft: `3px solid ${active ? 'var(--color-accent-700)' : 'transparent'}`,
                background: active ? 'var(--color-accent-100)' : 'transparent',
                color: active ? 'var(--color-accent-900)' : 'var(--color-neutral-800)',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon path={item.icon} />
                {item.label}
              </span>
              {item.badge && (
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    border: '1px solid var(--color-divider)',
                    borderRadius: 5,
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 'auto',
          padding: '16px 8px 18px',
          borderTop: '1px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <button
          type="button"
          className="nav-item"
          onClick={() => actions.set({ connectorOpen: true })}
          style={{
            cursor: 'pointer',
            padding: '10px 11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: 0,
            background: 'transparent',
            color: 'var(--color-neutral-800)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            width: '100%',
            textAlign: 'left',
          }}
        >
          <span>Connected Systems</span>
          <span style={{ fontSize: 10.5, color: 'var(--ok)' }}>{connectedCount} active</span>
        </button>
        <div
          style={{
            margin: '12px 11px 0',
            paddingTop: 12,
            borderTop: '1px dashed var(--color-divider)',
            fontSize: 10.5,
            color: 'var(--color-neutral-600)',
            lineHeight: 1.45,
          }}
        >
          {state.config?.orgName ?? 'Finance Command Center'}
          <br />
          {state.user}
        </div>
      </div>
    </nav>
  )
}
