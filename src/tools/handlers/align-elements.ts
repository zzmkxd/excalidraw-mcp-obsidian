import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { AlignElementsSchema } from '../../schemas/mcp.schema.js';
import { ServerElement } from '../../types.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const { elementIds, alignment } = AlignElementsSchema.parse(args);
  logger.info('Aligning elements', { elementIds, alignment });

  const elementsToAlign: ServerElement[] = [];
  for (const id of elementIds) {
    const el = await ctx.getElementLocal(id);
    if (el) elementsToAlign.push(el);
  }

  if (elementsToAlign.length < 2) throw new Error('Need at least 2 elements to align');

  let updateFn: (el: ServerElement) => { x?: number; y?: number };
  switch (alignment) {
    case 'left': { const minX = Math.min(...elementsToAlign.map(el => el.x)); updateFn = () => ({ x: minX }); break; }
    case 'right': { const maxRight = Math.max(...elementsToAlign.map(el => el.x + (el.width || 0))); updateFn = (el) => ({ x: maxRight - (el.width || 0) }); break; }
    case 'center': { const centers = elementsToAlign.map(el => el.x + (el.width || 0) / 2); const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length; updateFn = (el) => ({ x: avgCenter - (el.width || 0) / 2 }); break; }
    case 'top': { const minY = Math.min(...elementsToAlign.map(el => el.y)); updateFn = () => ({ y: minY }); break; }
    case 'bottom': { const maxBottom = Math.max(...elementsToAlign.map(el => el.y + (el.height || 0))); updateFn = (el) => ({ y: maxBottom - (el.height || 0) }); break; }
    case 'middle': { const middles = elementsToAlign.map(el => el.y + (el.height || 0) / 2); const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length; updateFn = (el) => ({ y: avgMiddle - (el.height || 0) / 2 }); break; }
    default: throw new Error(`Unknown alignment: ${alignment}`);
  }

  const results = await Promise.all(elementsToAlign.map(el => ctx.updateElementLocal({ id: el.id, ...updateFn(el) })));
  const successCount = results.filter(r => r).length;

  if (successCount === 0) throw new Error('Failed to align any elements');

  return { content: [{ type: 'text', text: JSON.stringify({ aligned: true, elementIds, alignment, successCount }, null, 2) }] };
}

registerHandler('align_elements', handle);
