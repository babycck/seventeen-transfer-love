---
name: unified-task-panel-with-interaction
overview: 将任务卡和秘密任务合并为统一的任务面板，输入类任务玩家写内容后注入下一段AI剧情，行动类任务直接由AI在剧情中体现。
todos:
  - id: classify-mission-cards
    content: 在 data.js 中为 MISSION_CARDS 每项添加 type 字段 (input/action)
    status: pending
  - id: add-state-and-cleanup
    content: 在 state.js 新增 pendingTaskResult 字段；scheduler.js 新增 cleanupMissionCard()
    status: pending
    dependencies:
      - classify-mission-cards
  - id: add-core-mission-logic
    content: 在 game-engine.js 新增 completeMissionCard()、completeTaskInput()，调整 proceedToNextDay 流程，修改弹框为 Toast
    status: pending
    dependencies:
      - add-state-and-cleanup
  - id: create-task-panel-modal
    content: 创建 src/modals/task-panel.js 统一任务面板，支持输入框和完成按钮两种交互
    status: pending
    dependencies:
      - add-core-mission-logic
  - id: integrate-task-ui
    content: 在 header-bar.js 加任务按钮+角标，ui-renderer.js 替换通知条并绑定事件，modals.js 导出
    status: pending
    dependencies:
      - create-task-panel-modal
  - id: add-archive-history
    content: 在 archive-modal.js 新增「任务卡」Tab 显示历史记录（含提交内容）
    status: pending
    dependencies:
      - classify-mission-cards
  - id: inject-ai-prompt
    content: 在 prompts.js 中注入 pendingTaskResult 到 buildUserMessage，同时注入活跃任务卡指令
    status: pending
    dependencies:
      - classify-mission-cards
---

## 需求说明

改善 Transfer 模式的"制作组任务"系统，统一任务卡和秘密任务的显示与交互：

### 核心问题

1. **任务卡**（沉默游戏、三行诗等10张）只有一次性红色弹框，关闭后消失，无法查看当前任务内容
2. **秘密任务**有通知条+完成按钮+归档历史，但与任务卡分离，玩家无法统一管理

### 统一方案

1. **header 任务按钮+角标** — 有活跃任务时显示红色数量角标提示
2. **统一任务面板** — 顶部提示条+点击打开面板，所有活跃任务集中显示
3. **输入类任务**（三行诗、写纸条、真心话抽取、交换物品、幕后采访）：

- 面板内提供文本输入框，玩家填写内容
- 点击"完成" → 系统记录任务名+玩家输入到 `pendingTaskResult`
- **不立即生成AI剧情** → 在 `buildUserMessage()` 时注入到下一次AI生成的prompt中 → AI自然写进剧情
- 注入后清空 `pendingTaskResult`

4. **行动类任务**（沉默游戏、换位晚餐等+所有秘密任务）：

- 已通过AI prompt注入由剧情自然处理
- 面板内显示"已完成"按钮，点击仅标记完成，不需要额外AI注入

5. **归档面板**新增「任务卡」Tab查看历史记录

## 技术方案

### 涉及文件

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `src/state.js` | [MODIFY] | 新增 `pendingTaskResult` 字段 + migrateSave 兜底 |
| `src/data.js` | [MODIFY] | MISSION_CARDS 每项加 `type: 'input'\ | 'action'` |
| `src/skeleton/scheduler.js` | [MODIFY] | 新增 `cleanupMissionCard()` 导出；resetDayState 重置 |
| `src/game-engine.js` | [MODIFY] | 新增 `completeMissionCard()` + `completeTaskInput()`；修改 proceedToNextDay 顺序；showMissionCardModal 改为Toast提示 |
| `src/modals/task-panel.js` | [NEW] | 统一任务面板弹窗（核心模块） |
| `src/ui-renderer.js` | [MODIFY] | 统一任务提示条替换原秘密任务通知条；事件绑定 |
| `src/ui/header-bar.js` | [MODIFY] | 添加任务面板按钮+活跃任务角标 |
| `src/modals/archive-modal.js` | [MODIFY] | 新增第5个Tab「任务卡」显示历史 |
| `src/prompts.js` | [MODIFY] | 注入 `pendingTaskResult` + 活跃任务卡指令 |
| `src/modals.js` | [MODIFY] | 导出 `showTaskPanel` |


### 详细设计

#### 1. state.js — 新增 pendingTaskResult

在 `defaultGameState()` 任务卡系统附近新增：

```javascript
pendingTaskResult: null,  // { taskName, taskDesc, playerInput } 待注入到下次AI生成
```

在 `migrateSave()` 中兜底：

```javascript
if (GS.pendingTaskResult === undefined) GS.pendingTaskResult = null;
```

#### 2. data.js — 任务分类

MISSION_CARDS 每项补充 type 字段：

```
mc_1 沉默游戏 → action
mc_2 换位晚餐 → action
mc_3 真心话抽取 → input
mc_4 一日经纪人 → action
mc_5 秘密信号 → action
mc_6 交换物品 → input
mc_7 三行诗 → input
mc_8 幕后采访 → input
mc_9 双人任务 → action
mc_10 最终告白预演 → input
```

#### 3. scheduler.js — cleanupMissionCard()

```javascript
export function cleanupMissionCard() {
  if (GS.todayMissionCard && !GS.todayMissionCard.completed) {
    GS.missionCardHistory.push({
      id: GS.todayMissionCard.id,
      name: GS.todayMissionCard.name,
      desc: GS.todayMissionCard.desc,
      day: GS.day,
      completed: false
    });
  }
  GS.todayMissionCard = null;
}
```

resetDayState() 中加 `GS.todayMissionCard = null`。

#### 4. game-engine.js — 核心逻辑

**proceedToNextDay 流程调整：**

```
skeletonCleanupMission();        // 原有：清理秘密任务
cleanupMissionCard();            // 新增：清理昨日任务卡
// ... 其他清理 ... 
var missionCard = skeletonMissionCard();  // 触发今日任务卡
if (missionCard) {
  showToast('收到新的制作组任务卡：' + missionCard.name);
}
```

**新增 completeMissionCard() 给行动类任务：**

```javascript
export function completeMissionCard() {
  if (!GS.todayMissionCard) return;
  GS.todayMissionCard.completed = true;
  GS.missionCardHistory.push(JSON.parse(JSON.stringify({
    id: GS.todayMissionCard.id,
    name: GS.todayMissionCard.name,
    desc: GS.todayMissionCard.desc,
    day: GS.day,
    completed: true
  })));
  GS.todayMissionCard = null;
  saveGame();
  showToast('任务卡已完成！');
  if (window.__renderAll) window.__renderAll();
}
```

**新增 completeTaskInput() 给输入类任务：**

```javascript
export function completeTaskInput(playerInput) {
  if (!GS.todayMissionCard || GS.todayMissionCard.type !== 'input') return;
  if (!playerInput || playerInput.trim().length === 0) {
    showToast('请先填写任务内容再提交');
    return;
  }
  // 存入 pendingTaskResult，下次AI生成时注入
  GS.pendingTaskResult = {
    taskName: GS.todayMissionCard.name,
    taskDesc: GS.todayMissionCard.desc,
    playerInput: playerInput.trim()
  };
  // 标记完成
  GS.todayMissionCard.completed = true;
  GS.missionCardHistory.push(JSON.parse(JSON.stringify({
    id: GS.todayMissionCard.id,
    name: GS.todayMissionCard.name,
    desc: GS.todayMissionCard.desc,
    day: GS.day,
    completed: true,
    playerInput: playerInput.trim()
  })));
  GS.todayMissionCard = null;
  saveGame();
  showToast('任务已记录，将在后续剧情中体现！');
  if (window.__renderAll) window.__renderAll();
}
```

**导入和导出：** 在 game-engine.js 顶部导入 cleanupMissionCard，底部导出 completeMissionCard 和 completeTaskInput。

#### 5. task-panel.js — 统一任务面板 [NEW]

新建 `src/modals/task-panel.js`：

```
布局结构：
┌────────────────────────────────────┐
│  任务清单                      [x] │
│  (标题)                            │
├────────────────────────────────────┤
│  进行中的任务                       │
│                                     │
│  ┌── 任务卡 (红色主题) ──────────┐ │
│  │  🎴 三行诗                   │ │
│  │  以某位成员名字作三行诗        │ │
│  │  [textarea 输入框]            │ │  ← input类型
│  │  [提交任务 并入剧情]          │ │
│  └──────────────────────────────┘ │
│                                     │
│  ┌── 任务卡 (红色主题) ──────────┐ │
│  │  🎴 沉默游戏                   │ │
│  │  1小时内不和好感对象说话...     │ │
│  │  [已完成]                      │ │  ← action类型
│  └──────────────────────────────┘ │
│                                     │
│  ┌── 秘密任务 (橙色主题) ────────┐ │
│  │  📢 破冰微笑                   │ │
│  │  让某位成员主动对你笑一次       │ │
│  │  [已完成]                      │ │
│  └──────────────────────────────┘ │
├────────────────────────────────────┤
│  已完成的本地任务                   │
│  ✅ 三行诗 · Day 5                │
│  ⏳ 沉默游戏 · Day 3 (未完成)      │
└────────────────────────────────────┘
```

- 导入 `GS, escHtml, saveGame, showToast` + `completeMissionCard`/`completeTaskInput` from game-engine + `completeSecretMission` from parser
- input类型显示textarea + 提交按钮
- action类型显示已完成按钮（任务卡调用completeMissionCard，秘密任务调用completeSecretMission）
- 底部显示本局已完成的missionCardHistory（倒序）
- 提交按钮调用 `completeTaskInput(textarea.value)` → 关闭面板
- 已完成按钮调用对应函数 → 刷新面板或关闭

#### 6. ui-renderer.js — 统一提示条 + 事件绑定

**替换原秘密任务通知条（第1314-1328行）为统一提示条：**

```javascript
var _hasMissionCard = GS.todayMissionCard && !GS.todayMissionCard.completed;
var _hasSecretMission = GS.secretMission && GS.secretMission.status === 'active';
if (_hasMissionCard || _hasSecretMission) {
  var _total = (_hasMissionCard ? 1 : 0) + (_hasSecretMission ? 1 : 0);
  html += '<div class="card" style="border-left:3px solid #c62828;background:linear-gradient(135deg,#fce4ec,#fff5f5);cursor:pointer" id="taskHintBar">' +
    '<div style="display:flex;align-items:center;justify-content:space-between">' +
    '<span style="font-size:13px;font-weight:700;color:#c62828">你有 ' + _total + ' 个进行中的任务</span>' +
    '<span style="font-size:11px;color:#8b6b6b">点击查看详情</span>' +
    '</div></div>';
}
```

**事件绑定（renderBindings 中新增）：**

```javascript
var taskHintBar = document.getElementById('taskHintBar');
if (taskHintBar) taskHintBar.addEventListener('click', function() { showTaskPanel(); });

var taskPanelBtn = document.getElementById('taskPanelBtn');
if (taskPanelBtn) taskPanelBtn.addEventListener('click', function() { showTaskPanel(); });
```

#### 7. header-bar.js — 任务按钮 + 角标

在 header-btns div 中新增（位置放在 archiveBtn 之前）：

```javascript
var _hasActiveTask = (GS.todayMissionCard && !GS.todayMissionCard.completed) ||
                     (GS.secretMission && GS.secretMission.status === 'active');
var taskBadge = '';
if (_hasActiveTask) {
  var _count = (GS.todayMissionCard && !GS.todayMissionCard.completed ? 1 : 0) +
               (GS.secretMission && GS.secretMission.status === 'active' ? 1 : 0);
  taskBadge = '<span style="position:absolute;top:-4px;right:-4px;background:#c62828;color:#fff;font-size:9px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700">' + _count + '</span>';
}
html += '<div style="position:relative;display:inline-block"><button id="taskPanelBtn" title="任务清单">🎴</button>' + taskBadge + '</div>';
```

#### 8. archive-modal.js — 任务卡历史 Tab

**Tab 按钮区新增：**

```javascript
'<button class="tab-btn" id="archiveTabMissionCards">🎴 任务卡</button>'
```

**Tab 内容区新增（在 missionsContent 之后）：**

```javascript
'<div id="archiveMissionCardsContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
buildMissionCardContent() +
'</div>'
```

**switchArchiveTab 更新 tabs/ids/contentIds 数组：**

```javascript
var tabs = ['X', 'Items', 'Notes', 'Missions', 'MissionCards'];
var ids = ['archiveTabX', 'archiveTabItems', 'archiveTabNotes', 'archiveTabMissions', 'archiveTabMissionCards'];
var contentIds = ['archiveXContent', 'archiveItemsContent', 'archiveNotesContent', 'archiveMissionsContent', 'archiveMissionCardsContent'];
```

**buildMissionCardContent 函数：**

```javascript
function buildMissionCardContent() {
  var html = '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">本局所有任务卡记录。</p>';
  var history = GS.missionCardHistory || [];
  if (history.length === 0) {
    html += '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂无任务卡记录</p>';
  } else {
    for (var i = history.length - 1; i >= 0; i--) {
      var mc = history[i];
      html += '<div style="background:var(--bg-soft);border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-weight:600;font-size:13px;color:var(--text-primary);margin-bottom:2px">' +
        escHtml(mc.name || '未知任务') +
        (mc.completed ? ' <span style="color:var(--accent-success);font-weight:700">已完成</span>' : ' <span style="color:var(--accent-warning);font-weight:700">未完成</span>') +
        '</p>' +
        (mc.desc ? '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:2px">' + escHtml(mc.desc) + '</p>' : '') +
        '<p style="font-size:11px;color:var(--text-muted)">触发于 Day ' + (mc.day || '?') + '</p>' +
        (mc.playerInput ? '<p style="font-size:11px;color:#c62828;margin-top:4px;background:#fce4ec;border-radius:6px;padding:6px">提交内容：' + escHtml(mc.playerInput) + '</p>' : '') +
        '</div>';
    }
  }
  return html;
}
```

#### 9. prompts.js — pendingTaskResult 注入

**在 buildUserMessage() 中，任务卡指令注入前（第518行附近）添加：**

```javascript
// 输入类任务完成结果注入（由 completeTaskInput 设置）
if (GS.pendingTaskResult) {
  msg += '[INSTRUCTION] 女主刚刚完成了制作组任务卡「' + GS.pendingTaskResult.taskName + '」\n' +
    '任务描述：' + GS.pendingTaskResult.taskDesc + '\n' +
    '女主提交的内容/行动：' + GS.pendingTaskResult.playerInput + '\n' +
    '请在本次剧情中自然体现这个任务的执行场景和周围人的反应。这是对已发生事件的描写，不是未来的任务指示。\n\n';
  GS.pendingTaskResult = null;
}
```

**在 secretMission 注入后（第518行后）添加任务卡活跃指令：**

```javascript
// 任务卡活跃指令（仅行动类需要AI配合）
if (GS.todayMissionCard && !GS.todayMissionCard.completed && GS.todayMissionCard.type === 'action') {
  var mc = GS.todayMissionCard;
  msg += '[INSTRUCTION] 制作组任务卡（仅女主可见·不可告诉其他成员）\n' +
    '任务：' + mc.name + '\n' +
    '描述：' + mc.desc + '\n' +
    '请在日常剧情中自然创造完成这个任务的机会和场景，配合女主的行动展开。无需主动提及这是"制作组任务"。\n\n';
}
```

#### 10. modals.js — 导出

```javascript
export { showTaskPanel } from './modals/task-panel.js';
```

### 无需修改的文件

- parser.js — 秘密任务逻辑不变
- affection.js — 好感度逻辑不变
- store.js — 无需修改 allowedFlags

### 代码风格约束

- 遵守现有风格：`var` 声明、`+` 字符串拼接、`escHtml` 转义
- 禁止使用 alert()/confirm()，统一 showToast()/showConfirmModal()
- 不引入新依赖
- 不影响 1v1 模式

## Agent Extensions

### SubAgent

- **code-explorer**: 在 plan 的执行过程中，如果需要跨多个文件搜索特定模式或验证实现一致性，使用 code-explorer 子代理来高效定位相关代码段落。