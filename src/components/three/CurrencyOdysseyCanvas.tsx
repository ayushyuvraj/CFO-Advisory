"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { CurrencyOdysseyScene } from "./CurrencyOdysseyScene";
import {
  WebGLErrorBoundary,
  detectWebGLSupport,
  noopSubscribe,
} from "./WebGLErrorBoundary";

function BrightKpmgStaticFallback() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#F8FAFC]"
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 78% 30%, rgba(0, 184, 245, 0.14), rgba(30, 73, 226, 0.08) 38%, transparent 70%), radial-gradient(circle at 20% 80%, rgba(114, 19, 234, 0.08), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(203, 213, 225, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(203, 213, 225, 0.45) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}

export function CurrencyOdysseyCanvas() {
  const prefersReducedMotion = useReducedMotion();
  const webglReady = useSyncExternalStore(
    noopSubscribe,
    detectWebGLSupport,
    () => false
  );
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (prefersReducedMotion || !webglReady) {
    return <BrightKpmgStaticFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<BrightKpmgStaticFallback />}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[#F8FAFC]"
      >
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [-0.35, 0.2, 5.4], fov: 42, near: 0.1, far: 80 }}
          frameloop={isVisible ? "always" : "never"}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          <Suspense fallback={null}>
            <CurrencyOdysseyScene />
          </Suspense>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
