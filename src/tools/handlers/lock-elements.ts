import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { ElementIdsSchema } from '../../schemas/mcp.schema.js';

async function handle(ctx: HandlerContext, args: any) {
  const { elementIds } = ElementIdsSchema.parse(args);
  const results = await Promise.all(elementIds.map(id => ctx.updateElementLocal({ id, locked: true })));
  const successCount = results.filter(r => r).length;
  if (successCount === 0) throw new Error('Failed to lock any elements');
  return { content: [{ type: 'text', text: JSON.stringify({ locked: true, elementIds, successCount }, null, 2) }] };
}

registerHandler('lock_elements', handle);
