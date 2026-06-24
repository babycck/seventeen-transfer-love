---
name: free-input-to-scene-expansion
overview: 将自由输入框从"行动意图→AI 续写后续"改为"剧情梗概→AI 扩写为完整剧情段落"。玩家输入一段期望发生的剧情，AI 基于人设调整合理性后扩写到约 800-1200 字，扩写完直接结束本段，不生成选项、不影响好感度。涉及 prompts.js 的 freeAction 分支、game-engine.js 的 handleFreeAction、ui/free-input.js 的文案与按钮。
todos:
  - id: rewrite-freeaction-prompt
    content: 重写 prompts.js freeAction 分支：改为扩写剧情梗概，不含 options，截断 noRepeatNote 选项行
    status: completed
  - id: simplify-handlefreeaction
    content: 精简 game-engine.js handleFreeAction：删除好感度/吃醋/任务触发，强制空 options
    status: completed
    dependencies:
      - rewrite-freeaction-prompt
  - id: update-free-input-ui
    content: 修改 free-input.js 文案：placeholder 和按钮改为剧情导向
    status: completed
    dependencies:
      - simplify-handlefreeaction
---

## 产品概述

将自由输入框从"输入一个行动意图，AI 续写后续"改为"输入一段想发生的剧情梗概，AI 扩写演绎为完整剧情段落"。玩家成为剧情导演，输入期望发生的事件，AI 负责文学化扩写并基于人设调整合理性。

## 核心功能

- 玩家在输入框中写下期望发生的剧情梗概（如"和珉奎在阳台聊童年"）
- AI 将梗概扩写为 800-1200 字的完整剧情（含 narrative + interview + memberInterview + observers）
- AI 可基于成员人设调整不合理之处，但尽量贴近玩家输入的事件走向
- 扩写完成后不生成选项，直接结束本段，玩家通过底部操作栏进入下一时段
- 自由剧情不影响好感度数值、不触发吃醋/任务检测，纯剧情体验
- 仍占用本时段行动次数配额，防止滥用

## 技术栈

- Vanilla JS (ES Modules), Vite 5.4
- 遵循项目约定：`var` 声明、`+` 字符串拼接、最小改动

## 实现方案

### 修改 1：`src/prompts.js`（第 612-618 行，freeAction 分支）

重写 prompt，将"续写行动后续"改为"扩写剧情梗概"：

- 玩家输入定义为"期望发生的剧情梗概"，AI 需将其扩写为完整剧情
- 允许 AI 基于人设调整不合理之处（如某成员不会做的事则适当改写），但尽量贴近玩家意图
- 字数从 ~1600 字改为 ~800-1200 字
- 输出要求从"narrative + interview + memberInterview + observers + options（3个）"改为"narrative + interview + memberInterview + observers"，明确不输出 options
- `noRepeatNote` 中第 3-5 行涉及选项的提示不拼入 freeAction 分支，仅保留前 2 行（禁止复述 + 采访间引用规则）

### 修改 2：`src/game-engine.js`（第 872-930 行，handleFreeAction 函数）

精简副作用处理：

- 删除 `triggerAffectionFromChoice(actionText)` 调用（不加好感度）
- 删除 `checkJealousyEvent(actionText)` 调用（不触发吃醋）
- 删除 `checkMissionInteract(actionText)` 调用（不触发任务检测）
- 删除 `pendingJealousy` 处理块（第 913-921 行，不再可能触发）
- 删除"行动次数已用完"选项追加逻辑（第 904-906 行）
- `GS.currentOptions = parsed.options` 改为 `GS.currentOptions = []`（强制无选项）
- `choiceText` 标签从 `'✍️ 自由行动：'` 改为 `'✍️ 自由剧情：'`
- 保留 `phaseFreeCount++` 配额扣减、`applyParsedSideEffects`、`PUSH_CONSEQUENCE`、`PUSH_TODAY_TEXT` 流程

### 修改 3：`src/ui/free-input.js`（第 19-24 行）

文案调整：

- placeholder：`✍️ 自由输入你的行动/想法...` → `✍️ 写下你想发生的一段剧情...`
- 按钮文案：`✍️ 行动` → `✍️ 生成剧情`

## 实现注意事项

- **UI 兼容性已验证**：`option-panel.js` 第 9 行 `opts.length > 0` 条件在空数组时不满足，返回空字符串（无渲染无报错）；`action-bar.js` 在 `hasConsequences=true` 时渲染"进入下一时段"按钮，玩家可正常推进
- **validator 兼容**：`validateNarrative` 对空 options 仅宽松告警（第 363-365 行），不报 error，不影响重试机制
- **noRepeatNote 截断**：freeAction 分支不拼入 `noRepeatNote` 后 3 行（选项相关），仅用前 2 行内容，避免"三个选项指向不同方向"与新逻辑矛盾
- **配额保留**：`phaseFreeCount++` 保留，自由剧情仍占 `PHASE_ACTION_LIMIT` 配额，防止玩家无限扩写绕过选项机制
- **TOKEN_CONFIG**：`freeAction: 6000` 保持不变（虽然输出缩短，但保留余量避免截断风险）

## 目录结构

```
src/
├── prompts.js                    # [MODIFY] 第 612-618 行：freeAction 分支 prompt 重写为"扩写剧情梗概"
├── game-engine.js                # [MODIFY] 第 872-930 行：handleFreeAction 删除好感度/吃醋/任务/选项逻辑
└── ui/
    └── free-input.js             # [MODIFY] 第 19-24 行：placeholder 和按钮文案调整
```