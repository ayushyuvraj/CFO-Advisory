export type WorkflowStatus = "Active" | "Scheduled" | "Review";

export type WorkflowPillar =
  | "EPM / FP&A"
  | "Transformation & AI"
  | "Treasury"
  | "Close-to-Report";

export interface ExecutionStep {
  id: string;
  stage: string;
  system: string;
  duration: string;
  status: "Completed" | "Verified" | "Pending";
}

export interface WorkflowItem {
  id: string;
  title: string;
  pillar: WorkflowPillar;
  status: WorkflowStatus;
  sourceSystems: string[];
  cadence: string;
  lastRunAt: string;
  studioUrl: string;
  owner: string;
  controlTier: string;
  executiveSummary: string;
  executionSteps: ExecutionStep[];
}

export const WORKFLOWS: WorkflowItem[] = [
  {
    id: "WF-TR-104",
    title: "13-Week Rolling Liquidity Stress Test",
    pillar: "Treasury",
    status: "Active",
    sourceSystems: ["SAP S/4HANA", "Kyriba"],
    cadence: "Daily at 06:00 UTC",
    lastRunAt: "Today, 06:04 UTC",
    studioUrl: "https://studio.kpmg-advisory.example/workflows/wf-tr-104",
    owner: "Global Treasury Practice",
    controlTier: "SOX-Aligned Tier 1",
    executiveSummary:
      "Aggregates multi-bank cash balances, committed credit facilities, and FX sensitivity scenarios into a board-ready 13-week liquidity runway.",
    executionSteps: [
      {
        id: "STEP-01",
        stage: "Ingest SAP S/4HANA open AR/AP subledgers",
        system: "SAP S/4HANA",
        duration: "1m 18s",
        status: "Completed",
      },
      {
        id: "STEP-02",
        stage: "Reconcile global bank statements and sweeping pools",
        system: "Kyriba TMS",
        duration: "0m 52s",
        status: "Completed",
      },
      {
        id: "STEP-03",
        stage: "Run rate shock and covenant headroom simulations",
        system: "Workflow Studio Engine",
        duration: "1m 44s",
        status: "Verified",
      },
      {
        id: "STEP-04",
        stage: "Publish CFO Treasury brief with variance triggers",
        system: "Workflows Hub",
        duration: "0m 19s",
        status: "Completed",
      },
    ],
  },
  {
    id: "WF-CR-208",
    title: "Intelligent Close Intercompany Recon",
    pillar: "Close-to-Report",
    status: "Active",
    sourceSystems: ["Workday", "BlackLine"],
    cadence: "Hourly during Close (BD1-BD5)",
    lastRunAt: "42 minutes ago",
    studioUrl: "https://studio.kpmg-advisory.example/workflows/wf-cr-208",
    owner: "Accounting Advisory Group",
    controlTier: "SOX-Aligned Tier 1",
    executiveSummary:
      "Matches cross-entity ledger pairs across legal entities, isolates FX translation mismatches, and routes materiality exceptions to regional controllers.",
    executionSteps: [
      {
        id: "STEP-01",
        stage: "Extract intercompany trial balances by entity",
        system: "Workday Financials",
        duration: "1m 05s",
        status: "Completed",
      },
      {
        id: "STEP-02",
        stage: "Execute deterministic and fuzzy invoice pairing",
        system: "BlackLine",
        duration: "2m 11s",
        status: "Completed",
      },
      {
        id: "STEP-03",
        stage: "Apply IFRS / US GAAP elimination policy rules",
        system: "Workflow Studio Engine",
        duration: "0m 48s",
        status: "Verified",
      },
      {
        id: "STEP-04",
        stage: "Queue controller sign-off packet for close cockpit",
        system: "Workflows Hub",
        duration: "0m 16s",
        status: "Completed",
      },
    ],
  },
  {
    id: "WF-FP-312",
    title: "GenAI Flux & Variance Narrative Engine",
    pillar: "EPM / FP&A",
    status: "Active",
    sourceSystems: ["Anaplan", "Snowflake"],
    cadence: "Weekly & Period Close",
    lastRunAt: "Yesterday, 19:30 UTC",
    studioUrl: "https://studio.kpmg-advisory.example/workflows/wf-fp-312",
    owner: "EPM Transformation Practice",
    controlTier: "Audit-Logged Tier 2",
    executiveSummary:
      "Synthesizes driver-based price, volume, and mix deltas into grounded management commentary with line-item citations back to source ledgers.",
    executionSteps: [
      {
        id: "STEP-01",
        stage: "Query actuals vs. rolling forecast cubes",
        system: "Anaplan",
        duration: "0m 58s",
        status: "Completed",
      },
      {
        id: "STEP-02",
        stage: "Join unit margin and regional SKU telemetry",
        system: "Snowflake",
        duration: "1m 27s",
        status: "Completed",
      },
      {
        id: "STEP-03",
        stage: "Generate grounded variance memo with citation checks",
        system: "Workflow Studio Engine",
        duration: "1m 09s",
        status: "Verified",
      },
      {
        id: "STEP-04",
        stage: "Deliver executive FP&A narrative pack",
        system: "Workflows Hub",
        duration: "0m 14s",
        status: "Completed",
      },
    ],
  },
  {
    id: "WF-CR-419",
    title: "CSRD Scope 3 Carbon Ledger Rollup",
    pillar: "Close-to-Report",
    status: "Review",
    sourceSystems: ["SAP Sustainability", "Azure"],
    cadence: "Monthly Consolidation",
    lastRunAt: "3 days ago",
    studioUrl: "https://studio.kpmg-advisory.example/workflows/wf-cr-419",
    owner: "ESG Assurance & Reporting",
    controlTier: "Assurance-Ready Tier 1",
    executiveSummary:
      "Normalizes supplier emissions factors against procurement spend ledgers to produce ESRS-compliant Scope 3 disclosures ready for limited assurance.",
    executionSteps: [
      {
        id: "STEP-01",
        stage: "Pull category spend and supplier activity datasets",
        system: "SAP Sustainability",
        duration: "2m 04s",
        status: "Completed",
      },
      {
        id: "STEP-02",
        stage: "Map emissions factors and flag estimation gaps",
        system: "Azure Data Lake",
        duration: "1m 38s",
        status: "Completed",
      },
      {
        id: "STEP-03",
        stage: "Validate ESRS E1 disclosure evidence lineage",
        system: "Workflow Studio Engine",
        duration: "1m 12s",
        status: "Pending",
      },
      {
        id: "STEP-04",
        stage: "Stage audit committee assurance binder",
        system: "Workflows Hub",
        duration: "0m 22s",
        status: "Pending",
      },
    ],
  },
  {
    id: "WF-TA-502",
    title: "Powered Finance Target Operating Bridge",
    pillar: "Transformation & AI",
    status: "Scheduled",
    sourceSystems: ["Oracle Fusion", "ServiceNow"],
    cadence: "Bi-Weekly Governance Cycle",
    lastRunAt: "5 days ago",
    studioUrl: "https://studio.kpmg-advisory.example/workflows/wf-ta-502",
    owner: "Powered Finance Architecture",
    controlTier: "Governance Tier 2",
    executiveSummary:
      "Tracks global business services migration milestones, ERP process standardization compliance, and digital finance agent adoption across regions.",
    executionSteps: [
      {
        id: "STEP-01",
        stage: "Collect chart-of-accounts harmonization telemetry",
        system: "Oracle Fusion",
        duration: "1m 31s",
        status: "Completed",
      },
      {
        id: "STEP-02",
        stage: "Ingest GBS ticket deflection and SLA transitions",
        system: "ServiceNow",
        duration: "0m 49s",
        status: "Completed",
      },
      {
        id: "STEP-03",
        stage: "Evaluate Powered Finance maturity checkpoints",
        system: "Workflow Studio Engine",
        duration: "0m 55s",
        status: "Verified",
      },
      {
        id: "STEP-04",
        stage: "Refresh steering committee transformation brief",
        system: "Workflows Hub",
        duration: "0m 15s",
        status: "Completed",
      },
    ],
  },
  {
    id: "WF-TR-615",
    title: "Working Capital Cash Conversion Optimizer",
    pillar: "Treasury",
    status: "Active",
    sourceSystems: ["SAP S/4HANA", "Power BI"],
    cadence: "Every 6 Hours",
    lastRunAt: "2 hours ago",
    studioUrl: "https://studio.kpmg-advisory.example/workflows/wf-tr-615",
    owner: "Working Capital Advisory",
    controlTier: "SOX-Aligned Tier 1",
    executiveSummary:
      "Identifies trapped cash across DSO, DPO, and inventory buffers by business unit, prioritizing collections and supplier term adjustments.",
    executionSteps: [
      {
        id: "STEP-01",
        stage: "Streamline customer aging and vendor payment terms",
        system: "SAP S/4HANA",
        duration: "1m 22s",
        status: "Completed",
      },
      {
        id: "STEP-02",
        stage: "Compute SKU-level inventory velocity bands",
        system: "Workflow Studio Engine",
        duration: "1m 14s",
        status: "Verified",
      },
      {
        id: "STEP-03",
        stage: "Score top working capital release levers",
        system: "Workflow Studio Engine",
        duration: "0m 46s",
        status: "Completed",
      },
      {
        id: "STEP-04",
        stage: "Sync executive cash release scorecard",
        system: "Power BI",
        duration: "0m 18s",
        status: "Completed",
      },
    ],
  },
];

export const WORKFLOW_PILLARS: Array<"All" | WorkflowPillar> = [
  "All",
  "EPM / FP&A",
  "Transformation & AI",
  "Treasury",
  "Close-to-Report",
];
