import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { elements } from '../../types.js';
import { runSceneChecklist } from '../../utils/scene-checklist.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, _args: any) {
  logger.info('Describing scene via MCP');

  const allElements = Array.from(elements.values());
  const presetLine = `activePresetName: ${ctx.sceneState.activePresetName ?? '(none)'}`;

  if (allElements.length === 0) {
    return {
      content: [{
        type: 'text',
        text: [
          'The canvas is empty. No elements to describe.',
          presetLine,
          '',
          '### Edit tips',
          'Create with batch_create_elements / bind_arrows; resolve colors via lookup_style_tokens.',
          'Final visual QA: export_to_obsidian and open in Obsidian (describe_scene is not a substitute).',
        ].join('\n'),
      }],
    };
  }

  const typeCounts: Record<string, number> = {};
  for (const el of allElements) typeCounts[el.type] = (typeCounts[el.type] || 0) + 1;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of allElements) {
    minX = Math.min(minX, el.x); minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width || 0)); maxY = Math.max(maxY, el.y + (el.height || 0));
  }

  const sorted = [...allElements].sort((a, b) => {
    const rowDiff = Math.floor(a.y / 50) - Math.floor(b.y / 50);
    return rowDiff !== 0 ? rowDiff : a.x - b.x;
  });

  const elementDescs = sorted.map(el => {
    const parts: string[] = [];
    parts.push(`[${el.id}] ${el.type}`);
    parts.push(`at (${Math.round(el.x)}, ${Math.round(el.y)})`);
    if (el.width || el.height) parts.push(`size ${Math.round(el.width || 0)}x${Math.round(el.height || 0)}`);
    if (el.text) parts.push(`text: "${el.text}"`);
    if (el.label?.text) parts.push(`label: "${el.label.text}"`);
    if (el.backgroundColor && el.backgroundColor !== 'transparent') parts.push(`bg: ${el.backgroundColor}`);
    if (el.strokeColor && el.strokeColor !== '#000000') parts.push(`stroke: ${el.strokeColor}`);
    if (el.locked) parts.push('(locked)');
    if (el.groupIds && el.groupIds.length > 0) parts.push(`groups: [${el.groupIds.join(', ')}]`);
    return `  ${parts.join(' | ')}`;
  });

  const arrows = allElements.filter((el: any) => el.type === 'arrow');
  const connectionDescs: string[] = [];
  for (const arrow of arrows) {
    const a = arrow as any;
    if (a.startBinding?.elementId || a.endBinding?.elementId) {
      connectionDescs.push(`  ${a.startBinding?.elementId || '?'} --> ${a.endBinding?.elementId || '?'} (arrow: ${arrow.id})`);
    }
  }

  const warnings = runSceneChecklist(allElements);

  const lines: string[] = [];
  lines.push('## Canvas Description');
  lines.push(presetLine);
  lines.push(`Total elements: ${allElements.length}`);
  lines.push(`Types: ${Object.entries(typeCounts).map(([t, c]) => `${t}(${c})`).join(', ')}`);
  lines.push(`Bounding box: (${Math.round(minX)}, ${Math.round(minY)}) to (${Math.round(maxX)}, ${Math.round(maxY)}) = ${Math.round(maxX - minX)}x${Math.round(maxY - minY)}`);
  lines.push('');
  lines.push('### Elements (top-to-bottom, left-to-right):');
  lines.push(...elementDescs);
  if (connectionDescs.length > 0) { lines.push(''); lines.push('### Connections:'); lines.push(...connectionDescs); }

  const grouped = allElements.filter((el: any) => el.groupIds?.length > 0);
  if (grouped.length > 0) {
    const groupMap: Record<string, string[]> = {};
    for (const el of grouped) {
      for (const gid of (el.groupIds || [])) {
        if (!groupMap[gid]) groupMap[gid] = [];
        groupMap[gid]!.push(el.id);
      }
    }
    lines.push(''); lines.push('### Groups:');
    for (const [gid, ids] of Object.entries(groupMap)) lines.push(`  Group ${gid}: [${ids.join(', ')}]`);
  }

  lines.push('');
  lines.push('### Checklist');
  if (warnings.length === 0) {
    lines.push('  (no warnings)');
  } else {
    for (const w of warnings) {
      lines.push(`  - [${w.code}] ${w.message}`);
    }
  }

  lines.push('');
  lines.push('### Edit tips');
  lines.push('  Use update_element / align_elements / distribute_elements to adjust geometry.');
  lines.push('  Re-run bind_arrows (with labelOffset if labels collide) after moving endpoints.');
  lines.push('  Final visual QA: export_to_obsidian and open in Obsidian — describe_scene is not a substitute.');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

registerHandler('describe_scene', handle);
