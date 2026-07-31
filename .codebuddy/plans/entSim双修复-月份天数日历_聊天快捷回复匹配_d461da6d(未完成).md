---
name: entSim双修复-月份天数日历+聊天快捷回复匹配
overview: 修复三个bug：①二月出现30号的日历逻辑（每月固定30天→真实月份天数）；②entSim聊天快捷回复与对方消息内容不匹配（通用短语→上下文相关回复）；③探班确认框参数错误（回调函数传给字符串参数导致按钮显示垃圾文本）。
todos:
  - id: real-calendar-core
    content: 替换真实日历核心函数：在state.js中重写gameDayOf/gameMonthOf，添加DAYS_IN_MONTH累计数组和闰年判断
    status: pending
  - id: real-calendar-callers
    content: 同步日历调用方：更新pools/_utils.js条件匹配、state.js的todayHoliday和_randBday、romance.js纪念日
    status: pending
    dependencies:
      - real-calendar-core
  - id: fix-visit-confirm
    content: 修复探班确认框：ui.js第1105行showActionInfoModal改为正确的( title, html, 确定, 取消 ).then(fn)四参数调用
    status: pending
  - id: chat-contextual-presets
    content: 实现上下文相关快捷回复：chat-male-lead.js新增getMaleLeadPresetsForChat，ui.js新增getContextualPresets和rankPresetsByContext
    status: pending
  - id: chat-render-fix
    content: 修改聊天渲染接入上下文presets：renderPhoneChatMsgs调用getContextualPresets替代getChatPresetsByChannel
    status: pending
    dependencies:
      - chat-contextual-presets
  - id: verify-integration
    content: 全链路验证：prompts.js日期注入适配、三个聊天频道快捷回复链路、探班确认弹窗按钮文字正常
    status: pending
    dependencies:
      - real-calendar-callers
      - fix-visit-confirm
      - chat-render-fix
---

## 需求概述

修复entSim（娱乐圈模拟器）模式的三个核心体验bug：

### Bug 1：二月出现30号

当前日期系统使用"每月固定30天"简化模型，`formatGameDate()`可输出"2月30日""4月31日"等无效日期。根因：`gameMonthOf(dayCount)` 用 `Math.floor(((dayCount-1)%365)/30)+1`。需替换为真实日历（含闰年判断），确保所有输出日期均为真实存在的日期。

### Bug 2：聊天快捷回复与消息内容不对应

entSim手机聊天中，快捷回复按钮显示的是基于好感度阶段的固定通用短语（如"嗯""知道了""好的"），与对方刚发来的消息内容完全无关。男主频道presets来源（阶段池）与`findChatPoolReply`匹配源（CHAT_MALE_LEAD池）是两套数据，匹配几乎永远失败、兜底为"嗯。"。

### Bug 3：探班确认框参数传错（新增）

`ui.js`第1105行调用`showActionInfoModal(title, htmlBody, callback)`传了3个参数，但函数签名是`(title, htmlBody, confirmText, cancelText)`。第三个参数本应是按钮文字`'确定'`，却传了一个函数对象。导致确认按钮显示函数源码字符串而非正常文字，且回调永远不会被调用。正确写法参考同文件2445行：`showActionInfoModal(title, html, '确定', '取消').then(fn)`。

## 技术方案

### Bug 1：真实日历系统替换

保持 `dayCount` 作为标准时间计数器不变（保存/加载、章节跳跃、冷却计时等数十处引用），仅重写日期解读函数。

**核心改动：**

1. **state.js 263-284行** — 重写 `gameDayOf`/`gameMonthOf`：

- 新增 `DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31]`
- 新增 `_isLeapYear(year)` → `year % 4 === 0`
- `gameMonthOf` 用累计天数逐月查找；`gameDayOf` 用剩余天数计算
- `gameSeasonOf()` 沿用 `gameMonthOf()` 结果，无需修改
- `formatGameDate()` 自动受益

2. **state.js 363-376行** — `todayHoliday()` 万圣节条件 `d<=31` 保留（10月有31天）

3. **state.js 148-155行** — `_randBday()` 改为按 `DAYS_IN_MONTH[m-1]` 随机日数

4. **pools/_utils.js 110-138行** — 季节/月份/生日过滤改用新公式（内联累计查找避免循环依赖）

5. **romance.js 345-358行** — 纪念日保持每30个dayCount提醒（关心"过了多少天"而非"几月几号"）

**向后兼容**：旧存档 dayCount 不变，重新解读后同一 dayCount 偏差0-2天，季节/月份不变。

---

### Bug 2：上下文相关的聊天快捷回复

分频道处理：

- **男主频道**：presets从 `CHAT_MALE_LEAD` 池提取（按好感度过滤），与 `findChatPoolReply` 数据源一致
- **哥哥/情敌频道**：阶段池presets按最后一条AI消息关键词相关性排序

**核心改动：**

1. **ui.js 新增 `getContextualPresets(ch, lastMsg)`**：男主频道→`getMaleLeadPresetsForChat()`；其他→`rankPresetsByContext()`

2. **pools/chat-male-lead.js 新增 `getMaleLeadPresetsForChat(affection, lastMsg)`**：遍历所有子池收集 `q` 值，按关键词重叠度取top 3

3. **ui.js 新增 `rankPresetsByContext(raw, lastMsg)`**：按关键词重叠度排序阶段池presets

4. **ui.js 1885-1893行** — `renderPhoneChatMsgs` 中替换为 `getContextualPresets(ch, lastMsg.content)`

5. **兼容性**：`updateQuickReplies`和`__quickReply`中`findChatPoolReply(q)`现在能匹配到同源的q字符串

---

### Bug 3：探班确认框参数修复

**ui.js 1105-1112行** — 将：

```javascript
showActionInfoModal('探班 · ' + sel.name,
    '📍 今日行程：...',
    function() { closeEntSimModal(); showNarrativeLoading(); triggerEntSimEvent(...).then(rerender); }
);
```

改为：

```javascript
showActionInfoModal('探班 · ' + sel.name,
    '📍 今日行程：' + sel.task + '（' + sel.place + '）\n\n' + riskNote + '\n\n确定要去探班吗？',
    '确定', '取消'
).then(function(ok) {
    if (!ok) return;
    closeEntSimModal();
    showNarrativeLoading();
    triggerEntSimEvent('探班：你借口工作去看' + sel.name + '（他今天在' + sel.task + '），两人在工作间隙偷偷见面').then(rerender);
});
```

---

### 不修改的部分

- `chat-modal.js`（1v1模式AI实时生成，无快捷回复问题）
- 阶段池数据文件（13人×3角色×4阶段=156个阶段池）
- `CHAT_MALE_LEAD` 数据条目结构
- `dayCount` 初始化/保存/加载逻辑