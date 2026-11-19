import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DoneState, IntakeMethod, Persona, Stage, Tone, View } from '../types'
import type {
  AppConfig,
  CaseRow,
  ChatMessage,
  InvoiceDetail,
  Progress,
  Requisition,
} from '../api/types'
import { ApiError, api, setActingUser } from '../api/client'

// ── State ─────────────────────────────────────────────────────────────────────

export interface AppState {
  view: View
  stage: Stage
  method: IntakeMethod

  /** The open transaction, as the backend last returned it. */
  sel: string | null
  inv: InvoiceDetail | null
  /** Viewer page and the traced field (`fieldKey` or `item{lineNo}`). */
  page: number
  focus: string | null

  config: AppConfig | null
  /** Who is acting — sent as X-User on every request. */
  user: string
  persona: Persona

  connectorOpen: boolean

  // Ask Agent
  chatX: number | null
  chatY: number | null
  chatOpen: boolean
  chatClosed: boolean
  chatDraft: string
  chat: ChatMessage[]
  suggested: string[]
  chatBusy: boolean

  // AI Advisory
  advisoryOpen: boolean
  advisoryDismissed: boolean

  t360Open: boolean

  // Decision dialogs
  parkOpen: boolean
  parkReason: string
  clarifyOpen: boolean
  done: DoneState | null

  // Line correction workspace
  editOpen: boolean
  editLine: number | null
  editField: 'quantity' | 'rate' | 'tax_rate'
  editValue: string
  editReason: string
  editComment: string

  /** Label of the action in flight, and the last outcome to show. */
  busy: string | null
  toast: { tone: Tone; text: string } | null
  uploading: boolean
  /** Bumped after every write so lists and dashboards re-fetch. */
  refresh: number

  // AP inbox
  q: string
  fStatus: string
  fType: string
  fCurrency: string
  fException: string
  detail: CaseRow | null

  prDrill: Requisition | null
}

const USER_KEY = 'fcc.actingUser'

function storedUser(): string {
  try {
    return localStorage.getItem(USER_KEY) ?? ''
  } catch {
    return ''
  }
}

const INITIAL_STATE: AppState = {
  view: 'home',
  stage: 'intake',
  method: 'upload',
  sel: null,
  inv: null,
  page: 1,
  focus: null,
  config: null,
  user: storedUser(),
  persona: 'AP Lead',
  connectorOpen: false,
  chatX: null,
  chatY: null,
  chatOpen: false,
  chatClosed: false,
  chatDraft: '',
  chat: [],
  suggested: [],
  chatBusy: false,
  advisoryOpen: true,
  advisoryDismissed: false,
  t360Open: false,
  parkOpen: false,
  parkReason: 'Missing PO',
  clarifyOpen: false,
  done: null,
  editOpen: false,
  editLine: null,
  editField: 'quantity',
  editValue: '',
  editReason: '',
  editComment: '',
  busy: null,
  toast: null,
  uploading: false,
  refresh: 0,
  q: '',
  fStatus: 'All statuses',
  fType: 'All',
  fCurrency: 'All',
  fException: 'All',
  detail: null,
  prDrill: null,
}

type Patch = Partial<AppState> | ((prev: AppState) => Partial<AppState>)

// ── Journey ───────────────────────────────────────────────────────────────────

export const STAGE_ORDER: Stage[] = [
  'intake',
  'review',
  'evidence',
  'validation',
  'approve',
  'submit',
  'pay',
  'done',
]

export const STAGE_LABELS: Record<Stage, string> = {
  intake: 'Intake',
  review: 'Extraction',
  evidence: 'Source Evidence',
  validation: 'Match',
  approve: 'Verify & Approve',
  submit: 'Decision',
  pay: 'Payment',
  done: 'Confirmation',
}

export const STAGE_VIEW: Record<Stage, View> = {
  intake: 'processing',
  review: 'processing',
  evidence: 'match',
  validation: 'match',
  approve: 'match',
  submit: 'ap',
  pay: 'pay',
  done: 'ap',
}

/** Where to land when opening an invoice, given where it is in its life. */
export function stageFor(inv: InvoiceDetail): Stage {
  if (inv.pipeline.state !== 'done') return 'review'
  switch (inv.status) {
    case 'Exception':
      return 'evidence'
    case 'Validation Required':
      return 'validation'
    case 'Awaiting Approval':
      return 'approve'
    case 'Approved':
    case 'Parked':
    case 'Clarification Requested':
      return 'submit'
    case 'Posted':
    case 'Paid':
      return 'pay'
    default:
      return 'review'
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

export interface AppActions {
  set: (patch: Patch) => void
  go: (view: View) => void
  goStage: (stage: Stage) => void
  setUser: (email: string) => void
  upload: (file: File) => Promise<void>
  open: (id: string, stage?: Stage, page?: number) => Promise<void>
  reload: () => Promise<void>
  reprocess: () => Promise<void>
  revalidate: () => Promise<void>
  correctLine: (lineNo: number, field: string, value: string, reason: string, comment?: string) => Promise<boolean>
  correctField: (key: string, value: string, reason: string, comment?: string) => Promise<boolean>
  sourceRequest: (document: 'purchase_order' | 'goods_receipt', field: string, requested: string, reason: string) => Promise<void>
  approve: (comment?: string) => Promise<void>
  reject: (comment: string) => Promise<void>
  decide: (action: 'submit' | 'park' | 'clarify' | 'resume', extra?: { reason?: string; note?: string; to?: string }) => Promise<boolean>
  release: (paymentId: number) => Promise<void>
  confirm: (paymentId: number, utr: string) => Promise<void>
  ask: (question: string) => Promise<void>
  syncZoho: () => Promise<void>
  notify: (tone: Tone, text: string) => void
  resetFlow: () => void
}

/** Busy label while Zoho Books is being re-read (Sync now / Refresh). */
export const SYNC_LABEL = 'Synchronising Zoho Books'

interface Store {
  state: AppState
  actions: AppActions
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  const set = useCallback((patch: Patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])

  const notify = useCallback((tone: Tone, text: string) => set({ toast: { tone, text } }), [set])

  // Toasts clear themselves.
  useEffect(() => {
    if (!state.toast) return
    const t = window.setTimeout(() => set({ toast: null }), state.toast.tone === 'err' ? 8000 : 4500)
    return () => window.clearTimeout(t)
  }, [state.toast, set])

  /** Runs a backend action: shows it as in flight, surfaces the server's reason on failure. */
  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>, success?: string): Promise<T | null> => {
      set({ busy: label })
      try {
        const out = await fn()
        set((p) => ({ busy: null, refresh: p.refresh + 1, ...(success ? { toast: { tone: 'ok', text: success } } : {}) }))
        return out
      } catch (e) {
        const text = e instanceof ApiError || e instanceof Error ? e.message : String(e)
        set({ busy: null, toast: { tone: 'err', text } })
        return null
      }
    },
    [set],
  )

  // ── Config and acting user ────────────────────────────────────────────────
  useEffect(() => {
    let queryUser: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        queryUser = params.get('userEmail') || params.get('user');
        const queryCompany = params.get('companyId') || params.get('tenantId');
        const queryPersona = params.get('personaId');
        if (queryUser) {
          localStorage.setItem(USER_KEY, queryUser);
        }
        if (queryCompany) {
          localStorage.setItem('kpmg_cfo_company_id', queryCompany);
        }
        if (queryPersona) {
          localStorage.setItem('kpmg_cfo_persona_id', queryPersona);
        }
      } catch {
        /* storage unavailable */
      }
    }

    api<AppConfig>('/config')
      .then((config) => {
        const user = queryUser || stateRef.current.user || config.defaultUser
        setActingUser(user)
        set({ config, user, parkReason: config.parkReasons[0] ?? 'Other', editReason: config.correctionReasons[0] ?? '' })
      })
      .catch((e) => notify('err', e instanceof Error ? e.message : String(e)))
  }, [set, notify])

  const setUser = useCallback(
    (email: string) => {
      setActingUser(email)
      try {
        localStorage.setItem(USER_KEY, email)
      } catch {
        /* storage unavailable — the choice still applies for this session */
      }
      set({ user: email })
    },
    [set],
  )

  // ── Transaction ───────────────────────────────────────────────────────────
  const applyInvoice = useCallback(
    (inv: InvoiceDetail, stage?: Stage) => {
      set((p) => {
        const nextStage = stage ?? (p.sel === inv.id ? p.stage : stageFor(inv))
        return {
          inv,
          sel: inv.id,
          stage: nextStage,
          view: STAGE_VIEW[nextStage],
        }
      })
    },
    [set],
  )

  const loadChat = useCallback(
    async (id: string) => {
      try {
        const c = await api<{ suggested: string[]; messages: ChatMessage[] }>(`/invoices/${id}/copilot`)
        if (stateRef.current.sel === id) set({ chat: c.messages, suggested: c.suggested })
      } catch {
        /* the panel still works without history */
      }
    },
    [set],
  )

  const openRequest = useRef(0)
  const open = useCallback(
    async (id: string, stage?: Stage, page?: number) => {
      const request = ++openRequest.current
      const inv = await run('Opening invoice', () => api<InvoiceDetail>(`/invoices/${id}`))
      if (!inv || request !== openRequest.current) return
      const pageNavigation = page !== undefined && inv.documentInvoices?.some(x => x.id === stateRef.current.sel)
      set({
        page: Math.max(1, Math.min(page ?? inv.invoiceStartPage ?? 1, inv.pages)),
        focus: null,
        done: null,
        detail: null,
        advisoryOpen: pageNavigation ? stateRef.current.advisoryOpen : true,
        advisoryDismissed: pageNavigation ? stateRef.current.advisoryDismissed : false,
        chat: [],
        t360Open: false,
        sel: null, // so applyInvoice picks the stage for this invoice, not the previous one
      })
      applyInvoice(inv, stage ?? stageFor(inv))
      void loadChat(id)
    },
    [run, set, applyInvoice, loadChat],
  )

  const reload = useCallback(async () => {
    const id = stateRef.current.sel
    if (!id) return
    try {
      const inv = await api<InvoiceDetail>(`/invoices/${id}`)
      if (stateRef.current.sel === id) set({ inv })
    } catch (e) {
      notify('err', e instanceof Error ? e.message : String(e))
    }
  }, [set, notify])

  /** Writes that return the updated invoice replace it in place. */
  const write = useCallback(
    async (label: string, path: string, body: Record<string, unknown> | undefined, success?: string) => {
      const inv = await run(label, () => api<InvoiceDetail>(path, 'POST', body ?? {}), success)
      if (inv && stateRef.current.sel === inv.id) set({ inv })
      return inv
    },
    [run, set],
  )

  // Poll the pipeline while the agent is working on the open invoice.
  const pipelineState = state.inv?.pipeline.state
  useEffect(() => {
    const id = state.sel
    if (!id || (pipelineState !== 'queued' && pipelineState !== 'running')) return
    const timer = window.setInterval(async () => {
      try {
        const p = await api<Progress>(`/invoices/${id}/progress`)
        if (stateRef.current.sel !== id) return
        if (p.state === 'done' || p.state === 'error') {
          const inv = await api<InvoiceDetail>(`/invoices/${id}`)
          set((prev) => ({ inv, refresh: prev.refresh + 1 }))
        } else {
          set((prev) =>
            prev.inv ? { inv: { ...prev.inv, status: p.status, pipeline: { ...prev.inv.pipeline, state: p.state, step: p.step } } } : {},
          )
        }
      } catch {
        /* transient — the next tick retries */
      }
    }, 900)
    return () => window.clearInterval(timer)
  }, [state.sel, pipelineState, set])

  const upload = useCallback(
    async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      form.append('channel', stateRef.current.method === 'mailbox' ? 'mailbox' : 'upload')
      set({ uploading: true })
      const inv = await run('Uploading', () => api<InvoiceDetail>('/invoices', 'POST', form))
      set({ uploading: false })
      if (!inv) return
      set({ page: 1, focus: null, done: null, chat: [], advisoryOpen: true, advisoryDismissed: false, sel: null })
      applyInvoice(inv, 'review')
      void loadChat(inv.id)
    },
    [run, set, applyInvoice, loadChat],
  )

  const actions = useMemo<AppActions>(() => {
    const id = () => stateRef.current.sel
    return {
      set,
      notify,
      setUser,
      upload,
      open,
      reload,

      go: (view) =>
        set((prev) => {
          const next: Partial<AppState> = { view, detail: null }
          // Keep the stepper truthful when entering an area from the sidebar.
          if (view === 'match' && !['evidence', 'validation', 'approve'].includes(prev.stage)) {
            next.stage = 'intake' // shows the match work queue
          }
          if (view === 'processing' && !['intake', 'review'].includes(prev.stage)) {
            next.stage = prev.sel ? 'review' : 'intake'
          }
          if (view === 'ap' && !['submit', 'done'].includes(prev.stage)) next.stage = 'intake'
          if (view === 'pay') next.stage = 'pay'
          return next
        }),

      goStage: (stage) => set({ stage, view: STAGE_VIEW[stage] }),

      reprocess: async () => {
        const sel = id()
        if (!sel) return
        const ok = await run('Re-running extraction', () => api(`/invoices/${sel}/reprocess`, 'POST', {}))
        if (ok) {
          set((p) => (p.inv ? { inv: { ...p.inv, pipeline: { ...p.inv.pipeline, state: 'queued', step: 0, error: null } } } : {}))
        }
      },

      revalidate: async () => {
        const sel = id()
        if (sel) await write('Re-running validation', `/invoices/${sel}/revalidate`, {}, 'Validation and match re-run')
      },

      correctLine: async (lineNo, field, value, reason, comment) => {
        const sel = id()
        if (!sel) return false
        const inv = await write(
          'Applying correction',
          `/invoices/${sel}/corrections`,
          { target: 'line', line_no: lineNo, field, value, reason, comment: comment || null },
          'Correction applied — match re-run',
        )
        return !!inv
      },

      correctField: async (key, value, reason, comment) => {
        const sel = id()
        if (!sel) return false
        const inv = await write(
          'Applying correction',
          `/invoices/${sel}/corrections`,
          { target: 'field', key, value, reason, comment: comment || null },
          'Correction applied — validation re-run',
        )
        return !!inv
      },

      sourceRequest: async (document, field, requested, reason) => {
        const sel = id()
        if (!sel) return
        const r = await run(
          'Raising source request',
          () =>
            api<{ ref: string; documentRef: string }>(`/invoices/${sel}/source-requests`, 'POST', {
              document,
              field,
              requested_value: requested || null,
              reason,
            }),
        )
        if (r) {
          notify('info', `${r.ref} raised with the Zoho Books owner of ${r.documentRef}`)
          await reload()
        }
      },

      approve: async (comment) => {
        const sel = id()
        if (sel) await write('Approving', `/invoices/${sel}/approve`, { comment: comment || null }, 'Approved')
      },

      reject: async (comment) => {
        const sel = id()
        if (sel) await write('Rejecting', `/invoices/${sel}/reject`, { comment }, 'Rejected — invoice parked')
      },

      decide: async (action, extra) => {
        const sel = id()
        if (!sel) return false
        const inv = await write('Recording decision', `/invoices/${sel}/decision`, { action, ...extra })
        if (!inv) return false
        if (action === 'resume') {
          set({ stage: stageFor(inv), view: STAGE_VIEW[stageFor(inv)] })
        } else {
          set({ stage: 'done', view: 'ap', done: { type: action, id: inv.caseId }, parkOpen: false, clarifyOpen: false })
        }
        return true
      },

      release: async (paymentId) => {
        const ok = await run('Releasing payment', () => api(`/payments/${paymentId}/release`, 'POST', {}), 'Payment released to bank')
        if (ok) await reload()
      },

      confirm: async (paymentId, utr) => {
        const ok = await run(
          'Confirming UTR',
          () => api(`/payments/${paymentId}/confirm`, 'POST', { utr }),
          'UTR recorded — vendor payment written to Zoho Books',
        )
        if (ok) await reload()
      },

      ask: async (question) => {
        const sel = id()
        if (!sel || !question.trim()) return
        set((p) => ({ chatBusy: true, chatDraft: '', chat: [...p.chat, { role: 'You', text: question, sources: null, recommendation: null }] }))
        try {
          const answer = await api<ChatMessage>(`/invoices/${sel}/copilot`, 'POST', { question })
          if (stateRef.current.sel === sel) set((p) => ({ chat: [...p.chat, answer], chatBusy: false }))
        } catch (e) {
          set({ chatBusy: false, toast: { tone: 'err', text: e instanceof Error ? e.message : String(e) } })
        }
      },

      syncZoho: async () => {
        const out = await run(SYNC_LABEL, () =>
          api<{ billsDeleted?: number; revalidated?: number }>('/connectors/zoho/sync', 'POST', {}),
        )
        if (!out) return
        const parts = ['Refreshed from Zoho Books']
        if (out.billsDeleted)
          parts.push(`${out.billsDeleted} bill${out.billsDeleted > 1 ? 's' : ''} deleted in Zoho — invoice returned to Approved`)
        if (out.revalidated) parts.push(`${out.revalidated} open exception${out.revalidated > 1 ? 's' : ''} re-checked`)
        notify('ok', parts.join(' · '))
        // The open invoice may be one of those that changed.
        if (stateRef.current.sel) await reload()
      },

      resetFlow: () =>
        set({ view: 'processing', stage: 'intake', sel: null, inv: null, done: null, focus: null, chat: [], t360Open: false }),
    }
  }, [set, notify, setUser, upload, open, reload, run, write])

  const value = useMemo<Store>(() => ({ state, actions }), [state, actions])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}
