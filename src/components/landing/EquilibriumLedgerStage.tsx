"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowsClockwise,
  CheckCircle,
  Scales,
  ShieldCheck,
  TrendUp,
  Vault,
} from "@phosphor-icons/react";
import {
  RECONCILED_SCENARIOS,
  SCENARIO_ORDER,
  verifyLedgerEquilibrium,
  type ScenarioId,
} from "@/data/reconciledLedger";
import {
  useEquilibriumScene,
  type StratumFocus,
} from "@/context/EquilibriumSceneContext";

function AnimatedNumber({
  value,
  prefix = "$",
  suffix = "M",
  decimals = 1,
  signed = false,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  signed?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion) {
      currentRef.current = value;
      return;
    }

    const from = currentRef.current;
    const to = value;
    if (Math.abs(from - to) < 0.001) {
      return;
    }

    const start = performance.now();
    const duration = 520;
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        currentRef.current = to;
        setDisplay(to);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, prefersReducedMotion]);

  const shown = prefersReducedMotion ? value : display;
  const absVal = Math.abs(shown).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const signStr = shown < -0.005 ? "-" : signed && shown > 0.005 ? "+" : "";
  return (
    <span className="tabular-nums">
      {signStr}
      {prefix}
      {absVal}
      {suffix}
    </span>
  );
}

interface StatementRowProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  signed?: boolean;
  emphasis?: boolean;
  accent?: "default" | "cobalt" | "emerald";
}

function StatementRow({
  label,
  value,
  prefix = "$",
  suffix = "M",
  decimals = 1,
  signed = false,
  emphasis = false,
  accent = "default",
}: StatementRowProps) {
  const valueColor =
    accent === "emerald"
      ? "text-[#10B981]"
      : accent === "cobalt"
        ? "text-[#7FB0FF]"
        : emphasis
          ? "text-[#F4F7FB]"
          : "text-[#CBD5E1]";

  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 text-xs ${
        emphasis ? "border-t border-[#162447] pt-2.5 font-semibold" : ""
      }`}
    >
      <span className={emphasis ? "text-[#F4F7FB]" : "text-[#94A3B8]"}>
        {label}
      </span>
      <span className={`font-mono ${valueColor}`}>
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          signed={signed}
        />
      </span>
    </div>
  );
}

export function EquilibriumLedgerStage() {
  const prefersReducedMotion = useReducedMotion();
  const { activeScenarioId, activeScenario, setScenario, setHoveredStratum } =
    useEquilibriumScene();

  const audit = useMemo(
    () => verifyLedgerEquilibrium(activeScenario),
    [activeScenario]
  );

  const { incomeStatement: pl, balanceSheet: bs, taxBridge: tx, cashFlow: cf } =
    activeScenario;

  const hoverBind = (focus: Exclude<StratumFocus, null>) => ({
    onMouseEnter: () => setHoveredStratum(focus),
    onMouseLeave: () => setHoveredStratum(null),
    onFocus: () => setHoveredStratum(focus),
    onBlur: () => setHoveredStratum(null),
  });

  return (
    <section
      id="ledger"
      className="relative z-10 border-t border-[#162447]/80 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[#F4F7FB] sm:text-5xl">
              Every statement locks into equilibrium.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#CBD5E1]">
              Stress-test FX translation or OECD Pillar Two tax rules below.
              Income Statement, Balance Sheet, Tax Bridge, and 13-Week Cash Flow
              recalculate live and reconcile to zero variance.
            </p>
          </div>

          {/* Interactive Scenario Switcher */}
          <div
            role="tablist"
            aria-label="Consolidated ledger scenario stress test"
            className="flex flex-wrap gap-2 rounded-sm border border-[#162447] bg-[#07112B]/85 p-1.5 backdrop-blur-xl"
          >
            {SCENARIO_ORDER.map((id: ScenarioId) => {
              const item = RECONCILED_SCENARIOS[id];
              const active = id === activeScenarioId;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setScenario(id)}
                  className={`rounded-sm px-3.5 py-2 font-mono text-xs transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] ${
                    active
                      ? "bg-[#1E6BFF] text-white"
                      : "text-[#CBD5E1] hover:bg-[#0B1736] hover:text-[#F4F7FB]"
                  }`}
                >
                  {item.shortTag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[#162447]/80 bg-[#030816]/75 px-4 py-2.5 font-mono text-xs backdrop-blur-md">
          <span className="text-[#7E91B3]">{activeScenario.assumptionNote}</span>
          <span className="inline-flex items-center gap-2 text-[#10B981]">
            <CheckCircle size={15} weight="light" />
            <span className="tabular-nums">
              CROSS-STATEMENT VARIANCE: Δ $
              {audit.balanceSheetVariance.toFixed(2)}M ·{" "}
              {audit.isFullyReconciled ? "RECONCILED" : "VARIANCE DETECTED"}
            </span>
          </span>
        </div>

        {/* 4-Quadrant Reconciled Financial Statements */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Quadrant 1: Income Statement (P&L) */}
          <motion.article
            {...hoverBind("pnl")}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sm border border-[#162447] bg-[#07112B]/78 p-6 backdrop-blur-xl transition-colors duration-200 hover:border-[#60A5FA]/70"
          >
            <div className="flex items-center justify-between border-b border-[#162447] pb-3.5">
              <div className="flex items-center gap-2.5">
                <TrendUp size={18} weight="light" className="text-[#60A5FA]" />
                <h3 className="text-sm font-semibold tracking-tight text-[#F4F7FB]">
                  01 · Income Statement (P&amp;L)
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[#7FB0FF]">
                TO RETAINED EARNINGS
              </span>
            </div>
            <div className="mt-3">
              <StatementRow label="Consolidated Revenue" value={pl.revenue} />
              <StatementRow label="Cost of Goods Sold" value={-pl.cogs} signed />
              <StatementRow
                label="Gross Profit"
                value={pl.grossProfit}
                emphasis
              />
              <StatementRow label="Operating Expenses (SG&A / R&D)" value={-pl.opex} signed />
              <StatementRow label="EBITDA" value={pl.ebitda} accent="cobalt" />
              <StatementRow label="Depreciation & Amortization" value={-pl.da} signed />
              <StatementRow label="Earnings Before Tax (EBT)" value={pl.ebt} />
              <StatementRow label="Income Tax Provision" value={-pl.taxExpense} signed />
              <StatementRow
                label="Consolidated Net Income"
                value={pl.netIncome}
                emphasis
                accent="emerald"
              />
            </div>
          </motion.article>

          {/* Quadrant 2: Balance Sheet */}
          <motion.article
            {...hoverBind("balance-sheet")}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sm border border-[#162447] bg-[#07112B]/78 p-6 backdrop-blur-xl transition-colors duration-200 hover:border-[#1E6BFF]/80"
          >
            <div className="flex items-center justify-between border-b border-[#162447] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Scales size={18} weight="light" className="text-[#1E6BFF]" />
                <h3 className="text-sm font-semibold tracking-tight text-[#F4F7FB]">
                  02 · Balance Sheet (A = L + E)
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[#10B981]">
                Δ ${audit.balanceSheetVariance.toFixed(2)}M
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#7E91B3]">
                  Assets
                </p>
                <StatementRow label="Cash & Equivalents" value={bs.cash} accent="emerald" />
                <StatementRow label="Accounts Receivable" value={bs.accountsReceivable} />
                <StatementRow label="Inventory" value={bs.inventory} />
                <StatementRow
                  label="PP&E & Intangibles"
                  value={bs.fixedAndIntangibleAssets}
                />
                <StatementRow
                  label="Total Assets"
                  value={bs.totalAssets}
                  emphasis
                  accent="cobalt"
                />
              </div>

              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#7E91B3]">
                  Liabilities &amp; Equity
                </p>
                <StatementRow label="Accounts Payable" value={bs.accountsPayable} />
                <StatementRow label="Long-Term Debt" value={bs.longTermDebt} />
                <StatementRow
                  label="Deferred Tax & Accrued"
                  value={bs.deferredTaxAndAccrued}
                />
                <StatementRow
                  label="Total Liabilities"
                  value={bs.totalLiabilities}
                  emphasis
                />
                <StatementRow label="Paid-In Capital" value={bs.paidInCapital} />
                <StatementRow
                  label="Ending Retained Earnings"
                  value={bs.endingRetainedEarnings}
                />
                <StatementRow
                  label="Total L + E"
                  value={bs.totalLiabilities + bs.totalEquity}
                  emphasis
                  accent="emerald"
                />
              </div>
            </div>
          </motion.article>

          {/* Quadrant 3: Tax & Statutory Shield */}
          <motion.article
            {...hoverBind("tax")}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sm border border-[#162447] bg-[#07112B]/78 p-6 backdrop-blur-xl transition-colors duration-200 hover:border-[#93C5FD]/70"
          >
            <div className="flex items-center justify-between border-b border-[#162447] pb-3.5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} weight="light" className="text-[#93C5FD]" />
                <h3 className="text-sm font-semibold tracking-tight text-[#F4F7FB]">
                  03 · Tax &amp; Statutory Bridge
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[#7FB0FF]">
                ETR RECONCILIATION
              </span>
            </div>
            <div className="mt-3">
              <StatementRow
                label="Statutory Corporate Rate"
                value={tx.statutoryRate}
                prefix=""
                suffix="%"
              />
              <StatementRow
                label="Jurisdictional Rate Mix"
                value={tx.foreignMix}
                prefix=""
                suffix="%"
                signed
              />
              <StatementRow
                label="OECD Pillar Two Top-Up"
                value={tx.pillarTwoTopUp}
                prefix=""
                suffix="%"
                signed
              />
              <StatementRow
                label="R&D & Sustainability Credits"
                value={tx.rdCredits}
                prefix=""
                suffix="%"
                signed
              />
              <StatementRow
                label="Effective Tax Rate (ETR)"
                value={tx.effectiveTaxRate}
                prefix=""
                suffix="%"
                emphasis
                accent="cobalt"
              />
              <StatementRow
                label="Deferred Tax Liability Delta"
                value={tx.deferredTaxChange}
              />
              <StatementRow
                label="Cash Taxes Settled"
                value={tx.cashTaxesPaid}
                emphasis
                accent="emerald"
              />
            </div>
          </motion.article>

          {/* Quadrant 4: 13-Week Treasury Cash Flow */}
          <motion.article
            {...hoverBind("treasury")}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sm border border-[#162447] bg-[#07112B]/78 p-6 backdrop-blur-xl transition-colors duration-200 hover:border-[#10B981]/70"
          >
            <div className="flex items-center justify-between border-b border-[#162447] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Vault size={18} weight="light" className="text-[#10B981]" />
                <h3 className="text-sm font-semibold tracking-tight text-[#F4F7FB]">
                  04 · Treasury Cash Flow Roll-Forward
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[#10B981]">
                TIES TO BS CASH
              </span>
            </div>
            <div className="mt-3">
              <StatementRow label="Opening Cash Balance" value={cf.openingCash} />
              <StatementRow
                label="Net Income + Non-Cash D&A + Deferred Tax"
                value={pl.netIncome + pl.da + tx.deferredTaxChange}
                signed
              />
              <StatementRow
                label="Working Capital Change (ΔNWC)"
                value={cf.deltaNwc}
                signed
              />
              <StatementRow
                label="Operating Cash Flow"
                value={cf.operatingCashFlow}
                emphasis
                accent="cobalt"
              />
              <StatementRow label="Capital Expenditures" value={cf.capex} signed />
              <StatementRow
                label="Debt Repayment & Dividends"
                value={cf.debtServiceAndDividends}
                signed
              />
              <StatementRow
                label="Ending Cash (= Balance Sheet Cash)"
                value={cf.endingCash}
                emphasis
                accent="emerald"
              />
            </div>
          </motion.article>
        </div>

        {/* Bottom 5-Point Cross-Statement Verification Matrix */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "P&L Margin Chain", delta: audit.pnlIntegrityVariance },
            { label: "Assets = L + Equity", delta: audit.balanceSheetVariance },
            { label: "Net Income -> RE", delta: audit.retainedEarningsVariance },
            { label: "EBT × ETR = Tax", delta: audit.taxBridgeVariance },
            { label: "Cash Flow -> BS Cash", delta: audit.cashTieVariance },
          ].map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between rounded-sm border border-[#162447] bg-[#030816]/85 px-3.5 py-2.5 font-mono text-[11px] backdrop-blur-md"
            >
              <span className="inline-flex items-center gap-1.5 text-[#CBD5E1]">
                <ArrowsClockwise
                  size={13}
                  weight="light"
                  className="text-[#1E6BFF]"
                />
                {check.label}
              </span>
              <span className="tabular-nums text-[#10B981]">
                Δ ${check.delta.toFixed(2)}M
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
