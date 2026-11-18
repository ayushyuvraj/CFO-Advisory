"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowsIn,
  ArrowsOut,
  Check,
  Copy,
  DotsSixVertical,
  DownloadSimple,
  Eye,
  FileCode,
  FilePdf,
  FloppyDisk,
  FunnelSimple,
  Image as ImageIcon,
  PencilSimple,
  Plus,
  PresentationChart,
  ShareNetwork,
  SidebarSimple,
  Sliders,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  createBlankWidget,
  getFieldDef,
  ShelfSlotId,
  VISUAL_CATALOG_MAP,
} from "@/lib/dashboards/catalog";
import {
  exportDashboardJson,
  exportElementPdf,
  exportElementPng,
} from "@/lib/dashboards/exportUtils";
import {
  clampRect,
  findNextOpenSlot,
  getCanvasRowCount,
  GRID_COLUMNS,
  GRID_GAP_PX,
  GRID_ROW_HEIGHT_PX,
  pixelToGridCell,
  resolveGridCollisions,
} from "@/lib/dashboards/gridLayout";
import {
  CrossFilterItem,
  DashboardDocument,
  DashboardPage,
  DashboardWidget,
  DatasetId,
  FieldBinding,
  GridRect,
  LiveDatasetsPayload,
  SemanticFieldDef,
  WidgetVisualType,
} from "@/lib/dashboards/types";
import { TelemetryEvent } from "@/lib/telemetry/types";
import { VisualIcon } from "./VisualIcon";
import { WidgetCard } from "./WidgetCard";
import { StudioPalettePanel } from "./StudioPalettePanel";
import { WidgetInspectorPanel } from "./WidgetInspectorPanel";
import { PresentationOverlay } from "./PresentationOverlay";
import { DrillThroughAuditModal } from "./modals/DrillThroughAuditModal";
import { ConfirmActionModal } from "./modals/ConfirmActionModal";

interface DashboardStudioProps {
  dashboard: DashboardDocument;
  datasetsPayload: LiveDatasetsPayload;
  canEdit: boolean;
  canExport: boolean;
  isKpmgAdmin: boolean;
  isPreviewMode: boolean;
  onBackToGallery: () => void;
  onRefreshDatasets: () => Promise<void>;
  onSaveDashboard: (next: DashboardDocument) => Promise<DashboardDocument>;
  onOpenShare: (dashboard: DashboardDocument) => void;
  initialPresent?: boolean;
}

function makeClientId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Pure Undo/Redo History Reducer (100% React 19 StrictMode safe)
interface StudioSnapshot {
  title: string;
  pages: DashboardPage[];
}

interface StudioHistoryState {
  doc: DashboardDocument;
  undoStack: StudioSnapshot[];
  redoStack: StudioSnapshot[];
  hasUnsaved: boolean;
}

type StudioHistoryAction =
  | { type: "COMMIT_PAGES"; updater: (pages: DashboardPage[]) => DashboardPage[] }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_REFRESH"; sec: 0 | 10 | 30 | 60; markUnsaved: boolean }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SAVED"; saved: DashboardDocument };

function studioHistoryReducer(
  state: StudioHistoryState,
  action: StudioHistoryAction
): StudioHistoryState {
  switch (action.type) {
    case "COMMIT_PAGES": {
      const nextPages = action.updater(state.doc.pages);
      return {
        doc: { ...state.doc, pages: nextPages },
        undoStack: [
          ...state.undoStack.slice(-29),
          { title: state.doc.title, pages: state.doc.pages },
        ],
        redoStack: [],
        hasUnsaved: true,
      };
    }
    case "SET_TITLE": {
      return {
        ...state,
        doc: { ...state.doc, title: action.title },
        hasUnsaved: true,
      };
    }
    case "SET_REFRESH": {
      return {
        ...state,
        doc: { ...state.doc, refreshIntervalSec: action.sec },
        hasUnsaved: action.markUnsaved ? true : state.hasUnsaved,
      };
    }
    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const previous = state.undoStack[state.undoStack.length - 1];
      return {
        doc: { ...state.doc, title: previous.title, pages: previous.pages },
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack.slice(-29),
          { title: state.doc.title, pages: state.doc.pages },
        ],
        hasUnsaved: true,
      };
    }
    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const nextSnap = state.redoStack[state.redoStack.length - 1];
      return {
        doc: { ...state.doc, title: nextSnap.title, pages: nextSnap.pages },
        undoStack: [
          ...state.undoStack.slice(-29),
          { title: state.doc.title, pages: state.doc.pages },
        ],
        redoStack: state.redoStack.slice(0, -1),
        hasUnsaved: true,
      };
    }
    case "SAVED": {
      return {
        ...state,
        doc: action.saved,
        hasUnsaved: false,
      };
    }
    default:
      return state;
  }
}

/**
 * Drag-kind-aware collision detection:
 * - page-tab: strictly matches other page-tab targets via closestCenter
 * - new-visual: strictly matches canvas-drop (never mis-routed to widget-drop)
 * - data-field: prioritizes shelf-drop > widget-drop > canvas-drop via pointerWithin
 */
const studioCollisionDetection: CollisionDetection = (args) => {
  const kind = args.active.data.current?.kind as string | undefined;

  if (kind === "page-tab") {
    const pageContainers = args.droppableContainers.filter(
      (c) => c.data.current?.kind === "page-tab"
    );
    return closestCenter({ ...args, droppableContainers: pageContainers });
  }

  if (kind === "new-visual") {
    const canvasOnly = args.droppableContainers.filter(
      (c) => c.data.current?.kind === "canvas-drop"
    );
    const hits = pointerWithin({ ...args, droppableContainers: canvasOnly });
    return hits.length > 0
      ? hits
      : rectIntersection({ ...args, droppableContainers: canvasOnly });
  }

  if (kind === "data-field") {
    const pointerHits = pointerWithin(args);
    const candidates =
      pointerHits.length > 0 ? pointerHits : rectIntersection(args);
    if (candidates.length === 0) return [];

    const byPriority = (targetKind: string) =>
      candidates.filter((hit) => {
        const container = args.droppableContainers.find((c) => c.id === hit.id);
        return container?.data.current?.kind === targetKind;
      });

    const shelfHits = byPriority("shelf-drop");
    if (shelfHits.length > 0) return shelfHits;
    const widgetHits = byPriority("widget-drop");
    if (widgetHits.length > 0) return widgetHits;
    const canvasHits = byPriority("canvas-drop");
    if (canvasHits.length > 0) return canvasHits;
    return candidates;
  }

  return rectIntersection(args);
};

function smartBindFieldToWidget(
  widget: DashboardWidget,
  datasetId: DatasetId,
  field: SemanticFieldDef,
  explicitShelf?: ShelfSlotId
): DashboardWidget {
  const meta = VISUAL_CATALOG_MAP[widget.type];
  const baseWidget: DashboardWidget =
    widget.datasetId === datasetId
      ? widget
      : {
          ...widget,
          datasetId,
          encoding: {
            ...widget.encoding,
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
            slicerField: null,
            filters: [],
          },
        };

  const binding: FieldBinding = {
    field: field.key,
    aggregation: field.defaultAggregation,
    dateBucket: field.dataType === "datetime" ? "day" : undefined,
    format: "auto",
  };

  let targetShelf = explicitShelf;
  if (!targetShelf) {
    const shelfIds = meta.shelves.map((s) => s.id);
    if (shelfIds.includes("slicerField")) {
      targetShelf = "slicerField";
    } else if (widget.type === "data_table") {
      targetShelf = "columns";
    } else if (widget.type === "pivot_matrix") {
      if (field.dataType === "measure") targetShelf = "values";
      else if ((baseWidget.encoding.rows || []).length === 0) targetShelf = "rows";
      else targetShelf = "columns";
    } else if (widget.type === "sankey") {
      if (field.dataType === "measure") targetShelf = "y";
      else if (!baseWidget.encoding.source) targetShelf = "source";
      else targetShelf = "target";
    } else if (shelfIds.includes("hierarchy") && field.dataType !== "measure") {
      targetShelf = "hierarchy";
    } else if (field.dataType === "measure") {
      if (widget.type === "scatter" || widget.type === "bubble") {
        if (!baseWidget.encoding.x) targetShelf = "x";
        else if (baseWidget.encoding.y.length === 0) targetShelf = "y";
        else if (widget.type === "bubble" && !baseWidget.encoding.size)
          targetShelf = "size";
        else targetShelf = "y";
      } else if (
        widget.type === "combo_bar_line" &&
        baseWidget.encoding.y.length > 0 &&
        (baseWidget.encoding.secondaryY || []).length === 0
      ) {
        targetShelf = "secondaryY";
      } else {
        targetShelf = "y";
      }
    } else {
      if (!baseWidget.encoding.x && shelfIds.includes("x")) targetShelf = "x";
      else if (shelfIds.includes("series")) targetShelf = "series";
      else if (shelfIds.includes("x")) targetShelf = "x";
      else targetShelf = "y";
    }
  }

  const shelfSpec = meta.shelves.find((s) => s.id === targetShelf);
  const enc = { ...baseWidget.encoding };

  switch (targetShelf) {
    case "x":
      enc.x = binding;
      break;
    case "y":
      enc.y = shelfSpec?.multiple ? [...enc.y, binding] : [binding];
      break;
    case "secondaryY":
      enc.secondaryY = [...(enc.secondaryY || []), binding];
      break;
    case "series":
      enc.series = binding;
      break;
    case "size":
      enc.size = binding;
      break;
    case "source":
      enc.source = binding;
      break;
    case "target":
      enc.target = binding;
      break;
    case "hierarchy":
      enc.hierarchy = [...(enc.hierarchy || []), binding].slice(0, 3);
      break;
    case "rows":
      enc.rows = [...(enc.rows || []), binding].slice(0, 2);
      break;
    case "columns":
      enc.columns = [...(enc.columns || []), binding];
      break;
    case "values":
      enc.values = [...(enc.values || []), binding].slice(0, 3);
      break;
    case "slicerField":
      enc.slicerField = binding;
      break;
    case "filters":
      enc.filters = [
        ...enc.filters,
        {
          id: makeClientId("flt"),
          field: field.key,
          operator: "contains",
          values: [""],
        },
      ];
      break;
    default:
      break;
  }

  return { ...baseWidget, encoding: enc };
}

function SortablePageTab({
  page,
  isActive,
  isEditMode,
  canDelete,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  page: DashboardPage;
  isActive: boolean;
  isEditMode: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onRename: (nextTitle: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `page-tab:${page.id}`,
    disabled: !isEditMode,
    data: { kind: "page-tab", pageId: page.id },
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commit = () => {
    setEditing(false);
    const clean = draft.trim();
    if (clean && clean !== page.title) {
      onRename(clean);
    } else {
      setDraft(page.title);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-1 text-xs font-semibold transition-colors ${
        isActive
          ? "border-[#00338D] bg-[#00338D] text-white"
          : "border-[#D8DFE9] bg-white text-[#333940] hover:bg-[#F4F6FA]"
      }`}
    >
      {isEditMode && !editing && (
        <button
          type="button"
          aria-label={`Reorder page ${page.title}`}
          {...attributes}
          {...listeners}
          className={`touch-none select-none cursor-grab rounded-xs p-0.5 active:cursor-grabbing ${
            isActive ? "text-white/75 hover:bg-white/20" : "text-[#64748B] hover:bg-[#E2E8F0]"
          }`}
        >
          <DotsSixVertical size={12} weight="bold" />
        </button>
      )}

      {editing ? (
        <input
          type="text"
          aria-label="Rename page title"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(page.title);
              setEditing(false);
            }
          }}
          className="w-24 rounded-xs bg-white px-1 py-0.5 text-xs text-[#0C233C] focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={() => {
            if (isEditMode) {
              setDraft(page.title);
              setEditing(true);
            }
          }}
          className="max-w-[130px] truncate px-0.5"
        >
          {page.title}
        </button>
      )}

      {isEditMode && !editing && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDraft(page.title);
              setEditing(true);
            }}
            aria-label={`Rename page ${page.title}`}
            className={`rounded-xs p-0.5 ${
              isActive ? "hover:bg-white/20" : "hover:bg-[#E2E8F0]"
            }`}
          >
            <PencilSimple size={11} weight="light" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            aria-label={`Duplicate page ${page.title}`}
            className={`rounded-xs p-0.5 ${
              isActive ? "hover:bg-white/20" : "hover:bg-[#E2E8F0]"
            }`}
          >
            <Copy size={11} weight="light" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`Delete page ${page.title}`}
              className={`rounded-xs p-0.5 ${
                isActive
                  ? "hover:bg-white/20"
                  : "hover:bg-[#B91C1C]/15 hover:text-[#B91C1C]"
              }`}
            >
              <Trash size={11} weight="light" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function subscribeCompactViewport(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(max-width: 767px)");
  const handler = () => onStoreChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

function getCompactViewportSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function getCompactViewportServerSnapshot(): boolean {
  return false;
}

function DroppableCanvasGrid({
  isEditMode,
  totalRows,
  canvasGridRef,
  children,
}: {
  isEditMode: boolean;
  totalRows: number;
  canvasGridRef: React.MutableRefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-drop",
    disabled: !isEditMode,
    data: { kind: "canvas-drop" },
  });

  return (
    <div
      ref={(node) => {
        canvasGridRef.current = node;
        setNodeRef(node);
      }}
      data-dashboard-canvas="true"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
        gridAutoRows: `${GRID_ROW_HEIGHT_PX}px`,
        gap: `${GRID_GAP_PX}px`,
        minHeight: `${totalRows * (GRID_ROW_HEIGHT_PX + GRID_GAP_PX)}px`,
        backgroundImage: isEditMode
          ? "radial-gradient(#CBD5E1 1px, transparent 1px)"
          : undefined,
        backgroundSize: isEditMode ? "20px 20px" : undefined,
      }}
      className={`relative grid min-w-[780px] rounded-sm border p-3 transition-colors ${
        isOver && isEditMode
          ? "border-[#1E49E2] bg-[#EBF2FF]/30"
          : "border-[#D8DFE9] bg-[#F8FAFC]/80"
      }`}
    >
      {children}
    </div>
  );
}

export function DashboardStudio({
  dashboard,
  datasetsPayload,
  canEdit,
  canExport,
  isKpmgAdmin,
  isPreviewMode,
  onBackToGallery,
  onRefreshDatasets,
  onSaveDashboard,
  onOpenShare,
  initialPresent = false,
}: DashboardStudioProps) {
  const [history, dispatch] = useReducer(studioHistoryReducer, {
    doc: dashboard,
    undoStack: [],
    redoStack: [],
    hasUnsaved: false,
  });

  const { doc, undoStack, redoStack, hasUnsaved } = history;

  const [activePageId, setActivePageId] = useState<string>(
    dashboard.pages[0]?.id || ""
  );
  const [editModePref, setEditModePref] = useState<boolean>(
    canEdit && !isPreviewMode && !initialPresent
  );
  const isEditMode = editModePref && canEdit && !isPreviewMode;

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPresenting, setIsPresenting] = useState(initialPresent);
  const [rawSelectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const selectedWidgetId = isEditMode ? rawSelectedWidgetId : null;

  // Responsive dock visibility on viewports < xl (1280px)
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  const [activeDatasetId, setActiveDatasetId] = useState<DatasetId>(
    datasetsPayload.restrictedDatasets?.telemetry_events
      ? "registered_products"
      : "telemetry_events"
  );
  const [crossFilters, setCrossFilters] = useState<CrossFilterItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);
  const [dragGhost, setDragGhost] = useState<{
    kind: "new-visual" | "data-field";
    label: string;
    visualType?: WidgetVisualType;
  } | null>(null);
  const [livePreviewRect, setLivePreviewRect] = useState<GridRect | null>(null);
  const [drillState, setDrillState] = useState<{
    isOpen: boolean;
    title: string;
    events: TelemetryEvent[];
  }>({ isOpen: false, title: "", events: [] });

  const canvasGridRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const isCompactViewport = useSyncExternalStore(
    subscribeCompactViewport,
    getCompactViewportSnapshot,
    getCompactViewportServerSnapshot
  );

  const syncedDoc = useMemo<DashboardDocument>(
    () => ({
      ...doc,
      visibility: dashboard.visibility,
      assignedCompanyIds: dashboard.assignedCompanyIds,
    }),
    [doc, dashboard.visibility, dashboard.assignedCompanyIds]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Cleanup any active pointer move/resize listeners on unmount
  useEffect(() => {
    return () => {
      pointerCleanupRef.current?.();
      pointerCleanupRef.current = null;
    };
  }, []);

  // Warn browser refresh/close when unsaved changes exist
  useEffect(() => {
    if (!hasUnsaved || !canEdit || isPreviewMode) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsaved, canEdit, isPreviewMode]);

  // Body scroll lock & Escape exit for Full-Screen Studio Portal
  useEffect(() => {
    if (!isFullScreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !isPresenting &&
        !drillState.isOpen &&
        !unsavedExitOpen &&
        !exportMenuOpen
      ) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullScreen, isPresenting, drillState.isOpen, unsavedExitOpen, exportMenuOpen]);

  // Outside-click & Escape close for toolbar Export dropdown
  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportMenuOpen]);

  // Auto-refresh polling ONLY in View/Present mode and NEVER while editing/dragging
  useEffect(() => {
    if (isEditMode || doc.refreshIntervalSec <= 0) return;
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void onRefreshDatasets();
    }, doc.refreshIntervalSec * 1000);
    return () => window.clearInterval(id);
  }, [isEditMode, doc.refreshIntervalSec, onRefreshDatasets]);

  const activePageIndex = useMemo(() => {
    const idx = doc.pages.findIndex((p) => p.id === activePageId);
    return idx >= 0 ? idx : 0;
  }, [doc.pages, activePageId]);

  const activePage = doc.pages[activePageIndex] || doc.pages[0];

  const selectedWidget = useMemo(
    () =>
      activePage?.widgets.find((w) => w.id === selectedWidgetId) || null,
    [activePage, selectedWidgetId]
  );

  const commitPagesChange = useCallback(
    (updater: (pages: DashboardPage[]) => DashboardPage[]) => {
      dispatch({ type: "COMMIT_PAGES", updater });
    },
    []
  );

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
    setCrossFilters([]);
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
    setCrossFilters([]);
  }, []);

  // Keyboard shortcuts for Undo / Redo
  useEffect(() => {
    if (!isEditMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditMode, handleUndo, handleRedo]);

  const updateActivePageWidgets = useCallback(
    (updater: (widgets: DashboardWidget[]) => DashboardWidget[]) => {
      if (!activePage) return;
      commitPagesChange((pages) =>
        pages.map((p) =>
          p.id === activePage.id ? { ...p, widgets: updater(p.widgets) } : p
        )
      );
    },
    [activePage, commitPagesChange]
  );

  const handleAddVisualAt = useCallback(
    (type: WidgetVisualType, explicitRect?: GridRect) => {
      if (!activePage || !isEditMode) return;
      const meta = VISUAL_CATALOG_MAP[type];
      const slot =
        explicitRect ||
        findNextOpenSlot(
          activePage.widgets,
          meta.defaultSize.w,
          meta.defaultSize.h
        );
      const id = makeClientId("wgt");
      const newWidget = createBlankWidget(type, activeDatasetId, slot, id);
      updateActivePageWidgets((widgets) =>
        resolveGridCollisions([...widgets, newWidget], id, slot)
      );
      setSelectedWidgetId(id);
      setMobilePaletteOpen(false);
    },
    [activePage, isEditMode, activeDatasetId, updateActivePageWidgets]
  );

  const handleQuickBindField = useCallback(
    (datasetId: DatasetId, field: SemanticFieldDef) => {
      if (!activePage || !isEditMode) return;
      if (selectedWidgetId && activePage.widgets.some((w) => w.id === selectedWidgetId)) {
        updateActivePageWidgets((widgets) =>
          widgets.map((w) =>
            w.id === selectedWidgetId
              ? smartBindFieldToWidget(w, datasetId, field)
              : w
          )
        );
        return;
      }
      const spawnType: WidgetVisualType =
        field.dataType === "measure" ? "kpi_card" : "bar_clustered";
      const meta = VISUAL_CATALOG_MAP[spawnType];
      const slot = findNextOpenSlot(
        activePage.widgets,
        meta.defaultSize.w,
        meta.defaultSize.h
      );
      const id = makeClientId("wgt");
      let w = createBlankWidget(spawnType, datasetId, slot, id);
      w = smartBindFieldToWidget(w, datasetId, field);
      if (spawnType === "bar_clustered") {
        const countField = getFieldDef(datasetId, "__record_count");
        if (countField) {
          w = smartBindFieldToWidget(w, datasetId, countField, "y");
        }
      }
      w.title = `${field.label} Overview`;
      updateActivePageWidgets((widgets) =>
        resolveGridCollisions([...widgets, w], id, slot)
      );
      setSelectedWidgetId(id);
    },
    [activePage, isEditMode, selectedWidgetId, updateActivePageWidgets]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { kind: "new-visual"; visualType: WidgetVisualType }
      | { kind: "data-field"; datasetId: DatasetId; field: SemanticFieldDef }
      | { kind: "page-tab"; pageId: string }
      | undefined;

    if (!data) return;
    if (data.kind === "new-visual") {
      setDragGhost({
        kind: "new-visual",
        label: VISUAL_CATALOG_MAP[data.visualType].label,
        visualType: data.visualType,
      });
    } else if (data.kind === "data-field") {
      setDragGhost({
        kind: "data-field",
        label: data.field.label,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragGhost(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { kind: "new-visual"; visualType: WidgetVisualType }
      | { kind: "data-field"; datasetId: DatasetId; field: SemanticFieldDef }
      | { kind: "page-tab"; pageId: string }
      | undefined;

    const overData = over.data.current as
      | { kind: "canvas-drop" }
      | { kind: "widget-drop"; widgetId: string }
      | { kind: "shelf-drop"; widgetId: string; shelfId: ShelfSlotId }
      | { kind: "page-tab"; pageId: string }
      | undefined;

    if (!activeData || !overData) return;

    // 1. Page Tab Reorder
    if (activeData.kind === "page-tab" && overData.kind === "page-tab") {
      if (activeData.pageId !== overData.pageId) {
        commitPagesChange((pages) => {
          const oldIdx = pages.findIndex((p) => p.id === activeData.pageId);
          const newIdx = pages.findIndex((p) => p.id === overData.pageId);
          if (oldIdx < 0 || newIdx < 0) return pages;
          return arrayMove(pages, oldIdx, newIdx);
        });
      }
      return;
    }

    // 2. Drag Visual from Palette -> Canvas (exact activatorEvent + delta coordinates, zero race!)
    if (activeData.kind === "new-visual" && overData.kind === "canvas-drop") {
      const meta = VISUAL_CATALOG_MAP[activeData.visualType];
      const gridEl = canvasGridRef.current;
      let targetRect: GridRect | undefined;
      if (gridEl) {
        const rect = gridEl.getBoundingClientRect();
        const pad = 12; // p-3
        const contentWidth = Math.max(1, rect.width - pad * 2);
        const ev = event.activatorEvent as PointerEvent | MouseEvent | undefined;
        if (ev && typeof ev.clientX === "number" && typeof ev.clientY === "number") {
          const dropX = ev.clientX + event.delta.x;
          const dropY = ev.clientY + event.delta.y;
          const relX = dropX - (rect.left + pad);
          const relY = dropY - (rect.top + pad);
          if (relX >= 0 && relY >= 0) {
            const cell = pixelToGridCell(
              relX,
              relY,
              contentWidth,
              meta.defaultSize.w
            );
            targetRect = {
              x: cell.x,
              y: cell.y,
              w: meta.defaultSize.w,
              h: meta.defaultSize.h,
            };
          }
        }
      }
      handleAddVisualAt(activeData.visualType, targetRect);
      return;
    }

    // 3. Drag Data Field -> Specific Encoding Shelf
    if (activeData.kind === "data-field" && overData.kind === "shelf-drop") {
      updateActivePageWidgets((widgets) =>
        widgets.map((w) =>
          w.id === overData.widgetId
            ? smartBindFieldToWidget(
                w,
                activeData.datasetId,
                activeData.field,
                overData.shelfId
              )
            : w
        )
      );
      setSelectedWidgetId(overData.widgetId);
      return;
    }

    // 4. Drag Data Field -> Widget Card on Canvas
    if (activeData.kind === "data-field" && overData.kind === "widget-drop") {
      updateActivePageWidgets((widgets) =>
        widgets.map((w) =>
          w.id === overData.widgetId
            ? smartBindFieldToWidget(w, activeData.datasetId, activeData.field)
            : w
        )
      );
      setSelectedWidgetId(overData.widgetId);
      return;
    }

    // 5. Drag Data Field -> Blank Canvas (auto-spawn KPI or Bar Chart)
    if (activeData.kind === "data-field" && overData.kind === "canvas-drop") {
      handleQuickBindField(activeData.datasetId, activeData.field);
    }
  };

  // Hardened Pointer-based Move on 24-column Grid (handles pointercancel, blur, unmount & scroll drift)
  const handleStartMove = (widgetId: string, startEvent: React.PointerEvent) => {
    const gridEl = canvasGridRef.current;
    const scrollEl = canvasScrollRef.current;
    const widget = activePage?.widgets.find((w) => w.id === widgetId);
    if (!gridEl || !widget) return;

    startEvent.preventDefault();
    pointerCleanupRef.current?.();

    const startClientX = startEvent.clientX;
    const startClientY = startEvent.clientY;
    const startScrollLeft = scrollEl?.scrollLeft || 0;
    const startScrollTop = scrollEl?.scrollTop || 0;
    const orig = { ...widget.layout };
    const rect = gridEl.getBoundingClientRect();
    const contentWidth = Math.max(1, rect.width - 24);
    const colStep =
      Math.max(1, (contentWidth - GRID_GAP_PX * (GRID_COLUMNS - 1)) / GRID_COLUMNS) +
      GRID_GAP_PX;
    const rowStep = GRID_ROW_HEIGHT_PX + GRID_GAP_PX;

    let latestRect = orig;
    setLivePreviewRect(orig);

    const onMove = (e: PointerEvent) => {
      const scrollDx = (scrollEl?.scrollLeft || 0) - startScrollLeft;
      const scrollDy = (scrollEl?.scrollTop || 0) - startScrollTop;
      const dxCols = Math.round((e.clientX - startClientX + scrollDx) / colStep);
      const dyRows = Math.round((e.clientY - startClientY + scrollDy) / rowStep);
      latestRect = clampRect({
        x: orig.x + dxCols,
        y: orig.y + dyRows,
        w: orig.w,
        h: orig.h,
      });
      setLivePreviewRect(latestRect);
    };

    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      pointerCleanupRef.current = null;
      setLivePreviewRect(null);
      if (commit && (latestRect.x !== orig.x || latestRect.y !== orig.y)) {
        updateActivePageWidgets((widgets) =>
          resolveGridCollisions(widgets, widgetId, latestRect)
        );
      }
    };

    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    pointerCleanupRef.current = () => finish(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
  };

  // Hardened Pointer-based Resize on 24-column Grid
  const handleStartResize = (
    widgetId: string,
    edge: "e" | "s" | "se",
    startEvent: React.PointerEvent
  ) => {
    const gridEl = canvasGridRef.current;
    const scrollEl = canvasScrollRef.current;
    const widget = activePage?.widgets.find((w) => w.id === widgetId);
    if (!gridEl || !widget) return;

    startEvent.preventDefault();
    pointerCleanupRef.current?.();

    const meta = VISUAL_CATALOG_MAP[widget.type];
    const startClientX = startEvent.clientX;
    const startClientY = startEvent.clientY;
    const startScrollLeft = scrollEl?.scrollLeft || 0;
    const startScrollTop = scrollEl?.scrollTop || 0;
    const orig = { ...widget.layout };
    const rect = gridEl.getBoundingClientRect();
    const contentWidth = Math.max(1, rect.width - 24);
    const colStep =
      Math.max(1, (contentWidth - GRID_GAP_PX * (GRID_COLUMNS - 1)) / GRID_COLUMNS) +
      GRID_GAP_PX;
    const rowStep = GRID_ROW_HEIGHT_PX + GRID_GAP_PX;

    let latestRect = orig;
    setLivePreviewRect(orig);

    const onMove = (e: PointerEvent) => {
      const scrollDx = (scrollEl?.scrollLeft || 0) - startScrollLeft;
      const scrollDy = (scrollEl?.scrollTop || 0) - startScrollTop;
      const dxCols =
        edge === "e" || edge === "se"
          ? Math.round((e.clientX - startClientX + scrollDx) / colStep)
          : 0;
      const dyRows =
        edge === "s" || edge === "se"
          ? Math.round((e.clientY - startClientY + scrollDy) / rowStep)
          : 0;
      latestRect = clampRect(
        {
          x: orig.x,
          y: orig.y,
          w: orig.w + dxCols,
          h: orig.h + dyRows,
        },
        meta.minSize.w,
        meta.minSize.h
      );
      setLivePreviewRect(latestRect);
    };

    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      pointerCleanupRef.current = null;
      setLivePreviewRect(null);
      if (commit && (latestRect.w !== orig.w || latestRect.h !== orig.h)) {
        updateActivePageWidgets((widgets) =>
          resolveGridCollisions(widgets, widgetId, latestRect)
        );
      }
    };

    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    pointerCleanupRef.current = () => finish(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!canEdit || isPreviewMode) return false;
    if (!doc.title.trim()) {
      setSaveNotice({
        tone: "error",
        text: "Dashboard title cannot be empty.",
      });
      return false;
    }
    setSaving(true);
    setSaveNotice(null);
    try {
      const saved = await onSaveDashboard(doc);
      dispatch({ type: "SAVED", saved });
      setSaveNotice({ tone: "success", text: "Saved" });
      window.setTimeout(() => setSaveNotice(null), 2600);
      return true;
    } catch (err) {
      setSaveNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Save failed",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleRequestBack = () => {
    if (hasUnsaved && canEdit && !isPreviewMode) {
      setUnsavedExitOpen(true);
      return;
    }
    setIsFullScreen(false);
    onBackToGallery();
  };

  const handleToggleCrossFilter = useCallback((filter: CrossFilterItem) => {
    setCrossFilters((prev) => {
      const existingIdx = prev.findIndex(
        (cf) =>
          cf.sourceWidgetId === filter.sourceWidgetId &&
          cf.field === filter.field &&
          JSON.stringify(cf.values) === JSON.stringify(filter.values)
      );
      if (existingIdx >= 0) {
        return prev.filter((_, i) => i !== existingIdx);
      }
      return [
        ...prev.filter((cf) => cf.sourceWidgetId !== filter.sourceWidgetId),
        filter,
      ];
    });
  }, []);

  const handleApplySlicerFilter = useCallback(
    (widgetId: string, filter: CrossFilterItem | null) => {
      setCrossFilters((prev) => {
        const without = prev.filter((cf) => cf.sourceWidgetId !== widgetId);
        return filter ? [...without, filter] : without;
      });
    },
    []
  );

  const handleAddPage = () => {
    const newPage: DashboardPage = {
      id: makeClientId("pg"),
      title: `Page ${doc.pages.length + 1}`,
      widgets: [],
    };
    commitPagesChange((pages) => [...pages, newPage]);
    setActivePageId(newPage.id);
    setSelectedWidgetId(null);
    setCrossFilters([]);
  };

  const handleDuplicatePage = (page: DashboardPage) => {
    const clone: DashboardPage = {
      id: makeClientId("pg"),
      title: `${page.title} (Copy)`.slice(0, 60),
      widgets: page.widgets.map((w) => ({
        ...JSON.parse(JSON.stringify(w)),
        id: makeClientId("wgt"),
      })),
    };
    commitPagesChange((pages) => [...pages, clone]);
    setActivePageId(clone.id);
    setSelectedWidgetId(null);
  };

  const handleDeletePage = (pageId: string) => {
    if (doc.pages.length <= 1) return;
    const remaining = doc.pages.filter((p) => p.id !== pageId);
    commitPagesChange(() => remaining);
    if (activePageId === pageId) {
      setActivePageId(remaining[0].id);
      setSelectedWidgetId(null);
      setCrossFilters([]);
    }
  };

  const totalRows = getCanvasRowCount(activePage?.widgets || [], 14);
  const sortedMobileWidgets = useMemo(
    () =>
      [...(activePage?.widgets || [])].sort((a, b) =>
        a.layout.y !== b.layout.y ? a.layout.y - b.layout.y : a.layout.x - b.layout.x
      ),
    [activePage?.widgets]
  );

  const studioShell = (
    <DndContext
      sensors={sensors}
      collisionDetection={studioCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        data-lenis-prevent={isFullScreen ? "true" : undefined}
        data-lenis-prevent-wheel={isFullScreen ? "true" : undefined}
        data-lenis-prevent-touch={isFullScreen ? "true" : undefined}
        className={
          isFullScreen
            ? "fixed inset-0 z-[85] flex flex-col bg-[#F8FAFC]"
            : "mt-6 flex h-[calc(100dvh-160px)] min-h-[540px] flex-col overflow-hidden rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] shadow-sm"
        }
      >
        {/* Top Studio Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#D8DFE9] bg-white px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={handleRequestBack}
              className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-semibold text-[#333940] hover:border-[#00338D] hover:text-[#00338D]"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Gallery</span>
            </button>

            {isEditMode ? (
              <input
                type="text"
                aria-label="Dashboard title"
                value={doc.title}
                onChange={(e) =>
                  dispatch({ type: "SET_TITLE", title: e.target.value })
                }
                className="w-40 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold text-[#0C233C] focus:border-[#00338D] focus:bg-white focus:outline-none sm:w-64 sm:text-sm"
              />
            ) : (
              <h2 className="truncate text-sm font-bold text-[#0C233C] sm:text-base">
                {doc.title}
              </h2>
            )}

            {hasUnsaved && canEdit && !isPreviewMode && (
              <span className="shrink-0 rounded-sm bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800">
                Unsaved
              </span>
            )}
            {saveNotice && (
              <span
                role={saveNotice.tone === "error" ? "alert" : "status"}
                className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold ${
                  saveNotice.tone === "error"
                    ? "bg-[#B91C1C]/10 text-[#B91C1C]"
                    : "bg-[#009A44]/10 text-[#009A44]"
                }`}
              >
                {saveNotice.tone === "error" ? (
                  <WarningCircle size={12} weight="bold" />
                ) : (
                  <Check size={11} weight="bold" />
                )}
                {saveNotice.text}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Compact viewport dock toggles (< xl) */}
            {isEditMode && (
              <div className="flex items-center gap-1 xl:hidden">
                <button
                  type="button"
                  aria-pressed={mobilePaletteOpen}
                  onClick={() => {
                    setMobilePaletteOpen((p) => !p);
                    setMobileInspectorOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1.5 text-xs font-semibold ${
                    mobilePaletteOpen
                      ? "border-[#00338D] bg-[#00338D] text-white"
                      : "border-[#D8DFE9] bg-white text-[#333940]"
                  }`}
                >
                  <SidebarSimple size={14} weight="light" />
                  <span>Palette</span>
                </button>
                <button
                  type="button"
                  aria-pressed={mobileInspectorOpen}
                  onClick={() => {
                    setMobileInspectorOpen((p) => !p);
                    setMobilePaletteOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1.5 text-xs font-semibold ${
                    mobileInspectorOpen
                      ? "border-[#00338D] bg-[#00338D] text-white"
                      : "border-[#D8DFE9] bg-white text-[#333940]"
                  }`}
                >
                  <Sliders size={14} weight="light" />
                  <span>Inspector</span>
                </button>
              </div>
            )}

            {/* View / Edit Switch */}
            {canEdit && !isPreviewMode && (
              <div
                role="tablist"
                aria-label="Dashboard studio mode"
                className="flex items-center rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-0.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isEditMode}
                  onClick={() => {
                    setEditModePref(false);
                    setSelectedWidgetId(null);
                    setMobilePaletteOpen(false);
                    setMobileInspectorOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 rounded-xs px-2.5 py-1 text-xs font-semibold ${
                    !isEditMode
                      ? "bg-[#00338D] text-white"
                      : "text-[#526075] hover:text-[#0C233C]"
                  }`}
                >
                  <Eye size={13} weight="light" />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isEditMode}
                  onClick={() => setEditModePref(true)}
                  className={`inline-flex items-center gap-1 rounded-xs px-2.5 py-1 text-xs font-semibold ${
                    isEditMode
                      ? "bg-[#00338D] text-white"
                      : "text-[#526075] hover:text-[#0C233C]"
                  }`}
                >
                  <PencilSimple size={13} weight="light" />
                  <span>Edit</span>
                </button>
              </div>
            )}

            {isEditMode && (
              <>
                <button
                  type="button"
                  disabled={undoStack.length === 0}
                  onClick={handleUndo}
                  aria-label="Undo"
                  title="Undo (Ctrl+Z)"
                  className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#333940] hover:bg-[#F4F6FA] disabled:opacity-35"
                >
                  <ArrowCounterClockwise size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  disabled={redoStack.length === 0}
                  onClick={handleRedo}
                  aria-label="Redo"
                  title="Redo (Ctrl+Y)"
                  className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#333940] hover:bg-[#F4F6FA] disabled:opacity-35"
                >
                  <ArrowClockwise size={14} weight="bold" />
                </button>
              </>
            )}

            {/* Live Refresh Interval Selector */}
            <div className="flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 text-xs">
              <button
                type="button"
                onClick={() => void onRefreshDatasets()}
                aria-label="Refresh live datasets now"
                title="Refresh live data now"
                className="text-[#00338D] hover:text-[#1E49E2]"
              >
                <ArrowClockwise size={13} weight="bold" />
              </button>
              <select
                aria-label="Auto refresh interval"
                value={doc.refreshIntervalSec}
                onChange={(e) => {
                  const sec = Number(e.target.value) as 0 | 10 | 30 | 60;
                  dispatch({
                    type: "SET_REFRESH",
                    sec,
                    markUnsaved: canEdit && !isPreviewMode,
                  });
                }}
                className="bg-transparent font-mono text-[11px] font-semibold text-[#0C233C] focus:outline-none"
              >
                <option value={0}>Manual</option>
                <option value={10}>Live 10s</option>
                <option value={30}>Live 30s</option>
                <option value={60}>Live 60s</option>
              </select>
            </div>

            {/* Save Button (shown in Edit Mode OR when unsaved changes exist) */}
            {canEdit && !isPreviewMode && (isEditMode || hasUnsaved) && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E49E2] disabled:opacity-50"
              >
                <FloppyDisk size={14} weight="bold" />
                <span>{saving ? "Saving..." : "Save"}</span>
              </button>
            )}

            {/* Publish / Share (KPMG Lead) */}
            {isKpmgAdmin && !isPreviewMode && (
              <button
                type="button"
                onClick={() => onOpenShare(syncedDoc)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#00338D] hover:bg-[#F4F6FA]"
              >
                <ShareNetwork size={14} weight="light" />
                <span>Publish</span>
              </button>
            )}

            {/* Export Page / JSON Menu */}
            {canExport && (
              <div ref={exportMenuRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  onClick={() => setExportMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#333940] hover:border-[#00338D] hover:text-[#00338D]"
                >
                  <DownloadSimple size={14} weight="light" />
                  <span>Export</span>
                </button>
                {exportMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-40 mt-1 w-48 rounded-sm border border-[#D8DFE9] bg-white py-1 shadow-xl text-xs"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenuOpen(false);
                        void exportElementPng(
                          canvasGridRef.current,
                          `${doc.title}-${activePage?.title || "page"}`
                        );
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#0C233C] hover:bg-[#F4F6FA]"
                    >
                      <ImageIcon size={14} weight="light" />
                      <span>Export Page as PNG</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenuOpen(false);
                        void exportElementPdf(
                          canvasGridRef.current,
                          `${doc.title} - ${activePage?.title || "Page"}`
                        );
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#0C233C] hover:bg-[#F4F6FA]"
                    >
                      <FilePdf size={14} weight="light" />
                      <span>Export Page as PDF</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportMenuOpen(false);
                        exportDashboardJson(syncedDoc);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#0C233C] hover:bg-[#F4F6FA]"
                    >
                      <FileCode size={14} weight="light" />
                      <span>Export Layout JSON</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Presentation Mode */}
            <button
              type="button"
              onClick={() => setIsPresenting(true)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[#00338D] bg-[#00338D]/5 px-2.5 py-1.5 text-xs font-semibold text-[#00338D] hover:bg-[#00338D] hover:text-white transition-colors"
            >
              <PresentationChart size={14} weight="light" />
              <span>Present</span>
            </button>

            {/* Full-Screen Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              aria-label={
                isFullScreen ? "Exit full-screen studio" : "Expand studio full-screen"
              }
              title={isFullScreen ? "Exit Full-Screen (Esc)" : "Full-Screen Studio"}
              className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#333940] hover:border-[#00338D] hover:text-[#00338D]"
            >
              {isFullScreen ? (
                <ArrowsIn size={15} weight="bold" />
              ) : (
                <ArrowsOut size={15} weight="bold" />
              )}
            </button>
          </div>
        </div>

        {/* Active Page Cross-Filters Strip */}
        {crossFilters.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#D8DFE9] bg-[#EBF2FF] px-4 py-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-[#00338D]">
                <FunnelSimple size={12} weight="bold" />
                Active Cross-Filters:
              </span>
              {crossFilters.map((cf) => (
                <span
                  key={`${cf.sourceWidgetId}-${cf.field}`}
                  className="inline-flex items-center gap-1 rounded-sm border border-[#1E49E2]/30 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-[#00338D]"
                >
                  <span>{cf.displayLabel}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCrossFilters((prev) => prev.filter((item) => item !== cf))
                    }
                    aria-label={`Clear filter ${cf.displayLabel}`}
                    className="text-[#526075] hover:text-[#B91C1C]"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCrossFilters([])}
              className="font-mono text-[11px] font-semibold text-[#00338D] hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Main Responsive 3-Pane Studio Workspace */}
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {/* Left Dock: Always docked on xl+, slide-over drawer below xl */}
          {isEditMode && (
            <div
              className={
                mobilePaletteOpen
                  ? "absolute inset-y-0 left-0 z-30 flex shadow-2xl xl:static xl:z-auto xl:shadow-none"
                  : "hidden xl:flex"
              }
            >
              <StudioPalettePanel
                activeDatasetId={activeDatasetId}
                onChangeDataset={setActiveDatasetId}
                datasetsPayload={datasetsPayload}
                onQuickAddVisual={(type) => handleAddVisualAt(type)}
                onQuickAddField={handleQuickBindField}
              />
            </div>
          )}

          {/* Center 24-Column Snap-to-Grid Canvas */}
          <div
            ref={canvasScrollRef}
            className="flex-1 min-w-0 overflow-auto p-3 sm:p-4"
            onClick={() => {
              if (isEditMode) {
                setSelectedWidgetId(null);
                setMobilePaletteOpen(false);
                setMobileInspectorOpen(false);
              }
            }}
          >
            {!isCompactViewport ? (
              /* Desktop / Tablet (md+) 24-Column Grid inside DndContext */
              <DroppableCanvasGrid
                isEditMode={isEditMode}
                totalRows={totalRows}
                canvasGridRef={canvasGridRef}
              >
                {activePage && activePage.widgets.length === 0 && (
                  <div
                    style={{ gridColumn: "1 / -1", gridRow: "2 / span 9" }}
                    className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-[#CBD5E1] bg-white/85 px-6 py-12 text-center"
                  >
                    <PresentationChart
                      size={36}
                      weight="light"
                      className="text-[#00338D]"
                    />
                    <h3 className="mt-3 text-base font-bold text-[#0C233C]">
                      {isEditMode
                        ? "Blank 24-Column Executive Canvas"
                        : "This Dashboard Page Has No Visuals Yet"}
                    </h3>
                    <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#526075]">
                      {isEditMode
                        ? "Drag any of the 47 charts, KPI boxes, pivot matrices, or slicers from the Visuals Gallery on the left onto this grid, or drag any live Data Field directly here to begin."
                        : "Switch to Edit Mode (if permitted by your role) to drag charts and live telemetry or governance fields onto this canvas."}
                    </p>
                  </div>
                )}

                {livePreviewRect && isEditMode && (
                  <div
                    style={{
                      gridColumn: `${livePreviewRect.x + 1} / span ${livePreviewRect.w}`,
                      gridRow: `${livePreviewRect.y + 1} / span ${livePreviewRect.h}`,
                    }}
                    className="pointer-events-none z-40 flex items-center justify-center rounded-sm border-2 border-dashed border-[#1E49E2] bg-[#1E49E2]/12"
                  >
                    <span className="rounded-sm bg-[#00338D] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                      {livePreviewRect.w} cols x {livePreviewRect.h} rows
                    </span>
                  </div>
                )}

                {activePage?.widgets.map((widget) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    datasetsPayload={datasetsPayload}
                    crossFilters={crossFilters}
                    isEditMode={isEditMode}
                    isSelected={selectedWidgetId === widget.id}
                    canExport={canExport}
                    onSelect={(wid) => {
                      setSelectedWidgetId(wid);
                      setActiveDatasetId(widget.datasetId);
                    }}
                    onDelete={(wid) => {
                      updateActivePageWidgets((ws) =>
                        ws.filter((item) => item.id !== wid)
                      );
                      if (selectedWidgetId === wid) setSelectedWidgetId(null);
                      setCrossFilters((prev) =>
                        prev.filter((cf) => cf.sourceWidgetId !== wid)
                      );
                    }}
                    onDuplicate={(wid) => {
                      const src = activePage.widgets.find((item) => item.id === wid);
                      if (!src) return;
                      const slot = findNextOpenSlot(
                        activePage.widgets,
                        src.layout.w,
                        src.layout.h
                      );
                      const newId = makeClientId("wgt");
                      const clone: DashboardWidget = {
                        ...JSON.parse(JSON.stringify(src)),
                        id: newId,
                        title: `${src.title} (Copy)`,
                        layout: slot,
                      };
                      updateActivePageWidgets((ws) =>
                        resolveGridCollisions([...ws, clone], newId, slot)
                      );
                      setSelectedWidgetId(newId);
                    }}
                    onStartMove={isEditMode ? handleStartMove : undefined}
                    onStartResize={isEditMode ? handleStartResize : undefined}
                    onToggleCrossFilter={handleToggleCrossFilter}
                    onApplySlicerFilter={handleApplySlicerFilter}
                    onDrillThrough={(title, rawRows) => {
                      setDrillState({
                        isOpen: true,
                        title,
                        events: rawRows as unknown as TelemetryEvent[],
                      });
                    }}
                  />
                ))}
              </DroppableCanvasGrid>
            ) : (
              /* Mobile (< md) Clean Single-Column Stack (zero 3px crushed columns, zero duplicate DnD IDs) */
              <div className="flex flex-col gap-3">
                {sortedMobileWidgets.length === 0 ? (
                  <div className="rounded-sm border-2 border-dashed border-[#CBD5E1] bg-white px-4 py-10 text-center">
                    <PresentationChart
                      size={28}
                      weight="light"
                      className="mx-auto text-[#00338D]"
                    />
                    <p className="mt-2 text-xs font-semibold text-[#0C233C]">
                      {isEditMode
                        ? "Tap Palette to add visuals to this canvas."
                        : "This page has no visuals yet."}
                    </p>
                  </div>
                ) : (
                  sortedMobileWidgets.map((widget) => (
                    <WidgetCard
                      key={widget.id}
                      widget={widget}
                      datasetsPayload={datasetsPayload}
                      crossFilters={crossFilters}
                      isEditMode={isEditMode}
                      isSelected={selectedWidgetId === widget.id}
                      canExport={canExport}
                      isCompactStack
                      onSelect={(wid) => {
                        setSelectedWidgetId(wid);
                        setActiveDatasetId(widget.datasetId);
                        setMobileInspectorOpen(true);
                      }}
                      onDelete={(wid) => {
                        updateActivePageWidgets((ws) =>
                          ws.filter((item) => item.id !== wid)
                        );
                        if (selectedWidgetId === wid) setSelectedWidgetId(null);
                        setCrossFilters((prev) =>
                          prev.filter((cf) => cf.sourceWidgetId !== wid)
                        );
                      }}
                      onDuplicate={(wid) => {
                        const src = activePage.widgets.find((item) => item.id === wid);
                        if (!src) return;
                        const slot = findNextOpenSlot(
                          activePage.widgets,
                          src.layout.w,
                          src.layout.h
                        );
                        const newId = makeClientId("wgt");
                        const clone: DashboardWidget = {
                          ...JSON.parse(JSON.stringify(src)),
                          id: newId,
                          title: `${src.title} (Copy)`,
                          layout: slot,
                        };
                        updateActivePageWidgets((ws) =>
                          resolveGridCollisions([...ws, clone], newId, slot)
                        );
                        setSelectedWidgetId(newId);
                      }}
                      onToggleCrossFilter={handleToggleCrossFilter}
                      onApplySlicerFilter={handleApplySlicerFilter}
                      onDrillThrough={(title, rawRows) => {
                        setDrillState({
                          isOpen: true,
                          title,
                          events: rawRows as unknown as TelemetryEvent[],
                        });
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Dock: Always docked on xl+, slide-over drawer below xl */}
          {isEditMode && (
            <div
              className={
                mobileInspectorOpen
                  ? "absolute inset-y-0 right-0 z-30 flex shadow-2xl xl:static xl:z-auto xl:shadow-none"
                  : "hidden xl:flex"
              }
            >
              <WidgetInspectorPanel
                widget={selectedWidget}
                onUpdateWidget={(updated) => {
                  updateActivePageWidgets((ws) =>
                    ws.map((w) => (w.id === updated.id ? updated : w))
                  );
                }}
                onClose={() => {
                  setSelectedWidgetId(null);
                  setMobileInspectorOpen(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Bottom Multi-Page Tab Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#D8DFE9] bg-[#F4F6FA] px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <SortableContext
              items={doc.pages.map((p) => `page-tab:${p.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {doc.pages.map((pg) => (
                <SortablePageTab
                  key={pg.id}
                  page={pg}
                  isActive={pg.id === activePage?.id}
                  isEditMode={isEditMode}
                  canDelete={doc.pages.length > 1}
                  onSelect={() => {
                    setActivePageId(pg.id);
                    setSelectedWidgetId(null);
                    setCrossFilters([]);
                  }}
                  onRename={(nextTitle) => {
                    commitPagesChange((pages) =>
                      pages.map((p) =>
                        p.id === pg.id ? { ...p, title: nextTitle } : p
                      )
                    );
                  }}
                  onDuplicate={() => handleDuplicatePage(pg)}
                  onDelete={() => handleDeletePage(pg.id)}
                />
              ))}
            </SortableContext>

            {isEditMode && (
              <button
                type="button"
                onClick={handleAddPage}
                className="inline-flex items-center gap-1 rounded-sm border border-dashed border-[#00338D]/50 bg-white px-2.5 py-1 text-xs font-semibold text-[#00338D] hover:bg-[#00338D]/5"
              >
                <Plus size={12} weight="bold" />
                <span>Add Page</span>
              </button>
            )}
          </div>

          <div className="font-mono text-[10px] text-[#526075]">
            {activePage?.widgets.length || 0} visual
            {(activePage?.widgets.length || 0) !== 1 ? "s" : ""} · Live sync{" "}
            {new Date(datasetsPayload.fetchedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Crisp Drag Overlay Ghost */}
      <DragOverlay dropAnimation={null} zIndex={120}>
        {dragGhost && (
          <div className="inline-flex items-center gap-2 rounded-sm border border-[#00338D] bg-white px-3 py-1.5 text-xs font-bold text-[#00338D] shadow-xl">
            {dragGhost.visualType && (
              <VisualIcon type={dragGhost.visualType} size={15} />
            )}
            <span>{dragGhost.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );

  return (
    <>
      {isFullScreen && typeof document !== "undefined"
        ? createPortal(studioShell, document.body)
        : studioShell}

      {/* Full-Screen PowerPoint-Style Presentation Mode */}
      <PresentationOverlay
        isOpen={isPresenting}
        dashboard={syncedDoc}
        activePageIndex={activePageIndex}
        onChangePage={(idx) => {
          const target = doc.pages[idx];
          if (target) {
            setActivePageId(target.id);
            setCrossFilters([]);
          }
        }}
        datasetsPayload={datasetsPayload}
        crossFilters={crossFilters}
        canExport={canExport}
        onToggleCrossFilter={handleToggleCrossFilter}
        onApplySlicerFilter={handleApplySlicerFilter}
        onClearAllFilters={() => setCrossFilters([])}
        onDrillThrough={(title, rawRows) => {
          setDrillState({
            isOpen: true,
            title,
            events: rawRows as unknown as TelemetryEvent[],
          });
        }}
        onClose={() => setIsPresenting(false)}
      />

      {/* Live Audit Drill-Through Modal -> AuditInspectorDrawer */}
      <DrillThroughAuditModal
        isOpen={drillState.isOpen}
        widgetTitle={drillState.title}
        events={drillState.events}
        onClose={() => setDrillState({ isOpen: false, title: "", events: [] })}
      />

      {/* Unsaved Changes Exit Guard */}
      <ConfirmActionModal
        isOpen={unsavedExitOpen}
        title="Unsaved Dashboard Changes"
        description={`You have unsaved layout or visual edits on "${doc.title}". Save your changes before returning to the Gallery, or discard them.`}
        confirmLabel="Save & Exit"
        secondaryLabel="Discard Changes"
        tone="primary"
        busy={saving}
        onConfirm={() => {
          void (async () => {
            const ok = await handleSave();
            if (ok) {
              setUnsavedExitOpen(false);
              setIsFullScreen(false);
              onBackToGallery();
            } else {
              setUnsavedExitOpen(false);
            }
          })();
        }}
        onSecondary={() => {
          setUnsavedExitOpen(false);
          setIsFullScreen(false);
          onBackToGallery();
        }}
        onClose={() => setUnsavedExitOpen(false)}
      />
    </>
  );
}
