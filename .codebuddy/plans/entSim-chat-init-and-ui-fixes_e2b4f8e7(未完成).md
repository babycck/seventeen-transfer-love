---
name: entSim-chat-init-and-ui-fixes
overview: 修复娱乐圈模拟器4个UI/数据问题：男主聊天"..."、练习生期泡泡应隐藏、探班弹窗样式统一、记忆回顾弹窗加大高度。
todos:
  - id: fix-malelead-chat
    content: 修复ui.js initChatChannel中男主聊天"..."：映射时检测m.r数组随机取一条回复，fallback到msg/t
    status: pending
  - id: fix-bubble-gate
    content: 修复练习生期泡泡门控：__phoneOpenApp加bubble出道检查，手机桌面泡泡图标条件渲染
    status: pending
  - id: fix-visit-theme
    content: 修复探班弹窗暗色主题：visit-choice-modal.js改为es-modal-overlay+暗色样式，style.css中vc-*改为暗紫色配色
    status: pending
  - id: fix-memory-height
    content: 修复记忆回顾弹窗高度：onMemoryLog的es-modal加style="max-height:96vh;padding:14px 18px"
    status: pending
  - id: fix-pending-reply
    content: 修复哥哥/情敌初始预设回复：initChatChannel中brother/rival分支末尾设置_entSimPendingChat
    status: pending
  - id: build-verify
    content: 构建验证并push到远程仓库
    status: pending
    dependencies:
      - fix-malelead-chat
      - fix-bubble-gate
      - fix-visit-theme
      - fix-memory-height
      - fix-pending-reply
---

## 用户需求

新开档后测试发现5个问题，全部在娱乐圈模拟器中：

1. **男主聊天只显示"..."**：手机中打开男主聊天频道，两条初始消息内容都是"..."，无法正常对话。
2. **练习生期不应有泡泡**：职业是"练习生"（未出道），但泡泡App图标可见且可打开，泡泡订阅数也显示了。练习生没有粉丝社区，应像信箱/奖项一样加出道门控。
3. **探班弹窗样式不一致**：点击探班弹出的3选1弹窗是浅色主题（粉色/米白），与整个娱乐圈模拟器的暗紫色主题不统一。
4. **记忆回顾弹窗太小**：打开记忆回顾时弹窗高度不够，文字挤在一起，应该接近手机屏幕高度。
5. **哥哥/情敌初始无预设回复按钮**：首次打开哥哥或情敌频道时，只有对方的主动消息，下方没有快捷回复选项。

## 技术方案

### 整体策略

所有修复集中在3个文件：`src/ent-sim/ui.js`（核心逻辑）、`src/modals/visit-choice-modal.js`（弹窗DOM）、`src/style.css`（样式）。不涉及新文件、新依赖或新架构。

### Fix1：男主聊天"..."——池子格式适配

**根因：** `initChatChannel`（`ui.js:2719-2721`）统一用 `m.msg || m.t || '...'` 取消息内容。brother/rival池子格式是 `{from, msg, reply}`，有`msg`字段；但maleLead池子（`chat-male-lead.js`）格式是 `{q, r: [replyArray], aff}`，没有`msg`/`t`，导致回退到`'...'`。

**修复：** 在映射函数中增加对 `m.r` 数组的检测：

```js
var content = '';
if (Array.isArray(m.r) && m.r.length) {
  content = m.r[randInt(0, m.r.length - 1)];
} else {
  content = m.msg || m.t || '...';
}
return { role: isFromPlayer ? 'user' : 'ai', content: resolveChatTemplates(content) };
```

### Fix2：练习生期泡泡隐藏

**根因：** `__phoneOpenApp`（`ui.js:1657-1658`）对letters/awards有出道检查，但bubble漏了。手机桌面（`ui.js:1531`）也无条件渲染泡泡图标。

**修复A（函数层门控）：** 在 `__phoneOpenApp` 中 letters/awards 门控旁边加一行：

```js
if (app === 'bubble' && !isD) { showToast('出道后才解锁泡泡功能'); return; }
```

**修复B（UI层隐藏）：** 将手机桌面泡泡图标的静态HTML改为条件拼接——在渲染手机HTML时判断 `isDebut`，非出道则跳过泡泡图标渲染行。

### Fix3：探班弹窗暗色主题统一

**根因：** `visit-choice-modal.js` 使用 `modal-overlay` 类 + 自定义 `vc-*` 样式，配色为浅色（`#3d2c2c`文字、`#e0c0c0`边框、粉色hover等），与entSim其他弹窗的 `es-modal-overlay` + `es-modal` 暗紫色主题不一致。

**修复：** 将弹窗DOM改为entSim统一风格：

- overlay用 `es-modal-overlay` 替代 `modal-overlay`
- inner用 `es-modal` 包裹内容，`vc-content` 类移除
- 卡片保留 `vc-card` 类但CSS改为暗色配色（`#241d3d`背景、`rgba(124,111,240,.3)`边框等）
- `vc-cancel` 按钮改为 `es-modal-btn` 风格

### Fix4：记忆回顾弹窗高度增大

**根因：** `onMemoryLog`（`ui.js:1202-1204`）使用 `es-modal` 类，其 `max-height: 88vh`（`style.css:2432`）对包含多条textarea的记忆回顾来说空间不足。

**修复：** 在 `onMemoryLog` 创建的 `.es-modal` div 上加内联样式覆盖：`style="max-height:96vh;padding:14px 18px"`，增加8vh高度并减少padding腾出更多内容空间。

### Fix5：哥哥/情敌初始无预设回复

**根因：** `initChatChannel`（`ui.js:2712-2715`）为brother/rival取1条对方消息推入历史，但没有设置 `_entSimPendingChat`。而 `renderPhoneChatMsgs`（`ui.js:1841-1846`）依赖 `GS._entSimPendingChat[ch]` 来渲染快捷回复按钮。

**修复：** 在 `initChatChannel` 的brother/rival分支末尾，设置pending：

```js
if ((ch === 'brother' || ch === 'rival') && initEntries.length > 0) {
  if (!GS._entSimPendingChat) GS._entSimPendingChat = {};
  var entry = initEntries[0];
  GS._entSimPendingChat[ch] = { reply: entry.reply || entry.msg || '', entryIdx: 0 };
}
```

### 文件修改清单

| 文件 | 修改内容 |
| --- | --- |
| `src/ent-sim/ui.js:2719-2724` | Fix1+Fix5：映射函数增加r数组检测；brother/rival设pending |
| `src/ent-sim/ui.js:1531` | Fix2B：泡泡图标加isDebut条件渲染 |
| `src/ent-sim/ui.js:1657-1658` | Fix2A：__phoneOpenApp加bubble出道门控 |
| `src/ent-sim/ui.js:1203-1204` | Fix4：es-modal加style内联max-height:96vh |
| `src/modals/visit-choice-modal.js:10-13` | Fix3：overlay改为es-modal-overlay，inner包es-modal |
| `src/style.css:2190-2273` | Fix3：vc-*样式改为暗紫色配色 |


### 不影响范围

- 不改变换乘恋爱模式的任何代码
- 不影响已出道职业的泡泡功能
- 不影响其他弹窗的es-modal样式
- 不修改数据池子文件格式