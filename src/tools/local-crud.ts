import { elements, generateId, ServerElement } from '../types.js';
import { broadcast, requestSync } from '../server/store.js';
import { resolveArrowBindings } from '../arrow-utils.js';
import { createLabelBoundElements, bindTextToShapes } from '../utils/element-conversion.js';

export function createElementLocal(elementData: ServerElement): ServerElement {
  const id = elementData.id || generateId();
  const element: ServerElement = { ...elementData, id };
  elements.set(id, element);
  const labelTexts = createLabelBoundElements([element]);
  for (const textEl of labelTexts) {
    elements.set(textEl.id, textEl);
    broadcast({ type: 'element_created', element: textEl });
  }
  bindTextToShapes([element, ...labelTexts]);
  broadcast({ type: 'element_created', element });
  return element;
}

export function updateElementLocal(elementData: Partial<ServerElement> & { id: string }): ServerElement | null {
  const { id, ...updates } = elementData;
  const existing = elements.get(id);
  if (!existing) return null;
  const updated: ServerElement = { ...existing, ...updates, id };
  elements.set(id, updated);
  broadcast({ type: 'element_updated', element: updated });
  return updated;
}

export function deleteElementLocal(id: string): boolean {
  const existed = elements.delete(id);
  if (existed) broadcast({ type: 'element_deleted', elementId: id });
  return existed;
}

export function batchCreateElementsLocal(elementsData: ServerElement[]): ServerElement[] {
  const created: ServerElement[] = [];
  for (const data of elementsData) {
    const id = data.id || generateId();
    const element: ServerElement = { ...data, id };
    elements.set(id, element);
    created.push(element);
  }
  resolveArrowBindings(created);
  const labelTexts = createLabelBoundElements(created);
  for (const textEl of labelTexts) {
    elements.set(textEl.id, textEl);
    created.push(textEl);
  }
  bindTextToShapes(created);
  broadcast({ type: 'elements_batch_created', elements: created });
  requestSync();
  return created;
}

export function getElementLocal(id: string): ServerElement | null {
  return elements.get(id) || null;
}

export function clearAllLocal(): number {
  const count = elements.size;
  elements.clear();
  broadcast({ type: 'canvas_cleared', timestamp: new Date().toISOString() });
  return count;
}
