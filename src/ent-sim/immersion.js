// ============================================================
// 系统6 每日舆论被动生成：每日热搜 / 粉丝讨论 / 媒体标题
// 模板 + 随机，避免每轮都打 API。男主名/女主名注入。
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { DAILY_BUZZ_TEMPLATES } from './data.js';
import { popularity, maleLead, chapterName } from './state.js';

function fill(t) {
  var name = (GS.heroineProfile && GS.heroineProfile.name) || '你';
  var ml = maleLead().name || '他';
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

// 生成当日舆论素材（每轮刷新一次）
export function generateDailyBuzz() {
  var E = GS.entSim;
  var pop = popularity();
  // 热度越高，热搜条数越多
  var hsCount = Math.max(1, Math.round(pop / 25));
  var hotSearch = pickN(DAILY_BUZZ_TEMPLATES.hotSearch, Math.min(5, hsCount));
  var fanDiscussion = pickN(DAILY_BUZZ_TEMPLATES.fanDiscussion, 2);
  var mediaTitle = pickN(DAILY_BUZZ_TEMPLATES.mediaTitle, 2);
  // 章节名偶尔进入媒体标题
  if (Math.random() < 0.3) mediaTitle.push(fill('业内：{name} 在' + chapterName() + '表现亮眼'));
  E.dailyBuzz = {
    hotSearch: hotSearch,
    fanDiscussion: fanDiscussion,
    mediaTitle: mediaTitle,
    lastGenRound: E.cycle.roundTotal
  };
  saveGame();
  return E.dailyBuzz;
}

export function getDailyBuzz() {
  var E = GS.entSim;
  if (!E.dailyBuzz || E.dailyBuzz.lastGenRound !== E.cycle.roundTotal) return generateDailyBuzz();
  return E.dailyBuzz;
}
