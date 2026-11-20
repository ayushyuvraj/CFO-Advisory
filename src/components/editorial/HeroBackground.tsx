"use client";

import { useEffect, useRef } from "react";
import { EDITORIAL_COLORS, useEditorialCanvas } from "./useEditorialCanvas";

export function HeroBackground() {
  const pointer = useRef({ x: 0, y: 0 });
  const position = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const move = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 18;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 12;
    };
    const reset = () => { pointer.current = { x: 0, y: 0 }; };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, []);

  const { ref } = useEditorialCanvas(({ context, width, height, elapsed, reduced }) => {
    const time = reduced ? 0 : elapsed / 1000;
    const offset = position.current;
    offset.x = reduced ? 0 : offset.x + (pointer.current.x - offset.x) * .06;
    offset.y = reduced ? 0 : offset.y + (pointer.current.y - offset.y) * .06;

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, EDITORIAL_COLORS.navy);
    gradient.addColorStop(.62, EDITORIAL_COLORS.royal);
    gradient.addColorStop(1, EDITORIAL_COLORS.purple);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const horizon = height * .64 + offset.y;
    const center = width * .57 + offset.x;
    context.strokeStyle = "#9FDFFF20";
    context.lineWidth = 1;
    context.beginPath();
    for (let index = -12; index <= 12; index++) {
      context.moveTo(center + index * 2, horizon);
      context.lineTo(center + index * width / 11, height);
    }
    for (let index = 1; index <= 8; index++) {
      const row = horizon + (height - horizon) * (index / 8) ** 2;
      context.moveTo(0, row);
      context.lineTo(width, row);
    }
    context.stroke();

    for (let index = 0; index < 15; index++) {
      const phase = index * .46;
      const y = height * (.72 + index * .016) + Math.sin(time * .32 + phase) * height * .065 + offset.y;
      const shift = Math.sin(time * .22 + phase) * width * .07 + offset.x;
      const trail = context.createLinearGradient(0, 0, width, 0);
      trail.addColorStop(0, "#0091DA00");
      trail.addColorStop(.58, index % 3 === 0 ? "#48369888" : "#0091DA80");
      trail.addColorStop(1, "#0091DA00");
      context.strokeStyle = trail;
      context.lineWidth = index % 5 === 0 ? 1.35 : .7;
      context.beginPath();
      context.moveTo(-width * .1, y + height * .12);
      context.bezierCurveTo(width * .28 + shift, y - height * .20, width * .65 + shift, y + height * .16, width * 1.1, y - height * .24);
      context.stroke();
    }
  });

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />;
}
