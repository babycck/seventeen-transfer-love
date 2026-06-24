---
name: gift-cabinet-return-only-desc
overview: 礼物柜 Tab 只显示回礼、移除约会礼物，并添加点击回礼弹出 AI 生成 ~100 字描述的功能。
design:
  architecture:
    framework: react
  styleKeywords:
    - Minimalism
    - Clean
    - Consistent
  fontSystem:
    fontFamily: inherit
    heading:
      size: 16px
      weight: 600
    subheading:
      size: 18px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#c2185b"
      - "#e91e63"
    background:
      - "#FFFFFF"
      - "#f0faf0"
      - "#f5f0f0"
    text:
      - "#3d2c2c"
      - "#8b6b6b"
todos:
  - id: modify-return-gift-storage
    content: Modify game-engine.js checkPendingReturnGifts() to include giftDesc field in returnGiftHistory entries
    status: completed
  - id: add-migrate-compat
    content: Add backward compatibility in state.js migrateSave() for old returnGiftHistory entries missing giftDesc
    status: completed
    dependencies:
      - modify-return-gift-storage
  - id: rebuild-gift-cabinet
    content: "Rebuild renderReceivedGifts() in gift-panel.js: remove date gifts, add clickable gift items with data-gift-desc attr"
    status: completed
    dependencies:
      - modify-return-gift-storage
  - id: add-desc-popup-and-ai
    content: Add showGiftDescModal() and getGiftDescription() with AI generation + caching in gift-panel.js
    status: completed
    dependencies:
      - rebuild-gift-cabinet
  - id: add-event-delegation
    content: Wire gift click handler into giftTabContent event delegation in showGiftPanel()
    status: completed
    dependencies:
      - rebuild-gift-cabinet
      - add-desc-popup-and-ai
---

## 需求概述

修改礼物面板中的「礼物柜」Tab（Tab 2），实现以下两点：

### 1. 礼物柜只显示回礼

- 移除「约会礼物」部分，只保留并展示「回礼」列表
- 无回礼时显示「暂无收到回礼」
- 原有的「约会礼物」不再展示（直接去掉）

### 2. 点击回礼展示 AI 生成描述

- 每个回礼条目可点击（显示为可交互样式）
- 点击后弹出小弹窗，显示：
- 赠送成员名 + 礼物名称（标题）
- ~100 字礼物描述（AI 动态生成，贴近成员人设）
- 关闭按钮
- 缓存机制：首次点击时调用 AI 生成并存入游戏状态，后续点击直接展示缓存
- 向后兼容：旧存档中无描述的回礼条目，首次点击仍触发 AI 生成

## 技术方案

### 涉及文件及改动

#### 1. `src/modals/gift-panel.js` — 核心改动

**A. 重构 `renderReceivedGifts()`**

- 移除约会礼物相关代码（`hasDateGifts` 判断、`dateGiftHistory` 遍历渲染、对应标签）
- 回礼渲染改为可点击条目：每个 `<div>` 添加 `data-gift-desc="{idx}"` 属性和 `cursor:pointer` 样式
- 无回礼时显示「暂无收到回礼」

**B. 新增 `showGiftDescModal(rg, member)` 函数**

- 创建一个简单的小弹窗（参照现有 modal 模式：`modal-overlay` + `modal-content`）
- 布局：标题行（成员 emoji + 名称 + 礼物名称） + 分隔线 + 描述正文 + 关闭按钮
- 弹窗大小控制在 max-width:380px

**C. 新增 `getGiftDescription(rg, member)` 异步函数**

- 检查 `rg.giftDesc` 是否已有缓存内容
- 如有缓存 → 直接返回
- 如无缓存 → 调用 `callDeepSeek()` 生成描述
- Prompt：告知 AI 礼物名称、赠送成员名称/人设、及当前游戏阶段，要求生成 ~100 字描述
- 生成成功 → 更新 `GS.returnGiftHistory[idx].giftDesc` → `saveGame()` → 返回描述
- 生成失败 → 返回备用描述文字

**D. 事件监听**

- 在 `giftTabContent` 的事件委托中新增 `[data-gift-desc]` 检测
- 获取对应 `returnGiftHistory` 条目 → 调用 `getGiftDescription()` → 展示 `showGiftDescModal()`

#### 2. `src/data.js` — 无改动

- 由于描述由 AI 动态生成，`RETURN_GIFTS` 保持原字符串数组即可，无需改动

#### 3. `src/game-engine.js` — 存储格式微调

**修改 `checkPendingReturnGifts()`（第1434-1438行）**

- 回礼推入 `returnGiftHistory` 时新增 `giftDesc: ''` 空字段用于缓存

```javascript
// 修改前
GS.returnGiftHistory.push({ memberId: first.memberId, gift: gift, day: GS.day });

// 修改后
GS.returnGiftHistory.push({ memberId: first.memberId, gift: gift, day: GS.day, giftDesc: '' });
```

#### 4. `src/state.js` — 向后兼容

**`migrateSave()` 中新增兼容处理**

- 遍历 `GS.returnGiftHistory`，为无 `giftDesc` 的旧条目标记空字符串

### AI 生成 Prompt 设计

```
你是《换乘恋爱》的叙事AI。请为以下回礼生成一段约100字的描述。
礼物：{礼物名称}
赠送者：{成员名}（{成员人设简述}）
要求：
- 描述这个礼物在故事中的样貌、质感和背后的心意
- 贴合赠送者的性格和人设
- 约100字，中文，自然叙事风格
- 只输出描述文本，不要标题/引号
```

### 关键设计决策

- **缓存策略**：描述存入游戏状态而非独立缓存，避免刷新丢失；同时与存档共存，导出导入时自动携带
- **失败降级**：AI 调用失败时使用备用描述「{礼物名称}——来自{成员名}的心意」，确保交互不被阻塞
- **弹窗样式**：复用现有 `modal-overlay` 遮罩层 + `modal-content` 容器，与游戏整体视觉风格一致
- **事件机制**：利用已有 `giftTabContent` 的事件委托，无需新增事件绑定，避免内存泄漏

### 性能说明

- AI 调用仅在首次点击时触发，后续直接读缓存，无重复开销
- 弹窗为一次性 DOM 创建，关闭时移除，不驻留内存

## 设计说明

该改动为现有游戏界面内的功能增强，不涉及全新页面设计。仅新增一个小型模态弹窗用于展示礼物描述，弹窗风格与现有 modal 系统保持一致（浅色背景、圆角、居中遮罩、关闭按钮）。回礼列表中的条目改为可点击样式（hover 背景色变化、指针样式），区分于不可交互元素。