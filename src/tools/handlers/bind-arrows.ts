import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { generateId, ServerElement, normalizeFontFamily, elements } from '../../types.js';
import type { ExcalidrawElementType } from '../../types/elements.js';
import { convertTextToLabel } from '../../utils/element-conversion.js';
import { resolveArrowBindings } from '../../arrow-utils.js';
import { suggestLabelOffsets } from '../../utils/label-offset-suggest.js';
import { formatChecklistWarnings, runSceneChecklist } from '../../utils/scene-checklist.js';
import logger from '../../utils/logger.js';

const ArrowSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  startElementId: z.string(),
  endElementId: z.string(),
  text: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeStyle: z.string().optional(),
  strokeWidth: z.number().optional(),
  endArrowhead: z.string().optional(),
  startArrowhead: z.string().optional(),
  gap: z.number().optional(),
  labelOffset: z.number().min(0).max(1).optional(),
  snap: z.boolean().optional(),
});

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({ arrows: z.array(ArrowSchema) }).parse(args);
  logger.info('Binding arrows via MCP', { count: params.arrows.length });

  const createdArrows: ServerElement[] = [];

  for (const arrowData of params.arrows) {
    const { startElementId, endElementId, id: customId, type: _type, ...rest } = arrowData;
    const id = customId || generateId();

    const arrow: ServerElement = {
      id,
      type: (arrowData.type || 'arrow') as ExcalidrawElementType,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      ...rest,
      gap: arrowData.gap,
      fontFamily: normalizeFontFamily(undefined) ?? ctx.sceneState.fontFamily ?? 2,
      strokeColor: arrowData.strokeColor ?? '#495057',
      strokeWidth: arrowData.strokeWidth ?? 2,
      roughness: 0,
      fontSize: 16,
      start: { id: startElementId },
      end: { id: endElementId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    createdArrows.push(convertTextToLabel(arrow) as ServerElement);
  }

  // Compute edge-to-edge positions against actual rendered element sizes
  // (which were synced back by the frontend after Phase 1 shape creation)
  resolveArrowBindings(createdArrows);

  const canvasElements = await ctx.batchCreateElementsLocal(createdArrows);

  if (!canvasElements) throw new Error('Failed to bind arrows');

  const arrowsOnly = canvasElements.filter(el => el.type === 'arrow' || el.type === 'line');
  const labelOffsetSuggestions = suggestLabelOffsets(arrowsOnly);
  const checklistWarnings = runSceneChecklist(elements.values());

  logger.info('Arrows bound via MCP', {
    count: canvasElements.length,
    labelOffsetSuggestions: labelOffsetSuggestions.length,
    checklistWarnings: checklistWarnings.length,
  });

  const payload = {
    success: true,
    elements: canvasElements,
    count: canvasElements.length,
    syncedToCanvas: true,
    labelOffsetSuggestions,
    checklistWarnings,
  };

  let summary = `${canvasElements.length} arrows bound successfully!`;
  if (labelOffsetSuggestions.length > 0) {
    summary += `\n\n⚠️ ${labelOffsetSuggestions.length} labelOffset suggestion(s) — parallel/shared arrows may overlap. Apply suggestedLabelOffset on a follow-up bind if labels collide.`;
  }
  summary += formatChecklistWarnings(checklistWarnings);

  return {
    content: [{
      type: 'text',
      text: `${summary}\n\n${JSON.stringify(payload, null, 2)}`,
    }],
  };
}

registerHandler('bind_arrows', handle);
