"use client";

import { useRouter } from "next/navigation";
import { ArrowClockwise, ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useEquilibriumScene } from "@/context/EquilibriumSceneContext";

const QUOTES = [
  {
    quote:
      "“Deploying autonomous invoice processing and live P2P telemetry into governed workflows eliminated three days of manual reconciliation and audit prep across our operating entities.”",
    name: "Marcus Lindqvist",
    role: "Chief Financial Officer, Nordvik Industrial",
  },
  {
    quote:
      "“KPMG paired IFRS technical rigor with live ERP orchestration so our regional controllers verify intercompany eliminations in hours.”",
    name: "Priya Natarajan",
    role: "VP of Corporate Controllership, Meridia Health",
  },
];

export function GatewayChapter() {
  const router = useRouter();
  const { user, openLogin } = useAuth();
  const { scrollToChapter } = useEquilibriumScene();

  const handleGateway = () => {
    if (user) {
      router.push("/workflows");
      return;
    }
    openLogin();
  };

  return (
    <section
      id="chapter-gateway"
      className="relative z-10 flex min-h-[100dvh] items-center py-24 pb-32"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {QUOTES.map((q) => (
            <blockquote
              key={q.name}
              className="flex flex-col justify-between rounded-sm border border-[#D8DFE9] bg-white/92 p-7 shadow-[0_12px_36px_rgba(12,35,60,0.06)] backdrop-blur-xl"
            >
              <p className="text-base leading-relaxed text-[#0C233C] sm:text-lg">
                {q.quote}
              </p>
              <footer className="mt-5 border-t border-[#D8DFE9] pt-4">
                <p className="text-sm font-semibold text-[#00338D]">{q.name}</p>
                <p className="text-xs text-[#526075]">{q.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>

        {/* Vibrant KPMG Blue -> Cobalt -> Purple Gateway Panel */}
        <div className="mt-8 flex flex-col items-start justify-between gap-8 rounded-sm bg-gradient-to-r from-[#00338D] via-[#1E49E2] to-[#7213EA] p-8 text-white shadow-[0_24px_60px_rgba(0,51,141,0.22)] sm:p-12 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ACEAFF]">
              CHAPTER 05 / 05 · WORKFLOWS HUB GATEWAY
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
              Enter the CFO Advisory Workflows Hub.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base">
              Inspect synchronized client engagements, SOX-aligned lineage
              controls, and live ERP execution status across every finance pillar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGateway}
              className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-white px-5 py-3 text-sm font-semibold text-[#00338D] whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#ACEAFF] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Sign in to Workflows</span>
              <ArrowRight size={16} weight="light" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-sm border border-[#D8DFE9] bg-white/90 px-5 py-3.5 text-xs text-[#526075] backdrop-blur-md">
          <span>
            KPMG CFO Advisory &amp; Powered Finance · Synchronized with Workflow Studio
          </span>
          <button
            type="button"
            onClick={() => scrollToChapter("chapter-horizon")}
            className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#00338D] hover:text-[#1E49E2]"
          >
            <ArrowClockwise size={14} weight="light" />
            <span>KEEP SCROLLING TO LOOP BACK TO 01 HORIZON</span>
          </button>
        </div>
      </div>
    </section>
  );
}
