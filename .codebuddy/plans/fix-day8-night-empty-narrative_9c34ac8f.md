---
name: fix-day8-night-empty-narrative
overview: 修复 Day8 傍晚进入深夜时报"剧情内容为空"的错误。根因是 currentDatingPartner 在约会日当天跨 phase 不清理，导致 phase 2/3 仍注入"单独约会中、不得出现其他成员"约束，与深夜"描写成员互动 + smsDrafts"规则冲突，AI 困惑输出空内容。通过在 prompts.js 限制约会约束仅 phase 0-1 注入、option-engine.js 约会场景分支增加 phase 限制来消除冲突。
todos:
  - id: fix-prompts-dating-constraint
    content: 修改 prompts.js 约会约束注入：phase 0-1 保留完整约束，phase 2+ 改为轻量上下文
    status: completed
  - id: fix-option-engine-phase-order
    content: 修改 option-engine.js：深夜检查提前到约会分支前，约会分支条件收窄为 phase 1（Day 10 为 phase 0）
    status: completed
    dependencies:
      - fix-prompts-dating-constraint
---

## 用户需求

Day 8 傍晚进入深夜时，AI 剧情生成报错：`[format] 剧情内容为空——AI 可能返回了无效 JSON 或内容缺失`。需要修复此 bug，使约会日的傍晚/深夜能正常生成剧情。

## 根因分析

1. Day 8 是约会配对日，phase 0 骰子配对设定 `GS.currentDatingPartner`，phase 1 约会延续，phase 2 傍晚回小屋，phase 3 深夜
2. `resetPhaseState()` 在 phase 切换时不清理 `currentDatingPartner`（仅跨天时 `resetDayState()` 清理），导致 phase 2/3 仍命中 prompts.js:352 的约会约束注入
3. phase 3 深夜同时注入两条矛盾指令："不得出现其他成员"（约会约束）vs "描写深夜氛围和成员互动"（深夜规则），AI 困惑输出空内容
4. option-engine.js 中约会场景分支 `phase >= 1` 在 phase 3 命中，拦截了本应执行的 `phase === 3 return []` 深夜无选项逻辑

## 修复范围

- `src/prompts.js`：约会约束仅在 phase 0-1（约会进行中）注入，phase 2+ 改为轻量上下文
- `src/skeleton/option-engine.js`：深夜检查提前到约会分支之前，约会分支限制为 phase 1（Day 10 为 phase 0）

## 技术栈

- Vanilla JS (ES Modules), Vite 5.4
- 遵循项目约定：`var` 声明、`+` 字符串拼接、最小改动

## 实现方案

### 修改 1：`src/prompts.js`（第 351-360 行，约会约束注入块）

**当前问题**：`if (GS.currentDatingPartner)` 无条件注入"单独约会中，不得出现其他成员"约束，在 phase 2/3 与深夜规则矛盾。

**修复**：按 phaseIndex 分层注入：

- `phaseIndex <= 1`（约会进行中）：保留完整约会约束（地点 + "单独约会中" + 选项限制）
- `phaseIndex >= 2`（已回小屋）：仅注入"今日约会对象XX（约会已结束）"上下文，不加约束

这样 phase 2/3 的 AI 仍知道今天谁约会了（用于剧情连贯），但不再被"不得出现其他成员"限制，深夜可以正常描写全员互动 + smsDrafts。

### 修改 2：`src/skeleton/option-engine.js`（第 6-40 行，generateOptions 函数）

**当前问题**：

- 约会场景分支 `phase >= 1` 在 phase 3 命中，调用 `generateDatingOptions()`（return null）→ 走 AI 生成选项，而深夜应 `return []` 不生成选项
- 约会分支 `phase >= 1` 在 phase 2 也命中，但 phase 2 已回小屋，不应走约会选项路径

**修复**：

1. 将 `if (phase === 3) return [];` 从函数末尾移到约会日上午检查之后（提前拦截深夜，避免被约会分支捕获）
2. 将约会场景条件从 `(phase >= 1 || day === 10)` 收窄为 `(phase === 1 || (day === 10 && phase === 0))`，仅匹配实际约会进行中的 phase

### 不改动项

- `resetPhaseState()` 不清理 `currentDatingPartner`（`generateDayGifts` 等依赖它，清理会影响礼物生成）
- `currentDatingLocation` 状态不清理（UI 横幅显示由 narrative-box.js 控制，不在本次修复范围）
- 兜底选项文案、好感度字段处理逻辑不变

## 性能与可靠性

- 无额外 AI 调用开销（减少矛盾指令反而提升首次成功率，减少重试）
- 约会日 phase 2/3 的 prompt 更短（去掉约束段），token 消耗微降
- 不影响 `generateWithRetry` 的重试机制和兜底逻辑

## 目录结构

```
src/
├── prompts.js                    # [MODIFY] 第 351-360 行：约会约束按 phase 分层注入
└── skeleton/
    └── option-engine.js          # [MODIFY] 第 6-40 行：深夜检查提前 + 约会分支条件收窄
```