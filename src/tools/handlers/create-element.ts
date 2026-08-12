import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { ElementSchema } from '../../schemas/mcp.schema.js';
import { ServerElement } from '../../types.js';
import { buildServerElement } from '../../utils/element-conversion.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = ElementSchema.parse(args);
  logger.info('Creating element via MCP', { type: params.type });

  const element = buildServerElement(params, ctx.sceneState.fontFamily ?? 2);
  const canvasElement = await ctx.createElementLocal(element);

  if (!canvasElement) throw new Error('Failed to create element');

  logger.info('Element created via MCP', { id: element.id, type: element.type });

  return { content: [{ type: 'text', text: `Element created successfully!\n\n${JSON.stringify(canvasElement, null, 2)}\n\n✅ Synced to canvas` }] };
}

registerHandler('create_element', handle);
