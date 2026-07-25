---
name: bubble-ui-and-bugfixes
overview: 4项修复：①泡泡面板改造为真实 Bubble/Weverse DM 风格聊天界面（发送后不退出、粉丝随机名字、订阅数动态变化）；②修复 blocks 格式解析反复失败；③修复 prompt 中"回归期"让 AI 混淆新人团的问题；④泡泡发送后不关闭面板。
todos:
  - id: bubble-ui-redesign
    content: 泡泡UI重做：聊天室布局（你靠右粉丝靠左）+ 粉丝名随机显示 + 发送后不退出面板 + 订阅数动态变化 + 删除独立showBubbleResult弹窗
    status: pending
  - id: comeback-distinction
    content: SEVENTEEN回归期区分：prompts.js明确仅SEVENTEEN有回归期，女主新人团不要出现回归描述
    status: pending
  - id: blocks-options-fallback
    content: blocks格式options空导致重试浪费token修复：parser.js中blocks兜底自动提取options或生成通用fallback选项
    status: pending
---

## 产品概述

对娱乐圈模拟器（entSim）进行四项修复和增强：泡泡UI重做为真实Bubble/Weverse聊天室风格、发送后不退出面板、订阅数动态变化、SEVENTEEN回归期与女主新人团区分、blocks格式重试浪费token根因修复。

## 核心功能

### 泡泡UI重做（Bubble/Weverse DM风格）

- 聊天室布局：你发的消息靠右（粉色圆角气泡），粉丝回复靠左（灰色圆角气泡），像真实Bubble/Weverse界面
- 粉丝名字随机显示：每条粉丝回复50%概率带随机的韩语/中文粉丝名（如"민지""克拉小熊""圆佑的猫"），50%概率匿名
- 发送按钮点击后在泡泡Tab内显示loading状态，AI返回后直接刷新泡泡Tab内容（不关闭弹窗、不跳独立结果弹窗），用户点击关闭才退出
- 订阅数动态变化：每次发送泡泡后订阅数有小幅波动（+1~5或随机-0~3），取决于人气和连续天数
- 顶部显示订阅数、连续天数（streak）、今日已发数

### SEVENTEEN回归期区分

- prompts.js中新增明确规则：SEVENTEEN的回归期仅影响男主行程密度，女主的女团是新人/二线团，日常活动以练习/打歌/签售/宣传为主，不要描述女主团也在回归
- 剧情中出现的"回归"措辞应仅指向SEVENTEEN，与女主团无关

### blocks格式重试浪费token修复

- 根因：AI返回blocks格式时，parseEntSimResponse的blocks兜底正确提取了narrative但options为空数组，validateEntSimNarrative将空options判为error，触发3次重试，每次AI都返回blocks格式（不带options），3次注定失败
- 修复：在parseEntSimResponse的blocks兜底中，如果提取到有效narrative但options为空，自动尝试从rawText用正则提取options；如果仍为空，生成2-3条通用fallback选项（如"继续""换个话题""自由行动"），使validator不报error，避免浪费重试token

## 技术栈

- 语言：JavaScript（ES Modules），使用 var 声明
- 现有架构：entSim 模块（engine.js / ui.js / prompts.js / data.js / state.js / parser.js）+ validator.js + ai-generator.js
- AI 引擎：DeepSeek chat
- 数据持久化：localStorage (saveGame)

## 实施方案

### 一、泡泡UI重做 + 发送后不退出

**修改文件**：`src/ent-sim/ui.js` 中的 `showBusinessPanel()` 函数（约第1500-1600行）

**方案**：

1. 消息历史改为聊天室布局：

- 你发的消息：`<div class="es-bubble-msg me">粉色气泡靠右</div>`
- 粉丝回复：`<div class="es-bubble-msg fan">灰色气泡靠左 + 名字标签(50%概率)</div>`

2. 粉丝名字池：预定义12个随机中韩混搭粉丝名数组（"민지""克拉小熊""圆佑的猫""푸른밤""练习生时期的老粉""별빛""全圆佑全圆佑""나비""哈密瓜克拉""캐럿""밍밍""月光宝贝"），每条粉丝回复按`Math.random()<0.5`决定是否显示名字
3. 发送按钮click handler不再调用`closeEntSimModal()`，而是：

- 将泡泡Tab内容替换为loading动画（"⏳ 发送中..."）
- 调用`sendBubbleMessage()`异步等待
- 成功后调用`refreshBubbleTabContent(res)`原地刷新泡泡Tab内容（重新渲染聊天室历史+最新发送结果）
- 失败则显示错误提示，保留面板

4. 删除独立的`showBubbleResult()`独立弹窗调用，结果直接嵌入泡泡Tab

**CSS新增**：`src/style.css` 中加入 `.es-bubble-msg`、`.es-bubble-msg.me`、`.es-bubble-msg.fan`、`.es-bubble-name` 等样式——粉色圆形气泡靠右、灰色气泡靠左、粉丝名小字标签

### 二、订阅数动态变化

**修改文件**：`src/ent-sim/engine.js` 中的 `sendBubbleMessage()` 函数（第745-787行）

**方案**：

1. 在`sendBubbleMessage()`成功后，根据当前popularity和streak计算订阅数变化：

```js
var pop = E.career.popularity || 22;
var delta = 1 + Math.floor(Math.random() * 5); // 基础增长 1-5
if (pop >= 60) delta += Math.floor(Math.random() * 3); // 人气高额外增长
if (streak >= 7) delta += 2; // 连续7天加成
// 小概率掉粉（if Math.random() < 0.15: delta -= randInt(1,3))
E.bubble.subscribers = Math.max(10, (E.bubble.subscribers || 100) + delta);
```

2. 返回结果中携带新的`subscribers`值供UI刷新

### 三、SEVENTEEN回归期区分

**修改文件**：`src/ent-sim/prompts.js` 第46-49行

**方案**：
将第48行改为：

```
sys += '【SEVENTEEN 回归期】目前仅SEVENTEEN处于回归打歌期（剩余'+GS.entSim._svtComebackDays+'天），男主行程密度极高、非常忙碌、可约时间大幅减少；但同台打歌场景概率增加，可在待机室/后台/打歌舞台偶遇。注意：女主的女团（新人/二线团）此时没有回归，日常活动以练习/打歌/签售/跑行程为主，不要描述女主团也在回归。\n';
```

### 四、blocks格式重试浪费token修复

**修改文件**：`src/ent-sim/parser.js` 的 `parseEntSimResponse()` blocks兜底部分（第58-73行）

**方案**：
在blocks兜底提取完narrative后，如果`options.length === 0`且`narrative`非空，自动尝试从rawText正则提取options（复用regexEntSimFallback的options提取逻辑）；如果仍无options，生成3条通用fallback选项：

```js
if (!options.length && narrative) {
    // 先尝试从rawText正则提取options
    var om = rawText.match(/"options"\s*:\s*\[([\s\S]*?)\]\s*[,}\]]/);
    if (om) {
        var arr = om[1].match(/"((?:[^"\\]|\\.)*)"/g);
        if (arr) options = arr.map(function(s) {
            return s.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n');
        });
    }
    // 如果仍为空，生成通用fallback选项，避免validator报error浪费重试
    if (!options.length) {
        options = ['继续', '换个话题', '自由行动'];
    }
}
```

这样validator不会报"缺少options"error，一次调用即通过，不浪费2次额外重试token。

## 文件影响范围

| 文件 | 改动内容 |
| --- | --- |
| `src/ent-sim/ui.js` | 泡泡Tab聊天室布局重写 + 发送按钮handler重写（不关闭面板） + 删除独立showBubbleResult弹窗调用 |
| `src/ent-sim/engine.js` | sendBubbleMessage()中订阅数动态变化逻辑 + 返回新subscribers值 |
| `src/ent-sim/prompts.js` | 回归期prompt明确区分SEVENTEEN vs 女主团 |
| `src/ent-sim/parser.js` | blocks兜底中options的fallback提取+通用选项生成 |
| `src/style.css` | 泡泡聊天室CSS（气泡、名字标签、loading动画） |