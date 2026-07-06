import {
  MEMBERS, PHASES, PHASE_LABELS, GS, showToast
} from './core.js';
import { HEART_NOTE_TEMPLATES } from './data.js';
import { triggerScreenEffect } from './screen-effect.js';
// ==================== 好感度系统 ====================
export function updateAffection(memberId, delta) {
  if (!GS.affection[memberId]) GS.affection[memberId] = 0;
  var before = GS.affection[memberId];
  var after = Math.max(-100, Math.min(100, before + delta));
  GS.affection[memberId] = after;

  // 飘字动画：好感度变化时从 Header 飘出
  if (delta !== 0 && typeof document !== 'undefined') {
    spawnAffFloat(memberId, delta);
  }

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
      // 心动笔记好感度阶段解锁
      unlockHeartNoteByAffection(memberId, th);
      if (th === 80) {
        triggerScreenEffect('milestone80');
        // 标记闪回：下次剧情生成注入回忆
        if (!GS.flashbackShown) GS.flashbackShown = {};
        if (!GS.flashbackShown[memberId]) {
          GS.flashbackShown[memberId] = 'pending';
        }
      }
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

// 好感度解锁心动笔记
function unlockHeartNoteByAffection(memberId, threshold) {
  var notes = HEART_NOTE_TEMPLATES[memberId];
  if (!notes) return;
  // 阈值映射到模板 index
  var noteIndex = threshold === 40 ? 0 : threshold === 60 ? 1 : 2;
  var noteText = notes[noteIndex];
  if (!noteText) return;
  if (!GS.heartNotes[memberId]) GS.heartNotes[memberId] = [];
  // 按 text 去重
  var existingTexts = GS.heartNotes[memberId].map(function(hn) { return hn.text; });
  if (existingTexts.indexOf(noteText) >= 0) return;
  GS.heartNotes[memberId].push({
    text: noteText,
    unlockedAt: { day: GS.day, source: 'affection', threshold: threshold }
  });
}

// 飘字动画：队列累积机制，100ms 窗口内同成员 delta 累加后统一飘出
var _floatQueue = {};
var _floatTimer = {};

export function spawnAffFloat(memberId, delta) {
  var container = document.getElementById('affectionHint');
  if (!container) return;
  var m = MEMBERS.find(function(x) { return x.id === memberId; });
  if (!m) return;
  // 累积 delta
  if (!_floatQueue[memberId]) _floatQueue[memberId] = 0;
  _floatQueue[memberId] += delta;
  // 重置计时
  if (_floatTimer[memberId]) clearTimeout(_floatTimer[memberId]);
  _floatTimer[memberId] = setTimeout(function() {
    var totalDelta = _floatQueue[memberId];
    delete _floatQueue[memberId];
    delete _floatTimer[memberId];
    var sign = totalDelta > 0 ? '+' : '';
    var color = totalDelta > 0 ? '#2e7d32' : '#c62828';
    var span = document.createElement('span');
    span.className = 'aff-float';
    span.textContent = m.emoji + ' ' + sign + totalDelta;
    span.style.cssText = 'position:absolute;left:50%;bottom:0;transform:translateX(-50%);font-size:14px;font-weight:700;color:' + color + ';pointer-events:none;white-space:nowrap;animation:affFloat 1.2s ease-out forwards;z-index:200;';
    container.style.position = 'relative';
    container.appendChild(span);
    setTimeout(function() {
      if (span.parentNode) span.parentNode.removeChild(span);
    }, 1200);
  }, 100);
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

// ==================== 情敌倾向值（1v1 模式专用） ====================
// 重新启用 oneHeartRivalAff 字段作为「情敌倾向值」
// 情敌事件/吃醋事件中涉及情敌的选项 → 调用此函数更新情敌倾向
// 主线选项若 AI 返回 affName 匹配情敌名 → 也走此通道
export function updateRivalTendency(delta, reason) {
  if (!GS.oneHeartRivalAff) GS.oneHeartRivalAff = 0;
  // 情敌已转正后不再维护倾向值
  if (GS._rivalSwitched) return;
  var before = GS.oneHeartRivalAff;
  var after = Math.max(-100, Math.min(100, before + delta));
  GS.oneHeartRivalAff = after;
  if (!GS.oneHeartRivalAffLog) GS.oneHeartRivalAffLog = [];
  GS.oneHeartRivalAffLog.push({
    round: GS.oneHeartGenCount || 0,
    change: delta,
    reason: reason || '',
    total: after
  });
  // Toast 提示（情敌存在时才显示）
  if (delta !== 0 && GS.oneHeartRival && GS.oneHeartRival.name && typeof showToast === 'function') {
    var _rivalName = GS.oneHeartRival.name;
    var _sign = delta > 0 ? '+' : '';
    var _label = delta > 0 ? '💘 对' + _rivalName + '的心动倾向 ' : '🛡️ 对' + _rivalName + '的疏离 ';
    showToast(_label + _sign + delta);
  }
}




