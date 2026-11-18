"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  CheckCircle,
  MagnifyingGlass,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { TelemetryEvent } from "@/lib/telemetry/types";
import { AuditInspectorDrawer } from "@/components/workflows/AuditInspectorDrawer";

interface DrillThroughAuditModalProps {
  isOpen: boolean;
  widgetTitle: string;
  events: TelemetryEvent[];
  onClose: () => void;
}

export function DrillThroughAuditModal(props: DrillThroughAuditModalProps) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return <DrillThroughAuditModalInner {...props} />;
}

function DrillThroughAuditModalInner({
  isOpen,
  widgetTitle,
  events,
  onClose,
}: DrillThroughAuditModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [inspectedEvent, setInspectedEvent] = useState<TelemetryEvent | null>(null);

  useDialogFocusTrap(isOpen, dialogRef, onClose);

  const filtered = search.trim()
    ? events.filter((e) => {
        const q = search.trim().toLowerCase();
        return (
          String(e.action_name ?? "").toLowerCase().includes(q) ||
          String(e.model_name ?? "").toLowerCase().includes(q) ||
          String(e.target_entity_id ?? "").toLowerCase().includes(q) ||
          String(e.product_name ?? "").toLowerCase().includes(q)
        );
      })
    : events;

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drillthrough-audit-title"
          data-lenis-prevent="true"
          data-lenis-prevent-wheel="true"
          data-lenis-prevent-touch="true"
        >
          <div
            onClick={onClose}
            className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-xs"
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="relative z-10 flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-2xl focus:outline-none"
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#00338D]">
                  Live Audit Drill-Through
                </span>
                <h2
                  id="drillthrough-audit-title"
                  className="text-base font-bold text-[#0C233C]"
                >
                  {widgetTitle} ({events.length} Underlying Event
                  {events.length !== 1 ? "s" : ""})
                </h2>
              </div>
              <button
                type="button"
                data-dialog-close="true"
                onClick={onClose}
                aria-label="Close drill-through"
                className="rounded-sm p-1.5 text-[#526075] hover:bg-[#E2E8F0] hover:text-[#0C233C]"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="border-b border-[#D8DFE9] bg-white px-6 py-3">
              <div className="relative max-w-md">
                <MagnifyingGlass
                  size={14}
                  weight="light"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                />
                <input
                  type="text"
                  data-autofocus="true"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter underlying audit records by action, model, or entity..."
                  aria-label="Filter audit records"
                  className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-1.5 pl-8 pr-3 text-xs text-[#0C233C] focus:border-[#00338D] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-[#F4F6FA] text-[10px] font-semibold uppercase tracking-wider text-[#0C233C]">
                  <tr>
                    <th className="border-b border-[#D8DFE9] px-4 py-2.5">Status</th>
                    <th className="border-b border-[#D8DFE9] px-4 py-2.5">Action / Entity</th>
                    <th className="border-b border-[#D8DFE9] px-4 py-2.5">AI Model</th>
                    <th className="border-b border-[#D8DFE9] px-4 py-2.5 text-right">Tokens</th>
                    <th className="border-b border-[#D8DFE9] px-4 py-2.5 text-right">Latency</th>
                    <th className="border-b border-[#D8DFE9] px-4 py-2.5 text-right">Cost</th>
                    <th className="border-b border-[#D8DFE9] px-4 py-2.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F6]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-xs text-[#64748B]"
                      >
                        No matching live telemetry events found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((ev, idx) => (
                      <tr key={ev.id || idx} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold ${
                              ev.action_status === "SUCCESS"
                                ? "bg-[#009A44]/10 text-[#009A44]"
                                : "bg-[#B91C1C]/10 text-[#B91C1C]"
                            }`}
                          >
                            {ev.action_status === "SUCCESS" ? (
                              <CheckCircle size={12} weight="bold" />
                            ) : (
                              <XCircle size={12} weight="bold" />
                            )}
                            {ev.action_status || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[#0C233C]">
                            {ev.action_name || "Unknown Action"}
                          </p>
                          <p className="font-mono text-[10px] text-[#526075]">
                            {ev.target_entity_type || "ENTITY"}:{" "}
                            {ev.target_entity_id || "N/A"}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-[#1E49E2]">
                          {ev.model_name || "N/A"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {(ev.total_tokens ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {ev.duration_ms ?? 0} ms
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#009A44]">
                          ${ev.estimated_cost_usd ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectedEvent(ev)}
                            className="inline-flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1 font-mono text-[10px] font-semibold text-[#00338D] hover:border-[#00338D] hover:bg-[#F4F6FA]"
                          >
                            <span>SOX Grid</span>
                            <ArrowRight size={11} weight="bold" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AuditInspectorDrawer
        event={inspectedEvent}
        isOpen={Boolean(inspectedEvent)}
        onClose={() => setInspectedEvent(null)}
      />
    </>
  );
}
