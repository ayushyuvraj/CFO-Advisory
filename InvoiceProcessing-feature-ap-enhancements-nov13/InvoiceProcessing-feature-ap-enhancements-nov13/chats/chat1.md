# Theme and quality upgrade

_Started 2026-09-05 04:51 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Absolutely. I would **not** over-engineer this first version. The objective shou"
Current date is now September 5, 2026
</system-info>

<attached aesthetic_system_instructions>
A design system or theme is attached to this project. That attachment already answers the visual-style question: apply it. Do NOT ask the user which visual style to use — no questions about vibe, colors or palette directions (including color-swatch svg-options questions), typography, mood, or art direction, and skip the "divergent visuals" question from the question-asking tips; offer divergent visual directions only if the user themselves asks for alternatives. This rule bans asking the user to pre-pick a style in the abstract — swatches, mood words, palette pickers. It does not ban asking them to choose among candidates you have already built: putting built candidates on a file-options board for the user to pick from is encouraged. Treat the attachment as the confirmed starting point and product context — the "confirm the starting point" tip is already satisfied, so do not ask the user to confirm or re-pick it. Spend your questions on everything else you need: audience, purpose, content, structure, scope, interactions, tone of copy.
</attached aesthetic_system_instructions>

<pasted_text name="Pasted text (1007 lines)">
Absolutely. I would **not** over-engineer this first version. The objective should be to make the prototype feel like a **real enterprise AI-powered AP Invoice Processing Agent**, while keeping the journey to roughly **5–6 core screens**.

Below is a **copy-paste-ready Claude prompt** designed to make Claude build the prototype rather than merely describe it.

You are an elite product designer, enterprise UX architect, and AI-agent solution consultant working at the level of McKinsey / BCG / Bain.

Build a **high-fidelity, industry-grade prototype for an “AI Invoice Processing Agent”** for a large enterprise / GCC environment.

This is NOT an RPA demo and NOT a traditional workflow / low-code application.

The prototype must clearly communicate that an **AI agent is autonomously interpreting documents, extracting information, validating data, reasoning over exceptions, interacting with enterprise systems, and recommending / executing next actions.**

The experience should feel like a modern enterprise AI product that could be shown to a CFO, Global Process Owner, CIO, or Head of Shared Services.

---

# 1. PRODUCT NAME

Use:

**Invoice Processing Agent**

Subtitle:

**AI-powered Accounts Payable Automation**

Use a subtle AI-agent positioning statement such as:

&gt; “From invoice intake to validation, exception handling and posting — powered by intelligent agents.”

Do not overuse the word “AI”. The AI capability should be demonstrated through the workflow itself.

---

# 2. DESIGN LANGUAGE

Use a premium **KPMG-inspired enterprise design language**.

Primary visual direction:

* KPMG-style blue / dark blue palette
* White backgrounds
* Very light grey secondary backgrounds
* Professional enterprise typography
* Clean cards
* Thin borders
* Subtle shadows
* Rounded corners, but not excessively playful
* Strong information hierarchy
* Executive-grade dashboards
* Minimal visual clutter

The product should look like something created for a Fortune 500 finance organization.

Do NOT make it look like:

* a generic SaaS dashboard
* a consumer application
* an RPA console
* a developer tool
* a futuristic neon AI interface

The interface should feel **credible, sophisticated and enterprise-ready**.

---

# 3. CORE USER JOURNEY

Keep the MVP journey simple:

**1. Invoice Intake**
↓
**2. AI Extraction &amp; Review**
↓
**3. Validation / 3-Way Match**
↓
**4. Decision &amp; Submission**
↓
**5. AP Inbox / Case Management**
↓
**6. Executive Dashboard**

Do not add unnecessary screens.

The entire prototype should be navigable from this journey.

---

# 4. SCREEN 1 — INVOICE INTAKE

Create the landing page for invoice processing.

Header:

**Invoice Processing Agent**

Show a concise AI status indicator:

**Agent Status: Ready**

Main card:

### “How would you like to provide the invoice?”

Create a large drag-and-drop / upload area.

Example:

**Drop invoice here**

or

**Choose an input method**

When the user clicks the input area, display three options:

### Option 1 — Upload Invoice

Upload:

* PDF
* JPG / PNG
* scanned invoice

### Option 2 — Connect Enterprise System

Show examples:

* SAP
* Oracle
* Coupa
* Ariba
* Other ERP / AP systems

Label this:

**Enterprise Connector**

### Option 3 — Email / Shared Mailbox

Example:

**AP Shared Mailbox**

This represents invoices arriving automatically through email.

Make the connector options visually credible but keep them as prototype interactions.

Below the input area, show:

**Supported formats**
PDF | JPG | PNG | TIFF

And:

**AI processing**
OCR + document understanding + invoice intelligence

---

# 5. DEMO INVOICES

For the prototype, create a dropdown called:

**Select Demo Invoice**

Provide exactly THREE demo invoices.

Use three deliberately different invoice formats:

1. **GlobalTech Solutions — Standard Invoice**

   * Clean corporate invoice
   * PO-backed
   * USD
   * Multiple line items

2. **Apex Industrial Supplies — Complex Invoice**

   * Different visual layout
   * Multiple pages
   * Multiple line items
   * Tax / freight information

3. **Vertex Consulting Services — Non-PO Invoice**

   * Service invoice
   * No PO
   * Different format
   * Requires additional validation

The user should be able to select any of the three.

Do not require actual downloadable invoice files.

Create realistic invoice previews directly inside the prototype.

---

# 6. SCREEN 2 — AI EXTRACTION &amp; REVIEW

Once an invoice is selected, move to the invoice review screen.

This should be one of the most impressive screens.

Use a **split-screen layout**.

LEFT:

Show the actual invoice preview.

It should look like a real PDF invoice.

Include:

* Vendor name
* Vendor address
* Invoice number
* Invoice date
* PO number
* Payment terms
* Currency
* Billing entity
* Ship-to
* Tax
* Subtotal
* Total
* Line items

For multi-page invoices, show page navigation:

**Page 1 of 3**

and thumbnails for pages.

RIGHT:

Show:

### “AI Extracted Data”

Create editable fields for:

* Vendor Name
* Vendor ID
* Invoice Number
* Invoice Date
* PO Number
* Currency
* Payment Terms
* Billing Entity
* Subtotal
* Tax
* Total Amount

Then show line-item extraction:

| Description | Qty | Unit Price | Tax | Amount |
| ----------- | --: | ---------: | --: | -----: |

Each extracted field should have an AI confidence score.

Examples:

**Invoice Number**
INV-2026-08452
**99.8% confidence**

**PO Number**
4500127845
**99.2% confidence**

**Total Amount**
$48,750.00
**100% confidence**

Use small confidence indicators.

High confidence:
**99–100%**

Medium:
**95–98%**

Low:
**&lt;95%**

For the demo, most values should be 98–100% so that the AI appears reliable.

Allow every extracted field to be edited.

If the user edits a value, visually indicate:

**User corrected**

---

# 7. AI AGENT INSIGHT PANEL

On the right side or underneath the extracted fields, include a compact AI panel:

### “Agent Summary”

Example:

&gt; Invoice successfully interpreted.
&gt; Vendor identified with 99.8% confidence.
&gt; PO number detected and matched to invoice.
&gt; 8 line items extracted.
&gt; Tax and total calculations verified.
&gt; Ready for enterprise validation.

Include a small animated or static status:

**● AI analysis complete**

Also show:

**Agent actions completed: 7**

Examples:

* Document classified
* Vendor identified
* Fields extracted
* Line items interpreted
* Tax calculated
* Duplicate check initiated
* PO match initiated

This is critical because it makes the application feel like an **agent**, rather than OCR.

---

# 8. SCREEN 3 — VALIDATION &amp; 3-WAY MATCH

After clicking:

**Continue to Validation**

Create a validation screen.

Header:

### “AI Validation &amp; 3-Way Match”

Explain very simply:

**Invoice → Purchase Order → Goods Receipt**

Create three cards.

### INVOICE

Show:

* Invoice Number
* Vendor
* Amount
* Quantity

Status:

**✓ Validated**

### PURCHASE ORDER

Show:

* PO Number
* PO Amount
* Ordered Quantity
* Vendor

Status:

**✓ Matched**

### GOODS RECEIPT

Show:

* GR Number
* Received Quantity
* Receipt Date

Status:

**✓ Matched**

Between the three cards show:

**3-Way Match: PASS**

Then create a reconciliation table.

Example:

| Validation |    Invoice |    PO / GR | Result |
| ---------- | ---------: | ---------: | ------ |
| Vendor     | GlobalTech | GlobalTech | ✓      |
| PO Number  | 4500127845 | 4500127845 | ✓      |
| Quantity   |        100 |        100 | ✓      |
| Unit Price |       $450 |       $450 | ✓      |
| Tax        |     $3,750 |     $3,750 | ✓      |
| Total      |    $48,750 |    $48,750 | ✓      |

Show:

### AI Validation Summary

&gt; “All critical invoice attributes matched against enterprise records. No material variance identified. Invoice is eligible for posting.”

Add:

**Agent confidence: 99.6%**

---

# 9. EXCEPTION SCENARIO

The prototype MUST demonstrate that an AI agent can handle exceptions.

For the **Vertex Consulting Services — Non-PO Invoice**, show an alternate scenario.

Instead of 3-way match passing, show:

**⚠ Exception detected**

Example:

&gt; “No purchase order was identified for this invoice. The invoice appears to be a valid non-PO service invoice, but additional business-owner validation is required.”

Show:

**Recommended Agent Action**

Options:

### Park Invoice

Reason:
**Await business approval**

### Request Clarification

Example:
**Ask business owner to provide cost center / approval**

### Continue Processing

Only available after required information is supplied.

This should demonstrate **agentic reasoning and exception management**.

---

# 10. SCREEN 4 — SUBMIT / POST / PARK

Create a simple final action screen.

Header:

### “Ready for Processing”

Show a summary:

Vendor
Invoice Number
PO Number
Total Amount
Validation Status
AI Confidence

Then provide three primary actions:

### Submit for Posting

Primary CTA

### Park Invoice

Secondary CTA

### Request Clarification

Secondary CTA

When the user selects **Park Invoice**, show a small modal:

**Why is this invoice being parked?**

Dropdown:

* Missing PO
* Missing approval
* Vendor mismatch
* Amount discrepancy
* Tax discrepancy
* Missing supporting document
* Other

Then:

**Park Invoice**

Show confirmation:

&gt; Invoice INV-2026-08452 has been parked successfully.

Status:

**Parked — Awaiting Action**

For Submit:

Show:

**Invoice successfully submitted**

Status:

**Posted / Submitted to ERP**

Include a generated case ID such as:

**AP-2026-001284**

---

# 11. SCREEN 5 — AP INBOX / CASE MANAGEMENT

Create an enterprise AP inbox.

Header:

### “AP Processing Inbox”

Show summary cards:

**Total Invoices**
50

**Processed**
34

**In Progress**
7

**Exceptions**
5

**Parked**
4

Create a table containing approximately 40–50 realistic invoice records.

Columns:

* Case ID
* Invoice Number
* Vendor
* Invoice Date
* PO Number
* Amount
* Currency
* AI Confidence
* Match Status
* Processing Status
* Received Date
* Action

Statuses should include:

**Processed**
**In Progress**
**Validation Required**
**Exception**
**Parked**
**Awaiting Approval**
**Submitted**
**Posted**

Use realistic variations.

Include filters:

* Status
* Vendor
* Date
* Amount
* PO / Non-PO
* Exception Type

Include search.

When a row is clicked, open the corresponding invoice journey / case details.

This should make the prototype feel like an actual operational AP platform.

---

# 12. SCREEN 6 — EXECUTIVE DASHBOARD

Create a separate executive dashboard.

Title:

### “Invoice Processing Agent — Executive Overview”

Subtitle:

**AI-powered Accounts Payable Performance**

Top KPI cards:

### Invoice Volume

1,248

### Straight-Through Processing

82%

### AI Extraction Accuracy

99.2%

### 3-Way Match Rate

91%

### Exception Rate

6.8%

### Average Processing Time

2.4 min

Then create several simple visualizations.

### Invoice Processing Funnel

Received
↓
Extracted
↓
Validated
↓
Matched
↓
Posted

### Processing Outcome

* Straight-through
* Exception
* Parked
* Awaiting approval

### AI Performance

Show:

**Extraction Accuracy**
99.2%

**Field-level Confidence**
98.7%

**Duplicate Detection**
99.5%

**Match Accuracy**
97.8%

### Operational Impact

Show:

**Manual Touches Avoided**
8,420

**Estimated Processing Hours Saved**
1,960 hrs

**Exception Resolution**
31% faster

Do not make unsupported claims overly prominent; these can be clearly labelled as **illustrative demo metrics**.

---

# 13. AI AGENT EXPERIENCE

This is extremely important.

Throughout the application, make the product feel like an **AI agent**, not OCR + workflow.

Use a persistent subtle AI status component:

### Invoice Processing Agent

**Thinking / Analyzing / Validating / Completed**

When moving between stages, display short agent actions such as:

&gt; “Reading invoice structure…”

&gt; “Identifying supplier…”

&gt; “Interpreting line items…”

&gt; “Checking invoice against PO…”

&gt; “Validating quantities…”

&gt; “Checking for duplicate invoices…”

&gt; “Assessing exception risk…”

&gt; “Recommending next action…”

Then:

**✓ Processing complete**

Avoid excessive animations. The experience should remain professional.

---

# 14. AGENTIC ELEMENTS

Include a small collapsible section called:

### “Agent Activity”

When opened, show a timeline:

**10:32:01**
Document received

**10:32:03**
Document classified as invoice

**10:32:05**
Vendor identified

**10:32:07**
Invoice fields extracted

**10:32:09**
PO identified

**10:32:11**
3-way match initiated

**10:32:12**
Duplicate check completed

**10:32:14**
Validation completed

**10:32:15**
Recommended action: Submit for posting

This timeline is important because it visually demonstrates autonomous agent execution.

---

# 15. IMPORTANT ENTERPRISE LOGIC

The prototype should conceptually demonstrate the following AP process:

**Invoice Intake**
→ Document Understanding
→ Data Extraction
→ Vendor Identification
→ PO Identification
→ Duplicate Check
→ PO Validation
→ Goods Receipt Validation
→ 3-Way Match
→ Tax / Amount Validation
→ Exception Detection
→ Approval / Clarification
→ ERP Posting
→ Audit Trail

Do not create a separate screen for every step.

Represent these capabilities through the existing screens.

---

# 16. CONNECTOR CONCEPT

Do not attempt to build real SAP / Oracle integrations.

Instead create a realistic UI concept.

Example connector modal:

### Enterprise Connections

**SAP S/4HANA**
Connected

**Oracle ERP**
Available

**Coupa**
Available

**Ariba**
Available

**AP Shared Mailbox**
Connected

Show a simple connection status.

This is a prototype, so clicking a connector can simulate the connection.

---

# 17. MICROCOPY

Use enterprise language.

Prefer:

“AI Validation”
“Agent Recommendation”
“Confidence”
“Exception”
“Enterprise Connector”
“3-Way Match”
“Processing Status”
“Ready for Posting”
“Awaiting Business Action”
“Agent Activity”

Avoid childish AI language such as:

“AI Magic”
“Wow!”
“Smart AI”
“AI Superpower”

---

# 18. NAVIGATION

Create a simple left navigation:

**Invoice Processing**
**AP Inbox**
**Dashboard**

Optional bottom:

**Connected Systems**

**Settings**

Keep navigation minimal.

---

# 19. DEMO DATA

Generate realistic but fictional enterprise data.

Create approximately 40–50 invoice records for the inbox.

Use vendors from industries such as:

* Manufacturing
* Technology
* Professional Services
* Logistics
* Facilities
* Procurement

Use realistic currencies:
USD, EUR, GBP, INR.

Use realistic invoice values.

Do NOT use real personal information.

---

# 20. INTERACTION REQUIREMENTS

The prototype must be interactive.

At minimum:

1. Select one of the three demo invoices.
2. Invoice preview changes.
3. Extracted data changes accordingly.
4. Confidence scores change.
5. Continue to validation.
6. Validation results change depending on invoice.
7. Demonstrate both:

   * successful 3-way match
   * exception / non-PO scenario
8. Submit invoice.
9. Park invoice.
10. Request clarification.
11. Case appears in AP Inbox.
12. Dashboard metrics reflect the demo transaction where practical.
13. Clicking an inbox case opens its details.

---

# 21. RESPONSIVE DESIGN

Design primarily for a desktop enterprise environment.

Target:
**1440px desktop**

Also make the layout reasonably responsive for smaller screens.

---

# 22. TECHNICAL EXPECTATION

Build the prototype as a polished front-end application.

Use:

* React
* TypeScript
* Modern component architecture
* Reusable components
* Clean state management
* Realistic mock data
* No backend required
* No real ERP integrations required

The application must run without external API dependencies.

If a library is unavailable, implement the functionality using standard React/CSS rather than breaking the prototype.

---

# 23. VISUAL QUALITY BAR

The result must look like a **consulting-grade enterprise AI product prototype**, not a developer demo.

Pay particular attention to:

* spacing
* typography
* hierarchy
* alignment
* tables
* cards
* status indicators
* confidence indicators
* invoice preview
* dashboard visuals
* navigation
* interaction states

Avoid excessive rounded cards and excessive gradients.

Use whitespace intelligently.

---

# 24. MOST IMPORTANT STORY

When a CFO or senior finance leader sees this prototype, they should immediately understand:

&gt; “This agent can receive invoices from multiple channels, understand different invoice formats, extract the required information, validate it against enterprise data, perform a 3-way match, identify exceptions, recommend what to do next, and ultimately submit or park the invoice — while maintaining an audit trail.”

The experience should therefore communicate:

**Perceive → Reason → Validate → Decide → Act → Learn / Track**

without turning this into a theoretical AI diagram.

---

# 25. FINAL REQUIREMENT

Do NOT create unnecessary functionality.

This is a **draft MVP demonstration**.

Prioritize:

**Excellent UX + credible AP process + visible AI-agent behavior + executive-grade visual quality.**

The final product should be something that a consulting team could demonstrate to a CFO / GCC leader as:

### “This is what an AI-native Accounts Payable Invoice Processing Agent could look like.”

Build the complete interactive prototype now.

</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Design Components">
This project uses Design Components: every design is a single streaming `Name.dc.html` file. The full authoring spec is in your system prompt under "Writing code — Design Components" — follow it. Author and edit `.dc.html` content with the `dc_write`, `dc_html_str_replace`, `dc_js_str_replace`, and `dc_set_props` tools (not `write_file`; `str_replace_edit` works but won't stream); template edits stream into the live preview as you type.
</attached-skill>

<attached-skill name="Industry (design system)">
[Design System] This project uses the **Industry** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

This project has the **Industry_indust** design system bound at `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/`. If anything under that path is missing or fails to load, the folder name may differ — `list_files` `_ds/` and use the folder whose name ends with 0942542c-810d-4c59-931a-3e245d9e23ae instead, including in the <link>/<script> paths below.

**Loading the bundle is how you use this design system.** Every Design Component you build must load `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js` in `<helmet>` (include it in child DCs too — de-duped by URL) and compose with its components — do not recreate those components from scratch or restyle raw HTML to look like them. At the top of the template:

```html
<helmet>
  <link rel="stylesheet" href="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/styles.css">
  <script src="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js"></script>
</helmet>
```

Then mount any component directly in the template — no logic class needed:

```html
<x-import component-from-global-scope="Industry_indust.Button" hint-size="auto,40px">Label</x-import>
```

Props are template attributes (kebab → camelCase); template children pass through as `props.children`. The linked stylesheet(s) carry the design tokens (colors, type, spacing) — style against those via `var(--*)` and the design system's classes rather than guessing values.

**Start from a template if one matches.** Before building from scratch, check whether a template below matches the user's request. Read the template (list its folder, `read_file` the entry) and decide: if it's close to what's asked, `copy_files` the folder as your starting point; if you'd rather re-author in DC, `dc_write` a new page using the template as your structural reference. When this design system is bound, `copy_files` repoints the copied `ds-base.js` automatically — only edit its base line yourself if the copy result says so, or when copying from an unbound project (change `'../..'` to your `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae` path). (Older templates have no `ds-base.js` and carry `../../…` bundle/stylesheet refs in their pages instead — repoint those by hand.)

- `Deck` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/deck/`) — A twenty-one-slide presentation starter: cover, contents, dividers, columns, quadrants, a data table, SVG charts and timeline, bleed imagery, a quote and a close, on the theme's tokens
- `Landing` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/landing/`) — A one-page product landing in the system's own voice — an invented product (Holdfast: a fastener catalog), a condensed hero, a numbered spec-sheet plate, wireframe cells and a duotone photograph

The full design-system source tree lives at `/projects/0942542c-810d-4c59-931a-3e245d9e23ae/` — use `list_files` / `read_file` from there for anything not under `_ds/` (layout varies by brand; don't assume folder names). Its guide is reproduced below so you don't need to fetch it:

<design-system-guide>
# Industry design system

Industry is a wireframe: steel-blue on a light technical ground, Barlow Condensed headings over Barlow, a modular grid, and cards, figures and buttons framed as blueprint objects — square-cornered, hairline-bordered, with "+" registration marks at the corners. Cards and figures stay transparent line drawings; the primary button is the one solid object on the board, an accent fill that keeps the square corners and the marks. Photography is duotoned into the steel accent and icons are thin-stroke.

## How to use this

- Link the one stylesheet from every page — `&lt;link rel="stylesheet" href="styles.css"&gt;` (adjust the relative path) — and take every color, font, spacing, radius and shadow from its variables (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Never hard-code a hex, a font name or a px value the tokens already carry.
- Build with the classes below rather than inventing parallel ones; the component pages are plain HTML, so view source and copy the markup.
- `templates/` holds starting points a consuming project can copy whole.
- The whole system was derived from `theme.json`. To change the look, edit the tokens at the top of `styles.css` — every page, the thumbnail and this guide read from them — and keep `theme.json` and the written guidance in step so they don't drift from what the CSS actually does.

## Direction

Modular grid layouts — content in equal-width cells, strong horizontal and vertical rhythm, visible structure. Cards, buttons and major sections are wireframe objects: square-cornered, thin-bordered, with `+` crosshair corner marks (the `.blueprint` class + four `&lt;i class="corner tl/tr/bl/br"&gt;` children) — never soft filled rounded blocks. Images and figures get the same treatment: square, hairline-framed and marked, never rounded or clipped. Wrap hero and inline images in the `.duotone` class — they are desaturated and washed in the accent, like a screen print that re-colors with the theme.

## Color

A light ground (`--color-bg` #f2f2f3) with `--color-text` #1d1f20 and a single accent #5980a6 (this is a mono scheme: no second accent was chosen — the `--color-accent-2-*` variables carry a machine-derived stand-in kept only so both sets resolve; treat them as one role). Each role carries a 100–900 tonal ramp (`--color-neutral-100` … `--color-accent-2-900`) generated in OKLCH on a shared perceptual lightness scale, so the same step of any ramp has the same visual weight. Use the light steps (100–300) for tinted fills, hovers and subtle borders, 500 as the role's base, and the dark steps (700–900) for text on tinted fills and for pressed states; prefer ramp steps over ad-hoc `color-mix()`. For elevation use `--shadow-sm/md/lg` (already tuned to the ground) rather than ad-hoc box-shadows.

## Type

Barlow Condensed for headings over Barlow for body text, loaded as `--font-heading` / `--font-body`. Density 0.85× and radius 4px are already baked into the `--space-*` / `--radius-*` scales — use the variables, not raw numbers.

## Icons

Use Lucide icons (https://lucide.dev), at stroke-width 1.5 for a lighter, more technical look throughout.

## Interaction states

Interactive states are themed, never browser defaults: give every interactive element a `:hover` tint and a pressed state from the accent ramp (one step past the base — `--color-accent-600` on a light ground, `--color-accent-400` on a dark one, or a `color-mix()` tint for outlined/ghost variants), and style keyboard focus with `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — never leave the default blue focus ring.

## Components

| Class | What it is | Shown in |
| --- | --- | --- |
| `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block` | Actions — the primary is a solid accent fill | components/buttons.html |
| `.tag` with `.tag-accent`, `.tag-accent-2`, `.tag-neutral`, `.tag-outline` | Small labels tinted from the ramps (mono palette: accent-2 reads the same as accent) | components/buttons.html |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | Form fields and choices on native elements — no script | components/forms.html |
| `.card` with `.card-kicker`, `.card-title`, `.card-body`, `.card-meta`; `.elev-sm/md/lg` | Transparent, hairline-bordered cards with corner registration marks | components/cards.html |
| `.nav` + `.nav-brand` | The header bar | components/navigation.html |
| `.table` | Data tables with themed header and row rules | components/table.html |
| `.dialog-backdrop` + `.dialog` (+ `.dialog-title/-body/-actions`) | A modal at the top elevation | components/dialog.html |
| `.hr` | A horizontal rule — present, but this system prefers whitespace; avoid it | — |
| `.blueprint` + four `&lt;i class="corner tl/tr/bl/br"&gt;` children | The wireframe frame every card, figure and primary button wears | components/cards.html |
| `.duotone` | The image wrapper — every content photograph goes through it | foundations/image.html |

States are built in: hovers and pressed states come from the accent ramp, keyboard focus is the 2px accent `:focus-visible` ring, `::selection` is an accent tint, and disabled controls drop to 45% opacity. Don't restyle them per page. The accent-to-ground pair is tuned to at least 3:1 — enough for icons, large text and interface chrome, not for body copy — so for paragraph-size text in the accent use a deep ramp step (`--color-accent-700` on this ground) rather than the accent itself.

## Do

- Frame cards, figures and primary buttons as blueprint objects: the `.blueprint` class plus four `&lt;i class="corner …"&gt;` marks.
- Keep the grid visible — equal cells, strong horizontal and vertical rhythm.
- Condense headings (Barlow Condensed) and keep body copy in Barlow.
- Duotone photographs with the `.duotone` wrapper so they take the accent.

## Don't

- Do not round cards, figures or buttons, and do not give cards or figures a surface fill — they are line drawings (the solid accent primary button is the one deliberate exception).
- Do not drop the registration marks from a framed element.
- Do not use thick icon strokes; the set is Lucide at 1.5.
- Do not add decorative color beyond the steel accent. The accent's own deep step (`--color-accent-900`) may carry a full field where the deck's section dividers use it — steel as ground, type reversed to paper. (The landing's numbers sit on a drawn spec-sheet plate on the paper ground instead — its own grammar, not a field.)

## Files

- `styles.css` — the only stylesheet: the token sheet (`:root` variables, ramps, base type) plus the component layer. Link it from every page.
- `readme.md` — this guide.
- `theme.json` — the parameters these files were derived from (a machine-readable record of the theme).
- `thumbnail.html` — the project cover (brand mark + swatches).
- `foundations/type.html` — the type scale and the heading/body pairing at real sizes.
- `foundations/color.html` — color roles and the 100-900 tonal ramps, with usage notes.
- `foundations/layout.html` — the spacing scale, the grid and how edges are drawn.
- `foundations/icons.html` — the icon set at interface sizes, inline and in buttons.
- `foundations/image.html` — how photographs and figures are treated.
- `components/buttons.html` — buttons, icon buttons and tags in every variant and state.
- `components/forms.html` — text fields, radios and the segmented control on native elements.
- `components/cards.html` — content cards and the elevation steps.
- `components/navigation.html` — the header bar pattern.
- `components/table.html` — a data table with the themed header and row rules.
- `components/dialog.html` — a modal over its backdrop at the top elevation.
- `theme.html` — the theme's parameters rendered as a reference sheet.
- `templates/landing/` — a starter page consuming the system the intended way (`index.html`, its `ds-base.js` loader, and the vendored `image-slot.js` its photograph mounts).
- `assets/photo.jpg` — the reference photograph the imagery page treats.

</design-system-guide>
</attached-skill>

## Assistant

_[tool: read_skill_prompt]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: grep]_

Building the prototype as one Design Component on the Industry system.

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Rebuilt with full Indian context: GST tax invoices (GSTIN/PAN/HSN-SAC, IGST vs CGST+SGST, place of supply, e-invoice IRN), TDS u/s 194J on the non-PO service invoice, ₹ lakh-style formatting, and Indian vendors/plants (Pune, Bengaluru, Gurugram) with a few foreign-currency import cases in the inbox.

Journey is live end-to-end: intake channels → agent extraction with confidence scores and editable fields → 3-way match (pass for Bharat/Apex, exception for Vertex) → submit/park/clarify → case lands in the AP Inbox → executive dashboard. Tweaks panel exposes entity name, confidence display, and agent simulation speed.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

Every reconciliation row now renders a result — ✓ in accent for passes, the ⚠ variance/exception text in the deep step.

_[tool: ready_for_verification]_

Fixed — the reconciliation table's Result column now shows ✓ on all matched rows, with the ⚠ tolerance/exception notes preserved on Apex and Vertex.

## User

<pasted_text name="Pasted text (1002 lines)">
Take the **existing Invoice Processing Agent prototype you have already built** and enhance it substantially based on the requirements below.

IMPORTANT: **Do NOT rebuild the application from scratch.**
Retain the existing architecture, screens, workflows, demo invoices, data and functionality wherever they are already working.

This is a **UI/UX enhancement + interaction refinement** of the existing prototype.

The goal is to make the prototype feel like a **premium, industry-grade KPMG enterprise AI product**, suitable for demonstration to a CFO, GCC Head, Global Process Owner, CIO or senior finance leadership.

---

# 1. MOST IMPORTANT — KPMG VISUAL IDENTITY

The current prototype needs to look much more clearly aligned to **KPMG**.

Use a strong KPMG-inspired visual language throughout the entire application.

### Color direction

Primary:

* KPMG blue / deep blue
* White
* Very light grey
* Dark charcoal / navy text

Use blue strategically for:

* Primary CTAs
* Navigation
* Active states
* Progress indicators
* AI-agent elements
* Selected fields
* Key dashboard metrics

Use status colors only where appropriate:

* Green = successful / validated
* Amber = attention required
* Red = exception / failure

Do NOT use random gradients or bright futuristic AI colors.

The product should look:

**Professional → Premium → Enterprise → Consulting-grade**

rather than:

**Generic SaaS → Startup → RPA tool → Consumer AI app**

---

# 2. GLOBAL UI QUALITY IMPROVEMENT

Improve the UI across ALL existing screens.

The current buttons are too small.

Make the primary actions visually strong and easy to click.

For example:

**Continue to Validation**

**Submit for Posting**

**Park Invoice**

**Request Clarification**

should be proper enterprise buttons with:

* sufficient height
* clear typography
* appropriate padding
* strong visual hierarchy
* hover state
* disabled state where appropriate

Do not make every button huge.

Use:

* Primary button
* Secondary button
* Tertiary/text action

with clear hierarchy.

Spacing between sections should also be improved.

The overall application should have more breathing room.

---

# 3. ENTERPRISE CONNECTOR — MAJOR UI FIX

The current Enterprise Connector interaction is not good enough.

Redesign it completely.

When the user clicks:

**Enterprise Connector**

open a professional modal / side panel titled:

### Enterprise Connections

Subtext:

**Connect the Invoice Processing Agent to enterprise systems and invoice intake channels.**

Create a clean list.

The order MUST be:

### 1. SAP S/4HANA

Enterprise Resource Planning

Status:
**Available**

### 2. Oracle ERP

Enterprise Resource Planning

Status:
**Available**

### 3. Coupa

Procurement Platform

Status:
**Available**

### 4. Ariba

Procurement Platform

Status:
**Available**

### 5. AP Shared Mailbox

Invoice Intake

Status:
**Connected**

---

# 4. CONNECTOR INTERACTION LOGIC

This is very important.

The connector state must actually change.

Initially, for example:

SAP S/4HANA → Available
Oracle ERP → Available
Coupa → Available
Ariba → Available
AP Shared Mailbox → Connected

If the user clicks:

**Oracle ERP → Connect**

change Oracle ERP to:

**Connected**

and automatically make any previously connected ERP connector show:

**Available**

There should NEVER be a state where SAP and Oracle both incorrectly show "Connected" unless the application intentionally supports multiple simultaneous connections.

For this prototype, use the simpler logic:

### One primary ERP connection at a time.

Therefore:

If Oracle ERP is connected:

SAP S/4HANA → Available
Oracle ERP → Connected
Coupa → Available
Ariba → Available
AP Shared Mailbox → Connected

If the user subsequently clicks SAP S/4HANA:

SAP S/4HANA → Connected
Oracle ERP → Available

The selected connector should have:

* clear selected state
* connected badge
* subtle checkmark
* professional status treatment

Avoid duplicate SAP S/4HANA entries.

There should be exactly ONE SAP S/4HANA option.

---

# 5. CONNECTOR CONFIRMATION

When a connector is selected, briefly show:

**Connecting to Oracle ERP…**

Then:

**Oracle ERP connected successfully**

Include:

**Connection established**
**Last synchronized: Just now**

This can be simulated.

No real API integration is required.

---

# 6. AP INBOX — RETAIN AND IMPROVE

The AP Inbox is good conceptually.

Retain:

**Reading shared inbox**
**3 invoices today**

but make the experience more polished.

For example:

### AP Inbox

**Shared mailbox monitored**

● Agent active

**3 new invoices today**

Then show the invoice list.

When the user selects the **Apex Industrial Supplies** invoice, open the invoice-processing journey for that invoice.

This should feel like:

**The agent has picked up an invoice from the shared AP inbox and is now processing it.**

---

# 7. CRITICAL UX — SOURCE DOCUMENT ↔ AI EXTRACTED DATA

This is one of the MOST IMPORTANT enhancements.

The invoice extraction screen must create a **bi-directional relationship between the source invoice and the extracted data**.

The user should be able to understand:

&gt; “Where exactly did the AI get this value from?”

and:

&gt; “What information from the invoice has been captured into this field?”

---

# 8. WHEN USER CLICKS AN EXTRACTED FIELD

Example:

Right-side panel:

### Vendor Name

**Apex Industrial Supplies**

**99.8% confidence**

When the user clicks or hovers over the Vendor Name field:

1. Highlight the corresponding Vendor Name on the invoice preview.
2. Draw a clear **red outline / red bounding box** around the exact source location.
3. Slightly emphasize the selected field on the right.
4. If useful, show a tiny label:

**Source: Page 1**

The red box should be precise and visually obvious.

Example:

RIGHT:
Vendor Name
Apex Industrial Supplies
99.8%

LEFT:
A red bounding box appears exactly around:

**Apex Industrial Supplies**

---

# 9. BI-DIRECTIONAL HOVER BEHAVIOR

The interaction must work BOTH ways.

### Direction 1

**Extracted Data → Invoice**

Hover / click:

Vendor Name

↓

Invoice source area gets a red bounding box.

---

### Direction 2

**Invoice → Extracted Data**

Hover / click:

Vendor Name on the invoice

↓

The corresponding field on the right becomes highlighted.

Example:

Invoice:
**Invoice No: INV-45892**

Hover over the invoice number.

Right panel:

**Invoice Number**
INV-45892
99.9%

becomes highlighted.

This should work for at least these fields:

* Vendor Name
* Vendor ID
* Invoice Number
* Invoice Date
* PO Number
* Currency
* Payment Terms
* Billing Entity
* Subtotal
* Tax
* Total Amount

Also make it work for several line-item values where practical.

---

# 10. SOURCE HIGHLIGHT DESIGN

Use:

**Red outline / bounding box**

for the source document.

Do NOT cover the actual invoice text with an opaque red rectangle.

The user must still be able to read the invoice.

Use:

* red border
* subtle translucent highlight
* small source label if appropriate

Example:

**AI extracted: Vendor Name**

The visual should resemble intelligent document understanding / document intelligence.

This is a key differentiator of the prototype.

---

# 11. MULTI-PAGE INVOICE

For the Apex invoice, retain the multi-page concept.

Show:

**Page 1 of 3**

with page thumbnails.

If a selected field is on Page 2 or Page 3, automatically navigate to that page when the user selects the field.

For example:

User clicks:

**Tax Amount**

↓

Invoice viewer automatically switches to:

**Page 2**

↓

Red bounding box appears around the tax amount.

This will make the experience feel substantially more intelligent.

---

# 12. EXTRACTION PANEL DESIGN

Improve the right-side extraction panel.

Each field should look like a professional enterprise form field.

Example:

### Vendor Name

[Apex Industrial Supplies]

**99.8% confidence**

### Invoice Number

[INV-45892]

**99.9% confidence**

### PO Number

[4500127845]

**99.5% confidence**

The fields must remain editable.

When a user edits a field, show:

**User corrected**

rather than silently changing the value.

---

# 13. AI EXTRACTION SUMMARY

Retain the AI summary but improve the presentation.

Create a compact section:

### Agent Summary

**Document understood successfully**

Then show:

✓ Vendor identified
✓ Invoice structure interpreted
✓ 12 fields extracted
✓ 8 line items identified
✓ PO number detected
✓ Duplicate check initiated

Then:

**Overall extraction confidence**

### 99.4%

Use a professional confidence indicator.

---

# 14. THREE-WAY MATCH — SUCCESS SCENARIO

Retain the existing successful 3-way match.

Show clearly:

### 3-Way Match

**Invoice ↔ Purchase Order ↔ Goods Receipt**

Status:

### ✓ MATCH PASSED

Show:

Invoice | PO | Goods Receipt

with the key values.

Then:

### Validation Summary

&gt; Invoice data successfully reconciled against the purchase order and goods receipt. No material discrepancies identified. The invoice is eligible for posting.

Include:

**Agent recommendation: Proceed to submission**

---

# 15. THREE-WAY MATCH — FAILURE SCENARIO

This is REQUIRED.

The prototype must have at least TWO validation scenarios:

### Scenario A

**3-Way Match Passed**

### Scenario B

**3-Way Match Failed**

Use the **Apex Industrial Supplies** or another appropriate demo invoice for the failed scenario.

Example:

### ⚠ 3-Way Match Failed

Reason:

**Quantity discrepancy detected**

Invoice quantity:
**120**

PO quantity:
**100**

Goods Receipt:
**100**

Difference:
**+20 units**

Show the discrepancy clearly.

Then show:

### Agent Assessment

&gt; “The invoice quantity exceeds both the purchase order and goods receipt quantity by 20 units. The invoice should not be posted automatically.”

Then:

### Recommended Action

**Request Clarification**

or

**Park Invoice**

This demonstrates that the agent is not blindly processing invoices.

---

# 16. VALIDATION SUMMARY — AGENT REASONING

For the failed scenario, show a slightly richer AI explanation:

### AI Validation Summary

**Exception detected**

The agent identified a quantity mismatch between the invoice, purchase order and goods receipt.

**Risk level: Medium**

**Recommended action: Park invoice pending business confirmation.**

This is important.

The system should demonstrate:

**Detect → Understand → Explain → Recommend**

rather than simply showing:

**Error**

---

# 17. DECISION &amp; SUBMISSION SCREEN

Improve the existing Decision / Submission screen.

Header:

### Agent Decision

Show:

**Invoice ready for processing**

or:

**Action required**

depending on scenario.

Show a summary:

Vendor
Invoice Number
PO Number
Amount
Match Status
AI Confidence
Exception Status

Then create three strong actions:

### Submit for Posting

### Park Invoice

### Request Clarification

These should be large, polished enterprise CTAs.

---

# 18. ADD AN AI CHAT / COPILOT WINDOW

This is another IMPORTANT enhancement.

Add a compact AI conversational interface within the invoice workspace.

Do NOT create a completely separate screen.

Place it as a collapsible panel / bottom-right panel / workspace section.

Title:

### Ask Invoice Agent

Subtitle:

**Ask questions about this invoice or its validation.**

Include example prompts:

**“Why did this invoice fail validation?”**

**“Where did the PO number come from?”**

**“What is causing the mismatch?”**

**“Can this invoice be posted?”**

**“Summarize this invoice.”**

When clicked, return realistic chatbot responses.

Example:

User:
**Why did this invoice fail validation?**

Agent:

&gt; “The invoice quantity is 120 units, while the purchase order and goods receipt both show 100 units. I recommend parking the invoice until the additional 20 units are confirmed.”

Another:

User:
**Where did the PO number come from?**

Agent:

&gt; “PO number 4500127845 was extracted from the purchase order reference section on page 1 of the invoice with 99.5% confidence.”

Another:

User:
**Can this invoice be posted?**

Agent:

&gt; “Not yet. A quantity discrepancy has been identified during the 3-way match. Business confirmation is required before posting.”

The chatbot should understand the currently selected invoice.

---

# 19. MAKE THE CHAT FEEL AGENTIC

Do not make it look like a generic ChatGPT clone.

Use the branding:

### Invoice Processing Agent

When answering, optionally show:

**Agent reasoning**

**Source checked: Invoice + PO + Goods Receipt**

Then answer concisely.

For example:

**Agent checked 3 sources**

Invoice
Purchase Order
Goods Receipt

↓

**Finding**

20-unit quantity discrepancy.

↓

**Recommendation**

Park invoice.

This is a much stronger enterprise AI experience.

---

# 20. AGENT ACTIVITY

Retain the existing Agent Activity timeline.

Improve it visually.

Example:

### Agent Activity

✓ Invoice received
✓ Document classified
✓ Vendor identified
✓ Fields extracted
✓ PO identified
✓ Duplicate check completed
⚠ 3-way match exception detected
→ Recommended action: Park invoice

Use timestamps subtly.

This should make the user feel that the agent is performing actions autonomously.

---

# 21. AP INBOX STATUS

Ensure the inbox contains a realistic mixture of statuses.

Example:

**Processed**
**In Progress**
**Validation Required**
**Exception**
**Parked**
**Awaiting Approval**
**Submitted**
**Posted**

Make the statuses visually distinguishable.

The inbox should feel like a real operational queue rather than a static table.

---

# 22. DASHBOARD

Retain the executive dashboard.

Make it more visually polished.

Focus on:

### AI Extraction Accuracy

99.2%

### Straight-Through Processing

82%

### 3-Way Match Rate

91%

### Exception Rate

6.8%

### Average Processing Time

2.4 min

### Invoices Processed

1,248

Use charts sparingly.

The dashboard should answer:

**How well is the AI agent performing?**

**How much is it automating?**

**Where are the exceptions?**

**How accurate is it?**

---

# 23. VERY IMPORTANT — DON'T OVERBUILD

Do NOT add unnecessary screens.

Keep the existing overall journey:

**Invoice Intake**
→
**AI Extraction**
→
**Validation**
→
**Decision / Submission**
→
**AP Inbox**
→
**Executive Dashboard**

The chatbot should live inside the workspace.

The connector should live inside Invoice Intake.

The source-document interaction should live inside AI Extraction.

The exception logic should live inside Validation / Decision.

---

# 24. FINAL UX STORY

The final experience should tell this story naturally:

### 1. RECEIVE

The agent receives an invoice from upload, ERP connector or AP mailbox.

### 2. UNDERSTAND

The agent understands the invoice regardless of format.

### 3. EXTRACT

The agent extracts structured information and shows confidence.

### 4. TRACE

The user can immediately see exactly where each extracted value came from.

### 5. VALIDATE

The agent checks enterprise records and performs the 3-way match.

### 6. REASON

If something fails, the agent explains WHY.

### 7. RECOMMEND

The agent recommends the next action.

### 8. ACT

Submit, park or request clarification.

### 9. ASSIST

The user can ask the Invoice Agent questions at any point.

### 10. TRACK

Everything flows into the AP Inbox and executive dashboard.

This is the core **AI-agent story**.

---

# 25. QUALITY CHECK BEFORE FINISHING

Before considering the prototype complete, test the following interactions:

### Connector

* SAP S/4HANA appears exactly once.
* Oracle ERP appears exactly once.
* Only the selected ERP is shown as Connected.
* Switching ERP updates the connected state correctly.

### Invoice extraction

* Clicking Vendor Name highlights Vendor Name on invoice.
* Clicking Invoice Number highlights Invoice Number.
* Clicking PO Number highlights PO Number.
* Hovering/clicking source invoice field highlights the corresponding extracted field.
* Multi-page navigation works.

### Validation

* At least one invoice passes 3-way match.
* At least one invoice fails 3-way match.
* Failure reason is clearly visible.
* AI recommendation changes based on the scenario.

### Decision

* Submit works.
* Park works.
* Request Clarification works.

### AI Chat

* User can ask questions.
* Answers reference the current invoice.
* Answers explain the reasoning / source where appropriate.

### Visual

* KPMG-inspired colors are consistently applied.
* Buttons are appropriately sized.
* Typography is professional.
* No duplicated connector entries.
* No broken states.
* No placeholder text.
* No awkward empty space.
* No excessive gradients.
* No unnecessary screens.

---

# FINAL DESIGN PRINCIPLE

The prototype should not simply communicate:

**“We automated invoice processing.”**

It should communicate:

&gt; **“An AI agent understands the invoice, validates it against enterprise context, reasons about discrepancies, explains its findings, recommends what should happen next, and takes action — with humans remaining in control of exceptions.”**

That distinction is critical.

Make the final prototype **consulting-grade, KPMG-aligned, polished, interactive and presentation-ready.**

</pasted_text>

## Assistant

_[tool: copy_files]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Enhanced in place (previous version kept as *Invoice Processing Agent v1*):

- **KPMG-blue identity** across nav, CTAs, progress and metrics; green/amber/red reserved for validated / attention / exception. Larger enterprise buttons, more breathing room, white cards on light grey.
- **Enterprise Connections** rebuilt as a side panel: SAP S/4HANA, Oracle ERP, Coupa, Ariba, AP Shared Mailbox — one entry each, one primary ERP at a time (connecting SAP flips Oracle back to Available), with "Connecting…" → "connected successfully · Last synchronized: Just now".
- **AP shared mailbox intake**: agent active, 3 new invoices today — clicking Apex opens its journey.
- **Bi-directional tracing**: click/hover any extracted field to draw a red bounding box on the source value (and auto-jump to page 2/3 on Apex totals); hover the invoice to highlight the matching field. Works on 12 header fields plus every line item.
- **Two validation scenarios**: Bharat passes; Apex now *fails* on a 120 vs 100/100 quantity discrepancy with figures, risk level and agent assessment; Vertex remains the non-PO exception.
- **Ask Invoice Agent** copilot docked in the workspace — suggested prompts and free text, answers cite sources checked, finding and recommendation for the selected invoice.
- Agent Activity now marks ✓ / ⚠ / → steps; inbox statuses are colour-coded pills.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Both fixed: the copilot panel is hidden on the Audit Trail screen so the confirmation card and its CTAs are clear, and the park dialog now seeds the reason from the agent's own finding (Quantity discrepancy for Apex, Missing PO for the non-PO exception).

_[tool: ready_for_verification]_

Done — both defects addressed.

## User

Need this type of theme and color and look-feel quality or even better.. lets modify and make it Industry and WOW grade..

## Assistant

Enhancing in place — Industry grammar, richer chrome, charts and icons.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Lifted to the reference's polish, in Industry's own grammar (square blueprint frames + registration marks, Barlow Condensed, hairline rules — no soft rounded SaaS cards):

- **Blueprint grid ground** behind the workspace, white cards floating on it.
- **Thin-stroke Lucide icons** in nav, intake channel cards and every KPI tile (icon chip in an accent-tinted square).
- **AI Processing Pipeline** card on extraction: ten stages as tick chips that fill live, with a large completion % and the compliance footnote — replaces the thin progress banner.
- **Dashboard charts**: donut for processing outcome with 82% touchless in the hub, exception-breakdown column chart, and an immutable Audit Trail log.
- Status colour discipline unchanged: steel-blue for agent/chrome, green/amber/red only for validated / attention / exception.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Audit Trail rows now use flexible tracks with wrapping cells — the horizontal overflow is gone and the dashboard reflows below ~1100px.

## User

+ in addition to this I need a full screen occupied view.. now in 1st invoicing screen, lot of area in down looks blank.. not utilised.. make a smart view and attarctive one.

## Assistant

_[tool: dc_html_str_replace]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

The intake screen now fills the viewport with working content instead of empty space:

- **Four-tile stat strip** — received today, touchless, awaiting business action, avg. time to decision.
- **Intake by Channel (today)** — mailbox / connector / manual upload volumes, with the connector line reflecting whether an ERP is actually connected.
- **Agent Capability** — the eight things the agent handles unattended, each with its accuracy or basis.
- **Live Agent Feed** — timestamped ✓ / ⚠ / → events, matching the Agent Activity vocabulary used later in the flow.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

All intake grids now use `auto-fit` tracks — the two-column split, channel cards, stat strip and bottom band collapse to fewer columns instead of squeezing, so text stays readable well under 1000px while still filling a 1440px desktop.

## User

Can you make the color theme better.. too much white screen.. make KPMG blue + good light background color.. + boxes should have curve corners + better font size and font selection

## Assistant

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Theme reworked:

- **Ground** is now a soft blue-grey (#eaeef5) with faint blue light-washes, so white cards, the sidebar and the header read as raised surfaces instead of one flat white field.
- **KPMG blue** stays the single accent (nav, CTAs, progress, KPIs, chips), with the neutral ramp re-tinted cool navy rather than grey.
- **Rounded corners** throughout — 14px cards, 10px tiles and chips, 8px buttons and inputs; registration marks retired since they read as square-corner hardware.
- **Type**: Archivo for headings (600 weight, tighter uppercase) over IBM Plex Sans body at 14px/1.5, with uppercase small-caps labels for table headers and field labels.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed all four: Audit Trail rows are now a wrapping flex row (event text keeps a 160px floor, no per-character breaking), pipeline stage chips use `auto-fit` at 190px with wrapping labels instead of ellipsis, and both KPI strips reflow on the same 190px track.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

The stage stepper is now an `auto-fit` grid of separate rounded cells (190px floor) with wrapping labels — no more clipped "AI EXT…" text; the active step stays solid KPMG blue, completed steps tinted, upcoming ones white.

## User

in AI extraction screen : total can not be 110% it should be 100% right ?

## Assistant

_[tool: dc_js_str_replace]_

Right — the pipeline percentage is now clamped and lands on exactly 100% when processing completes.

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Indian GST Invoice Processing System"
What `list_files` on the project root returns right now (dotfiles, if any, are not shown here):
📁 _ds
📁 uploads
📄 Invoice Processing Agent v1.dc.html
📄 Invoice Processing Agent.dc.html
📄 support.js
User is viewing file: Invoice Processing Agent.dc.html
Current date is now September 18, 2026
</system-info>

<pasted_text name="Pasted text (1293 lines)">
MASTER TOP-UP PROMPT
EVOLUTION OF EXISTING GST INVOICE PROCESSING APPLICATION INTO
A HOMOGENEOUS P2P FINANCE COMMAND CENTER

IMPORTANT:
This is an enhancement of an existing, successful cloud-based Indian GST Invoice Processing application.

DO NOT rebuild the existing invoice-processing capability from scratch.
DO NOT replace the existing invoice intake, OCR, extraction, GST validation, invoice processing, or existing user experience unless explicitly required below.

The objective is to extend the existing application into a single, homogeneous P2P Finance Command Center that brings together:
1. Existing Invoice Processing / GST Intelligence capabilities
2. Zoho-based upstream and workflow capabilities
3. ERP / financial-system data
4. Bank/payment information
5. Reconciliation and P2P intelligence

The end user must experience this as ONE P2P PLATFORM.

The user should NOT feel that they are moving between a "Zoho application" and an "Invoice Processing application."

Finance Command Center is the primary user-facing platform and master visibility/intelligence layer.
Zoho is an external operational/workflow platform that will provide selected P2P capabilities and integrations.
ERP remains the financial system of record.
Bank remains the payment execution system.

========================================================
1. CORE PRODUCT VISION
========================================================

Create a unified:

"FINANCE COMMAND CENTER — P2P"

The platform should provide an end-to-end P2P journey covering:

Invoice Intake
→ Procurement / PR / PO
→ Goods / Service Receipt
→ Invoice Intelligence
→ PO / GRN / Invoice Matching
→ Verification
→ Approval
→ AP Processing
→ Settlement
→ Payment
→ Reconciliation
→ P2P Intelligence

The most important design principle is:

ONE PLATFORM EXPERIENCE,
MULTIPLE UNDERLYING SYSTEMS.

The Finance Command Center should orchestrate, consolidate, visualize and intelligently interpret data coming from Zoho, ERP, bank and the existing invoice-processing engine.

========================================================
2. PRIMARY LEFT-HAND NAVIGATION
========================================================

Create approximately 7 logical P2P areas in the left navigation.

Do NOT expose the underlying applications as the primary navigation.

Do NOT create navigation such as:
"Zoho"
"Invoice Engine"
"ERP"

Instead, organize the product around the BUSINESS PROCESS.

Recommended navigation:

1. Invoice Intake &amp; Intelligence
2. Requisition &amp; Procurement
3. Goods / Service Receipt
4. Match, Verify &amp; Approve
5. AP Processing &amp; Settlement
6. Payment &amp; Treasury
7. Reconciliation &amp; P2P Insights

Also include:

HOME / COMMAND CENTER

The order is intentionally designed so that the user can start with an invoice and then trace backwards/upstream into the procurement transaction.

========================================================
3. IMPORTANT USER JOURNEY PRINCIPLE
========================================================

The system should support an INVOICE-FIRST investigation and processing journey.

Example:

A user receives an invoice.

The user goes to:

"Invoice Intake &amp; Intelligence"

Uploads the invoice.

The existing OCR / extraction capability processes it.

Once the invoice is extracted, the Finance Command Center should automatically use available information such as:

Vendor
Vendor GSTIN
Invoice Number
Invoice Date
PO Number
PO Line
Amount
Item / Service
Quantity
etc.

to retrieve the relevant upstream transaction information from Zoho / ERP.

The system should then allow the user to navigate:

INVOICE
→ PR / Requirement (where applicable)
→ PO
→ GRN / Service Receipt
→ 3-Way Match
→ Verification
→ Approval
→ AP Processing
→ Settlement
→ Payment
→ Reconciliation

IMPORTANT:

PR does not have to be a mandatory step for every invoice.

For a normal PO-based invoice:

Invoice → PO → GRN → Match

may be the primary journey.

The PR should be available as an upstream drill-back from the PO wherever applicable:

PO → View originating PR

This prevents the system from forcing unnecessary steps into every invoice transaction.

========================================================
4. SYSTEM OWNERSHIP PRINCIPLE
========================================================

Every functional area must have a clear system owner.

FINANCE COMMAND CENTER / OUR PLATFORM:

Owns:
- User experience
- Unified transaction view
- Invoice intelligence
- OCR / extraction
- AI reasoning
- Data consolidation
- Transaction intelligence
- Matching intelligence
- Exception intelligence
- Cross-system orchestration
- Dashboards
- Alerts
- Analytics
- Audit visibility
- Reconciliation intelligence
- End-to-end P2P visibility

ZOHO:

Used as the external operational/workflow platform for selected capabilities such as:
- PR creation
- PR workflow
- PO creation
- PO workflow
- PO approval
- GRN / receipt workflow where applicable
- Business workflow
- DOA approval workflow
- Query / case workflow
- Payment approval workflow where configured

ERP:

- Financial system of record
- Accounting postings
- Expense JV
- Payment JV
- Financial master data where applicable

BANK:

- Payment execution
- H2H processing
- UTR / payment confirmation

The Finance Command Center should integrate with these systems and present the user with a single experience.

========================================================
5. HOME / COMMAND CENTER
========================================================

Create a high-level P2P Command Center dashboard.

The dashboard must be persistent and available regardless of which P2P area the user is working in.

It should provide:

- Total invoices
- Invoices received today / this week / month
- Pending invoices
- Invoices awaiting verification
- Invoices awaiting approval
- Match exceptions
- Query ageing
- AP processing ageing
- Payment pipeline
- Payments awaiting approval
- Payments processed
- Reconciliation status
- SLA breaches
- Exception trends
- GST / compliance exceptions
- Duplicate invoice alerts
- High-value invoice alerts
- AI-generated insights
- Critical action items

Allow role-based views later for:

CFO
Controller
AP Lead
Finance Manager
AP Processor
Procurement User
PO Creator
Business Approver

The Command Center should not simply be a dashboard.

It should act as the "control tower" for the entire P2P process.

========================================================
6. AREA 1 — INVOICE INTAKE &amp; INTELLIGENCE
========================================================

This area should preserve and extend the existing successful GST Invoice Processing capability.

INPUT CHANNELS:

- Vendor Portal
- User Upload / Internal Portal
- Email / Invoice Inbox
- Future API / EDI / other channels

Primary process:

Invoice received
→ OCR
→ AI extraction
→ Invoice classification
→ Data normalization
→ GST / tax information extraction
→ Duplicate detection
→ Mandatory-field validation
→ Confidence scoring
→ Invoice record creation

The existing invoice-processing engine remains the primary intelligence capability here.

The screen should show:

Invoice document preview
+
Extracted invoice header
+
Extracted line-item data
+
GST information
+
Vendor information
+
PO reference if available
+
Extraction confidence
+
Validation status

Do not remove the existing capabilities.

Extend them into the broader P2P journey.

========================================================
7. AREA 2 — REQUISITION &amp; PROCUREMENT
========================================================

This area represents the upstream procurement process.

Underlying system:

ZOHO

Capabilities:

- PR creation
- PR submission
- PR approval
- PR status
- PO creation
- PO approval
- PO amendments
- Supplier information
- PO status
- Open PO
- Closed PO
- PO ageing

The Finance Command Center should present this information in a native-looking Command Center page.

Do NOT make it look like an embedded external Zoho screen.

The user should feel that they are still inside Finance Command Center.

Where the data is actually executed in Zoho, clearly maintain the integration underneath the interface.

Allow:

"View in source system"

only where appropriate.

========================================================
8. AREA 3 — GOODS / SERVICE RECEIPT
========================================================

Underlying operational system:

ZOHO / ERP depending on the final integration architecture.

Capabilities:

- Goods receipt
- GRN
- GRN number
- GRN date
- PO reference
- Received quantity
- Accepted quantity
- Pending quantity
- Service entry / service confirmation
- Partial receipt
- Receipt exceptions

The Finance Command Center should retrieve and display this information.

The user should be able to navigate:

PO
→ GRN
→ Invoice

and vice versa.

========================================================
9. AREA 4 — MATCH, VERIFY &amp; APPROVE
========================================================

THIS IS A CRITICAL DESIGN AREA.

Do NOT simply display:

"3-Way Match = PASS"

or:

"3-Way Match = FAILED"

without showing the underlying transaction evidence.

The new design must introduce a:

"TRANSACTION EVIDENCE &amp; RAW DATA LAYER"

BEFORE the actual 2-Way / 3-Way Match result.

========================================================
10. TRANSACTION EVIDENCE / RAW DATA STRIP
========================================================

Immediately before the matching visualization, display a compact, horizontally scrollable data strip containing the actual source-system and extracted values.

The user should see approximately 3–4 transaction rows initially, with many columns available horizontally.

The rows should represent:

PO
GRN
INVOICE

Potential columns:

PO Number
PO Line Number
PO Date
GRN Number
GRN Line
GRN Date
Invoice Number
Invoice Line
Invoice Date
Vendor
Vendor GSTIN
Item / Service
Description
Service Period
Ordered Quantity
Received Quantity
Accepted Quantity
Invoice Quantity
PO Rate
Invoice Rate
PO Amount
GRN Amount
Invoice Amount
Taxable Value
CGST
SGST
IGST
GST Rate
TDS
Cost Center
GL Account
Business Unit
Currency
Payment Terms
etc.

The exact fields should be configurable.

IMPORTANT:

This is not merely a report.

It is a TRANSACTION EVIDENCE VIEW.

The purpose is to let the user understand exactly what data was received from each source before the system makes a matching decision.

Include source indicators such as:

PO — Zoho / ERP
GRN — Zoho / ERP
Invoice — Finance Command Center / Invoice Engine

Allow horizontal scrolling to view additional columns.

Do not overcrowd the initial viewport.

Show the most important fields first.

========================================================
11. THREE-WAY MATCH SCREEN
========================================================

Below the raw-data strip, create the actual matching workspace.

Show three clearly identifiable transaction blocks:

PURCHASE ORDER
GOODS RECEIPT
INVOICE

Display the relevant line-level information.

Example:

PO:
PO Qty = 100
Rate = ₹1,000
Amount = ₹100,000

GRN:
Received Qty = 100
Accepted Qty = 100

Invoice:
Invoice Qty = 100
Rate = ₹1,000
Amount = ₹100,000

Then show:

3-WAY MATCH ENGINE

Checks should include, as applicable:

Vendor
PO
GRN
Quantity
Price / Rate
Amount
Tax
Item / Service
Service Period
Other configurable rules

Display the result at both:

HEADER LEVEL
and
LINE-ITEM LEVEL

Example:

Quantity        ✓
Price           ✓
Vendor          ✓
PO              ✓
GRN             ✓
GST             ✓

OVERALL MATCH:
MATCHED

But if a variance exists:

Quantity:
PO = 100
GRN = 100
Invoice = 105

show:

⚠ QUANTITY VARIANCE

Do not hide the underlying values.

========================================================
12. EDITABLE LINE-ITEM WORKSPACE
========================================================

The existing design already has an important editable transaction screen.

PRESERVE THIS CONCEPT.

After extraction and source-data retrieval, provide an editable line-item workspace where authorized users can review and correct permitted fields.

Fields may include:

- Quantity
- Rate
- Amount
- Cost Center
- GL
- Service Period
- Tax information
- PO reference
- GRN reference
- Other configurable coding fields

The interface should clearly distinguish:

1. AI-extracted value
2. Source-system value
3. Calculated value
4. User-adjusted value

Example:

Invoice Quantity
Original: 105
Corrected: 100

The system must maintain:

Original Value
→ User Change
→ New Value
→ User
→ Timestamp
→ Reason / Comment
→ Approval / authorization where required

Do not allow uncontrolled editing of authoritative source-system values.

Where a source-system value is authoritative, provide an appropriate exception / correction workflow instead of silently overwriting it.

After editing:

REVALIDATE
→ RE-RUN MATCH
→ UPDATE RESULT

The user should never have to manually restart the entire invoice process.

========================================================
13. EVIDENCE BEFORE DECISION PRINCIPLE
========================================================

Make this a core UX principle across the product:

"EVIDENCE BEFORE DECISION"

Before the system recommends:

MATCH
PASS
FAIL
APPROVE
REJECT
EXCEPTION

show the relevant underlying evidence.

For example:

Instead of:

"3-Way Match Failed"

show:

Invoice Qty: 105
PO Qty: 100
GRN Qty: 100

Variance: +5

Reason:
Invoice quantity exceeds received quantity.

Then allow the user to:

Review
Edit where authorized
Raise exception
Request clarification
Revalidate
Proceed

========================================================
14. APPROVAL WORKFLOW
========================================================

Once the transaction is validated / matched:

Route to the appropriate approval workflow.

Underlying workflow:

ZOHO

Capabilities:

- DOA-based routing
- Single-level approval
- Multi-level approval
- Approve
- Reject
- Return
- Delegation
- Escalation
- SLA tracking

Finance Command Center should show:

Who needs to act
Why they need to act
Transaction amount
Match status
Exceptions
Compliance status
Previous approvals
Audit trail

The user should not have to leave Finance Command Center to understand the transaction.

========================================================
15. AP PROCESSING &amp; SETTLEMENT
========================================================

This area should continue using the existing invoice-processing intelligence.

Capabilities:

- TDS adjustment
- Advance adjustment
- Credit note adjustment
- Accounting coding
- Cost center
- GL
- Tax treatment
- Accounting entry
- Settlement readiness
- Expense JV
- ERP posting

The Finance Command Center should provide the primary processing workspace.

Where an operational workflow is executed by Zoho, integrate it rather than duplicating it.

========================================================
16. QUERY &amp; EXCEPTION MANAGEMENT
========================================================

Provide a unified exception workspace.

Examples:

- PO mismatch
- GRN mismatch
- Quantity variance
- Price variance
- GST mismatch
- Duplicate invoice
- Missing PO
- Missing GRN
- Incorrect cost center
- Incorrect GL
- Approval delay
- Vendor query
- Business-user query

Underlying workflow/case management may use:

ZOHO

But the Finance Command Center should show the consolidated exception view.

Each exception should contain:

Issue
Transaction
Source
Reason
Impact
Owner
Age
SLA
Recommended action
Status
Resolution
Audit trail

========================================================
17. PAYMENT &amp; TREASURY
========================================================

Provide:

Payment proposal
→ Payment review
→ Finance approval
→ Bank transmission
→ H2H
→ UTR
→ Payment confirmation

Zoho may execute the relevant workflow.

Bank executes the actual payment.

Finance Command Center consolidates:

Payment amount
Vendor
Invoice
Due date
Payment status
Approval status
Bank status
UTR
Payment exceptions

========================================================
18. RECONCILIATION &amp; P2P INSIGHTS
========================================================

Final area:

Reconciliation
→ Closure
→ Intelligence

Capabilities:

- Invoice vs payment reconciliation
- AP vs GL reconciliation
- Payment reconciliation
- Open-item analysis
- Unreconciled transactions
- GST reconciliation
- Supplier exceptions
- Period close
- Payment ageing
- Working-capital insights
- SLA analysis
- P2P performance
- AI insights

The Command Center should provide the end-to-end audit trail from:

Invoice
→ PO
→ GRN
→ Match
→ Approval
→ Processing
→ Settlement
→ Payment
→ UTR
→ Reconciliation

========================================================
19. AGENTIC AI LAYER
========================================================

Do not turn the product into a collection of disconnected chatbots.

Agents should operate behind the P2P process and assist the user at the appropriate step.

Examples:

INVOICE INTAKE AGENT
- Receives invoice
- Classifies invoice
- Determines invoice type
- Initiates processing

EXTRACTION AGENT
- Extracts header and line-item data
- Provides confidence
- Identifies missing / ambiguous values

VALIDATION AGENT
- Validates invoice information
- Checks configured business rules
- Identifies anomalies

MATCHING AGENT
- Retrieves PO / GRN data
- Performs 2-way / 3-way matching
- Explains variances

COMPLIANCE AGENT
- Performs GST / tax / compliance checks
- Flags exceptions

APPROVAL AGENT
- Determines applicable DOA workflow
- Tracks approval status
- Escalates delays

AP PROCESSING AGENT
- Assists with TDS
- Advance adjustment
- Credit note
- Coding
- Accounting logic

EXCEPTION AGENT
- Identifies root cause
- Suggests next action
- Routes issue to appropriate owner

PAYMENT AGENT
- Assists payment readiness
- Checks payment exceptions
- Tracks payment status

RECONCILIATION AGENT
- Identifies unmatched transactions
- Supports reconciliation
- Explains differences

P2P COPILOT
- Answers questions across the entire P2P dataset
- Retrieves transaction details
- Explains why a transaction is blocked
- Provides status
- Provides audit evidence
- Provides actionable recommendations

IMPORTANT:

The agents should not be presented as decorative chatbot cards.

They should be embedded into the actual workflow.

========================================================
20. CROSS-SYSTEM ORCHESTRATION
========================================================

Create a logical architecture where:

FINANCE COMMAND CENTER
is the primary orchestration and intelligence layer.

ZOHO
is the external operational workflow layer.

ERP
is the financial system of record.

BANK
is the payment execution layer.

The logical data flow should be:

INPUT CHANNELS
↓
FINANCE COMMAND CENTER
↓
OCR / EXTRACTION / INTELLIGENCE
↓
ZOHO / ERP DATA RETRIEVAL
↓
RAW TRANSACTION EVIDENCE
↓
MATCHING
↓
VERIFICATION
↓
APPROVAL
↓
AP PROCESSING
↓
ERP
↓
PAYMENT WORKFLOW
↓
BANK
↓
UTR
↓
RECONCILIATION
↓
FINANCE COMMAND CENTER

The Command Center continuously receives transaction status and intelligence from the underlying systems.

========================================================
21. HOMOGENEOUS UX REQUIREMENT
========================================================

This is extremely important.

Do not visually distinguish the Zoho pages as "Zoho pages."

Do not create an obvious separate Zoho application experience.

All screens must use the same:

- Design language
- Navigation
- Header
- Typography
- Cards
- Tables
- Status indicators
- Action buttons
- Filters
- Search
- Breadcrumbs
- Transaction IDs
- Audit trail
- AI assistant
- User experience

The underlying application ownership should be architectural, not visually disruptive.

The Command Center should feel like one enterprise P2P platform.

========================================================
22. TRANSACTION 360 VIEW
========================================================

Every invoice should have a Transaction 360 view.

Example:

TRANSACTION 360

Invoice
↓
Vendor
↓
PR
↓
PO
↓
GRN
↓
Invoice Lines
↓
3-Way Match
↓
Exceptions
↓
Approvals
↓
Accounting
↓
Settlement
↓
Payment
↓
UTR
↓
Reconciliation

Provide a persistent transaction identifier.

Users should be able to navigate upstream and downstream.

Example:

Invoice → View PO
Invoice → View GRN
Invoice → View PR
Invoice → View Approval
Invoice → View Payment
Invoice → View Reconciliation

========================================================
23. SCREEN JOURNEY
========================================================

Keep the application focused.

Do not create dozens of unnecessary screens.

The core user journey should be approximately:

SCREEN 1
P2P COMMAND CENTER

SCREEN 2
INVOICE INTAKE &amp; OCR

SCREEN 3
INVOICE / LINE-ITEM EXTRACTION REVIEW

SCREEN 4
SOURCE TRANSACTION DATA
PO + GRN + INVOICE

SCREEN 5
THREE-WAY MATCH + VARIANCE ANALYSIS

SCREEN 6
EDIT / CORRECT / REVALIDATE

SCREEN 7
VERIFICATION + APPROVAL

SCREEN 8
AP PROCESSING + SETTLEMENT

SCREEN 9
PAYMENT + UTR

SCREEN 10
RECONCILIATION / TRANSACTION 360

Other P2P capabilities such as PR and PO should be available through the left navigation and transaction drill-down rather than unnecessarily interrupting the invoice journey.

========================================================
24. INITIAL SCREEN / LANDING EXPERIENCE
========================================================

The first screen should communicate:

"ONE P2P COMMAND CENTER"

Show the major P2P areas:

Invoice Intake &amp; Intelligence
Requisition &amp; Procurement
Goods / Service Receipt
Match, Verify &amp; Approve
AP Processing &amp; Settlement
Payment &amp; Treasury
Reconciliation &amp; Insights

The user should immediately understand:

WHERE THEY ARE
WHAT NEEDS ATTENTION
WHAT TRANSACTIONS ARE IN PROGRESS
WHAT EXCEPTIONS EXIST
WHAT ACTION THEY NEED TO TAKE

========================================================
25. DESIGN LANGUAGE
========================================================

Use a premium enterprise consulting / CFO-grade interface.

Style:

- Clean
- Modern
- Professional
- High information density but not cluttered
- Strong hierarchy
- Rounded cards
- Clear status indicators
- Excellent tables
- Minimal unnecessary decoration
- Consistent spacing
- Executive-quality dashboard
- Operationally useful detail

The product should look like a serious enterprise Finance platform, not a generic AI demo.

========================================================
26. IMPORTANT: DO NOT OVERBUILD
========================================================

Do not create unnecessary functionality merely to make the prototype look large.

Focus on demonstrating the core concept:

ONE P2P PLATFORM
+
EXISTING INVOICE INTELLIGENCE
+
ZOHO OPERATIONAL WORKFLOW
+
ERP / BANK INTEGRATION
+
AGENTIC INTELLIGENCE
+
TRANSACTION 360
+
EVIDENCE BEFORE DECISION

The most important demonstration should be the invoice journey.

========================================================
27. CRITICAL DEMO SCENARIO
========================================================

Create a realistic end-to-end demonstration using one invoice.

Example:

1. User uploads invoice.

2. OCR extracts invoice header and line-item data.

3. System identifies vendor and PO reference.

4. Finance Command Center retrieves PO information from Zoho / ERP.

5. Finance Command Center retrieves GRN information.

6. System displays the RAW TRANSACTION DATA strip.

7. User sees:
   PO
   GRN
   Invoice
   line-item information
   quantity
   amount
   GST
   cost center
   service period
   etc.

8. System displays the three-way match.

9. Suppose there is a mismatch.

Example:

PO Qty = 100
GRN Qty = 100
Invoice Qty = 105

10. System explains:

"Quantity variance of 5 units identified."

11. User opens the editable workspace.

12. Authorized user corrects the permitted value or initiates an exception workflow.

13. System records:
Original value
Changed value
User
Timestamp
Reason

14. User clicks:

"REVALIDATE"

15. Match engine runs again.

16. Match becomes successful.

17. Invoice moves to verification / DOA approval.

18. Approval is completed.

19. AP processing is completed.

20. Settlement / Expense JV is generated.

21. Payment approval is completed.

22. Payment is transmitted to bank.

23. UTR is received.

24. Invoice becomes PAID.

25. Payment JV is posted to ERP.

26. Reconciliation is completed.

27. Transaction 360 shows the entire journey.

This single scenario should demonstrate the value of the entire architecture.

========================================================
28. FINAL PRODUCT PRINCIPLE
========================================================

The final product should communicate this simple message:

"ZOHO EXECUTES.
FINANCE COMMAND CENTER ORCHESTRATES AND INTELLIGENTLY UNDERSTANDS.
ERP RECORDS.
BANK PAYS.
THE USER EXPERIENCES ONE P2P PLATFORM."

The Finance Command Center must remain the primary product identity.

Do not allow the solution to appear as a Zoho implementation with a dashboard added on top.

It should appear as:

A P2P Finance Command Center
that intelligently orchestrates multiple enterprise systems,
with the existing GST Invoice Processing capability as a core intelligence component
and Zoho as an integrated operational execution layer.

========================================================
29. FINAL BUILD INSTRUCTION
========================================================

Start from the EXISTING GST INVOICE PROCESSING APPLICATION.

Preserve its current invoice intake, OCR, extraction, GST processing, line-item and editable transaction capabilities.

Extend the application incrementally to introduce:

1. P2P navigation
2. Command Center dashboard
3. Zoho-connected PR / PO capability
4. Zoho-connected GRN capability
5. Invoice-first transaction journey
6. Source transaction data layer
7. PO / GRN / Invoice evidence view
8. Enhanced 2-way / 3-way match
9. Editable line-item review
10. Revalidation after correction
11. Verification and DOA workflow
12. AP processing and settlement
13. Payment workflow
14. Bank / UTR status
15. Reconciliation
16. Transaction 360
17. Embedded P2P agents
18. Cross-system intelligence and alerts

Prioritize the quality of the invoice-to-payment journey over breadth.

The final experience must be coherent, homogeneous, enterprise-grade and demonstrable as a single Finance Command Center P2P product.
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Industry (design system)">
[Design System] This project uses the **Industry** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

This project has the **Industry_indust** design system bound at `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/`. If anything under that path is missing or fails to load, the folder name may differ — `list_files` `_ds/` and use the folder whose name ends with 0942542c-810d-4c59-931a-3e245d9e23ae instead, including in the <link>/<script> paths below.

**Loading the bundle is how you use this design system.** Every Design Component you build must load `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js` in `<helmet>` (include it in child DCs too — de-duped by URL) and compose with its components — do not recreate those components from scratch or restyle raw HTML to look like them. At the top of the template:

```html
<helmet>
  <link rel="stylesheet" href="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/styles.css">
  <script src="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js"></script>
</helmet>
```

Then mount any component directly in the template — no logic class needed:

```html
<x-import component-from-global-scope="Industry_indust.Button" hint-size="auto,40px">Label</x-import>
```

Props are template attributes (kebab → camelCase); template children pass through as `props.children`. The linked stylesheet(s) carry the design tokens (colors, type, spacing) — style against those via `var(--*)` and the design system's classes rather than guessing values.

**Start from a template if one matches.** Before building from scratch, check whether a template below matches the user's request. Read the template (list its folder, `read_file` the entry) and decide: if it's close to what's asked, `copy_files` the folder as your starting point; if you'd rather re-author in DC, `dc_write` a new page using the template as your structural reference. When this design system is bound, `copy_files` repoints the copied `ds-base.js` automatically — only edit its base line yourself if the copy result says so, or when copying from an unbound project (change `'../..'` to your `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae` path). (Older templates have no `ds-base.js` and carry `../../…` bundle/stylesheet refs in their pages instead — repoint those by hand.)

- `Deck` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/deck/`) — A twenty-one-slide presentation starter: cover, contents, dividers, columns, quadrants, a data table, SVG charts and timeline, bleed imagery, a quote and a close, on the theme's tokens
- `Landing` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/landing/`) — A one-page product landing in the system's own voice — an invented product (Holdfast: a fastener catalog), a condensed hero, a numbered spec-sheet plate, wireframe cells and a duotone photograph

The full design-system source tree lives at `/projects/0942542c-810d-4c59-931a-3e245d9e23ae/` — use `list_files` / `read_file` from there for anything not under `_ds/` (layout varies by brand; don't assume folder names). Its guide is reproduced below so you don't need to fetch it:

<design-system-guide>
# Industry design system

Industry is a wireframe: steel-blue on a light technical ground, Barlow Condensed headings over Barlow, a modular grid, and cards, figures and buttons framed as blueprint objects — square-cornered, hairline-bordered, with "+" registration marks at the corners. Cards and figures stay transparent line drawings; the primary button is the one solid object on the board, an accent fill that keeps the square corners and the marks. Photography is duotoned into the steel accent and icons are thin-stroke.

## How to use this

- Link the one stylesheet from every page — `&lt;link rel="stylesheet" href="styles.css"&gt;` (adjust the relative path) — and take every color, font, spacing, radius and shadow from its variables (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Never hard-code a hex, a font name or a px value the tokens already carry.
- Build with the classes below rather than inventing parallel ones; the component pages are plain HTML, so view source and copy the markup.
- `templates/` holds starting points a consuming project can copy whole.
- The whole system was derived from `theme.json`. To change the look, edit the tokens at the top of `styles.css` — every page, the thumbnail and this guide read from them — and keep `theme.json` and the written guidance in step so they don't drift from what the CSS actually does.

## Direction

Modular grid layouts — content in equal-width cells, strong horizontal and vertical rhythm, visible structure. Cards, buttons and major sections are wireframe objects: square-cornered, thin-bordered, with `+` crosshair corner marks (the `.blueprint` class + four `&lt;i class="corner tl/tr/bl/br"&gt;` children) — never soft filled rounded blocks. Images and figures get the same treatment: square, hairline-framed and marked, never rounded or clipped. Wrap hero and inline images in the `.duotone` class — they are desaturated and washed in the accent, like a screen print that re-colors with the theme.

## Color

A light ground (`--color-bg` #f2f2f3) with `--color-text` #1d1f20 and a single accent #5980a6 (this is a mono scheme: no second accent was chosen — the `--color-accent-2-*` variables carry a machine-derived stand-in kept only so both sets resolve; treat them as one role). Each role carries a 100–900 tonal ramp (`--color-neutral-100` … `--color-accent-2-900`) generated in OKLCH on a shared perceptual lightness scale, so the same step of any ramp has the same visual weight. Use the light steps (100–300) for tinted fills, hovers and subtle borders, 500 as the role's base, and the dark steps (700–900) for text on tinted fills and for pressed states; prefer ramp steps over ad-hoc `color-mix()`. For elevation use `--shadow-sm/md/lg` (already tuned to the ground) rather than ad-hoc box-shadows.

## Type

Barlow Condensed for headings over Barlow for body text, loaded as `--font-heading` / `--font-body`. Density 0.85× and radius 4px are already baked into the `--space-*` / `--radius-*` scales — use the variables, not raw numbers.

## Icons

Use Lucide icons (https://lucide.dev), at stroke-width 1.5 for a lighter, more technical look throughout.

## Interaction states

Interactive states are themed, never browser defaults: give every interactive element a `:hover` tint and a pressed state from the accent ramp (one step past the base — `--color-accent-600` on a light ground, `--color-accent-400` on a dark one, or a `color-mix()` tint for outlined/ghost variants), and style keyboard focus with `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — never leave the default blue focus ring.

## Components

| Class | What it is | Shown in |
| --- | --- | --- |
| `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block` | Actions — the primary is a solid accent fill | components/buttons.html |
| `.tag` with `.tag-accent`, `.tag-accent-2`, `.tag-neutral`, `.tag-outline` | Small labels tinted from the ramps (mono palette: accent-2 reads the same as accent) | components/buttons.html |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | Form fields and choices on native elements — no script | components/forms.html |
| `.card` with `.card-kicker`, `.card-title`, `.card-body`, `.card-meta`; `.elev-sm/md/lg` | Transparent, hairline-bordered cards with corner registration marks | components/cards.html |
| `.nav` + `.nav-brand` | The header bar | components/navigation.html |
| `.table` | Data tables with themed header and row rules | components/table.html |
| `.dialog-backdrop` + `.dialog` (+ `.dialog-title/-body/-actions`) | A modal at the top elevation | components/dialog.html |
| `.hr` | A horizontal rule — present, but this system prefers whitespace; avoid it | — |
| `.blueprint` + four `&lt;i class="corner tl/tr/bl/br"&gt;` children | The wireframe frame every card, figure and primary button wears | components/cards.html |
| `.duotone` | The image wrapper — every content photograph goes through it | foundations/image.html |

States are built in: hovers and pressed states come from the accent ramp, keyboard focus is the 2px accent `:focus-visible` ring, `::selection` is an accent tint, and disabled controls drop to 45% opacity. Don't restyle them per page. The accent-to-ground pair is tuned to at least 3:1 — enough for icons, large text and interface chrome, not for body copy — so for paragraph-size text in the accent use a deep ramp step (`--color-accent-700` on this ground) rather than the accent itself.

## Do

- Frame cards, figures and primary buttons as blueprint objects: the `.blueprint` class plus four `&lt;i class="corner …"&gt;` marks.
- Keep the grid visible — equal cells, strong horizontal and vertical rhythm.
- Condense headings (Barlow Condensed) and keep body copy in Barlow.
- Duotone photographs with the `.duotone` wrapper so they take the accent.

## Don't

- Do not round cards, figures or buttons, and do not give cards or figures a surface fill — they are line drawings (the solid accent primary button is the one deliberate exception).
- Do not drop the registration marks from a framed element.
- Do not use thick icon strokes; the set is Lucide at 1.5.
- Do not add decorative color beyond the steel accent. The accent's own deep step (`--color-accent-900`) may carry a full field where the deck's section dividers use it — steel as ground, type reversed to paper. (The landing's numbers sit on a drawn spec-sheet plate on the paper ground instead — its own grammar, not a field.)

## Files

- `styles.css` — the only stylesheet: the token sheet (`:root` variables, ramps, base type) plus the component layer. Link it from every page.
- `readme.md` — this guide.
- `theme.json` — the parameters these files were derived from (a machine-readable record of the theme).
- `thumbnail.html` — the project cover (brand mark + swatches).
- `foundations/type.html` — the type scale and the heading/body pairing at real sizes.
- `foundations/color.html` — color roles and the 100-900 tonal ramps, with usage notes.
- `foundations/layout.html` — the spacing scale, the grid and how edges are drawn.
- `foundations/icons.html` — the icon set at interface sizes, inline and in buttons.
- `foundations/image.html` — how photographs and figures are treated.
- `components/buttons.html` — buttons, icon buttons and tags in every variant and state.
- `components/forms.html` — text fields, radios and the segmented control on native elements.
- `components/cards.html` — content cards and the elevation steps.
- `components/navigation.html` — the header bar pattern.
- `components/table.html` — a data table with the themed header and row rules.
- `components/dialog.html` — a modal over its backdrop at the top elevation.
- `theme.html` — the theme's parameters rendered as a reference sheet.
- `templates/landing/` — a starter page consuming the system the intended way (`index.html`, its `ds-base.js` loader, and the vendored `image-slot.js` its photograph mounts).
- `assets/photo.jpg` — the reference photograph the imagery page treats.

</design-system-guide>
</attached-skill>

## Assistant

_[tool: copy_files]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: grep]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: ready_for_verification]_

Extended in place — the GST invoice engine is preserved intact and now sits inside a **Finance Command Center — P2P** (previous version saved as *Invoice Processing Agent v2*).

**Navigation** is now the business process, not the systems: Command Center · Invoice Intake & Intelligence · Requisition & Procurement · Goods/Service Receipt · Match, Verify & Approve · AP Processing & Settlement · Payment & Treasury · Reconciliation & P2P Insights.

**New in the invoice journey** (stepper now runs Intake → Extraction → Source Evidence → 3-Way Match → Verify & Approve → AP & Settlement → Payment → Reconciliation):
- **Source Transaction Evidence** — horizontally scrollable PO / GRN / Invoice strip with 22 columns (GSTIN, HSN, qty, rate, CGST/SGST/IGST, TDS, cost centre, GL, BU, terms) plus the system that owns each row, linkage confidence and the Matching Agent's pre-read. Evidence before decision.
- **Editable line-item workspace** — AI-extracted vs PO vs GRN vs calculated variance shown side by side, PO/GRN read-only, correction reason + comment captured, then **Apply & Revalidate** re-runs the match. Apex 120 → 100 flips the failed match to passed, recomputes taxable value and GST, and writes the change to the audit trail.
- **Verification & DOA approval** (Zoho route IN-AP-03) with who must act and why, then AP settlement, **payment run** (proposal → AP review → treasury release → HDFC H2H → UTR), and **Transaction 360** tracing PR → PO → GRN → invoice → match → approval → JV → UTR → reconciliation.
- **Command Center** landing: six control-tower KPIs, seven area tiles with live counts, SLA-ranked critical actions, full P2P pipeline funnel, and agent insights with system health chips.

Zoho-executed areas (PR/PO registers with PR drill-back, GRN/service-entry register) use the same chrome — no visual seam.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Nesting fixed — the seven new view sections now sit inside the main content column (the chat, detail, connector, park and edit-workspace overlays stay as root-level fixed siblings), so each view renders full-width beside the sidebar.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Both fixed: "Match, Verify & Approve" now lands on a match & approval work queue (four KPIs + three live transactions with verdict and next action; clicking one opens its source evidence), and the Processing Outcome donut row wraps with `min-width: 0` on the legend so Reconciliation no longer overflows horizontally.

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Gen 3 - Indian GST Invoice Processing System"
What `list_files` on the project root returns right now (dotfiles, if any, are not shown here):
📁 _ds
📁 uploads
📄 Invoice Processing Agent v1.dc.html
📄 Invoice Processing Agent v2.dc.html
📄 Invoice Processing Agent.dc.html
📄 support.js
User is viewing file: Invoice Processing Agent.dc.html
Current date is now September 18, 2026
</system-info>

<pasted_text name="Pasted text (1632 lines)">
MASTER TOP-UP PROMPT — V2

EVOLUTION OF EXISTING GST INVOICE PROCESSING APPLICATION INTO
A HOMOGENEOUS P2P FINANCE COMMAND CENTER

========================================================
0. IMPORTANT CONTEXT
========================================================

This is an enhancement of an existing, successful cloud-based
Indian GST Invoice Processing application.

DO NOT rebuild the existing invoice-processing capability from scratch.

DO NOT replace the existing:
- Invoice Intake
- OCR
- AI Extraction
- GST / tax processing
- Invoice validation
- Line-item extraction
- Editable invoice processing
- Existing invoice-processing workflows

Instead, EXTEND the existing application into a unified:

FINANCE COMMAND CENTER — P2P

The final product should combine:

1. Existing GST Invoice Processing / Invoice Intelligence
2. Zoho Books-based PR / PO / GRN and workflow capabilities
3. ERP / financial system integration
4. Payment / banking integration
5. Reconciliation
6. P2P intelligence
7. Role-based Command Center dashboards
8. Agentic AI embedded into the process

The user must experience this as ONE homogeneous P2P platform.

The user should NOT feel that they are switching between:
- Zoho
- Invoice Processing Application
- ERP
- Bank

The underlying systems can be different, but the USER EXPERIENCE must remain unified.

========================================================
1. CORE PRODUCT PRINCIPLE
========================================================

FINANCE COMMAND CENTER is the PRIMARY PLATFORM.

Zoho is an EXTERNAL CONNECTED OPERATIONAL PLATFORM.

ERP is the FINANCIAL SYSTEM OF RECORD.

Bank is the PAYMENT EXECUTION SYSTEM.

Therefore:

FINANCE COMMAND CENTER
= User Experience + Intelligence + Orchestration + Visibility +
  Transaction 360 + Dashboards + AI + Controls

ZOHO BOOKS / ZOHO
= PR / PO / GRN / selected workflow and operational execution

ERP
= Accounting / Financial System of Record

BANK
= Payment Execution + UTR / Confirmation

The Command Center must consolidate data from all of these systems.

========================================================
2. FOUR PRIMARY PERSONAS
========================================================

The Command Center must have FOUR primary personas.

Do not create excessive personas at this stage.

The four personas are:

1. CFO
2. AP LEAD
3. FINANCE CONTROLLER
4. FINANCE USER

The dashboard, metrics, actions, alerts and insights should change
depending on the selected persona.

Provide a persona selector in the Command Center.

Example:

[ CFO ] [ AP Lead ] [ Finance Controller ] [ Finance User ]

The same underlying P2P data should be available, but each persona
should see only the information most relevant to their role.

========================================================
3. PERSONA 1 — CFO COMMAND CENTER
========================================================

The CFO should NOT see operational transaction-level clutter by default.

The CFO view should focus on:

P2P HEALTH
- Total invoice value
- Total invoices
- Spend / AP value
- Outstanding liabilities
- Upcoming payments
- Payment pipeline
- Working capital impact

PERFORMANCE
- Invoice processing cycle time
- Approval cycle time
- Payment cycle time
- Touchless processing %
- Automation %
- Exception %
- SLA adherence
- Cost / transaction where available

RISK
- High-value invoices
- Duplicate invoice risk
- Compliance exceptions
- Payment risks
- Significant mismatches
- Overdue approvals
- Vendor risk indicators

LIQUIDITY / PAYMENT
- Payments due
- Payments pending approval
- Payments scheduled
- Cash requirement
- Upcoming payment exposure

AI INSIGHTS
- "What needs CFO attention?"
- Material exceptions
- Emerging trends
- Working-capital opportunities
- Significant process bottlenecks

CFO ACTIONS:
- View critical exceptions
- Drill into high-value invoices
- Review payment exposure
- Review P2P performance
- Ask Command Center AI questions

The CFO view should be highly summarized and strategic.

========================================================
4. PERSONA 2 — AP LEAD COMMAND CENTER
========================================================

The AP Lead needs operational control across the invoice-to-payment
pipeline.

Show:

INVOICE PIPELINE
- New invoices
- Processing
- Validation pending
- Match exceptions
- Verification pending
- Approval pending
- AP processing
- Settlement pending
- Payment pending

AGEING
- Invoice ageing
- Approval ageing
- Query ageing
- Exception ageing
- SLA breaches

TEAM PERFORMANCE
- Work queue by processor
- Pending workload
- Productivity
- Touchless processing
- Exception resolution

EXCEPTIONS
- PO mismatch
- GRN mismatch
- Quantity variance
- Price variance
- GST exception
- Duplicate invoice
- Missing PO
- Missing GRN
- Coding issue

PAYMENT
- Payment-ready invoices
- Payment approval pending
- Payment exceptions

AI INSIGHTS:
- Workload prioritization
- Bottleneck identification
- Exception root cause
- Suggested actions

AP Lead should be able to drill from dashboard
→ invoice
→ line item
→ match
→ exception
→ action.

========================================================
5. PERSONA 3 — FINANCE CONTROLLER
========================================================

The Finance Controller view should focus on:

CONTROL
- 2-way / 3-way match compliance
- Approval compliance
- DOA adherence
- Segregation of duties
- Duplicate detection
- Manual overrides
- Exception overrides
- Audit trail

ACCOUNTING
- Coding accuracy
- GL
- Cost center
- Tax treatment
- TDS
- Advance adjustments
- Credit notes
- Expense JV
- Payment JV

RECONCILIATION
- AP vs GL
- Invoice vs payment
- Payment vs bank
- Unreconciled transactions
- Open items

COMPLIANCE
- GST exceptions
- Tax inconsistencies
- Vendor GST information
- Invoice compliance
- Required documentation

CONTROL EXCEPTIONS
- Unauthorized edits
- Approval bypass
- Manual overrides
- Source-data variance
- Unresolved exceptions

The Finance Controller should have strong access to evidence,
audit trail and transaction history.

========================================================
6. PERSONA 4 — FINANCE USER
========================================================

Finance User is the operational user.

The experience should be task-oriented.

Show:

MY WORK
- Invoices assigned to me
- Approvals
- Queries
- Exceptions
- Corrections
- Pending actions

MY TRANSACTIONS
- Recent invoices
- Open invoices
- Processed invoices
- Payment status

MY ACTIONS
- Review invoice
- Correct permitted fields
- Resolve exception
- Submit
- Approve where authorized
- Revalidate
- View transaction history

The Finance User should be able to complete their daily work without
needing to navigate through multiple applications.

========================================================
7. COMMAND CENTER LANDING PAGE
========================================================

The Command Center should be the primary landing page.

Display:

FINANCE COMMAND CENTER

P2P Overview

Then show the four persona options:

CFO
AP LEAD
FINANCE CONTROLLER
FINANCE USER

The selected persona changes the dashboard content.

Below the persona-specific dashboard, provide a common P2P navigation:

1. Invoice Intake &amp; Intelligence
2. Requisition &amp; Procurement
3. Goods / Service Receipt
4. Match, Verify &amp; Approve
5. AP Processing &amp; Settlement
6. Payment &amp; Treasury
7. Reconciliation &amp; P2P Insights

========================================================
8. GLOBAL "ASK AGENT" EXPERIENCE
========================================================

IMPORTANT UI CHANGE:

REMOVE the static "Agent Summary" panel from the Invoice Intake
screen and from other functional screens.

DO NOT occupy valuable screen space with a permanent Agent Summary.

Instead, create a GLOBAL "ASK AGENT" experience.

The Ask Agent window must be MOVABLE / COLLAPSIBLE / REPOSITIONABLE.

The user must be able to:

- Drag it
- Minimize it
- Expand it
- Collapse it
- Move it away from important data
- Reopen it at any time

It should behave like a floating AI assistant.

Example:

                         ┌─────────────────────────────┐
                         │                             │
                         │      TRANSACTION DATA       │
                         │                             │
                         │                             │
                         │                             │
                         └─────────────────────────────┘

                    ┌──────────────────────────┐
                    │ ASK AGENT                │
                    │ "Why did this invoice    │
                    │  fail the match?"        │
                    └──────────────────────────┘

The user should be able to move the Ask Agent window
without blocking the underlying screen.

The AI assistant should understand the CURRENT TRANSACTION
and the CURRENT PAGE context.

Examples:

"Why did this fail?"

"Show me the PO."

"Show the GRN."

"What is the variance?"

"Why is this invoice blocked?"

"Who needs to approve this?"

"Show me the original invoice."

"Why did the system change this value?"

"What happens if I submit this?"

========================================================
9. ENTERPRISE CONNECT — ADD ZOHO CONNECTOR
========================================================

The existing Enterprise Connect / system integration area must
include a dedicated:

ZOHO / ZOHO BOOKS CONNECTOR

alongside existing enterprise systems such as:

SAP
Oracle
Coupa
Ariba
and other configured systems.

The user should see:

ENTERPRISE CONNECT

[ SAP ]
[ Oracle ]
[ Coupa ]
[ Ariba ]
[ Zoho Books ]

Add a dedicated Zoho Books connection tile.

When the user selects:

CONNECT ZOHO BOOKS

show a connection workflow.

Example:

CONNECT TO ZOHO BOOKS

Step 1:
Authenticate / provide connection details

Step 2:
Connection established

Step 3:
Data synchronization / API connectivity

Step 4:
Connection validated

Then display:

✓ ZOHO BOOKS CONNECTED

System:
Zoho Books

Status:
Connected

Last Sync:
[Timestamp]

Data Available:
- Purchase Orders
- Goods Receipts
- Vendors
- Purchase Transactions
- Other configured objects

The final connected state should be clearly visible.

IMPORTANT:

This should look like part of the Finance Command Center's
Enterprise Connect framework.

Do not make it look like an unrelated external page.

========================================================
10. INVOICE INTAKE &amp; INTELLIGENCE
========================================================

PRESERVE THE EXISTING GST INVOICE PROCESSING CAPABILITY.

The screen should provide:

Invoice upload
Email intake
Vendor submission
OCR
AI extraction
Classification
GST extraction
Validation
Duplicate detection
Confidence scoring
Invoice record creation

DO NOT show a permanent "Agent Summary" window.

Instead provide the movable global Ask Agent.

The main screen should focus on the actual invoice.

Show:

Invoice document
+
Extracted header
+
Line items
+
GST information
+
Vendor information
+
PO reference
+
Confidence
+
Validation status

At the bottom / next stage, provide:

RETRIEVE SOURCE DATA

This will initiate retrieval of relevant P2P data from Zoho Books
and/or ERP.

========================================================
11. REQUISITION &amp; PROCUREMENT
========================================================

This area primarily represents the procurement process.

Underlying execution:

ZOHO BOOKS

Capabilities:

PR
→ PR approval
→ PO creation
→ PO approval
→ PO amendment
→ Supplier information
→ PO status

The Command Center should provide a native interface.

The user should see a clear source indicator.

Example:

SOURCE:
ZOHO BOOKS

PURCHASE ORDERS

PO Number
PO Date
Vendor
Value
Currency
Status
Approval
etc.

Do not show an "Agent Summary" panel.

Instead, use the movable Ask Agent.

Provide actions such as:

View PO
View PR
Open Transaction 360
Ask Agent

========================================================
12. GOODS / SERVICE RECEIPT
========================================================

The Goods / Service Receipt area should also have a clear
source-system representation.

SOURCE:

ZOHO BOOKS

GOODS RECEIPTS

Show:

GRN Number
GRN Date
PO Number
Vendor
Item
Received Quantity
Accepted Quantity
Pending Quantity
Service Entry
Status

Again:

NO STATIC AGENT SUMMARY.

Use the movable Ask Agent.

The user should be able to navigate:

GRN
→ PO
→ PR
→ Invoice

and vice versa.

========================================================
13. SOURCE SYSTEM DATA — IMPORTANT
========================================================

Wherever data is retrieved from a source system, clearly identify
the source.

For example:

SOURCE INFORMATION

┌────────────────────────────┐
│ ZOHO BOOKS                 │
│ Purchase Order             │
│ PO-XXXX                    │
└────────────────────────────┘

┌────────────────────────────┐
│ ZOHO BOOKS                 │
│ Goods Receipt              │
│ GRN-XXXX                   │
└────────────────────────────┘

┌────────────────────────────┐
│ FINANCE COMMAND CENTER     │
│ Invoice                    │
│ INV-XXXX                   │
└────────────────────────────┘

If ERP data is used:

┌────────────────────────────┐
│ ERP                        │
│ Source / Financial Data    │
└────────────────────────────┘

This source transparency is important.

========================================================
14. MATCH, VERIFY &amp; APPROVE
========================================================

This remains one of the MOST IMPORTANT screens.

The user should NOT simply see:

3-WAY MATCH = PASS

Instead, show the actual evidence first.

The sequence should be:

RAW SOURCE DATA
↓
EDIT / REVIEW
↓
PO / GRN / INVOICE COMPARISON
↓
2-WAY / 3-WAY MATCH
↓
VARIANCE / MATCH
↓
VERIFICATION
↓
APPROVAL

========================================================
15. RAW TRANSACTION DATA STRIP
========================================================

Before the three-way match visualization, show a compact
line-item-level transaction data area.

Show approximately 3–4 rows initially.

The table should support horizontal scrolling.

Rows:

PO
GRN
INVOICE

Columns can include:

PO Number
PO Line Number
PO Date
GRN Number
GRN Line
GRN Date
Invoice Number
Invoice Line
Invoice Date
Vendor
GSTIN
Item / Service
Description
Service Period
Ordered Quantity
Received Quantity
Accepted Quantity
Invoice Quantity
PO Rate
Invoice Rate
PO Amount
GRN Amount
Invoice Amount
Taxable Value
CGST
SGST
IGST
GST Rate
TDS
Cost Center
GL Account
Business Unit
Currency
Payment Terms

The exact fields should be configurable.

The user must be able to horizontally scroll.

This area represents:

TRANSACTION EVIDENCE.

========================================================
16. EDITABLE LINE-ITEM WORKSPACE
========================================================

Preserve the existing editable invoice transaction experience.

The user should be able to review permitted fields.

Potential editable fields:

Quantity
Rate
Amount
Cost Center
GL
Service Period
Tax fields
PO reference
GRN reference
Other configurable accounting fields

Clearly distinguish:

AI EXTRACTED VALUE
SOURCE SYSTEM VALUE
CALCULATED VALUE
USER-ADJUSTED VALUE

Example:

Invoice Quantity
Original: 105
Adjusted: 100

The system must capture:

Original value
New value
User
Timestamp
Reason
Approval / authorization where required

Do not silently overwrite authoritative source-system information.

Where the source-system value must be corrected at source,
create the appropriate exception/correction workflow.

========================================================
17. THREE-WAY MATCH
========================================================

Below the evidence strip, show:

PURCHASE ORDER
GOODS RECEIPT
INVOICE

Then:

3-WAY MATCH ENGINE

Check:

Vendor
PO
GRN
Quantity
Price
Amount
Tax
Item / Service
Service Period
Other configured rules

Show line-level and header-level results.

Example:

Vendor ✓
PO ✓
GRN ✓
Quantity ✓
Price ✓
GST ✓

OVERALL:
MATCHED

If a mismatch occurs:

Quantity

PO:
100

GRN:
100

Invoice:
105

VARIANCE:
+5

Reason:
Invoice quantity exceeds received quantity.

The user must be able to understand WHY the system reached
the match result.

========================================================
18. REVALIDATION
========================================================

After a permitted correction:

User selects:

REVALIDATE

The system should:

1. Save the change
2. Record the audit trail
3. Re-run validation
4. Re-run match
5. Recalculate relevant fields
6. Update exception status
7. Update transaction status

Do not force the user to restart the invoice process.

========================================================
19. VERIFICATION &amp; APPROVAL
========================================================

Once matching is complete:

Move to verification / approval.

Underlying workflow:

ZOHO

Capabilities:

DOA
Multi-level approval
Approve
Reject
Return
Escalation
SLA tracking

The Finance Command Center should display:

Approver
Approval level
Status
Amount
Match status
Exceptions
Compliance status
Previous decisions

========================================================
20. AP PROCESSING &amp; SETTLEMENT
========================================================

Continue using the existing invoice-processing capabilities.

Show:

TDS
Advance adjustment
Credit note
GL
Cost center
Tax
Accounting
Settlement
Expense JV

This should remain primarily part of the Finance Command Center
experience.

========================================================
21. PAYMENT &amp; TREASURY
========================================================

Show:

Payment proposal
Payment review
Finance approval
Payment release
Bank transmission
H2H
UTR
Payment confirmation

Where appropriate, the workflow can be executed through Zoho.

The Command Center remains the consolidated user experience.

Show:

Invoice
Vendor
Amount
Due date
Approval status
Payment status
Bank status
UTR
Exception

========================================================
22. RECONCILIATION &amp; P2P INSIGHTS
========================================================

IMPORTANT DESIGN CHANGE:

Do NOT make this page look like another generic cockpit/dashboard.

This should be a functional:

RECONCILIATION &amp; P2P INSIGHTS

workspace.

Focus on actual reconciliation and control activities.

Show:

INVOICE ↔ PAYMENT
PAYMENT ↔ BANK
AP ↔ GL
GST / TAX RECONCILIATION
OPEN ITEMS
UNRECONCILED ITEMS
PAYMENT DIFFERENCES
ACCOUNTING DIFFERENCES
EXCEPTIONS
PERIOD CLOSE

Then provide P2P Insights:

Processing trends
Exception trends
Ageing
Supplier patterns
Payment patterns
Automation %
Touchless processing
SLA performance
Root causes
AI insights

The page should be operational + analytical,
not merely a cockpit.

========================================================
23. AUDIT TRAIL — LAST PART OF RECONCILIATION
========================================================

At the END / BOTTOM of the Reconciliation &amp; P2P Insights page,
include a simple:

AUDIT TRAIL

section.

It should show:

Timestamp
User
Action
Original Value
Changed Value
Reason
Source
Approval
System Event

Example:

10:42 AM
Finance User
Changed Invoice Quantity
105 → 100
Reason: Corrected against GRN
Source: Invoice Processing

10:44 AM
System
3-Way Match Re-run
Result: PASS

10:50 AM
Approver
Approved Invoice

The audit trail should be simple and easy to understand.

========================================================
24. TRANSACTION 360 — RIGHT-HAND PANEL
========================================================

IMPORTANT DESIGN CHANGE:

Where the existing design has a right-side
"Processing Outcome" type section, replace / rename this concept as:

TRANSACTION 360

This should occupy the RIGHT side of relevant transaction-processing
screens.

The right-hand panel should provide a compact end-to-end view.

Example:

TRANSACTION 360

Invoice
✓ Received

OCR
✓ Extracted

PO
✓ Retrieved from Zoho Books

GRN
✓ Retrieved from Zoho Books

3-Way Match
✓ Passed

Approval
✓ Approved

AP Processing
✓ Complete

Settlement
✓ Complete

Payment
⏳ Pending

Reconciliation
Pending

The user should be able to click each stage.

This is NOT another dashboard.

It is the transaction's lifecycle view.

The Transaction 360 should be available throughout the invoice journey.

========================================================
25. END-TO-END TRANSACTION JOURNEY
========================================================

The preferred user journey is:

SCREEN 1
FINANCE COMMAND CENTER

↓

SCREEN 2
INVOICE INTAKE &amp; OCR

↓

SCREEN 3
INVOICE / LINE-ITEM EXTRACTION REVIEW

↓

SCREEN 4
RETRIEVE SOURCE DATA

Zoho Books:
PO
GRN
PR where applicable

↓

SCREEN 5
RAW TRANSACTION DATA

PO
GRN
INVOICE

↓

SCREEN 6
THREE-WAY MATCH

↓

SCREEN 7
EDIT / CORRECT / REVALIDATE

↓

SCREEN 8
VERIFICATION / DOA APPROVAL

↓

SCREEN 9
AP PROCESSING &amp; SETTLEMENT

↓

SCREEN 10
PAYMENT / BANK / UTR

↓

SCREEN 11
RECONCILIATION &amp; P2P INSIGHTS

↓

AUDIT TRAIL

Throughout the journey:

TRANSACTION 360 remains accessible on the right.

ASK AGENT remains accessible as a movable floating assistant.

========================================================
26. P2P NAVIGATION VS TRANSACTION JOURNEY
========================================================

There are two different concepts.

A. P2P NAVIGATION

The left-hand navigation contains:

Home / Command Center

1. Invoice Intake &amp; Intelligence
2. Requisition &amp; Procurement
3. Goods / Service Receipt
4. Match, Verify &amp; Approve
5. AP Processing &amp; Settlement
6. Payment &amp; Treasury
7. Reconciliation &amp; P2P Insights

B. TRANSACTION JOURNEY

For a specific invoice:

Invoice
→ PR where applicable
→ PO
→ GRN
→ Match
→ Verification
→ Approval
→ AP Processing
→ Payment
→ Reconciliation

Do not force the user to follow the navigation order
to complete a transaction.

The invoice can be the starting point.

========================================================
27. INVOICE-FIRST P2P INVESTIGATION
========================================================

The application must support:

INVOICE-FIRST

Example:

User uploads invoice.

System extracts:

Vendor
Invoice Number
PO Number
Invoice Date
Amount
Line items
etc.

The Command Center then automatically attempts to retrieve:

PR
PO
GRN
Vendor
Other relevant source records

from Zoho Books / ERP.

The user sees:

"RELATED P2P TRANSACTION FOUND"

Then:

Invoice
↕
PO
↕
GRN
↕
PR

The user can drill into the source information.

This is one of the major differentiators of the solution.

========================================================
28. AGENTIC AI
========================================================

Do not make agents appear as a collection of decorative widgets.

Agents should be embedded into the workflow.

Core agents:

Invoice Intake Agent
Extraction Agent
Validation Agent
Matching Agent
Compliance Agent
Approval Agent
AP Processing Agent
Exception Agent
Payment Agent
Reconciliation Agent
P2P Copilot

They should work behind the scenes.

The primary visible AI interaction should be:

ASK AGENT

which is globally available and context-aware.

Example:

On Match screen:

"Why did this fail?"

On Payment screen:

"Why is this payment blocked?"

On Reconciliation:

"Show me the unreconciled items."

On CFO dashboard:

"What requires my attention?"

========================================================
29. DATA SOURCE TRANSPARENCY
========================================================

For every major transaction object, identify its source.

Examples:

INVOICE
Source:
Finance Command Center / Invoice Processing Engine

PR
Source:
Zoho Books

PO
Source:
Zoho Books

GRN
Source:
Zoho Books

Accounting
Source:
ERP

Payment
Source:
Bank

The source should be visible but subtle.

The interface should not look like a collection of external systems.

========================================================
30. HOMOGENEOUS USER EXPERIENCE
========================================================

The user must see ONE PRODUCT.

Use one consistent:

Navigation
Header
Design language
Typography
Tables
Cards
Buttons
Status indicators
Search
Filters
AI assistant
Audit trail
Transaction 360

Do not create obvious embedded Zoho screens.

Zoho should be an underlying system.

The Command Center is the product identity.

========================================================
31. DESIGN PRINCIPLE — EVIDENCE BEFORE DECISION
========================================================

Use this as a fundamental product principle.

Before showing:

MATCH
PASS
FAIL
APPROVE
REJECT
EXCEPTION

show the relevant evidence.

For example:

PO = 100
GRN = 100
Invoice = 105

↓

Quantity Variance = +5

↓

3-Way Match = FAILED

↓

User can investigate / correct / resolve

↓

REVALIDATE

↓

3-Way Match = PASSED

This is more important than simply displaying an AI-generated
status.

========================================================
32. DESIGN PRINCIPLE — ONE PLATFORM, MULTIPLE SYSTEMS
========================================================

The final architecture should visually communicate:

                    FINANCE COMMAND CENTER
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ZOHO BOOKS              ERP                  BANK
   Procurement           Financial             Payment
   Workflow              Records               Execution
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    FINANCE COMMAND CENTER
              Intelligence / Visibility / Control

The user experiences only:

FINANCE COMMAND CENTER

========================================================
33. FINAL END-TO-END P2P FLOW
========================================================

INPUT

Vendor Portal
User Portal
Email
Upload

↓

FINANCE COMMAND CENTER

Invoice Intake
OCR
Extraction
Validation

↓

ZOHO BOOKS

PR / PO
Procurement
GRN / Receipt
Workflow

↓

FINANCE COMMAND CENTER

Raw Transaction Evidence

PO
GRN
Invoice

↓

FINANCE COMMAND CENTER

Editable Line-Item Review

↓

FINANCE COMMAND CENTER

2-Way / 3-Way Match

↓

ZOHO

Verification / DOA Approval

↓

FINANCE COMMAND CENTER

AP Processing
TDS
Advance
Credit Note
Accounting
Settlement

↓

ERP

Financial Posting

↓

ZOHO / FINANCE COMMAND CENTER

Payment Approval

↓

BANK

Payment
H2H
UTR

↓

FINANCE COMMAND CENTER

Reconciliation
P2P Insights
Audit Trail

↓

TRANSACTION 360

Complete end-to-end lifecycle.

========================================================
34. FINAL PRODUCT MESSAGE
========================================================

The final product should communicate:

"ONE FINANCE COMMAND CENTER FOR END-TO-END P2P."

With the architecture:

ZOHO EXECUTES SELECTED P2P OPERATIONS.

FINANCE COMMAND CENTER INTELLIGENTLY ORCHESTRATES,
UNDERSTANDS AND VISUALIZES THE TRANSACTION.

ERP RECORDS THE FINANCIAL TRANSACTION.

BANK EXECUTES THE PAYMENT.

THE USER EXPERIENCES ONE HOMOGENEOUS PLATFORM.

========================================================
35. CRITICAL BUILD PRIORITIES
========================================================

Prioritize the following in this order:

1. Preserve existing GST Invoice Processing
2. Create the Finance Command Center shell
3. Create the four persona-specific dashboards
4. Add Zoho Books to Enterprise Connect
5. Connect / simulate Zoho Books data
6. Build Invoice-First journey
7. Build PO / GRN source-data retrieval
8. Build Raw Transaction Data strip
9. Build editable line-item workspace
10. Build enhanced 3-Way Match
11. Build Revalidate capability
12. Build Verification / DOA
13. Build AP Processing
14. Build Payment / UTR
15. Build Reconciliation &amp; P2P Insights
16. Add Audit Trail
17. Add Transaction 360
18. Add movable global Ask Agent

Do not overbuild unrelated functionality.

The objective is a coherent, highly demonstrable P2P Finance Command Center
that extends the existing GST Invoice Processing application into a
complete P2P solution.
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Industry (design system)">
[Design System] This project uses the **Industry** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

This project has the **Industry_indust** design system bound at `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/`. If anything under that path is missing or fails to load, the folder name may differ — `list_files` `_ds/` and use the folder whose name ends with 0942542c-810d-4c59-931a-3e245d9e23ae instead, including in the <link>/<script> paths below.

**Loading the bundle is how you use this design system.** Every Design Component you build must load `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js` in `<helmet>` (include it in child DCs too — de-duped by URL) and compose with its components — do not recreate those components from scratch or restyle raw HTML to look like them. At the top of the template:

```html
<helmet>
  <link rel="stylesheet" href="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/styles.css">
  <script src="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js"></script>
</helmet>
```

Then mount any component directly in the template — no logic class needed:

```html
<x-import component-from-global-scope="Industry_indust.Button" hint-size="auto,40px">Label</x-import>
```

Props are template attributes (kebab → camelCase); template children pass through as `props.children`. The linked stylesheet(s) carry the design tokens (colors, type, spacing) — style against those via `var(--*)` and the design system's classes rather than guessing values.

**Start from a template if one matches.** Before building from scratch, check whether a template below matches the user's request. Read the template (list its folder, `read_file` the entry) and decide: if it's close to what's asked, `copy_files` the folder as your starting point; if you'd rather re-author in DC, `dc_write` a new page using the template as your structural reference. When this design system is bound, `copy_files` repoints the copied `ds-base.js` automatically — only edit its base line yourself if the copy result says so, or when copying from an unbound project (change `'../..'` to your `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae` path). (Older templates have no `ds-base.js` and carry `../../…` bundle/stylesheet refs in their pages instead — repoint those by hand.)

- `Deck` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/deck/`) — A twenty-one-slide presentation starter: cover, contents, dividers, columns, quadrants, a data table, SVG charts and timeline, bleed imagery, a quote and a close, on the theme's tokens
- `Landing` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/landing/`) — A one-page product landing in the system's own voice — an invented product (Holdfast: a fastener catalog), a condensed hero, a numbered spec-sheet plate, wireframe cells and a duotone photograph

The full design-system source tree lives at `/projects/0942542c-810d-4c59-931a-3e245d9e23ae/` — use `list_files` / `read_file` from there for anything not under `_ds/` (layout varies by brand; don't assume folder names). Its guide is reproduced below so you don't need to fetch it:

<design-system-guide>
# Industry design system

Industry is a wireframe: steel-blue on a light technical ground, Barlow Condensed headings over Barlow, a modular grid, and cards, figures and buttons framed as blueprint objects — square-cornered, hairline-bordered, with "+" registration marks at the corners. Cards and figures stay transparent line drawings; the primary button is the one solid object on the board, an accent fill that keeps the square corners and the marks. Photography is duotoned into the steel accent and icons are thin-stroke.

## How to use this

- Link the one stylesheet from every page — `&lt;link rel="stylesheet" href="styles.css"&gt;` (adjust the relative path) — and take every color, font, spacing, radius and shadow from its variables (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Never hard-code a hex, a font name or a px value the tokens already carry.
- Build with the classes below rather than inventing parallel ones; the component pages are plain HTML, so view source and copy the markup.
- `templates/` holds starting points a consuming project can copy whole.
- The whole system was derived from `theme.json`. To change the look, edit the tokens at the top of `styles.css` — every page, the thumbnail and this guide read from them — and keep `theme.json` and the written guidance in step so they don't drift from what the CSS actually does.

## Direction

Modular grid layouts — content in equal-width cells, strong horizontal and vertical rhythm, visible structure. Cards, buttons and major sections are wireframe objects: square-cornered, thin-bordered, with `+` crosshair corner marks (the `.blueprint` class + four `&lt;i class="corner tl/tr/bl/br"&gt;` children) — never soft filled rounded blocks. Images and figures get the same treatment: square, hairline-framed and marked, never rounded or clipped. Wrap hero and inline images in the `.duotone` class — they are desaturated and washed in the accent, like a screen print that re-colors with the theme.

## Color

A light ground (`--color-bg` #f2f2f3) with `--color-text` #1d1f20 and a single accent #5980a6 (this is a mono scheme: no second accent was chosen — the `--color-accent-2-*` variables carry a machine-derived stand-in kept only so both sets resolve; treat them as one role). Each role carries a 100–900 tonal ramp (`--color-neutral-100` … `--color-accent-2-900`) generated in OKLCH on a shared perceptual lightness scale, so the same step of any ramp has the same visual weight. Use the light steps (100–300) for tinted fills, hovers and subtle borders, 500 as the role's base, and the dark steps (700–900) for text on tinted fills and for pressed states; prefer ramp steps over ad-hoc `color-mix()`. For elevation use `--shadow-sm/md/lg` (already tuned to the ground) rather than ad-hoc box-shadows.

## Type

Barlow Condensed for headings over Barlow for body text, loaded as `--font-heading` / `--font-body`. Density 0.85× and radius 4px are already baked into the `--space-*` / `--radius-*` scales — use the variables, not raw numbers.

## Icons

Use Lucide icons (https://lucide.dev), at stroke-width 1.5 for a lighter, more technical look throughout.

## Interaction states

Interactive states are themed, never browser defaults: give every interactive element a `:hover` tint and a pressed state from the accent ramp (one step past the base — `--color-accent-600` on a light ground, `--color-accent-400` on a dark one, or a `color-mix()` tint for outlined/ghost variants), and style keyboard focus with `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — never leave the default blue focus ring.

## Components

| Class | What it is | Shown in |
| --- | --- | --- |
| `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block` | Actions — the primary is a solid accent fill | components/buttons.html |
| `.tag` with `.tag-accent`, `.tag-accent-2`, `.tag-neutral`, `.tag-outline` | Small labels tinted from the ramps (mono palette: accent-2 reads the same as accent) | components/buttons.html |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | Form fields and choices on native elements — no script | components/forms.html |
| `.card` with `.card-kicker`, `.card-title`, `.card-body`, `.card-meta`; `.elev-sm/md/lg` | Transparent, hairline-bordered cards with corner registration marks | components/cards.html |
| `.nav` + `.nav-brand` | The header bar | components/navigation.html |
| `.table` | Data tables with themed header and row rules | components/table.html |
| `.dialog-backdrop` + `.dialog` (+ `.dialog-title/-body/-actions`) | A modal at the top elevation | components/dialog.html |
| `.hr` | A horizontal rule — present, but this system prefers whitespace; avoid it | — |
| `.blueprint` + four `&lt;i class="corner tl/tr/bl/br"&gt;` children | The wireframe frame every card, figure and primary button wears | components/cards.html |
| `.duotone` | The image wrapper — every content photograph goes through it | foundations/image.html |

States are built in: hovers and pressed states come from the accent ramp, keyboard focus is the 2px accent `:focus-visible` ring, `::selection` is an accent tint, and disabled controls drop to 45% opacity. Don't restyle them per page. The accent-to-ground pair is tuned to at least 3:1 — enough for icons, large text and interface chrome, not for body copy — so for paragraph-size text in the accent use a deep ramp step (`--color-accent-700` on this ground) rather than the accent itself.

## Do

- Frame cards, figures and primary buttons as blueprint objects: the `.blueprint` class plus four `&lt;i class="corner …"&gt;` marks.
- Keep the grid visible — equal cells, strong horizontal and vertical rhythm.
- Condense headings (Barlow Condensed) and keep body copy in Barlow.
- Duotone photographs with the `.duotone` wrapper so they take the accent.

## Don't

- Do not round cards, figures or buttons, and do not give cards or figures a surface fill — they are line drawings (the solid accent primary button is the one deliberate exception).
- Do not drop the registration marks from a framed element.
- Do not use thick icon strokes; the set is Lucide at 1.5.
- Do not add decorative color beyond the steel accent. The accent's own deep step (`--color-accent-900`) may carry a full field where the deck's section dividers use it — steel as ground, type reversed to paper. (The landing's numbers sit on a drawn spec-sheet plate on the paper ground instead — its own grammar, not a field.)

## Files

- `styles.css` — the only stylesheet: the token sheet (`:root` variables, ramps, base type) plus the component layer. Link it from every page.
- `readme.md` — this guide.
- `theme.json` — the parameters these files were derived from (a machine-readable record of the theme).
- `thumbnail.html` — the project cover (brand mark + swatches).
- `foundations/type.html` — the type scale and the heading/body pairing at real sizes.
- `foundations/color.html` — color roles and the 100-900 tonal ramps, with usage notes.
- `foundations/layout.html` — the spacing scale, the grid and how edges are drawn.
- `foundations/icons.html` — the icon set at interface sizes, inline and in buttons.
- `foundations/image.html` — how photographs and figures are treated.
- `components/buttons.html` — buttons, icon buttons and tags in every variant and state.
- `components/forms.html` — text fields, radios and the segmented control on native elements.
- `components/cards.html` — content cards and the elevation steps.
- `components/navigation.html` — the header bar pattern.
- `components/table.html` — a data table with the themed header and row rules.
- `components/dialog.html` — a modal over its backdrop at the top elevation.
- `theme.html` — the theme's parameters rendered as a reference sheet.
- `templates/landing/` — a starter page consuming the system the intended way (`index.html`, its `ds-base.js` loader, and the vendored `image-slot.js` its photograph mounts).
- `assets/photo.jpg` — the reference photograph the imagery page treats.

</design-system-guide>
</attached-skill>

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now the header controls, T360 drawer, movable Ask Agent, Zoho connector and reconciliation workspace.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the logic: state, drag, personas, connect steps, T360 wiring.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now personas on the Command Center and the reconciliation workspace.

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the reconciliation workspace + source badges.

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

V2 changes applied (previous build saved as *Invoice Processing Agent v2*):

- **Four personas** on the Command Center — CFO, AP Lead, Finance Controller, Finance User — each with its own KPIs, critical action items and agent insights; the rest of the platform is shared.
- **Ask Agent is now global and movable** — drag by its header, minimise, close, reopen from the header button. It's available on every screen and stays context-aware. The static Agent Summary panel is gone from the extraction screen.
- **Transaction 360** is a right-hand drawer reachable from the header on any transaction screen; each lifecycle stage is clickable and jumps to that area.
- **Zoho Books added to Enterprise Connect** with a four-step connect flow (authenticate → established → sync → validated) and the available objects listed on success. PO/GRN source badges now read Zoho Books throughout the evidence strip and registers.
- **Reconciliation & P2P Insights** is now a workspace first: a reconciliation register (invoice↔payment, payment↔bank, AP↔GL, GSTR-2B, GR/IR, advances) with open counts and differences, an open-items table with ageing and reasons, a period-close checklist — then the insight charts, with the **Audit Trail** at the bottom.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now move the Audit Trail card to the end of the page.

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

All three fixed:

1. **Audit Trail moved** to the last block on Reconciliation & P2P Insights, full width.
2. **Audit Trail is live** — the session's own actions prepend to it: the line-4 correction (120 → 100 with reason and user), the automatic "3-way match re-run · result: PASS", the controller approval, the ERP posting/park, and the payment release with UTR.
3. **Zoho Books starts as Available** with a "Connect Zoho Books" CTA, so the four-step flow (authenticate → established → sync → validated) and the Data Available list — purchase orders, goods receipts, requisitions, vendors, purchase transactions — can be demonstrated; the PR/PO/GRN registers stay populated either way.

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Gen 4 - Indian GST Invoice Processing System"
What `list_files` on the project root returns right now (dotfiles, if any, are not shown here):
📁 _ds
📁 uploads
📄 Invoice Processing Agent v1.dc.html
📄 Invoice Processing Agent v2.dc.html
📄 Invoice Processing Agent.dc.html
📄 support.js
User is viewing file: Invoice Processing Agent.dc.html
Current date is now September 18, 2026
</system-info>

<pasted_text name="Pasted text (828 lines)">
COMMAND CENTER — FINAL UX REFINEMENTS

IMPORTANT:
Do not redesign the existing application.
Apply the following changes to the current Finance Command Center
design while preserving all previously defined functionality.

========================================================
1. PERSONA SELECTOR — REMOVE TOP PERSONA CARDS
========================================================

DO NOT show four large persona cards / persona selectors across the
top of the Command Center.

Instead, create a compact FILTER / DROPDOWN control on the
LEFT SIDE or RIGHT SIDE of the Command Center.

Label:

PERSONA ▾

When clicked, show:

• CFO
• AP Lead
• Finance Controller
• Finance User

The selected persona controls the dashboard content.

Example:

PERSONA
[CFO ▼]

When opened:

┌─────────────────────────┐
│ CFO                     │
│ AP Lead                 │
│ Finance Controller      │
│ Finance User            │
└─────────────────────────┘

Keep this control compact and persistent.

The Command Center itself remains common to all personas.

========================================================
2. PERSONA-SPECIFIC KPI CARDS
========================================================

Immediately below the Command Center header / filter area,
show SIX large KPI / insight cards.

Arrange them:

3 cards in the first row
3 cards in the second row

These six cards must dynamically change based on the selected
persona.

Do NOT show the same six metrics for every persona.

--------------------------------------------
CFO VIEW
--------------------------------------------

Example six cards:

1. AP Liability Outstanding
2. Upcoming Payment Exposure
3. P2P Processing Performance
4. Compliance Exceptions
5. Working Capital / Payment Impact
6. Critical Business Risks

Focus on:
- Financial exposure
- Risk
- Working capital
- Compliance
- Performance
- Executive attention

--------------------------------------------
AP LEAD VIEW
--------------------------------------------

Example six cards:

1. Invoice Pipeline
2. P2P Match Status
3. Processing Ageing
4. Exception Queue
5. Approval Pending
6. Payment-Ready Invoices

Focus on:
- Workload
- Processing
- Exceptions
- SLA
- Approvals
- Payment pipeline

--------------------------------------------
FINANCE CONTROLLER VIEW
--------------------------------------------

Example six cards:

1. 3-Way Match Compliance
2. Accounting Exceptions
3. GST / Tax Exceptions
4. Manual Overrides
5. Reconciliation Status
6. Control / Audit Exceptions

Focus on:
- Controls
- Compliance
- Accounting
- Reconciliation
- Auditability
- Overrides

--------------------------------------------
FINANCE USER VIEW
--------------------------------------------

Example six cards:

1. My Open Queries
2. Awaiting My Approval
3. My Pending Invoices
4. Match Exceptions
5. Corrections Required
6. My Work Queue

Focus on:
- Immediate tasks
- Personal work queue
- Queries
- Approvals
- Exceptions
- Corrections

The six cards must be actionable.

Clicking a card should drill into the relevant detailed screen.

========================================================
3. P2P JOURNEY — DO NOT CALL THEM "AREAS"
========================================================

IMPORTANT:

Do NOT label these as:

Area 1
Area 2
Area 3
etc.

Do NOT show seven large functional boxes.

Instead, represent the seven P2P components as a
HORIZONTAL / JOURNEY-STYLE PROCESS FLOW.

The Command Center should visually show:

      ○ ───── ○ ───── ○ ───── ○ ───── ○ ───── ○ ───── ○
      1       2       3       4       5       6       7

Each step should be represented by a CIRCLE / NODE.

Connect the circles using a thin line or dash.

The overall visual should look like a journey / process timeline.

========================================================
4. P2P JOURNEY STEPS
========================================================

The seven journey nodes are:

1
Invoice Intake &amp; Intelligence

2
Requisition &amp; Procurement

3
Goods / Service Receipt

4
Match, Verify &amp; Approve

5
AP Processing &amp; Settlement

6
Payment &amp; Treasury

7
Reconciliation &amp; P2P Insights

However:

DO NOT display the full names inside the circles.

Keep the circles visually clean.

Example:

○──────○──────○──────○──────○──────○──────○
1      2      3      4      5      6      7

Below each circle, show the step name.

========================================================
5. JOURNEY HOVER EXPERIENCE
========================================================

When the user hovers over any journey node,
show a small tooltip / contextual card.

Example:

Hover over Step 1:

┌──────────────────────────────────┐
│ STEP 1                           │
│ Invoice Intake &amp; Intelligence   │
│                                  │
│ Agent: Invoice Intake Agent     │
│ OCR • Extraction • Validation   │
└──────────────────────────────────┘

Step 2:

┌──────────────────────────────────┐
│ STEP 2                           │
│ Requisition &amp; Procurement       │
│                                  │
│ Source: Zoho Books              │
│ PR • PO • Approval              │
└──────────────────────────────────┘

Step 3:

┌──────────────────────────────────┐
│ STEP 3                           │
│ Goods / Service Receipt         │
│                                  │
│ Source: Zoho Books              │
│ GRN • Receipt • Service Entry   │
└──────────────────────────────────┘

Similarly provide contextual information for all seven steps.

The tooltip should identify where appropriate:

- Process name
- Agent
- Source system
- Key activities
- Current status

========================================================
6. JOURNEY CLICK BEHAVIOUR
========================================================

When the user clicks a journey node,
redirect them to the corresponding detailed workspace.

Example:

Click Step 1
→ Invoice Intake &amp; Intelligence

Click Step 2
→ Requisition &amp; Procurement

Click Step 3
→ Goods / Service Receipt

Click Step 4
→ Match, Verify &amp; Approve

Click Step 5
→ AP Processing &amp; Settlement

Click Step 6
→ Payment &amp; Treasury

Click Step 7
→ Reconciliation &amp; P2P Insights

The journey therefore becomes the primary navigation
for the P2P transaction lifecycle.

========================================================
7. COMMON JOURNEY FOR ALL PERSONAS
========================================================

The seven-step journey is COMMON to:

CFO
AP Lead
Finance Controller
Finance User

Do NOT create separate journeys for each persona.

Only the:

- KPI cards
- Insights
- Critical actions
- Alerts
- Recommended actions
- Dashboard information

should change by persona.

The underlying P2P journey remains the same.

========================================================
8. CRITICAL ACTIONS — PERSONA AWARE
========================================================

Critical Action Items should be dynamic by persona.

Do NOT show the same actions to everyone.

CFO examples:

- High-value invoice requiring attention
- Material compliance exception
- Significant payment exposure
- Critical P2P risk
- Working-capital issue

AP Lead examples:

- 25 invoices breaching SLA
- 12 invoices awaiting verification
- 8 match exceptions
- 15 approvals pending
- Payment queue requiring action

Finance Controller examples:

- 3-way match control exceptions
- Manual overrides
- GST exceptions
- Unreconciled AP / GL items
- Accounting exceptions
- Audit exceptions

Finance User examples:

- My invoices awaiting action
- My open queries
- My pending approvals
- My correction requests
- My match exceptions

The Command Center should intelligently surface actions
appropriate to the selected persona.

========================================================
9. COMMON INFORMATION
========================================================

Some information is relevant to every persona.

For example:

P2P PIPELINE

This can remain a common component.

Show:

Invoice Received
→ Validation
→ Match
→ Approval
→ Processing
→ Payment
→ Reconciliation

The data displayed can be filtered according to persona,
but the overall P2P pipeline remains common.

========================================================
10. AGENT INSIGHTS
========================================================

Agent Insights should also be persona-aware.

Do not create a generic Agent Summary box.

IMPORTANT:

REMOVE STATIC "AGENT SUMMARY" WINDOWS.

The system should instead provide:

AI INSIGHTS

as a contextual / dynamic component.

Examples:

CFO:
"₹X Cr of invoices are due for payment in the next 7 days."

AP Lead:
"18 invoices have been waiting for GRN validation for more than 48 hours."

Finance Controller:
"6 invoices have manual overrides requiring review."

Finance User:
"4 invoices assigned to you require action."

The existing global ASK AGENT remains available.

========================================================
11. ASK AGENT — MOVABLE
========================================================

The Ask Agent window must remain:

- Floating
- Movable
- Collapsible
- Expandable
- Repositionable

It must NOT permanently occupy a large portion of the screen.

The user should be able to move it so that it never blocks:

- Source data
- Tables
- Match information
- Invoice image
- Transaction 360
- Actions

It should remain available from every P2P journey step.

========================================================
12. SOURCE TRANSACTION EVIDENCE — ADD ACTIONS
========================================================

The Source Transaction Evidence section must not be
read-only information only.

Provide appropriate ACTION controls.

For each source / transaction component:

PURCHASE ORDER
GOODS RECEIPT
INVOICE

show:

View
Edit / Correct (where permitted)
Refresh
Source
Open Transaction 360

Example:

┌──────────────────────────────────────────┐
│ PURCHASE ORDER — Zoho Books              │
│                                          │
│ PO No.   PO-10045                        │
│ Qty      100                             │
│ Rate     ₹1,000                          │
│ Amount   ₹100,000                        │
│                                          │
│ [View] [Edit*] [Refresh]                │
└──────────────────────────────────────────┘

*Edit should only be enabled for fields that are
authorized to be changed.

========================================================
13. EDITABLE SOURCE / TRANSACTION DATA
========================================================

Where permitted, allow the user to change relevant fields.

Examples:

Quantity
Rate
Amount
Cost Center
GL
Service Period
Tax information
PO / GRN reference where appropriate

Clearly identify:

SOURCE VALUE
EDITED VALUE

Example:

Invoice Quantity
Source: 105
Edited: 100

Do not silently overwrite source-system data.

Capture:

Original value
New value
User
Timestamp
Reason

If a field is authoritative in Zoho / ERP and cannot be changed
directly in the Command Center, provide:

"Request Source Correction"

rather than allowing an uncontrolled edit.

========================================================
14. THREE-WAY MATCH — FINAL EXPERIENCE
========================================================

The three-way match screen must follow:

RAW DATA
↓
REVIEW / EDIT
↓
MATCH

Show:

PURCHASE ORDER
GOODS RECEIPT
INVOICE

with the underlying line-item data.

Example:

                    PO
              Qty: 100
              Rate: ₹1,000

                    ↘
                     MATCH
                    ↗

              GRN
              Qty: 100

                    ↘
                     MATCH
                    ↗

                 INVOICE
                 Qty: 105

Then clearly display:

QUANTITY VARIANCE
PO = 100
GRN = 100
Invoice = 105
Variance = +5

Allow:

[Edit]
[Resolve]
[Revalidate]

After revalidation:

3-WAY MATCH
✓ PASSED

========================================================
15. TRANSACTION 360 — RIGHT SIDE
========================================================

IMPORTANT:

The right-hand section currently called something like:

"Processing Outcome"

should be renamed:

TRANSACTION 360

This should be the persistent right-side lifecycle panel
on transaction-processing screens.

Example:

TRANSACTION 360

Invoice
✓ Received

OCR
✓ Extracted

PO
✓ Retrieved — Zoho Books

GRN
✓ Retrieved — Zoho Books

3-Way Match
✓ Passed

Verification
✓ Complete

Approval
✓ Approved

AP Processing
✓ Complete

Settlement
✓ Complete

Payment
⏳ Pending

Reconciliation
Pending

The user can click each stage to drill into the relevant
transaction information.

========================================================
16. RECONCILIATION &amp; P2P INSIGHTS — FINAL DESIGN
========================================================

Do NOT design this as another generic cockpit.

This is a functional reconciliation and insight workspace.

Primary sections:

RECONCILIATION

Invoice ↔ Payment
Payment ↔ Bank
AP ↔ GL
GST / Tax
Open Items
Unreconciled Items

Then:

P2P INSIGHTS

Ageing
Exception Trends
Supplier Patterns
Payment Trends
Automation
Touchless Processing
SLA
Root Causes
AI Insights

Finally, at the bottom:

AUDIT TRAIL

Keep the Audit Trail simple.

Show:

Timestamp
User
Action
Original Value
New Value
Reason
Source
Approval
System Event

The Audit Trail should be the LAST major section on this page.

========================================================
17. OVERALL COMMAND CENTER LAYOUT
========================================================

The final Command Center should conceptually look like:

┌───────────────────────────────────────────────────────────────┐
│ FINANCE COMMAND CENTER                         PERSONA ▼      │
│                                               CFO             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  KPI 1          KPI 2          KPI 3                          │
│                                                               │
│  KPI 4          KPI 5          KPI 6                          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                 P2P JOURNEY                                   │
│                                                               │
│  ○──────○──────○──────○──────○──────○──────○                 │
│  1      2      3      4      5      6      7                 │
│  Invoice  Requisition  Goods   Match   AP     Payment  Recon │
│  Intake   &amp; Procure    Receipt Verify  Proc.   &amp; Treasury     │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  PERSONA-SPECIFIC CRITICAL ACTIONS / INSIGHTS                  │
│                                                               │
│  P2P PIPELINE                    AI INSIGHTS                   │
│                                                               │
│                                                               │
└───────────────────────────────────────────────────────────────┘

A movable ASK AGENT window can appear over the interface.

========================================================
18. IMPORTANT UX PRINCIPLE
========================================================

The Command Center should NOT feel like a collection of dashboards.

It should feel like:

A P2P CONTROL AND ACTION CENTER.

The user should be able to:

SEE
→ UNDERSTAND
→ INVESTIGATE
→ ACT
→ REVALIDATE
→ COMPLETE

within the same platform.

========================================================
19. FINAL PRODUCT EXPERIENCE
========================================================

The final experience should communicate:

ONE FINANCE COMMAND CENTER

ONE P2P JOURNEY

FOUR PERSONAS

MULTIPLE UNDERLYING SYSTEMS

ZOHO BOOKS
+
EXISTING GST INVOICE PROCESSING
+
ERP
+
BANK

but ONE HOMOGENEOUS USER EXPERIENCE.

The user should never feel that Zoho and the Finance Command Center
are two separate applications.

The underlying system source should be transparent,
but the experience should remain unified.

========================================================
20. DO NOT CHANGE
========================================================

Preserve all previously defined functionality around:

- Invoice Intake
- OCR
- Extraction
- GST
- Invoice validation
- Source data retrieval
- PO
- GRN
- Raw transaction evidence
- Editable line items
- Three-way matching
- Verification
- DOA
- AP Processing
- Settlement
- Payment
- UTR
- Reconciliation
- Transaction 360
- Audit Trail
- Zoho Books connector
- Agentic AI
- Movable Ask Agent

Only apply the UX refinements specified in this prompt.
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Industry (design system)">
[Design System] This project uses the **Industry** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

This project has the **Industry_indust** design system bound at `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/`. If anything under that path is missing or fails to load, the folder name may differ — `list_files` `_ds/` and use the folder whose name ends with 0942542c-810d-4c59-931a-3e245d9e23ae instead, including in the <link>/<script> paths below.

**Loading the bundle is how you use this design system.** Every Design Component you build must load `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js` in `<helmet>` (include it in child DCs too — de-duped by URL) and compose with its components — do not recreate those components from scratch or restyle raw HTML to look like them. At the top of the template:

```html
<helmet>
  <link rel="stylesheet" href="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/styles.css">
  <script src="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js"></script>
</helmet>
```

Then mount any component directly in the template — no logic class needed:

```html
<x-import component-from-global-scope="Industry_indust.Button" hint-size="auto,40px">Label</x-import>
```

Props are template attributes (kebab → camelCase); template children pass through as `props.children`. The linked stylesheet(s) carry the design tokens (colors, type, spacing) — style against those via `var(--*)` and the design system's classes rather than guessing values.

**Start from a template if one matches.** Before building from scratch, check whether a template below matches the user's request. Read the template (list its folder, `read_file` the entry) and decide: if it's close to what's asked, `copy_files` the folder as your starting point; if you'd rather re-author in DC, `dc_write` a new page using the template as your structural reference. When this design system is bound, `copy_files` repoints the copied `ds-base.js` automatically — only edit its base line yourself if the copy result says so, or when copying from an unbound project (change `'../..'` to your `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae` path). (Older templates have no `ds-base.js` and carry `../../…` bundle/stylesheet refs in their pages instead — repoint those by hand.)

- `Deck` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/deck/`) — A twenty-one-slide presentation starter: cover, contents, dividers, columns, quadrants, a data table, SVG charts and timeline, bleed imagery, a quote and a close, on the theme's tokens
- `Landing` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/landing/`) — A one-page product landing in the system's own voice — an invented product (Holdfast: a fastener catalog), a condensed hero, a numbered spec-sheet plate, wireframe cells and a duotone photograph

The full design-system source tree lives at `/projects/0942542c-810d-4c59-931a-3e245d9e23ae/` — use `list_files` / `read_file` from there for anything not under `_ds/` (layout varies by brand; don't assume folder names). Its guide is reproduced below so you don't need to fetch it:

<design-system-guide>
# Industry design system

Industry is a wireframe: steel-blue on a light technical ground, Barlow Condensed headings over Barlow, a modular grid, and cards, figures and buttons framed as blueprint objects — square-cornered, hairline-bordered, with "+" registration marks at the corners. Cards and figures stay transparent line drawings; the primary button is the one solid object on the board, an accent fill that keeps the square corners and the marks. Photography is duotoned into the steel accent and icons are thin-stroke.

## How to use this

- Link the one stylesheet from every page — `&lt;link rel="stylesheet" href="styles.css"&gt;` (adjust the relative path) — and take every color, font, spacing, radius and shadow from its variables (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Never hard-code a hex, a font name or a px value the tokens already carry.
- Build with the classes below rather than inventing parallel ones; the component pages are plain HTML, so view source and copy the markup.
- `templates/` holds starting points a consuming project can copy whole.
- The whole system was derived from `theme.json`. To change the look, edit the tokens at the top of `styles.css` — every page, the thumbnail and this guide read from them — and keep `theme.json` and the written guidance in step so they don't drift from what the CSS actually does.

## Direction

Modular grid layouts — content in equal-width cells, strong horizontal and vertical rhythm, visible structure. Cards, buttons and major sections are wireframe objects: square-cornered, thin-bordered, with `+` crosshair corner marks (the `.blueprint` class + four `&lt;i class="corner tl/tr/bl/br"&gt;` children) — never soft filled rounded blocks. Images and figures get the same treatment: square, hairline-framed and marked, never rounded or clipped. Wrap hero and inline images in the `.duotone` class — they are desaturated and washed in the accent, like a screen print that re-colors with the theme.

## Color

A light ground (`--color-bg` #f2f2f3) with `--color-text` #1d1f20 and a single accent #5980a6 (this is a mono scheme: no second accent was chosen — the `--color-accent-2-*` variables carry a machine-derived stand-in kept only so both sets resolve; treat them as one role). Each role carries a 100–900 tonal ramp (`--color-neutral-100` … `--color-accent-2-900`) generated in OKLCH on a shared perceptual lightness scale, so the same step of any ramp has the same visual weight. Use the light steps (100–300) for tinted fills, hovers and subtle borders, 500 as the role's base, and the dark steps (700–900) for text on tinted fills and for pressed states; prefer ramp steps over ad-hoc `color-mix()`. For elevation use `--shadow-sm/md/lg` (already tuned to the ground) rather than ad-hoc box-shadows.

## Type

Barlow Condensed for headings over Barlow for body text, loaded as `--font-heading` / `--font-body`. Density 0.85× and radius 4px are already baked into the `--space-*` / `--radius-*` scales — use the variables, not raw numbers.

## Icons

Use Lucide icons (https://lucide.dev), at stroke-width 1.5 for a lighter, more technical look throughout.

## Interaction states

Interactive states are themed, never browser defaults: give every interactive element a `:hover` tint and a pressed state from the accent ramp (one step past the base — `--color-accent-600` on a light ground, `--color-accent-400` on a dark one, or a `color-mix()` tint for outlined/ghost variants), and style keyboard focus with `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — never leave the default blue focus ring.

## Components

| Class | What it is | Shown in |
| --- | --- | --- |
| `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block` | Actions — the primary is a solid accent fill | components/buttons.html |
| `.tag` with `.tag-accent`, `.tag-accent-2`, `.tag-neutral`, `.tag-outline` | Small labels tinted from the ramps (mono palette: accent-2 reads the same as accent) | components/buttons.html |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | Form fields and choices on native elements — no script | components/forms.html |
| `.card` with `.card-kicker`, `.card-title`, `.card-body`, `.card-meta`; `.elev-sm/md/lg` | Transparent, hairline-bordered cards with corner registration marks | components/cards.html |
| `.nav` + `.nav-brand` | The header bar | components/navigation.html |
| `.table` | Data tables with themed header and row rules | components/table.html |
| `.dialog-backdrop` + `.dialog` (+ `.dialog-title/-body/-actions`) | A modal at the top elevation | components/dialog.html |
| `.hr` | A horizontal rule — present, but this system prefers whitespace; avoid it | — |
| `.blueprint` + four `&lt;i class="corner tl/tr/bl/br"&gt;` children | The wireframe frame every card, figure and primary button wears | components/cards.html |
| `.duotone` | The image wrapper — every content photograph goes through it | foundations/image.html |

States are built in: hovers and pressed states come from the accent ramp, keyboard focus is the 2px accent `:focus-visible` ring, `::selection` is an accent tint, and disabled controls drop to 45% opacity. Don't restyle them per page. The accent-to-ground pair is tuned to at least 3:1 — enough for icons, large text and interface chrome, not for body copy — so for paragraph-size text in the accent use a deep ramp step (`--color-accent-700` on this ground) rather than the accent itself.

## Do

- Frame cards, figures and primary buttons as blueprint objects: the `.blueprint` class plus four `&lt;i class="corner …"&gt;` marks.
- Keep the grid visible — equal cells, strong horizontal and vertical rhythm.
- Condense headings (Barlow Condensed) and keep body copy in Barlow.
- Duotone photographs with the `.duotone` wrapper so they take the accent.

## Don't

- Do not round cards, figures or buttons, and do not give cards or figures a surface fill — they are line drawings (the solid accent primary button is the one deliberate exception).
- Do not drop the registration marks from a framed element.
- Do not use thick icon strokes; the set is Lucide at 1.5.
- Do not add decorative color beyond the steel accent. The accent's own deep step (`--color-accent-900`) may carry a full field where the deck's section dividers use it — steel as ground, type reversed to paper. (The landing's numbers sit on a drawn spec-sheet plate on the paper ground instead — its own grammar, not a field.)

## Files

- `styles.css` — the only stylesheet: the token sheet (`:root` variables, ramps, base type) plus the component layer. Link it from every page.
- `readme.md` — this guide.
- `theme.json` — the parameters these files were derived from (a machine-readable record of the theme).
- `thumbnail.html` — the project cover (brand mark + swatches).
- `foundations/type.html` — the type scale and the heading/body pairing at real sizes.
- `foundations/color.html` — color roles and the 100-900 tonal ramps, with usage notes.
- `foundations/layout.html` — the spacing scale, the grid and how edges are drawn.
- `foundations/icons.html` — the icon set at interface sizes, inline and in buttons.
- `foundations/image.html` — how photographs and figures are treated.
- `components/buttons.html` — buttons, icon buttons and tags in every variant and state.
- `components/forms.html` — text fields, radios and the segmented control on native elements.
- `components/cards.html` — content cards and the elevation steps.
- `components/navigation.html` — the header bar pattern.
- `components/table.html` — a data table with the themed header and row rules.
- `components/dialog.html` — a modal over its backdrop at the top elevation.
- `theme.html` — the theme's parameters rendered as a reference sheet.
- `templates/landing/` — a starter page consuming the system the intended way (`index.html`, its `ds-base.js` loader, and the vendored `image-slot.js` its photograph mounts).
- `assets/photo.jpg` — the reference photograph the imagery page treats.

</design-system-guide>
</attached-skill>

## Assistant

_[tool: snip]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

Now persona-specific KPI labels per the spec.

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Command Center refined; everything else untouched.

- **Persona is now a compact dropdown** at the right of the header strip — the four large persona cards are gone.
- **Six large KPI cards in a 3 × 2 grid**, with a distinct metric set per persona (CFO: liability, payment exposure, processing performance, compliance, working capital, critical risks; AP Lead: pipeline, match status, ageing, exception queue, approvals, payment-ready; Controller: match compliance, accounting, GST, overrides, reconciliation, control exceptions; Finance User: my queries, my approvals, my invoices, match exceptions, corrections, work queue). Each card is clickable and drills into its workspace.
- **P2P Journey replaces the seven "Area" boxes** — numbered circles on a connecting line with step names beneath; hover shows a tooltip with the process, agent or source system, key activities and current status; click opens that workspace.
- Critical actions and **AI Insights** (renamed from Agent Insights) stay persona-aware; the P2P pipeline stays common; the movable Ask Agent, Transaction 360, evidence, match, revalidation and audit trail are unchanged.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Dropped `overflow-x: auto` from the journey strip in favour of a wrapping row (nodes wrap to a second line on narrow widths), so no clip context is created and the hover tooltip renders in full above the card.

## User

when ZOHO books connects the Enterprise connecter box still shows NO ERP connected.. it should show ZOHO books connected.

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

The Enterprise Connector card now reflects Zoho Books too — it reads "Zoho Books connected" (or "Zoho Books + SAP S/4HANA connected" when both are on) in green, the sidebar count includes it, and the drop zone says "Fetch from Zoho Books".

## User

in transaction 360, i still see Goods receipt on SAP HANA but now its on Zoho Books

## Assistant

_[tool: grep]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Transaction 360 now credits Zoho Books for the requisition, purchase order, goods receipt and approval stages; SAP S/4HANA remains only on the accounting/ERP posting stage and the bank on payment.

## User

Instead of calling P2P journey in Finance COmmand center, what we can call it smart way ? give me 3-5 examples

## Assistant

Five options, each saying something slightly different:

1. **Procure-to-Pay Lifecycle** — plain, auditor-friendly; reads as the transaction's life, not a marketing term.
2. **Transaction Flow** — pairs naturally with Transaction 360 and keeps the vocabulary consistent.
3. **Source-to-Settlement** — names the endpoints, signals it starts before the invoice and ends at the bank.
4. **Process Spine** — positions it as the platform's backbone that every system plugs into; distinctive without being cute.
5. **P2P Control Flow** — matches the "control tower" framing and reads well to a Controller or CFO.

My pick would be **Procure-to-Pay Lifecycle** for the header with the seven steps beneath — it survives a CFO room better than an acronym. Say the word and I'll apply whichever you prefer.

## User

what is anotehr nameof P2P ?

## Assistant

P2P stands for **Procure-to-Pay**. Its common aliases:

- **Purchase-to-Pay** — the same acronym, used interchangeably (more common in UK/European finance).
- **Req-to-Cheque / Requisition-to-Payment** — older shared-services phrasing.
- **Source-to-Pay (S2P)** — a wider scope: adds sourcing, supplier onboarding and contracting ahead of the requisition.
- **Supplier lifecycle / Accounts Payable lifecycle** — the narrower, AP-only framing.

If you want the header to avoid the acronym entirely, **Purchase-to-Pay Lifecycle** or **Source-to-Settlement** both read cleanly to a CFO.

## User

Let's call it P2P Control Flow

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Renamed to **P2P Control Flow**.

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Gen 5 - Indian GST Invoice Processing System"
What `list_files` on the project root returns right now (dotfiles, if any, are not shown here):
📁 _ds
📁 uploads
📄 Invoice Processing Agent v1.dc.html
📄 Invoice Processing Agent v2.dc.html
📄 Invoice Processing Agent.dc.html
📄 support.js
User is viewing file: Invoice Processing Agent.dc.html
Current date is now September 21, 2026
</system-info>

<pasted_text name="Pasted text (942 lines)">
============================================================
FINAL TOP-UP PROMPT — THREE CRITICAL UX / FUNCTIONAL CHANGES
============================================================

IMPORTANT:

This is a TOP-UP to the existing Finance Command Center / P2P
Invoice Processing application.

DO NOT redesign the application from scratch.

DO NOT remove or change existing functionality that is already
working, including:

- Finance Command Center
- Four personas:
  CFO
  AP Lead
  Finance Controller
  Finance User
- Persona dropdown
- Persona-specific KPI cards
- 7-step P2P journey
- Invoice Intake &amp; Intelligence
- Requisition &amp; Procurement
- Goods / Service Receipt
- Match, Verify &amp; Approve
- AP Processing &amp; Settlement
- Payment &amp; Treasury
- Reconciliation &amp; P2P Insights
- Zoho Books connector
- Source-system indicators
- Raw Source Transaction Evidence
- Three-Way Match
- Editable line-item workspace
- Transaction 360
- Movable Ask Agent
- Audit Trail
- Existing GST Invoice Processing
- OCR / extraction
- Existing invoice processing workflow

Only implement the following THREE major changes.

============================================================
CHANGE 1 — EDITABLE RESOLUTION COLUMNS IN SOURCE EVIDENCE
============================================================

THIS IS THE MOST IMPORTANT CHANGE.

The existing "Source Transaction Evidence" area currently
shows the PO, GRN and Invoice data.

KEEP THE EXISTING SOURCE DATA.

However, add a new set of EDIT / RESOLUTION columns at the
END of the same table.

The user should NOT have to leave the Source Evidence screen
and go to another backend/front-end screen to correct information
required to resolve a 2-way / 3-way matching issue.

The source evidence table should therefore become:

SOURCE DATA
+
RESOLUTION / USER ACTION COLUMNS

Example structure:

----------------------------------------------------------------------
| PO DATA | GRN DATA | INVOICE DATA | ... | RESOLUTION / CORRECTION |
----------------------------------------------------------------------

The existing source columns can include:

PO Number
PO Line Number
PO Date
Vendor
Item / Service
PO Quantity
PO Rate
PO Amount

GRN Number
GRN Line Number
GRN Date
Received Quantity
Accepted Quantity
GRN Amount

Invoice Number
Invoice Line Number
Invoice Date
Invoice Quantity
Invoice Rate
Invoice Amount

Service Period
GST
Cost Center
GL
etc.

Then at the END of the table, add a visually distinct
RESOLUTION / EDIT section.

============================================================
1A. RESOLUTION COLUMNS
============================================================

Create approximately 3–5 editable/action-oriented columns
at the far right of the source evidence table.

These should be visually different from the source-system data.

Use a subtle but clearly identifiable background / border /
header treatment.

Suggested columns:

1. FIELD TO CORRECT
2. CURRENT VALUE
3. CORRECTED / PROPOSED VALUE
4. REASON / COMMENT
5. ACTION

Example:

---------------------------------------------------------------------------
| PO Qty | GRN Qty | Invoice Qty | ... | Field | Current | Corrected | Action |
---------------------------------------------------------------------------

Example row:

| 60 | 60 | 80 | ... | Invoice Qty | 80 | [60] | [Apply] |

OR:

| GRN No. | ... | Field | Current | New Value | Reason | [Update] |

The exact UI can be designed appropriately, but the key requirement
is that the user can identify the mismatch and resolve the permitted
field DIRECTLY within this area.

============================================================
1B. HIGHLIGHT MATCHING VARIANCES
============================================================

When the system identifies a mismatch, automatically highlight
the affected fields.

Example:

PO Quantity:       60
GRN Quantity:       60
Invoice Quantity:   80

The system should visually identify:

Invoice Quantity = 80
as the variance.

Then the Resolution section should automatically become active.

Example:

------------------------------------------------------------
QUANTITY VARIANCE DETECTED
PO: 60
GRN: 60
Invoice: 80
Variance: +20
------------------------------------------------------------

RESOLUTION

Field:
Invoice Quantity

Current Value:
80

Corrected Value:
[ 60 ]

Reason:
[ Select / Enter reason ]

[ APPLY &amp; REVALIDATE ]

============================================================
1C. RESOLUTION SHOULD SUPPORT DIFFERENT TYPES OF ISSUES
============================================================

Do not hard-code the feature only for Quantity.

The same resolution framework should work for any field
that is relevant to the 2-way / 3-way match.

Potential examples:

Quantity
PO Number
PO Line Number
GRN Number
GRN Line
GRN Date
Invoice Number
Invoice Line
Invoice Date
Rate
Amount
Service Period
Cost Center
GL
Tax / GST information
Vendor reference
etc.

The system should dynamically identify the field that needs
attention based on the detected mismatch.

============================================================
1D. DIRECT RESOLUTION
============================================================

The user should be able to:

1. Identify mismatch
2. Select / see affected field
3. Enter corrected value
4. Add reason
5. Submit / Apply
6. System validates the change
7. System re-runs the relevant matching rules
8. Match result updates

The user should NOT need to:

- leave the invoice
- open another backend screen
- manually search for the invoice again
- navigate to another application
- restart the workflow

The correction should happen directly from the current
transaction workspace.

============================================================
1E. IMPORTANT CONTROL
============================================================

Do NOT allow uncontrolled modification of authoritative
source-system data.

For each field, distinguish between:

SOURCE VALUE
USER-EDITABLE VALUE
CALCULATED VALUE
SYSTEM-AUTHORITATIVE VALUE

If a field can legitimately be edited in the Finance Command Center,
allow direct correction.

If a field belongs to Zoho / ERP and must be corrected at source,
show an appropriate option such as:

[ REQUEST SOURCE CORRECTION ]

rather than silently overwriting the source-system record.

Where an edit is permitted, capture:

Original Value
New Value
User
Timestamp
Reason
Source
Approval if required

============================================================
1F. REVALIDATE AFTER EDIT
============================================================

After the user submits the correction:

[ APPLY &amp; REVALIDATE ]

The system should:

1. Save the proposed change
2. Record the audit trail
3. Re-run validation
4. Re-run 2-way / 3-way match
5. Recalculate affected values
6. Refresh the match status
7. Update the exception status
8. Update Transaction 360

Example:

BEFORE:

PO Qty = 60
GRN Qty = 60
Invoice Qty = 80

3-WAY MATCH:
FAILED

AFTER CORRECTION:

PO Qty = 60
GRN Qty = 60
Invoice Qty = 60

3-WAY MATCH:
PASSED

The screen should clearly communicate that the match
was revalidated after the user action.

============================================================
1G. DO NOT CREATE A SEPARATE SCREEN
============================================================

The Resolution / Correction capability must be integrated
into the EXISTING Source Transaction Evidence table.

Do NOT create another unnecessary page.

The goal is:

SOURCE EVIDENCE
→ IDENTIFY VARIANCE
→ CORRECT
→ REVALIDATE
→ CONTINUE

all within the same transaction workspace.

============================================================
CHANGE 2 — RESTORE AP INBOX
============================================================

The AP Inbox that existed in an earlier version must be restored.

It has been removed from the latest version.

ADD a new final navigation item after:

1. Invoice Intake &amp; Intelligence
2. Requisition &amp; Procurement
3. Goods / Service Receipt
4. Match, Verify &amp; Approve
5. AP Processing &amp; Settlement
6. Payment &amp; Treasury
7. Reconciliation &amp; P2P Insights

Then add:

8. AP INBOX

The final navigation should therefore be:

HOME / COMMAND CENTER

1. Invoice Intake &amp; Intelligence
2. Requisition &amp; Procurement
3. Goods / Service Receipt
4. Match, Verify &amp; Approve
5. AP Processing &amp; Settlement
6. Payment &amp; Treasury
7. Reconciliation &amp; P2P Insights
8. AP Inbox

============================================================
2A. PURPOSE OF AP INBOX
============================================================

The AP Inbox should be the operational queue where AP users
can see ALL relevant invoice transactions.

It should provide a consolidated list of invoices and their
current processing state.

Example columns:

Invoice Number
Vendor
Invoice Date
PO Number
GRN Number
Invoice Amount
Currency
Match Status
Exception Status
Approval Status
AP Processing Status
Payment Status
Ageing
Assigned To
Priority
Current Stage
Last Updated
Action

The exact columns can be optimized for usability.

============================================================
2B. AP INBOX FILTERS
============================================================

Provide filters such as:

Status
Vendor
Invoice Number
PO Number
GRN Number
Date
Amount
Match Status
Exception
Approval Status
Payment Status
Assigned User
Ageing
Priority

Example statuses:

New
OCR Processing
Validation Pending
Match Pending
Match Exception
Verification Pending
Approval Pending
AP Processing
Query Raised
Settlement Pending
Payment Pending
Paid
Reconciliation Pending
Completed

============================================================
2C. AP INBOX SHOULD BE ACTIONABLE
============================================================

Each row should have an action:

[ REVIEW ]

The REVIEW button is extremely important.

When the user clicks:

REVIEW

the system should automatically redirect to the detailed
transaction workspace for THAT PARTICULAR INVOICE.

Do not open a generic page.

Open the exact invoice transaction.

Example:

AP Inbox
→ Invoice INV-100234
→ REVIEW

opens:

Invoice Intake / Source Evidence / Match / Processing
for INV-100234.

============================================================
2D. AP INBOX AND TRANSACTION 360
============================================================

The AP Inbox should connect directly to Transaction 360.

For each invoice:

[ REVIEW ]

opens the invoice transaction.

The detailed transaction page should continue to show:

TRANSACTION 360

on the right-hand side.

The Transaction 360 should show:

Invoice
OCR
PO
GRN
3-Way Match
Verification
Approval
AP Processing
Settlement
Payment
UTR
Reconciliation

Therefore:

AP INBOX
→ REVIEW
→ EXACT INVOICE
→ TRANSACTION 360

============================================================
2E. AP INBOX SHOULD BE THE OPERATIONAL WORK QUEUE
============================================================

The AP Inbox should not be another dashboard.

It should be a practical AP work queue.

The AP Lead should be able to use it for:

- Work allocation
- Prioritization
- Exception handling
- Invoice review
- Ageing management
- SLA management

The Finance User should be able to see:

- My assigned invoices
- My pending actions
- My queries
- My approvals
- My exceptions

Use persona-based filtering where appropriate.

============================================================
CHANGE 3 — AI FLAG + AI ADVISORY
============================================================

Introduce a persistent, contextual:

AI FLAG / AI ADVISORY

during invoice processing, extraction, validation,
source evidence review and three-way matching.

This is NOT the same as the existing global "Ask Agent."

Both should exist.

ASK AGENT:
User-initiated
Movable
General contextual AI assistant

AI ADVISORY:
System-triggered
Issue-specific
Automatically generated when the system identifies a flag.

============================================================
3A. WHEN AI ADVISORY SHOULD APPEAR
============================================================

Automatically trigger an AI Flag when the system detects:

- Quantity mismatch
- Price mismatch
- Amount mismatch
- PO mismatch
- GRN mismatch
- Missing GRN
- Missing PO
- Duplicate invoice risk
- GST inconsistency
- Vendor mismatch
- Service-period issue
- Cost-center inconsistency
- GL issue
- Unusual transaction
- Compliance issue
- Data extraction confidence issue
- Manual override
- Any significant processing anomaly

Do not trigger unnecessary alerts for normal transactions.

============================================================
3B. AI FLAG VISUAL
============================================================

When a flag is detected, show a visible AI indicator on the
RIGHT SIDE of the relevant transaction screen.

Example:

┌──────────────────────────────────────┐
│ ⚠ AI ADVISORY                       │
│                                      │
│ Quantity variance detected          │
│                                      │
│ PO Quantity:       60                │
│ GRN Quantity:      60                │
│ Invoice Quantity:  80                │
│                                      │
│ Variance: +20                       │
│                                      │
│ Recommendation:                     │
│ Review invoice quantity against GRN │
│ before continuing.                  │
│                                      │
│ [ Review Issue ]   [ × ]            │
└──────────────────────────────────────┘

The exact design can be more elegant, but the concept is critical.

============================================================
3C. AI ADVISORY MUST REMAIN THROUGH THE PROCESS
============================================================

Once an important AI Flag has been generated,
the advisory should remain associated with the transaction.

It should not disappear simply because the user navigates
to another part of the invoice.

For example:

Invoice Intake
↓
Extraction
↓
Source Evidence
↓
3-Way Match
↓
Verification
↓
Approval
↓
AP Processing

The AI flag should remain available throughout the transaction
until it is resolved, dismissed, or otherwise closed according
to the workflow.

============================================================
3D. COLLAPSIBLE AI ADVISORY
============================================================

The AI Advisory should have a control that allows the user
to collapse / hide it.

Example:

[ × ]

When clicked:

- The large advisory panel disappears from view.
- A small AI Flag / alert indicator remains visible at the
  right-hand edge of the screen.
- The user can click the indicator at any time to reopen
  the advisory.

Example collapsed state:

                         ┌─────────┐
                         │ ⚠ AI    │
                         │ FLAG 1  │
                         └─────────┘

Clicking it reopens:

AI ADVISORY

This ensures that the AI flag remains visible without
blocking the user's transaction workspace.

============================================================
3E. AI ADVISORY CONTENT
============================================================

The AI Advisory should explain:

1. WHAT was detected
2. WHERE it was detected
3. WHY it matters
4. WHAT the user should do
5. WHAT the system recommends

Example:

WHAT:
Invoice quantity does not match received quantity.

EVIDENCE:
PO = 60
GRN = 60
Invoice = 80

WHY:
Invoice exceeds received quantity by 20 units.

RECOMMENDATION:
Review invoice quantity or verify GRN.

ACTION:
[Review Source Evidence]
[Edit / Correct]
[Revalidate]

Do not make the AI advisory a generic chatbot response.

It must be transaction-specific.

============================================================
3F. AI ADVISORY SHOULD CONNECT TO ACTIONS
============================================================

The AI Advisory should provide direct links to relevant actions.

For example:

[View PO]
[View GRN]
[View Invoice]
[Edit]
[Revalidate]
[Raise Query]
[Request Source Correction]

Clicking an action should take the user directly to
the relevant area of the current transaction.

============================================================
3G. AI FLAG STATUS
============================================================

Each AI flag should have a status:

OPEN
UNDER REVIEW
RESOLVED
DISMISSED
ESCALATED

If a user corrects the issue and revalidation succeeds:

AI FLAG:
✓ RESOLVED

If the user dismisses it:

AI FLAG:
DISMISSED

Capture the action in the Audit Trail.

============================================================
3H. AI ADVISORY + TRANSACTION 360
============================================================

The AI Advisory and Transaction 360 should coexist.

RIGHT SIDE SHOULD CONCEPTUALLY SUPPORT:

TRANSACTION 360

and

AI FLAG / AI ADVISORY

Do not allow the two components to overlap in a confusing manner.

A possible design is:

RIGHT PANEL:

┌──────────────────────────────┐
│ TRANSACTION 360              │
│                              │
│ Invoice       ✓              │
│ PO            ✓              │
│ GRN           ✓              │
│ 3-Way Match   ⚠              │
│ Approval      Pending        │
│ Payment       Pending        │
└──────────────────────────────┘

Then:

┌──────────────────────────────┐
│ ⚠ AI ADVISORY               │
│ Quantity variance detected  │
│                              │
│ [Review] [Edit] [×]          │
└──────────────────────────────┘

If collapsed:

┌──────────────────────────────┐
│ TRANSACTION 360              │
│ ...                          │
└──────────────────────────────┘

                           ⚠ AI

The AI flag should remain accessible.

============================================================
FINAL TRANSACTION EXPERIENCE
============================================================

The final invoice processing experience should now follow:

INVOICE INTAKE
      ↓
OCR / EXTRACTION
      ↓
SOURCE TRANSACTION EVIDENCE
      ↓
PO + GRN + INVOICE DATA
      ↓
AI FLAG IF ISSUE EXISTS
      ↓
EDIT / RESOLUTION COLUMNS
      ↓
3-WAY MATCH
      ↓
REVALIDATE
      ↓
VERIFY / APPROVE
      ↓
AP PROCESSING
      ↓
SUBMIT FOR POSTING
      ↓
PAYMENT
      ↓
RECONCILIATION
      ↓
AP INBOX / COMPLETE STATUS

Throughout the journey:

TRANSACTION 360
remains available.

ASK AGENT
remains available as a movable floating assistant.

AI FLAG / AI ADVISORY
appears automatically when relevant and remains associated
with the transaction until resolved/dismissed.

============================================================
FINAL NAVIGATION
============================================================

The final P2P navigation should be:

HOME / COMMAND CENTER

1. Invoice Intake &amp; Intelligence
2. Requisition &amp; Procurement
3. Goods / Service Receipt
4. Match, Verify &amp; Approve
5. AP Processing &amp; Settlement
6. Payment &amp; Treasury
7. Reconciliation &amp; P2P Insights
8. AP Inbox

Do not remove any of the existing functionality.

============================================================
SUCCESS CRITERIA
============================================================

The enhancement is successful only if:

1. A user can identify a 3-way match issue directly from
   Source Transaction Evidence.

2. The affected field is clearly highlighted.

3. The user can correct an authorized value directly through
   the new Resolution / Edit columns.

4. The user can submit the correction without leaving the
   transaction.

5. The system automatically revalidates the match.

6. An AI Advisory automatically explains significant issues.

7. The AI Advisory can be collapsed but the AI Flag remains
   visible and accessible.

8. The user can follow the invoice through Transaction 360.

9. After processing / posting, the AP Inbox contains the
   invoice and its latest status.

10. Clicking REVIEW in AP Inbox opens the exact invoice
    transaction.

11. The existing Finance Command Center, personas, P2P journey,
    Zoho integration and existing GST invoice functionality
    remain intact.

The overall philosophy remains:

EVIDENCE
→ IDENTIFY ISSUE
→ AI ADVISORY
→ EDIT / RESOLVE
→ REVALIDATE
→ APPROVE
→ PROCESS
→ PAY
→ RECONCILE

The user should be able to complete the transaction from
within the Finance Command Center without unnecessary
navigation to backend systems.
============================================================
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Industry (design system)">
[Design System] This project uses the **Industry** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

This project has the **Industry_indust** design system bound at `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/`. If anything under that path is missing or fails to load, the folder name may differ — `list_files` `_ds/` and use the folder whose name ends with 0942542c-810d-4c59-931a-3e245d9e23ae instead, including in the <link>/<script> paths below.

**Loading the bundle is how you use this design system.** Every Design Component you build must load `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js` in `<helmet>` (include it in child DCs too — de-duped by URL) and compose with its components — do not recreate those components from scratch or restyle raw HTML to look like them. At the top of the template:

```html
<helmet>
  <link rel="stylesheet" href="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/styles.css">
  <script src="_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae/_ds_bundle.js"></script>
</helmet>
```

Then mount any component directly in the template — no logic class needed:

```html
<x-import component-from-global-scope="Industry_indust.Button" hint-size="auto,40px">Label</x-import>
```

Props are template attributes (kebab → camelCase); template children pass through as `props.children`. The linked stylesheet(s) carry the design tokens (colors, type, spacing) — style against those via `var(--*)` and the design system's classes rather than guessing values.

**Start from a template if one matches.** Before building from scratch, check whether a template below matches the user's request. Read the template (list its folder, `read_file` the entry) and decide: if it's close to what's asked, `copy_files` the folder as your starting point; if you'd rather re-author in DC, `dc_write` a new page using the template as your structural reference. When this design system is bound, `copy_files` repoints the copied `ds-base.js` automatically — only edit its base line yourself if the copy result says so, or when copying from an unbound project (change `'../..'` to your `_ds/industry-0942542c-810d-4c59-931a-3e245d9e23ae` path). (Older templates have no `ds-base.js` and carry `../../…` bundle/stylesheet refs in their pages instead — repoint those by hand.)

- `Deck` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/deck/`) — A twenty-one-slide presentation starter: cover, contents, dividers, columns, quadrants, a data table, SVG charts and timeline, bleed imagery, a quote and a close, on the theme's tokens
- `Landing` (`/projects/0942542c-810d-4c59-931a-3e245d9e23ae/templates/landing/`) — A one-page product landing in the system's own voice — an invented product (Holdfast: a fastener catalog), a condensed hero, a numbered spec-sheet plate, wireframe cells and a duotone photograph

The full design-system source tree lives at `/projects/0942542c-810d-4c59-931a-3e245d9e23ae/` — use `list_files` / `read_file` from there for anything not under `_ds/` (layout varies by brand; don't assume folder names). Its guide is reproduced below so you don't need to fetch it:

<design-system-guide>
# Industry design system

Industry is a wireframe: steel-blue on a light technical ground, Barlow Condensed headings over Barlow, a modular grid, and cards, figures and buttons framed as blueprint objects — square-cornered, hairline-bordered, with "+" registration marks at the corners. Cards and figures stay transparent line drawings; the primary button is the one solid object on the board, an accent fill that keeps the square corners and the marks. Photography is duotoned into the steel accent and icons are thin-stroke.

## How to use this

- Link the one stylesheet from every page — `&lt;link rel="stylesheet" href="styles.css"&gt;` (adjust the relative path) — and take every color, font, spacing, radius and shadow from its variables (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Never hard-code a hex, a font name or a px value the tokens already carry.
- Build with the classes below rather than inventing parallel ones; the component pages are plain HTML, so view source and copy the markup.
- `templates/` holds starting points a consuming project can copy whole.
- The whole system was derived from `theme.json`. To change the look, edit the tokens at the top of `styles.css` — every page, the thumbnail and this guide read from them — and keep `theme.json` and the written guidance in step so they don't drift from what the CSS actually does.

## Direction

Modular grid layouts — content in equal-width cells, strong horizontal and vertical rhythm, visible structure. Cards, buttons and major sections are wireframe objects: square-cornered, thin-bordered, with `+` crosshair corner marks (the `.blueprint` class + four `&lt;i class="corner tl/tr/bl/br"&gt;` children) — never soft filled rounded blocks. Images and figures get the same treatment: square, hairline-framed and marked, never rounded or clipped. Wrap hero and inline images in the `.duotone` class — they are desaturated and washed in the accent, like a screen print that re-colors with the theme.

## Color

A light ground (`--color-bg` #f2f2f3) with `--color-text` #1d1f20 and a single accent #5980a6 (this is a mono scheme: no second accent was chosen — the `--color-accent-2-*` variables carry a machine-derived stand-in kept only so both sets resolve; treat them as one role). Each role carries a 100–900 tonal ramp (`--color-neutral-100` … `--color-accent-2-900`) generated in OKLCH on a shared perceptual lightness scale, so the same step of any ramp has the same visual weight. Use the light steps (100–300) for tinted fills, hovers and subtle borders, 500 as the role's base, and the dark steps (700–900) for text on tinted fills and for pressed states; prefer ramp steps over ad-hoc `color-mix()`. For elevation use `--shadow-sm/md/lg` (already tuned to the ground) rather than ad-hoc box-shadows.

## Type

Barlow Condensed for headings over Barlow for body text, loaded as `--font-heading` / `--font-body`. Density 0.85× and radius 4px are already baked into the `--space-*` / `--radius-*` scales — use the variables, not raw numbers.

## Icons

Use Lucide icons (https://lucide.dev), at stroke-width 1.5 for a lighter, more technical look throughout.

## Interaction states

Interactive states are themed, never browser defaults: give every interactive element a `:hover` tint and a pressed state from the accent ramp (one step past the base — `--color-accent-600` on a light ground, `--color-accent-400` on a dark one, or a `color-mix()` tint for outlined/ghost variants), and style keyboard focus with `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — never leave the default blue focus ring.

## Components

| Class | What it is | Shown in |
| --- | --- | --- |
| `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block` | Actions — the primary is a solid accent fill | components/buttons.html |
| `.tag` with `.tag-accent`, `.tag-accent-2`, `.tag-neutral`, `.tag-outline` | Small labels tinted from the ramps (mono palette: accent-2 reads the same as accent) | components/buttons.html |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | Form fields and choices on native elements — no script | components/forms.html |
| `.card` with `.card-kicker`, `.card-title`, `.card-body`, `.card-meta`; `.elev-sm/md/lg` | Transparent, hairline-bordered cards with corner registration marks | components/cards.html |
| `.nav` + `.nav-brand` | The header bar | components/navigation.html |
| `.table` | Data tables with themed header and row rules | components/table.html |
| `.dialog-backdrop` + `.dialog` (+ `.dialog-title/-body/-actions`) | A modal at the top elevation | components/dialog.html |
| `.hr` | A horizontal rule — present, but this system prefers whitespace; avoid it | — |
| `.blueprint` + four `&lt;i class="corner tl/tr/bl/br"&gt;` children | The wireframe frame every card, figure and primary button wears | components/cards.html |
| `.duotone` | The image wrapper — every content photograph goes through it | foundations/image.html |

States are built in: hovers and pressed states come from the accent ramp, keyboard focus is the 2px accent `:focus-visible` ring, `::selection` is an accent tint, and disabled controls drop to 45% opacity. Don't restyle them per page. The accent-to-ground pair is tuned to at least 3:1 — enough for icons, large text and interface chrome, not for body copy — so for paragraph-size text in the accent use a deep ramp step (`--color-accent-700` on this ground) rather than the accent itself.

## Do

- Frame cards, figures and primary buttons as blueprint objects: the `.blueprint` class plus four `&lt;i class="corner …"&gt;` marks.
- Keep the grid visible — equal cells, strong horizontal and vertical rhythm.
- Condense headings (Barlow Condensed) and keep body copy in Barlow.
- Duotone photographs with the `.duotone` wrapper so they take the accent.

## Don't

- Do not round cards, figures or buttons, and do not give cards or figures a surface fill — they are line drawings (the solid accent primary button is the one deliberate exception).
- Do not drop the registration marks from a framed element.
- Do not use thick icon strokes; the set is Lucide at 1.5.
- Do not add decorative color beyond the steel accent. The accent's own deep step (`--color-accent-900`) may carry a full field where the deck's section dividers use it — steel as ground, type reversed to paper. (The landing's numbers sit on a drawn spec-sheet plate on the paper ground instead — its own grammar, not a field.)

## Files

- `styles.css` — the only stylesheet: the token sheet (`:root` variables, ramps, base type) plus the component layer. Link it from every page.
- `readme.md` — this guide.
- `theme.json` — the parameters these files were derived from (a machine-readable record of the theme).
- `thumbnail.html` — the project cover (brand mark + swatches).
- `foundations/type.html` — the type scale and the heading/body pairing at real sizes.
- `foundations/color.html` — color roles and the 100-900 tonal ramps, with usage notes.
- `foundations/layout.html` — the spacing scale, the grid and how edges are drawn.
- `foundations/icons.html` — the icon set at interface sizes, inline and in buttons.
- `foundations/image.html` — how photographs and figures are treated.
- `components/buttons.html` — buttons, icon buttons and tags in every variant and state.
- `components/forms.html` — text fields, radios and the segmented control on native elements.
- `components/cards.html` — content cards and the elevation steps.
- `components/navigation.html` — the header bar pattern.
- `components/table.html` — a data table with the themed header and row rules.
- `components/dialog.html` — a modal over its backdrop at the top elevation.
- `theme.html` — the theme's parameters rendered as a reference sheet.
- `templates/landing/` — a starter page consuming the system the intended way (`index.html`, its `ds-base.js` loader, and the vendored `image-slot.js` its photograph mounts).
- `assets/photo.jpg` — the reference photograph the imagery page treats.

</design-system-guide>
</attached-skill>

## Assistant

_[tool: snip]_

_[tool: grep]_

Now adding the three changes: resolution columns, AP Inbox nav item, AI Advisory panel.

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

Now the AI Advisory panel (change 3).

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

All three changes applied, nothing else touched.

**1. Resolution columns in Source Evidence** — a distinct banded section at the foot of the same evidence table, active whenever a variance exists. It names the field, its source of truth, current value, an editable corrected value, a reason dropdown and the action. Command-Center-owned fields (invoice quantity, cost centre, PO reference) are editable with **Apply & Revalidate**; Zoho-authoritative fields (GRN and PO quantities) are locked and offer **Request Source Correction** instead. Applying re-runs the match in place — no navigation away, no separate screen.

**2. AP Inbox restored** as nav item 8, with its KPI strip, filters, search and the row action that opens the exact invoice.

**3. AI Advisory** — a system-triggered panel on the right of transaction screens, distinct from Ask Agent. It states what was detected, the evidence values, why it matters and the recommendation, with direct actions (Review evidence / Correct & revalidate / Park / Dismiss). Closing it collapses to a small ⚠ AI FLAG tab on the right edge that reopens it; it persists across extraction, evidence, match and AP processing, and flips to **Resolved** once revalidation passes.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

_[tool: grep]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Both fixed:

1. **REVIEW is a real button** in the Action column — it loads that invoice's transaction, opens the Source Evidence workspace and pops Transaction 360 alongside it. The three demo invoices map by invoice number; other rows route by PO type and match state.
2. **Ask Agent no longer sits on top of the AI Advisory** — it now defaults to the lower-left of the content area, leaving the top-right band to the advisory. Both are readable on arrival and the chat is still fully draggable.

## User

I need to create its entire backend code how shall i do it?

## Assistant

Two routes, depending on what you want out of the next phase.

**Fastest credible path — a handoff package from this prototype.** The prototype already encodes the domain model (invoice, PO, GRN, match rules, exceptions, corrections, audit trail, statuses). I can generate a developer handoff: entity/field schemas, API contracts per screen, state machine for the P2P statuses, match-rule specification, and the AI-agent step definitions. Your engineering team then builds against that instead of reverse-engineering the UI.

**Reference architecture I'd propose for the real build:**

- **API layer** — FastAPI (Python) or NestJS; REST for CRUD, one async job endpoint per agent stage.
- **Data** — Postgres for transactional data (invoices, lines, PO/GRN snapshots, match results, corrections, audit), S3-compatible object store for source documents, Redis for job queues.
- **Agent orchestration** — a step pipeline (Celery/Temporal): classify → extract → vendor/GSTIN resolve → PO/GRN fetch → dedupe → 2/3-way match → exception classify → recommend. Each step writes an immutable event row, which is what feeds Transaction 360 and the audit trail.
- **Extraction** — document AI (Azure Document Intelligence, AWS Textract or a VLM) plus a GST-specific post-processor for GSTIN/HSN-SAC/IGST vs CGST+SGST/TDS validation.
- **Integrations** — Zoho Books REST API (OAuth, webhooks for PO/GRN changes), SAP via OData/BAPI for posting. Source-correction requests become outbound cases, never silent writes — that rule from the UI must hold in the backend.
- **Controls** — field-level provenance (source / user-editable / calculated / authoritative), every correction stored as original → new + user + timestamp + reason, and DOA approval enforced server-side.

**Important caveat:** I design and prototype in HTML — I can produce the specification, schemas, API contracts and rule definitions, but I'm not the right tool for authoring and running a production backend codebase. That belongs in your dev environment.

Want me to generate the handoff package (schemas + API contracts + match-rule spec + status state machine) as a document from this prototype?

## User

Save as standalone HTML: `Invoice Processing Agent.dc.html`

