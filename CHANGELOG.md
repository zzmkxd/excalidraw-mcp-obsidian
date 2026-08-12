# Changelog

## 0.1.0 — 2026-08-12

Initial public release as **excalidraw-mcp-obsidian**.

- MCP-only stdio server (no browser canvas / REST / WebSocket)
- Export / import Obsidian `.excalidraw.md` files
- Style presets, diagram guides, `lookup_style_tokens`
- `batch_create_elements` + `bind_arrows` with parallel-arrow gap
- Obsidian selection bridge: EA script + `get_selection`
- Scene checklist warnings in `describe_scene`

Fork lineage: based on [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw), refactored for file-first Obsidian workflows.
