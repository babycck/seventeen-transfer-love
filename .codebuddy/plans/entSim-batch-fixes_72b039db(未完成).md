---
name: entSim-batch-fixes
overview: 合并全部修改：7项代码修复 + 练习生三分阶段(人气=0) + 出道后6阶段 + 数据驱动调度系统 + 好感-事业三层门控 + AI主线叙事框架 + 手册更新，共21项。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：data.js中CHAPTERS改为6阶段，state.js中chapterByPopularity阈值改为6段(90/75/55/35/15)，checkChapterAdvance移除旧出道逻辑
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：练习生期消息通过池子条目require标签过滤，不手写if/else关键词黑名单
    status: pending
  - id: fix-rival-name
    content: 修复情敌名字：ui.js showBusinessPanel联系人列表改用suitorName()函数
    status: pending
  - id: fix-secret-dedup
    content: 修复秘密去重：engine.js applySecretEffect新增核心词辅助指纹函数，双指纹任一命中即判重
    status: pending
  - id: fix-entSim-flags
    content: 修复开局标记：state.js initEntSimState中sisterSetting时置位_relCharIntroduced和_rivalIntroduced
    status: pending
  - id: remove-livestream-gift-secrets
    content: 删除4处直播间刷礼物秘密条目：secret-discovery-events.js、ui-renderer.js、ent-sim/state.js、special-events.js
    status: pending
  - id: strengthen-prompt
    content: 加强prompt约束：prompts.js禁止AI生成SEVENTEEN成员直播间秘密，严格限定EXO
    status: pending
    dependencies:
      - remove-livestream-gift-secrets
  - id: create-trainee-pools
    content: 新建trainee-stages.js：5个池子200条(TRAINEE_EARLY_POOL 30/MID_POOL 30/LATE_POOL 30/TRAINEE_EVENTS 50含出道触发事件/TRAINEE_CHAT 60)，全部含require标签
    status: pending
  - id: add-state-fields-zero-pop
    content: state.js新增traineePhase/_lastTraineePhase/_debutTriggerDay字段，popularity初始化为0，migrateSave兜底
    status: pending
  - id: engine-trainee-debut
    content: engine.js：addPopularity守卫(debutDay=0时return)+goEntSimNextDay中traineePhase更新+后期_debutTriggerDay出道触发+练习生轻量事件
    status: pending
    dependencies:
      - create-trainee-pools
      - add-state-fields-zero-pop
  - id: cycle-filterByRequire
    content: cycle.js改造：rollDailyAgenda练习生分支用filterByRequire替代isDebut三分支
    status: pending
    dependencies:
      - create-trainee-pools
      - add-state-fields-zero-pop
  - id: utils-canTrigger
    content: _utils.js新增canTrigger/filterByRequire通用数据驱动调度函数
    status: pending
  - id: add-two-chapter-pools
    content: ent-schedules.js新增CHAPTER2_SPROUTING(30条)和CHAPTER5_TOPSTAR(30条)
    status: pending
  - id: update-chapter-mapping
    content: chapterPoolByIndex改为6分支映射，pools/index.js新增所有导出
    status: pending
    dependencies:
      - fix-chapter-label
      - add-two-chapter-pools
  - id: romance-unlock-gate
    content: romance.js新增checkRomanceUnlock()：5档事业门控(初识/暧昧/约会/恋爱/公开)，仿明星志愿3阶段限制
    status: pending
  - id: engine-date-cooldown
    content: engine.js约会冷却：_lastDateDay+连续计数，连约2次强制冷却3天
    status: pending
  - id: ui-date-button-grey
    content: ui.js约会按钮灰化：未解锁时显示原因("需要出道""好感不足""冷却中")
    status: pending
    dependencies:
      - romance-unlock-gate
  - id: prompts-refactor
    content: prompts.js重构：三段式prompt结构(角色设定+压缩记忆+今日事件)，选项格式规范化
    status: pending
  - id: engine-milestone-beat
    content: engine.js里程碑触发：出道/一位/告白/阶段跨越时注入storyBeat要求AI写高光剧情
    status: pending
  - id: update-agents-md
    content: AGENTS.md全面更新：9状态体系+数据驱动架构+57池子清单+npcNetwork+好感门控+AI叙事框架
    status: pending
    dependencies:
      - fix-chapter-label
      - create-trainee-pools
  - id: validate-all
    content: 全量语法验证：node -c检查所有约22个修改文件
    status: pending
    dependencies:
      - fix-chapter-label
      - fix-chat-stage-filter
      - fix-rival-name
      - fix-secret-dedup
      - fix-entSim-flags
      - remove-livestream-gift-secrets
      - strengthen-prompt
      - create-trainee-pools
      - add-state-fields-zero-pop
      - engine-trainee-debut
      - cycle-filterByRequire
      - utils-canTrigger
      - add-two-chapter-pools
      - update-chapter-mapping
      - romance-unlock-gate
      - engine-date-cooldown
      - ui-date-button-grey
      - prompts-refactor
      - engine-milestone-beat
---

## 产品概述

对娱乐模拟器(entSim)进行明星志愿3式重构：保留明星志愿3的骨架（日历+里程碑+支线），用AI做叙事血肉。核心原则：池子决定"发生什么"，AI只负责"写出来"；数据驱动调度，条目自带require标签统一canTrigger过滤；娱乐圈是恋爱背景板，好感进度受事业阶段约束。

## 核心设计

### 练习生期（人气=0，天数驱动）

练习生未出现在公众视野，不存在人气概念。UI隐藏人气栏，prompt移除人气/粉丝/知名度等词汇。出道纯天数推动，必然发生：

- 前期：dayCount 1-4天（约12回合）
- 中期：dayCount 5-10天
- 后期：dayCount 11天起
- 出道：后期累计2-4天触发"出道最终评价"事件，debutDay置位，人气初始化

### 出道后6阶段（人气驱动，参考明星志愿3）

- 新人出道 0-14 → 崭露头角 15-34 → 稳步上升 35-54 → 人气偶像 55-74 → 顶流巨星 75-89 → 传奇殿堂 90+

### 好感-事业三层门控（仿明星志愿3）

- 初识(默认) → 暧昧(好感≥20+练习生中期) → 约会(好感≥50+出道) → 恋爱(好感≥70+崭露头角) → 公开(好感≥85+人气偶像)
- 约会冷却：连约2次强制冷却3天

### AI叙事框架

每天3时段循环：抽取日程池(filterByRequire) → 检查里程碑 → 拼接prompt(角色设定+压缩记忆+今日事件+写作要求) → AI生成300-500字剧情+选项 → 玩家选择 → 更新状态+压缩记忆 → 推进时段

### 数据驱动调度

池子条目自带require标签，统一canTrigger过滤：

```js
{ key:'打歌初放送', require:'debut', text:'...' }
{ key:'月末评价', require:'traineePhase>=1', text:'...' }
{ key:'男主告白', require:'aff>=60&&chapter>=2', text:'...' }
```

## 技术栈

- Language: JavaScript (ES Modules)
- Runtime: Node.js 18+ / Browser
- Framework: Vanilla JS + Vite
- AI API: DeepSeek (deepseek-chat)
- 代码风格: var声明、+字符串拼接、无新依赖

## 实现方案

### 数据驱动调度（_utils.js新增）

在现有 pickFromPool/pickFromPoolRotate 基础上新增统一过滤层：

```js
export function canTrigger(entry, E) {
  if (!entry.require) return true;
  var req = entry.require;
  // 解析条件字符串：debut / trainee / aff>=60 / chapter>=2 等
  return evalCondition(req, E);
}
export function filterByRequire(pool, E) {
  var out = [];
  for (var i = 0; i < pool.length; i++) {
    if (canTrigger(pool[i], E)) out.push(pool[i]);
  }
  return out.length ? out : pool; // 兜底返回全池
}
```

### 章节系统改造

- data.js: CHAPTERS从4项扩展为6项，每项含index/name/icon/desc
- state.js: chapterByPopularity阈值6段(90/75/55/35/15)，checkChapterAdvance移除旧出道逻辑
- cycle.js: chapterPoolByIndex从4分支改为6分支

### 练习生出道逻辑

- state.js新增traineePhase/_lastTraineePhase/_debutTriggerDay字段，popularity初始0
- engine.js: addPopularity函数开头加入return守卫(debutDay=0时直接return)
- goEntSimNextDay中按dayCount更新traineePhase，后期_debutTriggerDay累计触发出道

### 好感-事业门控

- romance.js新增checkRomanceUnlock()函数，综合判断aff+事业阶段返回解锁状态
- engine.js约会冷却：_lastDateDay+_dateConsecutive计数器
- ui.js约会按钮根据checkRomanceUnlock()返回值灰化

### AI prompt重构

prompts.js三段式prompt：[角色设定+当前阶段]→[压缩记忆摘要]→[今日日程+事件文本]→[写作要求+输出格式]

## 涉及文件（22个）

data.js, state.js, engine.js, cycle.js, romance.js, prompts.js, ui.js, pools/_utils.js, pools/secret-discovery-events.js, pools/special-events.js, pools/ent-schedules.js, pools/trainee-stages.js(new), pools/index.js, ui-renderer.js, AGENTS.md

## 潜在问题与应对

| 问题 | 应对 |
| --- | --- |
| 旧存档无新字段 | migrateSave兜底初始化 |
| CHAPTERS从4变6 | chapterNameOf/chapterIconOf已在用idx-1自然适配 |
| 子池30条用完 | fallback到TRAINEE_POOL(50条) |
| 事件弹窗类型debutEvent新注册 | 仿brandOffer/fanLetter模式在ui.js注册渲染函数 |