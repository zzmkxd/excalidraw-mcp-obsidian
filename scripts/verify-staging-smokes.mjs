#!/usr/bin/env node
/**
 * Structural acceptance for staging smoke exports (H1 checklist).
 * Validates Obsidian visual QA criteria without a GUI:
 * bound texts, Chinese, bindings, parallel-arrow separation, shape overlap.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LZ = require('lz-string');

const EXPORT_DIR = process.env.EXCALIDRAW_EXPORT_DIR || 'E:/Learn_zone/Mark_down';
const STAGING = path.join(EXPORT_DIR, 'Ob_Responsity/Coding_Responsity/暂存/插件开发测试');
const CJK = /[\u4e00-\u9fff]/;

const EXPECTED = {
  'smoke-flowchart.excalidraw.md': {
    texts: ['开始', '处理', '通过?', '结束'],
    minArrows: 2,
    needChinese: true,
  },
  'smoke-architecture.excalidraw.md': {
    texts: ['API网关', '业务服务', '缓存', '数据库'],
    minArrows: 3,
    needChinese: true,
  },
  'smoke-data-flow.excalidraw.md': {
    texts: ['数据源', '处理层', '存储'],
    minArrows: 2,
    needChinese: true,
  },
  'smoke-er.excalidraw.md': {
    texts: ['User\nid\nname', 'Order\nid\nuser_id'],
    minArrows: 1,
    needChinese: false,
  },
  'smoke-mind-map.excalidraw.md': {
    texts: ['主题', '分支A', '分支B', '分支C'],
    minArrows: 3,
    needChinese: true,
  },
  'smoke-org-chart.excalidraw.md': {
    texts: ['总监', '研发', '产品'],
    minArrows: 2,
    needChinese: true,
  },
  'smoke-sequence.excalidraw.md': {
    texts: ['客户端', 'API', 'DB'],
    minArrows: 4,
    needChinese: true,
  },
  'smoke-font.excalidraw.md': {
    texts: ['矩形字', '菱形字', '椭圆字', '箭头字'],
    minArrows: 1,
    needChinese: true,
    expectFontFamily: 5,
  },
};

function loadScene(filePath) {
  const md = fs.readFileSync(filePath, 'utf-8');
  const m = md.match(/```compressed-json\n([\s\S]*?)\n```/);
  if (!m) throw new Error('no compressed-json block');
  const json = LZ.decompressFromBase64(m[1].trim());
  if (!json) throw new Error('lz decompress failed');
  return JSON.parse(json);
}

function pairKey(a) {
  const s = a.startBinding?.elementId;
  const e = a.endBinding?.elementId;
  if (!s || !e) return null;
  return [s, e].sort().join(':');
}

function verifyFile(name, spec) {
  const filePath = path.join(STAGING, name);
  if (!fs.existsSync(filePath)) throw new Error(`missing file ${filePath}`);
  const scene = loadScene(filePath);
  const els = scene.elements || [];
  const texts = els.filter(e => e.type === 'text');
  const shapes = els.filter(e => ['rectangle', 'diamond', 'ellipse'].includes(e.type));
  const arrows = els.filter(e => e.type === 'arrow' || e.type === 'line');
  const textSet = new Set(texts.map(t => t.text));
  const errors = [];

  for (const t of spec.texts) {
    if (!textSet.has(t)) errors.push(`missing text "${t.replace(/\n/g, '\\n')}"`);
  }

  // Expected labels must be container-bound; standalone annotation text may omit containerId
  for (const t of texts) {
    if (spec.texts.includes(t.text) && !t.containerId) {
      errors.push(`text "${t.text}" missing containerId`);
    }
  }

  if (spec.needChinese) {
    const joined = texts.map(t => t.text).join('');
    if (!CJK.test(joined)) errors.push('no Chinese characters in any text');
  }

  for (const s of shapes) {
    const hasTextBind = s.boundElements?.some(b => b.type === 'text');
    if (s.label?.text && !hasTextBind) {
      errors.push(`shape ${s.id} has label but no bound text`);
    }
  }

  if (arrows.length < spec.minArrows) {
    errors.push(`expected >= ${spec.minArrows} arrows, got ${arrows.length}`);
  }

  for (const a of arrows) {
    if (!a.startBinding?.elementId || !a.endBinding?.elementId) {
      errors.push(`arrow ${a.id} missing start/end binding`);
    }
  }

  const byPair = new Map();
  for (const a of arrows) {
    const k = pairKey(a);
    if (!k) continue;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(a);
  }
  for (const [k, group] of byPair) {
    if (group.length < 2) continue;
    const uniqueY = new Set(group.map(a => Math.round(a.y)));
    if (uniqueY.size < 2) {
      errors.push(`pair ${k}: ${group.length} arrows still coincident (same y)`);
    }
  }

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i], b = shapes[j];
      const ax2 = a.x + (a.width || 0), ay2 = a.y + (a.height || 0);
      const bx2 = b.x + (b.width || 0), by2 = b.y + (b.height || 0);
      const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
      const area = overlapX * overlapY;
      const minArea = Math.min((a.width || 0) * (a.height || 0), (b.width || 0) * (b.height || 0));
      if (minArea > 0 && area / minArea > 0.5) {
        errors.push(`shapes ${a.id} and ${b.id} heavily overlap`);
      }
    }
  }

  if (spec.expectFontFamily !== undefined) {
    const typed = els.filter(e => e.fontFamily !== undefined && e.fontFamily !== null);
    const wrong = typed.filter(e => e.fontFamily !== spec.expectFontFamily);
    if (wrong.length) {
      errors.push(`${wrong.length} elements not fontFamily=${spec.expectFontFamily}`);
    }
    if (!typed.length) errors.push('no elements carry fontFamily');
  }

  return errors;
}

let failed = 0;
const results = [];
for (const [name, spec] of Object.entries(EXPECTED)) {
  try {
    const errors = verifyFile(name, spec);
    if (errors.length) {
      failed++;
      results.push({ name, ok: false, errors });
      console.error(`FAIL ${name}`);
      for (const e of errors) console.error(`  - ${e}`);
    } else {
      results.push({ name, ok: true });
      console.log(`OK   ${name}`);
    }
  } catch (err) {
    failed++;
    results.push({ name, ok: false, errors: [err.message] });
    console.error(`FAIL ${name}: ${err.message}`);
  }
}

const reportPath = path.join(STAGING, 'SMOKE_VERIFY_REPORT.md');
const lines = [
  '# Smoke structural verify report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '| File | Status |',
  '|------|--------|',
  ...results.map(r => `| ${r.name} | ${r.ok ? 'PASS' : 'FAIL'} |`),
  '',
];
if (failed) {
  lines.push('## Failures', '');
  for (const r of results.filter(x => !x.ok)) {
    lines.push(`### ${r.name}`, ...(r.errors || []).map(e => `- ${e}`), '');
  }
}
fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
console.log(`\nReport → ${reportPath}`);

if (failed) {
  console.error(`\n${failed} file(s) failed structural QA`);
  process.exit(1);
}
console.log(`\nAll ${results.length} smoke files passed structural QA (H1).`);
