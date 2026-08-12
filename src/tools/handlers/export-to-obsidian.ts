import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import fs from 'fs';
import { elements, InitialElementsMessage } from '../../types.js';
import { broadcast } from '../../server/store.js';
import { sanitizeFilePath } from '../../utils/file-path.js';
import { buildExcalidrawMd } from '../../utils/lzstring-bridge.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({
    filePath: z.string(),
    tags: z.array(z.string()).optional().default(['excalidraw'])
  }).parse(args);

  const safePath = sanitizeFilePath(params.filePath);
  const allElements = Array.from(elements.values());

  // Strip orphaned boundElements whose IDs don't exist in the map.
  // Frontend sync creates bound text elements for arrow labels that only
  // live in the browser — not in our server-side Map. Exporting references
  // to nonexistent elements breaks Obsidian's label rendering.
  const elementIds = new Set(elements.keys());
  for (const el of allElements) {
    if (el.boundElements && el.boundElements.length > 0) {
      el.boundElements = el.boundElements.filter((b: any) => elementIds.has(b.id));
      if (el.boundElements.length === 0) delete (el as any).boundElements;
    }
  }

  let appState: Record<string, any>;
  if (ctx.importedAppState.current) {
    appState = { ...ctx.importedAppState.current };
  } else if (allElements.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of allElements) {
      minX = Math.min(minX, el.x); minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 0)); maxY = Math.max(maxY, el.y + (el.height || 0));
    }
    const padding = 80;
    appState = {
      theme: ctx.sceneState.theme, viewBackgroundColor: '#ffffff',
      scrollX: minX - padding, scrollY: minY - padding, zoom: 1,
    };
  } else {
    appState = { theme: ctx.sceneState.theme, viewBackgroundColor: '#ffffff' };
  }

  const scene = { type: 'excalidraw', version: 2, elements: allElements, appState };
  const mdContent = buildExcalidrawMd(JSON.stringify(scene, null, 2), params.tags);

  fs.writeFileSync(safePath, mdContent, 'utf-8');
  logger.info(`Exported ${allElements.length} elements to ${safePath}`);

  return { content: [{ type: 'text', text: `Exported ${allElements.length} element(s) to "${safePath}".\n\nOpen this file in Obsidian and switch to Excalidraw view to see the diagram.` }] };
}

registerHandler('export_to_obsidian', handle);
