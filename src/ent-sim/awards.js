// ============================================================
// 系统C 颁奖：提名（每 8 回合）→ 颁奖礼（红毯同台避嫌 / 感言选择）
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { AWARDS_POOL } from './data.js';
import { applyOpinionImpact } from './public-opinion.js';

// 每 8 回合检测提名
export function maybeNominateAwards() {
  var E = GS.entSim;
  var round = E.cycle.roundTotal;
  if (round > 0 && round % 8 === 0) {
    var name = AWARDS_POOL[randInt(0, AWARDS_POOL.length - 1)];
    E.flags.awardsNom = { name: name, nominee: (E.heroineProfile && E.heroineProfile.name) || '你', round: round, resolved: false };
    E.careerHistory.push({ round: round, type: 'awards', text: '入围' + name });
    saveGame();
    return { nominated: true, name: name };
  }
  return { nominated: false };
}

// 进入颁奖礼（章末自动触发或玩家点击徽章）
export function enterAwardsCeremony() {
  var E = GS.entSim;
  if (!E.flags.awardsNom || E.flags.awardsNom.resolved) return null;
  E.flags.awardsActive = { name: E.flags.awardsNom.name, round: E.cycle.roundTotal };
  saveGame();
  return { name: E.flags.awardsNom.name };
}

// 颁奖礼决策（红毯避嫌 / 感言）
export function resolveAwards(choice) {
  var E = GS.entSim;
  var deltas = {};
  var note = '';
  if (choice === 'avoid_red_carpet') {
    deltas = { media: -2, fan: 1 }; note = '你避开红毯同台，媒体略失望但避了嫌';
  } else if (choice === 'red_carpet_together') {
    deltas = { media: 4, fan: 2, anti: 2 }; note = '你和男主同走红毯，镜头炸了，黑粉开扒';
    E.misc.exposureAccum = (E.misc.exposureAccum || 0) + 3;
  } else if (choice === 'mention_him') {
    deltas = { media: 3, fan: 2, anti: 3 }; note = '感言里谢了"特别的人"，全网解码';
    E.misc.exposureAccum = (E.misc.exposureAccum || 0) + 4;
  } else if (choice === 'no_mention') {
    deltas = { media: 1, fan: 0 }; note = '感言滴水不漏，安全过关';
  }
  applyOpinionImpact(deltas, '颁奖礼·' + choice);
  if (E.flags.awardsNom) E.flags.awardsNom.resolved = true;
  E.flags.awardsActive = null;
  saveGame();
  return { deltas: deltas, note: note };
}

export function awardsNom() { return GS.entSim.flags.awardsNom || null; }
export function awardsActive() { return GS.entSim.flags.awardsActive || null; }
