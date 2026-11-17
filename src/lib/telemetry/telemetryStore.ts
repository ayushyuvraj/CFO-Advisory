import fs from "fs";
import path from "path";
import crypto from "crypto";
import { TelemetryEvent, TelemetryMetrics } from "./types";
import { getAllProducts } from "./productRegistry";

const DATA_DIR = path.join(process.cwd(), "data");
const TELEMETRY_FILE = path.join(DATA_DIR, "cfo_telemetry_store.json");

// PII Redaction Regexes for financial data
const IBAN_REGEX = /\b[A-Z]{2}[0-9]{2}(?:[ ]?[0-9]{4}){4}(?!(?:[ ]?[0-9]){1})\b/gi;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const GSTIN_REGEX = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g;

export function maskFinancialPii(text: string | undefined): { sanitized: string; wasMasked: boolean } {
  if (!text) return { sanitized: "", wasMasked: false };
  let sanitized = text;
  let wasMasked = false;

  if (IBAN_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(IBAN_REGEX, "[REDACTED_IBAN]");
    wasMasked = true;
  }
  if (CREDIT_CARD_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(CREDIT_CARD_REGEX, "[REDACTED_CARD]");
    wasMasked = true;
  }
  if (SSN_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(SSN_REGEX, "[REDACTED_TIN]");
    wasMasked = true;
  }
  if (GSTIN_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(GSTIN_REGEX, "[REDACTED_GSTIN]");
    wasMasked = true;
  }

  return { sanitized, wasMasked };
}

function ensureDirectoryExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAllEvents(): TelemetryEvent[] {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(TELEMETRY_FILE)) {
      return [];
    }
    const data = fs.readFileSync(TELEMETRY_FILE, "utf8");
    if (!data.trim()) return [];
    return JSON.parse(data) as TelemetryEvent[];
  } catch (err) {
    console.error("[Telemetry Store] Error reading events file:", err);
    return [];
  }
}

function saveEvents(events: TelemetryEvent[]): void {
  ensureDirectoryExists();
  fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(events, null, 2), "utf8");
}

export function appendTelemetryEvent(raw: Partial<TelemetryEvent>): TelemetryEvent {
  const events = loadAllEvents();

  const id = raw.id || `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();

  // PII Redaction
  const inputCheck = maskFinancialPii(raw.input_query_sanitized);
  const outputCheck = maskFinancialPii(raw.output_response_sanitized);

  const promptTokens = Number(raw.prompt_tokens) || 0;
  const completionTokens = Number(raw.completion_tokens) || 0;
  const reasoningTokens = Number(raw.reasoning_tokens) || 0;
  const totalTokens = raw.total_tokens || promptTokens + completionTokens + reasoningTokens;

  // Actual cost calculation (Gemini 1.5 Pro ~$1.25 / 1M prompt, $5.00 / 1M completion)
  let cost = raw.estimated_cost_usd;
  if (cost === undefined) {
    cost = (promptTokens * 0.00000125) + (completionTokens * 0.000005);
  }

  const newEvent: TelemetryEvent = {
    id,
    tenant_id: raw.tenant_id || "org_kpmg_advisory_client",
    engagement_code: raw.engagement_code || "ENG-2026-CFO-LIVE",
    user_id: raw.user_id || "usr_kpmg_lead_01",
    user_email: raw.user_email || "lead.director@kpmg.com",
    user_role: raw.user_role || "KPMG_LEAD",
    client_ip: raw.client_ip || "127.0.0.1",
    user_agent: raw.user_agent || "KPMG CFO Advisory Client Agent",

    product_id: raw.product_id || "invoice-processing-p2p",
    product_name: raw.product_name || "AI Invoice Processing & P2P Intelligence",
    product_version: raw.product_version || "1.0.0",
    environment: raw.environment || "production",
    session_id: raw.session_id || `sess_${Date.now()}`,
    trace_id: raw.trace_id || `trc_00-${crypto.randomBytes(16).toString("hex")}`,
    span_id: raw.span_id || `spn_${crypto.randomBytes(8).toString("hex")}`,
    parent_span_id: raw.parent_span_id,

    workflow_id: raw.workflow_id || `wf_${Date.now()}`,
    workflow_name: raw.workflow_name || "Autonomous Advisory Execution",
    step_name: raw.step_name || "MODEL_INFERENCE_STEP",
    step_sequence: raw.step_sequence || 1,
    action_name: raw.action_name || "EXECUTE_AI_PIPELINE",
    action_status: raw.action_status || "SUCCESS",
    target_entity_type: raw.target_entity_type || "FINANCIAL_DOCUMENT",
    target_entity_id: raw.target_entity_id || "DOC-AUTO-GEN",
    document_pages: raw.document_pages,

    ai_provider: raw.ai_provider || "google_vertex",
    model_name: raw.model_name || "gemini-1.5-pro",
    model_version: raw.model_version,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    reasoning_tokens: reasoningTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: Number(cost.toFixed(6)),
    temperature: raw.temperature !== undefined ? raw.temperature : 0.0,
    finish_reason: raw.finish_reason || "stop",
    confidence_score: raw.confidence_score !== undefined ? raw.confidence_score : 0.99,

    timestamp_start: raw.timestamp_start || now,
    timestamp_end: raw.timestamp_end || now,
    duration_ms: raw.duration_ms || 1250,
    time_to_first_token_ms: raw.time_to_first_token_ms,
    http_status_code: raw.http_status_code || 200,

    input_query_sanitized: inputCheck.sanitized,
    output_response_sanitized: outputCheck.sanitized,
    pii_masked_flag: inputCheck.wasMasked || outputCheck.wasMasked || Boolean(raw.pii_masked_flag),

    tool_name: raw.tool_name,
    tool_arguments_sanitized: raw.tool_arguments_sanitized,
    tool_status: raw.tool_status,

    requires_human_signoff: raw.requires_human_signoff || false,
    signoff_status: raw.signoff_status || "AUTO_APPROVED",

    created_at: raw.created_at || now,
  };

  const updated = [newEvent, ...events];
  saveEvents(updated);
  return newEvent;
}

export interface GetEventsFilter {
  productId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getTelemetryEvents(filter: GetEventsFilter = {}): { events: TelemetryEvent[]; total: number } {
  let list = loadAllEvents();

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
        e.product_name.toLowerCase().includes(q) ||
        e.action_name.toLowerCase().includes(q) ||
        e.target_entity_id.toLowerCase().includes(q) ||
        e.model_name.toLowerCase().includes(q)
    );
  }

  const total = list.length;
  const offset = filter.offset || 0;
  const limit = filter.limit || 50;
  const paginated = list.slice(offset, offset + limit);

  return { events: paginated, total };
}

export function getTelemetryMetrics(): TelemetryMetrics {
  const events = loadAllEvents();
  const products = getAllProducts();

  let totalCostUsd = 0;
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let reasoningTokens = 0;
  let totalDurationMs = 0;
  let successCount = 0;

  const modelMap: Record<string, { count: number; tokens: number }> = {};
  const statusMap: Record<string, number> = {};

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

    const m = e.model_name || "Unknown";
    if (!modelMap[m]) modelMap[m] = { count: 0, tokens: 0 };
    modelMap[m].count++;
    modelMap[m].tokens += Number(e.total_tokens) || 0;

    const st = e.action_status || "UNKNOWN";
    statusMap[st] = (statusMap[st] || 0) + 1;
  }

  const totalEventsCount = events.length;
  const avgDurationMs = totalEventsCount > 0 ? Math.round(totalDurationMs / totalEventsCount) : 0;
  const successRate = totalEventsCount > 0 ? Number(((successCount / totalEventsCount) * 100).toFixed(1)) : 100;

  const modelDistribution = Object.entries(modelMap).map(([model, data]) => ({
    model,
    count: data.count,
    tokenCount: data.tokens,
  }));

  const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
  }));

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
