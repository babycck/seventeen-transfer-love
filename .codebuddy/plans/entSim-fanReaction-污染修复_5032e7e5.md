---
name: entSim-fanReaction-污染修复
overview: 修复 entSim 模式开局卡在"剧情生成中"的问题。根因是 generateFanReaction 复用了主剧情的 system prompt（含 JSON 输出强约束），AI 在高负载/曝光场景下将"粉丝圈反应"文本误插回主剧情生成链路，导致校验失败后三次重试放弃。
todos:
  - id: fix-fanreaction-prompt
    content: 修改 prompts.js：buildEntSimSystemPrompt 新增 mode 参数，fanreaction 模式下跳过 JSON 输出指令；immersion.js 调用改用 mode='fanreaction'
    status: completed
  - id: add-content-validation
    content: 修改 validator.js：validateEntSimNarrative 增加 fanReaction 内容特征检测，命中时返回专用 content error
    status: completed
  - id: isolate-retry-corrections
    content: 修改 ai-generator.js：重试时用替换方式注入 corrections，避免 prompt 逐轮膨胀
    status: completed
  - id: verify-fix
    content: 启动 dev server 验证：entSim 新档能否正常生成首段剧情，F12 Console 确认无 fanReaction 混入
    status: completed
    dependencies:
      - fix-fanreaction-prompt
      - add-content-validation
      - isolate-retry-corrections
---

## 问题描述

entSim 新档进入后永久卡在"剧情生成中…"，不提示缺少 API key。Console 日志显示 AI 生成与校验链路三重失败：第一次返回 420 字剧情触发"过短"error，重试后 AI 输出"粉丝圈反应"纯文本（大粉/路人/黑粉格式），validator 无法识别为内容异常，三次重试全部失败后 UI 卡死。

## 根因分析

1. **`immersion.js:58`** — `generateFanReaction()` 复用 `buildEntSimSystemPrompt()`，该系统提示词强制输出 JSON 格式（narrative/options/entSimExtras），与 fanReaction 纯文本任务指令冲突。主剧情重试时，AI 在系统级 JSON 约束与用户级纯文本指令之间被混淆。
2. **`validator.js:134-152`** — `validateEntSimNarrative` 仅校验字数和 options 数量，无内容模式检测。当 AI 输出 fanReaction 文本（"大粉"/"路人"/"黑粉"等）时，narrative 为空 → 触发"过短"error，但 correction 不告知 AI 输出类型错误，导致下次重试仍然输出 fanReaction。
3. **`ai-generator.js:84`** — 重试时 corrections 直接 `+=` 追加到 `currentUserMsg`，3 次重试后 prompt 累积 3 段 `[INSTRUCTION]` 修正指令，指令过长且可能语义冲突。

## 修复范围

- 仅修改 4 个现有文件：`immersion.js`、`prompts.js`、`validator.js`、`ai-generator.js`
- 不新增文件，不改变 API 接口，不影响换乘恋爱和 1v1 模式

## 技术方案

### 修复策略（3 层防御）

**第 1 层（根因）**：`immersion.js` — 为 `generateFanReaction` 构建独立的 System Prompt，移除 JSON 输出指令，明确此为纯文本短文任务。

**第 2 层（防御）**：`validator.js` — `validateEntSimNarrative` 增加内容模式检测，当 narrative 中出现 fanReaction/dailyBuzz 特征文本时返回专用 error，告知 AI 输出类型错误。

**第 3 层（容错）**：`ai-generator.js` — 重试时用替换而非追加方式注入 corrections，避免 prompt 膨胀和指令堆积。

### 修改明细

#### 1. `d:/SEVENTEEN/src/ent-sim/immersion.js`

在 `buildEntSimSystemPrompt` 中新增可选参数 `mode`：

- `mode='narrative'`（默认）：现有 JSON 格式，用于主剧情
- `mode='fanreaction'`：纯文本格式，用于粉丝圈反应生成

修改 `generateFanReaction()` 调用：

- `buildEntSimSystemPrompt('fanreaction')` 替代 `buildEntSimSystemPrompt()`

#### 2. `d:/SEVENTEEN/src/ent-sim/prompts.js`

`buildEntSimSystemPrompt(mode)` 签名变更：

- 参数 `mode`：`'narrative'`（默认）或 `'fanreaction'`
- fanreaction 模式下：跳过 JSON 格式输出指令（第 49-58 行），替换为"纯文本输出，不含 JSON 包装"

#### 3. `d:/SEVENTEEN/src/validator.js`

`validateEntSimNarrative` 增加内容检测：

- 在字数校验之前检测 narrative 是否以 fanReaction 特征模式开头（`·大粉`、`·路人`、`·黑粉`、`·回踩粉`）
- 如命中，返回 `severity: 'error'`, `type: 'content'` 的 correction，明确指示"检测到粉丝圈文本而非剧情正文，请输出 JSON 格式的剧情 narrative"

#### 4. `d:/SEVENTEEN/src/ai-generator.js`

重试逻辑优化（第 84 行附近）：

- 将 `currentUserMsg = currentUserMsg + '\n\n' + formatCorrections(errors)` 改为使用隔离标记
- 每次注入时先清除上一轮的 `[INSTRUCTION]` 块（通过正则移除），再追加新一轮 corrections
- 保持 `currentUserMsg` 不会无限膨胀

### 向后兼容

- `buildEntSimSystemPrompt()` 不传参数时行为与现有完全一致（默认 `'narrative'`）
- `generateFanReaction` 已有的调用点（`engine.js:106-108`）不受影响
- `validateEntSimNarrative` 新增检测仅针对 fanReaction 特征，不影响正常剧情校验
- `formatCorrections` 不改变签名