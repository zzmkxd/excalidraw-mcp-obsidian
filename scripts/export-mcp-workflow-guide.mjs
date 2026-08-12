#!/usr/bin/env node
/**
 * Real-use export: MCP workflow guide flowchart for Obsidian staging.
 * Run: npm run build && node scripts/export-mcp-workflow-guide.mjs
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
const { getPreset } = await distImport('dist/templates/presets/index.js');

const preset = getPreset('clean-tech');
const C = {
  positive: preset.nodes.positive,
  primary: preset.nodes.primary,
  accent: preset.nodes.accent,
  highlight: preset.nodes.highlight,
  secondary: preset.nodes.secondary,
};

const CX = 200;
const W = 200;
const H = 64;
const GAP = 72;

function yRow(i) {
  return 90 + i * GAP;
}

function makeShape(data) {
  return buildServerElement(data, 2);
}

function bindArrows(defs) {
  const arrows = defs.map((d) => {
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
      strokeWidth: 2,
      strokeStyle: d.strokeStyle || 'solid',
      roughness: 0,
      fontSize: 14,
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

function exportScene(fileName) {
  fs.mkdirSync(STAGING_ABS, { recursive: true });
  const rel = `${STAGING_REL}/${fileName}`.replace(/\\/g, '/');
  const safePath = sanitizeFilePath(rel);
  const allElements = Array.from(elements.values());
  const elementIds = new Set(elements.keys());
  for (const el of allElements) {
    if (el.boundElements?.length) {
      el.boundElements = el.boundElements.filter((b) => elementIds.has(b.id));
      if (el.boundElements.length === 0) delete el.boundElements;
    }
  }
  const scene = {
    type: 'excalidraw',
    version: 2,
    elements: allElements,
    appState: { theme: 'light', viewBackgroundColor: '#ffffff' },
  };
  const md = buildExcalidrawMd(JSON.stringify(scene, null, 2), [
    'excalidraw',
    'mcp-workflow',
    'guide',
  ]);
  fs.writeFileSync(safePath, md, 'utf-8');
  return { safePath, count: allElements.length };
}

clearAllLocal();

batchCreateElementsLocal([
  makeShape({
    id: 'title',
    type: 'text',
    x: CX - 20,
    y: 24,
    width: 440,
    height: 36,
    text: 'excalidraw-mcp-obsidian 工作流',
    fontSize: 22,
    strokeColor: '#1e1e1e',
  }),
  makeShape({
    id: 'n0',
    type: 'rectangle',
    x: CX,
    y: yRow(0),
    width: W,
    height: H,
    text: '配置 MCP\nmcp.json + EXPORT_DIR',
    backgroundColor: C.positive.fill,
    strokeColor: C.positive.stroke,
    roundness: { type: 3 },
  }),
  makeShape({
    id: 'n1',
    type: 'rectangle',
    x: CX,
    y: yRow(1),
    width: W,
    height: H,
    text: 'read_diagram_guide\n选 flowchart',
    backgroundColor: C.primary.fill,
    strokeColor: C.primary.stroke,
  }),
  makeShape({
    id: 'n2',
    type: 'rectangle',
    x: CX,
    y: yRow(2),
    width: W,
    height: H,
    text: 'apply_style_preset\nlookup_style_tokens',
    backgroundColor: C.accent.fill,
    strokeColor: C.accent.stroke,
  }),
  makeShape({
    id: 'n3',
    type: 'rectangle',
    x: CX,
    y: yRow(3),
    width: W,
    height: H,
    text: 'batch_create_elements\n形状带 text',
    backgroundColor: C.primary.fill,
    strokeColor: C.primary.stroke,
  }),
  makeShape({
    id: 'n4',
    type: 'rectangle',
    x: CX,
    y: yRow(4),
    width: W,
    height: H,
    text: 'bind_arrows',
    backgroundColor: C.primary.fill,
    strokeColor: C.primary.stroke,
  }),
  makeShape({
    id: 'n5',
    type: 'rectangle',
    x: CX,
    y: yRow(5),
    width: W,
    height: H,
    text: 'export_to_obsidian',
    backgroundColor: C.accent.fill,
    strokeColor: C.accent.stroke,
  }),
  makeShape({
    id: 'd1',
    type: 'diamond',
    x: CX + 10,
    y: yRow(6) - 8,
    width: W - 20,
    height: H + 16,
    text: '满意?',
    backgroundColor: C.highlight.fill,
    strokeColor: C.highlight.stroke,
  }),
  makeShape({
    id: 'n6',
    type: 'rectangle',
    x: CX + 260,
    y: yRow(6) - 10,
    width: W,
    height: H,
    text: 'describe_scene\nupdate_element',
    backgroundColor: C.secondary.fill,
    strokeColor: C.secondary.stroke,
  }),
  makeShape({
    id: 'n7',
    type: 'rectangle',
    x: CX + 260,
    y: yRow(7),
    width: W,
    height: H,
    text: '选中桥\nget_selection → import',
    backgroundColor: C.secondary.fill,
    strokeColor: C.secondary.stroke,
  }),
  makeShape({
    id: 'end',
    type: 'ellipse',
    x: CX + 20,
    y: yRow(8),
    width: W - 40,
    height: 56,
    text: 'Obsidian 目视验收',
    backgroundColor: C.positive.fill,
    strokeColor: C.positive.stroke,
  }),
]);

bindArrows([
  { startElementId: 'n0', endElementId: 'n1' },
  { startElementId: 'n1', endElementId: 'n2' },
  { startElementId: 'n2', endElementId: 'n3' },
  { startElementId: 'n3', endElementId: 'n4' },
  { startElementId: 'n4', endElementId: 'n5' },
  { startElementId: 'n5', endElementId: 'd1' },
  { startElementId: 'd1', endElementId: 'end', text: '是' },
  {
    startElementId: 'd1',
    endElementId: 'n6',
    text: '否',
    strokeColor: C.highlight.stroke,
  },
  { startElementId: 'n6', endElementId: 'n7' },
  {
    startElementId: 'n7',
    endElementId: 'n5',
    text: '再 export',
    strokeStyle: 'dashed',
    strokeColor: '#ADB5BD',
  },
]);

const result = exportScene('wip-mcp-workflow-guide.excalidraw.md');
console.log(`OK mcp-workflow-guide → ${result.safePath} (${result.count} elements)`);
console.log('Open in Obsidian for visual QA; iterate with describe_scene / update if needed.');
