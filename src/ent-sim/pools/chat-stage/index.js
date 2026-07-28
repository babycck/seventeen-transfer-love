// chat-stage — 13人 × 3角色 × 4阶段 = 156个阶段池
// 每个阶段池含 presets(快捷回复) + acks(收尾回复)

import { STAGE_BROTHER as B_SCOUPS, STAGE_RIVAL as R_SCOUPS, STAGE_MALE_LEAD as M_SCOUPS } from './scoups.js';
import { STAGE_BROTHER as B_JEONGHAN, STAGE_RIVAL as R_JEONGHAN, STAGE_MALE_LEAD as M_JEONGHAN } from './jeonghan.js';
import { STAGE_BROTHER as B_JOSHUA, STAGE_RIVAL as R_JOSHUA, STAGE_MALE_LEAD as M_JOSHUA } from './joshua.js';
import { STAGE_BROTHER as B_JUN, STAGE_RIVAL as R_JUN, STAGE_MALE_LEAD as M_JUN } from './jun.js';
import { STAGE_BROTHER as B_HOSHI, STAGE_RIVAL as R_HOSHI, STAGE_MALE_LEAD as M_HOSHI } from './hoshi.js';
import { STAGE_BROTHER as B_WONWOO, STAGE_RIVAL as R_WONWOO, STAGE_MALE_LEAD as M_WONWOO } from './wonwoo.js';
import { STAGE_BROTHER as B_WOOZI, STAGE_RIVAL as R_WOOZI, STAGE_MALE_LEAD as M_WOOZI } from './woozi.js';
import { STAGE_BROTHER as B_DK, STAGE_RIVAL as R_DK, STAGE_MALE_LEAD as M_DK } from './dk.js';
import { STAGE_BROTHER as B_MINGYU, STAGE_RIVAL as R_MINGYU, STAGE_MALE_LEAD as M_MINGYU } from './mingyu.js';
import { STAGE_BROTHER as B_THE8, STAGE_RIVAL as R_THE8, STAGE_MALE_LEAD as M_THE8 } from './the8.js';
import { STAGE_BROTHER as B_SEUNGKWAN, STAGE_RIVAL as R_SEUNGKWAN, STAGE_MALE_LEAD as M_SEUNGKWAN } from './seungkwan.js';
import { STAGE_BROTHER as B_VERNON, STAGE_RIVAL as R_VERNON, STAGE_MALE_LEAD as M_VERNON } from './vernon.js';
import { STAGE_BROTHER as B_DINO, STAGE_RIVAL as R_DINO, STAGE_MALE_LEAD as M_DINO } from './dino.js';

// 三维查找：STAGES[role][memberId] → [stage0, stage1, stage2, stage3]
var STAGES = {
  brother:  { scoups:B_SCOUPS, jeonghan:B_JEONGHAN, joshua:B_JOSHUA, jun:B_JUN, hoshi:B_HOSHI, wonwoo:B_WONWOO, woozi:B_WOOZI, dk:B_DK, mingyu:B_MINGYU, the8:B_THE8, seungkwan:B_SEUNGKWAN, vernon:B_VERNON, dino:B_DINO },
  rival:    { scoups:R_SCOUPS, jeonghan:R_JEONGHAN, joshua:R_JOSHUA, jun:R_JUN, hoshi:R_HOSHI, wonwoo:R_WONWOO, woozi:R_WOOZI, dk:R_DK, mingyu:R_MINGYU, the8:R_THE8, seungkwan:R_SEUNGKWAN, vernon:R_VERNON, dino:R_DINO },
  maleLead: { scoups:M_SCOUPS, jeonghan:M_JEONGHAN, joshua:M_JOSHUA, jun:M_JUN, hoshi:M_HOSHI, wonwoo:M_WONWOO, woozi:M_WOOZI, dk:M_DK, mingyu:M_MINGYU, the8:M_THE8, seungkwan:M_SEUNGKWAN, vernon:M_VERNON, dino:M_DINO }
};

// 解析成员ID
function _resolveMember(ch) {
  var E = (typeof GS !== 'undefined' && GS.entSim) ? GS.entSim : null;
  if (!E) return '';
  if (ch === 'maleLead') return (E.romance && E.romance.maleLead && E.romance.maleLead.id) || '';
  if (ch === 'brother') return (E.brother && E.brother.id) || (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.id) || '';
  if (ch === 'rival') { var s = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor']; return (s && s.id) || ''; }
  return '';
}

// 解析感情阶段 0-3（brother: support→stage / rival: npc intimacy→stage / maleLead: affection→stage）
function _resolveStage(ch) {
  var E = (typeof GS !== 'undefined' && GS.entSim) ? GS.entSim : null;
  if (!E) return 0;
  if (ch === 'brother') {
    var sup = E.brother && typeof E.brother.support === 'number' ? E.brother.support : 0;
    if (sup <= 15) return 0;
    if (sup <= 40) return 1;
    if (sup <= 70) return 2;
    return 3;
  }
  if (ch === 'rival') {
    var aff = 0;
    var suitor = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor'];
    if (suitor && typeof suitor.intimacy === 'number') aff = suitor.intimacy;
    if (aff <= 19) return 0;
    if (aff <= 49) return 1;
    if (aff <= 74) return 2;
    return 3;
  }
  if (ch === 'maleLead') {
    var mlAff = E.affection || 0;
    if (mlAff <= 19) return 0;
    if (mlAff <= 49) return 1;
    if (mlAff <= 74) return 2;
    return 3;
  }
  return 0;
}

// 获取当前阶段池
function _getStage(ch) {
  var memberId = _resolveMember(ch);
  var stage = _resolveStage(ch);
  var roleStages = STAGES[ch] && STAGES[ch][memberId];
  if (!roleStages) return null;
  return roleStages[Math.min(stage, roleStages.length - 1)] || null;
}

// 获取快捷回复池（玩家可点击的预设按钮）
function getChatPresetsByChannel(ch) {
  var st = _getStage(ch);
  return (st && st.presets) || ['嗯', '知道了', '好的'];
}

// 获取收尾回复池（玩家点预设后角色的回复）
function getChatAckByChannel(ch) {
  var st = _getStage(ch);
  return (st && st.acks) || ['嗯。'];
}

export { getChatPresetsByChannel, getChatAckByChannel, getMaleLeadPresetsForChat };

// 男主频道上下文快捷回复：从CHAT_MALE_LEAD真实对话池取q作为预设按钮
// 确保按钮与findChatPoolReply匹配源一致，避免"嗯"永远匹配失败回退到"嗯。"
import { CHAT_MALE_LEAD } from '../chat-male-lead.js';

function getMaleLeadPresetsForChat() {
  var E = (typeof GS !== 'undefined' && GS.entSim) ? GS.entSim : null;
  if (!E) return ['在干嘛', '今天怎么样', '吃了吗'];
  var stage = _resolveStage('maleLead');
  // 映射阶段到池子key
  var poolKey = stage <= 0 ? 'trainee' : stage <= 1 ? 'greet' : 'stage';
  // 收集所有候选q
  var candidates = [];
  var allKeys = Object.keys(CHAT_MALE_LEAD || {});
  for (var k = 0; k < allKeys.length; k++) {
    var key = allKeys[k];
    var pool = CHAT_MALE_LEAD[key];
    if (!pool || !pool.length) continue;
    // trainee池仅练习生使用，greet/stage池可混用
    if (poolKey === 'trainee') {
      if (key === 'trainee') candidates = candidates.concat(pool);
    } else if (poolKey === 'greet') {
      if (key === 'greet' || key === 'trainee') candidates = candidates.concat(pool);
    } else {
      if (key === 'stage' || key === 'greet') candidates = candidates.concat(pool);
    }
  }
  if (!candidates.length) return ['在干嘛', '今天怎么样', '吃了吗'];
  // 随机选3条
  var shuffled = candidates.slice().sort(function() { return Math.random() - 0.5; });
  var presets = [];
  for (var i = 0; i < Math.min(3, shuffled.length); i++) {
    presets.push({ q: shuffled[i].q, t: shuffled[i].q });
  }
  return presets;
}
