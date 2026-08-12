import type { ServerElement } from '../types.js';

export interface SceneState {
  theme: string;
  viewport: { x: number; y: number; zoom: number };
  selectedElements: Set<string>;
  groups: Map<string, string[]>;
  fontFamily: number;
  /** Last apply_style_preset name; used by lookup_style_tokens default. */
  activePresetName: string | null;
}

export interface HandlerContext {
  sceneState: SceneState;
  importedAppState: { current: Record<string, any> | null };
  createElementLocal: (data: ServerElement) => ServerElement;
  updateElementLocal: (data: Partial<ServerElement> & { id: string }) => ServerElement | null;
  deleteElementLocal: (id: string) => boolean;
  batchCreateElementsLocal: (data: ServerElement[]) => ServerElement[];
  getElementLocal: (id: string) => ServerElement | null;
  clearAllLocal: () => number;
}

export interface ToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolHandler = (ctx: HandlerContext, args: any) => any;
