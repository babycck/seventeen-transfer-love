// ============================================================
// entSim pools · 工具函数
// pickFromPool：按类别过滤 + 轮替避免重复
// ============================================================

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

// ===== 数据驱动调度 =====
// 解析require条件字符串，判断条目是否可触发
// 支持：'debut'/'trainee'/'traineePhase=N'/'aff>=N'/'chapter>=N'/'romance>=N'/'season=winter'/'month=N'
// 复合条件用&&连接（如'month=2&&debut'），全部满足才通过
export function canTrigger(entry, E) {
  if (!entry || !entry.require) return true;
  var req = entry.require;
  if (typeof req !== 'string') return true;
  // 拆分&&复合条件，逐一检查
  var parts = req.split('&&');
  for (var pi = 0; pi < parts.length; pi++) {
    var part = parts[pi].trim();
    if (!_checkSingle(part, E)) return false;
  }
  return true;
}
// 单条件检查
function _checkSingle(req, E) {
  if (!req) return true;
  // 'debut' → debutDay > 0
  if (req === 'debut') return E && E.career && E.career.debutDay > 0;
  // 'trainee' → debutDay === 0
  if (req === 'trainee') return E && E.career && E.career.debutDay === 0;
  // 'traineePhase=N' → 练习生子阶段
  var tpMatch = req.match(/traineePhase=(\d)/);
  if (tpMatch) return E && E.career && (E.career.traineePhase || 1) === parseInt(tpMatch[1], 10);
  // 'aff>=N' → 好感度门槛
  var affMatch = req.match(/aff>=(\d+)/);
  if (affMatch) return E && (E.affection || 0) >= parseInt(affMatch[1], 10);
  // 'chapter>=N' → 章节等级门槛
  var chMatch = req.match(/chapter>=(\d+)/);
  if (chMatch) return E && E.chapter && (E.chapter.index || 1) >= parseInt(chMatch[1], 10);
  // 'romance>=N' → 好感阶段（0=初识 1=暧昧 2=约会 3=恋爱 4=公开）
  var romMatch = req.match(/romance>=(\d+)/);
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
  var sMatch = req.match(/season=(winter|spring|summer|autumn)/);
  if (sMatch) {
    var dayCount = E && E.cycle ? (E.cycle.dayCount || 1) : 1;
    // 延迟import避免循环依赖，内联季节计算
    var m = Math.floor(((dayCount - 1) % 365) / 30);
    var curSeason = m === 11 || m <= 1 ? 'winter' : m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : 'autumn';
    return curSeason === sMatch[1];
  }
  // 'month=N' → 月份过滤（防7月过情人节）
  var mMatch = req.match(/month=(\d+)/);
  if (mMatch) {
    var _dayCount = E && E.cycle ? (E.cycle.dayCount || 1) : 1;
    var curMonth = Math.floor(((_dayCount - 1) % 365) / 30) + 1;
    return curMonth === parseInt(mMatch[1], 10);
  }
  // 'birthday=heroine|brother|ml|rival' → 仅今天该人生日时触发
  var bdMatch = req.match(/birthday=(heroine|brother|ml|rival)/);
  if (bdMatch) {
    var bDayCount = E && E.cycle ? (E.cycle.dayCount || 1) : 1;
    var bdays = E && E.career ? E.career._birthdays : null;
    if (!bdays) return false;
    var bm = Math.floor(((bDayCount - 1) % 365) / 30) + 1;
    var bd = ((bDayCount - 1) % 365) % 30 + 1;
    var today = bm + '-' + bd;
    return bdays[bdMatch[1]] === today;
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
