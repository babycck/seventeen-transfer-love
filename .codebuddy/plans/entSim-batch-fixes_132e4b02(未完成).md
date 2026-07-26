---
name: entSim-batch-fixes
overview: 合并娱乐模拟器全部待修项：5项存档审查修复（章节标签/聊天过滤/情敌名字/秘密去重/开局标记）+ 删除直播间刷礼物秘密（4处删除+1处prompt加强），共10步修改涉及约10个文件。
todos:
  - id: fix-chapter-label
    content: 修复章节标签：CHAPTERS新增练习生(0)，练习生startChapter改为0，state.js索引调整，checkChapterAdvance debutDay条件改为target>=1
    status: pending
  - id: fix-chat-stage-filter
    content: 修复聊天阶段过滤：initChatChannel增加debutDay
    status: pending
---

## 产品概述

对娱乐模拟器（entSim）模块进行7项修复：包括章节标签修正、聊天阶段适配、情敌名字显示、秘密去重增强、开局标记修正、删除直播间刷礼物秘密条目、以及prompt约束强化。共涉及9个文件。

## 核心修复项

### 修复1：章节标签错位

练习生职业（debutDay=0，人气12）当前startChapter=1映射到CHAPTERS[0]="新人期"，手册规定应为"练习生"。将startChapter改为0，CHAPTERS数组新增第0项"练习生"，跨章逻辑同步调整。

### 修复2：聊天内容不分阶段

练习生打开KakaoTalk时，情敌频道首条消息"今天打歌我看了"、经纪人频道首条"明天打歌预录"，均为已出道场景内容。initChatChannel在练习生阶段需过滤含"打歌/预录/回归/直拍/一位/舞台"等关键词的消息。

### 修复3：情敌名字不显示

联系人列表中情敌永远显示"情敌"二字，因为E.rival字段从未赋值。改用suitorName()函数从npcNetwork.nodes['npc_suitor'].name获取真实名字。

### 修复4：秘密重复生成

6个同一秘密变体，仅提取前4中文字符作为去重key不够鲁棒。增加核心词辅助指纹（EXO/金珉锡/签售/同人文/直拍/小卡等），双指纹任一命中即判重复。

### 修复5：entSim开局标记未置位

队友妹妹设定下GS._relCharIntroduced和_rivalIntroduced未在initEntSimState中置true，导致后续prompt注入"第一次介绍哥哥"旧逻辑。

### 修复6：删除4处直播间刷礼物秘密

删除secret-discovery-events.js的secret_live_gift、ui-renderer.js _secPool中的SEVENTEEN直播间刷礼物、ent-sim/state.js defaultSecrets()中的男主直播间刷礼物、special-events.js的secret_rival条目。确保秘密全部围绕EXO（签售会/周边/同人文/直拍）。

### 修复7：prompt强化EXO限定

在prompts.js中显式禁止AI生成涉及SEVENTEEN成员直播间的秘密，所有秘密严格限定EXO（金珉锡/签售/周边/直拍/同人文）。

## 技术方案

### 修复1：章节标签（data.js + state.js）

**data.js修改：**

- CHAPTERS数组新增index:0条目：`{ index: 0, name: '练习生', icon: '🌱', desc: '尚未出道的练习生，暗恋前辈不敢声张，出道是唯一目标' }`
- 练习生职业startChapter从1改为0

**state.js修改：**

- `initEntSimState`第89行：`CHAPTERS[career.startChapter - 1]` 改为 `CHAPTERS[career.startChapter]`
- `chapterNameOf(idx)`第235行：`CHAPTERS[idx - 1]` 改为 `CHAPTERS[idx]`，默认值改为`'练习生'`
- `chapterIconOf(idx)`第238行：同理改为`CHAPTERS[idx]`，默认值`'🌱'`
- `checkChapterAdvance`第262行：debutDay触发条件从`target >= 2`改为`target >= 1`（由练习生→新人期即触发debutDay设置）
- `chapterByPopularity`无需修改——人气12无法触发阈值跨越

### 修复2：聊天阶段过滤（ui.js initChatChannel）

在initChatChannel第2382行`pool.slice(0,2)`之后，对rival和manager频道增加debutDay门控：

```js
var debutDay = (E.career && E.career.debutDay) || 0;
if (debutDay <= 0 && (ch === 'rival' || ch === 'manager')) {
  var filterKeywords = ['打歌','音银','回归','预录','直拍','一位','音源','宣发','舞台','待机室','电台','综艺','回归期','颁奖'];
  init = [];
  for (var i = 0; i < pool.length && init.length < 2; i++) {
    var m = pool[i];
    var txt = (m.msg || '') + (m.reply || '');
    var blocked = false;
    for (var k = 0; k < filterKeywords.length; k++) {
      if (txt.indexOf(filterKeywords[k]) >= 0) { blocked = true; break; }
    }
    if (!blocked) init.push(m);
  }
  if (!init.length) init = pool.slice(0, 2); // 兜底
}
```

### 修复3：情敌名字（ui.js 第1484行）

将`(E.rival && E.rival.name) || '情敌'`替换为`suitorName()`。该函数已定义在第95行：`function suitorName() { var n = GS.entSim.npcNetwork.nodes['npc_suitor']; return (n && n.name) ? n.name : '团员'; }`

### 修复4：秘密去重（engine.js applySecretEffect）

在第224-236行现有逻辑基础上，增加核心词辅助指纹：

- 定义核心词数组：`['EXO','金珉锡','签售','同人文','直拍','小卡','周边','应援','粉丝','专辑','海报','photo card']`
- 对s.item和已有E.secret.items分别提取匹配的核心词组合作为第二key
- 任一指纹（前4中文key或核心词组合key）匹配即判重复

### 修复5：开局标记（state.js initEntSimState）

在`E.started = false;`（第119行）之后增加：

```js
if (career.sisterSetting) {
  GS._relCharIntroduced = true;
  GS._rivalIntroduced = true;
}
```

与ui-renderer.js中1v1模式的第1321-1323行逻辑保持一致。

### 修复6：删除刷礼物秘密（4个文件）

每条均为数组中删除一个元素，纯数据层改动，不改任何函数逻辑：

- `secret-discovery-events.js`：删除`secret_live_gift`（保留3条EXO向）
- `ui-renderer.js`：删除_secPool中SEVENTEEN直播间条目（保留5条）
- `ent-sim/state.js`：删除defaultSecrets()中男主直播间条目（保留4条）
- `special-events.js`：删除secret_rival（保留其他secret_*条目）

### 修复7：prompt强化（prompts.js 第1139行）

注入描述从`都是EXO追星向的小秘密`改为：

```
都是EXO追星向的小秘密（严格限定：EXO成员金珉锡的签售会/周边小卡/直拍/同人文/专辑海报，纯属可爱反差，不是黑料）。禁止涉及SEVENTEEN成员、任何男团直播间刷礼物、或泛化到非EXO团体的追星行为。
```

### 验证方案

- 全部修改后用 `node -c` 逐个语法检查
- 确认defaultSecrets()删除后池子仍≥2条（randInt(0, copy.length-1)不越界）
- 确认_secPool删除后仍有5条，randInt(2,3)切片不受影响
- CHAPTERS[0]="练习生"后chapterNameOf(0)不再fallback到"新人期"