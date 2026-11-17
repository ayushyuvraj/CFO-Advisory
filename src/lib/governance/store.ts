import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  ClientGovernanceData,
  CompanyEntitlement,
  CompanyPersona,
  CompanyProfile,
  CreateCompanyInput,
  CreatePersonaInput,
  UpdateCompanyInput,
  UpdatePersonaInput,
} from "./types";

function getDataDir(): string {
  if (process.env.CFO_DATA_DIR) {
    return process.env.CFO_DATA_DIR;
  }
  const parentData = path.join(process.cwd(), "..", "data");
  if (
    fs.existsSync(parentData) &&
    fs.existsSync(path.join(parentData, "cfo_products_registry.json"))
  ) {
    return parentData;
  }
  return path.join(process.cwd(), "data");
}

const DATA_DIR = getDataDir();
const GOVERNANCE_FILE = path.join(DATA_DIR, "cfo_client_governance.json");

const EMPTY_GOVERNANCE_DATA: ClientGovernanceData = {
  companies: [],
  entitlements: [],
  personas: [],
};

function ensureDirectoryExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readGovernanceData(): ClientGovernanceData {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(GOVERNANCE_FILE)) {
      fs.writeFileSync(
        GOVERNANCE_FILE,
        JSON.stringify(EMPTY_GOVERNANCE_DATA, null, 2),
        "utf8"
      );
      return {
        companies: [],
        entitlements: [],
        personas: [],
      };
    }
    const raw = fs.readFileSync(GOVERNANCE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ClientGovernanceData>;
    return {
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      entitlements: Array.isArray(parsed.entitlements) ? parsed.entitlements : [],
      personas: Array.isArray(parsed.personas) ? parsed.personas : [],
    };
  } catch (err) {
    console.error("[Governance Store] Failed to read governance store:", err);
    return {
      companies: [],
      entitlements: [],
      personas: [],
    };
  }
}

function writeGovernanceData(data: ClientGovernanceData): void {
  ensureDirectoryExists();
  fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify(data, null, 2), "utf8");
}

function slugifyCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);
  return base || `CL-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

// ==========================================
// COMPANIES CRUD
// ==========================================

export function getAllCompanies(): CompanyProfile[] {
  return readGovernanceData().companies;
}

export function getCompanyById(id: string): CompanyProfile | undefined {
  return readGovernanceData().companies.find((c) => c.id === id);
}

export function createCompany(input: CreateCompanyInput): CompanyProfile {
  const data = readGovernanceData();
  const now = new Date().toISOString();
  const id = `cmp_${crypto.randomBytes(6).toString("hex")}`;
  const cleanName = input.name.trim();
  const cleanCode = (input.code?.trim() || slugifyCode(cleanName)).toUpperCase();

  const company: CompanyProfile = {
    id,
    name: cleanName,
    code: cleanCode,
    contactEmail: input.contactEmail.trim().toLowerCase(),
    status: input.status || "active",
    notes: input.notes?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };

  data.companies.push(company);
  writeGovernanceData(data);
  return company;
}

export function updateCompany(
  id: string,
  input: UpdateCompanyInput
): CompanyProfile | null {
  const data = readGovernanceData();
  const index = data.companies.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const existing = data.companies[index];
  const updated: CompanyProfile = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    code:
      input.code !== undefined
        ? input.code.trim().toUpperCase()
        : existing.code,
    contactEmail:
      input.contactEmail !== undefined
        ? input.contactEmail.trim().toLowerCase()
        : existing.contactEmail,
    status: input.status !== undefined ? input.status : existing.status,
    notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
    updatedAt: new Date().toISOString(),
  };

  data.companies[index] = updated;
  writeGovernanceData(data);
  return updated;
}

export function deleteCompany(id: string): boolean {
  const data = readGovernanceData();
  const exists = data.companies.some((c) => c.id === id);
  if (!exists) return false;

  data.companies = data.companies.filter((c) => c.id !== id);
  data.entitlements = data.entitlements.filter((e) => e.companyId !== id);
  data.personas = data.personas.filter((p) => p.companyId !== id);
  writeGovernanceData(data);
  return true;
}

// ==========================================
// PRODUCT ENTITLEMENTS (ON/OFF TOGGLES)
// ==========================================

export function getCompanyEntitlements(companyId: string): CompanyEntitlement[] {
  return readGovernanceData().entitlements.filter(
    (e) => e.companyId === companyId
  );
}

export function toggleProductEntitlement(
  companyId: string,
  productId: string,
  enabled: boolean,
  grantedBy = "KPMG Lead"
): CompanyEntitlement {
  const data = readGovernanceData();
  const existingIndex = data.entitlements.findIndex(
    (e) => e.companyId === companyId && e.productId === productId
  );

  const now = new Date().toISOString();
  const entry: CompanyEntitlement = {
    companyId,
    productId,
    enabled,
    grantedAt: now,
    grantedBy,
  };

  if (existingIndex >= 0) {
    data.entitlements[existingIndex] = entry;
  } else {
    data.entitlements.push(entry);
  }

  writeGovernanceData(data);
  return entry;
}

// ==========================================
// PERSONAS CRUD
// ==========================================

export function getCompanyPersonas(companyId: string): CompanyPersona[] {
  return readGovernanceData().personas.filter((p) => p.companyId === companyId);
}

export function createPersona(
  companyId: string,
  input: CreatePersonaInput
): CompanyPersona {
  const data = readGovernanceData();
  const cleanEmail = input.email.trim().toLowerCase();

  // Check duplicate email across all personas
  const emailExists = data.personas.some(
    (p) => p.email.toLowerCase() === cleanEmail
  );
  if (emailExists) {
    throw new Error(`A persona with email "${cleanEmail}" already exists.`);
  }

  const now = new Date().toISOString();
  const persona: CompanyPersona = {
    id: `prs_${crypto.randomBytes(6).toString("hex")}`,
    companyId,
    name: input.name.trim(),
    roleTitle: input.roleTitle.trim(),
    email: cleanEmail,
    passcode: input.passcode.trim(),
    productAccessMode: input.productAccessMode || "all",
    allowedProductIds: Array.isArray(input.allowedProductIds)
      ? input.allowedProductIds
      : [],
    permissions: {
      canLaunchProducts: Boolean(input.permissions?.canLaunchProducts),
      canViewAudit: Boolean(input.permissions?.canViewAudit),
      canManageDashboards: Boolean(input.permissions?.canManageDashboards),
      canExportData: Boolean(input.permissions?.canExportData),
    },
    createdAt: now,
    updatedAt: now,
  };

  data.personas.push(persona);
  writeGovernanceData(data);
  return persona;
}

export function updatePersona(
  companyId: string,
  personaId: string,
  input: UpdatePersonaInput
): CompanyPersona | null {
  const data = readGovernanceData();
  const index = data.personas.findIndex(
    (p) => p.id === personaId && p.companyId === companyId
  );
  if (index === -1) return null;

  const existing = data.personas[index];

  if (input.email !== undefined) {
    const cleanEmail = input.email.trim().toLowerCase();
    const conflict = data.personas.some(
      (p) => p.id !== personaId && p.email.toLowerCase() === cleanEmail
    );
    if (conflict) {
      throw new Error(`Another persona already uses email "${cleanEmail}".`);
    }
  }

  const updated: CompanyPersona = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    roleTitle:
      input.roleTitle !== undefined
        ? input.roleTitle.trim()
        : existing.roleTitle,
    email:
      input.email !== undefined
        ? input.email.trim().toLowerCase()
        : existing.email,
    passcode:
      input.passcode !== undefined && input.passcode.trim() !== ""
        ? input.passcode.trim()
        : existing.passcode,
    productAccessMode:
      input.productAccessMode !== undefined
        ? input.productAccessMode
        : existing.productAccessMode,
    allowedProductIds:
      input.allowedProductIds !== undefined
        ? input.allowedProductIds
        : existing.allowedProductIds,
    permissions: {
      canLaunchProducts:
        input.permissions?.canLaunchProducts !== undefined
          ? Boolean(input.permissions.canLaunchProducts)
          : existing.permissions.canLaunchProducts,
      canViewAudit:
        input.permissions?.canViewAudit !== undefined
          ? Boolean(input.permissions.canViewAudit)
          : existing.permissions.canViewAudit,
      canManageDashboards:
        input.permissions?.canManageDashboards !== undefined
          ? Boolean(input.permissions.canManageDashboards)
          : existing.permissions.canManageDashboards,
      canExportData:
        input.permissions?.canExportData !== undefined
          ? Boolean(input.permissions.canExportData)
          : existing.permissions.canExportData,
    },
    updatedAt: new Date().toISOString(),
  };

  data.personas[index] = updated;
  writeGovernanceData(data);
  return updated;
}

export function deletePersona(companyId: string, personaId: string): boolean {
  const data = readGovernanceData();
  const exists = data.personas.some(
    (p) => p.id === personaId && p.companyId === companyId
  );
  if (!exists) return false;

  data.personas = data.personas.filter((p) => p.id !== personaId);
  writeGovernanceData(data);
  return true;
}

// ==========================================
// EFFECTIVE ACCESS & AUTHENTICATION
// ==========================================

export function getEffectiveProductIdsForPersona(
  companyId: string,
  personaId: string
): string[] {
  const data = readGovernanceData();
  const company = data.companies.find((c) => c.id === companyId);
  if (!company || company.status !== "active") {
    return [];
  }

  const persona = data.personas.find(
    (p) => p.id === personaId && p.companyId === companyId
  );
  if (!persona) {
    return [];
  }

  const companyEnabledIds = data.entitlements
    .filter((e) => e.companyId === companyId && e.enabled)
    .map((e) => e.productId);

  if (persona.productAccessMode === "all") {
    return companyEnabledIds;
  }

  // Intersection of company-enabled products and persona-allowed products
  return companyEnabledIds.filter((pid) =>
    persona.allowedProductIds.includes(pid)
  );
}

export interface AuthenticatedClientSession {
  company: CompanyProfile;
  persona: CompanyPersona;
  allowedProductIds: string[];
}

export function authenticateClientPersona(
  email: string,
  passcode: string
): AuthenticatedClientSession | null {
  const data = readGovernanceData();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPasscode = passcode.trim();

  const persona = data.personas.find(
    (p) =>
      p.email.toLowerCase() === cleanEmail && p.passcode === cleanPasscode
  );
  if (!persona) {
    return null;
  }

  const company = data.companies.find((c) => c.id === persona.companyId);
  if (!company) {
    return null;
  }

  if (company.status !== "active") {
    throw new Error(
      `Access for ${company.name} is currently suspended. Contact your KPMG Advisory Lead.`
    );
  }

  const allowedProductIds = getEffectiveProductIdsForPersona(
    company.id,
    persona.id
  );

  return {
    company,
    persona,
    allowedProductIds,
  };
}
