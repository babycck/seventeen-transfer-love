---
name: fix-empty-options-fallback-chain
overview: 修复 generatePhaseNarrative 中 Step 2 选项生成返回空数组时，优先使用 Step 1 叙事中的 parsed.options 作为第一级兜底
todos:
  - id: save-narrative-options
    content: 在 game-engine.js generatePhaseNarrative Step 1 后保存 narrativeOptions
    status: completed
  - id: update-fallback-dispatch
    content: 将 generatePhaseNarrative 中两处兜底逻辑改为优先复用 narrativeOptions
    status: completed
    dependencies:
      - save-narrative-options
  - id: verify-and-push
    content: 构建验证并推送至 GitHub
    status: completed
    dependencies:
      - update-fallback-dispatch
---

## 需求概述

修复 `generatePhaseNarrative` 中 Step 2 AI 专用选项生成返回空数组时，跳过 Step 1 主剧情中 AI 已生成的有效选项的问题。

### 问题表现

- 运行 `generatePhaseNarrative` 时，控制台输出 `[generatePhaseNarrative] 选项生成返回空数组，使用兜底选项`
- Step 1 (line 184) 中 AI 生成的主剧情 `parsed = parseNarrative(rawText)` 已包含 `parsed.options`（含 affName/affDelta/affReason 的有效选项）
- Step 2 另一次 AI 调用生成专用选项，AI 经常输出标准叙事 JSON（带 blocks），`JSON.parse` 成功但 `options` 为空
- 现有代码直接跳转到 `skeletonGetFallbackOpts()`（泛型活动选项），跳过了 Step 1 中与剧情紧密相关的有效选项

### 修复目标

- Step 2 返回空时优先复用 Step 1 的 `parsed.options`
- 保留 `skeletonGetFallbackOpts()` 作为最终兜底
- 保持 `handleFreeAction` 不变（那里没有主剧情选项可复用）

## 技术方案

### 实现策略

在 `generatePhaseNarrative` 函数的 Step 1 完成后捕获主剧情中的选项，作为 Step 2 失败时的首选回退。

**修改位置**：`src/game-engine.js`（1 处新增变量 + 2 处修改兜底逻辑）

**改动 1 — 捕获 Step 1 选项** (在 line 184 之后)

在 `parsed = parseNarrative(rawText)` 之后立即保存：

```
var narrativeOptions = parsed.options || [];
```

注意：`parsed.options` 中每个元素结构为 `{text, affName, affDelta, affReason}`，与 `dispatch(SET_OPTIONS)` 所需格式完全一致，可直接复用。

**改动 2 — 修改 AI 空选项兜底逻辑** (line 267-269)

原代码：

```javascript
console.warn('[generatePhaseNarrative] 选项生成返回空数组，使用兜底选项');
dispatch({ type: 'SET_OPTIONS', payload: { options: skeletonGetFallbackOpts() } });
```

改为：

```javascript
console.warn('[generatePhaseNarrative] 选项生成返回空数组，尝试复用主线剧情选项');
if (narrativeOptions.length > 0) {
  GS.pendingAffChanges = []; // narrative options 不含 affChanges，清空以免残留
  dispatch({ type: 'SET_OPTIONS', payload: { options: narrativeOptions } });
} else {
  dispatch({ type: 'SET_OPTIONS', payload: { options: skeletonGetFallbackOpts() } });
}
```

**改动 3 — 修改 catch 块兜底逻辑** (line 271-274)

同样优先使用 `narrativeOptions` 再 fallback 到 `skeletonGetFallbackOpts()`。

### 关键设计决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 是否修改 `handleFreeAction` | 否 | 自由输入没有主剧情，`parsed` 来自 Step 1 主叙事，`handleFreeAction` 中不存在可复用的 narrative 选项 |
| `narrativeOptions` 是否需过滤 | 否 | `parsed.options` 已由 `parseNarrative` 解析，格式标准，直接可用 |
| `pendingAffChanges` 处理 | 清空 | narrative 的 options 不含 `affChanges`，保留旧值可能导致好感度错误 |


### 修改清单

- `src/game-engine.js` — [MODIFY] line 185 后新增变量保存；line 267-269 修改兜底；line 271-274 修改 catch 兜底

### 不涉及改动

- `option-engine.js` — 不修改
- `handleFreeAction` — 不修改
- prompts/prompt 系统 — 不修改

## Agent Extensions

### SubAgent

- **code-explorer**: 用于在修改前后快速确认 `game-engine.js` 中所有 `skeletonGetFallbackOpts` 调用点，确保不遗漏 `handleFreeAction` 之外的兜底位置。