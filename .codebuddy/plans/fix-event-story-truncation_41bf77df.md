---
name: fix-event-story-truncation
overview: 1v1 事件小剧场故事被 max_tokens 截断（写到一半戛然而止）。根因是 story 模式复用了完整 1v1 system prompt（3000+ tokens 含时间线/团队设定/详细人设），AI 输出超长。改为精简专用 system prompt + 提高 max_tokens 兜底。
todos:
  - id: new-story-sysprompt
    content: prompts.js 新建 buildOneHeartEventStorySystemPrompt 精简函数，并移除 buildOneHeartSystemPrompt 的 story 分支恢复原样
    status: completed
  - id: switch-call
    content: game-engine.js generateEventStory 改用新函数并更新 import
    status: completed
    dependencies:
      - new-story-sysprompt
  - id: raise-tokens
    content: data.js eventStoryGen 800 改为 1500
    status: completed
---

## 问题描述

1v1 模式事件卡片的小剧场故事生成时，故事写到一半戛然而止，句子断在中间没有结尾。使用 DeepSeek（deepseek-chat / deepseek-reasoner）模型。

## 根本原因

1. **max_tokens 过小**：`data.js:1004` `eventStoryGen: 800`，对受长上下文影响的 AI 输出不够
2. **system prompt 过载**：`buildOneHeartSystemPrompt('story')` 只替换了开头 JSON 指令，仍完整拼接写作风格/世界观/女主详细人设/时间线约束/成员详情/关系网档案/SEVENTEEN 团队设定（合计 3000+ tokens）。AI 受海量上下文影响，输出远超 150-200 字目标，800 tokens 截断（finish_reason=length）
3. **无截断感知**：`callDeepSeek` 不读取 `finish_reason`，截断后直接返回半截故事

## 修复目标

- 事件小剧场走精简专用 system prompt，只保留小剧场必需的核心设定
- max_tokens 提到 1500 兜底
- 强化"严格 150-200 字"约束，确保故事完整输出

## 技术栈

- 现有项目：JavaScript (ES Modules), Vite, Vanilla JS，无新依赖
- 代码风格：`var`、字符串 `+` 拼接、不用模板字符串

## 实现方案

### 核心策略

新建**精简专用** system prompt 函数 `buildOneHeartEventStorySystemPrompt()`，只保留小剧场必需的核心设定（写作风格、女主名+性格、男主名+性格+互动风格、情敌名、世界观标签、好感度阶段一句话），去掉时间线约束/SEVENTEEN 团队设定/详细人设/关系网档案等过载内容。原 `buildOneHeartSystemPrompt` 的 `story` 分支改为不再使用（移除死代码，恢复无参签名），避免未来误用复用完整 prompt 又导致过载。

### 关键决策

1. **新建专用函数而非复用**：小剧场是独立片段，不需要主线时间线/团队设定/详细人设。复用完整 prompt 是过载根因，专用函数从源头控制上下文量（目标 < 600 tokens）
2. **保留好感度阶段**：好感度影响互动分寸（低好感克制/高好感亲密），但只写一句话阶段（如"暧昧期"），不写数值和长段约束
3. **max_tokens 800→1500**：精简 prompt 后 AI 输出应能控制在 200 字内，1500 是保险兜底，避免边界截断
4. **移除 buildOneHeartSystemPrompt 的 story 分支**：该分支仅 generateEventStory 使用过，改用专用函数后即为死代码；移除可避免未来误用。`buildSystemPrompt()` 第 41 行无参调用 `buildOneHeartSystemPrompt()` 不受影响
5. **不新增 finish_reason 检测**：精简 prompt + 提高 max_tokens 已能解决截断；finish_reason 检测涉及 callDeepSeek 通用层改动，影响面大，本次不做（YAGNI）

### 性能

- 精简 system prompt 从 3000+ tokens 降至 < 600 tokens，单次请求 token 消耗显著下降
- AI 输出聚焦，不易跑题超长，减少截断概率

## 涉及文件

- `src/prompts.js` [MODIFY] — 新建 `buildOneHeartEventStorySystemPrompt()` 精简函数；移除 `buildOneHeartSystemPrompt` 的 `format` 参数及 `story` 分支，恢复原 JSON-only 单段实现
- `src/game-engine.js` [MODIFY] — `generateEventStory` 改用 `buildOneHeartEventStorySystemPrompt()`；更新 import
- `src/data.js` [MODIFY] — `eventStoryGen: 800` → `1500`

## 实现要点

- 精简 system prompt 内容（约 < 600 tokens）：角色定位（恋爱故事写手）、输出说明（只输出故事正文/第一人称/150-200字/禁止游戏术语/禁止评价选择结果）、写作风格、世界观标签、女主名+性格、男主名+性格+互动风格、情敌名（标注非正主）、好感度阶段一句话
- `buildOneHeartEventStoryPrompt`（user message）已有场景/选择/要求，保持不变，与新 system prompt 互补不冲突
- `cleanEventStoryText` 保留（DeepSeek chat 不输出 think 标签，但清理无害且防御推理模型）