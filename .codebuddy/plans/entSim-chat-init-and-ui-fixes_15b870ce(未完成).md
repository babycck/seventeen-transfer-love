---
name: entSim-chat-init-and-ui-fixes
overview: 修复14个问题：聊天、泡泡、探班主题、预设回复、日期、亲密图标、好感度(每日上限按阶段分级+阶段锁+防双重)、滚动条、节日校验、日程地点+过渡、连续性、探班地点、下一天确认、记忆改造(按天分组可编辑卡片+非当天折叠)。
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
    content: 记忆系统改造：删除记忆回顾按钮+onMemoryLog，onPopLog改为按天分组可折叠可编辑卡片(当天展开/过往折叠)，buildMemorySnapshot接入careerHistory
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
    content: 修复好感度阶段分级上限+三层锁：romance.js按stage分级dailyCap(3/4/5/6/7)+接入checkRomanceUnlock阶段锁、engine.js防双重结算、prompts.js强化约束
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

新开档测试累计15个问题，全部在娱乐圈模拟器(entSim)中：

1. 男主聊天只显示"..."
2. 练习生期不应有泡泡
3. 探班弹窗样式不一致
4. 记忆系统改造：删除独立记忆回顾弹窗，改为在人气走势日志内嵌按天分组可编辑卡片，当天展开/过往折叠
5. 哥哥/情敌初始无预设回复
6. 练习生日期显示日历日期
7. 亲密图标去锁
8. 好感度涨太快：每日上限按职业阶段分级(3/4/5/6/7)+阶段锁接入checkRomanceUnlock+防双重结算
9. 滚动条暗色统一(等指令)
10. 节日季节校验
11. 日程地点补全+时段过渡增强
12. 剧情连续性防AI重置
13. 探班地点未知
14. 下一天无确认按钮
15. buildMemorySnapshot接入careerHistory

## 核心功能

- 聊天频道正常初始化
- 练习生期隐藏泡泡
- 探班暗紫色主题
- 记忆系统：人气日志内按天分组可折叠可编辑卡片，当天展开过往折叠
- 好感度阶段分级每日上限(3/4/5/6/7)+阶段锁+防双重结算
- 全局滚动条暗色(等指令)
- 节日/连续性/日程地点/探班地点/下一天确认等修复

## 技术栈

- JavaScript (ES Modules), Node.js 18+, Vite 5.4
- 修改文件: ui.js, romance.js, engine.js, prompts.js, cycle.js, memory.js, visit-choice-modal.js, style.css

## 实现方案

### Fix1: 男主聊天"..." (ui.js:2719-2724)

映射函数检测 `m.r` 数组，`randInt` 随机取回复；无 `r` 时 fallback 到 `m.msg || m.t || '...'`。

### Fix2: 练习生期泡泡隐藏 (ui.js:1657-1658 + 1531)

A. `__phoneOpenApp` 加 `if(app==='bubble' && !isD) { showToast('出道后才解锁'); return; }`
B. 手机桌面泡泡图标用 `isDebut` 条件渲染。

### Fix3: 探班弹窗暗色主题 (visit-choice-modal.js + style.css)

overlay → `es-modal-overlay`，CSS vc-* 改暗紫色(#241d3d / rgba(124,111,240,.3) / #e6e1f5)。

### Fix4: 记忆系统改造 (ui.js:490 + 787 + 1178-1277 + memory.js:64-77)

删除：

- ui.js:490 移除记忆回顾按钮行
- ui.js:787 移除 `bindId('es-memory-btn', onMemoryLog)`
- ui.js:1178-1252 删除整个 `onMemoryLog` 函数

改造 `onPopLog` (ui.js:1264-1277)：

- 保留顶部Canvas人气走势图
- careerHistory按 `day` 分组 → `{day: {brother:[], romance:[], popularity:[], exposure:[], npc:[], event:[]}}`
- 每组渲染为可折叠卡片：Day标题行(可点击展开/收起)
- **当天**(Day==当前dayCount)默认展开(open)，**过往天数**默认折叠(closed，仅显示Day标题+简短摘要)
- 卡片展开后按类型分行(哥哥|恋爱|女主|其他)，每行是 `<textarea>`，初始值从careerHistory拼接
- 底部加"保存"按钮：读取textarea值按类型拆回更新careerHistory
- 类型映射：brother→哥哥、romance→恋爱、popularity+exposure→女主(事业)、npc+event→其他

`buildMemorySnapshot` (memory.js:64-77)：

- 读取careerHistory近7天事件，按天分组输出：`Day81: 哥哥-xxx | 恋爱-xxx | 女主-xxx | 其他-xxx`

### Fix5: 哥哥/情敌预设回复 (ui.js:2712-2715)

brother/rival 分支设 `_entSimPendingChat[ch] = { reply: entry.reply || entry.msg, entryIdx: 0 }`。

### Fix6: 练习生日期 (ui.js:218 + 378)

Header 和 Center 的 `formatTraineeDate` 替换为 `formatGameDate`。

### Fix7: 亲密图标去锁 (ui.js:499-505)

所有变量去掉锁和"—"，仅靠 opacity(0.3未解锁/0.9已解锁)区分。

### Fix8: 好感度阶段分级上限+三层锁 (romance.js + engine.js + prompts.js)

**A. romance.js:46 — applyEntSimAffection 改造**

阶段级每日上限(dailyCap)由 `checkRomanceUnlock()` 返回值决定：

| stage | checkRomanceUnlock条件 | 好感区间 | dailyCap |
| --- | --- | --- | --- |
| 0 | tPhase<2或aff<20 | ≤19 | 3/天 |
| 1 | tPhase>=2且aff≥20，debut=0 | 20-49 | 4/天 |
| 2 | debut>0且aff≥50，chapter<2 | 50-69 | 5/天 |
| 3 | chapter>=2且aff≥70 | 70-84 | 6/天 |
| 4 | chapter>=4且aff≥85 | 85-100 | 7/天 |


实现逻辑：

```js
var today = E.cycle.dayCount || 1;
if (E._affDay !== today) { E._affDay = today; E._affDayTotal = 0; }
var stage = checkRomanceUnlock().unlocked ? checkRomanceUnlock().stage : 0;
var dailyCaps = [3, 4, 5, 6, 7]; // stage 0-4
var cap = dailyCaps[stage] || 3;
if (delta > 0 && E._affDayTotal >= cap) delta = 0;
else if (delta > 0) delta = Math.min(delta, cap - E._affDayTotal);
// 阶段锁：好感超过当前阶段上限则卡住
var stageAffCaps = [19, 49, 69, 84, 100];
var affCap = stageAffCaps[stage];
var newAff = oldAff + delta;
if (newAff > affCap) newAff = affCap;
E.affection = newAff;
E._affDayTotal += delta;
```

**B. engine.js:200-208 — 防双重结算**
若 `romanceBeat.affectionDelta` 已存在则跳过顶层 `extras.affectionDelta`。

**C. prompts.js:86 — 强化约束**
"增幅±1-3，每日上限由当前阶段决定(练习生3/暧昧4/约会5/恋爱6/公开7)，不得突破。"

### Fix9: 全局滚动条暗色 (style.css末尾，等指令)

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(124,111,240,.25); border-radius: 8px; }
::-webkit-scrollbar-thumb:hover { background: rgba(124,111,240,.45); }
```

### Fix10: 节日校验 (prompts.js:213后)

`if(holiday)` 后加 `else`：注入"今天不是特殊节日，严禁编造任何节日相关剧情"。

### Fix11A: 日程related地点补全 (cycle.js:90-95)

练习生 related 从 ['练习室','声乐教室','舞蹈室'] 随机选地点。

### Fix11B: 时段过渡标签增强 (engine.js:120)

branchLabel 从 "▸" 改为 `getTimeOfDayLabel() + '·继续'`。

### Fix12: 剧情连续性 (prompts.js系统prompt末尾)

追加强制规则：已发生互动不可逆，禁止写"第一次见面""今天正式认识"。

### Fix13+14: 探班地点补全 (cycle.js:88-91)

练习生分支给 maleLeadLoc/brotherLoc/rivalLoc 分别设 '公司'。

### Fix15: 下一天确认 (ui.js:942)

nextday 移入 confirmActions，加确认弹窗。

## 文件修改清单

| 文件 | 位置 | 修改 |
| --- | --- | --- |
| src/ent-sim/ui.js | 2719-2724 | Fix1+Fix5 |
| src/ent-sim/ui.js | 1657-1658/1531 | Fix2 |
| src/ent-sim/ui.js | 490,787,1178-1252 | Fix4A: 删除记忆回顾 |
| src/ent-sim/ui.js | 1264-1277 | Fix4B: onPopLog改造(可折叠卡片) |
| src/ent-sim/ui.js | 218/378 | Fix6 |
| src/ent-sim/ui.js | 499-505 | Fix7 |
| src/ent-sim/ui.js | 942 | Fix15 |
| src/ent-sim/romance.js | 46-51/336-355 | Fix8A: 阶段分级上限+阶段锁 |
| src/ent-sim/engine.js | 200-208/120 | Fix8B+11B |
| src/ent-sim/prompts.js | 86/213-214/末尾 | Fix8C+10+12 |
| src/ent-sim/memory.js | 64-77 | Fix15 |
| src/ent-sim/cycle.js | 88-100 | Fix11A+13 |
| src/modals/visit-choice-modal.js | 10-31 | Fix3 |
| src/style.css | 2190-2273/末尾 | Fix3+9 |