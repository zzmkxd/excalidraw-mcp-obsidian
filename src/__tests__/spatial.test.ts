import { describe, it, expect } from 'vitest';
import { findNearby, NearbyElement } from '../utils/spatial.js';
import { ServerElement } from '../types.js';

function makeEl(id: string, x: number, y: number, w = 100, h = 80, type = 'rectangle'): ServerElement {
  return { id, type, x, y, width: w, height: h };
}

describe('findNearby', () => {
  const target = makeEl('target', 100, 100, 100, 80);
  const allElements: ServerElement[] = [
    target,
    makeEl('right-close', 220, 100, 100, 80),
    makeEl('bottom-close', 100, 200, 100, 80),
    makeEl('left-close', 0, 100, 80, 80),
    makeEl('top-close', 100, 20, 100, 60),
    makeEl('far-away', 500, 500, 100, 80),
  ];

  it('should find elements within default radius (200)', () => {
    const results = findNearby(target, allElements);
    const ids = results.map(r => r.elementId);
    expect(ids).toContain('right-close');
    expect(ids).toContain('bottom-close');
    expect(ids).toContain('left-close');
    expect(ids).toContain('top-close');
    expect(ids).not.toContain('far-away');
    expect(ids).not.toContain('target');
  });

  it('should sort results by distance (closest first)', () => {
    const results = findNearby(target, allElements);
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.distance).toBeGreaterThanOrEqual(results[i - 1]!.distance);
    }
  });

  it('should assign correct direction labels', () => {
    const results = findNearby(target, allElements);
    const rightEl = results.find(r => r.elementId === 'right-close');
    const bottomEl = results.find(r => r.elementId === 'bottom-close');
    const leftEl = results.find(r => r.elementId === 'left-close');
    const topEl = results.find(r => r.elementId === 'top-close');

    expect(rightEl!.direction).toBe('right');
    expect(bottomEl!.direction).toBe('bottom');
    expect(leftEl!.direction).toBe('left');
    expect(topEl!.direction).toBe('top');
  });

  it('should respect custom radius', () => {
    const results = findNearby(target, allElements, 50);
    expect(results).toHaveLength(0);
  });

  it('should return empty array when no other elements exist', () => {
    const results = findNearby(target, [target]);
    expect(results).toHaveLength(0);
  });

  it('should return empty array for empty element list', () => {
    const results = findNearby(target, []);
    expect(results).toHaveLength(0);
  });
});
