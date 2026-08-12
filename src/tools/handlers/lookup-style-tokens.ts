import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { resolveStyleTokens } from '../../utils/style-token-lookup.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({
    roles: z.array(z.string()).min(1),
    preset: z.string().optional(),
  }).parse(args);

  const presetName =
    params.preset?.trim() ||
    ctx.sceneState.activePresetName ||
    'clean-tech';

  logger.info('Looking up style tokens', { preset: presetName, roles: params.roles });

  const { preset, tokens } = resolveStyleTokens(params.roles, presetName);

  const lines = [
    `Preset: ${preset}`,
    `activePresetName: ${ctx.sceneState.activePresetName ?? '(none)'}`,
    '',
    'Resolved tokens (copy fill/stroke into batch_create_elements):',
    ...tokens.map(t => {
      const parts = [`${t.role} → ${t.path}`];
      if (t.fill) parts.push(`fill ${t.fill}`);
      if (t.stroke) parts.push(`stroke ${t.stroke}`);
      if (t.strokeStyle) parts.push(`strokeStyle ${t.strokeStyle}`);
      return `  ${parts.join(' | ')}`;
    }),
  ];

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
    preset,
    tokens,
  };
}

registerHandler('lookup_style_tokens', handle);
