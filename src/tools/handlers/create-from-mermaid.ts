import { registerHandler } from '../router.js';
import type { HandlerContext } from '../context.js';
import logger from '../../utils/logger.js';

async function handle(_ctx: HandlerContext, _args: any) {
  logger.info('Mermaid conversion requested (not available in MCP-only mode)');
  return {
    content: [{ type: 'text', text: 'Mermaid-to-Excalidraw conversion requires a browser frontend canvas with DOM access. This feature is not available in MCP-only mode. Use create_element or batch_create_elements to draw diagrams programmatically, or use read_diagram_guide for design rules.' }],
    isError: true,
  };
}

registerHandler('create_from_mermaid', handle);
