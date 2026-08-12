import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { listPresets } from '../../templates/presets/index.js';
import logger from '../../utils/logger.js';

async function handle(_ctx: HandlerContext, _args: any) {
  logger.info('Listing style presets');
  const presets = listPresets();
  return {
    content: [{ type: 'text', text: JSON.stringify({ presets, count: presets.length }, null, 2) }],
  };
}

registerHandler('list_style_presets', handle);
