"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useEquilibriumScene } from "@/context/EquilibriumSceneContext";

export function HeroCinema() {
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
      id="vault"
      className="relative z-10 flex min-h-[100dvh] items-center pt-24 pb-20"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.08fr_1fr]">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start rounded-sm border border-[#162447]/60 bg-[#030816]/55 p-6 backdrop-blur-md sm:p-8 lg:border-transparent lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
          >
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#7FB0FF]">
              KPMG CFO ADVISORY
            </span>

            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight leading-[1.05] text-[#F4F7FB] sm:text-5xl lg:text-[64px]">
              Orchestrate finance at executive velocity.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#CBD5E1] sm:text-lg">
              Unify enterprise performance, intelligent close, and AI workflows
              built for modern finance leaders.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleGatewayClick}
                className="inline-flex items-center gap-2 rounded-sm bg-[#1E6BFF] px-5 py-3 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
              >
                <span>Sign in to Workflows</span>
                <ArrowRight size={16} weight="light" />
              </button>

              <button
                type="button"
                onClick={() => scrollToChapter("practice")}
                className="inline-flex items-center gap-2 rounded-sm border border-[#162447] bg-[#07112B]/85 px-5 py-3 text-sm font-medium text-[#F4F7FB] whitespace-nowrap backdrop-blur-md transition-[border-color,background-color,transform] duration-150 hover:border-white/25 hover:bg-[#0B1736] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
              >
                <span>Explore Practice</span>
                <ArrowDownRight size={16} weight="light" className="text-[#CBD5E1]" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => scrollToChapter("ledger")}
              className="mt-8 inline-flex items-center gap-2.5 rounded-sm border border-[#162447]/80 bg-[#030816]/75 px-3.5 py-2 font-mono text-xs text-[#CBD5E1] backdrop-blur-md transition-colors hover:border-[#10B981]/60 hover:text-[#F4F7FB]"
            >
              <CheckCircle size={15} weight="light" className="text-[#10B981]" />
              <span className="tabular-nums">
                ASSETS ${activeScenario.balanceSheet.totalAssets.toLocaleString("en-US")}M = L+E · Δ 0.00
              </span>
            </button>
          </motion.div>

          {/* Open spatial stage allowing the 3D Equilibrium Monolith to breathe on desktop */}
          <div className="hidden min-h-[420px] lg:block" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
