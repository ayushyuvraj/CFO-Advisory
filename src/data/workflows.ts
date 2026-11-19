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

/**
 * Verified Physical Workflows Registry.
 * In accordance with the Zero Simulation Invariant, only physically deployed,
 * working platforms and workflows are registered here.
 */
export const WORKFLOWS: WorkflowItem[] = [
  {
    id: "invoice-processing-p2p",
    title: "AI Invoice Processing",
    pillar: "Transformation & AI",
    status: "Active",
    sourceSystems: ["Zoho Books", "SAP S/4HANA", "Gemini 2.5 Flash"],
    cadence: "Real-time Event-Driven",
    lastRunAt: "Active Service (Port 5173 / 8000)",
    studioUrl: "http://localhost:5173",
    owner: "Autonomous AP Practice",
    controlTier: "SOX-Aligned Tier 1",
    executiveSummary:
      "Autonomous GST tax invoice intake, multimodal Gemini document extraction, real-time 3-way variance reconciliation against Zoho Books and SAP S/4HANA, exception resolution, and payment release.",
    executionSteps: [
      {
        id: "STEP-01",
        stage: "Multimodal Gemini vision extraction of GST invoice and line items",
        system: "Gemini 2.5 Flash",
        duration: "1m 12s",
        status: "Completed",
      },
      {
        id: "STEP-02",
        stage: "Autonomous 3-way reconciliation against Zoho Books and SAP PO/GRN",
        system: "SAP S/4HANA & Zoho Books",
        duration: "0m 45s",
        status: "Completed",
      },
      {
        id: "STEP-03",
        stage: "GST tax rule compliance verification and vendor threshold check",
        system: "GST Intelligence Mesh",
        duration: "0m 30s",
        status: "Verified",
      },
      {
        id: "STEP-04",
        stage: "Publish telemetry to CFO Advisory Audit Mesh and release voucher",
        system: "CFO Telemetry API",
        duration: "0m 08s",
        status: "Completed",
      },
    ],
  },
];

export const WORKFLOW_PILLARS: Array<"All" | WorkflowPillar> = [
  "All",
  "Transformation & AI",
];
