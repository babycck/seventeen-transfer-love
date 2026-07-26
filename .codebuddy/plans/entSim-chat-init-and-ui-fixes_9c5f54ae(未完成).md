---
name: entSim-chat-init-and-ui-fixes
overview: 修复16个问题：聊天、泡泡、探班主题、记忆高度、预设回复、日期、亲密图标、好感度上限、滚动条、节日校验、日程地点+过渡、连续性、探班地点、下一天确认、记忆系统读取careerHistory事件节点。
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
    content: 修复剧情连续性防AI重置：prompts.js系统prompt末尾加强制连续性规则
    status: pending
  - id: fix-visit-locations
    content: 修复探班地点"未知"：cycle.js练习生分支给maleLeadLoc/brotherLoc/rivalLoc设默认地点
    status: pending
  - id: fix-nextday-confirm
    content: 修复下一天确认：ui.js将nextday移入confirmActions机制，加确认弹窗
    status: pending
  - id: fix-memory-careerhistory
    content: 修复记忆系统接入careerHistory：onMemoryLog展示careerHistory事件、buildMemorySnapshot注入AI、compress兜底读取careerHistory
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
      - fix-visit-locations
      - fix-nextday-confirm
      - fix-memory-careerhistory
      - fix-scrollbar
---

## 用户需求

新开档测试发现16个问题，全部在娱乐圈模拟器（entSim）中：

1. **男主聊天只显示"..."**：手机打开男主频道，初始消息内容全是"..."，无法正常对话。
2. **练习生期不应有泡泡**：练习生未出道却有泡泡App图标和订阅数。
3. **探班弹窗样式不一致**：3选1弹窗是浅色主题，与暗紫色entSim主题不统一。
4. **记忆回顾弹窗太小**：高度不够，文字挤在一起。
5. **哥哥/情敌初始无预设回复**：首次打开频道只有对方消息，没有快捷回复按钮。
6. **日期显示**：练习生显示"练习第80天"，应显示日历日期以体现节日/生日。
7. **亲密图标锁排版难看**：未解锁项显示锁和"—"。
8. **好感度涨太快**：缺少每日上限且存在双重结算。
9. **滚动条样式不统一**：全局滚动条应统一深紫色（等指令执行）。
10. **节日季节校验**：AI在3月场景写了"Pepero Day"(11月11日)，季节矛盾。
11. **日程地点补全+时段过渡**：related议程无地点，AI自由发挥编造场景；时段切换分隔符"── ▸ ──"太弱。
12. **剧情连续性防AI重置**：前文已和全圆佑互动多轮，后文哥哥却"今天正式认识"，AI遗忘已有互动。
13. **探班地点显示"未知"**：agenda中maleLeadLoc/brotherLoc/rivalLoc全部为空。
14. **哥哥行程也显示"未知"**：同上。
15. **下一天无确认按钮**：nextday直接执行，容易误触。
16. **记忆系统空+利用careerHistory**：compressEntSimMemory依赖AI压缩且仅换天时触发，dailySummaries一直为空，导致记忆回顾显示"暂无压缩记忆"。但careerHistory已有丰富的每日事件（人气变动、恋情记录、哥哥动态等）。修复：onMemoryLog和buildMemorySnapshot都读取careerHistory近7天事件作为补充，让AI记忆也能利用这些现成的事件节点。

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+
- 构建工具：Vite 5.4
- 修改文件：src/ent-sim/ui.js、src/ent-sim/romance.js、src/ent-sim/engine.js、src/ent-sim/prompts.js、src/ent-sim/cycle.js、src/ent-sim/memory.js、src/modals/visit-choice-modal.js、src/style.css

## 实现方案

### Fix1：男主聊天"..." (ui.js:2719-2724)

**根因**：initChatChannel 映射池子条目时统一读 m.msg || m.t || '...'，但 CHAT_MALE_LEAD 格式是 {q, r: [...], aff}，没有 msg/t。
**修复**：在映射函数中检测 m.r 数组存在时用 m.r[randInt(0, m.r.length-1)]，无 r 时 fallback 到 m.msg || m.t || '...'。

### Fix2：练习生期泡泡隐藏 (ui.js:1657-1658 + 1531)

**修复A**：__phoneOpenApp 加 if(app==='bubble' && !isD) { showToast('出道后才解锁泡泡功能'); return; }
**修复B**：手机桌面泡泡图标用 isDebut 条件渲染。

### Fix3：探班弹窗暗色主题 (visit-choice-modal.js:10-31 + style.css:2190-2273)

**修复**：overlay 从 modal-overlay 改为 es-modal-overlay，inner 包 es-modal；CSS 中 vc-* 全部改为暗紫色配色（#241d3d 背景、rgba(124,111,240,.3) 边框、#e6e1f5 文字）。

### Fix4：记忆回顾弹窗高度 (ui.js:1203-1204)

**修复**：onMemoryLog 创建的 es-modal div 加 style="max-height:96vh;padding:14px 18px"。

### Fix5：哥哥/情敌初始预设回复 (ui.js:2712-2715末尾)

**修复**：brother/rival 分支推入消息后，保留原 pool 条目引用并设置：

```js
if (!GS._entSimPendingChat) GS._entSimPendingChat = {};
GS._entSimPendingChat[ch] = { reply: entry.reply || entry.msg || '', entryIdx: 0 };
```

### Fix6：练习生日期显示 (ui.js:218 + 378)

**修复**：Header 和 Center 两处 formatTraineeDate 替换为 formatGameDate，练习生期也显示日历日期。

### Fix7：亲密图标去锁 (ui.js:499-505)

**修复**：intimacyIcons() 中所有变量统一去掉锁和"—"后缀，仅靠 opacity（0.3-0.4 未解锁 / 0.9 已解锁）区分状态。

### Fix8：好感度涨速控制 (romance.js + engine.js + prompts.js)

**A. romance.js:46** — applyEntSimAffection 加每日重置与封顶：_affDayTotal 单日正向累计上限8点，负面 delta 不限制。
**B. engine.js:200-208** — applySideEffects 防双重结算：若 romanceBeat.affectionDelta 已存在则跳过顶层 extras.affectionDelta。
**C. prompts.js:86** — 强化 AI 约束："增幅严格限制 ±1-3，每日系统硬上限8点。"

### Fix9：全局滚动条暗色统一 (style.css末尾，等指令)

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(124,111,240,.25); border-radius: 8px; }
::-webkit-scrollbar-thumb:hover { background: rgba(124,111,240,.45); }
```

### Fix10：节日季节校验 (prompts.js:213后)

**修复**：在 if(holiday) 后加 else 分支，注入反制规则："今天不是特殊节日，严禁编造任何节日相关剧情（如 Pepero Day、情人节、白色情人节、万圣节、圣诞节等）。"

### Fix11A：日程related地点补全 (cycle.js:90-95)

**修复**：练习生 related 从 ['练习室','声乐教室','舞蹈室'] 随机选地点；出道后添加 RELATED_POOL 到地点的映射表。

### Fix11B：时段过渡标签增强 (engine.js:120)

**修复**：branchLabel 从 "▸" 改为 getTimeOfDayLabel() + '·继续'，显示"上午·继续""下午·继续"等标签。

### Fix12：剧情连续性防AI重置 (prompts.js系统prompt末尾)

**修复**：追加强连续性规则——已发生的互动不可逆，同一段剧情中角色关系不重置，后续段落严禁写"第一次见面""今天正式认识一下"等开倒车行为。

### Fix13+14：探班地点补全 (cycle.js:88-91)

**修复**：练习生分支中，给 maleLeadLoc/brotherLoc/rivalLoc 分别设 '公司'。brother 练习生期无 .loc 可用，单独处理为固定值。

### Fix15：下一天确认按钮 (ui.js:942)

**修复**：将 nextday 移入 confirmActions 机制：删除行942的直接调用，在行945的 confirmActions 加 'nextday':'进入下一天'。

### Fix16：记忆系统接入careerHistory (memory.js + ui.js)

**修复A - UI展示(onMemoryLog, ui.js:1191-1201)**：当 dailySummaries 为空或条目不足时，追加读取 careerHistory 按天分组的事件（近7天），按类型标签（人气/恋情/哥哥/关系/掩护）渲染为记忆条目，让玩家看到实际发生了什么事。

**修复B - AI注入(buildMemorySnapshot, memory.js:64-77)**：在构建记忆快照时，同时读取 careerHistory 近7天事件，追加到"关键事件"段落后注入 prompt，让 AI 在生成新剧情时参考已发生的事件。

**修复C - 压简兜底(compressEntSimMemory, memory.js:54-59)**：兜底分支也从 careerHistory 提取当日事件作为 events 数组而非空数组，保证 dailySummaries 不会完全为空。