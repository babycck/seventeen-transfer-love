---
name: fix-dating-day-free-input-keep-button
overview: 修复 Day 9 等约会日 phase 0 自由输入后"进入约会场景"按钮被清空的 bug。不禁用自由输入框，玩家可自由使用；但 handleFreeAction 在约会日 phase 0 执行后不清空 currentOptions，保留"进入约会场景"按钮，让玩家扩写完剧情后仍能点击进入约会。
todos:
  - id: preserve-dating-options
    content: game-engine.js handleFreeAction 第 905 行：currentOptions 约会日 phase 0 保留原值
    status: completed
  - id: exhausted-bypass-dating
    content: option-panel.js 第 9 行：渲染条件增加 isDatingDayPhase0 豁免配额检查
    status: completed
    dependencies:
      - preserve-dating-options
---

## 产品概述

修复约会日（Day 4/6/8/9）phase 0 玩家使用自由输入框后"▶ 进入约会场景"按钮消失的 bug。自由输入框保持可用，但扩写剧情后必须保留约会入口按钮。

## 核心功能

- 约会日 phase 0 自由输入框正常可用，玩家可以写自定义剧情
- 自由剧情扩写完成后，"▶ 进入约会场景"按钮仍然显示，玩家可随时点击进入约会流程
- 即使本时段行动次数用完（phaseChoicesExhausted），约会入口按钮也不受配额限制

## Tech Stack

- Vanilla JS (ES Modules), Vite 5.4
- 遵循项目约定：`var` 声明、`+` 字符串拼接、最小改动

## Implementation Approach

### 根因

`handleFreeAction`（game-engine.js:905）执行 `GS.currentOptions = []` 无条件清空选项。在约会日 phase 0，`generatePhaseNarrative` 设定的 `GS.currentOptions = [{ text: '▶ 进入约会场景' }]` 被清掉，约会流程被打断。

此外，即使保留 currentOptions，`option-panel.js:9` 的渲染条件 `(!phaseChoicesExhausted || isDay11)` 在行动次数耗尽时也会阻止按钮渲染。约会日 phase 0 需要像 Day 11 一样豁免配额检查。

### 修复方案

**修改 1：`src/game-engine.js`（第 905 行）**

将 `GS.currentOptions = []` 改为条件赋值——约会日 phase 0 保留原选项：

```js
var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
GS.currentOptions = isDatingDayPhase0 ? GS.currentOptions : [];
```

**修改 2：`src/ui/option-panel.js`（第 9 行）**

渲染条件增加约会日 phase 0 豁免，使按钮在配额耗尽后仍可渲染：

```js
var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
if (opts.length > 0 && (!phaseChoicesExhausted || isDay11 || isDatingDayPhase0) && !isNight) {
```

### 不改动项

- `free-input.js` 不禁用输入框（用户明确要求可用）
- `prompts.js` freeAction 分支不变
- `action-bar.js` 不变（配额耗尽只影响按钮样式加粗，不影响是否渲染）
- `handleOptionChoice` 中"进入约会场景"点击处理不变（resetPhaseState + generatePhaseNarrative 正常工作）

## Implementation Notes

- 双重修复：引擎层保留数据 + UI 层豁免渲染条件，确保按钮在任何配额状态下都可见
- `[4, 6, 8, 9]` 硬编码与 game-engine.js:231 / option-engine.js:11 保持一致
- 点击"进入约会场景"后 `resetPhaseState()` 会清理 consequenceNarratives，自由剧情后果自然结束，约会流程正常开始

## Directory Structure

```
src/
├── game-engine.js          # [MODIFY] 第 905 行：currentOptions 约会日 phase 0 保留
└── ui/
    └── option-panel.js     # [MODIFY] 第 9 行：渲染条件增加 isDatingDayPhase0 豁免
```