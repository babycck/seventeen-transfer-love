import { STORAGE_KEY, SAVE_SIZE_WARN, MISSION_CARDS } from './data.js';
import { clearStoryCache } from './story-cache.js';
import { showConfirmModal } from './modals/confirm-modal.js';
import { buildEntSimHeroineGroup, buildEntSimGroupMeta } from './data.js';

// ==================== 游戏状态 ====================
export var GS = null;

export function setGS(newGS) {
  if (GS === null) {
    GS = newGS;
  } else {
    Object.assign(GS, newGS);
  }
}

export function defaultGameState() {
  return {
    version: 'v22',
    gameMode: 'transfer',
    oneHeartMember: '',
    worldSetting: '',
    writingStyle: '',
    chatHistory: [],
    moments: [],
    theaterHistory: [],
    oneHeartCustomWorld: '',
    oneHeartMainLine: '',
    diaryEntries: [],
    oneHeartDiaryCounter: 0,
    oneHeartMomentCounter: 0,
    oneHeartArchivedNarratives: [],
    oneHeartGenCount: 0,
    oneHeartLastCompressedIdx: 0,
    oneHeartLastDayStartIdx: 0, // 昨日剧情在 todayFullText 的起点索引（用于生成昨日事件摘要）
    oneHeartYesterdaySummary: '', // 昨日事件摘要（新的一天时注入 prompt，防止角色失忆）
    oneHeartEventLog: [], // 1v1 事件条目（每篇剧情生成时 AI 顺带提取，替代旧 dailySummaries 批量压缩）
    oneHeartDailySummaries: [], // 1v1 每日结构化摘要（新一天时压缩昨日全文，注入最近3天）
    oneHeartRelationCharacter: { name: '', role: '', gender: '', memberId: '', personality: '', behaviorLogic: '', interactionStyle: '', birthYear: 0, isRival: false },
    oneHeartRival: { name: '', memberId: '', personality: '', behaviorLogic: '', interactionStyle: '', loveStyle: '' },
    oneHeartStartYear: 2025,
    oneHeartPendingEvent: null,
    oneHeartEventPool: [],
    oneHeartJealousyPool: [],
    oneHeartSurprisePool: [],
    oneHeartRivalPool: [],
    oneHeartCelebrityPool: [],
    oneHeartScandalPool: [], // 媒体风波事件缓存池（仅模板缓存，非曝光计数）
    oneHeartScandalCount: 0, // IMP-18：玩家实际经历的公众曝光翻车次数（scandal 事件入队时 +1）
    exposureRisk: 0, // 曝光风险值（0~100，娱乐圈·队友的妹妹：公开约会/翘班/深夜见面等行为累加；>=60 触发绯闻事件并与哥哥 protective 立场联动）
    oneHeartSickPool: [],
    oneHeartExJealousPool: [],
    oneHeartLateNightPool: [],
    oneHeartRandomUsed: [], // IMP-05：随机事件用去重环形缓冲（存最近抽过的 id）
    oneHeartPoolUsed: [], // [fix] 意外事件池去重环形缓冲（按 scenario 文本去重，避免同一意外事件重复出现）
    randomEventsUsed: [], // [G] 换乘模式随机事件去重（存已触发 id）
    heroinePersona: { scores: {}, current: '' }, // IMP-09：女主人格画像（暗藏，由选项/自由输入推断）
    oneHeartSchedule: null, // IMP-16：今日行程（娱乐圈世界观：{main,related,rival}）
    oneHeartVisitLog: [], // IMP-16：探班记录 [{roleKey,day,task}]
    oneHeartVisitLocked: '', // IMP-16：今日探班时间锁（已探成员 roleKey）
    oneHeartRivalAff: 0, // 情敌倾向值（被事件选项驱动：靠近情敌+、疏远情敌-）
    oneHeartRivalAffLog: [], // 情敌倾向值变化日志 [{round, change, reason, total}]
    oneHeartRivalStage: { stage: 0, stageStartGenCount: 0, eventTriggered: false, lastDirection: '' },
    oneHeartRivalTriggeredActions: [],
    oneHeartRomanceStage: 0, // IMP-19：感情进度阶段（0初识/1暧昧/2明确/3高潮），由回合数推进，门控激进/告白类行为
    // IMP-17：哥哥＝信任圈内人（仅娱乐圈·「队友的妹妹」设定，role==='哥哥'）
    brotherStance: 'consultant', // 哥哥立场：consultant(默认参谋)/supportive(认可掩护)/testing(试探)/protective(忧关系被家人/公司察觉，反对公开)
    oneHeartBrotherAff: 0, // 哥哥支持度数值（驱动 brotherStance 推导，范围 -100~100）
    oneHeartBrotherLog: [], // 哥哥立场变化日志 [{round, change, reason, total}]
    oneHeartBrotherPool: [], // 哥哥专属事件缓冲（参谋/掩护/调侃/考验，运行期填充）
    brotherTestNudged: false, // IMP-17：本局「哥哥的考验·其一」是否已触发（中局试探）
    brotherTest2Nudged: false, // [brother] 后局设局考验（其二）是否已触发
    brotherTest3Nudged: false, // [brother] 结局前把关考验（其三）是否已触发
    brotherRivalAware: false, // [brother] 哥哥是否已察觉情敌对妹妹上心（情敌倾向>=20）
    heroineSecrets: [], // [secret] 女主不可让哥哥知道的秘密（EXO追星向，setup随机2-3个）
    heroineSecretBroTeaseRound: 0, // [secret] 上次哥哥调侃秘密的回合数（间隔控制，可多次）
    heroineSecretMaleRound: 0, // [secret] 上次男主发现秘密的回合数（间隔控制）
    heroineSecretRivalRound: 0, // [secret] 上次秘密被撞破的回合数（间隔控制）
    heroineSecretFoundByRival: false, // [secret] 是否已被情敌/队友撞破（一次性把柄，曝光风险+）
    oneHeartPendingHeartbeat: false, // [romance] 心动时刻待注入（好感首破20进入暧昧期时置位）
    oneHeartEverDated: false, // [romance] 是否曾与男主约会（男主告白事件门槛之一）
    oneHeartConfessionDone: false, // [romance] 男主告白事件是否已触发（接受/拒绝/拖延后均置位，避免重复）
    oneHeartConfessionActive: false, // [romance] 本次剧情是否为男主告白事件（供 handleOptionChoice 识别后果）
    oneHeartConfessionResult: '', // [romance] 告白结果：accepted/rejected/delayed
    oneHeartConfessionCooldown: 0, // [romance] 拖延后冷却回合数（期间不再触发告白）
    oneHeartMaleColdUntil: 0, // [romance] 男主冷战截止回合（拒绝后内向型冷战）
    oneHeartBroTalkPending: false, // [romance] 哥哥找女主谈话支线待触发（拖延告白后）
    oneHeartPrRemaining: 2, // [exposure] 手动公关剩余次数（每次哥哥-3，限量2）
    oneHeartCpScandalActive: false, // [exposure] 营业CP被拍事件进行中（供handleOptionChoice识别）
    oneHeartCpScandalDone: false, // [exposure] 营业CP被拍固定事件是否已触发（stage>=3）
    oneHeartCpScandal2Done: false, // [exposure] 营业CP被拍回拨事件是否已触发（情敌倾向>=30）
    oneHeartExposureChoiceActive: false, // [exposure] 彻底曝光公开抉择进行中
    oneHeartExposureChoiceDone: false, // [exposure] 彻底曝光公开抉择是否已触发
    oneHeartCoverUsed: 0, // [exposure] 累计使用掩护手段次数（>=3粉丝起疑曝光+）
    oneHeartPublicLine: false, // [exposure] 是否已转公开线（影响结局）
    oneHeartBlankDay: false, // [social] 今日是否为空白日（三人都忙→女主独处，触发秘密/朋友圈/剧场）
    brotherAtHome: true, // 哥哥是否在家（由 IMP-16 行程派生；不在家=正当空档，可放男主进门且哥哥知情）
    brotherAffMilestone: 0, // 哥哥随感情深化而放心的里程碑（0/40/60/80，仅「队友的妹妹」）
    // IMP-ENT-DATE：日程约束 / 主动约会相关
    oneHeartDateToday: false, // 当日是否已主动发起约会
    oneHeartBrotherChatToday: false, // 当日是否已「找哥哥聊聊」（每日限一次，防刷哥哥好感）
    oneHeartDateWindowAvailable: false, // 当日是否存在有效空档（哥哥不在家 + 男主有空档），供跨天错过判定
    oneHeartBrotherTempChange: false, // B4：哥哥行程临时变更（中段翻转）待生效标记
    oneHeartPetName: '', // [deprecated] 旧版专属昵称字段，现已移除专属昵称机制（称呼按感情阶段自然推进），保留以防旧存档兼容
    oneHeartHeroineGroup: null, // [女团] 队友的妹妹·女团爱豆线：6 人女团背景拼装结果（buildHeroineGirlGroup 生成）
    oneHeartSeedEvent: '', // [seed] 男主对女主上心的种子事件（setup时AI生成200字，供告白/吃醋时回溯呼应）
    oneHeartMannerisms: [], // [seed] 男主专属小动作（setup时从男主人设派生，1主+1备，增强角色辨识度）
    _pendingEvents: [],
    _pendingEventResults: [],
    _usedEventScenarios: [],
    _compressing: false,
    letters: [],
    messageHistory: [],
    oneHeartArgueCooldown: 0,
    oneHeartColdWar: { active: false, startRound: 0, consecutiveDrops: 0 },
    oneHeartAffHistory: [],
    oneHeartDateIdx: 0,
    oneHeartLetterEvery: 5, // 1v1 秘密信件触发间隔（回合数），默认每 5 回合触发一次，上限 6 封
    oneHeartPromises: [],
    _relCharIntroduced: false,
    _rivalIntroduced: false,
    _newMoments: false,
    _newDiary: false,
    _newEvents: false,
    _idolBeatsUsed: [], // 已用过的 IDOL_PRIVATE_BEATS 索引（跨回合去重）
    _brotherShownThisDay: false, // [F/J] 当天主流程是否已出现哥哥桥段（防「上午哥哥说没事、下午探班又写哥哥」重复）
    oneHeartTimeProgress: 0, // [已废弃] 保留向后兼容，不再使用
    oneHeartSceneContext: { location: '', present: [] }, // 代码追踪场景位置、在场人物（时段概念已移除·F）

    // [entSim] 娱乐圈模拟器状态（完全独立模块 src/ent-sim/，不再复用 oneHeart 引擎）
    entSim: {
      career: { popularity: 30, careerLevel: '', resourcesLevel: '新人' }, // 四维职业基线 + 资源等级（由作品在播数派生）
      cycle: { phaseIndex: 0, stageIndex: 0, roundInPhase: 0, roundInStage: 0, roundTotal: 0 }, // 周期系统：4 相位 × 阶段
      npcNetwork: {
        nodes: {} // nid -> {id,type,name,intimacy,stance,lastEventRound}（4 类 NPC）
      },
      romance: {
        depth: 0, // 恋爱深度 0-5（0初遇/1暧昧/2暧昧明朗/3恋情/4浓情/5公开）
        emotion: '思念', // 男主情绪（吃醋/思念/不安/坚定）
        lastBeatRound: 0,
        confessionDone: false,
        confessionResult: '', // accepted/rejected/delayed
        coverUsed: 0, // 累计掩护次数（>=3 粉丝起疑）
        publicLine: false, // 是否转公开线
        seedEvent: '', // 男主上心种子事件（开场 AI 生成）
        mannerisms: [], // 男主专属小动作
        maleLead: { id: '', name: '', memberId: '' } // R1：男主作为独立 NPC（SEVENTEEN 成员）
      },
      works: { slots: {}, nextWorkId: 1 }, // 系统2 作品槽（key=id, value={type,title,subject,stage,startRound,lastProgressRound,buzz}）
      dailyBuzz: { hotSearch: [], fanDiscussion: [], mediaTitle: [], lastGenRound: -1 }, // 系统6 每日舆论
      careerHistory: [], // 事业事件日志
      secret: { items: [], foundByRival: false, broTeaseRound: 0, maleRound: 0, rivalRound: 0 }, // 女主秘密（限娱乐圈，非 EXO 向）
      brother: {
        stance: '参谋', // 参谋/认可掩护/试探/反对公开
        support: 0, // -100~100 哥哥支持度
        pool: [], // 哥哥专属事件缓冲
        testNudged: { 1: false, 2: false, 3: false }, // 哥哥递进考验三阶段
        rivalAware: false, // 是否察觉情敌上心
        talkPending: false // 哥哥找女主谈话支线待触发
      },
      chapter: { index: 1, name: '新人期', roundInChapter: 0, entered: false }, // 系统7 章节生态
      fittings: { dresses: [], lastGenRound: -1 }, // 红毯礼服候选（颁奖季）
      endings: { hint: '', locked: false, type: '', eligible: false, text: '' }, // 系统10 结局
      agenda: { main: '', related: '', rival: '', doneFlags: {} }, // 左栏日程（主档/相关档/晚档）
      misc: { suspicion: 0, manualPRUsed: 0, prRemaining: 2 }, // 粉丝怀疑度 / 手动公关已用 / 剩余
      flags: {} // 扩展标记位
    },

    oneHeartPromiseLog: [], // [{ text, createdAtRound }] 约定创建日志，用于延迟兑现控制
    oneHeartLastEventRound: 0,
    _newChat: false,
    _chatAffCount: 0,
    _chatAffDay: 0,
    _rivalSwitched: false,
    _confessionAccepted: false,
  _confessionCooldown: 0,
  oneHeartEventCards: [], // 事件卡片列表 [{type, scenario, chosenOption, story, affChange, rivalChange, memberName, timestamp}]
  newsFeed: [], // 娱乐圈新闻列表 [{id, type, emoji, sentiment, title, content, source, related, timestamp, shared}]
  newsDay: 0, // 上次生成新闻的 day（每天只生成一次）
  _newNews: false, // 是否有新新闻（红点提示）
  _affMilestones: {},
    _dateDayNotified: 0,
    profileLocked: false,
    step: 1,
    apiKey: '',
    rememberApiKey: true,
    mainApiProvider: '',
    mainApiModel: '',
    mainApiKey: '',
    useSeparateApi: false,
    apiProvider: 'deepseek',
    apiModel: '',
    aiEnabled: true,
    heroineProfile: {
      name: '沈也',
      age: 25,
      job: '独立插画师',
      profession: '',
      zodiac: '',
      birthday: { month: 0, day: 0 },
      appearance: ['泪痣', '冷白皮', '淡颜系', '酒窝'],
      personality: ['慢热但一旦爱了就全力以赴', '社恐小透明'],
      mbti: 'INFP',
      privateTraits: []
    },
    selectedMembers: [],
    secretX: '',
    day: 1,
    phaseIndex: 0,
    phaseNarrative: '',
    parsedNarrative: {
      narrative: '',
      directorOS: '',
      observerOS: '',
      interviews: [],
      memberInterviews: [],
      xInterviews: [],
      options: []
    },
    consequenceNarratives: [],
    currentOptions: [],
    smsSentToday: false,
    smsTarget: '',
    smsDrafts: [],
    smsHistory: [],
    affection: {},
    affectionLog: {},
    todayFullText: [],
    dailyFullTexts: [],
    dailySummaries: [],
    stayCount: 0,
    phaseOptionCount: 0,
    mainInterview: '',
    xBackstory: '',
    xBackstoryHidden: '',
    memberXBackstories: {},
    xItems: {},
    freeInput: '',
    isInConsequence: false,
    dayCompleted: false,
    gameOver: false,
    finalChoice: '',
    finalResult: '',
    endingMemberChoices: [],
    endingChosenId: '',
    endingEpilogue: null,
    endingArchive: [],
    oneHeartEnding: '', // IMP-18：1v1 结局类型（HE/NE/BE）
    oneHeartEndingRes: null, // [stability] 结局判定缓存（避免 HE_BABY 随机跳变）
    endingMeters: null, // IMP-18：结局判定仪表盘快照（brotherStance/rivalAff/scandal/affection/mood）
    prevSummary: '',
    prevRawText: '',
    pendingDatingResult: null,
    currentDatingPartner: null,
    datingDiceResult: null,
    observerGuest: '',
    observerGuestPrevious: '',
    day10ChosenDate: null,
    pendingPromises: [],
    memoryFacts: {}, // [A] 结构化事实记忆（按 角色→类别 存储：preferences/taboos/allergens），跨天持久累积
    todayRevealedInfo: '',
    pendingMemoryReview: null,
    drunkTrigger: null,
    todayRandomEventTriggered: false, // [P1-5]
    // 任务卡系统
    todayMissionCard: null,
    missionCardHistory: [],
    missionCardUsedIds: [],
    // 输入类任务完成后暂存的内容，注入下一段AI剧情后清空
    pendingTaskResult: null,
    // 成员回礼系统
    pendingReturnGifts: [],
    returnGiftHistory: [],
    // 约会礼物历史
    dateGiftHistory: [],
    // 约会礼物池缓存（按 day 缓存，如 { 4: [{type,name,desc},...8个] }）
    datingGiftPools: {},
    // 全局已抽约会礼物名称列表（跨 day 去重）
    datingGiftsUsed: [],
    // [P0-2] 小礼物系统
    gifts: [],
    // [P0-3] Day 11 喝酒计数
    drinkCounts: {},
    // [P0-3] Day 11 真心话状态
    truthState: null,
    // [P0-3] Day 11 真心话惩罚
    truthPunishment: null,
    // [P1-4] 好感度里程碑已提示记录
    affMilestoneShown: {},
    // 秘密任务系统
    secretMission: null,
    secretMissionInteracted: false,
    secretMissionHistory: [],
    heartNotes: {},
    secretMissionCompletedCount: 0,
    secretMissionUnlockFinal: false,
    // AI 一致性校验修正指令
    aiCorrections: [],
    // 吃醋事件系统
    jealousyLog: [],
    jealousyTriggeredToday: false,
    pendingJealousy: null,
    // 嫉妒任务（制作组搞事）
    jealousyMission: null,
    jealousyMissionTriggeredDays: [],
    // 前任来电/来信
    exMessage: null,
    exMessageHistory: [],
    // 午夜匿名电话亭
    midnightCall: null,
    // 匿名提问箱
    questionBox: null,
    // 季节与日期系统
    season: '',
    gameMonth: 0,
    gameDates: [],
    currentDate: { month: 0, day: 0 },
    // 天气系统
    weather: '',
    weathers: [],
    // 节日系统
    todayHoliday: null,
    // 测试模式
    testMode: false,
    // 好感度延迟结算
    pendingAffChanges: [],
    // 好感度行为历史（用于递减计算）
    affActionHistory: {},
    // 好感度疲劳值
    affFatigue: {},
    // 自由输入次数
    phaseFreeCount: 0,
    // X记忆物品公开阶段（first=只显示名称样式，second=追加故事）
    xItemsRevealState: {},
    // X记忆物品轮转索引（Day 4/5 每次公开 1 位成员）
    xItemsRevealRound: 0,
    // Phase 4 骨架模块开关（渐进式迁移用）
    skeletonConfig: {
      enabled: false,
      affectionEngine: false,
      drinkEngine: false,
      optionEngine: true,
      eventTriggers: false,
      scheduler: false
    },
    // [v22] 下集预告
    nextEpisodePreview: '',
    // [v22] 深色模式主题偏好
    theme: 'auto',
    // [v22] 打字机速度（0=即时显示，10-100=ms/字符，默认30）
    typewriterSpeed: 30,
    // [v22] 好感度历史快照（用于结局折线图）
    affectionHistory: [],
    // [v22] 修罗场强度
    rivalryIntensity: 0,
    // [v22] 修罗场高危态标记（BUG-04：仅在从 <2 人 >=60 跃迁到 >=2 人时 +1，避免稳态重复累加）
    rivalryHighActive: false,
    // IMP-10：脚踏两条船高风险期（同时与 >=2 人好感 >=50 且未公开时为 true）
    secretDating: false,
    // IMP-11：成员间关系网（A↔B 彼此好感/敌意，key=按 id 排序拼 '|'）
    memberBond: {},
    // IMP-12：抉择代价链（长线后果队列，{dueDay,type,text,triggered}）
    futureConsequences: [],
    // IMP-13：情绪状态链（某成员此刻心情，{state,cause,since,intensity}）
    mood: {},
    // [v22] X幽灵事件
    xGhostEvent: null,
    // [v22] 记忆闪回已触发记录
    flashbackShown: {},
    // [fix] 当天已使用过的选项文本（用于多样性约束）
    todayOptionTexts: [],
    // [v23-fix] 话题频率追踪（1v1 模式，用于强制话题轮替）
    dailyTopicFrequency: {},
    // [v23-fix] 当天已用话题列表（1v1 模式，最高频话题注入黑名单）
    todayUsedTopics: []
  };
}

export function loadGame() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      GS = JSON.parse(raw);
      migrateSave();
      if (GS.step === 0) GS.step = 1; // 修复：resetGame 曾写 step=0 导致 setup 白屏
      return true;
    }
  } catch (e) {
    console.error('Load failed:', e);
    GS = null; // 解析失败时重置，防止脏状态
  }
  return false;
}

export function saveGame() {
  try {
    var stateToSave = JSON.parse(JSON.stringify(GS));
    if (GS.rememberApiKey === false) {
      stateToSave.apiKey = '';
    }
    // 剥离运行时锁和临时标记，防止被持久化到存档导致刷新后卡死
    var savedLock = stateToSave._isGenerating;
    delete stateToSave._isGenerating;
    var savedAdvancing = stateToSave._advancingPhase;
    delete stateToSave._advancingPhase;
    delete stateToSave.pendingChoiceText;
    delete stateToSave._pendingSource;
    delete stateToSave._pendingOneHeartGen; // 协作式重入排队标记，纯运行时，不持久化
    delete stateToSave._entSimGenerating;   // ent-sim 生成锁：生成成功分支 saveGame 时仍为 true，须剥离否则刷新后卡死空白
    delete stateToSave._entSimAutoTries;    // ent-sim 自动重试计数：纯瞬态，不持久化
    var json = JSON.stringify(stateToSave);
    if (json.length > SAVE_SIZE_WARN) {
      console.warn('存档大小: ' + (json.length / 1024).toFixed(1) + 'KB');
    }
    stateToSave._isGenerating = savedLock;
    stateToSave._advancingPhase = savedAdvancing;
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      window.showToast('⚠️ 存档空间不足！请清理浏览器缓存后重试。');
    } else {
      console.error('[saveGame] 存档失败:', e);
      window.showToast('⚠️ 存档失败，请检查浏览器设置或联系开发者');
    }
  }
}

export function migrateSave() {
  // ent-sim 娱乐圈模拟器：补全新字段（纯恋爱重构后的字段），不影响已有进度
  if (GS.entSim) {
    var E = GS.entSim;
    if (typeof E.affection !== 'number') E.affection = 0;
    if (!E.romance) E.romance = {};
    var R = E.romance;
    if (typeof R.depth !== 'number') R.depth = 0;
    if (!R.stage) R.stage = '初遇';
    if (!R.emotion) R.emotion = '思念';
    if (R.seedEvent === undefined) R.seedEvent = '';
    if (!Array.isArray(R.mannerisms)) R.mannerisms = [];
    if (typeof R.confessionTimes !== 'number') R.confessionTimes = 0;
    if (typeof R.dateCount !== 'number') R.dateCount = 0;
    if (typeof R.confessionDone !== 'boolean') R.confessionDone = false;
    if (typeof R.confessionResult !== 'string') R.confessionResult = '';
    if (typeof R.coverUsed !== 'number') R.coverUsed = 0;
    if (typeof R.publicLine !== 'boolean') R.publicLine = false;
    if (R.collabActive === undefined) R.collabActive = null;
    if (typeof R.collabSweetAccum !== 'number') R.collabSweetAccum = 0;
    if (R.maleLead && !R.maleLead.memberId && R.maleLead.id) R.maleLead.memberId = R.maleLead.id;

    if (!E.memory) E.memory = {};
    if (!Array.isArray(E.memory.dailySummaries)) E.memory.dailySummaries = [];
    if (!Array.isArray(E.memory.eventLog)) E.memory.eventLog = [];
    if (typeof E.memory.lastCompressDay !== 'number') E.memory.lastCompressDay = 0;

    // 女团队友：旧存档可能为空数组，自动重建而非仅兜底 []
    if (!Array.isArray(E.heroineGroup) || E.heroineGroup.length === 0) E.heroineGroup = buildEntSimHeroineGroup();
    if (!E.groupMeta) E.groupMeta = buildEntSimGroupMeta();

    if (!E.career) E.career = { popularity: 22, careerLevel: '新人', resourcesLevel: '新人' };
    if (typeof E.career.popularity !== 'number') E.career.popularity = 22;

    if (!E.npcNetwork) E.npcNetwork = {};
    if (!E.npcNetwork.nodes) E.npcNetwork.nodes = {};

    if (!E.brother) E.brother = {};
    if (!E.brother.stance) E.brother.stance = '参谋';
    if (typeof E.brother.support !== 'number') E.brother.support = 0;

    // BUGFIX: 旧存档缺 started 字段 → 刷新后误触发首轮自动生成
    if (typeof E.started !== 'boolean') E.started = true; // 已存在的旧存档必然已经生成过剧情
    if (!Array.isArray(E.brother.pool)) E.brother.pool = [];
    if (!E.brother.testNudged || typeof E.brother.testNudged !== 'object') E.brother.testNudged = { 1: false, 2: false, 3: false };
    if (typeof E.brother.rivalAware !== 'boolean') E.brother.rivalAware = false;
    if (typeof E.brother.talkPending !== 'boolean') E.brother.talkPending = false;
    if (!Array.isArray(E._affectionLog)) E._affectionLog = []; // 好感度来源日志迁移

    // v23 新增：日记 + 男主视角碎片 + 日程男主行程
    if (!Array.isArray(E.diary)) E.diary = [];
    if (!E._malePOVUnlocked || typeof E._malePOVUnlocked !== 'object') E._malePOVUnlocked = {};
    if (E.agenda && !E.agenda.maleLead) { E.agenda.maleLead = '行程中'; E.agenda.maleLeadLoc = ''; }

    if (!E.agenda) E.agenda = {};
    if (!E.agenda.main) E.agenda.main = '';
    if (!E.agenda.related) E.agenda.related = '';
    if (!E.agenda.rival) E.agenda.rival = '';
    if (!E.agenda.doneFlags || typeof E.agenda.doneFlags !== 'object') E.agenda.doneFlags = {};

    if (!E.misc) E.misc = {};
    if (typeof E.misc.exposureAccum !== 'number') E.misc.exposureAccum = 0;
    if (typeof E.misc.suspicion !== 'number') E.misc.suspicion = 0;
    if (typeof E.misc.npcInteractionUsed !== 'number') E.misc.npcInteractionUsed = 0;
    if (typeof E.misc.cpRealProgress !== 'number') E.misc.cpRealProgress = 0;
    if (typeof E.misc.cpRealTriggered !== 'boolean') E.misc.cpRealTriggered = false;

    if (!E.buzzReplies || typeof E.buzzReplies !== 'object') E.buzzReplies = {};
    if (typeof E._momentCounter !== 'number') E._momentCounter = 0;
    if (typeof E._diaryCounter !== 'number') E._diaryCounter = 0;
    if (!Array.isArray(E.diaryHis)) E.diaryHis = [];
    if (!Array.isArray(E.letters)) E.letters = [];
    if (typeof E._chatAffCount !== 'number') { E._chatAffCount = 0; E._chatAffDay = 0; E._chatAffGained = 0; }
    if (!E._rivalTriggered || typeof E._rivalTriggered !== 'object') E._rivalTriggered = {};
    if (!Array.isArray(E.chatHistory)) E.chatHistory = [];
    if (!Array.isArray(E.moments)) E.moments = [];
    if (!Array.isArray(E.theaterHistory)) E.theaterHistory = [];
    if (!Array.isArray(E.careerHistory)) E.careerHistory = [];

    if (!E.cycle) E.cycle = {};
    if (typeof E.cycle.timeOfDay !== 'number') E.cycle.timeOfDay = 0;
    if (typeof E.cycle.dayCount !== 'number') E.cycle.dayCount = 1;
    if (typeof E.cycle.roundTotal !== 'number') E.cycle.roundTotal = 0;

    if (!E.works) E.works = { slots: {}, nextWorkId: 1 };
    if (!E.dailyBuzz) E.dailyBuzz = { hotSearch: [], fanDiscussion: [], mediaTitle: [], lastGenRound: -1 };
    if (!E.secret) E.secret = { items: [], foundByRival: false, broTeaseRound: 0, maleRound: 0, rivalRound: 0 };
    if (!E.flags || typeof E.flags !== 'object') E.flags = {};
  }
  if (!GS.version || GS.version !== 'v22') {
    if (!GS.version || GS.version === 'v21') {
      // v21 → v22 新增字段兜底
      if (GS.nextEpisodePreview === undefined) GS.nextEpisodePreview = '';
      if (GS.gameMode === undefined) GS.gameMode = 'transfer';
      if (GS.oneHeartMember === undefined) GS.oneHeartMember = '';
      if (GS.worldSetting === undefined) GS.worldSetting = '';
      if (GS.writingStyle === undefined) GS.writingStyle = '';
      if (!Array.isArray(GS.chatHistory)) GS.chatHistory = [];
      if (!Array.isArray(GS.moments)) GS.moments = [];
      if (!Array.isArray(GS.theaterHistory)) GS.theaterHistory = [];
      if (GS.theme === undefined) GS.theme = 'auto';
      if (GS.typewriterSpeed === undefined) GS.typewriterSpeed = 30;
      if (!Array.isArray(GS.affectionHistory)) GS.affectionHistory = [];
    if (GS.rivalryIntensity === undefined) GS.rivalryIntensity = 0;
    if (GS.rivalryHighActive === undefined) GS.rivalryHighActive = false;
    if (GS.secretDating === undefined) GS.secretDating = false;
    if (!GS.memberBond || typeof GS.memberBond !== 'object') GS.memberBond = {};
    if (!Array.isArray(GS.futureConsequences)) GS.futureConsequences = [];
    if (!GS.mood || typeof GS.mood !== 'object') GS.mood = {};
      if (GS.xGhostEvent === undefined) GS.xGhostEvent = null;
      if (!GS.flashbackShown) GS.flashbackShown = {};
    }
    GS.version = 'v22';
    if (GS.oneHeartCustomWorld === undefined) GS.oneHeartCustomWorld = '';
    if (GS.oneHeartMainLine === undefined) GS.oneHeartMainLine = '';
    if (GS.heroineProfile && GS.heroineProfile.identity) delete GS.heroineProfile.identity;
    if (GS.heroineProfile && GS.heroineProfile.profession === undefined) GS.heroineProfile.profession = '';
    if (!GS.heroineProfile.zodiac) GS.heroineProfile.zodiac = '';
    if (GS.dailyMemories && GS.dailyMemories.length > 0 && (!GS.dailySummaries || GS.dailySummaries.length === 0)) {
      GS.dailySummaries = GS.dailyMemories; delete GS.dailyMemories;
    }
    if (GS.segmentMemories) delete GS.segmentMemories;
    if (GS.consequenceMemories) delete GS.consequenceMemories;
    if (GS.smsMemory) delete GS.smsMemory;
    if (GS.stayMemories) delete GS.stayMemories;
    if (GS.memberInterviews) delete GS.memberInterviews;
    if (GS.pendingDatingResult === undefined) GS.pendingDatingResult = null;
    if (GS.currentDatingPartner === undefined) GS.currentDatingPartner = null;
    if (GS.datingDiceResult === undefined) GS.datingDiceResult = null;
    if (GS.observerGuest === undefined) GS.observerGuest = '';
    if (GS.observerGuestPrevious === undefined) GS.observerGuestPrevious = '';
    if (GS.day10ChosenDate === undefined) GS.day10ChosenDate = null;
    if (GS.pendingPromises === undefined) GS.pendingPromises = [];
    if (GS.memoryFacts === undefined || typeof GS.memoryFacts !== 'object') GS.memoryFacts = {};
    if (GS.todayRevealedInfo === undefined) GS.todayRevealedInfo = '';
    if (!GS.affectionLog) GS.affectionLog = {};
    if (!GS.dailyFullTexts) GS.dailyFullTexts = [];
    if (GS.phaseOptionCount === undefined) GS.phaseOptionCount = 0;
    if (GS.prevRawText === undefined) GS.prevRawText = '';
    if (!GS.parsedNarrative) GS.parsedNarrative = {
      narrative: '', directorOS: '', observerOS: '',
      interviews: [], memberInterviews: [], xInterviews: [], options: []
    };
    if (!GS.parsedNarrative.memberInterviews) GS.parsedNarrative.memberInterviews = [];
    if (!GS.parsedNarrative.xInterviews) GS.parsedNarrative.xInterviews = [];
    if (!GS.heroineProfile.personality) GS.heroineProfile.personality = ['慢热但一旦爱了就全力以赴','社恐小透明'];
    if (!GS.heroineProfile.privateTraits) GS.heroineProfile.privateTraits = [];
    if (GS.pendingMemoryReview === undefined) GS.pendingMemoryReview = null;
    if (GS.drunkTrigger === undefined) GS.drunkTrigger = null;
    if (!Array.isArray(GS.gifts)) GS.gifts = []; // [P0-2]
    if (GS.xBackstory === undefined) GS.xBackstory = '';
    if (GS.xBackstoryHidden === undefined) GS.xBackstoryHidden = '';
    if (!Array.isArray(GS.pendingReturnGifts)) GS.pendingReturnGifts = [];
    if (!Array.isArray(GS.returnGiftHistory)) GS.returnGiftHistory = [];
    // 旧存档回礼兼容：确保每条回礼都有 giftDesc 字段
    if (Array.isArray(GS.returnGiftHistory)) {
      for (var _rgi = 0; _rgi < GS.returnGiftHistory.length; _rgi++) {
        if (GS.returnGiftHistory[_rgi].giftDesc === undefined) GS.returnGiftHistory[_rgi].giftDesc = '';
      }
    }
    if (!Array.isArray(GS.dateGiftHistory)) GS.dateGiftHistory = [];
    if (GS.todayMissionCard === undefined) GS.todayMissionCard = null;
    if (!Array.isArray(GS.missionCardHistory)) GS.missionCardHistory = [];
    if (!Array.isArray(GS.missionCardUsedIds)) GS.missionCardUsedIds = [];
    if (GS.pendingTaskResult === undefined) GS.pendingTaskResult = null;
    // 旧存档任务卡补全 type/inputLabel（按 id 从最新 MISSION_CARDS 补齐，避免 type 为 undefined 卡死）
    if (GS.todayMissionCard && GS.todayMissionCard.id && GS.todayMissionCard.type === undefined) {
      var _mRef = MISSION_CARDS.find(function(c) { return c.id === GS.todayMissionCard.id; });
      if (_mRef) {
        GS.todayMissionCard.type = _mRef.type;
        if (_mRef.inputLabel !== undefined) GS.todayMissionCard.inputLabel = _mRef.inputLabel;
      } else {
        GS.todayMissionCard.type = 'action';
      }
    }
    if (!GS.drinkCounts) GS.drinkCounts = {}; // [P0-3]
    if (GS.truthState === undefined) GS.truthState = null; // [P0-3]
    if (!GS.affMilestoneShown) GS.affMilestoneShown = {}; // [P1-4]
    if (GS.todayRandomEventTriggered === undefined) GS.todayRandomEventTriggered = false; // [P1-5]
    if (GS.truthPunishment === undefined) GS.truthPunishment = null;
    if (GS.profileLocked === undefined) GS.profileLocked = false;
    // 秘密任务系统迁移
    if (GS.secretMission === undefined) GS.secretMission = null;
    if (GS.secretMissionInteracted === undefined) GS.secretMissionInteracted = false;
    if (!GS.secretMissionHistory) GS.secretMissionHistory = [];
    if (!GS.heartNotes) GS.heartNotes = {};
    if (GS.secretMissionCompletedCount === undefined) GS.secretMissionCompletedCount = 0;
    if (GS.secretMissionUnlockFinal === undefined) GS.secretMissionUnlockFinal = false;
    if (!Array.isArray(GS.aiCorrections)) GS.aiCorrections = [];
    if (GS.apiKeyAlading === undefined) GS.apiKeyAlading = '';
    if (GS.mainApiProvider === undefined) GS.mainApiProvider = '';
    if (GS.mainApiModel === undefined) GS.mainApiModel = '';
    if (GS.mainApiKey === undefined) GS.mainApiKey = GS.apiKeyAlading || '';
    if (GS.useSeparateApi === undefined) GS.useSeparateApi = false;
    if (GS.customApiEndpoint === undefined) GS.customApiEndpoint = '';
    if (GS.customApiModel === undefined) GS.customApiModel = '';
    if (GS.mainCustomApiEndpoint === undefined) GS.mainCustomApiEndpoint = '';
    if (GS.mainCustomApiModel === undefined) GS.mainCustomApiModel = '';
    if (GS.rememberApiKey === undefined) GS.rememberApiKey = true;
    if (GS.apiProvider === undefined) GS.apiProvider = 'deepseek';
    if (GS.apiModel === undefined) GS.apiModel = '';
    // 吃醋事件系统迁移
    if (!Array.isArray(GS.jealousyLog)) GS.jealousyLog = [];
    if (GS.jealousyTriggeredToday === undefined) GS.jealousyTriggeredToday = false;
    if (GS.pendingJealousy === undefined) GS.pendingJealousy = null;
    // 嫉妒任务系统迁移
    if (GS.jealousyMission === undefined) GS.jealousyMission = null;
    if (!Array.isArray(GS.jealousyMissionTriggeredDays)) GS.jealousyMissionTriggeredDays = [];
    // 前任来电/来信迁移
    if (GS.exMessage === undefined) GS.exMessage = null;
    if (!Array.isArray(GS.exMessageHistory)) GS.exMessageHistory = [];
    // 午夜电话亭迁移
    if (GS.midnightCall === undefined) GS.midnightCall = null;
    // 匿名提问箱迁移
    if (GS.questionBox === undefined) GS.questionBox = null;
    // 季节/天气/节日/测试模式迁移
    if (GS.season === undefined) GS.season = '';
    if (GS.gameMonth === undefined) GS.gameMonth = 0;
    if (!Array.isArray(GS.gameDates)) GS.gameDates = [];
    if (!GS.currentDate) GS.currentDate = { month: 0, day: 0 };
    if (GS.weather === undefined) GS.weather = '';
    if (!Array.isArray(GS.weathers)) GS.weathers = [];
    if (GS.todayHoliday === undefined) GS.todayHoliday = null;
    if (GS.testMode === undefined) GS.testMode = false;
    if (!Array.isArray(GS.pendingAffChanges)) GS.pendingAffChanges = [];
    if (!GS.affActionHistory) GS.affActionHistory = {};
    if (!GS.affFatigue) GS.affFatigue = {};
    if (GS.phaseFreeCount === undefined) GS.phaseFreeCount = 0;
    if (!GS.xItemsRevealState) GS.xItemsRevealState = {};
    if (GS.xItemsRevealRound === undefined) GS.xItemsRevealRound = 0;
    if (!GS.endingMemberChoices) GS.endingMemberChoices = [];
    if (GS.endingChosenId === undefined) GS.endingChosenId = '';
    if (GS.endingEpilogue === undefined) GS.endingEpilogue = null;
    if (!GS.endingArchive) GS.endingArchive = [];
    if (GS.oneHeartEnding === undefined) GS.oneHeartEnding = '';
    if (GS.endingMeters === undefined) GS.endingMeters = null;
    // [diary] 日记系统
    if (!Array.isArray(GS.diaryEntries)) GS.diaryEntries = [];
    if (GS.oneHeartDiaryCounter === undefined) GS.oneHeartDiaryCounter = 0;
    if (GS.oneHeartMomentCounter === undefined) GS.oneHeartMomentCounter = 0;
    if (!GS.oneHeartArchivedNarratives) GS.oneHeartArchivedNarratives = [];
    if (GS.oneHeartGenCount === undefined) GS.oneHeartGenCount = 0;
    if (GS.oneHeartLastCompressedIdx === undefined) GS.oneHeartLastCompressedIdx = 0;
    if (GS.oneHeartLastDayStartIdx === undefined) GS.oneHeartLastDayStartIdx = 0;
    if (GS.oneHeartYesterdaySummary === undefined) GS.oneHeartYesterdaySummary = '';
    if (!GS.oneHeartRelationCharacter) GS.oneHeartRelationCharacter = { name: '', role: '', gender: '', memberId: '', personality: '', behaviorLogic: '', isRival: false };
    if (!GS.oneHeartRival) GS.oneHeartRival = { name: '', memberId: '', personality: '', behaviorLogic: '', interactionStyle: '', loveStyle: '' };
    if (GS.oneHeartStartYear === undefined) GS.oneHeartStartYear = 2025;
    if (GS.oneHeartPendingEvent === undefined) GS.oneHeartPendingEvent = null;
    if (!Array.isArray(GS.oneHeartEventPool)) GS.oneHeartEventPool = [];
    if (!Array.isArray(GS.oneHeartJealousyPool)) GS.oneHeartJealousyPool = [];
    if (!Array.isArray(GS.oneHeartSurprisePool)) GS.oneHeartSurprisePool = [];
    if (!Array.isArray(GS.oneHeartRivalPool)) GS.oneHeartRivalPool = [];
    if (!Array.isArray(GS.oneHeartCelebrityPool)) GS.oneHeartCelebrityPool = [];
    if (!Array.isArray(GS.oneHeartScandalPool)) GS.oneHeartScandalPool = [];
    if (!Array.isArray(GS.oneHeartSickPool)) GS.oneHeartSickPool = [];
    if (!Array.isArray(GS.oneHeartExJealousPool)) GS.oneHeartExJealousPool = [];
    if (!Array.isArray(GS.oneHeartLateNightPool)) GS.oneHeartLateNightPool = [];
    if (GS.oneHeartRivalAff === undefined) GS.oneHeartRivalAff = 0;
    if (!Array.isArray(GS.oneHeartRivalAffLog)) GS.oneHeartRivalAffLog = [];
    if (!Array.isArray(GS.oneHeartDailySummaries)) GS.oneHeartDailySummaries = [];
    if (!Array.isArray(GS._usedEventScenarios)) GS._usedEventScenarios = [];
    if (GS._compressing === undefined) GS._compressing = false;
    if (GS.oneHeartArgueCooldown === undefined) GS.oneHeartArgueCooldown = 0;
    if (!Array.isArray(GS._pendingEvents)) GS._pendingEvents = [];
    if (!Array.isArray(GS._pendingEventResults)) GS._pendingEventResults = [];
    if (!Array.isArray(GS.oneHeartEventCards)) GS.oneHeartEventCards = [];
    if (!Array.isArray(GS.letters)) GS.letters = [];
    if (GS.oneHeartLastEventRound === undefined) GS.oneHeartLastEventRound = 0;
    if (!GS.oneHeartColdWar) GS.oneHeartColdWar = { active: false, startRound: 0, consecutiveDrops: 0 };
    if (!Array.isArray(GS.oneHeartAffHistory)) GS.oneHeartAffHistory = [];
    if (GS.oneHeartDateIdx === undefined) GS.oneHeartDateIdx = 0;
    if (GS.oneHeartLetterEvery === undefined) GS.oneHeartLetterEvery = 5;
    if (GS._brotherShownThisDay === undefined) GS._brotherShownThisDay = false;
    if (GS.oneHeartTimeProgress === undefined) GS.oneHeartTimeProgress = 0;
    if (GS.oneHeartSceneContext === undefined) GS.oneHeartSceneContext = { location: '', present: [] };

    if (!Array.isArray(GS.oneHeartPromiseLog)) GS.oneHeartPromiseLog = [];
    if (GS._relCharIntroduced === undefined) GS._relCharIntroduced = false;
    if (GS._rivalIntroduced === undefined) GS._rivalIntroduced = false;
    if (GS.brotherTest2Nudged === undefined) GS.brotherTest2Nudged = false;
    if (GS.brotherTest3Nudged === undefined) GS.brotherTest3Nudged = false;
    if (GS.brotherRivalAware === undefined) GS.brotherRivalAware = false;
    if (GS.oneHeartSeedEvent === undefined) GS.oneHeartSeedEvent = '';
    if (!Array.isArray(GS.oneHeartMannerisms)) GS.oneHeartMannerisms = [];
    if (GS._newMoments === undefined) GS._newMoments = false;
    if (GS._newDiary === undefined) GS._newDiary = false;
    if (GS._newChat === undefined) GS._newChat = false;
    if (GS._newEvents === undefined) GS._newEvents = false;
    if (GS._chatAffCount === undefined) GS._chatAffCount = 0;
    if (GS._chatAffDay === undefined) GS._chatAffDay = 0;
    if (GS._rivalSwitched === undefined) GS._rivalSwitched = false;
    if (GS._confessionAccepted === undefined) GS._confessionAccepted = false;
    if (GS._confessionCooldown === undefined) GS._confessionCooldown = 0;
    if (!GS._affMilestones) GS._affMilestones = {};
    if (GS._dateDayNotified === undefined) GS._dateDayNotified = 0;
    if (!Array.isArray(GS.oneHeartPromises)) GS.oneHeartPromises = [];
    // 情敌阶段追踪与去重
    if (!GS.oneHeartRivalStage) GS.oneHeartRivalStage = { stage: 0, stageStartGenCount: 0, eventTriggered: false, lastDirection: '' };
    if (!Array.isArray(GS.oneHeartRivalTriggeredActions)) GS.oneHeartRivalTriggeredActions = [];
    if (GS.oneHeartRomanceStage === undefined) GS.oneHeartRomanceStage = 0;
    if (!Array.isArray(GS.oneHeartEventLog)) GS.oneHeartEventLog = [];
    if (!Array.isArray(GS.oneHeartRandomUsed)) GS.oneHeartRandomUsed = [];
    if (!Array.isArray(GS.randomEventsUsed)) GS.randomEventsUsed = [];
    if (GS.oneHeartSchedule === undefined) GS.oneHeartSchedule = null;
    if (!Array.isArray(GS.oneHeartVisitLog)) GS.oneHeartVisitLog = [];
    if (GS.oneHeartVisitLocked === undefined) GS.oneHeartVisitLocked = '';
    // IMP-17：哥哥立场相关兜底
    if (GS.brotherStance === undefined || !GS.brotherStance) GS.brotherStance = 'consultant';
    if (GS.oneHeartBrotherAff === undefined) GS.oneHeartBrotherAff = 0;
    if (!Array.isArray(GS.oneHeartBrotherLog)) GS.oneHeartBrotherLog = [];
    if (!Array.isArray(GS.oneHeartBrotherPool)) GS.oneHeartBrotherPool = [];
    if (GS.brotherTestNudged === undefined) GS.brotherTestNudged = false;
    if (GS.oneHeartScandalCount === undefined) GS.oneHeartScandalCount = 0;
    if (GS.exposureRisk === undefined) GS.exposureRisk = 0;
    if (GS.brotherAtHome === undefined) GS.brotherAtHome = true;
    if (!Array.isArray(GS.heroineSecrets)) GS.heroineSecrets = [];
    if (GS.heroineSecretBroTeaseRound === undefined) GS.heroineSecretBroTeaseRound = 0;
    if (GS.heroineSecretMaleRound === undefined) GS.heroineSecretMaleRound = 0;
    if (GS.heroineSecretRivalRound === undefined) GS.heroineSecretRivalRound = 0;
    if (GS.heroineSecretFoundByRival === undefined) GS.heroineSecretFoundByRival = false;
    if (GS.oneHeartPendingHeartbeat === undefined) GS.oneHeartPendingHeartbeat = false;
    if (GS.oneHeartEverDated === undefined) GS.oneHeartEverDated = false;
    if (GS.oneHeartConfessionDone === undefined) GS.oneHeartConfessionDone = false;
    if (GS.oneHeartConfessionActive === undefined) GS.oneHeartConfessionActive = false;
    if (GS.oneHeartConfessionResult === undefined) GS.oneHeartConfessionResult = '';
    if (GS.oneHeartConfessionCooldown === undefined) GS.oneHeartConfessionCooldown = 0;
    if (GS.oneHeartMaleColdUntil === undefined) GS.oneHeartMaleColdUntil = 0;
    if (GS.oneHeartBroTalkPending === undefined) GS.oneHeartBroTalkPending = false;
    if (GS.oneHeartPrRemaining === undefined) GS.oneHeartPrRemaining = 2;
    if (GS.oneHeartCpScandalActive === undefined) GS.oneHeartCpScandalActive = false;
    if (GS.oneHeartCpScandalDone === undefined) GS.oneHeartCpScandalDone = false;
    if (GS.oneHeartCpScandal2Done === undefined) GS.oneHeartCpScandal2Done = false;
    if (GS.oneHeartExposureChoiceActive === undefined) GS.oneHeartExposureChoiceActive = false;
    if (GS.oneHeartExposureChoiceDone === undefined) GS.oneHeartExposureChoiceDone = false;
    if (GS.oneHeartCoverUsed === undefined) GS.oneHeartCoverUsed = 0;
    if (GS.oneHeartPublicLine === undefined) GS.oneHeartPublicLine = false;
    if (GS.oneHeartBlankDay === undefined) GS.oneHeartBlankDay = false;
    if (GS.brotherAffMilestone === undefined) GS.brotherAffMilestone = 0;
    // IMP-ENT-DATE：新字段兜底
    if (GS.oneHeartDateToday === undefined) GS.oneHeartDateToday = false;
    if (GS.oneHeartBrotherChatToday === undefined) GS.oneHeartBrotherChatToday = false;
    if (GS.oneHeartDateWindowAvailable === undefined) GS.oneHeartDateWindowAvailable = false;
    if (GS.oneHeartBrotherTempChange === undefined) GS.oneHeartBrotherTempChange = false;
    // 新闻系统
    if (!Array.isArray(GS.newsFeed)) GS.newsFeed = [];
    if (GS.newsDay === undefined) GS.newsDay = 0;
    if (GS._newNews === undefined) GS._newNews = false;
    if (!GS.heroinePersona || typeof GS.heroinePersona !== 'object') GS.heroinePersona = { scores: {}, current: '' };
    if (!GS.heroinePersona.scores) GS.heroinePersona.scores = {};
    if (!GS.heroinePersona.current && GS.heroinePersona.current !== '') GS.heroinePersona.current = '';
    // [fix] 选项历史黑名单
    if (!Array.isArray(GS.todayOptionTexts)) GS.todayOptionTexts = [];
    // [v23-fix] 话题频率追踪 + 当天已用话题
    if (!GS.dailyTopicFrequency || typeof GS.dailyTopicFrequency !== 'object') GS.dailyTopicFrequency = {};
    if (!Array.isArray(GS.todayUsedTopics)) GS.todayUsedTopics = [];
    // 约会礼物池与去重缓存
    if (!GS.datingGiftPools) GS.datingGiftPools = {};
    if (!Array.isArray(GS.datingGiftsUsed)) GS.datingGiftsUsed = [];
    // Phase 4 骨架模块开关
    if (!GS.skeletonConfig) GS.skeletonConfig = {
      enabled: false,
      affectionEngine: false,
      drinkEngine: false,
      optionEngine: true,
      eventTriggers: false,
      scheduler: false
    };
    saveGame();
  }
  // BUG-16: 字段兜底移出版本判断——即使 v22 存档缺新字段也补回默认值，
  // 避免运行期读取 undefined 崩溃（旧逻辑全部在 version!=='v22' 分支内，v22 存档缺字段不补）。
  var _defState = defaultGameState();
  for (var _dk in _defState) {
    if (Object.prototype.hasOwnProperty.call(_defState, _dk) && GS[_dk] === undefined) {
      GS[_dk] = _defState[_dk];
    }
  }
  // [entSim] 旧 oneHeart + entertainment 存档迁移为独立娱乐圈模拟器模式（始终执行）
  if (GS.gameMode === 'oneHeart' && GS.worldSetting === 'entertainment') {
    GS.gameMode = 'entSim';
    var _migProf = (GS.heroineProfile && GS.heroineProfile.profession) || '';
    if (_migProf === '女团爱豆') { GS.heroineProfile.profession = '爱豆'; _migProf = '爱豆'; }
    var _migIdol = (_migProf === '爱豆' || _migProf === '女团爱豆');
    GS.entSim.chapter.index = _migIdol ? 2 : 1;
    GS.entSim.chapter.name = ['新人期', '上升期', '巅峰期', '传奇期'][GS.entSim.chapter.index - 1] || '新人期';
    GS.entSim.career.popularity = (_migIdol ? 40 : 30);
    GS.entSim.career.careerLevel = getEntSimCareerLevel(GS.entSim.career.popularity);
  }
  // 运行时锁重置（必须写在整个兜底的最后，且不在版本分支内，确保任何存档都能解卡）
  GS._isGenerating = false;
  GS._advancingPhase = false;
  GS._pendingOneHeartGen = null;
}

export async function resetGame() {
  var confirmed = await showConfirmModal('确定要重置所有进度吗？此操作不可撤销。');
  if (!confirmed) return;

  // 保留 API 设置
  var savedApiKey = GS.apiKey || '';
  var savedRememberApiKey = GS.rememberApiKey;
  var savedApiProvider = GS.apiProvider || 'deepseek';
  var savedApiModel = GS.apiModel || '';
  var savedUseSeparateApi = GS.useSeparateApi || false;
  var savedMainApiProvider = GS.mainApiProvider || '';
  var savedMainApiModel = GS.mainApiModel || '';
  var savedMainApiKey = GS.mainApiKey || '';
  var savedCustomApiEndpoint = GS.customApiEndpoint || '';
  var savedCustomApiModel = GS.customApiModel || '';
  var savedMainCustomApiEndpoint = GS.mainCustomApiEndpoint || '';
  var savedMainCustomApiModel = GS.mainCustomApiModel || '';
  // 保留用户偏好
  var savedTheme = GS.theme || 'auto';
  var savedTypewriterSpeed = GS.typewriterSpeed == null ? 30 : GS.typewriterSpeed;
  // 保留女主档案 + 上次配置，重置后自动填回选单
  var savedHeroineProfile = GS.heroineProfile ? JSON.parse(JSON.stringify(GS.heroineProfile)) : null;
  // 保留 1v1 模式设置
  var savedGameMode = GS.gameMode || 'transfer';
  var savedOneHeartMember = GS.oneHeartMember || '';
  var savedWorldSetting = GS.worldSetting || '';
  var savedWritingStyle = GS.writingStyle || '';
  var savedOneHeartCustomWorld = GS.oneHeartCustomWorld || '';
  var savedOneHeartMainLine = GS.oneHeartMainLine || '';
  // 保留激活码设置
  var savedAuthToken = localStorage.getItem('svt_auth_token');
  var savedRememberCode = localStorage.getItem('svt_auth_remember_code');
  var savedCode = localStorage.getItem('svt_auth_saved_code');
  var savedDeviceId = localStorage.getItem('svt_auth_device_id');
  localStorage.removeItem(STORAGE_KEY);
  var clearCache = GS.gameMode === 'oneHeart' ? false : await showConfirmModal('是否同时清除已缓存的 X 档案故事？（清除后下次开局会重新生成）');
  if (clearCache) {
    clearStoryCache();
  }
  // 恢复激活码设置
  if (savedAuthToken) localStorage.setItem('svt_auth_token', savedAuthToken);
  if (savedRememberCode) localStorage.setItem('svt_auth_remember_code', savedRememberCode);
  if (savedCode) localStorage.setItem('svt_auth_saved_code', savedCode);
  if (savedDeviceId) localStorage.setItem('svt_auth_device_id', savedDeviceId);
  Object.assign(GS, defaultGameState());
  GS.apiKey = savedApiKey;
  GS.rememberApiKey = savedRememberApiKey;
  GS.theme = savedTheme;
  GS.typewriterSpeed = savedTypewriterSpeed;
  GS.apiProvider = savedApiProvider;
  GS.apiModel = savedApiModel;
  GS.useSeparateApi = savedUseSeparateApi;
  GS.mainApiProvider = savedMainApiProvider;
  GS.mainApiModel = savedMainApiModel;
  GS.mainApiKey = savedMainApiKey;
  GS.customApiEndpoint = savedCustomApiEndpoint;
  GS.customApiModel = savedCustomApiModel;
  GS.mainCustomApiEndpoint = savedMainCustomApiEndpoint;
  GS.mainCustomApiModel = savedMainCustomApiModel;
  GS.gameMode = savedGameMode;
  GS.oneHeartMember = savedOneHeartMember;
  GS.worldSetting = savedWorldSetting;
  GS.writingStyle = savedWritingStyle;
  GS.oneHeartCustomWorld = savedOneHeartCustomWorld;
  GS.oneHeartMainLine = savedOneHeartMainLine;
  GS.step = 1; // 回到 setup 第一步
  if (savedHeroineProfile) GS.heroineProfile = savedHeroineProfile;
  saveGame();
}

// 重置缓存：清除所有本地数据（含 API 设置、主题、存档），完全重新开始
export async function resetCache() {
  var confirmed = await showConfirmModal(
    '⚠️ 重置缓存会清除所有本地文件，包括：\n\n' +
    '• 当前游戏进度\n• API 设置和 Key\n• 主题偏好和打字机速度\n• 已生成的剧情数据\n\n' +
    '再次启动游戏时所有剧情需要重新生成。\n\n确定要继续吗？'
  );
  if (!confirmed) return;

  // 清除所有 svt_* localStorage 项
  var keysToRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf('svt_') === 0) {
      keysToRemove.push(key);
    }
  }
  for (var j = 0; j < keysToRemove.length; j++) {
    localStorage.removeItem(keysToRemove[j]);
  }
  // 同时清除存档 KEY
  localStorage.removeItem(STORAGE_KEY);

  Object.assign(GS, defaultGameState());

  // 重新加载页面以重置所有模块状态
  location.reload();
}

// 暴露到全局便于控制台调试（用 getter 保证始终指向当前模块变量）
Object.defineProperty(window, 'GS', {
  get: function() { return GS; },
  enumerable: true,
  configurable: true
});




