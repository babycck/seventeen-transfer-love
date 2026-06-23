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
- **Build:** `npm run build`
- **Preview:** `npm run preview`

## Code Conventions
- Follow the existing style and formatting in the codebase.
- Make minimal, focused changes.
- Do not run `git commit`, `git push`, or other git mutations unless explicitly asked.
- Do not install global packages; use isolated environments when necessary.
- 使用 `var` 而非 `let/const`（保持与现有代码风格一致）。
- 字符串拼接使用 `+` 运算符，不使用模板字符串。

## Useful Paths
- `src/` — 源代码
- `dist/` — 生产构建输出
- `backend/` — Cloudflare Workers 后端（激活码系统）
- `backend-tencent/` — 腾讯云后端版本（轻量服务器 / SCF）

## Notes for Agents
- This file is loaded as project instructions via `kilo.json`.
- Update the sections above as the project evolves.

---

# 架构总览（Phase 1-5 已完成）

```
src/
├── main.js             — 入口（init + renderAll）
├── app.js              — 旧版单文件（已废弃，仅参考）
├── app.js.backup       — 保留备份，不要删除
├── game-engine.js      — 游戏核心逻辑（约 1250 行）
├── ui-renderer.js      — 页面渲染调度（约 1210 行）
├── state.js            — 状态管理、读写存档、迁移
├── store.js            — 状态机（dispatch/reducer/subscribe）
├── parser.js           — 解析 AI 返回文本（narrative / options）
├── formatters.js       — 格式化工具（日期、天气、星座等）
├── prompts.js          — Prompt 构建（system + user message）
├── ai-generator.js     — AI 生成包装（自动重试 + correction 反馈）
├── api.js              — API 调用层（DeepSeek / 测试场景）
├── data.js             — 静态数据（成员、礼物、事件等）
├── memory.js           — 今日剧情压缩 / 历史回顾
├── x-archive.js        — X 关系档案生成
├── promises.js         — 约定提取 / 信息揭示
├── affection.js        — 好感度操作封装
├── auth.js             — 激活码鉴权（前端）
├── init.js             — 游戏初始化（含鉴权开关）
├── utils.js            — 通用工具（escHtml、showToast、randInt 等）
├── style.css           — 全局样式
│
├── skeleton/           — 游戏逻辑骨架（5 模块）
│   ├── affection-engine.js  好感度结算
│   ├── drink-engine.js      喝酒计数
│   ├── option-engine.js     选项生成（AI 只写文案）
│   ├── event-triggers.js    事件触发
│   └── scheduler.js         日程管理
│
├── ui/                 — UI 组件（6 模块）
│   ├── header-bar.js        顶部 Header
│   ├── narrative-box.js     剧情渲染（打字机 + 段落分类）
│   ├── option-panel.js      选项面板 / 真心话 / 提问箱
│   ├── action-bar.js        底部操作栏
│   └── free-input.js        自由输入框
│
├── modals.js           — Barrel（re-export 所有弹窗）
├── modals/             — 模态弹窗（15 模块）
│   ├── modal-factory.js      Modal DOM 工厂
│   ├── dating-dice.js        约会骰子
│   ├── day10-dating.js       Day10 自由约会
│   ├── midnight-call.js      午夜电话亭
│   ├── drunk-select.js       醉酒选人
│   ├── truth-answer.js       真心话回答
│   ├── sms-modal.js          短信发送（手机 UI）
│   ├── sms-history-modal.js  短信历史
│   ├── x-archive-modal.js    X 关系档案
│   ├── x-items-modal.js      X 记忆物品
│   ├── gift-panel.js         送礼面板 + 送礼逻辑
│   ├── history-modal.js      历史剧情回顾
│   ├── help-modal.js         规则速览
│   ├── affection-panel.js    好感度面板
│   ├── heart-notes-modal.js  心动笔记
│   └── api-settings-modal.js API 设置
│
└── prompts/            — Prompt 模块化
    ├── index.js
    └── context-snapshot.js
```

**构建产物：** 54 modules, ~176KB JS, 15KB CSS

**调试工具：** 控制台输入 `window.__skeleton = true` 可切换骨架模块日志。

---

# 核心功能模块

## 1. 状态与存档（state.js）
- `defaultGameState()` — 返回完整初始状态，新增字段必须在此定义。
- `migrateSave()` — 旧存档兼容迁移，所有新增字段需在此兜底初始化（当前版本 `v21`）。
- `resetGame()` — 重置进度，保留 `apiKey / rememberApiKey / apiProvider / apiModel`。
- `setGS(newGS)` — 使用 `Object.assign(GS, newGS)` 保持引用不变，避免模块缓存失效。
- 存档使用 `localStorage`（`local_game_state`），鉴权系统关闭时无需后端。

## 2. AI 文本生成流程
1. `buildSystemPrompt()` + `buildUserMessage(sceneType, opts)` → 生成 prompt
2. `generateWithRetry(sysPrompt, userMsg, ...)` → 调用 `callDeepSeek()`（ai-generator.js）
3. `parseNarrative(rawText)` → 解析为结构化对象（剧情、选项、状态等）
4. `validateNarrative(rawText, parsed)` → 校验格式，返回 corrections
5. `applyParsedSideEffects(parsed)` → 将 AI 返回的状态副作用应用到 `GS`
6. 重试机制：最多 3 次，correction 反馈注入，但不对原始 `userMsg` 造成污染。

## 3. 游戏阶段（Day 1-12）
- 每天 4 个 phase：`早/午/傍晚/深夜`（`phaseIndex` 0-3）
- `generatePhaseNarrative()` — 生成主剧情
- `handleOptionChoice()` — 处理选项选择
- `handleFreeAction()` — 处理自由输入
- `continueToday()` — 继续今天（最多 3 次）
- `goToNextDay()` → `proceedToNextDay()` — 进入下一天，触发清理逻辑

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

## 5. 好感度系统（affection.js）
- `updateAffection(memberId, delta)` — 更新并写日志
- `addAffectionLog(memberId, delta, reason)` — 记录日志
- `triggerAffectionFromChoice(choiceText)` — 根据选项文本推断目标成员加分
  - 未匹配到成员时直接返回，不再随机加分/扣分（避免误伤）
- 面板：`showAffectionPanel()`（affection-panel.js）

## 6. 短信系统（SMS）
- `sendSms()` — 发送短信，AI 生成回复
- 短信历史：`showSmsHistoryModal()`
- 发送面板：`showSmsModal()`（手机 UI 样式）

## 7. 送礼系统（Gift）
- `showGiftPanel()` — 选择礼物和成员
- `sendGift(memberId, gift)` — 生成回礼剧情，调用 `window.scheduleReturnGift`
- 礼物改造：`showRemakeGiftModal()` — 重新改造已有礼物

## 8. 真心话系统（Truth）
- `handleTruthRound()` — 处理真心话轮次
- `showTruthAnswerModal()` — 回答输入弹窗
- Day 11 深夜触发惩罚版（见 4.2）

## 9. X 档案系统（x-archive.js）
- `generateXBackstory()` — 生成 X 背景故事
- `generateMemberXBackstory(member)` — 生成每位成员视角的 X 故事
- `generateAllXArchives()` — 批量生成
- 失败标记文本为 `"X档案生成失败"`，而非仅 `"失败"`（避免正常文本误判）
- 展示面板：`showXArchiveModal()` / `showXItemsModal()`

## 10. 选项选择提示（choiceText）
- 每段 consequence 剧情前显示橙色标签 `👉 你的选择：xxx`
- 场景覆盖：普通选项、自由行动、短信、真心话、提问箱、继续今天、最终选择、醉酒后续
- 渲染在 `narrative-box.js` 中通过 `choice-tag` 样式实现

## 11. 安全与输入处理
- **escHtml：** 所有 AI 生成文本插入 DOM 前必须经过 `escHtml()` 转义
  - 转义范围：`& < > " '` → `&amp; &lt; &gt; &quot; &#39;`
- **XSS 重点检查位置：**
  - `narrative-box.js` — 所有 narrative 类型（尤其 `memberInterview`、`observerOS`）
  - `x-archive-modal.js` — `xBackstory`、`memberXBackstories`、`filterItemsByReveal` 返回
  - `x-items-modal.js` — 记忆物品渲染
- **alert 替换：** 全部使用 `showToast()` + `console.error()`，避免阻塞 UI 和暴露内部错误信息

## 12. 食物禁忌（foodTaboos）
- 数据定义在 `data.js` — MEMBERS 数组的 `foodTaboos` 字段
- System Prompt 中注入规则，涉及用餐/做饭场景时 AI 必须遵守

## 13. 观察者嘉宾（Observer Guest）
- 格式：`夫胜宽 Seungkwan`（中文名 + 空格 + 英文昵称）
- 特约嘉宾提到其他成员时直接叫英文名（如 Joshua、Wonwoo、Mingyu）

## 14. 激活码鉴权系统（已关闭）
- 状态：已关闭，代码保留，可随时开启
- 前端：`src/auth.js`（设备指纹、Token 验证）、`src/init.js`（鉴权入口，已注释）
- 后端：`backend/`（Cloudflare Workers + KV）、`backend-tencent/`（腾讯云）
- 本地管理员码：`SVT-ADMIN-2024`、`换乘恋爱-一万年`、`SEVENTEEN-FOREVER`
- 开启方法：取消 `src/init.js` 鉴权注释，配置 `src/auth.js` 的 `BACKEND_URL`

---

# 开发规范与注意事项

## 新增功能 Checklist
1. `state.js` — `defaultGameState()` 添加字段
2. `state.js` — `migrateSave()` 添加兜底初始化（版本号 `v21`）
3. `game-engine.js` — `proceedToNextDay()` 添加清理逻辑（如果需要）
4. `prompts.js` — 注入相关 prompt 规则（`buildUserMessage` 或 `buildSystemPrompt`）
5. `ui-renderer.js` / `ui/` — 添加 UI 渲染逻辑（如有新界面）
6. `modals/` — 如有新弹窗，在 `modals.js` 和 `modals/index.js` 中导出

## 安全红线
- 任何用户输入或 AI 生成文本插入 DOM 前，**必须** 经过 `escHtml()`
- 禁止在生产环境使用 `alert()` 或 `console.log()` 暴露敏感状态（如 API Key）
- `store.js` 的 `SET_FLAG` 已加白名单，不可通过 dispatch 任意覆盖字段
- `GS` 引用不可被替换（`setGS` 使用 `Object.assign`）

## 构建与发布
- 构建前务必运行 `npm run build` 验证 — 无报错后再上传 COS
- 生产环境构建使用 `node ./node_modules/vite/bin/vite.js build`

## 保留文件
- **不要删除 `src/app.js.backup`** — 旧版单文件备份，部分函数结构参考自它

---

# 历史修改记录（归档）

| 功能 | 状态 | 关键文件 | 备注 |
|---|---|---|---|
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
| 随机事件 || 条件 | 已完成 | data.js | 拆分为独立事件 |
| flushText 延迟计算 | 已完成 | narrative-box.js | 先缓存 length |
| goToNextDay 选择判断 | 已完成 | game-engine.js | 移除 indexOf('选择') |
| store.js 生产日志 | 已完成 | store.js | import.meta.env.DEV 守卫 |
