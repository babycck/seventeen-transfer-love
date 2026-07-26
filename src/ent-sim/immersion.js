// ============================================================
// 系统6 每日舆论被动生成：每日热搜 / 粉丝讨论 / 媒体热议
// 模板 + 随机，避免每轮都打 API。男主名/女主名注入。
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { popularity, maleLead, chapterName } from './state.js';
import { buildEntSimSystemPrompt } from './prompts.js';
import { generateWithRetry } from '../ai-generator.js';
import { buildMemorySnapshot } from './memory.js';
import { HOT_SEARCH_REPLY_POOL, CHART_POOL, DIARY_TEMPLATES, DAILY_BUZZ, DAILY_BUZZ_TEMPLATES, EXTERNAL_HOT, pickFromPool, pickFromPoolMulti } from './pools/index.js';

function fill(t) {
  var name = (GS.heroineProfile && GS.heroineProfile.name) || '你';
  var ml = maleLead().name || '他';
  // {t,c} 对象：替换两个字段中的占位符
  if (typeof t === 'object' && t.t) {
    return { t: t.t.replace(/\{name\}/g, name).replace(/\{ml\}/g, ml), c: (t.c || '').replace(/\{name\}/g, name).replace(/\{ml\}/g, ml) };
  }
  return t.replace(/\{name\}/g, name).replace(/\{ml\}/g, ml);
}
function pickN(arr, n) {
  var copy = arr.slice();
  var out = [];
  for (var i = 0; i < n && copy.length; i++) {
    out.push(fill(copy.splice(randInt(0, copy.length - 1), 1)[0]));
  }
  return out;
}

// 生成当日舆论素材：1-2 条女主相关 + 其余用娱乐圈通用八卦填充
// 外部话题池（不带 {name}，纯虚构娱乐圈八卦/风向/数据）
// EXTERNAL_HOT 已迁移至 pools/external-hot.js
// 辅助：从 {t,c} 对象或字符串中提取标题文本
export function buzzTitle(item) { return (typeof item === 'object' && item.t) ? item.t : item; }
export function buzzContent(item) { return (typeof item === 'object' && item.c) ? item.c : ''; }
function buzzByTitle(list, title) {
  for (var i = 0; i < list.length; i++) { if (buzzTitle(list[i]) === title) return true; }
  return false;
}

export function generateDailyBuzz() {
  var E = GS.entSim;
  var pop = popularity();
  var isDebut = (E.career && E.career.debutDay > 0);
  var hsCount = Math.max(3, Math.round(pop / 20));
  // 练习生阶段：不生成女主相关热搜，仅外部圈内话题
  var hotSearch = [];
  E._lastHotTitles = E._lastHotTitles || [];
  if (isDebut) {
    hotSearch = pickN(DAILY_BUZZ.hotSearch.concat(DAILY_BUZZ_TEMPLATES.hotSearch), 1).map(function(it) {
      return { t: fill(it.t), c: fill(it.c || it.t) };
    });
  }
  // 右边面板热搜（练习生阶段减少到最多2条外部话题）
  var maxPanel = isDebut ? Math.min(5, hsCount) : Math.min(2, Math.max(1, hsCount));
  while (hotSearch.length < maxPanel) {
    var ext = EXTERNAL_HOT[randInt(0, EXTERNAL_HOT.length - 1)];
    var extTitle = buzzTitle(ext);
    if (!buzzByTitle(hotSearch, extTitle) && E._lastHotTitles.indexOf(extTitle) < 0) hotSearch.push(ext);
  }
  // 星圈独立热搜（练习生阶段不生成）
  var starHot = [];
  if (isDebut) {
    var hsTitleSet = hotSearch.map(buzzTitle);
    while (starHot.length < Math.min(5, hsCount)) {
      var ext2 = EXTERNAL_HOT[randInt(0, EXTERNAL_HOT.length - 1)];
      var extTitle2 = buzzTitle(ext2);
      if (!buzzByTitle(starHot, extTitle2) && hsTitleSet.indexOf(extTitle2) < 0 && E._lastHotTitles.indexOf(extTitle2) < 0) starHot.push(ext2);
    }
  }
  E._lastHotTitles = hotSearch.map(buzzTitle).concat(starHot.map(buzzTitle));
  // 粉丝讨论：仅出道后才注入 CP 向讨论
  E._lastFanTitles = E._lastFanTitles || [];
  var fanDiscussion = [];
  if (isDebut && Math.random() < 0.3 && E.romance && E.romance.maleLead && E.romance.maleLead.name) {
    var hFans = [
      '粉丝发现' + (E.heroineGroup && E.heroineGroup[0] ? E.heroineGroup[0].name : '女主') + '和' + E.romance.maleLead.name + '戴了同款手链——是巧合还是情侣款？',
      '有人在签售会问' + (E.heroineGroup && E.heroineGroup[0] ? E.heroineGroup[0].name : '女主') + '理想型，她描述的形象被指和某位SEVENTEEN成员高度重合',
      '两个团的粉丝在超话吵起来了——原因是有人说' + E.romance.maleLead.name + '最近采访里多次提到另一个团',
      '站姐发了一张下班照，背景里有人穿着和' + (E.heroineGroup && E.heroineGroup[0] ? E.heroineGroup[0].name : '女主') + '前几天穿的同款卫衣',
      '论坛热帖：' + (E.heroineGroup && E.heroineGroup[0] ? E.heroineGroup[0].name : '她') + '的泡泡里提到最近在听一首歌，刚好是某位成员的solo曲',
      '有人翻出三个月前的打歌后台合照，发现' + E.romance.maleLead.name + '的眼神方向刚好是' + (E.heroineGroup && E.heroineGroup[0] ? E.heroineGroup[0].name : '她') + '站的位置'
    ];
    fanDiscussion.push({ t: hFans[randInt(0, hFans.length - 1)], c: '' });
  }
  while (fanDiscussion.length < 3) {
    var fe = DAILY_BUZZ_TEMPLATES.fanDiscussion[randInt(0, DAILY_BUZZ_TEMPLATES.fanDiscussion.length - 1)];
    var feFilled = fill(fe);
    var feTitle = buzzTitle(feFilled);
    if (!buzzByTitle(fanDiscussion, feTitle) && E._lastFanTitles.indexOf(feTitle) < 0) fanDiscussion.push(feFilled);
  }
  E._lastFanTitles = fanDiscussion.map(buzzTitle);
  // 媒体标题：全部外部（不包含女主）
  E._lastMediaTitles = E._lastMediaTitles || [];
  var mediaTitle = [];
  while (mediaTitle.length < 2) {
    var me = DAILY_BUZZ_TEMPLATES.mediaTitle[randInt(0, DAILY_BUZZ_TEMPLATES.mediaTitle.length - 1)];
    var meFilled = fill(me);
    var meTitle = buzzTitle(meFilled);
    if (!buzzByTitle(mediaTitle, meTitle) && E._lastMediaTitles.indexOf(meTitle) < 0) mediaTitle.push(meFilled);
  }
  E._lastMediaTitles = mediaTitle.map(buzzTitle);
  // 清除旧日的网友热议缓存，避免新条目显示昨天的评论
  E.buzzReplies = {};
  // 音源榜：仅出道后有（练习生没有发歌，不上榜）
  var chartItem = null;
  if (isDebut && CHART_POOL && CHART_POOL.length) chartItem = CHART_POOL[randInt(0, CHART_POOL.length - 1)];
  E.dailyBuzz = {
    hotSearch: hotSearch,
    starHot: starHot,
    fanDiscussion: fanDiscussion,
    mediaTitle: mediaTitle,
    chartItem: chartItem,
    lastGenDay: E.cycle.dayCount
  };
  saveGame();
  return E.dailyBuzz;
}

export function getDailyBuzz() {
  var E = GS.entSim;
  if (!E.dailyBuzz || E.dailyBuzz.lastGenDay !== E.cycle.dayCount) return generateDailyBuzz();
  return E.dailyBuzz;
}

// 女主相关舆论条目 → 优先生成网友热议评论（池子匹配 > AI兜底）
export async function generateBuzzRepliesAI(itemTitle, itemContent) {
  // 1. 先在池子里找匹配的热搜
  if (HOT_SEARCH_REPLY_POOL && HOT_SEARCH_REPLY_POOL.length) {
    var match = null;
    for (var i = 0; i < HOT_SEARCH_REPLY_POOL.length; i++) {
      var entry = HOT_SEARCH_REPLY_POOL[i];
      if (itemTitle && entry.hotSearch && entry.hotSearch.indexOf(itemTitle) !== -1) { match = entry; break; }
    }
    // 未精确匹配时随机取一条兜底
    if (!match) match = pickFromPool(HOT_SEARCH_REPLY_POOL, 1)[0];
    if (match && match.fanReplies && match.fanReplies.length >= 2) {
      return match.fanReplies.slice(0, 3).map(function(r) { return '· ' + r; });
    }
  }
  // 2. 池子无匹配 → AI 兜底
  var sys = buildEntSimSystemPrompt('buzzreply');
  var user = [
    '【任务】为下面这条热搜/新闻生成 3 条网友热议评论（每条 40-80 字，不要 JSON）。',
    '【热点内容】标题：' + itemTitle + (itemContent ? '\n内容：' + itemContent : ''),
    '【要求】三条评论分别代表路人/粉丝/黑粉视角，每条前用 · 开头，直接输出'
  ].join('\n');
  try {
    var res = await generateWithRetry(sys, user, { plainText: true, skipValidate: true, maxTokens: 500, temperature: 0.9, sceneType: 'buzzreply' });
    var text = (res && res.raw) ? res.raw : '';
    var lines = text.split('\n').filter(function(l) { return l.trim(); }).map(function(l) { return l.trim(); });
    if (lines.length >= 2) return lines.slice(0, 3);
    return ['· 等一个后续', '· 大家怎么看？'];
  } catch (e) { return null; }
}

// 营业/曝光后生成"粉丝圈反应"短文（大粉/路人/黑粉三视角），存入 E.fanReactions
// reason: 短标签（如「曝光」）；eventDetail: 长文本描述具体发生了什么（如「狗仔拍到你和男主深夜同车」）
export async function generateFanReaction(reason, eventDetail) {
  var E = GS.entSim;
  if (!E) return '';
  var sys = buildEntSimSystemPrompt('fanreaction');
  var buzz = E.dailyBuzz || {};
  var eventDesc = eventDetail || reason || '近期营业 / 曝光事件';
  var user = [
    '【任务】生成一段"粉丝圈反应"短文（纯文本，150-250 字，不要 JSON，不要标题）。',
    '【触发背景】' + eventDesc,
    '【要求】分三个视角：①大粉（死忠）如何解读 ②路人怎么看 ③黑粉/对家粉如何攻击。语气真实、带网络感，可用饭圈用语（直拍/舞台/塌房/对家/毒唯等）。',
    '【当前舆论面】热搜：' + (buzz.hotSearch || []).map(buzzTitle).join(' / ') + '；粉丝讨论：' + (buzz.fanDiscussion || []).map(buzzTitle).join(' / '),
    '【记忆摘要】\n' + buildMemorySnapshot(),
    '直接输出纯文本，按 "·大粉："、"·路人："、"·黑粉：" 三段开头。'
  ].join('\n');
  try {
    var res = await generateWithRetry(sys, user, { plainText: true, skipValidate: true, maxTokens: 800, temperature: 0.85, sceneType: 'fanreaction' });
    var text = res.raw || '';
    E.fanReactions = E.fanReactions || [];
    E.fanReactions.push({ round: E.cycle.roundTotal, reason: reason || '', event: eventDetail || '', text: text });
    if (E.fanReactions.length > 6) E.fanReactions = E.fanReactions.slice(-6);
    saveGame();
    return text;
  } catch (e) { return ''; }
}
