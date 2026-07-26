---
name: entsim-v2-full-pools-v4
overview: 全面池化：拆分 29 个内容池（每个 80-300 条，含 fanReactions）到独立文件。间隔压缩至 1-3 天级，回归周期 14天→4天。综艺用独立弹窗（选完即结束），大型录制可嵌套日程。修复 4 Bug + UI 全入口 + 弹窗队列 + 真实化行业细节。~4000 条预写。
todos:
  - id: fix-migrate-save
    content: 修复 state.js migrateSave() 第 495 行后新增 8 个 v2 字段兜底（_jealousLevel/intimacyUnlocked/romanceMilestones/maleContactTimer/fanLetterDay/brandOfferDay/releaseCD/awardDay），初始化 _entSimPopupQueue 为 []，新增 _entSimBubblePhotoDesc/_entSimChartTrack/_entSimComebackProgress 字段
    status: pending
  - id: fix-male-contact-popup
    content: 在 ui.js 新增 showMaleContactPopup() 独立弹窗函数（仿照 showFanLetterPopup 模式，显示来电/私信内容+自动消失），在 engine.js 的 goEntSimNextDay 中触发时推入 _entSimPopupQueue；扩充 CONTACT_TYPE_POOL 补充 brother_relay 和 brother_tentative 子池各 20 条
    status: pending
  - id: fix-anniversary-panel
    content: 在 ui.js 的 renderLovePanel 恋情面板中新增纪念日折叠行（读取 _romanceMilestones，列出牵手日/拥抱日/接吻日/告白日的 days 计数），在 romance.js 新增 getMilestoneList() 函数返回格式化数据
    status: pending
  - id: create-pools-directory
    content: 创建 src/ent-sim/pools/ 目录，建立 index.js（统一 re-export 29 个池子 + pickFromPool 重导出）和 _utils.js（pickFromPool 函数实现，支持按 cat 过滤和轮替避免重复）
    status: pending
  - id: split-existing-pools-1
    content: 拆分旧池子（第一批 10 个）：fan-letters(200)/brand-offers(150)/male-contact(120)/releases(120)/awards(80)/daily-buzz(300)/news-templates(130)/daily-engagement(120)/girlgroup-events(120)/oneheart-events(80)，每条内嵌 fanReactions 子数组（5 条短评），从 data.js/pools-v2.js 提取现有数据并扩充至目标条数
    status: pending
    dependencies:
      - create-pools-directory
  - id: split-existing-pools-2
    content: 拆分旧池子（第二批 7 个）：svt-teammate(15→100)/ent-schedule(33→150 预设 {morning,afternoon,evening} 三段式组合)/brother-events(7→80)/male-lead-init(7→80)/special-events(合并 3 池 14→80)/jealousy-events(合并 4 池 42→100)/incident-events(合并 4 池 42→100)，扩充并内嵌 fanReactions
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-ai-replacement-pools
    content: 新建 AI 替代池子：hot-search-replies(200 条，结构 {hotSearch,fanReplies:[3条],mediaTake}) 和 diary-templates(60 条，结构 {type,framework,blanks} 日记模板框架)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-enhancement-pools
    content: 新建 6 个增强模块池子（每条内嵌 fanReactions）：variety-shows(100 条四类各 25，使用真实韩国节目名)/dispatch-news(80 条)/magazine-shoots(80 条六刊各~13)/music-charts(60 条)/dating-rumors(80 条)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-realism-pools
    content: 新建 4 个真实化池子（每条内嵌 fanReactions）：comeback-cycle(100 条，7 阶段各~14 条)/concert-pool(80 条，5 阶段各 16 条)/music-show-pool(60 条，4 打歌节目各 15 条)/fansign-pool(50 条，4 环节各~12 条)
    status: pending
    dependencies:
      - create-pools-directory
  - id: update-imports-and-cleanup
    content: 更新 engine.js/ui.js/brother.js/immersion.js/cycle.js 的 import 路径为 pools/index.js，删除 pools-v2.js，从 data.js 移除 12 个已拆分的池子定义，从 worlds/entertainment.js 移除 ENT_SCHEDULE_POOL
    status: pending
    dependencies:
      - split-existing-pools-1
      - split-existing-pools-2
      - create-ai-replacement-pools
      - create-enhancement-pools
      - create-realism-pools
  - id: shorten-all-intervals
    content: 在 engine.js 的 goEntSimNextDay 中缩短所有触发器间隔：粉丝来信 1 天/品牌代言 2 天/季度颁奖 4 天/发布 CD 1 天/主动联络 2 天/综艺 2 天/Dispatch 3 天/画报 3 天/绯闻 3 天/音源每 1 天；新增 runEntSimDailyTriggers() 函数统一管理 12 个触发器并收集弹窗事件推入 _entSimPopupQueue
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-schedule-pool
    content: 改造日程系统：cycle.js 的 rollDailyAgenda 改为从 ent-schedule.js 读取预设三段式组合（按职业取池），prompts.js 新增日程锁定规则（强制 AI 按上午/下午/夜晚标签展开叙事）
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-hot-search-linked
    content: 改造热搜关联系统：immersion.js 的 generateDailyBuzz 改为从 hot-search-replies.js 抽取热搜→自动带出 fanReplies+mediaTake 写入右栏，移除 generateBuzzRepliesAI 和 generateFanReaction 调用，新增 injectFanReactionsToPanel() 函数从事件条目 fanReactions 抽 3 条注入
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-bubble-ui-photo
    content: 改造泡泡 UI：在 ui.js 的泡泡渲染中，照片框从照相机 emoji 改为显示 AI 返回的照片描述文字（从 sendBubbleMessage 返回值读取 photoDesc 字段），泡泡内容 msgToFans+fanReplies 保持 AI 生成
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-diary-system
    content: 改造日记系统：engine.js 的 generateEntSimDiary/generateEntSimDiaryHis 改为从 diary-templates.js 抽取模板框架（按当天事件类型匹配 framework），AI 只填空具体细节（blanks），而非全文自由生成
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-popup-queue
    content: 在 ui.js 实现 _entSimPopupQueue 弹窗队列机制：checkAndShowPendingPopups 改为读取 GS._entSimPopupQueue 数组，shift 出第一个弹窗展示，弹窗关闭回调递归触发下一个，队列为空时停止
    status: pending
    dependencies:
      - fix-male-contact-popup
  - id: integrate-enhancement-modules
    content: 集成 6 个增强模块：engine.js 在 runEntSimDailyTriggers 中新增综艺(showVarietyShowPopup)/Dispatch(showDispatchPopup)/画报(showMagazinePopup)/音源(chartUpdate)/绯闻(showRumorPopup)触发器，每个触发器从对应池子抽取条目，推入弹窗队列，数值结算写入 state
    status: pending
    dependencies:
      - shorten-all-intervals
      - create-enhancement-pools
  - id: integrate-realism-modules
    content: 集成 4 个真实化模块：engine.js 新增回归周期管理器（发布作品后启动 4 天周期，每天更新右栏进度条并弹窗）、演唱会管理器（人气≥50 触发 2 天周期）、签售会触发（日程标记+互动弹窗）、打歌节目（融入日程叙事+右栏 fanReactions）
    status: pending
    dependencies:
      - shorten-all-intervals
      - create-realism-pools
  - id: add-all-ui-buttons
    content: 在 ui.js 的 renderQuickActions 中新增 6 个快捷按钮：📬信箱(手动查看粉丝来信历史)/💼代言(查看代言邀约)/🏆奖项(查看颁奖记录)/🎬综艺(手动触发综艺通告)/📸画报(手动触发杂志画报)/📰新闻室(查看 Dispatch 新闻)，每个按钮根据 CD 状态显示"CD:N"或"已就绪"
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - refactor-bubble-ui-photo
  - id: update-prompt-injections
    content: 在 prompts.js 的 buildEntSimSystemPrompt 中新增综艺节目场景指令（录制/播出期行为规则）、绯闻公关场景指令（否认/沉默/承认三种语气指引）、Dispatch 新闻场景指令（偷拍/爆料叙事风格）、日程锁定规则（上午=主档展开/下午=关联行程/夜晚=自由时段），同步更新 buildEntSimUserMessage 的日程注入格式为三段式标签
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - integrate-realism-modules
      - refactor-schedule-pool
---

## 产品概述

对 entSim 娱乐圈模拟器进行 V3 全面池化改造：将 29 个内容池拆分为独立文件（每条内嵌 fanReactions 粉丝反应子数组），修复 4 个关键 Bug，触发间隔从 5-30 天大幅压缩至 1-4 天级，回归周期 14 天压缩为 4 天，演唱会 5 天压缩为 2 天。新增 10 个模块（4 真实化 + 6 增强），所有事件以独立弹窗或日程嵌套方式呈现。总计 31 个文件、约 4100 条预写内容。

## 核心功能

### 修复 4 个 Bug

1. migrateSave() 缺失 8 个 v2 字段兜底（_jealousLevel / _intimacyUnlocked / _romanceMilestones / _maleContactTimer / _lastFanLetterDay / _lastBrandOfferDay / _releaseCD / _lastAwardDay），旧存档升级后字段为 undefined 导致立即异常触发
2. 主动联络仅文本注入 prompt，无独立弹窗，玩家容易错过
3. CONTACT_TYPE_POOL 仅 80 条（4 子池），engine.js 有 brother 死代码分支
4. 纪念日仅有 toast 一闪而过，无独立面板回顾

### 间隔大幅压缩（每游戏日 = 3 时段 × 5-7 回合）

粉丝来信 每 1 天、品牌代言 2 天、季度颁奖 4 天、发布 CD 1 天、主动联络 2 天、综艺 2 天、Dispatch 3 天、杂志画报 3 天、绯闻 3 天、音源每 1 天。回归周期 14 天→4 天（D1预告→D2试听→D3回归→D4打歌）。演唱会 5 天→2 天。

### 事件内嵌 fanReactions

11 个事件池每个条目内嵌 fanReactions 子数组（5 条短评），事件触发时自动抽取 3 条写入右栏粉丝讨论区。

### 新增 10 个模块

真实化 4：回归周期(100 条)、演唱会(80 条)、打歌节目(60 条)、签售会(50 条)。增强 6：综艺节目(100 条，真实韩国节目名)、Dispatch 爆料(80 条)、杂志画报(80 条)、音源榜单(60 条)、绯闻(80 条)。

### 呈现方式

综艺(大型)：日程嵌套+关键环节弹窗。综艺(轻量)：纯独立弹窗。回归周期：右栏进度条+每阶段弹窗。演唱会：日程标记+节点弹窗。打歌：融入叙事+右栏反应。签售会：日程触发+互动弹窗。颁奖：大弹窗。所有弹窗关闭即结束。

### AI 使用边界

保留 AI（7 处）：剧情正文、选项、聊天回复、泡泡内容、日记填空、记忆压缩、种子/结局。池子替代 AI（3 处）：热搜关联(200 条)、日记模板(60 条)、粉丝反应（事件自带）。

## 技术栈

- 语言：JavaScript (ES Modules)，使用 var 声明
- 架构：纯前端单页应用，Vite 构建
- 数据：预写静态池 + localStorage 存档
- AI：DeepSeek chat API

## 实现策略

### 核心原则

代码决定触发时机、内容、数值，AI 只负责把事件写成叙事文案。不新建 UI 页面类型，复用 showEntSimModal() / showToast() / _entSimPendingEvent 通道。

### 池子文件独立化

每个池子独立文件，pools/index.js 统一 re-export，pools/_utils.js 提供 pickFromPool()。数据结构示例：

```js
export var VARIETY_SHOW_POOL = [
  { cat:'talk', t:'《认哥》——姜虎东突然问理想型，全场起哄。', pop:4, exp:2,
    fanReactions: ['姐姐综艺感绝了','这段我反复看了十遍','理想型说的是谁啊好想知道','综艺新人王','转圈圈.gif']
  }
];
```

### 弹窗队列机制

_entSimPopupQueue 数组替代 _entSimFanLetter / _entSimBrandOffer / _entSimAward 三个独立标志。checkAndShowPendingPopups() 从队列依次弹出，前一个关闭后回调触发下一个。

### 热搜关联改造

抽到一条热搜自动从 hot-search-replies.js 带出 3 条 fanReplies + 1 条 mediaTake，不调 AI。移除 generateBuzzRepliesAI 和 generateFanReaction。

### 日程池改造

从单 key 改为预设 {morning, afternoon, evening} 完整组合，AI 在给定框架内展开叙事。prompts.js 新增日程锁定规则。

### 泡泡 UI 改造

照片框从照相机图标改为显示 AI 返回的照片描述文字（如"练习室自拍·汗湿的刘海"），泡泡内容保持 AI 生成。

## 核心数据流

```mermaid
flowchart TD
    A[goEntSimNextDay 每日换天] --> B{runEntSimDailyTriggers}
    B --> C[吃醋值衰减]
    B --> D[主动联络 → showMaleContactPopup]
    B --> E[粉丝来信 → queue popup]
    B --> F[品牌代言 → queue popup]
    B --> G[季度颁奖 → queue popup]
    B --> H[综艺节目 → queue popup]
    B --> I[Dispatch → queue popup]
    B --> J[杂志画报 → queue popup]
    B --> K[绯闻 → queue popup]
    B --> L[返回周期进度条更新]
    B --> M[音源榜单更新]
    B --> N[纪念日 toast]
    C & D & E & F & G & H & I & J & K & L & M & N --> O[AI 生成叙事]
    O --> P[渲染 + checkAndShowPendingPopups]
```

## 目录结构（31 个文件）

```
src/ent-sim/pools/
├── index.js                 ← 统一导出 29 个池子
├── _utils.js                ← pickFromPool 工具函数
├── fan-letters.js           (200条, fanReactions)
├── brand-offers.js          (150条, fanReactions)
├── male-contact.js          (120条)
├── releases.js              (120条, fanReactions)
├── awards.js                (80条, fanReactions)
├── daily-buzz.js            (300条)
├── hot-search-replies.js    (200条, fanReplies+mediaTake) [NEW]
├── news-templates.js        (130条)
├── daily-engagement.js      (120条, fanReactions)
├── girlgroup-events.js      (120条, fanReactions)
├── oneheart-events.js       (80条)
├── svt-teammate.js          (100条)
├── ent-schedule.js          (150条, {morning,afternoon,evening})
├── brother-events.js        (80条)
├── male-lead-init.js        (80条)
├── special-events.js        (80条)
├── jealousy-events.js       (100条)
├── incident-events.js       (100条)
├── diary-templates.js       (60条) [NEW]
├── variety-shows.js         (100条, fanReactions) [NEW]
├── dispatch-news.js         (80条, fanReactions) [NEW]
├── magazine-shoots.js       (80条, fanReactions) [NEW]
├── music-charts.js          (60条, fanReactions) [NEW]
├── dating-rumors.js         (80条, fanReactions) [NEW]
├── comeback-cycle.js        (100条, fanReactions) [NEW]
├── concert-pool.js          (80条, fanReactions) [NEW]
├── music-show-pool.js       (60条, fanReactions) [NEW]
└── fansign-pool.js          (50条, fanReactions) [NEW]
```

## 涉及修改的现有文件（10 个）

| 文件 | 改动内容 |
| --- | --- |
| src/state.js | migrateSave() 补 8 个 v2 字段兜底（第 495 行后新增 if 块），新增 _entSimPopupQueue / _entSimBubblePhotoDesc / _entSimChartTrack / _entSimComebackProgress / _entSimHotSearchStack 字段 |
| src/ent-sim/engine.js | 缩短全部间隔（第 308/322/331/340/342 行），新增 runEntSimDailyTriggers() 统一管理 12 个触发器，泡泡 UI 照片描述注入，日程池化改造，回归周期/演唱会进度管理 |
| src/ent-sim/ui.js | 新增 6 个快捷按钮（信箱/代言/奖项/综艺/画报/新闻室），新增 showMaleContactPopup/showVarietyShowPopup/showDispatchPopup/showMagazinePopup/showRumorPopup/showFansignPopup 弹窗函数，泡泡照片框改描述文字，纪念日面板，弹窗队列渲染，右栏回归进度条 |
| src/ent-sim/romance.js | 纪念日面板数据函数（返回 _romanceMilestones 格式化列表），checkAnniversaries 适配缩短间隔 |
| src/ent-sim/prompts.js | buildEntSimSystemPrompt 新增综艺/绯闻/Dispatch 场景指令 + 日程锁定规则（上午=主档/下午=关联/夜晚=自由），buildEntSimUserMessage 日程注入格式改为三段式 |
| src/ent-sim/immersion.js | generateDailyBuzz 改为从 hot-search-replies.js 抽取热搜自动带出 fanReplies+mediaTake，移除 generateBuzzRepliesAI 和 generateFanReaction 调用，新增 injectFanReactionsToPanel() 从事件条目 fanReactions 子数组抽取 |
| src/ent-sim/data.js | 移除 FAN_LETTER_POOL / BRAND_OFFER_POOL / GIRLGROUP_EVENTS / DAILY_BUZZ_TEMPLATES / NEWS_TEMPLATES / DAILY_ENGAGEMENT_POOL / ONE_HEART_RANDOM_EVENTS / SVT_TEAMMATE_EVENT_POOL / INDUSTRY_EVENTS / RIVAL_ADVANCE_EVENTS / SECRET_DISCOVERY_EVENTS / ENT_SCHEDULE_POOL（保留 TEAMMATE_FLAVOR / SVT_TEAMMATE_PROFILES / COVER_MECHANISMS 等基础设施数组） |
| src/ent-sim/pools-v2.js | 删除，内容迁移到 pools/releases.js / pools/male-contact.js / pools/awards.js |
| src/ent-sim/brother.js | 移除 BROTHER_EVENT_POOL / MALE_LEAD_INITIATIVE_POOL 定义，改为 import from pools/index.js |
| src/worlds/entertainment.js | 移除 ENT_SCHEDULE_POOL 定义，改为 import from pools/index.js |


## 性能与可靠性

- 31 个池子文件在模块 import 时一次性加载到内存，运行时零 I/O
- 弹窗队列顺序展示避免 z-index 冲突
- migrateSave() 每个新字段一行兜底，保证旧存档加载不报错
- initEntSimState() + migrateSave() 双重兜底
- 所有 AI 生成文本插入 DOM 前经 escHtml() 转义