import type { Connector } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { Drawer } from './Drawer'

/**
 * Enterprise Connect — the systems the backend is actually connected to, with
 * a manual Zoho Books sync. In mock mode Zoho is the seeded demo organisation.
 */
export function ConnectorPanel() {
  const { state, actions } = useStore()
  const list = useApi<Connector[]>(state.connectorOpen ? '/connectors' : null, [state.refresh])
  if (!state.connectorOpen) return null
  const close = () => actions.set({ connectorOpen: false })

  return (
    <Drawer width={520} background="#fff" zIndex={55} label="Enterprise Connect" onClose={close}>
      <div style={{ padding: '24px 26px 20px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 23, letterSpacing: '.03em', textTransform: 'uppercase' }}>Enterprise Connect</div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)', marginTop: 5, maxWidth: '46ch' }}>
              Systems the Command Center reads from and writes to.
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Close
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.error && <div style={{ color: 'var(--err)', fontSize: 12 }}>{list.error}</div>}
        {(list.data ?? []).map((c) => {
          const connected = c.status === 'connected'
          return (
            <div
              key={c.key}
              style={{
                border: `1px solid ${connected ? 'var(--ok-line)' : 'var(--warn-line)'}`,
                borderLeft: `3px solid ${connected ? 'var(--ok)' : 'var(--warn)'}`,
                borderRadius: 10,
                background: connected ? 'var(--ok-bg)' : 'var(--warn-bg)',
                padding: '15px 16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: connected ? 'var(--ok)' : 'var(--warn)', fontSize: 13 }}>{connected ? '✓' : '!'}</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>{c.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 3 }}>
                    {c.category}
                    {c.mode ? ` · ${c.mode === 'mock' ? 'demo organisation' : 'live'}` : ''}
                    {c.model ? ` · ${c.model}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 4 }}>
                    {c.status}
                    {c.lastSync ? ` · last synchronised ${c.lastSync}` : ''}
                  </div>
                </div>
                {c.key === 'zoho' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!!state.busy}
                    onClick={() => void actions.syncZoho()}
                    style={{ whiteSpace: 'nowrap', minHeight: 38, fontSize: 12.5, padding: '0 15px' }}
                  >
                    {state.busy === 'Synchronising Zoho Books' ? 'Syncing…' : 'Sync now'}
                  </button>
                )}
              </div>
              {c.meta?.counts && (
                <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px dashed var(--color-divider)', fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
                  <span className="kicker" style={{ letterSpacing: '.12em' }}>
                    Data available{c.meta.organization ? ` · ${c.meta.organization}` : ''}
                  </span>
                  <br />
                  {Object.entries(c.meta.counts)
                    .map(([k, v]) => `${v} ${k.replace('_', ' ')}`)
                    .join(' · ')}
                </div>
              )}
              {c.warning && <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--warn)' }}>{c.warning}</div>}
            </div>
          )
        })}
      </div>
    </Drawer>
  )
}
