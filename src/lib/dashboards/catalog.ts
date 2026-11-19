import {
  DashboardWidget,
  DatasetId,
  GridRect,
  PalettePresetId,
  SemanticDatasetDef,
  SemanticFieldDef,
  VisualCategory,
  WidgetStyle,
  WidgetVisualType,
} from "./types";

export type ShelfSlotId =
  | "x"
  | "y"
  | "secondaryY"
  | "series"
  | "size"
  | "source"
  | "target"
  | "hierarchy"
  | "rows"
  | "columns"
  | "values"
  | "slicerField"
  | "filters";

export interface ShelfSpec {
  id: ShelfSlotId;
  label: string;
  hint: string;
  multiple: boolean;
  accepts: ("dimension" | "measure" | "datetime" | "boolean")[];
  required?: boolean;
}

export interface VisualCatalogItem {
  type: WidgetVisualType;
  label: string;
  shortLabel: string;
  category: VisualCategory;
  description: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  renderer: "echarts" | "kpi_callout" | "table_pivot" | "slicer";
  supportsCrossFilter: boolean;
  supportsDrillThrough: boolean;
  supportsTargetValue?: boolean;
  shelves: ShelfSpec[];
}

export const VISUAL_CATEGORY_META: {
  id: VisualCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "kpi_callout",
    label: "KPI Boxes & Callouts",
    description: "Headline metric boxes, scorecards, narrative text, and section headers",
  },
  {
    id: "comparison",
    label: "Comparison & Ranking",
    description: "Clustered, stacked, 100% stacked columns/bars, lollipop, and bullet charts",
  },
  {
    id: "trend",
    label: "Trend & Time-Series",
    description: "Line, spline, step, area, dual-axis combo, streamgraph, and candlestick",
  },
  {
    id: "part_to_whole",
    label: "Part-to-Whole & Hierarchy",
    description: "Pie, donut, rose, treemap, sunburst, and decomposition trees",
  },
  {
    id: "flow_bridge",
    label: "Flow & Financial Bridge",
    description: "Waterfall bridge, funnel, Sankey flow, and slope/ribbon rankings",
  },
  {
    id: "distribution",
    label: "Distribution & Statistical",
    description: "Scatter, bubble, boxplot, histogram, heatmaps, radar, and parallel plots",
  },
  {
    id: "gauge",
    label: "Gauges & Progress",
    description: "Radial speedometer, semi-circle arc, and circular progress rings",
  },
  {
    id: "table_matrix",
    label: "Tables & Pivot Matrices",
    description: "Interactive data tables with data bars and Excel-style pivot matrices",
  },
  {
    id: "slicer",
    label: "Interactive Slicers",
    description: "On-canvas category, date range, and numeric slider page filters",
  },
];

const SHELF_X_CAT: ShelfSpec = {
  id: "x",
  label: "X-Axis / Category",
  hint: "Drop a Dimension or Date field",
  multiple: false,
  accepts: ["dimension", "datetime", "boolean", "measure"],
  required: true,
};

const SHELF_X_TIME: ShelfSpec = {
  id: "x",
  label: "Time / Sequence Axis",
  hint: "Drop a Date/Time or Dimension field",
  multiple: false,
  accepts: ["datetime", "dimension", "boolean", "measure"],
  required: true,
};

const SHELF_X_NUM: ShelfSpec = {
  id: "x",
  label: "X-Axis Measure",
  hint: "Drop a numeric Measure",
  multiple: false,
  accepts: ["measure", "datetime", "dimension"],
  required: true,
};

const SHELF_Y_MULTI: ShelfSpec = {
  id: "y",
  label: "Y-Axis / Values",
  hint: "Drop one or more Measures",
  multiple: true,
  accepts: ["measure", "dimension", "boolean"],
  required: true,
};

const SHELF_Y_SINGLE: ShelfSpec = {
  id: "y",
  label: "Value / Measure",
  hint: "Drop a Measure to aggregate",
  multiple: false,
  accepts: ["measure", "dimension", "boolean"],
  required: true,
};

const SHELF_SECONDARY_Y: ShelfSpec = {
  id: "secondaryY",
  label: "Line Series (Right Y)",
  hint: "Drop a Measure for the right axis line",
  multiple: true,
  accepts: ["measure"],
};

const SHELF_SERIES: ShelfSpec = {
  id: "series",
  label: "Legend / Color Split",
  hint: "Drop a Dimension to split series",
  multiple: false,
  accepts: ["dimension", "boolean", "datetime"],
};

const SHELF_SIZE: ShelfSpec = {
  id: "size",
  label: "Bubble Size",
  hint: "Drop a numeric Measure for size",
  multiple: false,
  accepts: ["measure"],
};

const SHELF_FILTERS: ShelfSpec = {
  id: "filters",
  label: "Widget Filters",
  hint: "Drop any field to filter this visual",
  multiple: true,
  accepts: ["dimension", "measure", "datetime", "boolean"],
};

export const VISUAL_CATALOG: VisualCatalogItem[] = [
  // A. KPI Boxes & Executive Callouts (4)
  {
    type: "kpi_card",
    label: "KPI Number Box",
    shortLabel: "KPI Card",
    category: "kpi_callout",
    description: "Headline metric card with tabular figures, period variance, sparkline, and target status",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
    renderer: "kpi_callout",
    supportsCrossFilter: false,
    supportsDrillThrough: true,
    supportsTargetValue: true,
    shelves: [
      SHELF_Y_SINGLE,
      {
        id: "x",
        label: "Sparkline Time Axis",
        hint: "Optional Date/Time field for trend sparkline",
        multiple: false,
        accepts: ["datetime", "dimension"],
      },
      SHELF_FILTERS,
    ],
  },
  {
    type: "multi_kpi_card",
    label: "Multi-Metric Scorecard",
    shortLabel: "Scorecard",
    category: "kpi_callout",
    description: "Executive strip displaying 2 to 6 live aggregated measures side by side",
    defaultSize: { w: 12, h: 5 },
    minSize: { w: 6, h: 4 },
    renderer: "kpi_callout",
    supportsCrossFilter: false,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "y",
        label: "Scorecard Measures",
        hint: "Drop 2 to 6 Measures",
        multiple: true,
        accepts: ["measure", "dimension", "boolean"],
        required: true,
      },
      SHELF_FILTERS,
    ],
  },
  {
    type: "text_callout",
    label: "Executive Narrative Box",
    shortLabel: "Text Callout",
    category: "kpi_callout",
    description: "Editorial commentary box supporting dynamic {{value}} metric interpolation",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    renderer: "kpi_callout",
    supportsCrossFilter: false,
    supportsDrillThrough: false,
    shelves: [
      {
        id: "y",
        label: "Inline Metric Tokens",
        hint: "Optional Measures referenced as {{1}}, {{2}}",
        multiple: true,
        accepts: ["measure", "dimension"],
      },
      SHELF_FILTERS,
    ],
  },
  {
    type: "section_header",
    label: "Section Banner",
    shortLabel: "Section Header",
    category: "kpi_callout",
    description: "Structural KPMG divider header to organize multi-section executive pages",
    defaultSize: { w: 24, h: 2 },
    minSize: { w: 6, h: 2 },
    renderer: "kpi_callout",
    supportsCrossFilter: false,
    supportsDrillThrough: false,
    shelves: [],
  },

  // B. Comparison & Ranking (8)
  {
    type: "bar_clustered",
    label: "Clustered Column Chart",
    shortLabel: "Clustered Col",
    category: "comparison",
    description: "Vertical grouped columns comparing values across categories",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "bar_horizontal",
    label: "Clustered Bar Chart",
    shortLabel: "Horizontal Bar",
    category: "comparison",
    description: "Horizontal bars ideal for top-N rankings and long category labels",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "bar_stacked",
    label: "Stacked Column Chart",
    shortLabel: "Stacked Col",
    category: "comparison",
    description: "Vertical stacked columns showing category totals and series breakdown",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "bar_horizontal_stacked",
    label: "Stacked Bar Chart",
    shortLabel: "Stacked Bar",
    category: "comparison",
    description: "Horizontal stacked bars for compositional rankings",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "bar_percent_stacked",
    label: "100% Stacked Column",
    shortLabel: "100% Col",
    category: "comparison",
    description: "Normalized vertical share columns summing to 100% per category",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "bar_horizontal_percent",
    label: "100% Stacked Bar",
    shortLabel: "100% Bar",
    category: "comparison",
    description: "Normalized horizontal share bars summing to 100% per category",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "lollipop",
    label: "Lollipop Ranking Chart",
    shortLabel: "Lollipop",
    category: "comparison",
    description: "High-precision stem-and-dot visual minimizing ink density for ranked comparisons",
    defaultSize: { w: 10, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "bullet",
    label: "Executive Bullet Chart",
    shortLabel: "Bullet",
    category: "comparison",
    description: "Actual metric bar overlaid against qualitative threshold bands and target marker",
    defaultSize: { w: 12, h: 7 },
    minSize: { w: 6, h: 5 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    supportsTargetValue: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },

  // C. Trend & Time-Series (9)
  {
    type: "line",
    label: "Line Chart",
    shortLabel: "Line",
    category: "trend",
    description: "Continuous straight-segment trend line across time or ordered categories",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "line_smooth",
    label: "Smooth Spline Chart",
    shortLabel: "Smooth Line",
    category: "trend",
    description: "Curved monotone spline line highlighting directional velocity",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "line_step",
    label: "Step Line Chart",
    shortLabel: "Step Line",
    category: "trend",
    description: "Discrete step transitions for rate, policy, or state changes over time",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "area",
    label: "Area Chart",
    shortLabel: "Area",
    category: "trend",
    description: "Shaded trend curve emphasizing cumulative magnitude",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "area_stacked",
    label: "Stacked Area Chart",
    shortLabel: "Stacked Area",
    category: "trend",
    description: "Cumulative multi-series area showing volume composition over time",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "area_percent_stacked",
    label: "100% Stacked Area",
    shortLabel: "100% Area",
    category: "trend",
    description: "Proportional share shifts over time normalized to 100%",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "combo_bar_line",
    label: "Dual-Axis Combo Chart",
    shortLabel: "Combo Bar+Line",
    category: "trend",
    description: "Columns on left Y-axis paired with trend line on right Y-axis",
    defaultSize: { w: 14, h: 9 },
    minSize: { w: 8, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_MULTI, SHELF_SECONDARY_Y, SHELF_FILTERS],
  },
  {
    type: "streamgraph",
    label: "Streamgraph (ThemeRiver)",
    shortLabel: "Streamgraph",
    category: "trend",
    description: "Flowing organic multi-category volume bands across time",
    defaultSize: { w: 14, h: 9 },
    minSize: { w: 8, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_SINGLE, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "candlestick",
    label: "OHLC / Candlestick Range",
    shortLabel: "Candlestick",
    category: "trend",
    description: "Open, Close, Min, Max metric envelope computed per time bucket or category",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 8, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_SINGLE, SHELF_FILTERS],
  },

  // D. Part-to-Whole & Hierarchy (6)
  {
    type: "pie",
    label: "Pie Chart",
    shortLabel: "Pie",
    category: "part_to_whole",
    description: "Proportional circular breakdown across discrete categories",
    defaultSize: { w: 8, h: 9 },
    minSize: { w: 5, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "donut",
    label: "Donut Chart",
    shortLabel: "Donut",
    category: "part_to_whole",
    description: "Ring composition chart with centered aggregated KPI total",
    defaultSize: { w: 8, h: 9 },
    minSize: { w: 5, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "nightingale_rose",
    label: "Nightingale Rose Chart",
    shortLabel: "Rose Chart",
    category: "part_to_whole",
    description: "Polar-area rose diagram encoding magnitude in radial petal length",
    defaultSize: { w: 8, h: 9 },
    minSize: { w: 5, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "treemap",
    label: "Hierarchical Treemap",
    shortLabel: "Treemap",
    category: "part_to_whole",
    description: "Nested proportional rectangles supporting multi-level drill-down",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "hierarchy",
        label: "Hierarchy Levels",
        hint: "Drop 1 to 3 Dimensions in drill order",
        multiple: true,
        accepts: ["dimension", "boolean", "datetime"],
        required: true,
      },
      SHELF_Y_SINGLE,
      SHELF_FILTERS,
    ],
  },
  {
    type: "sunburst",
    label: "Sunburst Ring Hierarchy",
    shortLabel: "Sunburst",
    category: "part_to_whole",
    description: "Concentric radial hierarchy rings for multi-level part-to-whole inspection",
    defaultSize: { w: 10, h: 10 },
    minSize: { w: 6, h: 7 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "hierarchy",
        label: "Ring Levels",
        hint: "Drop 1 to 3 Dimensions (inner to outer)",
        multiple: true,
        accepts: ["dimension", "boolean", "datetime"],
        required: true,
      },
      SHELF_Y_SINGLE,
      SHELF_FILTERS,
    ],
  },
  {
    type: "decomposition_tree",
    label: "Decomposition Tree",
    shortLabel: "Decomp Tree",
    category: "part_to_whole",
    description: "Power BI style root-to-leaf breakdown tree across ordered dimensions",
    defaultSize: { w: 14, h: 10 },
    minSize: { w: 8, h: 7 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "hierarchy",
        label: "Explain By Levels",
        hint: "Drop 1 to 3 Dimensions",
        multiple: true,
        accepts: ["dimension", "boolean"],
        required: true,
      },
      SHELF_Y_SINGLE,
      SHELF_FILTERS,
    ],
  },

  // E. Flow & Financial Bridge (4)
  {
    type: "waterfall",
    label: "Waterfall / Bridge Chart",
    shortLabel: "Waterfall",
    category: "flow_bridge",
    description: "Cumulative financial bridge highlighting incremental positive, negative, and total steps",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 7, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "funnel",
    label: "Funnel / Stage Chart",
    shortLabel: "Funnel",
    category: "flow_bridge",
    description: "Progressive conversion or pipeline volume across ordered stages",
    defaultSize: { w: 10, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "sankey",
    label: "Sankey Flow Diagram",
    shortLabel: "Sankey",
    category: "flow_bridge",
    description: "Proportional source-to-target flow ribbons tracing distribution pathways",
    defaultSize: { w: 14, h: 10 },
    minSize: { w: 8, h: 7 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "source",
        label: "Source Node",
        hint: "Drop origin Dimension",
        multiple: false,
        accepts: ["dimension", "boolean"],
        required: true,
      },
      {
        id: "target",
        label: "Target Node",
        hint: "Drop destination Dimension",
        multiple: false,
        accepts: ["dimension", "boolean"],
        required: true,
      },
      SHELF_Y_SINGLE,
      SHELF_FILTERS,
    ],
  },
  {
    type: "slope_ribbon",
    label: "Slope / Ribbon Rank Chart",
    shortLabel: "Ribbon Chart",
    category: "flow_bridge",
    description: "Rank movement and comparative slope lines across categories or periods",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 7, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_SINGLE, SHELF_SERIES, SHELF_FILTERS],
  },

  // F. Distribution & Statistical (8)
  {
    type: "scatter",
    label: "Scatter Plot",
    shortLabel: "Scatter",
    category: "distribution",
    description: "Two-variable correlation plot with optional linear regression trendline",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_NUM, SHELF_Y_SINGLE, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "bubble",
    label: "Bubble Chart",
    shortLabel: "Bubble",
    category: "distribution",
    description: "Three-dimensional numeric correlation using X, Y, Size, and Color",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_NUM, SHELF_Y_SINGLE, SHELF_SIZE, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "boxplot",
    label: "Box & Whisker Plot",
    shortLabel: "Boxplot",
    category: "distribution",
    description: "Statistical quartile distribution (Min, Q1, Median, Q3, Max) per category",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 7, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "histogram",
    label: "Frequency Histogram",
    shortLabel: "Histogram",
    category: "distribution",
    description: "Auto-binned numeric frequency distribution showing skew and outliers",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: false,
    supportsDrillThrough: true,
    shelves: [SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "heatmap",
    label: "Matrix Heatmap",
    shortLabel: "Heatmap",
    category: "distribution",
    description: "Two-dimensional color-intensity matrix across X and Y categories",
    defaultSize: { w: 12, h: 9 },
    minSize: { w: 7, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [
      SHELF_X_CAT,
      {
        id: "series",
        label: "Y-Axis Category",
        hint: "Drop a second Dimension for matrix rows",
        multiple: false,
        accepts: ["dimension", "boolean", "datetime"],
        required: true,
      },
      SHELF_Y_SINGLE,
      SHELF_FILTERS,
    ],
  },
  {
    type: "calendar_heatmap",
    label: "Calendar Activity Heatmap",
    shortLabel: "Calendar Map",
    category: "distribution",
    description: "Daily calendar grid shaded by live event count, tokens, or cost intensity",
    defaultSize: { w: 16, h: 7 },
    minSize: { w: 10, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_TIME, SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "radar",
    label: "Radar / Spider Chart",
    shortLabel: "Radar",
    category: "distribution",
    description: "Multi-axis spider polygon comparing profiles across dimensions or measures",
    defaultSize: { w: 10, h: 9 },
    minSize: { w: 6, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [SHELF_X_CAT, SHELF_Y_MULTI, SHELF_SERIES, SHELF_FILTERS],
  },
  {
    type: "parallel",
    label: "Parallel Coordinates",
    shortLabel: "Parallel Plot",
    category: "distribution",
    description: "High-dimensional profile lines across 3 to 6 continuous measures simultaneously",
    defaultSize: { w: 14, h: 9 },
    minSize: { w: 8, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: false,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "y",
        label: "Parallel Axes (2-6 Measures)",
        hint: "Drop 2 to 6 numeric Measures",
        multiple: true,
        accepts: ["measure"],
        required: true,
      },
      SHELF_SERIES,
      SHELF_FILTERS,
    ],
  },

  // G. Gauges & Progress (3)
  {
    type: "gauge_radial",
    label: "Radial Speedometer Gauge",
    shortLabel: "Radial Gauge",
    category: "gauge",
    description: "Full dial gauge tracking live KPI attainment against target threshold",
    defaultSize: { w: 8, h: 8 },
    minSize: { w: 5, h: 6 },
    renderer: "echarts",
    supportsCrossFilter: false,
    supportsDrillThrough: true,
    supportsTargetValue: true,
    shelves: [SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "gauge_arc",
    label: "Semi-Circle Arc Gauge",
    shortLabel: "Arc Gauge",
    category: "gauge",
    description: "180-degree executive gauge displaying progress toward target goal",
    defaultSize: { w: 8, h: 7 },
    minSize: { w: 5, h: 5 },
    renderer: "echarts",
    supportsCrossFilter: false,
    supportsDrillThrough: true,
    supportsTargetValue: true,
    shelves: [SHELF_Y_SINGLE, SHELF_FILTERS],
  },
  {
    type: "progress_ring",
    label: "Circular Progress Ring",
    shortLabel: "Progress Ring",
    category: "gauge",
    description: "Minimalist circular attainment ring with bold centered KPI readout",
    defaultSize: { w: 6, h: 7 },
    minSize: { w: 4, h: 5 },
    renderer: "echarts",
    supportsCrossFilter: false,
    supportsDrillThrough: true,
    supportsTargetValue: true,
    shelves: [SHELF_Y_SINGLE, SHELF_FILTERS],
  },

  // H. Tables & Pivot Matrices (2)
  {
    type: "data_table",
    label: "Interactive Data Table",
    shortLabel: "Data Table",
    category: "table_matrix",
    description: "Sortable, searchable tabular grid with Excel-style conditional data bars and audit inspect",
    defaultSize: { w: 16, h: 10 },
    minSize: { w: 8, h: 6 },
    renderer: "table_pivot",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "columns",
        label: "Table Columns",
        hint: "Drop Dimensions, Dates, or Measures as columns",
        multiple: true,
        accepts: ["dimension", "measure", "datetime", "boolean"],
        required: true,
      },
      SHELF_FILTERS,
    ],
  },
  {
    type: "pivot_matrix",
    label: "Pivot Matrix (Cross-Tab)",
    shortLabel: "Pivot Matrix",
    category: "table_matrix",
    description: "Excel PivotTable / Power BI Matrix with Row x Column grouping, subtotals, grand totals, and heat shading",
    defaultSize: { w: 16, h: 10 },
    minSize: { w: 8, h: 6 },
    renderer: "table_pivot",
    supportsCrossFilter: true,
    supportsDrillThrough: true,
    shelves: [
      {
        id: "rows",
        label: "Row Groups",
        hint: "Drop 1 to 2 Dimensions for matrix rows",
        multiple: true,
        accepts: ["dimension", "boolean", "datetime"],
        required: true,
      },
      {
        id: "columns",
        label: "Column Groups",
        hint: "Optional Dimension for matrix columns",
        multiple: true,
        accepts: ["dimension", "boolean", "datetime"],
      },
      {
        id: "values",
        label: "Aggregated Values",
        hint: "Drop 1 to 3 Measures to aggregate in cells",
        multiple: true,
        accepts: ["measure", "dimension", "boolean"],
        required: true,
      },
      SHELF_FILTERS,
    ],
  },

  // I. Interactive On-Canvas Slicers (3)
  {
    type: "slicer_category",
    label: "Category Slicer",
    shortLabel: "Category Slicer",
    category: "slicer",
    description: "On-canvas pill, checklist, or dropdown filter syncing all page visuals",
    defaultSize: { w: 6, h: 6 },
    minSize: { w: 4, h: 3 },
    renderer: "slicer",
    supportsCrossFilter: true,
    supportsDrillThrough: false,
    shelves: [
      {
        id: "slicerField",
        label: "Slicer Field",
        hint: "Drop a Dimension or Boolean field",
        multiple: false,
        accepts: ["dimension", "boolean"],
        required: true,
      },
    ],
  },
  {
    type: "slicer_date",
    label: "Date Range Slicer",
    shortLabel: "Date Slicer",
    category: "slicer",
    description: "Interactive start/end date filter with quick lookback buttons",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 6, h: 3 },
    renderer: "slicer",
    supportsCrossFilter: true,
    supportsDrillThrough: false,
    shelves: [
      {
        id: "slicerField",
        label: "Date/Time Field",
        hint: "Drop a Date/Time field",
        multiple: false,
        accepts: ["datetime"],
        required: true,
      },
    ],
  },
  {
    type: "slicer_numeric",
    label: "Numeric Range Slicer",
    shortLabel: "Range Slicer",
    category: "slicer",
    description: "Min/max numeric range filter for tokens, latency, cost, or counts",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 6, h: 3 },
    renderer: "slicer",
    supportsCrossFilter: true,
    supportsDrillThrough: false,
    shelves: [
      {
        id: "slicerField",
        label: "Numeric Field",
        hint: "Drop a numeric Measure",
        multiple: false,
        accepts: ["measure"],
        required: true,
      },
    ],
  },
];

export const VISUAL_CATALOG_MAP: Record<WidgetVisualType, VisualCatalogItem> =
  VISUAL_CATALOG.reduce((acc, item) => {
    acc[item.type] = item;
    return acc;
  }, {} as Record<WidgetVisualType, VisualCatalogItem>);

export const PALETTE_PRESETS: Record<
  PalettePresetId,
  { label: string; colors: string[] }
> = {
  kpmg_institutional: {
    label: "KPMG Institutional",
    colors: ["#00338D", "#1E49E2", "#00B8F5", "#009A44", "#7213EA", "#0C233C", "#526075", "#FD349C"],
  },
  cobalt_pacific: {
    label: "Cobalt & Pacific",
    colors: ["#00338D", "#1E49E2", "#005EB8", "#0091DA", "#00B8F5", "#48C9B0", "#0C233C", "#7A93B2"],
  },
  emerald_navy: {
    label: "Emerald & Navy",
    colors: ["#009A44", "#0C233C", "#00338D", "#10B981", "#1E49E2", "#059669", "#334155", "#00B8F5"],
  },
  executive_mono: {
    label: "Executive Slate",
    colors: ["#0C233C", "#00338D", "#334155", "#526075", "#64748B", "#94A3B8", "#1E49E2", "#CBD5E1"],
  },
  rag_status: {
    label: "Governance RAG",
    colors: ["#009A44", "#D97706", "#B91C1C", "#00338D", "#1E49E2", "#526075", "#00B8F5", "#7213EA"],
  },
};

export const SEMANTIC_DATASETS: SemanticDatasetDef[] = [
  {
    id: "telemetry_events",
    label: "Live Audit & Telemetry Events",
    shortLabel: "Telemetry Events",
    description: "Real-time AI execution spans, token spend, latency, models, and SOX signoff events",
    fields: [
      { key: "__record_count", label: "Event Count", dataType: "measure", defaultAggregation: "count", defaultFormat: "integer", description: "Count of telemetry audit events" },
      { key: "estimated_cost_usd", label: "Estimated Cost (USD)", dataType: "measure", defaultAggregation: "sum", defaultFormat: "currency_usd", description: "Computed AI inference cost in USD" },
      { key: "total_tokens", label: "Total Tokens", dataType: "measure", defaultAggregation: "sum", defaultFormat: "tokens", description: "Combined prompt, completion, and reasoning tokens" },
      { key: "prompt_tokens", label: "Prompt Tokens", dataType: "measure", defaultAggregation: "sum", defaultFormat: "tokens", description: "Input context tokens consumed" },
      { key: "completion_tokens", label: "Completion Tokens", dataType: "measure", defaultAggregation: "sum", defaultFormat: "tokens", description: "Generated output tokens" },
      { key: "reasoning_tokens", label: "Reasoning Tokens", dataType: "measure", defaultAggregation: "sum", defaultFormat: "tokens", description: "Extended reasoning tokens" },
      { key: "duration_ms", label: "Latency (ms)", dataType: "measure", defaultAggregation: "avg", defaultFormat: "duration_ms", description: "End-to-end execution duration in milliseconds" },
      { key: "time_to_first_token_ms", label: "TTFT (ms)", dataType: "measure", defaultAggregation: "avg", defaultFormat: "duration_ms", description: "Time to first token in milliseconds" },
      { key: "confidence_score", label: "Confidence Score", dataType: "measure", defaultAggregation: "avg", defaultFormat: "percent", description: "Model extraction confidence ratio (0 to 1)" },
      { key: "document_pages", label: "Document Pages", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Pages processed in document intake" },
      { key: "step_sequence", label: "Step Sequence", dataType: "measure", defaultAggregation: "avg", defaultFormat: "integer", description: "Ordinal pipeline step index" },
      { key: "http_status_code", label: "HTTP Status", dataType: "measure", defaultAggregation: "avg", defaultFormat: "integer", description: "API response HTTP code" },
      { key: "temperature", label: "Model Temperature", dataType: "measure", defaultAggregation: "avg", defaultFormat: "decimal_2", description: "Sampling temperature setting" },
      { key: "created_at", label: "Captured Timestamp", dataType: "datetime", defaultAggregation: "count", defaultFormat: "auto", description: "Immutable event capture timestamp" },
      { key: "timestamp_start", label: "Execution Start", dataType: "datetime", defaultAggregation: "count", defaultFormat: "auto", description: "Pipeline span start timestamp" },
      { key: "product_name", label: "Platform Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Connected advisory platform name" },
      { key: "product_id", label: "Platform ID", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Registered product identifier" },
      { key: "model_name", label: "AI Model", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Underlying foundation model identifier" },
      { key: "ai_provider", label: "AI Provider", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Model hosting provider" },
      { key: "action_status", label: "Action Status", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Execution status (SUCCESS, FAILED, STARTED, etc.)" },
      { key: "action_name", label: "Action Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Specific autonomous action executed" },
      { key: "workflow_name", label: "Workflow Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Business workflow classification" },
      { key: "step_name", label: "Pipeline Step", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Execution stage name" },
      { key: "target_entity_type", label: "Entity Type", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Target financial object type (e.g. INVOICE)" },
      { key: "target_entity_id", label: "Entity ID", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Specific document or invoice identifier" },
      { key: "signoff_status", label: "SOX Signoff Status", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Governance signoff state" },
      { key: "environment", label: "Environment", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Runtime tier (production, staging, development)" },
      { key: "tenant_id", label: "Tenant ID", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Client tenant identifier" },
      { key: "engagement_code", label: "Engagement Code", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "KPMG advisory engagement code" },
      { key: "user_email", label: "Actor Email", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Authenticated user email" },
      { key: "user_role", label: "Actor Role", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Actor governance role" },
      { key: "finish_reason", label: "Finish Reason", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "LLM completion finish reason" },
      { key: "pii_masked_flag", label: "PII Masked", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Whether sensitive financial PII was redacted" },
      { key: "requires_human_signoff", label: "Requires Signoff", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Whether DOA human approval is required" },
    ],
  },
  {
    id: "registered_products",
    label: "Connected Platforms Registry",
    shortLabel: "Platforms",
    description: "Physically deployed KPMG CFO Advisory connected platforms and architecture metadata",
    fields: [
      { key: "__record_count", label: "Platform Count", dataType: "measure", defaultAggregation: "count", defaultFormat: "integer", description: "Number of registered platforms" },
      { key: "entitledCompanyCount", label: "Entitled Organizations", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Count of client organizations entitled to this platform" },
      { key: "entitledPersonaCount", label: "Authorized Personas", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Count of client personas with authorized access to this platform" },
      { key: "totalTokens", label: "Total Tokens Consumed", dataType: "measure", defaultAggregation: "sum", defaultFormat: "tokens", description: "Cumulative LLM tokens consumed by this platform" },
      { key: "avgDailyTokens", label: "Avg Daily Token Spend", dataType: "measure", defaultAggregation: "avg", defaultFormat: "tokens", description: "Average daily LLM tokens consumed across active days" },
      { key: "totalCostUsd", label: "Total AI Cost (USD)", dataType: "measure", defaultAggregation: "sum", defaultFormat: "currency_usd", description: "Cumulative AI inference spend for this platform in USD" },
      { key: "totalRuns", label: "Execution Spans", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Total execution spans logged for this platform" },
      { key: "tagCount", label: "Capability Tags", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Number of integration tags" },
      { key: "featureCount", label: "Core Features", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Number of platform features" },
      { key: "portFrontend", label: "Frontend Port", dataType: "measure", defaultAggregation: "avg", defaultFormat: "integer", description: "Frontend service port" },
      { key: "portBackend", label: "Backend Port", dataType: "measure", defaultAggregation: "avg", defaultFormat: "integer", description: "Backend API port" },
      { key: "name", label: "Platform Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Full platform display title" },
      { key: "shortName", label: "Short Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Compact platform label" },
      { key: "pillar", label: "Advisory Pillar", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "CFO Advisory practice pillar" },
      { key: "status", label: "Operational Status", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Live status (active, beta, maintenance)" },
      { key: "systemIntegration", label: "ERP Integrations", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Connected enterprise systems" },
      { key: "createdAt", label: "Registered Date", dataType: "datetime", defaultAggregation: "count", defaultFormat: "auto", description: "Platform registration timestamp" },
    ],
  },
  {
    id: "client_companies",
    label: "Client Organizations",
    shortLabel: "Companies",
    description: "Onboarded client organizations, account status, and live entitlement coverage",
    fields: [
      { key: "__record_count", label: "Company Count", dataType: "measure", defaultAggregation: "count", defaultFormat: "integer", description: "Count of client organizations" },
      { key: "enabledProductCount", label: "Enabled Platforms", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Active product entitlements per company" },
      { key: "personaCount", label: "Authorized Personas", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "Provisioned user personas per company" },
      { key: "name", label: "Company Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Client organization name" },
      { key: "code", label: "Client Code", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Unique client governance code" },
      { key: "status", label: "Account Status", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Governance status (active or suspended)" },
      { key: "contactEmail", label: "Primary Contact", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Lead client contact email" },
      { key: "entitledProductNames", label: "Entitled Platforms", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Names of platforms enabled for this organization" },
      { key: "createdAt", label: "Onboarded Date", dataType: "datetime", defaultAggregation: "count", defaultFormat: "auto", description: "Company onboarding timestamp" },
    ],
  },
  {
    id: "client_personas",
    label: "Authorized Client Personas",
    shortLabel: "Personas",
    description: "Role-scoped client identities, product access modes, and RBAC permission flags",
    fields: [
      { key: "__record_count", label: "Persona Count", dataType: "measure", defaultAggregation: "count", defaultFormat: "integer", description: "Count of client personas" },
      { key: "allowedProductCount", label: "Entitled Platforms", dataType: "measure", defaultAggregation: "avg", defaultFormat: "integer", description: "Effective platform count accessible by persona" },
      { key: "enabledPermissionCount", label: "Active Permissions", dataType: "measure", defaultAggregation: "avg", defaultFormat: "integer", description: "Number of ON permissions (0 to 4)" },
      { key: "name", label: "Persona Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Client user display name" },
      { key: "roleTitle", label: "Role Title", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Executive or operational role title" },
      { key: "companyName", label: "Company Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Parent client organization" },
      { key: "productAccessMode", label: "Access Mode", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "all or custom product scope" },
      { key: "effectiveProductNames", label: "Accessible Platforms", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Platforms accessible by this persona" },
      { key: "canLaunchProducts", label: "Can Launch", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Platform launch permission" },
      { key: "canViewAudit", label: "Can View Audit", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Audit telemetry permission" },
      { key: "canManageDashboards", label: "Can Manage Dashboards", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Dashboard authoring permission" },
      { key: "canExportData", label: "Can Export Data", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Data & visual export permission" },
      { key: "createdAt", label: "Created Date", dataType: "datetime", defaultAggregation: "count", defaultFormat: "auto", description: "Persona provisioning timestamp" },
    ],
  },
  {
    id: "product_entitlements",
    label: "Platform Entitlements Matrix",
    shortLabel: "Entitlements",
    description: "Live ON/OFF governance toggles mapping client companies to connected platforms",
    fields: [
      { key: "__record_count", label: "Entitlement Count", dataType: "measure", defaultAggregation: "count", defaultFormat: "integer", description: "Count of company-platform entitlement records" },
      { key: "enabledNumeric", label: "Active Flag (1/0)", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "1 when enabled, 0 when disabled" },
      { key: "companyName", label: "Company Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Entitled client organization" },
      { key: "productName", label: "Platform Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Entitled connected platform" },
      { key: "grantedBy", label: "Granted By", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Authorizing KPMG lead" },
      { key: "enabled", label: "Enabled", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Whether access is currently ON" },
      { key: "grantedAt", label: "Granted Date", dataType: "datetime", defaultAggregation: "count", defaultFormat: "auto", description: "Last entitlement update timestamp" },
    ],
  },
  {
    id: "product_access_matrix",
    label: "Product Access Governance Matrix",
    shortLabel: "Access Matrix",
    description: "Granular persona-to-platform access mapping, permissions, and effective entitlement status",
    fields: [
      { key: "__record_count", label: "Access Records", dataType: "measure", defaultAggregation: "count", defaultFormat: "integer", description: "Count of persona-platform access assignments" },
      { key: "isEntitledNumeric", label: "Active Access (1/0)", dataType: "measure", defaultAggregation: "sum", defaultFormat: "integer", description: "1 when persona has active operational access, 0 otherwise" },
      { key: "companyName", label: "Company Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Client organization name" },
      { key: "companyCode", label: "Client Code", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Unique client governance code" },
      { key: "companyStatus", label: "Company Status", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Company account status (active or suspended)" },
      { key: "personaName", label: "Persona Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Client user display name" },
      { key: "personaEmail", label: "User Email", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Authenticated persona email address" },
      { key: "roleTitle", label: "Role Title", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Executive or operational role title" },
      { key: "productName", label: "Platform Name", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Connected advisory platform title" },
      { key: "productId", label: "Platform ID", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Unique product identifier" },
      { key: "accessStatus", label: "Access Status", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Effective access state (Active, Restricted, Disabled, Suspended)" },
      { key: "productAccessMode", label: "Access Mode", dataType: "dimension", defaultAggregation: "count", defaultFormat: "auto", description: "Persona scope mode (all or custom)" },
      { key: "isEntitled", label: "Is Entitled", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Whether persona currently holds active access" },
      { key: "canLaunch", label: "Can Launch", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Permission to launch and run the product" },
      { key: "canViewAudit", label: "Can View Audit", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Permission to view product audit and telemetry" },
      { key: "canManageDashboards", label: "Can Manage Dashboards", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Permission to author and manage dashboards" },
      { key: "canExportData", label: "Can Export Data", dataType: "boolean", defaultAggregation: "count", defaultFormat: "auto", description: "Permission to export reports and telemetry" },
      { key: "grantedBy", label: "Granted By", dataType: "dimension", defaultAggregation: "count_distinct", defaultFormat: "auto", description: "Authorizing KPMG lead" },
      { key: "grantedAt", label: "Governance Timestamp", dataType: "datetime", defaultAggregation: "count", defaultFormat: "auto", description: "Last entitlement or profile update timestamp" },
    ],
  },
];

export const SEMANTIC_DATASET_MAP: Record<DatasetId, SemanticDatasetDef> =
  SEMANTIC_DATASETS.reduce((acc, ds) => {
    acc[ds.id] = ds;
    return acc;
  }, {} as Record<DatasetId, SemanticDatasetDef>);

export function getFieldDef(
  datasetId: DatasetId,
  fieldKey: string
): SemanticFieldDef | undefined {
  return SEMANTIC_DATASET_MAP[datasetId]?.fields.find((f) => f.key === fieldKey);
}

export function createDefaultWidgetStyle(type: WidgetVisualType): WidgetStyle {
  return {
    palette: "kpmg_institutional",
    numberFormat: "auto",
    showLabels: type === "pie" || type === "donut" || type === "funnel" || type === "waterfall",
    showLegend:
      type !== "kpi_card" &&
      type !== "multi_kpi_card" &&
      type !== "text_callout" &&
      type !== "section_header" &&
      type !== "gauge_radial" &&
      type !== "gauge_arc" &&
      type !== "progress_ring",
    legendPosition: "top",
    showGridlines: true,
    showTrendline: false,
    showSparkline: type === "kpi_card",
    showDataBars: type === "data_table",
    showColorScale: type === "pivot_matrix",
    slicerStyle: "pills",
    slicerMultiSelect: true,
    accentColor: "#00338D",
    textContent:
      type === "text_callout"
        ? "Executive Observation: Drag a measure into Inline Metric Tokens and reference it as {{1}} to embed live figures."
        : "",
    referenceLines: [],
    conditionalRules: [],
    yAxisMin: null,
    yAxisMax: null,
  };
}

export function createBlankWidget(
  type: WidgetVisualType,
  datasetId: DatasetId,
  layout: GridRect,
  id: string
): DashboardWidget {
  const meta = VISUAL_CATALOG_MAP[type];
  return {
    id,
    type,
    title: meta.label,
    subtitle: "",
    datasetId,
    layout,
    encoding: {
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
      kpiTarget: null,
      slicerField: null,
      filters: [],
      sort: "none",
      topN: null,
    },
    style: createDefaultWidgetStyle(type),
  };
}
