// test-mode.js — 绕过AI，用池子文本生成轻量剧情 + 固定选项
// 控制台输入: __toggleTestMode() 开关

import {
  ATMOSPHERE_WEATHER, ATMOSPHERE_MOOD, ATMOSPHERE_HIS_STATE,
  ROMANCE_BACKSTAGE, ROMANCE_LATENIGHT, ROMANCE_PUBLIC, ROMANCE_CRISIS,
  ROMANCE_JEALOUSY_POOL, ROMANCE_CONFESSION,
  SECRET_COMMS, SECRET_NEARMISS, SECRET_FAN_CLUES, SECRET_COMPANY,
  ENCOUNTER_ML, ENCOUNTER_RIVAL, ENCOUNTER_BROTHER, ENCOUNTER_OTHERS,
  DRAMA_MISUNDERSTAND, DRAMA_COLDWAR, DRAMA_DATING_RUMOR, DRAMA_DILEMMA, DRAMA_ALMOST,
  MILESTONE_AWARDS, MILESTONE_FIRST_WIN, MILESTONE_DEBUT,
  CALENDAR_EVENTS, DAILY_BUZZ, DAILY_BUZZ_TEMPLATES,
  BOYGROUP_POOL, TRAINEE_EARLY_POOL, TRAINEE_MID_POOL, TRAINEE_LATE_POOL
} from './pools/index.js';

// 缓存 — 文本数组
var TXT = {};

function cache(name, pool) {
  if (!pool || !pool.length) return;
  TXT[name] = [];
  for (var i = 0; i < pool.length; i++) {
    var e = pool[i]; if (!e) continue;
    var t = typeof e === 'string' ? e : (e.text || e.t || '');
    if (t && t.length > 5 && t.length < 400) TXT[name].push(t);
  }
}

cache('ATMOSPHERE_WEATHER', ATMOSPHERE_WEATHER);
cache('ATMOSPHERE_MOOD', ATMOSPHERE_MOOD);
cache('ATMOSPHERE_HIS_STATE', ATMOSPHERE_HIS_STATE);
cache('ROMANCE_BACKSTAGE', ROMANCE_BACKSTAGE);
cache('ROMANCE_LATENIGHT', ROMANCE_LATENIGHT);
cache('ROMANCE_PUBLIC', ROMANCE_PUBLIC);
cache('ROMANCE_CRISIS', ROMANCE_CRISIS);
cache('ROMANCE_JEALOUSY', ROMANCE_JEALOUSY_POOL);
cache('ROMANCE_CONFESSION', ROMANCE_CONFESSION);
cache('SECRET_COMMS', SECRET_COMMS);
cache('SECRET_NEARMISS', SECRET_NEARMISS);
cache('SECRET_FAN_CLUES', SECRET_FAN_CLUES);
cache('SECRET_COMPANY', SECRET_COMPANY);
cache('ENCOUNTER_ML', ENCOUNTER_ML);
cache('ENCOUNTER_RIVAL', ENCOUNTER_RIVAL);
cache('ENCOUNTER_BROTHER', ENCOUNTER_BROTHER);
cache('ENCOUNTER_OTHERS', ENCOUNTER_OTHERS);
cache('DRAMA_MISUNDERSTAND', DRAMA_MISUNDERSTAND);
cache('DRAMA_COLDWAR', DRAMA_COLDWAR);
cache('DRAMA_DATING_RUMOR', DRAMA_DATING_RUMOR);
cache('DRAMA_DILEMMA', DRAMA_DILEMMA);
cache('DRAMA_ALMOST', DRAMA_ALMOST);
cache('MILESTONE_AWARDS', MILESTONE_AWARDS);
cache('MILESTONE_FIRST_WIN', MILESTONE_FIRST_WIN);
cache('MILESTONE_DEBUT', MILESTONE_DEBUT);
cache('CALENDAR_EVENTS', CALENDAR_EVENTS);
cache('DAILY_BUZZ', DAILY_BUZZ);
cache('BOYGROUP_POOL', BOYGROUP_POOL);

function rpick(arr, n) {
  if (!arr || !arr.length) return [];
  var tmp = arr.slice(), res = [], k = Math.min(n || 1, tmp.length);
  for (var i = 0; i < k; i++) { res.push(tmp.splice(Math.floor(Math.random() * tmp.length), 1)[0]); }
  return res;
}

function pick(arr) { return arr ? arr[Math.floor(Math.random() * arr.length)] : ''; }

function sceneHints(E) {
  var aff = E.affection || 0, exp = E.misc ? ((typeof E.misc.scandalHeat === 'number') ? E.misc.scandalHeat : (E.misc.exposureAccum || 0)) : 0, isD = E.career && E.career.debutDay > 0;
  var lines = [];
  var checks = [
    ['ATMOSPHERE_WEATHER', '天气', true], ['ATMOSPHERE_MOOD', '心情', true], ['ATMOSPHERE_HIS_STATE', '他今天', isD && aff >= 10],
    ['ROMANCE_BACKSTAGE', '后台', aff >= 20], ['ROMANCE_LATENIGHT', '深夜', aff >= 20], ['ROMANCE_PUBLIC', '公共', aff >= 20],
    ['ROMANCE_CRISIS', '危机', aff >= 40], ['ROMANCE_JEALOUSY', '吃醋', aff >= 30], ['ROMANCE_CONFESSION', '告白', aff >= 60],
    ['SECRET_COMMS', '通讯', aff >= 30 && exp >= 10], ['SECRET_NEARMISS', '暴露', aff >= 30 && exp >= 10],
    ['SECRET_FAN_CLUES', '线索', aff >= 30 && exp >= 10], ['SECRET_COMPANY', '公司', aff >= 30 && exp >= 10],
    ['ENCOUNTER_ML', '偶遇男主', aff >= 20], ['ENCOUNTER_RIVAL', '偶遇情敌', aff >= 20],
    ['ENCOUNTER_BROTHER', '哥哥', aff >= 20], ['ENCOUNTER_OTHERS', '起哄', aff >= 30],
    ['DRAMA_MISUNDERSTAND', '误会', aff >= 30], ['DRAMA_COLDWAR', '冷战', aff >= 40],
    ['DRAMA_DATING_RUMOR', '绯闻', aff >= 40], ['DRAMA_DILEMMA', '二选一', aff >= 50],
    ['DRAMA_ALMOST', '差点告白', aff >= 50],
    ['MILESTONE_AWARDS', '颁奖', isD], ['MILESTONE_FIRST_WIN', '一位', isD],
    ['CALENDAR_EVENTS', '日历', isD]
  ];
  for (var i = 0; i < checks.length; i++) {
    var c = checks[i];
    if (!c[2]) continue;
    var texts = TXT[c[0]];
    if (texts && texts.length) {
      var t = pick(texts);
      if (t) lines.push('[' + c[1] + '] ' + (t.length > 150 ? t.substring(0, 150) + '…' : t));
    }
  }
  return lines;
}

export function buildTestNarrative(type, extra) {
  var E = GS.entSim;
  if (!E) return 'Loading...';
  var aff = E.affection || 0, pop = E.career.popularity || 0;
  var ch = E.chapter.index || 1, day = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  var phase = E.cycle.timeOfDay || 0;
  var phaseLabels = ['上午', '下午', '夜晚'];
  var chNames = ['', '新人出道', '崭露头角', '稳步上升', '人气偶像', '顶流巨星', '传奇殿堂'];

  var hints = sceneHints(E);
  hints.sort(function() { return Math.random() - 0.5; });
  var picked = hints.slice(0, Math.min(4, hints.length));

  var locs = [
    '练习室', '待机室', '保姆车上', '公司走廊', '宿舍', '咖啡店',
    '便利店', '天台', '录音棚', '签售会场', '健身房', '放映室'
  ];
  var loc = pick(locs);

  var moods = {
    1: ['紧张又期待，练习服被汗浸湿了一遍又一遍', '不确定自己够不够好，但每次站在镜子前又会多一点点勇气'],
    2: ['渐渐习惯镜头前的生活——但每次手机亮了还是会先看是不是他的名字', '心里有了一个不能告诉任何人的秘密'],
    3: ['他已经变成了日程表之外的第二个钟——比通告还准时', '聚光灯打在你身上时——你只想让他看到'],
    4: ['你已经无法想象没有他的日常——虽然他每次探班都假装只是路过', '开始写歌——关于一个人的']
  };
  var mg = aff < 10 ? 1 : aff < 30 ? 2 : aff < 60 ? 3 : 4;
  var mood = pick(moods[mg]);

  var nar = '';
  if (type === 'phase' && extra && extra.nextDayOpening) {
    nar += '▸ Day ' + day + ' · ' + phaseLabels[phase] + '\n\n';
  } else if (type === 'choice' && extra && extra.choiceText) {
    nar += '── 你的选择：' + extra.choiceText + ' ──\n\n';
  } else if (type === 'free' && extra && extra.freeText) {
    nar += '── 你输入：' + extra.freeText + ' ──\n\n';
  }

  nar += loc + '。' + mood + '。\n\n';
  var isDebut = E.career && E.career.debutDay > 0;
  if (isDebut) {
    nar += '' + (chNames[ch] || '') + ' · 人气 ' + pop + ' · Ch' + ch + '\n';
  } else {
    nar += '练习生 · 第' + (E.career._traineeDayCount || 1) + '天\n';
  }

  if (picked.length) {
    nar += '\n🎭 素材：\n' + picked.join('\n') + '\n';
  }
  nar += '\n💬 选择下一步行动：';

  return nar;
}

export function buildTestOptions() {
  var E = GS.entSim;
  var aff = E.affection || 0;
  if (aff < 10) return [
    { text: '努力练习，把今天的日程做到最好', type: 'good', delta: 2 },
    { text: '在休息时观察一下周围的人和氛围', type: 'neutral', delta: 0 },
    { text: '偷偷看了一眼手机……没有新消息', type: 'shy', delta: 0 }
  ];
  if (aff < 40) return [
    { text: '在公开场合遇到他，点头微笑但没说话', type: 'good', delta: 2 },
    { text: '和队友聊了一会儿他和哥哥今天在做什么', type: 'neutral', delta: 0 },
    { text: '假装在忙，其实脑子里在回想上次的对话', type: 'bad', delta: 0 }
  ];
  return [
    { text: '他发来消息——你在练习室里假装若无其事地回复', type: 'good', delta: 2 },
    { text: '后台偶遇——两个人都在假装只是路过', type: 'neutral', delta: 0 },
    { text: '看到他和别人说话——你偏过头去假装调整耳机', type: 'bad', delta: 0 }
  ];
}

// 可从控制台开关
window.__toggleTestMode = function(on) {
  if (on === undefined) on = !window.__ENT_SIM_TEST;
  window.__ENT_SIM_TEST = on;
  console.log('测试模式 ' + (on ? '🟢 ON' : '⚫ OFF'));
  if (on) console.log('  下次 generateEntSimRound 将不使用 AI');
  return on;
};

// 默认关闭（控制台 __toggleTestMode() 可手动开启）
window.__ENT_SIM_TEST = false;
