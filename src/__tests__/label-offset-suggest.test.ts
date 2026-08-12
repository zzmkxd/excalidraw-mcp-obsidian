import { describe, it, expect } from 'vitest';
import { suggestLabelOffsets } from '../utils/label-offset-suggest.js';
import type { ServerElement } from '../types.js';

function arrow(partial: Partial<ServerElement> & { id: string }): ServerElement {
  return {
    type: 'arrow',
    x: 0,
    y: 0,
    points: [[0, 0], [100, 0]],
    createdAt: '',
    updatedAt: '',
    version: 1,
    ...partial,
  } as ServerElement;
}

describe('suggestLabelOffsets', () => {
  it('returns empty when fewer than 2 labeled arrows', () => {
    expect(suggestLabelOffsets([
      arrow({ id: 'a1', label: { text: 'x' }, start: { id: 's' }, end: { id: 'e' } }),
    ])).toEqual([]);
  });

  it('suggests offsets for parallel arrows from same start', () => {
    const arrows = [
      arrow({
        id: 'a1', label: { text: 'req' }, start: { id: 's' }, end: { id: 'e1' },
        points: [[0, 0], [100, 0]],
      }),
      arrow({
        id: 'a2', label: { text: 'res' }, start: { id: 's' }, end: { id: 'e2' },
        points: [[0, 0], [100, 10]],
      }),
    ];
    const suggestions = suggestLabelOffsets(arrows);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions.every(s => s.suggestedLabelOffset >= 0 && s.suggestedLabelOffset <= 1)).toBe(true);
    expect(suggestions.some(s => s.reason.includes('parallel_same_source'))).toBe(true);
  });

  it('suggests for shared endpoint pairs', () => {
    const arrows = [
      arrow({
        id: 'a1', label: { text: 'forward' }, start: { id: 'a' }, end: { id: 'b' },
        points: [[0, 0], [100, 0]],
      }),
      arrow({
        id: 'a2', label: { text: 'back' }, start: { id: 'b' }, end: { id: 'a' },
        points: [[100, 20], [-100, 0]],
      }),
    ];
    const suggestions = suggestLabelOffsets(arrows);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
  });
});
