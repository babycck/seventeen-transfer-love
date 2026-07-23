// ============================================================
// 娱乐圈模拟器（entSim）· 状态初始化与便捷取值
// 在 setup 完成时调用 initEntSimState()；提供一组只读 getter 供 UI / 引擎使用。
// ============================================================
import { GS, setGS, saveGame } from '../state.js';
import { MEMBERS } from '../data.js';
import { randInt } from '../utils.js';
import { ENT_SIM_CAREERS, CHAPTERS, NPC_TYPES, RIVAL_NAMES, CYCLE_STAGE_META, ROMANCE_DEPTH_LABELS } from './data.js';

// 初始化 entSim 全部运行时状态（setup 完成后调用一次）
export function initEntSimState() {
  if (!GS.entSim) GS.entSim = {};
  var E = GS.entSim;
  var careerKey = (GS.heroineProfile && GS.heroineProfile.profession) || '练习生';
  var career = ENT_SIM_CAREERS[careerKey] || ENT_SIM_CAREERS['练习生'];

  // 男主：优先使用 setup 选中的成员（R1 独立 NPC），否则随机
  var maleLead = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }) || pickMember();
  // 哥哥：另一名成员（关系户=亲哥哥，仅 sisterSetting 职业有）
  var brother = null;
  if (career.sisterSetting) {
    brother = pickMember(maleLead ? maleLead.id : '', true);
  }

  // 锁定娱乐圈世界观 + 哥哥关系（复用 oneHeart 兼容字段，便于 isSisterSetting 双门控）
  GS.worldSetting = 'entertainment';
  if (brother) {
    GS.oneHeartRelationCharacter = { id: brother.id, name: brother.name, role: '哥哥', isBrother: true };
  } else {
    GS.oneHeartRelationCharacter = null;
  }

  E.career = {
    popularity: career.startPopularity,
    careerLevel: careerLevelOf(career.startPopularity),
    resourcesLevel: '新人'
  };
  E.cycle = { phaseIndex: 0, stageIndex: 0, roundInPhase: 0, roundInStage: 0, roundTotal: 0 };
  E.publicOpinion = { fan: 50, media: 50, professional: 50, anti: 0 };
  E.npcNetwork = {
    nodes: {},
    paparazzi: { nextRound: 0, armed: false },
    filmSis: { backstabArmed: false }
  };
  E.romance = {
    depth: 0,
    emotion: '思念',
    lastBeatRound: 0,
    confessionDone: false,
    confessionResult: '',
    coverUsed: 0,
    publicLine: false,
    seedEvent: '',
    mannerisms: [],
    collabActive: null, // 进行中的合作期 {workId,subject,type,title,sweetness,startedRound}
    collabSweetAccum: 0, // 与男主合作累计甜度
    maleLead: { id: maleLead.id, name: maleLead.name, memberId: maleLead.id }
  };
  E.works = { slots: {}, nextWorkId: 1 };
  E.dailyBuzz = { hotSearch: [], fanDiscussion: [], mediaTitle: [], lastGenRound: -1 };
  E.careerHistory = [];
  E.secret = { items: defaultSecrets(), foundByRival: false, broTeaseRound: 0, maleRound: 0, rivalRound: 0 };
  E.brother = {
    stance: brother ? '参谋' : '无',
    support: brother ? 0 : 0,
    pool: [],
    testNudged: { 1: false, 2: false, 3: false },
    rivalAware: false,
    talkPending: false
  };
  E.chapter = { index: career.startChapter, name: chapterNameOf(career.startChapter), roundInChapter: 0, entered: true };
  E.fittings = { dresses: [], lastGenRound: -1 };
  E.endings = { hint: '', locked: false, type: '', eligible: false, text: '' };
  E.agenda = { main: '', related: '', rival: '', doneFlags: {} };
  E.misc = { suspicion: 0, manualPRUsed: 0, prRemaining: 2, exposureAccum: 0, cpRealProgress: 0, cpRealTriggered: false };
  E.flags = {};

  // 关系网 7 类 NPC 初始节点
  initNpcNodes();

  // 章节进入记录
  E.careerHistory.push({ round: 0, type: 'chapter', text: '进入' + E.chapter.name });

  // 重置生成中/自动重试等瞬态标志，避免上一局崩溃残留导致卡死
  GS._entSimGenerating = false;
  GS._entSimAutoTries = 0;
  GS._entSimCurrent = null;

  saveGame();
  return E;
}

function pickMember(excludeId, isBrother) {
  var pool = MEMBERS.slice();
  if (excludeId) pool = pool.filter(function(m) { return m.id !== excludeId; });
  if (pool.length === 0) pool = MEMBERS.slice();
  return pool[randInt(0, pool.length - 1)];
}

function defaultSecrets() {
  // 系统5：娱乐圈专属秘密（非 EXO 向），开局随机 2 条
  var pool = [
    '曾经匿名在男主直播间刷了半年礼物',
    '手机里存着男主早期的练习生视频',
    '偷偷去了男主家乡的咖啡店打卡',
    '写过关于男主的同人短文锁在备忘录',
    '收藏了男主代言的整套周边'
  ];
  var copy = pool.slice();
  var out = [];
  for (var i = 0; i < 2 && copy.length; i++) {
    var idx = randInt(0, copy.length - 1);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function initNpcNodes() {
  var E = GS.entSim;
  var ml = E.romance.maleLead || {};
  var mlId = ml.memberId || ml.id || '';
  var broId = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.id) || '';
  for (var type in NPC_TYPES) {
    if (!Object.prototype.hasOwnProperty.call(NPC_TYPES, type)) continue;
    var nid = 'npc_' + type;
    if (!E.npcNetwork.nodes[nid]) {
      var nm;
      if (type === 'rival') {
        nm = RIVAL_NAMES[randInt(0, RIVAL_NAMES.length - 1)];
      } else if (type === 'suitor') {
        // 男主的情敌 = 团内（SEVENTEEN）另一位男成员，排除男主与哥哥
        var sp = MEMBERS.filter(function (m) { return m.id !== mlId && m.id !== broId; });
        if (sp.length === 0) sp = MEMBERS.slice();
        nm = sp[randInt(0, sp.length - 1)].name;
      } else {
        nm = NPC_TYPES[type].label;
      }
      E.npcNetwork.nodes[nid] = {
        id: nid, type: type, name: nm,
        intimacy: 0, stance: NPC_TYPES[type].stanceOptions[0], lastEventRound: -1
      };
    } else if (type === 'rival' && E.npcNetwork.nodes[nid].name === NPC_TYPES[type].label) {
      // 旧存档兼容：情敌节点曾用类型标签当名字，补一个固定身份
      E.npcNetwork.nodes[nid].name = RIVAL_NAMES[randInt(0, RIVAL_NAMES.length - 1)];
    }
  }
}

export function rivalNode() {
  return (GS.entSim && GS.entSim.npcNetwork && GS.entSim.npcNetwork.nodes['npc_rival']) || null;
}

export function suitorNode() {
  return (GS.entSim && GS.entSim.npcNetwork && GS.entSim.npcNetwork.nodes['npc_suitor']) || null;
}

// ---------- 便捷取值 ----------
export function entSim() { return GS.entSim || {}; }
export function popularity() { return (GS.entSim && GS.entSim.career.popularity) || 0; }
export function careerLevel() { return (GS.entSim && GS.entSim.career.careerLevel) || '新人'; }
export function resourcesLevel() { return (GS.entSim && GS.entSim.career.resourcesLevel) || '新人'; }
export function chapterIndex() { return (GS.entSim && GS.entSim.chapter.index) || 1; }
export function chapterName() { return (GS.entSim && GS.entSim.chapter.name) || '练习生期'; }
export function cyclePhaseIndex() { return (GS.entSim && GS.entSim.cycle.phaseIndex) || 0; }
export function romanceDepth() { return (GS.entSim && GS.entSim.romance.depth) || 0; }
export function romanceDepthLabel() { return (ROMANCE_DEPTH_LABELS[romanceDepth()] || {}).label || '初遇'; }
export function maleLead() { return (GS.entSim && GS.entSim.romance.maleLead) || { id: '', name: '' }; }
export function brotherNode() { return GS.oneHeartRelationCharacter || null; }

export function onAirWorkCount() {
  var slots = (GS.entSim && GS.entSim.works.slots) || {};
  var n = 0;
  for (var k in slots) { if (slots[k].stage === 2) n++; }
  return n;
}

// 职业差异（系统4）：台前 vs 幕后、是否 sisterSetting
export function isStageProfession() {
  var p = (GS.heroineProfile && GS.heroineProfile.profession) || '';
  return ['爱豆', '演员', '歌手', '主播', '模特', '练习生'].indexOf(p) >= 0;
}
export function isSisterSettingOn() {
  var p = (GS.heroineProfile && GS.heroineProfile.profession) || '';
  return (ENT_SIM_CAREERS[p] && ENT_SIM_CAREERS[p].sisterSetting) || false;
}

// ---------- 派生 ----------
export function careerLevelOf(pop) {
  if (pop >= 88) return '传奇';
  if (pop >= 65) return '巅峰';
  if (pop >= 35) return '上升';
  return '新人';
}
function chapterNameOf(idx) {
  return (CHAPTERS[idx - 1] && CHAPTERS[idx - 1].name) || '练习生期';
}
export function stageNameOf(idx) {
  return (CYCLE_STAGE_META[idx] && CYCLE_STAGE_META[idx].key) || '新人期';
}

// 每轮后重新派生资源等级（在播作品数 ×2）
export function recomputeResourcesLevel() {
  var n = onAirWorkCount();
  var lv = n >= 4 ? '顶流' : (n >= 2 ? '当红' : (n >= 1 ? '上升' : '新人'));
  if (GS.entSim) GS.entSim.career.resourcesLevel = lv;
  return lv;
}

// 人气增减（夹紧 0-100），并同步重算事业等级（人气崩则降级）
export function addPopularity(delta) {
  if (!GS.entSim) return 0;
  var p = (GS.entSim.career.popularity || 0) + (delta || 0);
  p = Math.max(0, Math.min(100, p));
  GS.entSim.career.popularity = p;
  recomputeCareerLevel();
  saveGame();
  return p;
}

// 事业等级由人气阈值派生（弥补初始化后不再重算的缺口）
export function recomputeCareerLevel() {
  if (!GS.entSim) return;
  GS.entSim.career.careerLevel = careerLevelOf(GS.entSim.career.popularity);
}
