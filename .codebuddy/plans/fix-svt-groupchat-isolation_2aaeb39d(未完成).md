---
name: fix-svt-groupchat-isolation
overview: SEVENTEEN 内部群聊隔离 + 种子事件挂错人 + 日记摘要去重 + 秘密列表去重 + 女主日记prompt强化
todos:
  - id: rewrite-groupchat-rule
    content: 重写 prompts.js 第 43 行群聊规则：SEVENTEEN 内部群 13 人专属，女主不在其中，枚举 3 种合法获知路径及禁区
    status: completed
  - id: replace-data-event-660
    content: 替换 data.js 第 660 行群聊事件为哥哥展示手机场景
    status: completed
  - id: replace-data-event-661
    content: 替换 data.js 第 661 行群聊事件为休息区偶遇场景
    status: completed
  - id: replace-brother-event
    content: 替换 brother.js 第 23 行男主主动事件为通过哥哥传话
    status: completed
  - id: fix-seed-event
    content: 修复 engine.js ensureSeedEvent：prompt 注入男主名字约束 + 代码层校验情敌名
    status: completed
  - id: fix-secret-dedup
    content: 修复 engine.js applySecretEffect：用前 8 汉字模糊匹配代替严格 indexOf 去重
    status: completed
  - id: verify-consistency
    content: 全局搜索确认无遗漏的群聊违规引用
    status: completed
    dependencies:
      - rewrite-groupchat-rule
      - replace-data-event-660
      - replace-data-event-661
      - replace-brother-event
---

## 产品概述

修复娱乐圈模拟器中 6 项逻辑一致性问题，涵盖群聊隔离、种子事件归属、秘密去重。

## 核心功能

### 群聊隔离（4 项）

- SEVENTEEN 内部工作群改为 13 人专属，女主不在其中
- 女主获知群内容唯一合法路径：哥哥主动展示、某成员当面转述、临时协作群
- 替换事件池中 2 条「女主在群里互动」的事件
- 替换男主主动互动池中 1 条「群里 @ 你」的事件

### 种子事件防挂错（1 项）

- ensureSeedEvent() 生成的种子事件描述必须指向男主而非情敌
- 增加代码层校验：seedEvent 文本必须包含男主名字

### 秘密去重（1 项）

- applySecretEffect() 改用模糊匹配代替严格 indexOf，避免同一秘密因措辞不同而重复存储

## 技术方案

### 修改范围

| # | 文件 | 行号 | 改动内容 |
| --- | --- | --- | --- |
| 1 | `ent-sim/prompts.js` | 43 | 群聊规则：女主不在 SEVENTEEN 内部群 |
| 2 | `ent-sim/data.js` | 660 | 替换群聊事件 → 哥哥展示场景 |
| 3 | `ent-sim/data.js` | 661 | 替换群聊事件 → 休息区偶遇场景 |
| 4 | `ent-sim/brother.js` | 23 | 替换群里 @ 你 → 通过哥哥传话 |
| 5 | `ent-sim/engine.js` | 332-350 | ensureSeedEvent 注入男主名字防挂错 |
| 6 | `ent-sim/engine.js` | 223-225 | applySecretEffect 模糊匹配去重 |


### 实现细节

**#1 — prompts.js:43 群聊规则**

旧代码：

```js
sys += '(2) 「SEVENTEEN工作群」—— SEVENTEEN 13人+你被哥哥拉进去的…';
```

新代码改为明确的「你不在其中」+ 合法获知路径枚举：

- 哥哥主动亮手机屏幕
- 某位 SVT 成员当面转述
- 被哥哥拉入临时协作群（任务后解散）
- 禁止：读群消息、在群里回复/发消息/点赞、被 @

附带更新第 45 行的结尾说明（禁止笼统说「在群里」→ 改为引导至唯一合法入群「女团姐妹群」）。

**#2 — data.js:660 群聊事件**

旧：`{ vibe: '群聊', text: '你在 SEVENTEEN 工作群发了个表情包…' }`

新：`{ vibe: '哥哥展示', text: '哥哥把手机伸到你面前："你看{{name}}在群里发的表情包，太搞笑了"…' }`

**#3 — data.js:661 群聊事件**

旧：`{ vibe: '群聊', text: '{{name}}在 SEVENTEEN 工作群里分享了一首新歌推荐，你点赞后他私聊你…' }`

新：`{ vibe: '休息区偶遇', text: '你在休息区戴着耳机听歌，{{name}}路过时停了一下说"这首歌我也喜欢"…' }`

**#4 — brother.js:23 男主主动事件**

旧：`{ minAff: 0, text: '男主在 SEVENTEEN 工作群里发了条无关紧要的消息，却特意 @ 了你一下…' }`

新：`{ minAff: 0, text: '男主通过你哥哥给你发了条消息："明天打歌加油"——明明可以直接私聊的，却偏要绕一圈…' }`

**#5 — engine.js:342 seedEvent prompt 防挂错**

在 `ensureSeedEvent()` 的 AI prompt 中增加约束：`prompt` 字符串末尾追加 `（注意：男主就是「' + mlName + '」，不要写成其他任何人——尤其不要写成李知勋/权顺荣等其他 SEVENTEEN 成员。）`。同时 `fallback` 已正确使用 `mlName`，无需修改。

此外增加代码层校验：生成后检查 `txt` 是否包含情敌名（`E.npcNetwork.nodes['npc_suitor'].name`），若包含且不含 `mlName`，则丢弃直接使用 `fallback`。

**#6 — engine.js:223-225 secretEffect 模糊去重**

旧代码用严格 `indexOf`，AI 每次措辞不同无法命中：

```js
if (s.item && E.secret.items.indexOf(s.item) < 0) E.secret.items.push(s.item);
```

新代码：将 `s.item` 前 8 个汉字与已有 secret 的前 8 个汉字比较，匹配任意一条即判断为重复：

```js
if (s.item) {
  var dup = false;
  var key = (s.item.match(/[\u4e00-\u9fa5]{2,}/g) || []).slice(0, 4).join('');
  for (var i = 0; i < E.secret.items.length; i++) {
    var existKey = ((E.secret.items[i] || '').match(/[\u4e00-\u9fa5]{2,}/g) || []).slice(0, 4).join('');
    if (key && existKey && key === existKey) { dup = true; break; }
  }
  if (!dup) E.secret.items.push(s.item);
}
```

### 不改动

- `data.js:657` 哥哥在群里喊人搬器材 —— 哥哥在自己群里发言合法，不涉及女主读群消息
- `prompts.js:37` 团内竞争者规则中 `npcEncounter.intimacyDelta` 的「0=仅偶遇/群聊」措辞 —— 仅影响数据字段语义，不直接生成女主在群内发言
- `data.js:657` 中 `vibe: '哥哥牵线'` 的群聊引用同样合法

### 架构约束

- 不涉及 UI / state 字段 / 新组件
- `ensureSeedEvent` 和 `applySecretEffect` 改动量极小（各一个条件分支）
- 保持 `var` 风格，与现有代码一致