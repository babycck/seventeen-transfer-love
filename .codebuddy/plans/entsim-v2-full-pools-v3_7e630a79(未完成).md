---
name: entsim-v2-full-pools-v3
overview: 全面池子化：拆分/扩充 17 个旧池 + 新建 8 个池子（2 AI替代 + 6 增强模块）。每个事件池内嵌 fanReactions 子数组，事件触发时自动抽取粉丝反应写入右栏。共 27 个文件，~3500 条预写内容。修复 4 Bug + 缩短间隔 + UI 全入口 + 弹窗队列。
todos:
  - id: fix-migrate-save
    content: 修复 state.js migrateSave() 8 个 v2 字段兜底，初始化 _entSimPopupQueue 为 []，新增 _entSimBubblePhotoDesc/_entSimChartTrack/_entSimHotSearchStack 字段
    status: pending
  - id: fix-male-contact-popup
    content: 为主动联络新增独立弹窗 showMaleContactPopup()，CONTACT_TYPE_POOL 补 brother_relay + brother_tentative 各 20 条至 120 条
    status: pending
  - id: fix-anniversary-panel
    content: 恋情面板 renderLovePanel 新增纪念日折叠行，列出 _romanceMilestones 所有里程碑及天数
    status: pending
  - id: create-pools-directory
    content: 创建 src/ent-sim/pools/ 目录，建立 index.js 统一导出 25 个池子和 _utils.js(pickFromPool)
    status: pending
  - id: split-existing-pools
    content: 拆分 17 个旧池子到独立文件并扩充：fan-letters(200)/brand-offers(150)/male-contact(120)/releases(120)/awards(80)/daily-buzz(300)/news-templates(130)/daily-engagement(120)/girlgroup-events(120)/oneheart-events(80)/svt-teammate(15到100)/ent-schedule(33到150预设组合)/brother-events(7到80)/male-lead-init(7到80)/special-events(14到80)/jealousy-events(42到100)/incident-events(42到100)，其中 11 个事件池每条内嵌 fanReactions 子数组
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-ai-replacement-pools
    content: 新建 2 个 AI 替代池：hot-search-replies(200条含fanReplies+mediaTake)、diary-templates(60条模板框架)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-enhancement-pools
    content: 新建 6 个增强模块池（每条内嵌 fanReactions）：variety-shows(100)/dispatch-news(80)/magazine-shoots(80)/music-charts(60)/dating-rumors(80)，另建独立的 fan-reactions 保留为空或移除
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
    content: 缩短 engine.js goEntSimNextDay 全部触发器间隔：粉丝来信2-3天/品牌代言4-5天/季度颁奖8-10天/发布CD2-3天/主动联络3-5天
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-schedule-pool
    content: 改造日程系统：rollDailyAgenda 改为从 ent-schedule.js 预设 {morning, afternoon, evening} 组合抽取，prompts.js 新增日程锁定规则
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-hot-search-linked
    content: 改造热搜关联：immersion.js generateDailyBuzz 从 hot-search-replies.js 抽取热搜带出 fanReplies+mediaTake，移除 generateBuzzRepliesAI 和 generateFanReaction
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-bubble-ui-photo
    content: 改造泡泡UI：照片框从照相机图标改为显示AI返回的照片描述文字，泡泡内容保持AI生成
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: refactor-diary-system
    content: 改造日记：generateEntSimDiary 从 diary-templates.js 抽取模板框架，AI 只填空具体细节
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-popup-queue
    content: 实现 _entSimPopupQueue 弹窗队列机制：checkAndShowPendingPopups 从队列依次弹出，前一关闭后回调触发下一个
    status: pending
    dependencies:
      - fix-male-contact-popup
  - id: integrate-enhancement-modules
    content: 集成 6 个增强模块：engine.js 新增综艺/Dispatch/画报/音源/绯闻触发器和 fanReactions 抽取逻辑，ui.js 新增对应弹窗
    status: pending
    dependencies:
      - shorten-all-intervals
      - create-enhancement-pools
  - id: add-all-ui-buttons
    content: renderQuickActions 新增信箱/代言/奖项/综艺/画报/新闻室 6 个按钮，每按钮带状态显示(CD倒计时/未读标记)
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - refactor-bubble-ui-photo
  - id: update-prompt-injections
    content: prompts.js 新增综艺/绯闻/Dispatch 场景指令和日程锁定规则，同步更新 buildEntSimUserMessage
    status: pending
    dependencies:
      - integrate-enhancement-modules
      - refactor-schedule-pool
---

## 产品概述

对 entSim 娱乐圈模拟器进行全面池化改造：拆分 25 个内容池到独立文件（每个 80-300 条），其中 11 个事件池内嵌 fanReactions 粉丝反应子数组，事件触发时自动抽取 3 条注入右栏粉丝讨论区。修复 4 个 Bug，缩短全部触发间隔至 2-10 天级，补全 UI 快捷入口，实现弹窗队列机制。总计约 3500 条预写内容（含 fanReactions 约 2000+ 条短评）。

## AI 使用边界（最终）

保留 AI：剧情正文 narrative、选项 options、聊天回复、泡泡内容 msgToFans + fanReplies、日记（模板填空）、记忆压缩、种子事件/结局叙事（一次性）。

池子替代 AI：热搜关联（HOT_SEARCH_REPLY_POOL 200条）、日记模板（DIARY_TEMPLATE_POOL 60条）、曝光粉丝反应（改为事件自带 fanReactions）。

## 技术栈

- 语言：JavaScript (ES Modules)，使用 var 声明
- 架构：纯前端单页应用，Vite 构建
- 数据：预写静态池 + localStorage 存档
- AI：DeepSeek chat API

## 实现策略

### 核心原则

代码决定触发时机、内容、数值，AI 只负责把事件写成叙事文案。不新建 UI 页面类型，复用 showEntSimModal()/showToast()/_entSimPendingEvent 通道。

### 内嵌 fanReactions 设计

11 个事件池每个条目内嵌 fanReactions 子数组（5 条短评），事件触发后代码自动抽取 3 条注入右栏粉丝讨论滚动区。好处：事件和粉丝反应在同一文件，修改事件时顺手改反应，不遗漏。

数据结构示例：

```js
export var VARIETY_SHOW_POOL = [
  { cat:'talk', t:'《认哥》——主持人突然问理想型，全场起哄。', pop:4, exp:2,
    fanReactions: ['姐姐综艺感绝了','这段我反复看了十遍','理想型说的是谁啊好想知道','综艺新人王','转圈圈.gif']
  }
];
```

### 弹窗队列机制

_entSimPopupQueue 数组替代 _entSimFanLetter/_entSimBrandOffer/_entSimAward 三个独立标志，顺序弹出。

### 日程池改造

从单 key 改为预设上午/下午/晚上完整组合 {morning, afternoon, evening}，AI 在给定框架内展开叙事。

### 热搜关联改造

抽到一条热搜自动从 HOT_SEARCH_REPLY_POOL 带出 3 条粉丝讨论 + 1 条媒体解读，不调 AI。

### 泡泡 UI 改造

照片框从照相机图标改为显示照片描述文字，泡泡内容保持 AI 生成。