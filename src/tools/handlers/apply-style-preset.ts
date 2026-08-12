import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { getPreset } from '../../templates/presets/index.js';
import { elements } from '../../types.js';
import { canvasConfig, saveConfig } from '../../config/canvas-config.js';
import logger from '../../utils/logger.js';

async function handle(ctx: HandlerContext, args: any) {
  const params = z.object({
    name: z.string(),
    applyToExisting: z.boolean().optional().default(false),
  }).parse(args);

  const preset = getPreset(params.name);
  logger.info('Applying style preset', { name: params.name, applyToExisting: params.applyToExisting });

  ctx.sceneState.activePresetName = preset.name;

  // Update scene defaults — sync to both canvasConfig (persistent) and sceneState (runtime)
  if (preset.defaults.fontFamily !== undefined) {
    ctx.sceneState.fontFamily = preset.defaults.fontFamily;
    canvasConfig.fontFamily = preset.defaults.fontFamily;
  }
  if (preset.defaults.fontSize !== undefined) {
    canvasConfig.fontSize = preset.defaults.fontSize;
  }
  saveConfig();

  let updatedCount = 0;
  if (params.applyToExisting) {
    for (const [id, el] of elements) {
      const updates: Record<string, any> = {};
      if (preset.defaults.fontFamily && el.fontFamily !== preset.defaults.fontFamily) {
        updates.fontFamily = preset.defaults.fontFamily;
      }
      if (preset.defaults.fontSize && el.fontSize !== preset.defaults.fontSize) {
        updates.fontSize = preset.defaults.fontSize;
      }
      if (Object.keys(updates).length > 0) {
        ctx.updateElementLocal({ id, ...updates });
        updatedCount++;
      }
    }
    logger.info('Applied preset to existing elements', { count: updatedCount });
  }

  return {
    content: [{
      type: 'text',
      text: [
        `风格预设 "${preset.label}" 已应用！`,
        '',
        `**后续新建元素的默认值：**`,
        `  fontFamily: ${preset.defaults.fontFamily}`,
        `  strokeColor: ${preset.defaults.strokeColor}`,
        `  roughness: ${preset.defaults.roughness}`,
        `  fontSize: ${preset.defaults.fontSize}`,
        '',
        params.applyToExisting ? `已更新 ${updatedCount} 个现有元素。` : '已有元素未变更（使用 applyToExisting: true 批量更新）。',
        '',
        ...(preset.surfaces ? ['**分区 (Surfaces):**', ...Object.entries(preset.surfaces).map(([k, c]) => `  ${k}: 填充 ${c.fill} / 描边 ${c.stroke}`), ''] : []),
        ...(preset.nodes ? ['**节点 (Nodes):**', ...Object.entries(preset.nodes).map(([k, c]) => `  ${k}: 填充 ${c.fill} / 描边 ${c.stroke}`), ''] : []),
        ...(preset.arrows ? ['**箭头 (Arrows):**', ...Object.entries(preset.arrows).map(([k, c]) => `  ${k}: ${c.strokeStyle} ${c.strokeColor}`), ''] : []),
        ...(!preset.surfaces && preset.palette ? ['**Palette (旧格式):**', ...Object.entries(preset.palette).map(([role, c]) => `  ${role}: 填充 ${(c as any).fill} / 描边 ${(c as any).stroke}`), ''] : []),
        '',
        ...(preset.name === 'clean-tech'
          ? [`使用 read_diagram_guide(template="Architecture Diagram") 查看分层布局规则。`]
          : preset.name === 'sequence-diagram'
            ? [`使用 read_diagram_guide(template="Sequence Diagram") 查看生命线与激活条规则。`]
            : [`使用 read_diagram_guide() 查看所有可用模板。`]),
      ].join('\n'),
    }],
  };
}

registerHandler('apply_style_preset', handle);
