---
name: fix-console-errors-github-pages
overview: 修复 GitHub Pages 部署后的控制台报错：404 资源找不到 + handleFreeAction 选项生成返回空数组 + option-engine.js return null 逻辑缺陷
todos:
  - id: fix-option-engine-return
    content: "Fix option-engine.js line 63: return null to return options, and export fallbackOptions with affection fields"
    status: completed
  - id: fix-game-engine-dispatch
    content: "Fix game-engine.js: replace GS.currentOptions direct assignment with dispatch SET_OPTIONS in both generatePhaseNarrative and handleFreeAction, add affection fields to fallback options"
    status: completed
    dependencies:
      - fix-option-engine-return
  - id: fix-404-favicon
    content: Add favicon to index.html to eliminate 404 on GitHub Pages
    status: completed
  - id: verify-and-deploy
    content: Rebuild, test locally, then push to deploy to GitHub Pages
    status: completed
    dependencies:
      - fix-option-engine-return
      - fix-game-engine-dispatch
      - fix-404-favicon
---

## 需求概述

修复用户在 GitHub Pages（https://babycck.github.io/seventeen-transfer-love/）上遇到的运行时错误：

1. **404 资源未找到** — 页面加载时某个资源返回 404，推测为 `favicon.ico`（项目中不存在）或与 `manifest.json` 路径有关
2. **`[handleFreeAction] 选项生成返回空数组`** — 自由输入剧情后 AI 生成的选项为空数组，导致警告日志输出且兜底选项不通过 store dispatch 更新、缺少好感度字段

## 修复要点

- **Bug A**: `option-engine.js` 中 `generateStandardOptions` 函数构建选项数组后 `return null`（第 63 行），应改为 `return options`，导致所有非特殊场景的骨架选项生成均失效
- **Bug B**: `game-engine.js` 中 `generatePhaseNarrative` 和 `handleFreeAction` 两处，当 AI 选项生成返回空数组或失败时，直接赋值 `GS.currentOptions` 而未通过 `dispatch({ type: 'SET_OPTIONS' })` 更新，且兜底选项（"继续观察情况"等）缺少 `affName`/`affDelta`，选择后不会触发好感度变化
- **Bug C**: 项目中缺失 `favicon.ico`，GitHub Pages 自动请求 `/favicon.ico` 导致 404；同时资源加载 404 的日志干扰调试

## 技术方案

### 实现策略

1. **`option-engine.js`**: `generateStandardOptions` 末尾 `return null` 改为 `return options`。同时将 `fallbackOptions()` 扩展为带 `affName`/`affDelta` 的兜底选项函数，供其他模块复用。
2. **`game-engine.js`**: 两处兜底逻辑统一重构：

- 提取 `getFallbackOptions()` 辅助函数返回带好感度的兜底选项（根据 `GS.selectedMembers` 随机映射 3 个成员的 activity 选项）
- 将 `GS.currentOptions = [...]` 替换为 `dispatch({ type: 'SET_OPTIONS', payload: { options: fallbackOpts } })`
- 同时更新 `GS.pendingAffChanges` 以便后续好感度结算

3. **HTML / favicon**: 在 `public/` 下添加简单 favicon 或通过 `<link rel="icon">` 指向 SVG/Emoji favicon，消除 404 日志。

### 关键设计决策

- **dispatch 统一性**: `SET_OPTIONS` 是 store 中定义的 action，通过 dispatch 触发可保证 subscriber 通知 + saveGame 自动调用。直接修改 `GS.currentOptions` 绕过了这一流程，属于不一致行为。
- **兜底选项质量**: 原兜底选项"继续观察情况/主动参与对话/找个借口离开"不包含成员名，导致 `triggerAffectionFromChoice` 的 fallback 匹配（从文本中匹配成员名）无法命中。改为引用 `GS.selectedMembers` 中的真实成员，使好感度系统可正常工作。
- **404 处理**: `manifest.json` 在 `dist/` 中存在，GitHub Pages 部署后路径正确。`favicon.ico` 缺失是唯一确认的 404 来源，添加一个 favicon 即可解决。

### 修改清单

- `src/skeleton/option-engine.js` — [MODIFY] 第 63 行 `return null` → `return options`
- `src/game-engine.js` — [MODIFY] 两处兜底逻辑（`generatePhaseNarrative` ~line 268-282、`handleFreeAction` ~line 944-959）使用 dispatch + 带成员名的兜底选项
- `index.html` — [MODIFY] 添加 `<link rel="icon" href="data:image/svg+xml,...">` 消除 favicon 404

### 不涉及改动

- 无需改动 `parser.js`、`store.js`、`option-panel.js`
- 无需引入新依赖
- 不增加新文件，不改动部署流程

### 性能与风险

- 修复后可减少控制台警告日志输出
- 兜底选项带好感度字段后，自由输入时的用户体验更流畅
- 重构不涉及 AI 调用逻辑修改，不影响既有 prompt 和生成流程