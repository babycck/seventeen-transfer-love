---
name: entSim-batch-fixes
overview: 合并全部待修项：5项存档审查修复 + 删除直播间刷礼物秘密 + prompt加强 + AGENTS.md手册全面更新（含50个池子完整文档）+ 后续待补充修改，共涉及约15个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：CHAPTERS新增"练习生"(0)，原4阶段后移，练习生startChapter改为0，debutDay条件改为target>=1
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：initChatChannel增加debutDay
    status: pending
---

## 产品概述

对娱乐模拟器(entSim)进行批量修复与文档完善，合并两轮审查的全部问题。含7项代码修复 + 1项语法验证 + 3项AGENTS.md手册更新，涉及约10个代码文件和1个手册文件。

## 第一部分：代码修复（8个任务）

### 修复1：章节标签错位

练习生(debutDay=0, 人气=3)在界面和存档中被标记为"新人期"。原因是练习生职业的 startChapter=1 直接映射到 CHAPTERS[0]="新人期"。修改为 CHAPTERS 第0项新增"练习生"，练习生 startChapter=0，debutDay 跨越条件改为 target>=1。

### 修复2：聊天内容不分阶段

练习生打开KakaoTalk看到"今天打歌我看了""明天打歌预录"等已出道场景消息。initChatChannel 需增加 debutDay 门控，练习生阶段过滤含"打歌/音银/回归/预录/直拍/一位"等关键词的消息。

### 修复3：情敌名字不显示

聊天联系人列表中情敌永远显示"情敌"二字。需将联系人列表改用 suitorName() 函数获取真实名字。

### 修复4：秘密重复生成

entSim.secret.items 中出现6个同一秘密的变体。当前去重仅取前4中文字符作为key不够鲁棒。需新增"核心词"辅助指纹（EXO/金珉锡/签售/同人文/直拍/周边/小卡/应援），双指纹任一命中即判重。

### 修复5：entSim开局标记未置位

队友妹妹设定下开局已认识哥哥与情敌，但 _relCharIntroduced 和 _rivalIntroduced 未置true。需在 initEntSimState 中为 sisterSetting 置位。

### 修复6：删除"直播间刷礼物"秘密（4处删除）

女主秘密池中"在成员直播间刷礼物"类条目容易被AI误判为SEVENTEEN成员直播间而非EXO。删除4处相关条目：

- secret-discovery-events.js：删除 secret_live_gift
- ui-renderer.js：删除 _secPool 中直播间条目
- ent-sim/state.js：删除 defaultSecrets 中直播间条目
- special-events.js：删除 secret_rival

### 修复7：prompt约束加强

在 prompts.js 中显式禁止AI生成涉及SEVENTEEN成员直播间的秘密，所有秘密严格限定EXO。

### 修复8：全量语法验证

node -c 检查全部修改文件，确保无语法错误。

## 第二部分：AGENTS.md手册更新（3个任务）

### 任务9：阶段系统 & 事业机制文档化

准确描述5个状态（练习生 + 新人期/上升期/巅峰期/传奇期4章），人气阈值驱动晋级机制，checkChapterAdvance完整链路，debutDay机制，阶段门控现状说明（仅日程池有阶段过滤，其他池子无阶段门控）。

### 任务10：完整池子清单

50个池子文件，约80+导出常量，6000+条数据。按14类分组列出，每个池子注明导出常量名、文件名、作用、条目数量。

### 任务11：补齐缺失模块

补充 npcNetwork（系统4，4类NPC）、修正模块数量描述、补充 ent-sim 子模块完整索引。

## 技术方案

### 修复1：章节标签（data.js + state.js）

- data.js：CHAPTERS 数组改为5项 `["练习生","新人期","上升期","巅峰期","传奇期"]`，ENT_SIM_CAREERS 练习生 startChapter 改为 0
- state.js：checkChapterAdvance 中 debutDay 跨越条件从 `target >= 2` 改为 `target >= 1`，确保练习生→新人期正确触发出道

### 修复2：聊天阶段过滤（ui.js）

- initChatChannel 函数中，对 CHAT_RIVAL 和 CHAT_MANAGER 频道增加 debutDay <= 0 门控
- 使用 indexOf 逐个匹配关键词列表跳过不适消息，CHAT_BROTHER 保持不变

### 修复3：情敌名字（ui.js）

- showBusinessPanel 第1484行将 `(E.rival && E.rival.name) || '情敌'` 替换为 suitorName() 调用

### 修复4：秘密去重（engine.js）

- 保留原有前4中文字符key去重逻辑
- 新增 extractSecretFingerprint(text) 函数，提取核心词组合（EXO/金珉锡/签售/同人文/直拍/周边/小卡/应援/photo/card/应援棒）拼接为辅助指纹
- 两个指纹任一命中即拒绝添加

### 修复5：开局标记（state.js）

- initEntSimState 末尾、saveGame 之前，if(career.sisterSetting) 设置GS._relCharIntroduced=true 和 GS._rivalIntroduced=true

### 修复6：删除刷礼物秘密（4个文件）

- 每处删除单行数组元素，不影响其余条目索引
- 删除后各池子仍≥2条，randInt调用不越界

### 修复7：prompt约束（prompts.js）

- 第1139行描述从"都是EXO追星向的小秘密"加强为显式禁止SEVENTEEN成员直播间

### 修复8：语法验证

- 对所有修改文件执行 node -c 语法检查

### 任务9-11：手册更新

- 定位 AGENTS.md 中 entSim 相关段落，精确替换/补充
- 阶段系统：描述5状态+人气阈值表+debutDay机制+门控现状
- 池子清单：14类分组，每池子注明导出名/文件名/作用/条数
- 模块补齐：npcNetwork说明+模块数量修正+子模块索引

## 验证方案

- 每个代码修复独立互不依赖，可分批验证
- 全部修改后 node -c 语法检查
- 确认删除条目后各池子长度满足randInt范围
- 手册更新后与代码逐一核对