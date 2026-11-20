"use client";

import { useEffect, useRef } from "react";

type Metric = { label: string; value: number; suffix?: string };
const format = new Intl.NumberFormat("en");

export function ImpactMetrics({ metrics }: { metrics: readonly Metric[] }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section || !metrics.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const values = Array.from(section.querySelectorAll<HTMLElement>("[data-metric-value]"));
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < .3) return;
      observer.disconnect();
      const start = performance.now();
      section.querySelectorAll(".editorial-metric").forEach((column) => column.classList.add("editorial-revealed"));
      values.forEach((value) => { value.textContent = "0"; });
      function tick(now: number) {
        let finished = true;
        values.forEach((element, index) => {
          const progress = Math.min(1, Math.max(0, (now - start - index * 120) / 1600));
          const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
          const metric = metrics[index];
          element.textContent = format.format(Math.round(metric.value * eased)) + (metric.suffix ?? "");
          finished &&= progress === 1;
        });
        if (!finished) frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }, { threshold: .3 });
    observer.observe(section);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [metrics]);

  return (
    <section ref={ref} id="our-impact" className="scroll-mt-18 border-b border-border bg-surface px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-[1336px]">
        <h2 className="text-2xl font-semibold tracking-tight text-kpmg-blue">Our Impact</h2>
        {metrics.length ? (
          <dl className="mt-5 grid gap-6 sm:grid-cols-3">
            {metrics.map((metric, index) => (
              <div key={metric.label} className="editorial-metric" style={{ animationDelay: `${index * 120}ms` }}>
                <dt>{metric.label}</dt>
                <dd className="text-3xl font-semibold tabular-nums text-kpmg-blue">
                  <span className="sr-only">{format.format(metric.value)}{metric.suffix}</span>
                  <span aria-hidden="true" data-metric-value>{format.format(metric.value)}{metric.suffix}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : <p className="mt-2 text-muted-ink">Under construction. Verified impact figures will appear here when available.</p>}
      </div>
    </section>
  );
}
