---
name: entSim-pool-phase2-7500
overview: 池子补全二期：当前所有池子展开合计1534条，目标7500条，需补约5966条。按优先级分8大类补全（工作池/事件池/聊天池/社交池/舆论池/名字池/歌曲概念池/成员互动池）。
todos:
  - id: p0-work-pools
    content: P0工作池补全(+625)：brand-offers.js(+70)/variety-shows.js(+90)/magazine-shoots.js(+75)/releases.js(+150)/awards.js(+240)，每个文件独立追加并验证
    status: completed
  - id: p0-event-pools
    content: P0事件池补全(+900)：incident-events(+110)/jealousy-events(+88)/special-events(+94)/girlgroup-events(+108)/brother-events(+88)/career-setbacks(+110)/oneheart-events(+108)/svt-teammate(+112)
    status: completed
  - id: p0-chat-pools
    content: P0聊天池补全(+446)：chat-male-lead.js中CHAT_MALE_LEAD/CHAT_BROTHER/CHAT_RIVAL/CHAT_MANAGER/GROUP_CHAT/CHAT_SASAENG 6个子池全面扩充至500条
    status: completed
  - id: p1-social-pools
    content: P1社交池+舆论池+名字池补全(+1690)：fan-letters(+190)/daily-engagement(+168)/diary-templates(+118)/daily-buzz(+324)/dispatch-news(+100)/dating-rumors(+100)/hot-search-replies(+95)/group-names(+140)/company-names(+80)/teammate-names(+200)/sister-roles(+170)
    status: completed
    dependencies:
      - p0-work-pools
      - p0-event-pools
      - p0-chat-pools
  - id: p2-song-member-other
    content: P2歌曲池+成员互动池+其他补全(+2305)：hit-songs(+220)/group-concepts(+120)/music-charts(+95)/comeback-cycle(+75)/members.js(+738)/ent-schedule(+121)/contact-progression(+90)/male-contact(+80)/male-lead-init(+90)/news-templates(+197)/concert-pool(+100)/fansign-pool(+98)/music-show-pool(+98)
    status: completed
    dependencies:
      - p1-social-pools
  - id: p2-final-verify
    content: 全量验证：所有38个文件条目数汇总确认达7500±200条，语法检查无报错，随机抽样各文件5条检查格式完整性
    status: completed
    dependencies:
      - p2-song-member-other
---

## 池子二期补全计划

### 背景

一期已完成：代言池+8条、聊天池+15条、四个工作池加scope字段、5个文件注释修正。当前Pools目录38个文件展开后合计**1,534条**，距离目标**7,500条**还需补全**约5,966条**。

### 补全目标

分为9大类，按优先级分三批执行。每类保持现有风格、格式、字段结构完全一致，内容符合K-pop行业真实性。

### 各大类分配与目标

| 大类 | 当前 | 目标 | 需补 | 优先级 |
| --- | --- | --- | --- | --- |
| 工作池 | 175 | 800 | +625 | P0 |
| 事件池 | 300 | 1200 | +900 | P0 |
| 聊天池 | 54 | 500 | +446 | P0 |
| 社交池 | 124 | 600 | +476 | P1 |
| 舆论池 | 176 | 800 | +624 | P1 |
| 名字池 | 210 | 800 | +590 | P1 |
| 歌曲概念池 | 165 | 600 | +435 | P2 |
| 成员互动池 | 92 | 1200 | +1108 | P2 |
| 其他 | 238 | 1000 | +762 | P2 |


### 涉及38个文件

**P0工作池（5文件）**：brand-offers.js(30→100)、variety-shows.js(30→120)、magazine-shoots.js(25→100)、releases.js(50→200)、awards.js(40→280)

**P0事件池（8文件）**：incident-events.js(40→150)、jealousy-events.js(32→120)、special-events.js(36→130)、girlgroup-events.js(42→150)、brother-events.js(32→120)、career-setbacks.js(40→150)、oneheart-events.js(42→150)、svt-teammate.js(38→150)

**P0聊天池（1文件）**：chat-male-lead.js(54→500)，含6个子池全面扩充

**P1社交池（3文件）**：fan-letters.js(60→250)、daily-engagement.js(32→200)、diary-templates.js(32→150)

**P1舆论池（4文件）**：daily-buzz.js(76→400)、dispatch-news.js(20→120)、dating-rumors.js(22→120)、hot-search-replies.js(25→120)

**P1名字池（4文件）**：group-names.js(60→200)、company-names.js(20→100)、teammate-names.js(100→300)、sister-roles.js(30→200)

**P2歌曲概念池（4文件）**：hit-songs.js(80→300)、group-concepts.js(40→160)、music-charts.js(25→120)、comeback-cycle.js(25→100)

**P2成员互动池（5文件）**：members.js(62→800)、ent-schedule.js(39→160)、contact-progression.js(30→120)、male-contact.js(20→100)、male-lead-init.js(30→120)

**P2其他（4文件）**：news-templates.js(53→250)、concert-pool.js(20→120)、fansign-pool.js(22→120)、music-show-pool.js(22→120)

## 实现方案

### 补全策略

- **增量追加**：在现有数组/对象末尾追加新条目，不修改已有数据
- **格式一致**：新条目严格复用现有条目的字段名、字段类型、嵌套结构
- **内容真实感**：品牌/节目/奖项使用K-pop行业真实或常见名称，避免过度虚构
- **分类均衡**：每个子类别按比例分配新增条目，保持品类内部平衡

### 分批执行原则

- P0优先：工作池/事件池/聊天池直接影响游戏核心循环
- P1次之：社交/舆论/名字池增强沉浸感
- P2最后：歌曲/成员/其他池补全细节丰富度
- 每批完成后独立验证（语法检查+条目数校验+随机抽样内容检查）

### 验证方式

每批补全后执行：

1. `node --check` 语法验证每个文件
2. 条目计数与目标对比
3. 随机抽取5条检查字段完整性
4. 确认无重复key（适用于有key字段的条目）