// ============================================================
// 系统3 四维舆论：fan / media / professional / anti
// applyOpinionImpact · executePR（危机公关）· getOpinionTier · sumOpinion · 雷达归一
// ============================================================
import { GS, saveGame } from '../state.js';
import { PR_ACTIONS, OPINION_DIMS } from './data.js';
import { addPopularity } from './state.js';

function clamp(v) { return Math.max(0, Math.min(100, v)); }

// 应用一组舆论增量（部分维度）
export function applyOpinionImpact(deltas, reason) {
  if (!deltas) return;
  var o = GS.entSim.publicOpinion;
  var applied = {};
  ['fan', 'media', 'professional', 'anti'].forEach(function(k) {
    if (typeof deltas[k] === 'number') {
      o[k] = clamp(o[k] + deltas[k]);
      applied[k] = deltas[k];
    }
  });
  if (reason) {
    GS.entSim.careerHistory.push({ round: GS.entSim.cycle.roundTotal, type: 'opinion', text: reason + ' ' + JSON.stringify(applied) });
  }
  saveGame();
  return applied;
}

// 危机公关（手动，每次 -哥哥支持度 3，限量 prRemaining）
export function executePR(actionId) {
  var misc = GS.entSim.misc;
  if (misc.prRemaining <= 0) {
    return { success: false, note: '本周公关额度已用尽（剩余 0）' };
  }
  var action = PR_ACTIONS[actionId];
  if (!action) return { success: false, note: '未知公关动作' };
  var applied = applyOpinionImpact(action.deltas, '公关·' + action.label);
  misc.prRemaining--;
  misc.manualPRUsed++;
  // 哥哥支持度 -3（陪你收拾舆论）
  if (GS.entSim.brother && GS.entSim.brother.support !== undefined) {
    GS.entSim.brother.support = Math.max(-100, GS.entSim.brother.support - 3);
  }
  saveGame();
  return {
    success: true,
    deltas: applied,
    note: action.note,
    prRemaining: misc.prRemaining,
    brotherSupport: GS.entSim.brother.support
  };
}

export function getOpinionTier() {
  var o = GS.entSim.publicOpinion;
  var avg = (o.fan + o.media + o.professional - o.anti) / 3;
  if (avg >= 75) return { tier: '神坛', icon: '👑', color: '#ffd54f' };
  if (avg >= 55) return { tier: '顺风顺水', icon: '🌟', color: '#7ed957' };
  if (avg >= 35) return { tier: '中性', icon: '🌤️', color: '#9ad0ff' };
  if (avg >= 15) return { tier: '风波', icon: '🌧️', color: '#ffb347' };
  return { tier: '塌房边缘', icon: '⛈️', color: '#ff6b6b' };
}

export function sumOpinion() {
  var o = GS.entSim.publicOpinion;
  return o.fan + o.media + o.professional - o.anti;
}

export function getOpinionForRadar() {
  var o = GS.entSim.publicOpinion;
  return [
    { key: 'fan', label: '粉丝', value: o.fan },
    { key: 'media', label: '媒体', value: o.media },
    { key: 'professional', label: '专业', value: o.professional },
    { key: 'anti', label: '黑粉', value: 100 - o.anti }
  ];
}

export function opinionDims() { return OPINION_DIMS; }

// 维度针对性公关（点击雷达某一维度时调用）：先走整盘 executePR，再对该维度额外加权
export function executePRDim(dimKey, actionId) {
  var r = executePR(actionId);
  if (!r.success) return r;
  var o = GS.entSim.publicOpinion;
  var boost = 6;
  if (dimKey === 'anti') {
    o.anti = clamp(o.anti - boost); // 黑粉维度公关＝降黑
  } else {
    o[dimKey] = clamp(o[dimKey] + boost);
  }
  saveGame();
  return Object.assign({}, r, { boostedDim: dimKey, boosted: boost });
}

// 恋情曝光反噬：粉丝脱粉、黑粉暴涨、媒体批判 + 人气下跌 + 事业等级回落
// severity: 1(轻微) ~ 5(毁灭性)。被粉丝与舆论淹没 = 人气崩 + 事业受挫。
export function applyDiscoveryBlowback(severity) {
  severity = Math.max(1, Math.min(5, severity || 1));
  var E = GS.entSim;
  if (!E) return { severity: severity, popDrop: 0 };
  var popDrop = severity * 7; // 严重曝光可达 -35 人气
  addPopularity(-popDrop);
  applyOpinionImpact({
    fan: -severity * 2,
    anti: severity * 2,
    media: severity,
    professional: -Math.floor(severity / 2)
  }, '恋情曝光反噬·粉丝与舆论淹没');
  E.careerHistory.push({
    round: E.cycle.roundTotal,
    type: 'discovery',
    text: '恋情被曝光，粉丝脱粉、黑热搜淹没，人气 -' + popDrop + '，事业受挫'
  });
  saveGame();
  return { severity: severity, popDrop: popDrop };
}
