---
name: entSim-8项修复-泡泡+练习生+出道仪式+剧情多样性
overview: 修复发泡泡按钮无绑定、练习生缩短为2+2+2天、mannerisms降频过滤打游戏、粉丝数同步、速通出道按钮、出道仪式、男主选项注入、prompt层禁止重复已有感官描写共8项
todos:
  - id: fix-bubble
    content: 修复泡泡按钮绑定和__phoneBubbleSend函数：ui.js第2190行加onclick，第1841行去掉输入框读取
    status: pending
  - id: shorten-trainee
    content: 缩短练习生天数：state.js第262行traineePhaseOf阈值改为4；engine.js第452行出道触发降至1+randInt(0,1)
    status: pending
  - id: mannerism-freq
    content: 降低mannerism触发频率：brother.js第39/43行randInt(5,8)改为randInt(10,15)；prompts.js第65行文案同步改为10-15
    status: pending
  - id: fix-subscribers
    content: 出道后粉丝数同步：engine.js第469行后追加bubble.subscribers按popularity*15+100更新
    status: pending
  - id: speed-debut
    content: 快进5天改为速通出道：ui.js第419行按钮文案+第1071行加确认弹窗+第1010行fastForwardTrainee改逻辑
    status: pending
    dependencies:
      - shorten-trainee
  - id: debut-ceremony
    content: 新增出道仪式：ui.js加showDebutCeremony函数；engine.js出道触发时设_entSimStageUpPending
    status: pending
    dependencies:
      - shorten-trainee
  - id: prompt-rules
    content: prompts.js加两条规则：第211行后追加男主选项注入规则+场景感官去重规则
    status: pending
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
---

## 修复清单（9项）

### 1. 发泡泡按钮无反应

出道后点击泡泡App里的发送按钮无任何反应。根因：renderBubbleChat渲染的按钮id=es-bubble-send缺少onclick绑定；window.__phoneBubbleSend函数尝试读取不存在的es-phone-bubble-input输入框。修复：按钮加onclick="window.__phoneBubbleSend()"；__phoneBubbleSend改为直接调用sendBubbleMessage()不读输入框。练习生阶段保持拦截（出道后才解锁泡泡）。

### 2. 练习生天数缩短

前期2天+中期2天+后期2天=6天出道。traineePhaseOf阈值改为dayCount<=2→前期，<=4→中期，>4→后期。出道触发_debutTriggerDay>=1+randInt(0,1)=1~2天。

### 3. 池子不扩充

每阶段30条，6天只用6条，远够。问题不在池子，在AI prompt自由发挥重复描写。去重规则见第9项。

### 4. mannerisms不过滤"打游戏"

"打游戏"是全圆佑真实特征，不过滤。但降低触发频率5~8回合→10~15回合，减少重复出现。

### 5. 粉丝数同步

出道后goEntSimNextDay中更新bubble.subscribers = max(100, popularity*15 + randInt(0,50))。

### 6. 快进5天改为速通出道

按钮文案从"快进5天"改为"速通出道"，点击弹确认框后直接跳到出道触发。

### 7. 出道仪式

全屏粉色渐变overlay + 团名/队友/出道曲展示 + 3秒动画淡出。

### 8. 男主选项注入规则

prompt加规则：练习生阶段男主出场时，3个选项中至少1个与男主相关的温和互动。

### 9. prompt场景感官去重

加规则：禁止重复最近3轮出现过的场景感官描写关键词（地板打蜡、空调出风口争夺、无声搞笑等），每轮练习室换不同环境细节。

## 修改文件（5个）

### 1. src/ent-sim/ui.js（4处）

**A. 泡泡按钮绑定（第2190行）**

```
旧：'<button id="es-bubble-send" class="bubble-send-btn"' + (canSend ? '' : ' disabled') + '>'
新：'<button id="es-bubble-send" class="bubble-send-btn"' + (canSend ? ' onclick="window.__phoneBubbleSend()"' : ' disabled') + '>'
```

**B. __phoneBubbleSend 修复（第1841-1853行）**

```
旧：var input = document.getElementById('es-phone-bubble-input');
     if (!input || !input.value.trim()) return;
     input.value = '';
     sendBubbleMessage().then(...)
新：sendBubbleMessage().then(...)  （直接调，不读输入框）
```

**C. 速通出道（第1010-1032行 fastForwardTrainee + 第419行按钮文案 + 第1071-1075行处理）**

```
第419行：'⚡快进5天' → '🎀速通出道'
第1071-1075行：去掉直接调用，改为弹出确认弹窗
第1010-1032行 fastForwardTrainee：确认后设_traineeDayCount=7 (进后期)
    + _debutTriggerDay=2 (立刻触发) + goEntSimNextDay()
```

**D. 出道仪式新增函数 showDebutCeremony()**

- 触发条件：GS._entSimStageUpPending.type === 'debut'
- 全屏粉色渐变overlay，依次显示：团名→所属社→概念→队友→出道曲→粉丝名
- 每项0.5秒渐入，全部显示后1.5秒整体淡出
- engine.js出道触发时设置GS._entSimStageUpPending={type:'debut',group,timestamp}

### 2. src/ent-sim/engine.js（2处）

**A. 出道触发阈值（第452行）**

```
旧：if (E.career._debutTriggerDay >= 2 + randInt(0, 2)) {
新：if (E.career._debutTriggerDay >= 1 + randInt(0, 1)) {
```

**B. 粉丝数同步（第469行后追加）**

```js
if (E.career.debutDay > 0 && E.bubble) {
  var pop = E.career.popularity || 0;
  E.bubble.subscribers = Math.max(100, Math.floor(pop * 15) + 100 + randInt(0, 50));
}
```

### 3. src/ent-sim/state.js（1处）

**traineePhaseOf 阈值（第262-265行）**

```js
旧：if (dayCount <= 4) return 1; if (dayCount <= 10) return 2; return 3;
新：if (dayCount <= 2) return 1; if (dayCount <= 4) return 2; return 3;
```

### 4. src/ent-sim/prompts.js（3处）

**A. mannerism频率（第65行）**

```
旧：（每 5-8 回合自然出现一次，用于男主角色辨识度，不要每次都写）
新：（每 10-15 回合自然出现一次，用于男主角色辨识度，不要每次都写）
```

**B. 男主选项注入（第211行后追加）**

```
【选项规则·练习生阶段】若本段剧情中男主有出场（哪怕是路过/背景），
你必须确保3个选项中至少有1个与男主相关。互动必须是温和、符合前后辈关系的：
如"和哥哥一起找他吃饭""在走廊偷看他一眼""让哥哥帮忙带句话"等。
禁止越界互动（独处/肢体接触/暧昧暗示）。
```

**C. 场景感官去重（第211行后追加）**

```
【场景描写·去重规则】禁止重复使用最近3轮剧情中出现过的场景感官描写关键词，
特别是：地板打蜡、空调出风口争夺、无声搞笑、橘子/柚子味饮料、冰上芭蕾/滑冰等。
每轮练习室场景必须换不同的环境细节（如：窗外的天气变化、音响设备、不同时段的光线、
镜子里的倒影、墙上的海报、某人带来的新物品等），避免连续多天用同一个场景描写模板。
```

### 5. src/ent-sim/brother.js（1处）

**mannerism触发间隔（第39、43行）**

```js
旧：var interval = E._mannerismInterval || randInt(5, 8);
     E._mannerismInterval = randInt(5, 8);
新：var interval = E._mannerismInterval || randInt(10, 15);
     E._mannerismInterval = randInt(10, 15);
```