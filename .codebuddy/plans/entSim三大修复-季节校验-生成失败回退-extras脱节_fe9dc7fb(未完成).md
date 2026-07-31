---
name: entSim三大修复-季节校验-生成失败回退-extras脱节
overview: 修复 entSim 模式的四个问题：①季节/节日与月份矛盾；②AI生成失败后 roundTotal 不回退导致空洞轮；③AI 将剧情塞进 extras 但 narrative 正文不显示；④人气按钮点击区域太小（18px×60px），包进外层容器放大可点击区。
todos:
  - id: fix-season-ban
    content: 在 prompts.js buildStageBanCard 和 injectPoolInspirations 反向禁制中追加月份/季节矛盾禁制（初雪、白色情人节等跨季节词汇）
    status: pending
  - id: fix-validator-season
    content: 在 validator.js validateEntSimNarrative 三联扫描中追加季节月份矛盾词正则检测
    status: pending
    dependencies:
      - fix-season-ban
  - id: fix-roundtotal-rollback
    content: 在 engine.js generateEntSimRound 的 .catch 块中回退被前置递增的 roundTotal 和 timeOfDay
    status: pending
  - id: fix-extras-narrative-consistency
    content: 在 validator.js 中新增 narrative-extras 一致性校验，检测 extras 声明的关键实体是否在叙事正文中出现
    status: pending
  - id: fix-pop-btn-click-area
    content: 在 ui.js 和 style.css 中将人气按钮重构为包裹容器，扩大点击区域至整块文字+进度条
    status: pending
---

## 产品概述

修复娱乐圈模拟器（entSim）模式下四个从存档分析中暴露的落地问题，提升200轮长期运行的稳定性。

## 问题与修复

### 问题1：季节/月份/节日越界

当前season=autumn、gameMonth=11（11月秋天），AI却产出"白色情人节泡泡"（3月14日）和"初雪场景"（冬季）。System prompt第151行已有粗粒度约束，但AI不遵守。buildStageBanCard只有雾天气禁制，未按月份禁用矛盾节日词。

**修复**：在buildStageBanCard和injectPoolInspirations反向禁制中加季节/月份动态校验，validator.js三联扫描加月份矛盾词正则，双层防护。

### 问题2：生成失败产生空洞轮

Day97 round6生成失败后，careerHistory零条目，但roundTotal在前置代码（continueEntSimMain:798）已+1，失败后未回退，导致空洞轮积累。

**修复**：在generateEntSimRound的.catch块中回退已增加的roundTotal和timeOfDay。

### 问题3：extras事件记录与narrative正文脱节

careerHistory记录了完整故事（哥哥看膏药→经纪人送膏药→其实是哥买的），但玩家在narrative正文中只看到"哥哥路过看了一眼"。AI学会了绕过禁制卡——不在正文写越级内容，转而在extras中塞入事件记录。

**修复**：在validator.js中新增narrative-extras一致性校验——extras中声明的关键实体如果在narrative正文中不存在，裁剪extras条目或降级为warning。

### 问题4：人气按钮点击区域太小

当前es-pop为`<span id="es-pop-btn">`，CSS `font-size:12px; padding:3px 9px`，点击区约18px高。后面的es-pop-bar进度条是独立div无事件绑定，鼠标稍偏就点到进度条或好感数字上。

**修复**：将#es-pop-btn和.es-pop-bar包在外层div容器中，事件绑定移至容器。新容器CSS确保最小44px高度（触控友好标准），文字和进度条整块可点。

## 技术栈

- 语言：JavaScript (ES Modules)，使用 `var` 声明
- 修改范围：`src/ent-sim/prompts.js`、`src/validator.js`、`src/ent-sim/engine.js`、`src/ent-sim/ui.js`、`src/style.css`

## 实现方案

### Bug1：季节月份越界校验（双层防护）

**第1层：prompt预注入**

在`buildStageBanCard`（prompts.js:318-360）中读取当前月份和季节，动态生成季节矛盾禁制，追加到bans数组：

| 条件 | 禁制 |
| --- | --- |
| gameMonth 不在12-2（非冬季） | 禁止"初雪""雪花""积雪""第一场雪" |
| gameMonth 不是3 | 禁止"白色情人节" |
| season=autumn 且 gameMonth=11 | 禁止"初雪""圣诞""Pepero Day" |
| season=spring | 禁止"冬天""供暖""暖气""深秋""落叶" |
| season=summer | 禁止"冬天""供暖""樱花""落叶" |


同时在`injectPoolInspirations`（prompts.js:364-445）的反向禁制中也追加同样的规则，确保两层注入都包含月份约束。

**第2层：后生成校验**

在`validateEntSimNarrative`（validator.js:165-176）的三联扫描中追加月份矛盾正则检测，如命中则返回error级correction，触发AI重试。

### Bug2：生成失败轮次回退

`continueEntSimMain:798`在调用`generateEntSimRound`之前执行了`roundTotal++`和`timeOfDay`更新。生成失败时需在`.catch`块（engine.js:147-152）中回退。

实现逻辑：

1. 在调用`generateEntSimRound`时传入`extra.timeSlot`标记区分普通调用和主线推进
2. 在`.catch`中判断：若`extra.timeSlot !== undefined`且`E.cycle.timeOfDay > 0`，则回退`timeOfDay--`和`roundTotal--`
3. fallback对象保持`failed: true`标记，供UI识别"重试"按钮

注意：`genCount`在game-engine.js:3026的成功路径中才递增，不受失败影响，无需处理。

### Bug3：extras与narrative一致性校验

在`validateEntSimNarrative`的现有三联扫描结尾（`return corrections`前）追加校验：

1. 从`extras.brother.note`和`extras.romanceBeat.event`中提取关键实体词（"送""给""递""买""药店""膏药""经纪人"等）
2. 检查这些词是否在narrative正文中出现
3. 如果extras声明了具体行动但narrative未体现：

- 将brother.note裁剪为通用文本（与数值门控对齐）
- romanceBeat.event涉及越级行为且narrative未体现时降级为warning

4. 不触发重试（避免无限循环），但标记供`applySideEffects`裁剪使用

### Bug4：人气按钮点击区域扩大

修改两个文件：

**ui.js（行225-226 + 行866）**：

- 渲染：将独立的`<span id="es-pop-btn">`和`<div class="es-pop-bar">`包在`<div id="es-pop-wrap" class="es-pop-wrap">`中
- 事件绑定：`bindId('es-pop-btn', onPopLog)` 改为 `bindId('es-pop-wrap', onPopLog)`
- `.es-pop`上的`style="cursor:pointer"`移除，交外层容器控制

**style.css**：

- 新增`.es-pop-wrap`样式：flex列布局、padding:6px 10px、min-height:44px、cursor:pointer、圆角12px、hover高亮
- 嵌套重设内部`.es-pop`去掉独立的padding/border/background，由外层统一管理
- `.es-pop-bar`去掉min-width，由外层容器撑宽

## 目录结构

```
src/
├── ent-sim/
│   ├── prompts.js    # [MODIFY] buildStageBanCard追加月份禁制、injectPoolInspirations反向禁制追加月份规则
│   ├── engine.js     # [MODIFY] .catch块中回退roundTotal/timeOfDay
│   └── ui.js         # [MODIFY] 人气按钮渲染+事件绑定重构为包裹容器
├── validator.js      # [MODIFY] 三联扫描追加季节矛盾正则 + narrative-extras一致性校验
└── style.css         # [MODIFY] 新增.es-pop-wrap样式、嵌套重设内部元素样式
```

## 关键实现细节

### prompts.js buildStageBanCard 追加

在现有bans收集之后、return之前，读取`gameMonthOf(E.cycle.dayCount || 1)`动态判断月份，按条件表追加季节矛盾禁制到bans数组。同时从`GS.season`读取当前季节辅助判断。

### engine.js .catch 回退

```javascript
.catch(function(err) {
  showToast('生成失败：' + (err && err.message ? err.message : '未知错误'));
  var E = GS.entSim;
  if (extra && extra.timeSlot !== undefined && E.cycle.timeOfDay > 0) {
    E.cycle.timeOfDay--;
    E.cycle.roundTotal = Math.max(0, (E.cycle.roundTotal || 1) - 1);
  }
  var fb = { narrative: '（剧情生成失败，请点击选项重试）', options: ['重试'], extras: {}, type: type, failed: true };
  GS._entSimCurrent = fb;
  return fb;
})
```

### validator.js narrative-extras一致性校验

- 提取`_note`中的动作关键词与narrative正文做包含性检查
- 如extras有实体动作但narrative无对应描述，添加warning级correction（不触发重试）
- 标记以供后续applySideEffects裁剪

### ui.js 人气按钮重构

```javascript
// 行225-226 替换为：
'<div class="es-pop-wrap" id="es-pop-wrap" title="点击查看人气变动日志">' +
  '<span class="es-pop">人气 <b>' + popularity() + '</b> <i style="font-style:normal;color:#9D8BFF">(' + careerLevel() + ')</i></span>' +
  '<div class="es-pop-bar"><span style="width:' + Math.min(100, popularity()) + '%;background:linear-gradient(90deg,#7c6ff0,#9ad0a0)"></span></div>' +
'</div>' +
```

### style.css es-pop-wrap

```css
.es-pop-wrap {
  display: flex; flex-direction: column; align-items: stretch;
  padding: 6px 10px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--es-card-border); background: var(--es-soft);
  min-width: 70px; min-height: 44px; justify-content: center;
  transition: .15s;
}
.es-pop-wrap:hover { background: var(--es-soft-hover); border-color: var(--es-primary); }
.es-pop-wrap .es-pop { padding: 0; border: none; background: none; }
.es-pop-wrap .es-pop-bar { margin-top: 3px; min-width: auto; }
```