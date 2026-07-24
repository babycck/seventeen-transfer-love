// ============================================================
// 娱乐圈模拟器（entSim）· 主循环引擎（纯恋爱游戏 + 娱乐圈背景）
// generateEntSimRound：生成 → 解析 → 应用副作用 → 推进时段氛围
// 换天由玩家点「进入下一天」(goEntSimNextDay) 显式触发。
// ============================================================
import { GS, saveGame } from '../state.js';
import { checkChapterAdvance, initEntSimState, popularity, careerLevel } from './state.js';
import { generateWithRetry } from '../ai-generator.js';
import { showToast, randInt } from '../utils.js';
import { parseEntSimResponse, parseEntSimExtras, safeParseJson } from './parser.js';
import { buildEntSimSystemPrompt, buildEntSimUserMessage } from './prompts.js';
import { rollDailyAgenda, getTimeOfDayLabel } from './cycle.js';
import { applyDiscoveryBlowback, addExposure } from './public-opinion.js';
import { recordRomanceBeat, tryConfession, applyConfessionResult, applyCover, applyEntSimAffection, tickRomanceTimers } from './romance.js';
import { generateDailyBuzz, generateFanReaction } from './immersion.js';
import { evaluateEnding } from './endings.js';
import { compressEntSimMemory, buildMemorySnapshot } from './memory.js';
import { maybeBrotherEvent, maybeMaleLeadInitiative, checkOneHeartEvents } from './brother.js';
import { getNpcNodes } from './npc-network.js';
import { ENDING_TONE, TEAMMATE_FLAVOR, DAILY_ENGAGEMENT_POOL } from './data.js';

// 生成中标记（模块级，避免严格模式下的隐式全局报错）
var _entSimInflight = null;

// 主生成循环
export function generateEntSimRound(type, extra) {
  if (GS._entSimGenerating) {
    return _entSimInflight || Promise.reject(new Error('生成中，请稍候'));
  }
  GS._entSimGenerating = true;
  extra = extra || {};

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
  if (typeof extras.affectionDelta === 'number') applyEntSimAffection(extras.affectionDelta);
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

function applySecretEffect(s) {
  var E = GS.entSim;
  if (s.item && E.secret.items.indexOf(s.item) < 0) E.secret.items.push(s.item);
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
  E.cycle.dayCount++;
  E.cycle.roundTotal++; // 换天才推进回合数，避免每次操作污染冷却/冷战倒计时
  // 秘密信箱：每 7-10 回合自动一封信
  if (E.cycle.roundTotal > 0 && E.cycle.roundTotal % (7 + randInt(0, 3)) === 0) {
    generateEntSimLetter(); // 异步，不阻塞
  }
  // 朋友圈自动生成：每 3-5 回合自动一条（对齐 1v1 规则）
  E._momentCounter = (E._momentCounter || 0) + 1;
  var momentThresh = 3 + Math.floor(Math.random() * 3); // 3~5
  if (E._momentCounter >= momentThresh) {
    E._momentCounter = 0;
    generateEntSimMoment(); // 异步，不阻塞换天流程
  }
  E.cycle.timeOfDay = 0; // 时段不随操作推进，换天重置为上午
  E.chapter.roundInChapter = (E.chapter.roundInChapter || 0) + 1; // 章节内回合/天数累计
  tickRomanceTimers(); // 清理过期冷战 / 告白冷却
  rollDailyAgenda();
  generateDailyBuzz();
  // 每日营业事件：从 100+ 条池子随机抽一条，异步生成粉丝圈反应（不阻塞换天）
  var pool = DAILY_ENGAGEMENT_POOL.slice();
  var engEvent = pool[randInt(0, pool.length - 1)];
  generateFanReaction('每日营业', engEvent).catch(function(){});
  // 曝光累计衰减 30%
  E.misc.exposureAccum = Math.floor((E.misc.exposureAccum || 0) * 0.7);
  // 重置每日 NPC 互动次数
  E.misc.npcInteractionUsed = 0;
  // 章节跨越检查（人气推进，只进不退）
  var chapterCrossed = checkChapterAdvance();
  // 哥哥事件 15% + 男主主动 10% + 系统每日事件池
  maybeBrotherEvent();
  maybeMaleLeadInitiative();
  checkOneHeartEvents();
  // 章节跨越提示：如果刚进入新章节，追加到待触发事件前
  if (chapterCrossed && E.chapter && E.chapter.entered) {
    var chMsg = '【章节跨越】你进入了「' + (E.chapter.icon || '') + ' ' + (E.chapter.name || '') + '」：' + (E.chapter.desc || '新阶段带来新的机会与风险。') + ' 注意周围目光和粉丝情绪正在变化。';
    GS._entSimPendingEvent = (GS._entSimPendingEvent ? chMsg + '\n' + GS._entSimPendingEvent : chMsg);
    E.chapter.entered = false;
  }
  saveGame();
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
  var prompt = '为男主「' + mlName + '」写一段约 200 字的场景，描写他对女主暗暗上心的契机：可以是女主某句话、某个舞台动作、被哥哥吐槽的瞬间、或某个不经意的相处让他心动。要具体、可被后续剧情回溯引用，用「她」指代女主、不出现女主姓名。直接输出场景正文，不要标题、不要解释、不要选项。';
  return generateWithRetry(sysPrompt, prompt, { temperature: 0.8, maxTokens: 400, plainText: true, skipValidate: true })
    .then(function(res) {
      var txt = (res && res.raw) ? res.raw.trim() : '';
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

// 继续主线（拉回主线）
export function continueEntSimMain() {
  return generateEntSimRound('phase', {});
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
  return ending;
}

// 女团队友支线：点击某位队友触发专属互动事件
export function triggerTeammateEvent(member) {
  if (!member) return;
  var flavor = TEAMMATE_FLAVOR[member.roleTag] || '队友找你聊了聊近况。';
  var extraNote = '请让队友「' + member.name + '（' + member.roleTag + '）」出场，' + flavor +
    '。剧情围绕女团日常展开，男主/哥哥/情敌的互动自然穿插，不要喧宾夺主。';
  triggerEntSimEvent('队友·' + member.name + '（' + member.roleTag + '）', { extraNote: extraNote });
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
        E.affection = (E.affection || 0) + affGained;
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
    var rivalNode = null;
    try { rivalNode = getNpcNodes().filter(function(n) { return n.type === 'rival' || n.type === 'suitor'; })[0]; } catch(e) {}
    var rvName = (rivalNode && rivalNode.name) || '';
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

// 约会：好感度 >= 30 可约，固定模板（地点池 + AI 填充 + 3 选项），不能翘班
export function initiateEntSimDate(venue) {
  var E = GS.entSim;
  if (E.affection < 30) return Promise.reject(new Error('好感度不足 30，暂时约不到他～'));
  return runEntSimType('date', { dateVenue: venue }, function(narrative, parsed) {
    applyEntSimAffection(3);
    E.misc.exposureAccum = (E.misc.exposureAccum || 0) + 1;
    E.romance.dateCount++;
    GS._entSimCurrent = { narrative: narrative, options: parsed.options || [], extras: { dateVenue: venue }, type: 'date' };
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
