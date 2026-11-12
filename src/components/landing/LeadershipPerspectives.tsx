"use client";

import { motion, useReducedMotion } from "motion/react";

const PERSPECTIVES = [
  {
    quote:
      "“Moving our 13-week liquidity stress testing into governed workflows eliminated four days of manual reconciliation before every board committee review.”",
    name: "Marcus Lindqvist",
    role: "Chief Financial Officer, Nordvik Industrial",
    featured: true,
  },
  {
    quote:
      "“KPMG paired IFRS technical rigor with live ERP orchestration so our regional controllers verify intercompany eliminations in hours.”",
    name: "Priya Natarajan",
    role: "VP of Corporate Controllership, Meridia Health",
    featured: false,
  },
  {
    quote:
      "“Every GenAI variance brief carries direct citations back to Anaplan and Snowflake, giving our audit committee full confidence.”",
    name: "Elena Vance",
    role: "Managing Director, KPMG CFO Advisory",
    featured: false,
  },
];

export function LeadershipPerspectives() {
  const prefersReducedMotion = useReducedMotion();
  const [featured, ...secondary] = PERSPECTIVES;

  return (
    <section
      id="perspectives"
      className="border-t border-[#162447] bg-[#07112B]/30 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-[#F4F7FB] sm:text-5xl">
          Built with finance leaders who demand auditability.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
          <motion.blockquote
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between rounded-sm border border-[#162447] bg-[#0B1736] p-8 sm:p-10"
          >
            <p className="text-xl font-medium leading-relaxed tracking-tight text-[#F4F7FB] sm:text-2xl">
              {featured.quote}
            </p>
            <footer className="mt-8 border-t border-[#162447] pt-5">
              <p className="text-sm font-semibold text-[#F4F7FB]">
                {featured.name}
              </p>
              <p className="mt-0.5 text-sm text-[#7E91B3]">{featured.role}</p>
            </footer>
          </motion.blockquote>

          <div className="flex flex-col gap-6">
            {secondary.map((item, idx) => (
              <motion.blockquote
                key={item.name}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{
                  duration: 0.5,
                  delay: (idx + 1) * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex flex-1 flex-col justify-between rounded-sm border border-[#162447] bg-[#07112B] p-6 sm:p-7"
              >
                <p className="text-base leading-relaxed text-[#CBD5E1]">
                  {item.quote}
                </p>
                <footer className="mt-6 border-t border-[#162447] pt-4">
                  <p className="text-sm font-semibold text-[#F4F7FB]">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#7E91B3]">{item.role}</p>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
