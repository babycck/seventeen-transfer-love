---
name: entSim审计-节奏修复与精简方案v2
overview: 整合5个已知bug + 12个审计发现 + 4项用户确认决策（阶段门控保留部分/好感温和提升1.5倍/情敌结局补玩家选择门控/结局加入全部维度），核心解决好感度节奏死锁，并精简过度复杂的系统叠加。
todos:
  - id: fix-rhythm-deadlock
    content: 修复好感度节奏死锁：romance.js单日上限[3,4,5,6,7]→[5,7,9,11,13]、checkRomanceUnlock部分门控(stage1移除tPhase/stage2+保留debut)、告白门槛80→60；prompts.js放宽stage0禁制为允许微小互动、修复AI好感规则矛盾(背景板有微小互动可+1)、告白文本80→60、池子注入4→2
    status: pending
  - id: fix-male-passivity
    content: 修复男主被动：engine.js移除联络isDebutPopup门控改为好感>=10、联络概率25%→45%、timer缩短；state.js初始timer 8-18天→2-5天；brother.js男主主动概率10%→25%
    status: pending
    dependencies:
      - fix-rhythm-deadlock
  - id: fix-chapter-events
    content: 修复节奏断裂与prompt过载：state.js章节跳跃{2:30,3:45,4:60,5:75,6:90}→{2:7,3:10,4:14,5:14,6:14}；brother.js事件触发率统一降40%(maybeBrotherEvent 15%→10%/女团行业25%→15%/好感铺垫30%→18%/随机事件18%→12%/队友支线22%→15%/哥哥支线12%→8%)
    status: pending
    dependencies:
      - fix-rhythm-deadlock
  - id: fix-known-bugs
    content: 修复5个已知Bug+参数失效：engine.js跨天快照时机修复(357用_lastPopSnapshot+758后更新)、泡泡解析正则容错+前缀剥离、代言门槛20→15、传_affReason第二参数(226)；ui.js星圈smartTruncate分句截断+7天时间过滤；state.js_lastPopSnapshot初始化
    status: pending
  - id: rework-endings
    content: 重写结局系统：endings.js情敌隐藏结局补玩家选择门控(rivalConfessionAccepted)+pickEnding加入告白状态/公开状态/哥哥立场全维度矩阵(约12种结局)；brother.js情敌告白事件触发时设_entSimRivalConfessing标记；engine.js handleEntSimChoice检测玩家接受选择设rivalConfessionAccepted
    status: pending
  - id: simplify-cleanup
    content: 精简系统：state.js addPopularity及各push点careerHistory上限200条slice截断；ui.js移除_entSimFanReactions双重存储仅保留_entSimFanEvents
    status: pending
    dependencies:
      - fix-known-bugs
---

## 产品概述

娱乐圈模拟器（entSim）是《换乘恋爱 x SEVENTEEN》项目中的1v1娱乐圈恋爱模拟模式。玩家扮演女团爱豆/练习生，在娱乐圈背景下与SEVENTEEN成员展开地下恋故事，同时经营事业。

## 核心问题

用户反馈"游戏时间拉得太长，很久没有进入主线的感觉"。经审计发现根因是好感度增长死锁——三重数值锁叠加stage0观察模式禁制+AI好感规则矛盾，导致好感几乎不涨，男主长期是背景板。同时发现5个已知Bug和多个逻辑/精简问题。

## 用户4项确认决策

1. 阶段门控：保留部分门控——stage1移除tPhase门控（练习生期可暧昧），stage2+保留debut出道门控（出道后才能约会）
2. 好感增速：温和提升1.5倍——[5,7,9,11,13]，0到60约需12-15天
3. 情敌结局：补上玩家选择门控——必须玩家主动接受情敌告白后才触发隐藏结局
4. 结局维度：加入全部维度——好感 x 曝光 x 事业 x 告白状态 x 哥哥立场组合

## 审计发现汇总

- P0节奏死锁4项：好感度三重锁、stage0禁制与AI规则死循环、练习生期无男主联络、告白门槛80远超设定60
- P1逻辑问题5项：章节跳跃30-90天断裂、事件触发率过高prompt过载、_affReason参数失效、情敌结局缺玩家选择门控、结局判定维度不足
- P2精简优化4项：4套阶段系统不对齐、34个场景池过多、careerHistory无限增长、粉丝事件双重存储
- 已知Bug 5项：跨天结算"不变"、泡泡回复空、男主被动、代言门槛差1、星圈截断半句

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+，遵循现有 `var` + 字符串拼接风格
- 构建工具：Vite 5.4
- AI API：DeepSeek (deepseek-chat)
- 无新依赖，所有修改为参数/条件调整 + prompt文本编辑 + 结局矩阵重写

## 实现方案

### 1. romance.js — 节奏核心修复

**好感度单日上限** (行70)：

- `var dailyCaps = [3, 4, 5, 6, 7]` → `var dailyCaps = [5, 7, 9, 11, 13]`
- 行69注释同步更新

**checkRomanceUnlock 部分门控** (行384-402)：
按用户决策"保留部分门控"重写：

- stage1：`aff >= 20 && tPhase >= 2` → `aff >= 15`（移除tPhase门控，练习生期可暧昧）
- stage2：`aff >= 50 && debut > 0` → `aff >= 35 && debut > 0`（保留debut门控，降低阈值）
- stage3：`aff >= 70 && chapter >= 2` → `aff >= 55 && debut > 0`（移除chapter门控，保留debut）
- stage4：`aff >= 85 && chapter >= 4` → `aff >= 75 && debut > 0`（移除chapter门控，保留debut）
- 保留 `ohs`（oneHeartRomanceStage）双系统同步路径
- 未解锁分支改为：`aff >= 35 && debut === 0` → "需要出道后才能约会"

**告白门槛** (行194)：

- `E.affection >= 80` → `E.affection >= 60`（对齐用户设定）
- 行190注释同步更新

### 2. prompts.js — 解除stage0死循环 + 降低prompt过载

**AI好感规则** (行88-90)：

- 行89原："男主未出场/背景板时affectionDelta必须为0"
- 行89改："男主在场景中存在且有微小互动（短暂对视/帮拿东西/一句关心/借过碰肩）时可返回+1；完全无互动时返回0"
- 行264补充："stage0期间微小互动（对视/帮拿东西/一句关心）也算'实际互动'，可返回+1"

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

- `if (isDebutPopup) {` → 移除门控，改为 `if (E.affection >= 10) {`（练习生期好感>=10也可触发）

**联络概率** (行490)：

- `0.25` → `0.45`

**联络timer** (行502)：

- `(2 + randInt(0, 2))` → `(1 + randInt(0, 1))`

**代言门槛Bug4** (行580)：

- `>= 20` → `>= 15`

**泡泡解析Bug2** (行1376-1379)：

- 行1376：`fullText.split('===FAN_REPLIES===')` → `fullText.split(/=+FAN_REPLIES=+|={3,}/)`
- 行1377：`var msgToFans = (parts[0] || '').trim()` → `var msgToFans = (parts[0] || '').replace(/^msgToFans\s*[:：]\s*/i, '').trim()`
- 行1378：`var fanRepliesStr = (parts[1] || '').trim()` → `var fanRepliesStr = (parts[1] || '').replace(/^fanReplies\s*[:：]\s*/i, '').trim()`

**情敌告白选择检测** (行771-773)：
handleEntSimChoice中增加：调用generateEntSimRound前检测

- 若 `GS._entSimRivalConfessing` 为true且choiceText匹配 `/接受|答应|愿意|在一起/`
- 则设 `E.flags.rivalConfessionAccepted = true`
- 清除 `GS._entSimRivalConfessing = false`

### 4. state.js — 初始化 + 章节跳跃

**_maleContactTimer初始值** (行116)：

- `E._maleContactTimer = 8 + randInt(0, 10)` → `E._maleContactTimer = 2 + randInt(0, 3)`（2-5天倒计时）

**_lastPopSnapshot初始化** (行116后追加)：

- `E._lastPopSnapshot = 0;`

**章节时间跳跃** (行333)：

- `export var CHAPTER_TIME_SKIP = { 2: 30, 3: 45, 4: 60, 5: 75, 6: 90 }` → `export var CHAPTER_TIME_SKIP = { 2: 7, 3: 10, 4: 14, 5: 14, 6: 14 }`

**careerHistory上限** (行577后追加)：

- `if (GS.entSim.careerHistory.length > 200) GS.entSim.careerHistory = GS.entSim.careerHistory.slice(-200);`

### 5. brother.js — 事件触发率 + 男主主动 + 情敌告白标记

**maybeBrotherEvent** (行15)：

- `randInt(1, 100) > 15` → `> 10`（15%→10%）

**checkOneHeartEvents触发率** (行34-107)：

- 女团/行业事件(行83)：`rnd <= 25` → `rnd <= 15`
- 好感铺垫(行92)：`rnd <= 30` → `rnd <= 18`
- ONEHEART_RANDOM_EVENTS(行98)：`rnd <= 18` → `rnd <= 12`
- 女团队友支线(行103)：`rnd <= 22` → `rnd <= 15`
- 哥哥支线(行77)：`rnd <= 12` → `rnd <= 8`

**情敌告白标记** (行130后追加)：

- `if (ev.flag === 'rivalConfession') GS._entSimRivalConfessing = true;`

**男主主动概率** (行217)：

- `randInt(1, 100) > 10` → `> 25`（10%→25%）

### 6. endings.js — 情敌选择门控 + 结局全维度矩阵

**pickEnding重写** (行11-36)：
函数签名改为 `pickEnding(tier, careerLv, depth, E)`，读取：

- `E.flags.rivalConfessionAccepted`（玩家选择门控）
- `E.romance.confessionResult`（''/'accepted'/'rejected'/'delayed'）
- `E.romance.publicLine`（是否公开）
- `E.brother.stance`（哥哥立场）

新结局矩阵（优先级从高到低）：

1. 情敌隐藏结局：`rivalConfessionAccepted && affection<40` → hidden_rival "藏在掌声里的他"
2. depth>=5(aff>=80) + conf=accepted：

- isPublic && 哥哥非反对 && 高曝光 → be_exposed "公开即塌房"
- isPublic && 哥哥非反对 && 安全 → he_public "台前的童话"
- isPublic && 哥哥反对 → he_underground "地下永久"（哥哥反对只能地下）
- !isPublic && 安全 → he_underground "地下永久"
- !isPublic && 中曝光 → ne_peace "和平分手"
- !isPublic && 高曝光 → be_exposed "曝光塌房"

3. depth>=5 + conf=rejected → ne_cold "冷战分手"
4. depth>=5 + 无告白 → ne_ambiguous "暧昧未明"
5. depth>=3(aff>=50) + conf=accepted：

- 安全 → he_underground
- 中曝光 → ne_peace
- 高曝光 → be_exposed

6. depth>=3 + conf=rejected → ne_cold
7. depth>=3 + 无告白：

- 哥哥protective && 高曝光 → be_exposed
- else → ne_ambiguous

8. depth>=1(aff>=20) → ne_ambiguous
9. depth=0：careerLv顶流 → he_solo "独美封神"；高曝光 → be_fall "黯然退场"；else → ne_solo "独自前行"

**evaluateEnding修改** (行44)：

- `var ending = pickEnding(tier, careerLv, depth)` → `var ending = pickEnding(tier, careerLv, depth, E)`

### 7. ui.js — 星圈截断 + 粉丝事件去重

**smartTruncate函数** (行3282前新增)：

```javascript
function smartTruncate(s, max) {
  if (!s || s.length <= max) return s || '';
  var cut = s.slice(0, max);
  var lastPunct = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('，'), cut.lastIndexOf('！'), cut.lastIndexOf('？'), cut.lastIndexOf('…'), cut.lastIndexOf('——'));
  return (lastPunct > max * 0.5 ? cut.slice(0, lastPunct + 1) : cut) + '…';
}
```

**星圈标题截断Bug5** (行3282-3284)：

- `item.t.slice(0, 30)` → `smartTruncate(item.t, 30)`
- `item.text.slice(0, 30)` → `smartTruncate(item.text, 30)`
- `item.reason.slice(0, 30)` → `smartTruncate(item.reason, 30)`

**星圈事件时间过滤** (行3287前追加)：

- `GS._entSimFanEvents = GS._entSimFanEvents.filter(function(e) { return (GS.entSim.cycle._gameDayCount || 1) - e.day <= 7; });`

**粉丝事件去重** (行3289-3292)：

- 删除 `_entSimFanReactions` 双重存储逻辑（行3290-3292），仅保留 `_entSimFanEvents`

## 实现要点

- 所有修改为参数/条件调整、prompt文本编辑、结局矩阵重写，不新增文件/模块
- 保持 `var` + 字符串拼接风格，不引入 `let/const`/模板字符串
- 跨天快照修复需同步修改engine.js两处（读取357+更新758后）和state.js初始化
- 阶段锁放宽后旧存档可能突然解锁新阶段——预期行为（改善体验），无需迁移
- 情敌告白标记 `GS._entSimRivalConfessing` 是瞬态标志，不持久化到存档
- `E.flags.rivalConfessionAccepted` 持久化到存档，旧存档无此字段默认undefined（不触发隐藏结局）

## 性能影响

- careerHistory上限200条：减少localStorage存档大小，长期游戏不再膨胀
- 池子注入4→2：减少prompt token约30%，AI响应更快
- 事件触发率降低40%：减少AI prompt过载，主线推进感增强
- 结局矩阵扩展：纯前端逻辑无性能影响