---
name: entSim-职业锁定真正只读修复
overview: 修复 entSim setup 中「职业：女团爱豆」锁定字段虽然意图只读，但因样式参数为空字符串导致实际仍可编辑的 UI bug。
todos:
  - id: fix-profession-readonly
    content: 修复 entSim 职业锁定 input 未真正禁用的问题
    status: completed
  - id: build-verify
    content: 运行 Vite 构建验证无语法错误
    status: completed
    dependencies:
      - fix-profession-readonly
---

## 用户要求

用户要求"检查一下有什么bug"。经轻量预读 `src/ui-renderer.js`，发现刚完成的女团单线收尾中 entSim 职业锁定存在 UI 层面的真实可编辑 bug，需修复。

## 问题概述

`src/ui-renderer.js:364` 在 entSim 模式下把职业字段交给 `buildSisterProfHtml` 渲染为 `locked=true` 的只读文本，但第三个参数 `ro`（readonly 样式字符串）传的是空字符串。导致：

- 渲染出来的是普通 `<input type="text" id="hpProfession">`，没有 `readonly` 或 `disabled` 属性；
- 第 904–910 行的 `change` 监听仍会绑定到该 input，玩家编辑后失焦会触发 `saveGame()`，把修改后的职业写进 `GS.heroineProfile.profession`；
- 职业"锁定"只是视觉上的固定值，并非真正不可编辑。

## 修复目标

entSim setup 的职业字段应和同一界面中"公开身份"的禁用样式一致，玩家无法编辑，也不触发保存。

## 核心修复点

- 修改 `src/ui-renderer.js:364` 的 `buildSisterProfHtml` 调用，entSim 模式下传入 `readonly disabled style="background:#f5f5f5;color:#888;cursor:not-allowed"` 样式字符串，与第 397 行的 `ro` 变量保持一致。
- 修改后 disabled input 不会触发 `change` 事件，`hp.profession` 不会被玩家覆盖。
- 运行构建验证确保无语法错误。

## 涉及文件

- `src/ui-renderer.js` [MODIFY]

## 技术栈

- 语言：JavaScript（ES Modules），Node.js 18+
- 构建：Vite
- 状态：localStorage + GS 全局状态

## 实现策略

1. **修复职业锁定样式**：将 entSim 模式下 `buildSisterProfHtml` 的 `ro` 参数从空字符串改为包含 `readonly disabled` 和灰色锁定样式的字符串，使 input 真正不可编辑。
2. **保持其他逻辑不变**：不修改 `buildSisterProfHtml` 函数本身，因为其他调用方（如 `GS.profileLocked` 的只读视图）已经通过 `ro` 参数正确传入样式；仅修正 entSim Step2 分支中遗漏的 `ro` 参数。
3. **构建验证**：运行 `node ./node_modules/vite/bin/vite.js build`（绕过 Windows PowerShell 的 npm.ps1 执行策略限制），确认无语法或打包错误。

## 注意事项

- 参考样式来自同文件第 397 行：`readonly disabled style="background:#f5f5f5;color:#888;cursor:not-allowed"`。
- entSim 模式下 `hp.profession` 已在第 332 行强制为 `'女团爱豆'`，修复后展示与状态一致。