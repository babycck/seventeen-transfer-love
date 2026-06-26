---
name: API网络错误重试退避修复
overview: 针对浏览器直连 DeepSeek API 出现的 ERR_CONNECTION_CLOSED / ERR_NETWORK_CHANGED / Failed to fetch 瞬时网络错误，在 ai-generator.js 增加指数退避重试延迟，在 api.js 区分可重试网络错误与不可重试 HTTP 错误，并改善用户侧错误提示，避免立即重试撞同样网络问题。
todos:
  - id: api-error-metadata
    content: api.js callDeepSeek 为 Error 附加 httpStatus/isNetworkError/retryable 属性，区分可重试与不可重试错误
    status: pending
  - id: backoff-and-classify
    content: ai-generator.js 添加 _sleep + 指数退避(1.5s/3s) + 错误分类跳过不可重试 + 导出 formatAIError
    status: pending
    dependencies:
      - api-error-metadata
  - id: game-engine-messages
    content: game-engine.js 8 处 catch 块用 formatAIError(e) 替换硬编码错误消息
    status: pending
    dependencies:
      - backoff-and-classify
  - id: build-verify
    content: Vite 构建验证无报错
    status: pending
    dependencies:
      - game-engine-messages
---

## 用户需求

用户报告部署后浏览器直连 DeepSeek API 出现网络错误（`ERR_CONNECTION_CLOSED` / `ERR_NETWORK_CHANGED` / `Failed to fetch`），导致 AI 剧情生成失败，游戏无法继续。

## 问题根因

当前 `ai-generator.js` 的 `generateWithRetry()` 在网络错误时**立即重试无延迟**，瞬时网络波动（WiFi/LTE 切换、VPN 断连、GFW 包检测等）下 3 次重试在几秒内全部失败。同时错误未分类，401/400 等不可重试错误也会浪费重试次数。

## 核心功能

- 为网络错误添加指数退避延迟（1.5s → 3s），给网络恢复时间
- 区分可重试错误（网络错误 / 429 / 5xx）与不可重试错误（401 / 400 / 403），避免浪费重试
- 最终失败时根据错误类型给出更精准的用户提示（网络问题 / API Key 无效 / 频率限制 / 服务不可用）

## 技术栈

- 原有栈不变：Vanilla JS (ES Modules) + Vite，浏览器原生 `fetch` API
- 不引入新依赖

## 实现方案

### 核心策略：指数退避 + 错误分类

在 `ai-generator.js` 的 `generateWithRetry()` catch 块中，将原来的 `continue`（立即重试）改为 `await _sleep(delay)` + `continue`，delay 按指数退避递增（1.5s, 3s）。同时对错误进行分类：不可重试的 HTTP 错误（401/400/403）直接抛出不浪费重试次数。

### 关键技术决策

1. **退避策略选择 1.5s 基数 + 指数递增**：`ERR_NETWORK_CHANGED` 通常 2-5 秒恢复，1.5s + 3s = 4.5s 总等待覆盖大部分瞬时网络问题。不使用 jitter（随机抖动）因为单用户场景无并发竞争。

2. **错误分类通过 Error 属性传递**：在 `api.js` 中为 thrown Error 附加 `httpStatus` / `isNetworkError` / `retryable` 属性，`ai-generator.js` 读取这些属性决定是否重试。不引入自定义 Error 子类，保持与现有 `var` 风格一致。

3. **用户提示通过 `formatAIError(e)` 统一**：在 `ai-generator.js` 导出 helper 函数，`game-engine.js` 所有 catch 块调用它替代硬编码消息，一处修改覆盖全部场景。

## 实现细节

### 修改文件清单

```
src/
├── api.js             # [MODIFY] callDeepSeek 错误附加 httpStatus/isNetworkError/retryable 属性
├── ai-generator.js    # [MODIFY] 添加 _sleep + 指数退避 + 错误分类 + 导出 formatAIError
└── game-engine.js     # [MODIFY] ~8 处 catch 块用 formatAIError(e) 替换硬编码消息
```

### api.js 改动（行 419-431）

- `fetch()` reject 时（网络层错误）：catch 后重新 throw，附加 `e.isNetworkError = true; e.retryable = true;`
- `!resp.ok` 时：附加 `err.httpStatus = resp.status;`，429/5xx 设 `err.retryable = true`，4xx 设 `err.retryable = false`
- `testAPIConnection()` 不改（它已有自己的 try-catch）

### ai-generator.js 改动

- 新增 `_sleep(ms)`：`return new Promise(function(resolve) { setTimeout(resolve, ms); });`
- 新增 `_isNonRetryableError(e)`：检查 `e.httpStatus` 是否为 400/401/403
- catch 块改为：
- 不可重试错误 → `throw e`（不浪费重试次数）
- 可重试错误 → `await _sleep(1500 * Math.pow(2, attempt))` 然后 `continue`
- 最后一次 attempt → throw 带友好消息的 Error
- 新增并导出 `formatAIError(e)`：根据 `e.isNetworkError` / `e.httpStatus` 返回不同提示文本

### game-engine.js 改动

- import `{ formatAIError }` from `./ai-generator.js`
- 8 处 `showToast('⚠️ AI 生成失败：' + e.message + '，请点击刷新按钮重试。')` → `showToast('⚠️ ' + formatAIError(e))`
- 2 处选项生成的 catch 块不改（已有独立兜底逻辑）

## 注意事项

- **性能**：退避延迟仅在网络错误时触发，正常请求零开销。最坏情况总等待 4.5s（1.5s + 3s），可接受。
- **日志**：保留现有 `console.warn` 日志，增加退避延迟日志 `[ai-generator] attempt N network error, retrying in Xms...`，便于调试。
- **爆炸半径**：不改 `callDeepSeek` 的请求逻辑/参数/超时，只改错误抛出方式。不改 `game-engine.js` 的 catch 逻辑结构，只替换消息字符串。旧存档无影响（无状态字段变更）。