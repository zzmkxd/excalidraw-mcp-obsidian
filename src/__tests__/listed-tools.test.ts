import { describe, it, expect } from 'vitest';
import { tools, getListedTools, HIDDEN_MCP_TOOLS } from '../tools/definitions.js';

describe('getListedTools', () => {
  it('hides MCP-only unavailable tools from the listed set', () => {
    const listed = getListedTools().map(t => t.name);
    for (const name of HIDDEN_MCP_TOOLS) {
      expect(listed).not.toContain(name);
      expect(tools.some(t => t.name === name)).toBe(true);
    }
  });

  it('still lists core create/export tools', () => {
    const listed = new Set(getListedTools().map(t => t.name));
    expect(listed.has('batch_create_elements')).toBe(true);
    expect(listed.has('bind_arrows')).toBe(true);
    expect(listed.has('export_to_obsidian')).toBe(true);
    expect(listed.has('lookup_style_tokens')).toBe(true);
    expect(listed.has('describe_scene')).toBe(true);
    expect(listed.has('get_selection')).toBe(true);
  });

  it('does not hide get_selection (Obsidian file bridge)', () => {
    expect(HIDDEN_MCP_TOOLS.has('get_selection')).toBe(false);
  });
});
