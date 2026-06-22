import { GS } from '../state.js';
import { MEMBERS, PHASES } from '../data.js';
import { getMandatoryTask } from '../formatters.js';

// 构建结构化状态快照（替代散落在 buildUserMessage 中的状态注入）
export function buildContextSnapshot() {
  var currentPhase = PHASES[GS.phaseIndex] || '';

  var snap = {
    day: GS.day,
    phase: currentPhase,
    phaseIndex: GS.phaseIndex,
    season: GS.season,
    weather: GS.weather,
    dateLabel: GS.gameMonth + '月' + GS.gameDay + '日',
    holiday: GS.todayHoliday ? GS.todayHoliday.name : null,
    isHoliday: !!GS.todayHoliday,
    isBirthday: GS.todayHoliday ? GS.todayHoliday.type === 'birthday' : false,
    mandatoryTask: getMandatoryTask(GS.day, currentPhase) || '',
    selectedMembers: GS.selectedMembers.map(function(id) {
      var m = MEMBERS.find(function(x) { return x.id === id; });
      return { id: m.id, name: m.name, stageName: m.stageName };
    }),
    secretX: GS.secretX,
    affection: {},
    drinkCounts: {},
    hasTruthState: !!GS.truthState,
    hasQuestionBox: !!GS.questionBox,
    hasExMessage: !!GS.exMessage,
    hasMidnightCall: !!GS.midnightCall,
    pendingDates: GS.pendingDatingResult ? GS.pendingDatingResult.partner : null,
    todayKeyEvents: GS.todayRevealedInfo || '',
    phaseFreeCount: GS.phaseFreeCount || 0,
    pendingPromises: GS.pendingPromises || []
  };

  // 只复制需要的好感度字段
  if (GS.affection) {
    for (var key in GS.affection) {
      if (GS.affection.hasOwnProperty(key)) {
        snap.affection[key] = GS.affection[key];
      }
    }
  }

  // 只复制的喝酒计数
  if (GS.drinkCounts) {
    for (var k in GS.drinkCounts) {
      if (GS.drinkCounts.hasOwnProperty(k)) {
        snap.drinkCounts[k] = GS.drinkCounts[k];
      }
    }
  }

  return snap;
}

// 序列化为注入文本
export function snapshotToText(snap) {
  var lines = [];
  lines.push('[CONTEXT]');

  // 基本信息
  lines.push('时间：Day ' + snap.day + ' ' + snap.phase + ' ' + snap.dateLabel);
  if (snap.season) lines.push('季节：' + snap.season + ' 天气：' + snap.weather);
  if (snap.holiday) {
    var holidayLabel = snap.isBirthday ? snap.holiday + '（生日）' : snap.holiday;
    lines.push('特别日：' + holidayLabel);
  }

  // 成员
  var memberList = snap.selectedMembers.map(function(m) { return m.name + '(' + m.stageName + ')'; });
  lines.push('在场成员：' + memberList.join('、'));

  // 强制任务
  if (snap.mandatoryTask) lines.push('强制任务：' + snap.mandatoryTask);

  // 好感度
  var affText = [];
  for (var id in snap.affection) {
    var m2 = snap.selectedMembers.find(function(x) { return x.id === id; });
    if (m2) affText.push(m2.name + '=' + snap.affection[id]);
  }
  if (affText.length > 0) lines.push('好感度：' + affText.join('、'));

  // 喝酒计数
  var drinkLines = [];
  for (var k in snap.drinkCounts) {
    var m3 = snap.selectedMembers.find(function(x) { return x.id === k; });
    var name3 = m3 ? m3.name : (k === 'heroine' ? '女主' : k);
    drinkLines.push(name3 + snap.drinkCounts[k] + '杯');
  }
  if (drinkLines.length > 0) lines.push('喝酒累计：' + drinkLines.join('、'));

  // 今日关键事件
  if (snap.todayKeyEvents) {
    lines.push('今日已揭示：' + snap.todayKeyEvents);
  }

  // 待兑现约定
  if (snap.pendingPromises && snap.pendingPromises.length > 0) {
    lines.push('待兑现：' + snap.pendingPromises.join('；'));
  }

  // 特殊状态
  var flags = [];
  if (snap.hasTruthState) flags.push('真心话进行中');
  if (snap.hasQuestionBox) flags.push('提问箱进行中');
  if (snap.pendingDates) {
    var m4 = snap.selectedMembers.find(function(x) { return x.id === snap.pendingDates; });
    if (m4) flags.push('约会对象：' + m4.name);
  }
  if (flags.length > 0) lines.push('特殊状态：' + flags.join('、'));
  if (snap.phaseFreeCount > 0) lines.push('自由输入次数：' + snap.phaseFreeCount);

  lines.push('[/CONTEXT]');
  return lines.join('\n');
}
