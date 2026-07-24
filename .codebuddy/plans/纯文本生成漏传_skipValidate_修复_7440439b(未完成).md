---
name: 纯文本生成漏传 skipValidate 修复
overview: 修复 entSim 纯文本生成任务（粉丝反应/结局叙事）因漏传 skipValidate:true 而被 validateEntSimNarrative（期望 JSON）误校验，导致 parser 解析出空 narrative → 报「0字+缺options」→ 重试 3 次全失败的问题。补齐 2 处漏传 + 在 ai-generator 层加 plainText 自动跳过校验的兜底。
todos:
  - id: fix-ai-generator
    content: ai-generator.js:51 将 if (skipValidate) 改为 if (skipValidate || opts.plainText)
    status: pending
  - id: fix-immersion
    content: "immersion.js:69 generateWithRetry opts 追加 skipValidate: true"
    status: pending
    dependencies:
      - fix-ai-generator
  - id: fix-engine-ending
    content: "engine.js:274 generateWithRetry opts 追加 skipValidate: true"
    status: pending
    dependencies:
      - fix-ai-generator
  - id: build-verify
    content: Vite 构建验证无语法错误
    status: pending
    dependencies:
      - fix-immersion
      - fix-engine-ending
---

## 问题概述

entSim 模式下，粉丝圈反应生成（`generateFanReaction`）和结局叙事生成（`runEntSimEnding`）调用 `generateWithRetry` 时传了 `plainText: true` 但漏传 `skipValidate: true`。导致 AI 正确输出的纯文本被 `validateEntSimNarrative`（期望 JSON `{narrative, options, entSimExtras}`）误校验，parser 解析失败 → `narrative` 为空 → 报「正文过短（仅 0 字）」+「缺少 options」→ 3 次重试全失败，浪费 API 调用且功能不可用。

## 修复目标

- `ai-generator.js` 中 `plainText: true` 时自动跳过 JSON 校验（根治所有漏传场景）
- `immersion.js` 和 `engine.js` 两处调用点显式补 `skipValidate: true`（防御性冗余）
- 不影响已有正确传参的 3 处调用（1v1 chat/eventStory/seedEvent）

## 技术方案

### 修改策略（3 个文件，每处 1 行改动）

**文件 1：`src/ai-generator.js` 第 51 行**

`if (skipValidate)` → `if (skipValidate || opts.plainText)`

这是根治修复。`plainText: true` 本身就意味着「不使用 JSON 格式」（第 23 行 `var useJson = !opts.plainText` 已经据此关闭了 `response_format=json_object`），所以对其做 JSON 结构校验在逻辑上就是矛盾的。加上 `|| opts.plainText` 后，所有纯文本调用自动跳过校验，无需每个调用点都记得传 `skipValidate`。

**文件 2：`src/ent-sim/immersion.js` 第 69 行**

opts 对象追加 `skipValidate: true`。即使未来 ai-generator 逻辑变动，调用点自身也正确。

**文件 3：`src/ent-sim/engine.js` 第 274 行**

opts 对象追加 `skipValidate: true`。同上。

### 向后兼容

- 已正确传参的 3 处（`game-engine.js:3841`、`game-engine.js:3950`、`engine.js:218`）同时带 `skipValidate: true` + `plainText: true`，行为不变
- 非 plainText 的 entSim 主剧情生成不受影响，仍走 `validateEntSimNarrative`
- 换乘恋爱和 1v1 模式不受影响

### 性能影响

消除无效重试：之前每次曝光事件触发粉丝反应生成会浪费 3 次 API 调用（全部失败），修复后 1 次即成功。

### 实现要点

- `ai-generator.js` 改动需注意 `opts.plainText` 在第 23 行已被读取为 `useJson`，但 `opts` 对象本身在循环内仍可访问（`opts` 是函数参数，作用域覆盖整个函数体）
- `immersion.js` 和 `engine.js` 的 opts 是对象字面量，直接追加键值对即可