import type { Tone } from '../types'

export interface ToneColors {
  /** Foreground — text, marks, left rules. */
  fg: string
  /** Tinted fill. */
  bg: string
  /** Hairline border. */
  line: string
}

/**
 * Status colour discipline: steel-blue for agent and chrome, green/amber/red
 * reserved for validated / attention / exception. Nothing decorative.
 */
const TONES: Record<Tone, ToneColors> = {
  ok: { fg: 'var(--ok)', bg: 'var(--ok-bg)', line: 'var(--ok-line)' },
  warn: { fg: 'var(--warn)', bg: 'var(--warn-bg)', line: 'var(--warn-line)' },
  err: { fg: 'var(--err)', bg: 'var(--err-bg)', line: 'var(--err-line)' },
  info: {
    fg: 'var(--color-accent-800)',
    bg: 'var(--color-accent-100)',
    line: 'var(--color-accent-300)',
  },
  plain: {
    fg: 'var(--color-neutral-800)',
    bg: 'transparent',
    line: 'var(--color-divider)',
  },
}

export function tone(t: Tone | undefined): ToneColors {
  return (t && TONES[t]) || TONES.plain
}

/** Maps an AP processing status onto its colour role. */
export function statusTone(status: string): Tone {
  if (['Posted', 'Paid', 'Approved', 'Processed', 'Submitted'].includes(status)) return 'ok'
  if (status === 'Exception' || status === 'Failed') return 'err'
  if (['Parked', 'Validation Required', 'Awaiting Approval', 'Clarification Requested'].includes(status))
    return 'warn'
  return 'info'
}
