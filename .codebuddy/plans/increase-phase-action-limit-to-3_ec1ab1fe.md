---
name: increase-phase-action-limit-to-3
overview: 将每时段的选择和自由输入总次数从 2 次增加到 3 次。
todos:
  - id: change-limit
    content: 将 src/data.js 中 PHASE_ACTION_LIMIT 从 2 改为 3
    status: completed
---

将每时段选项（选择按钮）和自由输入框的总使用次数上限从 2 次增加到 3 次，让玩家每时段有更多互动机会。

## 修改方案

修改 `src/data.js` 第 6 行的常量：

```
PHASE_ACTION_LIMIT = 2  →  PHASE_ACTION_LIMIT = 3
```

### 影响范围分析

- `OPTION_PHASE_LIMIT`（第 7 行）和 `FREE_INPUT_PHASE_LIMIT`（第 8 行）均为 `PHASE_ACTION_LIMIT` 的别名引用，值自动跟随变更
- `ui-renderer.js:574` 的 `actionsRemaining = PHASE_ACTION_LIMIT - (GS.phaseOptionCount + GS.phaseFreeCount)` 自动生效
- 选项面板（`option-panel.js`）中显示"剩余次数：X/3"的 UI 文本自动更新
- `MAX_STAY_COUNT` 不受影响（控制的是"继续今天"按钮）

### 涉及文件

仅 `src/data.js` 一处修改。