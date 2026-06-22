// ==================== X档案故事缓存系统 ====================
// 缓存规则：
// 1. 女主↔X 恋爱档案：按「成员组合 + 女主职业 + 性格（30%以上重合命中）」缓存
// 2. 场外X分手故事：按「成员ID」缓存，同一成员只生成一次

var STORY_CACHE_KEY = 'svt_story_cache_v1';

function getCache() {
  try {
    var raw = localStorage.getItem(STORY_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[StoryCache] load failed:', e);
  }
  return { mainStories: {}, memberStories: {}, xItems: {} };
}

function saveCache(cache) {
  try {
    localStorage.setItem(STORY_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('[StoryCache] save failed:', e);
  }
}

// 成员组合 key：X_id + 其他成员排序
export function getMemberComboKey(selectedMembers, secretX) {
  var others = selectedMembers.filter(function(id) { return id !== secretX; });
  others.sort();
  return secretX + '|' + others.join(',');
}

// 计算性格重合率（p1 是缓存中的性格，p2 是当前性格）
function calcPersonalityMatch(p1, p2) {
  if (!p1 || !p1.length || !p2 || !p2.length) return 0;
  var match = 0;
  for (var i = 0; i < p1.length; i++) {
    if (p2.indexOf(p1[i]) >= 0) match++;
  }
  return match / p1.length;
}

// ==================== 女主↔X 恋爱档案缓存 ====================

export function findCachedMainStory(selectedMembers, secretX, heroineProfile) {
  var cache = getCache();
  var comboKey = getMemberComboKey(selectedMembers, secretX);
  var entries = cache.mainStories[comboKey];
  if (!entries || !entries.length) return null;

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.job !== heroineProfile.job) continue;
    var matchRate = calcPersonalityMatch(e.personality, heroineProfile.personality);
    if (matchRate >= 0.3) {
      console.log('[StoryCache] 命中女主↔X恋爱档案缓存（性格重合率 ' + (matchRate * 100).toFixed(0) + '%）');
      return e.data;
    }
  }
  return null;
}

export function saveMainStoryToCache(selectedMembers, secretX, heroineProfile, data) {
  var cache = getCache();
  var comboKey = getMemberComboKey(selectedMembers, secretX);
  if (!cache.mainStories[comboKey]) cache.mainStories[comboKey] = [];
  cache.mainStories[comboKey].push({
    job: heroineProfile.job,
    personality: heroineProfile.personality.slice().sort(),
    data: data
  });
  saveCache(cache);
  console.log('[StoryCache] 已缓存女主↔X恋爱档案');
}

// ==================== 场外X分手故事缓存 ====================

export function findCachedMemberStory(memberId) {
  var cache = getCache();
  return cache.memberStories[memberId] || null;
}

export function saveMemberStoryToCache(memberId, data) {
  var cache = getCache();
  cache.memberStories[memberId] = data;
  saveCache(cache);
  console.log('[StoryCache] 已缓存场外X档案：' + memberId);
}

// ==================== 缓存管理 ====================

export function clearStoryCache() {
  localStorage.removeItem(STORY_CACHE_KEY);
  console.log('[StoryCache] 故事缓存已清除');
}

export function getStoryCacheStats() {
  var cache = getCache();
  var mainCount = 0;
  for (var k in cache.mainStories) {
    mainCount += cache.mainStories[k].length;
  }
  var memberCount = 0;
  for (var _ in cache.memberStories) memberCount++;
  var xItemsCount = 0;
  for (var __ in cache.xItems) xItemsCount++;
  return { mainStories: mainCount, memberStories: memberCount, xItems: xItemsCount };
}

// ==================== X记忆物品缓存 ====================

export function findCachedXItems(comboKey) {
  var cache = getCache();
  return cache.xItems[comboKey] || null;
}

export function saveXItemsToCache(comboKey, items) {
  var cache = getCache();
  var count = 0;
  for (var k in cache.xItems) count++;
  if (count >= 50 && !cache.xItems[comboKey]) {
    // 缓存已满50个组合，随机替换一个
    var keys = Object.keys(cache.xItems);
    var delKey = keys[Math.floor(Math.random() * keys.length)];
    delete cache.xItems[delKey];
  }
  cache.xItems[comboKey] = items;
  saveCache(cache);
  console.log('[StoryCache] 已缓存X记忆物品：' + comboKey);
}
