import { z } from 'zod';
import { EXCALIDRAW_ELEMENT_TYPES, ExcalidrawElementType } from '../types.js';

const PointObjectSchema = z.object({ x: z.number(), y: z.number() });
const PointTupleSchema = z.tuple([z.number(), z.number()]);
const PointSchema = z.union([PointObjectSchema, PointTupleSchema]);

export const ElementSchema = z.object({
  id: z.string().optional(),
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  points: z.array(PointSchema).optional(),
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  roughness: z.number().optional(),
  opacity: z.number().optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.union([z.string(), z.number()]).optional(),
  groupIds: z.array(z.string()).optional(),
  locked: z.boolean().optional(),
  strokeStyle: z.string().optional(),
  roundness: z.object({ type: z.number(), value: z.number().optional() }).nullable().optional(),
  fillStyle: z.string().optional(),
  elbowed: z.boolean().optional(),
  startElementId: z.string().optional(),
  endElementId: z.string().optional(),
  endArrowhead: z.string().optional(),
  startArrowhead: z.string().optional(),
  labelOffset: z.number().min(0).max(1).optional(),
});

export const ElementIdSchema = z.object({ id: z.string() });
export const ElementIdsSchema = z.object({ elementIds: z.array(z.string()) });
export const GroupIdSchema = z.object({ groupId: z.string() });

export const AlignElementsSchema = z.object({
  elementIds: z.array(z.string()),
  alignment: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom'])
});

export const DistributeElementsSchema = z.object({
  elementIds: z.array(z.string()),
  direction: z.enum(['horizontal', 'vertical'])
});

export const QuerySchema = z.object({
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]).optional(),
  filter: z.record(z.any()).optional(),
  bbox: z.object({
    x_min: z.number().optional(), x_max: z.number().optional(),
    y_min: z.number().optional(), y_max: z.number().optional()
  }).optional()
});

export const ResourceSchema = z.object({
  resource: z.enum(['scene', 'library', 'theme', 'elements'])
});
