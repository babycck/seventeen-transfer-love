---
name: entSim-8项修复-泡泡+练习生+出道仪式+剧情多样性
overview: 修复发泡泡无反应、缩短练习生期、男主动作过多"打游戏"、增加出道仪式感、练习生剧情池扩展、男主交互选项注入、快进5天改为速通出道+确认等8项问题
todos:
  - id: fix-bubble
    content: 修复发泡泡无反应：ui.js去掉练习生拦截，改为允许打开页面显示空状态提示
    status: pending
  - id: shorten-trainee
    content: 缩短练习生天数：traineePhaseOf阈值改为3/4/2~3；出道触发降至1~2天
    status: pending
  - id: expand-pools
    content: 扩充练习生池：trainee-early/mid从30条扩至50条，late扩至45条
    status: pending
  - id: filter-mannerisms
    content: 过滤mannerisms中"打游戏"等日常词；降低触发频率至7~10回合
    status: pending
  - id: fix-subscribers
    content: 粉丝数同步：出道后每次换天根据popularity更新bubble.subscribers
    status: pending
  - id: speed-debut
    content: 快进5天改为速通出道：加确认弹窗，确认后直接跳到出道触发
    status: pending
  - id: debut-ceremony
    content: 新增出道仪式：全屏粉色渐变overlay+团名/队友/出道曲展示+3秒动画
    status: pending
  - id: male-lead-options
    content: 男主选项注入规则：练习生阶段男主出场时至少1个选项与他相关
    status: pending
  - id: build-push
    content: 编译验证并推送
    status: pending
    dependencies:
      - fix-bubble
      - shorten-trainee
      - expand-pools
      - filter-mannerisms
      - fix-subscribers
      - speed-debut
      - debut-ceremony
      - male-lead-options
---

## 问题概述

用户存档分析发现8项体验问题，需要逐一修复。

## 修复清单

### 1. 发泡泡无反应

练习生阶段点击泡泡被 `ui.js:1699` 拦截，`showToast('出道后才解锁泡泡功能')` 并 return。改为练习生也可打开泡泡页面，但显示空界面+「出道后解锁」提示，避免点击无反应。

### 2. 练习生期太长 + 男主互动太少

现状 13 天（前期4天+中期6天+后期3天），缩为前期3天+中期4天+后期2~3天（共9~10天）。男主出场时选项至少1个与他相关。

### 3. 剧情重复

练习生三阶段池各30条，TRAINEE_POOL 50条，每日同一场景反复写。扩充各池到40~50条 + 确保B3日常插曲池被正确注入。

### 4. 男主"打游戏"过多

`mannerisms` 中"打游戏"每5~8回合触发一次，system prompt 反复强调。过滤 mannerisms 生成时排除此类行为，降低触发频率至7~10回合。

### 5. 粉丝数不增长

`bubble.subscribers` 初始780但出道后不随 popularity 更新。出道后每次换天同步：`subscribers = max(100, popularity * 15 + randInt(0,50))`。

### 6. 快进5天改为速通出道

「⚡快进5天」→「🎀速通出道」，点击弹确认框，确认后直接跳出道：设 `traineeDayCount` 到后期触发阈值 + `debutDay` 置位 + 触发出道事件。

### 7. 出道无仪式感

当前出道仅 toast。加强为全屏 overlay：粉色渐变背景 + 团名/团设展示 + 队友列表 + 出道曲预告 + 3秒动画后淡出。

### 8. 男主选项注入

练习生阶段 prompt 中加规则：若男主出场，3个选项中至少1个与男主相关（温和互动，不越界A6限制）。

## 技术方案

### 修改文件清单（8个文件）

| 文件 | 操作 | 内容 |
| --- | --- | --- |
| `src/ent-sim/ui.js` | 修改 | 泡泡拦截改为允许打开+空状态提示；快进5天改为速通出道+确认弹窗；新增出道仪式 overlay 函数 |
| `src/ent-sim/engine.js` | 修改 | 练习生天数阈值调整；出道触发时设置 `_entSimStageUpPending`；bubble.subscribers 同步 |
| `src/ent-sim/prompts.js` | 修改 | 练习生阶段男主选项注入规则；mannerisms 注入频率调整（5-8→7-10） |
| `src/ent-sim/state.js` | 修改 | `buildMannerisms` 过滤"打游戏"等日常行为词；bubble.subscribers 初始化公式 |
| `src/ent-sim/cycle.js` | 修改 | `traineePhaseOf` 阈值：1-3→前期，4-7→中期，8+→后期；日程池切换 |
| `src/ent-sim/pools/trainee-early.js` | 修改 | 30条→50条 |
| `src/ent-sim/pools/trainee-mid.js` | 修改 | 30条→50条 |
| `src/ent-sim/pools/trainee-late.js` | 修改 | 30条→45条 |


### 各问题详细方案

**1. 泡泡解锁（ui.js:1695-1700）**

修改前：

```js
if (app === 'bubble' && !isD) { showToast('出道后才解锁泡泡功能'); return; }
```

修改后：去掉 return，允许打开泡泡页面但渲染空状态：

```js
if (!isD) isBubbleLocked = true; // 渲染时显示"出道后解锁"
```

**2. 练习生天数缩短（state.js traineePhaseOf + cycle.js 阈值）**

修改 `traineePhaseOf`：

```js
if (dayCount <= 3) return 1;   // 前期 3天
if (dayCount <= 7) return 2;   // 中期 4天
return 3;                        // 后期 2~3天后出道
```

出道触发阈值从 `>= 2 + randInt(0,2)` 改为 `>= 1 + randInt(0,1)`（1~2天）。

**3. 练习生池扩充（pools/trainee-*.js）**

每个池追加15~20条新条目。条目方向：

- 前期加：第一次见前辈、迷路找人、食堂偶遇、基础发声练习、形体课、自我介绍练习、室友互动、选课烦恼
- 中期加：合作舞台排练、前辈指导、小型内部演出、团队默契游戏、编舞创意课、音乐制作旁听
- 后期加：出道曲录音、MV概念讨论、造型试装、出道前夜失眠、最终名单公布、告别练习生身份

**4. mannerisms 过滤（state.js buildMannerisms）**

在 `buildMannerisms` 中追加黑名单过滤：

```js
var banWords = ['打游戏', '游戏', '睡觉', '吃零食', '刷手机'];
// 过滤：candidates = candidates.filter(function(w) { return banWords.every(...) });
```

同时 prompts.js 中 mannerisms 注入频率从"每5-8回合"改为"每7-10回合"。

**5. 粉丝数同步（engine.js goEntSimNextDay）**

在 `goEntSimNextDay` 出道检测后追加：

```js
if (E.career.debutDay > 0 && E.bubble) {
  var baseSub = 100 + (E.career.popularity || 0) * 15;
  E.bubble.subscribers = Math.max(100, baseSub + randInt(0, 50));
}
```

**6. 速通出道（ui.js fastForwardTrainee）**

```js
// 旧：fastForwardTrainee() → dayCount+5
// 新：
showConfirmModal('确定要速通出道吗？练习生阶段将直接结束。')
  .then(function(ok) {
    if (!ok) return;
    E.career._traineeDayCount = 10; // 直接进后期足量
    E.career._debutTriggerDay = 3;  // 立刻触发
    goEntSimNextDay(); // 出道检测
  });
```

按钮文案从 `⚡快进5天` 改为 `🎀速通出道`。

**7. 出道仪式（ui.js showDebutCeremony）**

新增函数，在 `_entSimStageUpPending.type === 'debut'` 时触发：

- 全屏粉色渐变 overlay
- 依次显示：团名 HORIZON → 所属社 Konnect → 概念 City Pop Retro → 队友名列表 → 出道曲名 → 粉丝名 VOYAGERS
- 3秒动画后淡出
- engine.js 出道触发时设置 `GS._entSimStageUpPending = { type: 'debut', ... }`

**8. 男主选项注入（prompts.js buildEntSimUserMessage）**

在 C区指令中追加（练习生+男主出场时）：

```
【选项规则·练习生阶段】若本段剧情中男主有出场（哪怕是路过/背景），
你必须确保3个选项中至少有1个与男主相关。互动必须是温和、符合前后辈关系的：
如「和哥哥一起找他吃饭」「在走廊偷看他一眼」「让哥哥帮忙带句话」等。
禁止越界互动（独处/肢体接触/暧昧暗示）。
```