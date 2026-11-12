"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEquilibriumScene } from "@/context/EquilibriumSceneContext";
import { noopSubscribe } from "@/components/three/WebGLErrorBoundary";

const BOOT_SEEN_KEY = "kpmg_v2_currency_boot_seen";

function checkShouldSkipBoot(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    sessionStorage.getItem(BOOT_SEEN_KEY) === "1"
  );
}

export function TacticalBootLoader() {
  const prefersReducedMotion = useReducedMotion();
  const shouldSkip = useSyncExternalStore(
    noopSubscribe,
    checkShouldSkipBoot,
    () => false
  );
  const { bootComplete, setBootComplete } = useEquilibriumScene();
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion || shouldSkip) {
      setBootComplete(true);
      return;
    }

    const start = performance.now();
    const duration = 900;
    let rafId = 0;
    let timeoutId: number | undefined;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));

      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem(BOOT_SEEN_KEY, "1");
        timeoutId = window.setTimeout(() => {
          setDismissed(true);
          setBootComplete(true);
        }, 120);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion, shouldSkip, setBootComplete]);

  const showOverlay =
    !prefersReducedMotion && !shouldSkip && !dismissed && !bootComplete;

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          key="kpmg-currency-boot"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          }}
          aria-hidden="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6"
        >
          <div className="w-full max-w-md border border-[#D8DFE9] bg-[#F4F6FA] p-6">
            <div className="flex items-center justify-between font-mono text-[11px] font-semibold tracking-[0.2em] text-[#00338D]">
              <span>KPMG // CFO ADVISORY</span>
              <span className="tabular-nums">
                {String(progress).padStart(3, "0")}%
              </span>
            </div>

            <div className="mt-4 h-[3px] w-full overflow-hidden bg-[#D8DFE9]">
              <div
                className="h-full bg-gradient-to-r from-[#00338D] via-[#1E49E2] to-[#7213EA] transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-[#526075]">
              <span>₹ INR · $ USD · € EUR · £ GBP</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#009A44]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#009A44]" />
                Δ 0.00
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
