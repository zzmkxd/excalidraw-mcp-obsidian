import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sanitizeFilePath } from '../utils/file-path.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('sanitizeFilePath', () => {
  const prevExportDir = process.env.EXCALIDRAW_EXPORT_DIR;
  let exportDir: string;

  beforeEach(() => {
    exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excalidraw-export-'));
    process.env.EXCALIDRAW_EXPORT_DIR = exportDir;
  });

  afterEach(() => {
    if (prevExportDir === undefined) {
      delete process.env.EXCALIDRAW_EXPORT_DIR;
    } else {
      process.env.EXCALIDRAW_EXPORT_DIR = prevExportDir;
    }
    fs.rmSync(exportDir, { recursive: true, force: true });
  });

  it('should resolve a valid path within the allowed directory', () => {
    const valid = path.join(exportDir, 'output', 'test.png');
    expect(sanitizeFilePath(valid)).toBe(path.resolve(valid));
  });

  it('should throw on path traversal attempt', () => {
    expect(() => sanitizeFilePath('/etc/passwd')).toThrow(/Path traversal blocked/);
  });

  it('should throw on parent directory traversal', () => {
    expect(() => sanitizeFilePath('../outside')).toThrow(/Path traversal blocked/);
  });

  it('should allow the allowed directory itself', () => {
    expect(sanitizeFilePath(exportDir)).toBe(path.resolve(exportDir));
  });

  it('should resolve relative paths within allowed directory', () => {
    const relative = 'test-output.excalidraw';
    const resolved = sanitizeFilePath(relative);
    expect(resolved).toBe(path.join(exportDir, relative));
  });
});
