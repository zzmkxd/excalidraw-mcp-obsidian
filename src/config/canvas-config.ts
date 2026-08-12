import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, '../../.excalidraw-config.json');

export const canvasConfig = {
  fontFamily: 2,
  fontSize: 16,
  strokeColor: '#495057',
  strokeWidth: 2,
  roughness: 0,
};

export function loadConfig(): void {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (typeof data.fontFamily === 'number' && data.fontFamily >= 1 && data.fontFamily <= 8) {
        canvasConfig.fontFamily = data.fontFamily;
      }
      if (typeof data.fontSize === 'number') canvasConfig.fontSize = data.fontSize;
      if (typeof data.strokeColor === 'string') canvasConfig.strokeColor = data.strokeColor;
      if (typeof data.strokeWidth === 'number') canvasConfig.strokeWidth = data.strokeWidth;
      if (typeof data.roughness === 'number') canvasConfig.roughness = data.roughness;
    }
  } catch { /* ignore — use defaults */ }
}

export function saveConfig(): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      fontFamily: canvasConfig.fontFamily,
      fontSize: canvasConfig.fontSize,
      strokeColor: canvasConfig.strokeColor,
      strokeWidth: canvasConfig.strokeWidth,
      roughness: canvasConfig.roughness,
    }, null, 2), 'utf-8');
  } catch { /* ignore — non-critical */ }
}
