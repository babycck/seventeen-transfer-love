---
name: entSim-按预览UI精简重构与恋爱核心
overview: 按 entSim-ui-preview.html 精简重构 entSim UI（三栏+底部4Tab），将恋爱功能做成底部Tab内容（剧情/聊天/朋友圈/剧场），修最关键的 bug，加记忆系统。娱乐圈作为背景层（行程/舆论/风险作为恋爱张力），恋爱是主线。
design:
  architecture:
    framework: html
  styleKeywords:
    - Glassmorphism
    - Dark Purple
    - Blur Backdrop
    - Pulse Animation
    - Three Column Dashboard
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 13px
      weight: 600
    subheading:
      size: 12px
      weight: 600
    body:
      size: 11px
      weight: 400
  colorSystem:
    primary:
      - "#7C6FF0"
      - "#9D8BFF"
    background:
      - "#1A1626"
      - "#221C33"
      - rgba(255,255,255,0.06)
    text:
      - "#F2EEFF"
      - rgba(242,238,255,0.6)
    functional:
      - "#5BD6A0"
      - "#FF8A8A"
      - "#FFD479"
todos:
  - id: ui-redesign
    content: 精简 entSim UI 至预览样式：删除 Header 3 按钮+3 badge、左栏晚档区+开新作品、中栏 5 快捷指令、右栏 4 冗余区块；新增 4 底部 Tab（剧情/聊天/朋友圈/剧场）+ Tab 切换逻辑；日程按钮加地点标签；新增 bindClass 修复 Bug 1；条件推进时段修复 Bug 6；人气行可点击+onPopLog 修复 Bug 9；约会降速修复 Bug 4；UI 按预览 Glassmorphism 暗紫风格重做
    status: completed
  - id: tabs-and-memory
    content: 实现 4 Tab 内容：engine.js 新增 sendEntSimChat/generateEntSimMoment/generateEntSimTheater/compressEntSimYesterday；prompts.js 新增 chat/moment/theater message type + 记忆注入（昨日摘要+事件列表）；state.js 增 chatHistory/moments/theaterHistory/dailySummaries/eventLog；修复 Bug 8（ent-sim/parser.js 正则提取 + parser.js repairJson 深度 + engine.js maxTokens 4000）+ Bug 3（choice 场景连续性）
    status: completed
    dependencies:
      - ui-redesign
  - id: romance-refocus
    content: Prompt 恋爱聚焦：romance.js tryConfession depth>=4+confessionDone 门控修复 Bug 4/7；prompts.js 韩文名禁令修复 Bug 2 + depth 阶段差异化写作指引；5 个 addPopularity 调用点传 reason + public-opinion.js 删重复 push；src/state.js migrateSave 兜底所有新字段
    status: completed
    dependencies:
      - tabs-and-memory
---

## 用户需求

用户反馈 entSim「娱乐圈不像娱乐圈，恋爱游戏不像恋爱游戏」，核心诉求是：

1. 回到 1v1 恋爱游戏模式，和男主的恋爱是主线
2. 娱乐圈作为背景（行程/舆论/风险作为恋爱张力来源，不是经营重点）
3. 按预览 UI（`public/entSim-ui-preview.html`）精简设计——当前 entSim UI 元素过多
4. 需要记忆系统和事件记忆
5. 之前的 5 阶段大计划（3 新模块 + 15 文件修改）太重，要精简

## 产品概述

将 entSim 从「娱乐圈经营模拟器」转型为「娱乐圈背景恋爱游戏」：精简三栏 UI 至预览样式、底部新增 4 Tab（剧情/聊天/朋友圈/剧场）承载恋爱功能、引入记忆系统（每日剧情压缩 + 事件记忆）、修复影响体验的关键 bug、Prompt 重新聚焦恋爱主线。

## 核心功能

- UI 精简至预览样式：Header 只保留周期标签+章节+人气+设置；左栏去掉开新作品/晚档区域；中栏去掉 5 个快捷指令按钮；右栏去掉危机公关/狗仔热搜/地下恋风险行；底部新增 4 Tab
- 4 Tab 系统：剧情 Tab（当前三栏内容）/ 聊天 Tab（手机消息 UI+正在输入动效）/ 朋友圈 Tab（动态+男主评论）/ 剧场 Tab（按恋爱深度解锁番外）
- 记忆系统：每日剧情压缩为结构化摘要（事件/对话/约定/揭示信息），跨天累积注入 Prompt 上下文
- 关键 bug 修复：开新作品点击无反应、AI 自创韩文名、营业后选项场景串台、告白太快且可重复、JSON 截断解析失败、时段感弱（营业/事件不耗时段）、人气变动不可见
- Prompt 恋爱聚焦：depth 阶段差异化写作指引、choice 承接上一段场景、女主名称禁令

## Tech Stack

- 纯 JavaScript (ES Modules)，复用现有 entSim 架构（engine/ui/prompts/state/romance/cycle/data）
- `var` + 字符串拼接代码风格（遵循 AGENTS.md 约定）
- 不引入新依赖，所有功能用浏览器原生 API
- 记忆系统复用 `src/memory.js` 的 `compressOneHeartYesterday()` 模式（结构化 JSON 摘要 + 跨天累积 + 指纹去重）
- Tab 实现参考 oneHeart 的 `switchOneHeartTab`（`ui-renderer.js:2709`）模式但 entSim 独立路径

## Implementation Approach

### 核心策略：精简而非重建

entSim 已有三栏布局、舆论驾驶舱、日程系统、关系网等完整基础设施。不新建模块，而是：

1. **做减法**：去掉预览中没有的 UI 元素（Header 按钮×3、快捷指令×5、右栏冗余×3、左栏晚档×3）
2. **做加法**：底部加 4 Tab + 记忆系统 + Prompt 恋爱聚焦
3. **修 bug**：8 个已确认 bug 中，6 个与沉浸感直接相关，融入增强计划

### UI 精简对照（当前 vs 预览）

| 区域 | 当前 entSim | 预览目标 | 操作 |
| --- | --- | --- | --- |
| Header | 周期+章节+人气+设置+男主btn+哥哥btn+结局btn+badge×3 | 周期+章节+人气+mini-radar+设置 | 删3按钮+3badge，加mini-radar |
| 左栏 | 在播数行+开新作品btn+作品槽+日程+晚档×3+资源 | 作品卡片+日程(带地点)+资源 | 删在播数行+开新作品btn+晚档区 |
| 中栏 | 剧情+选项+输入+快捷指令×5 | 剧情+选项+输入 | 删5个快捷指令按钮 |
| 右栏 | 狗仔条+热搜+粉丝+媒体+雷达+图例+恋险行+mini+NPC+公关btn | 热搜+粉丝+媒体+雷达+图例+NPC | 删狗仔条+恋险行+mini+公关btn |
| 底部 | 深度条+标签 | 深度条+4Tab | 加4Tab |


### 4 Tab 设计

Tab 切换逻辑参考 `switchOneHeartTab`（ui-renderer.js:2709），在 entSim 内部实现：

- **剧情 Tab**：当前三栏内容（Header+左中右+深度条），默认激活
- **聊天 Tab**：手机消息 UI，发送消息→`triggerEntSimEvent('chat', {msg})`→AI 以男主口吻回复；正在输入动效按 depth 延迟
- **朋友圈 Tab**：时间线，`triggerEntSimEvent('moment')`→AI 生成动态+男主评论
- **剧场 Tab**：按 depth 解锁番外类型（男主视角≥2/情敌IF≥2/校园IF≥3/婚后IF≥4/回忆录≥4），`triggerEntSimEvent('theater', {type})`→AI 生成 800 字番外

### 记忆系统设计

复用 `memory.js` 的 `compressOneHeartYesterday()` 模式，在 entSim 内实现：

- `GS.entSim.dailySummaries = []`（max 7 条结构化 JSON 摘要）
- `GS.entSim.eventLog = []`（关键事件累积，`dedupeEventLog` 指纹去重）
- 每天 `advanceWorld()` 时压缩昨日 narrative buffer 为 `{events, dialogues, promises, revealedInfo}` 结构
- `buildEntSimContextSnapshot()` 注入「昨日摘要 + 近7天事件列表」

### Bug 修复融入

| Bug | 融入阶段 | 修复方式 |
| --- | --- | --- |
| 1 (bind失效) | UI精简 | 新增 `bindClass` 替换 `.class` 绑定 |
| 2 (韩文名) | Prompt | 追加女主名称禁令 |
| 3 (场景串台) | Prompt | choice 注入上一段 narrative 摘要 |
| 4+7 (告白太快/重复) | Prompt | tryConfession depth>=4 + confessionDone 门控 + 约会降速 |
| 6 (时段) | UI精简 | 仅 phase/choice/free 推进时段 |
| 8 (JSON截断) | 记忆系统 | 正则提取兜底 + repairJson 深度检查 + maxTokens 4000 |
| 9 (人气不可见) | UI精简 | addPopularity 加 reason + 人气行可点击查看日志 |


## Implementation Notes

- `GS._entSimCurrent` 在 `buildEntSimUserMessage` 调用时仍持有上一轮数据，可安全读取用于 Bug 3 场景连续性注入
- `triggerEntSimEvent` 扩展为 `(eventText, opts)` 需向后兼容——opts 可选，不传时 advanceTime 默认 false
- Tab 切换不重新生成剧情，只切换显示区域；切换到聊天/朋友圈/剧场时各自调一次 API
- 记忆压缩只在 `advanceWorld`（换天）时触发，不每回合调用，避免额外 API 开销
- `addPopularity(delta, reason)` 的 reason 参数向后兼容——不传时行为不变
- UI 精简时保留 `showEntSimModal` 弹窗机制（风险预估/营业/合作等通过弹窗入口而非常驻按钮）
- 预览中日程按钮有地点标签（待机室/摄影棚），当前 `rollDailyAgenda` 不返回地点，需扩展行程池或从 `ENT_SCHEDULE_POOL` 取 place

## Architecture Design

entSim 当前架构不变，修改集中在 UI 渲染层和 Prompt 层：

```
用户操作 → generateEntSimRound(type, extra)
           ↓
    buildEntSimSystemPrompt() ← 注入记忆(昨日摘要+事件列表)+depth指引+韩文名禁令
    buildEntSimUserMessage(type) ← choice注入场景连续性 + tab类型分发
           ↓
    generateWithRetry() → parseEntSimResponse() ← 正则提取兜底(Bug 8)
           ↓
    applySideEffects() → advanceTimeSlot(条件) → advanceWorld(换天时压缩记忆)
           ↓
    GS._entSimCurrent → renderHtml() ← 按当前Tab渲染
```

## Directory Structure

```
src/
├── parser.js                          # [MODIFY] repairJson lastBrace 加 depth 检查（Bug 8B）
├── state.js                           # [MODIFY] migrateSave 兜底 chatHistory/moments/theaterHistory/dailySummaries/eventLog/dateCount
└── ent-sim/
    ├── engine.js                      # [MODIFY] 条件时段+triggerEntSimEvent扩展+maxTokens4000+新增sendEntSimChat/generateEntSimMoment/generateEntSimTheater/compressEntSimYesterday+advanceWorld集成记忆压缩+互动重置
    ├── ui.js                          # [MODIFY] UI精简至预览样式+4Tab渲染+bindClass修复+人气日志+约会降速+Tab切换逻辑+onChat/onMoments/onTheater
    ├── prompts.js                     # [MODIFY] 韩文名禁令+choice场景连续性+depth阶段差异化指引+记忆注入(昨日摘要+事件列表)+聊天/朋友圈/剧场message type
    ├── romance.js                     # [MODIFY] tryConfession depth>=4+confessionDone门控
    ├── cycle.js                       # [MODIFY] rollDailyAgenda 末尾不调男主行程(精简，行程已在prompt注入)
    ├── state.js                       # [MODIFY] initEntSimState 增 chatHistory/moments/theaterHistory/dailySummaries/eventLog/dateCount + addPopularity加reason参数
    ├── parser.js                      # [MODIFY] parseEntSimResponse 正则提取兜底（Bug 8A）
    ├── data.js                        # [MODIFY] 新增 THEATER_TYPES + 日程地点标签扩展
    ├── works.js                       # [MODIFY] addPopularity 传 reason（Bug 9）
    ├── fan-service.js                 # [MODIFY] addPopularity 传 reason（Bug 9）
    ├── awards.js                      # [MODIFY] addPopularity 传 reason（Bug 9）
    └── public-opinion.js              # [MODIFY] addPopularity 传 reason + 删重复 push（Bug 9）
```

### 文件修改详细说明

**src/ent-sim/ui.js** [MODIFY] — UI 精简 + 4 Tab + bug 修复（最大改动文件）

- `renderHeader()`：删除男主/哥哥/结局 3 个按钮 + 3 个 badge，添加 mini-radar
- `renderLeft()`：删除在播作品数行 + 开新作品按钮 + 晚档区域；日程按钮追加地点标签
- `renderCenter()`：删除快捷指令区 5 按钮，保留 narrative+options+free-input
- `renderRight()`：删除狗仔热搜条 + 地下恋风险行 + romance-mini + 危机公关按钮
- `renderFooter()`：深度条 + 4 Tab（剧情/聊天/朋友圈/剧场），Tab 切换逻辑
- 新增 `renderChatTab()`/`renderMomentsTab()`/`renderTheaterTab()` 渲染各 Tab 内容
- 新增 `onChat(msg)`/`onMoments()`/`onTheater(type)` 事件处理
- 新增 `bindClass(sel, fn)` 替代 `bind('.class')` 修复 Bug 1
- 新增 `switchEntSimTab(tab)` Tab 切换函数
- `onEveningChoice` date 分支：约会降速 `dateCount++; if(dateCount%2===0) advanceRomance(1)`
- 人气行改可点击按钮 + `onPopLog()` 弹窗展示 careerHistory 中 type='popularity'
- 新增 `onRomance()` 告白重构：`triggerEntSimEvent('告白场景', {advanceTime:true})` 替代直接 applyConfessionResult

**src/ent-sim/engine.js** [MODIFY] — 条件时段 + Tab API + 记忆压缩

- line 47：`maxTokens: 3200` → `maxTokens: 4000`
- line 55：`advanceTimeSlot()` 改为条件（仅 phase/choice/free 或 extra.advanceTime）
- line 226 `triggerEntSimEvent`：扩展为 `(eventText, opts)`
- 新增 `sendEntSimChat(msg)`：构建 chat 类型 user message，调 `generateEntSimRound('chat', {msg})`
- 新增 `generateEntSimMoment()`：调 `generateEntSimRound('moment', {})`
- 新增 `generateEntSimTheater(type)`：调 `generateEntSimRound('theater', {type})`
- 新增 `compressEntSimYesterday()`：复用 memory.js 模式，压缩 narrative buffer 为结构化 JSON
- `advanceWorld()`：调 `compressEntSimYesterday()` + 重置 `npcInteractionUsed`

**src/ent-sim/prompts.js** [MODIFY] — 恋爱聚焦 + 记忆注入 + bug 修复

- `buildEntSimSystemPrompt()`：追加韩文名禁令（Bug 2）+ depth 阶段差异化写作指引
- `buildEntSimUserMessage()` choice 分支：注入上一段 narrative 前 150 字 + 场景连续性指引（Bug 3）
- `buildEntSimContextSnapshot()`：注入昨日摘要 + 近 7 天事件列表（记忆系统）
- 新增 chat/moment/theater 三种 message type 的 user message 构建

**src/ent-sim/state.js** [MODIFY] — 新字段 + addPopularity reason

- `initEntSimState()`：增 `chatHistory:[]`/`moments:[]`/`theaterHistory:[]`/`dailySummaries:[]`/`eventLog:[]`/`dateCount:0`/`npcInteractionUsed:0`
- `addPopularity(delta)` → `addPopularity(delta, reason)`：reason 非空时写 careerHistory

**src/ent-sim/romance.js** [MODIFY] — 告白门控

- line 51：`depth>=3` → `depth>=4`，追加 `&& !E.romance.confessionDone`

**src/ent-sim/parser.js** [MODIFY] — 正则提取兜底（Bug 8A）

- `parseEntSimResponse()`：safeParseJson 失败后增加正则提取 narrative/options

**src/parser.js** [MODIFY] — repairJson 深度检查（Bug 8B）

- `repairJson()`：lastBrace 截取前遍历统计 depth，不为 0 时跳过

**src/ent-sim/data.js** [MODIFY] — 剧场类型 + 日程地点

- 新增 `THEATER_TYPES` 数组（5 种番外，按 depth 解锁）
- `rollDailyAgenda` 行程池扩展地点标签或从 `ENT_SCHEDULE_POOL` 取 place

**src/state.js** [MODIFY] — migrateSave 兜底

- 追加 `chatHistory/moments/theaterHistory/dailySummaries/eventLog/dateCount/npcInteractionUsed` 兜底

**Bug 9 调用点修改**（4 文件各改 1 行）：

- `works.js:48`：`addPopularity(1, '在播作品微涨')`
- `fan-service.js:54`：`addPopularity(?, '营业·'+def.label)`
- `awards.js:50`：`addPopularity(8, '颁奖礼·'+note)`
- `public-opinion.js:104`：`addPopularity(-popDrop, '恋情曝光反噬')` + 删 :111-115 重复 push

## 设计风格

按 `public/entSim-ui-preview.html` 预览设计，采用暗色玻璃拟态（Glassmorphism）风格。三栏布局 240px / 1fr / 280px，整体深紫色调（`#1A1626` 底 + `#7C6FF0`/`#9D8BFF` 主色），毛玻璃面板（`backdrop-filter:blur(14px)` + `rgba(255,255,255,0.06)` 卡片），脉冲动画点缀关键状态。

## 页面规划

### 单页面：娱乐圈恋爱驾驶舱（三栏 + 底部 Tab）

**Header 区块**（顶部横条）：

- 周期标签（渐变文字+脉冲，如「回归期 · 打歌中 Day3」）
- 章节徽章（圆角胶囊，如「出道期」）
- 人气数值（可点击查看变动日志）
- mini-radar 缩略雷达（40px SVG）
- 设置图标

**左栏 · 事业背景**：

- 作品卡片（进度点+阶段标签+在播警告）
- 今日日程（带图标的按钮列表+地点标签，done 状态灰化）
- 资源等级（星级+阶段文字）

**中栏 · 剧情主线**：

- 剧情正文（圆角卡片，热搜内嵌标签）
- 选项列表（紫色渐变按钮+风险标签）
- 自由输入框

**右栏 · 舆论态势**：

- 热搜列表（排名+火焰图标，me 高亮脉冲）
- 粉丝讨论（三色气泡：大粉/路人/黑粉）
- 媒体定调（带标签）
- 雷达图（150px 四维：粉丝/路人/媒体/同行）
- 关系网（3 列网格，warn 状态红色脉冲）

**底部栏**：

- 恋爱深度条（5 格渐变红→粉）
- 4 Tab 切换（剧情/聊天/朋友圈/剧场，激活态渐变紫）

**聊天 Tab 内容**：手机消息 UI（气泡+头像+正在输入动效+话题引导按钮）
**朋友圈 Tab 内容**：时间线动态+男主评论
**剧场 Tab 内容**：番外类型选择（按 depth 解锁灰化）+内容展示

**弹窗**：风险预估弹窗（红色边框+风险评分+确认/掩护/放弃三按钮）

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 搜索 entSim 模块间的 import/export 依赖链，确认新增 engine 函数（sendEntSimChat/generateEntSimMoment/generateEntSimTheater/compressEntSimYesterday）的导入路径正确性，以及 ui.js 新增 Tab 渲染函数与 engine.js 的调用关系无循环依赖
- Expected outcome: 验证修改后的 import 路径与现有 engine.js/ui.js/prompts.js/state.js 的引用关系无断裂