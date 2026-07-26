---
name: entSim-batch-fixes
overview: 合并全部待修项：7项代码修复 + 练习生三分阶段系统（5新池子+4处代码改造）+ 3项AGENTS.md手册更新 + 语法验证，涉及约20个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：data.js中CHAPTERS新增练习生(0)原4阶段后移，startChapter=0；state.js中debutDay条件target>=2改为target>=1，索引计算适配新CHAPTERS结构
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：ui.js pushDailyChats中增加debutDay门控，练习生阶段过滤CHAT_RIVAL和CHAT_MANAGER中含打歌/音银/回归/预录/直拍/一位关键词的消息
    status: pending
  - id: fix-rival-name
    content: 修复情敌名字：ui.js第1484行将(E.rival && E.rival.name) || '情敌'改为suitorName() || '情敌'
    status: pending
  - id: fix-secret-dedup
    content: 修复秘密去重：engine.js applySecretEffect新增核心词辅助指纹函数，双指纹(前4中文key+核心词组合)任一命中即判重
    status: pending
  - id: fix-entSim-flags
    content: 修复开局标记：state.js initEntSimState末尾为sisterSetting设置GS._relCharIntroduced=true和GS._rivalIntroduced=true，同时migrateSave兜底
    status: pending
  - id: remove-livestream-gift-secrets
    content: 删除4处直播间刷礼物秘密：secret-discovery-events.js删除secret_live_gift、ui-renderer.js删除_secPool中直播间条目、ent-sim/state.js删除defaultSecrets中直播间条目、special-events.js删除secret_rival
    status: pending
  - id: strengthen-prompt
    content: 加强prompt约束：prompts.js第1139行显式禁止AI生成SEVENTEEN成员直播间秘密，严格限定EXO
    status: pending
    dependencies:
      - remove-livestream-gift-secrets
  - id: create-trainee-pools
    content: 新建trainee-stages.js池子文件：导出TRAINEE_EARLY_POOL(30条)/TRAINEE_MID_POOL(30条)/TRAINEE_LATE_POOL(30条)/TRAINEE_EVENTS(50条按stage标记)/TRAINEE_CHAT(60条哥哥+情敌频道)
    status: pending
  - id: add-trainee-state-fields
    content: 新增state字段：E.career新增traineePhase(默认1)和_lastTraineePhase(默认1)，migrateSave中兜底初始化
    status: pending
  - id: update-cycle-pools
    content: 改造cycle.js日程分配：rollDailyAgenda练习生分支按traineePhase分池抽取(1→EARLY/2→MID/3→LATE)，子池抽完fallback到TRAINEE_POOL，导入3个新子池
    status: pending
    dependencies:
      - create-trainee-pools
      - add-trainee-state-fields
  - id: add-trainee-events-engine
    content: 增强engine.js练习生事件：goEntSimNextDay中每天更新traineePhase，阶段跨越时触发过渡事件推入弹窗队列，练习生期解锁轻量弹窗(月末评价/社内Showcase/出道组发表)
    status: pending
    dependencies:
      - create-trainee-pools
      - add-trainee-state-fields
  - id: update-prompts-trainee-phase
    content: 增强prompts.js阶段注入：练习生分支按traineePhase注入不同氛围(前期迷茫/中期竞争/后期出道紧张)
    status: pending
    dependencies:
      - add-trainee-state-fields
  - id: update-ui-trainee-display
    content: 更新ui.js状态栏：renderLeft中练习生期显示阶段emoji(🌱前期/🌿中期/🌸后期)
    status: pending
    dependencies:
      - add-trainee-state-fields
  - id: replace-trainee-chat
    content: 替换练习生聊天池：ui.js pushDailyChats中练习生阶段用TRAINEE_CHAT替换CHAT_RIVAL和CHAT_MANAGER，哥哥频道保持不变
    status: pending
    dependencies:
      - create-trainee-pools
  - id: update-pools-index
    content: 更新pools/index.js导出：新增trainee-stages.js的5个常量到统一入口
    status: pending
    dependencies:
      - create-trainee-pools
  - id: update-agents-md
    content: 全面更新AGENTS.md手册：阶段系统(5+3状态+天数驱动+人气出道)、55个池子清单(14类分组、导出名/文件名/作用/条数)、补齐npcNetwork系统4、修正模块数量
    status: pending
    dependencies:
      - fix-chapter-label
      - create-trainee-pools
  - id: validate-all
    content: 全量语法验证：node -c检查约20个修改文件确保无语法错误
    status: pending
    dependencies:
      - fix-chapter-label
      - fix-chat-stage-filter
      - fix-rival-name
      - fix-secret-dedup
      - fix-entSim-flags
      - remove-livestream-gift-secrets
      - strengthen-prompt
      - create-trainee-pools
      - add-trainee-state-fields
      - update-cycle-pools
      - add-trainee-events-engine
      - update-prompts-trainee-phase
      - update-ui-trainee-display
      - replace-trainee-chat
      - update-pools-index
---

## 产品概述

对娱乐模拟器(entSim)进行批量修复、练习生系统三分重构、手册全面更新。核心原则：娱乐圈是恋爱背景板，出道必然发生；AI只管主线剧情和选项，其余全部走池子驱动。

## 修改清单（17项）

### 一、代码修复（7项）

**修复1：章节标签错位**
练习生(debutDay=0, 人气=3)被标记为"新人期"。CHAPTERS数组第0项新增"练习生"，练习生startChapter=0，debutDay跨越条件改为target>=1。

**修复2：聊天内容不分阶段**
练习生打开KakaoTalk看到"今天打歌我看了""明天打歌预录"等已出道消息。initChatChannel需增加debutDay门控，过滤情敌和经纪人频道中含打歌/预录/回归等关键词的消息。

**修复3：情敌名字不显示**
联系人列表永远显示"情敌"而非真实名字。改用suitorName()函数从npcNetwork获取名字。

**修复4：秘密重复生成**
同一秘密6个变体，去重仅取前4中文key不够鲁棒。新增核心词辅助指纹（EXO/金珉锡/签售/同人文/直拍等），双指纹任一命中即判重。

**修复5：entSim开局标记未置位**
队友妹妹设定下开局已认识哥哥与情敌，但_relCharIntroduced和_rivalIntroduced未置true。在initEntSimState中为sisterSetting置位。

**修复6：删除"直播间刷礼物"秘密（4处）**
secret-discovery-events.js删除secret_live_gift、ui-renderer.js删除_secPool中直播间条目、ent-sim/state.js删除defaultSecrets中直播间条目、special-events.js删除secret_rival。

**修复7：prompt约束加强**
prompts.js显式禁止AI生成涉及SEVENTEEN成员直播间的秘密，所有秘密严格限定EXO。

### 二、练习生三分阶段系统（9项）

**阶段规则**：纯dayCount驱动（每天3时段约3回合），出道（人气>=35）优先于天数：

- 前期：dayCount 1-4天（约12回合）
- 中期：dayCount 5-10天（约15-30回合）
- 后期：dayCount 11天起
- 出道：人气>=35自动触发，debutDay置位，跳出练习生系统
- 旧TRAINEE_POOL(50条)保留作fallback

**修复8：新增池子文件 trainee-stages.js**
导出5个常量：TRAINEE_EARLY_POOL(30条)、TRAINEE_MID_POOL(30条)、TRAINEE_LATE_POOL(30条)、TRAINEE_EVENTS(50条)、TRAINEE_CHAT(60条)

**修复9：state.js新增字段**
E.career.traineePhase(默认1)和E.career._lastTraineePhase，在advanceDay时按dayCount动态更新

**修复10：cycle.js日程分配改造**
练习生分支按traineePhase分池抽取，子池抽完fallback到TRAINEE_POOL

**修复11：engine.js练习生事件解锁**
每天计算traineePhase，阶段跨越时触发过渡事件，练习生期解锁轻量弹窗

**修复12：prompts.js练习生阶段注入**
按traineePhase注入不同氛围描述：前期陌生迷茫、中期适应竞争、后期出道紧张

**修复13：ui.js状态栏显示**
练习生期显示阶段emoji（前期/中期/后期）

**修复14：ui.js练习生聊天池替换**
pushDailyChats中练习生阶段用TRAINEE_CHAT替换CHAT_RIVAL和CHAT_MANAGER

**修复15：pools/index.js导出更新**
新增trainee-stages.js的5个导出到统一入口

### 三、手册更新（3项）

**修复16：AGENTS.md全面更新**
阶段系统（5+3状态）、55个池子清单、补齐npNetwork等缺失模块

### 四、验证（1项）

**修复17：全量语法验证**
node -c检查约20个修改文件

## 技术方案

### 修复1：章节标签（data.js + state.js）

**修改文件**：`src/ent-sim/data.js`、`src/ent-sim/state.js`

**data.js变更**：

- CHAPTERS数组（90-96行）第0项新增 `{index:0, name:'练习生', icon:'🌱', desc:'还没有出道，每天都在练习室里挥洒汗水'}`
- 原4项各后移一位（新人期→index:1, 上升期→index:2, 巅峰期→index:3, 传奇期→index:4）
- ENT_SIM_CAREERS练习生（22行）：startChapter从1改为0
- chapterIcon函数（149行）：数组索引适配 `CHAPTERS[index]`（原 `index-1`）

**state.js变更**：

- checkChapterAdvance（262行）：`target >= 2` 改为 `target >= 1`
- 章节初始化（89-90行）：练习生职业startChapter=0时，chapDef取CHAPTERS[0]
- chapterNameOf/chapterIconOf（234-243行）：`CHAPTERS[idx-1]` 改为 `CHAPTERS[idx]`

### 修复2：聊天阶段过滤（ui.js）

**修改文件**：`src/ent-sim/ui.js` 的 pushDailyChats函数（2408-2432行）

**逻辑**：在 tryPushOneChat 调用前，对 rival 和 manager 频道增加debutDay判断：

```js
var isDebut = (E.career && E.career.debutDay > 0);
if (!isDebut) {
  // 练习生：过滤CHAT_RIVAL和CHAT_MANAGER
  // 用TRAINEE_CHAT替换（见修复14）
}
```

关键词过滤列表：`['打歌','音银','回归','预录','直拍','一位','音源','宣发','粉丝','巡演']`

### 修复3：情敌名字（ui.js）

**修改文件**：`src/ent-sim/ui.js` 第1484行

将 `(E.rival && E.rival.name) || '情敌'` 替换为 `suitorName() || '情敌'`。suitorName函数已在ent-sim/state.js:191-193定义，从`E.npcNetwork.nodes['npc_suitor'].name`获取。

### 修复4：秘密去重（engine.js）

**修改文件**：`src/ent-sim/engine.js` applySecretEffect函数（224-236行）

在原有前4中文字符key去重基础上，新增核心词指纹函数：

```js
function secretFingerprint(text) {
  var core = ['EXO','金珉锡','签售','同人文','直拍','周边','小卡','应援','photo card','专辑','海报','粉丝'];
  var found = [];
  for (var i = 0; i < core.length; i++) {
    if (text.indexOf(core[i]) >= 0) found.push(core[i]);
  }
  return found.sort().join('|');
}
```

去重条件从 `key === existKey` 改为 `key === existKey || secretFingerprint(s.item) === secretFingerprint(E.secret.items[i])`。

### 修复5：开局标记（state.js）

**修改文件**：`src/ent-sim/state.js` initEntSimState末尾（第90行后，saveGame之前）

```js
if (career.sisterSetting) {
  GS._relCharIntroduced = true;
  GS._rivalIntroduced = true;
}
```

### 修复6：删除刷礼物秘密（4个文件）

每处删除单行数组元素，不影响其余索引：

- `src/ent-sim/pools/secret-discovery-events.js` 第8行：删除 `secret_live_gift`
- `src/ui-renderer.js` 第1334行：删除 `_secPool` 中直播间条目
- `src/ent-sim/state.js` 第174行：删除 `defaultSecrets()` 中直播间条目
- `src/ent-sim/pools/special-events.js` 第24行：删除 `secret_rival`

### 修复7：prompt约束（prompts.js）

**修改文件**：`src/prompts.js` 第1139行

原文`都是EXO追星向的小秘密，纯属可爱反差，不是黑料`改为：
`所有秘密必须严格限定EXO（金珉锡/签售/周边/直拍/同人文），绝不涉及SEVENTEEN成员、任何男团直播间刷礼物行为。`

---

### 修复8：新增池子文件

**新建文件**：`src/ent-sim/pools/trainee-stages.js`

```js
// 练习生三阶段日程池（dayCount驱动）
export var TRAINEE_EARLY_POOL = [
  { key: '基础声乐课', loc: '声乐教室' },
  { key: '基础舞蹈课', loc: '练习室' },
  // ... 共30条，覆盖入门训练场景
];

export var TRAINEE_MID_POOL = [
  { key: '编舞学习', loc: '大练习室' },
  { key: '和声练习', loc: '声乐教室' },
  // ... 共30条，覆盖进阶训练场景
];

export var TRAINEE_LATE_POOL = [
  { key: '出道曲排练', loc: '练习室' },
  { key: 'MV概念会议', loc: '会议室' },
  // ... 共30条，覆盖出道准备场景
];

// 练习生专属事件（50条，按stageTag标记）
export var TRAINEE_EVENTS = [
  { stage: 1, key: '第一次月末评价', text: '...' },
  { stage: 2, key: '社内小型Showcase', text: '...' },
  { stage: 3, key: '出道组最终名单公布', text: '...' },
  // ...
];

// 练习生聊天（哥哥频道30条+情敌频道30条）
export var TRAINEE_CHAT = [
  // 哥哥频道（30条）：练习生相关鼓励
  { ch: 'brother', t: '今天月末评价怎么样？别太紧张' },
  // ...
  // 情敌频道（30条）：练习生时期竞争
  { ch: 'rival', t: '听说这次出道组只有5个名额' },
  // ...
];
```

### 修复9：state.js新增字段

**修改文件**：`src/ent-sim/state.js`

在E.career对象（37-47行）中新增两个字段：

```js
E.career = {
  // ...现有字段...
  traineePhase: 1,        // 默认前期（1=前期 2=中期 3=后期）
  _lastTraineePhase: 1    // 记录上次阶段号，防重复触发过渡事件
};
```

同时在migrateSave中为旧存档兜底初始化这两个字段为1。

### 修复10：cycle.js日程分配

**修改文件**：`src/ent-sim/cycle.js`

1. 新增导入（第7-10行）：从trainee-stages.js导入TRAINEE_EARLY_POOL、TRAINEE_MID_POOL、TRAINEE_LATE_POOL
2. rollDailyAgenda（66-67行）练习生分支改为：

```js
} else if (!isDebut) {
  var tp = E.career.traineePhase || 1;
  var phasePool = tp === 1 ? TRAINEE_EARLY_POOL : tp === 2 ? TRAINEE_MID_POOL : TRAINEE_LATE_POOL;
  main = pick(phasePool.length > 0 ? phasePool : TRAINEE_POOL); // 子池抽完fallback
}
```

### 修复11：engine.js练习生事件

**修改文件**：`src/ent-sim/engine.js` goEntSimNextDay函数（246行起）

在dayCount递增后（254行）和checkChapterAdvance前（304行）插入：

```js
// 练习生阶段更新（dayCount驱动）
if (E.career.debutDay === 0) {
  var newPhase = E.cycle.dayCount <= 4 ? 1 : E.cycle.dayCount <= 10 ? 2 : 3;
  if (newPhase !== E.career._lastTraineePhase) {
    // 阶段跨越过渡事件
    var phaseNames = {1:'练习生前期', 2:'练习生中期', 3:'练习生后期'};
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'phase', text: '进入「' + phaseNames[newPhase] + '」' });
    E.career._lastTraineePhase = newPhase;
  }
  E.career.traineePhase = newPhase;
}
```

练习生期解锁轻量事件（在isDebutPopup之前插入，334行前）：

```js
// 练习生期轻量事件
if (!isDebutPopup) {
  if (E.career.traineePhase >= 1 && Math.random() < 0.3) {
    // 月末评价事件
    var evt = pickFromPool(TRAINEE_EVENTS, 'stage', 1);
    if (evt && !GS._entSimPopupQueue) { GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'traineeEvent', data: evt }); }
  }
  if (E.career.traineePhase >= 2 && Math.random() < 0.25) {
    var evt2 = pickFromPool(TRAINEE_EVENTS, 'stage', 2);
    if (evt2) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'traineeEvent', data: evt2 }); }
  }
  if (E.career.traineePhase >= 3 && Math.random() < 0.2) {
    var evt3 = pickFromPool(TRAINEE_EVENTS, 'stage', 3);
    if (evt3) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'traineeEvent', data: evt3 }); }
  }
}
```

### 修复12：prompts.js阶段注入

**修改文件**：`src/ent-sim/prompts.js`

在练习生System Prompt构建中（第22行isDebut判断后），按traineePhase注入：

- 前期(1)：`你刚进公司不久，还在适应练习生生活。每天声乐课和舞蹈课排满，最害怕月末评价被刷掉。`
- 中期(2)：`你已经在公司练习了一段时间，逐渐适应了节奏。月末评价能稳定拿B+，有几个同期练习生成了朋友，但也开始感受到竞争压力。`
- 后期(3)：`出道组筛选正在紧张进行中。每一天都可能是你在公司的最后一天——但也可能是离出道最近的一天。既期待又害怕，不敢去想如果没选上该怎么办。`

### 修复13：ui.js状态栏

**修改文件**：`src/ent-sim/ui.js` renderLeft函数（192行起）

在团设卡片上方（isDebut判断之前）新增练习生阶段显示：

```js
var traineeHtml = '';
if (!isDebut && E.career && E.career.traineePhase) {
  var phaseEmoji = E.career.traineePhase === 1 ? '🌱' : E.career.traineePhase === 2 ? '🌿' : '🌸';
  var phaseLabel = E.career.traineePhase === 1 ? '练习生前期' : E.career.traineePhase === 2 ? '练习生中期' : '练习生后期';
  traineeHtml = '<div class="es-trainee-phase">' + phaseEmoji + ' ' + phaseLabel + '</div>';
}
```

### 修复14：ui.js聊天池替换

**修改文件**：`src/ent-sim/ui.js` pushDailyChats函数（2408-2432行）

练习生阶段（debutDay<=0）时：

- CHAT_RIVAL替换为TRAINEE_CHAT中过滤ch==='rival'的条目
- CHAT_MANAGER替换为TRAINEE_CHAT中过滤ch==='manager'的条目
- CHAT_BROTHER保持不变
- 过滤逻辑在pushDailyChats函数开头统一处理，不修改trainee-stages.js池子结构

### 修复15：pools/index.js导出

**修改文件**：`src/ent-sim/pools/index.js`

新增一行导出：

```js
export { TRAINEE_EARLY_POOL, TRAINEE_MID_POOL, TRAINEE_LATE_POOL, TRAINEE_EVENTS, TRAINEE_CHAT } from './trainee-stages.js';
```

### 修复16：AGENTS.md手册更新

**修改文件**：`AGENTS.md`

- 阶段系统章节：描述8种状态（练习生前期/中期/后期 + 练习生 + 新人期/上升期/巅峰期/传奇期），天数驱动+人气出道
- 池子清单章节：55个池子（原50+新增5），按14类分组，每池子注明导出名/文件名/作用/条数
- 补齐npcNetwork（系统4）、修正模块数量为55个、补充ent-sim完整子模块索引

### 修复17：全量语法验证

对所有修改文件执行 `node -c` 语法检查：

- data.js, state.js, cycle.js, engine.js, prompts.js, ui.js
- pools/secret-discovery-events.js, pools/special-events.js, pools/index.js
- pools/trainee-stages.js（新建）
- ui-renderer.js

## 潜在问题与应对

| 问题 | 风险 | 应对 |
| --- | --- | --- |
| 人气增长过快（第3天出道） | 跳过中期/后期 | 出道优先是设计意图；人气从3到35需多次事件积累，正常不太可能3天达标 |
| 子池30条抽完 | 日程重复 | fallback到TRAINEE_POOL(50条)；每天1条30池子可撑30天 |
| traineePhase动态计算vs存储 | 过渡事件重复触发 | 双字段防重：存储_lastTraineePhase对比，只在变化时触发事件 |
| 旧存档无traineePhase字段 | 运行时undefined | migrateSave兜底初始化为1；所有读取处用 ` |  | 1` 安全取值 |
| CHAPTERS索引变更 | 章节显示乱码 | 同步修改chapterNameOf/chapterIconOf/chapterByPopularity中的索引计算 |