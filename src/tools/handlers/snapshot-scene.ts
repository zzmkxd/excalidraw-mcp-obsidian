import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { elements, snapshots } from '../../types.js';
import logger from '../../utils/logger.js';

async function handle(_ctx: HandlerContext, args: any) {
  const params = z.object({ name: z.string() }).parse(args);
  logger.info('Saving snapshot via MCP', { name: params.name });

  const elementsArray = Array.from(elements.values());
  const snapshot = { name: params.name, elements: elementsArray, createdAt: new Date().toISOString() };
  snapshots.set(params.name, snapshot);

  return { content: [{ type: 'text', text: `Snapshot "${params.name}" saved (${elementsArray.length} elements)\n\n${JSON.stringify({ success: true, name: params.name, elementCount: elementsArray.length, createdAt: snapshot.createdAt }, null, 2)}` }] };
}

registerHandler('snapshot_scene', handle);
