// ============================================================
// 系统7 章节生态：练习生期 / 出道期 / 巅峰期 / 传奇期
// enterChapter（切章动画由 UI 负责）· checkChapterAdvance（人气/回合驱动）
// ============================================================
import { GS, saveGame } from '../state.js';
import { CHAPTERS, chapterIcon } from './data.js';
import { popularity } from './state.js';

// 进入指定章节
export function enterChapter(idx) {
  var E = GS.entSim;
  if (idx < 1 || idx > CHAPTERS.length) return null;
  E.chapter.index = idx;
  E.chapter.name = CHAPTERS[idx - 1].name;
  E.chapter.roundInChapter = 0;
  E.chapter.entered = true;
  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'chapter', text: '★ 进入' + E.chapter.name });
  saveGame();
  return {
    index: idx,
    name: E.chapter.name,
    icon: CHAPTERS[idx - 1].icon,
    desc: CHAPTERS[idx - 1].desc
  };
}

// 检测是否应推进章节（人气阈值 + 章节内最少回合）
export function checkChapterAdvance() {
  var E = GS.entSim;
  var pop = popularity();
  var minRound = 6; // 每章至少 6 回合
  var cur = E.chapter.index;
  // 章节门槛：出道期 pop>=35，巅峰期 pop>=65，传奇期 pop>=88
  var thresholds = { 1: 35, 2: 65, 3: 88 };
  if (cur < CHAPTERS.length && E.chapter.roundInChapter >= minRound && pop >= (thresholds[cur] || 999)) {
    return cur + 1;
  }
  return null;
}

export function getChapterMeta() {
  var c = GS.entSim.chapter;
  var meta = CHAPTERS[c.index - 1] || CHAPTERS[0];
  return { index: c.index, name: c.name, icon: meta.icon, desc: meta.desc, roundInChapter: c.roundInChapter };
}

export function chapterIconOf(idx) { return chapterIcon(idx); }
