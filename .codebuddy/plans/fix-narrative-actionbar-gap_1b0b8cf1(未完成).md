---
name: fix-narrative-actionbar-gap
overview: 减小剧情正文与底部操作栏之间的间距，消除多个 .card margin 叠加造成的过大空隙。
todos:
  - id: reduce-action-section-gap
    content: "在 style.css 中添加 #actionSection .card { margin-bottom: 4px } 规则，并移除 .action-bar 的 margin-top（改为 0），减小剧情正文与操作栏之间的间距"
    status: pending
---

减小剧情正文与底部操作栏之间的间距，解决多个 `.card` 元素 margin 叠加导致的界面空隙过大问题。修改后界面更紧凑，视觉连贯性更好。

## 技术方案

### 实现方式

纯 CSS 调整，不改动任何 JS 逻辑。针对操作区域 `#actionSection` 内的间距做精确控制。

### 改动要点

1. **`#actionSection` 内的 `.card` 减小 `margin-bottom`** — 从全局 10px 降到 4px，不影响上方剧情区的间距
2. **移除 `.action-bar` 的 `margin-top: 10px`** — 操作栏内部的顶部间距改为由外层 `.card` 的 padding 控制（同一个 card 内不需要额外的 margin-top）
3. **保留 `.action-bar` 的 `border-top` 虚线分隔线和 `padding-top`** — 保持操作栏和选项面板之间的视觉分割感

### 间距变化对比

| 位置 | 修改前 | 修改后 |
| --- | --- | --- |
| 剧情 card → 选项 card | 10px | 不变（不受影响） |
| 选项 card → 操作 card | 10px | 4px |
| 操作栏内部顶边距 | 10px (margin-top) + 8px (padding-top) = 18px | 8px (padding-top) = 8px |
| 最简累积间距 | 10 + 10 + 10 = 30px | 0 + 4 + 0 = 4px |


### 修改说明：为什么不在剧情区和选项区中间也缩减

剧情区和选项面板之间保持原有的 10px 间距，因为这两者是不同功能区域（阅读 vs 选择），需要有清晰的视觉分隔。缩减主要针对操作栏区域，因为操作栏和选项面板是同一个交互层级的连续操作区域。

### 涉及文件

- `d:\SEVENTEEN\src\style.css` — 唯一修改文件，新增一条 CSS 规则