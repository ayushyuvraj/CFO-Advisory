import path from "path";
import crypto from "crypto";
import {
  mutateJsonFile,
  readJsonStrict,
  resolveDataDir,
} from "@/lib/storage/jsonFileStore";
import {
  createDefaultWidgetStyle,
  PALETTE_PRESETS,
  SEMANTIC_DATASET_MAP,
  VISUAL_CATALOG_MAP,
} from "./catalog";
import { clampRect } from "./gridLayout";
import {
  CreateDashboardInput,
  DashboardActor,
  DashboardDocument,
  DashboardPage,
  DashboardStoreFile,
  DashboardVisibility,
  DashboardWidget,
  DatasetId,
  FieldBinding,
  PalettePresetId,
  UpdateDashboardInput,
  WidgetFilterRule,
  WidgetVisualType,
} from "./types";

const MAX_PAGES = 20;
const MAX_WIDGETS_PER_PAGE = 50;

export const INBUILT_DASHBOARD_ID = "dsh_inbuilt_executive_governance";

export function createInbuiltExecutiveDashboard(): DashboardDocument {
  const now = "2026-11-19T12:00:00.000Z";
  return {
    id: INBUILT_DASHBOARD_ID,
    title: "Executive Command · Product Adoption & Governance",
    description:
      "Institutional executive overview providing real-time visibility into product users, client adoption, token spend, and access governance.",
    ownerType: "kpmg",
    ownerUserId: "usr-kpmg-lead",
    ownerName: "KPMG Lead",
    visibility: "kpmg_only",
    assignedCompanyIds: [],
    refreshIntervalSec: 0,
    isInbuilt: true,
    createdAt: now,
    updatedAt: now,
    pages: [
      {
        id: "pg_exec_governance_main",
        title: "Product Adoption & Governance",
        widgets: [
          // Row 0: Section Header
          {
            id: "wgt_inbuilt_header",
            type: "section_header",
            title: "KPMG Executive Command Center · Product Adoption & Governance",
            subtitle:
              "Institutional oversight of connected platform adoption, authorized client personas, granular access matrices, and real-time AI token telemetry.",
            datasetId: "product_access_matrix",
            layout: { x: 0, y: 0, w: 24, h: 2 },
            encoding: { y: [], filters: [] },
            style: {
              ...createDefaultWidgetStyle("section_header"),
              textContent: "KPMG Executive Command Center · Product Adoption & Governance",
            },
          },

          // Row 1: 6 KPI Cards (y = 2, h = 4)
          {
            id: "wgt_kpi_companies",
            type: "kpi_card",
            title: "Client Organizations",
            subtitle: "Onboarded enterprise clients",
            datasetId: "client_companies",
            layout: { x: 0, y: 2, w: 4, h: 4 },
            encoding: {
              y: [{ field: "__record_count", aggregation: "count" }],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("kpi_card"),
              numberFormat: "integer",
              showSparkline: false,
            },
          },
          {
            id: "wgt_kpi_personas",
            type: "kpi_card",
            title: "Authorized Personas",
            subtitle: "Provisioned client identities",
            datasetId: "client_personas",
            layout: { x: 4, y: 2, w: 4, h: 4 },
            encoding: {
              y: [{ field: "__record_count", aggregation: "count" }],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("kpi_card"),
              numberFormat: "integer",
              showSparkline: false,
            },
          },
          {
            id: "wgt_kpi_entitled_users",
            type: "kpi_card",
            title: "Authorized Users (Invoice P2P)",
            subtitle: "Users with live platform access",
            datasetId: "product_access_matrix",
            layout: { x: 8, y: 2, w: 4, h: 4 },
            encoding: {
              y: [{ field: "isEntitledNumeric", aggregation: "sum" }],
              filters: [
                {
                  id: "f_prod_invoice",
                  field: "productId",
                  operator: "eq",
                  values: ["invoice-processing-p2p"],
                },
              ],
            },
            style: {
              ...createDefaultWidgetStyle("kpi_card"),
              numberFormat: "integer",
              showSparkline: false,
            },
          },
          {
            id: "wgt_kpi_daily_tokens",
            type: "kpi_card",
            title: "Avg Daily Token Spend",
            subtitle: "Active daily inference velocity",
            datasetId: "registered_products",
            layout: { x: 12, y: 2, w: 4, h: 4 },
            encoding: {
              y: [{ field: "avgDailyTokens", aggregation: "sum" }],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("kpi_card"),
              numberFormat: "tokens",
              showSparkline: false,
            },
          },
          {
            id: "wgt_kpi_total_tokens",
            type: "kpi_card",
            title: "Total Tokens Consumed",
            subtitle: "Audit telemetry cumulative",
            datasetId: "telemetry_events",
            layout: { x: 16, y: 2, w: 4, h: 4 },
            encoding: {
              y: [{ field: "total_tokens", aggregation: "sum" }],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("kpi_card"),
              numberFormat: "tokens",
              showSparkline: false,
            },
          },
          {
            id: "wgt_kpi_total_cost",
            type: "kpi_card",
            title: "Estimated AI Cost",
            subtitle: "Inference expenditure (USD)",
            datasetId: "telemetry_events",
            layout: { x: 20, y: 2, w: 4, h: 4 },
            encoding: {
              y: [{ field: "estimated_cost_usd", aggregation: "sum" }],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("kpi_card"),
              numberFormat: "currency_usd",
              showSparkline: false,
            },
          },

          // Row 2: Visual Comparison & Trend Charts (y = 6, h = 9)
          {
            id: "wgt_bar_product_adoption",
            type: "bar_clustered",
            title: "Product Adoption: Authorized Personas & Entitled Clients",
            subtitle: "Breakdown of authorized users and entitled organizations across physical platforms",
            datasetId: "registered_products",
            layout: { x: 0, y: 6, w: 12, h: 9 },
            encoding: {
              x: { field: "name" },
              y: [
                { field: "entitledPersonaCount", aggregation: "sum" },
                { field: "entitledCompanyCount", aggregation: "sum" },
              ],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("bar_clustered"),
              palette: "kpmg_institutional",
              showLabels: true,
              showLegend: true,
            },
          },
          {
            id: "wgt_area_token_trend",
            type: "area",
            title: "Daily AI Token Consumption Trend",
            subtitle: "Time-series of daily LLM token consumption across audit execution spans",
            datasetId: "telemetry_events",
            layout: { x: 12, y: 6, w: 12, h: 9 },
            encoding: {
              x: { field: "created_at", dateBucket: "day" },
              y: [{ field: "total_tokens", aggregation: "sum" }],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("area"),
              palette: "cobalt_pacific",
              showLabels: false,
              showLegend: true,
            },
          },

          // Row 3: Access Governance Matrix Table (y = 15, h = 10)
          {
            id: "wgt_table_access_matrix",
            type: "data_table",
            title: "Access Governance Matrix · Who Has Access to What",
            subtitle: "Persona-level platform access mapping with effective operational status and granular permissions",
            datasetId: "product_access_matrix",
            layout: { x: 0, y: 15, w: 24, h: 10 },
            encoding: {
              y: [],
              columns: [
                { field: "companyName" },
                { field: "personaName" },
                { field: "roleTitle" },
                { field: "personaEmail" },
                { field: "productName" },
                { field: "accessStatus" },
                { field: "canLaunch" },
                { field: "canViewAudit" },
                { field: "canManageDashboards" },
              ],
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("data_table"),
              showDataBars: false,
            },
          },

          // Row 4: Slicers (y = 25, h = 4)
          {
            id: "wgt_slicer_platform",
            type: "slicer_category",
            title: "Filter by Platform",
            subtitle: "Cross-filter page by connected product",
            datasetId: "product_access_matrix",
            layout: { x: 0, y: 25, w: 8, h: 4 },
            encoding: {
              y: [],
              slicerField: { field: "productName" },
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("slicer_category"),
              slicerStyle: "pills",
              slicerMultiSelect: true,
            },
          },
          {
            id: "wgt_slicer_company",
            type: "slicer_category",
            title: "Filter by Client Organization",
            subtitle: "Cross-filter page by client company",
            datasetId: "product_access_matrix",
            layout: { x: 8, y: 25, w: 8, h: 4 },
            encoding: {
              y: [],
              slicerField: { field: "companyName" },
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("slicer_category"),
              slicerStyle: "pills",
              slicerMultiSelect: true,
            },
          },
          {
            id: "wgt_slicer_status",
            type: "slicer_category",
            title: "Filter by Access Status",
            subtitle: "Filter by Active, Restricted, Disabled, Suspended",
            datasetId: "product_access_matrix",
            layout: { x: 16, y: 25, w: 8, h: 4 },
            encoding: {
              y: [],
              slicerField: { field: "accessStatus" },
              filters: [],
            },
            style: {
              ...createDefaultWidgetStyle("slicer_category"),
              slicerStyle: "pills",
              slicerMultiSelect: true,
            },
          },
        ],
      },
    ],
  };
}

function getDashboardsFile(): string {
  return path.join(resolveDataDir(), "cfo_dashboards_store.json");
}

function createEmptyStore(): DashboardStoreFile {
  return { dashboards: [createInbuiltExecutiveDashboard()] };
}

function validateStoreFile(raw: unknown): DashboardStoreFile {
  const parsed = raw as Partial<DashboardStoreFile>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Dashboards store file is corrupted.");
  }
  const list = Array.isArray(parsed.dashboards) ? parsed.dashboards : [];
  if (!list.some((d) => d && d.id === INBUILT_DASHBOARD_ID)) {
    list.unshift(createInbuiltExecutiveDashboard());
  }
  return { dashboards: list };
}

function readStoreStrict(): DashboardStoreFile {
  return readJsonStrict(
    getDashboardsFile(),
    createEmptyStore,
    validateStoreFile
  );
}

export class DashboardStoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "DashboardStoreError";
    this.status = status;
  }
}

export function canActorViewDashboard(
  actor: DashboardActor,
  doc: DashboardDocument
): boolean {
  if (actor.tenantType === "kpmg") {
    return true;
  }
  if (!actor.permissions.canManageDashboards) {
    return false;
  }
  const companyId = actor.companyId;
  if (!companyId) return false;

  if (doc.ownerType === "client" && doc.ownerCompanyId === companyId) {
    return true;
  }
  if (doc.ownerType === "kpmg") {
    if (doc.visibility === "all_clients") return true;
    if (
      doc.visibility === "specific_companies" &&
      doc.assignedCompanyIds.includes(companyId)
    ) {
      return true;
    }
  }
  return false;
}

export function canActorEditDashboard(
  actor: DashboardActor,
  doc: DashboardDocument
): boolean {
  if (actor.isPreviewMode) return false;
  if (actor.tenantType === "kpmg") {
    return true;
  }
  if (!actor.permissions.canManageDashboards) return false;
  return doc.ownerType === "client" && doc.ownerCompanyId === actor.companyId;
}

export function canActorCreateDashboard(actor: DashboardActor): boolean {
  if (actor.isPreviewMode) return false;
  if (actor.tenantType === "kpmg") return true;
  return Boolean(actor.companyId && actor.permissions.canManageDashboards);
}

function sanitizeBinding(raw: unknown, datasetId: DatasetId): FieldBinding | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const field = typeof obj.field === "string" ? obj.field.trim() : "";
  if (!field) return null;
  const allowedFields = SEMANTIC_DATASET_MAP[datasetId]?.fields || [];
  if (!allowedFields.some((f) => f.key === field)) return null;
  return {
    field,
    label:
      typeof obj.label === "string" ? obj.label.trim().slice(0, 80) : undefined,
    aggregation:
      typeof obj.aggregation === "string"
        ? (obj.aggregation as FieldBinding["aggregation"])
        : undefined,
    dateBucket:
      typeof obj.dateBucket === "string"
        ? (obj.dateBucket as FieldBinding["dateBucket"])
        : undefined,
    format:
      typeof obj.format === "string"
        ? (obj.format as FieldBinding["format"])
        : undefined,
  };
}

function sanitizeBindingList(raw: unknown, datasetId: DatasetId): FieldBinding[] {
  if (!Array.isArray(raw)) return [];
  const out: FieldBinding[] = [];
  for (const item of raw.slice(0, 12)) {
    const b = sanitizeBinding(item, datasetId);
    if (b) out.push(b);
  }
  return out;
}

function sanitizeWidget(raw: unknown, seenIds: Set<string>): DashboardWidget | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const rawType = typeof obj.type === "string" ? obj.type : "";
  if (!(rawType in VISUAL_CATALOG_MAP)) {
    throw new DashboardStoreError(`Invalid widget visual type: "${rawType}".`, 400);
  }
  const type = rawType as WidgetVisualType;
  const meta = VISUAL_CATALOG_MAP[type];

  const rawDataset =
    typeof obj.datasetId === "string" ? obj.datasetId : "telemetry_events";
  if (!(rawDataset in SEMANTIC_DATASET_MAP)) {
    throw new DashboardStoreError(`Invalid datasetId: "${rawDataset}".`, 400);
  }
  const datasetId = rawDataset as DatasetId;

  let id =
    typeof obj.id === "string" && obj.id.trim()
      ? obj.id.trim().slice(0, 64)
      : `wgt_${crypto.randomBytes(5).toString("hex")}`;
  if (seenIds.has(id)) {
    id = `wgt_${crypto.randomBytes(5).toString("hex")}`;
  }
  seenIds.add(id);

  const rawLayout =
    obj.layout && typeof obj.layout === "object"
      ? (obj.layout as Record<string, unknown>)
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

  const rawEnc =
    obj.encoding && typeof obj.encoding === "object"
      ? (obj.encoding as Record<string, unknown>)
      : {};
  const rawStyle =
    obj.style && typeof obj.style === "object"
      ? (obj.style as Record<string, unknown>)
      : {};

  const defaults = createDefaultWidgetStyle(type);
  const paletteCandidate =
    typeof rawStyle.palette === "string" && rawStyle.palette in PALETTE_PRESETS
      ? (rawStyle.palette as PalettePresetId)
      : defaults.palette;

  const rawFilters = Array.isArray(rawEnc.filters) ? rawEnc.filters : [];
  const filters: WidgetFilterRule[] = rawFilters
    .filter((f): f is WidgetFilterRule => Boolean(f && typeof f === "object"))
    .slice(0, 20)
    .map((f, i) => ({
      id: typeof f.id === "string" && f.id ? f.id.slice(0, 64) : `flt_${i}`,
      field: typeof f.field === "string" ? f.field.slice(0, 80) : "",
      operator: f.operator || "contains",
      values: Array.isArray(f.values) ? f.values.slice(0, 50) : [],
    }))
    .filter((f) => Boolean(f.field));

  return {
    id,
    type,
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim().slice(0, 120)
        : meta.label,
    subtitle:
      typeof obj.subtitle === "string" ? obj.subtitle.trim().slice(0, 200) : "",
    datasetId,
    layout,
    encoding: {
      x: sanitizeBinding(rawEnc.x, datasetId),
      y: sanitizeBindingList(rawEnc.y, datasetId),
      secondaryY: sanitizeBindingList(rawEnc.secondaryY, datasetId),
      series: sanitizeBinding(rawEnc.series, datasetId),
      size: sanitizeBinding(rawEnc.size, datasetId),
      source: sanitizeBinding(rawEnc.source, datasetId),
      target: sanitizeBinding(rawEnc.target, datasetId),
      hierarchy: sanitizeBindingList(rawEnc.hierarchy, datasetId).slice(0, 3),
      rows: sanitizeBindingList(rawEnc.rows, datasetId).slice(0, 2),
      columns: sanitizeBindingList(rawEnc.columns, datasetId),
      values: sanitizeBindingList(rawEnc.values, datasetId).slice(0, 3),
      kpiTarget:
        typeof rawEnc.kpiTarget === "number" && Number.isFinite(rawEnc.kpiTarget)
          ? rawEnc.kpiTarget
          : null,
      slicerField: sanitizeBinding(rawEnc.slicerField, datasetId),
      filters,
      sort:
        rawEnc.sort === "value_desc" ||
        rawEnc.sort === "value_asc" ||
        rawEnc.sort === "label_asc" ||
        rawEnc.sort === "label_desc"
          ? rawEnc.sort
          : "none",
      topN:
        typeof rawEnc.topN === "number" &&
        Number.isFinite(rawEnc.topN) &&
        rawEnc.topN >= 1
          ? Math.min(100, Math.floor(rawEnc.topN))
          : null,
    },
    style: {
      ...defaults,
      palette: paletteCandidate,
      numberFormat:
        typeof rawStyle.numberFormat === "string"
          ? (rawStyle.numberFormat as DashboardWidget["style"]["numberFormat"])
          : defaults.numberFormat,
      showLabels:
        typeof rawStyle.showLabels === "boolean"
          ? rawStyle.showLabels
          : defaults.showLabels,
      showLegend:
        typeof rawStyle.showLegend === "boolean"
          ? rawStyle.showLegend
          : defaults.showLegend,
      legendPosition:
        rawStyle.legendPosition === "top" ||
        rawStyle.legendPosition === "bottom" ||
        rawStyle.legendPosition === "left" ||
        rawStyle.legendPosition === "right" ||
        rawStyle.legendPosition === "none"
          ? rawStyle.legendPosition
          : defaults.legendPosition,
      showGridlines:
        typeof rawStyle.showGridlines === "boolean"
          ? rawStyle.showGridlines
          : defaults.showGridlines,
      showTrendline:
        typeof rawStyle.showTrendline === "boolean"
          ? rawStyle.showTrendline
          : defaults.showTrendline,
      showSparkline:
        typeof rawStyle.showSparkline === "boolean"
          ? rawStyle.showSparkline
          : defaults.showSparkline,
      showDataBars:
        typeof rawStyle.showDataBars === "boolean"
          ? rawStyle.showDataBars
          : defaults.showDataBars,
      showColorScale:
        typeof rawStyle.showColorScale === "boolean"
          ? rawStyle.showColorScale
          : defaults.showColorScale,
      slicerStyle:
        rawStyle.slicerStyle === "pills" ||
        rawStyle.slicerStyle === "checklist" ||
        rawStyle.slicerStyle === "dropdown"
          ? rawStyle.slicerStyle
          : defaults.slicerStyle,
      slicerMultiSelect:
        typeof rawStyle.slicerMultiSelect === "boolean"
          ? rawStyle.slicerMultiSelect
          : defaults.slicerMultiSelect,
      accentColor:
        typeof rawStyle.accentColor === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(rawStyle.accentColor)
          ? rawStyle.accentColor
          : defaults.accentColor,
      textContent:
        typeof rawStyle.textContent === "string"
          ? rawStyle.textContent.slice(0, 2000)
          : defaults.textContent,
      referenceLines: Array.isArray(rawStyle.referenceLines)
        ? rawStyle.referenceLines
            .filter((rl) => rl && typeof rl === "object")
            .slice(0, 10)
        : [],
      conditionalRules: Array.isArray(rawStyle.conditionalRules)
        ? rawStyle.conditionalRules
            .filter((cr) => cr && typeof cr === "object")
            .slice(0, 10)
        : [],
      yAxisMin:
        typeof rawStyle.yAxisMin === "number" && Number.isFinite(rawStyle.yAxisMin)
          ? rawStyle.yAxisMin
          : null,
      yAxisMax:
        typeof rawStyle.yAxisMax === "number" && Number.isFinite(rawStyle.yAxisMax)
          ? rawStyle.yAxisMax
          : null,
    },
  };
}

export function sanitizePages(pages?: unknown): DashboardPage[] {
  if (pages === undefined) {
    return [
      {
        id: `pg_${crypto.randomBytes(4).toString("hex")}`,
        title: "Page 1",
        widgets: [],
      },
    ];
  }
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new DashboardStoreError("pages must be a non-empty array.", 400);
  }
  if (pages.length > MAX_PAGES) {
    throw new DashboardStoreError(
      `Dashboards cannot exceed ${MAX_PAGES} pages.`,
      400
    );
  }

  const seenPageIds = new Set<string>();
  const seenWidgetIds = new Set<string>();

  return pages.map((rawPage, idx) => {
    if (!rawPage || typeof rawPage !== "object" || Array.isArray(rawPage)) {
      throw new DashboardStoreError(`Page #${idx + 1} is invalid.`, 400);
    }
    const p = rawPage as Record<string, unknown>;
    let pid =
      typeof p.id === "string" && p.id.trim()
        ? p.id.trim().slice(0, 64)
        : `pg_${crypto.randomBytes(4).toString("hex")}`;
    if (seenPageIds.has(pid)) {
      pid = `pg_${crypto.randomBytes(4).toString("hex")}`;
    }
    seenPageIds.add(pid);

    const rawWidgets = Array.isArray(p.widgets) ? p.widgets : [];
    if (rawWidgets.length > MAX_WIDGETS_PER_PAGE) {
      throw new DashboardStoreError(
        `Page #${idx + 1} cannot exceed ${MAX_WIDGETS_PER_PAGE} widgets.`,
        400
      );
    }
    const widgets: DashboardWidget[] = [];
    for (const rw of rawWidgets) {
      const sanitized = sanitizeWidget(rw, seenWidgetIds);
      if (sanitized) widgets.push(sanitized);
    }

    return {
      id: pid,
      title:
        typeof p.title === "string" && p.title.trim()
          ? p.title.trim().slice(0, 60)
          : `Page ${idx + 1}`,
      widgets,
    };
  });
}

function sanitizeRefreshInterval(val: unknown): 0 | 10 | 30 | 60 {
  if (val === 10 || val === 30 || val === 60) return val;
  return 0;
}

function sanitizeVisibility(
  actor: DashboardActor,
  requested?: DashboardVisibility
): DashboardVisibility {
  if (actor.tenantType === "client") {
    return "company_internal";
  }
  if (
    requested === "kpmg_only" ||
    requested === "specific_companies" ||
    requested === "all_clients"
  ) {
    return requested;
  }
  return "kpmg_only";
}

export function listDashboardsForActor(actor: DashboardActor): DashboardDocument[] {
  const store = readStoreStrict();
  return store.dashboards
    .filter((d) => canActorViewDashboard(actor, d))
    .sort((a, b) => {
      if (a.isInbuilt && !b.isInbuilt) return -1;
      if (!a.isInbuilt && b.isInbuilt) return 1;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
}

export function getDashboardByIdForActor(
  actor: DashboardActor,
  id: string
): DashboardDocument | null {
  const store = readStoreStrict();
  const found = store.dashboards.find((d) => d.id === id);
  if (!found || !canActorViewDashboard(actor, found)) return null;
  return found;
}

export function createDashboard(
  actor: DashboardActor,
  input: CreateDashboardInput
): DashboardDocument {
  if (!canActorCreateDashboard(actor)) {
    throw new DashboardStoreError(
      actor.isPreviewMode
        ? "Dashboard creation is disabled during read-only Preview Mode."
        : "Unauthorized: current persona cannot create dashboards.",
      403
    );
  }

  const cleanTitle = typeof input.title === "string" ? input.title.trim() : "";
  if (!cleanTitle) {
    throw new DashboardStoreError("Dashboard title is required.", 400);
  }

  const pages = sanitizePages(input.pages);
  const visibility = sanitizeVisibility(actor, input.visibility);
  const assignedCompanyIds =
    actor.tenantType === "kpmg" &&
    visibility === "specific_companies" &&
    Array.isArray(input.assignedCompanyIds)
      ? Array.from(
          new Set(
            input.assignedCompanyIds.filter(
              (cid): cid is string =>
                typeof cid === "string" && cid.trim().length > 0
            )
          )
        )
      : [];

  return mutateJsonFile(
    getDashboardsFile(),
    createEmptyStore,
    validateStoreFile,
    (store) => {
      const now = new Date().toISOString();
      const doc: DashboardDocument = {
        id: `dsh_${crypto.randomBytes(6).toString("hex")}`,
        title: cleanTitle.slice(0, 120),
        description:
          typeof input.description === "string"
            ? input.description.trim().slice(0, 500)
            : "",
        ownerType: actor.tenantType,
        ownerCompanyId: actor.tenantType === "client" ? actor.companyId : undefined,
        ownerCompanyName:
          actor.tenantType === "client" ? actor.companyName : undefined,
        ownerUserId: actor.userId,
        ownerName: actor.userName,
        visibility,
        assignedCompanyIds,
        refreshIntervalSec: sanitizeRefreshInterval(input.refreshIntervalSec),
        pages,
        createdAt: now,
        updatedAt: now,
      };
      return {
        next: { dashboards: [doc, ...store.dashboards] },
        result: doc,
      };
    }
  );
}

export function updateDashboard(
  actor: DashboardActor,
  id: string,
  input: UpdateDashboardInput
): DashboardDocument | null {
  const sanitizedPages =
    input.pages !== undefined ? sanitizePages(input.pages) : undefined;

  return mutateJsonFile(
    getDashboardsFile(),
    createEmptyStore,
    validateStoreFile,
    (store) => {
      const idx = store.dashboards.findIndex((d) => d.id === id);
      if (idx === -1) {
        return { next: store, result: null, skipWrite: true };
      }

      const existing = store.dashboards[idx];
      // Prevent cross-tenant ID existence oracle: invisible dashboards return 404
      if (!canActorViewDashboard(actor, existing)) {
        return { next: store, result: null, skipWrite: true };
      }
      if (!canActorEditDashboard(actor, existing)) {
        throw new DashboardStoreError(
          "Forbidden: you do not have edit permissions for this dashboard.",
          403
        );
      }

      let nextTitle = existing.title;
      if (input.title !== undefined) {
        if (typeof input.title !== "string" || !input.title.trim()) {
          throw new DashboardStoreError("Dashboard title cannot be empty.", 400);
        }
        nextTitle = input.title.trim().slice(0, 120);
      }

      const nextDescription =
        input.description !== undefined
          ? typeof input.description === "string"
            ? input.description.trim().slice(0, 500)
            : existing.description
          : existing.description;

      const nextVisibility =
        input.visibility !== undefined
          ? sanitizeVisibility(actor, input.visibility)
          : existing.visibility;

      let nextAssigned = existing.assignedCompanyIds;
      if (actor.tenantType === "kpmg") {
        if (nextVisibility !== "specific_companies") {
          nextAssigned = [];
        } else if (input.assignedCompanyIds !== undefined) {
          nextAssigned = Array.isArray(input.assignedCompanyIds)
            ? Array.from(
                new Set(
                  input.assignedCompanyIds.filter(
                    (cid): cid is string =>
                      typeof cid === "string" && cid.trim().length > 0
                  )
                )
              )
            : [];
        }
      } else {
        nextAssigned = [];
      }

      const updated: DashboardDocument = {
        ...existing,
        title: nextTitle,
        description: nextDescription,
        visibility: nextVisibility,
        assignedCompanyIds: nextAssigned,
        refreshIntervalSec:
          input.refreshIntervalSec !== undefined
            ? sanitizeRefreshInterval(input.refreshIntervalSec)
            : existing.refreshIntervalSec,
        pages: sanitizedPages ?? existing.pages,
        updatedAt: new Date().toISOString(),
      };

      const nextList = [...store.dashboards];
      nextList[idx] = updated;
      return { next: { dashboards: nextList }, result: updated };
    }
  );
}

export function deleteDashboard(actor: DashboardActor, id: string): boolean {
  return mutateJsonFile(
    getDashboardsFile(),
    createEmptyStore,
    validateStoreFile,
    (store) => {
      const existing = store.dashboards.find((d) => d.id === id);
      if (!existing || !canActorViewDashboard(actor, existing)) {
        return { next: store, result: false, skipWrite: true };
      }
      if (existing.id === INBUILT_DASHBOARD_ID || existing.isInbuilt) {
        throw new DashboardStoreError(
          "The Inbuilt Executive Command Dashboard cannot be deleted. You can edit its layout or use Reset to Default.",
          400
        );
      }
      if (!canActorEditDashboard(actor, existing)) {
        throw new DashboardStoreError(
          "Forbidden: you do not have permission to delete this dashboard.",
          403
        );
      }
      return {
        next: { dashboards: store.dashboards.filter((d) => d.id !== id) },
        result: true,
      };
    }
  );
}

export function resetInbuiltDashboard(actor: DashboardActor): DashboardDocument {
  if (actor.tenantType !== "kpmg") {
    throw new DashboardStoreError(
      "Only KPMG Leads can reset the inbuilt dashboard.",
      403
    );
  }
  return mutateJsonFile(
    getDashboardsFile(),
    createEmptyStore,
    validateStoreFile,
    (store) => {
      const fresh = createInbuiltExecutiveDashboard();
      const filtered = store.dashboards.filter((d) => d.id !== INBUILT_DASHBOARD_ID);
      return {
        next: { dashboards: [fresh, ...filtered] },
        result: fresh,
      };
    }
  );
}

export function duplicateDashboard(
  actor: DashboardActor,
  id: string
): DashboardDocument | null {
  if (!canActorCreateDashboard(actor)) {
    throw new DashboardStoreError(
      "Unauthorized: current persona cannot duplicate dashboards.",
      403
    );
  }

  return mutateJsonFile(
    getDashboardsFile(),
    createEmptyStore,
    validateStoreFile,
    (store) => {
      const source = store.dashboards.find((d) => d.id === id);
      if (!source || !canActorViewDashboard(actor, source)) {
        return { next: store, result: null, skipWrite: true };
      }

      const now = new Date().toISOString();
      const clonedPages: DashboardPage[] = source.pages.map((p) => ({
        id: `pg_${crypto.randomBytes(4).toString("hex")}`,
        title: p.title,
        widgets: p.widgets.map((w) => ({
          ...JSON.parse(JSON.stringify(w)),
          id: `wgt_${crypto.randomBytes(5).toString("hex")}`,
        })),
      }));

      const clone: DashboardDocument = {
        id: `dsh_${crypto.randomBytes(6).toString("hex")}`,
        title: `${source.title} (Copy)`.slice(0, 120),
        description: source.description,
        ownerType: actor.tenantType,
        ownerCompanyId: actor.tenantType === "client" ? actor.companyId : undefined,
        ownerCompanyName:
          actor.tenantType === "client" ? actor.companyName : undefined,
        ownerUserId: actor.userId,
        ownerName: actor.userName,
        visibility: actor.tenantType === "kpmg" ? "kpmg_only" : "company_internal",
        assignedCompanyIds: [],
        refreshIntervalSec: source.refreshIntervalSec,
        pages: clonedPages,
        createdAt: now,
        updatedAt: now,
      };

      return {
        next: { dashboards: [clone, ...store.dashboards] },
        result: clone,
      };
    }
  );
}
