// ============================================================
// 系统5 地下恋（好感度驱动 8 阶段 + 风险 + 掩护 + 告白）
// 好感度(0-100) 为唯一主线驱动；恋爱深度标签由好感度派生。
// ============================================================
import { GS, saveGame } from '../state.js';
import { COVER_MECHANISMS, ROMANCE_EMOTIONS, riskLevelText } from './data.js';
import { getRomanceRiskMultiplier } from './cycle.js';
import { addPopularity } from './state.js';

// 8 阶段（阈值 20/35/50/60/70/80/90 切分 0-100 为 8 档）
export var AFFECTION_STAGES = [
  { idx: 0, min: 0, label: '初遇', icon: '🌱' },
  { idx: 1, min: 20, label: '相识', icon: '🌿' },
  { idx: 2, min: 35, label: '好感', icon: '🌸' },
  { idx: 3, min: 50, label: '暧昧', icon: '💞' },
  { idx: 4, min: 60, label: '心动', icon: '💗' },
  { idx: 5, min: 70, label: '追求', icon: '💕' },
  { idx: 6, min: 80, label: '交往', icon: '💍' },
  { idx: 7, min: 90, label: '陷入恋爱', icon: '🔥' }
];

export function affectionStageIndex(aff) {
  var a = aff || 0, idx = 0;
  for (var i = 0; i < AFFECTION_STAGES.length; i++) {
    if (a >= AFFECTION_STAGES[i].min) idx = i;
  }
  return idx;
}
export function affectionStageLabel(aff) {
  return AFFECTION_STAGES[affectionStageIndex(aff)].label;
}
// 6 档恋爱深度（结局矩阵使用）：0初遇 / 1暧昧 / 2暧昧明朗 / 3恋情 / 4浓情 / 5公开
export function affectionDepth(aff) {
  if (aff >= 80) return 5;
  if (aff >= 60) return 4;
  if (aff >= 50) return 3;
  if (aff >= 35) return 2;
  if (aff >= 20) return 1;
  return 0;
}

// 好感度结算：AI 每回合返回的 affectionDelta 驱动，±1-3 点
// 跨「暧昧→心动」阈值时触发心动时刻（插当前剧情前）
export function applyEntSimAffection(delta) {
  var E = GS.entSim;
  if (E === undefined || E === null) return 0;
  var oldIdx = affectionStageIndex(E.affection);
  E.affection = Math.max(0, Math.min(100, (E.affection || 0) + (delta || 0)));
  var newIdx = affectionStageIndex(E.affection);
  E.romance.stage = AFFECTION_STAGES[newIdx].label;
  // 心动时刻：暧昧(3) → 心动(4) 仅触发一次
  if (oldIdx < 4 && newIdx >= 4 && !E.flags.heartbeatShown) {
    E.flags.heartbeatShown = true;
    GS._entSimHeartbeatPending = true; // UI 在渲染当前剧情前插入心动时刻
  } else if (newIdx > oldIdx) {
    // 其它阶段跨越：触发阶段升级仪式感（UI 弹卡片）。心动由心动时刻单独处理
    GS._entSimStageUpPending = {
      to: newIdx,
      icon: AFFECTION_STAGES[newIdx].icon,
      label: AFFECTION_STAGES[newIdx].label
    };
  }
  // 好感满 100：甜蜜恋爱，10 回合后出现「进入大结局」按钮（由 UI 检测）
  if (E.affection >= 100) E.flags.sweetMaxRound = E.cycle.roundTotal;
  saveGame();
  return E.affection;
}

// 兼容旧引用：advanceRomance 直接改写好感度
export function advanceRomance(delta) {
  return applyEntSimAffection(delta);
}

export function recordRomanceBeat(beat) {
  var E = GS.entSim;
  if (typeof beat.affectionDelta === 'number') applyEntSimAffection(beat.affectionDelta);
  if (beat.emotion) E.romance.emotion = beat.emotion;
  if (beat.note) {
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'romance', text: beat.note });
  }
  if (beat.event) E.romance.seedEvent = E.romance.seedEvent || beat.event;
  saveGame();
}

// 评估当前恋爱曝光风险（0-100）：仅由曝光阶梯 exposureAccum 驱动（旧四维舆论已移除）
export function assessRomanceRisk(extraExposure) {
  var E = GS.entSim;
  var mult = getRomanceRiskMultiplier();
  // 风险分与曝光档位对齐：安全<20 / 暗涌20-39 / 升温40-59 / 哗然60-79 / 引爆>=80
  var accum = (E.misc.exposureAccum || 0) * 3.5;
  var coverPenalty = E.romance.coverUsed >= 3 ? 15 : 0;
  var extra = extraExposure || 0;
  var score = Math.round(accum + coverPenalty + extra);
  score = Math.max(0, Math.min(100, score));
  return { score: score, level: riskLevelText(score), multiplier: mult };
}

// 每换天推进时清理过期恋爱计时器（冷战 / 告白冷却）
export function tickRomanceTimers() {
  var E = GS.entSim;
  if (!E || !E.flags) return;
  var rt = E.cycle.roundTotal;
  if (E.flags.coldWar && typeof E.flags.coldWarUntil === 'number' && rt >= E.flags.coldWarUntil) {
    E.flags.coldWar = false;
    E.flags.coldWarUntil = null;
  }
  if (typeof E.flags.confessCooldown === 'number' && rt >= E.flags.confessCooldown) {
    E.flags.confessCooldown = null;
  }
  saveGame();
}

// 告白门槛：好感度 >= 80（交往）且 未冷战 且 未告白过（confessionDone 门控）
export function tryConfession() {
  var E = GS.entSim;
  var brotherOppose = (E.brother.stance === '反对公开');
  var canConfess = (E.affection >= 80 && !brotherOppose && !E.flags.coldWar && !E.romance.confessionDone && !E.flags.noMoreConfession);
  return {
    canConfess: canConfess,
    affection: E.affection,
    stage: E.romance.stage,
    brotherStance: E.brother.stance,
    scene: canConfess ? '私下 / 家中，只有你们两人' : ''
  };
}

export function applyConfessionResult(result) {
  var E = GS.entSim;
  E.romance.confessionDone = true;
  E.romance.confessionResult = result;
  E.romance.confessionTimes = (E.romance.confessionTimes || 0) + 1;
  if (result === 'accepted') {
    E.affection = Math.min(100, E.affection + 10);
    E.romance.stage = affectionStageLabel(E.affection);
    E.romance.emotion = '坚定';
    // 交往后依旧地下恋（尊重职业），不公开
    E.romance.publicLine = false;
    if (E.brother.support !== undefined) E.brother.support = Math.min(100, E.brother.support + 5);
  } else if (result === 'rejected') {
    E.affection = Math.max(0, E.affection - 10);
    E.romance.emotion = '不安';
    E.flags.coldWar = true;
    E.flags.coldWarUntil = E.cycle.roundTotal + 2; // 内向冷战 2 回合
    var rival = E.npcNetwork.nodes['npc_suitor'];
    if (rival) rival.intimacy = Math.min(100, (rival.intimacy || 0) + 15); // 团内竞争者倾向 +15
    if (E.romance.confessionTimes >= 2) E.flags.noMoreConfession = true; // 再次被拒不再主动告白
  } else if (result === 'delayed') {
    // 拖延不扣好感，但启动冷却与哥哥谈话支线
    E.flags.confessCooldown = E.cycle.roundTotal + 5;
    if (E.brother.support !== undefined) E.brother.support = Math.max(-100, E.brother.support - 3);
    E.brother.talkPending = true; // 哥哥找女主谈话支线
  }
  saveGame();
  return result;
}

// 5 种掩护手段：每次累计 suspicion，3 次起粉丝起疑；最多 5 次
export function applyCover(type) {
  var E = GS.entSim;
  var mech = COVER_MECHANISMS[type];
  if (!mech) return { ok: false, reason: '未知掩护方式' };
  if (E.romance.coverUsed >= 5) return { ok: false, reason: '掩护手段已用尽（粉丝已高度警觉）' };
  E.romance.coverUsed++;
  E.misc.suspicion = (E.misc.suspicion || 0) + (mech.suspicion || 0);
  if (type === 'pretend' || type === 'brother') {
    if (E.brother.support !== undefined) E.brother.support = Math.max(-100, E.brother.support - 3);
  }
  if (type === 'business') {
    var rival = E.npcNetwork.nodes['npc_suitor'];
    if (rival) rival.intimacy = (rival.intimacy || 0) + 2;
  }
  if (E.misc.suspicion >= 3) {
    E.npcNetwork.nodes['npc_fanleader'].stance = '吃瓜';
  }
  E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'cover', text: '使用掩护：' + mech.label });
  saveGame();
  return { ok: true, coverUsed: E.romance.coverUsed, cost: mech.cost, remaining: 5 - E.romance.coverUsed };
}

export function canUseCover() {
  var E = GS.entSim;
  return E && E.romance && E.romance.coverUsed < 5;
}

export function getCoverRemaining() {
  var E = GS.entSim;
  return E && E.romance ? 5 - E.romance.coverUsed : 0;
}

export function getRomanceStageLabel() {
  return affectionStageLabel(GS.entSim.affection);
}
export function getRomanceStageIcon() {
  return AFFECTION_STAGES[affectionStageIndex(GS.entSim.affection)].icon;
}
export function getRomanceEmotion() { return GS.entSim.romance.emotion; }
export function getRomanceRisk() { return assessRomanceRisk(0); }
export function getCoverMechanisms() { return COVER_MECHANISMS; }
export function setEmotion(em) {
  if (ROMANCE_EMOTIONS.indexOf(em) >= 0) GS.entSim.romance.emotion = em;
}
