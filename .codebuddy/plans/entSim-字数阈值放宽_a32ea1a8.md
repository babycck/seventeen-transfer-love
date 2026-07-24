---
name: entSim-字数阈值放宽
overview: 修复 entSim 剧情因字数硬校验过严（小于1000字即判定错误强制重试）而陷入重试循环。AI 自然产出约 400-500 字剧情，质量可接受，应降为警告放行，仅对近乎空内容硬拦截。同步下调 prompt 字数目标贴近 AI 实际能力。
todos:
  - id: relax-validator-threshold
    content: 修改 validator.js：validateEntSimNarrative 字数阈值 error 从小于1000降到小于300，warning 区间调整为 300-700，上限大于2000，文案更新为 800-1500 字
    status: completed
  - id: lower-prompt-target
    content: 修改 prompts.js：buildEntSimSystemPrompt 写作风格字数目标从 1500-2000 字下调到 800-1500 字
    status: completed
  - id: verify-build
    content: 运行 Vite 构建确认无语法错误
    status: completed
    dependencies:
      - relax-validator-threshold
      - lower-prompt-target
---

## 问题概述

fanReaction 污染修复后，entSim 仍卡在剧情生成。Console 日志显示 AI 返回正常 JSON 剧情（约 431 字 / 369 字，内容质量良好：练习室初遇、充电宝细节、心理描写），但 validator 判「正文过短」error 强制重试，AI 重试仍只写约 370 字，陷入循环。

## 根因

校验阈值 `<1000 字 = error` 脱离 DeepSeek 在 entSim JSON 格式下的实际产出能力（稳定 400-500 字），把质量可接受的剧情判成硬错误。

## 修改目标

- validator 错误阈值从 `<1000` 降到 `<300`（仅拦截近乎空内容），400-500 字剧情降为 warning 放行不阻塞
- prompt 字数目标从「1500-2000 字」下调到「800-1500 字」贴近 AI 实际能力
- correction 文案同步更新为新目标
- 仍保留对空内容的硬拦截（`<300 error`），防止 AI 返回无效内容

## 技术方案

### 修改策略（2 处文件，最小改动）

**文件 1：`d:/SEVENTEEN/src/validator.js` 第 145-152 行**

`validateEntSimNarrative` 字数校验阈值调整：

| 条件 | 当前 | 修改后 | 说明 |
| --- | --- | --- | --- |
| `< 1000` | error | `< 300` → error | 仅拦截近乎空内容 |
| `< 1500` | warning | `300-700` → warning | 400-500 字剧情放行为 warning |
| `> 2600` | warning | `> 2000` → warning | 上限同步下调 |


correction 文案中「1500-2000 字」改为「800-1500 字」。

**文件 2：`d:/SEVENTEEN/src/ent-sim/prompts.js` 第 38 行**

写作风格描述中「每段正文剧情 1500-2000 字」改为「每段正文剧情 800-1500 字」。

### 向后兼容

- 不改变函数签名、不新增文件、不影响换乘恋爱和 1v1 模式
- 阈值放宽仅影响 entSim 模式的 `validateEntSimNarrative`
- prompt 目标下调不影响其他模式（该行在 `buildEntSimSystemPrompt` 内）

### 验证方式

- Vite 构建通过（静态语法检查）
- entSim 新档开局：AI 返回 400-500 字剧情应降为 warning 放行，不再触发重试循环
- F12 Console 确认无 `[length] error` 阻塞

## 目录结构

```
d:/SEVENTEEN/src/
├── validator.js              # [MODIFY] validateEntSimNarrative 字数阈值放宽：error <300 / warning 300-700 / warning >2000，文案同步更新
└── ent-sim/
    └── prompts.js            # [MODIFY] buildEntSimSystemPrompt 写作风格字数目标 1500-2000 → 800-1500
```