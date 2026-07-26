---
name: entSim-v2-bugfix-ui-pools
overview: 14项需求合并：Kakao修复/泡泡按钮/女团队友弹窗/快捷栏重排+冷却(代言3天/综艺5天/画报3天/CD7天)/池子scope+补全/结局迁移/团队信息改版/恋情面板修复/删除关系网/日程事件系统。池子总数1534条距7500差~6000条标二期。
todos:
  - id: p0-bugfix-kakao-bubble
    content: P0 Bug修复：Kakao onclick改为data-*+事件委托（ui.js:1456行）；泡泡发送栏加margin-bottom CSS（style.css）；Kakao路由函数__phoneOpenChat从onclick分离为独立事件绑定
    status: pending
  - id: teammate-confirm-flavor
    content: 女团队友确认弹窗+flavor修复：左侧栏队友点击先调confirmTeammateInteract弹窗（ui.js:622-623行）；buildEntSimHeroineGroup()每人加personalityTag字段使TEAMMATE_FLAVOR键匹配（data.js:21-36行）
    status: pending
  - id: delete-npc-network
    content: 删除关系网：ui.js删除NPC网格渲染(396-397行)/事件绑定(626-628行)/onNpcInteract函数(731-762行)/npc-network导入(16行)/SHOW_NPC常量(30行)；state.js删除npcInteractionUsed(95行)
    status: pending
  - id: quickbar-reorder-cooldown
    content: 快捷栏重排+冷却显示+结局迁移+团队信息两行+最近活动+恋情面板好感度绑定+哥哥支持度可点击：ui.js一次性完成renderQuickActions(row1/row2重排+冷却倒计时)/renderRight(删NPC+加结局按钮)/renderLeft(公司风格拆两行+最近活动)/renderLovePanel(哥哥加类名)/bindStoryEvents(好感度绑定+结局绑定)。state.js新增_lastVarietyDay/_lastMagazineDay/supportLog。brother.js追加supportLog日志。style.css补disabled样式
    status: pending
    dependencies:
      - p0-bugfix-kakao-bubble
  - id: pool-scope-comment-fix
    content: 池子scope+注释修正：brand-offers/variety-shows/magazine-shoots/releases每条加scope:solo|group；variety-shows/dispatch-news/concert-pool/fansign-pool/dating-rumors注释条数修正
    status: pending
  - id: pool-fill-brand-chat
    content: 池子补全：brand-offers.js digital/perfume/skincare/eyewear各+2条(共+8)；chat-male-lead.js CHAT_RIVAL+5/CHAT_MANAGER+5/GROUP_CHAT scandal+3+negative_news+3/CHAT_BROTHER+2(共+15)
    status: pending
  - id: scheduled-events-system
    content: 日程事件系统：state.js新增_scheduledEvents[]；ui.js重写showVarietyPopup/showMagazinePopup+新增showBrandSchedule/showReleaseSchedule统一用scheduleEvent()；cycle.js在rollDailyAgenda检测当天覆盖agenda.main；engine.js在goEntSimNextDay结算人气/曝光+标记done；prompts.js注入_entSimPendingEvent
    status: pending
    dependencies:
      - quickbar-reorder-cooldown
  - id: verify-state-migration
    content: 全量验证：migrateSave新增所有字段兜底(_lastVarietyDay/_lastMagazineDay/_scheduledEvents/supportLog)+旧_ongoingVariety/_ongoingMagazine迁移+删除npcInteractionUsed初始化；构建验证语法无报错；确认池子总数1534条并标注二期
    status: pending
    dependencies:
      - scheduled-events-system
      - pool-scope-comment-fix
      - pool-fill-brand-chat
      - teammate-confirm-flavor
      - delete-npc-network
---

## 用户需求（两轮合并，14项）

### P0 Bug修复（2项）

**Kakao聊天onclick语法错误**

- `ui.js:1456` 行用 `JSON.stringify(c.name)` 拼 inline onclick，联系人名含特殊字符时 HTML 属性被截断，抛 `Uncaught SyntaxError: Unexpected end of input`
- 修复方案：5个联系人按钮改用 `data-*` 属性存参数 + `addEventListener` 事件委托，不再拼 inline onclick
- 影响范围：男主/哥哥/情敌/经纪人/团群共5个按钮

**泡泡发送按钮偏下**

- `ui.js:1724-1728` 行 `renderBubbleChat()` 发送栏在 flex 底部超出手机圆角区域
- 修复方案：`.bubble-send-bar` CSS 加 `margin-bottom:12px` 约束

### 交互增强（3项）

**女团队友确认弹窗 + TEAMMATE_FLAVOR 修复**

- 左侧栏队友按钮直点即触发 AI 生成，无确认 → 改为先弹 `confirmTeammateInteract(index)` 弹窗
- TEAMMATE_FLAVOR key（如"最疼你的大姐"）与 SISTER_ROLES 生成的 roleTag（如"队长/主唱"）不匹配，flavor 一直 fallback → `buildEntSimHeroineGroup()` 中每人分配 `personalityTag` 字段作为 flavor 查找键

**好感度点击修复**

- `ui.js:432` 行已加 `es-aff-clickable` 类名但 `bindStoryEvents()` 无对应事件绑定，点击无反应
- 在 `bindStoryEvents()` 中绑定 `.es-aff-clickable` 调用 `showAffectionLogModal()`（函数已在第449-471行）

**哥哥支持度可点击**

- `ui.js:443` 行只显示支持度数字和立场文本，不可点击
- 改为可点击，弹出模态框展示支持度变动日志（原因/时间/变化量）
- brother.js 每次 support 变更时追加 `supportLog` 条目 `{day, delta, reason, total}`

### UI 改版（5项）

**快捷栏重排 + 工作冷却**

- row1: 信箱 → 奖项 → 代言 → 综艺 → 画报 → 发布（4工作聚拢在奖项后面）
- row2: 去掉结局按钮，变为重新生成/下一个行程/掩护/随机事件/探班/下一天 共6个按钮
- 冷却时间：代言 3 天 / 综艺 5 天 / 画报 3 天 / CD 发布 7 天
- 冷却中按钮灰化 `disabled` + 显示倒计时如 `冷却(2)天`

**结局按钮迁移**

- 从快捷栏 row2 移出 → 放到右侧栏 `🎭 剧场` 按钮下方

**团队信息分两行**

- `🏢 PLEDIS Entertainment · 🎵 清冷风舞曲` → 公司名和风格各一行

**最近活动栏目**

- 出圈曲下方新增，从 `careerHistory` 筛近 30 天记录按类型各展一条

**删除关系网模块**

- 删除 NPC 渲染/事件绑定/互动函数/npc-network 导入/SHOW_NPC 常量 等全部相关代码
- `npc-network.js` 文件保留不动，仅断开所有引用

### 池子操作（3项）

**scope 字段**：BRAND_OFFER_POOL / VARIETY_SHOW_POOL / MAGAZINE_POOL / RELEASE_POOL 每条加 `scope:'solo'|'group'`

**池子补全**：代言池 +8 条 / 聊天池 +15 条

**注释修正**：5 池文件注释条数与实际对齐

### 池子总数现状

Pools 目录 38 文件展开后合计 **1,534 条**，距 7,500 目标差约 6,000 条 → 本期不做大规模补全，标注为二期池子专项。

### 日程事件系统

代言/综艺/画报/CD 接受后 → 排入 `E._scheduledEvents[]` → 到达指定日 → `cycle.js:rollDailyAgenda()` 覆盖当天 `agenda.main` → AI 剧情中发生 → `engine.js:goEntSimNextDay()` 结算人气/曝光并标记 done。重写 showVarietyPopup/showMagazinePopup，新增 showBrandSchedule/showReleaseSchedule 统一用 `scheduleEvent()`。

### 状态迁移

`src/state.js:migrateSave()` 所有新增字段兜底初始化；旧 `_ongoingVariety/_ongoingMagazine` 迁移到 `_scheduledEvents[]`。

## 技术栈

- 语言：JavaScript (ES Modules, 使用 var 声明)
- 框架：Vanilla JS + Vite
- 不引入新依赖，使用现有 showEntSimModal() / showToast() 模式
- 字符串拼接使用 `+` 运算符

## 实现方案

### 整体策略

两轮 14 项需求按改动范围和依赖关系合并为 8 个执行批次。优先修复致命 Bug（Kakao onclick），再改结构（关系网删除/快捷栏），最后补数据（池子/scope/注释）和跑日程事件系统。所有新弹窗复用现有 `showEntSimModal()` 模式，不新建 UI 组件。

### 核心改动文件（按影响面排序）

**`src/ent-sim/ui.js`**（约 15 处修改）

- 第 1446-1464 行：Kakao onclick → data-* + 事件委托
- 第 1724-1728 行：泡泡发送栏 HTML 不变，CSS 侧加 margin-bottom
- 第 317-341 行：`renderQuickActions()` row1/row2 重排 + 冷却倒计时显示
- 第 365-401 行：`renderRight()` 删 NPC 网格 + 加结局按钮
- 第 193-225 行：`renderLeft()` 团队信息两行 + 最近活动
- 第 422-447 行：`renderLovePanel()` 哥哥支持度加可点击类名
- 第 596-639 行：`bindStoryEvents()` 加好感度点击绑定 + 结局按钮绑定 + 删 NPC 绑定
- 第 622-623 行：队友点击改为先调确认弹窗
- 第 731-762 行：删除 `onNpcInteract()` 函数
- 第 765-801 行：`onQuick()` 加冷却检查 + 代言/综艺/画报路由改调 scheduleEvent
- 第 16 行：删除 npc-network 导入
- 第 30 行：删除 SHOW_NPC 常量
- 新增：`scheduleEvent()` / `showBrandSchedule()` / `showReleaseSchedule()` 函数
- 新增：`showBrotherSupportModal()` 函数

**`src/ent-sim/state.js`**

- 第 95 行：`E.misc` 中删除 `npcInteractionUsed`
- 第 105-109 行：新增 `E._lastVarietyDay = 0` / `E._lastMagazineDay = 0` / `E._scheduledEvents = []`
- 第 120-121 行：删除 `initNpcNodes()` 调用
- 新增：`E.brother.supportLog = []`

**`src/state.js`**

- `migrateSave()` 第 487-492 行区域新增 `_lastVarietyDay` / `_lastMagazineDay` / `_scheduledEvents` / `supportLog` 兜底
- 旧 `_ongoingVariety` / `_ongoingMagazine` 迁移到 `_scheduledEvents[]`

**`src/ent-sim/engine.js`**

- 第 436-459 行 `_ongoingVariety/_ongoingMagazine` 结算块改为遍历 `_scheduledEvents[]`
- `goEntSimNextDay()` 中检测当天到达事件 → 设置 `_entSimPendingEvent` → 结算人气/曝光 → 标记 done

**`src/ent-sim/cycle.js`**

- 第 148 行 `rollDailyAgenda()` 开头检测 `_scheduledEvents[]`，`targetDay` 匹配时覆盖 `agenda.main` 和 `agenda.mainLoc`

**`src/ent-sim/brother.js`**

- `maybeBrotherEvent()` 第 18 行 `E.brother.support` 变更后追加 `supportLog` 条目

**`src/data.js`**

- `buildEntSimHeroineGroup()` 第 21-36 行为每人分配 `personalityTag` 字段（从 TEAMMATE_FLAVOR 的五种 key 中按角色类型分配）

**`src/style.css`**

- `.es-quick-btn:disabled` 灰化样式
- `.bubble-send-bar { margin-bottom: 12px; }`
- `.es-ending-btn` 样式

**池子文件（`src/ent-sim/pools/`）**

- `brand-offers.js`：digital/perfume/skincare/eyewear 各补 2 条 + scope 字段
- `chat-male-lead.js`：CHAT_RIVAL+5/CHAT_MANAGER+5/GROUP_CHAT+6/CHAT_BROTHER+2 + scope 字段
- `variety-shows.js` / `magazine-shoots.js` / `releases.js`：加 scope 字段 + 注释修正
- `dispatch-news.js` / `concert-pool.js` / `fansign-pool.js` / `dating-rumors.js`：注释修正

### 执行顺序

p0-bugfix-kakao-bubble → teammate-confirm-flavor + delete-npc-network + pool-scope-comment-fix + pool-fill-brand-chat（四者无依赖可并行）→ quickbar-reorder-cooldown（依赖 p0-bugfix）→ scheduled-events-system（依赖 quickbar-reorder-cooldown）→ verify-state-migration（依赖所有前序任务）

### 关于日程事件系统

统一调度队列替代散落的 `_ongoingVariety`/`_ongoingMagazine` 临时字段。事件生命周期：玩家接受 → push 到 `_scheduledEvents[]`（`targetDay = dayCount + 1`）→ `goEntSimNextDay()` 检测当天 → 覆盖 `agenda.main` → `buildEntSimUserMessage()` 注入 `_entSimPendingEvent` → AI 生成工作场景叙事 → 标记 done + 结算人气/曝光 + 写 careerHistory。