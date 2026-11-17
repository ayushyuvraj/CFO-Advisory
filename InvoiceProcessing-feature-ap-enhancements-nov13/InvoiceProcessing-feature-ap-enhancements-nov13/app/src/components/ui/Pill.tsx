import type { ReactNode } from 'react'
import type { Tone } from '../../types'
import { tone as toneColors } from '../../lib/tone'

/** A status pill — processing status, match verdict, receipt state. */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = toneColors(tone)
  return (
    <span className="pill" style={{ borderColor: t.line, background: t.bg, color: t.fg }}>
      {children}
    </span>
  )
}

/** A pill with explicit colours, for callers that already resolved a tone. */
export function RawPill({
  fg,
  bg,
  line,
  children,
}: {
  fg: string
  bg: string
  line: string
  children: ReactNode
}) {
  return (
    <span className="pill" style={{ borderColor: line, background: bg, color: fg }}>
      {children}
    </span>
  )
}

/** A live status dot. Pulses only while something is genuinely in flight. */
export function StatusDot({
  color = 'var(--ok)',
  pulse = false,
  size = 7,
}: {
  color?: string
  pulse?: boolean
  size?: number
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        background: color,
        animation: pulse ? 'ipa-pulse 1.6s infinite' : 'none',
      }}
    />
  )
}

/** The source-system provenance badge: which system owns this data. */
export function SourceBadge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9.5,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        border: '1px solid var(--color-accent-300)',
        background: 'var(--color-accent-100)',
        color: 'var(--color-accent-800)',
        borderRadius: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
