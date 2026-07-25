---
name: entSim-bugfix-seventeen-teammates
overview: 修复 entSim 5 项审计发现的 bug/死代码 + 新增 SEVENTEEN 12 位成员互动系统（轻/中/深三档全覆盖）。
todos:
  - id: fix-7a-routing
    content: 修复7A：game-engine.js 四处移除 entSim 对 1v1 函数的路由（generatePhaseNarrative/handleOptionChoice/handleFreeAction/advancePhase），更新 ui-renderer.js guard 注释
    status: completed
  - id: fix-7b-agenda
    content: 修复7B：game-engine.js 删除 entSimTodayAgenda 初始化块和 doAgendaActivity 函数，统一使用 cycle.js 的 rollDailyAgenda
    status: completed
  - id: fix-7c-popularity
    content: 修复7C：game-engine.js evaluateEnding 中 GS.entSimPopularity 改为 GS.entSim.career.popularity 带安全兜底
    status: completed
  - id: fix-1a-1b-imports
    content: 修复1A+1B：ent-sim/engine.js 移除未用 import（tryConfession等），ent-sim/ui.js 移除未用 import（generateEntSimDiary等）
    status: completed
  - id: svt-light-prompt
    content: 轻量级：ent-sim/prompts.js system prompt 新增 SEVENTEEN 队友性格标签段 + Context snapshot 注入队友互动记录
    status: completed
    dependencies:
      - fix-7a-routing
      - fix-7b-agenda
      - fix-7c-popularity
  - id: svt-medium-visit
    content: 中等级：ent-sim/data.js 新增 SVT_TEAMMATE_PROFILES 和 SVT_TEAMMATE_EVENT_POOL，ent-sim/ui.js 快捷指令新增「SEVENTEEN队友」按钮和12人探班面板，ent-sim/engine.js 新增 triggerSVTTeammateEvent 函数
    status: completed
    dependencies:
      - svt-light-prompt
  - id: svt-deep-system
    content: 深度级：ent-sim/state.js 新增 svtMemories 和 svtTeammates 字段，ent-sim/data.js 新增 SVT_TEAMMATE_SIDE_PLOTS 支线池，ent-sim/engine.js applySideEffects 处理 SVT 队友 extra + 自动邂逅，ent-sim/brother.js 新增队友支线事件优先级，ent-sim/memory.js buildMemorySnapshot 注入队友互动，ent-sim/ui.js THEATER_TYPES 新增队友视角、聊天扩展队友对象
    status: completed
    dependencies:
      - svt-medium-visit
---

## 用户需求

两阶段计划：先修复审计发现的5项entSim多余代码问题，再为娱乐圈模拟器增加SEVENTEEN队友互动系统（轻量/中等/深度三档全覆盖）。

## 阶段A：修复5项审计问题

### 7A（高）— entSim被错误路由到1v1函数

- `game-engine.js:59`：`generatePhaseNarrative()` 中 `(GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim')` 将 entSim 路由到 `generateOneHeartRound()`（包含700行1v1逻辑如哥哥考验/告白/冷战），目前仅靠 `ui-renderer.js` 的 `if` 拦住，架构脆弱
- 同样模式存在于 `handleOptionChoice:675`、`handleFreeAction:978`、`advancePhase:1537`

### 7B（中）— 两套并行日程系统

- `game-engine.js:2405-2442`：`generateOneHeartSchedule()` 创建 `GS.entSimTodayAgenda`，与 entSim 自己的 `rollDailyAgenda()` → `GS.entSim.agenda`（cycle.js）是独立的两套
- 附带函数 `doAgendaActivity()`（line 2445）操作 `entSimTodayAgenda`，entSim UI 从不调用

### 7C（中）— 结局人气字段错位

- `game-engine.js:2287`：`var _popE = GS.entSimPopularity || 0;` 读的是旧字段（仅 game-engine.js 内部设置）
- entSim 的人气实际存储在 `GS.entSim.career.popularity`

### 1A（低）— engine.js未使用的import

- `ent-sim/engine.js:14`：`tryConfession`、`applyConfessionResult`、`applyCover` 仅在 ui.js 中使用，engine.js 不需要

### 1B（低）— ui.js未使用的import

- `ent-sim/ui.js:24`：`generateEntSimDiary`、`generateEntSimLetter` 仅在 engine.js 内部自动触发，UI 从不调用

## 阶段B：SEVENTEEN队友互动系统

### 轻量级 — Prompt引导AI自然穿插队友出场

在 system prompt 中注入12位 SEVENTEEN 成员的性格标签（从 data.js MEMBERS 数组提取），让 AI 在练习室/待机室/食堂/公司走廊等场景自然写出队友客串。Context snapshot 中增加队友互动记录。

### 中等 — 探班按钮 + 队友事件池

快捷指令新增「探班SEVENTEEN队友」按钮，弹出12人选单。创建 SEVENTEEN 队友偶遇事件池（~15条：练习室撞见/食堂搭话/哥哥带你去聚餐/某队友调侃等），点击后生成 AI 叙事。

### 深度 — 成员记忆系统 + 支线 + 剧场

为12位成员生成性格切片数据 + 互动记忆追踪 + 深度支线事件池（如某成员向你请教写歌词、某成员暗恋你的团友、某成员和哥哥闹别扭你调解等）。新增「队友视角」剧场类型。支持与 SEVENTEEN 队友的实时聊天。

## 技术栈

- 语言：JavaScript（ES Modules），使用 `var` 声明
- 现有架构：entSim 模块（engine.js / ui.js / prompts.js / data.js / state.js / memory.js / brother.js）
- AI 引擎：DeepSeek chat，通过 `generateWithRetry()` + `triggerEntSimEvent()` 生成叙事
- 数据源：`src/data.js` 中 `MEMBERS` 数组（13位成员完整数据：id/name/stageName/emoji/personality/habits/catchphrases等）

## 阶段A：Bug修复方案

### 7A — 移除 entSim 从 1v1 路由

- `game-engine.js:59`：将条件 `(GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim')` 改为 `(GS.gameMode === 'oneHeart')`
- 同样修改 `handleOptionChoice:675`、`handleFreeAction:978`、`advancePhase:1537` 中的相同模式
- `ui-renderer.js:1387-1394`：entSim setup 跳过 `generatePhaseNarrative` 的 guard 可保留但简化注释（因为 `generatePhaseNarrative` 不再路由 entSim）

### 7B — 移除双日程系统

- 删除 `game-engine.js:2405-2442` 的 `entSimTodayAgenda` 初始化代码块（`if (GS.gameMode === 'entSim' ...)` 整段）
- 删除 `game-engine.js:2445+` 的 `doAgendaActivity()` 函数（完全未被 entSim 调用）
- entSim 仅使用 `rollDailyAgenda()` → `GS.entSim.agenda` 一套日程

### 7C — 修复结局人气字段

- `game-engine.js:2287`：将 `GS.entSimPopularity` 改为 `(GS.entSim && GS.entSim.career && GS.entSim.career.popularity) || 0`，带安全兜底

### 1A/1B — 清理未使用的 import

- `ent-sim/engine.js:14`：从中移除 `tryConfession, applyConfessionResult, applyCover`
- `ent-sim/ui.js:24`：从中移除 `generateEntSimDiary, generateEntSimLetter`

## 阶段B：SEVENTEEN队友互动方案

### 轻量级 — Prompt 注入

修改 `ent-sim/prompts.js`：

- **System prompt 新增**：`【SEVENTEEN 队友（哥哥的团内兄弟）】` 段，列出排除男主/情敌后的 ~10 位成员标签（格式：「崔胜澈🍒 总队长·沉稳可靠」、「尹净汉👼 温柔细腻·天使」等，从 MEMBERS 的 desc 字段提取一行概括）
- **场景客串指令**：AI 在练习室/待机室/公司食堂/走廊等场景可自然写队友出场（打招呼/调侃/助攻），不抢男主戏
- **Context snapshot 新增**：如果当天有 SVT 队友互动，注入 `SVT队友今日互动：XX（成员名）—— 简述`

### 中等 — 探班按钮 + 事件池

修改 `ent-sim/data.js`：

- 新增 `SVT_TEAMMATE_PROFILES`：从 MEMBERS 数组提取12位成员的精简标签 `{id, name, stageName, emoji, desc}`
- 新增 `SVT_TEAMMATE_EVENT_POOL`：~15条队友偶遇事件（按场景分类：练习室/公司/食堂/哥哥牵线/群聊）

修改 `ent-sim/ui.js`：

- 快捷指令新增 `{q: 'svtvisit', label: 'SEVENTEEN队友'}` 
- 新增 `showSVTVisitPanel()`：12人选择面板（显示 emoji + 名字 + 一句话标签），排除男主/哥哥/情敌
- 点击后调用 `triggerSVTTeammateEvent(memberId)` 生成 AI 叙事

修改 `ent-sim/engine.js`：

- 新增 `triggerSVTTeammateEvent(memberId)`：从 MEMBERS + SVT_TEAMMATE_EVENT_POOL 构建 prompt，通过 `triggerEntSimEvent` 生成叙事

### 深度 — 记忆系统 + 支线 + 剧场

修改 `ent-sim/state.js`：

- `E.svtMemories = {}`：`{memberId: {interactions: [{round, summary, type}], lastSeen: round}}`
- 初始化时 `E.svtTeammates` 从 MEMBERS 生成12人标签切片

修改 `ent-sim/data.js`：

- 新增 `SVT_TEAMMATE_SIDE_PLOTS`：~8条深度支线（如：「XX成员深夜找你帮忙改歌词」「XX成员和哥哥闹别扭请你调解」「XX成员问你有没有单身的朋友可以介绍」等），每条有触发条件（好感度/曝光值/天数）

修改 `ent-sim/engine.js`：

- `applySideEffects()` 中新增 `svtTeammate` extra 处理，记录互动到 `E.svtMemories`
- `generateEntSimRound` 完成后自动推进 SVT 队友随机出场（每日首次触发生成邂逅叙事）

修改 `ent-sim/brother.js`：

- `checkOneHeartEvents()` 新增优先级8：SVT 队友支线，18% 概率从 `SVT_TEAMMATE_SIDE_PLOTS` 抽取

修改 `ent-sim/ui.js`：

- `THEATER_TYPES` 新增 `{type: 'svtPOV', label: '队友视角', minAff: 30}`
- 聊天 Tab 中可通过选择器切换聊天对象为 SVT 队友（复用 `generateEntSimChat` 流程，传入不同 `targetId`）

修改 `ent-sim/memory.js`：

- `buildMemorySnapshot()` 新增 SVT 队友互动记录注入

## 文件影响范围

| 文件 | 阶段A | 阶段B | 说明 |
| --- | --- | --- | --- |
| `game-engine.js` | 59/675/978/1537/2287/2405-2449 | — | 路由+人气+日程三处修改，删除死代码 |
| `ui-renderer.js` | 1387-1394 | — | 简化注释 |
| `ent-sim/engine.js` | 14 | 新增函数+副作用 | import清理+triggerSVTTeammateEvent+SVT memory |
| `ent-sim/ui.js` | 24 | 按钮+面板+剧场 | import清理+快捷指令+探班面板+聊天扩展 |
| `ent-sim/prompts.js` | — | system prompt+snapshot | SVT成员标签注入+互动记录 |
| `ent-sim/data.js` | — | 新增3个数据池 | PROFILES+EVENT_POOL+SIDE_PLOTS |
| `ent-sim/state.js` | — | 新增2个字段 | svtMemories+svtTeammates初始化 |
| `ent-sim/memory.js` | — | snapshot增强 | SVT互动记录注入 |
| `ent-sim/brother.js` | — | 新增事件优先级 | 队友支线daily event |