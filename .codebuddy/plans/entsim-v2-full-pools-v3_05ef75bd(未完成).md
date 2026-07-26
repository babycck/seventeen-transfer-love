---
name: entsim-v2-full-pools-v3
overview: 全面代码池子化：热搜→粉丝讨论关联、泡泡内容池化+照片框改描述、日程预设上午/下午/晚上组合、娱乐圈新闻标题池调用、曝光粉丝反应池化、网友热议池化。目标：最大限度用池子替代 AI 即时生成，AI 只写剧情正文+选项+聊天+日记。
todos:
  - id: fix-migrate-save
    content: 修复 state.js 的 migrateSave() 缺失的 8 个 v2 字段兜底，同时初始化 _entSimPopupQueue 为 []，新增 _entSimBubblePhotoDesc、_entSimChartTrack、_entSimHotSearchStack 字段
    status: pending
  - id: fix-male-contact-popup
    content: 为主动联络新增独立弹窗 showMaleContactPopup() 并扩充 CONTACT_TYPE_POOL 至 120 条（补充 brother_relay 和 brother_tentative 子池各 20 条）
    status: pending
  - id: fix-anniversary-panel
    content: 在恋情面板 renderLovePanel 中新增纪念日折叠行，列出 _romanceMilestones 中所有已记录的里程碑及对应天数
    status: pending
  - id: create-pools-directory
    content: 创建 src/ent-sim/pools/ 目录，建立 index.js（统一导出 30 个池子 + pickFromPool 重导出）和 _utils.js（pickFromPool 函数）
    status: pending
  - id: split-existing-pools
    content: 拆分 17 个旧池子到独立文件：fan-letters(200)、brand-offers(150)、male-contact(120)、releases(120)、awards(80)、daily-buzz(300)、news-templates(130)、daily-engagement(120)、girlgroup-events(120)、oneheart-events(80)、svt-teammate(15→100)、ent-schedule(33→150 预设上/下/晚组合)、brother-events(7→80)、male-lead-init(7→80)、special-events(合并3池14→80)、jealousy-events(合并4池42→100)、incident-events(合并4池42→100)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-ai-replacement-pools
    content: 新建 4 个 AI 替代池子：hot-search-replies(200条热搜关联，含fanReplies+mediaTake)、bubble-content(150条按事件类型)、bubble-replies(100条)、diary-templates(60条模板框架)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-enhancement-pools
    content: 新建 6 个增强模块池子：variety-shows(100条四类各25)、dispatch-news(80条)、fan-reactions(100条)、magazine-shoots(80条六刊)、music-charts(60条)、dating-rumors(80条)
    status: pending
    dependencies:
      - create-pools-directory
  - id: update-imports-and-cleanup
    content: 更新 engine.js/ui.js/brother.js/immersion.js 的 import 路径为 pools/index.js，删除 pools-v2.js，移除 data.js 和 worlds/entertainment.js 中已拆分的池子
    status: pending
    dependencies:
      - split-existing-pools
      - create-ai-replacement-pools
      - create-enhancement-pools
  - id: shorten-all-intervals
    content: 在 engine.js 的 goEntSimNextDay 中缩短所有触发器间隔：粉丝来信 2-3天、品牌代言 4-5天、季度颁奖 8-10天、发布CD 2-3天、主动联络 3-5天
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-schedule-pool
    content: 改造日程系统：rollDailyAgenda 改为从 ent-schedule.js 预设组合抽取 {morning, afternoon, evening}，prompts.js 新增日程锁定规则（AI 必须按预设时段展开叙事），cycle.js 旧行程池改为从 ent-schedule.js 读取
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-hot-search-linked
    content: 改造热搜关联系统：immersion.js 的 generateDailyBuzz 改为从 hot-search-replies.js 抽取热搜→自动带出 fanReplies+mediaTake，移除 generateBuzzRepliesAI 调用；点击热搜展开时直接从关联数据渲染，不走 AI
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-bubble-system
    content: 改造泡泡系统：sendBubbleMessage 的 msgToFans 从 bubble-content.js 按事件类型抽取，fanReplies 从 bubble-replies.js 抽取；UI 照片框改显示描述文字替代照相机图标；新增 AI 润色可选按钮
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-diary-system
    content: 改造日记系统：generateEntSimDiary/generateEntSimDiaryHis 改为从 diary-templates.js 抽取模板框架，AI 只填空具体细节而非全文生成
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-popup-queue
    content: 在 ui.js 实现 _entSimPopupQueue 弹窗队列机制：checkAndShowPendingPopups 改为从队列依次弹出，前一个关闭后回调触发下一个
    status: pending
    dependencies:
      - fix-male-contact-popup
  - id: integrate-enhancement-modules
    content: 集成 6 个增强模块：engine.js 新增 6 个触发器（综艺/Dispatch/画报/音源/绯闻/粉丝反应），ui.js 新增对应弹窗函数和快捷按钮
    status: pending
    dependencies:
      - shorten-all-intervals
      - create-enhancement-pools
  - id: add-all-ui-buttons
    content: 在 renderQuickActions 中新增全部 UI 快捷按钮：信箱、代言、奖项、综艺、画报、新闻室，每个按钮带独立状态显示（CD倒计时/未读标记），调整按钮布局防止溢出
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - refactor-bubble-system
  - id: update-prompt-injections
    content: 在 prompts.js 的 buildEntSimSystemPrompt 中新增综艺节目场景指令、绯闻公关场景指令、Dispatch 新闻场景指令、日程锁定规则，同步更新 buildEntSimUserMessage 的日程注入格式
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - refactor-schedule-pool
---

## 产品概述

对 entSim 娱乐圈模拟器进行彻底池化改造：将全部可池化内容从 AI 实时生成改为预写静态池驱动，AI 保留范围缩减至 6 项核心功能（剧情正文、选项、聊天回复、日记填空、记忆压缩、一次性事件）。同时修复 4 个关键 Bug、缩短全部触发间隔、补全 UI 快捷入口、新增 6 个增强模块。

## 核心目标

- 新建 10 个池子（6 个增强模块 + 4 个 AI 替代池），拆分/扩充 17 个旧池子，共 30 个独立文件
- 预写内容总量约 3500 条，全部代码驱动
- AI 只写剧情正文 narrative + 选项 options + 聊天回复 + 日记填空 + 记忆压缩 + 种子/结局
- 缩短全部触发间隔至 2-10 天级
- 每项功能有 UI 快捷入口

## AI 使用边界

**保留 AI（6 处）**：剧情正文 narrative、选项 options、聊天回复、日记（池子模板填空）、记忆压缩、种子事件/结局叙事（一次性）

**改为池子（5 处）**：

1. `generateBuzzRepliesAI()` 网友热议 → HOT_SEARCH_REPLY_POOL 热搜关联池
2. `generateFanReaction()` 曝光粉丝反应 → FAN_REACTION_POOL
3. `sendBubbleMessage()` msgToFans → BUBBLE_CONTENT_POOL 按事件类型抽取
4. `sendBubbleMessage()` fanReplies → BUBBLE_REPLY_POOL
5. `generateEntSimDiary()` 日记 → DIARY_TEMPLATE_POOL 模板框架

## 热搜关联改造

抽到一条热搜 → 直接从 HOT_SEARCH_REPLY_POOL 带出对应的 3 条粉丝讨论 + 1 条媒体解读，不调 AI。数据结构：`{ hotSearch: "#标题#", fanReplies: ["讨论1","讨论2","讨论3"], mediaTake: "媒体解读" }`。

## 泡泡改造

- 照片框显示描述文字（如"练习室自拍·汗湿的刘海"）替代照相机图标
- msgToFans 从 BUBBLE_CONTENT_POOL 按事件类型（打歌日/练习室/签售会/日常/综艺/回归/心情/深夜）抽取
- fanReplies 从 BUBBLE_REPLY_POOL 抽取
- AI 润色可选：默认直接发池子内容

## 日程池改造

当前只有行程 key（如"打歌舞台"），AI 自由发挥半天内容。改为预设完整半天行程组合：`{morning:"化妆+彩排", afternoon:"打歌舞台+后台采访", evening:"Vlive直播"}`，AI 在给定框架内展开叙事。

## 修复 4 个 Bug

1. migrateSave() 缺 8 个 v2 字段兜底
2. 主动联络无独立弹窗
3. CONTACT_TYPE_POOL 缺 brother 类型
4. 纪念日仅 toast 无面板

## 技术栈

- 语言：JavaScript (ES Modules)，使用 `var` 声明
- 架构：纯前端单页应用，Vite 构建
- 数据：预写静态池 + localStorage 存档
- AI：DeepSeek chat API（仅用于叙事文本生成）

## 实现策略

### 总体原则

全部功能遵循同一模式：代码决定「何时触发、触发什么、数值多少」，AI 只负责「把事件写成叙事文案」。不新建 UI 页面类型，复用现有 `showEntSimModal()` / `showToast()` / `_entSimPendingEvent` 通道。

### 池子文件独立化

每个池子一个独立文件，`pools/index.js` 统一 re-export。`pools/_utils.js` 提供 `pickFromPool()` 工具函数。好处：可独立修改/扩充，互不干扰。

### 核心数据流

```
goEntSimNextDay 每日换天
  └─ runEntSimDailyTriggers() 统一触发器
       ├─ 吃醋值衰减
       ├─ 主动联络倒计时 → showMaleContactPopup
       ├─ 粉丝来信倒计时 → showFanLetterPopup
       ├─ 品牌代言倒计时 → showBrandOfferPopup
       ├─ 季度颁奖检查 → showAwardPopup
       ├─ 综艺节目检查 → showVarietyShowPopup
       ├─ Dispatch检查 → showDispatchPopup
       ├─ 杂志画报检查 → showMagazinePopup
       ├─ 绯闻检查 → showRumorPopup
       ├─ 纪念日检查 → toast
       ├─ 热搜关联抽取 → 右栏更新
       └─ 日程预设抽取 → prompt注入
```

### 弹窗队列机制

`_entSimPopupQueue` 数组替代 `_entSimFanLetter` / `_entSimBrandOffer` / `_entSimAward` 三个独立标志。`checkAndShowPendingPopups()` 从队列依次弹出，前一个关闭后自动展示下一个。

## 目录结构

```
src/ent-sim/pools/
├── index.js                  ← 统一导出 + pickFromPool
├── _utils.js                 ← 工具函数
│
├── fan-letters.js            (200条) 粉丝来信
├── brand-offers.js           (150条) 品牌代言
├── male-contact.js           (120条) 男主主动联络
├── releases.js               (120条) 作品发布
├── awards.js                 (80条)  颁奖典礼
├── daily-buzz.js             (300条) 每日舆论模板
├── hot-search-replies.js     (200条) 热搜→粉丝讨论关联池 [NEW]
├── news-templates.js         (130条) 娱乐圈新闻标题
├── daily-engagement.js       (120条) 每日营业事件
├── girlgroup-events.js       (120条) 女团专属事件
├── oneheart-events.js        (80条)  1v1随机事件
├── svt-teammate.js           (100条) SEVENTEEN队友偶遇
├── ent-schedule.js           (150条) 偶像日程(预设上/下/晚组合)
├── brother-events.js         (80条)  哥哥事件
├── male-lead-init.js         (80条)  男主主动互动
├── special-events.js         (80条)  特殊事件(行业+情敌+秘密)
├── jealousy-events.js        (100条) 吃醋事件(合并4池)
├── incident-events.js        (100条) 突发事件(合并4池)
│
├── bubble-content.js         (150条) 泡泡消息内容 [NEW]
├── bubble-replies.js         (100条) 泡泡粉丝回复 [NEW]
├── diary-templates.js        (60条)  日记模板框架 [NEW]
│
├── variety-shows.js          (100条) 综艺节目 [NEW]
├── dispatch-news.js          (80条)  Dispatch爆料 [NEW]
├── fan-reactions.js          (100条) 粉丝圈反应 [NEW]
├── magazine-shoots.js        (80条)  杂志画报 [NEW]
├── music-charts.js           (60条)  音源榜单 [NEW]
└── dating-rumors.js          (80条)  绯闻恋爱说 [NEW]
```

共 30 个文件，约 3500 条预写内容。

## 涉及修改的现有文件

| 文件 | 改动内容 |
| --- | --- |
| `src/state.js` | migrateSave() 补 8 个 v2 字段兜底 + _entSimPopupQueue 初始化 + 新状态字段(_entSimBubblePhotoDesc, _entSimChartTrack, _entSimHotSearchStack) |
| `src/ent-sim/engine.js` | 缩短全部间隔 + 泡泡池化(sendBubbleMessage 改为抽取) + 日程池化(rollDailyAgenda 改为预设组合) + runEntSimDailyTriggers() 统一触发器 + 热搜关联逻辑 |
| `src/ent-sim/ui.js` | 新增 6 个快捷按钮(信箱/代言/奖项/综艺/画报/新闻室) + 6 个新弹窗 + 泡泡UI照片框改描述文字 + 纪念日面板 + 弹窗队列渲染 |
| `src/ent-sim/romance.js` | 纪念日面板数据函数 |
| `src/ent-sim/prompts.js` | 综艺节目场景指令 + 绯闻公关场景指令 + Dispatch新闻场景指令 + 日程锁定规则(上午/下午/晚上必须按预设展开) |
| `src/ent-sim/immersion.js` | 热搜关联抽取逻辑(从HOT_SEARCH_REPLY_POOL) + 移除 generateBuzzRepliesAI + 移除 generateFanReaction |
| `src/ent-sim/data.js` | 移除 FAN_LETTER_POOL/BRAND_OFFER_POOL/GIRLGROUP_EVENTS/DAILY_BUZZ_TEMPLATES/NEWS_TEMPLATES/DAILY_ENGAGEMENT_POOL/ONE_HEART_RANDOM_EVENTS/SVT_TEAMMATE_EVENT_POOL/INDUSTRY_EVENTS/RIVAL_ADVANCE_EVENTS/SECRET_DISCOVERY_EVENTS（保留基础设施数组） |
| `src/ent-sim/pools-v2.js` | 删除，内容迁移到 pools/ |
| `src/ent-sim/brother.js` | 移除 BROTHER_EVENT_POOL/MALE_LEAD_INITIATIVE_POOL，改为 import |
| `src/worlds/entertainment.js` | 移除 ENT_SCHEDULE_POOL，改为 import |


## 触发间隔调整对照表

| 功能 | 旧间隔(天) | 新间隔(天) |
| --- | --- | --- |
| 粉丝来信 | 5-7 | 2-3 |
| 品牌代言 | 12 | 4-5 |
| 季度颁奖 | 30 | 8-10 |
| 发布作品 CD | 15 | 2-3 |
| 主动联络 | 8-18 | 3-5 |
| 综艺节目 | — | 3-5 |
| Dispatch爆料 | — | 4-6 |
| 杂志画报 | — | 5-7 |
| 绯闻 | — | 5-7 |
| 音源榜单 | — | 每2天x6次 |


## 性能与可靠性

- 30 个池子文件在模块 import 时一次性加载，运行时零 I/O
- 弹窗队列顺序展示避免 z-index 冲突
- migrateSave() 每字段一行 `if (typeof E._xxx !== 'number') E._xxx = default` 保证旧存档不崩
- initEntSimState() + migrateSave() 双重兜底
- 所有 AI 生成文本插入 DOM 前必须经 escHtml() 转义