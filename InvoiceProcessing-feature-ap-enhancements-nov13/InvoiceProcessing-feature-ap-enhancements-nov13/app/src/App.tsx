import { useStore } from './state/store'
import { Sidebar } from './components/shell/Sidebar'
import { Header } from './components/shell/Header'
import { Stepper } from './components/shell/Stepper'

import { CommandCenterView } from './components/views/CommandCenterView'
import { IntakeView } from './components/views/IntakeView'
import { ExtractionView } from './components/views/ExtractionView'
import { MatchQueueView } from './components/views/MatchQueueView'
import { EvidenceView } from './components/views/EvidenceView'
import { ValidationView } from './components/views/ValidationView'
import { ApprovalView } from './components/views/ApprovalView'
import { DecisionView } from './components/views/DecisionView'
import { DoneView } from './components/views/DoneView'
import { ApInboxView } from './components/views/ApInboxView'
import { EmailAwareApInbox } from './components/email/EmailAwareApInbox'
import { EmailUiProvider } from './components/email/EmailUiContext'
import { UploadEmailDialog } from './components/email/UploadEmailDialog'
import { ProcurementView } from './components/views/ProcurementView'
import { ReceiptView } from './components/views/ReceiptView'
import { PaymentView } from './components/views/PaymentView'
import { ReconciliationView } from './components/views/ReconciliationView'

import { AskAgentPanel } from './components/overlays/AskAgentPanel'
import { AiAdvisory } from './components/overlays/AiAdvisory'
import { Transaction360Drawer } from './components/overlays/Transaction360Drawer'
import { ConnectorPanel } from './components/overlays/ConnectorPanel'
import { ParkDialog } from './components/overlays/ParkDialog'
import { CaseDetailDrawer } from './components/overlays/CaseDetailDrawer'
import { EditWorkspaceDialog } from './components/overlays/EditWorkspaceDialog'

export default function App() {
  const { state } = useStore()
  const { view, stage } = state

  // The journey stepper only belongs on the transaction areas.
  const showStepper = ['processing', 'match', 'ap', 'pay'].includes(view)

  // AP Processing doubles as the inbox until a transaction reaches a decision.
  const isInbox = view === 'inbox' || (view === 'ap' && stage !== 'submit' && stage !== 'done')

  return (
    <EmailUiProvider>
    <div
      className="ground"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        minHeight: '100vh',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <Sidebar />

      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header />
        {showStepper && <Stepper />}

        <main style={{ flex: '1 1 auto', minWidth: 0 }}>
          {view === 'home' && <CommandCenterView />}
          {view === 'procure' && <ProcurementView />}
          {view === 'receipt' && <ReceiptView />}
          {view === 'recon' && <ReconciliationView />}
          {view === 'pay' && <PaymentView />}

          {view === 'processing' && stage === 'intake' && <IntakeView />}
          {view === 'processing' && stage === 'review' && <ExtractionView />}

          {view === 'match' && !['evidence', 'validation', 'approve'].includes(stage) && (
            <MatchQueueView />
          )}
          {view === 'match' && stage === 'evidence' && <EvidenceView />}
          {view === 'match' && stage === 'validation' && <ValidationView />}
          {view === 'match' && stage === 'approve' && <ApprovalView />}

          {view === 'ap' && stage === 'submit' && <DecisionView />}
          {view === 'ap' && stage === 'done' && <DoneView />}

          {isInbox && (view === 'inbox' ? <EmailAwareApInbox /> : <ApInboxView />)}
        </main>
      </div>

      {/* Overlays sit outside the content column so they can position freely. */}
      <EditWorkspaceDialog />
      <AskAgentPanel />
      <CaseDetailDrawer />
      <AiAdvisory />
      <Transaction360Drawer />
      <ConnectorPanel />
      <ParkDialog />
    </div>
    <UploadEmailDialog />
    </EmailUiProvider>
  )
}
