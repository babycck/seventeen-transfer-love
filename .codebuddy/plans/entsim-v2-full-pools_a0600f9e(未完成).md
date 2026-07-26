---
name: entsim-v2-full-pools
overview: 修复 4 个 Bug + 缩短全部触发间隔 + 拆分全部 23 个内容池到独立文件（每池 100-200 条）+ 新增 6 个增强模块 + 补全 UI 快捷入口 + 弹窗队列 + prompt 注入规则。总计 ~2800 条预写内容，全部代码驱动，AI 只写叙事正文。
todos:
  - id: fix-migrate-save
    content: 修复 state.js 的 migrateSave() 缺失的 8 个 v2 字段兜底（_jealousLevel/intimacyUnlocked/romanceMilestones/maleContactTimer/fanLetterDay/brandOfferDay/releaseCD/awardDay），同时初始化 _entSimPopupQueue 为 []
    status: pending
  - id: fix-male-contact-popup
    content: 为主动联络新增独立弹窗 showMaleContactPopup() 并扩充 CONTACT_TYPE_POOL 至 120 条（补充 brother_relay 和 brother_tentative 子池）
    status: pending
  - id: fix-anniversary-panel
    content: 在恋情面板新增纪念日折叠行，列出 _romanceMilestones 中所有已记录的里程碑及对应天数
    status: pending
  - id: create-pools-directory
    content: 创建 src/ent-sim/pools/ 目录结构，建立 index.js 统一导出和 _utils.js 工具函数（pickFromPool）
    status: pending
  - id: split-large-existing-pools
    content: 拆分 10 个大池子到独立文件：fan-letters(200)、brand-offers(150)、male-contact(120)、releases(120)、awards(80)、daily-buzz(300)、news-templates(130)、daily-engagement(120)、girlgroup-events(120)、oneheart-events(80)
    status: pending
    dependencies:
      - create-pools-directory
  - id: split-small-expand-pools
    content: 拆分并扩充 5 个小池子到独立文件：svt-teammate(15→100)、ent-schedule(33→100)、brother-events(7→80)、male-lead-init(7→80)、special-events(合并 14→80)
    status: pending
    dependencies:
      - create-pools-directory
  - id: split-merged-event-pools
    content: 合并 8 个小事件池为 2 个文件：jealousy-events(42→100)、incident-events(42→100)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-new-enhancement-pools
    content: 新建 6 个增强模块池子：variety-shows(100)、dispatch-news(80)、fan-reactions(100)、magazine-shoots(80)、music-charts(60)、dating-rumors(80)
    status: pending
    dependencies:
      - create-pools-directory
  - id: update-imports-and-cleanup
    content: 更新 engine.js/ui.js 的 import 路径为 pools/index.js，删除 pools-v2.js，移除 data.js 和 worlds/entertainment.js 中已拆分的池子
    status: pending
    dependencies:
      - split-large-existing-pools
      - split-small-expand-pools
      - split-merged-event-pools
  - id: shorten-all-intervals
    content: 缩短 engine.js 中所有触发器间隔：粉丝来信 2-3 天、品牌代言 4-5 天、季度颁奖 8-10 天、发布 CD 2-3 天、主动联络 3-5 天
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-popup-queue
    content: 实现 _entSimPopupQueue 弹窗队列机制替换独立标志，checkAndShowPendingPopups 改为从队列依次弹出
    status: pending
    dependencies:
      - fix-male-contact-popup
  - id: add-variety-show-module
    content: 集成综艺节目模块：engine.js 触发器（3-5天，人气≥25），showVarietyShowPopup 弹窗含 3 选项，UI 快捷按钮
    status: pending
    dependencies:
      - create-new-enhancement-pools
      - shorten-all-intervals
  - id: add-dispatch-module
    content: 集成 Dispatch 爆料模块：engine.js 触发器（4-6天，曝光≥30），showDispatchPopup 弹窗含 3 选项，UI 快捷按钮
    status: pending
    dependencies:
      - create-new-enhancement-pools
      - shorten-all-intervals
  - id: add-fan-reaction-module
    content: 集成粉丝圈反应模块：右栏态势区新增滚动条，营业/发歌/上节目后自动从池子抽 3 条展示
    status: pending
    dependencies:
      - create-new-enhancement-pools
  - id: add-magazine-module
    content: 集成杂志画报模块：engine.js 触发器（5-7天，人气≥40），showMagazinePopup 弹窗，UI 快捷按钮
    status: pending
    dependencies:
      - create-new-enhancement-pools
      - shorten-all-intervals
  - id: add-music-chart-module
    content: 集成音源榜单模块：发布作品后每 2 天更新排名持续 6 天，右栏显示排名变化条
    status: pending
    dependencies:
      - create-new-enhancement-pools
      - shorten-all-intervals
  - id: add-dating-rumor-module
    content: 集成绯闻模块：engine.js 触发器（5-7天，好感≥50+曝光≥40），showRumorPopup 弹窗含 3 选项，被动触发
    status: pending
    dependencies:
      - create-new-enhancement-pools
      - shorten-all-intervals
  - id: add-all-ui-buttons
    content: 在 renderQuickActions() 中新增全部 UI 快捷按钮：信箱、代言、奖项、综艺、画报、新闻室，每个按钮带独立状态显示
    status: pending
    dependencies:
      - add-variety-show-module
      - add-dispatch-module
      - add-magazine-module
  - id: update-prompt-injections
    content: 在 prompts.js 中新增综艺节目场景指令、绯闻公关场景指令、Dispatch 新闻场景指令
    status: pending
    dependencies:
      - add-variety-show-module
      - add-dispatch-module
      - add-dating-rumor-module
---

## 产品概述

对 entSim 娱乐圈模拟器进行全面池子重构：将分散在 4 个文件中的 23 个内容池拆分为 25 个独立文件（~2800 条预写内容），修复 4 个关键 Bug，缩短全部触发间隔至 2-7 天，新增 6 个增强模块，所有功能配 UI 快捷入口。核心原则不变：代码决定触发时机、触发内容、数值变化，AI 只负责把事件写成叙事文案。

## 核心功能

### 修复 4 个 Bug

1. **migrateSave() 兜底缺失** — 旧存档升级后 8 个 v2 字段（_jealousLevel/intimacyUnlocked/romanceMilestones/maleContactTimer/fanLetterDay/brandOfferDay/releaseCD/awardDay）为 undefined，导致粉丝来信/品牌代言等立即异常触发
2. **主动联络无独立弹窗** — 男主打电话/发消息仅文本注入 prompt，玩家容易错过
3. **CONTACT_TYPE_POOL 缺 brother 类型** — 当前 80 条（4 子池），engine.js 有 brother 死代码分支
4. **纪念日仅 toast 一闪而过** — 无独立面板回顾

### 缩短全部触发间隔

一天 10+ 回合，天级触发太长（5-30 天）。全部缩短为 2-10 天：粉丝来信 2-3 天、品牌代言 4-5 天、季度颁奖 8-10 天、发布 CD 2-3 天、主动联络 3-5 天。

### 池子拆分（23 个内容池 → 25 个独立文件）

10 个大数据池（fan-letters/brand-offers/male-contact/releases/awards/daily-buzz/news-templates/daily-engagement/girlgroup-events/oneheart-events）、5 个小池子扩充（svt-teammate/ent-schedule/brother-events/male-lead-init/special-events）、2 个小事件合并文件（jealousy-events/incident-events）、6 个新建增强模块。

### 新增 6 个增强模块

综艺节目（脱口秀/竞技/音乐/真人秀）、Dispatch 爆料（偷拍照/新闻标题/公关选项）、粉丝圈反应（Twitter/DCInside 风格短评滚动条）、杂志画报（W Korea/Elle/Dazed 等 6 刊）、音源榜单（Melon/Genie 排名变化条）、绯闻恋爱说（网友扒同款/公司否认）。

### UI 全入口覆盖

快捷指令行新增 6 个按钮：📬信箱、💼代言、🏆奖项、🎬综艺、📸画报、📰新闻室。每个按钮带状态显示（CD 倒计时/未读标记）。弹窗队列机制替代独立标志，前一个关闭后自动弹出下一个。

## 技术栈

- 语言：JavaScript (ES Modules)
- 架构：纯前端单页应用，无服务端
- 数据：预写静态池 + localStorage 存档
- AI：DeepSeek chat API（仅用于叙事文本生成）

## 实现策略

### 总体原则

全部功能遵循同一模式：代码决定「何时触发、触发什么、数值多少」，AI 只负责「把事件写成叙事文案」。不新建 UI 页面类型，复用现有 showEntSimModal()/showToast()/_entSimPendingEvent 通道。

### 池子文件独立化

每个池子独立文件，pools/index.js 统一管理导出。好处：每个池子可独立修改/扩充，互不干扰；新增池子只需新建文件 + 在 index.js 加一行 export。

### 触发器统一管理

在 goEntSimNextDay 中新增 runEntSimDailyTriggers() 函数，统一管理所有定时触发器。每个触发器返回 { type, data } 或 null，收集后按优先级排序（弹窗类 > 注入类），依次处理。避免当前零散的 if/else 堆叠。

### 弹窗队列机制

新增 _entSimPopupQueue 数组替代当前 _entSimFanLetter/_entSimBrandOffer/_entSimAward 三个独立标志。checkAndShowPendingPopups() 改为从队列依次弹出，前一个关闭后再展示下一个，从根本上解决多弹窗并发问题。

### 弹窗工厂复用

所有新增弹窗复用现有弹窗模板模式：createOverlay() → overlay.className = 'es-stageup-overlay' → 填充内容 → document.body.appendChild(overlay) → 关闭时 removeChild(overlay)。

## 性能与可靠性

- **池子加载**：25 个池子文件在模块 import 时一次性加载到内存，运行时零 I/O 开销
- **弹窗队列**：顺序展示避免 DOM 叠加导致的 z-index 冲突和性能问题
- **迁移兜底**：migrateSave() 中每个新字段一行 `if (typeof E._xxx !== 'number') E._xxx = default`，保证旧存档加载不报错
- **向后兼容**：所有新增字段在 initEntSimState() 中初始化默认值，migrateSave() 补充兜底，双重保障

## Agent Extensions

### SubAgent

- **code-explorer**
- 用途：在实现过程中验证现有代码结构（state.js 迁移函数、engine.js 换天流程、ui.js 弹窗工厂和快捷按钮渲染、data.js 现有池子位置、worlds/entertainment.js 结构），确保所有修改点精准命中
- 预期结果：确认所有挂入点可行，不破坏现有事件瀑布优先级，不引入循环依赖