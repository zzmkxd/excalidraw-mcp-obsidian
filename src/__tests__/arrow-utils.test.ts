import { describe, it, expect, beforeEach } from 'vitest';
import { assignParallelGaps, resolveArrowBindings, computeEdgePoint } from '../arrow-utils.js';
import { elements } from '../types.js';
import type { ServerElement } from '../types.js';

function shape(id: string, x: number, y: number): ServerElement {
  return {
    id, type: 'rectangle', x, y, width: 100, height: 40,
    createdAt: '', updatedAt: '', version: 1,
  } as ServerElement;
}

function arrow(id: string, startId: string, endId: string, gap?: number): ServerElement {
  return {
    id, type: 'arrow', x: 0, y: 0,
    start: { id: startId }, end: { id: endId },
    ...(gap !== undefined ? { gap } : {}),
    createdAt: '', updatedAt: '', version: 1,
  } as ServerElement;
}

describe('assignParallelGaps', () => {
  it('assigns the same gap to opposite-direction pair (bidirectional)', () => {
    const a = arrow('fwd', 'c', 'a');
    const b = arrow('rev', 'a', 'c');
    assignParallelGaps([a, b]);
    expect((a as any).gap).toBe(10);
    expect((b as any).gap).toBe(10);
  });

  it('staggers gaps for same-direction parallels', () => {
    const a = arrow('a1', 's', 'e');
    const b = arrow('a2', 's', 'e');
    assignParallelGaps([a, b]);
    expect((a as any).gap).toBe(-5);
    expect((b as any).gap).toBe(5);
  });

  it('respects explicit gap', () => {
    const a = arrow('a1', 's', 'e', 20);
    const b = arrow('a2', 's', 'e');
    assignParallelGaps([a, b]);
    expect((a as any).gap).toBe(20);
    expect((b as any).gap).toBe(5);
  });

  it('leaves singleton pairs untouched', () => {
    const a = arrow('only', 's', 'e');
    assignParallelGaps([a]);
    expect((a as any).gap).toBeUndefined();
  });

  it('staggers three same-direction arrows on one pair (-10, 0, +10) and disables snap', () => {
    const a = arrow('a1', 's', 'e');
    const b = arrow('a2', 's', 'e');
    const c = arrow('a3', 's', 'e');
    assignParallelGaps([a, b, c]);
    expect([(a as any).gap, (b as any).gap, (c as any).gap].sort((x, y) => x - y)).toEqual([-10, 0, 10]);
    expect((a as any).snap).toBe(false);
    expect((b as any).snap).toBe(false);
    expect((c as any).snap).toBe(false);
  });

  it('handles 2 forward + 1 reverse on the same pair', () => {
    const f1 = arrow('f1', 's', 'e');
    const f2 = arrow('f2', 's', 'e');
    const rev = arrow('r1', 'e', 's');
    assignParallelGaps([f1, f2, rev]);
    // reverse: single dir → base STAGGER
    expect((rev as any).gap).toBe(10);
    // two forward: STAGGER ± half → 5 and 15
    expect([(f1 as any).gap, (f2 as any).gap].sort((x, y) => x - y)).toEqual([5, 15]);
    expect((f1 as any).snap).toBe(false);
  });
});

describe('resolveArrowBindings — parallel separation', () => {
  beforeEach(() => {
    elements.clear();
  });

  it('separates bidirectional sequence arrows vertically', () => {
    const client = shape('c', 60, 20);
    const api = shape('a', 260, 20);
    elements.set('c', client);
    elements.set('a', api);

    const fwd = arrow('req', 'c', 'a');
    const rev = arrow('res', 'a', 'c');
    resolveArrowBindings([fwd, rev]);

    // Same unordered pair with auto gap=14 each → opposite parallel offsets
    expect(Math.abs(fwd.y - rev.y)).toBeGreaterThanOrEqual(16);
    expect(fwd.startBinding?.elementId).toBe('c');
    expect(rev.startBinding?.elementId).toBe('a');
  });

  it('separates same-direction parallel arrows', () => {
    const left = shape('s', 0, 0);
    const right = shape('e', 200, 0);
    elements.set('s', left);
    elements.set('e', right);

    const a1 = arrow('p1', 's', 'e');
    const a2 = arrow('p2', 's', 'e');
    resolveArrowBindings([a1, a2]);

    expect(Math.abs(a1.y - a2.y)).toBeGreaterThanOrEqual(10);
  });

  it('separates three same-direction arrows on one pair', () => {
    const left = shape('s', 0, 0);
    left.height = 80;
    const right = shape('e', 200, 0);
    right.height = 80;
    elements.set('s', left);
    elements.set('e', right);

    const a1 = arrow('p1', 's', 'e');
    const a2 = arrow('p2', 's', 'e');
    const a3 = arrow('p3', 's', 'e');
    resolveArrowBindings([a1, a2, a3]);

    const ys = [a1.y, a2.y, a3.y].sort((x, y) => x - y);
    expect(ys[1]! - ys[0]!).toBeGreaterThanOrEqual(8);
    expect(ys[2]! - ys[1]!).toBeGreaterThanOrEqual(8);
    expect((a1 as any).snap).toBe(false);
  });
});

describe('computeEdgePoint gap', () => {
  it('slides along vertical edges for horizontal connections', () => {
    const el = shape('box', 0, 0);
    el.width = 100;
    el.height = 80;
    const mid = computeEdgePoint(el, 200, 40, 0, true);
    const up = computeEdgePoint(el, 200, 40, -10, true);
    const down = computeEdgePoint(el, 200, 40, 10, true);
    expect(mid.x).toBe(100); // right edge
    expect(down.y - up.y).toBeGreaterThanOrEqual(16);
  });
});
