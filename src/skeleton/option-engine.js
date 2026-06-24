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

  // 深夜时段（phaseIndex === 3）：提前拦截，避免被下方约会场景分支捕获而误走 AI 生成选项路径
  if (phase === 3) {
    return [];
  }

  // 约会场景中（仅 phase 1 约会延续中；Day 10 由弹窗设定，phase 0 全天约会）
  if (GS.currentDatingPartner && [4, 6, 8, 9, 10].indexOf(day) >= 0 && (phase === 1 || (day === 10 && phase === 0))) {
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

  // 默认：返回 null 让 AI 基于剧情生成选项（AI 失败时有兜底模板）
  return null;
}

function generateStandardOptions(day, phase) {
  var memberList = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  }).filter(function(m) { return m; });

  if (memberList.length < 2) return null;
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
// 返回 null 让 AI 基于剧情生成带好感度的选项
function generateDatingOptions() {
  return null;
}

// 导出兜底选项（带好感度字段），供 game-engine.js 中 AI 选项生成失败时使用
export function getFallbackOptions() {
  var memberList = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  }).filter(function(m) { return m; });

  if (memberList.length < 2) {
    return [
      { text: '继续观察情况', affName: '', affDelta: 0, affReason: '' },
      { text: '主动参与对话', affName: '', affDelta: 0, affReason: '' },
      { text: '找个借口离开', affName: '', affDelta: 0, affReason: '' }
    ];
  }

  var options = [];
  var day = GS.day;
  var phase = GS.phaseIndex;

  options.push({
    text: '和' + memberList[0].name + randomActivity(day, phase),
    affName: memberList[0].name, affDelta: 2, affReason: '主动互动'
  });
  options.push({
    text: '找' + memberList[1].name + randomActivity2(day, phase),
    affName: memberList[1].name, affDelta: 1, affReason: '主动互动'
  });
  if (memberList.length >= 3) {
    options.push({
      text: '和' + memberList[2].name + randomActivity3(day, phase),
      affName: memberList[2].name, affDelta: 1, affReason: '主动互动'
    });
  } else {
    options.push({ text: '独自待一会儿', affName: '', affDelta: 0, affReason: '' });
  }

  return options;
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
