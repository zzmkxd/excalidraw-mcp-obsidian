import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import fs from 'fs';
import { elements as elementsMap, files as filesMap, generateId, ServerElement } from '../../types.js';
import { sanitizeFilePath } from '../../utils/file-path.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({
    filePath: z.string().optional(),
    data: z.string().optional(),
    mode: z.enum(['replace', 'merge'])
  }).parse(args);

  logger.info('Importing scene via MCP', { mode: params.mode });

  let sceneData: any;
  if (params.filePath) {
    const safePath = sanitizeFilePath(params.filePath);
    sceneData = JSON.parse(fs.readFileSync(safePath, 'utf-8'));
  } else if (params.data) {
    sceneData = JSON.parse(params.data);
  } else {
    throw new Error('Either filePath or data must be provided');
  }

  const importElements: ServerElement[] = Array.isArray(sceneData) ? sceneData : (sceneData.elements || []);
  if (importElements.length === 0) throw new Error('No elements found in the import data');

  if (params.mode === 'replace') {
    elementsMap.clear();
  }

  const elementsToCreate = importElements.map(el => ({
    ...el, id: el.id || generateId(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1
  }));

  await ctx.batchCreateElementsLocal(elementsToCreate);

  let importedFileCount = 0;
  const importFiles = sceneData.files;
  if (importFiles && typeof importFiles === 'object') {
    const fileList = Object.values(importFiles) as any[];
    for (const f of fileList) {
      if (f.id && f.dataURL) {
        filesMap.set(f.id, { id: f.id, dataURL: f.dataURL, mimeType: f.mimeType || 'image/png', created: f.created || Date.now() });
        importedFileCount++;
      }
    }
  }

  return { content: [{ type: 'text', text: `Imported ${elementsToCreate.length} elements${importedFileCount > 0 ? ` and ${importedFileCount} files` : ''} (mode: ${params.mode})\n\n✅ Synced to canvas` }] };
}

registerHandler('import_scene', handle);
