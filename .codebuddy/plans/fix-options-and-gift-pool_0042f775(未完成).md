---
name: fix-options-and-gift-pool
overview: 1) 常规时段选项全部改为 AI 基于剧情生成（保留兜底）；2) AI 一次性生成 104 个回礼（13人×8个）写入 data.js 替换 RETURN_GIFTS；3) 回礼去重（同一成员抽过的不再抽）
todos:
  - id: fix-option-engine
    content: 修改 option-engine.js：默认分支返回 null 让 AI 生成选项
    status: pending
  - id: create-gift-script
    content: 创建 scripts/generate-gift-pool.mjs 一次性脚本并运行生成 104 个回礼
    status: pending
  - id: replace-gifts-and-dedup
    content: 替换 data.js RETURN_GIFTS 为 104 个 AI 礼物 + 修改 game-engine.js 添加回礼去重逻辑
    status: pending
    dependencies:
      - create-gift-script
  - id: build-commit-push
    content: 构建项目并提交推送所有修改（gift-panel.js + option-engine.js + data.js + game-engine.js）
    status: pending
    dependencies:
      - fix-option-engine
      - replace-gifts-and-dedup
---

## 用户需求

### 1. 常规时段选项改为 AI 基于剧情生成

当前所有非特殊按钮的常规时段选项走的是模板（"和XX一起做早餐"等），不是 AI 生成的。需要改为 AI 基于剧情正文生成，AI 失败时保留模板兜底。

### 2. 回礼池扩充为 104 个（13人 x 8个）

当前 RETURN_GIFTS 每人仅 4 种共 52 种，且纯随机抽取会重复。需要用 AI 一次性生成 13人 x 8个 = 104 个礼物，硬编码替换 data.js 中的 RETURN_GIFTS。

### 3. 回礼去重

同一成员的回礼不重复（已收过的不再抽），池耗尽时回退全池随机。

### 4. 回礼描述 AI 思考过程修复（已完成待提交）

gift-panel.js 的 getGiftDescription prompt 已修复（强化指令 + 正则后处理），需一并提交。

### 5. 构建 + 提交 + 推送

所有修改完成后构建项目并推送到远程。

## Tech Stack

- 语言/运行时：JavaScript (ES Modules), Node.js 18+
- 框架：Vanilla JS + Vite 5.4
- AI API：DeepSeek (`deepseek-chat` 模型, endpoint `https://api.deepseek.com/v1`)
- 约定：使用 `var` 而非 `let/const`，字符串拼接使用 `+` 运算符，不使用模板字符串

## Implementation Approach

### 改动 1: 常规时段选项改为 AI 生成（option-engine.js）

**问题**：`generateOptions()` 默认分支调用 `generateStandardOptions()` 返回 3 个模板选项（"和XX一起做早餐"等），`game-engine.js:249` 判断 `skeletonOpts && skeletonOpts.length > 0` 为 true 直接用模板，跳过 AI 生成。

**修复**：将 `option-engine.js:38-39` 的默认分支从 `return generateStandardOptions(day, phase)` 改为 `return null`。与 `generateDatingOptions()` 返回 null 的模式一致。`game-engine.js:249` 中 `null` 不满足 `length > 0`，进入 AI 选项生成分支（line 252-284），已有三级兜底：AI 选项 -> 叙事自带选项 -> `skeletonGetFallbackOpts()` 模板。

**影响范围**：所有非约会日/非深夜/非真心话/非提问箱的常规时段（Day 1-12 phase 0/1/2）都会改为 AI 生成选项。Day 11 上午/下午的问题同时修复。

**性能**：每个常规时段多一次 AI 调用（约 1000 tokens），与其他 AI 选项生成场景一致。`generateStandardOptions` 函数变为死代码但保留不删（最小改动原则）。

### 改动 2: AI 生成 104 个回礼（一次性脚本 + data.js 替换）

**脚本设计**（`scripts/generate-gift-pool.mjs`）：

- 参考 `scripts/generate-test-mocks.mjs` 的 ESM 模式（`import` 语法，`"type": "module"` 已在 package.json 配置）
- 从 `../src/data.js` 导入 MEMBERS 数组（data.js 是纯数据文件无浏览器依赖）
- 构建 prompt：列出 13 位成员的 `name`、`personality`、`specialties`、`collections`、`quirks`、`foodPreferences`，要求每人 8 个独特回礼
- 调用 DeepSeek API（`https://api.deepseek.com/v1/chat/completions`，model `deepseek-chat`），API Key 从环境变量 `DEEPSEEK_API_KEY` 读取
- 输出 JSON 格式 `{ memberId: ['礼物1', ..., '礼物8'], ... }` 到控制台和临时文件
- 人工审核后替换 `data.js:467-482` 的 RETURN_GIFTS
- 完成后删除脚本（遵循项目规范）

**Prompt 设计要点**：

- 每个礼物为一句话短描述（与现有格式一致，如 `'「咖啡畅饮券」手写卡'`）
- 礼物需贴合成员性格、兴趣、收藏癖好
- 13 人之间礼物不可重复
- 输出纯 JSON，不带思考过程

### 改动 3: 回礼去重（game-engine.js）

**修改位置**：`game-engine.js:1434-1435` 的 `checkPendingReturnGifts()`

**当前逻辑**：

```js
var gifts = RETURN_GIFTS[first.memberId] || ['一份小礼物'];
var gift = gifts[Math.floor(Math.random() * gifts.length)];
```

**新逻辑**：

- 从 `GS.returnGiftHistory` 筛选该成员已收过的礼物文本
- 从全池中排除已收礼物得到可用池
- 可用池为空时（8个都收过了）回退到全池随机
- 遵循 `var` + `function` 表达式 + `+` 拼接风格

### 改动 4: 回礼描述修复（gift-panel.js，已完成）

已修改两处：

1. prompt 开头从"你是《换乘恋爱》的叙事AI"改为"你只输出礼物描述文本，不要输出任何思考过程或解释"
2. 后处理添加正则剥离常见思考痕迹（"好的，用户要求..."等）

### 改动 5: Day 11 真心话如实回答取消后 UI 卡死修复（game-engine.js）

**问题**：用户点击"如实回答"→ 弹出输入框 → 关闭输入框（✕ 或遮罩）→ 所有按钮被禁用，必须刷新。

**根因**：

- `ui-renderer.js:863-864` 点击选项时立即 disable 所有按钮
- `game-engine.js:501-505` `handleTruthRound` 中用户取消输入时直接 `return`，没有恢复按钮状态
- `truth-answer.js:34,38` 关闭时 resolve('')，`!playerAnswer` 为 true 触发 return

**修复**：在 `game-engine.js:504` 的 `if (!playerAnswer) return;` 之前，添加恢复 UI 的逻辑：

- 重新渲染界面（`window.__renderAll && window.__renderAll()`）以恢复按钮可用状态
- 或直接移除 disabled 属性

采用 `renderAll()` 方案，与项目其他地方一致，确保状态同步。

### 性能与可靠性

- 选项 AI 生成：与现有模式一致，`generateWithRetry` 已有 3 次重试机制
- 回礼去重：O(n) 遍历 returnGiftHistory（最多 8 条/成员），无性能影响
- 礼物池脚本：一次性运行，不进入构建产物

## Architecture Design

### 选项生成流程（修改后）

```
generateOptions()
  ├─ 约会日 phase 0 → 返回固定按钮
  ├─ 深夜 phase 3 → 返回空数组
  ├─ 约会场景中 → 返回 null → AI 生成
  ├─ 真心话模式 → 返回空数组
  ├─ 提问箱模式 → 返回固定按钮
  └─ 默认 → 返回 null → AI 生成（修改点）
```

### 回礼抽取流程（修改后）

```
checkPendingReturnGifts()
  ├─ 获取该成员全池 RETURN_GIFTS[memberId]（8个）
  ├─ 从 returnGiftHistory 筛选已收礼物
  ├─ 全池 - 已收 = 可用池
  ├─ 可用池非空 → 随机抽取
  └─ 可用池空 → 回退全池随机
```

## Directory Structure

```
src/
├── skeleton/
│   └── option-engine.js        # [MODIFY] generateOptions 默认分支返回 null（line 38-39）
├── modals/
│   └── gift-panel.js           # [MODIFY] 已修复回礼描述 AI 思考过程（line 165-177），待提交
├── game-engine.js              # [MODIFY] checkPendingReturnGifts 添加去重逻辑（line 1434-1435）
└── data.js                     # [MODIFY] RETURN_GIFTS 替换为 13人×8个=104个（line 467-482）

scripts/
└── generate-gift-pool.mjs      # [NEW] 一次性脚本：调用 DeepSeek 生成 104 个回礼，完成后删除
```

## Key Code Structures

### 回礼去重逻辑（game-engine.js checkPendingReturnGifts 修改后核心片段）

```javascript
var allGifts = RETURN_GIFTS[first.memberId] || ['一份小礼物'];
var usedGifts = (GS.returnGiftHistory || [])
  .filter(function(r) { return r.memberId === first.memberId; })
  .map(function(r) { return r.gift; });
var available = allGifts.filter(function(g) { return usedGifts.indexOf(g) < 0; });
if (available.length === 0) available = allGifts;
var gift = available[Math.floor(Math.random() * available.length)];
```

### 礼物池脚本 prompt 结构（scripts/generate-gift-pool.mjs）

```javascript
var sysPrompt = '你是礼物设计师。为以下13位SEVENTEEN成员每人设计8个独特的回礼。' +
  '礼物要求：贴合成员性格和兴趣，一句话短描述（10-20字），13人之间不可重复。' +
  '只输出JSON，格式为 {"成员id": ["礼物1","礼物2",...,"礼物8"], ...}，不要输出任何其他文字。';
var userMsg = '成员信息：\n' + MEMBERS.map(function(m) {
  return m.id + ' ' + m.name + '：' + m.personality + '，特长：' + m.specialties +
    '，收藏：' + (m.collections || '').join('、') + '，怪癖：' + (m.quirks || '').join('、');
}).join('\n');
```