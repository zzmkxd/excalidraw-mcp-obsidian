# Excalidraw Skill Cheatsheet

## Defaults

- Canvas base URL: `EXPRESS_SERVER_URL` (default `http://127.0.0.1:3000`)
- Canvas health: `GET /health`

## MCP Tools (31 total)

### Element CRUD

| Tool | Description | Required params |
|------|-------------|-----------------|
| `create_element` | Create shape/text/arrow/line | `type`, `x`, `y` |
| `get_element` | Get single element by ID | `id` |
| `update_element` | Update element properties | `id` |
| `delete_element` | Delete element | `id` |
| `query_elements` | Query by type/filters | (optional) `type`, `filter` |
| `batch_create_elements` | Create many at once (Phase 1: shapes only) | `elements[]` |
| `duplicate_elements` | Clone with offset | `elementIds[]`, (optional) `offsetX`, `offsetY` |

### Layout & Organization

| Tool | Description | Required params |
|------|-------------|-----------------|
| `align_elements` | Align to left/center/right/top/middle/bottom | `elementIds[]`, `alignment` |
| `distribute_elements` | Even spacing horizontal/vertical | `elementIds[]`, `direction` |
| `group_elements` | Group elements | `elementIds[]` |
| `ungroup_elements` | Ungroup | `groupId` |
| `lock_elements` | Lock elements | `elementIds[]` |
| `unlock_elements` | Unlock elements | `elementIds[]` |

### Arrow Binding (Two-Phase Creation)

| Tool | Description | Required params |
|------|-------------|-----------------|
| `bind_arrows` | Bind arrows to shapes using their actual rendered sizes — Phase 2 of two-phase creation. Ensures gap=0 edge-to-edge connections for all shape types (especially diamonds). | `arrows[]` — each needs `startElementId`, `endElementId`, optional `text`, `strokeColor`, `strokeStyle`, `endArrowhead` |

### Style & Fonts

| Tool | Description | Required params |
|------|-------------|-----------------|
| `set_canvas_font` | Set global font for ALL elements. Updates existing elements immediately and persists to `.excalidraw-config.json`. Fonts: 1=Virgil (sketch), 2=Helvetica (clean), 3=Cascadia (mono), 5=Excalifont (hand-drawn) | `fontFamily` (number) |
| `list_style_presets` | List available style presets with name, label, description | (none) |
| `apply_style_preset` | Apply a style preset — sets canvas defaults (colors, roughness, font) for future elements. Pass `applyToExisting: true` to retroactively update all elements. | `name`, (optional) `applyToExisting` |

### Obsidian Integration

| Tool | Description | Required params |
|------|-------------|-----------------|
| `export_to_obsidian` | Export canvas to an Obsidian-compatible .excalidraw.md file | `filePath`, (optional) `tags[]` |
| `import_from_obsidian` | Import a diagram from an Obsidian .excalidraw.md file | `filePath`, `mode` ("replace"\|"merge") |

### Scene Awareness (Iterative Refinement)

| Tool | Description | Required params |
|------|-------------|-----------------|
| `describe_scene` | AI-readable scene description (types, positions, labels, connections, bounding box) | (none) |
| `get_canvas_screenshot` | Returns PNG image of canvas for visual verification | (optional) `background` |
| `get_resource` | Get scene/library/theme/elements | `resource` |

### File I/O & Export

| Tool | Description | Required params |
|------|-------------|-----------------|
| `export_scene` | Export to .excalidraw JSON | (optional) `filePath` |
| `import_scene` | Import from .excalidraw JSON | `mode` ("replace"\|"merge"), `filePath` or `data` |
| `export_to_image` | Export to PNG/SVG (needs browser) | `format` ("png"\|"svg"), (optional) `filePath`, `background` |
| `export_to_excalidraw_url` | Upload & get shareable excalidraw.com URL | (none) |

### State Management

| Tool | Description | Required params |
|------|-------------|-----------------|
| `clear_canvas` | Remove all elements | (none) |
| `snapshot_scene` | Save named snapshot | `name` |
| `restore_snapshot` | Restore from snapshot | `name` |

### Viewport & Camera

| Tool | Description | Required params |
|------|-------------|-----------------|
| `set_viewport` | Control camera: zoom-to-fit, center on element, manual zoom/scroll (needs browser) | (optional) `scrollToContent`, `scrollToElementId`, `zoom`, `offsetX`, `offsetY` |

### Design Guide

| Tool | Description | Required params |
|------|-------------|-----------------|
| `read_diagram_guide` | Get design best practices (colors, sizing, layout, anti-patterns) | (none) |

### Conversion

| Tool | Description | Required params |
|------|-------------|-----------------|
| `create_from_mermaid` | Mermaid diagram to Excalidraw | `mermaidDiagram` |

Notes:
- **MCP tools**: Set `text` field on shapes to label them (auto-converts to `label.text`). Use `startElementId`/`endElementId` on arrows.
- **REST API**: Use `"label": {"text": "..."}` for shape labels. Use `"start": {"id": "..."}` / `"end": {"id": "..."}` for arrow binding. (Different format from MCP!)
- `fontFamily` must be a string (e.g. `"1"`) or omit it entirely — do NOT pass a number.
- `points` accepts both `[[x,y]]` tuples and `[{x,y}]` objects.
- **Curved arrows**: Use `"roundness": {"type": 2}` with 3+ points for smooth curves. Use `"elbowed": true` for right-angle routing.
- Prefer creating shapes first, then arrows, then alignment/grouping.

## Canvas REST API (HTTP)

### Elements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/elements` | List all elements |
| `GET` | `/api/elements/:id` | Get element by ID |
| `POST` | `/api/elements` | Create element |
| `PUT` | `/api/elements/:id` | Update element |
| `DELETE` | `/api/elements/:id` | Delete element |
| `DELETE` | `/api/elements/clear` | Clear all elements |
| `GET` | `/api/elements/search?type=...` | Search with filters |
| `POST` | `/api/elements/batch` | Batch create |
| `POST` | `/api/elements/sync` | Overwrite import (clear + write) |
| `POST` | `/api/elements/from-mermaid` | Mermaid conversion via frontend |
| `POST` | `/api/elements/bind-arrows` | Two-phase arrow binding |

### Export & Obsidian

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/export/obsidian` | Export to Obsidian .excalidraw.md |
| `POST` | `/api/import/obsidian` | Import from Obsidian .excalidraw.md |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Get canvas config (fontFamily etc.) |
| `GET` | `/api/config/font` | Get current font setting |
| `PUT` | `/api/config/font` | Set font `{"fontFamily": 2}` |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/export/image` | Request image export (needs frontend) |
| `POST` | `/api/export/image/result` | Frontend posts export result back |

### Viewport

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/viewport` | Set viewport/camera (needs frontend) |
| `POST` | `/api/viewport/result` | Frontend posts viewport result back |

### Snapshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/snapshots` | Save snapshot `{name}` |
| `GET` | `/api/snapshots` | List snapshots |
| `GET` | `/api/snapshots/:name` | Get snapshot by name |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/sync/status` | Memory/WebSocket stats |

## Skill Scripts

All scripts accept `--url <canvasUrl>` (defaults to `EXPRESS_SERVER_URL`).

```bash
node scripts/healthcheck.cjs
node scripts/clear-canvas.cjs
node scripts/export-elements.cjs --out diagram.elements.json
node scripts/import-elements.cjs --in diagram.elements.json --mode batch|sync
node scripts/create-element.cjs --data '{...}'
node scripts/update-element.cjs --id <id> --data '{...}'
node scripts/delete-element.cjs --id <id>
```
