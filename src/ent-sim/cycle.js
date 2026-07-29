// ============================================================
// 系统1 周期系统：时段氛围 + 每日行程抽取
// 日程池已迁移至 pools/ent-schedules.js
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import {
  COMMON_POOL, RELATED_POOL, TRAINEE_POOL,
  CHAPTER1_NOVICE, CHAPTER2_SPROUTING, CHAPTER2_RISING, CHAPTER3_PEAK, CHAPTER5_TOPSTAR, CHAPTER4_LEGEND, BOYGROUP_POOL,
  TRAINEE_EARLY_POOL, TRAINEE_MID_POOL, TRAINEE_LATE_POOL
} from './pools/index.js';
import { filterByRequire, pickFromPoolRotate } from './pools/_utils.js';

var TIME_SLOTS = ['上午', '下午', '夜晚'];
var SLOTS_PER_DAY = 3;

// 恋爱风险倍率
export function getRomanceRiskMultiplier() { return 1.0; }

// 当前时段标签
export function getTimeOfDayLabel() {
  return TIME_SLOTS[(GS.entSim.cycle.timeOfDay || 0) % SLOTS_PER_DAY];
}

// 男主专用池：过滤掉海外行程
var MALE_LEAD_POOL = [];
for (var _mi = 0; _mi < BOYGROUP_POOL.length; _mi++) {
  if (BOYGROUP_POOL[_mi].key !== '海外行程' && BOYGROUP_POOL[_mi].key !== '机场出发') {
    MALE_LEAD_POOL.push(BOYGROUP_POOL[_mi]);
  }
}
var RIVAL_POOL = BOYGROUP_POOL;
var BROTHER_POOL = BOYGROUP_POOL;

function mainPoolByCareer(careerKey) {
  // 练习生阶段用练习生池，出道后由章节池接管（mainPoolByCareer不再被出道后使用）
  return TRAINEE_POOL;
}

function chapterPoolByIndex(idx) {
  if (idx >= 6) return CHAPTER4_LEGEND;    // 传奇殿堂
  if (idx >= 5) return CHAPTER5_TOPSTAR;    // 顶流巨星
  if (idx >= 4) return CHAPTER3_PEAK;       // 人气偶像
  if (idx >= 3) return CHAPTER2_RISING;     // 稳步上升
  if (idx >= 2) return CHAPTER2_SPROUTING;  // 崭露头角
  return CHAPTER1_NOVICE;                   // 新人出道
}

export function rollDailyAgenda() {
  var E = GS.entSim;
  var careerKey = (E.career && E.career.careerKey) || '';
  var profession = E.career && E.career.profession;
  var pool = mainPoolByCareer(profession || careerKey);
  var chapterIdx = (E.chapter && E.chapter.index) || 1;
  var isDebut = (E.career && E.career.debutDay > 0);
  var today = E.cycle.dayCount;
  var scheduledMain = null;
  var scheduledLoc = '';
  var sched = E._scheduledEvents || [];
  for (var si = 0; si < sched.length; si++) {
    if (sched[si].targetDay === today && !sched[si].done) {
      scheduledMain = sched[si].text || sched[si].data.t;
      scheduledLoc = sched[si].loc || sched[si].data.loc || '';
      break;
    }
  }
  var main;
  if (scheduledMain) {
    main = { key: scheduledMain, loc: scheduledLoc };
  } else if (!isDebut) {
    // 练习生三分阶段：按traineePhase用filterByRequire分池抽取
    var tp = E.career.traineePhase || 1;
    var phasePool = tp === 1 ? TRAINEE_EARLY_POOL : tp === 2 ? TRAINEE_MID_POOL : TRAINEE_LATE_POOL;
    var validPool = filterByRequire(phasePool, E);
    main = pick(validPool.length ? validPool : TRAINEE_POOL);
  } else {
    var r = randInt(1, 100);
    if (r <= 70) main = pick(chapterPoolByIndex(chapterIdx)); // 70% 阶段专属 ← 主力
    else main = pick(COMMON_POOL);          // 30% 跨阶段通用
  }
  if (isDebut) {
    var relatedItem = RELATED_POOL[randInt(0, RELATED_POOL.length - 1)];
    var related = relatedItem;
    var relatedLoc = (relatedItem && relatedItem.loc) ? relatedItem.loc : '练习室';
    var rivalItem = RIVAL_POOL[randInt(0, RIVAL_POOL.length - 1)];
    var rival = rivalItem.key; var rivalLoc = rivalItem.loc || '公司';
    var maleItem = MALE_LEAD_POOL[randInt(0, MALE_LEAD_POOL.length - 1)];
    var maleLead = maleItem.key; var maleLeadLoc = maleItem.loc || '公司';
    var brother = (E.brother && E.brother.name) ? pick(BROTHER_POOL) : null;
    var brotherLoc = brother ? (brother.loc || '公司') : '';
  } else {
    // 练习生阶段：related从当前阶段池子抽，不重复
    var relatedItem = pickFromPoolRotate(validPool, 'trainee_related_' + tp);
    var related = relatedItem ? relatedItem.key : '基础训练';
    var relatedLoc = relatedItem ? (relatedItem.loc || '练习室') : '练习室';
    var rival = ''; var rivalLoc = '公司';
    var maleLead = '个人练习'; var maleLeadLoc = '练习室';
    var brother = null; var brotherLoc = '练习室';
  }
  E.agenda = {
    main: main.key, mainLoc: main.loc,
    related: related, relatedLoc: relatedLoc,
    rival: rival, rivalLoc: rivalLoc,
    maleLead: maleLead, maleLeadLoc: maleLeadLoc,
    brother: brother ? brother.key : '', brotherLoc: brother ? brother.loc : brotherLoc,
    doneFlags: {}
  };
  saveGame();
  return E.agenda;
}

export function getCyclePhaseLabel() { return '地下恋'; }
export function getCyclePhaseIcon() { return '💗'; }
export function getCycleStageLabel() { return '娱乐圈'; }
export function getCyclePhaseMeaning() { return '娱乐圈背景下的地下恋'; }

function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
