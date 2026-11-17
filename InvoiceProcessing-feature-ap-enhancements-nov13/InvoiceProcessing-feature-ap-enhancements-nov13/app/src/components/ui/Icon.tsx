/** A thin-stroke Lucide glyph. Paths come from `data/icons`. */
export function Icon({ path, size }: { path: string; size?: number }) {
  return (
    <svg
      className="ic"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={size ? { width: size, height: size, flex: `0 0 ${size}px` } : undefined}
    >
      <path d={path} />
    </svg>
  )
}

/** The icon in its accent-tinted square — used on KPI tiles and channel cards. */
export function IconChip({
  path,
  line,
  fg,
  bg,
  style,
}: {
  path: string
  line?: string
  fg?: string
  bg?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className="chip"
      style={{
        ...(line ? { borderColor: line } : null),
        ...(fg ? { color: fg } : null),
        ...(bg ? { background: bg } : null),
        ...style,
      }}
    >
      <Icon path={path} />
    </span>
  )
}
