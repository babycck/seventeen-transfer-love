---
name: entSim-chat-init-and-ui-fixes
overview: 修复15个问题 + 约定系统改造：聊天、泡泡、探班主题、记忆改造、预设回复、日期、亲密图标、好感度三层锁、滚动条、节日校验、日程+过渡、连续性、探班地点、下一天确认、约定移至右栏(确认履行+可编辑+可删除)。
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
    content: 记忆系统改造：删除记忆回顾按钮+onMemoryLog，onPopLog改为按天分组可折叠可编辑卡片，buildMemorySnapshot接入careerHistory
    status: pending
  - id: fix-appointment-move
    content: 约定迁移右侧：左侧删除aptCards，右侧插入约定卡片区域，履行加确认弹窗，每条支持编辑和删除
    status: pending
    dependencies:
      - fix-memory-rewrite
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
    content: 修复好感度阶段分级上限+三层锁：romance.js按stage分级dailyCap(3/4/5/6/7)+接入checkRomanceUnlock、engine.js防双重结算、prompts.js强化约束
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
      - fix-appointment-move
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

累计16个问题，全部在娱乐圈模拟器(entSim)中：

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
16. **约定系统迁移至右侧**：从左侧日程栏移到右侧原记忆回顾按钮位置，履行加确认弹窗，每条支持编辑和删除

## 技术栈

- JavaScript (ES Modules), Node.js 18+, Vite 5.4
- 修改文件: ui.js, romance.js, engine.js, prompts.js, cycle.js, memory.js, visit-choice-modal.js, style.css

## Fix16：约定系统迁移至右侧

### 现状

- 左侧日程栏(line 329-346)渲染aptCards，每条约定是按钮不可编辑，点击直接履行无确认
- onAppointmentClick(line 887-901)直接标记done并生成剧情

### 改造方案

**A. 左侧删除约定渲染 (ui.js:329-346)**

删除aptCards生成代码块(line 329-342)，return中移除 `+ aptCards`。

**B. 右侧插入约定卡片 (ui.js:489后)**

在恋情面板底部(line 489 "手机"按钮之前)插入约定区域HTML：

- 标题行：`📅 约定`
- 每条约定渲染为可编辑卡片：summary(input) | place(input) | 编辑按钮 | 删除按钮 | 履行按钮
- 无约定时不显示该区域

**C. 履行确认 (ui.js:887-901)**

onAppointmentClick改造：

```js
function onAppointmentClick(idx) {
  var apt = E.appointments[idx];
  if (!apt || apt.done) return;
  showEntSimModal('📍 履行约定', 
    '<p>确定赴约「' + escHtml(apt.summary) + '」？<br><small>地点：' + escHtml(apt.place) + '</small></p>',
    [{ id: 'cancel', label: '取消' }, { id: 'confirm', label: '确定赴约', primary: true }]
  ).then(function(r) {
    if (r !== 'confirm') return;
    showNarrativeLoading();
    apt.done = true; saveGame();
    triggerEntSimEvent('赴约·' + apt.place + '：' + apt.summary, {
      scene: apt.place, extraNote: '你按照约定来到了「' + apt.place + '」...'
    }).then(rerender);
  });
}
```

**D. 编辑和删除**

- 编辑按钮：弹出showEntSimModal带两个input(summary+place)，确认后更新apt并saveGame+rerender
- 删除按钮：弹出确认弹窗，确认后splice E.appointments[idx]并saveGame+rerender
- 事件绑定用 `data-apt-edit` / `data-apt-del` 属性区隔

## 文件修改清单

| 文件 | 位置 | 修改 |
| --- | --- | --- |
| src/ent-sim/ui.js | 329-342 | Fix16A: 删除左侧aptCards |
| src/ent-sim/ui.js | 489 | Fix16B: 右侧插入约定卡片 |
| src/ent-sim/ui.js | 793-795, 887-901 | Fix16C+D: 确认+编辑+删除+事件绑定 |