"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClockCountdown,
  Coins,
  ShieldCheck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { QuotaCheckResult } from "@/lib/governance/quotaEngine";

function formatSeconds(sec?: number): string {
  if (sec === undefined || sec <= 0) return "Imminent";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function BudgetMeterBadge() {
  const [quota, setQuota] = useState<QuotaCheckResult | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function fetchQuota() {
      try {
        const res = await fetch("/api/governance/quota/status", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (active && json.quota) {
            setQuota(json.quota);
          }
        }
      } catch {
        // Non-fatal
      }
    }

    void fetchQuota();

    const handleTelemetryEmitted = () => {
      void fetchQuota();
    };

    window.addEventListener("kpmg-telemetry-emitted", handleTelemetryEmitted);
    const interval = setInterval(fetchQuota, 30_000); // 30s live poll

    return () => {
      active = false;
      window.removeEventListener("kpmg-telemetry-emitted", handleTelemetryEmitted);
      clearInterval(interval);
    };
  }, []);

  // Click outside listener for popover
  useEffect(() => {
    if (!popoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverOpen]);

  if (!quota || quota.companyLimitUsd === null || quota.companyLimitUsd <= 0) {
    return null;
  }

  const effectiveRemaining = quota.effectiveRemainingUsd ?? quota.companyRemainingUsd ?? 0;
  const isExceeded = !quota.allowed || effectiveRemaining <= 0;
  const isLow = effectiveRemaining <= quota.companyLimitUsd * 0.15;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setPopoverOpen((prev) => !prev)}
        aria-expanded={popoverOpen}
        aria-label="View AI budget consumption and quota breakdown"
        className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00338D] ${
          isExceeded
            ? "border-[#B91C1C]/40 bg-[#B91C1C]/10 text-[#B91C1C]"
            : isLow
            ? "border-[#D97706]/40 bg-[#D97706]/10 text-[#D97706]"
            : "border-[#D8DFE9] bg-white text-[#0C233C] hover:border-[#00338D] hover:bg-[#F8FAFC]"
        }`}
      >
        <Coins
          size={14}
          weight="bold"
          className={
            isExceeded
              ? "text-[#B91C1C]"
              : isLow
              ? "text-[#D97706]"
              : "text-[#00338D]"
          }
        />
        <span className="font-mono font-semibold">
          {isExceeded ? "Budget Reached" : `$${effectiveRemaining.toFixed(2)} left`}
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isExceeded
              ? "bg-[#B91C1C] animate-pulse"
              : isLow
              ? "bg-[#D97706]"
              : "bg-[#009A44]"
          }`}
        />
      </button>

      {/* Floating Detailed Breakdown Popover */}
      {popoverOpen && (
        <div
          role="dialog"
          aria-label="AI Spend Governance Breakdown"
          className="absolute right-0 top-full mt-2 z-50 w-80 rounded-sm border border-[#D8DFE9] bg-white p-4 shadow-xl text-[#0C233C]"
        >
          <div className="flex items-center justify-between border-b border-[#D8DFE9] pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} weight="bold" className="text-[#00338D]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0C233C]">
                AI Spend Governance
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              aria-label="Close budget breakdown"
              className="text-[#6B7280] hover:text-[#0C233C]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs">
            {/* Organization Spend */}
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[#526075]">Organization Budget:</span>
                <span className="font-mono font-bold text-[#0C233C]">
                  ${quota.companySpendUsd.toFixed(2)} / ${quota.companyLimitUsd.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className={`h-full ${
                    quota.companySpendPct >= 90
                      ? "bg-[#B91C1C]"
                      : quota.companySpendPct >= 70
                      ? "bg-[#D97706]"
                      : "bg-[#00338D]"
                  }`}
                  style={{ width: `${Math.min(100, quota.companySpendPct)}%` }}
                />
              </div>
            </div>

            {/* Persona Sub-Cap (if configured) */}
            {quota.personaLimitUsd !== null && (
              <div className="border-t border-[#F1F5F9] pt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[#526075]">Your Individual Sub-Cap:</span>
                  <span className="font-mono font-bold text-[#0C233C]">
                    ${quota.personaSpendUsd.toFixed(2)} / ${quota.personaLimitUsd.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full bg-[#1E49E2]"
                    style={{
                      width: `${Math.min(100, quota.personaSpendPct ?? 0)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Reset Cadence */}
            <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-2 text-[11px] text-[#526075]">
              <div className="flex items-center gap-1">
                <ClockCountdown size={13} className="text-[#00338D]" />
                <span>Next Reset:</span>
              </div>
              <span className="font-mono font-semibold text-[#0C233C]">
                {formatSeconds(quota.secondsUntilReset)} ({quota.periodLabel})
              </span>
            </div>

            {isExceeded && (
              <div className="flex items-start gap-1.5 rounded-xs border border-[#B91C1C]/20 bg-[#B91C1C]/5 p-2 text-[11px] text-[#B91C1C]">
                <WarningCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Budget limit reached. Further AI executions are paused until reset or limit expansion by your KPMG Lead.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
