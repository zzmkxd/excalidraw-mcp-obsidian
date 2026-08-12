import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, _args: any) {
  logger.info('Clearing canvas via MCP');
  const count = ctx.clearAllLocal();
  logger.info(`Canvas cleared: ${count} elements removed`);
  return { content: [{ type: 'text', text: `Canvas cleared. Removed ${count} elements.` }] };
}

registerHandler('clear_canvas', handle);
