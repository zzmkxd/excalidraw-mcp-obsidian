import type { WebSocketMessage, SimpleExcalidrawElement } from '../types.js';

// WebSocket connections — no-op in MCP-only mode
export const clients = new Set<any>();

// Selection cache: hydrated by get_selection from Obsidian .ai-selection.json
// (EA FloatingModal file bridge). Not populated by browser WS in MCP-only mode.
export const selectionState: {
  elements: SimpleExcalidrawElement[] | null;
  timestamp: string | null;
  filePath: string | null;
} = {
  elements: null,
  timestamp: null,
  filePath: null,
};

// No-op in MCP-only mode — no frontend to sync from
export function requestSync(): void {}

// No-op in MCP-only mode — no connected WebSocket clients
export function broadcast(_message: WebSocketMessage): void {}
