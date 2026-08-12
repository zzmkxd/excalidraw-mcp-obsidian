import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import fs from 'fs';
import { elements, InitialElementsMessage } from '../../types.js';
import { broadcast } from '../../server/store.js';
import { sanitizeFilePath } from '../../utils/file-path.js';
import { extractAndDecompress } from '../../utils/lzstring-bridge.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({
    filePath: z.string(),
    mode: z.enum(['replace', 'merge'])
  }).parse(args);

  const safePath = sanitizeFilePath(params.filePath);
  const mdContent = fs.readFileSync(safePath, 'utf-8');
  const sceneJson = extractAndDecompress(mdContent);
  const scene = JSON.parse(sceneJson);
  const importElements = scene.elements || [];

  if (scene.appState) {
    ctx.importedAppState.current = scene.appState;
  }

  if (params.mode === 'replace') elements.clear();

  let imported = 0;
  for (const el of importElements) {
    elements.set(el.id, el);
    imported++;
  }

  broadcast({ type: 'initial_elements', elements: Array.from(elements.values()) } as InitialElementsMessage);

  logger.info(`Imported ${imported} elements from ${safePath} (mode: ${params.mode})`);

  return { content: [{ type: 'text', text: `Imported ${imported} element(s) from "${safePath}" (mode: ${params.mode}). Canvas now has ${elements.size} element(s).` }] };
}

registerHandler('import_from_obsidian', handle);
