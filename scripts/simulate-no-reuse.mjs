// ============================================================
// 严格模拟：每条池子只使用一次，3时段/天，真实好感/人气增长
// 模拟到人气=100 HE 结局，统计每个池子的耗尽情况
// ============================================================

import { 
  ROMANCE_BACKSTAGE, ROMANCE_LATENIGHT, ROMANCE_PUBLIC, 
  ROMANCE_CRISIS, ROMANCE_JEALOUSY_POOL, ROMANCE_CONFESSION,
  SECRET_COMMS, SECRET_NEARMISS, SECRET_FAN_CLUES, SECRET_COMPANY,
  ATMOSPHERE_WEATHER, ATMOSPHERE_MOOD, ATMOSPHERE_HIS_STATE,
  MILESTONE_FIRST_WIN, MILESTONE_AWARDS,
  ENCOUNTER_ML, ENCOUNTER_RIVAL, ENCOUNTER_BROTHER, ENCOUNTER_OTHERS,
  DRAMA_ALMOST, DRAMA_MISUNDERSTAND, DRAMA_COLDWAR, DRAMA_DATING_RUMOR, DRAMA_DILEMMA,
  CALENDAR_EVENTS
} from '../src/ent-sim/pools/index.js';

// ── 从 prompts.js 复制的 canTrigger 逻辑 (_utils.js 可能依赖状态) ──
function canTrigger(entry, E) {
  if (!entry) return false;
  var req = entry.require || '';
  if (!req) return true;
  // 解析 && 连接的复合条件
  var conditions = req.split('&&');
  for (var ci = 0; ci < conditions.length; ci++) {
    var cond = conditions[ci].trim();
    if (!cond) continue;
    if (cond.startsWith('aff>=')) {
      var th = parseInt(cond.slice(4), 10);
      if ((E.affection || 0) < th) return false;
    } else if (cond === 'debut') {
      if (!(E.career && E.career.debutDay > 0)) return false;
    } else if (cond === 'trainee') {
      if (E.career && E.career.debutDay > 0) return false;
    } else if (cond.startsWith('season=')) {
      if ((E.season || '') !== cond.slice(7)) return false;
    } else if (cond.startsWith('birthday=')) {
      if ((E._birthday || '') !== cond.slice(9)) return false;
    } else if (cond.startsWith('month=')) {
      if ((E._month || 0) !== parseInt(cond.slice(6), 10)) return false;
    } else if (cond.startsWith('traineePhase=')) {
      if ((E.career && E.career.traineePhase || 0) !== parseInt(cond.slice(13), 10)) return false;
    }
  }
  return true;
}

// ── 池子定义（每个池子名+数组+在 injectPoolInspirations 中的抽数逻辑）──
// 抽数: [count, require_condition_name]
var POOL_REGISTRY = [
  // 恋爱场景 — aff>=20 起活跃
  { name: 'ROMANCE_BACKSTAGE', pool: ROMANCE_BACKSTAGE, cond: 'aff>=20', draw: 2 },
  { name: 'ROMANCE_LATENIGHT', pool: ROMANCE_LATENIGHT, cond: 'aff>=20', draw: 2 },
  { name: 'ROMANCE_PUBLIC', pool: ROMANCE_PUBLIC, cond: 'aff>=20', draw: 2 },
  { name: 'ROMANCE_CRISIS', pool: ROMANCE_CRISIS, cond: 'aff>=40', draw: 2 },
  { name: 'ROMANCE_JEALOUSY_POOL', pool: ROMANCE_JEALOUSY_POOL, cond: 'aff>=30', draw: 1 },
  { name: 'ROMANCE_CONFESSION', pool: ROMANCE_CONFESSION, cond: 'aff>=60', draw: 1 },
  // 地下恋 — aff>=30 且曝光>=10
  { name: 'SECRET_COMMS', pool: SECRET_COMMS, cond: 'aff>=30&&exposure>=10', draw: 1 },
  { name: 'SECRET_NEARMISS', pool: SECRET_NEARMISS, cond: 'aff>=30&&exposure>=10', draw: 1 },
  { name: 'SECRET_FAN_CLUES', pool: SECRET_FAN_CLUES, cond: 'aff>=30&&exposure>=10', draw: 1 },
  { name: 'SECRET_COMPANY', pool: SECRET_COMPANY, cond: 'aff>=30&&exposure>=10', draw: 1 },
  // 氛围 — 每天每轮都抽
  { name: 'ATMOSPHERE_WEATHER', pool: ATMOSPHERE_WEATHER, cond: 'always', draw: 1 },
  { name: 'ATMOSPHERE_MOOD', pool: ATMOSPHERE_MOOD, cond: 'always', draw: 1 },
  { name: 'ATMOSPHERE_HIS_STATE', pool: ATMOSPHERE_HIS_STATE, cond: 'always', draw: 1 },
  // 偶遇 — aff>=20 起
  { name: 'ENCOUNTER_ML', pool: ENCOUNTER_ML, cond: 'aff>=20', draw: 2 },
  { name: 'ENCOUNTER_RIVAL', pool: ENCOUNTER_RIVAL, cond: 'aff>=20', draw: 1 },
  { name: 'ENCOUNTER_BROTHER', pool: ENCOUNTER_BROTHER, cond: 'aff>=20', draw: 1 },
  { name: 'ENCOUNTER_OTHERS', pool: ENCOUNTER_OTHERS, cond: 'aff>=30', draw: 1 },
  // 剧情节奏
  { name: 'DRAMA_ALMOST', pool: DRAMA_ALMOST, cond: 'aff>=50', draw: 1 },
  { name: 'DRAMA_MISUNDERSTAND', pool: DRAMA_MISUNDERSTAND, cond: 'aff>=30', draw: 1 },
  { name: 'DRAMA_COLDWAR', pool: DRAMA_COLDWAR, cond: 'aff>=40', draw: 1 },
  { name: 'DRAMA_DATING_RUMOR', pool: DRAMA_DATING_RUMOR, cond: 'aff>=40', draw: 1 },
  { name: 'DRAMA_DILEMMA', pool: DRAMA_DILEMMA, cond: 'aff>=50', draw: 1 },
  // 里程碑 — 出道后
  { name: 'MILESTONE_AWARDS', pool: MILESTONE_AWARDS, cond: 'debut', draw: 1 },
  { name: 'MILESTONE_FIRST_WIN', pool: MILESTONE_FIRST_WIN, cond: 'debut&&ch>=2', draw: 1 },
  // 日历 — 每天1条（仅抽可触发的，按月/生日过滤后很少）
  { name: 'CALENDAR_EVENTS', pool: CALENDAR_EVENTS, cond: 'always', draw: 1 },
];

// ── 章节时间跳 ──
var CHAPTER_TIME_SKIP = { 2: 30, 3: 45, 4: 60, 5: 75, 6: 90 };
function chapterByPopularity(pop) {
  if (pop >= 90) return 6;
  if (pop >= 75) return 5;
  if (pop >= 55) return 4;
  if (pop >= 35) return 3;
  if (pop >= 15) return 2;
  return 1;
}

// ── 状态 ──
var E = null;
var TOTAL_ITEMS = 0;
var poolState = {}; // { name: { total, remaining, exhausted: bool } }
var usageLog = {}; // { name: [usedTexts...] }
var ROUNDS_LOG = []; // per-round stats

function initPools() {
  TOTAL_ITEMS = 0;
  POOL_REGISTRY.forEach(function(r) {
    var n = r.pool.length || 0;
    TOTAL_ITEMS += n;
    poolState[r.name] = { total: n, remaining: n, exhausted: false, drawCount: r.draw };
    usageLog[r.name] = []; // tracked by text hash
  });
}

// 检查条件是否成立
function conditionMet(cond) {
  if (cond === 'always') return true;
  var parts = cond.split('&&');
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p === 'debut') {
      if (!E._isDebut) return false;
    } else if (p.startsWith('aff>=')) {
      if ((E.affection || 0) < parseInt(p.slice(4))) return false;
    } else if (p === 'exposure>=10') {
      if ((E.exposure || 0) < 10) return false;
    } else if (p === 'ch>=2') {
      if ((E.chapter || 1) < 2) return false;
    }
  }
  return true;
}

// 从某个池子抽 drawCount 条（不重复），返回 { category, text } 数组
function drawFromPool(reg, E) {
  var items = reg.pool;
  var drawCount = reg.draw;
  var used = usageLog[reg.name];
  // 筛选可用：条件满足 && 文本未使用过
  var available = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!canTrigger(item, E)) continue;
    if (used.indexOf(item.text) >= 0) continue;
    available.push(item);
  }
  if (!available.length) {
    // 兜底：从全池中取未使用的（忽略条件）
    for (var i2 = 0; i2 < items.length; i2++) {
      if (used.indexOf(items[i2].text) < 0) available.push(items[i2]);
    }
  }
  if (!available.length) {
    poolState[reg.name].exhausted = true;
    return null;
  }
  var n = Math.min(drawCount, available.length);
  var result = [];
  for (var j = 0; j < n; j++) {
    var idx = Math.floor(Math.random() * available.length);
    var picked = available.splice(idx, 1)[0];
    used.push(picked.text);
    result.push({ category: reg.name, text: picked.text });
    poolState[reg.name].remaining = Math.max(0, (items.length || 0) - used.length);
  }
  if (used.length >= items.length) poolState[reg.name].exhausted = true;
  return result;
}

// 主模拟函数
function simulate(seed) {
  // 初始化状态
  E = {
    affection: 0,
    exposure: 0,
    popularity: 0,
    chapter: 1,
    _isDebut: false,
    roundInChapter: 0,
    totalRound: 0,
    dayCount: 1,
    _birthday: '', // 模拟中不触发生日（避免污染）
    _month: (seed ? 3 + (seed % 9) : 6), // 模拟月
    season: (seed ? ['春','夏','秋','冬'][seed % 4] : '夏'),
    career: { debutDay: 0, popularity: 0, traineePhase: 1 }
  };

  initPools();
  ROUNDS_LOG = [];

  var roundNum = 0;
  var slotInDay = 0;

  // 循环直到人气=100
  while (true) {
    roundNum++;

    // ── 每 slot 之前：检查是否需要切换到下一天 ──
    if (slotInDay >= 3) { slotInDay = 0; E.dayCount++; }

    // ── 练习生阶段推进 ──
    if (!E._isDebut && E.career.traineePhase < 3) {
      // 每 10 回合推进一个阶段
      if (roundNum >= 20 && E.career.traineePhase < 3) E.career.traineePhase = 3;
      else if (roundNum >= 10 && E.career.traineePhase < 2) E.career.traineePhase = 2;
    }

    // ── 出道触发 ──
    if (!E._isDebut && roundNum >= 12 && E.affection >= 10) {
      E._isDebut = true;
      E.career.debutDay = E.dayCount;
      E.popularity = 18 + Math.floor(Math.random() * 5); // 18-22
      E.career.popularity = E.popularity;
      // 出道后章节 = 1
      E.chapter = 1;
    }

    // ── 人气增长（出道后有效） ──
    if (E._isDebut) {
      var popGain = 1 + Math.floor(Math.random() * 4); // 1-4
      E.popularity = Math.min(100, (E.popularity || 0) + popGain);
      E.career.popularity = E.popularity;
    }

    // ── 章节跨越检查 ──
    var targetCh = chapterByPopularity(E.popularity || 0);
    if (targetCh > E.chapter) {
      var oldCh = E.chapter;
      E.chapter = targetCh;
      var skip = CHAPTER_TIME_SKIP[targetCh] || 0;
      if (skip > 0) E.dayCount += skip;
    }

    // ── 曝光增长 ──
    if (E._isDebut && E.affection >= 30) {
      E.exposure = Math.min(100, (E.exposure || 0) + (0.3 + Math.random() * 0.7));
    }

    // ── 好感度增长（每轮 AI 返回 delta 1-3） ──
    var affGain = 1 + Math.floor(Math.random() * 3); // 1-3
    // 减速：高好感度时增长放缓
    if (E.affection >= 80) affGain = Math.max(0, affGain - 1);
    if (E.affection >= 90) affGain = Math.max(0, affGain - 1);
    // 冷战/误会期间偶尔减速
    if (Math.random() < 0.1) affGain = Math.max(0, affGain - 1);
    E.affection = Math.min(100, (E.affection || 0) + affGain);

    // ── 池子注入：收集所有符合条件的条目 ──
    var candidates = [];
    var poolContributions = {}; // { name: count }
    POOL_REGISTRY.forEach(function(reg) {
      if (!conditionMet(reg.cond)) return;
      if (poolState[reg.name].exhausted) return;
      var picked = drawFromPool(reg, E);
      if (picked && picked.length) {
        poolContributions[reg.name] = (poolContributions[reg.name] || 0) + picked.length;
        candidates = candidates.concat(picked);
      }
    });

    // 随机选最多 4 条（多余的不计入消耗？不，drawFromPool 已经消耗了池子）
    var maxPick = Math.min(4, candidates.length);
    var shuffled = candidates.slice();
    // 洗牌
    for (var si = shuffled.length - 1; si > 0; si--) {
      var j = Math.floor(Math.random() * (si + 1));
      var tmp = shuffled[si]; shuffled[si] = shuffled[j]; shuffled[j] = tmp;
    }
    var injected = shuffled.slice(0, maxPick);

    // 记录本轮
    ROUNDS_LOG.push({
      round: roundNum,
      day: E.dayCount,
      aff: E.affection,
      pop: E.popularity,
      exp: E.exposure,
      ch: E.chapter,
      debut: E._isDebut,
      candidatesTotal: candidates.length,
      injected: injected.length
    });

    slotInDay++;

    // ── 停止条件：人气 >= 100（HE结局） ──
    if (E.popularity >= 100 && E.affection >= 90 && E._isDebut) break;

    // 安全检查：防止无限循环（60天/180轮）
    if (roundNum >= 180) break;
  }

  return {
    totalRounds: roundNum,
    finalDay: E.dayCount,
    finalAff: E.affection,
    finalPop: E.popularity,
    finalExp: E.exposure,
    finalCh: E.chapter,
    poolState: poolState,
    usageLog: usageLog,
    roundsLog: ROUNDS_LOG
  };
}

// ── 运行 3 次模拟取平均 ──
function runMultiSim(count) {
  console.log('═══════════════════════════════════════════');
  console.log('  池子不重复严格模拟 · ' + count + ' 次');
  console.log('  每天3时段(上午/下午/夜晚)=3轮注入');
  console.log('  好感+1~3/轮  人气+1~4/轮(出道后)');
  console.log('  每条池子素材只用一次，用完即枯竭');
  console.log('═══════════════════════════════════════════\n');

  var allResults = [];
  for (var s = 0; s < count; s++) {
    var result = simulate(s);
    allResults.push(result);
  }

  // 汇总
  var totalRoundsArr = allResults.map(function(r) { return r.totalRounds; });
  var avgRounds = Math.round(totalRoundsArr.reduce(function(a,b) { return a+b; }, 0) / totalRoundsArr.length);
  var avgDays = Math.round(allResults.map(function(r) { return r.finalDay; }).reduce(function(a,b) { return a+b; }, 0) / count);

  console.log('【平均结局】');
  console.log('  活跃回合数: ' + avgRounds + ' 回合');
  console.log('  日历天数(含章节跳跃): ' + avgDays + ' 天');
  console.log('  实际可玩天数: ~' + Math.round(avgRounds / 3) + ' 天 (' + avgRounds + '轮÷3时段/天)');
  console.log('');

  // 详细展示一次模拟
  var bestRun = allResults[0];
  // 找最接近平均 round 数的
  var bestDiff = Infinity;
  for (var bi = 0; bi < allResults.length; bi++) {
    var d = Math.abs(allResults[bi].totalRounds - avgRounds);
    if (d < bestDiff) { bestDiff = d; bestRun = allResults[bi]; }
  }

  console.log('【典型路径】（第1次模拟）');
  console.log('  总回合: ' + bestRun.totalRounds + ' | 日历天数: ' + bestRun.finalDay);
  console.log('  最终好感: ' + bestRun.finalAff + ' | 人气: ' + bestRun.finalPop + ' | 曝光: ' + bestRun.finalExp.toFixed(1) + ' | 章节: ' + bestRun.finalCh);
  console.log('');

  // 里程碑
  var log = bestRun.roundsLog;
  var milestones = [];
  for (var li = 0; li < log.length; li++) {
    var l = log[li];
    if (li === 0) milestones.push
      ('回合' + l.round + '(Day' + l.day + '): 开局 aff=' + l.aff + ' pop=' + l.pop);
    if ((li === 0 || log[li-1].ch !== l.ch) && l.ch > 1) milestones.push('回合' + l.round + '(Day' + l.day + '): ⬆跨入Ch' + l.ch + ' pop=' + l.pop);
    if (l.debut && (li === 0 || !log[li-1].debut)) milestones.push('回合' + l.round + '(Day' + l.day + '): ⭐出道！ pop=' + l.pop);
    if (l.aff >= 20 && (li === 0 || log[li-1].aff < 20)) milestones.push('回合' + l.round + '(Day' + l.day + '): 💚相识阶段 aff=' + l.aff);
    if (l.aff >= 60 && (li === 0 || log[li-1].aff < 60)) milestones.push('回合' + l.round + '(Day' + l.day + '): 💗心动阶段 aff=' + l.aff);
    if (l.aff >= 90 && (li === 0 || log[li-1].aff < 90)) milestones.push('回合' + l.round + '(Day' + l.day + '): 🔥热恋阶段 aff=' + l.aff);
    if (l.exp >= 10 && (li === 0 || log[li-1].exp < 10)) milestones.push('回合' + l.round + '(Day' + l.day + '): ⚠曝光达10 地下恋池启动');
  }
  milestones.forEach(function(m) { console.log('  ' + m); });
  console.log('');

  // ── 池子统计 ──
  console.log('【池子消耗统计】');
  console.log('  池子名'.padEnd(30) + '总量'.padEnd(8) + '用光?'.padEnd(6) + '利用率');
  console.log('  ' + '─'.repeat(60));

  var exhaustedCount = 0;
  var exhaustionPercentages = [];
  POOL_REGISTRY.forEach(function(reg) {
    var name = reg.name;
    var st = bestRun.poolState[name];
    var used = bestRun.usageLog[name].length;
    var pct = ((used / st.total) * 100).toFixed(0);
    var exhausted = used >= st.total ? '🔴耗尽' : (pct >= 80 ? '🟡警告' : '✅');
    if (used >= st.total) exhaustedCount++;
    exhaustionPercentages.push({ name: name, pct: parseInt(pct), used: used, total: st.total, exhausted: used >= st.total });
    console.log('  ' + name.padEnd(30) + String(st.total).padEnd(8) + exhausted.padEnd(6) + pct + '% (' + used + '/' + st.total + ')');
  });

  console.log('');
  console.log('  🔴 耗尽池子数: ' + exhaustedCount + ' / ' + POOL_REGISTRY.length);

  // 找出利用率>80%的
  var highUsage = exhaustionPercentages.filter(function(e) { return e.pct >= 80; });
  if (highUsage.length) {
    console.log('');
    console.log('【⚠ 高消耗池（≥80%）需要扩充】');
    highUsage.sort(function(a,b) { return b.pct - a.pct; });
    highUsage.forEach(function(e) {
      console.log('  ' + e.name + ': ' + e.used + '/' + e.total + ' (' + e.pct + '%) — 建议扩充到 ' + Math.ceil(e.total * 1.5) + ' 条');
    });
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  总场景素材: ' + TOTAL_ITEMS + ' 条');
  console.log('  模板次消耗: ~' + bestRun.totalRounds + ' 轮 × ~3条/轮 ≈ ' + (bestRun.totalRounds * 3) + ' 条次');
  console.log('  若不重复约束: ' + TOTAL_ITEMS + ' 条 ÷ ' + bestRun.totalRounds + ' 轮 = ' + (TOTAL_ITEMS / bestRun.totalRounds).toFixed(1) + ' 条/轮预算');
  console.log('═══════════════════════════════════════════');
}

runMultiSim(3);
