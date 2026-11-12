"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RECONCILED_SCENARIOS,
  type ReconciledScenario,
  type ScenarioId,
} from "@/data/reconciledLedger";
import { audioEngine } from "@/lib/audio/ProceduralAudioEngine";

export type ChapterId = 1 | 2 | 3 | 4 | 5;

export interface ChapterMeta {
  id: ChapterId;
  code: string;
  label: string;
  anchorId: string;
}

export const CHAPTERS: ChapterMeta[] = [
  { id: 1, code: "01", label: "Equilibrium Vault", anchorId: "vault" },
  { id: 2, code: "02", label: "Practice Strata", anchorId: "practice" },
  { id: 3, code: "03", label: "Reconciled Ledger", anchorId: "ledger" },
  { id: 4, code: "04", label: "Workflow Sync", anchorId: "orchestration" },
  { id: 5, code: "05", label: "Boardroom Gateway", anchorId: "perspectives" },
];

export type StratumFocus =
  | "pnl"
  | "balance-sheet"
  | "tax"
  | "treasury"
  | null;

interface EquilibriumSceneContextValue {
  scrollProgressRef: React.MutableRefObject<number>;
  scrollVelocityRef: React.MutableRefObject<number>;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  hoveredStratumRef: React.MutableRefObject<StratumFocus>;
  activeChapter: ChapterId;
  setActiveChapter: (chapter: ChapterId) => void;
  activeScenarioId: ScenarioId;
  activeScenario: ReconciledScenario;
  setScenario: (id: ScenarioId) => void;
  audioEnabled: boolean;
  toggleAudio: () => void;
  bootComplete: boolean;
  setBootComplete: (done: boolean) => void;
  hoveredStratum: StratumFocus;
  setHoveredStratum: (focus: StratumFocus) => void;
  scrollToChapter: (anchorId: string) => void;
  registerScrollTo: (fn: (target: string | number) => void) => void;
}

const EquilibriumSceneContext =
  createContext<EquilibriumSceneContextValue | null>(null);

export function EquilibriumSceneProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const hoveredStratumRef = useRef<StratumFocus>(null);
  const scrollToFnRef = useRef<((target: string | number) => void) | null>(
    null
  );

  const [activeChapter, setActiveChapterState] = useState<ChapterId>(1);
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>("base");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [hoveredStratum, setHoveredStratumState] =
    useState<StratumFocus>(null);

  const prevChapterRef = useRef<ChapterId>(1);

  const setActiveChapter = useCallback((chapter: ChapterId) => {
    if (prevChapterRef.current !== chapter) {
      prevChapterRef.current = chapter;
      setActiveChapterState(chapter);
      audioEngine.playChapterTick(chapter);
    }
  }, []);

  const setScenario = useCallback((id: ScenarioId) => {
    setActiveScenarioId(id);
    audioEngine.playReconcileChime();
  }, []);

  const toggleAudio = useCallback(() => {
    const next = audioEngine.setEnabled(!audioEngine.isEnabled());
    setAudioEnabled(next);
  }, []);

  const setHoveredStratum = useCallback((focus: StratumFocus) => {
    hoveredStratumRef.current = focus;
    setHoveredStratumState(focus);
  }, []);

  const registerScrollTo = useCallback(
    (fn: (target: string | number) => void) => {
      scrollToFnRef.current = fn;
    },
    []
  );

  const scrollToChapter = useCallback((anchorId: string) => {
    const target = `#${anchorId}`;
    if (scrollToFnRef.current) {
      scrollToFnRef.current(target);
      return;
    }
    const el = document.getElementById(anchorId);
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (window.innerWidth === 0 || window.innerHeight === 0) return;
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      audioEngine.dispose();
    };
  }, []);

  const value = useMemo<EquilibriumSceneContextValue>(
    () => ({
      scrollProgressRef,
      scrollVelocityRef,
      pointerRef,
      hoveredStratumRef,
      activeChapter,
      setActiveChapter,
      activeScenarioId,
      activeScenario: RECONCILED_SCENARIOS[activeScenarioId],
      setScenario,
      audioEnabled,
      toggleAudio,
      bootComplete,
      setBootComplete,
      hoveredStratum,
      setHoveredStratum,
      scrollToChapter,
      registerScrollTo,
    }),
    [
      activeChapter,
      setActiveChapter,
      activeScenarioId,
      setScenario,
      audioEnabled,
      toggleAudio,
      bootComplete,
      hoveredStratum,
      setHoveredStratum,
      scrollToChapter,
      registerScrollTo,
    ]
  );

  return (
    <EquilibriumSceneContext.Provider value={value}>
      {children}
    </EquilibriumSceneContext.Provider>
  );
}

export function useEquilibriumScene() {
  const ctx = useContext(EquilibriumSceneContext);
  if (!ctx) {
    throw new Error(
      "useEquilibriumScene must be used inside EquilibriumSceneProvider"
    );
  }
  return ctx;
}
