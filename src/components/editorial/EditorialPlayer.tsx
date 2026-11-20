"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowCounterClockwise, Pause, Play } from "@phosphor-icons/react";
import { EDITORIAL_COLORS as color, useEditorialCanvas } from "./useEditorialCanvas";

const SCENES = [
  { tab: "Analysis", label: "Accounting & Audit" },
  { tab: "Assurance", label: "Assurance" },
  { tab: "Advisory", label: "Strategy & Advisory" },
];
const SCENE_LENGTH = 5000;
const DURATION = SCENE_LENGTH * SCENES.length;

function drawScene(ctx: CanvasRenderingContext2D, scene: number, t: number) {
  ctx.lineWidth = 1.5;
  if (scene === 0) {
    ctx.strokeStyle = "#9EDFFF40";
    for (let y = 82; y <= 282; y += 40) {
      ctx.beginPath();
      ctx.moveTo(106, y);
      ctx.lineTo(534, y);
      ctx.stroke();
    }
    [88, 120, 107, 162, 145, 199].forEach((height, index) => {
      const fraction = 1 - (1 - Math.min(1, Math.max(0, t * 3 - index * .10))) ** 3;
      const bar = height * fraction;
      ctx.fillStyle = index % 2 ? color.electric : color.purple;
      ctx.fillRect(119 + index * 70, 282 - bar, 47, bar);
    });
    return;
  }
  if (scene === 1) {
    [45, 75, 106, 137].forEach((radius, index) => {
      const angle = t * Math.PI * (index % 2 ? -.55 : .65) + index;
      ctx.beginPath();
      ctx.strokeStyle = "#9EDFFF35";
      ctx.arc(320, 180, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = index % 2 ? color.electric : "#ACEAFF";
      ctx.lineWidth = 4;
      ctx.arc(320, 180, radius, angle, angle + Math.PI * Math.min(1.65, t * 3 + .25));
      ctx.stroke();
    });
    return;
  }

  const nodes = [[116, 173], [206, 88], [209, 252], [320, 172], [431, 92], [440, 249], [524, 167]];
  for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]]) {
    ctx.beginPath();
    ctx.strokeStyle = "#0091DA80";
    ctx.moveTo(...nodes[a] as [number, number]);
    ctx.lineTo(...nodes[b] as [number, number]);
    ctx.stroke();
  }
  nodes.forEach(([x, y], index) => {
    const phase = (t * 2 - Math.abs(index - 3) * .14 + 1) % 1;
    ctx.strokeStyle = `rgba(135, 219, 255, ${.36 * (1 - phase)})`;
    ctx.beginPath();
    ctx.arc(x, y, 9 + 19 * phase, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = index === 3 ? "#ACEAFF" : color.electric;
    ctx.arc(x, y, index === 3 ? 9 : 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(notify: () => void) {
  const preference = window.matchMedia(REDUCED_MOTION);
  preference.addEventListener("change", notify);
  return () => preference.removeEventListener("change", notify);
}

export function EditorialPlayer() {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  const [playing, setPlaying] = useState(true);
  const [activeScene, setActiveScene] = useState(0);
  const currentScene = useRef(0);
  const scrubber = useRef<HTMLInputElement>(null);

  const { ref, seek } = useEditorialCanvas(({ context, width, height, elapsed, reduced }) => {
    const position = elapsed % DURATION;
    const scene = Math.floor(position / SCENE_LENGTH);
    const time = position % SCENE_LENGTH / SCENE_LENGTH;
    context.fillStyle = color.navy;
    context.fillRect(0, 0, width, height);
    context.save();
    context.scale(width / 640, height / 360);
    const mix = reduced ? 0 : Math.max(0, (time - .88) / .12);
    context.globalAlpha = 1 - mix;
    drawScene(context, scene, reduced ? 1 : Math.min(1, time + .08));
    if (mix > 0) {
      context.globalAlpha = mix;
      drawScene(context, (scene + 1) % SCENES.length, mix * .08);
    }
    context.restore();
    if (currentScene.current !== scene) {
      currentScene.current = scene;
      setActiveScene(scene);
    }
    if (scrubber.current) {
      scrubber.current.value = String(Math.floor(position));
      scrubber.current.style.setProperty("--player-progress", `${position / DURATION * 100}%`);
    }
  }, playing);

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-white">
      <canvas ref={ref} className="block aspect-video w-full bg-[#001B44]" role="img" aria-label="Abstract motion graphics of financial analysis, assurance, and advisory collaboration" />
      <div className="space-y-3 p-4 text-sm text-kpmg-navy sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Player chapters" className="flex flex-wrap gap-1.5">
            {SCENES.map(({ tab }, index) => (
              <button type="button" key={tab} aria-pressed={activeScene === index} onClick={() => seek(index * SCENE_LENGTH)}
                className="min-h-9 rounded-full border border-border px-3 text-xs font-semibold hover:border-kpmg-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt aria-pressed:border-kpmg-blue aria-pressed:bg-kpmg-blue aria-pressed:text-white">
                {tab}
              </button>
            ))}
          </div>
          {!reducedMotion && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setPlaying(!playing)} className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-border px-3 font-semibold hover:border-kpmg-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
                {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                {playing ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={() => seek(0)} className="inline-flex min-h-9 items-center gap-2 rounded-sm px-2 hover:text-kpmg-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
                <ArrowCounterClockwise aria-hidden="true" /> Restart
              </button>
            </div>
          )}
        </div>
        {!reducedMotion && (
          <input ref={scrubber} type="range" min={0} max={DURATION - 1} step={1} defaultValue={0}
            onChange={(event) => seek(event.currentTarget.valueAsNumber)}
            aria-label="Seek through motion graphics"
            className="editorial-player-scrubber block w-full" />
        )}
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-ink">{SCENES[activeScene].label}</p>
      </div>
    </div>
  );
}
