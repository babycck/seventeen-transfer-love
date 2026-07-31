---
name: entSim-六大修复-日历+聊天+探班+生日+prompt分区+软调味池
overview: 六项修复+重构：①真实日历替换；②探班确认框参数修正；③A/B/C分区prompt重构+删除负面规则；④SVT队友生日注入；⑤B区软调味（365条日历氛围池+日常插曲池+五类记忆分类）；⑥聊天快捷回复上下文匹配。
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
  - id: svt-birthday-pools
    content: 补全SVT队友生日+新建池子：svt-teammate-profiles.js加birthMonth/birthDay，新建pools/calendar-atmo.js(365条)和pools/daily-detail.js(~25条)，pools/index.js注册导出
    status: pending
  - id: build-blocks
    content: 实现A/B块+记忆函数：state.js新增buildHardFactsBlock/buildSoftFlavorBlock(含B5五类记忆)/svtBirthdayInfo三个导出函数
    status: pending
    dependencies:
      - real-calendar-core
      - svt-birthday-pools
  - id: prompts-restructure
    content: 重构prompts.js为A/B/C分区：替换216-225行分散注入，删除343-367行负面季节禁止，精简buildEntSimContextSnapshot
    status: pending
    dependencies:
      - build-blocks
  - id: chat-contextual-presets
    content: 实现上下文相关快捷回复：chat-male-lead.js新增getMaleLeadPresetsForChat，ui.js新增getContextualPresets/rankPresetsByContext，renderPhoneChatMsgs接入
    status: pending
  - id: verify-integration
    content: 全链路验证：日历输出真实日期、聊天快捷回复关联消息、探班确认按钮正常、队友生日正确注入、365氛围确定性一致、五类记忆附数值
    status: pending
    dependencies:
      - real-calendar-callers
      - fix-visit-confirm
      - prompts-restructure
      - chat-contextual-presets
---

## 用户核心原则

"尽量让AI少判断，只做剧情输出"——所有日期/季节/天气/生日/节日/行程/感情状态/角色出场等硬事实由代码100%预计算后直接注入prompt。软调味从池子随机抽取。AI只负责扩写正文500-800字+3选项。

## 四个Bug

1. **二月30号**：gameMonthOf每月固定30天，formatGameDate()输出"2月30日"等无效日期
2. **聊天快捷回复不匹配**：presets通用短语（"嗯""好的"） vs CHAT_MALE_LEAD池q字段是两套数据，精确匹配永败兜底"嗯。"
3. **探班确认框参数传错**：ui.js:1105 showActionInfoModal传3参数(title,html,callback)，签名是(title,html,confirmText,cancelText)，按钮显示函数源码
4. **SVT队友生日无月日**：svt-teammate-profiles.js只有birthYear，AI编造队友生日对不上游戏日期

## Prompt A/B/C分区结构（最终版）

**A区·硬事实（代码100%预计算，AI只读不编）**

- A1. 今日基础：日期·季节·天气·体感温度·时段
- A2. 今日特殊：核心角色生日·节日·SVT队友今日寿星·13人生日参考表
- A3. 今日行程：上午主档/下午副档/晚上/职业阶段/练习生或出道
- A4. 感情状态：好感度·恋爱阶段·叙事模式·男主情绪·哥哥立场/支持度·情敌·冷战/吃醋·曝光风险
- A5. 今日可见角色：必定出场/可能偶遇/SVT轮换名单
- A6. 阶段行为限制：允许做什么/禁止做什么（正面陈述，不含季节规则）

**B区·软调味（代码从池子抽1-2条，AI自然融入）**

- B1. 日历氛围：从 CALENDAR_ATMO_POOL[month][day] 确定性索引（365条，每年同一天永远输出同一句，不随机跳变）
- B2. 今日心情：从 ATMOSPHERE_MOOD 按好感度过滤取1条（复用已有55条）
- B3. 日常插曲：从 DAILY_DETAIL_POOL 随机取1条（新建~25条）
- B4. 手机角落：从 _entSimChatHistory 取最后消息摘要 + bubble今日计数
- B5. 近期记忆（五分类+数值）：从 careerHistory 按type分组取最近1-2条 + 附当前数值

**C区·AI创作**：正文500-800字 + 3选项JSON（标注affectionDelta+曝光风险）

## B5记忆五分类

| 分类 | careerHistory type | 附数值 |
| --- | --- | --- |
| 事业记忆 | phase/popularity/*_done | 人气值 popularity + 职业阶段 careerLevel |
| 感情记忆 | romance | 好感度 affection + 恋爱阶段 romanceStage |
| 哥哥记忆 | brother | 支持度 brotherSupport + 立场 stance |
| 情敌记忆 | npc(情敌相关) | 亲密度 rivalAff + 情敌阶段 rivalStage |
| 其他记忆 | 未分类事件 | 最近2条 |


## 技术栈

- JavaScript ES Modules，`var`声明，`+`字符串拼接
- 仅修改entSim（娱乐圈模拟器）模式文件
- 不新增npm依赖

## 修改文件清单（9个文件）

| 文件 | 操作 | 内容 |
| --- | --- | --- |
| `src/ent-sim/state.js` | 修改 | 重写gameDayOf/gameMonthOf + DAYS_IN_MONTH/_isLeapYear + _randBday修复 + svtBirthdayInfo + buildHardFactsBlock + buildSoftFlavorBlock(含B5记忆) |
| `src/ent-sim/prompts.js` | 重构 | import新增7项 + 删除216-225行(分散日期)替换为A/B块 + 删除343-367行(25条季节禁止) + buildStageBanCard删季节部分 + buildEntSimContextSnapshot精简 |
| `src/ent-sim/ui.js` | 修改 | 探班确认3参数→4参数Promise + renderPhoneChatMsgs改用getContextualPresets + 新增getContextualPresets/rankPresetsByContext |
| `src/ent-sim/pools/svt-teammate-profiles.js` | 修改 | 13人各加birthMonth/birthDay字段 |
| `src/ent-sim/pools/chat-male-lead.js` | 修改 | 新增getMaleLeadPresetsForChat导出函数 |
| `src/ent-sim/pools/_utils.js` | 修改 | 110-138行内联30天公式→真实累计查找 |
| `src/ent-sim/pools/calendar-atmo.js` | **新建** | CALENDAR_ATMO_POOL，365条，month+day确定性索引 |
| `src/ent-sim/pools/daily-detail.js` | **新建** | DAILY_DETAIL_POOL，~25条日常小事片段 |
| `src/ent-sim/pools/index.js` | 修改 | 新增2行export注册新池子 |


## 实现细节

### 步骤1：真实日历核心（state.js 263-284行+148-155行）

新增`var DAYS_IN_MONTH=[31,28,31,30,31,30,31,31,30,31,30,31]`和`function _isLeapYear(y){return y%4===0}`。重写gameDayOf/gameMonthOf：用(gameDayOfCount)累计天数逐月查找，2月按_isLeapYear取28/29。gameSeasonOf沿用gameMonthOf无需改动。formatGameDate/formatTraineeDate自动受益。修复_randBday：`var m=randInt(1,12); var maxD=DAYS_IN_MONTH[m-1]; var d=randInt(1,maxD); return m+'-'+d`。

### 步骤2：同步调用方

**_utils.js 110-138行**：季节过滤内联公式`Math.floor(((d-1)%365)/30)`改为内联DAYS_IN_MONTH累计查找避免循环依赖。月份过滤和生日过滤同步替换。**todayHoliday**无需改。**romance.js纪念日%30**保持不变。

### 步骤3：探班确认框（ui.js 1105-1112行）

旧：`showActionInfoModal('探班·'+sel.name,content,function(){...});`
新：`showActionInfoModal('探班·'+sel.name,content,'确定','取消').then(function(ok){if(!ok)return;...});`

### 步骤4：SVT队友生日+新建池子

**svt-teammate-profiles.js**：13人加birthMonth/birthDay：scoups(8,8)/jeonghan(10,4)/joshua(12,30)/jun(6,10)/hoshi(6,15)/wonwoo(7,17)/woozi(11,22)/dk(2,18)/mingyu(4,6)/the8(11,7)/seungkwan(1,16)/vernon(2,18)/dino(2,11)。

**新建 pools/calendar-atmo.js**：365条，格式`{month:1,day:1,text:'元旦的首尔飘着细雪...'}`。`buildSoftFlavorBlock`中`findAtmoByDate(pool,month,day)`返回唯一一条确定性索引。

**新建 pools/daily-detail.js**：~25条，格式`{scene:'cafeteria',text:'端着餐盘找位子...'}`。

**pools/index.js**：注册两个新export。

### 步骤5：A/B/C分区函数（state.js新增三个导出函数）

**buildHardFactsBlock(dayCount,E,weather)**：整合A1-A6为一个紧凑字符串。

**buildSoftFlavorBlock(dayCount,E,weather)**：

- B1: `findAtmoByDate(CALENDAR_ATMO_POOL,month,day)` 确定性索引
- B2: ATMOSPHERE_MOOD按aff过滤取1条
- B3: DAILY_DETAIL_POOL随机取1条
- B4: 从GS._entSimChatHistory取最后消息+ bubble.todayCount
- B5: 从careerHistory按type分组取最近1-2条+附当前数值（人气/好感/支持度/亲密度）

**svtBirthdayInfo(dayCount,profiles)**：今日SVT寿星检测+13人完整生日表。

### 步骤6：prompts.js重构

- 第7行import新增：`buildHardFactsBlock, buildSoftFlavorBlock, svtBirthdayInfo`
- 第18行新增import：`SVT_TEAMMATE_PROFILES, CALENDAR_ATMO_POOL, DAILY_DETAIL_POOL, ATMOSPHERE_MOOD`
- 删除216-225行→替换为`msg+=buildHardFactsBlock(...)+buildSoftFlavorBlock(...);`
- 删除buildStageBanCard中343-367行（isWinter/isMarch/spring/summer/november禁止清单）
- 保留327-332行(写歌)、333-337行(哥哥)、368-372行(独处)、374-377行(叙事模式)
- buildEntSimContextSnapshot中上移硬事实到A区，保留记忆+场景灵感

### 步骤7：聊天快捷回复

**chat-male-lead.js新增getMaleLeadPresetsForChat(affection,lastMsg)**：遍历CHAT_MALE_LEAD所有子池收集aff<=affection的q值，与lastMsg中文分词做重叠度匹配降序取top3。

**ui.js新增getContextualPresets+rankPresetsByContext**。**renderPhoneChatMsgs**替换presets生成。

### 不修改的部分

chat-modal.js(1v1)、阶段池156个presets、CHAT_MALE_LEAD条目结构、dayCount初始化/保存/加载、calendar-events.js、romance.js纪念日%30。