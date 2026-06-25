---
name: 审计修复与Loading局部化
overview: 整合代码审计问题修复（alert残留、未使用导入、参数遮蔽）与 Loading 局部化改造（剧情区可读、操作区被遮罩防误触）。
todos:
  - id: audit-p0-alert-fix
    content: 修复 sms.js:60 alert() 替换为 showToast + escHtml，补 escHtml 到 import
    status: pending
  - id: audit-p1-unused-imports
    content: 移除 prompts.js/ui-renderer.js/midnight-call.js 中已确认无引用的未使用导入
    status: pending
  - id: audit-p2-shadow-and-window
    content: 修复 api.js 参数遮蔽 sceneType→inferredSceneType；移除 narrative-box.js 无调用方的 window.__showNarrativeEditor
    status: pending
  - id: loading-localize-css
    content: 新增 .action-loading CSS 规则；修复 .loading-overlay 的 pointer-events:none→auto
    status: pending
  - id: loading-localize-render
    content: "改造 renderGameScreen() 包裹 #actionSection + #actionLoading；改造 utils.js showLoading/hideLoading 为局部优先 fallback 全局"
    status: pending
    dependencies:
      - loading-localize-css
---

## 优化目标

消除 `[generatePhaseNarrative] 选项生成返回空数组，复用叙事自带选项` 的 warn 日志，并节省一次无意义的 API 调用。

## 当前问题

`generatePhaseNarrative()` 有两步 AI 调用：

| Step | 位置 | 目的 | 耗时 |
| --- | --- | --- | --- |
| Step 1 | line 185 | 生成剧情正文 + AI 可能附带返回 options（`narrativeOptions`） | 正常 |
| Step 2 | line 260 | 再专门调一次 AI 生成更精准的选项 | 额外 1-2 秒 |


Step 2 的 AI 经常返回 `{"options":[]}`（空数组），这时 fallback 到 Step 1 的 `narrativeOptions`（line 272-274），同时打印 warn。

**问题本质**：Step 2 的 API 调用被浪费了——Step 1 已经返回了足够的选项，Step 2 再调一次 AI 大多数时候得到空结果，徒增等待时间和 API 消耗。

## 优化方案

### 核心改动（`game-engine.js`）

**在 Step 2 之前添加早返（early return）逻辑**：如果 `narrativeOptions.length >= 3`，直接跳过 Step 2 的 AI 调用，复用 Step 1 自带的选项。

### 伪代码

```javascript
// Step 1（已有）
var narrativeOptions = (parsed.options || []).filter(function(o) { return o && o.text; });

// ...（Step 1 后续逻辑：saveGame、renderAll、hideLoading）

// ====== Step 2 前置优化 ======
// 如果 Step 1 已返回 >= 3 个有效选项 → 直接复用，跳过 AI 调用
if (narrativeOptions && narrativeOptions.length >= 3) {
  // 从 narrativeOptions 中提取 affChanges（每个选项可能内嵌 affName/affDelta）
  GS.pendingAffChanges = extractAffChanges(narrativeOptions);
  dispatch({ type: 'SET_OPTIONS', payload: { options: narrativeOptions } });
  // 略过 skeletonGenOptions / isDatingDay 等分支，直接跳到 saveGame + renderAll
} else {
  // 原有 Step 2 逻辑（不变）
  // ...
}
```

### 边界条件处理

| 场景 | 当前行为 | 优化后行为 |
| --- | --- | --- |
| Step 1 返回 >=3 个选项 | Step 2 调用 AI → 多半为空 → fallback warn | **跳过 Step 2**，直接复用，无 warn |
| Step 1 返回 1-2 个选项 | Step 2 调用 AI 尝试补充 | 走原有 Step 2 逻辑（不变） |
| Step 1 返回 0 个选项 | Step 2 调用 AI → 可能空或生成 | 走原有 Step 2 逻辑（不变） |
| 约会日固定选项 | 不进入 Step 2 | 不受影响 |
| skeleton 特殊场景（真心话/提问箱/深夜） | 不进入 Step 2 | 不受影响 |


### pendingAffChanges 处理

当前 Step 2 成功时设 `GS.pendingAffChanges = optParsed.affChanges`（line 270）。跳过 Step 2 时，需要从 `narrativeOptions` 的单个选项中提取 `affName/affDelta` 转化为 `pendingAffChanges` 格式（与 `affection.js` 的 `triggerAffectionFromChoice` 配合）。

**简单稳妥方案**：直接 `GS.pendingAffChanges = []`，让 `triggerAffectionFromChoice` 通过选项文本中的人名推断好感度（已有此能力，见 AGENTS.md「好感度系统」）。`narrativeOptions` 中的 `affName/affDelta` 字段也会被 `triggerAffectionFromChoice` 优先使用（`choiceText + opt.affName/affDelta` 路径）。

## 改动范围

仅 1 个文件：`src/game-engine.js`（line 240-250 附近插入早返逻辑）。

无需改动：选项渲染、好感度结算、validator/schema 均不受影响。