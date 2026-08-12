export { tools, getListedTools, HIDDEN_MCP_TOOLS } from './definitions.js';
export { dispatch, registerHandler } from './router.js';
export type { HandlerContext, ToolResult } from './context.js';
export {
  createElementLocal,
  updateElementLocal,
  deleteElementLocal,
  batchCreateElementsLocal,
  getElementLocal,
  clearAllLocal,
} from './local-crud.js';

// Import and register all handlers (side-effect)
import './handlers/create-element.js';
import './handlers/update-element.js';
import './handlers/delete-element.js';
import './handlers/query-elements.js';
import './handlers/get-resource.js';
import './handlers/group-elements.js';
import './handlers/ungroup-elements.js';
import './handlers/align-elements.js';
import './handlers/distribute-elements.js';
import './handlers/lock-elements.js';
import './handlers/unlock-elements.js';
import './handlers/create-from-mermaid.js';
import './handlers/batch-create-elements.js';
import './handlers/bind-arrows.js';
import './handlers/get-element.js';
import './handlers/clear-canvas.js';
import './handlers/export-scene.js';
import './handlers/import-scene.js';
import './handlers/export-to-image.js';
import './handlers/duplicate-elements.js';
import './handlers/snapshot-scene.js';
import './handlers/restore-snapshot.js';
import './handlers/describe-scene.js';
import './handlers/get-canvas-screenshot.js';
import './handlers/read-diagram-guide.js';
import './handlers/export-to-excalidraw-url.js';
import './handlers/set-viewport.js';
import './handlers/get-selection.js';
import './handlers/get-element-context.js';
import './handlers/export-to-obsidian.js';
import './handlers/import-from-obsidian.js';
import './handlers/set-canvas-font.js';
import './handlers/list-style-presets.js';
import './handlers/apply-style-preset.js';
import './handlers/lookup-style-tokens.js';
