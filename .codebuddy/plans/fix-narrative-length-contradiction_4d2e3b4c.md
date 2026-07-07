---
name: fix-narrative-length-contradiction
overview: 修复 prompts.js 中 User Message 字数指令与 System Prompt 规则 12 的矛盾，将所有场景类型的字数要求统一为一致的值
todos:
  - id: fix-phase-word-count
    content: 修改 prompts.js:720 — phase 字数指令 `~800字` 改为 `1500-2000字`
    status: completed
  - id: fix-consequence-word-count
    content: 修改 prompts.js:663 — consequence 字数指令 `~500字` 改为 `800-1000字`
    status: completed
    dependencies:
      - fix-phase-word-count
  - id: fix-freeaction-word-count
    content: 修改 prompts.js:670 — freeAction 字数指令 `~800-1200字` 改为 `1200-1800字`
    status: completed
    dependencies:
      - fix-consequence-word-count
  - id: fix-stay-word-count
    content: 修改 prompts.js:684 — stay 字数指令 `~800字` 改为 `1000-1500字`
    status: completed
    dependencies:
      - fix-freeaction-word-count
---

## 要求

修复 transfer 模式中每段剧情输出过短（~300字）的问题。

## 原因

`src/prompts.js` 中 User Message 的字数指令（`~800字`）与 System Prompt 规则 12（`1500-2000字`）自相矛盾，AI 优先遵循 User Message 的较短指令。

## 修复范围

统一所有场景的 User Message 字数指令，使其与 System Prompt 规则 12 一致。

## 技术方案

### 实现思路

修改 `src/prompts.js` 中 `buildUserMessage` 函数的 4 处字数指令，将 User Message 中的字数要求提升至与 System Prompt 规则 12 匹配。

### 修改清单

| 行号 | 场景类型 | 当前值 | 改为 |
| --- | --- | --- | --- |
| 720 | phase（普通时段剧情） | `~800字` | `1500-2000字` |
| 663 | consequence（选项后续） | `~500字` | `800-1000字` |
| 670 | freeAction（自由扩写） | `~800-1200字` | `1200-1800字` |
| 684 | stay（继续今天） | `~800字` | `1000-1500字` |


### 设计理由

- **phase（主线剧情）**：直接与 system prompt 规则 12 的 `1500-2000字` 对齐，消除矛盾
- **consequence（选项后续）**：改为 `800-1000字`，比 phase 短但比之前长，因为选项后续是紧跟主剧情的延伸段落，过长会显得拖沓
- **freeAction（自由扩写）**：改为 `1200-1800字`，因为自由输入需要充分扩写玩家输入的梗概
- **stay（继续今天）**：改为 `1000-1500字`，作为当日额外延伸剧情，长度介于 phase 和 consequence 之间

### 注意事项

- 不改动 System Prompt 规则 12（`1500-2000字`），因为这是正确的目标长度
- 不改动 `sms`（不超过50字）、`finalResult`（~1500字）、`generateOptions` 等不冲突的场景
- 不改动 `TOKEN_CONFIG`，8000 tokens 足够支持 2000 字中文输出
- 不改动其他文件，最小化影响范围