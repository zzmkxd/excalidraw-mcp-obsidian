import fs from 'fs';
import type { SimpleExcalidrawElement } from '../types/selection.js';
import { sanitizeFilePath } from './file-path.js';

/** Vault-relative path under EXCALIDRAW_EXPORT_DIR (Obsidian vault root). */
export const AI_SELECTION_REL =
  'Ob_Responsity/Coding_Responsity/暂存/插件开发测试/.ai-selection.json';

/** Warn when selection JSON is older than this (do not auto-delete). */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export interface AiSelectionPayload {
  elements: SimpleExcalidrawElement[];
  timestamp?: string | null;
  source?: string;
  filePath?: string | null;
  instruction?: string;
}

export function loadAiSelectionFromDisk(): AiSelectionPayload | null {
  const safePath = sanitizeFilePath(AI_SELECTION_REL);
  if (!fs.existsSync(safePath)) {
    return null;
  }
  const raw = fs.readFileSync(safePath, 'utf-8');
  if (!raw.trim()) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${AI_SELECTION_REL}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const elements = Array.isArray(obj.elements) ? (obj.elements as SimpleExcalidrawElement[]) : [];
  if (elements.length === 0) {
    return null;
  }
  return {
    elements,
    timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : null,
    source: typeof obj.source === 'string' ? obj.source : undefined,
    filePath: typeof obj.filePath === 'string' ? obj.filePath : null,
    instruction: typeof obj.instruction === 'string' ? obj.instruction : undefined,
  };
}

function formatAge(ageMs: number): string {
  if (ageMs < 60_000) {
    return `Age: ${Math.max(0, Math.round(ageMs / 1000))}s`;
  }
  const minutes = Math.round(ageMs / 60_000);
  if (minutes < 60) {
    return `Age: ${minutes}m`;
  }
  return `Age: ${Math.round(minutes / 60)}h`;
}

export function formatSelectionSummary(
  payload: AiSelectionPayload,
  opts: { fullJson?: boolean; now?: number } = {}
): string {
  const lines: string[] = [];
  lines.push(
    `Selected ${payload.elements.length} element(s)` +
      (payload.timestamp ? ` at ${payload.timestamp}` : '') +
      (payload.filePath ? ` (file: ${payload.filePath})` : '') +
      '.'
  );
  if (payload.instruction && payload.instruction.trim()) {
    lines.push(`Instruction: ${payload.instruction.trim()}`);
  }

  if (payload.timestamp) {
    const ts = Date.parse(payload.timestamp);
    if (!Number.isNaN(ts)) {
      const now = opts.now ?? Date.now();
      const ageMs = Math.max(0, now - ts);
      lines.push(formatAge(ageMs));
      if (ageMs > STALE_AFTER_MS) {
        lines.push(
          'STALE: selection may be from a previous edit; re-run AI Edit Selected in Obsidian if unsure.'
        );
      }
    }
  }

  lines.push('');
  lines.push('Summary:');
  for (const el of payload.elements) {
    const text = (el.text || '').replace(/\s+/g, ' ').trim();
    const short = text.length > 40 ? text.slice(0, 40) + '…' : text;
    const w = Math.round(el.width || 0);
    const h = Math.round(el.height || 0);
    lines.push(
      `- ${el.type} id=${el.id}` +
        (short ? ` text="${short}"` : '') +
        ` @(${Math.round(el.x)},${Math.round(el.y)}) ${w}×${h}`
    );
  }

  lines.push('');
  if (payload.filePath) {
    lines.push(
      `Next: import_from_obsidian(${JSON.stringify(payload.filePath)}, mode="replace") unless those element IDs are already in the MCP scene, then update_element / describe_scene.`
    );
  } else {
    lines.push(
      'Next: ensure the diagram is loaded in the MCP scene (import_from_obsidian if needed), then update_element / describe_scene.'
    );
  }
  lines.push('Final look: open the file in Obsidian.');

  if (opts.fullJson) {
    lines.push('');
    lines.push('Full payload:');
    lines.push(JSON.stringify(payload, null, 2));
  }
  return lines.join('\n');
}
