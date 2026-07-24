---
name: oneheart-day1-schedule-strip
overview: 让 1v1 娱乐圈模式的行程条(今日行程/可约时段)在游戏第一天(首屏)即显示,而非要等到点「新的一天」进入第二天才出现。
todos:
  - id: import-schedule
    content: 在 ui-renderer.js 第12行 import 追加 generateOneHeartSchedule
    status: pending
  - id: call-on-init
    content: 在 1v1 Step4 开始回调 saveGame 后插入 generateOneHeartSchedule() 调用
    status: pending
    dependencies:
      - import-schedule
  - id: verify-day1
    content: 启动 dev 进 1v1 娱乐圈验证 Day1 行程条显示且次日刷新正常
    status: pending
    dependencies:
      - call-on-init
---

## 用户需求

在《换乘恋爱 × SEVENTEEN》的「💗只为你心动」1v1 模式中,娱乐圈世界观的「今日行程」日程条需要在进入游戏的第一天就显示,而非当前要等到点「📅 新的一天」进入第二天才出现。

## 产品概述

日程条是一项仅娱乐圈世界观拥有的辅助 UI,展示男主/关系户/情敌的当日行程,以及男主「可约时段」chip(约会入口)与哥哥立场提示。当前其数据 `GS.oneHeartSchedule` 仅在「新的一天」时被 `generateOneHeartSchedule()` 生成,导致 Day 1 为空、strip 被清空不渲染。需求是让 Day 1 首屏即具备该行程数据。

## 核心功能

- 在 1v1 娱乐圈游戏初始化(Step4 开始)时,同步生成首日行程数据 `GS.oneHeartSchedule`。
- 进入游戏第一天,「📅 新的一天」按钮下方即呈现「📋今日行程」+「🕒可约时段」chip。
- 点「新的一天」后行程照常刷新,既有逻辑不受影响;非娱乐圈世界观与换乘恋爱模式不受影响。

## 技术栈

- 既有栈:Vanilla JS (ES Modules) + Vite,模块间通过 `export/import` 共享。`generateOneHeartSchedule` 已在 `src/game-engine.js` 以 `export function` 导出,内部自带 `saveGame()`。

## 实现方案

### 策略

在 1v1 游戏初始化入口(Step4「开始」回调)中,于 `GS.oneHeartMember / oneHeartRelationCharacter / oneHeartRival` 全部就位且 `saveGame()` 之后、`renderAll()` 之前,补调一次 `generateOneHeartSchedule()`,使首日即填充 `GS.oneHeartSchedule`,从而 `renderOneHeartScheduleStrip()` 的闸门 `!GS.oneHeartSchedule` 通过、首屏渲染行程条。

### 关键技术与决策

- **改动极小、零新增逻辑**:仅复用已存在的 `generateOneHeartSchedule`,不新增字段或函数,完全符合 AGENTS.md「make minimal, focused changes」与「不引入新依赖」约束。
- **调用时机安全**:该函数依赖 `oneHeartMember`、`oneHeartRelationCharacter`、`oneHeartRival`,均在 `saveGame()`(ui-renderer.js:1174)前完成设定;函数同步执行、内部自带 `saveGame()`(game-engine.js:2130),无副作用风险。
- **幂等性**:Day 2 起仍由 `proceedToNextDay`(game-engine.js:2246)调用,首日补调不影响后续刷新逻辑;`generateOneHeartSchedule` 内部 `worldSetting !== 'entertainment'` 早退,确保非娱乐圈世界观/换乘模式无影响。
- **导入补齐**:`ui-renderer.js:12` 的 game-engine 导入列表中当前未含 `generateOneHeartSchedule`,需补充,否则 ReferenceError。

### 性能与可靠性

- 函数为同步随机派生 + 一次 `saveGame()`,开销可忽略,不影响 Day 1 首屏加载。
- 已有存档迁移兜底:`state.js:549` 已对 `oneHeartSchedule` 缺失做 `undefined → null` 兜底,与本次改动兼容。

## 实现备注

- 仅改 `src/ui-renderer.js` 两处:第 12 行 import 追加 `generateOneHeartSchedule`;第 1174 行 `saveGame()` 后插入 `generateOneHeartSchedule();`。
- 保持现有 `var` 风格与字符串 `+` 拼接约定,不引入模板字符串。
- 不触碰 `renderOneHeartScheduleStrip` 渲染逻辑与 CSS,避免回归。

## 目录结构

```
src/
└── ui-renderer.js   # [MODIFY] 1) 第12行 import 从 './game-engine.js' 追加 generateOneHeartSchedule
                     #           2) step4Start(1v1) 回调内,saveGame()(1174) 之后、renderAll()(1178) 之前
                     #              新增 generateOneHeartSchedule(); 使 Day1 即填充 GS.oneHeartSchedule
```

---

# 追加修正 A：深夜约会门槛提高到 好感≥40

## 需求

用户希望「深夜」见面需要更深的感情(好感度 40+),而非当前的 20 即可约。

## 根因

普通约(男主空闲档 chip)门槛在 `ui-renderer.js:2380`:

```js
var _canNormal = _dated ? false : (_stageNow >= 1 || _affNow >= 20);
```

深夜作为空闲档,只需 `好感≥20 或 暧昧期(stage≥1)` 即可约。`initiateOneHeartDate`(`game-engine.js:2185-2187`)的守卫同样只验 `stage≥1 || aff≥20`。

## 改动

- `ui-renderer.js` 可约时段 chip 循环(约 2370-2400):对 `_slot === '深夜'` 改用更高门槛 `(_stageNow >= 2 || _affNow >= 40)`,其余空闲档保持原 `_canNormal`(stage≥1 || aff≥20)。深夜未达标的 chip 显示 `🔒深夜·需好感≥40`(灰色禁用,title 提示)。
- `game-engine.js` `initiateOneHeartDate`(2170):在现有 sneakOut/normal 校验前,对 `slot === '深夜'` 增加专属校验:

```js
if (slot === '深夜') {
if (!(_stageGate >= 2 || _affGate >= 40)) { showToast('🔒 深夜见面需要更深的感情（好感≥40 或明确期）'); return; }
} else if (sneakOut) { ... } else { ... }
```

# 追加修正 B：约会后禁止同日探班(修复"约完深夜还能点午后/傍晚")

## 需求

约完(无论哪个时段)后,当天不应再能「探班」(偷会)任何人,否则出现"约完深夜还能去午后/傍晚探班"的违和。

## 根因

约会后 `GS.oneHeartDateToday = true`,但行程条「探班」按钮禁用判定(`ui-renderer.js:2361`):

```js
var disabled = s.visited || locked || !s.visitWindow;
```

只看 `visited / locked(oneHeartVisitLocked) / visitWindow`,**不参考 `oneHeartDateToday`**。约会不会写入 `oneHeartVisitLocked`,故三行里 timeOfDay 为 午后/傍晚 的探班按钮在深夜约会之后仍然可点。
(注:「可约时段 💞 chip」在约后会被 `_dated` 闸门禁用;用户看到的"还能点"实际是**探班按钮**,二者独立。)

## 改动

- `ui-renderer.js:2361` 的 `disabled` 增加 `|| GS.oneHeartDateToday`:

```js
var disabled = s.visited || GS.oneHeartDateToday || locked || !s.visitWindow;
```

- `ui-renderer.js:2362` 的 `status` 文案增加已约会分支(优先级置于 visited 之后、locked 之前):

```js
var status = s.visited ? '✅已探' : (GS.oneHeartDateToday ? '🔒已约会' : (locked ? '🔒时间已过' : (!s.visitWindow ? '🚫封闭' : '🎬可探')));
```

- `game-engine.js` `doVisitMember`(2134):函数层兜底,在 `oneHeartVisitLocked` 校验之后追加:

```js
if (GS.oneHeartDateToday) { showToast('🔒 今天已经约过啦，先进入新的一天吧'); return; }
```

防御 UI 被绕过(如历史存档直接调用)。

## 影响范围

- 仅娱乐圈世界观 + 1v1 模式受影响;换乘恋爱模式与其他世界观无 `oneHeartSchedule`/`doVisitMember` 约会分支,不触及。
- 既有"探班时间锁(同一天只能探一人)"逻辑不变,仅在约会当日叠加"禁止探班"。
- 非约会日(未约会)探班行为完全不变。

# 实施顺序与验证

1. 先落地原 Day1 行程条修正(import + step4 调用)。
2. 追加修正 A(深夜门槛 40)。
3. 追加修正 B(约后禁探班)。
4. `npm run build` 验证打包通过。
5. dev 进 1v1 娱乐圈:Day1 行程条出现;好感<40 时深夜 chip 灰锁;约完任意时段后,所有探班按钮变 `🔒已约会` 不可点;次日刷新正常。

## 目录结构(完整)

```
src/
├── ui-renderer.js   # [MODIFY] 1) 第12行 import 追加 generateOneHeartSchedule
                     #           2) step4Start(1v1) saveGame()(1174) 后插入 generateOneHeartSchedule();
                     #           3) renderOneHeartScheduleStrip: 探班 disabled 增 ||oneHeartDateToday;
                     #              status 增 '🔒已约会' 分支; 可约时段 chip 循环对 '深夜' 用更高门槛
└── game-engine.js   # [MODIFY] 1) initiateOneHeartDate: slot==='深夜' 增 好感≥40/明确期 校验
                     #           2) doVisitMember: 增 oneHeartDateToday 函数层兜底拦截
```