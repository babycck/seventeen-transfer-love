---
name: entSim紧急修复计划
overview: 修复 entSim（娱乐圈模拟器）当前被玩家存档验证出的运行时崩溃、行为异常、存档数据一致性、日记显示、时段门控与剧情逻辑错位等8类问题。
todos:
  - id: fix-runtime-and-diary
    content: 修复 pickBuzzComments 未定义崩溃与日记双入口显示异常
    status: pending
  - id: fix-hidingout
    content: 修复「避风头」点击后立即生成剧情的行为
    status: pending
  - id: fix-save-consistency
    content: 修复存档数据一致性：人气、订阅、秘密、队友数、职业同步、日记计数
    status: pending
  - id: fix-schedule-gating
    content: 修复日程池时段/章节门控：章节池、COMMON_POOL、练习生 fallback
    status: pending
  - id: fix-debut-day
    content: 修复出道日议程顺序与出道过渡池时间过滤
    status: pending
    dependencies:
      - fix-schedule-gating
  - id: fix-affection-gating
    content: 修复低好感度越级暧昧与曝光事件门控/数值
    status: pending
    dependencies:
      - fix-save-consistency
  - id: verify-remaining
    content: 使用 [subagent:code-explorer] 扫描剩余剧情生成逻辑并回归验证
    status: pending
    dependencies:
      - fix-runtime-and-diary
      - fix-hidingout
      - fix-save-consistency
      - fix-schedule-gating
      - fix-debut-day
      - fix-affection-gating
---

## 产品概述

修复《换乘恋爱 × SEVENTEEN》娱乐圈模拟器（entSim 模式）当前暴露的一组运行时错误、存档数据一致性错误、剧情生成时段/状态门控缺失问题，使剧情生成符合当前游戏阶段、好感度与职业状态。

## 核心问题

1. 生产构建运行时崩溃：`pickBuzzComments is not defined`
2. 点击「避风头」按钮后立即生成剧情，行为不符预期
3. 存档数据错乱：人气崩溃、时间线错位、职业身份不一致、女团队友数量不足、秘密条目重复、日记计数不一致、bubble 订阅数与人气倒挂
4. 看不到日记：手机 App 入口读取 `_diaryEntries` 数据缺失/格式错误，与独立弹窗双入口不同步
5. 出道日/出道后事件池门控缺失：出道当天仍可能触发练习生期事件（公司审核、月末评价），已出道剧情未锚定出道当天核心场景
6. 章节池与通用池混入高阶日程：第一章池含「年末新人舞台」「颁奖礼」「红毯试装」等，`COMMON_POOL` 含出道后专属内容且无门控
7. 低好感度下越级暧昧：好感度 5 即生成「同款衣角」「红毯回头图」「恋情曝光」等高暧昧/高曝光剧情
8. 曝光惩罚数值过严：单次 -7 可让人气从个位数掉到 1，后续玩法基本锁死

## Tech Stack Selection

- 语言：JavaScript（ES Modules），保持现有 `var` / `+` 拼接风格
- 框架：Vanilla JS + Vite，不引入新依赖
- 目标文件：集中在 `src/ent-sim/ui.js`、`src/ent-sim/engine.js`、`src/ent-sim/cycle.js`、`src/ent-sim/pools/` 各池文件
- 安全规范：所有新插入 DOM 的文本继续走 `escHtml()`；不删除 `src/app.js.backup`

## Implementation Approach

采用「最小改动 + 门控补齐 + 数据兜底」的策略：

1. **运行时错误**：在 `src/ent-sim/ui.js` 本地补定义 `pickBuzzComments(item, count)`，按条目类别/标题倾向从 `BUZZ_COMMENT_POOL` 抽取。
2. **日记双入口同步**：让手机 App 的 `renderDiaryInnerFS()` 直接消费 `E.diary` 与 `E.diaryHis`（与独立弹窗一致），并补齐 `_diaryEntries` 的 `text` 字段生成逻辑。
3. **避风头行为修正**：确认 `goEntSimNextDay` 只推进天数、生成每日 buzz/朋友圈/事件提示，不直接生成主剧情；若 `rerender` 把 pending 剧情带出，则在 UI 层加标记，跳过 pending 主剧情渲染。
4. **存档数据一致性**：在 `state.js` 迁移函数里对旧存档兜底初始化缺失字段；在 `engine.js` 触发出道/职业转换时同步 `heroineProfile.profession`；统一 `bubble.subscribers = f(popularity)`；修复秘密追加时的去重；修正 `_diaryCounter` 计数。
5. **日程池时段门控**：给 `ent-schedules.js` 各章节池与 `COMMON_POOL` 条目补充 `require: 'chapter>=N'` / `require: 'debut'` / `require: 'trainee'` 等；修复 `cycle.js` 中 `filterByRequire` 为空时错误 fallback 到 `TRAINEE_EARLY_POOL` 的问题。
6. **出道日锚点**：调整 `engine.js` 中 `rollDailyAgenda()` 与 `advanceTraineeStage()` 的调用顺序，出道判定后重新锁定出道日程；出道当天优先从出道专属子池抽取。
7. **低好感度门控**：给 `TRAINEE_ROMANCE_POOL` 加 `minAff`/`maxAff`；给事件池统一走 `canTrigger` / `filterByRequire`；曝光事件增加 `affection` 与 `scandalHeat` 双门控，并降低单次惩罚幅度（设置下限保护）。
8. **回归验证**：使用 `code-explorer` 子代理对剩余剧情生成链路进行二次扫描，确保没有新的时段/状态错位。

## Implementation Notes

- 所有池子过滤优先复用现有 `canTrigger` / `filterByRequire`，不新增调度器。
- 曝光惩罚改为阶梯式：轻度（1-3）小幅扣，中度（4-7）中等扣，重度（8+）才大幅扣，并保证 popularity 不低于 3，避免锁死玩法。
- 出道判定后立即 `saveGame()`，防止刷新后状态回退。
- 旧存档迁移：新增 `migrateEntSimSave()` 在 `state.js` 中，对缺失字段兜底，避免已坏存档继续恶化。
- 不新建 UI，仅复用已有弹窗与面板。

## Architecture Design

```
src/ent-sim/
├── ui.js               # [MODIFY] 补 pickBuzzComments，统一日记入口
├── engine.js           # [MODIFY] 避风头/出道顺序/曝光门控/数据同步
├── cycle.js            # [MODIFY] rollDailyAgenda 过滤与出道日锁定
├── state.js            # [MODIFY] 迁移兜底 entSim 缺失字段
├── public-opinion.js   # [MODIFY] 曝光惩罚阶梯与下限保护
└── pools/
    ├── ent-schedules.js      # [MODIFY] 章节池/COMMON_POOL 加 require
    ├── debut-transition.js   # [MODIFY] 按出道时间过滤 cat
    ├── trainee-romance-pool.js # [MODIFY] 加 minAff/maxAff
    ├── company-events.js     # [MODIFY] 练习生事件加 debutDay=0
    └── _utils.js             # [MODIFY/VERIFY] 确保 canTrigger 支持新 require 格式
```

## Key Code Structures

```js
// 新增/补齐的函数签名（示意）
function pickBuzzComments(item, count) { /* 按倾向抽评论 */ }

function filterAgendaByState(pool, E) {
  // 按 chapter/debut/trainee/aff 过滤日程池
}

function applyExposurePenalty(magnitude) {
  // 阶梯式惩罚并保底下限
}
```

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在主要修复完成后，对 entSim 剩余剧情生成链路进行二次扫描，补全被截断的审查报告中未覆盖的事件守卫、曝光惩罚、好感度推进、弹窗队列等问题。
- Expected outcome: 输出一份剩余风险清单（文件路径、行号、问题描述、修复建议），供后续迭代使用。