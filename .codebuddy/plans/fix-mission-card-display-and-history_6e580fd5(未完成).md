---
name: fix-mission-card-display-and-history
overview: 为「制作组任务卡」系统添加持续显示的通知条、任务完成功能和历史记录面板，解决当前只有一次性弹框、无显示无记录的问题。
todos:
  - id: cleanup-mission-card
    content: 在 scheduler.js 中新增 cleanupMissionCard()，处理跨天清理与历史记录
    status: pending
  - id: update-proceed-to-next-day
    content: 在 game-engine.js 中调用清理函数，新增 completeMissionCard()，修改弹框逻辑
    status: pending
    dependencies:
      - cleanup-mission-card
  - id: add-notification-bar
    content: 在 ui-renderer.js 中新增任务卡通知条（红色主题，可折叠，含完成按钮）
    status: pending
    dependencies:
      - update-proceed-to-next-day
  - id: add-archive-tab
    content: 在 archive-modal.js 中新增「任务卡」Tab，显示当前任务和历史记录
    status: pending
    dependencies:
      - update-proceed-to-next-day
---

## 需求说明

改善 Transfer 模式的"制作组任务卡"系统，当前仅有一次性弹框，关闭后完全消失。需要：

1. **持久通知条**：在游戏主界面增加任务卡通知条，与秘密任务通知条类似，可折叠展开，显示任务名称、描述、提示
2. **完成机制**：通知条内增加"已完成"按钮，点击后记录完成状态
3. **历史记录**：归档面板（📋按钮）新增"任务卡"Tab，显示当前进行中任务和已完成/未完成的历史记录
4. **自动记录**：进入下一天时，未完成的任务卡自动记录为"未完成"

状态字段（`todayMissionCard`、`missionCardHistory`、`missionCardUsedIds`）已存在，无需新增。

## 技术方案

### 修改涉及文件

| 文件 | 修改类型 | 说明 |
| --- | --- | --- |
| `src/skeleton/scheduler.js` | [MODIFY] | 新增 `cleanupMissionCard()` 函数，在进入下一天时记录未完成任务到历史并清理 |
| `src/game-engine.js` | [MODIFY] | 在 `proceedToNextDay` 中调用清理函数；新增 `completeMissionCard()` 供UI按钮调用 |
| `src/ui-renderer.js` | [MODIFY] | 新增任务卡通知条（参照秘密任务通知条模式，红色/粉色主题） |
| `src/modals/archive-modal.js` | [MODIFY] | 新增第5个Tab「任务卡」，显示当前和历史的任务卡记录 |


### 设计要点

**scheduler.js** — 新增 `cleanupMissionCard()`

- 判断 `GS.todayMissionCard` 是否已标记完成，未完成的推入 `missionCardHistory` 记录为 `completed: false`
- 重置 `GS.todayMissionCard = null`
- 在 `resetDayState()` 中加入 `GS.todayMissionCard = null`（确保跨天不残留）

**game-engine.js** — 修改 `proceedToNextDay()` 流程

- 顺序：先 `skeletonCleanupMissionCard()` 清理昨天的 → 再 `skeletonMissionCard()` 触发今天的
- 修改 `showMissionCardModal()`：点击确认接收时设置 `accepted: true`，不清空 `todayMissionCard`，通知条持续可用
- 新增 `completeMissionCard()`：设置 `completed: true`、推入历史、清空当前、刷新UI、弹Toast

**ui-renderer.js** — 新增任务卡通知条（在秘密任务通知条与嫉妒任务通知条之间）

- 条件：`GS.todayMissionCard && !GS.todayMissionCard.completed`
- 样式：红色边框（`#c62828`）、粉色背景（`#fce4ec`），可折叠展开
- 内容：`🎴 制作组任务卡` 标题 + 任务名 + 描述 + `✅ 已完成` 按钮
- 参考秘密任务通知条（第1314-1328行）的折叠交互模式

**archive-modal.js** — 新增「任务卡」Tab

- 在现有4个Tab（X档案/记忆物品/心动笔记/秘密任务）之后增加第5个Tab
- `buildMissionCardContent()` 函数：
- 当前活跃任务（未完成）：橙色边框卡片
- 历史列表倒序：每条显示名称/描述/触发天数/完成状态（✅已完成/⏳未完成）
- 切换逻辑 `switchArchiveTab()` 同步更新

### 无需修改的代码

- `state.js` — 字段已存在，无需新增
- `data.js` — 任务卡定义不变

### 性能与兼容性

- 所有修改遵循现有代码风格（`var` 声明、字符串 `+` 拼接、`escHtml` 转义）
- 不引入新依赖
- 不影响 1v1 模式