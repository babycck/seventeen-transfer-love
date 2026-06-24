---
name: dating-location-banner-and-options
overview: 在约会场景的叙事框顶部添加地点横幅，并修复约会时段选项包含非约会成员的问题。
todos:
  - id: fix-day9-dating-partner
    content: 修复 game-engine.js 中 Day 9 未设置 currentDatingPartner 的问题
    status: completed
  - id: add-dating-option-constraint
    content: 在 prompts.js 中添加约会选项约束 + 强化 noRepeatNote 场景相关性
    status: completed
    dependencies:
      - fix-day9-dating-partner
  - id: add-location-banner-js
    content: 在 narrative-box.js 的 renderNarrativeSection() 中插入地点横幅
    status: completed
  - id: add-location-banner-css
    content: 在 style.css 中新增 .dating-location-banner 样式
    status: completed
    dependencies:
      - add-location-banner-js
---

## 需求描述

1. **地点显示**：进入约会场景后，在叙事框最上方显示今天抽取的约会地点名称。目前 `GS.currentDatingLocation` 已存在但从未在前端 UI 展示。
2. **约会选项约束**：进入约会场景后，AI 生成的 3 个选项不应出现涉及其他成员的互动选项（如"和 B 去散步"），应全部围绕今日约会对象展开。
3. **所有选项场景相关性**：用户希望所有自由选项都基于当前剧情和场景，不出现与场景无关的选项。

## 核心功能

- 叙事框顶部显示约会地点横幅
- 约会日（Day 4/6/8/9/10）AI 生成的选项只涉及约会对象本人
- 全局选项约束强化：选项必须基于当前场景和在场人物
- 修复 Day 9 X 约会日 `currentDatingPartner` 未设置的问题

## 技术方案

### 修改概览（4 处修改）

#### 1. `src/game-engine.js` — 修复 Day 9 约会对象未设置

第225-231行，当前逻辑只在 `GS.datingDiceResult` 存在时设置 `GS.currentDatingPartner`。Day 9 为 X 约会日（无骰子），需增加设置：

```
在 else 分支中增加 Day 9 判断：
  GS.currentDatingPartner = GS.secretX;
```

#### 2. `src/prompts.js` — 选项约束

**A. 约会场景选项约束**（第358行后）：
当 `GS.currentDatingPartner` 存在时，增加指令：

```
[INSTRUCTION] 约会约束：你和 {partnerName} 正在单独约会中，3 个选项必须全部只涉及与 {partnerName} 的互动，不得出现在场其他成员。
```

**B. 强化 `noRepeatNote`**（第598行）：
将原 `"选项必须场景相关"` 强化为：

```
选项必须严格基于当前场景和在场人物，避免出现与当前场景无关的互动选项（如单独约会时不应出现与其他成员互动的选项）。避免重复使用"主动搭话""保持距离""沉默不语"等通用模板，每个选项指向不同的行动方向。
```

#### 3. `src/ui/narrative-box.js` — 地点横幅

在 `renderNarrativeSection()` 中，于构建 `html` 变量时，在 `<div class="narrative-box">` 之后、主剧情内容之前插入：

```js
if (GS.currentDatingLocation && GS.currentDatingLocation.name) {
  html += '<div class="dating-location-banner">' + escHtml(GS.currentDatingLocation.name) + '</div>';
}
```

#### 4. `src/style.css` — 地点横幅样式

新增 `.dating-location-banner` 样式（居中、加粗、渐变背景、圆角），与现有粉色系主题一致。

### 数据流

1. 约会日 → `game-engine.js` 设置 `GS.currentDatingPartner`（含 Day 9 修复）和 `GS.currentDatingLocation`
2. `prompts.js` 读取 `currentDatingPartner` 注入选项约束 → AI 生成只涉及约会对象的选项
3. `narrative-box.js` 读取 `currentDatingLocation` 渲染地点横幅
4. `noRepeatNote` 强化后对所有剧情类型生效

### 无需修改的文件

- `state.js` — 字段已存在
- `skeleton/scheduler.js` — 清理逻辑不变