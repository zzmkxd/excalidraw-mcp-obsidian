import { describe, it, expect } from 'vitest';
import { getTemplate, listTemplates, getTemplateNames, getFullGuide } from '../templates/index.js';
import type { ITemplate } from '../templates/index.js';

describe('TemplateRegistry', () => {
  it('should return at least the General Design Guide template', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThan(0);

    const guide = getTemplate('General Design Guide');
    expect(guide).toBeDefined();
    expect(guide!.content.length).toBeGreaterThan(100);
  });

  it('should return all template names as strings', () => {
    const names = getTemplateNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names).toContain('General Design Guide');
  });

  it('should return undefined for non-existent template', () => {
    expect(getTemplate('nonexistent-template')).toBeUndefined();
  });

  it('should return base guide when getFullGuide called without name', () => {
    const guide = getFullGuide();
    expect(guide.length).toBeGreaterThan(100);
  });

  it('should append specific template content when getFullGuide called with name', () => {
    const flowchart = getTemplate('Flowchart');
    if (flowchart) {
      const combined = getFullGuide('Flowchart');
      expect(combined.length).toBeGreaterThan(guideLength());
      expect(combined).toContain(flowchart.content);
    }
  });

  it('should include available template names when requesting unknown template', () => {
    const result = getFullGuide('DefinitelyNonexistentTemplate123');
    expect(result).toContain('No specific template found');
    expect(result).toContain('Available:');
  });

  it('every template should have required ITemplate fields', () => {
    const templates = listTemplates();
    for (const t of templates) {
      expect(t.name).toBeTruthy();
      expect(typeof t.description).toBe('string');
      expect(typeof t.category).toBe('string');
      expect(t.content.length).toBeGreaterThan(0);
    }
  });
});

function guideLength(): number {
  const guide = getTemplate('General Design Guide');
  return guide?.content?.length || 0;
}
