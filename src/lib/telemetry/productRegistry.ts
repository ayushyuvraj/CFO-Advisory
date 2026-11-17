import fs from "fs";
import path from "path";
import crypto from "crypto";
import { RegisteredProduct } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "cfo_products_registry.json");

const SEED_PRODUCTS: RegisteredProduct[] = [
  {
    id: "invoice-processing-p2p",
    name: "AI Invoice Processing & P2P Intelligence",
    shortName: "Invoice Processing",
    description:
      "Autonomous GST tax invoice intake, multimodal Gemini document extraction, real-time 3-way variance reconciliation against Zoho Books and SAP S/4HANA, exception resolution, and payment release.",
    pillar: "TRANSFORMATION_AI",
    launchUrl: "http://localhost:5173",
    portFrontend: 5173,
    portBackend: 8000,
    apiKey: "kpmg_sec_prod_invoice_p2p_live",
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
    createdAt: "2026-11-12T14:00:00.000Z",
  },
  {
    id: "liquidity-stress-test",
    name: "13-Week Rolling Liquidity Stress Test",
    shortName: "Liquidity Stress Test",
    description:
      "High-frequency treasury liquidity forecasting, cash conversion cycle optimization, and automated FX stress modeling bridging SAP S/4HANA and Kyriba.",
    pillar: "TREASURY",
    launchUrl: "http://localhost:3002",
    portFrontend: 3002,
    portBackend: 8002,
    apiKey: "kpmg_sec_prod_liquidity_live",
    status: "active",
    tags: ["Treasury", "Kyriba", "13-Week Forecast", "Cash Flow"],
    features: [
      "Variance decomposition between direct cash and accounting balance",
      "Dynamic liquidity buffer alerts under multi-currency shock scenarios",
      "Autonomous working capital conversion cycle recommendations",
    ],
    systemIntegration: "SAP S/4HANA · Kyriba TMS · Bloomberg Terminal",
    createdAt: "2026-11-13T10:00:00.000Z",
  },
  {
    id: "intelligent-close-recon",
    name: "Intelligent Close Intercompany Reconciliation",
    shortName: "Close Reconciliation",
    description:
      "Continuous month-end close acceleration, multi-entity transaction matching, and discrepancy netting powered by GenAI narrative engines.",
    pillar: "CLOSE_REPORT",
    launchUrl: "http://localhost:3003",
    portFrontend: 3003,
    portBackend: 8003,
    apiKey: "kpmg_sec_prod_close_live",
    status: "active",
    tags: ["Close-to-Report", "Workday", "BlackLine", "IFRS/GAAP"],
    features: [
      "Automated elimination entry drafting for intercompany balances",
      "SOX-aligned audit trails with cryptographic approval logs",
      "Flux and balance sheet variance auto-narration for CFO review",
    ],
    systemIntegration: "Workday Financials · BlackLine · Oracle Cloud ERP",
    createdAt: "2026-11-14T11:30:00.000Z",
  },
];

function ensureDirectoryExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getAllProducts(): RegisteredProduct[] {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(REGISTRY_FILE)) {
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(SEED_PRODUCTS, null, 2), "utf8");
      return SEED_PRODUCTS;
    }
    const data = fs.readFileSync(REGISTRY_FILE, "utf8");
    const parsed = JSON.parse(data) as RegisteredProduct[];
    return parsed.length > 0 ? parsed : SEED_PRODUCTS;
  } catch (err) {
    console.error("[Product Registry] Error reading registry file:", err);
    return SEED_PRODUCTS;
  }
}

export function getProductById(id: string): RegisteredProduct | undefined {
  const products = getAllProducts();
  return products.find((p) => p.id === id);
}

export function getProductByApiKey(apiKey: string): RegisteredProduct | undefined {
  const products = getAllProducts();
  return products.find((p) => p.apiKey === apiKey);
}

export interface RegisterProductInput {
  name: string;
  slug?: string;
  shortName?: string;
  description: string;
  pillar: "TRANSFORMATION_AI" | "TREASURY" | "CLOSE_REPORT" | "EPM";
  launchUrl: string;
  portFrontend?: number;
  portBackend?: number;
  tags?: string[];
  features?: string[];
  systemIntegration?: string;
}

export function registerProduct(input: RegisterProductInput): RegisteredProduct {
  ensureDirectoryExists();
  const products = getAllProducts();
  
  const slug = input.slug
    ? input.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-")
    : input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const existing = products.find((p) => p.id === slug);
  if (existing) {
    throw new Error(`A product with the identifier '${slug}' is already registered.`);
  }

  const randomSecret = crypto.randomBytes(16).toString("hex");
  const apiKey = `kpmg_sec_prod_${slug}_${randomSecret}`;

  const newProduct: RegisteredProduct = {
    id: slug,
    name: input.name,
    shortName: input.shortName || input.name.split(" ")[0],
    description: input.description,
    pillar: input.pillar,
    launchUrl: input.launchUrl,
    portFrontend: input.portFrontend,
    portBackend: input.portBackend,
    apiKey,
    status: "active",
    tags: input.tags && input.tags.length > 0 ? input.tags : ["Autonomous AI", "Connected Platform"],
    features: input.features && input.features.length > 0 ? input.features : [
      "Autonomous multi-stage execution with enterprise governance",
      "Real-time distributed telemetry streaming to CFO Advisory Hub",
      "Integrated audit logging and compliance verification",
    ],
    systemIntegration: input.systemIntegration || "Enterprise ERP Gateway",
    createdAt: new Date().toISOString(),
  };

  const updated = [newProduct, ...products];
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(updated, null, 2), "utf8");
  return newProduct;
}
