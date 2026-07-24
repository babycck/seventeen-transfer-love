---
name: entSim-align-1v1-features
overview: 对齐 1v1 模式：朋友圈双人动态+情敌暗斗、聊天好感联动+日限、情敌6阶段系统、秘密信箱、重新生成
todos:
  - id: upgrade-moment-dual
    content: 升级朋友圈为双人JSON模式：重写 generateEntSimMoment 为 momentDual 类型，JSON解析 {mine, his} 双 posts，50%概率附加情敌暗斗彩蛋，存储 photo/type/rivalComment/replyBack 字段
    status: completed
  - id: upgrade-moment-ui
    content: 更新朋友圈弹窗适配双人数据：showEntSimMomentsModal 区分男女主动态，渲染 photo/rivalComment 特殊样式
    status: completed
    dependencies:
      - upgrade-moment-dual
  - id: upgrade-chat-aff
    content: 升级聊天系统：添加 _chatAffCount/_chatAffDay 计数器，每5条+1好感每3次上限，每日20条限制，200字按句截断，JSON容错
    status: completed
  - id: upgrade-rival-system
    content: 升级情敌系统：data.js 新增 RIVAL_STAGES/RIVAL_ACTIONS，brother.js pickRivalAdvance 改用 getRivalStage + pickRivalAction + 去重
    status: completed
  - id: add-secret-letter
    content: 新增秘密信箱：generateEntSimLetter 函数 + letter prompt 分支 + E.letters[] 存储 + showEntSimLetterModal 弹窗 + 底部信箱 tab
    status: completed
  - id: add-regenerate
    content: 新增重新生成：handleEntSimRegenerate 回滚并重新生成 + UI 快捷按钮
    status: completed
  - id: migration-build
    content: migration 兜底 + 构建验证
    status: completed
    dependencies:
      - upgrade-moment-dual
      - upgrade-chat-aff
      - upgrade-rival-system
      - add-secret-letter
      - add-regenerate
---

## 产品概述

将 entSim 模式的朋友圈、聊天、情敌系统、秘密信箱、重新生成 5 个功能对齐 1v1 模式标准实现。

## 核心功能

### 1. 朋友圈对齐1v1（双人动态 + 情敌暗斗）

- 改为 JSON 格式输出 `{mine: {post, reply, replyBack, photo, type, rivalComment}, his: {...}}`
- 同时生成女主动态和男主动态，各含 reply/replyBack 回复链
- 情敌暗斗彩蛋：50%概率让 AI 在评论区附加一句阴阳怪气发言（rivalComment 字段）
- 新增 photo 字段（配图描述）、type 字段（日常/暧昧/吃醋/营业等）
- 朋友圈弹窗适配双人数据结构

### 2. 聊天对齐1v1（好感联动 + 每日限制 + 智能截断）

- 每5条聊天女主角+1好感，每天最多加成3次
- 每日最多20条消息，超限 toast 提示
- 回复超过200字时按句边界截断（。！？）
- 意外返回JSON时智能提取字符串字段
- 使用 `_chatAffCount` / `_chatAffDay` 计数器

### 3. 情敌系统对齐1v1（6阶段17种攻势）

- 新增 `getRivalStage(aff)` 函数：好感0-19阶段1，20-39阶段2，40-59阶段3，60-79阶段4，80-99阶段5，100+阶段6
- 新增 `RIVAL_ACTIONS` 常量：5个活跃阶段各3-4种攻势（偶遇/打招呼/点赞/聊天、送礼物/约饭/独处、频繁联系/暗示/关心、送大礼/制造误会/竞争、刷存在感/回忆/试探退意）
- 新增 `pickRivalAction(stage, triggered)` 去重选择逻辑
- 在 `checkOneHeartEvents` 中接入6阶段系统替代简化NPC事件池

### 4. 秘密信箱（新增 generateLetter 功能）

- 以男主第一人称写200-300字私密信，JSON格式 `{content: "..."}`
- 每7-10回合随机触发一封
- 存储到 `E.letters[]`（含 round、content、timestamp）
- 新增手机壳弹窗展示信件列表

### 5. 重新生成（回滚+重试）

- 新增 `handleEntSimRegenerate` 函数
- 回滚 `GS._entSimCurrent` 到上一段剧情，用相同 choiceText 重新生成
- 快捷指令栏新增「重新生成」按钮

## 技术栈

- JavaScript (ES Modules), Vanilla JS + Vite
- 无新增依赖

## 实现方案

### 朋友圈 - 双人JSON模式

**参考 1v1 generateMoment()**（game-engine.js:3962-4033）：

- 使用 `safeParseJson(raw)` 解析 AI 返回的 `{mine: {...}, his: {...}}` JSON
- 情敌暗斗彩蛋通过追加 userMsg 指令触发
- 存储格式：`{id, name, post, reply, replyBack, photo, type, rivalComment, timestamp, liked}`

**entSim 改动（engine.js）**：

- `generateEntSimMoment` 重写：`runEntSimType('momentDual', ...)` 返回 JSON
- 情敌暗斗条件：`isSisterSettingOn() && rivalNode && Math.random() < 0.5`
- append 两条记录到 `E.moments`

**entSim 改动（prompts.js）**：

- 新增 `momentDual` 分支：要求输出 `{"mine":{...},"his":{...}}` JSON
- 情敌暗斗彩蛋附加到 userMsg

**entSim 改动（ui.js）**：

- `showEntSimMomentsModal` 适配双人数据（`m.name` 区分女主/男主，`m.photo` 渲染图片描述框，`m.rivalComment` 橙色特殊回复）

### 聊天 - 好感联动 + 限制

**参考 1v1 sendChatMessage()**（game-engine.js:3812-3862）：

- `_chatAffCount` 计数器，每5条触发好感+1，`_chatAffDay` 跟踪日期
- `_chatAffCount > 20` 拒收
- 200字按 `。！？` 截断
- JSON误输出容错提取

**entSim 改动（engine.js）**：

- `generateEntSimChat` 升级：加 `_chatAffCount`/`_chatAffDay` 计数逻辑，日限20条，按句截断
- 好感联动使用 `applyEntSimAffection(1)`

### 情敌系统 - 6阶段17攻势

**参考 1v1**（game-engine.js:1330-1406）：

- `getRivalStage(aff)`：6阶段阈值判定
- `RIVAL_ACTIONS`：5阶段各3-4种攻势中文描述
- `pickRivalAction(stage, triggeredActions)`：去重选择

**entSim 改动（data.js）**：

- 新增 `ENT_SIM_RIVAL_STAGES`（6阶段阈值表）
- 新增 `ENT_SIM_RIVAL_ACTIONS`（5 x 3-4 攻势池）

**entSim 改动（brother.js）**：

- `pickRivalAdvance` 改为使用 `getRivalStage` + `RIVAL_ACTIONS` + `pickRivalAction`
- 攻势文本注入到 `GS._entSimPendingEvent` 供剧情消费
- 保留原有 `rival_intimacy` 驱动逻辑（阶段4-5可由情敌亲密度联动）

### 秘密信箱

**参考 1v1 generateLetter()**（game-engine.js:4083-4113）：

- 第一人称私密信 200-300字
- `GS.letters[]` 存储

**entSim 改动（engine.js）**：

- 新增 `generateEntSimLetter()`：`runEntSimType('letter', ...)` JSON内联prompt
- 触发：`goEntSimNextDay` 中每 7-10 回合（`E.cycle.roundTotal % randInt(7,10) === 0`）触发

**entSim 改动（prompts.js）**：

- 新增 `letter` 分支：200-300字第一人称信，基于近期剧情

**entSim 改动（ui.js）**：

- 新增 `showEntSimLetterModal()`：手机壳弹窗，竖排信件列表（带日期和回合标签）
- 底部 tab 栏新增「信箱」tab（`💌`）

### 重新生成

**参考 1v1 handleRegenerate()**（game-engine.js:1465-1520）：

- pop 最新 narrative
- 用相同 choiceText 重新生成

**entSim 改动（engine.js）**：

- 新增 `handleEntSimRegenerate()`：保存 `GS._entSimCurrent` 的 choiceText，调用 `generateEntSimRound('choice', { choiceText })` 重新生成
- 如果当前没有 choiceText，回退到 `continueEntSimMain`

**entSim 改动（ui.js）**：

- 快捷指令栏加 `{q:'regenerate', label:'重新生成'}`
- `onQuick('regenerate')` 调 `handleEntSimRegenerate`

## 目录结构

```
src/
├── state.js                    # [MODIFY] migration 兜底 letters/_chatAffCount/_chatAffDay
├── ent-sim/
│   ├── engine.js               # [MODIFY] 升级 generateEntSimMoment/chat，新增 letter/regenerate
│   ├── prompts.js              # [MODIFY] 新增 momentDual/letter 分支
│   ├── ui.js                   # [MODIFY] 朋友圈双人适配、新增信箱弹窗、重新生成按钮
│   ├── data.js                 # [MODIFY] 新增 RIVAL_STAGES/RIVAL_ACTIONS
│   └── brother.js              # [MODIFY] pickRivalAdvance 升级为6阶段系统
```

## Implementation Notes

- `runEntSimType` 已有 skipVal 判断，新增 `momentDual` 不加（需 JSON 解析），`letter` 加 plainText
- `_chatAffCount` / `_chatAffDay` 在 state migration 兜底为 0
- `E.letters` 在 migration 兜底空数组
- 朋友圈 JSON 输出模式与主线剧情 JSON 共用 `generateWithRetry`，但不走完整 entSim validator
- 重新生成时需清理 `GS._entSimCurrent` 和 `GS._entSimNarrativeBuffer` 中的最后一段