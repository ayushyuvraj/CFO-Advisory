export interface ConnectedPlatform {
  id: string;
  title: string;
  shortName: string;
  category: string;
  description: string;
  launchUrl: string;
  portFrontend: number;
  portBackend?: number;
  status: "active" | "maintenance" | "offline";
  tags: string[];
  features: string[];
  systemIntegration: string;
}

/**
 * Registry of enterprise platforms attached to KPMG CFO Advisory.
 * To attach new platforms (N products), simply append new platform definitions to this array.
 */
export const CONNECTED_PLATFORMS: ConnectedPlatform[] = [
  {
    id: "invoice-processing-p2p",
    title: "AI Invoice Processing & P2P Intelligence",
    shortName: "Invoice Processing",
    category: "Procure-to-Pay Automation & Autonomous AP",
    description:
      "Autonomous GST tax invoice intake, multimodal Gemini document extraction, real-time 3-way variance reconciliation against Zoho Books and SAP S/4HANA, exception resolution, and payment release.",
    launchUrl: "http://localhost:5173",
    portFrontend: 5173,
    portBackend: 8000,
    status: "active",
    tags: [
      "Vite :5173",
      "FastAPI :8000",
      "GST Compliance",
      "Zoho Books & SAP",
      "P2P Control Flow",
    ],
    features: [
      "Multimodal 10-stage document extraction with visual bounding boxes",
      "Line-item 3-way match across PO, GRN, and vendor tax invoices",
      "Delegated authority (DOA) approvals and treasury payment release",
      "End-to-end audit lineage tracking in Indian GST compliance context",
    ],
    systemIntegration: "SAP S/4HANA · Zoho Books · Bank H2H Gateway",
  },
];
