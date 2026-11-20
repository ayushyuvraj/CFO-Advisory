"use client";

import {
  ArrowsClockwise,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import {
  CHAPTERS,
  useEquilibriumScene,
} from "@/context/EquilibriumSceneContext";

export function WayfindingBar() {
  const {
    activeChapter,
    audioEnabled,
    toggleAudio,
    scrollToChapter,
  } = useEquilibriumScene();

  const currentChapter =
    CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6 sm:px-6">
      <div className="pointer-events-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-2 rounded-sm border border-[#D8DFE9] bg-white/92 px-3 py-2 shadow-[0_12px_36px_rgba(12,35,60,0.09)] backdrop-blur-xl sm:flex-nowrap sm:px-4">
        {/* Left: Current position badge */}
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm font-mono text-xs font-semibold text-white"
            style={{ backgroundColor: currentChapter.accentHex }}
          >
            {currentChapter.currencySymbol}
          </span>
          <div className="leading-tight">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#526075]">
              WHERE YOU ARE · CH {currentChapter.code}/05
            </p>
            <p className="text-xs font-semibold text-[#0C233C] whitespace-nowrap">
              {currentChapter.label}
            </p>
          </div>
        </div>

        {/* Center: Unmistakable 5-chapter clickable currency rail */}
        <nav
          aria-label="Currency Chapter Wayfinding"
          className="hidden items-center gap-1 lg:flex"
        >
          {CHAPTERS.map((chapter) => {
            const active = chapter.id === activeChapter;
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => scrollToChapter(chapter.anchorId)}
                aria-current={active ? "step" : undefined}
                className={`rounded-sm px-2.5 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                  active
                    ? "bg-[#00338D] text-white"
                    : "text-[#333940] hover:bg-[#F4F6FA] hover:text-[#00338D]"
                }`}
              >
                {chapter.shortLabel}
              </button>
            );
          })}
        </nav>

        {/* Right: Circular loop cue and sound toggle */}
        <div className="flex items-center gap-2">
          <span
            title="Circular infinite scroll enabled"
            className="hidden items-center gap-1 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-2 py-1.5 font-mono text-[10px] text-[#526075] xl:inline-flex"
          >
            <ArrowsClockwise size={12} weight="light" className="text-[#1E49E2]" />
            <span>LOOP</span>
          </span>

          <button
            type="button"
            onClick={toggleAudio}
            aria-pressed={audioEnabled}
            aria-label={audioEnabled ? "Mute ambient sound" : "Enable ambient sound"}
            className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-[11px] font-medium transition-colors active:scale-[0.98] ${
              audioEnabled
                ? "border-[#1E49E2] bg-[#1E49E2] text-white"
                : "border-[#D8DFE9] bg-white text-[#526075] hover:text-[#00338D]"
            }`}
          >
            {audioEnabled ? (
              <SpeakerHigh size={14} weight="light" />
            ) : (
              <SpeakerSlash size={14} weight="light" />
            )}
            <span className="hidden sm:inline">
              {audioEnabled ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
