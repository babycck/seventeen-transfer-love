---
name: fix-option-engine-return-null
overview: 回退 option-engine.js 中 generateStandardOptions 和 generateDatingOptions 的 return options 改动，恢复为 return null，强制普通时段和约会场景走 AI 生成路径（带 affName/affDelta 绿色小字），与玩家原本看到的行为一致。
todos:
  - id: revert-skeleton-options
    content: 回退 option-engine.js 中 generateStandardOptions 和 generateDatingOptions 的返回值为 null，使普通时段和约会场景走 AI 选项生成路径
    status: completed
---

## 用户需求

修复一个回归 Bug：每次进入新时段时，选项变成了骨架静态选项（如"和XX一起做早餐"，无好感度提示），而不是原本的 AI 基于剧情生成的选项（带绿色小字如"+2 净汉 · 原因"）。

## 产品概述

这是一个 Bug 回退修复。原本的设计是：进入新时段时，AI 先生成剧情，再基于剧情内容生成 3 个选项，每个选项附带好感度字段（`affName`/`affDelta`/`affReason`），在 UI 上以绿色小字显示。上一轮错误修复把骨架选项引擎的返回值从 `null` 改成了实际选项数组，导致骨架静态选项短路了 AI 生成路径。

## 核心功能

- 将 `generateStandardOptions()` 和 `generateDatingOptions()` 的返回值回退为 `null`，使普通时段和约会场景正确走 AI 选项生成路径
- 保留骨架对特殊场景的固定选项处理（约会日 phase 0、深夜、真心话、提问箱）
- 保留 AI 解析容错增强（JSON.parse 优先），使 AI 路径更健壮

## Tech Stack

- 无技术栈变更，纯 Bug 回退修复
- JavaScript (ES Modules)，Vanilla JS + Vite

## 实现方案

### 根因分析（两个独立 Bug）

#### Bug 1：骨架选项短路 AI 路径

1. `state.js:163` — `skeletonConfig.optionEngine` 默认值为 `true`
2. `game-engine.js:246` — 当 `optionEngine` 为 `true` 时，调用 `skeletonGenOptions()`
3. `option-engine.js:63` — 上一轮修复把 `return null` 改成了 `return options`，返回骨架静态选项（"和净汉一起做早餐"），无 `affName`/`affDelta` 字段
4. 这导致 `game-engine.js:247` 条件 `skeletonOpts && skeletonOpts.length > 0` 为真，直接使用骨架选项，跳过了 AI 生成路径（252-284 行）
5. `ui/option-panel.js:17` — 只有 `opts[j].affName && opts[j].affDelta` 才渲染绿色小字，骨架选项不满足条件

#### Bug 2：AI 选项生成触发 validator error 导致重试失败

1. 选项生成任务返回 `{"options":[...]}` 格式（无 blocks 字段）
2. `parseNarrative` 解析后 `blocks` 为空数组
3. `validator.js:30-33` — `blocks.length === 0` 时返回 error "剧情内容为空"
4. `ai-generator.js:42` 检测到 error，触发重试，2 次都失败（AI 仍返回 `{"options":[...]}` 格式）
5. 虽然最终 `return lastResult` 返回了 AI 实际输出，但浪费 2 次 API 调用，且第二次注入 correction 反馈污染输出

### 修复方案

**修复 1：回退 `src/skeleton/option-engine.js` 两处改动**

1. `generateStandardOptions()` 第 63 行：`return options;` → `return null;`
2. `generateDatingOptions()` 第 67-79 行：回退为原始的 `return null;`

**修复 2：`src/ai-generator.js` 添加 `skipValidate` 选项**

`generateWithRetry` 函数支持 `opts.skipValidate`，为 true 时跳过 `validateNarrative` 校验，直接返回 AI 原始输出。选项生成任务（`game-engine.js:255`）传入 `skipValidate: true`，避免 `{"options":[...]}` 格式被误判为 error 触发重试。

```js
// ai-generator.js generateWithRetry 内部
var skipValidate = opts.skipValidate || false;
// ...
if (skipValidate) {
  return { raw: raw, parsed: parsed, corrections: [], attempts: attempt + 1 };
}
var corr = validateNarrative(raw, parsed);
```

```js
// game-engine.js 选项生成调用
var optResult = await generateWithRetry(optSysPrompt, optUserMsg, {
  tokens: 1000, temperature: 0.7, skipValidate: true
});
```

**保持不变的部分：**

- `option-engine.js` 特殊场景固定选项（约会日 phase 0、深夜 phase 3、真心话、提问箱）— 这些是正确行为
- `game-engine.js:256-263` AI 解析容错增强（JSON.parse 优先）— 这让 AI 路径更健壮

### 验证点

| 场景 | 骨架返回值 | 走哪条路径 | 选项带好感度 |
| --- | --- | --- | --- |
| 普通时段（早/午/傍晚） | `null` | AI 生成 | 是 |
| 约会场景 | `null` | AI 生成 | 是 |
| 约会日 phase 0 | `[{text:'▶ 进入约会场景'}]` | 骨架固定 | N/A（固定选项） |
| 深夜 phase 3 | `[]` | AI 生成 | 是 |
| 真心话模式 | `[]` | 真心话面板 | N/A |
| 提问箱模式 | 固定两选项 | 骨架固定 | N/A |


## 实现注意事项

- `skeletonConfig.optionEngine` 默认 `true` 的设计意图是：骨架只拦截特殊场景，普通场景返回 `null` 让 AI 处理。不要改这个默认值。
- AI 选项解析路径（`game-engine.js:256-263`）的 JSON.parse 优先策略保留，因为 AI 选项生成返回 `{"options":[...]}` 格式，`parseNarrative` 是针对 blocks 设计的，直接 JSON.parse 更准确。
- 修复后每次进入新时段会多一次 AI 调用（选项生成），这是原有设计行为，不是性能问题。

## 目录结构

```
d:\SEVENTEEN\
└── src/
    ├── skeleton/
    │   └── option-engine.js    # [MODIFY] 回退两处：generateStandardOptions() 和 generateDatingOptions() 的 return null
    ├── ai-generator.js         # [MODIFY] generateWithRetry 添加 skipValidate 选项支持
    └── game-engine.js          # [MODIFY] 选项生成调用传入 skipValidate: true
```