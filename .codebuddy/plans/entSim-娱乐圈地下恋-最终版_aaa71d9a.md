---
name: entSim-娱乐圈地下恋-最终版
overview: entSim重构为纯恋爱游戏+娱乐圈背景：好感度驱动8阶段、手动换天、曝光值事件触发、NPC精简4类、女团队友具象化、记忆AI提取、4Tab社交、快捷指令含探班、固定约会告白模板。
design:
  architecture:
    framework: html
  styleKeywords:
    - Glassmorphism
    - Dark Purple
    - Blur Backdrop
    - Pulse Animation
    - Three Column Dashboard
    - Heartbeat Animation
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 13px
      weight: 600
    subheading:
      size: 12px
      weight: 600
    body:
      size: 11px
      weight: 400
  colorSystem:
    primary:
      - "#7C6FF0"
      - "#9D8BFF"
    background:
      - "#1A1626"
      - "#221C33"
      - rgba(255,255,255,0.06)
    text:
      - "#F2EEFF"
      - rgba(242,238,255,0.6)
    functional:
      - "#5BD6A0"
      - "#FF8A8A"
      - "#FFD479"
todos:
  - id: engine-rebuild
    content: engine.js推翻Bug6条件时段(删shouldAdvance自动推进改为手动goEntSimNextDay)+删经营import(works/awards/collab/chapter/fan-service/tickCollabRomance)+advanceWorld清理(删progressWorks/tickCollabRomance/maybeNominateAwards/checkChapterAdvance保留rollDailyAgenda/dailyNpcRoll/tickPaparazzi删/generateDailyBuzz+加曝光衰减30%+NPC重置+记忆压缩)+applySideEffects删经营分支保留romanceBeat/opinionDelta改exposureEvent/npcEncounter/brother/secret+加applyEntSimAffection好感度结算跨阈值进阶+triggerHeartMoment。state.js补affection(0)/stage(0)/dailySummaries([])/eventLog([])/exposureAccum(0)/coverUsed(0)/heroineGroup(null)。romance.js扩展ROMANCE_DEPTH_LABELS 8阶段(20初遇/35相识/50好感/60暧昧/70心动/80追求/90交往/100陷入恋爱)+advanceStage好感度跨阈值+triggerHeartMoment+tryConfession改affection>=80
    status: completed
  - id: prompt-romance-focus
    content: prompts.js删经营段落(作品生命周期/合作/营业CP/周期相位/资源)+8阶段差异化写作指引+种子事件注入+小动作5%频率注入+韩文名禁令Bug2+choice注入上一段narrative前150字场景连续性Bug3+记忆注入(近7天标签+全部关键事件)+精简JSON格式(删workProgress/awardsNomination/collabProposal/fanServiceNote/chapterHint增affectionDelta)+约会模板prompt(地点池+AI400字+3选项)+告白模板prompt(私下+AI500字+3选项)。ent-sim/parser.js parseEntSimResponse正则提取兜底Bug8A+parseEntSimExtras删经营字段增affectionDelta。src/parser.js repairJson lastBrace depth检查Bug8B
    status: completed
    dependencies:
      - engine-rebuild
  - id: tab-content-memory
    content: engine.js新增sendEntSimChat(保留20条兜底)/generateEntSimMoment(失败不显示)/generateEntSimTheater(失败重试)/compressEntSimYesterday(AI提取3-5关键词存dailySummaries+关键事件存eventLog)。prompts.js新增chat/moment/theater message type(chat按人设回复/moment双方发+男主评论/theater 6种按1v1)。ui.js补进入下一天按钮(快捷指令区)+快捷指令区(拉回主线/随机事件/探班/走向结局/进入下一天)+好感度阶段标签显示(Header)+心动时刻样式(粉色边框心跳动画)+约会模板渲染+告白模板渲染+记忆Tab(时间线+标签云+关键事件)+Tab内容接线(切Tab不丢失剧情)。state.js增dailySummaries/eventLog/heroineGroup初始化+女团队友5人具象化生成
    status: completed
    dependencies:
      - prompt-romance-focus
  - id: cleanup-npc-opinion
    content: data.js删WORK_TYPES/AWARDS_POOL/COLLAB_TYPES/PR_ACTIONS/CYCLE_PHASES+NPC_TYPES精简4类(经纪人/站姐/情敌/哥哥)+行程池扩展地点标签+ROMANCE_DEPTH_LABELS 8阶段+约会地点池(私人影院/深夜江边/他家/车里/天台/地下停车场)+哥哥事件池5-8事件。npc-network.js删狗仔/媒体/前辈/品牌方/男主情敌NPC+initNpcNodes只4类+interactNpc事件触发每日1次Bug5。public-opinion.js删四维舆论(fan/media/professional/anti)+executePR+executePRDim+getOpinionForRadar+保留applyDiscoveryBlowback改为曝光值阶梯(>=5经纪人警告/>=10哥哥警告-5/>=15掉粉-10/>=25事业受挫-25+危机公关)。cycle.js删周期相位+行程池精简+rollDailyAgenda简化天数。src/state.js migrateSave兜底所有新字段(affection/stage/dailySummaries/eventLog/heroineGroup/exposureAccum/coverUsed/brotherEvents/chatHistory/moments/theaterHistory/dateCount/npcInteractionUsed)
    status: completed
    dependencies:
      - tab-content-memory
---

## 用户需求

将 entSim 从「经营模拟器」重构为「纯恋爱游戏+娱乐圈背景」。恋爱为主线，娱乐圈作为背景层。

### 核心机制

- 好感度系统(0-100)驱动8阶段恋爱深度(20初遇/35相识/50好感/60暧昧/70心动/80追求/90交往/100陷入恋爱)，只显示阶段标签不显示数字。AI返回affectionDelta±1-3驱动
- oneHeart式手动换天：玩家点「进入下一天」才换天，一天内无限操作。推翻已改的Bug6条件时段自动推进逻辑
- 约会好感>=30触发，固定模板(地点池+AI填充400字过程+3选项)，不能翘班尊重职业
- 心动时刻：暧昧→心动触发，300字沉浸式高光描写(粉色边框+心跳动画)，插入当前剧情前不消耗时段
- 告白：好感>=80后下一个/下下个剧情触发(非自动)，固定模板(私下场景+AI500字+3选项接受/拒绝/拖延)。拒绝扣30再拒扣60，除非女主追到换女主告白
- 好感100后甜蜜恋爱，10回合后出现进入大结局按钮

### 女主+女团

- 小糊团女团爱豆，19岁，自定义艺名，性格用1v1选择，追过EXO金珉锡
- 秘密：追过EXO/瞒哥去签售会/藏了男主或EXO周边
- 女团队友具象化5人setup生成(最疼你的大姐/总抢part/想退团/争门面/佛系)供AI客串

### 男主

- SEVENTEEN成员玩家自选，人设用现有
- 称呼演变：全名/你妹妹→全名/艺名→小X→宝宝/亲爱的
- 主动互动10%概率，单独弹窗→选择→注入下一段剧情，按好感阶段解锁
- 小动作5%频率从catchphrases/comforts派生
- 种子事件AI setup生成200字存档，在告白/吃醋/心动时刻回溯
- 吃醋：同台打歌/搭话要联系方式/赞助商潜规则感

### 社交系统(4Tab不推进时段)

- 聊天：按人设回复无引导，保留20条，兜底"日程中无法回复"
- 朋友圈：双方都发，男主评论按人设，失败不显示
- 剧场：6种(男主视角/情敌IF/婚后IF/校园IF/回忆录/哥哥视角)按1v1，失败重试
- 切Tab不丢失剧情

### 记忆系统

- AI提取关键词标签3-5个/天(要准不怕慢)
- 关键事件=影响恋爱深度/曝光/哥哥态度/情敌状态，全部累积不过期
- 近7天标签+全部关键事件注入prompt
- 玩家可查看记忆界面(时间线+标签云+关键事件列表)

### 娱乐圈背景

- 行程池(打歌/签售/画报/综艺/练习/Vlive/红毯)带地点标签影响见男主
- 去掉四维舆论+狗仔，改为曝光值事件触发
- 曝光值累加(被偷拍+3/同款+2/签售会+1)换天衰减30%
- 后果阶梯(>=5经纪人警告/>=10哥哥警告-5支持度/>=15掉粉-10/>=25事业受挫-25+危机公关)
- 5种掩护(假装不熟/借哥掩护/避嫌约会/营业掩护/公司掩护)累计3次起疑(热搜/冷藏/不能见面/哥哥责怪/影响团队)
- NPC精简4类(经纪人/站姐/情敌/哥哥)事件触发每日1次

### 哥哥+情敌

- 哥哥剧情驱动新建事件池5-8事件每回合15%注入不影响告白门槛
- 情敌递进按1v1(初遇→试探→冲突→退出祝福/上位)
- 情敌上位变男主=女主对男主好感<40+情敌倾向>=50+接受情敌告白

### 结局

- 走向结局按钮→单身跟哥哥/跟男主/情敌上位变男主，有隐藏结局

### UI/交互

- 按预览Glassmorphism暗紫，固定3选项，自由输入保留
- 快捷指令按1v1(拉回主线/随机事件/探班/走向结局/进入下一天)

### Bug修复

- Bug1 bindClass / Bug2 韩文名禁令 / Bug3 choice场景连续性 / Bug4+7 tryConfession好感>=80+confessionDone / Bug5 NPC每日1次 / Bug8 JSON正则提取+repairJson depth / Bug9 addPopularity reason

## Tech Stack

- 纯JavaScript(ES Modules)，复用现有entSim架构
- var+字符串拼接，不引入新依赖
- 同构实现：参考oneHeart逻辑结构但用entSim自己字段路径和引擎

## Implementation Approach

### 核心策略：推翻+清理+补齐+聚焦

entSim已有三栏布局+行程+NPC+热搜等基础设施，不新建模块：

1. 推翻：删Bug6自动时段→手动换天goEntSimNextDay
2. 清理：删经营模块(works/awards/collab/chapter/fan-service)+四维舆论+狗仔+周期相位
3. 补齐：好感度+8阶段+记忆系统+4Tab内容+快捷指令+探班+女团队友具象化+哥哥事件池
4. 聚焦：prompt删经营段落+恋爱8阶段指引+种子事件+场景连续性

### oneHeart参考模式（同构实现）

- 手动换天：goToNextDay()(game-engine.js)+btnNextDay按钮
- 好感度：applyOneHeartOptionAffection(game-engine.js)的affectionDelta解析逻辑
- 记忆压缩：compressOneHeartYesterday()(memory.js)的结构化摘要模式
- 探班：doVisitMember(game-engine.js)的行程条交互模式
- 快捷指令：自由推演/拉回主线/随机事件/走向结局

### 好感度驱动8阶段

- AI返回JSON增加affectionDelta字段，applySideEffects中applyEntSimAffection结算
- 跨阈值自动advanceStage+触发心动时刻(暧昧→心动)
- tryConfession改为affection>=80而非depth>=4

### 曝光值替代四维舆论

- 删publicOpinion四维(fan/media/professional/anti)+executePR
- 新增exposureAccum累加(事件触发)+衰减(换天30%)+后果阶梯
- applyDiscoveryBlowback保留但改为基于exposureAccum阶梯触发

### 记忆AI提取

- compressEntSimYesterday调AI提取关键词(3-5个/天)，存入dailySummaries
- 关键事件eventLog全部累积不过期
- buildEntSimContextSnapshot注入近7天标签+全部关键事件

## Implementation Notes

- 推翻Bug6后generateEntSimRound不再自动调advanceTimeSlot，goEntSimNextDay手动触发advanceWorld
- 好感度由AI返回affectionDelta驱动，applyEntSimAffection结算+跨阈值进阶
- 约会模板用固定结构约束AI(地点池+过程+3选项)，非自由发挥
- 告白模板同样固定结构，AI填充内容
- 记忆AI提取慢不怕但要准，换天时压缩不每回合调用
- 聊天/朋友圈/剧场各调1次API不推进时段
- 删经营import后advanceWorld仍需rollDailyAgenda(行程是恋爱背景)
- 精简JSON格式后parseEntSimExtras也需删对应字段解析增affectionDelta
- triggerEntSimEvent扩展已改(opts可选)，需export供Tab内容调用
- 女团队友5人具象化在initEntSimState生成，存入E.heroineGroup

## Architecture Design

entSim架构不变，修改集中在UI渲染层/Prompt层/引擎层：

用户操作→generateEntSimRound(type,extra)
↓
buildEntSimSystemPrompt()←注入记忆+8阶段指引+种子事件+小动作+韩文名禁令
buildEntSimUserMessage(type)←choice注入场景连续性+tab类型分发
↓
generateWithRetry()→parseEntSimResponse()←正则提取兜底(Bug8)
↓
applySideEffects()→applyEntSimAffection(跨阈值进阶+心动时刻)→不自动advanceTimeSlot
↓
GS._entSimCurrent→renderHtml()←按当前Tab渲染
↓
玩家点「进入下一天」→goEntSimNextDay()→advanceWorld()(新日程+热搜+记忆压缩+NPC重置+曝光衰减)

## Directory Structure

```
src/
├── parser.js [MODIFY] repairJson lastBrace加depth检查(Bug8B)
├── state.js [MODIFY] migrateSave兜底affection/stage/dailySummaries/eventLog/heroineGroup/brotherEvents等所有新字段
└── ent-sim/
    ├── engine.js [MODIFY] 推翻时段(删shouldAdvance)+删经营import/调用+好感度结算applyEntSimAffection+手动换天goEntSimNextDay+新增sendEntSimChat/generateEntSimMoment/generateEntSimTheater/compressEntSimYesterday+advanceWorld集成记忆压缩+曝光衰减+NPC重置
    ├── ui.js [MODIFY] 补好感度标签显示+进入下一天按钮+快捷指令区(拉回主线/随机事件/探班/走向结局/进入下一天)+心动时刻样式+约会模板渲染+告白模板渲染+记忆Tab+Tab内容接线
    ├── prompts.js [MODIFY] 删经营段落+8阶段差异化指引+种子事件+小动作+韩文名禁令Bug2+choice场景连续性Bug3+记忆注入近7天标签+关键事件+chat/moment/theater message type+约会模板prompt+告白模板prompt+精简JSON格式增affectionDelta
    ├── state.js [MODIFY] 补affection(0)/stage(0)/dailySummaries([])/eventLog([])/heroineGroup(null)/exposureAccum(0)/coverUsed(0)+ROMANCE_DEPTH_LABELS引用8阶段
    ├── romance.js [MODIFY] tryConfession改affection>=80+confessionDone+ROMANCE_DEPTH_LABELS扩展8阶段+advanceStage好感度跨阈值进阶+triggerHeartMoment(暧昧→心动)
    ├── parser.js [MODIFY] parseEntSimResponse正则提取兜底Bug8A+parseEntSimExtras删经营字段(workProgress/fanServiceNote/collabProposal/awardsNomination/chapterHint)增affectionDelta
    ├── npc-network.js [MODIFY] 删狗仔/媒体/前辈/品牌方/男主情敌NPC+interactNpc事件触发每日1次Bug5+精简initNpcNodes只4类
    ├── cycle.js [MODIFY] 删周期相位(蛰伏/发力/高光/回落)+行程池扩展地点标签+rollDailyAgenda简化为天数
    ├── data.js [MODIFY] 删WORK_TYPES/AWARDS_POOL/COLLAB_TYPES/PR_ACTIONS/CYCLE_PHASES+NPC_TYPES精简4类(经纪人/站姐/情敌/哥哥)+行程池扩展地点+ROMANCE_DEPTH_LABELS 8阶段+约会地点池+哥哥事件池
    └── public-opinion.js [MODIFY] 删四维舆论(fan/media/professional/anti)+executePR+executePRDim+保留applyDiscoveryBlowback改为曝光值阶梯+getOpinionForRadar删除或改为曝光值展示
```

## 设计风格

按 public/entSim-ui-preview.html 预览设计，采用暗色玻璃拟态(Glassmorphism)风格。三栏布局240px/1fr/280px，整体深紫色调。

### 三栏+底部Tab布局

**Header**：周期标签(渐变文字+脉冲，Day3·上午打歌待机室)+章节徽章+好感度阶段标签(可点击查看记忆)+mini-radar+设置

**左栏·事业背景**：作品卡片(进度点+在播警告)+今日日程(图标按钮+地点标签，done灰化)+资源等级

**中栏·剧情主线**：剧情正文(圆角卡片+热搜内嵌标签)+选项(紫色渐变+风险标签，固定3个)+自由输入框+快捷指令区(拉回主线/随机事件/探班/走向结局/进入下一天)

**右栏·舆论态势**：热搜列表(排名+火焰，me高亮脉冲)+粉丝讨论(三色气泡大粉/路人/黑粉)+媒体定调+雷达图(改为曝光值展示)+关系网(4NPC网格+亲密度+事件触发提示)

**底部**：恋爱深度条(8格渐变红→粉，显示阶段标签)+4Tab(剧情/聊天/朋友圈/剧场/记忆)

### Tab内容

- 聊天Tab：手机消息UI(气泡+正在输入动效)
- 朋友圈Tab：时间线动态+男主评论
- 剧场Tab：番外类型选择(按阶段解锁灰化)+内容展示
- 记忆Tab：时间线+关键词标签云+关键事件列表

### 特殊样式

- 心动时刻：粉色边框+心跳脉冲动画+AI生成300字，插入当前剧情前
- 男主主动互动弹窗：单独弹窗→选择→注入下一段剧情
- 约会模板：固定结构(场景标题+AI过程+3选项带affectionDelta+曝光风险)
- 告白模板：固定结构(私下场景+AI500字+3选项接受/拒绝/拖延)
- 风险预估弹窗：红色边框+曝光评分+确认/掩护/放弃

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 搜索entSim模块间import/export依赖链，确认engine.js删除经营模块import后无断裂引用，新增函数(goEntSimNextDay/applyEntSimAffection/sendEntSimChat/compressEntSimYesterday)的导入路径正确性，以及ui.js新增Tab渲染/快捷指令/模板函数与engine.js的调用关系无循环依赖
- Expected outcome: 验证修改后ui.js/engine.js/prompts.js/state.js/romance.js的引用关系无断裂无循环依赖，所有新增export函数能被正确import