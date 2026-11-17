import { useStore } from '../../state/store'
import { Drawer } from './Drawer'

/** Case detail from the AP inbox — the facts, then what the agent actually did. */
export function CaseDetailDrawer() {
  const { state, actions } = useStore()
  const detail = state.detail
  if (!detail) return null

  const rows = [
    { k: 'Amount', v: detail.amountText },
    { k: 'Currency', v: detail.currency },
    { k: 'PO number', v: detail.po },
    { k: 'PO type', v: detail.poType },
    { k: 'AI confidence', v: detail.conf },
    { k: 'Match', v: detail.match },
    { k: 'Processing status', v: detail.status },
    { k: 'Exception type', v: detail.exception },
  ]

  return (
    <Drawer label="Case detail" onClose={() => actions.set({ detail: null })}>
      <div style={{ padding: '24px 26px 34px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div>
            <div className="kicker" style={{ color: 'var(--color-accent-700)' }}>
              {detail.caseId}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 23,
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              {detail.vendor}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>
              {detail.number} · {detail.date}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => void actions.open(detail.id)}>
              Open transaction
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => actions.set({ detail: null })}>
              Close
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginTop: 20,
          }}
        >
          {rows.map((r) => (
            <div
              key={r.k}
              style={{
                border: '1px solid var(--color-divider)',
                borderRadius: 8,
                background: '#fff',
                padding: '10px 11px',
              }}
            >
              <div className="kicker" style={{ letterSpacing: '.12em' }}>
                {r.k}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginTop: 3 }}>
                {r.v}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            letterSpacing: '.05em',
            textTransform: 'uppercase',
            margin: '22px 0 10px',
          }}
        >
          Agent Activity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {detail.timeline.map((t, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px 1fr 48px',
                gap: 10,
                padding: '5px 0',
                alignItems: 'baseline',
                borderBottom: '1px dashed var(--color-divider)',
              }}
            >
              <span style={{ color: t.mark === '⚠' ? 'var(--warn)' : 'var(--color-accent-700)' }}>{t.mark}</span>
              <span style={{ fontSize: 12 }}>{t.text}</span>
              <span
                className="tabnum"
                style={{
                  fontSize: 10.5,
                  color: 'var(--color-neutral-600)',
                  textAlign: 'right',
                }}
              >
                {t.time}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            borderLeft: '3px solid var(--color-accent-700)',
            paddingLeft: 14,
            fontSize: 12.5,
            color: 'var(--color-neutral-800)',
          }}
        >
          {detail.note}
        </div>
      </div>
    </Drawer>
  )
}
