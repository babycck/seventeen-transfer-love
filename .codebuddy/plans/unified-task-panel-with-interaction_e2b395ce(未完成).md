---
name: unified-task-panel-with-interaction
overview: 统一任务卡和秘密任务系统：行动类任务在底部操作栏加"做任务"按钮立即生成剧情，输入类任务在面板输入后注入下一段剧情。
todos:
  - id: classify-mission-cards
    content: 在 data.js 中为 MISSION_CARDS 10张卡添加 type 字段（input/action）
    status: pending
  - id: add-state-and-cleanup
    content: 在 state.js 新增 pendingTaskResult 字段与 migrateSave 兜底；scheduler.js 新增 cleanupMissionCard()
    status: pending
    dependencies:
      - classify-mission-cards
  - id: add-core-logic
    content: 在 game-engine.js 新增 doActionTask()、completeTaskInput()、completeMissionCard()，调整 proceedToNextDay 流程，弹框改 Toast
    status: pending
    dependencies:
      - add-state-and-cleanup
  - id: create-task-panel
    content: 创建 src/modals/task-panel.js 统一任务面板，输入类显示文本框、行动类显示做任务按钮
    status: pending
    dependencies:
      - add-core-logic
  - id: integrate-ui
    content: 在 action-bar.js 加做任务按钮，header-bar.js 加任务按钮+角标，ui-renderer.js 替换通知条并绑定事件，modals.js 导出
    status: pending
    dependencies:
      - create-task-panel
  - id: add-archive-tab
    content: 在 archive-modal.js 新增任务卡历史 Tab，显示名称/描述/天数/完成状态/提交内容
    status: pending
    dependencies:
      - classify-mission-cards
  - id: inject-ai-prompt
    content: 在 prompts.js 注入 pendingTaskResult 到 buildUserMessage，同时注入活跃行动类任务卡指令
    status: pending
    dependencies:
      - classify-mission-cards
---

## 用户需求

改善 Transfer 模式的"制作组任务卡"系统，当前仅有一次性红色弹框，关闭后完全消失，无持续显示、无完成入口、无历史记录。

## 产品概述

将任务卡和秘密任务合并为统一的任务面板系统。根据任务类型提供不同的交互方式：行动类任务在底部操作栏提供"做任务"按钮，点击后 AI 立刻生成一段剧情场景展示任务执行；输入类任务在面板内提供文本输入框，完成后将内容注入下一段 AI 剧情生成。同时提供 header 角标提示、归档历史记录。

## 核心功能

- **任务分类**：任务卡分为输入类（三行诗、写纸条、真心话抽取、交换物品、幕后采访）和行动类（沉默游戏、换位晚餐、一日经纪人、秘密信号、双人任务）
- **统一任务面板**：任务卡和秘密任务集中显示，输入类显示文本输入框+完成按钮，行动类显示"做任务"按钮
- **行动类任务执行**：底部操作栏"跳过进入下一时段"旁新增"做任务"按钮，点击后 AI 立刻生成任务剧情场景
- **输入类任务执行**：面板内输入内容后点完成，系统记录并注入下一段 AI 剧情生成，不立即生成
- **任务提示**：Header 任务按钮带红色角标显示活跃任务数；剧情区上方提示条显示进行中任务
- **历史记录**：归档面板新增"任务卡"Tab，显示所有任务卡历史（含提交内容、完成状态）
- **跨天清理**：进入下一天时未完成的任务卡自动记录为"未完成"

## Tech Stack

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+
- 框架：Vanilla JS + Vite
- AI API：DeepSeek (deepseek-chat)
- 不引入新依赖，所有功能使用浏览器原生 API

## Implementation Approach

### 核心策略

复用现有 `handleFreeAction` 的 AI 调用模式（`buildSystemPrompt` + `buildUserMessage` + `generateWithRetry` + `parseNarrative` + `dispatch PUSH_CONSEQUENCE`），为行动类任务实现即时剧情生成；为输入类任务实现延迟注入机制（`pendingTaskResult` → `buildUserMessage` 注入 → 清空）。

### 关键技术决策

**行动类任务 — 即时生成**

- `doActionTask()` 复用 `buildUserMessage('freeAction', { actionText })` 传入任务描述作为 actionText
- AI 生成后通过 `dispatch PUSH_CONSEQUENCE` 追加到剧情流，choiceText 为 `🎴 执行任务：任务名`
- 不递增 `phaseFreeCount`（任务执行是独立行为，不消耗行动次数）
- 任务执行后立即标记完成并清空 `todayMissionCard`

**输入类任务 — 延迟注入**

- `completeTaskInput(playerInput)` 仅写入 `GS.pendingTaskResult`，不调用 AI
- 下一次 `buildUserMessage()` 时检测并注入 `[INSTRUCTION]` 指令，注入后清空
- AI 在正常剧情生成中自然体现任务执行场景

**为什么这样设计**

- 行动类任务不需要玩家输入内容，任务描述本身就是行动指令，适合即时生成
- 输入类任务需要玩家的创意内容（如三行诗），注入到下一段剧情更自然，避免单独调用 AI 产生割裂感
- 两种方式都复用现有 AI 调用基础设施，不引入新的调用路径

### Performance & Reliability

- 行动类任务 AI 调用复用 `generateWithRetry`（最多3次重试 + correction 反馈），与自由输入一致
- 输入类任务无额外 AI 调用，零性能开销
- `pendingTaskResult` 注入后立即清空，不会重复注入
- 跨天清理确保 `todayMissionCard` 不残留

## Implementation Notes

- 遵循现有代码风格：`var` 声明、`+` 字符串拼接、`escHtml` 转义
- 所有 AI 生成文本插入 DOM 前必须经过 `escHtml()` 转义
- 禁止 `alert()`/`confirm()`，统一使用 `showToast()`/`showConfirmModal()`
- `GS` 引用不可被替换（`setGS` 使用 `Object.assign`）
- `store.js` 的 `SET_FLAG` 白名单已包含 `todayMissionCard`，无需修改
- 不影响 1v1 模式（所有新增逻辑在 `GS.gameMode === 'transfer'` 分支内）
- `handleFreeAction` 的 AI 调用模式（第950-1037行）是 `doActionTask` 的参考模板
- 事件绑定位置在 `ui-renderer.js` 第1745行附近（`btnSkip`/`btnNextPhase` 绑定处）

## Architecture Design

### 数据流

```
任务卡触发 (proceedToNextDay → checkMissionCard)
  │
  ├── Toast 提示 "收到新的制作组任务卡：XXX"
  ├── Header 🎴 按钮显示红色角标
  ├── 剧情区提示条 "你有 1 个进行中的任务"
  │
  ├── 行动类任务 (type='action')
  │     │
  │     ├── 底部操作栏显示 "🎴 做任务" 按钮
  │     ├── 玩家点击 → doActionTask()
  │     │     ├── buildSystemPrompt() + buildUserMessage('freeAction', {actionText: 任务描述})
  │     │     ├── generateWithRetry() → parseNarrative() → applyParsedSideEffects()
  │     │     ├── dispatch PUSH_CONSEQUENCE (choiceText: '🎴 执行任务：XXX')
  │     │     ├── 标记完成 → push missionCardHistory → 清空 todayMissionCard
  │     │     └── 渲染 UI（角标消失，提示条消失）
  │     └── 也可以在任务面板内点击 "做任务"
  │
  ├── 输入类任务 (type='input')
  │     │
  │     ├── 玩家打开任务面板 → 看到文本输入框
  │     ├── 输入内容 → 点击 "完成任务"
  │     ├── completeTaskInput(playerInput)
  │     │     ├── GS.pendingTaskResult = { taskName, taskDesc, playerInput }
  │     │     ├── 标记完成 → push missionCardHistory (含 playerInput)
  │     │     ├── 清空 todayMissionCard
  │     │     └── Toast "任务已记录，将在后续剧情中体现"
  │     │
  │     └── 下一次 generatePhaseNarrative / handleOptionChoice / handleFreeAction
  │           ├── buildUserMessage() 检测 pendingTaskResult
  │           ├── 注入 [INSTRUCTION] 指令到 user message
  │           ├── 清空 pendingTaskResult
  │           └── AI 在剧情中自然体现任务执行场景
  │
  └── 跨天未完成 → cleanupMissionCard()
        ├── push missionCardHistory { completed: false }
        └── todayMissionCard = null
```

### 秘密任务（保持不变）

- 仍在任务面板中显示，提供"已完成"按钮调用 `completeSecretMission()`
- 通知条被统一提示条替代，但完成逻辑不受影响

## Directory Structure

```
src/
├── data.js                    # [MODIFY] MISSION_CARDS 每项加 type: 'input'|'action'
├── state.js                   # [MODIFY] 新增 pendingTaskResult 字段 + migrateSave 兜底
├── skeleton/
│   └── scheduler.js           # [MODIFY] 新增 cleanupMissionCard() 导出；resetDayState 重置
├── game-engine.js             # [MODIFY] 新增 doActionTask()、completeTaskInput()、completeMissionCard()；
│                              #        修改 proceedToNextDay 流程；showMissionCardModal 改 Toast
├── ui/
│   ├── action-bar.js          # [MODIFY] 新增 "🎴 做任务" 按钮（行动类任务活跃时显示）
│   └── header-bar.js          # [MODIFY] 新增 🎴 任务按钮 + 红色角标
├── ui-renderer.js             # [MODIFY] 统一提示条替换秘密任务通知条；新增事件绑定
├── prompts.js                 # [MODIFY] 注入 pendingTaskResult + 活跃行动类任务卡指令
├── modals.js                  # [MODIFY] 导出 showTaskPanel
└── modals/
    ├── task-panel.js          # [NEW] 统一任务面板弹窗
    └── archive-modal.js       # [MODIFY] 新增第5个 Tab「任务卡」历史记录
```

### 文件详细说明

**src/data.js** [MODIFY]

- 给 `MISSION_CARDS` 数组每项补充 `type` 字段
- mc_1/2/4/5/9 → `'action'`，mc_3/6/7/8/10 → `'input'`

**src/state.js** [MODIFY]

- `defaultGameState()` 新增 `pendingTaskResult: null`
- `migrateSave()` 新增 `if (GS.pendingTaskResult === undefined) GS.pendingTaskResult = null`

**src/skeleton/scheduler.js** [MODIFY]

- 新增 `export function cleanupMissionCard()`：未完成任务推入 `missionCardHistory`，清空 `todayMissionCard`
- `resetDayState()` 中加 `GS.todayMissionCard = null`

**src/game-engine.js** [MODIFY]

- 顶部 import 新增 `cleanupMissionCard as skeletonCleanupMissionCard`
- `proceedToNextDay()` 第1384行后新增 `skeletonCleanupMissionCard()` 调用
- `showMissionCardModal()` 改为 `showToast('收到新的制作组任务卡：' + card.name)`，不再弹模态框
- 新增 `export async function doActionTask()`：复用 handleFreeAction 模式，actionText 传入任务描述，choiceText 为 `🎴 执行任务：任务名`，生成后标记完成
- 新增 `export function completeTaskInput(playerInput)`：写入 `pendingTaskResult`，标记完成，不调 AI
- 新增 `export function completeMissionCard()`：仅标记完成（面板内行动类任务的备选完成方式）

**src/ui/action-bar.js** [MODIFY]

- `renderActionBar()` 函数内，在 `btnSkip`/`btnNextPhase` 按钮之后，当 `GS.todayMissionCard && !completed && type==='action' && gameMode==='transfer'` 时，新增 `🎴 做任务` 按钮
- 按钮样式：红色渐变背景，与 btnSms 同级

**src/modals/task-panel.js** [NEW]

- `export function showTaskPanel()` — 统一任务面板弹窗
- 布局：标题栏 + 进行中任务区（任务卡红色主题 / 秘密任务橙色主题）+ 历史记录区
- 输入类任务卡：显示 textarea + "完成任务"按钮 → 调用 `completeTaskInput()`
- 行动类任务卡：显示 "做任务"按钮 → 关闭面板 + 调用 `doActionTask()`
- 秘密任务：显示 "已完成"按钮 → 调用 `completeSecretMission()`
- 底部显示 `missionCardHistory`（倒序，最多10条）
- 导入：`GS, escHtml, showToast` from core，`doActionTask, completeTaskInput, completeMissionCard` from game-engine，`completeSecretMission` from parser

**src/ui-renderer.js** [MODIFY]

- 第1314-1328行秘密任务通知条替换为统一提示条：当有活跃任务卡或秘密任务时显示"你有 N 个进行中的任务，点击查看详情"
- 第1745行附近事件绑定区新增：`taskHintBar` click → `showTaskPanel()`、`taskPanelBtn` click → `showTaskPanel()`、`btnDoTask` click → `doActionTask()`

**src/ui/header-bar.js** [MODIFY]

- `header-btns` div 中 archiveBtn 之前新增 🎴 任务按钮
- 有活跃任务时显示红色圆形角标（数字）

**src/prompts.js** [MODIFY]

- `buildUserMessage()` 中秘密任务注入（第518行附近）之前：检测 `GS.pendingTaskResult`，注入完成后清空
- 秘密任务注入之后：检测活跃行动类任务卡，注入 `[INSTRUCTION]` 指令让 AI 在剧情中创造完成机会

**src/modals/archive-modal.js** [MODIFY]

- Tab 按钮区新增 `🎴 任务卡`
- `switchArchiveTab()` 的 tabs/ids/contentIds 数组同步扩展
- 新增 `buildMissionCardContent()` 函数：遍历 `missionCardHistory` 倒序，显示名称/描述/天数/完成状态/提交内容

**src/modals.js** [MODIFY]

- 新增 `export { showTaskPanel } from './modals/task-panel.js'`

## Key Code Structures

### doActionTask() 核心流程（game-engine.js）

```javascript
export async function doActionTask() {
  if (!GS.todayMissionCard || GS.todayMissionCard.type !== 'action' || GS.todayMissionCard.completed) return;
  if (!GS.aiEnabled) { showToast('AI 未启用'); return; }
  GS._isGenerating = true;
  showLoading('正在生成任务剧情...');
  try {
    var _mc = GS.todayMissionCard;
    await compressTodayForInjection();
    var sysPrompt = buildSystemPrompt();
    var userMsg = buildUserMessage('freeAction', { actionText: '(执行制作组任务卡) ' + _mc.desc });
    var _gr = await generateWithRetry(sysPrompt, userMsg, { tokens: TOKEN_CONFIG.freeAction, temperature: 0.8 });
    var rawText = _gr.raw;
    var parsed = parseNarrative(rawText);
    applyParsedSideEffects(parsed);
    dispatch({ type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: '🎴 执行任务：' + _mc.name });
    dispatch({ type: 'PUSH_TODAY_TEXT', text: rawText });
    // 标记完成
    GS.missionCardHistory.push({ id: _mc.id, name: _mc.name, desc: _mc.desc, day: GS.day, completed: true });
    GS.todayMissionCard = null;
    GS.isInConsequence = true;
    saveGame();
    if (window.__renderAll) window.__renderAll();
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('[doActionTask] AI 生成失败:', e);
    showToast('任务剧情生成失败：' + formatAIError(e));
  } finally {
    GS._isGenerating = false;
  }
  hideLoading();
}
```

### pendingTaskResult 注入（prompts.js buildUserMessage 内）

```javascript
if (GS.pendingTaskResult) {
  msg += '[INSTRUCTION] 女主刚刚完成了制作组任务卡「' + GS.pendingTaskResult.taskName + '」\n' +
    '任务描述：' + GS.pendingTaskResult.taskDesc + '\n' +
    '女主提交的内容/行动：' + GS.pendingTaskResult.playerInput + '\n' +
    '请在本次剧情中自然体现这个任务的执行场景和周围人的反应。这是对已发生事件的描写。\n\n';
  GS.pendingTaskResult = null;
}
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在执行过程中跨多文件搜索事件绑定位置、验证 import/export 链路完整性
- Expected outcome: 确保所有新增函数的导入导出路径正确，事件绑定无遗漏