"use client";

import {
  X,
  Cpu,
  Clock,
  ShieldCheck,
  CheckCircle,
  XCircle,
  CurrencyDollar,
  Lightning,
  FileText,
  Terminal,
} from "@phosphor-icons/react";
import { TelemetryEvent } from "@/lib/telemetry/types";

interface AuditInspectorDrawerProps {
  event: TelemetryEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditInspectorDrawer({ event, isOpen, onClose }: AuditInspectorDrawerProps) {
  if (!isOpen || !event) return null;

  const isSuccess = event.action_status === "SUCCESS";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0C233C]/40 backdrop-blur-xs transition-opacity duration-200">
      <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-[#D8DFE9] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                  isSuccess ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {isSuccess ? <CheckCircle size={13} weight="bold" /> : <XCircle size={13} weight="bold" />}
                {event.action_status}
              </span>
              <span className="font-mono text-xs font-semibold text-[#00338D]">
                {event.product_name}
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[#0C233C]">
              {event.action_name}
            </h2>
            <p className="font-mono text-xs text-[#4B5563]">
              Step: {event.step_name} (seq #{event.step_sequence}) · Entity: {event.target_entity_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1.5 text-[#4B5563] transition-colors hover:bg-[#E2E8F0] hover:text-[#0C233C]"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-3 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3 text-center">
            <div>
              <p className="text-[10px] font-mono text-[#4B5563] uppercase">Duration</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-[#0C233C] flex items-center justify-center gap-1">
                <Clock size={12} weight="bold" className="text-[#00338D]" />
                {event.duration_ms} ms
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-[#4B5563] uppercase">Total Tokens</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-[#0C233C] flex items-center justify-center gap-1">
                <Lightning size={12} weight="bold" className="text-[#00338D]" />
                {event.total_tokens?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-[#4B5563] uppercase">Model Cost</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-[#0C233C] flex items-center justify-center gap-1">
                <CurrencyDollar size={12} weight="bold" className="text-[#009A44]" />
                ${event.estimated_cost_usd}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-[#4B5563] uppercase">Model</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-[#1E49E2] truncate">
                {event.model_name}
              </p>
            </div>
          </div>

          {/* Section 1: AI Model Execution Telemetry */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0C233C]">
              <Cpu size={15} weight="bold" className="text-[#00338D]" />
              AI Model Execution Telemetry
            </h3>
            <div className="rounded-sm border border-[#D8DFE9] bg-white p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="text-[#4B5563]">AI Provider</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">{event.ai_provider}</dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Model Identifier</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">{event.model_name}</dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Prompt / Completion Tokens</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">
                    {event.prompt_tokens?.toLocaleString()} in / {event.completion_tokens?.toLocaleString()} out
                  </dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Reasoning / Thinking Tokens</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">
                    {event.reasoning_tokens ? event.reasoning_tokens.toLocaleString() : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Temperature / Finish Reason</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">
                    {event.temperature} / {event.finish_reason}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Confidence Score</dt>
                  <dd className="font-mono font-medium text-[#009A44]">
                    {event.confidence_score ? `${(event.confidence_score * 100).toFixed(1)}%` : "N/A"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Section 2: Identity & Trace Context */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0C233C]">
              <ShieldCheck size={15} weight="bold" className="text-[#00338D]" />
              Identity & Distributed Trace Context
            </h3>
            <div className="rounded-sm border border-[#D8DFE9] bg-white p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="text-[#4B5563]">Executed By</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">{event.user_email}</dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Active Role</dt>
                  <dd className="font-mono font-medium text-[#00338D]">{event.user_role}</dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Client Engagement Code</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">{event.engagement_code}</dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Tenant Identifier</dt>
                  <dd className="font-mono font-medium text-[#0C233C]">{event.tenant_id}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[#4B5563]">W3C Distributed Trace ID</dt>
                  <dd className="font-mono text-[11px] text-[#1E49E2] break-all">{event.trace_id}</dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Span ID</dt>
                  <dd className="font-mono text-[11px] text-[#4B5563]">{event.span_id}</dd>
                </div>
                <div>
                  <dt className="text-[#4B5563]">Session ID</dt>
                  <dd className="font-mono text-[11px] text-[#4B5563]">{event.session_id}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Section 3: Sanitized Prompt & Evidence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0C233C]">
                <FileText size={15} weight="bold" className="text-[#00338D]" />
                Input Query / Prompt (Sanitized)
              </h3>
              {event.pii_masked_flag && (
                <span className="rounded-sm border border-[#009A44]/30 bg-[#F0FDF4] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#009A44]">
                  PII Masked & Redacted
                </span>
              )}
            </div>
            <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3 font-mono text-xs text-[#0C233C] whitespace-pre-wrap break-words">
              {event.input_query_sanitized || "No prompt payload captured"}
            </div>
          </div>

          {/* Section 4: Sanitized Model Output */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0C233C]">
              <Terminal size={15} weight="bold" className="text-[#00338D]" />
              Model Output / Decision Response
            </h3>
            <div className="rounded-sm border border-[#D8DFE9] bg-[#0C233C] p-3 font-mono text-xs text-emerald-400 whitespace-pre-wrap break-words">
              {event.output_response_sanitized || "No output payload captured"}
            </div>
          </div>

          {/* Section 5: Tool & Integration Calling */}
          {event.tool_name && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0C233C]">
                Integrated ERP / Connector Execution
              </h3>
              <div className="rounded-sm border border-[#D8DFE9] bg-white p-3 font-mono text-xs">
                <p className="font-semibold text-[#00338D]">Tool: {event.tool_name}</p>
                <p className="text-[#4B5563] mt-1">Status: {event.tool_status || "SUCCESS"}</p>
                {event.tool_arguments_sanitized && (
                  <pre className="mt-2 rounded bg-[#F8FAFC] p-2 text-[11px] text-[#0C233C] overflow-x-auto">
                    {JSON.stringify(event.tool_arguments_sanitized, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4 text-xs">
          <span className="font-mono text-[#4B5563]">
            Captured: {new Date(event.created_at).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-1.5 font-semibold text-[#0C233C] hover:bg-[#F4F6FA]"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
