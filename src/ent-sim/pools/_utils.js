// ============================================================
// entSim pools · 工具函数
// pickFromPool：按类别过滤 + 轮替避免重复
// ============================================================

// 内联真实日历（避免循环import state.js）
function _inlineMonthDay(dayCount) {
  var rem = (dayCount || 1) - 1;
  var y = 2024;
  while (true) {
    var diy = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0) ? 366 : 365;
    if (rem < diy) break;
    rem -= diy;
    y++;
  }
  var dimArr = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var m = 1;
  for (var i = 0; i < 12; i++) {
    var dim = dimArr[i];
    if (i === 1 && ((y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0))) dim = 29;
    if (rem < dim) return { month: m, day: rem + 1 };
    rem -= dim;
    m++;
  }
  return { month: 12, day: rem + 1 };
}

// 从给定池子中随机抽取一条（可指定cat过滤）
export function pickFromPool(pool, cat) {
  if (!pool || !pool.length) return null;
  if (cat) {
    var filtered = [];
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].cat === cat) filtered.push(pool[i]);
    }
    if (!filtered.length) filtered = pool; // 兜底回全池
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// 从池子中抽取N条不重复的条目（可指定cat过滤）
export function pickFromPoolMulti(pool, n, cat) {
  if (!pool || !pool.length || n <= 0) return [];
  var candidates = cat ? pool.filter(function(p) { return p.cat === cat; }) : pool.slice();
  if (!candidates.length) candidates = pool.slice();
  var result = [];
  var tmp = candidates.slice();
  for (var i = 0; i < n && tmp.length; i++) {
    var idx = Math.floor(Math.random() * tmp.length);
    result.push(tmp.splice(idx, 1)[0]);
  }
  return result;
}

// 从条目的 fanReactions 子数组中随机抽取N条
export function pickFanReactions(item, n) {
  if (!item || !item.fanReactions || !item.fanReactions.length) return [];
  n = n || 3;
  var result = [];
  var pool = item.fanReactions.slice();
  for (var i = 0; i < n && pool.length; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

// 轮替抽取：基于上次抽取索引避免连续重复
var _lastPickIndex = {};
export function pickFromPoolRotate(pool, key, cat) {
  if (!pool || !pool.length) return null;
  key = key || 'default';
  var candidates = cat ? pool.filter(function(p) { return p.cat === cat; }) : pool.slice();
  if (!candidates.length) candidates = pool.slice();
  var lastIdx = _lastPickIndex[key] || -1;
  var idx;
  if (candidates.length === 1) {
    idx = 0;
  } else {
    do { idx = Math.floor(Math.random() * candidates.length); } while (idx === lastIdx && candidates.length > 1);
  }
  _lastPickIndex[key] = idx;
  return candidates[idx];
}

// 防重复抽取：排除 usedArr 中近 maxAvoid 条已用 key，短期不重复
// usedArr: 调用方维护的引用数组，函数内部直接 push/shift 修改
export function pickFromPoolNoRepeat(pool, usedArr, maxAvoid, cat) {
  usedArr = usedArr || [];
  maxAvoid = maxAvoid || 10;
  if (!pool || !pool.length) return null;
  // 池子太小时自动缩小回避窗口
  if (pool.length < maxAvoid * 2) maxAvoid = Math.max(1, Math.floor(pool.length / 3));
  // 候选：过滤掉 usedArr 中的 key
  var usedSet = {};
  for (var i = 0; i < usedArr.length; i++) usedSet[usedArr[i]] = true;
  var candidates = pool.filter(function(p) {
    var k = typeof p === 'string' ? p : (p.key || '');
    return !usedSet[k];
  });
  // 再按 cat 过滤
  if (cat && candidates.length > 1) {
    candidates = candidates.filter(function(p) { return p.cat === cat; });
  }
  // fallback：候选不足时清空 usedArr，全池随机
  if (!candidates.length) {
    usedArr.length = 0;
    candidates = cat ? pool.filter(function(p) { return p.cat === cat; }) : pool.slice();
    if (!candidates.length) candidates = pool.slice();
  }
  var pick = candidates[Math.floor(Math.random() * candidates.length)];
  var pickKey = typeof pick === 'string' ? pick : (pick.key || '');
  usedArr.push(pickKey);
  if (usedArr.length > maxAvoid) usedArr.shift();
  return pick;
}

// ===== 数据驱动调度 =====
// 解析require条件字符串，判断条目是否可触发
// 支持：'debut'/'trainee'/'traineePhase=N'/'aff>=N'/'chapter>=N'/'romance>=N'/'season=winter'/'month=N'
// 复合条件：&&=全部满足, ||=任一满足（||优先级高于&&，先拆||再拆&&）
export function canTrigger(entry, E) {
  if (!entry || !entry.require) return true;
  var req = entry.require;
  if (typeof req !== 'string') return true;
  // 先拆分顶层&&（如 'debut&&month=12||month=1||month=2' → ['debut', 'month=12||month=1||month=2']）
  var parts = req.split('&&');
  for (var pi = 0; pi < parts.length; pi++) {
    var part = parts[pi].trim();
    if (!_checkOrGroup(part, E)) return false;
  }
  return true;
}
// 处理||组：任一子条件满足即通过
function _checkOrGroup(grp, E) {
  if (!grp) return true;
  if (grp.indexOf('||') === -1) return _checkSingle(grp, E);
  var subParts = grp.split('||');
  for (var si = 0; si < subParts.length; si++) {
    if (_checkSingle(subParts[si].trim(), E)) return true;
  }
  return false;
}
// 单条件检查
function _checkSingle(req, E) {
  if (!req) return true;
  // 'debut' → debutDay > 0
  if (req === 'debut') return E && E.career && E.career.debutDay > 0;
  // 'trainee' → debutDay === 0
  if (req === 'trainee') return E && E.career && E.career.debutDay === 0;
  // 'traineePhase=N' → 练习生子阶段
  var tpMatch = req.match(/^traineePhase=(\d)$/);
  if (tpMatch) return E && E.career && (E.career.traineePhase || 1) === parseInt(tpMatch[1], 10);
  // 'aff>=N' → 好感度门槛
  var affMatch = req.match(/^aff>=(\d+)$/);
  if (affMatch) return E && (E.affection || 0) >= parseInt(affMatch[1], 10);
  // 'chapter>=N' → 章节等级门槛
  var chMatch = req.match(/^chapter>=(\d+)$/);
  if (chMatch) return E && E.chapter && (E.chapter.index || 1) >= parseInt(chMatch[1], 10);
  // 'romance>=N' → 好感阶段（0=初识 1=暧昧 2=约会 3=恋爱 4=公开）
  var romMatch = req.match(/^romance>=(\d+)$/);
  if (romMatch) {
    var stage = 0;
    var aff = E ? (E.affection || 0) : 0;
    var chapter = E && E.chapter ? (E.chapter.index || 1) : 1;
    var debut = E && E.career ? (E.career.debutDay || 0) : 0;
    if (aff >= 85 && chapter >= 4) stage = 4;
    else if (aff >= 70 && chapter >= 2) stage = 3;
    else if (aff >= 50 && debut > 0) stage = 2;
    else if (aff >= 20) stage = 1;
    return stage >= parseInt(romMatch[1], 10);
  }
  // 'season=winter|spring|summer|autumn' → 季节过滤（防夏天下雪）
  var sMatch = req.match(/^season=(winter|spring|summer|autumn)$/);
  if (sMatch) {
    var dayCount = E && E.cycle ? (E.cycle.dayCount || 1) : 1;
    var _md = _inlineMonthDay(dayCount);
    var curSeason = _md.month === 12 || _md.month <= 2 ? 'winter' : _md.month >= 3 && _md.month <= 5 ? 'spring' : _md.month >= 5 && _md.month <= 7 ? 'summer' : 'autumn';
    return curSeason === sMatch[1];
  }
  // 'month=N' → 月份过滤（防7月过情人节）
  var mMatch = req.match(/^month=(\d+)$/);
  if (mMatch) {
    var _dayCount = E && E.cycle ? (E.cycle.dayCount || 1) : 1;
    return _inlineMonthDay(_dayCount).month === parseInt(mMatch[1], 10);
  }
  // 'birthday=heroine|brother|ml|rival' → 仅今天该人生日时触发
  var bdMatch = req.match(/^birthday=(heroine|brother|ml|rival)$/);
  if (bdMatch) {
    var bDayCount = E && E.cycle ? (E.cycle.dayCount || 1) : 1;
    var bdays = E && E.career ? E.career._birthdays : null;
    if (!bdays) return false;
    var _md2 = _inlineMonthDay(bDayCount);
    var today = _md2.month + '-' + _md2.day;
    return bdays[bdMatch[1]] === today;
  }
  // 'popularity>=N' / 'pop>=N' → 人气档位门控
  var popGeMatch = req.match(/^(?:pop|popularity)>=(\d+)$/);
  if (popGeMatch) return E && E.career && (E.career.popularity || 0) >= parseInt(popGeMatch[1], 10);
  // 'popularity<N' / 'pop<N' → 人气上限门控
  var popLtMatch = req.match(/^(?:pop|popularity)<(\d+)$/);
  if (popLtMatch) return E && E.career && (E.career.popularity || 0) < parseInt(popLtMatch[1], 10);
  // 'scandalHeat>=N' → 丑闻热度门控（曝光风险累计值，存储在 E.misc.scandalHeat）
  var shMatch = req.match(/^scandalHeat>=(\d+)$/);
  if (shMatch) return E && E.misc && (E.misc.scandalHeat || 0) >= parseInt(shMatch[1], 10);
  // 'contractRemaining<=N' → 合约剩余年限门控（存储在 E.career.contractRemaining）
  var crMatch = req.match(/^contractRemaining<=(\d+)$/);
  if (crMatch) return E && E.career && (E.career.contractRemaining || 99) <= parseInt(crMatch[1], 10);
  // 'mainline=节点ID' → 主线节点已完成门控（未实现主线系统时默认放行=向后兼容）
  var mlMatch = req.match(/^mainline=(\w+)$/);
  if (mlMatch) {
    var completed = E && E._mainlineCompleted ? E._mainlineCompleted : null;
    if (!completed) return true; // 主线系统未就绪→放行
    return completed.indexOf(mlMatch[1]) >= 0;
  }
  return true;
}

// 过滤池子：只返回满足require条件的条目；如果全部不满足则返回原池兜底
export function filterByRequire(pool, E) {
  if (!pool || !pool.length) return pool;
  var out = [];
  for (var i = 0; i < pool.length; i++) {
    if (canTrigger(pool[i], E)) out.push(pool[i]);
  }
  return out.length ? out : pool;
}
