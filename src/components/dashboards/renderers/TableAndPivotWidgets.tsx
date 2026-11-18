"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GridFour,
  MagnifyingGlass,
  Table,
} from "@phosphor-icons/react";
import { getFieldDef } from "@/lib/dashboards/catalog";
import {
  buildPivotMatrix,
  formatCellLabel,
  formatMetricValue,
  readRowField,
  resolveNumberFormat,
  toNumericValue,
} from "@/lib/dashboards/queryEngine";
import { DashboardWidget, RawDataRow } from "@/lib/dashboards/types";

interface TableAndPivotProps {
  widget: DashboardWidget;
  rows: RawDataRow[];
  onCrossFilterSelect?: (field: string, value: string) => void;
  onInspectRow?: (row: RawDataRow) => void;
}

export function TableAndPivotWidgets({
  widget,
  rows,
  onCrossFilterSelect,
  onInspectRow,
}: TableAndPivotProps) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const colBindings = useMemo(
    () => widget.encoding.columns || [],
    [widget.encoding.columns]
  );

  const filteredAndSorted = useMemo(() => {
    if (widget.type === "pivot_matrix") return [];
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        colBindings.some((c) =>
          String(readRowField(r, c.field) ?? "")
            .toLowerCase()
            .includes(q)
        )
      );
    }
    if (sortCol) {
      const sortDef = getFieldDef(widget.datasetId, sortCol);
      list = [...list].sort((a, b) => {
        const av = readRowField(a, sortCol);
        const bv = readRowField(b, sortCol);
        const aMissing = av === null || av === undefined || av === "";
        const bMissing = bv === null || bv === undefined || bv === "";
        if (aMissing && bMissing) return 0;
        if (aMissing) return 1; // Always sort nulls last
        if (bMissing) return -1;

        if (sortDef?.dataType === "datetime") {
          const at = Date.parse(String(av));
          const bt = Date.parse(String(bv));
          if (!Number.isNaN(at) && !Number.isNaN(bt)) {
            return sortAsc ? at - bt : bt - at;
          }
        }
        const an = toNumericValue(av);
        const bn = toNumericValue(bv);
        if (an !== null && bn !== null) {
          return sortAsc ? an - bn : bn - an;
        }
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return list;
  }, [widget.type, widget.datasetId, rows, search, colBindings, sortCol, sortAsc]);

  const numericColMax = useMemo(() => {
    const map: Record<string, number> = Object.create(null);
    if (widget.type === "pivot_matrix") return map;
    for (const c of colBindings) {
      const def = getFieldDef(widget.datasetId, c.field);
      if (def?.dataType !== "measure") continue;
      let max = 0;
      for (const r of filteredAndSorted) {
        const n = toNumericValue(readRowField(r, c.field));
        if (n !== null && Math.abs(n) > max) max = Math.abs(n);
      }
      map[c.field] = max || 1;
    }
    return map;
  }, [widget.type, colBindings, filteredAndSorted, widget.datasetId]);

  if (widget.type === "pivot_matrix") {
    return (
      <PivotMatrixView
        widget={widget}
        rows={rows}
        onCrossFilterSelect={onCrossFilterSelect}
      />
    );
  }

  if (colBindings.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-4 text-center">
        <Table size={24} weight="light" className="text-[#94A3B8]" />
        <p className="mt-1.5 text-xs text-[#526075]">
          Drag Dimensions, Dates, or Measures into Table Columns.
        </p>
      </div>
    );
  }

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = filteredAndSorted.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize
  );

  const primaryDimensionCol = colBindings.find((c) => {
    const d = getFieldDef(widget.datasetId, c.field);
    return d?.dataType === "dimension" || d?.dataType === "boolean";
  });

  const toggleSort = (field: string) => {
    if (sortCol === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(field);
      setSortAsc(false);
    }
  };

  const handleRowActivate = (row: RawDataRow) => {
    if (widget.datasetId === "telemetry_events" && onInspectRow) {
      onInspectRow(row);
      return;
    }
    if (primaryDimensionCol && onCrossFilterSelect) {
      const lbl = formatCellLabel(row, primaryDimensionCol, widget.datasetId);
      onCrossFilterSelect(primaryDimensionCol.field, lbl);
    }
  };

  const rowInteractive =
    (widget.datasetId === "telemetry_events" && Boolean(onInspectRow)) ||
    (Boolean(primaryDimensionCol) && Boolean(onCrossFilterSelect));

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass
            size={13}
            weight="light"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search rows..."
            aria-label="Search table rows"
            className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-1 pl-7 pr-2 text-xs text-[#0C233C] focus:border-[#00338D] focus:bg-white focus:outline-none"
          />
        </div>
        <span className="font-mono text-[10px] text-[#526075] tabular-nums">
          {filteredAndSorted.length.toLocaleString()} rows
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-sm border border-[#D8DFE9]">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#F4F6FA] text-[10px] font-semibold uppercase tracking-wider text-[#0C233C]">
            <tr>
              {colBindings.map((col, colIdx) => {
                const def = getFieldDef(widget.datasetId, col.field);
                const isSorted = sortCol === col.field;
                return (
                  <th
                    key={`${col.field}-${colIdx}`}
                    className="border-b border-[#D8DFE9] px-2.5 py-2 whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.field)}
                      className="inline-flex items-center gap-1 hover:text-[#00338D]"
                    >
                      <span>{col.label || def?.label || col.field}</span>
                      {isSorted &&
                        (sortAsc ? (
                          <ArrowUp size={11} weight="bold" />
                        ) : (
                          <ArrowDown size={11} weight="bold" />
                        ))}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF2F6] bg-white">
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={colBindings.length}
                  className="px-4 py-8 text-center text-xs text-[#64748B]"
                >
                  No matching live records found.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, idx) => (
                <tr
                  key={String(readRowField(row, "id") || idx)}
                  tabIndex={rowInteractive ? 0 : undefined}
                  onClick={() => {
                    if (rowInteractive) handleRowActivate(row);
                  }}
                  onKeyDown={(e) => {
                    if (rowInteractive && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleRowActivate(row);
                    }
                  }}
                  className={`transition-colors hover:bg-[#F4F6FA] focus-visible:bg-[#EBF2FF] focus-visible:outline-none ${
                    rowInteractive ? "cursor-pointer" : ""
                  }`}
                >
                  {colBindings.map((col, colIdx) => {
                    const def = getFieldDef(widget.datasetId, col.field);
                    const isMeasure = def?.dataType === "measure";
                    const num = isMeasure
                      ? toNumericValue(readRowField(row, col.field))
                      : null;
                    const barPct =
                      isMeasure && widget.style.showDataBars && num !== null
                        ? Math.min(
                            100,
                            Math.round(
                              (Math.abs(num) / (numericColMax[col.field] || 1)) *
                                100
                            )
                          )
                        : 0;
                    const fmt = resolveNumberFormat(
                      col.format,
                      widget.style.numberFormat,
                      def?.defaultFormat
                    );
                    const formatted =
                      isMeasure && num !== null
                        ? formatMetricValue(num, fmt)
                        : formatCellLabel(row, col, widget.datasetId);

                    return (
                      <td
                        key={`${col.field}-${colIdx}`}
                        className={`relative px-2.5 py-1.5 whitespace-nowrap ${
                          isMeasure
                            ? "font-mono text-right tabular-nums text-[#0C233C]"
                            : "text-[#333940]"
                        }`}
                      >
                        {barPct > 0 && (
                          <div
                            className={`pointer-events-none absolute inset-y-0.5 right-0 ${
                              num !== null && num < 0
                                ? "bg-[#B91C1C]/12"
                                : "bg-[#1E49E2]/12"
                            }`}
                            style={{ width: `${barPct}%` }}
                          />
                        )}
                        <span className="relative z-10">{formatted}</span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-[#526075]">
          <span>
            Page {safePage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(Math.max(0, safePage - 1))}
              className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-0.5 disabled:opacity-40 hover:bg-[#F4F6FA]"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-0.5 disabled:opacity-40 hover:bg-[#F4F6FA]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PivotMatrixView({
  widget,
  rows,
  onCrossFilterSelect,
}: {
  widget: DashboardWidget;
  rows: RawDataRow[];
  onCrossFilterSelect?: (field: string, value: string) => void;
}) {
  const pivot = useMemo(() => buildPivotMatrix(rows, widget), [rows, widget]);

  if (pivot.rowKeys.length === 0 || pivot.valueLabels.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-4 text-center">
        <GridFour size={24} weight="light" className="text-[#94A3B8]" />
        <p className="mt-1.5 max-w-[260px] text-xs text-[#526075]">
          Drag Dimensions into Row Groups (and optional Column Groups) plus Measures into Aggregated Values.
        </p>
      </div>
    );
  }

  const primaryRowField = widget.encoding.rows?.[0]?.field;
  const showRowTotals = pivot.hasColumnGroups && pivot.colKeys.length > 1;

  return (
    <div className="h-full w-full overflow-auto rounded-sm border border-[#D8DFE9]">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-[#00338D] text-[10px] font-semibold uppercase tracking-wider text-white">
          <tr>
            <th className="border-r border-white/20 px-2.5 py-2 text-left whitespace-nowrap">
              {(widget.encoding.rows || [])
                .map((r) => getFieldDef(widget.datasetId, r.field)?.label || r.field)
                .join(" / ")}
            </th>
            {pivot.colKeys.map((ck) =>
              pivot.valueLabels.map((vl, vi) => (
                <th
                  key={`${ck}-${vi}`}
                  className="border-r border-white/20 px-2.5 py-2 text-right whitespace-nowrap"
                >
                  {pivot.hasColumnGroups
                    ? `${pivot.colDisplayLabels[ck]} · ${vl}`
                    : vl}
                </th>
              ))
            )}
            {showRowTotals &&
              pivot.valueLabels.map((vl, vi) => (
                <th
                  key={`rt-${vi}`}
                  className="bg-[#0C233C] px-2.5 py-2 text-right whitespace-nowrap"
                >
                  Total · {vl}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF2F6] bg-white">
          {pivot.rowKeys.map((rk) => (
            <tr key={rk} className="hover:bg-[#F4F6FA]">
              <td className="border-r border-[#D8DFE9] px-2.5 py-1.5 font-medium text-[#0C233C] whitespace-nowrap">
                {primaryRowField && onCrossFilterSelect ? (
                  <button
                    type="button"
                    onClick={() =>
                      onCrossFilterSelect(
                        primaryRowField,
                        pivot.rowPrimaryValues[rk]
                      )
                    }
                    className="text-left hover:text-[#1E49E2] hover:underline"
                  >
                    {pivot.rowDisplayLabels[rk]}
                  </button>
                ) : (
                  pivot.rowDisplayLabels[rk]
                )}
              </td>
              {pivot.colKeys.map((ck) =>
                (pivot.cells[rk]?.[ck] || []).map((val, vi) => {
                  const intensity =
                    val !== null &&
                    widget.style.showColorScale &&
                    pivot.maxAbsValue > 0
                      ? Math.min(0.28, (Math.abs(val) / pivot.maxAbsValue) * 0.28)
                      : 0;
                  const shadeRgb =
                    val !== null && val < 0 ? "185, 28, 28" : "30, 73, 226";
                  return (
                    <td
                      key={`${rk}-${ck}-${vi}`}
                      className="border-r border-[#EEF2F6] px-2.5 py-1.5 text-right font-mono tabular-nums text-[#0C233C] whitespace-nowrap"
                      style={
                        intensity > 0
                          ? {
                              backgroundColor: `rgba(${shadeRgb}, ${intensity.toFixed(3)})`,
                            }
                          : undefined
                      }
                    >
                      {val === null
                        ? "-"
                        : formatMetricValue(val, pivot.valueFormats[vi])}
                    </td>
                  );
                })
              )}
              {showRowTotals &&
                (pivot.rowTotals[rk] || []).map((val, vi) => (
                  <td
                    key={`rt-${rk}-${vi}`}
                    className="bg-[#F8FAFC] px-2.5 py-1.5 text-right font-mono font-bold tabular-nums text-[#00338D] whitespace-nowrap"
                  >
                    {formatMetricValue(val, pivot.valueFormats[vi])}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 bg-[#F4F6FA] font-mono text-xs font-bold text-[#00338D]">
          <tr className="border-t-2 border-[#00338D]">
            <td className="border-r border-[#D8DFE9] px-2.5 py-2 font-sans uppercase tracking-wider text-[10px]">
              Grand Total
            </td>
            {pivot.colKeys.map((ck) =>
              (pivot.colTotals[ck] || []).map((val, vi) => (
                <td
                  key={`ct-${ck}-${vi}`}
                  className="border-r border-[#D8DFE9] px-2.5 py-2 text-right tabular-nums whitespace-nowrap"
                >
                  {formatMetricValue(val, pivot.valueFormats[vi])}
                </td>
              ))
            )}
            {showRowTotals &&
              pivot.grandTotals.map((val, vi) => (
                <td
                  key={`gt-${vi}`}
                  className="bg-[#00338D]/10 px-2.5 py-2 text-right tabular-nums whitespace-nowrap"
                >
                  {formatMetricValue(val, pivot.valueFormats[vi])}
                </td>
              ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
