// chat-ack — 13人 × 3角色（哥哥/情敌/男主）= 39池子
// 每人当哥哥时一种语气，当情敌时另一种，当男主时又另一种。

import { CHAT_ACK_BROTHER as B_SCOUPS, CHAT_ACK_RIVAL as R_SCOUPS, CHAT_ACK_MALE_LEAD as M_SCOUPS } from './scoups.js';
import { CHAT_ACK_BROTHER as B_JEONGHAN, CHAT_ACK_RIVAL as R_JEONGHAN, CHAT_ACK_MALE_LEAD as M_JEONGHAN } from './jeonghan.js';
import { CHAT_ACK_BROTHER as B_JOSHUA, CHAT_ACK_RIVAL as R_JOSHUA, CHAT_ACK_MALE_LEAD as M_JOSHUA } from './joshua.js';
import { CHAT_ACK_BROTHER as B_JUN, CHAT_ACK_RIVAL as R_JUN, CHAT_ACK_MALE_LEAD as M_JUN } from './jun.js';
import { CHAT_ACK_BROTHER as B_HOSHI, CHAT_ACK_RIVAL as R_HOSHI, CHAT_ACK_MALE_LEAD as M_HOSHI } from './hoshi.js';
import { CHAT_ACK_BROTHER as B_WONWOO, CHAT_ACK_RIVAL as R_WONWOO, CHAT_ACK_MALE_LEAD as M_WONWOO } from './wonwoo.js';
import { CHAT_ACK_BROTHER as B_WOOZI, CHAT_ACK_RIVAL as R_WOOZI, CHAT_ACK_MALE_LEAD as M_WOOZI } from './woozi.js';
import { CHAT_ACK_BROTHER as B_DK, CHAT_ACK_RIVAL as R_DK, CHAT_ACK_MALE_LEAD as M_DK } from './dk.js';
import { CHAT_ACK_BROTHER as B_MINGYU, CHAT_ACK_RIVAL as R_MINGYU, CHAT_ACK_MALE_LEAD as M_MINGYU } from './mingyu.js';
import { CHAT_ACK_BROTHER as B_THE8, CHAT_ACK_RIVAL as R_THE8, CHAT_ACK_MALE_LEAD as M_THE8 } from './the8.js';
import { CHAT_ACK_BROTHER as B_SEUNGKWAN, CHAT_ACK_RIVAL as R_SEUNGKWAN, CHAT_ACK_MALE_LEAD as M_SEUNGKWAN } from './seungkwan.js';
import { CHAT_ACK_BROTHER as B_VERNON, CHAT_ACK_RIVAL as R_VERNON, CHAT_ACK_MALE_LEAD as M_VERNON } from './vernon.js';
import { CHAT_ACK_BROTHER as B_DINO, CHAT_ACK_RIVAL as R_DINO, CHAT_ACK_MALE_LEAD as M_DINO } from './dino.js';

// 三维查找表：CHAT_ACK[role][memberId]
var CHAT_ACK = {
  brother:   { scoups:B_SCOUPS, jeonghan:B_JEONGHAN, joshua:B_JOSHUA, jun:B_JUN, hoshi:B_HOSHI, wonwoo:B_WONWOO, woozi:B_WOOZI, dk:B_DK, mingyu:B_MINGYU, the8:B_THE8, seungkwan:B_SEUNGKWAN, vernon:B_VERNON, dino:B_DINO },
  rival:     { scoups:R_SCOUPS, jeonghan:R_JEONGHAN, joshua:R_JOSHUA, jun:R_JUN, hoshi:R_HOSHI, wonwoo:R_WONWOO, woozi:R_WOOZI, dk:R_DK, mingyu:R_MINGYU, the8:R_THE8, seungkwan:R_SEUNGKWAN, vernon:R_VERNON, dino:R_DINO },
  maleLead:  { scoups:M_SCOUPS, jeonghan:M_JEONGHAN, joshua:M_JOSHUA, jun:M_JUN, hoshi:M_HOSHI, wonwoo:M_WONWOO, woozi:M_WOOZI, dk:M_DK, mingyu:M_MINGYU, the8:M_THE8, seungkwan:M_SEUNGKWAN, vernon:M_VERNON, dino:M_DINO }
};

// 按频道 × 成员 ID 双层查找（哥哥/情敌/男主各自独立池子）
function getChatAckByChannel(ch) {
  var role = ch; // 'brother' | 'rival' | 'maleLead'
  var E = (typeof GS !== 'undefined' && GS.entSim) ? GS.entSim : null;
  if (!E || !CHAT_ACK[role]) return ['嗯。'];
  var memberId = '';
  if (ch === 'maleLead') {
    memberId = (E.romance && E.romance.maleLead && E.romance.maleLead.id) || '';
  } else if (ch === 'brother') {
    memberId = (E.brother && E.brother.id) || (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.id) || '';
  } else if (ch === 'rival') {
    var suitor = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor'];
    memberId = suitor && suitor.id || '';
  }
  return (CHAT_ACK[role][memberId]) || ['嗯。'];
}

export { getChatAckByChannel };
