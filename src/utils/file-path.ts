import path from 'path';

function getAllowedExportDir(): string {
  return path.resolve(process.env.EXCALIDRAW_EXPORT_DIR || process.cwd());
}

/** Validate and resolve a file path, blocking traversal outside the allowed directory */
export function sanitizeFilePath(filePath: string): string {
  const allowedDir = getAllowedExportDir();
  // Resolve relative paths against the allowed directory, not cwd
  const resolved = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(allowedDir, filePath);
  if (!resolved.startsWith(allowedDir + path.sep) && resolved !== allowedDir) {
    throw new Error(
      `Path traversal blocked: "${filePath}" resolves outside the allowed directory "${allowedDir}". ` +
      `Set EXCALIDRAW_EXPORT_DIR to change the allowed base directory.`
    );
  }
  return resolved;
}
