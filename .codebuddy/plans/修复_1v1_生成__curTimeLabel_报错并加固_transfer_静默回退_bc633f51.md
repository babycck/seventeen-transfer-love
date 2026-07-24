---
name: 修复 1v1 生成 _curTimeLabel 报错并加固 transfer 静默回退
overview: "修复 1v1 模式剧情生成时抛出的 ReferenceError: _curTimeLabel is not defined（prompts.js:1497），并加固 buildOneHeartSystemPrompt 中在 member 为空时静默回退到 transfer 系统提示（buildSystemPrompt）的危险 footgun，确保 1v1 会话永不产出 transfer 内容。"
todos:
  - id: fix-cur-time-label
    content: 将 prompts.js:1497 的未定义变量 `_curTimeLabel` 替换为同函数已声明的 `_prevLabel`
    status: completed
  - id: harden-fallback
    content: 将 prompts.js:967 的静默回退 `buildSystemPrompt()` 改为 console.error 并显式返回 1v1 配置错误提示，杜绝生成 transfer 内容
    status: completed
  - id: verify
    content: 运行 node --check 校验语法，并在 1v1 模式推进剧情验证报错消失且产出 1v1 剧情
    status: completed
    dependencies:
      - fix-cur-time-label
      - harden-fallback
---

## 用户需求

1v1「只为你心动」模式剧情生成连续报 `ReferenceError`，且存在静默产出 transfer（换乘恋爱）剧情的隐患，需修复：

## 核心问题

- **Bug 1（当前报错）**：`buildOneHeartUserMessage` 第 1497 行引用了未定义的 `_curTimeLabel`，导致每次 1v1 推进剧情都抛 `ReferenceError: _curTimeLabel is not defined`，生成失败并弹「1v1 generation error」。
- **Bug 2（transfer 内容隐患）**：`buildOneHeartSystemPrompt` 第 967 行在 `GS.oneHeartMember` 为空时静默 `return buildSystemPrompt()`（transfer 系统提示）。一旦 1v1 会话中 member 异常为空，就会生成出观察员/X 前任档案/任务卡/3 攻略对象等 transfer 专属内容。

## 修复目标

- 让 1v1 模式能正常生成 1v1 剧情，不再抛未定义变量错误。
- 彻底消除 1v1 静默回退到 transfer 提示的 footgun，异常分支给出明确配置错误提示而非 transfer 内容。
- 不改动正常 1v1 行为、不影响 transfer 模式。

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+，Vanilla JS + Vite（与现有项目一致）
- 仅涉及单文件修改：`src/prompts.js`

## 实现方案

### 总体策略

两处均为同一类「标识符/作用域」缺陷，采用最小改动修复，保持 1v1 与 transfer 代码互不污染（路由 `generatePhaseNarrative` 已强制 `if (GS.gameMode === 'oneHeart') return generateOneHeartRound()` 分流）。

### Bug 1 修复（`src/prompts.js:1497`）

- 第 1497 行 `msg += '...{"timeOfDay":"' + _curTimeLabel + '"}...'`，`_curTimeLabel` 从未声明。
- 同一函数第 1471 行已声明并做单调钳制：`var _prevLabel = GS.oneHeartTimeOfDay || '上午';`（非法值回退 `'上午'`）。`_prevLabel` 即「当前时段标签」，语义完全符合 sceneContext.timeOfDay 示例所需。
- 将 `+ _curTimeLabel +` 改为 `+ _prevLabel +`，错误消除且示例值正确。

### Bug 2 加固（`src/prompts.js:967`）

- 原代码：`var member = MEMBERS.find(...); if (!member) return buildSystemPrompt();`
- `buildSystemPrompt()` 是 transfer 提示，1v1 会话中 member 为空时静默返回将生成 transfer 剧情，与用户所见症状一致。
- 改为：异常分支打 `console.error` 记录，并返回一个明确的 1v1 配置错误提示字符串（告知 oneHeartMember 为空、需返回设置重选成员）。这样即使 member 异常为空，也**绝不回退到 transfer 提示**；`generateOneHeartRound` 后续 `parseOneHeartNarrative` 会因拿不到合法 narrative 走「格式异常」分支弹提示，而非产出 transfer 剧情。
- 正常 1v1 流程（Step2 chip 点击设 oneHeartMember、Step4 确认）必设 member，此改动仅影响异常分支，不改变正常行为。

## 实现注意

- 复用现有日志风格（`console.error` 前缀，不输出敏感信息）。
- 改动仅 2 行替换 + 1 处短路返回改写，无新增依赖、无 API/行为面变化。
- 已通读 `buildOneHeartSystemPrompt`（964-1234）与 `buildOneHeartUserMessage`（1277-1747）全文，除已修复的 `getOneHeartAddressRule`（前序计划已修）与本 `_curTimeLabel` 外，未发现其他未定义标识符；故本次无需额外扫描。

## 目录结构

```
src/
└── prompts.js   # [MODIFY]
    # 1) 第 1497 行：将场景状态示例中的 `_curTimeLabel` 改为 `_prevLabel`（同函数已声明并钳制的当前时段标签）。
    # 2) 第 966-967 行：buildOneHeartSystemPrompt 内 member 为空时，不再 `return buildSystemPrompt()`（transfer 提示），
    #    改为 console.error 并返回一段明确的 1v1 配置错误提示字符串。
```

## 验证

- `node --check src/prompts.js` 通过（语法无误）。
- `npm run dev` 进入 1v1「队友的妹妹 + 心动小屋」，推进剧情：不再出现 `_curTimeLabel is not defined` 与 `getOneHeartAddressRule is not defined`；AI 正常返回 1v1 剧情（无观察员/X 档案/任务卡）；控制台不再出现 `parseNarrative`/selectedMembers 等 transfer 日志。