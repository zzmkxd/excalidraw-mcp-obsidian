import { getPreset, type StylePreset } from '../templates/presets/index.js';

export interface ResolvedStyleToken {
  role: string;
  path: string;
  fill?: string;
  stroke?: string;
  strokeStyle?: string;
}

/** Map template shorthand (node:accent) to JSON path (nodes.accent). */
export function normalizeTokenRole(role: string): string {
  const raw = role.trim();
  const colon = raw.match(/^(node|surface|arrow):(.+)$/i);
  if (colon) {
    const kind = colon[1]!.toLowerCase();
    const key = colon[2]!;
    if (kind === 'node') return `nodes.${key}`;
    if (kind === 'surface') return `surfaces.${key}`;
    return `arrows.${key}`;
  }
  return raw;
}

function sectionKeys(preset: StylePreset, section: string): string[] {
  const bag = (preset as any)[section];
  if (!bag || typeof bag !== 'object') return [];
  return Object.keys(bag);
}

export function resolveStyleTokens(
  roles: string[],
  presetName: string,
): { preset: string; tokens: ResolvedStyleToken[] } {
  const preset = getPreset(presetName);
  const tokens: ResolvedStyleToken[] = [];

  for (const role of roles) {
    const path = normalizeTokenRole(role);
    const [section, key, ...rest] = path.split('.');
    if (!section || !key || rest.length > 0) {
      throw new Error(
        `Invalid role "${role}" (normalized: "${path}"). Use "nodes.accent" or "node:accent".`
      );
    }
    if (section !== 'nodes' && section !== 'surfaces' && section !== 'arrows') {
      throw new Error(
        `Unknown section "${section}" in "${path}". Valid sections: nodes, surfaces, arrows.`
      );
    }
    const bag = (preset as any)[section] as Record<string, any> | undefined;
    if (!bag || !(key in bag)) {
      const available = sectionKeys(preset, section);
      throw new Error(
        `Role "${role}" → "${path}" not found in preset "${preset.name}". ` +
        `Available ${section}: ${available.length ? available.join(', ') : '(none)'}`
      );
    }
    const entry = bag[key]!;
    const resolved: ResolvedStyleToken = { role, path };
    if (typeof entry.fill === 'string') resolved.fill = entry.fill;
    if (typeof entry.stroke === 'string') resolved.stroke = entry.stroke;
    if (typeof entry.strokeColor === 'string') resolved.stroke = entry.strokeColor;
    if (typeof entry.strokeStyle === 'string') resolved.strokeStyle = entry.strokeStyle;
    tokens.push(resolved);
  }

  return { preset: preset.name, tokens };
}
