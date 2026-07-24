// ============================================================
// 娱乐圈模拟器（entSim）· 状态初始化与便捷取值
// 在 setup 完成时调用 initEntSimState()；提供一组只读 getter 供 UI / 引擎使用。
// ============================================================
import { GS, setGS, saveGame } from '../state.js';
import { MEMBERS, buildEntSimHeroineGroup, buildEntSimGroupMeta } from '../data.js';
import { randInt } from '../utils.js';
import { ENT_SIM_CAREERS, CHAPTERS, NPC_TYPES, RIVAL_NAMES, CYCLE_STAGE_META, ROMANCE_DEPTH_LABELS } from './data.js';

// 初始化 entSim 全部运行时状态（setup 完成后调用一次）
export function initEntSimState() {
  if (!GS.entSim) GS.entSim = {};
  var E = GS.entSim;
  // 手册规定：队友妹妹世界观下职业固定为「女团爱豆」
  var careerKey = '女团爱豆';
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
    profession: careerKey,
    careerKey: careerKey,
    popularity: career.startPopularity,
    careerLevel: careerLevelOf(career.startPopularity),
    resourcesLevel: '新人'
  };
  E.works = { slots: {} }; // 在播作品槽位（onAirWorkCount 读取，防止 .slots 未初始化抛 TypeError）
  E.cycle = { phaseIndex: 0, stageIndex: 0, roundTotal: 0, timeOfDay: 0, dayCount: 1 };
  // 好感度（0-100）：恋爱主线核心驱动，AI 每回合返回 affectionDelta 推进
  E.affection = 0;
  E.npcNetwork = {
    nodes: {}
  };
  E.romance = {
    depth: 0, // 兼容保留（不再作为主驱动，由 affection 派生 stage）
    stage: '初遇', // 由 affection 派生的 8 阶段标签
    emotion: '思念',
    lastBeatRound: 0,
    confessionDone: false,
    confessionResult: '',
    coverUsed: 0,
    publicLine: false,
    seedEvent: '', // AI 在 setup 生成的 200 字上心契机存档
    mannerisms: [], // 男主小动作池（setup 抽取）
    confessionTimes: 0, // 告白次数（第2次被拒则不再主动告白）
    maleLead: { id: maleLead.id, name: maleLead.name, memberId: maleLead.id },
    dateCount: 0 // 约会次数
  };
  E.romance.mannerisms = buildMannerisms(maleLead); // 男主小动作池：1主 + 1备
  E.dailyBuzz = { hotSearch: [], fanDiscussion: [], mediaTitle: [], lastGenDay: -1 };
  E.careerHistory = [];
  E.secret = { items: defaultSecrets(), foundByRival: false, broTeaseRound: 0, maleRound: 0, rivalRound: 0 };
  E.brother = {
    stance: brother ? '参谋' : '无',
    support: brother ? 0 : 0,
    name: brother ? brother.name : '',
    pool: [],
    testNudged: { 1: false, 2: false, 3: false },
    rivalAware: false,
    talkPending: false
  };
  E.chapter = { index: career.startChapter, name: chapterNameOf(career.startChapter), roundInChapter: 0, entered: true };

  E.agenda = { main: '', mainLoc: '', related: '', relatedLoc: '', rival: '', rivalLoc: '', brother: '', brotherLoc: '', doneFlags: {} };
  // 记忆系统：每日压缩的关键词摘要 + 关键事件累积（不过期）
  E.memory = { dailySummaries: [], eventLog: [], lastCompressDay: 0 };
  // 女团队友（5 位姐姐）：setup 时具象化，供 AI 客串
  E.heroineGroup = buildEntSimHeroineGroup();
  E.groupMeta = buildEntSimGroupMeta();
  E.misc = { suspicion: 0, manualPRUsed: 0, prRemaining: 2, exposureAccum: 0, cpRealProgress: 0, cpRealTriggered: false, npcInteractionUsed: 0 }; // npcInteractionUsed 每日1次限制
  E.flags = {};
  E.started = false; // 首轮剧情是否已成功生成（renderHtml 据此避免重复触发生成）

  // 社交系统字段
  E.chatHistory = E.chatHistory || [];
  E.moments = E.moments || [];
  E.theaterHistory = E.theaterHistory || [];
  E.fanReactions = E.fanReactions || []; // 营业/曝光后的粉丝圈反应

  // 关系网 NPC 初始节点（精简 4 类）
  initNpcNodes();

  // 重置生成中/自动重试等瞬态标志，避免上一局崩溃残留导致卡死
  GS._entSimGenerating = false;
  GS._entSimAutoTries = 0;
  GS._entSimCurrent = null;

  saveGame();
  return E;
}

// 生成男主小动作池：从成员 catchphrases / comforts / quirks 中抽取 1 主 + 1 备
// 例如 "推眼镜"、"哼歌前清嗓子"、"紧张时摸后颈" 等，供剧情每 5-8 回合自然出现一次
function buildMannerisms(member) {
  var pool = [];
  if (member.catchphrases && member.catchphrases.length) pool = pool.concat(member.catchphrases.slice(0, 2));
  if (member.comforts && member.comforts.length) pool = pool.concat(member.comforts.slice(0, 2));
  if (member.habits && member.habits.length) pool = pool.concat(member.habits.slice(0, 2));
  if (member.quirks && member.quirks.length) pool = pool.concat(member.quirks.slice(0, 2));
  if (pool.length === 0) return ['无意识地看向你', '听到你名字时停顿了一下'];
  // 去重并随机抽取 2 个
  var uniq = [];
  for (var i = 0; i < pool.length; i++) {
    if (uniq.indexOf(pool[i]) === -1) uniq.push(pool[i]);
  }
  var out = [];
  while (out.length < 2 && uniq.length) {
    var idx = randInt(0, uniq.length - 1);
    out.push(uniq.splice(idx, 1)[0]);
  }
  return out.length ? out : ['无意识地看向你'];
}

// 女团队友具象化函数 buildHeroineGirlGroup 已迁移至 data.js（避免循环依赖）

function pickMember(excludeId, isBrother) {
  var pool = MEMBERS.slice();
  if (excludeId) pool = pool.filter(function(m) { return m.id !== excludeId; });
  if (pool.length === 0) pool = MEMBERS.slice();
  return pool[randInt(0, pool.length - 1)];
}

function defaultSecrets() {
  // 女主秘密：追过 EXO 金珉锡 + 瞒哥去签售会 + 藏了男主/EXO 周边（用户设定）
  var pool = [
    '私下是 EXO 金珉锡的粉丝，手机里存着他很多直拍',
    '瞒着哥哥偷偷去看了 EXO 金珉锡的签售会',
    '床头的抽屉里藏着男主的周边小卡和 EXO 的金珉锡小卡',
    '练习生时期在男主直播间刷过半年礼物，从没敢说',
    '写过的关于金珉锡的同人文还锁在备忘录里'
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
    // 不再创建女性情敌节点，团内竞争者由 suitor 承载
    if (type === 'rival') continue;
    var nid = 'npc_' + type;
    if (!E.npcNetwork.nodes[nid]) {
      var nm;
      if (type === 'suitor') {
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
    }
  }
}

export function rivalNode() {
  // 女性情敌已移除，统一返回 suitor（SEVENTEEN 团内竞争者）
  return suitorNode();
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
  var p = (GS.entSim && GS.entSim.career && GS.entSim.career.profession) || (GS.heroineProfile && GS.heroineProfile.profession) || '';
  return ['爱豆', '演员', '歌手', '主播', '模特', '练习生', '女团爱豆'].indexOf(p) >= 0;
}
export function isSisterSettingOn() {
  var p = (GS.entSim && GS.entSim.career && GS.entSim.career.profession) || (GS.heroineProfile && GS.heroineProfile.profession) || '';
  return (ENT_SIM_CAREERS[p] && ENT_SIM_CAREERS[p].sisterSetting) || false;
}

// ---------- 派生 ----------
export function careerLevelOf(pop) {
  if (pop >= 85) return '传奇';
  if (pop >= 70) return '顶流';
  if (pop >= 55) return '当红';
  if (pop >= 35) return '走红';
  if (pop >= 15) return '上升期';
  return '新人';
}
function chapterNameOf(idx) {
  return (CHAPTERS[idx - 1] && CHAPTERS[idx - 1].name) || '练习生期';
}
function chapterIconOf(idx) {
  return (CHAPTERS[idx - 1] && CHAPTERS[idx - 1].icon) || '🌱';
}
// 根据人气阈值计算应处章节（1-4），只进不退
export function chapterByPopularity(pop, startChapter) {
  var start = startChapter || 1;
  var threshold = 1;
  if (pop >= 88) threshold = 4;
  else if (pop >= 65) threshold = 3;
  else if (pop >= 35) threshold = 2;
  return Math.max(start, threshold);
}
// 检查并推进章节，返回是否发生跨越
export function checkChapterAdvance() {
  var E = GS.entSim;
  if (!E || !E.chapter || !E.career) return false;
  var target = chapterByPopularity(E.career.popularity, E.career.startChapter || E.chapter.index || 1);
  var old = E.chapter.index || 1;
  if (target > old) {
    E.chapter.index = target;
    E.chapter.name = chapterNameOf(target);
    E.chapter.icon = chapterIconOf(target);
    E.chapter.roundInChapter = 0;
    E.chapter.entered = true;
    saveGame();
    return true;
  }
  return false;
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
// reason 非空时写 careerHistory（Bug 9：人气变动可见）
export function addPopularity(delta, reason) {
  if (!GS.entSim) return 0;
  var p = (GS.entSim.career.popularity || 0) + (delta || 0);
  p = Math.max(0, Math.min(100, p));
  GS.entSim.career.popularity = p;
  recomputeCareerLevel();
  if (reason) {
    GS.entSim.careerHistory.push({ round: GS.entSim.cycle.roundTotal, day: GS.entSim.cycle.dayCount, type: 'popularity', text: reason + ' ' + (delta >= 0 ? '+' : '') + delta });
  }
  saveGame();
  return p;
}

// 事业等级由人气阈值派生（弥补初始化后不再重算的缺口）
export function recomputeCareerLevel() {
  if (!GS.entSim) return;
  GS.entSim.career.careerLevel = careerLevelOf(GS.entSim.career.popularity);
}
