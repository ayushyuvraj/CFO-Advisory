import type { CSSProperties, ReactNode } from 'react'

/** The standard page padding used by every workspace. */
export function Page({
  children,
  gap = 20,
  style,
}: {
  children: ReactNode
  gap?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        padding: '24px 30px 50px',
        display: 'flex',
        flexDirection: 'column',
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/**
 * A responsive grid of equal cells. Every grid in the product uses auto-fit
 * tracks so columns collapse rather than squeeze — text stays readable well
 * below 1000px while still filling a 1440px desktop.
 */
export function Grid({
  children,
  min = 300,
  gap = 20,
  align = 'start',
  style,
}: {
  children: ReactNode
  min?: number
  gap?: number
  align?: CSSProperties['alignItems']
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap,
        alignItems: align,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** A two-column split with explicit weights, collapsing to one column when narrow. */
export function Split({
  children,
  ratio = '1fr 1fr',
  gap = 22,
  style,
}: {
  children: ReactNode
  ratio?: string
  gap?: number
  style?: CSSProperties
}) {
  return (
    <div
      className="split"
      style={{
        display: 'grid',
        gridTemplateColumns: ratio,
        gap,
        alignItems: 'start',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Row({
  children,
  gap = 12,
  wrap = true,
  align = 'center',
  justify,
  style,
}: {
  children: ReactNode
  gap?: number
  wrap?: boolean
  align?: CSSProperties['alignItems']
  justify?: CSSProperties['justifyContent']
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Stack({
  children,
  gap = 12,
  style,
}: {
  children: ReactNode
  gap?: number
  style?: CSSProperties
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>{children}</div>
  )
}
