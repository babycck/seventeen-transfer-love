---
name: manual-update-and-stage-gating
overview: 全面更新娱乐圈模拟器使用手册（全文同步）+ 为无阶段感知的事件池添加出道门控
todos:
  - id: update-manual-sections-0-4
    content: 更新手册 §0-§4：职业线、开局、人气、章节描述同步当前代码
    status: completed
  - id: update-manual-sections-5-7
    content: 更新手册 §5-§7：女团专属、职业设定、好感系统同步当前代码
    status: completed
    dependencies:
      - update-manual-sections-0-4
  - id: fix-pool-counts-section-11
    content: 修正手册 §11 所有池子条目数为审计真实值，加入阶段门控标注列
    status: completed
  - id: add-pool-priority-doc
    content: 新增 §11A"池子优先级与触发条件"章节（4类消费入口+门控一览表）
    status: completed
    dependencies:
      - fix-pool-counts-section-11
  - id: gate-brother-events
    content: 给 brother.js 中无阶段门控的事件池加上 isDebut 检查
    status: completed
  - id: gate-engine-popups
    content: 给 engine.js 中每日弹窗池加上 isDebut 门控（品牌/综艺/Dispatch/颁奖等）
    status: completed
---

## 用户需求

1. 全面更新《娱乐圈模拟器使用手册》所有章节（0-11），同步当前代码状态
2. 检查所有池子命名一致性和实际条目数，修正手册中夸大的"200条"声明
3. 新增"池子优先级与阶段门控"文档章节
4. 给无阶段门控的事件池和每日弹窗池加上 `isDebut` 门控，防止练习生阶段触发"回归撞大雾""打歌一位"等不合理事件

## 产品概述

对娱乐圈模拟器（entSim）进行手册文档同步更新，同时修复约29个池子缺少阶段门控的问题。

## 核心功能

- 手册全章同步：职业线简化、日程分阶段、热搜门控、删除的职业池
- 池子数量修正：将手册中夸大的"200条"声明改为审计后的真实条目数
- 新增章节：池子优先级与触发条件一览表（按阶段/人气/好感标注）
- 代码修复：给 brother.js 和 engine.js 中的事件池/弹窗池加上 debutDay 门控

## 技术方案

### 1. 手册全面更新（娱乐圈模拟器使用手册.md）

**§0 游戏介绍**：职业描述从"女团爱豆"更新为"练习生（出道后晋升）"，补充练习生阶段说明

**§1 快速开始**：同步当前开局职业固定为"练习生"

**§3.1 人气**：补充说明练习生阶段人气从3起步、出道时首次跨越章节时 debutDay自动设置

**§4 章节**：更新为5阶段(练习生+4章)、补充日程池切换逻辑(70%章节池+30%通用池)

**§5.7 女团专属**：更新女团事件池数量为实际值，补充练习生期日程说明

**§7 职业设定**：将"本游戏职业写死为女团爱豆"改为"职业写死为练习生（debutDay>0后切换女团爱豆）"

**§11 池子清单**：

- 修正所有池子条目数到审计值（例如第458-464行日程池50条正确保留；第472行EXTERNAL_HOT实际~60条；第477-481行品牌/综艺/杂志/发布/奖项池修正为实际条目数；第486-498行事件池修正为实际条目数）
- 新增阶段门控标注列：用✅/❌标注每个池子是否有isDebut门控
- 新增"§11A 池子优先级与触发条件"新章节，按消费入口分类：
- A. 日程池（cycle.js消费）：练习生→TRAINEE_POOL，出道后→章节池70%+COMMON_POOL30%
- B. 每日舆论池（immersion.js消费）：热搜/星圈/音源榜按isDebut门控
- C. 事件注入池（brother.js消费）：优先级瀑布、每项标注isDebut门控状态
- D. 每日弹窗池（engine.js消费）：人气/好感/曝光门槛、isDebut门控状态

### 2. 代码修复：给事件池加上 debutDay 门控

**文件：src/ent-sim/brother.js — checkOneHeartEvents()**

- 第84-90行：GIRLGROUP_EVENTS已有`profession === '女团爱豆'`门控，改为同时检查`isDebut`
- INDUSTRY_EVENTS/INCIDENT_EVENTS_POOL：当前无任何门控，新增`isDebut`检查，练习生阶段跳过
- CONTACT_PROGRESSION/ONEHEART_RANDOM_EVENTS：好感事件池，加`isDebut`门控（练习生期不触发独处/暧昧事件）
- 其他低影响事件池(BROTHER_EVENT_POOL/JEALOUSY_EVENTS_POOL等)：保留现有逻辑（按好感/概率触发）

**文件：src/ent-sim/engine.js — goEntSimNextDay()**

- 第333-340行品牌代言：已有`popularity>=20`门槛，加`isDebut`检查
- 第355-361行综艺通告：已有`popularity>=25`门槛，加`isDebut`检查
- 第362-364行Dispatch爆料：已有`exposure>=30`门槛，加`isDebut`检查
- 第345-354行季度颁奖：已有`dayCount>=8`门槛，加`isDebut`检查
- 其他弹窗池同理加isDebut兜底
- isDebut取值：`var isDebut = E.career && E.career.debutDay > 0;`