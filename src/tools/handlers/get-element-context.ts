import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { elements } from '../../types.js';
import { findNearby } from '../../utils/spatial.js';

async function handle(_ctx: HandlerContext, args: any) {
  const params = z.object({ id: z.string(), radius: z.number().optional().default(200) }).parse(args);
  const { id, radius } = params;

  const target = elements.get(id);
  if (!target) {
    return { content: [{ type: 'text', text: `Element "${id}" not found. Use describe_scene to see available elements.` }], isError: true };
  }

  const allElements = Array.from(elements.values());
  const nearby = findNearby(target, allElements, radius);

  return { content: [{ type: 'text', text: `Element "${id}" (${target.type}):\n${JSON.stringify({
    id: target.id, type: target.type, x: target.x, y: target.y,
    width: target.width, height: target.height,
    text: (target as any).text, fontSize: (target as any).fontSize,
    strokeColor: target.strokeColor, backgroundColor: target.backgroundColor,
    groupIds: target.groupIds, boundElements: target.boundElements, locked: target.locked,
  }, null, 2)}\n\nNearby elements (within ${radius}px):\n${JSON.stringify(nearby, null, 2)}` }] };
}

registerHandler('get_element_context', handle);
