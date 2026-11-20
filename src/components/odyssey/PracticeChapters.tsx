"use client";

import Image from "next/image";
import { useId, useState } from "react";

const PRACTICES = [
  {
    id: "powered-finance",
    legacyId: "chapter-inr",
    label: "Powered Finance",
    image: "person-smiling.jpg",
    imageAlt: "A person smiling among colleagues in a shared workspace",
    crop: "object-[62%_42%]",
    title: "Powered Finance & enterprise performance",
    description: "Connect planning, finance operations, and decision-making across the enterprise.",
    topics: [
      ["Planning and forecasting", "Build driver-based plans and link operating assumptions to financial performance."],
      ["Finance transformation", "Design finance operating models around processes, systems, and accountability."],
      ["Reporting and controls", "Build governance, controls, and evidence into finance processes."],
    ],
  },
  {
    id: "treasury",
    legacyId: "chapter-usd",
    label: "Treasury",
    image: "kpmg-us-ceo-outlook-2026.jpg",
    imageAlt: "",
    crop: "object-center",
    title: "Treasury & working capital",
    description: "Improve visibility into cash and the decisions that affect it.",
    topics: [
      ["Liquidity planning", "Align cash forecasting with funding requirements and treasury policy."],
      ["Working capital", "Identify opportunities across receivables, payables, and inventory."],
      ["FX governance", "Define a consistent approach to currency exposure, oversight, and reporting."],
    ],
  },
  {
    id: "reporting-tax",
    legacyId: "chapter-eur",
    label: "Reporting & tax",
    image: "multicolor-cubes-abstract-1.jpg",
    imageAlt: "",
    crop: "object-right",
    title: "Close, reporting & tax",
    description: "Bring the financial close, reporting obligations, and tax considerations into a coordinated process.",
    topics: [
      ["Close-to-report", "Review close processes, consolidation, and intercompany reconciliations."],
      ["Technical accounting", "Address IFRS and US GAAP considerations across reporting and transactions."],
      ["Tax and assurance readiness", "Identify the controls, data, and documentation needed to support reporting obligations."],
    ],
  },
] as const;

function PracticeChapter({ practice, index }: { practice: (typeof PRACTICES)[number]; index: number }) {
  const { id, legacyId, label, title, description, topics, image, imageAlt, crop } = practice;
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? selected;
  const captionId = useId();

  return (
    <section id={id} className="relative scroll-mt-18 bg-white px-5 py-20 even:bg-surface sm:px-8 lg:py-28">
      <span id={legacyId} aria-hidden="true" className="pointer-events-none absolute top-0 scroll-mt-18" />
      <div className={`editorial-reveal mx-auto grid max-w-[1336px] items-center gap-8 lg:gap-16 ${index % 2 ? "lg:grid-cols-[1.12fr_1fr]" : "lg:grid-cols-[1fr_1.12fr]"}`}>
        <div>
          <p className="editorial-eyebrow">{String(index + 1).padStart(2, "0")} / {label}</p>
          <h2 className="mt-3 max-w-[24ch] text-balance text-4xl leading-[1.02] text-kpmg-blue sm:text-5xl lg:text-6xl">{title}</h2>
          <p className="mt-5 max-w-[46ch] leading-relaxed text-slate-ink">{description}</p>
          <ul className="mt-7 divide-y divide-border border-y border-border" onPointerLeave={() => setHovered(null)}>
            {topics.map(([name], topicIndex) => (
              <li key={name}>
                <button
                  type="button"
                  aria-pressed={selected === topicIndex}
                  aria-controls={captionId}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setHovered(topicIndex);
                  }}
                  onClick={() => { setSelected(topicIndex); setHovered(null); }}
                  className={`block min-h-12 w-full border-l-2 px-4 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cobalt ${active === topicIndex ? "border-[#0091DA] bg-[#0091DA]/8 text-kpmg-blue" : "border-transparent text-kpmg-navy"}`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <figure className={`editorial-practice-card overflow-hidden rounded-sm bg-[#001B44] text-white ${index % 2 ? "lg:order-first" : ""}`}>
          <div className="relative aspect-[16/10] overflow-hidden">
            <Image
              src={`/images/kpmg_brand_images/${image}`}
              alt={imageAlt}
              fill
              sizes="(min-width: 1400px) 672px, (min-width: 1024px) 48vw, 100vw"
              className={`editorial-practice-image object-cover ${crop}`}
            />
          </div>
          <figcaption id={captionId} className="grid min-h-28 border-t border-white/15 px-5 py-4 sm:px-6">
            {topics.map(([name, detail], topicIndex) => (
              <div key={name} aria-hidden={active !== topicIndex} data-active={active === topicIndex} className="editorial-practice-caption col-start-1 row-start-1">
                <p className="text-sm font-semibold text-ice">{name}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/90">{detail}</p>
              </div>
            ))}
          </figcaption>
          <span className="sr-only" aria-live="polite">{topics[selected][1]}</span>
        </figure>
      </div>
    </section>
  );
}

export function PracticeChapters() {
  return PRACTICES.map((practice, index) => <PracticeChapter key={practice.id} practice={practice} index={index} />);
}
