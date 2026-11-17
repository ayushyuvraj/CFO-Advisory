import { Card } from './Card'
import { IconChip } from './Icon'

/**
 * A compact KPI tile: small-caps label, the number, a qualifying note, and an
 * optional icon chip. Colour comes from the metric's status role, never decoration.
 */
export function KpiTile({
  label,
  value,
  note,
  icon,
  line = 'var(--color-accent-700)',
  fg = 'var(--color-accent-900)',
  chipBg,
  onClick,
}: {
  label: string
  value: string
  note?: string
  icon?: string
  line?: string
  fg?: string
  chipBg?: string
  onClick?: () => void
}) {
  return (
    <Card topLine={line} padding="15px 16px" onClick={onClick}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div className="kicker" style={{ letterSpacing: '.13em', minHeight: 26 }}>
          {label}
        </div>
        {icon && <IconChip path={icon} line={line} fg={fg} bg={chipBg} />}
      </div>
      <div className="metric" style={{ fontSize: 28, color: fg, marginTop: 4 }}>
        {value}
      </div>
      {note && <div style={{ fontSize: 11, color: 'var(--color-neutral-700)' }}>{note}</div>}
    </Card>
  )
}

/** A four- or six-up responsive strip of KPI tiles. */
export function KpiStrip({
  children,
  min = 190,
}: {
  children: React.ReactNode
  min?: number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap: 14,
      }}
    >
      {children}
    </div>
  )
}
