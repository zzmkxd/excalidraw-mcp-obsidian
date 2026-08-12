import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { GroupIdSchema } from '../../schemas/mcp.schema.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const { groupId } = GroupIdSchema.parse(args);

  if (!ctx.sceneState.groups.has(groupId)) throw new Error(`Group ${groupId} not found`);

  const elementIds = ctx.sceneState.groups.get(groupId)!;
  ctx.sceneState.groups.delete(groupId);

  const updatePromises = (elementIds).map(async (id) => {
    const element = await ctx.getElementLocal(id);
    if (!element) { logger.warn(`Element ${id} not found, skipping`); return null; }
    const updatedGroupIds = (element.groupIds || []).filter(gid => gid !== groupId);
    return ctx.updateElementLocal({ id, groupIds: updatedGroupIds });
  });

  const results = await Promise.all(updatePromises);
  const successCount = results.filter(r => r !== null).length;

  if (successCount === 0) throw new Error('Failed to ungroup: no elements were updated');

  logger.info('Ungrouping elements', { groupId, elementIds, successCount });
  return { content: [{ type: 'text', text: JSON.stringify({ groupId, ungrouped: true, elementIds, successCount }, null, 2) }] };
}

registerHandler('ungroup_elements', handle);
