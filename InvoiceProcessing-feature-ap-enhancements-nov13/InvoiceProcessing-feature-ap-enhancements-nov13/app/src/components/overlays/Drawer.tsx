import type { ReactNode } from 'react'

/** A right-hand drawer over a scrim. Clicking the scrim closes it. */
export function Drawer({
  width = 500,
  background = 'var(--color-bg)',
  zIndex = 50,
  onClose,
  children,
  label,
}: {
  width?: number
  background?: string
  zIndex?: number
  onClose: () => void
  children: ReactNode
  label: string
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 31, 82, .35)',
        zIndex,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <aside
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '94vw',
          height: '100%',
          background,
          borderLeft: '1px solid var(--color-divider)',
          boxShadow: 'var(--shadow-lg)',
          overflowY: 'auto',
        }}
      >
        {children}
      </aside>
    </div>
  )
}
