import { describe, it, expect } from 'vitest';
import {
  normalizePoints,
  convertTextToLabel,
  createLabelBoundElements,
} from '../utils/element-conversion.js';
import type { ServerElement } from '../types.js';

describe('normalizePoints', () => {
  it('should pass through [x, y] tuples unchanged', () => {
    const input: [number, number][] = [[0, 0], [100, 50]];
    expect(normalizePoints(input)).toEqual([[0, 0], [100, 50]]);
  });

  it('should convert {x, y} objects to [x, y] tuples', () => {
    const input = [{ x: 10, y: 20 }, { x: 30, y: 40 }];
    expect(normalizePoints(input)).toEqual([[10, 20], [30, 40]]);
  });

  it('should handle mixed array and object points', () => {
    const input: Array<{ x: number; y: number } | [number, number]> = [
      [0, 0],
      { x: 50, y: 100 },
      [200, 300],
    ];
    expect(normalizePoints(input)).toEqual([[0, 0], [50, 100], [200, 300]]);
  });

  it('should return empty array for empty input', () => {
    expect(normalizePoints([])).toEqual([]);
  });
});

describe('convertTextToLabel', () => {
  it('should keep text property on type=text elements', () => {
    const el = { type: 'text', text: 'Hello', id: '1', x: 0, y: 0 };
    const result = convertTextToLabel(el);
    expect(result.text).toBe('Hello');
    expect(result.label).toBeUndefined();
  });

  it('should move text to label for rectangle elements', () => {
    const el = { type: 'rectangle', text: 'Box Label', id: '2', x: 10, y: 20 };
    const result = convertTextToLabel(el);
    expect(result.text).toBeUndefined();
    expect(result.label).toEqual({ text: 'Box Label' });
  });

  it('should move text to label for arrow elements', () => {
    const el = { type: 'arrow', text: 'Arrow Label', id: '3', x: 0, y: 0 };
    const result = convertTextToLabel(el);
    expect(result.text).toBeUndefined();
    expect(result.label).toEqual({ text: 'Arrow Label' });
  });

  it('should not add label if there is no text', () => {
    const el = { type: 'rectangle', id: '4', x: 0, y: 0 };
    const result = convertTextToLabel(el);
    expect(result.label).toBeUndefined();
    expect(result.text).toBeUndefined();
  });

  it('should preserve other properties when moving text to label', () => {
    const el = { type: 'ellipse', text: 'Ellipse', id: '5', x: 100, y: 200, strokeColor: '#ff0000' };
    const result = convertTextToLabel(el);
    expect(result.id).toBe('5');
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
    expect(result.strokeColor).toBe('#ff0000');
    expect(result.label).toEqual({ text: 'Ellipse' });
  });
});

describe('createLabelBoundElements — shape labels', () => {
  it('creates bound text for rectangle with label', () => {
    const rect = {
      id: 'rect-1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      label: { text: '节点A' },
      fontSize: 16,
      fontFamily: 2,
      strokeColor: '#495057',
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z',
      version: 1,
    } as ServerElement;

    const texts = createLabelBoundElements([rect]);
    expect(texts).toHaveLength(1);
    expect(texts[0]!.type).toBe('text');
    expect(texts[0]!.text).toBe('节点A');
    expect(texts[0]!.containerId).toBe('rect-1');
    expect(texts[0]!.textAlign).toBe('center');
    expect(texts[0]!.verticalAlign).toBe('middle');
    expect(rect.boundElements?.some(b => b.type === 'text' && b.id === texts[0]!.id)).toBe(true);
  });

  it('creates bound text for diamond and ellipse', () => {
    const diamond = {
      id: 'd1', type: 'diamond', x: 10, y: 10, width: 100, height: 100,
      label: { text: '判断' }, createdAt: '', updatedAt: '', version: 1,
    } as ServerElement;
    const ellipse = {
      id: 'e1', type: 'ellipse', x: 200, y: 10, width: 120, height: 60,
      label: { text: '起止' }, createdAt: '', updatedAt: '', version: 1,
    } as ServerElement;

    const texts = createLabelBoundElements([diamond, ellipse]);
    expect(texts).toHaveLength(2);
    expect(texts.map(t => t.text).sort()).toEqual(['判断', '起止']);
  });

  it('still creates shape text when shape already has arrow boundElements', () => {
    const rect = {
      id: 'rect-2',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      label: { text: '服务' },
      boundElements: [{ type: 'arrow' as const, id: 'arr-1' }],
      createdAt: '',
      updatedAt: '',
      version: 1,
    } as ServerElement;

    const texts = createLabelBoundElements([rect]);
    expect(texts).toHaveLength(1);
    expect(rect.boundElements).toHaveLength(2);
    expect(rect.boundElements!.some(b => b.type === 'text')).toBe(true);
    expect(rect.boundElements!.some(b => b.type === 'arrow')).toBe(true);
  });

  it('skips shape when text binding already exists', () => {
    const rect = {
      id: 'rect-3',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      label: { text: '已有' },
      boundElements: [{ type: 'text' as const, id: 'existing-text' }],
      createdAt: '',
      updatedAt: '',
      version: 1,
    } as ServerElement;

    expect(createLabelBoundElements([rect])).toHaveLength(0);
  });

  it('still creates arrow label bound text', () => {
    const arrow = {
      id: 'a1',
      type: 'arrow',
      x: 0,
      y: 0,
      points: [[0, 0], [100, 0]],
      label: { text: '调用' },
      createdAt: '',
      updatedAt: '',
      version: 1,
    } as ServerElement;

    const texts = createLabelBoundElements([arrow]);
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toBe('调用');
    expect(texts[0]!.containerId).toBe('a1');
  });
});
