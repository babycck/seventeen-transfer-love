---
name: entsim-v2-full-pools-v5
overview: 终极版：41个池子文件（~5800条预写），修复6Bug，间隔1-3天，7年时间轴，KakaoTalk风格6频道聊天（仅男主用AI，其余5频道纯池子），亲密7阶段，技能4维。全部代码驱动。
todos:
  - id: fix-all-bugs
    content: 修复 6 个 Bug：state.js migrateSave 补 8 字段、romance.js 添加 null 检查、sweetMaxRound 防重置、主动联络独立弹窗、CONTACT_TYPE_POOL 补 brother 子池、恋情面板新增纪念日折叠行
    status: pending
  - id: create-pools-directory
    content: 创建 pools/ 目录，建立 index.js（统一 re-export 41 池子+pickFromPool 重导出）和 _utils.js（pickFromPool 支持按 cat 过滤和轮替）
    status: pending
  - id: split-existing-pools-batch1
    content: 拆分旧池子第一批 10 个：fan-letters(200)/brand-offers(150)/male-contact(120+options)/releases(120)/awards(80)/daily-buzz(300)/news-templates(130)/daily-engagement(120)/girlgroup-events(120)/oneheart-events(80)，每条内嵌 fanReactions 子数组，扩充至目标条数
    status: pending
    dependencies:
      - create-pools-directory
  - id: split-existing-pools-batch2
    content: 拆分旧池子第二批 7 个：svt-teammate(100)/ent-schedule(150 三段式)/brother-events(80)/male-lead-init(80)/special-events(80)/jealousy-events(100)/incident-events(100)，扩充并内嵌 fanReactions
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-ai-replacement-pools
    content: 新建 AI 替代池：hot-search-replies(200 条，fanReplies+mediaTake) 和 diary-templates(60 条，framework+blanks 模板)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-enhancement-pools
    content: 新建 6 个增强池：variety-shows(100 真实韩国节目名)/dispatch-news(80)/magazine-shoots(80)/music-charts(60)/dating-rumors(80)，每条内嵌 fanReactions
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-realism-pools
    content: 新建 4 个真实化池：comeback-cycle(100 条 7 阶段)/concert-pool(80 条 5 阶段)/music-show-pool(60 条 4 节目)/fansign-pool(50 条 4 环节)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-identity-pools
    content: 新建 7 个女团身份池：group-names(60 含 fandom 配对)/company-names(20)/group-concepts(40)/hit-songs(80)/teammate-names(100)/sister-roles(30)，全部韩国风英文名
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-setbacks-pool
    content: 新建 career-setbacks.js(200 条，8 阶段各 25，每条内嵌 fanReactions)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-chat-pools
    content: 新建 6 个聊天池：chat-male-lead(200 含快捷选项)/chat-brother(80 预写消息+回复对)/chat-rival(60)/chat-manager(40)/chat-group(60)/chat-sasaeng(30 不可回复)
    status: pending
    dependencies:
      - create-pools-directory
  - id: create-progression-pool
    content: 新建 contact-progression.js(60 条好感铺垫事件，按好感阈值从 0 到 30 分 6 档)
    status: pending
    dependencies:
      - create-pools-directory
  - id: update-imports-and-cleanup
    content: 批量更新 import 路径为 pools/index.js，删除 pools-v2.js，清理 data.js 和 worlds/entertainment.js 中旧池子定义
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
    content: 缩短全部触发器间隔至 1-4 天级，降低全部池子 pop 值 60-70%，起始人气固定 3，新增 runEntSimDailyTriggers() 统一管理 12+ 触发器并推入弹窗队列
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-timeline-system
    content: 实现 7 年时间轴：新增 debutDay/yearsActive/contractYears/contractRemaining 字段，UI 左栏显示 Year+合约剩余年数，周年纪念事件触发，续约谈判 Y3/Y5/Y7
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-career-path
    content: 实现 8 阶段事业路径（phase0-7 按人气阈值驱动），初一位条件（人气≥25+回归周期+50%概率），4 维技能面板在左栏渲染
    status: pending
    dependencies:
      - shorten-intervals-and-pop-balance
  - id: implement-intimacy-system
    content: 实现 7 阶段亲密系统：新增同床(≥65)/同居(≥80)/公开恋情(≥90 主动弹窗选择)/求婚结婚(≥100)，prompts 注入解锁指令，romance.js 记录纪念日
    status: pending
    dependencies:
      - update-imports-and-cleanup
  - id: implement-kakaotalk-chat
    content: 重构聊天为 KakaoTalk 风格：6 频道手机框 UI，顶部头像+名字+在线状态，绿色/灰色气泡+时间戳，底部快捷回复按钮行，左侧对话列表频道切换。男主快捷回复走池子，自由输入走 AI；其余 5 频道纯池子驱动
    status: pending
    dependencies:
      - update-imports-and-cleanup
      - create-chat-pools
  - id: implement-enhancement-triggers
    content: 集成 6 增强模块触发器：综艺/Dispatch/画报/音源/绯闻弹窗，数值结算写入 state，fanReactions 抽取注入右栏
    status: pending
    dependencies:
      - shorten-intervals-and-pop-balance
      - create-enhancement-pools
  - id: implement-realism-triggers
    content: 集成 4 真实化模块：回归周期 4 天进度条+每阶段弹窗、演唱会 2 天周期、签售会日程触发+互动弹窗、打歌融入叙事+右栏 fanReactions
    status: pending
    dependencies:
      - shorten-intervals-and-pop-balance
      - create-realism-pools
  - id: update-prompt-injections
    content: prompts.js 新增综艺/绯闻/Dispatch 场景指令、日程三段式锁定、亲密阶段解锁提示、技能条标签、时间轴标签
    status: pending
    dependencies:
      - implement-enhancement-triggers
      - implement-realism-triggers
      - implement-intimacy-system
      - implement-career-path
  - id: add-ui-buttons-and-panels
    content: UI 新增 6 快捷按钮（信箱/代言/奖项/综艺/画报/新闻室）+ 技能条渲染 + 恋情纪念日折叠面板 + 右栏回归进度条 + 左栏时间轴显示
    status: pending
    dependencies:
      - implement-enhancement-triggers
      - implement-kakaotalk-chat
      - implement-career-path
---

## 产品概述

entSim V5 终极架构：将娱乐圈模拟器的全部内容系统拆分为 41 个独立预写池子文件（约 5800 条），修复 6 个关键 Bug，触发间隔压缩至 1-4 天级，人气涨速降低 60-70%，引入 7 年游戏时间轴和 8 阶段事业路径。新建 KakaoTalk 风格 6 频道聊天系统、7 阶段亲密系统、4 维技能面板。总计约 45 个文件变更。

## 核心功能

### 1. 41 个预写池子

旧池拆分 17 + AI 替代 2 + 增强模块 6 + 真实化模块 4 + 女团身份池 7 + 逆境池 1 + 聊天池 6 + 好感铺垫池 1 = 41。每个事件条目内嵌 fanReactions 子数组（5 条短评），触发时自动抽取 3 条注入右栏粉丝讨论区。pools/index.js 统一 re-export，pools/_utils.js 提供 pickFromPool()。

### 2. 聊天系统架构（最终确认）

6 个聊天频道，KakaoTalk 风格手机框 UI。频道切换通过左侧对话列表（圆头像+名字+最后一条预览）。每个频道显示绿色/灰色气泡+时间戳+底部快捷回复按钮行。

AI 使用规则：

- 男主聊天：快捷回复按钮 → 池子抽取回复（不走 AI）；自由输入 → AI 生成回复
- 哥哥聊天：100% 池子，预写消息+回复对，不调 AI
- 情敌聊天：100% 池子，预写消息+回复对，不调 AI
- 经纪人聊天：100% 池子，预写通知/警告/行程，不调 AI
- 团群聊 ECLIPSE：100% 池子，队友互动消息，不调 AI
- 私生骚扰：100% 池子，不可回复仅展示，随机触发，不调 AI

### 3. 修复 6 个 Bug

1. state.js migrateSave() 缺失 8 个 v2 字段兜底
2. 主动联络无独立弹窗
3. CONTACT_TYPE_POOL 缺 brother 死代码分支
4. 纪念日仅 toast 无面板
5. 好感≥100 后 sweetMaxRound 不断重置
6. romance.js 中 4 个函数缺 null 检查

### 4. 7 阶段亲密系统

牵手(≥15)→拥抱(≥30)→接吻(≥50)→同床(≥65)→同居(≥80)→公开恋情(≥90)→求婚结婚(≥100)

### 5. 7 年游戏时间轴 + 8 阶段事业路径

~12 游戏天=1 游戏年，80 天约 7 年。Year0 练习生→Year1 出道→Year2 初一位→Year3 二线→Year4 当红→Year5 一线→Year6-7 传奇+续约/解散+结局。初一位条件：人气≥25+回归周期中+打歌第2-3天+50%概率。4 维技能面板（唱功60/舞蹈45/综艺30/视觉80）。

### 6. AI 保留（7 处）

剧情正文、选项、男主聊天自由输入回复、泡泡内容、日记填空、记忆压缩、种子/结局。

## 技术栈

- 语言：JavaScript (ES Modules)，var 声明，字符串拼接用 + 不用模板字符串
- 架构：纯前端单页应用，Vite 构建
- 数据：预写静态池 + localStorage 存档
- AI：DeepSeek chat API（仅 7 处调用）

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

## 聊天系统数据流

```mermaid
flowchart TD
    U[玩家打开聊天Tab] --> V{选择频道}
    V --> W[男主频道]
    V --> X[哥哥/情敌/经纪人/团群/私生频道]
    W --> Y{玩家输入方式}
    Y -->|快捷回复按钮| Z[从chat-male-lead池子抽取回复]
    Y -->|自由输入| AA[AI生成回复]
    X --> AB[从对应频道池子抽取消息+回复对]
    Z & AA & AB --> AC[KakaoTalk UI渲染气泡]
```

## 目录结构

```
src/ent-sim/pools/
├── index.js                    [NEW] 统一 re-export 41 池子+pickFromPool
├── _utils.js                   [NEW] pickFromPool(按cat过滤+轮替)
├── fan-letters.js              (200条,fanReactions)
├── brand-offers.js             (150条,fanReactions)
├── male-contact.js             (120条+options数组)
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
├── hit-songs.js                (80条) [NEW]
├── teammate-names.js           (100条) [NEW]
├── sister-roles.js             (30条) [NEW]
├── contact-progression.js      (60条) [NEW]
├── chat-male-lead.js           (200条,含快捷回复选项) [NEW]
├── chat-brother.js             (80条,{from,msg,reply,time}) [NEW]
├── chat-rival.js               (60条,{from,msg,reply,time}) [NEW]
├── chat-manager.js             (40条,{from,msg,reply,time}) [NEW]
├── chat-group.js               (60条,{from,msg,reply,time}) [NEW]
└── chat-sasaeng.js             (30条,{from,msg,time},不可回复) [NEW]
```

## 聊天池子数据结构

男主池 chat-male-lead.js：

```
var CHAT_MALE_LEAD = [
  { cat:'greet', q:'今天怎么样', r:['刚结束录音，嗓子有点哑。','在想你的舞台。'], aff:1 },
  { cat:'stage', q:'今天的舞台超棒', r:['你看到了？副歌改了一句。','我自己改的——想给你不一样的感觉。'], aff:2 },
  ...
];
```

其他5频道池子（chat-brother/chat-rival/chat-manager/chat-group/chat-sasaeng）：

```
var CHAT_BROTHER = [
  { from:'opp', msg:'今天月末评价怎么样', reply:'还行…B+', time:'19:30' },
  { from:'you', msg:'哥我今天出道名单看到了', reply:'早知道了。恭喜。', time:'15:22' },
  ...
];
```

## 涉及修改的现有文件（12 个）

| 文件 | 改动 |
| --- | --- |
| src/state.js | migrateSave() 补 8 字段兜底，新增 _entSimPopupQueue/debutDay/yearsActive/contractYears 等字段 |
| src/ent-sim/state.js | career 新增 debutDay，起始人气固定 3，新增 skills:{vocal,dance,variety,visual} |
| src/ent-sim/engine.js | runEntSimDailyTriggers() 统一 12+ 触发器，间隔全缩短，人气涨速调低，聊天 pool+AI 混合调度 |
| src/ent-sim/ui.js | KakaoTalk 聊天 UI 重构（6 频道+手机框+快捷回复+频道切换），6 弹窗函数，恋情面板纪念日，技能条，回归进度条，时间轴 |
| src/ent-sim/romance.js | Bug5/6 修复，亲密系统新增同床/同居/公开/结婚 4 阶段，纪念日面板数据 |
| src/ent-sim/prompts.js | 综艺/Dispatch/绯闻场景指令，日程锁定规则，亲密阶段解锁提示，技能条提示 |
| src/ent-sim/immersion.js | 热搜→hot-search-replies 关联，移除 AI 调用，新增 injectFanReactionsToPanel() |
| src/ent-sim/data.js | 移除旧池子定义，新增 careerMilestone/INTIMACY_STAGES 常量 |
| src/ent-sim/brother.js | 移除旧池子定义，改为 import pools |
| src/ent-sim/cycle.js | rollDailyAgenda 改为 ent-schedule 三段式组合 |
| src/worlds/entertainment.js | 移除 ENT_SCHEDULE_POOL |
| src/data.js | 移除 GIRLGROUP_PRESETS，改为 import pools |