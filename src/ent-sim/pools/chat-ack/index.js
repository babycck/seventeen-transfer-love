// chat-ack — 13人各自独立的确认回应池
// 按成员性格写，不区分角色（哥哥/情敌/男主统一走同一池子）
import { CHAT_ACK_SCOUPS } from './scoups.js';
import { CHAT_ACK_JEONGHAN } from './jeonghan.js';
import { CHAT_ACK_JOSHUA } from './joshua.js';
import { CHAT_ACK_JUN } from './jun.js';
import { CHAT_ACK_HOSHI } from './hoshi.js';
import { CHAT_ACK_WONWOO } from './wonwoo.js';
import { CHAT_ACK_WOOZI } from './woozi.js';
import { CHAT_ACK_DK } from './dk.js';
import { CHAT_ACK_MINGYU } from './mingyu.js';
import { CHAT_ACK_THE8 } from './the8.js';
import { CHAT_ACK_SEUNGKWAN } from './seungkwan.js';
import { CHAT_ACK_VERNON } from './vernon.js';
import { CHAT_ACK_DINO } from './dino.js';

// 成员 ACK 池查找表：按 memberId 取对应池
var CHAT_ACK_MEMBER = {
  scoups: CHAT_ACK_SCOUPS, jeonghan: CHAT_ACK_JEONGHAN, joshua: CHAT_ACK_JOSHUA,
  jun: CHAT_ACK_JUN, hoshi: CHAT_ACK_HOSHI, wonwoo: CHAT_ACK_WONWOO,
  woozi: CHAT_ACK_WOOZI, dk: CHAT_ACK_DK, mingyu: CHAT_ACK_MINGYU,
  the8: CHAT_ACK_THE8, seungkwan: CHAT_ACK_SEUNGKWAN, vernon: CHAT_ACK_VERNON,
  dino: CHAT_ACK_DINO
};

// 根据聊天频道解析成员 ID → 取该成员的 ACK 池（哥哥/情敌/男主三人统一走此逻辑）
function getChatAckByChannel(ch) {
  var E = (typeof GS !== 'undefined' && GS.entSim) ? GS.entSim : null;
  if (!E) return ['嗯。'];
  var memberId = '';
  if (ch === 'maleLead') {
    memberId = (E.romance && E.romance.maleLead && E.romance.maleLead.id) || '';
  } else if (ch === 'brother') {
    memberId = (E.brother && E.brother.id) || (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.id) || '';
  } else if (ch === 'rival') {
    var suitor = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor'];
    memberId = suitor && suitor.id || '';
  }
  return CHAT_ACK_MEMBER[memberId] || ['嗯。'];
}

export { CHAT_ACK_MEMBER, getChatAckByChannel };
