import { BulkInvoiceUpload } from './BulkInvoiceUpload'
import type { IntakeMethod } from '../../types'
import type { CaseRow, Dashboard } from '../../api/types'
import { useStore } from '../../state/store'
import { useApi } from '../../api/useApi'
import { ICON } from '../../data/icons'
import { statusTone, tone } from '../../lib/tone'
import { Card, SectionTitle } from '../ui/Card'
import { IconChip } from '../ui/Icon'
import { KpiTile, KpiStrip } from '../ui/Kpi'
import { Grid, Stack } from '../ui/Layout'
import { RawPill, StatusDot } from '../ui/Pill'
import { useEmailUi } from '../email/EmailUiContext'


/**
 * Invoice Intake & Intelligence.
 *
 * Upload is the live channel: the file goes to the backend, Gemini reads it,
 * and the extraction screen follows the pipeline as it runs. Below the fold,
 * today's intake and the most recent invoices, straight from the database.
 */
export function IntakeView() {
  const emailUi = useEmailUi()
  const { state, actions } = useStore()
  const recent = useApi<{ total: number; items: CaseRow[] }>('/invoices?limit=8', [state.refresh])
  const dash = useApi<Dashboard>('/dashboard?persona=AP%20Lead', [state.refresh])

  const zoho = state.config ? 'Zoho Books connected' : 'Connecting…'

  const methods: {
    key: IntakeMethod
    kicker: string
    title: string
    body: string
    meta: string
    metaColor: string
    icon: string
  }[] = [
    {
      key: 'upload',
      kicker: 'Channel 01',
      title: 'Upload Invoice',
      body: 'Drop one or more PDF, JPG, PNG or TIFF invoices. Gemini reads it and the agent validates it end to end.',
      meta: 'PDF · JPG · PNG · TIFF · live',
      metaColor: 'var(--ok)',
      icon: ICON.upload,
    },
    {
      key: 'connector',
      kicker: 'Channel 02',
      title: 'Enterprise Connector',
      body: 'Vendors, purchase orders, receipts and bills are synchronised from Zoho Books for matching.',
      meta: zoho,
      metaColor: 'var(--ok)',
      icon: ICON.db,
    },
    {
      key: 'mailbox',
      kicker: 'Channel 03',
      title: 'AP Shared Mailbox',
      body: 'Upload a downloaded .eml or Outlook .msg email. PDF attachments are classified individually and linked to invoice cases.',
      meta: 'Email upload · .eml / .msg',
      metaColor: 'var(--ok)',
      icon: ICON.mail,
    },
  ]

  const counts = dash.data?.statusCounts ?? {}
  const stats = [
    { label: 'Invoices in the system', value: String(dash.data?.exec.invoicesProcessed ?? '—'), note: 'Processed by the agent', icon: ICON.inbox },
    { label: 'Touchless', value: dash.data ? dash.data.exec.stpPct + '%' : '—', note: 'Posted without a correction', icon: ICON.check },
    {
      label: 'Awaiting business action',
      value: String((counts['Exception'] ?? 0) + (counts['Parked'] ?? 0) + (counts['Validation Required'] ?? 0)),
      note: 'Exceptions, review and parked',
      icon: ICON.alert,
    },
    {
      label: 'Avg. time to decision',
      value: dash.data?.exec.avgCycleMinutes != null ? dash.data.exec.avgCycleMinutes + ' min' : '—',
      note: 'Received → decision',
      icon: ICON.gauge,
    },
  ]

  return (
    <>
      <div
        style={{
          padding: '26px 30px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 26,
          alignItems: 'start',
        }}
      >
        <Card padding={26}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 25, letterSpacing: '.01em', marginBottom: 5 }}>
            How would you like to provide the invoice?
          </div>
          <div style={{ color: 'var(--color-neutral-700)', fontSize: 12.5, maxWidth: '64ch' }}>
            From invoice intake to validation, exception handling and posting — powered by intelligent agents
            across your AP landscape.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 14,
              marginTop: 24,
            }}
          >
            {methods.map((m) => {
              const selected = state.method === m.key
              return (
                <div
                  key={m.key}
                  className="tile-click"
                  role={m.key === 'mailbox' ? 'button' : undefined}
                  tabIndex={m.key === 'mailbox' ? 0 : undefined}
                  onKeyDown={e => { if (m.key === 'mailbox' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.currentTarget.click() } }}
                  onClick={() => {
                    if (m.key === 'mailbox') { actions.set({ method: m.key }); emailUi.openUpload(); return }
                    m.key === 'connector'
                      ? actions.set({ method: m.key, connectorOpen: true })
                      : actions.set({ method: m.key })
                  }}
                  style={{
                    border: `1px solid ${selected ? 'var(--color-accent-700)' : 'var(--color-divider)'}`,
                    borderTop: `3px solid ${selected ? 'var(--color-accent-700)' : 'var(--color-divider)'}`,
                    borderRadius: 10,
                    background: selected ? 'var(--color-accent-100)' : '#fff',
                    padding: '16px 15px',
                    minHeight: 148,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div className="kicker" style={{ color: 'var(--color-accent-700)', paddingTop: 8 }}>
                      {m.kicker}
                    </div>
                    <IconChip path={m.icon} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, marginTop: 8, lineHeight: 1.1 }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 7, lineHeight: 1.45 }}>
                    {m.body}
                  </div>
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 12,
                      fontSize: 10.5,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: m.metaColor,
                    }}
                  >
                    {m.meta}
                  </div>
                </div>
              )
            })}
          </div>

          <BulkInvoiceUpload />

          <div style={{ display: 'flex', gap: 36, marginTop: 22, flexWrap: 'wrap' }}>
            <div>
              <div className="kicker">Supported formats</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>PDF | JPG | PNG | TIFF</div>
            </div>
            <div>
              <div className="kicker">AI processing</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Gemini vision + document understanding</div>
            </div>
            <div>
              <div className="kicker">Tax intelligence</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>GST / GSTIN, HSN-SAC, TDS, imports</div>
            </div>
          </div>
        </Card>

        <Card padding={22}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '.03em', textTransform: 'uppercase' }}>
            Recent Invoices
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 4 }}>
            Open any invoice to continue where it stands.
          </div>

          <Stack gap={10} style={{ marginTop: 14 }}>
            {recent.error && <div style={{ fontSize: 12, color: 'var(--err)' }}>{recent.error}</div>}
            {recent.data && recent.data.items.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
                Nothing yet — upload your first invoice.
              </div>
            )}
            {recent.data?.items.map((r) => {
              const t = tone(statusTone(r.status))
              const selected = state.sel === r.id
              return (
                <div
                  key={r.id}
                  className="tile-click"
                  onClick={() => void actions.open(r.id)}
                  style={{
                    border: `1px solid ${selected ? 'var(--color-accent-700)' : 'var(--color-divider)'}`,
                    borderLeft: `3px solid ${t.fg}`,
                    borderRadius: 10,
                    background: selected ? 'var(--color-accent-100)' : '#fff',
                    padding: 13,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, lineHeight: 1.1, minWidth: 0 }}>
                      {r.vendor === '—' ? r.number : r.vendor}
                    </div>
                    <RawPill fg={t.fg} bg={t.bg} line={t.line}>
                      {r.status}
                    </RawPill>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      marginTop: 6,
                      fontSize: 11,
                      color: 'var(--color-neutral-700)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{r.caseId}</span>
                    <span>{r.number}</span>
                    <span>{r.amountText}</span>
                    <span>{r.poType}</span>
                  </div>
                  {r.exception !== '—' && (
                    <div style={{ marginTop: 5, fontSize: 11, color: t.fg }}>{r.exception}</div>
                  )}
                </div>
              )
            })}
          </Stack>
        </Card>
      </div>

      <div style={{ padding: '0 30px 40px' }}>
        <KpiStrip min={210}>
          {stats.map((k) => (
            <KpiTile key={k.label} label={k.label} value={k.value} note={k.note} icon={k.icon} />
          ))}
        </KpiStrip>
      </div>

      <div style={{ padding: '0 30px 46px' }}>
        <Grid min={320}>
          <Card>
            <SectionTitle>Agent Capability</SectionTitle>
            <div style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginTop: 4 }}>
              What the agent handles without a human touch.
            </div>
            <Stack gap={7} style={{ marginTop: 14 }}>
              {[
                ['Document classification and field extraction', 'Gemini'],
                ['GSTIN checksum and vendor master validation', 'Rule-based'],
                ['HSN / SAC and mixed GST rate recomputation', 'Rule-based'],
                ['TDS under s. 194C / 194J; imports and foreign currency', 'Policy'],
                ['Duplicate invoice detection', 'Rule-based'],
                ['2- / 3-way match against Zoho PO and receipts', 'Rule-based'],
                ['Exception reasoning and recommendation', 'Agentic'],
                ['Posting to Zoho Books with full audit trail', 'Zoho Books'],
              ].map(([label, meta]) => (
                <div
                  key={label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '16px minmax(0, 1fr) auto',
                    gap: 10,
                    alignItems: 'baseline',
                    paddingBottom: 6,
                    borderBottom: '1px dashed var(--color-divider)',
                  }}
                >
                  <span style={{ color: 'var(--ok)' }}>✓</span>
                  <span style={{ fontSize: 12 }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', whiteSpace: 'nowrap', paddingLeft: 4 }}>
                    {meta}
                  </span>
                </div>
              ))}
            </Stack>
          </Card>

          <Card>
            <SectionTitle
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--ok)' }}>
                  <StatusDot pulse />
                  Live
                </div>
              }
            >
              Live Agent Feed
            </SectionTitle>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
              {(dash.data?.liveFeed ?? []).map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px minmax(0, 1fr)',
                    gap: 10,
                    alignItems: 'baseline',
                    padding: '7px 0',
                    borderBottom: '1px dashed var(--color-divider)',
                  }}
                >
                  <span className="tabnum" style={{ fontSize: 10.5, color: 'var(--color-neutral-600)' }}>
                    {f.time}
                  </span>
                  <span style={{ fontSize: 11.5, overflowWrap: 'anywhere' }}>{f.text}</span>
                </div>
              ))}
              {dash.data && dash.data.liveFeed.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>No activity yet.</div>
              )}
            </div>
          </Card>
        </Grid>
      </div>
    </>
  )
}
