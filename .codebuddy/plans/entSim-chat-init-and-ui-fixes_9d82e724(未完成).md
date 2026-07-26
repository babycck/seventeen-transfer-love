---
name: entSim-chat-init-and-ui-fixes
overview: 修复16个问题：聊天、泡泡、探班主题、记忆改造、约定迁移、预设回复、日期、亲密图标、好感度三层锁、滚动条、节日校验、日程+过渡、连续性(含地点隔离防队友开天眼)、探班地点、下一天确认。
todos:
  - id: fix-malelead-chat
    content: "修复男主聊天\"...\": initChatChannel映射检测m.r数组随机取回复，fallback到msg/t"
    status: pending
  - id: fix-bubble-gate
    content: 修复练习生期泡泡门控：__phoneOpenApp加bubble出道检查，桌面泡泡图标条件渲染
    status: pending
  - id: fix-visit-theme
    content: 修复探班弹窗暗色主题：visit-choice-modal.js改es-modal-overlay+es-modal，style.css中vc-*改暗紫色
    status: pending
  - id: fix-memory-rewrite
    content: 记忆系统改造：删除记忆回顾按钮+onMemoryLog，onPopLog改为按天分组可折叠可编辑卡片(当天展开/过往折叠)，buildMemorySnapshot接入careerHistory
    status: pending
  - id: fix-appointment-move
    content: 约定迁移右侧：左侧删除aptCards，右侧插入约定卡片区域，履行加确认弹窗，每条支持编辑和删除
    status: pending
    dependencies:
      - fix-memory-rewrite
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
    content: 修复好感度阶段分级上限+三层锁：romance.js按stage分级dailyCap(3/4/5/6/7)+接入checkRomanceUnlock阶段锁、engine.js防双重结算、prompts.js强化约束
    status: pending
  - id: fix-festival-check
    content: 修复节日季节校验：prompts.js中无节日时注入反制规则，禁止AI编造Pepero Day等节日梗
    status: pending
  - id: fix-agenda-transition
    content: 修复日程地点+时段过渡：cycle.js给related补地点，engine.js时段分隔符改为带时段名标签
    status: pending
  - id: fix-continuity
    content: 修复剧情连续性+地点隔离：prompts.js系统prompt末尾加强制连续性规则禁止"第一次见面"等开倒车，并在私密通信隔离后插入地点隔离规则禁止不在场角色猜测女主独自经历
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
12. 剧情连续性防AI重置+地点隔离规则：在已有"禁止上帝视角+私密通信隔离+连续性防重置"基础上，追加地点隔离规则——女主独自在外的经历（便利店偶遇、走廊单独对话等），不在场角色不得知情、不得猜测具体是谁、不得讨论"八成是xxx""你是不是见到xxx了"。角色只能对可见行为做反应（如溜出练习室、回来后走神、手机偷笑），猜测须基于有途径知道的信息。
13. 探班地点未知
14. 下一天无确认按钮
15. buildMemorySnapshot接入careerHistory
16. 约定系统迁移至右侧：从左侧日程栏移到右侧原记忆回顾按钮位置，履行加确认弹窗，每条支持编辑和删除

## 技术栈

- JavaScript (ES Modules), Node.js 18+, Vite 5.4
- 修改文件: src/ent-sim/ui.js, src/ent-sim/romance.js, src/ent-sim/engine.js, src/ent-sim/prompts.js, src/ent-sim/cycle.js, src/ent-sim/memory.js, src/modals/visit-choice-modal.js, src/style.css

## Fix12增强：地点隔离规则 (prompts.js:148后)

### 根因

现有"禁止上帝视角"(line 147)只禁止其他角色窥见女主内心；"私密通信隔离"(line 148)只禁止角色知道手机聊天内容。两个规则都未覆盖"女主独自在外经历"的场景。AI写出队友在练习室精准猜测"八成是徐明浩"，违反了信息可达性原则。

### 修复

在 prompts.js line 148（私密通信隔离）之后、line 149（严禁自创韩文名）之前，插入地点隔离规则：

```js
sys += '【地点隔离·强制】女主独自在不同地点经历的事情——任何不在场的角色绝对不知情。例如：女主溜出练习室去便利店偶遇某前辈、在走廊单独和别人说话、被某人在楼梯间拦住——这些场景发生时，留在练习室的队友/哥哥/其他角色不在现场，所以他们不可能知道"女主见了谁""跟谁说了话"。后续剧情中，队友只能对女主"溜出去了""回来时表情不对""拿着冰淇淋回来"这类可见行为做反应，严禁写出"八成是XXX""你是不是见到了YYY""我听说是ZZZ叫你出去的"等任何基于不在场信息的猜测。角色之间通过群聊/私聊获知的信息也仅限发送方能知道的内容，不能推断出发送方不知道的人或事。此规则高于一切其他叙事设定。\n';
```

### 其他Fix实现方案保持不变