import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { elements, snapshots } from '../../types.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({ name: z.string() }).parse(args);
  logger.info('Restoring snapshot via MCP', { name: params.name });

  const snapshot = snapshots.get(params.name);
  if (!snapshot) throw new Error(`Snapshot "${params.name}" not found`);

  elements.clear();
  const canvasElements = await ctx.batchCreateElementsLocal(snapshot.elements);

  return { content: [{ type: 'text', text: `Snapshot "${params.name}" restored (${snapshot.elements.length} elements)\n\n✅ Canvas updated` }] };
}

registerHandler('restore_snapshot', handle);
