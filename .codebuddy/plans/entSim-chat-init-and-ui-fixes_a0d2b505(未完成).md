---
name: entSim-chat-init-and-ui-fixes
overview: 修复娱乐圈模拟器8个问题：男主聊天"..."、练习生期泡泡隐藏、探班弹窗暗色主题、记忆回顾高度、哥哥/情敌预设回复、日期显示日历日期、亲密图标去🔒、好感度单日上限+防双重结算。
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
  - id: fix-affection-cap
    content: 修复好感度涨速：romance.js加_affDayTotal单日上限8、engine.js防双重结算、prompts.js强化±1-3约束
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
      - fix-affection-cap
---

## 用户需求

新开档测试发现8个问题，全部在娱乐圈模拟器中：

1. **男主聊天只显示"..."**：手机打开男主频道，初始消息内容全是"..."，无法正常对话。
2. **练习生期不应有泡泡**：练习生未出道却有泡泡App图标和订阅数，应像信箱/奖项一样加出道门控。
3. **探班弹窗样式不一致**：3选1弹窗是浅色主题（粉色/米白），与暗紫色entSim主题不统一。
4. **记忆回顾弹窗太小**：高度不够，文字挤在一起，应接近手机屏幕高度。
5. **哥哥/情敌初始无预设回复**：首次打开频道只有对方消息，下方没有快捷回复按钮。
6. **日期显示**：Header和Center对练习生显示"练习第80天"，应显示日历日期（如2024年3月20日）以体现节日/生日。
7. **亲密图标🔒排版难看**：未解锁项显示"🛏️ 🔒"带锁和"—"，应仅靠opacity区分，去掉🔒。
8. **好感度涨太快**：一天内能从0冲到接近100，缺少每日上限且存在双重结算。

## 产品概述

对娱乐圈模拟器（entSim）进行8项集中修复，覆盖聊天初始化、UI门控、弹窗样式统一、日期显示、亲密面板和好感度数值平衡。

## 核心功能

- 男主聊天频道正常显示初始消息（不再"..."）
- 练习生期隐藏泡泡App图标和入口
- 探班弹窗改为暗紫色主题与整体一致
- 记忆回顾弹窗高度增大接近手机屏幕
- 哥哥/情敌频道首次打开显示预设快捷回复
- 练习生期显示日历日期而非"练习第N天"
- 恋情面板亲密图标仅靠opacity区分解锁状态
- 单日好感增幅上限8点，消除双重结算

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+
- 构建工具：Vite 5.4
- 修改范围：`src/ent-sim/ui.js`、`src/ent-sim/romance.js`、`src/ent-sim/engine.js`、`src/ent-sim/prompts.js`、`src/modals/visit-choice-modal.js`、`src/style.css`

## 实现方案

### Fix1：男主聊天"..." — 池子格式适配 (ui.js:2719-2724)

**根因**：`initChatChannel` 映射池子条目时读 `m.msg || m.t || '...'`，但 `CHAT_MALE_LEAD` 格式是 `{q, r: [...], aff}`，没有 `msg`/`t`。

**修复**：在映射函数中检测 `m.r` 数组存在时，用 `randInt` 随机取一条回复 `m.r[randInt(0, m.r.length - 1)]`；无 `r` 时 fallback 到 `m.msg || m.t || '...'`。

### Fix2：练习生期泡泡隐藏 (ui.js:1531 + 1657-1658)

**修复A**：`__phoneOpenApp` 中 letters/awards 门控旁加一行：

```js
if (app === 'bubble' && !isD) { showToast('出道后才解锁泡泡功能'); return; }
```

**修复B**：手机桌面HTML生成时（`renderPhone` 中），泡泡图标用三元判断 `isDebut` 决定是否渲染该行。

### Fix3：探班弹窗暗色主题 (visit-choice-modal.js:10-31 + style.css:2190-2273)

**修复**：overlay class 从 `modal-overlay` 改为 `es-modal-overlay`；inner div 包一层 `es-modal`；CSS 中 `vc-*` 全部改为暗紫色配色：背景 `#241d3d`、边框 `rgba(124,111,240,.3)`、文字 `#e6e1f5`；`vc-cancel` 参照 `es-modal-btn`。

### Fix4：记忆回顾弹窗高度 (ui.js:1203-1204)

**修复**：`onMemoryLog` 创建的 `.es-modal` div 加 `style="max-height:96vh;padding:14px 18px"`。

### Fix5：哥哥/情敌初始预设回复 (ui.js:2712-2715末尾)

**修复**：`initChatChannel` 中 brother/rival 分支，推入消息后设置：

```js
if (!GS._entSimPendingChat) GS._entSimPendingChat = {};
GS._entSimPendingChat[ch] = { reply: entry.reply || entry.msg || '', entryIdx: 0 };
```

其中 `entry` 为选中的原始池子条目（保留 `reply` 字段引用）。

### Fix6：练习生日期显示 (ui.js:218 + 378)

**修复**：Header（`renderHeader` 行218）和 Center（`renderCenter` 行378）两处，将 `formatTraineeDate(E.cycle.dayCount)` 替换为 `formatGameDate(E.cycle.dayCount)`，练习生期也显示日历日期。

### Fix7：亲密图标去🔒 (ui.js:499-505)

**修复**：`intimacyIcons()` 中，所有变量从 `un.xxx ? '🤝' : '🤝 —'` 或 `'🛏️' : '🛏️ 🔒'` 统一改为 `un.xxx ? '图标' : '图标'`（不带后缀）。opacity（0.3-0.4未解锁/0.9已解锁）已是唯一区分手段。

### Fix8：好感度涨速控制 (romance.js + engine.js + prompts.js)

**三层修复**：

**A. romance.js:46 `applyEntSimAffection` — 单日上限8点**：

- 函数开头增加日重置逻辑：`var today = E.cycle._gameDayCount || 1; if (E._affDay !== today) { E._affDay = today; E._affDayTotal = 0; }`
- 在 `E.affection = Math.max(...)` 之前，对正向 delta 做裁剪：`if (delta > 0 && E._affDayTotal >= 8) delta = 0; else if (delta > 0) delta = Math.min(delta, 8 - E._affDayTotal);`
- 负面 delta（吵架/冷战/拒绝）不限制，允许自由下降。
- 应用后更新累计：`E._affDayTotal = (E._affDayTotal || 0) + delta;`

**B. engine.js:200-209 `applySideEffects` — 防双重结算**：

- 在应用 `extras.affectionDelta` 之前，检查 `extras.romanceBeat && typeof extras.romanceBeat.affectionDelta === 'number'` 是否为真。
- 若 `romanceBeat.affectionDelta` 已存在，则跳过顶层的 `extras.affectionDelta`（`recordRomanceBeat` 会自行调用 `applyEntSimAffection` 处理 romanceBeat 的 delta）。
- 仅在 `romanceBeat` 不存在或其无 `affectionDelta` 时，才应用顶层 `extras.affectionDelta`。

**C. prompts.js:86 — 强化AI约束措辞**：

- 原句："增幅 ±1-3"
- 改为："增幅严格限制在 ±1-3，单回合封顶3点，绝不超过。每日系统有硬上限 8 点，请勿让单回合增量过大——过快满好感会破坏慢热体验。"

## 文件修改清单

| 文件 | 位置 | 修改内容 |
| --- | --- | --- |
| `src/ent-sim/ui.js` | 2719-2724 | Fix1+Fix5：映射加r数组检测；brother/rival设_entSimPendingChat |
| `src/ent-sim/ui.js` | 1531附近 | Fix2B：renderPhone中泡泡图标改条件渲染(isDebut判断) |
| `src/ent-sim/ui.js` | 1657-1658 | Fix2A：__phoneOpenApp加bubble出道门控 |
| `src/ent-sim/ui.js` | 1203-1204 | Fix4：记忆回顾es-modal加max-height:96vh;padding:14px 18px |
| `src/ent-sim/ui.js` | 218 | Fix6a：Header formatTraineeDate → formatGameDate |
| `src/ent-sim/ui.js` | 378 | Fix6b：Center formatTraineeDate → formatGameDate |
| `src/ent-sim/ui.js` | 499-505 | Fix7：intimacyIcons去🔒和"—"，仅靠opacity |
| `src/ent-sim/romance.js` | 46-51 | Fix8A：applyEntSimAffection加_affDay/_affDayTotal单日上限8 |
| `src/ent-sim/engine.js` | 200-208 | Fix8B：applySideEffects防双重结算，romanceBeat有delta时跳顶层 |
| `src/ent-sim/prompts.js` | 86 | Fix8C：强化±1-3约束措辞 |
| `src/modals/visit-choice-modal.js` | 10-31 | Fix3：overlay→es-modal-overlay，inner包es-modal |
| `src/style.css` | 2190-2273 | Fix3：vc-*改为暗紫色配色 |


## 不影响范围

- 换乘恋爱模式代码不变
- 已出道职业泡泡功能不变
- 其他es-modal弹窗样式不变
- 数据池子文件格式不变