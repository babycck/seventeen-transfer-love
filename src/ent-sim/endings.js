// ============================================================
// 系统10 结局：四维舆论 tier × 事业等级 × 恋爱深度 → 细分结局（10+）
// 含 情敌隐藏结局（女主对男主好感<40 + 情敌倾向>=50 + 接受情敌告白）
// ============================================================
import { GS } from '../state.js';
import { getOpinionTier } from './public-opinion.js';
import { popularity, careerLevel, romanceDepth, maleLead } from './state.js';

// 结局矩阵：舆论 tier + 事业 + 恋爱深度
function pickEnding(tier, careerLv, depth, rivalQuit) {
  // 情敌隐藏结局优先判定
  var rivalNode = GS.entSim.npcNetwork.nodes['npc_rival'];
  var rivalLean = rivalNode ? (rivalNode.intimacy || 0) : 0;
  if (rivalLean >= 50 && depth < 2 && GS.entSim.flags.acceptedRival) {
    return { type: 'hidden_rival', label: '藏在掌声里的他', text: '你最终走向了那个一直站在你身边的人，男主成了回忆里最亮的光。', icon: '💔' };
  }
  if (depth >= 5) {
    return tier === '塌房边缘' || tier === '风波'
      ? { type: 'be_exposed', label: '公开即塌房', text: '恋情曝光撞上舆论最低谷，事业与爱情两败俱伤。', icon: '⛈️' }
      : { type: 'he_public', label: '台前的童话', text: '你们大方牵手走上红毯，全网祝福，成为娱乐圈最甜的童话。', icon: '💍' };
  }
  if (depth >= 3) {
    if (tier === '神坛' || tier === '顺风顺水') return { type: 'he_underground', label: '地下永久', text: '事业巅峰，爱情藏得滴水不漏，你们在无人处相拥。', icon: '🌙' };
    if (tier === '塌房边缘') return { type: 'be_exposed', label: '曝光塌房', text: '越藏越险，最终一拍即塌。', icon: '⛈️' };
    return { type: 'ne_peace', label: '和平分手', text: '聚少离多，默契地松开手，各自闪耀。', icon: '🌿' };
  }
  if (depth >= 1) {
    return { type: 'ne_ambiguous', label: '暧昧未明', text: '谁也没先开口，故事停在最好也最遗憾的节点。', icon: '🌸' };
  }
  // 恋爱深度 0：看事业
  if (careerLv === '传奇' || careerLv === '巅峰') return { type: 'he_solo', label: '独美封神', text: '你把所有热爱给了舞台，单身亦封神。', icon: '👑' };
  if (tier === '塌房边缘') return { type: 'be_fall', label: '黯然退场', text: '舆论反噬，你悄悄退出了聚光灯。', icon: '🌑' };
  return { type: 'ne_solo', label: '独自前行', text: '事业还在爬坡，爱情尚未开始，未来可期。', icon: '🌱' };
}

// 评估结局（终局调用）
export function evaluateEnding() {
  var E = GS.entSim;
  var tier = getOpinionTier().tier;
  var careerLv = careerLevel();
  var depth = romanceDepth();
  var ending = pickEnding(tier, careerLv, depth);
  E.endings = {
    hint: ending.label,
    locked: true,
    type: ending.type,
    eligible: true,
    text: ending.text
  };
  return ending;
}

export function getEndingHint() {
  return GS.entSim.endings.hint || '';
}
