---
name: entSim-batch-fixes
overview: 合并全部待修项（11个任务）：①章节标签 ②聊天阶段过滤 ③情敌名字 ④秘密去重 ⑤开局标记 ⑥删除刷礼物秘密(4处) ⑦prompt加强 ⑧手册-阶段系统 ⑨手册-池子清单(50个池子) ⑩手册-补齐缺失模块 ⑪语法验证。涉及约15个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：CHAPTERS新增"练习生"(0)，原4阶段后移，练习生startChapter改为0，debutDay条件改为target>=1
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：initChatChannel增加debutDay门控，练习生阶段过滤"打歌/音银/回归/预录/直拍/一位"等关键词
    status: pending
  - id: fix-rival-name
    content: 修复情敌名字：showBusinessPanel联系人列表改用suitorName()函数获取情敌真实名字
    status: pending
  - id: fix-secret-dedup
    content: 修复秘密去重：applySecretEffect增加核心词辅助指纹（EXO/金珉锡/签售/同人文等），双指纹任一命中即判重
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
  - id: update-manual-stage
    content: 手册更新-阶段系统：AGENTS.md中描述5状态+人气阈值表+checkChapterAdvance链路+debutDay机制+门控现状
    status: pending
    dependencies:
      - fix-chapter-label
  - id: update-manual-pools
    content: 手册更新-池子清单：AGENTS.md新增50个池子文档，按14类分组注明导出名/文件名/作用/条数
    status: pending
  - id: update-manual-modules
    content: 手册更新-补齐模块：补充npcNetwork系统4说明、修正模块数量、删除不存在的关系网描述
    status: pending
  - id: validate-all
    content: 全量语法验证：node -c检查所有修改文件，确保无语法错误
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

对娱乐模拟器(entSim)进行批量修复与文档完善，合并两轮审查的全部问题。含7项代码修复 + 1项语法验证 + 3项AGENTS.md手册更新，涉及约10个代码文件和1个手册文件。

## 第一部分：代码修复（8项）

### 修复1：章节标签错位

练习生(debutDay=0, 人气=3)被标记为"新人期"。原因：startChapter=1映射到CHAPTERS[0]="新人期"。改为CHAPTERS第0项新增"练习生"，startChapter=0，debutDay跨越条件改为target>=1。

### 修复2：聊天内容不分阶段

练习生看到"今天打歌我看了""明天打歌预录"等已出道消息。initChatChannel需增加debutDay门控，练习生阶段过滤含"打歌/音银/回归/预录/直拍/一位"等关键词的消息。

### 修复3：情敌名字不显示

联系人列表永远显示"情敌"而非真实名字。改用suitorName()函数获取名字。

### 修复4：秘密重复生成

同一秘密6个变体，去重仅取前4中文key不够鲁棒。新增核心词辅助指纹（EXO/金珉锡/签售/同人文/直拍/周边/小卡/应援），双指纹任一命中即判重。

### 修复5：entSim开局标记未置位

队友妹妹下_relCharIntroduced和_rivalIntroduced未置true。在initEntSimState中为sisterSetting置位。

### 修复6：删除"直播间刷礼物"秘密（4处）

- secret-discovery-events.js：删除secret_live_gift
- ui-renderer.js：删除_secPool中直播间条目
- ent-sim/state.js：删除defaultSecrets中直播间条目
- special-events.js：删除secret_rival

### 修复7：prompt约束加强

prompts.js第1139行显式禁止AI生成涉及SEVENTEEN成员直播间的秘密，严格限定EXO。

### 修复8：全量语法验证

node -c检查全部修改文件。

## 第二部分：AGENTS.md手册更新（3项）

### 任务9：阶段系统与事业机制文档化

描述5状态（练习生+新人期/上升期/巅峰期/传奇期），人气阈值驱动，checkChapterAdvance链路，debutDay机制，阶段门控现状。

### 任务10：完整池子清单

50个池子文件，约80+导出常量，6000+条数据。按14类分组，每个注明导出名/文件名/作用/条数。

### 任务11：补齐缺失模块

补充npcNetwork（系统4，4类NPC）、修正模块数量、补充ent-sim子模块索引。

## 技术方案

### 修复1：章节标签（data.js + state.js）

- data.js：CHAPTERS数组改为5项["练习生","新人期","上升期","巅峰期","传奇期"]，ENT_SIM_CAREERS练习生startChapter改为0
- state.js：checkChapterAdvance中debutDay跨越条件从target>=2改为target>=1

### 修复2：聊天阶段过滤（ui.js）

- initChatChannel中对CHAT_RIVAL和CHAT_MANAGER增加debutDay<=0门控
- 使用indexOf逐个匹配关键词列表跳过不适消息，CHAT_BROTHER保持不变

### 修复3：情敌名字（ui.js）

- showBusinessPanel第1484行将`(E.rival && E.rival.name) || '情敌'`替换为suitorName()调用

### 修复4：秘密去重（engine.js）

- 保留原有前4中文字符key去重逻辑
- 新增extractSecretFingerprint(text)函数，提取核心词组合拼接为辅助指纹
- 两个指纹任一命中即拒绝添加

### 修复5：开局标记（state.js）

- initEntSimState末尾、saveGame之前，if(career.sisterSetting)设置GS._relCharIntroduced=true和GS._rivalIntroduced=true

### 修复6：删除刷礼物秘密（4个文件）

- 每处删除单行数组元素，不影响其余条目索引
- 删除后各池子仍>=2条，randInt调用不越界

### 修复7：prompt约束（prompts.js）

- 第1139行从"都是EXO追星向的小秘密"加强为显式禁止SEVENTEEN成员直播间

### 修复8：语法验证

- 对所有修改文件执行node -c语法检查

### 任务9-11：手册更新

- 阶段系统：5状态+人气阈值表+debutDay机制+门控现状说明
- 池子清单：14类分组，每池子注明导出名/文件名/作用/条数
- 模块补齐：npcNetwork说明+模块数量修正+子模块完整索引