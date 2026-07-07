---
name: fix-consequence-length
overview: 仅针对 transfer 模式中「选择选项后的后续剧情（consequence）」篇幅过短的问题，在 system prompt 中新增一条专门针对 consequence 字数的强制规则，同时提高 user message 中 consequence 的字数要求。
todos:
  - id: add-system-prompt-rule
    content: 在 buildSystemPrompt() 规则15之后追加规则16，强制 consequence 字数 1000-1500
    status: completed
  - id: increase-user-msg-count
    content: 在 buildUserMessage() 中将 consequence 字数从 800-1000 改为 1000-1500
    status: completed
---

仅修复换乘恋爱模式（transfer）中选项后续剧情（consequence）太短的问题。

当前 phase（时段剧情）长度已满足要求，不需要改动。

需要修改两处：

1. system prompt 的全局写作规则末尾追加规则16，专门对 consequence 做字数强制（1000-1500字）
2. user message 中 consequence 分支的字数要求从 "800-1000字" 提升到 "1000-1500字"

## 技术方案

### 修改目标

文件：`d:\SEVENTEEN\src\prompts.js`

### 修改一：system prompt 追加规则16

位置：第 209 行（规则15末尾）之后，第 211 行（`## SYSTEM ## 好感度行为参考`）之前

在第 209 行的 `+` 之后插入新规则：

```
'16. [长度强制] 选项后续剧情（consequence）正文必须达到 1000-1500 字（约等于 1000-1500 个汉字）。这是硬性要求，禁止输出过短段落。如果内容偏短，必须扩展环境描写、对话、心理活动和肢体细节，直到满足字数。\\n\\n' +
```

注意：第 210 行为空行，是新旧规则之间的分隔，插入后保持格式一致。

### 修改二：user message consequence 字数提升

位置：第 663 行

修改前：

```
'请生成后续剧情（800-1000字 JSON），必须包含至少1段 narrative + 1段 interview + 1段 memberInterview + observers 数组 + options 数组（3个选项，每个选项含 affName/affDelta/affReason）。\\n' +
```

修改后：

```
'请生成后续剧情（1000-1500字 JSON），必须包含至少1段 narrative + 1段 interview + 1段 memberInterview + observers 数组 + options 数组（3个选项，每个选项含 affName/affDelta/affReason）。\\n' +
```

### 设计决策

1. **双层约束**：system prompt 的全局写作规则对 AI 约束力最强（模型视其为"不可违反的规则"），user message 中的字数要求作为第二层保障，双重叠加效果更好。
2. **只改 consequence**：不碰 phase/freeAction/stay/sms/finalResult，缩小影响面。
3. **1000-1500字**：原 800-1000 太低，JSON 结构开销就占了 200-300 字；1000-1500 是合理区间，与 AI 的 maxTokens 匹配。
4. **不调整 maxTokens**：满足用户要求，单靠 prompt 优化。

### 风险控制

- 不影响 1v1 模式（transfer mode 和 oneHeart 的 prompt 完全独立）
- 不影响其他场景类型（phase/freeAction/stay 的字数指令不变）
- 不改动现有规则的编号或内容，仅在末尾追加