// ============================================================
// 系统4 关系网：7 类 NPC（经纪人/狗仔/站姐/媒体人/情敌/前辈/品牌方）
// triggerNpcChain · 狗仔"周一见"预告 · 站姐回踩 · 节点状态
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { NPC_TYPES, NPC_EVENT_POOLS } from './data.js';
import { applyOpinionImpact } from './public-opinion.js';

// 触发某类 NPC 事件链，返回结构化结果供引擎/UI 使用
export function triggerNpcChain(type) {
  var pool = (NPC_EVENT_POOLS[type] && (NPC_EVENT_POOLS[type].all)) || [];
  if (pool.length === 0) return null;
  var ev = pool[randInt(0, pool.length - 1)];
  var E = GS.entSim;
  var node = E.npcNetwork.nodes['npc_' + type];
  if (!node) return null;

  if (typeof ev.intimacy === 'number') node.intimacy += ev.intimacy;
  if (ev.stance) node.stance = ev.stance;
  node.lastEventRound = E.cycle.roundTotal;

  var exposure = ev.exposure || 0;
  var deltas = {};
  if (exposure) {
    // 曝光升高 → 媒体关注涨、黑粉微涨；掩护成功则降
    deltas.media = (deltas.media || 0) + (exposure > 0 ? 1 : -1);
    if (exposure >= 3) deltas.anti = (deltas.anti || 0) + 1;
    if (exposure < 0) deltas.fan = (deltas.fan || 0) + 1;
  }
  if (Object.keys(deltas).length) applyOpinionImpact(deltas, 'NPC·' + node.name);

  // 特殊 flag 处理
  var flag = ev.flag || '';
  if (flag === 'paparazziArmed') {
    E.npcNetwork.paparazzi.armed = true;
    E.npcNetwork.paparazzi.nextRound = E.cycle.roundTotal + 3; // 3 回合后放料
  }
  if (flag === 'rivalQuit') {
    E.npcNetwork.nodes['npc_rival'].stance = '退出祝福';
    E.brother.rivalAware = true;
  }
  if (flag === 'suitorQuit') {
    E.npcNetwork.nodes['npc_suitor'].stance = '退出祝福';
  }
  if (flag === 'brandPull') {
    E.npcNetwork.nodes['npc_brand'].stance = '撤资';
  }
  if (flag === 'contractRead') {
    E.flags.contractRead = true;
  }

  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'npc', text: node.name + '：' + ev.text });
  saveGame();

  return {
    npc: node.name,
    npcIcon: NPC_TYPES[type].icon,
    text: ev.text,
    intimacy: node.intimacy,
    stance: node.stance,
    exposure: exposure,
    flag: flag
  };
}

// 狗仔预告倒计时：到点未处理 → 实锤塌房
export function tickPaparazzi() {
  var E = GS.entSim;
  var p = E.npcNetwork.paparazzi;
  if (!p.armed) return null;
  if (E.cycle.roundTotal >= p.nextRound) {
    p.armed = false;
    // 实锤：anti 大涨、media 关注、fan 掉
    applyOpinionImpact({ anti: 8, media: 3, fan: -4 }, '狗仔实锤放料');
    // 实锤＝毁灭性曝光：粉丝与舆论淹没 → 人气崩 + 事业崩塌
    applyDiscoveryBlowback(5);
    E.careerHistory.push({ round: E.cycle.roundTotal, type: 'paparazzi', text: '狗仔放出同框实锤图，#' + (E.romance.maleLead.name || '他') + ' 恋情# 爆，事业崩塌' });
    saveGame();
    return { exploded: true, text: '狗仔放出同框实锤图，热搜炸了' };
  }
  return { exploded: false, countdown: p.nextRound - E.cycle.roundTotal };
}

// 站姐回踩触发（随机，高光期概率更高）
export function maybeFilmSisBackstab() {
  var E = GS.entSim;
  var phaseIdx = E.cycle.phaseIndex;
  var chance = phaseIdx >= 2 ? 0.25 : 0.1;
  if (Math.random() < chance) {
    E.npcNetwork.filmSis.backstabArmed = true;
    return triggerNpcChain('fanleader');
  }
  return null;
}

// 获取关系网节点数组（UI 用）
export function getNpcNodes() {
  var nodes = GS.entSim.npcNetwork.nodes;
  var out = [];
  for (var id in nodes) {
    if (!Object.prototype.hasOwnProperty.call(nodes, id)) continue;
    var n = nodes[id];
    out.push({
      id: n.id, type: n.type, name: n.name, icon: (NPC_TYPES[n.type] || {}).icon || '•',
      intimacy: n.intimacy, stance: n.stance
    });
  }
  return out;
}

// 每日随机推进一个 NPC 事件（引擎每轮调用一次）
export function dailyNpcRoll() {
  var types = Object.keys(NPC_TYPES);
  // 高光期更易爆
  var roll = Math.random();
  if (roll < 0.45) {
    var t = types[randInt(0, types.length - 1)];
    return triggerNpcChain(t);
  }
  return null;
}

// 玩家主动互动（点击关系网节点触发）：消耗晚档的轻量经营动作
// actions 表见 ACTIONS（每个返回 {note, deltas}）
var NPC_INTERACTIONS = {
  broker: {
    stabilize: { label: '谈话稳住', icon: '🤝', note: '和经纪人把口径对齐，他帮你把风险压下去', apply: function(E) { E.misc.suspicion = Math.max(0, (E.misc.suspicion || 0) - 3); return { fan: 0, media: 0, professional: 1, anti: 0 }; } },
    resource: { label: '求资源', icon: '📋', note: '让经纪人给你争取一个通告，事业推进', apply: function(E) { return { fan: 1, media: 1, professional: 2, anti: 0 }; } }
  },
  paparazzi: {
    buyout: { label: '买断料', icon: '💰', note: '花钱买断狗仔手里的料，他暂时收手', apply: function(E) { E.npcNetwork.paparazzi.armed = false; E.npcNetwork.paparazzi.nextRound = E.cycle.roundTotal + 99; return { fan: 0, media: 4, professional: 0, anti: -2 }; } },
    warn: { label: '警告', icon: '⚠️', note: '警告狗仔反而激起反弹，他盯得更紧', apply: function(E) { E.misc.suspicion = (E.misc.suspicion || 0) + 1; return { fan: 0, media: 1, professional: 0, anti: 1 }; } }
  },
  fanleader: {
    woo: { label: '讨好稳粉', icon: '💖', note: '给站姐递台阶，铁粉稳住不脱', apply: function(E) { return { fan: 3, media: 0, professional: 0, anti: 0 }; } },
    ignore: { label: '不理', icon: '🙄', note: '冷处理，站姐慢慢失去热情', apply: function(E) { return { fan: -1, media: 0, professional: 0, anti: 0 }; } }
  },
  media: {
    interview: { label: '接受专访', icon: '🎙️', note: '上媒体放正面叙事，但易被套话', apply: function(E) { return { fan: -1, media: 3, professional: 1, anti: 0 }; } },
    avoid: { label: '回避', icon: '🚫', note: '对媒体保持距离，不惹事', apply: function(E) { return { fan: 0, media: -1, professional: 0, anti: 0 }; } }
  },
  rival: {
    goodwill: { label: '示好', icon: '🌸', note: '对情敌释放善意，缓解张力', apply: function(E) { return { fan: 1, media: 0, professional: 0, anti: 0 }; } },
    cold: { label: '冷战', icon: '❄️', note: '和情敌保持距离，暗中较劲', apply: function(E) { return { fan: 0, media: 0, professional: 0, anti: 0 }; } }
  },
  suitor: {
    distance: { label: '保持距离', icon: '🚧', note: '对男主的情敌礼貌但疏离，不给他错觉，也免得男主吃醋', apply: function(E) { return { fan: 1, media: 0, professional: 0, anti: 0 }; } },
    test: { label: '试探心意', icon: '🔍', note: '半开玩笑试探他，看他是真心还是玩闹', apply: function(E) { return { fan: 0, media: 1, professional: 0, anti: 0 }; } }
  },
  senior: {
    respect: { label: '请教', icon: '🧑', note: '向前辈虚心请教，博好评', apply: function(E) { return { fan: 1, media: 1, professional: 2, anti: 0 }; } },
    distance: { label: '保持距离', icon: '↔️', note: '不亲近也不疏远，明哲保身', apply: function(E) { return { fan: 0, media: 0, professional: 0, anti: 0 }; } }
  },
  brand: {
    ask: { label: '求代言', icon: '👜', note: '向品牌方争取合作，商业价值涨', apply: function(E) { return { fan: 1, media: 2, professional: 1, anti: 0 }; } },
    wait: { label: '观望', icon: '👀', note: '不主动推进，关系自然冷却', apply: function(E) { return { fan: -1, media: 0, professional: 0, anti: 0 }; } }
  }
};

// 返回某 NPC 类型可选互动（UI 弹菜单用）
export function getNpcInteractions(type) {
  var map = NPC_INTERACTIONS[type] || {};
  return Object.keys(map).map(function(k) { return Object.assign({ key: k }, map[k]); });
}

// 执行玩家主动互动
export function interactNpc(type, actionKey) {
  var E = GS.entSim;
  var node = E.npcNetwork.nodes['npc_' + type];
  if (!node) return { success: false, note: '该 NPC 不存在' };
  var actions = NPC_INTERACTIONS[type];
  var act = actions && actions[actionKey];
  if (!act) return { success: false, note: '未知互动' };
  node.intimacy = (node.intimacy || 0) + 1;
  node.lastEventRound = E.cycle.roundTotal;
  var deltas = act.apply(E) || {};
  if (deltas && (deltas.fan || deltas.media || deltas.professional || deltas.anti)) {
    applyOpinionImpact(deltas, '互动·' + (NPC_TYPES[type] || {}).label);
  }
  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'npc', text: (NPC_TYPES[type] || {}).label + '·' + act.label + '：' + act.note });
  saveGame();
  return { success: true, note: act.note, npc: node.name };
}
