---
name: entSim双修复-月份天数日历+聊天快捷回复匹配
overview: 修复两个问题：①二月出现30号的日历逻辑（每月固定30天→真实月份天数）；②entSim聊天快捷回复与对方消息内容不匹配（通用短语→上下文相关回复）。
todos:
  - id: real-calendar-core
    content: 替换真实日历核心函数：在state.js中重写gameDayOf/gameMonthOf，添加DAYS_IN_MONTH累计数组和闰年判断，修复formatGameDate输出无效日期问题
    status: pending
  - id: real-calendar-callers
    content: 同步日历调用方：更新pools/_utils.js的条件匹配公式、state.js的todayHoliday万圣节边界和_randBday随机生日、romance.js纪念日检查逻辑
    status: pending
    dependencies:
      - real-calendar-core
  - id: chat-contextual-presets
    content: 实现上下文相关快捷回复：在chat-male-lead.js新增getMaleLeadPresetsForChat导出函数，在ui.js新增getContextualPresets和rankPresetsByContext函数
    status: pending
  - id: chat-render-fix
    content: 修改聊天渲染接入上下文presets：更新renderPhoneChatMsgs调用getContextualPresets替代getChatPresetsByChannel，使男主频道presets来源与findChatPoolReply匹配源一致
    status: pending
    dependencies:
      - chat-contextual-presets
  - id: verify-integration
    content: 全链路验证：检查prompts.js日期注入和季节禁制是否自动适配新日历，确认三个聊天频道（男主/哥哥/情敌）的快捷回复→匹配→ACK回复链路完整无误
    status: pending
    dependencies:
      - real-calendar-callers
      - chat-render-fix
---

## 需求概述

修复entSim（娱乐圈模拟器）模式的两个核心体验bug：

### Bug 1：二月出现30号

当前日期系统使用"每月固定30天"简化模型，`formatGameDate()`可输出"2月30日""4月31日"等无效日期，严重破坏沉浸感。需替换为真实日历（含闰年判断），确保输出的所有日期均为真实存在的日期。

### Bug 2：聊天快捷回复与消息内容不对应

entSim手机聊天中，快捷回复按钮显示的是基于好感度阶段的固定通用短语（如"嗯""知道了""好的"），与对方刚发来的消息内容（如"今天训练狠吗？"）完全无关。点击后回复匹配逻辑也存在数据源不一致问题（男主频道的presets来自阶段池但匹配走CHAT_MALE_LEAD池），导致几乎永远匹配失败、兜底为空洞的"嗯。"。

## 技术方案

### Bug 1：真实日历系统替换

#### 实现策略

保持 `dayCount` 作为标准时间计数器不变（它在保存/加载、章节跳跃、冷却计时等数十处引用），仅重写日期解读函数。采用月度累计天数数组 + 闰年判断，将 dayCount 映射到真实的月/日。

#### 核心改动

**1. state.js — 重写日期核心函数 (263-284行)**

新增常量与工具函数：

- `DAYS_IN_MONTH` — 非闰年每月天数数组 `[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]`
- `CUMULATIVE_DAYS` — 非闰年累计天数数组 `[0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]`
- `_isLeapYear(year)` — 返回 `year % 4 === 0`

重写 `gameDayOf(dayCount)` 和 `gameMonthOf(dayCount)`：

```
function gameMonthOf(dayCount) {
  var y = gameYearOf(dayCount);
  var d = (dayCount - 1) % 365;
  var febDays = _isLeapYear(y) ? 29 : 28;
  var cum = [0, 31, 31+febDays, 31+febDays+31, ...]; // 按需计算
  // 二分查找 month
}
```

`gameSeasonOf()` 沿用 `gameMonthOf()` 结果，无需修改。

`formatGameDate()` 自动受益于 `gameMonthOf`/`gameDayOf` 修复。

**2. state.js — 修复 todayHoliday() (363-376行)**

万圣节条件 `m === 10 && d >= 28 && d <= 31` → 改为 `d >= 28 && d <= 31`（10月实际有31天，保留），但需确保 `gameDayOf` 在10月能返回31。

**3. state.js — 修复 _randBday() (148-154行)**

将 `Math.floor(Math.random() * 28) + 1` 改为按实际月份天数随机：

```
function _randBday() {
  var m = Math.floor(Math.random() * 12) + 1;
  var maxDay = DAYS_IN_MONTH[m-1];
  var d = Math.floor(Math.random() * maxDay) + 1;
  return m + '-' + d;
}
```

**4. pools/_utils.js — 重写条件匹配的日期计算 (110-138行)**

`_checkSingle` 中的季节、月份、生日过滤使用了内联的30天公式，需统一替换为调用 `gameMonthOf`/`gameDayOf` 或直接使用 `DAYS_IN_MONTH` 累计查找。因该文件可能与state.js存在循环依赖，需使用内联函数或延迟导入。

**5. romance.js — 修复纪念日检查 (345-358行)**

当前用 `(today - m[key]) % 30 === 0` 判断每30天倍数。改为用真实月份天数差异计算，或简化为每30个dayCount提醒（保持原有逻辑，因为纪念日更关心"过了多少天"而非"到了几月几号"）。

**6. 向后兼容**

旧存档的 `dayCount` 值不变。真实日历重新解读后，同一 dayCount 会映射到略不同的日期（偏差0-2天）。例如 dayCount=48：旧→2月18日，新(2024闰年)→2月17日。此偏差在可接受范围内，日期仍在同一季节/月份，不影响季节判定的节日触发。

---

### Bug 2：上下文相关的聊天快捷回复

#### 实现策略

分频道处理：

- **男主频道**：presets从 `CHAT_MALE_LEAD` 池的 `q` 字段提取（按好感度门槛过滤），确保与 `findChatPoolReply` 的数据源一致，消除匹配断裂。
- **哥哥/情敌频道**：对阶段池presets按最后一条AI消息的关键词做相关性排序，取top 3显示；无匹配时回退到随机3个。

#### 核心改动

**1. ui.js — 新增 getContextualPresets(ch, lastMsg) 函数**

```javascript
function getContextualPresets(ch, lastMsg) {
  if (ch === 'maleLead') {
    // 从 CHAT_MALE_LEAD 提取 q 条目，按 aff 门槛过滤
    return getMaleLeadPresetsForChat(GS.entSim.affection || 0, lastMsg);
  }
  // brother/rival：阶段池 presets 按关键词相关性排序
  var raw = getChatPresetsByChannel(ch);
  return rankPresetsByContext(raw, lastMsg);
}
```

**2. pools/chat-male-lead.js — 新增导出函数**

新增 `getMaleLeadPresetsForChat(affection, lastMsg)`：

- 遍历 `CHAT_MALE_LEAD` 所有子池（trainee/greet/stage/worry/romantic等）
- 收集 `aff <= affection` 的条目中的 `q` 值
- 用 lastMsg 做关键词匹配打分（简单分词后统计重叠词数）
- 取 top 3 返回 `[{q: '...', t: '...'}]` 格式

**3. ui.js — 新增 rankPresetsByContext(raw, lastMsg) 函数**

对阶段池presets数组按 lastMsg 关键词重叠度排序，返回top 3。若无重叠则随机。

**4. ui.js — 修改 renderPhoneChatMsgs (1885-1893行)**

将：

```javascript
var stagePresets = getChatPresetsByChannel(ch);
var shuffled = stagePresets.slice().sort(function() { return Math.random() - 0.5; });
presets = shuffled.slice(0, 3).map(function(t) { return { q: t, t: t }; });
```

替换为：

```javascript
var ctxPresets = getContextualPresets(ch, lastMsg ? lastMsg.content : '');
presets = ctxPresets;
```

**5. ui.js — 修复 updateQuickReplies 兼容性**

`updateQuickReplies` (1853行) 已通过 `p.q` 存储 replyKeys，与新格式兼容。`__quickReply` 中 `findChatPoolReply(q)` 现在能匹配到 `CHAT_MALE_LEAD` 中的 q 字符串（因为presets就是从那里来的）。

---

### 不修改的部分

- `chat-modal.js`（1v1模式聊天，使用AI实时生成，无快捷回复问题）
- 阶段池数据文件（13人×3角色×4阶段=156个阶段池，presets结构保持不变）
- `CHAT_MALE_LEAD` 数据条目（q/r/aff结构保持不变，仅新增提取函数）
- `dayCount` 的初始化、保存、加载逻辑