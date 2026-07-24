---
name: 修复 repairJson 截断时误用内层 lastBrace 截取丢内容
overview: repairJson 在处理截断 JSON 时，lastBrace 会找到最后一个内层闭合 }，导致 s 被截断丢失后续内容（narrative 可能也丢）。修复：判断最外层是否闭合，未闭合时不截取，让 bracketStack 补全。
todos:
  - id: fix-regex-fallback
    content: 在 ent-sim/parser.js parseEntSimResponse 增加正则提取兜底，safeParseJson 失败时直接从 rawText 提取 narrative 和 options
    status: pending
  - id: fix-repairjson-depth
    content: 在 parser.js repairJson 的 lastBrace 截取前加深度检查，截断时跳过截取
    status: pending
  - id: fix-maxtokens
    content: 在 engine.js maxTokens 3200→4000
    status: pending
---

## 用户需求

截断 bug 复现：rawText 在 `"buzzDelta"` 处截断，但 `parsed.blocks.length=0`，截断兜底没生效。AI 明明返回了完整 narrative（约600字）和 options，但因为 JSON 被截断在 entSimExtras 内部，导致解析全链路失败，validator 判定"正文过短0字+缺少options"，触发重试覆盖剧情。

## 根因（已确认）

1. `ai-generator.js:55-56` — entSim 模式使用 `parseEntSimResponse` + `validateEntSimNarrative`
2. `parseEntSimResponse`（ent-sim/parser.js:8）— 先试 `safeParseJson` → null 则回退 `parseNarrative` → 也失败则返回空 `{ narrative:'', options:[], extras:{} }`
3. console log `parsed.blocks.length:0` 是误导 — `parseEntSimResponse` 返回 `{ narrative, options, extras }`（无 `blocks` 字段），`parsed.blocks` 永远 undefined → 0
4. 实际错误来自 `validateEntSimNarrative`（validator.js:134-147）：`narrative.length<100` + `options.length===0`
5. `safeParseJson` 的截断兜底仍失败：`repairJson` 的 `lastBrace` 截断在截断 JSON 上行为不正确

## 产品概述

修复 entSim JSON 截断解析：在 `parseEntSimResponse` 增加正则提取兜底（绕过 JSON 解析直接提取 narrative/options），修复 `repairJson` 的 `lastBrace` 截断逻辑，提升 `maxTokens` 降低截断概率。

## 核心功能

- JSON 截断时仍能提取出已完成的 narrative 和 options
- repairJson 不再因 lastBrace 截断丢失内容
- maxTokens 充足减少截断发生

## Tech Stack

- 纯 JavaScript (ES Modules)，复用现有 `parseEntSimResponse` / `safeParseJson` / `repairJson` 架构
- `var` + 字符串拼接代码风格

## 实现方案

### A. parseEntSimResponse 增加正则提取兜底（最关键）

`src/ent-sim/parser.js:8` `parseEntSimResponse` 中，在 `safeParseJson` 失败后、`parseNarrative` 兜底前，增加正则提取：

- 用 `/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/` 提取 narrative 字符串（支持转义字符）
- 用 `/"options"\s*:\s*\[([\s\S]*?)\]/` 提取 options 数组内容，再用 `/"((?:[^"\\]|\\.)*)"/g` 逐个提取选项字符串
- 只要 narrative 长度 >= 20 就返回，options 可以为空（缺失的数值副作用不影响剧情显示）
- extras 设为 `{}`

这完全绕过 JSON 解析，即使 JSON 被截断、引号未转义、括号不匹配，只要 narrative 字段完整就能提取。

### B. repairJson 的 lastBrace 截断加深度检查

`src/parser.js:93-101` `repairJson` 中，截取 `lastBrace` 前先检查最外层 `{` 是否闭合：

- 遍历统计 depth（与 `extractBalancedObject` 相同的字符串感知逻辑）
- 如果 depth 最终不为 0（即 JSON 被截断），跳过 `lastBrace` 截取
- 保留完整 s 交给 bracketStack 补全

### C. maxTokens 3200→4000

`src/ent-sim/engine.js:43` maxTokens 3200→4000，给 600-800 字 narrative + 完整 options + entSimExtras JSON 留更大余量。

## 目录结构

```
src/
├── parser.js                    # [MODIFY] repairJson lastBrace 截断加深度检查
└── ent-sim/
    ├── parser.js                # [MODIFY] parseEntSimResponse 增加正则提取兜底
    └── engine.js                # [MODIFY] maxTokens 3200→4000
```

### 文件详细说明

**src/ent-sim/parser.js** [MODIFY] — 正则提取兜底

- `parseEntSimResponse()` (line 8-23)：在 `safeParseJson` 返回 null 后、`parseNarrative` 兜底前，增加正则提取分支
- 正则1：`/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/` 提取 narrative（支持转义）
- 正则2：`/"options"\s*:\s*\[([\s\S]*?)\]/` 提取 options 数组，再逐个提取字符串
- 提取到 narrative.length >= 20 即返回 `{ narrative, options, extras: {} }`

**src/parser.js** [MODIFY] — repairJson 深度检查

- `repairJson()` (line 97-101)：在 `lastBrace` 截取前，遍历统计最外层 `{` 的 depth
- depth 不为 0（JSON 被截断）时跳过截取，保留完整 s 给 bracketStack

**src/ent-sim/engine.js** [MODIFY] — maxTokens 提升

- line 43：`maxTokens: 3200` → `maxTokens: 4000`

## 性能与可靠性

- 正则提取是 O(n) 单次扫描，无额外开销
- 正则提取只在 JSON 解析全失败后触发，不影响正常路径性能
- maxTokens 4000 足够 800 字中文 narrative + options + extras JSON（约 2000-2500 token）
- 修复后即使截断，narrative 和 options 也能被提取，减少重试覆盖剧情