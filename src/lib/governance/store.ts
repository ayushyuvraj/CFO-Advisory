import path from "path";
import crypto from "crypto";
import {
  mutateJsonFile,
  readJsonStrict,
  resolveDataDir,
} from "@/lib/storage/jsonFileStore";
import {
  ClientGovernanceData,
  CompanyEntitlement,
  CompanyPersona,
  CompanyProfile,
  CompanySpendLimit,
  SpendPeriod,
  CreateCompanyInput,
  CreatePersonaInput,
  UpdateCompanyInput,
  UpdatePersonaInput,
} from "./types";

export function sanitizeSpendLimit(input?: unknown): CompanySpendLimit | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const enabled = Boolean(raw.enabled);
  const amountUsd = Number(raw.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < 0) return undefined;

  const validPeriods: SpendPeriod[] = ["daily", "weekly", "monthly", "custom_days"];
  const period = validPeriods.includes(raw.period as SpendPeriod)
    ? (raw.period as SpendPeriod)
    : "monthly";

  let customDays: number | undefined = undefined;
  if (period === "custom_days") {
    const parsedDays = parseInt(String(raw.customDays || 30), 10);
    customDays =
      Number.isFinite(parsedDays) && parsedDays >= 1 && parsedDays <= 365
        ? parsedDays
        : 30;
  }

  return {
    amountUsd: Math.round(amountUsd * 100) / 100,
    period,
    customDays,
    enabled,
  };
}

export function sanitizePersonaSpendLimit(val: unknown): number | null | undefined {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

function getGovernanceFile(): string {
  return path.join(resolveDataDir(), "cfo_client_governance.json");
}

function createEmptyGovernance(): ClientGovernanceData {
  return {
    companies: [],
    entitlements: [],
    personas: [],
  };
}

function validateGovernanceData(raw: unknown): ClientGovernanceData {
  const parsed = raw as Partial<ClientGovernanceData>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Governance store file is corrupted.");
  }
  return {
    companies: Array.isArray(parsed.companies) ? parsed.companies : [],
    entitlements: Array.isArray(parsed.entitlements) ? parsed.entitlements : [],
    personas: Array.isArray(parsed.personas) ? parsed.personas : [],
  };
}

export function readGovernanceData(): ClientGovernanceData {
  try {
    return readJsonStrict(
      getGovernanceFile(),
      createEmptyGovernance,
      validateGovernanceData
    );
  } catch (err) {
    console.error("[Governance Store] Failed to read governance store:", err);
    throw new Error("Failed to read client governance store.");
  }
}

function mutateGovernance<R>(
  fn: (data: ClientGovernanceData) => {
    next: ClientGovernanceData;
    result: R;
    skipWrite?: boolean;
  }
): R {
  return mutateJsonFile(
    getGovernanceFile(),
    createEmptyGovernance,
    validateGovernanceData,
    fn
  );
}

function timingSafeCompare(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
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
  const cleanName = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!cleanName) {
    throw new Error("Company name is required.");
  }

  const cleanEmail =
    typeof input.contactEmail === "string"
      ? input.contactEmail.trim().toLowerCase().slice(0, 160)
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

  const status: "active" | "suspended" =
    input.status === "suspended" ? "suspended" : "active";

  return mutateGovernance((data) => {
    const codeConflict = data.companies.some(
      (c) => c.code.toUpperCase() === cleanCode
    );
    if (codeConflict) {
      throw new Error(
        `Client code "${cleanCode}" is already assigned to another company.`
      );
    }

    const now = new Date().toISOString();
    const spendLimit = sanitizeSpendLimit(input.spendLimit);
    const company: CompanyProfile = {
      id: `cmp_${crypto.randomBytes(6).toString("hex")}`,
      name: cleanName,
      code: cleanCode,
      contactEmail: cleanEmail,
      status,
      notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : "",
      ...(spendLimit ? { spendLimit } : {}),
      createdAt: now,
      updatedAt: now,
    };

    return {
      next: { ...data, companies: [...data.companies, company] },
      result: company,
    };
  });
}

export function updateCompany(
  id: string,
  input: UpdateCompanyInput
): CompanyProfile | null {
  return mutateGovernance((data) => {
    const index = data.companies.findIndex((c) => c.id === id);
    if (index === -1) return { next: data, result: null, skipWrite: true };

    const existing = data.companies[index];

    let nextName = existing.name;
    if (input.name !== undefined) {
      if (typeof input.name !== "string" || !input.name.trim()) {
        throw new Error("Company name cannot be empty.");
      }
      nextName = input.name.trim().slice(0, 120);
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
        throw new Error(
          `Client code "${candidate}" is already assigned to another company.`
        );
      }
      nextCode = candidate;
    }

    let nextEmail = existing.contactEmail;
    if (input.contactEmail !== undefined) {
      if (typeof input.contactEmail !== "string" || !isValidEmail(input.contactEmail)) {
        throw new Error("A valid primary contact email is required.");
      }
      nextEmail = input.contactEmail.trim().toLowerCase().slice(0, 160);
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
          ? input.notes.trim().slice(0, 500)
          : existing.notes
        : existing.notes;

    let nextSpendLimit = existing.spendLimit;
    if (input.spendLimit !== undefined) {
      nextSpendLimit = sanitizeSpendLimit(input.spendLimit);
    }

    const updated: CompanyProfile = {
      ...existing,
      name: nextName,
      code: nextCode,
      contactEmail: nextEmail,
      status: nextStatus,
      notes: nextNotes,
      spendLimit: nextSpendLimit,
      updatedAt: new Date().toISOString(),
    };

    const nextCompanies = [...data.companies];
    nextCompanies[index] = updated;
    return {
      next: { ...data, companies: nextCompanies },
      result: updated,
    };
  });
}

export function deleteCompany(id: string): boolean {
  return mutateGovernance((data) => {
    const exists = data.companies.some((c) => c.id === id);
    if (!exists) return { next: data, result: false, skipWrite: true };

    return {
      next: {
        companies: data.companies.filter((c) => c.id !== id),
        entitlements: data.entitlements.filter((e) => e.companyId !== id),
        personas: data.personas.filter((p) => p.companyId !== id),
      },
      result: true,
    };
  });
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
  const cleanProductId = productId.trim();
  return mutateGovernance((data) => {
    const existingIndex = data.entitlements.findIndex(
      (e) => e.companyId === companyId && e.productId === cleanProductId
    );

    const now = new Date().toISOString();
    const entry: CompanyEntitlement = {
      companyId,
      productId: cleanProductId,
      enabled,
      grantedAt: now,
      grantedBy: grantedBy.slice(0, 120),
    };

    const nextEntitlements = [...data.entitlements];
    if (existingIndex >= 0) {
      nextEntitlements[existingIndex] = entry;
    } else {
      nextEntitlements.push(entry);
    }

    return {
      next: { ...data, entitlements: nextEntitlements },
      result: entry,
    };
  });
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
  const cleanName = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!cleanName) {
    throw new Error("Persona name is required.");
  }

  const cleanRole =
    typeof input.roleTitle === "string" ? input.roleTitle.trim().slice(0, 120) : "";
  if (!cleanRole) {
    throw new Error("Role title is required.");
  }

  const cleanEmail =
    typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 160) : "";
  if (!isValidEmail(cleanEmail)) {
    throw new Error("A valid email address is required.");
  }

  const cleanPasscode =
    typeof input.passcode === "string" ? input.passcode.trim().slice(0, 128) : "";
  if (cleanPasscode.length < 4) {
    throw new Error("A passcode of at least 4 characters is required.");
  }

  const mode: "all" | "custom" =
    input.productAccessMode === "custom" ? "custom" : "all";
  const allowedProductIds = Array.isArray(input.allowedProductIds)
    ? input.allowedProductIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, 50)
    : [];

  return mutateGovernance((data) => {
    const emailExists = data.personas.some(
      (p) => p.email.toLowerCase() === cleanEmail
    );
    if (emailExists) {
      throw new Error(`A persona with email "${cleanEmail}" already exists.`);
    }

    const now = new Date().toISOString();
    const spendLimitUsd = sanitizePersonaSpendLimit(input.spendLimitUsd);
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
        ...(input.permissions?.canExportData !== undefined
          ? { canExportData: Boolean(input.permissions.canExportData) }
          : {}),
      },
      spendLimitUsd: spendLimitUsd ?? null,
      createdAt: now,
      updatedAt: now,
    };

    return {
      next: { ...data, personas: [...data.personas, persona] },
      result: persona,
    };
  });
}

export function updatePersona(
  companyId: string,
  personaId: string,
  input: UpdatePersonaInput
): CompanyPersona | null {
  return mutateGovernance((data) => {
    const index = data.personas.findIndex(
      (p) => p.id === personaId && p.companyId === companyId
    );
    if (index === -1) return { next: data, result: null, skipWrite: true };

    const existing = data.personas[index];

    let nextName = existing.name;
    if (input.name !== undefined) {
      if (typeof input.name !== "string" || !input.name.trim()) {
        throw new Error("Persona name cannot be empty.");
      }
      nextName = input.name.trim().slice(0, 120);
    }

    let nextRole = existing.roleTitle;
    if (input.roleTitle !== undefined) {
      if (typeof input.roleTitle !== "string" || !input.roleTitle.trim()) {
        throw new Error("Role title cannot be empty.");
      }
      nextRole = input.roleTitle.trim().slice(0, 120);
    }

    let nextEmail = existing.email;
    if (input.email !== undefined) {
      if (typeof input.email !== "string" || !isValidEmail(input.email)) {
        throw new Error("A valid email address is required.");
      }
      const cleanEmail = input.email.trim().toLowerCase().slice(0, 160);
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
      const trimmed = input.passcode.trim().slice(0, 128);
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
      nextAllowed = input.allowedProductIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, 50);
    }

    let nextSpendLimitUsd = existing.spendLimitUsd ?? null;
    if (input.spendLimitUsd !== undefined) {
      nextSpendLimitUsd = sanitizePersonaSpendLimit(input.spendLimitUsd) ?? null;
    }

    const updated: CompanyPersona = {
      ...existing,
      name: nextName,
      roleTitle: nextRole,
      email: nextEmail,
      passcode: nextPasscode,
      productAccessMode: nextMode,
      allowedProductIds: nextAllowed,
      spendLimitUsd: nextSpendLimitUsd,
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
        ...(input.permissions?.canExportData !== undefined
          ? { canExportData: Boolean(input.permissions.canExportData) }
          : existing.permissions.canExportData !== undefined
          ? { canExportData: existing.permissions.canExportData }
          : {}),
      },
      updatedAt: new Date().toISOString(),
    };

    const nextPersonas = [...data.personas];
    nextPersonas[index] = updated;
    return {
      next: { ...data, personas: nextPersonas },
      result: updated,
    };
  });
}

export function deletePersona(companyId: string, personaId: string): boolean {
  return mutateGovernance((data) => {
    const exists = data.personas.some(
      (p) => p.id === personaId && p.companyId === companyId
    );
    if (!exists) return { next: data, result: false, skipWrite: true };

    return {
      next: {
        ...data,
        personas: data.personas.filter((p) => p.id !== personaId),
      },
      result: true,
    };
  });
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

  if (!persona.permissions.canLaunchProducts) {
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
    (p) =>
      p.email.toLowerCase() === cleanEmail &&
      timingSafeCompare(p.passcode, cleanPasscode)
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
