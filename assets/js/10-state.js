// ==================== 游戏状态 ====================
var GS = null;

function defaultGameState() {
  return {
    version: 'v20',
    step: 1,
    apiKey: '',
    aiEnabled: true,
    heroineProfile: {
      name: '沈也',
      age: 25,
      job: '独立插画师',
      zodiac: '',
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
    phaseChoiceCount: 0,
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
    drunkRoundCount: 0,
    todayRandomEventTriggered: false, // [P1-5]
    // [P0-2] 小礼物系统
    gifts: [],
    // [P0-3] Day 11 喝酒计数
    drinkCounts: {},
    // [P0-3] Day 11 真心话状态
    truthState: null,
    // [P1-4] 好感度里程碑已提示记录
    affMilestoneShown: {}
  };
}

function loadGame() {
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

function saveGame() {
  try {
    var json = JSON.stringify(GS);
    if (json.length > SAVE_SIZE_WARN) {
      console.warn('存档大小: ' + (json.length / 1024).toFixed(1) + 'KB');
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('⚠️ 存档空间不足！请清理浏览器缓存后重试。');
    }
  }
}

function migrateSave() {
  if (!GS.version || GS.version !== 'v20') {
    GS.version = 'v20';
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
    if (GS.phaseChoiceCount === undefined) GS.phaseChoiceCount = 0;
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
    if (GS.drunkRoundCount === undefined) GS.drunkRoundCount = 0;
    if (!Array.isArray(GS.gifts)) GS.gifts = []; // [P0-2]
    if (!GS.drinkCounts) GS.drinkCounts = {}; // [P0-3]
    if (GS.truthState === undefined) GS.truthState = null; // [P0-3]
    if (!GS.affMilestoneShown) GS.affMilestoneShown = {}; // [P1-4]
    if (GS.todayRandomEventTriggered === undefined) GS.todayRandomEventTriggered = false; // [P1-5]
    saveGame();
  }
}

function resetGame() {
  if (confirm('确定要重置所有进度吗？此操作不可撤销。')) {
    localStorage.removeItem(STORAGE_KEY);
    GS = defaultGameState();
    saveGame();
    renderAll();
  }
}
