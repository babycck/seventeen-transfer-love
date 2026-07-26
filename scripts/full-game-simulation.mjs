// ============================================================
// 完整游戏模拟：105池子全链路消费 + 非最优玩家路线
// 模拟真实游玩，不限轮数，跑完为止
// ============================================================

import * as allPools from '../src/ent-sim/pools/index.js';

// ── canTrigger（从 _utils.js 完整复制） ──
function canTrigger(entry, E) {
  if (!entry) return false;
  var req = entry.require || '';
  if (!req) return true;
  var conditions = req.split('&&');
  for (var ci = 0; ci < conditions.length; ci++) {
    var cond = conditions[ci].trim();
    if (!cond) continue;
    if (cond.startsWith('aff>=')) {
      if ((E.affection || 0) < parseInt(cond.slice(4), 10)) return false;
    } else if (cond === 'debut') {
      if (!E._isDebut) return false;
    } else if (cond === 'trainee') {
      if (E._isDebut) return false;
    } else if (cond.startsWith('season=')) {
      if ((E.season || '') !== cond.slice(7)) return false;
    } else if (cond.startsWith('birthday=')) {
      if ((E._birthdayCheck || '') !== cond.slice(9)) return false;
    } else if (cond.startsWith('month=')) {
      if ((E._month || 0) !== parseInt(cond.slice(6), 10)) return false;
    } else if (cond.startsWith('traineePhase=')) {
      if ((E._traineePhase || 0) !== parseInt(cond.slice(13), 10)) return false;
    } else if (cond.startsWith('romance>=')) {
      if ((E._romanceStage || 0) < parseInt(cond.slice(8), 10)) return false;
    } else if (cond.startsWith('chapter>=')) {
      if ((E.chapter || 1) < parseInt(cond.slice(8), 10)) return false;
    }
  }
  return true;
}

// ── 辅助：从数组随机取N条（不重复） ──
function pickRandom(items, n) {
  if (!items || !items.length) return [];
  var arr = items.slice();
  var result = [];
  n = Math.min(n, arr.length);
  for (var i = 0; i < n; i++) {
    var idx = Math.floor(Math.random() * arr.length);
    result.push(arr.splice(idx, 1)[0]);
  }
  return result;
}

// ── 辅助：从带条件的池子中筛出可用条目（跳过已用） ──
function filterPool(pool, E, usedSet, fallbackToPool) {
  if (!pool || !pool.length) return [];
  var available = [];
  for (var i = 0; i < pool.length; i++) {
    if (!canTrigger(pool[i], E)) continue;
    if (usedSet && usedSet.has(pool[i].text)) continue;
    available.push(pool[i]);
  }
  // 兜底：条件全过滤 → 用全池（仍跳过已用）
  if (!available.length && fallbackToPool) {
    for (var i2 = 0; i2 < pool.length; i2++) {
      if (!usedSet || !usedSet.has(pool[i2].text)) available.push(pool[i2]);
    }
  }
  return available;
}

// ── 章节数据 ──
var CHAPTER_TIME_SKIP = { 2: 30, 3: 45, 4: 60, 5: 75, 6: 90 };
function chapterByPopularity(pop) {
  if (pop >= 90) return 6;
  if (pop >= 75) return 5;
  if (pop >= 55) return 4;
  if (pop >= 35) return 3;
  if (pop >= 15) return 2;
  return 1;
}

// ── 池子使用追踪 ──
function makePoolTracker(name, total) {
  return { name: name, total: total, consumed: 0, reused: 0, usedSet: new Set(), exhaustedAt: -1 };
}

function consumeFromTracker(tracker, entries, roundNum) {
  if (!entries.length) return 0;
  var consumed = 0;
  for (var i = 0; i < entries.length; i++) {
    var text = entries[i].text || entries[i];
    if (tracker.usedSet.has(text)) {
      tracker.reused++;
    } else {
      tracker.usedSet.add(text);
      tracker.consumed++;
    }
    consumed++;
  }
  if (tracker.consumed >= tracker.total && tracker.exhaustedAt < 0) {
    tracker.exhaustedAt = roundNum;
  }
  return consumed;
}

// ============================================================
// 主模拟
// ============================================================
var SEED = Date.now() % 1000;
var E = null;
var trackers = {};
var TOTAL_CONSUMED = 0;
var TOTAL_REUSED = 0;

function initState() {
  E = {
    affection: 0,
    popularity: 0,
    exposure: 0,
    chapter: 1,
    _isDebut: false,
    _debutDay: 0,
    _traineeDayCount: 0,    // 独立练习天数（从0开始，每游戏天+1）
    _gameDayCount: 0,     // 独立游戏天（不受章节跳跃影响，用于冷却计算）
    dayCount: 1,           // 日历时间戳（季节/节日/显示用）
    slotInDay: 0,
    roundNum: 0,
    career: { debutDay: 0, popularity: 0, traineePhase: 1 },
    _month: 6 + (SEED % 6), // 6-11月
    season: ['春', '夏', '秋', '冬'][SEED % 4],
    _birthdayCheck: '', // 模拟中不触发生日
    _romanceStage: 0,
    // 冷却计数器
    _lastContactDay: 0,
    _lastFanLetterDay: 0,
    _lastBrandOfferDay: 0,
    _lastAwardDay: 0,
    _lastVarietyDay: 0,
    _lastDispatchDay: 0,
    _lastMagazineDay: 0,
    _lastRumorDay: 0,
    _lastSasaengDay: 0,
    _lastFansignDay: 0,
    _lastConcertDay: 0,
    _lastComebackDay: 0,
    _lastMusicShowDay: 0,
    _lastSetbackDay: 0,
    _lastReleaseDay: 0,
    // 聊天索引
    _chatBrotherIdx: 0,
    _chatRivalIdx: 0,
    _chatManagerIdx: 0,
    _chatGroupIdx: 0,
    _chatSasaengIdx: 0,
    _pushChatDayCounter: 0,
  };
  TOTAL_CONSUMED = 0;
  TOTAL_REUSED = 0;
}

// ── 注册所有池子 ──
function registerPool(name, arr) {
  if (!arr || !arr.length) { trackers[name] = makePoolTracker(name, 0); return; }
  trackers[name] = makePoolTracker(name, arr.length);
}

function registerAllPools() {
  trackers = {};
  // 世界设定（一次性消耗）
  registerPool('GROUP_NAMES', allPools.GROUP_NAMES);
  registerPool('COMPANY_NAMES', allPools.COMPANY_NAMES);
  registerPool('GROUP_CONCEPTS', allPools.GROUP_CONCEPTS);
  registerPool('HIT_SONGS', allPools.HIT_SONGS);
  registerPool('TEAMMATE_NAMES', allPools.TEAMMATE_NAMES);
  registerPool('SISTER_ROLES', allPools.SISTER_ROLES);
  registerPool('SVT_TEAMMATE_PROFILES', allPools.SVT_TEAMMATE_PROFILES);
  registerPool('SVT_TEAMMATE_EVENT_POOL', allPools.SVT_TEAMMATE_EVENT_POOL);
  registerPool('TEAMMATE_FLAVOR', allPools.TEAMMATE_FLAVOR);
  registerPool('MEMBER_SCOUPS', allPools.MEMBER_SCOUPS);
  registerPool('MEMBER_JEONGHAN', allPools.MEMBER_JEONGHAN);
  registerPool('MEMBER_JOSHUA', allPools.MEMBER_JOSHUA);
  registerPool('MEMBER_JUN', allPools.MEMBER_JUN);
  registerPool('MEMBER_HOSHI', allPools.MEMBER_HOSHI);
  registerPool('MEMBER_WONWOO', allPools.MEMBER_WONWOO);
  registerPool('MEMBER_WOOZI', allPools.MEMBER_WOOZI);
  registerPool('MEMBER_DK', allPools.MEMBER_DK);
  registerPool('MEMBER_MINGYU', allPools.MEMBER_MINGYU);
  registerPool('MEMBER_THE8', allPools.MEMBER_THE8);
  registerPool('MEMBER_SEUNGKWAN', allPools.MEMBER_SEUNGKWAN);
  registerPool('MEMBER_VERNON', allPools.MEMBER_VERNON);
  registerPool('MEMBER_DINO', allPools.MEMBER_DINO);
  // 练习生
  registerPool('TRAINEE_EARLY_POOL', allPools.TRAINEE_EARLY_POOL);
  registerPool('TRAINEE_MID_POOL', allPools.TRAINEE_MID_POOL);
  registerPool('TRAINEE_LATE_POOL', allPools.TRAINEE_LATE_POOL);
  registerPool('TRAINEE_EVENTS', allPools.TRAINEE_EVENTS);
  registerPool('TRAINEE_CHAT', allPools.TRAINEE_CHAT);
  // 章节日程
  registerPool('COMMON_POOL', allPools.COMMON_POOL);
  registerPool('RELATED_POOL', allPools.RELATED_POOL);
  registerPool('TRAINEE_POOL', allPools.TRAINEE_POOL);
  registerPool('CHAPTER1_NOVICE', allPools.CHAPTER1_NOVICE);
  registerPool('CHAPTER2_SPROUTING', allPools.CHAPTER2_SPROUTING);
  registerPool('CHAPTER2_RISING', allPools.CHAPTER2_RISING);
  registerPool('CHAPTER3_PEAK', allPools.CHAPTER3_PEAK);
  registerPool('CHAPTER4_LEGEND', allPools.CHAPTER4_LEGEND);
  registerPool('CHAPTER5_TOPSTAR', allPools.CHAPTER5_TOPSTAR);
  registerPool('BOYGROUP_POOL', allPools.BOYGROUP_POOL);
  // 聊天系统
  registerPool('CHAT_MALE_LEAD', allPools.CHAT_MALE_LEAD);
  registerPool('CHAT_BROTHER', allPools.CHAT_BROTHER);
  registerPool('CHAT_RIVAL', allPools.CHAT_RIVAL);
  registerPool('CHAT_MANAGER', allPools.CHAT_MANAGER);
  registerPool('GROUP_CHAT', allPools.GROUP_CHAT);
  registerPool('CHAT_SASAENG', allPools.CHAT_SASAENG);
  // 男主/感情线
  registerPool('MALE_LEAD_INITIATIVE_POOL', allPools.MALE_LEAD_INITIATIVE_POOL);
  registerPool('CONTACT_TYPE_POOL', allPools.CONTACT_TYPE_POOL);
  registerPool('CONTACT_PROGRESSION', allPools.CONTACT_PROGRESSION);
  registerPool('JEALOUSY_EVENTS_POOL', allPools.JEALOUSY_EVENTS_POOL);
  registerPool('RUMOR_POOL', allPools.RUMOR_POOL);
  registerPool('ONEHEART_RANDOM_EVENTS', allPools.ONEHEART_RANDOM_EVENTS);
  // 哥哥线
  registerPool('BROTHER_EVENT_POOL', allPools.BROTHER_EVENT_POOL);
  registerPool('BROTHER_SIDE_PLOTS', allPools.BROTHER_SIDE_PLOTS);
  registerPool('BROTHER_ADVANCE_TESTS', allPools.BROTHER_ADVANCE_TESTS);
  // 情敌/秘密
  registerPool('RIVAL_ADVANCE_EVENTS', allPools.RIVAL_ADVANCE_EVENTS);
  registerPool('SECRET_DISCOVERY_EVENTS', allPools.SECRET_DISCOVERY_EVENTS);
  registerPool('INDUSTRY_EVENTS', allPools.INDUSTRY_EVENTS);
  registerPool('SPECIAL_EVENTS', allPools.SPECIAL_EVENTS);
  // 事业/女团
  registerPool('CAREER_SETBACKS', allPools.CAREER_SETBACKS);
  registerPool('GIRLGROUP_EVENTS', allPools.GIRLGROUP_EVENTS);
  registerPool('INCIDENT_EVENTS_POOL', allPools.INCIDENT_EVENTS_POOL);
  registerPool('DAILY_ENGAGEMENT_POOL', allPools.DAILY_ENGAGEMENT_POOL);
  // 媒体/舆论
  registerPool('DAILY_BUZZ', allPools.DAILY_BUZZ);
  registerPool('DAILY_BUZZ_TEMPLATES', allPools.DAILY_BUZZ_TEMPLATES);
  registerPool('HOT_SEARCH_REPLY_POOL', allPools.HOT_SEARCH_REPLY_POOL);
  registerPool('DISPATCH_POOL', allPools.DISPATCH_POOL);
  registerPool('EXTERNAL_HOT', allPools.EXTERNAL_HOT);
  registerPool('NEWS_TEMPLATES', allPools.NEWS_TEMPLATES);
  // 作品/品牌/奖项
  registerPool('RELEASE_POOL', allPools.RELEASE_POOL);
  registerPool('BRAND_OFFER_POOL', allPools.BRAND_OFFER_POOL);
  registerPool('AWARD_POOL', allPools.AWARD_POOL);
  registerPool('CHART_POOL', allPools.CHART_POOL);
  // 打歌/演唱会/签售/回归/杂志
  registerPool('MUSIC_SHOW_POOL', allPools.MUSIC_SHOW_POOL);
  registerPool('CONCERT_POOL', allPools.CONCERT_POOL);
  registerPool('FANSIGN_POOL', allPools.FANSIGN_POOL);
  registerPool('COMEBACK_CYCLE_POOL', allPools.COMEBACK_CYCLE_POOL);
  registerPool('MAGAZINE_POOL', allPools.MAGAZINE_POOL);
  // 综艺/粉丝/日记
  registerPool('VARIETY_SHOW_POOL', allPools.VARIETY_SHOW_POOL);
  registerPool('FAN_LETTER_POOL', allPools.FAN_LETTER_POOL);
  registerPool('DIARY_TEMPLATES', allPools.DIARY_TEMPLATES);
  // 日历+通告
  registerPool('CALENDAR_EVENTS', allPools.CALENDAR_EVENTS);
  registerPool('JOB_OFFER_POOL', allPools.JOB_OFFER_POOL);
  // 恋爱场景
  registerPool('ROMANCE_BACKSTAGE', allPools.ROMANCE_BACKSTAGE);
  registerPool('ROMANCE_LATENIGHT', allPools.ROMANCE_LATENIGHT);
  registerPool('ROMANCE_PUBLIC', allPools.ROMANCE_PUBLIC);
  registerPool('ROMANCE_CRISIS', allPools.ROMANCE_CRISIS);
  registerPool('ROMANCE_JEALOUSY_POOL', allPools.ROMANCE_JEALOUSY_POOL);
  registerPool('ROMANCE_CONFESSION', allPools.ROMANCE_CONFESSION);
  // 地下恋
  registerPool('SECRET_COMMS', allPools.SECRET_COMMS);
  registerPool('SECRET_NEARMISS', allPools.SECRET_NEARMISS);
  registerPool('SECRET_FAN_CLUES', allPools.SECRET_FAN_CLUES);
  registerPool('SECRET_COMPANY', allPools.SECRET_COMPANY);
  // 氛围情绪
  registerPool('ATMOSPHERE_WEATHER', allPools.ATMOSPHERE_WEATHER);
  registerPool('ATMOSPHERE_MOOD', allPools.ATMOSPHERE_MOOD);
  registerPool('ATMOSPHERE_HIS_STATE', allPools.ATMOSPHERE_HIS_STATE);
  // 里程碑
  registerPool('MILESTONE_DEBUT', allPools.MILESTONE_DEBUT);
  registerPool('MILESTONE_FIRST_WIN', allPools.MILESTONE_FIRST_WIN);
  registerPool('MILESTONE_AWARDS', allPools.MILESTONE_AWARDS);
  // 偶遇
  registerPool('ENCOUNTER_ML', allPools.ENCOUNTER_ML);
  registerPool('ENCOUNTER_RIVAL', allPools.ENCOUNTER_RIVAL);
  registerPool('ENCOUNTER_BROTHER', allPools.ENCOUNTER_BROTHER);
  registerPool('ENCOUNTER_OTHERS', allPools.ENCOUNTER_OTHERS);
  // 剧情节奏
  registerPool('DRAMA_ALMOST', allPools.DRAMA_ALMOST);
  registerPool('DRAMA_MISUNDERSTAND', allPools.DRAMA_MISUNDERSTAND);
  registerPool('DRAMA_COLDWAR', allPools.DRAMA_COLDWAR);
  registerPool('DRAMA_DATING_RUMOR', allPools.DRAMA_DATING_RUMOR);
  registerPool('DRAMA_DILEMMA', allPools.DRAMA_DILEMMA);
  // 其他
  registerPool('ENT_SCHEDULE_POOL', allPools.ENT_SCHEDULE_POOL);
  registerPool('EXTERNAL_HOT_ARR', Array.isArray(allPools.EXTERNAL_HOT) ? allPools.EXTERNAL_HOT : []);
  // 新增池子（8个）
  registerPool('CHEER_CULTURE_POOL', allPools.CHEER_CULTURE_POOL);
  registerPool('SASAENG_ESCALATION_POOL', allPools.SASAENG_ESCALATION_POOL);
  registerPool('HEALTH_INJURY_POOL', allPools.HEALTH_INJURY_POOL);
  registerPool('TEAMMATE_BOND_POOL', allPools.TEAMMATE_BOND_POOL);
  registerPool('TOXIC_FAN_WAR_POOL', allPools.TOXIC_FAN_WAR_POOL);
  registerPool('DATING_SCANDAL_CHAIN', allPools.DATING_SCANDAL_CHAIN);
  registerPool('HIATUS_ANXIETY_POOL', allPools.HIATUS_ANXIETY_POOL);
  registerPool('VARIETY_MOMENT_POOL', allPools.VARIETY_MOMENT_POOL);
  registerPool('JOB_GRADE_POOL', allPools.JOB_GRADE_POOL);
  registerPool('YEAR_END_REVIEW_POOL', allPools.YEAR_END_REVIEW_POOL);
  registerPool('MV_FILMING_POOL', allPools.MV_FILMING_POOL);
  registerPool('PRESS_INTERVIEW_POOL', allPools.PRESS_INTERVIEW_POOL);
  registerPool('HIDDEN_ROUTE_POOL', allPools.HIDDEN_ROUTE_POOL);
}

// ============================================================
// 消费者函数：模拟每个游戏系统的池子消费
// ============================================================

// 1. 初始化一次性消费
function consumeInit() {
  var pools = ['GROUP_NAMES', 'COMPANY_NAMES', 'GROUP_CONCEPTS', 'HIT_SONGS',
    'SISTER_ROLES', 'SVT_TEAMMATE_PROFILES', 'TEAMMATE_FLAVOR'];
  // 成员12个
  var members = ['MEMBER_SCOUPS', 'MEMBER_JEONGHAN', 'MEMBER_JOSHUA', 'MEMBER_JUN',
    'MEMBER_HOSHI', 'MEMBER_WONWOO', 'MEMBER_WOOZI', 'MEMBER_DK',
    'MEMBER_MINGYU', 'MEMBER_THE8', 'MEMBER_SEUNGKWAN', 'MEMBER_VERNON', 'MEMBER_DINO'];
  pools = pools.concat(members);
  // TEAMMATE_NAMES
  pools.push('TEAMMATE_NAMES');

  pools.forEach(function(name) {
    var t = trackers[name];
    if (t && t.total > 0) {
      t.consumed = Math.min(t.total, 3); // 初始化各取少量
      t.usedSet = new Set(); // 简化：标记 3 条
    }
  });
}

// 2. 每天日程生成（cycle.js rollDailyAgenda）
function consumeDailySchedule() {
  if (!E._isDebut) {
    // 练习生阶段
    var phasePools = { 1: 'TRAINEE_EARLY_POOL', 2: 'TRAINEE_MID_POOL', 3: 'TRAINEE_LATE_POOL' };
    var activePool = phasePools[E._traineePhase] || 'TRAINEE_EARLY_POOL';
    var pool = allPools[activePool];
    if (pool && pool.length) {
      _consumeEntry(activePool, pool, E.roundNum);
    }
    // 兜底
    if (allPools.TRAINEE_POOL && allPools.TRAINEE_POOL.length) {
      _consumeEntry('TRAINEE_POOL', allPools.TRAINEE_POOL, E.roundNum);
    }
  } else {
    // 出道后：章节池 + 通用池
    var chPools = { 1: 'CHAPTER1_NOVICE', 2: 'CHAPTER2_SPROUTING', 3: 'CHAPTER2_RISING', 4: 'CHAPTER3_PEAK', 5: 'CHAPTER5_TOPSTAR', 6: 'CHAPTER4_LEGEND' };
    var chPoolName = chPools[E.chapter] || 'CHAPTER1_NOVICE';
    if (Math.random() < 0.7) {
      _consumeEntry(chPoolName, allPools[chPoolName], E.roundNum);
    } else {
      _consumeEntry('COMMON_POOL', allPools.COMMON_POOL, E.roundNum);
    }
    // 关联事件+情敌行程+男主行程+哥哥行程（每天各1条）
    _consumeEntry('RELATED_POOL', allPools.RELATED_POOL, E.roundNum);
    _consumeEntry('BOYGROUP_POOL', allPools.BOYGROUP_POOL, E.roundNum);
    if (allPools.BOYGROUP_POOL) { _consumeEntry('BOYGROUP_POOL', allPools.BOYGROUP_POOL, E.roundNum); } // 男主
    if (allPools.BOYGROUP_POOL) { _consumeEntry('BOYGROUP_POOL', allPools.BOYGROUP_POOL, E.roundNum); } // 哥哥
  }
}

function _consumeEntry(poolName, pool, roundNum) {
  var tracker = trackers[poolName];
  if (!tracker || !pool || !pool.length) return;
  var available = filterPool(pool, E, tracker.usedSet, true);
  if (!available.length) {
    // 池子耗尽 → 从全池复用（重复计数）
    if (tracker.exhaustedAt < 0) tracker.exhaustedAt = roundNum;
    if (!pool.length) return;
    var entry = pool[Math.floor(Math.random() * pool.length)];
    consumeFromTracker(tracker, [entry], roundNum);
    return;
  }
  var picked = pickRandom(available, 1);
  consumeFromTracker(tracker, picked, roundNum);
}

// 3. 每天 engine 弹窗事件 — 冷却基于独立_gameDayCount（不受章节跳跃影响）
function consumeEngineDaily() {
  var gd = E._gameDayCount;
  var isDebut = E._isDebut;

  // CONTACT_TYPE_POOL — 每2天
  if (gd - E._lastContactDay >= 2) {
    E._lastContactDay = gd;
    var prob = E.affection >= 60 ? 0.5 : 0.25;
    if (Math.random() < prob && allPools.CONTACT_TYPE_POOL) {
      _consumeEntry('CONTACT_TYPE_POOL', allPools.CONTACT_TYPE_POOL, E.roundNum);
    }
  }
  // FAN_LETTER_POOL — 每天
  if (gd > E._lastFanLetterDay && allPools.FAN_LETTER_POOL) {
    E._lastFanLetterDay = gd;
    _consumeEntry('FAN_LETTER_POOL', allPools.FAN_LETTER_POOL, E.roundNum);
  }
  // BRAND_OFFER_POOL — 每2天，人气>=20
  if (isDebut && E.popularity >= 20 && gd - E._lastBrandOfferDay >= 2) {
    E._lastBrandOfferDay = gd;
    if (Math.random() < 0.5 && allPools.BRAND_OFFER_POOL) _consumeEntry('BRAND_OFFER_POOL', allPools.BRAND_OFFER_POOL, E.roundNum);
  }
  // JOB_OFFER_POOL — 每3天，人气>=15，30%概率
  if (isDebut && E.popularity >= 15 && gd - (E._lastJobOfferDay || 0) >= 3) {
    E._lastJobOfferDay = gd;
    if (Math.random() < 0.3 && allPools.JOB_OFFER_POOL) _consumeEntry('JOB_OFFER_POOL', allPools.JOB_OFFER_POOL, E.roundNum);
  }
  // AWARD_POOL — 每4天，gd>=8
  if (isDebut && gd >= 8 && gd - E._lastAwardDay >= 4) {
    E._lastAwardDay = gd;
    if (Math.random() < 0.5 && allPools.AWARD_POOL) _consumeEntry('AWARD_POOL', allPools.AWARD_POOL, E.roundNum);
  }
  // VARIETY_SHOW_POOL — 每2天，人气>=25
  if (isDebut && E.popularity >= 25 && gd - E._lastVarietyDay >= 2) {
    E._lastVarietyDay = gd;
    if (Math.random() < 0.5 && allPools.VARIETY_SHOW_POOL) _consumeEntry('VARIETY_SHOW_POOL', allPools.VARIETY_SHOW_POOL, E.roundNum);
  }
  // DISPATCH_POOL — 每3天，曝光>=30
  if (isDebut && E.exposure >= 30 && gd - E._lastDispatchDay >= 3) {
    E._lastDispatchDay = gd;
    if (Math.random() < 0.4 && allPools.DISPATCH_POOL) _consumeEntry('DISPATCH_POOL', allPools.DISPATCH_POOL, E.roundNum);
  }
  // MAGAZINE_POOL — 每3天，人气>=40
  if (isDebut && E.popularity >= 40 && gd - E._lastMagazineDay >= 3) {
    E._lastMagazineDay = gd;
    if (Math.random() < 0.4 && allPools.MAGAZINE_POOL) _consumeEntry('MAGAZINE_POOL', allPools.MAGAZINE_POOL, E.roundNum);
  }
  // RUMOR_POOL — 每3天，好感>=30+曝光>=20（门槛降低）
  if (isDebut && E.affection >= 30 && E.exposure >= 20 && gd - E._lastRumorDay >= 3) {
    E._lastRumorDay = gd;
    if (Math.random() < 0.4 && allPools.RUMOR_POOL) _consumeEntry('RUMOR_POOL', allPools.RUMOR_POOL, E.roundNum);
  }
  // CHAT_SASAENG — 每5天，人气>=25，8%概率
  if (isDebut && E.popularity >= 25 && gd - E._lastSasaengDay >= 5) {
    E._lastSasaengDay = gd;
    if (Math.random() < 0.08) _consumeEntry('CHAT_SASAENG', allPools.CHAT_SASAENG, E.roundNum);
  }
  // FANSIGN_POOL — 每4天，人气>=15
  if (isDebut && E.popularity >= 15 && gd - E._lastFansignDay >= 4) {
    E._lastFansignDay = gd;
    if (Math.random() < 0.45 && allPools.FANSIGN_POOL) _consumeEntry('FANSIGN_POOL', allPools.FANSIGN_POOL, E.roundNum);
  }
  // CONCERT_POOL — 每4天，人气>=35（门槛降低）
  if (isDebut && E.popularity >= 35 && gd - E._lastConcertDay >= 4) {
    E._lastConcertDay = gd;
    if (Math.random() < 0.4 && allPools.CONCERT_POOL) _consumeEntry('CONCERT_POOL', allPools.CONCERT_POOL, E.roundNum);
  }
  // COMEBACK_CYCLE_POOL — 每5天，人气>=35
  if (isDebut && E.popularity >= 35 && gd - E._lastComebackDay >= 5) {
    E._lastComebackDay = gd;
    if (Math.random() < 0.35 && allPools.COMEBACK_CYCLE_POOL) _consumeEntry('COMEBACK_CYCLE_POOL', allPools.COMEBACK_CYCLE_POOL, E.roundNum);
  }
  // MUSIC_SHOW_POOL — 每3天，人气>=20
  if (isDebut && E.popularity >= 20 && gd - E._lastMusicShowDay >= 3) {
    E._lastMusicShowDay = gd;
    if (Math.random() < 0.4 && allPools.MUSIC_SHOW_POOL) _consumeEntry('MUSIC_SHOW_POOL', allPools.MUSIC_SHOW_POOL, E.roundNum);
  }
  // CAREER_SETBACKS — 每5天，gd>=10
  if (gd >= 10 && gd - E._lastSetbackDay >= 5) {
    E._lastSetbackDay = gd;
    if (Math.random() < 0.3 && allPools.CAREER_SETBACKS) _consumeEntry('CAREER_SETBACKS', allPools.CAREER_SETBACKS, E.roundNum);
  }
  // DAILY_ENGAGEMENT_POOL — 每天40%
  if (Math.random() < 0.4 && allPools.DAILY_ENGAGEMENT_POOL) _consumeEntry('DAILY_ENGAGEMENT_POOL', allPools.DAILY_ENGAGEMENT_POOL, E.roundNum);
  // ═══ 新增池子消费 ═══
  // CHEER_CULTURE_POOL — 每3天，人气>=15，40%
  if (isDebut && E.popularity >= 15 && gd - (E._lastCheerDay || 0) >= 3) {
    E._lastCheerDay = gd;
    if (Math.random() < 0.4 && allPools.CHEER_CULTURE_POOL) _consumeEntry('CHEER_CULTURE_POOL', allPools.CHEER_CULTURE_POOL, E.roundNum);
  }
  // SASAENG_ESCALATION — 每5天，人气>=25，25%
  if (isDebut && E.popularity >= 25 && gd - (E._lastSasaengEscDay || 0) >= 5) {
    E._lastSasaengEscDay = gd;
    if (Math.random() < 0.25 && allPools.SASAENG_ESCALATION_POOL) _consumeEntry('SASAENG_ESCALATION_POOL', allPools.SASAENG_ESCALATION_POOL, E.roundNum);
  }
  // VARIETY_MOMENT_POOL — 每3天，人气>=20，35%
  if (isDebut && E.popularity >= 20 && gd - (E._lastVarietyMomDay || 0) >= 3) {
    E._lastVarietyMomDay = gd;
    if (Math.random() < 0.35 && allPools.VARIETY_MOMENT_POOL) _consumeEntry('VARIETY_MOMENT_POOL', allPools.VARIETY_MOMENT_POOL, E.roundNum);
  }
  // DATING_SCANDAL_CHAIN — 每5天，好感>=40，25%
  if (isDebut && E.affection >= 40 && gd - (E._lastScandalDay || 0) >= 5) {
    E._lastScandalDay = gd;
    if (Math.random() < 0.25 && allPools.DATING_SCANDAL_CHAIN) _consumeEntry('DATING_SCANDAL_CHAIN', allPools.DATING_SCANDAL_CHAIN, E.roundNum);
  }
  // HIATUS_ANXIETY_POOL — 每4天，30%
  if (isDebut && gd - (E._lastHiatusDay || 0) >= 4) {
    E._lastHiatusDay = gd;
    if (Math.random() < 0.3 && allPools.HIATUS_ANXIETY_POOL) _consumeEntry('HIATUS_ANXIETY_POOL', allPools.HIATUS_ANXIETY_POOL, E.roundNum);
  }
  // ═══ 新增5池消费 ═══
  // JOB_GRADE_POOL — 每4天，人气>=15，40%
  if (isDebut && E.popularity >= 15 && gd - (E._lastJobGradeDay || 0) >= 4) {
    E._lastJobGradeDay = gd;
    if (Math.random() < 0.4 && allPools.JOB_GRADE_POOL) _consumeEntry('JOB_GRADE_POOL', allPools.JOB_GRADE_POOL, E.roundNum);
  }
  // YEAR_END_REVIEW_POOL — 每50天（模拟年度），30%
  if (isDebut && gd - (E._lastYearEndDay || 0) >= 50) {
    E._lastYearEndDay = gd;
    if (Math.random() < 0.30 && allPools.YEAR_END_REVIEW_POOL) _consumeEntry('YEAR_END_REVIEW_POOL', allPools.YEAR_END_REVIEW_POOL, E.roundNum);
  }
  // MV_FILMING_POOL — 每5天，人气>=25，30%
  if (isDebut && E.popularity >= 25 && gd - (E._lastMVDay || 0) >= 5) {
    E._lastMVDay = gd;
    if (Math.random() < 0.3 && allPools.MV_FILMING_POOL) _consumeEntry('MV_FILMING_POOL', allPools.MV_FILMING_POOL, E.roundNum);
  }
  // PRESS_INTERVIEW_POOL — 每5天，人气>=20，35%
  if (isDebut && E.popularity >= 20 && gd - (E._lastPressDay || 0) >= 5) {
    E._lastPressDay = gd;
    if (Math.random() < 0.35 && allPools.PRESS_INTERVIEW_POOL) _consumeEntry('PRESS_INTERVIEW_POOL', allPools.PRESS_INTERVIEW_POOL, E.roundNum);
  }
  // HIDDEN_ROUTE_POOL — 每8天，人气>=25，20%
  if (isDebut && E.popularity >= 25 && gd - (E._lastHiddenDay || 0) >= 8) {
    E._lastHiddenDay = gd;
    if (Math.random() < 0.20 && allPools.HIDDEN_ROUTE_POOL) _consumeEntry('HIDDEN_ROUTE_POOL', allPools.HIDDEN_ROUTE_POOL, E.roundNum);
  }
}

// 4. 事件调度（brother.js checkOneHeartEvents）
function consumeEvents() {
  // BROTHER_EVENT_POOL — 每天15%
  if (Math.random() < 0.15) {
    _consumeEntry('BROTHER_EVENT_POOL', allPools.BROTHER_EVENT_POOL, E.roundNum);
  }
  // MALE_LEAD_INITIATIVE_POOL — 每天10%
  if (Math.random() < 0.10) {
    _consumeEntry('MALE_LEAD_INITIATIVE_POOL', allPools.MALE_LEAD_INITIATIVE_POOL, E.roundNum);
  }
  // BROTHER_ADVANCE_TESTS — 好感阈值触发
  if (E.affection >= 15 && Math.random() < 0.25) {
    _consumeEntry('BROTHER_ADVANCE_TESTS', allPools.BROTHER_ADVANCE_TESTS, E.roundNum);
  }
  // RIVAL_ADVANCE_EVENTS — 20%概率
  if (E.affection >= 10 && Math.random() < 0.20) {
    _consumeEntry('RIVAL_ADVANCE_EVENTS', allPools.RIVAL_ADVANCE_EVENTS, E.roundNum);
  }
  // SECRET_DISCOVERY_EVENTS / SPECIAL_EVENTS — 15%
  if (Math.random() < 0.15) {
    _consumeEntry('SECRET_DISCOVERY_EVENTS', allPools.SECRET_DISCOVERY_EVENTS, E.roundNum);
  }
  // SPECIAL_EVENTS — 每天10%
  if (Math.random() < 0.10) {
    _consumeEntry('SPECIAL_EVENTS', allPools.SPECIAL_EVENTS, E.roundNum);
  }
  // JEALOUSY_EVENTS_POOL — 15%，好感>=20
  if (E.affection >= 20 && Math.random() < 0.15) {
    _consumeEntry('JEALOUSY_EVENTS_POOL', allPools.JEALOUSY_EVENTS_POOL, E.roundNum);
  }
  // BROTHER_SIDE_PLOTS — 12%
  if (Math.random() < 0.12) {
    _consumeEntry('BROTHER_SIDE_PLOTS', allPools.BROTHER_SIDE_PLOTS, E.roundNum);
  }
  // GIRLGROUP_EVENTS — 女团专属每天25%
  if (E._isDebut && Math.random() < 0.25) {
    _consumeEntry('GIRLGROUP_EVENTS', allPools.GIRLGROUP_EVENTS, E.roundNum);
  }
  // INDUSTRY_EVENTS — 行业事件每天18%
  if (E._isDebut && Math.random() < 0.18) {
    _consumeEntry('INDUSTRY_EVENTS', allPools.INDUSTRY_EVENTS, E.roundNum);
  }
  // INCIDENT_EVENTS_POOL — 突发事件每天22%
  if (E._isDebut && Math.random() < 0.22) {
    _consumeEntry('INCIDENT_EVENTS_POOL', allPools.INCIDENT_EVENTS_POOL, E.roundNum);
  }
  // SPECIAL_EVENTS — 每天10%（降低secret前缀依赖）
  // CONTACT_PROGRESSION — 出道后30%
  if (E._isDebut && Math.random() < 0.30) {
    _consumeEntry('CONTACT_PROGRESSION', allPools.CONTACT_PROGRESSION, E.roundNum);
  }
  // ONEHEART_RANDOM_EVENTS — 出道后18%
  if (E._isDebut && Math.random() < 0.18) {
    _consumeEntry('ONEHEART_RANDOM_EVENTS', allPools.ONEHEART_RANDOM_EVENTS, E.roundNum);
  }
  // ═══ 新增池子 — 事件系统消费 ═══
  // HEALTH_INJURY_POOL — 每天12%
  if (Math.random() < 0.12 && allPools.HEALTH_INJURY_POOL) {
    _consumeEntry('HEALTH_INJURY_POOL', allPools.HEALTH_INJURY_POOL, E.roundNum);
  }
  // TEAMMATE_BOND_POOL — 每天15%
  if (Math.random() < 0.15 && allPools.TEAMMATE_BOND_POOL) {
    _consumeEntry('TEAMMATE_BOND_POOL', allPools.TEAMMATE_BOND_POOL, E.roundNum);
  }
}

// 5. 聊天系统每日推送（ui.js pushDailyChats）
function consumeChatPush() {
  E._pushChatDayCounter++;
  // CHAT_BROTHER — 每2天1条
  if (E._pushChatDayCounter % 2 === 0 && allPools.CHAT_BROTHER) {
    var broPool = filterPool(allPools.CHAT_BROTHER, E, trackers['CHAT_BROTHER'].usedSet, true);
    if (broPool.length) {
      E._chatBrotherIdx = (E._chatBrotherIdx + 1) % broPool.length;
      var entry = broPool[E._chatBrotherIdx];
      consumeFromTracker(trackers['CHAT_BROTHER'], [entry], E.roundNum);
    }
  }
  // CHAT_RIVAL — 每3天1条
  if (E._pushChatDayCounter % 3 === 0 && allPools.CHAT_RIVAL) {
    var rivalPool = filterPool(allPools.CHAT_RIVAL, E, trackers['CHAT_RIVAL'].usedSet, true);
    if (rivalPool.length) {
      E._chatRivalIdx = (E._chatRivalIdx + 1) % rivalPool.length;
      consumeFromTracker(trackers['CHAT_RIVAL'], [rivalPool[E._chatRivalIdx]], E.roundNum);
    }
  }
  // CHAT_MANAGER — 每4天1条
  if (E._pushChatDayCounter % 4 === 0 && allPools.CHAT_MANAGER) {
    var mgrPool = filterPool(allPools.CHAT_MANAGER, E, trackers['CHAT_MANAGER'].usedSet, true);
    if (mgrPool.length) {
      E._chatManagerIdx = (E._chatManagerIdx + 1) % mgrPool.length;
      consumeFromTracker(trackers['CHAT_MANAGER'], [mgrPool[E._chatManagerIdx]], E.roundNum);
    }
  }
  // GROUP_CHAT — 每2天1条
  if (E._pushChatDayCounter % 2 === 0 && allPools.GROUP_CHAT) {
    var gpPool = filterPool(allPools.GROUP_CHAT, E, trackers['GROUP_CHAT'].usedSet, true);
    if (gpPool.length) {
      E._chatGroupIdx = (E._chatGroupIdx + 1) % gpPool.length;
      consumeFromTracker(trackers['GROUP_CHAT'], [gpPool[E._chatGroupIdx]], E.roundNum);
    }
  }
  // CHAT_SASAENG — 每7天30%（ui层）
  if (E._pushChatDayCounter % 7 === 0 && Math.random() < 0.3 && allPools.CHAT_SASAENG) {
    var ssPool = filterPool(allPools.CHAT_SASAENG, E, trackers['CHAT_SASAENG'].usedSet, true);
    if (ssPool.length) {
      E._chatSasaengIdx = (E._chatSasaengIdx + 1) % ssPool.length;
      consumeFromTracker(trackers['CHAT_SASAENG'], [ssPool[E._chatSasaengIdx]], E.roundNum);
    }
  }
}

// 玩家主动聊天（每天20%概率触发）
function consumePlayerChat() {
  if (Math.random() >= 0.20) return;
  var target = pickRandom([allPools.CHAT_MALE_LEAD, allPools.CHAT_BROTHER, allPools.CHAT_RIVAL, allPools.CHAT_MANAGER, allPools.GROUP_CHAT].filter(Boolean), 1);
  if (target.length) {
    _consumeEntry('CHAT_MALE_LEAD', target[0], E.roundNum); // 简化：都计数到对应池
  }
}

// 6. 每日舆论（immersion.js generateDailyBuzz）
function consumeDailyBuzz() {
  if (!E._isDebut) return;

  // DAILY_BUZZ — 每天1条
  _consumeEntry('DAILY_BUZZ', allPools.DAILY_BUZZ, E.roundNum);

  // DAILY_BUZZ_TEMPLATES — 每天多渠道（hotSearch+fanDiscussion+mediaTitle）
  _consumeEntry('DAILY_BUZZ_TEMPLATES', allPools.DAILY_BUZZ_TEMPLATES, E.roundNum);
  _consumeEntry('DAILY_BUZZ_TEMPLATES', allPools.DAILY_BUZZ_TEMPLATES, E.roundNum);
  _consumeEntry('DAILY_BUZZ_TEMPLATES', allPools.DAILY_BUZZ_TEMPLATES, E.roundNum);

  // EXTERNAL_HOT — 每天多条
  _consumeEntry('EXTERNAL_HOT', allPools.EXTERNAL_HOT, E.roundNum);
  _consumeEntry('EXTERNAL_HOT', allPools.EXTERNAL_HOT, E.roundNum);

  // CHART_POOL — 每天1条
  _consumeEntry('CHART_POOL', allPools.CHART_POOL, E.roundNum);

  // NEWS_TEMPLATES — 每天40%概率混入媒体标题
  if (Math.random() < 0.4) {
    _consumeEntry('NEWS_TEMPLATES', allPools.NEWS_TEMPLATES, E.roundNum);
  }
  // TOXIC_FAN_WAR_POOL — 每天20%概率，人气>=20
  if (E.popularity >= 20 && Math.random() < 0.20) {
    _consumeEntry('TOXIC_FAN_WAR_POOL', allPools.TOXIC_FAN_WAR_POOL, E.roundNum);
  }
}

// 7. 场景灵感注入 — 模拟真实 injectPoolInspirations 流程
//    第一步：所有池子 addPoolCandidates（只出候选，不消耗）
//    第二步：从候选里随机选 2-4 条注入
//    第三步：仅标记选中的条目为已消耗
function consumeSceneInspiration() {
  var aff = E.affection;
  // ── 阶段1：所有活跃池子产出候选（不入库） ──
  var candidatePool = []; // {poolName, pool, drawCount}
  
  if (aff >= 20) { candidatePool.push({name:'ROMANCE_BACKSTAGE', pool:allPools.ROMANCE_BACKSTAGE, draw:2}); }
  if (aff >= 20) { candidatePool.push({name:'ROMANCE_LATENIGHT', pool:allPools.ROMANCE_LATENIGHT, draw:2}); }
  if (aff >= 20) { candidatePool.push({name:'ROMANCE_PUBLIC', pool:allPools.ROMANCE_PUBLIC, draw:2}); }
  if (aff >= 40) { candidatePool.push({name:'ROMANCE_CRISIS', pool:allPools.ROMANCE_CRISIS, draw:2}); }
  if (aff >= 30) { candidatePool.push({name:'ROMANCE_JEALOUSY_POOL', pool:allPools.ROMANCE_JEALOUSY_POOL, draw:1}); }
  if (aff >= 60) { candidatePool.push({name:'ROMANCE_CONFESSION', pool:allPools.ROMANCE_CONFESSION, draw:1}); }
  if (aff >= 30 && E.exposure >= 10) {
    candidatePool.push({name:'SECRET_COMMS', pool:allPools.SECRET_COMMS, draw:1});
    candidatePool.push({name:'SECRET_NEARMISS', pool:allPools.SECRET_NEARMISS, draw:1});
    candidatePool.push({name:'SECRET_FAN_CLUES', pool:allPools.SECRET_FAN_CLUES, draw:1});
    candidatePool.push({name:'SECRET_COMPANY', pool:allPools.SECRET_COMPANY, draw:1});
  }
  candidatePool.push({name:'ATMOSPHERE_WEATHER', pool:allPools.ATMOSPHERE_WEATHER, draw:1});
  candidatePool.push({name:'ATMOSPHERE_MOOD', pool:allPools.ATMOSPHERE_MOOD, draw:1});
  candidatePool.push({name:'ATMOSPHERE_HIS_STATE', pool:allPools.ATMOSPHERE_HIS_STATE, draw:1});
  if (aff >= 20) { candidatePool.push({name:'ENCOUNTER_ML', pool:allPools.ENCOUNTER_ML, draw:2}); }
  if (aff >= 20) { candidatePool.push({name:'ENCOUNTER_RIVAL', pool:allPools.ENCOUNTER_RIVAL, draw:1}); }
  if (aff >= 20) { candidatePool.push({name:'ENCOUNTER_BROTHER', pool:allPools.ENCOUNTER_BROTHER, draw:1}); }
  if (aff >= 30) { candidatePool.push({name:'ENCOUNTER_OTHERS', pool:allPools.ENCOUNTER_OTHERS, draw:1}); }
  if (aff >= 50) { candidatePool.push({name:'DRAMA_ALMOST', pool:allPools.DRAMA_ALMOST, draw:1}); }
  if (aff >= 30) { candidatePool.push({name:'DRAMA_MISUNDERSTAND', pool:allPools.DRAMA_MISUNDERSTAND, draw:1}); }
  if (aff >= 40) { candidatePool.push({name:'DRAMA_COLDWAR', pool:allPools.DRAMA_COLDWAR, draw:1}); }
  if (aff >= 40) { candidatePool.push({name:'DRAMA_DATING_RUMOR', pool:allPools.DRAMA_DATING_RUMOR, draw:1}); }
  if (aff >= 50) { candidatePool.push({name:'DRAMA_DILEMMA', pool:allPools.DRAMA_DILEMMA, draw:1}); }
  if (E._isDebut) {
    if (E.chapter <= 1) { candidatePool.push({name:'MILESTONE_DEBUT', pool:allPools.MILESTONE_DEBUT, draw:1}); }
    candidatePool.push({name:'MILESTONE_AWARDS', pool:allPools.MILESTONE_AWARDS, draw:1});
    if (E.chapter >= 2) { candidatePool.push({name:'MILESTONE_FIRST_WIN', pool:allPools.MILESTONE_FIRST_WIN, draw:1}); }
  }
  candidatePool.push({name:'CALENDAR_EVENTS', pool:allPools.CALENDAR_EVENTS, draw:1});

  // ── 阶段2：每个池子 addPoolCandidates → 加入统一候选列表（跳过已用） ──
  var candidates = []; // {poolName, text}
  for (var ci = 0; ci < candidatePool.length; ci++) {
    var cp = candidatePool[ci];
    if (!cp.pool || !cp.pool.length) continue;
    var tracker = trackers[cp.name];
    if (!tracker) { tracker = makePoolTracker(cp.name, cp.pool.length); trackers[cp.name] = tracker; }
    // 跳过已用完的条目
    var avail = [];
    for (var ai = 0; ai < cp.pool.length; ai++) {
      if (!tracker.usedSet.has(cp.pool[ai].text)) avail.push(cp.pool[ai]);
    }
    // 无可用 → 从全池抽（复用，但候选池里放1条）
    if (!avail.length && cp.pool.length) {
      avail.push(cp.pool[Math.floor(Math.random() * cp.pool.length)]);
    }
    if (!avail.length) continue;
    var n = Math.min(cp.draw, avail.length);
    var tmp = avail.slice();
    for (var di = 0; di < n && tmp.length; di++) {
      var idx = Math.floor(Math.random() * tmp.length);
      candidates.push({ poolName: cp.name, text: tmp.splice(idx, 1)[0].text });
    }
  }

  // ── 阶段3：从全部候选中随机选 2-4 条注入，仅标记选中的为已消耗 ──
  if (!candidates.length) return 0;
  var maxPick = Math.min(4, candidates.length);
  var pickCount = 2 + Math.floor(Math.random() * (maxPick - 1)); // 2~4
  var picked = [];
  var tmpC = candidates.slice();
  for (var pi = 0; pi < pickCount && tmpC.length; pi++) {
    var pIdx = Math.floor(Math.random() * tmpC.length);
    picked.push(tmpC.splice(pIdx, 1)[0]);
  }
  // 只消耗选中的
  for (var pj = 0; pj < picked.length; pj++) {
    var t = trackers[picked[pj].poolName];
    if (!t) continue;
    if (t.usedSet.has(picked[pj].text)) {
      t.reused++;
    } else {
      t.usedSet.add(picked[pj].text);
      t.consumed++;
    }
    if (t.consumed >= t.total && t.exhaustedAt < 0) {
      t.exhaustedAt = E.roundNum;
    }
  }

  return candidates.length; // 候选总数（日志用）
}



// 8. 特殊触发：出道里程碑
function consumeDebutMoment() {
  _consumeEntry('MILESTONE_DEBUT', allPools.MILESTONE_DEBUT, E.roundNum);
  // 练习生出道评估事件
  _consumeEntry('TRAINEE_EVENTS', allPools.TRAINEE_EVENTS, E.roundNum);
  // 队友事件
  _consumeEntry('SVT_TEAMMATE_EVENT_POOL', allPools.SVT_TEAMMATE_EVENT_POOL, E.roundNum);
}

// ============================================================
// 主循环
// ============================================================
function runSimulation(label) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  ' + label);
  console.log('  真实游戏全链路模拟（非最优玩家路线）');
  console.log('  Seed: ' + SEED);
  console.log('═══════════════════════════════════════════════\n');

  initState();
  registerAllPools();
  consumeInit();

  var roundLog = [];
  var dayPhaseLabels = ['☀上午', '☀下午', '🌙夜晚'];
  var debutTriggered = false;
  var maxRounds = 800; // 安全上限

  for (var r = 0; r < maxRounds; r++) {
    E.roundNum = r + 1;

    // ── 每天的阶段推进 ──
    if (E.slotInDay >= 3) {
      E.slotInDay = 0;
      // ── 进入新一天的日结算 ──
      E.dayCount++;
      E._gameDayCount++;   // 独立游戏天+1（不受章节跳跃影响）

      // 日结算：日程
      consumeDailySchedule();
      // 日结算：engine事件
      consumeEngineDaily();
      // 日结算：事件调度
      consumeEvents();
      // 日结算：聊天推送
      consumeChatPush();
      // 日结算：玩家聊天
      consumePlayerChat();
      // 日结算：每日舆论
      consumeDailyBuzz();

      // ── 练习生阶段推进（独立天数计数，不受日历dayCount影响） ──
      if (!E._isDebut) {
        E._traineeDayCount = (E._traineeDayCount || 0) + 1;
        // 阶段判定：<=4前期, <=10中期, >10后期（同 state.js traineePhaseOf）
        var traineePhase = E._traineeDayCount <= 4 ? 1 : E._traineeDayCount <= 10 ? 2 : 3;
        E._traineePhase = traineePhase;
        E.career.traineePhase = traineePhase;
        // 出道触发：进入后期后累计2-4天
        if (traineePhase === 3) {
          E._debutTriggerCount = (E._debutTriggerCount || 0) + 1;
          if (E._debutTriggerCount >= 2 + Math.floor(Math.random() * 3)) {
            E._isDebut = true;
            E.career.debutDay = E.dayCount;
            E._debutDay = E.dayCount;
            E.popularity = 0; // 出道人气从0开始
            E.career.popularity = 0;
            consumeDebutMoment();
          }
        }
      }
    }

    var phaseLabel = dayPhaseLabels[E.slotInDay];

    // ── 好感度变化（非最优玩家：会拉扯但不至于完全不走感情线） ──
    var affRoll = Math.random();
    var affDelta = 0;
    if (affRoll < 0.55) affDelta = 1 + Math.floor(Math.random() * 3);      // 55% 好选项
    else if (affRoll < 0.82) affDelta = 0;                                   // 27% 中性
    else if (affRoll < 0.92) affDelta = -(Math.floor(Math.random() * 2));    // 10% 小失误
    else affDelta = -(2 + Math.floor(Math.random() * 2));                    // 8% 走情敌线/冷战
    // 减速
    if (E.affection >= 80) affDelta = Math.max(-1, affDelta - 1);
    if (E.affection >= 95) affDelta = Math.max(-1, affDelta - 2);
    E.affection = Math.max(0, Math.min(100, E.affection + affDelta));
    // 恋爱阶段
    if (E.affection >= 60) E._romanceStage = 2;
    else if (E.affection >= 20) E._romanceStage = 1;

    // ── 人气变化（确保200轮内可达章节6: 70%+1~3） ──
    if (E._isDebut) {
      var popGain = 0;
      var popRoll = Math.random();
      if (popRoll < 0.70) popGain = 1 + (Math.random() < 0.4 ? (Math.random() < 0.5 ? 2 : 1) : 0);
      E.popularity = Math.min(100, E.popularity + popGain);
      E.career.popularity = E.popularity;
    }

    // ── 章节检查 ──
    var targetCh = chapterByPopularity(E.popularity);
    if (targetCh > E.chapter) {
      var oldCh = E.chapter;
      E.chapter = targetCh;
      var skip = CHAPTER_TIME_SKIP[targetCh] || 0;
      if (skip > 0) E.dayCount += skip;
      if (oldCh === 1 && targetCh === 2) {
        // 跨入Ch2 触发首次颁奖/一位场景
        _consumeEntry('MILESTONE_FIRST_WIN', allPools.MILESTONE_FIRST_WIN, E.roundNum);
      }
    }

    // ── 出道触发已移至每日结算中（基于独立练习天数） ──

    // ── 曝光增长 ──
    if (E._isDebut && E.affection >= 15) {
      E.exposure = Math.min(100, E.exposure + (0.3 + Math.random() * 0.7));
    }

    // ── 每时段：场景灵感注入 ──
    var candCount = consumeSceneInspiration();

    // 记录本时段
    roundLog.push({
      round: r + 1,
      day: E.dayCount,
      phase: phaseLabel,
      aff: E.affection,
      pop: E.popularity,
      exp: E.exposure.toFixed(1),
      ch: E.chapter,
      cand: candCount
    });

    E.slotInDay++;

    // ── 停止条件：满200轮 或 到达章节6+安全缓冲 ──
    // 跑到章节6后继续跑满200轮，测试池子极限
    if (r >= 200) break;
  }

  // ── 输出部分回合日志 ──
  console.log('【游戏过程缩略】（每10轮显示1条，关键节点全量）');
  var lastPrintedAff = -10, lastPrintedPop = -10, lastPrintedCh = -1;
  for (var i = 0; i < roundLog.length; i++) {
    var log = roundLog[i];
    var show = false;
    if (i === 0) show = true;
    else if (log.aff >= 20 && roundLog[i-1] && roundLog[i-1].aff < 20) show = true;
    else if (log.aff >= 40 && roundLog[i-1] && roundLog[i-1].aff < 40) show = true;
    else if (log.aff >= 60 && roundLog[i-1] && roundLog[i-1].aff < 60) show = true;
    else if (log.aff >= 80 && roundLog[i-1] && roundLog[i-1].aff < 80) show = true;
    else if (log.aff >= 95 && roundLog[i-1] && roundLog[i-1].aff < 95) show = true;
    else if (log.ch !== lastPrintedCh) show = true;
    else if (i % 10 === 0) show = true;

    if (show) {
      var affChange = '';
      if (lastPrintedAff !== -10) {
        var d = log.aff - lastPrintedAff;
        if (d !== 0) affChange = (d > 0 ? ' +' : ' ') + d;
      }
      console.log('  [Day' + String(log.day).padStart(3) + '] ' + log.phase +
        ' #' + String(log.round).padStart(3) +
        ' | aff=' + String(log.aff).padStart(3) + affChange +
        ' pop=' + String(log.pop).padStart(3) +
        ' exp=' + String(log.exp).padStart(5) +
        ' ch' + log.ch +
        ' | 注入候选:' + String(log.cand).padStart(2) + '条');
      lastPrintedAff = log.aff;
      lastPrintedPop = log.pop;
      lastPrintedCh = log.ch;
    }
  }

  // ── 统计 ──
  console.log('\n───────────────────────────────────────────────');
  console.log('【结局统计】');
  console.log('  总轮数: ' + roundLog.length + ' | 总天数: ' + E.dayCount + ' | 实际游戏天数: ~' + Math.round(roundLog.length / 3));
  console.log('  最终好感: ' + E.affection + ' | 最终人气: ' + E.popularity + ' | 曝光: ' + E.exposure.toFixed(1) + ' | 章节: ' + E.chapter);
  console.log('  是否出道: ' + (E._isDebut ? '是(第' + E._debutDay + '天)' : '否'));

  console.log('\n【池子消耗汇总】');
  console.log('  池子名'.padEnd(30) + '总量'.padEnd(6) + '消耗'.padEnd(6) + '重复'.padEnd(6) + '利用率'.padEnd(8) + '状态');

  var exhaustedList = [];
  var warningList = [];
  var totalConsumed = 0;
  var totalReused = 0;

  var poolNames = Object.keys(trackers).sort();
  poolNames.forEach(function(name) {
    var t = trackers[name];
    if (t.total === 0) return;
    totalConsumed += t.consumed;
    totalReused += t.reused;
    var pct = t.total > 0 ? ((t.consumed / t.total) * 100).toFixed(0) : '0';
    var status = '';
    if (t.consumed >= t.total) { status = '🔴耗尽(' + t.exhaustedAt + ')'; exhaustedList.push(t); }
    else if (parseInt(pct) >= 80) { status = '🟡警告'; warningList.push(t); }
    else if (t.consumed > 0) status = '✅';
    else status = '⚪未触发';
    console.log('  ' + name.padEnd(30) + String(t.total).padEnd(6) + String(t.consumed).padEnd(6) + String(t.reused).padEnd(6) + String(pct + '%').padEnd(8) + status);
  });

  console.log('\n───────────────────────────────────────────────');
  console.log('  总池子条目: ' + Object.values(trackers).reduce(function(a,t){return a+t.total;}, 0));
  console.log('  总消耗: ' + totalConsumed + ' | 总重复: ' + totalReused);
  console.log('  🔴 耗尽: ' + exhaustedList.length + ' | 🟡 警告(≥80%): ' + warningList.length);

  if (exhaustedList.length) {
    console.log('\n  🔴 耗尽池子:');
    exhaustedList.forEach(function(t) {
      console.log('    ' + t.name + ' (' + t.total + '条 → 全用完，第' + t.exhaustedAt + '轮枯竭)');
    });
  }
  if (warningList.length) {
    console.log('\n  🟡 高消耗池:');
    warningList.sort(function(a,b) { return (b.consumed/b.total) - (a.consumed/a.total); });
    warningList.forEach(function(t) {
      console.log('    ' + t.name + ': ' + t.consumed + '/' + t.total + ' (' + ((t.consumed/t.total)*100).toFixed(0) + '%)');
    });
  }

  return { rounds: roundLog.length, days: E.dayCount, aff: E.affection, pop: E.popularity,
    exhausted: exhaustedList.length, warnings: warningList.length, totalReused: totalReused };
}

// ── 运行 ──
var result = runSimulation('完整游戏端到端模拟 — 非最优玩家路线');
console.log('\n═══════════════════════════════════════════════');
console.log('  模拟完成。');
console.log('  实际游戏轮数: ' + result.rounds + ' 轮（~' + Math.round(result.rounds/3) + ' 天）');
console.log('  若需扩大样本，可重复运行多次取均值。');
console.log('═══════════════════════════════════════════════');
