---
name: entsim-pools-expansion-v2
overview: 大幅补充所有 ent-sim 池子条目，优先填补 8 个"标注200条但实际仅14-28条"的池子，再逐步扩展到其它中小池。
todos:
  - id: p0-concert-fansign
    content: "P0-A: 补充 CONCERT_POOL(22→50,+28条) 和 FANSIGN_POOL(16→50,+34条)，演唱会全周期+签售多场景"
    status: completed
  - id: p0-music-variety
    content: "P0-B: 补充 MUSIC_SHOW_POOL(22→50,+28条) 和 VARIETY_SHOW_POOL(20→50,+30条)，打歌节目+综艺通告"
    status: completed
  - id: p0-magazine-dispatch
    content: "P0-C: 补充 MAGAZINE_POOL(14→50,+36条) 和 DISPATCH_POOL(20→50,+30条)，杂志画报+Dispatch八卦"
    status: completed
  - id: p0-chart-rumor
    content: "P0-D: 补充 CHART_POOL(28→50,+22条) 和 RUMOR_POOL(25→50,+25条)，音乐榜单+绯闻传闻"
    status: completed
  - id: p0-validate
    content: P0全量语法验证：node -c 检查8个文件，如有错误修复后重验
    status: completed
    dependencies:
      - p0-concert-fansign
      - p0-music-variety
      - p0-magazine-dispatch
      - p0-chart-rumor
  - id: p1-group1
    content: "P1-A: 补充 COMEBACK_CYCLE(45→80), AWARD(22→60), CAREER_SETBACKS(27→50), HOT_SEARCH_REPLY(27→50)"
    status: completed
    dependencies:
      - p0-validate
  - id: p1-group2
    content: "P1-B: 补充 DIARY_TEMPLATES(30→50), BROTHER_EVENT(30→50), RELEASE_POOL(15→40), SPECIAL_EVENTS(70→100)"
    status: completed
    dependencies:
      - p0-validate
  - id: p1-group3
    content: "P1-C: 补充 CONTACT_PROGRESSION(63→100), GIRLGROUP_EVENTS(34→60), SVT_TEAMMATE(30→60), DAILY_BUZZ(61→80)"
    status: completed
    dependencies:
      - p0-validate
  - id: p1-validate
    content: P1全量语法验证：node -c 检查12个文件
    status: completed
    dependencies:
      - p1-group1
      - p1-group2
      - p1-group3
  - id: p2-increment
    content: "P2: 增量补充 INCIDENT(121→150), JEALOUSY(99→140), ONEHEART(98→140), MALE_LEAD_INIT(90→140), DAILY_ENGAGEMENT(152→180)"
    status: completed
    dependencies:
      - p1-validate
  - id: p2-validate
    content: P2全量语法验证：node -c 检查5个文件
    status: completed
    dependencies:
      - p2-increment
  - id: update-manual
    content: 同步更新手册十一节，将所有池子数量修正为审计真实值
    status: completed
    dependencies:
      - p2-validate
---

## 用户需求

继续补充娱乐圈模拟器(entSim)的所有池子条目，让24个池子达到目标数量，确保游戏内容的丰富度和不重复性。

## 补充范围

通过全量审计已确认所有池实际条目数。分三批补充：

### P0 高频弹窗池（8个，玩家每天都会遇到）

这些池标注为"200条"但实际仅14-28条，优先补齐到50条：

- CONCERT_POOL: 22→50条，演唱会/巡演场景(stage/pop/fanReactions结构)
- FANSIGN_POOL: 16→50条，签售会场景(cat/fanReactions结构)
- MUSIC_SHOW_POOL: 22→50条，打歌节目场景(show/t/fanReactions结构)
- VARIETY_SHOW_POOL: 20→50条，综艺通告(cat/show/pop/exp/fanReactions结构)
- MAGAZINE_POOL: 14→50条，杂志画报(mag/pop/exp/fanReactions结构)
- DISPATCH_POOL: 20→50条，Dispatch八卦新闻(t/exposure/fanReactions结构)
- CHART_POOL: 28→50条，音乐榜单(platform/change/t/fanReactions结构)
- RUMOR_POOL: 25→50条，绯闻/恋情传闻(type/t/exposure/fanReactions结构)

### P1 中等池（12个，30-70条翻倍）

- COMEBACK_CYCLE_POOL: 45→80条，回归周期事件(stage/t/pop/fanReactions)
- AWARD_POOL: 22→60条，颁奖(type/t/pop/fanReactions)
- CAREER_SETBACKS: 27→50条，事业挫折(phase/text/popDelta/fanReactions)
- HOT_SEARCH_REPLY_POOL: 27→50条，热搜评论回复(hotSearch/fanReplies/mediaTake三元组)
- DIARY_TEMPLATES: 30→50条，日记模板(type/framework/blanks)
- BROTHER_EVENT_POOL: 30→50条，哥哥事件(text/supportDelta)
- RELEASE_POOL: 15→40条，作品发布(cat子数组多品类)
- SPECIAL_EVENTS: 70→100条，特殊事件(4大类)
- CONTACT_PROGRESSION: 63→100条，好感铺垫(minAff分级)
- GIRLGROUP_EVENTS: 34→60条，女团专属事件
- SVT_TEAMMATE_EVENT_POOL: 30→60条，SEVENTEEN队友客串
- DAILY_BUZZ: 61→80条，每日舆论(3子池)

### P2 大池增量（5个，90+条→140-180条）

- INCIDENT_EVENTS_POOL: 121→150条
- JEALOUSY_EVENTS_POOL: 99→140条
- ONEHEART_RANDOM_EVENTS: 98→140条
- MALE_LEAD_INITIATIVE_POOL: 90→140条
- DAILY_ENGAGEMENT_POOL: 152→180条

## 约束条件

- 保持所有现有条目不修改、不删除
- 新增条目格式与现有条目完全一致（字段名、类型、fanReactions数组）
- 保持cat/stage/type/show/mag/platform等分类标签不新增不删除
- 占位符统一使用{name}/{groupName}/{fandomName}/{maleLead}/{brother}/{heroineName}
- 使用var声明，[].concat([...])扁平数组格式
- 每批完成后node -c语法验证
- 全部完成后同步更新手册十一节池子数量

## 技术栈

- JavaScript ES Modules (var声明, 无template literal)
- Node.js 18+ (仅语法验证)
- 格式: export var POOL_NAME = [].concat([...])

## 实现方案

### 总体策略

按P0→P1→P2顺序分批写文件，每批完成后统一语法验证。P0的8个池为高频弹窗池，每天都会有玩家看到，质量要求最高。每个池新增条目需保证叙事多样性，覆盖不同stage/cat分类。

### 文件改写方式

每个池文件保留现有所有条目不变，在末尾闭合 `]);` 前追加新条目数组。对子数组结构的池(如RELEASE_POOL的cat子数组)，在对应cat数组中追加。对于扁平单层数组的池(如DISPATCH/RUMOR等)，直接在数组末尾追加。

### P0关键结构参考

**CONCERT_POOL** (stage分类):

- 现有stage: announce/ticketing/rehearsal/live/solo/talk/tears/encore/after/tour/return/first_tour/overseas/family/setlist/mic/band/rain/throwback/goodbye
- 新增stage: soundcheck/backstage/busking/surprise_guest/acoustic/unit_stage/dance_break/fan_project/ot6_stage/night_concept/collab_stage/birthday_stage/charity/online_streaming/dome_tour/encore_tour/world_tour_final

**FANSIGN_POOL** (cat分类):

- 现有cat: entry/interact/headband/note/offline_gift/parents/sign_language/overseas/letter/proposal/tears/last/repeat/special
- 新增cat: video_call/postit/drawing/nickname/highfive/birthday_fan/handwritten/bilingual/group_order/fan_art

**DISPATCH_POOL** (扁平数组,t/exposure/fanReactions):

- 新增曝光层级: exposure:1-5，覆盖练习室/待机室/便利店/小区/机场/公司/同款/时间线/SNS等场景

### P1关键结构参考

**RELEASE_POOL** (cat子数组): 每个cat区块追加2-3条。现有cat: single/photobook/practice/vlog/cover/collab。

**SPECIAL_EVENTS** (4大类): 行业通用/情敌递进/秘密被撞破/更深行业，每类追加约7-8条。

**CONTACT_PROGRESSION** (minAff分级): 0/10/20/30/40/50/60各阶段补3-5条。

### 性能考量

- 纯数据文件，无运行时性能影响
- 文件体积增加约80-120KB（约30个文件）
- Vite HMR在文件保存后自动reload，开发体验不变

### 错误处理

- 每批完成后node -c验证所有已改文件的语法
- 发现语法错误(如中文引号嵌套、缺失逗号)立即修复后重验
- 不引入新依赖，不使用任何运行时工具