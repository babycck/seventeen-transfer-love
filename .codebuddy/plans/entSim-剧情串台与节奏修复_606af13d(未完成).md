---
name: entSim-剧情串台与节奏修复
overview: 修复 entSim 模式 8 个 bug：JSON 截断解析、开新作品点击无反应、AI 自创韩文名、营业后选项场景串台、告白进度太快、关系网点击无变化且可无限点、时段感弱（营业/事件不耗时段）、告白可重复点。涉及 parser/engine/ui/prompts/romance/state 共 7 个文件。
todos:
  - id: fix-ui-binding
    content: 修复 ui.js bind() class 选择器：新增 bindClass 辅助函数，替换 onWork 和 promptWorkTitle 中的 .class 绑定
    status: pending
  - id: fix-prompt-constraints
    content: 修复 prompts.js：追加韩文名/韩文台词禁令 + choice 分支注入上一段 narrative 摘要和场景连续性指引
    status: pending
  - id: fix-romance-progression
    content: 修复 romance.js tryConfession（depth>=4 + confessionDone 门控）+ state.js 增 dateCount + ui.js 约会降速（每2次+1）+ migrateSave 兜底
    status: pending
  - id: fix-npc-interaction
    content: 修复 npc-network.js 加每日3次限制 + ui.js NPC 节点显示亲密度/立场 + engine.js advanceWorld 重置次数 + state.js 增 npcInteractionUsed
    status: pending
    dependencies:
      - fix-romance-progression
  - id: fix-time-slot
    content: 修复 engine.js 条件推进时段（仅 phase/choice/free 推进）+ triggerEntSimEvent 扩展 advanceTime + ui.js 晚档传 advanceTime:true
    status: pending
    dependencies:
      - fix-npc-interaction
  - id: fix-json-parsing
    content: 修复 ent-sim/parser.js 正则提取兜底 + parser.js repairJson 深度检查 + engine.js maxTokens 3200→4000
    status: pending
    dependencies:
      - fix-time-slot
---

## 用户需求

用户反馈 entSim（娱乐圈模拟器）8 个 bug，逐条确认根因后需综合修复：

1. **开新作品点击无反应**：`bind('.class')` 误用 `getElementById` 永远找不到 class 元素
2. **AI 自创韩文名**：剧情出现「심예입니다」（沈艺的韩文），AI 自创韩文音译名
3. **营业后选项场景串台**：营业直播后点选项变成记者会，choice 上下文丢了事件标签
4. **告白进度太快**：DAY3 即可告白，晚档约会每次 +1 depth 太快
5. **关系网点击无变化**：NPC 节点不显示亲密度/立场数值，且可无限点击
6. **时段感弱**：每次操作都推进 1 时段，3 次操作即换天
7. **告白可重复点**：`tryConfession` 未查 `confessionDone`，告白后按钮仍可点击
8. **JSON 截断解析失败**：截断时 narrative/options 全丢，触发重试覆盖剧情

## 产品概述

综合修复 entSim 模块的 UI 绑定、Prompt 约束、场景连续性、恋爱数值平衡、NPC 互动反馈、时段推进逻辑、JSON 解析兜底等 8 个问题，使娱乐圈模拟器的交互响应正确、剧情连贯、数值节奏合理。

## 核心功能

- 开新作品按钮和命名弹窗中的类型/备选名按钮可正常点击
- AI 不再自创韩文名或韩文台词，女主称呼严格使用注入的中文艺名
- 营业/事件后选项承接当前场景，不跳转到无关场景
- 告白需 depth>=4 且不可重复触发；晚档约会两次才 +1 depth
- 关系网节点显示亲密度和立场数值；每日限 3 次主动互动
- 营业/随机事件/关系网互动/作品推进不消耗时段，仅主线选项和自由输入推进时段
- JSON 截断时正则提取已完成的 narrative 和 options，减少重试覆盖

## Tech Stack

- 纯 JavaScript (ES Modules)，复用现有 entSim 架构
- `var` + 字符串拼接代码风格（遵循 AGENTS.md 约定）
- 不引入新依赖，所有功能用浏览器原生 API

## 实现方案

### Bug 1：开新作品点击无反应

**根因**：`ui.js:366` `bind(sel, fn)` 内部用 `document.getElementById(sel.replace('#',''))`，传入 `.es-work-type` 时点号没去掉，永远找不到 class 元素。`onWork()`（:506）和 `promptWorkTitle()`（:533）均受影响。
**修复**：在 ui.js 新增 `bindClass(sel, fn)` 辅助函数，封装 `document.querySelectorAll(sel).forEach(b => b.addEventListener('click', fn))`。将 `onWork` 和 `promptWorkTitle` 中的 `bind('.class', fn)` 调用替换为 `bindClass`。

### Bug 2：AI 自创韩文名/韩文台词

**根因**：`prompts.js:26` 注入了艺名但约束不够强，AI 见女主是「韩国女艺人」就自创「심예」。
**修复**：在 `buildEntSimSystemPrompt()` 称呼规则后追加显式禁令：女主称呼只能用注入的中文艺名，禁止自创韩文音译名或韩文台词；直播/舞台台词用中文表达或附中文翻译。

### Bug 3：营业后选项场景串台

**根因**：`handleEntSimChoice` → `generateEntSimRound('choice', {choiceText})`，choice 的 user message（`prompts.js:74`）只有「玩家选择了选项：xxx」+ 通用状态快照，丢了「正在营业直播」的事件上下文。`GS._entSimCurrent` 在 `buildEntSimUserMessage` 调用时仍持有上一轮数据（新一轮尚未写入），可安全读取。
**修复**：在 `buildEntSimUserMessage` 的 choice 分支中，从 `GS._entSimCurrent` 取上一段 narrative 摘要（截取前 150 字）+ event 标签，注入场景连续性指引。

### Bug 4+7：告白进度太快 + 告白可重复点

**根因**：`romance.js:51` `tryConfession` 仅查 `depth>=3`，3 次晚档约会（每次 `advanceRomance(1)`）即达 threshold；且未查 `confessionDone`，告白后可重复点击。
**修复**：

- `romance.js:51`：`depth>=3` → `depth>=4`，追加 `&& !E.romance.confessionDone`
- `state.js:46-57`：`E.romance` 增加 `dateCount: 0` 字段
- `state.js:75`：`E.misc` 增加 `npcInteractionUsed: 0` 字段
- `ui.js:648`：晚档约会改为 `dateCount++`，仅每 2 次（`dateCount % 2 === 0`）才 `advanceRomance(1)`
- `state.js:433-435` `migrateSave`：旧存档兜底 `dateCount` 和 `npcInteractionUsed`

### Bug 5：关系网点击无变化且可无限点

**根因**：`ui.js:187-190` NPC 节点只渲染头像+名字，不显示亲密度/立场数值；`npc-network.js:168` `interactNpc` 无每日次数限制。
**修复**：

- `ui.js:187-190`：NPC 节点渲染追加 `亲密度N` 和立场文字
- `npc-network.js:168` `interactNpc`：开头检查 `E.misc.npcInteractionUsed >= 3` 时 return 拒绝
- `engine.js:179` `advanceWorld`：重置 `E.misc.npcInteractionUsed = 0`
- `ui.js:203`：关系网标题追加 `（剩N/3次）`

### Bug 6：时段感弱（3次操作换天）

**根因**：`engine.js:55` `generateEntSimRound` 无条件调 `advanceTimeSlot()`，每次操作都推进 1 时段。用户选「营业/事件不耗时段」。
**修复**：

- `engine.js:55`：改为条件推进——仅 `type === 'phase' || 'choice' || 'free'` 时调 `advanceTimeSlot()`
- `engine.js:226` `triggerEntSimEvent`：扩展为 `(eventText, opts)`，`opts.advanceTime` 可强制推进
- `ui.js:654` `onEveningChoice`：调 `triggerEntSimEvent(eventText, {advanceTime: true})`——晚档仍需推进以结束当天

### Bug 8：JSON 截断解析失败

**根因**：`ent-sim/parser.js:8` `parseEntSimResponse` 在 `safeParseJson` 失败后只回退到 `parseNarrative`，无正则提取；`parser.js:97-101` `repairJson` 的 `lastBrace` 截断在截断 JSON 上行为不正确。
**修复**：

- `ent-sim/parser.js:19`：在 `safeParseJson` 失败后、`parseNarrative` 前增加正则提取兜底——用 `/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/` 提取 narrative，`/"options"\s*:\s*\[([\s\S]*?)\]/` 提取 options，narrative.length >= 20 即返回
- `parser.js:97-101` `repairJson`：在 `lastBrace` 截取前遍历统计最外层 `{` 的 depth（复用 `extractBalancedObject` 同款字符串感知逻辑），depth 不为 0 时跳过截取
- `engine.js:47`：`maxTokens: 3200` → `maxTokens: 4000`

## 实现要点

- Bug 1：`bindClass` 辅助函数需在 ui.js 定义，统一封装 querySelectorAll 逻辑
- Bug 3：`GS._entSimCurrent` 在 `buildEntSimUserMessage` 调用时仍持有上一轮数据，可安全读取
- Bug 4：`dateCount` 和 `npcInteractionUsed` 需在 `initEntSimState` 和 `migrateSave` 两处兜底
- Bug 6：`triggerEntSimEvent` 扩展签名需向后兼容——`opts` 可选，不传时 `advanceTime` 默认 false
- Bug 8：正则提取只在 JSON 解析全链路失败后触发，不影响正常路径性能（O(n) 单次扫描）

## 目录结构

```
src/
├── parser.js                        # [MODIFY] repairJson lastBrace 截断加深度检查（Bug 8B）
├── state.js                         # [MODIFY] migrateSave 兜底 dateCount + npcInteractionUsed（Bug 4/5）
└── ent-sim/
    ├── parser.js                    # [MODIFY] parseEntSimResponse 增加正则提取兜底（Bug 8A）
    ├── engine.js                    # [MODIFY] 条件推进时段 + triggerEntSimEvent 扩展 + maxTokens 4000 + advanceWorld 重置互动次数（Bug 5/6/8C）
    ├── ui.js                        # [MODIFY] bindClass 修复 + NPC 数值显示 + 约会降速 + 晚档 advanceTime + 互动次数提示（Bug 1/4/5/6）
    ├── prompts.js                    # [MODIFY] 韩文名禁令 + choice 上下文注入（Bug 2/3）
    ├── romance.js                    # [MODIFY] tryConfession depth>=4 + confessionDone 门控（Bug 4/7）
    ├── state.js                     # [MODIFY] initEntSimState 增加 dateCount + npcInteractionUsed（Bug 4/5）
    └── npc-network.js                # [MODIFY] interactNpc 加每日 3 次限制（Bug 5）
```

### 文件详细说明

**src/parser.js** [MODIFY] — repairJson 深度检查（Bug 8B）

- `repairJson()` (line 97-101)：在 `lastBrace` 截取前，用字符串感知遍历统计最外层 `{` 的 depth
- depth 不为 0（JSON 被截断）时跳过 `lastBrace` 截取，保留完整 s 交给 bracketStack 补全
- 复用 `extractBalancedObject` 同款逻辑：跟踪 `inStr`/`esc`，非字符串上下文统计 `{`/`}` depth

**src/state.js** [MODIFY] — migrateSave 兜底（Bug 4/5）

- `migrateSave()` (line 433-435)：追加 `if (typeof GS.entSim.romance.dateCount !== 'number') GS.entSim.romance.dateCount = 0;`
- 追加 `if (typeof GS.entSim.misc.npcInteractionUsed !== 'number') GS.entSim.misc.npcInteractionUsed = 0;`

**src/ent-sim/parser.js** [MODIFY] — 正则提取兜底（Bug 8A）

- `parseEntSimResponse()` (line 19)：在 `safeParseJson` 返回 null 后、`parseNarrative` 兜底前，增加正则提取分支
- 正则1：`/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/` 提取 narrative（支持转义）
- 正则2：`/"options"\s*:\s*\[([\s\S]*?)\]/` 提取 options 数组内容，再逐个提取字符串
- 提取到 narrative.length >= 20 即返回 `{ narrative, options, extras: {} }`

**src/ent-sim/engine.js** [MODIFY] — 条件时段 + 事件扩展 + maxTokens + 互动重置（Bug 5/6/8C）

- line 47：`maxTokens: 3200` → `maxTokens: 4000`
- line 55：`advanceTimeSlot()` 改为条件调用——`var shouldAdvance = (type === 'phase' || type === 'choice' || type === 'free') || (extra && extra.advanceTime);`
- line 179 `advanceWorld`：追加 `E.misc.npcInteractionUsed = 0;`
- line 226 `triggerEntSimEvent`：扩展为 `function(eventText, opts)`，传 `Object.assign({eventText: eventText}, opts || {})` 给 `generateEntSimRound`

**src/ent-sim/ui.js** [MODIFY] — bindClass + NPC + 约会 + 晚档 + 互动提示（Bug 1/4/5/6）

- 新增 `bindClass(sel, fn)` 辅助函数（line ~367）：`document.querySelectorAll(sel).forEach(function(el) { el.addEventListener('click', fn); });`
- line 506 `onWork`：`bind('.es-work-type', ...)` → `bindClass('.es-work-type', ...)`
- line 533 `promptWorkTitle`：`bind('.es-title-chip', ...)` → `bindClass('.es-title-chip', ...)`
- line 187-190 NPC 渲染：追加 `'<small>亲密度' + n.intimacy + '</small>'` 和 `'<small>' + escHtml(n.stance) + '</small>'`
- line 203 关系网标题：追加 `（剩` + (3 - (E.misc.npcInteractionUsed||0)) + `/3次）`
- line 648 `onEveningChoice` date 分支：`E.romance.dateCount = (E.romance.dateCount||0) + 1; if (E.romance.dateCount % 2 === 0) advanceRomance(1);`
- line 654 `onEveningChoice`：`triggerEntSimEvent(eventText)` → `triggerEntSimEvent(eventText, {advanceTime: true})`

**src/ent-sim/prompts.js** [MODIFY] — 韩文名禁令 + choice 上下文（Bug 2/3）

- `buildEntSimSystemPrompt()` (line ~36 称呼规则后)：追加 `sys += '【女主名称】女主艺名：「' + (hp.name || '你') + '」。禁止自创韩文音译名（如 심예 等）或韩文台词。直播/舞台台词用中文表达，不要直接写韩文。\n';`
- `buildEntSimUserMessage()` (line 73-74 choice 分支)：从 `GS._entSimCurrent` 取上一段 narrative 前 150 字 + event 标签，注入 `【场景连续性】` 指引

**src/ent-sim/romance.js** [MODIFY] — tryConfession 门控（Bug 4/7）

- line 51：`var canConfess = (E.romance.depth >= 4 && !brotherOppose && !E.flags.coldWar && !E.romance.confessionDone);`

**src/ent-sim/state.js** [MODIFY] — initEntSimState 新字段（Bug 4/5）

- line 46-57 `E.romance`：追加 `dateCount: 0,`
- line 75 `E.misc`：追加 `npcInteractionUsed: 0,`

**src/ent-sim/npc-network.js** [MODIFY] — 互动次数限制（Bug 5）

- line 168 `interactNpc`：开头追加 `if ((E.misc.npcInteractionUsed || 0) >= 3) return { success: false, note: '今日互动次数已用完，明天再来' };`
- 互动成功后追加 `E.misc.npcInteractionUsed = (E.misc.npcInteractionUsed || 0) + 1;`