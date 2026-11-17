# Vision & KPMG CFO Advisory Content Specification

## Product Identity
- **Practice:** KPMG CFO Advisory & Powered Finance
- **Audience:** Enterprise CFOs, VPs of Finance, Controllers, and internal KPMG CFO Advisory engagement teams.
- **Primary Purpose:** Showcase how KPMG CFO Advisory transforms the office of the CFO from historical scorekeeping into an AI-augmented strategic command center, and provide a frictionless sign-in gateway into synced client/team workflows built in the companion Workflow Studio platform.

## Copywriting Rules (Strict)
- **Zero em-dashes (`—`)** anywhere in headlines, subheads, body copy, quotes, buttons, captions, or alt text. Use periods, commas, or colons.
- **One Primary CTA Intent:** Always use `Sign in to Workflows` for authentication entry points (navbar, hero, closing gateway). Never mix with "Log in", "Portal Access", or "Get Started".
- **No AI Clichés or Fake Stats:** Do not invent unverified metrics (no "99.4% accuracy" or "4.2x ROI"). Speak with institutional precision about operational outcomes.
- **Hero Text Budget:**
  - Eyebrow: `KPMG CFO ADVISORY`
  - Headline (max 2 lines): `Orchestrate finance at executive velocity.`
  - Subtext (<= 20 words): `Unify enterprise performance, intelligent close, and AI workflows built for modern finance leaders.`
  - CTAs: `Sign in to Workflows` (primary) + `Explore Practice` (secondary)

## Four Practice Pillars (Sticky-Stack)
1. **01 · Enterprise Performance Management (EPM / FP&A)**
   - Focus: Driver-based rolling forecasts, multi-dimensional profitability modeling across product, channel, and customer, and integrated planning beyond static spreadsheets.
   - Image: `/images/pillar-epm.jpg`
2. **02 · Finance Transformation & AI Automation**
   - Focus: KPMG Powered Finance target operating models across SAP, Oracle, Workday, and Dynamics, global business services (GBS) design, and GenAI digital finance teammates.
   - Image: `/images/pillar-ai.jpg`
3. **03 · Treasury & Working Capital Management**
   - Focus: Real-time 13-week liquidity modeling, cash conversion cycle optimization across AR, AP, and inventory, FX exposure governance, and TMS modernization.
   - Image: `/images/pillar-treasury.jpg`
4. **04 · Close-to-Report & ESG Assurance**
   - Focus: KPMG Intelligent Close cycle acceleration, IFRS and US GAAP technical accounting, capital markets and carve-out readiness, and audit-ready CSRD sustainability reporting.
   - Image: `/images/pillar-esg.jpg`

## Cross-Platform Workflow Sync (Horizontal-Pan Stages)
1. **01 · Studio Authoring:** Advisory teams and client finance architects compose modular data and AI workflows in the companion Workflow Studio.
2. **02 · Governance & Controls:** Role-based approvals, SOX-aligned audit trails, and accounting policy guardrails bind automatically to every workflow run.
3. **03 · Live ERP & Ledger Sync:** Connectors bridge SAP S/4HANA, Workday, Oracle Cloud, and Anaplan without manual spreadsheet exports.
4. **04 · Boardroom Delivery:** Signed-in leaders review executive variance briefs, liquidity stress outputs, and close readiness directly in the Workflows Hub.

## Post-Login Sample Workflows (`/workflows`)
Seed `src/data/workflows.ts` with 6 domain-authentic workflows across the 4 pillars:
- `13-Week Rolling Liquidity Stress Test` (Treasury · Active · SAP S/4HANA + Kyriba)
- `Intelligent Close Intercompany Recon` (Close-to-Report · Active · Workday + BlackLine)
- `GenAI Flux & Variance Narrative Engine` (EPM / FP&A · Active · Anaplan + Snowflake)
- `CSRD Scope 3 Carbon Ledger Rollup` (Close-to-Report · Review · SAP Sustainability + Azure)
- `Powered Finance Target Operating Bridge` (Transformation & AI · Scheduled · Oracle Fusion + ServiceNow)
- `Working Capital Cash Conversion Optimizer` (Treasury · Active · SAP S/4HANA + Power BI)

## Platform Multi-Product & Telemetry Invariants (Strict)
- **Single Persona Scope (MVP):** Do not apply role-based catalog filtering for this milestone. The KPMG Lead sees all registered products, workflows, and audit logs.
- **Decoupled Telemetry Access:** Child products (e.g. AP Invoice Processing) must never connect directly to the central PostgreSQL database. All events must be emitted asynchronously via `POST /api/telemetry`.
- **Telemetry Emission Responsibility:** The central platform provides the PostgreSQL store, ingestion gateway, audit UI, and client SDK. Child product folders must implement the thin telemetry emission contract to be observable.
- **Local Dev Port Convention:**
  - Platform Hub: `localhost:3000` (Original) / `localhost:3001` (V2)
  - Product 1 (AP Invoice Processing): Frontend `5173`, Backend `8000`
  - Product 2 (13-Week Liquidity): Frontend `3002`, Backend `8002`
  - Product 3 (Close Reconciliation): Frontend `3003`, Backend `8003`
