---
name: entSim-batch-fixes
overview: 明星志愿3式全面重构：96个细粒度池子（每个含中文名+用途标注）、练习生3子阶段(人气=0)、出道后6阶段、数据驱动调度、好感-事业门控、AI主线叙事框架、AGENTS.md手册更新。涉及约110个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：data.js中CHAPTERS改为6阶段定义（新人出道/崭露头角/稳步上升/人气偶像/顶流巨星/传奇殿堂），state.js中chapterByPopularity阈值改为6段(90/75/55/35/15)，checkChapterAdvance移除L261-L264旧出道逻辑
    status: completed
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：ui.js pushDailyChats中练习生期通过池子require标签过滤消息，不手写关键词黑名单
    status: completed
  - id: fix-rival-name
    content: 修复情敌名字：ui.js showBusinessPanel中将硬编码"情敌"改为suitorName()函数调用
    status: completed
  - id: fix-secret-dedup
    content: 修复秘密去重：engine.js applySecretEffect新增核心词辅助指纹函数，双指纹任一命中即判重
    status: completed
  - id: fix-entSim-flags
    content: 修复开局标记：state.js initEntSimState末尾为sisterSetting设置_relCharIntroduced=true和_rivalIntroduced=true，migrateSave兜底
    status: completed
  - id: remove-livestream-gift-secrets
    content: 删除4处直播间刷礼物秘密：secret-discovery-events.js删除secret_live_gift、ui-renderer.js删除_secPool中直播间条目、ent-sim/state.js删除defaultSecrets中直播间条目、special-events.js删除secret_rival
    status: completed
  - id: strengthen-prompt
    content: 加强prompt约束：prompts.js显式禁止AI生成涉及SEVENTEEN成员直播间的秘密，严格限定EXO
    status: completed
    dependencies:
      - remove-livestream-gift-secrets
  - id: split-members-to-individual
    content: 拆分members.js为14个独立池子文件：svt-teammate-events.js(队友事件200条)+13个单成员行为池文件(member-scoups.js~member-dino.js各3条)
    status: completed
  - id: split-ent-schedules
    content: 拆分ent-schedules.js为10个独立日程池文件：schedule-common.js/schedule-related.js/schedule-trainee.js/schedule-chapter1-novice.js/schedule-chapter2-sprouting.js(新)/schedule-chapter2-rising.js/schedule-chapter3-peak.js/schedule-chapter4-legend.js/schedule-chapter5-topstar.js(新)/schedule-boygroup.js
    status: completed
  - id: split-chat-male-lead
    content: 拆分chat-male-lead.js为6个独立聊天池文件：chat-male-lead.js/chat-brother.js/chat-rival.js/chat-manager.js/chat-group.js/chat-sasaeng.js
    status: completed
  - id: split-daily-buzz
    content: 拆分daily-buzz.js+daily-buzz-templates.js为3个独立舆论池文件：buzz-hot-search.js/buzz-fan-discussion.js/buzz-media-title.js
    status: completed
  - id: build-trainee-pools
    content: 新建5个练习生阶段池子：trainee-early.js(30条)/trainee-mid.js(30条)/trainee-late.js(30条)/trainee-events.js(50条含出道触发事件)/trainee-chat.js(60条)，全部含require标签
    status: completed
  - id: build-calendar-job-pools
    content: 新建日历+通告池子：calendar-events.js(30条情人节/圣诞/纪念日)/job-offers.js(40条试镜/CF/综艺/OST含需求标签)
    status: completed
  - id: build-romance-scene-pools
    content: 新建6个恋爱场景池子：romance-backstage.js/romance-latenight.js/romance-public.js/romance-crisis.js/romance-jealousy.js/romance-confession.js(合计110条)
    status: completed
  - id: build-secret-relationship-pools
    content: 新建4个地下恋专属池子：secret-comms.js/secret-nearmiss.js/secret-fan-clues.js/secret-company-warning.js(合计50条)
    status: completed
  - id: build-atmosphere-pools
    content: 新建3个氛围情绪池子：atmosphere-weather.js(15条)/atmosphere-mood.js(10条)/atmosphere-his-state.js(10条)
    status: completed
  - id: build-milestone-pools
    content: 新建3个里程碑高光池子：milestone-debut.js(10条)/milestone-first-win.js(10条)/milestone-awards.js(20条)
    status: completed
  - id: build-encounter-pools
    content: 新建4个偶遇场景池子：encounter-ml.js/encounter-rival.js/encounter-brother.js/encounter-others.js(合计60条)
    status: completed
  - id: build-drama-beat-pools
    content: 新建5个剧情节奏池子：drama-almost.js/drama-misunderstand.js/drama-coldwar.js/drama-dating-rumor.js/drama-dilemma.js(合计85条)
    status: completed
  - id: add-state-fields-zero-pop
    content: state.js新增traineePhase/_lastTraineePhase/_debutTriggerDay字段，popularity初始0，新增traineePhaseOf()导出函数，migrateSave兜底
    status: completed
  - id: engine-trainee-debut
    content: engine.js：addPopularity守卫(debutDay=0时return)+goEntSimNextDay中按dayCount更新traineePhase+后期_debutTriggerDay累计触发出道+练习生轻量事件弹窗
    status: completed
    dependencies:
      - add-state-fields-zero-pop
      - split-ent-schedules
  - id: cycle-filterByRequire
    content: 改造cycle.js：rollDailyAgenda练习生分支用filterByRequire替代isDebut三分支，按traineePhase分池抽取
    status: completed
    dependencies:
      - add-state-fields-zero-pop
      - build-trainee-pools
  - id: utils-canTrigger
    content: _utils.js新增canTrigger/filterByRequire通用数据驱动调度函数，解析require条件字符串
    status: completed
  - id: update-chapter-pools-index
    content: 更新chapterPoolByIndex为6分支映射，重写pools/index.js为~108个export，按20类分组注释
    status: completed
    dependencies:
      - fix-chapter-label
      - split-ent-schedules
      - split-members-to-individual
      - split-chat-male-lead
      - split-daily-buzz
      - build-trainee-pools
      - build-calendar-job-pools
      - build-romance-scene-pools
      - build-secret-relationship-pools
      - build-atmosphere-pools
      - build-milestone-pools
      - build-encounter-pools
      - build-drama-beat-pools
  - id: romance-unlock-gate
    content: romance.js新增checkRomanceUnlock()：5档事业门控(初识/暧昧/约会/恋爱/公开)，综合aff+事业阶段判断
    status: completed
    dependencies:
      - add-state-fields-zero-pop
  - id: engine-date-cooldown
    content: engine.js约会冷却：_lastDateDay+连续计数，连约2次强制冷却3天
    status: completed
  - id: ui-date-button-grey
    content: ui.js约会按钮灰化：未解锁时显示原因（出道前/好感不足/冷却中）
    status: completed
    dependencies:
      - romance-unlock-gate
  - id: prompts-refactor
    content: prompts.js重构为三段式prompt：角色设定+压缩记忆+场景素材(天气/心情/男主状态/事件)+写作要求+1000-1500字输出+2-3选项JSON
    status: completed
    dependencies:
      - add-state-fields-zero-pop
  - id: engine-milestone-beat
    content: engine.js里程碑触发：出道/第一次一位/告白/阶段跨越时注入storyBeat要求AI写高光剧情
    status: completed
  - id: update-agents-md
    content: AGENTS.md全面更新：9状态体系+数据驱动架构+108池子中文清单(20类分组)+npcNetwork系统4+好感门控+AI叙事框架
    status: completed
    dependencies:
      - fix-chapter-label
      - update-chapter-pools-index
  - id: validate-all
    content: 全量语法验证：node -c检查所有约115个文件（新池子文件+代码改造文件）
    status: completed
    dependencies:
      - fix-chapter-label
      - fix-chat-stage-filter
      - fix-rival-name
      - fix-secret-dedup
      - fix-entSim-flags
      - remove-livestream-gift-secrets
      - strengthen-prompt
      - split-members-to-individual
      - split-ent-schedules
      - split-chat-male-lead
      - split-daily-buzz
      - build-trainee-pools
      - build-calendar-job-pools
      - build-romance-scene-pools
      - build-secret-relationship-pools
      - build-atmosphere-pools
      - build-milestone-pools
      - build-encounter-pools
      - build-drama-beat-pools
      - add-state-fields-zero-pop
      - engine-trainee-debut
      - cycle-filterByRequire
      - utils-canTrigger
      - update-chapter-pools-index
      - romance-unlock-gate
      - engine-date-cooldown
      - ui-date-button-grey
      - prompts-refactor
      - engine-milestone-beat
---

## 产品概述

对娱乐模拟器(entSim)进行明星志愿3式全面重构。核心原则：这是一个本地恋爱游戏，AI只代写1000-1500字主线剧情（省手），其余全部由池子驱动。池子决定场景素材，AI负责叙事。每个池子独立文件，标注中文名与用途，方便增删。条目自带require标签，_utils.js统一filterByRequire过滤。娱乐圈是恋爱背景板，好感进度受事业阶段约束。

## 核心设计决策

### 练习生期（人气=0，纯天数驱动）

练习生未出现在公众视野，不存在人气概念。UI隐藏人气栏，prompt移除人气/粉丝/知名度词汇。出道必然发生：

- 前期：dayCount 1-4天（约12回合）
- 中期：dayCount 5-10天
- 后期：dayCount 11天起
- 出道：后期累计2-4天触发"出道最终评价"事件，debutDay置位，人气=career.startPopularity

### 出道后6阶段（人气驱动，参考明星志愿3称号体系）

新人出道(0-14) → 崭露头角(15-34) → 稳步上升(35-54) → 人气偶像(55-74) → 顶流巨星(75-89) → 传奇殿堂(90+)

### 好感-事业三层门控（仿明星志愿3恋爱路线）

初识(默认) → 暧昧(好感≥20+练习生中期) → 约会(好感≥50+出道) → 恋爱(好感≥70+崭露头角) → 公开(好感≥85+人气偶像)
约会冷却：连约2次强制冷却3天

### AI叙事框架

每天3时段循环：池子抽取日程(filterByRequire) → 池子抽取场景种子（天气/心情/偶遇/危机等） → 检查里程碑触发 → 拼接prompt(角色设定+压缩记忆+场景素材+写作要求) → AI生成1000-1500字沉浸式剧情+2-3选项 → 玩家选择 → 更新状态+压缩记忆 → 推进时段

### 数据驱动调度

池子条目自带require标签，_utils.js统一canTrigger/filterByRequire过滤，不再散落if/else门控。

## 技术栈

- Language: JavaScript (ES Modules)，var声明，+字符串拼接
- Runtime: browser / Node.js 18+，Vanilla JS + Vite
- AI API: DeepSeek (deepseek-chat)
- 无新依赖

## 全量池子清单（96个数据池 + 2个工具文件）

### 一、世界设定（6个文件，已有）

1. `company-names.js` | COMPANY_NAMES | 公司名池 | 韩国经纪公司名（HYBE/SM/JYP等真实+虚构） | 20条
2. `group-names.js` | GROUP_NAMES | 女团名池 | 虚拟女团英文名+粉丝名配对 | 60条
3. `group-concepts.js` | GROUP_CONCEPTS | 团概念池 | 女团风格概念（Teen Crush/Girl Crush等） | 40条
4. `hit-songs.js` | HIT_SONGS | 出圈曲池 | 女团代表歌曲描述 | 80条
5. `teammate-names.js` | TEAMMATE_NAMES | 队友名池 | 韩国女爱豆常见姓名 | 100条
6. `sister-roles.js` | SISTER_ROLES | 姐姐角色池 | 女团队友角色定位模板 | 30条

### 二、SEVENTEEN成员（16个文件，members.js/svt-teammate.js拆分）

7. `svt-teammate-profiles.js` | SVT_TEAMMATE_PROFILES | 成员标签池 | 13人完整标签(艺名/emoji/性格/出生年) | 13条
8. `svt-teammate-events.js` | SVT_TEAMMATE_EVENT_POOL | 队友事件池 | 队友客串场景(练习室/走廊/食堂/待机室等27种) | 200条
9. `teammate-flavor.js` | TEAMMATE_FLAVOR | 队友支线池 | 按roleTag触发的队友互动flavor | 5条
10. `member-scoups.js` | MEMBER_SCOUPS | 胜澈行为池 | 按真实人设预写触发行为 | 3条
11. `member-jeonghan.js` | MEMBER_JEONGHAN | 净汉行为池 | 按真实人设预写触发行为 | 3条
12. `member-joshua.js` | MEMBER_JOSHUA | 知秀行为池 | 按真实人设预写触发行为 | 3条
13. `member-jun.js` | MEMBER_JUN | 俊辉行为池 | 按真实人设预写触发行为 | 3条
14. `member-hoshi.js` | MEMBER_HOSHI | 顺荣行为池 | 按真实人设预写触发行为 | 3条
15. `member-wonwoo.js` | MEMBER_WONWOO | 圆佑行为池 | 按真实人设预写触发行为 | 3条
16. `member-woozi.js` | MEMBER_WOOZI | 知勋行为池 | 按真实人设预写触发行为 | 3条
17. `member-dk.js` | MEMBER_DK | 硕珉行为池 | 按真实人设预写触发行为 | 3条
18. `member-mingyu.js` | MEMBER_MINGYU | 珉奎行为池 | 按真实人设预写触发行为 | 3条
19. `member-the8.js` | MEMBER_THE8 | 明浩行为池 | 按真实人设预写触发行为 | 3条
20. `member-seungkwan.js` | MEMBER_SEUNGKWAN | 胜宽行为池 | 按真实人设预写触发行为 | 3条
21. `member-vernon.js` | MEMBER_VERNON | 瀚率行为池 | 按真实人设预写触发行为 | 3条
22. `member-dino.js` | MEMBER_DINO | 灿行为池 | 按真实人设预写触发行为 | 3条

### 三、练习生三阶段（5个文件，新建）

23. `trainee-early.js` | TRAINEE_EARLY_POOL | 练习生前期日程池 | 基础声乐/舞蹈/礼仪/体测/第一天迷路/第一次月末评价 | 30条
24. `trainee-mid.js` | TRAINEE_MID_POOL | 练习生中期日程池 | 编舞/和声/表情管理/综艺感/镜头感/团队合作 | 30条
25. `trainee-late.js` | TRAINEE_LATE_POOL | 练习生后期日程池 | 出道组筛选/出道曲排练/个人VCR/MV概念会议/最终名单 | 30条
26. `trainee-events.js` | TRAINEE_EVENTS | 练习生事件池 | 月末评价/被前辈夸/同期被刷/社内Showcase/出道触发事件 | 50条
27. `trainee-chat.js` | TRAINEE_CHAT | 练习生聊天池 | 哥哥鼓励30条+情敌暗自较劲30条 | 60条

### 四、章节日程（10个文件，ent-schedules.js拆分）

28. `schedule-common.js` | COMMON_POOL | 通用日程池 | 出道后通用行程(30%概率抽取) | 50条
29. `schedule-related.js` | RELATED_POOL | 相关行程池 | 与男主/情敌/哥哥相关的行程 | 50条
30. `schedule-trainee.js` | TRAINEE_POOL | 旧练习生日程池 | 保留作fallback | 50条
31. `schedule-chapter1-novice.js` | CHAPTER1_NOVICE | 新人出道日程池 | 首次打歌/首签售/新人采访/出道舞台 | 50条
32. `schedule-chapter2-sprouting.js` | CHAPTER2_SPROUTING | 崭露头角日程池 | 小型打歌/电台/路演/首次专访/校园演出（新建） | 30条
33. `schedule-chapter2-rising.js` | CHAPTER2_RISING | 稳步上升日程池 | 回归/巡演/代言/综艺/商演 | 50条
34. `schedule-chapter3-peak.js` | CHAPTER3_PEAK | 人气偶像日程池 | 大赏/世巡/顶级代言/国民综艺 | 51条
35. `schedule-chapter4-legend.js` | CHAPTER4_LEGEND | 传奇殿堂日程池 | 致敬表演/终身成就/退休企划 | 50条
36. `schedule-chapter5-topstar.js` | CHAPTER5_TOPSTAR | 顶流巨星日程池 | 世界巡演/Billboard/自传/纪录片（新建） | 30条
37. `schedule-boygroup.js` | BOYGROUP_POOL | 男团日程池 | 与男主/情敌/哥哥行程交叉 | 50条

### 五、聊天系统（8个文件，chat-male-lead.js拆分）

38. `chat-male-lead.js` | CHAT_MALE_LEAD | 男主聊天池 | greet/stage/worry/romantic/jealous 5频道含快捷回复 | ~300条
39. `chat-brother.js` | CHAT_BROTHER | 哥哥聊天池 | 哥哥线纯文本消息 | 60条
40. `chat-rival.js` | CHAT_RIVAL | 情敌聊天池 | 情敌线纯文本消息 | 60条
41. `chat-manager.js` | CHAT_MANAGER | 经纪人聊天池 | 经纪人工作相关消息 | 60条
42. `chat-group.js` | GROUP_CHAT | 团群聊池 | 女团群聊日常 | 60条
43. `chat-sasaeng.js` | CHAT_SASAENG | 私生聊天池 | 私生骚扰消息 | 60条
44. `chat-trainee-brother.js` | TRAINEE_CHAT_BROTHER | 练习生-哥哥聊天池 | 月末评价关心/带夜宵探班/受伤问询（新建） | 30条
45. `chat-trainee-rival.js` | TRAINEE_CHAT_RIVAL | 练习生-情敌聊天池 | 暗自较量/出道组名额/训练进度（新建） | 30条

### 六、男主/感情线（6个文件，已有）

46. `male-lead-init.js` | MALE_LEAD_INITIATIVE_POOL | 男主主动池 | 好感0→80分档解锁主动互动 | 200条
47. `male-contact.js` | CONTACT_TYPE_POOL | 男主联络池 | 电话/私信/哥哥转达(含3选项) | 60条
48. `contact-progression.js` | CONTACT_PROGRESSION | 好感铺垫池 | 好感阈值0→60分档每日触发 | 200条
49. `jealousy-events.js` | JEALOUSY_EVENTS_POOL | 吃醋事件池 | 男主吃醋/前任吃醋/情敌视角 | 200条
50. `dating-rumors.js` | RUMOR_POOL | 绯闻池 | 同款物品/私生照片/Dispatch爆料 | 200条
51. `oneheart-events.js` | ONEHEART_RANDOM_EVENTS | 1v1随机池 | 暧昧/日常/情感/戏剧/试探/告白前 | 200条

### 七、哥哥线（3个文件，已有）

52. `brother-events.js` | BROTHER_EVENT_POOL | 哥哥事件池 | 按支持度-3到+3变化触发 | 30条
53. `brother-side-plots.js` | BROTHER_SIDE_PLOTS | 哥哥支线池 | 不影响主线的哥哥支线(创作瓶颈/黑粉) | 3条
54. `brother-tests.js` | BROTHER_ADVANCE_TESTS | 哥哥考验池 | 按好感15/40/70三档递进 | 3条

### 八、情敌/秘密（4个文件，已有）

55. `rival-advance-events.js` | RIVAL_ADVANCE_EVENTS | 情敌进攻池 | intimacy驱动的主动事件 | 4条
56. `secret-discovery-events.js` | SECRET_DISCOVERY_EVENTS | 秘密撞破池 | EXO追星秘密被发现场景(纯EXO向) | 3条
57. `industry-events.js` | INDUSTRY_EVENTS | 行业事件池 | 台前幕后通用行业事件 | 6条
58. `special-events.js` | SPECIAL_EVENTS | 特殊事件池 | 行业/情敌/秘密/更深行业混合 | 200条

### 九、事业/女团（4个文件，已有）

59. `career-setbacks.js` | CAREER_SETBACKS | 事业挫折池 | 8phase练习生→巅峰挫折 | 200条
60. `girlgroup-events.js` | GIRLGROUP_EVENTS | 女团事件池 | 回归/舞台/签售/宿舍/危机11分类 | 200条
61. `incident-events.js` | INCIDENT_EVENTS_POOL | 突发事件池 | 惊喜/丑闻/生病/深夜/队友12类 | 200条
62. `daily-engagement.js` | DAILY_ENGAGEMENT_POOL | 每日营业池 | SNS/Live/舞台/时尚/综艺/粉丝6类 | 200条

### 十、媒体/舆论（7个文件，daily-buzz.js/daily-buzz-templates.js拆分）

63. `buzz-hot-search.js` | DAILY_BUZZ_HOT | 热搜池 | 女主相关热搜标题 | ~100条
64. `buzz-fan-discussion.js` | DAILY_BUZZ_FAN | 粉丝讨论池 | 粉丝圈讨论文本 | ~100条
65. `buzz-media-title.js` | DAILY_BUZZ_MEDIA | 媒体标题池 | 媒体新闻报道标题 | ~100条
66. `hot-search-replies.js` | HOT_SEARCH_REPLY_POOL | 热搜评论区池 | 热搜+粉丝评论+媒体口径三元组 | 200条
67. `dispatch-news.js` | DISPATCH_POOL | 八卦新闻池 | Dispatch偷拍/独家/分析 | 200条
68. `external-hot.js` | EXTERNAL_HOT | 外部热搜池 | BTS/BLACKPINK/SEVENTEEN等外部话题 | ~90条
69. `news-templates.js` | NEWS_TEMPLATES | 新闻模板池 | 含{name}/{groupName}占位符 | 50条

### 十一、作品/品牌/奖项（4个文件，已有）

70. `releases.js` | RELEASE_POOL | 作品发布池 | 单曲/写真/练习室影片/合作曲/OST | 200条
71. `brand-offers.js` | BRAND_OFFER_POOL | 品牌代言池 | 美妆/时尚/饮品/食品/数码10品类 | 200条
72. `awards.js` | AWARD_POOL | 奖项池 | 新人奖/人气奖/本赏/大赏4类 | 200条
73. `music-charts.js` | CHART_POOL | 音源榜池 | Melon/Genie/Bugs/FLO/VIBE多平台 | 200条

### 十二、打歌/演唱会/签售/回归/杂志（5个文件，已有）

74. `music-show-pool.js` | MUSIC_SHOW_POOL | 打歌节目池 | MCD/音银/人歌/音中/TheShow/ShowChampion | 200条
75. `concert-pool.js` | CONCERT_POOL | 演唱会池 | 官宣→售票→彩排→现场→安可全周期 | 200条
76. `fansign-pool.js` | FANSIGN_POOL | 签售会池 | 入场/互动/发箍/手写信/海外/视频签售 | 200条
77. `comeback-cycle.js` | COMEBACK_CYCLE_POOL | 回归周期池 | 预告→概念照→MV→初放→一位→末放 | 200条
78. `magazine-shoots.js` | MAGAZINE_POOL | 杂志画报池 | W/Elle/Dazed/BAZAAR/Vogue/Allure | 200条

### 十三、综艺/粉丝/日记（3个文件，已有）

79. `variety-shows.js` | VARIETY_SHOW_POOL | 综艺节目池 | 谈话/游戏/音乐/真人秀/观察5种 | 200条
80. `fan-letters.js` | FAN_LETTER_POOL | 粉丝来信池 | support类(含{heroineName}/{fandomName}) | 60条
81. `diary-templates.js` | DIARY_TEMPLATES | 日记模板池 | daily/stage/practice/emotion/worry/dream框架 | 30条

### 十四、日历+通告（2个文件，新建）

82. `calendar-events.js` | CALENDAR_EVENTS | 日历节日池 | 情人节/白色情人节/圣诞/出道纪念日/男主生日 | 30条
83. `job-offers.js` | JOB_OFFER_POOL | 通告选择池 | 电视剧试镜/CF广告/综艺通告/OST/杂志/MC主持 | 40条

### 十五、恋爱场景（6个文件，新建）

84. `romance-backstage.js` | ROMANCE_BACKSTAGE | 后台相遇池 | 待机室/走廊/彩排间/化妆间偶遇男主 | 20条
85. `romance-latenight.js` | ROMANCE_LATENIGHT | 深夜联系池 | 凌晨消息/失眠通话/醉酒发来/他说在楼下 | 15条
86. `romance-public.js` | ROMANCE_PUBLIC | 公共克制池 | 综艺录制偷瞄/颁奖礼眼神/签售会碰见 | 20条
87. `romance-crisis.js` | ROMANCE_CRISIS | 危机支撑池 | 被黑粉攻击/舞台事故/生病时互相守护 | 15条
88. `romance-jealousy.js` | ROMANCE_JEALOUSY_POOL | 吃醋触发池 | 男方吃醋触发/女方吃醋触发场景种子 | 20条
89. `romance-confession.js` | ROMANCE_CONFESSION | 告白节点池 | 差点告白/正式告白场景/和好契机 | 20条

### 十六、地下恋专属（4个文件，新建）

90. `secret-comms.js` | SECRET_COMMS | 秘密通讯池 | 暗号/小号/托哥哥传话/歌词暗语 | 15条
91. `secret-nearmiss.js` | SECRET_NEARMISS | 差点暴露池 | 狗仔蹲点/私生跟踪/粉丝巧合撞见 | 15条
92. `secret-fan-clues.js` | SECRET_FAN_CLUES | 粉丝线索池 | 同款被扒/定位重叠/聊天截图背景被扒 | 10条
93. `secret-company-warning.js` | SECRET_COMPANY | 公司警告池 | 经纪人暗示/社长谈话/合约条款提醒 | 10条

### 十七、氛围情绪（3个文件，新建）

94. `atmosphere-weather.js` | ATMOSPHERE_WEATHER | 天气氛围池 | 初雪/暴雨/台风/樱花季/凌晨/黎明 | 15条
95. `atmosphere-mood.js` | ATMOSPHERE_MOOD | 女主心情池 | 疲惫/兴奋/孤独/不安/幸福感种子 | 10条
96. `atmosphere-his-state.js` | ATMOSPHERE_HIS_STATE | 男主状态池 | 今天他的状态提示-刚拿一位/被黑/在远处看你 | 10条

### 十八、里程碑高光（3个文件，新建）

97. `milestone-debut.js` | MILESTONE_DEBUT | 出道日场景池 | 出道舞台紧张/初放送/后台深呼吸/哥哥发来消息 | 10条
98. `milestone-first-win.js` | MILESTONE_FIRST_WIN | 一位场景池 | 第一次拿一位/安可舞台哭了/他发来的祝贺 | 10条
99. `milestone-awards.js` | MILESTONE_AWARDS | 颁奖场景池 | 红毯碰面/提名名单/落选/获奖感言/颁奖礼后台 | 20条

### 十九、偶遇场景（4个文件，新建）

100. `encounter-ml.js` | ENCOUNTER_ML | 偶遇男主池 | 他找借口经过/碰巧同一地点/他来探班 | 20条
101. `encounter-rival.js` | ENCOUNTER_RIVAL | 偶遇情敌池 | 三人同框/修罗场/暗流涌动 | 15条
102. `encounter-brother.js` | ENCOUNTER_BROTHER | 哥哥撞见池 | 哥哥撞破你们在一起的秘密互动 | 15条
103. `encounter-others.js` | ENCOUNTER_OTHERS | 旁人起哄池 | 队友/工作人员/化妆师/前辈起哄 | 10条

### 二十、剧情节奏（5个文件，新建）

104. `drama-almost.js` | DRAMA_ALMOST | 差点告白池 | 话到嘴边被打断/电话突然断了/有人推门进来 | 15条
105. `drama-misunderstand.js` | DRAMA_MISUNDERSTAND | 误会池 | 误会男主vs情敌/被成员误会/你误会他 | 20条
106. `drama-coldwar.js` | DRAMA_COLDWAR | 冷战和解池 | 冷战原因→冷战状态→和解契机场景 | 20条
107. `drama-dating-rumor.js` | DRAMA_DATING_RUMOR | 绯闻危机池 | 被传绯闻/公司发声明/粉丝反应两极 | 15条
108. `drama-dilemma.js` | DRAMA_DILEMMA | 二选一困境池 | 事业机会vs他的约定/试镜vs他演唱会 | 15条

### 工具文件（2个）

109. `_utils.js` | 工具函数 | pickFromPool/pickFromPoolMulti/pickFromPoolRotate/pickFanReactions/filterByRequire/canTrigger
110. `index.js` | 统一导出 | 全部~108个常量export

---

## 代码修复项（7项）

### 修复1：章节标签改为6阶段

文件：`src/ent-sim/data.js`（L91-L96），`src/ent-sim/state.js`（L240-L275）

- data.js：CHAPTERS从4项扩展为6项（新人出道/崭露头角/稳步上升/人气偶像/顶流巨星/传奇殿堂），每项含index/name/icon/desc，原index全部+1
- state.js：chapterByPopularity阈值改为6段(90→6, 75→5, 55→4, 35→3, 15→2, 0→1)，checkChapterAdvance移除L261-L264旧出道逻辑（debutDay由engine.js的_debutTriggerDay驱动）

### 修复2：聊天阶段过滤

文件：`src/ent-sim/ui.js` pushDailyChats函数

- 练习生期消息通过池子条目require标签过滤，不再手写if/else关键词黑名单
- CHAT_RIVAL和CHAT_MANAGER在练习生阶段替换为chat-trainee-rival和chat-trainee-brother

### 修复3：情敌名字显示

文件：`src/ent-sim/ui.js` showBusinessPanel函数（L1484附近）

- `(E.rival && E.rival.name) || '情敌'` 改为 `suitorName() || '情敌'`

### 修复4：秘密去重增强

文件：`src/ent-sim/engine.js` applySecretEffect函数

- 新增核心词辅助指纹（EXO/金珉锡/签售/同人文/直拍/周边/小卡/应援），双指纹任一命中即判重

### 修复5：开局标记置位

文件：`src/ent-sim/state.js` initEntSimState末尾（saveGame之前）

- sisterSetting时设GS._relCharIntroduced=true和GS._rivalIntroduced=true

### 修复6：删除直播间刷礼物秘密（4处）

- `src/ent-sim/pools/secret-discovery-events.js`：删除secret_live_gift条目
- `src/ui-renderer.js` L1334：删除_secPool中直播间刷礼物条目
- `src/ent-sim/state.js` L174：删除defaultSecrets()中直播间条目
- `src/ent-sim/pools/special-events.js`：删除secret_rival条目

### 修复7：prompt禁止SEVENTEEN直播间

文件：`src/prompts.js`

- 显式禁止AI生成涉及SEVENTEEN成员直播间的秘密内容，严格限定EXO

---

## 架构改造（6项）

### 改造1：state.js新增字段+人气归零

文件：`src/ent-sim/state.js`

- E.career新增：`traineePhase: 1`, `_lastTraineePhase: 1`, `_debutTriggerDay: 0`
- popularity初始值从3改为0
- 新增`traineePhaseOf(dayCount)`导出函数：≤4→1, ≤10→2, >10→3
- migrateSave为新字段兜底初始化
- chapterByPopularity改为6段阈值

### 改造2：engine.js addPopularity守卫+出道触发

文件：`src/ent-sim/engine.js`

- addPopularity函数开头新增：`if (E && E.career && E.career.debutDay === 0) return;`
- goEntSimNextDay中按dayCount更新traineePhase，阶段跨越推入事件日志
- 后期_debutTriggerDay累计触发出道：≥2+randInt(0,2)天 → 推入出道事件弹窗 → debutDay置位 → 人气=career.startPopularity → chapter初始化为1

### 改造3：cycle.js filterByRequire替代手动分池

文件：`src/ent-sim/cycle.js`

- 练习生分支：按traineePhase用filterByRequire分池（1→EARLY, 2→MID, 3→LATE），子池空fallback到TRAINEE_POOL
- 不再手动写isDebut三分支if/else

### 改造4：_utils.js canTrigger/filterByRequire

文件：`src/ent-sim/pools/_utils.js`

- 新增`canTrigger(entry, E)`：解析require字符串(debut/trainee/aff>=60/chapter>=2等)返回bool
- 新增`filterByRequire(pool, E)`：过滤后返回pool，空则返回原pool兜底

### 改造5：chapterPoolByIndex 6分支+index.js更新

文件：`src/ent-sim/cycle.js`（L38-L43），`src/ent-sim/pools/index.js`

- chapterPoolByIndex从4分支改为6分支映射
- pools/index.js更新为~108个export条目，按20类分组注释

### 改造6：romance.js门控+约会冷却

文件：`src/ent-sim/romance.js`，`src/ent-sim/engine.js`

- romance.js新增`checkRomanceUnlock()`：综合aff+事业阶段返回5档解锁状态
- engine.js约会冷却：_lastDateDay+_dateConsecutive计数器，连约2次冷却3天
- ui.js约会按钮根据unlock状态灰化显示原因

---

## AI叙事重构（2项）

### 重构1：prompts.js三段式prompt

文件：`src/ent-sim/prompts.js`

- 重构为：[角色设定+当前阶段] → [压缩记忆摘要] → [天气/心情/男主状态/事件文本] → [写作要求+输出JSON格式]
- 选项格式规范化：每选项含text+affDelta+risk标签
- token预算提升到6000以支持1000-1500字输出

### 重构2：引擎里程碑storyBeat

文件：`src/ent-sim/engine.js`

- 出道/第一次一位/告白/阶段跨越时注入storyBeat标记
- prompt中要求AI为里程碑场景写高光叙事（区别于日常回合）

---

## 手册更新+验证（2项）

### 手册：AGENTS.md全面重写entSim部分

文件：`AGENTS.md`

- 阶段系统：9状态体系（练习生3子阶段+出道后6阶段），天数驱动+人气阈值表
- 池子清单：108个池子（96数据+12工具），按20类分组，每池含中文名/导出名/文件名/条数
- 架构说明：数据驱动调度、AI叙事框架、好感事业门控
- 补齐npcNetwork系统4、修正模块计数

### 验证：node -c全量语法检查

对所有修改文件（约115个，含新建）执行语法检查。
注意：AGENTS.md非JS文件跳过。

---

## 潜在风险与应对

| 风险 | 应对 |
| --- | --- |
| 旧存档无traineePhase等新字段 | migrateSave全部兜底初始化为1 |
| CHAPTERS从4变6索引越界 | chapterNameOf用CHAPTERS[idx-1]自然适配 |
| 子池30条用完日程重复 | fallback到TRAINEE_POOL(50条)或COMMON_POOL(50条) |
| 池子文件过多导入混乱 | index.js统一导出，外部只import index.js |
| 每日回合数不确定导致天数进度不同玩家差异大 | 练习生期3天约9回合，4天约12回合，体验可控 |
| addPopularity守卫遗漏 | 池子事件均通过addPopularity统一入口 |