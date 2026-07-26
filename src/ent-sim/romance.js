// ============================================================
// 系统5 地下恋（好感度驱动 8 阶段 + 风险 + 掩护 + 告白）
// 好感度(0-100) 为唯一主线驱动；恋爱深度标签由好感度派生。
// ============================================================
import { GS, saveGame } from '../state.js';
import { COVER_MECHANISMS, ROMANCE_EMOTIONS, riskLevelText } from './data.js';
import { getRomanceRiskMultiplier } from './cycle.js';
import { addPopularity } from './state.js';
import { showToast } from '../utils.js';

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
// 额外里程碑：20/40/60/80 弹心动小卡片
export function applyEntSimAffection(delta) {
  var E = GS.entSim;
  if (E === undefined || E === null) return 0;
  var oldAff = E.affection || 0;
  var oldIdx = affectionStageIndex(oldAff);
  E.affection = Math.max(0, Math.min(100, oldAff + (delta || 0)));
  var newIdx = affectionStageIndex(E.affection);
  E.romance.stage = AFFECTION_STAGES[newIdx].label;
  // 好感度来源日志（仿 1v1 模式，恋情面板展示最近 3 条）
  if (delta !== 0) {
    E._affectionLog = E._affectionLog || [];
    E._affectionLog.push({
      day: E.cycle.dayCount || 1,
      round: E.cycle.roundTotal || 0,
      delta: delta,
      reason: (arguments.length >= 2 && arguments[1] && arguments[1]._affReason) ? arguments[1]._affReason : '剧情推进',
      total: E.affection
    });
    if (E._affectionLog.length > 30) E._affectionLog = E._affectionLog.slice(-30);
  }
  // 好感里程碑卡片（20/40/60/80），每阈值仅触发一次
  var milestones = [20, 40, 60, 80];
  for (var i = 0; i < milestones.length; i++) {
    var m = milestones[i];
    if (oldAff < m && E.affection >= m && !E.flags['milestone_' + m]) {
      E.flags['milestone_' + m] = true;
      GS._entSimMilestonePending = { threshold: m, icon: '💗', label: '好感度突破' + m + '！' };
      break; // 一次只弹一个
    }
  }
  // 心动时刻：暧昧(3) → 心动(4) 仅触发一次
  if (oldIdx < 4 && newIdx >= 4 && !E.flags.heartbeatShown) {
    E.flags.heartbeatShown = true;
    GS._entSimHeartbeatPending = true; // UI 在渲染当前剧情前插入心动时刻
  } else if (newIdx > oldIdx && !GS._entSimMilestonePending) {
    // 其它阶段跨越：触发阶段升级仪式感（UI 弹卡片）。心动由心动时刻单独处理
    GS._entSimStageUpPending = {
      to: newIdx,
      icon: AFFECTION_STAGES[newIdx].icon,
      label: AFFECTION_STAGES[newIdx].label
    };
  }
  // 好感满 100：甜蜜恋爱，10 回合后出现「进入大结局」按钮（由 UI 检测）
  // Bug 修复：只在首次达到100时记录，防止每次好感变动都重置
  if (E.affection >= 100 && !E.flags.sweetMaxRound) E.flags.sweetMaxRound = E.cycle.roundTotal;
  // v2：检查亲密接触解锁
  checkIntimacyUnlock(E.affection);
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
  if (!E || !E.romance) return false;
  var max = 5 + (E.romance._coverMaxBonus || 0);
  return E.romance.coverUsed < max;
}

export function getCoverRemaining() {
  var E = GS.entSim;
  if (!E || !E.romance) return 0;
  var max = 5 + (E.romance._coverMaxBonus || 0);
  return max - (E.romance.coverUsed || 0);
}

// ────────── v2 新增函数 ──────────

// 亲密接触阶梯检查：返回当前解锁状态和下一个里程碑
export function checkIntimacyUnlock(affection) {
  var E = GS.entSim;
  if (!E) return { unlocked: [], nextAt: 0, nextLabel: '' };
  var unlocked = E._intimacyUnlocked || { hand: false, hug: false, kiss: false, bed: false, live: false, public: false, marry: false };
  var milestones = [
    { key: 'hand', label: '牵手', icon: '🤝', minAff: 15 },
    { key: 'hug', label: '拥抱', icon: '🤗', minAff: 30 },
    { key: 'kiss', label: '接吻', icon: '💋', minAff: 50 },
    { key: 'bed', label: '同床', icon: '🛏️', minAff: 65 },
    { key: 'live', label: '同居', icon: '🏠', minAff: 80 },
    { key: 'public', label: '公开恋情', icon: '📣', minAff: 90 },
    { key: 'marry', label: '求婚结婚', icon: '💍', minAff: 100 }
  ];
  var newlyUnlocked = null;
  for (var i = 0; i < milestones.length; i++) {
    var m = milestones[i];
    if (affection >= m.minAff && !unlocked[m.key]) {
      unlocked[m.key] = true;
      E._intimacyUnlocked = unlocked;
      newlyUnlocked = m;
      // 记录首次解锁纪念日
      E._romanceMilestones = E._romanceMilestones || {};
      if (!E._romanceMilestones['first' + m.key.charAt(0).toUpperCase() + m.key.slice(1) + 'Day']) {
        E._romanceMilestones['first' + m.key.charAt(0).toUpperCase() + m.key.slice(1) + 'Day'] = E.cycle.dayCount;
        if (typeof window !== 'undefined' && typeof showToast === 'function') {
          setTimeout(function() {
            try { showToast('🎉 亲密里程碑：' + m.icon + ' ' + m.label + ' 已解锁！'); } catch(e) {}
          }, 200);
        }
      }
      break; // 一次只解锁一个
    }
  }
  // 找到下一个未解锁的
  var nextAt = 100, nextLabel = '';
  for (var j = 0; j < milestones.length; j++) {
    if (!unlocked[milestones[j].key]) {
      nextAt = milestones[j].minAff;
      nextLabel = milestones[j].icon + milestones[j].label;
      break;
    }
  }
  return { unlocked: unlocked, newlyUnlocked: newlyUnlocked, nextAt: nextAt, nextLabel: nextLabel };
}

// 吃醋值更新：每天情敌互动+N，衰减-N
export function tickJealousy(rivalInteractionToday) {
  var E = GS.entSim;
  if (!E) return 0;
  var today = E.cycle.dayCount || 1;
  if (E._jealousLastUpdateDay !== today) {
    // 每日衰减
    E._jealousLevel = Math.max(0, (E._jealousLevel || 0) - 1);
    E._jealousLastUpdateDay = today;
  }
  // 情敌互动加分
  if (rivalInteractionToday && E._jealousLevel < 10) {
    E._jealousLevel = Math.min(10, E._jealousLevel + (rivalInteractionToday || 1));
  }
  return E._jealousLevel;
}

// 获取吃醋等级描述
export function getJealousLabel(level) {
  if (level >= 8) return { label: '💢 爆发', level: 3 };
  if (level >= 5) return { label: '😤 明显吃醋', level: 2 };
  if (level >= 2) return { label: '🤔 微醋', level: 1 };
  return { label: '😊 平静', level: 0 };
}

// 纪念日检查：首次约会/告白/接吻/牵手/拥抱 每30天倍数提醒
export function checkAnniversaries() {
  var E = GS.entSim;
  if (!E || !E._romanceMilestones) return null;
  var today = E.cycle.dayCount || 1;
  var m = E._romanceMilestones;
  var labels = { firstDateDay: '第一次约会', firstConfessDay: '告白纪念日', firstKissDay: '初吻纪念日', firstHandDay: '第一次牵手', firstHugDay: '第一次拥抱' };
  var icons = { firstDateDay: '💞', firstConfessDay: '💍', firstKissDay: '💋', firstHandDay: '🤝', firstHugDay: '🤗' };
  for (var key in labels) {
    if (m[key] && today > m[key] && (today - m[key]) % 30 === 0 && (today - m[key]) > 0) {
      return { key: key, label: labels[key], icon: icons[key] || '💗', days: today - m[key] };
    }
  }
  return null;
}

// 记录纪念日
export function recordMilestone(key) {
  var E = GS.entSim;
  if (!E) return;
  E._romanceMilestones = E._romanceMilestones || {};
  if (!E._romanceMilestones[key]) {
    E._romanceMilestones[key] = E.cycle.dayCount || 1;
    saveGame();
  }
}

// Bug6修复：全部添加 GS.entSim null 检查
export function getRomanceStageLabel() {
  return (GS.entSim && typeof GS.entSim.affection === 'number') ? affectionStageLabel(GS.entSim.affection) : '初遇';
}
export function getRomanceStageIcon() {
  if (!GS.entSim || typeof GS.entSim.affection !== 'number') return '🌱';
  return AFFECTION_STAGES[affectionStageIndex(GS.entSim.affection)].icon;
}
export function getRomanceEmotion() { return (GS.entSim && GS.entSim.romance && GS.entSim.romance.emotion) || '平静'; }
export function getRomanceRisk() { return assessRomanceRisk(0); }
export function getCoverMechanisms() { return COVER_MECHANISMS; }
export function setEmotion(em) {
  if (!GS.entSim || !GS.entSim.romance) return;
  if (ROMANCE_EMOTIONS.indexOf(em) >= 0) GS.entSim.romance.emotion = em;
}
