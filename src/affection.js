import {
  MEMBERS, PHASES, PHASE_LABELS, GS, showToast
} from './core.js';
// ==================== 好感度系统 ====================
export function updateAffection(memberId, delta) {
  if (!GS.affection[memberId]) GS.affection[memberId] = 0;
  var before = GS.affection[memberId];
  var after = Math.max(-100, Math.min(100, before + delta));
  GS.affection[memberId] = after;

  // [P1-4] 好感度里程碑 Toast（每位成员只触发一次）
  if (!GS.affMilestoneShown) GS.affMilestoneShown = {};
  if (!GS.affMilestoneShown[memberId]) GS.affMilestoneShown[memberId] = {};
  var m = MEMBERS.find(function(x) { return x.id === memberId; });
  var thresholds = [40, 60, 80];
  var msgs = { 40: '💚 他开始在意你了', 60: '❤️ 他明显对你有好感', 80: '❤️🔥 他深深被你吸引' };
  for (var t = 0; t < thresholds.length; t++) {
    var th = thresholds[t];
    if (before < th && after >= th && !GS.affMilestoneShown[memberId][th]) {
      GS.affMilestoneShown[memberId][th] = true;
      if (m) showToast(m.name + ' ' + msgs[th]);
    }
  }
}

export function getAffectionDesc(aff) {
  if (aff >= 80) return '❤️🔥';
  if (aff >= 60) return '❤️';
  if (aff >= 40) return '💚';
  if (aff >= 15) return '😐';
  if (aff >= 0) return '💙';
  return '💔';
}

export function getAffectionHint(memberId) {
  var aff = GS.affection[memberId] || 0;
  var m = MEMBERS.find(function(x) { return x.id === memberId; });
  return m.emoji + m.name + ' ' + getAffectionDesc(aff);
}

export function addAffectionLog(memberId, delta, reason) {
  if (!GS.affectionLog[memberId]) GS.affectionLog[memberId] = [];
  GS.affectionLog[memberId].push({
    day: GS.day,
    phase: PHASE_LABELS[PHASES[GS.phaseIndex]],
    change: delta,
    reason: reason,
    total: GS.affection[memberId]
  });
}




