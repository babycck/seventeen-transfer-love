import { GS } from '../state.js';
import { MEMBERS } from '../data.js';

// 根据当前场景生成选项（兼容 AI 选项格式：{ text, riskMember, riskDelta }）
// 好感度由 game-engine.js 的 triggerAffectionFromChoice 通过文本中的成员名处理
export function generateOptions() {
  var day = GS.day;
  var phase = GS.phaseIndex;

  // 约会日上午：只保留"进入约会场景"按钮
  if ([4, 6, 8, 9].indexOf(day) >= 0 && phase === 0) {
    return [{ text: '▶ 进入约会场景' }];
  }

  // 约会场景中（已进入约会阶段，currentDatingPartner 已设定）
  if (GS.currentDatingPartner && [4, 6, 8, 9, 10].indexOf(day) >= 0 && (phase >= 1 || day === 10)) {
    return generateDatingOptions();
  }

  // 真心话模式：不生成常规选项
  if (day === 11 && GS.truthState && GS.truthState.active) {
    return [];
  }

  // 提问箱模式：固定两个按钮
  if (GS.questionBox && GS.questionBox.active) {
    return [
      { text: '如实回答' },
      { text: '拒绝回答并喝酒' }
    ];
  }

  // 深夜时段（phaseIndex === 3）：不生成常规选项
  if (phase === 3) {
    return [];
  }

  // 默认：从成员列表生成互动选项
  return generateStandardOptions(day, phase);
}

function generateStandardOptions(day, phase) {
  var memberList = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  }).filter(function(m) { return m; });

  if (memberList.length < 2) return fallbackOptions();
  var options = [];

  var a = memberList[0];
  options.push({ text: '和' + a.name + randomActivity(day, phase) });

  var b = memberList[1];
  options.push({ text: '找' + b.name + randomActivity2(day, phase) });

  if (memberList.length >= 3) {
    var c = memberList[2];
    options.push({ text: '和' + c.name + randomActivity3(day, phase) });
  } else {
    options.push({ text: '独自待一会儿' });
  }

  return options;
}

// 约会场景选项生成（只涉及约会对象）
function generateDatingOptions() {
  var partner = MEMBERS.find(function(m) { return m.id === GS.currentDatingPartner; });
  if (!partner) return fallbackOptions();
  var phaseKey = getPhaseKey(GS.phaseIndex);
  var pool = _datingActivities[phaseKey] || _datingActivities.afternoon;
  var name = partner.name;
  return [
    { text: '和' + name + pool[(GS.day * 7 + GS.phaseIndex * 3) % pool.length] },
    { text: '主动对' + name + pool[(GS.day * 11 + GS.phaseIndex * 5 + 3) % pool.length] },
    { text: '和' + name + pool[(GS.day * 13 + GS.phaseIndex * 7 + 7) % pool.length] }
  ];
}

function fallbackOptions() {
  return [
    { text: '在客厅里坐坐' },
    { text: '到院子里走走' }
  ];
}

// 活动词库（按时段分，定期轮换避免单调）
var _activities = {
  morning: ['一起做早餐', '聊聊天', '帮忙准备', '出去走走'],
  afternoon: ['一起去做饭', '散步', '聊点心事', '看书', '喝咖啡'],
  evening: ['一起准备晚餐', '在客厅聊天', '下棋', '看电影'],
  night: ['在阳台聊天', '看星星', '说说话', '一起听歌']
};

// 约会活动词库（二人独处氛围）
var _datingActivities = {
  afternoon: ['并肩散步', '聊聊彼此的爱好', '分享最近的心情', '找个安静的角落坐坐', '说说心里话'],
  evening: ['一起做饭边聊', '在客厅里谈心', '分享今天的感受', '到院子里散步', '安静地听音乐']
};

function getPhaseKey(phase) {
  if (phase === 0) return 'morning';
  if (phase === 1) return 'afternoon';
  if (phase === 2) return 'evening';
  return 'night';
}

// 伪随机（同一 day+phase 固定，保证每次刷新不变）
function randomActivity(day, phase) {
  var pool = _activities[getPhaseKey(phase)] || _activities.afternoon;
  return pool[(day * 7 + phase * 3) % pool.length];
}

function randomActivity2(day, phase) {
  var pool = _activities[getPhaseKey(phase)] || _activities.afternoon;
  return pool[(day * 11 + phase * 5 + 3) % pool.length];
}

function randomActivity3(day, phase) {
  var pool = _activities[getPhaseKey(phase)] || _activities.afternoon;
  return pool[(day * 13 + phase * 7 + 7) % pool.length];
}
