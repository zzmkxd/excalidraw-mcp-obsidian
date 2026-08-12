import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { getFullGuide } from '../../templates/index.js';

async function handle(_ctx: HandlerContext, args: any) {
  const params = z.object({ template: z.string().optional() }).parse(args || {});
  return { content: [{ type: 'text', text: getFullGuide(params.template) }] };
}

registerHandler('read_diagram_guide', handle);
