---
name: fix-day11-options-use-ai
overview: 修复 Day 11 上午/下午显示模板兜底选项的问题，让其走 AI 基于剧情生成选项
todos:
  - id: fix-option-engine
    content: 修复 option-engine.js：Day 11 返回 null 让 AI 生成选项
    status: pending
  - id: build-and-commit
    content: 构建项目并提交两个修复（gift-panel.js + option-engine.js）
    status: pending
    dependencies:
      - fix-option-engine
  - id: push-remote
    content: 推送提交到远程仓库
    status: pending
    dependencies:
      - build-and-commit
---

## 问题概述

两个 bug 需要修复并推送：

### Bug 1: 回礼描述 AI 输出思考过程（已修复，待提交）

- 回礼描述弹窗显示了 AI 的思考过程（"好的，用户要求以《换乘恋爱》叙事AI的身份..."），而非只输出描述文本
- 已在 `src/modals/gift-panel.js` 修复：prompt 强化 + 后处理正则剥离

### Bug 2: Day 11 选项显示兜底模板（待修复）

- Day 11 上午/下午（phase 0/1）的选项是"和XX一起做早餐"等模板，而非 AI 基于剧情生成的选项
- 根因：`src/skeleton/option-engine.js` 的 `generateOptions()` 中，Day 11 phase 0/1 时 `truthState` 尚未初始化（phase 2 才初始化），跳过真心话分支，走到 `generateStandardOptions()` 返回 3 个模板选项
- `game-engine.js:248-250` 中 `skeletonConfig.optionEngine` 默认 true，模板选项 length > 0 直接赋给 `GS.currentOptions`，跳过 AI 选项生成
- 修复方案：在 `generateOptions()` 中对 Day 11 返回 null（与 `generateDatingOptions()` 一致），让 AI 基于剧情生成选项

## Tech Stack

- 语言/运行时：JavaScript (ES Modules), Node.js 18+
- 框架：Vanilla JS + Vite 5.4
- 约定：使用 `var` 而非 `let/const`，字符串拼接使用 `+` 运算符

## Implementation Approach

### Bug 2 修复（option-engine.js）

在 `src/skeleton/option-engine.js` 的 `generateOptions()` 函数中，真心话判断（line 25-28）之后、默认分支（line 38-39）之前，添加 Day 11 返回 null 的判断：

```javascript
// Day 11 非真心话时段：交由 AI 基于剧情生成选项（truthState 未初始化时 phase 0/1 走此分支）
if (day === 11) {
  return null;
}
```

**逻辑分析**：

- Day 11 phase 0/1：`truthState` 未初始化 → 跳过真心话判断 → 命中新判断 → 返回 null → AI 生成选项（修复）
- Day 11 phase 2：`truthState` 已初始化且 active → 真心话判断返回 [] → 不会走到新判断（不变）
- Day 11 phase 3：深夜判断返回 [] → 不会走到新判断（不变）
- 其他天：不受影响

**为什么返回 null 而非空数组**：

- `game-engine.js:249` 检查 `skeletonOpts && skeletonOpts.length > 0`，null 不满足条件，进入 AI 选项生成分支
- 与 `generateDatingOptions()` 返回 null 的模式完全一致

### 性能影响

- Day 11 phase 0/1 会额外发起一次 AI 选项生成调用（约 1000 tokens），与其他正常天一致
- 无额外内存开销

### Implementation Notes

- `game-engine.js` 中 AI 选项生成失败时已有三级兜底：叙事自带选项 → `skeletonGetFallbackOpts()` 模板选项，不会出现无选项的情况
- `dist/` 需要重新构建
- 不修改 `skeletonConfig` 默认配置，避免影响其他天的行为