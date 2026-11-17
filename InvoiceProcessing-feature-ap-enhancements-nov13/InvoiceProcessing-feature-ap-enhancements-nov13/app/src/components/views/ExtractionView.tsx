import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Field, InvoiceDetail } from '../../api/types'
import { api, documentUrl, pageImageUrl } from '../../api/client'
import { useStore } from '../../state/store'
import { findTraceable, traceables } from '../../state/selectors'
import { inr } from '../../lib/format'
import { tone } from '../../lib/tone'
import { downloadExtractionExcel } from '../../lib/extractionExcel'
import { BankDetails } from './BankDetails'
import { CurrentInvoice, InvoiceNavigation } from './InvoiceNavigation'
import { Card, SectionTitle } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { Row, Stack } from '../ui/Layout'

/** Header fields a user may correct here. Totals follow the line items; the vendor ID follows the master. */
const EDITABLE = new Set(['vendor', 'gstin', 'tinNumber', 'vatNo', 'number', 'date', 'po', 'currency', 'terms', 'entity'])

/**
 * AI Extraction & Review.
 *
 * The screen's job is traceability: every extracted value is tied to the
 * rectangle Gemini read it from. Selecting a field draws that box on the real
 * page image — switching page if it lives elsewhere — and clicking a box on the
 * page selects the field that captured it.
 *
 * Validation checks and line items sit in a side panel that opens over the
 * right edge, so the document and the extracted fields keep the full width.
 */
export function ExtractionView() {
  const { state } = useStore()
  const documentKey = state.inv?.documentInvoices?.[0]?.id ?? state.inv?.id ?? ''
  const [view, setView] = useState({ documentKey: '', zoom: 100 })
  const zoom = view.documentKey === documentKey ? view.zoom : 100
  // Keep zoom while navigating sibling invoices in the same intact PDF.
  const setZoom = (next: number) => setView({ documentKey, zoom: next })
  // Keyed by invoice, so processing/field-edit state still starts afresh.
  return state.inv ? <Extraction key={state.inv.id} inv={state.inv} zoom={zoom} setZoom={setZoom} /> : null
}

/** Gap between checkpoints after the document has been read. */
const STEP_GAP_MS = 500

/**
 * The step the pipeline card shows. Everything after "Reading invoice structure"
 * finishes in well under a second, so those checkpoints are revealed STEP_GAP_MS
 * apart — each one can be seen. Display only: the backend is not slowed down.
 * An invoice that was already processed when opened shows complete at once.
 */
function useRevealedStep(inv: InvoiceDetail, total: number): number {
  const { state: pstate, step } = inv.pipeline
  const target = pstate === 'done' ? total : pstate === 'error' ? step : Math.min(step, total)
  const [shown, setShown] = useState(() => (pstate === 'done' ? total : 0))
  useEffect(() => {
    if (shown === target) return
    // Reprocessing starts again from zero; the first step shows as soon as it is reached.
    if (shown > target || shown === 0 || pstate === 'error') {
      setShown(shown > target || pstate === 'error' ? target : 1)
      return
    }
    const t = window.setTimeout(() => setShown((s) => Math.min(s + 1, target)), STEP_GAP_MS)
    return () => window.clearTimeout(t)
  }, [shown, target, pstate])
  return shown
}

function Extraction({ inv, zoom, setZoom }: { inv: InvoiceDetail; zoom: number; setZoom: (next: number) => void }) {
  const { state, actions } = useStore()
  const [panel, setPanel] = useState<PanelTab | null>(null)
  const total = inv.pipeline.steps.length || state.config?.pipelineSteps.length || 10
  const shown = useRevealedStep(inv, total)
  // Results appear once the last checkpoint has been revealed.
  const done = inv.pipeline.state === 'done' && shown >= total
  const covered = !inv.documentInvoices?.length || inv.documentInvoices.some(x => state.page >= x.startPage && state.page <= x.endPage)
  const current = !inv.documentInvoices?.length || (state.page >= (inv.invoiceStartPage ?? 1) && state.page <= (inv.invoiceEndPage ?? inv.pages))

  return (
    <div style={{ padding: '22px 30px 60px' }}>
      <PipelineCard inv={inv} shown={shown} />

      <div
        className="extraction-split"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.02fr)',
          gap: 22,
          alignItems: 'start',
        }}
      >
        <SourceDocument inv={inv} zoom={zoom} setZoom={setZoom} />

        <Stack gap={20}>
          {!covered ? <Card padding={20}><SectionTitle>Summary / supporting page</SectionTitle><p>This page is not a separate invoice. Select an invoice page to view its extracted fields.</p>
            <InvoiceNavigation inv={inv} page={state.page} disabled={!!state.busy} onSelect={(id, page) => void actions.open(id, 'review', page)} /></Card>
            : !current ? <Card padding={20}><p role="status">Loading the invoice for this page…</p></Card>
            : done ? <ExtractedPanel inv={inv} onOpen={setPanel} /> : <Waiting inv={inv} />}
          <Row>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!done || !covered || !current}
              onClick={() => actions.goStage('evidence')}
            >
              Retrieve Source Data
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => actions.set({ stage: 'intake' })}>
              Upload another invoice
            </button>
          </Row>
          {state.busy && <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{state.busy}…</div>}
        </Stack>
      </div>

      {done && covered && current &&
        (panel ? (
          <ChecksPanel inv={inv} tab={panel} onTab={setPanel} onClose={() => setPanel(null)} />
        ) : (
          <EdgeTab inv={inv} onOpen={setPanel} />
        ))}
    </div>
  )
}

/** The ten-stage pipeline, driven by the backend's progress. */
function PipelineCard({ inv, shown }: { inv: InvoiceDetail; shown: number }) {
  const { state, actions } = useStore()
  const steps = inv.pipeline.steps.length ? inv.pipeline.steps : state.config?.pipelineSteps ?? []
  const { state: pstate, error } = inv.pipeline
  const step = shown
  const finished = pstate === 'done' && shown >= steps.length
  // Still "processing" while the finished steps are being revealed.
  const running = !finished && pstate !== 'error'
  const progress = Math.min(100, Math.round(((finished ? steps.length : step) / Math.max(1, steps.length)) * 100)) + '%'

  return (
    <Card padding="18px 20px" style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span className="chip">
            <Icon path="M22 12h-4l-3 9L9 3l-3 9H2" />
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              AI Processing Pipeline
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)' }}>
              {inv.caseId} · {inv.fileName} · {inv.pages} page{inv.pages > 1 ? 's' : ''}
              {pstate === 'queued' && ' · queued'}
              {running && pstate !== 'queued' && ' · ' + (steps[Math.min(step, steps.length - 1)] ?? '')}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="metric" style={{ fontSize: 34, color: pstate === 'error' ? 'var(--err)' : 'var(--color-accent-900)' }}>
            {pstate === 'error' ? 'Failed' : progress}
          </div>
          <div className="kicker" style={{ fontSize: 10, letterSpacing: '.12em' }}>
            {running ? 'Processing' : finished ? 'Processing complete' : 'Stopped'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 16 }}>
        {steps.map((label, i) => {
          const done = finished || i < step
          const active = running && i === step
          const failed = pstate === 'error' && i === step
          return (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                border: `1px solid ${failed ? 'var(--err-line)' : done ? 'var(--ok-line)' : active ? 'var(--color-accent-400)' : 'var(--color-divider)'}`,
                borderRadius: 8,
                background: failed ? 'var(--err-bg)' : done ? 'var(--ok-bg)' : active ? 'var(--color-accent-100)' : 'transparent',
                padding: '10px 12px',
              }}
            >
              <span
                style={{
                  color: failed ? 'var(--err)' : done ? 'var(--ok)' : 'var(--color-accent-700)',
                  fontSize: 12,
                  width: 14,
                  textAlign: 'center',
                  animation: active ? 'ipa-pulse 1s infinite' : 'none',
                }}
              >
                {failed ? '✕' : done ? '✓' : active ? '•' : '○'}
              </span>
              <span style={{ fontSize: 12, color: done || active ? 'var(--color-text)' : 'var(--color-neutral-600)', minWidth: 0 }}>
                {label.replace('…', '')}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 14, height: 4, background: 'var(--color-accent-100)' }}>
        <div style={{ height: 4, background: pstate === 'error' ? 'var(--err)' : 'var(--color-accent-700)', width: progress, transition: 'width .3s' }} />
      </div>

      {pstate === 'error' && (
        <div
          style={{
            marginTop: 14,
            border: '1px solid var(--err-line)',
            background: 'var(--err-bg)',
            borderRadius: 8,
            padding: '11px 13px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--err)' }}>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void actions.reprocess()}>
            Retry extraction
          </button>
        </div>
      )}
      <div style={{ marginTop: 11, fontSize: 11, color: 'var(--color-neutral-600)' }}>
        GST · TDS · SOX-aligned controls | Complete audit trail captured
      </div>
    </Card>
  )
}

/** The real document, with Gemini's bounding boxes drawn over it. */
function SourceDocument({ inv, zoom, setZoom }: { inv: InvoiceDetail; zoom: number; setZoom: (next: number) => void }) {
  const { state, actions } = useStore()
  const page = Math.min(state.page, inv.pages)
  const current = !inv.documentInvoices?.length || (page >= (inv.invoiceStartPage ?? 1) && page <= (inv.invoiceEndPage ?? inv.pages))
  const all = inv.pipeline.state === 'done' && current ? traceables(inv) : []
  const selectPage = (next:number) => {
    const target = inv.documentInvoices?.find(x => next >= x.startPage && next <= x.endPage)
    if (inv.documentInvoices?.length) void actions.open(target?.id ?? inv.id, 'review', next)
    else actions.set({ page:next, focus:null })
  }
  const onPage = all.filter((t) => t.page === page && t.bbox)
  const focused = findTraceable(inv, state.focus)
  const field = [...inv.fields, ...inv.supportingFields].find((f) => f.key === state.focus)
  const viewport = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const anchor = useRef<{ x: number; y: number } | null>(null)
  const [width, setWidth] = useState(0)
  const [loaded, setLoaded] = useState('')
  const imageUrl = pageImageUrl(inv.id, page, inv.fileName)
  const ready = loaded === imageUrl
  const viewerHeight = 'clamp(320px, 65vh, 760px)'
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)
  const latestPage = useRef(page)
  latestPage.current = page
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const refreshHighlights = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const result = await api<{ verified: number; unavailable: number }>(`/invoices/${inv.id}/refresh-locations`, 'POST')
      if (!mounted.current) return
      await actions.open(inv.id, 'review', latestPage.current)
      actions.notify('info', `${result.verified} fields located${result.unavailable ? ` · ${result.unavailable} could not be verified` : ''}. Invoice values unchanged.`)
    } catch (error) {
      if (mounted.current) actions.notify('err', error instanceof Error ? error.message : 'Unable to refresh highlights.')
    } finally {
      if (mounted.current) setRefreshing(false)
    }
  }


  useLayoutEffect(() => {
    const node = viewport.current
    if (!node) return
    const measure = () => setWidth(node.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const changeZoom = (next: number) => {
    const node = viewport.current, sheet = canvas.current
    if (node && sheet && sheet.clientWidth && sheet.clientHeight) {
      anchor.current = {
        x: (node.scrollLeft + node.clientWidth / 2) / sheet.clientWidth,
        y: (node.scrollTop + node.clientHeight / 2) / sheet.clientHeight,
      }
    }
    setZoom(Math.max(50, Math.min(300, next)))
  }

  useLayoutEffect(() => {
    const node = viewport.current, sheet = canvas.current, point = anchor.current
    if (!node || !sheet || !point) return
    node.scrollLeft = point.x * sheet.clientWidth - node.clientWidth / 2
    node.scrollTop = point.y * sheet.clientHeight - node.clientHeight / 2
    anchor.current = null
  }, [zoom, width])

  useLayoutEffect(() => {
    anchor.current = null
    viewport.current?.scrollTo({ left: 0, top: 0 })
  }, [imageUrl])

  // Reveal the selected field inside this viewer, without scrolling the app.
  useEffect(() => {
    const node = viewport.current, sheet = canvas.current
    if (!node || !sheet || !ready || focused?.page !== page || !focused.bbox) return
    const [x0, y0, x1, y1] = focused.bbox
    const sheetRect = sheet.getBoundingClientRect(), viewRect = node.getBoundingClientRect()
    const originX = sheetRect.left - viewRect.left - node.clientLeft + node.scrollLeft
    const originY = sheetRect.top - viewRect.top - node.clientTop + node.scrollTop
    const left = originX + x0 * sheet.clientWidth, right = originX + x1 * sheet.clientWidth
    const top = originY + y0 * sheet.clientHeight, bottom = originY + y1 * sheet.clientHeight
    if (left < node.scrollLeft || right > node.scrollLeft + node.clientWidth)
      node.scrollLeft = (left + right - node.clientWidth) / 2
    if (top < node.scrollTop || bottom > node.scrollTop + node.clientHeight)
      node.scrollTop = (top + bottom - node.clientHeight) / 2
  }, [state.focus, page, ready, focused?.bbox])

  return (
    <Card padding={18} style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <SectionTitle>Source Document</SectionTitle>
          <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
            Click a highlighted value to trace it to the extracted field.
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-neutral-700)', textAlign: 'right' }}>
          Page {page} of {inv.pages}
          <br />
          <a href={documentUrl(inv.id)} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-700)' }}>
            Open original
          </a>
        </div>
      </div>

      <div role="toolbar" aria-label="Document zoom" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="btn btn-secondary btn-sm" aria-label="Zoom out" disabled={zoom <= 50} onClick={() => changeZoom(zoom - 25)} style={{ minWidth: 36, minHeight: 36, fontSize: 20 }}>−</button>
        <output aria-label="Document zoom level" style={{ minWidth: 48, textAlign: 'center', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{zoom}%</output>
        <button type="button" className="btn btn-secondary btn-sm" aria-label="Zoom in" disabled={zoom >= 300} onClick={() => changeZoom(zoom + 25)} style={{ minWidth: 36, minHeight: 36, fontSize: 20 }}>+</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { anchor.current = null; setZoom(100); viewport.current?.scrollTo({ left: 0, top: 0 }) }}>Fit to width</button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={refreshing || inv.pipeline.state !== 'done' || !current} onClick={() => void refreshHighlights()}>{refreshing ? 'Verifying highlights…' : 'Refresh highlights'}</button>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 0 }}>
        {inv.pages > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 46px', maxHeight: viewerHeight, overflowY: 'auto' }}>
            {Array.from({ length: inv.pages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectPage(i + 1)}
                style={{
                  cursor: 'pointer',
                  border: `1px solid ${page === i + 1 ? 'var(--color-accent-700)' : 'var(--color-neutral-300)'}`,
                  borderRadius: 4,
                  background: page === i + 1 ? 'var(--color-accent-100)' : '#fff',
                  height: 60,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10.5,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-neutral-700)',
                }}
                aria-label={`Page ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        <div
          ref={viewport}
          role="region"
          aria-label="Source document viewer"
          tabIndex={0}
          style={{
            flex: '1 1 0%', minWidth: 0, height: viewerHeight,
            overflow: 'auto', overscrollBehavior: 'contain', scrollbarGutter: 'stable',
            border: '1px solid var(--color-neutral-300)', borderRadius: 4,
            background: 'var(--color-neutral-100)',
          }}
        >
        <div ref={canvas} style={{ position: 'relative', width: width ? width * zoom / 100 : '100%', marginInline: 'auto', lineHeight: 0, background: '#fff' }}>
          <img
            key={imageUrl}
            src={imageUrl}
            alt={`Invoice page ${page}`}
            onLoad={() => setLoaded(imageUrl)}
            onError={() => setLoaded('')}
            style={{ width: '100%', maxWidth: 'none', height: 'auto', display: 'block' }}
          />
          {ready && onPage.map((t) => {
            const [x0, y0, x1, y1] = t.bbox!
            const on = state.focus === t.key
            return (
              <button
                key={t.key}
                type="button"
                title={t.label}
                aria-label={`Trace ${t.label}`}
                onClick={() => actions.set({ focus: t.key })}
                style={{
                  position: 'absolute',
                  left: `${x0 * 100}%`,
                  top: `${y0 * 100}%`,
                  width: `${(x1 - x0) * 100}%`,
                  height: `${(y1 - y0) * 100}%`,
                  padding: 0,
                  cursor: 'pointer',
                  border: on ? '2px solid var(--trace)' : '1px dashed rgba(0, 51, 141, .28)',
                  background: on ? 'rgba(200,16,46,.12)' : 'transparent',
                  borderRadius: 2,
                  zIndex: on ? 2 : 1,
                }}
              />
            )
          })}
        </div>
        </div>
      </div>

      {focused && (
        <div
          style={{
            marginTop: 14,
            border: '1px solid var(--trace)',
            borderLeft: '3px solid var(--trace)',
            borderRadius: 8,
            padding: '10px 13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div>
            <div className="kicker" style={{ color: 'var(--trace)' }}>
              AI extracted
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{focused.label}</div>
            {field?.value && <div style={{ fontSize: 12 }}>{field.value}</div>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', textAlign: 'right' }}>
            Source: page {focused.page}
            <br />
            {focused.bbox ? '' : 'No location returned · '}
            {field ? field.confidence.toFixed(1) + '% confidence' : 'Line item'}
          </div>
        </div>
      )}
    </Card>
  )
}

function Waiting({ inv }: { inv: InvoiceDetail }) {
  return (
    <Card>
      <SectionTitle>AI Extracted Data</SectionTitle>
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--color-neutral-700)' }}>
        {inv.pipeline.state === 'error'
          ? 'Extraction did not complete. Retry above once the cause is fixed.'
          : 'The agent is reading the document. Fields appear here — each tied to where it was found on the page — as soon as extraction completes.'}
      </div>
    </Card>
  )
}

/** Extracted header fields (correctable where the Command Center owns them), checks and line items. */
function ExtractedPanel({ inv, onOpen }: { inv: InvoiceDetail; onOpen: (tab: PanelTab) => void }) {
  const { state, actions } = useStore()
  const [edits, setEdits] = useState<Record<string, string>>({})
  const reasons = state.config?.correctionReasons ?? []
  const [reason, setReason] = useState('Data extraction error')
  const changed = Object.entries(edits).filter(([k, v]) => v !== (inv.fields.find((f) => f.key === k)?.value ?? ''))

  const downloadExcel = () => {
    try {
      downloadExtractionExcel(
        [
          { label: 'Supplier Name', value: edits.vendor ?? inv.fields.find(f => f.key === 'vendor')?.value ?? inv.vendor ?? '' },
          ...inv.fields.map(f => ({ label:f.label, value:edits[f.key] ?? f.value ?? '' })),
        ],
        edits.number ?? inv.number ?? '', inv.caseId, inv.bankAccounts ?? [], inv.items ?? [],
        edits.currency ?? inv.fields.find(f => f.key === 'currency')?.value ?? '',
      )
    } catch (error) {
      actions.notify('err', error instanceof Error ? error.message : 'Unable to download Excel. Please try again.')
    }
  }

  const focus = (f: Field | { key: string; page: number }) => actions.set({ focus: f.key, page: f.page })

  const save = async () => {
    for (const [key, value] of changed) {
      const ok = await actions.correctField(key, value, reason)
      if (!ok) return
    }
    setEdits({})
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.03em', textTransform: 'uppercase' }}>
            AI Extracted Data
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
            Click a field to trace it on the source document. Overall confidence {inv.extractionConfidence}.
          </div>
        </div>
        <div style={{ display:'grid', gap:8, justifyItems:'end', fontSize: 11, color: 'var(--color-neutral-700)', textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ minHeight:36, padding:'0 14px', gap:8, whiteSpace:'nowrap' }}
            disabled={!!state.busy || !inv.fields.length}
            onClick={downloadExcel}
          >
            <Icon path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={16} />
            Download Excel
          </button>
          {inv.fields.filter((f) => f.corrected).length
            ? `${inv.fields.filter((f) => f.corrected).length} field(s) user corrected`
            : 'All fields agent-extracted'}
        </div>
      </div>

      <Row style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen('checks')}>
          Validation checks <CheckCounts inv={inv} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen('lines')}>
          Line items · {inv.items.length}
        </button>
        <CurrentInvoice inv={inv} page={state.page} />
      </Row>

      <div className="field-grid" style={{ marginTop: 16 }}>
        {inv.fields.map((f) => {
          const editable = EDITABLE.has(f.key)
          const value = edits[f.key] ?? f.value ?? ''
          const dirty = edits[f.key] !== undefined && edits[f.key] !== (f.value ?? '')
          const on = state.focus === f.key
          const conf = f.confidence
          return (
            <div
              key={f.key}
              className="field"
              onClick={() => focus(f)}
              style={{
                border: `1px solid ${on ? 'var(--trace)' : 'var(--color-divider)'}`,
                borderRadius: 10,
                background: on ? 'rgba(200,16,46,.05)' : '#fff',
                padding: '9px 11px 10px',
                cursor: 'pointer',
              }}
            >
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span>{f.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '.04em',
                    color: conf >= 99 ? 'var(--ok)' : conf >= 90 ? 'var(--color-neutral-700)' : 'var(--warn)',
                  }}
                >
                  {f.value ? conf.toFixed(1) + '% confidence' : 'Not found'}
                </span>
              </label>
              <input
                className="input"
                value={value}
                readOnly={!editable}
                aria-label={f.label}
                onFocus={() => focus(f)}
                onChange={(e) => setEdits((p) => ({ ...p, [f.key]: e.target.value }))}
                style={{
                  borderColor: dirty ? 'var(--color-accent-700)' : conf < 90 && f.value ? 'var(--warn-line)' : 'var(--color-divider)',
                  background: editable ? '#fff' : 'var(--color-neutral-100)',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginTop: 4,
                  fontSize: 10,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ color: 'var(--color-neutral-600)' }}>
                  {f.bbox ? `Source: page ${f.page}` : f.key === 'vendorId' ? 'From vendor master' : editable ? '' : 'Computed'}
                </span>
                <span style={{ color: 'var(--color-accent-700)' }}>
                  {dirty ? 'Edited — not saved' : f.corrected ? 'User corrected' : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <BankDetails inv={inv} focusKey={state.focus} onFocus={focus} />

      {changed.length > 0 && (
        <Row style={{ marginTop: 14 }}>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} style={{ maxWidth: 260 }}>
            {[...new Set(['Data extraction error', ...reasons])].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" disabled={!!state.busy} onClick={() => void save()}>
            Save {changed.length} correction{changed.length > 1 ? 's' : ''} &amp; revalidate
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setEdits({})}>
            Discard
          </button>
        </Row>
      )}

    </Card>
  )
}

type PanelTab = 'checks' | 'lines'

/** Passed / warning / failed counts, so the checks' state shows while the panel is closed. */
function CheckCounts({ inv }: { inv: InvoiceDetail }) {
  const n = (st: string) => inv.checks.filter((c) => c.status === st).length
  const parts: [number, string, string][] = [
    [n('pass'), '✓', 'var(--ok)'],
    [n('warn'), '!', 'var(--warn)'],
    [n('fail'), '✕', 'var(--err)'],
  ]
  return (
    <span style={{ display: 'inline-flex', gap: 7, marginLeft: 8 }}>
      {parts
        .filter(([count]) => count > 0)
        .map(([count, mark, color]) => (
          <span key={mark} style={{ color, fontWeight: 600 }}>
            {mark} {count}
          </span>
        ))}
    </span>
  )
}

/** The handle on the right edge while the panel is closed. */
function EdgeTab({ inv, onOpen }: { inv: InvoiceDetail; onOpen: (tab: PanelTab) => void }) {
  const failing = inv.checks.some((c) => c.status === 'fail')
  return (
    <button
      type="button"
      onClick={() => onOpen('checks')}
      aria-label="Open validation checks and line items"
      style={{
        position: 'fixed',
        right: 0,
        top: '38%',
        zIndex: 46,
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        padding: '14px 7px',
        border: '1px solid var(--color-divider)',
        borderLeft: 'none',
        borderRadius: '0 8px 8px 0',
        background: '#fff',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        fontFamily: 'var(--font-heading)',
        fontSize: 12,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: failing ? 'var(--err)' : 'var(--color-accent-900)',
      }}
    >
      Checks &amp; line items{failing ? ' ✕' : ''}
    </button>
  )
}

/**
 * Validation checks and line items, over the right edge. It does not block the
 * page: clicking a line item still traces it on the source document.
 */
function ChecksPanel({
  inv,
  tab,
  onTab,
  onClose,
}: {
  inv: InvoiceDetail
  tab: PanelTab
  onTab: (tab: PanelTab) => void
  onClose: () => void
}) {
  const { state, actions } = useStore()
  const focus = (f: { key: string; page: number }) => actions.set({ focus: f.key, page: f.page })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tabStyle = (on: boolean) => ({
    border: 'none',
    borderBottom: `2px solid ${on ? 'var(--color-accent-700)' : 'transparent'}`,
    background: 'transparent',
    padding: '10px 2px',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    letterSpacing: '.05em',
    textTransform: 'uppercase' as const,
    color: on ? 'var(--color-text)' : 'var(--color-neutral-600)',
  })

  return (
    <aside
      aria-label="Validation checks and line items"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 560,
        maxWidth: '100vw',
        zIndex: 46,
        background: '#fff',
        borderLeft: '1px solid var(--color-divider)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 18px 0' }}>
        <div>
          <div className="kicker" style={{ letterSpacing: '.12em' }}>
            {inv.caseId}
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, letterSpacing: '.03em' }}>{inv.number}</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close panel">
          ✕ Close
        </button>
      </div>
      <div style={{ display: 'flex', gap: 22, padding: '0 18px', borderBottom: '1px solid var(--color-divider)' }}>
        <button type="button" style={tabStyle(tab === 'checks')} onClick={() => onTab('checks')}>
          Validation checks <CheckCounts inv={inv} />
        </button>
        <button type="button" style={tabStyle(tab === 'lines')} onClick={() => onTab('lines')}>
          Line items · {inv.items.length}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 28px' }}>
        {tab === 'checks' ? (
          <>
            <Stack gap={6}>
              {inv.checks.map((c) => {
                const t = tone(c.status === 'pass' ? 'ok' : c.status === 'warn' ? 'warn' : 'err')
                return (
                  <div
                    key={c.code}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '16px 150px minmax(0, 1fr)',
                      gap: 10,
                      alignItems: 'baseline',
                      fontSize: 12,
                      paddingBottom: 5,
                      borderBottom: '1px dashed var(--color-divider)',
                    }}
                  >
                    <span style={{ color: t.fg }}>{c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕'}</span>
                    <span style={{ fontWeight: 600 }}>{c.label}</span>
                    <span style={{ color: c.status === 'pass' ? 'var(--color-neutral-700)' : t.fg }}>{c.detail}</span>
                  </div>
                )
              })}
            </Stack>
          </>
        ) : (
          <>
            <div className="scroll-x">
              <table className="table" style={{ width: '100%', fontSize: 11.5 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>GST</th>
                    <th style={{ textAlign: 'right' }}>Taxable</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((it) => {
                    const key = 'item' + it.lineNo
                    const on = state.focus === key
                    const flagged = inv.discrepancy?.line_no === it.lineNo && inv.matchStatus === 'fail'
                    return (
                      <tr
                        key={key}
                        onClick={() => focus({ key, page: it.page })}
                        style={{
                          cursor: 'pointer',
                          outline: on ? '2px solid var(--trace)' : 'none',
                          background: on ? 'rgba(200,16,46,.07)' : 'transparent',
                        }}
                      >
                        <td>{it.lineNo}</td>
                        <td>{it.desc}</td>
                        <td style={{ color: 'var(--color-neutral-700)' }}>{it.hsn}</td>
                        <td style={{ textAlign: 'right', color: flagged ? 'var(--err)' : 'inherit', fontWeight: flagged ? 600 : 400 }}>
                          {it.qty.toLocaleString('en-IN')}
                          {it.originalQty != null && it.originalQty !== it.qty && (
                            <span style={{ color: 'var(--color-neutral-500)', textDecoration: 'line-through', marginLeft: 6 }}>
                              {it.originalQty.toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>{inr(it.rate)}</td>
                        <td style={{ textAlign: 'right' }}>{it.taxPct}%</td>
                        <td style={{ textAlign: 'right' }}>{inr(it.taxable)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 22, marginTop: 12, fontSize: 12, flexWrap: 'wrap' }}>
              <span>Taxable {inv.subtotalText}</span>
              <span>{inv.taxLabel} {inv.taxText}</span>
              <span style={{ fontWeight: 600 }}>Total {inv.currency === 'INR' ? inv.totalText : `${inv.currency} ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</span>
              {inv.tds.amount > 0 && <span>TDS u/s {inv.tds.section} −{inr(inv.tds.amount)}</span>}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
