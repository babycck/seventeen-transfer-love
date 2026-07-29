// ============================================================
// 娱乐圈模拟器（entSim）· 状态初始化与便捷取值
// 在 setup 完成时调用 initEntSimState()；提供一组只读 getter 供 UI / 引擎使用。
// ============================================================
import { GS, setGS, saveGame } from '../state.js';
import { MEMBERS, buildEntSimHeroineGroup, buildEntSimGroupMeta } from '../data.js';
import { randInt } from '../utils.js';
import { ENT_SIM_CAREERS, CHAPTERS, RIVAL_NAMES, CYCLE_STAGE_META, ROMANCE_DEPTH_LABELS } from './data.js';

// 初始化 entSim 全部运行时状态（setup 完成后调用一次）
export function initEntSimState() {
  if (!GS.entSim) GS.entSim = {};
  // 清空聊天历史（避免新游戏复用旧档）
  GS._entSimChatHistory = {};
  GS._entSimChatSentIdx = {};
  // 清空场景灵感去重记录（commit-only模型：新游戏所有池子重新可用）
  if (window.__resetInspUsedTexts) window.__resetInspUsedTexts();
  var E = GS.entSim;
  // 手册规定：队友妹妹世界观下职业固定为「女团爱豆」
  var careerKey = '练习生';
  var career = ENT_SIM_CAREERS[careerKey] || ENT_SIM_CAREERS['练习生'];

  // 男主：优先使用 setup 选中的成员（R1 独立 NPC），否则随机
  var maleLead = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }) || pickMember();
  // 哥哥：另一名成员（关系户=亲哥哥，仅 sisterSetting 职业有）
  var brother = null;
  if (career.sisterSetting) {
    brother = pickMember(maleLead ? maleLead.id : '', true);
  }

  // 锁定娱乐圈世界观 + 哥哥关系（复用 oneHeart 兼容字段，便于 isSisterSetting 双门控）
  GS.worldSetting = 'entertainment';
  if (brother) {
    GS.oneHeartRelationCharacter = { id: brother.id, name: brother.name, role: '哥哥', isBrother: true };
  } else {
    GS.oneHeartRelationCharacter = null;
  }

  E.career = {
    profession: careerKey,
    careerKey: careerKey,
    popularity: 0,   // 练习生期人气=0，出道后由engine.js初始化
    careerLevel: '新人',
    resourcesLevel: '新人',
    debutDay: 0,
    yearsActive: 0,
    contractYears: 7,
    contractRemaining: 7,
    traineePhase: 1,         // 练习生阶段 1=前期 2=中期 3=后期
    _lastTraineePhase: 1,    // 上次阶段号，防过渡事件重复触发
    _debutTriggerDay: 0,     // 进入后期累计天数，>=2+randInt触发"出道最终评价"
    _traineeDayCount: 0      // 独立练习天数（不限日历dayCount，从0起每游戏天+1）
  };
  E.skills = { vocal: 60, dance: 45, variety: 30, visual: 80 };
  E.works = { slots: {} }; // 在播作品槽位（onAirWorkCount 读取，防止 .slots 未初始化抛 TypeError）
  E.cycle = { phaseIndex: 0, stageIndex: 0, roundTotal: 0, timeOfDay: 0, dayCount: 1, _gameDayCount: 1 }; // dayCount=2024-01-01起算(真实日历)，_gameDayCount=独立游戏天数(冷却/阶段推进)
  // 好感度（0-100）：恋爱主线核心驱动，AI 每回合返回 affectionDelta 推进
  E.affection = 0;
  E.npcNetwork = {
    nodes: {}
  };
  E.romance = {
    depth: 0, // 兼容保留（不再作为主驱动，由 affection 派生 stage）
    stage: '初遇', // 由 affection 派生的 8 阶段标签
    emotion: '思念',
    lastBeatRound: 0,
    confessionDone: false,
    confessionResult: '',
    coverUsed: 0,
    _dateConsecutive: 0,      // 约会连续计数，用于冷却检查
    _lastDateDay: 0,            // 上次约会天数
    publicLine: false,
    seedEvent: '', // AI 在 setup 生成的 200 字上心契机存档
    mannerisms: [], // 男主小动作池（setup 抽取）
    confessionTimes: 0, // 告白次数（第2次被拒则不再主动告白）
    maleLead: { id: maleLead.id, name: maleLead.name, memberId: maleLead.id },
    dateCount: 0 // 约会次数
  };
  E.romance.mannerisms = buildMannerisms(maleLead); // 男主小动作池：1主 + 1备
  E.dailyBuzz = { hotSearch: [], fanDiscussion: [], mediaTitle: [], lastGenDay: -1 };
  E.appointments = []; // { with, place, timeHint, summary, roundCreated, done }
  E._svtTodaySeen = []; // 今天出场的 SVT 队友（name+desc），防同一天重复出场
  // 粉丝泡泡系统（替代旧营业反馈）
  E.bubble = { subscribers: 100 + randInt(0, 900), messages: [], todayCount: 0, lastSentDay: 0, streak: 0 };
  E._affectionLog = []; // 好感度来源日志（{day, round, delta, reason, total}）
  E.careerHistory = [];
  E.secret = { items: defaultSecrets(), foundByRival: false, broTeaseRound: 0, maleRound: 0, rivalRound: 0 };
  E.brother = {
    stance: brother ? '参谋' : '无',
    support: brother ? 0 : 0,
    name: brother ? brother.name : '',
    id: brother ? brother.id : '',
    pool: [],
    testNudged: { 1: false, 2: false, 3: false },
    rivalAware: false,
    talkPending: false
  };
  var chapDef = CHAPTERS[career.startChapter - 1] || {};
  E.chapter = { index: career.startChapter, name: chapterNameOf(career.startChapter), desc: chapDef.desc || '', roundInChapter: 0, entered: true };

  E.agenda = { main: '', mainLoc: '', related: '', relatedLoc: '', rival: '', rivalLoc: '', brother: '', brotherLoc: '', doneFlags: {} };
  // 记忆系统：每日压缩的关键词摘要 + 关键事件累积（不过期）
  E.memory = { dailySummaries: [], eventLog: [], milestones: [], phaseSummaries: [], lastCompressDay: 0 };
  // 女团队友（5 位姐姐）：setup 时具象化，供 AI 客串
  E.heroineGroup = buildEntSimHeroineGroup();
  E.groupMeta = buildEntSimGroupMeta();
  E.misc = { suspicion: 0, manualPRUsed: 0, prRemaining: 2, exposureAccum: 0, scandalHeat: 0, careerPublicity: 0, cpRealProgress: 0, cpRealTriggered: false };
  // v2 新增：吃醋值系统
  E._jealousLevel = 0; // 0-10，情敌互动+1/天 衰减-1/天
  E._jealousLastUpdateDay = 0;
  // v2 新增：亲密行为阶段锁
  E._intimacyUnlocked = { hand: false, hug: false, kiss: false }; // 牵手≥15/拥抱≥30/接吻≥50
  // v2 新增：纪念日记录
  E._romanceMilestones = {}; // { firstDateDay, firstConfessDay, firstKissDay, firstHandDay, firstHugDay }
  // v2 新增：男主主动联络倒计时
  E._maleContactTimer = 8 + randInt(0, 10); // 8-18天倒计时
  // v2 新增：粉丝来信/品牌代言/作品发布/季度颁奖CD
  E._lastFanLetterDay = 0;
  E._lastBrandOfferDay = 0;
  E._releaseCD = 0; // 0=可用 >0=冷却剩余天数
  E._lastAwardDay = 0;
  E._lastVarietyDay = 0; // 综艺冷却（5天）
  E._lastMagazineDay = 0; // 画报冷却（3天）
  E.brother.supportLog = E.brother.supportLog || []; // 哥哥支持度变动日志
  E._scheduledEvents = []; // 日程事件队列 [{id,type:variety|brand|magazine|release,data:poolItem,targetDay,text,loc,done}]
  E.flags = {};
  E.endings = { hint: '', locked: false, type: '', eligible: false, text: '' }; // 系统10 结局
  E.started = false; // 首轮剧情是否已成功生成（renderHtml 据此避免重复触发生成）

  // 社交系统字段
  E.chatHistory = E.chatHistory || [];
  E.moments = E.moments || [];
  E.theaterHistory = E.theaterHistory || [];
  E.fanReactions = E.fanReactions || []; // 营业/曝光后的粉丝圈反应

  // 重置生成中/自动重试/待触发事件等瞬态标志，避免上一局崩溃残留导致卡死
  GS._entSimGenerating = false;
  GS._entSimAutoTries = 0;
  GS._entSimCurrent = null;
  GS._entSimPendingEvent = '';

  // 队友妹妹设定下开局已认识哥哥与情敌，置位避免 prompt 注入"第一次介绍"
  if (career.sisterSetting) {
    GS._relCharIntroduced = true;
    GS._rivalIntroduced = true;
  }

  // 随机生成四人组生日（月-日格式，均匀分布在四季，真实月份天数）
  function _randBday() {
    var m = Math.floor(Math.random() * 12) + 1;
    var maxDay = m === 2 ? 29 : DAYS_IN_MONTH[m - 1]; // 二月按闰年最大29天
    return m + '-' + (Math.floor(Math.random() * maxDay) + 1);
  }
  E.career._birthdays = {
    heroine: _randBday(),
    brother: _randBday(),
    ml: _randBday(),
    rival: _randBday()
  };

  saveGame();
  return E;
}

// 生成男主小动作池：从成员 catchphrases / comforts / quirks 中抽取 1 主 + 1 备
// 例如 "推眼镜"、"哼歌前清嗓子"、"紧张时摸后颈" 等，供剧情每 5-8 回合自然出现一次
function buildMannerisms(member) {
  var pool = [];
  if (member.catchphrases && member.catchphrases.length) pool = pool.concat(member.catchphrases.slice(0, 2));
  if (member.comforts && member.comforts.length) pool = pool.concat(member.comforts.slice(0, 2));
  if (member.habits && member.habits.length) pool = pool.concat(member.habits.slice(0, 2));
  if (member.quirks && member.quirks.length) pool = pool.concat(member.quirks.slice(0, 2));
  if (pool.length === 0) return ['无意识地看向你', '听到你名字时停顿了一下'];
  // 去重并随机抽取 2 个
  var uniq = [];
  for (var i = 0; i < pool.length; i++) {
    if (uniq.indexOf(pool[i]) === -1) uniq.push(pool[i]);
  }
  var out = [];
  while (out.length < 2 && uniq.length) {
    var idx = randInt(0, uniq.length - 1);
    out.push(uniq.splice(idx, 1)[0]);
  }
  return out.length ? out : ['无意识地看向你'];
}

// 女团队友具象化函数 buildHeroineGirlGroup 已迁移至 data.js（避免循环依赖）

function pickMember(excludeId, isBrother) {
  var pool = MEMBERS.slice();
  if (excludeId) pool = pool.filter(function(m) { return m.id !== excludeId; });
  if (pool.length === 0) pool = MEMBERS.slice();
  return pool[randInt(0, pool.length - 1)];
}

function defaultSecrets() {
  // 女主秘密：追过 EXO 金珉锡（纯 EXO 向，不涉及SEVENTEEN成员直播间）
  var pool = [
    '私下是 EXO 金珉锡的粉丝，手机里存着他很多直拍',
    '瞒着哥哥偷偷去看了 EXO 金珉锡的签售会',
    '床头的抽屉里藏着男主的周边小卡和 EXO 的金珉锡小卡',
    '写过的关于金珉锡的同人文还锁在备忘录里'
  ];
  var copy = pool.slice();
  var out = [];
  for (var i = 0; i < 2 && copy.length; i++) {
    var idx = randInt(0, copy.length - 1);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function rivalNode() {
  // 女性情敌已移除，统一返回 suitor（SEVENTEEN 团内竞争者）
  return suitorNode();
}

function suitorNode() {
  return (GS.entSim && GS.entSim.npcNetwork && GS.entSim.npcNetwork.nodes['npc_suitor']) || null;
}

// ---------- 便捷取值 ----------
function entSim() { return GS.entSim || {}; }
export function popularity() { return (GS.entSim && GS.entSim.career.popularity) || 0; }
export function careerLevel() { return (GS.entSim && GS.entSim.career.careerLevel) || '新人'; }
export function resourcesLevel() { return (GS.entSim && GS.entSim.career.resourcesLevel) || '新人'; }
export function chapterIndex() { return (GS.entSim && GS.entSim.chapter.index) || 1; }
export function chapterName() { return (GS.entSim && GS.entSim.chapter.name) || ''; }
export function cyclePhaseIndex() { return (GS.entSim && GS.entSim.cycle.phaseIndex) || 0; }
export function romanceDepth() { return (GS.entSim && GS.entSim.romance.depth) || 0; }
export function romanceDepthLabel() { return (ROMANCE_DEPTH_LABELS[romanceDepth()] || {}).label || '初遇'; }
export function maleLead() { return (GS.entSim && GS.entSim.romance.maleLead) || { id: '', name: '' }; }
export function brotherNode() { return GS.oneHeartRelationCharacter || null; }

function onAirWorkCount() {
  var slots = (GS.entSim && GS.entSim.works.slots) || {};
  var n = 0;
  for (var k in slots) { if (slots[k].stage === 2) n++; }
  return n;
}

// 职业差异（系统4）：台前 vs 幕后、是否 sisterSetting
export function isStageProfession() {
  var p = (GS.entSim && GS.entSim.career && GS.entSim.career.profession) || (GS.heroineProfile && GS.heroineProfile.profession) || '';
  return ['爱豆', '演员', '歌手', '主播', '模特', '练习生', '女团爱豆'].indexOf(p) >= 0;
}
function isSisterSettingOn() {
  var p = (GS.entSim && GS.entSim.career && GS.entSim.career.profession) || (GS.heroineProfile && GS.heroineProfile.profession) || '';
  return (ENT_SIM_CAREERS[p] && ENT_SIM_CAREERS[p].sisterSetting) || false;
}

// ---------- 派生 ----------
function careerLevelOf(pop) {
  if (pop >= 90) return '传奇';
  if (pop >= 75) return '顶流';
  if (pop >= 55) return '当红';
  if (pop >= 35) return '走红';
  if (pop >= 15) return '上升';
  return '新人';
}
// 练习生阶段：纯天数驱动，dayCount驱动1=前期/2=中期/3=后期
export function traineePhaseOf(dayCount) {
  if (dayCount <= 2) return 1;
  if (dayCount <= 4) return 2;
  return 3;
}
// 日期推导：真实日历，dayCount=1 → 2024-01-01，支持闰年
var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function _isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}
function _yearMonthDay(dayCount) {
  var remaining = dayCount - 1;
  var year = 2024;
  while (true) {
    var daysInYear = _isLeapYear(year) ? 366 : 365;
    if (remaining < daysInYear) break;
    remaining -= daysInYear;
    year++;
  }
  var month = 1;
  for (var i = 0; i < 12; i++) {
    var dim = DAYS_IN_MONTH[i];
    if (i === 1 && _isLeapYear(year)) dim = 29;
    if (remaining < dim) return { year: year, month: month, day: remaining + 1 };
    remaining -= dim;
    month++;
  }
  return { year: year, month: 12, day: remaining + 1 };
}
export function gameDayOf(dayCount) {
  return _yearMonthDay(dayCount).day;
}
export function gameMonthOf(dayCount) {
  return _yearMonthDay(dayCount).month;
}
export function gameSeasonOf(dayCount) {
  var m = gameMonthOf(dayCount);
  if (m === 12 || m <= 2) return 'winter';
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  return 'autumn';
}
function gameYearOf(dayCount) {
  return _yearMonthDay(dayCount).year;
}
export function formatGameDate(dayCount) {
  var ymd = _yearMonthDay(dayCount);
  return ymd.year + '年' + ymd.month + '月' + ymd.day + '日';
}
// 练习生期简易日期：dayCount直接当"练习第N天"
export function formatTraineeDate(dayCount) {
  return '练习第' + dayCount + '天';
}
function chapterNameOf(idx) {
  return (CHAPTERS[idx - 1] && CHAPTERS[idx - 1].name) || '新人出道';
}
function chapterIconOf(idx) {
  return (CHAPTERS[idx - 1] && CHAPTERS[idx - 1].icon) || '🌱';
}
// 根据人气阈值计算应处章节（1-6），只进不退。出道后6阶段参考明星志愿3称号体系。
function chapterByPopularity(pop, startChapter) {
  var start = startChapter || 1;
  var threshold = 1;
  if (pop >= 90) threshold = 6;
  else if (pop >= 75) threshold = 5;
  else if (pop >= 55) threshold = 4;
  else if (pop >= 35) threshold = 3;
  else if (pop >= 15) threshold = 2;
  return Math.max(start, threshold);
}
// 章节跨越时的时间跳跃（天），模拟事业积累需要时间
export var CHAPTER_TIME_SKIP = { 2: 30, 3: 45, 4: 60, 5: 75, 6: 90 };
// 检查并推进章节，返回是否发生跨越。跨越时自动加时间跳
export function checkChapterAdvance() {
  var E = GS.entSim;
  if (!E || !E.chapter || !E.career) return false;
  var target = chapterByPopularity(E.career.popularity, E.career.startChapter || E.chapter.index || 1);
  var old = E.chapter.index || 1;
  if (target > old) {
    // 章节跨越：自动时间跳（防止30天成顶流）
    var skip = CHAPTER_TIME_SKIP[target] || 0;
    if (skip > 0) { E.cycle.dayCount += skip; }
    E.chapter.index = target;
    E.chapter.name = chapterNameOf(target);
    E.chapter.icon = chapterIconOf(target);
    E.chapter.roundInChapter = 0;
    E.chapter.entered = true;
    // 出道由 engine.js 的 _debutTriggerDay 驱动，此处只处理出道后人气跨阈值切换章节
    // 章节奖励：+1 掩护次数上限（最多7次）
    if (E.romance && typeof E.romance.coverUsed === 'number') {
      var newMax = Math.min(7, 5 + (target - old));
      E.romance._coverMaxBonus = (E.romance._coverMaxBonus || 0) + (target - old);
    }
    saveGame();
    return true;
  }
  return false;
}
// 检测今天是谁的生日（通用版，返回通用标签）
export function todayBirthday(dayCount, birthdays) {
  if (!birthdays) return null;
  var m = gameMonthOf(dayCount);
  var d = gameDayOf(dayCount);
  var today = m + '-' + d;
  if (birthdays.heroine === today) return { who: 'heroine', label: '你的生日', name: '你' };
  if (birthdays.brother === today) return { who: 'brother', label: '哥哥的生日', name: '哥哥' };
  if (birthdays.ml === today) return { who: 'ml', label: '男主的生日', name: '男主' };
  if (birthdays.rival === today) return { who: 'rival', label: '情敌的生日', name: '情敌' };
  return null;
}
// 检测今天是谁的生日（真实姓名版，注入 prompt 用）
export function birthdayInfo(dayCount, E) {
  if (!E || !E.career || !E.career._birthdays) return null;
  var m = gameMonthOf(dayCount);
  var d = gameDayOf(dayCount);
  var today = m + '-' + d;
  var bd = E.career._birthdays;
  var mlName = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '他';
  var brotherName = (E.brother && E.brother.name) || (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) || '哥哥';
  var rivalNode = (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor']) || {};
  var rivalName = rivalNode.name || '情敌';
  if (bd.heroine === today) return { who: 'heroine', label: '今天是你的生日', name: '你' };
  if (bd.brother === today) return { who: 'brother', label: '今天是哥哥 ' + brotherName + ' 的生日', name: brotherName };
  if (bd.ml === today) return { who: 'ml', label: '今天是男主 ' + mlName + ' 的生日', name: mlName };
  if (bd.rival === today) return { who: 'rival', label: '今天是情敌 ' + rivalName + ' 的生日', name: rivalName };
  return null;
}
// 检测今天是什么节日（返回 null 或节日名）
export function todayHoliday(dayCount) {
  var m = gameMonthOf(dayCount);
  var d = gameDayOf(dayCount);
  if (m === 1 && d === 1) return '元旦';
  if (m === 2 && d === 14) return '情人节';
  if (m === 3 && d === 14) return '白色情人节';
  if (m === 9 && d >= 15 && d <= 17) return '中秋/秋夕';
  if (m === 10 && d >= 28 && d <= 31) return '万圣节';
  if (m === 11 && d === 11) return 'Pepero Day·光棍节';
  if (m === 12 && d === 25) return '圣诞节';
  if (m === 12 && d === 31) return '跨年夜';
  return null;
}

// ── SVT 队友生日信息（今日寿星 + 13人完整参考表） ──
import { SVT_TEAMMATE_PROFILES } from './pools/svt-teammate-profiles.js';
export function svtBirthdayInfo(dayCount) {
  var m = gameMonthOf(dayCount);
  var d = gameDayOf(dayCount);
  var todayList = [];
  var refList = [];
  for (var i = 0; i < SVT_TEAMMATE_PROFILES.length; i++) {
    var p = SVT_TEAMMATE_PROFILES[i];
    if (p.birthMonth === m && p.birthDay === d) {
      todayList.push(p.name + '(' + p.birthMonth + '月' + p.birthDay + '日)');
    }
    refList.push(p.name + ' ' + p.birthMonth + '/' + p.birthDay);
  }
  var result = todayList.length ? '今天过生日的SEVENTEEN成员：' + todayList.join('、') + ' | ' : '今天无SEVENTEEN成员过生日 | ';
  result += '参考表：' + refList.join(' | ');
  return result;
}

// ── A区：硬事实块（代码100%预计算） ──
export function buildHardFactsBlock(E, extra) {
  if (!E) return '';
  extra = extra || {};
  var dayCount = E.cycle && E.cycle.dayCount || 1;
  var isDebut = E.career && E.career.debutDay > 0;
  var weather = extra.weather || GS.weather || '晴';
  var season = gameSeasonOf(dayCount);
  var seasonCN = { winter:'冬', spring:'春', summer:'夏', autumn:'秋' }[season] || '';
  var tempFeel = season === 'winter' ? '偏冷' : season === 'summer' ? '炎热' : season === 'spring' ? '微凉' : '凉爽';
  var timeLabel = extra.timeLabel || '上午';

  // A1
  var dateFmt = isDebut ? formatGameDate(dayCount) : formatTraineeDate(dayCount);
  var a1 = dateFmt + ' · ' + seasonCN + '季 · ' + weather + ' · 体感' + tempFeel + ' · ' + timeLabel;

  // A2
  var bday = birthdayInfo(dayCount, E);
  var holiday = todayHoliday(dayCount);
  var a2 = (bday ? bday.label : '无人过生日') + ' · ' + (holiday ? '节日：' + holiday : '无节日');

  // A3
  var ag = E.agenda || {};
  var a3 = '上午：' + (ag.main || '训练') + (ag.mainLoc ? '(' + ag.mainLoc + ')' : '');
  a3 += ' | 下午：' + (ag.related || '训练') + (ag.relatedLoc ? '(' + ag.relatedLoc + ')' : '');
  a3 += ' | 晚上：自由';
  a3 += ' | ' + (isDebut ? '已出道' + (E.chapter ? '·' + E.chapter.name : '') : '练习生·未出道');

  // A4
  var aff = E.affection || 0;
  var stage = GS.oneHeartRomanceStage || 0;
  var stageLabel = stage === 0 ? '初遇·观察模式' : stage === 1 ? '暧昧期' : stage === 2 ? '明确期' : '深度期';
  var broSup = (E.brother && E.brother.support) || 0;
  var rivalAff = 0;
  var rivalNode = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor'];
  if (rivalNode && typeof rivalNode.intimacy === 'number') rivalAff = rivalNode.intimacy;
  var a4 = '好感' + aff + ' · ' + stageLabel + ' · 哥哥支持' + broSup;
  a4 += rivalAff > 0 ? ' · 情敌亲密度' + rivalAff : ' · 情敌未出场';
  if (GS._coldWarActive) a4 += ' · ⚠️冷战';

  // A5
  var broName = (E.brother && E.brother.name) || '哥哥';
  var broLoc = E._brotherLoc || '练习室';
  var mlName = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '他';
  var a5 = '哥哥' + broName + '(' + broLoc + ')';
  a5 += stage === 0 ? ' · 男主仅在背景出现' : ' · 男主' + mlName + '可见';

  // A6
  var a6 = '';
  if (stage === 0) a6 = '允许：观察/群聊/哥哥互动 · 禁止：男主主动/二人独处/专属暗示/写歌';
  else if (stage === 1) a6 = '允许：男主主动接触/群聊 · 禁止：接吻/公开表白/过度亲密';
  else a6 = '允许：私下约会/肢体接触 · 禁止：公开场合过度亲密';

  return '【硬事实】\n'
    + 'A1 ' + a1 + '\n'
    + 'A2 ' + a2 + '\n'
    + (extra.showSvtBday ? 'A2b ' + extra.svtBdayText + '\n' : '')
    + 'A3 ' + a3 + '\n'
    + 'A4 ' + a4 + '\n'
    + 'A5 ' + a5 + '\n'
    + 'A6 ' + a6 + '\n';
}

// ── B区：软调味块（池子随机抽取） ──
export function buildSoftFlavorBlock(E, extra) {
  if (!E) return '';
  extra = extra || {};
  var parts = [];
  var buffer = [];

  // B1 日历氛围（仅首回合注入，防同天重复）
  if (extra.isFirstRound && extra.atmoText) {
    buffer.push('B1 氛围 ' + extra.atmoText);
  }

  // B2 今日心情
  if (extra.moodText) {
    buffer.push('B2 心情 ' + extra.moodText);
  }

  // B3 日常插曲
  if (extra.detailText) {
    buffer.push('B3 插曲 ' + extra.detailText);
  }

  // B4 手机角落
  var phoneText = extra.phoneCorner || '手机安静，暂无新消息';
  buffer.push('B4 手机 ' + phoneText);

  // B5 五类记忆
  if (extra.memoryByType) {
    buffer.push('B5 ' + extra.memoryByType);
  }

  if (!buffer.length) return '';
  return '【今日调味·可自然融入剧情】\n' + buffer.join('\n') + '\n';
}

// ── 五类近期记忆（按事业/感情/哥哥/情敌/其他分组） ──
export function buildMemoryByType(E) {
  if (!E) return '';
  var history = E.career && E.career._careerHistory ? E.career._careerHistory : (GS.entSim && GS.entSim.careerHistory) || [];
  var categories = { career: [], romance: [], brother: [], rival: [], other: [] };
  for (var i = history.length - 1; i >= 0; i--) {
    var h = history[i];
    var type = h.type || 'other';
    if (!categories[type]) type = 'other';
    if (categories[type].length < 2) categories[type].push(h.text || '');
  }
  // 附数值
  var pop = (E.career && E.career.popularity) || 0;
  var aff = E.affection || 0;
  var broSup = (E.brother && E.brother.support) || 0;
  var rivalAff = 0;
  var rvNode = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor'];
  if (rvNode && typeof rvNode.intimacy === 'number') rivalAff = rvNode.intimacy;

  var lines = [];
  if (categories.romance.length) lines.push('感情(好感' + aff + ')：' + categories.romance.join('；'));
  else lines.push('感情(好感' + aff + ')：暂无近期记忆');
  if (categories.career.length) lines.push('事业(人气' + pop + ')：' + categories.career.join('；'));
  else lines.push('事业(人气' + pop + ')：暂无近期记忆');
  if (categories.brother.length) lines.push('哥哥(支持' + broSup + ')：' + categories.brother.join('；'));
  else lines.push('哥哥(支持' + broSup + ')：暂无近期记忆');
  if (categories.rival.length) lines.push('情敌(亲密度' + rivalAff + ')：' + categories.rival.join('；'));
  else lines.push('情敌(亲密度' + rivalAff + ')：暂无近期记忆');
  if (categories.other.length) lines.push('其他：' + categories.other.join('；'));

  return '近期记忆·分类 | ' + lines.join(' | ');
}

function stageNameOf(idx) {
  return (CYCLE_STAGE_META[idx] && CYCLE_STAGE_META[idx].key) || '新人期';
}

// 每轮后重新派生资源等级（在播作品数 ×2）
function recomputeResourcesLevel() {
  var n = onAirWorkCount();
  var lv = n >= 4 ? '顶流' : (n >= 2 ? '当红' : (n >= 1 ? '上升' : '新人'));
  if (GS.entSim) GS.entSim.career.resourcesLevel = lv;
  return lv;
}

// 人气增减（夹紧 0-100），并同步重算事业等级（人气崩则降级）
// reason 非空时写 careerHistory（Bug 9：人气变动可见）
export function addPopularity(delta, reason) {
  if (!GS.entSim) return 0;
  // 练习生期：未出道=无人气概念，累积人气被屏蔽
  if (GS.entSim.career && GS.entSim.career.debutDay === 0) return 0;
  var p = (GS.entSim.career.popularity || 0) + (delta || 0);
  p = Math.max(0, Math.min(100, p));
  GS.entSim.career.popularity = p;
  recomputeCareerLevel();
  if (reason) {
    GS.entSim.careerHistory.push({ round: GS.entSim.cycle.roundTotal, day: GS.entSim.cycle.dayCount, type: 'popularity', text: reason + ' ' + (delta >= 0 ? '+' : '') + delta });
  }
  // 人气飘字：页面有 es-pop 元素时浮动显示 +N/-N
  if (typeof delta === 'number' && delta !== 0 && typeof document !== 'undefined') {
    spawnPopFloat(delta);
  }
  saveGame();
  return p;
}

// 人气飘字：从人气数字上方漂浮 +N/-N（复用 affFloat 动画）
function spawnPopFloat(delta) {
  try {
    var el = document.querySelector('.es-pop b');
    if (!el) return;
    var rect = el.getBoundingClientRect();
    if (!rect) return;
    var span = document.createElement('span');
    span.className = 'es-pop-float';
    span.style.left = rect.right + 'px';
    span.style.top = rect.top + 'px';
    span.style.color = delta >= 0 ? '#52c41a' : '#ff4d4f';
    span.textContent = (delta >= 0 ? '+' : '') + delta;
    document.body.appendChild(span);
    setTimeout(function() { if (span.parentNode) span.parentNode.removeChild(span); }, 1300);
  } catch(e) { /* 静默失败，不阻塞主流程 */ }
}

// 事业等级由人气阈值派生（弥补初始化后不再重算的缺口）
export function recomputeCareerLevel() {
  if (!GS.entSim) return;
  GS.entSim.career.careerLevel = careerLevelOf(GS.entSim.career.popularity);
}

// P1 #22: 存档槽系统
var SAVE_KEY_PREFIX = 'svt_entsim_slot_';
export function saveEntSimGame(slot) {
  slot = slot || 0;
  var data = JSON.stringify({
    day: GS.entSim.cycle.dayCount,
    member: GS.oneHeartMember || '',
    aff: GS.entSim.affection || 0,
    pop: GS.entSim.career.popularity || 0,
    timestamp: Date.now(),
    state: GS.entSim
  });
  try { localStorage.setItem(SAVE_KEY_PREFIX + slot, data); } catch(e) {}
}
export function loadEntSimGame(slot) {
  slot = slot || 0;
  var raw = localStorage.getItem(SAVE_KEY_PREFIX + slot);
  if (!raw) { showToast('槽位' + (slot+1) + '为空'); return; }
  var data;
  try { data = JSON.parse(raw); } catch(e) { showToast('存档损坏'); return; }
  if (!data || !data.state) { showToast('存档数据不完整'); return; }
  // 恢复 entSim 状态
  Object.assign(GS.entSim, data.state);
  // 恢复关键引用
  if (!GS.entSim.careerHistory) GS.entSim.careerHistory = [];
  if (!GS.entSim._affectionLog) GS.entSim._affectionLog = [];
  saveGame();
  showToast('📂 已加载槽位' + (slot+1) + ' · Day ' + (data.day||'?') + ' · ❤' + (data.aff||0));
  if (typeof renderPopups === 'function') renderPopups();
}
export function listSaves() {
  var result = [];
  for (var i = 0; i < 3; i++) {
    var raw = localStorage.getItem(SAVE_KEY_PREFIX + i);
    if (raw) {
      try {
        var d = JSON.parse(raw);
        result.push({ slot: i, day: d.day, member: d.member, aff: d.aff, timestamp: d.timestamp });
      } catch(e) { result.push(null); }
    } else {
      result.push(null);
    }
  }
  return result;
}
