// ============================================================
// 娱乐圈模拟器（entSim）· 主循环引擎（纯恋爱游戏 + 娱乐圈背景）
// generateEntSimRound：生成 → 解析 → 应用副作用 → 推进时段氛围
// 换天由玩家点「进入下一天」(goEntSimNextDay) 显式触发。
// ============================================================
import { GS, saveGame } from '../state.js';
import { checkChapterAdvance, initEntSimState, popularity, careerLevel, addPopularity, traineePhaseOf, formatGameDate, todayBirthday, todayHoliday } from './state.js';
import { generateWithRetry } from '../ai-generator.js';
import { showToast, randInt } from '../utils.js';
import { parseEntSimResponse, parseEntSimExtras, safeParseJson } from './parser.js';
import { buildEntSimSystemPrompt, buildEntSimUserMessage } from './prompts.js';
import { rollDailyAgenda, getTimeOfDayLabel } from './cycle.js';
import { applyDiscoveryBlowback, addExposure, addCareerPublicity, getScandalHeat } from './public-opinion.js';
import { recordRomanceBeat, applyEntSimAffection, tickRomanceTimers, tickJealousy, checkAnniversaries, recordMilestone } from './romance.js';
import { generateDailyBuzz } from './immersion.js';
import { evaluateEnding } from './endings.js';
import { compressEntSimMemory, buildMemorySnapshot } from './memory.js';
import { maybeBrotherEvent, maybeMaleLeadInitiative, checkOneHeartEvents } from './brother.js';
// npc-network 已移除，情敌名改用 rival 字段
import { ENDING_TONE } from './data.js';
import { pickFromPool, SVT_TEAMMATE_EVENT_POOL, FAN_LETTER_POOL, BRAND_OFFER_POOL, RELEASE_POOL, CONTACT_TYPE_POOL, AWARD_POOL, VARIETY_SHOW_POOL, DISPATCH_POOL, MAGAZINE_POOL, RUMOR_POOL, COMEBACK_CYCLE_POOL, CONCERT_POOL, MUSIC_SHOW_POOL, FANSIGN_POOL, CAREER_SETBACKS, CONTACT_PROGRESSION, CHAT_MALE_LEAD, CHAT_BROTHER, CHAT_RIVAL, CHAT_MANAGER, GROUP_CHAT, CHAT_SASAENG, DAILY_ENGAGEMENT_POOL, TEAMMATE_FLAVOR, SVT_TEAMMATE_PROFILES, MILESTONE_DEBUT, JOB_OFFER_POOL } from './pools/index.js';
import { checkAwardCeremony } from './pools/awards.js';
import { getFanLetter } from './pools/fan-letters.js';
import { COMPANY_EVENT_POOL } from './pools/company-events.js';
import { getRandomTeammate, getTeammateDesc } from './pools/teammate-flavor.js';
import { tickComebackCycle } from './pools/comeback-cycle.js';
import { calculateMusicShowRank } from './pools/music-show-pool.js';
import { buildTestNarrative, buildTestOptions } from './test-mode.js';

// 生成中标记（模块级，避免严格模式下的隐式全局报错）
var _entSimInflight = null;

// 双系统状态同步：entSim → 1v1 GS 字段（确保曝光/掩护/告白/公关等状态一致）
function syncOneHeartState() {
  var E = GS.entSim;
  if (!E || !E.misc || !E.romance) return;
  // 恋情曝光风险同步：scandalHeat → exposureRisk（映射 0-25+ → 0-100）
  var heat = (typeof E.misc.scandalHeat === 'number') ? E.misc.scandalHeat : (E.misc.exposureAccum || 0);
  GS.exposureRisk = Math.min(100, Math.round(heat * 4));
  // 掩护计数同步
  GS.oneHeartCoverUsed = E.romance.coverUsed || 0;
  // 告白状态同步
  GS.oneHeartConfessionDone = E.romance.confessionDone || false;
  // 公关次数同步
  GS.oneHeartPrRemaining = E.misc.prRemaining || 0;
  // 公开线同步
  GS.oneHeartPublicLine = E.romance.publicLine || false;
  // 哥哥支持度同步
  if (E.brother) {
    GS.oneHeartBrotherAff = E.brother.support || 0;
  }
}

// 主生成循环
export function generateEntSimRound(type, extra) {
  if (GS._entSimGenerating) {
    return _entSimInflight || Promise.reject(new Error('生成中，请稍候'));
  }
  GS._entSimGenerating = true;
  extra = extra || {};

  // ═══ 测试模式：绕过AI生成，使用池子文本 ═══
  if (window.__ENT_SIM_TEST) {
    return Promise.resolve().then(function() {
      var E = GS.entSim;
      if (!E.agenda || !E.agenda.main) rollDailyAgenda();
      maybeCompress();
      return ensureSeedEvent();
    }).then(function() {
      var narrative = buildTestNarrative(type, extra);
      var options = buildTestOptions();
      var current = { narrative: narrative, options: options, extras: {}, type: type };

      GS._entSimCurrent = current;
      GS.entSim.started = true;
      GS._entSimAutoTries = 0;
      if (!extra.noSideEffects) {
        GS._entSimNarrativeBuffer = (GS._entSimNarrativeBuffer || '') + '\n' + narrative;
      }
      saveGame();
      GS._entSimGenerating = false;
      _entSimInflight = null;
      return current;
    });
  }

  var E0 = GS.entSim;
  if (!E0.agenda || !E0.agenda.main) rollDailyAgenda();

  maybeCompress();
  // 懒生成男主种子事件（首次回合无 seedEvent 时生成 200 字上心契机存档）
  return ensureSeedEvent().then(function() {
  var sys = buildEntSimSystemPrompt();
  var user = buildEntSimUserMessage(type, extra);

  var _nEl = (typeof document !== 'undefined') ? document.getElementById('es-narrative') : null;
  if (_nEl) {
    var _existing = _nEl.querySelector('.es-loading-inline');
    if (!_existing) {
      _nEl.insertAdjacentHTML('beforeend', '<div class="es-loading-inline">✨ 正在加载剧情…</div>');
      _nEl.scrollTop = _nEl.scrollHeight;
    }
  }

  _entSimInflight = generateWithRetry(sys, user, { temperature: 0.9, maxTokens: 5000 })
    .then(function(res) {
      var raw = (res && res.raw) ? res.raw : '';
      var parsed = parseEntSimResponse(raw);
      var extras = parseEntSimExtras(parsed.extras);
      if (!extra.noSideEffects) applySideEffects(extras);

      var prev = GS._entSimCurrent;
      var narrative = parsed.narrative || '';
      var branchLabel = '';
      if (type === 'choice' && extra.choiceText) branchLabel = '你的选择：' + extra.choiceText;
      else if (type === 'free' && extra.freeText) branchLabel = '你输入：' + extra.freeText;
      else if (type === 'event' && extra.eventText) branchLabel = '触发：' + extra.eventText;
      else if (type === 'hypothetical' && extra.hypotheticalText) branchLabel = '自由推演：' + extra.hypotheticalText;
      else if (type === 'phase' && extra.nextDayOpening) branchLabel = 'Day ' + (GS.entSim.cycle.dayCount || 1) + ' ' + getTimeOfDayLabel();
      else if (type === 'phase') branchLabel = '▸';
      // 累积剧情：所有类型都拼接到上一段之后（首段无 prev、上一段为错误提示时不拼接）
      if (prev && prev.narrative && narrative && !prev.failed) {
        narrative = prev.narrative + '\n\n── ' + branchLabel + ' ──\n\n' + narrative;
        // 防止无限增长：超出上限时折叠最早内容，保留最近一段
        if (narrative.length > 10000) {
          narrative = '（↑ 较早的剧情已折叠）\n' + narrative.slice(-8000);
        }
      }

      var current = {
        narrative: narrative,
        options: parsed.options || [],
        extras: extras,
        type: type
      };
      if (current.narrative) {
        GS._entSimCurrent = current;
        GS.entSim.started = true;
        GS._entSimAutoTries = 0;
      }
      if (!extra.noSideEffects) {
        GS._entSimNarrativeBuffer = (GS._entSimNarrativeBuffer || '') + '\n' + parsed.narrative;
      }
      saveGame();
      return current;
    })
    .catch(function(err) {
      showToast('生成失败：' + (err && err.message ? err.message : '未知错误'));
      var fb = { narrative: '（剧情生成失败，请点击「拉回主线」重试）', options: ['重试'], extras: {}, type: type, failed: true };
      GS._entSimCurrent = fb;
      return fb;
    })
    .then(function(current) {
      GS._entSimGenerating = false;
      _entSimInflight = null;
      // 自动写日记：每 3 回合 AI 生成完整日记（对齐 1v1）
      if (current && current.narrative && !extra.noSideEffects) {
        var E = GS.entSim;
        // 简洁摘要同时保留（记忆回顾用）
        var sum = (current.narrative || '').replace(/\n/g, ' ').substring(0, 50).trim();
        var choiceText = extra.choiceText || extra.freeText || '';
        if (sum) {
          E.diarySummary = E.diarySummary || [];
          E.diarySummary.push({ day: E.cycle.dayCount || 1, round: E.cycle.roundTotal || 0, summary: sum, choice: choiceText });
          if (E.diarySummary.length > 60) E.diarySummary = E.diarySummary.slice(-60);
        }
        // AI 日记：每 3 回合触发一次（女主 + 男主双视角）
        E._diaryCounter = (E._diaryCounter || 0) + 1;
        if (E._diaryCounter >= 3) {
          E._diaryCounter = 0;
          generateEntSimDiary(); // 异步，不阻塞
          generateEntSimDiaryHis(); // 男主视角日记
        }
        // 男主视角碎片解锁（好感 40/60/80）
        var aff = E.affection || 0;
        var unlocked = E._malePOVUnlocked || {};
        [40, 60, 80].forEach(function(threshold) {
          if (aff >= threshold && !unlocked[threshold]) {
            unlocked[threshold] = true;
            E._malePOVUnlocked = unlocked;
            // 异步生成男主视角碎片，不阻塞主流程
            generateEntSimTheater('malePOV').then(function(pov) {
              if (!pov) return;
              var entry = { id: 'pov_' + threshold, type: 'malePOV', title: '好感 ' + threshold + '·男主视角', content: pov, unlockAff: threshold, unlockAt: Date.now() };
              E.theaterHistory = E.theaterHistory || [];
              E.theaterHistory.push(entry);
              saveGame();
            }).catch(function(){});
          }
        });
        saveGame();
      }
      return current;
    });
  return _entSimInflight;
  });
}

// 应用 AI 返回的副作用（恋爱主线 + 娱乐圈背景张力）
function applySideEffects(extras) {
  if (!extras) return;
  // 情敌 NPC 专属互动场景不应用 affectionDelta 到男主好感
  var isRivalOnly = extras._npcType === 'suitor' && !extras._hasMaleLead;
  if (typeof extras.affectionDelta === 'number' && !isRivalOnly) {
    extras._affReason = extras._affReason || '剧情推进';
    applyEntSimAffection(extras.affectionDelta);
  }
  if (extras.romanceBeat) recordRomanceBeat(extras.romanceBeat);
  if (extras.exposureEvent) {
    var mag = extras.exposureEvent.magnitude || 0;
    if (mag !== 0) {
      addExposure(mag, '恋情曝光事件·' + (extras.exposureEvent.label || ''));
      if (mag > 0) {
        var sev = Math.max(1, Math.min(5, Math.ceil(mag / 2)));
        applyDiscoveryBlowback(sev);
        // 曝光后生成粉丝圈反应（异步，不阻塞主流程）
        var evLabel = extras.exposureEvent.label || '未知';
        var evNote = extras.exposureEvent.note || '';
        var evDetail = '曝光事件：' + evLabel + (evNote ? '（' + evNote + '）' : '');
        generateFanReaction('曝光', evDetail).catch(function(){});
      }
    }
  }
  if (extras.npcEncounter) applyNpcEncounter(extras.npcEncounter);
  if (extras.brother) applyBrotherEffect(extras.brother);
  if (extras.secret) applySecretEffect(extras.secret);
  if (extras.endingsHint) GS.entSim.endings.hint = extras.endingsHint;
  // 约定：AI 生成的赴约提议存入状态
  if (extras.appointments && extras.appointments.length) {
    var E = GS.entSim;
    E.appointments = E.appointments || [];
    var existingPlaces = E.appointments.map(function(a) { return a.place; });
    extras.appointments.forEach(function(a) {
      if (existingPlaces.indexOf(a.place) < 0 && E.appointments.length < 3) {
        E.appointments.push({
          with: a.with || 'maleLead',
          place: a.place,
          timeHint: a.timeHint || '',
          summary: a.summary || '',
          roundCreated: E.cycle.roundTotal,
          done: false
        });
      }
    });
    saveGame();
  }
}

function applyNpcEncounter(enc) {
  var E = GS.entSim;
  var typeMap = { '情敌': 'rival', '男主情敌': 'suitor' };
  var ntype = typeMap[enc.type] || enc.type;
  var node = E.npcNetwork.nodes['npc_' + ntype];
  if (!node) return;
  if (typeof enc.intimacyDelta === 'number') node.intimacy += enc.intimacyDelta;
  if (enc.stance) node.stance = enc.stance;
  node.lastEventRound = E.cycle.roundTotal;
  if (typeof enc.exposure === 'number' && enc.exposure !== 0) {
    addExposure(enc.exposure, 'NPC·' + node.name + (enc.exposure > 0 ? '（实锤风险）' : '（缓和）'));
    if (enc.exposure > 0) {
      var npcSev = Math.max(1, Math.min(3, Math.ceil(enc.exposure / 2)));
      applyDiscoveryBlowback(npcSev);
    }
  }
  if (ntype === 'rival' && enc.stance === '退出祝福') { E.brother.rivalAware = true; E.flags.rivalQuit = true; }
  if (ntype === 'suitor' && enc.stance === '退出祝福') { node.stance = '退出祝福'; E.flags.suitorQuit = true; }
  E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'npc', text: node.name + '：' + (enc.event || '') });
}

function applyBrotherEffect(b) {
  var E = GS.entSim;
  if (b.stance) E.brother.stance = b.stance;
  if (typeof b.supportDelta === 'number') E.brother.support = Math.max(-100, Math.min(100, (E.brother.support || 0) + b.supportDelta));
  if (b.note) E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'brother', text: b.note });
}

function secretFingerprint(text) {
  var core = ['EXO','金珉锡','签售','同人文','直拍','周边','小卡','应援','photo card','专辑','海报','粉丝'];
  var found = [];
  for (var i = 0; i < core.length; i++) {
    if (text.indexOf(core[i]) >= 0) found.push(core[i]);
  }
  return found.sort().join('|');
}
function applySecretEffect(s) {
  var E = GS.entSim;
  if (s.item) {
    var dup = false;
    var key = (s.item.match(/[\u4e00-\u9fa5]{2,}/g) || []).slice(0, 4).join('');
    var fp = secretFingerprint(s.item);
    for (var i = 0; i < E.secret.items.length; i++) {
      var existKey = ((E.secret.items[i] || '').match(/[\u4e00-\u9fa5]{2,}/g) || []).slice(0, 4).join('');
      var existFp = secretFingerprint(E.secret.items[i]);
      if ((key && existKey && key === existKey) || (fp && existFp && fp === existFp)) { dup = true; break; }
    }
    if (!dup) E.secret.items.push(s.item);
  }
  if (s.foundByRival) E.secret.foundByRival = true;
}

function maybeCompress() {
  var buf = GS._entSimNarrativeBuffer || '';
  if (buf.length > 6000) {
    GS._entSimNarrativeBuffer = buf.slice(-4000);
  }
}

// 进入下一天：换天由玩家显式触发（oneHeart 式手动换天）
export function goEntSimNextDay() {
  var E = GS.entSim;
  // 每日结算用：保存昨天末的快照
  var lastPop = (E.career && typeof E.career.popularity === 'number') ? E.career.popularity : 0;
  E._lastPopSnapshot = lastPop; // P1 #3: 粉丝数涨跌方向
  var lastExp = getScandalHeat();
  var lastAff = E.affection || 0;
  // 独立游戏天数+1（不受章节跳跃影响，用于冷却/阶段推进）
  E.cycle._gameDayCount = (E.cycle._gameDayCount || 1) + 1;
  // 换天过渡：淡出 →「新的一天 DayX」→淡入
  showDayTransition(E.cycle.dayCount + 1);
  E.cycle.dayCount++;
  E.cycle.roundTotal++; // 换天才推进回合数，避免每次操作污染冷却/冷战倒计时
  // 秘密信箱：每 7-10 回合自动一封信
  if (E.cycle.roundTotal > 0 && E.cycle.roundTotal % (7 + randInt(0, 3)) === 0) {
    generateEntSimLetter(); // 异步，不阻塞
  }
  // 朋友圈自动生成：每 3-5 回合自动一条（对齐 1v1 规则）
  // 朋友圈：出道后每3-5天一次
  if (E.career.debutDay > 0) {
    E._momentCounter = (E._momentCounter || 0) + 1;
    var momentThresh = 3 + Math.floor(Math.random() * 3); // 3~5
    if (E._momentCounter >= momentThresh) {
      E._momentCounter = 0;
      generateEntSimMoment(); // 异步，不阻塞换天流程
    }
  }
  E.cycle.timeOfDay = 0; // 换天重置为上午（时段由「下一个行程」逐档推进）
  E._svtTodaySeen = []; // 每天清空 SVT 队友出场记录
  E.chapter.roundInChapter = (E.chapter.roundInChapter || 0) + 1; // 章节内回合/天数累计
  // SEVENTEEN 回归波及：每 15-20 天随机触发，持续 5-7 天
  if (E._svtComebackDays && E._svtComebackDays > 1) {
    E._svtComebackDays--;
  } else if (E._svtComebackDays === 1) {
    E._svtComebackDays = 0; // 回归期结束
  } else if (E.cycle.dayCount > 0 && E.cycle.dayCount % (15 + randInt(0, 5)) === 0) {
    E._svtComebackDays = 5 + randInt(0, 2); // 5-7 天回归期
  }
  tickRomanceTimers(); // 清理过期冷战 / 告白冷却
  rollDailyAgenda();
  generateDailyBuzz();
  // 每日自动推进聊天消息（按场景分频推）
  if (window.pushDailyChats) window.pushDailyChats();
  // [废弃] 旧每日营业事件已替换为粉丝泡泡系统，不再自动生成营业反馈
  // 泡泡连续天检查：昨天发过→streak++，否则归零
  if (E.bubble) {
    if (E.bubble.lastSentDay === E.cycle.dayCount - 1 && E.bubble.todayCount > 0) {
      E.bubble.streak = (E.bubble.streak || 0) + 1;
    } else if (E.bubble.lastSentDay < E.cycle.dayCount - 1) {
      E.bubble.streak = 0;
    }
    E.bubble.todayCount = 0;
    E.bubble.lastSentDay = E.cycle.dayCount;
  }
  // 恋情曝光累计衰减 30%（仅出道后）
  var isD = E.career.debutDay > 0;
  if (isD) E.misc.scandalHeat = Math.floor(getScandalHeat() * 0.7);
  // 公司惩罚：恋情曝光风险过高经纪人警告扣人气
  if (isD && getScandalHeat() >= 25) {
    showToast('⚠️ 经纪人警告：公司注意到你的私生活影响了工作，人气下降');
    addPopularity(-5, '公司惩罚·曝光过高经纪警告');
  }
  // P1 #9: 合约递减（每30天算1年）
  if (isD && E.cycle._gameDayCount % 30 === 0 && E.career.contractRemaining > 0) {
    E.career.contractRemaining--;
    if (E.career.contractRemaining === 1) {
      showToast('⏳ 合约还有1年到期，公司开始试探续约意向…');
    } else if (E.career.contractRemaining <= 0) {
      showToast('📜 合约已到期！需要决定续约还是独立发展');
    }
  }
  // 重置每日 NPC 互动次数
  E.misc.npcInteractionUsed = 0;
  // ===== 练习生阶段更新 + 出道触发（独立练习天数驱动，不受日历dayCount影响） =====
  if (E.career.debutDay === 0) {
    E.career._traineeDayCount = (E.career._traineeDayCount || 0) + 1;
    var newPhase = traineePhaseOf(E.career._traineeDayCount);
    if (newPhase !== E.career._lastTraineePhase) {
      E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'phase', text: '进入练习生' + (newPhase === 1 ? '前期' : newPhase === 2 ? '中期' : '后期') });
      E.career._lastTraineePhase = newPhase;
      showToast('🌱 进入练习生' + (newPhase === 1 ? '前期' : newPhase === 2 ? '中期' : '后期'));
    }
    E.career.traineePhase = newPhase;
    // P3 #15: 练习生期每日训练选项注入
    if (Math.random() < 0.4) {
      var traineeOpts = generateTraineeOptions(E);
      if (traineeOpts) {
        GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【训练选择】' + traineeOpts;
      }
    }
    // 出道触发：后期累计2-4天
    if (E.career.traineePhase === 3) {
      E.career._debutTriggerDay = (E.career._debutTriggerDay || 0) + 1;
      if (E.career._debutTriggerDay >= 2 + randInt(0, 2)) {
        // 触发"出道最终评价"事件 → 正式出道
        var debutBaseText = '今天是出道最终评价的日子。你站在评价室门口深吸一口气——这一关过后，要么出道，要么离开。';
        // 从里程碑池中随机选一条出道场景融入
        if (MILESTONE_DEBUT && MILESTONE_DEBUT.length) {
          var debutScene = MILESTONE_DEBUT[Math.floor(Math.random() * MILESTONE_DEBUT.length)];
          if (debutScene && debutScene.text) {
            debutBaseText += '（本日后续高光场景参考：' + debutScene.text + '）';
          }
        }
        GS._entSimPendingEvent = debutBaseText;
        E.career.debutDay = E.cycle.dayCount || 1;
        E.career.popularity = 0; // 出道当天人气=0，从零开始积累
        E.career.yearsActive = 0;
        E.chapter = { index: 1, name: '新人出道', icon: '🌱', desc: '刚刚出道的小糊团新人，资源少但冲劲足', roundInChapter: 0, entered: true };
        showToast('🎀 恭喜出道！你正式成为了' + (E.groupMeta ? E.groupMeta.groupName || '新人女团' : '新人女团') + '的一员！');
      }
    }
  }
  // 章节跨越检查（人气推进，只进不退）
  var chapterCrossed = checkChapterAdvance();
  // v2：吃醋值每日衰减
  tickJealousy(0);
  // v2：出道标记（提前声明，供后续所有 v5 弹窗共用）
  var isDebutPopup = (E.career && E.career.debutDay > 0);
  var contactTriggered = false;
  if (isDebutPopup) {
  if (E._maleContactTimer >= 0) E._maleContactTimer--;
  if (E._maleContactTimer <= 0 && Math.random() < (E.affection >= 60 ? 0.5 : 0.25)) {
    contactTriggered = true;
    var contactPool = CONTACT_TYPE_POOL ? CONTACT_TYPE_POOL[Math.floor(Math.random() * CONTACT_TYPE_POOL.length)] : null;
    if (contactPool && contactPool.length) {
      var contactItem = contactPool[Math.floor(Math.random() * contactPool.length)];
      if (contactItem && E.affection >= (contactItem.minAff || 0)) {
        var catLabel = contactItem.cat === 'call' ? '📞电话' : contactItem.cat === 'call_jealous' ? '📞吃醋来电' : contactItem.cat === 'msg' ? '💬私信' : contactItem.cat === 'msg_code' ? '💬暗号私信' : '👨哥哥转达';
        // 推入弹窗队列而非纯文本注入
        if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
        GS._entSimPopupQueue.push({ type:'maleContact', data: contactItem, label: catLabel });
      }
    }
    E._maleContactTimer = (E.affection >= 60) ? (1 + randInt(0, 2)) : (2 + randInt(0, 2));
  }
  // P2 #1: 奖项典礼检测
  var ceremonyResult = checkAwardCeremony(E);
  if (ceremonyResult) {
    var cerText = '【' + ceremonyResult.ceremony.name + '】' + ceremonyResult.category + (ceremonyResult.win ? '' : '（提名出席）');
    GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + cerText;
    addPopularity(ceremonyResult.popDelta, '颁奖典礼·' + ceremonyResult.ceremony.name);
    if (ceremonyResult.win) showToast('🏆 ' + ceremonyResult.ceremony.name + '获奖！人气+' + ceremonyResult.popDelta);
  }
  // P2 #7: 连续同地约会→狗仔跟拍风险
  if (E._lastDateDay && E._lastDateDay >= E.cycle.dayCount - 3) {
    addExposure(2, '狗仔跟拍·最近约会被盯上');
  }
  // P3 #6: 公司事件检测（每10天概率触发）
  if (isDebutPopup && E.cycle._gameDayCount % 10 === 0 && Math.random() < 0.3) {
    try { var compPool = COMPANY_EVENT_POOL; } catch(e) { compPool = null; }
    if (compPool && compPool.length) {
      var available = compPool.filter(function(ev) {
        if (ev.require) {
          if (ev.require.indexOf('scandalHeat>=') === 0) return getScandalHeat() >= parseInt(ev.require.split('>=')[1], 10);
          if (ev.require.indexOf('popularity>=') === 0) return (E.career.popularity||0) >= parseInt(ev.require.split('>=')[1], 10);
          if (ev.require.indexOf('contractRemaining<=') === 0) return (E.career.contractRemaining||7) <= parseInt(ev.require.split('<=')[1], 10);
          if (ev.require === 'debutDay=0') return false;
        }
        return true;
      });
      if (available.length > 0) {
        var ev = available[Math.floor(Math.random() * available.length)];
        GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【公司事件】' + ev.text;
      }
    }
  }
  }
  // P5 #20: SEVENTEEN 13人轮换每日自动出场（每2~3天1人，队内均匀轮换 + SVT_TEAMMATE_EVENT_POOL通用池模板注入prompt）
  if (E.cycle._gameDayCount - (E._svtRotationLastDay || 0) >= (2 + randInt(0, 1))) {
    E._svtRotationLastDay = E.cycle._gameDayCount;
    var tm = getRandomTeammate(E);
    if (tm) {
      var tmDesc = getTeammateDesc(tm.id);
      var tmEvent = SVT_TEAMMATE_EVENT_POOL && SVT_TEAMMATE_EVENT_POOL.length ? SVT_TEAMMATE_EVENT_POOL[randInt(0, SVT_TEAMMATE_EVENT_POOL.length - 1)] : null;
      var tmSceneHint = tmEvent ? tmEvent.text.replace(/\{name\}/g, tmDesc.split('·')[0] || '队友').replace(/\{brother\}/g, (E.brother && E.brother.name) || '哥哥') : '';
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【SVT队友出场】' + tmDesc + ' · ' + tmSceneHint.substring(0, 120);
    }
  }
  // P4 #5: 回归周期每日推进（出道后自动触发，50-80天一轮，teaser→release→打歌3周→末放）
  if (isD) {
    var cbTick = tickComebackCycle(E);
    if (cbTick) {
      showToast(cbTick.label);
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【回归周期】' + cbTick.phase + ' · ' + cbTick.label;
      // P4 #19: 打歌周每日排名结算
      if (cbTick.phase && cbTick.phase.indexOf('musicShow') === 0) {
        var rank = calculateMusicShowRank(E.career.popularity || 30);
        var rankText = rank.isWinner ? '🏆 1位！' + rank.total + '分' : rank.rank + '位 · ' + rank.total + '分';
        showToast('🎵 打歌排名：' + rankText);
        if (rank.isWinner) addPopularity(5, '打歌一位·' + cbTick.label);
        GS._entSimPendingEvent = GS._entSimPendingEvent + '\n【打歌排名】' + cbTick.label + ' → ' + rankText;
      }
    }
  }
  // P2 #10: 每日热搜/热点互动（出道后25%概率触发，含推热搜选项）
  if (isD) {
    var buzz = generateInteractiveBuzz(E);
    if (buzz) {
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【今日圈内热点】' + buzz.text + ' · 可' + buzz.cost;
    }
  }
  // v5：粉丝来信（每天1封，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastFanLetterDay || 0) >= 1 && FAN_LETTER_POOL && FAN_LETTER_POOL.length) {
    E._lastFanLetterDay = E.cycle._gameDayCount;
    var letter = FAN_LETTER_POOL[Math.floor(Math.random() * FAN_LETTER_POOL.length)];
    if (letter && letter.length) {
      var pickedLetter = letter[Math.floor(Math.random() * letter.length)];
      if (pickedLetter) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'fanLetter', data: pickedLetter }); }
    }
  }
  // v5：品牌代言（每2天概率触发，仅出道后）
  if (isDebutPopup && (E.career.popularity || 0) >= 20 && E.cycle._gameDayCount - (E._lastBrandOfferDay || 0) >= 2 && Math.random() < 0.5) {
    E._lastBrandOfferDay = E.cycle._gameDayCount;
    var brCat = BRAND_OFFER_POOL ? BRAND_OFFER_POOL[Math.floor(Math.random() * BRAND_OFFER_POOL.length)] : null;
    if (brCat && brCat.length) {
      var brItem = brCat[Math.floor(Math.random() * brCat.length)];
      if (brItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'brandOffer', data: brItem }); }
    }
  }
  // v7：通告邀约弹窗（每3天触发1次，出道后人气>=15即可，30%概率）
  if (isDebutPopup && (E.career.popularity || 0) >= 15 && E.cycle._gameDayCount - (E._lastJobOfferDay || 0) >= 3 && Math.random() < 0.3) {
    E._lastJobOfferDay = E.cycle._gameDayCount;
    var offerItem = JOB_OFFER_POOL ? JOB_OFFER_POOL[Math.floor(Math.random() * JOB_OFFER_POOL.length)] : null;
    if (offerItem && offerItem.text) {
      if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
      GS._entSimPopupQueue.push({ type:'jobOffer', data: offerItem });
    }
  }
  // v5：发布作品CD倒计时（上限3天）
  if (E._releaseCD > 3) E._releaseCD = 3;
  if (E._releaseCD > 0) E._releaseCD--;
  // 清空隔日未处理的邀约
  if (GS._entSimPendingOffers) {
    var nowDay = E.cycle._gameDayCount || 1;
    var keys = Object.keys(GS._entSimPendingOffers);
    for (var ki = 0; ki < keys.length; ki++) {
      if (GS._entSimPendingOffers[keys[ki]] && GS._entSimPendingOffers[keys[ki]].day !== nowDay) delete GS._entSimPendingOffers[keys[ki]];
    }
  }
  // v5：季度颁奖（每4天触发1次，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastAwardDay || 0) >= 4 && E.cycle._gameDayCount >= 8 && Math.random() < 0.5) {
    E._lastAwardDay = E.cycle._gameDayCount;
    var awardTypes = ['newcomer', 'popularity', 'stage'];
    var at = E.cycle.dayCount <= 20 ? 'newcomer' : awardTypes[Math.floor(Math.random() * 3)];
    var awardPool = AWARD_POOL ? AWARD_POOL.filter(function(a) { return a.type === at; }) : [];
    if (awardPool.length) {
      var aw = awardPool[Math.floor(Math.random() * awardPool.length)];
      if (aw) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'award', data: aw }); }
    }
  }
  // v5：综艺通告（每2天，人气≥25，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastVarietyDay || 0) >= 2 && (E.career.popularity || 0) >= 25 && Math.random() < 0.5 && VARIETY_SHOW_POOL && VARIETY_SHOW_POOL.length) {
    E._lastVarietyDay = E.cycle._gameDayCount;
    var vItem = VARIETY_SHOW_POOL[Math.floor(Math.random() * VARIETY_SHOW_POOL.length)];
    if (vItem && vItem.length) vItem = vItem[Math.floor(Math.random() * vItem.length)];
    if (vItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'variety', data: vItem }); }
  }
  // v5：Dispatch爆料（每3天，恋情曝光风险≥5即暗涌，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastDispatchDay || 0) >= 3 && getScandalHeat() >= 5 && Math.random() < 0.4 && DISPATCH_POOL && DISPATCH_POOL.length) {
    E._lastDispatchDay = E.cycle._gameDayCount;
    var dItem = DISPATCH_POOL[Math.floor(Math.random() * DISPATCH_POOL.length)];
    if (dItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'dispatch', data: dItem }); }
  }
  // v5：杂志画报（每3天，人气≥40，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastMagazineDay || 0) >= 3 && (E.career.popularity || 0) >= 40 && Math.random() < 0.4 && MAGAZINE_POOL && MAGAZINE_POOL.length) {
    E._lastMagazineDay = E.cycle._gameDayCount;
    var mItem = MAGAZINE_POOL[Math.floor(Math.random() * MAGAZINE_POOL.length)];
    if (mItem && mItem.length) mItem = mItem[Math.floor(Math.random() * mItem.length)];
    if (mItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'magazine', data: mItem }); }
  }
  // v5：绯闻/恋爱说（每3天，好感≥50+恋情曝光风险≥10即升温，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastRumorDay || 0) >= 3 && (E.affection || 0) >= 50 && getScandalHeat() >= 10 && Math.random() < 0.4 && RUMOR_POOL && RUMOR_POOL.length) {
    E._lastRumorDay = E.cycle._gameDayCount;
    var rItem = RUMOR_POOL[Math.floor(Math.random() * RUMOR_POOL.length)];
    if (rItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'rumor', data: rItem }); }
  }
  // v5：私生骚扰检测（人气≥25后每天8%概率，5天冷却，仅出道后）
  if (isDebutPopup && (E.career.popularity || 0) >= 25 && E.cycle._gameDayCount - (E._lastSasaengDay || 0) >= 5 && Math.random() < 0.08 && CHAT_SASAENG && CHAT_SASAENG.length) {
    E._lastSasaengDay = E.cycle._gameDayCount;
    var sItem = CHAT_SASAENG[Math.floor(Math.random() * CHAT_SASAENG.length)];
    if (sItem) GS._entSimSasaengMsg = sItem;
  }
  // v5：签售会（每4天，人气≥15，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastFansignDay || 0) >= 4 && (E.career.popularity || 0) >= 15 && Math.random() < 0.45 && FANSIGN_POOL && FANSIGN_POOL.length) {
    E._lastFansignDay = E.cycle._gameDayCount;
    var fItem = FANSIGN_POOL[Math.floor(Math.random() * FANSIGN_POOL.length)];
    if (fItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'fansign', data: fItem }); }
  }
  // v5：演唱会/大型演出（每6天，人气≥50，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastConcertDay || 0) >= 6 && (E.career.popularity || 0) >= 50 && Math.random() < 0.35 && CONCERT_POOL && CONCERT_POOL.length) {
    E._lastConcertDay = E.cycle._gameDayCount;
    var cItem = CONCERT_POOL[Math.floor(Math.random() * CONCERT_POOL.length)];
    if (cItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'concert', data: cItem }); }
  }
  // v5：回归周期（每5天，人气≥35，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastComebackDay || 0) >= 5 && (E.career.popularity || 0) >= 35 && Math.random() < 0.35 && COMEBACK_CYCLE_POOL && COMEBACK_CYCLE_POOL.length) {
    E._lastComebackDay = E.cycle._gameDayCount;
    var cbItem = COMEBACK_CYCLE_POOL[Math.floor(Math.random() * COMEBACK_CYCLE_POOL.length)];
    if (cbItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'comeback', data: cbItem }); }
  }
  // v5：打歌节目（每3天，人气≥20，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastMusicShowDay || 0) >= 3 && (E.career.popularity || 0) >= 20 && Math.random() < 0.4 && MUSIC_SHOW_POOL && MUSIC_SHOW_POOL.length) {
    E._lastMusicShowDay = E.cycle._gameDayCount;
    var msItem = MUSIC_SHOW_POOL[Math.floor(Math.random() * MUSIC_SHOW_POOL.length)];
    if (msItem) { if (!GS._entSimPopupQueue) GS._entSimPopupQueue = []; GS._entSimPopupQueue.push({ type:'musicShow', data: msItem }); }
  }
  // v5：事业挫折（每5天，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastSetbackDay || 0) >= 5 && Math.random() < 0.3 && CAREER_SETBACKS && CAREER_SETBACKS.length) {
    var phase = E.chapter.roundInChapter < 10 ? 0 : E.chapter.roundInChapter < 20 ? 1 : E.chapter.roundInChapter < 30 ? 2 : 3;
    var sbPool = CAREER_SETBACKS.filter(function(s) { return (!s.phase || s.phase === phase); });
    if (sbPool.length) {
      E._lastSetbackDay = E.cycle._gameDayCount;
      var sbItem = sbPool[Math.floor(Math.random() * sbPool.length)];
      if (sbItem && sbItem.text) {
        if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
        GS._entSimPopupQueue.push({ type:'setback', data: sbItem });
      }
    }
  }
  // v5：每日营业事件（DAILY_ENGAGEMENT_POOL，每天40%概率，仅出道后）
  if (isDebutPopup && Math.random() < 0.4 && DAILY_ENGAGEMENT_POOL && DAILY_ENGAGEMENT_POOL.length) {
    var deItem = DAILY_ENGAGEMENT_POOL[Math.floor(Math.random() * DAILY_ENGAGEMENT_POOL.length)];
    if (deItem) {
      if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
      GS._entSimPopupQueue.push({ type:'dailyEngage', data: deItem });
    }
  }
  // v5：日记条目（每3天自动生成一条日记）
  if (E.cycle._gameDayCount - (E._lastDiaryDay || 0) >= 3 && Math.random() < 0.6) {
    E._lastDiaryDay = E.cycle._gameDayCount;
    if (!E._diaryEntries) E._diaryEntries = [];
    E._diaryEntries.push({ day: E.cycle.dayCount, timestamp: Date.now() });
  }
  // v6：日程事件统一结算（代言/综艺/画报/CD）
  var E = GS.entSim;
  var today = E.cycle.dayCount;
  var sched = E._scheduledEvents || [];
  for (var si = sched.length - 1; si >= 0; si--) {
    var se = sched[si];
    if (se.targetDay > today) continue;
    if (se.targetDay === today && !se.done) {
      // 今天到达 → 注入prompt中让AI生成工作剧情
      var typeLabel = se.type === 'variety' ? '综艺录制' : se.type === 'brand' ? '代言拍摄' : se.type === 'magazine' ? '画报拍摄' : '作品发布';
      var d = se.data;
      GS._entSimPendingEvent = '【今日工作】' + typeLabel + '：' + (se.text || '') + '。请在本日剧情中生成女主角参与此工作的完整场景（约200-300字），包含工作细节与可能的情感交织。完成后自动结算人气+' + (d.pop || 2) + (d.exp ? '、曝光+' + d.exp : '') + '。';
      se.done = true;
      GS.entSim.career.popularity = Math.max(0, Math.min(100, (GS.entSim.career.popularity || 0) + (d.pop || 0)));
      if (d.exp) addCareerPublicity(d.exp, typeLabel + '·' + (d.show || d.brand || d.mag || d.t));
      E.careerHistory.push({ round: E.cycle.roundTotal, day: today, type: se.type + '_done', text: typeLabel + '完成：' + (d.show || d.brand || d.mag || d.t) + '，人气+' + (d.pop || 0) });
      showToast(typeLabel + '完成！人气+' + (d.pop || 0));
    }
    // 清理超过5天的已完成事件
    if (se.done && today - se.targetDay > 5) {
      sched.splice(si, 1);
    }
  }
  // 兼容旧存档：迁移旧的 _ongoingVariety/_ongoingMagazine 到新队列
  if (E._ongoingVariety) {
    sched.push({ id: 'migrate_variety', type: 'variety', data: E._ongoingVariety, targetDay: today + (E._ongoingVariety.daysLeft || 1), text: '综艺录制：' + (E._ongoingVariety.show || ''), loc: '电视台/摄影棚', done: false });
    E._ongoingVariety = null;
  }
  if (E._ongoingMagazine) {
    sched.push({ id: 'migrate_magazine', type: 'magazine', data: E._ongoingMagazine, targetDay: today + (E._ongoingMagazine.daysLeft || 1), text: '画报拍摄：' + (E._ongoingMagazine.mag || ''), loc: '摄影棚', done: false });
    E._ongoingMagazine = null;
  }
  // v2：纪念日检查（每30天倍数toast提醒）
  var anniversary = checkAnniversaries();
  if (anniversary) {
    setTimeout(function() {
      try { showToast('🎉 纪念日提醒：' + anniversary.icon + ' ' + anniversary.label + ' 已过去 ' + anniversary.days + ' 天啦～'); } catch(e) {}
    }, 300);
  }
  // 哥哥事件 15% + 男主主动 10% + 系统每日事件池
  maybeBrotherEvent();
  // 旧男主主动（已被倒计时替代），仅当倒计时未触发时兜底
  if (!contactTriggered) maybeMaleLeadInitiative();
  checkOneHeartEvents();
  // 章节跨越提示：如果刚进入新章节，追加到待触发事件前
  if (chapterCrossed && E.chapter && E.chapter.entered) {
    showChapterTransition(E.chapter.icon || '', E.chapter.name || '', E.chapter.desc || '');
    var chMsg = '【章节跨越】你进入了「' + (E.chapter.icon || '') + ' ' + (E.chapter.name || '') + '」：' + (E.chapter.desc || '新阶段带来新的机会与风险。') + ' 注意周围目光和粉丝情绪正在变化。';
    GS._entSimPendingEvent = (GS._entSimPendingEvent ? chMsg + '\n' + GS._entSimPendingEvent : chMsg);
    E.chapter.entered = false;
  }
  saveGame();
  // 双系统状态同步：将 entSim 状态同步到 1v1 GS 字段（确保两套系统一致）
  syncOneHeartState();
  // 每日结算弹窗：显示今日变化（非第一天的第一个回合）
  if (E.cycle.dayCount > 1) {
    showDailySettlement(E, lastPop, lastExp, lastAff);
  }
  // 压缩昨日记忆（AI 提取，慢不怕），随后清空当天剧情并生成新一天开场
  return compressEntSimMemory().then(function() {
    // 换天后清空旧剧情，新一天从零开始
    GS._entSimCurrent = null;
    GS._entSimNarrativeBuffer = '';
    saveGame();
    return generateEntSimRound('phase', { nextDayOpening: true });
  });
}

// 玩家选择
export function handleEntSimChoice(optionIndex, choiceText) {
  return generateEntSimRound('choice', { choiceText: choiceText });
}

// 自由输入
export function handleEntSimFreeInput(text) {
  return generateEntSimRound('free', { freeText: text });
}

// 懒生成男主种子事件（首次互动后的回溯存档，供告白/吃醋/心动时刻引用）
// 不在开局立即生成——开局两人只是陌生人/前辈后辈，种子事件应在有互动基础后才产生
export function ensureSeedEvent() {
  var E = GS.entSim;
  if (E.romance.seedEvent) return Promise.resolve();
  // 延迟门槛：必须好感 >= 5 或已推进 >= 3 回合，避免开局就预设男主心动
  if ((E.affection || 0) < 5 && (E.cycle.roundTotal || 0) < 3) return Promise.resolve();
  var ml = E.romance.maleLead;
  var mlName = ml ? ml.name : '男主';
  // 兜底场景（AI 失败/为空时使用，保证 seedEvent 永不空、不污染回溯锚点）
  var fallback = '练习室里，她练习间隙随口哼起一段旋律，' + mlName + '推门进来拿水时听见，脚步顿了半拍——她哼的是时下正流行的副歌，跑调却自得其乐。他没出声，只是后来在自己的歌单里悄悄把那首歌置了顶。那天之后，他总会不自觉多留意她一眼。';
  var sysPrompt = '你是文风细腻的恋爱小说写手，只输出场景正文。';
  var prompt = '为男主「' + mlName + '」写一段约 200 字的场景，描写他对女主暗暗上心的契机。注意：男主就是「' + mlName + '」，绝不要写成其他任何人——尤其不要写成李知勋、权顺荣、或其他 SEVENTEEN 成员。场景可以是女主某句话、某个舞台动作、被哥哥吐槽的瞬间、或某个不经意的相处让他心动。要具体、可被后续剧情回溯引用，用「她」指代女主、不出现女主姓名。直接输出场景正文，不要标题、不要解释、不要选项。';
  return generateWithRetry(sysPrompt, prompt, { temperature: 0.8, maxTokens: 400, plainText: true, skipValidate: true })
    .then(function(res) {
      var txt = (res && res.raw) ? res.raw.trim() : '';
      // 代码层校验：seedEvent 必须包含男主名，若含情敌名但不含男主名则丢弃
      var suitor = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor'];
      var suitorName = suitor ? suitor.name : '';
      if (txt && suitorName && txt.indexOf(suitorName) >= 0 && txt.indexOf(mlName) < 0) {
        console.warn('[seedEvent] 检测到情敌名"' + suitorName + '"但无男主名"' + mlName + '"，使用兜底');
        txt = '';
      }
      E.romance.seedEvent = txt.length >= 40 ? txt : fallback;
      saveGame();
    })
    .catch(function() { E.romance.seedEvent = fallback; saveGame(); });
}

// 触发事件（扩展 opts.advanceTime 可强制推进时段，默认不推进）
export function triggerEntSimEvent(eventText, opts) {
  var extra = Object.assign({ eventText: eventText }, opts || {});
  return generateEntSimRound('event', extra);
}

// 自由推演：生成一段不修改状态的 if 分支，供玩家参考
export function triggerEntSimHypothetical(prompt) {
  return generateEntSimRound('hypothetical', { hypotheticalText: prompt || '另一种可能', noSideEffects: true });
}

// 继续主线（拉回主线）：推进自己的时段 上午→下午→夜晚→换天
export function continueEntSimMain() {
  var E = GS.entSim;
  var slot = E.cycle.timeOfDay || 0;
  // 夜晚过后 → 进入下一天
  if (slot >= 2) {
    return goEntSimNextDay();
  }
  // 推进时段
  var newSlot = slot + 1;
  E.cycle.timeOfDay = newSlot;
  E.cycle.roundTotal = (E.cycle.roundTotal || 0) + 1;
  saveGame();
  var slotLabel = ['上午', '下午', '夜晚'][newSlot];
  return generateEntSimRound('phase', {
    timeSlot: newSlot,
    timeSlotLabel: slotLabel,
    freeSlot: newSlot >= 2
  });
}

// 进入终局评估（强制检查条件：好感≥100 且距甜度峰值≥10轮）
export function enterEntSimEnding() {
  var E = GS.entSim;
  if (!E || E.affection < 100 || ((E.cycle.roundTotal - (E.flags.sweetMaxRound || 0)) < 10)) {
    return null;
  }
  var ending = evaluateEnding();
  return ending;
}

// 生成 AI 结局叙事（纯文本 800-1200 字），存入 GS._entSimEndingNarrative
export async function generateEntSimEndingNarrative(ending) {
  var E = GS.entSim;
  if (!E || !ending) return;
  var sys = buildEntSimSystemPrompt();
  var tone = ENDING_TONE[ending.type] || '平静收束，点到为止。';
  var user = [
    '【任务】生成一段 AI 结局叙事（纯文本，不要 JSON，不要选项，800-1200 字）。',
    '【结局类型】' + ending.type + '（' + (ending.label || '') + '）',
    '【结局核心】' + (ending.text || ''),
    '【叙事基调】' + tone,
    '【必须收束的故事线】',
    '1. 与男主（用"他"代称）的感情走向。',
    '2. 哥哥（' + (E.brother && E.brother.name ? E.brother.name : '哥哥') + '）的态度变化。',
    '3. 女团事业「小糊团」当前人气 ' + popularity() + ' / 事业等级 ' + careerLevel() + '。',
    '4. 地下恋的曝光结局（按舆论热度决定公开或塌房）。',
    '【要求】以女主第一人称视角沉浸式收尾，呼应关键事件（见下方记忆摘要），情感真实、允许留白，不要流水账。',
    '【记忆摘要】\n' + buildMemorySnapshot(),
    '直接输出纯文本结局叙事。'
  ].join('\n');
  try {
    var res = await generateWithRetry(sys, user, { plainText: true, skipValidate: true, maxTokens: 2200, temperature: 0.95, sceneType: 'ending' });
    GS._entSimEndingNarrative = res.raw || '';
  } catch (e) {
    GS._entSimEndingNarrative = '（结局叙事生成失败，请查看结局概要）\n\n' + (ending.text || '');
  }
  saveGame();
}

// 走向结局：AI 生成叙事 → 返回 ending（由 ui.onEnding 弹卡片）
export async function runEntSimEnding() {
  var ending = enterEntSimEnding();
  if (!ending) return null;
  await generateEntSimEndingNarrative(ending);
  // 保存到结局画廊（localStorage，最多10条）
  saveEndingToGallery(ending);
  return ending;
}

// 结局画廊持久化
function saveEndingToGallery(ending) {
  try {
    var key = 'es_endings_gallery';
    var raw = localStorage.getItem(key);
    var gallery = raw ? JSON.parse(raw) : [];
    gallery.unshift({
      type: ending.type || 'unknown',
      label: ending.label || '',
      icon: ending.icon || '🎬',
      date: new Date().toISOString().slice(0, 10),
      text: (ending.text || '').slice(0, 100)
    });
    if (gallery.length > 10) gallery = gallery.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(gallery));
  } catch(e) {}
}

// 女团队友支线：点击某位队友触发专属互动事件
export function triggerTeammateEvent(member) {
  if (!member) return;
  var flavor = TEAMMATE_FLAVOR[member.roleTag] || '队友找你聊了聊近况。';
  var extraNote = '请让队友「' + member.name + '（' + member.roleTag + '）」出场，' + flavor +
    '。剧情围绕女团日常展开，男主/哥哥/情敌的互动自然穿插，不要喧宾夺主。';
  triggerEntSimEvent('队友·' + member.name + '（' + member.roleTag + '）', { extraNote: extraNote });
}

// SEVENTEEN 队友探班：从事件池随机抽取 flavor，记录今日出场，生成 AI 叙事
export function triggerSVTTeammateEvent(memberId) {
  var E = GS.entSim;
  var prof = SVT_TEAMMATE_PROFILES.find(function(p) { return p.id === memberId; });
  if (!prof) return;
  // 记录今日出场（防同一人多次出场，prompt 中注入）
  E._svtTodaySeen = E._svtTodaySeen || [];
  if (E._svtTodaySeen.some(function(x) { return x.id === prof.id; })) {
    // 同一天可再见，但不重复记录
  } else {
    E._svtTodaySeen.push({ id: prof.id, name: prof.name, desc: prof.desc });
    saveGame();
  }
  // 从事件池随机抽取，注入成员名
  var pool = SVT_TEAMMATE_EVENT_POOL.length ? SVT_TEAMMATE_EVENT_POOL : [{ vibe: '日常', text: '你在公司碰到了{{name}}，两人简单聊了几句' }];
  var ev = pool[randInt(0, pool.length - 1)];
  var sceneText = ev.text.replace(/\{\{name\}\}/g, prof.name);
  var extraNote = '请让 SEVENTEEN 队友「' + prof.emoji + prof.name + '（' + prof.desc + '）」出场，场景提示：' + sceneText +
    '。写约 250-400 字的自然互动，体现这位成员' + prof.desc + '的性格特点，不抢男主戏，作为娱乐圈日常点缀。';
  triggerEntSimEvent('SVTEAM·' + prof.name, { extraNote: extraNote, scene: ev.vibe });
  saveGame();
}

// 重新开始一局（结局卡片调用）：重建 entSim 状态并重新渲染
export function restartEntSim() {
  initEntSimState();
  GS._entSimCurrent = null;
  GS._entSimAutoTries = 0;
  if (typeof window !== 'undefined' && window.__renderEntSim) window.__renderEntSim();
}

// 通用类型生成（聊天/朋友圈/剧场/约会/告白）：不推进时段、不写主剧情缓冲
function runEntSimType(type, extra, storeResult) {
  // ═══ 测试模式：绕过AI，返回轻量内容 ═══
  if (window.__ENT_SIM_TEST) {
    var mock = '';
    if (type === 'chat') {
      var chatReplies = [
        '嗯，刚结束训练。你呢？', '今天练习很累，但想到明天的新编舞又有点兴奋。',
        '刚才经纪人说下周可能有新行程，但还没定。', '我在吃拉面——你要不要也来一包？',
        '刚才看到你发的动态了，拍得不错嘛。', '别太累着自己，记得休息。',
        '你上次说的那个录音棚——我帮你去问了，下周有空档。',
        '哥哥今天又唠叨我了，说让你管着我点——你站在谁那边？',
        '刚听到一首歌，副歌部分让我想起你了。', '明天见个面？我有东西想给你。'
      ];
      mock = chatReplies[Math.floor(Math.random() * chatReplies.length)];
      if (extra && extra.msg) {
        var userMsg = extra.msg.substring(0, 20);
        mock = '(回复"' + (userMsg.length > 15 ? userMsg.substring(0,15)+'...' : userMsg) + '") ' + mock;
      }
    } else if (type === 'dating') {
      mock = '你们在便利店坐了一会儿。他买了你最喜欢的饮料——没有问你要什么，但他记得。外面下雨了，你们都没带伞——于是又多待了十五分钟。';
    } else if (type === 'theater' || type === 'diary' || type === 'diaryHis') {
      mock = '(测试模式·文本占位)';
    } else {
      mock = '(测试模式: ' + type + ')';
    }
    if (storeResult) storeResult(mock, { narrative: mock, options: [] });
    return Promise.resolve(mock);
  }
  var sys = buildEntSimSystemPrompt();
  var user = buildEntSimUserMessage(type, extra);
  var maxT = (type === 'theater') ? 1200 : 700;
  // 朋友圈/聊天/剧场不需要 options 和长文校验，跳过校验
  var skipVal = type === 'chat' || type === 'theater' || type === 'diary' || type === 'diaryHis'; // momentDual 需要 JSON 解析，不走 plainText
  return generateWithRetry(sys, user, { temperature: 0.9, maxTokens: maxT, plainText: skipVal, skipValidate: skipVal })
    .then(function(res) {
      var raw = (res && res.raw) ? res.raw : '';
      var parsed = parseEntSimResponse(raw);
      var narrative = parsed.narrative || '';
      if (storeResult) storeResult(narrative, parsed);
      return narrative;
    })
    .catch(function() { return ''; });
}

// 聊天：男主按人设回复，不推进时段
export function generateEntSimChat(msg) {
  // ═══ 测试模式：用池子预设对话 ═══
  if (window.__ENT_SIM_TEST) {
    var E = GS.entSim;
    var aff = E.affection || 0;
    // 从 CHAT_MALE_LEAD 池子筛选符合好感条件的对话条目
    var chatPool = (typeof window.__getChatPool === 'function') ? window.__getChatPool() : [];
    if (!chatPool.length) {
      // 简易兜底：取 CHAT_MALE_LEAD 的子池
      try {
        var allChats = [];
        var chatKeys = ['greet','flirt','jealous','worry','night','secret'];
        for (var ki=0;ki<chatKeys.length;ki++) {
          var p = CHAT_MALE_LEAD && CHAT_MALE_LEAD[chatKeys[ki]];
          if (p) allChats = allChats.concat(p);
        }
        chatPool = allChats.filter(function(c) { return c && (!c.minAff || aff >= c.minAff); });
      } catch(e) { chatPool = []; }
    }
    if (chatPool.length) {
      var entry = chatPool[Math.floor(Math.random() * chatPool.length)];
      if (entry && entry.t && entry.options && entry.options.length) {
        // 把 options 存起来，供 UI 渲染预设回复按钮
        GS._entSimChatOptions = entry.options.map(function(o) { return o.t; });
        return Promise.resolve(entry.t);
      }
    }
    return Promise.resolve('最近过得怎么样？练习还好吗？');
  }
  var E = GS.entSim;
  // 每日限制：20条
  var today = E.cycle.dayCount || 1;
  E._chatAffDay = E._chatAffDay || 0;
  if (E._chatAffDay !== today) { E._chatAffDay = today; E._chatAffCount = 0; }
  E._chatAffCount = E._chatAffCount || 0;
  if (E._chatAffCount >= 20) {
    if (typeof showToast === 'function') showToast('今天聊得够多了，明天再聊吧');
    return Promise.resolve('dailyLimit');
  }
  return runEntSimType('chat', { msg: msg }, function(narrative) {
    E._chatAffCount++;
    // 200字按句截断
    var nar = narrative || '';
    if (nar.length > 200) {
      var cut = nar.slice(0, 200);
      var lastPeriod = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('？'));
      nar = lastPeriod > 100 ? cut.slice(0, lastPeriod + 1) : cut;
    }
    // JSON容错
    if (typeof nar === 'object') nar = nar.content || nar.reply || nar.text || nar.raw || '（嗯。）';
    if (typeof nar !== 'string') nar = '（嗯。）';
    E.chatHistory.push({ role: 'user', content: msg });
    E.chatHistory.push({ role: 'ai', content: nar });
    if (E.chatHistory.length > 40) E.chatHistory = E.chatHistory.slice(-40);
    // 每5条+1好感，每天上限3次
    if (E._chatAffCount % 5 === 0) {
      var affGained = Math.min(Math.floor(E._chatAffCount / 5), 3) - (E._chatAffGained || 0);
      if (affGained > 0) {
        E._chatAffGained = (E._chatAffGained || 0) + affGained;
        E.affection = Math.max(0, Math.min(100, (E.affection || 0) + affGained));
      }
    }
    saveGame();
  });
}

// 日记：AI 生成完整日记（对齐 1v1，每 3 回合自动触发）
export function generateEntSimDiary() {
  return runEntSimType('diary', {}, function(narrative) {
    if (!narrative || narrative.length < 20) return;
    var E = GS.entSim;
    E.diary = E.diary || [];
    E.diary.push({ day: E.cycle.dayCount || 1, content: narrative, ts: Date.now() });
    if (E.diary.length > 30) E.diary = E.diary.slice(-30);
    saveGame();
  });
}

// 男主日记：AI 生成男主视角日记（对齐 1v1 双视角）
export function generateEntSimDiaryHis() {
  return runEntSimType('diaryHis', {}, function(narrative) {
    if (!narrative || narrative.length < 20) return;
    var E = GS.entSim;
    E.diaryHis = E.diaryHis || [];
    E.diaryHis.push({ day: E.cycle.dayCount || 1, content: narrative, ts: Date.now() });
    if (E.diaryHis.length > 30) E.diaryHis = E.diaryHis.slice(-30);
    saveGame();
  });
}

// 秘密信箱：男主第一人称私密信（对齐1v1信件系统）
export function generateEntSimLetter() {
  return runEntSimType('letter', {}, function(narrative) {
    if (!narrative || narrative.length < 20) return;
    var E = GS.entSim;
    E.letters = E.letters || [];
    E.letters.push({ round: E.cycle.roundTotal || 1, content: narrative, ts: Date.now(), read: false });
    if (E.letters.length > 30) E.letters = E.letters.slice(-30);
    saveGame();
  });
}

// 重新生成：回滚最近一段剧情用相同条件重新生成
export function handleEntSimRegenerate() {
  var cur = GS._entSimCurrent;
  if (!cur) { if (typeof showToast === 'function') showToast('没有可重新生成的内容'); return Promise.resolve(); }
  var choiceText = cur.choiceText || cur.freeText || '';
  GS._entSimCurrent = null;
  if (choiceText) {
    return generateEntSimRound('choice', { choiceText: choiceText, regenerate: true });
  }
  return continueEntSimMain().then(function() {});
}

// 朋友圈：双人JSON模式（对齐1v1）- 女主+男主各一条，含回复链/情敌暗斗
export function generateEntSimMoment() {
  var E = GS.entSim;
  var ml = (E.romance && E.romance.maleLead) || {};
  var mlName = ml.name || '他';
  var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '我';
  var extra = {};
  // 情敌暗斗彩蛋：50%概率让AI附带情敌评论
  if (Math.random() < 0.5) {
    var E_ = GS.entSim;
    var rvName = (E_.rival && E_.rival.name) || (E_.romance && E_.romance.maleLead && E_.romance.maleLead.name) || '';
    if (rvName) extra.rivalComment = true;
  }
  return runEntSimType('momentDual', extra, function(narrative) {
    if (!narrative) return;
    var json = safeParseJson(narrative);
    if (!json) return;
    var ts = Date.now();
    var mom = E.moments = E.moments || [];
    // 女主动态
    if (json.mine && (json.mine.post || json.mine.reply)) {
      mom.push({
        id: ts + '_mine', name: hpName, isHeroine: true,
        post: json.mine.post || json.mine.reply || '',
        reply: json.mine.post ? (json.mine.reply || '') : '',
        replyBack: json.mine.replyBack || '',
        photo: json.mine.photo || '',
        type: json.mine.type || '日常',
        rivalComment: json.mine.rivalComment || '',
        ts: ts, liked: false
      });
    }
    // 男主动态
    if (json.his && (json.his.post || json.his.reply)) {
      mom.push({
        id: ts + 1 + '_his', name: mlName, isHeroine: false,
        post: json.his.post || json.his.reply || '',
        reply: json.his.post ? (json.his.reply || '') : '',
        replyBack: json.his.replyBack || '',
        photo: json.his.photo || '',
        type: json.his.type || '日常',
        rivalComment: json.his.rivalComment || '',
        ts: ts, liked: false
      });
    }
    saveGame();
  });
}

// 剧场番外：按主题生成，失败重试
export function generateEntSimTheater(themePrompt) {
  return runEntSimType('theater', { themePrompt: themePrompt }, function(narrative) {
    if (narrative) GS.entSim.theaterHistory.push({ id: Date.now(), title: themePrompt, type: themePrompt, content: narrative, ts: Date.now() });
    saveGame();
  });
}

// 约会：好感度 >= 30 可约，地点不同曝光风险不同（他家+3 / 车里0等）
export function initiateEntSimDate(venue) {
  var E = GS.entSim;
  // P2 #17: 团活冲突检测
  var conflict = checkScheduleConflict(E);
  if (conflict) {
    showScheduleConflictModal(conflict, venue);
    return;
  }
  // 约会冷却检查：连约2次强制冷却3天
  var today = E.cycle._gameDayCount;
  if (E.romance._lastDateDay && today - E.romance._lastDateDay <= 0) return Promise.reject(new Error('今天已经约过啦'));
  if (E.romance._dateConsecutive >= 2) {
    var cooldownRemain = 3 - (today - (E.romance._lastDateDay || 0));
    if (cooldownRemain > 0) return Promise.reject(new Error('约会冷却中，还需 ' + cooldownRemain + ' 天'));
    E.romance._dateConsecutive = 0;
  }
  if (E.affection < 30) return Promise.reject(new Error('好感度不足 30，暂时约不到他～'));
  // 更新冷却状态
  if (E.romance._lastDateDay && today - E.romance._lastDateDay === 1) {
    E.romance._dateConsecutive = (E.romance._dateConsecutive || 0) + 1;
  } else if (today - (E.romance._lastDateDay || 0) > 1) {
    E.romance._dateConsecutive = 1;
  }
  E.romance._lastDateDay = today;
  var venueName = typeof venue === 'object' ? venue.name : venue;
  var venueExp = (typeof venue === 'object' && typeof venue.exposure === 'number') ? venue.exposure : 1;
  var venueDesc = (typeof venue === 'object' && venue.desc) ? venue.desc : '';
  return runEntSimType('date', { dateVenue: venueName }, function(narrative, parsed) {
    applyEntSimAffection(3);
    addExposure(venueExp, '约会·' + (venueName || ''));
    E.romance.dateCount++;
    // P2 #7: 记录约会地点供狗仔追踪
    E._lastDateDay = E.cycle.dayCount;
    E._lastDateVenue = venueName;
    GS._entSimCurrent = { narrative: narrative, options: parsed.options || [], extras: { dateVenue: venueName }, type: 'date' };
    saveGame();
  });
}

// 告白：好感度 >= 80 触发，专属剧情 + 3 选项
export function generateEntSimConfession() {
  return runEntSimType('confess', {}, function(narrative, parsed) {
    GS._entSimCurrent = { narrative: narrative, options: parsed.options || ['接受他的心意', '拒绝', '再想想（拖延）'], extras: {}, type: 'confess' };
    saveGame();
  });
}

// UI 取当前回合
export function getEntSimCurrent() {
  return GS._entSimCurrent || { narrative: '', options: [], extras: {} };
}

// ── 换天过渡遮罩 ──
function showDayTransition(dayNum) {
  try {
    if (typeof document === 'undefined') return;
    var overlay = document.createElement('div');
    overlay.className = 'es-day-transition';
    overlay.innerHTML = '<span class="es-day-trans-text">新的一天 · Day' + dayNum + '</span>';
    document.body.appendChild(overlay);
    setTimeout(function() {
      overlay.classList.add('fade-out');
      setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 400);
    }, 600);
  } catch(e) {}
}

// ── 章节跨越全屏光效 ──
function showChapterTransition(icon, name, desc) {
  try {
    if (typeof document === 'undefined') return;
    var glow = document.createElement('div');
    glow.className = 'es-chapter-glow';
    document.body.appendChild(glow);
    var text = document.createElement('div');
    text.className = 'es-chapter-text';
    text.textContent = (icon || '') + ' ' + (name || '');
    document.body.appendChild(text);
    setTimeout(function() {
      if (glow.parentNode) glow.parentNode.removeChild(glow);
      if (text.parentNode) text.parentNode.removeChild(text);
    }, 1600);
  } catch(e) {}
}

// P2 #17: 团活冲突检测
function checkScheduleConflict(E) {
  if (!E || !E.agenda) return null;
  var main = E.agenda.main || '';
  if (main.indexOf('打歌') >= 0 || main.indexOf('音乐') >= 0 || main.indexOf('回归') >= 0 || main.indexOf('综艺') >= 0 || main.indexOf('录制') >= 0) {
    return { groupActivity: main, desc: '今天有团活「' + main + '」，确定要翘掉去约会吗？' };
  }
  return null;
}
function showScheduleConflictModal(conflict, venue) {
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  var venueName = (typeof venue === 'object' && venue.name) ? venue.name : (venue || '');
  overlay.innerHTML = '<div class="es-stageup-card">' +
    '<div class="es-stageup-icon">⚠️</div>' +
    '<div class="es-stageup-label">日程冲突</div>' +
    '<div class="es-stageup-desc">' + (conflict.desc || '') + '</div>' +
    '<button class="primary" id="es-conflict-keep" style="margin:4px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:var(--es-text)">A. 去团活（职业优先）</button>' +
    '<button class="primary" id="es-conflict-date" style="margin:4px;background:rgba(255,100,100,.2);border:1px solid rgba(255,100,100,.3);color:var(--es-red)">B. 悄悄溜去约会</button>' +
    '</div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  document.body.appendChild(overlay);
  document.getElementById('es-conflict-keep').addEventListener('click', function() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    showToast('✅ 团活优先');
  });
  document.getElementById('es-conflict-date').addEventListener('click', function() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    doEntSimDateAfterConflict(venue);
  });
}
function doEntSimDateAfterConflict(venue) {
  var E = GS.entSim;
  var venueName = (typeof venue === 'object' && venue.name) ? venue.name : (venue || '');
  var venueExp = (typeof venue === 'object' && typeof venue.exposure === 'number') ? venue.exposure : 1;
  runEntSimType('date', { dateVenue: venueName }, function(narrative, parsed) {
    applyEntSimAffection(3);
    addExposure(venueExp + 2, '翘团活约会·' + venueName);
    E.romance.dateCount++;
    E._lastDateDay = E.cycle.dayCount;
    E._lastDateVenue = venueName;
    GS._entSimCurrent = { narrative: narrative, options: parsed.options || [], extras: { dateVenue: venueName }, type: 'date' };
    saveGame();
  });
}

// P2 #10: 每日热点互动
function generateInteractiveBuzz(E) {
  if (typeof E._buzzInteractCD !== 'number') E._buzzInteractCD = 0;
  if (E._buzzInteractCD > 0) { E._buzzInteractCD--; return null; }
  if (Math.random() > 0.25) return null;
  var pop = E.career.popularity || 0;
  var buzzes = [
    { text: '你的打歌直拍突然火了，热搜#绝美ending镜头#', cost: '推正面热搜(-3人气)', pop: +3, type: 'good' },
    { text: '有人扒出你练习生旧照，配文#颜值进化论#转发破万', cost: '不回应(冷处理)', pop: 0, type: 'neutral' }
  ];
  if (pop >= 40) buzzes.push({ text: '匿名论坛出现编造聊天记录，指控你多个暧昧对象', cost: '发律师函(-5人气)', pop: +1, type: 'bad' });
  var b = buzzes[Math.floor(Math.random() * buzzes.length)];
  E._buzzInteractCD = 4;
  return b;
}

// P3 #15: 练习生期每日训练选项
function generateTraineeOptions(E) {
  if (!E || E.career.debutDay > 0) return null;
  var opts = [
    { id:'vocal', label:'🎤 声乐训练', effect:'在练习室里练了一下午高音，嗓子哑了但进步明显' },
    { id:'dance', label:'💃 舞蹈训练', effect:'跟编舞老师扣了四个小时动作，镜子里的自己越来越同步' },
    { id:'self', label:'📝 自修创作', effect:'在工作室写歌词，写了三首demo，有一首旋律还不错' },
    { id:'rest', label:'😴 偷懒休息', effect:'悄悄溜去便利店吃冰淇淋，碰到了公司前辈给了一句忠告' }
  ];
  var o = opts[Math.floor(Math.random() * opts.length)];
  return '今天训练选择：' + o.label + ' — ' + o.effect;
}

// ── 每日结算弹窗（P0: 统一 es-stageup-card 标准样式，去重 lastEvent，硬编码颜色→CSS变量）──
function showDailySettlement(E, lastPop, lastExp, lastAff) {
  try {
    if (typeof document === 'undefined') return;
    var popDelta = ((E.career && E.career.popularity) || 0) - lastPop;
    var expDelta = getScandalHeat() - lastExp;
    var affDelta = (E.affection || 0) - lastAff;
    var popStr = popDelta !== 0 ? ('人气 <b style="color:' + (popDelta >= 0 ? 'var(--es-green)' : 'var(--es-red)') + '">' + (popDelta >= 0 ? '+' : '') + popDelta + '</b> (→' + (E.career.popularity || 0) + ')') : '人气 不变';
    var expStr = expDelta !== 0 ? ('曝光 <b style="color:' + (expDelta >= 0 ? 'var(--es-red)' : 'var(--es-green)') + '">' + (expDelta >= 0 ? '+' : '') + expDelta + '</b>') : '曝光 不变';
    var affStr = affDelta !== 0 ? ('好感 <b style="color:' + (affDelta >= 0 ? 'var(--es-green)' : 'var(--es-red)') + '">' + (affDelta >= 0 ? '+' : '') + affDelta + '</b> (→' + (E.affection || 0) + ')') : '好感 不变';
    var pop = E.career.popularity || 0;
    var pr = Math.min(5, 1 + Math.floor(pop / 30));
    var overlay = document.createElement('div');
    overlay.className = 'es-stageup-overlay';
    overlay.innerHTML = '<div class="es-stageup-card">' +
      '<div class="es-stageup-icon">📋</div>' +
      '<div class="es-stageup-label">Day ' + (E.cycle.dayCount - 1) + ' 结算</div>' +
      '<div class="es-stageup-desc">' + popStr + '<br>' + expStr + '<br>' + affStr + '<br><span style="font-size:12px;color:rgba(255,255,255,.5)">🛡 公关次数 <b style="color:var(--es-yellow)">' + pr + '</b>/5</span></div>' +
      '<button class="primary">继续</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.primary').addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  } catch(e) {}
}

// ── 粉丝泡泡：发送一条消息给粉丝 ──
export async function sendBubbleMessage() {
  var E = GS.entSim;
  if (!E || !E.bubble) return;
  if ((E.bubble.todayCount || 0) >= 5) { showToast('今天已经发够 5 条泡泡啦～明天再来吧'); return; }
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  GS._entSimGenerating = true;
  try {
    var sys = buildEntSimSystemPrompt();
    var streak = E.bubble.streak || 0;
    var sub = E.bubble.subscribers || 100;
    var user = [
      '【任务·粉丝泡泡】你正在使用泡泡（Bubble，粉丝付费订阅平台）给粉丝发消息。',
      '请生成两段内容，用 ===FAN_REPLIES=== 分隔：',
      '第一段：msgToFans — 你发了什么（30-60字，可以是自拍描述/语音内容/文字问候/日常分享）',
      '第二段：3~5条 fanReplies — 粉丝的回复（每条15-30字，仅真粉丝语气：兴奋🥹/关心💜/表白✨/催更📢/甜美评论，不要路人和黑粉）',
      '当前订阅数：' + sub + '，连续发送天数：' + streak,
      '要求：不写 JSON、不写系统说明、不写选项。直接输出内容。'
    ].join('\n');
    var res = await generateWithRetry(sys, user, { plainText: true, skipValidate: true, maxTokens: 800, temperature: 0.9, sceneType: 'bubble' });
    var fullText = res.raw || '';
    var parts = fullText.split('===FAN_REPLIES===');
    var msgToFans = (parts[0] || '').trim();
    var fanRepliesStr = (parts[1] || '').trim();
    var fanReplies = fanRepliesStr ? fanRepliesStr.split('\n').filter(function(l) { return l.trim(); }) : [];
    // 保存到历史
    E.bubble.messages = E.bubble.messages || [];
    E.bubble.messages.push({ msg: msgToFans, replies: fanReplies, day: E.cycle.dayCount, ts: Date.now() });
    E.bubble.todayCount = (E.bubble.todayCount || 0) + 1;
    E.bubble.lastSentDay = E.cycle.dayCount;
    // 人气加成（基于订阅数和连续天）
    var popBonus = 1 + Math.floor(sub / 500) + (streak >= 7 ? 3 : 0);
    popBonus = Math.min(5, popBonus);
    addPopularity(popBonus, '泡泡营业·粉丝互动（连续' + streak + '天）');
    // 订阅数动态变化
    var pop = E.career.popularity || 22;
    var subDelta = 1 + Math.floor(Math.random() * 5);
    if (pop >= 60) subDelta += Math.floor(Math.random() * 3);
    if (streak >= 7) subDelta += 2;
    if (Math.random() < 0.12) subDelta -= randInt(1, 3);
    E.bubble.subscribers = Math.max(10, (E.bubble.subscribers || 100) + subDelta);
    saveGame();
    return { msgToFans: msgToFans, fanReplies: fanReplies, subscribers: E.bubble.subscribers, streak: streak, todayCount: E.bubble.todayCount };
  } catch(e) {
    console.error('[sendBubbleMessage]', e);
    showToast('⚠️ 泡泡发送失败：' + (e.message || '未知错误'));
    return null;
  } finally {
    GS._entSimGenerating = false;
  }
}
