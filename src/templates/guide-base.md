---
name: "General Design Guide"
description: "Universal Excalidraw design rules: standard color palette, visual hierarchy, line-type semantics, sizing, layout, and self-check checklist"
category: "general"
---

# Excalidraw Diagram Design Guide

All diagrams follow these universal rules. Per-template rules in `*.template.md` files extend — never override — this guide.

---

## Defaults (server-injected)

When AI doesn't specify these properties, the server injects the following defaults:

| Property       | Default      | Notes                        |
|----------------|--------------|------------------------------|
| `fontFamily`   | 2 (Helvetica) | Clean, professional sans-serif |
| `roughness`    | 0            | Sharp lines, no hand-drawn effect |
| `strokeColor`  | `#495057`    | Standard dark gray border    |
| `strokeWidth`  | 2            | Visible but not heavy        |
| `fontSize`     | 16           | Readable body text           |

AI can override any of these by passing an explicit value. If the AI sets `fontFamily: 1` (Virgil), that choice is respected — but omitting it gets Helvetica, not Virgil.

---

## Color Palette

Reference: Mermaid `neutral` theme and PlantUML defaults — low saturation, professional.

**MCP API note:** `batch_create_elements` accepts hex (`backgroundColor` / `strokeColor`), not token names. Resolve tokens first with `apply_style_preset` + `lookup_style_tokens` (supports `node:accent` or `nodes.accent`), then pass the returned hex into create calls. Do not invent random hex.

### Main fills (used on 70%+ of shapes)

```
主节点:     fill #FFFFFF / stroke #495057     (白底深灰边框 — 默认所有形状)
判定/分支:  fill #FFF3CD / stroke #856404     (淡黄 — PlantUML 经典决策色)
错误/异常:  fill #F8D7DA / stroke #721C24     (淡红 — 仅错误/失败/异常终止)
成功/完成:  fill #D4EDDA / stroke #155724     (淡绿 — 仅成功/健康/完成)
数据存储:   fill #D6EAF8 / stroke #1A5276     (淡蓝灰 — 数据库/文件/队列)
```

### Diminished fills (used on secondary or external elements)

```
外部/注释:  fill #EBEBEB / stroke #6C757D     (中灰 — 外部系统、脚注)
背景分区:   fill #F5F5F5 / stroke #CCCCCC     (极浅灰 — 泳道、区域分组)
```

### Lines

```
主连线:     strokeColor: #495057,  strokeWidth: 2     (默认)
强调连线:   strokeColor: #333333,  strokeWidth: 2.5   (关键路径高亮)
弱化连线:   strokeColor: #ADB5BD,  strokeWidth: 1.5   (辅助/弱关联)
```

### Usage rules

- **1 main color + 4 semantic colors**. A single diagram should never use all 5 semantic fills at once — most diagrams use 2–3.
- Semantic fills are for **exceptions**, not the norm. If more than 30% of shapes have a semantic fill, simplify.
- White (`#FFFFFF`) is the default fill for all normal process/service/entity nodes.
- Mermaid-rendered diagrams may retain their auto-generated colors as an exception — do not force this palette onto Mermaid output.
- Choose fill+stroke as a **pair**. Don't mix `#FFF3CD` fill with `#495057` stroke.

---

## Visual Hierarchy

**Shape and layout differentiate first. Color is supplementary.**

### Level 1 — Primary flow nodes
- White fill + 2px solid border + 16px font + rectangle or rounded-rectangle
- Covers 70%+ of shapes in a typical diagram

### Level 2 — Decision / branch nodes
- `#FFF3CD` fill + 2px solid border + 16px font + **diamond** shape
- Diamonds are visually distinct even without color

### Level 3 — Status nodes (error / success)
- `#F8D7DA` or `#D4EDDA` fill + 1.5px solid border + 14px caption font + rectangle
- Smaller font signals secondary importance; color reinforces semantics

### Level 4 — External / annotation
- `#EBEBEB` fill + 1px **dashed** border + 14px caption font + rounded rectangle
- Dashed border + gray = "outside the system boundary"

### When color doesn't work (print, grayscale, accessibility)

Diamonds, rounded-rects, dashed borders, and font-size differences must carry enough meaning that the diagram remains legible even when printed in grayscale — or viewed by someone with color-vision deficiency.

---

## Line-Type Semantics

| Style    | strokeStyle  | Meaning                                    |
|----------|-------------|--------------------------------------------|
| Solid    | `"solid"`   | Direct call, data write, synchronous flow  |
| Dashed   | `"dashed"`  | Async message, event, optional/fallback path |
| Dotted   | `"dotted"`  | Weak dependency, reference, comment link   |

- Every arrow must carry a semantic line type. Default to solid — but choose dashed or dotted when the relationship is clearly async/weak.
- Add `text` on arrows to label the relationship (e.g., `"HTTP POST"`, `"publishes event"`, `"optional"`).

---

## Shape Selection

| Intention                  | Shape                        | roundness        |
|----------------------------|------------------------------|------------------|
| Process / service / step   | `rectangle`                  | `{ type: 1 }`    |
| Start / end / terminal     | `rectangle`                  | `{ type: 3 }`    |
| Decision / branch / switch | `diamond`                    | —                |
| Data store / database      | `rectangle`                  | `{ type: 1 }`    |
| External system / actor    | `rectangle`                  | `{ type: 3 }`    |
| Document / file            | `rectangle`                  | `{ type: 1 }`    |
| Queue / buffer             | `rectangle`                  | `{ type: 1 }`    |

- Shape + fill/stroke combination communicates role. A diamond with `#FFF3CD` reads as "decision"; a diamond with `#FFFFFF` is still a decision but less emphatic.
- Rounded rectangles (`roundness: { type: 3 }`) are reserved for start/end terminals and external actors. Don't use them for regular process steps.

---

## Sizing Rules

- **Minimum shape size**: width >= 120px, height >= 60px
- **Consistent within roles**: all process-step rectangles use the same width & height; all diamonds use the same size
- **Font sizes** (5-level system, inherited from active preset): title 22px, heading 18px, body 16px, caption 14px, label 12px
- **Text padding**: at least 20px inside shapes for text breathing room
- **Arrow length**: minimum 80px between connected shapes

---

## Layout Patterns

- **Grid align**: align element positions to multiples of 20 (e.g., x=100, not x=103)
- **Spacing**: 40–80px gap between adjacent shapes; 60px is a safe default
- **Flow direction**: top-to-bottom (vertical) for most workflows; left-to-right (horizontal) for data pipelines
- **Hierarchy**: important nodes larger or positioned higher; top-left = entry point
- **Grouping**: cluster related elements with a background-zone rectangle (`#F5F5F5` fill, `#CCCCCC` stroke, lowest z-index)

---

## Arrow Binding

- **Always bind**: use `startElementId` / `endElementId` on arrows — never hardcode `points` for straight connections
- Use `points` only when routing around obstacles; prefer `gap` parameter on `connectElements` instead
- **Arrowheads**: `"arrow"` for directed flow; `"dot"` for data stores; `null` for undirected lines
- **Label arrows**: set `text` on the arrow itself to describe the relationship
- Bind from diamond to rectangle: the arrow will auto-attach to the nearest edge — verify after creation

---

## Drawing Order (by z-index)

1. **Background zones** — `#F5F5F5` rectangles, lowest z-index (create first)
2. **Primary shapes** — process nodes, entities, diamonds
3. **Arrows** — connect shapes via binding IDs (create after both endpoints exist)
4. **Annotations** — standalone text, titles, notes, legends (create last, highest z-index)
5. **Refinement** — align, distribute, adjust spacing, then verify visually

---

## Anti-Patterns

1. **Too many colors** — limit to 2–3 semantic fills per diagram. If you reach for a 4th, reconsider.
2. **Color-coded without shape differentiation** — a red rectangle and a green rectangle are indistinguishable in grayscale; use shape changes too.
3. **Overlapping elements** — always leave gaps; use `distribute_elements` tool.
4. **Cramped spacing** — minimum 40px between shapes.
5. **Tiny fonts** — never below 12px; body text 16px standard; labels and arrow text may use 12px.
6. **Manual arrow coordinates** — always prefer `startElementId`/`endElementId`.
7. **Missing labels** — every shape and every non-trivial arrow must carry `text`.
8. **Flat layout** — use background zones (`#F5F5F5` fill) to create visual sections.
9. **Inconsistent sizes** — same-role shapes must have identical width and height.
10. **Mixing fill/stroke pairs** — `#FFF3CD` fill always pairs with `#856404` stroke; don't swap in `#495057`.
11. **Arrow label overlap** — when multiple arrows share the same source or direction, distribute labels using the `labelOffset` parameter. Never let two arrow labels overlap at the same position.

---

## Output Self-Check Checklist

After generating a diagram, verify:

- [ ] All process shapes use `fill: #FFFFFF` / `stroke: #495057` (or explicitly chosen semantic fills)
- [ ] Semantic fills are paired with their matching stroke color
- [ ] Font sizes are >= 12px; body text is 16px; labels may use 12px
- [ ] All shapes have `text` set
- [ ] All arrows have `startElementId` and `endElementId` (except annotation arrows)
- [ ] Line types (solid/dashed/dotted) match the relationship semantics
- [ ] Shape types match intention: diamond for decisions, rounded-rect for terminals, rectangle for processes
- [ ] No overlapping elements
- [ ] Same-role shapes have identical dimensions
- [ ] The diagram is legible when printed (test mentally: remove all color — can you still follow the flow?)
- [ ] Total semantic fills used <= 3 (not counting white and gray)
- [ ] Arrow labels do not overlap — use `labelOffset` for parallel arrows sharing the same source
