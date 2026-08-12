import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { ElementIdSchema } from '../../schemas/mcp.schema.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const { id } = ElementIdSchema.parse(args);
  const deleted = ctx.deleteElementLocal(id);
  if (!deleted) throw new Error(`Element "${id}" not found`);
  logger.info('Element deleted via MCP', { id, deleted });
  return { content: [{ type: 'text', text: `Element deleted successfully!\n\n${JSON.stringify({ id, deleted: true }, null, 2)}\n\n✅ Synced to canvas` }] };
}

registerHandler('delete_element', handle);
