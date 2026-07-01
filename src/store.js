import { GS, saveGame } from './state.js';

// ==================== 订阅系统 ====================
var _listeners = [];

export function subscribe(fn) {
  _listeners.push(fn);
  return function unsubscribe() {
    var i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}

function notify(action) {
  for (var i = 0; i < _listeners.length; i++) {
    try { _listeners[i](action); } catch (e) { console.error('[store] listener error:', e, e.stack); }
  }
}

// ==================== Dispatch ====================
var _saveTimer = null;

export function dispatch(action) {
  if (!action || !action.type) {
    console.warn('[store] invalid action:', action);
    return;
  }
  console.log('[store] dispatch:', action.type, action.payload || {});
  reducer(GS, action);
  // debounce saveGame：300ms 内多次 dispatch 合并为一次存档，减少主线程阻塞
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    _saveTimer = null;
    saveGame();
  }, 300);
  notify(action);
}

// ==================== Reducer ====================
function reducer(state, action) {
  var p = action.payload || {};

  switch (action.type) {

    // ---- 时间推进 ----
    case 'ADVANCE_PHASE':
      state.phaseIndex = p.phaseIndex;
      if (p.day !== undefined) state.day = p.day;
      break;
    case 'ADVANCE_DAY':
      state.day = p.day;
      break;

    // ---- 叙事 ----
    case 'SET_PHASE_NARRATIVE':
      state.phaseNarrative = p.rawText;
      if (p.parsed) state.parsedNarrative = p.parsed;
      break;
    case 'PUSH_CONSEQUENCE':
      state.consequenceNarratives.push({
        rawText: action.rawText,
        parsed: action.parsed,
        choiceText: action.choiceText
      });
      break;
    case 'SET_OPTIONS':
      state.currentOptions = p.options || [];
      break;
    case 'CLEAR_CONSEQUENCES':
      state.consequenceNarratives = [];
      break;

    // ---- 好感度 ----
    case 'ADD_AFFECTION':
      if (!state.affection) state.affection = {};
      if (!state.affection[p.memberId]) state.affection[p.memberId] = 0;
      state.affection[p.memberId] += p.delta;
      break;
    case 'ADD_AFFECTION_LOG':
      if (!state.affectionLog) state.affectionLog = {};
      if (!state.affectionLog[p.memberId]) state.affectionLog[p.memberId] = [];
      state.affectionLog[p.memberId].push({
        day: state.day,
        phase: '',
        change: p.delta,
        reason: p.reason || '',
        total: state.affection[p.memberId] || 0
      });
      break;
    case 'PUSH_CORRECTIONS':
      if (!state.aiCorrections) state.aiCorrections = [];
      state.aiCorrections = state.aiCorrections.concat(p.corrections);
      break;
    case 'CLEAR_CORRECTIONS':
      state.aiCorrections = [];
      break;

    // ---- 喝酒 ----
    case 'ADD_DRINK':
      if (!state.drinkCounts) state.drinkCounts = {};
      state.drinkCounts[p.name] = (state.drinkCounts[p.name] || 0) + (p.count || 1);
      break;

    // ---- 时段状态重置 ----
    case 'RESET_PHASE_STATE':
      state.phaseNarrative = '';
      state.parsedNarrative = {
        narrative: '', directorOS: '', observerOS: '',
        interviews: [], memberInterviews: [], xInterviews: [], options: []
      };
      state.consequenceNarratives = [];
      state.currentOptions = [];
      state.isInConsequence = false;
      state.smsSentToday = false;
      state.smsTarget = '';
      state.smsDrafts = [];
      state.stayCount = 0;
      state.phaseOptionCount = 0;
      state.phaseFreeCount = 0;
      state.freeInput = '';
      state.prevSummary = '';
      state.prevRawText = '';
      state.pendingJealousy = null;
      break;

    // ---- 文本日志 ----
    case 'PUSH_TODAY_TEXT':
      state.todayFullText.push(action.text);
      break;
    case 'PUSH_DAILY_TEXTS':
      state.dailyFullTexts.push(p.texts);
      break;
    case 'PUSH_DAILY_SUMMARY':
      state.dailySummaries.push(p.summary);
      break;

    // ---- 计数 ----
    case 'INC_PHASE_OPTION_COUNT':
      state.phaseOptionCount++;
      break;
    case 'INC_STAY_COUNT':
      state.stayCount++;
      break;

    // ---- 游戏状态 ----
    case 'SET_GAME_OVER':
      state.gameOver = true;
      if (p.finalChoice) state.finalChoice = p.finalChoice;
      if (p.finalResult) state.finalResult = p.finalResult;
      break;

    // ---- 通用 flag 设置 ----
    case 'SET_FLAG':
      var allowedFlags = ['todayRandomEventTriggered', 'todayMissionCard', 'secretMissionInteracted', 'jealousyTriggeredToday', 'drunkTrigger', 'questionBox', 'midnightCall', 'truthPunishment', 'truthState'];
      if (allowedFlags.indexOf(p.key) >= 0) {
        state[p.key] = p.value;
      } else {
        console.warn('[store] SET_FLAG 拒绝非白名单字段:', p.key);
      }
      break;

    // ---- 渲染触发（无状态变更，只通知 UI） ----
    case 'RERENDER':
      // 不修改状态，只通知监听器
      break;

    default:
      console.warn('[store] unknown action type:', action.type);
  }
}

// ==================== Action Creators ====================
export var actions = {
  advancePhase: function(phaseIndex) {
    return { type: 'ADVANCE_PHASE', payload: { phaseIndex: phaseIndex } };
  },
  advanceDay: function(day) {
    return { type: 'ADVANCE_DAY', payload: { day: day } };
  },
  setPhaseNarrative: function(rawText, parsed) {
    return { type: 'SET_PHASE_NARRATIVE', payload: { rawText: rawText, parsed: parsed } };
  },
  pushConsequence: function(rawText, parsed, choiceText) {
    return { type: 'PUSH_CONSEQUENCE', rawText: rawText, parsed: parsed, choiceText: choiceText };
  },
  setOptions: function(options) {
    return { type: 'SET_OPTIONS', payload: { options: options } };
  },
  addAffection: function(memberId, delta) {
    return { type: 'ADD_AFFECTION', payload: { memberId: memberId, delta: delta } };
  },
  addAffectionLog: function(memberId, delta, reason) {
    return { type: 'ADD_AFFECTION_LOG', payload: { memberId: memberId, delta: delta, reason: reason } };
  },
  addDrink: function(name, count) {
    return { type: 'ADD_DRINK', payload: { name: name, count: count || 1 } };
  },
  resetPhaseState: function() {
    return { type: 'RESET_PHASE_STATE' };
  },
  pushTodayText: function(text) {
    return { type: 'PUSH_TODAY_TEXT', payload: { text: text } };
  },
  rerender: function() {
    return { type: 'RERENDER' };
  },
  pushDailyTexts: function(texts) {
    return { type: 'PUSH_DAILY_TEXTS', payload: { texts: texts } };
  },
  pushDailySummary: function(summary) {
    return { type: 'PUSH_DAILY_SUMMARY', payload: { summary: summary } };
  }
};
