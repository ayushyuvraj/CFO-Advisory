"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Hash,
  Minus,
  Target,
} from "@phosphor-icons/react";
import { getFieldDef } from "@/lib/dashboards/catalog";
import {
  arrayMinMax,
  buildCategoricalQuery,
  computeAggregation,
  evaluateConditionalColor,
  formatMetricValue,
  resolveNumberFormat,
} from "@/lib/dashboards/queryEngine";
import { DashboardWidget, RawDataRow } from "@/lib/dashboards/types";

interface KpiAndCalloutProps {
  widget: DashboardWidget;
  rows: RawDataRow[];
}

export function KpiAndCalloutWidgets({ widget, rows }: KpiAndCalloutProps) {
  const accent = widget.style.accentColor || "#00338D";

  // Precompute inline token values once for text_callout (eliminates double aggregation)
  const calloutMetrics = useMemo(() => {
    if (widget.type !== "text_callout") return [];
    const ys = widget.encoding.y || [];
    return ys.map((b) => {
      const def = getFieldDef(widget.datasetId, b.field);
      const val = rows.length > 0 ? computeAggregation(rows, b, widget.datasetId) : null;
      const fmt = resolveNumberFormat(
        b.format,
        widget.style.numberFormat,
        def?.defaultFormat
      );
      return {
        field: b.field,
        formatted: val !== null ? formatMetricValue(val, fmt) : "-",
      };
    });
  }, [widget, rows]);

  const resolvedText = useMemo(() => {
    if (widget.type !== "text_callout") return "";
    const template =
      widget.style.textContent ||
      "Select this box in Edit Mode to enter executive commentary. Reference dragged measures with {{1}}, {{2}}.";
    return template.replace(/\{\{(\d+)\}\}/g, (match, numStr) => {
      const idx = Number(numStr) - 1;
      const item = calloutMetrics[idx];
      return item ? item.formatted : match;
    });
  }, [widget.type, widget.style.textContent, calloutMetrics]);

  const sparkData = useMemo(() => {
    if (
      widget.type !== "kpi_card" ||
      !widget.encoding.x ||
      !widget.style.showSparkline ||
      rows.length === 0
    ) {
      return [];
    }
    const q = buildCategoricalQuery(rows, widget, false);
    return (q.series[0]?.values || []).slice(-24);
  }, [rows, widget]);

  // 1. Section Banner Header
  if (widget.type === "section_header") {
    return (
      <div
        className="flex h-full w-full items-center justify-between border-l-4 bg-[#F4F6FA] px-4 py-2"
        style={{ borderLeftColor: accent }}
      >
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold tracking-tight text-[#0C233C]">
            {widget.title}
          </h3>
          {widget.subtitle && (
            <p className="truncate text-xs text-[#526075]">{widget.subtitle}</p>
          )}
        </div>
        <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]">
          Executive Section
        </span>
      </div>
    );
  }

  // 2. Executive Narrative Callout Box
  if (widget.type === "text_callout") {
    return (
      <div
        className="flex h-full w-full flex-col justify-between overflow-y-auto rounded-sm border-l-3 bg-[#F8FAFC] p-3.5"
        style={{ borderLeftColor: accent }}
      >
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#0C233C]">
          {resolvedText}
        </p>
        {calloutMetrics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#D8DFE9] pt-2">
            {calloutMetrics.map((item, idx) => (
              <span
                key={`${item.field}-${idx}`}
                className="inline-flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-2 py-0.5 font-mono text-[10px] text-[#0C233C] tabular-nums"
              >
                <span className="text-[#526075]">{`{{${idx + 1}}}`}</span>
                <span className="font-bold text-[#00338D]">{item.formatted}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Multi-Metric KPI Scorecard
  if (widget.type === "multi_kpi_card") {
    const ys = widget.encoding.y || [];
    if (ys.length === 0) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-4 text-center">
          <Hash size={22} weight="light" className="text-[#94A3B8]" />
          <p className="mt-1.5 text-xs text-[#526075]">
            Drag 2 to 6 Measures into Scorecard Measures.
          </p>
        </div>
      );
    }

    return (
      <div
        className="grid h-full w-full gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${Math.min(ys.length, 6)}, minmax(0, 1fr))`,
        }}
      >
        {ys.slice(0, 6).map((b, idx) => {
          const def = getFieldDef(widget.datasetId, b.field);
          const agg = b.aggregation || def?.defaultAggregation || "sum";
          const val = rows.length > 0 ? computeAggregation(rows, b, widget.datasetId) : null;
          const condColor =
            val !== null
              ? evaluateConditionalColor(val, widget.style.conditionalRules)
              : null;
          const fmt = resolveNumberFormat(
            b.format,
            widget.style.numberFormat,
            def?.defaultFormat
          );
          const formatted = val !== null ? formatMetricValue(val, fmt) : "-";

          return (
            <div
              key={`${b.field}-${idx}`}
              className="flex flex-col justify-between rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3"
              style={
                condColor
                  ? { borderTopColor: condColor, borderTopWidth: 3 }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-medium text-[#526075]">
                  {b.label || def?.label || b.field}
                </span>
                <span className="shrink-0 rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#00338D]">
                  {agg}
                </span>
              </div>
              <p
                className="mt-2 truncate font-mono text-xl font-bold tracking-tight tabular-nums"
                style={{ color: condColor || "#0C233C" }}
              >
                {formatted}
              </p>
              <p className="mt-1 font-mono text-[10px] text-[#64748B] tabular-nums">
                {rows.length.toLocaleString()} live rows
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // 4. Single KPI Number Box
  const primary = widget.encoding.y?.[0];
  if (!primary) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-4 text-center">
        <Hash size={22} weight="light" className="text-[#94A3B8]" />
        <p className="mt-1.5 text-xs text-[#526075]">
          Drag a Measure into Value / Measure to populate this KPI Box.
        </p>
      </div>
    );
  }

  const def = getFieldDef(widget.datasetId, primary.field);
  const agg = primary.aggregation || def?.defaultAggregation || "sum";
  const fmt = resolveNumberFormat(
    primary.format,
    widget.style.numberFormat,
    def?.defaultFormat
  );
  const hasData = rows.length > 0;
  const value = hasData ? computeAggregation(rows, primary, widget.datasetId) : null;
  const condColor =
    value !== null
      ? evaluateConditionalColor(value, widget.style.conditionalRules)
      : null;
  const formatted = value !== null ? formatMetricValue(value, fmt) : "No Data";

  const target = widget.encoding.kpiTarget;
  const targetPct =
    value !== null && target !== null && target !== undefined && target !== 0
      ? ((value - target) / Math.abs(target)) * 100
      : null;

  // Accurate min-max scaling for visible sparkline bars (works for fractional USD < 1 and negatives!)
  const sparkBounds = arrayMinMax(sparkData);
  const sparkSpan = sparkBounds.max - sparkBounds.min;

  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-sm bg-[#F8FAFC]/60 p-3.5"
      style={
        condColor
          ? { borderLeft: `3px solid ${condColor}` }
          : { borderLeft: `3px solid ${accent}` }
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-wider text-[#526075]">
          {primary.label || def?.label || primary.field}
        </span>
        <span className="shrink-0 rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#00338D]">
          {agg}
        </span>
      </div>

      <div className="my-1 flex items-baseline justify-between gap-3">
        <p
          className={`truncate font-mono font-bold tracking-tight tabular-nums ${
            hasData ? "text-3xl" : "text-lg text-[#64748B]"
          }`}
          style={hasData ? { color: condColor || "#0C233C" } : undefined}
        >
          {formatted}
        </p>
        {targetPct !== null && (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
              targetPct > 0
                ? "bg-[#009A44]/10 text-[#009A44]"
                : targetPct < 0
                ? "bg-[#B91C1C]/10 text-[#B91C1C]"
                : "bg-[#F4F6FA] text-[#526075]"
            }`}
          >
            {targetPct > 0 ? (
              <ArrowUpRight size={13} weight="bold" />
            ) : targetPct < 0 ? (
              <ArrowDownRight size={13} weight="bold" />
            ) : (
              <Minus size={13} weight="bold" />
            )}
            {Math.abs(targetPct).toFixed(1)}%
          </span>
        )}
      </div>

      {sparkData.length > 1 && (
        <div
          className="mt-1 flex h-8 items-end gap-1"
          aria-label="Trend sparkline"
        >
          {sparkData.map((pt, i) => {
            const pctH =
              sparkSpan > 0
                ? Math.max(14, Math.round(((pt - sparkBounds.min) / sparkSpan) * 86) + 14)
                : 50;
            const isNeg = pt < 0;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-[1px] transition-all"
                style={{
                  height: `${pctH}%`,
                  backgroundColor: isNeg
                    ? "#B91C1C"
                    : i === sparkData.length - 1
                    ? condColor || accent
                    : "#CBD5E1",
                }}
              />
            );
          })}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-2 border-t border-[#D8DFE9]/70 pt-1.5 font-mono text-[10px] text-[#526075] tabular-nums">
        <span>{rows.length.toLocaleString()} live records</span>
        {target !== null && target !== undefined && (
          <span className="inline-flex items-center gap-1 text-[#00338D]">
            <Target size={11} weight="bold" />
            Target: {formatMetricValue(target, fmt)}
          </span>
        )}
      </div>
    </div>
  );
}
