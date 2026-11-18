"use client";

import { useMemo } from "react";
import { FunnelSimple, X } from "@phosphor-icons/react";
import { getFieldDef } from "@/lib/dashboards/catalog";
import {
  formatCellLabel,
  readRowField,
  toNumericValue,
} from "@/lib/dashboards/queryEngine";
import {
  CrossFilterItem,
  DashboardWidget,
  RawDataRow,
} from "@/lib/dashboards/types";

interface SlicerWidgetsProps {
  widget: DashboardWidget;
  allDatasetRows: RawDataRow[];
  activeFilter?: CrossFilterItem;
  onApplyFilter: (filter: CrossFilterItem | null) => void;
}

export function SlicerWidgets({
  widget,
  allDatasetRows,
  activeFilter,
  onApplyFilter,
}: SlicerWidgetsProps) {
  const binding = widget.encoding.slicerField;

  const distinctValues = useMemo(() => {
    if (!binding || widget.type !== "slicer_category") return [];
    const counts = new Map<string, number>();
    for (const r of allDatasetRows) {
      const lbl = formatCellLabel(r, binding, widget.datasetId);
      counts.set(lbl, (counts.get(lbl) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [allDatasetRows, binding, widget.datasetId, widget.type]);

  const numericBounds = useMemo(() => {
    if (!binding || widget.type !== "slicer_numeric") {
      return { min: 0, max: 0, hasValues: false };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const r of allDatasetRows) {
      const n = toNumericValue(readRowField(r, binding.field));
      if (n === null) continue;
      if (n < min) min = n;
      if (n > max) max = n;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 0, hasValues: false };
    }
    return { min, max, hasValues: true };
  }, [allDatasetRows, binding, widget.type]);

  if (!binding) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-3 text-center">
        <FunnelSimple size={20} weight="light" className="text-[#94A3B8]" />
        <p className="mt-1 text-xs text-[#526075]">
          Drag a field into Slicer Field to activate page filtering.
        </p>
      </div>
    );
  }

  const fieldLabel =
    binding.label ||
    getFieldDef(widget.datasetId, binding.field)?.label ||
    binding.field;

  // 1. Category Slicer
  if (widget.type === "slicer_category") {
    const selected = new Set((activeFilter?.values || []).map(String));
    const multi = widget.style.slicerMultiSelect !== false;
    const mode = widget.style.slicerStyle || "pills";

    const toggleVal = (val: string) => {
      const next = new Set(selected);
      if (next.has(val)) {
        next.delete(val);
      } else {
        if (!multi) next.clear();
        next.add(val);
      }
      if (next.size === 0) {
        onApplyFilter(null);
      } else {
        const arr = Array.from(next);
        onApplyFilter({
          sourceWidgetId: widget.id,
          datasetId: widget.datasetId,
          field: binding.field,
          operator: "in",
          values: arr,
          displayLabel: `${fieldLabel}: ${arr.slice(0, 2).join(", ")}${arr.length > 2 ? ` +${arr.length - 2}` : ""}`,
        });
      }
    };

    if (mode === "dropdown") {
      return (
        <div className="flex h-full flex-col justify-center gap-2">
          <div className="flex items-center justify-between text-[11px] text-[#526075]">
            <span className="font-mono font-semibold">{fieldLabel}</span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => onApplyFilter(null)}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#00338D] hover:underline"
              >
                <X size={10} weight="bold" />
                Reset ({selected.size})
              </button>
            )}
          </div>
          <select
            aria-label={`Filter by ${fieldLabel}`}
            value={Array.from(selected)[0] || ""}
            onChange={(e) => {
              if (!e.target.value) {
                onApplyFilter(null);
              } else {
                onApplyFilter({
                  sourceWidgetId: widget.id,
                  datasetId: widget.datasetId,
                  field: binding.field,
                  operator: "in",
                  values: [e.target.value],
                  displayLabel: `${fieldLabel}: ${e.target.value}`,
                });
              }
            }}
            className="w-full rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
          >
            <option value="">All ({distinctValues.length})</option>
            {distinctValues.map((item) => (
              <option key={item.value} value={item.value}>
                {item.value} ({item.count})
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-[#526075]">
          <span className="font-mono uppercase tracking-wider">{fieldLabel}</span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => onApplyFilter(null)}
              className="inline-flex items-center gap-0.5 font-semibold text-[#00338D] hover:underline"
            >
              <X size={10} weight="bold" />
              Clear ({selected.size})
            </button>
          )}
        </div>
        <div
          className={
            mode === "checklist"
              ? "flex-1 overflow-y-auto space-y-1 pr-1"
              : "flex-1 overflow-y-auto flex flex-wrap content-start gap-1.5 pr-1"
          }
        >
          {distinctValues.length === 0 ? (
            <span className="text-xs text-[#64748B]">No values in live dataset.</span>
          ) : (
            distinctValues.map((item) => {
              const isSelected = selected.has(item.value);
              if (mode === "checklist") {
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleVal(item.value)}
                    className={`flex w-full items-center justify-between rounded-sm border px-2 py-1 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-[#00338D] bg-[#00338D]/10 font-semibold text-[#00338D]"
                        : "border-[#D8DFE9] bg-white text-[#333940] hover:bg-[#F4F6FA]"
                    }`}
                  >
                    <span className="truncate">{item.value}</span>
                    <span className="ml-2 font-mono text-[10px] text-[#64748B]">
                      {item.count}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleVal(item.value)}
                  className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs transition-colors ${
                    isSelected
                      ? "border-[#00338D] bg-[#00338D] font-semibold text-white"
                      : "border-[#D8DFE9] bg-[#F8FAFC] text-[#333940] hover:border-[#00338D]"
                  }`}
                >
                  <span className="max-w-[140px] truncate">{item.value}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      isSelected ? "text-white/80" : "text-[#64748B]"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 2. Date Range Slicer (with automatic start <= end normalization)
  if (widget.type === "slicer_date") {
    const startVal = activeFilter?.startDate || "";
    const endVal = activeFilter?.endDate || "";

    const updateDates = (rawStart: string, rawEnd: string) => {
      if (!rawStart && !rawEnd) {
        onApplyFilter(null);
        return;
      }
      let nextStart = rawStart;
      let nextEnd = rawEnd;
      if (nextStart && nextEnd && nextStart > nextEnd) {
        [nextStart, nextEnd] = [nextEnd, nextStart];
      }
      onApplyFilter({
        sourceWidgetId: widget.id,
        datasetId: widget.datasetId,
        field: binding.field,
        operator: "date_range",
        startDate: nextStart || null,
        endDate: nextEnd || null,
        displayLabel: `${fieldLabel}: ${nextStart || "..."} to ${nextEnd || "..."}`,
      });
    };

    const formatLocalIsoDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const applyPresetDays = (days: number) => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      updateDates(formatLocalIsoDate(start), formatLocalIsoDate(end));
    };

    return (
      <div className="flex h-full flex-col justify-center gap-2">
        <div className="flex items-center justify-between text-[10px] text-[#526075]">
          <span className="font-mono uppercase tracking-wider">{fieldLabel}</span>
          {(startVal || endVal) && (
            <button
              type="button"
              onClick={() => onApplyFilter(null)}
              className="font-semibold text-[#00338D] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            aria-label={`${fieldLabel} start date`}
            max={endVal || undefined}
            value={startVal}
            onChange={(e) => updateDates(e.target.value, endVal)}
            className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
          />
          <input
            type="date"
            aria-label={`${fieldLabel} end date`}
            min={startVal || undefined}
            value={endVal}
            onChange={(e) => updateDates(startVal, e.target.value)}
            className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { label: "Last 7D", days: 7 },
            { label: "Last 30D", days: 30 },
            { label: "Last 90D", days: 90 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPresetDays(p.days)}
              className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[10px] font-medium text-[#333940] hover:border-[#00338D] hover:text-[#00338D]"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 3. Numeric Range Slicer (with finite & min <= max guards + epsilon reset)
  const curMin = activeFilter?.min ?? numericBounds.min;
  const curMax = activeFilter?.max ?? numericBounds.max;

  const updateRange = (rawMin: number | null, rawMax: number | null) => {
    const safeMin =
      rawMin !== null && Number.isFinite(rawMin) ? rawMin : null;
    const safeMax =
      rawMax !== null && Number.isFinite(rawMax) ? rawMax : null;

    let finalMin = safeMin;
    let finalMax = safeMax;
    if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
      [finalMin, finalMax] = [finalMax, finalMin];
    }

    const eps = Math.max(1e-9, (numericBounds.max - numericBounds.min) * 1e-4);
    if (
      (finalMin === null || finalMin <= numericBounds.min + eps) &&
      (finalMax === null || finalMax >= numericBounds.max - eps)
    ) {
      onApplyFilter(null);
      return;
    }

    onApplyFilter({
      sourceWidgetId: widget.id,
      datasetId: widget.datasetId,
      field: binding.field,
      operator: "range",
      min: finalMin,
      max: finalMax,
      displayLabel: `${fieldLabel}: ${finalMin ?? numericBounds.min} to ${finalMax ?? numericBounds.max}`,
    });
  };

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="flex items-center justify-between text-[10px] text-[#526075]">
        <span className="font-mono uppercase tracking-wider">{fieldLabel}</span>
        {activeFilter && (
          <button
            type="button"
            onClick={() => onApplyFilter(null)}
            className="font-semibold text-[#00338D] hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          aria-label={`${fieldLabel} minimum`}
          value={Number.isFinite(curMin) ? curMin : ""}
          onChange={(e) => {
            const parsed = e.target.value === "" ? null : Number(e.target.value);
            if (parsed !== null && !Number.isFinite(parsed)) return;
            updateRange(parsed, curMax);
          }}
          className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none tabular-nums"
        />
        <input
          type="number"
          aria-label={`${fieldLabel} maximum`}
          value={Number.isFinite(curMax) ? curMax : ""}
          onChange={(e) => {
            const parsed = e.target.value === "" ? null : Number(e.target.value);
            if (parsed !== null && !Number.isFinite(parsed)) return;
            updateRange(curMin, parsed);
          }}
          className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none tabular-nums"
        />
      </div>
      {numericBounds.hasValues && numericBounds.max > numericBounds.min && (
        <input
          type="range"
          aria-label={`${fieldLabel} upper bound slider`}
          min={numericBounds.min}
          max={numericBounds.max}
          step={(numericBounds.max - numericBounds.min) / 100 || 1}
          value={Math.min(numericBounds.max, Math.max(numericBounds.min, curMax))}
          onChange={(e) => updateRange(curMin, Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-[#00338D]"
        />
      )}
    </div>
  );
}
