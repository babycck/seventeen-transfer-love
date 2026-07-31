---
name: entSim审计-节奏修复与精简方案v3
overview: 整合5个已知bug(含修正后的Bug4代言按钮不亮)+12个审计发现+4项用户确认决策，核心解决好感度节奏死锁，精简过度复杂的系统叠加，重写结局全维度矩阵。
todos:
  - id: fix-rhythm-deadlock
    content: 修复好感度节奏死锁：romance.js单日上限[3,4,5,6,7]→[5,7,9,11,13]、checkRomanceUnlock部分门控(stage1移除tPhase/stage2+保留debut)、告白门槛80→60；prompts.js放宽stage0禁制为允许微小互动、修复AI好感规则矛盾、告白文本80→60、池子注入4→2
    status: pending
  - id: fix-male-passivity
    content: 修复男主被动：engine.js移除联络isDebutPopup门控改为好感>=10、联络概率25%→45%、timer缩短；state.js初始timer 8-18天→2-5天；brother.js男主主动概率10%→25%
    status: pending
    dependencies:
      - fix-rhythm-deadlock
  - id: fix-chapter-events
    content: 修复节奏断裂与prompt过载：state.js章节跳跃{2:30,3:45,4:60,5:75,6:90}→{2:7,3:10,4:14,5:14,6:14}；brother.js事件触发率统一降40%
    status: pending
    dependencies:
      - fix-rhythm-deadlock
  - id: fix-known-bugs
    content: 修复5个已知Bug+参数失效：engine.js跨天快照时机修复+泡泡解析正则容错+代言门槛20→15+传_affReason第二参数；ui.js代言dismiss分支补rerender()+星圈smartTruncate分句截断+7天时间过滤；state.js_lastPopSnapshot初始化
    status: pending
  - id: rework-endings
    content: 重写结局系统：endings.js情敌隐藏结局补玩家选择门控(rivalConfessionAccepted)+pickEnding加入告白/公开/哥哥立场全维度矩阵(约12种结局)；brother.js情敌告白事件设_entSimRivalConfessing标记；engine.js handleEntSimChoice检测玩家接受选择
    status: pending
  - id: simplify-cleanup
    content: 精简系统：state.js及各push点careerHistory上限200条截断；ui.js移除_entSimFanReactions双重存储仅保留_entSimFanEvents
    status: pending
    dependencies:
      - fix-known-bugs
---

## 产品概述

娱乐圈模拟器（entSim）是《换乘恋爱 x SEVENTEEN》项目中的1v1娱乐圈恋爱模拟模式。玩家扮演女团爱豆/练习生，在娱乐圈背景下与SEVENTEEN成员展开地下恋故事，同时经营事业（人气/作品/代言/综艺）。

## 核心问题

用户反馈"游戏时间拉得太长，很久没有进入主线的感觉"。经审计发现根因是好感度增长死锁——三重数值锁（单日上限+阶段锁+事业门槛）叠加stage0观察模式禁制+AI好感规则矛盾，导致好感几乎不涨，男主长期是背景板。同时发现5个已知Bug（含修正后的代言按钮不亮）和多个逻辑/精简问题。

## 用户4项确认决策

1. 阶段门控：保留部分门控——stage1移除tPhase门控（练习生期可暧昧），stage2+保留debut出道门控（出道后才能约会）
2. 好感增速：温和提升1.5倍——[5,7,9,11,13]，0到60约需12-15天
3. 情敌结局：补上玩家选择门控——必须玩家主动接受情敌告白后才触发隐藏结局
4. 结局维度：加入全部维度——好感 x 曝光 x 事业 x 告白状态 x 哥哥立场组合

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+，遵循现有 `var` + 字符串拼接风格
- 构建工具：Vite 5.4
- AI API：DeepSeek (deepseek-chat)
- 无新依赖，所有修改为参数/条件调整 + prompt文本编辑 + 结局矩阵重写

## 实现方案

### 1. romance.js — 节奏核心修复

**好感度单日上限** (行70)：

- `var dailyCaps = [3, 4, 5, 6, 7]` → `var dailyCaps = [5, 7, 9, 11, 13]`

**checkRomanceUnlock 部分门控** (行394-402)：按用户决策"保留部分门控"重写：

- stage1：`aff >= 20 && tPhase >= 2` → `aff >= 15`（移除tPhase门控，练习生期可暧昧）
- stage2：`aff >= 50 && debut > 0` → `aff >= 35 && debut > 0`（保留debut门控，降低阈值）
- stage3：`aff >= 70 && chapter >= 2` → `aff >= 55 && debut > 0`（移除chapter门控，保留debut）
- stage4：`aff >= 85 && chapter >= 4` → `aff >= 75 && debut > 0`（移除chapter门控，保留debut）
- 保留 `ohs`（oneHeartRomanceStage）双系统同步路径
- 未解锁分支改为：`aff >= 35 && debut === 0` → "需要出道后才能约会"

**告白门槛** (行194)：

- `E.affection >= 80` → `E.affection >= 60`（对齐用户设定）

### 2. prompts.js — 解除stage0死循环 + 降低prompt过载

**AI好感规则** (行89)：

- 原："若本回合剧情中男主未出场、或仅为背景板...affectionDelta 必须为 0"
- 改："男主在场景中存在且有微小互动（短暂对视/帮拿东西/一句关心/借过碰肩）时可返回 +1；完全无互动时返回 0"
- 行264补充："stage0期间微小互动也算'实际互动'，可返回+1"

**告白门槛文本** (行91)：

- `好感度 ≥ 80` → `好感度 ≥ 60`

**stage0观察模式禁制** (行389-392)：

- 原："男主只能在场景中'存在'...他不对女主做任何指向性的行为"
- 改："男主可以做出自然的微小指向行为（短暂对视/一句关心/帮拿东西/借过时碰肩），但不能主动搭话超过两句/不能独处/不能暧昧暗示"

**池子注入精简** (行460)：

- `var max = Math.min(4, tmp.length)` → `var max = Math.min(2, tmp.length)`

### 3. engine.js — 男主联络 + 已知Bug + 情敌选择检测

**_affReason传参** (行226)：

- `applyEntSimAffection(extras.affectionDelta)` → `applyEntSimAffection(extras.affectionDelta, extras)`

**跨天快照Bug1** (行357-358)：

- 行357：`var lastPop = (E.career && typeof E.career.popularity === 'number') ? E.career.popularity : 0` → `var lastPop = (E._lastPopSnapshot != null) ? E._lastPopSnapshot : ((E.career && typeof E.career.popularity === 'number') ? E.career.popularity : 0)`
- 行358：删除 `E._lastPopSnapshot = lastPop`（不再在换天开头覆盖快照）
- 行758后追加：`E._lastPopSnapshot = E.career.popularity;`（结算后更新为新一天起始快照）

**男主联络门控** (行488)：

- `if (isDebutPopup) {` → `if (E.affection >= 10) {`（练习生期好感>=10也可触发）

**联络概率** (行490)：

- `0.25` → `0.45`

**联络timer** (行502)：

- `(2 + randInt(0, 2))` → `(1 + randInt(0, 1))`

**代言门槛Bug4** (行580)：

- `>= 20` → `>= 15`

**泡泡解析Bug2** (行1376-1379)：

- 行1376：`fullText.split('===FAN_REPLIES===')` → `fullText.split(/=+FAN_REPLIES=+|={3,}/)`
- 行1377：追加前缀剥离 `.replace(/^msgToFans\s*[:：]\s*/i, '')`
- 行1378：追加前缀剥离 `.replace(/^fanReplies\s*[:：]\s*/i, '')`

**情敌告白选择检测** (handleEntSimChoice中)：

- 若 `GS._entSimRivalConfessing` 为true且choiceText匹配 `/接受|答应|愿意|在一起/`
- 则设 `E.flags.rivalConfessionAccepted = true`，清除 `GS._entSimRivalConfessing = false`

### 4. state.js — 初始化 + 章节跳跃

**_maleContactTimer初始值** (行116)：

- `E._maleContactTimer = 8 + randInt(0, 10)` → `E._maleContactTimer = 2 + randInt(0, 3)`

**_lastPopSnapshot初始化** (行116后追加)：

- `E._lastPopSnapshot = 0;`

**章节时间跳跃** (行333)：

- `{ 2: 30, 3: 45, 4: 60, 5: 75, 6: 90 }` → `{ 2: 7, 3: 10, 4: 14, 5: 14, 6: 14 }`

**careerHistory上限** (行577后追加)：

- `if (GS.entSim.careerHistory.length > 200) GS.entSim.careerHistory = GS.entSim.careerHistory.slice(-200);`

### 5. brother.js — 事件触发率 + 男主主动 + 情敌告白标记

**maybeBrotherEvent** (行15)：`> 15` → `> 10`（15%→10%）

**checkOneHeartEvents触发率** (行34-107)：统一降低约40%

- 女团/行业事件(行83)：`rnd <= 25` → `rnd <= 15`
- 好感铺垫(行92)：`rnd <= 30` → `rnd <= 18`
- ONEHEART_RANDOM_EVENTS(行98)：`rnd <= 18` → `rnd <= 12`
- 女团队友支线(行103)：`rnd <= 22` → `rnd <= 15`
- 哥哥支线(行77)：`rnd <= 12` → `rnd <= 8`

**情敌告白标记** (行130后追加)：

- `if (ev.flag === 'rivalConfession') GS._entSimRivalConfessing = true;`

**男主主动概率** (行217)：`> 10` → `> 25`（10%→25%）

### 6. endings.js — 情敌选择门控 + 结局全维度矩阵

**pickEnding重写** (行11-36)：函数签名改为 `pickEnding(tier, careerLv, depth, E)`，读取告白状态/公开状态/哥哥立场。情敌隐藏结局增加 `E.flags.rivalConfessionAccepted` 门控。新结局矩阵约12种（depth×confession×public×brother×tier组合）。

**evaluateEnding修改** (行44)：`pickEnding(tier, careerLv, depth)` → `pickEnding(tier, careerLv, depth, E)`

### 7. ui.js — Bug4代言按钮 + Bug5星圈截断 + 粉丝事件去重

**Bug4代言按钮不亮** (行3238)：

- dismiss分支追加 `rerender();`（对比"接受"分支行3251已有rerender()）

**smartTruncate函数** (行3282前新增)：在标点符号处截断，替换 `slice(0,30)` 硬截断

**星圈事件时间过滤** (行3287前追加)：过滤超过7天前的事件

**粉丝事件去重** (行3289-3292)：删除 `_entSimFanReactions` 双重存储，仅保留 `_entSimFanEvents`

## 实现要点

- 所有修改为参数/条件调整、prompt文本编辑、结局矩阵重写，不新增文件/模块
- 保持 `var` + 字符串拼接风格，不引入 `let/const`/模板字符串
- 跨天快照修复需同步修改engine.js两处（读取357+更新758后）和state.js初始化
- 阶段锁放宽后旧存档可能突然解锁新阶段——预期行为（改善体验），无需迁移
- 情敌告白标记 `GS._entSimRivalConfessing` 是瞬态标志，不持久化到存档
- `E.flags.rivalConfessionAccepted` 持久化到存档，旧存档无此字段默认undefined（不触发隐藏结局）

## 修改文件清单

```
src/ent-sim/
├── romance.js    # [MODIFY] 单日上限提升+阶段门控部分保留+告白门槛80→60
├── prompts.js    # [MODIFY] stage0禁制放宽+AI好感规则修复+告白文本+池子注入精简
├── engine.js     # [MODIFY] 男主联络门控+快照修复+泡泡解析+代言门槛+传参+情敌检测
├── state.js      # [MODIFY] timer初始值+快照初始化+章节跳跃缩短+careerHistory上限
├── brother.js    # [MODIFY] 事件触发率降40%+男主主动概率+情敌告白标记
├── endings.js    # [MODIFY] 情敌选择门控+结局全维度矩阵重写
└── ui.js         # [MODIFY] 代言dismiss分支补rerender+星圈smartTruncate+时间过滤+去重
```