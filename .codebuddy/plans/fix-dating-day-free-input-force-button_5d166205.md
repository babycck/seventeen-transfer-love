---
name: fix-dating-day-free-input-force-button
overview: 约会日 phase 0 自由输入后，强制把 currentOptions 重设为「▶ 进入约会场景」按钮，替代当前脆弱的"保留"策略，确保按钮在任何情况下都一定出现。
todos:
  - id: fix-free-action
    content: 修复 handleFreeAction：将第 907 行保留策略改为强制重设 + hasEnteredDating 检查
    status: completed
  - id: fix-regenerate
    content: 修复 handleRegenerate：第 1038 行后追加强制重设逻辑（含 last.choiceText 检查）
    status: completed
    dependencies:
      - fix-free-action
  - id: verify-and-recover
    content: 验证修复并提供用户当前存档恢复的临时控制台方案
    status: completed
    dependencies:
      - fix-regenerate
---

## 用户需求

Day9 上午（phase 0）主剧情生成后「进入约会场景」按钮正常显示，但玩家点自由输入框写一段剧情后按钮消失，F5 刷新也无法恢复（存档中 `currentOptions` 已被持久化为空数组）。

## 根因

`game-engine.js` 第 907 行 `handleFreeAction` 内使用"保留"策略：

```js
GS.currentOptions = isDatingDayPhase0 ? GS.currentOptions : [];
```

当 `GS.currentOptions` 因任何原因为空时（如存档残留、HMR 时序、边缘 case），保留出来的仍是空数组。需要改为"强制重设"——与 `generatePhaseNarrative` 第 234 行的固定按钮逻辑一致。

同时 `handleRegenerate`（第 1038 行）在重生成自由输入 consequence 后也会用 AI 返回的 options 覆盖，存在同样的按钮丢失风险。

## 修复目标

1. 约会日（Day 4/6/8/9）phase 0，玩家未进入约会场景前，自由输入后强制塞回「进入约会场景」按钮
2. 玩家已进入约会场景后（点击过按钮），自由输入不再强制塞回（避免重复入口）
3. 重新生成本段时同理处理
4. 用户当前卡住的存档可通过控制台临时方案恢复

## 技术栈

- 现有项目：Vanilla JS (ES Modules) + Vite
- 代码风格：`var`、字符串 `+` 拼接、`for` 循环（与现有代码一致）

## 实现方案

### 核心判断逻辑

通过检查 `GS.consequenceNarratives` 中是否存在 `choiceText` 包含 `'进入约会场景'` 的条目，判断玩家是否已进入约会场景：

- **未进入**（无匹配条目）：强制设置 `currentOptions = [{ label: '▶', text: '▶ 进入约会场景' }]`
- **已进入**（有匹配条目）：不干预，保持 AI 返回的 options 或空数组

此判断方式无需新增状态字段，向后兼容旧存档。

### 修改点 1：`handleFreeAction`（game-engine.js:905-907）

将"保留"策略改为"强制重设"：

```js
// 修改前（保留策略）
var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
GS.currentOptions = isDatingDayPhase0 ? GS.currentOptions : [];

// 修改后（强制重设 + hasEnteredDating 检查）
var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
var hasEnteredDating = false;
for (var ci = 0; ci < GS.consequenceNarratives.length; ci++) {
  if (GS.consequenceNarratives[ci].choiceText &&
      GS.consequenceNarratives[ci].choiceText.indexOf('进入约会场景') >= 0) {
    hasEnteredDating = true;
    break;
  }
}
GS.currentOptions = (isDatingDayPhase0 && !hasEnteredDating)
  ? [{ label: '\u25B6', text: '\u25B6 进入约会场景' }]
  : [];
```

### 修改点 2：`handleRegenerate`（game-engine.js:1038 之后）

在 `GS.currentOptions = parsed.options;` 之后追加同样的强制重设逻辑。需额外检查被 pop 的 `last.choiceText`（因为约会场景的 consequence 已被弹出）：

```js
GS.currentOptions = parsed.options;
// 追加：约会日 phase 0 未进入约会场景时，强制保留按钮
var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
if (isDatingDayPhase0) {
  var hasEnteredDating = (last.choiceText && last.choiceText.indexOf('进入约会场景') >= 0);
  for (var ci = 0; ci < GS.consequenceNarratives.length; ci++) {
    if (GS.consequenceNarratives[ci].choiceText &&
        GS.consequenceNarratives[ci].choiceText.indexOf('进入约会场景') >= 0) {
      hasEnteredDating = true;
      break;
    }
  }
  if (!hasEnteredDating) {
    GS.currentOptions = [{ label: '\u25B6', text: '\u25B6 进入约会场景' }];
  }
}
```

### 边缘情况覆盖

| 场景 | isDatingDayPhase0 | hasEnteredDating | 结果 |
| --- | --- | --- | --- |
| 主剧情后直接自由输入 | true | false | 强制按钮 |
| 点过约会按钮后自由输入 | true | true | 不干预（AI options 或空） |
| 非约会日自由输入 | false | - | `[]`（原逻辑） |
| 重生成自由输入 consequence | true | false | 强制按钮 |
| 重生成约会场景 consequence | true | true（last 含匹配） | 不干预 |


### 用户当前存档恢复

用户当前存档 `currentOptions` 已为空数组，代码修复后需要触发一次 `handleFreeAction` 才能生效。提供控制台临时方案（不依赖 `GS` 全局变量）：

```js
var s = JSON.parse(localStorage.getItem('local_game_state'));
s.currentOptions = [{label:'\u25B6',text:'\u25B6 进入约会场景'}];
localStorage.setItem('local_game_state', JSON.stringify(s));
location.reload();
```

## 目录结构

```
src/
└── game-engine.js  [MODIFY]
    ├── 第 905-907 行：handleFreeAction — 改"保留"为"强制重设" + hasEnteredDating 检查
    └── 第 1038 行后：handleRegenerate — 追加强制重设逻辑（含 last.choiceText 检查）
```

## 实现备注

- 使用 `'\u25B6'` 而非 `'▶'`，与 `generatePhaseNarrative` 第 234 行保持一致
- `for` 循环 + `indexOf` 而非 `.some()`，与文件内其他代码风格一致（虽然项目中有用 `.some()`，但此处保持局部一致）
- 不新增状态字段，不修改 `defaultGameState` / `migrateSave`，向后兼容所有旧存档
- 不修改渲染层（`option-panel.js`），渲染条件 `opts.length > 0` 已满足需求
- 修改范围仅 `game-engine.js` 一个文件两处，blast radius 最小