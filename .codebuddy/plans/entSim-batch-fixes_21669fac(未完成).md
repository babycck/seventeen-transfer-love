---
name: entSim-batch-fixes
overview: 合并全部待修项：5项存档审查修复 + 删除直播间刷礼物秘密 + prompt加强，共7个任务涉及约10个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：CHAPTERS新增"练习生"(0)，新人期变第1项，startChapter改为0，debutDay跳转条件调整为target>=1
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：initChatChannel增加debutDay门控，练习生阶段过滤"打歌/音银/回归/预录/直拍/一位"等关键词
    status: pending
  - id: fix-rival-name
    content: 修复情敌名字：showBusinessPanel联系人列表改用suitorName()函数获取情敌真实名字
    status: pending
  - id: fix-secret-dedup
    content: 修复秘密去重：applySecretEffect增加核心词辅助指纹，双指纹任一命中即判重
    status: pending
  - id: fix-entSim-flags
    content: 修复开局标记：initEntSimState中为sisterSetting设置_relCharIntroduced和_rivalIntroduced为true
    status: pending
  - id: remove-livestream-gift-secrets
    content: 删除4处直播间刷礼物秘密条目：secret-discovery-events.js、ui-renderer.js、ent-sim/state.js、special-events.js
    status: pending
  - id: strengthen-prompt
    content: 加强prompt约束：prompts.js显式禁止AI生成涉及SEVENTEEN成员直播间的内容，秘密严格限定EXO
    status: pending
    dependencies:
      - remove-livestream-gift-secrets
  - id: validate-all
    content: 全量语法验证：node -c检查所有约10个修改文件，确保无语法错误
    status: pending
    dependencies:
      - fix-chapter-label
      - fix-chat-stage-filter
      - fix-rival-name
      - fix-secret-dedup
      - fix-entSim-flags
      - remove-livestream-gift-secrets
      - strengthen-prompt
---

## 产品概述

对娱乐模拟器进行批量修复，合并两轮审查发现的所有问题，共7个修改任务涉及约10个文件。

## 修复清单

### 修复1：章节标签错位

练习生(debutDay=0, 人气=3)在界面和存档中被标记为"新人期"，手册规定的5阶段表 debutDay=0 应显示"练习生"。原因：练习生职业 startChapter=1 直接映射到 CHAPTERS[0]="新人期"。

### 修复2：聊天内容不分阶段

练习生打开KakaoTalk时，情敌频道和经纪人频道的首条消息出现"今天打歌我看了""明天打歌预录"等已出道场景内容。initChatChannel 无条件取池子前2条，未过滤不适合练习生的消息。

### 修复3：情敌名字不显示

聊天联系人列表中情敌永远显示"情敌"二字，因为 `E.rival` 字段在 entSim 模块从未被赋值。正确的情敌名称存在于 `npcNetwork.nodes['npc_suitor'].name`。

### 修复4：秘密重复生成

entSim.secret.items 中出现6个同一秘密的变体（不同措辞但含义相同），当前去重仅取前4个中文字符作为key，对AI措辞变化不够鲁棒。

### 修复5：entSim开局标记未置位

队友妹妹设定下开局已认识哥哥与情敌，但 `_relCharIntroduced` 和 `_rivalIntroduced` 在 `initEntSimState()` 中未置true，导致后续 prompt 注入"第一次介绍哥哥"的旧逻辑。

### 修复6：删除"直播间刷礼物"秘密

女主秘密池中"在成员直播间刷礼物"类条目容易被AI误判为SEVENTEEN成员直播间而非EXO。删除所有4处相关条目，使秘密严格围绕EXO（金珉锡签售会/周边/直拍/同人文）。

### 修复7：prompt约束加强

在prompt注入中显式禁止AI生成涉及SEVENTEEN成员直播间的秘密，确保所有秘密严格限定在EXO范围内。

## 技术方案

### 修复1：章节标签（data.js + state.js）

**修改文件**：`src/ent-sim/data.js`、`src/ent-sim/state.js`

- data.js：CHAPTERS数组第0项新增"练习生"，原"新人期"变为第1项。练习生职业的 startChapter 从 1 改为 0
- state.js：`checkChapterAdvance()` 中 debutDay 条件改为 `target >= 1`（即出道后才从练习生跳到新人期），而非原来的任意 target 就能跳

### 修复2：聊天阶段过滤（ui.js）

**修改文件**：`src/ent-sim/ui.js` 的 `initChatChannel()` 函数

在初始化频道消息时增加 debutDay 门控：当 `E.career.debutDay <= 0` 时，对消息进行关键词过滤：

- 情敌频道（CHAT_RIVAL）：跳过 msg 包含 "打歌/音银/回归/预录/直拍/一位" 的消息
- 经纪人频道（CHAT_MANAGER）：跳过 msg 包含 "打歌/预录/回归/音源/宣发" 的消息
- 哥哥频道（CHAT_BROTHER）：保留（"月末评价"对练习生合理）

### 修复3：情敌名字（ui.js）

**修改文件**：`src/ent-sim/ui.js` 的 `showBusinessPanel()` 函数第1484行附近

将硬编码的 `(E.rival && E.rival.name) || '情敌'` 替换为调用已有的 `suitorName()` 函数（该函数从 `E.npcNetwork.nodes['npc_suitor'].name` 获取名字）。

### 修复4：秘密去重（engine.js）

**修改文件**：`src/ent-sim/engine.js` 的 `applySecretEffect()` 函数

在原有"前4个中文字符作为key"的基础上去重外，新增"核心词"辅助指纹：提取"EXO/金珉锡/签售/同人文/直拍/周边/小卡/应援"等关键词组合作为第二指纹。双指纹任一命中即判定为重复秘密。

### 修复5：开局标记（state.js）

**修改文件**：`src/ent-sim/state.js` 的 `initEntSimState()` 函数末尾

在 saveGame 之前添加判断：`if (career.sisterSetting)` 时设置 `GS._relCharIntroduced = true` 和 `GS._rivalIntroduced = true`。

### 修复6：删除刷礼物秘密（4个文件）

**修改文件**：

- `src/ent-sim/pools/secret-discovery-events.js`：删除 `secret_live_gift` 条目
- `src/ui-renderer.js`：删除 `_secPool` 中直播间刷礼物条目
- `src/ent-sim/state.js`：删除 `defaultSecrets()` 中直播间刷礼物条目
- `src/ent-sim/pools/special-events.js`：删除 `secret_rival` 条目

每个删除均为移除数组中的单一元素，不影响其他条目的索引和功能。删除后各池子仍有足够条目（每个 >=2 条），randInt 调用不会越界。

### 修复7：prompt约束（prompts.js）

**修改文件**：`src/prompts.js` 第1139行

将描述从"都是EXO追星向的小秘密"加强为：
"所有秘密必须严格限定EXO（金珉锡/签售/周边/直拍/同人文），绝不涉及SEVENTEEN成员、任何男团直播间刷礼物行为、或与EXO无关的追星内容。"

## 验证方案

- 每个修改独立、互不依赖，可分批验证
- 全部修改后用 `node -c` 语法检查所有涉及文件
- 确认删除条目后各池子长度仍满足 randInt 的调用参数范围