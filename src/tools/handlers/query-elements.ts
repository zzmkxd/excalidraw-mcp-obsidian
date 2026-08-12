import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { QuerySchema } from '../../schemas/mcp.schema.js';
import { elements } from '../../types.js';

async function handle(_ctx: HandlerContext, args: any) {
  const { type, filter, bbox } = QuerySchema.parse(args || {});
  let results = Array.from(elements.values());

  if (type) {
    results = results.filter(el => el.type === type);
  }
  if (bbox) {
    const xMin = bbox.x_min !== undefined ? bbox.x_min : -Infinity;
    const xMax = bbox.x_max !== undefined ? bbox.x_max : Infinity;
    const yMin = bbox.y_min !== undefined ? bbox.y_min : -Infinity;
    const yMax = bbox.y_max !== undefined ? bbox.y_max : Infinity;
    results = results.filter(el =>
      el.x >= xMin && el.x <= xMax && el.y >= yMin && el.y <= yMax
    );
  }
  if (filter && Object.keys(filter).length > 0) {
    results = results.filter(el =>
      Object.entries(filter).every(([key, value]) => (el as any)[key] === value)
    );
  }
  return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
}

registerHandler('query_elements', handle);
