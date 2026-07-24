---
name: entSim-布局重构-顶部好感度+内联Tab
overview: 重构娱乐圈地下恋(entSim)UI布局：把 8 阶段好感度进度条从底部 footer 移到最顶部全宽；把 剧情/聊天/朋友圈/剧场 四个 Tab 从底部 footer 移到剧情框下方，点击后在剧情框下方内联展开内容（单页滚动），取消全屏独立页与返回按钮。仅改 ui.js 与 style.css。
design:
  architecture:
    framework: html
  styleKeywords:
    - 玻璃拟态
    - 紫色渐变
    - 顶部全宽进度条
    - 内联 Tab
    - 单页滚动
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 16px
      weight: 700
    subheading:
      size: 13px
      weight: 600
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#7C6FF0"
      - "#9D8BFF"
    background:
      - "#1A1830"
      - "#232040"
    text:
      - "#EDE9FF"
      - "#B9AEE0"
    functional:
      - "#7C6FF0"
      - "#9D8BFF"
      - "#F2C94C"
todos:
  - id: top-depth-bar
    content: ui.js 新增 renderDepthTop 顶部全宽进度条，插入 renderHtml 并移除 renderFooter 调用
    status: completed
  - id: inline-tab-content
    content: ui.js 重构 renderCenter 追加 Tab 行与 renderTabContent，chat/moments/theater 改为内联内容片段
    status: completed
    dependencies:
      - top-depth-bar
  - id: unify-events
    content: ui.js 去掉 bindEntSimEvents 的 tab 分支 return，统一绑定全部区块事件
    status: completed
    dependencies:
      - inline-tab-content
  - id: style-layout
    content: style.css 新增顶部深度条、剧情下方 Tab 行与内联内容面板样式
    status: completed
    dependencies:
      - top-depth-bar
  - id: verify-build
    content: 运行 vite build 验证构建，确认顶部进度条与内联 Tab 正常
    status: completed
    dependencies:
      - unify-events
      - style-layout
---

## 用户需求

重构娱乐圈地下恋（entSim）界面布局，调整两处位置：

- 好感度 8 阶段进度条从底部 footer 移到**最顶部全宽**（顶部 header 已有的「好感 X/100」小字与阶段徽章保留不动）。
- 「剧情 / 聊天 / 朋友圈 / 剧场」四个 Tab 从底部 footer 移到**剧情框下方**；点击后在剧情框正下方**内联展开**对应内容，整页单栏滚动，取消原来的全屏独立页与「‹ 返回」按钮。

## 核心功能

- 顶部新增一条横跨三栏宽度的好感度阶段进度条（8 格 + 阶段图标/文案），始终可见。
- 剧情框下方出现 Tab 行（剧情/聊天/朋友圈/剧场，当前项高亮）。
- 点击聊天/朋友圈/剧场后，内容（消息列表+输入框 / 动态列表+生成按钮 / 番外类型+内容区）直接渲染在剧情框下方，与剧情、选项、自由输入、快捷指令同处一个可滚动页面。
- 左/中/右三栏信息（日程、队友、曝光 / 剧情、选项 / 圈内态势）布局不变；底部 footer 不再渲染。

## 技术栈

- 沿用现有：Vanilla JS（ES Modules）+ Vite，单文件 `src/ent-sim/ui.js` 负责渲染与事件绑定，`src/style.css` 承载样式。
- 无新依赖、无新 UI 框架，复用现有 `renderHeader/renderCenter/renderLeft/renderRight`、romance.js 的阶段函数与 `switchEntSimTab/rerender` 链路。

## 实现方案

核心策略：把「布局容器（footer 中的深度条 + Tab）」拆成「顶部深度条」+「剧情框下方 Tab 行 + 内联面板」，并让 `renderHtml` 始终渲染 header + 顶部深度条 + 三栏，不再对 chat/moments/theater 早期 return。

关键技术决策与理由：

1. **新增 `renderDepthTop()`**：把 `renderFooter` 里的 8 格深度条逻辑（`affectionStageIndex` + `es-depth-cell`）抽到顶部全宽容器，居中显示。理由：深度条与三栏无关，放顶部全宽最直观，且不与 header 内的小字好感重复（顶部细条是可视化进度，header 是数值）。
2. **`renderCenter` 末尾追加 `renderTabBar()` + `renderTabContent(tab)`**：Tab 行用既有 `.es-tab/.on` 样式；`renderTabContent` 仅返回内容面板内部 HTML（chat 消息+输入框 / moments 列表+生成按钮 / theater 类型按钮+内容区），去掉原全屏 header 与 `data-back` 返回按钮。story 时不追加内容面板，只显示 Tab 行。理由：满足「内联、单页滚动」，复用现有回调（onChatSend / generateEntSimMoment / 剧场点击）。
3. **重构 `renderChatTab/renderMomentsTab/renderTheaterTab`**：由「整页 return」改为纯内容函数 `renderTabContent` 内的分支，删除各自 `renderHeader()/renderFooter()/[data-back]`。理由：避免重复 header/footer 与返回逻辑，消除同页死链（之前进聊天页靠返回才能回剧情）。
4. **`renderHtml` 去掉对非 story Tab 的早期 return**，保留首轮生成 gate（loading）。理由：所有 Tab 同页渲染，切换只改 `GS._entSimTab` 触发 `rerender`。
5. **`bindEntSimEvents` 去掉 `if (tab===...) return` 分支**，统一调用 `bindCommonNav + bindStoryEvents + bindChatEvents + bindMomentsEvents + bindTheaterEvents`。理由：事件绑定需覆盖同页所有可见区块，否则内联 Tab 无法交互。

性能与可靠性：均为静态字符串拼接 + 既有事件代理，无新增热路径；`rerender` 复用现有 `window.__renderEntSim` 链路，切换 Tab 仅重渲整页（体量小，无性能风险）。

## 实现注意事项

- 复用既有样式变量（`--es-primary/--es-primary2/--es-card/--es-text` 等），不新增配色。
- `.es-footer` 相关 CSS 规则保留不删（已不再调用，无害），仅在 `renderHtml` 移除 `renderFooter()` 调用。
- 保持 `escHtml()` 转义所有 AI 文本（聊天/朋友圈/剧场内容已转义，沿用不变）。
- 不改动 `renderHeader`（保留好感小字与阶段徽章）、`renderLeft/renderRight` 结构。

## 架构设计

修改仅限渲染层，不影响引擎/状态/AI 生成逻辑。渲染链：

```
renderHtml()
  ├─ renderHeader()            （保留：cycle + 阶段徽章 + 人气 + 好感小字 + 设置）
  ├─ renderDepthTop()          [新增] 顶部全宽 8 格进度条
  ├─ es-grid
  │    ├─ renderLeft()         （日程/队友/曝光）
  │    ├─ renderCenter()       （剧情块 + renderTabBar + renderTabContent）
  │    └─ renderRight()        （圈内态势/关系网）
  └─ （不再调用 renderFooter）
```

`bindEntSimEvents` 统一绑定同页全部区块事件。

## 目录结构

```
src/
├── ent-sim/
│   └── ui.js        # [MODIFY] 渲染与事件绑定：新增 renderDepthTop、renderTabBar、renderTabContent；
│                    #          renderCenter 末尾追加 Tab 行与内联内容；chat/moments/theater 改为内容片段；
│                    #          renderHtml 移除 renderFooter 调用与早期 return；bindEntSimEvents 统一绑定。
└── style.css        # [MODIFY] 新增 .es-depth-top（全宽）、.es-tabbar（剧情框下方）、.es-tab-content（面板）样式，
                     #          对齐现有配色变量；保留 .es-footer 规则（不再调用）。
```

## 关键代码结构（接口级）

```js
// 顶部全宽好感度进度条（替代原 footer 深度条）
function renderDepthTop() {
  var aff = GS.entSim.affection;
  var idx = affectionStageIndex(aff);
  var cells = '';
  for (var i = 0; i < 8; i++) cells += '<span class="es-depth-cell' + (i <= idx ? ' on' : '') + '"></span>';
  return '<div class="es-depth-top"><span class="es-depth-ic">' + getRomanceStageIcon() + '</span>' +
    '<div class="es-depth-bar">' + cells + '</div>' +
    '<span class="es-depth-label">' + getRomanceStageLabel() + '</span></div>';
}

// 剧情框下方的 Tab 行
function renderTabBar() {
  return '<div class="es-tabbar">' + ['story','chat','moments','theater'].map(function(t) {
    return '<span class="es-tab' + (currentTab() === t ? ' on' : '') + '" data-tab="' + t + '">' +
      ({ story:'剧情', chat:'聊天', moments:'朋友圈', theater:'剧场' }[t]) + '</span>';
  }).join('') + '</div>';
}

// 内联内容（story 时无内容面板）
function renderTabContent(tab) {
  if (tab === 'chat') return ...;     // 复用现 chat 面板内部 HTML，去掉 header/footer/返回
  if (tab === 'moments') return ...;  // 复用现 moments 面板内部 HTML
  if (tab === 'theater') return ...;  // 复用现 theater 面板内部 HTML
  return '';
}
```

娱乐圈地下恋（entSim）界面布局重构，非新建 UI，沿用现有三栏配色与玻璃拟态质感。将好感度 8 阶段进度条上移到顶部全宽一条，将「剧情/聊天/朋友圈/剧场」Tab 行下移到剧情框下方，点击后内容内联于剧情下方，整页单栏滚动。视觉风格保持现有 --es-primary 紫色渐变、毛玻璃卡片、圆角 pill 按钮，不引入新配色与组件库。顶部深度条与剧情下方 Tab 行沿用既有 `.es-depth-cell`/`.es-tab` 视觉，仅调整容器布局（全宽/横向），保证与现有 header、左右栏协调一致。

## Agent Extensions

（本次任务仅涉及现有 ui.js / style.css 局部重构，复用已有函数与样式，无需额外 Skill / SubAgent / Integration）