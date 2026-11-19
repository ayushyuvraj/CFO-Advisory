import path from "path";
import crypto from "crypto";
import {
  mutateJsonFile,
  readJsonStrict,
  resolveDataDir,
} from "@/lib/storage/jsonFileStore";
import { TelemetryEvent, TelemetryMetrics } from "./types";
import { getAllProducts } from "./productRegistry";

function getTelemetryFile(): string {
  return path.join(resolveDataDir(), "cfo_telemetry_store.json");
}

function validateEventsArray(raw: unknown): TelemetryEvent[] {
  if (!Array.isArray(raw)) {
    throw new Error("Telemetry store file is corrupted.");
  }
  return raw as TelemetryEvent[];
}

// Non-stateful per-call PII redaction regex patterns (zero shared /g lastIndex mutation)
const PII_RULES: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/gi, replacement: "[REDACTED_IBAN]" },
  { pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replacement: "[REDACTED_CARD]" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[REDACTED_TIN]" },
  {
    pattern: /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g,
    replacement: "[REDACTED_GSTIN]",
  },
  { pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, replacement: "[REDACTED_PAN]" },
  { pattern: /\b\d{4}\s\d{4}\s\d{4}\b/g, replacement: "[REDACTED_AADHAAR]" },
];

export function maskFinancialPii(text: unknown): {
  sanitized: string;
  wasMasked: boolean;
} {
  if (typeof text !== "string" || !text) {
    return { sanitized: "", wasMasked: false };
  }
  let sanitized = text.slice(0, 8000);
  let wasMasked = false;

  for (const rule of PII_RULES) {
    const fresh = new RegExp(rule.pattern.source, rule.pattern.flags);
    const replaced = sanitized.replace(fresh, rule.replacement);
    if (replaced !== sanitized) {
      sanitized = replaced;
      wasMasked = true;
    }
  }

  return { sanitized, wasMasked };
}

function sanitizeNestedObject(
  val: unknown,
  depth = 0
): { value: unknown; wasMasked: boolean } {
  if (depth > 5 || val === null || val === undefined) {
    return { value: val, wasMasked: false };
  }
  if (typeof val === "string") {
    const res = maskFinancialPii(val);
    return { value: res.sanitized, wasMasked: res.wasMasked };
  }
  if (Array.isArray(val)) {
    let anyMasked = false;
    const arr = val.slice(0, 50).map((item) => {
      const r = sanitizeNestedObject(item, depth + 1);
      if (r.wasMasked) anyMasked = true;
      return r.value;
    });
    return { value: arr, wasMasked: anyMasked };
  }
  if (typeof val === "object") {
    let anyMasked = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>).slice(0, 50)) {
      const r = sanitizeNestedObject(v, depth + 1);
      if (r.wasMasked) anyMasked = true;
      out[k] = r.value;
    }
    return { value: out, wasMasked: anyMasked };
  }
  return { value: val, wasMasked: false };
}

function safeStr(val: unknown, fallback: string, maxLen = 240): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

function safeNum(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function loadAllEvents(): TelemetryEvent[] {
  return readJsonStrict(
    getTelemetryFile(),
    () => [],
    validateEventsArray
  );
}

export function appendTelemetryEvent(raw: Partial<TelemetryEvent>): TelemetryEvent {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Telemetry payload must be a JSON object.");
  }

  const id = safeStr(
    raw.id,
    `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    120
  );
  const now = new Date().toISOString();

  const inputCheck = maskFinancialPii(raw.input_query_sanitized);
  const outputCheck = maskFinancialPii(raw.output_response_sanitized);
  const toolArgsCheck =
    raw.tool_arguments_sanitized && typeof raw.tool_arguments_sanitized === "object"
      ? sanitizeNestedObject(raw.tool_arguments_sanitized)
      : { value: undefined, wasMasked: false };

  const promptTokens = Math.max(0, Math.round(safeNum(raw.prompt_tokens, 0)));
  const completionTokens = Math.max(0, Math.round(safeNum(raw.completion_tokens, 0)));
  const reasoningTokens = Math.max(0, Math.round(safeNum(raw.reasoning_tokens, 0)));
  const totalTokens = Math.max(
    0,
    Math.round(
      safeNum(raw.total_tokens, promptTokens + completionTokens + reasoningTokens)
    )
  );

  const rawCost =
    raw.estimated_cost_usd !== undefined
      ? safeNum(raw.estimated_cost_usd, 0)
      : promptTokens * 0.00000125 + completionTokens * 0.000005;

  const validStatuses = new Set([
    "STARTED",
    "SUCCESS",
    "FAILED",
    "INTERRUPTED",
    "RETRYING",
  ]);
  const actionStatus =
    typeof raw.action_status === "string" && validStatuses.has(raw.action_status)
      ? (raw.action_status as TelemetryEvent["action_status"])
      : "SUCCESS";

  const validSignoff = new Set(["AUTO_APPROVED", "PENDING_REVIEW", "REJECTED"]);
  const signoffStatus =
    typeof raw.signoff_status === "string" && validSignoff.has(raw.signoff_status)
      ? (raw.signoff_status as TelemetryEvent["signoff_status"])
      : "AUTO_APPROVED";

  const validEnv = new Set(["production", "staging", "development"]);
  const environment =
    typeof raw.environment === "string" && validEnv.has(raw.environment)
      ? (raw.environment as TelemetryEvent["environment"])
      : "production";

  const newEvent: TelemetryEvent = {
    id,
    tenant_id: safeStr(raw.tenant_id, "org_kpmg_advisory_client", 120),
    engagement_code: safeStr(raw.engagement_code, "ENG-2026-CFO-LIVE", 120),
    user_id: safeStr(raw.user_id, "usr_kpmg_lead_01", 120),
    user_email: safeStr(raw.user_email, "lead.director@kpmg.com", 160),
    user_role: safeStr(raw.user_role, "KPMG_LEAD", 80),
    client_ip: safeStr(raw.client_ip, "127.0.0.1", 64),
    user_agent: safeStr(raw.user_agent, "KPMG CFO Advisory Client Agent", 240),

    product_id: safeStr(raw.product_id, "invoice-processing-p2p", 80),
    product_name: safeStr(
      raw.product_name,
      "AI Invoice Processing",
      160
    ),
    product_version: safeStr(raw.product_version, "1.0.0", 40),
    environment,
    session_id: safeStr(raw.session_id, `sess_${Date.now()}`, 120),
    trace_id: safeStr(
      raw.trace_id,
      `trc_00-${crypto.randomBytes(16).toString("hex")}`,
      120
    ),
    span_id: safeStr(
      raw.span_id,
      `spn_${crypto.randomBytes(8).toString("hex")}`,
      120
    ),
    parent_span_id:
      typeof raw.parent_span_id === "string" && raw.parent_span_id.trim()
        ? raw.parent_span_id.trim().slice(0, 120)
        : undefined,

    workflow_id: safeStr(raw.workflow_id, `wf_${Date.now()}`, 120),
    workflow_name: safeStr(raw.workflow_name, "Autonomous Advisory Execution", 160),
    step_name: safeStr(raw.step_name, "MODEL_INFERENCE_STEP", 120),
    step_sequence: Math.max(1, Math.round(safeNum(raw.step_sequence, 1))),
    action_name: safeStr(raw.action_name, "EXECUTE_AI_PIPELINE", 160),
    action_status: actionStatus,
    target_entity_type: safeStr(raw.target_entity_type, "FINANCIAL_DOCUMENT", 80),
    target_entity_id: safeStr(raw.target_entity_id, "DOC-AUTO-GEN", 120),
    document_pages:
      raw.document_pages !== undefined
        ? Math.max(0, Math.round(safeNum(raw.document_pages, 1)))
        : undefined,

    ai_provider: safeStr(raw.ai_provider, "google_vertex", 80),
    model_name: safeStr(raw.model_name, "gemini-2.5-flash", 100),
    model_version:
      typeof raw.model_version === "string" && raw.model_version.trim()
        ? raw.model_version.trim().slice(0, 80)
        : undefined,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    reasoning_tokens: reasoningTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: Number(Math.max(0, rawCost).toFixed(6)),
    temperature: safeNum(raw.temperature, 0.0),
    finish_reason: safeStr(raw.finish_reason, "stop", 60),
    confidence_score:
      raw.confidence_score !== undefined
        ? Math.max(0, Math.min(1, safeNum(raw.confidence_score, 0)))
        : undefined,

    timestamp_start: safeStr(raw.timestamp_start, now, 64),
    timestamp_end: safeStr(raw.timestamp_end, now, 64),
    duration_ms: Math.max(0, Math.round(safeNum(raw.duration_ms, 0))),
    time_to_first_token_ms:
      raw.time_to_first_token_ms !== undefined
        ? Math.max(0, Math.round(safeNum(raw.time_to_first_token_ms, 0)))
        : undefined,
    http_status_code: Math.round(safeNum(raw.http_status_code, 200)),

    input_query_sanitized: inputCheck.sanitized,
    output_response_sanitized: outputCheck.sanitized,
    pii_masked_flag:
      inputCheck.wasMasked ||
      outputCheck.wasMasked ||
      toolArgsCheck.wasMasked ||
      Boolean(raw.pii_masked_flag),

    tool_name:
      typeof raw.tool_name === "string" && raw.tool_name.trim()
        ? raw.tool_name.trim().slice(0, 100)
        : undefined,
    tool_arguments_sanitized: toolArgsCheck.value as
      | Record<string, unknown>
      | undefined,
    tool_status:
      typeof raw.tool_status === "string" && raw.tool_status.trim()
        ? raw.tool_status.trim().slice(0, 60)
        : undefined,

    requires_human_signoff: Boolean(raw.requires_human_signoff),
    signoff_status: signoffStatus,

    created_at: safeStr(raw.created_at, now, 64),
  };

  return mutateJsonFile(
    getTelemetryFile(),
    () => [],
    validateEventsArray,
    (events) => ({
      next: [newEvent, ...events],
      result: newEvent,
    })
  );
}

export interface GetEventsFilter {
  productId?: string;
  allowedProductIds?: string[];
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getTelemetryEvents(filter: GetEventsFilter = {}): {
  events: TelemetryEvent[];
  total: number;
} {
  let list = loadAllEvents();

  if (Array.isArray(filter.allowedProductIds)) {
    const allowed = new Set(filter.allowedProductIds);
    list = list.filter((e) => allowed.has(e.product_id));
  }
  if (filter.productId && filter.productId !== "ALL") {
    list = list.filter((e) => e.product_id === filter.productId);
  }
  if (filter.status && filter.status !== "ALL") {
    list = list.filter((e) => e.action_status === filter.status);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (e) =>
        String(e.product_name ?? "").toLowerCase().includes(q) ||
        String(e.action_name ?? "").toLowerCase().includes(q) ||
        String(e.target_entity_id ?? "").toLowerCase().includes(q) ||
        String(e.model_name ?? "").toLowerCase().includes(q)
    );
  }

  const total = list.length;
  const offset = Math.max(0, Math.min(100_000, Math.floor(filter.offset || 0)));
  const limit = Math.max(1, Math.min(5000, Math.floor(filter.limit || 50)));
  const paginated = list.slice(offset, offset + limit);

  return { events: paginated, total };
}

export function getTelemetryMetrics(allowedProductIds?: string[]): TelemetryMetrics {
  let events = loadAllEvents();
  let products = getAllProducts();

  if (Array.isArray(allowedProductIds)) {
    const allowed = new Set(allowedProductIds);
    events = events.filter((e) => allowed.has(e.product_id));
    products = products.filter((p) => allowed.has(p.id));
  }

  let totalCostUsd = 0;
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let reasoningTokens = 0;
  let totalDurationMs = 0;
  let successCount = 0;

  // Use Map instead of plain objects to prevent Object.prototype key collisions
  const modelMap = new Map<string, { count: number; tokens: number }>();
  const statusMap = new Map<string, number>();

  for (const e of events) {
    totalCostUsd += Number(e.estimated_cost_usd) || 0;
    totalTokens += Number(e.total_tokens) || 0;
    promptTokens += Number(e.prompt_tokens) || 0;
    completionTokens += Number(e.completion_tokens) || 0;
    reasoningTokens += Number(e.reasoning_tokens) || 0;
    totalDurationMs += Number(e.duration_ms) || 0;

    if (e.action_status === "SUCCESS") {
      successCount++;
    }

    const m = String(e.model_name || "Unknown");
    const mEntry = modelMap.get(m) || { count: 0, tokens: 0 };
    mEntry.count++;
    mEntry.tokens += Number(e.total_tokens) || 0;
    modelMap.set(m, mEntry);

    const st = String(e.action_status || "UNKNOWN");
    statusMap.set(st, (statusMap.get(st) || 0) + 1);
  }

  const totalEventsCount = events.length;
  const avgDurationMs =
    totalEventsCount > 0 ? Math.round(totalDurationMs / totalEventsCount) : 0;
  const successRate =
    totalEventsCount > 0
      ? Number(((successCount / totalEventsCount) * 100).toFixed(1))
      : 100;

  const modelDistribution = Array.from(modelMap.entries()).map(([model, data]) => ({
    model,
    count: data.count,
    tokenCount: data.tokens,
  }));

  const statusDistribution = Array.from(statusMap.entries()).map(
    ([status, count]) => ({
      status,
      count,
    })
  );

  return {
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    totalTokens,
    promptTokens,
    completionTokens,
    reasoningTokens,
    avgDurationMs,
    successRate,
    totalEventsCount,
    activeProductsCount: products.length,
    modelDistribution,
    statusDistribution,
  };
}

export function getTenantEvents(
  tenantId: string,
  aliases: string[] = [],
  sinceIso?: string
): TelemetryEvent[] {
  const events = loadAllEvents();
  const searchSet = new Set(
    [tenantId, ...aliases].filter(Boolean).map((s) => s.trim().toLowerCase())
  );
  if (searchSet.size === 0) return [];

  const sinceTime = sinceIso ? new Date(sinceIso).getTime() : 0;

  return events.filter((e) => {
    const tId = (e.tenant_id || "").trim().toLowerCase();
    const engCode = (e.engagement_code || "").trim().toLowerCase();
    const matchesTenant = searchSet.has(tId) || searchSet.has(engCode);
    if (!matchesTenant) return false;

    if (sinceTime > 0) {
      const evtTime = new Date(e.created_at || e.timestamp_start).getTime();
      if (Number.isFinite(evtTime) && evtTime < sinceTime) {
        return false;
      }
    }
    return true;
  });
}
