import type { ServerElement } from '../types.js';

export interface ChecklistWarning {
  code: string;
  message: string;
  elementIds?: string[];
}

/** Surface fills from guide-base + clean-tech presets (case-insensitive compare). */
const SURFACE_FILLS = new Set(
  ['#ffffff', '#f5f5f5', '#f8f8f0', '#cccccc', '#ebebeb'].map(c => c.toLowerCase())
);

function endpointIds(el: ServerElement): { startId?: string; endId?: string } {
  return {
    startId: (el as any).start?.id ?? (el as any).startBinding?.elementId,
    endId: (el as any).end?.id ?? (el as any).endBinding?.elementId,
  };
}

function normColor(c: unknown): string {
  return String(c ?? '').trim().toLowerCase();
}

/** Large zone / swimlane background — templates create these without text. */
export function isSurfaceZone(el: ServerElement): boolean {
  if (el.type !== 'rectangle') return false;
  const w = el.width || 0;
  const h = el.height || 0;
  const area = w * h;
  if (area < 80000 && w < 400) return false;
  const fill = normColor(el.backgroundColor);
  // Empty/transparent fill still counts if large enough (some zones use white)
  if (!fill || fill === 'transparent' || fill === '') return area >= 80000 || w >= 400;
  return SURFACE_FILLS.has(fill) || area >= 80000 || w >= 400;
}

/** Sequence activation bar — narrow tall rectangle without text. */
export function isActivationBar(el: ServerElement): boolean {
  if (el.type !== 'rectangle') return false;
  const w = el.width || 0;
  const h = el.height || 0;
  return w > 0 && w <= 40 && h >= 2 * w;
}

function textExempt(el: ServerElement): boolean {
  return isSurfaceZone(el) || isActivationBar(el);
}

/**
 * Lightweight scene QA. Returns warnings only — never blocks creation.
 * High-value rules from guide-base; surface/activation heuristics match templates.
 */
export function runSceneChecklist(allElements: Iterable<ServerElement>): ChecklistWarning[] {
  const els = Array.from(allElements);
  const warnings: ChecklistWarning[] = [];
  const shapes = els.filter(e => e.type === 'rectangle' || e.type === 'diamond' || e.type === 'ellipse');
  const arrows = els.filter(e => e.type === 'arrow'); // lines (lifelines) need not be bound
  const texts = els.filter(e => e.type === 'text');
  const textById = new Map(texts.map(t => [t.id, t]));

  // 1) Shapes with label must have a bound text companion
  for (const s of shapes) {
    if (!s.label?.text) continue;
    const boundText = s.boundElements?.find(b => b.type === 'text');
    if (!boundText || !textById.has(boundText.id)) {
      warnings.push({
        code: 'shape_label_missing_bound_text',
        message: `Shape "${s.id}" has label "${s.label.text}" but no bound text element — Obsidian export will hide the label.`,
        elementIds: [s.id],
      });
    }
  }

  // 2) Process-like shapes without any label / bound text (exempt surfaces & activation bars)
  for (const s of shapes) {
    if (textExempt(s)) continue;
    const hasBoundText = s.boundElements?.some(b => b.type === 'text' && textById.has(b.id));
    if (!s.label?.text && !hasBoundText) {
      warnings.push({
        code: 'shape_without_text',
        message: `Shape "${s.id}" (${s.type}) has no text/label — guide-base expects all shapes to have text.`,
        elementIds: [s.id],
      });
    }
  }

  // 3) Arrows should be bound to endpoints (post-resolve). Lifelines are type=line — skipped.
  for (const a of arrows) {
    const { startId, endId } = endpointIds(a);
    if (!startId || !endId) {
      warnings.push({
        code: 'arrow_unbound',
        message: `Arrow "${a.id}" missing start/end binding — prefer bind_arrows with startElementId/endElementId.`,
        elementIds: [a.id],
      });
    }
  }

  // 4) Same unordered pair with coincident geometry (y within 2px)
  const byPair = new Map<string, ServerElement[]>();
  for (const a of arrows) {
    const { startId, endId } = endpointIds(a);
    if (!startId || !endId) continue;
    const key = [startId, endId].sort().join(':');
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(a);
  }
  for (const [key, group] of byPair) {
    if (group.length < 2) continue;
    const ys = group.map(a => Math.round(a.y));
    if (new Set(ys).size < 2) {
      warnings.push({
        code: 'parallel_arrows_coincident',
        message: `${group.length} arrows on pair ${key} share the same y — expected auto gap separation.`,
        elementIds: group.map(a => a.id),
      });
    }
  }

  // 5) Font size floor (guide-base: >= 12)
  for (const el of els) {
    const fs = el.fontSize;
    if (fs !== undefined && fs < 12) {
      warnings.push({
        code: 'font_size_too_small',
        message: `Element "${el.id}" fontSize=${fs} < 12.`,
        elementIds: [el.id],
      });
    }
  }

  // 6) Heavy shape AABB overlap — skip when either is a surface (nodes live inside zones)
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i]!, b = shapes[j]!;
      if (isSurfaceZone(a) || isSurfaceZone(b)) continue;
      if (isActivationBar(a) || isActivationBar(b)) continue;
      const aw = a.width || 0, ah = a.height || 0;
      const bw = b.width || 0, bh = b.height || 0;
      const overlapX = Math.max(0, Math.min(a.x + aw, b.x + bw) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + ah, b.y + bh) - Math.max(a.y, b.y));
      const area = overlapX * overlapY;
      const minArea = Math.min(aw * ah, bw * bh);
      if (minArea > 0 && area / minArea > 0.5) {
        warnings.push({
          code: 'shapes_overlap',
          message: `Shapes "${a.id}" and "${b.id}" overlap heavily (>50% of smaller area).`,
          elementIds: [a.id, b.id],
        });
      }
    }
  }

  return warnings;
}

export function formatChecklistWarnings(warnings: ChecklistWarning[]): string {
  if (!warnings.length) return '';
  const lines = warnings.map(w => `- [${w.code}] ${w.message}`);
  return `\n\n⚠️ Scene checklist (${warnings.length} warning(s)):\n${lines.join('\n')}`;
}
