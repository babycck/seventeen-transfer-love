---
name: entSim-全面修复-prompt-A-B-C分区重构
overview: 全面修复entSim：真实日历+探班确认框+SVT队友生日+A/B/C分区prompt重构+365氛围池+五类记忆+聊天快捷回复匹配。DeepSeek v4 pro适配400-700字/回合。
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
    content: 补全SVT队友生日+新建池子：svt-teammate-profiles.js加birthMonth/birthDay，新建calendar-atmo.js(365条)和daily-detail.js(~25条)，pools/index.js注册
    status: pending
  - id: build-blocks
    content: 实现A/B块+记忆函数：state.js新增buildHardFactsBlock/buildSoftFlavorBlock(含isFirstRoundToday+B5五类记忆+兜底)/svtBirthdayInfo三个导出函数
    status: pending
    dependencies:
      - real-calendar-core
      - svt-birthday-pools
  - id: prompts-restructure
    content: 重构prompts.js为A/B/C分区：删除第151行节日季节校验规则，216-225行替换为A/B块，删除343-367行负面季节禁止，字数分级控制，精简snapshot
    status: pending
    dependencies:
      - build-blocks
  - id: chat-contextual-presets
    content: 实现上下文相关快捷回复：chat-male-lead.js新增getMaleLeadPresetsForChat，ui.js新增getContextualPresets/rankPresetsByContext，renderPhoneChatMsgs接入
    status: pending
  - id: verify-integration
    content: 全链路验证：日历真实日期、聊天快捷回复匹配、探班确认按钮正常、队友生日正确注入、365氛围确定性一致、B1首回合去重、B3场景过滤、五类记忆附数值
    status: pending
    dependencies:
      - real-calendar-callers
      - fix-visit-confirm
      - prompts-restructure
      - chat-contextual-presets
---

## 用户核心原则

"尽量让AI少判断，只做剧情输出"——所有日期/季节/天气/生日/节日/行程/感情状态/角色出场等硬事实由代码100%预计算后直接注入prompt。软调味从池子抽取。AI只负责扩写正文+3选项JSON。

## 四个Bug

1. **二月30号**：gameMonthOf每月固定30天，formatGameDate()输出"2月30日"等无效日期
2. **聊天快捷回复不匹配**：presets通用短语 vs CHAT_MALE_LEAD池q字段是两套数据，精确匹配永败兜底"嗯。"
3. **探班确认框参数传错**：ui.js:1105 showActionInfoModal传3参数(title,html,callback)，签名是(title,html,confirmText,cancelText)，按钮显示函数源码
4. **SVT队友生日无月日**：svt-teammate-profiles.js只有birthYear，AI编造队友生日对不上游戏日期

## DeepSeek v4 pro 适配

- temperature: 0.55（现有值）
- maxTokens: 5000（现有值）
- 字数分级：日常回合 400-700 字 / 关键事件(告白/约会/生日) 700-900 字
- 一天 3 回合（上午/下午/晚上），narrative buffer 上限 10000 字自动折叠

## Prompt A/B/C 分区结构

**A区·硬事实（代码100%预计算，AI只读不编）**

- A1 今日基础：日期·季节·天气·体感温度·时段
- A2 今日特殊：核心角色生日·节日·SVT队友今日寿星·13人生日参考表
- A3 今日行程：上午主档/下午副档/晚上/职业阶段/练习生或出道
- A4 感情状态：好感度·恋爱阶段·叙事模式·男主情绪·哥哥立场/支持度·情敌·冷战/吃醋·曝光风险
- A5 今日可见角色：必定出场/可能偶遇/SVT轮换名单
- A6 阶段行为限制：允许做什么/禁止做什么（正面陈述，不含季节规则）

**B区·软调味（代码从池子抽1-2条，AI自然融入）**

- B1 日历氛围：CALENDAR_ATMO_POOL[month][day] 确定性索引，仅每日首回合注入
- B2 今日心情：ATMOSPHERE_MOOD 按好感度过滤取1条（复用已有55条）
- B3 日常插曲：DAILY_DETAIL_POOL 按当前场景类型过滤取1条，无匹配跳过
- B4 手机角落：_entSimChatHistory 最后消息摘要 + bubble今日计数（兜底"手机安静"）
- B5 五类记忆：careerHistory 按type分组取最近1-2条+附当前数值

**C区·AI创作**：正文 + 3选项JSON（extras含affectionDelta/romanceBeat/npcEncounter/exposureEvent/brother/endingsHint/appointments）

## B区兜底与防护

| 块 | 防护机制 |
| --- | --- |
| B1 同天重复 | buildSoftFlavorBlock接收isFirstRoundToday参数，非首回合跳过B1 |
| B3 场景冲突 | 按当前行程场景类型过滤DAILY_DETAIL_POOL，无匹配跳过 |
| B4 早期为空 | 开局无聊天记录时返回"手机安静，暂无新消息" |
| A5 轮换为空 | 无SVT轮换时返回"本轮暂无SEVENTEEN队员出场" |


## B5 记忆五分类

| 分类 | careerHistory type | 附数值 |
| --- | --- | --- |
| 事业记忆 | phase/popularity/*_done | 人气值 popularity + 职业阶段 careerLevel |
| 感情记忆 | romance | 好感度 affection + 恋爱阶段 romanceStage |
| 哥哥记忆 | brother | 支持度 brotherSupport + 立场 stance |
| 情敌记忆 | npc(情敌相关) | 亲密度 rivalAff + 情敌阶段 rivalStage |
| 其他记忆 | 未分类事件 | 最近2条 |


## 约定面板

ui.js renderAptPanel()：E._aptCards为空时直接返回空字符串不显示。数据来自AI返回的extras.appointments，由applySideEffects写入。

## 技术栈

- JavaScript ES Modules，`var`声明，`+`字符串拼接
- 仅修改entSim模式文件
- 不新增npm依赖

## 修改文件清单（9个文件）

| 文件 | 操作 | 内容 |
| --- | --- | --- |
| `src/ent-sim/state.js` | 修改 | 重写gameDayOf/gameMonthOf + DAYS_IN_MONTH/_isLeapYear + _randBday修复 + svtBirthdayInfo + buildHardFactsBlock + buildSoftFlavorBlock(含B5记忆+isFirstRoundToday参数) |
| `src/ent-sim/prompts.js` | 重构 | import新增7项 + 删除第151行节日季节校验规则 + 删除216-225行替换为A/B块 + 删除343-367行季节禁止 + buildStageBanCard删季节部分 + buildEntSimContextSnapshot精简 + 字数分级控制 |
| `src/ent-sim/ui.js` | 修改 | 1105行探班确认3参数→4参数Promise + 1885-1893行renderPhoneChatMsgs改用getContextualPresets + 新增getContextualPresets/rankPresetsByContext |
| `src/ent-sim/pools/svt-teammate-profiles.js` | 修改 | 13人各加birthMonth/birthDay字段 |
| `src/ent-sim/pools/chat-male-lead.js` | 修改 | 新增getMaleLeadPresetsForChat导出函数 |
| `src/ent-sim/pools/_utils.js` | 修改 | 110-138行内联30天公式→真实累计查找 |
| `src/ent-sim/pools/calendar-atmo.js` | 新建 | CALENDAR_ATMO_POOL，365条，month+day确定性索引 |
| `src/ent-sim/pools/daily-detail.js` | 新建 | DAILY_DETAIL_POOL，~25条，按场景类型过滤 |
| `src/ent-sim/pools/index.js` | 修改 | 新增2行export注册新池子 |


## 实现细节

### 步骤1：真实日历核心（state.js）

新增 `var DAYS_IN_MONTH=[31,28,31,30,31,30,31,31,30,31,30,31]` 和 `function _isLeapYear(y){return y%4===0}`。重写 gameDayOf/gameMonthOf 用累计天数逐月查找，2月按 _isLeapYear 取28/29。gameSeasonOf 沿用 gameMonthOf 无需改动。修复 _randBday 按 DAYS_IN_MONTH[m-1] 随机。

### 步骤2：同步调用方

_utils.js 110-138行：季节/月份/生日过滤内联公式改为内联 DAYS_IN_MONTH 累计查找。todayHoliday 万圣节条件自然兼容。romance.js 纪念日 %30 保持不变。

### 步骤3：探班确认框（ui.js 1105-1112行）

旧：`showActionInfoModal('探班·'+sel.name,content,function(){...});`
新：`showActionInfoModal('探班·'+sel.name,content,'确定','取消').then(function(ok){if(!ok)return;...});`

### 步骤4：SVT队友生日+新建池子

svt-teammate-profiles.js：13人加 birthMonth/birthDay（真实数值）。
新建 calendar-atmo.js：365条 `{month,day,text}`，确定性索引。
新建 daily-detail.js：~25条 `{scene,text}`，按场景过滤。
pools/index.js：注册两个新 export。

### 步骤5：A/B/C分区函数（state.js新增三个导出函数）

**buildHardFactsBlock(dayCount,E,weather)**：整合 A1-A6 为一个紧凑字符串。
**buildSoftFlavorBlock(dayCount,E,weather,isFirstRoundToday)**：

- isFirstRoundToday=false 时跳过 B1
- B1：findAtmoByDate(CALENDAR_ATMO_POOL,month,day) 确定性索引
- B2：ATMOSPHERE_MOOD 按 aff 过滤取1条
- B3：DAILY_DETAIL_POOL 按当前场景过滤，无匹配跳过
- B4：_entSimChatHistory 最后消息 + bubble.todayCount，兜底
- B5：careerHistory 按 type 分组取最近1-2条 + 附当前数值
**svtBirthdayInfo(dayCount,profiles)**：今日 SVT 寿星检测 + 13人完整生日表。

### 步骤6：prompts.js重构

- import 新增：buildHardFactsBlock, buildSoftFlavorBlock, svtBirthdayInfo, SVT_TEAMMATE_PROFILES, CALENDAR_ATMO_POOL, DAILY_DETAIL_POOL, ATMOSPHERE_MOOD
- 删除第151行 `【节日季节校验·强制】` 规则
- 删除216-225行替换为 `msg+=buildHardFactsBlock(...)+buildSoftFlavorBlock(...);`
- 删除 buildStageBanCard 中 343-367 行季节禁止清单
- 保留写歌(327-332行)、哥哥(333-337行)、独处(368-372行)、叙事模式(374-377行)限制
- buildEntSimContextSnapshot 上移硬事实到 A 区，保留记忆+场景灵感
- 字数控制：日常回合 prompt 中写"400-700字"，关键事件写"700-900字"

### 步骤7：聊天快捷回复

chat-male-lead.js 新增 getMaleLeadPresetsForChat(affection,lastMsg)：遍历 CHAT_MALE_LEAD 所有子池收集 q 值，与 lastMsg 中文分词做重叠度降序取 top3。ui.js 新增 getContextualPresets/rankPresetsByContext。renderPhoneChatMsgs 替换 presets 生成。

### 不修改的部分

chat-modal.js(1v1)、阶段池156个presets、CHAT_MALE_LEAD条目结构、dayCount初始化/保存/加载、calendar-events.js、romance.js纪念日%30。