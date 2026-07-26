---
name: entSim游戏性能增强计划
overview: 为娱乐圈模拟器实施21条游戏性增强建议（跳过#2金钱系统），分5个Phase按序实施。整体只新增1个池子文件，零新增AI调用。UI严格遵循现有暗紫色Glassmorphism风格，长内容用按钮触发Modal而非下拉弹窗，不改动已有功能。
design:
  architecture:
    framework: react
  styleKeywords:
    - 暗紫色玻璃态
    - Glassmorphism
    - 半透明卡片
    - 霓虹紫渐变
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 16px
      weight: 700
    subheading:
      size: 13px
      weight: 600
    body:
      size: 12px
      weight: 400
  colorSystem:
    primary:
      - "#7C6FF0"
      - "#9D8BFF"
    background:
      - "#1A1626"
      - "#221c33"
    text:
      - "#F2EEFF"
      - rgba(242,238,255,0.75)
      - rgba(242,238,255,0.6)
    functional:
      - "#5BD6A0"
      - "#FF8A8A"
      - "#FFD479"
todos:
  - id: p1-fan-contract-date-save
    content: Phase 1 纯逻辑UI（6项）：#3粉丝数展示与联动、#4作品销量五档随机、#9合约系统(侧边栏+到期Modal)、#11纪念日时间线按钮、#14约会地点扩展到14个、#22存档槽(Header按钮+Modal+listSaves)
    status: pending
  - id: p2-award-dispatch-buzz-birthday-conflict-letter
    content: Phase 2 事件注入（6项）：#1奖项典礼(awards.js+checkAwardCeremony)、#7狗仔增强(dispatch-news.js+连续同地检测)、#10热搜操盘(generateInteractiveBuzz+confirmModal)、#13生日节日(calendar-events.js强化)、#17团活冲突(checkScheduleConflict+Modal)、#18粉丝来信条件化(getFanLetter)
    status: pending
    dependencies:
      - p1-fan-contract-date-save
  - id: p3-company-teammate-anti-trainee
    content: Phase 3 新系统（4项）：#6公司博弈(新池company-events.js+prompts注入)、#8队友互动(扩展girlgroup-events.js)、#12ANTI系统(扩展sasaeng-escalation.js+选项)、#15训练选项(generateTraineeOptions+出道前每日替换)
    status: pending
    dependencies:
      - p2-award-dispatch-buzz-birthday-conflict-letter
  - id: p4-comeback-radio-rank
    content: Phase 4 日程扩充（3项）：#5回归周期(comeback-cycle.js状态机+日程条标签)、#16电台直播(扩展variety-shows.js分类)、#19打歌排名(music-show-pool.js calculateMusicShowRank)
    status: pending
    dependencies:
      - p3-company-teammate-anti-trainee
  - id: p5-teammate-ending
    content: Phase 5 打磨（2项）：#20十三人轮换出场(teammate-flavor.js队列+getRandomTeammate+prompts注入)、#21结局细分(endings.js 7+结局模板+双时间线)
    status: pending
    dependencies:
      - p4-comeback-radio-rank
  - id: p6-popularity-as-currency
    content: Phase 6 人气即通货：PR次数=1+Math.floor(pop/30)上限5、封口-5人气、送礼物-2人气+3好感、推热搜-3人气；修改engine.js中prRemaining初始化逻辑和人气消耗接入点
    status: pending
    dependencies:
      - p5-teammate-ending
---

## 用户需求

用户要求实施 `scripts/gameplay-suggestions.md` 中除#2（金钱系统）外的全部21条游戏性增强建议，同时采用"人气即通货"方案C代替金钱系统。

### 核心约束

- UI风格必须与现有暗紫色Glassmorphism主题完全一致（CSS变量 --es-bg:#1A1626 / --es-card半透明 / --es-primary:#7C6FF0）
- 任何地方不使用向下弹窗（dropdown），展示内容过长时改用按钮触发 Modal 弹窗（复用现有 `showEntSimModal` 函数）
- 不修改已有功能的核心逻辑，仅做扩展增量
- 使用 `var` 声明变量，使用 `+` 运算符拼接字符串，AI生成文本插入DOM前必须经过 `escHtml()` 转义
- 不引入新依赖

### 金钱替代方案（方案C：人气即通货）

不加金钱字段，让PR公关次数和人气挂钩：

- 公关次数 = 基础1次 + Math.floor(人气/30)，上限5次
- 人气消耗场景：封口狗仔(-5人气)、给男主买礼物(-2人气+3好感)、推正面热搜对冲(-3人气)

## 技术方案

### 架构复用

全部增强通过现有 `_entSimPendingEvent` 机制和 `buildEntSimUserMessage` 的 phase prompt 注入实现：

```
条件触发 -> 池子模板/pendingEvent -> 注入 buildEntSimUserMessage
-> AI生成叙事（一次phase调用同时处理多条信息）-> parse -> 渲染+选项
```

零新增 `runEntSimType` 调用，零新增独立 AI 请求。

### 关键文件修改清单

| 文件 | 修改点 | 涉及Phase |
| --- | --- | --- |
| `src/ent-sim/ui.js` | renderLeft加合约行/存档按钮、renderRight加粉丝行、renderLovePanel加纪念日按钮、renderAgenda加回归标签、releaseWork加销量反馈、DATE_VENUES扩展 | P1/P2/P4/P6 |
| `src/ent-sim/engine.js` | goEntSimNextDay：粉丝联动(360行附近)、奖项注入(400行附近)、狗仔检测(410行附近)、团活冲突(约会前)、人气即通货PR公式(360行附近) | P1/P2/P4/P6 |
| `src/ent-sim/state.js` | initEntSimState：合约字段contractYears/contractRemaining/independenceRoute、粉丝里程碑_fanMilestoneReached | P1 |
| `src/state.js` | migrateSave：合约/粉丝/存档槽新字段兜底初始化 | P1/P6 |
| `src/ent-sim/prompts.js` | buildEntSimUserMessage：队友客串注入、公司事件注入、生日节日强化注入、13人出场风味文本 | P2/P3/P4/P5 |
| `src/ent-sim/public-opinion.js` | 人气即通货PR公式辅助 | P6 |
| `src/ent-sim/endings.js` | pickEnding扩展7+结局模板 | P5 |
| `src/ent-sim/pools/awards.js` | 新增AWARD_CEREMONIES典礼表+checkAwardCeremony | P2 |
| `src/ent-sim/pools/company-events.js` | **新文件**：3-5个公司事件模板(营业CP/警告/续约) | P3 |
| `src/ent-sim/pools/girlgroup-events.js` | 扩展退团/保密/矛盾事件 | P3 |
| `src/ent-sim/pools/sasaeng-escalation.js` | 扩展恶意留言/造谣/脱粉回踩+选项 | P3 |
| `src/ent-sim/pools/comeback-cycle.js` | 新增状态机函数tickComebackCycle | P4 |
| `src/ent-sim/pools/variety-shows.js` | 扩展电台/VLIVE分类 | P4 |
| `src/ent-sim/pools/music-show-pool.js` | 新增calculateMusicShowRank | P4 |
| `src/ent-sim/pools/teammate-flavor.js` | 新增轮换队列+getRandomTeammate | P5 |
| `src/ent-sim/pools/calendar-events.js` | 强化checkCalendarEvents注入时机 | P2 |
| `src/ent-sim/pools/dispatch-news.js` | 新增D社年底事件 | P2 |
| `src/ent-sim/pools/fan-letters.js` | 新增条件化getFanLetter | P2 |


### 状态新增字段

| 字段 | 类型 | 位置 | 用途 |
| --- | --- | --- | --- |
| `E.career.contractYears` | number | state.js | 合约总年数，默认7 |
| `E.career.contractRemaining` | number | state.js | 合约剩余年数 |
| `E.career.independenceRoute` | boolean | state.js | 是否走独立路线 |
| `E._fanMilestoneReached` | object | state.js | 粉丝里程碑记录 |
| `E._buzzInteractCD` | number | engine.js | 热搜互动冷却 |
| `E._lastDateDay` | number | engine.js | 上次约会日（狗仔检测用） |


### 新增Modal（均复用showEntSimModal）

1. **存档槽选择Modal**：标题"存档管理"，展示3个槽位（含日期/成员/好感/时间），空槽位显示"+"。点击对应槽位按钮触发saveGame(slot)或loadGame(slot)。
2. **团活冲突警告Modal**：标题"日程冲突"，展示冲突信息+两个选项按钮（去团活/溜去约会），使用showEntSimModal渲染。

### UI改动原则

- 侧边栏新增行统一使用 `es-row` 样式类
- 按钮统一使用 `es-btn` 或 `qbtn` 样式类
- 所有弹窗复用 `showEntSimModal(title, bodyHtml, buttons)` 模式
- 严禁创建 dropdown/select/context menu 等向下展开组件
- 内容过长的面板区域（如纪念日时间线），改为一个"查看详情"按钮，点击后 showEntSimModal 展示完整内容

## 设计风格

严格遵循现有暗紫色 Glassmorphism 主题，全部复用项目中已有的CSS变量和样式类。

### 颜色系统（已有CSS变量）

- 背景：--es-bg #1A1626，渐变叠加 radial-gradient(#2a2150)
- 卡片：--es-card rgba(255,255,255,0.06)，边框 --es-card-border rgba(255,255,255,0.12)
- 主色：--es-primary #7C6FF0，--es-primary2 #9D8BFF
- 文字：--es-text #F2EEFF，--es-text-dim rgba(242,238,255,0.6)
- 功能色：--es-green #5BD6A0，--es-red #FF8A8A，--es-yellow #FFD479

### 布局复用

- 三栏布局 .es-grid（左270px | 中flex | 右270px）
- 面板 .es-panel（圆角14px、backdrop-filter:blur(14px)）
- 弹窗 .es-modal-overlay + .es-modal（深紫渐变 #241d3d→#1a1530）

### 新增UI元素风格

- 侧边栏新增行：使用现有 .es-row 样式（flex/space-between/text-dim/text）
- 新增按钮：使用现有 .es-btn 或 .qbtn 样式
- 合约倒计时文字：使用 --es-yellow 强调色
- 粉丝里程碑toast：复用现有 showToast 函数
- Modal内选项按钮：复用 .es-modal-opt 样式（rgba(124,111,240,.1)背景+紫色边框）

## 子代理

- **code-explorer**
- 用途：在实施每个Phase前，确认目标文件的当前精确行号和函数签名，确保修改位置准确
- 预期结果：每次修改前获得精确的代码插入点（行号+上下文），避免编辑位置偏移