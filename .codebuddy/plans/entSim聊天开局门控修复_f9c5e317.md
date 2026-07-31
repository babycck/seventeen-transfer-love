---
name: entSim聊天开局门控修复
overview: 修复新档开局聊天内容与开局状态矛盾的问题：练习生开局不该出现 maleLead 主动开场、manager 经纪人话、group 团群聊；rival 频道补练习生期专属情敌开场白。
todos:
  - id: chat-rival-pool
    content: 补 CHAT_RIVAL 池子：给第262/276行感冒项加 require:'debut'，池子开头加2-3条练习生期专属情敌日常开场白
    status: completed
  - id: chat-manager-pool
    content: 补 CHAT_MANAGER 池子：给第364/365行及涉及出道后艺人资源/行程/记者的项加 require:'debut'
    status: completed
  - id: init-chat-gate
    content: 改 initChatChannel：maleLead/manager 练习生期 return，group 按 heroineGroup 门控，rival 练习生期走专属开场分支
    status: completed
    dependencies:
      - chat-rival-pool
      - chat-manager-pool
  - id: verify-trainee-chat
    content: 用练习生新档开局点开手机聊天验证5频道状态：maleLead空白+快捷回复、brother预填1条、rival预填专属开场、manager空白、group空白
    status: completed
    dependencies:
      - init-chat-gate
---

## 用户诉求

用户开新档（练习生期）后发现手机聊天仍出现矛盾内容：maleLead 频道出现"刚结束。正准备回去"这种缺乏上下文的话、rival 频道出现"你感冒好点了吗。润喉糖放你门口了"（开局刚认识不该说）、manager 频道出现"品牌方预算""记者蹲点"（练习生未签经纪人）、group 频道出现女团群聊（练习生不在团里）。用户期望新档开局聊天内容与开局状态匹配。

## 根因

`initChatChannel`（`src/ent-sim/ui.js:2831-2853`）在玩家首次点开手机聊天时对每个频道从静态池子取前 1-2 项作为初始填充，**只用 isDebut 过滤，不门控职业/章节/团编制**，导致练习生开局收到出道后才该出现的内容。同时 `CHAT_RIVAL`/`CHAT_MANAGER` 池子部分项缺 `require` 标签，`CHAT_MALE_LEAD.trainee` 池子 `{q,r,aff}` 格式被 `initChatChannel` 当作"对方主动开场"误推。

## 修复方向（用户已确认）

- Q1 选"仅哥哥频道预填"：maleLead/manager/group 频道练习生开局不预填对话历史
- Q2 选"预填练习生期专属开场"：rival 频道补练习生期情敌=同队队友的日常向开场白

## 核心功能

- 练习生开局手机聊天 5 个频道状态匹配开局设定：maleLead 空白+快捷回复按钮、brother 预填1条合理话、rival 预填1条练习生期专属情敌日常开场、manager 空白、group 空白
- 出道后/章节>=1 后所有频道恢复原 daily push + initChannel 行为，不影响中后期游戏体验
- 池子文案补 require 标签防止练习生期被误推矛盾内容

## Tech Stack

- 现有项目栈：Vanilla JS (ES Modules) + Vite，无新依赖
- 修改文件：`src/ent-sim/ui.js` + `src/ent-sim/pools/chat-male-lead.js`

## Implementation Approach

### 核心策略

在 `initChatChannel` 函数开头按职业/章节加早期 return（不预填但保留 sentIdx=0 让后续机制工作），同时给池子补 require 标签 + 补 rival 练习生期专属文案。`pushDailyChats`（`ui.js:2949-2975`）已在练习生期只推 brother+rival，本 plan 不动。

### 关键技术决策

1. **不改调用点固定列表**（`ui.js:1699-1704` 的 `['maleLead','brother','rival','manager','group','sasaeng']`）：避免影响 UI 频道列表显示，仅由 `initChatChannel` 内部决定要不要预填，改动最小、blast radius 最小
2. **maleLead 练习生期直接 return**：保留 `GS._entSimChatHistory.maleLead = []` + `sentIdx = 0`，让 `getMaleLeadPresetsForChat` 仍能取到快捷回复按钮（玩家点开后看到"暂无消息"+3 个快捷回复主动发起对话）
3. **rival 练习生期走专属分支**：不从原 CHAT_RIVAL 池子取前 2 项（那些是出道后情敌主动追求的文案），改从新增的练习生期专属开场白数组取 1 条推
4. **manager 练习生期直接 return**：练习生未签经纪人，频道列表保留但点开空白
5. **group 仅当 `E.heroineGroup && E.heroineGroup.length > 0` 才预填**：练习生无团编制不推

### 性能与可靠性

- 修改均为 O(1) 早期 return 或池子标签补充，无性能影响
- 不破坏 `pushDailyChats` 已正确的练习生期过滤逻辑
- 不破坏 `flattenMaleLeadPool` 子池门控（trainee=null/greet=null/stage='debut'...）
- 不影响 `getChatPresetsByChannel`/`getChatAckByChannel`（stage 池子机制不变）

## Implementation Notes

- **池子 require 标签补全范围**：除已确认的 CHAT_MANAGER 第364/365行、CHAT_RIVAL 第262/276行外，扫描 CHAT_MANAGER 其他涉及出道后艺人资源/行程/记者/签售/打歌服的项（第368/370/371/372/379/383行等），凡涉及出道后语义的全部加 `require:'debut'`
- **rival 练习生期专属文案风格**：队友妹妹线下情敌=同队队友，开局已识但还没主动追求，文案日常向（团建/加练/隔墙听到练习声/你哥提到你），不出现"润喉糖放门口""我写歌关于你"等熟人才说的话
- **向后兼容**：旧存档（已玩到出道后）的 `_entSimChatHistory` 不动，仅影响新档首次点开手机时的初始化路径
- **不动 `pushDailyChats`**：该函数已在练习生期只推 brother+rival（`ui.js:2956-2959`），行为正确，本 plan 不触碰

## Directory Structure

```
src/ent-sim/
├── ui.js                          # [MODIFY] initChatChannel 函数体（:2831-2853）加职业/章节门控：maleLead/manager 练习生期 return、group 按 heroineGroup 门控、rival 练习生期走专属分支
└── pools/
    └── chat-male-lead.js          # [MODIFY] 三处：CHAT_RIVAL 第262/276行感冒项加 require:'debut' + 池子开头加 2-3 条练习生期专属情敌开场白；CHAT_MANAGER 第364/365行 + 其他出道后项补 require:'debut'
```

## Key Code Structures

`initChatChannel` 练习生期门控伪签名（仅说明意图，非实现）：

```js
// ui.js initChatChannel(ch) 开头新增门控
function initChatChannel(ch) {
  var E = GS.entSim;
  var isTrainee = E.career && E.career.profession === '练习生';
  // maleLead：练习生期不预填，保留 sentIdx=0 让快捷回复按钮可用
  if (ch === 'maleLead' && isTrainee) { /* 设空数组+sentIdx=0 后 return */ }
  // manager：练习生期不预填
  if (ch === 'manager' && isTrainee) return;
  // group：无团编制不预填
  if (ch === 'group' && !(E.heroineGroup && E.heroineGroup.length > 0)) return;
  // rival：练习生期走专属开场白分支（不从原池子取前2项）
  if (ch === 'rival' && isTrainee) { /* 从 RIVAL_TRAINEE_INIT 取1条推 */ }
  // ...原逻辑
}
```