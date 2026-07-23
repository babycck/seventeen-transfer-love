// ============================================================
// 系统14 合作企划：6 型（合唱/对手戏/综艺同框/MV/广告/合作舞台）
// 提案（经纪人/哥哥牵线/主动） → 接 or 拒 → 占作品槽（特殊作品）→ 排练拍摄期由主循环推进
// 接了即绑死同框日程，exposureAccum += risk（越甜越危险）
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { COLLAB_TYPES } from './data.js';
import { startWork } from './works.js';
import { advanceRomance } from './romance.js';

// 提案触发（经纪人 NPC / 哥哥牵线 / 偶尔主动）
export function maybeOfferCollab(source) {
  var E = GS.entSim;
  var types = Object.keys(COLLAB_TYPES);
  var type = types[randInt(0, types.length - 1)];
  var def = COLLAB_TYPES[type];
  var subject = def.subjectOptions[randInt(0, def.subjectOptions.length - 1)];
  var title = (subject || '') + (def.label);
  var proposal = {
    type: type, label: def.label, icon: def.icon,
    subject: subject, title: title,
    risk: def.risk, sweetness: def.sweetness, source: source || '经纪人'
  };
  E.flags.collabProposal = proposal;
  saveGame();
  return proposal;
}

export function acceptCollab(proposal) {
  var E = GS.entSim;
  proposal = proposal || E.flags.collabProposal;
  if (!proposal) return null;
  // 接了 → 占作品槽（collab 特殊作品）
  var id = startWork('collab', proposal.subject, proposal.title);
  // 接了即绑死同框日程，曝光累计
  E.misc.exposureAccum = (E.misc.exposureAccum || 0) + proposal.risk;
  E.flags.collabProposal = null;
  // 合作期记录：与男主合作累计甜度并开启合作期（顺其自然恋爱推进）
  E.romance.collabActive = {
    workId: id,
    subject: proposal.subject,
    type: proposal.type,
    title: proposal.title,
    sweetness: proposal.sweetness || 0,
    startedRound: E.cycle.roundTotal
  };
  E.romance.collabSweetAccum = (E.romance.collabSweetAccum || 0) + (proposal.sweetness || 0);
  // 接下即小步推进（仅男主、且未达告白前置深度）
  if (proposal.subject === '男主' && (proposal.sweetness || 0) >= 3 && E.romance.depth < 3) {
    advanceRomance(1);
  }
  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'collab', text: '接下合作企划《' + proposal.title + '》与' + proposal.subject });
  saveGame();
  return { id: id, title: proposal.title, subject: proposal.subject, collabActive: E.romance.collabActive };
}

export function rejectCollab() {
  GS.entSim.flags.collabProposal = null;
  saveGame();
  return true;
}

export function collabProposal() { return GS.entSim.flags.collabProposal || null; }
export function collabTypes() { return COLLAB_TYPES; }
