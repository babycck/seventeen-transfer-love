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
