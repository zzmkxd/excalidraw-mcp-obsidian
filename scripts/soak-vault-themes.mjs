#!/usr/bin/env node
/**
 * Semantic vault soak — real workspace themes (not smoke fake "API网关").
 * Content anchored to .mcp.json / CLAUDE.md / DOCS_BUILD_RUN.md.
 *
 * Usage:
 *   node scripts/soak-vault-themes.mjs
 *   node scripts/soak-vault-themes.mjs vault-arch
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

// clean-tech tokens (architecture)
const CT = {
  surfMid: { fill: '#F5F5F5', stroke: '#495057' },
  surfWarm: { fill: '#F8F8F0', stroke: '#495057' },
  surfLight: { fill: '#FFFFFF', stroke: '#CCCCCC' },
  nodePrimary: { fill: '#FFFFFF', stroke: '#495057' },
  nodeAccent: { fill: '#D6EAF8', stroke: '#1A5276' },
  nodeMuted: { fill: '#EBEBEB', stroke: '#6C757D' },
  nodeHighlight: { fill: '#FFF3CD', stroke: '#856404' },
  arrowSolid: { stroke: '#495057', style: 'solid' },
  arrowDashed: { stroke: '#ADB5BD', style: 'dashed' },
  arrowDotted: { stroke: '#1A5276', style: 'dotted' },
};

// sequence-diagram preset tokens
const SEQ = {
  client: { fill: '#F0F4FF', stroke: '#1e1e1e' },
  service: { fill: '#FFFFFF', stroke: '#1e1e1e' },
  infra: { fill: '#FFF9F0', stroke: '#1e1e1e' },
  lifeline: { stroke: '#CED4DA' },
  activation: { fill: '#E9ECEF', stroke: '#868E96' },
  sync: { stroke: '#495057', style: 'solid' },
  ret: { stroke: '#ADB5BD', style: 'dashed' },
};

function exportScene(fileName, tags = ['excalidraw', 'vault-soak']) {
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

function collectPainNotes(suiteName) {
  const notes = [];
  // Only sequence non-horizontal messages are pain candidates (architecture diagonals are expected).
  if (suiteName !== 'vault-seq') return notes;
  const arrows = Array.from(elements.values()).filter(e => e.type === 'arrow');
  const skewed = arrows.filter(a => {
    const pts = a.points;
    if (!pts || pts.length < 2) return false;
    return Math.abs(pts[pts.length - 1][1] - pts[0][1]) > 8;
  });
  if (skewed.length) {
    notes.push(`${suiteName}: ${skewed.length} non-horizontal message arrow(s)`);
  }
  return notes;
}

const suites = {
  'vault-arch': () => {
    clearAllLocal();
    // Surfaces: AI/MCP entry | config/docs | vault/infra
    batchCreateElementsLocal([
      make({
        id: 'surf-entry', type: 'rectangle', x: 40, y: 40, width: 1100, height: 180,
        backgroundColor: CT.surfMid.fill, strokeColor: CT.surfMid.stroke, strokeWidth: 1,
      }),
      make({
        id: 'surf-config', type: 'rectangle', x: 40, y: 240, width: 1100, height: 160,
        backgroundColor: CT.surfLight.fill, strokeColor: CT.surfLight.stroke, strokeWidth: 1,
      }),
      make({
        id: 'surf-infra', type: 'rectangle', x: 40, y: 420, width: 1100, height: 180,
        backgroundColor: CT.surfWarm.fill, strokeColor: CT.surfWarm.stroke, strokeWidth: 1,
      }),
      make({
        id: 'n-cursor', type: 'rectangle', x: 80, y: 80, width: 180, height: 80,
        text: 'Cursor/Claude', backgroundColor: CT.nodePrimary.fill, strokeColor: CT.nodePrimary.stroke,
        roundness: { type: 3 },
      }),
      make({
        id: 'n-mcp', type: 'rectangle', x: 360, y: 80, width: 200, height: 80,
        text: 'excalidraw-ai', backgroundColor: CT.nodePrimary.fill, strokeColor: CT.nodePrimary.stroke,
      }),
      make({
        id: 'n-mcpjson', type: 'rectangle', x: 80, y: 280, width: 200, height: 70,
        text: '.mcp.json', backgroundColor: CT.nodeHighlight.fill, strokeColor: CT.nodeHighlight.stroke,
      }),
      make({
        id: 'n-docs', type: 'rectangle', x: 360, y: 280, width: 220, height: 70,
        text: 'DOCS_* / CLAUDE.md', backgroundColor: CT.nodeMuted.fill, strokeColor: CT.nodeMuted.stroke,
      }),
      make({
        id: 'n-dist', type: 'rectangle', x: 80, y: 460, width: 180, height: 80,
        text: 'dist/index.js', backgroundColor: CT.nodeAccent.fill, strokeColor: CT.nodeAccent.stroke,
      }),
      make({
        id: 'n-export', type: 'rectangle', x: 320, y: 460, width: 240, height: 80,
        text: 'EXCALIDRAW_EXPORT_DIR', backgroundColor: CT.nodeAccent.fill, strokeColor: CT.nodeAccent.stroke,
      }),
      make({
        id: 'n-staging', type: 'rectangle', x: 620, y: 460, width: 220, height: 80,
        text: '暂存/插件开发测试', backgroundColor: CT.nodeAccent.fill, strokeColor: CT.nodeAccent.stroke,
      }),
      make({
        id: 'n-archive', type: 'rectangle', x: 680, y: 280, width: 180, height: 70,
        text: 'archive/', backgroundColor: CT.nodeMuted.fill, strokeColor: CT.nodeMuted.stroke,
      }),
    ]);

    bindArrows([
      {
        startElementId: 'n-cursor', endElementId: 'n-mcp', text: 'stdio MCP',
        strokeStyle: CT.arrowSolid.style, strokeColor: CT.arrowSolid.stroke,
      },
      {
        startElementId: 'n-mcpjson', endElementId: 'n-mcp', text: 'spawn',
        strokeStyle: CT.arrowDashed.style, strokeColor: CT.arrowDashed.stroke,
      },
      {
        startElementId: 'n-mcp', endElementId: 'n-dist', text: 'load',
        strokeStyle: CT.arrowDashed.style, strokeColor: CT.arrowDashed.stroke,
      },
      {
        startElementId: 'n-mcp', endElementId: 'n-export', text: 'export.md',
        strokeStyle: CT.arrowDotted.style, strokeColor: CT.arrowDotted.stroke,
      },
      {
        startElementId: 'n-export', endElementId: 'n-staging', text: 'wip-vault-*',
        strokeStyle: CT.arrowSolid.style, strokeColor: CT.arrowSolid.stroke,
      },
      {
        startElementId: 'n-docs', endElementId: 'n-archive', text: '非待办',
        strokeStyle: CT.arrowDotted.style, strokeColor: CT.arrowDotted.stroke,
      },
    ]);

    const shapes = Array.from(elements.values()).filter(e => e.type === 'rectangle');
    const surfaces = shapes.filter(s => !s.label?.text && (s.width || 0) >= 400);
    if (surfaces.length < 2) throw new Error(`Need ≥2 surfaces, got ${surfaces.length}`);
    const labeled = shapes.filter(s => s.label?.text);
    if (labeled.length < 5) throw new Error(`Need ≥5 labeled nodes, got ${labeled.length}`);

    const arrows = Array.from(elements.values()).filter(e => e.type === 'arrow');
    const styles = new Set(arrows.map(a => a.strokeStyle || 'solid'));
    for (const need of ['solid', 'dashed', 'dotted']) {
      if (!styles.has(need)) throw new Error(`Need ${need} arrows, got ${[...styles].join(',')}`);
    }

    assertTexts([
      'Cursor/Claude', 'excalidraw-ai', '.mcp.json', 'DOCS_* / CLAUDE.md',
      'dist/index.js', 'EXCALIDRAW_EXPORT_DIR', '暂存/插件开发测试', 'archive/',
    ]);
    assertChecklistClean('vault-arch');
    const out = exportScene('wip-vault-architecture.excalidraw.md');
    console.log(`OK vault-arch → ${out.safePath} (${out.count} elements, ${labeled.length} nodes)`);
    return { notes: collectPainNotes('vault-arch') };
  },

  'vault-seq': () => {
    clearAllLocal();
    // DOCS_BUILD_RUN 出图写法: guide → batch_create → bind_arrows → export
    const participants = [
      { id: 'p-ai', x: 60, label: 'AI Agent', fill: SEQ.client.fill, stroke: SEQ.client.stroke },
      { id: 'p-mcp', x: 320, label: 'MCP server', fill: SEQ.service.fill, stroke: SEQ.service.stroke },
      { id: 'p-vault', x: 580, label: 'Obsidian vault', fill: SEQ.infra.fill, stroke: SEQ.infra.stroke },
    ];
    const boxH = 50;
    const boxW = 150;
    const lifeTop = 90;
    const lifeBottom = 480;
    const actTop = 120;
    const actH = 300;
    const actW = 14;

    const shapes = [];
    for (const p of participants) {
      shapes.push(make({
        id: p.id, type: 'rectangle', x: p.x, y: 20, width: boxW, height: boxH,
        text: p.label, backgroundColor: p.fill, strokeColor: p.stroke, fontSize: 16,
      }));
      const cx = p.x + boxW / 2;
      shapes.push(make({
        id: `${p.id}-life`, type: 'line', x: cx, y: lifeTop,
        strokeStyle: 'dashed', strokeColor: SEQ.lifeline.stroke, strokeWidth: 2,
        points: [[0, 0], [0, lifeBottom - lifeTop]],
      }));
      shapes.push(make({
        id: `${p.id}-act`, type: 'rectangle',
        x: cx - actW / 2, y: actTop, width: actW, height: actH,
        backgroundColor: SEQ.activation.fill, strokeColor: SEQ.activation.stroke, strokeWidth: 1,
      }));
    }
    batchCreateElementsLocal(shapes);

    bindArrows([
      {
        startElementId: 'p-ai-act', endElementId: 'p-mcp-act', text: 'read_diagram_guide',
        strokeStyle: SEQ.sync.style, strokeColor: SEQ.sync.stroke,
      },
      {
        startElementId: 'p-ai-act', endElementId: 'p-mcp-act', text: 'batch_create',
        strokeStyle: SEQ.sync.style, strokeColor: SEQ.sync.stroke,
      },
      {
        startElementId: 'p-ai-act', endElementId: 'p-mcp-act', text: 'bind_arrows',
        strokeStyle: SEQ.sync.style, strokeColor: SEQ.sync.stroke,
      },
      {
        startElementId: 'p-mcp-act', endElementId: 'p-vault-act', text: 'export_to_obsidian',
        strokeStyle: SEQ.sync.style, strokeColor: SEQ.sync.stroke,
      },
      {
        startElementId: 'p-vault-act', endElementId: 'p-mcp-act', text: 'file written',
        strokeStyle: SEQ.ret.style, strokeColor: SEQ.ret.stroke,
      },
      {
        startElementId: 'p-mcp-act', endElementId: 'p-ai-act', text: 'ok',
        strokeStyle: SEQ.ret.style, strokeColor: SEQ.ret.stroke,
      },
    ]);

    const lines = Array.from(elements.values()).filter(e => e.type === 'line');
    if (lines.length < 3) throw new Error(`Need ≥3 lifelines, got ${lines.length}`);
    const acts = Array.from(elements.values()).filter(
      e => e.type === 'rectangle' && (e.width || 0) <= 40 && (e.height || 0) >= 2 * (e.width || 1)
    );
    if (acts.length < 3) throw new Error(`Need ≥3 activation bars, got ${acts.length}`);

    assertTexts([
      'AI Agent', 'MCP server', 'Obsidian vault',
      'read_diagram_guide', 'batch_create', 'bind_arrows', 'export_to_obsidian',
    ]);
    assertBidirectionalSeparated('p-mcp-act', 'p-vault-act');
    assertBidirectionalSeparated('p-ai-act', 'p-mcp-act');
    assertChecklistClean('vault-seq');

    const out = exportScene('wip-vault-sequence.excalidraw.md');
    console.log(`OK vault-seq → ${out.safePath} (${out.count} elements)`);
    return { notes: collectPainNotes('vault-seq') };
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
const allNotes = [];
for (const name of names) {
  const fn = suites[name];
  if (!fn) {
    console.error(`Unknown suite: ${name}`);
    failed++;
    continue;
  }
  try {
    const meta = fn() || {};
    if (meta.notes?.length) allNotes.push(...meta.notes);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}:`, err.message || err);
  }
}

const painPath = path.join(STAGING_ABS, 'VAULT_PAIN_LOG.md');
const painBody = allNotes.length
  ? allNotes.map(n => `- ${n}`).join('\n')
  : '- 无（脚本 assert + checklist 干净；架构斜线属预期，不记为痛点）';
fs.writeFileSync(
  painPath,
  `# Vault semantic soak — 痛点清单\n\n${new Date().toISOString()}\n\n## 观察\n\n${painBody}\n\n## V3 分流\n\n- 随意 hex / 时序倾斜 / 漏 surface：有证据才改 checklist 或模板\n- 本轮若上表为「无」→ 仅文档收尾\n`,
  'utf-8',
);
console.log(`Pain log → ${painPath}`);

if (failed) {
  console.error(`\n${failed} suite(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${names.length} vault soak suite(s) passed.\n  ${STAGING_ABS}`);
