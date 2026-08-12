import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { ElementIdSchema } from '../../schemas/mcp.schema.js';

async function handle(ctx: HandlerContext, args: any) {
  const { id } = ElementIdSchema.parse(args);
  const element = await ctx.getElementLocal(id);
  if (!element) throw new Error(`Element ${id} not found`);
  return { content: [{ type: 'text', text: JSON.stringify(element, null, 2) }] };
}

registerHandler('get_element', handle);
