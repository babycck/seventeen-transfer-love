// ============================================================
// 哥哥事件池 + 男主主动互动（剧情驱动，不影响告白门槛）
// 每回合并发判定：哥哥 15%、男主 10%，抽中则把事件注入下一段剧情 prompt。
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { addExposure, getScandalHeat } from './public-opinion.js';
import { ENT_SIM_RIVAL_STAGES, ENT_SIM_RIVAL_ACTIONS } from './data.js';
import { GIRLGROUP_EVENTS, BROTHER_EVENT_POOL, MALE_LEAD_INITIATIVE_POOL, CONTACT_PROGRESSION, SPECIAL_EVENTS, INCIDENT_EVENTS_POOL, ONEHEART_RANDOM_EVENTS, JEALOUSY_EVENTS_POOL, INDUSTRY_EVENTS, RIVAL_ADVANCE_EVENTS, SECRET_DISCOVERY_EVENTS, BROTHER_ADVANCE_TESTS, BROTHER_SIDE_PLOTS, TEAMMATE_FLAVOR, TEAMMATE_BOND_POOL, DATING_SCANDAL_CHAIN, PRESS_INTERVIEW_POOL, SISTER_DAILY_POOL, FAN_NPC_POOL } from './pools/index.js';
// npc-network 已移除，情敌名改用 rival 字段

// 哥哥事件：15% 概率；成功则注入并应用影响
export function maybeBrotherEvent() {
  var E = GS.entSim;
  if (randInt(1, 100) > 9) return false; // v5: 15%→9% 降40%
  var ev = BROTHER_EVENT_POOL[randInt(0, BROTHER_EVENT_POOL.length - 1)];
  if (ev.stance) E.brother.stance = ev.stance;
  // 随机事件只注入剧情，不改支持度——哥哥支持度必须由玩家选项驱动
  if (ev.text) E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'brother', text: ev.text });
  GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【哥哥】' + ev.text;
  saveGame();
  return true;
}

// ── 哥哥立场按 support 区间自动推导（每日换天时调用） ──
// 区间：>=30→参谋(supportive) / 0~29→观望(observing) / -15~-1→疑虑(testing) / <-15→反对(protective)
export function autoUpdateBrotherStance() {
  var E = GS.entSim;
  if (!E || !E.brother || !E.brother.name) return;
  var sup = E.brother.support || 0;
  var oldStance = E.brother.stance;
  var newStance = oldStance;
  if (sup >= 30) newStance = '参谋';
  else if (sup >= 0) newStance = '观望';
  else if (sup >= -15) newStance = '疑虑';
  else newStance = '反对';
  if (newStance !== oldStance) {
    E.brother.stance = newStance;
    pushSupportLog(E, 0, '立场自动切换：' + oldStance + ' → ' + newStance + '（支持度=' + sup + '）');
    saveGame();
  }
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
  // v6: 地点化事件池——根据今日日程地点决定哪些事件可触发
  var mainLoc = (E.agenda && E.agenda.mainLoc) || '练习室';
  function locMatch() {
    for (var i = 0; i < arguments.length; i++) { if (mainLoc.indexOf(arguments[i]) >= 0) return true; }
    return false;
  }

  // 1. 男主小动作：每 5-8 回合自然出现一次（练习室/待机室/公司优先）
  var lastM = E._lastMannerismRound || 0;
  var interval = E._mannerismInterval || randInt(10, 15);
  if (r - lastM >= interval && E.romance.mannerisms && E.romance.mannerisms.length && locMatch('练习室','待机室','公司','放送局')) {
    ev = { text: '男主的小动作：' + E.romance.mannerisms[randInt(0, E.romance.mannerisms.length - 1)], key: 'mannerism' };
    E._lastMannerismRound = r;
    E._mannerismInterval = randInt(10, 15);
  }

  // 2. 哥哥递进考验（优先级高于随机事件，练习室/公司/家里触发）
  if (!ev && locMatch('练习室','公司','家里','宿舍')) ev = pickBrotherTest(E);

  // 3. 情敌主动（按 rival intimacy 阈值，待机室/放送局/公司触发）
  if (!ev && locMatch('待机室','放送局','公司','练习室')) ev = pickRivalAdvance(E);

  // 4. 女主秘密被撞破（男主发现）——合并 data.js + 池子（宿舍/家里/练习室）
  if (!ev && E.secret && E.secret.items && E.secret.items.length && rnd <= 15 && locMatch('宿舍','家里','练习室')) {
    var secretPool = SECRET_DISCOVERY_EVENTS.concat(SPECIAL_EVENTS.filter(function(e) { return e.key && e.key.indexOf('secret_') === 0; }));
    ev = cloneEvent(secretPool[randInt(0, secretPool.length - 1)]);
  }

  // 4.5. 狗仔偷拍：恋情曝光风险≥暗涌(5) 时概率触发（放送局/待机室/停车场/公司外）
  if (!ev && getScandalHeat() >= 5 && rnd <= 20 && locMatch('放送局','待机室','公司','商场','街头','机场','停车场')) {
    var paparazziPool = [
      { text: '晚上收工后你在便利店门口等车，暗处有快门声——第二天一张模糊的背影照传遍论坛。', key: 'paparazzi', exposure: 2 },
      { text: '你和男主在楼道里擦肩而过，谁也没说话，但站姐拍到两人「对视为零」，放大后成了热搜。', key: 'paparazzi', exposure: 3 },
      { text: '有人拍到你们在停车场同时上车，虽然中间隔了五分钟——粉丝做了逐帧分析：「就是同一个停车场」。', key: 'paparazzi', exposure: 2 },
      { text: '队友帮你挡镜头的样子反而被拍下来成了热搜——粉丝评论：「这掩护也太明显了吧」。', key: 'paparazzi_hidden', exposure: 1 }
    ];
    ev = cloneEvent(paparazziPool[randInt(0, paparazziPool.length - 1)]);
  }

  // 4.6. 嫉妒事件：好感≥20时触发 v5: 15%→9%降40%（练习室/待机室/放送局）
  if (!ev && rnd <= 9 && JEALOUSY_EVENTS_POOL && JEALOUSY_EVENTS_POOL.length && locMatch('练习室','待机室','放送局')) {
    var affNow = E.affection || 0;
    var jp = JEALOUSY_EVENTS_POOL.filter(function(j) { return !j.minAff || affNow >= j.minAff; });
    if (jp.length) ev = cloneEvent(jp[randInt(0, jp.length - 1)]);
  }

  // 5. 哥哥支线（练习室/公司/家里）
  if (!ev && E.brother && E.brother.name && rnd <= 12 && locMatch('练习室','公司','家里','宿舍')) {
    ev = cloneEvent(BROTHER_SIDE_PLOTS[randInt(0, BROTHER_SIDE_PLOTS.length - 1)]);
  }

  // 6. 女团/行业事件（仅出道后触发，练习生期跳过）v5: 25%→15%降40%（放送局/待机室/公司）
  var isDebutEvents = (E.career && E.career.debutDay > 0) || (E.career && E.career.profession === '女团爱豆');
  if (!ev && rnd <= 15 && isDebutEvents && locMatch('放送局','待机室','公司','练习室','录影')) {
    var pool = [];
    if (E.career && E.career.profession === '女团爱豆') pool = pool.concat(GIRLGROUP_EVENTS);
    pool = pool.concat(INDUSTRY_EVENTS);
    pool = pool.concat(INCIDENT_EVENTS_POOL);
    if (pool.length) ev = cloneEvent(pool[randInt(0, pool.length - 1)]);
  }

  // 7. 好感铺垫（CONTACT_PROGRESSION）：仅出道后触发 v5: 30%→18%降40%（练习室/待机室/放送局）
  if (!ev && isDebutEvents && E.affection >= 0 && rnd <= 18 && CONTACT_PROGRESSION && CONTACT_PROGRESSION.length && locMatch('练习室','待机室','放送局')) {
    var cp = CONTACT_PROGRESSION.filter(function(p) { return !p.minAff || E.affection >= p.minAff; });
    if (cp.length) ev = cloneEvent(cp[randInt(0, cp.length - 1)]);
  }

  // 8. ONEHEART_RANDOM_EVENTS（仅出道后触发）v5: 18%→11%降40%（练习室/待机室/放送局/公司）
  if (!ev && isDebutEvents && rnd <= 11 && ONEHEART_RANDOM_EVENTS && ONEHEART_RANDOM_EVENTS.length && locMatch('练习室','待机室','放送局','公司')) {
    ev = cloneEvent(ONEHEART_RANDOM_EVENTS[randInt(0, ONEHEART_RANDOM_EVENTS.length - 1)]);
  }

  // v4: 池子接入⑧ TEAMMATE_BOND_POOL — 女团羁绊，替换队友支线 rnd≤10（练习室/宿舍/待机室）
  if (!ev && E.heroineGroup && E.heroineGroup.length && rnd <= 10 && TEAMMATE_BOND_POOL && TEAMMATE_BOND_POOL.length && locMatch('练习室','宿舍','待机室')) {
    ev = cloneEvent(TEAMMATE_BOND_POOL[randInt(0, TEAMMATE_BOND_POOL.length - 1)]);
  }
  // v4: 池子接入⑨ DATING_SCANDAL_CHAIN — scandalHeat>=10触发，rnd≤12（公共场合）
  if (!ev && getScandalHeat() >= 10 && rnd <= 12 && DATING_SCANDAL_CHAIN && DATING_SCANDAL_CHAIN.length && locMatch('放送局','待机室','商场','街头','机场','公司')) {
    var dscPool = DATING_SCANDAL_CHAIN.filter(function(d) { return !d.require || !d.require.startsWith('aff>=') || E.affection >= parseInt(d.require.slice(5), 10); });
    if (dscPool.length) ev = cloneEvent(dscPool[randInt(0, dscPool.length - 1)]);
  }
  // v4: 池子接入⑩ PRESS_INTERVIEW_POOL — 出道后人气≥15，rnd≤10（放送局/待机室/媒体间/公司）
  if (!ev && isDebutEvents && (E.career.popularity || 0) >= 15 && rnd <= 10 && PRESS_INTERVIEW_POOL && PRESS_INTERVIEW_POOL.length && locMatch('放送局','待机室','媒体间','公司','录影')) {
    var piPool = PRESS_INTERVIEW_POOL.filter(function(p) { return !p.require || !p.require.startsWith('aff>=') || E.affection >= parseInt(p.require.slice(5), 10); });
    if (piPool.length) ev = cloneEvent(piPool[randInt(0, piPool.length - 1)]);
  }

  // 9. 女团队友支线：5 位姐姐偶尔在剧情里出场，增添女团真实感（练习室/宿舍/待机室）
  if (!ev && E.heroineGroup && E.heroineGroup.length && rnd <= 22 && locMatch('练习室','宿舍','待机室','放送局','公司')) {
    var sis = E.heroineGroup[randInt(0, E.heroineGroup.length - 1)];
    var flavor = TEAMMATE_FLAVOR[sis.roleTag] || '队友找你聊了聊近况';
    ev = { key: 'teammate_' + sis.rel, text: '（队友支线）' + sis.name + '（' + sis.roleTag + '）' + flavor, support: 0 };
  }

  // 10. 女团日常池 SISTER_DAILY_POOL：每天20%概率触发（宿舍/练习室/待机室）
  //     v6: 日常事件独立于主事件，最多1个主事件+1个日常
  var dailyEv = null;
  if (E.heroineGroup && E.heroineGroup.length && Math.random() < 0.20 && SISTER_DAILY_POOL && SISTER_DAILY_POOL.length && locMatch('宿舍','练习室','待机室')) {
    var sdItem = SISTER_DAILY_POOL[randInt(0, SISTER_DAILY_POOL.length - 1)];
    if (sdItem && sdItem.text) {
      dailyEv = { text: '【女团日常】' + sdItem.text, key: 'sister_daily', exposure: 0 };
    }
  }

  // 11. 粉丝NPC池 FAN_NPC_POOL：出道后每天15%概率触发（放送局/待机室/签售会场/场馆外）
  if (!dailyEv && isDebutEvents && Math.random() < 0.15 && FAN_NPC_POOL && FAN_NPC_POOL.length && locMatch('放送局','待机室','签售会','场馆','会场')) {
    var fnItem = FAN_NPC_POOL[randInt(0, FAN_NPC_POOL.length - 1)];
    if (fnItem && fnItem.text) {
      dailyEv = { text: '【粉丝圈】' + fnItem.text, key: 'fan_npc', exposure: 0 };
    }
  }

  if (!ev) return false;

  // 应用数值影响
  if (ev.support && E.brother) {
    E.brother.support = Math.max(-100, Math.min(100, (E.brother.support || 0) + ev.support));
    pushSupportLog(E, ev.support, ev.text || '剧情抉择');
  }
  if (ev.failSupport && E.brother) {
    // 失败影响暂不直接扣，留给玩家选择时结算；这里只记录 pending
  }
  if (ev.exposure) {
    addExposure(ev.exposure, '事件·' + (ev.text || ''));
  }
  if (ev.affect === 'popularity' && typeof ev.delta === 'number') {
    E.career.popularity = Math.max(0, Math.min(100, (E.career.popularity || 0) + ev.delta));
    E.careerHistory.push({ round: r, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'popularity', text: '事件影响·' + (ev.text || '') + ' ' + (ev.delta >= 0 ? '+' : '') + ev.delta, delta: ev.delta });
  }
  if (ev.affect === 'affection' && typeof ev.delta === 'number') {
    E.affection = Math.max(0, Math.min(100, (E.affection || 0) + ev.delta));
  }
  if (ev.flag) {
    E.flags = E.flags || {};
    E.flags[ev.flag] = true;
  }
  // 记录主事件
  E.careerHistory.push({ round: r, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'event', key: ev.key, text: ev.text });
  var eventText = '【事件】' + ev.text + (ev.support ? '（哥哥支持度 +' + ev.support + '）' : '');
  // v6: 每回合最多 1 主事件 + 1 日常事件
  if (dailyEv) {
    eventText += '\n' + dailyEv.text;
    E.careerHistory.push({ round: r, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'daily', key: dailyEv.key, text: dailyEv.text });
  }
  GS._entSimPendingEvent = eventText;
  saveGame();
  return true;
}

// 记录哥哥支持度变动日志（供恋情面板点击查看）
function pushSupportLog(E, delta, reason) {
  E.brother.supportLog = E.brother.supportLog || [];
  E.brother.supportLog.push({
    day: E.cycle._gameDayCount || E.cycle.dayCount,
    delta: delta,
    reason: reason || '未知原因',
    total: E.brother.support,
    stance: E.brother.stance || '参谋'
  });
  saveGame();
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
  if (!available.length) {
    E._rivalTriggered = {};
    available = actions;
    // 回退到 RIVAL_ADVANCE_EVENTS 事件池（按情敌倾向 minIntimacy 过滤）
    var poolAvailable = RIVAL_ADVANCE_EVENTS.filter(function(e) { return intimacy >= e.minIntimacy && !E._rivalTriggered[e.key]; });
    if (poolAvailable.length) {
      var pEv = poolAvailable[randInt(0, poolAvailable.length - 1)];
      E._rivalTriggered[pEv.key] = true;
      var rvNameP = (E.rival && E.rival.name) || (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '团内成员';
      return { text: '【情敌·' + ENT_SIM_RIVAL_STAGES[stage-1].label + '】' + rvNameP + '：' + pEv.text, exposure: pEv.exposure || 0, stage: stage };
    }
  }
  var picked = available[randInt(0, available.length - 1)];
  E._rivalTriggered = E._rivalTriggered || {};
  E._rivalTriggered[picked.id] = true;
  var rvName = (E.rival && E.rival.name) || (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '团内成员';
  return { text: '【情敌·' + ENT_SIM_RIVAL_STAGES[stage-1].label + '】' + rvName + '：' + picked.desc, exposure: stage >= 3 ? 1 : 0, stage: stage };
}

function cloneEvent(ev) {
  var out = {};
  for (var k in ev) out[k] = ev[k];
  // 归一卷入池子条目的属性名
  if (out.t && !out.text) out.text = out.t;
  if (typeof out.popDelta === 'number') { out.affect = 'popularity'; out.delta = out.popDelta; }
  return out;
}

// 男主主动互动：25% 概率，按好感阶段解锁类型（v4: 从10%提升至25%，解决练习生期男主过于被动的问题）
export function maybeMaleLeadInitiative() {
  var E = GS.entSim;
  if (randInt(1, 100) > 25) return false;
  var aff = E.affection || 0;
  var pool = MALE_LEAD_INITIATIVE_POOL.filter(function(p) { return aff >= p.minAff; });
  if (pool.length === 0) return false;
  var ev = pool[randInt(0, pool.length - 1)];
  GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【男主主动】' + ev.text;
  saveGame();
  return true;
}
