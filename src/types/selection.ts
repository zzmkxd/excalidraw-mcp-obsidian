import type { WebSocketMessage } from './websocket.js';

export interface SelectionRenderedInfo {
  textOverflow: boolean;
  textRenderedWidth: number;
  containerWidth: number;
}

export interface SelectionOverlap {
  elementId: string;
  area: number;
  severity: 'minor' | 'moderate' | 'severe';
}

export interface SelectionNearby {
  elementId: string;
  type: string;
  distance: number;
  direction: string;
}

export interface SimpleExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fontFamily?: number | string;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  strokeStyle: string;
  fillStyle: string;
  roughness: number;
  opacity: number;
  groupIds: string[];
  boundElementIds: string[];
  locked: boolean;
  /** Browser-computed rendered info */
  renderedOverflow?: SelectionRenderedInfo;
  overlaps?: SelectionOverlap[];
  nearbyElements?: SelectionNearby[];
}

export interface ElementSelectedMessage extends WebSocketMessage {
  type: 'element_selected';
  elements: SimpleExcalidrawElement[];
  timestamp: string;
}
