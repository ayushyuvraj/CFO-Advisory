"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { ECharts, EChartsOption } from "echarts";
import { ChartBar } from "@phosphor-icons/react";
import { compileWidgetToEChartsOption } from "@/lib/dashboards/echartsCompiler";
import { exportEChartPng, exportEChartSvg } from "@/lib/dashboards/exportUtils";
import { DashboardWidget, RawDataRow } from "@/lib/dashboards/types";

export interface EChartSurfaceHandle {
  exportPng: () => boolean;
  exportSvg: () => Promise<boolean>;
}

interface EChartSurfaceProps {
  widget: DashboardWidget;
  rows: RawDataRow[];
  onCrossFilterSelect?: (field: string, value: string) => void;
}

export const EChartSurface = forwardRef<EChartSurfaceHandle, EChartSurfaceProps>(
  function EChartSurface({ widget, rows, onCrossFilterSelect }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ECharts | null>(null);
    const onCrossFilterRef = useRef(onCrossFilterSelect);

    useEffect(() => {
      onCrossFilterRef.current = onCrossFilterSelect;
    }, [onCrossFilterSelect]);

    const compiled = useMemo(
      () => compileWidgetToEChartsOption(widget, rows),
      [widget, rows]
    );

    const crossFilterFieldRef = useRef(compiled.crossFilterField);
    useEffect(() => {
      crossFilterFieldRef.current = compiled.crossFilterField;
    }, [compiled.crossFilterField]);

    useImperativeHandle(
      ref,
      () => ({
        exportPng: () => exportEChartPng(chartRef.current, widget.title),
        exportSvg: async () => {
          if (!compiled.option) return false;
          const rect = containerRef.current?.getBoundingClientRect();
          return exportEChartSvg(
            compiled.option as Record<string, unknown>,
            rect?.width || 640,
            rect?.height || 380,
            widget.title
          );
        },
      }),
      [compiled.option, widget.title]
    );

    useEffect(() => {
      const el = containerRef.current;
      if (!el || !compiled.option) {
        if (chartRef.current && !chartRef.current.isDisposed()) {
          chartRef.current.dispose();
          chartRef.current = null;
        }
        return;
      }

      let disposed = false;
      let resizeObserver: ResizeObserver | null = null;
      let rafId = 0;

      const initAndRender = async () => {
        const echarts = await import("echarts");
        if (disposed || !containerRef.current) return;

        let instance = chartRef.current;
        if (!instance || instance.isDisposed()) {
          instance = echarts.init(containerRef.current, undefined, {
            renderer: "canvas",
          });
          chartRef.current = instance;

          instance.on("click", (params: Record<string, unknown>) => {
            if (!onCrossFilterRef.current) return;
            const dataObj =
              params.data && typeof params.data === "object"
                ? (params.data as Record<string, unknown>)
                : null;

            // Respect explicit ignore flag (e.g., Waterfall Total, Decomp Root, Linear Trend)
            if (dataObj?._cfIgnore === true) return;

            // Prefer explicit per-item _cfField / _cfValue metadata attached by compiler
            if (
              typeof dataObj?._cfField === "string" &&
              dataObj._cfField &&
              typeof dataObj?._cfValue === "string"
            ) {
              onCrossFilterRef.current(dataObj._cfField, dataObj._cfValue);
              return;
            }

            // Fallback to chart-level crossFilterField with exact params.name (no destructive trim)
            const field = crossFilterFieldRef.current;
            if (!field) return;
            if (typeof params.name === "string" && params.name.length > 0) {
              onCrossFilterRef.current(field, params.name);
            }
          });
        }

        instance.setOption(compiled.option as EChartsOption, {
          notMerge: true,
          lazyUpdate: true,
        });

        resizeObserver = new ResizeObserver(() => {
          if (rafId) window.cancelAnimationFrame(rafId);
          rafId = window.requestAnimationFrame(() => {
            if (chartRef.current && !chartRef.current.isDisposed()) {
              chartRef.current.resize();
            }
          });
        });
        resizeObserver.observe(containerRef.current);
      };

      void initAndRender();

      return () => {
        disposed = true;
        if (rafId) window.cancelAnimationFrame(rafId);
        if (resizeObserver) resizeObserver.disconnect();
      };
    }, [compiled.option]);

    useEffect(() => {
      return () => {
        if (chartRef.current && !chartRef.current.isDisposed()) {
          chartRef.current.dispose();
          chartRef.current = null;
        }
      };
    }, []);

    if (!compiled.option) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC]/80 px-4 py-6 text-center">
          <ChartBar size={24} weight="light" className="text-[#94A3B8]" />
          <p className="mt-2 max-w-[260px] text-xs font-medium text-[#526075]">
            {compiled.emptyReason ||
              "Drag fields from the Data pane into this visual's shelves."}
          </p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="h-full w-full min-h-[120px]"
        data-echarts-surface="true"
      />
    );
  }
);
