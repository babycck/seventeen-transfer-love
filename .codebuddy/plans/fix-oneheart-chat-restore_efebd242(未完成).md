---
name: fix-oneheart-chat-restore
overview: 修复 1v1「聊天」功能并恢复入口。根因是 sendChatMessage 复用了叙事用系统 prompt（强制 JSON/长剧情），与聊天角色扮演指令冲突导致乱说/错乱；失败后 return '' 导致不显示。修复：新增独立的聊天系统 prompt、简化后处理、补对话上下文、恢复聊天 Tab 入口。
todos:
  - id: add-chat-system-prompt
    content: prompts.js 新增 buildOneHeartChatSystemPrompt 并精简 chat 分支为最近对话+当前消息
    status: pending
  - id: fix-sendchatmessage
    content: game-engine.js 改 sendChatMessage 用新 prompt、简化后处理、失败兜底文案
    status: pending
    dependencies:
      - add-chat-system-prompt
  - id: restore-chat-tab
    content: ui-renderer.js 恢复聊天 Tab 入口并接分发器 showChatModal
    status: pending
  - id: lower-chat-token
    content: data.js 将 chatReply 由 1000 降至约 400 抑制长输出
    status: pending
  - id: verify-build
    content: npm run build 验证并本地 dev 试玩聊天多轮与兜底
    status: pending
    dependencies:
      - add-chat-system-prompt
      - fix-sendchatmessage
      - restore-chat-tab
      - lower-chat-token
---

## 用户需求

恢复「只为你心动」1v1 模式下的聊天气泡入口，并修复此前因聊天调用 API 导致的三类毛病：内容错乱、不显示、乱说。

## 产品概述

玩家可在 1v1 模式中通过底部「聊天」Tab 打开与男主的手机聊天弹窗，发送消息并查看对方短口语回复。本次在恢复入口的同时，从根因层面修复聊天生成质量，使回复稳定为角色口吻的短消息，且多轮上下文连贯、API 异常时仍有兜底显示。

## 核心功能

- 恢复聊天入口：底部 Tab 栏加回「聊天」Tab，点击打开 `showChatModal()` 聊天弹窗。
- 独立聊天系统 prompt：新增专用 system prompt，明确「你是角色本人、手机聊天、只输出 1-3 句口语短消息、严禁 JSON / markdown / 导演旁白 / 心理分析」，消除与叙事 JSON prompt 的冲突（乱说根因）。
- 上下文前移与补全：把人设、好感度档位、时段、（娱乐圈）当日行程、冷战 / 情敌状态等稳定上下文从 user-message 移入 system prompt；user-message 仅携带最近对话轮次与当前消息，保证多轮连贯。
- 简化后处理：去除半句截断（`slice(-50)`）与脆弱 JSON 解析，改为去代码围栏 / 首尾引号、意外 JSON 时稳健提取字符串字段、按句边界在约 200 字内截断（错乱根因）。
- 失败兜底显示：API 返回空或异常时不再 `return ''`（导致「对方没有回应」），改为返回友好兜底文案，保证「显示」（不显示根因）。
- 降低聊天 token 上限（`chatReply` 1000→约 400），防止长输出。

## 技术栈

- 现有项目：Vanilla JS + Vite（ES Modules），无新增依赖，沿用浏览器原生 API。
- 复用既有：`buildOneHeartSystemPrompt` / `buildOneHeartUserMessage` 的 1v1 prompt 体系、`sendChatMessage`、`showChatModal`、`GS.chatHistory`、`ONE_HEART_TOKEN_CONFIG`。

## 实现方案

### 总体策略

聊天之所以「乱说 / 错乱 / 不显示」，根因是 `sendChatMessage` 复用了叙事系统 prompt（`buildOneHeartSystemPrompt` 强制只输出 JSON），而 chat 分支的 user-message 试图覆盖成「你是角色聊天」，system 优先级更高导致模型吐 JSON / 长剧情 / 旁白；再叠加脆弱后处理与失败返回空串，放大为三类毛病。

解法：为聊天新建**专用 system prompt**，把角色约束与稳定上下文固化在 system 层；user-message 退化为「最近对话 + 当前消息」的薄封装；后处理只做安全清洗；失败给兜底文案。入口则在 Tab 栏补回聊天 Tab 并重接分发器。

### 关键技术决策

1. **新增 `buildOneHeartChatSystemPrompt()`**：与 `buildOneHeartSystemPrompt()` 并列，写入「角色本人 / 手机聊天 / 仅输出短口语 / 禁 JSON / 禁导演指令 / ≤约 80 字」硬约束，并内置人设、好感度档位、时段、（娱乐圈）当日行程、冷战 / 情敌状态。这样上下文稳定、不被 user-message 覆盖。
2. **chat 分支精简**：`buildOneHeartUserMessage` 的 `type==='chat'` 分支移除已上移到 system 的上下文，仅注入 `GS.chatHistory` 最近约 10 轮（role/content）+ 当前 `userMessage`，解决多轮跑偏。
3. **后处理简化**：仅 `raw.replace(/^[\s"'```]+|[\s"'```]+$/g,'')`；若首字符为 `{`/`[` 则稳健提取 `content`/`narrative`/拼接 `blocks[].content`；最终按句边界（`。！？`）在 200 字内截断，**删除 `slice(-50)`**。
4. **兜底显示**：`raw` 为空或 `catch` 异常时 `return '（网络开小差了，再发一次试试）'`，保证弹窗始终有内容。
5. **恢复入口**：Tab 栏加回「聊天」按钮（带通知红点占位），分发器加 `case 'chat': showChatModal(); break;`，与既有 diary/event/moments/theater 同构。
6. **降 token**：`chatReply` 1000→400，进一步抑制长输出。

### 兼容性

- 全部以 `GS.gameMode==='oneHeart'` 守卫，换乘模式与其他世界观完全不受影响。
- 保留既有好感 / 次数机制（每 5 条 +1、每日最多 3 次加成、每日最多 20 条）与 `GS.chatHistory` 持久化（重开弹窗历史仍在）。
- `chat-modal.js` 主体、打字指示器、话题引导按钮均正常，不改动。

## 实现要点（防回归）

- 仅修改 `sendChatMessage` 的 system prompt 来源与后处理段，不破坏其 `GS.chatHistory.push` / `saveGame` 与好感次数逻辑。
- 新 system prompt 复用 `buildOneHeartUserMessage` 既有上下文字段（member / hp / affection / schedule / coldWar / rival），避免重复计算。
- 失败兜底文案计入 `chatHistory` 的 ai 角色，确保重开仍可见、不丢轮次。
- 不在聊天路径注入叙事 correction 反馈（避免污染角色口吻）。

## 架构设计

本次为局部修复，不引入新架构。数据流：
用户发消息 → `showChatModal` 收集输入 → `sendChatMessage` 取最近对话 + 当前消息 → 调 `buildOneHeartChatSystemPrompt`（system）+ 精简 chat user-message → `generateWithRetry(plainText)` → 安全清洗 → push `GS.chatHistory` → 弹窗渲染。

## 目录结构

```
src/
├── prompts.js            # [MODIFY] 新增 buildOneHeartChatSystemPrompt()（独立聊天 system prompt）；精简 buildOneHeartUserMessage 的 chat 分支（移上下文到 system，user 仅带最近对话+当前消息）
├── game-engine.js        # [MODIFY] sendChatMessage()：改用新聊天 system prompt；简化后处理（去 slice(-50)、稳健 JSON 提取、句边界截断）；失败返回兜底文案而非空串；保留好感/次数/chatHistory 逻辑
├── ui-renderer.js        # [MODIFY] 底部 Tab 栏（约 1504 行）加回「聊天」Tab（data-tab="chat"，含通知红点占位）；分发器（约 2553 行）加 case 'chat': showChatModal(); break;
└── data.js               # [MODIFY] ONE_HEART_TOKEN_CONFIG.chatReply 由 1000 降至约 400，抑制长输出
```

（注：`src/modals/chat-modal.js` 的 `showChatModal()` 主体无需改动，恢复 Tab 入口后即被调用。）

## 关键代码结构

```js
// prompts.js —— 新增独立聊天 system prompt（与 buildOneHeartSystemPrompt 并列）
export function buildOneHeartChatSystemPrompt() {
  // 返回字符串：角色本人 + 手机聊天 + 仅输出 1-3 句口语短消息 + 严禁 JSON/markdown/导演旁白/心理分析 + ≤约80字
  // 内置：人设(member) / 好感度档位 / 时段 / (娱乐圈)当日行程 / 冷战 / 情敌状态
}

// game-engine.js —— sendChatMessage 调用点变更
var sysMsg = buildOneHeartChatSystemPrompt();   // 原 buildOneHeartSystemPrompt()
var userMsg = buildOneHeartUserMessage('chat', { userMessage: userMessage.trim(), recentHistory: GS.chatHistory.slice(-10) });
```