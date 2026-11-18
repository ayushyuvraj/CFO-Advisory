"use client";

import { useId, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  PaintBrush,
  Plus,
  Sliders,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  getFieldDef,
  PALETTE_PRESETS,
  SEMANTIC_DATASETS,
  ShelfSlotId,
  ShelfSpec,
  VISUAL_CATALOG,
  VISUAL_CATALOG_MAP,
} from "@/lib/dashboards/catalog";
import {
  AggregationFn,
  ConditionalFormatRule,
  DashboardWidget,
  DatasetId,
  DateBucket,
  FieldBinding,
  LegendPosition,
  NumberFormatKind,
  PalettePresetId,
  ReferenceLineConfig,
  SortDirection,
  WidgetVisualType,
} from "@/lib/dashboards/types";

function nextInspectorId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface WidgetInspectorPanelProps {
  widget: DashboardWidget | null;
  onUpdateWidget: (updated: DashboardWidget) => void;
  onClose: () => void;
}

const AGGREGATIONS: { id: AggregationFn; label: string }[] = [
  { id: "sum", label: "Sum" },
  { id: "avg", label: "Average" },
  { id: "count", label: "Count" },
  { id: "count_distinct", label: "Distinct Count" },
  { id: "min", label: "Min" },
  { id: "max", label: "Max" },
  { id: "median", label: "Median" },
  { id: "pct_of_total", label: "% of Total" },
  { id: "running_total", label: "Running Total" },
];

const DATE_BUCKETS: { id: DateBucket; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "hour", label: "Hour" },
  { id: "minute", label: "Minute" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "raw", label: "Exact Timestamp" },
];

const NUMBER_FORMATS: { id: NumberFormatKind; label: string }[] = [
  { id: "auto", label: "Auto (Field Default)" },
  { id: "currency_usd", label: "Currency (USD $)" },
  { id: "integer", label: "Integer (1,234)" },
  { id: "decimal_2", label: "Decimal (12.34)" },
  { id: "percent", label: "Percentage (%)" },
  { id: "compact", label: "Compact (1.2K / M)" },
  { id: "duration_ms", label: "Duration (ms / s)" },
  { id: "tokens", label: "Tokens (K / M)" },
];

function ShelfDropZone({
  widget,
  shelf,
  bindings,
  onUpdateBinding,
  onRemoveBinding,
  onQuickBind,
}: {
  widget: DashboardWidget;
  shelf: ShelfSpec;
  bindings: FieldBinding[];
  onUpdateBinding: (index: number, next: FieldBinding) => void;
  onRemoveBinding: (index: number) => void;
  onQuickBind: (fieldKey: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `shelf-drop:${widget.id}:${shelf.id}`,
    data: { kind: "shelf-drop", widgetId: widget.id, shelfId: shelf.id },
  });

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const baseId = useId();
  const dataset = SEMANTIC_DATASETS.find((d) => d.id === widget.datasetId);
  const compatibleFields = (dataset?.fields || []).filter((f) =>
    shelf.accepts.includes(f.dataType)
  );

  return (
    <div
      ref={setNodeRef}
      data-shelf-drop={`${widget.id}:${shelf.id}`}
      className={`rounded-sm border p-2 transition-colors ${
        isOver
          ? "border-[#1E49E2] bg-[#1E49E2]/10"
          : "border-[#D8DFE9] bg-[#F8FAFC]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0C233C]">
          {shelf.label}
          {shelf.required && <span className="ml-0.5 text-[#B91C1C]">*</span>}
        </span>
        {(!bindings.length || shelf.multiple) && (
          <select
            aria-label={`Add field to ${shelf.label}`}
            value=""
            onChange={(e) => {
              if (e.target.value) onQuickBind(e.target.value);
            }}
            className="max-w-[115px] rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-0.5 text-[10px] text-[#00338D] focus:border-[#00338D] focus:outline-none"
          >
            <option value="">+ Field...</option>
            {compatibleFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {bindings.length === 0 ? (
        <div className="rounded-sm border border-dashed border-[#CBD5E1] bg-white/70 px-2 py-2 text-center text-[10px] text-[#64748B]">
          {shelf.hint}
        </div>
      ) : (
        <div className="space-y-1.5">
          {bindings.map((b, idx) => {
            const def = getFieldDef(widget.datasetId, b.field);
            const isExpanded = expandedIdx === idx;
            const isMeasureSlot =
              shelf.id === "y" ||
              shelf.id === "secondaryY" ||
              shelf.id === "values" ||
              shelf.id === "size";
            return (
              <div
                key={`${b.field}-${idx}`}
                className="rounded-sm border border-[#00338D]/30 bg-white"
              >
                <div className="flex items-center justify-between gap-1 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] font-semibold text-[#00338D]"
                  >
                    <span className="truncate">
                      {b.label || def?.label || b.field}
                    </span>
                    {isMeasureSlot && (
                      <span className="shrink-0 rounded-sm bg-[#009A44]/10 px-1 py-0.5 font-mono text-[9px] uppercase text-[#009A44]">
                        {b.aggregation || def?.defaultAggregation || "sum"}
                      </span>
                    )}
                    {def?.dataType === "datetime" && (
                      <span className="shrink-0 rounded-sm bg-[#7213EA]/10 px-1 py-0.5 font-mono text-[9px] uppercase text-[#7213EA]">
                        {b.dateBucket || "day"}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBinding(idx)}
                    aria-label={`Remove ${def?.label || b.field}`}
                    className="rounded-sm p-0.5 text-[#64748B] hover:bg-[#B91C1C]/10 hover:text-[#B91C1C]"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#EEF2F6] bg-[#F8FAFC] p-2 space-y-2 text-[11px]">
                    {isMeasureSlot && (
                      <div>
                        <label
                          htmlFor={`${baseId}-agg-${idx}`}
                          className="block font-mono text-[9px] uppercase text-[#526075]"
                        >
                          Aggregation
                        </label>
                        <select
                          id={`${baseId}-agg-${idx}`}
                          value={b.aggregation || def?.defaultAggregation || "sum"}
                          onChange={(e) =>
                            onUpdateBinding(idx, {
                              ...b,
                              aggregation: e.target.value as AggregationFn,
                            })
                          }
                          className="mt-0.5 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 text-[11px] text-[#0C233C]"
                        >
                          {AGGREGATIONS.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {def?.dataType === "datetime" && (
                      <div>
                        <label
                          htmlFor={`${baseId}-bucket-${idx}`}
                          className="block font-mono text-[9px] uppercase text-[#526075]"
                        >
                          Date Grouping
                        </label>
                        <select
                          id={`${baseId}-bucket-${idx}`}
                          value={b.dateBucket || "day"}
                          onChange={(e) =>
                            onUpdateBinding(idx, {
                              ...b,
                              dateBucket: e.target.value as DateBucket,
                            })
                          }
                          className="mt-0.5 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 text-[11px] text-[#0C233C]"
                        >
                          {DATE_BUCKETS.map((db) => (
                            <option key={db.id} value={db.id}>
                              {db.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isMeasureSlot && (
                      <div>
                        <label
                          htmlFor={`${baseId}-fmt-${idx}`}
                          className="block font-mono text-[9px] uppercase text-[#526075]"
                        >
                          Number Format
                        </label>
                        <select
                          id={`${baseId}-fmt-${idx}`}
                          value={b.format || "auto"}
                          onChange={(e) =>
                            onUpdateBinding(idx, {
                              ...b,
                              format: e.target.value as NumberFormatKind,
                            })
                          }
                          className="mt-0.5 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 text-[11px] text-[#0C233C]"
                        >
                          {NUMBER_FORMATS.map((nf) => (
                            <option key={nf.id} value={nf.id}>
                              {nf.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor={`${baseId}-lbl-${idx}`}
                        className="block font-mono text-[9px] uppercase text-[#526075]"
                      >
                        Display Label
                      </label>
                      <input
                        id={`${baseId}-lbl-${idx}`}
                        type="text"
                        value={b.label || ""}
                        placeholder={def?.label || b.field}
                        onChange={(e) =>
                          onUpdateBinding(idx, { ...b, label: e.target.value })
                        }
                        className="mt-0.5 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 text-[11px] text-[#0C233C]"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WidgetInspectorPanel({
  widget,
  onUpdateWidget,
  onClose,
}: WidgetInspectorPanelProps) {
  const [tab, setTab] = useState<"data" | "style">("data");

  if (!widget) {
    return (
      <aside className="flex h-full w-72 shrink-0 flex-col items-center justify-center border-l border-[#D8DFE9] bg-[#F8FAFC] p-6 text-center">
        <Sliders size={24} weight="light" className="text-[#94A3B8]" />
        <p className="mt-2 text-xs font-semibold text-[#0C233C]">
          No Visual Selected
        </p>
        <p className="mt-1 text-[11px] text-[#526075]">
          Click any widget on the canvas to configure data shelves, aggregations, thresholds, and formatting.
        </p>
      </aside>
    );
  }

  const meta = VISUAL_CATALOG_MAP[widget.type];

  const getShelfBindings = (shelfId: ShelfSlotId): FieldBinding[] => {
    const enc = widget.encoding;
    switch (shelfId) {
      case "x":
        return enc.x ? [enc.x] : [];
      case "y":
        return enc.y || [];
      case "secondaryY":
        return enc.secondaryY || [];
      case "series":
        return enc.series ? [enc.series] : [];
      case "size":
        return enc.size ? [enc.size] : [];
      case "source":
        return enc.source ? [enc.source] : [];
      case "target":
        return enc.target ? [enc.target] : [];
      case "hierarchy":
        return enc.hierarchy || [];
      case "rows":
        return enc.rows || [];
      case "columns":
        return enc.columns || [];
      case "values":
        return enc.values || [];
      case "slicerField":
        return enc.slicerField ? [enc.slicerField] : [];
      case "filters":
        return (enc.filters || []).map((f) => ({ field: f.field }));
      default:
        return [];
    }
  };

  const setShelfBindings = (shelfId: ShelfSlotId, next: FieldBinding[]) => {
    const enc = { ...widget.encoding };
    switch (shelfId) {
      case "x":
        enc.x = next[0] || null;
        break;
      case "y":
        enc.y = next;
        break;
      case "secondaryY":
        enc.secondaryY = next;
        break;
      case "series":
        enc.series = next[0] || null;
        break;
      case "size":
        enc.size = next[0] || null;
        break;
      case "source":
        enc.source = next[0] || null;
        break;
      case "target":
        enc.target = next[0] || null;
        break;
      case "hierarchy":
        enc.hierarchy = next;
        break;
      case "rows":
        enc.rows = next;
        break;
      case "columns":
        enc.columns = next;
        break;
      case "values":
        enc.values = next;
        break;
      case "slicerField":
        enc.slicerField = next[0] || null;
        break;
      case "filters":
        break;
    }
    onUpdateWidget({ ...widget, encoding: enc });
  };

  const handleQuickBind = (shelf: ShelfSpec, fieldKey: string) => {
    const def = getFieldDef(widget.datasetId, fieldKey);
    if (shelf.id === "filters") {
      onUpdateWidget({
        ...widget,
        encoding: {
          ...widget.encoding,
          filters: [
            ...widget.encoding.filters,
            {
              id: nextInspectorId("flt"),
              field: fieldKey,
              operator: "contains",
              values: [""],
            },
          ],
        },
      });
      return;
    }

    const newBinding: FieldBinding = {
      field: fieldKey,
      aggregation: def?.defaultAggregation,
      dateBucket: def?.dataType === "datetime" ? "day" : undefined,
      format: "auto",
    };

    const current = getShelfBindings(shelf.id);
    const updated = shelf.multiple ? [...current, newBinding] : [newBinding];
    setShelfBindings(shelf.id, updated);
  };

  const addReferenceLine = () => {
    const next: ReferenceLineConfig = {
      id: nextInspectorId("rl"),
      label: "Target",
      value: 0,
      color: "#B91C1C",
      dashed: true,
    };
    onUpdateWidget({
      ...widget,
      style: {
        ...widget.style,
        referenceLines: [...widget.style.referenceLines, next],
      },
    });
  };

  const addConditionalRule = () => {
    const next: ConditionalFormatRule = {
      id: nextInspectorId("cf"),
      operator: "gte",
      value: 0,
      color: "#009A44",
    };
    onUpdateWidget({
      ...widget,
      style: {
        ...widget.style,
        conditionalRules: [...widget.style.conditionalRules, next],
      },
    });
  };

  return (
    <aside className="flex h-full w-76 shrink-0 flex-col border-l border-[#D8DFE9] bg-white">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00338D]">
            Visual Inspector
          </p>
          <p className="truncate text-xs font-semibold text-[#0C233C]">
            {meta.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Deselect visual"
          className="rounded-sm p-1 text-[#526075] hover:bg-[#E2E8F0] hover:text-[#0C233C]"
        >
          <X size={15} weight="bold" />
        </button>
      </div>

      {/* Sub-tabs */}
      <div
        role="tablist"
        aria-label="Visual inspector tabs"
        className="grid grid-cols-2 border-b border-[#D8DFE9] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "data"}
          onClick={() => setTab("data")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs font-semibold ${
            tab === "data"
              ? "bg-[#00338D] text-white"
              : "text-[#526075] hover:bg-[#F4F6FA]"
          }`}
        >
          <Sliders size={13} weight="light" />
          <span>Data & Shelves</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "style"}
          onClick={() => setTab("style")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs font-semibold ${
            tab === "style"
              ? "bg-[#00338D] text-white"
              : "text-[#526075] hover:bg-[#F4F6FA]"
          }`}
        >
          <PaintBrush size={13} weight="light" />
          <span>Format & Rules</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {tab === "data" ? (
          <>
            {/* Visual Type Hot-Swapper */}
            <div>
              <label
                htmlFor="inspector-visual-type"
                className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]"
              >
                Chart / Visual Type
              </label>
              <select
                id="inspector-visual-type"
                value={widget.type}
                onChange={(e) => {
                  const nextType = e.target.value as WidgetVisualType;
                  const nextMeta = VISUAL_CATALOG_MAP[nextType];
                  onUpdateWidget({
                    ...widget,
                    type: nextType,
                    title:
                      widget.title === meta.label ? nextMeta.label : widget.title,
                  });
                }}
                className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1.5 text-xs font-semibold text-[#0C233C] focus:border-[#00338D] focus:outline-none"
              >
                {VISUAL_CATALOG.map((v) => (
                  <option key={v.type} value={v.type}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dataset Selector */}
            <div>
              <label
                htmlFor="inspector-dataset"
                className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]"
              >
                Bound Live Dataset
              </label>
              <select
                id="inspector-dataset"
                value={widget.datasetId}
                onChange={(e) =>
                  onUpdateWidget({
                    ...widget,
                    datasetId: e.target.value as DatasetId,
                    encoding: {
                      ...widget.encoding,
                      x: null,
                      y: [],
                      secondaryY: [],
                      series: null,
                      size: null,
                      source: null,
                      target: null,
                      hierarchy: [],
                      rows: [],
                      columns: [],
                      values: [],
                      slicerField: null,
                      filters: [],
                    },
                  })
                }
                className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1.5 text-xs font-semibold text-[#0C233C] focus:border-[#00338D] focus:outline-none"
              >
                {SEMANTIC_DATASETS.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Encoding Shelves */}
            <div className="space-y-2">
              {meta.shelves
                .filter((s) => s.id !== "filters")
                .map((shelf) => {
                  const current = getShelfBindings(shelf.id);
                  return (
                    <ShelfDropZone
                      key={`${widget.id}-${shelf.id}`}
                      widget={widget}
                      shelf={shelf}
                      bindings={current}
                      onQuickBind={(fieldKey) => handleQuickBind(shelf, fieldKey)}
                      onUpdateBinding={(idx, nextB) => {
                        const copy = [...current];
                        copy[idx] = nextB;
                        setShelfBindings(shelf.id, copy);
                      }}
                      onRemoveBinding={(idx) => {
                        const copy = current.filter((_, i) => i !== idx);
                        setShelfBindings(shelf.id, copy);
                      }}
                    />
                  );
                })}
            </div>

            {/* Target Value for KPI / Gauge / Bullet */}
            {meta.supportsTargetValue && (
              <div>
                <label
                  htmlFor="inspector-target-val"
                  className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]"
                >
                  Target / Benchmark Value
                </label>
                <input
                  id="inspector-target-val"
                  type="number"
                  step="any"
                  value={widget.encoding.kpiTarget ?? ""}
                  placeholder="Optional numeric goal"
                  onChange={(e) =>
                    onUpdateWidget({
                      ...widget,
                      encoding: {
                        ...widget.encoding,
                        kpiTarget:
                          e.target.value === "" ? null : Number(e.target.value),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                />
              </div>
            )}

            {/* Sorting & Top-N */}
            {meta.renderer === "echarts" && (
              <div className="grid grid-cols-2 gap-2 border-t border-[#EEF2F6] pt-3">
                <div>
                  <label
                    htmlFor="inspector-sort"
                    className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
                  >
                    Sort Order
                  </label>
                  <select
                    id="inspector-sort"
                    value={widget.encoding.sort || "none"}
                    onChange={(e) =>
                      onUpdateWidget({
                        ...widget,
                        encoding: {
                          ...widget.encoding,
                          sort: e.target.value as SortDirection,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 text-[11px] text-[#0C233C]"
                  >
                    <option value="none">Default</option>
                    <option value="value_desc">Value Desc</option>
                    <option value="value_asc">Value Asc</option>
                    <option value="label_asc">Label A-Z</option>
                    <option value="label_desc">Label Z-A</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="inspector-topn"
                    className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
                  >
                    Top N Limit
                  </label>
                  <input
                    id="inspector-topn"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="All"
                    value={widget.encoding.topN ?? ""}
                    onChange={(e) =>
                      onUpdateWidget({
                        ...widget,
                        encoding: {
                          ...widget.encoding,
                          topN:
                            e.target.value === ""
                              ? null
                              : Math.max(1, Number(e.target.value)),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-[11px] text-[#0C233C]"
                  />
                </div>
              </div>
            )}

            {/* Static Widget Filter Builder */}
            {meta.shelves.some((s) => s.id === "filters") && (
              <div className="border-t border-[#EEF2F6] pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#526075]">
                    Widget Filters ({widget.encoding.filters.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const firstField =
                        SEMANTIC_DATASETS.find((d) => d.id === widget.datasetId)
                          ?.fields[0]?.key || "action_status";
                      onUpdateWidget({
                        ...widget,
                        encoding: {
                          ...widget.encoding,
                          filters: [
                            ...widget.encoding.filters,
                            {
                              id: nextInspectorId("flt"),
                              field: firstField,
                              operator: "contains",
                              values: [""],
                            },
                          ],
                        },
                      });
                    }}
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#00338D] hover:underline"
                  >
                    <Plus size={11} weight="bold" />
                    Add Filter
                  </button>
                </div>

                {widget.encoding.filters.map((flt, idx) => (
                  <div
                    key={flt.id}
                    className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-2 space-y-1.5"
                  >
                    <div className="flex items-center gap-1">
                      <select
                        aria-label="Filter field"
                        value={flt.field}
                        onChange={(e) => {
                          const next = [...widget.encoding.filters];
                          next[idx] = { ...flt, field: e.target.value };
                          onUpdateWidget({
                            ...widget,
                            encoding: { ...widget.encoding, filters: next },
                          });
                        }}
                        className="flex-1 rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-1 text-[10px]"
                      >
                        {(
                          SEMANTIC_DATASETS.find((d) => d.id === widget.datasetId)
                            ?.fields || []
                        ).map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label="Delete filter"
                        onClick={() => {
                          const next = widget.encoding.filters.filter(
                            (_, i) => i !== idx
                          );
                          onUpdateWidget({
                            ...widget,
                            encoding: { ...widget.encoding, filters: next },
                          });
                        }}
                        className="p-1 text-[#64748B] hover:text-[#B91C1C]"
                      >
                        <Trash size={12} weight="light" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <select
                        aria-label="Filter operator"
                        value={flt.operator}
                        onChange={(e) => {
                          const next = [...widget.encoding.filters];
                          next[idx] = {
                            ...flt,
                            operator: e.target.value as typeof flt.operator,
                          };
                          onUpdateWidget({
                            ...widget,
                            encoding: { ...widget.encoding, filters: next },
                          });
                        }}
                        className="rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-1 text-[10px]"
                      >
                        <option value="contains">Contains</option>
                        <option value="eq">Equals</option>
                        <option value="neq">Not Equals</option>
                        <option value="gt">&gt;</option>
                        <option value="gte">&gt;=</option>
                        <option value="lt">&lt;</option>
                        <option value="lte">&lt;=</option>
                      </select>
                      <input
                        type="text"
                        aria-label="Filter value"
                        value={String(flt.values[0] ?? "")}
                        placeholder="Value..."
                        onChange={(e) => {
                          const next = [...widget.encoding.filters];
                          next[idx] = { ...flt, values: [e.target.value] };
                          onUpdateWidget({
                            ...widget,
                            encoding: { ...widget.encoding, filters: next },
                          });
                        }}
                        className="rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-1 text-[10px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* FORMAT & ANALYTICS TAB */
          <div className="space-y-3">
            <div>
              <label
                htmlFor="style-title"
                className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
              >
                Visual Title
              </label>
              <input
                id="style-title"
                type="text"
                value={widget.title}
                onChange={(e) =>
                  onUpdateWidget({ ...widget, title: e.target.value })
                }
                className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="style-subtitle"
                className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
              >
                Subtitle / Footnote
              </label>
              <input
                id="style-subtitle"
                type="text"
                value={widget.subtitle || ""}
                onChange={(e) =>
                  onUpdateWidget({ ...widget, subtitle: e.target.value })
                }
                placeholder="Optional explanatory note"
                className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
              />
            </div>

            {widget.type === "text_callout" && (
              <div>
                <label
                  htmlFor="style-narrative"
                  className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
                >
                  Executive Narrative (Use {"{{1}}"}, {"{{2}}"})
                </label>
                <textarea
                  id="style-narrative"
                  rows={4}
                  value={widget.style.textContent || ""}
                  onChange={(e) =>
                    onUpdateWidget({
                      ...widget,
                      style: { ...widget.style, textContent: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white p-2 text-xs text-[#0C233C]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="style-palette"
                className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
              >
                Color Palette
              </label>
              <select
                id="style-palette"
                value={widget.style.palette}
                onChange={(e) =>
                  onUpdateWidget({
                    ...widget,
                    style: {
                      ...widget.style,
                      palette: e.target.value as PalettePresetId,
                    },
                  })
                }
                className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1.5 text-xs text-[#0C233C]"
              >
                {Object.entries(PALETTE_PRESETS).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex gap-1">
                {PALETTE_PRESETS[widget.style.palette].colors.map((hex, idx) => (
                  <span
                    key={`${widget.style.palette}-${idx}`}
                    className="h-3 flex-1 rounded-[2px]"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="style-format"
                className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
              >
                Default Number Format
              </label>
              <select
                id="style-format"
                value={widget.style.numberFormat}
                onChange={(e) =>
                  onUpdateWidget({
                    ...widget,
                    style: {
                      ...widget.style,
                      numberFormat: e.target.value as NumberFormatKind,
                    },
                  })
                }
                className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1.5 text-xs text-[#0C233C]"
              >
                {NUMBER_FORMATS.map((nf) => (
                  <option key={nf.id} value={nf.id}>
                    {nf.label}
                  </option>
                ))}
              </select>
            </div>

            {meta.renderer === "echarts" && (
              <div>
                <label
                  htmlFor="style-legend"
                  className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
                >
                  Legend Position
                </label>
                <select
                  id="style-legend"
                  value={widget.style.showLegend ? widget.style.legendPosition : "none"}
                  onChange={(e) => {
                    const pos = e.target.value as LegendPosition;
                    onUpdateWidget({
                      ...widget,
                      style: {
                        ...widget.style,
                        showLegend: pos !== "none",
                        legendPosition: pos,
                      },
                    });
                  }}
                  className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1.5 text-xs text-[#0C233C]"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="none">Hidden</option>
                </select>
              </div>
            )}

            {widget.type === "slicer_category" && (
              <div>
                <label
                  htmlFor="style-slicer-mode"
                  className="block font-mono text-[10px] font-semibold uppercase text-[#526075]"
                >
                  Slicer Presentation
                </label>
                <select
                  id="style-slicer-mode"
                  value={widget.style.slicerStyle || "pills"}
                  onChange={(e) =>
                    onUpdateWidget({
                      ...widget,
                      style: {
                        ...widget.style,
                        slicerStyle: e.target.value as "pills" | "checklist" | "dropdown",
                      },
                    })
                  }
                  className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1.5 text-xs text-[#0C233C]"
                >
                  <option value="pills">Interactive Tile Pills</option>
                  <option value="checklist">Vertical Checklist</option>
                  <option value="dropdown">Compact Dropdown</option>
                </select>
              </div>
            )}

            {/* Accessible Switch Toggles */}
            <div className="space-y-2 border-t border-[#EEF2F6] pt-3">
              {[
                {
                  key: "showLabels" as const,
                  label: "Show Data Labels",
                  show: meta.renderer === "echarts",
                },
                {
                  key: "showGridlines" as const,
                  label: "Show Gridlines",
                  show: meta.renderer === "echarts",
                },
                {
                  key: "showTrendline" as const,
                  label: "Linear Regression Trendline",
                  show: widget.type === "scatter" || widget.type === "bubble",
                },
                {
                  key: "showSparkline" as const,
                  label: "Show Inline Sparkline",
                  show: widget.type === "kpi_card",
                },
                {
                  key: "showDataBars" as const,
                  label: "Inline Conditional Data Bars",
                  show: widget.type === "data_table",
                },
                {
                  key: "showColorScale" as const,
                  label: "Matrix Heatmap Shading",
                  show: widget.type === "pivot_matrix",
                },
              ]
                .filter((t) => t.show)
                .map((toggle) => {
                  const checked = Boolean(widget.style[toggle.key]);
                  return (
                    <div
                      key={toggle.key}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-[#333940]">{toggle.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        aria-label={toggle.label}
                        onClick={() =>
                          onUpdateWidget({
                            ...widget,
                            style: { ...widget.style, [toggle.key]: !checked },
                          })
                        }
                        className={`relative inline-flex h-5 w-9 items-center rounded-sm transition-colors ${
                          checked ? "bg-[#00338D]" : "bg-[#CBD5E1]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-xs bg-white transition-transform ${
                            checked ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Reference / Target Lines */}
            {meta.renderer === "echarts" && (
              <div className="border-t border-[#EEF2F6] pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#526075]">
                    Reference Lines ({widget.style.referenceLines.length})
                  </span>
                  <button
                    type="button"
                    onClick={addReferenceLine}
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#00338D] hover:underline"
                  >
                    <Plus size={11} weight="bold" />
                    Add Line
                  </button>
                </div>
                {widget.style.referenceLines.map((rl, idx) => (
                  <div
                    key={rl.id}
                    className="grid grid-cols-[1fr_72px_24px] items-center gap-1 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-1.5"
                  >
                    <input
                      type="text"
                      aria-label="Reference line label"
                      value={rl.label}
                      onChange={(e) => {
                        const next = [...widget.style.referenceLines];
                        next[idx] = { ...rl, label: e.target.value };
                        onUpdateWidget({
                          ...widget,
                          style: { ...widget.style, referenceLines: next },
                        });
                      }}
                      className="rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-0.5 text-[10px]"
                    />
                    <input
                      type="number"
                      aria-label="Reference line value"
                      value={rl.value}
                      onChange={(e) => {
                        const next = [...widget.style.referenceLines];
                        next[idx] = { ...rl, value: Number(e.target.value) };
                        onUpdateWidget({
                          ...widget,
                          style: { ...widget.style, referenceLines: next },
                        });
                      }}
                      className="rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-0.5 font-mono text-[10px]"
                    />
                    <button
                      type="button"
                      aria-label="Remove reference line"
                      onClick={() => {
                        const next = widget.style.referenceLines.filter(
                          (_, i) => i !== idx
                        );
                        onUpdateWidget({
                          ...widget,
                          style: { ...widget.style, referenceLines: next },
                        });
                      }}
                      className="p-0.5 text-[#64748B] hover:text-[#B91C1C]"
                    >
                      <Trash size={12} weight="light" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Conditional Formatting Rules (KPI / Gauge) */}
            {(widget.type === "kpi_card" ||
              widget.type === "multi_kpi_card" ||
              widget.type.startsWith("gauge") ||
              widget.type === "progress_ring") && (
              <div className="border-t border-[#EEF2F6] pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#526075]">
                    Conditional Color Rules ({widget.style.conditionalRules.length})
                  </span>
                  <button
                    type="button"
                    onClick={addConditionalRule}
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#00338D] hover:underline"
                  >
                    <Plus size={11} weight="bold" />
                    Add Rule
                  </button>
                </div>
                {widget.style.conditionalRules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="grid grid-cols-[54px_1fr_54px_22px] items-center gap-1 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-1.5"
                  >
                    <select
                      aria-label="Rule operator"
                      value={rule.operator}
                      onChange={(e) => {
                        const next = [...widget.style.conditionalRules];
                        next[idx] = {
                          ...rule,
                          operator: e.target.value as ConditionalFormatRule["operator"],
                        };
                        onUpdateWidget({
                          ...widget,
                          style: { ...widget.style, conditionalRules: next },
                        });
                      }}
                      className="rounded-sm border border-[#D8DFE9] bg-white px-1 py-0.5 font-mono text-[10px]"
                    >
                      <option value="gt">&gt;</option>
                      <option value="gte">&gt;=</option>
                      <option value="lt">&lt;</option>
                      <option value="lte">&lt;=</option>
                      <option value="eq">=</option>
                    </select>
                    <input
                      type="number"
                      aria-label="Threshold value"
                      value={rule.value}
                      onChange={(e) => {
                        const next = [...widget.style.conditionalRules];
                        next[idx] = { ...rule, value: Number(e.target.value) };
                        onUpdateWidget({
                          ...widget,
                          style: { ...widget.style, conditionalRules: next },
                        });
                      }}
                      className="rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-0.5 font-mono text-[10px]"
                    />
                    <select
                      aria-label="Status color"
                      value={rule.color}
                      onChange={(e) => {
                        const next = [...widget.style.conditionalRules];
                        next[idx] = { ...rule, color: e.target.value };
                        onUpdateWidget({
                          ...widget,
                          style: { ...widget.style, conditionalRules: next },
                        });
                      }}
                      className="rounded-sm border border-[#D8DFE9] bg-white px-1 py-0.5 text-[10px]"
                    >
                      <option value="#009A44">Green</option>
                      <option value="#D97706">Amber</option>
                      <option value="#B91C1C">Red</option>
                      <option value="#00338D">Blue</option>
                    </select>
                    <button
                      type="button"
                      aria-label="Remove rule"
                      onClick={() => {
                        const next = widget.style.conditionalRules.filter(
                          (_, i) => i !== idx
                        );
                        onUpdateWidget({
                          ...widget,
                          style: { ...widget.style, conditionalRules: next },
                        });
                      }}
                      className="p-0.5 text-[#64748B] hover:text-[#B91C1C]"
                    >
                      <Trash size={12} weight="light" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
