"use client";

import {
  ArrowDown,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import {
  CHAPTERS,
  useEquilibriumScene,
} from "@/context/EquilibriumSceneContext";

export function TacticalHudOverlay() {
  const {
    activeChapter,
    activeScenario,
    audioEnabled,
    toggleAudio,
    scrollToChapter,
  } = useEquilibriumScene();

  const currentChapter =
    CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 hidden md:block">
      {/* Four precision HUD corner reticle ticks */}
      <span
        aria-hidden="true"
        className="absolute top-[88px] left-6 h-3 w-3 border-t border-l border-[#1E6BFF]/45"
      />
      <span
        aria-hidden="true"
        className="absolute top-[88px] right-6 h-3 w-3 border-t border-r border-[#1E6BFF]/45"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-6 left-6 h-3 w-3 border-b border-l border-[#1E6BFF]/45"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-6 right-6 h-3 w-3 border-b border-r border-[#1E6BFF]/45"
      />

      {/* Bottom-left live telemetry & reconciliation pill */}
      <div className="pointer-events-auto absolute bottom-8 left-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2.5 rounded-sm border border-[#162447] bg-[#030816]/85 px-3 py-1.5 font-mono text-[11px] text-[#CBD5E1] backdrop-blur-md">
          <span className="text-[#7FB0FF]">
            CH {currentChapter.code}/05
          </span>
          <span className="h-3 w-px bg-[#162447]" aria-hidden="true" />
          <span className="uppercase tracking-[0.14em] text-[#F4F7FB]">
            {currentChapter.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => scrollToChapter("ledger")}
          className="inline-flex items-center gap-2 rounded-sm border border-[#10B981]/35 bg-[#030816]/85 px-3 py-1.5 font-mono text-[11px] text-[#10B981] backdrop-blur-md transition-colors hover:border-[#10B981]/70 active:scale-[0.98]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          <span className="tabular-nums">
            {activeScenario.shortTag} · Δ 0.00 RECONCILED
          </span>
        </button>
      </div>

      {/* Right-edge interactive 5-chapter navigation rail */}
      <nav
        aria-label="3D Chapter Navigation"
        className="pointer-events-auto absolute top-1/2 right-3 flex -translate-y-1/2 flex-col items-end gap-2.5"
      >
        {CHAPTERS.map((chapter) => {
          const isActive = chapter.id === activeChapter;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => scrollToChapter(chapter.anchorId)}
              aria-label={`Jump to chapter ${chapter.code}: ${chapter.label}`}
              aria-current={isActive ? "step" : undefined}
              className="group flex items-center gap-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
            >
              <span
                className="pointer-events-none rounded-sm border border-[#162447] bg-[#030816]/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#F4F7FB] opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100"
              >
                {chapter.code} · {chapter.label}
              </span>
              <span
                className={`block h-[2px] transition-all duration-200 ${
                  isActive
                    ? "w-5 bg-[#1E6BFF]"
                    : "w-2.5 bg-[#162447] group-hover:w-4 group-hover:bg-[#7FB0FF]"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Bottom-right opt-in WebAudio soundscape & scroll prompt */}
      <div className="pointer-events-auto absolute right-8 bottom-8 flex items-center gap-3">
        {activeChapter === 1 && (
          <button
            type="button"
            onClick={() => scrollToChapter("practice")}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#162447] bg-[#030816]/85 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#CBD5E1] backdrop-blur-md transition-colors hover:border-[#1E6BFF]/60 hover:text-[#F4F7FB]"
          >
            <span>Scroll to Orbit</span>
            <ArrowDown size={13} weight="light" className="text-[#1E6BFF]" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleAudio}
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? "Mute ambient sound" : "Enable ambient sound"}
          className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] backdrop-blur-md transition-colors active:scale-[0.98] ${
            audioEnabled
              ? "border-[#1E6BFF]/60 bg-[#1E6BFF]/15 text-[#F4F7FB]"
              : "border-[#162447] bg-[#030816]/85 text-[#7E91B3] hover:text-[#F4F7FB]"
          }`}
        >
          {audioEnabled ? (
            <SpeakerHigh size={14} weight="light" className="text-[#1E6BFF]" />
          ) : (
            <SpeakerSlash size={14} weight="light" />
          )}
          <span>{audioEnabled ? "Sound On" : "Sound Off"}</span>
        </button>
      </div>
    </div>
  );
}
