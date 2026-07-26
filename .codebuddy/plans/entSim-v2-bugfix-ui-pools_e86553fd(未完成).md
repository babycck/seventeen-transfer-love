---
name: entSim-v2-bugfix-ui-pools
overview: 修复好感度点击失效、移除关系网、重组快捷栏布局、增加工作冷却显示、补全池子分类（单人/团队）、左栏团队信息改版、恋情面板交互增强。
todos:
  - id: quickbar-reorder-cooldown
    content: 快捷栏重排与冷却系统：row1改信箱/奖项/代言/综艺/画报/发布，row2去结局；代言/综艺/画报/发布增加冷却天数显示和灰化状态；state.js新增_lastVarietyDay/_lastMagazineDay字段；migrateSave兜底初始化
    status: pending
  - id: pool-scope-field
    content: 四个工作池子加scope字段：brand-offers.js/VARIETY_SHOW_POOL/MAGAZINE_POOL/RELEASE_POOL每条目标注solo或group
    status: pending
  - id: ending-relocate
    content: 结局按钮从快捷栏row2移到右侧栏剧场按钮下方，绑定onEnding()
    status: pending
  - id: team-info-split-recent
    content: 左侧团队信息优化：公司名和风格拆两行；出圈曲下方新增最近活动栏目（从careerHistory筛近30天记录，按类型各展一条）
    status: pending
  - id: affection-brother-fix
    content: 恋情面板修复：好感度行绑定showAffectionLogModal()点击事件；哥哥支持度改为可点击+新建showBrotherSupportModal()弹窗+brother.js追加supportLog日志+state.js初始化
    status: pending
  - id: delete-npc-network
    content: 删除关系网：ui.js删除NPC渲染/事件绑定/onNpcInteract函数/npc-network导入/SHOW_NPC常量；state.js删除initNpcNodes调用和npcInteractionUsed字段；npc-network.js保留不动
    status: pending
---

## 用户需求

对娱乐圈模拟器（entSim）进行10项UI修复和功能增强：

### 快捷栏重排

- 第一行：信箱 奖项 代言 综艺 画报 发布（代言/综艺/画报/发布四个工作按钮聚拢，奖项紧跟信箱）
- 第二行：重新生成 下一个行程 掩护 随机事件 探班 下一天（去掉结局按钮）
- 代言/综艺/画报/发布需要冷却显示，冷却中按钮灰化 + 倒计时（如"冷却3天"）

### 池子增强

- 代言/综艺/画报/发布四个池子加上 `scope` 字段（'solo'/'group'），区分单人和团队工作

### 结局按钮重定位

- 从快捷栏 row2 移除，放到右侧栏剧场按钮下方

### 左侧团队信息优化

- 公司名和风格从一行拆成两行，避免公司名太长挤掉风格
- 出圈曲下方新增"最近活动"栏目，显示团队最新专辑/综艺/获奖/画报各一条

### 恋情面板修复

- 好感度行（`es-aff-clickable`）点击无反应，缺少事件绑定，需绑定 `showAffectionLogModal()`
- 哥哥支持度行改为可点击，弹出模态框展示支持度变动日志

### 关系网删除

- 彻底删除右侧栏NPC关系网模块（渲染/事件/导入/函数），释放空间

### 池子数量确认

- 当前所有池子总计约1,502条，与之前提到的7,500条目标差距很大，需在计划中标注待确认

## 技术方案

### 1. 快捷栏重排（ui.js:317-341）

**修改 `renderQuickActions()`**：

- row1 顺序改为：letters / awards / brands / variety / magazine / release
- row2 移除 ending 按钮

**修改 `onQuick()`（第765-801行）**：无需改动，路由逻辑不变。

**冷却显示**：

- 在 row1 的 label 中检查冷却状态：
- brands: `E._lastBrandOfferDay` → `dayCount - _lastBrandOfferDay < 7` 则显示 `冷却(N)天`
- variety: 新增 `E._lastVarietyDay`，冷却 10 天
- magazine: 新增 `E._lastMagazineDay`，冷却 7 天
- release: 已有 `E._releaseCD`，冷却 15 天
- 冷却期间按钮加 `disabled` 属性，CSS `.es-quick-btn:disabled` 灰化

**新增冷却状态字段（state.js 第105-109行）**：

```javascript
E._lastVarietyDay = 0;  // 综艺冷却
E._lastMagazineDay = 0; // 画报冷却
```

**修改 `onQuick()` 路由函数**：代言/综艺/画报点击时先检查冷却，冷却中 `showToast()` 提示。

### 2. 结局按钮移到右侧栏（ui.js:396-401）

修改 `renderRight()`：在剧场按钮（`es-theater-rom-btn`）下方增加结局按钮：

```html
<button class="es-rom-btn" id="es-ending-btn" style="margin-top:6px;width:100%">结局</button>
```

在 `bindStoryEvents()` 中绑定 `es-ending-btn` → `onEnding()`。

### 3. 团队信息分两行（ui.js:207-212）

修改 `renderLeft()` 中团设卡片（第209行）：

```javascript
// 旧: '<div class="es-gm-line">🏢 ' + company + '  ·  🎵 ' + concept + '</div>'
// 新: '<div class="es-gm-line">🏢 ' + company + '</div>' +
//      '<div class="es-gm-line">🎵 ' + concept + '</div>'
```

### 4. 最近活动栏目（ui.js:193-225）

在 `renderLeft()` 的出圈曲（第211行）下方新增：

- 从 `E.careerHistory` 筛选近30天的记录，按类型分类（release/variety/award/magazine）
- 每种取最新一条显示为 `<div class="es-gm-line">📀/🎬/🏆/📸 内容摘要</div>`
- 如果某类型无记录则不显示该行

### 5. 恋情面板好感度修复（ui.js:596-639）

在 `bindStoryEvents()` 中添加：

```javascript
document.querySelectorAll('.es-aff-clickable').forEach(function(el) {
    el.addEventListener('click', function() { showAffectionLogModal(); });
});
```

`showAffectionLogModal()` 已存在（第449-471行），只需绑定事件。

### 6. 哥哥支持度可点击（ui.js:442-444）

**渲染层**：哥哥支持度行加 `es-brother-clickable` 类：

```javascript
html += '<div class="es-risk-row es-brother-clickable"><span>哥哥支持度</span><span>' + support + ' · ' + stance + '</span></div>';
```

**数据层**（brother.js）：每次修改支持度时追加日志：

```javascript
E.brother.supportLog = E.brother.supportLog || [];
E.brother.supportLog.push({ day: E.cycle.dayCount, delta: delta, reason: reason, total: E.brother.support });
```

**新建 `showBrotherSupportModal()`**：遍历 `E.brother.supportLog`，展示每条变动的时间/原因/变化量/当前值，无记录时提示"暂无支持度变动记录"。

**状态初始化**（state.js）：`E.brother.supportLog = []`。

### 7. 删除关系网模块

**ui.js 修改**：

- 第16行：删除 `import { getNpcNodes, interactNpc, getNpcInteractions }` 
- 第30行：删除 `var SHOW_NPC = [...]`
- 第381行：删除 `var npcs = renderNpcList();`
- 第396-397行：删除关系网标题和NPC网格渲染
- 第626-628行：删除 `document.querySelectorAll('.es-npc-node[data-npc]')` 绑定
- 第731-762行：删除 `onNpcInteract()` 函数
- 删除 `renderNpcList()` 函数（如存在）

**state.js 修改**：

- 第120-121行：删除 `initNpcNodes()` 调用
- 第95行：`E.misc` 中删除 `npcInteractionUsed`

**npc-network.js**：保留文件不动（防其他模块引用报错），仅 ui.js 和 state.js 断开引用。

### 8. 池子 scope 字段

在四个池子文件中为每条目增加 `scope: 'solo'` 或 `scope: 'group'` 字段：

- **brand-offers.js**（40条）：beauty/fashion 20条为 solo，其余按类型分配
- **variety-shows.js**（30条）：talk/music 类为 solo，game/reality/observe 为 group
- **magazine-shoots.js**（25条）：全部 solo
- **releases.js**（50条）：single/cover/collab 为 solo，photobook/practice/vlog 为 group

### 9. 存档迁移（src/state.js migrateSave）

新增字段兜底初始化：

- `E._lastVarietyDay = E._lastVarietyDay || 0`
- `E._lastMagazineDay = E._lastMagazineDay || 0`
- `E.brother.supportLog = E.brother.supportLog || []`
- 删除 `npcInteractionUsed` 的初始化