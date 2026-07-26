---
name: pool-expansion-200-60
overview: 29个池子大规模扩展：22个事件/日程池拉到200条，7个聊天/联络池拉到60条，共计新增约4200+条内容。
todos:
  - id: batch1-high-frequency
    content: Batch 1/6：扩展高频消耗事件池（DAILY_ENGAGEMENT +168, INCIDENT_EVENTS +160, JEALOUSY_EVENTS +168, MALE_LEAD_INITIATIVE +170），共667条
    status: completed
  - id: batch2-romance-core
    content: Batch 2/6：扩展恋爱好感核心池（CONTACT_PROGRESSION +170, ONEHEART_RANDOM_EVENTS +158, SPECIAL_EVENTS +170），共498条
    status: completed
    dependencies:
      - batch1-high-frequency
  - id: batch3-chat-contact
    content: Batch 3/6：扩展聊天/联络系列（CHAT_MALE_LEAD +47, CHAT_BROTHER +50, CHAT_RIVAL +53, CHAT_MANAGER +55, GROUP_CHAT +49, CHAT_SASAENG +52, CONTACT_TYPE_POOL +42），共348条→60条目标
    status: completed
    dependencies:
      - batch2-romance-core
  - id: batch4-schedule-career
    content: Batch 4/6：扩展演艺日程池（ENT_SCHEDULE +160, COMEBACK_CYCLE +175, CONCERT +180, MUSIC_SHOW +178, VARIETY_SHOW +170, MAGAZINE +175, FANSIGN +178, RELEASE +150），共1366条
    status: completed
    dependencies:
      - batch3-chat-contact
  - id: batch5-industry-part1
    content: Batch 5/6：扩展行业/外部事件池·上半（CAREER_SETBACKS +160, AWARD +160, RUMOR +178, DISPATCH +178, BRAND_OFFER +160），共836条
    status: completed
    dependencies:
      - batch4-schedule-career
  - id: batch6-industry-part2
    content: Batch 6/6：扩展行业/外部事件池·下半（CHART +175, GIRLGROUP_EVENTS +158, HOT_SEARCH_REPLY +175, SVT_TEAMMATE_EVENT +165, DAILY_BUZZ +125），共798条
    status: completed
    dependencies:
      - batch5-industry-part1
---

## 需求概述

对 ent-sim/pools/ 下 29 个池子进行大规模内容扩展：22 个事件/日程池统一拉到 200 条，7 个聊天/联络池拉到 60 条。总计新增约 4500 条。纯数据追加，不修改任何代码逻辑或数据结构。

## 排除的池子（19个，不操作）

名字/设定类：company-names(20)、group-names(60)、teammate-names(100)、group-concepts(40)、hit-songs(80)、sister-roles(30)、teammate-flavor(5)
少量事件/支线类：brother-side-plots(3)、brother-tests(3)、rival-advance-events(4)、secret-discovery-events(4)、industry-events(6)
固化数据类：svt-teammate-profiles(13)、members(13)
已充足类：fan-letters(60)、diary-templates(30)、news-templates(50)、brother-events(30)、DAILY_BUZZ_TEMPLATES(307)
工具/入口类：_utils.js、index.js

## 目标条数

- CHAT系列6个 + CONTACT_TYPE_POOL = 7个池子 → 每个拉到 60 条
- 其余 22 个池子 → 每个拉到 200 条
- DAILY_BUZZ_TEMPLATES 已 307 条，不操作

## 实施策略

### 核心原则

- **纯数据追加**：仅在现有数组/对象末尾追加新条目，不修改任何现有条目
- **格式完全匹配**：新条目的字段名、数据类型、占位符变量({maleLead}/{brother}/{rival}/{groupName}等)与现有条目完全一致
- **分类标签一致**：cat/vibe/stage/event/type 等分类标签遵循现有命名体系
- **内容质量**：围绕K-pop偶像真实职业场景，使用韩国娱乐圈术语（打歌/待机室/官咖/泡泡/直拍/签售/末放/预录等），拒绝通用空洞文本

### 6批次分批执行

#### Batch 1 — 高频消耗事件池（4池，~667条新增）

玩家感知最强的核心池子，每天触发概率最高：

| 池子 | 当前 | 目标 | 新增 | 文件 |
| --- | --- | --- | --- | --- |
| DAILY_ENGAGEMENT_POOL | 32条 | 200条 | +168 | daily-engagement.js |
| INCIDENT_EVENTS_POOL | 40条 | 200条 | +160 | incident-events.js |
| JEALOUSY_EVENTS_POOL | 32条 | 200条 | +168 | jealousy-events.js |
| MALE_LEAD_INITIATIVE_POOL | 30条 | 200条 | +170 | male-lead-init.js |


数据结构参考：

- DAILY_ENGAGEMENT_POOL: `{cat:'sns'|'live'|'stage'|'fashion'|'variety'|'fan', t, pop, exp, fanReactions[]}`
- INCIDENT_EVENTS_POOL: `{cat:'surprise'|'scandal'|'sick'|'late'|'teammate'|'outside'|'struggle'|'industry'|'fan'|'doubt'|'holiday'|'milestone', text, aff|popDelta}`
- JEALOUSY_EVENTS_POOL: `{minAff?, text, affDelta, jealous, event?}`
- MALE_LEAD_INITIATIVE_POOL: `{minAff, text, aff}`

#### Batch 2 — 恋爱好感核心池（3池，~498条新增）

感情线推进的核心池子：

| 池子 | 当前 | 目标 | 新增 | 文件 |
| --- | --- | --- | --- | --- |
| CONTACT_PROGRESSION | 30条 | 200条 | +170 | contact-progression.js |
| ONEHEART_RANDOM_EVENTS | 42条 | 200条 | +158 | oneheart-events.js |
| SPECIAL_EVENTS | 30条 | 200条 | +170 | special-events.js |


数据结构参考：

- CONTACT_PROGRESSION: `{minAff, t, aff}`
- ONEHEART_RANDOM_EVENTS: `{cat:'flirt'|'daily'|'emotion'|'drama'|'test'|'pre_confession', t, aff}`
- SPECIAL_EVENTS: `{key, text, exposure, popDelta}`

#### Batch 3 — 聊天/联络系列（7池，~348条新增）

单文件 chat-male-lead.js 包含6个聊天池，male-contact.js 包含1个联络池：

| 池子 | 当前 | 目标 | 新增 | 文件 |
| --- | --- | --- | --- | --- |
| CHAT_MALE_LEAD | 13条 | 60条 | +47 | chat-male-lead.js |
| CHAT_BROTHER | 10条 | 60条 | +50 | chat-male-lead.js |
| CHAT_RIVAL | 7条 | 60条 | +53 | chat-male-lead.js |
| CHAT_MANAGER | 5条 | 60条 | +55 | chat-male-lead.js |
| GROUP_CHAT | 11条 | 60条 | +49 | chat-male-lead.js |
| CHAT_SASAENG | 8条 | 60条 | +52 | chat-male-lead.js |
| CONTACT_TYPE_POOL | 18条 | 60条 | +42 | male-contact.js |


数据结构参考：

- CHAT_MALE_LEAD: 嵌套对象 `{greet:[{q,r[],aff}], stage:[{q,r[],aff}], worry:[{q,r[],aff}], romantic:[{q,r[],aff}], jealous:[{q,r[],aff}]}`
- CHAT_BROTHER: `[{from, msg, reply?, time}]`
- CHAT_RIVAL: `[{from, msg, reply?, time}]`
- CHAT_MANAGER: `[{from, msg, time}]`
- GROUP_CHAT: `{first_win:[{from,msg,time}], scandal:[], negative_news:[], comeback:[], daily:[]}`
- CHAT_SASAENG: `[{from, msg, time}]`
- CONTACT_TYPE_POOL: `[{cat, t, minAff, options:[{t,aff,jealous}]}]`

#### Batch 4 — 演艺日程池（8池，~1366条新增）

偶像职业生涯日程类池子：

| 池子 | 当前 | 目标 | 新增 | 文件 |
| --- | --- | --- | --- | --- |
| ENT_SCHEDULE_POOL | 40条 | 200条 | +160 | ent-schedule.js |
| COMEBACK_CYCLE_POOL | 25条 | 200条 | +175 | comeback-cycle.js |
| CONCERT_POOL | 20条 | 200条 | +180 | concert-pool.js |
| MUSIC_SHOW_POOL | 22条 | 200条 | +178 | music-show-pool.js |
| VARIETY_SHOW_POOL | 30条 | 200条 | +170 | variety-shows.js |
| MAGAZINE_POOL | 25条 | 200条 | +175 | magazine-shoots.js |
| FANSIGN_POOL | 22条 | 200条 | +178 | fansign-pool.js |
| RELEASE_POOL | 50条 | 200条 | +150 | releases.js |


数据结构参考：

- ENT_SCHEDULE_POOL: `{trainee:[{morning,morningLoc,afternoon,afternoonLoc,evening,eveningLoc}], idol:[...], actress:[...], singer:[...], model:[...], backstage:[...]}`
- COMEBACK_CYCLE_POOL: `{stage, t, pop, fanReactions[]}`
- CONCERT_POOL: `{stage, t, pop, fanReactions[]}`
- MUSIC_SHOW_POOL, VARIETY_SHOW_POOL, MAGAZINE_POOL, FANSIGN_POOL, RELEASE_POOL: 各自有独立结构，需逐池读取后追加

#### Batch 5 — 行业/外部事件池·上半（5池，~836条新增）

| 池子 | 当前 | 目标 | 新增 | 文件 |
| --- | --- | --- | --- | --- |
| CAREER_SETBACKS | 40条 | 200条 | +160 | career-setbacks.js |
| AWARD_POOL | 40条 | 200条 | +160 | awards.js |
| RUMOR_POOL | 22条 | 200条 | +178 | dating-rumors.js |
| DISPATCH_POOL | 22条 | 200条 | +178 | dispatch-news.js |
| BRAND_OFFER_POOL | 40条 | 200条 | +160 | brand-offers.js |


数据结构参考：

- CAREER_SETBACKS: `[{phase, text, popDelta, fanReactions[]}]` — 8个阶段，每阶段需均分条目
- AWARD_POOL: `{type:'newcomer'|'popularity'|'stage'|'daesang', t, pop}`
- RUMOR_POOL: `{type, t, exposure, fanReactions[]}`
- DISPATCH_POOL: `{t, exposure}`
- BRAND_OFFER_POOL: `{cat:'beauty'|'fashion'|'beverage'|...10个品类, t, pop}`

#### Batch 6 — 行业/外部事件池·下半（5池，~833条新增）

| 池子 | 当前 | 目标 | 新增 | 文件 |
| --- | --- | --- | --- | --- |
| CHART_POOL | 25条 | 200条 | +175 | music-charts.js |
| GIRLGROUP_EVENTS | 42条 | 200条 | +158 | girlgroup-events.js |
| HOT_SEARCH_REPLY_POOL | 25条 | 200条 | +175 | hot-search-replies.js |
| SVT_TEAMMATE_EVENT_POOL | 35条 | 200条 | +165 | svt-teammate.js |
| DAILY_BUZZ | 75条 | 200条 | +125 | daily-buzz.js |


数据结构参考：

- CHART_POOL: `{t, pop}`
- GIRLGROUP_EVENTS: 含回归/打歌/签售/练习室/合宿/团务/海外/空白期/年末/综艺多类别
- HOT_SEARCH_REPLY_POOL: `{hotSearch, fanComments[], mediaResponse}`
- SVT_TEAMMATE_EVENT_POOL: `{vibe, text}` — 含 {name}/{brother}/{maleLead} 占位符
- DAILY_BUZZ: `{hotSearch:[{t,c}], fanDiscussion:[{t,c}], mediaTitle:[{t,c}]}`

## 注意事项

1. **不修改任何代码逻辑**：仅追加数据条目到现有数组/对象末尾
2. **不修改 index.js 导出**：所有池子通过 `export var` 直接导出，index.js 仅 re-export，无需改动
3. **所有占位符沿用现有命名**：{maleLead}/{brother}/{rival}/{groupName}/{heroineName}/{mate1-5} 等
4. **韩国娱乐圈语境**：使用打歌/待机室/官咖/泡泡/直拍/签售/末放/预录/音银/音中/人气歌谣/MCD等术语
5. **每批次完成后可独立验证**：确认格式正确、无语法错误