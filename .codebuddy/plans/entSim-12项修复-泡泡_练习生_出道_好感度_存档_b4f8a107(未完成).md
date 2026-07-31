---
name: entSim-12项修复-泡泡+练习生+出道+好感度+存档
overview: 修复发泡泡按钮无绑定、练习生2+2+2天、mannerisms降频、粉丝数同步、速通出道、出道仪式、男主选项注入、场景感官去重，外加出道后profession更新、currentDate/weather同步、好感度与叙事对齐、出道纪念日合理性共12项
todos:
  - id: fix-bubble
    content: 修复泡泡按钮绑定和__phoneBubbleSend函数：ui.js第2190行加onclick，第1841行去掉输入框读取
    status: pending
  - id: shorten-trainee
    content: 缩短练习生天数：state.js traineePhaseOf改为2+2+2；engine.js出道触发阈值降至1+randInt(0,1)
    status: pending
  - id: mannerism-freq
    content: 降低mannerism触发频率：brother.js改为10-15回合；prompts.js文案同步
    status: pending
  - id: fix-subscribers
    content: 出道后粉丝数同步：engine.js goEntSimNextDay中追加bubble.subscribers按popularity更新
    status: pending
    dependencies:
      - shorten-trainee
  - id: speed-debut
    content: 快进5天改为速通出道：ui.js按钮文案+确认弹窗+直接跳出道逻辑
    status: pending
    dependencies:
      - shorten-trainee
  - id: debut-ceremony
    content: 新增出道仪式：ui.js加showDebutCeremony函数；engine.js出道触发时设_entSimStageUpPending
    status: pending
    dependencies:
      - shorten-trainee
  - id: prompt-rules
    content: prompts.js加3条规则：男主选项注入+场景感官去重+好感度AI微调(affectionDelta)
    status: pending
  - id: fix-profession
    content: 出道后profession更新：engine.js出道触发块内同步设profession和careerKey
    status: pending
    dependencies:
      - shorten-trainee
  - id: fix-currentdate
    content: currentDate同步：engine.js generateEntSimRound开头季节同步处追加GS.currentDate
    status: pending
  - id: chart-threshold
    content: chartItem人气门槛：immersion.js generateDailyBuzz中chartItem加popularity>=30条件
    status: pending
  - id: fix-bubble-save
    content: 泡泡消息存档：engine.js sendBubbleMessage成功回调中写入E.bubble.messages
    status: pending
    dependencies:
      - fix-bubble
  - id: build-push
    content: 编译验证并推送
    status: pending
    dependencies:
      - fix-bubble
      - shorten-trainee
      - mannerism-freq
      - fix-subscribers
      - speed-debut
      - debut-ceremony
      - prompt-rules
      - fix-profession
      - fix-currentdate
      - chart-threshold
      - fix-bubble-save
---

## 12项修复清单

### 原有8项

1. **发泡泡按钮无反应**：renderBubbleChat渲染的es-bubble-send按钮缺少onclick绑定，__phoneBubbleSend尝试读不存在的输入框。修复：按钮加onclick，函数直接调sendBubbleMessage不读输入框。练习生阶段保持拦截。

2. **练习生天数缩短**：前期2天+中期2天+后期2天=6天出道。traineePhaseOf阈值改为dayCount<=2前期/<=4中期/>4后期。出道触发_debutTriggerDay>=1+randInt(0,1)=1~2天。

3. **mannerism触发频率降低**："打游戏"是全圆佑特征不过滤，但5~8回合改10~15回合，减少重复出现。

4. **粉丝数同步**：出道后goEntSimNextDay中bubble.subscribers按popularity*15+100更新。

5. **快进5天改为速通出道**：按钮文案改为"速通出道"，加确认弹窗，确认后直接跳出道。

6. **出道仪式**：全屏粉色渐变overlay+团名/队友/出道曲展示+3秒动画淡出。

7. **男主选项注入**：练习生阶段男主出场时，3个选项中至少1个与男主相关的温和互动。

8. **prompt场景感官去重**：禁止重复近3轮出现过地板打蜡/空调出风口/无声搞笑等描写。

### 存档审查新发现4项

9. **出道后profession更新**：出道触发时同步设E.career.profession="新人偶像"、E.career.careerKey="idol"。

10. **currentDate同步**：generateEntSimRound开头的季节同步处追加GS.currentDate={month, day}。

11. **好感度AI微调**：prompt A4块追加规则「男主实际出场互动时，AI在extras.affectionDelta返回+1~+3」。

12. **chartItem人气门槛**：immersion.js生成chartItem时加popularity>=30条件。

## 修改文件（7个）

### 1. src/ent-sim/ui.js（5处）

**A. 泡泡按钮绑定（第2190行）**

```
旧：'<button id="es-bubble-send" class="bubble-send-btn"' + (canSend ? '' : ' disabled') + '>'
新：'<button id="es-bubble-send" class="bubble-send-btn"' + (canSend ? ' onclick="window.__phoneBubbleSend()"' : ' disabled') + '>'
```

**B. __phoneBubbleSend修复（第1841-1853行）**
去掉输入框读取，直接调sendBubbleMessage().then(rerenderBubble)。

**C. 速通出道（第419行+第1010-1032行+第1071-1075行）**

- 按钮文案：'⚡快进5天' → '🎀速通出道'
- fastForwardTrainee：弹showConfirmModal确认后设_traineeDayCount=7, _debutTriggerDay=2, 调goEntSimNextDay()

**D. 出道仪式showDebutCeremony()**
检测GS._entSimStageUpPending.type==='debut'时触发。全屏粉色渐变overlay，依次显示团名/所属社/概念/队友/出道曲/粉丝名，每项0.5s渐入，全部显示后1.5s整体淡出。

### 2. src/ent-sim/engine.js（5处）

**A. 出道触发阈值（第452行）**
`2 + randInt(0,2)` → `1 + randInt(0,1)`

**B. 出道后profession更新（出道触发块内追加）**

```js
E.career.profession = '新人偶像';
E.career.careerKey = 'idol';
```

**C. 粉丝数同步（第469行后追加）**

```js
if (E.career.debutDay > 0 && E.bubble) {
  var pop = E.career.popularity || 0;
  E.bubble.subscribers = Math.max(100, Math.floor(pop * 15) + 100 + randInt(0, 50));
}
```

**D. currentDate同步（generateEntSimRound开头季节同步处追加）**

```js
GS.currentDate = { month: gameMonthOf(E0.cycle.dayCount), day: gameDayOf(E0.cycle.dayCount) };
```

**E. 泡泡消息存档（sendBubbleMessage成功回调中追加）**

```js
E.bubble.messages.push({ role: 'heroine', content: bubbleText, ts: Date.now() });
```

### 3. src/ent-sim/state.js（1处）

**traineePhaseOf阈值（第262-265行）**

```js
旧：if (dayCount <= 4) return 1; if (dayCount <= 10) return 2; return 3;
新：if (dayCount <= 2) return 1; if (dayCount <= 4) return 2; return 3;
```

### 4. src/ent-sim/prompts.js（4处）

**A. mannerism频率文案（第65行）**
`每 5-8 回合` → `每 10-15 回合`

**B. 男主选项注入（第211行后追加）**

```
【选项规则·练习生阶段】若本段剧情中男主有出场，你必须确保3个选项中至少1个与男主相关。温和互动如"和哥哥找他吃饭""在走廊偷看他一眼""让哥哥带话"。禁止越界互动。
```

**C. 场景感官去重（第211行后追加）**

```
【场景描写·去重规则】禁止重复近3轮出现过的场景感官描写：地板打蜡、空调出风口争夺、无声搞笑等。每轮练习室换不同环境细节。
```

**D. 好感度AI微调（A4块区域内追加）**

```
【好感度规则】若本段男主有实际互动（对话/同框/独处/冲突/心动），你必须在extras.affectionDelta中返回+1~+3的正值。仅背景路过或无互动时返回0。禁止返回负值除非是明显的负面事件。
```

### 5. src/ent-sim/brother.js（1处）

**mannerism触发间隔（第39、43行）**

```js
旧：randInt(5, 8)
新：randInt(10, 15)
```

### 6. src/ent-sim/immersion.js（1处）

**chartItem人气门槛（generateDailyBuzz中chartItem生成处）**

```js
旧：直接生成chartItem
新：if (popularity >= 30) 才生成chartItem（包含出道纪念日等）
```

### 7. 不修改的文件

- pools/trainee-*.js（池子不扩充）
- pools/ent-schedules.js（日程池不动）
- state.js buildMannerisms（不过滤打游戏）