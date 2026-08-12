import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { elements } from '../../types.js';
import { canvasConfig, saveConfig } from '../../config/canvas-config.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({ fontFamily: z.number().int().min(1).max(8) }).parse(args);
  logger.info('Setting canvas font', { fontFamily: params.fontFamily });

  canvasConfig.fontFamily = params.fontFamily;
  ctx.sceneState.fontFamily = params.fontFamily;

  let updated = 0;
  for (const [id, el] of elements) {
    if (el.fontFamily !== params.fontFamily) {
      ctx.updateElementLocal({ id, fontFamily: params.fontFamily });
      updated++;
    }
  }

  saveConfig();
  logger.info('Canvas font updated', { fontFamily: params.fontFamily, updatedElements: updated });

  return {
    content: [{
      type: 'text',
      text: `Font set to ${params.fontFamily}.\nUpdated ${updated} elements.\nConfig persisted to .excalidraw-config.json`,
    }],
  };
}

registerHandler('set_canvas_font', handle);
