export type DatasetId =
  | "telemetry_events"
  | "registered_products"
  | "client_companies"
  | "client_personas"
  | "product_entitlements";

export type FieldDataType = "dimension" | "measure" | "datetime" | "boolean";

export type AggregationFn =
  | "sum"
  | "avg"
  | "count"
  | "count_distinct"
  | "min"
  | "max"
  | "median"
  | "pct_of_total"
  | "running_total";

export type DateBucket =
  | "raw"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year";

export type NumberFormatKind =
  | "auto"
  | "integer"
  | "decimal_2"
  | "currency_usd"
  | "percent"
  | "percent_100"
  | "compact"
  | "duration_ms"
  | "tokens";

export type VisualCategory =
  | "kpi_callout"
  | "comparison"
  | "trend"
  | "part_to_whole"
  | "flow_bridge"
  | "distribution"
  | "gauge"
  | "table_matrix"
  | "slicer";

export type WidgetVisualType =
  // A. KPI Boxes & Executive Callouts (4)
  | "kpi_card"
  | "multi_kpi_card"
  | "text_callout"
  | "section_header"
  // B. Comparison & Ranking (8)
  | "bar_clustered"
  | "bar_horizontal"
  | "bar_stacked"
  | "bar_horizontal_stacked"
  | "bar_percent_stacked"
  | "bar_horizontal_percent"
  | "lollipop"
  | "bullet"
  // C. Trend & Time-Series (9)
  | "line"
  | "line_smooth"
  | "line_step"
  | "area"
  | "area_stacked"
  | "area_percent_stacked"
  | "combo_bar_line"
  | "streamgraph"
  | "candlestick"
  // D. Part-to-Whole & Hierarchy (6)
  | "pie"
  | "donut"
  | "nightingale_rose"
  | "treemap"
  | "sunburst"
  | "decomposition_tree"
  // E. Flow & Financial Bridge (4)
  | "waterfall"
  | "funnel"
  | "sankey"
  | "slope_ribbon"
  // F. Distribution & Statistical (8)
  | "scatter"
  | "bubble"
  | "boxplot"
  | "histogram"
  | "heatmap"
  | "calendar_heatmap"
  | "radar"
  | "parallel"
  // G. Gauges & Progress (3)
  | "gauge_radial"
  | "gauge_arc"
  | "progress_ring"
  // H. Tables & Pivot Matrices (2)
  | "data_table"
  | "pivot_matrix"
  // I. Interactive On-Canvas Slicers (3)
  | "slicer_category"
  | "slicer_date"
  | "slicer_numeric";

export interface FieldBinding {
  field: string;
  label?: string;
  aggregation?: AggregationFn;
  dateBucket?: DateBucket;
  format?: NumberFormatKind;
}

export interface WidgetFilterRule {
  id: string;
  field: string;
  operator: "in" | "not_in" | "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";
  values: (string | number | boolean)[];
}

export interface ReferenceLineConfig {
  id: string;
  label: string;
  value: number;
  color: string;
  dashed?: boolean;
}

export interface ConditionalFormatRule {
  id: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "between";
  value: number;
  valueMax?: number;
  color: string;
  label?: string;
}

export type SortDirection = "none" | "value_desc" | "value_asc" | "label_asc" | "label_desc";

export interface WidgetEncoding {
  x?: FieldBinding | null;
  y: FieldBinding[];
  secondaryY?: FieldBinding[];
  series?: FieldBinding | null;
  size?: FieldBinding | null;
  source?: FieldBinding | null;
  target?: FieldBinding | null;
  hierarchy?: FieldBinding[];
  rows?: FieldBinding[];
  columns?: FieldBinding[];
  values?: FieldBinding[];
  kpiTarget?: number | null;
  slicerField?: FieldBinding | null;
  filters: WidgetFilterRule[];
  sort?: SortDirection;
  topN?: number | null;
}

export type PalettePresetId =
  | "kpmg_institutional"
  | "cobalt_pacific"
  | "emerald_navy"
  | "executive_mono"
  | "rag_status";

export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface WidgetStyle {
  palette: PalettePresetId;
  numberFormat: NumberFormatKind;
  showLabels: boolean;
  showLegend: boolean;
  legendPosition: LegendPosition;
  showGridlines: boolean;
  showTrendline?: boolean;
  showSparkline?: boolean;
  showDataBars?: boolean;
  showColorScale?: boolean;
  slicerStyle?: "pills" | "checklist" | "dropdown";
  slicerMultiSelect?: boolean;
  accentColor?: string;
  textContent?: string;
  referenceLines: ReferenceLineConfig[];
  conditionalRules: ConditionalFormatRule[];
  yAxisMin?: number | null;
  yAxisMax?: number | null;
}

export interface GridRect {
  x: number; // 0..23 (24-column grid)
  y: number; // row index >= 0
  w: number; // 2..24
  h: number; // 2..40
}

export interface DashboardWidget {
  id: string;
  type: WidgetVisualType;
  title: string;
  subtitle?: string;
  datasetId: DatasetId;
  layout: GridRect;
  encoding: WidgetEncoding;
  style: WidgetStyle;
}

export interface DashboardPage {
  id: string;
  title: string;
  widgets: DashboardWidget[];
}

export type DashboardVisibility =
  | "kpmg_only"
  | "specific_companies"
  | "all_clients"
  | "company_internal";

export interface DashboardDocument {
  id: string;
  title: string;
  description: string;
  ownerType: "kpmg" | "client";
  ownerCompanyId?: string;
  ownerCompanyName?: string;
  ownerUserId: string;
  ownerName: string;
  visibility: DashboardVisibility;
  assignedCompanyIds: string[];
  refreshIntervalSec: 0 | 10 | 30 | 60;
  pages: DashboardPage[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStoreFile {
  dashboards: DashboardDocument[];
}

export interface SemanticFieldDef {
  key: string;
  label: string;
  dataType: FieldDataType;
  defaultAggregation: AggregationFn;
  defaultFormat: NumberFormatKind;
  description: string;
}

export interface SemanticDatasetDef {
  id: DatasetId;
  label: string;
  shortLabel: string;
  description: string;
  fields: SemanticFieldDef[];
}

export type RawDataRow = Record<string, string | number | boolean | null | undefined>;

export interface LiveDatasetsPayload {
  datasets: Record<DatasetId, RawDataRow[]>;
  restrictedDatasets: Partial<Record<DatasetId, string>>;
  fetchedAt: string;
}

export interface CrossFilterItem {
  sourceWidgetId: string;
  datasetId: DatasetId;
  field: string;
  operator: "in" | "range" | "date_range";
  values?: (string | number | boolean)[];
  min?: number | null;
  max?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  displayLabel: string;
}

export interface DashboardActor {
  tenantType: "kpmg" | "client";
  userId: string;
  userName: string;
  userEmail: string;
  isPreviewMode: boolean;
  companyId?: string;
  companyName?: string;
  personaId?: string;
  allowedProductIds: string[];
  permissions: {
    canLaunchProducts: boolean;
    canViewAudit: boolean;
    canManageDashboards: boolean;
    canExportData: boolean;
  };
}

export interface CreateDashboardInput {
  title: string;
  description?: string;
  visibility?: DashboardVisibility;
  assignedCompanyIds?: string[];
  pages?: DashboardPage[];
  refreshIntervalSec?: 0 | 10 | 30 | 60;
}

export interface UpdateDashboardInput {
  title?: string;
  description?: string;
  visibility?: DashboardVisibility;
  assignedCompanyIds?: string[];
  pages?: DashboardPage[];
  refreshIntervalSec?: 0 | 10 | 30 | 60;
}
