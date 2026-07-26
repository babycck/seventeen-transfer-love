---
name: entsim-v2-full-pools-v5
overview: 最终版全面池化计划：41个独立池子文件（~5500条预写），修复6个Bug，间隔压缩至1-3天级，7年游戏时间轴，KakaoTalk多角色聊天系统（男主/哥哥/情敌/经纪人/团群/私生），事业练习生→传奇完整路径，亲密系统4阶段，技能条4维。全部代码驱动，AI仅保留7处。
todos:
  - id: fix-all-bugs
    content: 修复 6 个 Bug：state.js migrateSave 补 8 字段、romance.js 添加 null 检查、sweetMaxRound 防重置、主动联络独立弹窗、CONTACT_TYPE_POOL 补 brother 子池、恋情面板新增纪念日折叠行
    status: pending
  - id: create-pools-directory
    content: 创建 pools/ 目录，建立 index.js（统一 re-export 41 池子+pickFromPool）和 _utils.js（pickFromPool 支持按 cat 过滤和轮替）
    status: pending
  - id: split-existing-pools-batch1
    content: 拆分旧池子第一批 10 个：fan-letters(200)/brand-offers(150)/male-contact(120+options)/releases(120)/awards(80)/daily-buzz(300)/news-templates(130)/daily-engagement(120)/girlgroup-events(120)/oneheart-events(80)，每条内嵌 fanReactions，扩充至目标条数
    status: pending
    dependencies:
      - create-pools-directory
  - id: split-existing-pools-batch2
    content: 拆分旧池子第二批 7 个：svt-teammate(100)/ent-schedule(150)/brother-events(80)/male-lead-init(80)/special-events(80)/jealousy-events(100)/incident-events(100)，扩充并内嵌 fanReactions
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-ai-replacement-pools
    content: 新建 AI 替代池：hot-search-replies(200) 和 diary-templates(60)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-enhancement-pools
    content: 新建 6 个增强池：variety-shows(100 真实韩国节目)/dispatch-news(80)/magazine-shoots(80)/music-charts(60)/dating-rumors(80)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-realism-pools
    content: 新建 4 个真实化池：comeback-cycle(100)/concert-pool(80)/music-show-pool(60)/fansign-pool(50)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-identity-pools
    content: 新建 7 个女团身份池：group-names(60 含 fandom 配对)/company-names(20)/group-concepts(40)/fandom-names(60)/hit-songs(80)/teammate-names(100)/sister-roles(30)，全部韩国风英文名
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-setbacks-pool
    content: 新建 career-setbacks.js(200 条，8 阶段各 25，每条内嵌 fanReactions)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-chat-pools
    content: 新建 6 个聊天池：chat-male-lead(200)/chat-brother(80)/chat-rival(60)/chat-manager(40)/chat-group(60)/chat-sasaeng(30)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-progression-pool
    content: 新建 contact-progression.js(60 条好感谢铺垫事件)
    status: pending
    dependencies:
      - create-pools-directory
  - id: update-imports-and-cleanup
    content: 批量更新 import 路径为 pools/index.js，删除 pools-v2.js，清理 data.js 和 worlds/entertainment.js 旧池子定义
    status: pending
    dependencies:
      - split-existing-pools-batch1
      - split-existing-pools-batch2
      - create-ai-replacement-pools
      - create-enhancement-pools
      - create-realism-pools
      - create-identity-pools
      - create-setbacks-pool
      - create-chat-pools
      - create-progression-pool
  - id: shorten-intervals-and-pop-balance
    content: 缩短全部触发器间隔至 1-4 天级，降低全部 pool 的 pop 值 60-70%，起始人气固定 3，新增 runEntSimDailyTriggers() 统一 12+ 触发器
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-timeline-system
    content: 实现 7 年时间轴：新增 career.debutDay/yearsActive/contractYears/contractRemaining 字段，UI 左栏显示 Year+合约剩余，周年纪念事件触发，续约谈判 Y3/Y5/Y7
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-career-path
    content: 实现 8 阶段事业路径：phase0-7 按人气阈值驱动，初一位条件(人气≥25+回归期+概率)，4 维技能面板(skills:{vocal,dance,variety,visual})在左栏渲染
    status: pending
    dependencies:
      - shorten-intervals-and-pop-balance
  - id: implement-intimacy-system
    content: 实现 7 阶段亲密系统：新增同床(≥65)/同居(≥80)/公开恋情(≥90 主动选择)/求婚结婚(≥100)，prompts 注入解锁指令，romance.js 记录纪念日
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-kakaotalk-chat
    content: 重构聊天为 KakaoTalk 风格：6 频道手机框 UI，顶部头像+名字，绿色/灰色气泡，时间戳，底部快捷回复按钮行，左侧对话列表频道切换，pool+AI 混合引擎
    status: pending
    dependencies:
      - update-imports-and-cleanup
      - create-chat-pools
  - id: implement-enhancement-triggers
    content: 集成 6 增强模块触发器：综艺/Dispatch/画报/音源/绯闻弹窗+数值结算+fanReactions 抽取
    status: pending
    dependencies:
      - shorten-intervals-and-pop-balance
      - create-enhancement-pools
  - id: implement-realism-triggers
    content: 集成 4 真实化模块：回归周期 4 天进度条+弹窗、演唱会 2 天周期、签售会弹窗、打歌叙事+反应
    status: pending
    dependencies:
      - shorten-intervals-and-pop-balance
      - create-realism-pools
  - id: update-prompt-injections
    content: prompts.js 新增综艺/绯闻/Dispatch 场景指令、日程三段式锁定、亲密阶段提示、技能条标签、时间轴纪元描述
    status: pending
    dependencies:
      - implement-enhancement-triggers
      - implement-realism-triggers
      - implement-intimacy-system
      - implement-career-path
  - id: add-ui-buttons-and-panels
    content: renderQuickActions 新增 6 个快捷按钮(信箱/代言/奖项/综艺/画报/新闻室)，技能条渲染，恋情纪念日面板，右栏回归进度条，时间轴显示
    status: pending
    dependencies:
      - implement-enhancement-triggers
      - implement-kakaotalk-chat
      - implement-career-path
---

## 产品概述

entSim V5 终极架构：将娱乐圈模拟器的全部内容系统拆分为 41 个独立预写池子文件（约 5800 条，每条内嵌 fanReactions 粉丝反应子数组），修复 6 个关键 Bug，触发间隔压缩至 1-4 天级，人气涨速降低 60-70%，引入 7 年游戏时间轴和 8 阶段事业路径。新增 KakaoTalk 风格多角色聊天系统、7 阶段亲密系统、4 维技能面板。总计约 45 个文件变更。

## 核心功能

### 1. 41 个预写池子（pools/ 目录）

- 旧池拆分 17 个（fan-letters/brand-offers/male-contact/releases/awards/daily-buzz/news-templates/daily-engagement/girlgroup-events/oneheart-events/svt-teammate/ent-schedule/brother-events/male-lead-init/special-events/jealousy-events/incident-events）
- AI 替代 2 个（hot-search-replies 热搜关联带 fanReplies+mediaTake、diary-templates 日记模板框架）
- 增强模块 6 个（variety-shows 真实韩国节目名/dispatch-news/magazine-shoots/music-charts/dating-rumors）
- 真实化模块 4 个（comeback-cycle 回归周期压缩 14 天变 4 天/concert-pool 演唱会/music-show-pool 打歌/fansign-pool 签售会）
- 女团身份池 7 个（group-names 韩国风英文名配 fandom/company-names/group-concepts/fandom-names/hit-songs/teammate-names/sister-roles）
- 逆境池 1 个（career-setbacks 8 阶段各 25 条）
- 聊天池 6 个（chat-male-lead/chat-brother/chat-rival/chat-manager/chat-group/chat-sasaeng）
- 好感铺垫池 1 个（contact-progression）
- 每条事件内嵌 fanReactions 子数组（5 条短评），事件触发时自动抽取 3 条注入右栏粉丝讨论区
- pools/index.js 统一 re-export，pools/_utils.js 提供 pickFromPool()

### 2. 修复 6 个 Bug

1. state.js migrateSave() 缺失 8 个 v2 字段兜底
2. 主动联络无独立弹窗，需新增 showMaleContactPopup()
3. CONTACT_TYPE_POOL 缺 brother_relay/brother_tentative 死代码分支
4. 纪念日仅 toast，需在恋情面板新增纪念日折叠行
5. romance.js 好感≥100 后 sweetMaxRound 不断被重置
6. romance.js 中 4 个函数缺 GS.entSim null 检查

### 3. KakaoTalk 多角色聊天系统

- 6 个聊天频道：男主、哥哥、情敌、经纪人、团群聊 ECLIPSE、私生骚扰消息
- UI 改造：KakaoTalk 风格手机框，顶部头像+名字+在线状态，绿色/灰色气泡，时间戳，底部快捷回复按钮行
- 频道切换：左侧对话列表（圆头像+名字+最后一条预览）
- pool+AI 混合：简单交互从池子抽取回复，复杂/自由输入走 AI 生成

### 4. 7 阶段亲密系统

牵手(≥15)→拥抱(≥30)→接吻(≥50)→同床(≥65)→同居(≥80)→公开恋情(≥90)→求婚结婚(≥100)

### 5. 7 年游戏时间轴

~12 游戏天=1 游戏年，80 天约 7 年。Year0 练习生→Year1 出道→Year2 初一位→Year3 二线→Year4 当红→Year5 一线→Year6-7 传奇+续约/解散+结局。新增 debutDay/yearsActive/contractYears/contractRemaining 字段。左栏显示"Year X 合约剩余 Y 年"。续约谈判 Y3/Y5/Y7 触发。

### 6. 4 维技能面板

唱功(60)/舞蹈(45)/综艺(30)/视觉(80)，左栏 compact 技能条展示

### 7. 间隔全压缩 + 人气涨速控制

全部触发器间隔压缩至 1-4 天级。人气涨速降低 60-70%：发布作品 pop 1-2、品牌代言 pop 2-4、颁奖 pop 3-6、泡泡 pop 0-1。起始人气固定 3。

## 技术栈

- 语言：JavaScript (ES Modules)，var 声明，字符串拼接用 + 不用模板字符串
- 架构：纯前端单页应用，Vite 构建
- 数据：预写静态池 + localStorage 存档
- AI：DeepSeek chat API

## 核心数据流

```mermaid
flowchart TD
    A[goEntSimNextDay 换天] --> B{runEntSimDailyTriggers}
    B --> C[吃醋值衰减]
    B --> D[主动联络弹窗]
    B --> E[粉丝来信弹窗]
    B --> F[品牌代言弹窗]
    B --> G[季度颁奖弹窗]
    B --> H[综艺节目弹窗]
    B --> I[Dispatch弹窗]
    B --> J[杂志画报弹窗]
    B --> K[绯闻弹窗]
    B --> L[回归周期进度]
    B --> M[音源榜单更新]
    B --> N[纪念日检测]
    B --> O[经纪人消息推送]
    B --> P[私生骚扰检测]
    C & D & E & F & G & H & I & J & K & L & M & N & O & P --> Q[AI生成叙事]
    Q --> R[渲染+弹窗队列+fanReactions注入]
```

## 目录结构（41 个池子文件）

```
src/ent-sim/pools/
├── index.js                    [NEW] 统一 re-export
├── _utils.js                   [NEW] pickFromPool
├── fan-letters.js              (200条,fanReactions)
├── brand-offers.js             (150条,fanReactions)
├── male-contact.js             (120条+options)
├── releases.js                 (120条,fanReactions)
├── awards.js                   (80条,fanReactions)
├── daily-buzz.js               (300条)
├── hot-search-replies.js       (200条,fanReplies+mediaTake) [NEW]
├── news-templates.js           (130条)
├── daily-engagement.js         (120条,fanReactions)
├── girlgroup-events.js         (120条,fanReactions)
├── oneheart-events.js          (80条)
├── svt-teammate.js             (100条)
├── ent-schedule.js             (150条,{morning,afternoon,evening})
├── brother-events.js           (80条)
├── male-lead-init.js           (80条)
├── special-events.js           (80条)
├── jealousy-events.js          (100条)
├── incident-events.js          (100条)
├── diary-templates.js          (60条) [NEW]
├── variety-shows.js            (100条,fanReactions) [NEW]
├── dispatch-news.js            (80条,fanReactions) [NEW]
├── magazine-shoots.js          (80条,fanReactions) [NEW]
├── music-charts.js             (60条,fanReactions) [NEW]
├── dating-rumors.js            (80条,fanReactions) [NEW]
├── comeback-cycle.js           (100条,fanReactions) [NEW]
├── concert-pool.js             (80条,fanReactions) [NEW]
├── music-show-pool.js          (60条,fanReactions) [NEW]
├── fansign-pool.js             (50条,fanReactions) [NEW]
├── career-setbacks.js          (200条,fanReactions) [NEW]
├── group-names.js              (60条,含fandom配对) [NEW]
├── company-names.js            (20条) [NEW]
├── group-concepts.js           (40条) [NEW]
├── fandom-names.js             (60条) [NEW]
├── hit-songs.js                (80条) [NEW]
├── teammate-names.js           (100条) [NEW]
├── sister-roles.js             (30条) [NEW]
├── contact-progression.js      (60条) [NEW]
├── chat-male-lead.js           (200条) [NEW]
├── chat-brother.js             (80条) [NEW]
├── chat-rival.js               (60条) [NEW]
├── chat-manager.js             (40条) [NEW]
├── chat-group.js               (60条) [NEW]
└── chat-sasaeng.js             (30条) [NEW]
```

## 涉及修改的现有文件（12 个）

| 文件 | 改动 |
| --- | --- |
| src/state.js | migrateSave() 补 8 字段兜底，新增 _entSimPopupQueue/_entSimBubblePhotoDesc/_entSimChartTrack/_entSimComebackProgress/debutDay/yearsActive/contractYears/contractRemaining |
| src/ent-sim/state.js | career 新增 debutDay 等字段，起始人气固定 3，新增 skills:{vocal:60,dance:45,variety:30,visual:80} |
| src/ent-sim/engine.js | runEntSimDailyTriggers() 统一 12+ 触发器，间隔全缩短，人气涨速调低，回归/演唱会周期管理，泡泡照片注入，日记模板化，聊天 pool+AI 混合 |
| src/ent-sim/ui.js | KakaoTalk 聊天 UI 重构（6 频道切换+快捷回复+手机框），新增 6 弹窗函数，恋情面板纪念日，右栏回归进度条，技能条渲染，时间轴显示 |
| src/ent-sim/romance.js | Bug5/6 修复，亲密系统新增 4 阶段，纪念日面板数据函数 |
| src/ent-sim/prompts.js | 综艺/Dispatch/绯闻场景指令，日程锁定规则，亲密阶段解锁提示，技能条提示，时间轴标签 |
| src/ent-sim/immersion.js | 热搜→hot-search-replies 池子关联，移除 AI 调用，新增 injectFanReactionsToPanel() |
| src/ent-sim/data.js | 移除 12 个旧池子定义，新增 careerMilestone 常量，新增 INTIMACY_STAGES 7 阶段定义 |
| src/ent-sim/brother.js | 移除旧池子定义，改为 import |
| src/ent-sim/cycle.js | rollDailyAgenda 改为 ent-schedule 三段式组合 |
| src/worlds/entertainment.js | 移除 ENT_SCHEDULE_POOL |
| src/data.js | 移除 GIRLGROUP_PRESETS，改为 import pools |