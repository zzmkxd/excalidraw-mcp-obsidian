import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { EXCALIDRAW_ELEMENT_TYPES } from '../types.js';

export const tools: Tool[] = [
  {
    name: 'create_element',
    description: 'Create a new Excalidraw element. ⚠️ BEFORE using this tool, call read_diagram_guide(template="...") to get design rules (colors, shapes, line types, anti-patterns). For arrows, use startElementId/endElementId to bind to shapes (auto-routes to edges).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Custom element ID (optional, auto-generated if omitted). Use with startElementId/endElementId in batch_create_elements.' },
        type: { type: 'string', enum: Object.values(EXCALIDRAW_ELEMENT_TYPES) },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        backgroundColor: { type: 'string' },
        strokeColor: { type: 'string' },
        strokeWidth: { type: 'number' },
        strokeStyle: { type: 'string', description: 'Stroke style: solid, dashed, dotted' },
        roughness: { type: 'number' },
        opacity: { type: 'number' },
        text: { type: 'string' },
        fontSize: { type: 'number' },
        fontFamily: { type: ['string', 'number'], description: 'Font family: virgil/hand/handwritten (1), helvetica/sans/sans-serif (2), cascadia/mono/monospace (3), excalifont (5), nunito (6), lilita/lilita one (7), comic shanns/comic (8), or numeric ID' },
        startElementId: { type: 'string', description: 'For arrows: ID of the element to bind the arrow start to. Arrow auto-routes to element edge.' },
        endElementId: { type: 'string', description: 'For arrows: ID of the element to bind the arrow end to. Arrow auto-routes to element edge.' },
        endArrowhead: { type: 'string', description: 'Arrowhead style at end: arrow, bar, dot, triangle, or null' },
        startArrowhead: { type: 'string', description: 'Arrowhead style at start: arrow, bar, dot, triangle, or null' }
      },
      required: ['type', 'x', 'y']
    }
  },
  {
    name: 'update_element',
    description: 'Update an existing Excalidraw element',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string', enum: Object.values(EXCALIDRAW_ELEMENT_TYPES) },
        x: { type: 'number' }, y: { type: 'number' },
        width: { type: 'number' }, height: { type: 'number' },
        backgroundColor: { type: 'string' }, strokeColor: { type: 'string' },
        strokeWidth: { type: 'number' }, strokeStyle: { type: 'string' },
        roughness: { type: 'number' }, opacity: { type: 'number' },
        text: { type: 'string' }, fontSize: { type: 'number' },
        fontFamily: { type: ['string', 'number'] }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_element',
    description: 'Delete an Excalidraw element',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
  },
  {
    name: 'query_elements',
    description: 'Query Excalidraw elements with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: Object.values(EXCALIDRAW_ELEMENT_TYPES) },
        filter: { type: 'object', additionalProperties: true },
        bbox: { type: 'object', description: 'Bounding box filter', properties: { x_min: { type: 'number' }, x_max: { type: 'number' }, y_min: { type: 'number' }, y_max: { type: 'number' } } }
      }
    }
  },
  {
    name: 'get_resource',
    description: 'Get an Excalidraw resource',
    inputSchema: { type: 'object', properties: { resource: { type: 'string', enum: ['scene', 'library', 'theme', 'elements'] } }, required: ['resource'] }
  },
  {
    name: 'group_elements',
    description: 'Group multiple elements together',
    inputSchema: { type: 'object', properties: { elementIds: { type: 'array', items: { type: 'string' } } }, required: ['elementIds'] }
  },
  {
    name: 'ungroup_elements',
    description: 'Ungroup a group of elements',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string' } }, required: ['groupId'] }
  },
  {
    name: 'align_elements',
    description: 'Align elements to a specific position',
    inputSchema: { type: 'object', properties: { elementIds: { type: 'array', items: { type: 'string' } }, alignment: { type: 'string', enum: ['left', 'center', 'right', 'top', 'middle', 'bottom'] } }, required: ['elementIds', 'alignment'] }
  },
  {
    name: 'distribute_elements',
    description: 'Distribute elements evenly',
    inputSchema: { type: 'object', properties: { elementIds: { type: 'array', items: { type: 'string' } }, direction: { type: 'string', enum: ['horizontal', 'vertical'] } }, required: ['elementIds', 'direction'] }
  },
  {
    name: 'lock_elements',
    description: 'Lock elements to prevent modification',
    inputSchema: { type: 'object', properties: { elementIds: { type: 'array', items: { type: 'string' } } }, required: ['elementIds'] }
  },
  {
    name: 'unlock_elements',
    description: 'Unlock elements to allow modification',
    inputSchema: { type: 'object', properties: { elementIds: { type: 'array', items: { type: 'string' } } }, required: ['elementIds'] }
  },
  {
    name: 'create_from_mermaid',
    description: '[MCP-only unavailable] Mermaid conversion needs a browser DOM. Use batch_create_elements + bind_arrows instead.',
    inputSchema: {
      type: 'object',
      properties: {
        mermaidDiagram: { type: 'string', description: 'The Mermaid diagram definition (e.g., "graph TD; A-->B; B-->C;")' },
        config: { type: 'object', properties: { startOnLoad: { type: 'boolean' }, flowchart: { type: 'object', properties: { curve: { type: 'string', enum: ['linear', 'basis'] } } }, themeVariables: { type: 'object', properties: { fontSize: { type: 'string' } } }, maxEdges: { type: 'number' }, maxTextSize: { type: 'number' } } }
      },
      required: ['mermaidDiagram']
    }
  },
  {
    name: 'batch_create_elements',
    description: 'Create multiple Excalidraw elements at once. ⚠️ BEFORE using this tool, call read_diagram_guide(template="...") to get design rules (colors, shapes, line types, anti-patterns).',
    inputSchema: {
      type: 'object',
      properties: {
        elements: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string', enum: Object.values(EXCALIDRAW_ELEMENT_TYPES) }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' }, backgroundColor: { type: 'string' }, strokeColor: { type: 'string' }, strokeWidth: { type: 'number' }, strokeStyle: { type: 'string' }, roughness: { type: 'number' }, opacity: { type: 'number' }, text: { type: 'string' }, fontSize: { type: 'number' }, fontFamily: { type: ['string', 'number'] }, startElementId: { type: 'string' }, endElementId: { type: 'string' }, endArrowhead: { type: 'string' }, startArrowhead: { type: 'string' } }, required: ['type', 'x', 'y'] } }
      },
      required: ['elements']
    }
  },
  {
    name: 'bind_arrows',
    description: 'Bind arrows to shapes using actual rendered dimensions for precise edge-to-edge connections. Call this AFTER batch_create_elements (shapes only) — the shapes must be created first so the server can read their actual rendered sizes before computing arrow edge points. Each arrow needs startElementId/endElementId referencing existing shape IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        arrows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Custom arrow ID (optional, auto-generated if omitted)' },
              type: { type: 'string', description: 'Element type: "arrow" (default, with arrowhead) or "line" (no arrowheads, for org chart connectors)' },
              startElementId: { type: 'string', description: 'ID of the shape the arrow starts from' },
              endElementId: { type: 'string', description: 'ID of the shape the arrow ends at' },
              text: { type: 'string', description: 'Optional label on the arrow' },
              strokeColor: { type: 'string', description: 'Arrow line color (default: #495057)' },
              strokeStyle: { type: 'string', description: 'solid, dashed, or dotted' },
              strokeWidth: { type: 'number', description: 'Line width (default: 2)' },
              endArrowhead: { type: 'string', description: 'Arrowhead style: arrow, bar, dot, triangle, or null' },
              startArrowhead: { type: 'string', description: 'Arrowhead style at start (usually null)' },
              gap: { type: 'number', description: 'Offset along the element edge for spreading parallel arrows (clockwise convention). Start edge uses +gap, end edge uses -gap to create parallel offset.' },
              labelOffset: { type: 'number', description: 'Position of the label along the arrow path: 0.0 = start, 0.5 = midpoint (default), 1.0 = end. Use to prevent label overlap on parallel arrows.' },
              snap: { type: 'boolean', description: 'Snap arrow endpoints to nearest cardinal edge midpoint (default: true). Set false when 3+ arrows connect the same pair of elements to avoid overlapping at the same midpoint.' }
            },
            required: ['startElementId', 'endElementId']
          }
        }
      },
      required: ['arrows']
    }
  },
  {
    name: 'get_element',
    description: 'Get a single Excalidraw element by ID',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
  },
  {
    name: 'clear_canvas',
    description: 'Clear all elements from the canvas',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'export_scene',
    description: 'Export the current canvas to .excalidraw JSON format.',
    inputSchema: { type: 'object', properties: { filePath: { type: 'string' } } }
  },
  {
    name: 'import_scene',
    description: 'Import elements from a .excalidraw JSON file or raw JSON data',
    inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, data: { type: 'string' }, mode: { type: 'string', enum: ['replace', 'merge'] } }, required: ['mode'] }
  },
  {
    name: 'export_to_image',
    description: '[MCP-only unavailable] PNG/SVG rendering needs a browser canvas. Use export_to_obsidian or export_scene instead.',
    inputSchema: { type: 'object', properties: { format: { type: 'string', enum: ['png', 'svg'] }, filePath: { type: 'string' }, background: { type: 'boolean' } }, required: ['format'] }
  },
  {
    name: 'duplicate_elements',
    description: 'Duplicate elements with a configurable offset',
    inputSchema: { type: 'object', properties: { elementIds: { type: 'array', items: { type: 'string' } }, offsetX: { type: 'number' }, offsetY: { type: 'number' } }, required: ['elementIds'] }
  },
  {
    name: 'snapshot_scene',
    description: 'Save a named snapshot of the current canvas state',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
  },
  {
    name: 'restore_snapshot',
    description: 'Restore the canvas from a previously saved named snapshot',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
  },
  {
    name: 'describe_scene',
    description: 'Get an AI-readable description of the current canvas',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_canvas_screenshot',
    description: '[MCP-only unavailable] Screenshots need a browser canvas. Use describe_scene or export_to_obsidian + Obsidian preview.',
    inputSchema: { type: 'object', properties: { background: { type: 'boolean' } } }
  },
  {
    name: 'set_canvas_font',
    description: 'Set the global font for ALL elements on the canvas. Updates every existing element immediately and persists as the default for new elements. Excalifont (5) = hand-drawn, Helvetica (2) = clean standard, Virgil (1) = classic sketch.',
    inputSchema: {
      type: 'object',
      properties: {
        fontFamily: { type: 'number', description: 'Font family: 1=Virgil (classic sketch), 2=Helvetica (clean), 3=Cascadia (mono), 5=Excalifont (hand-drawn), 6=Nunito, 7=Lilita, 8=Comic' }
      },
      required: ['fontFamily']
    }
  },
  {
    name: 'list_style_presets',
    description: 'List all available style presets. Style presets define color palettes, shape defaults, and layout rules for specific diagram types.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'apply_style_preset',
    description: 'Apply a style preset to the canvas. Sets defaults (font, colors, roundness) for future element creation. Optionally updates all existing elements to match the preset.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the preset to apply (e.g., "clean-tech")' },
        applyToExisting: { type: 'boolean', description: 'If true, also update all existing elements to match the preset defaults' }
      },
      required: ['name']
    }
  },
  {
    name: 'lookup_style_tokens',
    description: 'Resolve style preset token roles to hex colors for batch_create_elements. Accepts JSON paths (nodes.accent) or template shorthand (node:accent, surface:mid, arrow:muted). Defaults to activePreset from apply_style_preset, else clean-tech.',
    inputSchema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Token roles, e.g. ["nodes.accent", "node:activation", "arrow:return", "surfaces.mid"]'
        },
        preset: { type: 'string', description: 'Preset name (optional; default: activePreset or clean-tech)' }
      },
      required: ['roles']
    }
  },
  {
    name: 'read_diagram_guide',
    description: 'Returns a comprehensive design guide for creating beautiful Excalidraw diagrams. Available templates: base (general rules), flowchart, architecture-diagram, er-diagram, sequence-diagram, mind-map, org-chart, data-flow-diagram. Call this BEFORE any create_element or batch_create_elements call.',
    inputSchema: { type: 'object', properties: { template: { type: 'string' } } }
  },
  {
    name: 'export_to_excalidraw_url',
    description: 'Export the current canvas to a shareable excalidraw.com URL.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'set_viewport',
    description: '[MCP-only unavailable] Viewport changes are not applied without a frontend canvas.',
    inputSchema: { type: 'object', properties: { scrollToContent: { type: 'boolean' }, scrollToElementId: { type: 'string' }, zoom: { type: 'number' }, offsetX: { type: 'number' }, offsetY: { type: 'number' } } }
  },
  {
    name: 'get_selection',
    description:
      'Read the Obsidian selection bridge file written by the "AI Edit Selected" EA script (.ai-selection.json). Returns a summary of selected elements (ids, type, text, bounds) and optional instruction. Pass fullJson=true for the raw payload.',
    inputSchema: {
      type: 'object',
      properties: {
        fullJson: { type: 'boolean', description: 'Include full JSON payload after the summary' },
      },
      required: [],
    },
  },
  {
    name: 'get_element_context',
    description: 'Get detailed context for a specific element by ID.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, radius: { type: 'number' } }, required: ['id'] }
  },
  {
    name: 'export_to_obsidian',
    description: 'Export the current canvas to an Obsidian-compatible .excalidraw.md file.',
    inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['filePath'] }
  },
  {
    name: 'import_from_obsidian',
    description: 'Import a diagram from an Obsidian .excalidraw.md file onto the canvas.',
    inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, mode: { type: 'string', enum: ['replace', 'merge'] } }, required: ['filePath', 'mode'] }
  }
];

/** Tools kept for dispatch/error messages but omitted from ListTools + server capabilities. */
export const HIDDEN_MCP_TOOLS = new Set([
  'create_from_mermaid',
  'export_to_image',
  'get_canvas_screenshot',
  'set_viewport',
]);

/** Tools advertised to MCP clients (capabilities + ListTools). */
export function getListedTools(): Tool[] {
  return tools.filter(t => !HIDDEN_MCP_TOOLS.has(t.name));
}
