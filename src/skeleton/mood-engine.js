import { GS, saveGame } from '../state.js';
import { MEMBERS } from '../data.js';

// 情绪状态链（IMP-13）
// GS.mood = { memberId: { state, cause, since, intensity } }
// state 取离散值：calm 平静 / happy 开心 / touched 心动 / jealous 吃醋 / cold 冷淡 / angry 生气 / moved 感动
// cause 记录原因（让 AI 反应具体不套路），intensity 1-3 表程度。

export var MOOD_LABELS = {
  calm: '平静',
  happy: '开心',
  touched: '心动',
  jealous: '吃醋',
  cold: '冷淡',
  angry: '生气',
  moved: '感动'
};

// 设置某成员情绪（state 相同时强度累加，封顶 3；切换时直接覆盖）
export function setMood(memberId, state, cause, intensity) {
  if (!memberId) return;
  if (!GS.mood) GS.mood = {};
  var inten = intensity || 1;
  var cur = GS.mood[memberId];
  if (cur && cur.state === state) {
    inten = Math.min(3, cur.intensity + inten);
  }
  GS.mood[memberId] = {
    state: state,
    cause: cause || (cur ? cur.cause : ''),
    since: GS.day,
    intensity: inten
  };
  saveGame();
}

// 事件触发的情绪设置（额外与修罗场联动）
export function setMoodByEvent(memberId, state, cause, intensity) {
  setMood(memberId, state, cause, intensity);
  syncRivalryFromMood();
}

// 漂移：未被选中的在场成员轻微向 jealous/cold 漂移（程度+1，有上限，不覆盖强情绪）
export function driftMood(memberId, state, cause, intensity) {
  if (!memberId) return;
  if (!GS.mood) GS.mood = {};
  var cur = GS.mood[memberId];
  // 已有强情绪（angry/cold 或强度>=2）时不覆盖，保持连贯
  if (cur && (cur.state === 'angry' || cur.state === 'cold' || cur.intensity >= 2)) return;
  var inten = 1;
  if (cur && cur.state === state) inten = Math.min(3, cur.intensity + 1);
  GS.mood[memberId] = {
    state: state,
    cause: cause || (cur ? cur.cause : ''),
    since: GS.day,
    intensity: inten
  };
  saveGame();
}

// 每日衰减：intensity 每过一天 -1，归零回 calm
export function decayMoodDaily() {
  if (!GS.mood) GS.mood = {};
  for (var mid in GS.mood) {
    var m = GS.mood[mid];
    if (!m) continue;
    if (m.intensity > 1) {
      m.intensity -= 1;
    } else {
      m.state = 'calm';
      m.intensity = 0;
      m.cause = '';
    }
  }
  saveGame();
}

// 与修罗场联动：>=2 人同时处于吃醋/冷淡/生气时，rivalryIntensity 自然升温（与 IMP-02 相对阈值互补）
export function syncRivalryFromMood() {
  if (GS.rivalryIntensity === undefined) GS.rivalryIntensity = 0;
  var count = 0;
  var mood = GS.mood || {};
  for (var mid in mood) {
    var m = mood[mid];
    if (m && (m.state === 'jealous' || m.state === 'cold' || m.state === 'angry')) count++;
  }
  if (count >= 2 && GS.rivalryIntensity < 5) {
    GS.rivalryIntensity += 1;
  }
}

// 解析成员 id（支持 name 或 id）
function resolveMemberId(nameOrId) {
  if (!nameOrId) return null;
  var m = MEMBERS.find(function(x) { return x.id === nameOrId || x.name === nameOrId; });
  return m ? m.id : null;
}

// 由已结算的好感变化更新情绪（在 settlePendingAffChanges 中逐笔调用）
export function updateMoodFromAffChange(memberId, delta, reason) {
  if (!memberId) return;
  if (delta > 0) {
    setMood(memberId, 'happy', reason || '你刚才的选择让他开心', 1);
  } else if (delta < 0) {
    setMood(memberId, 'cold', reason || '你刚才的举动让他有些冷淡', 1);
  }
}

// 生成 prompt 注入块（"当前心境" + 强制连贯规则）
export function buildMoodInstruction() {
  if (!GS.mood) GS.mood = {};
  var lines = [];
  for (var i = 0; i < GS.selectedMembers.length; i++) {
    var mid = GS.selectedMembers[i];
    var m = GS.mood[mid];
    if (!m) {
      var nm = MEMBERS.find(function(x) { return x.id === mid; });
      lines.push('- ' + (nm ? nm.name : mid) + '：平静');
      continue;
    }
    var label = MOOD_LABELS[m.state] || '平静';
    var nm2 = MEMBERS.find(function(x) { return x.id === mid; });
    var line = '- ' + (nm2 ? nm2.name : mid) + '：' + label + '(强度 ' + m.intensity + ')';
    if (m.cause) line += ' —— ' + m.cause;
    lines.push(line);
  }
  if (lines.length === 0) return '';
  return '[INSTRUCTION] 当前心境(强制遵循)\n' + lines.join('\n') +
    '\n规则：reaction 必须与该心境吻合。情绪转变必须有铺垫，禁止无理由变脸。' +
    '例：标"吃醋"者本时段应表现出试探/阴阳怪气/刻意靠近，而非突然热络；标"冷淡/生气"者不会主动讨好，需后续被哄才缓解。\n\n';
}
