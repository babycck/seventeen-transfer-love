---
name: entSim-batch-fixes
overview: 合并全部待修项：7项代码修复 + 练习生三分阶段系统（练习生期人气=0、纯天数出道）+ 3项手册更新 + 语法验证，共17项涉及约20个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：CHAPTERS新增练习生(0)，4阶段后移，startChapter=0，checkChapterAdvance改为只处理出道后章节切换
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：pushDailyChats中练习生期过滤含"打歌/音银/回归/预录/直拍/一位"关键词的消息
    status: pending
  - id: fix-rival-name
    content: 修复情敌名字：ui.js将硬编码"情敌"改为suitorName()函数调用
    status: pending
  - id: fix-secret-dedup
    content: 修复秘密去重：engine.js新增核心词辅助指纹函数，双指纹判重
    status: pending
  - id: fix-entSim-flags
    content: 修复开局标记：initEntSimState中sisterSetting时置位_relCharIntroduced和_rivalIntroduced
    status: pending
  - id: remove-livestream-gift-secrets
    content: 删除4处直播间刷礼物秘密：secret-discovery-events.js、ui-renderer.js、ent-sim/state.js、special-events.js
    status: pending
  - id: strengthen-prompt
    content: 加强prompt约束：prompts.js禁止AI生成SEVENTEEN直播间秘密，严格限定EXO
    status: pending
    dependencies:
      - remove-livestream-gift-secrets
  - id: create-trainee-pools
    content: 新建trainee-stages.js：导出TRAINEE_EARLY/MID/LATE_POOL(各30条)+TRAINEE_EVENTS(50条含出道触发事件)+TRAINEE_CHAT(60条)
    status: pending
  - id: add-state-fields-zero-pop
    content: state.js新增traineePhase/_lastTraineePhase/_debutTriggerDay字段，popularity初始化为0，checkChapterAdvance移除人气出道逻辑，migrateSave兜底
    status: pending
  - id: add-popularity-guard-and-debut
    content: engine.js添加addPopularity守卫(debutDay=0时return)+goEntSimNextDay中traineePhase更新+后期_debutTriggerDay出道触发+练习生轻量事件
    status: pending
    dependencies:
      - create-trainee-pools
      - add-state-fields-zero-pop
  - id: update-cycle-pools
    content: cycle.js rollDailyAgenda练习生分支按traineePhase分池抽取，子池用完fallback到TRAINEE_POOL
    status: pending
    dependencies:
      - create-trainee-pools
      - add-state-fields-zero-pop
  - id: update-prompts-trainee
    content: prompts.js练习生分支按traineePhase注入不同氛围文本，移除练习生期"人气"概念
    status: pending
    dependencies:
      - add-state-fields-zero-pop
  - id: update-ui-trainee-display
    content: ui.js renderLeft练习生期显示阶段emoji+阶段名并隐藏人气栏，出道后恢复
    status: pending
    dependencies:
      - add-state-fields-zero-pop
  - id: replace-trainee-chat
    content: ui.js pushDailyChats练习生期用TRAINEE_CHAT替换CHAT_RIVAL和CHAT_MANAGER
    status: pending
    dependencies:
      - create-trainee-pools
  - id: update-pools-index
    content: pools/index.js新增trainee-stages.js的5个导出
    status: pending
    dependencies:
      - create-trainee-pools
  - id: update-agents-md
    content: AGENTS.md全面更新：练习生3子阶段+出道后4阶段、55池子清单、补齐npNetwork模块
    status: pending
    dependencies:
      - fix-chapter-label
      - create-trainee-pools
  - id: validate-all
    content: node -c全量语法验证所有约20个修改文件
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
---

## 产品概述

对娱乐模拟器(entSim)进行批量修复、练习生系统三分重构、手册全面更新。核心原则：娱乐圈是恋爱背景板，出道必然发生；AI只管主线剧情和选项，其余全部走池子驱动。

## 核心设计决策

**练习生期无人气（popularity=0）**：未出道=没出现在公众视野，不存在"人气"概念。UI隐藏人气栏，addPopularity函数在debutDay=0时直接return。

**出道纯天数驱动**：进入后期(dayCount 11+)后累计2~4天触发"出道最终评价"事件 → debutDay置位 → 人气=career.startPopularity → 章节系统接管。不依赖人气>=35的旧阈值。

## 修改清单（17项）

### 代码修复（7项）

**修复1：章节标签错位**
练习生(debutDay=0)被标记为"新人期"。CHAPTERS数组第0项新增"练习生"，练习生startChapter=0，checkChapterAdvance改为出道驱动。

**修复2：聊天内容不分阶段**
练习生看到"今天打歌我看了"等已出道消息。initChatChannel增加debutDay门控，过滤含打歌/预录/回归等关键词的消息。

**修复3：情敌名字不显示**
联系人列表显示"情敌"而非真实名字。改用suitorName()函数。

**修复4：秘密重复生成**
同一秘密6个变体。新增核心词辅助指纹（EXO/金珉锡/签售/同人文/直拍等），双指纹判重。

**修复5：entSim开局标记未置位**
sisterSetting下_relCharIntroduced和_rivalIntroduced未置true。initEntSimState中置位。

**修复6：删除直播间刷礼物秘密（4处）**
4个文件中删除所有SEVENTEEN直播间刷礼物相关条目。

**修复7：prompt约束加强**
显式禁止AI生成涉及SEVENTEEN成员直播间的秘密，严格限定EXO。

### 练习生三分阶段系统（9项）

**阶段规则**：纯天数驱动，人气始终=0：

- 前期：dayCount 1-4天
- 中期：dayCount 5-10天
- 后期：dayCount 11天起
- 出道：后期累计2~4天后触发"出道最终评价"事件，debutDay置位，人气=career.startPopularity
- 旧TRAINEE_POOL(50条)保留作fallback

**修复8-15**：新建trainee-stages.js（5个池子/200条）、state新增traineePhase字段+人气归零、cycle.js按阶段分池、engine.js出道触发+addPopularity守卫、prompts.js阶段氛围注入、ui.js隐藏人气+显示阶段emoji、聊天池替换、pools/index.js导出更新。

### 手册更新（1项）+ 验证（1项）

**修复16-17**：AGENTS.md全面更新（练习生3子阶段+出道后4阶段、55池子清单、npNetwork）、node -c全量语法检查。

## 技术方案

### 修复1：章节标签（data.js + state.js）

**data.js变更**：

- CHAPTERS数组改为5项：`[{index:0, name:'练习生', icon:'🌱', desc:'还没有出道，每天都在练习室里挥洒汗水'}, ...]`
- 原4阶段各后移一位（新人期->index:1, 上升期->2, 巅峰期->3, 传奇期->4）
- ENT_SIM_CAREERS练习生 startChapter=0
- chapterIcon函数：`CHAPTERS[index]`（原`index-1`）

**state.js变更**：

- checkChapterAdvance：移除人气>=35出道逻辑，改为出道由engine.js的_debutTriggerDay驱动。只保留"出道后人气跨阈值切换章节"的功能（仅在debutDay>0时生效）
- chapterNameOf/chapterIconOf：`CHAPTERS[idx]`（原`CHAPTERS[idx-1]`）
- 章节初始化：练习生startChapter=0时chapDef取CHAPTERS[0]

### 修复2：聊天阶段过滤（ui.js）

pushDailyChats中练习生(debutDay<=0)时，对CHAT_RIVAL和CHAT_MANAGER消息用关键词列表过滤：
`['打歌', '音银', '回归', '预录', '直拍', '一位', '音源', '宣发', '粉丝', '巡演']`

### 修复3：情敌名字（ui.js）

`(E.rival && E.rival.name) || '情敌'` → `suitorName() || '情敌'`

### 修复4：秘密去重（engine.js）

新增`secretFingerprint(text)`函数提取核心词组合key，去重条件扩展为双指纹判重。

### 修复5：开局标记（state.js）

initEntSimState末尾、saveGame之前添加sisterSetting时置位逻辑。migrateSave兜底。

### 修复6：删除刷礼物秘密（4个文件）

各删除一行数组元素。删除后各池子仍>=2条，randInt不越界。

### 修复7：prompt约束（prompts.js）

第1139行文本加强为显式禁止SEVENTEEN成员直播间。

---

### 修复8：新增池子文件 trainee-stages.js

**新建文件**：`src/ent-sim/pools/trainee-stages.js`

导出5个常量：

- TRAINEE_EARLY_POOL(30条)：基础声乐课/舞蹈课/礼仪课/体测/外语课/第一天迷路/第一次月末评价/镜子练习/基础体能/发音矫正/自习加练/前辈舞台观摩/造型课程/摄影课/采访练习/即兴表演/心率控制/饮食管理/腰腹核心/柔韧拉伸/韩语正音/演技入门/舞台走位/睡眠管理课/皮肤管理/旁听录音/音乐理论/作词作业/编曲入门/说唱基础
- TRAINEE_MID_POOL(30条)：编舞学习/和声练习/表情管理课/综艺感培训/镜头感练习/团队合作课/旁听前辈录音/自由舞斗/台风训练/音乐理论/作词作业/编曲入门/说唱基础/出道组筛选准备/月末评价冲刺/心理素质训练/前辈访谈/音源试听/编舞笔记整理/粉丝互动模拟/试镜练习/简历更新/个人VCR拍摄/才艺展示准备/危机公关基础/媒体应对/品牌合作课/形象管理/体能强化/语言进阶
- TRAINEE_LATE_POOL(30条)：出道组筛选/出道曲排练/个人VCR拍摄/MV概念会议/出道组最终名单/出道Showcase彩排/出道倒计时团建/造型定妆/出道前心理辅导/最终彩排/出道曲录音/舞台走位确认/出道采访模拟/粉丝见面会排练/应援色选定/团名讨论/出道预告拍摄/签名练习/自我介绍录制/出道前最后月末评价/制作人面试/公司高层终审/出道合同签署/出道日倒计时/团队定位最终确认/出道曲概念照拍摄/出道Showcase场地勘察/出道前最后体能测试/出道前声带检查/出道仪式排练
- TRAINEE_EVENTS(50条)：按stage字段标记。前期(stage=1)：第一次月末评价/被前辈记住名字/在练习室迷路/被同期帮助。中期(stage=2)：社内小型Showcase/同期被刷掉/第一次被评委夸奖/竞争压力爆发。后期(stage=3)：出道组最终评价（核心出道触发事件）/最终名单公布/出道前最后考核/出道倒计时
- TRAINEE_CHAT(60条)：哥哥频道30条（鼓励/关心/月末评价前打气/带夜宵）+ 情敌频道30条（竞争/暗自较劲/出道组名额/训练进度），不含任何出道后内容

### 修复9：state.js新增字段+人气归零

**新增字段**：

```js
E.career = {
  popularity: 0,           // 从3改为0
  debutDay: 0,
  traineePhase: 1,         // 新增：1=前期 2=中期 3=后期
  _lastTraineePhase: 1,    // 新增：防过渡事件重复
  _debutTriggerDay: 0      // 新增：进入后期后累计天数，>=2触发"出道最终评价"
};
```

**checkChapterAdvance改造**：

- 移除人气>=35出道逻辑
- 仅保留出道后人气跨阈值切换章节的功能
- debutDay从0变为非0时自动同步人气=career.startPopularity

**migrateSave兜底**：所有新字段初始化为默认值。

### 修复10：engine.js addPopularity守卫+出道触发

**addPopularity守卫**（函数开头新增）：

```js
if (E.career.debutDay === 0) return; // 练习生不入气
```

**goEntSimNextDay中练习生阶段更新**：

```js
if (E.career.debutDay === 0) {
  var newPhase = E.cycle.dayCount <= 4 ? 1 : E.cycle.dayCount <= 10 ? 2 : 3;
  if (newPhase !== E.career._lastTraineePhase) {
    // 阶段跨越过渡事件
    E.careerHistory.push({...});
    E.career._lastTraineePhase = newPhase;
  }
  E.career.traineePhase = newPhase;
  
  // 出道触发：后期累计2~4天
  if (E.career.traineePhase === 3) {
    E.career._debutTriggerDay = (E.career._debutTriggerDay || 0) + 1;
    if (E.career._debutTriggerDay >= 2 + randInt(0, 2)) {
      // 触发"出道最终评价"事件
      E.career.debutDay = E.cycle.dayCount || 1;
      E.career.popularity = career.startPopularity || 22;
      // 推送出道事件弹窗
    }
  }
}
```

**练习生轻量事件**（isDebutPopup之前插入）：

- stage=1事件（月末评价）：30%概率
- stage=2事件（社内Showcase）：25%概率
- 出道事件已由_debutTriggerDay接管

### 修复11：cycle.js日程分配

rollDailyAgenda练习生分支按traineePhase分池：1→TRAINEE_EARLY_POOL, 2→TRAINEE_MID_POOL, 3→TRAINEE_LATE_POOL。子池用完fallback到TRAINEE_POOL。

### 修复12：prompts.js阶段注入

练习生分支按traineePhase注入不同氛围文本，所有prompt中移除练习生期的"人气""知名度""粉丝"概念。

### 修复13：ui.js状态栏

renderLeft中debutDay=0时显示阶段emoji（🌱/🌿/🌸）+ 阶段名，隐藏人气栏。出道后恢复人气+章节显示。

### 修复14：ui.js聊天池替换

pushDailyChats中练习生阶段用TRAINEE_CHAT替换CHAT_RIVAL和CHAT_MANAGER，CHAT_BROTHER保持不变。

### 修复15：pools/index.js导出更新

新增trainee-stages.js的5个导出到统一入口。

### 修复16：AGENTS.md手册更新

更新阶段系统描述（练习生3子阶段+出道后4阶段）、55池子清单、补齐npNetwork等缺失模块。

### 修复17：全量语法验证

node -c检查所有修改文件。

## 潜在问题与应对

| 问题 | 风险 | 应对 |
| --- | --- | --- |
| 出道事件触发时机 | 后期2~4天窗口，体验不可控 | randInt(0,2)提供变化空间，最小2天最大4天 |
| 子池30条抽完 | 日程重复 | fallback到TRAINEE_POOL(50条) |
| traineePhase动态计算 | 过渡事件重复触发 | 双字段防重：_lastTraineePhase对比 |
| 旧存档无traineePhase | 运行时undefined | migrateSave兜底初始化 |
| addPopularity守卫遗漏 | 池子事件可能直接改人气 | 池子事件均通过addPopularity统一入口 |
| 出道后人气初始化 | 从0跳到startPopularity可能突兀 | 出道事件后自然过渡，UI同步刷新 |