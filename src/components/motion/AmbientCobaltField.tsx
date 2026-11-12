"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "motion/react";

export function AmbientCobaltField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const targetX = useMotionValue(0.55);
  const targetY = useMotionValue(0.45);
  const smoothX = useSpring(targetX, { stiffness: 75, damping: 26 });
  const smoothY = useSpring(targetY, { stiffness: 75, damping: 26 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      prefersReducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (nx: number, ny: number) => {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const cx = width * nx;
      const cy = height * ny;
      const primaryRadius = Math.max(width, height) * 0.68;

      const primaryGrad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        primaryRadius
      );
      primaryGrad.addColorStop(0, "rgba(30, 107, 255, 0.24)");
      primaryGrad.addColorStop(0.45, "rgba(0, 51, 141, 0.16)");
      primaryGrad.addColorStop(1, "rgba(3, 8, 22, 0)");

      ctx.fillStyle = primaryGrad;
      ctx.fillRect(0, 0, width, height);

      const secondaryX = width * (0.28 + (1 - nx) * 0.2);
      const secondaryY = height * (0.72 - ny * 0.15);
      const secondaryRadius = Math.max(width, height) * 0.5;

      const secondaryGrad = ctx.createRadialGradient(
        secondaryX,
        secondaryY,
        0,
        secondaryX,
        secondaryY,
        secondaryRadius
      );
      secondaryGrad.addColorStop(0, "rgba(0, 51, 141, 0.2)");
      secondaryGrad.addColorStop(1, "rgba(3, 8, 22, 0)");

      ctx.fillStyle = secondaryGrad;
      ctx.fillRect(0, 0, width, height);
    };

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced) {
        drawFrame(0.55, 0.45);
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    if (reduced) {
      drawFrame(0.55, 0.45);
      return () => {
        resizeObserver.disconnect();
      };
    }

    const onPointerMove = (event: PointerEvent) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      targetX.set(nx);
      targetY.set(ny);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const renderLoop = () => {
      drawFrame(smoothX.get(), smoothY.get());
      rafId = window.requestAnimationFrame(renderLoop);
    };
    rafId = window.requestAnimationFrame(renderLoop);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
    };
  }, [prefersReducedMotion, smoothX, smoothY, targetX, targetY]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
