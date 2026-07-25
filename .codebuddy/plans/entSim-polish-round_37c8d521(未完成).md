---
name: entSim-polish-round
overview: 群聊串台修复 + 16 项 UI/机制/内容优化 + 新增粉丝泡泡系统 = entSim 全面打磨
todos:
  - id: fix-group-chat
    content: 群聊串台修复：prompts.js新增群聊体系规则 + data.js 5处更名 + brother.js 1处更名
    status: pending
  - id: ui-polish
    content: UI美化5项：人气进度条+人气飘字+章跨特效+曝光脉冲+换天过渡
    status: pending
  - id: mech-optimize-1
    content: 机制优化A：约会地点差异化+曝光升级警告+公司惩罚+好感里程碑
    status: pending
  - id: mech-optimize-2
    content: 机制优化B：章节奖励+每日结算弹窗
    status: pending
    dependencies:
      - mech-optimize-1
  - id: content-enhance
    content: 内容增强：粉丝讨论含女主+狗仔偷拍事件+SEVENTEEN回归波及
    status: pending
  - id: data-panels
    content: 数据面板：人气走势图Canvas+结局画廊localStorage
    status: pending
  - id: fan-bubble
    content: 粉丝泡泡系统：状态字段+数据池+UI手机框+引擎发送+prompt规则
    status: pending
    dependencies:
      - data-panels
---

## 产品概述

在群聊串台修复基础上，对 entSim（娱乐圈模拟器）进行全面优化：5项UI美化、6项机制优化、2项内容增强、2项数据面板、1项SEVENTEEN回归波及，以及全新的"粉丝泡泡"系统。

## 核心功能

### 群聊串台修复（3处更名）

- System prompt 新增群聊体系规则，明确定义"女团姐妹群"和"SEVENTEEN工作群"两个独立群聊，成员不重叠、消息不互通
- data.js 中5处"群聊/群里"统一命名：女团事件→"女团姐妹群"，SVT事件→"SEVENTEEN工作群"
- brother.js 中男主主动事件"在群里"→"在 SEVENTEEN 工作群里"

### UI美化（5项）

- 人气进度条：header 人气数字旁加渐变色进度条（与曝光条同风格）
- 人气飘字：人气增减时浮动 +N/-N 动画（复用 affFloat 动画）
- 章节跨越特效：跨章时全屏 milestoneGlow 光效1.5秒
- 曝光危险脉冲：曝光≥50时 es-exp-bar 呼吸闪烁
- 换天过渡：0.5秒淡出→"新的一天 DayX"→淡入

### 机制优化（6项）

- 约会地点差异化：他家+3曝光/私人影院+2/深夜江边+1/天台+1/车里0/地下停车场0
- 章节奖励：跨章时 +1 掩护次数上限、解锁新约会地点
- 曝光升级警告：跨级时（暗涌→升温→哗然→引爆）弹 toast 警告
- 每日结算弹窗：换天时弹出人气/曝光/好感变化+今日关键事件摘要
- 公司惩罚：曝光≥80时经纪人警告扣人气-5
- 好感里程碑：好感突破20/40/60/80时弹心动卡片

### 内容增强（3项）

- 粉丝讨论含女主：dailyBuzz 随机注入1-2条关于女主和XX的讨论
- 狗仔偷拍事件：曝光≥30时概率触发"被拍到模糊背影"事件
- SEVENTEEN回归波及：SEVENTEEN回归期男主行程密度+50%、可约时间减少、同台场景增加

### 数据面板（2项）

- 人气走势图：事业面板加 Canvas 折线图（最近7天人气变化，从 careerHistory 取数据）
- 结局画廊：结局卡片 localStorage 持久化，可回顾已解锁结局

### 粉丝泡泡系统（全新·替代旧营业反馈）

- 类似 Bubble/Weverse DM：偶像向粉丝发消息/自拍/语音
- **替代旧"营业反馈"**：DAILY_ENGAGEMENT_POOL 和 generateDailyEngagement 废弃，统一用泡泡营业
- 每发一条泡泡 → AI 同时生成「你发了什么」+ 3~5 条粉丝回复（仅真粉丝视角，泡泡是付费订阅服务，没有路人和黑粉）
- 每天最多发 5 条，自由选择时机发送
- 泡泡状态：订阅数、消息列表、今日已发数、连续天
- 连续发送 streak 奖励：连续7天额外人气加成

## 技术栈

- 语言：JavaScript（ES Modules），使用 var 声明
- 现有架构：entSim 模块（engine.js / ui.js / prompts.js / data.js / state.js / memory.js / brother.js）
- AI 引擎：DeepSeek chat，通过 generateWithRetry() + triggerEntSimEvent() 生成叙事
- 动画：CSS @keyframes（milestoneGlow/es-pulse/affFloat 均已有）
- 数据持久化：localStorage（endings gallery）+ saveGame()（泡泡状态）

## 实施方案

### 一、群聊串台修复（3处改动）

**1.1 prompts.js system prompt**
在第39行（SVT队友段之后、恋爱阶段之前）新增：

```js
sys += '【群聊体系·强制】存在两个独立的群聊：\n';
sys += '(1) 「女团姐妹群」—— 你+5位姐姐，6人。发日常/八卦/练习安排/互相打气。\n';
sys += '(2) 「SEVENTEEN工作群」—— SEVENTEEN 13人+你被哥哥拉进去的。发行程/外卖/调侃/团内通知。\n';
sys += '两个群的成员不重叠（除你以外），消息绝不互通。\n';
sys += '女团队友不可能在 SEVENTEEN 群里发消息，SEVENTEEN 成员不可能在女团群里发消息。\n';
sys += '禁止笼统说「在群里」——必须明确写「在女团姐妹群里」或「在 SEVENTEEN 工作群里」。\n';
```

**1.2 data.js 5处更名**

- GIRLGROUP_EVENTS 中"在群聊里发了"→"在女团群里发了"、"在群聊里发"→"在女团姐妹群里发"、"群聊提醒"→"女团群提醒"
- SVT_TEAMMATE_EVENT_POOL 中"在群聊里说"→"在 SEVENTEEN 工作群里说"、"在群里分享"→"在 SEVENTEEN 工作群里分享"

**1.3 brother.js 1处更名**

- MALE_LEAD_INITIATIVE_POOL 中"在群里发了条"→"在 SEVENTEEN 工作群里发了条"

### 二、UI美化（5项，主要集中在 ui.js + style.css）

**2.1 人气进度条**

- renderHeader() 中人气数字后追加 `<div class="es-pop-bar"><span style="width:POP%;background:linear-gradient(90deg,#7c6ff0,#9ad0a0)"></span></div>`
- CSS：`.es-pop-bar` 样式复制 `.es-exp-bar`，高6px，圆角

**2.2 人气飘字**

- 在 applySideEffects() 人气变化处调用 `spawnPopFloat(delta)`，生成绝对定位浮动数字
- CSS 复用 `.aff-float` 动画，颜色根据正负（绿色+ / 红色-）

**2.3 章节跨越特效**

- checkChapterAdvance() 返回 true 时，UI 层触发 `showEntSimChapterTransition(pop, chapterName)`
- 创建全屏 overlay，CSS 使用已有 `milestoneGlow` 动画，1.5s 后自动移除

**2.4 曝光危险脉冲**

- renderLeftPanel() 中 es-exp-bar 根据 exposureAccum≥50 追加 CSS class `es-exp-danger`
- CSS：`@keyframes es-exp-pulse { 50% { opacity: 0.5; box-shadow: 0 0 10px var(--es-red); } }`

**2.5 换天过渡**

- goEntSimNextDay() 开始时创建过渡 overlay（"新的一天 · DayX"）
- CSS 使用 fadeIn + setTimeout 0.5s 后调用 rerender()，再 0.3s 后移除 overlay

### 三、机制优化（6项）

**3.1 约会地点差异化**

- DATE_VENUES 改为对象数组 `[{name, exposure}]`：他家3/私人影院2/深夜江边1/天台1/车里0/地下停车场0
- initiateEntSimDate() 使用 venue.exposure 而非固定 +1

**3.2 章节奖励**

- checkChapterAdvance() 成功后：GS.entSim.romance.coverMax += 1、解锁新 venue 推入 DATE_VENUES
- 可用 venues 数组改为 GS.entSim.romance.unlockedVenues，初始6个

**3.3 曝光升级警告**

- addExposure() 中跨 tier 阈值时 showToast('⚠️ 曝光等级上升：' + newTier.label)
- 阈值：5→暗涌、10→升温、15→哗然、25→引爆

**3.4 每日结算弹窗**

- goEntSimNextDay() 末尾生成结算文本（当日人气delta/曝光delta/好感delta/今日关键事件摘要）
- 弹出 showEntSimModal 展示结算信息，确认后自动进入下一天流程

**3.5 公司惩罚**

- goEntSimNextDay() 中检查 exposureAccum≥80
- 触发：showToast('⚠️ 经纪人警告：公司注意到你的私生活影响了工作')，人气 -5

**3.6 好感里程碑**

- applyEntSimAffection() 中检查跨阈值（20/40/60/80）
- 触发：GS._heartPending = {threshold}，UI renderNarrative() 中渲染心动卡片

### 四、内容增强（3项）

**4.1 粉丝讨论含女主**

- generateDailyBuzz() 中随机决定是否注入1-2条女主相关讨论（30%概率）
- 模板：粉丝发现女主和XX同款/CP粉发言/路人好奇等

**4.2 狗仔偷拍事件**

- checkOneHeartEvents() 新增优先级：exposureAccum≥30时有概率触发
- 事件：被拍到模糊背影/可疑同框/队友帮忙遮挡等

**4.3 SEVENTEEN回归波及**

- rollDailyAgenda() 或 goEntSimNextDay() 中检查 SVT 回归期标志
- 回归期：男主行程密度+50%、可约时段减少、同台打歌场景概率增加
- 回归期标志随机触发（每15-20天一次，持续5-7天）

### 五、数据面板（2项）

**5.1 人气走势图**

- showEntSimCareerPanel() 中 carrierHistory 最近7天人气切片 → Canvas 折线图
- Canvas 2D 绘制：背景网格 + 折线 + 数据点 + 渐变填充
- 尺寸 400×120，暗紫配色

**5.2 结局画廊**

- runEntSimEnding() 结束后将结局数据存入 localStorage('es_endings_gallery')
- 结局卡片末尾，"重新开始"按钮旁边新增「🏆 结局画廊」按钮，点击展示已解锁结局卡片（类型+标签+解锁日期）
- 最多存10条

### 六、粉丝泡泡系统（全新·替代旧营业反馈）

**6.1 状态字段**

- state.js 初始化：E.bubble = { subscribers: 100+randInt(0,900), messages: [], todayCount: 0, lastSentDay: 0, streak: 0 }
- subscribers 影响发泡泡时人气加成量

**6.2 废弃旧营业系统**

- DAILY_ENGAGEMENT_POOL 不再使用
- generateDailyEngagement/generateFanReaction 调用点删除或替换为泡泡入口
- 换天不再自动生成营业反馈

**6.3 泡泡UI**

- 快捷指令新增 `{q: 'bubble', label: '💬 粉丝泡泡(今日X/5)'}`
- 弹出手机框风格面板：顶部订阅数+streak、中间消息历史（你发的内容+粉丝回复列表）、底部"发送泡泡"按钮
- 每天最多5条，超过灰化
- 点击发送→AI生成「你发了什么」+「3~5条粉丝回复」→面板刷新

**6.4 泡泡引擎**

- engine.js 新增 sendBubbleMessage()：
- AI 一次性生成两段：msgToFans（你发了什么，30-60字）+ fanReplies（3~5条粉丝回复，每条15-30字，仅粉丝语气——兴奋/关心/表白/催更，无路人无黑粉）
- 人气 +randInt(1,3)（连续 streak 加成）
- todayCount++，满5条禁用
- 换天时 todayCount 归零、streak 检查：昨天发过→streak++、否则归零
- streak≥7时人气额外+3

**6.5 泡泡 prompt**

- system prompt 新增「粉丝泡泡」规则段：描述平台特点、粉丝期待风格、不同视角回复特征

### 文件影响范围

| 文件 | 改动内容 |
| --- | --- |
| ent-sim/prompts.js | 群聊规则段 + 泡泡规则段 + SVT回归波及提示 |
| ent-sim/data.js | 群名修正5处 + DATE_VENUES改造（废弃DAILY_ENGAGEMENT_POOL营业模板） |
| ent-sim/brother.js | 群名修正1处 + 狗仔偷拍事件优先级 |
| ent-sim/ui.js | 人气进度条+飘字渲染+脉冲class+泡泡按钮+结算弹窗+里程碑卡片+换天过渡 |
| ui-renderer.js | 人气走势图Canvas+结局画廊面板 |
| ent-sim/engine.js | 约会差异化+章节奖励+曝光警告+公司惩罚+结算弹窗+狗仔事件+SVT回归+泡泡引擎（sendBubbleMessage：AI生成你发的内容+3~5条粉丝回复） |
| ent-sim/state.js | 泡泡状态初始化+todayCount(0-5)+章节奖励字段+结局画廊持久化 |
| ent-sim/immersion.js | 女主相关粉丝讨论注入（dailyBuzz可含女主+XX） |
| style.css | 人气进度条样式+曝光脉冲动画+飘字复用+过渡动画+泡泡面板样式 |