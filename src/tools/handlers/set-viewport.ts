import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({
    scrollToContent: z.boolean().optional(),
    scrollToElementId: z.string().optional(),
    zoom: z.number().min(0.1).max(10).optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional()
  }).parse(args || {});

  logger.info('Setting viewport via MCP', params);

  if (params.zoom !== undefined) ctx.sceneState.viewport.zoom = params.zoom;
  if (params.offsetX !== undefined) ctx.sceneState.viewport.x = params.offsetX;
  if (params.offsetY !== undefined) ctx.sceneState.viewport.y = params.offsetY;

  return { content: [{ type: 'text', text: `Viewport updated (stored locally). Note: no frontend canvas is connected, so visual viewport changes are not applied.\n\n${JSON.stringify(ctx.sceneState.viewport, null, 2)}` }] };
}

registerHandler('set_viewport', handle);
