"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowsLeftRight,
  Blueprint,
  PresentationChart,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  {
    code: "01",
    title: "Studio Authoring",
    summary:
      "Advisory architects and client finance leads compose modular data and AI workflows inside the companion Workflow Studio.",
    detail: "Modular DAG nodes, ERP connectors, and prompt policies",
    Icon: Blueprint,
  },
  {
    code: "02",
    title: "Governance & Controls",
    summary:
      "Role-based approvals, SOX-aligned audit trails, and accounting policy guardrails bind automatically to every workflow run.",
    detail: "Deterministic policy gates before board distribution",
    Icon: ShieldCheck,
  },
  {
    code: "03",
    title: "Live ERP & Ledger Sync",
    summary:
      "Authenticated connectors bridge SAP S/4HANA, Workday, Oracle Cloud, and Anaplan without manual spreadsheet exports.",
    detail: "Direct subledger and treasury bank feed synchronization",
    Icon: ArrowsLeftRight,
  },
  {
    code: "04",
    title: "Boardroom Delivery",
    summary:
      "Signed-in leaders inspect executive variance briefs, liquidity stress outputs, and close readiness in the Workflows Hub.",
    detail: "Lineage-verified outputs ready for CFO and audit sign-off",
    Icon: PresentationChart,
  },
];

export function WorkflowHorizontalPan() {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const pinEl = pinRef.current;
    const track = trackRef.current;
    if (!pinEl || !track) return;

    const reduced =
      prefersReducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const getDistance = () =>
        Math.max(0, track.scrollWidth - window.innerWidth + 64);

      gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: pinEl,
          start: "top top",
          end: () => `+=${Math.max(getDistance(), 400)}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => mm.revert();
  }, [prefersReducedMotion]);

  return (
    <section
      id="orchestration"
      className="relative z-10 border-t border-[#162447]/80 bg-[#030816]/35"
    >
      <div
        ref={pinRef}
        className="relative overflow-hidden py-20 md:flex md:min-h-[100dvh] md:flex-col md:justify-center md:py-0"
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 md:pt-20">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#7FB0FF]">
            WORKFLOW ORCHESTRATION
          </span>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-[#F4F7FB] sm:text-5xl">
            From studio blueprint to boardroom execution.
          </h2>
        </div>

        <div className="mt-10 md:mt-12 md:overflow-visible">
          <div
            ref={trackRef}
            className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 sm:px-6 md:mx-0 md:max-w-none md:flex-row md:items-stretch md:gap-6 md:px-8 lg:px-[max(2rem,calc((100vw-1400px)/2+2rem))]"
          >
            {STAGES.map((stage) => {
              const Icon = stage.Icon;
              return (
                <article
                  key={stage.code}
                  className="flex w-full shrink-0 flex-col justify-between rounded-sm border border-[#162447]/90 bg-[#07112B]/80 p-7 backdrop-blur-xl md:w-[420px] lg:w-[460px]"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#162447] pb-4">
                      <span className="font-mono text-sm font-medium text-[#7FB0FF]">
                        {stage.code}
                      </span>
                      <Icon
                        size={22}
                        weight="light"
                        className="text-[#CBD5E1]"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#F4F7FB] sm:text-2xl">
                      {stage.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-[#CBD5E1]">
                      {stage.summary}
                    </p>
                  </div>

                  <p className="mt-8 border-t border-[#162447] pt-4 font-mono text-xs text-[#7E91B3]">
                    {stage.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
