---
name: entSim审计-节奏修复精简池子接入v4
overview: 整合全部审计发现：好感度节奏死锁修复+5个已知Bug+结局全维度重写+13个未使用池子全部接入+3个重复池子清理+narrative buffer优化+careerHistory上限+事件触发率降40%。
todos:
  - id: fix-rhythm-deadlock
    content: 修复好感度节奏死锁：romance.js单日上限[3,4,5,6,7]->[5,7,9,11,13]、checkRomanceUnlock部分门控(stage1移除tPhase/stage2+保留debut)、告白门槛80->60；prompts.js放宽stage0禁制为允许微小互动、修复AI好感规则矛盾、告白文本80->60、池子注入4->2
    status: pending
  - id: fix-male-passivity
    content: 修复男主被动：engine.js移除联络isDebutPopup门控改为好感>=10、联络概率25%->45%、timer缩短；state.js初始timer 8-18天->2-5天；brother.js男主主动概率10%->25%
    status: pending
    dependencies:
      - fix-rhythm-deadlock
  - id: fix-chapter-events
    content: 修复节奏断裂与prompt过载：state.js章节跳跃{2:30,3:45,4:60,5:75,6:90}->{2:7,3:10,4:14,5:14,6:14}；brother.js事件触发率统一降40%
    status: pending
    dependencies:
      - fix-rhythm-deadlock
  - id: fix-known-bugs
    content: 修复5个已知Bug+参数失效+buffer：engine.js跨天快照时机修复+泡泡解析正则容错+代言门槛20->15+传_affReason第二参数+narrative buffer 6000->10000；ui.js代言dismiss分支补rerender()+星圈smartTruncate分句截断+7天时间过滤；state.js_lastPopSnapshot初始化
    status: pending
  - id: rework-endings
    content: 重写结局系统：endings.js情敌隐藏结局补玩家选择门控(rivalConfessionAccepted)+pickEnding加入告白/公开/哥哥立场全维度矩阵(约12种结局)+HIDDEN_ROUTE_POOL隐藏路线；brother.js情敌告白事件设_entSimRivalConfessing标记；engine.js handleEntSimChoice检测玩家接受选择
    status: pending
  - id: integrate-pools
    content: 接入13个池子：engine.js新增7个每日触发(cheer/sasaeng/health/toxic/year-end/mv/hiatus)+综艺名场面；brother.js新增3个事件分支(teammate-bond/dating-scandal/press-interview)；prompts.js注入job-grade；endings.js隐藏路线；pools/index.js移除3个重复池子export(ent-schedule/trainee-events/trainee-chat)
    status: pending
    dependencies:
      - fix-chapter-events
  - id: simplify-cleanup
    content: 精简系统：state.js及各push点careerHistory上限200条截断；ui.js移除_entSimFanReactions双重存储仅保留_entSimFanEvents
    status: pending
    dependencies:
      - fix-known-bugs
---

## 产品概述

娱乐圈模拟器（entSim）是《换乘恋爱 x SEVENTEEN》项目中的1v1娱乐圈恋爱模拟模式。玩家扮演女团爱豆/练习生，在娱乐圈背景下与SEVENTEEN成员展开地下恋故事，同时经营事业。

## 核心问题

用户反馈"游戏时间拉得太长，很久没有进入主线的感觉"。经审计发现根因是好感度增长死锁——三重数值锁（单日上限+阶段锁+事业门槛）叠加 stage0 观察模式禁制 + AI好感规则矛盾，导致好感几乎不涨，男主长期是背景板。同时发现5个已知Bug、13个未接入的池子、以及多个逻辑/精简问题。

## 核心功能

- 修复好感度节奏死锁，让主线恋爱推进感增强
- 修复5个已知Bug（跨天结算/泡泡回复/男主被动/代言按钮/星圈截断）
- 重写结局系统为全维度矩阵（好感x曝光x事业x告白x哥哥立场）
- 接入13个未使用的事件池子，丰富娱乐圈日常质感
- 精简过度复杂的系统（事件触发率降40%/池子注入4→2/章节跳跃缩短/careerHistory上限）
- narrative buffer 上限提高避免长剧情丢上下文

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+，遵循现有 `var` + 字符串拼接风格
- 构建工具：Vite 5.4
- AI API：DeepSeek (deepseek-chat)
- 无新依赖，所有修改为参数/条件调整 + prompt文本编辑 + 结局矩阵重写 + 池子接入

## 实现方案

### 1. romance.js — 节奏核心修复

**好感度单日上限** (行70)：`[3,4,5,6,7]` -> `[5,7,9,11,13]`（温和提升1.5倍）

**checkRomanceUnlock 部分门控** (行384-402)：

- stage1：`aff>=20 && tPhase>=2` -> `aff>=15`（移除tPhase门控，练习生期可暧昧）
- stage2：`aff>=50 && debut>0` -> `aff>=35 && debut>0`（保留debut门控，降低阈值）
- stage3：`aff>=70 && chapter>=2` -> `aff>=55 && debut>0`（移除chapter门控，保留debut）
- stage4：`aff>=85 && chapter>=4` -> `aff>=75 && debut>0`（移除chapter门控，保留debut）
- 保留 ohs（oneHeartRomanceStage）双系统同步路径
- 未解锁分支：`aff>=35 && debut===0` -> "需要出道后才能约会"

**告白门槛** (行194)：`E.affection >= 80` -> `E.affection >= 60`（对齐用户设定）

### 2. prompts.js — 解除stage0死循环 + 池子注入精简

**AI好感规则** (行89)：原"男主未出场/背景板时affectionDelta必须为0"改为"男主在场景中存在且有微小互动（短暂对视/帮拿东西/一句关心/借过碰肩）时可返回+1；完全无互动时返回0"
**行264补充**：stage0期间微小互动也算"实际互动"，可返回+1
**告白门槛文本** (行91)：`好感度>=80` -> `好感度>=60`
**stage0观察模式禁制** (行389-392)：改为"男主可以做出自然的微小指向行为（短暂对视/一句关心/帮拿东西/借过时碰肩），但不能主动搭话超过两句/不能独处/不能暧昧暗示"
**池子注入精简** (行460)：`Math.min(4, tmp.length)` -> `Math.min(2, tmp.length)`

### 3. engine.js — 男主联络 + 已知Bug + 情敌检测 + buffer + 池子接入

**_affReason传参** (行226)：`applyEntSimAffection(extras.affectionDelta)` -> `applyEntSimAffection(extras.affectionDelta, extras)`

**跨天快照Bug1** (行357-358)：

- 行357改为用 `_lastPopSnapshot` 读取（非null时用快照，否则fallback当前值）
- 行358删除 `E._lastPopSnapshot = lastPop`（不再在换天开头覆盖）
- 行758后（日程结算完成后）追加 `E._lastPopSnapshot = E.career.popularity;`

**男主联络门控** (行488)：`if (isDebutPopup) {` -> `if (E.affection >= 10) {`
**联络概率** (行490)：`0.25` -> `0.45`
**联络timer** (行502)：`(2+randInt(0,2))` -> `(1+randInt(0,1))`

**代言门槛Bug4** (行580)：`>= 20` -> `>= 15`

**泡泡解析Bug2** (行1376-1378)：

- `split('===FAN_REPLIES===')` -> `split(/=+FAN_REPLIES=+|={3,}/)`
- msgToFans追加 `.replace(/^msgToFans\s*[:：]\s*/i, '').trim()`
- fanRepliesStr追加 `.replace(/^fanReplies\s*[:：]\s*/i, '').trim()`

**情敌告白选择检测** (行771-773 handleEntSimChoice)：

- 调用generateEntSimRound前检测：若 `GS._entSimRivalConfessing===true` 且choiceText匹配 `/接受|答应|愿意|在一起/`
- 则设 `E.flags.rivalConfessionAccepted = true`，清除 `GS._entSimRivalConfessing = false`

**narrative buffer优化** (行348-349)：`buf.length > 6000` -> `> 10000`，`slice(-4000)` -> `slice(-6000)`

**日程结算后触发综艺名场面** (行714 se.done===true后)：

- 若 `se.type === 'variety'`，从 VARIETY_MOMENT_POOL 按 popularity 过滤抽1条注入 `GS._entSimPendingEvent`

**goEntSimNextDay新增7个池子触发** (约行575-641区域，isDebutPopup块内)：

1. CHEER_CULTURE_POOL — 人气>=10，randInt(1,100)<=10
2. SASAENG_ESCALATION_POOL — 人气>=25且getScandalHeat()>=5，randInt(1,100)<=15
3. HEALTH_INJURY_POOL — randInt(1,100)<=8
4. TOXIC_FAN_WAR_POOL — 人气>=20，randInt(1,100)<=10
5. YEAR_END_REVIEW_POOL — gameMonthOf(E.cycle.dayCount)===12时触发
6. MV_FILMING_POOL — E._svtComebackDays>0时触发
7. HIATUS_ANXIETY_POOL — `(GS._entSimPopupQueue||[]).length===0` 且 `randInt(1,100)<=12`

### 4. state.js — 初始化 + 章节跳跃 + careerHistory上限

**_maleContactTimer初始值** (行116)：`8+randInt(0,10)` -> `2+randInt(0,3)`
**_lastPopSnapshot初始化** (行116后追加)：`E._lastPopSnapshot = 0;`
**章节时间跳跃** (行333)：`{2:30,3:45,4:60,5:75,6:90}` -> `{2:7,3:10,4:14,5:14,6:14}`
**careerHistory上限** (行577 addPopularity后追加)：`if (GS.entSim.careerHistory.length > 200) GS.entSim.careerHistory = GS.entSim.careerHistory.slice(-200);`

### 5. brother.js — 事件触发率 + 男主主动 + 情敌标记 + 池子接入

**maybeBrotherEvent** (行15)：`> 15` -> `> 10`
**checkOneHeartEvents触发率** (行34-107)：

- 女团/行业事件(行83)：`rnd<=25` -> `rnd<=15`
- 好感铺垫(行92)：`rnd<=30` -> `rnd<=18`
- ONEHEART_RANDOM_EVENTS(行98)：`rnd<=18` -> `rnd<=12`
- 女团队友支线(行103)：`rnd<=22` -> `rnd<=15`，且替换为 TEAMMATE_BOND_POOL
- 哥哥支线(行77)：`rnd<=12` -> `rnd<=8`

**新增3个事件分支**（在现有分支后追加）：

- DATING_SCANDAL_CHAIN — `getScandalHeat()>=10 && rnd<=12` 时触发
- PRESS_INTERVIEW_POOL — `isDebutEvents && popularity>=15 && rnd<=10` 时触发
- TEAMMATE_BOND_POOL 已替换到行103的队友支线分支

**情敌告白标记** (行130 ev.flag处理后追加)：`if (ev.flag === 'rivalConfession') GS._entSimRivalConfessing = true;`
**男主主动概率** (行217)：`> 10` -> `> 25`

### 6. endings.js — 情敌选择门控 + 结局全维度矩阵 + 隐藏路线

**pickEnding重写** (行11-36)：

- 函数签名改为 `pickEnding(tier, careerLv, depth, E)`
- 情敌隐藏结局增加 `E.flags.rivalConfessionAccepted` 门控
- 读取 `E.romance.confessionResult`（accepted/rejected/delayed/null）
- 读取 `E.romance.publicLine`（是否公开）
- 读取 `E.brother.stance`（哥哥立场）
- 新结局矩阵约12种（depth x confession x public x brother x tier组合）
- HIDDEN_ROUTE_POOL 检查：在结局判定最后追加隐藏路线条件检查

**evaluateEnding修改** (行44)：`pickEnding(tier, careerLv, depth)` -> `pickEnding(tier, careerLv, depth, E)`

### 7. ui.js — Bug4代言按钮 + Bug5星圈 + 粉丝去重

**Bug4代言按钮** (行3238)：dismiss分支追加 `rerender();`
**smartTruncate函数** (行3282前新增)：标点符号处截断替换 `slice(0,30)`
**星圈事件时间过滤** (行3287前追加)：过滤超过7天前的事件
**粉丝事件去重** (行3289-3292)：删除 `_entSimFanReactions` 双重存储

### 8. pools/index.js — 3个重复池子清理

移除3行 export（不删文件）：

- `export { ENT_SCHEDULE_POOL } from './ent-schedule.js';`（被ent-schedules.js替代）
- `export { TRAINEE_EVENTS } from './trainee-events.js';`（被trainee-early/mid/late替代）
- `export { TRAINEE_CHAT } from './trainee-chat.js';`（被chat-stage替代）

### 9. import语句更新

- engine.js import追加：CHEER_CULTURE_POOL, SASAENG_ESCALATION_POOL, HEALTH_INJURY_POOL, TOXIC_FAN_WAR_POOL, YEAR_END_REVIEW_POOL, MV_FILMING_POOL, HIATUS_ANXIETY_POOL, VARIETY_MOMENT_POOL
- brother.js import追加：TEAMMATE_BOND_POOL, DATING_SCANDAL_CHAIN, PRESS_INTERVIEW_POOL
- prompts.js import追加：JOB_GRADE_POOL
- endings.js import追加：HIDDEN_ROUTE_POOL

## 实现要点

- 保持 `var` + 字符串拼接风格，不引入 `let/const`/模板字符串
- 跨天快照修复需同步修改engine.js两处（读取357+更新758后）和state.js初始化
- 阶段锁放宽后旧存档可能突然解锁新阶段——预期行为（改善体验），无需迁移
- 情敌告白标记 `GS._entSimRivalConfessing` 是瞬态标志，不持久化到存档
- `E.flags.rivalConfessionAccepted` 持久化到存档，旧存档无此字段默认undefined
- 13个池子接入时全部使用 filterByRequire 按条件过滤，复用现有 cloneEvent + popupQueue 机制
- 3个重复池子只移除 index.js 的 export 行，不删除文件本身

## 修改文件清单

```
src/ent-sim/
├── romance.js    # [MODIFY] 单日上限+阶段门控+告白门槛
├── prompts.js    # [MODIFY] stage0禁制+AI规则+池子注入+JOB_GRADE_POOL接入
├── engine.js     # [MODIFY] 联络+快照+泡泡+代言+传参+情敌检测+buffer+7池子接入+综艺名场面
├── state.js      # [MODIFY] timer+快照初始化+章节跳跃+careerHistory上限
├── brother.js    # [MODIFY] 事件率降40%+男主主动+情敌标记+3池子接入
├── endings.js    # [MODIFY] 情敌门控+全维度矩阵+HIDDEN_ROUTE_POOL
├── ui.js         # [MODIFY] 代言rerender+星圈截断+时间过滤+去重
└── pools/index.js # [MODIFY] 移除3个重复池子的export
```