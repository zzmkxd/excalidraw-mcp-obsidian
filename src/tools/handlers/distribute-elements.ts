import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { DistributeElementsSchema } from '../../schemas/mcp.schema.js';
import { ServerElement } from '../../types.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const { elementIds, direction } = DistributeElementsSchema.parse(args);
  logger.info('Distributing elements', { elementIds, direction });

  const elementsToDist: ServerElement[] = [];
  for (const id of elementIds) {
    const el = await ctx.getElementLocal(id);
    if (el) elementsToDist.push(el);
  }

  if (elementsToDist.length < 3) throw new Error('Need at least 3 elements to distribute');

  if (direction === 'horizontal') {
    elementsToDist.sort((a, b) => a.x - b.x);
    const first = elementsToDist[0]!;
    const last = elementsToDist[elementsToDist.length - 1]!;
    const totalSpan = (last.x + (last.width || 0)) - first.x;
    const totalElementWidth = elementsToDist.reduce((sum, el) => sum + (el.width || 0), 0);
    const gap = (totalSpan - totalElementWidth) / (elementsToDist.length - 1);

    let currentX = first.x;
    for (const el of elementsToDist) {
      await ctx.updateElementLocal({ id: el.id, x: currentX });
      currentX += (el.width || 0) + gap;
    }
  } else {
    elementsToDist.sort((a, b) => a.y - b.y);
    const first = elementsToDist[0]!;
    const last = elementsToDist[elementsToDist.length - 1]!;
    const totalSpan = (last.y + (last.height || 0)) - first.y;
    const totalElementHeight = elementsToDist.reduce((sum, el) => sum + (el.height || 0), 0);
    const gap = (totalSpan - totalElementHeight) / (elementsToDist.length - 1);

    let currentY = first.y;
    for (const el of elementsToDist) {
      await ctx.updateElementLocal({ id: el.id, y: currentY });
      currentY += (el.height || 0) + gap;
    }
  }

  return { content: [{ type: 'text', text: JSON.stringify({ distributed: true, elementIds, direction, count: elementsToDist.length }, null, 2) }] };
}

registerHandler('distribute_elements', handle);
