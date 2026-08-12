import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { ResourceSchema } from '../../schemas/mcp.schema.js';
import { elements } from '../../types.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const { resource } = ResourceSchema.parse(args);
  logger.info('Getting resource', { resource });

  let result: any;
  switch (resource) {
    case 'scene':
      result = {
        theme: ctx.sceneState.theme,
        viewport: ctx.sceneState.viewport,
        selectedElements: Array.from(ctx.sceneState.selectedElements)
      };
      break;
    case 'library':
    case 'elements':
      result = { elements: Array.from(elements.values()) };
      break;
    case 'theme':
      result = { theme: ctx.sceneState.theme };
      break;
    default:
      throw new Error(`Unknown resource: ${resource}`);
  }

  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

registerHandler('get_resource', handle);
