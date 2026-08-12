import LZString from 'lz-string';

export function compressToBase64(json: string): string {
  return LZString.compressToBase64(json);
}

export function decompressFromBase64(compressed: string): string {
  const result = LZString.decompressFromBase64(compressed);
  if (result === null || result === undefined) {
    throw new Error('Failed to decompress LZString data: input may be corrupted or not valid compressed-json');
  }
  return result;
}

/**
 * Build a complete .excalidraw.md file content from scene JSON.
 * Follows the Obsidian Excalidraw plugin v2.x format:
 * YAML frontmatter + text elements section + %% wrapped compressed-json block.
 */
export function buildExcalidrawMd(
  sceneJson: string,
  tags: string[] = ['excalidraw']
): string {
  const parsed = JSON.parse(sceneJson);
  const elements = parsed.elements || [];
  // Intentionally leave the Text Elements section empty.
  // Obsidian's Excalidraw plugin merges markdown-adjacent text blocks regardless
  // of formatting (plain, bullet, blockquote), corrupting the JSON element text.
  // All text is fully contained in the compressed JSON — the plugin renders
  // it correctly from there without needing the markdown section.
  const textSection = '';

  const compressed = compressToBase64(sceneJson);

  return `---
excalidraw-plugin: parsed
tags: [${tags.join(', ')}]
---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠== You can decompress Drawing data with the command palette: 'Decompress current Excalidraw file'. For more info check in plugin settings under 'Saving'

# Excalidraw Data

## Text Elements
${textSection}

%%
## Drawing
\`\`\`compressed-json
${compressed}
\`\`\`
%%`;
}

/**
 * Extract and decompress the compressed-json block from a .excalidraw.md file.
 */
export function extractAndDecompress(mdContent: string): string {
  const match = mdContent.match(/```compressed-json\n([\s\S]*?)```/);
  if (!match || !match[1]) {
    throw new Error('No compressed-json block found in the .excalidraw.md file. Is it a valid Excalidraw document?');
  }
  return decompressFromBase64(match[1].replace(/[\s\n\r]/g, ''));
}
