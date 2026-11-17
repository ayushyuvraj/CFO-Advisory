# Finance Command Center — P2P

An interactive prototype of an AI-native accounts-payable platform for an Indian GST context.
One P2P experience over several underlying systems: **Zoho Books** executes procurement and
workflow, **SAP S/4HANA** is the financial system of record, the **bank** pays, and the Command
Center orchestrates, reasons about what it finds, explains it and evidences it.

The React front-end (`app/`) runs against the FastAPI backend (`backend/`): invoices are read by
Gemini, validated and matched against Zoho Books data, approved, posted and paid — all persisted in
PostgreSQL (or SQLite).

---

## Run it locally

You need **Node.js 20.19+** and **Python 3.12**. Two terminals:

```bash
# 1 — backend (see backend/README.md for .env: GEMINI_API_KEY, DATABASE_URL, Zoho)
cd backend
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# 2 — front-end
cd app
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` to the backend on port 8000
(`VITE_API_TARGET` overrides it). API docs: <http://localhost:8000/docs>.

### Testing through the UI

1. **Invoice Intake & Intelligence** → drop a PDF (the `../pdf` folder has six) → watch the ten-stage
   pipeline, then click fields to trace them on the real page.
2. **Retrieve Source Data** → resolve exceptions in the resolution columns (correct what the Command
   Center owns; request source corrections for what Zoho owns).
3. **Match** → **Verify & Approve**. Use **Acting as** in the header (or the *Act as …* shortcut on the
   pending level) — each DOA level needs a different person.
4. **Decision** → submit posts a Bill to Zoho Books → **Payment**: release as Treasury (two-person
   rule), enter a UTR.
5. **AP Inbox**, **Command Center**, **Reconciliation** and **Transaction 360** reflect it all live.

---

## The demo

Three demo invoices exercise three deliberately different agent behaviours:

| Invoice | Format | Outcome |
| --- | --- | --- |
| **Bharat Technologies** | Clean PO-backed GST tax invoice, IGST 18%, one page | 3-way match passes — straight-through posting |
| **Apex Industrial Supplies** | Dense three-page invoice, CGST + SGST, freight at 5% | 3-way match **fails** — 120 invoiced against 100 ordered and 100 received |
| **Vertex Consulting** | Non-PO professional services, SAC codes, TDS u/s 194J | Exception — no purchase order exists anywhere |

### The walkthrough worth showing

The Apex invoice is the one that tells the whole story:

1. **Invoice Intake & Intelligence** — pick it up from the AP shared mailbox.
2. **Extraction** — the ten-stage pipeline runs. Click any extracted field to trace it to its
   exact location on the source document; selecting *Tax Amount* navigates the viewer to page 3
   by itself. Hover the document to highlight the field that captured that value. Every field
   stays editable and marks itself *User corrected*.
3. **Source Evidence** — the raw PO, GRN and invoice values each system of record returned, 22
   columns wide, with the quantity variance highlighted before the match engine forms an opinion.
4. **Resolution columns** — correct the invoice quantity in place with a reason, then
   **Apply & Revalidate**. The PO and GRN quantities are locked, because they belong to Zoho;
   those offer *Request Source Correction* instead, which raises a case rather than overwriting a
   system of record.
5. **3-Way Match** — re-runs and passes. Taxable value, GST and the total all move with the
   correction.
6. **Verify & Approve** (Zoho DOA) → **Decision** (submit, park or request clarification) →
   **Payment** (treasury release → bank H2H → UTR) → **Reconciliation**, where the audit trail
   records the whole session newest-first, with user, timestamp and reason against the change.

Try the Vertex invoice too — the resolution framework adapts to a missing PO and a missing cost
centre rather than being hard-coded to quantity.

### Everything else in the product

- **Command Center** with four personas (CFO, AP Lead, Finance Controller, Finance User), each
  with its own KPIs, action items and agent insights, plus the seven-step P2P Control Flow.
- **AP Inbox** — 47 cases with filters, search and a row action that opens the exact invoice.
- **Requisition & Procurement** and **Goods / Service Receipt** registers, with drill-back from a
  purchase order to the requisition that raised it.
- **Transaction 360** — the persistent transaction identifier and its whole lifecycle, upstream
  and downstream, reachable from the header on any transaction screen.
- **Ask Agent** — a draggable, minimisable copilot that knows the current transaction, cites what
  it checked, states the finding and recommends.
- **AI Advisory** — distinct from Ask Agent: the agent raises this itself when it finds something,
  and collapses to an edge tab rather than being dismissed.
- **Enterprise Connect** — SAP S/4HANA, Oracle ERP, Coupa, Ariba, Zoho Books and the AP mailbox,
  with a simulated four-step handshake and exactly one primary ERP connected at a time.

---

## Repository layout

```
app/          The application — React + TypeScript + Vite. This is what you run.
project/      The original Claude Design prototypes (.dc.html) this was built from,
              kept as a visual reference, plus the Industry design-system bundle.
chats/        The design conversation that produced the prototype.
docs/         The Claude Design handoff notes.
```

`app/README.md` goes into the architecture — state management, the data layer, the design
tokens, and the handful of inconsistencies in the source prototype that were corrected during the
port.

## Tech

React 18, TypeScript (strict), Vite 5. No UI framework, no CSS-in-JS runtime, no state library —
a single typed state container with pure selectors, and design tokens in plain CSS.
