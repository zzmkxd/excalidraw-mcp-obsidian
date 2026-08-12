import type { ServerElement } from '../types.js';

export interface LabelOffsetSuggestion {
  arrowId: string;
  reason: string;
  suggestedLabelOffset: number;
  currentLabelOffset: number | null;
}

function endpointIds(el: ServerElement): { startId?: string; endId?: string } {
  return {
    startId: (el as any).start?.id ?? (el as any).startBinding?.elementId ?? undefined,
    endId: (el as any).end?.id ?? (el as any).endBinding?.elementId ?? undefined,
  };
}

/**
 * Detect arrows likely to have overlapping labels and suggest labelOffset values.
 * Groups by unordered endpoint pair and by (startId + direction quadrant).
 */
export function suggestLabelOffsets(arrows: ServerElement[]): LabelOffsetSuggestion[] {
  const labeled = arrows.filter(
    el => (el.type === 'arrow' || el.type === 'line') && el.label?.text
  );
  if (labeled.length < 2) return [];

  const suggestions: LabelOffsetSuggestion[] = [];
  const suggestedIds = new Set<string>();

  // Parallel arrows: same start + similar direction
  const byStartDir = new Map<string, ServerElement[]>();
  for (const el of labeled) {
    const { startId } = endpointIds(el);
    if (!startId || !el.points || el.points.length < 2) continue;
    const [x1, y1] = el.points[0]!;
    const [x2, y2] = el.points[el.points.length - 1]!;
    const quadrant = ((Math.round(Math.atan2(y2 - y1, x2 - x1) / (Math.PI / 4)) % 8) + 8) % 8;
    const key = `${startId}:${quadrant}`;
    if (!byStartDir.has(key)) byStartDir.set(key, []);
    byStartDir.get(key)!.push(el);
  }

  for (const group of byStartDir.values()) {
    if (group.length < 2) continue;
    const n = group.length;
    group.forEach((el, i) => {
      const suggested = Number((0.2 + (0.6 * i) / (n - 1)).toFixed(2));
      const current = el.labelOffset ?? null;
      if (current !== null && Math.abs(current - suggested) < 0.05) return;
      suggestedIds.add(el.id);
      suggestions.push({
        arrowId: el.id,
        reason: `parallel_same_source (${group.length} arrows share start+direction)`,
        suggestedLabelOffset: suggested,
        currentLabelOffset: current,
      });
    });
  }

  // Bidirectional / multi-arrow on same unordered pair
  const byPair = new Map<string, ServerElement[]>();
  for (const el of labeled) {
    const { startId, endId } = endpointIds(el);
    if (!startId || !endId) continue;
    const pairKey = [startId, endId].sort().join(':');
    if (!byPair.has(pairKey)) byPair.set(pairKey, []);
    byPair.get(pairKey)!.push(el);
  }

  for (const group of byPair.values()) {
    if (group.length < 2) continue;
    group.forEach((el, i) => {
      if (suggestedIds.has(el.id)) return;
      // Stagger near start for each direction
      const suggested = Number((0.25 + 0.15 * i).toFixed(2));
      const current = el.labelOffset ?? null;
      if (current !== null && Math.abs(current - suggested) < 0.05) return;
      suggestions.push({
        arrowId: el.id,
        reason: `shared_endpoint_pair (${group.length} arrows between same nodes)`,
        suggestedLabelOffset: Math.min(suggested, 0.75),
        currentLabelOffset: current,
      });
    });
  }

  return suggestions;
}
