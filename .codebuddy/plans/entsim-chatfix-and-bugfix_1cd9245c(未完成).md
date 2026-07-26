---
name: entsim-chatfix-and-bugfix
overview: 修复存档审查发现的 5 个问题：聊天内容不分阶段、情敌名字不显示、章节错位、1v1 开局标志未置、秘密去重缺失。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：练习生 startChapter 改为0，CHAPTERS 新增第0项"练习生"，跨章时正确跳到新人期
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：initChatChannel 增加 debutDay 门控，练习生阶段过滤掉含"打歌/预录/回归"等关键词的消息
    status: pending
  - id: fix-rival-name
    content: 修复情敌名字：联系人列表第1484行改用 suitorName() 函数获取情敌真实名字
    status: pending
  - id: fix-secret-dedup
    content: 修复秘密去重：增加"核心词"辅助指纹（EXO/金珉锡/签售/直播间等），双指纹任一命中即判重
    status: pending
  - id: fix-entSim-flags
    content: 修复开局标记：initEntSimState 中为 sisterSetting 设置 _relCharIntroduced=true 和 _rivalIntroduced=true
    status: pending
  - id: validate-all
    content: 全量语法验证：node -c 检查所有修改文件，确保无语法错误
    status: pending
    dependencies:
      - fix-chapter-label
      - fix-chat-stage-filter
      - fix-rival-name
      - fix-secret-dedup
      - fix-entSim-flags
---

## 产品概述

修复娱乐模拟器存档审查中发现的5个问题，确保练习生阶段UI显示正确、聊天内容与阶段匹配、情敌名字可见、秘密不重复、开局标记正确。

## 核心修复项

### 修复1：章节标签错位

练习生(debutDay=0, 人气=3)在界面和存档中被标记为"新人期"，而手册规定的5阶段表中 debutDay=0 应显示"练习生"。根源是练习生职业的 startChapter=1 直接映射到 CHAPTERS[0]="新人期"。

### 修复2：聊天内容不分阶段

练习生打开KakaoTalk时，情敌频道和经纪人频道的首条消息出现"今天打歌我看了""明天打歌预录"等已出道场景内容。initChatChannel 无条件取池子前2条，未过滤不适合练习生的消息。

### 修复3：情敌名字不显示

聊天联系人列表中情敌永远显示"情敌"二字，因为 E.rival 字段在entSim模块从未被赋值。正确的情敌名称存在于 npcNetwork.nodes['npc_suitor'].name。

### 修复4：秘密重复生成

entSim.secret.items 中出现6个同一秘密的变体（不同措辞但含义相同），当前去重仅取前4个中文字符作为key，对AI措辞变化不够鲁棒。

### 修复5：entSim开局标记未置位

队友妹妹设定下开局已认识哥哥与情敌，但 _relCharIntroduced 和 _rivalIntroduced 在 initEntSimState() 中未置true，导致后续 prompt 注入"第一次介绍哥哥"的旧逻辑。

## 技术方案

### 修复1：章节标签（state.js + data.js）

将练习生职业的 startChapter 从1改为0，在 CHAPTERS 数组中新增第0项"练习生"。chapterByPopularity 和 checkChapterAdvance 无需修改——人气3无法触发任何阈值跨越，将保持第0章。章节推进触发 debutDay 设置时，如果当前在练习生章，强制跳到新人期。

**修改文件**：`src/ent-sim/data.js`、`src/ent-sim/state.js`

### 修复2：聊天阶段过滤（ui.js）

在 initChatChannel 中增加 debutDay 门控——当 E.career.debutDay <= 0 时，用 tag 标记过滤池子消息：

- CHAT_RIVAL：跳过 msg 中包含 "打歌/音银/回归/预录/直拍/一位" 的消息
- CHAT_MANAGER：跳过 msg 中包含 "打歌/预录/回归/音源/宣发" 的消息
- CHAT_BROTHER：保留（"月末评价"对练习生合理）

需要在池子条目中增加可选的 stageTag 字段标记（如 'trainee'/'debut'），或直接在过滤时使用关键词匹配。

**修改文件**：`src/ent-sim/ui.js`（initChatChannel 函数）

### 修复3：情敌名字（ui.js）

将联系人列表第1484行的 `(E.rival && E.rival.name) || '情敌'` 替换为调用 `suitorName()` 函数（第95行），该函数从 `E.npcNetwork.nodes['npc_suitor'].name` 获取名字，fallback 为"团员"。

**修改文件**：`src/ent-sim/ui.js`（showBusinessPanel 函数第1484行）

### 修复4：秘密去重（engine.js）

增强 applySecretEffect 中的去重逻辑：在原有前4中文key基础上，新增一个"核心词"检查——提取"EXO"、"金珉锡"、"签售"、"直播间"、"同人文"、"直拍"等关键词组合作为辅助指纹。两个指纹任一匹配即判定重复。

**修改文件**：`src/ent-sim/engine.js`（applySecretEffect 函数第224-236行）

### 修复5：开局标记（state.js）

在 initEntSimState 函数末尾（saveGame之前）添加：当 career.sisterSetting 为 true 时，设置 `GS._relCharIntroduced = true` 和 `GS._rivalIntroduced = true`，与 1v1 模式在 ui-renderer.js:1322 的逻辑保持一致。

**修改文件**：`src/ent-sim/state.js`（initEntSimState 函数第130行附近）

## 验证方案

- 每个修复点改动独立、互不依赖，可分批验证
- 全部修改后用 node -c 语法检查
- 用审查的存档文件在浏览器中加载，逐一验证：章节标签/聊天消息/情敌名字/秘密数量