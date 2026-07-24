---
name: ent-sim-职业与结局体验增强
overview: 修复 ent-sim 职业/世界观 prompt 错配，扩展台前/幕后职业差异化，补全结局叙事生成，并强化粉丝运营反馈与每日圈内展示。
design:
  architecture:
    framework: html
  styleKeywords:
    - 深色玻璃拟态
    - emoji 标识
    - 粉金 HE / 暗红 BE / 雾蓝 NE
    - 分组下拉
    - 沉浸式结局卡片
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 28px
      weight: 600
    subheading:
      size: 16px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#9D8BFF"
      - "#FF7E7E"
      - "#7EE787"
    background:
      - "#0F0F13"
      - "#1A1A23"
      - "#252532"
    text:
      - "#FFFFFF"
      - "#B8B8C8"
      - "#8888A0"
    functional:
      - "#FFD166"
      - "#FF6B6B"
      - "#52C41A"
todos:
  - id: extend-profession-data
    content: 扩展职业数据：合并台前/幕后职业并补齐日程与事件池
    status: in_progress
  - id: dynamic-profession-prompt
    content: 修复 prompt 硬编码：按职业动态注入身份描述与规则
    status: pending
    dependencies:
      - extend-profession-data
  - id: agenda-hint-injection
    content: 接入职业差异化日程：剧情生成引用 encounterHint 与职业事件池
    status: pending
    dependencies:
      - extend-profession-data
      - dynamic-profession-prompt
  - id: ending-narrative
    content: 增强结局系统：生成 AI 结局叙事并展示结局卡片
    status: pending
  - id: buzz-fan-reaction
    content: 扩充舆论模板并新增营业后粉丝反馈短文
    status: pending
  - id: setup-profession-ui
    content: 更新 setup 职业选择：分组下拉与职业说明
    status: pending
    dependencies:
      - extend-profession-data
---

## 产品概述

对 `src/ent-sim`（娱乐圈模拟器）模块做一轮体验增强，核心解决「职业与世界观硬编码」「结局单薄」「幕后职业未接入」「每日舆论重复」四个问题，使其更像一个可持续游玩的娱乐圈地下恋模拟器。

## 核心功能

- **职业与世界观动态匹配**：女主身份不再被 prompt 硬写成「韩国女团爱豆」，而是根据 setup 选择的职业（爱豆/演员/solo歌手/练习生/化妆师/造型师/编舞助理/电台PD/综艺作家/品牌方助理等）动态注入职业描述与规则。
- **职业差异化日程与事件**：不同职业拥有独立的日程池、偶遇提示和事件池，剧情与左栏「今日日程」强关联。
- **结局仪式感**：「走向结局」后不再只弹出静态标签，而是调用 AI 生成 800-1200 字专属结局叙事，并以结局卡片展示。
- **每日舆论与粉丝反馈**：扩充热搜/媒体/粉丝讨论模板池，降低重复；新增「营业后粉丝圈反应」短文生成与展示。

## Tech Stack

- 语言：JavaScript（ES Modules），Node.js 18+
- 框架：Vanilla JS + Vite
- 状态：localStorage + `GS` 全局状态
- AI：DeepSeek `deepseek-chat`

## 实现策略

1. **数据层扩展**：在 `src/ent-sim/data.js` 合并现有 `ENT_SIM_PROFESSIONS` 与 `SISTER_PROFESSIONS` 中适合娱乐圈的职业，统一职业结构 `{name, startChapter, startPopularity, isStage, sisterSetting}`；为新增幕后职业补齐 `ENT_SIM_AGENDA_POOLS` 与新增 `ENT_SIM_EVENT_POOLS`。
2. **Prompt 动态化**：在 `src/ent-sim/prompts.js` 中把硬编码的「韩国女团爱豆」拆分为 `getProfessionPrompt()`，根据 `GS.heroineProfile.profession` 返回职业身份、常见场景、地下恋压力来源、与男主相遇方式；并在 `buildEntSimContextSnapshot` 中把对应职业的 `encounterHint` 注入用户消息。
3. **结局叙事生成**：把 `src/ent-sim/endings.js` 的 `evaluateEnding` 改为异步，结局标签确定后调用 `generateWithRetry` 生成结局叙事文本，结构返回 `{type, label, text, narrative}`；`engine.js` 中 `enterEntSimEnding` 把 narrative 写入 `GS._entSimCurrent`。
4. **舆论与反馈**：`src/ent-sim/immersion.js` 的 `DAILY_BUZZ_TEMPLATES` 按职业分组扩容；新增 `generateFanReaction()` 用于营业后生成粉丝圈反应短文。
5. **UI 适配**：`src/ui-renderer.js` 的 Step2 职业下拉使用扩展后列表并分组展示；`src/ent-sim/ui.js` 新增结局卡片渲染和「营业反馈」弹窗入口。

## 关键设计约束

- 不引入新依赖，使用原生 API 与现有工具函数。
- 保持 `var` 与 `+` 字符串拼接风格。
- 所有 AI 文本插入 DOM 前走 `escHtml()`。
- 保留 ent-sim 与 oneHeart 的兼容分支，不破坏换乘恋爱模式。
- 职业相关改动以 `isSisterSetting()` 与 `profession` 双门控隔离，确保非队友妹妹身份不受影响。

## 架构关系

```
src/ent-sim/data.js      ← 职业/日程/事件池扩展
src/ent-sim/prompts.js   ← 职业动态描述 + 日程 hint 注入
src/ent-sim/engine.js    ← 剧情生成、结局触发、日程消费
src/ent-sim/endings.js   ← 静态标签 + AI 结局叙事
src/ent-sim/immersion.js ← 舆论模板 + 粉丝反馈生成
src/ent-sim/ui.js        ← 结局卡片、粉丝反馈弹窗
src/ui-renderer.js       ← setup 职业下拉分组
```

## 涉及文件

- `src/ent-sim/data.js` [MODIFY]
- `src/ent-sim/prompts.js` [MODIFY]
- `src/ent-sim/engine.js` [MODIFY]
- `src/ent-sim/endings.js` [MODIFY]
- `src/ent-sim/immersion.js` [MODIFY]
- `src/ent-sim/ui.js` [MODIFY]
- `src/ent-sim/state.js` [MODIFY]
- `src/ui-renderer.js` [MODIFY]
- `src/style.css` [MODIFY]（新增结局卡片与粉丝反馈弹窗样式）

## 设计方向

延续现有深色主题 + 玻璃拟态卡片 + emoji 标识的风格，只做局部 UI 增强，不推翻整体布局。

### 职业选择面板（setup Step2）

- 在「队友的妹妹」身份下，职业下拉分为「台前」与「幕后」两组。
- 台前：练习生、爱豆、solo歌手、演员。
- 幕后：化妆师、造型师、编舞助理、电台PD、综艺作家、品牌方助理。
- 选中后显示一句话职业说明（如「你在公司练习室/片场/后台工作，和男主团队日常接触」）。

### 结局卡片

- 触发「走向结局」后弹出全屏遮罩（非 alert）。
- 中央卡片：顶部大图标 + 结局标签（HE/NE/BE），中间 800-1200 字结局叙事，底部「重新开始」按钮。
- 卡片背景使用渐变玻璃效果，HE 偏粉金、BE 偏暗红、NE 偏雾蓝。

### 营业反馈弹窗

- 在右栏「今日圈内」面板底部增加「📝 营业反馈」按钮。
- 点击后弹出小窗，展示 AI 生成的粉丝圈反应短文（约 150-250 字），带「大粉/路人/黑粉」分类气泡。

### 热搜条样式

- 已有热搜列表增加职业相关关键词（如片场、杂志、打歌、后台），避免每天都是「新舞台封神」。