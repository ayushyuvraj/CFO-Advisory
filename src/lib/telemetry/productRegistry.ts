import path from "path";
import crypto from "crypto";
import {
  mutateJsonFile,
  readJsonStrict,
  resolveDataDir,
} from "@/lib/storage/jsonFileStore";
import { RegisteredProduct } from "./types";

function getRegistryFile(): string {
  return path.join(resolveDataDir(), "cfo_products_registry.json");
}

// ONLY actual, physically existing products are seeded here.
// No simulations, no mock products, no placeholder platforms.
const SEED_PRODUCTS: RegisteredProduct[] = [
  {
    id: "invoice-processing-p2p",
    name: "AI Invoice Processing",
    shortName: "Invoice Processing",
    description:
      "Autonomous GST tax invoice intake, multimodal Gemini document extraction, real-time 3-way variance reconciliation against Zoho Books and SAP S/4HANA, exception resolution, and payment release.",
    pillar: "TRANSFORMATION_AI",
    launchUrl: "http://localhost:5173",
    portFrontend: 5173,
    portBackend: 8000,
    apiKey:
      process.env.INVOICE_P2P_API_KEY || "",
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
];

const VALID_PILLARS = new Set<RegisteredProduct["pillar"]>([
  "TRANSFORMATION_AI",
  "TREASURY",
  "CLOSE_REPORT",
  "EPM",
]);

function validateProductsArray(raw: unknown): RegisteredProduct[] {
  if (!Array.isArray(raw)) {
    throw new Error("Product registry file is corrupted.");
  }
  return raw.length > 0 ? (raw as RegisteredProduct[]) : [...SEED_PRODUCTS];
}

export function isSafeLaunchUrl(urlStr: string): boolean {
  if (typeof urlStr !== "string") return false;
  const trimmed = urlStr.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) return false;
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function sanitizePort(val: unknown): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isInteger(num) || num < 1 || num > 65535) {
    throw new Error("Port numbers must be integers between 1 and 65535.");
  }
  return num;
}

export function getAllProducts(): RegisteredProduct[] {
  return readJsonStrict(
    getRegistryFile(),
    () => [...SEED_PRODUCTS],
    validateProductsArray
  );
}

export function getPublicProducts(): Omit<RegisteredProduct, "apiKey">[] {
  return getAllProducts().map((p) => {
    const { apiKey: _stripped, ...rest } = p;
    void _stripped;
    return rest;
  });
}

export function getProductById(id: string): RegisteredProduct | undefined {
  return getAllProducts().find((p) => p.id === id);
}

export function getProductByApiKey(apiKey: string): RegisteredProduct | undefined {
  if (typeof apiKey !== "string" || !apiKey.trim()) return undefined;
  const candidateHash = crypto.createHash("sha256").update(apiKey.trim()).digest();
  const products = getAllProducts();
  for (const p of products) {
    if (!p.apiKey) continue;
    const storedHash = crypto.createHash("sha256").update(p.apiKey).digest();
    if (crypto.timingSafeEqual(candidateHash, storedHash)) {
      return p;
    }
  }
  return undefined;
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
  const cleanName = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!cleanName) {
    throw new Error("Product name is required.");
  }
  const cleanDesc =
    typeof input.description === "string" ? input.description.trim().slice(0, 1000) : "";
  if (!cleanDesc) {
    throw new Error("Product description is required.");
  }
  if (!VALID_PILLARS.has(input.pillar)) {
    throw new Error(
      "Pillar must be one of TRANSFORMATION_AI, TREASURY, CLOSE_REPORT, or EPM."
    );
  }
  const cleanUrl = typeof input.launchUrl === "string" ? input.launchUrl.trim() : "";
  if (!isSafeLaunchUrl(cleanUrl)) {
    throw new Error(
      "launchUrl must be a valid https:// URL (or http://localhost for local platforms)."
    );
  }

  const portFrontend = sanitizePort(input.portFrontend);
  const portBackend = sanitizePort(input.portBackend);

  const rawSlug =
    typeof input.slug === "string" && input.slug.trim()
      ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-")
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const slug = rawSlug.replace(/^-+|-+$/g, "").slice(0, 64);
  if (!slug) {
    throw new Error("A valid alphanumeric product slug is required.");
  }

  return mutateJsonFile(
    getRegistryFile(),
    () => [...SEED_PRODUCTS],
    validateProductsArray,
    (products) => {
      if (products.some((p) => p.id === slug)) {
        throw new Error(
          `A product with the identifier '${slug}' is already registered.`
        );
      }

      const randomSecret = crypto.randomBytes(20).toString("hex");
      const apiKey = `kpmg_sec_prod_${slug}_${randomSecret}`;

      const cleanTags = Array.isArray(input.tags)
        ? input.tags
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
            .map((t) => t.trim().slice(0, 48))
            .slice(0, 12)
        : [];
      const cleanFeatures = Array.isArray(input.features)
        ? input.features
            .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
            .map((f) => f.trim().slice(0, 200))
            .slice(0, 12)
        : [];

      const newProduct: RegisteredProduct = {
        id: slug,
        name: cleanName,
        shortName:
          typeof input.shortName === "string" && input.shortName.trim()
            ? input.shortName.trim().slice(0, 40)
            : cleanName.split(" ")[0].slice(0, 40),
        description: cleanDesc,
        pillar: input.pillar,
        launchUrl: cleanUrl,
        portFrontend,
        portBackend,
        apiKey,
        status: "active",
        tags: cleanTags.length > 0 ? cleanTags : ["Autonomous AI", "Connected Platform"],
        features:
          cleanFeatures.length > 0
            ? cleanFeatures
            : [
                "Autonomous multi-stage execution with enterprise governance",
                "Real-time distributed telemetry streaming to CFO Advisory Hub",
                "Integrated audit logging and compliance verification",
              ],
        systemIntegration:
          typeof input.systemIntegration === "string" && input.systemIntegration.trim()
            ? input.systemIntegration.trim().slice(0, 180)
            : "Enterprise ERP Gateway",
        createdAt: new Date().toISOString(),
      };

      return {
        next: [newProduct, ...products],
        result: newProduct,
      };
    }
  );
}
