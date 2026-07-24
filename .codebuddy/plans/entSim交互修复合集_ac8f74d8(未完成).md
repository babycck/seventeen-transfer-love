---
name: entSim交互修复合集
overview: 五部分合并：①skipValidate bug 修复 ②日程按钮改纯展示 ③探班 3 选 1 ④剧情生成后自动滚到底部 ⑤点选项后在正文底部显示加载提示且原有剧情不消失。
todos:
  - id: fix-skipvalidate
    content: "修改 ai-generator.js:51 加 || opts.plainText；immersion.js:69 和 engine.js:274 各追加 skipValidate: true"
    status: pending
  - id: agenda-display-only
    content: ui.js renderAgenda 非队友项改 div.es-ag-tag；style.css 加 .es-ag-tag 静态样式
    status: pending
  - id: auto-scroll-loading
    content: ui.js __renderEntSim 和 rerender 末尾加自动滚动；新增 showNarrativeLoading() 并在选项确认/自由输入/快捷指令处调用；style.css 加 .es-loading-inline
    status: pending
    dependencies:
      - agenda-display-only
  - id: visit-3choice
    content: ui.js import 追加 showVisitChoiceModal；新增 showEntSimVisitChoice() 函数；onQuick visit 分支改为调用它
    status: pending
    dependencies:
      - auto-scroll-loading
  - id: build-verify
    content: 运行 Vite 构建确认无语法错误
    status: pending
    dependencies:
      - fix-skipvalidate
      - agenda-display-only
      - auto-scroll-loading
      - visit-3choice
---

## 产品概述

修复 entSim 模式 5 个交互问题：纯文本生成被误校验导致粉丝反应/结局叙事不可用、日程按钮生成重复剧情、探班缺少选择步骤、剧情生成后页面不滚动、点选项后无加载提示且原有剧情消失。

## 核心功能

- skipValidate 根治：plainText 调用自动跳过 JSON 校验，粉丝反应/结局叙事恢复正常
- 日程纯展示：主档/相关/情敌/哥哥变信息标签不触发剧情，仅队友互动保留按钮
- 探班 3 选 1：复用 showVisitChoiceModal 从 agenda 构建男主/哥哥/情敌选项，确认后生成
- 自动滚动：render 后 es-narrative 容器滚到底部，新内容立即可见
- 加载指示：点选项/自由输入/快捷指令后在正文底部追加"正在加载剧情"，原有剧情保留不消失

## Tech Stack

- JavaScript (ES Modules), Vanilla JS + Vite, 无新增依赖
- 复用现有 `showVisitChoiceModal`（modals/visit-choice-modal.js）和 `showActionInfoModal`（modals/confirm-modal.js）

## Implementation Approach

### Part A: skipValidate 根治（3 文件 3 处 1 行改动）

**`src/ai-generator.js:51`**：`if (skipValidate)` → `if (skipValidate || opts.plainText)`

根治原理：`plainText: true` 本就意味不使用 JSON（第 23 行 `useJson = !opts.plainText` 已据此关闭 `response_format=json_object`），对纯文本做 JSON 结构校验逻辑矛盾。加 `|| opts.plainText` 后所有纯文本调用自动跳过校验。

**`src/ent-sim/immersion.js:69`**：opts 追加 `skipValidate: true`（显式防御）。
**`src/ent-sim/engine.js:274`**：opts 追加 `skipValidate: true`（同上）。

### Part B: 日程按钮改纯展示（ui.js + style.css）

**`src/ent-sim/ui.js` `renderAgenda()`（134-149 行）**：

- 非 teammate 项（main/related/rival/brother）渲染为 `<div class="es-ag-tag">`，无 `data-agenda`
- teammate 保持 `<button class="es-ag-btn" data-agenda="teammate">`
- 移除 `doneFlags` 检查（纯展示不需要完成态）

实现：将 `items` 数组分为 `displayItems`（main/related/rival/brother）和 `teammateItem`，分别用不同标签渲染。

**`src/style.css` 2390 行后**：新增 `.es-ag-tag` 样式，复用 `.es-ag-btn` 基础布局（flex/padding/border/radius），但 `cursor: default`、无 `:hover`、文字颜色 `var(--es-text-dim)` 偏暗、图标 opacity 0.6。

**不需要改动**：`bindEntSimEvents`（433 行）`.es-ag-btn[data-agenda]` 选择器只匹配 teammate 按钮；`onAgendaClick` 非 teammate 分支变为死代码保留不删。

### Part C: 探班 3 选 1（ui.js）

**import 行（10 行）**：`import { showApiSettingsModal } from '../modals.js'` → 追加 `showVisitChoiceModal`。

**新增 `showEntSimVisitChoice()` async 函数**：

1. 从 `E.agenda` + `E.romance.maleLead` + `E.npcNetwork.nodes['npc_rival']` + `GS.oneHeartRelationCharacter` 构建选择列表：

- 男主：`{ roleKey: 'maleLead', label: '男主', name: ml.name, task: E.agenda.main, place: E.agenda.mainLoc, note: '探男主增进感情，但有曝光风险' }`
- 哥哥（仅 `E.agenda.brother` 存在时）：`{ roleKey: 'brother', label: '哥哥', name: bro.name, task: E.agenda.brother, place: E.agenda.brotherLoc, note: '探哥哥强化兄妹信任' }`
- 情敌（仅 `E.agenda.rival` 存在时）：`{ roleKey: 'rival', label: '情敌', name: rivalNode.name, task: E.agenda.rival, place: '活动场地', note: '探情敌让哥哥起疑' }`

2. 调 `showVisitChoiceModal(choices)` 获取 roleKey，null 则取消
3. 调 `showActionInfoModal` 确认（显示选中目标的地点/行程/注意事项）
4. 确认后调 `triggerEntSimEvent` 生成探班剧情，prompt 按 roleKey 定制场景描述

**`onQuick('visit')` 分支（538 行）**：改为 `showEntSimVisitChoice().then(rerender)` 替代直接 `triggerEntSimEvent`。

### Part D: 自动滚动 + 加载指示（ui.js + style.css）

**自动滚动**：

- `__renderEntSim`（42-47 行）：末尾加 `setTimeout(function() { var n = document.getElementById('es-narrative'); if (n) n.scrollTop = n.scrollHeight; }, 0);`
- `rerender()`（484-488 行）：同样在 innerHTML 替换后加 setTimeout 滚动

**加载指示**：

- 新增 `showNarrativeLoading()` 辅助函数：在 `#es-narrative` 末尾 `insertAdjacentHTML('beforeend', '<div class="es-loading-inline">✨ 正在加载剧情…</div>')`，然后 `scrollTop = scrollHeight`
- 调用点：
- 选项确认（694 行）：`closeEntSimModal()` 后、`handleEntSimChoice` 前调 `showNarrativeLoading()`
- 自由输入（498 行）：`handleEntSimFreeInput(t)` 前调
- 快捷指令（535-539 行）：各 async 调用前调（main/event/hypo/visit/nextday）
- `rerender()` 完成后用新内容替换含 loading 的旧 DOM，loading 自动消失

**CSS**：`.es-loading-inline { padding: 16px; text-align: center; color: var(--es-text-dim); font-size: 13px; animation: es-fade-in .3s ease; }` + `@keyframes es-fade-in { from { opacity: 0; } to { opacity: 1; } }`

## Implementation Notes

- `showVisitChoiceModal` 返回 `Promise<roleKey|null>`，取消时返回 null 需短路
- entSim 不加每日探班次数限制（与 1v1 不同，保持简单）
- `es-narrative` 有 `max-height: 56vh; overflow-y: auto`，scrollTop = scrollHeight 可正确滚动
- `__renderEntSim` 是主渲染路径（rerender 优先调它），两个路径都需加滚动
- 非 plainText 的 entSim 主剧情仍走 `validateEntSimNarrative`，不受影响
- 已正确传参的 3 处（game-engine.js:3841/3950、engine.js:218）行为不变
- 换乘恋爱和 1v1 模式完全不受影响

## Directory Structure

```
src/
├── ai-generator.js          # [MODIFY] 第51行 if (skipValidate) → if (skipValidate || opts.plainText)
├── style.css                # [MODIFY] 2390行后加 .es-ag-tag；2388行后加 .es-loading-inline + @keyframes
├── ent-sim/
│   ├── immersion.js         # [MODIFY] 第69行 opts 追加 skipValidate: true
│   ├── engine.js            # [MODIFY] 第274行 opts 追加 skipValidate: true
│   └── ui.js                # [MODIFY] 5处改动：
│                            │   ①import 追加 showVisitChoiceModal (第10行)
│                            │   ②renderAgenda 非队友改 div.es-ag-tag (134-149)
│                            │   ③__renderEntSim + rerender 末尾加自动滚动 (42-48, 484-488)
│                            │   ④新增 showNarrativeLoading() + 在选项确认/自由输入/快捷指令处调用
│                            │   ⑤新增 showEntSimVisitChoice() + onQuick visit 分支改调它 (538)
```