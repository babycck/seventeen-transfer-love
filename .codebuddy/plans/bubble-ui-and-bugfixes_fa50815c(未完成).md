---
name: bubble-ui-and-bugfixes
overview: 5项修复：①泡泡面板改造为真实 Bubble/Weverse DM 风格聊天界面（发送后不退出、粉丝随机名字、订阅数动态变化）；②修复 blocks 格式解析反复失败浪费 token；③修复 prompt 中"回归期"让 AI 混淆新人团；④修复 Wonwoo 男主小动作"推眼镜"导致所有成员都被写成戴眼镜；⑤泡泡预览 HTML 效果演示。
todos:
  - id: bubble-ui-redesign
    content: 泡泡UI重做：聊天室布局（你靠右粉丝靠左）+ 粉丝名随机 + 发送后不退出面板 + 订阅数动态 + 删除独立showBubbleResult
    status: pending
  - id: bubble-preview-html
    content: 生成泡泡聊天室预览HTML到 public/bubble-preview.html
    status: pending
    dependencies:
      - bubble-ui-redesign
  - id: comeback-distinction
    content: SEVENTEEN回归期区分：prompts.js明确仅SEVENTEEN有回归期，女主新人团不出现回归描述
    status: pending
  - id: glasses-overreach
    content: 眼镜泛化修复：prompts.js男主小动作行附加「仅限男主本人，其他成员不共享此特征」
    status: pending
  - id: blocks-options-fallback
    content: blocks格式options空导致重试浪费token：parser.js两处兜底加通用fallback选项
    status: pending
---

## 产品概述

对娱乐圈模拟器（entSim）进行5项修复和增强，包括泡泡聊天室UI重做、回归期区分、眼镜泛化修复、blocks格式token浪费修复，以及独立的泡泡预览HTML。

## 核心功能

### 泡泡UI重做为真实Bubble/Weverse DM风格聊天室

- 聊天室布局：你发的消息靠右粉色渐变气泡 + 小头像「我」，粉丝回复靠左灰色半透明气泡 + 随机彩色小头像
- 粉丝名字随机显示：预定义12个中韩混搭粉丝名池，每条粉丝回复50%概率带名字标签（如「민지」「克拉小熊」），50%概率匿名（仅显示头像emoji）
- 发送后不退出面板：点击发送 → 泡泡Tab内显示 loading → 结果直接追加到聊天室底部并自动滚动 → 仅用户点击关闭才退出
- 订阅数动态变化：每次发送后根据 popularity+streak 计算 delta（+1~5基础 + 人气加成 + streak加成 - 小概率掉粉），结果原地刷新订阅条
- 删除独立的 showBubbleResult() 弹窗，结果直接嵌入泡泡聊天室

### 回归期区分

- prompts.js 中明确「仅 SEVENTEEN 处于回归期」，女主团是新人/二线团，日常以练习/打歌/签售为主，不应出现女主团回归的描述

### 眼镜泛化修复

- Wonwoo 的 data.js 设定含「推眼镜」习惯 → buildMannerisms 抽取 → prompts.js 注入「男主小动作：推眼镜」→ brother.js 每5-8回合触发 → AI 将眼镜特征泛化到所有 SEVENTEEN 成员
- 修复：prompts.js 男主小动作行追加「此小动作仅限男主本人，其他 SEVENTEEN 成员各有自己的习惯，不要写成和男主一样的特征」

### blocks格式重试浪费token修复

- 根因：AI返回 blocks 格式（不带 options）→ parseEntSimResponse blocks兜底提取 narrative 但 options 为空 → validator 报「缺少 options」error → 3次重试全部失败
- 修复：blocks兜底中 options 为空时自动生成通用 fallback 选项（「继续」「换个话题」「自由行动」），使 validator 一次通过
- 同时修 extractBlocksNarrative 正则兜底（第78行）也返回 options:[] 的同样问题

### 泡泡预览HTML

- 生成独立的 public/bubble-preview.html 静态页面，展示新UI效果供用户预览确认
- 不应用到聊天（1v1私聊独立组件）和朋友圈（社交动态独立组件）

## 技术栈

- 语言：JavaScript（ES Modules），使用 var 声明
- 现有架构：entSim 模块（engine.js / ui.js / prompts.js / data.js / state.js / parser.js）+ validator.js + ai-generator.js
- AI 引擎：DeepSeek chat
- 动画：CSS @keyframes（bubbleIn 气泡弹出动画）

## 实施方案

### 一、泡泡UI重做（ui.js showBusinessPanel 约第1500-1599行）

**1.1 聊天室布局重写**
将泡泡Tab内容从简单列表改为聊天室：

- 你发的消息：`.bubble-msg.me` 靠右，粉色渐变背景 `linear-gradient(135deg,#e878a8,#c84c8c)`，右下小尖角
- 粉丝回复：`.bubble-msg.fan` 靠左，半透明灰底 `rgba(255,255,255,.07)`，左下小尖角
- 每行配小圆头像：你的头像固定粉色渐变「我」，粉丝头像随机色+随机emoji/韩文首字母
- 消息之间用时间标签分隔（`.bubble-time`）

**1.2 粉丝名字随机池**
预定义12个粉丝名：`['민지','克拉小熊','圆佑的猫','푸른밤','练习生时期的老粉','별빛','全圆佑全圆佑','나비','哈密瓜克拉','캐럿','밍밍','月光宝贝']`
每条粉丝回复：`Math.random() < 0.5` 决定是否显示 `.fan-name` 标签

**1.3 发送后不退出面板**
修改 send 按钮 handler（原第1584-1598行）：

- 不调用 `closeEntSimModal()`
- 将 `#es-biz-tab-bubble` 内容替换为：聊天室HTML + 底部loading指示器
- 调用 `sendBubbleMessage()` → 成功则更新聊天室（追加新消息+新粉丝回复）→ 更新订阅条数字
- 失败则聊天室内显示错误提示

**1.4 订阅数动态变化（engine.js sendBubbleMessage 第775行）**

```js
var pop = E.career.popularity || 22;
var delta = 1 + Math.floor(Math.random() * 5);
if (pop >= 60) delta += Math.floor(Math.random() * 3);
if (streak >= 7) delta += 2;
if (Math.random() < 0.12) delta -= randInt(1, 3);
E.bubble.subscribers = Math.max(10, (E.bubble.subscribers || 100) + delta);
```

返回结果中携带新的 `subscribers` 值。

**1.5 删除独立 showBubbleResult**
结果直接在泡泡Tab内渲染，不再弹独立弹窗。`showBubbleResult()` 函数标记废弃（保留代码备查但不再调用）。

**1.6 CSS新样式（style.css）**
新增 `.bubble-msg.me` / `.bubble-msg.fan` / `.bubble-avatar` / `.bubble-row` / `.bubble-time` / `.fan-name` / `.es-bubble-loading` 等样式，以及 `bubbleIn` 弹出动画。

### 二、回归期区分（prompts.js 第48行）

修改为：

```
sys += '【SEVENTEEN 回归期】目前仅 SEVENTEEN 处于回归打歌期（剩余'+GS.entSim._svtComebackDays+'天），男主行程密度极高、非常忙碌、可约时间大幅减少；但同台打歌场景概率大幅增加，可在待机室/后台/打歌舞台等场景偶遇。注意：女主的女团（新人/二线团）目前没有回归活动，日常以练习/打歌/签售/跑行程为主，不要描述女主团也在回归。\n';
```

### 三、眼镜泛化修复（prompts.js 第31行）

修改为：

```
sys += '【男主小动作】' + E.romance.mannerisms.join('、') + '（每 5-8 回合自然出现一次，用于男主角色辨识度，不要每次都写）。此小动作仅限男主本人，其他 SEVENTEEN 成员各有自己的习惯和性格特征，绝对不要把男主的特征写到其他成员身上。\n';
```

### 四、blocks格式options空修复（parser.js 两处）

**4.1 parseEntSimResponse blocks兜底（第58-73行）**
在 `if (narrative || options.length)` 之前插入：

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

**4.2 extractBlocksNarrative 正则兜底（第77-78行）**
同样的 options fallback 逻辑：

```js
if (bn) return { narrative: bn, options: ['继续', '换个话题', '自由行动'], extras: {} };
```

## 文件影响范围

| 文件 | 改动 |
| --- | --- |
| `src/ent-sim/ui.js` | 泡泡Tab聊天室布局重写 + 发送handler重写（不关面板）+ 删除showBubbleResult调用 |
| `src/ent-sim/engine.js` | sendBubbleMessage中订阅数动态变化 + 返回新subscribers值 |
| `src/ent-sim/prompts.js` | 回归期明确区分 + 男主小动作限制扩散 |
| `src/ent-sim/parser.js` | blocks兜底 + extractBlocksNarrative 加options fallback |
| `src/style.css` | 泡泡聊天室全套CSS（气泡/头像/名字/loading/动画） |
| `public/bubble-preview.html` | [NEW] 独立静态预览页，展示泡泡聊天室新UI效果 |