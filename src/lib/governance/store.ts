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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

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
  if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ DATA_DIR, { recursive: true });
  }
}

function parseGovernanceRaw(raw: string): ClientGovernanceData {
  const parsed = JSON.parse(raw) as Partial<ClientGovernanceData>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Governance store file is corrupted.");
  }
  return {
    companies: Array.isArray(parsed.companies) ? parsed.companies : [],
    entitlements: Array.isArray(parsed.entitlements) ? parsed.entitlements : [],
    personas: Array.isArray(parsed.personas) ? parsed.personas : [],
  };
}

/**
 * Strict reader used before mutations: NEVER returns empty data if the file exists
 * and fails to read/parse, preventing accidental wipes on transient locks.
 */
function readGovernanceDataStrict(): ClientGovernanceData {
  ensureDirectoryExists();
  if (!fs.existsSync(GOVERNANCE_FILE)) {
    writeGovernanceDataAtomic(EMPTY_GOVERNANCE_DATA);
    return { companies: [], entitlements: [], personas: [] };
  }
  const raw = fs.readFileSync(GOVERNANCE_FILE, "utf8");
  return parseGovernanceRaw(raw);
}

export function readGovernanceData(): ClientGovernanceData {
  try {
    return readGovernanceDataStrict();
  } catch (err) {
    console.error("[Governance Store] Failed to read governance store:", err);
    throw new Error("Failed to read client governance store.");
  }
}

function writeGovernanceDataAtomic(data: ClientGovernanceData): void {
  ensureDirectoryExists();
  const payload = JSON.stringify(data, null, 2);
  const tmpFile = path.join(
    DATA_DIR,
    `.cfo_client_governance.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`
  );
  try {
    fs.writeFileSync(tmpFile, payload, "utf8");
    fs.renameSync(tmpFile, GOVERNANCE_FILE);
  } catch (err) {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch {
      // Ignore temp cleanup failure
    }
    throw err;
  }
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
  const data = readGovernanceDataStrict();
  const cleanName = typeof input.name === "string" ? input.name.trim() : "";
  if (!cleanName) {
    throw new Error("Company name is required.");
  }

  const cleanEmail =
    typeof input.contactEmail === "string"
      ? input.contactEmail.trim().toLowerCase()
      : "";
  if (!isValidEmail(cleanEmail)) {
    throw new Error("A valid primary contact email is required.");
  }

  const rawCode =
    typeof input.code === "string" && input.code.trim()
      ? input.code.trim()
      : slugifyCode(cleanName);
  const cleanCode = rawCode
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);

  if (!cleanCode) {
    throw new Error("A valid alphanumeric client code is required.");
  }

  const codeConflict = data.companies.some(
    (c) => c.code.toUpperCase() === cleanCode
  );
  if (codeConflict) {
    throw new Error(`Client code "${cleanCode}" is already assigned to another company.`);
  }

  const status: "active" | "suspended" =
    input.status === "suspended" ? "suspended" : "active";

  const now = new Date().toISOString();
  const company: CompanyProfile = {
    id: `cmp_${crypto.randomBytes(6).toString("hex")}`,
    name: cleanName,
    code: cleanCode,
    contactEmail: cleanEmail,
    status,
    notes: typeof input.notes === "string" ? input.notes.trim() : "",
    createdAt: now,
    updatedAt: now,
  };

  data.companies.push(company);
  writeGovernanceDataAtomic(data);
  return company;
}

export function updateCompany(
  id: string,
  input: UpdateCompanyInput
): CompanyProfile | null {
  const data = readGovernanceDataStrict();
  const index = data.companies.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const existing = data.companies[index];

  let nextName = existing.name;
  if (input.name !== undefined) {
    if (typeof input.name !== "string" || !input.name.trim()) {
      throw new Error("Company name cannot be empty.");
    }
    nextName = input.name.trim();
  }

  let nextCode = existing.code;
  if (input.code !== undefined) {
    if (typeof input.code !== "string" || !input.code.trim()) {
      throw new Error("Client code cannot be empty.");
    }
    const candidate = input.code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 16);
    if (!candidate) {
      throw new Error("A valid alphanumeric client code is required.");
    }
    const conflict = data.companies.some(
      (c) => c.id !== id && c.code.toUpperCase() === candidate
    );
    if (conflict) {
      throw new Error(`Client code "${candidate}" is already assigned to another company.`);
    }
    nextCode = candidate;
  }

  let nextEmail = existing.contactEmail;
  if (input.contactEmail !== undefined) {
    if (typeof input.contactEmail !== "string" || !isValidEmail(input.contactEmail)) {
      throw new Error("A valid primary contact email is required.");
    }
    nextEmail = input.contactEmail.trim().toLowerCase();
  }

  let nextStatus = existing.status;
  if (input.status !== undefined) {
    if (input.status !== "active" && input.status !== "suspended") {
      throw new Error('Status must be "active" or "suspended".');
    }
    nextStatus = input.status;
  }

  const nextNotes =
    input.notes !== undefined
      ? typeof input.notes === "string"
        ? input.notes.trim()
        : existing.notes
      : existing.notes;

  const updated: CompanyProfile = {
    ...existing,
    name: nextName,
    code: nextCode,
    contactEmail: nextEmail,
    status: nextStatus,
    notes: nextNotes,
    updatedAt: new Date().toISOString(),
  };

  data.companies[index] = updated;
  writeGovernanceDataAtomic(data);
  return updated;
}

export function deleteCompany(id: string): boolean {
  const data = readGovernanceDataStrict();
  const exists = data.companies.some((c) => c.id === id);
  if (!exists) return false;

  data.companies = data.companies.filter((c) => c.id !== id);
  data.entitlements = data.entitlements.filter((e) => e.companyId !== id);
  data.personas = data.personas.filter((p) => p.companyId !== id);
  writeGovernanceDataAtomic(data);
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
  const data = readGovernanceDataStrict();
  const cleanProductId = productId.trim();
  const existingIndex = data.entitlements.findIndex(
    (e) => e.companyId === companyId && e.productId === cleanProductId
  );

  const now = new Date().toISOString();
  const entry: CompanyEntitlement = {
    companyId,
    productId: cleanProductId,
    enabled,
    grantedAt: now,
    grantedBy,
  };

  if (existingIndex >= 0) {
    data.entitlements[existingIndex] = entry;
  } else {
    data.entitlements.push(entry);
  }

  writeGovernanceDataAtomic(data);
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
  const data = readGovernanceDataStrict();

  const cleanName = typeof input.name === "string" ? input.name.trim() : "";
  if (!cleanName) {
    throw new Error("Persona name is required.");
  }

  const cleanRole =
    typeof input.roleTitle === "string" ? input.roleTitle.trim() : "";
  if (!cleanRole) {
    throw new Error("Role title is required.");
  }

  const cleanEmail =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!isValidEmail(cleanEmail)) {
    throw new Error("A valid email address is required.");
  }

  const cleanPasscode =
    typeof input.passcode === "string" ? input.passcode.trim() : "";
  if (cleanPasscode.length < 4) {
    throw new Error("A passcode of at least 4 characters is required.");
  }

  const emailExists = data.personas.some(
    (p) => p.email.toLowerCase() === cleanEmail
  );
  if (emailExists) {
    throw new Error(`A persona with email "${cleanEmail}" already exists.`);
  }

  const mode: "all" | "custom" =
    input.productAccessMode === "custom" ? "custom" : "all";
  const allowedProductIds = Array.isArray(input.allowedProductIds)
    ? input.allowedProductIds.filter((id): id is string => typeof id === "string")
    : [];

  const now = new Date().toISOString();
  const persona: CompanyPersona = {
    id: `prs_${crypto.randomBytes(6).toString("hex")}`,
    companyId,
    name: cleanName,
    roleTitle: cleanRole,
    email: cleanEmail,
    passcode: cleanPasscode,
    productAccessMode: mode,
    allowedProductIds,
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
  writeGovernanceDataAtomic(data);
  return persona;
}

export function updatePersona(
  companyId: string,
  personaId: string,
  input: UpdatePersonaInput
): CompanyPersona | null {
  const data = readGovernanceDataStrict();
  const index = data.personas.findIndex(
    (p) => p.id === personaId && p.companyId === companyId
  );
  if (index === -1) return null;

  const existing = data.personas[index];

  let nextName = existing.name;
  if (input.name !== undefined) {
    if (typeof input.name !== "string" || !input.name.trim()) {
      throw new Error("Persona name cannot be empty.");
    }
    nextName = input.name.trim();
  }

  let nextRole = existing.roleTitle;
  if (input.roleTitle !== undefined) {
    if (typeof input.roleTitle !== "string" || !input.roleTitle.trim()) {
      throw new Error("Role title cannot be empty.");
    }
    nextRole = input.roleTitle.trim();
  }

  let nextEmail = existing.email;
  if (input.email !== undefined) {
    if (typeof input.email !== "string" || !isValidEmail(input.email)) {
      throw new Error("A valid email address is required.");
    }
    const cleanEmail = input.email.trim().toLowerCase();
    const conflict = data.personas.some(
      (p) => p.id !== personaId && p.email.toLowerCase() === cleanEmail
    );
    if (conflict) {
      throw new Error(`Another persona already uses email "${cleanEmail}".`);
    }
    nextEmail = cleanEmail;
  }

  let nextPasscode = existing.passcode;
  if (input.passcode !== undefined) {
    if (typeof input.passcode !== "string") {
      throw new Error("Passcode must be a string.");
    }
    const trimmed = input.passcode.trim();
    if (trimmed.length > 0 && trimmed.length < 4) {
      throw new Error("Passcode must be at least 4 characters.");
    }
    if (trimmed.length >= 4) {
      nextPasscode = trimmed;
    }
  }

  let nextMode = existing.productAccessMode;
  if (input.productAccessMode !== undefined) {
    if (input.productAccessMode !== "all" && input.productAccessMode !== "custom") {
      throw new Error('productAccessMode must be "all" or "custom".');
    }
    nextMode = input.productAccessMode;
  }

  let nextAllowed = existing.allowedProductIds;
  if (input.allowedProductIds !== undefined) {
    if (!Array.isArray(input.allowedProductIds)) {
      throw new Error("allowedProductIds must be an array.");
    }
    nextAllowed = input.allowedProductIds.filter(
      (id): id is string => typeof id === "string"
    );
  }

  const updated: CompanyPersona = {
    ...existing,
    name: nextName,
    roleTitle: nextRole,
    email: nextEmail,
    passcode: nextPasscode,
    productAccessMode: nextMode,
    allowedProductIds: nextAllowed,
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
  writeGovernanceDataAtomic(data);
  return updated;
}

export function deletePersona(companyId: string, personaId: string): boolean {
  const data = readGovernanceDataStrict();
  const exists = data.personas.some(
    (p) => p.id === personaId && p.companyId === companyId
  );
  if (!exists) return false;

  data.personas = data.personas.filter((p) => p.id !== personaId);
  writeGovernanceDataAtomic(data);
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

  return companyEnabledIds.filter((pid) =>
    persona.allowedProductIds.includes(pid)
  );
}

export interface AuthenticatedClientSession {
  company: CompanyProfile;
  persona: CompanyPersona;
  allowedProductIds: string[];
}

export class SuspendedCompanyError extends Error {
  constructor(companyName: string) {
    super(
      `Access for ${companyName} is currently suspended. Contact your KPMG Advisory Lead.`
    );
    this.name = "SuspendedCompanyError";
  }
}

export function authenticateClientPersona(
  email: string,
  passcode: string
): AuthenticatedClientSession | null {
  const data = readGovernanceData();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPasscode = passcode.trim();

  const persona = data.personas.find(
    (p) => p.email.toLowerCase() === cleanEmail && p.passcode === cleanPasscode
  );
  if (!persona) {
    return null;
  }

  const company = data.companies.find((c) => c.id === persona.companyId);
  if (!company) {
    return null;
  }

  if (company.status !== "active") {
    throw new SuspendedCompanyError(company.name);
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

export function getClientSessionByPersonaId(
  companyId: string,
  personaId: string
): AuthenticatedClientSession | null {
  const data = readGovernanceData();
  const company = data.companies.find((c) => c.id === companyId);
  if (!company) return null;

  const persona = data.personas.find(
    (p) => p.id === personaId && p.companyId === companyId
  );
  if (!persona) return null;

  if (company.status !== "active") {
    throw new SuspendedCompanyError(company.name);
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
