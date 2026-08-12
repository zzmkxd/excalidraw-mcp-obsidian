import { describe, it, expect } from 'vitest';
import { CreateElementSchema, UpdateElementSchema } from '../schemas/element.schema.js';

describe('CreateElementSchema', () => {
  it('should validate a minimal rectangle element', () => {
    const result = CreateElementSchema.safeParse({
      type: 'rectangle',
      x: 100,
      y: 200,
    });
    expect(result.success).toBe(true);
  });

  it('should validate a rectangle with all common props', () => {
    const result = CreateElementSchema.safeParse({
      type: 'rectangle',
      x: 100,
      y: 200,
      width: 300,
      height: 150,
      backgroundColor: '#ffffff',
      strokeColor: '#1e1e1e',
      strokeWidth: 2,
      roughness: 1,
      opacity: 100,
      text: 'Hello',
      fontSize: 20,
      fontFamily: 1,
      locked: false,
    });
    expect(result.success).toBe(true);
  });

  it('should validate an arrow with bindings', () => {
    const result = CreateElementSchema.safeParse({
      type: 'arrow',
      x: 0,
      y: 0,
      points: [[0, 0], [100, 0]],
      start: { id: 'elem-1' },
      end: { id: 'elem-2' },
      startArrowhead: null,
      endArrowhead: 'arrow',
    });
    expect(result.success).toBe(true);
  });

  it('should reject an element with invalid type', () => {
    const result = CreateElementSchema.safeParse({
      type: 'invalid-type',
      x: 0,
      y: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject an element missing x coordinate', () => {
    const result = CreateElementSchema.safeParse({
      type: 'rectangle',
      y: 100,
    });
    expect(result.success).toBe(false);
  });

  it('should validate a text element with font settings', () => {
    const result = CreateElementSchema.safeParse({
      type: 'text',
      x: 50,
      y: 50,
      text: 'Sample text',
      fontSize: 24,
      fontFamily: 'Virgil',
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional ID', () => {
    const result = CreateElementSchema.safeParse({
      id: 'custom-id-123',
      type: 'ellipse',
      x: 0,
      y: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('custom-id-123');
    }
  });
});

describe('UpdateElementSchema', () => {
  it('should validate a partial update with only changed fields', () => {
    const result = UpdateElementSchema.safeParse({
      id: 'elem-1',
      x: 150,
      strokeColor: '#ff0000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject update without ID', () => {
    const result = UpdateElementSchema.safeParse({
      x: 100,
    });
    expect(result.success).toBe(false);
  });

  it('should allow arrow label update', () => {
    const result = UpdateElementSchema.safeParse({
      id: 'arrow-1',
      label: { text: 'New label' },
    });
    expect(result.success).toBe(true);
  });

  it('should validate boundElements with correct shape', () => {
    const result = UpdateElementSchema.safeParse({
      id: 'rect-1',
      boundElements: [
        { id: 'text-1', type: 'text' },
        { id: 'arrow-1', type: 'arrow' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('should reject boundElements with invalid type', () => {
    const result = UpdateElementSchema.safeParse({
      id: 'rect-1',
      boundElements: [
        { id: 'text-1', type: 'invalid' },
      ],
    });
    expect(result.success).toBe(false);
  });
});
