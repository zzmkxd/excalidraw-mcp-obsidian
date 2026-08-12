import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { generateId, ServerElement } from '../../types.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({
    elementIds: z.array(z.string()),
    offsetX: z.number().optional(),
    offsetY: z.number().optional()
  }).parse(args);

  const offsetX = params.offsetX ?? 20;
  const offsetY = params.offsetY ?? 20;

  logger.info('Duplicating elements via MCP', { count: params.elementIds.length });

  const duplicates: ServerElement[] = [];
  for (const id of params.elementIds) {
    const original = await ctx.getElementLocal(id);
    if (!original) { logger.warn(`Element ${id} not found, skipping`); continue; }

    const { createdAt, updatedAt, version, syncedAt, source, syncTimestamp, ...rest } = original;
    duplicates.push({
      ...rest, id: generateId(),
      x: original.x + offsetX, y: original.y + offsetY,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1
    });
  }

  if (duplicates.length === 0) throw new Error('No elements could be duplicated (none found)');

  const canvasElements = await ctx.batchCreateElementsLocal(duplicates);
  return { content: [{ type: 'text', text: `Duplicated ${duplicates.length} elements (offset: ${offsetX}, ${offsetY})\n\n${JSON.stringify(canvasElements, null, 2)}\n\n✅ Synced to canvas` }] };
}

registerHandler('duplicate_elements', handle);
