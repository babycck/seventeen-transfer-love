---
name: skipValidate+日程纯展示+探班3选1
overview: 三部分合并：①skipValidate bug 修复（粉丝反应/结局叙事纯文本生成被 JSON 校验误杀）；②日程按钮改纯展示（主档/相关/情敌/哥哥不再直接生成剧情，仅队友互动保留按钮）；③探班快捷指令增加 3 选 1 选择弹窗（复用 1v1 的 showVisitChoiceModal），选完后确认再生成探班剧情，而非直接生成。
todos:
  - id: fix-ai-generator
    content: ai-generator.js:51 将 if (skipValidate) 改为 if (skipValidate || opts.plainText)
    status: pending
  - id: fix-immersion-engine
    content: "immersion.js:69 和 engine.js:274 两处 generateWithRetry opts 各追加 skipValidate: true"
    status: pending
    dependencies:
      - fix-ai-generator
  - id: agenda-display-only
    content: ui.js renderAgenda 非队友项改渲染为 div.es-ag-tag，队友保持 button；style.css 加 .es-ag-tag 静态样式
    status: pending
  - id: visit-3choice
    content: ui.js 新增 showEntSimVisitChoice 函数（复用 showVisitChoiceModal + showActionInfoModal），onQuick visit 分支改为调用它
    status: pending
    dependencies:
      - agenda-display-only
  - id: build-verify
    content: Vite 构建验证无语法错误
    status: pending
    dependencies:
      - fix-ai-generator
      - fix-immersion-engine
      - agenda-display-only
      - visit-3choice
---

## 用户需求

用户连续反馈 3 个 entSim 模式问题，合并修复：

### 1. 粉丝圈反应生成失败（skipValidate bug）

`generateFanReaction`（immersion.js:69）和 `runEntSimEnding`（engine.js:274）调用 `generateWithRetry` 时传了 `plainText: true` 但漏传 `skipValidate: true`，导致 AI 正确输出的纯文本被 `validateEntSimNarrative`（期望 JSON）误校验，parser 解析出空 narrative，报「0 字 + 缺 options」，3 次重试全失败。粉丝反应内容质量很好，修好后通过右栏已有的「营业反馈」按钮即可查看。

### 2. 日程按钮直接生成剧情与主线重复

entSim 系统要求主线剧情已围绕今日日程展开，但点击日程按钮（主档/相关/情敌/哥哥）又调 `triggerEntSimEvent` 生成独立剧情，内容重叠。改为纯展示信息标签（不可点击、不生成剧情），仅保留「队友互动」按钮。

### 3. 探班快捷指令缺少选择步骤

entSim 的探班快捷指令（ui.js:538）直接 `triggerEntSimEvent('探班：...')` 生成剧情，无选择步骤。1v1 模式的 `doVisitMember`（game-engine.js:2500）有完整的 3 选 1 流程：先弹 `showVisitChoiceModal` 选探谁，再弹确认框，最后生成。entSim 应复用此模式，从 agenda 构建 3 个探班目标（男主/哥哥/情敌）。

## 产品概述

修复 entSim 三处交互问题：纯文本生成被误校验导致功能不可用、日程按钮生成重复剧情、探班缺少选择步骤。修复后粉丝反应正常生成可查看、日程仅展示不触发剧情、探班先选目标再生成。

## 核心功能

- skipValidate 根治：plainText 调用自动跳过 JSON 校验
- 日程纯展示：非队友日程项变信息标签，队友互动保留按钮
- 探班 3 选 1：复用 showVisitChoiceModal，从 agenda 构建男主/哥哥/情敌三选项

## Tech Stack

- 语言: JavaScript (ES Modules), 项目现有栈 Vanilla JS + Vite
- 无新增依赖，复用现有 `showVisitChoiceModal`（modals/visit-choice-modal.js）和 `showActionInfoModal`（modals/confirm-modal.js）

## Implementation Approach

### Part A: skipValidate 根治（3 文件 3 处 1 行改动）

**`src/ai-generator.js:51`**：`if (skipValidate)` → `if (skipValidate || opts.plainText)`

根治原理：`plainText: true` 本就意味不使用 JSON（第 23 行 `useJson = !opts.plainText` 已据此关闭 `response_format=json_object`），对纯文本做 JSON 结构校验逻辑矛盾。加 `|| opts.plainText` 后所有纯文本调用自动跳过校验，根治所有漏传场景。

**`src/ent-sim/immersion.js:69`** 和 **`src/ent-sim/engine.js:274`**：opts 各追加 `skipValidate: true`（显式防御性冗余）。

### Part B: 日程按钮改纯展示（ui.js + style.css）

**`src/ent-sim/ui.js` `renderAgenda()`（134-149 行）**：

当前所有日程项统一渲染为 `<button class="es-ag-btn" data-agenda="...">`。改为：

- 非 teammate 项（main/related/rival/brother）渲染为 `<div class="es-ag-tag">`，无 `data-agenda`、无按钮语义
- teammate 保持 `<button class="es-ag-btn" data-agenda="teammate">`
- 移除 `doneFlags` 检查（纯展示不需要完成态）

**`src/style.css` 2390 行后**：新增 `.es-ag-tag` 样式，复用 `.es-ag-btn` 基础布局（flex/padding/border/radius），但 `cursor: default`、无 `:hover` 效果、文字颜色偏暗（`var(--es-text-dim)`）、图标 opacity 0.6，视觉区分信息标签 vs 可点按钮。

**不需要改动**：`bindEntSimEvents`（433 行）的 `.es-ag-btn[data-agenda]` 选择器只会匹配 teammate 按钮；`onAgendaClick` 非 teammate 分支变为死代码，保留不删（最小改动）。

### Part C: 探班 3 选 1（ui.js）

**import 行**：`import { showApiSettingsModal } from '../modals.js'` → 追加 `showVisitChoiceModal`。

**新增 `showEntSimVisitChoice()` 函数**：

1. 从 `E.agenda` 构建选择列表：

- 男主：`{ roleKey: 'maleLead', label: '男主', name: ml.name, task: '待机/休息', place: '待机室', type: 'solo', note: '探男主增进感情，但有曝光风险' }`
- 哥哥（仅 brother 存在时）：`{ roleKey: 'brother', label: '哥哥', name: bro.name, task: E.agenda.brother, place: E.agenda.brotherLoc, type: 'team', note: '探哥哥强化兄妹信任' }`
- 情敌：`{ roleKey: 'rival', label: '情敌', name: rivalNode.name, task: E.agenda.rival, place: '活动场地', type: 'solo', note: '探情敌让哥哥起疑' }`

2. 调 `showVisitChoiceModal(choices)` 获取选择
3. 调 `showActionInfoModal` 确认（显示选中目标的地点/行程/注意事项）
4. 确认后调 `triggerEntSimEvent` 生成探班剧情，prompt 按 roleKey 定制

**`onQuick('visit')` 分支**：改为 `showEntSimVisitChoice().then(rerender)` 替代直接 `triggerEntSimEvent`。

### 数据来源确认

- 男主名：`GS.entSim.romance.maleLead.name`
- 哥哥名：`GS.oneHeartRelationCharacter.name || GS.entSim.brother.name`
- 情敌名：`GS.entSim.npcNetwork.nodes['npc_rival'].name`
- 日程：`E.agenda.main/mainLoc`、`E.agenda.rival`、`E.agenda.brother/brotherLoc`

## Implementation Notes

- `showVisitChoiceModal` 返回 `Promise<roleKey|null>`，取消时返回 null 需短路
- entSim 不加每日探班次数限制（与 1v1 不同，entSim 快捷指令本就无次数限制）
- 非 plainText 的 entSim 主剧情仍走 `validateEntSimNarrative`，不受影响
- 已正确传参的 3 处（game-engine.js:3841/3950、engine.js:218）行为不变
- 换乘恋爱和 1v1 模式完全不受影响

## Architecture Design

无需架构变更。3 处修改均在现有 entSim 模块内完成，复用现有 modal 组件和事件链路。

## Directory Structure

```
src/
├── ai-generator.js          # [MODIFY] 第51行 if (skipValidate) → if (skipValidate || opts.plainText)
├── style.css                # [MODIFY] 2390行后新增 .es-ag-tag 静态样式（无hover/cursor:default）
├── ent-sim/
│   ├── immersion.js         # [MODIFY] 第69行 generateWithRetry opts 追加 skipValidate: true
│   ├── engine.js            # [MODIFY] 第274行 generateWithRetry opts 追加 skipValidate: true
│   └── ui.js                # [MODIFY] 3处：①import 追加 showVisitChoiceModal ②renderAgenda 非队友改div.es-ag-tag ③onQuick visit 分支改调 showEntSimVisitChoice + 新增该函数
```