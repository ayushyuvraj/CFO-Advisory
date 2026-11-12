"use client";

import { motion, useReducedMotion } from "motion/react";
import { Cpu, GitBranch, ShieldCheck, Stack } from "@phosphor-icons/react";

const TOM_LAYERS = [
  {
    step: "01",
    layer: "Process Architecture",
    legacy: "Disconnected local spreadsheets & manual period close",
    kpmgState: "Standardized Powered Finance global design templates",
    Icon: GitBranch,
    accent: "#00338D",
  },
  {
    step: "02",
    layer: "ERP & EPM Core",
    legacy: "Fragmented regional SAP, Oracle & Workday instances",
    kpmgState: "Unified Anaplan, SAP S/4HANA & Snowflake data fabric",
    Icon: Stack,
    accent: "#1E49E2",
  },
  {
    step: "03",
    layer: "Controls & Governance",
    legacy: "Reactive quarterly SOX evidence sampling",
    kpmgState: "Embedded continuous controls & audit trail lineage",
    Icon: ShieldCheck,
    accent: "#00B8F5",
  },
  {
    step: "04",
    layer: "GenAI Digital Teammates",
    legacy: "Manual commentary & variance narrative drafting",
    kpmgState: "Policy-grounded flux narratives cited to subledgers",
    Icon: Cpu,
    accent: "#7213EA",
  },
];

export function InrTransformationChapter() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="chapter-inr"
      className="relative z-10 flex min-h-[115dvh] items-center py-24"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sm border border-[#D8DFE9] bg-white/88 p-6 shadow-[0_24px_60px_rgba(12,35,60,0.08)] backdrop-blur-md sm:p-9"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFE9] pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-[#1E49E2] font-mono text-sm font-bold text-white">
                  ₹
                </span>
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E49E2]">
                    CHAPTER 02 / 05 · INR MACRO DIVE
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#0C233C] sm:text-3xl">
                    Powered Finance &amp; EPM Architecture
                  </h2>
                </div>
              </div>
              <span className="rounded-sm bg-[#F4F6FA] px-2.5 py-1 font-mono text-[11px] font-medium text-[#00338D]">
                TARGET OPERATING MODEL
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#333940] sm:text-base">
              Inside the Indian Rupee engraving sits the operational blueprint for
              high-growth enterprise finance: rolling driver-based forecasts,
              Global Capability Center orchestration, and SAP/Anaplan alignment.
            </p>

            {/* KPMG Slide-Grade Target Operating Model Matrix */}
            <div className="mt-6 space-y-2.5">
              <div className="hidden grid-cols-[1.1fr_1fr_1.2fr] gap-3 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#526075] sm:grid">
                <span>Capability Layer</span>
                <span>Legacy State</span>
                <span className="text-[#00338D]">KPMG Powered State</span>
              </div>

              {TOM_LAYERS.map((row) => {
                const Icon = row.Icon;
                return (
                  <div
                    key={row.step}
                    className="grid grid-cols-1 items-center gap-3 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]/85 p-3.5 sm:grid-cols-[1.1fr_1fr_1.2fr]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-white"
                        style={{ backgroundColor: row.accent }}
                      >
                        <Icon size={15} weight="light" />
                      </span>
                      <div>
                        <span className="font-mono text-[10px] text-[#526075]">
                          LAYER {row.step}
                        </span>
                        <p className="text-xs font-semibold text-[#0C233C]">
                          {row.layer}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#526075]">{row.legacy}</p>

                    <div className="rounded-sm border border-[#1E49E2]/25 bg-white px-3 py-2 text-xs font-medium text-[#00338D]">
                      {row.kpmgState}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#D8DFE9] pt-4">
              <div className="flex flex-wrap gap-1.5">
                {["SAP S/4HANA", "Anaplan", "Workday", "Snowflake"].map(
                  (sys) => (
                    <span
                      key={sys}
                      className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-2.5 py-1 font-mono text-[11px] text-[#0C233C]"
                    >
                      {sys}
                    </span>
                  )
                )}
              </div>
              <span className="font-mono text-[11px] font-medium text-[#7213EA]">
                KPMG POWERED ENTERPRISE
              </span>
            </div>
          </motion.div>

          {/* Open top (mobile/tablet) / right (desktop) stage for the unfolding ₹ INR 3D macro banknote */}
          <div
            className="order-first pointer-events-none h-[230px] sm:h-[260px] lg:order-last lg:min-h-[420px]"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
