---
name: 修复AbortError AI生成失败
overview: 修复 AbortError 导致 AI 生成失败的问题：给 ai-generator.js 的 generateWithRetry 加网络错误重试，更新 api.js 过期注释，重新构建生产包。
todos:
  - id: fix-generate-with-retry
    content: 在 ai-generator.js:21 给 callDeepSeek() 加 try/catch 网络错误重试
    status: completed
  - id: fix-api-comment
    content: 修正 api.js:415 过时注释 "30s" -> "60s"
    status: completed
  - id: rebuild-dist
    content: 执行 npm run build 重建 dist 使修复生效
    status: completed
    dependencies:
      - fix-generate-with-retry
      - fix-api-comment
---

## 用户需求

修复 `handleOptionChoice` 中 AI 生成超时报错 `AbortError: signal is aborted without reason`，该错误在当前生产构建中频繁出现。

## 问题根因（已探查确认）

1. **`generateWithRetry` 无网络错误处理**（`src/ai-generator.js:21`）：`callDeepSeek()` 抛出 AbortError 时，try/catch 缺失，retry 机制（maxAttempts=2）被完全绕过，异常直接透传到 caller 的 catch
2. **生产构建未重建**：`dist/assets/index-V-eThje-.js` 中仍是旧代码（30s 超时），我之前的 `api.js` 60s 修改未生效
3. **注释过期**：`api.js:415` 仍写着 "30s 超时"，实际值已为 60000

## 范围

- 修改 `src/ai-generator.js` 1 处（核心修复）
- 修改 `src/api.js` 1 处（注释清理）
- 执行 `npm run build` 重建

- 不需要改 `game-engine.js`（已有 catch 错误提示）
- 不需要改 `api.js` 的超时值（60s 已够用，关键是 retry）

## 技术方案

### 核心思路

给 `generateWithRetry` 中 `callDeepSeek()` 调用加 try/catch，捕获 AbortError/fetch 异常后在循环中继续重试，用完 maxAttempts 次后再向外抛。

### 具体实施

**`ai-generator.js:20-21` 修改：**

```javascript
// 修改前：异常直接透传，retry 被绕过
for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var raw = await callDeepSeek(...);
    // ...

// 修改后：网络错误时继续重试，用完次数再抛
for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var raw;
    try {
        raw = await callDeepSeek(...);
    } catch (e) {
        console.warn('[ai-generator] attempt ' + (attempt + 1) + ' network error: ' + e.message);
        if (attempt < maxAttempts - 1) continue;
        throw e;  // 全部重试失败，交给 caller 的 catch
    }
    // ...
```

**`api.js:415` 修改：**

```javascript
// 修改前
// 30s 超时，防止 AI 卡住无限等待
// 修改后
// 60s 超时，防止 AI 卡住无限等待（含重试余量）
```

### 设计决策理由

1. **不新增 maxAttempts**：当前 2 次够用。第一次 AbortError（旧构建 30s），第二次在 60s 超时下大概率成功
2. **不分离网络/validation retry**：保持简单，共享 attempt budget。网络错误 + validation 错误的组合概率极低
3. **保持 throw 行为**：最后仍 throw 让 callers（`handleOptionChoice`/`generatePhaseNarrative`）的 catch 做 toast 提示，用户无需重复造轮子

### 影响范围

- `generateWithRetry` 有 13 处调用（`game-engine.js` 中 13 处 `var _gr = await generateWithRetry(...)`）
- 改一处即保护所有调用点，包括 `handleOptionChoice`、`generatePhaseNarrative`、`handleFreeAction`、醉酒剧情、短信剧情、真心话等

## Agent Extensions

无相关扩展需要。