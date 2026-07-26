---
name: entSim-chat-init-and-ui-fixes
overview: 修复15个问题：聊天、泡泡、探班主题、预设回复、日期、亲密图标、好感度三层锁、滚动条、节日校验、日程地点+过渡、连续性、探班地点、下一天确认、记忆系统改为人气日志内可编辑按天分组。
todos:
  - id: fix-malelead-chat
    content: 修复男主聊天...：initChatChannel映射检测m.r数组随机取回复
    status: pending
  - id: fix-bubble-gate
    content: 修复练习生期泡泡门控：__phoneOpenApp加bubble出道检查，桌面泡泡条件渲染
    status: pending
  - id: fix-visit-theme
    content: 修复探班弹窗暗色主题：visit-choice-modal.js+style.css改暗紫色
    status: pending
  - id: fix-memory-rewrite
    content: 记忆系统改造：删除记忆回顾按钮+onMemoryLog，onPopLog改为按天分组可编辑卡片(Day 81 → 哥哥/恋爱/女主/其他)，buildMemorySnapshot接入careerHistory
    status: pending
  - id: fix-pending-reply
    content: 修复哥哥/情敌初始预设回复：initChatChannel设_entSimPendingChat
    status: pending
  - id: fix-trainee-date
    content: 修复练习生日期：Header和Center的formatTraineeDate改为formatGameDate
    status: pending
  - id: fix-intimacy-icons
    content: 修复亲密图标去锁：去掉锁和"-"，仅靠opacity区分
    status: pending
  - id: fix-affection-cap
    content: 修复好感度三层锁：romance.js单日上限8+checkRomanceUnlock阶段锁、engine.js防双重结算、prompts.js强化约束
    status: pending
  - id: fix-festival-check
    content: 修复节日校验：无节日时注入反制规则禁止编造Pepero Day等
    status: pending
  - id: fix-agenda-transition
    content: 修复日程地点+时段过渡：cycle.js给related补地点，engine.js时段分隔符改标签
    status: pending
  - id: fix-continuity
    content: 修复剧情连续性：prompts.js末尾加强制规则禁止"第一次见面"等开倒车
    status: pending
  - id: fix-visit-locations
    content: 修复探班地点未知：cycle.js给maleLeadLoc/brotherLoc/rivalLoc设默认地点
    status: pending
  - id: fix-nextday-confirm
    content: 修复下一天确认：nextday移入confirmActions机制加确认弹窗
    status: pending
  - id: fix-scrollbar
    content: 修复全局滚动条暗色统一（等指令执行）
    status: pending
  - id: build-verify
    content: 构建验证并push
    status: pending
    dependencies:
      - fix-malelead-chat
      - fix-bubble-gate
      - fix-visit-theme
      - fix-memory-rewrite
      - fix-pending-reply
      - fix-trainee-date
      - fix-intimacy-icons
      - fix-affection-cap
      - fix-festival-check
      - fix-agenda-transition
      - fix-continuity
      - fix-visit-locations
      - fix-nextday-confirm
      - fix-scrollbar
---

## 用户需求

新开档测试累计发现15个问题，全部在娱乐圈模拟器（entSim）中：

1. 男主聊天只显示"..."：手机打开男主频道，初始消息内容全是"..."。
2. 练习生期不应有泡泡：练习生未出道却有泡泡App图标和订阅数。
3. 探班弹窗样式不一致：3选1弹窗是浅色主题，与暗紫色entSim主题不统一。
4. 记忆系统改造（替代原Fix4+16）：删除独立的"记忆回顾"弹窗（按钮+onMemoryLog函数），改为在"人气走势与变动日志"弹窗内嵌可编辑记忆卡片。careerHistory按天分组（Day 81），按类型分列显示（哥哥/恋爱/女主/其他），每条可单独编辑，保存后AI记忆可修复错误。
5. 哥哥/情敌初始无预设回复：首次打开频道没有快捷回复按钮。
6. 日期显示：练习生显示"练习第80天"，应显示日历日期。
7. 亲密图标锁排版难看：未解锁项显示锁和"—"。
8. 好感度涨太快：缺少每日上限、双重结算、已有checkRomanceUnlock()阶段锁从未被调用。
9. 滚动条样式不统一（等指令执行）。
10. 节日季节校验：AI在3月写了Pepero Day。
11. 日程地点+时段过渡：related议程无地点，时段分隔符太弱。
12. 剧情连续性防AI重置：前文已互动多轮，后文却"正式认识"。
13. 探班地点显示"未知"：maleLeadLoc/brotherLoc/rivalLoc为空。
14. 下一天无确认按钮。
15. buildMemorySnapshot接入careerHistory让AI记忆读取改造后的事件。

## 核心功能

- 聊天频道正常初始化，不再显示"..."
- 练习生期隐藏泡泡App
- 探班弹窗改为暗紫色主题
- 记忆系统改造为按天分组的可编辑卡片
- 好感度三层锁：单日上限8 + 阶段锁(练习生≤19/出道前≤49/人气不够≤69) + 防双重结算
- 全局滚动条暗色统一（等指令）
- 节日/连续性/日程地点/探班地点/下一天确认等逐一修复

## 技术栈

- JavaScript (ES Modules)，Node.js 18+，Vite 5.4
- 修改文件：ui.js、romance.js、engine.js、prompts.js、cycle.js、memory.js、visit-choice-modal.js、style.css

## 实现方案

### Fix1：男主聊天"..." (ui.js:2719-2724)

映射函数检测 `m.r` 数组，`randInt` 随机取回复；无 `r` 时 fallback 到 `m.msg || m.t || '...'`。

### Fix2：练习生期泡泡隐藏 (ui.js:1657-1658 + 1531)

A. `__phoneOpenApp` 加出道门控。
B. 手机桌面泡泡图标用 `isDebut` 条件渲染。

### Fix3：探班弹窗暗色主题 (visit-choice-modal.js + style.css)

overlay → `es-modal-overlay`，CSS vc-* 改暗紫色(#241d3d/rgba(124,111,240,.3)/#e6e1f5)。

### Fix4：记忆系统改造 (ui.js:490 + 787 + 1178-1277 + memory.js:64-77)

删除4处：

- ui.js:490 移除 `<button class="es-rom-btn" id="es-memory-btn">` 行
- ui.js:787 移除 `bindId('es-memory-btn', onMemoryLog);`
- ui.js:1178-1252 删除整个 `onMemoryLog` 函数

改造 `onPopLog` (ui.js:1264-1277)：

- 保留顶部Canvas人气走势图
- careerHistory按 `day` 分组：遍历所有条目，按 day 建立 `{day: {brother:[], romance:[], popularity:[], exposure:[], npc:[], event:[]}}` 结构
- 每组渲染为卡片：`Day 81` 标题行 + 按类型分行（哥哥 | 恋爱 | 女主 | 其他），每行是一个可编辑的 `<textarea>`，初始值从careerHistory拼接
- 弹窗底部加"保存"按钮：读取所有textarea值，按类型拆回并更新 careerHistory 对应条目
- 类型映射：brother→哥哥、romance→恋爱、popularity+exposure→女主(事业)、npc+event→其他

`buildMemorySnapshot` (memory.js:64-77) 适配：

- 读取 careerHistory 近7天事件，按天分组输出格式：`Day81: 哥哥-xxx | 恋爱-xxx | 女主-xxx | 其他-xxx`

### Fix5：哥哥/情敌预设回复 (ui.js:2712-2715)

brother/rival 分支设 `_entSimPendingChat[ch] = { reply: entry.reply || entry.msg, entryIdx: 0 }`。

### Fix6：练习生日期 (ui.js:218 + 378)

Header 和 Center 的 `formatTraineeDate` 替换为 `formatGameDate`。

### Fix7：亲密图标去锁 (ui.js:499-505)

所有变量去掉锁和"—"，仅靠 opacity 区分。

### Fix8：好感度三层锁 (romance.js + engine.js + prompts.js)

A. romance.js:46 — `applyEntSimAffection` 加每日上限8 + 接入 `checkRomanceUnlock()` 阶段锁
B. engine.js:200-208 — 防双重结算
C. prompts.js:86 — 强化约束

### Fix9-15

同之前计划的实现方案。

## 文件修改清单

| 文件 | 位置 | 修改内容 |
| --- | --- | --- |
| src/ent-sim/ui.js | 2719-2724 | Fix1+Fix5：聊天映射+预设回复 |
| src/ent-sim/ui.js | 1657-1658/1531 | Fix2：泡泡门控 |
| src/ent-sim/ui.js | 490, 787, 1178-1252 | Fix4A：删除记忆回顾按钮+函数 |
| src/ent-sim/ui.js | 1264-1277 | Fix4B：onPopLog改造为按天分组可编辑卡片 |
| src/ent-sim/ui.js | 218/378 | Fix6：日期显示 |
| src/ent-sim/ui.js | 499-505 | Fix7：亲密图标 |
| src/ent-sim/ui.js | 942 | Fix14：下一天确认 |
| src/ent-sim/romance.js | 46-51/336-355 | Fix8A：单日上限+阶段锁 |
| src/ent-sim/engine.js | 200-208/120 | Fix8B+11B：防双重结算+时段标签 |
| src/ent-sim/prompts.js | 86/213-214/末尾 | Fix8C+10+12：约束+节日+连续性 |
| src/ent-sim/memory.js | 64-77 | Fix15：buildMemorySnapshot读careerHistory |
| src/ent-sim/cycle.js | 88-100 | Fix11A+13：related地点+探班地点 |
| src/modals/visit-choice-modal.js | 10-31 | Fix3：暗色主题 |
| src/style.css | 2190-2273/末尾 | Fix3+9：vc-*暗紫色+滚动条 |