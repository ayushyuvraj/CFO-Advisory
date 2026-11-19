"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Cpu,
  Sparkle,
  CheckCircle,
  Database,
  ArrowSquareOut,
  Code,
  Eye,
  Prohibit,
} from "@phosphor-icons/react";
import { ConnectedPlatform } from "@/data/platforms";
import { TelemetryEvent, TelemetryMetrics } from "@/lib/telemetry/types";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { ProductHealthProbe } from "./CompactProductCard";

function formatCategory(cat: string): string {
  if (cat === "TRANSFORMATION_AI") return "Finance Transformation & Automation";
  if (cat === "TREASURY") return "Treasury & Working Capital";
  if (cat === "CLOSE_REPORT") return "Close-to-Report & ESG";
  if (cat === "EPM") return "EPM & FP&A";
  return cat;
}

function isSafeLaunchUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

interface ProductDetailsDrawerProps {
  platform: ConnectedPlatform | null;
  probe?: ProductHealthProbe;
  isOpen: boolean;
  onClose: () => void;
  telemetrySummary?: {
    total: number;
    latestEvent?: TelemetryEvent;
    metrics?: TelemetryMetrics;
  } | null;
  canLaunchProducts: boolean;
  isPreviewMode: boolean;
  canViewAudit: boolean;
  onOpenAuditTab: () => void;
}

export function ProductDetailsDrawer({
  platform,
  probe,
  isOpen,
  onClose,
  telemetrySummary,
  canLaunchProducts,
  isPreviewMode,
  canViewAudit,
  onOpenAuditTab,
}: ProductDetailsDrawerProps) {
  if (!isOpen || !platform || typeof document === "undefined") return null;

  return createPortal(
    <ProductDetailsDrawerInner
      platform={platform}
      probe={probe}
      onClose={onClose}
      telemetrySummary={telemetrySummary}
      canLaunchProducts={canLaunchProducts}
      isPreviewMode={isPreviewMode}
      canViewAudit={canViewAudit}
      onOpenAuditTab={onOpenAuditTab}
    />,
    document.body
  );
}

function ProductDetailsDrawerInner({
  platform,
  probe,
  onClose,
  telemetrySummary,
  canLaunchProducts,
  isPreviewMode,
  canViewAudit,
  onOpenAuditTab,
}: {
  platform: ConnectedPlatform;
  probe?: ProductHealthProbe;
  onClose: () => void;
  telemetrySummary?: {
    total: number;
    latestEvent?: TelemetryEvent;
    metrics?: TelemetryMetrics;
  } | null;
  canLaunchProducts: boolean;
  isPreviewMode: boolean;
  canViewAudit: boolean;
  onOpenAuditTab: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(true, drawerRef, onClose);

  const currentStatus = probe
    ? probe.status
    : platform.status === "active"
      ? "operational"
      : "maintenance";

  const isOperational = currentStatus === "operational";
  const isMaintenance = currentStatus === "maintenance";
  const isOffline = currentStatus === "offline";
  const safeLaunch = isSafeLaunchUrl(platform.launchUrl);
  const hasTelemetry = Boolean(canViewAudit && telemetrySummary && telemetrySummary.total > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-product-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-[#0C233C]/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Drawer Surface */}
      <div
        ref={drawerRef}
        className="relative z-10 flex h-full w-full max-w-[540px] flex-col border-l border-[#D8DFE9] bg-white shadow-2xl transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
              <Cpu size={20} weight="bold" />
            </div>
            <div>
              <h2
                id="drawer-product-title"
                className="text-base font-bold text-[#0C233C]"
              >
                {platform.title}
              </h2>
              <p className="font-mono text-xs text-[#00338D]">
                {formatCategory(platform.category)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-sm text-[#526075] transition-colors hover:bg-[#E2E8F0] hover:text-[#0C233C]"
            aria-label="Close drawer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-xs">
          {/* Status & Live Health Probes */}
          <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#526075]">Overall Platform Status</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold ${
                  isOperational
                    ? "text-[#009A44]"
                    : isMaintenance
                      ? "text-amber-700"
                      : "text-red-700"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOperational
                      ? "bg-[#009A44] animate-pulse"
                      : isMaintenance
                        ? "bg-amber-500"
                        : "bg-red-600"
                  }`}
                />
                {isOperational
                  ? "Operational"
                  : isMaintenance
                    ? "Maintenance"
                    : "Offline"}
              </span>
            </div>

            {/* Sub-engine Live Status (Frontend / Backend) */}
            <div className="flex items-center justify-between pt-1 border-t border-[#D8DFE9]/60">
              <span className="font-mono text-[#526075]">Frontend Engine (:5173)</span>
              <span className="font-mono text-[11px] font-semibold flex items-center gap-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    probe?.frontendOnline ? "bg-[#009A44]" : "bg-red-500"
                  }`}
                />
                <span className={probe?.frontendOnline ? "text-[#009A44]" : "text-red-600"}>
                  {probe?.frontendOnline ? "Online" : "Offline"}
                </span>
              </span>
            </div>

            {platform.portBackend && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[#526075]">Backend Service (:{platform.portBackend})</span>
                <span className="font-mono text-[11px] font-semibold flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      probe?.backendOnline ? "bg-[#009A44]" : "bg-red-500"
                    }`}
                  />
                  <span className={probe?.backendOnline ? "text-[#009A44]" : "text-red-600"}>
                    {probe?.backendOnline ? "Online" : "Offline"}
                  </span>
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-[#D8DFE9]/60">
              <span className="font-mono text-[#526075]">System Identifier</span>
              <span className="font-mono text-[#0C233C]">{platform.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#526075]">Launch Target</span>
              <span className="font-mono text-[#0C233C]">{platform.launchUrl}</span>
            </div>
            {platform.portBackend && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[#526075]">API Documentation</span>
                <a
                  href={`http://localhost:${platform.portBackend}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[#00338D] hover:underline"
                >
                  <span>:{platform.portBackend}/docs</span>
                  <ArrowSquareOut size={12} weight="bold" />
                </a>
              </div>
            )}
          </div>

          {/* Overview / Description */}
          <div>
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0C233C]">
              Platform Overview
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#333940]">
              {platform.description}
            </p>
          </div>

          {/* Core Capabilities */}
          <div>
            <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0C233C]">
              <Sparkle size={13} weight="bold" className="text-[#00338D]" />
              Core Platform Capabilities
            </h3>
            <div className="mt-3 space-y-2">
              {platform.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-[#333940]">
                  <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-[#009A44]" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connected ERPs & Gateways */}
          <div>
            <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0C233C]">
              <Database size={13} weight="bold" className="text-[#00338D]" />
              Connected Systems
            </h3>
            <div className="mt-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-2.5 font-mono text-[11px] text-[#0C233C]">
              {platform.systemIntegration}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex flex-wrap gap-1.5">
              {platform.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-xs border border-[#D8DFE9] bg-[#F4F6FA] px-2 py-0.5 font-mono text-[10px] text-[#526075]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Clean Observability Link Box (Zero Latency / Run Noise) */}
          {hasTelemetry && telemetrySummary?.latestEvent && (
            <div className="rounded-sm border border-[#009A44]/40 bg-[#009A44]/5 p-3.5">
              <div className="flex items-center justify-between border-b border-[#009A44]/20 pb-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#009A44]">
                  <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" />
                  Live Observability Active
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuditTab();
                  }}
                  className="font-mono text-[10px] font-semibold text-[#00338D] hover:underline"
                >
                  Audit Inspector →
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2.5 font-mono text-[11px]">
                <div>
                  <p className="text-[#526075]">Last Action</p>
                  <p className="font-semibold text-[#0C233C] truncate">
                    {telemetrySummary.latestEvent.action_name}
                  </p>
                </div>
                <div>
                  <p className="text-[#526075]">Active Model</p>
                  <p className="font-semibold text-[#00338D]">
                    {telemetrySummary.latestEvent.model_name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer: Actions */}
        <div className="flex items-center justify-between border-t border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
          {platform.portBackend ? (
            <a
              href={`http://localhost:${platform.portBackend}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#00338D] hover:underline"
            >
              <Code size={15} weight="bold" />
              <span>API Documentation</span>
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-[#D8DFE9] bg-white px-3.5 py-1.5 font-mono text-xs font-semibold text-[#333940] transition-colors hover:bg-[#E2E8F0]"
            >
              Close
            </button>

            {isPreviewMode ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#1E49E2]/30 bg-[#1E49E2]/10 px-4 py-1.5 font-mono text-xs font-semibold text-[#00338D] opacity-75 cursor-not-allowed"
              >
                <Eye size={15} weight="bold" />
                <span>Preview Mode</span>
              </button>
            ) : canLaunchProducts && safeLaunch ? (
              <a
                href={platform.launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-4 py-1.5 font-mono text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1E49E2]"
              >
                <span>Launch Platform</span>
                <ArrowSquareOut size={15} weight="bold" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-gray-100 px-4 py-1.5 font-mono text-xs font-semibold text-[#6B7280] cursor-not-allowed"
              >
                <Prohibit size={15} weight="bold" />
                <span>Restricted</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
