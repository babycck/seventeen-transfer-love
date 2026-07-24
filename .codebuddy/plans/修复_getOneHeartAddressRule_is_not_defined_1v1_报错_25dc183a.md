---
name: 修复 getOneHeartAddressRule is not defined 1v1 报错
overview: "修复 1v1 模式生成时抛出的 ReferenceError: getOneHeartAddressRule is not defined（prompts.js:1086），根因是该函数在 buildOneHeartSystemPrompt 的 return 字符串拼接表达式中以「函数表达式」形式出现，导致标识符未绑定到外层作用域。"
todos:
  - id: move-func-decl
    content: 在 prompts.js 的 buildOneHeartSystemPrompt 顶部新增 getOneHeartAddressRule 函数声明
    status: completed
  - id: clean-concat
    content: 删除 prompts.js 拼接表达式中原位函数定义，保持字符串链语法正确
    status: completed
    dependencies:
      - move-func-decl
  - id: verify-no-similar
    content: 搜索确认 prompts.js 无其他同类函数表达式误用写法
    status: completed
    dependencies:
      - clean-concat
---

## 用户需求

修复 1v1「只为你心动」模式剧情生成时抛出的运行时错误：`ReferenceError: getOneHeartAddressRule is not defined`。

## 问题概述

在 `src/prompts.js` 的 `buildOneHeartSystemPrompt()` 中，函数 `getOneHeartAddressRule` 被写在了 `var result = '...' + ... + function getOneHeartAddressRule(){...} + ...` 这样的字符串拼接表达式中。JavaScript 会将其解析为**函数表达式（function expression）**而非函数声明，函数名不会绑定到外层函数作用域，导致：

- 在 `src/prompts.js:1086`（处理「妹妹线」关系角色称呼规则的 IIFE 内）与 `src/prompts.js:1190`（全局写作规则）调用时抛出 `ReferenceError`，使每轮 1v1 剧情生成失败并反复触发 AI 重试；
- 该表达式还会把函数源码 `toString()` 拼进 prompt 文本，污染发给 AI 的内容。

## 核心修复点

- 将 `getOneHeartAddressRule` 从 `return`/拼接表达式内移出，改为 `buildOneHeartSystemPrompt` 内部正常的函数声明（函数声明会被提升，调用处无需改动）。
- 保持两处调用点（1086、1190）写法不变，使其正确解析到提升后的声明。
- 该函数仅依赖模块级符号 `GS` / `MEMBERS` / `isSisterSetting()`，无其他闭包依赖，移出后行为完全一致。

## 技术栈

- 语言/运行时：JavaScript（ES Modules），Node.js 18+，Vite 构建（与现有项目一致）
- 无新增依赖，纯原生 JS 作用域修正

## 实现方案

### 策略

通过最小作用域重构修复：将误置于字符串拼接表达式内部的函数定义，提升为 `buildOneHeartSystemPrompt` 顶部的正规函数声明，并清理拼接表达式中的原位定义，使语法正确且名称可解析。

### 关键技术决策

1. **提升为函数声明（hoisted declaration）**：在 `buildOneHeartSystemPrompt` 函数体内、`var result = ...` 赋值之前（约 line 971 之后）插入 `getOneHeartAddressRule` 的声明与注释。函数声明会被提升，因此 1086、1190 两处调用无需任何改动即可解析。
2. **原位删除而非改写**：删除拼接表达式中从注释（line 996-997）到函数体右括号（line 1012）及空行（line 1013）的段落，使 line 994 的 `'[SYSTEM] 写作风格：' + ... + '\n\n' +` 直接衔接 line 1014 的 `'[SYSTEM] 世界观设定\n' + ...`，保持 `+` 链语法有效。
3. **保留所有调用语义**：1086、1190 两处调用原样保留，依赖提升后的函数声明；函数体内部逻辑（`allowObba`、`member`、`isSisterSetting()` 分支）完全不变。

### 性能与可靠性

- 此改动为纯静态作用域修正，无运行时开销变化；修复后 1v1 模式不再因 `ReferenceError` 触发无意义的 AI 重试（原错误日志显示反复 1500ms 重试，浪费网络与配额）。

## 实现注意事项

- 仅修改 `src/prompts.js`，不触碰 `game-engine.js` / `ui-renderer.js` / `parser.js` 等其他模块。
- 修改后用正则/搜索确认 `prompts.js` 中不存在其他「函数声明嵌在 `return`/`var result =` 拼接表达式」的同类写法（已初步搜索：`return '...' + \n function` 模式 0 处命中，确认无其他同类问题）。
- 保留注释说明，维持与 `validator.js` 进度门控一致性的可解释性。

## 架构设计

本修复为单文件局部修正，不影响现有架构与模块依赖关系；`buildOneHeartSystemPrompt` 的对外签名与返回值结构保持不变，1v1 安全分支（`if (GS.gameMode === 'oneHeart') return oneHeartVersion()`）不受影响。

## 目录结构

```
src/
└── prompts.js   # [MODIFY] 仅此文件改动：
                 #  - 在 buildOneHeartSystemPrompt 顶部（var result 赋值前）新增
                 #    getOneHeartAddressRule 函数声明（含 996-997 注释）。
                 #  - 删除拼接表达式中原位的定义（约 994-1013 行注释+函数体+空行），
                 #    保持字符串拼接链语法正确。
                 #  - 1086、1190 两处调用保持不变。
```

## 验证方式

- `npm run dev` 启动开发服务器，进入 1v1「只为你心动」模式（任选设定，推荐选「队友的妹妹」以触发 `isSisterSetting()` 分支走到 line 1086）。
- 推进剧情，确认控制台不再出现 `getOneHeartAddressRule is not defined`；
- 确认 AI 正常返回剧情，prompt 中不再混入函数源码文本。