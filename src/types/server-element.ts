import type { ExcalidrawElementBase, ExcalidrawElementType } from './elements.js';

/** Server-side element with metadata — extends the Excalidraw base */
export interface ServerElement extends Omit<ExcalidrawElementBase, 'id'> {
  id: string;
  type: ExcalidrawElementType;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  syncedAt?: string;
  source?: string;
  syncTimestamp?: string;
  text?: string;
  originalText?: string;
  fontSize?: number;
  fontFamily?: string | number;
  label?: { text: string };
  points?: any;
  /** Arrow element binding: connect arrows to shapes by element ID */
  start?: { id: string };
  end?: { id: string };
  /** Offset along the source/destination shape edge for spreading parallel arrows */
  gap?: number;
  /** Offset label position along the arrow path: 0.0 = start, 0.5 = midpoint (default), 1.0 = end */
  labelOffset?: number;
  /** Snap arrow endpoints to nearest cardinal edge midpoint (default: true). Set false for 3+ arrows between same pair. */
  snap?: boolean;
}

export interface Snapshot {
  name: string;
  elements: ServerElement[];
  createdAt: string;
}

export interface ExcalidrawFile {
  id: string;
  dataURL: string;
  mimeType: string;
  created: number;
}
