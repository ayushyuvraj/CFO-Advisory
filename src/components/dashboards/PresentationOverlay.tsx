"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  FunnelSimple,
  PresentationChart,
  X,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import {
  CrossFilterItem,
  DashboardDocument,
  LiveDatasetsPayload,
} from "@/lib/dashboards/types";
import {
  GRID_COLUMNS,
  GRID_GAP_PX,
  GRID_ROW_HEIGHT_PX,
  getCanvasRowCount,
} from "@/lib/dashboards/gridLayout";
import { WidgetCard } from "./WidgetCard";

interface PresentationOverlayProps {
  isOpen: boolean;
  dashboard: DashboardDocument;
  activePageIndex: number;
  onChangePage: (index: number) => void;
  datasetsPayload: LiveDatasetsPayload;
  crossFilters: CrossFilterItem[];
  canExport: boolean;
  onToggleCrossFilter: (filter: CrossFilterItem) => void;
  onApplySlicerFilter: (widgetId: string, filter: CrossFilterItem | null) => void;
  onClearAllFilters: () => void;
  onDrillThrough: (widgetTitle: string, rawRows: Record<string, unknown>[]) => void;
  onClose: () => void;
}

function subscribeCompactViewport(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(max-width: 767px)");
  const handler = () => onStoreChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

function getCompactViewportSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function getCompactViewportServerSnapshot(): boolean {
  return false;
}

export function PresentationOverlay({
  isOpen,
  dashboard,
  activePageIndex,
  onChangePage,
  datasetsPayload,
  crossFilters,
  canExport,
  onToggleCrossFilter,
  onApplySlicerFilter,
  onClearAllFilters,
  onDrillThrough,
  onClose,
}: PresentationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isCompactViewport = useSyncExternalStore(
    subscribeCompactViewport,
    getCompactViewportSnapshot,
    getCompactViewportServerSnapshot
  );
  useDialogFocusTrap(isOpen, overlayRef, onClose);

  const pageCount = dashboard.pages.length;
  const safeIndex = Math.max(0, Math.min(pageCount - 1, activePageIndex));
  const activePage = dashboard.pages[safeIndex];

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onChangePage(Math.min(pageCount - 1, safeIndex + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChangePage(Math.max(0, safeIndex - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, pageCount, safeIndex, onChangePage]);

  if (!isOpen || !activePage || typeof document === "undefined") return null;

  const totalRows = getCanvasRowCount(activePage.widgets, 14);
  const sortedMobileWidgets = [...activePage.widgets].sort((a, b) =>
    a.layout.y !== b.layout.y ? a.layout.y - b.layout.y : a.layout.x - b.layout.x
  );

  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Presentation Mode: ${dashboard.title}`}
      className="fixed inset-0 z-[95] flex flex-col bg-[#F8FAFC] focus:outline-none"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
    >
      {/* Responsive Executive Slide Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#D8DFE9] bg-[#00338D] px-4 py-3 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <PresentationChart
            size={20}
            weight="light"
            className="shrink-0 text-[#00B8F5]"
          />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight">
              {dashboard.title}
            </h2>
            <p className="truncate font-mono text-[11px] text-white/80">
              Slide {safeIndex + 1} of {pageCount} · {activePage.title}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {crossFilters.length > 0 && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/30 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-white hover:bg-white/20"
            >
              <FunnelSimple size={13} weight="bold" />
              <span>
                Clear {crossFilters.length} Filter
                {crossFilters.length !== 1 ? "s" : ""}
              </span>
            </button>
          )}

          <div className="flex items-center gap-1 rounded-sm border border-white/20 bg-white/10 p-0.5">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => onChangePage(safeIndex - 1)}
              aria-label="Previous slide"
              className="rounded-sm p-1.5 text-white hover:bg-white/20 disabled:opacity-35"
            >
              <ArrowLeft size={15} weight="bold" />
            </button>
            <span className="px-2 font-mono text-xs tabular-nums">
              {safeIndex + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safeIndex >= pageCount - 1}
              onClick={() => onChangePage(safeIndex + 1)}
              aria-label="Next slide"
              className="rounded-sm p-1.5 text-white hover:bg-white/20 disabled:opacity-35"
            >
              <ArrowRight size={15} weight="bold" />
            </button>
          </div>

          <button
            type="button"
            data-dialog-close="true"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-sm bg-white px-3 py-1.5 text-xs font-semibold text-[#00338D] hover:bg-[#F4F6FA]"
          >
            <X size={14} weight="bold" />
            <span>Exit (Esc)</span>
          </button>
        </div>
      </div>

      {/* Live Interactive Slide Canvas (24-col grid on md+, stacked on mobile) */}
      <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
        {!isCompactViewport ? (
          <div
            className="mx-auto grid max-w-[1600px]"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
              gridAutoRows: `${GRID_ROW_HEIGHT_PX}px`,
              gap: `${GRID_GAP_PX}px`,
              minHeight: `${totalRows * (GRID_ROW_HEIGHT_PX + GRID_GAP_PX)}px`,
            }}
          >
            {activePage.widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                datasetsPayload={datasetsPayload}
                crossFilters={crossFilters}
                isEditMode={false}
                isSelected={false}
                canExport={canExport}
                onSelect={() => {}}
                onDelete={() => {}}
                onDuplicate={() => {}}
                onToggleCrossFilter={onToggleCrossFilter}
                onApplySlicerFilter={onApplySlicerFilter}
                onDrillThrough={onDrillThrough}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedMobileWidgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                datasetsPayload={datasetsPayload}
                crossFilters={crossFilters}
                isEditMode={false}
                isSelected={false}
                canExport={canExport}
                isCompactStack
                onSelect={() => {}}
                onDelete={() => {}}
                onDuplicate={() => {}}
                onToggleCrossFilter={onToggleCrossFilter}
                onApplySlicerFilter={onApplySlicerFilter}
                onDrillThrough={onDrillThrough}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Slide Dots Bar */}
      <div className="flex shrink-0 items-center justify-center gap-2 overflow-x-auto border-t border-[#D8DFE9] bg-white px-4 py-2.5 sm:px-6">
        {dashboard.pages.map((pg, idx) => (
          <button
            key={pg.id}
            type="button"
            onClick={() => onChangePage(idx)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-semibold transition-colors ${
              idx === safeIndex
                ? "bg-[#00338D] text-white"
                : "border border-[#D8DFE9] bg-[#F8FAFC] text-[#526075] hover:bg-[#F4F6FA]"
            }`}
          >
            <span className="font-mono text-[10px]">{idx + 1}.</span>
            <span>{pg.title}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
