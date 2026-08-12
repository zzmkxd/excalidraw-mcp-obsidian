#!/usr/bin/env node
/**
 * Template-faithful soak (not simplified smoke):
 * - architecture: surfaces + nodes + typed arrows
 * - sequence: participants + lifelines + activation bars + messages
 *
 * Usage:
 *   node scripts/soak-template-faithful.mjs
 *   node scripts/soak-template-faithful.mjs architecture
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const EXPORT_DIR = process.env.EXCALIDRAW_EXPORT_DIR || 'E:/Learn_zone/Mark_down';
process.env.EXCALIDRAW_EXPORT_DIR = EXPORT_DIR;

const STAGING_REL = 'Ob_Responsity/Coding_Responsity/暂存/插件开发测试';
const STAGING_ABS = path.join(EXPORT_DIR, STAGING_REL);

const distImport = (rel) => import(pathToFileURL(path.join(repoRoot, rel)).href);

const { buildServerElement, convertTextToLabel } = await distImport('dist/utils/element-conversion.js');
const { batchCreateElementsLocal, clearAllLocal } = await distImport('dist/tools/local-crud.js');
const { elements, generateId } = await distImport('dist/types.js');
const { sanitizeFilePath } = await distImport('dist/utils/file-path.js');
const { buildExcalidrawMd } = await distImport('dist/utils/lzstring-bridge.js');
const { resolveArrowBindings } = await distImport('dist/arrow-utils.js');
const { runSceneChecklist } = await distImport('dist/utils/scene-checklist.js');

function exportScene(fileName, tags = ['excalidraw', 'soak']) {
  fs.mkdirSync(STAGING_ABS, { recursive: true });
  const rel = `${STAGING_REL}/${fileName}`.replace(/\\/g, '/');
  const safePath = sanitizeFilePath(rel);
  const allElements = Array.from(elements.values());
  const elementIds = new Set(elements.keys());
  for (const el of allElements) {
    if (el.boundElements?.length) {
      el.boundElements = el.boundElements.filter(b => elementIds.has(b.id));
      if (el.boundElements.length === 0) delete el.boundElements;
    }
  }
  const scene = {
    type: 'excalidraw',
    version: 2,
    elements: allElements,
    appState: { theme: 'light', viewBackgroundColor: '#ffffff' },
  };
  fs.writeFileSync(safePath, buildExcalidrawMd(JSON.stringify(scene, null, 2), tags), 'utf-8');
  return { safePath, count: allElements.length, elements: allElements };
}

function make(data) {
  return buildServerElement(data, 2);
}

function bindArrows(defs) {
  const arrows = defs.map(d => {
    const id = d.id || generateId();
    const arrow = {
      id,
      type: 'arrow',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      text: d.text,
      strokeColor: d.strokeColor || '#495057',
      strokeStyle: d.strokeStyle || 'solid',
      strokeWidth: 2,
      roughness: 0,
      fontSize: 12,
      fontFamily: 2,
      start: { id: d.startElementId },
      end: { id: d.endElementId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    return convertTextToLabel(arrow);
  });
  resolveArrowBindings(arrows);
  return batchCreateElementsLocal(arrows);
}

function assertChecklistClean(context) {
  const warnings = runSceneChecklist(elements.values());
  if (warnings.length) {
    const detail = warnings.map(w => `[${w.code}] ${w.message}`).join('\n  ');
    throw new Error(`${context}: checklist warnings:\n  ${detail}`);
  }
}

function assertTexts(labels) {
  const texts = Array.from(elements.values()).filter(e => e.type === 'text').map(e => e.text);
  const set = new Set(texts);
  for (const l of labels) {
    if (!set.has(l)) throw new Error(`Missing text "${l}". Have: ${texts.join(', ')}`);
  }
}

function assertBidirectionalSeparated(idA, idB) {
  const arrows = Array.from(elements.values()).filter(e => e.type === 'arrow');
  const pair = arrows.filter(a => {
    const s = a.startBinding?.elementId;
    const e = a.endBinding?.elementId;
    if (!s || !e) return false;
    const key = [s, e].sort().join(':');
    return key === [idA, idB].sort().join(':');
  });
  if (pair.length < 2) throw new Error(`Expected bidirectional pair ${idA}<->${idB}, got ${pair.length}`);
  const ys = new Set(pair.map(a => Math.round(a.y)));
  if (ys.size < 2) throw new Error(`Bidirectional arrows on ${idA}<->${idB} still coincident`);
}

const suites = {
  architecture: () => {
    clearAllLocal();
    // Surfaces first (behind nodes)
    batchCreateElementsLocal([
      make({
        id: 'surf-entry', type: 'rectangle', x: 40, y: 40, width: 1000, height: 200,
        backgroundColor: '#F5F5F5', strokeColor: '#CCCCCC', strokeWidth: 1,
      }),
      make({
        id: 'surf-infra', type: 'rectangle', x: 40, y: 280, width: 1000, height: 220,
        backgroundColor: '#F8F8F0', strokeColor: '#495057', strokeWidth: 1,
      }),
      make({
        id: 'n-cursor', type: 'rectangle', x: 80, y: 90, width: 180, height: 80,
        text: 'Cursor/Claude', backgroundColor: '#FFFFFF', strokeColor: '#495057',
        roundness: { type: 3 },
      }),
      make({
        id: 'n-mcp', type: 'rectangle', x: 360, y: 90, width: 180, height: 80,
        text: 'MCP server', backgroundColor: '#FFFFFF', strokeColor: '#495057',
      }),
      make({
        id: 'n-dist', type: 'rectangle', x: 80, y: 340, width: 180, height: 80,
        text: 'dist/index.js', backgroundColor: '#D6EAF8', strokeColor: '#1A5276',
      }),
      make({
        id: 'n-vault', type: 'rectangle', x: 360, y: 340, width: 200, height: 80,
        text: 'Obsidian vault', backgroundColor: '#D6EAF8', strokeColor: '#1A5276',
      }),
      make({
        id: 'n-archive', type: 'rectangle', x: 680, y: 340, width: 180, height: 80,
        text: 'archive/ docs', backgroundColor: '#EBEBEB', strokeColor: '#6C757D',
      }),
    ]);

    bindArrows([
      { startElementId: 'n-cursor', endElementId: 'n-mcp', text: 'stdio MCP', strokeStyle: 'solid' },
      { startElementId: 'n-mcp', endElementId: 'n-dist', text: 'load', strokeStyle: 'dashed', strokeColor: '#ADB5BD' },
      { startElementId: 'n-mcp', endElementId: 'n-vault', text: 'export.md', strokeStyle: 'dotted', strokeColor: '#1A5276' },
      { startElementId: 'n-mcp', endElementId: 'n-archive', text: '参考', strokeStyle: 'dashed', strokeColor: '#ADB5BD' },
    ]);

    const shapes = Array.from(elements.values()).filter(e => e.type === 'rectangle');
    const surfaces = shapes.filter(s => !s.label?.text && (s.width || 0) >= 400);
    if (surfaces.length < 2) throw new Error(`Need ≥2 surfaces, got ${surfaces.length}`);
    const labeled = shapes.filter(s => s.label?.text);
    if (labeled.length < 4) throw new Error(`Need ≥4 labeled nodes, got ${labeled.length}`);

    const arrows = Array.from(elements.values()).filter(e => e.type === 'arrow');
    const styles = new Set(arrows.map(a => a.strokeStyle || 'solid'));
    if (!styles.has('dashed') || !styles.has('dotted')) {
      throw new Error(`Need dashed+dotted arrows, got ${[...styles].join(',')}`);
    }

    assertTexts(['Cursor/Claude', 'MCP server', 'dist/index.js', 'Obsidian vault']);
    assertChecklistClean('architecture');
    const out = exportScene('wip-soak-architecture.excalidraw.md');
    console.log(`OK architecture → ${out.safePath} (${out.count} elements)`);
  },

  sequence: () => {
    clearAllLocal();
    const participants = [
      { id: 'p-ai', x: 80, label: 'AI Agent' },
      { id: 'p-mcp', x: 320, label: 'MCP server' },
      { id: 'p-vault', x: 560, label: 'Obsidian' },
    ];
    const boxH = 40;
    const boxW = 120;
    const lifeTop = 100;
    const lifeBottom = 420;
    const actTop = 140;
    const actH = 240;

    const shapes = [];
    for (const p of participants) {
      shapes.push(make({
        id: p.id, type: 'rectangle', x: p.x, y: 40, width: boxW, height: boxH,
        text: p.label, backgroundColor: '#FFFFFF', strokeColor: '#495057', fontSize: 16,
      }));
      const cx = p.x + boxW / 2;
      // Lifeline (unbound dashed line)
      shapes.push(make({
        id: `${p.id}-life`, type: 'line', x: cx, y: lifeTop,
        strokeStyle: 'dashed', strokeColor: '#ADB5BD', strokeWidth: 1,
        points: [[0, 0], [0, lifeBottom - lifeTop]],
      }));
      // Activation bar
      shapes.push(make({
        id: `${p.id}-act`, type: 'rectangle',
        x: cx - 8, y: actTop, width: 16, height: actH,
        backgroundColor: '#D6EAF8', strokeColor: '#1A5276', strokeWidth: 1,
      }));
    }
    batchCreateElementsLocal(shapes);

    bindArrows([
      { startElementId: 'p-ai-act', endElementId: 'p-mcp-act', text: 'batch_create' },
      { startElementId: 'p-mcp-act', endElementId: 'p-vault-act', text: 'export' },
      { startElementId: 'p-vault-act', endElementId: 'p-mcp-act', text: 'ack' },
      { startElementId: 'p-mcp-act', endElementId: 'p-ai-act', text: 'ok' },
    ]);

    const lines = Array.from(elements.values()).filter(e => e.type === 'line');
    if (lines.length < 3) throw new Error(`Need ≥3 lifelines, got ${lines.length}`);
    const acts = Array.from(elements.values()).filter(
      e => e.type === 'rectangle' && (e.width || 0) <= 40 && (e.height || 0) >= 80
    );
    if (acts.length < 3) throw new Error(`Need ≥3 activation bars, got ${acts.length}`);

    assertTexts(['AI Agent', 'MCP server', 'Obsidian', 'batch_create', 'export']);
    assertBidirectionalSeparated('p-mcp-act', 'p-vault-act');
    assertBidirectionalSeparated('p-ai-act', 'p-mcp-act');
    assertChecklistClean('sequence');

    // Evidence for R2: flag non-horizontal message arrows
    const arrows = Array.from(elements.values()).filter(e => e.type === 'arrow');
    const skewed = arrows.filter(a => {
      const pts = a.points;
      if (!pts || pts.length < 2) return false;
      const dy = Math.abs(pts[pts.length - 1][1] - pts[0][1]);
      return dy > 8;
    });
    if (skewed.length) {
      console.warn(`NOTE sequence: ${skewed.length} non-horizontal arrow(s) — candidate for R2 rule`);
    }

    const out = exportScene('wip-soak-sequence.excalidraw.md');
    console.log(`OK sequence → ${out.safePath} (${out.count} elements)`);
    return { skewedCount: skewed.length };
  },
};

if (!fs.existsSync(path.join(repoRoot, 'dist/utils/scene-checklist.js'))) {
  console.error('dist/ missing — run npm run build first');
  process.exit(1);
}

const arg = process.argv[2] || 'all';
const names = arg === 'all' ? Object.keys(suites) : [arg];
fs.mkdirSync(STAGING_ABS, { recursive: true });

let failed = 0;
const notes = [];
for (const name of names) {
  const fn = suites[name];
  if (!fn) {
    console.error(`Unknown suite: ${name}`);
    failed++;
    continue;
  }
  try {
    const meta = fn() || {};
    if (meta.skewedCount) notes.push(`${name}: skewedArrows=${meta.skewedCount}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}:`, err.message || err);
  }
}

if (notes.length) {
  fs.writeFileSync(
    path.join(STAGING_ABS, 'SOAK_NOTES.md'),
    `# Soak notes\n\n${new Date().toISOString()}\n\n${notes.map(n => `- ${n}`).join('\n')}\n`,
    'utf-8',
  );
}

if (failed) {
  console.error(`\n${failed} suite(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${names.length} soak suite(s) passed.\n  ${STAGING_ABS}`);
