import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import fs from 'fs';
import { elements, files } from '../../types.js';
import { sanitizeFilePath } from '../../utils/file-path.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({ filePath: z.string().optional() }).parse(args || {});
  logger.info('Exporting scene via MCP');

  const sceneElements = Array.from(elements.values());

  const sceneFiles: Record<string, any> = {};
  files.forEach((f, id) => { sceneFiles[id] = f; });

  const excalidrawScene: any = {
    type: 'excalidraw', version: 2, source: 'mcp-excalidraw-server',
    elements: sceneElements,
    appState: { viewBackgroundColor: '#ffffff', gridSize: null },
    ...(Object.keys(sceneFiles).length > 0 ? { files: sceneFiles } : {})
  };

  const jsonString = JSON.stringify(excalidrawScene, null, 2);

  if (params.filePath) {
    const safePath = sanitizeFilePath(params.filePath);
    fs.writeFileSync(safePath, jsonString, 'utf-8');
    return { content: [{ type: 'text', text: `Scene exported to ${safePath} (${sceneElements.length} elements)` }] };
  }

  return { content: [{ type: 'text', text: jsonString }] };
}

registerHandler('export_scene', handle);
