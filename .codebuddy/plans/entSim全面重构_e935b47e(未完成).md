---
name: entSim全面重构
overview: 整合全部讨论共识：节奏修复+Bug修复+天数显示+池子强引导+主线节点系统+人气×恋爱耦合+12个新增池子+现有池子加门控扩充+聊天快捷指令重做+结局改玩家主动+validator跑偏检测。目标：AI不乱写、主线不跑偏、人气影响恋爱体验、开放结局。
todos:
  - id: fix-rhythm-bugs-display
    content: 修复节奏死锁+5个Bug+天数显示：romance.js单日上限/阶段门控/告白60；prompts.js stage0放宽/AI规则/池子4→2；engine.js联络/快照/泡泡/代言/传参/buffer；state.js timer/快照/章节跳跃跨3年/careerHistory上限；brother.js事件率降40%/男主主动/情敌标记；ui.js代言/星圈/粉丝去重；12个push点day→_gameDayCount+ui.js读取点+migrateSave
    status: pending
  - id: pool-gating-cleanup
    content: 池子门控与清理：_utils.js加mainline=和pop条件解析；13个池子加mainline门控；8个池子加pop门控；6个世界设定池接入setup；删除3旧文件+pools/index.js移除export
    status: pending
  - id: new-pools-all
    content: 创建12个新池子：mainline-beats(22节点)/insecurity(30)/fame-pressure(30)/family-encounter(40)/junior-industry(30)/mainline-anchor-text(32)/career-milestone(40)/rival-psychology(25)/fan-reactions(40)/male-lead-perspective(30)/time-skip-transition(30)/ending-prelude(15)；pools/index.js新增12个export
    status: pending
    dependencies:
      - pool-gating-cleanup
  - id: mainline-validator
    content: 主线节点系统+AI约束：prompts.js池子强引导文案+骨架注入+buildMainlineAnchor；state.js新增E.mainline字段；新建validator.js禁忌词/越级选项/异常delta检测；engine.js接入validator重试+mainline节点推进逻辑
    status: pending
    dependencies:
      - new-pools-all
  - id: chat-rebuild
    content: 重做聊天快捷指令：ui.js sendQuickChat改预设-回复绑定对象+新建统一getChatPresets+预设去重；chat-modal.js话题引导用池子替换硬编码；chat-male-lead.js频道结构对齐{q,r}格式
    status: pending
  - id: endings-popularity
    content: 结局重写+人气耦合：engine.js:928 enterEntSimEnding改仅提示不强制；endings.js pickEnding加人气档位维度(糊团/二线/上升/顶流×恋爱状态=16种)；engine.js handleEntSimChoice情敌告白选择检测
    status: pending
    dependencies:
      - fix-rhythm-bugs-display
  - id: pool-expansion
    content: 扩充现有池子+412条：行业事件C+73(cheer/health/year-end/hiatus/mv/toxic)；聊天G+142(chat-stage/chat-ack每成员)；主线恋爱A+92(dating-scandal/rival-advance/drama-almost)；事业B+60(milestone-debut/variety-moment/job-grade)；突发E+16/人物F+15/氛围H+14
    status: pending
    dependencies:
      - pool-gating-cleanup
---

## 产品概述

娱乐圈模拟器（entSim）是《换乘恋爱 x SEVENTEEN》项目中的1v1娱乐圈恋爱模拟模式。玩家扮演女团爱豆/练习生，以"哥哥妹妹+同行业后辈"双重身份接触天团男主，在娱乐圈背景下展开地下恋故事，同时经营事业。游戏参考明星志愿系列，以3年现实时间为主线跨度。

## 核心问题

- 好感度增长死锁（三重数值锁+stage0禁制+AI规则矛盾），男主长期背景板
- 5个已知Bug（跨天结算/泡泡回复/男主被动/代言按钮/星圈截断）
- AI剧情跑偏（池子是软素材，AI自由发挥编剧情，无主线锚定）
- 人气与恋爱割裂（人气只是数值目标，不影响恋爱体验）
- 聊天快捷指令失效（预设-回复脱节，精确匹配失败回退"嗯。"）
- 结局自动触发（好感到100就强制结束，玩家无法继续）
- 人气日志显示真实日历日而非游戏天数
- 13个池子缺主线门控+8个缺人气门控+6个世界设定池未接入setup

## 核心功能

- 修复好感度节奏死锁，让恋爱推进有感
- 修复5个已知Bug+buffer+参数失效
- 人气日志/图表显示游戏天数(Day 1,2,3...)，顶部保留年月日
- 池子强引导（软素材→核心事件必须围绕）+主线节点系统（22节点骨架，AI必须围绕写）+主线进度锚定+validator跑偏检测
- 人气×恋爱耦合：低人气自卑不安全感/高人气忙碌曝光，男主始终天团，家属身份日常遇见
- 结局改玩家主动触发，矩阵=好感×人气档位×曝光×告白×哥哥立场
- 聊天快捷指令重做：预设-回复绑定，动态预设，话题引导用池子
- 12个新增池子（22节点+342条）+现有池子加门控+扩充412条+6个世界设定池接入setup
- 章节跳跃加大跨3年现实日历

## 技术栈

- 语言/运行时：JavaScript (ES Modules)，Node.js 18+，遵循现有 `var` + 字符串拼接风格
- 构建工具：Vite 5.4
- AI API：DeepSeek (deepseek-chat)
- 无新依赖，所有修改为参数/条件调整 + prompt文本编辑 + 池子内容创作 + 新建JS模块

## 实现方案

### 模块1：节奏与Bug修复+天数显示

**romance.js**：dailyCaps `[3,4,5,6,7]`→`[5,7,9,11,13]`；checkRomanceUnlock 阶段门控放宽（stage1移除tPhase/stage2-4保留debut降低阈值/移除chapter门控）；告白门槛80→60

**prompts.js**：stage0禁制放宽为允许微小互动（短暂对视/帮拿东西/一句关心）；AI好感规则改为"男主在场且有微小互动时可返回+1"；告白文本80→60；池子注入 `Math.min(4,tmp.length)`→`Math.min(2,tmp.length)`

**engine.js**：联络门控 `isDebutPopup`→`E.affection>=10`；联络概率0.25→0.45；timer `(2+randInt(0,2))`→`(1+randInt(0,1))`；跨天快照修复（行357用_lastPopSnapshot读取/行758后更新）；泡泡解析正则容错 `split(/=+FAN_REPLIES=+|={3,}/)`；代言门槛20→15；传_affReason第二参数；buffer 6000→10000/slice(-6000)

**state.js**：_maleContactTimer初始 `8+randInt(0,10)`→`2+randInt(0,3)`；_lastPopSnapshot初始化；CHAPTER_TIME_SKIP加大跨3年（`{2:60,3:120,4:180,5:200,6:170}`≈730天≈2年出道期，加练习生阶段跳跃约365天=3年总计）；careerHistory上限200

**brother.js**：事件触发率统一降40%（女团15/好感18/随机12/队友15/哥哥8）；男主主动概率10→25；情敌告白标记 `_entSimRivalConfessing=true`

**ui.js**：代言dismiss补rerender()；星圈smartTruncate分句截断+7天过滤；粉丝去重删_entSimFanReactions

**天数显示**：12个careerHistory push点 `day:E.cycle.dayCount`→`day:E.cycle._gameDayCount`；ui.js:274 buildRecentActivities today→_gameDayCount；ui.js:1330 drawPopChart curDay→_gameDayCount；header(220/370)不改保留formatGameDate；migrateSave清空旧careerHistory标记_gdayV2

### 模块2：池子门控+清理

**_utils.js** `_checkSingle`：增加 `mainline=节点ID` 条件解析（检查 `E.mainline.completed` 数组含该节点）+ `pop<N`/`pop>=N` 条件解析

**13个池子加mainline门控**：encounter-ml(部分)、drama-almost(`ml_heart_seed`)、romance-confession(`ml_almost_confess`)、secret-comms/nearmiss/fan-clues/company-warning(`ml_together`)、drama-dating-rumor/dating-scandal-chain/dating-rumors(`ml_together`)、dispatch-news(`ml_together&&pop>=30`)、rival-advance-events(`rv_approach`)

**8个池子加pop门控**：brand-offers(`pop>=15`)、concert(`pop>=60`)、magazine(`pop>=40`)、job-offers(`pop>=15`)、variety-shows(`pop>=25`)、fansign(`pop>=15`)、career-setbacks(`pop>=30`)、sasaeng(`pop>=40`)

**6个世界设定池接入setup**：company-names/group-concepts/group-names/hit-songs/sister-roles/teammate-names → 在setup流程中用这些池子随机生成公司名/团概念/团名/出圈歌/姐姐角色/队友名

**删除3旧文件**：ent-schedule.js/trainee-chat.js/trainee-events.js（pools/index.js移除export）

### 模块3：12个新增池子

| 新池子 | 条目 | 结构 |
| --- | --- | --- |
| mainline-beats.js | 22节点 | {id,line,title,require,requires[],skeleton{hook,coreEvent,twist,ending},optionTypes[3],ban[],stateChange,next} |
| insecurity-pool.js | 30条 | {text,require:'pop<20'} 低人气自卑事件 |
| fame-pressure-pool.js | 30条 | {text,require:'pop>=50'} 高人气忙碌/曝光 |
| family-encounter-pool.js | 40条 | {text} 家属身份日常遇见 |
| junior-industry-pool.js | 30条 | {text} 后辈同业日常 |
| mainline-anchor-text.js | 32条 | 22节点方向描述+10阶段禁忌清单 |
| career-milestone-scenes.js | 40条 | 出道/一位/颁奖/演唱会各10条剧情骨架 |
| rival-psychology.js | 25条 | 情敌内心独白/暗暗较劲 |
| fan-reactions-pool.js | 40条 | 低/中/高人气+曝光后各10条 |
| male-lead-perspective.js | 30条 | 男主内心活动/独白 |
| time-skip-transition.js | 30条 | 章节跳跃过渡叙述 |
| ending-prelude.js | 15条 | 结局前置事件 |


### 模块4：主线节点系统+AI约束

**prompts.js**：池子注入标题→"【本场核心事件·强引导】必须围绕展开，可丰富细节但不得替换主线/发明新冲突"；pendingEvent→"【本回合必须围绕展开的核心事件】"；新增骨架注入（按当前stage从mainline-beats抽1条注入"【本场剧情骨架·必须遵循】"）；新增buildMainlineAnchor(E)注入"当前主线进度+方向+动态禁忌"

**validator.js**（新建）：检测narrative含禁忌词（按阶段，stage0出现"告白/接吻/同居"）；检测options越级（好感<15出现"牵手"）；检测affectionDelta异常（stage0返回+5）；返回corrections让AI重写

**engine.js**：生成流程接入validator（generateWithRetry后parse前校验，correction反馈重试）；mainline节点推进逻辑（好感达阈值+前置节点完成→标记completed→注入下一节点骨架）

### 模块5：聊天快捷指令重做

**ui.js**：sendQuickChat改预设-回复绑定（参数从msg字符串改为{label,reply}对象，直接用reply回复，不再findChatPoolReply）；新建统一getChatPresets(channel)按频道×阶段×好感从池子筛选返回[{label,reply}]；预设去重（Set记录已用key）

**chat-modal.js**：💡话题引导按钮改为从getMaleLeadPresetsForChat取预设，替换硬编码topics；按好感阶段解锁不同类型预设

**频道结构统一**：CHAT_BROTHER/CHAT_RIVAL 的条目结构对齐为 {q, r[]} 格式（统一 msg→q, reply/replies→r）

### 模块6：结局系统重写+人气耦合

**engine.js:926** enterEntSimEnding：移除自动触发条件（好感≥100+距甜度峰值≥10轮），改为仅返回提示"可以走向大结局了"（不强制），结局唯一入口为玩家主动点按钮

**endings.js** pickEnding：增加人气档位作为主要维度（非仅careerOutcome后缀）。低人气(pop<20)的恋爱成功=温馨小HE（彼此依靠）；高人气(pop>80)的恋爱成功=双丰收大HE（公开婚礼）；糊团+恋爱失败=BE（自卑放手）；顶流+恋爱失败=BE（曝光塌房）。约16种结局（4人气档×4恋爱状态）

**engine.js handleEntSimChoice**：情敌告白选择检测（_entSimRivalConfessing===true且choiceText匹配接受→设rivalConfessionAccepted）

**brother.js**：情敌告白事件设_entSimRivalConfessing标记（ev.flag==='rivalConfession'时）

### 模块7：现有池子扩充+412条

- C.行业事件+73条：cheer-culture(17→30)、health-injury(15→30)、year-end-review(10→25)、hiatus-anxiety(10→25)、mv-filming(10→25)、toxic-fan-war(20→30)
- G.聊天+142条：chat-stage每成员12→20条、chat-ack每成员15→20条
- A.主线恋爱+92条：dating-scandal-chain(10→30)、rival-advance(24→40)、drama-almost(27→35)
- B.事业工作+60条：milestone-debut(10→25)、variety-moment(14→30)、job-grade(12→25)
- E.突发+16条：secret-discovery(19→35)
- F.人物+15条：teammate-bond(20→35)
- H.氛围+14条：daily-detail(26→40)

## 实现要点

- 保持 `var` + 字符串拼接风格，不引入 `let/const`/模板字符串
- 跨天快照修复需同步修改engine.js两处（读取357+更新758后）和state.js初始化
- 阶段锁放宽后旧存档可能突然解锁新阶段——预期行为（改善体验），无需迁移
- 章节跳跃加大后dayCount跨度增大但不补人气（让人气自然停留在玩家达到的档位）
- mainline节点系统需在state.js新增 `E.mainline = { completed: [], currentNode: '' }` 字段
- validator检测到跑偏时correction反馈注入重试（复用现有重试机制）
- 12个新池子内容创作工作量约2-3万字，分批完成
- 现有池子扩充+412条约1.5万字，分批完成
- 聊天频道结构统一需注意旧存档兼容（CHAT_BROTHER旧格式msg/reply需fallback解析）

## 修改文件清单

```
src/ent-sim/
├── romance.js              # [MODIFY] 单日上限+阶段门控+告白门槛
├── prompts.js              # [MODIFY] stage0+AI规则+池子强引导+骨架注入+锚定
├── engine.js               # [MODIFY] 联络+快照+泡泡+代言+传参+buffer+情敌检测+validator接入+结局改主动+mainline推进
├── state.js                # [MODIFY] timer+快照+章节跳跃跨3年+careerHistory上限+mainline字段+天数迁移
├── brother.js              # [MODIFY] 事件率降40%+男主主动+情敌标记
├── endings.js              # [MODIFY] 人气档位维度+16种结局
├── ui.js                   # [MODIFY] 天数显示+代言+星圈+粉丝+聊天快捷指令重做+getChatPresets
├── validator.js            # [NEW] 跑偏检测
├── pools/index.js          # [MODIFY] 移除3旧export+新增12池export
├── pools/_utils.js         # [MODIFY] 加mainline=和pop条件解析
├── pools/mainline-beats.js # [NEW] 22节点骨架
├── pools/insecurity-pool.js # [NEW] 30条低人气自卑
├── pools/fame-pressure-pool.js # [NEW] 30条高人气压力
├── pools/family-encounter-pool.js # [NEW] 40条家属日常
├── pools/junior-industry-pool.js # [NEW] 30条后辈同业
├── pools/mainline-anchor-text.js # [NEW] 32条锚定文本
├── pools/career-milestone-scenes.js # [NEW] 40条事业里程碑
├── pools/rival-psychology.js # [NEW] 25条情敌心理
├── pools/fan-reactions-pool.js # [NEW] 40条粉丝反应
├── pools/male-lead-perspective.js # [NEW] 30条男主视角
├── pools/time-skip-transition.js # [NEW] 30条跳跃过渡
├── pools/ending-prelude.js # [NEW] 15条结局前置
├── modals/chat-modal.js    # [MODIFY] 话题引导用池子
├── pools/chat-stage/index.js # [MODIFY] getMaleLeadPresetsForChat统一
├── pools/chat-male-lead.js # [MODIFY] 频道结构对齐
├── pools/cheer-culture.js  # [MODIFY] 扩充17→30
├── pools/health-injury.js  # [MODIFY] 扩充15→30
├── pools/year-end-review.js # [MODIFY] 扩充10→25
├── pools/hiatus-anxiety.js # [MODIFY] 扩充10→25
├── pools/mv-filming.js     # [MODIFY] 扩充10→25
├── pools/toxic-fan-war.js  # [MODIFY] 扩充20→30
├── pools/dating-scandal-chain.js # [MODIFY] 扩充10→30
├── pools/rival-advance-events.js # [MODIFY] 扩充24→40
├── pools/drama-almost.js   # [MODIFY] 扩充27→35
├── pools/milestone-debut.js # [MODIFY] 扩充10→25
├── pools/variety-moment.js # [MODIFY] 扩充14→30
├── pools/job-grade.js      # [MODIFY] 扩充12→25
├── pools/secret-discovery-events.js # [MODIFY] 扩充19→35
├── pools/teammate-bond.js  # [MODIFY] 扩充20→35
├── pools/daily-detail.js   # [MODIFY] 扩充26→40
├── pools/chat-stage/*.js   # [MODIFY] 每成员扩充12→20条
├── pools/chat-ack/*.js     # [MODIFY] 每成员扩充15→20条
└── (6个世界设定池接入setup: company-names/group-concepts/group-names/hit-songs/sister-roles/teammate-names)
```