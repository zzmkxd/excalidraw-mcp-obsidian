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
});
