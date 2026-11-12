"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowDownRight, ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { AmbientCobaltField } from "@/components/motion/AmbientCobaltField";

export function HeroCinema() {
  const router = useRouter();
  const { user, openLogin } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);

  const handleGatewayClick = () => {
    if (user) {
      router.push("/workflows");
      return;
    }
    openLogin();
  };

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[100dvh] items-center pt-24 pb-16 lg:pb-20"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.22fr_1fr] lg:gap-12">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start"
          >
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#7FB0FF]">
              KPMG CFO ADVISORY
            </span>

            <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight leading-[1.06] text-[#F4F7FB] sm:text-5xl lg:text-6xl">
              Orchestrate finance at executive velocity.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#CBD5E1] sm:text-lg">
              Unify enterprise performance, intelligent close, and AI workflows
              built for modern finance leaders.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleGatewayClick}
                className="inline-flex items-center gap-2 rounded-sm bg-[#1E6BFF] px-5 py-3 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
              >
                <span>Sign in to Workflows</span>
                <ArrowRight size={16} weight="light" />
              </button>

              <a
                href="#practice"
                className="inline-flex items-center gap-2 rounded-sm border border-[#162447] bg-[#07112B] px-5 py-3 text-sm font-medium text-[#F4F7FB] whitespace-nowrap transition-[border-color,background-color,transform] duration-150 hover:border-white/25 hover:bg-[#0B1736] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
              >
                <span>Explore Practice</span>
                <ArrowDownRight size={16} weight="light" className="text-[#CBD5E1]" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-[#162447] bg-[#07112B] lg:aspect-[5/6]">
              <AmbientCobaltField />
              <motion.div
                style={prefersReducedMotion ? undefined : { y: imageY }}
                className="relative h-[108%] w-full -top-[4%]"
              >
                <Image
                  src="/images/hero-monolith.jpg"
                  alt="Architectural cobalt glass monolith representing KPMG CFO Advisory financial precision"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover object-center opacity-90"
                />
              </motion.div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030816]/65 via-transparent to-[#030816]/20"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
