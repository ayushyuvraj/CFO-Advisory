import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../../state/store'

interface EmailUi {
  tab: 'cases' | 'emails'; setTab: (tab: 'cases' | 'emails') => void
  open: boolean; setOpen: (value: boolean) => void; openUpload: () => void
  selected: string | null; setSelected: (id: string | null) => void
  showInbox: (id?: string) => void; refresh: () => void
}
const Context = createContext<EmailUi | null>(null)
export function EmailUiProvider({ children }: { children: ReactNode }) {
  const { actions } = useStore()
  const [tab, setTab] = useState<'cases' | 'emails'>('cases')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const openUpload = useCallback(() => setOpen(true), [])
  const refresh = useCallback(() => actions.set(p => ({ refresh: p.refresh + 1 })), [actions])
  const showInbox = useCallback((id?: string) => {
    if (id) setSelected(id)
    setTab('emails'); setOpen(false); actions.set({ view: 'inbox' })
  }, [actions])
  const value = useMemo(() => ({ tab, setTab, open, setOpen, openUpload, selected, setSelected, showInbox, refresh }),
    [tab, open, openUpload, selected, showInbox, refresh])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useEmailUi() {
  const value = useContext(Context)
  if (!value) throw new Error('Email UI provider missing')
  return value
}
