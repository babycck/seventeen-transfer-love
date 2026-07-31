---
name: entSim三大修复-季节校验-生成失败回退-extras脱节
overview: 修复 entSim 模式的三个问题：①季节/节日与月份矛盾（11月秋天出现白色情人节/初雪）；②AI生成失败后 roundTotal 不回退导致空洞轮积累；③AI 将剧情塞进 extras 但 narrative 正文不显示导致玩家看到的内容与日志脱节。
todos:
  - id: fix-season-ban
    content: 在 prompts.js buildStageBanCard 和 injectPoolInspirations 反向禁制中追加月份/季节矛盾禁制（初雪、白色情人节等跨季节词汇）
    status: pending
  - id: fix-validator-season
    content: 在 validator.js validateEntSimNarrative 三联扫描中追加季节月份矛盾词正则检测
    status: pending
    dependencies:
      - fix-season-ban
  - id: fix-roundtotal-rollback
    content: 在 engine.js generateEntSimRound 的 .catch 块中回退被前置递增的 roundTotal 和 timeOfDay
    status: pending
  - id: fix-extras-narrative-consistency
    content: 在 validator.js 中新增 narrative-extras 一致性校验，检测 extras 声明的关键实体是否在叙事正文中出现
    status: pending
---

## 产品概述

修复娱乐圈模拟器（entSim）模式下三个从存档分析中暴露的落地问题，提升200轮长期运行的稳定性。

## 问题与修复

### 问题1：季节/月份/节日越界

当前season=autumn、gameMonth=11（11月秋天），AI却产出"白色情人节泡泡"（3月14日）和"初雪场景"（冬季）。System prompt第151行已有粗粒度约束，但AI不遵守。buildStageBanCard只有雾天气禁制，未按月份禁用矛盾节日词。

**修复**：在buildStageBanCard和injectPoolInspirations反向禁制中加季节/月份动态校验，validator.js三联扫描加月份矛盾词正则。

### 问题2：生成失败产生空洞轮

Day97 round6生成失败后，diarySummary标记"剧情生成失败"，careerHistory零条目，但roundTotal在前置代码（continueEntSimMain:798）已+1，失败后未回退。

**修复**：在generateEntSimRound的.catch块中回退已增加的roundTotal和timeOfDay，防止空洞轮积累。

### 问题3：extras事件记录与narrative正文脱节

careerHistory记录了完整故事（哥哥路过看膏药→经纪人送膏药→其实是哥买的），但玩家在narrative正文中只看到"哥哥路过看了一眼"，后续内容完全未出现。AI学会了绕过禁制卡——不在正文写越级内容，转而在extras中塞入事件记录。

**修复**：在validator.js中新增 narrative-extras 一致性校验——extras中声明的关键实体如果在narrative正文中不存在，裁剪extras条目或降级为warning。

## 技术栈

- 语言：JavaScript (ES Modules)，使用 `var` 声明
- 修改范围：`src/ent-sim/prompts.js`、`src/validator.js`、`src/ent-sim/engine.js`
- 不改UI，不改数据结构

## 实现方案

### Bug1：季节月份越界校验（双层防护）

**第1层：prompt预注入（buildStageBanCard + injectPoolInspirations）**

在`buildStageBanCard`中读取`GS.gameMonth`和`GS.season`，动态生成季节矛盾禁制：

| 条件 | 禁制 |
| --- | --- |
| gameMonth 不在12-2 | 禁止"初雪""雪花""积雪""第一场雪" |
| gameMonth 不是3 | 禁止"白色情人节" |
| season=autumn 且 gameMonth=11 | 禁止"初雪""圣诞""Pepero" |
| season=spring | 禁止"冬天""供暖""暖气"等冬季用语 |


同时在`injectPoolInspirations`的反向禁制中也追加同样的规则。

**第2层：后生成校验（validator.js）**

在`validateEntSimNarrative`的三联扫描中追加月份矛盾正则，检测到命中即返回error级correction，触发AI重试。

### Bug2：生成失败轮次回退

**核心思路**：`continueEntSimMain:798`在调用`generateEntSimRound`之前就执行了`roundTotal++`和`timeOfDay`更新。如果生成失败，需在`.catch`中回退这两个值。

在`generateEntSimRound`的`.catch`块（engine.js:147-152）中：

1. 读取`GS.entSim.cycle`的当前值
2. 如果本轮是`continueEntSimMain`触发的（通过extra.timeSlot判断），回退`roundTotal--`和`timeOfDay--`
3. 同时将fallback对象的`failed: true`保持，供后续UI识别

注意：`genCount`在`game-engine.js:3026`的成功路径中才递增，不受失败影响，无需处理。

### Bug3：extras与narrative一致性校验

**核心思路**：AI产出的`extras`中关键实体（如"药店""膏药""经纪人""送来"等）如果在narrative正文中完全没有出现，说明AI把故事藏进了extras。

在`validateEntSimNarrative`中新增一段校验逻辑：

1. 提取`extras.brother.note`和`extras.romanceBeat.event`中的关键实体词
2. 检查这些词是否在narrative正文中出现
3. 如果extras中声明了具体行动（如"送膏药"），但narrative中只到"看了一眼"就结束，则：

- 将brother.note裁剪为"本轮剧情影响"（与数值门控对齐）
- 如果romanceBeat.event涉及越级行为且narrative未体现，降级为warning

## 目录结构

```
src/
├── ent-sim/
│   ├── prompts.js    # [MODIFY] buildStageBanCard追加月份禁制、injectPoolInspirations反向禁制追加月份规则
│   └── engine.js     # [MODIFY] .catch块中回退roundTotal/timeOfDay
├── validator.js      # [MODIFY] 三联扫描追加季节矛盾正则 + narrative-extras一致性校验
```

## 关键实现细节

### prompts.js buildStageBanCard 追加逻辑

```javascript
// 在现有 bans 收集之后、return 之前追加：
var gameMonth = GS.gameMonth || gameMonthOf(E.cycle.dayCount || 1);
var isWinter = (gameMonth === 12 || gameMonth <= 2);
if (!isWinter) {
  bans.push({ ban: '禁止"初雪""雪花""积雪""第一场雪"（当前非冬季月份）',
    example: '...' });
}
var isMarch = (gameMonth === 3);
if (!isMarch) {
  bans.push({ ban: '禁止"白色情人节"（只有3月才可出现）',
    example: '...' });
}
```

### engine.js .catch 回退逻辑

```javascript
.catch(function(err) {
  showToast('...');
  var E = GS.entSim;
  // 回退继续主线时前置递增的计数
  if (extra.timeSlot !== undefined && E.cycle.timeOfDay > 0) {
    E.cycle.timeOfDay--;
    E.cycle.roundTotal = Math.max(0, (E.cycle.roundTotal || 1) - 1);
  }
  var fb = { narrative: '...', options: ['重试'], extras: {}, type: type, failed: true };
  ...
})
```

### validator.js narrative-extras一致性校验

- 在现有三联扫描末尾（`return corrections`前）追加
- 检查`_note`中是否包含narrative正文不存在的关键动作词（"送""给""递""买"等）
- 如extras有实体动作但narrative无对应描述，添加warning级correction
- 不触发重试（避免无限循环），但标记供applySideEffects裁剪使用