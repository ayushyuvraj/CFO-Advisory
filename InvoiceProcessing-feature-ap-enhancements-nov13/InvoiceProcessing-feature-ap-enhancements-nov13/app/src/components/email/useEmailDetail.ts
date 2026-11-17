import { useEffect, useRef } from 'react'
import { useApi } from '../../api/useApi'
import { useStore } from '../../state/store'
import { type EmailDetail, isActive } from './emailApi'

export function useEmailDetail(id: string | null) {
  const { state, actions } = useStore()
  const result = useApi<EmailDetail>(id ? '/email-inbox/emails/' + encodeURIComponent(id) : null, [state.refresh])
  const signature = useRef('')
  const active = !!result.data && (isActive(result.data.job) || result.data.attachments.some(a => ['queued','running'].includes(a.pipeline_state ?? '')))
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void result.reload() }, 2500)
    return () => window.clearInterval(t)
  }, [active, result.reload])
  useEffect(() => {
    if (!result.data || result.data.email_id !== id) return
    const next = JSON.stringify([id, result.data.job?.status, result.data.attachments.map(a => [a.attachment_id,a.pipeline_state,a.invoice_status])])
    if (signature.current && signature.current !== next) actions.set(p => ({ refresh: p.refresh + 1 }))
    signature.current = next
  }, [result.data, id, actions])
  return { ...result, data: result.data?.email_id === id ? result.data : null }
}
