import { STORAGE_KEY, SAVE_SIZE_WARN } from './data.js';
import { clearStoryCache } from './story-cache.js';
import { showConfirmModal } from './modals/confirm-modal.js';

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
    profileLocked: false,
    step: 1,
    apiKey: '',
    rememberApiKey: true,
    apiProvider: 'deepseek',
    apiModel: '',
    aiEnabled: true,
    heroineProfile: {
      name: '沈也',
      age: 25,
      job: '独立插画师',
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
    prevSummary: '',
    prevRawText: '',
    pendingDatingResult: null,
    currentDatingPartner: null,
    datingDiceResult: null,
    observerGuest: '',
    observerGuestPrevious: '',
    day10ChosenDate: null,
    pendingPromises: [],
    todayRevealedInfo: '',
    pendingMemoryReview: null,
    drunkTrigger: null,
    todayRandomEventTriggered: false, // [P1-5]
    // 任务卡系统
    todayMissionCard: null,
    missionCardHistory: [],
    missionCardUsedIds: [],
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
    // [v22] X幽灵事件
    xGhostEvent: null,
    // [v22] 记忆闪回已触发记录
    flashbackShown: {},
    // [fix] 当天已使用过的选项文本（用于多样性约束）
    todayOptionTexts: []
  };
}

export function loadGame() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      GS = JSON.parse(raw);
      migrateSave();
      return true;
    }
  } catch (e) {
    console.error('Load failed:', e);
  }
  return false;
}

export function saveGame() {
  try {
    var stateToSave = JSON.parse(JSON.stringify(GS));
    if (GS.rememberApiKey === false) {
      stateToSave.apiKey = '';
    }
    // 剥离运行时锁，防止被持久化到存档导致刷新后卡死
    delete stateToSave._isGenerating;
    delete stateToSave._advancingPhase;
    var json = JSON.stringify(stateToSave);
    if (json.length > SAVE_SIZE_WARN) {
      console.warn('存档大小: ' + (json.length / 1024).toFixed(1) + 'KB');
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      window.showToast('⚠️ 存档空间不足！请清理浏览器缓存后重试。');
    }
  }
}

export function migrateSave() {
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
      if (GS.xGhostEvent === undefined) GS.xGhostEvent = null;
      if (!GS.flashbackShown) GS.flashbackShown = {};
    }
    GS.version = 'v22';
    if (GS.oneHeartCustomWorld === undefined) GS.oneHeartCustomWorld = '';
    if (GS.oneHeartMainLine === undefined) GS.oneHeartMainLine = '';
    if (GS.heroineProfile && GS.heroineProfile.identity) delete GS.heroineProfile.identity;
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
    GS._isGenerating = false;
    GS._advancingPhase = false;  // 重置重入锁，防止旧存档卡死
    // [fix] 选项历史黑名单
    if (!Array.isArray(GS.todayOptionTexts)) GS.todayOptionTexts = [];
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
}

export async function resetGame() {
  var confirmed = await showConfirmModal('确定要重置所有进度吗？此操作不可撤销。');
  if (!confirmed) return;

  // 保留 API 设置
  var savedApiKey = GS.apiKey || '';
  var savedRememberApiKey = GS.rememberApiKey;
  var savedApiProvider = GS.apiProvider || 'deepseek';
  var savedApiModel = GS.apiModel || '';
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
  GS.gameMode = savedGameMode;
  GS.oneHeartMember = savedOneHeartMember;
  GS.worldSetting = savedWorldSetting;
  GS.writingStyle = savedWritingStyle;
  GS.oneHeartCustomWorld = savedOneHeartCustomWorld;
  GS.oneHeartMainLine = savedOneHeartMainLine;
  GS.step = 0; // 回到 setup 第一步
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




