import { getFieldDef } from "./catalog";
import {
  AggregationFn,
  ConditionalFormatRule,
  CrossFilterItem,
  DashboardWidget,
  DatasetId,
  DateBucket,
  FieldBinding,
  NumberFormatKind,
  RawDataRow,
  WidgetFilterRule,
} from "./types";

const hasOwn = Object.prototype.hasOwnProperty;

export function readRowField(
  row: RawDataRow,
  field: string
): string | number | boolean | null | undefined {
  if (!row || !field || !hasOwn.call(row, field)) return undefined;
  return row[field];
}

export function arrayMinMax(nums: number[]): { min: number; max: number } {
  if (nums.length === 0) return { min: 0, max: 0 };
  let min = nums[0];
  let max = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const v = nums[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

export function resolveNumberFormat(
  bindingFmt?: NumberFormatKind,
  styleFmt?: NumberFormatKind,
  fieldDefault?: NumberFormatKind
): NumberFormatKind {
  if (bindingFmt && bindingFmt !== "auto") return bindingFmt;
  if (styleFmt && styleFmt !== "auto") return styleFmt;
  if (fieldDefault && fieldDefault !== "auto") return fieldDefault;
  return "auto";
}

export function toNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "boolean") return val ? 1 : 0;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatBucketDate(raw: unknown, bucket: DateBucket = "day"): string {
  if (raw === null || raw === undefined || raw === "") return "Unassigned";
  const str = String(raw);
  if (bucket === "raw") return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hr = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");

  switch (bucket) {
    case "year":
      return `${y}`;
    case "quarter": {
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      return `${y}-Q${q}`;
    }
    case "month":
      return `${y}-${m}`;
    case "week": {
      const temp = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
      const dayNum = temp.getUTCDay() || 7;
      temp.setUTCDate(temp.getUTCDate() - dayNum + 1);
      const wy = temp.getUTCFullYear();
      const wm = String(temp.getUTCMonth() + 1).padStart(2, "0");
      const wd = String(temp.getUTCDate()).padStart(2, "0");
      return `Wk ${wy}-${wm}-${wd}`;
    }
    case "day":
      return `${y}-${m}-${day}`;
    case "hour":
      return `${y}-${m}-${day} ${hr}:00`;
    case "minute":
      return `${y}-${m}-${day} ${hr}:${min}`;
    default:
      return `${y}-${m}-${day}`;
  }
}

function detectDateBucketFromLabel(label: string): DateBucket | null {
  if (/^\d{4}$/.test(label)) return "year";
  if (/^\d{4}-Q[1-4]$/.test(label)) return "quarter";
  if (/^\d{4}-\d{2}$/.test(label)) return "month";
  if (/^Wk \d{4}-\d{2}-\d{2}$/.test(label)) return "week";
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return "day";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:00$/.test(label)) return "hour";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(label)) return "minute";
  return null;
}

export function formatCellLabel(
  row: RawDataRow,
  binding: FieldBinding,
  datasetId: DatasetId
): string {
  const raw = readRowField(row, binding.field);
  if (raw === null || raw === undefined || raw === "") return "Unassigned";
  const def = getFieldDef(datasetId, binding.field);
  if (def?.dataType === "datetime") {
    return formatBucketDate(raw, binding.dateBucket || "day");
  }
  if (typeof raw === "boolean") {
    return raw ? "True" : "False";
  }
  return String(raw);
}

export function formatMetricValue(
  value: number | null | undefined,
  format: NumberFormatKind = "auto",
  fieldDefaultFormat: NumberFormatKind = "auto"
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  const cleanVal = Object.is(value, -0) ? 0 : value;
  const effective = resolveNumberFormat(format, undefined, fieldDefaultFormat);

  switch (effective) {
    case "currency_usd": {
      const abs = Math.abs(cleanVal);
      if (abs > 0 && abs < 1) {
        const sign = cleanVal < 0 ? "-" : "";
        const digits = abs < 0.0001 ? 6 : 4;
        return `${sign}$${abs.toFixed(digits)}`;
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: abs >= 1000 ? 0 : 2,
      }).format(cleanVal);
    }
    case "percent": {
      // Ratio semantics: 0.99 -> 99.0%, 1.0 -> 100.0%, 1.5 -> 150.0%
      return `${(cleanVal * 100).toFixed(1)}%`;
    }
    case "percent_100": {
      // Already-scaled percentage semantics (0..100): 0.5 -> 0.5%, 50 -> 50.0%
      return `${cleanVal.toFixed(1)}%`;
    }
    case "duration_ms": {
      if (Math.abs(cleanVal) >= 1000) {
        return `${(cleanVal / 1000).toFixed(2)} s`;
      }
      return `${Math.round(cleanVal).toLocaleString("en-US")} ms`;
    }
    case "tokens": {
      if (Math.abs(cleanVal) >= 1_000_000) {
        return `${(cleanVal / 1_000_000).toFixed(2)}M`;
      }
      if (Math.abs(cleanVal) >= 10_000) {
        return `${(cleanVal / 1_000).toFixed(1)}K`;
      }
      return Math.round(cleanVal).toLocaleString("en-US");
    }
    case "compact": {
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(cleanVal);
    }
    case "integer":
      return Math.round(cleanVal).toLocaleString("en-US");
    case "decimal_2":
      return cleanVal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case "auto":
    default: {
      if (Number.isInteger(cleanVal)) {
        return cleanVal.toLocaleString("en-US");
      }
      const abs = Math.abs(cleanVal);
      if (abs > 0 && abs < 0.0001) {
        return cleanVal.toExponential(2);
      }
      if (abs < 0.1 && cleanVal !== 0) {
        return cleanVal.toFixed(4);
      }
      return cleanVal.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
    }
  }
}

export function evaluateConditionalColor(
  value: number,
  rules: ConditionalFormatRule[]
): string | null {
  if (!Number.isFinite(value)) return null;
  for (const rule of rules) {
    switch (rule.operator) {
      case "gt":
        if (value > rule.value) return rule.color;
        break;
      case "gte":
        if (value >= rule.value) return rule.color;
        break;
      case "lt":
        if (value < rule.value) return rule.color;
        break;
      case "lte":
        if (value <= rule.value) return rule.color;
        break;
      case "eq":
        if (value === rule.value) return rule.color;
        break;
      case "between":
        if (
          value >= rule.value &&
          (rule.valueMax === undefined || value <= rule.valueMax)
        ) {
          return rule.color;
        }
        break;
    }
  }
  return null;
}

function matchesWidgetFilter(
  row: RawDataRow,
  rule: WidgetFilterRule,
  datasetId: DatasetId
): boolean {
  const val = readRowField(row, rule.field);
  if (!rule.values || rule.values.length === 0) return true;
  const firstStr = String(rule.values[0] ?? "");
  if (rule.operator === "contains" && firstStr === "") return true;

  const def = getFieldDef(datasetId, rule.field);
  const valNormalized =
    typeof val === "boolean"
      ? val
        ? "True"
        : "False"
      : val === null || val === undefined || val === ""
      ? "Unassigned"
      : String(val);

  switch (rule.operator) {
    case "in":
      return rule.values.some(
        (v) =>
          String(v).toLowerCase() === valNormalized.toLowerCase() ||
          String(v) === String(val ?? "")
      );
    case "not_in":
      return !rule.values.some(
        (v) =>
          String(v).toLowerCase() === valNormalized.toLowerCase() ||
          String(v) === String(val ?? "")
      );
    case "eq":
      return (
        valNormalized.toLowerCase() === firstStr.toLowerCase() ||
        String(val ?? "").toLowerCase() === firstStr.toLowerCase()
      );
    case "neq":
      return (
        valNormalized.toLowerCase() !== firstStr.toLowerCase() &&
        String(val ?? "").toLowerCase() !== firstStr.toLowerCase()
      );
    case "contains":
      return (
        valNormalized.toLowerCase().includes(firstStr.toLowerCase()) ||
        String(val ?? "")
          .toLowerCase()
          .includes(firstStr.toLowerCase())
      );
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      let n: number | null;
      let t: number | null;
      if (def?.dataType === "datetime") {
        const tsN = val ? Date.parse(String(val)) : NaN;
        const tsT = firstStr ? Date.parse(firstStr) : NaN;
        n = Number.isNaN(tsN) ? null : tsN;
        t = Number.isNaN(tsT) ? null : tsT;
      } else {
        n = toNumericValue(val);
        t = toNumericValue(rule.values[0]);
      }
      if (n === null || t === null) return false;
      if (rule.operator === "gt") return n > t;
      if (rule.operator === "gte") return n >= t;
      if (rule.operator === "lt") return n < t;
      return n <= t;
    }
    default:
      return true;
  }
}

function resolveTargetField(row: RawDataRow, field: string, datasetId: DatasetId): string {
  if (readRowField(row, field) !== undefined) return field;
  if (field === "productName") {
    if (readRowField(row, "product_name") !== undefined) return "product_name";
    if (datasetId === "registered_products" && readRowField(row, "name") !== undefined) return "name";
  }
  if (field === "product_name") {
    if (readRowField(row, "productName") !== undefined) return "productName";
    if (datasetId === "registered_products" && readRowField(row, "name") !== undefined) return "name";
  }
  if (field === "name" && datasetId === "registered_products") {
    if (readRowField(row, "productName") !== undefined) return "productName";
    if (readRowField(row, "product_name") !== undefined) return "product_name";
  }
  return field;
}

export function filterDatasetRows(
  rows: RawDataRow[],
  widget: DashboardWidget,
  crossFilters: CrossFilterItem[]
): RawDataRow[] {
  let result = rows;

  if (widget.encoding.filters && widget.encoding.filters.length > 0) {
    result = result.filter((row) =>
      widget.encoding.filters.every((rule) =>
        matchesWidgetFilter(row, rule, widget.datasetId)
      )
    );
  }

  const sampleRow = rows[0] || {};
  const applicableCross = crossFilters.filter((cf) => {
    if (cf.sourceWidgetId === widget.id) return false;
    if (cf.datasetId === widget.datasetId) return true;
    if (rows.length === 0) return false;
    const targetField = resolveTargetField(sampleRow, cf.field, widget.datasetId);
    return readRowField(sampleRow, targetField) !== undefined;
  });

  if (applicableCross.length > 0) {
    result = result.filter((row) =>
      applicableCross.every((cf) => {
        const targetField = resolveTargetField(row, cf.field, widget.datasetId);
        const val = readRowField(row, targetField);
        if (cf.operator === "in" && cf.values && cf.values.length > 0) {
          const def = getFieldDef(widget.datasetId, targetField);
          const normalizedStr =
            val === null || val === undefined || val === ""
              ? "Unassigned"
              : typeof val === "boolean"
              ? val
                ? "True"
                : "False"
              : String(val);

          if (def?.dataType === "datetime") {
            return cf.values.some((v) => {
              const target = String(v);
              if (target === normalizedStr) return true;
              const bucket = detectDateBucketFromLabel(target);
              if (bucket) {
                return formatBucketDate(val, bucket) === target;
              }
              return normalizedStr.startsWith(target);
            });
          }

          return cf.values.some(
            (v) =>
              String(v) === normalizedStr ||
              (typeof val === "boolean" && String(v) === String(val))
          );
        }

        if (cf.operator === "range") {
          const n = toNumericValue(val);
          if (n === null) return false;
          if (
            cf.min !== null &&
            cf.min !== undefined &&
            Number.isFinite(cf.min) &&
            n < cf.min
          ) {
            return false;
          }
          if (
            cf.max !== null &&
            cf.max !== undefined &&
            Number.isFinite(cf.max) &&
            n > cf.max
          ) {
            return false;
          }
          return true;
        }

        if (cf.operator === "date_range") {
          if (!val) return false;
          const ts = Date.parse(String(val));
          if (Number.isNaN(ts)) return false;
          if (cf.startDate) {
            const startDay = cf.startDate.slice(0, 10);
            const startTs = Date.parse(`${startDay}T00:00:00.000Z`);
            if (!Number.isNaN(startTs) && ts < startTs) return false;
          }
          if (cf.endDate) {
            const endDay = cf.endDate.slice(0, 10);
            const endTs = Date.parse(`${endDay}T23:59:59.999Z`);
            if (!Number.isNaN(endTs) && ts > endTs) return false;
          }
          return true;
        }

        return true;
      })
    );
  }

  return result;
}

export function computeAggregation(
  rows: RawDataRow[],
  binding: FieldBinding,
  datasetId: DatasetId
): number {
  const def = getFieldDef(datasetId, binding.field);
  const agg: AggregationFn =
    binding.aggregation || def?.defaultAggregation || "sum";

  if (binding.field === "__record_count") {
    return rows.length;
  }

  if (agg === "count") {
    let count = 0;
    for (const r of rows) {
      const v = readRowField(r, binding.field);
      if (v !== null && v !== undefined && v !== "") count++;
    }
    return count;
  }

  if (agg === "count_distinct") {
    const set = new Set<string>();
    for (const r of rows) {
      const v = readRowField(r, binding.field);
      if (v !== null && v !== undefined && v !== "") {
        set.add(String(v));
      }
    }
    return set.size;
  }

  const nums: number[] = [];
  for (const r of rows) {
    const n = toNumericValue(readRowField(r, binding.field));
    if (n !== null) nums.push(n);
  }

  if (nums.length === 0) return 0;

  switch (agg) {
    case "sum":
    case "pct_of_total":
    case "running_total": {
      let sum = 0;
      for (const n of nums) sum += n;
      return sum;
    }
    case "avg": {
      let sum = 0;
      for (const n of nums) sum += n;
      return sum / nums.length;
    }
    case "min":
      return arrayMinMax(nums).min;
    case "max":
      return arrayMinMax(nums).max;
    case "median": {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
    default: {
      let sum = 0;
      for (const n of nums) sum += n;
      return sum;
    }
  }
}

export interface CategoricalSeries {
  name: string;
  field: string;
  aggregation: AggregationFn;
  format: NumberFormatKind;
  values: number[];
  isSecondary?: boolean;
}

export interface CategoricalQueryResult {
  categories: string[];
  series: CategoricalSeries[];
  totalRows: number;
  isPercentMode: boolean;
}

export function buildCategoricalQuery(
  rows: RawDataRow[],
  widget: DashboardWidget,
  forcePercentNormalized = false
): CategoricalQueryResult {
  const xBinding = widget.encoding.x;
  const yBindings = widget.encoding.y || [];
  const secBindings = widget.encoding.secondaryY || [];
  const seriesBinding = widget.encoding.series;

  if (!xBinding || (yBindings.length === 0 && secBindings.length === 0)) {
    return { categories: [], series: [], totalRows: rows.length, isPercentMode: false };
  }

  const xMap = new Map<string, RawDataRow[]>();
  for (const row of rows) {
    const label = formatCellLabel(row, xBinding, widget.datasetId);
    const list = xMap.get(label);
    if (list) list.push(row);
    else xMap.set(label, [row]);
  }

  let categories = Array.from(xMap.keys());
  const xDef = getFieldDef(widget.datasetId, xBinding.field);

  if (
    xDef?.dataType === "datetime" &&
    (!widget.encoding.sort || widget.encoding.sort === "none")
  ) {
    categories.sort((a, b) => a.localeCompare(b));
  }

  const seriesOut: CategoricalSeries[] = [];

  if (seriesBinding && yBindings.length > 0) {
    const primaryY = yBindings[0];
    const yDef = getFieldDef(widget.datasetId, primaryY.field);
    const agg = primaryY.aggregation || yDef?.defaultAggregation || "sum";
    const fmt = resolveNumberFormat(
      primaryY.format,
      widget.style.numberFormat,
      yDef?.defaultFormat
    );

    const seriesValuesSet = new Set<string>();
    for (const r of rows) {
      seriesValuesSet.add(formatCellLabel(r, seriesBinding, widget.datasetId));
    }
    const seriesNames = Array.from(seriesValuesSet).sort();

    for (const sName of seriesNames) {
      const vals = categories.map((cat) => {
        const catRows = (xMap.get(cat) || []).filter(
          (r) => formatCellLabel(r, seriesBinding, widget.datasetId) === sName
        );
        return computeAggregation(catRows, primaryY, widget.datasetId);
      });
      seriesOut.push({
        name: sName,
        field: primaryY.field,
        aggregation: agg,
        format: agg === "pct_of_total" ? "percent_100" : fmt,
        values: vals,
      });
    }

    // Preserve secondaryY line series even when Legend/Series split is active on combo_bar_line
    for (const binding of secBindings) {
      const def = getFieldDef(widget.datasetId, binding.field);
      const aggSec = binding.aggregation || def?.defaultAggregation || "sum";
      const fmtSec = resolveNumberFormat(
        binding.format,
        widget.style.numberFormat,
        def?.defaultFormat
      );
      const label = binding.label || def?.label || binding.field;
      const vals = categories.map((cat) =>
        computeAggregation(xMap.get(cat) || [], binding, widget.datasetId)
      );
      seriesOut.push({
        name: label,
        field: binding.field,
        aggregation: aggSec,
        format: aggSec === "pct_of_total" ? "percent_100" : fmtSec,
        values: vals,
        isSecondary: true,
      });
    }
  } else {
    const allY = [
      ...yBindings.map((b) => ({ binding: b, isSecondary: false })),
      ...secBindings.map((b) => ({ binding: b, isSecondary: true })),
    ];

    for (const { binding, isSecondary } of allY) {
      const def = getFieldDef(widget.datasetId, binding.field);
      const agg = binding.aggregation || def?.defaultAggregation || "sum";
      const fmt = resolveNumberFormat(
        binding.format,
        widget.style.numberFormat,
        def?.defaultFormat
      );
      const label = binding.label || def?.label || binding.field;

      const vals = categories.map((cat) =>
        computeAggregation(xMap.get(cat) || [], binding, widget.datasetId)
      );

      seriesOut.push({
        name: label,
        field: binding.field,
        aggregation: agg,
        format: agg === "pct_of_total" ? "percent_100" : fmt,
        values: vals,
        isSecondary,
      });
    }
  }

  // 1. Apply Sorting BEFORE running_total so cumulative curves follow the sorted order!
  const sortMode = widget.encoding.sort || "none";
  if (sortMode !== "none" && categories.length > 1) {
    const primarySeries = seriesOut.filter((s) => !s.isSecondary);
    const sortSource = primarySeries.length > 0 ? primarySeries : seriesOut;
    const indices = categories.map((_, idx) => idx);
    indices.sort((ia, ib) => {
      if (sortMode === "label_asc") return categories[ia].localeCompare(categories[ib]);
      if (sortMode === "label_desc") return categories[ib].localeCompare(categories[ia]);
      const sumA = sortSource.reduce((acc, s) => acc + (s.values[ia] || 0), 0);
      const sumB = sortSource.reduce((acc, s) => acc + (s.values[ib] || 0), 0);
      return sortMode === "value_desc" ? sumB - sumA : sumA - sumB;
    });
    categories = indices.map((i) => categories[i]);
    for (const s of seriesOut) {
      s.values = indices.map((i) => s.values[i]);
    }
  }

  // 2. Apply pct_of_total BEFORE Top-N cutoff so shares reflect the full filtered set
  for (const s of seriesOut) {
    if (s.aggregation === "pct_of_total") {
      let total = 0;
      for (const v of s.values) total += Math.abs(v);
      s.values = s.values.map((v) =>
        total > 0 ? Number(((v / total) * 100).toFixed(2)) : 0
      );
      s.format = "percent_100";
    }
  }

  // 3. Apply Top-N cutoff
  if (
    widget.encoding.topN &&
    widget.encoding.topN > 0 &&
    categories.length > widget.encoding.topN
  ) {
    const limit = widget.encoding.topN;
    categories = categories.slice(0, limit);
    for (const s of seriesOut) {
      s.values = s.values.slice(0, limit);
    }
  }

  // 4. Apply running_total AFTER sort & Top-N
  for (const s of seriesOut) {
    if (s.aggregation === "running_total") {
      let running = 0;
      s.values = s.values.map((v) => {
        running += v;
        return running;
      });
    }
  }

  // 5. Apply 100% stacked normalization if requested
  if (forcePercentNormalized && seriesOut.length > 0) {
    for (let i = 0; i < categories.length; i++) {
      let colSum = 0;
      for (const s of seriesOut) colSum += Math.abs(s.values[i] || 0);
      for (const s of seriesOut) {
        s.values[i] =
          colSum > 0 ? Number(((s.values[i] / colSum) * 100).toFixed(2)) : 0;
        s.format = "percent_100";
      }
    }
  }

  return {
    categories,
    series: seriesOut,
    totalRows: rows.length,
    isPercentMode: forcePercentNormalized,
  };
}

export interface HierarchyNode {
  name: string;
  value: number;
  _cfField?: string;
  _cfValue?: string;
  children?: HierarchyNode[];
}

export function buildHierarchyTree(
  rows: RawDataRow[],
  widget: DashboardWidget
): HierarchyNode[] {
  const levels = widget.encoding.hierarchy || [];
  const yBinding = widget.encoding.y?.[0];
  if (levels.length === 0 || !yBinding || rows.length === 0) return [];

  function groupLevel(subset: RawDataRow[], depth: number): HierarchyNode[] {
    const levelBinding = levels[depth];
    const groups = new Map<string, RawDataRow[]>();
    for (const r of subset) {
      const key = formatCellLabel(r, levelBinding, widget.datasetId);
      const list = groups.get(key);
      if (list) list.push(r);
      else groups.set(key, [r]);
    }

    const nodes: HierarchyNode[] = [];
    for (const [name, subRows] of groups.entries()) {
      const rawVal = computeAggregation(subRows, yBinding, widget.datasetId);
      const value = Math.max(0, rawVal);
      if (depth + 1 < levels.length) {
        const children = groupLevel(subRows, depth + 1);
        const childSum = children.reduce((acc, c) => acc + c.value, 0);
        nodes.push({
          name,
          value: childSum > 0 ? childSum : value,
          _cfField: levelBinding.field,
          _cfValue: name,
          children,
        });
      } else if (value > 0) {
        nodes.push({
          name,
          value,
          _cfField: levelBinding.field,
          _cfValue: name,
        });
      }
    }
    return nodes.sort((a, b) => b.value - a.value);
  }

  return groupLevel(rows, 0);
}

export interface SankeyNodeItem {
  name: string;
  displayLabel: string;
  _cfField: string;
  _cfValue: string;
}

export interface SankeyResult {
  nodes: SankeyNodeItem[];
  links: {
    source: string;
    target: string;
    sourceLabel: string;
    targetLabel: string;
    value: number;
    _cfField: string;
    _cfValue: string;
  }[];
}

export function buildSankeyData(
  rows: RawDataRow[],
  widget: DashboardWidget
): SankeyResult {
  const sourceBinding = widget.encoding.source;
  const targetBinding = widget.encoding.target;
  const yBinding = widget.encoding.y?.[0];
  if (!sourceBinding || !targetBinding || !yBinding || rows.length === 0) {
    return { nodes: [], links: [] };
  }

  // Nested Map eliminates any `|||` delimiter collisions
  const nested = new Map<string, Map<string, RawDataRow[]>>();
  for (const r of rows) {
    const sRaw = formatCellLabel(r, sourceBinding, widget.datasetId);
    const tRaw = formatCellLabel(r, targetBinding, widget.datasetId);
    let inner = nested.get(sRaw);
    if (!inner) {
      inner = new Map<string, RawDataRow[]>();
      nested.set(sRaw, inner);
    }
    const list = inner.get(tRaw);
    if (list) list.push(r);
    else inner.set(tRaw, [r]);
  }

  // Always use guaranteed-disjoint internal IDs (`src::` vs `tgt::`) so ECharts
  // NEVER hits a DAG cycle even when source & target share identical names!
  const nodeMap = new Map<string, SankeyNodeItem>();
  const links: SankeyResult["links"] = [];

  for (const [sLabel, inner] of nested.entries()) {
    for (const [tLabel, subRows] of inner.entries()) {
      const val = computeAggregation(subRows, yBinding, widget.datasetId);
      if (!Number.isFinite(val) || val <= 0) continue;

      const srcId = `src::${sLabel}`;
      const tgtId = `tgt::${tLabel}`;

      if (!nodeMap.has(srcId)) {
        nodeMap.set(srcId, {
          name: srcId,
          displayLabel: sLabel,
          _cfField: sourceBinding.field,
          _cfValue: sLabel,
        });
      }
      if (!nodeMap.has(tgtId)) {
        nodeMap.set(tgtId, {
          name: tgtId,
          displayLabel: tLabel,
          _cfField: targetBinding.field,
          _cfValue: tLabel,
        });
      }

      links.push({
        source: srcId,
        target: tgtId,
        sourceLabel: sLabel,
        targetLabel: tLabel,
        value: val,
        _cfField: sourceBinding.field,
        _cfValue: sLabel,
      });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
  };
}

export interface BoxplotResult {
  categories: string[];
  boxes: [number, number, number, number, number][]; // [min, Q1, median, Q3, max]
}

export function buildBoxplotData(
  rows: RawDataRow[],
  widget: DashboardWidget
): BoxplotResult {
  const xBinding = widget.encoding.x;
  const yBinding = widget.encoding.y?.[0];
  if (!xBinding || !yBinding || rows.length === 0) {
    return { categories: [], boxes: [] };
  }

  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const cat = formatCellLabel(r, xBinding, widget.datasetId);
    const n = toNumericValue(readRowField(r, yBinding.field));
    if (n === null) continue;
    const list = groups.get(cat);
    if (list) list.push(n);
    else groups.set(cat, [n]);
  }

  const categories: string[] = [];
  const boxes: [number, number, number, number, number][] = [];

  const quantile = (sorted: number[], p: number): number => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };

  // Preserve full IEEE-754 precision so min <= Q1 <= median <= Q3 <= max always holds
  for (const [cat, nums] of groups.entries()) {
    if (nums.length === 0) continue;
    const sorted = [...nums].sort((a, b) => a - b);
    categories.push(cat);
    boxes.push([
      sorted[0],
      quantile(sorted, 0.25),
      quantile(sorted, 0.5),
      quantile(sorted, 0.75),
      sorted[sorted.length - 1],
    ]);
  }

  return { categories, boxes };
}

export interface HistogramResult {
  bins: string[];
  counts: number[];
}

export function buildHistogramData(
  rows: RawDataRow[],
  widget: DashboardWidget
): HistogramResult {
  const yBinding = widget.encoding.y?.[0];
  if (!yBinding || rows.length === 0) return { bins: [], counts: [] };

  const def = getFieldDef(widget.datasetId, yBinding.field);
  const fmt = resolveNumberFormat(
    yBinding.format,
    widget.style.numberFormat,
    def?.defaultFormat
  );

  const nums: number[] = [];
  for (const r of rows) {
    const n = toNumericValue(readRowField(r, yBinding.field));
    if (n !== null) nums.push(n);
  }
  if (nums.length === 0) return { bins: [], counts: [] };

  const { min, max } = arrayMinMax(nums);
  if (min === max) {
    return { bins: [formatMetricValue(min, fmt)], counts: [nums.length] };
  }

  const binCount = Math.min(12, Math.max(4, Math.ceil(Math.sqrt(nums.length))));
  const step = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  const bins: string[] = [];

  // Derive label precision from step size (never produces duplicate bins)
  const formatBound = (v: number): string => {
    const absStep = Math.abs(step);
    if (absStep < 1e-4) return v.toExponential(2);
    if (absStep < 0.01) return v.toFixed(4);
    if (absStep < 1) return v.toFixed(2);
    if (absStep < 10) return v.toFixed(1);
    return Math.round(v).toLocaleString("en-US");
  };

  for (let i = 0; i < binCount; i++) {
    const low = min + i * step;
    const high = i === binCount - 1 ? max : low + step;
    bins.push(`${formatBound(low)} to ${formatBound(high)}`);
  }

  for (const n of nums) {
    const idx = Math.max(0, Math.min(binCount - 1, Math.floor((n - min) / step)));
    counts[idx]++;
  }

  return { bins, counts };
}

export interface HeatmapResult {
  xLabels: string[];
  yLabels: string[];
  cells: [number, number, number][];
  min: number;
  max: number;
}

export function buildHeatmapData(
  rows: RawDataRow[],
  widget: DashboardWidget
): HeatmapResult {
  const xBinding = widget.encoding.x;
  const yCatBinding = widget.encoding.series;
  const valBinding = widget.encoding.y?.[0];
  if (!xBinding || !yCatBinding || !valBinding || rows.length === 0) {
    return { xLabels: [], yLabels: [], cells: [], min: 0, max: 0 };
  }

  const xSet = new Set<string>();
  const ySet = new Set<string>();
  const nested = new Map<string, Map<string, RawDataRow[]>>();

  for (const r of rows) {
    const xL = formatCellLabel(r, xBinding, widget.datasetId);
    const yL = formatCellLabel(r, yCatBinding, widget.datasetId);
    xSet.add(xL);
    ySet.add(yL);
    let inner = nested.get(xL);
    if (!inner) {
      inner = new Map<string, RawDataRow[]>();
      nested.set(xL, inner);
    }
    const list = inner.get(yL);
    if (list) list.push(r);
    else inner.set(yL, [r]);
  }

  const xLabels = Array.from(xSet).sort();
  const yLabels = Array.from(ySet).sort();
  const cells: [number, number, number][] = [];
  let min = Infinity;
  let max = -Infinity;

  xLabels.forEach((xL, xi) => {
    yLabels.forEach((yL, yi) => {
      const sub = nested.get(xL)?.get(yL) || [];
      const val = sub.length > 0 ? computeAggregation(sub, valBinding, widget.datasetId) : 0;
      cells.push([xi, yi, val]);
      if (val < min) min = val;
      if (val > max) max = val;
    });
  });

  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;

  return { xLabels, yLabels, cells, min, max };
}

export interface CandlestickResult {
  categories: string[];
  ohlc: [number, number, number, number][]; // [open, close, lowest, highest]
}

export function buildCandlestickData(
  rows: RawDataRow[],
  widget: DashboardWidget
): CandlestickResult {
  const xBinding = widget.encoding.x;
  const yBinding = widget.encoding.y?.[0];
  if (!xBinding || !yBinding || rows.length === 0) {
    return { categories: [], ohlc: [] };
  }

  const groups = new Map<string, { ts: number; order: number; val: number }[]>();
  rows.forEach((r, idx) => {
    const cat = formatCellLabel(r, xBinding, widget.datasetId);
    const n = toNumericValue(readRowField(r, yBinding.field));
    if (n === null) return;
    const tsRaw =
      readRowField(r, xBinding.field) ||
      readRowField(r, "timestamp_start") ||
      readRowField(r, "created_at") ||
      readRowField(r, "createdAt");
    const parsedTs = tsRaw ? Date.parse(String(tsRaw)) : NaN;
    const entry = {
      ts: Number.isNaN(parsedTs) ? idx : parsedTs,
      order: idx,
      val: n,
    };
    const list = groups.get(cat);
    if (list) list.push(entry);
    else groups.set(cat, [entry]);
  });

  const categories = Array.from(groups.keys()).sort();
  const ohlc: [number, number, number, number][] = categories.map((cat) => {
    const entries = [...(groups.get(cat) || [])].sort((a, b) =>
      a.ts !== b.ts ? a.ts - b.ts : a.order - b.order
    );
    const vals = entries.map((e) => e.val);
    if (vals.length === 0) return [0, 0, 0, 0];
    const open = vals[0];
    const close = vals[vals.length - 1];
    const { min: low, max: high } = arrayMinMax(vals);
    return [open, close, low, high];
  });

  return { categories, ohlc };
}

export interface PivotMatrixResult {
  rowKeys: string[];
  rowDisplayLabels: Record<string, string>;
  rowPrimaryValues: Record<string, string>;
  colKeys: string[];
  colDisplayLabels: Record<string, string>;
  hasColumnGroups: boolean;
  cells: Record<string, Record<string, (number | null)[]>>;
  rowTotals: Record<string, number[]>;
  colTotals: Record<string, number[]>;
  grandTotals: number[];
  valueLabels: string[];
  valueFormats: NumberFormatKind[];
  maxAbsValue: number;
}

export function buildPivotMatrix(
  rows: RawDataRow[],
  widget: DashboardWidget
): PivotMatrixResult {
  const rowBindings = widget.encoding.rows || [];
  const colBindings = widget.encoding.columns || [];
  const valBindings = widget.encoding.values || [];

  const valueLabels = valBindings.map((b) => {
    const def = getFieldDef(widget.datasetId, b.field);
    return b.label || def?.label || b.field;
  });
  const valueFormats: NumberFormatKind[] = valBindings.map((b) => {
    const def = getFieldDef(widget.datasetId, b.field);
    if (b.aggregation === "pct_of_total") return "percent_100";
    return resolveNumberFormat(b.format, widget.style.numberFormat, def?.defaultFormat);
  });

  const hasCols = colBindings.length > 0;

  if (rowBindings.length === 0 || valBindings.length === 0 || rows.length === 0) {
    return {
      rowKeys: [],
      rowDisplayLabels: Object.create(null),
      rowPrimaryValues: Object.create(null),
      colKeys: [],
      colDisplayLabels: Object.create(null),
      hasColumnGroups: hasCols,
      cells: Object.create(null),
      rowTotals: Object.create(null),
      colTotals: Object.create(null),
      grandTotals: [],
      valueLabels,
      valueFormats,
      maxAbsValue: 0,
    };
  }

  const rowKeySet = new Set<string>();
  const colKeySet = new Set<string>();
  const rowDisplayLabels: Record<string, string> = Object.create(null);
  const rowPrimaryValues: Record<string, string> = Object.create(null);
  const colDisplayLabels: Record<string, string> = Object.create(null);

  const cellBuckets = new Map<string, Map<string, RawDataRow[]>>();
  const rowBuckets = new Map<string, RawDataRow[]>();
  const colBuckets = new Map<string, RawDataRow[]>();

  for (const r of rows) {
    const rParts = rowBindings.map((b) => formatCellLabel(r, b, widget.datasetId));
    const rKey = JSON.stringify(rParts);
    const cParts = hasCols
      ? colBindings.map((b) => formatCellLabel(r, b, widget.datasetId))
      : ["Total"];
    const cKey = JSON.stringify(cParts);

    rowKeySet.add(rKey);
    colKeySet.add(cKey);
    if (!rowDisplayLabels[rKey]) {
      rowDisplayLabels[rKey] = rParts.join(" / ");
      rowPrimaryValues[rKey] = rParts[0];
    }
    if (!colDisplayLabels[cKey]) {
      colDisplayLabels[cKey] = cParts.join(" / ");
    }

    let rMap = cellBuckets.get(rKey);
    if (!rMap) {
      rMap = new Map<string, RawDataRow[]>();
      cellBuckets.set(rKey, rMap);
    }
    const cList = rMap.get(cKey);
    if (cList) cList.push(r);
    else rMap.set(cKey, [r]);

    const rb = rowBuckets.get(rKey);
    if (rb) rb.push(r);
    else rowBuckets.set(rKey, [r]);

    const cb = colBuckets.get(cKey);
    if (cb) cb.push(r);
    else colBuckets.set(cKey, [r]);
  }

  const rowKeys = Array.from(rowKeySet).sort((a, b) =>
    rowDisplayLabels[a].localeCompare(rowDisplayLabels[b])
  );
  const colKeys = Array.from(colKeySet).sort((a, b) =>
    colDisplayLabels[a].localeCompare(colDisplayLabels[b])
  );

  const rawGrandTotals = valBindings.map((vb) =>
    computeAggregation(rows, vb, widget.datasetId)
  );

  const cells: Record<string, Record<string, (number | null)[]>> = Object.create(null);
  const rowTotals: Record<string, number[]> = Object.create(null);
  const colTotals: Record<string, number[]> = Object.create(null);
  let maxAbsValue = 0;

  for (const rKey of rowKeys) {
    cells[rKey] = Object.create(null);
    for (const cKey of colKeys) {
      const sub = cellBuckets.get(rKey)?.get(cKey) || [];
      const vals = valBindings.map((vb, vi) => {
        if (sub.length === 0) return null;
        let v = computeAggregation(sub, vb, widget.datasetId);
        if (vb.aggregation === "pct_of_total") {
          const denom = Math.abs(rawGrandTotals[vi] || 0);
          v = denom > 0 ? Number(((v / denom) * 100).toFixed(2)) : 0;
        }
        if (Math.abs(v) > maxAbsValue) maxAbsValue = Math.abs(v);
        return v;
      });
      cells[rKey][cKey] = vals;
    }

    rowTotals[rKey] = valBindings.map((vb, vi) => {
      let v = computeAggregation(rowBuckets.get(rKey) || [], vb, widget.datasetId);
      if (vb.aggregation === "pct_of_total") {
        const denom = Math.abs(rawGrandTotals[vi] || 0);
        v = denom > 0 ? Number(((v / denom) * 100).toFixed(2)) : 0;
      }
      return v;
    });
  }

  for (const cKey of colKeys) {
    colTotals[cKey] = valBindings.map((vb, vi) => {
      let v = computeAggregation(colBuckets.get(cKey) || [], vb, widget.datasetId);
      if (vb.aggregation === "pct_of_total") {
        const denom = Math.abs(rawGrandTotals[vi] || 0);
        v = denom > 0 ? Number(((v / denom) * 100).toFixed(2)) : 0;
      }
      return v;
    });
  }

  const grandTotals = valBindings.map((vb, vi) =>
    vb.aggregation === "pct_of_total" ? (rawGrandTotals[vi] !== 0 ? 100 : 0) : rawGrandTotals[vi]
  );

  return {
    rowKeys,
    rowDisplayLabels,
    rowPrimaryValues,
    colKeys,
    colDisplayLabels,
    hasColumnGroups: hasCols,
    cells,
    rowTotals,
    colTotals,
    grandTotals,
    valueLabels,
    valueFormats,
    maxAbsValue,
  };
}

export interface ExportTablePayload {
  columns: string[];
  rows: (string | number | boolean)[][];
}

export function extractWidgetExportTable(
  rows: RawDataRow[],
  widget: DashboardWidget
): ExportTablePayload {
  if (widget.type === "data_table") {
    const cols = widget.encoding.columns || [];
    const headers = cols.map(
      (c) => c.label || getFieldDef(widget.datasetId, c.field)?.label || c.field
    );
    const body = rows.map((r) =>
      cols.map((c) => {
        const val = readRowField(r, c.field);
        return val === null || val === undefined ? "" : val;
      })
    );
    return { columns: headers, rows: body };
  }

  if (widget.type === "pivot_matrix") {
    const pivot = buildPivotMatrix(rows, widget);
    const showRowTotals = pivot.hasColumnGroups && pivot.colKeys.length > 1;
    const headers = [
      (widget.encoding.rows || [])
        .map((r) => getFieldDef(widget.datasetId, r.field)?.label || r.field)
        .join(" / ") || "Row",
      ...pivot.colKeys.flatMap((ck) =>
        pivot.valueLabels.map((vl) =>
          pivot.hasColumnGroups ? `${pivot.colDisplayLabels[ck]} (${vl})` : vl
        )
      ),
      ...(showRowTotals ? pivot.valueLabels.map((vl) => `Row Total (${vl})`) : []),
    ];
    const body: (string | number | boolean)[][] = pivot.rowKeys.map((rk) => [
      pivot.rowDisplayLabels[rk],
      ...pivot.colKeys.flatMap((ck) =>
        (pivot.cells[rk]?.[ck] || []).map((v) => (v === null ? "" : v))
      ),
      ...(showRowTotals ? pivot.rowTotals[rk] || [] : []),
    ]);
    if (pivot.rowKeys.length > 0) {
      body.push([
        "Grand Total",
        ...pivot.colKeys.flatMap((ck) => pivot.colTotals[ck] || []),
        ...(showRowTotals ? pivot.grandTotals : []),
      ]);
    }
    return { columns: headers, rows: body };
  }

  if (
    widget.type === "kpi_card" ||
    widget.type === "multi_kpi_card" ||
    widget.type === "text_callout" ||
    widget.type.startsWith("gauge") ||
    widget.type === "progress_ring"
  ) {
    const ys = widget.encoding.y || [];
    return {
      columns: ["Metric", "Aggregation", "Value"],
      rows: ys.map((b) => {
        const def = getFieldDef(widget.datasetId, b.field);
        return [
          b.label || def?.label || b.field,
          b.aggregation || def?.defaultAggregation || "sum",
          computeAggregation(rows, b, widget.datasetId),
        ];
      }),
    };
  }

  if (widget.type === "boxplot") {
    const bp = buildBoxplotData(rows, widget);
    return {
      columns: ["Category", "Min", "Q1", "Median", "Q3", "Max"],
      rows: bp.categories.map((c, i) => [c, ...bp.boxes[i]]),
    };
  }

  if (widget.type === "candlestick") {
    const cs = buildCandlestickData(rows, widget);
    return {
      columns: ["Period", "Open", "Close", "Low", "High"],
      rows: cs.categories.map((c, i) => [c, ...cs.ohlc[i]]),
    };
  }

  if (widget.type === "histogram") {
    const hist = buildHistogramData(rows, widget);
    return {
      columns: ["Bin Range", "Frequency"],
      rows: hist.bins.map((b, i) => [b, hist.counts[i]]),
    };
  }

  if (widget.type === "heatmap") {
    const hm = buildHeatmapData(rows, widget);
    return {
      columns: ["X Category", "Y Category", "Value"],
      rows: hm.cells.map(([xi, yi, v]) => [hm.xLabels[xi], hm.yLabels[yi], v]),
    };
  }

  if (widget.type === "sankey") {
    const sk = buildSankeyData(rows, widget);
    return {
      columns: ["Source", "Target", "Flow Value"],
      rows: sk.links.map((l) => [l.sourceLabel, l.targetLabel, l.value]),
    };
  }

  if (
    widget.type === "treemap" ||
    widget.type === "sunburst" ||
    widget.type === "decomposition_tree"
  ) {
    const tree = buildHierarchyTree(rows, widget);
    const flat: (string | number)[][] = [];
    const walk = (nodes: HierarchyNode[], prefix: string[]) => {
      for (const n of nodes) {
        const pathParts = [...prefix, n.name];
        if (n.children && n.children.length > 0) {
          walk(n.children, pathParts);
        } else {
          flat.push([pathParts.join(" / "), n.value]);
        }
      }
    };
    walk(tree, []);
    return { columns: ["Hierarchy Path", "Value"], rows: flat };
  }

  if (widget.type === "scatter" || widget.type === "bubble") {
    const xB = widget.encoding.x;
    const yB = widget.encoding.y?.[0];
    const sB = widget.encoding.size;
    const serB = widget.encoding.series;
    const cols: string[] = [];
    if (serB) cols.push(serB.label || serB.field);
    if (xB) cols.push(xB.label || xB.field);
    if (yB) cols.push(yB.label || yB.field);
    if (sB) cols.push(sB.label || sB.field);
    return {
      columns: cols,
      rows: rows.map((r) => {
        const out: (string | number | boolean)[] = [];
        if (serB) out.push(formatCellLabel(r, serB, widget.datasetId));
        if (xB) out.push(readRowField(r, xB.field) ?? "");
        if (yB) out.push(readRowField(r, yB.field) ?? "");
        if (sB) out.push(readRowField(r, sB.field) ?? "");
        return out;
      }),
    };
  }

  if (widget.type === "parallel") {
    const ys = widget.encoding.y || [];
    return {
      columns: ys.map(
        (b) => b.label || getFieldDef(widget.datasetId, b.field)?.label || b.field
      ),
      rows: rows.map((r) => ys.map((b) => toNumericValue(readRowField(r, b.field)) ?? 0)),
    };
  }

  const isPercentStacked =
    widget.type === "bar_percent_stacked" ||
    widget.type === "bar_horizontal_percent" ||
    widget.type === "area_percent_stacked";

  const cat = buildCategoricalQuery(rows, widget, isPercentStacked);
  if (cat.categories.length > 0 && cat.series.length > 0) {
    const xLabel =
      widget.encoding.x?.label ||
      (widget.encoding.x
        ? getFieldDef(widget.datasetId, widget.encoding.x.field)?.label
        : "Category") ||
      "Category";
    return {
      columns: [xLabel, ...cat.series.map((s) => s.name)],
      rows: cat.categories.map((c, idx) => [
        c,
        ...cat.series.map((s) => s.values[idx] ?? 0),
      ]),
    };
  }

  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    columns: keys,
    rows: rows.map((r) => keys.map((k) => readRowField(r, k) ?? "")),
  };
}
