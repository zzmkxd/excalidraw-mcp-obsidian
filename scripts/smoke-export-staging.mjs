#!/usr/bin/env node
/**
 * MCP-layer smoke: create diagrams with shape.text (no 3-phase workaround),
 * export .excalidraw.md into the Obsidian staging folder.
 *
 * Usage:
 *   node scripts/smoke-export-staging.mjs
 *   node scripts/smoke-export-staging.mjs shape-text
 *   node scripts/smoke-export-staging.mjs all
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// Must match .mcp.json EXCALIDRAW_EXPORT_DIR before importing modules that read it.
const EXPORT_DIR = process.env.EXCALIDRAW_EXPORT_DIR || 'E:/Learn_zone/Mark_down';
process.env.EXCALIDRAW_EXPORT_DIR = EXPORT_DIR;

const STAGING_REL = 'Ob_Responsity/Coding_Responsity/暂存/插件开发测试';
const STAGING_ABS = path.join(EXPORT_DIR, STAGING_REL);

const distImport = (rel) => import(pathToFileURL(path.join(repoRoot, rel)).href);

const {
  buildServerElement,
  convertTextToLabel,
} = await distImport('dist/utils/element-conversion.js');
const {
  batchCreateElementsLocal,
  clearAllLocal,
  updateElementLocal,
} = await distImport('dist/tools/local-crud.js');
const { elements, generateId } = await distImport('dist/types.js');
const { sanitizeFilePath } = await distImport('dist/utils/file-path.js');
const { buildExcalidrawMd } = await distImport('dist/utils/lzstring-bridge.js');
const { resolveArrowBindings } = await distImport('dist/arrow-utils.js');

function exportScene(fileName) {
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
  const md = buildExcalidrawMd(JSON.stringify(scene, null, 2), ['excalidraw', 'smoke']);
  fs.writeFileSync(safePath, md, 'utf-8');
  return { safePath, count: allElements.length, texts: allElements.filter(e => e.type === 'text') };
}

function assertShapeTexts(result, expectedLabels) {
  const textSet = new Set(result.texts.map(t => t.text));
  for (const label of expectedLabels) {
    if (!textSet.has(label)) {
      throw new Error(`Missing bound text "${label}". Found: ${[...textSet].join(', ')}`);
    }
  }
  // Expected labels (shape/arrow) must be bound; standalone text may omit containerId
  for (const t of result.texts) {
    if (expectedLabels.includes(t.text) && !t.containerId) {
      throw new Error(`Text "${t.text}" missing containerId`);
    }
  }
}

function makeShape(data) {
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
      strokeColor: '#495057',
      strokeWidth: 2,
      roughness: 0,
      fontSize: 16,
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

const suites = {
  'shape-text': () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 'r1', type: 'rectangle', x: 40, y: 40, width: 160, height: 80, text: '服务A', backgroundColor: '#e7f5ff' }),
      makeShape({ id: 'd1', type: 'diamond', x: 280, y: 30, width: 120, height: 100, text: '判断', backgroundColor: '#fff3bf' }),
      makeShape({ id: 'e1', type: 'ellipse', x: 480, y: 50, width: 140, height: 70, text: '起止', backgroundColor: '#d3f9d8' }),
    ]);
    bindArrows([
      { id: 'a1', startElementId: 'r1', endElementId: 'd1', text: '请求' },
      { id: 'a2', startElementId: 'd1', endElementId: 'e1', text: '通过' },
    ]);
    const result = exportScene('smoke-shape-text.excalidraw.md');
    assertShapeTexts(result, ['服务A', '判断', '起止', '请求', '通过']);
    console.log(`OK shape-text → ${result.safePath} (${result.count} elements, ${result.texts.length} texts)`);
  },

  architecture: () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 'gw', type: 'rectangle', x: 200, y: 20, width: 160, height: 60, text: 'API网关', backgroundColor: '#e7f5ff' }),
      makeShape({ id: 'svc', type: 'rectangle', x: 40, y: 140, width: 140, height: 70, text: '业务服务', backgroundColor: '#d0ebff' }),
      makeShape({ id: 'cache', type: 'rectangle', x: 220, y: 140, width: 120, height: 70, text: '缓存', backgroundColor: '#fff3bf' }),
      makeShape({ id: 'db', type: 'rectangle', x: 400, y: 140, width: 140, height: 70, text: '数据库', backgroundColor: '#d3f9d8' }),
    ]);
    bindArrows([
      { startElementId: 'gw', endElementId: 'svc', text: 'HTTP' },
      { startElementId: 'svc', endElementId: 'cache', text: '读' },
      { startElementId: 'svc', endElementId: 'db', text: '写' },
    ]);
    const result = exportScene('smoke-architecture.excalidraw.md');
    assertShapeTexts(result, ['API网关', '业务服务', '缓存', '数据库']);
    console.log(`OK architecture → ${result.safePath} (${result.count} elements)`);
  },

  'data-flow': () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 'src', type: 'ellipse', x: 40, y: 80, width: 100, height: 60, text: '数据源' }),
      makeShape({ id: 'proc', type: 'rectangle', x: 220, y: 70, width: 140, height: 80, text: '处理层' }),
      makeShape({ id: 'sink', type: 'ellipse', x: 440, y: 80, width: 100, height: 60, text: '存储' }),
    ]);
    bindArrows([
      { startElementId: 'src', endElementId: 'proc', text: 'raw' },
      { startElementId: 'proc', endElementId: 'sink', text: 'clean' },
    ]);
    const result = exportScene('smoke-data-flow.excalidraw.md');
    assertShapeTexts(result, ['数据源', '处理层', '存储']);
    console.log(`OK data-flow → ${result.safePath} (${result.count} elements)`);
  },

  er: () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 'user', type: 'rectangle', x: 40, y: 40, width: 160, height: 100, text: 'User\nid\nname' }),
      makeShape({ id: 'order', type: 'rectangle', x: 300, y: 40, width: 160, height: 100, text: 'Order\nid\nuser_id' }),
    ]);
    bindArrows([{ startElementId: 'user', endElementId: 'order', text: '1:N' }]);
    const result = exportScene('smoke-er.excalidraw.md');
    assertShapeTexts(result, ['User\nid\nname', 'Order\nid\nuser_id']);
    console.log(`OK er → ${result.safePath} (${result.count} elements)`);
  },

  'mind-map': () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 'root', type: 'ellipse', x: 220, y: 100, width: 140, height: 70, text: '主题', backgroundColor: '#e7f5ff' }),
      makeShape({ id: 'b1', type: 'rectangle', x: 40, y: 40, width: 120, height: 50, text: '分支A' }),
      makeShape({ id: 'b2', type: 'rectangle', x: 40, y: 180, width: 120, height: 50, text: '分支B' }),
      makeShape({ id: 'b3', type: 'rectangle', x: 440, y: 100, width: 120, height: 50, text: '分支C' }),
    ]);
    bindArrows([
      { startElementId: 'root', endElementId: 'b1' },
      { startElementId: 'root', endElementId: 'b2' },
      { startElementId: 'root', endElementId: 'b3' },
    ]);
    const result = exportScene('smoke-mind-map.excalidraw.md');
    assertShapeTexts(result, ['主题', '分支A', '分支B', '分支C']);
    console.log(`OK mind-map → ${result.safePath} (${result.count} elements)`);
  },

  'org-chart': () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 'ceo', type: 'rectangle', x: 200, y: 20, width: 140, height: 50, text: '总监' }),
      makeShape({ id: 'm1', type: 'rectangle', x: 60, y: 120, width: 120, height: 50, text: '研发' }),
      makeShape({ id: 'm2', type: 'rectangle', x: 360, y: 120, width: 120, height: 50, text: '产品' }),
    ]);
    bindArrows([
      { startElementId: 'ceo', endElementId: 'm1' },
      { startElementId: 'ceo', endElementId: 'm2' },
    ]);
    const result = exportScene('smoke-org-chart.excalidraw.md');
    assertShapeTexts(result, ['总监', '研发', '产品']);
    console.log(`OK org-chart → ${result.safePath} (${result.count} elements)`);
  },

  flowchart: () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 's', type: 'ellipse', x: 200, y: 20, width: 100, height: 50, text: '开始' }),
      makeShape({ id: 'p', type: 'rectangle', x: 180, y: 110, width: 140, height: 60, text: '处理' }),
      makeShape({ id: 'd', type: 'diamond', x: 190, y: 210, width: 120, height: 90, text: '通过?' }),
      makeShape({ id: 'e', type: 'ellipse', x: 200, y: 340, width: 100, height: 50, text: '结束' }),
    ]);
    bindArrows([
      { startElementId: 's', endElementId: 'p' },
      { startElementId: 'p', endElementId: 'd' },
      { startElementId: 'd', endElementId: 'e', text: '是' },
    ]);
    const result = exportScene('smoke-flowchart.excalidraw.md');
    assertShapeTexts(result, ['开始', '处理', '通过?', '结束']);
    console.log(`OK flowchart → ${result.safePath} (${result.count} elements)`);
  },

  sequence: () => {
    clearAllLocal();
    batchCreateElementsLocal([
      makeShape({ id: 'c', type: 'rectangle', x: 60, y: 20, width: 100, height: 40, text: '客户端' }),
      makeShape({ id: 'a', type: 'rectangle', x: 260, y: 20, width: 100, height: 40, text: 'API' }),
      makeShape({ id: 'd', type: 'rectangle', x: 460, y: 20, width: 100, height: 40, text: 'DB' }),
    ]);
    bindArrows([
      { startElementId: 'c', endElementId: 'a', text: '请求' },
      { startElementId: 'a', endElementId: 'd', text: '查询' },
      { startElementId: 'd', endElementId: 'a', text: '结果' },
      { startElementId: 'a', endElementId: 'c', text: '响应' },
    ]);
    const result = exportScene('smoke-sequence.excalidraw.md');
    assertShapeTexts(result, ['客户端', 'API', 'DB']);
    console.log(`OK sequence → ${result.safePath} (${result.count} elements)`);
  },

  /** H2: set_canvas_font coverage — rectangle/diamond/ellipse/text/arrow all get fontFamily */
  font: () => {
    clearAllLocal();
    const targetFont = 5;
    batchCreateElementsLocal([
      makeShape({ id: 'fr', type: 'rectangle', x: 40, y: 40, width: 140, height: 70, text: '矩形字', fontFamily: 2 }),
      makeShape({ id: 'fd', type: 'diamond', x: 220, y: 30, width: 120, height: 90, text: '菱形字', fontFamily: 2 }),
      makeShape({ id: 'fe', type: 'ellipse', x: 400, y: 45, width: 130, height: 70, text: '椭圆字', fontFamily: 2 }),
      makeShape({ id: 'ft', type: 'text', x: 40, y: 160, text: '独立文字', fontFamily: 2, fontSize: 16 }),
    ]);
    bindArrows([{ id: 'fa', startElementId: 'fr', endElementId: 'fd', text: '箭头字' }]);

    // Simulate set_canvas_font: update every element's fontFamily
    for (const [id, el] of elements) {
      if (el.fontFamily !== targetFont) {
        updateElementLocal({ id, fontFamily: targetFont });
      }
    }

    const result = exportScene('smoke-font.excalidraw.md');
    assertShapeTexts(result, ['矩形字', '菱形字', '椭圆字', '箭头字']);
    const wrong = Array.from(elements.values()).filter(
      el => el.fontFamily !== undefined && el.fontFamily !== targetFont
    );
    // Independent text element
    const standalone = Array.from(elements.values()).find(e => e.id === 'ft' || e.text === '独立文字');
    if (!standalone) throw new Error('standalone text missing');
    if (standalone.fontFamily !== targetFont) {
      throw new Error(`standalone text fontFamily=${standalone.fontFamily}, expected ${targetFont}`);
    }
    if (wrong.length) {
      throw new Error(`${wrong.length} elements still not fontFamily=${targetFont}`);
    }
    console.log(`OK font → ${result.safePath} (fontFamily=${targetFont} on ${result.count} elements)`);
  },
};

const arg = process.argv[2] || 'all';
const names = arg === 'all' ? Object.keys(suites) : [arg];

if (!fs.existsSync(path.join(repoRoot, 'dist/utils/element-conversion.js'))) {
  console.error('dist/ missing — run npm run build first');
  process.exit(1);
}

fs.mkdirSync(STAGING_ABS, { recursive: true });

let failed = 0;
for (const name of names) {
  const fn = suites[name];
  if (!fn) {
    console.error(`Unknown suite: ${name}. Available: ${Object.keys(suites).join(', ')}`);
    failed++;
    continue;
  }
  try {
    fn();
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}:`, err.message || err);
  }
}

if (failed) {
  console.error(`\n${failed} suite(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${names.length} suite(s) passed. Open files under:\n  ${STAGING_ABS}`);
