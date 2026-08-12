import { elements, ServerElement } from './types.js';

const SNAP_TOLERANCE = 20;

/** Return the 4 cardinal edge midpoints for a bindable element */
function getCardinalMidpoints(el: ServerElement): { x: number; y: number }[] {
  const cx = el.x + (el.width || 0) / 2;
  const cy = el.y + (el.height || 0) / 2;
  const hw = (el.width || 0) / 2;
  const hh = (el.height || 0) / 2;
  return [
    { x: cx, y: cy - hh },       // top
    { x: cx, y: cy + hh },       // bottom
    { x: cx - hw, y: cy },       // left
    { x: cx + hw, y: cy },       // right
  ];
}

/** Snap a point to the nearest cardinal midpoint if within tolerance */
function snapToNearestMidpoint(
  el: ServerElement,
  rawPoint: { x: number; y: number },
  tolerance: number = SNAP_TOLERANCE,
): { x: number; y: number } {
  const midpoints = getCardinalMidpoints(el);
  let best = rawPoint;
  let bestDist = Infinity;
  for (const mp of midpoints) {
    const dist = Math.hypot(mp.x - rawPoint.x, mp.y - rawPoint.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = mp;
    }
  }
  return bestDist <= tolerance ? best : rawPoint;
}

export function computeEdgePoint(
  el: ServerElement,
  targetCenterX: number,
  targetCenterY: number,
  gap?: number,
  snap?: boolean,
): { x: number; y: number } {
  const gapOffset = gap || 0;
  const cx = el.x + (el.width || 0) / 2;
  const cy = el.y + (el.height || 0) / 2;
  const hw = (el.width || 0) / 2;
  const hh = (el.height || 0) / 2;
  const dx = targetCenterX - cx;
  const dy = targetCenterY - cy;

  let rawPoint: { x: number; y: number };

  if (el.type === 'diamond') {
    if (dx === 0 && dy === 0) rawPoint = { x: cx, y: cy + hh };
    else {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const scale = (absDx / hw + absDy / hh) > 0
        ? 1 / (absDx / hw + absDy / hh)
        : 1;
      rawPoint = { x: cx + dx * scale, y: cy + dy * scale };
    }
  } else if (el.type === 'ellipse') {
    if (dx === 0 && dy === 0) rawPoint = { x: cx, y: cy + hh };
    else {
      const angle = Math.atan2(dy, dx);
      rawPoint = { x: cx + hw * Math.cos(angle), y: cy + hh * Math.sin(angle) };
    }
  } else {
    // Rectangle
    if (dx === 0 && dy === 0) rawPoint = { x: cx, y: cy + hh };
    else {
      const angle = Math.atan2(dy, dx);
      const tanA = Math.tan(angle);
      if (Math.abs(tanA * hw) <= hh) {
        const signX = dx >= 0 ? 1 : -1;
        const edgeY = cy + signX * hw * tanA;
        rawPoint = { x: cx + signX * hw, y: edgeY };
      } else {
        const signY = dy >= 0 ? 1 : -1;
        const edgeX = cx + signY * hh / tanA;
        rawPoint = { x: edgeX, y: cy + signY * hh };
      }
    }
  }

  // Snap to nearest cardinal midpoint (default: true). Disable for 3+ arrows between same pair.
  const point = snap !== false ? snapToNearestMidpoint(el, rawPoint) : rawPoint;

  // Apply gap offset along the edge from the final point
  if (gapOffset !== 0) {
    // Determine which edge the point is on
    const onLeft = Math.abs(point.x - (cx - hw)) < 1;
    const onRight = Math.abs(point.x - (cx + hw)) < 1;
    const onTop = Math.abs(point.y - (cy - hh)) < 1;
    const onBottom = Math.abs(point.y - (cy + hh)) < 1;

    if (onLeft || onRight) {
      const signX = onRight ? 1 : -1;
      point.y += signX * gapOffset;
      point.y = Math.max(cy - hh, Math.min(cy + hh, point.y));
    } else if (onTop || onBottom) {
      const signY = onBottom ? 1 : -1;
      point.x -= signY * gapOffset;
      point.x = Math.max(cx - hw, Math.min(cx + hw, point.x));
    }
  }

  return point;
}

/** Determine which edge a point is on and compute focus (0..1) along that edge, clockwise */
function computeBinding(
  el: ServerElement,
  point: { x: number; y: number },
  gap: number,
): { elementId: string; focus: number; gap: number } {
  const cx = el.x + (el.width || 0) / 2;
  const cy = el.y + (el.height || 0) / 2;
  const hw = (el.width || 0) / 2;
  const hh = (el.height || 0) / 2;

  const onLeft = Math.abs(point.x - (cx - hw)) < 1;
  const onRight = Math.abs(point.x - (cx + hw)) < 1;
  const onTop = Math.abs(point.y - (cy - hh)) < 1;
  const onBottom = Math.abs(point.y - (cy + hh)) < 1;

  let focus = 0.5;
  if (onTop && !onLeft && !onRight) focus = (point.x - (cx - hw)) / (2 * hw);
  else if (onBottom && !onLeft && !onRight) focus = ((cx + hw) - point.x) / (2 * hw);
  else if (onLeft && !onTop && !onBottom) focus = ((cy + hh) - point.y) / (2 * hh);
  else if (onRight && !onTop && !onBottom) focus = (point.y - (cy - hh)) / (2 * hh);

  return { elementId: el.id, focus: Math.round(focus * 1000) / 1000, gap };
}

/**
 * Auto-assign `gap` for arrows that share an unordered endpoint pair, so
 * overlapping / coincident paths get a parallel edge-slide translation.
 *
 * Gap convention (see computeEdgePoint): start uses +gap, end uses -gap.
 * - Same-direction parallels → staggered gaps (±STAGGER, …)
 * - Opposite directions (request/response) → same gap value on both
 *   (identical gap separates bidirectional lines; opposite gaps collapse them)
 *
 * Explicit `gap` on an arrow is never overwritten.
 */
export function assignParallelGaps(batchElements: ServerElement[]): void {
  const STAGGER = 10;
  const arrows = batchElements.filter(el => {
    if (el.type !== 'arrow' && el.type !== 'line') return false;
    const s = (el as any).start?.id;
    const e = (el as any).end?.id;
    return !!s && !!e;
  });

  const pairs = new Map<string, ServerElement[]>();
  for (const el of arrows) {
    const s = (el as any).start.id as string;
    const e = (el as any).end.id as string;
    const key = [s, e].sort().join('\0');
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key)!.push(el);
  }

  for (const group of pairs.values()) {
    if (group.length < 2) continue;

    // 3+ arrows on the same pair: prefer raw edge points over cardinal snap
    // so staggered gaps don't all collapse back to the midpoint first.
    if (group.length >= 3) {
      for (const el of group) {
        if ((el as any).snap === undefined) (el as any).snap = false;
      }
    }

    const byDir = new Map<string, ServerElement[]>();
    for (const el of group) {
      const dir = `${(el as any).start.id}->${(el as any).end.id}`;
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir)!.push(el);
    }
    const dirCount = byDir.size;

    if (dirCount >= 2) {
      // Bidirectional (or multi-dir): each direction shares one base gap.
      // Opposite dirs with the SAME gap value produce opposite parallel offsets.
      // Within a direction that has 2+ arrows, stagger further (±STAGGER around base).
      for (const dirArrows of byDir.values()) {
        dirArrows.forEach((el, i) => {
          if ((el as any).gap !== undefined) return;
          if (dirArrows.length === 1) {
            (el as any).gap = STAGGER;
          } else {
            (el as any).gap = STAGGER + (i - (dirArrows.length - 1) / 2) * STAGGER;
          }
        });
      }
    } else {
      // All same direction (incl. 3+): stagger symmetrically — e.g. -10, 0, +10
      group.forEach((el, i) => {
        if ((el as any).gap !== undefined) return;
        (el as any).gap = (i - (group.length - 1) / 2) * STAGGER;
      });
    }
  }
}

export function resolveArrowBindings(batchElements: ServerElement[]): void {
  const elementMap = new Map<string, ServerElement>();
  batchElements.forEach(el => elementMap.set(el.id, el));

  elements.forEach((el, id) => {
    if (!elementMap.has(id)) elementMap.set(id, el);
  });

  // Detect same-pair overlap and assign edge-slide gaps before geometry is computed
  assignParallelGaps(batchElements);

  for (const el of batchElements) {
    if (el.type !== 'arrow' && el.type !== 'line') continue;
    const startRef = (el as any).start as { id: string } | undefined;
    const endRef = (el as any).end as { id: string } | undefined;

    if (!startRef && !endRef) continue;

    const startEl = startRef ? elementMap.get(startRef.id) : undefined;
    const endEl = endRef ? elementMap.get(endRef.id) : undefined;

    const startCenter = startEl
      ? { x: startEl.x + (startEl.width || 0) / 2, y: startEl.y + (startEl.height || 0) / 2 }
      : { x: el.x, y: el.y };
    const endCenter = endEl
      ? { x: endEl.x + (endEl.width || 0) / 2, y: endEl.y + (endEl.height || 0) / 2 }
      : { x: el.x + 100, y: el.y };

    const arrowGap = (el as any).gap as number | undefined;
    const arrowSnap = (el as any).snap as boolean | undefined;

    const startPt = startEl
      ? computeEdgePoint(startEl, endCenter.x, endCenter.y, arrowGap, arrowSnap)
      : startCenter;
    const endPt = endEl
      ? computeEdgePoint(endEl, startCenter.x, startCenter.y, arrowGap !== undefined ? -arrowGap : undefined, arrowSnap)
      : endCenter;

    el.x = startPt.x;
    el.y = startPt.y;
    el.points = [[0, 0], [endPt.x - startPt.x, endPt.y - startPt.y]];

    // Set real Excalidraw bindings so Obsidian can track arrow-to-shape connections
    const gapVal = arrowGap || 0;
    if (startEl) {
      (el as any).startBinding = computeBinding(startEl, startPt, gapVal);
      startEl.boundElements = [...(startEl.boundElements || []), { type: 'arrow' as const, id: el.id }];
    }
    if (endEl) {
      (el as any).endBinding = computeBinding(endEl, endPt, gapVal);
      endEl.boundElements = [...(endEl.boundElements || []), { type: 'arrow' as const, id: el.id }];
    }

    delete (el as any).start;
    delete (el as any).end;
  }
}
