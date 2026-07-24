---
name: entSim交互修复合集v4
overview: 八部分合并：①skipValidate 修复 ②日程纯展示 ③加载保留原剧情+自动滚动 ④探班 3 选 1 ⑤下一个行程按钮 ⑥男主/情敌行程增强（新增 MALE_LEAD_POOL + RIVAL_POOL 升级为 {key,loc} + 哥哥池扩充 + prompts 注入男主行程）⑦舆论池扩充到 100 条 ⑧构建验证。
todos:
  - id: fix-skipvalidate
    content: "修改 ai-generator.js:51 加 || opts.plainText；immersion.js:69 和 engine.js:274 各追加 skipValidate: true"
    status: pending
  - id: schedule-system
    content: cycle.js 新增 MALE_LEAD_POOL + RIVAL_POOL 升级{key,loc} + 哥哥池扩到12 + rollDailyAgenda 加 maleLead/maleLeadLoc；state.js migration 兜底；prompts.js context 加男主行程；ui.js renderAgenda 非队友改 div.es-ag-tag + 新增男主展示项；style.css 加 .es-ag-tag
    status: pending
  - id: loading-scroll
    content: engine.js:42 innerHTML 改 insertAdjacentHTML 追加+滚动；ui.js __renderEntSim 和 rerender 末尾加自动滚动；style.css 加 .es-loading-inline + @keyframes
    status: pending
    dependencies:
      - schedule-system
  - id: visit-nextbtn
    content: ui.js import showVisitChoiceModal；新增 showEntSimVisitChoice()（用 agenda.maleLead 等）；onQuick visit 改调它；renderQuickActions 加 nextagenda 按钮；onQuick 加 nextagenda 分支调 continueEntSimMain
    status: pending
    dependencies:
      - loading-scroll
  - id: expand-buzz-pool
    content: data.js DAILY_BUZZ_TEMPLATES 三池各从 16 条扩到 100 条，覆盖舞台/签售/综艺/绯闻/商业/粉丝文化等多维度场景
    status: pending
  - id: build-verify
    content: 运行 Vite 构建确认无语法错误
    status: pending
    dependencies:
      - fix-skipvalidate
      - schedule-system
      - loading-scroll
      - visit-nextbtn
      - expand-buzz-pool
---

## 产品概述

entSim 模式交互修复与增强合集：修复纯文本生成被误校验、日程按钮重复生成剧情、加载时原有剧情消失、生成后不滚动、探班缺少选择步骤等问题；新增男主/哥哥/情敌独立行程系统；扩展舆论素材池至 300 条。

## 核心功能

- skipValidate 根治：plainText 调用自动跳过 JSON 校验，粉丝反应/结局叙事恢复
- 日程系统增强：新增男主行程池、情敌档升级为 {key,loc}、哥哥池扩充；日程项改纯展示不可点击
- 加载保留原剧情：engine 层 innerHTML 改 append 追加，原有剧情不消失
- 自动滚动：render 后 es-narrative 滚到底部
- 探班 3 选 1：复用 showVisitChoiceModal，从 agenda 构建男主/哥哥/情敌选项
- 新增「下一个行程」按钮：调 continueEntSimMain 推进剧情
- 舆论池扩充：hotSearch/fanDiscussion/mediaTitle 各从 16 条扩到 100 条

## Tech Stack

- JavaScript (ES Modules), Vanilla JS + Vite, 无新增依赖
- 复用现有 `showVisitChoiceModal`（modals/visit-choice-modal.js）和 `showActionInfoModal`（modals/confirm-modal.js）

## Implementation Approach

### Part A: skipValidate 根治（3 文件 3 处）

**`src/ai-generator.js:51`**：`if (skipValidate)` -> `if (skipValidate || opts.plainText)`

根治原理：`plainText: true` 本就意味不使用 JSON（第 23 行 `useJson = !opts.plainText` 已据此关闭 `response_format=json_object`），对纯文本做 JSON 结构校验逻辑矛盾。

**`src/ent-sim/immersion.js:69`** 和 **`src/ent-sim/engine.js:274`**：opts 各追加 `skipValidate: true`（显式防御）。

### Part B: 日程系统增强 + 纯展示（cycle.js + state.js + prompts.js + ui.js + style.css）

**`src/ent-sim/cycle.js`**：

1. 新增 `MALE_LEAD_POOL`（15 条 {key,loc}）：巡演/录音/综艺/打歌/画报/签售/练习/Vlive/电台/广告/休息/海外行程/采访/舞台彩排/通话会
2. `RIVAL_POOL` 从纯文本数组升级为 `{key,loc}` 数组（10 条）：同场打歌/个人直播/新剧开机/颁奖典礼/营业活动/品牌站台/综艺嘉宾/画报拍摄/签售会/休息
3. 哥哥池从 4 个硬编码扩到 12 个：团队练习/组合录音/团体行程/海外巡演/综艺录制/画报拍摄/打歌舞台/粉丝签售/Vlive直播/电台通告/休息/广告拍摄
4. `rollDailyAgenda()` 加 `maleLead`/`maleLeadLoc` 字段，`rival` 改用 `.key`/`.loc`

**`src/state.js:472-476`**：migration 加 `maleLead`/`maleLeadLoc`/`rivalLoc` 默认值兜底

**`src/ent-sim/prompts.js:132`**：`buildEntSimContextSnapshot` 今日日程行追加男主「`E.agenda.maleLead(maleLeadLoc)`」，情敌行追加地点

**`src/ent-sim/ui.js:134-149`** `renderAgenda()`：

- 非 teammate 项（含新增 maleLead）改 `<div class="es-ag-tag">`
- teammate 保持 `<button class="es-ag-btn" data-agenda="teammate">`
- 新增 maleLead 展示项 icon `💜`
- 移除 doneFlags 检查

**`src/style.css` 2390 行后**：新增 `.es-ag-tag` 静态样式

### Part C: 加载保留原剧情 + 自动滚动（engine.js + ui.js + style.css）

**根因**：`engine.js:42` `_nEl.innerHTML = '...'` 清空整个 narrative 容器。

**修复 `engine.js:42`**：

```
_nEl.insertAdjacentHTML('beforeend', '<div class="es-loading-inline">✨ 正在加载剧情…</div>');
_nEl.scrollTop = _nEl.scrollHeight;
```

**`ui.js`**：`__renderEntSim`（42-47 行）和 `rerender()`（484-488 行）末尾各加 `setTimeout` 滚动 `es-narrative` 到底部。

**`style.css`**：加 `.es-loading-inline` + `@keyframes es-fade-in`

### Part D: 探班 3 选 1 + 下一个行程按钮（ui.js）

**import 行**：追加 `showVisitChoiceModal` 到 `from '../modals.js'`。

**新增 `showEntSimVisitChoice()` async 函数**：从 `E.agenda.maleLead/maleLeadLoc` + `E.agenda.brother/brotherLoc` + `E.agenda.rival/rivalLoc` 构建选择列表，调 `showVisitChoiceModal` → `showActionInfoModal` 确认 → `triggerEntSimEvent` 生成。

**`onQuick('visit')`**：改为 `showEntSimVisitChoice().then(rerender)`

**`renderQuickActions()`**：在 nextday 前加 `{q:'nextagenda',label:'下一个行程'}`

**`onQuick()`**：加 `else if (q === 'nextagenda') { continueEntSimMain().then(rerender); }`

### Part E: 舆论池扩充（data.js）

`DAILY_BUZZ_TEMPLATES` 三池各从 16 条扩到 100 条。保留原 16 条，新增 84 条/池，覆盖舞台/回归/签售/综艺/绯闻/商业/粉丝文化/危机公关等多维度场景。`{name}` = 女主名。

## Implementation Notes

- `engine.js:42` 的 append 修复是根因修复，所有生成路径自动受益
- `es-narrative` 有 `max-height: 56vh; overflow-y: auto`，scrollTop = scrollHeight 可正确滚动
- `__renderEntSim` 是主渲染路径（rerender 优先调它），两个路径都需加滚动
- `showVisitChoiceModal` 返回 `Promise<roleKey|null>`，取消时返回 null 需短路
- `pickN` 使用 splice 抽取（已抽出不放回），但跨天重新调 pickN，扩池到 100 条可显著降低重复概率
- 旧存档 migration 需兜底 `maleLead`/`maleLeadLoc`/`rivalLoc` 空字符串
- `RIVAL_POOL` 升级后 `rollDailyAgenda` 需用 `.key`/`.loc` 而非直接赋值字符串
- 非 plainText 的 entSim 主剧情仍走 `validateEntSimNarrative`，不受影响
- 换乘恋爱和 1v1 模式完全不受影响

## Directory Structure

```
src/
├── ai-generator.js          # [MODIFY] 第51行 if (skipValidate) -> if (skipValidate || opts.plainText)
├── style.css                # [MODIFY] 加 .es-ag-tag；加 .es-loading-inline + @keyframes
├── state.js                 # [MODIFY] migration 加 maleLead/maleLeadLoc/rivalLoc 默认值
├── ent-sim/
│   ├── data.js              # [MODIFY] DAILY_BUZZ_TEMPLATES 三池各扩到 100 条
│   ├── cycle.js             # [MODIFY] 新增 MALE_LEAD_POOL；RIVAL_POOL 升级为 {key,loc}；哥哥池扩到 12 个；rollDailyAgenda 加 maleLead/maleLeadLoc
│   ├── immersion.js         # [MODIFY] 第69行 opts 追加 skipValidate: true
│   ├── engine.js            # [MODIFY] 第42行 innerHTML 改 insertAdjacentHTML 追加+滚动；第274行 opts 追加 skipValidate: true
│   ├── prompts.js           # [MODIFY] buildEntSimContextSnapshot 第132行加男主行程注入
│   └── ui.js                # [MODIFY] 6处：
│                            #   ①import 追加 showVisitChoiceModal
│                            #   ②renderAgenda 非队友改 div.es-ag-tag + 新增 maleLead 展示项
│                            #   ③__renderEntSim + rerender 末尾加自动滚动
│                            #   ④renderQuickActions 加 nextagenda 按钮
│                            #   ⑤onQuick 加 nextagenda 分支 + visit 改调 showEntSimVisitChoice
│                            #   ⑥新增 showEntSimVisitChoice() 函数
```