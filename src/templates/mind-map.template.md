---
name: "Mind Map"
preset: "mind-map"
description: "放射状层次图 — 中心主题辐射分支子主题，曲线连接从中心向外扩展。"
---

## 如何绘制思维导图

用户以自然语言描述主题层次结构。你需要将其解析为**中心主题、一级分支和子分支**三个层次，分两阶段绘制。

所有样式值来自 `mind-map` 预设 — 禁止硬编码 hex 颜色、像素尺寸或字体值。参照下方令牌表选择正确的令牌值。

> 思维导图是"限制 3 种语义色"规则的例外。分支颜色辅助视觉扫描，是此格式的核心。每个一级分支使用不同色调 — 但保持低饱和度。

---

### 步骤 1 — 识别节点层次

| 层次 | 令牌 | 形状 | 尺寸 |
|------|------|------|------|
| 中心主题 | node:center | 圆角矩形 (`roundness: { type: 3 }`) | `layout.centerW` × `layout.centerH` |
| 一级分支 | node:branch1 ~ branch6（按序号循环） | 圆角矩形 (`roundness: { type: 2 }`) | `layout.branchW` × `layout.branchH` |
| 子分支 | 继承父分支令牌（同色系浅色变体） | 圆角矩形 (`roundness: { type: 2 }`) | `layout.subBranchW` × `layout.subBranchH` |
| 叶节点 | 无背景 | 独立文本元素 | — |

分支令牌按序号循环分配：第 1 个分支用 `node:branch1`，第 2 个用 `node:branch2`，...，第 7 个回到 `node:branch1`。冷暖和暖色交替排列增强视觉分离。

---

### 步骤 2 — 计算分支角度

**角度 = 360° / 一级分支数**（最小 30°，最大 72°）。

不硬编码特定角度。分支越多，角度越小。6 个分支 → 60°，8 个分支 → 45°，5 个分支 → 72°。

一级分支以计算出的角度间隔均匀围绕中心排列。

---

### 布局规则

- 中心节点置于画布中央
- 一级分支以等角间隔围绕中心，径向距离 ≥ `layout.radialGap`
- 子分支从一级分支向外径向延伸，间距 ≥ `layout.subRadialGap`
- 所有连接线使用 `startElementId` / `endElementId` 绑定

---

### 连接线指南

- 中心 → 一级分支：`line` 或 `arrow`，`endArrowhead: null`，`strokeWidth: 2`，颜色继承分支描边色
- 一级分支 → 子分支：较细线条，`strokeWidth: 1.5`，颜色继承父分支描边色
- 所有连接线使用 `arrow:primary` 或 `arrow:muted` 令牌

---

### 绘制阶段

**阶段 1 — `batch_create_elements`（仅形状）**
1. 中心主题，`fontSize: 20`，`strokeWidth: 3`
2. 一级分支节点，`fontSize: 16`，围绕中心等角分布
3. 子分支节点，`fontSize: 14`，从一级分支向外延伸

**阶段 2 — `bind_arrows`（仅连接）**
4. 中心 → 一级分支连接线
5. 一级分支 → 子分支连接线

---

### 检查清单
- [ ] 中心节点视觉主导（更大、更粗边框）
- [ ] 每个一级分支使用不同令牌（branch1~branch6 循环）
- [ ] 子分支继承父分支色调
- [ ] 分支角度 = 360° / 分支数（30°~72° 范围内）
- [ ] 所有一级分支距中心等距
- [ ] 所有连接线通过 startElementId / endElementId 绑定
- [ ] 无硬编码 hex 颜色
