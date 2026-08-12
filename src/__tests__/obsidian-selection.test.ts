import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  AI_SELECTION_REL,
  STALE_AFTER_MS,
  formatSelectionSummary,
  loadAiSelectionFromDisk,
} from '../utils/obsidian-selection.js';
import { sanitizeFilePath } from '../utils/file-path.js';

function sampleElement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'abc123def',
    type: 'rectangle',
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    text: 'Hello box',
    strokeColor: '#000',
    backgroundColor: '#fff',
    strokeWidth: 1,
    strokeStyle: 'solid',
    fillStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    boundElementIds: [],
    locked: false,
    ...overrides,
  };
}

describe('obsidian-selection bridge', () => {
  const safePath = sanitizeFilePath(AI_SELECTION_REL);
  const dir = path.dirname(safePath);

  beforeEach(() => {
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
  });

  afterEach(() => {
    if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
  });

  it('returns null when selection file is missing', () => {
    expect(loadAiSelectionFromDisk()).toBeNull();
  });

  it('loads payload and formats a summary with import hint', () => {
    const payload = {
      elements: [sampleElement()],
      timestamp: '2026-07-24T00:00:00.000Z',
      source: 'obsidian-ea-script',
      filePath: 'notes/demo.excalidraw.md',
      instruction: 'make it green',
    };
    fs.writeFileSync(safePath, JSON.stringify(payload), 'utf-8');

    const loaded = loadAiSelectionFromDisk();
    expect(loaded).not.toBeNull();
    expect(loaded!.elements).toHaveLength(1);
    expect(loaded!.instruction).toBe('make it green');

    const now = Date.parse('2026-07-24T00:05:00.000Z');
    const summary = formatSelectionSummary(loaded!, { now });
    expect(summary).toContain('Selected 1 element(s)');
    expect(summary).toContain('Instruction: make it green');
    expect(summary).toContain('rectangle');
    expect(summary).toContain('Hello box');
    expect(summary).toContain('Age: 5m');
    expect(summary).toContain('import_from_obsidian');
    expect(summary).toContain('notes/demo.excalidraw.md');
    expect(summary).not.toContain('STALE:');
    expect(summary).not.toContain('"strokeColor"');

    const full = formatSelectionSummary(loaded!, { fullJson: true, now });
    expect(full).toContain('Full payload:');
    expect(full).toContain('"strokeColor"');
  });

  it('marks selection STALE when older than 30 minutes', () => {
    const payload = {
      elements: [sampleElement()],
      timestamp: '2026-07-24T00:00:00.000Z',
      filePath: 'notes/demo.excalidraw.md',
    };
    const now = Date.parse('2026-07-24T00:00:00.000Z') + STALE_AFTER_MS + 60_000;
    const summary = formatSelectionSummary(payload, { now });
    expect(summary).toContain('STALE:');
    expect(summary).toContain('import_from_obsidian');
  });

  it('returns null for empty elements array', () => {
    fs.writeFileSync(safePath, JSON.stringify({ elements: [] }), 'utf-8');
    expect(loadAiSelectionFromDisk()).toBeNull();
  });
});
