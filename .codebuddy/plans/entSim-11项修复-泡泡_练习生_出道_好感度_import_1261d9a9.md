---
name: entSim-11项修复-泡泡+练习生+出道+好感度+import
overview: 修复发泡泡按钮无绑定、练习生2+2+2天、mannerisms降频、粉丝数同步、速通出道、出道仪式、男主选项注入、场景感官去重、出道后profession更新、currentDate同步、好感度AI微调、chartItem人气门槛，外加修复engine.js缺import导致天气/日期同步空跑
todos:
  - id: fix-imports-weather
    content: 修复engine.js缺失import：第7行追加gameDayOf；追加import generateDailyWeather from formatters.js
    status: completed
  - id: shorten-trainee
    content: 缩短练习生天数：state.js第263-264行traineePhaseOf改为2+2+2；engine.js第452行出道触发阈值降至1+randInt(0,1)
    status: completed
  - id: fix-bubble
    content: 修复泡泡按钮：ui.js第2190行加onclick；第1841-1845行__phoneBubbleSend去掉输入框读取直接调sendBubbleMessage
    status: completed
  - id: fix-currentdate
    content: currentDate同步：engine.js第70行后追加GS.currentDate从dayCount推导
    status: completed
    dependencies:
      - fix-imports-weather
  - id: fix-profession
    content: 出道后profession更新：engine.js第466行后追加profession和careerKey设置
    status: completed
    dependencies:
      - shorten-trainee
  - id: fix-subscribers
    content: 粉丝数同步：engine.js第469行后追加bubble.subscribers按popularity更新
    status: completed
    dependencies:
      - shorten-trainee
  - id: debut-ceremony
    content: 出道仪式：engine.js出道触发块设_entSimStageUpPending；ui.js新增showDebutCeremony函数
    status: completed
    dependencies:
      - shorten-trainee
  - id: speed-debut
    content: 速通出道：ui.js第419行按钮文案；第1071行加确认弹窗；第1010行fastForwardTrainee改逻辑
    status: completed
    dependencies:
      - shorten-trainee
  - id: mannerism-freq
    content: 降低mannerism频率：brother.js第39/43行改为10-15；prompts.js第65行文案同步
    status: completed
  - id: prompt-rules
    content: prompts.js加3条规则：第211行后追加男主选项注入+场景感官去重+好感度AI微调
    status: completed
  - id: chart-threshold
    content: chartItem人气门槛：immersion.js第130行加popularity>=30条件
    status: completed
  - id: build-push
    content: 编译验证并推送
    status: completed
    dependencies:
      - fix-imports-weather
      - shorten-trainee
      - fix-bubble
      - fix-currentdate
      - fix-profession
      - fix-subscribers
      - debut-ceremony
      - speed-debut
      - mannerism-freq
      - prompt-rules
      - chart-threshold
---

## 修复清单（11项）

基于SEVENTEEN_存档_20260729.json深度审查和代码验证，共11项修复：

### 1. 发泡泡按钮无反应

出道后点击泡泡App发送按钮无响应。根因：renderBubbleChat渲染的`es-bubble-send`按钮没有onclick绑定，且`__phoneBubbleSend`试图读取不存在的`es-phone-bubble-input`输入框。

### 2. 练习生天数缩短

前期2天+中期2天+后期2天=6天出道。出道触发阈值降至1~2天。

### 3. mannerism触发频率降低

"打游戏"是全圆佑真实特征不过滤，但触发频率5~8回合改为10~15回合，减少重复。

### 4. 粉丝数同步

出道后bubble.subscribers随popularity自动更新。

### 5. 快进5天改为速通出道

按钮改为"速通出道"，加确认弹窗，确认后直接跳到出道触发。

### 6. 出道仪式

全屏粉色渐变overlay+团名/队友/出道曲展示+3秒动画淡出。

### 7. prompt规则（3条）

- 男主选项注入：练习生阶段男主出场时至少1个选项与他相关
- 场景感官去重：禁止重复地板打蜡/空调出风口/无声搞笑等近3轮描写
- 好感度AI微调：男主实际互动时AI返回affectionDelta +1~+3

### 8. 出道后profession更新

出道触发时同步设置career.profession="新人偶像"、careerKey="idol"。

### 9. currentDate同步

每次generateEntSimRound从dayCount推导GS.currentDate。

### 10. chartItem人气门槛

出道纪念日等chartItem要求popularity>=30才生成。

### 11. engine.js缺失import修复（关键bug）

`generateDailyWeather`（formatters.js）和`gameDayOf`（state.js）未import，导致天气同步永远空跑。

## 技术方案

### 修改文件（7个）

| 文件 | 修改项 | 行号 |
| --- | --- | --- |
| `src/ent-sim/engine.js` | import修复+出道阈值+profession+粉丝数+currentDate+出道仪式标记 | 第7/452/463-469/70行 |
| `src/ent-sim/ui.js` | 泡泡按钮+__phoneBubbleSend+速通出道+出道仪式函数 | 第2190/1841/419/1071/1010行 |
| `src/ent-sim/state.js` | traineePhaseOf阈值 | 第263-264行 |
| `src/ent-sim/prompts.js` | mannerism文案+男主选项+场景去重+好感度微调 | 第65/211行 |
| `src/ent-sim/brother.js` | mannerism触发间隔 | 第39/43行 |
| `src/ent-sim/immersion.js` | chartItem人气门槛 | 第130行 |


### engine.js 详细修改（6处）

**A. 修复缺失import（第7行后追加）**

```javascript
// 第7行现有：import { ..., gameMonthOf, gameSeasonOf } from './state.js';
// 修改：追加 gameDayOf 到该import
// 第7行后追加：import { generateDailyWeather } from '../formatters.js';
```

**B. currentDate同步（第70行后追加）**

```javascript
GS.currentDate = { month: gameMonthOf(E0.cycle.dayCount), day: gameDayOf(E0.cycle.dayCount) };
```

**C. 出道触发阈值（第452行）**

```javascript
// 旧：if (E.career._debutTriggerDay >= 2 + randInt(0, 2)) {
// 新：if (E.career._debutTriggerDay >= 1 + randInt(0, 1)) {
```

**D. profession更新（第466行E.chapter赋值后追加）**

```javascript
E.career.profession = '新人偶像';
E.career.careerKey = 'idol';
```

**E. 出道仪式标记（第468行showToast后追加）**

```javascript
GS._entSimStageUpPending = { type: 'debut', group: E.groupMeta, timestamp: Date.now() };
```

**F. 粉丝数同步（第469行后追加）**

```javascript
if (E.career.debutDay > 0 && E.bubble) {
  var pop = E.career.popularity || 0;
  E.bubble.subscribers = Math.max(100, Math.floor(pop * 15) + 100 + randInt(0, 50));
}
```

### ui.js 详细修改（4处）

**A. 泡泡按钮绑定（第2190行）**

```
旧：'<button id="es-bubble-send" class="bubble-send-btn"' + (canSend ? '' : ' disabled') + '>'
新：'<button id="es-bubble-send" class="bubble-send-btn"' + (canSend ? ' onclick="window.__phoneBubbleSend()"' : ' disabled') + '>'
```

**B. __phoneBubbleSend简化（第1841-1845行）**

```
旧：var input = document.getElementById('es-phone-bubble-input');
     if (!input || !input.value.trim()) return;
     input.value = '';
     sendBubbleMessage().then(...)
新：sendBubbleMessage().then(function() {
```

**C. 速通出道**

- 第419行：`'⚡快进5天'` 改为 `'🎀速通出道'`
- 第1071-1074行：fastforward分支改为弹出showConfirmModal确认弹窗
- 第1010-1032行fastForwardTrainee：确认后设_traineeDayCount=7 + _debutTriggerDay=2 + goEntSimNextDay()

**D. 出道仪式（新增showDebutCeremony函数）**
在renderEntSimGameScreen的`__renderEntSim`中检测`GS._entSimStageUpPending.type==='debut'`。全屏粉色渐变overlay，依次显示团名/所属社/概念/队友/出道曲/粉丝名，每项0.5s渐入，3秒后淡出。

### state.js 详细修改（1处）

**traineePhaseOf阈值（第263-264行）**

```javascript
// 旧：if (dayCount <= 4) return 1; if (dayCount <= 10) return 2;
// 新：if (dayCount <= 2) return 1; if (dayCount <= 4) return 2;
```

### prompts.js 详细修改（4处）

**A. mannerism频率文案（第65行）**
`每 5-8 回合` → `每 10-15 回合`

**B. 男主选项注入（第211行后追加）**

```
【选项规则·练习生阶段】若本段剧情中男主有出场（哪怕是路过/背景），你必须确保3个选项中至少有1个与男主相关。互动必须温和、符合前后辈关系：如"和哥哥一起找他吃饭""在走廊偷看他一眼""让哥哥帮忙带句话"等。禁止越界互动（独处/肢体接触/暧昧暗示）。
```

**C. 场景感官去重（追加）**

```
【场景描写·去重规则】禁止重复使用最近3轮剧情中出现过的场景感官描写关键词，特别是：地板打蜡、空调出风口争夺、无声搞笑、橘子/柚子味饮料、冰上芭蕾/滑冰等。每轮练习室场景必须换不同的环境细节（如：窗外的天气变化、音响设备、不同时段的光线、镜子里的倒影、墙上的海报、某人带来的新物品等）。
```

**D. 好感度AI微调（A4块区域内追加）**

```
【好感度规则】若本段男主有实际互动（对话/同框/独处），你必须在extras.affectionDelta中返回+1~+3的正值。仅背景路过时返回0。禁止返回负值除非是明显的负面事件。
```

### brother.js 详细修改（1处）

**mannerism触发间隔（第39、43行）**

```javascript
// 旧：randInt(5, 8)
// 新：randInt(10, 15)
```

### immersion.js 详细修改（1处）

**chartItem人气门槛（第130行）**

```javascript
// 旧：if (isDebut && CHART_POOL && CHART_POOL.length)
// 新：if (isDebut && CHART_POOL && CHART_POOL.length && (E.career.popularity || 0) >= 30)
```