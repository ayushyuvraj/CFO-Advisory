import { DashboardWidget, GridRect } from "./types";

export const GRID_COLUMNS = 24;
export const GRID_ROW_HEIGHT_PX = 36;
export const GRID_GAP_PX = 10;
export const GRID_MAX_Y = 500;

function finiteOr(val: unknown, fallback: number): number {
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function clampRect(
  rect: GridRect,
  minW = 2,
  minH = 2
): GridRect {
  const safeMinW = Math.max(1, Math.min(GRID_COLUMNS, Math.round(finiteOr(minW, 2))));
  const safeMinH = Math.max(1, Math.min(40, Math.round(finiteOr(minH, 2))));
  const w = Math.max(
    safeMinW,
    Math.min(GRID_COLUMNS, Math.round(finiteOr(rect.w, safeMinW)))
  );
  const h = Math.max(safeMinH, Math.min(40, Math.round(finiteOr(rect.h, safeMinH))));
  const x = Math.max(
    0,
    Math.min(GRID_COLUMNS - w, Math.round(finiteOr(rect.x, 0)))
  );
  const y = Math.max(0, Math.min(GRID_MAX_Y, Math.round(finiteOr(rect.y, 0))));
  return { x, y, w, h };
}

/**
 * Finds the first open grid slot for a widget of size (w, h) scanning left-to-right, top-to-bottom.
 */
export function findNextOpenSlot(
  widgets: DashboardWidget[],
  w: number,
  h: number
): GridRect {
  const clampedW = Math.max(2, Math.min(GRID_COLUMNS, Math.round(finiteOr(w, 6))));
  const clampedH = Math.max(2, Math.min(40, Math.round(finiteOr(h, 6))));

  const maxY = Math.min(
    GRID_MAX_Y,
    widgets.reduce((acc, item) => {
      const safe = clampRect(item.layout, 1, 1);
      return Math.max(acc, safe.y + safe.h);
    }, 0)
  );

  for (let y = 0; y <= Math.min(GRID_MAX_Y, maxY + 2); y++) {
    for (let x = 0; x <= GRID_COLUMNS - clampedW; x++) {
      const candidate: GridRect = { x, y, w: clampedW, h: clampedH };
      const collides = widgets.some((existing) =>
        rectsOverlap(candidate, clampRect(existing.layout, 1, 1))
      );
      if (!collides) {
        return candidate;
      }
    }
  }

  return { x: 0, y: Math.min(GRID_MAX_Y, maxY), w: clampedW, h: clampedH };
}

/**
 * Resolves collisions deterministically by pushing overlapping widgets downward
 * while keeping the actively moved/resized widget pinned at its target rect.
 */
export function resolveGridCollisions(
  widgets: DashboardWidget[],
  activeId: string,
  targetRect: GridRect
): DashboardWidget[] {
  const next = widgets.map((w) =>
    w.id === activeId
      ? { ...w, layout: clampRect(targetRect, 2, 2) }
      : { ...w, layout: clampRect(w.layout, 1, 1) }
  );

  const maxPasses = Math.max(60, next.length * 3);
  for (let pass = 0; pass < maxPasses; pass++) {
    let movedAny = false;
    const sorted = [...next].sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      if (a.layout.y !== b.layout.y) return a.layout.y - b.layout.y;
      return a.layout.x - b.layout.x;
    });

    for (let i = 0; i < sorted.length; i++) {
      const upper = sorted[i];
      for (let j = i + 1; j < sorted.length; j++) {
        const lower = sorted[j];
        if (lower.id === activeId) continue;
        if (rectsOverlap(upper.layout, lower.layout)) {
          lower.layout.y = Math.min(GRID_MAX_Y, upper.layout.y + upper.layout.h);
          movedAny = true;
        }
      }
    }
    if (!movedAny) break;
  }

  return next;
}

/**
 * Converts a canvas pixel coordinate (relative to grid container content top-left)
 * into a snapped 24-column grid cell (x, y).
 */
export function pixelToGridCell(
  relX: number,
  relY: number,
  containerWidth: number,
  widgetW: number
): { x: number; y: number } {
  const safeWidth = finiteOr(containerWidth, 0);
  const safeW = Math.max(1, Math.min(GRID_COLUMNS, Math.round(finiteOr(widgetW, 6))));
  if (safeWidth <= 0) return { x: 0, y: 0 };

  const colWidth = Math.max(
    1,
    (safeWidth - GRID_GAP_PX * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  );
  const colStep = colWidth + GRID_GAP_PX;
  const rowStep = GRID_ROW_HEIGHT_PX + GRID_GAP_PX;

  const rawX = Math.round(finiteOr(relX, 0) / colStep);
  const rawY = Math.round(finiteOr(relY, 0) / rowStep);

  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - safeW, rawX)),
    y: Math.max(0, Math.min(GRID_MAX_Y, rawY)),
  };
}

export function getCanvasRowCount(widgets: DashboardWidget[], minRows = 16): number {
  const maxRow = widgets.reduce((acc, w) => {
    const safe = clampRect(w.layout, 1, 1);
    return Math.max(acc, safe.y + safe.h);
  }, 0);
  return Math.min(GRID_MAX_Y + 40, Math.max(minRows, maxRow + 4));
}
