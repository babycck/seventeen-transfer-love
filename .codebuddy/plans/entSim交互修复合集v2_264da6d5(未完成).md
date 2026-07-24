---
name: entSim交互修复合集v2
overview: 六部分合并：①skipValidate 修复 ②日程纯展示 ③探班 3 选 1 ④自动滚动+加载提示 ⑤新增「进入下一个行程」快捷按钮（调 continueEntSimMain，给玩家明确推进入口）⑥构建验证。
todos:
  - id: fix-skipvalidate
    content: "修改 ai-generator.js:51 加 || opts.plainText；immersion.js:69 和 engine.js:274 各追加 skipValidate: true"
    status: pending
  - id: agenda-display-only
    content: ui.js renderAgenda 非队友项改 div.es-ag-tag；style.css 加 .es-ag-tag 静态样式
    status: pending
  - id: fix-loading-scroll
    content: engine.js:42 innerHTML 改 insertAdjacentHTML 追加+滚动；ui.js __renderEntSim 和 rerender 末尾加自动滚动；style.css 加 .es-loading-inline
    status: pending
    dependencies:
      - agenda-display-only
  - id: visit-3choice
    content: ui.js import 追加 showVisitChoiceModal；新增 showEntSimVisitChoice()；onQuick visit 分支改为调用它
    status: pending
    dependencies:
      - fix-loading-scroll
  - id: next-agenda-btn
    content: ui.js renderQuickActions 加 nextagenda 按钮；onQuick 加 nextagenda 分支调 continueEntSimMain
    status: pending
    dependencies:
      - visit-3choice
  - id: build-verify
    content: 运行 Vite 构建确认无语法错误
    status: pending
    dependencies:
      - fix-skipvalidate
      - agenda-display-only
      - fix-loading-scroll
      - visit-3choice
      - next-agenda-btn
---

## 产品概述

修复 entSim 模式 6 个交互问题，提升玩家体验：纯文本生成被误校验导致粉丝反应不可用、日程按钮生成重复剧情、剧情生成时原有内容被清空、生成后页面不滚动、探班缺少选择步骤、日程改纯展示后缺少推进入口。

## 核心功能

- skipValidate 根治：plainText 调用自动跳过 JSON 校验，粉丝反应/结局叙事恢复
- 日程纯展示：主档/相关/情敌/哥哥变信息标签不触发剧情，仅队友互动保留按钮
- 加载保留原剧情：engine 层将 innerHTML 替换改为 append 追加，原有剧情不消失
- 自动滚动：render 后 es-narrative 容器滚到底部，新内容立即可见
- 探班 3 选 1：复用 showVisitChoiceModal 从 agenda 构建选项，确认后生成
- 新增「下一个行程」按钮：放在「进入下一天」旁，调 continueEntSimMain 推进剧情

## Tech Stack

- JavaScript (ES Modules), Vanilla JS + Vite, 无新增依赖
- 复用现有 `showVisitChoiceModal`（modals/visit-choice-modal.js）和 `showActionInfoModal`（modals/confirm-modal.js）

## Implementation Approach

### Part A: skipValidate 根治（3 文件 3 处）

**`src/ai-generator.js:51`**：`if (skipValidate)` -> `if (skipValidate || opts.plainText)`

根治原理：`plainText: true` 本就意味不使用 JSON（第 23 行 `useJson = !opts.plainText` 已据此关闭 `response_format=json_object`），对纯文本做 JSON 结构校验逻辑矛盾。

**`src/ent-sim/immersion.js:69`** 和 **`src/ent-sim/engine.js:274`**：opts 各追加 `skipValidate: true`（显式防御）。

### Part B: 日程按钮改纯展示（ui.js + style.css）

**`ui.js renderAgenda()`（134-149 行）**：非 teammate 项（main/related/rival/brother）渲染为 `<div class="es-ag-tag">`，无 `data-agenda`；teammate 保持 `<button class="es-ag-btn" data-agenda="teammate">`。移除 `doneFlags` 检查。

**`style.css` 2390 行后**：新增 `.es-ag-tag` 样式，复用 `.es-ag-btn` 基础布局，但 `cursor: default`、无 `:hover`、文字颜色偏暗。

### Part C: 加载保留原剧情 + 自动滚动（engine.js + ui.js + style.css）

**根因**：`engine.js:42` `_nEl.innerHTML = '<div class="es-loading">...</div>'` 直接清空了整个 narrative 容器。所有生成路径（continueEntSimMain/handleEntSimChoice/handleEntSimFreeInput/triggerEntSimEvent/triggerEntSimHypothetical/goEntSimNextDay）都走 `generateEntSimRound`，都命中此行。

**修复 `engine.js:41-42`**：改为追加而非替换：

```
_nEl.insertAdjacentHTML('beforeend', '<div class="es-loading-inline">✨ 正在加载剧情…</div>');
_nEl.scrollTop = _nEl.scrollHeight;
```

**自动滚动 `ui.js`**：`__renderEntSim`（42-47 行）和 `rerender()`（484-488 行）末尾各加：

```
setTimeout(function() { var n = document.getElementById('es-narrative'); if (n) n.scrollTop = n.scrollHeight; }, 0);
```

**CSS**：`.es-loading-inline { padding: 16px; text-align: center; color: var(--es-text-dim); font-size: 13px; animation: es-fade-in .3s ease; }` + `@keyframes es-fade-in`

### Part D: 探班 3 选 1（ui.js）

**import 行（10 行）**：追加 `showVisitChoiceModal` 到 `from '../modals.js'`。

**新增 `showEntSimVisitChoice()` async 函数**：

1. 从 `E.agenda` + `E.romance.maleLead` + `E.npcNetwork.nodes['npc_rival']` + `GS.oneHeartRelationCharacter` 构建选择列表（男主/哥哥/情敌）
2. 调 `showVisitChoiceModal(choices)` 获取 roleKey
3. 调 `showActionInfoModal` 确认
4. 确认后调 `triggerEntSimEvent` 生成探班剧情

**`onQuick('visit')`（538 行）**：改为 `showEntSimVisitChoice().then(rerender)`

### Part E: 新增「下一个行程」按钮（ui.js）

**`renderQuickActions()`（190-197 行）**：在 `nextday` 前追加 `{ q: 'nextagenda', label: '下一个行程' }`。

**`onQuick()`（533-541 行）**：加 `else if (q === 'nextagenda') { continueEntSimMain().then(rerender); }`，与「拉回主线」同函数但更直观的入口名。

## Implementation Notes

- `engine.js:42` 的 append 修复是根因修复，无需在 UI 层每个触发点加 `showNarrativeLoading()`，所有生成路径自动受益
- `es-narrative` 有 `max-height: 56vh; overflow-y: auto`，`scrollTop = scrollHeight` 可正确滚动
- `__renderEntSim` 是主渲染路径（rerender 优先调它），两个路径都需加滚动
- `showVisitChoiceModal` 返回 `Promise<roleKey|null>`，取消时返回 null 需短路
- entSim 不加每日探班次数限制（与 1v1 不同）
- 已正确传参的 3 处（game-engine.js:3841/3950、engine.js:218）行为不变
- 换乘恋爱和 1v1 模式完全不受影响

## Directory Structure

```
src/
├── ai-generator.js          # [MODIFY] 第51行 if (skipValidate) -> if (skipValidate || opts.plainText)
├── style.css                # [MODIFY] 2390行后加 .es-ag-tag；加 .es-loading-inline + @keyframes
├── ent-sim/
│   ├── immersion.js         # [MODIFY] 第69行 opts 追加 skipValidate: true
│   ├── engine.js            # [MODIFY] 第42行 innerHTML替换改为 insertAdjacentHTML 追加+滚动；第274行 opts 追加 skipValidate: true
│   └── ui.js                # [MODIFY] 6处：
│                            #   ①import 追加 showVisitChoiceModal (第10行)
│                            #   ②renderAgenda 非队友改 div.es-ag-tag (134-149)
│                            #   ③__renderEntSim + rerender 末尾加自动滚动 (42-48, 484-488)
│                            #   ④renderQuickActions 加 nextagenda 按钮 (190-197)
│                            #   ⑤onQuick 加 nextagenda 分支 + visit 改调 showEntSimVisitChoice (533-541)
│                            #   ⑥新增 showEntSimVisitChoice() 函数
```