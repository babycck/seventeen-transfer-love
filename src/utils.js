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

// ==================== 身份判定 ====================
// 是否处于「队友的妹妹」设定：1v1 模式 + 娱乐圈世界观 + 关系户=亲哥哥（role==='哥哥'）。
// 此设定下女主比全团 13 人都小，对成员应称"前辈"/对男主亲密时称"欧巴"，禁止直呼名字。
// 是否处于「队友的妹妹」设定：1v1 模式或娱乐圈模拟器 + 娱乐圈世界观 + 关系户=亲哥哥（role==='哥哥'）。
// 娱乐圈模拟器(gameMode='entSim')锁定 worldSetting='entertainment' + role='哥哥'，因此一并列此门控。
export function isSisterSetting() {
  return (GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim') && GS.worldSetting === 'entertainment'
    && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥';
}

// 是否处于「娱乐圈模拟器」独立模式（首页第三入口）
export function isEntSimMode() {
  return GS.gameMode === 'entSim';
}

// 1v1 与娱乐圈模拟器共用恋爱引擎（均走 oneHeart 生成/渲染/绑定路径）
export function isOneHeartLike() {
  return GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim';
}

// 是否为爱豆职业（兼容旧存档 '女团爱豆' 与娱乐圈模拟器 '爱豆'）
export function isIdolProfession(p) {
  return p === '爱豆' || p === '女团爱豆';
}

// 娱乐圈模拟器·事业等级派生（人气 0-100 → 4 档）
export function getEntSimCareerLevel(pop) {
  var _p = (typeof pop === 'number') ? pop : 0;
  if (_p >= 80) return '顶流';
  if (_p >= 50) return '当红';
  if (_p >= 20) return '上升';
  return '新人';
}

// ==================== 1v1 时间概念已移除（F） ====================
// 原 24h 时钟 / 时段工具（ONE_HEART_TIME_PERIODS / ONE_HEART_DAY_CLOCK_SCHEDULE /
// getOneHeartTimePeriod / getOneHeartPeriodEndHour / getOneHeartPeriodIndex /
// getOneHeartPeriodStartHour）已删除：剧情不再锚定具体时段，玩家与男主随时可相处。

export function escHtml(s) {
  if (s === undefined || s === null) return '';
  if (typeof s !== 'string') return String(s);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// [P1-4] 非阻塞 Toast 提示
export function showToast(message, pos) {
  var toast = document.createElement('div');
  var _vPos = (pos === 'bottom') ? 'bottom:20px;' : 'top:20px;';
  toast.style.cssText = 'position:fixed;' + _vPos + 'left:50%;transform:translateX(-50%);' +
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
      // BUG-18: 未知字段/无运算符匹配，原静默 result=true 会掩盖条件笔误；改为 fail-closed 并按不满足处理 + 告警
      console.warn('[evaluateCond] 未知条件字段或格式（已按"不满足"处理）: ' + part);
      result = false;
    }
    if (!result) return false;
  }
  return true;
}

function resolveValue(name, day, phase, season, weather, affections) {
  if (name === 'day') return day;
  if (name === 'phase') {
    // BUG-20: 调用方可能传数字索引（phaseIndex）而非时段字符串，做映射避免静默失效
    if (typeof phase === 'number' && PHASES && PHASES[phase]) return PHASES[phase];
    return phase;
  }
  if (name === 'season') return season;
  if (name === 'weather') return weather;
  if (name === 'affection') return affections['heroine'] || 0;
  if (name === 'drinkCount') return (GS.drinkCounts && GS.drinkCounts['heroine']) || 0;
  // BUG-10: 成员最大饮酒数（re_13 文案写"某成员喝到微醺"，原 drinkCount 只取女主，语义错位）
  if (name === 'memberDrinkCount') {
    if (!GS.selectedMembers || !GS.drinkCounts) return 0;
    var maxD = 0;
    for (var di = 0; di < GS.selectedMembers.length; di++) {
      var dmc = GS.drinkCounts[GS.selectedMembers[di]] || 0;
      if (dmc > maxD) maxD = dmc;
    }
    return maxD;
  }
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
  // 双向互斥：若当日上午已触发秘密任务，则不再抢占随机事件槽位
  if (GS.secretMission) return null;
  if (Math.random() > 0.15) return null;
  var phaseStr = PHASES[GS.phaseIndex];
  var eligible = RANDOM_EVENTS_POOL.filter(function(e) {
    if (!e.cond) return true;
    return evaluateCond(e.cond, GS.day, phaseStr, GS.season || '', GS.weather || '', GS.affection || {});
  });
  if (eligible.length === 0) return null;
  // [G] 去重：剔除本局已触发过的事件 id；候选池空则本轮不触发（宁可少事件也不重复）
  if (!Array.isArray(GS.randomEventsUsed)) GS.randomEventsUsed = [];
  var avail = eligible.filter(function(e) { return GS.randomEventsUsed.indexOf(e.id) < 0; });
  if (avail.length === 0) return null;
  var totalWeight = 0;
  for (var i = 0; i < avail.length; i++) totalWeight += (avail[i].weight || 1);
  var r = Math.random() * totalWeight;
  for (var j = 0; j < avail.length; j++) {
    r -= (avail[j].weight || 1);
    if (r <= 0) {
      var _picked = avail[j];
      GS.todayRandomEventTriggered = true;
      GS.randomEventsUsed.push(_picked.id);
      // 环形缓冲：超过池大小则丢弃最早一个，避免无限增长
      if (GS.randomEventsUsed.length > RANDOM_EVENTS_POOL.length) GS.randomEventsUsed.shift();
      return _picked.desc;
    }
  }
  var fallback = avail[Math.floor(Math.random() * avail.length)];
  GS.todayRandomEventTriggered = true;
  GS.randomEventsUsed.push(fallback.id);
  if (GS.randomEventsUsed.length > RANDOM_EVENTS_POOL.length) GS.randomEventsUsed.shift();
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
  // 强制任务日不触发（Day7 仅傍晚 questionBox 占用，上午空闲，已移除以允许秘密任务）
  var mandatoryDays = [1, 3, 6, 11, 12];
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

// 归一化文本用于去重比较（去掉标点、语气词、通用动词，提取核心内容）
export function normalizePromiseText(str) {
  if (!str) return '';
  return str
    .replace(/[的了吧着过在与和来去一个是就也都还会能可以一起一个一下把被从对到给让上出些看没很那这啊呀呢吗哈]|[\s，。！？、；：""''【】《》（）/·…—~\-\.\,\!\?\[\]\{\}]/g, '')
    .trim();
}

