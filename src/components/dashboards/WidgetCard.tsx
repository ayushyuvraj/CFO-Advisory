"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import {
  Copy,
  DotsSixVertical,
  DownloadSimple,
  Eye,
  FileCsv,
  FileXls,
  FunnelSimple,
  Image as ImageIcon,
  LockKey,
  Trash,
} from "@phosphor-icons/react";
import { SEMANTIC_DATASET_MAP, VISUAL_CATALOG_MAP } from "@/lib/dashboards/catalog";
import {
  exportElementPng,
  exportRowsCsv,
  exportRowsXlsx,
} from "@/lib/dashboards/exportUtils";
import {
  extractWidgetExportTable,
  filterDatasetRows,
} from "@/lib/dashboards/queryEngine";
import {
  CrossFilterItem,
  DashboardWidget,
  LiveDatasetsPayload,
  RawDataRow,
} from "@/lib/dashboards/types";
import { EChartSurface, EChartSurfaceHandle } from "./renderers/EChartSurface";
import { KpiAndCalloutWidgets } from "./renderers/KpiAndCalloutWidgets";
import { TableAndPivotWidgets } from "./renderers/TableAndPivotWidgets";
import { SlicerWidgets } from "./renderers/SlicerWidgets";

interface WidgetCardProps {
  widget: DashboardWidget;
  datasetsPayload: LiveDatasetsPayload;
  crossFilters: CrossFilterItem[];
  isEditMode: boolean;
  isSelected: boolean;
  canExport: boolean;
  isCompactStack?: boolean;
  onSelect: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
  onDuplicate: (widgetId: string) => void;
  onStartMove?: (widgetId: string, e: React.PointerEvent) => void;
  onStartResize?: (
    widgetId: string,
    edge: "e" | "s" | "se",
    e: React.PointerEvent
  ) => void;
  onToggleCrossFilter: (filter: CrossFilterItem) => void;
  onApplySlicerFilter: (widgetId: string, filter: CrossFilterItem | null) => void;
  onDrillThrough: (widgetTitle: string, rawRows: Record<string, unknown>[]) => void;
}

export function WidgetCard({
  widget,
  datasetsPayload,
  crossFilters,
  isEditMode,
  isSelected,
  canExport,
  isCompactStack = false,
  onSelect,
  onDelete,
  onDuplicate,
  onStartMove,
  onStartResize,
  onToggleCrossFilter,
  onApplySlicerFilter,
  onDrillThrough,
}: WidgetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const echartRef = useRef<EChartSurfaceHandle>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { active } = useDndContext();
  const isFieldDragging = active?.data?.current?.kind === "data-field";

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `widget-drop:${widget.id}`,
    disabled: !isEditMode || !isFieldDragging,
    data: { kind: "widget-drop", widgetId: widget.id },
  });

  // Close export dropdown on outside pointerdown or Escape
  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportMenuOpen]);

  const visualMeta = VISUAL_CATALOG_MAP[widget.type];
  const datasetMeta = SEMANTIC_DATASET_MAP[widget.datasetId];
  const restrictedReason = datasetsPayload.restrictedDatasets?.[widget.datasetId];

  const allDatasetRows = useMemo(
    () => datasetsPayload.datasets[widget.datasetId] || [],
    [datasetsPayload.datasets, widget.datasetId]
  );

  const filteredRows = useMemo(
    () => filterDatasetRows(allDatasetRows, widget, crossFilters),
    [allDatasetRows, widget, crossFilters]
  );

  const activeSlicerFilter = useMemo(
    () => crossFilters.find((cf) => cf.sourceWidgetId === widget.id),
    [crossFilters, widget.id]
  );

  const isFilteredByOthers = useMemo(
    () =>
      crossFilters.some(
        (cf) => cf.datasetId === widget.datasetId && cf.sourceWidgetId !== widget.id
      ),
    [crossFilters, widget.datasetId, widget.id]
  );

  const handleChartCrossFilter = (field: string, value: string) => {
    if (isEditMode) return;
    onToggleCrossFilter({
      sourceWidgetId: widget.id,
      datasetId: widget.datasetId,
      field,
      operator: "in",
      values: [value],
      displayLabel: `${field}: ${value}`,
    });
  };

  const handleExport = async (kind: "png" | "svg" | "csv" | "xlsx") => {
    setExportMenuOpen(false);
    if (!canExport) return;
    if (kind === "png") {
      if (visualMeta.renderer === "echarts" && echartRef.current?.exportPng()) {
        return;
      }
      await exportElementPng(cardRef.current, widget.title);
      return;
    }
    if (kind === "svg") {
      await echartRef.current?.exportSvg();
      return;
    }
    const table = extractWidgetExportTable(filteredRows, widget);
    if (kind === "csv") {
      exportRowsCsv(table.columns, table.rows, widget.title);
    } else if (kind === "xlsx") {
      await exportRowsXlsx(table.columns, table.rows, widget.title);
    }
  };

  const isSectionBanner = widget.type === "section_header";
  const showFieldDropCue = isOver && isEditMode && isFieldDragging;

  const compactHeightClass = isSectionBanner
    ? "min-h-[64px]"
    : visualMeta.renderer === "kpi_callout" || visualMeta.renderer === "slicer"
    ? "min-h-[168px]"
    : "min-h-[300px]";

  return (
    <div
      ref={(node) => {
        cardRef.current = node;
        setDropRef(node);
      }}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      onClick={(e) => {
        if (isEditMode) {
          e.stopPropagation();
          onSelect(widget.id);
        }
      }}
      style={
        isCompactStack
          ? undefined
          : {
              gridColumn: `${widget.layout.x + 1} / span ${widget.layout.w}`,
              gridRow: `${widget.layout.y + 1} / span ${widget.layout.h}`,
            }
      }
      className={`group relative flex flex-col rounded-sm border bg-white transition-[border-color,box-shadow] ${
        isCompactStack ? compactHeightClass : ""
      } ${
        exportMenuOpen ? "z-30" : ""
      } ${
        showFieldDropCue
          ? "border-[#1E49E2] ring-2 ring-[#1E49E2]/40 shadow-md"
          : isSelected && isEditMode
          ? "border-[#00338D] ring-2 ring-[#00338D]/25 shadow-md"
          : "border-[#D8DFE9] shadow-2xs hover:border-[#94A3B8]"
      }`}
    >
      {/* Header Bar */}
      {!isSectionBanner ? (
        <div
          className={`flex shrink-0 items-center justify-between gap-2 rounded-t-sm border-b border-[#EEF2F6] px-3 py-2 ${
            isEditMode ? "bg-[#F8FAFC]" : "bg-white"
          }`}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {isEditMode && onStartMove && !isCompactStack && (
              <button
                type="button"
                aria-label={`Drag to move ${widget.title}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelect(widget.id);
                  onStartMove(widget.id, e);
                }}
                className="touch-none select-none cursor-grab rounded-sm p-0.5 text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0C233C] active:cursor-grabbing"
              >
                <DotsSixVertical size={15} weight="bold" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-xs font-bold tracking-tight text-[#0C233C]">
                {widget.title}
              </h3>
              {widget.subtitle && (
                <p className="truncate text-[10px] text-[#526075]">
                  {widget.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isFilteredByOthers && (
              <span
                title="Filtered by active page cross-filter or slicer"
                className="inline-flex items-center gap-0.5 rounded-sm bg-[#1E49E2]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#1E49E2]"
              >
                <FunnelSimple size={10} weight="bold" />
                Filtered
              </span>
            )}

            {isEditMode && widget.layout.w >= 10 && !isCompactStack && (
              <span className="hidden rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-0.5 font-mono text-[9px] text-[#526075] xl:inline-block">
                {datasetMeta?.shortLabel || widget.datasetId}
              </span>
            )}

            {visualMeta.supportsDrillThrough &&
              widget.datasetId === "telemetry_events" &&
              !restrictedReason &&
              filteredRows.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrillThrough(
                      widget.title,
                      filteredRows as Record<string, unknown>[]
                    );
                  }}
                  aria-label={`Inspect underlying audit events for ${widget.title}`}
                  title="Inspect underlying live audit records"
                  className="rounded-sm p-1 text-[#526075] opacity-80 hover:bg-[#F4F6FA] hover:text-[#00338D] hover:opacity-100"
                >
                  <Eye size={14} weight="light" />
                </button>
              )}

            {canExport && visualMeta.renderer !== "slicer" && (
              <div ref={exportMenuRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportMenuOpen((prev) => !prev);
                  }}
                  aria-label={`Export ${widget.title}`}
                  title="Export chart or data"
                  className="rounded-sm p-1 text-[#526075] opacity-80 hover:bg-[#F4F6FA] hover:text-[#00338D] hover:opacity-100"
                >
                  <DownloadSimple size={14} weight="light" />
                </button>
                {exportMenuOpen && (
                  <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full z-40 mt-1 w-40 rounded-sm border border-[#D8DFE9] bg-white py-1 shadow-xl text-xs"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleExport("png")}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[#0C233C] hover:bg-[#F4F6FA]"
                    >
                      <ImageIcon size={13} weight="light" />
                      <span>Export PNG</span>
                    </button>
                    {visualMeta.renderer === "echarts" && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleExport("svg")}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[#0C233C] hover:bg-[#F4F6FA]"
                      >
                        <ImageIcon size={13} weight="light" />
                        <span>Export SVG</span>
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleExport("csv")}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[#0C233C] hover:bg-[#F4F6FA]"
                    >
                      <FileCsv size={13} weight="light" />
                      <span>Data CSV</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleExport("xlsx")}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[#0C233C] hover:bg-[#F4F6FA]"
                    >
                      <FileXls size={13} weight="light" />
                      <span>Data Excel (.xlsx)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {isEditMode && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(widget.id);
                  }}
                  aria-label={`Duplicate ${widget.title}`}
                  title="Duplicate visual"
                  className="rounded-sm p-1 text-[#526075] hover:bg-[#F4F6FA] hover:text-[#00338D]"
                >
                  <Copy size={13} weight="light" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(widget.id);
                  }}
                  aria-label={`Delete ${widget.title}`}
                  title="Remove visual"
                  className="rounded-sm p-1 text-[#526075] hover:bg-[#B91C1C]/10 hover:text-[#B91C1C]"
                >
                  <Trash size={13} weight="light" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        isEditMode && (
          <div className="absolute right-2 top-1.5 z-20 flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white/95 px-1 py-0.5 shadow-xs">
            {onStartMove && !isCompactStack && (
              <button
                type="button"
                aria-label={`Drag to move ${widget.title}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelect(widget.id);
                  onStartMove(widget.id, e);
                }}
                className="touch-none select-none cursor-grab p-0.5 text-[#526075] hover:text-[#00338D]"
              >
                <DotsSixVertical size={14} weight="bold" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(widget.id);
              }}
              aria-label={`Delete ${widget.title}`}
              className="p-0.5 text-[#526075] hover:text-[#B91C1C]"
            >
              <Trash size={13} weight="light" />
            </button>
          </div>
        )
      )}

      {/* Widget Visualization Body (overflow-hidden kept inside body so header export menu never clips!) */}
      <div
        className={`relative flex-1 min-h-0 overflow-hidden rounded-b-sm ${
          isSectionBanner ? "p-0" : "p-2.5"
        }`}
      >
        {restrictedReason && visualMeta.renderer !== "kpi_callout" ? (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4 text-center">
            <LockKey size={22} weight="light" className="text-[#526075]" />
            <p className="mt-2 max-w-[240px] text-xs font-medium text-[#333940]">
              {restrictedReason}
            </p>
          </div>
        ) : restrictedReason &&
          (widget.type === "kpi_card" || widget.type === "multi_kpi_card") ? (
          <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4 text-center">
            <LockKey size={20} weight="light" className="text-[#526075]" />
            <p className="mt-1.5 text-xs text-[#526075]">{restrictedReason}</p>
          </div>
        ) : visualMeta.renderer === "echarts" ? (
          <EChartSurface
            ref={echartRef}
            widget={widget}
            rows={filteredRows}
            onCrossFilterSelect={
              visualMeta.supportsCrossFilter && !isEditMode
                ? handleChartCrossFilter
                : undefined
            }
          />
        ) : visualMeta.renderer === "kpi_callout" ? (
          <KpiAndCalloutWidgets widget={widget} rows={filteredRows} />
        ) : visualMeta.renderer === "table_pivot" ? (
          <TableAndPivotWidgets
            widget={widget}
            rows={filteredRows}
            onCrossFilterSelect={
              !isEditMode ? handleChartCrossFilter : undefined
            }
            onInspectRow={
              !isEditMode
                ? (row: RawDataRow) => {
                    onDrillThrough(widget.title, [row as Record<string, unknown>]);
                  }
                : undefined
            }
          />
        ) : (
          <SlicerWidgets
            widget={widget}
            allDatasetRows={allDatasetRows}
            activeFilter={activeSlicerFilter}
            onApplyFilter={(f) => onApplySlicerFilter(widget.id, f)}
          />
        )}

        {showFieldDropCue && (
          <div className="pointer-events-none absolute inset-1 z-30 flex items-center justify-center rounded-sm border-2 border-dashed border-[#1E49E2] bg-[#1E49E2]/10 backdrop-blur-[1px]">
            <span className="rounded-sm bg-[#00338D] px-2.5 py-1 font-mono text-[11px] font-semibold text-white shadow-sm">
              Drop field to bind to {visualMeta.shortLabel}
            </span>
          </div>
        )}
      </div>

      {/* Edit Mode Resize Handles (East, South, South-East) */}
      {isEditMode && onStartResize && !isCompactStack && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize width"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(widget.id);
              onStartResize(widget.id, "e", e);
            }}
            className="touch-none select-none absolute right-0 top-8 bottom-3 z-20 w-1.5 cursor-ew-resize hover:bg-[#1E49E2]/40"
          />
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize height"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(widget.id);
              onStartResize(widget.id, "s", e);
            }}
            className="touch-none select-none absolute bottom-0 left-3 right-3 z-20 h-1.5 cursor-ns-resize hover:bg-[#1E49E2]/40"
          />
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize width and height"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(widget.id);
              onStartResize(widget.id, "se", e);
            }}
            className="touch-none select-none absolute bottom-0 right-0 z-30 h-3.5 w-3.5 cursor-nwse-resize"
          >
            <div className="absolute bottom-1 right-1 h-2 w-2 border-r-2 border-b-2 border-[#00338D]/60 group-hover:border-[#00338D]" />
          </div>
        </>
      )}
    </div>
  );
}
