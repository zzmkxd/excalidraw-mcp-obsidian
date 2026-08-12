// Re-export all types from sub-modules
export * from './types/elements.js';
export * from './types/server-element.js';
export * from './types/websocket.js';
export * from './types/selection.js';

import type { ServerElement } from './types/server-element.js';
import type { ExcalidrawElementType } from './types/elements.js';
import { EXCALIDRAW_ELEMENT_TYPES } from './types/elements.js';
export { EXCALIDRAW_ELEMENT_TYPES };

// ── In-memory storage ──
import type { Snapshot, ExcalidrawFile } from './types/server-element.js';

export const elements = new Map<string, ServerElement>();
export const snapshots = new Map<string, Snapshot>();
export const files = new Map<string, ExcalidrawFile>();

// ── Utility functions ──

export function validateElement(element: Partial<ServerElement>): element is ServerElement {
  const requiredFields: (keyof ServerElement)[] = ['type', 'x', 'y'];
  if (!requiredFields.every(field => field in element)) {
    throw new Error(`Missing required fields: ${requiredFields.join(', ')}`);
  }
  if (!Object.values(EXCALIDRAW_ELEMENT_TYPES).includes(element.type as ExcalidrawElementType)) {
    throw new Error(`Invalid element type: ${element.type}`);
  }
  return true;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function normalizeFontFamily(fontFamily: string | number | undefined): number | undefined {
  if (fontFamily === undefined) return undefined;
  if (typeof fontFamily === 'number') return fontFamily;
  const map: Record<string, number> = {
    'virgil': 1, 'hand': 1, 'handwritten': 1,
    'helvetica': 2, 'sans': 2, 'sans-serif': 2,
    'cascadia': 3, 'mono': 3, 'monospace': 3,
    'excalifont': 5,
    'nunito': 6,
    'lilita': 7, 'lilita one': 7,
    'comic shanns': 8, 'comic': 8,
    '1': 1, '2': 2, '3': 3, '5': 5, '6': 6, '7': 7, '8': 8,
  };
  return map[fontFamily.toLowerCase()];
}
