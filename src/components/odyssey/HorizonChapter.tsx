"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, ChartBar, ClipboardText, TrendUp } from "@phosphor-icons/react";
import { HeroBackground } from "@/components/editorial/HeroBackground";
import { useAuth } from "@/context/AuthContext";

const FIELD_LINKS = [
  {
    label: "Finance operations",
    anchor: "finance-operations",
    Icon: ChartBar,
    description: "Manage payables, reconciliation, order-to-cash, trade documentation and fixed asset accounting.",
  },
  {
    label: "Reporting & compliance",
    anchor: "reporting-compliance",
    Icon: ClipboardText,
    description: "Support management reporting, financial close, audit, GAAP analysis, lease accounting and tax.",
  },
  {
    label: "Insights & optimization",
    anchor: "insights-optimization",
    Icon: TrendUp,
    description: "Use business insights and process mining to improve workflows, optimize capital and evaluate competitor tools.",
  },
] as const;

function HeroFieldLinks() {
  const [activeField, setActiveField] = useState<(typeof FIELD_LINKS)[number]["anchor"]>(FIELD_LINKS[0].anchor);

  return (
    <nav aria-label="MS-F&A Fields of Play" className="mt-5 max-w-lg sm:mt-6">
      <ul className="space-y-1">
        {FIELD_LINKS.map(({ label, anchor, Icon, description }) => {
          const labelId = `hero-${anchor}-label`;
          const descriptionId = `hero-${anchor}-description`;

          return (
            <li key={anchor}>
              <a
                href={`#${anchor}`}
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                data-active={activeField === anchor}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setActiveField(anchor);
                }}
                onFocus={() => setActiveField(anchor)}
                className="hero-field-link group grid min-h-11 grid-cols-[1.375rem_minmax(0,1fr)_1rem] items-start gap-3 rounded-sm border border-transparent px-3 py-2.5 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
              >
                <Icon size={22} weight="light" className="mt-px text-ice" aria-hidden="true" />
                <span>
                  <span id={labelId} className="block font-medium leading-6">{label}</span>
                  <span id={descriptionId} className="hero-field-description mt-1 block text-sm leading-relaxed text-white/85">{description}</span>
                </span>
                <ArrowRight size={16} weight="light" className="advisory-action-arrow mt-1 text-ice" aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" className="hero-field-preview mt-3 rounded-sm border border-white/15 border-l-2 border-l-ice bg-white/5 px-4 py-3">
        {FIELD_LINKS.map(({ anchor, description }) => (
          <p
            key={anchor}
            data-active={activeField === anchor}
            className="invisible col-start-1 row-start-1 text-sm leading-relaxed text-white/90 data-[active=true]:visible"
          >
            {description}
          </p>
        ))}
      </div>
    </nav>
  );
}

export function HorizonChapter() {
  const { user, openLogin } = useAuth();

  return (
    <section id="chapter-horizon" className="pt-18">
      <div className="relative isolate grid overflow-hidden bg-[#001B44] lg:grid-cols-[1.06fr_1fr]">
        <HeroBackground />
        <div className="relative isolate flex min-h-[260px] items-end overflow-hidden bg-kpmg-navy px-5 py-8 sm:min-h-[350px] sm:px-10 sm:py-12 lg:min-h-[clamp(440px,35vw,570px)] lg:px-[clamp(2.75rem,5vw,6rem)] lg:pb-[clamp(3rem,6vw,6.5rem)]">
          <Image
            src="/images/kpmg_brand_images/young-people-discussing-something-in-meeting.jpg"
            alt="Colleagues discussing their work around a meeting table"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="advisory-hero-photo -z-20 object-cover object-[48%_45%]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-[#001B44] via-[#001B44]/35 to-transparent" />
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-white">KPMG CFO Advisory</p>
            <h1 className="max-w-[19ch] text-balance text-[clamp(2.6rem,5vw,5.25rem)] leading-[1.05] text-white">
              Managed Services Finance &amp; Accounting
            </h1>
          </div>
        </div>
        <div className="relative flex min-w-0 flex-col justify-center bg-[#001B44]/25 px-5 py-8 text-white sm:px-10 sm:py-12 lg:px-[clamp(2.75rem,5vw,6rem)]">
          <div className="grid max-w-lg gap-3 sm:grid-cols-[1.15fr_1fr]">
            {!user && (
              <button
                type="button"
                onClick={openLogin}
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-sm bg-white px-3.5 py-3 text-sm font-semibold text-kpmg-blue hover:bg-ice focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
              >
                Sign in to Workflows
                <ArrowRight size={18} weight="light" className="advisory-action-arrow shrink-0" aria-hidden="true" />
              </button>
            )}
            <a href="#fields-of-play" className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/70 px-3.5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
              Fields of Play
            </a>
          </div>
          <HeroFieldLinks />
        </div>
      </div>
    </section>
  );
}
