---
name: entSim-7phase-enhancement
overview: 7个Phase为娱乐圈模拟器实施：P0修复UI重复展示和硬编码颜色→P1-P6原21条建议+人气即通货。零新增AI调用，统一弹窗风格，扩展小池子防耗尽。
todos:
  - id: p0-ui-dedup-fix
    content: P0 前置修复（4项）：[subagent:code-explorer] 确认renderLeft/renderLovePanel/showDailySettlement的精确行号→删除renderLeft曝光条(ui.js:261-263)、showDailySettlement去lastEvent行+改为showEntSimModal统一弹窗风格、renderLeft硬编码颜色(#ff7e7e等)替换为CSS变量(var(--es-red)等) → sasaeng-escalation.js从10条扩展到30条
    status: pending
  - id: p1-fan-contract-date-save
    content: P1 纯逻辑UI（6项）：#3侧边栏加粉丝数行+人气联动涨跌粉+里程碑toast、#4发布作品五档随机排名反馈(扑街-PAK)、#9合约剩余年数行+到期续约Modal、#11恋情面板加"查看纪念日"按钮→Modal时间线、#14 DATE_VENUES从9个扩展到14个、#22 Header存档按钮→Modal3槽位+listSaves
    status: pending
    dependencies:
      - p0-ui-dedup-fix
  - id: p2-award-dispatch-buzz-birthday-conflict-letter
    content: P2 事件注入（6项）：#1 awards.js checkAwardCeremony+AWARD_CEREMONIES典礼表→goEntSimNextDay注入、#7 dispatch-news.js D社年底事件+连续同地约会检测、#10 engine.js generateInteractiveBuzz→结算Modal推/压选项、#13 calendar-events.js强化prompts注入、#17 checkScheduleConflict→约会前冲突Modal、#18 fan-letters.js getFanLetter条件化模板
    status: pending
    dependencies:
      - p1-fan-contract-date-save
  - id: p3-company-teammate-anti-trainee
    content: P3 新系统（4项）：#6 新增company-events.js池子(营业CP/警告/续约)+prompts注入、#8 扩展girlgroup-events.js(退团/保密/矛盾+选项)、#12 sasaeng-escalation.js新增ANTI事件(恶意留言/造谣/脱粉回踩→选项)、#15 generateTraineeOptions出道前每日训练选项替换
    status: pending
    dependencies:
      - p2-award-dispatch-buzz-birthday-conflict-letter
  - id: p4-comeback-radio-rank
    content: P4 日程扩充（3项）：#5 comeback-cycle.js tickComebackCycle状态机(idle-teaser-release-打歌3周-finish)+日程条标签、#16 variety-shows.js扩展电台/VLIVE分类、#19 music-show-pool.js calculateMusicShowRank四维分数计算排名
    status: pending
    dependencies:
      - p3-company-teammate-anti-trainee
  - id: p5-teammate-ending
    content: P5 打磨（2项）：#20 teammate-flavor.js getRandomTeammate轮换队列+13人风味文本注入prompts、#21 endings.js pickEnding扩展7+结局模板(HE公开/地下永久/NE和平/暧昧/BE塌房/情敌隐藏/独美)+感情线/事业线双栏
    status: pending
    dependencies:
      - p4-comeback-radio-rank
  - id: p6-popularity-as-currency
    content: P6 人气即通货：engine.js PR公式prRemaining=1+Math.floor(pop/30)上限5、public-opinion.js人气消耗接入点(封口-5/礼物-2+3好感/推热搜-3)、state.js migrateSave兜底
    status: pending
    dependencies:
      - p5-teammate-ending
---

## 产品概述

为 SEVENTEEN 娱乐圈模拟器实施 21 条游戏性增强建议（跳过 #2 金钱系统），并修复代码审查中发现的 4 个 UI 问题。采用"人气即通货"方案 C 代替金钱系统。所有变更严格增量、不改已有核心逻辑、全部使用 CSS 变量、复用现有 `showEntSimModal` 弹窗体系。

## 核心功能

### P0 前置修复（4项）

- **去重 scandalHeat**：`renderLeft` 中的曝光条与 `renderLovePanel` 重复，删除 renderLeft 的曝光条区域（ui.js:261-263），scandalHeat 只在恋情面板展示
- **去重 careerHistory**：`showDailySettlement` 中的 lastEvent 与 `renderLeft` 最近活动列表语义重复，每日结算弹窗去掉 lastEvent 行，只保留 delta 数值变化
- **硬编码颜色替换**：renderLeft expBarColor 的 `#ff7e7e`/`#ffd166`/`#ffee88`/`#7ee787` 替换为 `var(--es-red)`/`var(--es-yellow)`/`var(--es-green)`；showDailySettlement 整体改为调用 `showEntSimModal()` 统一弹窗风格
- **sasaeng-escalation.js 扩容**：从 10 条扩展到 30 条，覆盖跟踪/偷拍/泄露/威胁/脱粉回踩/造谣/付费群/机场冲撞/安保升级等细分场景

### P1 纯逻辑 UI（6项）

- #3 粉丝俱乐部深度展示：侧边栏加粉丝数行，人气联动涨跌粉，里程碑 toast
- #4 作品销量/音源排名：发布作品结算时五档随机结果（扑街→PAK），人气+2~12
- #9 合约系统：侧边栏合约剩余年数 + 到期续约/独立选择 Modal
- #11 纪念日/回忆录：恋情面板内加"查看纪念日"按钮→Modal 展示时间线
- #14 更丰富的约会地点：DATE_VENUES 从 9 个扩展到 14 个（加汉江公园/南山塔/布帐马车/弘大/私人影院）
- #22 存档槽：Header 加存档按钮→Modal 展示 3 个槽位

### P2 事件注入（6项）

- #1 奖项典礼升级：awards.js 新增 checkAwardCeremony()，每日检测人气≥阈值→典礼触发
- #7 狗仔增强：dispatch-news.js 新增 D社年底事件 + engine.js 连续同地约会检测→跟拍风险
- #10 热搜操盘：engine.js 新增 generateInteractiveBuzz()，每日结算 Modal 中随机出现热搜+推/压选项
- #13 生日节日强化：calendar-events.js 已存在，强化 prompts.js 中的注入时机
- #17 团活冲突：约会前 checkScheduleConflict() → 冲突 Modal 选择
- #18 粉丝来信条件化：fan-letters.js 新增 getFanLetter() 按人气/曝光/好感选模板

### P3 新系统（4项）

- #6 公司/经纪人博弈：**新增 company-events.js** 池子（营业CP安排/经纪人警告/合约续约），prompts 注入
- #8 女团队友深度互动：扩展 girlgroup-events.js（退团危机/恋爱保密/队员矛盾+选项）
- #12 黑粉/ANTI 系统：扩展 sasaeng-escalation.js（恶意留言/造谣/脱粉回踩→选项）
- #15 练习生训练选项：出道前每日替换为训练选项（声乐/舞蹈/自修/休息）

### P4 日程扩充（3项）

- #5 回归周期：comeback-cycle.js 新增 tickComebackCycle() 状态机（idle→teaser→release→打歌3周→finish）
- #16 电台/直播：扩展 variety-shows.js 分类（电台深夜节目/VLIVE 单人/突击直播）
- #19 打歌排名：music-show-pool.js 新增 calculateMusicShowRank()（音源分+销量分+放送分+投票分）

### P5 打磨（2项）

- #20 十三人轮换出场：teammate-flavor.js 新增 getRandomTeammate() 轮换队列→prompts 注入风味文本
- #21 结局细分：endings.js pickEnding 扩展 7+结局模板（HE公开/地下永久/NE和平/暧昧/BE塌房/情敌隐藏/独美）

### P6 人气即通货（方案C）

- PR 公式：`prRemaining = 1 + Math.floor(pop/30)`，上限 5
- 消耗场景：封口狗仔(-5人气)、买礼物(-2人气+3好感)、推热搜对冲(-3人气)

## 技术栈

- 语言：JavaScript ES Modules（var 声明、+ 拼接字符串）
- 框架：Vanilla JS + Vite 5.4
- 样式：CSS 变量体系（--es-bg/#1A1626、--es-primary/#7C6FF0、--es-text/#F2EEFF 等）
- 无新依赖

## 架构复用

所有增强通过 `_entSimPendingEvent` 机制注入 `buildEntSimUserMessage` 的 phase prompt 中，AI 在单次调用中处理多条信息：

```
条件触发 → 池子模板 / pendingEvent → 注入 buildEntSimUserMessage
→ AI 生成叙事（一次 phase 调用）→ parse → 渲染 + 选项
```

零新增 `runEntSimType` 调用，零新增独立 AI 请求。新弹窗统一复用 `showEntSimModal(title, bodyHtml, buttons)` + `es-modal-overlay`/`es-modal` 样式体系。

## 修改文件清单

| 文件 | 修改点 | Phase |
| --- | --- | --- |
| `src/ent-sim/ui.js` | P0去重曝光条(261-263)、P0硬编码颜色→CSS变量(237)、P1粉丝行/合约行/纪念日按钮/存档按钮、P1 DATE_VENUES扩展(129-140)、P4 renderAgenda加回归标签 | P0/P1/P4 |
| `src/ent-sim/engine.js` | P0 showDailySettlement→showEntSimModal(1096-1126)、P1粉丝联动(358-364)、P2奖项典礼/狗仔检测/热搜操盘、P4回归周期tick、P6 PR公式 | P0/P1/P2/P4/P6 |
| `src/ent-sim/state.js` | P1 _fanMilestoneReached初始化 | P1 |
| `src/state.js` | P1/P6 migrateSave兜底新字段 | P1/P6 |
| `src/ent-sim/prompts.js` | P2生日节日强化、P3公司事件/队友事件注入、P5十三人风味文本注入 | P2/P3/P5 |
| `src/ent-sim/public-opinion.js` | P6 PR公式辅助 | P6 |
| `src/ent-sim/endings.js` | P5 pickEnding 7+结局模板 | P5 |
| `src/ent-sim/pools/sasaeng-escalation.js` | P0 10→30条 + P3 ANTI事件选项 | P0/P3 |
| `src/ent-sim/pools/company-events.js` | **新文件**：营业CP/警告/续约模板 | P3 |
| `src/ent-sim/pools/awards.js` | P2 checkAwardCeremony() + AWARD_CEREMONIES | P2 |
| `src/ent-sim/pools/calendar-events.js` | P2 强化注入时机 | P2 |
| `src/ent-sim/pools/dispatch-news.js` | P2 D社年底事件 | P2 |
| `src/ent-sim/pools/fan-letters.js` | P2 getFanLetter() 条件化 | P2 |
| `src/ent-sim/pools/girlgroup-events.js` | P3 退团/保密/矛盾事件 | P3 |
| `src/ent-sim/pools/comeback-cycle.js` | P4 tickComebackCycle() 状态机 | P4 |
| `src/ent-sim/pools/variety-shows.js` | P4 电台/VLIVE分类 | P4 |
| `src/ent-sim/pools/music-show-pool.js` | P4 calculateMusicShowRank() | P4 |
| `src/ent-sim/pools/teammate-flavor.js` | P5 getRandomTeammate() 轮换队列 | P5 |


## 池子分类边界（不重叠原则）

- `comeback-cycle.js`：回归整体叙事（预告/概念照/音源发布/首周/末放），不涉及排名
- `music-show-pool.js`：单次打歌排名计算（音源分+销量分+放送分+投票分），不涉及回归故事
- `company-events.js`：公司/经纪人管理事件（营业CP/警告/续约），不涉及粉丝或媒体
- `dispatch-news.js`：媒体八卦/D社爆料（偷拍/爆料/元旦特辑），不涉及私生
- `sasaeng-escalation.js`：私生/ANTI升级链（跟踪/偷拍/泄露/威胁/脱粉回踩），不涉及公司管理

## 性能与压力

- goEntSimNextDay 已有约 50 个条件判断（317行），新增后控制在约 380 行
- sasaeng-escalation.js 从 10 条扩到 30 条后，200 轮内耗尽概率从高降为极低
- 新增状态字段 4 个，迁移兼容 2 处，不增加 localStorage 存档大小超 5KB

## Agent 扩展

### SubAgent

- **code-explorer**
- 用途：在每个 Phase 开始前确认目标文件精确行号和函数签名，确保增量修改位置准确。搜索硬编码颜色和重复展示字段的具体位置。
- 预期结果：每次修改前获得精确的代码插入点（行号 + 上下文），避免编辑位置偏移和破坏已有逻辑。