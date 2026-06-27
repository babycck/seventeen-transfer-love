---
name: continuous-narrative-flow
overview: 去掉后续剧情之间的分隔线和选择标签，让所有剧情内容连续无缝显示，像一篇完整文章一样往下滚动。
todos:
  - id: continuous-narrative
    content: 去掉 consequence 间的分隔线和选择标签，让所有剧情正文连续排列（src/ui/narrative-box.js）
    status: pending
  - id: oneheart-fill-gap
    content: 添加 CSS 让 1v1 剧情区自动撑满屏幕高度，消除底部空白（src/style.css）
    status: pending
---

## 需求描述

### 1. 连续显示剧情，去除分断

1v1 模式下，每次选择后生成的新剧情被作为 `consequenceNarrative` 追加渲染。当前每段之间插入 `separator`（虚线分割）和 `choice-tag`（"你的选择"标签），导致阅读体验断层。需要将这些分隔元素全部去掉，让所有剧情正文连续排列。

### 2. 1v1 模式剧情区动态撑满屏幕

1v1 模式底部有 fixed 操作栏（`.oneheart-operation-overlay` bottom:48px）和 tab bar（`.oneheart-bottom-bar` bottom:0），剧情内容较短时在 PC 大屏上无法填满视口，正文与底部操作栏之间有大片空白。

**目标**：不管生成多少文字（200 字还是 5000 字），正文区都动态撑满 header 与底部 fixed 操作栏之间的空间，底部操作栏永远固定在屏幕底部不被遮挡。

### 3. 修复展开操作栏时自动弹键盘

当前点击操作栏拉手展开时，代码主动调用 `freeInput.focus()`，导致手机端软键盘自动弹出。应改为用户主动点击输入框才弹键盘。

### 4. 1v1 模式移除"历史剧情回顾"Tab

由于剧情改为连续累积显示，用户可滚动查看。但"📚 回顾"弹窗本身保留，因为里面有"📅 每日压缩记忆"tab（见修改 6）。1v1 模式下：

- 隐藏"📖 历史剧情"tab（因为剧情都在主页面）
- 保留"📅 每日压缩记忆"tab
- 隐藏"📜 短信历史"tab（1v1 无短信，已隐藏）

### 5. 修复 1v1 模式 header 通用按钮无响应

**问题：** `bindGameEvents()` 在 1v1 模式下调用 `bindOneHeartEvents()` 后直接 `return`，导致 header 里的通用按钮（⚙️设置、❓帮助、🎁礼物）从未绑定点击事件，点击无反应。

**根因位置：** `ui-renderer.js` 第 1287-1290 行

```javascript
if (GS.gameMode === 'oneHeart') {
  bindOneHeartEvents();
  return;   // ← 通用按钮绑定（第 1417-1434 行）全被跳过
}
```

**修复方案：** 在 `bindOneHeartEvents()` 函数末尾补充这些通用按钮的绑定。

### 6. 1v1 模式剧情压缩机制（每 15 次生成压缩前 10 段）

**背景：** 1v1 模式下剧情一直累积在 `consequenceNarratives` 数组和 DOM 中，长局会导致 DOM 膨胀卡顿。需要定期压缩旧剧情。

**压缩策略（滚动窗口）：**

- 新增状态字段 `GS.oneHeartGenCount`（生成计数器，初始 0）
- 每次点击剧情生成按钮（选项/自由输入/拉回主线/随机事件/走向大结局，**不含重新生成**）后 +1
- 当 `oneHeartGenCount >= 15` 且 `consequenceNarratives.length >= 10` 时触发压缩：

1. 取 `consequenceNarratives` 前 10 条，调用 AI 压缩成一段摘要
2. 摘要存入 `GS.dailySummaries`（追加一条，标注"第 1-N 回合压缩"）
3. 这 10 条原文移入 `GS.oneHeartArchivedNarratives`（缓存数组，永久保留）
4. 从 `consequenceNarratives` 数组中删除这 10 条
5. `oneHeartGenCount -= 10`（滚动窗口，下次再累积 10 次触发）

- 之后每累积 10 次，压缩最早的 10 条

**DOM 渲染：** `consequenceNarratives` 变短后，narrative-box 只渲染剩余的近期剧情，DOM 负担降低。

**导出兼容：** 修改 `exportStoryTxt()`，1v1 模式下导出 `oneHeartArchivedNarratives` + `consequenceNarratives` 的全部原文（按时间顺序拼接），确保导出完整。

**回顾弹窗：** "📅 每日压缩记忆"tab 复用现有 `buildSummaryContent()`，自动显示 `GS.dailySummaries` 中的压缩摘要。

**涉及文件：**

- `d:\SEVENTEEN\src\state.js` — `defaultGameState()` 新增 `oneHeartArchivedNarratives: []` 和 `oneHeartGenCount: 0`；`migrateSave()` 兜底初始化
- `d:\SEVENTEEN\src\game-engine.js` — `generateOneHeartRound()` 末尾增加计数和压缩触发逻辑
- `d:\SEVENTEEN\src\modals\api-settings-modal.js` — `exportStoryTxt()` 增加 1v1 模式分支
- `d:\SEVENTEEN\src\modals\review-modal.js` — 1v1 模式下隐藏"📖 历史剧情"tab，默认显示"📅 每日压缩记忆"tab

## 技术方案

### 修改 1：连续剧情渲染（仅 1v1 模式）

**文件：** `d:\SEVENTEEN\src\ui\narrative-box.js`

**修改位置：** `renderNarrativeSection()` 函数（第 127-177 行）中 `consequenceNarratives` 的渲染循环

**改动内容：**

- 仅在 `GS.gameMode === 'oneHeart'` 时移除分隔元素
- 换乘恋爱模式保留原有的 `separator` 和 `choice-tag`
- 保留 `#narrativeNewContent` 容器（打字机效果依赖它）

**代码变化：**

```javascript
// 修改后（根据 gameMode 区分）：
var isOneHeart = GS.gameMode === 'oneHeart';

for (var i = 0; i < GS.consequenceNarratives.length - 1; i++) {
  var cn = GS.consequenceNarratives[i];
  if (!isOneHeart) {
    html += '<div class="separator"></div>';
    if (cn.choiceText) {
      html += '<div class="choice-tag">❥ 你的选择：' + escHtml(cn.choiceText) + '</div>';
    }
  }
  html += renderParsedNarrative(cn.parsed);
}
// 最后一条
var lastCn = GS.consequenceNarratives[GS.consequenceNarratives.length - 1];
var newHtml = '';
if (!isOneHeart && lastCn.choiceText) {
  newHtml += '<div class="choice-tag">❥ 你的选择：' + escHtml(lastCn.choiceText) + '</div>';
}
newHtml += renderParsedNarrative(lastCn.parsed);
if (!isOneHeart) {
  html += '<div class="separator"></div>';
}
html += '<div id="narrativeNewContent" data-narrative-html="' + escHtml(newHtml) + '">' + newHtml + '</div>';
```

**说明：** 所有修改仅影响 1v1 模式，换乘恋爱模式完全不受影响。

### 修改 2：1v1 剧情区动态撑满

**思路：** 给 1v1 模式的 `#app` 加 class `oneheart-mode`，用 CSS flex column 布局让 narrative 区撑满中间空间。

#### 2a. 给 #app 加 class 标识

**文件：** `d:\SEVENTEEN\src\ui-renderer.js`

**修改位置：** `renderAll()` 函数（第 52-71 行）

**改动内容：** 在渲染前根据 gameMode 给 `#app` 加/移除 `oneheart-mode` class

```javascript
export function renderAll() {
  var app = document.getElementById('app');
  // 1v1 模式标识，供 CSS 做差异化布局
  if (GS.gameMode === 'oneHeart' && GS.step >= 5) {
    app.classList.add('oneheart-mode');
  } else {
    app.classList.remove('oneheart-mode');
  }
  if (GS.step < 5) {
    app.innerHTML = renderSetupWizard();
    bindSetupEvents();
  } else {
    app.innerHTML = renderGameScreen();
    // ... 原有逻辑不变
  }
}
```

#### 2b. CSS flex 布局撑满

**文件：** `d:\SEVENTEEN\src\style.css`

**新增规则（追加到文件末尾或合适位置）：**

```css
/* ===== 1v1 模式：剧情区动态撑满屏幕 ===== */
#app.oneheart-mode {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 110px;  /* 留出底部 fixed 操作栏(~70px) + tab bar(~50px) 空间，避免遮挡 */
}

/* 让包含 narrative-box 的 .card 撑满剩余高度 */
#app.oneheart-mode .card:has(> .narrative-box) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;  /* flex 子项防溢出 */
}

/* narrative-box 撑满父容器，解除原来的 max-height: 60vh 限制 */
#app.oneheart-mode .narrative-box {
  flex: 1;
  max-height: none;
  overflow-y: auto;
}
```

**关于 `:has()` 兼容性：** `:has()` 选择器在现代浏览器中已普遍支持（Chrome 105+、Edge 105+、Safari 15.4+、Firefox 121+）。本项目是 2026 年的 Web 应用，目标用户浏览器版本足够新，可以放心使用。如果担心兼容性，可改为在 `renderOneHeartGameScreen()` 中用字符串替换给 narrative card 加特定 class（如 `oneheart-narrative-card`），但 `:has()` 方案更简洁可靠。

### 修改 3：修复展开操作栏自动弹键盘

**文件：** `d:\SEVENTEEN\src\ui-renderer.js`

**修改位置：** `bindOneHeartEvents()` 函数中 operationToggle 的事件监听（第 1910-1917 行）

**改动内容：** 移除展开时对 `freeInput` 的 `focus()` 调用

```javascript
// 修改前
operationToggle.addEventListener('click', function() {
  var isHidden = operationBody.style.display === 'none';
  operationBody.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    var inp = document.getElementById('freeInput');
    if (inp) inp.focus();   // ← 移除这段
  }
});

// 修改后
operationToggle.addEventListener('click', function() {
  var isHidden = operationBody.style.display === 'none';
  operationBody.style.display = isHidden ? 'block' : 'none';
  // 不再自动 focus，让用户主动点击输入框才弹键盘
});
```

### 修改 4：1v1 模式调整"📚 回顾"弹窗

**文件：** `d:\SEVENTEEN\src\modals\review-modal.js`

**改动内容：** 1v1 模式下隐藏"📖 历史剧情"tab，保留"📅 每日压缩记忆"tab

```javascript
// Tab 按钮（修改后）
var tabsHtml = '<div style="display:flex;gap:4px;margin-bottom:10px;flex-shrink:0">';
if (!isOneHeart) {
  tabsHtml += '<button class="tab-btn active" id="reviewTabHistory">📖 历史剧情</button>';
  tabsHtml += '<button class="tab-btn" id="reviewTabSummary">📅 每日压缩记忆</button>';
  tabsHtml += '<button class="tab-btn" id="reviewTabSms">📜 短信历史</button>';
} else {
  // 1v1 模式：只显示压缩记忆 tab
  tabsHtml += '<button class="tab-btn active" id="reviewTabSummary">📅 每日压缩记忆</button>';
}
tabsHtml += '</div>';
```

同时调整默认显示的 tab 内容：1v1 模式下默认显示 `reviewSummaryContent`，隐藏 `reviewHistoryContent`。

### 修改 5：1v1 模式补充 header 通用按钮绑定

**文件：** `d:\SEVENTEEN\src\ui-renderer.js`

**修改位置：** `bindOneHeartEvents()` 函数末尾（约第 2015 行，submitBtn 绑定之后）

**改动内容：** 在函数末尾添加 header 通用按钮的事件绑定

```javascript
// 在 bindOneHeartEvents() 末尾添加：
// Header 通用按钮（1v1 模式下也需要绑定）
var settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) settingsBtn.addEventListener('click', showApiSettingsModal);

var helpBtn = document.getElementById('helpBtn');
if (helpBtn) helpBtn.addEventListener('click', showHelpMergedModal);

var giftBtn = document.getElementById('giftBtn');
if (giftBtn) giftBtn.addEventListener('click', showGiftPanel);

// 滚动到顶部按钮
var backToTopBtn = document.getElementById('backToTopBtn');
if (backToTopBtn) {
  backToTopBtn.addEventListener('click', function() {
    var nb = document.getElementById('narrativeBox');
    if (nb) nb.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
```

**说明：** 修复 1v1 模式下 ⚙️设置、❓帮助、🎁礼物 按钮点击无反应的问题。注意 `showApiSettingsModal`、`showHelpMergedModal`、`showGiftPanel` 已在文件顶部 import，无需额外引入。

### 涉及文件

| 文件 | 修改类型 | 说明 |
| --- | --- | --- |
| `d:\SEVENTEEN\src\ui\narrative-box.js` | 逻辑修改 | 1v1 模式移除 consequence 间的 separator 和 choice-tag |
| `d:\SEVENTEEN\src\ui-renderer.js` | 逻辑修改 | renderAll() 加 oneheart-mode class；移除展开时自动 focus；bindOneHeartEvents 补充通用按钮绑定 |
| `d:\SEVENTEEN\src\ui\header-bar.js` | 逻辑修改 | 1v1 模式保留"📚 回顾"按钮（弹窗内调整 tab） |
| `d:\SEVENTEEN\src\modals\review-modal.js` | 逻辑修改 | 1v1 模式隐藏"📖 历史剧情"tab，只显示"📅 每日压缩记忆" |
| `d:\SEVENTEEN\src\state.js` | 逻辑修改 | 新增 `oneHeartArchivedNarratives` 和 `oneHeartGenCount` 字段 |
| `d:\SEVENTEEN\src\game-engine.js` | 逻辑修改 | `generateOneHeartRound()` 末尾增加压缩触发逻辑 |
| `d:\SEVENTEEN\src\modals\api-settings-modal.js` | 逻辑修改 | `exportStoryTxt()` 增加 1v1 模式分支（导出缓存+当前剧情） |
| `d:\SEVENTEEN\src\style.css` | 新增样式 | 1v1 模式 flex 布局，剧情区撑满 |


### 预期效果

- **剧情连续：** 所有正文段落直接首尾相接，无虚线分隔，无"你的选择"标签，像读小说
- **撑满屏幕：** 1v1 模式下，正文区动态填满 header 到底部操作栏之间的空间
- **底部不遮挡：** fixed 操作栏和 tab bar 永远在屏幕底部可见，正文不会被遮挡
- **内容可滚动：** 正文超过视口时，narrative-box 内部滚动
- **不自动弹键盘：** 展开操作栏后不会自动聚焦输入框，用户主动点击才弹键盘
- **无历史回顾按钮：** 1v1 模式 Header 不显示"📚 回顾"，剧情直接在页面滚动查看
- **换乘恋爱完全不受影响：** 换乘模式保留原有的 separator 和 choice-tag，布局和事件绑定都不变