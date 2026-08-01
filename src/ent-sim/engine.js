// ============================================================
// 娱乐圈模拟器（entSim）· 主循环引擎（纯恋爱游戏 + 娱乐圈背景）
// generateEntSimRound：生成 → 解析 → 应用副作用 → 推进时段氛围
// 换天由玩家点「进入下一天」(goEntSimNextDay) 显式触发。
// ============================================================
import { GS, saveGame } from '../state.js';
import { checkChapterAdvance, initEntSimState, popularity, careerLevel, addPopularity, traineePhaseOf, formatGameDate, todayBirthday, todayHoliday, gameMonthOf, gameSeasonOf, gameDayOf } from './state.js';
import { generateDailyWeather } from '../formatters.js';
import { generateWithRetry } from '../ai-generator.js';
import { showToast, randInt, escHtml } from '../utils.js';
import { parseEntSimResponse, parseEntSimExtras, safeParseJson } from './parser.js';
import { buildEntSimSystemPrompt, buildEntSimUserMessage } from './prompts.js';
import { rollDailyAgenda, getTimeOfDayLabel } from './cycle.js';
import { applyDiscoveryBlowback, addExposure, addCareerPublicity, getScandalHeat, applyExposureDecay, tickAftershock } from './public-opinion.js';
import { recordRomanceBeat, applyEntSimAffection, tickRomanceTimers, tickJealousy, checkAnniversaries, recordMilestone, check84BreakEvent, apply84BreakResult } from './romance.js';
import { generateDailyBuzz, generateFanReaction } from './immersion.js';
import { evaluateEnding } from './endings.js';
import { compressEntSimMemory, buildMemorySnapshot, logPlayerChoice, snapshotRelationships, archiveRecentNarratives, backupMemoryToStorage } from './memory.js';
import { maybeBrotherEvent, maybeMaleLeadInitiative, checkOneHeartEvents, autoUpdateBrotherStance } from './brother.js';
import { validateEntSimOutput, buildCorrectionFeedback } from './validator.js';
// npc-network 已移除，情敌名改用 rival 字段
import { ENDING_TONE } from './data.js';
import { pickFromPool, pickWeighted, canTrigger, SVT_TEAMMATE_EVENT_POOL, FAN_LETTER_POOL, BRAND_OFFER_POOL, RELEASE_POOL, CONTACT_TYPE_POOL, AWARD_POOL, VARIETY_SHOW_POOL, DISPATCH_POOL, MAGAZINE_POOL, RUMOR_POOL, COMEBACK_CYCLE_POOL, CONCERT_POOL, MUSIC_SHOW_POOL, FANSIGN_POOL, CAREER_SETBACKS, CONTACT_PROGRESSION, CHAT_MALE_LEAD, CHAT_BROTHER, CHAT_RIVAL, CHAT_MANAGER, GROUP_CHAT, CHAT_SASAENG, DAILY_ENGAGEMENT_POOL, TEAMMATE_FLAVOR, SVT_TEAMMATE_PROFILES, MILESTONE_DEBUT, JOB_OFFER_POOL, CHEER_CULTURE_POOL, SASAENG_ESCALATION_POOL, HEALTH_INJURY_POOL, TOXIC_FAN_WAR_POOL, YEAR_END_REVIEW_POOL, MV_FILMING_POOL, HIATUS_ANXIETY_POOL, VARIETY_MOMENT_POOL, SEASON_ROMANCE_POOL, TRAINEE_ROMANCE_POOL, DEBUT_TRANSITION_POOL, INSECURITY_POOL, FAME_PRESSURE_POOL, FAN_REACTIONS_POOL, FAMILY_ENCOUNTER_POOL, JUNIOR_INDUSTRY_POOL, CAREER_MILESTONE_SCENES, RIVAL_PSYCHOLOGY_POOL, MALE_LEAD_PERSPECTIVE_POOL, TIME_SKIP_TRANSITION, pickEndingPrelude, COMPANY_EVENT_POOL, getChatAckByMember } from './pools/index.js';
import { checkAwardCeremony } from './pools/awards.js';
import { getRandomTeammate, getTeammateDesc } from './pools/teammate-flavor.js';
import { tickComebackCycle } from './pools/comeback-cycle.js';
import { calculateMusicShowRank } from './pools/music-show-pool.js';
import { buildTestNarrative, buildTestOptions, setLastTestOptions, applyTestOptionEffect, buildTestChatReply, buildTestMoment, buildTestTheater } from './test-mode.js';

// 生成中标记（模块级，避免严格模式下的隐式全局报错）
var _entSimInflight = null;

// ── 辅助：推入弹窗队列（消除15处重复 if (!GS._entSimPopupQueue) 模式）──
function pushPopup(type, data) {
  if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
  GS._entSimPopupQueue.push({ type: type, data: data });
}

// ── 辅助：推入待定事件文本（消除重复 if+拼接 模式）──
function appendPendingEvent(text) {
  GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + text;
}

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

  // 每次生成前同步季节/月份/天气（旧存档的 GS.season/gameMonth/weather 可能和 dayCount 对不上）
  var E0 = GS.entSim;
  if (E0 && E0.cycle && E0.cycle.dayCount) {
    GS.gameMonth = gameMonthOf(E0.cycle.dayCount);
    GS.season = gameSeasonOf(E0.cycle.dayCount);
    if (typeof generateDailyWeather === 'function') {
      GS.weather = generateDailyWeather(GS.weather || '', GS.season);
    }
    GS.currentDate = { month: GS.gameMonth, day: gameDayOf(E0.cycle.dayCount) };
  }

  // ═══ 测试模式：绕过AI生成，真正执行引擎链路，展示全透明追踪 ═══
  if (window.__ENT_SIM_TEST) {
    return Promise.resolve().then(function() {
      var E = GS.entSim;
      // 步骤1：真正调用 rollDailyAgenda（从池子抽取日程，记录到 E.agenda）
      if (!E.agenda || !E.agenda.main) rollDailyAgenda();
      // 步骤2：真正调用 checkOneHeartEvents（按概率检测并触发事件，写入 GS._entSimPendingEvent）
      checkOneHeartEvents();
      maybeCompress();
      return Promise.resolve();
    }).then(function() {
      if (type === 'choice' && extra && extra.choiceText) {
        applyTestOptionEffect(extra.choiceText);
      }
      var narrative = buildTestNarrative(type, extra);
      var options = buildTestOptions();
      setLastTestOptions(options);
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
    }).catch(function(err) {
      // 修复#26: 测试模式路径缺 catch，异常时锁泄漏导致游戏卡死
      GS._entSimGenerating = false;
      _entSimInflight = null;
      showToast('测试模式生成失败：' + (err && err.message ? err.message : '未知错误'));
      var fb = { narrative: '（测试模式生成失败，请重试）', options: ['重试'], extras: {}, type: type, failed: true };
      GS._entSimCurrent = fb;
      return fb;
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

  _entSimInflight = generateWithRetry(sys, user, { temperature: 0.55, maxTokens: 5000 })
    .then(function(res) {
      var raw = (res && res.raw) ? res.raw : '';
      var parsed = parseEntSimResponse(raw);
      var extras = parseEntSimExtras(parsed.extras);

      // v5: validator跑偏检测·软约束——检测AI输出中的禁忌词/越级选项/异常delta
      var corrections = validateEntSimOutput(parsed, GS.entSim);
      if (corrections && corrections.length > 0) {
        console.warn('[entSim-validator] AI输出跑偏检测到' + corrections.length + '个问题：', corrections.join(' / '));
        // 严重问题(affectionDelta异常)时修正delta值
        for (var ci = 0; ci < corrections.length; ci++) {
          if (corrections[ci].indexOf('affectionDelta异常') >= 0 && extras && typeof extras.affectionDelta === 'number') {
            var stage = GS.oneHeartRomanceStage || 0;
            var maxVals = [3, 4, 4, 5, 5];
            if (extras.affectionDelta > (maxVals[stage] || 3)) extras.affectionDelta = maxVals[stage] || 3;
            if (extras.affectionDelta < -3 && stage < 2) extras.affectionDelta = -3;
          }
        }
        // v5: 将corrections反馈注入下一轮prompt，让AI知道上一轮哪里跑偏了
        var fb = buildCorrectionFeedback(corrections);
        if (fb) GS._entSimPendingCorrections = (GS._entSimPendingCorrections || '') + fb;
      }

      if (!extra.noSideEffects) {
        applySideEffects(extras);
        // v5: 心理状态波动——事件后自动调整
        updateEntSimPsycheState(extras, parsed);
      }

      // v4: 检测情敌告白接受——玩家选择接受时设置结局门控旗标
      var _E0 = GS.entSim;
      if (type === 'choice' && extra && extra.choiceText && _E0.flags.rivalConfession) {
        var _ct = extra.choiceText;
        if (_ct.indexOf('接受') >= 0 || _ct.indexOf('答应') >= 0 || _ct.indexOf('愿意') >= 0 || _ct.indexOf('可以') >= 0) {
          _E0.flags.rivalConfessionAccepted = true;
          _E0.flags.rivalConfession = false;
        }
      }

      var prev = GS._entSimCurrent;
      var narrative = parsed.narrative || '';
      var branchLabel = '';
      if (type === 'choice' && extra.choiceText) branchLabel = '你的选择：' + extra.choiceText;
      else if (type === 'free' && extra.freeText) branchLabel = '你输入：' + extra.freeText;
      else if (type === 'event' && extra.eventText) branchLabel = '触发：' + extra.eventText;
      else if (type === 'hypothetical' && extra.hypotheticalText) branchLabel = '自由推演：' + extra.hypotheticalText;
      else if (type === 'phase' && extra.nextDayOpening) branchLabel = 'Day ' + (GS.entSim.cycle._gameDayCount || 1) + ' ' + getTimeOfDayLabel();
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
        // v6: 记录玩家选择日志 + 存储叙事片段
        if (type === 'choice' && extra.choiceText) {
          logPlayerChoice(extra.choiceText, parsed.narrative);
        } else if (type === 'free' && extra.freeText) {
          logPlayerChoice(extra.freeText, parsed.narrative);
        }
        archiveRecentNarratives(parsed.narrative);
      }
      current._roundNarrative = parsed.narrative || '';
      saveGame();
      return current;
    })
    .catch(function(err) {
      // 修复#9: 防御性释放锁——若 catch 内部抛异常，最后 .then() 不执行，锁会永久泄漏导致游戏卡死
      GS._entSimGenerating = false;
      _entSimInflight = null;
      showToast('生成失败：' + (err && err.message ? err.message : '未知错误'));
      // 回退 continueEntSimMain 前置递增的 roundTotal 和 timeOfDay（修复#37: 防御 E2.cycle 为 null）
      var E2 = GS.entSim;
      if (extra && extra.timeSlot !== undefined && E2 && E2.cycle && E2.cycle.timeOfDay > 0) {
        E2.cycle.timeOfDay--;
        E2.cycle.roundTotal = Math.max(0, (E2.cycle.roundTotal || 1) - 1);
      }
      var fb = { narrative: '（剧情生成失败，请点击选项重试）', options: ['重试'], extras: {}, type: type, failed: true };
      GS._entSimCurrent = fb;
      return fb;
    })
    .then(function(current) {
      GS._entSimGenerating = false;
      _entSimInflight = null;
      // 自动写日记：每 3 回合 AI 生成完整日记（对齐 1v1）
      if (current && current.narrative && !extra.noSideEffects) {
        var E = GS.entSim;
        // 简洁摘要同时保留（记忆回顾用）——用本回合新生成段落，非累积全文
        var _newNarr = current._roundNarrative || current.narrative || '';
        var sum = _newNarr.replace(/\n/g, ' ').substring(0, 50).trim();
        var choiceText = extra.choiceText || extra.freeText || '';
        if (sum) {
          E.diarySummary = E.diarySummary || [];
          E.diarySummary.push({ day: E.cycle._gameDayCount || 1, round: E.cycle.roundTotal || 0, summary: sum, choice: choiceText });
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
// v5: 心理状态波动
function updateEntSimPsycheState(extras, parsed) {
  var E = GS.entSim;
  if (!E || !E.psyche) {
    if (E) E.psyche = { stress: 0, confidence: 50, anxiety: 0, fatigue: 0 };
    return;
  }
  var p = E.psyche;
  var affDelta = extras && typeof extras.affectionDelta === 'number' ? extras.affectionDelta : 0;
  var narrative = parsed && parsed.narrative ? parsed.narrative : '';

  // 疲劳：每回合+2（自然增长），练习/training +5
  p.fatigue = Math.min(100, (p.fatigue || 0) + 2);
  if (narrative.indexOf('练习') >= 0 || narrative.indexOf('排练') >= 0) p.fatigue = Math.min(100, p.fatigue + 3);

  // 压力：负面事件+10，被拍/曝光+15
  if (affDelta < 0) p.stress = Math.min(100, (p.stress || 0) + Math.abs(affDelta) * 2);
  if (narrative.indexOf('狗仔') >= 0 || narrative.indexOf('曝光') >= 0 || narrative.indexOf('偷拍') >= 0) p.stress = Math.min(100, p.stress + 10);

  // 焦虑：绯闻/恋情危机+10
  if (narrative.indexOf('绯闻') >= 0 || narrative.indexOf('危机') >= 0) p.anxiety = Math.min(100, (p.anxiety || 0) + 10);

  // 自信：好感+时+1，人气涨时+2
  if (affDelta > 0) p.confidence = Math.min(100, (p.confidence || 50) + 1);

  // 修复: 换天衰减移到 goEntSimNextDay，避免每时段衰减3倍过快
}

function applySideEffects(extras) {
  if (!extras) return;
  var E = GS.entSim;
  // 情敌 NPC 专属互动场景不应用 affectionDelta 到男主好感
  var isRivalOnly = extras._npcType === 'suitor' && !extras._hasMaleLead;
  // 防双重结算：romanceBeat 有 affectionDelta 时跳过顶层，避免同一回合叠加两次
  var beatHasAff = extras.romanceBeat && typeof extras.romanceBeat.affectionDelta === 'number';
  if (typeof extras.affectionDelta === 'number' && !isRivalOnly && !beatHasAff) {
    extras._affReason = extras._affReason || '剧情推进';
    applyEntSimAffection(extras.affectionDelta, { _affReason: extras._affReason || '剧情推进' });
  }
  if (extras.romanceBeat) recordRomanceBeat(extras.romanceBeat);
  if (extras.exposureEvent) {
    var mag = extras.exposureEvent.magnitude || 0;
    // 好感度门控：低好感时曝光幅度减半（<15时）或降为1/3（<5时）
    var affNow = E.affection || 0;
    if (mag > 0 && affNow < 15) {
      mag = affNow < 5 ? Math.max(1, Math.floor(mag / 3)) : Math.max(1, Math.floor(mag / 2));
    }
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
  E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'npc', text: node.name + '：' + (enc.event || '') });
}

function applyBrotherEffect(b) {
  var E = GS.entSim;
  var _playerDrove = (GS._entSimCurrent && GS._entSimCurrent.type === 'choice');
  // stance 保护：只有玩家选项驱动时允许 AI 改 stance
  if (b.stance) {
    if (_playerDrove) E.brother.stance = b.stance;
  }
  if (typeof b.supportDelta === 'number') {
    var broSup = E.brother.support || 0;
    // support<20 时 delta 上限 +1
    if (broSup < 20 && b.supportDelta > 1) b.supportDelta = Math.min(b.supportDelta, 1);
    // support<10 且非玩家驱动时强制置 0
    if (broSup < 10 && b.supportDelta > 0 && !_playerDrove) b.supportDelta = 0;
    var oldSup = E.brother.support || 0;
    E.brother.support = Math.max(-100, Math.min(100, oldSup + b.supportDelta));
    E.brother.supportLog = E.brother.supportLog || [];
    // brother.note 门控：与 stance 矛盾时替换
    var noteText = b.note || '剧情影响';
    if (/牵线|撮合|审查感情|推.*Kakao|月老/.test(noteText) && broSup < 20) noteText = '本轮剧情影响';
    var reason = noteText;
    if (reason.length > 50) reason = reason.slice(0, 50) + '…';
    E.brother.supportLog.push({
      delta: b.supportDelta,
      reason: reason,
      total: E.brother.support,
      day: E.cycle._gameDayCount || E.cycle.dayCount || 1
    });
    if (E.brother.supportLog.length > 50) E.brother.supportLog = E.brother.supportLog.slice(-50);
  }
  if (b.note) E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'brother', text: b.note });
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
  // v4: 6000→10000，slice(-4000)→slice(-6000)，避免长剧情上下文丢失
  if (buf.length > 10000) {
    GS._entSimNarrativeBuffer = buf.slice(-6000);
  }
}

// v4: careerHistory 上限200条，防止无限增长
function trimCareerHistory(E) {
  if (E.careerHistory && E.careerHistory.length > 200) {
    E.careerHistory = E.careerHistory.slice(-200);
  }
}

// v4: 池子条件判断 — 委托给 canTrigger（支持 aff>=/popularity>=/debut/trainee/scandalHeat/season/month 等全部格式）
function evalPoolReq(req, E) {
  if (!req) return true;
  return canTrigger({ require: req }, E);
}

// ── goEntSimNextDay 子函数：日历推进 + 基础状态更新 ──
function advanceEntSimDay() {
  var E = GS.entSim;
  E.cycle._gameDayCount = (E.cycle._gameDayCount || 1) + 1;
  showDayTransition(E.cycle._gameDayCount);
  E.cycle.dayCount++;
  E.cycle.roundTotal++;
  GS.gameMonth = gameMonthOf(E.cycle.dayCount);
  GS.season = gameSeasonOf(E.cycle.dayCount);
  if (typeof generateDailyWeather === 'function') {
    GS.weather = generateDailyWeather(GS.weather, GS.season);
  }
  E.cycle.timeOfDay = 0;
  E._svtTodaySeen = [];
  E.chapter.roundInChapter = (E.chapter.roundInChapter || 0) + 1;
  E.misc.npcInteractionUsed = 0;
}

// ── goEntSimNextDay 子函数：保存结算快照 ──
function saveDailySnapshot() {
  var E = GS.entSim;
  if (E.career && E.career.debutDay > 0) {
    E._popHistory = E._popHistory || [];
    var yesterdayDay = E.cycle._gameDayCount || 1;
    if (!E._popHistory.length || E._popHistory[E._popHistory.length - 1].day !== yesterdayDay) {
      E._popHistory.push({ day: yesterdayDay, pop: E.career.popularity || 0 });
      if (E._popHistory.length > 60) E._popHistory = E._popHistory.slice(-60);
    }
  }
  if (E.cycle._gameDayCount % 3 === 0) snapshotRelationships();
}

// ── goEntSimNextDay 子函数：SVT回归周期推进 ──
function advanceSvtComeback() {
  var E = GS.entSim;
  if (E._svtComebackDays && E._svtComebackDays > 1) {
    E._svtComebackDays--;
  } else if (E._svtComebackDays === 1) {
    E._svtComebackDays = 0;
  } else if (E.cycle.dayCount > 0 && (!E._svtComebackInterval || E.cycle.dayCount % E._svtComebackInterval === 0)) {
    E._svtComebackInterval = 15 + randInt(0, 5);
    E._svtComebackDays = 5 + randInt(0, 2);
  }
}

// ── goEntSimNextDay 子函数：每日衰减 + 泡泡连续天检查 ──
function applyDailyDecay() {
  var E = GS.entSim;
  if (E.psyche) {
    E.psyche.stress = Math.max(0, (E.psyche.stress || 0) - 1);
    E.psyche.anxiety = Math.max(0, (E.psyche.anxiety || 0) - 1);
    E.psyche.fatigue = Math.max(0, (E.psyche.fatigue || 0) - 1);
  }
  if (E.bubble) {
    var _gameDay = E.cycle._gameDayCount || E.cycle.dayCount;
    if (E.bubble.lastSentDay === _gameDay - 1 && E.bubble.todayCount > 0) {
      E.bubble.streak = (E.bubble.streak || 0) + 1;
    } else if (E.bubble.lastSentDay < _gameDay - 1) {
      E.bubble.streak = 0;
    }
    E.bubble.todayCount = 0;
    E.bubble.lastSentDay = _gameDay;
  }
}

// ── goEntSimNextDay 子函数：出道后每日曝光/合约/惩罚 ──
function applyDebutDailyChecks() {
  var E = GS.entSim;
  var isD = E.career.debutDay > 0;
  if (!isD) return;
  applyExposureDecay();
  var aftershockText = tickAftershock();
  if (aftershockText) {
    GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【舆论余波】' + aftershockText;
  }
  if (getScandalHeat() >= 25) {
    showToast('⚠️ 经纪人警告：公司注意到你的私生活影响了工作，人气下降');
    addPopularity(-5, '公司惩罚·曝光过高经纪警告');
  }
  if (E.cycle._gameDayCount % 30 === 0 && E.career.contractRemaining > 0) {
    E.career.contractRemaining--;
    if (E.career.contractRemaining === 1) {
      showToast('⏳ 合约还有1年到期，公司开始试探续约意向…');
    } else if (E.career.contractRemaining <= 0) {
      showToast('📜 合约已到期！需要决定续约还是独立发展');
    }
  }
}

// ── goEntSimNextDay 子函数：练习生阶段更新 + 出道触发 ──
function advanceTraineeStage() {
  var E = GS.entSim;
  if (E.career.debutDay > 0) return; // 已出道跳过
  E.career._traineeDayCount = (E.career._traineeDayCount || 0) + 1;
  var newPhase = traineePhaseOf(E.career._traineeDayCount);
  if (newPhase !== E.career._lastTraineePhase) {
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'phase', text: '进入练习生' + (newPhase === 1 ? '前期' : newPhase === 2 ? '中期' : '后期') });
    E.career._lastTraineePhase = newPhase;
    showToast('🌱 进入练习生' + (newPhase === 1 ? '前期' : newPhase === 2 ? '中期' : '后期'));
  }
  E.career.traineePhase = newPhase;
  if (Math.random() < 0.4) {
    var traineeOpts = generateTraineeOptions(E);
    if (traineeOpts) {
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【训练选择】' + traineeOpts;
    }
  }
  if (E.career.traineePhase === 3) {
    E.career._debutTriggerDay = (E.career._debutTriggerDay || 0) + 1;
    if (E.career._debutTriggerDay >= 1 + randInt(0, 1)) {
      var debutBaseText = '今天是出道最终评价的日子。你站在评价室门口深吸一口气——这一关过后，要么出道，要么离开。';
      if (MILESTONE_DEBUT && MILESTONE_DEBUT.length) {
        var debutScene = pickWeighted(MILESTONE_DEBUT);
        if (debutScene && debutScene.text) debutBaseText += '（本日后续高光场景参考：' + debutScene.text + '）';
      }
      GS._entSimPendingEvent = debutBaseText;
      E.career.debutDay = E.cycle.dayCount || 1;
      E.career.debutGameDay = E.cycle._gameDayCount || 1;
      // 出道人气不低于 5（练习生期的积累有保底），不归零
      if ((E.career.popularity || 0) < 5) E.career.popularity = 5 + randInt(0, 5);
      E.career.yearsActive = 0;
      E.chapter = { index: 1, name: '新人出道', icon: '🌱', desc: '刚刚出道的小糊团新人，资源少但冲劲足', roundInChapter: 0, entered: true };
      E.career.profession = '新人偶像';
      E.career.careerKey = 'idol';
      // 同步 heroineProfile.profession（防止存档中职业不一致）
      if (GS.heroineProfile) GS.heroineProfile.profession = '新人偶像';
      GS._entSimStageUpPending = { type: 'debut', group: E.groupMeta, timestamp: Date.now() };
      E._debutTransitionLeft = 3;
      showToast('🎀 恭喜出道！你正式成为了' + (E.groupMeta ? E.groupMeta.groupName || '新人女团' : '新人女团') + '的一员！');
    }
  }
}

// ── goEntSimNextDay 子函数：出道后粉丝订阅掉粉检测 ──
function applySubscriberDrop() {
  var E = GS.entSim;
  if (E.career.debutDay === 0 || !E.bubble) return;
  var pop = E.career.popularity || 0;
  E.bubble.subscribers = Math.max(100, Math.floor(pop * 15) + 100 + randInt(0, 50));
  if (E.misc.scandalHeat >= 10) {
    var dropRate = E.misc.scandalHeat >= 25 ? 0.15 : (E.misc.scandalHeat >= 15 ? 0.08 : 0.03);
    var dropped = Math.floor(E.bubble.subscribers * dropRate);
    if (dropped > 0) {
      E.bubble.subscribers = Math.max(100, E.bubble.subscribers - dropped);
      E.bubble._totalDropped = (E.bubble._totalDropped || 0) + dropped;
      E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount, type: 'subscriber', text: '恋情曝光风险导致掉粉 -' + dropped + '（累计掉粉' + E.bubble._totalDropped + '）' });
      var dropPct = E.bubble._totalDropped / (E.bubble.subscribers + E.bubble._totalDropped);
      if (dropPct >= 0.2 && !E.flags.subscriberCrisis20) {
        E.flags.subscriberCrisis20 = true;
        GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【粉丝危机】泡泡订阅数累计流失超过20%！粉丝圈开始出现大规模脱粉潮，你需要决定如何应对。';
        showToast('⚠️ 粉丝危机：订阅数累计流失超过20%！');
      } else if (dropPct >= 0.1 && !E.flags.subscriberCrisis10) {
        E.flags.subscriberCrisis10 = true;
        showToast('📉 粉丝流失警告：订阅数累计下降超过10%');
      }
    }
  }
}

// ── goEntSimNextDay 子函数：每日事件池批量触发 ──
function triggerDailyEventPools(isDebutPopup) {
  var E = GS.entSim;
  // 回归周期
  if (isDebutPopup) {
    var cbTick = tickComebackCycle(E);
    if (cbTick) {
      showToast(cbTick.label);
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【回归周期】' + cbTick.phase + ' · ' + cbTick.label;
      if (cbTick.phase && cbTick.phase.indexOf('musicShow') === 0) {
        var rank = calculateMusicShowRank(E.career.popularity || 30);
        var rankText = rank.isWinner ? '🏆 1位！' + rank.total + '分' : rank.rank + '位 · ' + rank.total + '分';
        showToast('🎵 打歌排名：' + rankText);
        if (rank.isWinner) addPopularity(5, '打歌一位·' + cbTick.label);
        GS._entSimPendingEvent = GS._entSimPendingEvent + '\n【打歌排名】' + cbTick.label + ' → ' + rankText;
      }
    }
  }
  // 热搜
  if (isDebutPopup) {
    var buzz = generateInteractiveBuzz(E);
    if (buzz) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【今日圈内热点】' + buzz.text + ' · 可' + buzz.cost;
  }
  // 粉丝来信
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastFanLetterDay || 0) >= 1 && FAN_LETTER_POOL && FAN_LETTER_POOL.length) {
    E._lastFanLetterDay = E.cycle._gameDayCount;
    var letter = pickWeighted(FAN_LETTER_POOL);
    if (letter && letter.length) {
      var pickedLetter = pickWeighted(letter);
      if (pickedLetter) pushPopup('fanLetter', pickedLetter);
    }
  }
  // 品牌代言
  if (isDebutPopup && (E.career.popularity || 0) >= 15 && E.cycle._gameDayCount - (E._lastBrandOfferDay || 0) >= 2 && Math.random() < 0.5) {
    E._lastBrandOfferDay = E.cycle._gameDayCount;
    var brCat = pickWeighted(BRAND_OFFER_POOL);
    if (brCat && brCat.length) {
      var brItem = pickWeighted(brCat);
      if (brItem) pushPopup('brandOffer', brItem);
    }
  }
}

// ── goEntSimNextDay 子函数：章节跨越蒙太奇 + 结尾清理 ──
function finalizeDailyCycle(chapterCrossed) {
  var E = GS.entSim;
  if (chapterCrossed && E.chapter && E.chapter.entered) {
    var chCat = 'ch' + (Math.min(6, Math.max(2, (E.chapter.index || 2))));
    var tsMatches = (TIME_SKIP_TRANSITION || []).filter(function(t) { return t.cat === chCat; });
    var tsText = tsMatches.length ? (pickWeighted(tsMatches) || {}).text || '' : '';
    var milestoneCat = E.chapter.milestoneCat || (E.chapter.index <= 1 ? 'debut' : E.chapter.index <= 2 ? 'firstwin' : E.chapter.index <= 3 ? 'awards' : 'concert');
    var cmMatches = (CAREER_MILESTONE_SCENES || []).filter(function(m) { return m.cat === milestoneCat; });
    var milestoneText = cmMatches.length ? (pickWeighted(cmMatches) || {}).text || '' : '';
    var chIdx = E.chapter.index || 2;
    var tbl = { 2: 60, 3: 120, 4: 180, 5: 240, 6: 300 };
    var skipDays = tbl[chIdx] || 0;
    showChapterTransition(E.chapter.icon || '', E.chapter.name || '', E.chapter.desc || '', skipDays, tsText);
    var chMsg = '【章节跨越】你进入了「' + (E.chapter.icon || '') + ' ' + (E.chapter.name || '') + '」：' + (E.chapter.desc || '新阶段带来新的机会与风险。') + ' 注意周围目光和粉丝情绪正在变化。' + (milestoneText ? '\n【高光时刻】' + milestoneText : '');
    GS._entSimPendingEvent = (GS._entSimPendingEvent ? chMsg + '\n' + GS._entSimPendingEvent : chMsg);
    E.chapter.entered = false;
  }
  saveGame();
  trimCareerHistory(E);
  syncOneHeartState();
}

// 进入下一天：换天由玩家显式触发（oneHeart 式手动换天）
// 已拆分为子函数：advanceEntSimDay / saveDailySnapshot / advanceSvtComeback / applyDailyDecay / applyDebutDailyChecks / advanceTraineeStage / applySubscriberDrop / triggerDailyEventPools / finalizeDailyCycle
export function goEntSimNextDay() {
  var E = GS.entSim;
  var lastPop = (E._lastPopSnapshot != null) ? E._lastPopSnapshot : ((E.career && typeof E.career.popularity === 'number') ? E.career.popularity : 0);
  var lastExp = getScandalHeat();
  var lastAff = E.affection || 0;

  saveDailySnapshot();
  advanceEntSimDay();

  // 秘密信箱
  if (!E._letterInterval) E._letterInterval = 7 + randInt(0, 3);
  if (E.cycle.roundTotal > 0 && E.cycle.roundTotal % E._letterInterval === 0) {
    E._letterInterval = 7 + randInt(0, 3);
    generateEntSimLetter();
  }
  // 朋友圈
  if (E.career.debutDay > 0) {
    E._momentCounter = (E._momentCounter || 0) + 1;
    var momentThresh = 3 + Math.floor(Math.random() * 3);
    if (E._momentCounter >= momentThresh) {
      E._momentCounter = 0;
      generateEntSimMoment();
    }
  }

  advanceSvtComeback();
  tickRomanceTimers();
  applyDailyDecay();
  // 出道判定必须在 rollDailyAgenda 之前，否则出道当天 agenda 仍是练习生内容
  advanceTraineeStage();
  rollDailyAgenda();
  generateDailyBuzz();
  if (window.pushDailyChats) window.pushDailyChats();

  applyDebutDailyChecks();

  applySubscriberDrop();
  // 章节跨越检查（人气推进，只进不退）
  var chapterCrossed = checkChapterAdvance();
  // v2：吃醋值每日衰减
  tickJealousy(0);
  // v2：出道标记（提前声明，供后续所有 v5 弹窗共用）
  var isDebutPopup = (E.career && E.career.debutDay > 0);
  // v4: 练习生期移除联络门控——男主也可以在出道前主动联系，但概率减半
  var contactTriggered = false;
  if (E._maleContactTimer >= 0) E._maleContactTimer--;
  var contactProb = (E.affection >= 10) ? (E.affection >= 60 ? 0.5 : 0.45) : (E.affection >= 30 ? 0.15 : 0.10);
  // plan #23: 出道后每阶段+10%男主出现概率（章节1=新人→+10%, 章节2=崭露→+20%...最高90%）
  if (isDebutPopup) {
    var chapBonus = Math.min(4, (E.chapter && E.chapter.index || 1)) * 0.1;
    contactProb = Math.min(0.9, contactProb + chapBonus);
  }
  if (E._maleContactTimer <= 0 && Math.random() < contactProb) {
    contactTriggered = true;
    var contactPool = pickWeighted(CONTACT_TYPE_POOL);
    if (contactPool && contactPool.length) {
      var contactItem = pickWeighted(contactPool);
      if (contactItem && E.affection >= (contactItem.minAff || 0)) {
        var catLabel = contactItem.cat === 'call' ? '📞电话' : contactItem.cat === 'call_jealous' ? '📞吃醋来电' : contactItem.cat === 'msg' ? '💬私信' : contactItem.cat === 'msg_code' ? '💬暗号私信' : '👨哥哥转达';
        pushPopup('maleContact', { item: contactItem, label: catLabel });
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
  // P2 #7: 连续同地约会→狗仔跟拍风险（好感度>=20才可能有约会行为）
  if (E._lastDateDay && E._lastDateDay >= E.cycle.dayCount - 3 && (E.affection || 0) >= 20) {
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
        var ev = pickWeighted(available);
        GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【公司事件】' + ev.text;
      }
    }
  }
  // P5 #20: SEVENTEEN 13人轮换每日自动出场（每2~3天1人，队内均匀轮换 + SVT_TEAMMATE_EVENT_POOL通用池模板注入prompt）
  if (E.cycle._gameDayCount - (E._svtRotationLastDay || 0) >= (2 + randInt(0, 1))) {
    E._svtRotationLastDay = E.cycle._gameDayCount;
    var tm = getRandomTeammate(E);
    if (tm) {
      var tmDesc = getTeammateDesc(tm.id);
      var tmEvent = pickWeighted(SVT_TEAMMATE_EVENT_POOL);
      var tmSceneHint = tmEvent ? tmEvent.text.replace(/\{name\}/g, tmDesc.split('·')[0] || '队友').replace(/\{brother\}/g, (E.brother && E.brother.name) || '哥哥') : '';
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【SVT队友出场】' + tmDesc + ' · ' + tmSceneHint.substring(0, 120);
    }
  }
  // 触发每日事件池（回归周期、打歌排名、热搜、粉丝来信）
  triggerDailyEventPools(isDebutPopup);

  // v4: 品牌代言门槛从20降至15（与jobOffer对齐）
  if (isDebutPopup && (E.career.popularity || 0) >= 15 && E.cycle._gameDayCount - (E._lastBrandOfferDay || 0) >= 2 && Math.random() < 0.5) {
    E._lastBrandOfferDay = E.cycle._gameDayCount;
    var brCat = pickWeighted(BRAND_OFFER_POOL);
    if (brCat && brCat.length) {
      var brItem = pickWeighted(brCat);
      if (brItem) pushPopup('brandOffer', brItem);
    }
  }
  // v7：通告邀约弹窗（每3天触发1次，出道后人气>=15即可，30%概率）
  if (isDebutPopup && (E.career.popularity || 0) >= 15 && E.cycle._gameDayCount - (E._lastJobOfferDay || 0) >= 3 && Math.random() < 0.3) {
    E._lastJobOfferDay = E.cycle._gameDayCount;
    var offerItem = pickWeighted(JOB_OFFER_POOL);
    if (offerItem && offerItem.text) {
      pushPopup('jobOffer', offerItem);
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
    var at = E.cycle._gameDayCount <= 20 ? 'newcomer' : awardTypes[Math.floor(Math.random() * 3)];
    var awardPool = AWARD_POOL ? AWARD_POOL.filter(function(a) { return a.type === at; }) : [];
    if (awardPool.length) {
      var aw = pickWeighted(awardPool);
      if (aw) pushPopup('award', aw);
    }
  }
  // v5：综艺通告（每2天，人气≥25，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastVarietyDay || 0) >= 2 && (E.career.popularity || 0) >= 25 && Math.random() < 0.5 && VARIETY_SHOW_POOL && VARIETY_SHOW_POOL.length) {
    E._lastVarietyDay = E.cycle._gameDayCount;
    var vItem = pickWeighted(VARIETY_SHOW_POOL);
    if (vItem && vItem.length) vItem = pickWeighted(vItem);
    if (vItem) pushPopup('variety', vItem);
  }
  // v5：Dispatch爆料（每3天，恋情曝光风险≥5即暗涌，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastDispatchDay || 0) >= 3 && getScandalHeat() >= 5 && Math.random() < 0.4 && DISPATCH_POOL && DISPATCH_POOL.length) {
    E._lastDispatchDay = E.cycle._gameDayCount;
    var dItem = pickWeighted(DISPATCH_POOL);
    if (dItem) pushPopup('dispatch', dItem);
  }
  // v5：杂志画报（每3天，人气≥40，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastMagazineDay || 0) >= 3 && (E.career.popularity || 0) >= 40 && Math.random() < 0.4 && MAGAZINE_POOL && MAGAZINE_POOL.length) {
    E._lastMagazineDay = E.cycle._gameDayCount;
    var mItem = pickWeighted(MAGAZINE_POOL);
    if (mItem && mItem.length) mItem = pickWeighted(mItem);
    if (mItem) pushPopup('magazine', mItem);
  }
  // v5：绯闻/恋爱说（每3天，好感≥50+恋情曝光风险≥10即升温，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastRumorDay || 0) >= 3 && (E.affection || 0) >= 50 && getScandalHeat() >= 10 && Math.random() < 0.4 && RUMOR_POOL && RUMOR_POOL.length) {
    E._lastRumorDay = E.cycle._gameDayCount;
    var rItem = pickWeighted(RUMOR_POOL);
    if (rItem) pushPopup('rumor', rItem);
  }
  // v5：私生骚扰检测（人气≥25后每天8%概率，5天冷却，仅出道后）
  if (isDebutPopup && (E.career.popularity || 0) >= 25 && E.cycle._gameDayCount - (E._lastSasaengDay || 0) >= 5 && Math.random() < 0.08 && CHAT_SASAENG && CHAT_SASAENG.length) {
    E._lastSasaengDay = E.cycle._gameDayCount;
    var sItem = pickWeighted(CHAT_SASAENG);
    if (sItem) GS._entSimSasaengMsg = sItem;
  }
  // v5：签售会（每4天，人气≥15，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastFansignDay || 0) >= 4 && (E.career.popularity || 0) >= 15 && Math.random() < 0.45 && FANSIGN_POOL && FANSIGN_POOL.length) {
    E._lastFansignDay = E.cycle._gameDayCount;
    var fItem = pickWeighted(FANSIGN_POOL);
    if (fItem) pushPopup('fansign', fItem);
  }
  // v5：演唱会/大型演出（每6天，人气≥50，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastConcertDay || 0) >= 6 && (E.career.popularity || 0) >= 50 && Math.random() < 0.35 && CONCERT_POOL && CONCERT_POOL.length) {
    E._lastConcertDay = E.cycle._gameDayCount;
    var cItem = pickWeighted(CONCERT_POOL);
    if (cItem) pushPopup('concert', cItem);
  }
  // v5：回归周期（每5天，人气≥35，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastComebackDay || 0) >= 5 && (E.career.popularity || 0) >= 35 && Math.random() < 0.35 && COMEBACK_CYCLE_POOL && COMEBACK_CYCLE_POOL.length) {
    E._lastComebackDay = E.cycle._gameDayCount;
    var cbItem = pickWeighted(COMEBACK_CYCLE_POOL);
    if (cbItem) pushPopup('comeback', cbItem);
  }
  // v5：打歌节目（每3天，人气≥20，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastMusicShowDay || 0) >= 3 && (E.career.popularity || 0) >= 20 && Math.random() < 0.4 && MUSIC_SHOW_POOL && MUSIC_SHOW_POOL.length) {
    E._lastMusicShowDay = E.cycle._gameDayCount;
    var msItem = pickWeighted(MUSIC_SHOW_POOL);
    if (msItem) pushPopup('musicShow', msItem);
  }
  // v5：事业挫折（每5天，仅出道后）
  if (isDebutPopup && E.cycle._gameDayCount - (E._lastSetbackDay || 0) >= 5 && Math.random() < 0.3 && CAREER_SETBACKS && CAREER_SETBACKS.length) {
    var phase = E.chapter.roundInChapter < 10 ? 0 : E.chapter.roundInChapter < 20 ? 1 : E.chapter.roundInChapter < 30 ? 2 : 3;
    var sbPool = CAREER_SETBACKS.filter(function(s) { return (!s.phase || s.phase === phase); });
    if (sbPool.length) {
      E._lastSetbackDay = E.cycle._gameDayCount;
      var sbItem = pickWeighted(sbPool);
      if (sbItem && sbItem.text) {
        pushPopup('setback', sbItem);
      }
    }
  }
  // v4: 池子接入① CHEER_CULTURE_POOL — 出道后人气≥10，10%概率
  if (isDebutPopup && (E.career.popularity || 0) >= 10 && Math.random() < 0.10 && CHEER_CULTURE_POOL && CHEER_CULTURE_POOL.length) {
    var cheerPool = CHEER_CULTURE_POOL.filter(function(c) { return !c.require || evalPoolReq(c.require, E); });
    if (cheerPool.length) { var cItem = pickWeighted(cheerPool); if (cItem && cItem.text) GS._entSimPendingEvent = '【应援文化】' + cItem.text; }
  }
  // v4: 池子接入② SASAENG_ESCALATION_POOL — 人气≥25+scandalHeat≥5，15%概率
  if (isDebutPopup && (E.career.popularity || 0) >= 25 && getScandalHeat() >= 5 && Math.random() < 0.15 && SASAENG_ESCALATION_POOL && SASAENG_ESCALATION_POOL.length) {
    var saePool = SASAENG_ESCALATION_POOL.filter(function(s) { return !s.require || evalPoolReq(s.require, E); });
    if (saePool.length && (!GS._entSimPopupQueue)) GS._entSimPopupQueue = [];
    if (saePool.length) { var saItem = pickWeighted(saePool); if (saItem) GS._entSimPopupQueue.push({ type:'sasaeng', data: saItem }); }
  }
  // v4: 池子接入③ HEALTH_INJURY_POOL — 出道后，8%概率
  if (isDebutPopup && Math.random() < 0.08 && HEALTH_INJURY_POOL && HEALTH_INJURY_POOL.length) {
    var hiPool = HEALTH_INJURY_POOL.filter(function(h) { return !h.require || evalPoolReq(h.require, E); });
    if (hiPool.length) { var hiItem = pickWeighted(hiPool); if (hiItem && hiItem.text) GS._entSimPendingEvent = '【健康伤病】' + hiItem.text; }
  }
  // v4: 池子接入④ TOXIC_FAN_WAR_POOL — 人气≥20，10%概率
  if (isDebutPopup && (E.career.popularity || 0) >= 20 && Math.random() < 0.10 && TOXIC_FAN_WAR_POOL && TOXIC_FAN_WAR_POOL.length) {
    var tfPool = TOXIC_FAN_WAR_POOL.filter(function(t) { return !t.require || evalPoolReq(t.require, E); });
    if (tfPool.length) { var tfItem = pickWeighted(tfPool); if (tfItem && tfItem.text) GS._entSimPendingEvent = '【毒唯互撕】' + tfItem.text; }
  }
  // v4: 池子接入⑤ YEAR_END_REVIEW_POOL — 12月触发（每游戏年一次）
  if (GS.gameMonth === 12 && !E._yearEndReviewDone && YEAR_END_REVIEW_POOL && YEAR_END_REVIEW_POOL.length) {
    E._yearEndReviewDone = true;
    var yerPool = YEAR_END_REVIEW_POOL.filter(function(y) { return !y.require || evalPoolReq(y.require, E); });
    if (yerPool.length) { var yrItem = pickWeighted(yerPool); if (yrItem && yrItem.text) GS._entSimPendingEvent = '【年末结算】' + yrItem.text; }
  }
  if (GS.gameMonth === 1) E._yearEndReviewDone = false; // 新一年重置
  // v4: 池子接入⑥ MV_FILMING_POOL — _svtComebackDays>0 回归期触发
  if (E._svtComebackDays && E._svtComebackDays > 0 && Math.random() < 0.25 && MV_FILMING_POOL && MV_FILMING_POOL.length) {
    var mvPool = MV_FILMING_POOL.filter(function(m) { return !m.require || evalPoolReq(m.require, E); });
    if (mvPool.length) { var mvItem = pickWeighted(mvPool); if (mvItem && mvItem.text) GS._entSimPendingEvent = '【MV拍摄】' + mvItem.text; }
  }
  // v4: 池子接入⑦ HIATUS_ANXIETY_POOL — 连续2天无popup触发
  var hasPopupToday = GS._entSimPopupQueue && GS._entSimPopupQueue.length > 0;
  E._noPopupDays = hasPopupToday ? 0 : ((E._noPopupDays || 0) + 1);
  if (E._noPopupDays >= 2 && HIATUS_ANXIETY_POOL && HIATUS_ANXIETY_POOL.length && isDebutPopup) {
    var haPool = HIATUS_ANXIETY_POOL.filter(function(h) { return !h.require || evalPoolReq(h.require, E); });
    if (haPool.length) { var haItem = pickWeighted(haPool); if (haItem && haItem.text) GS._entSimPendingEvent = '【空白期焦虑】' + haItem.text; E._noPopupDays = 0; }
  }
  // v5：每日营业事件（DAILY_ENGAGEMENT_POOL，每天40%概率，仅出道后）
  if (isDebutPopup && Math.random() < 0.4 && DAILY_ENGAGEMENT_POOL && DAILY_ENGAGEMENT_POOL.length) {
    var deItem = pickWeighted(DAILY_ENGAGEMENT_POOL);
    if (deItem) {
      if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
      GS._entSimPopupQueue.push({ type:'dailyEngage', data: deItem });
    }
  }
  // v5 P0: 练习生恋爱铺垫池 TRAINEE_ROMANCE_POOL — 练习生期每天15%概率，补足6天18轮"干"的问题
  // plan #23: 练习生期男主出现概率 60%（降低男主强制出现频率，给哥哥/练习室/公司事件留空间）
  if (!isDebutPopup && TRAINEE_ROMANCE_POOL && TRAINEE_ROMANCE_POOL.length) {
    var traineeMaleLeadChance = 0.6; // 60%概率抽取男主相关事件
    if (Math.random() < traineeMaleLeadChance) {
      // 男主相关事件：从 TRAINEE_ROMANCE_POOL 抽取，按好感度过滤（低好感时不触发亲密互动）
      var aff = E.affection || 0;
      var trPool = TRAINEE_ROMANCE_POOL;
      // 好感度<10：只抽 glimpse/notice/first/event/daily 等低亲密类型
      if (aff < 10) {
        trPool = TRAINEE_ROMANCE_POOL.filter(function(it) {
          return it.cat === 'glimpse' || it.cat === 'notice' || it.cat === 'first' || it.cat === 'event' || it.cat === 'daily' || it.cat === 'rumor';
        });
      }
      // 好感度<20：排除 touch/care/vulnerable/ride 等高互动类型
      else if (aff < 20) {
        trPool = TRAINEE_ROMANCE_POOL.filter(function(it) {
          return it.cat !== 'touch' && it.cat !== 'vulnerable' && it.cat !== 'ride' && it.cat !== 'secret';
        });
      }
      if (!trPool.length) trPool = TRAINEE_ROMANCE_POOL; // 保底
      var trItem = pickWeighted(trPool);
      if (trItem && trItem.text) {
        GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【练习室日常】' + trItem.text;
      }
    }
    // 40%概率分配给哥哥试探/练习室日常/公司事件/个人成长（由 maybeBrotherEvent + 公司事件自然覆盖）
  }
  // v5 P0: 出道过渡事件链 DEBUT_TRANSITION_POOL — 出道后前3天每天40%概率
  // 按 _debutTransitionLeft 过滤：3=出道前夜/当天(pre+day), 2=出道后(post+early), 1=出道后(early)
  if (isDebutPopup && E._debutTransitionLeft > 0 && Math.random() < 0.4 && DEBUT_TRANSITION_POOL && DEBUT_TRANSITION_POOL.length) {
    var allowedCats = E._debutTransitionLeft >= 3 ? ['pre', 'day'] : (E._debutTransitionLeft === 2 ? ['post', 'early'] : ['early']);
    var dtFiltered = DEBUT_TRANSITION_POOL.filter(function(dt) { return allowedCats.indexOf(dt.cat) >= 0; });
    // 过滤后为空时 fallback 到全部池（保底）
    if (!dtFiltered.length) dtFiltered = DEBUT_TRANSITION_POOL;
    var dtItem = pickWeighted(dtFiltered);
    if (dtItem && dtItem.text) {
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【出道过渡】' + dtItem.text;
    }
    E._debutTransitionLeft--;
  }
  // v5: 季节恋爱联动池 SEASON_ROMANCE_POOL — 每天12%概率，按月份匹配触发
  if (isDebutPopup && Math.random() < 0.12 && SEASON_ROMANCE_POOL && SEASON_ROMANCE_POOL.length) {
    var curMonth = gameMonthOf(E.cycle.dayCount);
    var curSeason = gameSeasonOf(E.cycle.dayCount);
    var srMatches = SEASON_ROMANCE_POOL.filter(function(s) {
      if (!s.require) return false;
      var orParts = s.require.split('||');
      for (var oi = 0; oi < orParts.length; oi++) {
        var p = orParts[oi].trim();
        if (p.indexOf('month=') === 0 && parseInt(p.slice(6), 10) === curMonth) return true;
        if (p.indexOf('season=') === 0 && p.slice(7) === curSeason) return true;
      }
      return false;
    });
    if (srMatches.length) {
      var srItem = pickWeighted(srMatches);
      if (srItem && srItem.text) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【季节联动】' + srItem.text;
    }
  }
  // v5: 低人气自卑事件 INSECURITY_POOL — 人气<20时每天25%触发
  if (isDebutPopup && lastPop < 20 && Math.random() < 0.25 && INSECURITY_POOL && INSECURITY_POOL.length) {
    var inseMatches = INSECURITY_POOL.filter(function(it) { return canTrigger(it, E); });
    if (inseMatches.length) {
      var inseItem = pickWeighted(inseMatches);
      if (inseItem && inseItem.text) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【不安全感】' + inseItem.text;
    }
  }
  // v5: 高人气压力事件 FAME_PRESSURE_POOL — 人气>=50时每天20%触发
  if (isDebutPopup && lastPop >= 50 && Math.random() < 0.20 && FAME_PRESSURE_POOL && FAME_PRESSURE_POOL.length) {
    var fameMatches = FAME_PRESSURE_POOL.filter(function(it) { return canTrigger(it, E); });
    if (fameMatches.length) {
      var fameItem = pickWeighted(fameMatches);
      if (fameItem && fameItem.text) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【成名压力】' + fameItem.text;
    }
  }
  // v5: 粉丝反应 FAN_REACTIONS_POOL — 出道后每天30%触发，按人气档位筛选
  if (isDebutPopup && Math.random() < 0.30 && FAN_REACTIONS_POOL && FAN_REACTIONS_POOL.length) {
    var fanMatches = FAN_REACTIONS_POOL.filter(function(it) { return canTrigger(it, E); });
    if (fanMatches.length) {
      var fanItem = pickWeighted(fanMatches);
      if (fanItem && fanItem.text) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【粉丝动态】' + fanItem.text;
    }
  }
  // v5: 家属日常偶遇 FAMILY_ENCOUNTER_POOL — 妹妹设定下每天25%触发
  if (isDebutPopup && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.isBrother && Math.random() < 0.25 && FAMILY_ENCOUNTER_POOL && FAMILY_ENCOUNTER_POOL.length) {
    var famItem = pickWeighted(FAMILY_ENCOUNTER_POOL);
    if (famItem && famItem.text) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【家属日常】' + famItem.text;
  }
  // v5: 后辈同业接触 JUNIOR_INDUSTRY_POOL — 出道后每天25%触发
  if (isDebutPopup && Math.random() < 0.25 && JUNIOR_INDUSTRY_POOL && JUNIOR_INDUSTRY_POOL.length) {
    var jrItem = pickWeighted(JUNIOR_INDUSTRY_POOL);
    if (jrItem && jrItem.text) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【行业接触】' + jrItem.text;
  }
  // v5: 情敌心理独白 RIVAL_PSYCHOLOGY_POOL — 情敌存在+好感>=20时每天15%触发
  if (isDebutPopup && E.rival && E.rival.name && E.affection >= 20 && Math.random() < 0.15 && RIVAL_PSYCHOLOGY_POOL && RIVAL_PSYCHOLOGY_POOL.length) {
    var rpItem = pickWeighted(RIVAL_PSYCHOLOGY_POOL);
    if (rpItem && rpItem.text) GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【情敌视角】' + rpItem.text;
  }
  // v5：日记条目（每3天自动生成一条日记）
  if (E.cycle._gameDayCount - (E._lastDiaryDay || 0) >= 3 && Math.random() < 0.6) {
    E._lastDiaryDay = E.cycle._gameDayCount;
    if (!E._diaryEntries) E._diaryEntries = [];
    // 从 diarySummary 中取当天摘要作为日记文本
    var summaryText = '';
    var sums = E.diarySummary || [];
    var curDay = E.cycle._gameDayCount || E.cycle.dayCount;
    for (var si2 = sums.length - 1; si2 >= 0; si2--) {
      if (sums[si2].day === curDay) { summaryText = sums[si2].summary || ''; break; }
    }
    // 没有摘要则从 AI 日记 (E.diary) 取当天最新一条
    if (!summaryText) {
      var diaries = E.diary || [];
      for (var di2 = diaries.length - 1; di2 >= 0; di2--) {
        if (diaries[di2].day === curDay) { summaryText = (diaries[di2].content || '').substring(0, 60); break; }
      }
    }
    E._diaryEntries.push({ day: curDay, text: summaryText || ('第' + curDay + '天的偶像日常'), timestamp: Date.now() });
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
      // v4: 池子接入⑪ VARIETY_MOMENT_POOL — 综艺日程完成后触发出圈梗/表情包
      if (se.type === 'variety' && VARIETY_MOMENT_POOL && VARIETY_MOMENT_POOL.length) {
        var vmItem = pickWeighted(VARIETY_MOMENT_POOL);
        if (vmItem && vmItem.text) GS._entSimPendingEvent = '【综艺名场面】' + vmItem.text;
      }
      GS.entSim.career.popularity = Math.max(0, Math.min(100, (GS.entSim.career.popularity || 0) + (d.pop || 0)));
      if (d.exp) addCareerPublicity(d.exp, typeLabel + '·' + (d.show || d.brand || d.mag || d.t));
      E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: se.type + '_done', text: typeLabel + '完成：' + (d.show || d.brand || d.mag || d.t) + '，人气+' + (d.pop || 0) });
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
  autoUpdateBrotherStance(); // 先根据 support 区间自动切换立场，再判断事件
  maybeBrotherEvent();
  // 旧男主主动（已被倒计时替代），仅当倒计时未触发时兜底
  if (!contactTriggered) maybeMaleLeadInitiative();
  checkOneHeartEvents();
  // v5: 84突破事件检查——好感80-83时注入关键转折选项
  var break84Event = check84BreakEvent();
  if (break84Event) {
    if (!GS._entSimPopupQueue) GS._entSimPopupQueue = [];
    GS._entSimPopupQueue.push({ type: 'break84', data: break84Event });
  }
  // v5: 约后余波——昨天约过会，今天30%概率注入后续互动
  checkDateAftermath(E);
  finalizeDailyCycle(chapterCrossed);
  // 每日结算弹窗：显示今日变化（非第一天的第一个回合）
  if (E.cycle.dayCount > 1) {
    showDailySettlement(E, lastPop, lastExp, lastAff);
  }
  // v4: 保存今天末的快照供明天结算对比
  E._lastPopSnapshot = (E.career && typeof E.career.popularity === 'number') ? E.career.popularity : 0;
  // 测试模式：标记换天已完成（供 buildTestNarrative 展示换天链路）
  if (window.__ENT_SIM_TEST) {
    GS._entSimNextDayTrace = {
      lastPop: lastPop, lastExp: lastExp, lastAff: lastAff,
      newDay: E.cycle._gameDayCount || 1,
      chapterCrossed: chapterCrossed
    };
  }
  // 压缩昨日记忆（AI 提取，慢不怕），随后清空当天剧情并生成新一天开场
  return compressEntSimMemory().then(function() {
    // 清空前保存前一天结尾剧情（供 nextDayOpening 注入衔接锚点，避免跨天断层）
    var _prev = (GS._entSimCurrent && GS._entSimCurrent.narrative) ? GS._entSimCurrent.narrative.slice(-600) : '';
    if (_prev) GS._entSimPrevDayEnd = _prev;
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
  if (E.romance.seedEvent && E.romance.seedEvent.length > 10) return Promise.resolve();
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
  // 同步季节/月份
  GS.gameMonth = gameMonthOf(E.cycle.dayCount);
  GS.season = gameSeasonOf(E.cycle.dayCount);
  var slotLabel = ['上午', '下午', '夜晚'][newSlot];
  return generateEntSimRound('phase', {
    timeSlot: newSlot,
    timeSlotLabel: slotLabel,
    freeSlot: newSlot >= 2
  });
}

// 终局检查：好感≥100且距甜度峰值≥10轮时提示玩家可走向大结局（不强制结束）
export function enterEntSimEnding() {
  var E = GS.entSim;
  if (!E || E.affection < 100 || ((E.cycle.roundTotal - (E.flags.sweetMaxRound || 0)) < 10)) {
    return null;
  }
  // v5: 不自动触发结局，仅返回提示让UI显示"走向大结局"按钮
  return { type: 'ready', label: '走向大结局', hint: '你的感情已经到了该做决定的时候了……' };
}

// 生成 AI 结局叙事（纯文本 800-1200 字），存入 GS._entSimEndingNarrative
export async function generateEntSimEndingNarrative(ending) {
  var E = GS.entSim;
  if (!E || !ending) return;
  var sys = buildEntSimSystemPrompt();
  var tone = ENDING_TONE[ending.type] || '平静收束，点到为止。';
  // v5: 结局前置事件 ENDING_PRELUDE_POOL — 按人气×结局方向选取铺垫场景
  var isHappyEnding = ending.type === 'HE' || (ending.label && ending.label.indexOf('HE') >= 0) || (ending.type === 'hidden_route' && ending.label && ending.label.indexOf('甜蜜') >= 0);
  var preludeItem = typeof pickEndingPrelude === 'function' ? pickEndingPrelude(popularity(), (E.affection || 0), isHappyEnding) : null;
  var preludeText = preludeItem && preludeItem.text ? '\n【前置场景（结局前铺垫，请融入叙事）】' + preludeItem.text : '';
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
    preludeText,
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
  var ev = pickWeighted(pool);
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
  // ═══ 测试模式：绕过AI，返回带池子标注的轻量内容 ═══
  if (window.__ENT_SIM_TEST) {
    var mock = '';
    if (type === 'chat') {
      mock = buildTestChatReply(extra && extra.msg);
    } else if (type === 'moment') {
      mock = buildTestMoment();
    } else if (type === 'theater') {
      mock = buildTestTheater(extra && extra.theme);
    } else if (type === 'dating') {
      mock = '【池子数据】\n约会地点：' + (extra && extra.slot ? extra.slot.label || extra.slot.name || '未指定' : '未指定') + '\n【/池子数据】\n\n【AI扩写区】\nAI 会扩写约会场景：对话、小动作、避嫌/被曝光风险、心情变化。\n【/AI扩写区】';
    } else if (type === 'diary' || type === 'diaryHis') {
      mock = '【池子数据】\n日记条目：第 ' + ((GS.entSim && GS.entSim.cycle && GS.entSim.cycle._gameDayCount) || 1) + ' 天\n来源：diarySummary / diary\n【/池子数据】\n\n【AI扩写区】\nAI 会将今日事件整理成女主第一人称日记。\n【/AI扩写区】';
    } else {
      mock = '【池子数据】\ntype: ' + type + '\n来源：runEntSimType\n【/池子数据】\n\n【AI扩写区】\nAI 会按此类型扩写对应文本。\n【/AI扩写区】';
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
      var entry = pickWeighted(chatPool);
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
    if (typeof nar === 'object') nar = nar.content || nar.reply || nar.text || nar.raw || '';
    if (typeof nar !== 'string' || nar.trim().length < 2) {
      // chat-ack 兜底：从成员人设池子取默认回复（13人×3角色=39池）
      var ackPool = typeof getChatAckByMember === 'function' ? getChatAckByMember('maleLead') : null;
      nar = (ackPool && ackPool.length) ? ackPool[Math.floor(Math.random() * ackPool.length)] : '（嗯。）';
    }
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
    E.diary.push({ day: E.cycle._gameDayCount || 1, content: narrative, ts: Date.now() });
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
    E.diaryHis.push({ day: E.cycle._gameDayCount || 1, content: narrative, ts: Date.now() });
    if (E.diaryHis.length > 30) E.diaryHis = E.diaryHis.slice(-30);
    saveGame();
  });
}

// 秘密信箱：男主第一人称私密信（对齐1v1信件系统）
// v5: 30%概率使用 MALE_LEAD_PERSPECTIVE_POOL 池子内容，节省API调用
export function generateEntSimLetter() {
  // 30%概率直接使用男主视角池子文本作为信件内容
  if (Math.random() < 0.30 && MALE_LEAD_PERSPECTIVE_POOL && MALE_LEAD_PERSPECTIVE_POOL.length) {
    var item = pickWeighted(MALE_LEAD_PERSPECTIVE_POOL);
    if (item && item.text && item.text.length > 20) {
      var E = GS.entSim;
      E.letters = E.letters || [];
      E.letters.push({ day: E.cycle._gameDayCount || 1, round: E.cycle.roundTotal || 1, content: '【男主心声】\n' + item.text, ts: Date.now(), read: false });
      if (E.letters.length > 30) E.letters = E.letters.slice(-30);
      saveGame();
      return;
    }
  }
  // 70%概率走AI生成
  return runEntSimType('letter', {}, function(narrative) {
    if (!narrative || narrative.length < 20) return;
    var E = GS.entSim;
    E.letters = E.letters || [];
    E.letters.push({ day: E.cycle._gameDayCount || 1, round: E.cycle.roundTotal || 1, content: narrative, ts: Date.now(), read: false });
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

// 约会：好感度 >= 30 可约，v5: 4种约会类型 + 心理影响
export function initiateEntSimDate(venue, dateType) {
  var E = GS.entSim;
  var conflict = checkScheduleConflict(E);
  if (conflict) { showScheduleConflictModal(conflict, venue); return; }
  var today = E.cycle._gameDayCount;
  if (E.romance._lastDateDay && today - E.romance._lastDateDay <= 0) return Promise.reject(new Error('今天已经约过啦'));
  if (E.romance._dateConsecutive >= 2) {
    var cooldownRemain = 3 - (today - (E.romance._lastDateDay || 0));
    if (cooldownRemain > 0) return Promise.reject(new Error('约会冷却中，还需 ' + cooldownRemain + ' 天'));
    E.romance._dateConsecutive = 0;
  }
  if (E.affection < 30) return Promise.reject(new Error('好感度不足 30，暂时约不到他～'));
  if (E.romance._lastDateDay && today - E.romance._lastDateDay === 1) {
    E.romance._dateConsecutive = (E.romance._dateConsecutive || 0) + 1;
  } else if (today - (E.romance._lastDateDay || 0) > 1) {
    E.romance._dateConsecutive = 1;
  }
  E.romance._lastDateDay = today;
  var venueName = typeof venue === 'object' ? venue.name : venue;
  var venueExp = (typeof venue === 'object' && typeof venue.exposure === 'number') ? venue.exposure : 1;
  // v5: 约会类型 — sneak(偷偷约)/cover(借哥掩护)/group(集体约)/birthday(生日约)
  var dt = dateType || 'sneak';
  var dtLabels = { sneak: '偷偷约', cover: '借哥掩护', group: '集体约', birthday: '生日特别约' };
  var dtExposureMod = { sneak: 1, cover: 0.5, group: 0.3, birthday: 1.2 };  // 掩护减曝光，集体约最安全
  var effectiveExp = Math.round(venueExp * (dtExposureMod[dt] || 1));
  return runEntSimType('date', { dateVenue: venueName, dateType: dt }, function(narrative, parsed) {
    // plan #21: 生日特别约/首次约会为高光事件，可突破日上限
    var isHigh = (dt === 'birthday' || E.romance.dateCount === 0);
    applyEntSimAffection(3, { _isHighMoment: isHigh, _affReason: '约会·' + (dtLabels[dt] || '') });
    addExposure(effectiveExp, '约会·' + (dtLabels[dt] || '') + '·' + (venueName || ''));
    E.romance.dateCount++;
    // v5: 约后心理影响
    if (E.psyche) {
      E.psyche.stress = Math.max(0, (E.psyche.stress || 0) - 8);  // 约会减压
      E.psyche.anxiety = Math.max(0, (E.psyche.anxiety || 0) - 5);
      E.psyche.confidence = Math.min(100, (E.psyche.confidence || 50) + 3);
      E.psyche.fatigue = Math.max(0, (E.psyche.fatigue || 0) - 2);
    }
    E._lastDateDay = E.cycle.dayCount;
    E._lastDateVenue = venueName;
    E._lastDateType = dt;
    GS._entSimCurrent = { narrative: narrative, options: parsed.options || [], extras: { dateVenue: venueName, dateType: dt }, type: 'date' };
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
// v5: 约后余波——昨天约过会，今天30%概率注入后续互动文本
function checkDateAftermath(E) {
  if (!E._lastDateDay || E._lastDateDay !== E.cycle.dayCount - 1) return null;
  // v5: 约会后心理恢复——无论是否注入余波文本，都做心理恢复
  if (E.psyche) {
    E.psyche.stress = Math.max(0, (E.psyche.stress || 0) - 10);
    E.psyche.confidence = Math.min(100, (E.psyche.confidence || 50) + 5);
  }
  if (Math.random() < 0.3) return null;
  var venue = E._lastDateVenue || '';
  var aftermaths = [
    '昨天的' + (venue ? venue + '约会' : '约会') + '之后——今天你看到他的消息时嘴角还是忍不住上扬。他发了一句"昨天的咖啡不错"。你在对话框里打了三个小时"我也觉得"——最终只发了"嗯"。',
    '昨晚没睡好——脑子里全是' + (venue ? venue : '约会时') + '的画面。今天练习的时候分神了两次，被队长点了名。但你没不好意思——因为你知道他昨天应该也分神了。',
    '他今天穿了昨天那件外套——是你约会时不经意碰过袖口的那件。他在走廊路过时没有停下，但你捕捉到他闻了闻袖口。那是你昨天擦护手霜沾上的味道。',
    '经纪人说今天有人投稿你"疑似恋爱"。你心跳停了一拍——点进去发现是粉丝在嗑你和一个演员的CP。你松了口气但也莫名有点失落。'
  ];
  var picked = pickWeighted(aftermaths);
  GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【约后余波】' + picked;
  return picked;
}

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

// ── 章节跨越蒙太奇（日历翻页 + 章节标题 + 过渡叙述） ──
// icon/name/desc：章节信息
// skipDays：时间跳跃天数（来自 CHAPTER_TIME_SKIP）
// transitionText：从 TIME_SKIP_TRANSITION 池抽取的过渡叙述
function showChapterTransition(icon, name, desc, skipDays, transitionText) {
  try {
    if (typeof document === 'undefined') return;
    // 防重入：若已有蒙太奇在播，直接跳过
    if (document.querySelector('.es-montage-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'es-montage-overlay';

    // 时间跨度提示文字
    var skipLabel = '';
    if (skipDays && skipDays > 0) {
      var months = Math.round(skipDays / 30);
      var years = Math.floor(months / 12);
      var remMonths = months % 12;
      if (years > 0 && remMonths > 0) skipLabel = years + ' 年 ' + remMonths + ' 个月后…';
      else if (years > 0) skipLabel = years + ' 年后…';
      else if (months > 0) skipLabel = months + ' 个月后…';
      else skipLabel = skipDays + ' 天后…';
    }

    var html = '';
    if (skipLabel) {
      html += '<div class="es-montage-timeskip">⏳ ' + escHtml(skipLabel) + '</div>';
    }
    // 日历堆叠（占位，JS 动态生成翻页序列）
    html += '<div class="es-calendar-stack" id="es-cal-stack"></div>';
    // 章节标题
    html += '<div class="es-montage-chapter" id="es-montage-chap">' +
      '<span class="chap-icon">' + escHtml(icon || '✨') + '</span>' +
      '<span class="chap-name">' + escHtml(name || '新章节') + '</span>' +
      '<div class="chap-rule"></div>' +
    '</div>';
    // 过渡叙述正文
    if (transitionText) {
      html += '<div class="es-montage-transition" id="es-montage-ts">' +
        '<span class="ts-quote">“</span>' + escHtml(transitionText) +
      '</div>';
    }
    // 跳过按钮
    html += '<button class="es-montage-skip-btn" id="es-montage-skip">跳过 ›</button>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // 计算日历翻页序列：按月分段，最多 8 页避免太久
    var pages = buildCalendarPages(skipDays);
    var stack = overlay.querySelector('#es-cal-stack');
    var skipBtn = overlay.querySelector('#es-montage-skip');
    var chapEl = overlay.querySelector('#es-montage-chap');
    var tsEl = overlay.querySelector('#es-montage-ts');

    var cleaned = false;
    var timers = [];
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      timers.forEach(function(t) { clearTimeout(t); });
      overlay.classList.add('es-montage-closing');
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 500);
    }
    skipBtn.addEventListener('click', cleanup);

    // 渲染日历页序列
    var flipInterval = 380; // 每页间隔 ms
    var pageDelay = 600;    // 首页出现前的等待
    pages.forEach(function(p, i) {
      var t = setTimeout(function() {
        if (cleaned) return;
        var page = document.createElement('div');
        page.className = 'es-calendar-page entering';
        page.innerHTML =
          '<div class="cal-month">' + escHtml(p.month) + '</div>' +
          '<div class="cal-day">' + escHtml(p.day) + '</div>' +
          '<div class="cal-divider"></div>' +
          '<div class="cal-weekday">' + escHtml(p.weekday) + '</div>';
        // 上一页翻飞
        var prev = stack.querySelector('.es-calendar-page:not(.flipping)');
        if (prev) {
          prev.classList.remove('entering');
          prev.classList.add('flipping');
          setTimeout(function() { if (prev.parentNode) prev.parentNode.removeChild(prev); }, 600);
        }
        stack.appendChild(page);
      }, pageDelay + i * flipInterval);
      timers.push(t);
    });

    // 翻完所有页 → 显示章节标题
    var chapterDelay = pageDelay + pages.length * flipInterval + 300;
    var t2 = setTimeout(function() {
      if (cleaned) return;
      // 清掉残留页
      var remain = stack.querySelectorAll('.es-calendar-page');
      remain.forEach(function(el) {
        el.classList.add('flipping');
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
      });
      if (chapEl) chapEl.classList.add('shown');
    }, chapterDelay);
    timers.push(t2);

    // 章节标题出来 600ms 后 → 显示过渡叙述
    var tsDelay = chapterDelay + 700;
    if (tsEl) {
      var t3 = setTimeout(function() {
        if (cleaned) return;
        tsEl.classList.add('shown');
      }, tsDelay);
      timers.push(t3);
    }

    // 总时长：叙述展示约 2.5s 后淡出
    var total = tsDelay + (transitionText ? 2800 : 1400);
    var tEnd = setTimeout(cleanup, total);
    timers.push(tEnd);
  } catch(e) { console.warn('[chapterMontage]', e); }
}

// 构建日历翻页序列（按月分段，最多8页）
function buildCalendarPages(skipDays) {
  var pages = [];
  if (!skipDays || skipDays <= 0) {
    // 无跳跃：单页占位（章节标题仍会显示）
    pages.push({ month: '当下', day: '·', weekday: 'TODAY' });
    return pages;
  }
  var months = Math.max(1, Math.round(skipDays / 30));
  // 限制最多 8 页
  var pageCnt = Math.min(8, months);
  // 每页代表 (months / pageCnt) 个月的时间切片
  var perPage = months / pageCnt;
  var monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var weekdays = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  // 起点近似为当前月份（用 Date 兜底，无则从1月起）
  var startMonth = 0;
  try {
    var now = new Date();
    startMonth = now.getMonth();
  } catch(e) {}
  for (var i = 0; i < pageCnt; i++) {
    var m = Math.floor((startMonth + Math.round(i * perPage)) % 12);
    pages.push({
      month: monthNames[m] || ('M' + (m + 1)),
      day: String(Math.min(28, 1 + Math.floor(Math.random() * 28))).padStart(2, '0'),
      weekday: weekdays[Math.floor(Math.random() * 7)]
    });
  }
  return pages;
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
  var b = pickWeighted(buzzes);
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
  var o = pickWeighted(opts);
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
      '<div class="es-stageup-label">Day ' + (E.cycle._gameDayCount - 1) + ' 结算</div>' +
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
    var parts = fullText.split(/=+\s*FAN\s*_?\s*REPLIES\s*=+/i); // v4: 宽松匹配，支持各种分隔符格式
    var msgToFans = (parts[0] || '').replace(/^msgToFans[:：]\s*/i, '').trim();
    var fanRepliesStr = (parts[1] || '').trim();
    var fanReplies = fanRepliesStr ? fanRepliesStr.split('\n').filter(function(l) { return l.trim(); }) : [];
    // 保存到历史
    E.bubble.messages = E.bubble.messages || [];
    E.bubble.messages.push({ msg: msgToFans, replies: fanReplies, day: E.cycle._gameDayCount || E.cycle.dayCount, ts: Date.now() });
    E.bubble.todayCount = (E.bubble.todayCount || 0) + 1;
    E.bubble.lastSentDay = E.cycle._gameDayCount || E.cycle.dayCount;
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
