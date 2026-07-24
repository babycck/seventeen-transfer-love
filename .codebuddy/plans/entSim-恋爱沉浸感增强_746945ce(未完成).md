---
name: entSim-恋爱沉浸感增强
overview: 聚焦 entSim 恋爱面沉浸感增强（男主存在感/恋爱仪式感/社交亲密感/人物张力四大模块），将已确认的 9 个 bug 中与沉浸感强相关的融入增强计划，其余基建 bug 并行修复。娱乐圈面（含女团深化）留作第二阶段。
todos:
  - id: infra-foundation
    content: 修复基建 Bug 1/6/8/9：ui.js bindClass + engine.js 条件时段+triggerEntSimEvent扩展 + ent-sim/parser.js 正则提取 + parser.js repairJson depth + engine.js maxTokens4000 + state.js addPopularity reason + 5调用点 + public-opinion.js删重复 + ui.js人气日志 + migrateSave兜底
    status: pending
  - id: male-lead-system
    content: 新建 male-lead.js 实现男主行程/主动互动/种子事件+小动作；prompts.js 注入行程/种子/小动作/韩文名禁令/choice场景连续性；cycle.js 联动行程刷新；ui.js 男主按钮显示行程；state.js 初始化新字段
    status: pending
    dependencies:
      - infra-foundation
  - id: romance-ceremony
    content: romance.js tryConfession depth>=4+confessionDone+心动时刻触发函数；ui.js 约会降速+告白场景重构+心动时刻样式；prompts.js depth阶段差异化指引+心动时刻type；state.js 增dateCount
    status: pending
    dependencies:
      - male-lead-system
  - id: social-system
    content: 新建 social.js 实现聊天/朋友圈/剧场；data.js 增THEATER_TYPES+行程池+小动作池；ui.js 快捷区增3个社交按钮+onChat/onMoments/onTheater；state.js 增chatHistory/moments/theaterHistory
    status: pending
    dependencies:
      - male-lead-system
  - id: character-tension
    content: 新建 brother.js 三段递进考验；romance.js 情敌弧线状态+推进检测；npc-network.js 互动3次限制；engine.js advanceWorld 集成情敌弧线/哥哥考验/互动重置；ui.js NPC节点数值显示+互动次数提示；prompts.js 注入情敌阶段+哥哥考验
    status: pending
    dependencies:
      - romance-ceremony
      - social-system
---

## 用户需求

用户反馈 entSim「娱乐圈不像娱乐圈，恋爱游戏不像恋爱游戏」，痛点全选：娱乐圈面行业细节薄/事业无策略感/女团日常缺失/舆论因果看不见；恋爱面男主像背景板/恋爱推进生硬/无社交亲密感/情敌哥哥没张力。

用户确认方向：先聚焦恋爱面（E/F/G/H 四模块），bug 融入沉浸感计划，娱乐圈面（含女团深化）留第二阶段。

## 产品概述

构建 entSim 恋爱沉浸感体系，分五层：基建修复（Bug 1/6/8/9 作为地基）→ 男主存在感（E，含 Bug 2/3 prompt 修复）→ 恋爱仪式感（F，含 Bug 4/7 告白重构）→ 社交亲密感（G，新建聊天/朋友圈/剧场）→ 人物张力（H，含 Bug 5 NPC 反馈+情敌哥哥递进弧线）。

## 核心功能

- 开新作品/命名弹窗按钮可点击；营业/事件/关系网互动不消耗时段；JSON 截断时正则提取 narrative/options；人气变动可查看日志
- 男主有每日行程、主动发起互动（消息/探班/吃醋）、种子事件+小动作注入 prompt；choice 承接上一段场景不串台；禁止 AI 自创韩文名
- depth 跨阈值触发心动时刻高光描写；告白需 depth>=4 且不可重复；约会降速每2次+1；depth 各阶段有差异化写作指引
- entSim 新增聊天（正在输入动效+话题引导）、朋友圈（AI生成动态+男主评论）、剧场（男主视角/情敌IF/婚后IF/校园IF，按depth解锁）
- 关系网节点显示亲密度/立场数值；每日限3次互动；情敌递进弧线（初遇→试探→冲突→退出/上位）；哥哥三段递进考验（中局试探/后局设局/结局把关）

## Tech Stack

- 纯 JavaScript (ES Modules)，复用现有 entSim 架构（engine/ui/prompts/state/romance/cycle/data/npc-network）
- `var` + 字符串拼接代码风格（遵循 AGENTS.md 约定）
- 不引入新依赖，所有功能用浏览器原生 API
- 新增 3 个模块文件，修改 15 个现有文件
- 参考 oneHeart 的 `chat-modal.js` 实现模式但 entSim 独立路径不复用其代码

## 实现方案

### 第一层：基建修复（Bug 1/6/8/9）

**Bug 1 — bindClass 修复**：`ui.js:366` `bind(sel,fn)` 用 `getElementById` 无法匹配 `.class`。新增 `bindClass(sel,fn)` 封装 `querySelectorAll`。替换 `onWork`（:506）`bind('.es-work-type')` 和 `promptWorkTitle`（:533）`bind('.es-title-chip')`。

**Bug 6 — 条件推进时段**：`engine.js:55` `advanceTimeSlot()` 改为条件——仅 `type==='phase'||'choice'||'free'` 或 `extra.advanceTime` 时推进。`triggerEntSimEvent`（:226）扩展为 `(eventText, opts)`，opts.advanceTime 可选。`ui.js:654` 晚档 `onEveningChoice` 传 `{advanceTime:true}`。

**Bug 8 — JSON 截断解析**：

- `ent-sim/parser.js:19`：safeParseJson 返回 null 后、parseNarrative 前，增加正则提取：`/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/` 提取 narrative，`/"options"\s*:\s*\[([\s\S]*?)\]/` 提取 options 数组再逐个提取字符串，narrative.length>=20 即返回
- `parser.js:97-101` `repairJson`：lastBrace 截取前遍历统计最外层 `{` depth（跟踪 inStr/esc，非字符串上下文统计 `{`/`}`），depth 不为 0 时跳过截取
- `engine.js:47` maxTokens 3200→4000

**Bug 9 — 人气变动日志**：

- `ent-sim/state.js:210` `addPopularity(delta)` → `addPopularity(delta, reason)`，reason 非空时写 `careerHistory.push({round, type:'popularity', text: reason+' '+(delta>=0?'+':'')+delta})`
- 5 个调用点补传 reason：`works.js:48`→'在播作品微涨'、`romance.js:132`→'合作收官回升'、`fan-service.js:54`→'营业·'+def.label、`awards.js:50`→'颁奖礼·'+note、`public-opinion.js:104`→'恋情曝光反噬'
- `public-opinion.js:111-115` 删除重复 careerHistory push
- `ui.js:104` 人气行改可点击按钮，新增 `onPopLog` 弹窗展示 careerHistory 中 type='popularity' 条目（倒序）
- `src/state.js:436-439` migrateSave 兜底 dateCount/npcInteractionUsed

### 第二层：E 男主存在感（含 Bug 2/3）

**E1. 男主行程系统**：

- 新建 `src/ent-sim/male-lead.js`：`rollMaleLeadSchedule()` 生成男主每日 3 档行程（上午/下午/夜晚），池含练习室/录制/综艺/拍摄/演唱会/休息/合宿/签售/Vlive 等
- `state.js initEntSimState()`：`E.maleLeadSchedule = { morning:'', afternoon:'', evening:'' }`
- `cycle.js rollDailyAgenda()`：末尾调 `rollMaleLeadSchedule()` 同步刷新
- `prompts.js buildEntSimContextSnapshot()`：注入「男主今日行程：上午XX/下午XX/夜晚XX」
- `ui.js renderHeader()` 或 `onRomance()`：男主按钮显示当前行程摘要

**E2. 男主主动发起互动**：

- `male-lead.js`：`maybeMaleLeadInitiative()` 每回合 20% 概率触发，类型池：发消息/路过探班/吃醋暗示/送东西/约你出去/深夜来电
- `engine.js advanceWorld()`：调 `maybeMaleLeadInitiative()`，返回事件文本注入 `GS._entSimPendingMaleEvent`
- `prompts.js buildEntSimUserMessage()`：开头注入「【男主主动】+ 事件描述」
- `state.js`：`E.romance.lastMaleEventRound` 防连续触发

**E3. 种子事件+小动作填充**：

- `male-lead.js`：`generateSeedEvent()` 从 MEMBERS 取男主 catchphrases/comforts 派生 3 个小动作候选，setup 时选 1主+1备；生成 200 字种子事件场景
- `state.js initEntSimState()`：`E.romance.seedEvent = generateSeedEvent()`、`E.romance.mannerisms = pickMannerisms()`
- `prompts.js buildEntSimSystemPrompt()`：注入「【男主小动作】他会+小动作描述，每5-8回合自然出现一次」+「【男主上心种子】+seedEvent」

**E4. Bug 2+3 prompt 修复**：

- Bug 2：`prompts.js` 称呼规则后追加 `sys += '【女主名称】女主艺名：「'+(hp.name||'你')+'」。禁止自创韩文音译名或韩文台词。直播/舞台台词用中文表达，不要直接写韩文。\n'`
- Bug 3：`prompts.js:73-74` choice 分支从 `GS._entSimCurrent` 取上一段 narrative 前 150 字 + type 标签，注入 `【场景连续性】上一段场景：+摘要。请承接当前场景续写，勿无故跳转。`

### 第三层：F 恋爱仪式感（含 Bug 4/7）

**F1. 心动时刻（depth 跨阈值高光）**：

- `romance.js`：新增 `triggerHeartMoment(newDepth)` —— depth 从 0→1/1→2/2→3/3→4 时触发，生成 300 字沉浸式心动描写
- `engine.js applySideEffects()`：检测 `extras.romanceBeat.depthDelta` 导致 depth 跨阈值时调 `triggerHeartMoment`
- `prompts.js`：新增 heartMoment type，user message 注入「【心动时刻】恋爱深度突破到N，请用300字沉浸式描写此刻的心动场景」
- `ui.js`：心动时刻 narrative 用特殊样式（粉色边框/心跳动画）渲染

**F2. 告白重构**：

- Bug 4：`romance.js:51` `depth>=3` → `depth>=4`，追加 `&& !E.romance.confessionDone`
- Bug 7：同上 confessionDone 门控
- 约会降速：`state.js` 增 `E.romance.dateCount=0`；`ui.js:648` `onEveningChoice` date 分支改为 `dateCount++; if(dateCount%2===0) advanceRomance(1)`
- `ui.js onRomance()`：告白不再直接 `applyConfessionResult`，改为 `triggerEntSimEvent('告白场景：男主正式告白，请描写告白场景与女主抉择', {advanceTime:true})`
- 告白后 AI 返回的 options 含「接受/拒绝/拖延」，对应 `applyConfessionResult('accepted'/'rejected'/'delayed')`

**F3. depth 阶段差异化写作指引**：

- `prompts.js buildEntSimContextSnapshot()`：按 depth 注入写作指引
- depth 0-1：初遇/好感——眼神交汇、心跳加速但不自知、暗暗在意
- depth 2：暧昧——拉扯感、差点触碰、吃醋暗示、欲言又止
- depth 3：心动——情感脆弱、差点告白、独处时暧昧升温
- depth 4：明确——地下恋甜蜜+掩护压力、秘密约会、心跳加速
- depth 5：深爱——深度亲密、未来规划、曝光危机下的抉择

### 第四层：G 社交亲密感

**G1. 聊天系统**：

- `state.js`：`E.chatHistory = []`（`{role:'user'|'ai', content}`）
- `ui.js`：快捷指令区新增 `💬 聊天` 按钮；`onChat()` 用 `showEntSimModal` 渲染手机聊天 UI（参考 oneHeart chat-modal 气泡样式但用 entSim 自己的 modal）
- 发送消息 → `triggerEntSimEvent('聊天：玩家说"xxx"，请以男主口吻回复', {advanceTime:false})` → AI 返回 narrative 作为回复
- 「正在输入」动效：低 depth 延迟 3-5 秒，高 depth 0.5-1 秒
- 话题引导按钮：提供 3 个预设话题（今天行程/在想你/问男主心情）

**G2. 朋友圈**：

- `state.js`：`E.moments = []`（`{id, post, reply, timestamp}`）
- `ui.js`：快捷指令区新增 `📸 朋友圈` 按钮；`onMoments()` 用 `showEntSimModal` 渲染时间线
- 触发 → `triggerEntSimEvent('生成一条朋友圈动态+男主评论', {advanceTime:false})`
- AI 返回 narrative 拆分为 post + reply

**G3. 剧场**：

- `state.js`：`E.theaterHistory = []`（`{id, title, type, content, timestamp}`）
- `data.js`：新增 `THEATER_TYPES = [{type:'malePOV', label:'男主视角', minDepth:2}, {type:'rivalIF', label:'情敌IF', minDepth:2}, {type:'wedding', label:'婚后IF', minDepth:4}, {type:'school', label:'校园IF', minDepth:3}, {type:'memory', label:'回忆录', minDepth:4}]`
- `ui.js`：快捷指令区新增 `🎬 剧场` 按钮；`onTheater()` 展示可选类型（按 depth 解锁灰化），选择后 `triggerEntSimEvent('剧场·'+typeLabel+'：请写800字番外', {advanceTime:false})`

### 第五层：H 人物张力（含 Bug 5）

**H1. Bug 5 NPC 反馈+次数限制**：

- `ui.js:187-190`：NPC 节点追加 `'<small>亲密度'+n.intimacy+'</small>'` + `'<small>'+escHtml(n.stance)+'</small>'`
- `npc-network.js:168` `interactNpc`：开头检查 `E.misc.npcInteractionUsed>=3` return 拒绝；成功后 +1
- `engine.js advanceWorld()`：重置 `E.misc.npcInteractionUsed=0`
- `state.js`：`E.misc.npcInteractionUsed=0`
- `ui.js:203`：关系网标题追加 `（剩N/3次）`

**H2. 情敌递进弧线**：

- `romance.js` 或 `npc-network.js`：新增 `rivalArc` 状态 `{stage:0, intensity:0}`
- `engine.js advanceWorld()`：每回合检测情敌弧线推进
- Stage 0（round>=3）：情敌首次正式出场，`triggerEntSimEvent` 注入
- Stage 1（rival.intimacy with male lead 上升）：情敌试探/制造接触
- Stage 2（depth>=2）：情敌正面冲突/被狗仔拍到营业CP
- Stage 3（depth>=4 或 rival.intimacy<=0）：情敌退出祝福 OR 情敌隐藏结局入口
- `prompts.js`：注入情敌当前阶段+张力描述

**H3. 哥哥递进考验**：

- `romance.js`：新增 `brotherTestNudged = {1:false, 2:false, 3:false}`（已有字段在 state.js:67）
- `engine.js advanceWorld()`：检测考验触发
- Test 1（round>=15）：中局试探——哥哥私下问女主态度，±3 支持度
- Test 2（depth>=3）：后局设局——哥哥故意安排情敌送女主回家看男主反应，±5 支持度
- Test 3（depth>=4 且 round>=30）：结局前把关——哥哥正式表态，±8 支持度
- `prompts.js`：注入哥哥当前考验阶段+立场驱动

## 实现要点

- Bug 3：`GS._entSimCurrent` 在 `buildEntSimUserMessage` 调用时仍持有上一轮数据，可安全读取
- E2：`maybeMaleLeadInitiative` 返回 null 时不注入，避免 prompt 空段
- F1：心动时刻不推进时段（用 triggerEntSimEvent 不传 advanceTime），避免额外消耗
- F2：告白场景用 triggerEntSimEvent 传 advanceTime:true，确保约会当天结束
- G1-G3：聊天/朋友圈/剧场都用 triggerEntSimEvent 不传 advanceTime，不消耗时段
- H2/H3：递进弧线在 advanceWorld 中检测，触发时用 triggerEntSimEvent 注入剧情
- `triggerEntSimEvent` 扩展签名需向后兼容——opts 可选，不传时 advanceTime 默认 false
- `addPopularity` reason 参数向后兼容——不传时行为不变
- dateCount/npcInteractionUsed/rivalArc/brotherTestNudged 需在 initEntSimState 和 migrateSave 两处兜底

## 目录结构

```
src/
├── parser.js                          # [MODIFY] repairJson lastBrace 加 depth 检查（Bug 8B）
├── state.js                           # [MODIFY] migrateSave 兜底 dateCount/npcInteractionUsed/rivalArc/brotherTestNudged/chatHistory/moments/theaterHistory/maleLeadSchedule（Bug 4/5/G/H）
└── ent-sim/
    ├── male-lead.js                   # [NEW] 男主行程池+主动互动+种子事件+小动作派生（E1/E2/E3）
    ├── social.js                      # [NEW] 聊天UI构建+朋友圈渲染+剧场类型管理（G1/G2/G3）
    ├── brother.js                     # [NEW] 哥哥三段递进考验事件链（H3）
    ├── parser.js                      # [MODIFY] parseEntSimResponse 正则提取兜底（Bug 8A）
    ├── engine.js                      # [MODIFY] 条件时段+triggerEntSimEvent扩展+maxTokens4000+advanceWorld集成男主主动/情敌弧线/哥哥考验/互动重置（Bug 5/6/8C/E2/H2/H3）
    ├── ui.js                          # [MODIFY] bindClass+NPC数值+约会降速+晚档advanceTime+互动提示+人气日志+聊天/朋友圈/剧场按钮+心动时刻样式+告白场景重构（Bug 1/4/5/6/9/F1/F2/G）
    ├── prompts.js                     # [MODIFY] 韩文名禁令+choice上下文+男主行程注入+种子事件/小动作+depth阶段指引+心动时刻type+情敌阶段+哥哥考验（Bug 2/3/E1/E3/F3/H2/H3）
    ├── romance.js                     # [MODIFY] tryConfession depth>=4+confessionDone+心动时刻触发+情敌弧线状态+addPopularity reason（Bug 4/7/9/F1/H2）
    ├── cycle.js                       # [MODIFY] rollDailyAgenda 末尾调 rollMaleLeadSchedule（Bug 6/E1）
    ├── state.js                       # [MODIFY] initEntSimState 新字段(dateCount/npcInteractionUsed/chatHistory/moments/theaterHistory/maleLeadSchedule/rivalArc)+addPopularity reason（Bug 4/5/9/G）
    ├── npc-network.js                 # [MODIFY] interactNpc 加每日3次限制（Bug 5）
    ├── data.js                        # [MODIFY] 新增 THEATER_TYPES + 男主行程池 + 小动作池（E1/E3/G3）
    ├── works.js                       # [MODIFY] addPopularity 传 reason（Bug 9）
    ├── fan-service.js                 # [MODIFY] addPopularity 传 reason（Bug 9）
    ├── awards.js                      # [MODIFY] addPopularity 传 reason（Bug 9）
    └── public-opinion.js              # [MODIFY] addPopularity 传 reason + 删重复 push（Bug 9）
```

## 性能与可靠性

- 正则提取 O(n) 单次扫描，只在 JSON 解析全链路失败后触发，不影响正常路径
- 男主主动互动 20% 概率，每回合最多触发 1 次，不额外调 API（注入到当轮 user message）
- 心动时刻只在 depth 跨阈值时触发（每局最多 4 次），用当轮 AI 返回的 narrative 渲染
- 聊天/朋友圈/剧场各调 1 次 API，不推进时段，不与其他系统耦合
- 情敌弧线/哥哥考验在 advanceWorld 中纯状态检测，触发时走 triggerEntSimEvent
- addPopularity reason 参数向后兼容，不传时行为不变
- 人气日志弹窗从 careerHistory 过滤 type='popularity'，O(n) 扫描（通常 <100 条）
- maxTokens 4000 足够 800 字中文 narrative + options + extras JSON

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 搜索 entSim 模块间的 import/export 依赖链，确认新增 male-lead.js/social.js/brother.js 的导入路径正确性
- Expected outcome: 验证新建模块的 import 路径与现有 engine.js/ui.js 的引用关系无循环依赖