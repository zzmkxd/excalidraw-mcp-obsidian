# excalidraw-mcp-obsidian

让 AI 编程助手**直接写出可在 Obsidian 里打开、拖拽编辑的 Excalidraw 图**——不依赖浏览器画布，也不把图锁在云端编辑器里。

[![CI](https://github.com/zzmkxd/excalidraw-mcp-obsidian/actions/workflows/ci.yml/badge.svg)](https://github.com/zzmkxd/excalidraw-mcp-obsidian/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 本仓库是 [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw) 的 **MCP-only 分叉**：去掉长期维护的 browser canvas / REST / WebSocket，专注 **stdio MCP + Obsidian 文件桥**。

<!-- 截图占位：放入 docs/images/hero-obsidian-diagram.png 后取消注释
![Obsidian 中打开的 Excalidraw 图](docs/images/hero-obsidian-diagram.png)
-->

---

## 这是什么 / 不是什么

| | 本仓库 | 常见替代 |
|---|--------|----------|
| **产物** | 本地 `.excalidraw.md`（Obsidian 原生格式） | 聊天里一张图 / PNG 链接 |
| **运行方式** | Node stdio MCP，按需拉起 | 常驻浏览器画布 + WebSocket |
| **改图** | `describe_scene` + `update_element`；可选 Obsidian 选中桥 | 截图闭环 / 整图重生成 |
| **风格** | preset + guide + checklist，令牌查表上色 | 各 SaaS 自带渲染器 |

**不做**：Mermaid DOM 转换、画布截图 MCP、REST API、内嵌 Claude（P6）。ListTools 已隐藏的废 tool 若被误调会返回说明文案。

---

## 5 分钟安装

### 环境

- Node.js **≥ 18**
- Obsidian + [Obsidian Excalidraw 插件](https://github.com/zsviczian/obsidian-excalidraw-plugin)（用于打开导出文件）

### 克隆与构建

```bash
git clone https://github.com/zzmkxd/excalidraw-mcp-obsidian.git
cd excalidraw-mcp-obsidian
npm ci
npm run build
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `EXCALIDRAW_EXPORT_DIR` | **必填**。导出路径必须落在此目录下（沙箱）。例：`E:/Notes` 或 `/home/you/vault-parent` |
| `NODE_DISABLE_COLORS` | 建议 `1`，避免 ANSI 污染 MCP JSON |
| `NO_COLOR` | 建议 `1` |

### 配置 MCP 客户端

**Cursor**（项目或全局 `.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "excalidraw-obsidian": {
      "type": "stdio",
      "command": "node",
      "args": ["/绝对路径/excalidraw-mcp-obsidian/dist/index.js"],
      "env": {
        "EXCALIDRAW_EXPORT_DIR": "/你的/导出父目录",
        "NODE_DISABLE_COLORS": "1",
        "NO_COLOR": "1"
      }
    }
  }
}
```

**Claude Desktop**（`claude_desktop_config.json`）结构相同，键名放在 `mcpServers` 下即可。

改源码后须 `npm run build`，并**重启客户端或新开 Agent 会话**才会加载新 `dist/`。

<!-- 截图占位：docs/images/mcp-connected.png
![MCP 已连接](docs/images/mcp-connected.png)
-->

---

## 第一次出图（推荐流程）

在 Agent 里用自然语言描述图即可；底层建议顺序如下。

### 1. 读设计指南

```
read_diagram_guide(template="architecture-diagram")
# 或 flowchart / sequence-diagram / er-diagram 等
```

### 2. 应用风格预设并查色

```
apply_style_preset(name="clean-tech")
lookup_style_tokens(roles=["node:accent", "surface:mid", "arrow:muted"])
```

API 需要 **hex**；勿随机写颜色，用 preset 令牌。

### 3. 批量建形状（文字写在形状上）

```
batch_create_elements(elements=[
  { "id": "svc-a", "type": "rectangle", "x": 100, "y": 80, "width": 160, "height": 56,
    "text": "服务 A", "backgroundColor": "#...", "strokeColor": "#..." },
  ...
])
```

形状上的 `text` 会生成 bound text，无需再拆「形状 + 独立文本」三阶段。

### 4. 绑定箭头

```
bind_arrows(arrows=[
  { "startElementId": "svc-a", "endElementId": "svc-b", "text": "HTTP" }
])
```

同节点对多条箭头会自动 `gap` 错开（STAGGER=10）；可显式写 `gap` / `snap` 覆盖。

### 5. 导出到 Obsidian

```
export_to_obsidian(
  filePath="你的库相对路径/某文件夹/demo.excalidraw.md"
)
```

路径必须在 `EXCALIDRAW_EXPORT_DIR` 之下。在 Obsidian 中打开该文件做**最终观感验收**。

```text
read_diagram_guide → apply_style_preset → lookup_style_tokens
  → batch_create_elements → bind_arrows → export_to_obsidian → Obsidian 目视
```

---

## 改图与局部编辑

### 全图定位

- `describe_scene` — 结构化场景描述（含 preset / checklist 提示）
- `query_elements` / `get_element` — 按 ID 查询

### Obsidian 选中桥（进阶）

1. 将 `scripts/obsidian/AI Edit Selected.md` 拷入 Obsidian Excalidraw **Scripts**，设热键（建议 Ctrl+Alt+E）
2. 在图中多选元素 → 运行脚本 → 查看 chip 梗概 → **确认传入**
3. 写入 vault 内 `暂存/.../.ai-selection.json`（路径随你的库结构配置）
4. Agent：`get_selection` →（有 `filePath` 时）`import_from_obsidian` → `update_element`

超过 30 分钟会标 `STALE`；Modal 可「清除传入」清磁盘桥接文件。

<!-- 截图占位：docs/images/ai-edit-selected.png -->

---

## MCP 工具一览（31 个）

| 类别 | 工具 |
|------|------|
| 创建 | `create_element`, `batch_create_elements`, `bind_arrows` |
| 读写 | `get_element`, `query_elements`, `update_element`, `delete_element`, `describe_scene`, `get_element_context` |
| 布局 | `align_elements`, `distribute_elements`, `group_elements`, `ungroup_elements`, `lock_elements`, `unlock_elements`, `duplicate_elements` |
| 场景 | `clear_canvas`, `snapshot_scene`, `restore_snapshot`, `get_resource` |
| 导入导出 | `export_scene`, `import_scene`, `export_to_obsidian`, `import_from_obsidian`, `export_to_excalidraw_url` |
| 风格 / 指南 | `read_diagram_guide`, `list_style_presets`, `apply_style_preset`, `lookup_style_tokens`, `set_canvas_font` |
| Obsidian | `get_selection` |

**未在 ListTools 展示**（MCP-only 不可用）：`create_from_mermaid`, `export_to_image`, `get_canvas_screenshot`, `set_viewport`。

---

## 开发与验收

```bash
npm test                 # 单元测试
npm run smoke:all        # 简化结构 QA（导出暂存 + 校验）
npm run soak:faithful    # 模板忠实压测（surface / 生命线 / 激活条）
npm run soak:vault       # 语义主题压测
npm run type-check
```

`smoke:all` 需要可写的 `EXCALIDRAW_EXPORT_DIR`；本地开发请指向你的测试目录。

---

## 目录结构

```text
src/
  index.ts              # MCP stdio 入口
  tools/handlers/       # 每个 tool 一个 handler
  templates/            # 图类型指南与 JSON preset
  utils/                # 元素转换、箭头、Obsidian 桥接等
scripts/
  obsidian/             # Obsidian EA 脚本（选中桥）
dist/                   # 构建产物（npm run build）
```

---

## 致谢与许可

- 上游：[yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw)（MIT）
- 官方聊天小部件：[excalidraw/excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp)（不同定位：对话内一次性出图）
- [Excalidraw](https://excalidraw.com) 手绘风格画布

[MIT License](LICENSE)

---

## 截图贡献

欢迎 PR 补充 `docs/images/` 教学截图，见 [docs/images/README.md](docs/images/README.md)。
