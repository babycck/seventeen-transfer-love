---
name: fix-seventeen-seniority
overview: 修复 SEVENTEEN 团内辈分错误——年长成员不应叫年幼成员"哥"。在 entSim 和 1v1 模式系统 prompt 中增加显式称呼对照表，并修正硬编码的称呼规则。
todos:
  - id: fix-ent-sim-address
    content: 修改 ent-sim/prompts.js：去掉硬编码"XX哥"，注入 SEVENTEEN 13 人辈分对照表 + 称呼规则 + 常见错误示例
    status: completed
  - id: fix-1v1-address
    content: 强化 prompts.js 团内相处规则：添加成员年龄对照表、明确年长禁称年幼为哥的禁止项（带具体错误示例）
    status: completed
  - id: verify-data
    content: 检查 data.js 中 MEMBERS 数组 birthYear 字段完整性，确保 prompt 可从数据源生成准确的年龄关系
    status: completed
  - id: push
    content: lint 检查 + push
    status: completed
    dependencies:
      - fix-ent-sim-address
      - fix-1v1-address
      - verify-data
---

## 用户需求

修复 SEVENTEEN 团内辈分混乱的 AI 生成错误：年长的成员（如1995年生的 S.Coups）错误地称呼年幼的成员（如1999年生的 Dino）为"哥"（如"灿哥"），这在韩团文化中是完全颠倒的。

## 核心修复

在 entSim 和 1v1 两个模式的系统 prompt 中注入 SEVENTEEN 13 人年龄辈分对照表 + 强制称呼规则 + 常见错误示例，让 AI 明确理解：birthYear 数值越小 = 越年长，年幼者可对年长者称"哥"，年长者严禁对年幼者称"哥"。

## 根因

1. `ent-sim/prompts.js:44` 硬编码"叫男主「XX哥」"，缺少 13 人间称呼规则
2. `prompts.js:1240-1243` "团内相处规则"仅笼统说"对年长者叫哥"，无成员级对照表
3. AI 经常将较大的 birthYear 数字（如1999）误解为"年纪更大"

## 技术方案

### 实现方式

纯 prompt 注入修复——在系统 prompt 中追加一段 SEVENTEEN 团内辈分对照表与强制称呼规则。不新建数据结构，不修改 UI，不新增 API 调用。

### 修改范围（3 个文件）

#### 1. `src/ent-sim/prompts.js` — buildEntSimSystemPrompt()

- 修改第 44 行：去掉硬编码"叫男主「XX哥」"，改为"按 SEVENTEEN 年龄辈分规则称呼男主，参考【团内辈分对照表】"
- 在【男主设定】之后新增【团内辈分对照表】段落：
- 列出 13 人 birthYear 层级（1995 → 1999）
- 明确规则：年幼→年长用"XX哥" / 年长→年幼直呼名字 / 同年互称名字
- 附带常见错误示例（如"绝对禁止：S.Coups对Dino称'灿哥'"）

#### 2. `src/prompts.js` — 1v1 模式 prompt

- 在 `prompts.js:1240` "团内相处规则"段落强化：
- 将"叫'哥/형'（对年长者）"改为带成员对照的明确表述
- 追加"禁止项"：年长者/同龄对年幼者称"哥"（具体举例：胜澈叫灿为"灿哥"是严重辈分错误）
- 补充 D3 年龄辈分逻辑段落的清晰度，加入成员间互相称呼的约束

#### 3. `src/data.js` — 检查 SEVENTEEN 年龄映射

- 确认 `MEMBERS` 数组中每个成员的 `birthYear` 字段完整（1995-1999）
- 如 `buildEntSimSystemPrompt()` 需要在 prompt 中动态列出队友年龄关系，从 `MEMBERS` 读取

### 架构不变

修改完全局限在 prompt 文本生成层，不影响游戏逻辑、状态管理或 UI 渲染。