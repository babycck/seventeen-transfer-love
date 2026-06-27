---
name: fix-oneheart-narrative-and-compression
overview: 针对 1v1「只为你心动」模式的 6 项改进：剧情连续显示、剧情区撑满屏幕、修复自动弹键盘、回顾弹窗调整、修复通用按钮无响应、剧情压缩机制。所有修改仅影响 1v1 模式，换乘恋爱完全不变。
todos:
  - id: continuous-narrative
    content: 修改 narrative-box.js，1v1 模式移除 consequence 间的 separator 和 choice-tag
    status: completed
  - id: oneheart-layout-fix
    content: 修改 ui-renderer.js 和 style.css，实现 1v1 剧情区 flex 撑满、移除自动 focus、补充通用按钮绑定
    status: completed
  - id: review-modal-adjust
    content: 修改 review-modal.js，1v1 模式只显示每日压缩记忆 tab
    status: completed
  - id: compression-mechanism
    content: 修改 state.js 新增字段、game-engine.js 增加压缩逻辑、api-settings-modal.js 增加导出分支
    status: completed
    dependencies:
      - continuous-narrative
---

## 产品概述

针对 1v1「只为你心动」模式进行 6 项 UI 和逻辑优化，提升剧情阅读连贯性、屏幕空间利用率、操作体验和长局性能。

## 核心功能

1. **连续剧情显示**：去掉 1v1 模式下每段后续剧情之间的分隔虚线和"你的选择"标签，所有正文连续排列
2. **剧情区撑满屏幕**：1v1 模式下正文区动态填满 header 到底部操作栏之间的空间，消除底部空白
3. **修复自动弹键盘**：展开操作栏时不再自动聚焦输入框，由用户主动点击才弹键盘
4. **回顾弹窗调整**：1v1 模式下隐藏"历史剧情"tab，只保留"每日压缩记忆"tab
5. **修复通用按钮无响应**：1v1 模式下设置/帮助/礼物按钮点击无反应的 bug 修复
6. **剧情压缩机制**：每 15 次生成后压缩前 10 段为摘要存入回顾，原文缓存保留用于导出

## 技术栈

- 语言/运行时：JavaScript (ES Modules), Node.js 18+
- 框架：Vanilla JS + Vite 5.4
- AI API：DeepSeek (deepseek-chat)
- 纯 CSS + 浏览器原生 API，不引入新依赖
- 使用 `var` 而非 `let/const`，字符串用 `+` 拼接（遵循项目约定）

## 实现方案

### 修改 1：连续剧情渲染（仅 1v1）

**文件**：`src/ui/narrative-box.js` — `renderNarrativeSection()` 函数（第 127-177 行）

在 `consequenceNarratives` 渲染循环中加入 `var isOneHeart = GS.gameMode === 'oneHeart'` 判断：

- 1v1 模式：跳过 `<div class="separator">` 和 `<div class="choice-tag">`，只渲染 `renderParsedNarrative(cn.parsed)`
- 换乘模式：保留原有分隔元素，完全不变
- 保留 `#narrativeNewContent` 容器（打字机效果依赖）

### 修改 2：1v1 剧情区 flex 撑满

**文件**：`src/ui-renderer.js` — `renderAll()` 函数（第 52-71 行）

在渲染前根据 gameMode 给 `#app` 加/移除 `oneheart-mode` class：

```javascript
if (GS.gameMode === 'oneHeart' && GS.step >= 5) {
  app.classList.add('oneheart-mode');
} else {
  app.classList.remove('oneheart-mode');
}
```

**文件**：`src/style.css` — 追加 CSS 规则：

```css
#app.oneheart-mode {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 110px;
}
#app.oneheart-mode .card:has(> .narrative-box) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
#app.oneheart-mode .narrative-box {
  flex: 1;
  max-height: none;
  overflow-y: auto;
}
```

`:has()` 选择器在 Chrome 105+/Edge 105+/Safari 15.4+/Firefox 121+ 已支持，2026 年目标用户无兼容问题。

### 修改 3：移除展开时自动弹键盘

**文件**：`src/ui-renderer.js` — `bindOneHeartEvents()` 中 operationToggle 事件（第 1910-1917 行）

移除 `if (isHidden) { var inp = document.getElementById('freeInput'); if (inp) inp.focus(); }` 这段代码，只保留 display 切换。

### 修改 4：1v1 回顾弹窗调整

**文件**：`src/modals/review-modal.js` — `showReviewModal()` 函数

1v1 模式下：

- 只渲染 `<button class="tab-btn active" id="reviewTabSummary">` 一个 tab
- 隐藏 `reviewHistoryContent`，默认显示 `reviewSummaryContent`
- 跳过 SMS tab（已有逻辑）

### 修改 5：修复 1v1 通用按钮无响应

**文件**：`src/ui-renderer.js` — `bindOneHeartEvents()` 函数末尾

补充绑定：settingsBtn → showApiSettingsModal、helpBtn → showHelpMergedModal、giftBtn → showGiftPanel、backToTopBtn → 滚动 narrativeBox。这些函数已在文件顶部 import。

### 修改 6：剧情压缩机制（滚动窗口）

**压缩策略**：

- 新增状态字段 `oneHeartGenCount`（计数器，初始 0）和 `oneHeartArchivedNarratives`（缓存数组，初始 []）
- 每次剧情生成（选项/自由输入/拉回主线/随机事件/走向大结局，不含重新生成）后 +1
- 当 `oneHeartGenCount >= 15` 且 `consequenceNarratives.length >= 10` 时触发：

1. 取前 10 条，调用 AI 压缩成摘要（复用 `compressTodayToSummary` 逻辑）
2. 摘要追加到 `GS.dailySummaries`
3. 10 条原文移入 `GS.oneHeartArchivedNarratives`
4. 从 `consequenceNarratives` 删除这 10 条
5. `oneHeartGenCount -= 10`

- 之后每累积 10 次再触发，始终保持最近 5 段未压缩

**导出兼容**：`exportStoryTxt()` 增加 1v1 分支，从 `oneHeartArchivedNarratives` + `consequenceNarratives` 拼接完整原文。

## 实现要点

- `generateOneHeartRound()` 中 `extra` 参数已区分 isEnding/isRandom，"重新生成"也走此函数但不传 extra，需要在函数内判断：只有 `!extra` 之外的调用才计数（重新生成时 extra 为 undefined 但实际是 regenerate 按钮触发，需额外标记）
- 实际上 `regenerate` 按钮也调用 `generateOneHeartRound()` 无 extra 参数，需要通过在调用处传 `extra = { isRegenerate: true }` 来排除计数
- AI 压缩调用需异步等待，压缩期间显示 loading，不阻塞 UI 渲染（先渲染新剧情，后台压缩）
- `migrateSave()` 中为新字段做兜底初始化，兼容旧存档

## 目录结构

```
src/
├── ui/
│   └── narrative-box.js          # [MODIFY] 1v1 模式移除 separator 和 choice-tag
├── ui-renderer.js                # [MODIFY] renderAll 加 class；移除 focus；补充按钮绑定
├── ui/
│   └── header-bar.js             # [MODIFY] 无需改动（reviewBtn 已在 review-modal 内调整）
├── modals/
│   ├── review-modal.js           # [MODIFY] 1v1 隐藏历史剧情 tab
│   └── api-settings-modal.js     # [MODIFY] exportStoryTxt 增加 1v1 分支
├── state.js                      # [MODIFY] 新增 oneHeartGenCount、oneHeartArchivedNarratives
├── game-engine.js                # [MODIFY] generateOneHeartRound 增加计数和压缩
└── style.css                     # [MODIFY] 新增 1v1 flex 布局规则
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在实现前进一步验证关键代码位置和调用关系，确保修改不遗漏
- Expected outcome: 确认 generateOneHeartRound 的所有调用点和 extra 参数传递方式，避免压缩计数逻辑出错