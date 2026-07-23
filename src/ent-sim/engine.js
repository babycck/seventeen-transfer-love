// ============================================================
// 娱乐圈模拟器（entSim）· 主循环引擎
// generateEntSimRound：生成 → 解析 → 应用副作用 → 推进周期/作品/NPC/颁奖/章节
// 不依赖 oneHeart 引擎（完全独立路径）
// ============================================================
import { GS, saveGame } from '../state.js';
import { generateWithRetry } from '../ai-generator.js';
import { showToast } from '../utils.js';
import { parseEntSimResponse, parseEntSimExtras } from './parser.js';
import { buildEntSimSystemPrompt, buildEntSimUserMessage } from './prompts.js';
import { advanceCycle, rollDailyAgenda } from './cycle.js';
import { applyOpinionImpact, applyDiscoveryBlowback } from './public-opinion.js';
import { triggerNpcChain, tickPaparazzi, maybeFilmSisBackstab, dailyNpcRoll } from './npc-network.js';
import { recordRomanceBeat, tickCollabRomance } from './romance.js';
import { progressWorks, applyWorkBuzz } from './works.js';
import { checkChapterAdvance, enterChapter } from './chapter.js';
import { maybeNominateAwards } from './awards.js';
import { doFanService } from './fan-service.js';
import { maybeOfferCollab } from './collab.js';
import { generateDailyBuzz } from './immersion.js';
import { evaluateEnding } from './endings.js';

// 主生成循环
var _entSimInflight = null;
export function generateEntSimRound(type, extra) {
  if (GS._entSimGenerating) {
    // 并发调用（如生成中误点按钮）：返回当前在途 promise，避免未处理 rejection
    return _entSimInflight || Promise.reject(new Error('生成中，请稍候'));
  }
  GS._entSimGenerating = true;
  extra = extra || {};

  // 压缩：叙事缓冲过长时先压缩
  maybeCompress();

  var sys = buildEntSimSystemPrompt();
  var user = buildEntSimUserMessage(type, extra);

  // 生成前显示「生成中」反馈，避免点击选项/自由输入后无任何提示
  var _nEl = (typeof document !== 'undefined') ? document.getElementById('es-narrative') : null;
  if (_nEl) _nEl.innerHTML = '<div class="es-loading">✨ 剧情生成中…</div>';

  _entSimInflight = generateWithRetry(sys, user, { temperature: 0.9, maxTokens: 2200 })
    .then(function(res) {
      var raw = (res && res.raw) ? res.raw : '';
      var parsed = parseEntSimResponse(raw);
      var extras = parseEntSimExtras(parsed.extras);
      applySideEffects(extras);

      // 推进世界（每回合一次）
      advanceWorld();

      var current = {
        narrative: parsed.narrative || '',
        options: parsed.options || [],
        extras: extras,
        type: type
      };
      GS._entSimCurrent = current;
      // 已有有效叙事则重置自动重试计数，避免后续误判仍为空
      if (current.narrative) GS._entSimAutoTries = 0;
      GS._entSimNarrativeBuffer = (GS._entSimNarrativeBuffer || '') + '\n' + parsed.narrative;
      saveGame();
      return current;
    })
    .catch(function(err) {
      showToast('生成失败：' + (err && err.message ? err.message : '未知错误'));
      // 写入兜底，避免 narrative 为空导致 bindEntSimEvents 反复自动重试
      var fb = { narrative: '（剧情生成失败，请点击「拉回主线」重试）', options: ['重试'], extras: {}, type: type, failed: true };
      GS._entSimCurrent = fb;
      return fb;
    })
    .then(function(current) {
      GS._entSimGenerating = false;
      _entSimInflight = null;
      return current;
    });
  return _entSimInflight;
}

// 应用 AI 返回的副作用
function applySideEffects(extras) {
  if (!extras) return;
  if (extras.romanceBeat) recordRomanceBeat(extras.romanceBeat);
  if (extras.opinionDelta) applyOpinionImpact(extras.opinionDelta, '剧情事件');
  if (extras.exposureEvent) {
    var mag = extras.exposureEvent.magnitude || 0;
    GS.entSim.misc.exposureAccum = (GS.entSim.misc.exposureAccum || 0) + mag;
    if (mag > 0) {
      // 被发现的毁灭性后果：severity 随曝光量升级，最高 5 级＝事业崩塌
      var sev = Math.max(1, Math.min(5, Math.ceil(mag / 2)));
      applyDiscoveryBlowback(sev);
    }
  }
  if (extras.npcEncounter) applyNpcEncounter(extras.npcEncounter);
  if (extras.workProgress) {
    // 应用到最近一个 needsBuzz 或在播作品
    var target = findBuzzTarget();
    if (target) applyWorkBuzz(target.id, extras.workProgress.buzzDelta || 0, extras.workProgress.note || '');
  }
  if (extras.fanServiceNote && extras.fanServiceNote.type) doFanService(extras.fanServiceNote.type);
  if (extras.collabProposal && extras.collabProposal.type) {
    maybeOfferCollab(extras.collabProposal.source || 'AI');
    GS.entSim.flags.collabProposal = Object.assign(GS.entSim.flags.collabProposal || {}, extras.collabProposal);
  }
  if (extras.awardsNomination) {
    GS.entSim.flags.awardsNom = {
      name: '年度最佳女艺人', nominee: (GS.heroineProfile && GS.heroineProfile.name) || '你',
      round: GS.entSim.cycle.roundTotal, resolved: false
    };
  }
  if (extras.brother) applyBrotherEffect(extras.brother);
  if (extras.secret) applySecretEffect(extras.secret);
  if (extras.endingsHint) GS.entSim.endings.hint = extras.endingsHint;
  if (extras.chapterHint && extras.chapterHint > GS.entSim.chapter.index) {
    var target2 = checkChapterAdvance();
    if (target2) enterChapter(target2);
  }
}

function applyNpcEncounter(enc) {
  var E = GS.entSim;
  // npcEncounter.type 合法值 → 关系网节点类型（AI 用中文语义词，需映射到节点 id）
  var typeMap = { '情敌': 'rival', '男主情敌': 'suitor' };
  var ntype = typeMap[enc.type] || enc.type;
  var node = E.npcNetwork.nodes['npc_' + ntype];
  if (!node) return;
  if (typeof enc.intimacyDelta === 'number') node.intimacy += enc.intimacyDelta;
  if (enc.stance) node.stance = enc.stance;
  node.lastEventRound = E.cycle.roundTotal;
  if (enc.exposure) {
    E.misc.exposureAccum = (E.misc.exposureAccum || 0) + enc.exposure;
    if (enc.exposure > 0) {
      var npcSev = Math.max(1, Math.min(3, Math.ceil(enc.exposure / 2)));
      applyDiscoveryBlowback(npcSev);
    } else {
      applyOpinionImpact({ media: -1, fan: 1 }, 'NPC·' + node.name);
    }
  }
  if (ntype === 'rival' && enc.stance === '退出祝福') E.brother.rivalAware = true;
  if (ntype === 'suitor' && enc.stance === '退出祝福') node.stance = '退出祝福';
  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'npc', text: node.name + '：' + (enc.event || '') });
}

function applyBrotherEffect(b) {
  var E = GS.entSim;
  if (b.stance) E.brother.stance = b.stance;
  if (typeof b.supportDelta === 'number') E.brother.support = Math.max(-100, Math.min(100, E.brother.support + b.supportDelta));
  if (b.note) E.careerHistory.push({ round: E.cycle.roundTotal, type: 'brother', text: b.note });
}

function applySecretEffect(s) {
  var E = GS.entSim;
  if (s.item && E.secret.items.indexOf(s.item) < 0) E.secret.items.push(s.item);
  if (s.foundByRival) E.secret.foundByRival = true;
}

function findBuzzTarget() {
  var slots = GS.entSim.works.slots;
  for (var id in slots) {
    if (!Object.prototype.hasOwnProperty.call(slots, id)) continue;
    if (slots[id].needsBuzz) return slots[id];
  }
  // 否则取最近一个在播作品
  var last = null;
  for (var k in slots) {
    if (!Object.prototype.hasOwnProperty.call(slots, k)) continue;
    if (slots[k].stage === 2) last = slots[k];
  }
  return last;
}

// 每回合推进世界状态
function advanceWorld() {
  var E = GS.entSim;
  rollDailyAgenda();
  var cycleRes = advanceCycle();
  var readyForBuzz = progressWorks();
  if (readyForBuzz && readyForBuzz.length) {
    E.pendingBuzz = readyForBuzz.map(function (w) { return w.id; });
  }
  tickCollabRomance();
  dailyNpcRoll();
  maybeFilmSisBackstab();
  var pap = tickPaparazzi();
  if (pap && pap.exploded) showToast('📸 狗仔实锤放料！');
  var aw = maybeNominateAwards();
  if (aw && aw.nominated) showToast('🏆 入围' + aw.name);
  // 章节推进
  var ch = checkChapterAdvance();
  if (ch) {
    var meta = enterChapter(ch);
    if (meta) GS._entSimChapterTransition = meta;
  }
  generateDailyBuzz();
  saveGame();
  return { cycleRes: cycleRes };
}

function maybeCompress() {
  var buf = GS._entSimNarrativeBuffer || '';
  if (buf.length > 6000) {
    // 简单压缩：截断到最近 4000 字保留上下文
    GS._entSimNarrativeBuffer = buf.slice(-4000);
  }
}

// 玩家选择
export function handleEntSimChoice(optionIndex, choiceText) {
  return generateEntSimRound('choice', { choiceText: choiceText });
}

// 自由输入
export function handleEntSimFreeInput(text) {
  return generateEntSimRound('free', { freeText: text });
}

// 触发事件
export function triggerEntSimEvent(eventText) {
  return generateEntSimRound('event', { eventText: eventText });
}

// 继续主线（拉回主线）
export function continueEntSimMain() {
  return generateEntSimRound('phase', {});
}

// 进入终局评估
export function enterEntSimEnding() {
  var ending = evaluateEnding();
  return ending;
}

// UI 取当前回合
export function getEntSimCurrent() {
  return GS._entSimCurrent || { narrative: '', options: [], extras: {} };
}
