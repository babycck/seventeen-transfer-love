import { STORAGE_KEY, SAVE_SIZE_WARN } from './data.js';
import { clearStoryCache } from './story-cache.js';

// ==================== 游戏状态 ====================
export var GS = null;

export function setGS(newGS) {
  Object.assign(GS, newGS);
}

export function defaultGameState() {
  return {
    version: 'v21',
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
    // Phase 4 骨架模块开关（渐进式迁移用）
    skeletonConfig: {
      enabled: false,
      affectionEngine: false,
      drinkEngine: false,
      optionEngine: true,
      eventTriggers: false,
      scheduler: false
    }
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
    var stateToSave = GS;
    if (GS.rememberApiKey === false) {
      stateToSave = JSON.parse(JSON.stringify(GS));
      stateToSave.apiKey = '';
    }
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
  if (!GS.version || GS.version !== 'v21') {
    GS.version = 'v21';
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
    if (!GS.endingMemberChoices) GS.endingMemberChoices = [];
    if (GS.endingChosenId === undefined) GS.endingChosenId = '';
    if (GS.endingEpilogue === undefined) GS.endingEpilogue = null;
    if (!GS.endingArchive) GS.endingArchive = [];
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

export function resetGame() {
  if (confirm('确定要重置所有进度吗？此操作不可撤销。')) {
    // 保留 API 设置
    var savedApiKey = GS.apiKey || '';
    var savedRememberApiKey = GS.rememberApiKey;
    var savedApiProvider = GS.apiProvider || 'deepseek';
    var savedApiModel = GS.apiModel || '';
    // 保留激活码设置
    var savedAuthToken = localStorage.getItem('svt_auth_token');
    var savedRememberCode = localStorage.getItem('svt_auth_remember_code');
    var savedCode = localStorage.getItem('svt_auth_saved_code');
    var savedDeviceId = localStorage.getItem('svt_auth_device_id');
    localStorage.removeItem(STORAGE_KEY);
    if (confirm('是否同时清除已缓存的 X 档案故事？（清除后下次开局会重新生成）')) {
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
    GS.apiProvider = savedApiProvider;
    GS.apiModel = savedApiModel;
    saveGame();
  }
}



