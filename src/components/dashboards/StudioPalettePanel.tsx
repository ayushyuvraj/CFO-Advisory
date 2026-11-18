"use client";

import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  CalendarBlank,
  CaretDown,
  CaretRight,
  ChartBar,
  Database,
  Hash,
  LockKey,
  MagnifyingGlass,
  Tag,
  ToggleLeft,
} from "@phosphor-icons/react";
import {
  SEMANTIC_DATASETS,
  VISUAL_CATALOG,
  VISUAL_CATEGORY_META,
} from "@/lib/dashboards/catalog";
import {
  DatasetId,
  FieldDataType,
  LiveDatasetsPayload,
  SemanticFieldDef,
  WidgetVisualType,
} from "@/lib/dashboards/types";
import { VisualIcon } from "./VisualIcon";

interface StudioPalettePanelProps {
  activeDatasetId: DatasetId;
  onChangeDataset: (id: DatasetId) => void;
  datasetsPayload: LiveDatasetsPayload;
  onQuickAddVisual: (type: WidgetVisualType) => void;
  onQuickAddField?: (datasetId: DatasetId, field: SemanticFieldDef) => void;
}

function DraggableVisualTile({
  type,
  shortLabel,
  description,
  onClickAdd,
}: {
  type: WidgetVisualType;
  shortLabel: string;
  description: string;
  onClickAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-visual:${type}`,
    data: { kind: "new-visual", visualType: type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      title={`${description} (Drag to canvas or click to add)`}
      onClick={onClickAdd}
      {...listeners}
      {...attributes}
      data-palette-visual={type}
      className={`touch-none select-none flex flex-col items-center justify-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-1.5 py-2 text-center transition-colors hover:border-[#00338D] hover:bg-[#F4F6FA] cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <VisualIcon type={type} size={17} className="text-[#00338D]" />
      <span className="w-full truncate text-[10px] font-medium text-[#0C233C]">
        {shortLabel}
      </span>
    </button>
  );
}

function DraggableFieldPill({
  datasetId,
  field,
  onClickAdd,
}: {
  datasetId: DatasetId;
  field: SemanticFieldDef;
  onClickAdd?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-field:${datasetId}:${field.key}`,
    data: { kind: "data-field", datasetId, field },
  });

  const badgeStyle: Record<
    FieldDataType,
    { bg: string; text: string; icon: typeof Hash }
  > = {
    measure: { bg: "bg-[#009A44]/10 border-[#009A44]/30", text: "text-[#009A44]", icon: Hash },
    dimension: { bg: "bg-[#00338D]/10 border-[#00338D]/25", text: "text-[#00338D]", icon: Tag },
    datetime: { bg: "bg-[#7213EA]/10 border-[#7213EA]/25", text: "text-[#7213EA]", icon: CalendarBlank },
    boolean: { bg: "bg-[#1E49E2]/10 border-[#1E49E2]/25", text: "text-[#1E49E2]", icon: ToggleLeft },
  };

  const meta = badgeStyle[field.dataType];
  const Icon = meta.icon;

  return (
    <button
      ref={setNodeRef}
      type="button"
      title={`${field.description} (Drag onto a chart or shelf, or click to bind)`}
      onClick={onClickAdd}
      {...listeners}
      {...attributes}
      data-palette-field={`${datasetId}:${field.key}`}
      className={`touch-none select-none flex w-full items-center justify-between gap-2 rounded-sm border px-2.5 py-1.5 text-left text-xs transition-colors hover:border-[#00338D] cursor-grab active:cursor-grabbing ${meta.bg} ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon size={13} weight="bold" className={`shrink-0 ${meta.text}`} />
        <span className="truncate font-medium text-[#0C233C]">{field.label}</span>
      </span>
      <span className={`shrink-0 font-mono text-[9px] uppercase ${meta.text}`}>
        {field.dataType === "measure"
          ? "NUM"
          : field.dataType === "datetime"
          ? "DATE"
          : field.dataType === "boolean"
          ? "BOOL"
          : "DIM"}
      </span>
    </button>
  );
}

export function StudioPalettePanel({
  activeDatasetId,
  onChangeDataset,
  datasetsPayload,
  onQuickAddVisual,
  onQuickAddField,
}: StudioPalettePanelProps) {
  const [dockTab, setDockTab] = useState<"visuals" | "fields">("visuals");
  const [visualSearch, setVisualSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const filteredVisuals = useMemo(() => {
    const q = visualSearch.trim().toLowerCase();
    if (!q) return VISUAL_CATALOG;
    return VISUAL_CATALOG.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.shortLabel.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    );
  }, [visualSearch]);

  const currentDataset =
    SEMANTIC_DATASETS.find((d) => d.id === activeDatasetId) || SEMANTIC_DATASETS[0];
  const restrictedMsg = datasetsPayload.restrictedDatasets?.[activeDatasetId];
  const liveRowCount = datasetsPayload.datasets[activeDatasetId]?.length || 0;

  const groupedFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    const list = q
      ? currentDataset.fields.filter(
          (f) =>
            f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)
        )
      : currentDataset.fields;

    return {
      measures: list.filter((f) => f.dataType === "measure"),
      dimensions: list.filter((f) => f.dataType === "dimension"),
      datetimes: list.filter((f) => f.dataType === "datetime"),
      booleans: list.filter((f) => f.dataType === "boolean"),
    };
  }, [currentDataset, fieldSearch]);

  const toggleCategory = (catId: string) => {
    setCollapsedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#D8DFE9] bg-[#F8FAFC]">
      {/* Dock Switcher */}
      <div
        role="tablist"
        aria-label="Studio palette tabs"
        className="grid grid-cols-2 border-b border-[#D8DFE9] bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={dockTab === "visuals"}
          onClick={() => setDockTab("visuals")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs font-semibold transition-colors ${
            dockTab === "visuals"
              ? "bg-[#00338D] text-white"
              : "text-[#526075] hover:bg-[#F4F6FA]"
          }`}
        >
          <ChartBar size={14} weight="light" />
          <span>Visuals ({VISUAL_CATALOG.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={dockTab === "fields"}
          onClick={() => setDockTab("fields")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs font-semibold transition-colors ${
            dockTab === "fields"
              ? "bg-[#00338D] text-white"
              : "text-[#526075] hover:bg-[#F4F6FA]"
          }`}
        >
          <Database size={14} weight="light" />
          <span>Data Fields</span>
        </button>
      </div>

      {dockTab === "visuals" ? (
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="border-b border-[#D8DFE9] p-2.5">
            <div className="relative">
              <MagnifyingGlass
                size={13}
                weight="light"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
              />
              <input
                type="text"
                value={visualSearch}
                onChange={(e) => setVisualSearch(e.target.value)}
                placeholder="Search 47 charts & boxes..."
                aria-label="Search visual types"
                className="w-full rounded-sm border border-[#D8DFE9] bg-white py-1.5 pl-7 pr-2 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[#526075]">
              Drag any visual onto the 24-col grid, or click to insert.
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-3">
            {VISUAL_CATEGORY_META.map((cat) => {
              const items = filteredVisuals.filter((v) => v.category === cat.id);
              if (items.length === 0) return null;
              const isCollapsed = Boolean(collapsedCats[cat.id]) && !visualSearch.trim();
              return (
                <div key={cat.id}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleCategory(cat.id)}
                    className="mb-1.5 flex w-full items-center justify-between text-left"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00338D]">
                      {cat.label} ({items.length})
                    </span>
                    {isCollapsed ? (
                      <CaretRight size={12} weight="bold" className="text-[#526075]" />
                    ) : (
                      <CaretDown size={12} weight="bold" className="text-[#526075]" />
                    )}
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map((item) => (
                        <DraggableVisualTile
                          key={item.type}
                          type={item.type}
                          shortLabel={item.shortLabel}
                          description={item.description}
                          onClickAdd={() => onQuickAddVisual(item.type)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="border-b border-[#D8DFE9] p-2.5 space-y-2">
            <div>
              <label
                htmlFor="studio-dataset-select"
                className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]"
              >
                Live Platform Dataset
              </label>
              <select
                id="studio-dataset-select"
                value={activeDatasetId}
                onChange={(e) => onChangeDataset(e.target.value as DatasetId)}
                className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-2 py-1.5 text-xs font-semibold text-[#0C233C] focus:border-[#00338D] focus:outline-none"
              >
                {SEMANTIC_DATASETS.map((ds) => {
                  const cnt = datasetsPayload.datasets[ds.id]?.length || 0;
                  const locked = Boolean(datasetsPayload.restrictedDatasets?.[ds.id]);
                  return (
                    <option key={ds.id} value={ds.id}>
                      {ds.shortLabel} ({locked ? "Restricted" : `${cnt} rows`})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="relative">
              <MagnifyingGlass
                size={13}
                weight="light"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
              />
              <input
                type="text"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Filter fields..."
                aria-label="Filter dataset fields"
                className="w-full rounded-sm border border-[#D8DFE9] bg-white py-1.5 pl-7 pr-2 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] text-[#526075]">
              <span>Live records:</span>
              <span className="font-bold text-[#00338D] tabular-nums">
                {restrictedMsg ? "Locked" : liveRowCount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-3">
            {restrictedMsg ? (
              <div className="rounded-sm border border-[#D8DFE9] bg-white p-3 text-xs text-[#526075]">
                <div className="flex items-center gap-1.5 font-semibold text-[#0C233C]">
                  <LockKey size={14} weight="bold" className="text-[#00338D]" />
                  <span>Role Restricted</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{restrictedMsg}</p>
              </div>
            ) : (
              <>
                {[
                  { title: "Measures (Numeric)", items: groupedFields.measures },
                  { title: "Dimensions (Categories)", items: groupedFields.dimensions },
                  { title: "Date & Time", items: groupedFields.datetimes },
                  { title: "Boolean Flags", items: groupedFields.booleans },
                ].map((group) => {
                  if (group.items.length === 0) return null;
                  return (
                    <div key={group.title} className="space-y-1">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#526075]">
                        {group.title}
                      </p>
                      {group.items.map((field) => (
                        <DraggableFieldPill
                          key={field.key}
                          datasetId={activeDatasetId}
                          field={field}
                          onClickAdd={
                            onQuickAddField
                              ? () => onQuickAddField(activeDatasetId, field)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
