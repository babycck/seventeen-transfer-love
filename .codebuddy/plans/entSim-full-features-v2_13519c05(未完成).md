---
name: entSim-full-features-v2
overview: 为娱乐圈模拟器新增 8 项纯代码控制功能：4 项恋爱向（吃醋值/亲密阶段锁/纪念日/男主主动联络）+ 4 项事业向（粉丝来信/品牌代言/作品发布/季度颁奖），所有数据池 100-200 条预选避免重复。
todos:
  - id: add-state-fields
    content: 在 state.js 新增 8 组状态字段：jealousyGauge/intimacyLevel/milestones/_contactTimer/_fanLetterTimer/_brandTimer/_releaseCD/_awardIndex 的初始化与迁移兜底
    status: pending
  - id: add-data-pools
    content: 在 data.js 新增 5 个预写池：（1）FAN_LETTER_POOL 200 条（support/comeback/confession/roast 各 50）；（2）BRAND_OFFER_POOL 150 条（beauty/fashion/beverage/phone/food/variety/skincare/jewelry/sports 10 类各 15）；（3）CONTACT_TYPE_POOL 120 条（phone/message/viaBrother 各 40）；（4）RELEASE_POOL 120 条（single/photobook/practice/vlog/cover/collab 各 20）；（5）AWARD_POOL 30 条（newcomer/popularity/stage 各 10）
    status: pending
    dependencies:
      - add-state-fields
  - id: add-jealousy-system
    content: 在 engine.js 的 applyNpcEncounter 中累加吃醋值（intimacyDelta>0 即+1），在 goEntSimNextDay 中每日衰减-1，在 checkOneHeartEvents 中新增吃醋阈值触发级（3/6/10 三档注入 jealousLevel 到 prompt）
    status: pending
    dependencies:
      - add-state-fields
  - id: add-intimacy-ladder
    content: 在 romance.js 新增 checkIntimacyUnlock 函数（好感>=15牵手/>=30拥抱/>=50接吻），在 applyEntSimAffection 和 goEntSimNextDay 中调用，首次解锁时 toast + 记录 firstKissDay 纪念日
    status: pending
    dependencies:
      - add-state-fields
  - id: add-milestones-track
    content: 在 engine.js 的 initiateEntSimDate 记录 firstDateDay，在 romance.js 的 applyConfessionResult 记录 confessionDay，在 goEntSimNextDay 中每 30 天检查纪念日（30/60/90/100 天倍数）并 toast
    status: pending
    dependencies:
      - add-state-fields
      - add-intimacy-ladder
  - id: add-contact-system
    content: 在 engine.js 的 goEntSimNextDay 中每日倒计时-1，好感>=60 时重置间隔缩短为 5-10 天，触发时从 CONTACT_TYPE_POOL 随机抽取并注入 contactType 到 _entSimPendingEvent
    status: pending
    dependencies:
      - add-state-fields
      - add-data-pools
  - id: add-fan-letters
    content: 在 engine.js 的 goEntSimNextDay 中 _fanLetterTimer 倒计时-1，归零时从 FAN_LETTER_POOL 按类别轮替抽取，调用 showEntSimModal 弹窗展示信件内容
    status: pending
    dependencies:
      - add-state-fields
      - add-data-pools
  - id: add-brand-offers
    content: 在 engine.js 的 goEntSimNextDay 中 _brandTimer 倒计时-1，人气>=35 后归零时 60% 概率从 BRAND_OFFER_POOL 按类别轮替抽取，调用 showEntSimModal 弹窗展示代言邀约，3 选项（接受/拒绝/讨价还价）→代码结算人气/曝光
    status: pending
    dependencies:
      - add-state-fields
      - add-data-pools
  - id: add-release-button
    content: 在 ui.js 快捷指令行新增「📀发布作品」按钮（CD 15 天置灰），点击弹出 6 选 1 面板，选中后从 RELEASE_POOL 抽取对应类型描述注入 _entSimPendingEvent + 代码结算人气/曝光
    status: pending
    dependencies:
      - add-state-fields
      - add-data-pools
  - id: add-awards-cycle
    content: 在 engine.js 的 goEntSimNextDay 中每 30 天检查 _awardIndex 轮替（0新人→1人气→2舞台→循环），人气>=阈值入围后 50% 随机判定获奖，调用 showEntSimModal 展示典礼场景文本 + 人气+5~10
    status: pending
    dependencies:
      - add-state-fields
      - add-data-pools
  - id: add-prompt-rules
    content: 在 prompts.js 的 buildEntSimSystemPrompt 中新增 2 段注入规则：亲密接触阶梯约束（只能写已解锁阶段） + 吃醋日 AI 行为指令（按 jealousLevel 选择不同强度反应）
    status: pending
    dependencies:
      - add-jealousy-system
      - add-intimacy-ladder
      - add-contact-system
  - id: add-ui-indicators
    content: 在 ui.js 的 renderLovePanel 中加入亲密阶段图标行（🤝牵手/🤗拥抱/💋接吻，未解锁置灰），吃醋日显示火焰标记
    status: pending
    dependencies:
      - add-intimacy-ladder
---

## 产品概述

为现有娱乐圈模拟器新增 8 项纯代码控制功能（恋爱向4项 + 事业向4项）。所有随机池预写 620 条静态内容，不依赖 AI 实时生成，杜绝重复。AI 只负责把事件写成叙事文案。

## 核心功能

### 恋爱向 4 项

1. **吃醋值系统** — 情敌互动 +1/天，衰减 -1/天，阈值 3/6/10 三档触发，注入 `jealousLevel` 到 prompt
2. **亲密接触阶梯** — 牵手 ≥15 / 拥抱 ≥30 / 接吻 ≥50，prompt 约束不可越级，首次解锁 toast + 纪念日
3. **关系纪念日** — 首次约会日/告白日/首次接吻日，每 30 天循环 toast
4. **男主主动联络** — 每 8-18 天触发（好感 ≥60 缩短为 5-10），电话/私信/托哥哥转交三种方式，120 条预写池

### 事业向 4 项

5. **粉丝来信** — 每 5-7 天从 200 条预写池（支持信/催回归/告白信/吐槽 4 类各 50 条）随机抽 1 封，弹窗展示
6. **品牌代言** — 人气 ≥35 后每 12 天从 150 条品牌池（10 大类各 15 个韩国真实品牌）触发，接受→人气+N 曝光+N
7. **作品发布** — 快捷指令行新增按钮，CD 15 天，单曲/写真/练习室/Vlog/翻唱/合作曲 6 种，120 条预写描述池
8. **季度颁奖** — 每 30 天触发（新人奖→人气奖→最佳舞台奖循环），人气阈值入围→随机判定获奖→人气 +5~10，30 条典礼场景池

## 数据池总量

| 池名 | 条数 |
| --- | --- |
| 粉丝来信 FAN_LETTER_POOL | 200 |
| 品牌代言 BRAND_OFFER_POOL | 150 |
| 联络方式 CONTACT_TYPE_POOL | 120 |
| 作品发布 RELEASE_POOL | 120 |
| 颁奖典礼 AWARD_POOL | 30 |
| **合计** | **620** |


## 实现策略

8 项功能全部在现有架构上拓展：**代码决定「何时触发、触发什么、数值多少」，AI 只负责「把这件事写成故事」**。不新建 UI 页面，复用 `showEntSimModal()` / `showToast()` / `_entSimPendingEvent` 通道。

## 数据流

```
goEntSimNextDay 每日换天
  └─ 吃醋值衰减 -1
  └─ 纪念日检查（30天循环→toast）
  └─ 主动联络倒计时 -1（归零→注入contactType）
  └─ 粉丝来信倒计时 -1（归零→弹窗+重置）
  └─ 品牌代言倒计时 -1（归零→60%概率触发弹窗）
  └─ 季度颁奖检查（每30天→判定入围+获奖→弹窗）
  └─ checkOneHeartEvents 事件瀑布
       ├─ 吃醋值 >= 阈值? → 注入 jealousLevel
       ├─ 主动联络倒计时归零? → 注入 contactType
       └─ 继续其他事件
```

## 技术决策

| 决策 | 理由 |
| --- | --- |
| 所有新触发器挂入 `goEntSimNextDay` | 统一的每日刷新点，已有 SEVENTEEN 回归期/日记/信箱等先例 |
| 吃醋值 + 主动联络纳入事件瀑布 | 每日只触发最高优先级 1 条，避免冲突 |
| 品牌/来信/作品用独立倒计时 | 不与事件瀑布冲突，可同日触发 |
| 620 条预写池放在 `data.js` | 遵循现有 DAILY_ENGAGEMENT_POOL 等池子的存放模式 |
| 粉丝来信 4 类各 50 条 | 确保同类不出现在连续两次中 |
| 品牌代言用真实韩国品牌名 | 增强娱乐圈沉浸感（3CE/星巴克/三星/麦当劳等） |
| 亲密阶段按好感阈值自动解锁 | 不需要玩家操作，纯代码判定 + prompt 约束 |


## 文件修改清单

| 文件 | 改动内容 |
| --- | --- |
| `state.js` | 新增 8 组状态字段的初始化与 `migrateEntSimState` 兜底 |
| `romance.js` | 新增 `checkIntimacyUnlock()` + `recordMilestone()` + 告白日期记录 |
| `engine.js` | `goEntSimNextDay` 挂入 6 个倒计时/检查；`applyNpcEncounter` 累加吃醋值；新增品牌/来信弹窗触发 |
| `prompts.js` | 新增 2 段注入规则：亲密接触阶梯约束 + 吃醋日指令 |
| `ui.js` | `renderLovePanel` 亲密图标行；快捷指令「发布作品」按钮；品牌/来信弹窗渲染 |
| `data.js` | 新增 5 个预写池共 620 条数据（`FAN_LETTER_POOL` / `BRAND_OFFER_POOL` / `CONTACT_TYPE_POOL` / `RELEASE_POOL` / `AWARD_POOL`） |


## 向后兼容

- 所有新增字段在 `migrateEntSimState` 中兜底到默认值（0 / null / {}）
- 旧存档加载不报错，加载后按当前好感值自动追认亲密阶段
- 620 条静态池在模块加载时初始化，零运行时开销

## SubAgent

- **code-explorer**
- 用途：在实现过程中验证现有代码结构（prompts.js 注入点、engine.js 换天流程、romance.js 好感结算、ui.js 弹窗工厂），确保新功能正确挂入
- 预期结果：确认所有挂入点可行，不破坏现有事件瀑布优先级