---
name: 记忆系统优化_含事件卡片
overview: 针对两套记忆系统（换乘恋爱三层记忆 + 1v1 事件流记忆）全面优化，新增事件卡片系统实现事件与主线解耦。共7项：结构化压缩、跨天摘要、注入优化、事件日志去重、重复检测、衍生物去重、事件卡片系统。
todos:
  - id: structural-compression
    content: 改造 memory.js compressTodayToSummary 为 JSON 结构化输出，新增 compressOneHeartYesterday 和 dedupeEventLog 函数
    status: completed
  - id: one-heart-crossday-memory
    content: 在 state.js 新增 oneHeartDailySummaries 等字段，game-engine.js 1v1 新一天时触发昨日压缩
    status: completed
    dependencies:
      - structural-compression
  - id: prompts-injection-optimization
    content: prompts.js 1v1 注入最近3天摘要 + 换乘恋爱分层衰减注入 + 事件日志注入前去重 + 新增事件短故事 prompt
    status: completed
    dependencies:
      - structural-compression
      - one-heart-crossday-memory
  - id: eventlog-decay
    content: game-engine.js eventLog 去重 + 超200条时合并早期条目为摘要
    status: completed
    dependencies:
      - structural-compression
  - id: repetition-detection
    content: parser.js 和 validator.js 新增剧情重复检测（Jaccard相似度>40%返回correction）
    status: completed
    dependencies:
      - one-heart-crossday-memory
  - id: derivative-dedup
    content: 修复日记/信箱/朋友圈去重注入：日记扩充4篇、信箱注入5条历史、朋友圈补reply扩充5条
    status: completed
    dependencies:
      - structural-compression
  - id: event-card-system
    content: 实现事件卡片系统：data.js 新增 token 配置、game-engine.js 新增 generateEventStory、ui-renderer.js Tab 改5个且事件点击后生成短故事、新增 event-card.js 弹窗、state.js 新增 oneHeartEventCards、modals/index.js 导出
    status: completed
    dependencies:
      - prompts-injection-optimization
---

## 产品概述

优化《换乘恋爱 × SEVENTEEN》两种游戏模式的 AI 记忆系统，并重构 1v1 模式事件系统为独立卡片化短故事。

## 核心功能

### 记忆系统优化（6项）

- **1v1 跨天摘要压缩**：新一天时压缩昨日全文为结构化 JSON 摘要，注入最近 3 天记忆，防止跨天失忆
- **结构化压缩输出**：每日压缩从自由文本改为 JSON `{"events":[],"dialogues":[],"promises":[],"revealedInfo":[]}`，解析失败 fallback 截取
- **换乘恋爱分层衰减注入**：dailySummaries 按时间距离分层——最近 2 天完整、3-5 天前截取前 200 字、6+ 天前只留约定和揭示信息
- **剧情重复检测**：新生成剧情与最近 3 天摘要做关键词 Jaccard 相似度检查，超 40% 返回 correction
- **事件日志衰减与去重**：oneHeartEventLog 软上限 200 条，超限时合并最早 100 条为摘要；新增指纹去重（前8字+后8字）
- **衍生物去重**：日记去重参考扩充到最近 4 篇前 150 字；信箱注入最近 5 条历史消息；朋友圈去重补 reply 文本扩充到 5 条

### 事件卡片系统（第7项）

- **事件与主线解耦**：事件选择后不再将结果注入主线 prompt，改为由 AI 独立生成 150-200 字短故事
- **事件卡片存储**：每个事件生成 `{type, scenario, chosenOption, story, affChange, timestamp}` 存入 `oneHeartEventCards` 列表
- **底部 Tab 增至5个**：📖剧情 / 📝日记 / ⚡事件 / 📸朋友圈 / 🎭剧场，"⚡事件"Tab 展示纵向排列的事件卡片列表
- **事件触发方式不变**：回合后自动检查触发，弹出内嵌选项卡片，选完后立即生成短故事并存入卡片，主线正常继续

## Tech Stack

- 语言：JavaScript (ES Modules)，Node.js 18+
- 框架：Vanilla JS + Vite
- AI API：DeepSeek (`deepseek-chat` model)
- 状态管理：`GS` 全局对象 + `localStorage` 持久化
- 约束：`var` 而非 `let/const`；字符串拼接用 `+`；不引入新依赖；`escHtml()` 转义；旧存档向后兼容

## Implementation Approach

### 核心策略

按依赖关系排序 7 个优化点，所有改动基于现有 `memory.js` / `state.js` / `prompts.js` / `game-engine.js` / `ui-renderer.js` 架构。事件卡片复用日记弹窗模式（`diary-modal.js`），新增 `event-card.js` 模块。

### 关键技术决策

1. **1v1 跨天摘要复用 `compressTodayToSummary`**：在 1v1 "新一天"触发点调用，结果存入 `GS.oneHeartDailySummaries` 数组（限 7 条）

2. **事件卡片独立化**：事件选择后不再推入 `GS._pendingEventResults`，而是调用 `generateEventStory()` 生成短故事（token 配额 800，类似 `diaryGen: 1200` 但单篇更短），结果存入 `GS.oneHeartEventCards`。主线剧情 AI 看不到事件结果，叙事不再被带偏

3. **事件短故事 prompt**：在 `prompts.js` 新增 `buildOneHeartEventStoryPrompt()`，要求 AI 基于事件场景和玩家选择，生成一段 150-200 字的独立小剧场，禁止融入主线

4. **事件卡片弹窗**：新增 `modals/event-card.js`，参考 `diary-modal.js` 的 overlay + 卡片列表模式，每个卡片显示事件类型标签、场景、选择、短故事、好感度变化

5. **重复检测**：Jaccard 用中文 2+ 字关键词（过滤 STOP_WORDS），阈值 40%，新一天场景跳过

6. **事件日志指纹去重**：前8字+后8字指纹，保留首次出现，因为 AI 提取措辞可能有微小差异

### Performance & Reliability

- 压缩调用复用 `TOKEN_CONFIG.dailySummary`（3000 tokens），不增加配额
- 事件短故事 token 配额 800，生成耗时 < 2s
- 1v1 跨天压缩在新一天加载时异步执行，try/catch 包裹失败时 fallback 截取尾部 1000 字
- 重复检测关键词提取复杂度 O(n)，单次 < 1ms
- `oneHeartDailySummaries` 数组限制 7 条，超限时 shift 最早一条
- `oneHeartEventCards` 数组限制 50 条，超限时 shift 最早一条
- 衍生物去重阈值 0.5（高于剧情检测 0.4），重试只做 1 次
- 旧存档兼容：`migrateSave` 中所有新字段都有 undefined 兜底

## Architecture Design

```
src/
├── memory.js               # [MODIFY] compressTodayToSummary 改结构化JSON；新增 compressOneHeartYesterday；新增 dedupeEventLog
├── state.js                # [MODIFY] 新增 oneHeartDailySummaries, oneHeartEventCards 等字段 + migrateSave 兜底
├── prompts.js              # [MODIFY] 1v1注入最近3天摘要；换乘分层衰减；日记/朋友圈/信箱去重扩充；新增事件短故事prompt；移除事件结果注入主线
├── game-engine.js          # [MODIFY] 1v1新一天调用昨日压缩；eventLog衰减裁剪+去重；新增 generateEventStory()；事件点击后调用生成短故事
├── ui-renderer.js          # [MODIFY] 底部Tab改为5个（⚡事件插到日记和朋友圈之间）；事件选项点击后改为生成短故事+存卡片+继续主线
├── modals/event-card.js    # [NEW] 事件卡片列表弹窗（参考 diary-modal 样式）
├── modals/index.js         # [MODIFY] 导出 showEventCardModal
├── modals/message-modal.js # [MODIFY] generateMessage 注入最近5条历史消息 + 输出后去重校验
├── data.js                 # [MODIFY] ONE_HEART_TOKEN_CONFIG 新增 eventStoryGen: 800
├── parser.js               # [MODIFY] validateOneHeartNarrative 增加重复检测
└── validator.js            # [MODIFY] validateNarrative 增加重复检测
```

## Directory Structure

### 新增文件

- `src/modals/event-card.js` — [NEW] 事件卡片列表弹窗。展示 `GS.oneHeartEventCards` 数组，纵向排列卡片。每个卡片含：事件类型彩色标签（吃醋/惊喜/争吵/告白等）、事件场景摘要、玩家选择、AI 生成的短故事（150-200字）、好感度变化。支持点击关闭和遮罩关闭。参考 `diary-modal.js` 的 overlay 样式和 `modal-content` 结构。

### 修改文件

- `src/memory.js` — [MODIFY] `compressTodayToSummary()` 改 system prompt 要求 JSON 结构化输出；新增 `compressOneHeartYesterday()` 截取昨日剧情并调用压缩；新增 `dedupeEventLog(arr)` 指纹去重函数。
- `src/state.js` — [MODIFY] `defaultGameState()` 新增 `oneHeartDailySummaries: []`、`oneHeartEventCards: []`；`migrateSave()` 新增对应兜底初始化。
- `src/prompts.js` — [MODIFY] (1) 1v1 phase 注入处新增 `oneHeartDailySummaries` 最近3天；(2) 换乘恋爱历史注入改分层衰减；(3) 日记/朋友圈/信箱去重参考扩充；(4) 新增 `buildOneHeartEventStoryPrompt()` 事件短故事 prompt；(5) 移除 `GS._pendingEventResults` 注入主线的逻辑（改为不注入）。
- `src/game-engine.js` — [MODIFY] (1) 新一天触发处调用 `compressOneHeartYesterday`；(2) `eventLog` concat 后去重+衰减；(3) 新增 `export async function generateEventStory(ev)` 生成事件短故事；(4) 事件选项点击后改为调用 `generateEventStory` → 存 `oneHeartEventCards` → 继续主线。
- `src/ui-renderer.js` — [MODIFY] (1) 底部 Tab 顺序改为 📖剧情/📝日记/⚡事件/📸朋友圈/🎭剧场；(2) 事件选项点击后改为：计算好感度 → 生成短故事 → 存入卡片 → `renderAll()` 回到主线（不再 `await generateOneHeartRound()`）。
- `src/modals/index.js` — [MODIFY] 新增 `export { showEventCardModal } from './event-card.js'`。
- `src/modals/message-modal.js` — [MODIFY] `generateMessage` prompt 注入最近 5 条历史消息；生成后 Jaccard > 0.5 则重试 1 次。
- `src/data.js` — [MODIFY] `ONE_HEART_TOKEN_CONFIG` 新增 `eventStoryGen: 800`。
- `src/parser.js` — [MODIFY] `validateOneHeartNarrative` 末尾增加 Jaccard 重复检测（与 `oneHeartDailySummaries` 比较，> 0.4 返回 correction）。
- `src/validator.js` — [MODIFY] `validateNarrative` 增加类似重复检测（与 `dailySummaries` 比较）。

### 关键代码结构

```javascript
// memory.js 新增
export async function compressOneHeartYesterday() {
  // 从 GS.oneHeartLastDayStartIdx 截取到 todayFullText.length
  // 调用 compressTodayToSummary
  // 结果 push 到 GS.oneHeartDailySummaries（限7条）
  // 更新 GS.oneHeartLastDayStartIdx
}

export function dedupeEventLog(arr) {
  // 按"前8字+后8字"指纹去重，保留首次出现
}

// game-engine.js 新增
export async function generateEventStory(ev) {
  // 调用 buildOneHeartEventStoryPrompt(ev)
  // generateWithRetry maxTokens: ONE_HEART_TOKEN_CONFIG.eventStoryGen
  // 返回 story 文本，存入 GS.oneHeartEventCards
}

// prompts.js 新增
export function buildOneHeartEventStoryPrompt(ev) {
  // 基于事件类型、场景、玩家选择、当前世界观
  // 要求生成 150-200 字独立短故事
  // 禁止与主线融合，禁止改变主线关系状态
}

// event-card.js 新增
export function showEventCardModal() {
  // 渲染 overlay + GS.oneHeartEventCards 纵向列表
  // 每个卡片：类型标签 + 场景 + 选择 + 短故事 + 好感度变化
}
```

## Agent Extensions

无特殊扩展需要，全部使用现有项目架构和浏览器原生 API 实现。