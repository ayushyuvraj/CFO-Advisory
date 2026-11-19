import {
  CompanyProfile,
  CompanyPersona,
  CompanySpendLimit,
  SpendPeriod,
  CompanySpendSummary,
} from "./types";
import {
  getAllCompanies,
  getCompanyById,
  getCompanyPersonas,
  readGovernanceData,
} from "./store";
import { getTenantEvents } from "@/lib/telemetry/telemetryStore";

export interface QuotaCheckResult {
  allowed: boolean;
  companyId: string;
  companyName: string;
  companyCode: string;
  period: SpendPeriod | "unlimited";
  periodLabel: string;
  periodStartIso: string;
  periodResetAtIso?: string;
  secondsUntilReset?: number;

  // Company Pool Dimension
  companyLimitUsd: number | null;
  companySpendUsd: number;
  companyRemainingUsd: number | null;
  companySpendPct: number;

  // Persona Dimension
  personaId?: string;
  personaName?: string;
  personaEmail?: string;
  personaLimitUsd: number | null;
  personaSpendUsd: number;
  personaRemainingUsd: number | null;
  personaSpendPct?: number;

  // Compound Constraint
  effectiveRemainingUsd: number | null;
  denialReason?: string;

  // Breakdown across personas in organization
  spendByPersona?: Record<string, number>;
}

/**
 * Calculates start boundary and next reset time for a given budget period.
 */
export function calculatePeriodWindow(
  limit?: CompanySpendLimit,
  refDate: Date = new Date()
): {
  start: Date;
  resetAt?: Date;
  periodLabel: string;
  secondsUntilReset?: number;
} {
  if (!limit || !limit.enabled || !limit.amountUsd || limit.amountUsd <= 0) {
    return {
      start: new Date(0),
      periodLabel: "No Cap (Unlimited)",
    };
  }

  const now = refDate;
  let start: Date;
  let resetAt: Date | undefined;
  let periodLabel = "Monthly";

  switch (limit.period) {
    case "daily": {
      // 00:00:00 UTC of current day
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
      );
      resetAt = new Date(start.getTime() + 86_400_000);
      periodLabel = "Daily (resets 00:00 UTC)";
      break;
    }
    case "weekly": {
      // Monday 00:00:00 UTC of current week
      const day = now.getUTCDay(); // 0 is Sunday, 1 is Monday
      const daysSinceMonday = (day + 6) % 7;
      start = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysSinceMonday,
          0,
          0,
          0,
          0
        )
      );
      resetAt = new Date(start.getTime() + 7 * 86_400_000);
      periodLabel = "Weekly (resets Monday 00:00 UTC)";
      break;
    }
    case "monthly": {
      // 1st of current month at 00:00:00 UTC
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
      );
      resetAt = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
      );
      periodLabel = "Monthly (resets 1st of month 00:00 UTC)";
      break;
    }
    case "custom_days": {
      const days = Math.max(1, limit.customDays || 30);
      // Rolling sliding window: [now - N*24h, now]
      start = new Date(now.getTime() - days * 86_400_000);
      resetAt = new Date(now.getTime() + 86_400_000); // next 24h rolling checkpoint
      periodLabel = `Rolling ${days} Days`;
      break;
    }
    default: {
      start = new Date(0);
      periodLabel = "Custom";
    }
  }

  const secondsUntilReset = resetAt
    ? Math.max(0, Math.floor((resetAt.getTime() - now.getTime()) / 1000))
    : undefined;

  return { start, resetAt, periodLabel, secondsUntilReset };
}

/**
 * Aggregates actual spend from the central telemetry store for a company.
 */
export function getAggregatedSpend(
  company: CompanyProfile,
  sinceDate: Date
): {
  totalCompanySpendUsd: number;
  personaSpendUsd: Record<string, number>;
  personaSpendByEmail: Record<string, number>;
} {
  const aliases = [company.code, company.name];
  const events = getTenantEvents(company.id, aliases, sinceDate.toISOString());

  let totalCompanySpendUsd = 0;
  const personaSpendUsd: Record<string, number> = {};
  const personaSpendByEmail: Record<string, number> = {};

  for (const evt of events) {
    const cost = Number(evt.estimated_cost_usd) || 0;
    if (cost <= 0) continue;

    totalCompanySpendUsd += cost;

    if (evt.user_id) {
      personaSpendUsd[evt.user_id] = (personaSpendUsd[evt.user_id] || 0) + cost;
    }
    if (evt.user_email) {
      const email = evt.user_email.toLowerCase();
      personaSpendByEmail[email] = (personaSpendByEmail[email] || 0) + cost;
    }
  }

  totalCompanySpendUsd = Math.round(totalCompanySpendUsd * 10000) / 10000;

  return { totalCompanySpendUsd, personaSpendUsd, personaSpendByEmail };
}

export interface EvaluateQuotaParams {
  companyId?: string;
  personaId?: string;
  userEmail?: string;
  estimatedCostUsd?: number;
  referenceDate?: Date;
}

/**
 * Resolves company and persona using hierarchical fallback strategies:
 * 1. Direct companyId match (exact ID).
 * 2. Company code / slug match (e.g. "APEX-GLOBAL" or "apex-global").
 * 3. Persona userEmail reverse-lookup across all registered personas.
 * 4. Persona personaId reverse-lookup across all registered personas.
 * 5. Single active company fallback if only one client company is registered.
 */
export function resolveCompanyAndPersona(params: {
  companyId?: string;
  personaId?: string;
  userEmail?: string;
}): { company?: CompanyProfile; persona?: CompanyPersona } {
  const companies = getAllCompanies();
  const rawGov = readGovernanceData();
  const allPersonas = rawGov.personas;

  let company: CompanyProfile | undefined;
  let persona: CompanyPersona | undefined;

  const cleanCompanyId = (params.companyId || "").trim();
  const cleanEmail = (params.userEmail || "").trim().toLowerCase();
  const cleanPersonaId = (params.personaId || "").trim();

  // 1. Direct exact company ID match (excluding legacy placeholder)
  if (cleanCompanyId && cleanCompanyId !== "org_acme_corp_global") {
    company = companies.find((c) => c.id === cleanCompanyId);
  }

  // 2. Company code / slug match (e.g. APEX-GLOBAL)
  if (!company && cleanCompanyId && cleanCompanyId !== "org_acme_corp_global") {
    const codeMatch = cleanCompanyId.toUpperCase();
    company = companies.find((c) => c.code.toUpperCase() === codeMatch);
  }

  // 3. Reverse lookup by userEmail across all registered personas
  if (cleanEmail) {
    const matchedPersona = allPersonas.find(
      (p) => p.email.trim().toLowerCase() === cleanEmail
    );
    if (matchedPersona) {
      persona = matchedPersona;
      if (!company) {
        company = companies.find((c) => c.id === matchedPersona.companyId);
      }
    }
  }

  // 4. Reverse lookup by personaId across all registered personas
  if (!persona && cleanPersonaId) {
    const matchedPersona = allPersonas.find((p) => p.id === cleanPersonaId);
    if (matchedPersona) {
      persona = matchedPersona;
      if (!company) {
        company = companies.find((c) => c.id === matchedPersona.companyId);
      }
    }
  }

  // 5. If company found but persona not resolved yet, check personas within that company
  if (company && !persona) {
    const compPersonas = getCompanyPersonas(company.id);
    if (cleanPersonaId) {
      persona = compPersonas.find((p) => p.id === cleanPersonaId);
    }
    if (!persona && cleanEmail) {
      persona = compPersonas.find(
        (p) => p.email.trim().toLowerCase() === cleanEmail
      );
    }
  }

  // 6. Sensible fallback: if no company resolved yet, but only one active company exists
  if (!company) {
    const activeCompanies = companies.filter((c) => c.status === "active");
    if (activeCompanies.length === 1) {
      company = activeCompanies[0];
      if (!persona && cleanEmail) {
        const compPersonas = getCompanyPersonas(company.id);
        persona = compPersonas.find(
          (p) => p.email.trim().toLowerCase() === cleanEmail
        );
      }
    }
  }

  return { company, persona };
}

/**
 * Pre-flight quota check evaluated against hierarchical company and persona limits.
 */
export function evaluateQuotaCheck({
  companyId,
  personaId,
  userEmail,
  estimatedCostUsd = 0,
  referenceDate = new Date(),
}: EvaluateQuotaParams): QuotaCheckResult {
  const { company, persona } = resolveCompanyAndPersona({
    companyId,
    personaId,
    userEmail,
  });

  if (!company) {
    const targetIdent = companyId || userEmail || personaId || "unknown";
    return {
      allowed: false,
      companyId: companyId || "unknown",
      companyName: "Unknown Organization",
      companyCode: "UNKNOWN",
      period: "unlimited",
      periodLabel: "Unknown",
      periodStartIso: new Date(0).toISOString(),
      companyLimitUsd: null,
      companySpendUsd: 0,
      companyRemainingUsd: null,
      companySpendPct: 0,
      personaLimitUsd: null,
      personaSpendUsd: 0,
      personaRemainingUsd: null,
      effectiveRemainingUsd: null,
      denialReason: `Organization '${targetIdent}' was not found in KPMG Governance registry.`,
    };
  }

  if (company.status === "suspended") {
    return {
      allowed: false,
      companyId: company.id,
      companyName: company.name,
      companyCode: company.code,
      period: "unlimited",
      periodLabel: "Suspended",
      periodStartIso: new Date(0).toISOString(),
      companyLimitUsd: null,
      companySpendUsd: 0,
      companyRemainingUsd: 0,
      companySpendPct: 100,
      personaLimitUsd: null,
      personaSpendUsd: 0,
      personaRemainingUsd: null,
      effectiveRemainingUsd: 0,
      denialReason: `Organization '${company.name}' is currently suspended by KPMG Advisory Lead.`,
    };
  }

  const spendLimit = company.spendLimit;
  const isCompanyCapActive = Boolean(
    spendLimit && spendLimit.enabled && spendLimit.amountUsd > 0
  );

  const window = calculatePeriodWindow(
    isCompanyCapActive ? spendLimit : undefined,
    referenceDate
  );

  const { totalCompanySpendUsd, personaSpendUsd, personaSpendByEmail } =
    getAggregatedSpend(company, window.start);

  const companyLimitUsd = isCompanyCapActive ? spendLimit!.amountUsd : null;
  const companyRemainingUsd =
    companyLimitUsd !== null
      ? Math.max(0, Math.round((companyLimitUsd - totalCompanySpendUsd) * 100) / 100)
      : null;

  const companySpendPct =
    companyLimitUsd !== null && companyLimitUsd > 0
      ? Math.min(100, Math.round((totalCompanySpendUsd / companyLimitUsd) * 100))
      : 0;

  // Calculate persona metrics
  let pSpendUsd = 0;
  if (persona) {
    pSpendUsd =
      personaSpendUsd[persona.id] ||
      personaSpendByEmail[persona.email.toLowerCase()] ||
      0;
    pSpendUsd = Math.round(pSpendUsd * 10000) / 10000;
  }

  const pLimitUsd =
    persona && typeof persona.spendLimitUsd === "number" && persona.spendLimitUsd > 0
      ? persona.spendLimitUsd
      : null;

  const pRemainingUsd =
    pLimitUsd !== null
      ? Math.max(0, Math.round((pLimitUsd - pSpendUsd) * 100) / 100)
      : null;

  const pSpendPct =
    pLimitUsd !== null && pLimitUsd > 0
      ? Math.min(100, Math.round((pSpendUsd / pLimitUsd) * 100))
      : undefined;

  // Compound Constraint Calculation:
  // Remaining = min(companyRemaining, personaRemaining)
  let effectiveRemainingUsd: number | null = null;
  if (companyRemainingUsd !== null && pRemainingUsd !== null) {
    effectiveRemainingUsd = Math.min(companyRemainingUsd, pRemainingUsd);
  } else if (companyRemainingUsd !== null) {
    effectiveRemainingUsd = companyRemainingUsd;
  } else if (pRemainingUsd !== null) {
    effectiveRemainingUsd = pRemainingUsd;
  }

  // Pre-flight check with requested cost
  const requested = Math.max(0, estimatedCostUsd);
  let allowed = true;
  let denialReason: string | undefined = undefined;

  // Check 1: Company Cap
  if (companyLimitUsd !== null && totalCompanySpendUsd + requested > companyLimitUsd) {
    allowed = false;
    denialReason = `Company spend limit for ${company.name} reached ($${totalCompanySpendUsd.toFixed(2)} / $${companyLimitUsd.toFixed(2)}). Reset: ${window.periodLabel}.`;
  }

  // Check 2: Persona Sub-cap
  if (allowed && pLimitUsd !== null && pSpendUsd + requested > pLimitUsd) {
    allowed = false;
    denialReason = `Persona spend limit reached for ${persona?.name || "user"} ($${pSpendUsd.toFixed(2)} / $${pLimitUsd.toFixed(2)}). Organization pool: $${companyRemainingUsd !== null ? companyRemainingUsd.toFixed(2) : "unlimited"} remaining.`;
  }

  return {
    allowed,
    companyId: company.id,
    companyName: company.name,
    companyCode: company.code,
    period: isCompanyCapActive ? spendLimit!.period : "unlimited",
    periodLabel: window.periodLabel,
    periodStartIso: window.start.toISOString(),
    periodResetAtIso: window.resetAt ? window.resetAt.toISOString() : undefined,
    secondsUntilReset: window.secondsUntilReset,

    companyLimitUsd,
    companySpendUsd: totalCompanySpendUsd,
    companyRemainingUsd,
    companySpendPct,

    personaId: persona?.id,
    personaName: persona?.name,
    personaEmail: persona?.email,
    personaLimitUsd: pLimitUsd,
    personaSpendUsd: pSpendUsd,
    personaRemainingUsd: pRemainingUsd,
    personaSpendPct: pSpendPct,

    effectiveRemainingUsd,
    denialReason,
    spendByPersona: personaSpendUsd,
  };
}

/**
 * Fast spend and budget summary across all registered organizations for grid and list rendering.
 */
export function getAllCompaniesSpendSummary(): Record<string, CompanySpendSummary> {
  const companies = getAllCompanies();
  const summary: Record<string, CompanySpendSummary> = {};
  for (const c of companies) {
    const q = evaluateQuotaCheck({ companyId: c.id });
    summary[c.id] = {
      spendUsd: q.companySpendUsd,
      limitUsd: q.companyLimitUsd,
      period: q.period,
      spendPct: q.companySpendPct,
      enabled: Boolean(c.spendLimit?.enabled),
    };
  }
  return summary;
}
