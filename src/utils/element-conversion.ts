import { ServerElement, normalizeFontFamily, generateId, elements } from '../types.js';

/** Normalize HTML <br> tags and collapse excessive newlines */
export function normalizeLineBreakMarkup(text: string): string {
  return text
    .replace(/<\s*b\s*r\s*\/?\s*>/gi, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** Apply default values for fontFamily, strokeColor, strokeWidth, roughness, fontSize */
export function resolveElementDefaults<T extends Record<string, any>>(
  elementData: T,
  fontFamilyDefault: number,
): T {
  return {
    ...elementData,
    fontFamily: normalizeFontFamily(elementData.fontFamily) ?? fontFamilyDefault ?? 2,
    strokeColor: elementData.strokeColor ?? '#495057',
    strokeWidth: elementData.strokeWidth ?? 2,
    roughness: elementData.roughness ?? 0,
    fontSize: elementData.fontSize ?? 16,
  };
}

/** Normalize points to [x, y] tuple format that Excalidraw expects */
export function normalizePoints(points: Array<{ x: number; y: number } | [number, number]>): [number, number][] {
  return points.map(p => {
    if (Array.isArray(p)) return p as [number, number];
    return [p.x, p.y] as [number, number];
  });
}

/**
 * Convert text property to label format for Excalidraw shapes.
 * Standalone text elements keep text as a direct property.
 * Shape elements (rectangle, ellipse, diamond, arrow, line, etc.)
 * get their text moved to label: { text }.
 */
export function convertTextToLabel(element: Partial<ServerElement> & { type?: string }): Partial<ServerElement> {
  if (element.text) {
    if (element.type === 'text') {
      return element;
    }
    const { text, ...rest } = element;
    return { ...rest, label: { text } };
  }
  // REST API clients may send text elements with label: {text} instead of text field
  if (element.type === 'text' && element.label?.text) {
    const { label, ...rest } = element;
    return { ...rest, text: label.text };
  }
  return element;
}

/**
 * Get the normalized perpendicular direction at a point along the path.
 * Returns a unit vector perpendicular to the segment at position t.
 */
function getPerpendicularAtPoint(points: [number, number][], t: number): { dx: number; dy: number } {
  if (points.length < 2) return { dx: 0, dy: -1 };

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!;
    const p1 = points[i]!;
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalLength += len;
  }
  if (totalLength === 0) return { dx: 0, dy: -1 };

  let targetDist = t * totalLength;
  let segIdx = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    if (targetDist <= segmentLengths[i]! || i === segmentLengths.length - 1) {
      segIdx = i;
      break;
    }
    targetDist -= segmentLengths[i]!;
  }
  const p0 = points[segIdx]!;
  const p1 = points[segIdx + 1]!;
  const segDx = p1[0] - p0[0];
  const segDy = p1[1] - p0[1];
  const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
  if (segLen === 0) return { dx: 0, dy: -1 };
  // Perpendicular: rotate 90° counter-clockwise, normalized
  return { dx: -segDy / segLen, dy: segDx / segLen };
}

/**
 * Interpolate a position along a multi-segment path.
 * @param points — array of [x, y] coordinate pairs (relative to element origin)
 * @param t — 0.0 = start, 0.5 = midpoint, 1.0 = end
 */
function interpolateOnPath(points: [number, number][], t: number): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0]![0], y: points[0]![1] };

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!;
    const p1 = points[i]!;
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalLength += len;
  }
  if (totalLength === 0) return { x: points[0]![0], y: points[0]![1] };

  let targetDist = t * totalLength;
  for (let i = 0; i < segmentLengths.length; i++) {
    if (targetDist <= segmentLengths[i]! || i === segmentLengths.length - 1) {
      const ratio = segmentLengths[i]! > 0 ? targetDist / segmentLengths[i]! : 0;
      const p0 = points[i]!;
      const p1 = points[i + 1]!;
      return {
        x: p0[0] + ratio * (p1[0] - p0[0]),
        y: p0[1] + ratio * (p1[1] - p0[1]),
      };
    }
    targetDist -= segmentLengths[i]!;
  }
  const last = points[points.length - 1]!;
  return { x: last[0], y: last[1] };
}

const SHAPE_LABEL_TYPES = new Set(['rectangle', 'diamond', 'ellipse']);

function hasBoundText(el: ServerElement): boolean {
  return !!el.boundElements?.some(b => b.type === 'text');
}

/** Endpoint ids — prefer start/end (pre-resolve), fall back to bindings (post-resolve). */
function arrowEndpointIds(el: ServerElement): { startId?: string; endId?: string } {
  return {
    startId: (el as any).start?.id ?? (el as any).startBinding?.elementId ?? undefined,
    endId: (el as any).end?.id ?? (el as any).endBinding?.elementId ?? undefined,
  };
}

/**
 * For arrows/lines/shapes with label text, create bound text elements so that
 * Obsidian Excalidraw can render labels. Without boundElements + companion
 * text elements, labels are invisible in .excalidraw.md files.
 *
 * Shapes may already have arrow entries in boundElements (from resolveArrowBindings);
 * only skip when a text binding already exists.
 */
export function createLabelBoundElements(batchElements: ServerElement[]): ServerElement[] {
  // Auto-distribute labelOffset for parallel arrows sharing the same source + direction.
  const autoOffsets = new Map<string, number>();
  const autoPerpDists = new Map<string, number>();
  const perpStagger = [-12, 12, -18, 18, -24, 24];
  const groups = new Map<string, ServerElement[]>();
  for (const el of batchElements) {
    if ((el.type !== 'arrow' && el.type !== 'line') || !el.label?.text) continue;
    if (el.labelOffset !== undefined) continue; // respect explicit user setting
    const { startId } = arrowEndpointIds(el);
    if (!startId || !el.points || el.points.length < 2) continue;
    const [x1, y1] = el.points[0];
    const [x2, y2] = el.points[el.points.length - 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const quadrant = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    const key = `${startId}:${quadrant}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(el);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const n = group.length;
    group.forEach((el, i) => {
      autoOffsets.set(el.id, 0.2 + (0.6 * i) / (n - 1));
      autoPerpDists.set(el.id, perpStagger[i % perpStagger.length]!);
    });
  }

  // Second pass: for unordered node pairs (bidirectional arrows), offset labels near their respective starts.
  // Only triggers when a pair has >= 2 arrows total (e.g., request+response, not a single arrow).
  const pairTotal = new Map<string, number>();
  for (const el of batchElements) {
    if ((el.type !== 'arrow' && el.type !== 'line') || !el.label?.text) continue;
    const { startId, endId } = arrowEndpointIds(el);
    if (!startId || !endId) continue;
    const pairKey = [startId, endId].sort().join(':');
    pairTotal.set(pairKey, (pairTotal.get(pairKey) || 0) + 1);
  }
  for (const el of batchElements) {
    if ((el.type !== 'arrow' && el.type !== 'line') || !el.label?.text) continue;
    if (autoOffsets.has(el.id)) continue; // already handled by first pass
    if (el.labelOffset !== undefined) continue;
    const { startId, endId } = arrowEndpointIds(el);
    if (!startId || !endId || !el.points || el.points.length < 2) continue;
    const pairKey = [startId, endId].sort().join(':');
    if ((pairTotal.get(pairKey) || 0) >= 2) {
      autoOffsets.set(el.id, 0.25);
      const dx = el.points[el.points.length - 1]![0] - el.points[0]![0];
      autoPerpDists.set(el.id, dx > 0 ? 12 : -12); // always below the line
    }
  }

  const newTextElements: ServerElement[] = [];
  const now = new Date().toISOString();

  for (const el of batchElements) {
    if ((el.type === 'arrow' || el.type === 'line') && el.label?.text && !hasBoundText(el)) {
      const textId = generateId();
      let labelX = el.x;
      let labelY = el.y - 18;
      if (el.points && el.points.length >= 2) {
        const offset = autoOffsets.get(el.id) ?? el.labelOffset ?? 0.5;
        const pos = interpolateOnPath(el.points as [number, number][], offset);
        const usePerp = autoPerpDists.has(el.id);
        if (usePerp) {
          const perp = getPerpendicularAtPoint(el.points as [number, number][], offset);
          const dist = autoPerpDists.get(el.id)!;
          labelX = el.x + pos.x + perp.dx * dist;
          labelY = el.y + pos.y + perp.dy * dist;
        } else {
          labelX = el.x + pos.x;
          labelY = el.y + pos.y - 12;
        }
      }
      const labelText: ServerElement = {
        id: textId,
        type: 'text',
        x: labelX,
        y: labelY,
        text: el.label.text,
        fontSize: 12,
        fontFamily: el.fontFamily ?? 2,
        strokeColor: el.strokeColor ?? '#495057',
        roughness: el.roughness ?? 0,
        containerId: el.id,
        strokeWidth: 2,
        createdAt: now,
        updatedAt: now,
        version: 1,
      } as ServerElement;
      el.boundElements = [...(el.boundElements || []), { type: 'text' as const, id: textId }];
      newTextElements.push(labelText);
    }
  }

  // Shape labels (rectangle / diamond / ellipse): same bound-text pattern as arrows.
  for (const el of batchElements) {
    if (!SHAPE_LABEL_TYPES.has(el.type) || !el.label?.text || hasBoundText(el)) continue;

    const textId = generateId();
    const containerW = el.width ?? 160;
    const containerH = el.height ?? 80;
    const fontSize = el.fontSize ?? 16;
    const textW = Math.max(containerW - 20, 40);
    const textH = Math.max(containerH / 2, fontSize * 1.5);
    const labelText: ServerElement = {
      id: textId,
      type: 'text',
      x: el.x + containerW / 2,
      y: el.y + containerH / 2,
      width: textW,
      height: textH,
      text: el.label.text,
      fontSize,
      fontFamily: el.fontFamily ?? 2,
      strokeColor: el.strokeColor ?? '#495057',
      roughness: el.roughness ?? 0,
      containerId: el.id,
      textAlign: 'center',
      verticalAlign: 'middle',
      strokeWidth: 2,
      createdAt: now,
      updatedAt: now,
      version: 1,
    } as ServerElement;
    el.boundElements = [...(el.boundElements || []), { type: 'text' as const, id: textId }];
    newTextElements.push(labelText);
  }

  return newTextElements;
}

/**
 * Bind text elements to their containing shapes (rectangle, ellipse, diamond).
 * - Finds the smallest shape that contains each text element's center
 * - Uses a distance threshold (min(w,h)/3) to skip edge labels like zone titles
 * - Sets containerId, textAlign, verticalAlign and corrects text position to shape center
 */
export function bindTextToShapes(batchElements: ServerElement[]): void {
  const shapes = batchElements.filter(
    el => el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond'
  );
  if (!shapes.length) return;

  for (const el of batchElements) {
    if (el.type !== 'text') continue;
    if (el.containerId) continue;

    let bestShape: ServerElement | null = null;
    let bestArea = Infinity;

    for (const shape of shapes) {
      const shapeLeft = shape.x;
      const shapeRight = shape.x + (shape.width || 0);
      const shapeTop = shape.y;
      const shapeBottom = shape.y + (shape.height || 0);

      if (el.x >= shapeLeft && el.x <= shapeRight &&
          el.y >= shapeTop && el.y <= shapeBottom) {
        const area = (shape.width || 0) * (shape.height || 0);
        if (area < bestArea) {
          bestArea = area;
          bestShape = shape;
        }
      }
    }

    if (!bestShape) continue;

    const shapeCX = bestShape.x + (bestShape.width || 0) / 2;
    const shapeCY = bestShape.y + (bestShape.height || 0) / 2;
    const dist = Math.sqrt((el.x - shapeCX) ** 2 + (el.y - shapeCY) ** 2);
    const threshold = Math.min(bestShape.width || 0, bestShape.height || 0) / 3;
    if (dist > threshold) continue;

    el.containerId = bestShape.id;
    (el as any).textAlign = 'center';
    (el as any).verticalAlign = 'middle';
    el.x = shapeCX;
    el.y = shapeCY;

    bestShape.boundElements = [
      ...(bestShape.boundElements || []),
      { type: 'text' as const, id: el.id },
    ];
  }
}

/** Shared element construction — used by both create_element and batch_create_elements handlers */
export function buildServerElement(
  elementData: Record<string, any>,
  fontFamilyDefault: number,
): ServerElement {
  const { startElementId, endElementId, id: customId, ...elementProps } = elementData;
  const id = customId || generateId();
  const withDefaults = resolveElementDefaults(elementProps, fontFamilyDefault);
  const element = {
    id, ...withDefaults,
    points: elementProps.points ? normalizePoints(elementProps.points) : undefined,
    ...(startElementId ? { start: { id: startElementId } } : {}),
    ...(endElementId ? { end: { id: endElementId } } : {}),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1,
  };

  if ((startElementId || endElementId) && !elementProps.points) {
    (element as any).points = [[0, 0], [100, 0]];
  }

  return convertTextToLabel(element) as ServerElement;
}
