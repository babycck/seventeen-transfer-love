---
name: bubble-ui-and-bugfixes
overview: 5项修复+1增强：①泡泡面板改造为真实 Bubble/Weverse DM 风格聊天室（粉丝名100%显示、发送后不退出、订阅数动态）；②blocks格式重试浪费token修复；③回归期区分新人团；④眼镜泛化修复；⑤好感度来源日志+情敌互动过滤；⑥泡泡预览HTML
todos:
  - id: bubble-ui-redesign
    content: 泡泡UI重做：聊天室布局（你靠右粉色气泡+粉丝靠左灰色气泡）+ 粉丝名100%显示每条 + 发送后不退出面板 + 订阅数动态变化 + 删除独立showBubbleResult
    status: completed
  - id: comeback-distinction
    content: 回归期区分：prompts.js第48行明确仅SEVENTEEN有回归期，女主新人团不出现回归描述
    status: completed
  - id: glasses-overreach
    content: 眼镜泛化修复：prompts.js第31行附加「此小动作仅限男主本人，其他成员不共享此特征」
    status: completed
  - id: blocks-options-fallback
    content: blocks格式options空修复：parser.js两处兜底加通用fallback选项（继续/换个话题/自由行动）
    status: completed
  - id: affection-source-log
    content: 好感度来源日志+情敌过滤：romance.js加_affectionLog记录 + ui.js恋情面板展示最近3条来源 + engine.js applySideEffects情敌场景过滤affectionDelta + state.js迁移初始化
    status: completed
  - id: update-preview-html
    content: 更新public/bubble-preview.html为100%显示粉丝名
    status: completed
    dependencies:
      - bubble-ui-redesign
---

## 产品概述

对娱乐圈模拟器（entSim）进行6项修复和增强，包括泡泡聊天室UI重做、回归期区分、blocks解析token浪费修复、眼镜泛化修复、好感度来源日志+情敌过滤，以及泡泡预览HTML更新。

## 核心功能

### 泡泡UI重做为真实Bubble/Weverse DM风格聊天室

- 聊天室布局：你发的消息靠右粉色渐变气泡，粉丝回复靠左灰色半透明气泡
- 粉丝名字**每条都显示**（从12个中韩混搭名池随机取：민지、克拉小熊、圆佑的猫、푸른밤、练习生时期的老粉、별빛、全圆佑全圆佑、나비、哈密瓜克拉、캐럿、밍밍、月光宝贝）
- 发送后不退出面板：点击发送 → 泡泡Tab内显示loading → 结果直接追加到聊天室底部并自动滚动 → 仅用户点击关闭才退出
- 订阅数动态变化：每次发送后根据 popularity+streak 计算delta（+1~5基础+人气加成+streak加成-小概率掉粉），原地刷新订阅条
- 删除独立 showBubbleResult() 弹窗调用，结果直接嵌入泡泡聊天室

### 回归期区分

- prompts.js 中明确仅SEVENTEEN处于回归期，女主团是新人/二线团，日常以练习/打歌/签售为主，不出现回归描述

### 眼镜泛化修复

- Wonwoo的「推眼镜」mannerism被注入prompt后AI泛化到所有SEVENTEEN成员
- 修复：prompts.js男主小动作行追加「此小动作仅限男主本人，其他成员不共享此特征」

### blocks格式重试浪费token修复

- 根因：AI返回blocks格式（不带options）→ validator报「缺少options」error → 3次重试全部失败
- 修复：parseEntSimResponse blocks兜底和extractBlocksNarrative正则兜底中options为空时自动生成通用fallback（「继续」「换个话题」「自由行动」）

### 好感度来源日志+情敌过滤

- entSim没有affectionLog，用户无法知道好感从哪来；情敌NPC互动时AI返回的affectionDelta被无条件加到男主好感
- 修复：①applyEntSimAffection中记录{day,delta,reason,total}到E._affectionLog；②恋情面板renderLovePanel展示最近3条来源；③applySideEffects中判断若当前场景为情敌NPC专属互动则跳过affectionDelta

## 技术栈

- 语言：JavaScript（ES Modules），使用var声明
- 现有架构：entSim模块（engine.js / ui.js / prompts.js / data.js / state.js / parser.js / romance.js）+ validator.js + ai-generator.js
- AI引擎：DeepSeek chat
- 动画：CSS @keyframes（bubbleIn气泡弹出动画）

## 实施方案

### 一、泡泡UI重做 + 粉丝名全显示 + 发送后不退出 + 订阅数动态

**修改文件**：`src/ent-sim/ui.js` showBusinessPanel()（约第1503-1590行）、`src/ent-sim/engine.js` sendBubbleMessage()（第745行）、`src/style.css`

**1.1 聊天室布局重写**
将泡泡Tab内容从简单列表改为聊天室：

- 你发的消息：`.bubble-msg.me` 靠右，粉色渐变背景，右下小尖角
- 粉丝回复：`.bubble-msg.fan` 靠左，半透明灰底，左下小尖角，**每条都带名字标签**
- 每行配小圆头像：你的头像固定粉色「我」，粉丝头像随机色+随机emoji
- 消息之间用时间标签分隔

**1.2 粉丝名100%显示**
预定义12个粉丝名池，每条粉丝回复都随机分配一个名字，不再50%概率。

**1.3 发送后不退出面板**
修改send按钮handler：

- 不调用closeEntSimModal()
- 将泡泡Tab内容替换为聊天室HTML + loading指示器
- 调用sendBubbleMessage() → 成功则追加新消息+粉丝回复到聊天室 → 更新订阅数
- 失败则聊天室内显示错误提示

**1.4 订阅数动态变化**（engine.js sendBubbleMessage 第775行附近）

```js
var pop = E.career.popularity || 22;
var delta = 1 + Math.floor(Math.random() * 5);
if (pop >= 60) delta += Math.floor(Math.random() * 3);
if (streak >= 7) delta += 2;
if (Math.random() < 0.12) delta -= randInt(1, 3);
E.bubble.subscribers = Math.max(10, (E.bubble.subscribers || 100) + delta);
```

返回结果中携带新的subscribers值。

**1.5 删除独立showBubbleResult调用**
结果直接在泡泡Tab内渲染，不再弹独立弹窗。

**1.6 CSS新样式**（style.css）
新增`.bubble-msg.me`、`.bubble-msg.fan`、`.bubble-avatar`、`.bubble-row`、`.bubble-time`、`.fan-name`、`.bubble-bubble`、`.bubble-sending`等样式及bubbleIn弹出动画。

### 二、回归期区分

**修改文件**：`src/ent-sim/prompts.js` 第48行

将：

```js
sys += '【SEVENTEEN 回归期】目前 SEVENTEEN 处于回归打歌期...';
```

改为：

```js
sys += '【SEVENTEEN 回归期】目前仅 SEVENTEEN 处于回归打歌期（剩余'+GS.entSim._svtComebackDays+'天），男主行程密度极高、非常忙碌、可约时间大幅减少；但同台打歌场景概率大幅增加，可在待机室/后台/打歌舞台等场景偶遇。注意：女主的女团（新人/二线团）目前没有回归活动，日常以练习/打歌/签售/跑行程为主，不要描述女主团也在回归。\n';
```

### 三、blocks格式options空修复

**修改文件**：`src/ent-sim/parser.js` 两处

**3.1 parseEntSimResponse blocks兜底（第65-72行）**
在`if (narrative || options.length)`之前插入options fallback逻辑：

```js
if (!options.length && narrative) {
  var om = rawText.match(/"options"\s*:\s*\[([\s\S]*?)\]\s*[,}\]]/);
  if (om) {
    var arr = om[1].match(/"((?:[^"\\]|\\.)*)"/g);
    if (arr) options = arr.map(function(s) { return s.replace(/^"|"$/g,'').replace(/\\"/g,'"').replace(/\\n/g,'\n'); });
  }
  if (!options.length) options = ['继续', '换个话题', '自由行动'];
}
```

**3.2 extractBlocksNarrative正则兜底（第78行）**
将`return { narrative: bn, options: [], extras: {} };`改为`return { narrative: bn, options: ['继续', '换个话题', '自由行动'], extras: {} };`

### 四、眼镜泛化修复

**修改文件**：`src/ent-sim/prompts.js` 第31行

将：

```js
sys += '【男主小动作】' + E.romance.mannerisms.join('、') + '（每 5-8 回合自然出现一次，用于角色辨识度，不要每次都写）。\n';
```

改为：

```js
sys += '【男主小动作】' + E.romance.mannerisms.join('、') + '（每 5-8 回合自然出现一次，用于男主角色辨识度，不要每次都写）。此小动作仅限男主本人，其他SEVENTEEN成员各有自己的习惯和性格特征，绝对不要把男主的特征写到其他成员身上。\n';
```

### 五、好感度来源日志+情敌过滤

**修改文件**：`src/ent-sim/romance.js` applyEntSimAffection()（第45-78行）、`src/ent-sim/ui.js` renderLovePanel()（第389-406行）、`src/ent-sim/engine.js` applySideEffects()（第146-148行）、`src/ent-sim/state.js` migrateSave()（第428行）

**5.1 添加好感度日志（romance.js）**
在applyEntSimAffection中，affection变更后追加日志：

```js
E._affectionLog = E._affectionLog || [];
E._affectionLog.push({
  day: E.cycle.dayCount || 1,
  round: E.cycle.roundTotal || 0,
  delta: delta,
  reason: extras && extras._affReason ? extras._affReason : '剧情推进',
  total: E.affection
});
if (E._affectionLog.length > 30) E._affectionLog = E._affectionLog.slice(-30);
```

**5.2 恋情面板展示最近3条来源（ui.js renderLovePanel）**
在好感数字下方追加：

```html
<div class="es-aff-log">
  （取E._affectionLog最后3条倒序，每条显示：+N reason → total）
</div>
```

**5.3 情敌场景过滤（engine.js applySideEffects）**
在`if (typeof extras.affectionDelta === 'number')`之前增加判断：

```js
// 情敌NPC专属互动场景不应用affectionDelta到男主好感
var isRivalOnly = extras._npcType === 'suitor' && !extras._hasMaleLead;
if (typeof extras.affectionDelta === 'number' && !isRivalOnly) {
  extras._affReason = extras._affReason || '剧情推进';
  applyEntSimAffection(extras.affectionDelta);
}
```

**5.4 状态迁移（state.js migrateSave）**

```js
if (!Array.isArray(E._affectionLog)) E._affectionLog = [];
```

## 文件影响范围

| 文件 | 改动 |
| --- | --- |
| `src/ent-sim/ui.js` | 泡泡Tab聊天室布局重写 + 发送handler重写 + 恋情面板加好感度来源 + 删除showBubbleResult调用 |
| `src/ent-sim/engine.js` | sendBubbleMessage订阅数动态变化 + applySideEffects情敌过滤 |
| `src/ent-sim/prompts.js` | 回归期明确区分 + 男主小动作限制扩散 |
| `src/ent-sim/parser.js` | blocks兜底 + extractBlocksNarrative加options fallback |
| `src/ent-sim/romance.js` | applyEntSimAffection加affectionLog记录 |
| `src/ent-sim/state.js` | _affectionLog迁移初始化 |
| `src/style.css` | 泡泡聊天室全套CSS + 好感度日志样式 |
| `public/bubble-preview.html` | 更新为100%显示粉丝名 |