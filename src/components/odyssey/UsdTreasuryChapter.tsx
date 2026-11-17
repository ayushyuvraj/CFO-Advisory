"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle, Vault } from "@phosphor-icons/react";
import {
  RECONCILED_SCENARIOS,
  SCENARIO_ORDER,
  type ScenarioId,
} from "@/data/reconciledLedger";
import { useEquilibriumScene } from "@/context/EquilibriumSceneContext";

export function UsdTreasuryChapter() {
  const prefersReducedMotion = useReducedMotion();
  const { activeScenarioId, activeScenario, setScenario } =
    useEquilibriumScene();

  const { cashFlow: cf, incomeStatement: pl, taxBridge: tx } = activeScenario;

  const waterfallRows = [
    {
      label: "Opening Liquidity Balance",
      amount: cf.openingCash,
      widthPct: Math.min(100, (cf.openingCash / 1200) * 100),
      color: "#0C233C",
      signed: false,
    },
    {
      label: "Operating Cash Flow (NI + D&A + Tax − ΔNWC)",
      amount: cf.operatingCashFlow,
      widthPct: Math.min(100, (cf.operatingCashFlow / 1200) * 100),
      color: "#1E49E2",
      signed: true,
    },
    {
      label: "Capital Expenditures",
      amount: cf.capex,
      widthPct: Math.min(100, (Math.abs(cf.capex) / 1200) * 100),
      color: "#00B8F5",
      signed: true,
    },
    {
      label: "Debt Service & Shareholder Dividends",
      amount: cf.debtServiceAndDividends,
      widthPct: Math.min(
        100,
        (Math.abs(cf.debtServiceAndDividends) / 1200) * 100
      ),
      color: "#7213EA",
      signed: true,
    },
    {
      label: "Ending Cash (= Ties to Balance Sheet)",
      amount: cf.endingCash,
      widthPct: Math.min(100, (cf.endingCash / 1200) * 100),
      color: "#009A44",
      signed: false,
    },
  ];

  return (
    <section
      id="chapter-usd"
      className="relative z-10 flex min-h-[115dvh] items-center py-24"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Left/Top stage stays clear for the unfolding $ USD 3D macro banknote */}
          <div
            className="pointer-events-none h-[230px] sm:h-[260px] lg:min-h-[420px]"
            aria-hidden="true"
          />

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sm border border-[#D8DFE9] bg-white/88 p-6 shadow-[0_24px_60px_rgba(12,35,60,0.08)] backdrop-blur-md sm:p-9"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8DFE9] pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-[#009A44] font-mono text-sm font-bold text-white">
                  $
                </span>
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#009A44]">
                    CHAPTER 03 / 05 · USD MACRO DIVE
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#0C233C] sm:text-3xl">
                    Treasury &amp; Liquidity Precision
                  </h2>
                </div>
              </div>
              <Vault size={22} weight="light" className="text-[#00338D]" />
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#333940] sm:text-base">
              Stress-test FX shocks or OECD Pillar Two tax rules below. Every
              treasury inflow, working capital movement, and debt repayment
              updates live and reconciles straight to the Balance Sheet.
            </p>

            {/* Interactive Stress-Test Switcher */}
            <div
              role="tablist"
              aria-label="Treasury liquidity scenario stress test"
              className="mt-5 flex flex-wrap gap-1.5 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1.5"
            >
              {SCENARIO_ORDER.map((id: ScenarioId) => {
                const sc = RECONCILED_SCENARIOS[id];
                const active = id === activeScenarioId;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setScenario(id)}
                    className={`rounded-sm px-3 py-1.5 font-mono text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
                      active
                        ? "bg-[#00338D] text-white"
                        : "text-[#333940] hover:bg-white hover:text-[#00338D]"
                    }`}
                  >
                    {sc.shortTag}
                  </button>
                );
              })}
            </div>

            {/* KPMG Slide-Grade Liquidity Waterfall Bars */}
            <div className="mt-6 space-y-3">
              {waterfallRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]/75 p-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-[#0C233C]">
                      {row.label}
                    </span>
                    <span
                      className="font-mono font-semibold tabular-nums"
                      style={{ color: row.color }}
                    >
                      {row.amount < 0 ? "-" : row.signed ? "+" : ""}$
                      {Math.abs(row.amount).toFixed(1)}M
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-white">
                    <div
                      className="h-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${row.widthPct}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#D8DFE9] pt-4 sm:grid-cols-3">
              <div className="rounded-sm bg-[#F4F6FA] p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#526075]">
                  Net Income Input
                </p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#0C233C]">
                  ${pl.netIncome.toFixed(1)}M
                </p>
              </div>
              <div className="rounded-sm bg-[#F4F6FA] p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#526075]">
                  Cash Tax Paid
                </p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#7213EA]">
                  ${tx.cashTaxesPaid.toFixed(1)}M
                </p>
              </div>
              <div className="rounded-sm border border-[#009A44]/25 bg-[#009A44]/8 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#009A44]">
                  Liquidity Headroom
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums text-[#009A44]">
                  <CheckCircle size={14} weight="light" />$
                  {cf.thirteenWeekHeadroom.toFixed(1)}M
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
