"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Database,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import type { WorkflowItem } from "@/data/workflows";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

interface WorkflowDrawerProps {
  workflow: WorkflowItem | null;
  onClose: () => void;
}

export function WorkflowDrawer({ workflow, onClose }: WorkflowDrawerProps) {
  const prefersReducedMotion = useReducedMotion();
  const drawerRef = useRef<HTMLElement>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, string>>({});

  useDialogFocusTrap(Boolean(workflow), drawerRef, onClose);

  const handleSimulateSync = async (id: string) => {
    setSyncingId(id);
    await new Promise((resolve) => setTimeout(resolve, 650));
    const now = new Date();
    const formatted = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setVerifiedMap((prev) => ({
      ...prev,
      [id]: `Verified just now (${formatted})`,
    }));
    setSyncingId(null);
  };

  return (
    <AnimatePresence>
      {workflow && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-workflow-title"
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.aside
            ref={drawerRef}
            tabIndex={-1}
            initial={prefersReducedMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={prefersReducedMotion ? undefined : { x: "100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[#D8DFE9] bg-white p-6 text-[#0C233C] shadow-2xl focus:outline-none sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE9] pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#1E49E2]">
                    {workflow.id}
                  </span>
                  <span className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-2 py-0.5 font-mono text-xs text-[#333940]">
                    {workflow.status}
                  </span>
                  <span className="rounded-sm border border-[#00338D]/25 bg-[#00338D]/10 px-2 py-0.5 font-mono text-xs text-[#00338D]">
                    {workflow.controlTier}
                  </span>
                </div>
                <h2
                  id="drawer-workflow-title"
                  className="mt-3 text-xl font-semibold tracking-tight text-[#0C233C] sm:text-2xl"
                >
                  {workflow.title}
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  {workflow.pillar} · {workflow.owner}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close workflow lineage drawer"
                className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-2 text-[#333940] transition-[border-color,color,transform] duration-150 hover:border-[#00338D] hover:text-[#00338D] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
              >
                <X size={18} weight="light" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <p className="text-sm leading-relaxed text-[#333940]">
                {workflow.executiveSummary}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-xs text-[#4B5563]">
                    <Clock size={15} weight="light" className="text-[#1E49E2]" />
                    <span>Execution Cadence</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[#0C233C]">
                    {workflow.cadence}
                  </p>
                </div>

                <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-xs text-[#4B5563]">
                    <ShieldCheck
                      size={15}
                      weight="light"
                      className="text-[#009A44]"
                    />
                    <span>Last Verified Run</span>
                  </div>
                  <p className="mt-1.5 font-mono text-sm font-medium text-[#0C233C]">
                    {verifiedMap[workflow.id] ?? workflow.lastRunAt}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#333940]">
                  <Database size={15} weight="light" className="text-[#1E49E2]" />
                  <span>Connected Enterprise Systems</span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {workflow.sourceSystems.map((sys) => (
                    <span
                      key={sys}
                      className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-3 py-1.5 font-mono text-xs text-[#0C233C]"
                    >
                      {sys}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#0C233C]">
                  Execution &amp; Lineage Steps
                </h3>
                <ol className="mt-3 space-y-2.5">
                  {workflow.executionSteps.map((step) => (
                    <li
                      key={step.id}
                      className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-[#1E49E2]">
                          {step.id} · {step.system}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-[#333940]">
                          <CheckCircle
                            size={14}
                            weight="light"
                            className="text-[#009A44]"
                          />
                          {step.status} ({step.duration})
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-[#0C233C]">
                        {step.stage}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="flex flex-col gap-3 border-t border-[#D8DFE9] pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleSimulateSync(workflow.id)}
                  disabled={syncingId === workflow.id}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-4 py-2.5 text-sm font-medium text-[#0C233C] whitespace-nowrap transition-[border-color,background-color,transform] duration-150 hover:border-[#00338D] hover:bg-white active:scale-[0.98] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
                >
                  <ArrowClockwise
                    size={16}
                    weight="light"
                    className={syncingId === workflow.id ? "animate-spin" : ""}
                  />
                  <span>
                    {syncingId === workflow.id
                      ? "Checking Studio Sync..."
                      : "Simulate Sync Check"}
                  </span>
                </button>

                <a
                  href={workflow.studioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
                >
                  <span>Open in Workflow Studio</span>
                  <ArrowSquareOut size={16} weight="light" />
                </a>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
