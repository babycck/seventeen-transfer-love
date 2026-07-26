---
name: entSim-7phase-enhancement
overview: 7个Phase为娱乐圈模拟器实施21条建议+UI修复。关键修正：统一弹窗风格为 es-stageup-card（紫粉半透明渐变+发光阴影+弹跳动画），非 es-modal。零新增AI调用，扩展小池子防耗尽。
design:
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 20px
      weight: 800
    subheading:
      size: 14px
      weight: 600
    body:
      size: 12px
      weight: 400
  colorSystem:
    primary:
      - "#7C6FF0"
      - "#9D8BFF"
      - "#ffd479"
    background:
      - "#1A1626"
      - rgba(255,255,255,0.06)
      - rgba(124,111,240,.22)
    text:
      - "#F2EEFF"
      - rgba(255,255,255,.88)
      - rgba(242,238,255,0.6)
    functional:
      - "#5BD6A0"
      - "#FF8A8A"
      - "#FFD479"
todos:
  - id: p0-ui-dedup-fix
    content: "P0 前置修复（4项）：使用 [subagent:code-explorer] 确认 renderLeft 曝光条(261-263)、expBarColor(237)、showDailySettlement(1096-1126)等精确行号。删除 renderLeft 曝光条区域、expBarColor 硬编码颜色替换为 var(--es-red)/var(--es-yellow)/var(--es-green)、showDailySettlement 删除 lastEvent 行并删除内联 background:#1f1a35 覆盖以恢复 es-stageup-card 标准半透明紫粉渐变、硬编码颜色 #c8b8f0 替换为 es-stageup-label 标准类。sasaeng-escalation.js 从 10 条扩展到 30 条。"
    status: completed
  - id: p1-fan-contract-date-save
    content: P1 纯逻辑UI（6项）：#3 renderRight 加粉丝数行+人气联动涨跌粉+里程碑toast、#4 发布作品五档随机排名反馈(扑街到PAK)、#9 侧边栏合约剩余年数+到期续约es-stageup-card弹窗、#11 恋情面板加\"查看纪念日\"按钮到es-stageup-card弹窗展示时间线、#14 DATE_VENUES 从 9 个扩展到 14 个、#22 Header 存档按钮到es-stageup-card弹窗 3 槽位+listSaves+saveGame/loadGame
    status: completed
    dependencies:
      - p0-ui-dedup-fix
  - id: p2-award-dispatch-buzz-birthday-conflict-letter
    content: P2 事件注入（6项）：#1 awards.js checkAwardCeremony+AWARD_CEREMONIES 典礼表到goEntSimNextDay 注入、#7 dispatch-news.js D社年底事件+engine.js 连续同地约会检测、#10 engine.js generateInteractiveBuzz 到结算弹窗推/压选项、#13 calendar-events.js 强化 prompts 注入、#17 checkScheduleConflict 到约会前冲突 es-stageup-card 弹窗、#18 fan-letters.js getFanLetter 条件化模板
    status: completed
    dependencies:
      - p1-fan-contract-date-save
  - id: p3-company-teammate-anti-trainee
    content: P3 新系统（4项）：#6 新增 company-events.js 池子(营业CP/警告/续约)+prompts 注入、#8 扩展 girlgroup-events.js(退团/保密/矛盾+选项)、#12 sasaeng-escalation.js 新增ANTI事件(恶意留言/造谣/脱粉回踩到选项)、#15 generateTraineeOptions 出道前每日训练选项替换
    status: completed
    dependencies:
      - p2-award-dispatch-buzz-birthday-conflict-letter
  - id: p4-comeback-radio-rank
    content: P4 日程扩充（3项）：#5 comeback-cycle.js tickComebackCycle 状态机(idle到teaser到release到打歌3周到finish)+日程条标签、#16 variety-shows.js 扩展电台/VLIVE 分类、#19 music-show-pool.js calculateMusicShowRank 四维分数计算排名
    status: completed
    dependencies:
      - p3-company-teammate-anti-trainee
  - id: p5-teammate-ending
    content: P5 打磨（2项）：#20 teammate-flavor.js getRandomTeammate 轮换队列+13人风味文本注入 prompts、#21 endings.js pickEnding 扩展 7+结局模板(HE公开/地下永久/NE和平/暧昧/BE塌房/情敌隐藏/独美)+感情线/事业线双栏
    status: completed
    dependencies:
      - p4-comeback-radio-rank
  - id: p6-popularity-as-currency
    content: P6 人气即通货：engine.js PR 公式 prRemaining=1+Math.floor(pop/30) 上限 5、public-opinion.js 人气消耗接入点(封口-5/礼物-2+3好感/推热搜-3)、state.js migrateSave 兜底
    status: completed
    dependencies:
      - p5-teammate-ending
---

## 产品概述

为 SEVENTEEN 娱乐圈模拟器实施 21 条游戏性增强建议（跳过 #2 金钱系统），并修复代码审查中发现的 4 个 UI 问题。采用"人气即通货"方案 C 代替金钱系统。所有变更严格增量、不改已有核心逻辑、全部使用 CSS 变量、统一复用 es-stageup-card 半透明紫粉渐变弹窗体系。

## 核心功能

### P0 前置修复（4项）

- 去重 scandalHeat：renderLeft 中的曝光条与 renderLovePanel 重复，删除 renderLeft 的曝光条区域（ui.js:261-263），scandalHeat 只在恋情面板展示
- 去重 careerHistory：showDailySettlement 中的 lastEvent 与 renderLeft 最近活动列表语义重复，删除 lastEvent 行，只保留 delta 数值变化
- 硬编码颜色替换：renderLeft expBarColor 的 #ff7e7e/#ffd166/#ffee88/#7ee787 替换为 var(--es-red)/var(--es-yellow)/var(--es-green)；showDailySettlement 中 #c8b8f0/rgba(220,210,255,.8)/#1f1a35/#151020 替换为 es-stageup-card 标准样式和 CSS 变量
- sasaeng-escalation.js 扩容：从 10 条扩展到 30 条，覆盖跟踪/偷拍/泄露/威胁/脱粉回踩/造谣/付费群/机场冲撞/安保升级等细分场景

### P1 纯逻辑 UI（6项）

- #3 粉丝俱乐部深度展示：侧边栏加粉丝数行，人气联动涨跌粉，里程碑 toast
- #4 作品销量/音源排名：发布作品结算时五档随机结果（扑街到PAK），人气+2~12
- #9 合约系统：侧边栏合约剩余年数 + 到期续约/独立选择弹窗
- #11 纪念日/回忆录：恋情面板内加"查看纪念日"按钮，点击弹窗展示时间线
- #14 更丰富的约会地点：DATE_VENUES 从 9 个扩展到 14 个（加汉江公园/南山塔/布帐马车/弘大/私人影院）
- #22 存档槽：Header 加存档按钮，弹窗展示 3 个槽位 + saveGame/loadGame/listSaves

### P2 事件注入（6项）

- #1 奖项典礼升级：awards.js 新增 checkAwardCeremony()，每日检测人气大于等于阈值则典礼触发
- #7 狗仔增强：dispatch-news.js 新增 D社年底事件 + engine.js 连续同地约会检测触发跟拍风险
- #10 热搜操盘：engine.js 新增 generateInteractiveBuzz()，每日结算弹窗中随机出现热搜+推/压选项
- #13 生日节日强化：calendar-events.js 已存在，强化 prompts.js 中的注入时机
- #17 团活冲突：约会前 checkScheduleConflict() 则弹出冲突弹窗选择
- #18 粉丝来信条件化：fan-letters.js 新增 getFanLetter() 按人气/曝光/好感选模板

### P3 新系统（4项）

- #6 公司/经纪人博弈：新增 company-events.js 池子（营业CP安排/经纪人警告/合约续约），prompts 注入
- #8 女团队友深度互动：扩展 girlgroup-events.js（退团危机/恋爱保密/队员矛盾+选项）
- #12 黑粉/ANTI 系统：扩展 sasaeng-escalation.js（恶意留言/造谣/脱粉回踩到选项）
- #15 练习生训练选项：出道前每日替换为训练选项（声乐/舞蹈/自修/休息）

### P4 日程扩充（3项）

- #5 回归周期：comeback-cycle.js 新增 tickComebackCycle() 状态机（idle到teaser到release到打歌3周到finish）
- #16 电台/直播：扩展 variety-shows.js 分类（电台深夜节目/VLIVE 单人/突击直播）
- #19 打歌排名：music-show-pool.js 新增 calculateMusicShowRank()（音源分+销量分+放送分+投票分）

### P5 打磨（2项）

- #20 十三人轮换出场：teammate-flavor.js 新增 getRandomTeammate() 轮换队列，prompts 注入风味文本
- #21 结局细分：endings.js pickEnding 扩展 7+结局模板（HE公开/地下永久/NE和平/暧昧/BE塌房/情敌隐藏/独美）

### P6 人气即通货（方案C）

- PR 公式：prRemaining = 1 + Math.floor(pop/30)，上限 5
- 消耗场景：封口狗仔(-5人气)、买礼物(-2人气+3好感)、推热搜对冲(-3人气)

## 技术栈

- 语言：JavaScript ES Modules（var 声明、+ 拼接字符串）
- 框架：Vanilla JS + Vite 5.4
- 样式：CSS 变量体系（--es-bg/#1A1626、--es-primary/#7C6FF0、--es-text/#F2EEFF 等）
- 弹窗体系：es-stageup-overlay + es-stageup-card（半透明紫粉渐变 + 紫色发光阴影 + 弹跳入场动画）
- 无新依赖

## 架构复用

所有增强通过 _entSimPendingEvent 机制注入 buildEntSimUserMessage 的 phase prompt 中，AI 在单次调用中处理多条信息：

```
条件触发 -> 池子模板 / pendingEvent -> 注入 buildEntSimUserMessage
-> AI 生成叙事（一次 phase 调用）-> parse -> 渲染 + 选项
```

零新增 runEntSimType 调用，零新增独立 AI 请求。

## 弹窗统一方案（已修正）

所有弹窗使用 es-stageup-card 体系（style.css:3270-3285）：

| 属性 | 值 |
| --- | --- |
| 遮罩 | .es-stageup-overlay: position:fixed; background:rgba(6,4,20,.6); backdrop-filter:blur(4px) |
| 容器 | .es-stageup-card: max-width:420px; border-radius:20px; padding:34px 28px |
| 背景 | linear-gradient(160deg, rgba(124,111,240,.22), rgba(255,126,179,.18)) |
| 边框 | 1px solid rgba(255,255,255,.18) |
| 阴影 | 0 20px 60px rgba(124,111,240,.4) |
| 动画 | esStagePop 弹跳入场(.4s) + esBeat 图标心跳(1.4s) |
| 图标 | .es-stageup-icon font-size:54px |
| 标题 | .es-stageup-label font-size:20px; font-weight:800; color:#ffd479 |
| 描述 | .es-stageup-desc font-size:14px; color:rgba(255,255,255,.88) |
| 按钮 | .primary: background:linear-gradient(135deg, var(--es-primary), var(--es-primary2)) |


showDailySettlement 当前存在两个问题：

1. 内联 style 覆盖了 es-stageup-card 的背景色：`background:linear-gradient(160deg,#1f1a35,#151020)`（硬编码深色，非半透明紫粉），应删除此内联覆盖恢复标准半透明渐变
2. 硬编码颜色：`#c8b8f0` 标题色、`rgba(220,210,255,.8)` 文字色，应替换为 es-stageup-label/es-stageup-desc 标准类

## 修改文件清单

| 文件 | 修改点 | Phase |
| --- | --- | --- |
| src/ent-sim/ui.js | P0 renderLeft 删除曝光条(261-263) + expBarColor(237)替换为CSS变量、P1 粉丝行/合约行/纪念日按钮/存档按钮、P1 DATE_VENUES扩展(129-140)、P4 renderAgenda加回归标签 | P0/P1/P4 |
| src/ent-sim/engine.js | P0 showDailySettlement 删除lastEvent(1107-1112)+删除内联background覆盖(1115)+删除硬编码颜色(#c8b8f0等1117-1118)+按钮恢复标准.primary类(1120)、P1 粉丝联动(360行附近)、P2 奖项/狗仔/热搜注入、P4 回归周期、P6 PR公式 | P0/P1/P2/P4/P6 |
| src/ent-sim/state.js | P1 _fanMilestoneReached 初始化 + contractYears/contractRemaining/independenceRoute | P1 |
| src/state.js | P1/P6 migrateSave 兜底新字段 | P1/P6 |
| src/ent-sim/prompts.js | P2 生日节日强化、P3 公司事件/队友事件注入、P5 十三人风味文本注入 | P2/P3/P5 |
| src/ent-sim/public-opinion.js | P6 PR 公式辅助 | P6 |
| src/ent-sim/endings.js | P5 pickEnding 7+结局模板 | P5 |
| src/ent-sim/pools/sasaeng-escalation.js | P0 10条到30条 + P3 ANTI事件选项 | P0/P3 |
| src/ent-sim/pools/company-events.js | 新文件：营业CP/警告/续约模板 | P3 |
| src/ent-sim/pools/awards.js | P2 checkAwardCeremony() + AWARD_CEREMONIES | P2 |
| src/ent-sim/pools/calendar-events.js | P2 强化注入时机 | P2 |
| src/ent-sim/pools/dispatch-news.js | P2 D社年底事件 | P2 |
| src/ent-sim/pools/fan-letters.js | P2 getFanLetter() 条件化 | P2 |
| src/ent-sim/pools/girlgroup-events.js | P3 退团/保密/矛盾事件 | P3 |
| src/ent-sim/pools/comeback-cycle.js | P4 tickComebackCycle() 状态机 | P4 |
| src/ent-sim/pools/variety-shows.js | P4 电台/VLIVE分类 | P4 |
| src/ent-sim/pools/music-show-pool.js | P4 calculateMusicShowRank() | P4 |
| src/ent-sim/pools/teammate-flavor.js | P5 getRandomTeammate() 轮换队列 | P5 |


## 状态新增字段

| 字段 | 类型 | 位置 | 用途 |
| --- | --- | --- | --- |
| E.career.contractYears | number | state.js | 合约总年数，默认 7 |
| E.career.contractRemaining | number | state.js | 合约剩余年数 |
| E.career.independenceRoute | boolean | state.js | 是否走独立路线 |
| E._fanMilestoneReached | object | state.js | 粉丝里程碑记录 |
| E._buzzInteractCD | number | engine.js | 热搜互动冷却 |
| E._lastDateDay | number | engine.js | 上次约会日（狗仔检测用） |
| E._lastDateVenue | string | engine.js | 上次约会地点（狗仔检测用） |


## 池子分类边界（不重叠原则）

- comeback-cycle.js：回归整体叙事（预告/概念照/音源发布/首周/末放），不涉及排名
- music-show-pool.js：单次打歌排名计算（音源分+销量分+放送分+投票分），不涉及回归故事
- company-events.js：公司/经纪人管理事件（营业CP/警告/续约），不涉及粉丝或媒体
- dispatch-news.js：媒体八卦/D社爆料（偷拍/爆料/元旦特辑），不涉及私生
- sasaeng-escalation.js：私生/ANTI升级链（跟踪/偷拍/泄露/威胁/脱粉回踩），不涉及公司管理

严格遵循现有暗紫色 Glassmorphism 主题。弹窗统一使用 es-stageup-card 半透明紫粉渐变+紫色发光阴影+弹跳入场动画体系。

## 全局弹窗模板

所有新增弹窗复用以下模板，保持与现有 es-stageup-card 体系完全一致：

```
es-stageup-overlay（遮罩 rgba(6,4,20,.6) + blur(4px)）
  └── es-stageup-card（半透明紫粉渐变 + 紫色发光阴影）
        ├── es-stageup-icon（54px emoji，心跳动画）
        ├── es-stageup-label（20px 金色粗体标题）
        ├── es-stageup-desc（14px 半透明白色描述）
        └── button.primary（紫色渐变按钮）
```

## 展示规则

- 长内容（合约详情、纪念日时间线、存档槽列表）使用按钮触发 es-stageup-overlay 弹窗，不做下拉
- 侧边栏新增行使用 es-row 样式类，颜色使用 CSS 变量
- 所有硬编码颜色（#xxxxxx、rgba() 内联）替换为对应的 CSS 变量或 es-stageup-* 标准类名
- 无新增 dropdown/select/context-menu

## SubAgent

- **code-explorer**
- 用途：在每个 Phase 开始前确认目标文件精确行号和函数签名，确保增量修改位置准确。搜索硬编码颜色和重复展示字段的具体位置。验证 showDailySettlement 删除 lastEvent 后无引用残留。
- 预期结果：每次修改前获得精确的代码插入点（行号 + 上下文），避免编辑位置偏移和破坏已有逻辑。