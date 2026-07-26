# SEVENTEEN Project — Agent Guide

## Project Overview
《换乘恋爱 × SEVENTEEN》是一款基于 AI 生成的沉浸式恋爱文字游戏。包含两种模式：

1. **💔 换乘恋爱（经典模式）** — 玩家扮演女主，与 3 位 SEVENTEEN 成员（其中一位是秘密前任 X）在心动小屋共度 12 天，通过选择、自由输入、发短信等方式推动剧情，最终做出「复合」或「换乘」的选择。
2. **💗 只为你心动（1v1 模式）** — 玩家与 1 位 SEVENTEEN 成员展开专属恋爱故事。可选世界观（心动小屋/校园/办公室/邻居/旅途）、写作风格（甜宠/现实/慢热/热烈）。底部 4 Tab（剧情/聊天/朋友圈/剧场）+ 快捷指令抽屉。

## Tech Stack
- **Language / Runtime:** JavaScript (ES Modules), Node.js 18+
- **Framework:** Vanilla JS + Vite
- **Package manager:** npm
- **Key dependencies:** Vite 5.4 (build tool)
- **AI API:** DeepSeek (`deepseek-chat` model)

## Common Commands
- **Install:** `npm install`
- **Develop:** `npm run dev`（局域网可用 `npm run dev -- --host`）
- **Build:** `npm run build`（或 `node ./node_modules/vite/bin/vite.js build`）
- **Preview:** `npm run preview`

## Code Conventions
- Follow the existing style and formatting in the codebase.
- Make minimal, focused changes.
- Do not run `git commit`, `git push`, or other git mutations unless explicitly asked.
- Do not install global packages; use isolated environments when necessary.
- 使用 `var` 而非 `let/const`（保持与现有代码风格一致）。
- 字符串拼接使用 `+` 运算符，不使用模板字符串（ES6 template literals）。
- 不引入新依赖，所有功能使用浏览器原生 API（CSS 变量、Canvas 2D、requestAnimationFrame）。

## Useful Paths
- `src/` — 源代码
- `dist/` — 生产构建输出
- `backend/` — Cloudflare Workers 后端（激活码系统，已关闭）
- `backend-tencent/` — 腾讯云后端版本（轻量服务器 / SCF，已关闭）
- `public/` — 静态资源（测试 mock 剧情、成员立绘素材）

## Notes for Agents
- This file is loaded as project instructions via `kilo.json`.
- Update the sections above and below as the project evolves.
- **不要删除 `src/app.js.backup`** — 旧版单文件备份，部分函数结构参考自它。
- 所有 AI 生成文本插入 DOM 前必须经过 `escHtml()` 转义（`& < > " '` → `&amp; &lt; &gt; &quot; &#39;`）。
- 禁止在生产环境使用 `alert()` / `confirm()`，统一使用 `showToast()` / `showConfirmModal()`。
- `GS` 引用不可被替换（`setGS` 使用 `Object.assign`）。
- `store.js` 的 `SET_FLAG` 已加白名单，不可通过 dispatch 任意覆盖字段。

---

# 架构总览（v22 + 1v1）

```
src/
├── main.js             — 入口（import style.css + app.js）
├── app.js              — 模块集合入口（import 所有模块）
├── app.js.backup       — ⚠️ 保留备份，不要删除
├── game-engine.js      — 游戏核心逻辑（约 1550 行）+ 1v1 模式函数
├── ui-renderer.js      — 页面渲染调度 + 主题切换 + Canvas图表 + 1v1 界面
├── state.js            — 状态管理、读写存档、迁移（v22）
├── store.js            — 状态机（dispatch/reducer/subscribe）
├── parser.js           — 解析 AI 返回文本（narrative / options）；`safeParseJson()` 稳健解析（未加引号键名修复 + 平衡括号提取 + repairJson 兜底），失败返回 null 不抛错
├── formatters.js       — 格式化工具（日期、天气、星座等）
├── prompts.js          — Prompt 构建（system + user message）
├── ai-generator.js     — AI 生成包装（自动重试 + correction 反馈）
├── api.js              — API 调用层（DeepSeek / 测试场景）
├── data.js             — 静态数据（成员、礼物、事件、真心话卡等）
├── memory.js           — 今日剧情压缩 / 历史回顾
├── x-archive.js        — X 关系档案生成
├── promises.js         — 约定提取 / 信息揭示
├── affection.js        — 好感度操作 + 飘字动画 + 里程碑解锁
├── auth.js             — 激活码鉴权（前端，已关闭）
├── init.js             — 游戏初始化（含主题初始化）
├── utils.js            — 通用工具（escHtml、showToast、randInt 等）
├── style.css           — 全局样式（CSS变量化 + 深色主题 + 动画）
├── screen-effect.js    — [NEW] 全屏特效框架（心碎/闪光/光效）
├── portrait.js         — [NEW] 成员立绘工具（5档选图 + emoji回退）
│
├── skeleton/           — 游戏逻辑骨架（5 模块）
│   ├── affection-engine.js  好感度结算（递减/疲劳/负增强 + 修罗场强度）
│   ├── drink-engine.js      喝酒计数
│   ├── option-engine.js     选项生成（AI 只写文案）
│   ├── event-triggers.js    事件触发（exMessage/jealousy）
│   └── scheduler.js         日程管理（日期/天气/任务卡/回礼）
│
├── ui/                 — UI 组件（5 模块）
│   ├── header-bar.js        顶部 Header（日期/好感度/按钮/主题切换/速度调节）
│   ├── narrative-box.js     剧情渲染（打字机速度可调 + 段落分类）
│   ├── option-panel.js      选项面板 / 真心话 / 提问箱
│   ├── action-bar.js        底部操作栏
│   └── free-input.js        自由输入框
│
├── modals.js           — Barrel（re-export 所有弹窗）
├── modals/             — 模态弹窗（19 模块）
│   ├── modal-factory.js      Modal DOM 工厂
│   ├── confirm-modal.js      [NEW] 确认弹窗（Promise<boolean>，防遮罩穿透）
│   ├── dating-dice.js        约会骰子
│   ├── day10-dating.js       Day10 自由约会
│   ├── midnight-call.js      午夜电话亭
│   ├── drunk-select.js       醉酒选人
│   ├── truth-answer.js       真心话回答
│   ├── sms-modal.js          短信发送（手机 UI）
│   ├── sms-history-modal.js  短信历史（emoji 收件人标识）
│   ├── x-archive-modal.js    X 关系档案
│   ├── x-items-modal.js      X 记忆物品
│   ├── gift-panel.js         送礼面板 + 送礼逻辑
│   ├── history-modal.js      历史剧情回顾
│   ├── help-modal.js         规则速览
│   ├── affection-panel.js    好感度面板
│   ├── heart-notes-modal.js  心动笔记（好感度+任务双来源标签）
│   ├── api-settings-modal.js API 设置
│   ├── chat-modal.js         [1v1] 实时聊天弹窗
│   ├── moments-modal.js      [1v1] 朋友圈弹窗
│   └── theater-modal.js      [1v1] 剧场番外弹窗
│
└── prompts/            — Prompt 模块化
    ├── index.js
    └── context-snapshot.js
```

**构建产物：** 63 modules, ~287KB JS, ~34KB CSS（gzip: ~124KB JS + 6KB CSS）

**调试工具：** 控制台输入 `window.__skeleton` 可查看/切换骨架模块状态。

---

# 核心功能模块

## 1. 状态与存档（state.js）
- `defaultGameState()` — 返回完整初始状态，新增字段必须在此定义。
- `migrateSave()` — 旧存档兼容迁移，所有新增字段需在此兜底初始化（当前版本 `v22`）。
- `resetGame()` — **async function**，重置进度，保留：
  - API 设置：`apiKey` / `rememberApiKey` / `apiProvider` / `apiModel`
  - 用户偏好：`theme` / `typewriterSpeed`
  - 激活码设置：`svt_auth_*` localStorage 项
- `setGS(newGS)` — 使用 `Object.assign(GS, newGS)` 保持引用不变，避免模块缓存失效。
- 存档使用 `localStorage`（`local_game_state`），鉴权系统关闭时无需后端。

### v22 新增状态字段
| 字段 | 类型 | 用途 |
|---|---|---|
| `theme` | `string` | 主题偏好：`'auto'` / `'light'` / `'dark'`，持久化 `localStorage('svt_theme')` |
| `typewriterSpeed` | `number` | 打字机速度：0=即时 / 100=慢 / 50=中 / 20=快 / 10=极快，默认 50 |
| `affectionHistory` | `array` | 每日好感度快照 `[{day, aff, drinkCounts, rivalryIntensity}]` |
| `rivalryIntensity` | `number` | 修罗场强度值（>=2 成员好感度 >=60 时递增） |
| `xGhostEvent` | `object` | X 幽灵事件 `{day}`，Day 3-5 15% 触发 |
| `flashbackShown` | `object` | 记忆闪回状态 `{memberId: 'pending'|true}` |
| `nextEpisodePreview` | `string` | 下集预告文本 |
| `xItemsRevealRound` | `number` | X记忆物品轮转索引（Day 4/5 每次公开 1 位成员），默认 0 |

## 2. AI 文本生成流程
1. `buildSystemPrompt()` + `buildUserMessage(sceneType, opts)` → 生成 prompt
2. `generateWithRetry(sysPrompt, userMsg, ...)` → 调用 `callDeepSeek()`（ai-generator.js）
3. `parseNarrative(rawText)` → 解析为结构化对象（剧情、选项、状态等）
4. `validateNarrative(rawText, parsed)` → 校验格式，返回 corrections
5. `applyParsedSideEffects(parsed)` → 将 AI 返回的状态副作用应用到 `GS`
6. 重试机制：最多 3 次，correction 反馈注入，但不对原始 `userMsg` 造成污染。

## 3. 游戏阶段（Day 1-12）
- 每天 4 个 phase：`早/午/傍晚/深夜`（`phaseIndex` 0-3）
- `generatePhaseNarrative()` — 生成主剧情（含 X幽灵/修罗场/闪回检测注入）
- `handleOptionChoice()` — 处理选项选择
- `handleFreeAction()` — 处理自由输入
- `continueToday()` — 继续今天（最多 3 次）
- `goToNextDay()` → `proceedToNextDay()` — 进入下一天，触发清理逻辑和下集预告

## 4. 特殊事件系统

### 4.1 前任来电/来信（exMessage）
- **触发：** Day 5-9 傍晚/深夜（phaseIndex >= 2），15% 概率，需至少一位非 X 成员好感度 >= 20
- **效果：** ignore(-2) / comfort(+3) / question(-5)
- **清理：** `proceedToNextDay` 中 `GS.exMessage = null`

### 4.2 真心话大冒险惩罚版（truthPunishment）
- **触发：** Day 11 深夜，女主喝酒 >= 2 杯
- **类型：** carry（公主抱）/ darkroom（强制独处）/ reverse（反问）
- **清理：** `proceedToNextDay` 中 `GS.truthPunishment = null`

### 4.3 午夜匿名电话亭（midnightCall）
- **触发：** Day 6 深夜（phaseIndex === 3）
- **效果：** 目标 +5，其他人 -2
- **State：** `{ day, status, targetId, content, reaction }`
- **清理：** `proceedToNextDay` 中 `GS.midnightCall = null`

### 4.4 匿名提问箱公开处刑（questionBox）
- **触发：** Day 7 傍晚（phaseIndex === 2）
- **玩法：** 随机 4 题，女主被抽中时可选"如实回答"或"拒绝并喝酒(+2杯)"
- **State：** `{ active, day, questions, currentQuestion, answered, history }`
- **清理：** `proceedToNextDay` 中 `GS.questionBox = null`

### 4.5 随机事件（RANDOM_EVENTS）
- 每天 15% 触发率，由 `evaluateCond(condition, GS)` 判断条件
- 条件表达式支持运算符：`==`、`>=`、`<=`、`>`、`<`，以及多条件拼接 `&&`（不支持 `||`，需拆分为多个独立事件）。字段名：day / phase / season / weather / affection（取英雄好感，恒 0 已废弃语义）/ drinkCount（女主饮酒数）/ memberDrinkCount（在场成员最大饮酒数）。
- `re_2` 已拆分为 `re_2_summer` / `re_2_winter`

### 4.6 任务卡（Mission Card）
- 由 `skeletonMissionCard()` 在 `proceedToNextDay` 时检查触发
- 弹出 `showMissionCardModal()` 非阻塞弹窗

### 4.7 成员回礼（Return Gift）
- `scheduleReturnGift(memberId)` — 安排下一天回礼
- `checkPendingReturnGifts()` — 次日在 `proceedToNextDay` 中检查
- 回礼面板 `showReturnGiftModal()`，好感度 +2
- `gift-panel.js` 通过 `window.scheduleReturnGift` 调用，避免与 `game-engine.js` 循环依赖

### 4.8 X 幽灵存在（xGhostEvent）[NEW v22]
- **触发：** Day 3-5，每天 15% 概率，每局只触发一次
- **效果：** AI 在剧情中浮现一条来自场外 X 的碎片痕迹（未署名纸条/陌生来电/无主物品）
- **STATE：** `xGhostEvent: { day }`
- **清理：** `proceedToNextDay` 中 `GS.xGhostEvent = null`

### 4.9 修罗场强度（rivalryIntensity）[NEW v22]
- **触发：** 每次好感度结算后，若 >= 2 位成员好感度 >= 60，强度 +1
- **效果：** 
  - 强度 >= 2：注入成员暗中较劲 prompt
  - 强度 >= 4：注入正面冲突/冷战 prompt
- **STATE：** `rivalryIntensity: number`（上限 5）

### 4.10 记忆闪回（flashback）[NEW v22]
- **触发：** 好感度突破 80 时，20% 概率触发，每位成员每局只触发一次
- **效果：** AI 在下一段剧情中插入约 200 字记忆闪回（💭 标记包围）
- **STATE：** `flashbackShown: { memberId: 'pending'|true }`

### 4.11 下集预告（nextEpisodePreview）[NEW v22]
- **触发：** 每天进入下一天时，与次日剧情并发生成
- **效果：** 全屏淡入遮罩显示 ~30 字悬念预告，3.5 秒后自动消失
- **STATE：** `nextEpisodePreview: string`
- **容错：** AI 调用失败/超时时静默跳过，不阻塞游戏流程

### 4.12 倒计时仪式感 [NEW v22]
- **触发：** Day >= 10 且未结束
- **效果：** Header 显示 `⏳ 距离最终选择还有 X 天`（红色脉冲动画）

## 5. 好感度系统（affection.js）
- `updateAffection(memberId, delta)` — 更新 + 飘字动画 + 里程碑解锁
- `addAffectionLog(memberId, delta, reason)` — 记录日志
- `getAffectionDesc(aff)` — 5 档描述：💔(负) → 💙(0-14) → 😐(15-39) → 💚(40-59) → ❤️(60-79) → ❤️🔥(80+)
- `spawnAffFloat(memberId, delta)` — 好感度变化飘字动画（绿色+N/红色-N，100ms 窗口累积后飘出，替代原 300ms 防抖）
- `unlockHeartNoteByAffection(memberId, threshold)` — 好感度 40/60/80 阈值解锁心动笔记
- `triggerAffectionFromChoice(choiceText, opt)` — 根据选项文本推断目标成员加分
  - 优先使用 `opt.affName/affDelta`（AI 显式返回值）；未匹配到成员时依次 fallback 到 `pendingAffChanges` → Toast 提示；不再 silent return
- 面板：`showAffectionPanel()`（affection-panel.js）

### 好感度结算引擎（skeleton/affection-engine.js）
- `settlePendingAffChanges()` — 批量结算 pending 好感度变化
- 负面行为扣分增加：吃醋/嫉妒 → -5，未收到短信/忽略 → -3
- 同一行为重复做效果递减：第一次正常，第二次 -2，第三次起 -4（保底 +1）
- 好感度疲劳值：连续对同一人行动效率每轮下降（`Math.floor(fatigue/2)`）
- 修罗场强度检测：结算后若 >=2 位成员好感度 >=60，`rivalryIntensity++`

## 6. 短信系统（SMS）
- `sendSms()` — 发送短信，AI 生成回复剧情
- 发送面板：`showSmsModal()`（手机 UI 样式，气泡 + 收件人按钮）
- 短信历史：`showSmsHistoryModal()`（emoji 圆形色块 + 醒目标识收件人）
- 数据结构：`smsHistory = [{day, target, name, content}]`
- 对方不回复（回复剧情进 `consequenceNarratives` 主剧情流）

## 7. 送礼系统（Gift）
- `showGiftPanel()` — 选择礼物和成员
- `sendGift(memberId, gift)` — 生成回礼剧情，调用 `window.scheduleReturnGift`
- 礼物改造：`showRemakeGiftModal()` — 重新改造已有礼物

## 8. 真心话系统（Truth）
- `handleTruthRound()` — 处理真心话轮次（3 轮制：light/medium/deep）
- `showTruthAnswerModal()` — 回答输入弹窗
- Day 11 深夜触发惩罚版（见 4.2）
- `TRUTH_CARDS` — 18 题真心话问题卡（data.js）

## 9. X 档案系统（x-archive.js）
- `generateXBackstory()` — 生成 X 背景故事
- `generateMemberXBackstory(member)` — 生成每位成员视角的 X 故事
- `generateAllXArchives()` — 批量生成
- 失败标记文本为 `"X档案生成失败"`，而非仅 `"失败"`（避免正常文本误判）
- 展示面板：`showXArchiveModal()` / `showXItemsModal()`
- `buildXArchiveItemsPrompt` 与 `buildXArchiveItemsMemberPrompt` 输出格式已统一为「名称/样式/故事」，`x-items-modal.js` 按「故事：」前缀解析
- Day 4/5 记忆物品公开使用 `GS.xItemsRevealRound` 轮转，每次只注入 1 位成员的物品

## 10. 心动笔记系统（heart-notes）
- **好感度解锁**：阈值 40/60/80 分别解锁 HEART_NOTE_TEMPLATES index 0/1/2
- **秘密任务解锁**：完成秘密任务时按 text 去重从 index 3 开始取未解锁的笔记
- 笔记结构：`{text, unlockedAt: {day, source: 'affection'|'mission', threshold?, mission?}}`
- 向后兼容：旧数据无 `source` 字段默认 `'mission'`
- 展示面板：`showHeartNotesModal()`（来源标签区分 💚好感度 / 🎯秘密任务）

## 11. 1v1「只为你心动」模式

### Setup Wizard 流程
- Step 1: API 设置 + 模式选择（换乘恋爱 / 只为你心动）
- 换乘恋爱：Step 2（女主人设）→ Step 3（选3人）→ Step 4（标X）→ Step 5（游戏）
- 只为你心动：Step 2（选1人）→ Step 3（世界观+风格）→ Step 4（确认）→ Step 5（游戏）

### 状态字段
| 字段 | 默认值 | 说明 |
|---|---|---|
| `gameMode` | `'transfer'` | `'transfer'`=换乘恋爱，`'oneHeart'`=只为你心动 |
| `oneHeartMember` | `''` | 1v1 模式下选中的成员 ID |
| `worldSetting` | `''` | 世界观 ID（data.js ONE_HEART_WORLDS） |
| `writingStyle` | `''` | 写作风格 ID（data.js ONE_HEART_STYLES） |
| `chatHistory` | `[]` | `[{role:'user'|'ai', content}]` |
| `moments` | `[]` | 朋友圈动态 `[{id, post, reply, timestamp}]` |
| `theaterHistory` | `[]` | 番外故事 `[{id, title, type, content, timestamp}]` |

### 游戏界面
- 底部 4 Tab Bar（剧情/聊天/朋友圈/剧场）
- 简化剧情区（无采访间、观察员、任务卡）
- 快捷指令抽屉：选项/自由输入/自由推演/拉回主线/随机事件/走向大结局
- 自由输入框在剧情区下方

### AI Prompt
- `buildOneHeartSystemPrompt()` — 1v1 系统 prompt（含世界观/风格/成员设定）
- `buildOneHeartUserMessage(type, extra)` — 支持 type: phase/chat/moment/theater

### 核心函数（game-engine.js）
- `generateOneHeartRound()` — 1v1 剧情轮生成
- `sendChatMessage(msg)` — 实时聊天
- `generateMoment()` — 生成朋友圈动态
- `generateTheater(themePrompt)` — 生成番外

### 约会门槛与约后禁探班（娱乐圈行程条）
- **发起约会**：行程条空闲档显示「💞时段」chip，点击触发 `initiateOneHeartDate(slot, sneakOut)`。
  - 普通档（上午/下午/傍晚等）：需 `好感度 >= 20` 或进入暧昧期（`oneHeartRomanceStage >= 1`）。
  - 翘班约（`sneakOut`）：需 `好感度 >= 40` 或明确期（`oneHeartRomanceStage >= 2`）。
  - **深夜档单独更高门槛**：需 `好感度 >= 40` 或明确期（`oneHeartRomanceStage >= 2`），UI 显示 `🔒深夜·需好感≥40`，未达标不可点。
  - 门槛在 UI 灰化与 `initiateOneHeartDate` 函数层**双重拦截**（防旧存档直调绕过）。
- **约后禁止同日探班**（已修复真 bug）：约会当天 `GS.oneHeartDateToday` 置位 → 所有探班按钮灰化为 `🔒已约会`；`doVisitMember()` 函数层二次兜底，UI 被绕过也拦截并提示「今天已经约过啦」。「约会」与「探班」同一天互斥二选一。

### 新弹窗（modals/）
- `chat-modal.js` — 实时聊天（正在输入动画，15条上下文窗口）
- `moments-modal.js` — 朋友圈时间线（AI 生成 + 成员评论）
- `theater-modal.js` — 番外剧场（婚后/校园IF/男主视角/结局回忆录）

### 安全分支原则
- `buildSystemPrompt()` `buildUserMessage()` `generatePhaseNarrative()` `renderGameScreen()`
  开头均加 `if (GS.gameMode === 'oneHeart') return oneHeartVersion()`
- 换乘恋爱代码完全不受影响

## 12. 选项选择提示（choiceText）
- 每段 consequence 剧情前显示橙色标签 `❥ 你的选择：xxx`
- 场景覆盖：普通选项、自由行动、短信、真心话、提问箱、继续今天、最终选择、醉酒后续
- 渲染在 `narrative-box.js` 中通过 `choice-tag` 样式实现

## 13. 安全与输入处理
- **escHtml：** 所有 AI 生成文本插入 DOM 前必须经过 `escHtml()` 转义
  - 转义范围：`& < > " '` → `&amp; &lt; &gt; &quot; &#39;`
- **XSS 重点检查位置：**
  - `narrative-box.js` — 所有 narrative 类型（尤其 `memberInterview`、`observerOS`）
  - `x-archive-modal.js` — `xBackstory`、`memberXBackstories`、`filterItemsByReveal` 返回
  - `x-items-modal.js` — 记忆物品渲染
- **confirm/alert 已全面替换：**
  - `showConfirmModal(message, opts)` — 返回 `Promise<boolean>`，防遮罩穿透
  - `showToast(message)` — 非阻塞提示
  - `resetGame()` 已改为 async，内部嵌套 confirm 已解耦
  - 5 处原 `confirm()` 全部替换完毕

## 14. 食物禁忌（foodTaboos）
- 数据定义在 `data.js` — MEMBERS 数组的 `foodTaboos` 字段
- System Prompt 中注入规则，涉及用餐/做饭场景时 AI 必须遵守

## 15. 观察者嘉宾（Observer Guest）
- 格式：`夫胜宽 Seungkwan`（中文名 + 空格 + 英文昵称）
- 特约嘉宾提到其他成员时直接叫英文名（如 Joshua、Wonwoo、Mingyu）

## 16. Prompt 系统（prompts.js）

### 注入的规则清单
| 规则 | 注入位置 | 说明 |
|---|---|---|
| 队内修罗场 | system prompt `:98` | A 看到女主和 B 互动后针对 B，不夸 C |
| 食物禁忌 | system prompt | 成员 foodTaboos 字段 |
| 观察者格式 | system prompt | 中文名 + 英文名 |
| 季节/天气/日期 | buildUserMessage | GS.season/weather/gameMonth/gameDay |
| 节日/生日 | buildUserMessage | GS.todayHoliday |
| 嫉妒任务 | buildUserMessage | GS.jealousyMission 活跃时 |
| X 幽灵存在 | buildUserMessage `:NEW` | GS.xGhostEvent 触发时 |
| 修罗场强度 | buildUserMessage `:NEW` | GS.rivalryIntensity >= 2 时递进注入 |
| 记忆闪回 | buildUserMessage `:NEW` | GS.flashbackShown === 'pending' 时 |
| 前任来电/来信 | buildUserMessage | GS.exMessage 未处理时 |
| 真心话惩罚 | buildUserMessage | Day 11 深夜 GS.truthPunishment |
| 私密体质专属 | system + user | 三处声明禁止映射到成员 |
| Day 12 仪式感 | buildUserMessage | 1000 字铺垫 + 选项 |
| 约会配对日 | buildUserMessage | 只生成「▶ 进入约会场景」选项 |
| X 约会双向读信 | buildUserMessage | Day 9 |
| Day4/5 记忆物品轮转 | buildUserMessage | 每次只注入 1 位成员，`GS.xItemsRevealRound` 轮转 |
| Day3 故事环节澄清 | buildUserMessage | 明确"不是真心话游戏，没有抽卡/强制规则" |
| 选项多样性约束 | noRepeatNote | 避免"主动搭话""保持距离"等通用模板重复 |
| 主剧情字数 | prompts.js (system + phase user msg) | 换乘 phase 正文强制 1500-2000 字；1v1 开场/后续段 1500-2000 字（选项后续 consequence 同样 1500-2000） |

## 17. 激活码鉴权系统（已关闭）
- 状态：已关闭，代码保留，可随时开启
- 前端：`src/auth.js`（设备指纹、Token 验证）、`src/init.js`（鉴权入口，已注释）
- 后端：`backend/`（Cloudflare Workers + KV）、`backend-tencent/`（腾讯云）
- 本地管理员码：`SVT-ADMIN-2024`、`换乘恋爱-一万年`、`SEVENTEEN-FOREVER`
- 开启方法：取消 `src/init.js` 鉴权注释，配置 `src/auth.js` 的 `BACKEND_URL`

---

# v22 新增功能（视觉 / 戏剧 / 数据）

## 深色模式 + CSS 变量系统
- `style.css` 定义约 30 个 CSS 自定义属性（`--bg-gradient`、`--bg-card`、`--text-primary` 等）
- `:root` 浅色主题（保持现有粉色系），`[data-theme="dark"]` 深色主题（暗紫蓝色调）
- 主题切换：Header 🌙/☀️ 按钮 → `document.documentElement.setAttribute('data-theme', theme)`
- 持久化：`localStorage('svt_theme')`，支持 `prefers-color-scheme` auto 模式
- `initTheme()` 在 `initGame()` 中调用，`toggleTheme()` 绑定按钮事件
- 内联样式已部分清理为 `var()` 引用

## 好感度飘字动画
- 触发：`updateAffection()` 中 `delta !== 0` 时创建 `<span class="aff-float">`
- 动画：`@keyframes affFloat`（translateY(-50px) + opacity 0→1→0，1.2s）
- 颜色：正数 `#2e7d32`（绿色），负数 `#c62828`（红色）
- 队列累积：100ms 窗口内同成员 delta 累加后统一飘出（替代原 300ms 防抖）

## 全屏特效框架（screen-effect.js）
- `triggerScreenEffect(type)` — 三种类型：
  - `'heartbreak'`：25 个 💔 粒子下落旋转（2.2s）
  - `'revelation'`：白色闪屏（1.2s）
  - `'milestone80'`：金色光环扩散（1.5s）
- 触发点：好感度 80 里程碑（`affection.js`）
- 限制：粒子数 ≤ 25，自动清理 Canvas/DOM

## 打字机速度可调
- `GS.typewriterSpeed`：0=即时显示 / 100=慢 / 50=中 / 20=快 / 10=极快，默认 50
- `narrative-box.js`：speed=0 跳过逐字逻辑，直接 `container.innerHTML = fullHtml`
- `header-bar.js`：`<select>` 下拉框，change 事件更新 `GS.typewriterSpeed` + `saveGame()`

## 存档导出导入
- 💾 导出：`JSON.stringify(GS)` → Blob → `<a download>`（文件名含日期）
- 📂 导入：`<input type="file">` → FileReader → JSON.parse → 版本校验 → showConfirmModal → setGS → saveGame → renderAll
- 安全校验：检查 `parsed.version` 存在、`parsed.selectedMembers` 是数组
- 按钮已追加到 `header-btns`（与 📥 导出剧情 txt 共存）

## 统计可视化（结局画面 Canvas 折线图）
- 数据来源：`GS.affectionHistory`（`proceedToNextDay` 每日快照）
- Canvas 2D 手绘：X 轴 Day 1-12，Y 轴 -100~100，3 条成员折线+数据点+图例
- DPR 适配：`canvas.width = rect.width * devicePixelRatio`
- 插入位置：结局画面"数据总览"卡片后、`ending-actions` 按钮前

## 成员立绘框架（portrait.js）
- 函数：`getMemberPortrait(memberId, aff)` 按 5 档返回路径
- 5 档：`cold`(0-14) / `calm`(15-39) / `care`(40-59) / `love`(60-79) / `passion`(80+)
- 图片约定：`public/assets/members/{memberId}/{tier}.png` + `avatar.png`
- onerror 回退：`<img onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">` + emoji 兜底
- 展示位置：Header 小头像 / 好感度面板半身立绘 / 结局画面成员反应旁

---

# 开发规范与注意事项

## 新增功能 Checklist
1. `state.js` — `defaultGameState()` 添加字段
2. `state.js` — `migrateSave()` 添加兜底初始化（版本号 `v22`）
3. `game-engine.js` — `proceedToNextDay()` 添加清理逻辑（如果需要）
4. `game-engine.js` — `generatePhaseNarrative()` 添加触发检查（如果需要）
5. `prompts.js` — 注入相关 prompt 规则（`buildUserMessage` 或 `buildSystemPrompt`）
6. `ui-renderer.js` / `ui/` — 添加 UI 渲染逻辑（如有新界面）
7. `modals/` — 如有新弹窗，在 `modals.js` 和 `modals/index.js` 中导出
8. `style.css` — 使用 CSS 变量 `var(--xxx)` 而非硬编码颜色（深色模式兼容）
9. `AGENTS.md` — 更新本文档

## 安全红线
- 任何用户输入或 AI 生成文本插入 DOM 前，**必须** 经过 `escHtml()`
- **禁止**使用 `alert()` / `confirm()` — 用 `showToast()` / `showConfirmModal()`
- `store.js` 的 `SET_FLAG` 已加白名单，不可通过 dispatch 任意覆盖字段
- `GS` 引用不可被替换（`setGS` 使用 `Object.assign`）
- `showConfirmModal` 涉及破坏性操作，必须阻止遮罩点击关闭（自己创建 overlay）

## 样式规范（CSS 变量）
- 所有颜色值必须使用 CSS 变量（`style.css` `:root` 定义）
- 深色主题在 `[data-theme="dark"]` 中覆盖对应变量
- 新增变量需同时定义浅色和深色值
- 内联 `style="color:#xxx"` 改为 CSS class 或 `var()` 引用

## 防覆盖要点
1. `header-bar.js` `header-btns` 现有按钮不可覆盖/删除，新增按钮追加到末尾
2. `style.css` 现有 6 个 `@keyframes`（pulse-sms/fadeIn/slideUp/diceRoll/spin/blink）不可删除，新增动画追加到文件末尾
3. `renderEndingScreen` Canvas 图表插入位置：数据总览后、ending-actions 前
4. `heartNotes` 数据结构扩展后需向后兼容（旧数据无 `source` 字段默认 `'mission'`）
5. 剧情导出（📥 txt）与存档导出（💾 JSON）并存，图标不混淆

## 构建与发布
- 构建前务必运行 `node ./node_modules/vite/bin/vite.js build` 验证
- 生产环境构建使用 `node ./node_modules/vite/bin/vite.js build`
- 当前构建产物：63 modules, ~287KB JS, ~34KB CSS（gzip: ~124KB JS + 6KB CSS）

## 保留文件
- **不要删除 `src/app.js.backup`** — 旧版单文件备份，部分函数结构参考自它

---

# 历史修改记录（归档）

| 功能 | 状态 | 关键文件 | 备注 |
|---|---|---|---|
| v22 全面升级 | ✅ 已完成 | 全模块 | 17 项改动，4 批实施 |
| 深色模式 + CSS 变量 | ✅ 已完成 | style.css, header-bar.js, init.js | 30 变量，auto 模式 |
| 好感度飘字动画 | ✅ 已完成 | affection.js, style.css | affFloat 动画，300ms 防抖 |
| 全屏特效框架 | ✅ 已完成 | screen-effect.js, affection.js | 心碎/闪光/光效 3 种 |
| 打字机速度可调 | ✅ 已完成 | header-bar.js, state.js, narrative-box.js | 0=即时 ~ 100=极快 |
| 下集预告 | ✅ 已完成 | game-engine.js, style.css | AI 30 字 + 全屏遮罩 |
| 倒计时仪式感 | ✅ 已完成 | header-bar.js | Day≥10 红色脉冲 |
| X 幽灵存在 | ✅ 已完成 | game-engine.js, prompts.js | Day3-5 碎片痕迹 |
| 修罗场强度数值化 | ✅ 已完成 | affection-engine.js, prompts.js | 递进强度 |
| 成员记忆闪回 | ✅ 已完成 | affection.js, prompts.js | 好感度 80+ 触发 |
| 心动笔记好感度解锁 | ✅ 已完成 | affection.js, heart-notes-modal.js | 40/60/80 阈值 |
| 心动笔记 index 修复 | ✅ 已完成 | parser.js | 按 text 去重 |
| confirm() 全面替换 | ✅ 已完成 | confirm-modal.js, state.js, ui-renderer.js | 5→0 |
| 存档导出导入 | ✅ 已完成 | header-bar.js, ui-renderer.js | JSON 序列化 |
| 统计折线图 | ✅ 已完成 | ui-renderer.js, game-engine.js | Canvas 2D |
| 成员立绘框架 | ✅ 已完成 | portrait.js | 5 档 + emoji 回退 |
| scrollTo 修复 | ✅ 已完成 | game-engine.js | proceedToNextDay |
| 短信历史收件人醒目 | ✅ 已完成 | sms-history-modal.js | emoji 圆形色块 |
| 状态版本 v21→v22 | ✅ 已完成 | state.js | 7 新字段 + 兜底 |
| 前任来电/来信 | 已完成 | game-engine.js, state.js, prompts.js | Day 5-9 触发 |
| 真心话大冒险惩罚版 | 已完成 | game-engine.js, state.js, prompts.js | Day 11 深夜 |
| 成员食物禁忌 | 已完成 | data.js, prompts.js | MEMBERS.foodTaboos |
| 重置游戏保留 API Key | 已完成 | state.js — resetGame() | 保留 apiKey/rememberApiKey |
| 观察者嘉宾名字格式 | 已完成 | formatters.js, prompts.js | 中文名 + 英文名 |
| 激活码鉴权系统 | 已关闭 | auth.js, init.js | 代码保留，可随时开启 |
| 午夜匿名电话亭 | 已完成 | game-engine.js, ui-renderer.js, prompts.js | Day 6 深夜 |
| 匿名提问箱公开处刑 | 已完成 | game-engine.js, data.js, prompts.js | Day 7 傍晚 |
| 选项选择提示 | 已完成 | game-engine.js, ui-renderer.js, style.css | choice-tag 渲染 |
| 好感度面板触摸穿透 | 已完成 | style.css, modals.js | 关闭按钮阻止穿透 |
| 架构迁移 Phase 1-5 | 已完成 | skeleton/, ui/, modals/ | 模块拆分 |
| XSS 注入修复 | 已完成 | utils.js, narrative-box.js, x-archive-modal.js | escHtml 补全单引号 |
| 循环依赖修复 | 已完成 | game-engine.js, modals/gift-panel.js | window.scheduleReturnGift |
| modals barrel 统一 | 已完成 | modals.js, modals/index.js | 导出一致性 |
| 状态引用安全 | 已完成 | state.js | setGS 使用 Object.assign |
| 随机逻辑修复 | 已完成 | game-engine.js | triggerAffectionFromChoice 未匹配不加分 |
| drinkCount 修正 | 已完成 | utils.js | resolveValue 读取 GS.drinkCounts |
| 提问箱取消死锁 | 已完成 | game-engine.js | 取消不置 active=false |
| scroll 事件泄漏 | 已完成 | ui-renderer.js | 模块级 _scrollBound 标志 |
| indexOf 误匹配 | 已完成 | x-archive.js, promises.js | 精确匹配字符串 |
| ai-generator 重试污染 | 已完成 | ai-generator.js | 使用局部变量 currentUserMsg |
| SET_FLAG 白名单 | 已完成 | store.js | 防止任意字段覆盖 |
| 随机事件 \|\| 条件 | 已完成 | data.js | 拆分为独立事件 |
| flushText 延迟计算 | 已完成 | narrative-box.js | 先缓存 length |
| goToNextDay 选择判断 | 已完成 | game-engine.js | 移除 indexOf('选择') |
| store.js 生产日志 | 已完成 | store.js | import.meta.env.DEV 守卫 |
| 打字机速度档位反转 | 已完成 | header-bar.js, narrative-box.js, ui-renderer.js | 慢=100/中=50/快=20/极快=10 + `||30`→`==null?30:x` |
| API 超时 30s→90s + 重试 | 已完成 | api.js, ai-generator.js | 30s→60s→90s + callDeepSeek try/catch 自动重试，修复 AbortError |
| Day3 真心话误触发 | 已完成 | prompts.js | 明确"不是真心话游戏，没有抽卡" |
| Day4/5 记忆物品轮转 | 已完成 | prompts.js, state.js | `xItemsRevealRound` 每次只公开 1 位成员 |
| phaseFreeCount 重置 | 已完成 | store.js | RESET_PHASE_STATE 补充 `phaseFreeCount = 0` |
| X档案物品格式统一 | 已完成 | x-archive.js | `buildXArchiveItemsMemberPrompt` 统一为名称/样式/故事 |
| 选项多样性约束 | 已完成 | prompts.js | noRepeatNote 增加避免通用模板重复 |
| parser.js 复制粘贴死分支 | 已完成 | parser.js | 删除 else-if alert 死分支，符合禁止 alert 规范 |
| dating-dice 成员名转义 | 已完成 | dating-dice.js | 引入 escHtml，转义修罗场按钮与结果中成员名 |
| store.js action creator 对齐 | 已完成 | store.js | pushConsequence 移除 payload 包裹，与 reducer 一致 |
| 删除废弃 extractSmsDrafts | 已完成 | game-engine.js | 旧 markdown 短信草稿提取函数，已确认无外部引用 |
| 简化 settlePendingAffChanges 转发 | 已完成 | game-engine.js | 直接调用 skeletonSettleAff，删除冗余包装函数 |
| 恢复 generatePhaseNarrative finally | 已完成 | game-engine.js | 修复移除 extractSmsDrafts 时误删的 finally，确保 _isGenerating 重置 |
| 改造按钮事件丢失 | 已完成 | modals/gift-panel.js | innerHTML 重渲染后事件丢失 → 改为事件委托 |
| 深夜短信时序错位 | 已完成 | prompts.js | prompt 指令矛盾"短信已经发出"→改为"短信在剧情后独立进行" |
| 送礼剧情不显示 | 已完成 | modals/gift-panel.js | parseNarrative 返回空对象时降级为自由叙事兜底 |
| 好感度显示混乱（4 合 1） | 已完成 | affection.js, game-engine.js, option-panel.js | A: triggerAffectionFromChoice 接受 opt 参数 + pendingAffChanges fallback + Toast 提示; B: 选项面板追加 affDelta/affReason 小字标签; C: 飘字防抖→队列累积机制(100ms); D: 选择后自动 Toast 汇总 |
| 采访间衔接断裂 | 已完成 | prompts.js, data.js | rule 6 区分 narrative/interview 复述规则; noRepeatNote 同上; TODAY_TEXT_CAP 8000→12000 |
| advancePhase 重入锁 | 已完成 | game-engine.js | 添加 _advancingPhase 锁，防止双击按钮跳过时段 |
| 选项多样性不足（4 合 1） | 已完成 | prompts.js, ai-generator.js, state.js, game-engine.js | P0: todayOptionTexts 黑名单注入 prompt; P0: prevSummary 移除 type 限制; P1: temperature 0.7→0.85; P1: noRepeatNote 强化 |
| 飘字动画说明 | 已更新 | AGENTS.md | spawnAffFloat 防抖说明 300ms→队列累积 |
| 1v1「只为你心动」模式 | ✅ 已完成 | 全模块 | 9 阶段实施，详见上方 1v1 模式文档 |
| 哥哥身份·双重身份+年龄辈分 | ✅ 已完成 | ui-renderer.js, prompts.js | D1: 补 interactionStyle+birthYear; D2: 团内队友面/私下哥哥面双重转换; D3: 哥哥/男主/情敌三人辈分注入 |
| 哥哥身份·代码校验+硬替换 | ✅ 已完成 | validator.js, parser.js, game-engine.js | D4: 检测其他成员充当哥哥→重试→仍错则硬替换; 防 present 错误传播 |
| 季节一致性校验 | ✅ 已完成 | validator.js, parser.js, prompts.js | 检测剧情描写与当前月份的季节矛盾，重写触发 |
| 禁止脏话校验 | ✅ 已完成 | validator.js, parser.js, prompts.js | 脏话词表+代码检测+重写，不含误判 |
| 称呼/年龄辈分逻辑反转 | ✅ 已完成 | prompts.js, validator.js, parser.js | D3 年龄比较反转(>`小 / <`大)+ 名字而非姓氏+ 校验扩展至 narrative 文本 |
| 测试模式文本泄漏+1v1压缩缺失 | ✅ 已完成 | memory.js, game-engine.js | cache 检测测试关键词+ generateOneHeartRound 追加压缩调用 |
| 新闻红点不消失 | ✅ 已完成 | news-modal.js | 追加 saveGame+renderAll |
| 1v1 横幅残留 | ✅ 已完成 | narrative-box.js, ui-renderer.js | 1v1 渲染守卫+初始化清零 |
| Day1 情敌过于激进 | ✅ 已完成 | ui-renderer.js | 初始好感 randInt(10,25)→(10,19) 保证 stage<2 |

---

# 娱乐圈模拟器（entSim）— 明星志愿3式完整文档

## 设计哲学

- **本地游戏，AI 只代写主线剧情（省手）**，其余全部池子驱动
- **池子决定"发生什么"，AI 只负责写 1000-1500 字沉浸式叙事**
- 每个池子一个文件 → 好找好改，便于增删
- **数据驱动调度**：条目自带 `require` 标签，`_utils.js` 统一 `filterByRequire` 过滤
- 娱乐圈是恋爱背景板，出道必然发生

### AI 叙事流程

```
代码提取阶段状态(traineePhase/chapter/affection/debutDay)
        │
        ↓  filterByRequire 过滤
池子抽取（天气 + 心情 + 日程 + 事件 + 偶遇 + 氛围...）
        │
        ↓  拼接 AI prompt
AI 收到：「你是练习生中期，今天下雨，心情疲惫，
         日程是月末评价，偶遇了男主在走廊...
         写 1000-1500 字剧情 + 2-3 个选项」
        │
        ↓  AI 输出 JSON
代码解析 → 渲染界面 → 玩家选择 → 更新状态 → 下一回合
```

**代码负责所有"选什么"**（池子、门控、调度），**AI 只负责"怎么写"**（叙事、对话、选项文案）。

### 数据驱动调度 (_utils.js)

```js
// 池子条目格式，自带 require 标签
{ key: '月末评价', require: 'trainee', text: '...' }
{ key: '打歌初放送', require: 'debut', text: '...' }
{ key: '男主告白', require: 'aff>=60&&chapter>=2', text: '...' }

// 统一过滤
canTrigger(entry, E)  →  boolean
filterByRequire(pool, E)  →  filtered array
```

支持的 require 条件：`'debut'`（已出道）、`'trainee'`（练习生）、`'traineePhase=N'`（子阶段）、`'aff>=N'`（好感度）、`'chapter>=N'`（章节）、`'romance>=N'`（恋爱阶段）。

---

## 事业阶段体系（9 状态）

### 练习生 3 子阶段（人气=0，天数驱动）

| 子阶段 | 图标 | 天数 | 人气 | 核心氛围 |
|--------|------|------|------|---------|
| 前期 | 🌱 | day 1-4 | 0 | 刚进公司、基础训练、迷茫 |
| 中期 | 🌿 | day 5-10 | 0 | 适应节奏、月末评价、同期竞争 |
| 后期 | 🌸 | day 11+ | 0 | 出道组筛选、出道曲排练、紧张期待 |

**出道触发**：进入后期 → 累计 2-4 天触发"出道最终评价"事件 → debutDay 置位 → 人气 = startPopularity（默认 12）

### 出道后 6 阶段（人气驱动，参考明星志愿3）

| 阶段 | 图标 | 人气阈值 | 含义 |
|------|------|---------|------|
| 新人出道 | 🌱 | 0-14 | 刚出道，街上没人认识，台下零星应援 |
| 崭露头角 | 🌿 | 15-34 | 第一批死忠粉，圈内有名字，打歌能进候补 |
| 稳步上升 | 🌸 | 35-54 | 粉丝稳定增长，综艺商演不断，品牌关注 |
| 人气偶像 | 🔥 | 55-74 | 热搜常客，代言不断，回归必拿一位 |
| 顶流巨星 | 👑 | 75-89 | 国民级热度，一言一行上头条，巡演秒空 |
| 传奇殿堂 | 🏆 | 90+ | 现象级存在，后辈仰望的传说 |

**关键规则**：
- 练习生期 `addPopularity` 直接 return 0（无公众曝光）
- `checkChapterAdvance` 只处理出道后人气跨阈值切换
- 出道由 `engine.js` → `_debutTriggerDay` 驱动，不走 `chapterByPopularity`

### 好感-事业三层门控（仿明星志愿3）

| 恋爱阶段 | 解锁条件 | 效果 |
|---------|---------|------|
| 初识 | 默认 | 通过哥哥认识，偶尔碰面 |
| 暧昧 | 好感≥20 + 练习生中期起 | 私下交流，AI 可写小动作 |
| 约会 | 好感≥50 + 出道 | 正式约会解锁，出道前仅"偶遇" |
| 恋爱 | 好感≥70 + 崭露头角 | 告白/确认关系 |
| 公开 | 好感≥85 + 人气偶像 | 被拍也不怕 |
| 约会冷却 | 连约 2 次 → 强制冷却 3 天 | 仿明3"连续约会上限" |

**关键文件**：`src/ent-sim/romance.js` → `checkRomanceUnlock()` 统一查询当前可解锁的恋爱阶段及未解锁原因。

---

## 模块文件索引

```
src/ent-sim/
├── engine.js           — 核心引擎（goEntSimNextDay/出道触发/addPopularity守卫/约会冷却）
├── state.js            — 状态管理（traineePhase/chapterByPopularity/checkChapterAdvance/addPopularity）
├── cycle.js            — 日程调度（chapterPoolByIndex 6分支 + filterByRequire）
├── data.js             — 静态数据（CHAPTERS 6阶段/ENT_SIM_CAREERS/成员/礼物等）
├── prompts.js          — AI prompt 构建（含练习生阶段注入+禁止SEVENTEEN直播间约束）
├── ui.js               — 娱乐模拟器 UI（状态栏/聊天/面板渲染）
├── ui-renderer.js      — 1v1 界面渲染（含秘密池 _secPool）
├── romance.js          — 好感-事业门控（checkRomanceUnlock/约会冷却/掩护机制）
├── brother.js          — 哥哥线（事件/支线/考验）
├── immersion.js        — 沉浸感（热搜/榜单/舆论）
├── economy.js          — 经济（已废弃）
├── pools/              — 池子系统（80 个文件，详情见下方完整表格）
│   ├── _utils.js       — 工具函数（pickFromPool/canTrigger/filterByRequire）
│   └── index.js        — 统一导出入口（~120 行）
```

---

## 完整池子清单（80 个文件，20 大类）

> 每个池子一个文件，文件名 = 小写连字符，导出常量 = 大写下划线。
> 条数含模板/占位符，实际使用时 `filterByRequire` 进一步筛选。

### 一、世界设定（6 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `company-names.js` | `COMPANY_NAMES` | 公司名池 | 韩国经纪公司名，含虚构与真实风格 | 20 |
| `group-names.js` | `GROUP_NAMES` | 女团名池 | 虚拟女团英文名 + 粉丝名配对 | 60 |
| `group-concepts.js` | `GROUP_CONCEPTS` | 团概念池 | K-pop 女团风格概念分类 | 40 |
| `hit-songs.js` | `HIT_SONGS` | 出圈曲池 | 女团代表歌曲描述文本 | 80 |
| `teammate-names.js` | `TEAMMATE_NAMES` | 队友名池 | 韩国女爱豆常见姓名 | 100 |
| `sister-roles.js` | `SISTER_ROLES` | 姐姐角色池 | 女团队友角色定位模板（5 位按模板拼装） | 30 |

### 二、SEVENTEEN 成员（16 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `svt-teammate-profiles.js` | `SVT_TEAMMATE_PROFILES` | 成员标签池 | 13 人完整数据（艺名/emoji/性格/出生年） | 13 |
| `svt-teammate.js` | `SVT_TEAMMATE_EVENT_POOL` | 队友事件池 | 队友客串场景（27 种氛围） | 200 |
| `teammate-flavor.js` | `TEAMMATE_FLAVOR` | 队友支线池 | 按 roleTag 触发不同互动 | 5 |
| `members.js` | `MEMBER_SCOUPS` ~ `MEMBER_DINO` | 单成员行为池 | 13 人各自 pre-written 触发行为 | 各 2-3 |
| （members.js 含 13 个独立 export，此处不逐一列出） |

### 三、练习生三阶段（5 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `trainee-early.js` | `TRAINEE_EARLY_POOL` | 练习生前期日程池 | 基础声乐/舞蹈/礼仪/体测/第一天迷路/第一次月末评价 | 30 |
| `trainee-mid.js` | `TRAINEE_MID_POOL` | 练习生中期日程池 | 编舞/和声/综艺感/镜头感/团队合作 | 30 |
| `trainee-late.js` | `TRAINEE_LATE_POOL` | 练习生后期日程池 | 出道组筛选/出道曲排练/MV 概念会议/最终名单 | 30 |
| `trainee-events.js` | `TRAINEE_EVENTS` | 练习生事件池 | 月末评价/被前辈夸/同期被刷/社内Showcase/出道触发（含 `require` 标签） | 50 |
| `trainee-chat.js` | `TRAINEE_CHAT` | 练习生聊天池 | 哥哥鼓励 30 条 + 情敌暗自较劲 30 条 | 60 |

### 四、章节日程（10 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `ent-schedules.js` | `COMMON_POOL` | 通用日程池 | 出道后通用，30% 概率抽取 | 50 |
| `ent-schedules.js` | `RELATED_POOL` | 相关行程池 | 与男主/情敌/哥哥相关的特殊行程 | 50 |
| `ent-schedules.js` | `TRAINEE_POOL` | 旧练习生日程池 | 保留作 fallback | 50 |
| `ent-schedules.js` | `CHAPTER1_NOVICE` | 新人出道日程池 | 首次打歌/首签售/新人采访 | 50 |
| `ent-schedules.js` | `CHAPTER2_SPROUTING` | 崭露头角日程池 🆕 | 小型打歌/电台/路演/首次专访 | 30 |
| `ent-schedules.js` | `CHAPTER2_RISING` | 稳步上升日程池 | 回归/巡演/代言/综艺 | 50 |
| `ent-schedules.js` | `CHAPTER3_PEAK` | 人气偶像日程池 | 大赏/世巡/顶级代言 | 50 |
| `ent-schedules.js` | `CHAPTER5_TOPSTAR` | 顶流巨星日程池 🆕 | 世界巡演/Billboard/自传/纪录片 | 30 |
| `ent-schedules.js` | `CHAPTER4_LEGEND` | 传奇殿堂日程池 | 致敬表演/终身成就 | 50 |
| `ent-schedules.js` | `BOYGROUP_POOL` | 男团日程池 | 与男主/情敌/哥哥行程交叉点 | 50 |
| `ent-schedule.js` | `ENT_SCHEDULE_POOL` | 偶像日程池 | 按职业分池：trainee/idol/actress/singer/model/backstage | 50 |

### 五、聊天系统（含原有 + 练习生，共 8 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `chat-male-lead.js` | `CHAT_MALE_LEAD` | 男主聊天池 | 5 个频道含快捷回复选项 | ~300 |
| `chat-male-lead.js` | `CHAT_BROTHER` | 哥哥聊天池 | 哥哥线纯文本消息 | 60 |
| `chat-male-lead.js` | `CHAT_RIVAL` | 情敌聊天池 | 情敌线纯文本消息 | 60 |
| `chat-male-lead.js` | `CHAT_MANAGER` | 经纪人聊天池 | 经纪人工作消息 | 60 |
| `chat-male-lead.js` | `GROUP_CHAT` | 团群聊池 | 女团群聊日常（6 场景） | ~60 |
| `chat-male-lead.js` | `CHAT_SASAENG` | 私生聊天池 | 私生骚扰消息 | 60 |
| `trainee-chat.js` | `TRAINEE_CHAT` | 练习生聊天池 🆕 | 哥哥鼓励 30 + 情敌较劲 30 | 60 |

### 六、男主/感情线（6 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `male-lead-init.js` | `MALE_LEAD_INITIATIVE_POOL` | 男主主动池 | 按好感 0→80 分档解锁主动互动 | 200 |
| `male-contact.js` | `CONTACT_TYPE_POOL` | 男主联络池 | 电话/私信/哥哥转达，每条含 3 选项 | 60 |
| `contact-progression.js` | `CONTACT_PROGRESSION` | 好感铺垫池 | 好感阈值 0→60 分档，D1-D9 每日触发 | 200 |
| `jealousy-events.js` | `JEALOUSY_EVENTS_POOL` | 吃醋事件池 | 男主吃醋/前任吃醋/情敌视角 | 200 |
| `dating-rumors.js` | `RUMOR_POOL` | 绯闻池 | 同款/私生照/Dispatch 爆料 | 200 |
| `oneheart-events.js` | `ONEHEART_RANDOM_EVENTS` | 1v1 随机池 | 暧昧/日常/情感/戏剧/试探/告白前 | 200 |

### 七、哥哥线（3 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `brother-events.js` | `BROTHER_EVENT_POOL` | 哥哥事件池 | 按支持度 -3 到 +3 触发 | 30 |
| `brother-side-plots.js` | `BROTHER_SIDE_PLOTS` | 哥哥支线池 | 不影响主线的哥哥个人支线 | 3 |
| `brother-tests.js` | `BROTHER_ADVANCE_TESTS` | 哥哥考验池 | 按好感 15/40/70 递进试探 | 3 |

### 八、情敌/秘密（4 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `rival-advance-events.js` | `RIVAL_ADVANCE_EVENTS` | 情敌进攻池 | intimacy 驱动的主动事件 | 4 |
| `secret-discovery-events.js` | `SECRET_DISCOVERY_EVENTS` | 秘密撞破池 | EXO 追星秘密被发现场景（纯 EXO 向） | 3 |
| `industry-events.js` | `INDUSTRY_EVENTS` | 行业事件池 | 台前幕后通用行业事件 | 6 |
| `special-events.js` | `SPECIAL_EVENTS` | 特殊事件池 | 行业/情敌/秘密混合 | 200 |

### 九、事业/女团（4 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `career-setbacks.js` | `CAREER_SETBACKS` | 事业挫折池 | 8 phase 练习生→巅峰挫折 | 200 |
| `girlgroup-events.js` | `GIRLGROUP_EVENTS` | 女团事件池 | 11 分类：回归/舞台/签售/宿舍/危机等 | 200 |
| `incident-events.js` | `INCIDENT_EVENTS_POOL` | 突发事件池 | 12 类：惊喜/丑闻/生病/深夜/队友/外界/困境等 | 200 |
| `daily-engagement.js` | `DAILY_ENGAGEMENT_POOL` | 每日营业池 | 6 类：SNS/Live/舞台/时尚/综艺/粉丝 | 200 |

### 十、媒体/舆论（7 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `daily-buzz.js` | `DAILY_BUZZ` | 每日舆论池 | 热搜标题/粉丝讨论/媒体标题 | ~70 |
| `daily-buzz-templates.js` | `DAILY_BUZZ_TEMPLATES` | 舆论模板池 | 3 类模板各 ~100 条 | ~300 |
| `hot-search-replies.js` | `HOT_SEARCH_REPLY_POOL` | 热搜评论区池 | 热搜 + 粉丝评论 + 媒体口径三元组 | 200 |
| `dispatch-news.js` | `DISPATCH_POOL` | 八卦新闻池 | Dispatch 偷拍/独家/分析 | 200 |
| `external-hot.js` | `EXTERNAL_HOT` | 外部热搜池 | BTS/BLACKPINK 等外部话题 | ~90 |
| `news-templates.js` | `NEWS_TEMPLATES` | 新闻模板池 | 含 {name}/{groupName} 占位符 | 50 |

### 十一、作品/品牌/奖项（4 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `releases.js` | `RELEASE_POOL` | 作品发布池 | 单曲/写真/练习室/合作曲/OST | 200 |
| `brand-offers.js` | `BRAND_OFFER_POOL` | 品牌代言池 | 10 品类：美妆/时尚/饮品/食品/数码等 | 200 |
| `awards.js` | `AWARD_POOL` | 奖项池 | 4 类各 50：新人奖/本赏/大赏/特别奖 | 200 |
| `music-charts.js` | `CHART_POOL` | 音源榜池 | 多平台 × 多变化类型 | 200 |

### 十二、打歌/演唱会/签售/回归/杂志（5 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `music-show-pool.js` | `MUSIC_SHOW_POOL` | 打歌节目池 | 6 节目轮换：MCD/音银/人歌/音中等 | 200 |
| `concert-pool.js` | `CONCERT_POOL` | 演唱会池 | 官宣→售票→彩排→现场全周期 | 200 |
| `fansign-pool.js` | `FANSIGN_POOL` | 签售会池 | 入场/互动/发箍/手写信/视频签售 | 200 |
| `comeback-cycle.js` | `COMEBACK_CYCLE_POOL` | 回归周期池 | 预告→概念照→MV→一位→末放 | 200 |
| `magazine-shoots.js` | `MAGAZINE_POOL` | 杂志画报池 | W/Elle/Dazed/BAZAAR 等多杂志 | 200 |

### 十三、综艺/粉丝/日记（3 个）

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `variety-shows.js` | `VARIETY_SHOW_POOL` | 综艺节目池 | 5 种：谈话/游戏/音乐/真人秀/观察 | 200 |
| `fan-letters.js` | `FAN_LETTER_POOL` | 粉丝来信池 | support 类含占位符 | 60 |
| `diary-templates.js` | `DIARY_TEMPLATES` | 日记模板池 | daily/stage/practice/emotion/dream 框架 | 30 |

### 十四、日历+通告（2 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `calendar-events.js` | `CALENDAR_EVENTS` | 日历节日池 | 情人节/圣诞/出道纪念日/男主生日 | 30 |
| `job-offers.js` | `JOB_OFFER_POOL` | 通告选择池 | 试镜/CF/综艺/OST/杂志/MC（含需求标签） | 40 |

### 十五、恋爱场景（6 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `romance-backstage.js` | `ROMANCE_BACKSTAGE` | 后台相遇池 | 待机室/走廊/彩排偶遇男主（含 require 标签） | 20 |
| `romance-latenight.js` | `ROMANCE_LATENIGHT` | 深夜联系池 | 凌晨消息/失眠通话/醉酒发来/他说在楼下 | 15 |
| `romance-public.js` | `ROMANCE_PUBLIC` | 公共克制池 | 综艺克制/颁奖礼眼神/签售会碰面 | 20 |
| `romance-crisis.js` | `ROMANCE_CRISIS` | 危机支撑池 | 被黑/事故/生病时的互相守护 | 15 |
| `romance-jealousy.js` | `ROMANCE_JEALOUSY_POOL` | 吃醋触发池 | 男方吃醋/女方吃醋触发场景 | 20 |
| `romance-confession.js` | `ROMANCE_CONFESSION` | 告白节点池 | 差点告白/正式告白/和好契机 | 20 |

### 十六、地下恋专属（4 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `secret-comms.js` | `SECRET_COMMS` | 秘密通讯池 | 暗号/小号/托人传话/歌词暗语 | 15 |
| `secret-nearmiss.js` | `SECRET_NEARMISS` | 差点暴露池 | 狗仔蹲点/私生跟踪/粉丝巧合撞见 | 15 |
| `secret-fan-clues.js` | `SECRET_FAN_CLUES` | 粉丝线索池 | 同款被扒/定位重叠/聊天截图泄漏 | 10 |
| `secret-company-warning.js` | `SECRET_COMPANY` | 公司警告池 | 经纪人暗示/社长谈话/合约提醒 | 10 |

### 十七、氛围情绪（3 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `atmosphere-weather.js` | `ATMOSPHERE_WEATHER` | 天气氛围池 | 初雪/暴雨/台风/樱花季/凌晨/黎明 | 15 |
| `atmosphere-mood.js` | `ATMOSPHERE_MOOD` | 女主心情池 | 疲惫/兴奋/孤独/幸福/不安 | 10 |
| `atmosphere-his-state.js` | `ATMOSPHERE_HIS_STATE` | 男主状态池 | 今天他的状态——拿一位/被黑/想你 | 10 |

### 十八、里程碑高光（3 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `milestone-debut.js` | `MILESTONE_DEBUT` | 出道日场景池 | 出道舞台/初放送/后台紧张/哥哥消息 | 10 |
| `milestone-first-win.js` | `MILESTONE_FIRST_WIN` | 一位场景池 | 第一次拿一位/安可/获奖感言/他发来祝贺 | 10 |
| `milestone-awards.js` | `MILESTONE_AWARDS` | 颁奖场景池 | 红毯碰面/提名/落选/获奖感言/后台相遇 | 20 |

### 十九、偶遇场景（4 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `encounter-ml.js` | `ENCOUNTER_ML` | 偶遇男主池 | 他找借口/碰巧同一地点/他来探班 | 20 |
| `encounter-rival.js` | `ENCOUNTER_RIVAL` | 偶遇情敌池 | 三人同框/修罗场/暗中比较 | 15 |
| `encounter-brother.js` | `ENCOUNTER_BROTHER` | 哥哥撞见池 | 撞破你们的秘密互动 | 15 |
| `encounter-others.js` | `ENCOUNTER_OTHERS` | 旁人起哄池 | 队友/工作人员/前辈起哄 | 10 |

### 二十、剧情节奏（5 个）🆕

| 文件名 | 导出常量 | 中文名 | 用途 | 条数 |
|--------|---------|--------|------|------|
| `drama-almost.js` | `DRAMA_ALMOST` | 差点告白池 | 话到嘴边被打断/电话断了/有人推门 | 15 |
| `drama-misunderstand.js` | `DRAMA_MISUNDERSTAND` | 误会池 | 误会男主 vs 情敌/被成员误会/你误会他 | 20 |
| `drama-coldwar.js` | `DRAMA_COLDWAR` | 冷战和解池 | 冷战原因→状态→和解契机 | 20 |
| `drama-dating-rumor.js` | `DRAMA_DATING_RUMOR` | 绯闻危机池 | 被传绯闻/公司声明/粉丝反应两极 | 15 |
| `drama-dilemma.js` | `DRAMA_DILEMMA` | 二选一困境池 | 事业 vs 爱情抉择场景 | 15 |

### 工具文件（2 个）

| 文件名 | 作用 |
|--------|------|
| `_utils.js` | `pickFromPool` / `canTrigger` / `filterByRequire` / `pickFanReactions` / `pickFromPoolRotate` |
| `index.js` | 统一导出入口（~120 行，按 20 类分组） |

---

## 统计数据

| 分类 | 文件数 | 主要条数 |
|------|--------|---------|
| 一、世界设定 | 6 | 约 330 条 |
| 二、SEVENTEEN 成员 | 16 | 约 260 条 |
| 三、练习生三阶段 | 5 | 约 200 条 |
| 四、章节日程 | 10 | 约 410 条 |
| 五、聊天系统 | 8 | 约 660 条 |
| 六、男主/感情线 | 6 | 约 1060 条 |
| 七、哥哥线 | 3 | 约 36 条 |
| 八、情敌/秘密 | 4 | 约 213 条 |
| 九、事业/女团 | 4 | 约 800 条 |
| 十、媒体/舆论 | 7 | 约 960 条 |
| 十一、作品/品牌/奖项 | 4 | 约 600 条 |
| 十二、打歌/演唱会/签售/回归/杂志 | 5 | 约 1000 条 |
| 十三、综艺/粉丝/日记 | 3 | 约 290 条 |
| 十四、日历+通告 | 2 | 约 70 条 |
| 十五、恋爱场景 | 6 | 约 110 条 |
| 十六、地下恋专属 | 4 | 约 50 条 |
| 十七、氛围情绪 | 3 | 约 35 条 |
| 十八、里程碑高光 | 3 | 约 40 条 |
| 十九、偶遇场景 | 4 | 约 60 条 |
| 二十、剧情节奏 | 5 | 约 85 条 |
| 工具 | 2 | — |
| **合计** | **80 池子 + 2 工具 = 82 文件** | **约 7200+ 条素材** |

