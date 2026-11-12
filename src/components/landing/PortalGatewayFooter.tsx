"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export function PortalGatewayFooter() {
  const router = useRouter();
  const { user, openLogin } = useAuth();

  const handleGateway = () => {
    if (user) {
      router.push("/workflows");
      return;
    }
    openLogin();
  };

  return (
    <footer className="border-t border-[#162447] bg-[#030816]">
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 rounded-sm border border-[#162447] bg-[#0B1736] p-8 sm:p-12 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-[#F4F7FB] sm:text-4xl">
              Enter the CFO Advisory Workflows Hub.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#CBD5E1]">
              Inspect synchronized client engagements, lineage controls, and live execution status across every finance pillar.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGateway}
            className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-[#1E6BFF] px-5 py-3 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1736]"
          >
            <span>Sign in to Workflows</span>
            <ArrowRight size={16} weight="light" />
          </button>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-[#162447] pt-8 text-sm text-[#7E91B3] sm:flex-row sm:items-center">
          <div>
            <p className="font-medium text-[#F4F7FB]">
              KPMG CFO Advisory &amp; Powered Finance
            </p>
            <p className="mt-1 text-xs text-[#7E91B3]">
              Workflow execution state synchronized with the companion Workflow Studio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#CBD5E1]">
            <Link href="/#practice" className="hover:text-[#F4F7FB]">
              Practice
            </Link>
            <Link href="/#orchestration" className="hover:text-[#F4F7FB]">
              Orchestration
            </Link>
            <Link href="/#capabilities" className="hover:text-[#F4F7FB]">
              Capabilities
            </Link>
            <Link href="/#perspectives" className="hover:text-[#F4F7FB]">
              Perspectives
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
