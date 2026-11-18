"use client";

import {
  AlignLeft,
  ChartBar,
  ChartBarHorizontal,
  ChartDonut,
  ChartLine,
  ChartLineUp,
  ChartPie,
  ChartPieSlice,
  ChartPolar,
  ChartScatter,
  Columns,
  Faders,
  FlowArrow,
  Funnel,
  Gauge,
  GitBranch,
  GridFour,
  Hash,
  CalendarBlank,
  SlidersHorizontal,
  SquaresFour,
  Table,
  TextAa,
  TextHOne,
  TrendUp,
  WaveSine,
} from "@phosphor-icons/react";
import { WidgetVisualType } from "@/lib/dashboards/types";

interface VisualIconProps {
  type: WidgetVisualType;
  size?: number;
  className?: string;
}

export function VisualIcon({ type, size = 16, className = "" }: VisualIconProps) {
  const props = { size, weight: "light" as const, className };

  switch (type) {
    case "kpi_card":
      return <Hash {...props} />;
    case "multi_kpi_card":
      return <Columns {...props} />;
    case "text_callout":
      return <TextAa {...props} />;
    case "section_header":
      return <TextHOne {...props} />;
    case "bar_clustered":
    case "bar_stacked":
    case "bar_percent_stacked":
    case "histogram":
      return <ChartBar {...props} />;
    case "bar_horizontal":
    case "bar_horizontal_stacked":
    case "bar_horizontal_percent":
    case "lollipop":
    case "bullet":
      return <ChartBarHorizontal {...props} />;
    case "line":
    case "line_smooth":
    case "line_step":
    case "slope_ribbon":
      return <ChartLine {...props} />;
    case "area":
    case "area_stacked":
    case "area_percent_stacked":
    case "combo_bar_line":
      return <ChartLineUp {...props} />;
    case "streamgraph":
      return <WaveSine {...props} />;
    case "candlestick":
    case "boxplot":
      return <Faders {...props} />;
    case "pie":
      return <ChartPie {...props} />;
    case "donut":
      return <ChartDonut {...props} />;
    case "nightingale_rose":
      return <ChartPieSlice {...props} />;
    case "treemap":
      return <SquaresFour {...props} />;
    case "sunburst":
    case "radar":
      return <ChartPolar {...props} />;
    case "decomposition_tree":
      return <GitBranch {...props} />;
    case "waterfall":
      return <TrendUp {...props} />;
    case "funnel":
      return <Funnel {...props} />;
    case "sankey":
      return <FlowArrow {...props} />;
    case "scatter":
    case "bubble":
    case "parallel":
      return <ChartScatter {...props} />;
    case "heatmap":
      return <GridFour {...props} />;
    case "calendar_heatmap":
    case "slicer_date":
      return <CalendarBlank {...props} />;
    case "gauge_radial":
    case "gauge_arc":
    case "progress_ring":
      return <Gauge {...props} />;
    case "data_table":
      return <Table {...props} />;
    case "pivot_matrix":
      return <GridFour {...props} />;
    case "slicer_category":
      return <AlignLeft {...props} />;
    case "slicer_numeric":
      return <SlidersHorizontal {...props} />;
    default:
      return <ChartBar {...props} />;
  }
}
