---
name: entSim-chat-init-and-ui-fixes
overview: 修复娱乐圈模拟器9个问题：男主聊天"..."、练习生期泡泡隐藏、探班弹窗暗色主题、记忆回顾高度、哥哥/情敌预设回复、日期显示日历日期、亲密图标去🔒、好感度单日上限+防双重结算、全局滚动条深紫色统一风格。
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
    content: 修复亲密图标去锁：intimacyIcons未解锁项去掉锁和"—"，仅靠opacity区分
    status: pending
  - id: fix-affection-cap
    content: 修复好感度涨速：romance.js加_affDayTotal单日上限8、engine.js防双重结算、prompts.js强化±1-3约束
    status: pending
  - id: fix-scrollbar
    content: 修复全局滚动条暗色统一：style.css末尾加::-webkit-scrollbar深紫色规则（等指令执行）
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
      - fix-scrollbar
---

## 用户需求

新开档测试发现9个问题，全部在娱乐圈模拟器中：

1. **男主聊天只显示"..."**：手机打开男主频道，初始消息内容全是"..."，无法正常对话。
2. **练习生期不应有泡泡**：练习生未出道却有泡泡App图标和订阅数，应像信箱/奖项一样加出道门控。
3. **探班弹窗样式不一致**：3选1弹窗是浅色主题（粉色/米白），与暗紫色entSim主题不统一。
4. **记忆回顾弹窗太小**：高度不够，文字挤在一起，应接近手机屏幕高度。
5. **哥哥/情敌初始无预设回复**：首次打开频道只有对方消息，下方没有快捷回复按钮。
6. **日期显示**：Header和Center对练习生显示"练习第80天"，应显示日历日期以体现节日/生日。
7. **亲密图标锁排版难看**：未解锁项显示锁和"—"，应仅靠opacity区分。
8. **好感度涨太快**：缺少每日上限且存在双重结算，AI不守±1-3规则。
9. **滚动条样式不统一**：仅局部有暗色滚动条，其余区域用浏览器默认浅灰。用户要求等指令再改此项。

## 产品概述

对娱乐圈模拟器（entSim）进行9项集中修复，覆盖聊天初始化、UI门控、弹窗样式、日期显示、亲密面板、好感度数值和滚动条样式。

## 核心功能

- 男主聊天频道正常显示初始消息
- 练习生期隐藏泡泡App图标和入口
- 探班弹窗改为暗紫色主题
- 记忆回顾弹窗高度增大接近手机屏幕
- 哥哥/情敌频道首次打开显示预设快捷回复
- 练习生期显示日历日期
- 恋情面板亲密图标仅靠opacity区分解锁状态
- 单日好感增幅上限8点，消除双重结算
- 全局滚动条统一深紫色暗色风格（等指令执行）

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+
- 构建工具：Vite 5.4
- 修改文件：ui.js、romance.js、engine.js、prompts.js、visit-choice-modal.js、style.css

## 实现方案

### Fix1：男主聊天"..." (ui.js:2719-2724)

在映射函数中检测 `m.r` 数组，`randInt` 随机取一条回复；无 `r` 时 fallback 到 `m.msg || m.t || '...'`。

### Fix2：练习生期泡泡隐藏 (ui.js:1531 + 1657-1658)

A. `__phoneOpenApp` 加 `if (app === 'bubble' && !isD) { showToast(...); return; }`
B. 手机桌面泡泡图标用三元判断 `isDebut` 决定是否渲染。

### Fix3：探班弹窗暗色主题 (visit-choice-modal.js + style.css:2190-2273)

overlay class 改为 `es-modal-overlay`，inner 包 `es-modal`；CSS 中 vc-* 改为暗紫色配色。

### Fix4：记忆回顾弹窗高度 (ui.js:1203-1204)

es-modal 加 `style="max-height:96vh;padding:14px 18px"`。

### Fix5：哥哥/情敌初始预设回复 (ui.js:2712-2715末尾)

brother/rival 分支推消息后设 `_entSimPendingChat[ch] = { reply: entry.reply, entryIdx: 0 }`。

### Fix6：练习生日期显示 (ui.js:218 + 378)

Header 和 Center 两处 `formatTraineeDate` 替换为 `formatGameDate`。

### Fix7：亲密图标去锁 (ui.js:499-505)

所有变量去掉锁和"—"后缀，仅靠 opacity 区分。

### Fix8：好感度涨速控制 (romance.js + engine.js + prompts.js)

A. romance.js — `applyEntSimAffection` 加 `_affDayTotal` 单日上限8点（正向裁剪，负面不限）
B. engine.js — `applySideEffects` 中若 `romanceBeat.affectionDelta` 存在则跳过顶层 `affectionDelta`
C. prompts.js — 强化措辞"增幅严格限制 ±1-3，每日硬上限8点"

### Fix9：全局滚动条暗色统一 (style.css)

在 style.css 属性选择器区域末尾加全局规则：

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(124,111,240,.25); border-radius: 8px; }
::-webkit-scrollbar-thumb:hover { background: rgba(124,111,240,.45); }
```

此项等待用户指令后再执行。

## 文件修改清单

| 文件 | 位置 | 修改内容 |
| --- | --- | --- |
| src/ent-sim/ui.js | 2719-2724 | Fix1+Fix5：映射加r数组检测；brother/rival设pending |
| src/ent-sim/ui.js | 1531 | Fix2B：泡泡图标条件渲染 |
| src/ent-sim/ui.js | 1657-1658 | Fix2A：bubble出道门控 |
| src/ent-sim/ui.js | 1203-1204 | Fix4：max-height:96vh |
| src/ent-sim/ui.js | 218 | Fix6a：Header日期 |
| src/ent-sim/ui.js | 378 | Fix6b：Center日期 |
| src/ent-sim/ui.js | 499-505 | Fix7：去锁去"—" |
| src/ent-sim/romance.js | 46-51 | Fix8A：单日上限8 |
| src/ent-sim/engine.js | 200-208 | Fix8B：防双重结算 |
| src/ent-sim/prompts.js | 86 | Fix8C：强化±1-3约束 |
| src/modals/visit-choice-modal.js | 10-31 | Fix3：es-modal-overlay |
| src/style.css | 2190-2273 | Fix3：vc-*暗紫色 |
| src/style.css | 末尾 | Fix9：全局滚动条暗色（等指令） |