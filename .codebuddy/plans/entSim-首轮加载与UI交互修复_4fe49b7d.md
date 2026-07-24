---
name: entSim-首轮加载与UI交互修复
overview: 修复娱乐圈模拟器（entSim）两类问题：① 首轮生成卡死（种子事件校验失败 + 首轮 gate 死循环）；② UI 交互缺陷（进聊天页后回不去/切不回剧情、自定义输入框无样式、快捷按钮太靠下）。用户每次开新档，无需旧存档迁移。
todos:
  - id: fix-seed-event
    content: 修复 ensureSeedEvent：加 plainText/skipValidate、重写 prompt、补兜底场景（engine.js）
    status: completed
  - id: fix-render-gate-and-nav
    content: 修复 ui.js：首轮 gate 加 autoTries 上限，并把 Tab 切换与返回绑定改为全 Tab 通用
    status: completed
    dependencies:
      - fix-seed-event
  - id: move-quick-and-input
    content: ui.js：新增 renderQuickActions 移到剧情框下方，自由输入包发送按钮
    status: completed
    dependencies:
      - fix-render-gate-and-nav
  - id: style-free-input
    content: style.css 新增 .es-free-input 及发送按钮样式，对齐聊天输入框
    status: completed
    dependencies:
      - move-quick-and-input
  - id: verify-build
    content: npm run dev 验证首轮生成、Tab 返回、输入框样式与快捷按钮位置
    status: completed
    dependencies:
      - style-free-input
---

## 用户需求

娱乐圈模拟器（entSim 模式）存在两类问题，需一并修复。用户明确：每次都开新档，修复无需考虑旧存档迁移。

## 核心问题

1. 首轮剧情卡死：打开后永久停在「剧情加载中」，无法进入。
2. 聊天页无法返回：点「聊天」Tab 后剧情消失且回不去、切不回剧情。
3. 自由输入框观感差：剧情框下方的自定义输入框无样式、无发送按钮。
4. 快捷按钮位置过低：拉回主线/随机事件/探班/走向结局/进入下一天等按钮位于屏幕最底栏，而剧情框下方有大片空白，应将按钮上移到剧情框下方。

## 修复后预期效果

- 新档进入 entSim 能正常生成首轮剧情（含正文与选项），控制台无校验失败日志。
- 任意 Tab 内均可点「‹ 返回」或底部 Tab 切回剧情，不再卡死。
- 自由输入框为圆角软底样式并带「发送」按钮，与聊天输入框视觉一致。
- 快捷指令按钮位于剧情框正下方，靠近剧情内容，操作更顺手。

## 技术栈选择

- 现有项目：Vanilla JS（ES Module）+ Vite 构建；保持既有约定（var、字符串拼接、不新增依赖、不新建文件）。
- 目标文件仅 3 个：`src/ent-sim/engine.js`、`src/ent-sim/ui.js`、`src/style.css`。

## 实现方案

### 1. 修复种子事件生成（engine.js `ensureSeedEvent`，:170-182）

- 调用 `generateWithRetry` 的 opts 增加 `plainText: true, skipValidate: true`，使其按纯文本处理、不强制 JSON、跳过 options/长度校验（对齐 ai-generator.js:51-53 既有分支）。
- 重写 prompt：去掉「设定器/不要 JSON/不要解释」等元指令，改为自然写作指令。system 直接给角色定位，user 要求输出约 200 字场景正文（不写标题/解释/选项、不出现女主姓名）。
- `.then` 中若 `res.raw` 为空，写入一道干净兜底场景（参照 ui-renderer.js:1370-1371 的 1v1 写法），保证 `GS.entSim.romance.seedEvent` 永不空、不污染 prompts.js:23-24 回溯锚点。

### 2. 修复首轮 gate 死循环（ui.js `renderHtml`，:54-62）

- 接入已有 `GS._entSimAutoTries`（state.js:93 初始化为 0）。首轮自动触发生成前自增；若 `>= 2` 则置 `GS.entSim.started = true` 并 rerender，交回 `bindEntSimEvents` 既有兜底（ui.js:309「点击拉回主线重试」）接管，避免无限「剧情加载中」。

### 3. 修复 Tab 导航（ui.js `bindEntSimEvents`，:318-330）

- 把 `.es-tab` 切换与 `[data-back="1"]` 返回的绑定抽到 `bindEntSimEvents` 开头，对所有 Tab 通用，再执行各 Tab 专属绑定（`bindChatEvents` 等）。使聊天/朋友圈/剧场页都能返回与切换。

### 4. 上移快捷按钮 + 美化自由输入（ui.js + style.css）

- 新增 `renderQuickActions()` 返回快捷按钮 HTML，在 `renderCenter` 的 romanceBtns 之后插入（剧情框下方）。
- 从 `renderFooter` 移除 `.es-quick` 行，footer 仅保留 8 阶段条 + Tab。
- 自由输入包进与聊天一致的 `.es-chat-input-area`（input + 「发送」按钮），新增 `.es-free-input` 样式对齐 `.es-chat-input`（圆角/软底/聚焦高亮），发送按钮绑定 `onFreeSend`（ui.js:405）。

## 实施注意

- 仅改上述 3 文件，复用现有函数（`switchEntSimTab`、`onFreeSend`、`rerender`）与 CSS 变量（`--es-soft`/`--es-primary2` 等），不引入新依赖。
- 不写旧存档迁移逻辑（用户每次开新档）；`E.started`/`_entSimAutoTries`/`_entSimGenerating` 已在 defaultGameState 定义，新档即生效。
- 改动需保持 entSim 三栏布局与移动端 `max-width:900px` 堆叠（style.css:2661）不受影响。

## 架构与目录

```
src/
├── ent-sim/
│   ├── engine.js  # [MODIFY] ensureSeedEvent 改纯文本模式+重写prompt+兜底；generateEntSimRound 不变
│   └── ui.js      # [MODIFY] renderHtml 首轮 gate 加 autoTries 上限；bindEntSimEvents 通用绑定 Tab/返回；
│                  #          renderCenter 插入 renderQuickActions + 自由输入加发送按钮；renderFooter 去快捷行
└── style.css      # [MODIFY] 新增 .es-free-input 及配套发送按钮样式，对齐 .es-chat-input
```