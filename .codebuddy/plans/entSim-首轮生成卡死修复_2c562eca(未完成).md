---
name: entSim-首轮生成卡死修复
overview: 修复娱乐圈模拟器（entSim）打开后卡在"剧情加载中"的问题：① 种子事件生成因未走纯文本模式且 prompt 含元指令导致校验失败/输出思维链；② 首轮 phase 生成失败时 renderHtml 用 !E.started 判定会陷入永久重触发的死循环。
todos:
  - id: fix-seed-event
    content: 修复 ensureSeedEvent：加 plainText/skipValidate 参数、重写纯文本场景 prompt、补兜底模板（engine.js）
    status: pending
  - id: fix-render-gate
    content: 修复 renderHtml 首轮 gate 死循环，接入 _entSimAutoTries 上限避免无限加载（ui.js）
    status: pending
    dependencies:
      - fix-seed-event
  - id: verify-build
    content: 构建并运行 dev 验证首轮生成成功、控制台无校验失败日志
    status: pending
    dependencies:
      - fix-render-gate
---

## 用户需求

娱乐圈模拟器（entSim 模式）打开后界面卡在「剧情加载中」无法进入，控制台持续打印 `ai-generator` 校验失败日志（`[length] 正文过短（0字）`、`[format] 缺少 options`），且 rawText 显示模型在输出思维链而非剧情正文。

## 核心问题

首轮剧情生成链路失败，导致界面永远停留在加载态：

- 种子事件生成函数把纯文本场景当剧情校验，且 prompt 元指令诱导模型输出思维链，导致 `seedEvent` 写入垃圾内容、首轮 phase 整体生成受阻。
- 首轮 gate 在生成始终失败时不会放弃，陷入反复触发生成的死循环。

## 技术栈

- 现有项目：Vanilla JS (ES Module) + Vite 构建（保持 `var`、字符串拼接等既有约定）
- AI 生成：`generateWithRetry(sysPrompt, userMsg, opts)`（src/ai-generator.js），支持 `plainText` / `skipValidate` 选项

## 问题定位（已确认）

1. **Bug 1 —— `ensureSeedEvent()`（src/ent-sim/engine.js:170-182）**

- 调用 `generateWithRetry(..., { temperature: 0.8, maxTokens: 400 })` 未传 `plainText`/`skipValidate`，默认 `useJson=true` 且走 `validateNarrative`（要求正文≥100字 + 2-4 个 options）。
- 种子事件是纯文本场景、本无 options → 校验必失败。
- prompt 含「设定器 / 不要 JSON / 不要解释」等元指令，DeepSeek 被诱导输出思维链（rawText 见「我们设定全圆佑…构思：…」），`parsed.narrative` 为空 → 正文 0 字。
- 失败兜底把思维链文本写入 `GS.entSim.romance.seedEvent`，既污染后续 prompt 回溯锚点（prompts.js:23-24），又浪费首轮 3 次重试。

2. **Bug 2 —— `renderHtml()` 首轮 gate 死循环（src/ent-sim/ui.js:54-62）**

- 判定 `if (!E.started && !GS._entSimGenerating)` 触发首轮生成。
- `E.started` 仅在 engine.js:54（phase 且 narrative 非空）置位。若首轮最终 narrative 为空，`E.started` 永为 false，而 `_entSimGenerating` 已复位 → 每次渲染都重触发 → 无限「剧情加载中」。
- `autoTries>=2` 兜底（ui.js:306-316）只覆盖 `bindEntSimEvents` 路径，覆盖不到 `renderHtml` 这条首轮入口。

## 实施方案

### 1. 修复 `ensureSeedEvent()`（engine.js）

- **参数**：给 `generateWithRetry` 的 opts 加 `plainText: true, skipValidate: true`，使其按纯文本处理、不强制 JSON、跳过 options/长度校验（对齐 ai-generator.js:51-53 既有分支）。
- **prompt 重写**：去掉「设定器/不要 JSON」等元指令，改为自然写作指令，例如：
- system：`你是文风细腻的恋爱小说写手，只输出正文。`
- user：`为男主「X」写一段约 200 字场景，描写他对女主暗暗上心的契机（如女主某句话/舞台动作/被哥哥吐槽的瞬间/不经意相处）。要具体、可回溯引用，不出现女主姓名，不写标题、不写解释、不给选项。直接输出场景正文。`
- **兜底模板**：`.then` 中若 `res.raw` 为空（`!res || !res.raw.trim()`），写入一道干净的固定场景（参照 ui-renderer.js:1370-1371 的 1v1 兜底写法），确保 `seedEvent` 永不空、不垃圾。

### 2. 修复 `renderHtml()` 首轮死循环（ui.js）

- 复用已有 `GS._entSimAutoTries`（state.js:93 已初始化为 0）。在首轮 gate 处接入上限：每次自动触发生成前自增；若 `>= 2` 则置 `GS.entSim.started = true`（停止自动重生成）并直接 `return` 让现有失败占位（`（剧情生成失败，请点击「拉回主线」重试）`）与 `bindEntSimEvents` 的兜底接管，避免无限加载。

### 3. 架构与复用说明

- 不新建文件、不新增依赖；仅修改 `src/ent-sim/engine.js` 与 `src/ent-sim/ui.js`。
- 种子事件实现对齐项目已有正确范本（ui-renderer.js:1325-1371 的 1v1 种子事件：纯文本 `callDeepSeek(..., false, 0.9)` + 兜底模板）。
- `E.started`（state.js:81）与 `_entSimAutoTries`（state.js:93）字段已存在，无需新增状态迁移。

## 验证要点

- `npm run dev` 打开 entSim，首轮 phase 能返回带有 narrative + options 的合法内容，控制台不再出现 `ai-generator` 校验失败日志。
- `GS.entSim.romance.seedEvent` 为正常场景文本（非思维链）。
- 制造一次 AI 失败场景（如临时改坏 prompt）时，界面在 2 次重试后显示「请点击拉回主线重试」而非永久加载。