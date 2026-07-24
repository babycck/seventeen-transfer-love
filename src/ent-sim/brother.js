// ============================================================
// 哥哥事件池 + 男主主动互动（剧情驱动，不影响告白门槛）
// 每回合并发判定：哥哥 15%、男主 10%，抽中则把事件注入下一段剧情 prompt。
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { GIRLGROUP_EVENTS, INDUSTRY_EVENTS, RIVAL_ADVANCE_EVENTS, SECRET_DISCOVERY_EVENTS, BROTHER_ADVANCE_TESTS, BROTHER_SIDE_PLOTS, TEAMMATE_FLAVOR, ENT_SIM_RIVAL_STAGES, ENT_SIM_RIVAL_ACTIONS } from './data.js';
import { getNpcNodes } from './npc-network.js';

// 哥哥事件池（剧情类，不强制影响进度）
export var BROTHER_EVENT_POOL = [
  { text: '哥哥在练习室门口堵住你，皱眉打量你最近的状态：“最近是不是有情况？别瞒我。”', supportDelta: 0 },
  { text: '哥哥把你和男主最近同框的传闻当笑话讲，语气却有一丝认真：“圈子里最不能碰的就是队友。”', supportDelta: -2 },
  { text: '哥哥难得没管你，递了杯热饮：“忙归忙，别熬坏。团队需要你，我也需要。”', supportDelta: 2 },
  { text: '哥哥撞见你和男主在走廊错身，眼神停了一瞬，什么都没说，夜里却发了条“注意分寸”的消息。', supportDelta: -3 },
  { text: '哥哥主动帮你把深夜行程报成“团务”，在经纪人面前打了掩护：“她跟我一组，没事。”', supportDelta: 1 },
  { text: '哥哥半开玩笑半认真地和你聊起未来：“你要是真谈了，记得选不会拖累团队的人。”', supportDelta: 0 },
  { text: '哥哥看你状态好，难得松口：“谈就谈，别被拍到，哥哥替你兜着。”', supportDelta: 3 }
];

// 男主主动互动池（按好感阶段解锁）
export var MALE_LEAD_INITIATIVE_POOL = [
  { minAff: 0, text: '男主在群里发了条无关紧要的消息，却特意 @ 了你一下，像是想引起你注意。' },
  { minAff: 20, text: '男主借着工作名义给你发了条私信：“今天表现不错，辛苦了。”' },
  { minAff: 35, text: '男主“顺路”在公司门口等你，递了杯你爱喝的，说“刚好多了一杯”。' },
  { minAff: 50, text: '男主在只有你们两人的场合，低声问你：“最近……有没有想我？”' },
  { minAff: 60, text: '男主听到别人聊起你，眼神暗了暗，过后私信你：“别理那些，你最重要。”' },
  { minAff: 70, text: '男主趁没人，悄悄把你拉到角落，指尖蹭过你手背：“再忍忍，好吗？”' },
  { minAff: 80, text: '男主发来一条语音，声音压得很低：“我想你想到写歌都写不下去了。”' }
];

// 哥哥事件：15% 概率；成功则注入并应用影响
export function maybeBrotherEvent() {
  var E = GS.entSim;
  if (randInt(1, 100) > 15) return false;
  var ev = BROTHER_EVENT_POOL[randInt(0, BROTHER_EVENT_POOL.length - 1)];
  if (ev.stance) E.brother.stance = ev.stance;
  if (typeof ev.supportDelta === 'number') {
    E.brother.support = Math.max(-100, Math.min(100, (E.brother.support || 0) + ev.supportDelta));
  }
  if (ev.text) E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'brother', text: ev.text });
  GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【哥哥】' + ev.text;
  saveGame();
  return true;
}

// 系统事件总调度：每日一次，按优先级注入下一段剧情。
// 优先触发高影响事件（男主小动作、哥哥递进考验、情敌主动），再随机触发行业/女团事件。
export function checkOneHeartEvents() {
  var E = GS.entSim;
  if (!E) return false;
  // 如果已有待触发事件，保留高优先级，不覆盖
  if (GS._entSimPendingEvent) return false;

  var ev = null;
  var rnd = randInt(1, 100);
  var r = E.cycle.roundTotal || 0;

  // 1. 男主小动作：每 5-8 回合自然出现一次
  var lastM = E._lastMannerismRound || 0;
  var interval = E._mannerismInterval || randInt(5, 8);
  if (r - lastM >= interval && E.romance.mannerisms && E.romance.mannerisms.length) {
    ev = { text: '男主的小动作：' + E.romance.mannerisms[randInt(0, E.romance.mannerisms.length - 1)], key: 'mannerism' };
    E._lastMannerismRound = r;
    E._mannerismInterval = randInt(5, 8);
  }

  // 2. 哥哥递进考验（优先级高于随机事件）
  if (!ev) ev = pickBrotherTest(E);

  // 3. 情敌主动（按 rival intimacy 阈值）
  if (!ev) ev = pickRivalAdvance(E);

  // 4. 女主秘密被撞破（男主发现）
  if (!ev && E.secret && E.secret.items && E.secret.items.length && rnd <= 15) {
    ev = cloneEvent(SECRET_DISCOVERY_EVENTS[randInt(0, SECRET_DISCOVERY_EVENTS.length - 1)]);
  }

  // 5. 哥哥支线
  if (!ev && E.brother && E.brother.name && rnd <= 12) {
    ev = cloneEvent(BROTHER_SIDE_PLOTS[randInt(0, BROTHER_SIDE_PLOTS.length - 1)]);
  }

  // 6. 女团/行业事件（按职业过滤）
  if (!ev && rnd <= 25) {
    var pool = [];
    if (E.career && E.career.profession === '女团爱豆') pool = pool.concat(GIRLGROUP_EVENTS);
    pool = pool.concat(INDUSTRY_EVENTS);
    if (pool.length) ev = cloneEvent(pool[randInt(0, pool.length - 1)]);
  }

  // 7. 女团队友支线：5 位姐姐偶尔在剧情里出场，增添女团真实感
  if (!ev && E.heroineGroup && E.heroineGroup.length && rnd <= 22) {
    var sis = E.heroineGroup[randInt(0, E.heroineGroup.length - 1)];
    var flavor = TEAMMATE_FLAVOR[sis.roleTag] || '队友找你聊了聊近况';
    ev = { key: 'teammate_' + sis.rel, text: '（队友支线）' + sis.name + '（' + sis.roleTag + '）' + flavor, support: 0 };
  }

  if (!ev) return false;

  // 应用数值影响
  if (ev.support && E.brother) {
    E.brother.support = Math.max(-100, Math.min(100, (E.brother.support || 0) + ev.support));
  }
  if (ev.failSupport && E.brother) {
    // 失败影响暂不直接扣，留给玩家选择时结算；这里只记录 pending
  }
  if (ev.exposure) {
    E.misc.exposureAccum = (E.misc.exposureAccum || 0) + ev.exposure;
  }
  if (ev.affect === 'popularity' && typeof ev.delta === 'number') {
    E.career.popularity = Math.max(0, Math.min(100, (E.career.popularity || 0) + ev.delta));
  }
  if (ev.affect === 'affection' && typeof ev.delta === 'number') {
    E.affection = Math.max(0, Math.min(100, (E.affection || 0) + ev.delta));
  }
  if (ev.flag) {
    E.flags = E.flags || {};
    E.flags[ev.flag] = true;
  }
  // 记录
  E.careerHistory.push({ round: r, day: E.cycle.dayCount, type: 'event', key: ev.key, text: ev.text });
  GS._entSimPendingEvent = '【事件】' + ev.text + (ev.support ? '（哥哥支持度 +' + ev.support + '）' : '');
  saveGame();
  return true;
}

function pickBrotherTest(E) {
  if (!E.brother || !E.brother.name) return null;
  var aff = E.affection || 0;
  for (var i = 0; i < BROTHER_ADVANCE_TESTS.length; i++) {
    var t = BROTHER_ADVANCE_TESTS[i];
    if (E.brother.testNudged && E.brother.testNudged[i + 1]) continue;
    if (aff < t.minAff) continue;
    if (t.maxAff && aff > t.maxAff) continue;
    if (randInt(1, 100) > 25) continue;
    if (E.brother.testNudged) E.brother.testNudged[i + 1] = true;
    return cloneEvent(t);
  }
  return null;
}

function pickRivalAdvance(E) {
  var node = E.npcNetwork && E.npcNetwork.nodes['npc_suitor'];
  if (!node) return null;
  var intimacy = node.intimacy || 0;
  // 6阶段情敌攻势：根据好感度定位阶段
  var aff = E.affection || 0;
  var stage = 1;
  for (var s = ENT_SIM_RIVAL_STAGES.length - 1; s >= 0; s--) {
    if (aff >= ENT_SIM_RIVAL_STAGES[s].minAff) { stage = ENT_SIM_RIVAL_STAGES[s].stage; break; }
  }
  // 阶段6：情敌退出祝福，无攻势
  if (stage >= 6) return null;
  // 20%概率触发
  if (randInt(1, 100) > 20) return null;
  var actions = ENT_SIM_RIVAL_ACTIONS[stage] || ENT_SIM_RIVAL_ACTIONS[1];
  if (!actions || !actions.length) return null;
  // 去重：避免同id重复触发
  var triggered = E._rivalTriggered || {};
  var available = actions.filter(function(a) { return !triggered[a.id]; });
  if (!available.length) { E._rivalTriggered = {}; available = actions; }
  var picked = available[randInt(0, available.length - 1)];
  E._rivalTriggered = E._rivalTriggered || {};
  E._rivalTriggered[picked.id] = true;
  var rvNode = getNpcNodes().filter(function(n) { return n.type === 'rival' || n.type === 'suitor'; })[0];
  var rvName = (rvNode && rvNode.name) || '团内成员';
  return { text: '【情敌·' + ENT_SIM_RIVAL_STAGES[stage-1].label + '】' + rvName + '：' + picked.desc, exposure: stage >= 3 ? 1 : 0, stage: stage };
}

function cloneEvent(ev) {
  var out = {};
  for (var k in ev) out[k] = ev[k];
  return out;
}

// 男主主动互动：10% 概率，按好感阶段解锁类型（作为 checkOneHeartEvents 的补充层）
export function maybeMaleLeadInitiative() {
  var E = GS.entSim;
  if (randInt(1, 100) > 10) return false;
  var aff = E.affection || 0;
  var pool = MALE_LEAD_INITIATIVE_POOL.filter(function(p) { return aff >= p.minAff; });
  if (pool.length === 0) return false;
  var ev = pool[randInt(0, pool.length - 1)];
  GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【男主主动】' + ev.text;
  saveGame();
  return true;
}
