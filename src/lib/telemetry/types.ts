export interface RegisteredProduct {
  id: string;
  name: string;
  shortName: string;
  description: string;
  pillar: "TRANSFORMATION_AI" | "TREASURY" | "CLOSE_REPORT" | "EPM";
  launchUrl: string;
  portFrontend?: number;
  portBackend?: number;
  apiKey: string;
  status: "active" | "beta" | "maintenance";
  tags: string[];
  features: string[];
  systemIntegration: string;
  createdAt: string;
}

export interface TelemetryEvent {
  id: string;
  
  // Dimension 1: Identity & Tenancy
  tenant_id: string;
  engagement_code: string;
  user_id: string;
  user_email: string;
  user_role: string;
  client_ip?: string;
  user_agent?: string;
  
  // Dimension 2: Product & Context Hierarchy
  product_id: string;
  product_name: string;
  product_version: string;
  environment: "production" | "staging" | "development";
  session_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  
  // Dimension 3: Workflow & Business Intent
  workflow_id: string;
  workflow_name: string;
  step_name: string;
  step_sequence: number;
  action_name: string;
  action_status: "STARTED" | "SUCCESS" | "FAILED" | "INTERRUPTED" | "RETRYING";
  target_entity_type: string;
  target_entity_id: string;
  document_pages?: number;
  
  // Dimension 4: AI & Model Execution
  ai_provider: string;
  model_name: string;
  model_version?: string;
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens?: number;
  total_tokens: number;
  estimated_cost_usd: number;
  temperature: number;
  finish_reason: string;
  confidence_score?: number;
  
  // Dimension 5: Latency & Performance Timers
  timestamp_start: string;
  timestamp_end: string;
  duration_ms: number;
  time_to_first_token_ms?: number;
  http_status_code?: number;
  
  // Dimension 6: Payload & Content Evidence
  input_query_sanitized?: string;
  output_response_sanitized?: string;
  pii_masked_flag: boolean;
  
  // Dimension 7: Tool & Integration Calling
  tool_name?: string;
  tool_arguments_sanitized?: Record<string, unknown>;
  tool_status?: string;
  
  // Dimension 8: Governance, SOX Audit & Signoff
  requires_human_signoff: boolean;
  signoff_status: "AUTO_APPROVED" | "PENDING_REVIEW" | "REJECTED";
  
  created_at: string;
}

export interface TelemetryMetrics {
  totalCostUsd: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  avgDurationMs: number;
  successRate: number;
  totalEventsCount: number;
  activeProductsCount: number;
  modelDistribution: { model: string; count: number; tokenCount: number }[];
  statusDistribution: { status: string; count: number }[];
}
