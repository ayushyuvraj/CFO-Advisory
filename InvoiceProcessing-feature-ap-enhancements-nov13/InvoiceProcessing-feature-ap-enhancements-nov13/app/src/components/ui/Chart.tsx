/** The small set of charts the dashboards need. Deliberately few, deliberately plain. */

/** A labelled horizontal meter — funnel stages, channel mix, AI accuracy. */
export function MeterBar({
  label,
  value,
  width,
  height = 14,
  color = 'var(--color-accent-700)',
  note,
  valueSize = 15,
  rounded = false,
}: {
  label: string
  value: string
  width: string
  height?: number
  color?: string
  note?: string
  valueSize?: number
  rounded?: boolean
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: valueSize }}>{value}</span>
      </div>
      <div
        style={{
          height,
          border: '1px solid var(--color-accent-300)',
          background: 'var(--color-accent-100)',
          borderRadius: rounded ? height / 2 : 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: height - 2, background: color, width, transition: 'width .3s' }} />
      </div>
      {note && (
        <div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', marginTop: 4 }}>
          {note}
        </div>
      )}
    </div>
  )
}

export interface DonutSlice {
  label: string
  pct: number
  color: string
}

/**
 * Processing outcome as a ring with the headline figure in the hub. Slices are
 * laid out by accumulating dash offsets around a 100-unit circumference.
 */
export function Donut({
  slices,
  centerValue,
  centerLabel,
  size = 152,
}: {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
  size?: number
}) {
  let offset = 0
  const arcs = slices.map((s) => {
    const arc = { ...s, dash: `${s.pct} ${100 - s.pct}`, offset: -offset }
    offset += s.pct
    return arc
  })

  return (
    <div style={{ position: 'relative', flex: `0 1 ${size}px`, maxWidth: size }}>
      <svg
        viewBox="0 0 42 42"
        style={{ width: size, height: size, transform: 'rotate(-90deg)' }}
        role="img"
        aria-label={`${centerLabel} ${centerValue}`}
      >
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-neutral-200)" strokeWidth="6" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="21"
            cy="21"
            r="15.9"
            fill="none"
            stroke={a.color}
            strokeWidth="6"
            strokeDasharray={a.dash}
            strokeDashoffset={a.offset}
          />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <div className="metric" style={{ fontSize: 26, color: 'var(--color-accent-900)' }}>
            {centerValue}
          </div>
          <div className="kicker" style={{ letterSpacing: '.12em' }}>
            {centerLabel}
          </div>
        </div>
      </div>
    </div>
  )
}

/** A column chart for the exception breakdown. */
export function ColumnChart({
  bars,
  height = 164,
}: {
  bars: { label: string; value: number }[]
  height?: number
}) {
  const max = Math.max(...bars.map((b) => b.value))
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          height,
          marginTop: 18,
          borderBottom: '1px solid var(--color-divider)',
          borderLeft: '1px solid var(--color-divider)',
          padding: '0 6px',
        }}
      >
        {bars.map((b) => (
          <div
            key={b.label}
            style={{
              flex: '1 1 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              height: '100%',
              gap: 6,
            }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14 }}>{b.value}</span>
            <div
              style={{
                width: '100%',
                height: Math.round((b.value / max) * 100) + '%',
                background: 'var(--color-accent-500)',
                border: '1px solid var(--color-accent-700)',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, padding: '8px 6px 0' }}>
        {bars.map((b) => (
          <div
            key={b.label}
            style={{
              flex: '1 1 0',
              fontSize: 10,
              textAlign: 'center',
              color: 'var(--color-neutral-700)',
              lineHeight: 1.25,
            }}
          >
            {b.label}
          </div>
        ))}
      </div>
    </>
  )
}
