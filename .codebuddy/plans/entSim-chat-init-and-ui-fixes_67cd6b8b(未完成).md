---
name: entSim-chat-init-and-ui-fixes
overview: 修复娱乐圈模拟器7个问题：男主聊天"..."、练习生期泡泡隐藏、探班弹窗暗色主题、记忆回顾高度、哥哥/情敌预设回复、日期显示日历日期、亲密图标去🔒。
todos:
  - id: fix-malelead-chat
    content: 修复男主聊天"..."：initChatChannel映射检测m.r数组随机取回复，fallback到msg/t
    status: pending
  - id: fix-bubble-gate
    content: 修复练习生期泡泡门控：__phoneOpenApp加bubble出道检查，桌面泡泡图标条件渲染
    status: pending
  - id: fix-visit-theme
    content: 修复探班弹窗暗色主题：visit-choice-modal.js改es-modal-overlay+es-modal，style.css中vc-*改暗紫色配色
    status: pending
  - id: fix-memory-height
    content: 修复记忆回顾弹窗高度：onMemoryLog的es-modal加max-height:96vh;padding:14px 18px
    status: pending
  - id: fix-pending-reply
    content: 修复哥哥/情敌初始预设回复：initChatChannel中brother/rival分支末尾设_entSimPendingChat
    status: pending
  - id: fix-trainee-date
    content: 修复练习生日期显示：Header和Center的formatTraineeDate改为formatGameDate
    status: pending
  - id: fix-intimacy-icons
    content: 修复亲密图标去🔒：intimacyIcons未解锁项去掉🔒和"—"，仅靠opacity区分
    status: pending
  - id: build-verify
    content: 构建验证并push
    status: pending
    dependencies:
      - fix-malelead-chat
      - fix-bubble-gate
      - fix-visit-theme
      - fix-memory-height
      - fix-pending-reply
      - fix-trainee-date
      - fix-intimacy-icons
---

## 用户需求

新开档测试发现7个问题，全部在娱乐圈模拟器中：

1. **男主聊天只显示"..."**：手机打开男主频道，初始消息内容全是"..."，无法正常对话。
2. **练习生期不应有泡泡**：练习生未出道却有泡泡App图标和订阅数，应像信箱/奖项一样加出道门控。
3. **探班弹窗样式不一致**：3选1弹窗是浅色主题（粉色/米白），与暗紫色entSim主题不统一。
4. **记忆回顾弹窗太小**：高度不够，文字挤在一起，应接近手机屏幕高度。
5. **哥哥/情敌初始无预设回复**：首次打开频道只有对方消息，下方没有快捷回复按钮。
6. **日期显示**：Header和Center对练习生显示"练习第80天"，应显示日历日期（2024年X月X日）以体现节日/生日。
7. **亲密图标🔒排版难看**：未解锁项显示"🛏️ 🔒""🏠 🔒"带锁和"—"，应仅靠opacity（0.3-0.4/0.9）区分，去掉🔒和"—"。

## 技术方案

所有修复集中在3个文件：`src/ent-sim/ui.js`、`src/modals/visit-choice-modal.js`、`src/style.css`。不涉及新文件、新依赖或新架构。

### Fix1：男主聊天"..."（ui.js:2719-2721）

**根因**：`initChatChannel`映射池子条目时统一读`m.msg || m.t || '...'`，但`CHAT_MALE_LEAD`池子格式是`{q, r: [...], aff}`，没有`msg`/`t`字段。
**修复**：在映射函数中检测`m.r`数组，随机取一条回复；无`r`时fallback到`m.msg`/`m.t`/`'...'`。

### Fix2：练习生期泡泡隐藏（ui.js:1657-1658 + 1531）

**根因**：`__phoneOpenApp`对letters/awards有`isDebut`门控但bubble漏了；桌面泡泡图标无条件渲染。
**修复A**：在`__phoneOpenApp`中加`if (app === 'bubble' && !isD) { showToast(...); return; }`
**修复B**：手机桌面HTML生成时判断`isDebut`，非出道则跳过泡泡图标。

### Fix3：探班弹窗暗色主题（visit-choice-modal.js + style.css:2190-2273）

**根因**：`visit-choice-modal.js`使用`modal-overlay`+`vc-*`浅色CSS，与其他entSim弹窗的`es-modal-overlay`+`es-modal`暗紫色不一致。
**修复**：overlay改为`es-modal-overlay`，inner用`es-modal`包裹；`vc-*`CSS改为暗色配色（`#241d3d`背景、`rgba(124,111,240,.3)`边框等）；`vc-cancel`改为`es-modal-btn`风格。

### Fix4：记忆回顾弹窗高度（ui.js:1203-1204）

**根因**：`es-modal`默认`max-height:88vh`对多条textarea不足。
**修复**：记忆回顾的es-modal加内联`style="max-height:96vh;padding:14px 18px"`。

### Fix5：哥哥/情敌初始预设回复（ui.js:2712-2715末尾）

**根因**：`initChatChannel`为brother/rival推消息后未设`_entSimPendingChat`，`renderPhoneChatMsgs`依赖pending渲染快捷回复按钮。
**修复**：brother/rival分支末尾设置`GS._entSimPendingChat[ch] = { reply: entry.reply || entry.msg, entryIdx: 0 }`。

### Fix6：练习生日期显示（ui.js:218 + 378）

**根因**：Header和Center对`!isDebut`使用`formatTraineeDate(dayCount)`返回"练习第80天"。
**修复**：两处都改为始终使用`formatGameDate(dayCount)`显示日历日期（如"2024年3月20日"）。

### Fix7：亲密图标去🔒（ui.js:499-505）

**根因**：`intimacyIcons()`未解锁项显示`'🛏️ 🔒'`、`'🤝 —'`等，排版杂乱。
**修复**：所有未解锁项只显示图标本身（如`'🛏️'`、`'🤝'`），去掉🔒和"—"后缀，仅靠opacity（0.3-0.4未解锁/0.9已解锁）区分状态。

## 文件修改清单

| 文件 | 行号 | 修改内容 |
| --- | --- | --- |
| `src/ent-sim/ui.js` | 2719-2724 | Fix1+Fix5：映射加r数组检测；brother/rival设pending |
| `src/ent-sim/ui.js` | 1531 | Fix2B：泡泡桌面图标条件渲染 |
| `src/ent-sim/ui.js` | 1657-1658 | Fix2A：__phoneOpenApp加bubble出道门控 |
| `src/ent-sim/ui.js` | 1203-1204 | Fix4：es-modal加style="max-height:96vh;..." |
| `src/ent-sim/ui.js` | 218 | Fix6a：Header formatTraineeDate → formatGameDate |
| `src/ent-sim/ui.js` | 378 | Fix6b：Center formatTraineeDate → formatGameDate |
| `src/ent-sim/ui.js` | 499-505 | Fix7：intimacyIcons去掉🔒和"—" |
| `src/modals/visit-choice-modal.js` | 10-31 | Fix3：DOM改为es-modal-overlay+es-modal |
| `src/style.css` | 2190-2273 | Fix3：vc-*改为暗紫色配色 |


## 不影响范围

- 不改变换乘恋爱模式的任何代码
- 不影响已出道职业的泡泡功能
- 不影响其他弹窗的es-modal样式
- 不修改数据池子文件格式