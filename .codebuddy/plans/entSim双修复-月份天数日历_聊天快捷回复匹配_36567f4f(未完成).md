---
name: entSim双修复-月份天数日历+聊天快捷回复匹配
overview: 修复四个bug：①二月出现30号（每月30天→真实日历）；②聊天快捷回复与消息不对应（通用短语→上下文相关）；③探班确认框参数错误（回调→Promise）；④SEVENTEEN队友生日与游戏日期不符（无队友生日数据→注入真实生日+今日寿星）。
todos:
  - id: real-calendar-core
    content: 替换真实日历核心函数：在 state.js 中重写 gameDayOf/gameMonthOf，添加 DAYS_IN_MONTH 数组和 _isLeapYear 闰年判断，修复 _randBday 生日随机范围
    status: pending
  - id: real-calendar-callers
    content: 同步日历调用方：更新 pools/_utils.js 内联30天公式替换为真实累计数组、state.js 的 todayHoliday 确认兼容、romance.js 纪念日确认无需改动
    status: pending
    dependencies:
      - real-calendar-core
  - id: fix-visit-confirm
    content: 修复探班确认框：ui.js 第1105行 showActionInfoModal 从3参数回调改为4参数 Promise 链调用
    status: pending
  - id: svt-birthday-data
    content: 补全 SEVENTEEN 队友生日数据：svt-teammate-profiles.js 中 13 人各新增 birthMonth/birthDay 字段，填入真实生日数字
    status: pending
  - id: svt-birthday-prompt
    content: 实现生日注入 prompt：state.js 新增 svtBirthdayInfo 导出函数，prompts.js 第222行后追加队友生日检测和13人完整生日表注入
    status: pending
    dependencies:
      - svt-birthday-data
  - id: chat-contextual-presets
    content: 实现上下文相关快捷回复：chat-male-lead.js 新增 getMaleLeadPresetsForChat，ui.js 新增 getContextualPresets 和 rankPresetsByContext
    status: pending
  - id: chat-render-verify
    content: 全链路验证：确认四个修复效果——日历输出真实日期、聊天快捷回复关联消息、探班确认弹窗按钮文字正常、队友生日 prompt 正确注入
    status: pending
    dependencies:
      - chat-contextual-presets
      - fix-visit-confirm
      - real-calendar-callers
      - svt-birthday-prompt
---

## 需求概述

修复 entSim（娱乐圈模拟器）模式的四个核心 bug：

### Bug 1：二月出现30号

当前日期系统使用"每月固定30天"简化模型，`formatGameDate()` 可输出"2月30日""4月31日"等无效日期，严重破坏沉浸感。根因：`gameMonthOf(dayCount)` 用 `Math.floor(((dayCount-1)%365)/30)+1`。需替换为真实月份天数数组 + 闰年判断，确保所有输出日期均为真实存在的日期。

### Bug 2：聊天快捷回复与消息内容不对应

entSim 手机聊天中，快捷回复按钮显示的是基于好感度阶段的固定通用短语（如"嗯""知道了""好的"），与对方刚发来的消息内容（如"今天训练狠吗？"）完全无关。男主频道 presets 来源（阶段池通用短语）与 `findChatPoolReply` 匹配源（CHAT_MALE_LEAD 池的完整句子 q 字段）是两套不同数据，精确匹配几乎永远失败，兜底为空洞的"嗯。"。

### Bug 3：探班确认框参数传错

`ui.js` 第1105行调用 `showActionInfoModal(title, htmlBody, callback)` 传了3个参数，但函数签名是 `(title, htmlBody, confirmText, cancelText)`，第三个参数被当作按钮文字，函数对象被转成源码字符串显示在确认按钮上。确认弹窗的确认按钮显示垃圾文本，且回调永远不会被调用。

### Bug 4：SEVENTEEN队友生日无数据，AI编造日期与游戏日历不符

`birthdayInfo()` 只追踪4个核心角色（女主/哥哥/男主/情敌）生日。`svt-teammate-profiles.js` 中 13 人只有 `birthYear` 没有月日（如崔韩率 Vernon 真实生日是 2月18日，但数据中缺失）。AI 自己编造队友生日日期必然对不上游戏日历。用户建议"日期用代码计算后输出给 AI"——程序判断当天是否某队友生日，注入 prompt 明确告知 AI，同时提供 13 人完整生日表供 AI 参考。

## 技术方案

### Bug 1：真实日历系统替换

**策略**：保持 `dayCount` 作为标准时间计数器不变（保存/加载、章节跳跃、冷却计时等数十处引用），仅重写日期解读函数。

**核心改动**：

1. **state.js 263-284行** — 重写 `gameDayOf`/`gameMonthOf`：

- 新增 `DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31]`
- 新增 `_isLeapYear(year)` 返回 `year % 4 === 0`
- `gameMonthOf` 用累计天数逐月查找（闰年2月29天）；`gameDayOf` 用累积剩余计算
- `gameSeasonOf()` 沿用 `gameMonthOf()` 结果，无需修改
- `formatGameDate()` / `formatTraineeDate()` 自动受益

2. **state.js 363-376行** — `todayHoliday()`：万圣节条件 `d<=31` 在真实10月（31天）下自然适用，无需改动

3. **state.js 148-155行** — `_randBday()` 改为 `Math.floor(Math.random() * DAYS_IN_MONTH[m-1]) + 1`

4. **pools/_utils.js 110-138行** — 内联的30天公式需同步替换为内联真实日历逻辑。`_checkSingle` 中：

- 季节过滤（114-116行）：内联月份计算改用真实累计数组
- 月份过滤（122-124行）：同上
- 生日过滤（132-134行）：同上，`birthday=heroine|brother|ml|rival` 匹配不变

5. **romance.js 345-358行** — 纪念日 `(today - m[key]) % 30 === 0` 保持不变（纪念日关心"过了多少天"而非"到了几月几号"）

**向后兼容**：旧存档 dayCount 不变，重新解读后同一 dayCount 偏差最多1-2天，季节、月份不变，节日触发不受影响。

---

### Bug 2：上下文相关的聊天快捷回复

**分频道策略**：

- **男主频道**：presets 从 `CHAT_MALE_LEAD` 池的 `q` 字段提取（按好感度门槛过滤 + 关键词匹配排序），与 `findChatPoolReply` 数据源保持完全一致
- **哥哥/情敌频道**：阶段池 presets 按最后一条 AI 消息的关键词相关性排序取 top 3

**核心改动**：

1. **pools/chat-male-lead.js** — 新增导出函数 `getMaleLeadPresetsForChat(affection, lastMsg)`：

- 遍历 `CHAT_MALE_LEAD` 所有子池（trainee/greet/stage/worry/romantic/jealous/night/secret等），收集 `aff <= affection` 条目中的 `q` 值
- 对 `lastMsg` 做简单中文分词（按常见标点和空格切分），统计每个候选 q 与消息的重叠词数
- 按重叠词数降序取 top 3，返回 `[{q: '...', t: '...'}]` 格式

2. **ui.js** — 新增 `getContextualPresets(ch, lastMsg)` 函数：

- `ch === 'maleLead'` → 调用 `getMaleLeadPresetsForChat(affection, lastMsg)`
- 其他频道 → 调用 `rankPresetsByContext(rawPresets, lastMsg)`

3. **ui.js** — 新增 `rankPresetsByContext(raw, lastMsg)` 函数：

- 对阶段池 presets 数组做关键词重叠度评分
- 按分数降序取 top 3；无重叠时随机取 3 个

4. **ui.js 1885-1893行** — `renderPhoneChatMsgs` 中替换 presets 生成逻辑：

```
var ctxPresets = getContextualPresets(ch, lastMsg ? lastMsg.content : '');
presets = ctxPresets;
```

5. **兼容性**：`updateQuickReplies` 通过 `p.q` 存储 replyKey，`__quickReply` 中 `findChatPoolReply(q)` 现在能匹配到来自 CHAT_MALE_LEAD 同源的 q 字符串，匹配断裂消除

---

### Bug 3：探班确认框参数修复

**ui.js 1105-1112行** — 将3参数回调调用改为4参数 Promise 链调用：

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

`showActionInfoModal` 返回 `Promise<boolean>`，确认按钮文字正常显示为"确定"/"取消"，点击确认后正确触发后续流程。

---

### Bug 4：SEVENTEEN队友生日数据 + Prompt 注入

**1. svt-teammate-profiles.js** — 补全13人生日月日字段：
每条记录新增 `birthMonth`（1-12，数字）和 `birthDay`（1-31，数字）。真实数据：

- scoups: 8,8 | jeonghan: 10,4 | joshua: 12,30 | jun: 6,10 | hoshi: 6,15 | wonwoo: 7,17
- woozi: 11,22 | dk: 2,18 | mingyu: 4,6 | the8: 11,7 | seungkwan: 1,16 | vernon: 2,18 | dino: 2,11

**2. state.js** — 新增导出函数 `svtBirthdayInfo(dayCount, profiles)`：

- 用 `gameMonthOf(dayCount)` / `gameDayOf(dayCount)` 计算今天月日
- 遍历 profiles 找出 `birthMonth === m && birthDay === d` 的成员
- 返回 `{ todayBirthdays: [{name, stageName, birthMonth, birthDay}], allProfiles }`（含完整13人生日表供AI参考）

**3. prompts.js 第7行** — import 新增 `svtBirthdayInfo`：

```
import { ..., svtBirthdayInfo } from './state.js';
```

**4. prompts.js 第222行后** — 追加 svtBirthdayInfo 注入逻辑（放在 `birthdayInfo` 判断之后、`todayHoliday` 之前）：

- 第222行后插入调用：`var svtBday = svtBirthdayInfo(E.cycle.dayCount || 1, SVT_TEAMMATE_PROFILES);`
- 若有寿星：注入 `【SEVENTEEN成员生日】今天过生日的成员：XX(YY月ZZ日)。如果剧情涉及该成员，必须围绕生日场景展开，不要忽略今天是ta的生日。`
- 无论有无寿星，追加完整生日表：`【SEVENTEEN 13人完整生日参考】scoups崔胜澈8月8日 | jeonghan尹净汉10月4日 | ... | dino李灿2月11日。在涉及SEVENTEEN成员生日话题时，请严格参照此表，不要自编日期。`

**5. prompts.js 第15行附近的 pools import** — 确保 `SVT_TEAMMATE_PROFILES` 可用：
当前 prompts.js 已从 `./pools/index.js` 导入多项，需在 import 列表中添加 `SVT_TEAMMATE_PROFILES`。

---

### 不修改的部分

- `chat-modal.js`（1v1模式使用 AI 实时生成，无快捷回复问题）
- 阶段池数据文件（13人×3角色×4阶段=156个阶段池，presets 结构保持不变）
- `CHAT_MALE_LEAD` 数据条目结构（q/r/aff 结构保持不变，仅新增提取函数）
- `dayCount` 初始化、保存、加载逻辑
- `calendar-events.js` 中 `birthday=heroine|brother|ml|rival` 的4角色生日事件（不扩展，队友生日通过 prompt 注入而非事件池触发）