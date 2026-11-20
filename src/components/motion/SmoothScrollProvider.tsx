"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import {
  CHAPTERS,
  useEquilibriumScene,
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

  const isInfiniteRoute = pathname === "/";

  useEffect(() => {
    registerScrollTo((target: string | number) => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { duration: 1.15 });
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
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: true,
      infinite: isInfiniteRoute,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", (e: { progress: number; velocity: number }) => {
      ScrollTrigger.update();
      const raw = Number.isFinite(e.progress) ? e.progress : 0;
      // Wrap modularly into [0, 1) for circular infinite scroll
      const p = ((raw % 1) + 1) % 1;
      scrollProgressRef.current = p;
      scrollVelocityRef.current = e.velocity || 0;
      audioEngine.modulateByScroll(e.velocity || 0, p);
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
    isInfiniteRoute,
    prefersReducedMotion,
    scrollProgressRef,
    scrollVelocityRef,
  ]);

  useEffect(() => {
    if (!isInfiniteRoute) return;

    const sections = [...CHAPTERS, { id: 1 as const, anchorId: "chapter-horizon-loop" }];
    const triggers = sections.map(({ id, anchorId }) => ScrollTrigger.create({
      trigger: `#${anchorId}`,
      start: "top 30%",
      end: "bottom 30%",
      onToggle: ({ isActive }) => {
        if (isActive) setActiveChapter(id);
      },
    }));
    return () => triggers.forEach((trigger) => trigger.kill());
  }, [isInfiniteRoute, setActiveChapter]);

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
