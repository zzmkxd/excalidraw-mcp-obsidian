import { describe, it, expect } from 'vitest';
import { runSceneChecklist, isSurfaceZone, isActivationBar } from '../utils/scene-checklist.js';
import type { ServerElement } from '../types.js';

function el(partial: Partial<ServerElement> & { id: string; type: ServerElement['type'] }): ServerElement {
  return {
    x: 0,
    y: 0,
    createdAt: '',
    updatedAt: '',
    version: 1,
    ...partial,
  } as ServerElement;
}

describe('isSurfaceZone / isActivationBar', () => {
  it('detects large surface zones', () => {
    expect(isSurfaceZone(el({
      id: 'z', type: 'rectangle', width: 1000, height: 200,
      backgroundColor: '#F5F5F5',
    }))).toBe(true);
  });

  it('detects activation bars', () => {
    expect(isActivationBar(el({
      id: 'act', type: 'rectangle', width: 16, height: 200,
      backgroundColor: '#D6EAF8',
    }))).toBe(true);
  });
});

describe('runSceneChecklist', () => {
  it('warns when shape has label but no bound text', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'r1', type: 'rectangle', width: 100, height: 40,
        label: { text: '节点' },
      }),
    ]);
    expect(warnings.some(w => w.code === 'shape_label_missing_bound_text')).toBe(true);
  });

  it('warns on coincident parallel arrows', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'a1', type: 'arrow', x: 10, y: 40,
        startBinding: { elementId: 's', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 'e', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [100, 0]],
      }),
      el({
        id: 'a2', type: 'arrow', x: 110, y: 40,
        startBinding: { elementId: 'e', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 's', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [-100, 0]],
      }),
    ]);
    expect(warnings.some(w => w.code === 'parallel_arrows_coincident')).toBe(true);
  });

  it('passes a healthy labeled shape with bound text', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'r1', type: 'rectangle', width: 100, height: 40,
        label: { text: '节点' },
        boundElements: [{ type: 'text', id: 't1' }],
      }),
      el({
        id: 't1', type: 'text', text: '节点', containerId: 'r1', fontSize: 16,
      }),
    ]);
    expect(warnings.filter(w => w.code === 'shape_label_missing_bound_text')).toHaveLength(0);
    expect(warnings.filter(w => w.code === 'shape_without_text')).toHaveLength(0);
  });

  it('does not warn shape_without_text for surface zones', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'surf', type: 'rectangle', x: 0, y: 0, width: 1000, height: 220,
        backgroundColor: '#F5F5F5',
      }),
    ]);
    expect(warnings.filter(w => w.code === 'shape_without_text')).toHaveLength(0);
  });

  it('does not warn shape_without_text for activation bars', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'act', type: 'rectangle', x: 100, y: 80, width: 16, height: 240,
        backgroundColor: '#D6EAF8',
      }),
    ]);
    expect(warnings.filter(w => w.code === 'shape_without_text')).toHaveLength(0);
  });

  it('still warns plain node without text', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'n1', type: 'rectangle', width: 160, height: 70,
        backgroundColor: '#FFFFFF',
      }),
    ]);
    expect(warnings.some(w => w.code === 'shape_without_text')).toBe(true);
  });

  it('does not treat unbound lifeline lines as arrow_unbound', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'life', type: 'line', x: 100, y: 60,
        strokeStyle: 'dashed',
        points: [[0, 0], [0, 300]],
      }),
    ]);
    expect(warnings.filter(w => w.code === 'arrow_unbound')).toHaveLength(0);
  });

  it('skips overlap between surface and nested node', () => {
    const warnings = runSceneChecklist([
      el({
        id: 'surf', type: 'rectangle', x: 0, y: 0, width: 1000, height: 300,
        backgroundColor: '#F5F5F5',
      }),
      el({
        id: 'n1', type: 'rectangle', x: 40, y: 40, width: 160, height: 70,
        label: { text: '服务' },
        boundElements: [{ type: 'text', id: 't1' }],
        backgroundColor: '#FFFFFF',
      }),
      el({ id: 't1', type: 'text', text: '服务', containerId: 'n1', fontSize: 16 }),
    ]);
    expect(warnings.filter(w => w.code === 'shapes_overlap')).toHaveLength(0);
  });

  it('warns when downward cross-layer arrows form an X', () => {
    // Top: L(x=0) R(x=200); Bottom: L2(x=0) R2(x=200)
    // Arrow A: L → R2 (crosses right); Arrow B: R → L2 (crosses left)
    const nodes = [
      el({ id: 'L', type: 'rectangle', x: 0, y: 0, width: 80, height: 40, label: { text: 'L' }, boundElements: [{ type: 'text', id: 'tL' }] }),
      el({ id: 'R', type: 'rectangle', x: 200, y: 0, width: 80, height: 40, label: { text: 'R' }, boundElements: [{ type: 'text', id: 'tR' }] }),
      el({ id: 'L2', type: 'rectangle', x: 0, y: 200, width: 80, height: 40, label: { text: 'L2' }, boundElements: [{ type: 'text', id: 'tL2' }] }),
      el({ id: 'R2', type: 'rectangle', x: 200, y: 200, width: 80, height: 40, label: { text: 'R2' }, boundElements: [{ type: 'text', id: 'tR2' }] }),
      el({ id: 'tL', type: 'text', text: 'L', containerId: 'L', fontSize: 16 }),
      el({ id: 'tR', type: 'text', text: 'R', containerId: 'R', fontSize: 16 }),
      el({ id: 'tL2', type: 'text', text: 'L2', containerId: 'L2', fontSize: 16 }),
      el({ id: 'tR2', type: 'text', text: 'R2', containerId: 'R2', fontSize: 16 }),
    ];
    const warnings = runSceneChecklist([
      ...nodes,
      el({
        id: 'aCross', type: 'arrow', x: 40, y: 20,
        startBinding: { elementId: 'L', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 'R2', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [200, 200]],
      }),
      el({
        id: 'bCross', type: 'arrow', x: 240, y: 20,
        startBinding: { elementId: 'R', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 'L2', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [-200, 200]],
      }),
    ]);
    const w = warnings.find(x => x.code === 'arrows_cross_layer');
    expect(w).toBeDefined();
    expect(w!.elementIds).toEqual(expect.arrayContaining(['aCross', 'bCross']));
  });

  it('does not warn for same-column vertical downward arrows', () => {
    const nodes = [
      el({ id: 't1', type: 'rectangle', x: 100, y: 0, width: 80, height: 40, label: { text: 't1' }, boundElements: [{ type: 'text', id: 'tt1' }] }),
      el({ id: 't2', type: 'rectangle', x: 100, y: 200, width: 80, height: 40, label: { text: 't2' }, boundElements: [{ type: 'text', id: 'tt2' }] }),
      el({ id: 'u1', type: 'rectangle', x: 300, y: 0, width: 80, height: 40, label: { text: 'u1' }, boundElements: [{ type: 'text', id: 'tu1' }] }),
      el({ id: 'u2', type: 'rectangle', x: 300, y: 200, width: 80, height: 40, label: { text: 'u2' }, boundElements: [{ type: 'text', id: 'tu2' }] }),
      el({ id: 'tt1', type: 'text', text: 't1', containerId: 't1', fontSize: 16 }),
      el({ id: 'tt2', type: 'text', text: 't2', containerId: 't2', fontSize: 16 }),
      el({ id: 'tu1', type: 'text', text: 'u1', containerId: 'u1', fontSize: 16 }),
      el({ id: 'tu2', type: 'text', text: 'u2', containerId: 'u2', fontSize: 16 }),
    ];
    const warnings = runSceneChecklist([
      ...nodes,
      el({
        id: 'v1', type: 'arrow', x: 140, y: 20,
        startBinding: { elementId: 't1', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 't2', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [0, 200]],
      }),
      el({
        id: 'v2', type: 'arrow', x: 340, y: 20,
        startBinding: { elementId: 'u1', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 'u2', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [0, 200]],
      }),
    ]);
    expect(warnings.filter(w => w.code === 'arrows_cross_layer')).toHaveLength(0);
  });

  it('does not require warning for same-pair parallel arrows', () => {
    // Same unordered pair, staggered y — parallel gap case; cross-layer rule must not fire
    const nodes = [
      el({ id: 's', type: 'rectangle', x: 0, y: 0, width: 80, height: 40, label: { text: 's' }, boundElements: [{ type: 'text', id: 'ts' }] }),
      el({ id: 'e', type: 'rectangle', x: 200, y: 0, width: 80, height: 40, label: { text: 'e' }, boundElements: [{ type: 'text', id: 'te' }] }),
      el({ id: 'ts', type: 'text', text: 's', containerId: 's', fontSize: 16 }),
      el({ id: 'te', type: 'text', text: 'e', containerId: 'e', fontSize: 16 }),
    ];
    const warnings = runSceneChecklist([
      ...nodes,
      el({
        id: 'p1', type: 'arrow', x: 40, y: 10,
        startBinding: { elementId: 's', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 'e', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [200, 0]],
      }),
      el({
        id: 'p2', type: 'arrow', x: 40, y: 30,
        startBinding: { elementId: 'e', focus: 0.5, gap: 0 } as any,
        endBinding: { elementId: 's', focus: 0.5, gap: 0 } as any,
        points: [[0, 0], [-200, 0]],
      }),
    ]);
    expect(warnings.filter(w => w.code === 'arrows_cross_layer')).toHaveLength(0);
  });
});
