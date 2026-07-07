---
name: fix-scroll-to-new-narrative
overview: "修复换乘恋爱模式生成新剧情后页面弹回最顶部的问题：更新 scrollToLatestContent 函数，优先滚动到 #narrativeNewContent 或最后一个 .consequence-item，而非旧的 .separator。"
todos:
  - id: fix-scroll-target
    content: "更新 scrollToLatestContent 滚动目标为 #narrativeNewContent / .consequence-item / .separator"
    status: completed
---

## 用户需求

换乘恋爱模式中，每次生成新剧情时页面会自动滚动回最开始的旧剧情，用户希望页面直接滚动到新生成的剧情部分，方便阅读新内容而不需要手动往下翻。

## 问题原因

`scrollToLatestContent()` 函数查找的是旧的 `.separator` 分割线元素，但新版 `renderNarrativeSection()` 已改用 `.consequence-item` 和 `#narrativeNewContent`。找不到 `.separator` 时函数不执行滚动，页面从顶部开始显示。

## 修改目标

更新 `scrollToLatestContent()` 的滚动目标选择器，优先滚动到新生成的剧情区域，同时保持向后兼容。

## 技术方案

### 修改文件

- `src/ui-renderer.js` — `scrollToLatestContent()` 函数（行 1977-1993）

### 实现方式

更新 `scrollToLatestContent()` 中的 DOM 查找逻辑，按优先级顺序滚动到最新内容：

1. **`#narrativeNewContent`** — 最新打字机内容区（有后续剧情时的最后一条）
2. **最后一个 `.consequence-item`** — 后续剧情块
3. **`.separator`** — 旧格式兜底（向后兼容）
4. **无匹配时不滚动** — 首次生成，保持从顶部阅读（现有行为保留）

### 代码变更

在 `scrollToLatestContent()` 的 setTimeout 回调中，替换当前只查找 `.separator` 的逻辑为上述优先级链式查找。每找到一个目标即 `scrollIntoView({ behavior: 'smooth', block: 'start' })` 并 return，未找到则不做任何滚动。

### 注意事项

- 保持 `mrBody`（记忆审查面板）的最高优先级不变
- 保持 100ms setTimeout 延迟不变（确保 DOM 已渲染）
- 不影响 1v1 模式的滚动行为