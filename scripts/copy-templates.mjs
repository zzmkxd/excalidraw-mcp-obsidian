import { cpSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = join(__dirname, '..', 'src');

const srcDir = join(srcRoot, 'templates');
const distDir = join(__dirname, '..', 'dist', 'templates');
mkdirSync(distDir, { recursive: true });
readdirSync(srcDir)
  .filter(f => f.endsWith('.md'))
  .forEach(f => cpSync(join(srcDir, f), join(distDir, f)));

const srcPresets = join(srcDir, 'presets');
const distPresets = join(distDir, 'presets');
if (existsSync(srcPresets)) {
  mkdirSync(distPresets, { recursive: true });
  readdirSync(srcPresets)
    .filter(f => f.endsWith('.json'))
    .forEach(f => cpSync(join(srcPresets, f), join(distPresets, f)));
}
