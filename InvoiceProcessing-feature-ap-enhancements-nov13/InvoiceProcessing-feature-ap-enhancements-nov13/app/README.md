# Finance Command Center — P2P

A React + TypeScript implementation of the `Invoice Processing Agent.dc.html` design from
Claude Design (`../project/`). One P2P platform over several underlying systems: Zoho Books
executes procurement and workflow, SAP S/4HANA is the system of record, the bank pays, and the
Command Center orchestrates, reasons and evidences.

Talks to the FastAPI backend in `../backend` through `src/api/` — run the backend on port 8000 and
the dev server proxies `/api` to it.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve the production build
npm run typecheck
```

Designed for a 1440px desktop; the layout collapses to fewer columns rather than squeezing, and
stays readable well under 1000px.

## The demo journey

Three demo invoices exercise three different agent behaviours:

| Invoice | Format | Outcome |
| --- | --- | --- |
| **Bharat Technologies** | Clean PO-backed GST tax invoice, IGST 18%, 1 page | 3-way match passes — straight-through posting |
| **Apex Industrial Supplies** | Dense 3-page invoice, CGST+SGST, freight at 5% | 3-way match **fails** — 120 invoiced vs 100 ordered and received |
| **Vertex Consulting** | Non-PO professional services, SAC codes, TDS u/s 194J | Exception — no purchase order exists |

The Apex path is the one to walk in a demo:

1. **Invoice Intake & Intelligence** → pick it from the AP shared mailbox.
2. **Extraction** — the ten-stage pipeline runs; click any extracted field to trace it to its
   exact location on the source document (selecting *Tax Amount* jumps the viewer to page 3),
   or hover the document to highlight the field that captured it.
3. **Source Evidence** — the raw PO / GRN / invoice values from each system of record, 22
   columns wide, with the quantity variance highlighted.
4. **Resolution columns** — correct the invoice quantity in place with a reason, then
   **Apply & Revalidate**. The PO and GRN quantities are locked and offer *Request Source
   Correction* instead.
5. **3-Way Match** — re-runs and now passes; taxable value, GST and the total all move with the
   correction.
6. **Verify & Approve** → **Decision** (submit / park / request clarification) → **Payment**
   (treasury release → bank H2H → UTR) → **Reconciliation**, where the audit trail records the
   whole session newest-first.

## Architecture

```
src/
  types.ts              Domain model — invoices, cases, match results, corrections
  state/
    store.tsx           The single state container, actions and the copilot's answers
    selectors.ts        Derived views: the corrected invoice, evidence rows, T360, audit trail
    config.ts           Demo knobs — org name, agent speed, confidence display
  data/                 Mock enterprise data, separated from the components that render it
    invoices.ts           the three demo invoices, match cards, reconciliation, timelines
    cases.ts              46 deterministic AP inbox records
    sources.ts            PO/GRN source records and the evidence column set
    registers.ts          purchase-order and goods-receipt registers, PR drill-back
    personas.ts           the four personas, P2P control flow, pipeline
    dashboard.ts          executive metrics and the reconciliation workspace
    connectors.ts         Enterprise Connect systems and the processing pipeline
  components/
    shell/              Sidebar, header, journey stepper
    views/              One component per workspace
    overlays/           Ask Agent, AI Advisory, Transaction 360, connectors, dialogs
    ui/                 Card, KPI, chart, pill and layout primitives
  styles/
    tokens.css          Design tokens
    base.css            Component classes (.btn, .card, .table, .field …)
    layout.css          Rules needing media queries
```

### State

One state object with a `setState`-style `patch`, plus domain actions (`select`, `connect`,
`applyResolution`, `applyCorrection`, `addCase`, `ask`). Views read derived data through pure
selectors rather than each re-deriving it. Timers (the extraction pipeline, the connector
handshake, revalidation) are owned by refs and cleared on unmount.

### Design system

The base scales come from the **Industry** design system bound to the original project — a light
technical ground, a single accent with a 100–900 OKLCH ramp, condensed headings over a body face,
a 0.85× density spacing scale. The prototype retunes those tokens to a KPMG-aligned identity:
deep blue accent (`#00338d`), a soft blue-grey ground, a cool-navy neutral ramp, rounded corners,
and Archivo over IBM Plex Sans. Status colour is disciplined — blue for agent and chrome, green
for validated, amber for attention, red for exception, and a separate red (`--trace`) reserved for
document-intelligence bounding boxes.

Registration marks (the Industry system's corner crosshairs) are deliberately absent: they read as
square-corner hardware and were retired when the theme moved to rounded cards.

## Notes on the port

Three figures in the source prototype were inconsistent once the Apex correction was applied, and
are corrected here so the demo survives a controller reading it:

- The reconciliation table's **CGST + SGST** row kept the pre-correction ₹3,51,616 while the
  taxable value dropped — GST is now recomputed to ₹3,37,589 alongside it.
- The Invoice match card's **Amount** kept the pre-correction total — it now reads ₹22,15,201.
- The two correction routes (evidence resolution and the line-item workspace) stamped different
  dates, which put the correction *after* the payment in a newest-first audit trail. Both now
  stamp the same moment, just before the automatic match re-run.

The generated case ID is issued synchronously rather than inside the state updater, so the
confirmation screen and the audit trail carry the real number.
