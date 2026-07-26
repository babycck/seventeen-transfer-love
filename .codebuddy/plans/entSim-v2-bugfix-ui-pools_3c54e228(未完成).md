---
name: entSim-v2-bugfix-ui-pools
overview: 合并两轮需求共14项：Kakao聊天修复、泡泡发送按钮上移、女团队友确认弹窗、快捷栏重排+工作冷却、池子scope字段+补全、结局迁移、团队信息改版、恋情面板修复、删除关系网、日程事件系统等。
todos:
  - id: p0-bugfix-kakao-bubble
    content: P0 Bug修复：Kakao onclick改为data-*+事件委托（ui.js:1446-1464行）；泡泡发送栏加margin-bottom CSS约束贴合手机圆角（style.css）
    status: pending
  - id: teammate-confirm-flavor
    content: 女团队友确认弹窗+flavor修复：左侧栏队友点击改为先调confirmTeammateInteract弹窗；buildEntSimHeroineGroup()新增personalityTag字段使TEAMMATE_FLAVOR键匹配（data.js/ui.js）
    status: pending
  - id: delete-npc-network
    content: 删除关系网：ui.js删除NPC网格渲染/事件绑定/onNpcInteract函数/npc-network导入/SHOW_NPC常量；state.js删除initNpcNodes调用和npcInteractionUsed；npc-network.js保留不动
    status: pending
  - id: quickbar-reorder-cooldown
    content: 快捷栏重排+冷却系统+结局迁移+团队信息分两行+最近活动+恋情面板修复+哥哥支持度可点击（ui.js一次性完成所有渲染和事件修改；state.js新增冷却字段和supportLog；brother.js追加日志；style.css补disabled样式）
    status: pending
    dependencies:
      - p0-bugfix-kakao-bubble
  - id: pool-scope-comment-fix
    content: 池子scope+注释修正：四个工作池每条加scope:solo/group；5个池子注释修正实际条数
    status: pending
  - id: pool-fill-brand-chat
    content: 池子补全：brand-offers.js +8条（digital/perfume/skincare/eyewear各+2）；chat-male-lead.js +15条（CHAT_RIVAL+5/CHAT_MANAGER+5/GROUP_CHAT+3+2/CHAT_BROTHER+2）
    status: pending
  - id: scheduled-events-system
    content: 日程事件系统：state.js新增_scheduledEvents[]；ui.js重写showVarietyPopup/showMagazinePopup+新增showBrandSchedule/showReleaseSchedule统一用scheduleEvent()；cycle.js在rollDailyAgenda检测当天覆盖；engine.js在goEntSimNextDay结算；prompts.js注入_entSimPendingEvent；migrateSave迁移旧字段
    status: pending
    dependencies:
      - quickbar-reorder-cooldown
  - id: verify-state-migration
    content: 全量验证：src/state.js migrateSave新增所有字段兜底（_lastVarietyDay/_lastMagazineDay/_scheduledEvents/supportLog）+旧_ongoingVariety/_ongoingMagazine迁移；构建验证语法无报错
    status: pending
    dependencies:
      - scheduled-events-system
      - pool-scope-comment-fix
      - pool-fill-brand-chat
      - teammate-confirm-flavor
      - delete-npc-network
---

## 用户需求汇总（两轮合并，13项）

### 第一轮遗留 — Bug修复

**P0-1：Kakao聊天onclick语法错误**

- `ui.js:1456` 行用 `JSON.stringify(c.name)` 拼 inline onclick，联系人名含特殊字符时 HTML 属性截断
- 报错：`Uncaught SyntaxError: Unexpected end of input`
- 修复：改用 `data-*` 属性 + `addEventListener` 委托

**P0-2：泡泡发送按钮位置上移**

- `renderBubbleChat()` 中发送栏在 flex 底部，超出手机圆角区域
- 修复：给 `.bubble-send-bar` 加 `margin-bottom` CSS 约束

**P1-3：女团队友点击加确认弹窗 + TEAMMATE_FLAVOR修复**

- 左侧栏队友按钮直点即触发生成，无确认；修复为复用 `confirmTeammateInteract(index)` 弹窗
- TEAMMATE_FLAVOR key 与 SISTER_ROLES 生成的 roleTag 不匹配（key 如 '最疼你的大姐'，roleTag 如 '队长/主唱'），需在 `buildEntSimHeroineGroup()` 中为每人分配 personalityTag 字段作为 flavor 查找键

### 第一轮遗留 — 池子补全

**P2-5：品牌代言池补全（+8条）**：digital/perfume/skincare/eyewear 各从2条补到4条

**P2-6：聊天池补全**：CHAT_RIVAL 7→12、CHAT_MANAGER 5→10、GROUP_CHAT scandal 2→5 / negative_news 1→4、CHAT_BROTHER 10→12

**P2-7：5个池子注释修正**：variety-shows(30→32)、dispatch-news(20→22)、concert-pool(20→22)、fansign-pool(20→22)、dating-rumors(20→22)

### 第一轮遗留 — 日程事件系统

代言/综艺/画报/CD 从弹窗改为日程驱动事件：接受→排入`_scheduledEvents[]`→到达指定日→AI剧情发生→自动结算人气/曝光。重写 `showVarietyPopup/showMagazinePopup`，新增 `showBrandSchedule/showReleaseSchedule`，`cycle.js` 检测当天覆盖，`engine.js` 结算，`prompts.js` 注入。

### 第二轮新增 — UI增强

- 快捷栏重排：row1 信箱/奖项/代言/综艺/画报/发布；row2 去结局
- 4工作冷却显示：代言7天/综艺10天/画报7天/发布15天，冷却中灰化+倒计时
- 结局按钮从row2移到右侧栏剧场按钮下方
- 团队信息：公司名和风格拆两行；出圈曲下方新增"最近活动"
- 恋情面板：好感度行修复点击事件；哥哥支持度改为可点击弹窗
- 删除关系网模块（渲染/事件/互动函数/npc-network导入/SHOW_NPC）

### 第二轮新增 — 池子增强

- 四工作池每条加 `scope: 'solo' | 'group'` 字段
- BRAND_OFFER_POOL / VARIETY_SHOW_POOL / MAGAZINE_POOL / RELEASE_POOL

### 存档迁移覆盖

所有新增字段需在 `src/state.js:migrateSave()` 兜底初始化；旧 `_ongoingVariety/_ongoingMagazine` 迁移到 `_scheduledEvents[]`。

## 技术方案

### 关键技术决策

- **合并原则**：两轮需求中"删除关系网"为同一项，两轮合并后共13项独立需求，按改动范围和依赖关系合并为8个可执行批次
- **执行顺序**：先修复致命Bug（Kakao onclick），再改结构（关系网删除/快捷栏），最后补数据（池子/scope/注释）
- **不新建UI模式**：所有弹窗复用现有 `showEntSimModal()` / `showActionInfoModal()` 模式

### 核心改动文件

- `src/ent-sim/ui.js`：约15处修改（Kakao/泡泡/队友/快捷栏/结局/团队/恋情/关系网/日程弹窗）
- `src/ent-sim/state.js`：新增 `_lastVarietyDay`/`_lastMagazineDay`/`_scheduledEvents`/`supportLog`，删除 `npcInteractionUsed`/`initNpcNodes()`
- `src/state.js`：`migrateSave()` 新增所有字段兜底
- `src/ent-sim/engine.js`：`goEntSimNextDay()` 结算 `_scheduledEvents`
- `src/ent-sim/cycle.js`：`rollDailyAgenda()` 检测日程覆盖
- `src/ent-sim/prompts.js`：`_entSimPendingEvent` 注入
- `src/ent-sim/brother.js`：`supportLog` 日志追加
- `src/data.js`：`buildEntSimHeroineGroup()` 增加 `personalityTag`
- `src/ent-sim/data.js`：`TEAMMATE_FLAVOR` 注释说明
- `src/style.css`：快捷栏 disabled / 泡泡发送栏 / 结局按钮样式
- `src/ent-sim/pools/`：5 个池子补全 + 4 个 scope + 5 个注释修正

### 关于池子总数

当前所有池子文件合计约 1,502 条，与用户提到的 ~7,500 条目标差距较大。本计划的池子补全仅涉及指定文件（代言+8、聊天+15），以及四个工作池加 scope 字段，不进行大规模池子补全。7,500 条目标建议另立专项计划。

### 关于日程事件系统

日程事件系统（`_scheduledEvents` 统一调度）涉及 state/cycle/engine/prompts/ui 五个模块联动，代码量较大。本次计划将其作为独立批次，排在 UI 修复完成后执行。整体架构与之前计划中的设计一致：接受→排入 `_scheduledEvents[]`→`targetDay` 到达→覆盖 `agenda.main`→AI 生成→结算标记 `done`。