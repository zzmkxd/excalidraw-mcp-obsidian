import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support both dist/ and src/ paths (development vs production)
const PRESET_DIRS = [
  __dirname,
  path.resolve(__dirname, '../../../src/templates/presets'),
];

export interface StylePreset {
  name: string;
  label: string;
  description: string;
  defaults: Record<string, any>;
  surfaces?: Record<string, { fill: string; stroke: string }>;
  nodes?: Record<string, { fill: string; stroke: string }>;
  arrows?: Record<string, { strokeStyle: string; strokeColor: string }>;
  type?: Record<string, Record<string, any>>;
  // Deprecated — kept for backward compatibility with old preset files
  palette?: Record<string, { fill: string; stroke: string }>;
  layout: Record<string, any>;
}

const cache = new Map<string, StylePreset>();

function findPresetDir(): string | null {
  for (const dir of PRESET_DIRS) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function scanPresets(): string[] {
  const dir = findPresetDir();
  if (!dir) return [];
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'));
  } catch {
    return [];
  }
}

export function listPresets(): Pick<StylePreset, 'name' | 'label' | 'description'>[] {
  return scanPresets().map(name => {
    const p = getPreset(name);
    return { name: p.name, label: p.label, description: p.description };
  });
}

export function getPreset(name: string): StylePreset {
  if (cache.has(name)) return cache.get(name)!;

  for (const dir of PRESET_DIRS) {
    const filePath = path.resolve(dir, `${name}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const preset = JSON.parse(raw) as StylePreset;
      cache.set(name, preset);
      return preset;
    }
  }

  throw new Error(`Style preset "${name}" not found. Available: ${scanPresets().join(', ')}`);
}
