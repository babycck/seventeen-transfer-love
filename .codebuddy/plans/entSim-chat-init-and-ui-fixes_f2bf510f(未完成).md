---
name: entSim-chat-init-and-ui-fixes
overview: 修复娱乐圈模拟器12个问题：聊天、泡泡门控、探班主题、记忆高度、预设回复、日期显示、亲密图标、好感度上限、滚动条暗色、节日校验、日程地点+时段过渡、剧情连续性防AI遗忘。
todos:
  - id: fix-malelead-chat
    content: 修复男主聊天"..."：initChatChannel映射检测m.r数组随机取回复，fallback到msg/t
    status: pending
  - id: fix-bubble-gate
    content: 修复练习生期泡泡门控：__phoneOpenApp加bubble出道检查，桌面泡泡图标条件渲染
    status: pending
  - id: fix-visit-theme
    content: 修复探班弹窗暗色主题：visit-choice-modal.js改es-modal-overlay+es-modal，style.css中vc-*改暗紫色
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
    content: 修复好感度涨速：romance.js加_affDayTotal单日上限8、engine.js防双重结算、prompts.js强化约束
    status: pending
  - id: fix-festival-check
    content: 修复节日季节校验：prompts.js中无节日时注入反制规则，禁止AI编造Pepero Day等节日梗
    status: pending
  - id: fix-agenda-transition
    content: 修复日程地点+时段过渡：cycle.js给related补地点，engine.js时段分隔符改为带时段名标签
    status: pending
  - id: fix-continuity
    content: 修复剧情连续性防AI重置：prompts.js系统prompt末尾加强制连续性规则，禁止"第一次见面"等开倒车行为
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
      - fix-festival-check
      - fix-agenda-transition
      - fix-continuity
      - fix-scrollbar
---

## 用户需求

新开档测试发现12个问题，全部在娱乐圈模拟器（entSim）中：

1. **男主聊天只显示"..."**：手机打开男主频道，初始消息内容全是"..."，无法正常对话。
2. **练习生期不应有泡泡**：练习生未出道却有泡泡App图标和订阅数，应像信箱/奖项一样加出道门控。
3. **探班弹窗样式不一致**：3选1弹窗是浅色主题，与暗紫色entSim主题不统一。
4. **记忆回顾弹窗太小**：高度不够，文字挤在一起，应接近手机屏幕高度。
5. **哥哥/情敌初始无预设回复**：首次打开频道只有对方消息，下方没有快捷回复按钮。
6. **日期显示**：Header和Center对练习生显示"练习第80天"，应显示日历日期以体现节日/生日。
7. **亲密图标锁排版难看**：未解锁项显示锁和"—"，应仅靠opacity区分。
8. **好感度涨太快**：缺少每日上限且存在双重结算，AI不守±1-3规则。
9. **滚动条样式不统一**：仅局部有暗色滚动条，其余区域用浏览器默认浅灰。用户要求等指令再改此项。
10. **节日季节校验**：AI在3月场景写了"Pepero Day"(11月11日)。非节日日期需加反制规则禁止编造节日。
11. **日程地点补全+时段过渡**：related议程无地点，AI自由发挥编造场景；时段切换分隔符"── ▸ ──"太弱，场景跳跃感强。
12. **剧情连续性防AI重置人物关系**：同一段剧情中前面已和全圆佑发过多条短信、哥哥也提到圆佑打听女主近况，但切换日程后哥哥突然说"今天正式认识一下"重新介绍圆佑。AI拿到全文上下文但未被强调"已有互动不可重置"，按模板生成了"初次见面"流程。

## 产品概述

对娱乐圈模拟器进行12项集中修复，覆盖聊天初始化、UI门控、弹窗样式、日期显示、亲密面板、好感度数值、滚动条、节日校验、日程系统和剧情连续性。

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
- 非节日日期强制禁止AI编造节日梗
- 日程related地点补全，时段过渡标签增强
- 同一段剧情中已有互动不可遗忘或重置，禁止AI按模板生成"初次见面"

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+
- 构建工具：Vite 5.4
- 修改文件：src/ent-sim/ui.js、src/ent-sim/romance.js、src/ent-sim/engine.js、src/ent-sim/prompts.js、src/ent-sim/cycle.js、src/modals/visit-choice-modal.js、src/style.css

## 实现方案

### Fix1：男主聊天"..." (ui.js:2719-2721)

**根因**：initChatChannel映射池子条目时统一读m.msg || m.t || '...'，但CHAT_MALE_LEAD格式是{q, r: [...], aff}，没有msg/t字段。
**修复**：映射函数检测m.r数组存在时用m.r[randInt(0, m.r.length - 1)]，无r时fallback到m.msg || m.t || '...'。

### Fix2：练习生期泡泡隐藏 (ui.js:1657-1658 + 1531)

**修复A**：__phoneOpenApp中加bubble出道门控。
**修复B**：手机桌面泡泡图标用isDebut条件渲染。

### Fix3：探班弹窗暗色主题 (visit-choice-modal.js:10-31 + style.css:2190-2273)

**修复**：overlay改为es-modal-overlay，inner包es-modal；vc-* CSS改为暗紫色配色（背景#241d3d、边框rgba(124,111,240,.3)、文字#e6e1f5）。

### Fix4：记忆回顾弹窗高度 (ui.js:1203-1204)

**修复**：onMemoryLog创建的es-modal div加style="max-height:96vh;padding:14px 18px"。

### Fix5：哥哥/情敌初始预设回复 (ui.js:2712-2715末尾)

**修复**：brother/rival分支推入消息后设置_entSimPendingChat[ch] = { reply: entry.reply || entry.msg, entryIdx: 0 }。

### Fix6：练习生日期显示 (ui.js:218 + 378)

**修复**：Header和Center两处formatTraineeDate替换为formatGameDate。

### Fix7：亲密图标去锁 (ui.js:499-505)

**修复**：intimacyIcons()中所有变量去掉锁和"—"后缀，仅靠opacity区分。

### Fix8：好感度涨速控制 (romance.js + engine.js + prompts.js)

**A. romance.js:46** — applyEntSimAffection加每日重置与封顶：

- _affDayTotal单日正向上限8点，负面delta不限制
**B. engine.js:200-208** — applySideEffects防双重结算：romanceBeat有affectionDelta时跳过顶层
**C. prompts.js:86** — 强化AI约束"增幅严格限制±1-3，每日硬上限8点"

### Fix9：全局滚动条暗色统一 (style.css末尾，等指令)

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(124,111,240,.25); border-radius: 8px; }
::-webkit-scrollbar-thumb:hover { background: rgba(124,111,240,.45); }
```

### Fix10：节日季节校验 (prompts.js:213后)

**根因**：buildEntSimUserMessage仅在todayHoliday有匹配时注入节日提示，无节日时无约束。
**修复**：在if (holiday)后加else分支，注入反制规则禁止AI编造节日。

### Fix11A：日程related地点补全 (cycle.js:90-95)

**修复**：练习生related从['练习室','声乐教室','舞蹈室']随机选地点；出道后添加RELATED_POOL到地点的映射。

### Fix11B：时段过渡标签增强 (engine.js:120)

**修复**：branchLabel从"▸"改为getTimeOfDayLabel() + '·继续'，显示"上午·继续"等标签。

### Fix12：剧情连续性防AI重置 (prompts.js 系统prompt末尾)

**根因**：AI拿到全文上下文但system prompt无强制连续性规则，按模板生成了"第一次见面"。
**修复**：在系统prompt末尾追加强连续性规则——已发生的互动不可逆，角色记忆不重置，后续段落严禁写"第一次见面""今天正式认识一下"，直接延续已有关系的自然进展。

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
| src/ent-sim/engine.js | 120, 200-208 | Fix8B：防双重结算；Fix11B：时段标签 |
| src/ent-sim/prompts.js | 86, 213-214, 末尾 | Fix8C：强化约束；Fix10：反制节日；Fix12：连续性规则 |
| src/ent-sim/cycle.js | 88-100 | Fix11A：related地点补全 |
| src/modals/visit-choice-modal.js | 10-31 | Fix3：es-modal-overlay |
| src/style.css | 2190-2273 | Fix3：vc-*暗紫色 |
| src/style.css | 末尾 | Fix9：全局滚动条暗色（等指令） |


## 不影响范围

- 换乘恋爱模式代码不变
- 已出道职业泡泡功能不变
- 其他es-modal弹窗样式不变
- 数据池子文件格式不变