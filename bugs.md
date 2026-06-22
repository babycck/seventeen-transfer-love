# SEVENTEEN 项目 — 错误记录与修复汇总

> 本文档用于汇总开发/测试过程中发现并修复的问题，方便后续排查同类错误。

---

## 2026-06-20

### 1. 剧情生成失败（"AI 生成失败"提示）

**现象：**
- 游戏能正常运行，X 记忆可以生成，但点击选项后弹出 "AI 生成失败"。

**根因：**
- `src/parser.js` 中的 `parseNarrative()` 函数在处理 `[好感度: ...]` 标记时，调用了 `updateAffection`、`addAffectionLog`，但这两个函数没有在 `parser.js` 中导入。
- 当 AI 返回的剧情包含好感度标记时，`parseNarrative()` 抛出 `ReferenceError`，被外层的 `try-catch` 拦截后显示为 "AI 生成失败"。

**修复：**
- 在 `src/parser.js` 顶部添加导入：
  ```js
  import { updateAffection, addAffectionLog } from './affection.js';
  ```

---

### 2. 页面白屏 / 游戏打不开

**现象：**
- 刷新页面后整个页面白屏，控制台报模块加载错误 / 循环依赖错误。

**根因：**
- 修复问题 1 时，在 `src/parser.js` 中添加了从 `src/modals.js` 导入 `showToast`：
  ```js
  import { showToast } from './modals.js';
  ```
- 但 `src/modals.js` 本身又从 `src/parser.js` 导入了 `parseNarrative`，形成了循环依赖：
  ```
  parser.js → modals.js → parser.js
  ```
- Vite 的模块加载器在遇到循环依赖时会导致模块执行失败，整个页面白屏。

**修复：**
- 将 `showToast` 函数从 `src/modals.js` 迁移到 `src/utils.js`。
- `src/utils.js` 通过 `src/core.js` 统一导出，不依赖其他业务模块，彻底打破循环。
- 清理所有对 `modals.js` 中 `showToast` 的直接引用：
  - `src/parser.js`：移除 `import { showToast } from './modals.js'`
  - `src/game-engine.js`：移除从 `modals.js` 导入 `showToast`
  - `src/affection.js`：改为从 `core.js` 导入 `showToast`

---

### 3. `shouldTriggerSecretMission` 报错 `GS is not defined`

**现象：**
- 点击"重新生成"后控制台报错：
  ```
  ReferenceError: GS is not defined
      at shouldTriggerSecretMission (data.js:268:3)
  ```

**根因：**
- `shouldTriggerRandomEvent()` 和 `shouldTriggerSecretMission()` 原本定义在 `data.js` 中，但这两个函数内部依赖 `GS`（游戏状态对象）。
- `data.js` 是纯常量/数据模块，没有导入 `state.js` 的 `GS`。如果强行导入会造成循环依赖（`state.js` 已经导入了 `data.js`）。

**修复：**
- 将这两个函数从 `data.js` 迁移到 `utils.js`。
- `utils.js` 导入 `GS` 和所需的常量（`PHASES`、`RANDOM_EVENTS`、`SECRET_MISSIONS`、`MEMBERS`），不会形成循环依赖。
- 删除 `data.js` 中的函数定义。

---

### 4. `pickObserverGuest is not defined` / `getHeroineBehaviorText is not defined`

**现象：**
- AI 生成剧情时报错：`pickObserverGuest is not defined` 或 `getHeroineBehaviorText is not defined`。

**根因：**
- `src/prompts.js` 中调用了多个 `formatters.js` 的函数（`pickObserverGuest`、`getHeroineBehaviorText`、`getAddressRules`、`getMandatoryTask`、`getFormatReminder`），但没有从 `formatters.js` 导入。
- 代码从单文件拆分为多模块时，这些导入被遗漏。

**修复：**
- 在 `src/prompts.js` 补全导入：
  ```js
  import { pickObserverGuest, getHeroineBehaviorText, getAddressRules, getMandatoryTask, getFormatReminder } from './formatters.js';
  ```

---

### 5. X 档案中出现"烟灰缸"等禁烟内容

**现象：**
- X 档案（场外X的恋爱/分手故事）中出现了 "烟灰缸"、"半杯冷掉的咖啡" 旁有烟灰缸等描写。

**根因：**
- `validator.js` 的禁烟检测只在游戏运行时通过 `validateNarrative()` 触发，但 X 档案是在游戏初始化时通过 `x-archive.js` 生成的，**完全不经过 validator**。
- 更关键的是，X 档案生成的 prompt（`buildXArchiveMainPrompt`、`buildXArchiveMemberPrompt`）中**完全没有禁烟指令**。
- 另外，`validator.js` 的 `smokingPatterns` 正则列表中也不包含 "烟灰缸"、"打火机" 等抽烟相关物品。

**修复：**
1. 在 `src/x-archive.js` 的两个 prompt（女主X档案 + 场外X分手故事）的【严格禁止】区域添加：
   > 所有角色严格禁止抽烟（含电子烟、雪茄）。正文中不得出现任何与抽烟相关的描写、物品或暗示，包括但不限于：烟灰缸、打火机、烟味、点烟、吸烟、尼古丁等。
2. 在 `src/validator.js` 的 `smokingPatterns` 中补充：
   ```js
   /烟灰缸/, /烟蒂/, /烟盒/, /打火机/, /火柴.*点/, /点着.*烟/
   ```

---

## 错误类型速查表

| 现象 | 可能原因 | 排查方向 |
|---|---|---|
| "AI 生成失败" | `parseNarrative()` 内抛出异常 | 检查 parser.js 是否缺少函数导入 |
| 页面白屏 / 模块加载失败 | 循环依赖 | 检查新添加的 import 是否形成循环 |
| 存档丢失 | localStorage 被清理 / 存超出配额 | 检查 `QuotaExceededError` |
| 剧情不连贯 | 记忆压缩后上下文丢失 | 检查 `compressTodayForInjection()` |
| 选项不出现 | parser 未解析到选项 | 检查 AI 输出格式是否符合规范 |

---

## 如何查看运行时错误日志

从 2026-06-20 起，游戏内建了全局错误捕获，错误会自动保存到 `localStorage` 的 `svt_error_log` 中。

**在浏览器控制台查看：**
```js
// 查看所有捕获的错误
JSON.parse(localStorage.getItem('svt_error_log') || '[]')

// 导出为 JSON 文件
const blob = new Blob([localStorage.getItem('svt_error_log') || '[]'], {type: 'application/json'});
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'seventeen_errors.json';
a.click();
```

**清空错误日志：**
```js
localStorage.removeItem('svt_error_log');
```
