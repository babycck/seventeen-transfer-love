---
name: Parser解析失败修复+网络错误退避
overview: 两个独立问题合并修复：(1) parser.js 的 repairJson 正则提取 break bug + fallback 缺陷导致有效 AI 输出被解析为空 blocks，触发不必要的重试；(2) ai-generator.js 网络错误立即重试无退避延迟，瞬时网络问题下 3 次重试全部失败。
todos:
  - id: parser-core-fix
    content: 修复 repairJson 三处 Bug（截断栈闭合 + break 条件 + content 引号非破坏性）并新增 _extractBlocksFromRaw 兜底提取 + parseNarrative fallback 增强
    status: completed
  - id: api-error-classification
    content: api.js callDeepSeek 为 Error 附加 isNetworkError/httpStatus/retryable 属性，区分可重试与不可重试错误
    status: completed
    dependencies:
      - parser-core-fix
  - id: ai-generator-backoff
    content: ai-generator.js 添加 _sleep + 指数退避(1.5s/3s) + 错误分类跳过不可重试 + 导出 formatAIError
    status: completed
    dependencies:
      - api-error-classification
  - id: game-engine-messages
    content: game-engine.js 10 处 catch 块用 formatAIError(e) 替换硬编码错误消息
    status: completed
    dependencies:
      - ai-generator-backoff
  - id: build-verify
    content: Vite 构建验证无报错
    status: completed
    dependencies:
      - game-engine-messages
---

## 产品概述

修复两个导致游戏无法正常进行的关键 Bug：(1) Parser 将 AI 生成的有效 JSON 剧情误判为空，触发不必要的重试并丢失已生成内容；(2) 浏览器直连 DeepSeek API 遇到瞬时网络错误时立即重试无延迟，导致 3 次全部失败。

## 核心功能

- 修复 `repairJson` 中 3 个 Bug：截断修复不闭合 `]`、blocks 提取 break 过早、content 引号修复破坏性修改
- 新增 `_extractBlocksFromRaw` 括号匹配提取函数，作为 repairJson 全部失败后的兜底
- 修复 `parseNarrative` fallback 条件：rawText 以 `{` 开头但 blocks 为空时也能触发提取
- 为网络错误重试添加指数退避延迟（1.5s/3s），区分可重试与不可重试错误
- 统一 10 处 catch 块错误提示，根据错误类型给出精准的用户友好消息

## 技术栈

- 原有栈不变：Vanilla JS (ES Modules) + Vite，浏览器原生 `fetch` API
- 不引入新依赖，使用 `var` 和 `+` 拼接风格

## 问题根因分析

### 问题1：Parser 解析有效 JSON 返回空 blocks（CRITICAL）

AI 返回了包含完整 blocks 数组的 JSON，但 `parsed.blocks.length: 0`，validator 报"剧情内容为空"触发重试。失败链路：

1. **`repairJson` 截断修复 Bug（第 26-46 行）**：使用单一 `depth` 计数器同时追踪 `{}` 和 `[]`，但闭合时 `while (depth > 0) { result += '}'; depth--; }` 只补 `}` 不补 `]`。当 AI 响应被 `max_tokens` 截断时，blocks 数组的 `[` 从未被关闭，`JSON.parse` 失败。

2. **`repairJson` content 引号修复破坏性（第 52-67 行）**：正则 `/"content":\s*"((?:[^"\\]|\\.)*)"/g` 遇到 content 中未转义的 `"` 会在该引号处截断匹配，剩余文本变成悬空字符破坏 JSON 结构。修改后的 `result` 永久损坏，后续所有修复层都在损坏数据上运行。

3. **`repairJson` blocks 提取 break Bug（第 93 行）**：`if (!inStr && dep === 0 && (cc === '}' || cc === ']')) break;` — `dep` 只追踪 `{}`。当第一个 block 对象的 `}` 将 dep 归零时立即 break，只提取了第一个对象，且 `buf` 缺少闭合 `]`，`JSON.parse` 失败。

4. **`parseNarrative` fallback 条件缺陷（第 184 行）**：`if (trimmedRaw.charAt(0) !== '{' && trimmedRaw.length > 50)` — 当 rawText 以 `{` 开头（JSON 格式）但 `repairJson` 返回空对象时，`charAt(0) !== '{'` 为 false，纯文本 fallback 被跳过，blocks 直接为空。

5. **`repairJson` 最终返回空对象（第 105 行）**：所有修复层失败后返回 `{"blocks":[],...}`，`parseNarrative` 成功解析这个空对象，sanitizeScene 返回空 blocks。

### 问题2：网络错误重试无延迟

`ai-generator.js` 第 25-29 行 catch 块中 `continue` 前无 `await sleep()`，瞬时网络波动（ERR_NETWORK_CHANGED / ERR_CONNECTION_CLOSED）下 3 次重试在几秒内全部失败。`api.js` 未区分可重试（429/5xx/网络错误）与不可重试（401/400/403）错误。

## 实现方案

### 修复1：repairJson 截断修复 — 用栈替代单一计数器（parser.js 第 26-46 行）

将 `var depth = 0` 替换为 `var bracketStack = []`，在循环中 push 对应的闭合符号（`{`→`}`，`[`→`]`），遇到 `}`/`]` 时 pop。循环结束后 `while (bracketStack.length > 0) { result += bracketStack.pop(); }` 按正确顺序（内到外）闭合所有未关闭的括号。

### 修复2：repairJson content 引号修复 — 非破坏性（parser.js 第 52-67 行）

在 content 引号修复前保存 `var beforeContentFix = result`，修复后 `JSON.parse` 仍失败则 `result = beforeContentFix` 回退，避免后续修复层在损坏数据上运行。

### 修复3：repairJson blocks 提取 break Bug（parser.js 第 93 行）

`(cc === '}' || cc === ']')` 改为 `cc === ']'`，仅在遇到数组闭合 `]` 时 break。循环后检查 `buf` 是否以 `]` 结尾，若否则补 `]`。

### 修复4：新增 _extractBlocksFromRaw 兜底函数（parser.js）

当 `repairJson` 全部失败返回空对象时，直接从原始 rawText 提取 blocks：

1. 定位 `"blocks"` 关键字后的 `[`
2. 用括号匹配（尊重字符串状态）找到闭合 `]`
3. 若找到完整数组，直接 `JSON.parse` 提取
4. 若截断未找到 `]`，按顶层逗号分割提取每个 `{...}` 对象，逐个 `JSON.parse`，跳过失败对象
5. 返回有效 blocks 数组或 null

### 修复5：parseNarrative fallback 增强（parser.js 第 172-218 行）

在现有 fallback 链中增加一层：当 `s.blocks.length === 0` 且 rawText 包含 `"blocks"` 时，调用 `_extractBlocksFromRaw(rawText)`，成功提取则通过 `sanitizeScene({blocks: extracted})` 清洗后赋值给 `s.blocks`。

### 修复6：api.js 错误分类（api.js 第 419-431 行）

- `fetch()` reject（网络层错误）：catch 后重新 throw，附加 `e.isNetworkError = true; e.retryable = true`
- `!resp.ok`：附加 `err.httpStatus = resp.status`，429/5xx 设 `err.retryable = true`，400/401/403 设 `err.retryable = false`

### 修复7：ai-generator.js 指数退避 + 错误分类（ai-generator.js）

- 新增 `_sleep(ms)`：`return new Promise(function(resolve) { setTimeout(resolve, ms); })`
- catch 块：检查 `e.retryable === false` → 直接 throw（不浪费重试次数）；可重试错误 → `await _sleep(1500 * Math.pow(2, attempt))` 后 continue
- 导出 `formatAIError(e)`：根据 `e.isNetworkError` / `e.httpStatus` 返回不同提示文案

### 修复8：game-engine.js 统一错误提示（game-engine.js 10 处 catch 块）

import `formatAIError`，将 `showToast('⚠️ AI 生成失败：' + e.message + '，请点击刷新按钮重试。')` 替换为 `showToast('⚠️ ' + formatAIError(e))`。

## 实现注意事项

- **性能**：退避延迟仅在网络错误时触发，正常请求零开销。`_extractBlocksFromRaw` 仅在 `repairJson` 全部失败后触发，正常解析路径无额外开销。最坏情况总等待 4.5s（1.5s + 3s 退避）。
- **日志**：保留现有 `console.warn` 日志，增加退避延迟日志和 blocks 提取日志，便于调试。
- **爆炸半径**：不改 `callDeepSeek` 请求逻辑/参数/超时，只改错误抛出方式。不改 `game-engine.js` catch 逻辑结构，只替换消息字符串。`_extractBlocksFromRaw` 作为独立函数，不影响现有 `repairJson` 流程。旧存档无影响（无状态字段变更）。

## 目录结构

```
src/
├── parser.js           # [MODIFY] 修复 repairJson 3 个 Bug + 新增 _extractBlocksFromRaw + parseNarrative fallback 增强
├── api.js              # [MODIFY] callDeepSeek 错误附加 isNetworkError/httpStatus/retryable 属性
├── ai-generator.js     # [MODIFY] 添加 _sleep + 指数退避 + 错误分类 + 导出 formatAIError
└── game-engine.js      # [MODIFY] 10 处 catch 块用 formatAIError(e) 替换硬编码消息
```