---
name: "Flowchart"
preset: "flowchart"
description: "逐步流程图 — 专用 flowchart 预设（起止/处理/菱形判定），与架构图·时序图分离"
---

## 如何绘制流程图

用户以自然语言描述流程。你需要将其解析为步骤、决策和分支，分配 **flowchart** 预设令牌，然后分两阶段绘制。

所有样式值来自 `flowchart` 预设 — **不要**使用 `clean-tech` 或 `sequence-diagram` 的节点/箭头**角色名**。配色与二者同族：填色用 clean-tech 语义色，**描边统一中性灰 `#495057`**（判定靠扁长菱形 + 浅黄底，不靠彩色描边）。禁止硬编码随机 hex；尺寸用 `lookup_style_tokens` 的 `layout.*`。

与其它图类型的边界：

| 图类型 | 预设 | 令牌风格 |
|--------|------|---------|
| 流程图 | `flowchart` | start / process / decision / end / error |
| 架构图 | `clean-tech` | primary / accent / surfaces 分区 |
| 时序图 | `sequence-diagram` | client / gateway / sync / return |

---

### 步骤 0 — 判断布局方向

根据用户描述推断布局方向：

| 用户描述特征 | 布局方向 | 主路径走向 | 备选分支走向 |
|------------|---------|-----------|------------|
| 自上而下的步骤、审批流、层层推进 | **垂直 (top-down)** | 向下 | 向右偏转再向下 |
| 从左到右的阶段、流水线、横向流程 | **水平 (left-right)** | 向右 | 向下偏转再向右 |

---

### 步骤 1 — 识别节点角色

为每个步骤选用形状和令牌（仅 `flowchart` 预设）：

| 用户描述 | 令牌 | 形状 |
|---------|------|------|
| 开始、触发、入口、第一步 | node:start | 圆角矩形 (`roundness: { type: 3 }`) |
| 结束、完成、退出、最终成功 | node:end | 圆角矩形 (`roundness: { type: 3 }`) |
| 处理、步骤、校验、转换、保存、调用 | node:process | 普通矩形 |
| 判断、如果、是否、分支、条件 | node:decision | 菱形 |
| 错误、异常、失败、拒绝、超时 | node:error | 普通矩形 |
| 子流程、并行、分叉、汇合 | node:subprocess | 普通矩形 |
| 注释、禁止项、脚注、外部说明 | node:note | 圆角矩形 + dashed 边框 |

不确定时默认使用 `node:process` 普通矩形。

泳道 / 步骤分组背景（可选）：`surface:lane` 或 `surface:group`，最先创建、置于底层。

---

### 步骤 2 — 分配箭头

| 流向类型 | 令牌 | 标签示例 |
|---------|------|---------|
| 正常推进（步骤 → 下一步） | arrow:flow | （无需标签） |
| 决策分支（是/否） | arrow:branch | "是", "否" |
| 错误/拒绝路径 | arrow:reject | "无效", "拒绝" |
| 可选/回退/重试 | arrow:retry | "重试", "再导出" |

决策分支必须带标签（"是" / "否" 或用户的条件文本）。直通流程箭头可不标。

---

### 布局规则

- **主路径**沿流向（垂直则向下，水平则向右）
- **决策分支**：主路径继续沿流向；备选路径正交偏转（垂直布局向右偏→再向下，水平布局向下偏→再向右）
- **节点尺寸**：处理节点统一 `layout.nodeW` × `layout.nodeH`
- **判定菱形（扁长）**：必须用 `layout.diamondW` × `layout.diamondH`（宽 > 高，约 2.4:1）。**禁止**正方形菱形（勿再用已废弃的 `layout.diamond`）
- **间距**：垂直主路径用 `layout.gapV`；旁路用 `layout.gapH`；泳道内边距参考 `layout.zoneGap`
- **标题**：居中置于流程图之上，`type.title`（通常 22px）
- **绝不跨形状走线**：必要时用额外 `points` 绕行

---

### 绘制阶段

**阶段 0 — 预设**
1. `apply_style_preset(name="flowchart")`
2. `lookup_style_tokens` 解析将用到的 `node:*` / `arrow:*` / `surface:*`（及需要的 `layout.*`）

**阶段 1 — `batch_create_elements`（仅形状）**
1. 可选泳道/分组背景
2. 顶部标题文本
3. 所有节点按顺序：开始 → 步骤 → 决策 → 结束/错误
4. 形状直接带 `text`（`type.body` 字号）

**阶段 2 — `bind_arrows`（仅连接）**
5. 用 `startElementId` / `endElementId` 绑定所有连接
6. 决策分支添加 "是"/"否" 标签（`type.label` 字号）

---

### 检查清单
- [ ] 使用了 `flowchart` 预设，而非 `clean-tech` / `sequence-diagram`
- [ ] 开始用 `node:start`、成功结束用 `node:end`（不要用 error 色表示成功）
- [ ] 节点描边为中性灰（与架构/时序同族）；语义靠填色 + 形状，勿给起止/判定上彩色描边
- [ ] 决策节点使用**扁长菱形**（`diamondW` × `diamondH`，宽>高）+ `node:decision`
- [ ] 所有处理步骤等宽等高
- [ ] 决策分支箭头上标有 "是"/"否"
- [ ] 错误路径使用 `arrow:reject` + `node:error`
- [ ] 回退/重试用 `arrow:retry`（dashed）
- [ ] 无硬编码随机 hex；无箭头跨越形状
