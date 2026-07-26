---
name: entSim-batch-fixes
overview: 合并全部待修项：7项代码修复 + 练习生三分阶段(人气=0) + 出道后6阶段扩展 + 3项手册更新 + 语法验证，共19项涉及约22个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：data.js中CHAPTERS改为6阶段定义（新人出道/崭露头角/稳步上升/人气偶像/顶流巨星/传奇殿堂），state.js中chapterByPopularity阈值改为6段(90/75/55/35/15)，checkChapterAdvance移除旧出道逻辑
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：ui.js pushDailyChats中练习生期过滤含"打歌/音银/回归/预录/直拍/一位/音源/宣发/巡演"的消息
    status: pending
  - id: fix-rival-name
    content: 修复情敌名字：ui.js showBusinessPanel中硬编码"情敌"改为suitorName()函数调用
    status: pending
  - id: fix-secret-dedup
    content: 修复秘密去重：engine.js applySecretEffect新增核心词辅助指纹函数，双指纹任一命中即判重
    status: pending
  - id: fix-entSim-flags
    content: 修复开局标记：state.js initEntSimState中sisterSetting时置位_relCharIntroduced和_rivalIntroduced，migrateSave兜底
    status: pending
  - id: remove-livestream-gift-secrets
    content: 删除4处直播间刷礼物秘密条目：secret-discovery-events.js、ui-renderer.js、ent-sim/state.js、special-events.js各删除一行
    status: pending
  - id: strengthen-prompt
    content: 加强prompt约束：prompts.js中显式禁止AI生成SEVENTEEN成员直播间秘密，严格限定EXO
    status: pending
    dependencies:
      - remove-livestream-gift-secrets
  - id: create-trainee-pools
    content: 新建trainee-stages.js池子文件：导出TRAINEE_EARLY/MID/LATE_POOL(各30条)+TRAINEE_EVENTS(50条含出道触发事件)+TRAINEE_CHAT(60条)
    status: pending
  - id: add-state-fields-zero-pop
    content: 新增state字段+人气归零+阈值重构：popularity初始0，新增traineePhase/_lastTraineePhase/_debutTriggerDay，chapterByPopularity改为6段阈值，migrateSave兜底
    status: pending
  - id: add-popularity-guard-and-debut
    content: engine.js添加addPopularity守卫(debutDay=0时return)+goEntSimNextDay中traineePhase更新+后期_debutTriggerDay出道触发+练习生轻量事件
    status: pending
    dependencies:
      - create-trainee-pools
      - add-state-fields-zero-pop
  - id: update-cycle-pools
    content: 改造cycle.js日程分配：练习生分支按traineePhase分池抽取(1->EARLY/2->MID/3->LATE)，子池空fallback TRAINEE_POOL
    status: pending
    dependencies:
      - create-trainee-pools
      - add-state-fields-zero-pop
  - id: update-prompts-trainee
    content: 增强prompts.js：练习生分支按traineePhase注入不同氛围，移除"人气"概念；出道后按6阶段注入
    status: pending
    dependencies:
      - add-state-fields-zero-pop
  - id: update-ui-trainee-display
    content: 更新ui.js状态栏：练习生期显示阶段emoji+名并隐藏人气栏，出道后恢复人气+6阶段显示
    status: pending
    dependencies:
      - add-state-fields-zero-pop
  - id: replace-trainee-chat
    content: 替换练习生聊天池：ui.js pushDailyChats中练习生期用TRAINEE_CHAT替换CHAT_RIVAL和CHAT_MANAGER
    status: pending
    dependencies:
      - create-trainee-pools
  - id: update-pools-index
    content: 更新pools/index.js导出：新增trainee-stages.js的5个常量到统一入口
    status: pending
    dependencies:
      - create-trainee-pools
  - id: add-two-chapter-pools
    content: 新增2个章节日程池：ent-schedules.js中新增CHAPTER2_SPROUTING(30条)和CHAPTER5_TOPSTAR(30条)，pools/index.js导出增加两池
    status: pending
  - id: update-chapter-pool-mapping
    content: 更新chapterPoolByIndex映射：cycle.js从4分支改为6分支映射6个章节日程池
    status: pending
    dependencies:
      - fix-chapter-label
      - add-two-chapter-pools
  - id: update-agents-md
    content: 全面更新AGENTS.md手册：9状态体系+57池子清单(14类分组)+npcNetwork系统4+模块数量修正
    status: pending
    dependencies:
      - fix-chapter-label
      - create-trainee-pools
  - id: validate-all
    content: 全量语法验证：node -c检查所有约22个修改文件
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
      - add-state-fields-zero-pop
      - add-popularity-guard-and-debut
      - update-cycle-pools
      - update-prompts-trainee
      - update-ui-trainee-display
      - replace-trainee-chat
      - update-pools-index
      - add-two-chapter-pools
      - update-chapter-pool-mapping
---

## 产品概述

对娱乐模拟器(entSim)进行批量修复与重构：修复7项代码缺陷、将练习生期拆分为三阶段（人气=0纯天数驱动）、将出道后从4阶段扩展为6阶段（参考明星志愿3）、全面更新AGENTS.md手册文档。共19项任务涉及约22个文件。

## 核心设计决策

### 练习生期（人气=0，天数驱动）

练习生未出现在公众视野，不存在人气概念。UI隐藏人气栏，prompt移除人气/粉丝/知名度等词汇。出道纯天数推动，必然发生。

- 前期：dayCount 1-4天（约12回合）
- 中期：dayCount 5-10天
- 后期：dayCount 11天起
- 出道：后期累计2-4天触发"出道最终评价"事件 → debutDay置位 → 人气=career.startPopularity → 章节系统接管

### 出道后6阶段（人气驱动）

参考明星志愿3的艺人称号体系，从4阶段扩展为6阶段，阶段更细腻、成长曲线更平滑。threshold值设计保证前期升阶快、后期升阶慢。

| 阶段 | 人气阈值 | icon | 日程池 |
| --- | --- | --- | --- |
| 新人出道 | 0-14 | 🌱 | CHAPTER1_NOVICE(已有,50条) |
| 崭露头角 | 15-34 | 🌿 | CHAPTER2_SPROUTING(新增,30条) |
| 稳步上升 | 35-54 | 🌸 | CHAPTER2_RISING(已有,50条) |
| 人气偶像 | 55-74 | 🔥 | CHAPTER3_PEAK(已有,51条) |
| 顶流巨星 | 75-89 | 👑 | CHAPTER5_TOPSTAR(新增,30条) |
| 传奇殿堂 | 90+ | 🏆 | CHAPTER4_LEGEND(已有,50条) |


共9个状态 = 练习生3子阶段 + 出道后6阶段

## 技术方案

### 第一部分：代码修复（7项）

**任务1：章节标签改为6阶段**

修改文件：`src/ent-sim/data.js`、`src/ent-sim/state.js`

data.js L91-96：CHAPTERS从4项改为6项：

```js
export var CHAPTERS = [
  { index: 1, name: '新人出道', icon: '🌱', desc: '刚刚出道的小糊团新人，资源少但冲劲足' },
  { index: 2, name: '崭露头角', icon: '🌿', desc: '开始有小型粉丝群，被圈内注意到' },
  { index: 3, name: '稳步上升', icon: '🌸', desc: '被圈内认可的成长型偶像，热搜常客' },
  { index: 4, name: '人气偶像', icon: '🔥', desc: '国民级热度，代言接到手软' },
  { index: 5, name: '顶流巨星', icon: '👑', desc: '每一步都是头条，恋爱即成核弹' },
  { index: 6, name: '传奇殿堂', icon: '🏆', desc: '封神之后，连恋情都成了大众祝福的童话' }
];
```

state.js L240-248：chapterByPopularity阈值重构为6段：

```js
export function chapterByPopularity(pop, startChapter) {
  var start = startChapter || 1;
  var threshold = 1;
  if (pop >= 90) threshold = 6;
  else if (pop >= 75) threshold = 5;
  else if (pop >= 55) threshold = 4;
  else if (pop >= 35) threshold = 3;
  else if (pop >= 15) threshold = 2;
  return Math.max(start, threshold);
}
```

checkChapterAdvance L261-264：移除 `if (E.career.debutDay === 0 && target >= 2)` 整段旧出道逻辑。出道改由engine.js的_debutTriggerDay驱动。此处只处理出道后的章节切换。初次出道时engine.js会直接设置E.chapter.index=1。

---

**任务2：聊天阶段过滤**

修改文件：`src/ent-sim/ui.js` pushDailyChats函数（L2408-2432附近）

在tryPushOneChat调用前，对rival和manager频道增加debutDay门控：

```js
var isDebut = (E.career && E.career.debutDay > 0);
var bannedWords = ['打歌','音银','回归','预录','直拍','一位','音源','宣发','巡演'];
if (!isDebut && (channel === 'rival' || channel === 'manager')) {
  var banned = false;
  for (var b = 0; b < bannedWords.length; b++) {
    if (msg.indexOf(bannedWords[b]) >= 0) { banned = true; break; }
  }
  if (banned) return;
}
```

---

**任务3：情敌名字显示**

修改文件：`src/ent-sim/ui.js` showBusinessPanel函数L1484

将 `(E.rival && E.rival.name) || '情敌'` 替换为 `suitorName() || '情敌'`。suitorName在ent-sim/state.js L191-193已定义，从npcNetwork获取真实名字。

---

**任务4：秘密去重增强**

修改文件：`src/ent-sim/engine.js` applySecretEffect函数（L224-236）

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

去重条件从 `key === existKey` 改为 `key === existKey || secretFingerprint(item) === existFp`。

---

**任务5：entSim开局标记置位**

修改文件：`src/ent-sim/state.js` initEntSimState末尾（L90后，saveGame前）

```js
if (career.sisterSetting) {
  GS._relCharIntroduced = true;
  GS._rivalIntroduced = true;
}
```

migrateSave中新字段兜底初始化。

---

**任务6：删除直播间刷礼物秘密（4处）**

每处删除单行数组元素：

- `src/ent-sim/pools/secret-discovery-events.js` L8：删除`secret_live_gift`条目
- `src/ui-renderer.js` L1334：删除_secPool中`'你会在SEVENTEEN某位成员的直播间悄悄刷礼物，假装是路人粉丝'`
- `src/ent-sim/state.js` L174：删除defaultSecrets中`'练习生时期在男主直播间刷过半年礼物，从没敢说'`
- `src/ent-sim/pools/special-events.js` L24：删除`secret_rival`条目

删除后各池子仍>=2条，randInt不越界。

---

**任务7：prompt约束加强**

修改文件：`src/prompts.js` L1139

原文`都是EXO追星向的小秘密`改为`所有秘密必须严格限定EXO（金珉锡/签售/周边/直拍/同人文），绝不涉及SEVENTEEN成员或任何男团直播间刷礼物行为。`

---

### 第二部分：练习生三分阶段系统（8项）

**任务8：新建 `src/ent-sim/pools/trainee-stages.js`**

导出5个常量，全部不含出道后内容：

- TRAINEE_EARLY_POOL(30条)：基础声乐课/舞蹈课/礼仪课/体测/外语课/第一天迷路/第一次月末评价/镜子练习/基础体能/发音矫正/自习加练/前辈舞台观摩/造型课程/摄影课/采访练习/即兴表演/心率控制/饮食管理/腰腹核心/柔韧拉伸/韩语正音/演技入门/舞台走位/睡眠管理课/皮肤管理/旁听录音/音乐理论/作词作业/编曲入门/说唱基础。每条格式`{ key: '基础声乐课', loc: '声乐教室' }`

- TRAINEE_MID_POOL(30条)：编舞学习/和声练习/表情管理课/综艺感培训/镜头感练习/团队合作课/旁听前辈录音/自由舞斗/台风训练/出道组筛选准备/月末评价冲刺/心理素质训练/前辈访谈/音源试听/编舞笔记整理/粉丝互动模拟/试镜练习/简历更新/个人VCR拍摄/才艺展示准备/危机公关基础/媒体应对/品牌合作课/形象管理/体能强化/语言进阶/音乐理论深化/作词作业进阶/编曲进阶/说唱进阶

- TRAINEE_LATE_POOL(30条)：出道组筛选/出道曲排练/个人VCR拍摄/MV概念会议/出道组最终名单/出道Showcase彩排/出道倒计时团建/造型定妆/出道前心理辅导/最终彩排/出道曲录音/舞台走位确认/出道采访模拟/粉丝见面会排练/应援色选定/团名讨论/出道预告拍摄/签名练习/自我介绍录制/出道前最后月末评价/制作人面试/公司高层终审/出道合同签署/出道日倒计时/团队定位最终确认/出道曲概念照拍摄/出道Showcase场地勘察/出道前最后体能测试/出道前声带检查/出道仪式排练

- TRAINEE_EVENTS(50条)：按`stage`字段标记。stage=1(前期)含月末评价拿C-/第一次被前辈记住名字/在练习室迷路/被同期帮助；stage=2(中期)含社内小型Showcase/同期被刷掉/第一次被评委夸奖/竞争压力爆发；stage=3(后期)含**"出道最终评价"核心触发事件**（engine.js用此事件触发出道）/最终名单公布/出道前最后考核/出道倒计时/公司高层谈话。每条格式`{ stage: 1, key: 'xxx', text: '...' }`

- TRAINEE_CHAT(60条)：`{ ch: 'brother'/'rival', t: '...' }`。哥哥频道30条（月末评价前关心/带夜宵探班/练习受伤问询/进步了夸你/出道组消息打探）；情敌频道30条（暗自较量/出道组名额讨论/训练时长比较/同期背地较劲）。全部不含出道后内容。

---

**任务9：state.js新增字段+人气归零+阈值重构**

修改文件：`src/ent-sim/state.js`

入口状态（L37-47区域）：

- `popularity`初始值从3改为0
- 新增 `traineePhase: 1`、`_lastTraineePhase: 1`、`_debutTriggerDay: 0`

新增导出函数（L240前插入）：

```js
export function traineePhaseOf(dayCount) {
  if (dayCount <= 4) return 1;
  if (dayCount <= 10) return 2;
  return 3;
}
```

chapterByPopularity阈值重构为6段（见任务1）。

checkChapterAdvance：移除L261-264整段旧出道逻辑（`if (E.career.debutDay === 0 && target >= 2) {...}`）。出道转由engine.js的_debutTriggerDay驱动。

chapterNameOf/chapterIconOf适配6项数组：`CHAPTERS[idx - 1]`（原已经正确）。

migrateSave中为新字段兜底初始化：`traineePhase=1, _lastTraineePhase=1, _debutTriggerDay=0`，旧存档popularity=0也适用于练习生。

---

**任务10：engine.js addPopularity守卫+出道触发+练习生事件**

修改文件：`src/ent-sim/engine.js`

**addPopularity守卫**（函数开头新增）：

```js
var E = GS.entSim;
if (E && E.career && E.career.debutDay === 0) return;
```

**goEntSimNextDay中练习生阶段更新**（dayCount递增后、checkChapterAdvance前插入）：

```js
if (E.career.debutDay === 0) {
  var newPhase = traineePhaseOf(E.cycle.dayCount);
  if (newPhase !== E.career._lastTraineePhase) {
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'phase', text: '进入练习生' + (newPhase===1?'前期':newPhase===2?'中期':'后期') });
    E.career._lastTraineePhase = newPhase;
  }
  E.career.traineePhase = newPhase;
  
  // 出道触发：后期累计2-4天
  if (E.career.traineePhase === 3) {
    E.career._debutTriggerDay = (E.career._debutTriggerDay || 0) + 1;
    if (E.career._debutTriggerDay >= 2 + randInt(0, 2)) {
      // 触发"出道最终评价"事件
      var debutEvent = { stage: 3, key: 'debut_final', text: '今天是出道最终评价的日子。你站在评价室门口深吸一口气——这一关过后，要么出道，要么离开。' };
      if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
      GS._entSimPopupQueue.push({ type: 'debutEvent', data: debutEvent });
      // 正式出道
      E.career.debutDay = E.cycle.dayCount || 1;
      var career = ENT_SIM_CAREERS[E.career.profession] || ENT_SIM_CAREERS['练习生'];
      E.career.popularity = career.startPopularity || 22;
      E.career.yearsActive = 0;
      E.chapter = { index: 1, name: '新人出道', icon: '🌱', desc: '刚刚出道的小糊团新人', roundInChapter: 0, entered: true };
    }
  }
}
```

**练习生轻量事件**（isDebutPopup L334之前插入）：

```js
if (!isDebutPopup && E.career.traineePhase >= 1 && Math.random() < 0.3) {
  var evt1 = pickFromPool(TRAINEE_EVENTS, 'stage', 1);
  if (evt1) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'traineeEvent', data:evt1 }); }
}
if (!isDebutPopup && E.career.traineePhase >= 2 && Math.random() < 0.25) {
  var evt2 = pickFromPool(TRAINEE_EVENTS, 'stage', 2);
  if (evt2) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'traineeEvent', data:evt2 }); }
}
```

---

**任务11：cycle.js日程分配**

修改文件：`src/ent-sim/cycle.js`

新增导入（L7-10区域）：`TRAINEE_EARLY_POOL, TRAINEE_MID_POOL, TRAINEE_LATE_POOL`

rollDailyAgenda练习生分支（L66-68）改为：

```js
} else if (!isDebut) {
  var tp = E.career.traineePhase || 1;
  var phasePool = tp === 1 ? TRAINEE_EARLY_POOL : tp === 2 ? TRAINEE_MID_POOL : TRAINEE_LATE_POOL;
  main = pick(phasePool.length > 0 ? phasePool : TRAINEE_POOL);
}
```

---

**任务12：prompts.js阶段注入**

修改文件：`src/ent-sim/prompts.js`

练习生分支（isDebut=false处）按traineePhase注入：

- 前期(1)：`你刚进公司不久，还在适应练习生生活。每天声乐课和舞蹈课排满，最害怕月末评价被刷掉。`
- 中期(2)：`你已经在公司练习了一段时间，适应了节奏。月末评价能稳定拿B+，有几个同期练习生成了朋友，但也感受到竞争压力。`
- 后期(3)：`出道组筛选正在紧张进行。每一天都可能是最后一天，也可能是离出道最近的一天。既期待又害怕。`

移除练习生期prompt中所有"人气""知名度""粉丝""公众"等词汇。

出道后分支按6阶段（chapter.index）注入对应氛围文本。

---

**任务13：ui.js状态栏**

修改文件：`src/ent-sim/ui.js` renderLeft函数（L183行附近）

练习生期（debutDay===0）：

```js
var traineeHtml = '';
if (!isDebut && E.career && E.career.traineePhase) {
  var phaseEmoji = E.career.traineePhase === 1 ? '🌱' : E.career.traineePhase === 2 ? '🌿' : '🌸';
  var phaseLabel = E.career.traineePhase === 1 ? '练习生前期' : E.career.traineePhase === 2 ? '练习生中期' : '练习生后期';
  traineeHtml = '<div class="es-trainee-phase">' + phaseEmoji + ' ' + phaseLabel + '</div>';
}
// 人气栏替换为阶段显示：L183的 `<span class="es-pop"...>人气 <b>...</b></span>` 替换为 traineeHtml
```

出道后（debutDay>0）：恢复人气+6阶段显示（改为从CHAPTERS数组取当前章节名和icon）。

---

**任务14：ui.js聊天池替换**

修改文件：`src/ent-sim/ui.js` pushDailyChats函数

练习生阶段（debutDay<=0）时：

- CHAT_RIVAL替换为TRAINEE_CHAT中过滤`ch==='rival'`的条目
- CHAT_MANAGER替换为TRAINEE_CHAT中过滤`ch==='manager'`的条目
- CHAT_BROTHER保持不变

---

**任务15：pools/index.js导出更新**

修改文件：`src/ent-sim/pools/index.js`

新增一行（L75后）：

```js
export { TRAINEE_EARLY_POOL, TRAINEE_MID_POOL, TRAINEE_LATE_POOL, TRAINEE_EVENTS, TRAINEE_CHAT } from './trainee-stages.js';
```

---

### 第三部分：出道后6阶段池子扩展（2项）

**任务16：新增2个章节日程池**

修改文件：`src/ent-sim/pools/ent-schedules.js`

在CHAPTER4_LEGEND之后新增：

CHAPTER2_SPROUTING(30条崭露头角日程)：小型打歌舞台/电台通告/校园演出/路演/第一次专访/小型粉丝见面会/街头公演/首次签售/new face采访/公司前辈合作舞台/音源首次入榜/新人奖候补/反响调查/第一次应援/小型商演/地方庆典/网络综艺/首次画报/新人合作企划/社媒挑战/粉丝名征集/首支Cover影片/小型颁奖礼/new face画报/新人合作曲/首次电台直播/粉丝问答/出道100天纪念/新人联合公演

CHAPTER5_TOPSTAR(30条顶流巨星日程)：世界巡演/顶级奢侈品牌代言/大赏候补/国际红毯/致敬舞台/纪录片拍摄/慈善大使/跨界合作/Billboard专访/时装周前排/专辑销量破纪录/国民代言签约/海外颁奖礼/前辈合作企划/后辈致敬舞台/时代周刊采访/奥运会/世界杯表演/终身成就奖/全球巡演安可/个人品牌创立/自传出版/Netflix纪录片/格莱美提名/好莱坞OST/慈善基金会/导师身份/传奇合作企划/告别演唱会/荣誉退休仪式

pools/index.js L75导出行增加CHAPTER2_SPROUTING和CHAPTER5_TOPSTAR：

```js
export { COMMON_POOL, RELATED_POOL, TRAINEE_POOL, CHAPTER1_NOVICE, CHAPTER2_SPROUTING, CHAPTER2_RISING, CHAPTER3_PEAK, CHAPTER5_TOPSTAR, CHAPTER4_LEGEND, BOYGROUP_POOL } from './ent-schedules.js';
```

---

**任务17：chapterPoolByIndex映射更新**

修改文件：`src/ent-sim/cycle.js` L38-43

从4分支改为6分支：

```js
function chapterPoolByIndex(idx) {
  if (idx >= 6) return CHAPTER4_LEGEND;   // 传奇殿堂
  if (idx >= 5) return CHAPTER5_TOPSTAR;   // 顶流巨星
  if (idx >= 4) return CHAPTER3_PEAK;      // 人气偶像
  if (idx >= 3) return CHAPTER2_RISING;    // 稳步上升
  if (idx >= 2) return CHAPTER2_SPROUTING; // 崭露头角
  return CHAPTER1_NOVICE;                  // 新人出道
}
```

---

### 第四部分：手册更新与验证（2项）

**任务18：AGENTS.md全面更新**

修改文件：`AGENTS.md`

更新内容：

1. 阶段系统章节：描述9状态体系（练习生3子阶段+出道后6阶段），含天数驱动+人气阈值表
2. 池子清单章节：57个池子（原50+新增7），按14类分组注明导出名/文件名/作用/条数
3. 练习生系统：traineePhase字段、天数出道机制、addPopularity守卫
4. 补齐npcNetwork系统4说明、修正模块数量

**任务19：全量语法验证**

对所有修改文件执行`node -c`语法检查。涉及文件：

- data.js, state.js, cycle.js, engine.js, prompts.js, ui.js
- pools/secret-discovery-events.js, pools/special-events.js, pools/index.js, pools/ent-schedules.js
- pools/trainee-stages.js（新建）
- ui-renderer.js, AGENTS.md（非JS不检查）

## 潜在问题与应对

| 问题 | 风险 | 应对 |
| --- | --- | --- |
| 人气增长过快导致3天出道 | 跳过中期/后期练习生阶段 | addPopularity在debutDay=0时return，练习生期人气永为0，纯天数驱动出道 |
| 子池30条抽完 | 日程重复 | 三个子池共90条，day1-4用前期30条(够用)，5-10用中期30条(6天刚好)，11+用后期30条+fallback到TRAINEE_POOL |
| traineePhase动态计算 | 过渡事件重复触发 | 双字段防重：_lastTraineePhase存储上次阶段号，只在变化时触发事件 |
| 旧存档无新字段 | 运行时undefined | migrateSave兜底初始化所有新字段为默认值 |
| CHAPTERS从4变6 | 章节索引越界 | chapterNameOf/chapterIconOf通过CHAPTERS[idx-1]自然适配；checkChapterAdvance的target值由chapterByPopularity返回1-6，old值由engine.js出道时显式设为1 |
| 出道事件弹窗类型debutEvent | UI无渲染器 | 需在ui.js中注册debutEvent类型的popup渲染函数，参考traineeEvent和brandOffer的渲染模式 |
| 两套"新人期"命名冲突 | 概念混淆 | 练习生3阶段用🌱🌿🌸+中文名，出道6阶段用不同icon，视觉上区分明显 |