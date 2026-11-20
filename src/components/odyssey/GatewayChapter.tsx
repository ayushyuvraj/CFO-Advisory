"use client";

import { ArrowRight, ArrowUp } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export function GatewayChapter() {
  const { user, openLogin } = useAuth();

  return (
    <section id="chapter-gateway" className="relative z-10 scroll-mt-18 px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1336px] bg-kpmg-blue text-white">
        <div className="flex h-1.5" aria-hidden="true">
          <span className="w-3/5 bg-pacific" />
          <span className="grow bg-ice" />
          <span className="w-[8%] bg-purple" />
        </div>
        <div className="flex flex-col items-start justify-between gap-8 p-6 sm:p-12 lg:flex-row lg:items-center lg:p-16">
          <div>
            <h2 className="max-w-[24ch] text-balance text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-5xl">
              MS-F&amp;A Workflows Hub
            </h2>
            <p className="mt-4 max-w-[45ch] leading-relaxed text-white/90">
              Access connected finance platforms and workflows available to your engagement.
            </p>
          </div>
          {!user && (
            <button
              type="button"
              onClick={openLogin}
              className="group inline-flex min-h-12 shrink-0 items-center gap-3 rounded-sm bg-white px-5 py-3 text-sm font-semibold text-kpmg-blue hover:bg-ice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Sign in to Workflows
              <ArrowRight size={18} weight="light" className="advisory-action-arrow" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="mx-auto mt-5 flex max-w-[1336px] justify-end">
        <a
          href="#chapter-horizon"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-white px-3 text-sm font-medium text-kpmg-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
        >
          Back to top
          <ArrowUp size={16} weight="light" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
