---
name: pool-no-reuse-expansion
overview: 将25个场景灵感池子的素材改为"每条不重复使用"的 commit-only 消耗模型，目标覆盖200轮（含拉扯/情敌/冷战斗等非最优路线），总计332→890条。
todos:
  - id: rework-injection-logic
    content: 改造 prompts.js 注入逻辑：新增 _inspUsedTexts Set + 修改 addPoolCandidates 过滤已用条目 + injectPoolInspirations 注入后标记消耗
    status: completed
  - id: expand-romance-pools
    content: 扩充恋爱场景6池：BACKSTAGE(22→65) + LATENIGHT(17→60) + PUBLIC(17→60) + CRISIS(12→45) + JEALOUSY(12→30) + CONFESSION(11→25)
    status: completed
  - id: expand-atmosphere-calendar
    content: 扩充氛围3池+日历池：WEATHER(12→35) + MOOD(12→35) + HIS_STATE(12→35) + CALENDAR(52→70)
    status: completed
  - id: expand-encounter-pools
    content: 扩充偶遇4池：ENCOUNTER_ML(14→50) + RIVAL(5→25) + BROTHER(5→25) + OTHERS(9→25)
    status: completed
  - id: expand-secret-pools
    content: 扩充地下恋4池：COMMS(10→25) + NEARMISS(11→30) + FAN_CLUES(10→30) + COMPANY(8→25)
    status: completed
  - id: expand-drama-pools
    content: 扩充剧情节奏5池：ALMOST(11→25) + MISUNDERSTAND(10→30) + COLDWAR(10→30) + DATING_RUMOR(10→30) + DILEMMA(9→25)
    status: completed
  - id: expand-milestone-pools
    content: 扩充里程碑2池：AWARDS(12→30) + FIRST_WIN(9→25)
    status: completed
  - id: update-sim-and-verify
    content: 更新 simulate-no-reuse.mjs 为 commit-only 模型，运行200轮验证，确保0池耗尽
    status: completed
    dependencies:
      - rework-injection-logic
      - expand-romance-pools
      - expand-atmosphere-calendar
      - expand-encounter-pools
      - expand-secret-pools
      - expand-drama-pools
      - expand-milestone-pools
---

## 用户需求

将25个场景灵感池子的素材改为"每条不重复使用"机制：同一场景提示文本在整局游戏中最多注入AI一次。不节流——保持全部25个池子每轮都参与候选抽取。素材总量需覆盖完整6章节约200轮游戏内容。

### 为什么是200轮

150轮为最优路线假设（直线冲男主HE）。实际玩家会走非最优路线：

- 跟男主拉扯（push-pull dynamics），好感增长更慢
- 走一会情敌路线试探
- 吃醋冷战反复
- 纠结不选 / 拖延告白
- 这些非最优行为都会拖长总回合

200轮为真实游玩提供了约33%的冗余空间，确保即使玩家在男主和情敌之间徘徊，池子也不会枯竭。

## Commit-Only 消耗模型

- 新建模块级 `Set` 存储已被注入过的 text
- `addPoolCandidates` 抽选时跳过已用 text（但候选池仍正常组装）
- 仅在最终注入的4条确定后，才将其 text 加入"已用"集合
- 进候选但未选中的条目下次仍可抽到，不消耗
- 某池子全部条目用完时静默退出候选，不影响其他池子

## 25池扩充目标（200轮版本）

200轮 × 4条/轮 = 800条总注入需求。总计从332条扩充至890条（buffer ratio 1.11x），需新增558条。

## 技术栈

- 语言：JavaScript (ES Modules)，遵循项目 `var` 风格，字符串用 `+` 拼接
- 运行环境：浏览器（Vite 打包），Node.js 模拟验证
- 涉及文件：`src/ent-sim/prompts.js`（逻辑改造），`src/ent-sim/pools/` 下25个池子文件（内容扩充）

## 实现方案

### 核心思路

在 `injectPoolInspirations` 中引入"已用文本"追踪集合 `_inspUsedTexts`（模块级 Set）。`addPoolCandidates` 不变（仍只读池子数组），但在筛选可用条目时跳过已用 text。最终4条注入后标记消耗。

### 数据流

```
每轮 injectPoolInspirations(E)
  ├─ 遍历25个PoolRegistry → 条件满足 + 池未耗尽 → addPoolCandidates()
  │   └─ 跳过 _inspUsedTexts 中已有的text → 抽count条 → 加入candidates
  ├─ candidates中随机选 min(4, len) 条 → picked[]
  ├─ picked[].text 全部加入 _inspUsedTexts（消费标记）
  └─ 返回注入text
```

### 关键设计决策

1. **不修改池子原始数组**：`addPoolCandidates` 仍用 `filtered.slice()` 拷贝，只读不写。消耗由 `_inspUsedTexts` Set 追踪。
2. **模块级 Set 而非 GS 状态字段**：随页面生命周期存在，不需要写存档，刷新页面重新开始。
3. **消耗检查位置**：在 `addPoolCandidates` 的 `canTrigger` 之后、随机抽取之前做 `_inspUsedTexts.has(entry.text)` 过滤。
4. **不改变注入条数**：每轮仍选 min(4, candidates.length) 条。

### 增幅策略

恋爱/拉扯相关池子增幅最大（ROMANCE 新目标 60-65条，ENCOUNTER 新目标 25-50条，DRAMA 新目标 25-30条），因为200轮中多出的50轮恰是"非最优路线"消耗——吃醋、冷战斗、情敌互动、偶遇、误会澄清。氛围池从12→35条，日历扩充到70条防止后期重复。

## 详细修改内容

### 文件1：`src/ent-sim/prompts.js` — 注入逻辑改造

- `var _inspUsedTexts = new Set();` — 追踪已注入 text
- `function _resetInspUsedTexts()` — 清空 Set，挂到 `window.__resetInspUsedTexts`
- 修改 `addPoolCandidates`：在 `canTrigger` 之后 `if (_inspUsedTexts.has(entry.text)) continue;`
- 修改 `injectPoolInspirations`：`picked` 确定后 `picked.forEach(function(p) { _inspUsedTexts.add(p.text); })`

### 文件2-26：25个池子文件内容扩充

| 池子 | 当前 | 新目标(200轮) | 新增 | 策略说明 |
| --- | --- | --- | --- | --- |
| ATMOSPHERE_WEATHER | 12 | 35 | +23 | 氛围池全程高活跃，按1.3x扩容 |
| ATMOSPHERE_MOOD | 12 | 35 | +23 | 同上 |
| ATMOSPHERE_HIS_STATE | 12 | 35 | +23 | 同上 |
| CALENDAR_EVENTS | 52 | 70 | +18 | 日历事件基数大，按1.08x微调 |
| ROMANCE_BACKSTAGE | 22 | 65 | +43 | 后台暧昧，非最优路线重点消耗 |
| ROMANCE_LATENIGHT | 17 | 60 | +43 | 深夜暧昧，拉扯期高频池 |
| ROMANCE_PUBLIC | 17 | 60 | +43 | 公共场合暗涌 |
| ROMANCE_CRISIS | 12 | 45 | +33 | 危机事件，情敌路线核心池 |
| ROMANCE_JEALOUSY_POOL | 12 | 30 | +18 | 吃醋场景，情敌路线直接消耗 |
| ROMANCE_CONFESSION | 11 | 25 | +14 | 告白池，拖延告白会增加消耗 |
| ENCOUNTER_ML | 14 | 50 | +36 | 男主偶遇，所有路线必走 |
| ENCOUNTER_RIVAL | 5 | 25 | +20 | 情敌偶遇，原5条太少 |
| ENCOUNTER_BROTHER | 5 | 25 | +20 | 哥哥偶遇，支线消耗 |
| ENCOUNTER_OTHERS | 9 | 25 | +16 | 第三人偶遇 |
| SECRET_COMMS | 10 | 25 | +15 | 秘密通讯 |
| SECRET_NEARMISS | 11 | 30 | +19 | 差点被发现 |
| SECRET_FAN_CLUES | 10 | 30 | +20 | 粉丝线索 |
| SECRET_COMPANY | 8 | 25 | +17 | 公司警告 |
| DRAMA_ALMOST | 11 | 25 | +14 | 差点告白/暧昧升温 |
| DRAMA_MISUNDERSTAND | 10 | 30 | +20 | 误会，冷战期核心池 |
| DRAMA_COLDWAR | 10 | 30 | +20 | 冷战，非最优路线核心池 |
| DRAMA_DATING_RUMOR | 10 | 30 | +20 | 绯闻池 |
| DRAMA_DILEMMA | 9 | 25 | +16 | 两难困境 |
| MILESTONE_AWARDS | 12 | 30 | +18 | 颁奖里程碑 |
| MILESTONE_FIRST_WIN | 9 | 25 | +16 | 第一次获奖 |
| **总计** | **332** | **890** | **+558** |  |


### 文件27：`scripts/simulate-no-reuse.mjs` — 验证脚本更新

更新模拟脚本为 commit-only 模型，运行200轮验证，确认0池耗尽。

## 目录结构

```
src/ent-sim/
├── prompts.js                    # [MODIFY] 注入逻辑改造
└── pools/
    ├── atmosphere-weather.js     # [MODIFY] 12→35条
    ├── atmosphere-mood.js        # [MODIFY] 12→35条
    ├── atmosphere-his-state.js   # [MODIFY] 12→35条
    ├── calendar-events.js        # [MODIFY] 52→70条
    ├── romance-backstage.js      # [MODIFY] 22→65条
    ├── romance-latenight.js      # [MODIFY] 17→60条
    ├── romance-public.js         # [MODIFY] 17→60条
    ├── romance-crisis.js         # [MODIFY] 12→45条
    ├── romance-jealousy.js       # [MODIFY] 12→30条
    ├── romance-confession.js     # [MODIFY] 11→25条
    ├── encounter-ml.js           # [MODIFY] 14→50条
    ├── encounter-rival.js        # [MODIFY] 5→25条
    ├── encounter-brother.js      # [MODIFY] 5→25条
    ├── encounter-others.js       # [MODIFY] 9→25条
    ├── secret-comms.js           # [MODIFY] 10→25条
    ├── secret-nearmiss.js        # [MODIFY] 11→30条
    ├── secret-fan-clues.js       # [MODIFY] 10→30条
    ├── secret-company-warning.js # [MODIFY] 8→25条
    ├── drama-almost.js           # [MODIFY] 11→25条
    ├── drama-misunderstand.js    # [MODIFY] 10→30条
    ├── drama-coldwar.js          # [MODIFY] 10→30条
    ├── drama-dating-rumor.js     # [MODIFY] 10→30条
    ├── drama-dilemma.js          # [MODIFY] 9→25条
    ├── milestone-awards.js       # [MODIFY] 12→30条
    └── milestone-first-win.js    # [MODIFY] 9→25条

scripts/
└── simulate-no-reuse.mjs         # [MODIFY] 200轮验证
```