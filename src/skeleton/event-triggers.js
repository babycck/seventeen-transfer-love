import { GS, saveGame } from '../state.js';
import { MEMBERS } from '../data.js';
import { updateAffection, addAffectionLog } from '../affection.js';
import { setMoodByEvent } from './mood-engine.js';

// 嫉妒任务触发检查（25% 概率）
export function checkJealousyMissionTrigger() {
  // IMP-04：限制在 D6-10（真正该有的"三角升温"集中段）
  if (GS.day < 6 || GS.day > 10) return false;
  // IMP-04：与相位锁死的高优先级事件互斥（午夜电话 D6 phase3 / 提问箱 D7 phase2 / 真心话惩罚 D11 phase3）
  // 仲裁优先级见 activeEventThisPhase()：嫉妒任务 < 提问箱/真心话惩罚，避免同相位指令打架
  var phaseLocked = (GS.day === 6 && GS.phaseIndex === 3 && GS.midnightCall && GS.midnightCall.status === 'pending') ||
                    (GS.day === 7 && GS.phaseIndex === 2 && GS.questionBox && GS.questionBox.active) ||
                    (GS.day === 11 && GS.phaseIndex === 3 && GS.truthPunishment);
  if (phaseLocked) return false;
  if (GS.jealousyMission && GS.jealousyMission.day === GS.day) return false;
  if (Math.random() > 0.25) return false;
  var highAffMembers = GS.selectedMembers.filter(function(id) {
    return (GS.affection[id] || 0) >= 30;
  });
  if (highAffMembers.length < 2) return false;

  var missions = [
    { id: 'jm_dinner', title: '强制晚餐', desc: '今晚女主必须与指定成员单独用餐。', effect: { target: 5, others: -2 } },
    { id: 'jm_silence', title: '禁言令', desc: '今晚指定成员不能和女主说超过三句话。', effect: { target: 0, others: -3, restricted: true } },
    { id: 'jm_sms', title: '短信指定', desc: '今晚女主的短信必须发给指定成员。', effect: { target: 5, others: -2 } },
    { id: 'jm_date', title: '强制约会', desc: '明天上午的约会对象由制作组指定。', effect: { target: 5, others: -2 } },
    { id: 'jm_room', title: '房间交换', desc: '今晚女主必须与指定成员共用一个工作间至少30分钟。', effect: { target: 5, others: -2 } }
  ];
  var mission = missions[Math.floor(Math.random() * missions.length)];
  var targetId = highAffMembers[Math.floor(Math.random() * highAffMembers.length)];
  var targetMember = MEMBERS.find(function(m) { return m.id === targetId; });
  if (!targetMember) return false; // BUG-11: 容错，避免 undefined.name 中断当日生成

  GS.jealousyMission = {
    id: mission.id,
    day: GS.day,
    title: mission.title,
    desc: mission.desc,
    targetId: targetId,
    targetName: targetMember.name,
    effect: mission.effect,
    status: 'active'
  };
  GS.jealousyMissionTriggeredDays.push(GS.day);

  updateAffection(targetId, mission.effect.target);
  addAffectionLog(targetId, mission.effect.target, '制作组嫉妒任务「' + mission.title + '」指定对象');
  for (var i = 0; i < GS.selectedMembers.length; i++) {
    var mid = GS.selectedMembers[i];
    if (mid !== targetId) {
      updateAffection(mid, mission.effect.others);
      addAffectionLog(mid, mission.effect.others, '未被制作组嫉妒任务选中');
      var _om = MEMBERS.find(function(m) { return m.id === mid; });
      // IMP-12：被强行排除者埋下延迟后果种子
      if (_om) plantFutureConsequence('missionExcluded',
        _om.name + '因这次被制作组强行排除在外，之后几天会对你若即若离、暗自较劲', 3, 5);
    }
  }

  return true;
}

// 前任来电触发检查（Day 5-9 傍晚/深夜，15%）
export function checkExMessageTrigger() {
  if (GS.day < 5 || GS.day > 9) return false;
  if (GS.phaseIndex < 2) return false;
  if (Math.random() > 0.15) return false;
  if (GS.exMessage && GS.exMessage.day === GS.day) return false;
  // 至少一位非 X 攻略对象好感度 ≥ 20
  var eligible = GS.selectedMembers.filter(function(id) {
    return id !== GS.secretX && (GS.affection[id] || 0) >= 20;
  });
  if (eligible.length === 0) return false;

  // 随机选一位作为来电成员
  var targetId = eligible[Math.floor(Math.random() * eligible.length)];
  var targetMember = MEMBERS.find(function(m) { return m.id === targetId; });
  if (!targetMember) return false; // BUG-11: 容错

  GS.exMessage = {
    day: GS.day,
    memberId: targetId,
    memberName: targetMember.name,
    status: 'pending',
    handled: false
  };
  return true;
}

// 前任来电选择处理（影响触发成员，而非 X）
export function handleExMessageChoice(choice) {
  if (!GS.exMessage || GS.exMessage.handled) return;
  var em = GS.exMessage;
  var member = MEMBERS.find(function(m) { return m.id === em.memberId; });
  if (!member) return; // BUG-11: 容错，会员数据缺失时安全退出

  if (choice === 'ignore') {
    em.status = 'ignored';
    updateAffection(em.memberId, -2);
    addAffectionLog(em.memberId, -2, '前任来电时女主假装没看见');
    setMoodByEvent(em.memberId, 'cold', '你假装没看见他的前任来电', 1);
  } else if (choice === 'comfort') {
    em.status = 'comforted';
    updateAffection(em.memberId, 3);
    addAffectionLog(em.memberId, 3, '前任来电时女主安慰了他');
    setMoodByEvent(em.memberId, 'moved', '你安慰了他关于前任的来电', 1);
  } else if (choice === 'question') {
    em.status = 'questioned';
    updateAffection(em.memberId, -5);
    addAffectionLog(em.memberId, -5, '前任来电时女主追问真相');
  }
  em.handled = true;
  if (!GS.exMessageHistory) GS.exMessageHistory = [];
  GS.exMessageHistory.push({
    day: em.day,
    memberId: em.memberId,
    status: em.status
  });
  saveGame();
  if (window.__renderAll) window.__renderAll();
}

// 嫉妒事件触发：全队每天最多1次，好感度≥50，同一人3天冷却
export function checkJealousyEvent(choiceText) {
  if (GS.jealousyTriggeredToday) return;
  if (!choiceText) return;

  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  }).filter(function(m) { return !!m; }); // BUG-11: 剔除 undefined，避免 members[i].name 抛错

  var targetMember = null;
  for (var i = 0; i < members.length; i++) {
    if (choiceText.indexOf(members[i].name) >= 0) {
      targetMember = members[i];
      break;
    }
  }
  if (!targetMember) return;

  // IMP-03：观察者阈值从 50 降到 40，且观察者不能是三人里好感最低的（需有真实敌意动机）
  var affs = GS.selectedMembers.map(function(id) { return GS.affection[id] || 0; });
  for (var j = 0; j < members.length; j++) {
    var b = members[j];
    if (b.id === targetMember.id) continue;

    var aff = GS.affection[b.id] || 0;
    if (aff < 40) continue;
    // 观察者不能是三人里好感最低的——否则"无故吃醋"动机不足
    var hasHigher = affs.some(function(a) { return a > aff; });
    if (!hasHigher) continue;

    var recent = false;
    for (var k = 0; k < GS.jealousyLog.length; k++) {
      var log = GS.jealousyLog[k];
      if (log.observerId === b.id && (GS.day - log.day) <= 3) {
        recent = true;
        break;
      }
    }
    if (recent) continue;

    GS.jealousyTriggeredToday = true;
    GS.pendingJealousy = {
      observerId: b.id,
      observerName: b.name,
      targetId: targetMember.id,
      targetName: targetMember.name
    };
    // IMP-11：吃醋者对被选者生怨，向第三方靠拢结盟
    updateMemberBond(b.id, targetMember.id, -2);
    for (var ti = 0; ti < GS.selectedMembers.length; ti++) {
      var tid3 = GS.selectedMembers[ti];
      if (tid3 !== b.id && tid3 !== targetMember.id) {
        updateMemberBond(b.id, tid3, +1);
      }
    }
    // IMP-13：观察者置吃醋情绪（drive mood）
    setMoodByEvent(b.id, 'jealous', '目睹你选择了与' + targetMember.name + '互动，心生醋意', 2);
    // IMP-12：埋下延迟后果种子——被冷落的观察者几天后借故冷落/试探
    plantFutureConsequence('jealousy',
      b.name + '因之前目睹你偏向' + targetMember.name + '，这几天里会借故冷落你或暗中试探你的心意', 3, 5);
    GS.jealousyLog.push({
      day: GS.day,
      phase: GS.phaseIndex,
      observerId: b.id,
      targetId: targetMember.id
    });
    saveGame();
    return;
  }
}

// 相位级事件仲裁器（IMP-01）
// 同一相位只放行一个主导强制事件指令，其余顺延（保留在 GS，后续相位再注入），
// 避免 buildUserMessage 向 AI 灌入互相打架的 [INSTRUCTION] 导致事件丢失或质量下降。
// 优先级（数值越小越高）：
//   相位锁死强制(提问箱/真心话惩罚) > 嫉妒任务 > 前任来电 > X幽灵
// 注：午夜电话亭为玩家手动触发的弹窗，不走 buildUserMessage 注入，故不纳入仲裁。
export function activeEventThisPhase() {
  // 1) 相位锁死的硬强制事件优先（这些若不执行会直接破坏当日脚本）
  if (GS.day === 7 && GS.phaseIndex === 2 && GS.questionBox && GS.questionBox.active) return 'questionBox';
  if (GS.day === 11 && GS.phaseIndex === 3 && GS.truthPunishment) return 'truthPunishment';

  // 2) 多相位事件按优先级择一（只放行一个主导事件）
  var candidates = [];
  if (GS.jealousyMission && GS.jealousyMission.day === GS.day && GS.jealousyMission.status === 'active') {
    candidates.push('jealousyMission');
  }
  if (GS.exMessage && GS.exMessage.day === GS.day && !GS.exMessage.handled) {
    candidates.push('exMessage');
  }
  if (GS.xGhostEvent && GS.xGhostEvent.day === GS.day) {
    candidates.push('xGhostEvent');
  }
  var PRIORITY = { jealousyMission: 0, exMessage: 1, xGhostEvent: 2 };
  var best = null;
  var bestP = 99;
  for (var i = 0; i < candidates.length; i++) {
    var p = PRIORITY[candidates[i]];
    if (p < bestP) { bestP = p; best = candidates[i]; }
  }
  return best;
}

// 脚踏两条船高风险期检测（IMP-10）
// 同时与 >=2 位非 X 成员好感 >=50 且未公开时，进入"被撞见"高风险期。
// 由好感度结算后调用（settlePendingAffChanges / applyParsedSideEffects）。
export function updateSecretDating() {
  if (!GS.selectedMembers || GS.selectedMembers.length < 2) {
    GS.secretDating = false;
    return;
  }
  var highCount = 0;
  for (var i = 0; i < GS.selectedMembers.length; i++) {
    var mid = GS.selectedMembers[i];
    if (mid === GS.secretX) continue;
    if ((GS.affection[mid] || 0) >= 50) highCount++;
  }
  GS.secretDating = highCount >= 2;
}

// 成员间关系网更新（IMP-11）
// memberBond[idA|idB] 取值约 -5(死对头) ~ +5(同盟)，key 按 id 字典序拼 '|' 保证无向对称。
export function updateMemberBond(idA, idB, delta) {
  if (!idA || !idB || idA === idB) return;
  if (!GS.memberBond) GS.memberBond = {};
  var key = idA < idB ? idA + '|' + idB : idB + '|' + idA;
  var v = GS.memberBond[key] || 0;
  v = Math.max(-5, Math.min(5, v + delta));
  GS.memberBond[key] = v;
}

// 抉择代价链：埋下延迟后果种子（IMP-12）
// 关键选择（帮 A 怼 B / 冷落某人）在此埋 flag，3-5 天后由 buildUserMessage 触发回响。
export function plantFutureConsequence(type, text, minDelay, maxDelay) {
  if (!GS.futureConsequences) GS.futureConsequences = [];
  var delay = randIntSafe(minDelay, maxDelay);
  GS.futureConsequences.push({
    dueDay: GS.day + delay,
    type: type,
    text: text,
    triggered: false
  });
  saveGame();
}

// 工具：安全随机整数（避免依赖未导入的 randInt）
function randIntSafe(min, max) {
  var lo = Math.ceil(min);
  var hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}


