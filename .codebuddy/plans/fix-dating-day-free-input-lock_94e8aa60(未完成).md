---
name: fix-dating-day-free-input-lock
overview: 修复 Day 9 等约会日 phase 0 自由输入框可用导致"进入约会场景"按钮被清空的 bug。在 handleFreeAction 开头加约会日 phase 0 拦截，在 free-input.js 渲染时禁用输入框。
todos:
  - id: add-dating-guard
    content: game-engine.js handleFreeAction 加约会日 phase 0 拦截 return
    status: pending
  - id: disable-free-input-dating
    content: free-input.js 渲染时禁用约会日 phase 0 的输入框和按钮
    status: pending
    dependencies:
      - add-dating-guard
---

## 产品概述

修复 Day 9（及其他约会日 Day 4/6/8）phase 0 自由输入框可用导致"进入约会场景"按钮被清空的 bug。

## 核心问题

约会日 phase 0 本应强制走"进入约会场景"流程，但自由输入框未被禁用。玩家使用自由输入后，`handleFreeAction` 执行 `GS.currentOptions = []` 清空了"进入约会场景"按钮，约会流程被打断无法恢复。

## 修复内容

- 在 `handleFreeAction` 开头增加约会日 phase 0 拦截，提示后 return
- 在 `free-input.js` 渲染时对约会日 phase 0 禁用输入框和按钮

## 技术栈

- Vanilla JS (ES Modules)，遵循项目约定：`var` 声明、`+` 字符串拼接、最小改动

## 实现方案

### 修改 1：`src/game-engine.js`（handleFreeAction，第 889 行之后）

在 `!GS.aiEnabled` 检查之后、`showLoading` 之前，增加约会日 phase 0 拦截：

```js
if ([4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0) {
  showToast('⚠️ 今天是约会日，请先点击「▶ 进入约会场景」');
  return;
}
```

条件与 `generatePhaseNarrative` 第 231 行的 `isDatingDay` 判断完全一致，覆盖 Day 4/6/8/9 phase 0。Day 10 由弹窗直接设定 `currentDatingPartner` 后调用 `generatePhaseNarrative`，不涉及"进入约会场景"按钮，无需拦截。

### 修改 2：`src/ui/free-input.js`（renderFreeInput，第 10 行）

在 `freeDisabled` 条件中增加约会日 phase 0 判断：

```js
var isDatingDayPhase0 = [4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0;
var freeDisabled = (smsSent && isNight && stayExhausted) || freeInputExhausted || isDatingDayPhase0;
```

### 不改动项

- `generatePhaseNarrative` 中约会日选项设定逻辑不变
- `option-engine.js` 不变（已有 phase 0 约会日上午分支返回"进入约会场景"）
- Day 10 不拦截（弹窗模式，无"进入约会场景"按钮）
- 真心话/提问箱/深夜已有 skeleton 层 `return []` 处理，自由输入配额机制仍生效

## 实现注意事项

- 双重防护：UI 层禁用 + 引擎层拦截，即使 UI 被绕过也不会清空约会按钮
- `showToast` 已从 `core.js` 导入，`handleFreeAction` 现有代码已使用
- `[4, 6, 8, 9]` 硬编码与 game-engine.js:231 / option-engine.js:11 保持一致

## 目录结构

```
src/
├── game-engine.js          # [MODIFY] handleFreeAction 第 889 行后：加约会日 phase 0 拦截
└── ui/
    └── free-input.js       # [MODIFY] 第 10 行：freeDisabled 增加 isDatingDayPhase0 条件
```