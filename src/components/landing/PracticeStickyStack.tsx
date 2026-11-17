"use client";

import Image from "next/image";
import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import {
  useEquilibriumScene,
  type StratumFocus,
} from "@/context/EquilibriumSceneContext";

gsap.registerPlugin(ScrollTrigger);

interface PillarItem {
  index: string;
  stratum: Exclude<StratumFocus, null>;
  title: string;
  subtitle: string;
  description: string;
  systems: string[];
  image: string;
  alt: string;
}

const PILLARS: PillarItem[] = [
  {
    index: "01",
    stratum: "pnl",
    title: "Enterprise Performance Management",
    subtitle: "EPM and FP&A Architecture",
    description:
      "Driver-based rolling forecasts, multi-dimensional profitability modeling across product, channel, and customer, and integrated planning beyond static spreadsheets.",
    systems: ["Anaplan", "Oracle EPM", "Snowflake"],
    image: "/images/pillar-epm.jpg",
    alt: "Enterprise Performance Management cobalt architectural planes",
  },
  {
    index: "02",
    stratum: "balance-sheet",
    title: "Finance Transformation & AI Automation",
    subtitle: "Powered Finance Operating Models",
    description:
      "Target operating models across SAP, Oracle, Workday, and Dynamics, global business services design, and governed digital finance teammates.",
    systems: ["SAP S/4HANA", "Workday", "ServiceNow"],
    image: "/images/pillar-ai.jpg",
    alt: "Finance Transformation and AI workflow geometry",
  },
  {
    index: "03",
    stratum: "treasury",
    title: "Treasury & Working Capital Management",
    subtitle: "Liquidity and Cash Precision",
    description:
      "Real-time 13-week liquidity modeling, cash conversion cycle optimization across AR, AP, and inventory, FX exposure governance, and TMS modernization.",
    systems: ["Kyriba", "SAP Treasury", "Power BI"],
    image: "/images/pillar-treasury.jpg",
    alt: "Treasury and working capital precision structures",
  },
  {
    index: "04",
    stratum: "tax",
    title: "Close-to-Report & ESG Assurance",
    subtitle: "Intelligent Close and CSRD",
    description:
      "KPMG Intelligent Close cycle acceleration, IFRS and US GAAP technical accounting, carve-out readiness, and audit-ready CSRD sustainability reporting.",
    systems: ["BlackLine", "SAP Sustainability", "Azure"],
    image: "/images/pillar-esg.jpg",
    alt: "Close-to-Report and ESG assurance architectural surface",
  },
];

export function PracticeStickyStack() {
  const stackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { setHoveredStratum } = useEquilibriumScene();

  useIsomorphicLayoutEffect(() => {
    const container = stackRef.current;
    if (!container) return;

    const reduced =
      prefersReducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const cardEls = gsap.utils.toArray<HTMLElement>(".stack-card", container);
      const innerCards = gsap.utils.toArray<HTMLElement>(
        ".stack-card-inner",
        container
      );

      cardEls.forEach((card, i) => {
        if (i === cardEls.length - 1) return;
        const inner = innerCards[i];
        if (!inner) return;

        ScrollTrigger.create({
          trigger: card,
          start: "top top",
          endTrigger: cardEls[cardEls.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
        });

        gsap.to(inner, {
          scale: 0.92,
          opacity: 0.45,
          ease: "none",
          scrollTrigger: {
            trigger: cardEls[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });

        if (i + 2 < cardEls.length) {
          gsap.fromTo(
            inner,
            { opacity: 0.45 },
            {
              opacity: 0,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: cardEls[i + 2],
                start: "top bottom",
                end: "top center",
                scrub: true,
              },
            }
          );
        }
      });
    });

    return () => mm.revert();
  }, [prefersReducedMotion]);

  return (
    <section id="practice" className="relative z-10 pt-24 pb-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#7FB0FF]">
            PRACTICE PILLARS
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F7FB] sm:text-5xl">
            Four disciplines built for the modern CFO.
          </h2>
        </div>
      </div>

      <div ref={stackRef} className="relative mt-10 md:mt-6">
        {PILLARS.map((pillar, idx) => (
          <div
            key={pillar.index}
            style={{ zIndex: idx + 1 }}
            className="stack-card relative mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 md:flex md:min-h-[100dvh] md:items-center md:justify-center md:py-16 lg:px-8"
          >
            <article
              onMouseEnter={() => setHoveredStratum(pillar.stratum)}
              onMouseLeave={() => setHoveredStratum(null)}
              className="stack-card-inner grid w-full grid-cols-1 overflow-hidden rounded-sm border border-[#162447]/90 bg-[#07112B]/78 shadow-[0_24px_60px_rgba(3,8,22,0.85)] backdrop-blur-xl transition-colors duration-200 hover:border-[#1E6BFF]/70 md:h-[480px] md:grid-cols-[1.1fr_1fr]"
            >
              <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-12">
                <div>
                  <span className="font-mono text-sm font-medium text-[#7FB0FF]">
                    {pillar.index}
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[#F4F7FB] sm:text-3xl">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-[#7E91B3]">
                    {pillar.subtitle}
                  </p>
                  <p className="mt-6 max-w-xl text-base leading-relaxed text-[#CBD5E1]">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-8 border-t border-[#162447] pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {pillar.systems.map((sys) => (
                      <span
                        key={sys}
                        className="rounded-sm border border-[#162447] bg-[#030816]/80 px-3 py-1 font-mono text-xs text-[#CBD5E1]"
                      >
                        {sys}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative aspect-[16/10] w-full bg-[#07112B] md:aspect-auto md:h-full">
                <Image
                  src={pillar.image}
                  alt={pillar.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 46vw"
                  className="object-cover object-center opacity-90"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#07112B]/65"
                />
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
