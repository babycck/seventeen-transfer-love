---
name: entSim-chat-init-and-ui-fixes
overview: 修复娱乐圈模拟器15个问题，覆盖聊天、泡泡门控、探班主题、记忆高度、预设回复、日期、亲密图标、好感度上限、滚动条、节日校验、日程地点+时段过渡、剧情连续性、探班地点未知、下一天确认。
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
      - fix-scrollbar
---

## 用户需求

新开档测试发现15个问题：

1. **男主聊天只显示"..."**：手机打开男主频道，初始消息内容全是"..."，无法正常对话。
2. **练习生期不应有泡泡**：练习生未出道却有泡泡App图标和订阅数。
3. **探班弹窗样式不一致**：3选1弹窗是浅色主题，与暗紫色entSim主题不统一。
4. **记忆回顾弹窗太小**：高度不够，文字挤在一起。
5. **哥哥/情敌初始无预设回复**：首次打开频道只有对方消息，没有快捷回复按钮。
6. **日期显示**：练习生显示"练习第80天"，应显示日历日期。
7. **亲密图标锁排版难看**：未解锁项显示锁和"—"。
8. **好感度涨太快**：缺少每日上限且存在双重结算。
9. **滚动条样式不统一**：全局滚动条应统一深紫色（等指令）。
10. **节日季节校验**：AI在3月写了Pepero Day(11月)。
11. **日程地点补全+时段过渡**：related无地点，时段分隔符太弱。
12. **剧情连续性防AI重置**：前文已互动，后文却"正式认识"。
13. **探班地点显示"未知"**：agenda中maleLeadLoc/brotherLoc/rivalLoc全部为空（cycle.js:88-91练习生分支）。
14. **哥哥行程也显示"未知"**：同上。
15. **下一天无确认按钮**：nextday(ui.js:942)直接执行，容易误触。

## 技术栈

- JavaScript (ES Modules)，Node.js 18+
- Vite 5.4
- 修改文件：ui.js、romance.js、engine.js、prompts.js、cycle.js、visit-choice-modal.js、style.css

## 实现方案

### Fix1：男主聊天"..." (ui.js:2719-2721)

映射函数检测`m.r`数组存在时用`m.r[randInt(0, m.r.length-1)]`，无`r`时fallback到`m.msg||m.t||'...'`。

### Fix2：练习生期泡泡隐藏 (ui.js:1657-1658 + 1531)

A. `__phoneOpenApp`加`if(app==='bubble'&&!isD){showToast('出道后才解锁泡泡功能');return;}`
B. 手机桌面泡泡图标用`isDebut`条件渲染。

### Fix3：探班弹窗暗色主题 (visit-choice-modal.js:10-31 + style.css:2190-2273)

overlay改为`es-modal-overlay`，inner包`es-modal`；vc-* CSS改暗紫色配色(#241d3d, rgba(124,111,240,.3), #e6e1f5)。

### Fix4：记忆回顾弹窗高度 (ui.js:1203-1204)

es-modal加`style="max-height:96vh;padding:14px 18px"`。

### Fix5：哥哥/情敌初始预设回复 (ui.js:2712-2715末尾)

brother/rival分支推入消息后设`_entSimPendingChat[ch]={reply:entry.reply||entry.msg,entryIdx:0}`。

### Fix6：练习生日期显示 (ui.js:218 + 378)

Header和Center两处`formatTraineeDate`→`formatGameDate`。

### Fix7：亲密图标去锁 (ui.js:499-505)

所有变量去掉锁和"—"后缀，仅靠opacity区分。

### Fix8：好感度涨速控制 (romance.js:46 + engine.js:200-208 + prompts.js:86)

A. `applyEntSimAffection`加`_affDayTotal`单日正向上限8点，负面不限。
B. `applySideEffects`防双重结算：romanceBeat有affectionDelta时跳过顶层。
C. prompts强化"增幅严格限制±1-3，每日硬上限8点"。

### Fix9：全局滚动条暗色统一 (style.css末尾，等指令)

`::-webkit-scrollbar`规则：thumb=rgba(124,111,240,.25)，hover=rgba(124,111,240,.45)。

### Fix10：节日季节校验 (prompts.js:213后)

`if(holiday)`后加`else`分支：注入"今天不是特殊节日，严禁编造任何节日相关剧情"。

### Fix11A：日程related地点补全 (cycle.js:90-95)

练习生related从`['练习室','声乐教室','舞蹈室']`随机选地点。

### Fix11B：时段过渡标签增强 (engine.js:120)

branchLabel从"▸"改为`getTimeOfDayLabel()+'·继续'`。

### Fix12：剧情连续性防AI重置 (prompts.js系统prompt末尾)

追加强连续性规则：已发生的互动不可逆，禁止写"第一次见面""今天正式认识"。

### Fix13+14：探班地点补全 (cycle.js:88-91)

练习生分支中，给maleLeadLoc/brotherLoc/rivalLoc设默认值。由于练习生期三人本质是SEVENTEEN成员在公司训练，设`maleLeadLoc='公司'`、`rivalLoc='公司'`、`brotherLoc='公司'`（brother需取`brother.loc`，但练习生期brother=null没有.loc可用，需单独处理）。

**精确修复**：在cycle.js行88-91的练习生else分支中：

```js
var maleLead = ''; var maleLeadLoc = '公司';
var rival = ''; var rivalLoc = '公司';
var brother = null; var brotherLoc = '公司';
```

并在行95-98的agenda赋值处，练习生期brother使用固定值`brotherName + '日常训练'`作为task、`brotherLoc`作为地点。

### Fix15：下一天确认按钮 (ui.js:942)

将nextday移入confirmActions机制：把行942的`if(q==='nextday'){...}`删掉，并在行945的confirmActions加`nextday:'进入下一天'`，让nextday走确认弹窗（与regenerate/nextagenda一致）。