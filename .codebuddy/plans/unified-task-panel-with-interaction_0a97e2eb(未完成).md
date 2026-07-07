---
name: unified-task-panel-with-interaction
overview: 将任务卡和秘密任务合并为统一的任务面板系统，支持在面板内直接做任务（输入类提供文本输入框，行动类并入剧情），提交后由AI生成剧情反馈。
todos:
  - id: classify-mission-cards
    content: 在 data.js 中为 MISSION_CARDS 每项添加 type 字段（input/action）
    status: pending
  - id: add-cleanup-mission-card
    content: 在 scheduler.js 中新增 cleanupMissionCard()，重置任务卡跨天状态
    status: pending
    dependencies:
      - classify-mission-cards
  - id: add-core-mission-logic
    content: 在 game-engine.js 中新增 completeMissionCard() 和 submitTaskInput()，调整弹框逻辑
    status: pending
    dependencies:
      - classify-mission-cards
  - id: create-task-panel-modal
    content: 创建 src/modals/task-panel.js 统一任务面板，支持输入型和行动型任务交互
    status: pending
    dependencies:
      - add-core-mission-logic
  - id: integrate-task-ui
    content: 在 header-bar.js 加任务按钮+角标，ui-renderer.js 替换通知条，modals.js 导出
    status: pending
    dependencies:
      - create-task-panel-modal
  - id: add-archive-history
    content: 在 archive-modal.js 新增「任务卡」Tab 显示历史记录
    status: pending
    dependencies:
      - classify-mission-cards
  - id: inject-ai-prompt
    content: 在 prompts.js 中注入活跃任务卡指令到 AI prompt
    status: pending
    dependencies:
      - classify-mission-cards
---

## 需求说明

改善 Transfer 模式的"制作组任务"系统，当前存在以下问题：

1. **任务卡**（沉默游戏、三行诗等10张）只有一次性红色弹框，关闭后完全消失
2. **秘密任务**（破冰微笑等8个）有通知条+完成按钮+归档历史，但与任务卡分离
3. 玩家无法在统一界面查看和管理所有任务
4. 输入类任务（三行诗、写纸条等）没有交互入口

## 改进目标

1. **获得任务时提示** — 收到新任务时在界面显示通知
2. **统一任务面板** — 将任务卡和秘密任务合并到一个面板中显示
3. **任务类型区分交互**：

- 输入类任务（三行诗、写纸条、回答真心话等）→ 面板内提供文本输入框，提交后交AI生成剧情
- 行动类任务（沉默游戏、换座位等）→ 并入AI剧情，面板内提供"已完成"按钮

4. **完成任务并入剧情** — 输入类任务提交后，AI生成相应的剧情场景（如写三行诗后成员们的反应）

## 任务分类

### 输入类（需文本输入，5张）

| ID | 名称 | 描述 |
| --- | --- | --- |
| mc_3 | 真心话抽取 | 抽一张问题卡并回答 |
| mc_6 | 交换物品 | 描述要交换的物品 |
| mc_7 | 三行诗 | 用某成员名字作三行诗 |
| mc_8 | 幕后采访 | 描述今天的心动瞬间 |
| mc_10 | 最终告白预演 | 写给假设最后一天的信 |


### 行动类（通过剧情完成，5张+所有秘密任务）

| ID | 名称 | 描述 |
| --- | --- | --- |
| mc_1 | 沉默游戏 | 1小时内不和好感对象说话 |
| mc_2 | 换位晚餐 | 坐在最少接触的成员旁边 |
| mc_4 | 一日经纪人 | 为成员完成私人请求 |
| mc_5 | 秘密信号 | 对指定成员做暗号 |
| mc_9 | 双人任务 | 和X一起做家务 |
| sm_* | 全部8个秘密任务 | 通过剧情自然完成 |


## 技术方案

### 修改文件清单

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `src/data.js` | [MODIFY] | 给 MISSION_CARDS 数组每项加 type 字段 ('input'/'action') |
| `src/skeleton/scheduler.js` | [MODIFY] | 新增 `cleanupMissionCard()` 函数；resetDayState() 中重置 todayMissionCard |
| `src/game-engine.js` | [MODIFY] | 新增 `submitTaskInput()` 和 `completeMissionCard()`；调整 proceedToNextDay 流程；修改弹框为提示 |
| `src/modals/task-panel.js` | [NEW] | 统一任务面板弹窗（核心模块） |
| `src/ui-renderer.js` | [MODIFY] | 替换独立通知条为紧凑的统一任务提示条 |
| `src/ui/header-bar.js` | [MODIFY] | 添加任务面板按钮 + 活跃任务数角标 |
| `src/modals/archive-modal.js` | [MODIFY] | 新增第5个Tab"任务卡"显示任务卡历史 |
| `src/prompts.js` | [MODIFY] | 在 buildUserMessage 中注入活跃任务卡指令 |
| `src/modals.js` | [MODIFY] | 导出 `showTaskPanel` |


### 详细实现设计

#### 1. data.js — 任务分类

给每条 MISSION_CARDS 增加 `type: 'input' | 'action'` 字段：

```javascript
export var MISSION_CARDS = [
  { id: 'mc_1', type: 'action',  name: '沉默游戏', desc: '...', dayMin: 3, dayMax: 10, phase: 'any' },
  { id: 'mc_3', type: 'input',   name: '真心话抽取', desc: '...', dayMin: 3, dayMax: 10, phase: 'any' },
  { id: 'mc_7', type: 'input',   name: '三行诗', desc: '...', dayMin: 3, dayMax: 10, phase: 'any' },
  // ... 其余同理
];
```

#### 2. scheduler.js — 跨天清理

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

在 `resetDayState()` 中也加 `GS.todayMissionCard = null`。

#### 3. game-engine.js — 核心逻辑

**proceedToNextDay 流程调整**：先清理昨日任务卡，再触发今日新卡：

```
skeletonCleanupMission();       // 原有：清理秘密任务
cleanupMissionCard();           // 新增：清理昨日任务卡
// ... 其他清理 ...
var missionCard = skeletonMissionCard();  // 触发今日任务卡
if (missionCard) {
  // 不再弹弹框，而是靠 header 角标 + 任务面板提示
  showToast('收到了新的制作组任务卡：' + missionCard.name);
}
```

**showMissionCardModal 修改**：不再使用独立弹框，改为仅初始化 todayMissionCard，由任务面板接管。

**新增 completeMissionCard()**：

```javascript
export function completeMissionCard() {
  if (!GS.todayMissionCard) return;
  GS.todayMissionCard.completed = true;
  GS.missionCardHistory.push(JSON.parse(JSON.stringify(GS.todayMissionCard)));
  GS.todayMissionCard = null;
  saveGame();
  showToast('任务卡已完成！');
  if (window.__renderAll) window.__renderAll();
}
```

**新增 submitTaskInput(taskId, inputText)**：

```javascript
export async function submitTaskInput(inputText) {
  // 1. 检查当前活跃任务卡，必须是 input 类型
  if (!GS.todayMissionCard || GS.todayMissionCard.type !== 'input') return;
  
  // 2. 调用 AI 生成剧情（复用 handleFreeAction 模式）
  // 构建特殊 prompt，告知 AI 玩家完成了任务卡，提交了输入内容
  // AI 生成一段剧情场景展示任务执行过程和他人反应
  
  // 3. 将 AI 返回的 narrative 追加到 consequenceNarratives
  
  // 4. 标记任务完成
  GS.todayMissionCard.completed = true;
  GS.missionCardHistory.push(JSON.parse(JSON.stringify(GS.todayMissionCard)));
  GS.todayMissionCard = null;
  
  // 5. 渲染 UI
  saveGame();
  if (window.__renderAll) window.__renderAll();
}
```

#### 4. task-panel.js — 统一任务面板 (NEW)

新建 `src/modals/task-panel.js`：

```javascript
// 功能：显示统一的"任务"面板弹窗
// 布局：
// ┌─────────────────────────────────────┐
// │  任务清单                    [x]     │
// │  (标题区域)                         │
// ├─────────────────────────────────────┤
// │  进行中的任务                        │
// │  ┌──── 任务卡 (红色) ────────────┐  │
// │  │  🎴 三行诗                    │  │
// │  │  以某位成员的名字为题作三行诗   │  │
// │  │  [输入框 ________________]     │  │  ← input 类型
// │  │  [提交并入剧情]               │  │
// │  └──────────────────────────────┘  │
// │                                     │
// │  ┌──── 秘密任务 (橙色) ─────────┐  │
// │  │  📢 破冰微笑                  │  │
// │  │  让某位成员上午主动对你笑     │  │
// │  │  [✅ 已完成]                  │  │  ← action 类型
// │  └──────────────────────────────┘  │
// ├─────────────────────────────────────┤
// │  已完成的任务                        │
// │  ✅ 沉默游戏 · Day 3               │
// │  ⏳ 换位晚餐 · Day 5 (未完成)       │
// └─────────────────────────────────────┘
//
// - 任务卡区显示：当前活跃任务卡（如果有）
// - 秘密任务区显示：当前活跃秘密任务（如果有）
// - 已完成的秘密任务和任务卡显示在底部历史区
// - 输入类任务卡显示textarea + [提交并入剧情]按钮
// - 行动类任务卡显示[✅ 已完成]按钮
// - 秘密任务显示[✅ 已完成]按钮（调用completeSecretMission）
//
// 事件绑定：
// - 提交按钮 → submitTaskInput() → AI生成剧情
// - 已完成按钮 → completeMissionCard() / completeSecretMission()
// - 关闭按钮 → overlay.remove()
```

遵循现有代码风格：`var` 声明、字符串 `+` 拼接、`escHtml` 转义。

#### 5. ui-renderer.js — 统一提示条

**替换**原来的秘密任务通知条（第1314-1328行）为一个紧凑的统一提示：

```javascript
// 统一任务提示条（替换原秘密任务通知条）
var _hasMissionCard = GS.todayMissionCard && !GS.todayMissionCard.completed;
var _hasSecretMission = GS.secretMission && GS.secretMission.status === 'active';
if (_hasMissionCard || _hasSecretMission) {
  var _totalActive = (_hasMissionCard ? 1 : 0) + (_hasSecretMission ? 1 : 0);
  html += '<div class="card" style="border-left:3px solid #c62828;background:linear-gradient(135deg,#fce4ec,#fff5f5);cursor:pointer" id="taskHintBar">' +
    '<div style="display:flex;align-items:center;justify-content:space-between">' +
    '<span style="font-size:13px;font-weight:700;color:#c62828">📋 你有 ' + _totalActive + ' 个进行中的任务</span>' +
    '<span style="font-size:11px;color:#8b6b6b">点击查看详情 ▸</span>' +
    '</div></div>';
}
```

移除原嫉妒任务通知条也可考虑简化，但保留（它属于"强制执行"类型，性质不同）。

#### 6. header-bar.js — 任务按钮

在 header 按钮区新增（放在 archiveBtn 之前或之后）：

```javascript
var _hasActiveTask = (GS.todayMissionCard && !GS.todayMissionCard.completed) || 
                     (GS.secretMission && GS.secretMission.status === 'active');
var taskBadgeHtml = '';
if (_hasActiveTask) {
  taskBadgeHtml = '<span style="position:absolute;top:-4px;right:-4px;background:#c62828;color:#fff;font-size:9px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700">' +
    ((GS.todayMissionCard && !GS.todayMissionCard.completed ? 1 : 0) + (GS.secretMission && GS.secretMission.status === 'active' ? 1 : 0)) + '</span>';
}
'<div style="position:relative;display:inline-block"><button id="taskPanelBtn" title="任务清单">🎴</button>' + taskBadgeHtml + '</div>'
```

按钮事件绑定（在 game-engine.js 或 ui-renderer.js 的事件绑定部分）：

```javascript
document.getElementById('taskPanelBtn').addEventListener('click', function() {
  showTaskPanel();
});
```

#### 7. archive-modal.js — 任务卡历史

新增第5个Tab按钮和内容区：

```javascript
// Tab 按钮新增
'<button class="tab-btn" id="archiveTabMissionCards">🎴 任务卡</button>'

// Tab 内容
'<div id="archiveMissionCardsContent" style="display:none;flex:1;overflow-y:auto;padding-right:4px">' +
buildMissionCardContent() +
'</div>'
```

`buildMissionCardContent()` 函数参照 `buildSecretMissionContent()` 实现：

- 遍历 `GS.missionCardHistory`（倒序）
- 每条显示：名称、描述、触发天数、完成状态（✅/⏳）

#### 8. prompts.js — AI Prompt 注入

在 buildUserMessage() 中，秘密任务注入（第511-518行）之后，追加任务卡注入：

```javascript
// 任务卡指令
if (GS.todayMissionCard && !GS.todayMissionCard.completed) {
  var mc = GS.todayMissionCard;
  msg += '[INSTRUCTION] 制作组任务卡（仅女主可见·不可告诉其他成员）\n' +
    '任务：' + mc.name + '\n' +
    '描述：' + mc.desc + '\n' +
    '请在日常剧情中自然创造完成这个任务的机会和场景，配合女主的行动展开。无需主动提及这是"制作组任务"。\n\n';
}
```

对于输入类任务的提交，构建专门 prompt：

- 在 `submitTaskInput()` 中构建 userMsg：`"玩家完成了任务卡[任务名]，提交的内容是：[inputText]。请根据这个内容生成一段约200字的剧情场景，展示这个任务被执行的过程和周围人的反应。场景必须与当前剧情连贯。"`
- 使用 `callDeepSeek` 或 `generateWithRetry` 调用
- 返回文本追加到 consequenceNarratives

### 无需修改的文件

- `src/state.js` — 字段已存在
- `src/parser.js` — 不修改秘密任务逻辑
- `src/affection.js` — 好感度逻辑不变

### 性能与兼容性

- 遵循现有代码风格：`var` 声明、`+` 拼接、`escHtml` 转义
- 不引入新依赖
- 不影响 1v1 模式
- 不影响现有秘密任务完成逻辑
- 任务卡弹框改为非阻塞提示，降低侵入性