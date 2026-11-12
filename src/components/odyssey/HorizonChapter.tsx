"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useEquilibriumScene } from "@/context/EquilibriumSceneContext";

const CURRENCY_PILLS = [
  { symbol: "₹", code: "INR", focus: "EPM & AI", anchor: "chapter-inr", color: "#1E49E2" },
  { symbol: "$", code: "USD", focus: "Treasury", anchor: "chapter-usd", color: "#009A44" },
  { symbol: "€", code: "EUR", focus: "Tax Bridge", anchor: "chapter-eur", color: "#7213EA" },
  { symbol: "£", code: "GBP", focus: "Close", anchor: "chapter-eur", color: "#00338D" },
];

export function HorizonChapter({ isMirror = false }: { isMirror?: boolean }) {
  const router = useRouter();
  const { user, openLogin } = useAuth();
  const { scrollToChapter, activeScenario } = useEquilibriumScene();
  const prefersReducedMotion = useReducedMotion();

  const handleGatewayClick = () => {
    if (user) {
      router.push("/workflows");
      return;
    }
    openLogin();
  };

  return (
    <section
      id={isMirror ? "chapter-horizon-loop" : "chapter-horizon"}
      aria-hidden={isMirror ? true : undefined}
      className="relative z-10 flex min-h-[100dvh] items-center pt-24 pb-28"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start rounded-sm border border-[#D8DFE9] bg-white/86 p-6 shadow-[0_20px_50px_rgba(12,35,60,0.06)] backdrop-blur-md sm:p-9"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00338D]">
                KPMG CFO ADVISORY
              </span>
              <span className="h-3 w-px bg-[#D8DFE9]" aria-hidden="true" />
              <span className="font-mono text-[11px] font-medium text-[#1E49E2]">
                CHAPTER 01 / 05
              </span>
            </div>

            <div
              aria-hidden="true"
              className="mt-4 h-[3px] w-24 bg-gradient-to-r from-[#00338D] via-[#1E49E2] to-[#7213EA]"
            />

            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight leading-[1.06] text-[#0C233C] sm:text-5xl lg:text-[58px]">
              Orchestrate finance at executive velocity.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#333940] sm:text-lg">
              Unify enterprise performance, intelligent close, and AI workflows
              across global Tier-1 currencies, reconciled to zero variance.
            </p>

            {/* Tier-1 Currency Jump Bar */}
            <div className="mt-6 flex flex-wrap gap-2">
              {CURRENCY_PILLS.map((pill) => (
                <button
                  key={pill.code}
                  type="button"
                  tabIndex={isMirror ? -1 : undefined}
                  onClick={() => scrollToChapter(pill.anchor)}
                  className="inline-flex items-center gap-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-3 py-1.5 text-xs font-medium text-[#0C233C] transition-[border-color,background-color,transform] duration-150 hover:border-[#1E49E2] hover:bg-white active:scale-[0.98]"
                >
                  <span
                    className="font-mono font-bold"
                    style={{ color: pill.color }}
                  >
                    {pill.symbol}
                  </span>
                  <span className="font-mono font-semibold">{pill.code}</span>
                  <span className="text-[#526075]">{pill.focus}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                tabIndex={isMirror ? -1 : undefined}
                onClick={handleGatewayClick}
                className="inline-flex items-center gap-2 rounded-sm bg-[#00338D] px-5 py-3 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <span>Sign in to Workflows</span>
                <ArrowRight size={16} weight="light" />
              </button>

              <button
                type="button"
                tabIndex={isMirror ? -1 : undefined}
                onClick={() => scrollToChapter("chapter-inr")}
                className="inline-flex items-center gap-2 rounded-sm border border-[#D8DFE9] bg-white px-5 py-3 text-sm font-medium text-[#0C233C] whitespace-nowrap transition-[border-color,background-color,transform] duration-150 hover:border-[#00338D] hover:bg-[#F4F6FA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <span>Dive into ₹ INR</span>
                <ArrowDownRight
                  size={16}
                  weight="light"
                  className="text-[#1E49E2]"
                />
              </button>
            </div>

            <button
              type="button"
              tabIndex={isMirror ? -1 : undefined}
              onClick={() => scrollToChapter("chapter-eur")}
              className="mt-7 inline-flex items-center gap-2 rounded-sm border border-[#009A44]/25 bg-[#009A44]/8 px-3.5 py-2 font-mono text-xs font-medium text-[#009A44] transition-colors hover:bg-[#009A44]/14"
            >
              <CheckCircle size={15} weight="light" />
              <span className="tabular-nums">
                ASSETS ${activeScenario.balanceSheet.totalAssets.toLocaleString("en-US")}M = L + E · Δ 0.00
              </span>
            </button>
          </motion.div>

          {/* Open top (mobile/tablet) / right (desktop) stage for the 3 unfolding 3D banknotes */}
          <div
            className="order-first pointer-events-none h-[240px] sm:h-[280px] lg:order-last lg:min-h-[460px]"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
