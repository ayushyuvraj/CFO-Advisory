"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowsClockwise, CheckCircle, Scales, ShieldCheck, TrendUp } from "@phosphor-icons/react";
import {
  RECONCILED_SCENARIOS,
  SCENARIO_ORDER,
  verifyLedgerEquilibrium,
  type ScenarioId,
} from "@/data/reconciledLedger";
import { useEquilibriumScene } from "@/context/EquilibriumSceneContext";

function LedgerLine({
  label,
  value,
  prefix = "$",
  suffix = "M",
  signed = false,
  bold = false,
  tone = "default",
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  signed?: boolean;
  bold?: boolean;
  tone?: "default" | "cobalt" | "emerald" | "purple";
}) {
  const colorClass =
    tone === "emerald"
      ? "text-[#009A44]"
      : tone === "cobalt"
        ? "text-[#1E49E2]"
        : tone === "purple"
          ? "text-[#7213EA]"
          : bold
            ? "text-[#0C233C]"
            : "text-[#333940]";

  const sign = value < -0.005 ? "-" : signed && value > 0.005 ? "+" : "";
  return (
    <div
      className={`flex items-center justify-between gap-2 py-1.5 text-xs ${
        bold ? "border-t border-[#D8DFE9] pt-2 font-semibold" : ""
      }`}
    >
      <span className={bold ? "text-[#0C233C]" : "text-[#526075]"}>{label}</span>
      <span className={`font-mono tabular-nums ${colorClass}`}>
        {sign}
        {prefix}
        {Math.abs(value).toFixed(1)}
        {suffix}
      </span>
    </div>
  );
}

export function EurLedgerTallyChapter() {
  const prefersReducedMotion = useReducedMotion();
  const { activeScenarioId, activeScenario, setScenario } =
    useEquilibriumScene();

  const audit = useMemo(
    () => verifyLedgerEquilibrium(activeScenario),
    [activeScenario]
  );

  const { incomeStatement: pl, balanceSheet: bs, taxBridge: tx } =
    activeScenario;

  return (
    <section
      id="chapter-eur"
      className="relative z-10 flex min-h-[120dvh] items-center py-24"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-sm border border-[#D8DFE9] bg-white/93 p-7 shadow-[0_24px_60px_rgba(12,35,60,0.08)] backdrop-blur-xl sm:p-9"
        >
          <div className="flex flex-col justify-between gap-5 border-b border-[#D8DFE9] pb-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-[#7213EA] font-mono text-sm font-bold text-white">
                €
              </span>
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7213EA]">
                  CHAPTER 04 / 05 · EUR &amp; GBP MACRO DIVE
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-[#0C233C] sm:text-3xl">
                  Balance Sheet, Income Statement &amp; Tax Equilibrium
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {SCENARIO_ORDER.map((id: ScenarioId) => {
                const sc = RECONCILED_SCENARIOS[id];
                const active = id === activeScenarioId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setScenario(id)}
                    className={`rounded-sm px-3 py-1.5 font-mono text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
                      active
                        ? "bg-[#7213EA] text-white"
                        : "border border-[#D8DFE9] bg-[#F4F6FA] text-[#333940] hover:border-[#7213EA] hover:text-[#7213EA]"
                    }`}
                  >
                    {sc.shortTag}
                  </button>
                );
              })}

              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#009A44]/30 bg-[#009A44]/10 px-3 py-1.5 font-mono text-xs font-semibold text-[#009A44]">
                <CheckCircle size={14} weight="light" />
                <span>
                  Δ ${audit.balanceSheetVariance.toFixed(2)}M · RECONCILED
                </span>
              </span>
            </div>
          </div>

          <p className="mt-3 font-mono text-xs text-[#526075]">
            {activeScenario.assumptionNote}
          </p>

          {/* 3-Column KPMG Executive Accounting Pack */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Income Statement */}
            <article className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]/75 p-5">
              <div className="flex items-center justify-between border-b border-[#D8DFE9] pb-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0C233C]">
                  <TrendUp size={17} weight="light" className="text-[#1E49E2]" />
                  Income Statement (P&amp;L)
                </span>
                <span className="font-mono text-[10px] font-semibold text-[#1E49E2]">
                  TO RETAINED EARNINGS
                </span>
              </div>
              <div className="mt-3">
                <LedgerLine label="Consolidated Revenue" value={pl.revenue} />
                <LedgerLine label="Cost of Goods Sold" value={-pl.cogs} signed />
                <LedgerLine label="Gross Profit" value={pl.grossProfit} bold />
                <LedgerLine label="Operating Expenses" value={-pl.opex} signed />
                <LedgerLine label="EBITDA" value={pl.ebitda} tone="cobalt" />
                <LedgerLine label="Depreciation & Amort." value={-pl.da} signed />
                <LedgerLine label="Earnings Before Tax" value={pl.ebt} />
                <LedgerLine
                  label="Tax Provision"
                  value={-pl.taxExpense}
                  signed
                />
                <LedgerLine
                  label="Net Income"
                  value={pl.netIncome}
                  bold
                  tone="emerald"
                />
              </div>
            </article>

            {/* Balance Sheet */}
            <article className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]/75 p-5">
              <div className="flex items-center justify-between border-b border-[#D8DFE9] pb-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0C233C]">
                  <Scales size={17} weight="light" className="text-[#00338D]" />
                  Balance Sheet (A = L + E)
                </span>
                <span className="font-mono text-[10px] font-semibold text-[#009A44]">
                  Δ ${audit.balanceSheetVariance.toFixed(2)}M
                </span>
              </div>
              <div className="mt-3">
                <LedgerLine
                  label="Cash (= Ending Treasury)"
                  value={bs.cash}
                  tone="emerald"
                />
                <LedgerLine
                  label="Accounts Receivable & Inventory"
                  value={bs.accountsReceivable + bs.inventory}
                />
                <LedgerLine
                  label="PP&E & Intangibles"
                  value={bs.fixedAndIntangibleAssets}
                />
                <LedgerLine
                  label="Total Assets"
                  value={bs.totalAssets}
                  bold
                  tone="cobalt"
                />
                <div className="my-2 border-t border-dashed border-[#D8DFE9]" />
                <LedgerLine
                  label="Payables, Debt & Deferred Tax"
                  value={bs.totalLiabilities}
                />
                <LedgerLine label="Paid-In Capital" value={bs.paidInCapital} />
                <LedgerLine
                  label="Ending Retained Earnings"
                  value={bs.endingRetainedEarnings}
                />
                <LedgerLine
                  label="Total Liabilities + Equity"
                  value={bs.totalLiabilities + bs.totalEquity}
                  bold
                  tone="emerald"
                />
              </div>
            </article>

            {/* Tax & Statutory Bridge */}
            <article className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]/75 p-5">
              <div className="flex items-center justify-between border-b border-[#D8DFE9] pb-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0C233C]">
                  <ShieldCheck
                    size={17}
                    weight="light"
                    className="text-[#7213EA]"
                  />
                  Tax &amp; Pillar Two Bridge
                </span>
                <span className="font-mono text-[10px] font-semibold text-[#7213EA]">
                  ETR PROOF
                </span>
              </div>
              <div className="mt-3">
                <LedgerLine
                  label="Statutory Corporate Rate"
                  value={tx.statutoryRate}
                  prefix=""
                  suffix="%"
                />
                <LedgerLine
                  label="Foreign Jurisdictional Mix"
                  value={tx.foreignMix}
                  prefix=""
                  suffix="%"
                  signed
                />
                <LedgerLine
                  label="OECD Pillar Two Top-Up"
                  value={tx.pillarTwoTopUp}
                  prefix=""
                  suffix="%"
                  signed
                />
                <LedgerLine
                  label="R&D & ESG Credits"
                  value={tx.rdCredits}
                  prefix=""
                  suffix="%"
                  signed
                />
                <LedgerLine
                  label="Effective Tax Rate (ETR)"
                  value={tx.effectiveTaxRate}
                  prefix=""
                  suffix="%"
                  bold
                  tone="purple"
                />
                <LedgerLine
                  label="Deferred Tax Liability Delta"
                  value={tx.deferredTaxChange}
                />
                <LedgerLine
                  label="Cash Taxes Paid"
                  value={tx.cashTaxesPaid}
                  bold
                  tone="emerald"
                />
              </div>
            </article>
          </div>

          {/* 5-Point Cross-Statement Reconciliation Strip */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "P&L Integrity", delta: audit.pnlIntegrityVariance },
              { label: "Assets = L + Equity", delta: audit.balanceSheetVariance },
              {
                label: "Net Income -> RE",
                delta: audit.retainedEarningsVariance,
              },
              { label: "EBT × ETR = Tax", delta: audit.taxBridgeVariance },
              { label: "Cash -> BS Cash", delta: audit.cashTieVariance },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 font-mono text-[11px]"
              >
                <span className="inline-flex items-center gap-1.5 text-[#333940]">
                  <ArrowsClockwise
                    size={13}
                    weight="light"
                    className="text-[#1E49E2]"
                  />
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums text-[#009A44]">
                  Δ ${item.delta.toFixed(2)}M
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
