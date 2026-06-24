# SEVENTEEN Project — Agent Guide

## Project Overview
《换乘恋爱 × SEVENTEEN》是一款基于 AI 生成的沉浸式恋爱综艺文字游戏。玩家扮演女主，与 3 位 SEVENTEEN 成员（其中一位是秘密前任 X）在心动小屋共度 12 天，通过选择、自由输入、发短信等方式推动剧情，最终做出「复合」或「换乘」的选择。

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

# 架构总览（v22）

```
src/
├── main.js             — 入口（import style.css + app.js）
├── app.js              — 模块集合入口（import 所有模块）
├── app.js.backup       — ⚠️ 保留备份，不要删除
├── game-engine.js      — 游戏核心逻辑（约 1400 行）
├── ui-renderer.js      — 页面渲染调度 + 主题切换 + Canvas图表
├── state.js            — 状态管理、读写存档、迁移（v22）
├── store.js            — 状态机（dispatch/reducer/subscribe）
├── parser.js           — 解析 AI 返回文本（narrative / options）
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
├── modals/             — 模态弹窗（16 模块）
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
│   └── api-settings-modal.js API 设置
│
└── prompts/            — Prompt 模块化
    ├── index.js
    └── context-snapshot.js
```

**构建产物：** 56 modules, ~221KB JS, ~23KB CSS（gzip: ~100KB JS + 5KB CSS）

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
- 条件表达式只支持 `==` 和 `>=` 运算，不支持 `||`（需拆分为多个独立事件）
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

## 11. 选项选择提示（choiceText）
- 每段 consequence 剧情前显示橙色标签 `❥ 你的选择：xxx`
- 场景覆盖：普通选项、自由行动、短信、真心话、提问箱、继续今天、最终选择、醉酒后续
- 渲染在 `narrative-box.js` 中通过 `choice-tag` 样式实现

## 12. 安全与输入处理
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

## 13. 食物禁忌（foodTaboos）
- 数据定义在 `data.js` — MEMBERS 数组的 `foodTaboos` 字段
- System Prompt 中注入规则，涉及用餐/做饭场景时 AI 必须遵守

## 14. 观察者嘉宾（Observer Guest）
- 格式：`夫胜宽 Seungkwan`（中文名 + 空格 + 英文昵称）
- 特约嘉宾提到其他成员时直接叫英文名（如 Joshua、Wonwoo、Mingyu）

## 15. Prompt 系统（prompts.js）

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

## 16. 激活码鉴权系统（已关闭）
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
- 当前构建产物：56 modules, ~221KB JS, ~23KB CSS

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

