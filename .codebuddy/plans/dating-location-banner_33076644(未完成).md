---
name: dating-location-banner
overview: 在约会场景的叙事框顶部添加地点横幅，显示当前约会地点名称。
todos:
  - id: add-location-banner-js
    content: 在 renderNarrativeSection() 中插入地点横幅渲染逻辑
    status: pending
  - id: add-location-banner-css
    content: 新增 .dating-location-banner 样式
    status: pending
    dependencies:
      - add-location-banner-js
---

## 需求描述

在进入约会场景后，剧情叙事框的最上方显示今日约会地点。目前 `GS.currentDatingLocation` 已通过 `pickDatingLocation()` 随机抽取并注入 AI prompt，但在前端 UI 中从未展示给玩家，导致玩家不知道今天被分配去了哪里约会。

## 核心功能

- 在叙事框顶部插入一个地点横幅，显示当前约会地点的名称
- 横幅仅在 `GS.currentDatingLocation` 存在且有值时显示
- 样式美观，与现有 UI 风格协调

## 技术方案

### 修改内容

#### 1. `src/ui/narrative-box.js` — `renderNarrativeSection()`

在 `renderNarrativeSection()` 函数中，在构建 `html` 变量时，于 `'<div class="narrative-box" ...>'` **之后、主剧情内容之前**，插入地点横幅：

```js
if (GS.currentDatingLocation && GS.currentDatingLocation.name) {
  html += '<div class="dating-location-banner">📍 ' + escHtml(GS.currentDatingLocation.name) + '</div>';
}
```

- 通过 `escHtml()` 转义，符合项目安全规范
- 放在 `narrative-box` 内部第一个元素位置，确保始终在最上方
- 无外部依赖，3 行代码变更

#### 2. `src/style.css` — 新增 `.dating-location-banner` 样式

在 Narrative Box 样式块之后（约第291行），新增：

```css
.narrative-box .dating-location-banner {
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  padding: 10px 16px;
  margin-bottom: 14px;
  background: linear-gradient(135deg, #fce4ec, #f8bbd0);
  border-radius: 10px;
  color: #880e4f;
  letter-spacing: 1px;
}
```

- `text-align: center` 居中显示
- `font-weight: 700` 加粗突出
- 粉色渐变背景，与现有粉色系主题风格一致
- 深色主题时通过 `var()` 已在 `.narrative-box` 层控制基础颜色

### 数据流说明

`game-engine.js` 第194-196行 → `GS.currentDatingLocation`（`{name, desc}` 对象） → `renderNarrativeSection()` 读取并渲染 → 玩家看到地点名称

### 无需修改的文件

- `state.js` — `currentDatingLocation` 是动态属性，无需默认值
- `game-engine.js` / `prompts.js` — 现有逻辑不变