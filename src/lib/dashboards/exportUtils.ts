import type { ECharts } from "echarts";
import {
  createDefaultWidgetStyle,
  PALETTE_PRESETS,
  SEMANTIC_DATASET_MAP,
  VISUAL_CATALOG_MAP,
} from "./catalog";
import { clampRect } from "./gridLayout";
import {
  DashboardDocument,
  DashboardPage,
  DashboardWidget,
  DatasetId,
  PalettePresetId,
  WidgetVisualType,
} from "./types";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "kpmg-export"
  );
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236) for string cells
 * beginning with =, +, -, @, tab, or carriage return.
 */
function neutralizeSpreadsheetFormula(raw: string): string {
  const trimmed = raw.slice(0, 32_700);
  if (/^[\s]*[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function exportEChartPng(instance: ECharts | null, title: string): boolean {
  if (!instance || instance.isDisposed()) return false;
  if (instance.getWidth() <= 0 || instance.getHeight() <= 0) return false;
  const dataUrl = instance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#FFFFFF",
  });
  if (!dataUrl || dataUrl === "data:,") return false;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${safeSlug(title)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

export async function exportEChartSvg(
  option: Record<string, unknown>,
  width: number,
  height: number,
  title: string
): Promise<boolean> {
  const echarts = await import("echarts");
  const safeW = Number.isFinite(width) && width > 0 ? Math.max(480, Math.round(width)) : 640;
  const safeH = Number.isFinite(height) && height > 0 ? Math.max(320, Math.round(height)) : 380;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "-99999px";
  host.style.width = `${safeW}px`;
  host.style.height = `${safeH}px`;
  document.body.appendChild(host);

  let svgChart: ECharts | null = null;
  try {
    svgChart = echarts.init(host, undefined, {
      renderer: "svg",
      width: safeW,
      height: safeH,
    });
    svgChart.setOption({ ...option, animation: false });
    // Replace CSS custom property font vars so standalone SVG viewers render cleanly
    const svgStr = svgChart
      .renderToSVGString()
      .replace(/var\(--font-geist-sans\)/g, "Inter")
      .replace(/var\(--font-geist-mono\)/g, "monospace");
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(blob, `${safeSlug(title)}.svg`);
    return true;
  } finally {
    if (svgChart && !svgChart.isDisposed()) {
      svgChart.dispose();
    }
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

export async function exportElementPng(
  element: HTMLElement | null,
  title: string
): Promise<boolean> {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#F8FAFC",
    cacheBust: true,
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${safeSlug(title)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

export async function exportElementPdf(
  element: HTMLElement | null,
  title: string
): Promise<boolean> {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const [{ toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#FFFFFF",
    cacheBust: true,
  });

  const isLandscape = rect.width >= rect.height;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2 - 28;

  // Sanitize title to ASCII-safe Helvetica header and cap width
  const safeTitle = title
    .replace(/[^\x20-\x7E]/g, " ")
    .trim()
    .slice(0, 68);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 51, 141);
  pdf.text(`KPMG CFO Advisory | ${safeTitle}`, margin, margin + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(82, 96, 117);
  pdf.text(
    `Exported ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`,
    pageWidth - margin,
    margin + 8,
    { align: "right" }
  );

  const aspect = rect.height / rect.width;
  let drawW = availW;
  let drawH = drawW * aspect;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH / aspect;
  }
  const offsetX = margin + (availW - drawW) / 2;
  pdf.addImage(dataUrl, "PNG", offsetX, margin + 22, drawW, drawH);
  pdf.save(`${safeSlug(title)}.pdf`);
  return true;
}

export function exportRowsCsv(
  columns: string[],
  rows: (string | number | boolean)[][],
  title: string
): void {
  const escapeCsv = (val: string | number | boolean) => {
    if (typeof val === "number") {
      return Number.isFinite(val) ? String(val) : "";
    }
    if (typeof val === "boolean") {
      return val ? "TRUE" : "FALSE";
    }
    const safe = neutralizeSpreadsheetFormula(String(val ?? ""));
    if (/[",\n\r]/.test(safe)) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };
  const lines = [
    columns.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ];
  // UTF-8 BOM ensures Excel opens Unicode cleanly on Windows
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, `${safeSlug(title)}.csv`);
}

export async function exportRowsXlsx(
  columns: string[],
  rows: (string | number | boolean)[][],
  title: string
): Promise<void> {
  if (columns.length === 0) return;
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const headerRow = columns.map((col) => ({
    value: neutralizeSpreadsheetFormula(String(col ?? "")),
    fontWeight: "bold" as const,
    backgroundColor: "#00338D",
    color: "#FFFFFF",
  }));
  const bodyRows = rows.map((r) =>
    r.map((cell) => {
      if (typeof cell === "number") {
        return Number.isFinite(cell)
          ? { type: Number, value: cell }
          : { type: String, value: "" };
      }
      if (typeof cell === "boolean") {
        return { type: Boolean, value: cell };
      }
      return {
        type: String,
        value: neutralizeSpreadsheetFormula(String(cell ?? "")),
      };
    })
  );

  await writeXlsxFile([headerRow, ...bodyRows], {
    sheet: "Dashboard Data",
  }).toFile(`${safeSlug(title)}.xlsx`);
}

export function exportDashboardJson(dashboard: DashboardDocument): void {
  const exportPayload = {
    schemaVersion: "kpmg-cfo-dashboard-v1",
    exportedAt: new Date().toISOString(),
    title: dashboard.title,
    description: dashboard.description,
    refreshIntervalSec: dashboard.refreshIntervalSec,
    pages: dashboard.pages,
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  triggerDownload(blob, `${safeSlug(dashboard.title)}.dashboard.json`);
}

export interface ValidatedDashboardImport {
  title: string;
  description: string;
  refreshIntervalSec: 0 | 10 | 30 | 60;
  pages: DashboardPage[];
  widgetCount: number;
}

export function validateImportedDashboardJson(
  rawText: string
): ValidatedDashboardImport {
  if (rawText.length > 1_000_000) {
    throw new Error("Dashboard JSON exceeds maximum allowed size (1 MB).");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Dashboard JSON must be an object.");
  }

  const obj = parsed as Record<string, unknown>;
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim().slice(0, 120)
      : "Imported Dashboard";
  const description =
    typeof obj.description === "string" ? obj.description.trim().slice(0, 500) : "";

  if (!Array.isArray(obj.pages) || obj.pages.length === 0) {
    throw new Error("Dashboard JSON must contain a non-empty pages array.");
  }
  if (obj.pages.length > 20) {
    throw new Error("Imported dashboard cannot exceed 20 pages.");
  }

  let widgetCount = 0;
  const seenPageIds = new Set<string>();
  const seenWidgetIds = new Set<string>();

  const pages: DashboardPage[] = obj.pages.map((p, idx) => {
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      throw new Error(`Page #${idx + 1} is invalid.`);
    }
    const pageObj = p as Record<string, unknown>;
    let pageId =
      typeof pageObj.id === "string" && pageObj.id.trim()
        ? pageObj.id.trim().slice(0, 64)
        : `pg_imp_${idx + 1}`;
    if (seenPageIds.has(pageId)) {
      pageId = `pg_imp_${idx + 1}_${seenPageIds.size}`;
    }
    seenPageIds.add(pageId);

    const rawWidgets = Array.isArray(pageObj.widgets) ? pageObj.widgets : [];
    if (rawWidgets.length > 50) {
      throw new Error(`Page #${idx + 1} exceeds 50 widgets maximum.`);
    }

    const widgets: DashboardWidget[] = rawWidgets.map((rw, wIdx) => {
      if (!rw || typeof rw !== "object" || Array.isArray(rw)) {
        throw new Error(`Widget #${wIdx + 1} on page #${idx + 1} is invalid.`);
      }
      const w = rw as Record<string, unknown>;
      const rawType = typeof w.type === "string" ? w.type : "";
      if (!(rawType in VISUAL_CATALOG_MAP)) {
        throw new Error(
          `Widget #${wIdx + 1} on page #${idx + 1} has unsupported visual type "${rawType}".`
        );
      }
      const type = rawType as WidgetVisualType;
      const meta = VISUAL_CATALOG_MAP[type];

      const rawDs = typeof w.datasetId === "string" ? w.datasetId : "telemetry_events";
      if (!(rawDs in SEMANTIC_DATASET_MAP)) {
        throw new Error(
          `Widget #${wIdx + 1} on page #${idx + 1} has unsupported datasetId "${rawDs}".`
        );
      }
      const datasetId = rawDs as DatasetId;

      let wid =
        typeof w.id === "string" && w.id.trim()
          ? w.id.trim().slice(0, 64)
          : `wgt_imp_${idx + 1}_${wIdx + 1}`;
      if (seenWidgetIds.has(wid)) {
        wid = `wgt_imp_${idx + 1}_${wIdx + 1}_${seenWidgetIds.size}`;
      }
      seenWidgetIds.add(wid);

      const rawLayout =
        w.layout && typeof w.layout === "object"
          ? (w.layout as Record<string, unknown>)
          : {};
      const layout = clampRect(
        {
          x: typeof rawLayout.x === "number" ? rawLayout.x : 0,
          y: typeof rawLayout.y === "number" ? rawLayout.y : 0,
          w: typeof rawLayout.w === "number" ? rawLayout.w : meta.defaultSize.w,
          h: typeof rawLayout.h === "number" ? rawLayout.h : meta.defaultSize.h,
        },
        meta.minSize.w,
        meta.minSize.h
      );

      const defaults = createDefaultWidgetStyle(type);
      const rawStyle =
        w.style && typeof w.style === "object"
          ? (w.style as Record<string, unknown>)
          : {};
      const rawEnc =
        w.encoding && typeof w.encoding === "object"
          ? (w.encoding as Record<string, unknown>)
          : {};

      const palette: PalettePresetId =
        typeof rawStyle.palette === "string" && rawStyle.palette in PALETTE_PRESETS
          ? (rawStyle.palette as PalettePresetId)
          : defaults.palette;

      return {
        id: wid,
        type,
        title:
          typeof w.title === "string" && w.title.trim()
            ? w.title.trim().slice(0, 120)
            : meta.label,
        subtitle:
          typeof w.subtitle === "string" ? w.subtitle.trim().slice(0, 200) : "",
        datasetId,
        layout,
        encoding: {
          x: (rawEnc.x as DashboardWidget["encoding"]["x"]) || null,
          y: Array.isArray(rawEnc.y) ? rawEnc.y : [],
          secondaryY: Array.isArray(rawEnc.secondaryY) ? rawEnc.secondaryY : [],
          series: (rawEnc.series as DashboardWidget["encoding"]["series"]) || null,
          size: (rawEnc.size as DashboardWidget["encoding"]["size"]) || null,
          source: (rawEnc.source as DashboardWidget["encoding"]["source"]) || null,
          target: (rawEnc.target as DashboardWidget["encoding"]["target"]) || null,
          hierarchy: Array.isArray(rawEnc.hierarchy) ? rawEnc.hierarchy : [],
          rows: Array.isArray(rawEnc.rows) ? rawEnc.rows : [],
          columns: Array.isArray(rawEnc.columns) ? rawEnc.columns : [],
          values: Array.isArray(rawEnc.values) ? rawEnc.values : [],
          kpiTarget:
            typeof rawEnc.kpiTarget === "number" && Number.isFinite(rawEnc.kpiTarget)
              ? rawEnc.kpiTarget
              : null,
          slicerField:
            (rawEnc.slicerField as DashboardWidget["encoding"]["slicerField"]) || null,
          filters: Array.isArray(rawEnc.filters) ? rawEnc.filters : [],
          sort:
            rawEnc.sort === "value_desc" ||
            rawEnc.sort === "value_asc" ||
            rawEnc.sort === "label_asc" ||
            rawEnc.sort === "label_desc"
              ? rawEnc.sort
              : "none",
          topN:
            typeof rawEnc.topN === "number" && Number.isFinite(rawEnc.topN) && rawEnc.topN >= 1
              ? Math.min(100, Math.floor(rawEnc.topN))
              : null,
        },
        style: {
          ...defaults,
          ...(rawStyle as Partial<DashboardWidget["style"]>),
          palette,
          referenceLines: Array.isArray(rawStyle.referenceLines)
            ? rawStyle.referenceLines
            : [],
          conditionalRules: Array.isArray(rawStyle.conditionalRules)
            ? rawStyle.conditionalRules
            : [],
        },
      };
    });

    widgetCount += widgets.length;
    return {
      id: pageId,
      title:
        typeof pageObj.title === "string" && pageObj.title.trim()
          ? pageObj.title.trim().slice(0, 60)
          : `Page ${idx + 1}`,
      widgets,
    };
  });

  const refresh =
    obj.refreshIntervalSec === 10 ||
    obj.refreshIntervalSec === 30 ||
    obj.refreshIntervalSec === 60
      ? obj.refreshIntervalSec
      : 0;

  return {
    title,
    description,
    refreshIntervalSec: refresh,
    pages,
    widgetCount,
  };
}
