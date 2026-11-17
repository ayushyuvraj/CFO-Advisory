import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  /** Accent rule across the top — used to colour-code KPI tiles. */
  topLine?: string
  /** Accent rule down the left — used for agent narrative and exception cards. */
  leftLine?: string
  padding?: number | string
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function Card({
  children,
  topLine,
  leftLine,
  padding = 20,
  className = '',
  style,
  onClick,
}: CardProps) {
  return (
    <div
      className={'card' + (onClick ? ' card-hover' : '') + (className ? ' ' + className : '')}
      onClick={onClick}
      style={{
        padding,
        ...(topLine ? { borderTop: `3px solid ${topLine}` } : null),
        ...(leftLine ? { borderLeft: `4px solid ${leftLine}` } : null),
        ...(onClick ? { cursor: 'pointer' } : null),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode
  right?: ReactNode
}) {
  if (!right) return <div className="section-title">{children}</div>
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div className="section-title">{children}</div>
      {right}
    </div>
  )
}

export function Kicker({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div className="kicker" style={color ? { color } : undefined}>
      {children}
    </div>
  )
}

/** A key/value row on a dashed rule — the summary pattern used throughout. */
export function FactRow({
  k,
  v,
  color,
  valueSize = 16,
}: {
  k: ReactNode
  v: ReactNode
  color?: string
  valueSize?: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 7,
        borderBottom: '1px dashed var(--color-divider)',
      }}
    >
      <span className="kicker" style={{ letterSpacing: '.12em', paddingTop: 3 }}>
        {k}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: valueSize,
          textAlign: 'right',
          color: color ?? 'var(--color-text)',
        }}
      >
        {v}
      </span>
    </div>
  )
}
