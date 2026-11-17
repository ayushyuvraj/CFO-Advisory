import { ApInboxView } from '../views/ApInboxView'
import { EmailInboxView } from './EmailInboxView'
import { useEmailUi } from './EmailUiContext'

export function EmailAwareApInbox() {
  const ui = useEmailUi()
  return <>
    <div role="tablist" aria-label="AP Inbox views" style={{ display:'flex', gap:10, padding:'22px 30px 0' }}>
      <button id="invoice-cases-tab" role="tab" aria-selected={ui.tab === 'cases'} aria-controls="invoice-cases-panel" className={ui.tab === 'cases' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => ui.setTab('cases')}>Invoice Cases</button>
      <button id="email-inbox-tab" role="tab" aria-selected={ui.tab === 'emails'} aria-controls="email-inbox-panel" className={ui.tab === 'emails' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => ui.setTab('emails')}>Email Inbox</button>
    </div>
    <div id="invoice-cases-panel" role="tabpanel" aria-labelledby="invoice-cases-tab" hidden={ui.tab !== 'cases'}><ApInboxView /></div>
    <div id="email-inbox-panel" role="tabpanel" aria-labelledby="email-inbox-tab" hidden={ui.tab !== 'emails'} style={{ paddingTop:20 }}>{ui.tab === 'emails' && <EmailInboxView />}</div>
  </>
}
