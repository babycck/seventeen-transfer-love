import { GS, saveGame } from '../state.js';
import { MEMBERS } from '../data.js';
import { updateAffection, addAffectionLog } from '../affection.js';

// 嫉妒任务触发检查（25% 概率）
export function checkJealousyMissionTrigger() {
  var excludedDays = [1, 3, 9, 11, 12];
  if (excludedDays.indexOf(GS.day) >= 0) return false;
  var datingDays = [4, 5, 8, 9, 10];
  if (datingDays.indexOf(GS.day) >= 0) return false;
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

  if (choice === 'ignore') {
    em.status = 'ignored';
    updateAffection(em.memberId, -2);
    addAffectionLog(em.memberId, -2, '前任来电时女主假装没看见');
  } else if (choice === 'comfort') {
    em.status = 'comforted';
    updateAffection(em.memberId, 3);
    addAffectionLog(em.memberId, 3, '前任来电时女主安慰了他');
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
  });

  var targetMember = null;
  for (var i = 0; i < members.length; i++) {
    if (choiceText.indexOf(members[i].name) >= 0) {
      targetMember = members[i];
      break;
    }
  }
  if (!targetMember) return;

  for (var j = 0; j < members.length; j++) {
    var b = members[j];
    if (b.id === targetMember.id) continue;

    var aff = GS.affection[b.id] || 0;
    if (aff < 50) continue;

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


