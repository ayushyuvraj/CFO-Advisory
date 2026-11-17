"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Cpu,
  Clock,
  CurrencyDollar,
  Lightning,
  ArrowsClockwise,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Eye,
  Funnel,
  ChartLineUp,
} from "@phosphor-icons/react";
import { TelemetryEvent, TelemetryMetrics } from "@/lib/telemetry/types";
import { AuditInspectorDrawer } from "./AuditInspectorDrawer";

export function AuditConsole() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeEvent, setActiveEvent] = useState<TelemetryEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams();
      if (selectedProduct !== "ALL") params.set("productId", selectedProduct);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/telemetry?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error("[Audit Console] Fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedProduct, selectedStatus, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // SWR Smart Auto-Polling every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  const handleInspect = (event: TelemetryEvent) => {
    setActiveEvent(event);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Live Observability Mesh Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-[#D8DFE9] bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#009A44] animate-pulse" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#009A44]">
              Continuous Telemetry Ingestion Active
            </span>
            <span className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11px] text-[#4B5563]">
              PostgreSQL Append-Only Mesh
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-[#0C233C]">
            Enterprise Observability & SOX Audit Command Center
          </h2>
          <p className="mt-1 text-xs text-[#4B5563]">
            Real-time telemetry streaming from all connected execution engines across the CFO Advisory practice.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchTelemetry}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#333940] transition-colors hover:bg-[#E2E8F0]"
          >
            <ArrowsClockwise size={15} weight="bold" className={isRefreshing ? "animate-spin text-[#00338D]" : ""} />
            <span>Auto-Polling (3s)</span>
          </button>
        </div>
      </div>

      {/* Tier 1: Executive KPI Strip */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* KPI 1 */}
          <div className="rounded-sm border border-[#D8DFE9] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#4B5563]">
              <span className="font-mono text-xs font-medium uppercase">Total Spend (USD)</span>
              <CurrencyDollar size={18} weight="bold" className="text-[#009A44]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#0C233C]">
              ${metrics.totalCostUsd.toFixed(4)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#4B5563]">
              Calculated across all live LLM calls
            </p>
          </div>

          {/* KPI 2 */}
          <div className="rounded-sm border border-[#D8DFE9] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#4B5563]">
              <span className="font-mono text-xs font-medium uppercase">Tokens Consumed</span>
              <Lightning size={18} weight="bold" className="text-[#00338D]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#0C233C]">
              {metrics.totalTokens.toLocaleString()}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#4B5563]">
              {metrics.promptTokens.toLocaleString()} in · {metrics.completionTokens.toLocaleString()} out
            </p>
          </div>

          {/* KPI 3 */}
          <div className="rounded-sm border border-[#D8DFE9] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#4B5563]">
              <span className="font-mono text-xs font-medium uppercase">Avg Latency</span>
              <Clock size={18} weight="bold" className="text-[#1E49E2]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#0C233C]">
              {metrics.avgDurationMs} <span className="text-sm font-normal text-[#4B5563]">ms</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#009A44]">
              Real-world execution time
            </p>
          </div>

          {/* KPI 4 */}
          <div className="rounded-sm border border-[#D8DFE9] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#4B5563]">
              <span className="font-mono text-xs font-medium uppercase">Success Rate</span>
              <CheckCircle size={18} weight="bold" className="text-[#009A44]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#0C233C]">
              {metrics.successRate}%
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#4B5563]">
              {metrics.totalEventsCount} audit events recorded
            </p>
          </div>

          {/* KPI 5 */}
          <div className="rounded-sm border border-[#D8DFE9] bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#4B5563]">
              <span className="font-mono text-xs font-medium uppercase">Active Products</span>
              <Cpu size={18} weight="bold" className="text-[#00338D]" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#0C233C]">
              {metrics.activeProductsCount}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[#4B5563]">
              Streaming into central platform
            </p>
          </div>
        </div>
      )}

      {/* Tier 2: Search, Filter & Event Table */}
      <div className="rounded-sm border border-[#D8DFE9] bg-white shadow-xs">
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFE9] bg-[#F8FAFC] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0C233C]">
              <Funnel size={14} weight="bold" className="text-[#00338D]" />
              <span>Filters:</span>
            </div>

            {/* Product Filter */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
            >
              <option value="ALL">All Active Products</option>
              <option value="invoice-processing-p2p">AI Invoice Processing & P2P Intelligence</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlass size={14} weight="bold" className="absolute left-3 top-2.5 text-[#4B5563]" />
            <input
              type="text"
              placeholder="Search actions, models, entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-sm border border-[#D8DFE9] bg-white py-1.5 pl-8 pr-3 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#D8DFE9] bg-[#F4F6FA] font-mono text-[11px] font-semibold uppercase text-[#4B5563]">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Action / Workflow Step</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Model Used</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8DFE9]">
              {events.length === 0 ? (
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
                events.map((evt) => {
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
      </div>

      {/* Slideout Inspector Drawer */}
      <AuditInspectorDrawer
        event={activeEvent}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
