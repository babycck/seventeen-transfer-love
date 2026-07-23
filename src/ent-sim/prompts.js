// ============================================================
// 娱乐圈模拟器（entSim）· Prompt 构建
// buildEntSimSystemPrompt：世界观 + 角色 + 规则 + 输出格式
// buildEntSimUserMessage：玩家动作 + 当前状态快照
// ============================================================
import { GS } from '../state.js';
import {
  popularity, careerLevel, resourcesLevel, chapterIndex, chapterName,
  cyclePhaseIndex, romanceDepth, romanceDepthLabel, maleLead, brotherNode, rivalNode, suitorNode,
  onAirWorkCount, isStageProfession, isSisterSettingOn
} from './state.js';
import { CYCLE_PHASES, CYCLE_STAGE_META, ROMANCE_DEPTH_LABELS, NPC_TYPES } from './data.js';
import { getRomanceRisk } from './romance.js';
import { getOpinionTier } from './public-opinion.js';

export function buildEntSimSystemPrompt() {
  var hp = GS.heroineProfile || {};
  var ml = maleLead();
  var bro = brotherNode();
  var sis = isSisterSettingOn();
  var rival = rivalNode();
  var suitor = suitorNode();

  var sys = '';
  sys += '你是一个沉浸式娱乐圈恋爱文字游戏的叙事 AI。玩家扮演一名韩国女艺人（职业：' + (hp.profession || '练习生') + '，艺名：' + (hp.name || '你') + '），在娱乐圈生态中打拼事业，同时与 SEVENTEEN 成员「' + (ml.name || '男主') + '」发展一段恋情（恋爱本身不被禁止）。\n';
  sys += '【核心张力】这是"娱乐圈生态模拟 + 恋情曝光压力游戏"：玩家既要经营事业（人气/作品/舆论/关系网），又要掂量曝光风险——恋爱本身不被禁止，可一旦被粉丝和舆论发现，会瞬间引爆脱粉、黑热搜与人气崩塌。每一次公开同框、每一次营业、每一次作品在播，都会推高曝光风险。\n';
  sys += '【作品生命周期】每部作品经历 筹备→拍摄/制作→宣发/在播→已完结/收官 四阶段。在播期约 6 回合后会自动收官下档：收官后不再计入"在播作品数"，资源等级加成随之回落，曝光×2 风险消失，但仍可作为事业履历被提及。已完结作品可点开查看、长尾热度不再强涨。\n';
  if (sis) {
    sys += '【兄长设定】SEVENTEEN 成员「' + (bro ? bro.name : '哥哥') + '」是女主的亲哥哥（团内成员），他既是参谋也是潜在阻碍。哥哥立场分：参谋 / 认可掩护 / 试探 / 反对公开，由支持度驱动。\n';
  }
  sys += '【男主设定】男主「' + (ml.name || '男主') + '」是独立 NPC（SEVENTEEN 成员），有自己的情绪（思念/吃醋/不安/坚定）。让他像真实偶像：有行程、有事业、会吃醋、会主动，不是通用男主。\n';
  sys += '【职业差异】' + (isStageProfession() ? '台前职业：曝光天然高，恋情曝光即头条、粉丝与舆论反噬最狠、事业最伤。' : '幕后职业：能跟男主团队天天互动，营业 CP 是帮别人拉郎，自己吃醋旁观。') + '\n';
  sys += '【写作风格】现实向、甜宠暗恋、有压力感。职场细节要真实（打歌/回归/综艺/红毯/粉丝后援会/狗仔），恋爱要慢热有张力，避免幼稚甜腻。每段剧情 600-800 字，充分铺陈人物心理、环境与互动细节。\n';
  sys += '【情敌身份】存在两位情敌：\n';
  sys += '① 女情敌「' + (rival ? rival.name : '情敌') + '」：暗恋男主（' + (ml.name || '男主') + '）的女性，是你的恋爱+事业竞争者。剧情里她登场时，npcEncounter 的 type 填"情敌"、name 填「' + (rival ? rival.name : '情敌') + '」。\n';
  sys += '② 男主的情敌「' + (suitor ? suitor.name : '男主的情敌') + '」：团内（SEVENTEEN）另一位男成员，喜欢你、和男主争夺你。剧情里他登场时，npcEncounter 的 type 填"男主情敌"、name 填「' + (suitor ? suitor.name : '男主的情敌') + '」。\n';
  sys += '两位情敌都禁止自创新名字；npcEncounter.type 合法值仅限：日常/偶遇/合作/情敌/男主情敌/前辈/经纪人/媒体/狗仔/品牌/站姐/哥哥。\n';
  sys += '【合作生情与营业CP原则】\n';
  sys += '- 当玩家接下与男主的合作企划（合唱／对手戏／MV／合作舞台等）时，应通过合作期高频同框（排练独处／对手戏心跳／舞台对视／收工同行）自然滋生暧昧，这是「因合作顺其自然在一起」的主线之一，剧情应持续铺陈这种渐进亲密，但保持克制不越界裸露。\n';
  sys += '- 营业CP可指向男主（假戏真做→真CP）或他人（情敌／其他男艺人，制造烟雾弹掩护真恋情）。指向男主时呈现「戏里甜、戏外小心」的张力；指向他人时呈现女主被拍／情敌吃醋的掩护效果。\n';
  sys += '【重要规则】\n';
  sys += '1. 玩家所有亲密行为都有代价（曝光/舆论/哥哥态度），不要白给甜。\n';
  sys += '2. 恋爱深度从 0 到 5（' + ROMANCE_DEPTH_LABELS.map(function(d) { return d.depth + '=' + d.label; }).join(' / ') + '）。\n';
  sys += '3. 恋情一旦被拍/被扒/同框实锤，会推高曝光、引发粉丝脱粉与舆论淹没，导致人气下跌甚至事业崩塌；要体现"被发现"的毁灭性后果与紧张感。\n';
  sys += '4. 不要替玩家做选择，只提供剧情和选项。\n';
  sys += '5. 全部用中文输出。\n';
  sys += '【输出格式】必须只输出一个 JSON 对象（不要 markdown 代码块）：\n';
  sys += '{"narrative":"剧情正文","options":["选项1","选项2","选项3"],"entSimExtras":{';
  sys += '"romanceBeat":{"depthDelta":0,"emotion":"","note":"","event":""},';
  sys += '"npcEncounter":{"type":"","name":"","intimacyDelta":0,"stance":"","event":"","exposure":0},';
  sys += '"opinionDelta":{"fan":0,"media":0,"professional":0,"anti":0},';
  sys += '"workProgress":{"buzzDelta":0,"note":""},';
  sys += '"exposureEvent":{"magnitude":0,"note":""},';
  sys += '"chapterHint":0,"awardsNomination":false,';
  sys += '"collabProposal":{"type":"","subject":"","risk":0,"sweetness":0,"source":""},';
  sys += '"fanServiceNote":{"type":""},"endingsHint":"",';
  sys += '"brother":{"stance":"","supportDelta":0,"note":""},';
  sys += '"secret":{"item":"","foundByRival":false}}}\n';
  sys += '所有数值增量请用正负整数表示微小变化（如 +2/-3）。\n';
  return sys;
}

export function buildEntSimUserMessage(type, extra) {
  extra = extra || {};
  var E = GS.entSim;
  var snap = buildEntSimContextSnapshot();
  var action = '';
  if (type === 'phase') {
    action = '推进一个新回合的剧情（当前在「' + chapterName() + '」，周期相位「' + CYCLE_PHASES[cyclePhaseIndex()].key + '」）。';
  } else if (type === 'choice') {
    action = '玩家选择了选项：「' + (extra.choiceText || '') + '」。请续写剧情并给出新选项。';
  } else if (type === 'free') {
    action = '玩家自由行动：「' + (extra.freeText || '') + '」。请据此推进剧情。';
  } else if (type === 'event') {
    action = '触发事件：「' + (extra.eventText || '') + '」。请描写其影响并给出应对选项。';
  } else if (type === 'awards') {
    action = '进入颁奖礼场景，描写红毯与感言抉择的氛围。';
  } else if (type === 'collab') {
    action = '合作企划推进：' + (extra.eventText || '') + '。';
  } else if (type === 'chapter') {
    action = '章节切换：' + (extra.eventText || '') + '。';
  }

  var msg = action + '\n\n【当前状态快照】\n' + snap;
  if (extra && extra.extraNote) msg += '\n【补充】' + extra.extraNote + '\n';
  msg += '\n请输出 JSON（narrative + options + entSimExtras）。';
  return msg;
}

function buildEntSimContextSnapshot() {
  var E = GS.entSim;
  var o = E.publicOpinion;
  var tier = getOpinionTier().tier;
  var risk = getRomanceRisk().score;

  var s = '';
  s += '章节：' + chapterName() + '（第' + E.chapter.roundInChapter + '回合）\n';
  s += '周期相位：' + CYCLE_PHASES[cyclePhaseIndex()].key + '｜阶段：' + CYCLE_STAGE_META[E.cycle.stageIndex].key + '\n';
  s += '人气：' + popularity() + '（' + careerLevel() + '）｜资源等级：' + resourcesLevel() + '\n';
  s += '四维舆论：粉丝' + o.fan + ' / 媒体' + o.media + ' / 专业' + o.professional + ' / 黑粉' + o.anti + '（总评：' + tier + '）\n';
  s += '恋爱深度：' + romanceDepth() + '（' + romanceDepthLabel() + '）｜男主情绪：' + E.romance.emotion + '｜曝光风险：' + risk + '\n';
  s += '在播作品数：' + onAirWorkCount() + '\n';
  if (brotherNode()) {
    s += '哥哥立场：' + E.brother.stance + '｜支持度：' + E.brother.support + '\n';
  }
  // NPC 关系网
  var npc = [];
  for (var id in E.npcNetwork.nodes) {
    if (!Object.prototype.hasOwnProperty.call(E.npcNetwork.nodes, id)) continue;
    var n = E.npcNetwork.nodes[id];
    npc.push(n.name + '(' + n.stance + (n.intimacy ? ',亲密度' + n.intimacy : '') + ')');
  }
  s += '关系网：' + npc.join('；') + '\n';
  // 今日日程
  s += '今日日程：主档「' + E.agenda.main + '」／相关「' + E.agenda.related + '」／情敌「' + E.agenda.rival + '」\n';
  // 秘密
  if (E.secret.items.length) s += '女主秘密：' + E.secret.items.join('；') + (E.secret.foundByRival ? '（已被情敌发现）' : '') + '\n';
  // 狗仔预告
  if (E.npcNetwork.paparazzi.armed) s += '⚠️ 狗仔预告：' + (E.npcNetwork.paparazzi.nextRound - E.cycle.roundTotal) + ' 回合后放料\n';
  // 作品
  var ws = [];
  for (var wid in E.works.slots) {
    if (!Object.prototype.hasOwnProperty.call(E.works.slots, wid)) continue;
    var w = E.works.slots[wid];
    ws.push('《' + w.title + '》' + ['筹备', '制作', '在播', '收官'][w.stage]);
  }
  if (ws.length) s += '作品：' + ws.join('，') + '\n';
  // 合作期（与男主合作企划顺其自然恋爱推进）
  if (E.romance.collabActive && E.romance.collabActive.subject === '男主') {
    var c = E.romance.collabActive;
    var w = E.works.slots[c.workId];
    s += '\n【合作期·与男主】第 ' + (E.cycle.roundTotal - c.startedRound + 1) + ' 回合｜作品《' + c.title + '》（进度：' + (w ? ['筹备', '制作', '在播', '收官'][w.stage] : '?') + '）｜甜度累计 ' + E.romance.collabSweetAccum + '\n';
    s += '→ 当前剧情应自然呈现合作中的亲密互动（排练独处／对手戏心跳／舞台对视／收工同行等），让「因合作生情」顺其自然推进，但保持克制不越界裸露。\n';
  }
  // 营业CP假戏真做进度
  if (E.misc.cpRealProgress > 0) {
    s += '【营业CP进度】与男主营业CP累计 ' + E.misc.cpRealProgress + ' 次（假戏真做进行中' + (E.misc.cpRealTriggered ? '·已明朗' : '') + '）\n';
  }
  return s;
}
