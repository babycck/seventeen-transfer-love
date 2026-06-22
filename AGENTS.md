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

# 架构迁移记录

## 已完成的架构迁移（Phase 1-5）

### 新模块目录
```
src/
├── store.js            — 状态机（dispatch/reducer/subscribe）
├── ai-generator.js     — AI 生成包装（自动重试 + correction 反馈）
├── skeleton/           — 游戏逻辑骨架（5模块）
│   ├── affection-engine.js  好感度结算
│   ├── drink-engine.js      喝酒计数
│   ├── option-engine.js     选项生成（AI 只写文案）
│   ├── event-triggers.js    事件触发
│   └── scheduler.js         日程管理
├── ui/                 — UI 组件（6模块）
│   ├── header-bar.js        顶部 Header
│   ├── narrative-box.js     剧情渲染
│   ├── option-panel.js      选项面板
│   ├── action-bar.js        底部操作栏
│   └── free-input.js        自由输入
├── modals.js            — Barrel（re-export 所有弹窗）
├── modals/              — 模态弹窗（15模块）
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
│   ├── gift-panel.js         送礼面板 + 送礼逻辑 + 改造
│   ├── history-modal.js      历史剧情回顾
│   ├── help-modal.js         规则速览
│   ├── affection-panel.js    好感度面板
│   ├── heart-notes-modal.js  心动笔记
│   └── api-settings-modal.js API 设置
└── prompts/            — Prompt 模块化
    ├── index.js
    └── context-snapshot.js
```

### 迁移效果
- **game-engine.js**: ~1600行 → ~1250行（-22%）
- **ui-renderer.js**: ~1360行 → ~1210行（renderGameScreen -76%）
- **modals.js**: ~720行 → 纯 barrel（全部拆入 15 个独立模块）
- **构建产物**: 53 modules, 176KB JS, 15KB CSS
- **__skeleton 调试工具**: 控制台可切换骨架模块

# 功能修改记录（按时间顺序）

## 1. 前任来电/来信（exMessage）

**状态：** 已完成

**文件：**
- `src/game-engine.js` — `checkExMessageTrigger()`, `handleExMessageChoice()`
- `src/ui-renderer.js` — 事件绑定 `exIgnore`/`exComfort`/`exQuestion`
- `src/state.js` — `exMessage`, `exMessageHistory`
- `src/prompts.js` — buildUserMessage 中注入前任来电剧情

**触发条件：**
- Day 5-9 的傍晚/深夜（phaseIndex ≥ 2）
- 15% 概率触发
- 需要至少一位非 X 成员好感度 ≥ 20

**效果：**
- ignore：好感度 -2
- comfort：好感度 +3
- question：好感度 -5

**清理：** 进入下一天自动 `GS.exMessage = null`

---

## 2. 真心话大冒险惩罚版（truthPunishment）

**状态：** 已完成

**文件：**
- `src/state.js` — `truthPunishment: null`
- `src/game-engine.js` — `triggerTruthPunishment()`
- `src/prompts.js` — Day 11 深夜惩罚剧情注入

**触发条件：**
- Day 11 真心话结束后
- 女主喝酒杯数 ≥ 2（`GS.drinkCounts['heroine'] >= 2`）

**惩罚类型（随机）：**
1. carry：照顾你的成员必须公主抱你回卧室
2. darkroom：你与随机成员被关进书房强制独处5分钟
3. reverse：被指定成员可以反问你一个必须如实回答的问题

**清理：** 进入下一天自动 `GS.truthPunishment = null`

---

## 3. 成员食物禁忌（foodTaboos）

**状态：** 已完成

**文件：**
- `src/data.js` — MEMBERS 数组每个成员对象添加 `foodTaboos` 字段
- `src/prompts.js` — system prompt 追加饮食禁忌规则

**成员禁忌清单：**
- 崔胜澈：香菜
- 尹净汉：生鱼片、海鲜、辣食
- 洪知秀：辛辣食物
- 权顺荣：黄瓜
- 全圆佑：海鲜、贝类
- 李知勋：蔬菜、青椒
- 徐明浩：芒果
- 崔瀚率：花生、坚果（绝对禁止）
- 其他成员：无特殊禁忌（`[]`）

**规则强度：** ⚠️ 涉及用餐/做饭场景时，必须遵守以上禁忌，不得出现矛盾。

---

## 4. 重置游戏保留 API Key

**状态：** 已完成

**文件：** `src/state.js` — `resetGame()`

**行为：**
- 重置时保留 `apiKey` 和 `rememberApiKey`
- 同时保留激活码相关设置（如果开启）
- 其他所有游戏进度清空

---

## 5. 观察者嘉宾名字格式

**状态：** 已完成

**文件：**
- `src/formatters.js` — `pickObserverGuest()`
- `src/prompts.js` — observerGuest 赋值
- `src/game-engine.js` — `observerGuestPrevious` 提取

**格式：** `夫胜宽 Seungkwan`（中文名 + 空格 + 英文昵称）

**特约嘉宾提到其他成员时：** 直接叫英文名（如 Joshua、Wonwoo、Mingyu），不加姓，不用中文名。

---

## 6. 激活码鉴权系统（已关闭）

**状态：** 已关闭（代码保留，可随时开启）

**前端文件：**
- `src/auth.js` — 设备指纹、Token 验证、激活
- `src/init.js` — 进游戏前鉴权（已注释关闭）
- `src/ui-renderer.js` — 激活码输入界面

**后端方案：**
- `backend/` — Cloudflare Workers + KV 版本
- `backend-tencent/` — 腾讯云版本（轻量服务器 / SCF + Redis）

**本地管理员激活码（无需后端）：**
- `SVT-ADMIN-2024`
- `换乘恋爱-一万年`
- `SEVENTEEN-FOREVER`

**记住激活码：** 勾选「记住激活码」后，重置游戏也不会清除。

**开启方法：** 取消 `src/init.js` 中鉴权代码的注释，并配置 `src/auth.js` 的 `BACKEND_URL`。

---

## 7. 午夜匿名电话亭（midnightCall）

**状态：** 已完成

**文件：**
- `src/game-engine.js` — `showMidnightCallModal()`, `handleMidnightCall()`
- `src/ui-renderer.js` — Action Bar 显示电话亭按钮
- `src/prompts.js` — system prompt 规则 + buildUserMessage 注入

**触发：** Day 6 深夜（phaseIndex === 3）

**玩法：**
- 选择 3 位成员之一打电话，或选择不打
- 输入电话内容（对方不知道是你）
- 目标成员好感度 +5，其他成员 -2

**State：**
```javascript
midnightCall: {
  day: 6,
  status: 'pending' | 'done' | 'skipped',
  targetId: string,
  content: string
}
```

**清理：** 进入下一天自动 `GS.midnightCall = null`

---

## 8. 匿名提问箱公开处刑（questionBox）

**状态：** 已完成

**文件：**
- `src/game-engine.js` — `showQuestionBoxAnswerModal()`, `handleQuestionBoxChoice()`
- `src/data.js` — `QUESTION_BOX_QUESTIONS` 问题库
- `src/prompts.js` — buildUserMessage 注入提问箱规则

**触发：** Day 7 傍晚（phaseIndex === 2）

**玩法：**
- 从 16 道尖锐问题中随机抽取 4 道
- 女主被抽中时只有 2 个选项：
  1. 如实回答（弹出输入框）
  2. 拒绝回答并喝酒（+2杯）

**示例问题：**
- "你和X分手的真正原因，真的是你说的那样吗？"
- "在场的人里，有没有谁是你在利用来忘记X的？"
- "你有没有在心里比较过——X和这里的人，谁更好？"

**State：**
```javascript
questionBox: {
  active: true,
  day: 7,
  questions: [...],
  currentQuestion: string,
  answered: [],
  history: []
}
```

**清理：** 进入下一天自动 `GS.questionBox = null`

---

## 9. 选项选择提示（choiceText）

**状态：** 已完成

**文件：**
- `src/game-engine.js` — 所有 `consequenceNarratives.push()` 处添加 `choiceText`
- `src/ui-renderer.js` — narrative-box 渲染时显示 choice-tag
- `src/style.css` — `.choice-tag` 样式

**显示效果：**
每段后续剧情前显示橙色提示标签：
```
👉 你的选择：去厨房帮珉奎做饭
```

**各场景 choiceText：**
- 普通选项：`opt.text`
- 自由行动：`✍️ 自由行动：xxx`
- 短信：`📨 发送短信给xxx：内容`
- 真心话：`真心话：xxx`
- 提问箱：`匿名提问箱：问题 - 回答/拒绝回答并喝酒`
- 继续今天：`✍️ 继续今天（第x次）`
- 最终选择：`最终选择：xxx`
- 醉酒后续：`choiceText` 参数传入

---

## 10. 好感度面板触摸穿透修复

**状态：** 已完成

**文件：**
- `src/style.css` — `.modal-overlay`, `.modal-content`, `.modal-close`
- `src/modals.js` — 所有关闭按钮添加 `e.preventDefault(); e.stopPropagation();`

**修改内容：**
- overlay 添加 `touch-action: none; overscroll-behavior: contain`
- modal-content 添加 `overscroll-behavior: contain`
- 关闭按钮增大点击区域（padding: 10px 32px），底部留 6px 安全距离
- 所有模态框关闭事件阻止事件穿透

---

## 11. 其他细节修改

### 食物禁忌问题库
- 16 道尖锐问题，覆盖前任、伪装、私心、选择、比较等维度

### 提示词注入位置
- 前任来电：`buildUserMessage` 中 `GS.exMessage.day === GS.day` 时注入
- 真心话惩罚：`buildUserMessage` 中 Day 11 深夜注入
- 午夜电话亭：`buildUserMessage` 中 Day 6 深夜注入
- 匿名提问箱：`buildUserMessage` 中 Day 7 傍晚注入
- 嫉妒任务：`buildUserMessage` 中 `GS.jealousyMission` active 时注入

### 状态迁移（migrateSave）
- 所有新增 state 字段在 `migrateSave()` 中都有兜底初始化
- 版本号保持 `v21`

---

# 开发注意事项

1. **不要删除 `src/app.js.backup`** — 这是旧版单文件备份，部分函数结构参考自它。
2. **新增功能时记得：**
   - `state.js` defaultGameState 添加字段
   - `state.js` migrateSave 添加兜底初始化
   - `game-engine.js` proceedToNextDay 中添加清理逻辑（如果需要）
   - `prompts.js` 中注入相关 prompt 规则
3. **构建前务必运行 `npm run build` 验证** — 无报错后再上传 COS。
4. **鉴权系统开关** — 修改 `src/init.js` 中的注释即可开启/关闭，无需改动其他文件。
