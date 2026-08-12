import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import { z } from 'zod';
import { selectionState } from '../../server/store.js';
import {
  formatSelectionSummary,
  loadAiSelectionFromDisk,
} from '../../utils/obsidian-selection.js';

async function handle(_ctx: HandlerContext, args: any) {
  const params = z
    .object({
      fullJson: z.boolean().optional().default(false),
    })
    .parse(args ?? {});

  let payload;
  try {
    payload = loadAiSelectionFromDisk();
  } catch (err: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to read Obsidian selection file: ${err?.message || err}`,
        },
      ],
      isError: true,
    };
  }

  if (!payload) {
    return {
      content: [
        {
          type: 'text',
          text:
            'No Obsidian selection on disk. In Obsidian Excalidraw: select elements → run "AI Edit Selected" → review chips → 确认传入. ' +
            'That writes Ob_Responsity/Coding_Responsity/暂存/插件开发测试/.ai-selection.json for get_selection.',
        },
      ],
    };
  }

  selectionState.elements = payload.elements;
  selectionState.timestamp = payload.timestamp || null;
  selectionState.filePath = payload.filePath || null;

  return {
    content: [
      {
        type: 'text',
        text: formatSelectionSummary(payload, { fullJson: params.fullJson }),
      },
    ],
  };
}

registerHandler('get_selection', handle);
