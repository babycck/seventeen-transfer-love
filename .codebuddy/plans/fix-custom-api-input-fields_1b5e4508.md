---
name: fix-custom-api-input-fields
overview: 修复自定义 API 输入框不显示的 bug：将条件渲染改为总是渲染+display控制，确保切换到"自定义 API"时接口地址和模型名输入框能正常出现。
---

现在我完全确认了问题根因。以下是分析和解决方案：

## 问题诊断

**根本原因**：自定义 API 的输入框采用了**条件渲染**——初始 provider 不是 `custom` 时，HTML 字符串直接为空，DOM 中根本不存在这些 `<input>` 元素。当用户在下拉框切换到"自定义 API"时，change 事件用 `getElementById` / `querySelector` 去查找这些元素，拿到 `null`，`if (element)` 判断跳过，所以输入框永远不出现。

**具体位置**：

- `ui-renderer.js` 第 241 行：`_customFields = _isCustom ? '...' : ''` —— 非 custom 时为空字符串
- `ui-renderer.js` 第 572-582 行：切换事件查找不存在的元素，`if (customFields)` 为 false，跳过
- `api-settings-modal.js` 第 145-160 行：`customDefaultFields` / `customMainFields` 同样条件渲染
- `api-settings-modal.js` 第 294-303、358-367 行：同样查找不存在的元素

## 解决方案

把自定义字段从**条件渲染**改为**始终渲染 + 容器显隐**：用一个 `<div>` 包裹自定义字段，初始非 custom 时 `display:none`，切换时只 toggle 这个容器的 display。这与代码中已有的 `modelSelectWrap` 模式完全一致。

<plan_result>
<req>

## 问题描述

用户选择"自定义 API"提供商后，页面上没有出现可以输入接口网址和模型名的输入框。

## 根本原因

自定义输入框采用条件渲染（三元运算符），初始 provider 非 custom 时 DOM 中不存在这些 input 元素。切换 provider 的 change 事件用 getElementById 查找元素得到 null，if 判断跳过，导致切到 custom 后输入框永远不出现。

## 修复目标

- 自定义接口地址和模型名输入框始终存在于 DOM 中，通过容器 div 的 display 属性控制显隐
- 用户切换到"自定义 API"时输入框立即出现，切走时立即隐藏
- 同时修复 Step 1 设置向导（ui-renderer.js）和设置弹窗（api-settings-modal.js）
</req>

<tech>

## 技术栈

- 现有项目：JavaScript (ES Modules), Vite, Vanilla JS
- 无需新依赖

## 实现方案

### 核心策略

将自定义字段的 HTML 从"条件输出空字符串"改为"始终输出 + 外层包裹 div 控制显隐"。切换事件从逐个 toggle 4 个元素简化为 toggle 1 个容器 div。这与代码中已有的 `modelSelectWrap` / `defaultModelWrap` 模式完全一致。

### 关键决策

1. **用容器 div 包裹**：比逐个 toggle label + input 更可靠，避免 previousElementSibling 依赖 DOM 顺序的脆弱性
2. **容器 ID 规范**：`buildApiBlock` 用 `_idPrefix + 'customFieldsWrap'`（生成 `customFieldsWrap` / `othercustomFieldsWrap` / `maincustomFieldsWrap`）；modal 默认区用 `customFieldsWrap`，正文区用 `mainCustomFieldsWrap`
3. **不改变现有字段命名和 state 字段**：`customApiEndpointInput` / `customApiModelInput` / `mainCustomApiEndpointInput` / `mainCustomApiModelInput` 等 ID 保持不变，`GS.customApiEndpoint` 等 state 字段已存在无需改动

### 涉及文件

- `src/ui-renderer.js` [MODIFY] — 第 241-246 行 `_customFields` 改为始终输出并包裹容器 div；第 572-582 行切换事件简化为 toggle 容器
- `src/modals/api-settings-modal.js` [MODIFY] — 第 145-160 行 `customDefaultFields` / `customMainFields` 同样改造；第 294-303、358-367 行切换事件同样简化

### 性能

- 纯 DOM 显隐切换，无额外开销
</tech>
<todolist>
<item id="fix-ui-renderer" deps="">修改 ui-renderer.js：_customFields 始终输出并用容器 div 包裹，切换事件简化为 toggle 容器</item>
<item id="fix-settings-modal" deps="fix-ui-renderer">修改 api-settings-modal.js：customDefaultFields/customMainFields 同样改造，切换事件简化为 toggle 容器</item>
</todolist>
</plan_result>