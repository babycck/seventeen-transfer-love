---
name: entSim-纯恋爱游戏娱乐圈背景
overview: 将 entSim 定位为「纯恋爱游戏+娱乐圈背景」：保留行程+舆论四维作为恋爱张力背景层，删除作品槽/周期相位/资源等级/颁奖礼/合作企划等纯经营元素，用同构方式实现 oneHeart 的恋爱系统（4Tab/记忆/心动笔记/聊天/朋友圈/剧场），已改代码作为基础。
design:
  architecture:
    framework: html
  styleKeywords:
    - Glassmorphism
    - Dark Purple
    - Blur Backdrop
    - Pulse Animation
    - Three Column Dashboard
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 13px
      weight: 600
    subheading:
      size: 12px
      weight: 600
    body:
      size: 11px
      weight: 400
  colorSystem:
    primary:
      - "#7C6FF0"
      - "#9D8BFF"
    background:
      - "#1A1626"
      - "#221C33"
      - rgba(255,255,255,0.06)
    text:
      - "#F2EEFF"
      - rgba(242,238,255,0.6)
    functional:
      - "#5BD6A0"
      - "#FF8A8A"
      - "#FFD479"
todos:
  - id: engine-cleanup
    content: engine.js 删除经营模块 import（works/awards/collab/chapter/fan-service/tickCollabRomance）和 advanceWorld/applySideEffects 中对应调用；保留 romance/npc/曝光/舆论 + cycle(行程) + immersion(dailyBuzz)
    status: pending
  - id: prompt-romance-focus
    content: prompts.js 删除经营段落 + 追加韩文名禁令Bug2 + choice注入场景连续性Bug3 + depth阶段差异化指引 + 精简JSON输出格式 + parseEntSimExtras删经营字段
    status: pending
    dependencies:
      - engine-cleanup
  - id: tab-content-memory
    content: engine.js 新增 sendEntSimChat/generateEntSimMoment/generateEntSimTheater/compressEntSimYesterday + prompts.js 新增 chat/moment/theater message type + 记忆注入 + ent-sim/parser.js 正则提取Bug8 + parser.js repairJson深度检查 + state.js 增 dailySummaries/eventLog
    status: pending
    dependencies:
      - prompt-romance-focus
  - id: migrate-and-remaining
    content: src/state.js migrateSave 兜底所有新字段 + npc-network.js interactNpc 加每日3次限制Bug5
    status: pending
    dependencies:
      - tab-content-memory
---

## 用户需求

entSim 定位明确为：**纯恋爱游戏 + 娱乐圈背景**。

- 恋爱为主线：和男主的恋爱是核心体验，恋爱系统用「同构实现」（参考 oneHeart 逻辑结构，用 entSim 自己的字段路径和引擎，不直接 import oneHeart 函数）
- 娱乐圈作为背景层：保留行程（打歌/签售/画报等作为恋爱场景）+ 舆论四维（粉丝/媒体/黑粉/专业作为恋爱曝光风险来源）
- 删除纯经营元素：作品槽、周期相位（蛰伏/发力/高光/回落）、资源等级、颁奖礼、合作企划
- 已改代码（ui.js 重写 + 8 文件 bug 修复）作为基础继续

## 产品概述

将 entSim 从「经营模拟器」转型为「娱乐圈地下恋 1v1 恋爱游戏」：清理经营模块、补齐恋爱系统（4 Tab 同构实现 + 记忆系统）、prompt 聚焦恋爱主线、修复 9 个 bug。

## 核心功能

- engine.js 清理经营模块（删除 works/awards/collab/chapter/fan-service 的 import 和调用），保留 romance/npc/曝光/舆论 + cycle(行程) + immersion(dailyBuzz)
- prompts.js 删除经营段落 + 恋爱聚焦（韩文名禁令 Bug2 + choice 场景连续性 Bug3 + depth 阶段差异化指引 + 精简 JSON 输出格式）
- 4 Tab 内容实现：聊天（正在输入动效 + 话题引导）/ 朋友圈（AI 生成动态 + 男主评论）/ 剧场（按 depth 解锁番外）
- 记忆系统：每日剧情压缩为结构化摘要 + 事件累积 + prompt 注入
- Bug 8：JSON 截断正则提取兜底 + repairJson 深度检查
- migrateSave 兜底所有新字段 + npc-network.js interactNpc 加每日 3 次限制 Bug5

## Tech Stack

- 纯 JavaScript (ES Modules)，复用现有 entSim 架构（engine/ui/prompts/state/romance/cycle/data/npc-network/immersion/endings）
- `var` + 字符串拼接代码风格（遵循 AGENTS.md 约定）
- 同构实现：参考 oneHeart 逻辑结构但用 entSim 自己的字段路径和引擎，不直接 import oneHeart 函数
- 不引入新依赖，所有功能用浏览器原生 API

## 已改代码现状（保留作为基础）

| 文件 | 状态 | 改动内容 |
| --- | --- | --- |
| ent-sim/ui.js | 已重写 | 三栏精简+4Tab占位+bindClass(Bug1)+人气日志(Bug9)+NPC亲密度+Tab切换 |
| ent-sim/engine.js | 已改 | maxTokens4000+条件时段(Bug6)+triggerEntSimEvent扩展+advanceWorld重置npcInteractionUsed |
| ent-sim/state.js | 已改 | initEntSimState增dateCount/npcInteractionUsed/chatHistory/moments/theaterHistory+addPopularity(delta,reason) |
| ent-sim/romance.js | 已改 | tryConfession depth>=4+confessionDone门控(Bug4/7) |
| works/fan-service/awards/public-opinion | 已改 | addPopularity传reason(Bug9) |


## 实现方案

### 第 1 步：engine-cleanup（清理经营模块）

**engine.js** 删除经营 import 和调用：

- 删除 import：`progressWorks, applyWorkBuzz` (works.js)、`checkChapterAdvance, enterChapter` (chapter.js)、`maybeNominateAwards` (awards.js)、`doFanService` (fan-service.js)、`maybeOfferCollab` (collab.js)、`tickCollabRomance` (romance.js)
- advanceWorld()：删除 progressWorks()/tickCollabRomance()/maybeNominateAwards()/checkChapterAdvance() 调用；保留 rollDailyAgenda()/advanceCycle()/dailyNpcRoll()/maybeFilmSisBackstab()/tickPaparazzi()/generateDailyBuzz()
- applySideEffects()：删除 workProgress/fanServiceNote/collabProposal/awardsNomination/chapterHint 分支；保留 romanceBeat/opinionDelta/exposureEvent/npcEncounter/brother/secret/endingsHint

### 第 2 步：prompt-romance-focus（Prompt 恋爱聚焦）

**prompts.js** 重写 system prompt：

- 删除：作品生命周期、合作生情与营业CP原则、周期相位/资源/在播作品数等经营段落
- 保留：核心张力（地下恋曝光压力）、男主设定、兄长设定、情敌身份、称呼规则、场景连续性
- 追加 Bug 2：女主名称禁令——禁止自创韩文音译名或韩文台词
- 追加 depth 阶段差异化写作指引（0-1初遇/2暧昧/3心动/4明确/5深爱各有写作方向）
- buildEntSimUserMessage choice 分支：从 GS._entSimCurrent 取上一段 narrative 前150字注入场景连续性（Bug 3）
- 精简 JSON 输出格式：删除 workProgress/awardsNomination/collabProposal/fanServiceNote/chapterHint 字段
- buildEntSimContextSnapshot：删除在播作品数/作品列表/合作期/营业CP进度；保留人气/四维舆论/恋爱深度/日程/哥哥/NPC/秘密/狗仔

### 第 3 步：tab-content-memory（4 Tab 内容 + 记忆系统）

**engine.js** 新增函数：

- `sendEntSimChat(msg)`：push 到 chatHistory，调 generateEntSimRound('chat', {msg})
- `generateEntSimMoment()`：调 generateEntSimRound('moment', {})
- `generateEntSimTheater(type)`：调 generateEntSimRound('theater', {type})
- `compressEntSimYesterday()`：压缩 narrative buffer 为 {events, dialogues, promises, revealedInfo}，存入 dailySummaries（max 7）
- advanceWorld() 末尾调 compressEntSimYesterday()

**prompts.js** 新增 message type：

- chat：请以男主口吻回复玩家消息，口语化有性格
- moment：生成女主朋友圈动态+男主评论
- theater：写800字番外，基于当前恋爱深度和角色关系
- buildEntSimContextSnapshot 注入记忆：昨日摘要+近7天事件列表

**ent-sim/parser.js** Bug 8A：parseEntSimResponse safeParseJson 失败后增加正则提取 narrative/options

**src/parser.js** Bug 8B：repairJson lastBrace 截取前遍历统计 depth，不为0时跳过

**state.js** (ent-sim)：initEntSimState 增 dailySummaries:[]/eventLog:[]

### 第 4 步：migrate-and-remaining（兜底 + Bug 5）

**src/state.js** migrateSave：追加兜底 dateCount/npcInteractionUsed/chatHistory/moments/theaterHistory/dailySummaries/eventLog

**npc-network.js** Bug 5：interactNpc 开头检查 npcInteractionUsed>=3 拒绝，成功后 +1

## 实现要点

- engine.js 删经营 import 后 advanceWorld 仍需 rollDailyAgenda（行程是恋爱背景）
- prompts.js 精简 JSON 格式后 parser.js 的 parseEntSimExtras 也需删对应字段解析
- compressEntSimYesterday 不调额外 API，用 narrative buffer 本地截取压缩
- Tab 切换不重新生成剧情，只切换显示区域
- 聊天/朋友圈/剧场各调 1 次 API，不推进时段（triggerEntSimEvent 不传 advanceTime）

## 目录结构

```
src/
├── parser.js                          # [MODIFY] repairJson lastBrace 加 depth 检查（Bug 8B）
├── state.js                           # [MODIFY] migrateSave 兜底所有新字段
└── ent-sim/
    ├── engine.js                      # [MODIFY] 删经营import/调用+新增chat/moment/theater/compressYesterday+advanceWorld集成记忆
    ├── ui.js                          # [已改] 三栏精简+4Tab占位+bindClass+人气日志（需补Tab内容接线）
    ├── prompts.js                     # [MODIFY] 删经营段落+韩文名禁令+choice场景连续性+depth指引+记忆注入+chat/moment/theater type
    ├── state.js                       # [已改] initEntSimState新字段+addPopularity reason（需补dailySummaries/eventLog）
    ├── romance.js                     # [已改] tryConfession depth>=4+confessionDone
    ├── parser.js                      # [MODIFY] parseEntSimResponse 正则提取兜底（Bug 8A）+ parseEntSimExtras 删经营字段
    ├── npc-network.js                 # [MODIFY] interactNpc 加每日3次限制（Bug 5）
    ├── cycle.js                       # [不变] rollDailyAgenda 行程池保留（恋爱背景）
    └── data.js                        # [不变] 静态数据保留（THEATER_TYPES已在ui.js内联）
```

## 设计风格

按 `public/entSim-ui-preview.html` 预览设计，采用暗色玻璃拟态（Glassmorphism）风格。

### 三栏布局 240px / 1fr / 280px

- Header：周期标签（渐变文字+脉冲）+ 章节徽章 + 人气（可点击日志）+ mini-radar + 设置
- 左栏：作品卡片（进度点+警告）+ 今日日程（图标按钮+地点标签）+ 资源等级
- 中栏：剧情正文（热搜内嵌标签）+ 选项（紫色渐变+风险标签）+ 自由输入
- 右栏：热搜列表（排名+火焰）+ 粉丝讨论（三色气泡）+ 媒体定调 + 雷达图（150px四维）+ 关系网（3列NPC网格+亲密度）
- 底部：恋爱深度条（5格渐变）+ 4 Tab（剧情/聊天/朋友圈/剧场）

### Tab 内容

- 聊天 Tab：手机消息 UI（气泡+正在输入动效+话题引导）
- 朋友圈 Tab：时间线动态+男主评论
- 剧场 Tab：番外类型选择（按depth解锁灰化）+ 内容展示
- 弹窗：风险预估（红色边框+评分+确认/放弃）

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 搜索 entSim 模块间的 import/export 依赖链，确认 engine.js 删除经营模块 import 后无断裂引用，以及新增函数（sendEntSimChat/generateEntSimMoment/generateEntSimTheater/compressEntSimYesterday）的导入路径正确性
- Expected outcome: 验证修改后的 import 路径与现有 ui.js/prompts.js/state.js 的引用关系无断裂，无循环依赖