import { GS } from '../state.js';
import { saveGame } from '../state.js';
import { HOLIDAYS, GIFT_TEMPLATES, MEMBER_GIFT_PREFERENCE, MEMBERS, MISSION_CARDS } from '../data.js';
import { callDeepSeek } from '../api.js';

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
  if (GS.day >= 8) GS.midnightCall = null;
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

// ==================== 约会后礼物生成（按需 AI 生成 + 缓存） ====================
export async function generateDayGifts() {
  var datingDays = [4, 6, 8, 9];
  var isDatingDay = datingDays.indexOf(GS.day) >= 0;

  // 非约会日或无约会地点时跳过
  if (!isDatingDay && GS.day !== 10) return;
  if (!GS.currentDatingPartner) return;
  if (!GS.currentDatingLocation) return;

  var location = GS.currentDatingLocation;

  // 检查缓存池
  if (!GS.datingGiftPools) GS.datingGiftPools = {};
  var pool = GS.datingGiftPools[GS.day];

  // 缓存不存在时调用 AI 生成 8 个符合地点的礼物
  if (!pool || !Array.isArray(pool) || pool.length < 2) {
    var sysPrompt = '你只输出 JSON 数组，不要输出任何思考过程或解释。';
    var userMsg = '以下是一次约会场景的地点信息。请生成 8 个符合该场景氛围的小礼物，类型在 handcraft/food/emotion 间均匀分布。\n' +
      '地点名称：' + location.name + '\n' +
      '地点描述：' + location.desc + '\n' +
      '季节：' + (GS.season || '未知') + '\n' +
      '要求：\n' +
      '1. 每个礼物包含 type（handcraft/food/emotion）、name（名称）、desc（一句话描述，约15字）\n' +
      '2. 礼物应可在约会场景中自然获得或购买（如海边→贝壳、咖啡馆→咖啡豆）\n' +
      '3. 礼物不需要符合特定成员的喜好，具有通用性\n' +
      '4. 输出格式：[{"type":"handcraft","name":"礼物名","desc":"一句话描述"},...]\n' +
      '5. 只输出 JSON 数组，不要任何其他文字';

    try {
      var result = await callDeepSeek(sysPrompt, userMsg, 2000, false, 0.7);
      result = result.trim();
      // 尝试提取 JSON（AI 可能用 ```json 包裹）
      var jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) result = jsonMatch[1].trim();
      var generated = JSON.parse(result);
      if (Array.isArray(generated) && generated.length >= 8) {
        pool = generated.slice(0, 8); // 只取前 8 个
        GS.datingGiftPools[GS.day] = pool;
        saveGame();
      }
    } catch (e) {
      console.error('[generateDayGifts] AI 生成失败:', e);
    }
  }

  // 若 AI 生成失败，使用已有缓存或回退
  if (!pool || !Array.isArray(pool) || pool.length < 1) {
    pool = GS.datingGiftPools[GS.day] || [];
  }
  if (pool.length < 1) return;

  // 从池中抽 2 个不重复（按礼物名称去重）
  var usedNames = (GS.datingGiftsUsed || []).slice();
  var available = pool.filter(function(g) {
    return g && g.name && usedNames.indexOf(g.name) < 0;
  });
  // 池耗尽时重置已用列表
  if (available.length < 2) {
    usedNames = [];
    available = pool.slice();
  }

  var partnerId = GS.currentDatingPartner;
  var picked = [];
  for (var pi = 0; pi < 2 && available.length > 0; pi++) {
    var idx = Math.floor(Math.random() * available.length);
    var gift = available.splice(idx, 1)[0];
    picked.push(gift);
    if (!Array.isArray(GS.datingGiftsUsed)) GS.datingGiftsUsed = [];
    GS.datingGiftsUsed.push(gift.name);
  }

  if (picked.length === 0) return;

  // 存入 GS.gifts（保留原有礼物格式一致）
  for (var gi = 0; gi < picked.length; gi++) {
    var g = picked[gi];
    GS.gifts.push({
      id: Date.now() + '_dt' + GS.day + '_' + Math.random().toString(36).slice(2, 5),
      type: g.type || 'handcraft',
      name: g.name,
      desc: g.desc || '',
      fromDay: GS.day,
      fromPartner: partnerId,
      isExclusive: gi === 0 // 第一个标记为专属
    });
    if (!Array.isArray(GS.dateGiftHistory)) GS.dateGiftHistory = [];
    GS.dateGiftHistory.push({
      memberId: partnerId,
      giftName: g.name,
      giftDesc: g.desc || '',
      day: GS.day,
      isExclusive: gi === 0
    });
  }
  saveGame();
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
