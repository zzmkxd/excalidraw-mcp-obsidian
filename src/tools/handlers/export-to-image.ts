import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import logger from '../../utils/logger.js';

async function handle(_ctx: HandlerContext, _args: any) {
  logger.info('Image export requested (not available in MCP-only mode)');
  return {
    content: [{ type: 'text', text: 'Image export (PNG/SVG rendering) requires a browser frontend canvas with DOM access. This feature is not available in MCP-only mode. Use export_scene to export the diagram as .excalidraw JSON, or export_to_obsidian for .excalidraw.md format.' }],
    isError: true,
  };
}

registerHandler('export_to_image', handle);
