import type { EChartsOption } from "echarts";
import { getFieldDef, PALETTE_PRESETS } from "./catalog";
import {
  arrayMinMax,
  buildBoxplotData,
  buildCandlestickData,
  buildCategoricalQuery,
  buildHeatmapData,
  buildHierarchyTree,
  buildHistogramData,
  buildSankeyData,
  computeAggregation,
  evaluateConditionalColor,
  formatBucketDate,
  formatCellLabel,
  formatMetricValue,
  readRowField,
  resolveNumberFormat,
  toNumericValue,
} from "./queryEngine";
import { DashboardWidget, NumberFormatKind, RawDataRow } from "./types";

const FONT_SANS = "var(--font-geist-sans), 'Inter', system-ui, sans-serif";
const FONT_MONO = "var(--font-geist-mono), monospace";
const BORDER_COLOR = "#D8DFE9";
const INK_DARK = "#0C233C";
const INK_MUTED = "#526075";

export function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface CompiledEChartResult {
  option: EChartsOption | null;
  emptyReason?: string;
  crossFilterField?: string;
}

function buildLegendConfig(widget: DashboardWidget): Record<string, unknown> {
  if (!widget.style.showLegend || widget.style.legendPosition === "none") {
    return { show: false };
  }
  const base: Record<string, unknown> = {
    show: true,
    type: "scroll",
    textStyle: {
      color: INK_MUTED,
      fontSize: 11,
      fontFamily: FONT_SANS,
    },
    itemWidth: 10,
    itemHeight: 10,
  };
  switch (widget.style.legendPosition) {
    case "bottom":
      return { ...base, bottom: 2, left: "center" };
    case "left":
      return { ...base, left: 4, top: "middle", orient: "vertical" };
    case "right":
      return { ...base, right: 4, top: "middle", orient: "vertical" };
    case "top":
    default:
      return { ...base, top: 2, left: "center" };
  }
}

function buildGridConfig(
  widget: DashboardWidget,
  hasRightAxis = false
): Record<string, unknown> {
  const legendPos = widget.style.showLegend ? widget.style.legendPosition : "none";
  return {
    top: legendPos === "top" ? 34 : 18,
    bottom: legendPos === "bottom" ? 40 : 28,
    left: legendPos === "left" ? 110 : 16,
    right: legendPos === "right" ? 110 : hasRightAxis ? 20 : 18,
    containLabel: true,
  };
}

function buildMarkLine(
  widget: DashboardWidget,
  isHorizontal = false
): Record<string, unknown> | undefined {
  if (!widget.style.referenceLines || widget.style.referenceLines.length === 0) {
    return undefined;
  }
  return {
    symbol: "none",
    silent: true,
    data: widget.style.referenceLines.map((rl) => ({
      name: rl.label,
      ...(isHorizontal ? { xAxis: rl.value } : { yAxis: rl.value }),
      lineStyle: {
        color: rl.color || "#B91C1C",
        width: 1.5,
        type: rl.dashed === false ? "solid" : "dashed",
      },
      label: {
        formatter: `${rl.label}: ${rl.value}`,
        color: rl.color || "#B91C1C",
        fontFamily: FONT_MONO,
        fontSize: 10,
      },
    })),
  };
}

function buildFormattedAxisTooltip(
  baseTooltip: Record<string, unknown>,
  seriesFormats: Record<string, NumberFormatKind>,
  fallbackFormat: NumberFormatKind,
  pointerType: "shadow" | "line" | "cross" = "shadow"
): Record<string, unknown> {
  return {
    ...baseTooltip,
    trigger: "axis",
    axisPointer: { type: pointerType },
    formatter: (params: unknown) => {
      const items = (Array.isArray(params) ? params : [params]) as {
        axisValueLabel?: string;
        axisValue?: string | number;
        seriesName?: string;
        value?: number | { value?: number };
        marker?: string;
      }[];
      if (items.length === 0) return "";
      const header = escapeHtml(
        items[0].axisValueLabel ?? items[0].axisValue ?? ""
      );
      const rowsHtml = items
        .map((it) => {
          const rawVal =
            typeof it.value === "object" && it.value !== null
              ? it.value.value
              : it.value;
          if (rawVal === undefined || rawVal === null) return "";
          const fmt =
            (it.seriesName && seriesFormats[it.seriesName]) || fallbackFormat;
          const num = Number(rawVal);
          const display = Number.isFinite(num)
            ? formatMetricValue(num, fmt)
            : escapeHtml(rawVal);
          return `<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:2px;"><span>${it.marker || ""}${escapeHtml(it.seriesName || "")}</span><strong style="font-family:${FONT_MONO}">${escapeHtml(display)}</strong></div>`;
        })
        .filter(Boolean)
        .join("");
      return `<div><strong style="color:${INK_DARK}">${header}</strong>${rowsHtml}</div>`;
    },
  };
}

export function compileWidgetToEChartsOption(
  widget: DashboardWidget,
  rows: RawDataRow[]
): CompiledEChartResult {
  const colors =
    PALETTE_PRESETS[widget.style.palette]?.colors ||
    PALETTE_PRESETS.kpmg_institutional.colors;

  if (rows.length === 0) {
    return {
      option: null,
      emptyReason: "No live records match the current filters for this dataset.",
    };
  }

  const baseTooltip = {
    backgroundColor: "#FFFFFF",
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    textStyle: {
      color: INK_DARK,
      fontSize: 12,
      fontFamily: FONT_SANS,
    },
    extraCssText:
      "box-shadow: 0 8px 24px rgba(12, 35, 60, 0.12); border-radius: 4px;",
  };

  const yFirst = widget.encoding.y?.[0];
  const yDef = yFirst ? getFieldDef(widget.datasetId, yFirst.field) : undefined;
  const primaryFmt = resolveNumberFormat(
    yFirst?.format,
    widget.style.numberFormat,
    yDef?.defaultFormat
  );

  // ------------------------------------------------------------------
  // 1. GAUGES & PROGRESS RINGS
  // ------------------------------------------------------------------
  if (
    widget.type === "gauge_radial" ||
    widget.type === "gauge_arc" ||
    widget.type === "progress_ring"
  ) {
    if (!yFirst) {
      return {
        option: null,
        emptyReason: "Drag a Measure into Value / Measure to render this gauge.",
      };
    }
    const rawVal = computeAggregation(rows, yFirst, widget.datasetId);
    const hasExplicitTarget =
      widget.encoding.kpiTarget !== null &&
      widget.encoding.kpiTarget !== undefined &&
      Number.isFinite(widget.encoding.kpiTarget);
    const explicitTarget = hasExplicitTarget ? widget.encoding.kpiTarget! : null;

    const minScale = Math.min(0, rawVal, explicitTarget ?? 0);
    let maxScale =
      explicitTarget !== null
        ? Math.max(explicitTarget, rawVal)
        : rawVal > 0
        ? rawVal * 1.25
        : rawVal < 0
        ? 0
        : 100;
    if (maxScale <= minScale) {
      maxScale = minScale + (Math.abs(rawVal) > 0 ? Math.abs(rawVal) * 0.25 : 100);
    }

    const condColor = evaluateConditionalColor(rawVal, widget.style.conditionalRules);
    const gaugeColor = condColor || colors[0];
    const formatted = formatMetricValue(rawVal, primaryFmt);
    const fieldTitle = yFirst.label || yDef?.label || yFirst.field;

    if (widget.type === "progress_ring") {
      const denom =
        explicitTarget !== null && explicitTarget !== 0
          ? explicitTarget
          : maxScale !== 0
          ? maxScale
          : 100;
      const truePct = (rawVal / Math.abs(denom)) * 100;
      const clampedRingPct = Math.min(100, Math.max(0, truePct));
      return {
        option: {
          color: [gaugeColor],
          tooltip: {
            ...baseTooltip,
            formatter: () =>
              `<strong>${escapeHtml(fieldTitle)}</strong><br/>Actual: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatted)}</span><br/>Target: ${escapeHtml(formatMetricValue(denom, primaryFmt))} (${escapeHtml(truePct.toFixed(1))}%)`,
          },
          series: [
            {
              type: "gauge",
              startAngle: 90,
              endAngle: -270,
              radius: "86%",
              pointer: { show: false },
              progress: {
                show: true,
                overlap: false,
                roundCap: false,
                clip: false,
                itemStyle: { color: gaugeColor },
              },
              axisLine: {
                lineStyle: { width: 14, color: [[1, "#E8EEF5"]] },
              },
              splitLine: { show: false },
              axisTick: { show: false },
              axisLabel: { show: false },
              data: [{ value: Number(clampedRingPct.toFixed(1)), name: fieldTitle }],
              title: {
                fontSize: 11,
                color: INK_MUTED,
                fontFamily: FONT_SANS,
                offsetCenter: [0, "26%"],
              },
              detail: {
                fontSize: 20,
                fontWeight: 700,
                fontFamily: FONT_MONO,
                color: INK_DARK,
                offsetCenter: [0, "-6%"],
                formatter: () => formatted,
              },
            },
          ],
        },
      };
    }

    const isArc = widget.type === "gauge_arc";
    return {
      option: {
        color: [gaugeColor],
        tooltip: {
          ...baseTooltip,
          formatter: () =>
            `<strong>${escapeHtml(fieldTitle)}</strong><br/>Value: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatted)}</span><br/>Scale: ${escapeHtml(formatMetricValue(minScale, primaryFmt))} to ${escapeHtml(formatMetricValue(maxScale, primaryFmt))}`,
        },
        series: [
          {
            type: "gauge",
            startAngle: isArc ? 180 : 210,
            endAngle: isArc ? 0 : -30,
            center: isArc ? ["50%", "72%"] : ["50%", "56%"],
            radius: isArc ? "105%" : "86%",
            min: minScale,
            max: maxScale,
            progress: {
              show: true,
              width: 12,
              itemStyle: { color: gaugeColor },
            },
            pointer: {
              show: !isArc,
              length: "58%",
              width: 4,
              itemStyle: { color: INK_DARK },
            },
            axisLine: {
              lineStyle: {
                width: 12,
                color: [
                  [0.5, "#E8EEF5"],
                  [0.8, "#D8DFE9"],
                  [1, "#CBD5E1"],
                ],
              },
            },
            axisTick: {
              show: !isArc,
              distance: -18,
              length: 4,
              lineStyle: { color: INK_MUTED },
            },
            splitLine: {
              show: !isArc,
              distance: -20,
              length: 8,
              lineStyle: { color: INK_MUTED },
            },
            axisLabel: { show: false },
            title: {
              show: true,
              offsetCenter: [0, isArc ? "18%" : "68%"],
              fontSize: 11,
              color: INK_MUTED,
              fontFamily: FONT_SANS,
            },
            detail: {
              valueAnimation: true,
              fontSize: 19,
              fontWeight: 700,
              fontFamily: FONT_MONO,
              color: INK_DARK,
              offsetCenter: [0, isArc ? "-8%" : "36%"],
              formatter: () => formatted,
            },
            data: [{ value: rawVal, name: fieldTitle }],
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 2. PIE / DONUT / NIGHTINGALE ROSE
  // ------------------------------------------------------------------
  if (
    widget.type === "pie" ||
    widget.type === "donut" ||
    widget.type === "nightingale_rose"
  ) {
    const q = buildCategoricalQuery(rows, widget, false);
    if (q.categories.length === 0 || q.series.length === 0) {
      return {
        option: null,
        emptyReason: "Drag a Category into X-Axis and a Measure into Value.",
      };
    }
    const s = q.series[0];
    const xField = widget.encoding.x?.field;
    const data = q.categories
      .map((name, i) => ({
        name,
        value: Math.max(0, s.values[i] || 0),
        _cfField: xField,
        _cfValue: name,
      }))
      .filter((d) => d.value > 0);

    if (data.length === 0) {
      return {
        option: null,
        emptyReason: "All aggregated values are zero or negative (positive values required for circular charts).",
      };
    }

    const total = data.reduce((acc, d) => acc + d.value, 0);
    const isDonut = widget.type === "donut";
    const isRose = widget.type === "nightingale_rose";
    const topLegend = widget.style.showLegend && widget.style.legendPosition === "top";
    const centerY = topLegend ? "55%" : "50%";

    return {
      crossFilterField: xField,
      option: {
        color: colors,
        tooltip: {
          ...baseTooltip,
          trigger: "item",
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number; percent: number };
            return `<strong>${escapeHtml(p.name)}</strong><br/>${escapeHtml(s.name)}: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatMetricValue(p.value, s.format))}</span> (${escapeHtml(p.percent)}%)`;
          },
        },
        legend: buildLegendConfig(widget),
        title: isDonut
          ? {
              text: formatMetricValue(total, s.format),
              subtext: "Total",
              left: "center",
              top: topLegend ? "49%" : "44%",
              textStyle: {
                fontSize: 16,
                fontWeight: 700,
                color: INK_DARK,
                fontFamily: FONT_MONO,
              },
              subtextStyle: {
                fontSize: 10,
                color: INK_MUTED,
                fontFamily: FONT_SANS,
              },
            }
          : undefined,
        series: [
          {
            name: s.name,
            type: "pie",
            radius: isDonut ? ["48%", "74%"] : isRose ? ["18%", "76%"] : "72%",
            center: ["50%", centerY],
            roseType: isRose ? "radius" : undefined,
            itemStyle: {
              borderColor: "#FFFFFF",
              borderWidth: 1.5,
              borderRadius: 2,
            },
            label: {
              show: widget.style.showLabels,
              fontSize: 11,
              color: INK_DARK,
              fontFamily: FONT_SANS,
              formatter: "{b}: {d}%",
            },
            data,
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 3. TREEMAP / SUNBURST / DECOMPOSITION TREE
  // ------------------------------------------------------------------
  if (
    widget.type === "treemap" ||
    widget.type === "sunburst" ||
    widget.type === "decomposition_tree"
  ) {
    const tree = buildHierarchyTree(rows, widget);
    if (tree.length === 0) {
      return {
        option: null,
        emptyReason:
          "Drag 1 to 3 Dimensions into Hierarchy Levels and a positive Measure into Value.",
      };
    }

    if (widget.type === "treemap") {
      return {
        option: {
          color: colors,
          tooltip: {
            ...baseTooltip,
            formatter: (params: unknown) => {
              const p = params as { name: string; value: number };
              return `<strong>${escapeHtml(p.name)}</strong><br/>${escapeHtml(formatMetricValue(p.value, primaryFmt))}`;
            },
          },
          series: [
            {
              type: "treemap",
              roam: false,
              breadcrumb: { show: true, height: 20 },
              label: { show: true, fontFamily: FONT_SANS, fontSize: 11 },
              itemStyle: { borderColor: "#FFFFFF", borderWidth: 2, gapWidth: 2 },
              data: tree,
            },
          ],
        },
      };
    }

    if (widget.type === "sunburst") {
      return {
        option: {
          color: colors,
          tooltip: {
            ...baseTooltip,
            formatter: (params: unknown) => {
              const p = params as { name: string; value: number };
              return `<strong>${escapeHtml(p.name)}</strong><br/>${escapeHtml(formatMetricValue(p.value, primaryFmt))}`;
            },
          },
          series: [
            {
              type: "sunburst",
              radius: ["16%", "88%"],
              itemStyle: { borderWidth: 1.5, borderColor: "#FFFFFF" },
              label: { fontSize: 10, fontFamily: FONT_SANS, rotate: "radial" },
              data: tree,
            },
          ],
        },
      };
    }

    const grandTotal = tree.reduce((acc, n) => acc + n.value, 0);
    const rootTree = {
      name: `${yFirst?.label || yDef?.label || "Total"} (${formatMetricValue(grandTotal, primaryFmt)})`,
      value: grandTotal,
      _cfIgnore: true,
      children: tree,
    };

    return {
      option: {
        tooltip: {
          ...baseTooltip,
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number };
            return `<strong>${escapeHtml(p.name)}</strong><br/>${escapeHtml(formatMetricValue(p.value, primaryFmt))}`;
          },
        },
        series: [
          {
            type: "tree",
            data: [rootTree],
            top: "6%",
            left: "14%",
            bottom: "6%",
            right: "22%",
            symbolSize: 9,
            itemStyle: { color: colors[0], borderColor: colors[0] },
            lineStyle: { color: "#CBD5E1", width: 1.5 },
            label: {
              position: "left",
              verticalAlign: "middle",
              align: "right",
              fontSize: 11,
              fontFamily: FONT_SANS,
              color: INK_DARK,
            },
            leaves: {
              label: {
                position: "right",
                verticalAlign: "middle",
                align: "left",
                formatter: (params: unknown) => {
                  const p = params as { name: string; value: number };
                  return `${p.name}: ${formatMetricValue(p.value, primaryFmt)}`;
                },
              },
            },
            expandAndCollapse: true,
            initialTreeDepth: 3,
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 4. SANKEY FLOW DIAGRAM (Cycle-Free Disjoint IDs + Clean Display Labels)
  // ------------------------------------------------------------------
  if (widget.type === "sankey") {
    const sankey = buildSankeyData(rows, widget);
    if (sankey.links.length === 0) {
      return {
        option: null,
        emptyReason:
          "Drag Source Node, Target Node, and a positive Value Measure.",
      };
    }
    const labelByNodeId = new Map(
      sankey.nodes.map((n) => [n.name, n.displayLabel])
    );

    return {
      option: {
        color: colors,
        tooltip: {
          ...baseTooltip,
          trigger: "item",
          formatter: (params: unknown) => {
            const p = params as {
              dataType: string;
              name: string;
              value: number;
              data?: {
                sourceLabel?: string;
                targetLabel?: string;
                displayLabel?: string;
              };
            };
            if (p.dataType === "edge" && p.data) {
              return `<strong>${escapeHtml(p.data.sourceLabel)} -&gt; ${escapeHtml(p.data.targetLabel)}</strong><br/>Flow: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatMetricValue(p.value, primaryFmt))}</span>`;
            }
            const cleanName =
              p.data?.displayLabel || labelByNodeId.get(p.name) || p.name;
            return `<strong>${escapeHtml(cleanName)}</strong><br/>Total: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatMetricValue(p.value, primaryFmt))}</span>`;
          },
        },
        series: [
          {
            type: "sankey",
            left: 16,
            right: 110,
            top: 14,
            bottom: 14,
            emphasis: { focus: "adjacency" },
            nodeAlign: "justify",
            lineStyle: { color: "gradient", curveness: 0.45, opacity: 0.45 },
            label: {
              fontSize: 11,
              color: INK_DARK,
              fontFamily: FONT_SANS,
              formatter: (params: unknown) => {
                const p = params as { name: string };
                return labelByNodeId.get(p.name) || p.name;
              },
            },
            data: sankey.nodes,
            links: sankey.links,
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 5. FUNNEL CHART
  // ------------------------------------------------------------------
  if (widget.type === "funnel") {
    const q = buildCategoricalQuery(rows, widget, false);
    if (q.categories.length === 0 || q.series.length === 0) {
      return {
        option: null,
        emptyReason: "Drag a Stage Dimension into X-Axis and a Measure into Value.",
      };
    }
    const s = q.series[0];
    const xField = widget.encoding.x?.field;
    const data = q.categories
      .map((name, i) => ({
        name,
        value: Math.max(0, s.values[i] || 0),
        _cfField: xField,
        _cfValue: name,
      }))
      .filter((d) => d.value > 0);

    if (data.length === 0) {
      return {
        option: null,
        emptyReason: "All funnel stage values are zero or negative.",
      };
    }

    const funnelSort =
      widget.encoding.sort === "value_asc"
        ? "ascending"
        : widget.encoding.sort === "none" || widget.encoding.sort === "value_desc"
        ? "descending"
        : "none";

    return {
      crossFilterField: xField,
      option: {
        color: colors,
        tooltip: {
          ...baseTooltip,
          trigger: "item",
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number };
            return `<strong>${escapeHtml(p.name)}</strong><br/>${escapeHtml(s.name)}: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatMetricValue(p.value, s.format))}</span>`;
          },
        },
        legend: buildLegendConfig(widget),
        series: [
          {
            type: "funnel",
            left: "12%",
            width: "76%",
            top:
              widget.style.showLegend && widget.style.legendPosition === "top"
                ? 38
                : 16,
            bottom: 16,
            sort: funnelSort,
            gap: 2,
            label: {
              show: true,
              position: "right",
              fontFamily: FONT_SANS,
              fontSize: 11,
              color: INK_DARK,
              formatter: (params: unknown) => {
                const p = params as { name: string; value: number };
                return `${p.name} (${formatMetricValue(p.value, s.format)})`;
              },
            },
            itemStyle: { borderColor: "#FFFFFF", borderWidth: 1 },
            data,
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 6. WATERFALL / FINANCIAL BRIDGE (Exact [startY, endY] Custom Series — Zero-Crossing Safe!)
  // ------------------------------------------------------------------
  if (widget.type === "waterfall") {
    const q = buildCategoricalQuery(rows, widget, false);
    if (q.categories.length === 0 || q.series.length === 0) {
      return {
        option: null,
        emptyReason:
          "Drag a Category into X-Axis and a Measure into Value to build a Waterfall Bridge.",
      };
    }
    const s = q.series[0];
    const xField = widget.encoding.x?.field;
    const cats = [...q.categories, "Total"];

    // Tuple per step: [idx, startY, endY, deltaVal, kindCode (1=inc, -1=dec, 0=total)]
    const stepData: {
      value: [number, number, number, number, number];
      name: string;
      _cfField?: string;
      _cfValue?: string;
      _cfIgnore?: boolean;
    }[] = [];

    let running = 0;
    let minY = 0;
    let maxY = 0;

    for (let i = 0; i < q.categories.length; i++) {
      const val = s.values[i] || 0;
      const start = running;
      const end = running + val;
      running = end;
      if (start < minY) minY = start;
      if (end < minY) minY = end;
      if (start > maxY) maxY = start;
      if (end > maxY) maxY = end;

      stepData.push({
        name: q.categories[i],
        value: [i, start, end, val, val >= 0 ? 1 : -1],
        _cfField: xField,
        _cfValue: q.categories[i],
      });
    }

    // Final Total Bar (non-cross-filterable)
    stepData.push({
      name: "Total",
      value: [q.categories.length, 0, running, running, 0],
      _cfIgnore: true,
    });

    const yPad = (maxY - minY) * 0.12 || 1;

    return {
      crossFilterField: xField,
      option: {
        tooltip: {
          ...baseTooltip,
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (params: unknown) => {
            const arr = (Array.isArray(params) ? params : [params]) as {
              name: string;
              value: [number, number, number, number, number];
            }[];
            const item = arr[0];
            if (!item || !Array.isArray(item.value)) return "";
            const [, start, end, delta, kind] = item.value;
            const kindLabel =
              kind === 0 ? "Net Total" : kind > 0 ? "Increase" : "Decrease";
            return `<strong>${escapeHtml(item.name)}</strong><br/>${kindLabel}: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatMetricValue(delta, s.format))}</span><br/>Running: ${escapeHtml(formatMetricValue(start, s.format))} -&gt; ${escapeHtml(formatMetricValue(end, s.format))}`;
          },
        },
        grid: buildGridConfig(widget),
        xAxis: {
          type: "category",
          data: cats,
          axisLine: { lineStyle: { color: BORDER_COLOR } },
          axisLabel: { color: INK_MUTED, fontSize: 11, fontFamily: FONT_SANS },
        },
        yAxis: {
          type: "value",
          min: widget.style.yAxisMin ?? (minY < 0 ? minY - yPad : 0),
          max: widget.style.yAxisMax ?? (maxY > 0 ? maxY + yPad : 0),
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: {
            color: INK_MUTED,
            fontSize: 11,
            fontFamily: FONT_MONO,
            formatter: (v: number) => formatMetricValue(v, s.format),
          },
        },
        series: [
          {
            name: s.name,
            type: "custom",
            renderItem: (
              _params: unknown,
              api: {
                value: (idx: number) => number;
                coord: (val: [number, number]) => [number, number];
                size: (val: [number, number]) => [number, number];
              }
            ) => {
              const xIdx = api.value(0);
              const startY = api.value(1);
              const endY = api.value(2);
              const delta = api.value(3);
              const kind = api.value(4);

              const topVal = Math.max(startY, endY);
              const botVal = Math.min(startY, endY);
              const topCoord = api.coord([xIdx, topVal]);
              const botCoord = api.coord([xIdx, botVal]);
              const bandW = api.size([1, 0])[0] * 0.56;
              const rectH = Math.max(2, botCoord[1] - topCoord[1]);

              const fill =
                kind === 0 ? "#00338D" : kind > 0 ? "#009A44" : "#B91C1C";
              const labelText = widget.style.showLabels
                ? formatMetricValue(delta, s.format)
                : "";
              const labelBelow = kind < 0 || (kind === 0 && delta < 0);

              return {
                type: "group",
                children: [
                  {
                    type: "rect",
                    shape: {
                      x: topCoord[0] - bandW / 2,
                      y: topCoord[1],
                      width: bandW,
                      height: rectH,
                      r: 2,
                    },
                    style: { fill },
                  },
                  ...(labelText
                    ? [
                        {
                          type: "text",
                          silent: true,
                          style: {
                            text: labelText,
                            x: topCoord[0],
                            y: labelBelow ? botCoord[1] + 12 : topCoord[1] - 6,
                            textAlign: "center",
                            textVerticalAlign: labelBelow ? "top" : "bottom",
                            fill: INK_DARK,
                            font: `600 10px ${FONT_MONO}`,
                          },
                        },
                      ]
                    : []),
                ],
              };
            },
            data: stepData,
          } as unknown as Record<string, unknown>,
        ] as EChartsOption["series"],
      },
    };
  }

  // ------------------------------------------------------------------
  // 7. SCATTER & BUBBLE CHARTS
  // ------------------------------------------------------------------
  if (widget.type === "scatter" || widget.type === "bubble") {
    const xB = widget.encoding.x;
    const yB = widget.encoding.y?.[0];
    const sizeB = widget.encoding.size;
    const serB = widget.encoding.series;
    if (!xB || !yB) {
      return {
        option: null,
        emptyReason: "Drag numeric (or Date) fields into X-Axis and a Measure into Y-Axis.",
      };
    }

    const xDef = getFieldDef(widget.datasetId, xB.field);
    const isTimeX = xDef?.dataType === "datetime";
    const xFmt = resolveNumberFormat(xB.format, undefined, xDef?.defaultFormat);
    const sizeDef = sizeB ? getFieldDef(widget.datasetId, sizeB.field) : undefined;
    const sizeFmt = resolveNumberFormat(sizeB?.format, undefined, sizeDef?.defaultFormat);

    const groups = new Map<
      string,
      {
        value: [number, number, number, string];
        _cfField?: string;
        _cfValue?: string;
      }[]
    >();
    const allSizes: number[] = [];

    for (const r of rows) {
      const rawX = readRowField(r, xB.field);
      const xv = isTimeX
        ? rawX
          ? Date.parse(String(rawX))
          : NaN
        : toNumericValue(rawX);
      const yv = toNumericValue(readRowField(r, yB.field));
      if (xv === null || !Number.isFinite(xv) || yv === null) continue;

      const rawSv = sizeB ? toNumericValue(readRowField(r, sizeB.field)) : null;
      const sv = rawSv !== null && rawSv >= 0 ? rawSv : 0;
      if (sizeB && rawSv !== null) allSizes.push(sv);

      const gKey = serB ? formatCellLabel(r, serB, widget.datasetId) : "All Records";
      const label = String(
        readRowField(r, "target_entity_id") ||
          readRowField(r, "name") ||
          readRowField(r, "id") ||
          gKey
      );
      const pt = {
        value: [xv, yv, sv, label] as [number, number, number, string],
        _cfField: serB?.field,
        _cfValue: serB ? gKey : undefined,
      };
      const list = groups.get(gKey);
      if (list) list.push(pt);
      else groups.set(gKey, [pt]);
    }

    if (groups.size === 0) {
      return {
        option: null,
        emptyReason: "No valid numeric/time pairs found for the selected X and Y fields.",
      };
    }

    const sizeBounds = arrayMinMax(allSizes);
    const sizeSpan = sizeBounds.max - sizeBounds.min;

    const seriesList: Record<string, unknown>[] = Array.from(groups.entries()).map(
      ([name, pts]) => ({
        name,
        type: "scatter",
        data: pts,
        symbolSize: (val: number[]) => {
          if (widget.type === "bubble" && sizeB) {
            if (sizeSpan <= 0) return 18;
            const norm = (val[2] - sizeBounds.min) / sizeSpan;
            return Math.round(8 + norm * 34);
          }
          return 10;
        },
        itemStyle: { opacity: 0.85 },
      })
    );

    if (widget.style.showTrendline) {
      const allPts = Array.from(groups.values())
        .flat()
        .map((p) => p.value);
      if (allPts.length >= 2) {
        const n = allPts.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        for (const p of allPts) {
          sumX += p[0];
          sumY += p[1];
          sumXY += p[0] * p[1];
          sumXX += p[0] * p[0];
        }
        const denom = n * sumXX - sumX * sumX;
        if (denom !== 0) {
          const slope = (n * sumXY - sumX * sumY) / denom;
          const intercept = (sumY - slope * sumX) / n;
          const { min: minX, max: maxX } = arrayMinMax(allPts.map((p) => p[0]));
          seriesList.push({
            name: "Linear Trend",
            type: "line",
            silent: true,
            showSymbol: false,
            lineStyle: { color: "#0C233C", type: "dashed", width: 1.5 },
            data: [
              [minX, slope * minX + intercept],
              [maxX, slope * maxX + intercept],
            ],
          });
        }
      }
    }

    return {
      crossFilterField: serB?.field,
      option: {
        color: colors,
        tooltip: {
          ...baseTooltip,
          trigger: "item",
          formatter: (params: unknown) => {
            const p = params as {
              seriesName: string;
              value: [number, number, number?, string?];
            };
            if (!Array.isArray(p.value)) return escapeHtml(p.seriesName);
            const xDisp = isTimeX
              ? new Date(p.value[0]).toISOString().slice(0, 10)
              : formatMetricValue(p.value[0], xFmt);
            const sizeLine =
              widget.type === "bubble" && sizeB
                ? `<br/>${escapeHtml(sizeB.label || sizeDef?.label || sizeB.field)}: ${escapeHtml(formatMetricValue(p.value[2], sizeFmt))}`
                : "";
            return `<strong>${escapeHtml(p.value[3] || p.seriesName)}</strong><br/>${escapeHtml(xB.label || xDef?.label || xB.field)}: ${escapeHtml(xDisp)}<br/>${escapeHtml(yB.label || yDef?.label || yB.field)}: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatMetricValue(p.value[1], primaryFmt))}</span>${sizeLine}`;
          },
        },
        legend: buildLegendConfig(widget),
        grid: buildGridConfig(widget),
        xAxis: {
          type: isTimeX ? "time" : "value",
          name: xB.label || xDef?.label || xB.field,
          nameLocation: "middle",
          nameGap: 24,
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: { color: INK_MUTED, fontFamily: FONT_MONO, fontSize: 10 },
        },
        yAxis: {
          type: "value",
          min: widget.style.yAxisMin ?? undefined,
          max: widget.style.yAxisMax ?? undefined,
          name: yB.label || yDef?.label || yB.field,
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: {
            color: INK_MUTED,
            fontFamily: FONT_MONO,
            fontSize: 10,
            formatter: (v: number) => formatMetricValue(v, primaryFmt),
          },
        },
        series: seriesList as EChartsOption["series"],
      },
    };
  }

  // ------------------------------------------------------------------
  // 8. BOXPLOT & HISTOGRAM
  // ------------------------------------------------------------------
  if (widget.type === "boxplot") {
    const bp = buildBoxplotData(rows, widget);
    if (bp.categories.length === 0) {
      return {
        option: null,
        emptyReason: "Drag a Category into X-Axis and a numeric Measure into Value.",
      };
    }
    const xField = widget.encoding.x?.field;
    return {
      crossFilterField: xField,
      option: {
        color: colors,
        tooltip: {
          ...baseTooltip,
          trigger: "item",
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number[] };
            if (!Array.isArray(p.value) || p.value.length < 6) return escapeHtml(p.name);
            const [, minV, q1, med, q3, maxV] = p.value;
            return `<strong>${escapeHtml(p.name)}</strong><br/>Max: ${escapeHtml(formatMetricValue(maxV, primaryFmt))}<br/>Q3: ${escapeHtml(formatMetricValue(q3, primaryFmt))}<br/>Median: <strong>${escapeHtml(formatMetricValue(med, primaryFmt))}</strong><br/>Q1: ${escapeHtml(formatMetricValue(q1, primaryFmt))}<br/>Min: ${escapeHtml(formatMetricValue(minV, primaryFmt))}`;
          },
        },
        grid: buildGridConfig(widget),
        xAxis: {
          type: "category",
          data: bp.categories,
          axisLine: { lineStyle: { color: BORDER_COLOR } },
          axisLabel: { color: INK_MUTED, fontSize: 11, fontFamily: FONT_SANS },
        },
        yAxis: {
          type: "value",
          min: widget.style.yAxisMin ?? undefined,
          max: widget.style.yAxisMax ?? undefined,
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: {
            color: INK_MUTED,
            fontSize: 11,
            fontFamily: FONT_MONO,
            formatter: (v: number) => formatMetricValue(v, primaryFmt),
          },
        },
        series: [
          {
            name: yFirst?.label || yDef?.label || "Distribution",
            type: "boxplot",
            data: bp.boxes.map((box, idx) => ({
              value: box,
              _cfField: xField,
              _cfValue: bp.categories[idx],
            })),
            itemStyle: {
              color: "#EBF2FF",
              borderColor: colors[0],
              borderWidth: 1.5,
            },
          },
        ],
      },
    };
  }

  if (widget.type === "histogram") {
    const hist = buildHistogramData(rows, widget);
    if (hist.bins.length === 0) {
      return {
        option: null,
        emptyReason: "Drag a numeric Measure into Value to compute frequency bins.",
      };
    }
    return {
      option: {
        color: colors,
        tooltip: buildFormattedAxisTooltip(
          baseTooltip,
          { Records: "integer" },
          "integer",
          "shadow"
        ),
        grid: buildGridConfig(widget),
        xAxis: {
          type: "category",
          data: hist.bins,
          axisLabel: {
            color: INK_MUTED,
            fontSize: 10,
            fontFamily: FONT_MONO,
            rotate: 18,
          },
        },
        yAxis: {
          type: "value",
          name: "Frequency",
          min: widget.style.yAxisMin ?? 0,
          max: widget.style.yAxisMax ?? undefined,
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: { color: INK_MUTED, fontSize: 11, fontFamily: FONT_MONO },
        },
        series: [
          {
            name: "Records",
            type: "bar",
            barCategoryGap: "6%",
            itemStyle: { color: colors[0], borderRadius: [2, 2, 0, 0] },
            label: {
              show: widget.style.showLabels,
              position: "top",
              fontFamily: FONT_MONO,
              fontSize: 10,
            },
            data: hist.counts,
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 9. MATRIX HEATMAP & CALENDAR HEATMAP
  // ------------------------------------------------------------------
  if (widget.type === "heatmap") {
    const hm = buildHeatmapData(rows, widget);
    if (hm.xLabels.length === 0 || hm.yLabels.length === 0) {
      return {
        option: null,
        emptyReason:
          "Drag X-Axis Category, Y-Axis Category (Legend slot), and a Measure.",
      };
    }
    const xField = widget.encoding.x?.field;
    return {
      crossFilterField: xField,
      option: {
        tooltip: {
          ...baseTooltip,
          position: "top",
          formatter: (params: unknown) => {
            const p = params as { value: [number, number, number] };
            return `<strong>${escapeHtml(hm.xLabels[p.value[0]])} x ${escapeHtml(hm.yLabels[p.value[1]])}</strong><br/>Value: <span style="font-family:${FONT_MONO};font-weight:700">${escapeHtml(formatMetricValue(p.value[2], primaryFmt))}</span>`;
          },
        },
        grid: { top: 14, bottom: 52, left: 16, right: 16, containLabel: true },
        xAxis: {
          type: "category",
          data: hm.xLabels,
          splitArea: { show: true },
          axisLabel: { color: INK_MUTED, fontSize: 11, fontFamily: FONT_SANS },
        },
        yAxis: {
          type: "category",
          data: hm.yLabels,
          splitArea: { show: true },
          axisLabel: { color: INK_MUTED, fontSize: 11, fontFamily: FONT_SANS },
        },
        visualMap: {
          min: hm.min,
          max: hm.max === hm.min ? hm.min + 1 : hm.max,
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: 2,
          inRange: {
            color: ["#F4F6FA", "#ACEAFF", "#1E49E2", "#00338D"],
          },
          textStyle: { color: INK_MUTED, fontSize: 10, fontFamily: FONT_MONO },
        },
        series: [
          {
            type: "heatmap",
            data: hm.cells.map(([xi, yi, v]) => ({
              value: [xi, yi, v],
              _cfField: xField,
              _cfValue: hm.xLabels[xi],
            })),
            label: {
              show: widget.style.showLabels,
              fontSize: 10,
              fontFamily: FONT_MONO,
              formatter: (params: unknown) => {
                const p = params as { value: [number, number, number] };
                return formatMetricValue(p.value[2], primaryFmt);
              },
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 6,
                shadowColor: "rgba(0, 51, 141, 0.35)",
              },
            },
          },
        ],
      },
    };
  }

  if (widget.type === "calendar_heatmap") {
    const xB = widget.encoding.x;
    if (!xB || !yFirst) {
      return {
        option: null,
        emptyReason:
          "Drag a Date/Time field into Time Axis and a Measure into Value.",
      };
    }
    const dayMap = new Map<string, RawDataRow[]>();
    for (const r of rows) {
      const dayKey = formatBucketDate(readRowField(r, xB.field), "day");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue;
      const list = dayMap.get(dayKey);
      if (list) list.push(r);
      else dayMap.set(dayKey, [r]);
    }
    if (dayMap.size === 0) {
      return {
        option: null,
        emptyReason: "No valid calendar timestamps found in the selected field.",
      };
    }

    // Group by latest active year cleanly so multi-year data never mis-scales visualMap
    const years = Array.from(
      new Set(Array.from(dayMap.keys()).map((d) => d.slice(0, 4)))
    ).sort();
    const activeYear = years[years.length - 1];

    const entries: { value: [string, number]; _cfField: string; _cfValue: string }[] = [];
    const activeVals: number[] = [];

    for (const [day, sub] of dayMap.entries()) {
      if (!day.startsWith(`${activeYear}-`)) continue;
      const v = computeAggregation(sub, yFirst, widget.datasetId);
      activeVals.push(v);
      entries.push({
        value: [day, v],
        _cfField: xB.field,
        _cfValue: day,
      });
    }

    const { min, max } = arrayMinMax(activeVals);

    return {
      crossFilterField: xB.field,
      option: {
        tooltip: {
          ...baseTooltip,
          formatter: (params: unknown) => {
            const p = params as { value: [string, number] };
            return `<strong>${escapeHtml(p.value[0])}</strong><br/>${escapeHtml(formatMetricValue(p.value[1], primaryFmt))}`;
          },
        },
        visualMap: {
          min,
          max: max === min ? min + (Math.abs(min) > 0 ? Math.abs(min) * 0.25 : 1) : max,
          orient: "horizontal",
          left: "center",
          bottom: 4,
          inRange: { color: ["#EBF2FF", "#00B8F5", "#1E49E2", "#00338D"] },
          textStyle: { color: INK_MUTED, fontSize: 10, fontFamily: FONT_MONO },
        },
        calendar: {
          top: 32,
          left: 36,
          right: 18,
          bottom: 42,
          range: activeYear,
          cellSize: ["auto", 14],
          itemStyle: { borderColor: "#FFFFFF", borderWidth: 2 },
          yearLabel: {
            show: true,
            color: INK_DARK,
            fontFamily: FONT_MONO,
            fontSize: 11,
          },
          monthLabel: { color: INK_MUTED, fontSize: 10 },
          dayLabel: { color: INK_MUTED, fontSize: 9 },
        },
        series: [
          {
            type: "heatmap",
            coordinateSystem: "calendar",
            data: entries,
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 10. RADAR & PARALLEL COORDINATES
  // ------------------------------------------------------------------
  if (widget.type === "radar") {
    const q = buildCategoricalQuery(rows, widget, false);
    if (q.categories.length < 3 || q.series.length === 0) {
      return {
        option: null,
        emptyReason:
          "Radar charts require at least 3 category values on X-Axis and 1+ Measure on Y-Axis.",
      };
    }

    const indicators = q.categories.map((name, idx) => {
      const vals = q.series.map((s) => s.values[idx] || 0);
      const { min: lo, max: hi } = arrayMinMax(vals);
      const safeMin = lo < 0 ? lo * 1.15 : 0;
      const safeMax = hi > safeMin ? hi * 1.15 : safeMin + 10;
      return { name, min: safeMin, max: safeMax };
    });

    const seriesCfField = widget.encoding.series?.field;

    return {
      crossFilterField: seriesCfField,
      option: {
        color: colors,
        tooltip: {
          ...baseTooltip,
          trigger: "item",
          formatter: (params: unknown) => {
            const p = params as { name: string; value: number[] };
            const lines = (p.value || []).map(
              (v, i) =>
                `${escapeHtml(q.categories[i])}: <strong style="font-family:${FONT_MONO}">${escapeHtml(formatMetricValue(v, primaryFmt))}</strong>`
            );
            return `<strong>${escapeHtml(p.name)}</strong><br/>${lines.join("<br/>")}`;
          },
        },
        legend: buildLegendConfig(widget),
        radar: {
          radius: "64%",
          indicator: indicators,
          axisName: { color: INK_MUTED, fontSize: 11, fontFamily: FONT_SANS },
        },
        series: [
          {
            type: "radar",
            data: q.series.map((s) => ({
              name: s.name,
              value: s.values,
              _cfField: seriesCfField,
              _cfValue: seriesCfField ? s.name : undefined,
              _cfIgnore: !seriesCfField,
              areaStyle: { opacity: 0.14 },
            })),
          },
        ],
      },
    };
  }

  if (widget.type === "parallel") {
    const ys = widget.encoding.y || [];
    if (ys.length < 2) {
      return {
        option: null,
        emptyReason: "Drag 2 to 6 numeric Measures into Parallel Axes.",
      };
    }
    const serB = widget.encoding.series;
    const axes = ys.slice(0, 6).map((b, idx) => ({
      dim: idx,
      name: b.label || getFieldDef(widget.datasetId, b.field)?.label || b.field,
    }));

    const capped = rows.slice(0, 200);
    const groups = new Map<string, number[][]>();
    for (const r of capped) {
      const gKey = serB ? formatCellLabel(r, serB, widget.datasetId) : "Records";
      const tuple = ys
        .slice(0, 6)
        .map((b) => toNumericValue(readRowField(r, b.field)) ?? 0);
      const list = groups.get(gKey);
      if (list) list.push(tuple);
      else groups.set(gKey, [tuple]);
    }

    return {
      option: {
        color: colors,
        tooltip: baseTooltip,
        legend: serB ? buildLegendConfig(widget) : { show: false },
        parallelAxis: axes,
        parallel: {
          left: "8%",
          right: "10%",
          top: serB ? 44 : 34,
          bottom: 22,
          parallelAxisDefault: {
            nameTextStyle: { color: INK_DARK, fontSize: 11, fontFamily: FONT_SANS },
            axisLabel: { color: INK_MUTED, fontSize: 10, fontFamily: FONT_MONO },
          },
        },
        series: Array.from(groups.entries()).map(([name, data]) => ({
          name,
          type: "parallel",
          lineStyle: { width: 1.6, opacity: 0.5 },
          data,
        })),
      },
    };
  }

  // ------------------------------------------------------------------
  // 11. STREAMGRAPH (THEMERIVER) & CANDLESTICK
  // ------------------------------------------------------------------
  if (widget.type === "streamgraph") {
    const q = buildCategoricalQuery(rows, widget, false);
    if (q.categories.length < 2 || q.series.length === 0) {
      return {
        option: null,
        emptyReason:
          "Streamgraph requires at least 2 X-Axis periods/categories and a Measure.",
      };
    }
    const riverData: [number, number, string][] = [];
    q.categories.forEach((_, ci) => {
      q.series.forEach((s) => {
        riverData.push([ci, Math.max(0, s.values[ci] || 0), s.name]);
      });
    });

    const serField = widget.encoding.series?.field;

    return {
      crossFilterField: serField,
      option: {
        color: colors,
        tooltip: {
          ...baseTooltip,
          trigger: "axis",
          axisPointer: { type: "line" },
          formatter: (params: unknown) => {
            const arr = (Array.isArray(params) ? params : [params]) as {
              value: [number, number, string];
              marker?: string;
            }[];
            if (arr.length === 0) return "";
            const idx = Math.round(arr[0].value?.[0] ?? 0);
            const cat = q.categories[idx] ?? String(idx);
            const lines = arr.map(
              (a) =>
                `${a.marker || ""}${escapeHtml(a.value[2])}: <strong style="font-family:${FONT_MONO}">${escapeHtml(formatMetricValue(a.value[1], primaryFmt))}</strong>`
            );
            return `<strong>${escapeHtml(cat)}</strong><br/>${lines.join("<br/>")}`;
          },
        },
        legend: buildLegendConfig(widget),
        singleAxis: {
          top: 36,
          bottom: 28,
          left: 24,
          right: 24,
          type: "value",
          min: 0,
          max: q.categories.length - 1,
          minInterval: 1,
          axisLabel: {
            color: INK_MUTED,
            fontSize: 10,
            formatter: (v: number) =>
              Number.isInteger(v) ? q.categories[v] ?? "" : "",
          },
        },
        series: [
          {
            type: "themeRiver",
            data: riverData,
            label: { show: false },
          },
        ],
      },
    };
  }

  if (widget.type === "candlestick") {
    const cs = buildCandlestickData(rows, widget);
    if (cs.categories.length === 0) {
      return {
        option: null,
        emptyReason:
          "Drag a Time/Category field into X-Axis and a numeric Measure into Value.",
      };
    }
    const xField = widget.encoding.x?.field;
    return {
      crossFilterField: xField,
      option: {
        tooltip: {
          ...baseTooltip,
          trigger: "axis",
          axisPointer: { type: "cross" },
          formatter: (params: unknown) => {
            const arr = (Array.isArray(params) ? params : [params]) as {
              name: string;
              value: [number, number, number, number, number];
            }[];
            const item = arr[0];
            if (!item || !Array.isArray(item.value)) return "";
            const [, open, close, low, high] = item.value;
            return `<strong>${escapeHtml(item.name)}</strong><br/>Open: ${escapeHtml(formatMetricValue(open, primaryFmt))}<br/>Close: ${escapeHtml(formatMetricValue(close, primaryFmt))}<br/>High: ${escapeHtml(formatMetricValue(high, primaryFmt))}<br/>Low: ${escapeHtml(formatMetricValue(low, primaryFmt))}`;
          },
        },
        grid: buildGridConfig(widget),
        xAxis: {
          type: "category",
          data: cs.categories,
          axisLine: { lineStyle: { color: BORDER_COLOR } },
          axisLabel: { color: INK_MUTED, fontSize: 11, fontFamily: FONT_SANS },
        },
        yAxis: {
          type: "value",
          scale: true,
          min: widget.style.yAxisMin ?? undefined,
          max: widget.style.yAxisMax ?? undefined,
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: {
            color: INK_MUTED,
            fontSize: 11,
            fontFamily: FONT_MONO,
            formatter: (v: number) => formatMetricValue(v, primaryFmt),
          },
        },
        series: [
          {
            type: "candlestick",
            data: cs.ohlc.map((v, idx) => ({
              value: v,
              _cfField: xField,
              _cfValue: cs.categories[idx],
            })),
            itemStyle: {
              color: "#009A44",
              color0: "#B91C1C",
              borderColor: "#009A44",
              borderColor0: "#B91C1C",
            },
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 12. LOLLIPOP & BULLET CHARTS
  // ------------------------------------------------------------------
  if (widget.type === "lollipop") {
    const q = buildCategoricalQuery(rows, widget, false);
    if (q.categories.length === 0 || q.series.length === 0) {
      return {
        option: null,
        emptyReason: "Drag Category into X-Axis and a Measure into Value.",
      };
    }
    const s = q.series[0];
    const xField = widget.encoding.x?.field;
    return {
      crossFilterField: xField,
      option: {
        color: colors,
        tooltip: buildFormattedAxisTooltip(
          baseTooltip,
          { [s.name]: s.format },
          s.format,
          "shadow"
        ),
        grid: buildGridConfig(widget),
        xAxis: {
          type: "value",
          min: widget.style.yAxisMin ?? undefined,
          max: widget.style.yAxisMax ?? undefined,
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: {
            color: INK_MUTED,
            fontSize: 10,
            fontFamily: FONT_MONO,
            formatter: (v: number) => formatMetricValue(v, s.format),
          },
        },
        yAxis: {
          type: "category",
          data: q.categories,
          axisLine: { lineStyle: { color: BORDER_COLOR } },
          axisLabel: { color: INK_DARK, fontSize: 11, fontFamily: FONT_SANS },
        },
        series: [
          {
            name: "__stem__",
            type: "bar",
            barWidth: 3,
            itemStyle: { color: "#CBD5E1" },
            data: s.values,
            silent: true,
            tooltip: { show: false },
          },
          {
            name: s.name,
            type: "scatter",
            symbolSize: 13,
            itemStyle: {
              color: colors[0],
              borderColor: "#FFFFFF",
              borderWidth: 2,
            },
            label: {
              show: widget.style.showLabels,
              position: "right",
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: INK_DARK,
              formatter: (p: unknown) => {
                const raw = (p as { value: number | { value: number } }).value;
                const num = typeof raw === "object" ? raw.value : raw;
                return formatMetricValue(num, s.format);
              },
            },
            data: s.values.map((v, idx) => ({
              value: v,
              _cfField: xField,
              _cfValue: q.categories[idx],
              label: { position: v < 0 ? "left" : "right" },
            })),
          },
        ],
      },
    };
  }

  if (widget.type === "bullet") {
    const q = buildCategoricalQuery(rows, widget, false);
    if (q.categories.length === 0 || q.series.length === 0) {
      return {
        option: null,
        emptyReason: "Drag Category into X-Axis and a Measure into Value.",
      };
    }
    const s = q.series[0];
    const xField = widget.encoding.x?.field;
    const { min: loVal, max: hiVal } = arrayMinMax(s.values);
    const hasTarget =
      widget.encoding.kpiTarget !== null &&
      widget.encoding.kpiTarget !== undefined &&
      Number.isFinite(widget.encoding.kpiTarget);
    const maxMag = Math.max(
      Math.abs(hiVal),
      Math.abs(loVal),
      hasTarget ? Math.abs(widget.encoding.kpiTarget!) : 0
    );
    const capVal = maxMag > 0 ? maxMag * 1.15 : 1;
    const targetVal = hasTarget ? widget.encoding.kpiTarget! : hiVal * 0.85;
    const rangeBg = q.categories.map(() => capVal);
    const targetPts = q.categories.map(() => targetVal);

    return {
      crossFilterField: xField,
      option: {
        tooltip: buildFormattedAxisTooltip(
          baseTooltip,
          { [s.name]: s.format, Target: s.format },
          s.format,
          "shadow"
        ),
        grid: buildGridConfig(widget),
        xAxis: {
          type: "value",
          min: widget.style.yAxisMin ?? (loVal < 0 ? loVal * 1.15 : 0),
          max: widget.style.yAxisMax ?? undefined,
          splitLine: {
            show: widget.style.showGridlines,
            lineStyle: { color: "#EEF2F6" },
          },
          axisLabel: {
            color: INK_MUTED,
            fontSize: 10,
            fontFamily: FONT_MONO,
            formatter: (v: number) => formatMetricValue(v, s.format),
          },
        },
        yAxis: {
          type: "category",
          data: q.categories,
          axisLabel: { color: INK_DARK, fontSize: 11, fontFamily: FONT_SANS },
        },
        series: [
          {
            name: "Capacity Band",
            type: "bar",
            barWidth: 24,
            barGap: "-100%",
            z: 1,
            silent: true,
            tooltip: { show: false },
            itemStyle: { color: "#EEF2F6", borderRadius: 2 },
            data: rangeBg,
          },
          {
            name: s.name,
            type: "bar",
            barWidth: 12,
            barGap: "-75%",
            z: 2,
            itemStyle: { color: colors[0], borderRadius: 2 },
            label: {
              show: widget.style.showLabels,
              position: "right",
              fontFamily: FONT_MONO,
              fontSize: 10,
              formatter: (p: unknown) => {
                const raw = (p as { value: number | { value: number } }).value;
                return formatMetricValue(
                  typeof raw === "object" ? raw.value : raw,
                  s.format
                );
              },
            },
            data: s.values.map((v, idx) => ({
              value: v,
              _cfField: xField,
              _cfValue: q.categories[idx],
            })),
          },
          {
            name: "Target",
            type: "scatter",
            z: 3,
            silent: true,
            symbol: "rect",
            symbolSize: [3, 24],
            itemStyle: { color: "#B91C1C" },
            data: targetPts,
          },
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // 13. ALL BAR / COLUMN / LINE / AREA / COMBO / SLOPE CHARTS
  // ------------------------------------------------------------------
  const isPercentStacked =
    widget.type === "bar_percent_stacked" ||
    widget.type === "bar_horizontal_percent" ||
    widget.type === "area_percent_stacked";

  const isHorizontal =
    widget.type === "bar_horizontal" ||
    widget.type === "bar_horizontal_stacked" ||
    widget.type === "bar_horizontal_percent";

  const isStacked =
    widget.type === "bar_stacked" ||
    widget.type === "bar_horizontal_stacked" ||
    widget.type === "bar_percent_stacked" ||
    widget.type === "bar_horizontal_percent" ||
    widget.type === "area_stacked" ||
    widget.type === "area_percent_stacked";

  const isLineFamily =
    widget.type === "line" ||
    widget.type === "line_smooth" ||
    widget.type === "line_step" ||
    widget.type === "area" ||
    widget.type === "area_stacked" ||
    widget.type === "area_percent_stacked" ||
    widget.type === "slope_ribbon";

  const isAreaFamily =
    widget.type === "area" ||
    widget.type === "area_stacked" ||
    widget.type === "area_percent_stacked";

  const q = buildCategoricalQuery(rows, widget, isPercentStacked);
  if (q.categories.length === 0 || q.series.length === 0) {
    return {
      option: null,
      emptyReason:
        "Drag a field into X-Axis and one or more Measures into Y-Axis.",
    };
  }

  const xField = widget.encoding.x?.field;
  const hasSecondaryAxis =
    widget.type === "combo_bar_line" && q.series.some((s) => s.isSecondary);
  const hasNegative = q.series.some((s) => s.values.some((v) => v < 0));
  const markLine = buildMarkLine(widget, isHorizontal);

  const seriesFormatMap: Record<string, NumberFormatKind> = {};
  for (const s of q.series) {
    seriesFormatMap[s.name] = s.format;
  }

  const seriesOptions = q.series.map((s, idx) => {
    const isLine =
      isLineFamily || (widget.type === "combo_bar_line" && s.isSecondary);

    return {
      name: s.name,
      type: isLine ? "line" : "bar",
      yAxisIndex: hasSecondaryAxis && s.isSecondary ? 1 : 0,
      stack: isStacked && !s.isSecondary ? "total" : undefined,
      smooth:
        widget.type === "line_smooth" ||
        widget.type === "slope_ribbon" ||
        (isAreaFamily && widget.type !== "area_percent_stacked"),
      step: widget.type === "line_step" ? "middle" : undefined,
      areaStyle: isAreaFamily ? { opacity: isStacked ? 0.45 : 0.22 } : undefined,
      symbolSize: widget.type === "slope_ribbon" ? 9 : 6,
      lineStyle: isLine
        ? { width: widget.type === "slope_ribbon" ? 3 : 2 }
        : undefined,
      itemStyle: isLine
        ? undefined
        : {
            borderRadius: isStacked
              ? 0
              : isHorizontal
              ? [0, 2, 2, 0]
              : [2, 2, 0, 0],
          },
      label: {
        show: widget.style.showLabels,
        position: isStacked ? "inside" : isHorizontal ? "right" : "top",
        fontSize: 10,
        fontFamily: FONT_MONO,
        color: isStacked ? "#FFFFFF" : INK_DARK,
        formatter: (params: unknown) => {
          const raw = (params as { value: number | { value: number } }).value;
          const val = typeof raw === "object" ? raw.value : raw;
          return formatMetricValue(val, s.format);
        },
      },
      markLine: idx === 0 ? markLine : undefined,
      data: s.values.map((val, ci) => ({
        value: val,
        _cfField: xField,
        _cfValue: q.categories[ci],
      })),
    };
  });

  const catAxis = {
    type: "category" as const,
    data: q.categories,
    boundaryGap: !isLineFamily,
    axisLine: { lineStyle: { color: BORDER_COLOR } },
    axisTick: { show: false },
    axisLabel: {
      color: INK_MUTED,
      fontSize: 11,
      fontFamily: FONT_SANS,
      overflow: "truncate" as const,
      width: 90,
    },
  };

  const valAxisPrimary = {
    type: "value" as const,
    min:
      widget.style.yAxisMin ??
      (isPercentStacked ? (hasNegative ? -100 : 0) : undefined),
    max: widget.style.yAxisMax ?? (isPercentStacked ? 100 : undefined),
    splitLine: {
      show: widget.style.showGridlines,
      lineStyle: { color: "#EEF2F6" },
    },
    axisLabel: {
      color: INK_MUTED,
      fontSize: 11,
      fontFamily: FONT_MONO,
      formatter: (v: number) =>
        isPercentStacked
          ? `${v}%`
          : formatMetricValue(v, q.series[0]?.format || primaryFmt),
    },
  };

  const valAxisSecondary = {
    type: "value" as const,
    splitLine: { show: false },
    axisLabel: {
      color: "#1E49E2",
      fontSize: 11,
      fontFamily: FONT_MONO,
      formatter: (v: number) =>
        formatMetricValue(
          v,
          q.series.find((s) => s.isSecondary)?.format || "auto"
        ),
    },
  };

  return {
    crossFilterField: xField,
    option: {
      color: colors,
      tooltip: buildFormattedAxisTooltip(
        baseTooltip,
        seriesFormatMap,
        q.series[0]?.format || primaryFmt,
        isLineFamily ? "line" : "shadow"
      ),
      legend: buildLegendConfig(widget),
      grid: buildGridConfig(widget, hasSecondaryAxis),
      xAxis: isHorizontal ? valAxisPrimary : catAxis,
      yAxis: isHorizontal
        ? catAxis
        : hasSecondaryAxis
        ? [valAxisPrimary, valAxisSecondary]
        : valAxisPrimary,
      series: seriesOptions as EChartsOption["series"],
    },
  };
}
