---
name: entSim-chat-init-and-ui-fixes
overview: 修复18个问题：聊天、泡泡、探班主题、记忆改造、约定迁移、预设回复、日期、亲密图标、好感度三层锁、滚动条、节日校验、日程+过渡、连续性+地点隔离、探班地点、下一天确认、哥哥支持度日志、禁AI编造未发生事件。
todos:
  - id: fix-malelead-chat
    content: "修复男主聊天\"...\": initChatChannel映射检测m.r数组随机取回复，fallback到msg/t"
    status: completed
  - id: fix-bubble-gate
    content: 修复练习生期泡泡门控：__phoneOpenApp加bubble出道检查，桌面泡泡图标条件渲染
    status: completed
  - id: fix-visit-theme
    content: 修复探班弹窗暗色主题：visit-choice-modal.js改es-modal-overlay+es-modal，style.css中vc-*改暗紫色
    status: completed
  - id: fix-memory-rewrite
    content: 记忆系统改造：删除记忆回顾按钮+onMemoryLog，onPopLog改为按天分组可折叠可编辑卡片(当天展开/过往折叠)，buildMemorySnapshot接入careerHistory
    status: completed
  - id: fix-appointment-move
    content: 约定迁移右侧：左侧删除aptCards，右侧插入约定卡片区域，履行加确认弹窗，每条支持编辑和删除
    status: completed
    dependencies:
      - fix-memory-rewrite
  - id: fix-pending-reply
    content: 修复哥哥/情敌初始预设回复：initChatChannel中brother/rival分支末尾设_entSimPendingChat
    status: completed
  - id: fix-trainee-date
    content: 修复练习生日期显示：Header和Center的formatTraineeDate改为formatGameDate
    status: completed
  - id: fix-intimacy-icons
    content: 修复亲密图标去锁：intimacyIcons未解锁项去掉锁和"--"，仅靠opacity区分
    status: completed
  - id: fix-affection-cap
    content: 修复好感度阶段分级上限+三层锁：romance.js按stage分级dailyCap(3/4/5/6/7)+接入checkRomanceUnlock阶段锁、engine.js防双重结算、prompts.js强化约束
    status: completed
  - id: fix-festival-check
    content: 修复节日季节校验：prompts.js中无节日时注入反制规则，禁止AI编造Pepero Day等节日梗
    status: completed
  - id: fix-agenda-transition
    content: 修复日程地点+时段过渡：cycle.js给related补地点，engine.js时段分隔符改为带时段名标签
    status: completed
  - id: fix-continuity
    content: 修复剧情连续性+地点隔离：prompts.js末尾加强制连续性规则禁止"第一次见面"开倒车，在私密通信隔离后插入地点隔离规则禁止不在场角色猜测女主独自经历
    status: completed
  - id: fix-brother-support-log
    content: 修复哥哥支持度日志：engine.js中applyBrotherEffect更新support同时push{supportDelta,reason,total,day}到brother.supportLog
    status: completed
  - id: fix-no-fabrication
    content: 修复AI编造未发生事件：prompts.js系统prompt加规则禁止凭空编造拥抱/牵手等未发生亲密互动，依赖Fix15提供可靠事件记忆
    status: completed
    dependencies:
      - fix-memory-rewrite
  - id: fix-visit-locations
    content: 修复探班地点"未知"：cycle.js练习生分支给maleLeadLoc/brotherLoc/rivalLoc设默认地点
    status: completed
  - id: fix-nextday-confirm
    content: 修复下一天确认：ui.js将nextday移入confirmActions机制，加确认弹窗
    status: completed
  - id: fix-scrollbar
    content: 修复全局滚动条暗色统一：style.css末尾加::-webkit-scrollbar深紫色规则（等指令执行）
    status: completed
  - id: build-verify
    content: 构建验证并push
    status: completed
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
      - fix-brother-support-log
      - fix-no-fabrication
      - fix-visit-locations
      - fix-nextday-confirm
      - fix-scrollbar
---

累计18个问题，全部在娱乐圈模拟器(entSim)中：

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
12. 剧情连续性防AI重置+地点隔离规则：女主独自在外的经历不在场角色不得知情猜测
13. 探班地点未知
14. 下一天无确认按钮
15. buildMemorySnapshot接入careerHistory
16. 约定系统迁移至右侧：履行加确认弹窗，每条支持编辑删除
17. 哥哥支持度无变动记录：applyBrotherEffect更新support但从未push到supportLog
18. AI编造未发生事件：泡泡/短信中男主提及从未发生的拥抱等亲密互动

## 技术栈

- JavaScript (ES Modules), Node.js 18+, Vite 5.4
- 修改文件: src/ent-sim/ui.js, src/ent-sim/romance.js, src/ent-sim/engine.js, src/ent-sim/prompts.js, src/ent-sim/cycle.js, src/ent-sim/memory.js, src/modals/visit-choice-modal.js, src/style.css

## Fix1-Fix16：实现方案同前保持不变

## Fix17：哥哥支持度无变动记录 (engine.js:270-274)

### 根因

applyBrotherEffect在line 273更新`E.brother.support`数值，但从未向`E.brother.supportLog`数组push记录。showBrotherSupportModal(ui.js:603-606)读取supportLog始终为空，导致UI提示"还没有哥哥支持度变动记录"。

### 修复

在engine.js:270-274的applyBrotherEffect函数中，更新support的同时push日志条目：

```js
function applyBrotherEffect(b) {
  var E = GS.entSim;
  if (b.stance) E.brother.stance = b.stance;
  if (typeof b.supportDelta === 'number') {
    var newSupport = Math.max(-100, Math.min(100, (E.brother.support || 0) + b.supportDelta));
    E.brother.support = newSupport;
    if (!E.brother.supportLog) E.brother.supportLog = [];
    E.brother.supportLog.push({
      delta: b.supportDelta,
      reason: b.note || '剧情影响',
      total: newSupport,
      day: E.cycle.dayCount || 1
    });
  }
  if (b.note) E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'brother', text: b.note });
}
```

## Fix18：AI编造未发生事件 (prompts.js系统prompt)

### 根因

AI在泡泡/短信/公开发言中编造从未发生的亲密互动（如"你给我拥抱的时候""最不该开口的时候"），因为Fix15未修导致没有可靠事件记忆，AI凭上下文自由脑补。依赖Fix15修复后提供careerHistory事件引用。

### 修复

在prompts.js系统prompt末尾（Fix12连续性规则之后）插加强制规则：

```js
sys += '【禁止编造未发生事件·强制】在任何剧情、短信、聊天、泡泡、朋友圈、或角色公开发言中，男主或其他角色提及的与女主的互动必须严格基于前面正文中实际发生的情节。绝对禁止凭空编造从未发生过的暧昧事件，包括但不限于：拥抱、牵手、深夜一起吃饭、靠在肩膀、擦眼泪、递外套等。男主可以在泡泡中发模糊的感谢语（如"感谢某个人""有一个人让我觉得不孤单"），但不能包含具体行为描述（如"你那天抱了我""你靠在我肩上"）——除非该行为在正文中确实发生过。此规则高于一切叙事设定。\n';
```

此修复依赖Fix15（记忆系统接入careerHistory）提供可靠事件引用，确保AI可根据实际事件生成而非脑补。