---
name: questionbox-stale-options
overview: 修复提问箱回答后 stale 选项残留 + 增强 prompt 选项多样性
todos:
  - id: fix-stale-options
    content: 在 handleQuestionBoxChoice 中 qb.active=false 后加 GS.currentOptions=[]
    status: completed
  - id: fix-advancing-lock
    content: 在 handleRegenerate 中重置 GS._advancingPhase=false
    status: completed
    dependencies:
      - fix-stale-options
  - id: enhance-norepeatnote
    content: 增强 noRepeatNote 要求选项必须从剧情推导、第一选项禁止通用模板
    status: completed
  - id: enhance-consequence-instruction
    content: 增强 consequence 类型选项指令，要求基于刚生成的后续剧情推导
    status: completed
    dependencies:
      - enhance-norepeatnote
---

## Bug 修复：提问箱回答后选项残留

Day 7 傍晚提问箱，用户点击"如实回答"后，AI 生成后续剧情并渲染完成，但选项面板仍然显示"如实回答"和"拒绝回答并喝酒"两个按钮，用户需要再点一次才能进入下一时段。

**根因**：`handleQuestionBoxChoice()` 中设置 `qb.active = false` 后，没有清空 `GS.currentOptions`。骨架引擎 `skeletonGenOptions()` 因当时 `questionBox.active === true`，返回了 `[{ text: '如实回答' }, { text: '拒绝回答并喝酒' }]` 并写入了 `GS.currentOptions`。渲染时 `renderQuestionBoxPanel()` 因 `active=false` 不显示，但落入 `renderOptionPanel()` 因 `GS.currentOptions` 不为空，将残留按钮渲染为普通选项。

## 原计划：增强选项多样性 Prompt

每个时段开始时，AI 生成的第一个选项（选项 A）总是雷同（如"主动搭话""保持距离"等通用模板），没有基于当前时段实际剧情内容来生成有情境感的选项文字。需要增强 prompt 约束，要求选项必须从剧情中推导、第一选项禁止通用模板。

## 技术方案

### 实施概览

- **Bug 修复**：修改 `src/game-engine.js` 两个位置
- **Prompt 增强**：修改 `src/prompts.js` 两个位置

### 修改详情

#### 1. `src/game-engine.js` — 提问箱选项残留修复

**位置 1**：`handleQuestionBoxChoice()` 函数，第 1336 行

当前：

```js
  qb.active = false;
  saveGame();
```

改为：

```js
  qb.active = false;
  GS.currentOptions = [];  // 清空残留选项，防止 renderOptionPanel 渲染提问箱按钮
  saveGame();
```

**位置 2**：`handleRegenerate()` 函数，第 1020 行

当前：

```js
  GS._isGenerating = false;
  GS.pendingAffChanges = [];
```

改为：

```js
  GS._isGenerating = false;
  GS._advancingPhase = false;  // 重置重入锁，避免卡死
  GS.pendingAffChanges = [];
```

#### 2. `src/prompts.js` — 选项多样性增强

**位置 1**：`noRepeatNote` 变量（第 597-599 行）

当前：

```js
var noRepeatNote = '...\n' +
  '⚠️ 选项必须严格基于当前场景和在场人物，避免出现与当前上下文无关的互动选项。避免重复使用"主动搭话""保持距离""沉默不语"等通用模板，每个选项指向不同的行动方向。';
```

改为：

```js
var noRepeatNote = '...\n' +
  '⚠️ 选项必须严格基于你刚刚写出的剧情文本中的具体场景、对话、细节来推导，每个选项要像「从剧情中长出来」的一样自然。\n' +
  '⚠️ 第一个选项（选项A）尤其必须直接从本段剧情的核心场景/冲突/氛围中提取行动方向，绝对禁止使用"主动搭话""保持距离""沉默不语"等独立于剧情的通用模板。\n' +
  '⚠️ 三个选项指向完全不同的行动方向，禁止出现语义重复的选项。';
```

**位置 2**：`consequence` 类型生成指令（第 601-604 行）

当前：

```js
  msg += '[INSTRUCTION] 生成任务\n玩家选择了选项："' + extra.choiceText + '"——这就是你的起点。用一句话锚定位置后直接开始写。\n' +
    '请生成后续剧情（~500字 JSON），必须包含至少1段 narrative + 1段 interview + 1段 memberInterview + observers 数组 + options 数组（3个选项，每个选项含 affName/affDelta/affReason）。\n' +
    '如果选项明确扣分则填 riskMember/riskDelta。\n' + noRepeatNote;
```

改为：

```js
  msg += '[INSTRUCTION] 生成任务\n玩家选择了选项："' + extra.choiceText + '"——这就是你的起点。用一句话锚定位置后直接开始写。\n' +
    '请生成后续剧情（~500字 JSON），必须包含至少1段 narrative + 1段 interview + 1段 memberInterview + observers 数组 + options 数组（3个选项，每个选项含 affName/affDelta/affReason）。\n' +
    '⚠️ 选项必须基于你刚刚生成的后续剧情来推导——从这段剧情中的具体事件、对话、氛围中提取行动方向，禁止使用与剧情无关的通用选项模板。\n' +
    '如果选项明确扣分则填 riskMember/riskDelta。\n' + noRepeatNote;
```

### 设计理由

1. **最小改动原则**：Bug 修复只加两行代码，Prompt 增强只改两处文本
2. **对症下药**：残留按钮的根因是 `GS.currentOptions` 未清空，Prompt 增强解决选项雷同问题
3. **无副作用**：`GS.currentOptions = []` 只在提问箱回答后执行，不影响其他流程；`_advancingPhase = false` 只在重新生成时重置
4. **代码风格一致**：保持现有 `var` 声明、`+` 拼接风格