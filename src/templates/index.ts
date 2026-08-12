import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Metadata for a diagram template loaded from markdown */
export interface ITemplate {
  name: string;
  description: string;
  category: string;
  content: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesCache = new Map<string, ITemplate>();

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]!] = kv[2]!.trim().replace(/^["'](.*)["']$/, '$1');
  }
  return { meta, body: match[2]! };
}

/**
 * Load all .template.md files from the templates directory.
 * Tries both dist/templates/ (production) and src/templates/ (dev fallback).
 */
function loadAllTemplates(): void {
  if (templatesCache.size > 0) return;

  const candidates = [
    path.join(__dirname),           // dist/templates/ (compiled)
    path.join(__dirname, '..', 'src', 'templates'),  // src/templates/ (dev fallback)
  ];

  let files: string[] = [];
  for (const dir of candidates) {
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.template.md') || f === 'guide-base.md');
      if (files.length > 0) break;
    } catch { /* directory may not exist */ }
  }

  for (const file of files) {
    try {
      // Try same dir that had the files
      for (const dir of candidates) {
        const filePath = path.join(dir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const { meta, body } = parseFrontmatter(content);
          const template: ITemplate = {
            name: meta.name || file.replace(/\.(template\.)?md$/, ''),
            description: meta.description || '',
            category: meta.category || 'general',
            content: body.trim(),
          };
          templatesCache.set(template.name, template);
          break;
        } catch { /* try next dir */ }
      }
    } catch { /* skip unreadable files */ }
  }
}

export function getTemplate(name: string): ITemplate | undefined {
  loadAllTemplates();
  return templatesCache.get(name);
}

export function listTemplates(): ITemplate[] {
  loadAllTemplates();
  return Array.from(templatesCache.values());
}

export function getTemplateNames(): string[] {
  loadAllTemplates();
  return Array.from(templatesCache.keys());
}

export function getFullGuide(templateName?: string): string {
  const guide = getTemplate('General Design Guide');
  const base = guide?.content || '';

  if (!templateName) return base;

  const specific = getTemplate(templateName);
  if (!specific) return base + `\n\n---\n\nNo specific template found for "${templateName}". Available: ${getTemplateNames().join(', ')}`;

  return base + '\n\n---\n\n' + specific.content;
}
