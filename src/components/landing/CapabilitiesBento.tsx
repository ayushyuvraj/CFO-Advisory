"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CheckCircle,
  Clock,
  Database,
  GitBranch,
  LockKey,
  Pulse,
} from "@phosphor-icons/react";
import { WORKFLOWS } from "@/data/workflows";

const PREVIEW_WORKFLOWS = WORKFLOWS.slice(0, 3);

export function CapabilitiesBento() {
  const [selectedId, setSelectedId] = useState(PREVIEW_WORKFLOWS[0].id);
  const prefersReducedMotion = useReducedMotion();

  const activeWorkflow =
    PREVIEW_WORKFLOWS.find((w) => w.id === selectedId) ?? PREVIEW_WORKFLOWS[0];

  return (
    <section id="capabilities" className="bg-[#030816] py-24 sm:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-[#F4F7FB] sm:text-5xl">
          Institutional precision across every finance workflow.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-6">
          {/* Cell 1 of 5: Interactive live workflow node switcher preview */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between rounded-sm border border-[#162447] bg-[#0B1736] p-6 sm:p-8 md:col-span-4"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#162447] pb-5">
                <div className="flex items-center gap-2.5">
                  <GitBranch size={20} weight="light" className="text-[#1E6BFF]" />
                  <h3 className="text-lg font-semibold text-[#F4F7FB]">
                    Live Studio Node Lineage
                  </h3>
                </div>

                <div
                  role="tablist"
                  aria-label="Preview workflow blueprints"
                  className="flex flex-wrap gap-1.5"
                >
                  {PREVIEW_WORKFLOWS.map((wf) => {
                    const selected = wf.id === activeWorkflow.id;
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setSelectedId(wf.id)}
                        className={`rounded-sm px-3 py-1.5 font-mono text-xs transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] ${
                          selected
                            ? "bg-[#1E6BFF] text-white"
                            : "border border-[#162447] bg-[#07112B] text-[#CBD5E1] hover:text-[#F4F7FB]"
                        }`}
                      >
                        {wf.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xl font-semibold tracking-tight text-[#F4F7FB]">
                    {activeWorkflow.title}
                  </p>
                  <span className="rounded-sm border border-[#1E6BFF]/40 bg-[#1E6BFF]/10 px-2.5 py-1 font-mono text-xs text-[#7FB0FF]">
                    {activeWorkflow.controlTier}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#CBD5E1]">
                  {activeWorkflow.executiveSummary}
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {activeWorkflow.executionSteps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-sm border border-[#162447] bg-[#07112B] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-[#7FB0FF]">
                          {step.id}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-[#CBD5E1]">
                          <CheckCircle
                            size={14}
                            weight="light"
                            className="text-[#1E6BFF]"
                          />
                          {step.duration}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-[#F4F7FB]">
                        {step.stage}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[#7E91B3]">
                        {step.system}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#162447] pt-4 text-xs text-[#7E91B3]">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Clock size={14} weight="light" className="text-[#CBD5E1]" />
                {activeWorkflow.cadence}
              </span>
              <span className="font-mono text-[#CBD5E1]">
                Last verified run: {activeWorkflow.lastRunAt}
              </span>
            </div>
          </motion.div>

          {/* Cell 2 of 5: Architectural photography surface */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-sm border border-[#162447] bg-[#07112B] md:col-span-2"
          >
            <Image
              src="/images/pillar-ai.jpg"
              alt="Cobalt glass finance transformation architecture"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover object-center opacity-75"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#030816] via-[#030816]/65 to-transparent"
            />
            <div className="relative z-10 p-6 sm:p-7">
              <h3 className="text-lg font-semibold text-[#F4F7FB]">
                Powered Finance Blueprints
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                Pre-configured target operating models aligned to global ERP chart-of-accounts standards.
              </p>
            </div>
          </motion.div>

          {/* Cell 3 of 5: Subtle cobalt radial surface */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between rounded-sm border border-[#162447] bg-[radial-gradient(circle_at_top_right,rgba(30,107,255,0.22),#0B1736_70%)] p-6 sm:p-7 md:col-span-2"
          >
            <LockKey size={22} weight="light" className="text-[#1E6BFF]" />
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-[#F4F7FB]">
                SOX-Aligned Audit Lineage
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                Every transformation step records immutable policy checks, timestamps, and preparer sign-off.
              </p>
            </div>
          </motion.div>

          {/* Cell 4 of 5: Clean hairline architectural grid card */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between rounded-sm border border-[#162447] bg-[#07112B] bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] p-6 sm:p-7 md:col-span-2"
          >
            <Database size={22} weight="light" className="text-[#CBD5E1]" />
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-[#F4F7FB]">
                Native ERP &amp; EPM Sync
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                Direct integration across SAP S/4HANA, Workday, Oracle Fusion, Anaplan, Kyriba, and BlackLine.
              </p>
            </div>
          </motion.div>

          {/* Cell 5 of 5: Top-accented Cobalt Slate card */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between rounded-sm border border-[#162447] border-t-2 border-t-[#1E6BFF] bg-[#0B1736] p-6 sm:p-7 md:col-span-2"
          >
            <Pulse size={22} weight="light" className="text-[#1E6BFF]" />
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-[#F4F7FB]">
                Zero Spreadsheet Handoffs
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                Replace manual file consolidation with continuous close readiness and boardroom-grade outputs.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
