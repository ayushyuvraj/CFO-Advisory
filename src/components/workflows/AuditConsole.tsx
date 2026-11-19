"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "motion/react";
import {
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  Eye,
  ChartLineUp,
  Cpu,
  DownloadSimple,
} from "@phosphor-icons/react";
import { TelemetryEvent, TelemetryMetrics } from "@/lib/telemetry/types";
import { AuditInspectorDrawer } from "./AuditInspectorDrawer";
import {
  UnifiedWorkflowsBar,
  FilterOptionItem,
  FilterCategoryGroup,
  SortOptionItem,
} from "./UnifiedWorkflowsBar";

const AUDIT_STATUS_FILTERS: FilterOptionItem[] = [
  { id: "ALL", label: "All Statuses" },
  { id: "SUCCESS", label: "Success Only" },
  { id: "FAILED", label: "Failed Only" },
];

const AUDIT_SORT_OPTIONS: SortOptionItem[] = [
  { id: "newest", label: "Timestamp (Newest)" },
  { id: "oldest", label: "Timestamp (Oldest)" },
  { id: "duration-desc", label: "Latency (High → Low)" },
  { id: "cost-desc", label: "Spend (High → Low)" },
];

interface AuditConsoleProps {
  availableProducts?: Array<{ id: string; title: string }>;
}

export function AuditConsole({ availableProducts }: AuditConsoleProps = {}) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeEvent, setActiveEvent] = useState<TelemetryEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastFingerprintRef = useRef<string>("");

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedProduct !== "ALL") params.set("productId", selectedProduct);
    if (selectedStatus !== "ALL") params.set("status", selectedStatus);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    return params.toString();
  }, [selectedProduct, selectedStatus, searchQuery]);

  const applyTelemetryPayload = useCallback(
    (nextEvents: TelemetryEvent[], nextMetrics: TelemetryMetrics | null) => {
      const fp = `${nextEvents.length}:${nextEvents[0]?.id ?? ""}:${
        nextMetrics?.totalEventsCount ?? 0
      }:${nextMetrics?.totalTokens ?? 0}:${nextMetrics?.totalCostUsd ?? 0}`;
      if (fp === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fp;
      setEvents(nextEvents);
      setMetrics(nextMetrics);
    },
    []
  );

  const handleManualRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/telemetry?${buildQueryString()}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          events?: TelemetryEvent[];
          metrics?: TelemetryMetrics | null;
        };
        lastFingerprintRef.current = "";
        applyTelemetryPayload(data.events || [], data.metrics || null);
      }
    } catch (err) {
      console.error("[Audit Console] Fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [buildQueryString, applyTelemetryPayload]);

  // Initial load + 3s smart polling (skips hidden tabs and unchanged payloads)
  useEffect(() => {
    let cancelled = false;
    lastFingerprintRef.current = "";

    const loadTelemetry = async (isPoll: boolean) => {
      if (isPoll && typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(`/api/telemetry?${buildQueryString()}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Pragma: "no-cache" },
        });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as {
            events?: TelemetryEvent[];
            metrics?: TelemetryMetrics | null;
          };
          applyTelemetryPayload(data.events || [], data.metrics || null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[Audit Console] Fetch error:", err);
        }
      }
    };

    const initialTimer = setTimeout(() => {
      void loadTelemetry(false);
    }, 0);
    const interval = setInterval(() => {
      void loadTelemetry(true);
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [buildQueryString, applyTelemetryPayload]);

  const productFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    if (availableProducts) {
      for (const p of availableProducts) {
        map.set(p.id, p.title);
      }
    }
    for (const evt of events) {
      if (evt.product_id && !map.has(evt.product_id)) {
        map.set(evt.product_id, evt.product_name || evt.product_id);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [availableProducts, events]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "duration-desc") {
        return (b.duration_ms ?? 0) - (a.duration_ms ?? 0);
      }
      if (sortBy === "cost-desc") {
        return (b.estimated_cost_usd ?? 0) - (a.estimated_cost_usd ?? 0);
      }
      // default newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [events, sortBy]);

  const productFilterItems: FilterOptionItem[] = useMemo(
    () => [
      { id: "ALL", label: "All Products" },
      ...productFilterOptions.map((opt) => ({
        id: opt.id,
        label: opt.title,
      })),
    ],
    [productFilterOptions]
  );

  const auditFilterGroups = useMemo<FilterCategoryGroup[]>(() => {
    return [
      {
        id: "status",
        label: "Status",
        options: AUDIT_STATUS_FILTERS,
        activeValue: selectedStatus,
        onChange: setSelectedStatus,
        defaultId: "ALL",
      },
      {
        id: "product",
        label: "Product",
        icon: <Cpu size={13} weight="bold" />,
        options: productFilterItems,
        activeValue: selectedProduct,
        onChange: setSelectedProduct,
        defaultId: "ALL",
        searchable: true,
      },
    ];
  }, [selectedStatus, selectedProduct, productFilterItems]);

  const handleExportCsv = useCallback(() => {
    if (sortedEvents.length === 0) return;
    const headers = [
      "Timestamp_UTC",
      "Product",
      "Action",
      "Workflow_Step",
      "Entity_ID",
      "Model_Used",
      "Input_Tokens",
      "Output_Tokens",
      "Latency_Ms",
      "Cost_USD",
      "Status",
    ];
    const rows = sortedEvents.map((evt) => [
      `"${new Date(evt.timestamp_start || evt.created_at || Date.now()).toISOString()}"`,
      `"${(evt.product_name ?? "").replace(/"/g, '""')}"`,
      `"${(evt.action_name ?? "").replace(/"/g, '""')}"`,
      `"${(evt.step_name ?? "").replace(/"/g, '""')}"`,
      `"${(evt.target_entity_id ?? "").replace(/"/g, '""')}"`,
      `"${(evt.model_name ?? "").replace(/"/g, '""')}"`,
      evt.prompt_tokens || 0,
      evt.completion_tokens || 0,
      evt.duration_ms || 0,
      `$${(evt.estimated_cost_usd || 0).toFixed(6)}`,
      `"${evt.action_status || "SUCCESS"}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpmg-audit-telemetry-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sortedEvents]);

  const handleInspect = useCallback((event: TelemetryEvent) => {
    setActiveEvent(event);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <div className="space-y-4">
      {/* Unified Control Bar: Sits at identical Y = 100px & 52px height as all Hub tabs */}
      <UnifiedWorkflowsBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search actions, models, entities..."
        filterGroups={auditFilterGroups}
        filterLabel="Filter"
        sortOptions={AUDIT_SORT_OPTIONS}
        activeSort={sortBy}
        onSortChange={setSortBy}
        sortLabel="Sort"
        countLabel={`${sortedEvents.length} events`}
      >
        {/* Live Ingestion Indicator, Refresh Action & Primary Export CTA */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex h-[30px] items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-2.5 py-0 font-mono text-[11px] text-[#526075] box-border"
            title="Real-time telemetry continuous ingestion"
          >
            <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" />
            <span>3s polling</span>
          </span>

          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-0 text-xs font-semibold text-[#333940] transition-colors hover:bg-[#F8FAFC] active:scale-[0.98] box-border"
            title="Refresh telemetry"
          >
            <ArrowsClockwise
              size={14}
              weight="bold"
              className={isRefreshing ? "animate-spin text-[#00338D]" : ""}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-sm bg-[#00338D] px-3.5 py-0 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1E49E2] active:scale-[0.98] box-border"
            title="Export filtered audit telemetry log to CSV"
          >
            <DownloadSimple size={15} weight="bold" />
            <span>Export Log</span>
          </button>
        </div>
      </UnifiedWorkflowsBar>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-xs"
      >
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#D8DFE9] bg-[#F8FAFC] font-mono text-[11px] font-semibold uppercase text-[#526075]">
                  <th className="py-2.5 px-4">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Action / Workflow Step</th>
                  <th className="py-2.5 px-4">Entity ID</th>
                  <th className="py-2.5 px-4">Model Used</th>
                  <th className="py-2.5 px-4">Tokens</th>
                  <th className="py-2.5 px-4">Latency</th>
                  <th className="py-2.5 px-4">Cost</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DFE9]">
                {sortedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-[#4B5563]">
                      <div className="max-w-md mx-auto space-y-2">
                        <ChartLineUp size={28} weight="light" className="mx-auto text-[#00338D]" />
                        <p className="font-semibold text-[#0C233C]">No live telemetry events recorded yet</p>
                        <p className="text-[#4B5563] text-[11px]">
                          Execute an operation in a connected product (e.g. AI Invoice Processing) to capture real-time audit data.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedEvents.map((evt) => {
                    const isSuccess = evt.action_status === "SUCCESS";
                    return (
                      <tr
                        key={evt.id}
                        className="transition-colors hover:bg-[#F8FAFC] cursor-pointer"
                        onClick={() => handleInspect(evt)}
                      >
                      <td className="py-3 px-4 font-mono text-[11px] text-[#4B5563] whitespace-nowrap">
                        {new Date(evt.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0C233C] whitespace-nowrap">
                        {evt.product_name}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#00338D]">{evt.action_name}</p>
                        <p className="font-mono text-[10px] text-[#4B5563]">{evt.step_name}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#0C233C]">
                        {evt.target_entity_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#1E49E2]">
                        {evt.model_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#0C233C]">
                        {evt.total_tokens?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#4B5563]">
                        {evt.duration_ms} ms
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#009A44]">
                        ${evt.estimated_cost_usd}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isSuccess ? <CheckCircle size={11} weight="bold" /> : <XCircle size={11} weight="bold" />}
                          {evt.action_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspect(evt);
                          }}
                          className="inline-flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-[11px] font-medium text-[#00338D] hover:bg-[#F4F6FA]"
                        >
                          <Eye size={12} weight="bold" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Slideout Inspector Drawer */}
      <AuditInspectorDrawer
        event={activeEvent}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
