import { ServerElement } from '../types.js';

export interface NearbyElement {
  elementId: string;
  type: string;
  text?: string;
  distance: number;
  direction: string;
}

/**
 * Find elements within a radius of a center point.
 * Returns sorted by distance (closest first).
 */
export function findNearby(
  target: ServerElement,
  allElements: ServerElement[],
  radius: number = 200
): NearbyElement[] {
  const cx = target.x + (target.width || 0) / 2;
  const cy = target.y + (target.height || 0) / 2;
  return allElements
    .filter(e => e.id !== target.id)
    .map(e => {
      const ecx = e.x + (e.width || 0) / 2;
      const ecy = e.y + (e.height || 0) / 2;
      const dist = Math.sqrt((cx - ecx) ** 2 + (cy - ecy) ** 2);
      if (dist > radius) return null;
      const angle = Math.atan2(ecy - cy, ecx - cx) * 180 / Math.PI;
      let direction: string;
      if (angle > -45 && angle <= 45) direction = 'right';
      else if (angle > 45 && angle <= 135) direction = 'bottom';
      else if (angle > -135 && angle <= -45) direction = 'top';
      else direction = 'left';
      return {
        elementId: e.id,
        type: e.type,
        text: (e as any).text,
        distance: Math.round(dist),
        direction
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.distance - b.distance) as NearbyElement[];
}
