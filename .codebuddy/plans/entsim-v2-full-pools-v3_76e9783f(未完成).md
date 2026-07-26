---
name: entsim-v2-full-pools-v3
overview: 全面代码池子化：热搜→粉丝讨论关联、日记模板池化、日程预设上/下/晚组合。泡泡保持 AI 驱动（仅 UI 照片框改描述文字）。AI 保留：剧情正文+选项+聊天+泡泡+日记填空+记忆压缩。
todos:
  - id: fix-migrate-save
    content: 修复 state.js 的 migrateSave() 缺失的 8 个 v2 字段兜底，初始化 _entSimPopupQueue 为 []，新增 _entSimBubblePhotoDesc/_entSimChartTrack/_entSimHotSearchStack 字段
    status: pending
  - id: fix-male-contact-popup
    content: 为主动联络新增独立弹窗 showMaleContactPopup() 并扩充 CONTACT_TYPE_POOL 至 120 条（补充 brother_relay 和 brother_tentative 子池各 20 条）
    status: pending
  - id: fix-anniversary-panel
    content: 在恋情面板 renderLovePanel 中新增纪念日折叠行，列出 _romanceMilestones 中所有已记录的里程碑及对应天数
    status: pending
  - id: create-pools-directory
    content: 创建 src/ent-sim/pools/ 目录，建立 index.js（统一导出 27 个池子）和 _utils.js（pickFromPool 函数）
    status: pending
  - id: split-existing-pools
    content: 拆分 17 个旧池子到独立文件并扩充：fan-letters/brand-offers/male-contact/releases/awards/daily-buzz/news-templates/daily-engagement/girlgroup-events/oneheart-events/svt-teammate(100)/ent-schedule(150预设组合)/brother-events(80)/male-lead-init(80)/special-events(80)/jealousy-events(100)/incident-events(100)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-ai-replacement-pools
    content: 新建 2 个 AI 替代池子：hot-search-replies(200条热搜关联含fanReplies+mediaTake)、diary-templates(60条模板框架)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-enhancement-pools
    content: 新建 6 个增强模块池子：variety-shows(100)/dispatch-news(80)/fan-reactions(100)/magazine-shoots(80)/music-charts(60)/dating-rumors(80)
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
    content: 在 engine.js 的 goEntSimNextDay 中缩短所有触发器间隔：粉丝来信2-3天/品牌代言4-5天/季度颁奖8-10天/发布CD2-3天/主动联络3-5天
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-schedule-pool
    content: 改造日程系统：rollDailyAgenda 改为从 ent-schedule.js 预设组合抽取 {morning, afternoon, evening}，prompts.js 新增日程锁定规则
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-hot-search-linked
    content: 改造热搜关联系统：immersion.js 的 generateDailyBuzz 改为从 hot-search-replies.js 抽取热搜自动带出 fanReplies+mediaTake，移除 generateBuzzRepliesAI 和 generateFanReaction 调用
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-bubble-ui-photo
    content: 改造泡泡UI照片框：从照相机图标改为显示AI返回的照片描述文字（如"练习室自拍·汗湿的刘海"），泡泡内容msgToFans+fanReplies保持AI生成
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-diary-system
    content: 改造日记系统：generateEntSimDiary/generateEntSimDiaryHis 改为从 diary-templates.js 抽取模板框架，AI 只填空具体细节
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-popup-queue
    content: 在 ui.js 实现 _entSimPopupQueue 弹窗队列机制：checkAndShowPendingPopups 从队列依次弹出，前一个关闭后回调触发下一个
    status: pending
    dependencies:
      - fix-male-contact-popup
  - id: integrate-enhancement-modules
    content: 集成 6 个增强模块：engine.js 新增 6 个触发器（综艺/Dispatch/画报/音源/绯闻/粉丝反应），ui.js 新增对应弹窗函数
    status: pending
    dependencies:
      - shorten-all-intervals
      - create-enhancement-pools
  - id: add-all-ui-buttons
    content: 在 renderQuickActions 中新增全部 UI 快捷按钮：信箱、代言、奖项、综艺、画报、新闻室，每个按钮带独立状态显示
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - refactor-bubble-ui-photo
  - id: update-prompt-injections
    content: 在 prompts.js 中新增综艺/绯闻/Dispatch 场景指令和日程锁定规则，同步更新 buildEntSimUserMessage
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - refactor-schedule-pool
---

## 产品概述

对 entSim 娱乐圈模拟器进行全面池化改造：拆分/扩充 17 个旧池子，新建 2 个 AI 替代池子 + 6 个增强模块池子，共 27 个独立文件，约 3200 条预写内容。修复 4 个关键 Bug，缩短全部触发间隔至 2-10 天级，补全 UI 快捷入口，实现弹窗队列机制。

## AI 使用边界（最终）

**保留 AI（7 处）**：

- 剧情正文 narrative — 每回合核心
- 选项 options — 随剧情生成
- 聊天回复 — 男主口吻实时回复
- **泡泡内容 msgToFans + fanReplies** — 保持 AI 生成（用户确认）
- 日记 — DIARY_TEMPLATE_POOL 提供模板框架，AI 填空
- 记忆压缩 — AI 提取关键信息
- 种子事件/结局叙事 — 一次性 AI

**改为池子（3 处）**：

1. `generateBuzzRepliesAI()` 网友热议 → HOT_SEARCH_REPLY_POOL (200条) 热搜关联池
2. `generateFanReaction()` 曝光粉丝反应 → FAN_REACTION_POOL (100条)
3. `generateEntSimDiary()` 日记 → DIARY_TEMPLATE_POOL (60条) 模板框架

## 修复 4 个 Bug

1. migrateSave() 缺 8 个 v2 字段兜底
2. 主动联络无独立弹窗 → 新增 showMaleContactPopup()
3. CONTACT_TYPE_POOL 缺 brother 类型 → 补充 brother_relay + brother_tentative 各 20 条
4. 纪念日仅 toast 无面板 → 恋情面板新增纪念日折叠行

## 热搜关联改造

抽到一条热搜 → 直接从 HOT_SEARCH_REPLY_POOL 带出对应的 3 条粉丝讨论 + 1 条媒体解读，不调 AI。

## 泡泡改造

- 泡泡内容 msgToFans + fanReplies 保持 AI 生成
- 照片框 UI 从 📷 图标改为显示照片描述文字（如"练习室自拍·汗湿的刘海"）

## 日程池改造

从单 key 改为预设上午/下午/晚上完整组合：`{morning, afternoon, evening}`，AI 在给定框架内展开叙事。

## 新增 6 个增强模块

综艺节目(100条)、Dispatch爆料(80条)、粉丝圈反应(100条)、杂志画报(80条)、音源榜单(60条)、绯闻恋爱说(80条)

## 技术栈

- 语言：JavaScript (ES Modules)，使用 var 声明
- 架构：纯前端单页应用，Vite 构建
- 数据：预写静态池 + localStorage 存档
- AI：DeepSeek chat API（仅用于叙事文本生成）

## 实现策略

### 总体原则

代码决定「何时触发、触发什么、数值多少」，AI 只负责「把事件写成叙事文案」。不新建 UI 页面类型，复用现有 showEntSimModal()/showToast()/_entSimPendingEvent 通道。

### 池子文件独立化

每个池子独立文件，pools/index.js 统一 re-export，pools/_utils.js 提供 pickFromPool()。

### 弹窗队列机制

_entSimPopupQueue 数组替代 _entSimFanLetter/_entSimBrandOffer/_entSimAward 三个独立标志，顺序弹出。

### 核心数据流

```
goEntSimNextDay 每日换天
  └─ runEntSimDailyTriggers() 统一触发器
       ├─ 吃醋值衰减
       ├─ 主动联络 → showMaleContactPopup
       ├─ 粉丝来信 → showFanLetterPopup
       ├─ 品牌代言 → showBrandOfferPopup
       ├─ 季度颁奖 → showAwardPopup
       ├─ 综艺节目 → showVarietyShowPopup
       ├─ Dispatch → showDispatchPopup
       ├─ 杂志画报 → showMagazinePopup
       ├─ 绯闻 → showRumorPopup
       ├─ 纪念日 → toast
       ├─ 热搜关联 → 右栏更新
       └─ 日程预设 → prompt注入
```

## 目录结构（27 个文件）

```
src/ent-sim/pools/
├── index.js              ← 统一导出
├── _utils.js             ← pickFromPool
│
├── fan-letters.js        (200条)
├── brand-offers.js       (150条)
├── male-contact.js       (120条)
├── releases.js           (120条)
├── awards.js             (80条)
├── daily-buzz.js         (300条)
├── hot-search-replies.js (200条) [NEW]
├── news-templates.js     (130条)
├── daily-engagement.js   (120条)
├── girlgroup-events.js   (120条)
├── oneheart-events.js    (80条)
├── svt-teammate.js       (100条)
├── ent-schedule.js       (150条)
├── brother-events.js     (80条)
├── male-lead-init.js     (80条)
├── special-events.js     (80条)
├── jealousy-events.js    (100条)
├── incident-events.js    (100条)
│
├── diary-templates.js    (60条)  [NEW]
│
├── variety-shows.js      (100条) [NEW]
├── dispatch-news.js      (80条)  [NEW]
├── fan-reactions.js      (100条) [NEW]
├── magazine-shoots.js    (80条)  [NEW]
├── music-charts.js       (60条)  [NEW]
└── dating-rumors.js      (80条)  [NEW]
```

约 3200 条预写内容。

## 涉及修改的现有文件（10 个）

| 文件 | 改动内容 |
| --- | --- |
| `src/state.js` | migrateSave() 补 8 个 v2 字段兜底 + _entSimPopupQueue + 新状态字段 |
| `src/ent-sim/engine.js` | 缩短全部间隔 + 泡泡UI照片框描述注入 + 日程池化 + runEntSimDailyTriggers() |
| `src/ent-sim/ui.js` | 6 个快捷按钮 + 弹窗函数 + 泡泡照片框改描述 + 纪念日面板 + 弹窗队列 |
| `src/ent-sim/romance.js` | 纪念日面板数据函数 |
| `src/ent-sim/prompts.js` | 综艺/绯闻/Dispatch 场景指令 + 日程锁定规则 |
| `src/ent-sim/immersion.js` | 热搜关联抽取 + 移除 generateBuzzRepliesAI + 移除 generateFanReaction |
| `src/ent-sim/data.js` | 移除 12 个已拆分池子 |
| `src/ent-sim/pools-v2.js` | 删除 |
| `src/ent-sim/brother.js` | 移除池子改为 import |
| `src/worlds/entertainment.js` | 移除 ENT_SCHEDULE_POOL |


## 触发间隔调整

| 功能 | 旧间隔(天) | 新间隔(天) |
| --- | --- | --- |
| 粉丝来信 | 5-7 | 2-3 |
| 品牌代言 | 12 | 4-5 |
| 季度颁奖 | 30 | 8-10 |
| 发布 CD | 15 | 2-3 |
| 主动联络 | 8-18 | 3-5 |
| 综艺节目 | — | 3-5 |
| Dispatch | — | 4-6 |
| 杂志画报 | — | 5-7 |
| 绯闻 | — | 5-7 |
| 音源榜单 | — | 每2天x6次 |


## SubAgent

- **code-explorer**
- 用途：验证现有代码结构（state.js 迁移函数、engine.js 换天流程、ui.js 弹窗工厂和快捷按钮渲染、immersion.js 热搜逻辑），确保所有修改点精准命中
- 预期结果：确认所有挂入点可行，不破坏现有事件瀑布优先级，不引入循环依赖