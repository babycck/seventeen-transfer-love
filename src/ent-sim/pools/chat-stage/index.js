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
// v5: 接收对方最后一条消息内容，按场景动态匹配预设
function getChatPresetsByChannel(ch, lastMsg) {
  var st = _getStage(ch);
  var basePresets = (st && st.presets) || ['嗯', '知道了', '好的'];
  // v5: 无消息内容时返回基础预设
  if (!lastMsg || typeof lastMsg !== 'string') return basePresets;
  var msg = lastMsg.toLowerCase();
  // 场景化预设池（4个/组，覆盖各种回答）
  // ① 提问类（怎么样/好不好/什么/吗/呢）→ 回答类预设
  if (/怎么样|好不好|如何|怎样|什么|吗|呢$|谁|哪|评价|结果|分数|成绩/.test(msg)) {
    return ['挺好的', '还行吧', '一般般', '继续努力'];
  }
  // ② 关心类（累不累/还好吗/没事吧/怎么了）→ 情绪回应类
  if (/累不累|还好吗|没事吧|怎么了|不舒服|开心吗|心情|担心|累了吗|状态/.test(msg)) {
    return ['没事', '有点累', '还好', '想说但不知怎么开口'];
  }
  // ③ 邀请类（要不要/一起/来不来/约/见）→ 决定类预设
  if (/要不要|一起|来不来|约|见面|去看|去吃|吃饭|逛街|出来/.test(msg)) {
    return ['好啊', '今天不行', '看情况', '再说吧'];
  }
  // ④ 通知类（明天/今天/通知/记得/别忘了）→ 确认类预设
  if (/明天|今天|通知|记得|别忘了|注意|小心|提醒|时间|地点/.test(msg)) {
    return ['知道了', '收到', '没问题', '记住了'];
  }
  // ⑤ 鼓励/夸奖类（加油/棒/厉害/辛苦）→ 谦虚回应
  if (/加油|棒|厉害|辛苦|优秀|漂亮|好看/.test(msg)) {
    return ['谢谢', '会努力的', '还行吧', '别夸我了'];
  }
  // ⑥ 默认：返回基础预设
  return basePresets;
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
  if (!E) {
    console.warn('[chat] getMaleLeadPresetsForChat: GS.entSim 为空，返回 fallback');
    return [{ q: '在干嘛', r: ['刚练完舞，在想今晚吃什么'], id: 'fallback_1' }];
  }
  var stage = _resolveStage('maleLead');
  var mlId = (E.romance && E.romance.maleLead && E.romance.maleLead.id) || '(空)';
  console.log('[chat] getMaleLeadPresetsForChat: maleLead.id=' + mlId + ', affection=' + (E.affection||0) + ', stage=' + stage);
  // v5: 映射阶段到池子key——更精确的阶段匹配
  var poolKeys = [];
  if (stage <= 0) poolKeys = ['trainee'];
  else if (stage <= 1) poolKeys = ['greet', 'trainee'];
  else poolKeys = ['stage', 'greet', 'flirt', 'night'];
  // 收集所有候选预设（含完整q+r绑定）
  var candidates = [];
  var allKeys = Object.keys(CHAT_MALE_LEAD || {});
  for (var k = 0; k < allKeys.length; k++) {
    var key = allKeys[k];
    if (poolKeys.indexOf(key) < 0) continue;
    var pool = CHAT_MALE_LEAD[key];
    if (!pool || !pool.length) continue;
    for (var i = 0; i < pool.length; i++) {
      var entry = pool[i];
      // 过滤：按好感阈值
      if (entry.minAff && (E.affection || 0) < entry.minAff) continue;
      if (entry.q && (Array.isArray(entry.r) || Array.isArray(entry.options))) {
        candidates.push({
          q: entry.q,
          r: Array.isArray(entry.r) ? entry.r : (Array.isArray(entry.options) ? entry.options.map(function(o) { return typeof o === 'string' ? o : (o.t || o.r || ''); }) : []),
          id: key + '_' + i // 唯一标识供去重
        });
      }
    }
  }
  if (!candidates.length) {
    console.warn('[chat] getMaleLeadPresetsForChat: candidates 为空 (poolKeys=' + poolKeys.join(',') + ')，返回 fallback');
    return [
      { q: '今天怎么样', r: ['还不错，你呢'], id: 'fallback_1' },
      { q: '在干嘛', r: ['刚练完舞'], id: 'fallback_2' },
      { q: '吃了吗', r: ['吃了，你呢'], id: 'fallback_3' }
    ];
  }
  // v5: 去重——优先选未用过的
  var used = (typeof GS !== 'undefined' && GS._entSimChatUsedPresets instanceof Set) ? GS._entSimChatUsedPresets : null;
  var unused = used ? candidates.filter(function(c) { return !used.has(c.id); }) : candidates.slice();
  if (!unused.length) {
    // 全部用尽，重置去重集
    if (typeof GS !== 'undefined') GS._entSimChatUsedPresets = new Set();
    unused = candidates.slice();
  }
  // 随机选3条
  var shuffled = unused.slice().sort(function() { return Math.random() - 0.5; });
  var result = shuffled.slice(0, 3);
  console.log('[chat] getMaleLeadPresetsForChat: candidates=' + candidates.length + ', 返回 ' + result.length + ' 条: ' + result.map(function(r){return r.q;}).join(' | '));
  return result;
}
