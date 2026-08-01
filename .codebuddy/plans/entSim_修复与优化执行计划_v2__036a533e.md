---
name: entSim 修复与优化执行计划（v2）
overview: 基于审计讨论结果，对 entSim 进行集中修复：阶段锁/告白系统、约定时间处理、出道速通、池子接入、AI 记忆注入、字段一致性、哥哥/情敌状态机、结局扩展等。
design:
  architecture:
    framework: html
  styleKeywords:
    - Glassmorphism
    - Dark Purple
    - Soft Gradient
    - Micro-animation
    - Premium Game UI
  fontSystem:
    fontFamily: Noto Sans
    heading:
      size: 22px
      weight: 700
    subheading:
      size: 15px
      weight: 600
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#7c6ff0"
      - "#9ad0a0"
      - "#ff6b9d"
    background:
      - "#0f0c1c"
      - "#1a1630"
      - "#241e42"
    text:
      - "#ffffff"
      - "#d4d0e8"
      - "#9d8bff"
    functional:
      - "#52c41a"
      - "#faad14"
      - "#ff4d4f"
todos:
  - id: fix-stage-gates
    content: 修复阶段锁与校验：84 突破事件、validator、stageBanCard、亲密锁
    status: completed
  - id: parser-tolerance
    content: 增强 parser 容错：中文冒号、缺失 affectionDelta 默认 0、options 非数组降级
    status: completed
    dependencies:
      - fix-stage-gates
  - id: validator-feedback
    content: validator 具体化反馈：越级段落+改写示例，越级选项+建议写法
    status: completed
    dependencies:
      - fix-stage-gates
  - id: prompt-split
    content: 拆分 system/user prompt：静态规则进 system，动态状态进 user message
    status: completed
    dependencies:
      - fix-stage-gates
  - id: inject-memory
    content: 增强 AI 上下文：极简队友名单 / 约定 / 纪念日 / coverUsed / jealousLevel / flags / open loops
    status: completed
    dependencies:
      - fix-stage-gates
      - prompt-split
  - id: fix-schedule-career
    content: 修复日程与事业：速通出道、debutGameDay、_used* 移入存档、company-events 接入
    status: completed
  - id: balance-affection-cap
    content: 数值平衡：高光事件突破单日好感上限，心动时刻/生日/危机等不受日上限限制
    status: completed
    dependencies:
      - fix-stage-gates
  - id: balance-exposure-decay
    content: 数值平衡：曝光衰减加速 + 舆论余波 + 主动「避风头」操作
    status: completed
    dependencies:
      - fix-stage-gates
      - fix-schedule-career
  - id: balance-trainee-male-lead
    content: 数值平衡：练习生期男主出现概率 60%，其余给哥哥/练习室/公司事件
    status: completed
    dependencies:
      - fix-schedule-career
  - id: balance-subscriber-drop
    content: 数值平衡：粉丝订阅掉粉危机与压力事件，负面新闻/曝光反噬导致掉粉
    status: completed
    dependencies:
      - fix-stage-gates
      - merge-pools
  - id: fix-social-chat
    content: 修复社交与聊天：chat-ack 接入、情敌分层、哥哥立场、剧场解锁提示
    status: completed
    dependencies:
      - inject-memory
  - id: fix-ui-structure
    content: 修复 UI 与代码结构：appointments 面板、人气图、goEntSimNextDay 拆分、并发锁
    status: completed
    dependencies:
      - fix-stage-gates
      - fix-schedule-career
  - id: merge-pools
    content: 合并主题重复池子并新增空白期池，统一 weight 字段与加权抽取：jealousy-pool / dating-rumor-pool / daily-buzz-pool / hiatus-daily-pool / pickWeighted
    status: completed
    dependencies:
      - fix-stage-gates
      - fix-schedule-career
  - id: expand-trainee-pools
    content: 练习生池精选扩充：trainee-early / mid / late 各扩至 15-20 条并统一 cat/weight + 强 no-repeat
    status: completed
    dependencies:
      - fix-schedule-career
      - merge-pools
  - id: extend-endings-pools
    content: 扩展结局与池子：7+ 结局矩阵、public-opinion PR 逻辑、pools/index.js 补导
    status: completed
    dependencies:
      - fix-stage-gates
      - fix-social-chat
      - merge-pools
---

## 产品概述

ENTSIM(`src/ent-sim/`) 是《换乘恋爱 × SEVENTEEN》的「娱乐圈模拟器」子系统。玩家以练习生或女团爱豆身份，与一名 SEVENTEEN 成员展开慢热地下恋爱故事。本次任务基于前期全量代码审计结果，进入修复与优化执行阶段。

## 已确认设计决策

1. **84 好感度阶段锁**：采用 B 方案。达到 84 后需通过「确认关系 / 见家长 / 公开抉择」等特定事件突破，增强仪式感，而非直接数值累加。
2. **速通出道**：点击按钮直接跳过练习生期，进入出道 Day 1。
3. **约定系统**：记录绝对游戏天数 `targetDay`，UI 按当前天重算显示，仅到期约定注入 prompt。
4. **池子接入**：`company-events.js` 接入每日事件系统；`chat-ack/` 目录接入聊天回复系统。
5. **曝光与事业**：曝光档位提示注入 prompt；新增 `debutGameDay` 修正「出道第 N 天」时间轴；`_used*` 日程池移入存档或重置。
6. **AI 上下文增强**：女团队友信息极简注入 prompt（仅名字+一句话标签）；`coverUsed` / `jealousLevel` / `_romanceMilestones` / `flags` 等状态注入 prompt。
7. **阶段校验修正**：`validator.js` 与 `buildStageBanCard` 改用 `affectionStageIndex`，不再读取 `GS.oneHeartRomanceStage`。
8. **UI 字段统一**：约定面板统一读取 `E.appointments`，移除 `_aptCards`。
9. **代码结构**：拆分 `goEntSimNextDay`；修复 `_entSimInflight` 并发锁；修复人气走势图历史回填 bug。
10. **关系系统**：哥哥立场按 `support` 区间自动转换；情敌攻势按女主对男主好感度分层。
11. **结局与剧场**：结局扩展为 7+ 分支；社交剧场解锁提示优化。
12. **AI 记忆**：采用分层记忆 + 未解决悬念跟踪(`open loops`)。
13. **储存与 3-5 天记忆强化**：最近 3 天保留 800-1200 字剧情片段；新增结构化玩家选择日志、未解决悬念表、人物关系快照；压缩失败兜底改为关键词规则；localStorage 增加多备份机制。
14. **主题重复池子合并与空白期池**：将 `jealousy-events.js` 与 `romance-jealousy.js` 合并为 `jealousy-pool.js`；`dating-rumors.js` / `dating-scandal-chain.js` / `drama-dating-rumor.js` / `news-templates.js` 合并为 `dating-rumor-pool.js`；`daily-buzz.js` 与 `daily-buzz-templates.js` 合并为 `daily-buzz-pool.js`；扩展 `hiatus-daily-pool.js` 作为空白期专用池。统一条目结构 `{key, text, cat, require, weight, trigger, sideEffects}`，通过 `cat` 区分使用场景。
15. **池子加权抽取**：所有池子条目统一使用 `weight: 1-5` 字段，日常/低频/史诗事件差异化频率；`pools/_utils.js` 增加 `pickWeighted` 统一替代纯随机抽取。
16. **女团队友极简化处理**：队友仅保留名字与一句话性格标签，不建立大型互动剧情池，不主动触发队友专属事件；队友在剧情中作为背景存在，仅在需要掩护/撞见/团队行程等场景下由 AI 自然调用，避免队友线喧宾夺主。
17. **练习生池精选扩充**：`trainee-early.js` / `trainee-mid.js` / `trainee-late.js` 每个阶段扩至 15-20 条精选事件（总量 50-60 条），覆盖月末评价、淘汰危机、宿舍夜聊、第一次录音/录视频、被社长点名、出道组名单公布等关键节点；统一 `{key, text, loc, cat, require, weight}` 结构，`cat` 分为 `routine` / `evaluation` / `dorm` / `crisis` / `bonding` / `milestone`；重点加强 no-repeat 保护，避免 2+2+2 天练习生期内重复抽取。
18. **parser 容错增强**：`safeParseJson` 增加中文冒号兼容、缺失 `affectionDelta` 默认补 `0`、非数组 `options` 自动降级为字符串数组；确保 AI 输出不严格符合 JSON 时仍可解析，减少无效重试。
19. **validator 具体化反馈**：越级检测命中后返回「具体段落 + 改写示例」，而非仅列出禁止词；越级选项反馈给出原选项文案与建议改写方向，提升 AI 自纠效率。
20. **system/user prompt 拆分**：`buildSystemPrompt` 仅保留静态规则（世界观、成员设定、阶段禁忌、输出格式）；动态状态（当天日程、好感度、未解决悬念、约定、flags 等）全部移入 `buildUserMessage`，降低 system prompt 长度并减少关键规则被稀释。
21. **特殊事件突破好感日上限**：普通日常选择仍遵守阶段日上限；心动时刻、危机共患难、生日约会等标记为 `highMoment` 的事件可突破上限（最多一次突破 50%），防止节奏过慢。
22. **曝光衰减与避风头**：低调日曝光衰减从 30%/天提升为 `-2` 固定值或 `-40%` 向下取整；被拍到后 3 天内衰减减半（舆论余波）；新增主动「避风头」操作，消耗 1 天事业/约会机会，曝光 `-3` 并降低热度。
23. **练习生期男主出现概率 60%**：练习生期（前 6 天）男主出现在每日剧情中的概率降至 60%，其余 40% 分配给哥哥试探、练习室日常、公司事件、个人成长；出道后男主出现概率逐步提升到 80% 以上。队友日常保持极简化，不占用该 40% 份额。
24. **粉丝泡泡掉粉危机**：订阅数不再只涨不掉；曝光事件、负面新闻、绯闻发酵可导致掉粉；掉粉超过阈值触发「脱粉潮 / Anti 攻击」等剧情压力；可通过营业、公关、安静期缓慢回升。

## 核心修复目标

- 消除 84 阶段锁的体验死锁，补全突破事件系统。
- 统一 entSim 与 oneHeart 双系统混用的字段与阶段判断。
- 补全 AI 上下文注入，降低「失忆」与越级描写；**强化储存系统，确保 3-5 天内剧情不遗忘**。
- 修复日程跨局污染、时间轴错位、约定面板空白等结构性 bug。
- 合并主题重复池子，新增空白期专用池，降低 AI 抽到同质文本的概率。
- 统一池子加权抽取，控制日常/稀有/史诗事件频率。
- 扩展结局分支与社交剧场提示，提升长期可玩性。
- 提升 parser/validator 对 AI 非规范输出的容错与纠偏能力，降低重试成本。
- 拆分 system/user prompt，让静态规则与动态状态各司其职，提升 AI 遵循率。
- 调整好感/曝光/掉粉等数值手感：高光事件可突破单日好感上限，曝光衰减更有压迫感，粉丝订阅有掉粉危机。
- 练习生期降低男主强制出现频率，给哥哥、练习室日常、公司事件留出空间。

## Tech Stack Selection

- 语言 / 运行时：JavaScript（ES Modules），Node.js 18+
- 构建工具：Vite 5.4
- 状态管理：基于 `GS` 全局对象 + `localStorage` 持久化
- AI 接口：DeepSeek `deepseek-chat`
- 前端：Vanilla JS + 原生 DOM + CSS 变量主题

## Implementation Approach

本次修复按「先修数值门控与校验，再补 AI 记忆，再调结构 bug，最后扩展内容池」的顺序推进。原因如下：

1. **数值与阶段门控优先**：84 阶段锁、validator 读错字段、亲密阶段锁等直接影响每局核心体验，必须在 AI prompt 和内容扩展前定稿。
2. **AI 记忆与上下文注入次之**：队友信息、约定、纪念日、掩护、吃醋等字段注入 prompt 后，才能验证后续剧情是否稳定。
3. **结构与 UI 修复再次**：日程池跨局污染、时间轴、约定面板、人气走势图等 bug 不依赖新内容，可与记忆注入并行。
4. **池子合并与内容扩展最后**：先合并重复池子、接入 `company-events.js` / `chat-ack/`、新增 `hiatus-daily-pool.js`，再扩展 7+ 结局分支。内容扩充应建立在前三层稳定的基础上。

## Implementation Notes

- **向后兼容**：所有新增字段必须进入 `initEntSimState()`；旧存档读取时做 `typeof` 兜底，避免崩溃。
- **字段一致性**：男主 / 情敌 / 哥哥名字统一从 `E.romance.maleLead`、`E.npcNetwork.nodes.npc_suitor`、`GS.oneHeartRelationCharacter` 读取，禁止新增别名。
- **AI prompt 注入克制**：只注入对当前剧情有决策影响的状态，避免 prompt 过长稀释注意力。
- **队友信息极简注入**：女团队友只保留 `{name, role, tag}` 三字段，prompt 中仅以固定名单形式列出，不展开大段背景；队友出现与否交由 AI 自由调用，不通过事件池强制触发。
- **并发锁**：`_entSimInflight` 应使用 Promise 链或互斥标志，禁止二次调用覆盖。
- **人气走势图**：历史值必须记录每次 `addPopularity` 时的实际值，禁止用当前 popularity 回填。
- **3-5 天记忆强化**：最近 3 天保留 800-1200 字剧情片段；玩家选择、未解决悬念、人物关系快照独立持久化；压缩失败兜底改用关键词规则；每次存档自动备份最近 5 份到 localStorage。
- **池子条目规范**：合并后的池子统一使用 `{key, text, cat, require, weight, trigger, sideEffects}` 结构；`cat` 区分使用场景，`weight` 控制抽取频率，`trigger` 标明是给每日事件（`daily`）、场景灵感（`inspiration`）还是媒体标题（`media`）使用；所有抽取统一调用 `pickWeighted`，不再使用 `Math.random() * pool.length`。
- **练习生池规范**：练习生三阶段池统一使用 `{key, text, loc, cat, require, weight}` 结构；每阶段 15-20 条精选事件足以覆盖 2+2+2 天练习生期；`routine` 类日常条目高权重保证基础训练感，`evaluation`/`crisis`/`milestone` 类事件型条目中低权重制造记忆点；抽取时支持按 weight 加权 + 强 no-repeat 保护，避免短期重复。
- **parser 容错**：`safeParseJson` 预处理需兼容中文冒号、无引号键名、缺失字段；解析后默认 `affectionDelta=0`；`options` 字段异常时降级为字符串数组 `['继续']`。
- **validator 具体反馈**：检测禁止词时返回段落原文与改写示例；越级选项反馈包含选项文案与建议写法；所有 correction 文本控制在 200 字以内，避免污染 user message。
- **prompt 拆分**：`buildSystemPrompt` 禁止塞入每日动态状态；`buildUserMessage` 按场景组装「当前剧情摘要 + 状态快照 + 未解决悬念 + 当日日程 + 约定/纪念日/flags」；保持 system prompt 可缓存、user message 按需生成。
- **好感上限突破**：阶段锁的日上限仅限制普通选择；`highMoment` 事件（心动时刻、生日、危机共患难等）可单次突破上限，突破幅度不超过当前上限的 50%；突破后仍需阶段事件才能进入下一阶段。
- **曝光衰减规则**：低调日曝光 `decay = max(2, floor(current * 0.4))`；被拍到后 3 天内衰减减半；主动「避风头」消耗当日一次行动机会，曝光 `-3`、热度 `-5`。
- **练习生期男主概率**：`engine.js` 每日事件抽取时，练习生期按 60% 概率抽取男主相关事件，40% 抽取哥哥/练习室/公司/成长事件；该概率出道后每阶段 +10% 直至 90%。
- **粉丝泡泡掉粉**：订阅数 `subscribers` 在负面新闻、绯闻发酵、曝光反噬时下降；下降幅度按事件严重程度；掉粉达阶段阈值（如 10%/20%）触发压力事件；营业/公关/安静期可回升。

## Architecture Design

```
src/ent-sim/
├── engine.js          主循环；拆分 goEntSimNextDay 为子模块
├── state.js           初始化与取值；修正 debutGameDay / trainee 字段
├── romance.js         好感度 / 阶段锁 / 告白 / 掩护 / 亲密锁
├── brother.js         哥哥立场转换；情敌主动逻辑调度
├── validator.js       改用 affectionStageIndex 做越级检测
├── prompts.js         拆分 system/user；注入队友 / 约定 / 纪念日 / 掩护等动态上下文
├── memory.js          分层记忆 + open loops + 压缩兜底
├── parser.js          增强 safeParseJson 容错（中文冒号、缺失字段、options 降级）
├── validator.js       改用 affectionStageIndex 做越级检测；生成具体段落+改写示例反馈
├── cycle.js           日程生成；_used* 数组移入 GS.entSim
├── ui.js              约定面板 / 人气图 / 社交剧场提示
├── public-opinion.js  曝光档位提示文本；PR 逻辑绑定 prRemaining
├── endings.js         7+ 结局矩阵与权重计算
└── pools/
    ├── index.js       补导 company-events.js / chat-ack/
    ├── company-events.js  接入每日事件
    └── chat-ack/      接入聊天回复
```

数据流：

- 玩家操作 -> `engine.js` -> 更新 `GS.entSim` -> `prompts.js` 拆分构建 system（静态规则）+ user（动态状态）-> AI 生成 -> `parser.js` 容错解析 -> `validator.js` 越级检测并返回具体反馈 -> 副作用应用 -> UI 渲染 -> `localStorage` 存档。
- 校验失败时，correction 作为新的 user message 追加到同一会话上下文，最多重试 3 次。

## Directory Structure

```
d:/SEVENTEEN/src/ent-sim/
├── engine.js                 [MODIFY] 拆分 goEntSimNextDay；修复 _entSimInflight 锁；约会约定写 E.appointments；练习生期男主出现概率 60%
├── state.js                  [MODIFY] 初始化 debutGameDay / openLoops / usedPools / highMomentFlags / subscriberHistory；修正 fastForwardTrainee
├── romance.js                [MODIFY] 84 突破事件门控；统一阶段阈值；亲密阶段锁；告白与阶段对齐；高光事件突破单日好感上限
├── brother.js                [MODIFY] 哥哥立场按 support 区间转换；情敌攻势按女主好感分层
├── validator.js              [MODIFY] 阶段检测改用 affectionStageIndex(E.affection)
├── prompts.js                [MODIFY] 拆分 system/user；注入队友信息 / 约定 / 纪念日 / coverUsed / jealousLevel / flags
├── memory.js                 [MODIFY] 分层记忆摘要；open loops 跟踪；压缩失败规则兜底
├── parser.js                 [MODIFY] safeParseJson 增强：中文冒号、缺失 affectionDelta 默认 0、options 降级
├── validator.js              [MODIFY] 阶段检测改用 affectionStageIndex；越级反馈给出具体段落+改写示例
├── cycle.js                  [MODIFY] _used* 日程池移入 GS.entSim；四人行程去重与冲突检测
├── ui.js                     [MODIFY] 约定面板读 E.appointments；修复人气走势图；社交剧场解锁提示
├── public-opinion.js         [MODIFY] 曝光衰减规则（低调日/余波/避风头）；粉丝订阅掉粉与压力事件；PR 消耗 prRemaining 逻辑
├── endings.js                [MODIFY] 7+ 结局矩阵与判定
├── pools/index.js            [MODIFY] 更新导出：company-events / chat-ack / 合并后的 jealousy / dating-rumor / daily-buzz / hiatus pools
├── pools/company-events.js   [MODIFY] 接入 engine 每日事件抽取(已有池子，补接入逻辑)
├── pools/chat-ack/           [MODIFY] 已在 index.js 暴露 getChatAckByChannel，需在 engine chat 路径调用
├── pools/jealousy-pool.js    [NEW] 合并 jealousy-events + romance-jealousy，按 daily/inspiration 双场景复用
├── pools/dating-rumor-pool.js [NEW] 合并 dating-rumors + dating-scandal-chain + drama-dating-rumor + news-templates
├── pools/daily-buzz-pool.js  [NEW] 合并 daily-buzz + daily-buzz-templates，按 tone 加权
├── pools/hiatus-daily-pool.js [NEW/EXPAND] 空白期专用剧情池：routine / anxiety / bonding / sideHustle / fan / romance / growth
├── pools/trainee-early.js    [MODIFY] 扩至 15-20 条精选，新增 evaluation / dorm / crisis / milestone 类条目
├── pools/trainee-mid.js      [MODIFY] 扩至 15-20 条精选，新增月末评价 / 淘汰危机 / 第一次录音等
├── pools/trainee-late.js     [MODIFY] 扩至 15-20 条精选，新增出道组名单公布 / 最终考核等
├── pools/_utils.js           [MODIFY] 新增 pickWeighted 加权抽取与 dedupByKey 去重工具
└── data.js                   [MODIFY] 补充突破事件 / 结局权重 / 哥哥立场区间的常量定义
```

## Key Code Structures

```javascript
// 阶段锁与突破事件配置
export var AFFECTION_STAGE_GATES = [
  { stage: 0, max: 19, label: '初遇' },
  { stage: 1, max: 49, label: '相识' },
  { stage: 2, max: 69, label: '暧昧' },
  { stage: 3, max: 84, label: '心动', breakEvent: 'relationship_confirmation' },
  { stage: 4, max: 100, label: '陷入恋爱' }
];

// 约定结构
export var AppointmentShape = {
  with: 'maleLead',
  place: '',
  summary: '',
  targetDay: 0,
  done: false
};

// 未解决悬念
export var OpenLoopShape = {
  id: '',
  type: 'appointment|crisis|rival|brother',
  text: '',
  targetDay: 0,
  resolved: false
};

// 最近剧情片段（3-5 天记忆强化）
export var RecentNarrativeShape = {
  day: 0,
  text: '', // 当天关键剧情 800-1200 字
  full: false // false=片段，true=完整
};

// 玩家选择日志
export var ChoiceLogShape = {
  day: 0,
  round: 0,
  choice: '',
  consequence: '',
  tags: []
};

// 人物关系快照
export var RelationshipSnapshotShape = {
  day: 0,
  maleLead: '',
  rival: '',
  brother: '',
  summary: ''
};

// 女团队友极简信息（仅名字+定位+一句话标签）
export var TeammateShape = {
  name: '',
  role: '',
  tag: ''
};
// prompt 注入格式示例：
// 【队友名单】林叙真（队长·主唱，最疼你的大姐）；姜宥琳（主舞，舞台疯子）；宋恩菲（副唱，最近想退团）；裴多率（领舞，综艺担当）；尹夏荣（忙内line，佛系维他命）。

// 练习生池条目规范
export var TraineePoolEntryShape = {
  key: '',
  text: '',
  loc: '',
  cat: 'routine|evaluation|dorm|crisis|bonding|milestone',
  require: '',
  weight: 1
};

// 合并后池子条目规范
export var PoolEntryShape = {
  key: '',
  text: '',
  cat: 'maleLead|rival|evidence|escalation|crisis|hotSearch|fanDiscussion|mediaTitle|routine|...',
  require: '',
  weight: 1,
  trigger: 'daily|inspiration|media',
  sideEffects: {}
};

// 加权抽取工具
export function pickWeighted(pool, rng) {
  if (!pool || !pool.length) return null;
  var total = 0;
  for (var i = 0; i < pool.length; i++) total += (pool[i].weight || 1);
  var r = (rng || Math.random)() * total;
  var sum = 0;
  for (var j = 0; j < pool.length; j++) {
    sum += (pool[j].weight || 1);
    if (r <= sum) return pool[j];
  }
  return pool[pool.length - 1];
}

// parser 容错后处理
export var ParsedOutputShape = {
  narrative: '',
  options: [], // 异常时至少 ['继续']
  affectionDelta: 0, // 缺失默认 0
  stage: 0,
  flags: {},
  dailyBuzz: '',
  careerChanges: {}
};

// validator 反馈结构
export var ValidationFeedbackShape = {
  ok: false,
  violations: [
    {
      type: 'forbidden_word|forbidden_option|format_error',
      stage: 0,
      keyword: '',
      snippet: '', // 原文段落或选项文案
      suggestion: '' // 改写示例
    }
  ],
  correctionPrompt: '' // 可直接追加到 user message 的 200 字以内纠偏文本
};

// 数值平衡常量
export var BALANCE_CONSTANTS = {
  affectionDailyCaps: [5, 7, 9, 11, 13],
  highMomentBreakLimit: 0.5, // 单日上限最多突破 50%
  exposureDecay: { lowKeyFloor: 2, lowKeyRate: 0.4, caughtPenaltyDays: 3, hideOutDelta: -3 },
  traineeMaleLeadChance: 0.6,
  debutMaleLeadChance: 0.9,
  subscriberDropThresholds: [0.1, 0.2] // 掉粉 10%/20% 触发压力事件
};
```

## 设计风格

本次 UI 改动属于「在现有 entSim 暗紫色游戏界面基础上的增强」，不推翻整体风格，只提升仪式感与信息可读性。设计语言保持暗色玻璃拟态(Glassmorphism)、柔和渐变、圆角卡片、微光动效，与现有 `style.css` 的 CSS 变量体系兼容。

## 页面 / 组件改动

### 1. 心动时刻仪式感

当好感度跨越 50 -> 60 触发心动时刻时，在剧情区上方插入全屏淡入遮罩：

- 中心显示成员立绘(或 emoji 头像) + 阶段名「心动」
- 下方 300 字高光文案以打字机效果呈现
- 3.5 秒后自动收起，剧情继续
- 同时永久记入 `_romanceMilestones` 并在记忆面板可回顾

### 2. 约定面板

右栏「约定」区域改为可点击卡片：

- 每个约定显示：摘要、地点、倒计时(如「明天 / 3 天后」)
- 到期约定高亮边框 + 发光
- 点击可触发「赴约」剧情，生成对应场景
- 未到期约定显示灰色锁定，防止误点

### 3. 人气走势图

点击顶部人气条弹出的日志面板内：

- 走势图使用真实历史人气值绘制折线，不再用当前值回填
- 关键节点(出道 / 获奖 / 曝光反噬)用图标标记
- 下方折叠列表显示每日变动原因

### 4. 社交剧场解锁提示

底部「剧场」按钮旁增加小锁/解锁图标：

- 未解锁类型显示所需好感度
- 首次解锁时弹出轻量提示卡片
- 已解锁类型显示彩色徽标

### 5. 84 突破事件弹窗

当好感达到 84 并触发突破事件时，弹出选择面板：

- 标题：「关系的关键转折点」
- 选项：确认关系 / 暂时维持现状 / 公开抉择
- 选择后写入 flags 并解锁下一阶段

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 对 `src/ent-sim/` 进行多文件联合扫描，验证字段引用、池子导出、状态注入点、函数调用链，并定位具体行号与修复位置。
- Expected outcome: 产出带文件路径和行号的结构化检查清单，用于核对每个修复点是否到位。