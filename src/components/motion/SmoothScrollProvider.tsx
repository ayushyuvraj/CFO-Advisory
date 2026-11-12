"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import {
  useEquilibriumScene,
  type ChapterId,
} from "@/context/EquilibriumSceneContext";
import { audioEngine } from "@/lib/audio/ProceduralAudioEngine";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const previousPathnameRef = useRef<string | null>(null);

  const {
    scrollProgressRef,
    scrollVelocityRef,
    setActiveChapter,
    registerScrollTo,
  } = useEquilibriumScene();

  useEffect(() => {
    registerScrollTo((target: string | number) => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { duration: 1.25 });
      } else if (typeof target === "string") {
        const id = target.replace(/^#/, "");
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    });
  }, [registerScrollTo]);

  useEffect(() => {
    const reduced =
      prefersReducedMotion ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (reduced) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.075,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", (e: { progress: number; velocity: number }) => {
      ScrollTrigger.update();
      const p = Math.min(1, Math.max(0, e.progress || 0));
      scrollProgressRef.current = p;
      scrollVelocityRef.current = e.velocity || 0;
      audioEngine.modulateByScroll(e.velocity || 0, p);

      const chapter: ChapterId =
        p < 0.16 ? 1 : p < 0.42 ? 2 : p < 0.68 ? 3 : p < 0.87 ? 4 : 5;
      setActiveChapter(chapter);
    });

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [
    prefersReducedMotion,
    scrollProgressRef,
    scrollVelocityRef,
    setActiveChapter,
  ]);

  useIsomorphicLayoutEffect(() => {
    const isRouteTransition =
      previousPathnameRef.current !== null &&
      previousPathnameRef.current !== pathname;
    previousPathnameRef.current = pathname;

    if (isRouteTransition && !window.location.hash) {
      scrollProgressRef.current = 0;
      scrollVelocityRef.current = 0;
      setActiveChapter(1);
      lenisRef.current?.scrollTo(0, { immediate: true });
      window.scrollTo(0, 0);
    }

    const rafId = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname, scrollProgressRef, scrollVelocityRef, setActiveChapter]);

  return <>{children}</>;
}
