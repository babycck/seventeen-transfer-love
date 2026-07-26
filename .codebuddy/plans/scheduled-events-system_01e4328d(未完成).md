---
name: scheduled-events-system
overview: 将综艺/画报/代言/CD发布从弹窗通知改为日程驱动的事件系统：接受→排入日程→到达指定日→剧情中实际发生→结算
todos:
  - id: state-field
    content: 在 ent-sim/state.js 的 initEntSimState() 中新增 E._scheduledEvents = [] 字段；在 src/state.js 的 migrateSave() 中初始化并迁移旧 _ongoingVariety/_ongoingMagazine 数据
    status: pending
  - id: unified-accept-popup
    content: 在 ui.js 中创建 scheduleEvent(type) 统一接受函数：根据type从对应池子取条目 → 弹出确认弹窗 → push到 _scheduledEvents。重写 showVarietyPopup/showMagazinePopup 调用它，新增 showBrandSchedule/showReleaseSchedule
    status: pending
    dependencies:
      - state-field
  - id: quick-bar-wiring
    content: 修改 ui.js 快捷栏按钮绑定：代言→showBrandSchedule、发布CD→showReleaseSchedule；同时重写 renderCenter 的 ongoingHtml 块，从遍历 _scheduledEvents 替代原来的 _ongoingVariety/_ongoingMagazine 硬编码
    status: pending
    dependencies:
      - unified-accept-popup
  - id: agenda-override
    content: 修改 cycle.js 的 rollDailyAgenda()，在随机抽取前检测 _scheduledEvents[] 中 targetDay 等于当天且未完成的条目，若存在则用该事件的 text 和 loc 覆盖 agenda.main 和 agenda.mainLoc
    status: pending
    dependencies:
      - state-field
  - id: engine-settle-inject
    content: 重写 engine.js 的 goEntSimNextDay() 中第436-459行结算块，改为遍历 _scheduledEvents[]：如果是当天事件 → 设置 _entSimPendingEvent 注入文本、生成剧情、标记 done 并结算人气/曝光
    status: pending
    dependencies:
      - state-field
      - agenda-override
  - id: verify-build
    content: 完整构建验证语法，测试四种事件的完整接受→排期→触发→结算流程
    status: pending
    dependencies:
      - engine-settle-inject
      - unified-accept-popup
---

## 用户需求

将代言、综艺、画报、CD发布四种快捷按钮从"点击弹窗看一眼就消失"改造为完整的调度事件系统：

1. 点击按钮 → 弹出确认弹窗（展示池子内容，含接受/拒绝选项）
2. 接受后 → 排入未来日程（默认1天后触发）
3. 到指定那天 → 日程的main槽自动变为该事件（如"拍摄代言·兰芝"、"录制综艺·认哥"）
4. AI生成剧情时按此日程写出完整的工作场景叙事
5. 事件出现在当天剧情中后 → 自动结算人气和曝光奖励
6. 四种事件共用同一套调度逻辑，不重复造轮子

## 涉及池子

- BRAND_OFFER_POOL：代言邀约（brand/product/loc/pop/exp字段）
- VARIETY_SHOW_POOL：综艺节目（show/t/exp/pop字段）
- MAGAZINE_POOL：画报拍摄（mag/t/exp/pop字段）
- RELEASE_POOL：CD发布（cat/t/pop/exp字段）

## 快捷栏布局（不变）

上行：📬信箱 💼代言 🏆奖项 🎬综艺 📸画报 📀发布CD
下行：重新生成 下一个行程 🛡️掩护 随机事件 探班 结局 下一天

## 技术方案

### 核心思路：统一调度队列替代散落的_ongoing字段

当前 `_ongoingVariety` 和 `_ongoingMagazine` 是两个独立的临时字段，代言和CD完全没有日程追踪。改造后用一个 `_scheduledEvents` 数组统一管理所有四种事件类型的生命周期。

### 数据结构设计

```javascript
// 在 E 对象上新增 -- state.js:initEntSimState() 第95行附近初始化
E._scheduledEvents = [];  
// 每项格式: { id, type: 'variety'|'magazine'|'brand'|'release', 
//              data: poolItem, targetDay: number, done: false }
```

### 事件生命周期

```
[玩家点击快捷按钮] 
  → showScheduleAcceptPopup(type) 弹出确认弹窗
  → 玩家确认 → push到 _scheduledEvents[]（targetDay = 当前day+1）
  → 下一天 goEntSimNextDay() 检测 targetDay == 当天
  → 覆盖 agenda.main 为该事件文本
  → buildEntSimUserMessage() 注入 _entSimPendingEvent 强制AI写此场景
  → 当天剧情生成后 → 标记 done=true + 结算人气/曝光 + 写 careerHistory
```

### 修改文件清单

#### 1. `ent-sim/state.js` — 初始化字段

`initEntSimState()` 第95行附近，在 `E.misc` 之后加：

```
E._scheduledEvents = [];
```

#### 2. `src/state.js` — 存档迁移

`migrateSave()` 第429行 `if (GS.entSim)` 块内新增：

- 初始化 `E._scheduledEvents = []`
- 将旧存档的 `_ongoingVariety` / `_ongoingMagazine` 迁移为新格式

#### 3. `ent-sim/ui.js` — 统一接受弹窗

- 新增 `scheduleEvent(type)` 函数：统一的"接受-排入日程"逻辑
- 重写 `showVarietyPopup()` 和 `showMagazinePopup()` 调用 scheduleEvent
- 新增 `showBrandSchedule()` 和 `showReleaseSchedule()`：代言/CD的接受弹窗
- 修改 `renderCenter()` 中第277-282行：从读取 `_ongoingVariety/_ongoingMagazine` 改为遍历 `_scheduledEvents[]`
- 修改快捷栏按钮绑定：代言→showBrandSchedule, 发布CD→showReleaseSchedule

#### 4. `ent-sim/cycle.js` — 日程覆盖

`rollDailyAgenda()` 第148行开头，增加检测逻辑：

- 遍历 `_scheduledEvents[]`，找 `targetDay === E.cycle.dayCount && !done` 的事件
- 如果有，则 `agenda.main` 和 `agenda.mainLoc` 写为该事件的具体内容（不再随机抽取）

#### 5. `ent-sim/engine.js` — 结算逻辑

- 重写第436-459行的 `_ongoingVariety/_ongoingMagazine` 结算块
- 改为遍历 `_scheduledEvents[]`，找到 `targetDay === today` 的事件
- 如果是当天首次出现 → 注入 `_entSimPendingEvent` 文本、放在剧情前
- 剧情生成完成后 → 标记 `done = true`、结算人气/曝光、写 `careerHistory`

#### 6. `ent-sim/prompts.js` — AI Prompt注入

`buildEntSimUserMessage()` 第228-231行的 `_entSimPendingEvent` 注入逻辑不变，但注入内容改为事件的具体描述文本。需在 `engine.js` 中提前设置好 `_entSimPendingEvent` 的值。

### 完成标准

- 点击代言/综艺/画报/CD快捷按钮 → 弹出确认弹窗展示池子内容
- 接受后 left栏日程顶部显示"📅 预约中：X天后"
- 到那天剧情面板上方显示事件横幅，AI写出该工作场景的叙事
- 事件完成后 toast提示奖励，careerHistory可查
- 旧存档自动迁移，不丢数据