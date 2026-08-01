---
name: entSim-dayCount-显示修复
overview: 修复 entSim 模式 dayCount(随机日历日172) 与 _gameDayCount(游戏天1) 混用导致"第172天"显示错误、人气图表空白、日记摘要重复截断等问题。
todos:
  - id: fix-display-daycount
    content: 修复 state.js/engine.js/romance.js/ui.js 中所有 dayCount 显示混用为 _gameDayCount（约12处单行替换）
    status: pending
  - id: fix-diary-summary
    content: 修复 engine.js diarySummary 用 parsed.narrative 替代 current.narrative + 补 letters day 字段
    status: pending
  - id: verify-lint
    content: read_lints 验证 4 个修改文件零错误
    status: pending
    dependencies:
      - fix-display-daycount
      - fix-diary-summary
---

## 用户需求

用户发来 iPad 新存档 `SEVENTEEN_存档_20260731(1).json`，要求排查问题。存档为 entSim 模式、练习生职业、dayCount=172（随机日历起始日）、_gameDayCount=1（游戏第一天）。

## 核心问题

### P0-1: dayCount/_gameDayCount 系统性混用

`dayCount` 是随机日历日（1-366），用于季节/天气/节日/生日计算；`_gameDayCount` 是游戏天数（从1起），用于冷却/阶段推进。但多处"第N天"显示错误地使用了 dayCount(172) 而非 _gameDayCount(1)：

- state.js:476 `formatTraineeDate(dayCount)` → AI prompt 硬事实块显示"练习第172天"
- engine.js:227 diarySummary.day、engine.js:1321/1334 diary.day → "第172天"
- engine.js:1519 showDayTransition → "Day 173"
- engine.js:1775 showDailySettlement → "Day 171 结算"
- ui.js:1330 人气图表 curDay=dayCount(172) 但 careerHistory.day=_gameDayCount(1) → 图表空白
- romance.js:73/82/107 _affectionLog.day=dayCount(172) → 好感面板"第172天"

### P0-2: diarySummary 用累积剧情

engine.js:223 用 `current.narrative`（当天累积剧情）取前50字，导致每条摘要都是开场白截断。应改用 `parsed.narrative`（仅本回合新生成段落）。

### P1-1: letters 缺 day 字段

engine.js:1348/1359 letters.push 无 day 字段，ui.js:677 显示"第?天"。

### P0-3: CALENDAR_EVENTS 池兜底 bug（生日幻觉根因）

玩家设定女主生日5月21日，游戏日历6月20日（非生日非节日），但 AI 写了生日剧情。根因：`prompts.js:627` `addPoolCandidates` 有兜底 `if (!filtered.length) filtered = pool;`。`canTrigger` 正确过滤掉所有 `require:'birthday=heroine'` 条目后 filtered 为空 → **兜底把整个池子（含所有生日条目）全放行** → AI 拿到生日素材。

### P0-4: 聊天快捷回复 init 格式 bug

存档中 `_entSimPendingChat.brother = ['还可以吧']`（字符串数组，只取 replies[0]），但渲染代码(ui.js:1904)和点击代码(ui.js:1758)期望对象 `{replies:[...], responses:[...]}`。格式不匹配导致按钮显示通用预设而非绑定的3个回复，点击后回复也是随机ACK。`pushPairedChat`(line 3079) 格式正确——只有 init 代码错了。

### P1-2: AI 日期幻觉

AI 写"今天是三月十四号"（实际6月20日）。修复 P0-1 后硬事实块注入正确游戏天数可缓解。

## 技术栈

- Vanilla JS (ES Modules) + Vite，无框架依赖
- 修改涉及 5 个 entSim 模块文件，纯 JS 逻辑层修复，无 UI 结构变更

## 修复方案

### 核心原则

- 所有"第N天 / Day N"**显示与日志**统一用 `_gameDayCount`
- 季节/天气/节日/生日/章节跳跃等**日历计算**保持用 `dayCount`
- 好感度 dailyCap 比较改用 `_gameDayCount`（同为每日+1，语义更清晰，消除 romance.js:60 vs 73 自身不一致）
- diarySummary 摘要用 `parsed.narrative` 而非 `current.narrative`
- letters 补 `day` 字段

### 修改清单

#### 1. `src/ent-sim/state.js`

- **line 476**: `formatTraineeDate(dayCount)` → `formatTraineeDate(E.cycle._gameDayCount || 1)`，练习生硬事实显示正确游戏天数
- **line 617**: addPopularity careerHistory day 字段已用 `_gameDayCount || dayCount`，确认无需改（fallback 顺序正确）

#### 2. `src/ent-sim/engine.js`

- **line 223**: `(current.narrative || '')` → `(parsed.narrative || '')`，diarySummary 取本回合新段落
- **line 227**: `day: E.cycle.dayCount` → `day: E.cycle._gameDayCount || 1`
- **line 1321**: `day: E.cycle.dayCount` → `day: E.cycle._gameDayCount || 1`（AI日记）
- **line 1334**: 同上（男主日记）
- **line 1348**: letters.push 补 `day: E.cycle._gameDayCount || 1`
- **line 1359**: 同上
- **line 1519**: `showDayTransition(E.cycle.dayCount + 1)` → `showDayTransition((E.cycle._gameDayCount || 1) + 1)`
- **line 1775**: `'Day ' + (E.cycle.dayCount - 1)` → `'Day ' + ((E.cycle._gameDayCount || 1) - 1)`

#### 3. `src/ent-sim/romance.js`

- **line 73**: `var today = E.cycle.dayCount || 1` → `var today = E.cycle._gameDayCount || 1`
- 此变量用于 dailyCap 比较（line 74）、_affDayTotal.day（line 75）、_affectionLog.day（line 82/107）。romance.js:60 阶段锁日志已用 `_gameDayCount`，修改后全局一致。

#### 4. `src/ent-sim/ui.js`

- **line 1330**: `var curDay = E.cycle.dayCount || 1` → `var curDay = E.cycle._gameDayCount || 1`，人气图表横轴与 careerHistory.day 对齐
- **line 2872-2878**: init 代码 `_entSimPendingChat[ch]` 从字符串数组改为对象格式，与 `pushPairedChat`(line 3079) 一致：

```js
// 旧（错误）：
GS._entSimPendingChat[ch] = initEntries.filter(...).map(function(m) {
return m.reply || (Array.isArray(m.replies) && m.replies.length ? m.replies[0] : ...);
});
// 新（正确）：
var npcEntry = initEntries.find(function(m) { return m.from !== 'you'; });
if (npcEntry) {
var _replies = null, _responses = null;
if (npcEntry.replies && npcEntry.replies.length) { _replies = npcEntry.replies; _responses = npcEntry.responses || null; }
else if (npcEntry.reply) { _replies = [npcEntry.reply]; }
GS._entSimPendingChat[ch] = { replies: _replies, responses: _responses, entryIdx: 0 };
}
```

#### 5. `src/ent-sim/prompts.js`

- **line 627**: `if (!filtered.length) filtered = pool;` → `if (!filtered.length) return;`，消除兜底导致的生日/节日幻觉。大多数池子有无条件条目（无 require），filtered 不会为空；仅 CALENDAR_EVENTS 在非特殊日全池被过滤——这正是应该跳过的场景。

## 实施说明

- 修改范围小（5 文件约 15 处），无结构性变更
- dayCount 仍用于 gameMonthOf/gameSeasonOf/gameDayOf/formatGameDate 等日历计算，不受影响
- 旧存档兼容：已有 diarySummary/letters/diary 中的 day=172 数据不会自动迁移，但新数据将正确。已有 `_entSimPendingChat` 的错误格式数据在下次 renderPhoneChatMsgs 时会被兜底重新初始化（line 1882 空历史触发 initChatChannel）
- romance.js dailyCap 从 dayCount 改为 _gameDayCount 不影响逻辑（两者每日同步+1，仅起点不同），但消除 _affDayTotal.day 与 _affectionLog.day 的显示错误
- prompts.js 兜底移除后，CALENDAR_EVENTS 在非生日非节日日不注入任何条目——符合预期