/** UI-side domain types. Server data shapes live in `api/types.ts`. */

/** The seven P2P areas plus the command centre and the AP inbox. */
export type View =
  | 'home'
  | 'processing'
  | 'procure'
  | 'receipt'
  | 'match'
  | 'ap'
  | 'pay'
  | 'recon'
  | 'inbox'

/** Where the open transaction sits in the invoice-to-payment journey. */
export type Stage =
  | 'intake'
  | 'review'
  | 'evidence'
  | 'validation'
  | 'approve'
  | 'submit'
  | 'pay'
  | 'done'

export type Persona = 'CFO' | 'AP Lead' | 'Finance Controller' | 'Finance User'

export type IntakeMethod = 'upload' | 'connector' | 'mailbox'

/** Semantic colour role. Green validated, amber attention, red exception, blue agent. */
export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'plain'

/** The confirmation shown after submit, park or clarification. */
export interface DoneState {
  type: 'submit' | 'park' | 'clarify'
  id: string
}
