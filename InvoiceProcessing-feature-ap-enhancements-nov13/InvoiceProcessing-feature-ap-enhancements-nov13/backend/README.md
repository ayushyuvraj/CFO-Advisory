# Finance Command Center — Backend

FastAPI service behind the P2P front-end in `../app`. Invoices are uploaded from the UI, read by
**Gemini 2.5 Flash** (vision), validated against Indian GST rules, matched against **Zoho Books**
purchase orders and receipts, routed through the DOA chain, posted to Zoho as Bills, paid, and
reconciled — with every step in an append-only audit trail.

## Run it

```bash
cd backend
uv venv .venv --python 3.12          # or: python -m venv .venv
uv pip install -r requirements.txt   # or: .venv/Scripts/pip install -r requirements.txt
cp .env.example .env                 # then set GEMINI_API_KEY
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Interactive API docs: <http://localhost:8000/docs>.

**Async throughout.** Endpoints, SQLAlchemy (asyncpg for PostgreSQL / Cloud SQL, aiosqlite for local
SQLite), the Gemini SDK (`client.aio`) and the Zoho client (`httpx.AsyncClient`) are all async. PyMuPDF
rendering and file I/O run in worker threads (`asyncio.to_thread`) so the event loop never blocks.
Relationships are eager-loaded (`selectin`) and back-references are `raise`, so an accidental lazy load
fails loudly instead of blocking. Gemini and Zoho calls retry with backoff on 429 / 5xx.

**Database.** Without `DATABASE_URL` the API uses SQLite (`data/fcc.db`). For PostgreSQL, create an
empty database and set e.g. `DATABASE_URL=postgresql://postgres:<password>@localhost:5432/financecommandcenterhub`
— any Postgres URL form works (`+asyncpg`, `+psycopg`, bare); it is normalised to asyncpg.
Tables are created on startup. There are no migrations yet: after a model change on a database
holding only test data, drop the tables and restart (add Alembic before real data goes in).

**Scheduling.** Up to `EXTRACTION_CONCURRENCY` invoices are read by Gemini at once; validation and
matching then run one at a time in arrival order, so the first copy of a duplicate pair is always the
original and PO quantities are consumed in order. On shutdown in-flight work gets
`SHUTDOWN_GRACE_SECONDS` to finish; anything interrupted is re-queued at the next start.

Out of the box `ZOHO_MODE=mock` serves a seeded Zoho organisation (the vendors, POs and receipts
from the prototype), so the whole journey works with only a Gemini key. Generate matching test
invoices with:

```bash
.venv/Scripts/python scripts/sample_invoices.py    # → samples/bharat.pdf, apex.pdf, vertex.pdf
```

| Sample | Expected outcome |
| --- | --- |
| `bharat.pdf` | Match passes (3-way) → approval → post → pay. No TDS (goods invoice). |
| `apex.pdf` | 3 pages; line 4 bills 120 against 100 ordered/received → **exception**. Correct to 100 → passes. |
| `vertex.pdf` | Non-PO consulting, TDS 194J → **exception** until a cost centre is supplied. |

Tests (no API keys needed — they use the mock org and a stand-in extractor):

```bash
.venv/Scripts/python -m pytest
```

## How it works

```
POST /api/invoices (PDF/JPG/PNG/TIFF)
  │  file type checked by magic bytes, stored, TXN-… and AP-… ids issued        → 202
  ▼  background job — progress in pipeline_step (0–10), poll /progress
 1  Reading invoice structure   pages → PNG → Gemini (typed JSON schema + box_2d per value)
 2  Identifying supplier        GSTIN → Zoho vendor master (name fallback flagged)
 3  Validating GSTIN            format + mod-36 checksum, PAN, buyer is one of our GSTINs
 4  Interpreting line items     qty × rate = taxable, HSN/SAC format
 5  Recomputing GST             line-by-line; CGST+SGST vs IGST from supplier state vs POS
 6  Checking against PO         PO lookup; invoice lines ↔ PO lines (description, HSN, rate)
 7  Validating quantities       invoiced ≤ ordered − billed, ≤ accepted on receipts; price, GST rate
 8  Duplicate check             same file, same vendor + invoice no., existing Zoho bills
 9  Assessing risk              status, risk, recommended action, narrative, advisory
10  Recommending next action    DOA chain built when there is nothing left to resolve
  ▼
Exception → correct invoice value (reason required) → re-validate + re-match (no model call)
          → or raise a source request for Zoho-owned PO / GRN values (never overwritten)
          → or park / request clarification → resume
Approve   → one level at a time, DOA limits from policies.json, segregation of duties
Submit    → Bill created in Zoho (PO-linked lines, GST tax ids, PDF attached) → payment proposed
Release   → two-person rule → Confirm UTR → vendor payment recorded in Zoho → Paid
```

The match decision is deterministic rules code, not an LLM, so every pass/fail is explainable
and reproducible. Gemini is used for reading documents and for the Ask Agent copilot, which is
grounded in the one transaction's facts and falls back to rule-based answers if the model is
unavailable.

**TDS** applies only when service lines are at least half the taxable value
(`policies.json → tds.min_service_share`), so freight, packing or commissioning on a goods
invoice does not attract 194C. **Imports** (a non-resident supplier with `gst_treatment:
overseas` in Zoho) need no GSTIN and must carry no Indian GST; foreign-currency invoices are
converted at `policies.json → fx_rates` for DOA limits, dashboards and posting.

**Confidence** starts from the model's own figure per field, then cross-checks move it: a value
that independently verifies (GSTIN checksum, vendor-master match, totals that recompute) has 70% of
its remaining doubt removed; a contradicted value loses 40%. User-corrected values are 100%.
Below 90% overall, the invoice goes to *Validation Required* instead of straight to approval.

## Layout

```
app/
  main.py               app, CORS, startup (DB + Zoho sync)
  config.py             settings from .env
  models.py             invoices, fields, lines, corrections, approvals, payments, audit; Zoho cache (Z*)
  routers/invoices.py   intake and the transaction journey
  routers/operations.py payments, dashboard, reconciliation, registers, connectors, config
  services/
    extraction.py       Gemini call, response schema, box conversion
    pipeline.py         the ten stages, status/risk/recommendation
    validation.py       vendor, GSTIN, buyer, lines, GST, TDS, duplicates, dates
    matching.py         PO/line matching, 2-/3-way tests, cards, recon rows, discrepancy
    corrections.py      invoice corrections and Zoho source requests
    approvals.py        DOA chain
    decisions.py        submit / park / clarify / resume
    posting.py          Zoho Bill payload
    payments.py         proposal, release, UTR confirmation
    insights.py         persona dashboards, reconciliation, PO/GRN registers
    copilot.py          Ask Agent
    serializers.py      response shapes (field names follow app/src/types.ts)
    zoho/client.py      live Zoho Books v3 client (OAuth refresh, paging, rate-limit backoff)
    zoho/mock.py        seeded demo organisation, same interface
    zoho/sync.py        Zoho → local cache (upserts; PO detail only when modified)
policies.json           tolerances, DOA matrix, TDS rules, park reasons — owned by Finance
scripts/sample_invoices.py
tests/
```

## API → screen map

| Screen | Endpoints |
| --- | --- |
| Command Center | `GET /api/dashboard?persona=CFO\|AP Lead\|Finance Controller\|Finance User` |
| Invoice Intake | `POST /api/invoices` (multipart `file`, `channel`) |
| Extraction | `GET /api/invoices/{id}/progress` (poll), `GET /api/invoices/{id}`, `GET /api/invoices/{id}/pages/{n}` (page image), `GET …/document` |
| Source Evidence | `GET /api/invoices/{id}/evidence?line_no=` |
| Resolution | `POST …/corrections` (`{target:"line", line_no, field, value, reason}` or `{target:"field", key, value, reason}`), `POST …/source-requests`, `POST …/revalidate` |
| 3-Way Match | `match`, `recon`, `discrepancy`, `matchLines` in `GET /api/invoices/{id}` |
| Verify & Approve | `POST …/approve`, `POST …/reject`; chain in `approvals` |
| Decision | `POST …/decision` — `submit`, `park` (+`reason`), `clarify` (+`note`, `to`), `resume` |
| Payment | `GET /api/payments`, `POST /api/payments/{id}/release`, `POST /api/payments/{id}/confirm` (`utr`) |
| Reconciliation | `GET /api/reconciliation`, `GET /api/audit` |
| AP Inbox | `GET /api/invoices?q=&status=&type=&currency=&exception=` |
| Procurement / Receipts | `GET /api/registers/purchase-orders`, `…/receipts`, `…/purchase-orders/{po}/requisition` |
| Transaction 360 | `GET /api/invoices/{id}/t360` |
| Ask Agent | `GET`/`POST /api/invoices/{id}/copilot` |
| AI Advisory | `advisory` in `GET /api/invoices/{id}` |
| Enterprise Connect | `GET /api/connectors`, `POST /api/connectors/zoho/test`, `POST /api/connectors/zoho/sync` |
| Reference data | `GET /api/config` |

The acting user is taken from the `X-User` header (email). Approvals and payment release depend on
it for segregation of duties and the two-person rule.

## Connecting the real Zoho Books organisation

1. In the [Zoho API console](https://api-console.zoho.in) create a *Self Client*, generate a grant
   code with the scopes below, and exchange it for a refresh token.
   `ZohoBooks.contacts.READ, ZohoBooks.purchaseorders.READ, ZohoBooks.bills.ALL,
   ZohoBooks.vendorpayments.CREATE, ZohoBooks.accountants.READ, ZohoBooks.settings.READ`
   (+ `ZohoInventory.purchasereceives.READ` if receipts live in Zoho Inventory).
2. Set `ZOHO_MODE=live`, `ZOHO_ORG_ID`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`.
3. `POST /api/connectors/zoho/test`, then `POST /api/connectors/zoho/sync`.

### What the Zoho team needs to maintain

| Object | Required fields | Used for |
| --- | --- | --- |
| Vendors | GSTIN (`gst_no`), PAN, payment terms, GST treatment | Vendor identification, duplicate check, posting |
| Purchase orders | Line items with HSN/SAC, quantity, rate, tax %, account | The match |
| PO custom fields | **Cost Centre**, **Business Unit**, **PR Number**, **Buyer** (these exact labels) | Coding, registers, PR drill-back |
| Purchase receives | Received quantity per PO line; optional **Receipt Type** (Goods / Service) and **Plant** | 3-way match, GR/IR |
| Taxes | GST groups (GST5/12/18/28) and IGST taxes at each rate | Bill posting |
| Chart of accounts | Expense accounts on PO lines; one bank account for payments | Bill and payment posting |
| Organisation GSTINs | Listed in `policies.json → organisation.gstins` | Buyer check |

Gaps in Zoho Books that the design works around:

- **No purchase requisition object.** PR numbers come from a PO custom field. A custom module can
  be wired into `ZohoClient.list_requisitions`.
- **Purchase receives need inventory tracking.** Without it, set `ZOHO_RECEIVES_ENABLED=false`
  and the engine runs a 2-way match (invoice ↔ PO).
- **No acceptance quantity.** Accepted equals received unless a `quantity_accepted` value is
  supplied.

## Not yet built (phase 2)

- **Authentication.** `X-User` is trusted. Put SSO/OIDC in front before any shared deployment.
- **Mailbox intake.** Only UI upload is wired. An IMAP/Graph poller would call the same intake.
- **TDS on Zoho bills.** The payment is net of TDS, but the bill is posted gross. Map TDS sections
  to Zoho TDS tax ids (`tds_tax_id`) so the bill balance clears fully.
- **Bank and GSTN.** UTRs are entered by treasury. Bank statement import, H2H, and GSTR-2B
  reconciliation show as *Not connected*.
- **GCP deployment.** The scheduler runs in-process. On Cloud Run, either set *CPU always allocated*
  with `min-instances ≥ 1`, or move `pipeline.enqueue` onto **Cloud Tasks** (a push to an internal
  `/tasks/process/{id}` endpoint) so work survives scale-to-zero. Move document storage from the local
  disk to **Cloud Storage** (it is behind `services/documents.py`), use **Cloud SQL** with the
  Cloud SQL connector, and keep secrets in **Secret Manager**. Add Alembic migrations.
- **Source requests.** They are recorded and audited, but nothing notifies the Zoho owner yet.
