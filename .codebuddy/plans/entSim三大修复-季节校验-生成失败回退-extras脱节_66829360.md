---
name: entSim三大修复-季节校验-生成失败回退-extras脱节
overview: 修复 entSim 模式的六个问题：①季节/节日与月份矛盾+GS.gameMonth/season 未随 dayCount 更新；②AI生成失败后 roundTotal 不回退；③AI 将剧情塞进 extras 但 narrative 正文不显示；④人气按钮点击区域太小；⑤GS.gameMonth/season 静态值不随 dayCount 实时更新导致 prompt 注入错误月份；⑥手机 Kakao 聊天首次进入 maleLead 频道无初始消息/无快捷回复。
todos:
  - id: fix-season-sync
    content: 在 engine.js 的 goEntSimNextDay 和 continueEntSimMain 中，dayCount变更后同步 GS.gameMonth 和 GS.season
    status: completed
  - id: fix-season-ban
    content: 在 prompts.js buildStageBanCard 和 injectPoolInspirations 反向禁制中追加月份/季节矛盾禁制
    status: completed
    dependencies:
      - fix-season-sync
  - id: fix-validator-season
    content: 在 validator.js validateEntSimNarrative 三联扫描中追加季节月份矛盾词正则检测
    status: completed
    dependencies:
      - fix-season-ban
  - id: fix-roundtotal-rollback
    content: 在 engine.js generateEntSimRound 的 .catch 块中回退被前置递增的 roundTotal 和 timeOfDay
    status: completed
  - id: fix-extras-narrative-consistency
    content: 在 validator.js 中新增 narrative-extras 一致性校验，检测 extras 声明的关键实体是否在叙事正文中出现
    status: completed
  - id: fix-pop-btn-click-area
    content: 在 ui.js 和 style.css 中将人气按钮重构为包裹容器，扩大点击区域至整块文字+进度条
    status: completed
  - id: fix-chat-init
    content: 在 ui.js renderPhoneChatMsgs 中 hist 为空时自动调用 initChatChannel 兜底初始化聊天频道
    status: completed
---

## 产品概述

修复娱乐圈模拟器（entSim）模式下六个从存档分析中暴露的落地问题，提升200轮长期运行的稳定性。

## 核心问题与修复

### 问题1：GS.gameMonth/season不更新导致季节矛盾

GS.gameMonth=11、GS.season=autumn（静态旧值），dayCount=103推算为4月/spring。AI读到错误值产出"初雪""白色情人节""新年/跨年"。
**修复**：(a)每轮从dayCount动态同步gameMonth/season到GS；(b)prompts追加月份矛盾禁制；(c)validator追加季节矛盾正则。

### 问题2：生成失败空洞轮

round6生成失败后roundTotal未回退，空洞积累。
**修复**：engine.js .catch中回退roundTotal/timeOfDay。

### 问题3：extras与narrative脱节

careerHistory记录"哥哥买膏药给经纪人送来"，narrative只有"哥哥看了一眼"。
**修复**：validator.js narrative-extras一致性校验。

### 问题4：人气按钮点击区太小

.es-pop仅18px高，后面进度条独立无事件。
**修复**：包入外层容器整块可点，min-height 44px。

### 问题5：Kakao男主聊天未初始化

_entSimChatInited=true但_entSimChatHistory.maleLead不存在，进入聊天显示"暂无消息"无快捷回复。
**修复**：renderPhoneChatMsgs中hist空时兜底调initChatChannel。

## 技术栈

- 语言：JavaScript (ES Modules)，使用 var 声明
- 修改范围：src/ent-sim/prompts.js、src/validator.js、src/ent-sim/engine.js、src/ent-sim/ui.js、src/style.css

## 实现方案

### Bug1a：GS.gameMonth/season每轮同步

在 engine.js 主线推进函数（goEntSimNextDay 和 continueEntSimMain）中，dayCount 变化后立即同步：

```javascript
GS.gameMonth = gameMonthOf(E.cycle.dayCount);
GS.season = gameSeasonOf(E.cycle.dayCount);
```

导入 gameMonthOf/gameSeasonOf（已定义于 state.js:268-276）。

### Bug1b：prompt月份禁制

buildStageBanCard 和 injectPoolInspirations 中按 gameMonth/season 动态追加禁制规则：

| 条件 | 禁制词 |
| --- | --- |
| gameMonth 不在12-2 | 初雪/雪花/积雪/第一场雪 |
| gameMonth 不是3 | 白色情人节 |
| gameMonth=11 且 season=autumn | 初雪/圣诞/Pepero Day |
| season=spring | 冬天/供暖/暖气/深秋/落叶 |
| season=summer | 冬天/供暖/樱花/落叶 |


### Bug1c：validator季节矛盾正则

validateEntSimNarrative 三联扫描追加月份矛盾正则检测，命中返回 error correction 触发重试。

### Bug2：roundTotal回退

engine.js:147-152 .catch块中，extra.timeSlot !== undefined 时回退 timeOfDay--/roundTotal--，fallback保持 failed:true。

### Bug3：narrative-extras一致性

validator.js中提取extras关键动作词与narrative做包含性检查，缺失则warning级correction（不重试），标记供applySideEffects裁剪。

### Bug4：人气按钮包裹容器

ui.js 行225-226：包装为 div#es-pop-wrap；行866：bindId改为es-pop-wrap。style.css：新增.es-pop-wrap（min-height:44px; cursor:pointer），嵌套重置内部样式。

### Bug5：聊天兜底初始化

ui.js renderPhoneChatMsgs（约1869行）：hist.length===0时除显示"暂无消息"外，检查GS._entSimChatInited，若对应频道无历史则调用 initChatChannel(ch) 兜底初始化后再渲染。

## 目录结构

```
src/
├── ent-sim/
│   ├── engine.js     # [MODIFY] dayCount变更时同步gameMonth/season + .catch回退roundTotal
│   ├── prompts.js    # [MODIFY] buildStageBanCard追加月份禁制 + injectPoolInspirations追加月份规则
│   └── ui.js         # [MODIFY] 人气按钮重构 + renderPhoneChatMsgs聊天兜底初始化
├── validator.js      # [MODIFY] 季节矛盾正则 + narrative-extras一致性校验
└── style.css         # [MODIFY] .es-pop-wrap新样式
```