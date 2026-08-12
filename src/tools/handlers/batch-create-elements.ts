import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { ElementSchema } from '../../schemas/mcp.schema.js';
import { ServerElement, elements } from '../../types.js';
import { buildServerElement } from '../../utils/element-conversion.js';
import { formatChecklistWarnings, runSceneChecklist } from '../../utils/scene-checklist.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({ elements: z.array(ElementSchema) }).parse(args);
  logger.info('Batch creating elements via MCP', { count: params.elements.length });

  const createdElements: ServerElement[] = [];

  for (const elementData of params.elements) {
    createdElements.push(buildServerElement(elementData, ctx.sceneState.fontFamily ?? 2));
  }

  const canvasElements = await ctx.batchCreateElementsLocal(createdElements);

  if (!canvasElements) throw new Error('Failed to batch create elements');

  const checklistWarnings = runSceneChecklist(elements.values());
  logger.info('Batch elements created via MCP', {
    count: canvasElements.length,
    checklistWarnings: checklistWarnings.length,
  });

  const payload = {
    success: true,
    elements: canvasElements,
    count: canvasElements.length,
    syncedToCanvas: true,
    checklistWarnings,
  };

  return {
    content: [{
      type: 'text',
      text: `${canvasElements.length} elements created successfully!${formatChecklistWarnings(checklistWarnings)}\n\n${JSON.stringify(payload, null, 2)}\n\n✅ All elements synced to canvas`,
    }],
  };
}

registerHandler('batch_create_elements', handle);
