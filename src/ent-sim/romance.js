// ============================================================
// 系统5 地下恋（R1 男主为独立 NPC + 恋爱深度 + 风险 + 掩护 + 告白）
// assessRomanceRisk · advanceRomance · tryConfession · applyCover · 情绪/深度取值
// ============================================================
import { GS, saveGame } from '../state.js';
import { COVER_MECHANISMS, ROMANCE_DEPTH_LABELS, ROMANCE_EMOTIONS, riskLevelText } from './data.js';
import { getRomanceRiskMultiplier } from './cycle.js';
import { applyOpinionImpact } from './public-opinion.js';

// 评估当前恋爱曝光风险（0-100）
export function assessRomanceRisk(extraExposure) {
  var E = GS.entSim;
  var mult = getRomanceRiskMultiplier();
  var o = E.publicOpinion;
  // 基础：舆论越热越危险 + 媒体/黑粉推高
  var base = (o.media * 0.3 + o.anti * 0.5) * mult;
  // 累计曝光
  var accum = (E.misc.exposureAccum || 0) * 2;
  // 掩护次数越多越易露馅（粉丝起疑）
  var coverPenalty = E.romance.coverUsed >= 3 ? 15 : 0;
  var extra = extraExposure || 0;
  var score = Math.round(base + accum + coverPenalty + extra);
  score = Math.max(0, Math.min(100, score));
  return { score: score, level: riskLevelText(score), multiplier: mult };
}

export function advanceRomance(delta) {
  var E = GS.entSim;
  E.romance.depth = Math.max(0, Math.min(5, E.romance.depth + delta));
  E.romance.lastBeatRound = E.cycle.roundTotal;
  saveGame();
  return E.romance.depth;
}

export function recordRomanceBeat(beat) {
  var E = GS.entSim;
  if (typeof beat.depthDelta === 'number') advanceRomance(beat.depthDelta);
  if (beat.emotion) E.romance.emotion = beat.emotion;
  if (beat.note) {
    E.careerHistory.push({ round: E.cycle.roundTotal, type: 'romance', text: beat.note });
  }
  if (beat.event) E.romance.seedEvent = E.romance.seedEvent || beat.event;
  saveGame();
}

export function tryConfession() {
  var E = GS.entSim;
  // 触发条件：深度>=3 且 哥哥非反对公开 且 未冷战
  var brotherOppose = (E.brother.stance === '反对公开');
  var canConfess = (E.romance.depth >= 3 && !brotherOppose && !E.flags.coldWar);
  return {
    canConfess: canConfess,
    depth: E.romance.depth,
    brotherStance: E.brother.stance,
    scene: canConfess ? '私下 / 家中，只有你们两人' : ''
  };
}

export function applyConfessionResult(result) {
  var E = GS.entSim;
  E.romance.confessionDone = true;
  E.romance.confessionResult = result;
  if (result === 'accepted') {
    advanceRomance(1);
    E.romance.publicLine = true;
    if (E.brother.support !== undefined) E.brother.support = Math.min(100, E.brother.support + 5);
  } else if (result === 'rejected') {
    E.romance.emotion = '不安';
    // 内向冷战 2 回合（由 flags.coldWarUntil 控制）
    E.flags.coldWarUntil = E.cycle.roundTotal + 2;
  } else if (result === 'delayed') {
    E.flags.confessCooldown = E.cycle.roundTotal + 5;
    if (E.brother.support !== undefined) E.brother.support = Math.max(-100, E.brother.support - 3);
    E.brother.talkPending = true; // 哥哥找女主谈话支线
  }
  saveGame();
  return result;
}

// 5 种掩护手段（系统5）：每次 uso 累计 suspicion，3 次起粉丝起疑
export function applyCover(type) {
  var E = GS.entSim;
  var mech = COVER_MECHANISMS[type];
  if (!mech) return { ok: false };
  E.romance.coverUsed++;
  E.misc.suspicion = (E.misc.suspicion || 0) + (mech.suspicion || 0);
  // 哥哥支持度代价
  if (E.brother.support !== undefined) {
    E.brother.support = Math.max(-100, E.brother.support - 3);
  }
  // 营业掩护 → 情敌 +
  if (type === 'business') {
    var rival = E.npcNetwork.nodes['npc_rival'];
    if (rival) rival.intimacy = (rival.intimacy || 0) + 2;
  }
  if (E.misc.suspicion >= 3) {
    E.npcNetwork.nodes['npc_fanleader'].stance = '吃瓜';
  }
  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'cover', text: '使用掩护：' + mech.label });
  saveGame();
  return { ok: true, coverUsed: E.romance.coverUsed, cost: mech.cost };
}

export function getRomanceDepthLabel() {
  return (ROMANCE_DEPTH_LABELS[GS.entSim.romance.depth] || {}).label || '初遇';
}
export function getRomanceDepthIcon() {
  return (ROMANCE_DEPTH_LABELS[GS.entSim.romance.depth] || {}).icon || '🌱';
}
export function getRomanceEmotion() {
  return GS.entSim.romance.emotion;
}
export function getRomanceRisk() {
  return assessRomanceRisk(0);
}
export function getCoverMechanisms() { return COVER_MECHANISMS; }
export function setEmotion(em) {
  if (ROMANCE_EMOTIONS.indexOf(em) >= 0) GS.entSim.romance.emotion = em;
}

// 合作期推进检测（由 engine.advanceWorld 每回合调用）
// 与男主的合作收官时，累计甜度自然推进恋爱深度（不跳过告白前置）
export function tickCollabRomance() {
  var E = GS.entSim;
  var c = E.romance.collabActive;
  if (!c || c.subject !== '男主') return null;
  var w = E.works.slots[c.workId];
  if (w && w.stage >= 2 && !c.closed) {
    // 合作收官：自然推进恋爱深度（depth<3 才推，避免跳过告白前置）
    if (E.romance.depth < 3) advanceRomance(1);
    var result = { finished: true, title: c.title, sweetness: E.romance.collabSweetAccum };
    E.romance.collabActive = null;
    E.careerHistory.push({ round: E.cycle.roundTotal, type: 'romance', text: '合作《' + c.title + '》收官，因合作生情逐渐明朗' });
    saveGame();
    return result;
  }
  return null;
}
