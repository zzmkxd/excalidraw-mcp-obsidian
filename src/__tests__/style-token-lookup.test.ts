import { describe, it, expect } from 'vitest';
import { normalizeTokenRole, resolveStyleTokens } from '../utils/style-token-lookup.js';

describe('normalizeTokenRole', () => {
  it('maps template shorthand to JSON paths', () => {
    expect(normalizeTokenRole('node:accent')).toBe('nodes.accent');
    expect(normalizeTokenRole('surface:mid')).toBe('surfaces.mid');
    expect(normalizeTokenRole('arrow:return')).toBe('arrows.return');
    expect(normalizeTokenRole('nodes.accent')).toBe('nodes.accent');
  });
});

describe('resolveStyleTokens', () => {
  it('resolves clean-tech nodes.accent', () => {
    const { preset, tokens } = resolveStyleTokens(['nodes.accent'], 'clean-tech');
    expect(preset).toBe('clean-tech');
    expect(tokens[0]!.fill).toBe('#D6EAF8');
    expect(tokens[0]!.stroke).toBe('#1A5276');
  });

  it('resolves sequence node:activation and arrow:return', () => {
    const { tokens } = resolveStyleTokens(
      ['node:activation', 'arrow:return'],
      'sequence-diagram',
    );
    expect(tokens[0]!.fill).toBe('#E9ECEF');
    expect(tokens[0]!.stroke).toBe('#868E96');
    expect(tokens[1]!.stroke).toBe('#ADB5BD');
    expect(tokens[1]!.strokeStyle).toBe('dashed');
  });

  it('resolves flowchart decision and flat diamond layout', () => {
    const { preset, tokens } = resolveStyleTokens(
      ['node:decision', 'arrow:branch', 'layout.nodeW', 'layout.diamondW', 'layout.diamondH'],
      'flowchart',
    );
    expect(preset).toBe('flowchart');
    expect(tokens[0]!.fill).toBe('#FFF3CD');
    expect(tokens[0]!.stroke).toBe('#495057');
    expect(tokens[1]!.stroke).toBe('#495057');
    expect(tokens[1]!.strokeStyle).toBe('solid');
    expect(tokens[2]!.value).toBe(200);
    expect(tokens[3]!.value).toBe(240);
    expect(tokens[4]!.value).toBe(100);
  });

  it('throws with available keys on unknown role', () => {
    expect(() => resolveStyleTokens(['node:nope'], 'clean-tech')).toThrow(/Available nodes/);
  });
});
