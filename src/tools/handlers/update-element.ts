import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { ElementSchema, ElementIdSchema } from '../../schemas/mcp.schema.js';
import { ServerElement, normalizeFontFamily } from '../../types.js';
import { convertTextToLabel, normalizePoints } from '../../utils/element-conversion.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = ElementIdSchema.merge(ElementSchema.partial()).parse(args);
  const { id, points: rawPoints, ...updates } = params;

  if (!id) throw new Error('Element ID is required');

  const updatePayload: Partial<ServerElement> & { id: string } = {
    id, ...updates,
    points: rawPoints ? normalizePoints(rawPoints) : undefined,
    updatedAt: new Date().toISOString()
  };

  if (updatePayload.fontFamily !== undefined) {
    updatePayload.fontFamily = normalizeFontFamily(updatePayload.fontFamily);
  }

  // Sanitize numeric inputs
  if (updatePayload.x !== undefined) updatePayload.x = Math.max(0, Math.round(updatePayload.x));
  if (updatePayload.y !== undefined) updatePayload.y = Math.max(0, Math.round(updatePayload.y));
  if (updatePayload.width !== undefined) updatePayload.width = Math.max(20, Math.min(5000, Math.round(updatePayload.width)));
  if (updatePayload.height !== undefined) updatePayload.height = Math.max(20, Math.min(5000, Math.round(updatePayload.height)));
  if (updatePayload.fontSize !== undefined) updatePayload.fontSize = Math.max(8, Math.min(72, Math.round(updatePayload.fontSize)));

  const excalidrawElement = convertTextToLabel(updatePayload as ServerElement) as ServerElement;
  const canvasElement = await ctx.updateElementLocal(excalidrawElement);

  if (!canvasElement) throw new Error('Failed to update element');

  logger.info('Element updated via MCP', { id: excalidrawElement.id });

  return { content: [{ type: 'text', text: `Element updated successfully!\n\n${JSON.stringify(canvasElement, null, 2)}\n\n✅ Synced to canvas` }] };
}

registerHandler('update_element', handle);
