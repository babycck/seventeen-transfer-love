---
name: fix-group-chat-disambiguation
overview: 修复 entSim 中两个群聊（女团6人内部群 vs SEVENTEEN工作群）命名模糊导致 AI 串台的问题，统一命名并建立清晰的群聊边界规则。
todos:
  - id: fix-gc-prompt
    content: ent-sim/prompts.js system prompt 第39行后新增群聊体系规则段，明确定义两个群聊及其成员隔离规则
    status: pending
  - id: fix-gc-data-events
    content: ent-sim/data.js 5处更名：GIRLGROUP_EVENTS 中3处「群聊」改为「女团群/女团姐妹群」，SVT_TEAMMATE_EVENT_POOL 中2处「群聊/群里」改为「SEVENTEEN 工作群」
    status: pending
  - id: fix-gc-brother
    content: ent-sim/brother.js 第23行 MALE_LEAD_INITIATIVE_POOL 中「在群里」改为「在 SEVENTEEN 工作群里」
    status: pending
---

## 用户问题

游戏里出现群聊"串台"：女团队友在 SEVENTEEN 群看到消息，或哥哥在女团群里说话。因为两个群聊的命名模糊，AI 分不清。

## 根因

系统有 **两个独立的群聊**，但代码中命名混乱：

- 女团6人内部群（女主+5位姐姐）：代码中只说"群聊"/"群里"，从未命名
- SEVENTEEN工作群（13人+女主被拉进去）：代码中有4种叫法混用

AI 看到"群聊"一词时无法判断是哪个群，导致随机串台。

## 修复内容

在3个文件中明确命名两个群聊，统一称呼，共7处改动。

## 技术方案

### 修改文件1：ent-sim/prompts.js

System prompt 第39行后（SVT队友段之后、恋爱阶段之前）新增群聊体系规则段：

```
【群聊体系·强制】存在两个独立的群聊：
(1)「女团姐妹群」— 你+5位姐姐，6人。发日常/八卦/练习安排/互相打气。
(2)「SEVENTEEN工作群」— SEVENTEEN 13人+你被哥哥拉进去的。发行程/外卖/调侃/团内通知。
两个群的成员不重叠（除你以外），消息绝不互通。
女团队友不可能在 SEVENTEEN 群里发消息，SEVENTEEN 成员不可能在女团群里发消息。
如果在 SEVENTEEN 群里发生的事，用「在 SEVENTEEN 工作群里」描述；在女团群里的用「在女团姐妹群里」描述。禁止笼统说「在群里」。
```

### 修改文件2：ent-sim/data.js（5处更名）

| 行号 | 位置 | 原文 | 改为 |
| --- | --- | --- | --- |
| 166 | GIRLGROUP_EVENTS 练习室编舞争议 | `在群聊里发了` | `在女团群里发了` |
| 221 | GIRLGROUP_EVENTS 恶评风暴 | `在群聊里发` | `在女团姐妹群里发` |
| 241 | GIRLGROUP_EVENTS 便利店垃圾食品 | `群聊提醒` | `女团群提醒` |
| 657 | SVT_TEAMMATE_EVENT_POOL 哥哥牵线 | `在群聊里说` | `在 SEVENTEEN 工作群里说` |
| 661 | SVT_TEAMMATE_EVENT_POOL 群聊分享 | `在群里分享` | `在 SEVENTEEN 工作群里分享` |


### 修改文件3：ent-sim/brother.js（1处更名）

| 行号 | 位置 | 原文 | 改为 |
| --- | --- | --- | --- |
| 23 | MALE_LEAD_INITIATIVE_POOL | `在群里发了条` | `在 SEVENTEEN 工作群里发了条` |


### 不修改项

- prompts.js 第1298行的通用规则 `[群聊消息可见性]` 不修改，它属于1v1/transfer模式的规则，entSim有自己的群聊体系规则，互不冲突。
- SVT_TEAMMATE_EVENT_POOL 第660行 `"你在 SEVENTEEN 工作群发了个表情包"` 已经命名正确，不修改。