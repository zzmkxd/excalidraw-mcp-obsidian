import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { ElementIdsSchema } from '../../schemas/mcp.schema.js';
import { generateId } from '../../types.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const { elementIds } = ElementIdsSchema.parse(args);
  const groupId = generateId();
  ctx.sceneState.groups.set(groupId, [...elementIds]);

  const updatePromises = elementIds.map(async (id) => {
    const element = await ctx.getElementLocal(id);
    const existingGroups = element?.groupIds || [];
    return ctx.updateElementLocal({ id, groupIds: [...existingGroups, groupId] });
  });

  const results = await Promise.all(updatePromises);
  const successCount = results.filter(r => r).length;

  if (successCount === 0) {
    ctx.sceneState.groups.delete(groupId);
    throw new Error('Failed to group any elements');
  }

  logger.info('Grouping elements', { elementIds, groupId, successCount });
  return { content: [{ type: 'text', text: JSON.stringify({ groupId, elementIds, successCount }, null, 2) }] };
}

registerHandler('group_elements', handle);
