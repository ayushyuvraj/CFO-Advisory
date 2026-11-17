import { useEffect, useRef, useState } from 'react'
import type { CaseRow, InvoiceDetail } from '../../api/types'
import { api } from '../../api/client'
import { downloadAllInvoicesExcel, loadDisplayedInvoices } from '../../lib/allInvoicesExcel'
import { Icon } from '../ui/Icon'

/** Parent keys this component by the displayed-list/filter/user snapshot. */
export function DownloadInvoicesButton({ rows, disabled, onError, onBusy }: {
  rows: CaseRow[]; disabled: boolean; onError: (message: string) => void; onBusy: (busy: boolean) => void
}) {
  const [progress, setProgress] = useState<number | null>(null)
  const alive = useRef(true), running = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { onBusy(progress !== null); return () => onBusy(false) }, [progress, onBusy])
  const exporting = progress !== null
  const download = async () => {
    if (running.current || disabled || !rows.length) return
    running.current = true
    setProgress(0)
    try {
      const invoices = await loadDisplayedInvoices(
        rows.map(row => ({id: row.id, caseId: row.caseId})),
        id => api<InvoiceDetail>(`/invoices/${encodeURIComponent(id)}`),
        done => { if (alive.current) setProgress(done) },
        () => alive.current,
      )
      if (alive.current) downloadAllInvoicesExcel(invoices)
    } catch (error) {
      if (alive.current) onError(error instanceof Error ? error.message : 'Unable to download the invoices. Please retry.')
    } finally {
      running.current = false
      if (alive.current) setProgress(null)
    }
  }
  return <button type="button" className="btn btn-primary btn-sm"
    disabled={disabled || exporting || !rows.length} aria-busy={exporting}
    onClick={() => void download()}
    title="Download extraction, bank details and line items for the selected invoices."
    style={{ minHeight: 32, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
    <Icon path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={14} />
    {exporting ? `Preparing ${progress}/${rows.length}…` : `Download Selected (${rows.length})`}
  </button>
}
