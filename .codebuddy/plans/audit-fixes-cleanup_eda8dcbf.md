---
name: audit-fixes-cleanup
overview: 修复代码审计发现的3类问题：_lastComebackDay冲突、僵尸import清理、死导出标记
todos:
  - id: fix-comeback-conflict
    content: 修复comeback-cycle.js的_lastComebackDay冲突，改用_cbCycleCooldownDay独立冷却字段
    status: completed
  - id: clean-zombie-imports
    content: 清理engine.js两个僵尸import（ENT_SIM_CAREERS和_TMFLAVOR别名）
    status: completed
  - id: remove-dead-exports
    content: 移除state.js(12个)、romance.js(3个)、npc-network.js(3个)共18个死导出函数的export关键字
    status: completed
  - id: commit-and-push
    content: git commit并push到远程仓库
    status: completed
    dependencies:
      - fix-comeback-conflict
      - clean-zombie-imports
      - remove-dead-exports
---

## 背景

上一轮审计发现18个函数export但从未被外部import、2个僵尸import、1个_lastComebackDay字段冲突bug。本次一次性修复全部问题后push。

## 修复范围

1. **Bug修复**：`comeback-cycle.js`的状态机回归改用独立冷却字段`E._cbCycleCooldownDay`，与`engine.js`弹窗式回归的`E._lastComebackDay`解耦
2. **僵尸Import清理**：`engine.js`移除未使用的`ENT_SIM_CAREERS`和`TEAMMATE_FLAVOR as _TMFLAVOR`
3. **死export移除**：18个函数去掉export关键字，保留函数体（同文件内部调用链不受影响）

## 实现方案

### 修改文件清单

| 文件 | 修改内容 |
| --- | --- |
| `src/ent-sim/pools/comeback-cycle.js` | 第77行`E._lastComebackDay`→`E._cbCycleCooldownDay`，第79行同上 |
| `src/ent-sim/engine.js` | 删第8行`ENT_SIM_CAREERS`import；第26行`TEAMMATE_FLAVOR as _TMFLAVOR`改为只保留`getRandomTeammate, getTeammateDesc` |
| `src/ent-sim/state.js` | 12个函数的`export function`→`function`：rivalNode/suitorNode/entSim/onAirWorkCount/isSisterSettingOn/careerLevelOf/gameDayOf/gameMonthOf/gameYearOf/chapterByPopularity/stageNameOf/recomputeResourcesLevel |
| `src/ent-sim/romance.js` | 3个函数的`export function`→`function`：getRomanceEmotion/checkRomanceUnlock/setEmotion |
| `src/ent-sim/npc-network.js` | 3个函数的`export function`→`function`：getNpcNodes/getNpcInteractions/interactNpc |


### 兼容性保证

- 内部调用链不受影响：rivalNode→suitorNode、onAirWorkCount→recomputeResourcesLevel→careerLevelOf、gameDayOf/gameMonthOf/gameYearOf→formatGameDate/todayBirthday等内部引用链全部保留
- `gameSeasonOf`在state.js内部调用`gameMonthOf`，后者变为非导出后仍可正常调用（同文件作用域）
- 两套回归机制解耦后各自独立运行：engine.js弹窗回归每5天触发（`_lastComebackDay`冷却），comeback-cycle.js状态机回归每50-80天触发（`_cbCycleCooldownDay`冷却）