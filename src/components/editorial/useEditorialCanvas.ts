"use client";

import { useEffect, useEffectEvent, useRef } from "react";

export const EDITORIAL_COLORS = {
  navy: "#001B44",
  royal: "#00338D",
  electric: "#0091DA",
  purple: "#483698",
};

type Frame = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  elapsed: number;
  reduced: boolean;
};

export function useEditorialCanvas(
  draw: (frame: Frame) => void,
  playing = true,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const repaintRef = useRef<(() => void) | null>(null);
  const render = useEffectEvent(draw);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let visible = false;
    let frame = 0;
    let previous: number | undefined;

    function paint() {
      if (width && height && context) {
        render({ context, width, height, elapsed: elapsed.current, reduced: reducedMotion.matches });
      }
    }

    function tick(now: number) {
      if (previous !== undefined) elapsed.current += Math.min(now - previous, 50);
      previous = now;
      paint();
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      cancelAnimationFrame(frame);
      previous = undefined;
      if (visible && !document.hidden && playing && !reducedMotion.matches) {
        frame = requestAnimationFrame(tick);
      } else if (visible) {
        paint();
      }
    }

    function resize() {
      if (!canvas || !context) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint();
    }

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const dimensions = new ResizeObserver(resize);

    repaintRef.current = paint;
    resize();
    dimensions.observe(canvas);
    intersection.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      repaintRef.current = null;
      cancelAnimationFrame(frame);
      intersection.disconnect();
      dimensions.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, [playing]);

  function seek(time: number) {
    elapsed.current = time;
    repaintRef.current?.();
  }

  return { ref, seek };
}
