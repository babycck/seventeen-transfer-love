---
name: pool-no-reuse-expansion
overview: 实现池子"每条不重复"机制 + 按150回合目标批量扩充25个池子到足够大小，确保6章节×3年合约线不走空。
todos:
  - id: rework-injection-logic
    content: 改造 prompts.js 注入逻辑：新增 _inspUsedTexts Set + 修改 addPoolCandidates 过滤已用条目 + injectPoolInspirations 注入后标记消耗
    status: pending
  - id: expand-romance-pools
    content: 扩充恋爱场景6池：ROMANCE_BACKSTAGE(22→50) + LATENIGHT(17→45) + PUBLIC(17→45) + CRISIS(12→35) + JEALOUSY(12→25) + CONFESSION(11→20)
    status: pending
  - id: expand-atmosphere-calendar
    content: 扩充氛围3池+日历池：ATMOSPHERE_WEATHER(12→30) + MOOD(12→30) + HIS_STATE(12→30) + CALENDAR_EVENTS(52→65)
    status: pending
  - id: expand-encounter-pools
    content: 扩充偶遇4池：ENCOUNTER_ML(14→40) + RIVAL(5→20) + BROTHER(5→20) + OTHERS(9→20)
    status: pending
  - id: expand-secret-pools
    content: 扩充地下恋4池：SECRET_COMMS(10→20) + NEARMISS(11→25) + FAN_CLUES(10→25) + COMPANY(8→20)
    status: pending
  - id: expand-drama-pools
    content: 扩充剧情节奏5池：DRAMA_ALMOST(11→20) + MISUNDERSTAND(10→25) + COLDWAR(10→25) + DATING_RUMOR(10→25) + DILEMMA(9→20)
    status: pending
  - id: expand-milestone-pools
    content: 扩充里程碑2池：MILESTONE_AWARDS(12→25) + FIRST_WIN(9→20)
    status: pending
  - id: update-sim-and-verify
    content: 更新 simulate-no-reuse.mjs 为 commit-only 模型，运行150轮验证，确保0池耗尽
    status: pending
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

将25个场景灵感池子的素材改为"每条不重复使用"机制：同一场景提示文本在整局游戏中最多注入AI一次。不节流——保持全部25个池子每轮都参与候选抽取。素材总量需覆盖完整6章节约150轮游戏内容。

## Commit-Only 消耗模型

现状 `injectPoolInspirations` 每轮从全部符合条件的池子中抽1-2条进候选池（15-28条），再随机选4条注入AI。`addPoolCandidates` 不修改原始池子数组（只读），所以实际永不消耗。新模型的核心改动：

- 新建模块级 `Set` 存储已被注入过的 text
- `addPoolCandidates` 抽选时跳过已用 text（但候选池仍正常组装）
- 仅在最终注入的4条确定后，才将其 text 加入"已用"集合
- 进候选但未选中的条目下次仍可抽到，不消耗
- 某池子全部条目用完时静默退出候选，不影响其他池子

## 25池扩充目标

基于 commit-only 模型 + 150轮 + 每条不重复，每轮4条注入共600条总消耗。按各池活跃窗口和抽数比例分配：

总计从332条扩充至645条，需新增313条内容。

## 技术栈

- 语言：JavaScript (ES Modules)，遵循项目 `var` 风格，字符串用 `+` 拼接
- 运行环境：浏览器（Vite 打包），Node.js 模拟验证
- 涉及文件：`src/ent-sim/prompts.js`（逻辑改造），`src/ent-sim/pools/` 下25个池子文件（内容扩充）

## 实现方案

### 方案：Commit-Only 消耗 + 全面扩充池子

**核心思路**：在 `injectPoolInspirations` 中引入"已用文本"追踪集合。`addPoolCandidates` 不变（仍只读池子数组），但在筛选可用条目时跳过 `_inspUsedTexts`。最终4条注入后记录消耗。同时将所有25个池子按计算目标扩充内容。

**数学原理**：

- 150轮 × 4条/轮 = 600条总注入
- 某池子预期消耗 = 活跃轮数 × (该池抽数 / 候选池总数) × 4
- 早期（aff小于20，候选池仅4条）→ 氛围池几乎100%注入
- 中期（aff大于等于20，候选池约14条）→ 各池注入概率 = 抽数/14 × 4
- 后期（aff大于等于60，候选池约25条）→ 各池注入概率 = 抽数/25 × 4

**数据流**：

```
每轮 injectPoolInspirations(E)
  ├─ 遍历25个PoolRegistry → 条件满足 + 池未耗尽 → addPoolCandidates()
  │   └─ 跳过 _inspUsedTexts 中已有的text → 抽count条 → 加入candidates
  ├─ candidates中随机选 min(4, len) 条 → picked[]
  ├─ picked[].text 全部加入 _inspUsedTexts（消费标记）
  └─ 返回注入text
```

### 关键设计决策

1. **不修改池子原始数组**：`addPoolCandidates` 仍用 `filtered.slice()` 拷贝，只读不写。消耗由 `_inspUsedTexts` Set 追踪，避免污染导出的静态数据。
2. **模块级 Set 而非 GS 状态字段**：`_inspUsedTexts` 是 `prompts.js` 模块闭包变量，随页面生命周期存在。不需要写存档，刷新页面重新开始即可。
3. **消耗检查位置**：在 `addPoolCandidates` 的 `canTrigger` 之后、随机抽取之前做 `_inspUsedTexts.has(entry.text)` 过滤。过滤后若无可用条目，返回空数组，调用方跳过该池。
4. **不改变注入条数**：每轮仍选 min(4, candidates.length) 条，维持AI创作多样性。

### 性能

- `_inspUsedTexts` 是 Set，has/add 均为 O(1)
- 150轮最多600条 text 入 Set，内存占用可忽略
- 不增加额外的 IO 或网络开销

## 详细修改内容

### 文件1：`src/ent-sim/prompts.js` — 注入逻辑改造

**修改点1**：在 import 区域之后新增模块级变量和辅助函数：

- `var _inspUsedTexts = new Set();` — 追踪已注入 text
- `function _resetInspUsedTexts()` — 清空 Set（游戏重置时调用，挂到 window 上）
- 修改 `addPoolCandidates`：在 `canTrigger` 之后添加 `if (_inspUsedTexts.has(entry.text)) continue;`
- 修改 `injectPoolInspirations`：在 `picked` 确定后循环 `picked.forEach(function(p) { _inspUsedTexts.add(p.text); })`

**修改点2**：在 `injectPoolInspirations` 函数末尾的返回之前，加入消耗标记。

**修改点3**：导出 `resetInspUsedTexts` 到 window（或在 state.js 初始化时调用）。

### 文件2-26：25个池子文件内容扩充

各池子文件均在现有数组末尾追加新条目，保持 `{ key, text, require? }` 格式。所有 text 字段遵循：

- 中文叙事风格，第二人称"你"
- 100-200字场景描写
- 围绕各自主题（后台/深夜/公共/危机/吃醋/告白/偶遇/秘密/误会/冷战/绯闻/困境/颁奖/里程碑/天气/心情/男主状态/日历节日）

**各池扩充明细**：

| 池子 | 当前 | 目标 | 新增 | 文件路径 |
| --- | --- | --- | --- | --- |
| ATMOSPHERE_WEATHER | 12 | 30 | 18 | pools/atmosphere-weather.js |
| ATMOSPHERE_MOOD | 12 | 30 | 18 | pools/atmosphere-mood.js |
| ATMOSPHERE_HIS_STATE | 12 | 30 | 18 | pools/atmosphere-his-state.js |
| CALENDAR_EVENTS | 52 | 65 | 13 | pools/calendar-events.js |
| ROMANCE_BACKSTAGE | 22 | 50 | 28 | pools/romance-backstage.js |
| ROMANCE_LATENIGHT | 17 | 45 | 28 | pools/romance-latenight.js |
| ROMANCE_PUBLIC | 17 | 45 | 28 | pools/romance-public.js |
| ROMANCE_CRISIS | 12 | 35 | 23 | pools/romance-crisis.js |
| ROMANCE_JEALOUSY_POOL | 12 | 25 | 13 | pools/romance-jealousy.js |
| ROMANCE_CONFESSION | 11 | 20 | 9 | pools/romance-confession.js |
| ENCOUNTER_ML | 14 | 40 | 26 | pools/encounter-ml.js |
| ENCOUNTER_RIVAL | 5 | 20 | 15 | pools/encounter-rival.js |
| ENCOUNTER_BROTHER | 5 | 20 | 15 | pools/encounter-brother.js |
| ENCOUNTER_OTHERS | 9 | 20 | 11 | pools/encounter-others.js |
| SECRET_COMMS | 10 | 20 | 10 | pools/secret-comms.js |
| SECRET_NEARMISS | 11 | 25 | 14 | pools/secret-nearmiss.js |
| SECRET_FAN_CLUES | 10 | 25 | 15 | pools/secret-fan-clues.js |
| SECRET_COMPANY | 8 | 20 | 12 | pools/secret-company-warning.js |
| DRAMA_ALMOST | 11 | 20 | 9 | pools/drama-almost.js |
| DRAMA_MISUNDERSTAND | 10 | 25 | 15 | pools/drama-misunderstand.js |
| DRAMA_COLDWAR | 10 | 25 | 15 | pools/drama-coldwar.js |
| DRAMA_DATING_RUMOR | 10 | 25 | 15 | pools/drama-dating-rumor.js |
| DRAMA_DILEMMA | 9 | 20 | 11 | pools/drama-dilemma.js |
| MILESTONE_AWARDS | 12 | 25 | 13 | pools/milestone-awards.js |
| MILESTONE_FIRST_WIN | 9 | 20 | 11 | pools/milestone-first-win.js |


### 文件27：`scripts/simulate-no-reuse.mjs` — 验证脚本更新

更新模拟脚本以使用新的 commit-only 模型，重新跑3次150轮模拟，确认0个池子耗尽。

## 目录结构

```
src/ent-sim/
├── prompts.js                    # [MODIFY] 注入逻辑改造：+_inspUsedTexts Set + addPoolCandidates 过滤 + picked后标记消耗
└── pools/
    ├── atmosphere-weather.js     # [MODIFY] 12→30条
    ├── atmosphere-mood.js        # [MODIFY] 12→30条
    ├── atmosphere-his-state.js   # [MODIFY] 12→30条
    ├── calendar-events.js        # [MODIFY] 52→65条
    ├── romance-backstage.js      # [MODIFY] 22→50条
    ├── romance-latenight.js      # [MODIFY] 17→45条
    ├── romance-public.js         # [MODIFY] 17→45条
    ├── romance-crisis.js         # [MODIFY] 12→35条
    ├── romance-jealousy.js       # [MODIFY] 12→25条
    ├── romance-confession.js     # [MODIFY] 11→20条
    ├── encounter-ml.js           # [MODIFY] 14→40条
    ├── encounter-rival.js        # [MODIFY] 5→20条
    ├── encounter-brother.js      # [MODIFY] 5→20条
    ├── encounter-others.js       # [MODIFY] 9→20条
    ├── secret-comms.js           # [MODIFY] 10→20条
    ├── secret-nearmiss.js        # [MODIFY] 11→25条
    ├── secret-fan-clues.js       # [MODIFY] 10→25条
    ├── secret-company-warning.js # [MODIFY] 8→20条
    ├── drama-almost.js           # [MODIFY] 11→20条
    ├── drama-misunderstand.js    # [MODIFY] 10→25条
    ├── drama-coldwar.js          # [MODIFY] 10→25条
    ├── drama-dating-rumor.js     # [MODIFY] 10→25条
    ├── drama-dilemma.js          # [MODIFY] 9→20条
    ├── milestone-awards.js       # [MODIFY] 12→25条
    └── milestone-first-win.js    # [MODIFY] 9→20条

scripts/
└── simulate-no-reuse.mjs         # [MODIFY] 更新模拟逻辑为 commit-only 模型
```