---
name: entSim双修复-月份天数日历+聊天快捷回复匹配
overview: 修复四个bug + 一项架构优化：①真实日历替换每月30天；②聊天快捷回复上下文匹配；③探班确认框参数修复；④SEVENTEEN队友生日数据+prompt注入；⑤合并分散的日期/季节/天气信息为【今日环境】预计算块，移除25行负面季节禁止规则。
todos:
  - id: real-calendar-core
    content: 替换真实日历核心函数：state.js新增DAYS_IN_MONTH数组和_isLeapYear闰年判断，重写gameDayOf/gameMonthOf，修复_randBday生日随机范围
    status: pending
  - id: real-calendar-callers
    content: 同步日历调用方：_utils.js内联30天公式改为真实累计查找、确认todayHoliday和romance.js无需改动
    status: pending
    dependencies:
      - real-calendar-core
  - id: fix-visit-confirm
    content: 修复探班确认框：ui.js第1105行showActionInfoModal从3参数回调改为4参数Promise链调用
    status: pending
  - id: svt-birthday-data
    content: 补全SEVENTEEN队友生日数据：svt-teammate-profiles.js中13人各新增birthMonth/birthDay字段填入真实生日
    status: pending
  - id: build-today-context
    content: 实现今日环境统一注入：state.js新增buildTodayContext和svtBirthdayInfo导出函数，prompts.js替换216-225行分散注入并删除343-367行25条负面季节禁止规则
    status: pending
    dependencies:
      - svt-birthday-data
  - id: chat-contextual-presets
    content: 实现上下文相关快捷回复：chat-male-lead.js新增getMaleLeadPresetsForChat，ui.js新增getContextualPresets和rankPresetsByContext，修改renderPhoneChatMsgs接入
    status: pending
  - id: verify-integration
    content: 全链路验证：日历输出真实日期、聊天快捷回复关联消息、探班确认弹窗按钮文字正常、队友生日prompt正确注入、正面氛围描述替代负面禁止规则
    status: pending
    dependencies:
      - real-calendar-callers
      - fix-visit-confirm
      - build-today-context
      - chat-contextual-presets
---

## 用户核心原则

"尽量让AI少判断，只做剧情输出"——所有日期、季节、天气、生日、节日等环境信息必须由代码预计算后直接注入prompt，AI只负责根据已知事实写剧情。

## 修改范围

### Bug 1：二月出现30号

当前每月固定30天模型，`formatGameDate()`可输出"2月30日"等无效日期。改为真实每月天数数组+闰年判断，输出所有日期均为真实存在日期。

### Bug 2：聊天快捷回复与对方消息不对应

快捷回复按钮显示基于好感度阶段的固定通用短语（"嗯""好的""知道了"），与对方消息内容完全无关。男主频道presets来源（阶段池通用短语）与`findChatPoolReply`匹配源（CHAT_MALE_LEAD池的q字段）是两套不同数据，精确匹配几乎永远失败，兜底为"嗯。"。

### Bug 3：探班确认框参数传错

`ui.js:1105`调用`showActionInfoModal(title, htmlBody, callback)`传了3个参数，但函数签名是`(title, htmlBody, confirmText, cancelText)`。第三个参数本应是按钮文字，却传了函数对象，导致确认按钮显示函数源码字符串而非正常文字，且回调永不执行。

### Bug 4：SEVENTEEN队友生日无数据

`birthdayInfo()`只追踪4个核心角色生日。`svt-teammate-profiles.js`只有`birthYear`没有月日字段。AI自己编造队友生日日期对不上游戏日历。需补全13人生日月日数据并在prompt中注入今日寿星+完整生日参考表。

### 架构优化：合并分散的日期注入为【今日环境】预计算块

当前prompts.js中日期/季节/生日/节日/天气/季节禁止规则分散在4处（第216行日期+季节、第222行生日、第225行节日、第343-367行25条负面禁止规则），AI需要多处接收碎片信息后自行拼凑。改为在state.js新增`buildTodayContext()`函数，一次性预计算所有环境信息，输出紧凑的"今日环境"块。用正面氛围描述替代25条负面季节禁止规则。

## 技术栈

- JavaScript ES Modules (现有代码风格：`var`声明、`+`字符串拼接)
- 仅修改 entSim（娱乐圈模拟器）模式文件
- 不新增依赖

## 实现方案

### 1. 真实日历核心（state.js）

**策略**：保持`dayCount`作为标准时间计数器不变，仅重写日期解读函数。

在state.js新增：

- `var DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31]`
- `function _isLeapYear(year) { return year % 4 === 0; }`

重写`gameDayOf(dayCount)`和`gameMonthOf(dayCount)`：

- 用累计天数逐月查找替代 `Math.floor(...)/30` 公式
- `gameMonthOf`：从1月起逐月累计天数比较，2月按闰年判断取28或29
- `gameDayOf`：用(dayCount-年份累计-前面月份累计)得到当月的第几天
- `gameSeasonOf()`：沿用`gameMonthOf()`结果，无需修改
- `formatGameDate()`和`formatTraineeDate()`：自动受益

修复`_randBday()`（第148-155行）：改为`Math.floor(Math.random() * DAYS_IN_MONTH[m-1]) + 1`，按实际月份天数随机。

### 2. 同步日历调用方

**pools/_utils.js 第110-138行** — 替换内联30天公式：

- 第115行季节过滤：`Math.floor(((dayCount-1)%365)/30)`改为真实累计查找
- 第123行月份过滤：同上
- 第132-134行生日过滤：`bm`和`bd`计算改为真实累计查找
- 因_utils.js可能循环依赖state.js，使用内联函数复制日历逻辑

**state.js todayHoliday 第364-376行** — 确认兼容性：万圣节条件`d>=28 && d<=31`在真实10月（31天）下自然适用，无需改动。

**romance.js 第345-358行** — 纪念日检查`(today - m[key]) % 30 === 0`保持不变（跟踪"过了多少天"而非日历日期）。

**engine.js goEntSimNextDay** — `GS.gameMonth`和`GS.season`由`gameMonthOf`/`gameSeasonOf`自动更新，无需修改。

### 3. 探班确认框修复（ui.js）

第1105行当前3参数回调调用：

```javascript
showActionInfoModal('探班 · ' + sel.name, content, function() { ... });
```

改为4参数Promise链：

```javascript
showActionInfoModal('探班 · ' + sel.name, content, '确定', '取消').then(function(ok) {
    if (!ok) return;
    closeEntSimModal();
    showNarrativeLoading();
    triggerEntSimEvent(...).then(rerender);
});
```

### 4. SVT队友生日数据+prompt注入

**svt-teammate-profiles.js** — 13人各新增`birthMonth`和`birthDay`字段（数据类型Number），填入真实生日：
scoups(8,8)、jeonghan(10,4)、joshua(12,30)、jun(6,10)、hoshi(6,15)、wonwoo(7,17)、woozi(11,22)、dk(2,18)、mingyu(4,6)、the8(11,7)、seungkwan(1,16)、vernon(2,18)、dino(2,11)。

**state.js** — 新增导出函数`svtBirthdayInfo(dayCount, profiles)`：

- 用`gameMonthOf`/`gameDayOf`计算今天月日
- 遍历profiles找出`birthMonth===m && birthDay===d`的成员
- 返回`{ todayBirthdays: [{name, stageName, birthMonth, birthDay}], allProfiles }`

在`buildTodayContext()`（见下）中集成此函数。

### 5. 架构优化：buildTodayContext() 统一环境注入

**state.js** — 新增导出函数`buildTodayContext(dayCount, E, weather)`：

- 预计算所有日期/季节/天气/生日/节日信息
- 输出紧凑块：

```
【今日环境】
日期：2024年3月1日 · 早春 · 小雨 · 上午
氛围：春寒料峭，早晚微凉，樱花含苞。小雨淅沥，需要薄外套和伞。
生日：今天无人过生日
节日：无（最近节日：白色情人节3月14日）
SEVENTEEN队友生日：scoups 8月8日 | jeonghan 10月4日 | ...（13人完整表）
```

- 氛围描述根据季节+天气正面生成（冬天："寒冷干燥/暖气开放/可能下雪"，春天："樱花盛开/早晚微凉/花粉季"，夏天："炎热潮湿/梅雨季/蝉鸣"，秋天："凉爽/落叶/秋夕临近"），替代原有25条负面禁止规则
- 若有SVT队友过生日："今天过生日的SEVENTEEN成员：崔翰率(2月18日)、李硕珉(2月18日)。若剧情涉及他们，必须围绕生日场景展开。"

**prompts.js** — 三处改动：

1. 第7行import新增`buildTodayContext`和`SVT_TEAMMATE_PROFILES`
2. 第216-225行（日期行+生日+节日）替换为一行`msg += buildTodayContext(E.cycle.dayCount||1, E, GS.weather||'');`
3. **删除第343-367行**（25条负面季节禁止规则：`isWinter`/`isMarch`/`spring`/`summer`/`november`的禁止清单），因为正面氛围描述已告知AI应该写什么
4. 保留第338-342行天气雾禁制（运行时根据`weather`动态判断是否需要禁止雾描写）

**prompts.js 第15行pools import** — 确认`SVT_TEAMMATE_PROFILES`已在pools/index.js导出（已验证第18行），添加至prompts.js的import列表。

### 6. 上下文相关聊天快捷回复

**pools/chat-male-lead.js** — 新增导出函数`getMaleLeadPresetsForChat(affection, lastMsg)`：

- 遍历`CHAT_MALE_LEAD`所有子池（trainee/greet/stage/worry/romantic/jealous/night/secret等）
- 收集`aff <= affection`条目的`q`值
- 对lastMsg做中文分词（按标点和空格切分），统计每个q与消息的重叠词数
- 按重叠词数降序取top 3，返回`[{q:'...', t:'...'}]`格式

**ui.js 新增两个函数**：

- `getContextualPresets(ch, lastMsg)`：男主频道→`getMaleLeadPresetsForChat()`，其他→`rankPresetsByContext()`
- `rankPresetsByContext(raw, lastMsg)`：对阶段池presets按关键词重叠度评分后取top 3，无重叠则随机

**ui.js 第1885-1893行** — `renderPhoneChatMsgs`中替换presets生成：

```javascript
// 旧代码（删除）
var stagePresets = getChatPresetsByChannel(ch);
var shuffled = stagePresets.slice().sort(function() { return Math.random() - 0.5; });
presets = shuffled.slice(0, 3).map(function(t) { return { q: t, t: t }; });
// 新代码
presets = getContextualPresets(ch, lastMsg ? lastMsg.content : '');
```

**兼容性**：`updateQuickReplies`通过`p.q`存储replyKey，`__quickReply`中`findChatPoolReply(q)`现在能匹配到来自CHAT_MALE_LEAD同源的q字符串。

### 不修改的部分

- `chat-modal.js`（1v1模式AI实时生成）
- 阶段池数据文件（156个阶段池presets结构不变）
- `CHAT_MALE_LEAD`数据条目结构（q/r/aff不变，仅新增提取函数）
- `dayCount`初始化、保存、加载逻辑
- `calendar-events.js`中4角色生日事件（队友生日通过prompt注入而非事件池触发）
- `romance.js`纪念日逻辑（`% 30`跟踪天数差，无需改为真实日历）