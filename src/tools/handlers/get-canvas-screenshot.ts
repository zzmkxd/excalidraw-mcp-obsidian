import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import logger from '../../utils/logger.js';

async function handle(_ctx: HandlerContext, _args: any) {
  logger.info('Screenshot requested (not available in MCP-only mode)');
  return {
    content: [{ type: 'text', text: 'Canvas screenshot requires a browser frontend canvas. This feature is not available in MCP-only mode. Use describe_scene for a text description of the canvas, or export_scene to get the .excalidraw JSON data.' }],
    isError: true,
  };
}

registerHandler('get_canvas_screenshot', handle);
