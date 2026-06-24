---
name: fix-advancing-lock-persisted
overview: 修复 _advancingPhase 被持久化到 localStorage 导致刷新后卡死、点击"进入下一时段"被 skip 拦截的问题
todos:
  - id: fix-savegame-strip-locks
    content: 修改 saveGame() 序列化前剥离 _isGenerating 和 _advancingPhase 运行时锁字段
    status: completed
  - id: fix-migrate-reset-lock
    content: migrateSave() 中 _isGenerating=false 后补充 _advancingPhase=false
    status: completed
    dependencies:
      - fix-savegame-strip-locks
---

## 用户需求

用户点击"进入下一时段"按钮时，控制台出现 `[skip btn] already advancing, skip`，且不会生成新剧情，游戏卡死无法推进。

## 根因

`_advancingPhase` 和 `_isGenerating` 是运行时内存锁，但被 `saveGame()` 的 `JSON.stringify(GS)` 持久化到 localStorage。当 `advancePhase()` 执行中（AI 调用慢/失败/用户等不及刷新），`_advancingPhase` 以 `true` 被存入存档。下次 `loadGame()` 读出来仍然是 `true`，导致所有后续点击被 `advancePhase` 的重入检查（第 1070 行）和按钮处理器的 `if (GS._advancingPhase) return`（第 881 行）双重拦截，永久卡死。

`migrateSave()` 第 323 行已重置 `_isGenerating = false`，但漏了 `_advancingPhase`。

## 修复方案

两道防线：

1. **源头拦截**：`saveGame()` 序列化前删除运行时锁字段，防止持久化
2. **兜底修复**：`migrateSave()` 中补上 `GS._advancingPhase = false`，修复已损坏的存档

## 技术栈

- 纯 JavaScript (ES Modules)，无新依赖
- 修改文件：`src/state.js`（唯一修改点）

## 实现方案

### 修改 1：`saveGame()` — 序列化前剥离运行时锁（源头修复）

`state.js:200-207`，在 `JSON.stringify` 之前，从待保存对象中删除 `_isGenerating` 和 `_advancingPhase` 两个运行时锁字段。

当前代码直接 `JSON.stringify(GS)`（或深拷贝后只删 apiKey），改为：无论是否需要删 apiKey，都在 stringify 前剥离运行时锁。

这样即使代码在运行中频繁 `saveGame()`，锁字段也不会被写入 localStorage，彻底杜绝刷新后卡死。

### 修改 2：`migrateSave()` — 补充 `_advancingPhase` 重置（兜底修复）

`state.js:323`，现有 `GS._isGenerating = false;` 后面加一行 `GS._advancingPhase = false;`。

这修复已经存在于 localStorage 中的损坏存档——用户刷新后 `loadGame()` → `migrateSave()` 会把卡住的锁释放。

### 设计理由

- **最小改动**：只改 `state.js` 一个文件两处，不涉及 game-engine.js 或 ui-renderer.js
- **对症下药**：根因是锁被持久化，从源头阻止 + 兜底清理双重保障
- **无副作用**：`_isGenerating` 和 `_advancingPhase` 是纯运行时状态，删除后不影响存档完整性；每次页面加载后它们会自然重新初始化为 `false`/`undefined`
- **代码风格一致**：保持现有 `var` 声明、`delete` 操作符风格

## 目录结构

```
src/
└── state.js  # [MODIFY] saveGame() 剥离运行时锁 + migrateSave() 补充 _advancingPhase 重置
```