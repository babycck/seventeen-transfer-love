// ============================================================
// 系统2 作品槽：四阶段 筹备(0)→拍摄/制作(1)→宣发/在播(2)→已完结/收官(3)
// 在播作品数 ×2 = 资源等级加成（recomputeResourcesLevel，仅计 stage===2）
// 在播期持续 AIRING_DURATION 回合后自动收官/下档（stage→3），资源加成归零
// 反响由引擎在 stage 到达 2 时调用 AI 生成（needsBuzz 标记）
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { WORK_TYPES } from './data.js';
import { recomputeResourcesLevel } from './state.js';
import { applyOpinionImpact } from './public-opinion.js';

// 开新作品（玩家从事业面板触发，或合作企划完成时调用）
export function startWork(type, subject, title) {
  var E = GS.entSim;
  var def = WORK_TYPES[type] || WORK_TYPES.drama;
  var id = 'w' + (E.works.nextWorkId++);
  E.works.slots[id] = {
    id: id,
    type: type,
    title: title || def.defaultTitle,
    subject: subject || '',
    stage: 0,
    startRound: E.cycle.roundTotal,
    lastProgressRound: E.cycle.roundTotal,
    buzz: 0,
    needsBuzz: false
  };
  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'work', text: '新作品《' + (title || def.defaultTitle) + '》进入筹备' });
  saveGame();
  return id;
}

// 在播期持续回合后自动收官/下档
var AIRING_DURATION = 6;

// 每轮推进作品进度；返回到达在播期(stage 2)需要生成反响的作品列表
export function progressWorks() {
  var E = GS.entSim;
  var readyForBuzz = [];
  var now = E.cycle.roundTotal;
  for (var id in E.works.slots) {
    if (!Object.prototype.hasOwnProperty.call(E.works.slots, id)) continue;
    var w = E.works.slots[id];
    if (w.stage >= 3) continue; // 已完结/收官，不再推进
    if (w.stage === 2) {
      w.buzz = Math.min(100, w.buzz + randInt(1, 4));
      // 在播期满 → 收官/下档
      if (now - w.lastProgressRound >= AIRING_DURATION) {
        w.lastProgressRound = now;
        w.stage = 3;
        E.careerHistory.push({ round: now, type: 'work', text: '《' + w.title + '》收官·已下档' });
      }
      continue;
    }
    // 筹备/制作期：每 2 回合进阶一级
    if (now - w.lastProgressRound >= 2) {
      w.lastProgressRound = now;
      w.stage++;
      if (w.stage === 2) {
        w.needsBuzz = true;
        readyForBuzz.push(w);
      }
      E.careerHistory.push({ round: now, type: 'work', text: '《' + w.title + '》进入' + (w.stage === 1 ? '拍摄/制作' : '宣发/在播') });
    }
  }
  recomputeResourcesLevel();
  saveGame();
  return readyForBuzz;
}

// 应用 AI 生成的在播反响（引擎调用）
export function applyWorkBuzz(id, buzzDelta, note) {
  var w = GS.entSim.works.slots[id];
  if (!w) return null;
  w.buzz = Math.max(0, Math.min(100, w.buzz + (buzzDelta || 0)));
  w.needsBuzz = false;
  if (note) GS.entSim.careerHistory.push({ round: GS.entSim.cycle.roundTotal, type: 'work', text: '《' + w.title + '》反响：' + note });
  // 在播作品带来人气 + 媒体关注
  applyOpinionImpact({ fan: 1, media: 1 }, '作品在播《' + w.title + '》');
  saveGame();
  return w;
}

export function getWorks() {
  var slots = GS.entSim.works.slots;
  var out = [];
  for (var id in slots) {
    if (!Object.prototype.hasOwnProperty.call(slots, id)) continue;
    var w = slots[id];
    out.push({
      id: w.id, type: w.type, typeLabel: (WORK_TYPES[w.type] || {}).label || w.type,
      icon: (WORK_TYPES[w.type] || {}).icon || '🎬',
      title: w.title, subject: w.subject, stage: w.stage,
      stageLabel: ['筹备期', '拍摄/制作期', '宣发/在播期', '已完结/收官期'][w.stage] || '已完结/收官期',
      buzz: w.buzz, needsBuzz: !!w.needsBuzz
    });
  }
  return out;
}

export function workTypes() { return WORK_TYPES; }
