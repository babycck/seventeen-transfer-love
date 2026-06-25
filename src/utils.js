import { GS, saveGame } from './state.js';
import { PHASES, RANDOM_EVENTS_POOL, SECRET_MISSIONS, MEMBERS } from './data.js';

// ==================== 工具函数 ====================
export function showLoading(msg) {
  var actionLoading = document.getElementById('actionLoading');
  if (actionLoading) {
    var textEl = document.getElementById('actionLoadingText');
    if (textEl) textEl.textContent = msg || '加载中...';
    actionLoading.classList.remove('hidden');
    return;
  }
  document.getElementById('loadingText').textContent = msg || '加载中...';
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

export function hideLoading() {
  var actionLoading = document.getElementById('actionLoading');
  if (actionLoading) actionLoading.classList.add('hidden');
  var overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// [P1-4] 非阻塞 Toast 提示
export function showToast(message) {
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:#333;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;' +
    'z-index:3000;opacity:0;transition:opacity .3s;box-shadow:0 2px 8px rgba(0,0,0,.2);';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.style.opacity = '1'; });
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2000);
}
window.showToast = showToast;

export function evaluateCond(cond, day, phase, season, weather, affections) {
  // 拆分 &&
  var parts = cond.split('&&');
  for (var pi = 0; pi < parts.length; pi++) {
    var part = parts[pi].trim();
    var result = false;
    if (part.indexOf('>=') >= 0) {
      var sp = part.split('>=');
      result = resolveValue(sp[0].trim(), day, phase, season, weather, affections) >= Number(sp[1].trim());
    } else if (part.indexOf('<=') >= 0) {
      var sp = part.split('<=');
      result = resolveValue(sp[0].trim(), day, phase, season, weather, affections) <= Number(sp[1].trim());
    } else if (part.indexOf('>') >= 0) {
      var sp = part.split('>');
      result = resolveValue(sp[0].trim(), day, phase, season, weather, affections) > Number(sp[1].trim());
    } else if (part.indexOf('<') >= 0) {
      var sp = part.split('<');
      result = resolveValue(sp[0].trim(), day, phase, season, weather, affections) < Number(sp[1].trim());
    } else if (part.indexOf('==') >= 0) {
      var sp = part.split('==');
      result = resolveValue(sp[0].trim(), day, phase, season, weather, affections) === sp[1].trim().replace(/^['"]|['"]$/g, '');
    } else {
      result = true;
    }
    if (!result) return false;
  }
  return true;
}

function resolveValue(name, day, phase, season, weather, affections) {
  if (name === 'day') return day;
  if (name === 'phase') return phase;
  if (name === 'season') return season;
  if (name === 'weather') return weather;
  if (name === 'affection') return affections['heroine'] || 0;
  if (name === 'drinkCount') return (GS.drinkCounts && GS.drinkCounts['heroine']) || 0;
  return name;
}

export function shouldTriggerRandomEvent() {
  var isDatingDay = ([4, 5, 8, 9, 10].indexOf(GS.day) >= 0);
  if (isDatingDay) return null;
  var mandatoryPhases = {
    1: ['evening'],
    3: ['morning'],
    7: ['morning'],
    9: ['morning'],
    11: ['evening']
  };
  var dayMandatory = mandatoryPhases[GS.day] || [];
  if (dayMandatory.indexOf(PHASES[GS.phaseIndex]) >= 0) return null;
  if (GS.todayRandomEventTriggered) return null;
  if (Math.random() > 0.15) return null;
  var phaseStr = PHASES[GS.phaseIndex];
  var eligible = RANDOM_EVENTS_POOL.filter(function(e) {
    if (!e.cond) return true;
    return evaluateCond(e.cond, GS.day, phaseStr, GS.season || '', GS.weather || '', GS.affection || {});
  });
  if (eligible.length === 0) return null;
  var totalWeight = 0;
  for (var i = 0; i < eligible.length; i++) totalWeight += (eligible[i].weight || 1);
  var r = Math.random() * totalWeight;
  for (var j = 0; j < eligible.length; j++) {
    r -= (eligible[j].weight || 1);
    if (r <= 0) {
      GS.todayRandomEventTriggered = true;
      return eligible[j].desc;
    }
  }
  var fallback = eligible[Math.floor(Math.random() * eligible.length)];
  GS.todayRandomEventTriggered = true;
  return fallback.desc;
}

export function shouldTriggerSecretMission() {
  // 已有任务未完成/未失败时不再触发
  if (GS.secretMission) return false;
  var dayMissions = SECRET_MISSIONS[GS.day];
  if (!dayMissions || dayMissions.length === 0) return false;
  // 只在上午触发
  if (GS.phaseIndex !== 0) return false;
  // 约会日不触发
  var isDatingDay = ([4, 5, 8, 9, 10].indexOf(GS.day) >= 0);
  if (isDatingDay) return false;
  // 随机事件日不触发（互斥）
  if (GS.todayRandomEventTriggered) return false;
  // 强制任务日不触发
  var mandatoryDays = [1, 3, 6, 7, 11, 12];
  if (mandatoryDays.indexOf(GS.day) >= 0) return false;
  // 概率触发：30%
  if (Math.random() > 0.30) return false;
  // 选择任务
  var missionDef = dayMissions[Math.floor(Math.random() * dayMissions.length)];
  var targetId = '';
  if (missionDef.targetType === 'x') targetId = GS.secretX;
  else if (missionDef.targetType === 'nonX') {
    var nonX = GS.selectedMembers.filter(function(id) { return id !== GS.secretX; });
    targetId = nonX[Math.floor(Math.random() * nonX.length)];
  } else if (missionDef.targetType === 'member') {
    targetId = missionDef.targetId;
  } else if (missionDef.targetType === 'any') {
    targetId = GS.selectedMembers[Math.floor(Math.random() * GS.selectedMembers.length)];
  }
  GS.secretMission = {
    id: missionDef.id,
    day: GS.day,
    type: missionDef.type,
    title: missionDef.title,
    description: missionDef.description,
    hint: missionDef.hint,
    targetMemberId: targetId,
    status: 'active',
    triggeredAtPhase: PHASES[GS.phaseIndex]
  };
  return true;
}

// ==================== 秘密任务互动检测 ====================
export function checkMissionInteract(text) {
  if (!text) return;
  if (!GS.secretMission || GS.secretMission.status !== 'active') return;
  if (GS.secretMissionInteracted) return;

  var sm = GS.secretMission;
  var matched = false;

  if (sm.targetType === 'none') {
    matched = true;
  } else {
    var members = GS.selectedMembers.map(function(id) {
      return MEMBERS.find(function(m) { return m.id === id; });
    });

    function nameMatch(t, m) {
      if (!m) return false;
      return t.indexOf(m.name) >= 0 || t.indexOf(m.stageName) >= 0;
    }

    if (sm.targetType === 'any') {
      for (var i = 0; i < members.length; i++) {
        if (nameMatch(text, members[i])) { matched = true; break; }
      }
    } else if (sm.targetType === 'nonX') {
      for (var j = 0; j < members.length; j++) {
        if (members[j].id !== GS.secretX && nameMatch(text, members[j])) { matched = true; break; }
      }
    } else if (sm.targetType === 'member' || sm.targetType === 'x') {
      var targetMember = members.find(function(m) { return m.id === sm.targetMemberId; });
      matched = nameMatch(text, targetMember);
    }
  }

  if (matched) {
    GS.secretMissionInteracted = true;
    saveGame();
  }
}

