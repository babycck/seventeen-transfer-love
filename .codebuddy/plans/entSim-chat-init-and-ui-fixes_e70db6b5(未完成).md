---
name: entSim-chat-init-and-ui-fixes
overview: 修复16个问题：聊天、泡泡、探班主题、记忆高度、预设回复、日期、亲密图标、好感度涨速(单日上限8+接线checkRomanceUnlock阶段锁)、滚动条、节日校验、日程地点+过渡、连续性、探班地点、下一天确认、记忆系统接入careerHistory。
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
    content: 修复好感度涨速三层：romance.js单日上限8+阶段锁接入checkRomanceUnlock、engine.js防双重结算、prompts.js强化约束
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
    content: 修复记忆系统接入careerHistory：onMemoryLog展示、buildMemorySnapshot注入AI、compress兜底读取
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

新开档测试发现16+1个问题，全部在娱乐圈模拟器（entSim）中：

1. **男主聊天只显示"..."**：手机打开男主频道，初始消息内容全是"..."。
2. **练习生期不应有泡泡**：练习生未出道却有泡泡App图标和订阅数。
3. **探班弹窗样式不一致**：3选1弹窗是浅色主题，与暗紫色entSim主题不统一。
4. **记忆回顾弹窗太小**：高度不够，文字挤在一起。
5. **哥哥/情敌初始无预设回复**：首次打开频道没有快捷回复按钮。
6. **日期显示**：练习生显示"练习第80天"，应显示日历日期。
7. **亲密图标锁排版难看**：未解锁项显示锁和"—"。
8. **好感度涨太快**：缺少每日上限、存在双重结算、已有checkRomanceUnlock()阶段锁从未被调用。
9. **滚动条样式不统一**：全局滚动条应统一深紫色（等指令执行）。
10. **节日季节校验**：AI在3月场景写了"Pepero Day"(11月11日)。
11. **日程地点补全+时段过渡**：related议程无地点，时段分隔符太弱。
12. **剧情连续性防AI重置**：前文已互动多轮，后文却"正式认识"。
13. **探班地点显示"未知"**：maleLeadLoc/brotherLoc/rivalLoc全部为空。
14. **哥哥行程也显示"未知"**：同上。
15. **下一天无确认按钮**：nextday直接执行，容易误触。
16. **记忆系统空+利用careerHistory**：dailySummaries一直为空，careerHistory有事件但未被读取。

**17（Fix8增强）**. **好感度阶段锁未接入**：romance.js:336-355的checkRomanceUnlock()已完整定义明星志愿3式阶段锁规则，但从未被applyEntSimAffection调用，形同虚设。

## 技术栈

- JavaScript (ES Modules)，Node.js 18+，Vite 5.4
- 修改文件：src/ent-sim/ui.js、src/ent-sim/romance.js、src/ent-sim/engine.js、src/ent-sim/prompts.js、src/ent-sim/cycle.js、src/ent-sim/memory.js、src/modals/visit-choice-modal.js、src/style.css

## 实现方案

### Fix1-Fix16

同前，保持不变。

### Fix8增强：好感度阶段锁接入（romance.js + prompts.js）

**根因**：romance.js:336-355 的 `checkRomanceUnlock()` 已完整定义明星志愿3式阶段锁规则：

- 练习生期tPhase<2时最高好感≤19，需practiceDayCount≥5解锁暧昧
- 未出道(debutDay===0)时最高好感≤49，需出道解锁约会
- 出道但chapter<2时最高好感≤69，需人气≥15(章节≥2)解锁恋爱
- chapter≥4且aff≥85解锁公开

但该函数从未被 `applyEntSimAffection` 调用，好感度可无阻上涨。

**修复A (romance.js:46)**：在 `applyEntSimAffection` 中每日上限裁剪之后，插入阶段锁检查。根据 `checkRomanceUnlock()` 返回的 `stage` 确定当前阶段好感封顶值（19/49/69/84/100），若新好感超过上限则卡住，并通过 `showToast` 提示玩家原因。

**修复B (prompts.js:86)**：在每日硬上限规则后追加阶段锁提示，注入当前阶段上限值和锁定原因到系统prompt，让AI感知"不能再涨"。