import { SYNC_LABEL, useStore } from '../../state/store'

/**
 * Re-reads Zoho Books (the same sync as Enterprise Connect → Sync now) from the
 * screen that shows Zoho data, then reloads it. Bills deleted in Zoho, new
 * receipts and changed POs appear without leaving the page.
 */
export function RefreshButton() {
  const { state, actions } = useStore()
  const syncing = state.busy === SYNC_LABEL
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={!!state.busy}
      onClick={() => void actions.syncZoho()}
      title="Re-read vendors, POs, receipts and bills from Zoho Books"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <span
        aria-hidden="true"
        style={{ display: 'inline-block', animation: syncing ? 'ipa-spin 1s linear infinite' : 'none' }}
      >
        ⟳
      </span>
      {syncing ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}
