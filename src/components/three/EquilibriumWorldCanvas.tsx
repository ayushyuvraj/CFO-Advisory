"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { EquilibriumSceneContent } from "./EquilibriumSceneContent";
import {
  WebGLErrorBoundary,
  detectWebGLSupport,
  noopSubscribe,
} from "./WebGLErrorBoundary";

function StaticObsidianFallback() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030816]"
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 72% 38%, rgba(30, 107, 255, 0.22), rgba(0, 51, 141, 0.12) 38%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(30, 107, 255, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 107, 255, 0.22) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
    </div>
  );
}

export function EquilibriumWorldCanvas() {
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
    return <StaticObsidianFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<StaticObsidianFallback />}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[#030816]"
      >
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [-2.1, 0.85, 8.4], fov: 42, near: 0.1, far: 80 }}
          frameloop={isVisible ? "always" : "never"}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            toneMappingExposure: 1.08,
          }}
        >
          <Suspense fallback={null}>
            <EquilibriumSceneContent />
          </Suspense>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
