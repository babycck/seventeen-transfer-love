// ============================================================
// 系统4 关系网：4 类 NPC（经纪人/站姐/情敌/男主的情敌）
// 玩家每日可手动互动 1 次。旧 狗仔/媒体人/前辈/品牌方 4 类与危机公关已移除。
// initNpcNodes 见 state.js（遍历 NPC_TYPES 生成节点）。
// ============================================================
import { GS, saveGame } from '../state.js';
import { addPopularity } from './state.js';
import { NPC_TYPES } from './data.js';
import { addExposure } from './public-opinion.js';

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

// 玩家主动互动（点击关系网节点触发）：消耗当日 1 次互动机会
// 每个选项返回 { label, icon, note, exposure, pop }，由 interactNpc 落地到曝光/人气（旧四维舆论已移除）
var NPC_INTERACTIONS = {
  broker: {
    stabilize: { label: '谈话稳住', icon: '🤝', note: '和经纪人把口径对齐，他帮你把风险压下去', exposure: -2 },
    resource: { label: '求资源', icon: '📋', note: '让经纪人给你争取一个通告，事业推进', exposure: 0, pop: 2 }
  },
  fanleader: {
    woo: { label: '讨好稳粉', icon: '💖', note: '给站姐递台阶，铁粉稳住不脱', exposure: 0, pop: 2 },
    ignore: { label: '不理', icon: '🙄', note: '冷处理，站姐慢慢失去热情', exposure: 0, pop: -1 }
  },
  rival: {
    goodwill: { label: '示好', icon: '🌸', note: '对情敌释放善意，缓解张力', exposure: -1 },
    cold: { label: '冷战', icon: '❄️', note: '和情敌保持距离，暗中较劲', exposure: 0 }
  },
  suitor: {
    distance: { label: '保持距离', icon: '🚧', note: '对男主的情敌礼貌但疏离，不给他错觉，也免得男主吃醋', exposure: -1 },
    test: { label: '试探心意', icon: '🔍', note: '半开玩笑试探他，看他是真心还是玩闹', exposure: 1 }
  }
};

// 返回某 NPC 类型可选互动（UI 弹菜单用）
export function getNpcInteractions(type) {
  var map = NPC_INTERACTIONS[type] || {};
  return Object.keys(map).map(function (k) { return Object.assign({ key: k }, map[k]); });
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
  E.misc.npcInteractionUsed = (E.misc.npcInteractionUsed || 0) + 1;
  if (act.pop) addPopularity(act.pop, '互动·' + (NPC_TYPES[type] || {}).label);
  if (act.exposure) addExposure(act.exposure, '互动·' + (NPC_TYPES[type] || {}).label + '·' + act.label);
  E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'npc', text: (NPC_TYPES[type] || {}).label + '·' + act.label + '：' + act.note });
  saveGame();
  return { success: true, note: act.note, npc: node.name };
}
