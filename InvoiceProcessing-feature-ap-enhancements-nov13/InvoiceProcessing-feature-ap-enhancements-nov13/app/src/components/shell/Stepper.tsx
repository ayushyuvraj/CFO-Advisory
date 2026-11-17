import { STAGE_LABELS, STAGE_ORDER, STAGE_VIEW, useStore } from '../../state/store'

/**
 * The eight-stage journey stepper. Completed stages are clickable so a user can
 * step back into evidence or extraction without restarting the invoice; upcoming
 * stages stay inert.
 */
export function Stepper() {
  const { state, actions } = useStore()
  // Without an open transaction the stepper has nothing to show.
  if (!state.sel) return null
  const current = STAGE_ORDER.indexOf(state.stage)

  return (
    <div style={{ padding: '22px 30px 0' }}>
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 10,
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {STAGE_ORDER.map((stage, i) => {
          const active = i === current
          const past = i < current

          return (
            <li
              key={stage}
              onClick={past ? () => actions.set({ stage, view: STAGE_VIEW[stage] }) : undefined}
              aria-current={active ? 'step' : undefined}
              style={{
                minWidth: 0,
                padding: '11px 14px',
                border: `1px solid ${active ? 'var(--color-accent-700)' : 'var(--color-divider)'}`,
                borderRadius: 10,
                cursor: past ? 'pointer' : 'default',
                background: active
                  ? 'var(--color-accent-700)'
                  : past
                    ? 'var(--color-accent-100)'
                    : '#fff',
                color: active ? '#fff' : past ? 'var(--color-accent-900)' : 'var(--color-neutral-600)',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  border: `1px solid ${active ? 'rgba(255,255,255,.6)' : 'var(--color-divider)'}`,
                  borderRadius: 6,
                  width: 22,
                  height: 22,
                  display: 'grid',
                  placeItems: 'center',
                  flex: '0 0 22px',
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-heading)',
                  minWidth: 0,
                  lineHeight: 1.25,
                }}
              >
                {STAGE_LABELS[stage]}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
