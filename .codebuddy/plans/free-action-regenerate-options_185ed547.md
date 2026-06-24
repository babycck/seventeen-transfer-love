---
name: free-action-regenerate-options
overview: 修改 handleFreeAction，让自由输入后在自由剧情基础上调用 AI 重新生成 A/B/C 选项，使游戏能继续推进。同时保留行动次数消耗和兜底容错。
todos:
  - id: fix-free-action-options
    content: 修改 handleFreeAction：自由剧情生成后插入 AI 选项生成步骤，复用 generatePhaseNarrative 的 generateOptions 调用模式，含兜底选项和约会日特殊处理
    status: completed
---

## 用户需求

Day9 傍晚使用自由输入后，选项面板为空，游戏无法继续推进。用户期望自由输入后自动调用 AI 重新生成 A/B/C 选项，让游戏继续推进并消耗行动次数。

## 产品概述

当前 `handleFreeAction` 在自由剧情生成后强制将 `currentOptions` 设为空数组，导致选项面板不渲染。需要改为在自由剧情 AI 生成完成后，复用已有的 AI 选项生成路径，基于自由剧情文本生成带好感度字段的 A/B/C 选项。

## 核心功能

- 自由输入后，基于自由剧情文本调用 AI 生成 3 个选项（含 affName/affDelta/affReason）
- 保留行动次数消耗逻辑（phaseFreeCount++）
- 保留约会日 phase 0 未进入约会场景时强制"进入约会场景"按钮的特殊处理
- AI 选项生成失败或返回空时使用兜底选项，不卡死游戏

## Tech Stack

- 无技术栈变更，纯逻辑修改
- JavaScript (ES Modules)，Vanilla JS + Vite

## 实现方案

### 根因

`game-engine.js` 的 `handleFreeAction`（第 885-941 行）在自由剧情 AI 生成完成后，第 928-930 行直接把 `GS.currentOptions` 设为空数组。`option-panel.js:10` 的渲染条件要求 `opts.length > 0`，空数组导致选项面板不渲染，用户只能看到"进入下一时段"按钮。

### 修复策略

在 `handleFreeAction` 中，自由剧情 rawText 生成并 dispatch PUSH_CONSEQUENCE 之后、设置 currentOptions 之前，插入 AI 选项生成步骤。复用 `generatePhaseNarrative`（第 250-284 行）中已验证的选项生成逻辑：

1. 调用 `buildSystemPrompt()` + `buildUserMessage('generateOptions', { narrativeText: rawText })` 构建 prompt
2. 调用 `generateWithRetry(...)` 传入 `skipValidate: true`，避免选项格式被 validator 误判
3. JSON.parse 优先解析 AI 返回的 `{"options":[...]}` 格式，失败时 fallback 到 `parseNarrative`
4. 成功提取到 options 时设置 `GS.currentOptions` 和 `GS.pendingAffChanges`
5. AI 调用失败或返回空数组时，使用兜底选项（继续观察/主动参与/找借口离开）

### 特殊场景保留

- 约会日 phase 0 且未进入约会场景：仍强制"进入约会场景"按钮，不走 AI 选项生成
- 行动次数已用完时（phaseOptionCount + phaseFreeCount >= PHASE_ACTION_LIMIT）：设空选项，由 action-bar 显示"进入下一时段"

### 性能考虑

- 自由输入后多一次 AI 调用（选项生成），与正常选项选择后的 consequence 流程一致，符合游戏原有设计
- skipValidate 避免无谓的重试和 API 调用浪费

### 当前存档恢复

用户当前卡在 Day9 傍晚，代码修复后刷新页面生效，但当前存档 currentOptions 仍为空。恢复方式：点击底部"进入下一时段"进入深夜，深夜走 generatePhaseNarrative 正常生成剧情+选项即可。无需额外恢复机制。

## 目录结构

```
d:\SEVENTEEN\
└── src/
    └── game-engine.js    # [MODIFY] handleFreeAction 函数（第 885-941 行）：在自由剧情生成后插入 AI 选项生成步骤
```

## 实现注意事项

- 使用 `var` 声明变量，字符串拼接用 `+`，不使用模板字符串，与项目代码风格一致
- AI 生成文本插入 DOM 前经过 `escHtml()` 转义（选项面板已处理）
- 不引入新依赖，不改 ui/option-panel.js、ui/action-bar.js、prompts.js、skeleton/option-engine.js、ai-generator.js
- `GS` 引用不可被替换，使用 `Object.assign` 语义（此处直接赋值属性，无问题）