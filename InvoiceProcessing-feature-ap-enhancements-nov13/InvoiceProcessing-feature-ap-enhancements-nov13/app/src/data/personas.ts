import type { Persona, Tone, View } from '../types'

/**
 * The Command Center is role-based: the same P2P data, framed for what each
 * persona decides. The figures come from `/api/dashboard?persona=…`; this file
 * holds only the static framing.
 */

export const PERSONA_NAMES: Persona[] = ['CFO', 'AP Lead', 'Finance Controller', 'Finance User']

export const PERSONA_SUB: Record<Persona, string> = {
  CFO: 'Strategic P2P health, liquidity exposure and material risk',
  'AP Lead': 'Operational control across the invoice-to-payment pipeline',
  'Finance Controller': 'Control, accounting accuracy, reconciliation and audit evidence',
  'Finance User': 'Your work queue — what needs you next',
}

/** The seven-step P2P Control Flow. The live status line comes from the dashboard. */
export interface JourneyStep {
  label: string
  view: View
  source: string
  activities: string
  tone: Tone
}

export const JOURNEY: JourneyStep[] = [
  {
    label: 'Invoice Intake & Intelligence',
    view: 'processing',
    source: 'Agent: Gemini document understanding',
    activities: 'Upload · extraction · GST validation · duplicate check',
    tone: 'ok',
  },
  {
    label: 'Requisition & Procurement',
    view: 'procure',
    source: 'Source: Zoho Books',
    activities: 'PR · PO · approval · amendments',
    tone: 'warn',
  },
  {
    label: 'Goods / Service Receipt',
    view: 'receipt',
    source: 'Source: Zoho Books',
    activities: 'Purchase receive · service entry',
    tone: 'warn',
  },
  {
    label: 'Match, Verify & Approve',
    view: 'match',
    source: 'Agent: Matching & Approval',
    activities: 'Evidence · 2/3-way match · DOA approval',
    tone: 'err',
  },
  {
    label: 'AP Processing & Settlement',
    view: 'ap',
    source: 'System of record: Zoho Books',
    activities: 'Decision · TDS · coding · bill posting',
    tone: 'info',
  },
  {
    label: 'Payment & Treasury',
    view: 'pay',
    source: 'Treasury · bank',
    activities: 'Proposal · two-person release · UTR',
    tone: 'warn',
  },
  {
    label: 'Reconciliation & P2P Insights',
    view: 'recon',
    source: 'Agent: Reconciliation',
    activities: 'Invoice ↔ payment · Zoho bills · GR/IR · close',
    tone: 'err',
  },
]
