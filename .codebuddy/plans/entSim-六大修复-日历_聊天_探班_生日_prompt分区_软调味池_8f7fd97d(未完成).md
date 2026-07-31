---
name: entSim-六大修复-日历+聊天+探班+生日+prompt分区+软调味池
overview: 六项修复+重构：①真实日历替换；②探班确认框参数修正；③A块硬事实+SVT生日+Prompt重构为A/B/C三区结构并删除负面禁止规则；④B块软调味池（氛围/心情/日常插曲3个新池）；⑤聊天快捷回复上下文匹配；⑥全链路验证。
todos:
  - id: real-calendar-core
    content: 替换真实日历核心函数：state.js新增DAYS_IN_MONTH数组和_isLeapYear，重写gameDayOf/gameMonthOf，修复_randBday
    status: pending
  - id: real-calendar-callers
    content: 同步日历调用方：_utils.js内联30天公式替换为真实累计查找，确认todayHoliday和romance.js兼容
    status: pending
    dependencies:
      - real-calendar-core
  - id: fix-visit-confirm
    content: 修复探班确认框：ui.js第1105行showActionInfoModal从3参数回调改为4参数Promise链
    status: pending
  - id: svt-birthday-data
    content: 补全SEVENTEEN队友生日数据：svt-teammate-profiles.js 13人各加birthMonth/birthDay，新建pools/season-atmo.js和pools/daily-detail.js两个B区池子，pools/index.js注册导出
    status: pending
  - id: build-hard-facts-block
    content: 实现A区硬事实统一注入：state.js新增buildHardFactsBlock和svtBirthdayInfo和buildSoftFlavorBlock三个导出函数
    status: pending
    dependencies:
      - real-calendar-core
      - svt-birthday-data
  - id: prompts-restructure
    content: 重构prompts.js为A/B/C分区：替换216-225行分散注入为buildHardFactsBlock+buildSoftFlavorBlock，删除343-367行负面季节禁止规则，精简buildEntSimContextSnapshot
    status: pending
    dependencies:
      - build-hard-facts-block
  - id: chat-contextual-presets
    content: 实现上下文相关快捷回复：chat-male-lead.js新增getMaleLeadPresetsForChat，ui.js新增getContextualPresets和rankPresetsByContext，renderPhoneChatMsgs接入
    status: pending
  - id: verify-integration
    content: 全链路验证：日历输出真实日期、聊天快捷回复关联消息、探班确认弹窗按钮正常、队友生日prompt正确注入、A/B/C分区prompt结构完整
    status: pending
    dependencies:
      - real-calendar-callers
      - fix-visit-confirm
      - prompts-restructure
      - chat-contextual-presets
---

## 用户核心原则

"尽量让AI少判断，只做剧情输出"——所有日期/季节/天气/生日/节日/行程/感情状态/角色出场等环境信息由代码预计算后直接注入prompt，AI只负责根据已知事实写剧情正文。

## 修改清单（7项）

### 1. 真实日历（Bug1）

每月固定30天模型输出"2月30日"等无效日期。改为DAYS_IN_MONTH数组+_isLeapYear闰年判断，所有日期为真实存在日期。

### 2. 聊天快捷回复（Bug2）

快捷回复按钮显示通用短语（"嗯""好的"）与对方消息无关。男主频道presets来源（阶段池通用短语）与findChatPoolReply匹配源（CHAT_MALE_LEAD池q字段）是两套数据，匹配永败兜底"嗯。"。改为统一用CHAT_MALE_LEAD池。

### 3. 探班确认框（Bug3）

ui.js 1105行showActionInfoModal传3参数(title,html,callback)，但签名是(title,html,confirmText,cancelText)。确认按钮显示函数源码字符串，回调永不执行。改为4参数Promise链。

### 4. SVT队友生日（Bug4）

birthdayInfo()只追踪4个核心角色生日。svt-teammate-profiles.js 13人只有birthYear无月日。AI编造队友生日对不上游戏日期。补全13人生日月日+注入prompt。

### 5. 新建2个B区池子

SEASON_ATMO_POOL（~30条，按季节+天气索引的短氛围片段）、DAILY_DETAIL_POOL（~25条，按场景类型索引的日常小事片段）。MOOD复用已有ATMOSPHERE_MOOD(55条)。

### 6. A/B/C分区重构prompt（核心架构优化）

- **A区硬事实（代码100%预计算）**：A1日期+季节+天气+时段、A2生日+节日+SVT生日表、A3今日行程+职业阶段、A4好感度+阶段+叙事模式+哥哥+情敌+冷战+吃醋、A5今日可见角色（必定出场/可能偶遇/SVT轮换）、A6阶段行为限制（允许/禁止）
- **B区软调味（池子随机1-2条，AI自然融入）**：B1季节氛围(SEASON_ATMO_POOL)、B2今日心情(ATMOSPHERE_MOOD复用)、B3日常小插曲(DAILY_DETAIL_POOL)、B4手机角落(从GS._entSimChatHistory/bubble等自动生成)
- **C区AI创作（纯写文）**：正文500-800字 + 3选项JSON

### 7. 清理负面规则

删除prompts.js 343-367行25条负面季节禁止规则。buildStageBanCard中删季节部分（isWinter/isMarch/spring/summer/november的禁止清单），保留写歌(327-332行)、哥哥(333-337行)、独处(368-372行)、叙事模式(374-377行)限制。

## 技术栈

JavaScript ES Modules，`var`声明，`+`字符串拼接。仅改entSim模式文件，不新增npm依赖。

## 修改文件清单

| 文件 | 操作 | 内容 |
| --- | --- | --- |
| `src/ent-sim/state.js` | 修改 | ①重写gameDayOf/gameMonthOf ②新增DAYS_IN_MONTH/_isLeapYear ③修复_randBday ④新增svtBirthdayInfo ⑤新增buildHardFactsBlock ⑥新增buildSoftFlavorBlock |
| `src/ent-sim/prompts.js` | 重构 | ①import新增buildHardFactsBlock/buildSoftFlavorBlock/SVT_TEAMMATE_PROFILES/ATMOSPHERE_MOOD ②216-225行替换为buildHardFactsBlock调用 ③292行前插入buildSoftFlavorBlock调用 ④删除343-367行季节禁止 ⑤buildStageBanCard删除季节部分 ⑥buildEntSimContextSnapshot精简 |
| `src/ent-sim/ui.js` | 修改 | ①1105行探班确认3参数→4参数Promise ②1885-1893行renderPhoneChatMsgs改用getContextualPresets ③新增getContextualPresets/rankPresetsByContext函数 |
| `src/ent-sim/pools/svt-teammate-profiles.js` | 修改 | 13人各加birthMonth/birthDay字段 |
| `src/ent-sim/pools/chat-male-lead.js` | 修改 | 新增getMaleLeadPresetsForChat导出函数 |
| `src/ent-sim/pools/_utils.js` | 修改 | 110-138行内联30天公式改为内联真实累计查找 |
| `src/ent-sim/pools/season-atmo.js` | **新建** | SEASON_ATMO_POOL，~30条短氛围片段 |
| `src/ent-sim/pools/daily-detail.js` | **新建** | DAILY_DETAIL_POOL，~25条日常小事片段 |
| `src/ent-sim/pools/index.js` | 修改 | 新增2行export注册新池子 |


## 实现细节

### 步骤1：真实日历核心（state.js）

新增`var DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31]`和`function _isLeapYear(y){return y%4===0}`。重写gameDayOf/gameMonthOf：用(gameDayOfCount)累积天数逐月查找，2月按_isLeapYear取28/29。gameSeasonOf沿用gameMonthOf结果无需改动。formatGameDate/formatTraineeDate自动受益。修复_randBday(148行)：`var m=randInt(1,12); var maxD=DAYS_IN_MONTH[m-1]; var d=randInt(1,maxD); return m+'-'+d`。

### 步骤2：同步调用方

**_utils.js 110-138行**：季节过滤(115行`Math.floor(((d-1)%365)/30)`→真实累计查找，内联DAYS_IN_MONTH数组避免循环依赖)。月份过滤(123行)和生日过滤(132-134行)同步替换。**todayHoliday(364行)**无需改(万圣节d<=31在10月31天下自然适用)。**romance.js(345行)**纪念日%30保持不变。

### 步骤3：探班确认框（ui.js 1105-1112行）

```javascript
// 旧代码
showActionInfoModal('探班 · ' + sel.name, content, function() {
    closeEntSimModal(); showNarrativeLoading();
    triggerEntSimEvent(...).then(rerender);
});
// 新代码
showActionInfoModal('探班 · ' + sel.name, content, '确定', '取消').then(function(ok) {
    if (!ok) return;
    closeEntSimModal(); showNarrativeLoading();
    triggerEntSimEvent(...).then(rerender);
});
```

### 步骤4：SVT队友生日

**svt-teammate-profiles.js**：每条记录新增birthMonth/birthDay字段：scoups(8,8)/jeonghan(10,4)/joshua(12,30)/jun(6,10)/hoshi(6,15)/wonwoo(7,17)/woozi(11,22)/dk(2,18)/mingyu(4,6)/the8(11,7)/seungkwan(1,16)/vernon(2,18)/dino(2,11)。

**state.js新增svtBirthdayInfo(dayCount,profiles)**：用gameMonthOf/gameDayOf算月日，遍历找出birthMonth===m&&birthDay===d的成员，返回`{todayBirthdays:[],allProfiles}`。

### 步骤5：新建2个B区池子

**新建 pools/season-atmo.js**：`export var SEASON_ATMO_POOL`，按季节(4)+天气(~8种)组合索引，~30条1-2句短氛围片段。格式：`{season:'spring',weather:'rain',text:'春寒未退，雨滴敲在练习室窗上。暖气刚停，指尖还有点凉。'}`。

**新建 pools/daily-detail.js**：`export var DAILY_DETAIL_POOL`，按场景类型索引（食堂/走廊/电梯/便利店/公司门口/待机室/天台/停车场/放送局后台），~25条50字内日常片段。格式：`{scene:'cafeteria',text:'端着餐盘找位子，隔三张桌子看到他在吃泡菜汤。'}`。

**pools/index.js**：新增`export { SEASON_ATMO_POOL } from './season-atmo.js';`和`export { DAILY_DETAIL_POOL } from './daily-detail.js';`两行。

### 步骤6：A/B/C分区重构prompt

**state.js新增buildHardFactsBlock(dayCount,E,weather)**：
返回A区字符串整合A1-A6：

- A1: `var d=gameDayOf(dayCount); var m=gameMonthOf(dayCount); var s=gameSeasonOf(dayCount);`
- A2: 调用birthdayInfo+sbtBirthdayInfo+todayHoliday
- A3: `E.agenda.main/related/rival/brother/maleLead` + isDebutUser判断
- A4: `E.affection + oneHeartRomanceStage + E.romance.emotion + E.brother.stance/support + oneHeartColdWar`
- A5: 从E.agenda派生必定出场，从SVT轮换逻辑派生可能偶遇
- A6: 从buildStageBanCard抽取非季节限制(写歌/哥哥/独处/叙事模式)，改为正面陈述

**state.js新增buildSoftFlavorBlock(dayCount,E,weather)**：

- B1: 从SEASON_ATMO_POOL按`pool[i].season===s && pool[i].weather===weather`匹配取1-2条
- B2: 从ATMOSPHERE_MOOD按aff过滤，取1条(已有require字段，`canTrigger`检测)
- B3: 从DAILY_DETAIL_POOL按当前行程场景取1条
- B4: 从GS._entSimChatHistory取最后消息摘要 + bubble.todayCount生成

**prompts.js import改动**：

- 第7行：`import {..., buildHardFactsBlock, buildSoftFlavorBlock, svtBirthdayInfo } from './state.js';`
- 第17行：ATMOSPHERE_MOOD已有，无需新增
- 第18行新增：`import { SVT_TEAMMATE_PROFILES, SEASON_ATMO_POOL, DAILY_DETAIL_POOL } from './pools/index.js';`

**prompts.js 行级改动**：

- 删除216-225行（日期+生日+节日分散注入），替换为`msg += buildHardFactsBlock(...) + buildSoftFlavorBlock(...);`
- 删除buildStageBanCard中343-367行（季节禁止）
- buildEntSimContextSnapshot中保留记忆注入(528-529行)+场景灵感(531-532行)，上移硬事实部分(508-526行)到A区

### 步骤7：聊天快捷回复

**chat-male-lead.js新增getMaleLeadPresetsForChat(affection,lastMsg)**：遍历CHAT_MALE_LEAD所有子池(trainee/greet/stage/worry/romantic/jealous/night/secret等)，收集aff<=affection条目的q值。对lastMsg中文分词(按标点和空格切分)，统计重叠词数降序取top3，返回`[{q,t}]`格式。

**ui.js新增getContextualPresets(ch,lastMsg)**：ch==='maleLead'→getMaleLeadPresetsForChat()，其他→rankPresetsByContext()。

**ui.js新增rankPresetsByContext(raw,lastMsg)**：阶段池presets按关键词重叠度评分降序取top3，无重叠随机。

**ui.js 1885-1893行替换**：`presets = getContextualPresets(ch, lastMsg ? lastMsg.content : '');`

### 不修改的部分

chat-modal.js(1v1模式)、阶段池156个presets结构、CHAT_MALE_LEAD条目结构、dayCount初始化/保存/加载、calendar-events.js中4角色生日事件、romance.js纪念日%30逻辑。