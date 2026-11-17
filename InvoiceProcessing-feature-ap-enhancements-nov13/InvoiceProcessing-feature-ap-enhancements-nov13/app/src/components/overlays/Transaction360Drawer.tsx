import type { T360Stage } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { T360Row } from '../views/ReconciliationView'
import { Drawer } from './Drawer'

/**
 * Transaction 360 — the persistent transaction ID and the whole lifecycle,
 * upstream (requisition, PO, receipt) and downstream (approval, posting,
 * payment, reconciliation). Each stage jumps to the workspace that owns it.
 */
export function Transaction360Drawer() {
  const { state, actions } = useStore()
  const t360 = useApi<{ txnId: string; stages: T360Stage[] }>(
    state.t360Open && state.sel ? `/invoices/${state.sel}/t360` : null,
    [state.refresh, state.inv?.status],
  )
  if (!state.t360Open || !state.inv) return null
  const inv = state.inv

  return (
    <Drawer width={440} background="#fff" zIndex={48} label="Transaction 360" onClose={() => actions.set({ t360Open: false })}>
      <div style={{ padding: '22px 24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <div>
            <div className="kicker" style={{ color: 'var(--color-accent-700)' }}>
              {inv.txnId} · {inv.caseId}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21, marginTop: 3, lineHeight: 1.1 }}>Transaction 360</div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
              {inv.number} · {inv.vendor}
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => actions.set({ t360Open: false })}>
            Close
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
          {(t360.data?.stages ?? []).map((t) => (
            <T360Row
              key={t.label}
              stage={t}
              onJump={() => {
                if (t.jump) actions.set({ t360Open: false })
                if (t.jump) actions.go(t.jump)
              }}
            />
          ))}
        </div>
      </div>
    </Drawer>
  )
}
