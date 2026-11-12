"use client";

import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";

gsap.registerPlugin(ScrollTrigger);

const MANDATE_TEXT =
  "Modern finance leaders do not lack data. They lack governed velocity between boardroom judgment and live enterprise execution. KPMG CFO Advisory unifies strategy, controls, and automated workflows in one institutional command layer.";

export function MandateScrollReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const reduced =
      prefersReducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) return;

    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>(".mandate-word");
      gsap.fromTo(
        words,
        { opacity: 0.22 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 78%",
            end: "bottom 58%",
            scrub: 0.6,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  const words = MANDATE_TEXT.split(" ");

  return (
    <section
      ref={sectionRef}
      className="relative z-10 border-y border-[#162447]/70 bg-[#030816]/45 py-24 backdrop-blur-[2px] sm:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <p className="max-w-5xl text-2xl font-medium tracking-tight leading-[1.32] text-[#F4F7FB] sm:text-4xl lg:text-[42px] lg:leading-[1.24]">
          {words.map((word, idx) => (
            <span
              key={`${word}-${idx}`}
              className={`mandate-word inline-block mr-[0.26em] ${
                prefersReducedMotion ? "opacity-100" : "opacity-[0.22]"
              }`}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
