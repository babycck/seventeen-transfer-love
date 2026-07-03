---
name: 1v1-prompt-common-sense
overview: 系统修复1v1模式prompt中的反常识逻辑漏洞：同空间用群聊沟通、物品凭空出现、人物知识越界、时间跳跃、身体位置混乱等问题。集中在prompts.js单文件修改。
todos:
  - id: system-rules
    content: 在buildOneHeartSystemPrompt的[RULE]写作规则中新增5条反常识约束：同空间优先当面沟通、物品连续性、人物知识隔离、身体位置连贯、群聊消息可见性
    status: pending
  - id: phase-branch
    content: 修复buildOneHeartUserMessage('phase')分支：待兑现约定注入加不要立刻兑现约束
    status: pending
    dependencies:
      - system-rules
  - id: moment-diary-branch
    content: 修复moment分支加时间线一致性约束、diary分支加只能写已发生的事约束
    status: pending
    dependencies:
      - system-rules
  - id: build-verify
    content: 构建验证并提交推送所有修改
    status: pending
    dependencies:
      - system-rules
      - phase-branch
      - moment-diary-branch
---

## 用户需求

1v1模式剧情频繁出现反常识逻辑错误。用户报告的核心案例：车内同乘时，崔瀚率（女主哥哥）在后座，却通过群聊@女主让她带耳机——明明面对面却用手机沟通，违背基本生活常识。

用户选择系统排查1v1 prompt中所有类似反常识漏洞。

## 产品概述

针对1v1模式AI剧情生成的prompt规则层进行系统性补强，消除7类反常识逻辑漏洞，让AI生成的剧情符合正常人的行为逻辑和生活常识。

## 核心修复项

1. **同空间优先当面沟通**：人物在同一物理空间时禁止用手机/群聊沟通，群聊只适用于不在一起时
2. **物品连续性**：剧情中出现的物品必须在之前出现过或自然存在于当前场景，禁止凭空出现
3. **人物知识隔离**：角色只能知道自已视角范围内的事，禁止"读心"或知道不该知道的私密信息
4. **待兑现约定不要立刻实现**：约定是"下周聚餐"就不能立刻跳到聚餐当天
5. **身体位置连贯**：人物肢体位置和动作必须与上一段衔接，不可矛盾
6. **朋友圈时间线一致**：朋友圈内容必须与近期剧情时间线吻合
7. **日记只写已发生的事**：日记不能编造尚未发生的剧情

## Tech Stack

- **Runtime**: JavaScript (ES Modules), Node.js 18+
- **Build**: Vite 5.4
- **Framework**: Vanilla JS
- **修改文件**: 仅 `src/prompts.js` 一个文件

## Implementation Approach

### 策略

全部修改集中在 `src/prompts.js` 一个文件，分三层注入：

1. **System Prompt 规则层**（`buildOneHeartSystemPrompt` 函数的 `[RULE]` 写作规则）——新增5条通用反常识约束，对所有场景生效
2. **Phase 生成分支**（`buildOneHeartUserMessage('phase')`）——修复待兑现约定注入指令
3. **Moment/Diary 分支**——各加1句时间线一致性约束

### 关键决策

- **不引入新状态字段**：所有修复都是prompt层面的指令约束，不改动 state.js / game-engine.js，blast radius 最小
- **规则合并而非散落**：漏洞1/2/3/5/7都是通用行为准则，统一写入System Prompt的`[RULE]`列表（当前1-13条，新增14-18条）；漏洞4/6是特定分支问题，在对应注入点修复
- **遵守现有代码风格**：使用 `var` 而非 `let/const`，字符串用 `+` 拼接，不使用模板字符串

### 精确修改位置

| 漏洞 | 修改位置 | 修改方式 |
| --- | --- | --- |
| 漏洞1: 同空间群聊 | 第936行规则13之后 | 新增规则14 |
| 漏洞2: 物品凭空 | 规则14之后 | 新增规则15 |
| 漏洞3: 知识越界 | 规则15之后 | 新增规则16 |
| 漏洞5: 身体位置 | 规则16之后 | 新增规则17（补充规则13） |
| 漏洞7: 群聊可见性 | 规则17之后 | 新增规则18 |
| 漏洞4: 约定立刻兑现 | 第1112行 | 修改待兑现约定指令 |
| 漏洞6: 朋友圈时间线 | 第1214行之后 | 加1句约束 |
| 漏洞6: 日记编造 | 第1236行之后 | 加1句约束 |


## Implementation Notes

- **性能**：新增约300字prompt指令，对token消耗影响可忽略（<2%）
- **向后兼容**：纯prompt修改，不影响存档结构、不触发migrateSave
- **不影响换乘恋爱模式**：所有修改仅在 `buildOneHeartSystemPrompt` 和 `buildOneHeartUserMessage` 的1v1分支中
- **构建验证**：修改后运行 `vite build` 确认无语法错误

## Architecture Design

修改链路极简，单文件单函数层：

```
buildOneHeartSystemPrompt() [RULE] 写作规则
  ├── 规则14: 同空间优先当面沟通（漏洞1）
  ├── 规则15: 物品连续性（漏洞2）
  ├── 规则16: 人物知识隔离（漏洞3）
  ├── 规则17: 身体位置连贯（漏洞5，补充规则13）
  └── 规则18: 群聊消息可见性（漏洞7）

buildOneHeartUserMessage('phase')
  └── 第1112行: 待兑现约定加"不要立刻兑现"（漏洞4）

buildOneHeartUserMessage('moment')
  └── 第1214行后: 朋友圈时间线约束（漏洞6a）

buildOneHeartUserMessage('diary')
  └── 第1236行后: 日记只写已发生的事（漏洞6b）
```

## Directory Structure

```
src/
└── prompts.js  [MODIFY] 唯一修改文件
    ├── buildOneHeartSystemPrompt(): [RULE]新增5条规则（规则14-18）
    ├── buildOneHeartUserMessage('phase'): 待兑现约定注入修改
    ├── buildOneHeartUserMessage('moment'): 新增时间线约束
    └── buildOneHeartUserMessage('diary'): 新增"只写已发生的事"约束
```