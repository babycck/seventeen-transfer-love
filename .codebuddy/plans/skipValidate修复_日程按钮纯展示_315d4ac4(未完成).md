---
name: skipValidate修复+日程按钮纯展示
overview: 两部分合并修复：①skipValidate bug 导致粉丝反应/结局叙事纯文本生成被 JSON 校验误杀（3 处 1 行改动）；②日程按钮（主档/相关/情敌/哥哥）从可点击剧情触发器改为纯展示信息标签，消除与主线剧情的重复生成，仅保留「队友互动」按钮可点击。
todos:
  - id: fix-ai-generator
    content: ai-generator.js:51 将 if (skipValidate) 改为 if (skipValidate || opts.plainText)
    status: pending
  - id: fix-immersion-engine
    content: "immersion.js:69 和 engine.js:274 两处 generateWithRetry opts 各追加 skipValidate: true"
    status: pending
    dependencies:
      - fix-ai-generator
  - id: agenda-display-only
    content: ui.js renderAgenda 非队友项改渲染为 div.es-ag-tag，队友保持 button；style.css 加 .es-ag-tag 静态样式
    status: pending
  - id: build-verify
    content: Vite 构建验证无语法错误
    status: pending
    dependencies:
      - fix-ai-generator
      - fix-immersion-engine
      - agenda-display-only
---

## 用户需求

两个独立问题，合并修复：

### 1. 日程按钮改为纯展示

entSim 模式下，日程区的主档/相关/情敌/哥哥按钮点击后会调用 `triggerEntSimEvent` 生成独立剧情。但系统 prompt 已要求主线剧情围绕今日日程展开，导致重复生成。用户要求这些按钮变为**纯展示标签**（不可点击、不生成剧情），只有「队友互动」保留按钮交互。

### 2. 纯文本生成 skipValidate bug 修复

`generateFanReaction`（粉丝圈反应）和 `runEntSimEnding`（结局叙事）调用 `generateWithRetry` 时传了 `plainText: true` 但漏传 `skipValidate: true`。AI 正确输出纯文本后被 `validateEntSimNarrative`（期望 JSON）误校验，parser 解析出空 narrative → 报「0 字 + 缺 options」→ 3 次重试全失败。粉丝圈反应内容本身质量很好，修好后通过右栏已有的「营业反馈」按钮即可查看。

## 技术方案

### 修改范围（4 个文件，共 5 处改动）

#### Part A: skipValidate 根治（3 文件 3 处）

**`src/ai-generator.js` 第 51 行**

```
if (skipValidate) → if (skipValidate || opts.plainText)
```

根治：`plainText: true` 本就意味不使用 JSON（第 23 行 `useJson = !opts.plainText` 已据此关闭 `response_format=json_object`），对纯文本做 JSON 结构校验逻辑上矛盾。加 `|| opts.plainText` 后所有纯文本调用自动跳过校验。

**`src/ent-sim/immersion.js` 第 69 行**
opts 追加 `skipValidate: true`（显式防御）。

**`src/ent-sim/engine.js` 第 274 行**
opts 追加 `skipValidate: true`（同上）。

#### Part B: 日程按钮改纯展示（2 文件 2 处）

**`src/ent-sim/ui.js` `renderAgenda()` 函数（第 134-149 行）**

当前：所有日程项统一渲染为 `<button class="es-ag-btn" data-agenda="...">`，包括 main/related/rival/brother/teammate。

改为：非 teammate 项渲染为 `<div class="es-ag-tag">`（无 `data-agenda`、无按钮语义），teammate 保持 `<button class="es-ag-btn" data-agenda="teammate">`。移除 `doneFlags` 检查（纯展示不需要完成态）。

**`src/style.css` 第 2390 行后新增**

添加 `.es-ag-tag` 样式：复用 `.es-ag-btn` 基础布局（flex/padding/border/radius），但文字颜色用 `var(--es-text-dim)` 偏暗、图标 opacity 0.6、无 cursor:pointer、无 :hover 效果，视觉上区分「信息标签」vs「可点按钮」。

### 不需要改动的部分

- `bindEntSimEvents`（433 行）：`.es-ag-btn[data-agenda]` 选择器只会匹配 teammate 按钮，无需修改
- `onAgendaClick`（499 行）：非 teammate 分支变为死代码，保留不删（最小改动原则）
- 已正确传参的 3 处（game-engine.js:3841/3950、engine.js:218）不受影响

### 向后兼容

- 换乘恋爱和 1v1 模式完全不受影响
- 非 plainText 的 entSim 主剧情仍走 `validateEntSimNarrative`
- `doneFlags` 字段保留在 state 中不删，只是不再读取（旧存档无影响）