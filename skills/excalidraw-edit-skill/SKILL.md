---
name: excalidraw-edit-skill
description: Precision editing of existing Excalidraw elements using structured selection feedback. Use when the agent needs to (1) inspect elements the user has clicked on via get_selection, (2) run automated quality checks (textOverflow, overlaps, spacing, readability), (3) precisely modify elements with update_element, (4) verify changes with screenshots, or (5) safely retry edits with snapshot snapshots. Complements excalidraw-skill which creates diagrams from scratch — this skill edits what's already on the canvas. Requires the canvas frontend open in a browser at http://127.0.0.1:3000.
---

> **LOCAL FORK (MCP-only)**  
> 本工作区无 browser canvas / WebSocket / 截图。选中走 Obsidian EA「AI Edit Selected」→ `.ai-selection.json` → `get_selection`；改图前先 `import_from_obsidian`。下文 canvas/screenshot 叙事过时，**勿照抄**；以仓库根 `DOCS_*.md` / `CLAUDE.md` 为准。

# Excalidraw Editing Skill

## What This Skill Does

The `excalidraw-skill` creates diagrams. This skill edits them.

When the user clicks an element on the canvas, the browser computes rendering-level data (text overflow, overlaps, nearby elements) and pushes it to the server. This skill uses that structured data for precision editing — no guesswork about pixel coordinates, no pure screenshot analysis.

---

## Tool Selection Guide

| You want to... | Use this tool |
|----------------|--------------|
| Inspect what the user just clicked | `get_selection` |
| Check a specific element by ID | `get_element_context(id)` |
| See the whole canvas layout | `describe_scene` |
| Visually verify a change | `get_canvas_screenshot` |
| Modify one element | `update_element` |
| Move/resize multiple elements | Multiple `update_element` calls |
| Fix layout spacing | `distribute_elements` or `align_elements` |
| Element is locked | `unlock_elements` first |
| Safety net before risky change | `snapshot_scene` |
| Undo a bad change | `restore_snapshot` |

**Decision tree for gathering context:**

```
User clicked something in the canvas?
  → get_selection
  → Check hasSelection:
      true  → Analyze structured data, proceed to editing
      false → "你没有选中任何元素。请点击画布上的某个元素让我帮你检查。"

Need to check another element nearby?
  → get_element_context(id)

Need the full picture?
  → describe_scene + get_canvas_screenshot
```

---

## Quality Checklist (Automated via Structured Data)

After `get_selection`, run these four checks against the structured data. The browser already computed the numbers — you just read them.

### 1. Text Overflow

Read `elements[].renderedOverflow`:

```json
{
  "renderedOverflow": {
    "overflow": true,
    "textRenderedWidth": 342,
    "containerWidth": 60
  }
}
```

| Finding | Action |
|---------|--------|
| No `renderedOverflow` field | Element has no text. Skip check. |
| `overflow: false` | Pass. |
| `overflow: true`, ratio < 1.5 | Increase `width` to `renderedWidth + 20`. |
| `overflow: true`, ratio ≥ 1.5 | Increase `width` AND reduce `fontSize` (min 14). |

### 2. Overlaps

Read `elements[].overlaps[]`:

```json
{
  "overlaps": [
    {"elementId": "box2", "area": 3400, "severity": "moderate"}
  ]
}
```

| severity | Action |
|----------|--------|
| `minor` (area ≤ 1000) | Acceptable. Note but don't force fix. |
| `moderate` (1000 < area ≤ 5000) | Move affected element. Use `direction` from nearbyElements to decide which way. |
| `severe` (area > 5000) | Must fix. Move or resize. Consider `distribute_elements`. |

### 3. Spacing

Check `elements[].nearbyElements[]` for `distance < 40`:

```json
{
  "nearbyElements": [
    {"elementId": "box2", "distance": 22, "direction": "right"}
  ]
}
```

| Finding | Action |
|---------|--------|
| All distances ≥ 40 | Pass. |
| Any distance < 40 | Move element in the OPPOSITE direction by `(40 - distance)`px. |
| Multiple nearby elements too close | Use `distribute_elements` to spread them. |

### 4. Readability

Check basic properties:

| Property | Minimum | If below minimum |
|----------|---------|------------------|
| `fontSize` | 14 | `update_element` to 16 |
| `width` | 80 | Increase to ≥ 80 |
| `height` | 40 | Increase to ≥ 40 |

**Run order**: overlaps(severe) → textOverflow → spacing → readability. Fix the worst problem first, verify with screenshot, then re-check (other issues may change).

---

## Editing Workflow

### Full Loop

```
get_selection
  ↓
Run Quality Checklist (4 rules against structured data)
  ↓
Report findings to user: "Found 2 issues: text overflow on box3, tight spacing with box1"
  ↓
snapshot_scene("before-fix-<what>")
  ↓
update_element (fix highest-priority issue)
  ↓
get_canvas_screenshot → verify visually
  ↓
get_selection → re-run checks → pass? → fix next issue
  ↓
All issues resolved → report summary to user
```

### Example: Fix Text Overflow

```
1. get_selection()
   → hasSelection: true, box3 selected
   → renderedOverflow: { overflow: true, renderedWidth: 342, containerWidth: 60 }

2. Analysis:
   ❌ textOverflow: text 342px wide, container only 60px (ratio 5.7x → severe)
   ✅ overlaps: none
   ✅ spacing: nearest element 189px away
   ✅ readability: width 80 ✓, height 50 ✓, fontSize 16 ✓

3. Fix plan: "Increase box3 width from 80 to 362 (342 + 20 padding)."

4. snapshot_scene("before-fix-overflow-box3")

5. update_element({ id: "box3", width: 362 })

6. get_canvas_screenshot() → text is now fully visible

7. Report: "已将 box3 宽度从 80px 扩大到 362px，文字不再溢出。"
```

### Example: Fix Overlapping Elements

```
1. get_selection() → overlaps: [{ elementId: "box2", area: 3400, severity: "moderate" }]

2. get_element_context("box2") → nearby shows box2 is at x=140 from current

3. Since box2 is to the right, move it right: update_element({ id: "box2", x: box2.x + 50 })

4. Screenshot → overlap gone → done
```

---

## Retry Loop

If a fix doesn't work, retry up to 3 times with escalating strategies:

### Attempt 1: Precise Fix
- `update_element` on just the problematic properties
- Verify with `get_canvas_screenshot` + `get_selection`

### Attempt 2: Wider Fix
- `update_element` on the problematic element AND adjacent elements
- Re-run `describe_scene` to check the broader area

### Attempt 3: Local Rebuild
- `delete_element` the problem elements
- `batch_create_elements` to recreate them with corrected coordinates
- Verify with screenshot

### Degradation
If all 3 attempts fail:
- Has snapshot? → `restore_snapshot` and report: "无法自动修复 [具体问题]，已回退到修改前状态，建议手动调整。"
- No snapshot? → Report: "无法自动修复 [具体问题]，建议手动调整。当前画布状态未改变。"

---

## Safety Net: Snapshots

**Always snapshot before modifying.** Naming convention: `before-<action>-<target>`

Examples:
- `before-fix-overflow-box3`
- `before-reposition-svc-a`
- `before-resize-group`

Keep at most 5 snapshots. If you need a 6th, overwrite the oldest.

Restore with `restore_snapshot("name")`.

---

## Multiselect Support

When users select multiple elements (Ctrl+click, drag-select, Shift+select), `get_selection` returns all of them:

```json
{"hasSelection": true, "elementCount": 3, "elements": [...]}
```

- Run Quality Checklist on EACH element
- Prioritize fixes by severity across all selected elements
- Fix overlap BETWEEN selected elements first (those are the user's focus)
- Then fix each element's individual issues (overflow, readability)

---

## Update Element Reference

### Sanitized Inputs (automatic)
Values passed to `update_element` are automatically sanitized:
- `x`, `y` → rounded to integer, clamped ≥ 0
- `width`, `height` → rounded, clamped to [20, 5000]
- `fontSize` → rounded, clamped to [8, 72]

### Common Modifications

| Goal | Parameters |
|------|-----------|
| Move | `{ id, x, y }` |
| Resize | `{ id, width, height }` |
| Recolor | `{ id, backgroundColor, strokeColor }` |
| Change text | `{ id, text: "new text" }` |
| Change font size | `{ id, fontSize: 18 }` |
| Change border style | `{ id, strokeStyle: "dashed" }` (solid/dashed/dotted) |
| Fix arrow binding | `{ id, start: { id: "shape-id" }, end: { id: "shape-id" } }` |

### Read Before Modifying

- Check `locked` — if true, call `unlock_elements` first
- Check `groupIds` — grouped elements move together; update the whole group or ungroup first
- Check `boundElementIds` — arrows bound to this element will auto-follow; no need to update them separately

---

## Reporting to User

After completing edits, report in this format:

```
我检查了画布上的 [element description]：

✅ 文字无溢出
✅ 无重叠
✅ 字号可读
⚠️ 与 [other element] 间距仅 [N]px
  → 已移动 [element]，间距增加到 [N]px

修改前 → 修改后对比：[screenshot]
```

When reporting failures: be specific about WHAT failed and WHY. "修复失败" is unhelpful. "无法将 box3 移动到 x=200，因为该坐标会与 box1 重叠（需要先移动 box1）" is useful.

---

## Notes

- This skill requires the canvas frontend open at http://127.0.0.1:3000. Without it, screenshots and structured selection won't work.
- Use `snapshot_scene` liberally. It costs nothing and saves time when fixes go wrong.
- If textOverflow shows no data for an element, it likely has no text (e.g., a plain rectangle without a bound text element). Double-click the shape in the browser to add text via Excalidraw's UI.
- Works alongside `excalidraw-skill`: that skill creates diagrams, this skill edits them.
