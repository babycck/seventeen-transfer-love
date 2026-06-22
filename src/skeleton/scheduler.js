import { GS } from '../state.js';
import { saveGame } from '../state.js';
import { HOLIDAYS, GIFT_TEMPLATES, MEMBER_GIFT_PREFERENCE, MEMBERS, MISSION_CARDS } from '../data.js';

// ==================== 新一天状态重置 ====================
export function resetDayState() {
  GS.pendingMemoryReview = null;
  GS.phaseNarrative = '';
  GS.parsedNarrative = {
    narrative: '', directorOS: '', observerOS: '',
    interviews: [], memberInterviews: [], xInterviews: [], options: []
  };
  GS.consequenceNarratives = [];
  GS.currentOptions = [];
  GS.isInConsequence = false;
  GS.smsSentToday = false;
  GS.smsTarget = '';
  GS.smsDrafts = [];
  GS.stayCount = 0;
  GS.phaseOptionCount = 0;
  GS.phaseFreeCount = 0;
  GS.freeInput = '';
  GS.prevSummary = '';
  GS.prevRawText = '';
  GS.pendingDatingResult = null;
  GS.day10ChosenDate = null;
  GS.todayRandomEventTriggered = false;
  GS.pendingJealousy = null;
  GS.todayFullText = [];
  GS._todayCompressedSummary = '';
  GS.phaseIndex = 0;
  GS.dayCompleted = false;
  GS.affActionHistory = {};
  GS.affFatigue = {};

  // 清理过期功能状态
  GS.drunkTrigger = null;
  GS.drinkCounts = {};
  GS.exMessage = null;
  GS.truthPunishment = null;
  GS.midnightCall = null;
  GS.questionBox = null;
  GS.jealousyTriggeredToday = false;
  GS.secretMissionInteracted = false;
  GS.observerGuest = '';
  GS.currentDatingPartner = null;
  GS.currentDatingLocation = null;
  GS.datingDiceResult = null;

  // 清理已过期/完成的嫉妒任务
  if (GS.jealousyMission && GS.jealousyMission.day < GS.day) {
    GS.jealousyMission = null;
  }
}

// ==================== 秘密任务清理 ====================
export function cleanupSecretMission() {
  if (GS.secretMission && GS.secretMission.status === 'active') {
    GS.secretMission.status = 'failed';
    GS.secretMissionHistory.push(JSON.parse(JSON.stringify(GS.secretMission)));
    GS.secretMission = null;
  }
  GS.secretMissionInteracted = false;
}

// ==================== 观察员嘉宾更新 ====================
export function updateObserverGuestPrevious() {
  var oguestName = GS.observerGuest;
  var oguestMember = MEMBERS.find(function(m) { return m.name + ' ' + m.stageName === oguestName; });
  GS.observerGuestPrevious = oguestMember ? oguestMember.id : oguestName;
}

// ==================== 约会后礼物生成 ====================
export function generateDayGifts() {
  if ((GS.day === 4 || GS.day === 8) && GS.currentDatingPartner) {
    var partnerId = GS.currentDatingPartner;
    var partnerPref = MEMBER_GIFT_PREFERENCE[partnerId];

    var prefTemplates = GIFT_TEMPLATES.filter(function(g) { return g.type === partnerPref; });
    var exclusiveTmpl = prefTemplates[Math.floor(Math.random() * prefTemplates.length)];
    GS.gifts.push({
      id: Date.now() + '_ex_' + Math.random().toString(36).slice(2, 5),
      type: exclusiveTmpl.type,
      name: exclusiveTmpl.name,
      desc: exclusiveTmpl.desc,
      fromDay: GS.day,
      fromPartner: partnerId,
      isExclusive: true
    });

    var generalTmpl = GIFT_TEMPLATES[Math.floor(Math.random() * GIFT_TEMPLATES.length)];
    GS.gifts.push({
      id: Date.now() + '_gen_' + Math.random().toString(36).slice(2, 5),
      type: generalTmpl.type,
      name: generalTmpl.name,
      desc: generalTmpl.desc,
      fromDay: GS.day,
      fromPartner: partnerId,
      isExclusive: false
    });
  }
}

// ==================== 任务卡触发检查 ====================
export function checkMissionCard() {
  if (GS.day < 3 || GS.day > 11) return null;
  if (GS.todayMissionCard) return null;
  var eligible = MISSION_CARDS.filter(function(c) {
    return GS.day >= c.dayMin && GS.day <= c.dayMax && GS.missionCardUsedIds.indexOf(c.id) < 0;
  });
  if (eligible.length === 0) return null;
  if (Math.random() > 0.2) return null;
  var card = eligible[Math.floor(Math.random() * eligible.length)];
  GS.todayMissionCard = card;
  GS.missionCardUsedIds.push(card.id);
  saveGame();
  return card;
}
export function advanceDateAndWeather() {
  GS.day++;
  if (GS.gameDates && GS.gameDates[GS.day - 1]) {
    GS.currentDate = GS.gameDates[GS.day - 1];
  }
  if (GS.weathers && GS.weathers[GS.day - 1]) {
    GS.weather = GS.weathers[GS.day - 1];
  }
  GS.todayHoliday = null;
  if (GS.currentDate && GS.currentDate.month) {
    for (var hi = 0; hi < HOLIDAYS.length; hi++) {
      if (HOLIDAYS[hi].month === GS.currentDate.month && HOLIDAYS[hi].day === GS.currentDate.day) {
        GS.todayHoliday = HOLIDAYS[hi];
        break;
      }
    }
  }
}
