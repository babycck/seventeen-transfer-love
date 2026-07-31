// ============================================================
// 娱乐圈地下恋（entSim）· UI 驾驶舱
// 三栏：左=娱乐圈背景(日程/队友/曝光) / 中=剧情·选项·自由输入 / 右=圈内态势(热搜/粉丝/关系网)
// 底部：8阶段好感度条 + 快捷指令(拉回主线/随机事件/探班/走向结局/进入下一天) + 4 Tab(剧情/聊天/朋友圈/剧场)
// ============================================================
import { GS, saveGame } from '../state.js';
import { popularity, careerLevel, addPopularity, formatGameDate, formatTraineeDate, saveEntSimGame, loadEntSimGame, listSaves } from './state.js';
import { buildEntSimHeroineGroup, buildEntSimGroupMeta } from '../data.js';
import { escHtml, showToast, randInt } from '../utils.js';
import { showApiSettingsModal } from '../modals.js';
import { showActionInfoModal } from '../modals/confirm-modal.js';
import { showVisitChoiceModal } from '../modals/visit-choice-modal.js';
import { RELEASE_POOL, FAN_LETTER_POOL, BRAND_OFFER_POOL, AWARD_POOL, VARIETY_SHOW_POOL, DISPATCH_POOL, MAGAZINE_POOL, RUMOR_POOL, COMEBACK_CYCLE_POOL, CONCERT_POOL, FANSIGN_POOL, CHAT_MALE_LEAD, CHAT_BROTHER, CHAT_RIVAL, CHAT_MANAGER, GROUP_CHAT, CHAT_SASAENG, getChatPresetsByChannel, getChatAckByChannel, getMaleLeadPresetsForChat, CHAT_ML_DAILY_STARTERS, HOT_SEARCH_REPLY_POOL, DIARY_TEMPLATES, MEMBER_SCOUPS, MEMBER_JEONGHAN, MEMBER_JOSHUA, MEMBER_JUN, MEMBER_HOSHI, MEMBER_WONWOO, MEMBER_WOOZI, MEMBER_DK, MEMBER_MINGYU, MEMBER_THE8, MEMBER_SEUNGKWAN, MEMBER_VERNON, MEMBER_DINO, pickFromPool } from './pools/index.js';
import { MEMBERS } from '../data.js';
import { getTimeOfDayLabel } from './cycle.js';
import { getDailyBuzz, generateFanReaction, generateBuzzRepliesAI, buzzTitle, buzzContent } from './immersion.js';
import {
  getRomanceStageLabel, getRomanceStageIcon, affectionStageIndex,
  tryConfession, applyConfessionResult, assessRomanceRisk, getCoverMechanisms, applyCover, canUseCover, getCoverRemaining, getJealousLabel
} from './romance.js';
import { addCareerPublicity, getCareerPublicity } from './public-opinion.js';
import {
  getEntSimCurrent, handleEntSimChoice, handleEntSimFreeInput,
  continueEntSimMain, triggerEntSimEvent, enterEntSimEnding,
  goEntSimNextDay, initiateEntSimDate, generateEntSimConfession,
  generateEntSimChat, generateEntSimMoment, generateEntSimTheater, handleEntSimRegenerate,
  generateEntSimRound, runEntSimEnding, triggerTeammateEvent, triggerSVTTeammateEvent, restartEntSim, sendBubbleMessage
} from './engine.js';
import { STAGE_CEREMONY } from './data.js';
import { TEAMMATE_FLAVOR, SVT_TEAMMATE_PROFILES } from './pools/index.js';

// 分类评论池：按条目类型倾向性抽选（c=category: stage/visual/variety/gossip/fan/neutral/reco/practice/common）
var BUZZ_COMMENT_POOL = [
  {t:'前排吃瓜 蹲后续',c:'gossip'},{t:'已阅 下一个',c:'common'},{t:'笑死 评论区比正文精彩',c:'common'},{t:'这是真的吗 有没有锤',c:'gossip'},
  {t:'有人科普一下前因后果吗',c:'neutral'},{t:'大家都好激动 冷静冷静',c:'common'},{t:'不管怎样 作品才是最重要的',c:'common'},
  {t:'说实话 我觉得还行 没那么夸张',c:'common'},{t:'一看就是对家买的 太明显了',c:'gossip'},{t:'走过路过不要错过 粉丝别吵了',c:'fan'},
  {t:'这话题居然上热搜了 是不是有人花钱了',c:'gossip'},{t:'看了三遍 还是没看懂大家在吵什么',c:'neutral'},
  {t:'有一说一 这个讨论挺低质的',c:'common'},{t:'求指路 原帖在哪',c:'neutral'},{t:'非粉 但这个真挺好笑的',c:'neutral'},
  {t:'我也觉得 终于有人说了',c:'common'},{t:'不懂就问 这是在说谁',c:'neutral'},{t:'关注作品 别关注私生活',c:'common'},
  {t:'相信她 这么多年了还没看清吗',c:'fan'},{t:'这圈子不就是这样 习惯就好',c:'common'},{t:'粉丝都散了吧 越吵越热',c:'fan'},
  {t:'别理黑子 专注自家',c:'fan'},{t:'纯路人 觉得还挺有意思的',c:'neutral'},{t:'刚吃完饭回来 发生了什么',c:'neutral'},
  {t:'反正我不信 等官方回应',c:'gossip'},{t:'心疼妹妹 又被拉出来挡枪',c:'fan'},{t:'为什么大家都在骂 我觉得挺正常啊',c:'neutral'},
  {t:'路转粉了 就喜欢这种真实感',c:'reco'},{t:'果然是饭圈 这也能吵起来',c:'common'},{t:'真相只有一个 吃瓜不信瓜',c:'gossip'},
  {t:'好家伙 今天这瓜可真多',c:'gossip'},{t:'默默点个赞 不敢说话',c:'neutral'},{t:'没有人觉得她最近状态超好吗',c:'fan'},
  // ── 舞台/作品 (stage) ──
  {t:'这个舞台看了四五遍了 出不去了',c:'stage'},{t:'这次编舞比上次好太多了',c:'stage'},{t:'声音太有辨识度了 闭眼都能听出',c:'stage'},{t:'舞蹈力度绝了好吧',c:'stage'},
  {t:'我投一票 这绝对今年最佳舞台',c:'stage'},{t:'这高音直接破防了 太好听了',c:'stage'},{t:'打歌舞台灯光也加分了 氛围绝了',c:'stage'},{t:'官方什么时候出高清直拍',c:'stage'},
  {t:'这个背景音是她的吧 好好听',c:'stage'},{t:'消音版我也看了 稳得像CD',c:'stage'},{t:'不知道有没有练习室版本',c:'stage'},
  {t:'就她一个还在认真对嘴 其他人呢',c:'stage'},{t:'看了一圈 还是她的舞台最舒服',c:'stage'},{t:'我觉得挺好听的啊为什么有人在骂',c:'stage'},{t:'这才是真正的全能爱豆',c:'stage'},
  {t:'这次回归的歌真的越听越上头',c:'stage'},{t:'粉色那套打歌服真的封神',c:'stage'},{t:'她写的这首词……真的有点东西',c:'stage'},
  // ── 颜值/造型 (visual) ──
  {t:'今天妆造绝了谁懂',c:'visual'},{t:'新造型好适合她',c:'visual'},{t:'颜值这块真的没输过',c:'visual'},{t:'这个表情管理真是没谁了',c:'visual'},
  {t:'生图都能打 这就是天生爱豆',c:'visual'},{t:'她瘦了好多 状态超好',c:'visual'},{t:'不懂就问 这是仙女吗',c:'visual'},{t:'眼睛里真的有光 好美',c:'visual'},
  {t:'机场穿搭太有品味了',c:'visual'},{t:'这个发色染到我心巴上了',c:'visual'},{t:'求一个原图 当壁纸',c:'visual'},{t:'拍手会去了 本人比照片好看一万倍',c:'visual'},
  {t:'看到有人吐槽她穿搭 我笑了 这还不好看？',c:'visual'},{t:'站姐拍的这套图美疯了',c:'visual'},{t:'有人知道她用什么香水吗 好好闻',c:'visual'},{t:'这次回归的造型团队真的强',c:'visual'},
  // ── 综艺/搞笑 (variety) ──
  {t:'这反应速度真的快 综艺感拉满',c:'variety'},{t:'她演的综艺这段我笑了十分钟',c:'variety'},{t:'太可爱了 想把她带回家',c:'variety'},{t:'刚下班就刷到这个 太幸福了',c:'variety'},
  {t:'就喜欢这种又甜又有态度的',c:'variety'},{t:'今天直播有人录屏吗 错过了一半',c:'variety'},{t:'看完这期综艺彻底入坑了',c:'variety'},{t:'这个综艺太好笑了 建议加常驻',c:'variety'},
  {t:'她跟主持人的互动好自然',c:'variety'},{t:'看了直播 本人性格真的好好',c:'variety'},{t:'这期综艺值得反复看 太搞笑了',c:'variety'},{t:'综艺上被整蛊那段真的笑死我了',c:'variety'},
  {t:'什么时候出个人综艺 想看',c:'variety'},{t:'这个团的团综太下饭了',c:'variety'},
  // ── 吃瓜/争议 (gossip) ──
  {t:'果然是无事生非 散了散了',c:'gossip'},{t:'等一个反转 先不站队',c:'gossip'},{t:'这瓜保熟吗 别又是造谣',c:'gossip'},{t:'爆料的人实名了吗 没实名不认',c:'gossip'},
  {t:'如果是真的那确实有点离谱了',c:'gossip'},{t:'无聊 又是这些没营养的话题',c:'gossip'},{t:'又有yxh在带节奏了 别上当',c:'gossip'},{t:'别带节奏了 人挺好的',c:'gossip'},
  {t:'不理解骂她的人 是作业太少吗',c:'gossip'},{t:'黑酸请退散',c:'gossip'},{t:'有人说她划水 我笑了 看直拍了吗',c:'gossip'},
  // ── 粉丝/应援 (fan) ──
  {t:'粉丝发的应援视频好好哭',c:'fan'},{t:'有人跟我一样从出道就在追吗',c:'fan'},{t:'这团真的越来越好了 肉眼可见的进步',c:'fan'},{t:'每天靠她的动态续命',c:'fan'},
  {t:'今天又是被治愈的一天',c:'fan'},{t:'她开心就好 其他不重要',c:'fan'},{t:'看到这么多人喜欢她 好感动',c:'fan'},{t:'看到她拿奖了 真替她开心',c:'fan'},
  {t:'不管外面怎么说 我们一直在',c:'fan'},{t:'她每一次鞠躬都让人觉得值得',c:'fan'},{t:'今天音源排名涨了 大家继续冲',c:'fan'},{t:'黑粉别来沾边好吧',c:'fan'},
  {t:'这个团真的需要更多关注 实力被低估',c:'fan'},{t:'今天下班图 她好像累了 眼神有点疲惫',c:'fan'},{t:'有人囤了专辑吗 出不出小卡',c:'fan'},
  // ── 安利/入坑 (reco) ──
  {t:'路人表示被圈粉了',c:'reco'},{t:'新人求安利 从哪里补比较好',c:'reco'},{t:'吃了安利来了 已关注',c:'reco'},
  {t:'我宣布我是她的新粉了',c:'reco'},{t:'第一次看她舞台 被震撼到了',c:'reco'},{t:'路人粉也忍不住评论一下了',c:'reco'},{t:'入坑三天 已经补了所有综艺',c:'reco'},
  {t:'请问有没有推荐的直拍 想给朋友安利',c:'reco'},{t:'她的歌每一首都符合我的取向',c:'reco'},{t:'get不到的人有难了',c:'reco'},{t:'有被惊艳到 谢谢',c:'reco'},
  {t:'路人来看热闹 结果出不去了',c:'reco'},
  // ── 练习/努力 (practice) ──
  {t:'凌晨还在练舞 真的太拼了',c:'practice'},{t:'这种实力真的不需要解释',c:'practice'},{t:'肉眼可见的进步 努力不会骗人',c:'practice'},{t:'出道前就练了那么久 值得被看到',c:'practice'},
  {t:'每次舞台都肉眼可见更稳了',c:'practice'},{t:'从练习室到舞台 一直在发光',c:'practice'},{t:'为什么有人黑她 明明那么努力',c:'practice'},{t:'她说过一句话—累了就再练一遍',c:'practice'},
  {t:'团里最努力的就是她了 有目共睹',c:'practice'},{t:'这才出道几年啊就这么稳了',c:'practice'},{t:'她真的很努力 每次舞台都进步',c:'practice'},{t:'人家说了最近在好好练习 别再问了',c:'practice'},
  // ── 兜底 (common) ──
  {t:'别吵了 听歌不香吗',c:'common'},{t:'弹幕刷屏的好烦',c:'common'},{t:'终于有人说实话了',c:'common'},{t:'最喜欢这种安静做事的人',c:'common'},
  {t:'搞笑和实力共存 有点意思',c:'common'},{t:'今晚直播蹲到了 幸福',c:'common'},{t:'考古了一下 她从小就这么可爱',c:'common'},
  {t:'二倍速跳舞那一段我反复拖进度条',c:'stage'},{t:'她写了这首词……真的有点东西',c:'stage'},
  {t:'今天这波操作真的牛',c:'common'},{t:'今天签售的动图有人有吗 求私',c:'fan'},{t:'音乐银行这周的直拍必看',c:'stage'},
  {t:'感觉这波黑有点过了 没实锤的事到处传',c:'gossip'},{t:'每次看她跳舞都起鸡皮疙瘩',c:'stage'},{t:'今天舞台ending是她设计的吗 太会了',c:'stage'},
  {t:'你可以永远相信她的舞台',c:'stage'},{t:'有没有去签售的姐妹分享一下后记',c:'fan'},
  {t:'刚看完直拍 准备去看第二遍',c:'stage'},{t:'今天就指着这个视频活',c:'variety'},
  {t:'这个团什么时候开演唱会 我一定去',c:'fan'},{t:'有没有粉丝群 想加',c:'fan'},
  {t:'纯好奇 有多少人是男粉',c:'neutral'},{t:'别说了 我已经开始单曲循环了',c:'stage'},{t:'今天下班图 她好像累了 眼神有点疲惫',c:'practice'},
  {t:'这次回归的造型团队真的强',c:'visual'},{t:'这编舞细节太多了 每遍都有新发现',c:'stage'},{t:'请公司做人 给点资源吧',c:'fan'},
  {t:'刚从签售回来 她主动跟我击掌了',c:'fan'},{t:'这次回归后涨粉好快',c:'fan'},{t:'黑子：没表情 粉丝：这叫情绪控制',c:'gossip'},
  {t:'有没有人发现她今天换了新耳麦',c:'stage'},{t:'签名好认真啊 每个都写了小爱心',c:'fan'},{t:'这明明就很真诚啊 哪装了',c:'fan'},{t:'这个直拍我可以看一辈子',c:'stage'},
  {t:'好想知道她用的什么护肤品',c:'visual'},{t:'这舞到底怎么跳的 太快了',c:'stage'},{t:'官咖的手写信有人翻译吗',c:'fan'},
  {t:'想去看现场 有一起的吗',c:'fan'},{t:'感觉她最近是真的开心啊',c:'fan'},{t:'今天打歌舞台的灯光绝了',c:'stage'},
  {t:'有没有人去拼盘演唱会 组队吗',c:'fan'},{t:'听她唱歌真的好治愈',c:'stage'},{t:'这才是真正的全能',c:'stage'},
  {t:'今天上班路上偶遇 本人真的好小一只',c:'visual'},{t:'粉丝别招黑了 让她安静发展吧',c:'fan'},
  {t:'黑子：没表情 粉丝：这不叫没表情这叫情绪控制',c:'gossip'},{t:'什么时候打歌 我想看完整版',c:'stage'},
  {t:'不知道该说什么 反正喜欢就完事了',c:'fan'},{t:'这期综艺真的好看 建议反复观看',c:'variety'},
];


// 判断一条舆论是否与女主相关（含 {name} 或被 fill 替换后的女主名）
function isHeroineRelated(item) {
  var t = typeof item === 'object' ? (item.t || '') : (item || '');
  var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '';
  return hpName && t.indexOf(hpName) >= 0;
}
function suitorName() {
  var E = GS.entSim;
  var n = (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor']) || null;
  if (n && n.name) return n.name;
  // 兜底：从可选成员中取一个不是男主/哥哥的
  var mlId = (E.romance && E.romance.maleLead) ? E.romance.maleLead.id : '';
  var broId = (E.brother && E.brother.id) || (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.id) || '';
  var candidates = [];
  var all = MEMBERS || [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].id !== mlId && all[i].id !== broId) candidates.push(all[i]);
  }
  if (candidates.length) {
    // 随机选取情敌（首次生成后持久化，不会跳变）
    var idx = Math.floor(Math.random() * candidates.length);
    var picked = candidates[idx];
    // 写入 npcNetwork 持久化
    if (E.npcNetwork && E.npcNetwork.nodes) E.npcNetwork.nodes['npc_suitor'] = { name: picked.name, id: picked.id, intimacy: 0, stance: '观望' };
    return picked.name;
  }
  return '团内成员';
}
var DATE_VENUES = [
  { name: '他家', exposure: 3, desc: '高风险，一旦被拍到百口莫辩' },
  { name: '私人影院', exposure: 2, desc: '暗灯角落，旁人不易察觉' },
  { name: '深夜江边', exposure: 1, desc: '开放空间，偶遇风险中等' },
  { name: '天台', exposure: 1, desc: '公司楼顶，不太会有人上来' },
  { name: '车里', exposure: 0, desc: '密闭私密，相对安全' },
  { name: '地下停车场', exposure: 0, desc: '无人注意，最低调的选择' },
  { name: '汉江公园', exposure: 1, desc: '江边散步吹风，低风险日常约会' },
  { name: '南山塔', exposure: 2, desc: '挂锁的经典约会地，人多眼杂' },
  { name: '深夜布帐马车', exposure: 2, desc: '烧酒配辣鸡爪，深夜食堂氛围' },
  { name: '弘大街头', exposure: 3, desc: '混入人群逛街，高风险高回报' },
  { name: '公司天台', exposure: 1, desc: '练习间隙偷偷见面，被看到也可解释' },
  // 章节解锁（跨章时逐步开放）
  { name: '他录音室', exposure: 1, desc: '以工作为名，偶尔有人经过', chapterMin: 2 },
  { name: '深夜咖啡店', exposure: 2, desc: '营业到凌晨，适合深夜约会', chapterMin: 2 },
  { name: '郊区民宿', exposure: 1, desc: '周末远行，远离首尔视线', chapterMin: 3 }
];
var THEATER_TYPES = [
  { type: 'malePOV', label: '男主视角', minAff: 20 },
  { type: 'rivalIF', label: '竞争者IF', minAff: 20 },
  { type: 'school', label: '校园IF', minAff: 35 },
  { type: 'brotherPOV', label: '哥哥视角', minAff: 50 },
  { type: 'wedding', label: '婚后IF', minAff: 70 },
  { type: 'memory', label: '回忆录', minAff: 80 }
];

function currentTab() { return GS._entSimTab || 'story'; }

export function renderEntSimGameScreen() {
  window.__renderEntSim = function() {
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = renderHtml();
    bindEntSimEvents();
    setTimeout(function() {
      // 优先定位到最新的「你的选择」分隔线，找不到再滚到底部
      var seps = document.querySelectorAll('.es-branch-sep');
      var target = seps.length ? seps[seps.length - 1] : document.getElementById('es-narrative-end');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    if (GS._entSimStageUpPending) showStageUpCeremony();
    if (GS._entSimMilestonePending) showMilestoneCard();
    checkAndShowPendingPopups();
  };
  var html = renderHtml();
  return html;
}

function renderHtml() {
  var tab = currentTab();
  var heartPending = GS._entSimHeartbeatPending;
  // 主剧情：首轮未生成时自动生成（用 started 标志，避免每次渲染都重复触发生成）
  var E = GS.entSim;
  if (!E.started && !GS._entSimGenerating && (!GS._entSimCurrent || !GS._entSimCurrent.narrative)) {
    var autoTries0 = GS._entSimAutoTries || 0;
    if (autoTries0 >= 2) {
      // 首轮连续失败：放弃自动重生成，标记 started 交回 bindEntSimEvents 兜底（点击拉回主线重试）
      GS.entSim.started = true;
      GS._entSimCurrent = { narrative: '（剧情生成较慢，请点击「拉回主线」重试）', options: ['拉回主线'], extras: {}, failed: true };
    } else {
      GS._entSimAutoTries = autoTries0 + 1;
      generateEntSimRound('phase').then(rerender).catch(function() {
        GS._entSimGenerating = false;
        rerender();
      });
      return '<div id="entsim-root" class="entsim-mode"><div class="es-loading-wrap">✨ 剧情生成中…</div></div>';
    }
  }
  var cur = getEntSimCurrent();
  var html = '' +
    '<div id="entsim-root" class="entsim-mode">' +
      renderHeader() +
      '<div class="es-grid">' +
        '<div class="es-col es-left">' + renderLeft() + '</div>' +
        '<div class="es-col es-center">' + renderCenter(cur, heartPending) + '</div>' +
        '<div class="es-col es-right">' + renderRight() + '</div>' +
      '</div>' +
    '</div>';
  GS._entSimHeartbeatPending = false; // 心动时刻一次性特效
  return html;
}

// ---------- Header ----------
function renderHeader() {
  var E = GS.entSim;
  var isDebut = E.career && E.career.debutDay > 0;
  // 练习生阶段不显示章节名（无章可归），只显示练习天数
  var chName = (isDebut && E.chapter && E.chapter.name) ? (' ' + (E.chapter.icon || '') + ' ' + E.chapter.name) : '';
  return '' +
    '<div class="es-header">' +
      '<div class="es-h-left">' +
        '<span class="es-cycle-tag">💗 地下恋 · ' + formatGameDate(E.cycle.dayCount || 1) + ' ' + getTimeOfDayLabel() + '</span>' +
        (chName ? '<span class="es-chap-badge">' + chName + '</span>' : '') +
        '<span class="es-chap-badge">' + getRomanceStageIcon() + ' ' + getRomanceStageLabel() + '</span>' +
      '</div>' +
      '<div class="es-h-right">' +
        '<div class="es-pop-wrap" id="es-pop-wrap" title="点击查看人气变动日志">' +
          '<span class="es-pop">人气 <b>' + popularity() + '</b> <i style="font-style:normal;color:#9D8BFF">(' + careerLevel() + ')</i></span>' +
          '<div class="es-pop-bar"><span style="width:' + Math.min(100, popularity()) + '%;background:linear-gradient(90deg,#7c6ff0,#9ad0a0)"></span></div>' +
        '</div>' +
        '<span class="es-aff-mini">好感 ' + E.affection + '/100</span>' +
        '<span class="es-icon-btn" id="es-settings-btn" title="设置">⚙️</span>' +
      '</div>' +
    '</div>';
}

// ---------- Left · 娱乐圈背景 ----------
function renderLeft() {
  var E = GS.entSim;
  var gm = E.groupMeta || {};
  var isDebut = (E.career && E.career.debutDay > 0) || (gm.debutYears > 0);
  var sisters = (E.heroineGroup || []).map(function(s, i) {
    return '<button class="es-sis" data-sis="' + i + '"><span class="es-sis-name">' + escHtml(s.name) + '</span><small>' + escHtml(s.roleTag) + '</small></button>';
  }).join('');
  var heat = (typeof E.misc.scandalHeat === 'number') ? E.misc.scandalHeat : (E.misc.exposureAccum || 0);
  var exp = Math.min(100, heat * 4);
  var tier = getExposureTierLabel(heat);
  var expBarColor = exp >= 80 ? 'var(--es-red)' : exp >= 60 ? 'var(--es-red)' : exp >= 40 ? 'var(--es-yellow)' : exp >= 20 ? 'var(--es-yellow)' : 'var(--es-green)';
  // 团设卡片：仅出道后展示
  var groupCard = '';
  if (gm.groupName && isDebut) {
    var songsArr = Array.isArray(gm.songs) ? gm.songs : [];
    var songsHtml = songsArr.map(function(s) { return '<span class="es-gm-song">' + escHtml(s) + '</span>'; }).join('');
    // 最近活动：从careerHistory筛近30天记录，按类型各取1条
    var recentHtml = buildRecentActivities(E);
    groupCard = '<div class="es-gm-card">' +
      '<div class="es-gm-name">' + escHtml(gm.groupName) + '</div>' +
      '<div class="es-gm-line">🏢 ' + escHtml((gm.company && gm.company.name) || gm.company || '') + '</div>' +
      '<div class="es-gm-line">🎵 ' + escHtml(gm.concept || '') + '</div>' +
      '<div class="es-gm-line">💎 粉丝：' + escHtml(gm.fandom || '') + '  ·  ' + (gm.debutYears ? '出道 ' + gm.debutYears + ' 年' : '刚出道新人团') + '</div>' +
      (songsHtml ? '<div class="es-gm-songs">🔥 出圈曲：' + songsHtml + '</div>' : '') +
      (recentHtml ? '<div class="es-gm-songs" style="margin-top:4px">📋 最近活动：' + recentHtml + '</div>' : '') +
    '</div>';
  }
  var sisHtml = isDebut ? ('<div class="es-col-title" style="margin-top:6px">👯 女团队友</div><div class="es-sis-list">' + (sisters || '<div class="es-empty">—</div>') + '</div>') : '';
  return '' +
    '<div class="es-panel">' +
      groupCard +
      '<div class="es-col-title">🗓️ 今日日程</div>' +
      renderAgenda() +
      sisHtml +
    '</div>';
}
// 从 careerHistory 构建最近活动（近30天，按类型各取一条）
function buildRecentActivities(E) {
  var today = E.cycle.dayCount || 1;
  var hist = E.careerHistory || [];
  var recent = { release: null, variety: null, award: null, magazine: null, brand: null };
  for (var i = hist.length - 1; i >= 0; i--) {
    var h = hist[i];
    if (!h.day || today - h.day > 30) continue;
    var t = h.type || '';
    if ((t === 'release' || t === 'release_done') && !recent.release) recent.release = cleanActivityText(h.text || '');
    if ((t === 'variety' || t === 'variety_done') && !recent.variety) recent.variety = cleanActivityText(h.text || '');
    if ((t === 'award' || t === 'award_done') && !recent.award) recent.award = cleanActivityText(h.text || '');
    if ((t === 'magazine' || t === 'magazine_done') && !recent.magazine) recent.magazine = cleanActivityText(h.text || '');
    if ((t === 'brand' || t === 'brand_done') && !recent.brand) recent.brand = cleanActivityText(h.text || '');
  }
  var tags = [];
  if (recent.release) tags.push('<span class="es-gm-song">📀 ' + escHtml(recent.release) + '</span>');
  if (recent.variety) tags.push('<span class="es-gm-song">🎬 ' + escHtml(recent.variety) + '</span>');
  if (recent.award) tags.push('<span class="es-gm-song">🏆 ' + escHtml(recent.award) + '</span>');
  if (recent.magazine) tags.push('<span class="es-gm-song">📸 ' + escHtml(recent.magazine) + '</span>');
  if (recent.brand) tags.push('<span class="es-gm-song">💼 ' + escHtml(recent.brand) + '</span>');
  return tags.join('');
}
// 去掉"接受xxx："前缀，精简显示
function cleanActivityText(t) {
  return t.replace(/^(接受|综艺录制完成：|画报拍摄完成：|代言拍摄完成：|作品发布完成：|综艺|画报|代言|发布)\s*/g, '').slice(0, 22);
}

// 曝光档位标签：🟢安全 / 🟡暗涌 / 🟠升温 / 🔴哗然 / ⛈️引爆（阈值与 public-opinion.js 对齐）
function getExposureTierLabel(accum) {
  if (accum >= 25) return { label: '⛈️ 引爆', desc: '恋情彻底曝光，事业与粉丝面临双重崩塌' };
  if (accum >= 15) return { label: '🔴 哗然', desc: '热搜与黑粉已集结，危机公关迫在眉睫' };
  if (accum >= 10) return { label: '🟠 升温', desc: '同框与同款被频繁讨论，风险快速累积' };
  if (accum >= 5) return { label: '🟡 暗涌', desc: '站姐与营销号开始注意你们的小动作' };
  return { label: '🟢 安全', desc: '目前尚未形成有效舆论风波' };
}
function renderAgenda() {
  var E = GS.entSim;
  var isDebut = E.career && E.career.debutDay > 0;
  var tod = E.cycle.timeOfDay || 0;
  var slotIcons = ['☀️', '🌤️', '🌙'];
  var slotLabel = getTimeOfDayLabel();
  // 时段指示器：当前在哪个时段
  var header = '<div class="es-agenda-time">' + slotIcons[tod] + ' 当前 · ' + slotLabel + '（第' + (tod + 1) + '/3 档）</div>';
  // 不同时段高亮自己的行程
  var highlightKey = tod === 0 ? 'main' : tod === 1 ? 'related' : '';
  var suitorNameVal = suitorName();
  var mlName = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '他';
  var broName = (E.brother && E.brother.name) || '哥哥';
  var items = [
    { key: 'main', icon: '🎤', text: (E.agenda.main || '主档') + (E.agenda.mainLoc ? '（' + E.agenda.mainLoc + '）' : ''), active: highlightKey === 'main' },
    { key: 'maleLead', icon: '💜', text: mlName + '：' + (E.agenda.maleLead || '行程中') + (E.agenda.maleLeadLoc ? '（' + E.agenda.maleLeadLoc + '）' : ''), active: false, hide: !isDebut },
    { key: 'related', icon: '📺', text: E.agenda.related || '相关', active: highlightKey === 'related' },
    { key: 'rival', icon: '💢', text: suitorNameVal + '：' + (E.agenda.rival || '行程中') + (E.agenda.rivalLoc ? '（' + E.agenda.rivalLoc + '）' : ''), active: false, hide: !isDebut }
  ];
  items = items.filter(function(item) { return !item.hide; });
  if (E.agenda.brother && E.brother && E.brother.name) {
    items.push({ key: 'brother', icon: '👨', text: broName + '：' + (E.agenda.brother || '行程中') + (E.agenda.brotherLoc ? '（' + E.agenda.brotherLoc + '）' : ''), active: false });
  }
  return '<div class="es-agenda">' + header + items.map(function(it) {
    var cls = 'es-ag-tag' + (it.active ? ' es-ag-active' : '');
    return '<div class="' + cls + '"><span class="es-ic">' + it.icon + '</span>' + escHtml(it.text) + '</div>';
  }).join('') + '</div>';
}

// ---------- Center · 剧情 ----------
function renderCenter(cur, heartPending) {
  var E = GS.entSim;
  // 进行中的日程活动
  var ongoingHtml = '';
  if (E._ongoingVariety) {
    ongoingHtml += '<div style="background:linear-gradient(135deg,rgba(255,107,157,.1),rgba(99,102,241,.08));border:1px solid rgba(255,107,157,.15);border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:12px;color:rgba(255,255,255,.7)">🎬 <b>综艺录制中</b> · ' + escHtml(E._ongoingVariety.show) + ' · <span style="color:#52c41a">剩余' + E._ongoingVariety.daysLeft + '天</span></div>';
  }
  if (E._ongoingMagazine) {
    ongoingHtml += '<div style="background:linear-gradient(135deg,rgba(255,167,38,.1),rgba(99,102,241,.08));border:1px solid rgba(255,167,38,.15);border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:12px;color:rgba(255,255,255,.7)">📸 <b>画报拍摄中</b> · ' + escHtml(E._ongoingMagazine.mag) + ' · <span style="color:#52c41a">剩余' + E._ongoingMagazine.daysLeft + '天</span></div>';
  }
  if (!cur) {
    return ongoingHtml + '<div class="es-narrative">⏳ 剧情加载中…</div>' + renderFreeInput() + renderQuickActions();
  }
  var nCls = heartPending ? 'es-narrative es-heartbeat' : 'es-narrative';
  var optionsHtml = (cur.options && cur.options.length) ?
    cur.options.map(function(o, i) {
      var rb = optionRiskBadge(o);
      var barCls = 'c' + (i + 1);
      return '<button class="es-option' + (rb ? ' es-opt-risk' : '') + '" data-idx="' + i + '"' + (rb ? ' data-risk="1"' : '') + '>' +
        '<span class="es-opt-bar ' + barCls + '"></span>' +
        '<span class="es-opt-body">' + escHtml(o) + (rb ? ' <span class="es-risk">' + rb + '</span>' : '') + '</span>' +
        '</button>';
    }).join('') : '<div class="es-empty">（等待剧情推进…）</div>';
  var romanceBtns = renderRomanceButtons();
  var heartTitle = heartPending ? '<div class="es-heartbeat-title">💗 心动时刻</div>' : '';
  var nHtml = cur.narrative ? escHtml(cur.narrative).replace(/\n/g, '<br>') : '';
  nHtml = nHtml.replace(/── (.+?) ──/g, '<div class="es-branch-sep">$1</div>');
  // 时段过渡标记：🌤️/☀️/🌙 上午·继续 / 下午·继续 / 夜晚·继续
  nHtml = nHtml.replace(/([🌤️☀️🌙])\s*(上午|下午|夜晚)·继续/g, '<div class="es-branch-sep es-time-sep">$1 $2·继续</div>');
  var isDebut2 = E.career && E.career.debutDay > 0;
  return '' +
    '<div class="es-panel es-center-panel">' +
      '<div class="es-col-title">📖 剧情 · ' + formatGameDate(E.cycle.dayCount || 1) + ' ' + getTimeOfDayLabel() + '</div>' +
      ongoingHtml +
      heartTitle +
      '<div class="' + nCls + '" id="es-narrative">' + nHtml + '<div id="es-narrative-end"></div></div>' +
      '<div class="es-opts" id="es-options">' + optionsHtml + '</div>' +
      renderFreeInput() +
      romanceBtns +
      renderQuickActions() +
    '</div>'; // 关 es-center-panel
}
// 自由输入框（圆角软底 + 发送按钮，与聊天输入框一致）
function renderFreeInput() {
  return '' +
    '<div class="es-free-area">' +
      '<input class="es-free-input" id="es-free-input" placeholder="自由输入你想做的事…" />' +
      '<button class="es-free-send" id="es-free-send">发送</button>' +
    '</div>';
}
// 快捷指令（移到剧情框下方，靠近剧情内容）
function renderQuickActions() {
  var E = GS.entSim;
  var today = E.cycle._gameDayCount || 1;
  // 待处理邀约（popup关闭后暂存的），有就亮 没就灰
  var pendingOffers = (typeof GS !== 'undefined' && GS._entSimPendingOffers) || {};
  var brandLabel = pendingOffers['brand'] ? '💼待定·代言' : '💼暂无邀约';
  var varietyLabel = pendingOffers['variety'] ? '🎬待定·综艺' : '🎬暂无邀约';
  var magazineLabel = pendingOffers['magazine'] ? '📸待定·画报' : '📸暂无邀约';
  var releaseCD = E._releaseCD || 0;
  function cdLabel(base, cd) { return cd > 0 ? base + ' (冷却' + cd + '天)' : base; }
  function cdDisabled(cd) { return cd > 0 ? ' disabled' : ''; }
  var isDebut = E.career && E.career.debutDay > 0;
  function notDebutDisabled() { return isDebut ? '' : ' disabled'; }
  var row1 = [
    { q: 'brands', label: brandLabel, disabled: (!isDebut || !pendingOffers['brand']) ? ' disabled' : '' },
    { q: 'variety', label: varietyLabel, disabled: (!isDebut || !pendingOffers['variety']) ? ' disabled' : '' },
    { q: 'magazine', label: magazineLabel, disabled: (!isDebut || !pendingOffers['magazine']) ? ' disabled' : '' },
    { q: 'release', label: cdLabel('📀发布', releaseCD), disabled: cdDisabled(releaseCD) + notDebutDisabled() }
  ].map(function(b) {
    return '<button class="es-quick-btn' + (b.disabled ? ' es-quick-disabled' : '') + '" data-q="' + b.q + '"' + b.disabled + '>' + b.label + '</button>';
  }).join('');
  var isTrainee = !isDebut;
  var row2 = [
    { q: 'regenerate', label: '重新生成' },
    { q: 'nextagenda', label: '下一个行程' + (GS.entSim.cycle.timeOfDay >= 2 ? ' → 换天' : '') },
    { q: 'cover', label: '🛡️掩护(' + (getCoverRemaining()) + ')' },
    { q: 'event', label: '随机事件' },
    { q: 'visit', label: '探班' },
    { q: 'nextday', label: '下一天' }
  ];
  if (isTrainee) row2.push({ q: 'fastforward', label: '🎀速通出道' });
  var row2Html = row2.map(function(b) {
    return '<button class="es-quick-btn" data-q="' + b.q + '">' + b.label + '</button>';
  }).join('');
  return '<div class="es-quick es-quick-center"><div>' + row1 + '</div><div style="margin-top:6px">' + row2Html + '</div></div>';
}
function renderRomanceButtons() {
  var E = GS.entSim;
  var btns = '';
  if (E.affection >= 30) btns += '<button class="es-rom-btn" data-act="date">💞 约会（好感' + E.affection + '）</button>';
  var cf = tryConfession();
  if (cf.canConfess) btns += '<button class="es-rom-btn es-confess" data-act="confess">💍 告白</button>';
  if (E.affection >= 100 && (E.cycle.roundTotal - (E.flags.sweetMaxRound || 0)) >= 10) {
    btns += '<button class="es-rom-btn es-ending" data-act="ending">🌟 进入大结局</button>';
  }
  return btns ? '<div class="es-rom-btns">' + btns + '</div>' : '';
}
function isIntimateOption(text) {
  return /牵手|亲(吻|他|密)|抱|吻|约(会|见|他)|拥抱|亲密|表白|告白|同床|摸|贴|靠|十指|手牵|心动|暧昧|私会|想他/.test(text);
}
function optionRiskBadge(text) {
  if (!isIntimateOption(text)) return '';
  var score = assessRomanceRisk(0).score;
  if (score >= 60) return '<span class="es-risk-high">风险:高·粉丝-10</span>';
  if (score >= 40) return '<span class="es-risk-mid">风险:中·粉丝-5</span>';
  if (score >= 20) return '<span class="es-risk-low">风险:低·粉丝-2</span>';
  return '<span class="es-risk-safe">风险:安全</span>';
}

// ---------- Right · 圈内态势 ----------
function renderRight() {
  var E = GS.entSim;
  var buzz = getDailyBuzz();
  var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '';
  var hot = (buzz.hotSearch || []).map(function(h, i) {
    var fire = i < 3 ? ['🔥🔥🔥', '🔥🔥', '🔥'][i] : '';
    var ht = buzzTitle(h);
    var me = (hpName && ht.indexOf(hpName) >= 0) ? ' me' : '';
    return '<div class="es-hot-item es-buzz-click' + me + '" data-buzz="hot" data-idx="' + i + '"><span class="es-hot-rank">' + (i + 1) + '</span>' + escHtml(ht) + '<span class="es-hot-fire">' + fire + '</span></div>';
  }).join('');
  var fan = (buzz.fanDiscussion || []).map(function(f, i) {
    var ft = buzzTitle(f);
    var cat = classifyFan(ft);
    return '<div class="es-fan-bubble es-buzz-click ' + cat + '" data-buzz="fan" data-idx="' + i + '"><b>' + fanLabel(cat) + '</b>｜' + escHtml(ft) + '</div>';
  }).join('');
  var media = (buzz.mediaTitle || []).map(function(h, i) {
    var mt = buzzTitle(h);
    return '<div class="es-hot-item es-buzz-click" data-buzz="media" data-idx="' + i + '"><span class="es-hot-rank">📰</span>' + escHtml(mt) + '</div>';
  }).join('');
  var lovePanel = renderLovePanel();
  return '' +
    '<div class="es-panel">' +
      '<div class="es-col-title">📊 今日圈内</div>' +
      '<div class="es-hot">' + (hot || '<div class="es-empty">暂无热搜</div>') + '</div>' +
      '<div class="es-col-title" style="margin-top:4px">📰 媒体热议</div>' +
      '<div class="es-hot">' + (media || '<div class="es-empty">暂无媒体热议</div>') + '</div>' +
      '<div class="es-col-title" style="margin-top:4px">💬 粉丝讨论</div>' +
      '<div class="es-fan">' + (fan || '<div class="es-empty">暂无讨论</div>') + '</div>' +
      lovePanel +
      // 约定：从状态中读取待履行约会
      renderAptPanel() +
      // P1 #3: 粉丝数（人气联动涨跌粉）
      '<div class="es-row" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--es-card-border)"><span>👥 粉丝数</span><span><b>' + formatSubCount(E) + '</b>' + subDeltaText(E) + '</span></div>' +
      // P1 #9: 合约剩余年数
      '<div class="es-row"><span>📜 经纪约</span><span>' + contractLabel(E) + '</span></div>' +
      '<button class="es-rom-btn es-business-btn" id="es-business-btn" style="margin-top:8px;width:100%">📱 手机' + (E.bubble && E.bubble.todayCount > 0 ? ' · 泡泡' + E.bubble.todayCount + '/5' : '') + '</button>' +
      '<button class="es-rom-btn" id="es-theater-rom-btn" style="margin-top:6px;width:100%">🎭 剧场</button>' +
      '<button class="es-rom-btn" id="es-ending-btn" style="margin-top:6px;width:100%">🌟 结局</button>' +
      // P1 #22: 存档按钮
      '<button class="es-rom-btn" id="es-save-btn" style="margin-top:6px;width:100%;background:rgba(124,111,240,.08);border-color:var(--es-primary2)">💾 存档管理</button>' +
    '</div>';
}
// 亲密图标行（7阶段）
function intimacyIcons() {
  var E = GS.entSim;
  var un = E._intimacyUnlocked || { hand: false, hug: false, kiss: false, bed: false, live: false, public: false, marry: false };
  var h = '🤝';
  var u = '🤗';
  var k = '💋';
  var b = '🛏️';
  var l = '🏠';
  var p = '📣';
  var m = '💍';
  return '<span style="font-size:12px;opacity:' + (un.hand ? '0.9' : '0.3') + '">' + h + '</span>' +
         '<span style="font-size:12px;opacity:' + (un.hug ? '0.9' : '0.3') + '">' + u + '</span>' +
         '<span style="font-size:12px;opacity:' + (un.kiss ? '0.9' : '0.3') + '">' + k + '</span>' +
         '<span style="font-size:12px;opacity:' + (un.bed ? '0.9' : '0.3') + '">' + b + '</span>' +
         '<span style="font-size:12px;opacity:' + (un.live ? '0.9' : '0.3') + '">' + l + '</span>' +
         '<span style="font-size:12px;opacity:' + (un.public ? '0.9' : '0.3') + '">' + p + '</span>' +
         '<span style="font-size:12px;opacity:' + (un.marry ? '0.9' : '0.3') + '">' + m + '</span>';
}

// 约定面板：显示待履行约会，支持确认履行/编辑/删除
function renderAptPanel() {
  var E = GS.entSim;
  var apts = E._aptCards || [];
  var html = '<div class="es-col-title" style="margin-top:4px">📅 约定（' + apts.length + '）</div>';
  if (!apts.length) {
    html += '<div style="color:var(--text-muted);font-size:12px;padding:6px 8px;line-height:1.5">暂无约定。与角色互动中对方可能会主动提出约定。</div>';
    return html;
  }
  for (var ai = 0; ai < apts.length; ai++) {
    var a = apts[ai];
    html += '<div class="es-apt-item" data-apt-idx="' + ai + '">' +
      '<div style="flex:1;min-width:0"><b>' + escHtml(a.summary || a.place || '赴约') + '</b>' +
      '<small style="color:var(--text-muted);display:block">' + escHtml(a.place || '') + ' · ' + escHtml(a.timeHint || '') + '</small></div>' +
      '<button class="es-apt-btn" onclick="window.__aptFulfill(' + ai + ')">✓</button>' +
      '<button class="es-apt-btn" onclick="window.__aptEdit(' + ai + ')" style="margin-left:2px">✏️</button>' +
      '<button class="es-apt-btn" onclick="window.__aptDelete(' + ai + ')" style="margin-left:2px">🗑️</button>' +
      '</div>';
  }
  return html;
}
// 约定操作：确认履行
window.__aptFulfill = function(idx) {
  var E = GS.entSim;
  var apts = E._aptCards || [];
  if (!apts[idx]) return;
  var apt = apts[idx];
  showEntSimModal('✅ 确定履行约定？',
    '<p style="text-align:center;padding:8px 0">「' + escHtml(apt.summary || apt.place || '赴约') + '」<br><small style="color:var(--text-muted)">' + escHtml(apt.place || '') + ' · ' + escHtml(apt.timeHint || '') + '</small></p>',
    [
      { id: 'cancel', label: '取消' },
      { id: 'confirm', label: '确认履行', primary: true }
    ]).then(function(r) {
      if (r !== 'confirm') return;
      apts.splice(idx, 1);
      E._aptCards = apts;
      saveGame();
      showNarrativeLoading();
      triggerEntSimEvent('赴约·' + (apt.place || '未知地点') + '：' + (apt.summary || ''),
        { scene: apt.place, extraNote: '你按照约定来到了「' + (apt.place || '') + '」。请生成约300字的赴约剧情。' }
      ).then(rerender);
    });
};
// 约定编辑
window.__aptEdit = function(idx) {
  var E = GS.entSim;
  var apts = E._aptCards || [];
  if (!apts[idx]) return;
  var apt = apts[idx];
  var html = '<div style="display:flex;flex-direction:column;gap:8px">' +
    '<label>摘要<input id="es-apt-edit-summary" value="' + escHtml(apt.summary || '') + '" style="width:100%;background:var(--es-card-bg);border:1px solid var(--es-card-border);border-radius:6px;padding:6px 10px;color:var(--es-text)"></label>' +
    '<label>地点<input id="es-apt-edit-place" value="' + escHtml(apt.place || '') + '" style="width:100%;background:var(--es-card-bg);border:1px solid var(--es-card-border);border-radius:6px;padding:6px 10px;color:var(--es-text)"></label>' +
    '<label>时间提示<input id="es-apt-edit-time" value="' + escHtml(apt.timeHint || '') + '" style="width:100%;background:var(--es-card-bg);border:1px solid var(--es-card-border);border-radius:6px;padding:6px 10px;color:var(--es-text)"></label>' +
    '</div>';
  showEntSimModal('✏️ 编辑约定', html, [
    { id: 'cancel', label: '取消' },
    { id: 'save', label: '保存', primary: true }
  ]).then(function(r) {
    if (r !== 'save') return;
    var summaryEl = document.getElementById('es-apt-edit-summary');
    var placeEl = document.getElementById('es-apt-edit-place');
    var timeEl = document.getElementById('es-apt-edit-time');
    if (summaryEl) apt.summary = summaryEl.value.trim();
    if (placeEl) apt.place = placeEl.value.trim();
    if (timeEl) apt.timeHint = timeEl.value.trim();
    E._aptCards = apts;
    saveGame();
    rerender();
    showToast('约定已更新');
  });
};
// 约定删除
window.__aptDelete = function(idx) {
  var E = GS.entSim;
  var apts = E._aptCards || [];
  if (!apts[idx]) return;
  showEntSimModal('🗑️ 删除约定？',
    '<p style="text-align:center;padding:8px 0">确定删除「' + escHtml(apts[idx].summary || apts[idx].place || '赴约') + '」吗？</p>',
    [
      { id: 'cancel', label: '取消' },
      { id: 'confirm', label: '确认删除', primary: true }
    ]).then(function(r) {
      if (r !== 'confirm') return;
      apts.splice(idx, 1);
      E._aptCards = apts;
      saveGame();
      rerender();
      showToast('约定已删除');
    });
};

// P1 #3: 粉丝数格式化（人气联动涨跌粉）
function formatSubCount(E) {
  var pop = E.career.popularity || 0;
  var base = E.bubble && E.bubble.subscribers ? E.bubble.subscribers : 500;
  var subs = base + Math.floor((pop - 25) * 80);
  if (subs < 100) subs = 100;
  if (subs >= 1000000) return (subs / 1000000).toFixed(1) + 'M';
  if (subs >= 10000) return (subs / 10000).toFixed(1) + '万';
  if (subs >= 1000) return (subs / 1000).toFixed(1) + 'k';
  return String(subs);
}
function subDeltaText(E) {
  var pop = E.career.popularity || 0;
  var lastPop = E._lastPopSnapshot || pop;
  if (pop > lastPop) return ' <span style="color:var(--es-green);font-size:10px">↑</span>';
  if (pop < lastPop) return ' <span style="color:var(--es-red);font-size:10px">↓</span>';
  return '';
}

// P1 #9: 合约标签
function contractLabel(E) {
  var remaining = E.career.contractRemaining || 7;
  if (remaining <= 0) return '<b style="color:var(--es-yellow)">即将到期</b>';
  if (remaining === 1) return '<b style="color:var(--es-yellow)">⚠ 还剩1年</b>';
  return '<b>' + remaining + '年</b> / ' + (E.career.contractYears || 7) + '年';
}

// 右栏恋情面板：阶段 / 好感 / 曝光 / 已用掩护 / 哥哥支持度
function renderLovePanel() {
  var E = GS.entSim;
  var stage = getRomanceStageLabel();
  var exp = (typeof E.misc.scandalHeat === 'number') ? E.misc.scandalHeat : (E.misc.exposureAccum || 0);
  var tier = getExposureTierLabel(exp);
  var cover = E.romance.coverUsed || 0;
  var html = '<div style="margin-top:4px;padding:8px;background:rgba(255,255,255,.04);border-radius:8px">' +
    '<div class="es-col-title" style="margin:0 0 4px 0">💗 恋情面板</div>' +
    '<div class="es-risk-row"><span>阶段</span><span>' + getRomanceStageIcon() + ' ' + stage + '</span></div>' +
    '<div class="es-risk-row es-aff-clickable"><span>好感</span><span><b>' + E.affection + '</b>/100</span></div>' +
    '<div class="es-intimacy-row"><span>亲密</span><span>' + intimacyIcons() + '</span></div>' +
    '<div class="es-risk-row"><span>曝光</span><span>' + tier.label + ' (' + exp + ')</span></div>' +
    '<div class="es-risk-row"><span>掩护</span><span>' + cover + '/5</span></div>';
  // v2：吃醋标记
  var jLvl = E._jealousLevel || 0;
  if (jLvl >= 2) {
    var jLabel = getJealousLabel(jLvl);
    html += '<div class="es-risk-row" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.06);padding-top:4px"><span>🍋吃醋</span><span>' + jLabel.label + '</span></div>';
  }
  if (E.brother && E.brother.name) {
    html += '<div class="es-risk-row es-brother-clickable"><span>哥哥支持度</span><span>' + (E.brother.support || 0) + ' · ' + escHtml(E.brother.stance || '参谋') + '</span></div>';
  }
  // P1 #11: 查看纪念日按钮
  var milestones = E._romanceMilestones || {};
  var msCount = Object.keys(milestones).length;
  if (msCount > 0) {
    html += '<button class="es-rom-btn" id="es-milestone-btn" style="margin-top:6px;width:100%;color:var(--es-yellow)">💫 查看纪念日 · ' + msCount + '个回忆</button>';
  }
  html += '</div>';
  return html;
}

// 点击好感度数字 → 弹出完整来源日志
function showAffectionLogModal() {
  var E = GS.entSim;
  var affLog = E._affectionLog || [];
  if (!affLog.length) { showToast('还没有好感度变动记录～'); return; }
  var listHtml = '';
  var allLogs = affLog.slice().reverse(); // 最新在前
  for (var i = 0; i < allLogs.length; i++) {
    var l = allLogs[i];
    var dSign = l.delta > 0 ? '+' : '';
    var dColor = l.delta > 0 ? '#9ad0a0' : '#f88a8a';
    listHtml += '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px">' +
      '<span style="min-width:32px;font-weight:700;color:' + dColor + '">' + dSign + l.delta + '</span>' +
      '<span style="flex:1;color:rgba(255,255,255,.7)">' + escHtml(l.reason || '剧情推进') + '</span>' +
      '<span style="color:rgba(255,255,255,.3);font-size:11px">→ ' + l.total + '</span>' +
      '<span style="color:rgba(255,255,255,.2);font-size:10px">第' + (l.day || '?') + '天</span>' +
      '</div>';
  }
  var html = '<div style="max-height:55vh;overflow-y:auto">' +
    '<div style="font-size:12px;color:rgba(255,200,220,.5);margin-bottom:8px">' + escHtml(GS.heroineProfile && GS.heroineProfile.name || '女主') + ' → 好感度共 ' + (E.affection || 0) + ' ／ ' + affLog.length + ' 条记录</div>' +
    listHtml +
    '</div>';
  showEntSimModal('💗 好感度来源', html, [{ id: 'close', label: '关闭' }]);
}

// 点击哥哥支持度 → 弹出支持度变动日志
function showBrotherSupportModal() {
  var E = GS.entSim;
  var log = (E.brother && E.brother.supportLog) || [];
  if (!log.length) { showToast('还没有哥哥支持度变动记录～'); return; }
  var listHtml = '';
  var allLogs = log.slice().reverse();
  for (var i = 0; i < allLogs.length; i++) {
    var l = allLogs[i];
    var dSign = l.delta > 0 ? '+' : '';
    var dColor = l.delta > 0 ? '#9ad0a0' : '#f88a8a';
    listHtml += '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px">' +
      '<span style="min-width:32px;font-weight:700;color:' + dColor + '">' + dSign + l.delta + '</span>' +
      '<span style="flex:1;color:rgba(255,255,255,.7)">' + escHtml(l.reason || '未知原因') + '</span>' +
      '<span style="color:rgba(255,255,255,.3);font-size:11px">→ ' + l.total + '</span>' +
      '<span style="color:rgba(255,255,255,.2);font-size:10px">第' + (l.day || '?') + '天</span>' +
      '</div>';
  }
  var html = '<div style="max-height:55vh;overflow-y:auto">' +
    '<div style="font-size:12px;color:rgba(255,200,220,.5);margin-bottom:8px">👨 哥哥当前态度：' + escHtml(E.brother.stance || '参谋') + ' · 支持度 ' + (E.brother.support || 0) + '</div>' +
    listHtml +
    '</div>';
  showEntSimModal('👨 哥哥支持度日志', html, [{ id: 'close', label: '关闭' }]);
}

function classifyFan(text) {
  if (/绝|美|神颜|圈粉|独美|封神|绝了|心动|配得上|嗑/.test(text)) return 'topfan';
  if (/翻车|无语|黑|崩|买热搜|糊|假|油腻|脱粉/.test(text)) return 'hater';
  return 'passerby';
}
function fanLabel(c) { return c === 'topfan' ? '大粉' : c === 'hater' ? '黑粉' : '路人'; }
function stanceClass(s) {
  if (s === '回踩' || s === '撤资' || s === '黑' || s === '反对公开' || s === '放料') return 'bad';
  if (s === '护你' || s === '捧' || s === '提携' || s === '想续约' || s === '退出祝福' || s === '认可掩护' || s === '已买断') return 'good';
  return 'mid';
}

// ---------- 日记 / 信箱 渲染（供手机模拟器调用）----------
function renderDiaryInner() {
  var E = GS.entSim;
  var entries = E._diaryEntries || [];
  if (!entries.length && DIARY_TEMPLATES && DIARY_TEMPLATES.length) {
    // 首次打开日记：从模板池生成一条初始日记
    var tpl = DIARY_TEMPLATES[Math.floor(Math.random() * DIARY_TEMPLATES.length)];
    E._diaryEntries = [{
      day: (E.cycle && E.cycle._gameDayCount) || (E.cycle && E.cycle.dayCount) || 1,
      text: tpl ? fillDiaryBlanks(tpl.framework) : '今天是成为偶像的第1天。',
      timestamp: Date.now()
    }];
    entries = E._diaryEntries;
  }
  if (!entries.length) return '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:#555">📔 日记为空</div>';
  var html = '<div style="padding:8px">';
  for (var i = entries.length - 1; i >= 0; i--) {
    var e = entries[i];
    html += '<div style="margin-bottom:10px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px">' +
      '<div style="font-size:11px;color:#666;margin-bottom:4px">📅 第' + e.day + '天</div>' +
      '<div style="font-size:13px;color:#ccc;line-height:1.6">' + escHtml(e.text || '') + '</div></div>';
  }
  html += '</div>';
  return html;
}
function renderLettersInner() {
  return '<div class="es-panel es-extra-panel"><div class="es-h3">📬 信箱</div><p class="es-dim">信箱功能开发中</p></div>';
}
// 手机版渲染函数
function renderLettersInnerFS() {
  var hist = GS._entSimLetterHistory || [];
  if (!hist.length) return '<div style="color:#666;text-align:center;padding:50px 0;font-size:13px">📬 信箱为空<br><small style="color:#555">粉丝的来信会出现在这里</small></div>';
  var h = '';
  for (var l = hist.length - 1; l >= 0; l--) {
    var item = hist[l];
    var txt = (item.data && item.data.t) ? item.data.t : (typeof item.data === 'string' ? item.data : '');
    h += '<div style="margin-bottom:10px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px">' +
      '<div style="font-size:11px;color:#666;margin-bottom:4px">✉️ 第' + (item.day||'?') + '天 · 来自粉丝</div>' +
      '<div style="font-size:12px;color:#ccc;line-height:1.5">' + escHtml(txt) + '</div></div>';
  }
  return h;
}

function renderAwardsInnerFS() {
  var hist = GS._entSimAwardHistory || [];
  if (!hist.length) return '<div style="color:#666;text-align:center;padding:50px 0;font-size:13px">🏆 暂无奖项<br><small style="color:#555">每4天可能触发季度颁奖</small></div>';
  var h = '';
  for (var i = hist.length - 1; i >= 0; i--) {
    var item = hist[i];
    var d = item.data;
    h += '<div style="margin-bottom:10px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px">' +
      '<div style="font-size:11px;color:#666;margin-bottom:4px">🏆 第' + (item.day||'?') + '天</div>' +
      '<div style="font-size:13px;color:#f0c040;font-weight:600;margin-bottom:2px">' + escHtml(d.t || '') + '</div>' +
      '<div style="font-size:11px;color:#888">人气+' + (d.pop || 0) + '</div></div>';
  }
  return h;
}

function fillDiaryBlanks(framework) {
  var E = GS.entSim;
  var fillWords = ["练习室","舞台上","录音室","待机室","公司","宿舍"];
  if (E && E.dailyBuzz && E.dailyBuzz.hotSearch && E.dailyBuzz.hotSearch.length) {
    var t = E.dailyBuzz.hotSearch[0].t || "";
    fillWords = fillWords.concat([t,"今天","她","我们","粉丝"]);
  }
  var idx = 0;
  return (framework || "").replace(/__/g, function() {
    return fillWords[(idx++) % fillWords.length];
  });
}
function renderDiaryInnerFS() {
  var E2 = GS.entSim;
  var entries = E2._diaryEntries || [];
  if (!entries.length && DIARY_TEMPLATES && DIARY_TEMPLATES.length) {
    var tpl = DIARY_TEMPLATES[Math.floor(Math.random() * DIARY_TEMPLATES.length)];
    E2._diaryEntries = [{ day: E2.cycle ? (E2.cycle._gameDayCount || E2.cycle.dayCount) : 1, text: tpl ? fillDiaryBlanks(tpl.framework) : '今天是成为偶像的第1天。', timestamp: Date.now() }];
    entries = E2._diaryEntries;
  }
  if (!entries.length) return '<div style="color:#666;text-align:center;padding:50px 0;font-size:13px">📔 日记为空<br><small style="color:#555">每日事件会自动生成日记</small></div>';
  var h = '';
  for (var i = entries.length - 1; i >= 0; i--) {
    var e = entries[i];
    h += '<div style="margin-bottom:10px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px"><div style="font-size:11px;color:#666;margin-bottom:4px">📅 第' + e.day + '天</div><div style="font-size:13px;color:#ccc;line-height:1.6">' + escHtml(e.text || '') + '</div></div>';
  }
  return h;
}
function renderMomentsInnerFS() {
  var E2 = GS.entSim;
  var moments = E2.moments || [];
  if (!moments.length) return '<div style="color:#666;text-align:center;padding:50px 0;font-size:13px">📱 还没有朋友圈<br><small style="color:#555">精彩瞬间会出现在这里</small></div>';
  var h = '';
  for (var i = moments.length - 1; i >= 0; i--) {
    var m = moments[i];
    h += '<div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px"><div style="font-size:11px;color:#666;margin-bottom:4px">📅 第' + (m.day || '?') + '天</div><div style="font-size:12px;color:#ccc;line-height:1.5">' + escHtml(m.text || m.content || '') + '</div></div>';
  }
  return h;
}
export function bindEntSimEvents() {
  bindCommonNav();
  bindStoryEvents();
  bindRomanceBtns();
  bindBuzzClicks();
}

function bindTheaterBtn() {
  var tb = document.getElementById('es-theater-rom-btn');
  if (tb) tb.addEventListener('click', function() { showEntSimTheaterModal(); });
}
function bindRomanceBtns() {
  bindTheaterBtn();
  // 结局按钮（移到剧场下方）
  var eb = document.getElementById('es-ending-btn');
  if (eb) eb.addEventListener('click', function() { onEnding(); });
  // 好感度行点击
  document.querySelectorAll('.es-aff-clickable').forEach(function(el) {
    el.addEventListener('click', function() { showAffectionLogModal(); });
  });
  // 哥哥支持度行点击
  document.querySelectorAll('.es-brother-clickable').forEach(function(el) {
    el.addEventListener('click', function() { showBrotherSupportModal(); });
  });
}

function bindCommonNav() {
  document.querySelectorAll('[data-back="1"]').forEach(function(el) {
    el.addEventListener('click', function() { switchEntSimTab('story'); });
  });
}

function bindStoryEvents() {
  var optWrap = document.getElementById('es-options');
  if (optWrap) {
    optWrap.querySelectorAll('.es-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
        var idx = parseInt(btn.dataset.idx, 10);
        var text = getEntSimCurrent().options[idx] || btn.textContent;
        var cur = getEntSimCurrent();
        if (cur.type === 'confess') { onConfessChoice(idx); return; }
        onOptionPreview(idx, text, btn);
      });
    });
  }
  var fi = document.getElementById('es-free-input');
  if (fi) fi.addEventListener('keydown', function(e) { if (e.key === 'Enter') onFreeSend(); });
  bindId('es-free-send', onFreeSend);
  bindId('es-settings-btn', function() { showApiSettingsModal(); });
  bindId('es-pop-wrap', onPopLog);
  bindId('es-memory-btn', onPopLog);
  bindId('es-save-btn', showSaveSlotsModal);    // P1 #22
  bindId('es-milestone-btn', showMilestoneModal); // P1 #11
  document.querySelectorAll('.es-ag-btn[data-agenda]').forEach(function(b) {
    b.addEventListener('click', function() { onAgendaClick(b.dataset.agenda); });
  });
  document.querySelectorAll('.es-ag-btn[data-apt]').forEach(function(b) {
    b.addEventListener('click', function() { onAppointmentClick(parseInt(b.dataset.apt, 10)); });
  });
  document.querySelectorAll('.es-sis[data-sis]').forEach(function(b) {
    b.addEventListener('click', function() { confirmTeammateInteract(parseInt(b.dataset.sis, 10)); });
  });
  bindId('es-business-btn', showBusinessPanel);
  document.querySelectorAll('.es-rom-btn[data-act]').forEach(function(b) {
    b.addEventListener('click', function() { onRomanceAct(b.dataset.act); });
  });
  // 掩护按钮（class 是 es-quick-sm 嵌在快捷指令行，走 onRomanceAct）
  document.querySelectorAll('.es-quick-sm[data-act]').forEach(function(b) {
    b.addEventListener('click', function(e) { e.stopPropagation(); onRomanceAct(b.dataset.act); });
  });
  document.querySelectorAll('.es-quick-btn[data-q]').forEach(function(b) {
    b.addEventListener('click', function() { onQuick(b.dataset.q); });
  });
}

function bindChatEvents() {
  var sendBtn = document.getElementById('es-chat-send');
  var input = document.getElementById('es-chat-input');
  if (sendBtn) sendBtn.addEventListener('click', onChatSend);
  if (input) input.addEventListener('keydown', function(e) { if (e.key === 'Enter') onChatSend(); });
}
function bindMomentsEvents() {
  var gen = document.getElementById('es-gen-moment');
  if (gen) gen.addEventListener('click', function() {
    if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
    generateEntSimMoment().then(rerender);
  });
}
function bindTheaterEvents() {
  document.querySelectorAll('.es-theater-type[data-theater]').forEach(function(b) {
    b.addEventListener('click', function() {
      if (b.disabled) return;
      if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
      var label = b.dataset.label;
      generateEntSimTheater(label).then(function(txt) {
        var box = document.getElementById('es-theater-content');
        if (box) box.innerHTML = '<div class="es-theater-story">' + (txt ? escHtml(txt).replace(/\n/g, '<br>') : '（生成失败，请重试）') + '</div>';
      });
    });
  });
}
function bindId(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }

function switchEntSimTab(tab) {
  GS._entSimTab = tab;
  saveGame();
  rerender();
}
// 在正文底部追加加载提示（保留原有剧情不变）
function showNarrativeLoading() {
  var nEl = document.getElementById('es-narrative');
  if (!nEl) return;
  var existing = nEl.querySelector('.es-loading-inline');
  if (existing) existing.remove();
  nEl.insertAdjacentHTML('beforeend', '<div class="es-loading-inline">✨ 正在加载剧情…</div>');
  // 滚到最新内容处
  setTimeout(function() {
    var endEl = document.getElementById('es-narrative-end');
    if (endEl) endEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 10);
}
function rerender() {
  if (window.__renderEntSim) { window.__renderEntSim(); return; }
  var app = document.getElementById('app');
  if (app) { app.innerHTML = renderHtml(); bindEntSimEvents(); }
}

// ---------- 剧情 Tab 事件 ----------
function onFreeSend() {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var fi = document.getElementById('es-free-input');
  if (!fi) return;
  var t = fi.value.trim();
  if (!t) return;
  fi.value = '';
  showNarrativeLoading();
  handleEntSimFreeInput(t).then(rerender);
}
function onAgendaClick(kind) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  console.log('[agenda-click] kind:', kind);
  if (kind === 'teammate') { console.log('[agenda-click] teammate branch hit'); showTeammateSelectPanel(); return; }
  var E = GS.entSim;
  var text = (E.agenda && E.agenda[kind]) || kind;
  var loc = (E.agenda && E.agenda[kind + 'Loc']) || '';
  var scene = '今日行程[' + kind + ']：' + text + (loc ? '（地点：' + loc + '）' : '');
  var extraNote = '请重点围绕「' + text + '」这个行程展开剧情，并把场景切换到该行程所在地（' + (loc || '贴合该行程的合理地点') + '），角色互动要贴合此场景氛围。';
  if (E.agenda) { E.agenda.doneFlags = E.agenda.doneFlags || {}; E.agenda.doneFlags[kind] = true; saveGame(); }
  triggerEntSimEvent('今日行程·' + kind + '：' + text, { extraNote: extraNote, scene: scene }).then(rerender);
}
// 赴约：点击约定卡片生成赴约剧情
function onAppointmentClick(idx) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var E = GS.entSim;
  var apts = E.appointments || [];
  if (idx < 0 || idx >= apts.length) return;
  var apt = apts[idx];
  if (apt.done) return;
  showNarrativeLoading();
  apt.done = true; saveGame();
  triggerEntSimEvent('赴约·' + apt.place + '：' + apt.summary, {
    scene: apt.place,
    extraNote: '你按照约定来到了「' + apt.place + '」。请生成约300字的赴约剧情，描写你和男主在这里的相处。要贴合' + (apt.timeHint || '') + '的氛围，注重两人独处时的小细节与情感流动。在选项中要保留"这个约定让你心动"的意味。'
  }).then(rerender);
}
// 工作冷却检查（代言3天/综艺5天/画报3天，CD已在showReleasePanel内检查）
function checkWorkCooldown(type) {
  var E = GS.entSim;
  var today = E.cycle._gameDayCount || 1;
  if (type === 'brands') {
    if (E._lastBrandOfferDay && today - E._lastBrandOfferDay < 3) {
      showToast('💼 代言冷却中（还需 ' + (3 - (today - E._lastBrandOfferDay)) + ' 天）'); return true;
    }
    E._lastBrandOfferDay = today; saveGame();
  } else if (type === 'variety') {
    if (E._lastVarietyDay && today - E._lastVarietyDay < 3) {
      showToast('🎬 综艺冷却中（还需 ' + (3 - (today - E._lastVarietyDay)) + ' 天）'); return true;
    }
    E._lastVarietyDay = today; saveGame();
  } else if (type === 'magazine') {
    if (E._lastMagazineDay && today - E._lastMagazineDay < 3) {
      showToast('📸 画报冷却中（还需 ' + (3 - (today - E._lastMagazineDay)) + ' 天）'); return true;
    }
    E._lastMagazineDay = today; saveGame();
  }
  return false;
}

// 速通出道：直接跳到出道触发
function fastForwardTrainee() {
  var E = GS.entSim;
  // 直接设到后期最后一天，让出道立刻触发
  E.cycle.practiceDayCount = Math.max(E.cycle.practiceDayCount || 1, 6);
  E.career.traineePhase = 3;
  E.career._traineeDayCount = Math.max(E.career._traineeDayCount || 1, 5);
  E.career._debutTriggerDay = 2;
  E.cycle.timeOfDay = 0;
  saveGame();
  return goEntSimNextDay(true).then(function() {
    showToast('🎀 已跳至出道日！');
  });
}

// 快捷指令
function onQuick(q) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var E = GS.entSim;

  // visit 先弹选择框不立即生成，ending/nextday 有自己的 loading 入口
  if (q === 'visit') { showEntSimVisitChoice(); return; }

  if (q === 'bubble') { showBusinessPanel(); return; }
  if (q === 'release' || q === 'brands' || q === 'variety' || q === 'magazine') {
    var isD = E.career && E.career.debutDay > 0;
    if (!isD) { showToast('出道后才解锁此功能'); return; }
  }
  if (q === 'release') { showReleasePanel(); return; }
  if (q === 'brands') { if (checkWorkCooldown('brands')) return; showBrandHistory(); return; }
  if (q === 'variety') { if (checkWorkCooldown('variety')) return; showVarietyPopup(); return; }
  if (q === 'magazine') { if (checkWorkCooldown('magazine')) return; showMagazinePopup(); return; }
  // 重新生成/下一个行程/下一天 加确认防误触
  var confirmActions = { regenerate: '重新生成', nextagenda: '下一个行程', nextday: '进入下一天' };
  if (confirmActions[q]) {
    showEntSimModal('⚠️ 确认操作',
      '<p style="text-align:center;padding:8px 0">确定要 <b>' + confirmActions[q] + '</b> 吗？<br><small style="color:var(--text-muted)">当前未选择的选项将被跳过</small></p>',
      [
        { id: 'cancel', label: '取消' },
        { id: 'confirm', label: '确定', primary: true }
      ]).then(function(r) {
        if (r !== 'confirm') return;
        showNarrativeLoading();
        if (q === 'nextagenda') continueEntSimMain().then(rerender);
        else if (q === 'regenerate') handleEntSimRegenerate().then(rerender);
        else if (q === 'nextday') goEntSimNextDay().then(rerender);
      });
    return;
  }

  if (q === 'cover') { showCoverPanel(); return; }

  if (q === 'fastforward') {
    showConfirmModal('确定要速通出道吗？练习生阶段将直接跳到最后一天。', '速通出道')
      .then(function(ok) {
        if (!ok) return;
        showNarrativeLoading();
        fastForwardTrainee().then(rerender);
      });
    return;
  }

  showNarrativeLoading();
  if (q === 'event') { triggerEntSimEvent('随机事件：今天发生了一件意料之外的小事').then(rerender); }
}

// 探班 3 选 1：从日程构建选项，返回 Promise 链
function showEntSimVisitChoice() {
  var E = GS.entSim;
  var choices = [];
  if (E.romance && E.romance.maleLead && E.romance.maleLead.name) {
    var mlKey = E.agenda.maleLead || '行程中';
    var mlLoc = E.agenda.maleLeadLoc || '';
    choices.push({ roleKey: 'maleLead', label: '💜 男主', name: E.romance.maleLead.name, task: mlKey, place: mlLoc || '未知', type: '单人·较私密', note: '' });
  }
  if (E.brother && E.brother.name) {
    var brKey = E.agenda.brother || '练习';
    var brLoc = E.agenda.brotherLoc || '';
    choices.push({ roleKey: 'brother', label: '👨 哥哥', name: E.brother.name, task: brKey, place: brLoc || '未知', type: '团队·公开场合', note: '' });
  }
  if (E.romance && E.romance.rival && E.romance.rival.name) {
    var rvKey = E.agenda.rival || '活动中';
    var rvLoc = E.agenda.rivalLoc || '';
    var sName = suitorName();
    choices.push({ roleKey: 'rival', label: '💢 ' + sName, name: sName, task: rvKey, place: rvLoc || '未知', type: '单人·较私密', note: '⚠️ 风险极高' });
  }
  if (!choices.length) { showToast('没有可探班的成员'); return; }
  showVisitChoiceModal(choices).then(function(roleKey) {
    if (!roleKey) return;
    var sel = null;
    for (var i = 0; i < choices.length; i++) { if (choices[i].roleKey === roleKey) { sel = choices[i]; break; } }
    if (!sel) return;
    var riskNote = roleKey === 'rival' ? '⚠️ 探班' + suitorName() + '风险极高，可能引发媒体注意' : roleKey === 'maleLead' ? '⭐ 探班男主有风险，小心被拍' : '安全等级较高';
    showActionInfoModal('探班 · ' + sel.name,
      '📍 今日行程：' + sel.task + '（' + sel.place + '）\n\n' + riskNote + '\n\n确定要去探班吗？',
      '确定', '取消'
    ).then(function(ok) {
      if (!ok) return;
      closeEntSimModal();
      showNarrativeLoading();
      triggerEntSimEvent('探班：你借口工作去看' + sel.name + '（他今天在' + sel.task + '），两人在工作间隙偷偷见面').then(rerender);
    });
  });
}

// 恋爱动作
function onRomanceAct(act) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  if (act === 'date') {
    var chap = (GS.entSim && GS.entSim.chapter && GS.entSim.chapter.index) || 1;
    var available = DATE_VENUES.filter(function(v) { return !v.chapterMin || v.chapterMin <= chap; });
    if (!available.length) available = DATE_VENUES;
    var venue = available[Math.floor(Math.random() * available.length)];
    showCoverPanel(function() { initiateEntSimDate(venue).then(rerender); });
  } else if (act === 'confess') {
    generateEntSimConfession().then(rerender);
  } else if (act === 'ending') {
    onEnding();
  } else if (act === 'cover') {
    showCoverPanel();
  }
}
// 掩护面板：选择一种掩护手段，应用后反馈
function showCoverPanel(onDone) {
  var E = GS.entSim;
  if (!canUseCover()) { showToast('掩护手段已用尽（粉丝已高度警觉），当前无法再掩护'); if (onDone) onDone(); return; }
  var mechs = getCoverMechanisms();
  var remaining = 5 - (E.romance.coverUsed || 0);
  var items = Object.keys(mechs).map(function(k) {
    var m = mechs[k];
    var disabled = remaining <= 0 ? ' disabled' : '';
    return '<div class="es-cover-item' + disabled + '" data-cover="' + k + '">' +
      '<span class="es-cover-icon">' + m.icon + '</span>' +
      '<span class="es-cover-label">' + escHtml(m.label) + '</span>' +
      '<span class="es-cover-cost">' + escHtml(m.cost) + '</span>' +
      '</div>';
  }).join('');
  var skipBtn = onDone ? '<button class="es-cover-skip" data-cover-skip="1">跳过，直接继续</button>' : '';
  var html = '<div style="padding:8px"><div class="es-risk-title">选择掩护手段（剩余 ' + remaining + '/5）</div><div class="es-cover-grid">' + items + '</div>' + skipBtn + '</div>';
  showEntSimModal('🛡️ 地下恋掩护', html, [{ id: 'close', label: '关闭' }]);
  // 绑定选择
  setTimeout(function() {
    document.querySelectorAll('.es-cover-item:not(.disabled)').forEach(function(el) {
      el.addEventListener('click', function() {
        var type = el.getAttribute('data-cover');
        var res = applyCover(type);
        if (res.ok) {
          if (type === 'business') generateFanReaction('营业掩护', '公司安排你和团内另一位成员做营业CP来转移视线，结果粉丝在评论区吵成一片，有人嗑有人骂有人扒细节').catch(function(){});
          closeEntSimModal();
          showToast('已使用 ' + mechs[type].label + '，剩余 ' + res.remaining + '/5');
          if (onDone) {
            onDone();
          } else {
            // 单独使用掩护：生成一段掩护剧情叙事
            showNarrativeLoading();
            var coverScene = '掩护·' + type + '：刚刚使用「' + mechs[type].label + '」来降低地下恋曝光风险';
            triggerEntSimEvent(coverScene, {
              extraNote: '请生成约200-300字的叙事段落，具体描写你如何用「' + mechs[type].label + '」手段来掩护与男主的恋情、实施过程和效果。要符合娱乐圈地下恋的现实逻辑（假装不熟就是公共场合对视后迅速移开/借哥哥打掩护就是让哥哥发三人合照/避嫌约会就是故意和团友一起去以混淆视线/营业掩护就是和队友做CP转移注意力/公司掩护就是经纪人帮忙公关），不要选项。'
            }).then(rerender);
          }
        } else {
          showToast(res.reason || '无法使用');
        }
      });
    });
    if (onDone) {
      var skip = document.querySelector('[data-cover-skip]');
      if (skip) skip.addEventListener('click', function() { closeEntSimModal(); if (onDone) onDone(); });
      var closeBtn = document.querySelector('.es-modal-overlay .es-modal-btns [data-res="close"]');
      if (closeBtn) closeBtn.addEventListener('click', function() { if (onDone) onDone(); });
    }
  }, 0);
}
// 原 onConfessChoice 保留在下面
function onConfessChoice(idx) {
  var map = ['accepted', 'rejected', 'delayed'];
  var result = map[idx] || 'delayed';
  applyConfessionResult(result);
  // 告白后续剧情（伤心/甜蜜）
  continueEntSimMain().then(rerender);
}
function onEnding() {
  var ending = enterEntSimEnding();
  if (!ending) { showToast('暂未到结局，继续培养感情吧～'); return; }
  showEntSimModal('🌟 结局 · ' + (ending.type || '未知'),
    '<div class="es-loading">正在生成结局叙事…</div>',
    [{ id: 'close', label: '关闭' }]);
  runEntSimEnding().then(function(end) {
    closeEntSimModal();
    if (!end) { showEndingCard(ending, ending.text || ''); return; }
    showEndingCard(end, GS._entSimEndingNarrative || '');
  }).catch(function() {
    closeEntSimModal();
    showEndingCard(ending, ending.text || '');
  });
}

// 选项点击后先预览「会发生什么」，再确认推进
function predictOptionConsequence(text) {
  var riskScore = assessRomanceRisk(0).score;
  var tags = [];
  if (isIntimateOption(text)) tags.push('💞 亲密互动：男主好感 +，但曝光风险升高');
  if (/哥哥|哥|知勋/.test(text)) tags.push('👨 涉及哥哥：可能影响哥哥支持度 / 被他管着');
  if (/rival|竞争者/.test(text)) tags.push('💢 涉及团内竞争者：可能推进竞争弧线');
  if (/曝光|被拍|同框|公开|CP|同款|实锤/.test(text)) { tags.push('📸 曝光风险：可能推高曝光值'); riskScore = Math.max(riskScore, 55); }
  if (/回避|拒绝|推开|装不熟|假装|躲/.test(text)) tags.push('🛡️ 回避：降低曝光，但好感可能小幅下降');
  if (/粉丝|营业|直拍|红毯|签售|舞台|综艺|bubble|官咖/.test(text)) tags.push('🎤 事业相关：影响人气 / 曝光');
  if (/秘密|EXO|同人|应援/.test(text)) tags.push('🤫 涉及你的秘密：可能被撞破成为素材');
  if (/聊天|短信|发消息|回他|约他|联系/.test(text)) tags.push('💬 与男主联络：推进感情');
  if (!tags.length) tags.push('➡️ 推进当前剧情（具体影响由剧情决定）');
  return { tags: tags, riskScore: riskScore };
}
function onOptionPreview(idx, text, btn) {
  var pred = predictOptionConsequence(text);
  var riskBlock = '';
  if (pred.riskScore > 0) {
    var pop = pred.riskScore >= 60 ? 12 : pred.riskScore >= 40 ? 7 : 3;
    riskBlock = '<div class="es-risk-row"><span>预估曝光风险</span><b>' + pred.riskScore + '/100</b></div>' +
      '<div class="es-risk-row"><span>若被拍到粉丝流失</span><b>-' + pop + ' 人气</b></div>';
  }
  var tagsHtml = pred.tags.map(function(t) { return '<div class="es-conseq-tag">' + escHtml(t) + '</div>'; }).join('');
  var body = '<div class="es-preview-modal">' +
    '<div class="es-preview-choice">你选择：<b>' + escHtml(text) + '</b></div>' +
    '<div class="es-preview-title">预计会发生：</div>' +
    '<div class="es-conseq-list">' + tagsHtml + '</div>' +
    riskBlock +
    '<div class="es-preview-note">（以上为基于选项内容的预测，实际剧情由 AI 生成）</div>' +
    '</div>';
  showEntSimModal('❥ 选择预览', body, []);
  // 动态注入按钮（确认推进 / 先选掩护 / 再想想）
  setTimeout(function() {
    var ov = document.querySelector('.es-modal-overlay');
    if (!ov) return;
    var btnsWrap = ov.querySelector('.es-modal-btns');
    if (!btnsWrap) return;
    btnsWrap.innerHTML =
      (pred.riskScore >= 40 ? '<button class="es-risk-cover" data-act="cover">🛡️ 先选掩护</button>' : '') +
      '<button class="es-risk-go" data-act="go">确认推进</button>' +
      '<button class="es-risk-cancel" data-act="cancel">再想想</button>';
    btnsWrap.querySelectorAll('[data-act]').forEach(function(b) {
      b.addEventListener('click', function() {
        var act = b.dataset.act;
        closeEntSimModal();
        if (act === 'go') {
          showNarrativeLoading(); btn.disabled = true; handleEntSimChoice(idx, text).then(rerender);
        } else if (act === 'cover') {
          showCoverPanel(function() { showNarrativeLoading(); btn.disabled = true; handleEntSimChoice(idx, text).then(rerender); });
        }
      });
    });
  }, 0);
}

// ---------- 聊天 ----------
function onChatSend() {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  var input = document.getElementById('es-chat-input');
  if (!input) return;
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  if (!GS.entSim.chatHistory) GS.entSim.chatHistory = [];
  GS.entSim.chatHistory.push({ role: 'user', content: msg });
  saveGame();
  var msgs = document.getElementById('es-chat-msgs');
  var aff = GS.entSim.affection || 0;
  // 正在输入延迟：低好感 3-5 秒，高好感 0.5-1 秒，模拟真人回复速度
  var delay = aff >= 40 ? randInt(500, 1000) : randInt(3000, 5000);
  if (msgs) {
    msgs.innerHTML += '<div class="es-chat-msg user">' + escHtml(msg) + '</div>';
    msgs.innerHTML += '<div class="es-chat-typing" id="es-typing">正在输入…</div>';
    msgs.scrollTop = msgs.scrollHeight;
  }
  setTimeout(function() {
    generateEntSimChat(msg).then(function() { rerender(); });
  }, delay);
}

// ---------- 人气走势与变动日志 ----------
function onMemoryLog() { return onPopLog(); }
var _popLogTypeMeta = {
  popularity: { label: '人气', cls: 'pop' }, exposure: { label: '曝光', cls: 'exp' },
  romance: { label: '恋爱', cls: 'rom' }, cover: { label: '掩护', cls: 'cov' },
  npc: { label: '关系', cls: 'npc' }, brother: { label: '哥哥', cls: 'bro' },
  event: { label: '事件', cls: 'evt' }
};
function onPopLog() {
  var E = GS.entSim;
  var chartHtml = '<div style="margin-bottom:12px"><canvas id="es-pop-chart" width="400" height="120" style="width:100%;max-width:400px;height:120px;border-radius:8px;background:rgba(20,15,40,.6)"></canvas></div>';
  var statHtml = '<div class="es-pop-log">当前人气：<b>' + popularity() + '</b>（' + careerLevel() + '）· 恋情风险：<b>' + ((E.misc && (typeof E.misc.scandalHeat === 'number' ? E.misc.scandalHeat : E.misc.exposureAccum)) || 0) + '</b>· 事业热度：<b>' + getCareerPublicity() + '</b></div>';
  var logs = (E.careerHistory || []).slice().reverse();
  var logHtml = logs.length ? logs.map(function(h) {
    var meta = _popLogTypeMeta[h.type] || { label: h.type, cls: 'etc' };
    return '<div class="es-pop-log-item"><small>Day' + (h.day != null ? h.day : h.round) + '</small>' +
      '<span class="es-pop-tag ' + meta.cls + '">' + meta.label + '</span>' + escHtml(h.text) + '</div>';
  }).join('') : '<div class="es-empty">暂无变动记录</div>';
  showEntSimModal('📈 人气走势与变动日志',
    chartHtml + statHtml + '<div class="es-pop-log" style="margin-top:8px">' + logHtml + '</div>',
    [{ id: 'close', label: '关闭' }]);
  setTimeout(function() { drawPopChart(E); }, 100);
}

// Canvas 人气走势折线图（最近7天）
function drawPopChart(E) {
  try {
    var canvas = document.getElementById('es-pop-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var pad = { top: 12, right: 16, bottom: 18, left: 32 };
    var data = [];
    // 从 careerHistory 提取每天的人气值（按 day 分组取最新）
    var dayPop = {};
    for (var i = 0; i < (E.careerHistory || []).length; i++) {
      var item = E.careerHistory[i];
      if (item.type === 'popularity' && typeof item.day === 'number') {
        dayPop[item.day] = E.career.popularity; // 近似：用当前人气代表
      }
    }
    // 补最近7天
    var curDay = E.cycle._gameDayCount || 1;
    for (var d = Math.max(1, curDay - 6); d <= curDay; d++) {
      data.push({ day: d, pop: (dayPop[d] != null) ? dayPop[d] : null });
    }
    if (data.length < 2) return;
    // 背景网格
    ctx.fillStyle = 'rgba(20,15,40,.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (var y = pad.top; y <= h - pad.bottom; y += (h - pad.top - pad.bottom) / 4) {
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    }
    // 绘制折线
    var validData = data.filter(function(d) { return d.pop != null; });
    if (validData.length < 2) return;
    var xStep = (w - pad.left - pad.right) / Math.max(1, data.length - 1);
    var yMin = 0, yMax = 100;
    ctx.strokeStyle = '#9d8bff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var j = 0; j < validData.length; j++) {
      var x = pad.left + (validData[j].day - data[0].day) * xStep;
      var yVal = pad.top + (1 - (validData[j].pop - yMin) / (yMax - yMin)) * (h - pad.top - pad.bottom);
      if (j === 0) ctx.moveTo(x, yVal);
      else ctx.lineTo(x, yVal);
    }
    ctx.stroke();
    // 数据点
    ctx.fillStyle = '#d8cdf0';
    for (var k = 0; k < validData.length; k++) {
      var px = pad.left + (validData[k].day - data[0].day) * xStep;
      var py = pad.top + (1 - (validData[k].pop - yMin) / (yMax - yMin)) * (h - pad.top - pad.bottom);
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
    // X 轴标签
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    for (var l = 0; l < data.length; l++) {
      ctx.fillText('D' + data[l].day, pad.left + l * xStep, h - 4);
    }
  } catch(e) { /* 静默失败 */ }
}

// ---------- 📱 手机框弹窗：聊天 ----------
function showEntSimTheaterModal() {
  var E = GS.entSim;
  var aff = E.affection || 0;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';

  var items = THEATER_TYPES.map(function(t) {
    var locked = aff < t.minAff;
    return '<div class="es-modal-btn es-theater-type' + (locked ? ' es-theater-locked' : '') + '" data-theater="' + t.type + '" data-label="' + t.label + '"' + (locked ? ' disabled' : '') + ' style="cursor:' + (locked ? 'default' : 'pointer') + ';opacity:' + (locked ? '.4' : '1') + '">' +
      (locked ? '🔒 ' : '🎬 ') + t.label + (locked ? '（需好感≥' + t.minAff + '）' : '') + '</div>';
  }).join('');

  var historyList = (E.theaterHistory || []).map(function(h) {
    return '<div class="es-theater-hist" style="padding:6px 0;border-bottom:1px solid var(--es-card-border);cursor:pointer" data-tid="' + h.id + '">📖 ' + escHtml(h.title || h.type || '番外') + '</div>';
  }).join('');

  overlay.innerHTML = '<div class="modal-content es-phone-shell" style="width:92%;max-width:420px;padding:0;overflow:hidden;border-radius:16px">' +
    '<button class="modal-close-x" id="esTheaterClose">✕</button>' +
    '<div class="oneheart-chat-modal">' +
    '<div class="oneheart-chat-header"><span>🎬</span><span class="oneheart-chat-name">剧场番外</span></div>' +
    '<div style="padding:10px;overflow-y:auto;max-height:55vh" id="esTheaterContent">' +
    '<div style="margin-bottom:8px;font-size:12px;color:var(--text-muted)">选择番外类型</div>' +
    '<div id="esTheaterList" style="display:flex;flex-direction:column;gap:6px">' + items + '</div>' +
    (historyList ? '<div style="margin-top:12px;font-size:12px;color:var(--text-muted)">已解锁</div><div id="esTheaterHist">' + historyList + '</div>' : '') +
    '</div></div></div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); } });
  document.getElementById('esTheaterClose').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });

  overlay.querySelectorAll('.es-theater-type:not(.es-theater-locked)').forEach(function(el) {
    el.addEventListener('click', function() {
      var type = el.dataset.theater;
      var label = el.dataset.label;
      el.textContent = '⏳ 生成中…';
      el.disabled = true;
      generateEntSimTheater(type).then(function(result) {
        overlay.remove();
        showTheaterResultModal(label, result);
      }).catch(function() { overlay.remove(); });
    });
  });
  overlay.querySelectorAll('.es-theater-hist').forEach(function(el) {
    el.addEventListener('click', function() {
      var tid = el.dataset.tid;
      var hist = (E.theaterHistory || []).find(function(h) { return String(h.id) === String(tid); });
      if (hist) showTheaterResultModal(hist.title || '番外', hist.content || '');
    });
  });
}

// 剧场结果展示弹窗
function showTheaterResultModal(title, content) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
  overlay.innerHTML = '<div class="modal-content es-phone-shell" style="width:92%;max-width:420px;padding:20px;border-radius:16px;max-height:80vh;overflow-y:auto">' +
    '<button class="modal-close-x" id="esTheaterResClose">✕</button>' +
    '<h3 style="text-align:center;margin-bottom:12px">🎬 ' + escHtml(title) + '</div>' +
    '<div style="font-size:14px;line-height:1.9;white-space:pre-wrap">' + escHtml(content || '(暂无内容)') + '</div>' +
    (GS.entSim.affection >= 70 && !title.match(/回忆录/) ? '<div style="margin-top:12px;text-align:center"><button class="es-btn es-wide" id="esTheaterBack" style="font-size:12px">← 返回剧场</button></div>' : '') +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); } });
  document.getElementById('esTheaterResClose').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });
  var backBtn = document.getElementById('esTheaterBack');
  if (backBtn) backBtn.addEventListener('click', function() { overlay.remove(); showEntSimTheaterModal(); });
}

// ---------- 📱 手机框弹窗：日记 ----------
function showEntSimDiaryModal() {
  var E = GS.entSim;
  var diary = E.diary || [];
  var ml = (E.romance && E.romance.maleLead) || { name: '他' };

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';

  // 日记（女主 + 男主混排，按时间倒序）
  var diaryHis = E.diaryHis || [];
  var allDiary = (diary || []).map(function(d) { return Object.assign({}, d, { author: 'me' }); })
    .concat((diaryHis || []).map(function(d) { return Object.assign({}, d, { author: 'him' }); }));
  allDiary.sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
  var myHtml = '';
  for (var i = 0; i < allDiary.length; i++) {
    var d = allDiary[i];
    var ts = d.ts ? new Date(d.ts) : null;
    var dateStr = ts ? ((ts.getMonth() + 1) + '月' + ts.getDate() + '日') : ('Day ' + (d.day || '?'));
    var isHis = d.author === 'him';
    myHtml += '<div class="es-diary-card' + (isHis ? ' es-diary-his' : '') + '">' +
      '<div class="es-diary-date">' + (isHis ? '💜 ' + escHtml(ml.name) : '📅') + ' ' + escHtml(dateStr) + '</div>' +
      '<div class="es-diary-body">' + escHtml(d.content || d.summary || '') + '</div>' +
      '</div>';
  }
  if (!myHtml) myHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有日记 📝<br>每 3 轮剧情后自动记录</div>';

  // 记忆碎片（男主视角 POV）
  var hisHtml = '';
  var theater = E.theaterHistory || [];
  for (var j = theater.length - 1; j >= 0; j--) {
    var h = theater[j];
    if (h.type !== 'malePOV') continue;
    hisHtml += '<div class="es-diary-card es-diary-his">' +
      '<div class="es-diary-date">💜 ' + escHtml(ml.name) + ' · 好感 ' + (h.unlockAff || '?') + '</div>' +
      '<div class="es-diary-body">' + escHtml(h.content || '') + '</div>' +
      '</div>';
  }
  if (!hisHtml) hisHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有记忆碎片 💌<br>好感度达到 40/60/80 时解锁<br>他会写下不曾当面说的话…</div>';

  overlay.innerHTML = '<div class="modal-content es-phone-shell" style="width:92%;max-width:420px;padding:0;overflow:hidden;border-radius:16px;display:flex;flex-direction:column;height:80vh">' +
    '<button class="modal-close-x" id="esDiaryClose">✕</button>' +
    '<h3 style="text-align:center;margin:12px 0 8px">📝 日记 & 碎片</div>' +
    '<div style="display:flex;gap:4px;margin:0 12px 8px;border-bottom:1.5px solid var(--border-primary,#333)">' +
    '<button class="es-diary-tab active" id="esDiaryMine" style="flex:1;padding:8px;border:none;background:rgba(124,111,240,.15);border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:var(--accent-primary,#7c6ff0);font-weight:600">📖 日记</button>' +
    '<button class="es-diary-tab" id="esDiaryHis" style="flex:1;padding:8px;border:none;background:transparent;border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:var(--text-muted,#8b6b6b)">💌 记忆碎片</button>' +
    '</div>' +
    '<div id="esDiaryContent" style="flex:1;overflow-y:auto;min-height:0;padding:0 12px">' + myHtml + '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); } });
  document.getElementById('esDiaryClose').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });

  document.getElementById('esDiaryMine').addEventListener('click', function() {
    document.getElementById('esDiaryContent').innerHTML = myHtml;
    document.getElementById('esDiaryMine').style.background = 'rgba(124,111,240,.15)'; document.getElementById('esDiaryMine').style.color = 'var(--accent-primary,#7c6ff0)'; document.getElementById('esDiaryMine').style.fontWeight = '600';
    document.getElementById('esDiaryHis').style.background = 'transparent'; document.getElementById('esDiaryHis').style.color = 'var(--text-muted,#8b6b6b)'; document.getElementById('esDiaryHis').style.fontWeight = 'normal';
  });
  document.getElementById('esDiaryHis').addEventListener('click', function() {
    document.getElementById('esDiaryContent').innerHTML = hisHtml;
    document.getElementById('esDiaryHis').style.background = 'rgba(124,111,240,.15)'; document.getElementById('esDiaryHis').style.color = 'var(--accent-primary,#7c6ff0)'; document.getElementById('esDiaryHis').style.fontWeight = '600';
    document.getElementById('esDiaryMine').style.background = 'transparent'; document.getElementById('esDiaryMine').style.color = 'var(--text-muted,#8b6b6b)'; document.getElementById('esDiaryMine').style.fontWeight = 'normal';
  });
}

// ---------- 通用 modal ----------
var _modalEl = null;
export function showEntSimModal(title, bodyHtml, buttons) {
  return new Promise(function(resolve) {
    closeEntSimModal();
    var overlay = document.createElement('div');
    overlay.className = 'es-modal-overlay es-modal-dark';
    var btns = (buttons && buttons.length) ? buttons.map(function(b) {
      return '<button class="es-modal-btn ' + (b.primary ? 'primary' : '') + '" data-res="' + b.id + '">' + escHtml(b.label) + '</button>';
    }).join('') : '';
    overlay.innerHTML = '<div class="es-modal"><div class="es-modal-title">' + escHtml(title) + '</div><div class="es-modal-body">' + bodyHtml + '</div><div class="es-modal-btns">' + btns + '</div></div>';
    document.body.appendChild(overlay);
    _modalEl = overlay;
    if (btns) {
      overlay.querySelectorAll('[data-res]').forEach(function(b) {
        b.addEventListener('click', function() { var r = b.dataset.res; closeEntSimModal(); resolve(r); });
      });
    }
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { closeEntSimModal(); resolve('dismiss'); } });
  });
}
function closeEntSimModal() { if (_modalEl && _modalEl.parentNode) { _modalEl.parentNode.removeChild(_modalEl); _modalEl = null; }
}

// ===================== 手机模拟器（📱营业） =====================
function showBusinessPanel() {
  // 移除旧的手机浮层（如果存在）
  var old = document.getElementById('es-phone-overlay');
  if (old) { old.remove(); return; }

  var E = GS.entSim;
  var bubble = E.bubble || {};

  var overlay = document.createElement('div');
  overlay.id = 'es-phone-overlay';
  overlay.className = 'es-phone-overlay';
  var phoneHTML =
    '<div class="es-phone-frame">' +
      '<div class="es-phone-notch"><span class="es-phone-time">9:41</span><span class="es-phone-icons">📶 🔋</span></div>' +
      // 主屏
      '<div class="es-phone-page active" id="es-phone-page-home">' +
        '<div class="es-phone-screen es-phone-home">' +
          '<div style="padding:100px 20px 0;text-align:center">' +
            '<div style="font-size:13px;color:rgba(255,255,255,.4);letter-spacing:1px">' + new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'}).replace(/星期/,'周') + '</div>' +
            '<div style="font-size:62px;font-weight:200;color:rgba(255,255,255,.8);margin:2px 0 16px;letter-spacing:-2px">9:41</div>' +
            '<div style="width:200px;margin:0 auto 30px;background:rgba(255,255,255,.08);border-radius:10px;padding:10px 16px;display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:18px;color:rgba(255,255,255,.3)">🔍</span>' +
              '<span style="font-size:14px;color:rgba(255,255,255,.25)">搜索</span>' +
            '</div>' +
          '</div>' +
          '<div class="es-apps-grid" style="grid-template-columns:repeat(3,1fr)">' +
            '<div class="es-app-icon" onclick="window.__phoneOpenApp(\'kakao\')"><div class="icon" style="background:linear-gradient(135deg,#FEE500,#F9C800)">💬</div><div class="label">KakaoTalk</div></div>' +
            '<div class="es-app-icon" onclick="window.__phoneOpenApp(\'bubble\')"><div class="icon" style="background:linear-gradient(135deg,#FF6B9D,#C44569)">💜</div><div class="label">泡泡</div></div>' +
            '<div class="es-app-icon" onclick="window.__phoneOpenApp(\'feedback\')"><div class="icon" style="background:linear-gradient(135deg,#6C5CE7,#4834D4)">🌐</div><div class="label">星圈</div></div>' +
            '<div class="es-app-icon" onclick="window.__phoneOpenApp(\'moments\')"><div class="icon" style="background:linear-gradient(135deg,#2ECC71,#27AE60)">📱</div><div class="label">朋友圈</div></div>' +
            '<div class="es-app-icon" onclick="window.__phoneOpenApp(\'diary\')"><div class="icon" style="background:linear-gradient(135deg,#E67E22,#D35400)">📔</div><div class="label">日记</div></div>' +
            '<div class="es-app-icon" onclick="window.__phoneOpenApp(\'letters\')"><div class="icon" style="background:linear-gradient(135deg,#3498DB,#2980B9)">📬</div><div class="label">信箱</div></div>' +
            '<div class="es-app-icon" onclick="window.__phoneOpenApp(\'awards\')"><div class="icon" style="background:linear-gradient(135deg,#F39C12,#E67E22)">🏆</div><div class="label">奖项</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="es-phone-homebar"><div></div></div>' +
      '</div>' +
      // Kakao 联系人页
      '<div class="es-phone-page" id="es-phone-page-kakao">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()">← 返回</div>' +
        '<div class="es-phone-title">💬 KakaoTalk</div>' +
        '<div style="padding:0 16px 8px"><input style="width:100%;background:rgba(255,255,255,.06);border:none;border-radius:10px;padding:8px 14px;color:#fff;font-size:13px;outline:none" placeholder="🔍 搜索联系人"></div>' +
        '<div class="es-phone-screen es-phone-contacts" id="es-phone-kakao-list"></div>' +
      '</div>' +
      // 聊天页
      '<div class="es-phone-page" id="es-phone-page-chat">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()" style="padding-bottom:6px">← 联系人</div>' +
        '<div class="es-phone-chat-header" id="es-phone-chat-header"></div>' +
        '<div class="es-phone-chat-msgs" id="es-phone-chat-msgs"></div>' +
        '<div class="es-phone-quick-replies" id="es-phone-quick-replies" style="display:flex;flex-direction:column;gap:4px;padding:6px 10px;border-top:1px solid #1e2a3a"></div>' +
        '<div class="es-phone-input-row"><input class="es-phone-input" id="es-phone-chat-input" placeholder="输入回复..."><button class="es-phone-send" onclick="window.__phoneSend()">↑</button></div>' +
      '</div>' +
      // 泡泡页
      '<div class="es-phone-page" id="es-phone-page-bubble">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()">← 返回</div>' +
        '<div class="es-phone-title">💜 泡泡</div>' +
        '<div class="es-phone-screen" style="padding:0;flex:1;display:flex;flex-direction:column" id="es-phone-bubble-content"></div>' +
      '</div>' +
      // 星圈页
      '<div class="es-phone-page" id="es-phone-page-feedback">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()">← 返回</div>' +
        '<div class="es-phone-title">🌐 星圈</div>' +
        '<div class="es-phone-screen" style="padding:12px 16px" id="es-phone-feedback-content"></div>' +
        '<div class="es-phone-homebar"><div></div></div>' +
      '</div>' +
      // 朋友圈页
      '<div class="es-phone-page" id="es-phone-page-moments">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()">← 返回</div>' +
        '<div class="es-phone-title">📱 朋友圈</div>' +
        '<div class="es-phone-screen" style="padding:12px 16px" id="es-phone-moments-content"></div>' +
      '</div>' +
      // 日记页
      '<div class="es-phone-page" id="es-phone-page-diary">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()">← 返回</div>' +
        '<div class="es-phone-title">📔 日记</div>' +
        '<div class="es-phone-screen" style="padding:8px 16px" id="es-phone-diary-content"></div>' +
      '</div>' +
      // 信箱页
      '<div class="es-phone-page" id="es-phone-page-letters">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()">← 返回</div>' +
        '<div class="es-phone-title">📬 信箱</div>' +
        '<div class="es-phone-screen" style="padding:12px 16px" id="es-phone-letters-content"></div>' +
      '</div>' +
      // 奖项页
      '<div class="es-phone-page" id="es-phone-page-awards">' +
        '<div class="es-phone-back" onclick="window.__phoneBack()">← 返回</div>' +
        '<div class="es-phone-title">🏆 奖项</div>' +
        '<div class="es-phone-screen" style="padding:12px 16px" id="es-phone-awards-content"></div>' +
      '</div>' +
    '</div>';
  overlay.innerHTML = phoneHTML;
  document.body.appendChild(overlay);

  // 联系人列表
  var contacts = [
    { id:'maleLead', name: (E.maleLead && E.maleLead.name) || '男主', avatar: '💙', bg: '#3b82f6' },
    { id:'brother', name: (E.brother && E.brother.name) || '哥哥', avatar: '👨', bg: '#22c55e' },
    { id:'rival', name: suitorName() || '情敌', avatar: '⚠️', bg: '#f59e0b' },
    { id:'manager', name: '经纪人', avatar: '📋', bg: '#8b5cf6' },
    { id:'group', name: '团群', avatar: '👥', bg: '#ec4899' },
    { id:'sasaeng', name: 'Unknown', avatar: '👁️', bg: '#ef4444' }
  ];
  // 成员池查找：联系人与真实 SEVENTEEN 成员匹配时注入特质
  var memberPools = {
    'S.Coups': MEMBER_SCOUPS, 'Jeonghan': MEMBER_JEONGHAN, 'Joshua': MEMBER_JOSHUA, 'Jun': MEMBER_JUN,
    'Hoshi': MEMBER_HOSHI, 'Wonwoo': MEMBER_WONWOO, 'Woozi': MEMBER_WOOZI, 'DK': MEMBER_DK,
    'Mingyu': MEMBER_MINGYU, 'The8': MEMBER_THE8, 'Seungkwan': MEMBER_SEUNGKWAN, 'Vernon': MEMBER_VERNON, 'Dino': MEMBER_DINO
  };
  function findMemberPool(name) {
    if (!name) return null;
    for (var key in memberPools) { if (name.indexOf(key) >= 0) return memberPools[key]; }
    return null;
  }
  var listHtml = '';
  contacts.forEach(function(c) {
    var preview = '';
    var time = '';
    var hist = (GS._entSimChatHistory || {})[c.id] || [];
    if (hist.length) {
      var last = hist[hist.length - 1];
      preview = (last.content || last.msg || '').slice(0, 25);
      time = '刚刚';
    }
    listHtml += '<div class="es-phone-contact" data-chat-id="' + escHtml(c.id) + '" data-chat-name="' + escHtml(c.name) + '" data-chat-avatar="' + escHtml(c.avatar) + '" data-chat-bg="' + escHtml(c.bg) + '">' +
      '<div class="avatar" style="background:linear-gradient(135deg,' + c.bg + ',' + c.bg.replace(')','') + 'dd)">' + c.avatar + '</div>' +
      '<div class="info"><div class="name">' + escHtml(c.name) + '</div>' +
      (preview ? '<div class="preview">' + escHtml(preview) + '</div>' : '<div class="preview" style="color:#555">点击开始聊天</div>') +
      '</div>' +
      (time ? '<div style="font-size:10px;color:#555;flex-shrink:0;align-self:flex-start;margin-top:3px">' + time + '</div>' : '') +
      '</div>';
  });
  document.getElementById('es-phone-kakao-list').innerHTML = listHtml;
  // Kakao 联系人点击（data-* 属性 + 事件委托，避免 inline onclick 引号冲突）
  document.querySelectorAll('.es-phone-contact').forEach(function(el) {
    el.addEventListener('click', function() {
      window.__phoneOpenChat(el.dataset.chatId, el.dataset.chatName, el.dataset.chatAvatar, el.dataset.chatBg);
    });
  });

  // 泡泡内容
  document.getElementById('es-phone-bubble-content').innerHTML = renderBubbleChat(
    bubble.messages || [], bubble.subscribers || 0, bubble.streak || 0,
    bubble.todayCount || 0, 5, (bubble.todayCount || 0) < 5
  );
  // 反馈内容
  document.getElementById('es-phone-feedback-content').innerHTML = renderFeedbackContent(E);

  // 全局导航函数
  window.__phoneCurChannel = 'maleLead';
  window.__phoneOpenApp = function(app) {
    // 练习生期不可用的功能
    var E2 = GS.entSim;
    var isD = E2.career && E2.career.debutDay > 0;
    if (app === 'letters' && !isD) { showToast('出道后才解锁信箱功能'); return; }
    if (app === 'awards' && !isD) { showToast('出道后才解锁奖项功能'); return; }
    if (app === 'bubble' && !isD) { showToast('出道后才解锁泡泡功能'); return; }
    document.querySelectorAll('.es-phone-page').forEach(function(p) { p.classList.remove('active'); });
    var targetPage = document.getElementById('es-phone-page-' + app);
    if (targetPage) {
      targetPage.classList.add('active');
      if (app === 'kakao' && !GS._entSimChatInited) {
        ['maleLead','brother','rival','manager','group','sasaeng'].forEach(function(ch) {
          if (window.initChatChannel) window.initChatChannel(ch);
        });
        GS._entSimChatInited = true;
      }
      if (app === 'moments') document.getElementById('es-phone-moments-content').innerHTML = renderMomentsInnerFS();
      if (app === 'diary') document.getElementById('es-phone-diary-content').innerHTML = renderDiaryInnerFS();
      if (app === 'letters') document.getElementById('es-phone-letters-content').innerHTML = renderLettersInnerFS();
      if (app === 'awards') document.getElementById('es-phone-awards-content').innerHTML = renderAwardsInnerFS();
      if (app === 'feedback') document.getElementById('es-phone-feedback-content').innerHTML = renderFeedbackContent(E2);
    }
  };
  window.__phoneBack = function() {
    // 如果在聊天页，返回 Kakao 联系人列表而非桌面
    var chatPage = document.getElementById('es-phone-page-chat');
    if (chatPage && chatPage.classList.contains('active')) {
      document.querySelectorAll('.es-phone-page').forEach(function(p) { p.classList.remove('active'); });
      var kakaoPage = document.getElementById('es-phone-page-kakao');
      if (kakaoPage) { kakaoPage.classList.add('active'); return; }
    }
    document.querySelectorAll('.es-phone-page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('es-phone-page-home').classList.add('active');
  };
  window.__phoneOpenChat = function(ch, name, avatar, bg) {
    document.querySelectorAll('.es-phone-page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('es-phone-page-chat').classList.add('active');
    document.getElementById('es-phone-chat-header').innerHTML =
      '<div style="width:34px;height:34px;border-radius:17px;background:linear-gradient(135deg,' + bg + ',' + bg.replace(')','') + 'cc);font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px">' + avatar + '</div>' +
      '<div style="flex:1"><div class="name">' + escHtml(name) + '</div><div style="font-size:10px;color:#666;margin-top:1px">在线</div></div>' +
      '<div style="font-size:20px;color:#555">⋯</div>';
    window.__phoneCurChannel = ch;
    // 经纪人/私生为单向推送，禁用输入框
    var input = document.getElementById('es-phone-chat-input');
    var sendBtn = document.querySelector('.es-phone-send');
    if (ch === 'manager' || ch === 'group' || ch === 'sasaeng') {
      if (input) { input.disabled = true; input.placeholder = '此聊天不支持回复'; input.style.opacity = '0.3'; }
      if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.3'; }
    } else {
      if (input) { input.disabled = false; input.placeholder = '输入回复...'; input.style.opacity = '1'; }
      if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }
    }
    renderPhoneChatMsgs(ch);
  };
  window.__quickReply = function(ch, idx) {
  if (!GS._entSimChatHistory) GS._entSimChatHistory = {};
  if (!GS._entSimChatHistory[ch]) GS._entSimChatHistory[ch] = [];
  var container = document.getElementById('es-phone-quick-replies');
  var keys = container && container._replyKeys;
  var q = keys && keys[idx] ? keys[idx] : '';
  // 1. 推玩家回复到聊天记录
  GS._entSimChatHistory[ch].push({ role: 'user', content: q || '嗯' });
  renderPhoneChatMsgs(ch);
  // 2. 根据频道类型决定对方回复逻辑
  var replyContent = '';
  var isPaired = (ch === 'brother' || ch === 'rival');
  var isMaleLead = (ch === 'maleLead');
  // 优先用 pendingChat 的 responses（绑定式 Q&A：选 replies[idx] → 对方回 responses[idx]）
  var pcQR = GS._entSimPendingChat && GS._entSimPendingChat[ch];
  if (pcQR && pcQR.responses && pcQR.responses.length && typeof idx === 'number') {
    replyContent = pcQR.responses[idx] || pcQR.responses[0];
    // 清除 pending（本轮绑定式 Q&A 结束）
    delete GS._entSimPendingChat[ch];
  } else if (isMaleLead) {
    // 男主频道：q/r 格式，findChatPoolReply 查找匹配条目取 r
    var found = findChatPoolReply(q);
    if (found && found.r && found.r.length) {
      replyContent = found.r[Math.floor(Math.random() * found.r.length)];
    } else if (found && found.msg) {
      replyContent = found.msg;
    }
    if (!replyContent) {
      // 池子未命中：从男主 acks 池取
      var mlAckPool = getChatAckByChannel('maleLead');
      replyContent = mlAckPool[Math.floor(Math.random() * mlAckPool.length)];
    }
    // 清除 pending（本轮对话结束）
    if (GS._entSimPendingChat) delete GS._entSimPendingChat[ch];
  } else if (isPaired) {
    // 哥哥/情敌频道：按成员 ID 取对应 ACK 池
    var ackPool = getChatAckByChannel(ch);
    replyContent = ackPool[Math.floor(Math.random() * ackPool.length)];
    // 清除 pending（本轮对话结束，不再显示预设）
    if (GS._entSimPendingChat) delete GS._entSimPendingChat[ch];
  } else {
    // 未命中 → 按成员 ID 取 ACK 池
    var ackPoolML = getChatAckByChannel('maleLead');
    replyContent = ackPoolML[Math.floor(Math.random() * ackPoolML.length)];
  }
  // 3. 延迟推对方回复
  setTimeout(function() {
    GS._entSimChatHistory[ch].push({ role: 'ai', content: resolveChatTemplates(replyContent) });
    renderPhoneChatMsgs(ch);
    saveGame();
  }, 400 + Math.random() * 600);
};
window.__phoneSend = function() {
    var input = document.getElementById('es-phone-chat-input');
    var ch = window.__phoneCurChannel;
    if (!input || !input.value.trim() || !ch) return;
    var msg = input.value.trim();
    input.value = '';
    if (!GS._entSimChatHistory) GS._entSimChatHistory = {};
    if (!GS._entSimChatHistory[ch]) GS._entSimChatHistory[ch] = [];
    GS._entSimChatHistory[ch].push({ role: 'user', content: msg });
    renderPhoneChatMsgs(ch);
    // 回复逻辑
    setTimeout(function() {
      if (ch === 'maleLead') {
        // 1. 先尝试池子精确匹配
        var found2 = findChatPoolReply(msg);
        if (found2 && found2.r && found2.r.length) {
          var poolReply = found2.r[Math.floor(Math.random() * found2.r.length)];
          GS._entSimChatHistory.maleLead.push({ role: 'ai', content: resolveChatTemplates(poolReply) });
          renderPhoneChatMsgs(ch);
          return;
        }
        // 2. 池子未命中 → 调用 AI
        if (typeof generateEntSimChat === 'function') {
          input.placeholder = 'AI 正在回复...';
          generateEntSimChat(msg).then(function(aiReply) {
            input.placeholder = '输入回复...';
            if (aiReply && aiReply !== 'dailyLimit' && typeof aiReply === 'string') {
              GS._entSimChatHistory.maleLead.push({ role: 'ai', content: resolveChatTemplates(aiReply) });
            } else if (aiReply === 'dailyLimit') {
              GS._entSimChatHistory.maleLead.push({ role: 'ai', content: '（今天聊得够多了，明天再发吧）' });
            } else {
              GS._entSimChatHistory.maleLead.push({ role: 'ai', content: '嗯。' });
            }
            renderPhoneChatMsgs(ch);
          }).catch(function() {
            input.placeholder = '输入回复...';
            GS._entSimChatHistory.maleLead.push({ role: 'ai', content: '（网络开小差了，再发一次试试）' });
            renderPhoneChatMsgs(ch);
          });
        } else {
          GS._entSimChatHistory.maleLead.push({ role: 'ai', content: '嗯。' });
          renderPhoneChatMsgs(ch);
        }
      } else if (ch === 'brother' || ch === 'rival') {
        var ackPool2 = getChatAckByChannel(ch);
        replyContent = ackPool2[Math.floor(Math.random() * ackPool2.length)];
        if (GS._entSimPendingChat) delete GS._entSimPendingChat[ch];
      }
      if (!replyContent) replyContent = '嗯。';
      GS._entSimChatHistory[ch].push({ role: 'ai', content: resolveChatTemplates(replyContent) });
      renderPhoneChatMsgs(ch);
    }, 500 + Math.random() * 800);
  };
  window.__phoneBubbleSend = function() {
    sendBubbleMessage().then(function() {
      var E2 = GS.entSim;
      var b2 = E2.bubble || {};
      var bcEl = document.getElementById('es-phone-bubble-content');
      if (bcEl) bcEl.innerHTML = renderBubbleChat(
        b2.messages || [], b2.subscribers || 0, b2.streak || 0,
        b2.todayCount || 0, 5, (b2.todayCount || 0) < 5
      );
    });
  };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function updateQuickReplies(ch, presets) {
  var container = document.getElementById('es-phone-quick-replies');
  if (!container) return;
  if (!presets.length) { container.innerHTML = ''; return; }
  // 存 q-key 用于精确匹配池子回复
  container._replyKeys = presets.map(function(p) { return p.q; });
  var btns = '';
  for (var i = 0; i < Math.min(presets.length, 3); i++) {
    var txt = (presets[i].t || presets[i].q || '').substring(0, 24);
    btns += '<button style="width:100%;padding:8px 12px;background:#0f3460;border:1px solid #3a5a8c;border-radius:8px;color:#e0d7f5;cursor:pointer;font-size:13px;text-align:left" onclick="window.__quickReply(\'' + escHtml(ch) + '\',' + i + ')">' + escHtml(txt) + '</button>';
  }
  container.innerHTML = btns;
}

function renderPhoneChatMsgs(ch) {
  var msgs = document.getElementById('es-phone-chat-msgs');
  if (!msgs) return;
  var hist = (GS._entSimChatHistory || {})[ch] || [];
  if (!hist.length) {
    // 兜底：聊天历史丢失时自动重新初始化（存档重载/旧档迁移导致 _entSimChatInited=true 但历史丢失）
    if (ch !== 'sasaeng' && typeof window.initChatChannel === 'function') {
      window.initChatChannel(ch);
      hist = (GS._entSimChatHistory || {})[ch] || [];
      if (hist.length && typeof saveGame === 'function') saveGame();
    }
    if (!hist.length) {
      msgs.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:6px;font-size:13px"><div style="font-size:36px">💬</div><div>暂无消息</div></div>';
      // 男主频道：空白状态下仍显示快捷回复按钮（让玩家主动发起对话）
      if (ch === 'maleLead') {
        updateQuickReplies(ch, getMaleLeadPresetsForChat());
      } else {
        updateQuickReplies(ch, []);
      }
      return;
    }
  }

  // 渲染预设回复按钮：优先用 pendingChat 的 replies（绑定式Q&A）
  var presets = [];
  var lastMsg = hist.length ? hist[hist.length-1] : null;
  if (!lastMsg || lastMsg.role !== 'user') {
    var pc = GS._entSimPendingChat && GS._entSimPendingChat[ch];
    if (pc && pc.replies && pc.replies.length) {
      // 绑定式 Q&A：对方发 msg → 用 replies 作预设按钮
      presets = pc.replies.map(function(r, i) { return { q: r, t: r, idx: i }; });
    } else if (ch === 'maleLead') {
      // 男主频道无 pending：用 getMaleLeadPresetsForChat（旧格式 Q&A 池）
      presets = getMaleLeadPresetsForChat();
    } else {
      // 哥哥/情敌无 pending：回退阶段池预设
      var stagePresets = getChatPresetsByChannel(ch);
      var shuffled = stagePresets.slice().sort(function() { return Math.random() - 0.5; });
      presets = shuffled.slice(0, 3).map(function(t) { return { q: t, t: t }; });
    }
  }
  updateQuickReplies(ch, presets);
  var html = '';
  var lastRole = '';
  hist.forEach(function(m, idx) {
    var isUser = m.role === 'user';
    if (idx === 0 || m.role !== lastRole || idx % 3 === 0) {
      var timeStr = '';
      if (idx === 0) timeStr = '今天';
      else if (m.role !== lastRole) timeStr = '刚刚';
      if (timeStr) html += '<div style="text-align:center;padding:8px 0;font-size:10px;color:rgba(255,255,255,.2)">' + timeStr + '</div>';
    }
    lastRole = m.role;
    html += '<div class="es-phone-msg ' + (isUser ? 'me' : 'you') + '">' + escHtml(resolveChatTemplates(m.content || m.msg || '')) + '</div>';
  });
  if (hist.length && hist[hist.length-1].role === 'user') {
    html += '<div style="text-align:right;font-size:10px;color:rgba(255,255,255,.15);padding:2px 4px">已发送</div>';
  }
  msgs.innerHTML = html;
  msgs.scrollTop = msgs.scrollHeight;
}

// 解析聊天消息中的模板变量 {maleLead}/{brother}/{rival}/{groupName}/{mate1-5}/{heroineName}
function resolveChatTemplates(text) {
  if (!text) return '';
  var E = GS.entSim;
  var ml = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '他';
  var br = (E.brother && E.brother.name) || '哥哥';
  var rv = (E.rival && E.rival.name) || '团内成员';
  var gn = (E.groupMeta && E.groupMeta.groupName) || '女团';
  var hn = (E.career && E.career.stageName) || '我';
  var sisters = E.heroineGroup || [];
  text = text.replace(/\{maleLead\}/g, ml).replace(/\{brother\}/g, br).replace(/\{rival\}/g, rv).replace(/\{groupName\}/g, gn).replace(/\{name\}/g, ml).replace(/\{heroineName\}/g, hn);
  // 团群聊队友名替换
  for (var s = 1; s <= 5; s++) {
    var sis = sisters[s - 1];
    var mateName = sis ? sis.name : ('队友' + s);
    text = text.replace(new RegExp('\\{mate' + s + '\\}', 'g'), mateName);
  }
  return text;
}

// 稳定的伪随机数（基于字符串hash，确保同一标题每次渲染数据一致）
function stableRand(seed, min, max) {
  var h = 0;
  for (var i = 0; i < seed.length; i++) { h = ((h << 5) - h) + seed.charCodeAt(i); h = h & h; }
  return min + Math.abs(h) % (max - min + 1);
}

function renderFeedbackContent(E) {
  var buzz = E.dailyBuzz || {};
  var name = (GS.heroineProfile && GS.heroineProfile.name) || '你';
  var isDebut = E.career && E.career.debutDay > 0;
  var html = '';
  var hasContent = false;

  // ── 练习生期门控：只显示外部热搜（starHot），不显示营业事件/粉丝反应 ──
  if (!isDebut) {
    // 清理练习生期脏数据
    if (typeof GS !== 'undefined' && GS._entSimFanEvents && GS._entSimFanEvents.length) {
      GS._entSimFanEvents = [];
    }
    if (typeof GS !== 'undefined' && GS._entSimFanReactions && GS._entSimFanReactions.length) {
      GS._entSimFanReactions = [];
    }
    // 只展示外部热搜（starHot）
    var hotItems = buzz.starHot || buzz.hotSearch || [];
    if (!hotItems.length) {
      return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;gap:6px;font-size:13px"><div style="font-size:36px">🌐</div><div>暂无热搜</div><div style="font-size:11px;color:#444">出道后将解锁星圈</div></div>';
    }
    for (var hi = 0; hi < hotItems.length; hi++) {
      var hi2 = hotItems[hi];
      var hTitle2 = (typeof hi2 === 'object' && hi2.t) ? hi2.t : (typeof hi2 === 'string' ? hi2 : '');
      var hBody2 = (typeof hi2 === 'object' && hi2.c) ? hi2.c : '';
      if (!hTitle2) continue;
      html += '<div class="es-weibo-card">';
      html += '<div class="es-weibo-header">' +
        '<div class="es-weibo-avatar" style="background:linear-gradient(135deg,#f59e0b,#d97706)">🌐</div>' +
        '<div class="es-weibo-user"><div class="es-weibo-name">星圈热帖</div>' +
        '<div class="es-weibo-sub">实时热搜</div></div></div>';
      html += '<div class="es-weibo-title">🔥 ' + escHtml(hTitle2) + '</div>';
      if (hBody2) html += '<div class="es-weibo-body">' + escHtml(hBody2) + '</div>';
      html += '</div>';
    }
    return html;
  }

  // ── 1. 合并帖子流（AI粉丝反应 + popup注入事件）──
  var combined = [];
  // AI 粉丝反应帖
  var fanList = E.fanReactions || [];
  for (var ai = 0; ai < fanList.length; ai++) {
    combined.push({ src: 'ai', data: fanList[ai], time: fanList[ai].round || 0, title: fanList[ai].reason || fanList[ai].event || '' });
  }
  // Popup 注入事件帖（今日营业/事业波折等）
  var fanEvents = (typeof GS !== 'undefined' && GS._entSimFanEvents) || [];
  for (var ei = 0; ei < fanEvents.length; ei++) {
    combined.push({ src: 'popup', data: fanEvents[ei], time: fanEvents[ei].day || 0, title: fanEvents[ei].title || '' });
  }
  // 按时间降序（新 → 旧），同名去重（AI 优先）
  combined.sort(function(a, b) { return b.time - a.time; });
  var shownTitles = {};
  var rendered = [];
  for (var ci = 0; ci < combined.length; ci++) {
    var c = combined[ci];
    var cTitle = c.title.slice(0, 30);
    if (c.src === 'popup' && shownTitles[cTitle]) continue; // popup 已被 AI 版本覆盖
    if (c.src === 'ai') {
      // AI 覆盖同标题的 popup，但自己也只保留一次
      if (shownTitles[cTitle] === 'ai') continue;
      shownTitles[cTitle] = 'ai';
    } else {
      shownTitles[cTitle] = 'popup';
    }
    rendered.push(c);
  }

  var roleCfg = {
    '大粉': { icon: '💎', color: '#FF6B8A', name: '守护' + name + '的站姐', sub: '铁粉' },
    '路人': { icon: '👤', color: '#8E8E93', name: '路过看看', sub: '' },
    '黑粉': { icon: '👻', color: '#555', name: '匿名', sub: '' },
    '热议': { icon: '🔥', color: '#FF9F43', name: '星圈热帖', sub: '' }
  };

  for (var ri = 0; ri < rendered.length; ri++) {
    var rc = rendered[ri];
    if (rc.src === 'ai') {
      // ── AI 粉丝反应帖 ──
      var item = rc.data;
      var raw = item.text || '';
      var parts = [];
      var re = /·(大粉|路人|黑粉)[：:]([\s\S]*?)(?=·(?:大粉|路人|黑粉)[：:]|$)/g;
      var m2;
      while ((m2 = re.exec(raw)) !== null) { parts.push({ role: m2[1], text: m2[2].trim().replace(/\n/g, ' ') }); }
      if (!parts.length && raw) parts = [{ role: '热议', text: raw.slice(0, 200) }];

      var titleText = item.reason || item.event || '粉丝热议';
      var titleSeed = titleText + (item.round || 0);

      html += '<div class="es-weibo-card">';
      html += '<div class="es-weibo-header">' +
        '<div class="es-weibo-avatar" style="background:linear-gradient(135deg,#6366F1,#8B5CF6)">✦</div>' +
        '<div class="es-weibo-user">' +
          '<div class="es-weibo-name">' + escHtml(name) + '的星圈</div>' +
          '<div class="es-weibo-sub">' + (item.round ? '回合 ' + item.round : '刚刚') + ' · 粉丝热议</div>' +
        '</div>' +
      '</div>';
      html += '<div class="es-weibo-title">🔥 ' + escHtml(titleText) + '</div>';
      if (item.event) html += '<div class="es-weibo-event">📌 ' + escHtml(item.event) + '</div>';
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k], cfg = roleCfg[p.role] || roleCfg['热议'];
        html += '<div class="es-weibo-comment">' +
          '<div class="es-weibo-cmt-avatar" style="color:' + cfg.color + '">' + cfg.icon + '</div>' +
          '<div class="es-weibo-cmt-body">' +
            '<span class="es-weibo-cmt-name">' + cfg.name + '</span>' +
            (cfg.sub ? '<span class="es-weibo-cmt-badge" style="color:' + cfg.color + '">' + cfg.sub + '</span>' : '') +
            '<span class="es-weibo-cmt-text">' + escHtml(p.text) + '</span>' +
          '</div>' +
        '</div>';
      }
      var likes = stableRand(titleSeed + '_likes', 120, 2800);
      var cmts = parts.length + stableRand(titleSeed + '_cmts', 8, 200);
      var shares = stableRand(titleSeed + '_shares', 5, 80);
      html += '<div class="es-weibo-actions">' +
        '<span>❤️ ' + likes + '</span><span>💬 ' + cmts + '</span><span>📤 ' + shares + '</span>' +
      '</div>';
      html += '</div>';
      hasContent = true;
    } else {
      // ── Popup 事件帖（今日营业/事业波折等）──
      var fe = rc.data;
      var popTitle = fe.title || '今日热议';
      var popSeed = popTitle + (fe.day || 0);
      html += '<div class="es-weibo-card">';
      html += '<div class="es-weibo-header">' +
        '<div class="es-weibo-avatar" style="background:linear-gradient(135deg,#6366F1,#8B5CF6)">✦</div>' +
        '<div class="es-weibo-user">' +
          '<div class="es-weibo-name">' + escHtml(name) + '的星圈</div>' +
          '<div class="es-weibo-sub">第 ' + (fe.day || '?') + ' 天</div>' +
        '</div>' +
      '</div>';
      html += '<div class="es-weibo-title">🔥 ' + escHtml(popTitle) + '</div>';
      for (var rf = 0; rf < fe.texts.length; rf++) {
        html += '<div class="es-weibo-comment">' +
          '<div class="es-weibo-cmt-avatar" style="color:#ec4899">💬</div>' +
          '<div class="es-weibo-cmt-body">' +
            '<span class="es-weibo-cmt-name">粉丝评论</span>' +
            '<span class="es-weibo-cmt-text">' + escHtml(fe.texts[rf]) + '</span>' +
          '</div>' +
        '</div>';
      }
      var flk = stableRand(popSeed + '_likes', 80, 600);
      var fcm = fe.texts.length + stableRand(popSeed + '_cmts', 5, 50);
      html += '<div class="es-weibo-actions">' +
        '<span>❤️ ' + flk + '</span><span>💬 ' + fcm + '</span><span>📤 ' + Math.floor(flk * 0.1) + '</span>' +
      '</div>';
      html += '</div>';
      hasContent = true;
    }
  }

  // ── 2. 外部热搜帖（外部 K-pop 热点）──
  var hotItems = buzz.starHot || buzz.hotSearch || [];
  for (var i = hotItems.length - 1; i >= 0; i--) {
    var hi = hotItems[i];
    // 兼容字符串和 {t,c} 对象两种格式
    var hTitle = (typeof hi === 'object' && hi.t) ? hi.t : (typeof hi === 'string' ? hi : '');
    var hBody = (typeof hi === 'object' && hi.c) ? hi.c : '';
    if (!hTitle) continue;
    var seed2 = hTitle + (buzz.lastGenDay || 0);

    html += '<div class="es-weibo-card">';
    // 头部
    html += '<div class="es-weibo-header">' +
      '<div class="es-weibo-avatar" style="background:linear-gradient(135deg,#f59e0b,#d97706)">🌐</div>' +
      '<div class="es-weibo-user">' +
        '<div class="es-weibo-name">星圈热帖</div>' +
        '<div class="es-weibo-sub">实时热搜 · 第 ' + (buzz.lastGenDay || '?') + ' 天</div>' +
      '</div>' +
    '</div>';
    // 标题
    html += '<div class="es-weibo-title">🔥 ' + escHtml(hTitle) + '</div>';
    // 内容
    if (hBody) {
      html += '<div class="es-weibo-body">' + escHtml(hBody) + '</div>';
    }
    // 池子匹配评论（HOT_SEARCH_REPLY_POOL 中标题含有关键词的取 fanReplies）
    var matchedReplies = matchHotSearchReplies(hTitle);
    if (matchedReplies && matchedReplies.length) {
      var replyLabels = ['粉丝热评', '路人视角', '热议'];
      for (var ri = 0; ri < Math.min(matchedReplies.length, 3); ri++) {
        var label = replyLabels[ri] || '评论';
        html += '<div class="es-weibo-comment">' +
          '<div class="es-weibo-cmt-avatar" style="color:#f59e0b">💬</div>' +
          '<div class="es-weibo-cmt-body">' +
            '<span class="es-weibo-cmt-name">' + label + '</span>' +
            '<span class="es-weibo-cmt-text">' + escHtml(matchedReplies[ri]) + '</span>' +
          '</div>' +
        '</div>';
      }
    }
    // 底栏
    var hLikes = stableRand(seed2 + '_likes', 80, 1500);
    var hCmts = stableRand(seed2 + '_cmts', 10, 300);
    var hShares = stableRand(seed2 + '_shares', 3, 60);
    html += '<div class="es-weibo-actions">' +
      '<span>❤️ ' + hLikes + '</span><span>💬 ' + hCmts + '</span><span>📤 ' + hShares + '</span>' +
    '</div>';
    html += '</div>';
    hasContent = true;
  }

  if (!hasContent) {
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;color:#555;font-size:13px;gap:8px">' +
      '<div style="font-size:48px;margin-bottom:4px">🌐</div><div style="font-size:15px;color:#777">星圈暂无动态</div>' +
      '<div style="font-size:12px;color:#555">热搜、曝光、营业后粉丝会在这里讨论</div></div>';
  }
  return html;
}

// 匹配热搜回复池：标题含关键词则返回 fanReplies
function matchHotSearchReplies(title) {
  // 从 HOT_SEARCH_REPLY_POOL 尝试匹配
  if (typeof HOT_SEARCH_REPLY_POOL === 'undefined' || !HOT_SEARCH_REPLY_POOL) return null;
  for (var i = 0; i < HOT_SEARCH_REPLY_POOL.length; i++) {
    var e = HOT_SEARCH_REPLY_POOL[i];
    if (!e || !e.hotSearch || !e.fanReplies) continue;
    // 提取关键词匹配
    var ks = e.hotSearch.replace(/#\{[^}]+\}/g, '').replace(/#/g, '').split(/\s+/);
    for (var k = 0; k < ks.length; k++) {
      if (ks[k].length >= 2 && title.indexOf(ks[k]) >= 0) return e.fanReplies;
    }
  }
  return null;
}


function renderScheduleInner() { return '<div class="es-panel"><div class="es-h3">🗓 日程</div><p class="es-dim">功能开发中</p></div>'; }

// 泡泡聊天室渲染
function renderBubbleChat(messages, sub, streak, _todayCount, _maxDaily, canSend) {
  // 粉丝名池（100个中文名，不重复使用）
  // 静态池，每条AI回复随机分配名字
  // 聊天历史渲染
  var histHtml = '';
  var flatMsgs = [];
  for (var i = 0; i < (messages || []).length; i++) {
    var m = messages[i];
    flatMsgs.push({ me: true, text: m.msg || '' });
    if (m.replies && m.replies.length) {
      for (var r = 0; r < m.replies.length; r++) {
        flatMsgs.push({ me: false, text: m.replies[r], name: pickFanName() });
      }
    }
  }
  for (var j = 0; j < flatMsgs.length; j++) {
    var fm = flatMsgs[j];
    if (fm.me) {
      var hasPhoto = detectBubblePhoto(fm.text);
      if (hasPhoto) {
        var displayText = stripPhotoKeywords(fm.text);
        histHtml += '<div class="bubble-msg me"><div class="bubble-photo-card">' +
          '<div class="bubble-photo-pic">📸</div>' +
          '<div class="bubble-photo-label">' + escHtml(hasPhoto) + '</div>' +
          (displayText ? '<div class="bubble-photo-caption">' + escHtml(displayText) + '</div>' : '') +
          '</div></div>';
      } else {
        histHtml += '<div class="bubble-msg me"><div class="bubble-bubble">' + escHtml(fm.text) + '</div></div>';
      }
    } else {
      histHtml += '<div class="bubble-msg fan"><div><div class="bubble-name">' + escHtml(fm.name || '粉丝') + '</div><div class="bubble-bubble">' + escHtml(fm.text) + '</div></div></div>';
    }
  }

  var headerHtml = '<div class="bubble-header-bar">' +
    '<span class="bubble-h-left">📱 <b>' + escHtml((GS.heroineProfile && GS.heroineProfile.name) || '你') + '的泡泡</b></span>' +
    '<span class="bubble-h-right">订阅 <b>' + sub + '</b>人 · 连续 <b>' + streak + '</b>天</span>' +
    '</div>';
  var chatDiv = '<div class="bubble-chat" id="es-bubble-chat">' +
    (histHtml || '<div class="bubble-empty">还没有发过泡泡～发第一条消息给粉丝吧 💜</div>') +
    '</div>';
  var sendHtml = '<div class="bubble-send-bar">' +
      '<button id="es-bubble-send" class="bubble-send-btn"' + (canSend ? ' onclick="window.__phoneBubbleSend()"' : ' disabled') + '>' +
      (canSend ? '💬 发送泡泡消息' : '今日已发满') +
      '</button>' +
    '</div>';
  return '<div style="display:flex;flex-direction:column;height:100%">' +
    headerHtml +
    chatDiv +
    sendHtml +
    '</div>';
}

// 100个中文粉丝名池
var FAN_NAME_POOL = [
  '小糖果','星星眼','薄荷糖','草莓牛奶','素妍','出道粉','仓鼠饲养员','你的春天',
  '智恩','樱花落','东海边的','追星少女','露娜','布丁布丁','巧克力牛奶','花路陪你走',
  '深夜写信的人','一只企鹅','小太阳','练习生时期的老粉',
  '桃子汽水','月亮不睡','芝士年糕','蓝色围巾','小迷糊','追光者','向日葵','棉花糖',
  '奶茶三分糖','蜂蜜柚子','小雨伞','饼干怪兽','早起第一名','熬夜冠军','柠檬气泡水',
  '软糖少女','云朵上面','小熊软糖','夏天结束了','冬日暖阳','橘子汽水','恐龙让梨',
  '芋泥波波','酸奶盖子','绿豆冰沙','想喝可乐','泡芙小姐','焦糖布丁','提拉米苏',
  '薯片大人','糯米团子','红豆面包','牛奶面包','空气炸锅','螺蛳粉真爱','火锅底料',
  '麻辣烫丸子','珍珠奶茶','冰美式续命','抹茶星冰乐','杨枝甘露','多肉葡萄','芝芝莓莓',
  '海边日出','半山听雨','花开彼岸','木槿花开','梧桐树下','橘子海','银河铁道','极光之下',
  '千与千寻','龙猫巴士','魔女宅急便','天空之城','风之谷','幽灵公主','波妞喜欢宗介',
  '一闪一闪','夜空中最亮的星','白日梦想家','月亮与六便士','小王子星球','玫瑰与狐狸',
  '今天也很想你','明天见','后天也是晴天','一直在','永远站','下一站幸福',
  '追风少女','自由如风','尘埃里开花','逆光飞翔','勇敢的心','微光','小确幸'
];
// 检测泡泡消息中的照片/图片关键词，返回图片类型描述（null=无图片）
function detectBubblePhoto(text) {
  if (!text) return null;
  var t = text;
  var patterns = [
    [/\[自拍\]/i, '自拍'], [/\[照片\]/i, '照片'], [/\[图片\]/i, '图片'], [/\[사진\]/i, '사진'],
    [/\(自拍\)/i, '自拍'], [/\(照片\)/i, '照片'], [/\(사진\)/i, '사진'], [/\(셀카\)/i, '셀카'],
    [/自拍/g, '自拍'], [/照片/g, '照片'], [/사진/g, '사진'], [/셀카/g, '셀카'],
    [/拍了一张/g, '照片'], [/拍了个/g, '照片'], [/拍了张/g, '照片'],
    [/📸/g, '照片'], [/📷/g, '照片'], [/🖼️/g, '图片'], [/🖼/g, '图片']
  ];
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i][0].test(t)) return patterns[i][1];
  }
  return null;
}
// 从消息文本中去除照片相关关键词，返回纯文字部分
function stripPhotoKeywords(text) {
  if (!text) return '';
  return text
    .replace(/\[自拍\]|\[照片\]|\[图片\]|\[사진\]/gi, '')
    .replace(/\(自拍\)|\(照片\)|\(사진\)|\(셀카\)/gi, '')
    .replace(/自拍|사진|셀카|拍了一张|拍了个|拍了张|📸|📷|🖼️|🖼/g, '')
    .replace(/^\s*[,，。.]\s*/, '') // 去掉开头的标点
    .replace(/\s{2,}/g, ' ').trim();
}
function pickFanName() { return FAN_NAME_POOL[Math.floor(Math.random() * FAN_NAME_POOL.length)]; }

// 泡泡发送结果（保留，面板内渲染使用）

// ---------- 点击右侧舆论条目 → 详情弹窗 ----------
var BUZZ_LABELS = { hot: '🔥 热搜', fan: '💬 粉丝讨论', media: '📰 媒体热议' };
var BUZZ_ICONS = { topfan: '💗 大粉', passerby: '👀 路人', hater: '⚡ 黑粉' };

function bindBuzzClicks() {
  document.querySelectorAll('.es-buzz-click').forEach(function(el) {
    el.addEventListener('click', function() {
      var type = el.dataset.buzz;
      var idx = parseInt(el.dataset.idx, 10);
      showBuzzDetail(type, idx);
    });
  });
}

function showBuzzDetail(type, idx) {
  var buzz = getDailyBuzz();
  var list = buzz[type === 'fan' ? 'fanDiscussion' : type === 'hot' ? 'hotSearch' : 'mediaTitle'] || [];
  if (!list[idx]) return;

  var total = list.length;
  var title = BUZZ_LABELS[type] || '舆论';
  var item = list[idx];
  var itemTitle = buzzTitle(item);
  var itemContent = buzzContent(item);
  // 有独立展开内容时分开显示标题和正文；无内容时只显示标题
  var hasContent = itemContent && itemContent !== itemTitle;

  // 左右切换
  var arrows = '';
  if (total > 1) {
    arrows = '<div class="es-buzz-nav">' +
      '<button class="es-buzz-arrow' + (idx <= 0 ? ' es-buzz-disabled' : '') + '" data-buzz-prev="' + type + '" data-buzz-idx="' + idx + '">◀ 上一条</button>' +
      '<span class="es-buzz-pos">' + (idx + 1) + ' / ' + total + '</span>' +
      '<button class="es-buzz-arrow' + (idx >= total - 1 ? ' es-buzz-disabled' : '') + '" data-buzz-next="' + type + '" data-buzz-idx="' + idx + '">下一条 ▶</button>' +
    '</div>';
  }

  // 粉丝讨论额外显示分类图标
  var extra = '';
  if (type === 'fan') {
    var cat = classifyFan(itemTitle);
    extra = '<div class="es-buzz-cat">' + (BUZZ_ICONS[cat] || '') + '</div>';
  }

  // 女主相关高亮
  var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '';
  var meTag = (hpName && itemTitle.indexOf(hpName) >= 0) ? '<span class="es-buzz-me">与你相关</span>' : '';

  // 展示：有内容时标题+正文，无内容时只展示标题
  var textBlock = '';
  if (hasContent) {
    textBlock = '<div class="es-buzz-detail-title">' + escHtml(itemTitle) + '</div>' +
      '<div class="es-buzz-detail-content">' + escHtml(itemContent) + '</div>';
  } else {
    textBlock = '<div class="es-buzz-detail-text">' + escHtml(itemTitle) + '</div>';
  }

  var body = '<div class="es-buzz-detail">' +
    '<div class="es-buzz-detail-head">' +
      '<span class="es-buzz-detail-type">' + title + '</span>' +
      meTag +
    '</div>' +
    extra +
    textBlock +
    '<div id="es-buzz-replies" style="display:none"></div>' +
    arrows +
    // 仅女主/团队相关条目显示展开按钮，外部八卦不显示
    (isHeroineRelated(item) ? '<div style="margin-top:12px;text-align:center">' +
      '<button class="es-rom-btn" id="es-buzz-expand" style="font-size:12px;padding:6px 14px">💬 展开讨论</button>' +
    '</div>' : '') +
  '</div>';

  showEntSimModal('📊 ' + title + ' · 详情', body, [{ id: 'close', label: '关闭' }]);

  // 重新绑定切换箭头的点击 + 检查缓存
  setTimeout(function() {
    document.querySelectorAll('[data-buzz-prev]').forEach(function(b) {
      b.addEventListener('click', function() {
        var prevIdx = parseInt(b.dataset.buzzIdx, 10) - 1;
        if (prevIdx >= 0) { closeEntSimModal(); showBuzzDetail(b.dataset.buzzPrev, prevIdx); }
      });
    });
    document.querySelectorAll('[data-buzz-next]').forEach(function(b) {
      b.addEventListener('click', function() {
        var nextIdx = parseInt(b.dataset.buzzIdx, 10) + 1;
        if (nextIdx >= 0) { closeEntSimModal(); showBuzzDetail(b.dataset.buzzNext, nextIdx); }
      });
    });
    // 已有缓存：直接渲染，无需重新生成
    var cacheKey = type + '_' + idx;
    var E = GS.entSim;
    E.buzzReplies = E.buzzReplies || {};
    var cached = E.buzzReplies[cacheKey];
    if (cached && cached.lines) {
      renderBuzzReplies(cached.lines);
      var expandBtn2 = document.getElementById('es-buzz-expand');
      if (expandBtn2) { expandBtn2.disabled = true; expandBtn2.textContent = '✅ 已展开'; }
      return; // ← 关键：有缓存就不再往下走，防止重新随机生成
    }
    // 非女主相关：按标题倾向抽 3 条展示，写入缓存
    if (!isHeroineRelated(item)) {
      var autoLines = pickBuzzComments(item, 3);
      // 写入缓存，同天再次打开不再随机
      E.buzzReplies[cacheKey] = { lines: autoLines };
      renderBuzzReplies(autoLines);
    }
    var expandBtn = document.getElementById('es-buzz-expand');
    if (expandBtn && !cached) {
      expandBtn.addEventListener('click', function() {
        expandBuzzThread(type, idx);
      });
    }
  }, 100);
}

// 展开讨论串：女主条目用 AI 生成，非女主用预写评论池
async function expandBuzzThread(type, idx) {
  var buzz = getDailyBuzz();
  var list = buzz[type === 'fan' ? 'fanDiscussion' : type === 'hot' ? 'hotSearch' : 'mediaTitle'] || [];
  if (!list[idx]) return;
  var item = list[idx];
  var cacheKey = type + '_' + idx;
  var E = GS.entSim;
  E.buzzReplies = E.buzzReplies || {};

  // 已有缓存直接展示
  if (E.buzzReplies[cacheKey]) {
    renderBuzzReplies(E.buzzReplies[cacheKey].lines);
    var btn = document.getElementById('es-buzz-expand');
    if (btn) { btn.disabled = true; btn.textContent = '✅ 已展开'; }
    return;
  }

  var expandBtn = document.getElementById('es-buzz-expand');
  if (expandBtn) { expandBtn.disabled = true; expandBtn.textContent = '⏳ AI 生成中…'; }

  var lines;
  if (isHeroineRelated(item)) {
    // 女主条目 → AI 生成真实网友讨论
    var itemTitle = buzzTitle(item);
    var itemContent = buzzContent(item);
    if (itemContent === itemTitle) itemContent = '';
    lines = await generateBuzzRepliesAI(itemTitle, itemContent);
    // AI 失败时回退到倾向池子
    if (!lines || lines.length < 2) {
      lines = pickBuzzComments(item, 2);
    }
  } else {
    // 非女主条目 → 按标题倾向抽 2 条
    lines = pickBuzzComments(item, 2);
  }

  // 缓存
  E.buzzReplies[cacheKey] = { lines: lines };
  saveGame();
  renderBuzzReplies(lines);
  if (expandBtn) { expandBtn.disabled = true; expandBtn.textContent = '✅ 已展开'; }
}

function renderBuzzReplies(lines) {
  var container = document.getElementById('es-buzz-replies');
  if (container) {
    container.innerHTML = '<div class="es-buzz-reply-title">💬 网友热议</div>' +
      lines.map(function(l) { return '<div class="es-buzz-reply">' + escHtml(l.replace(/^·\s*/, '')) + '</div>'; }).join('');
    container.style.display = 'block';
  }
}

// ---------- 女团队友支线互动 ----------
// 从日程「队友互动」槽打开选择面板：让玩家选具体找哪位姐姐
function showTeammateSelectPanel() {
  console.log('[teammate-panel] called');
  var E = GS.entSim;
  var list = E.heroineGroup || [];
  // 自愈：旧存档 heroineGroup 为空时尝试重建
  if (!list.length) {
    console.log('[teammate-panel] heroineGroup empty, rebuilding...');
    E.heroineGroup = buildEntSimHeroineGroup();
    E.groupMeta = E.groupMeta || buildEntSimGroupMeta();
    list = E.heroineGroup;
    saveGame();
  }
  if (!list.length) { showToast('暂时没有可互动的队友'); return; }
  console.log('[teammate-panel] showing panel with', list.length, 'teammates');
  var html = '<p style="margin-bottom:10px;color:var(--text-muted)">今天想和哪位姐姐聊聊？点选后确认即可触发专属支线。</p>' +
    '<div class="es-sis-list">' + list.map(function(s, i) {
      return '<button class="es-sis" data-picksis="' + i + '"><span class="es-sis-name">' + escHtml(s.name) + '</span><small>' + escHtml(s.roleTag) + '</small></button>';
    }).join('') + '</div>';
  showEntSimModal('👯 队友互动', html, [{ id: 'close', label: '关闭' }]);
  document.querySelectorAll('[data-picksis]').forEach(function(b) {
    b.addEventListener('click', function() {
      closeEntSimModal();
      confirmTeammateInteract(parseInt(b.dataset.picksis, 10));
    });
  });
}

// 确认弹窗：预览该队友的性格走向，确认后再触发 AI 剧情
function confirmTeammateInteract(index) {
  var E = GS.entSim;
  var sis = (E.heroineGroup || [])[index];
  if (!sis) return;
  var flavor = TEAMMATE_FLAVOR[sis.personalityTag] || TEAMMATE_FLAVOR[sis.roleTag] || '队友找你聊了聊近况。';
  var html = '和 <b>' + escHtml(sis.name) + '（' + escHtml(sis.roleTag) + ' · ' + escHtml(sis.personalityTag || '') + '）</b> 聊聊？<br><br>' + escHtml(flavor);
  showActionInfoModal('👯 队友互动', html, '确定', '取消').then(function(ok) {
    if (!ok) return;
    triggerTeammateEvent(sis);
  });
}

// ---------- 结局全屏卡片 ----------
function showEndingCard(ending, narrative) {
  if (!ending) return;
  var tier = ending.type && ending.type.indexOf('be') === 0 ? 'be' : (ending.type && ending.type.indexOf('he') === 0 ? 'he' : 'ne');
  var overlay = document.createElement('div');
  overlay.className = 'es-ending-overlay es-ending-' + tier;
  var body = (narrative || ending.text || '').replace(/\n/g, '<br>');
  overlay.innerHTML = '<div class="es-ending-card">' +
    '<div class="es-ending-icon">' + (ending.icon || '🎬') + '</div>' +
    '<div class="es-ending-label">' + escHtml(ending.label || '') + '</div>' +
    '<div class="es-ending-narr">' + body + '</div>' +
    '<div class="es-ending-actions">' +
      '<button id="es-ending-restart" class="primary">重新开始（新的一局）</button>' +
      '<button id="es-ending-gallery" class="ghost">🏆 结局画廊</button>' +
      '<button id="es-ending-close" class="ghost">关闭</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  var closeBtn = document.getElementById('es-ending-close');
  var restartBtn = document.getElementById('es-ending-restart');
  var galleryBtn = document.getElementById('es-ending-gallery');
  if (closeBtn) closeBtn.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  if (restartBtn) restartBtn.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); restartEntSim(); });
  if (galleryBtn) galleryBtn.addEventListener('click', function() { showEndingGallery(); });
}

// 结局画廊：展示所有已解锁结局卡片
function showEndingGallery() {
  try {
    var raw = localStorage.getItem('es_endings_gallery');
    var gallery = raw ? JSON.parse(raw) : [];
    if (!gallery.length) { showToast('还没有解锁任何结局～'); return; }
    var html = '<div style="display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow-y:auto">';
    for (var i = 0; i < gallery.length; i++) {
      var g = gallery[i];
      html += '<div style="padding:10px 14px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(30,20,50,.5)">' +
        '<span style="font-size:20px">' + escHtml(g.icon || '🎬') + '</span> ' +
        '<span style="font-weight:700;color:#d8cdf0">' + escHtml(g.label || '未知') + '</span>' +
        '<span style="float:right;font-size:11px;color:var(--es-text-dim)">' + escHtml(g.date || '') + '</span>' +
        '<div style="font-size:12px;color:var(--es-text-dim);margin-top:4px">' + escHtml(g.text || '') + '</div></div>';
    }
    html += '</div>';
    showEntSimModal('🏆 结局画廊（' + gallery.length + '个结局）', html, [{ id: 'close', label: '关闭' }]);
  } catch(e) { showToast('画廊读取失败'); }
}

// ---------- 好感阶段升级/出道仪式感 ----------
function showStageUpCeremony() {
  var p = GS._entSimStageUpPending;
  if (!p) return;
  GS._entSimStageUpPending = null;

  // 出道仪式：粉色渐变全屏 overlay
  if (p.type === 'debut') {
    var meta = p.group || {};
    showDebutCeremonyOverlay(meta);
    return;
  }

  var ceremony = STAGE_CEREMONY[p.to] || '你们的相处又近了一步。';
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card">' +
    '<div class="es-stageup-icon">' + (p.icon || '💞') + '</div>' +
    '<div class="es-stageup-label">关系进入 · ' + escHtml(p.label || '') + '</div>' +
    '<div class="es-stageup-desc">' + escHtml(ceremony) + '</div>' +
    '<button id="es-stageup-go" class="primary">❥ 继续</button>' +
    '</div>';
  document.body.appendChild(overlay);
  var go = document.getElementById('es-stageup-go');
  if (go) go.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
}

// 出道仪式 overlay：粉色渐变 + 团名/队友/概念/出道曲 展示
function showDebutCeremonyOverlay(meta) {
  var groupName = meta.groupName || 'HORIZON';
  var company = meta.company || 'Konnect Entertainment';
  var concept = meta.concept || 'City Pop Retro';
  var fanName = meta.fanName || 'VOYAGERS';
  var debutSong = meta.hitSongs && meta.hitSongs.length ? meta.hitSongs[0] : 'First Light';
  var members = meta.members ? meta.members.split(/\s*,\s*/) : [];

  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.style.background = 'linear-gradient(135deg, #1a0a20 0%, #2d1040 40%, #1a0a20 100%)';

  var items = [
    '🎀  女团出道 · ' + escHtml(groupName),
    '🏢 所属社 · ' + escHtml(company),
    '🎵 概念 · ' + escHtml(concept),
    '👥 队友 · ' + (members.length ? members.map(escHtml).join(' / ') : '5人团'),
    '📀 出道曲 · ' + escHtml(debutSong),
    '❤️ 粉丝名 · ' + escHtml(fanName)
  ];

  var html = '<div class="es-stageup-card" style="border-color:rgba(255,150,200,.5);background:linear-gradient(160deg,rgba(60,20,60,.95),rgba(20,10,30,.95));max-width:420px;text-align:center">';
  for (var i = 0; i < items.length; i++) {
    html += '<div style="font-size:14px;color:rgba(255,200,220,' + (0.6 + i * 0.07).toFixed(2) + ');margin:10px 0;opacity:0;animation:es-fadein .4s ' + (i * .35).toFixed(2) + 's forwards;letter-spacing:1px">' + items[i] + '</div>';
  }
  html += '<button id="es-stageup-go" class="primary" style="margin-top:18px;animation:es-fadein .4s 2.2s forwards;opacity:0">✨ 进入出道日</button></div>';

  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  // CSS keyframes注入（一次即可）
  if (!document.getElementById('es-debut-anim')) {
    var style = document.createElement('style');
    style.id = 'es-debut-anim';
    style.textContent = '@keyframes es-fadein { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }';
    document.head.appendChild(style);
  }

  var go = document.getElementById('es-stageup-go');
  if (go) go.addEventListener('click', function() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
}

// 好感里程碑卡片（20/40/60/80）
function showMilestoneCard() {
  var m = GS._entSimMilestonePending;
  if (!m) return;
  GS._entSimMilestonePending = null;
  var msgs = {
    20: '他对你的关注不再是礼貌性的了——有时候他会不自觉地多看你一眼，然后迅速移开目光。',
    40: '你在他身边会感到一种微妙的安心。他记住了你说过的小事，甚至连你讨厌吃什么都知道。',
    60: '心动的感觉越来越清晰。你开始期待收到他的消息，而他也学会了在你面前露出不设防的笑容。',
    80: '你们之间的距离只剩下一层薄薄的窗纸。他的眼神里藏着太多没说出口的话，而你也已经准备好了听。'
  };
  var desc = msgs[m.threshold] || '你们之间的关系，又近了一步。';
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card" style="border-color:rgba(255,170,200,.4);background:linear-gradient(160deg,#3a2535,#1f1525)">' +
    '<div class="es-stageup-icon">' + (m.icon || '💗') + '</div>' +
    '<div class="es-stageup-label" style="color:#ffb8d4">' + escHtml(m.label || '') + '</div>' +
    '<div class="es-stageup-desc" style="color:rgba(255,200,220,.9)">' + escHtml(desc) + '</div>' +
    '<button id="es-milestone-go" class="primary" style="background:rgba(255,140,180,.25)">❥ 继续</button>' +
    '</div>';
  document.body.appendChild(overlay);
  var go = document.getElementById('es-milestone-go');
  if (go) go.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
}

/**
 * entSim ui.js — v2 新增弹窗：发布作品 / 粉丝来信 / 品牌代言 / 季度颁奖
 */

// 发布作品面板（6选1）
function showReleasePanel() {
  var E = GS.entSim;
  var isDebutRelease = (E.career && E.career.debutDay > 0);
  if (!isDebutRelease) { showToast('🌱 练习生还不能发布作品哦，出道后再来吧'); return; }
  if (E._releaseCD > 0) { showToast('📀 作品发布冷却中（还需 ' + E._releaseCD + ' 天）'); return; }
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  try { var ReleasePool = RELEASE_POOL; } catch(e) { showToast('数据加载中…'); return; }
  if (!ReleasePool) { showToast('数据加载中…'); return; }
  var pool = ReleasePool;
  var html = '<div style="max-height:65vh;overflow-y:auto"><p style="margin:0 0 12px;color:var(--es-text-dim);text-align:center">选择要发布的作品类型</p>';
  var cats = [
    { cat:'single', icon:'🎵', label:'发行单曲', desc:'在音源平台上线新歌，提升人气和关注度' },
    { cat:'photobook', icon:'📸', label:'写真集', desc:'发布个人写真集，展现不同面貌' },
    { cat:'practice', icon:'🪩', label:'练习室直拍', desc:'公开最新编舞练习室版本' },
    { cat:'vlog', icon:'📹', label:'Vlog', desc:'记录一天的真实日常' },
    { cat:'cover', icon:'🎤', label:'翻唱', desc:'发布一首前辈歌曲的翻唱' },
    { cat:'collab', icon:'🤝', label:'合作曲', desc:'与好友发布合作单曲' }
  ];
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    var item = pool.filter(function(p) { return p.cat === c.cat; });
    var example = item && item.length ? item[Math.floor(Math.random() * item.length)] : null;
    html += '<div class="es-release-card" data-cat="' + c.cat + '" style="padding:10px 14px;margin:8px 0;border:1px solid rgba(255,255,255,.08);border-radius:10px;cursor:pointer;background:rgba(255,255,255,.03);transition:all .2s">' +
      '<span style="font-size:20px;margin-right:8px">' + c.icon + '</span>' +
      '<span style="font-weight:700;color:#d8cdf0">' + c.label + '</span>' +
      '<span style="font-size:11px;color:var(--es-text-dim);display:block;margin-top:2px">' + c.desc + '</span>' +
      (example ? '<span style="font-size:11px;color:rgba(255,200,150,.7)">示例：' + escHtml(example.t) + '</span>' : '') +
      (example ? '<span style="float:right;font-size:11px;color:var(--es-text-dim)">人气+' + (example.pop||0) + ' 曝光+' + (example.exp||0) + '</span>' : '') +
      '</div>';
  }
  html += '</div>';
  var modal = showEntSimModalDirect('📀 发布新作品', html, [
    { id: 'cancel', label: '取消', class: 'ghost' }
  ]);
  document.querySelectorAll('.es-release-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var cat = card.dataset.cat;
      var items = pool.filter(function(p) { return p.cat === cat; });
      if (!items || !items.length) return;
      var picked = items[Math.floor(Math.random() * items.length)];
      // P1 #4: 五档随机排名
      var pop = E.career.popularity || 30;
      var roll = Math.random();
      var rankResult;
      if (roll < 0.08)       rankResult = { tier: '扑街', pop: 1, msg: '音源不入榜，还需更多努力' };
      else if (roll < 0.25)  rankResult = { tier: '平稳', pop: 3, msg: '音源在榜尾，还需更多曝光' };
      else if (roll < 0.65)  rankResult = { tier: '不错', pop: 5, msg: '空降 Bugs 前 50！关注度上升中' };
      else if (roll < 0.88)  rankResult = { tier: '大热', pop: 8, msg: '空降 Melon Top 10！全网热议' };
      else                   rankResult = { tier: '爆火', pop: 12, msg: 'PAK Perfect All Kill！🎉 音源+MV双爆' };
      E._releaseCD = 3;
      addPopularity((picked.pop || 2) + rankResult.pop, '发布作品·' + cat + '·' + rankResult.tier);
      if (picked.exp) addCareerPublicity(picked.exp, '发布作品·' + cat);
      GS._entSimPendingEvent = (GS._entSimPendingEvent ? GS._entSimPendingEvent + '\n' : '') + '【新作品发布】' + picked.t + ' — ' + rankResult.msg;
      saveGame();
      closeModalDirect(modal);
      showToast('📀 ' + picked.t.substring(0, 16) + '… ' + rankResult.msg);
      if (typeof rerender === 'function') rerender();
    });
    card.addEventListener('mouseenter', function() { card.style.background = 'rgba(255,255,255,.07)'; card.style.borderColor = 'rgba(180,150,255,.3)'; });
    card.addEventListener('mouseleave', function() { card.style.background = 'rgba(255,255,255,.03)'; card.style.borderColor = 'rgba(255,255,255,.08)'; });
  });
}

// 粉丝来信弹窗
function showFanLetterPopup(letter) {
  if (!letter) return;
  var catLabel = letter.cat === 'support' ? '💜 支持信' : letter.cat === 'comeback' ? '📢 催回归' : letter.cat === 'confession' ? '💌 告白信' : '😅 吐槽';
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card" style="max-width:420px;border-color:rgba(180,160,220,.3);background:linear-gradient(160deg,#2a2535,#1a1525)">' +
    '<div style="font-size:28px;margin-bottom:6px">💌</div>' +
    '<div style="font-size:15px;font-weight:700;color:#c8b8f0;margin-bottom:4px">粉丝来信</div>' +
    '<div style="display:inline-block;padding:2px 10px;border-radius:12px;background:rgba(255,255,255,.06);font-size:11px;color:var(--es-text-dim);margin-bottom:12px">' + catLabel + '</div>' +
    '<div style="text-align:left;padding:14px 16px;background:rgba(255,255,255,.04);border-radius:8px;font-size:13px;line-height:1.8;color:rgba(220,210,255,.85);max-height:200px;overflow-y:auto">' + escHtml(letter.t) + '</div>' +
    '<button id="es-fanletter-close" class="primary" style="margin-top:12px;background:rgba(124,111,240,.2)">关闭</button>' +
    '</div>';
  document.body.appendChild(overlay);
  var btn = document.getElementById('es-fanletter-close');
  if (btn) btn.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 15000);
}

// 品牌代言弹窗（3选项：接受/拒绝/讨价还价）
function showBrandOfferPopup(offer) {
  if (!offer) return;
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card" style="max-width:420px;border-color:rgba(220,180,140,.3);background:linear-gradient(160deg,#2a2525,#1a1515)">' +
    '<div style="font-size:28px;margin-bottom:6px">📺</div>' +
    '<div style="font-size:15px;font-weight:700;color:#e8d0a0;margin-bottom:4px">品牌代言邀约</div>' +
    '<div style="font-size:13px;color:rgba(220,200,180,.9);margin-bottom:12px">' + escHtml(offer.brand || '') + ' · ' + escHtml(offer.product || '') + '<br><small>地点：' + escHtml(offer.loc || '摄影棚') + '</small></div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' +
    '<button class="es-brand-accept primary" style="background:rgba(80,200,120,.2)">✅ 接受（+人气' + (offer.pop||0) + ' +曝光' + (offer.exp||0) + '）</button>' +
    '<button class="es-brand-reject ghost" style="border:1px solid rgba(255,255,255,.1)">❌ 拒绝</button>' +
    '<button class="es-brand-close ghost" style="border:1px solid rgba(255,255,255,.06);font-size:11px">关闭</button>' +
    '<button class="es-brand-negotiate ghost" style="border:1px solid rgba(255,255,255,.1);font-size:11px">💰 讨价还价（+人气' + ((offer.pop||0)+2) + ' +曝光' + ((offer.exp||0)+2) + ' 但有50%概率得罪品牌方）</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('.es-brand-accept').addEventListener('click', function() {
    var E = GS.entSim;
    addPopularity(offer.pop || 4, '品牌代言·' + offer.brand);
    addCareerPublicity(offer.exp || 0, '品牌代言·' + offer.brand);
    showToast('📺 接受了' + offer.brand + '的代言邀约！人气+' + (offer.pop||0));
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (typeof rerender === 'function') rerender();
  });
  overlay.querySelector('.es-brand-reject').addEventListener('click', function() {
    showToast('拒绝了代言邀约');
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
  overlay.querySelector('.es-brand-close').addEventListener('click', function() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
  overlay.querySelector('.es-brand-negotiate').addEventListener('click', function() {
    if (Math.random() < 0.5) {
      var E = GS.entSim;
      addPopularity((offer.pop||0) + 2, '品牌代言讨价成功·' + offer.brand);
      addCareerPublicity((offer.exp||0) + 2, '品牌代言讨价成功·' + offer.brand);
      showToast('💰 讨价成功！代言费翻倍');
    } else {
      showToast('💀 品牌方觉得你要求太多，撤回了邀约…');
    }
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (typeof rerender === 'function') rerender();
  });
}

// 季度颁奖弹窗
function showAwardPopup(award) {
  if (!award) return;
  var awardIcon = award.type === 'newcomer' ? '🏆' : award.type === 'popularity' ? '💖' : '🎭';
  var E = GS.entSim;
  var popGain = (E && E.career && E.career.popularity >= 35) ? (award.pop || 5) + Math.floor(Math.random() * 5) : 0;
  addPopularity(popGain, '季度颁奖·' + (award.type || '奖项'));
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card" style="max-width:420px;border-color:rgba(255,215,0,.4);background:linear-gradient(160deg,#302520,#1a1510)">' +
    '<div style="font-size:42px;margin-bottom:8px">' + awardIcon + '</div>' +
    '<div style="font-size:16px;font-weight:700;color:#ffd700;margin-bottom:8px">季度颁奖</div>' +
    '<div style="font-size:13px;color:rgba(240,220,180,.9);line-height:1.8;margin-bottom:12px">' + escHtml(award.t) + '</div>' +
    (popGain > 0 ? '<div style="font-size:13px;color:#52c41a">人气 +' + popGain + '</div>' : '') +
    '<button id="es-award-close" class="primary" style="margin-top:12px;background:rgba(200,150,50,.2)">继续</button>' +
    '</div>';
  document.body.appendChild(overlay);
  var btn = document.getElementById('es-award-close');
  if (btn) btn.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); if (typeof rerender === 'function') rerender(); });
}

// 聊天频道切换
window.switchChatChannel = function(ch) {
  GS._entSimChatChannel = ch;
  renderEntSimGameScreen();
};

// 快捷回复（男主频道pool回复）
window.sendQuickChat = function(msg) {
  var E = GS.entSim;
  if (!GS._entSimChatHistory) GS._entSimChatHistory = {};
  if (!GS._entSimChatHistory.maleLead) GS._entSimChatHistory.maleLead = [];
  GS._entSimChatHistory.maleLead.push({ role: 'user', content: msg });
  
  // 从池子匹配回复（纯聊天，不加好感度）
  var reply = findChatPoolReply(msg);
  if (reply) {
    GS._entSimChatHistory.maleLead.push({ role: 'ai', content: reply.r[Math.floor(Math.random() * reply.r.length)] });
  }
  renderEntSimGameScreen();
};

function findChatPoolReply(msg) {
  if (!CHAT_MALE_LEAD) return null;
  for (var key in CHAT_MALE_LEAD) {
    var pool = CHAT_MALE_LEAD[key];
    if (pool) {
      for (var i = 0; i < pool.length; i++) {
        if (pool[i].q === msg) return pool[i];
      }
    }
  }
  return null;
}

// 频道初始化（首次切换只推1-2条对方初始消息）
window.initChatChannel = function(ch) {
  if (!GS._entSimChatHistory) GS._entSimChatHistory = {};
  if (GS._entSimChatHistory[ch] && GS._entSimChatHistory[ch].length) return;
  if (!GS._entSimChatSentIdx) GS._entSimChatSentIdx = {};
  if (ch === 'sasaeng') return; // 私生只读
  var E = GS.entSim;
  var isTrainee = E.career && E.career.profession === '练习生';
  // 练习生期：男主频道不预填对话历史（保留空数组+sentIdx=0，快捷回复按钮仍可用）
  if (ch === 'maleLead' && isTrainee) {
    GS._entSimChatHistory[ch] = [];
    GS._entSimChatSentIdx[ch] = 0;
    return;
  }
  // 练习生期：经纪人频道不预填（未签经纪人）
  if (ch === 'manager' && isTrainee) return;
  // 团群聊仅女团编制时预填（练习生无团不推）
  if (ch === 'group' && !(E.heroineGroup && E.heroineGroup.length > 0)) return;
  var pool = getChatPoolByChannel(ch);
  if (pool && pool.length) {
    var initEntries = [];
    // 哥哥/情敌：只取对方发的（from ≠ 'you'）
    if (ch === 'brother' || ch === 'rival') {
      for (var j = 0; j < pool.length && initEntries.length < 1; j++) {
        if (pool[j] && pool[j].from !== 'you') initEntries.push(pool[j]);
      }
    } else {
      initEntries = pool.slice(0, Math.min(2, pool.length));
    }
    GS._entSimChatHistory[ch] = initEntries.map(function(m) {
      var isFromPlayer = m.from === 'you';
      // 男主池子格式 {q, r:[...], aff}：取第一个回复数组的随机项
      var content = resolveChatTemplates(m.msg || m.t || (Array.isArray(m.r) && m.r.length ? m.r[Math.floor(Math.random() * m.r.length)] : '...'));
      return { role: isFromPlayer ? 'user' : 'ai', content: content };
    });
    GS._entSimChatSentIdx[ch] = initEntries.length;
    // 哥哥/情敌：设置初始预设回复（renderPhoneChatMsgs 依赖 _entSimPendingChat 渲染快捷按钮）
    if (ch === 'brother' || ch === 'rival') {
      if (!GS._entSimPendingChat) GS._entSimPendingChat = {};
      if (!GS._entSimPendingChat[ch]) {
        var npcEntry = initEntries.find(function(m) { return m.from !== 'you'; });
        if (npcEntry) {
          var _r = null, _rs = null;
          if (npcEntry.replies && npcEntry.replies.length) { _r = npcEntry.replies; _rs = npcEntry.responses || null; }
          else if (npcEntry.reply) { _r = [npcEntry.reply]; }
          GS._entSimPendingChat[ch] = { replies: _r, responses: _rs, entryIdx: 0 };
        }
      }
    }
  }
};

// 根据频道取对应池子（按当前状态，阶段过滤）
function getChatPoolByChannel(ch) {
  var E = GS.entSim;
  var isD = E.career && E.career.debutDay > 0;
  if (ch === 'maleLead') return flattenMaleLeadPool(isD);
  if (ch === 'brother') return filterChatPool(CHAT_BROTHER, isD);
  if (ch === 'rival') return filterChatPool(CHAT_RIVAL, isD);
  if (ch === 'manager') return filterChatPool(CHAT_MANAGER, isD);
  if (ch === 'group') {
    var gPool = null;
    if (E._justGotFirstWin) gPool = (GROUP_CHAT && GROUP_CHAT.first_win) || [];
    else if (E._scandalActive) gPool = (GROUP_CHAT && GROUP_CHAT.scandal) || [];
    else if (E._negativeNewsActive) gPool = (GROUP_CHAT && GROUP_CHAT.negative_news) || [];
    else if (E._comebackActive) gPool = (GROUP_CHAT && GROUP_CHAT.comeback) || [];
    else gPool = (GROUP_CHAT && GROUP_CHAT.daily) || [];
    return filterChatPool(gPool, isD);
  }
  return null;
}

// 阶段+好感过滤
function requireMatch(e, isDebut) {
  if (!e || !e.require) return true;
  var req = e.require;
  // 出道检查
  if (!isDebut && req.indexOf('debut') >= 0) return false;
  // 好感检查
  var affMatch = req.match(/aff>=(\d+)/);
  if (affMatch) {
    var aff = (GS.entSim && GS.entSim.affection) || 0;
    if (aff < parseInt(affMatch[1], 10)) return false;
  }
  // 章节检查
  var chMatch = req.match(/chapter>=(\d+)/);
  if (chMatch) {
    var ch = GS.entSim && GS.entSim.chapter ? GS.entSim.chapter.index : 1;
    if (ch < parseInt(chMatch[1], 10)) return false;
  }
  return true;
}

// 阶段+好感过滤
function filterChatPool(pool, isDebut) {
  if (!pool) return [];
  return pool.filter(function(e) { return requireMatch(e, isDebut); });
}

// 男主池子扁平化 + 子池级别+条目级别双重过滤
function flattenMaleLeadPool(isDebut) {
  if (!CHAT_MALE_LEAD) return [];
  // 子池级别默认门控（无 require 的条目自动继承）
  var subPoolGates = {
    trainee: null,           // 仅练习生期（出道后被过滤）
    greet: null,             // 全阶段
    stage: 'debut',          // 出道后
    worry: 'debut',          // 出道后
    romantic: 'debut&&aff>=40',
    jealous: 'debut&&aff>=30',
    night: 'debut&&aff>=30',
    secret: 'debut&&aff>=60'
  };
  var all = [];
  for (var key in CHAT_MALE_LEAD) {
    var sub = CHAT_MALE_LEAD[key];
    if (!sub) continue;
    // 子池级别过滤
    var gate = subPoolGates[key];
    if (gate !== undefined) {
      if (key === 'trainee' && isDebut) continue; // 出道后不需要练习生池
      if (gate && !requireMatch({require:gate}, isDebut)) continue;
    }
    for (var i = 0; i < sub.length; i++) {
      var e = sub[i];
      if (!e) continue;
      // 条目级别补充过滤（叠加在子池门控之上）
      if (!requireMatch(e, isDebut)) continue;
      all.push(e);
    }
  }
  return all;
}

// 每日自动推进聊天消息（每个频道推0-1条，按场景）——由 goEntSimNextDay 调用
window.pushDailyChats = function() {
  if (!GS._entSimChatHistory) GS._entSimChatHistory = {};
  if (!GS._entSimChatSentIdx) GS._entSimChatSentIdx = {};
  var E = GS.entSim;
  var isDebut = E.career && E.career.debutDay > 0;
  var today = E.cycle._gameDayCount || 1;
  // 经纪人/团群/私生仅出道后推送，哥哥/情敌全程可聊（练习生期过滤出道关键词）
  if (!isDebut) {
    pushPairedChat('brother', filterChatPool(CHAT_BROTHER, false), today % 2 === 0);
    pushPairedChat('rival', filterChatPool(CHAT_RIVAL, false), today % 3 === 0);
    return;
  }
  // 哥哥频道：每2天推1条（配对推送）
  pushPairedChat('brother', filterChatPool(CHAT_BROTHER, isDebut), today % 2 === 0);
  // 情敌频道：每3天推1条（配对推送）
  pushPairedChat('rival', filterChatPool(CHAT_RIVAL, isDebut), today % 3 === 0);
  // 男主频道：每1-2天推1条（不配对——打开聊天后从 flattenMaleLeadPool 随机取预设）
  tryPushMLDailyStarter(isDebut, today);
  // 经纪人频道：每4天推1条
  tryPushOneChat('manager', CHAT_MANAGER, today % 4 === 0);
  // 团群聊：每2天推1条
  var groupPool = getChatPoolByChannel('group');
  tryPushOneChat('group', groupPool, today % 2 === 0);
  // 私生：每7天低概率推1条
  if (today % 7 === 0 && Math.random() < 0.3 && CHAT_SASAENG && CHAT_SASAENG.length) {
    if (!GS._entSimChatHistory.sasaeng) GS._entSimChatHistory.sasaeng = [];
    if (!GS._entSimChatSentIdx.sasaeng) GS._entSimChatSentIdx.sasaeng = 0;
    var idx = GS._entSimChatSentIdx.sasaeng % CHAT_SASAENG.length;
    var m = CHAT_SASAENG[idx];
    GS._entSimChatHistory.sasaeng.push({ role: 'ai', content: resolveChatTemplates(m.msg || m.t || '...') });
    GS._entSimChatSentIdx.sasaeng = idx + 1;
  }
  saveGame();
};

function tryPushOneChat(ch, pool, condition) {
  if (!condition || !pool || !pool.length) return;
  if (!GS._entSimChatHistory[ch]) GS._entSimChatHistory[ch] = [];
  if (!GS._entSimChatSentIdx) GS._entSimChatSentIdx = {};
  if (typeof GS._entSimChatSentIdx[ch] !== 'number') GS._entSimChatSentIdx[ch] = 0;
  var idx = GS._entSimChatSentIdx[ch] % pool.length;
  var m = pool[idx];
  if (m) {
    var isFromPlayer = m.from === 'you';
    GS._entSimChatHistory[ch].push({ role: isFromPlayer ? 'user' : 'ai', content: resolveChatTemplates(m.msg || m.t || '...') });
    GS._entSimChatSentIdx[ch] = idx + 1;
  }
}

// 男主每日主动推送：过滤章节，每1-3天推1条，存 replies/responses 到 pendingChat
function tryPushMLDailyStarter(isDebut, today) {
  if (!CHAT_ML_DAILY_STARTERS || !CHAT_ML_DAILY_STARTERS.length) return;
  // 练习生期每天推，出道后每1-3天推（比哥哥少）
  if (isDebut && today % 3 !== 0 && today % 2 !== 0) return;
  var pool = filterChatPool(CHAT_ML_DAILY_STARTERS, isDebut);
  if (!pool.length) return;
  if (!GS._entSimChatHistory) GS._entSimChatHistory = {};
  if (!GS._entSimChatHistory.maleLead) GS._entSimChatHistory.maleLead = [];
  if (!GS._entSimChatSentIdx) GS._entSimChatSentIdx = {};
  if (typeof GS._entSimChatSentIdx.maleLead !== 'number') GS._entSimChatSentIdx.maleLead = 0;
  if (!GS._entSimPendingChat) GS._entSimPendingChat = {};
  // 已有未回复的 pending，不推新消息
  if (GS._entSimPendingChat.maleLead) return;
  var idx = GS._entSimChatSentIdx.maleLead % pool.length;
  var m = pool[idx];
  if (m && m.msg) {
    GS._entSimChatHistory.maleLead.push({ role: 'ai', content: resolveChatTemplates(m.msg) });
    GS._entSimChatSentIdx.maleLead = idx + 1;
    // 存储 pending：replies(预设回复按钮) + responses(对应回复)
    var _replies = null;
    var _responses = null;
    if (m.replies && m.replies.length) {
      _replies = m.replies;
      _responses = m.responses || null;
    }
    GS._entSimPendingChat.maleLead = {
      replies: _replies,
      responses: _responses,
      entryIdx: idx
    };
  }
}

// 配对池推送（哥哥/情敌）：只推 from≠'you' 的条目，记录 pending 供预设匹配
function pushPairedChat(ch, pool, condition) {
  if (!condition || !pool || !pool.length) return;
  if (!GS._entSimChatHistory[ch]) GS._entSimChatHistory[ch] = [];
  if (!GS._entSimChatSentIdx) GS._entSimChatSentIdx = {};
  if (!GS._entSimPendingChat) GS._entSimPendingChat = {};
  // 已有未回复的 pending，不推新消息
  if (GS._entSimPendingChat[ch]) return;
  // 只取对方发的条目（from≠'you'）
  var oppEntries = [];
  for (var i = 0; i < pool.length; i++) {
    if (pool[i] && pool[i].from !== 'you') oppEntries.push(pool[i]);
  }
  if (!oppEntries.length) return;
  if (typeof GS._entSimChatSentIdx[ch] !== 'number') GS._entSimChatSentIdx[ch] = 0;
  var idx = GS._entSimChatSentIdx[ch] % oppEntries.length;
  var entry = oppEntries[idx];
  GS._entSimChatHistory[ch].push({ role: 'ai', content: resolveChatTemplates(entry.msg) });
  GS._entSimChatSentIdx[ch] = idx + 1;
  // 存储 pending：replies(预设回复按钮) + responses(对应回复)
  // 新格式 {replies:[...], responses:[...]}；旧格式 {reply} 兼容为单条
  var _replies = null;
  var _responses = null;
  if (entry.replies && entry.replies.length) {
    _replies = entry.replies;
    _responses = entry.responses || null;
  } else if (entry.reply) {
    _replies = [entry.reply];
    _responses = null;
  }
  GS._entSimPendingChat[ch] = {
    replies: _replies,
    responses: _responses,
    entryIdx: idx
  };
}

function checkAndShowPendingPopups() {
  var queue = GS._entSimPopupQueue;
  if (!queue || !queue.length) return;
  var item = queue[0];
  if (!item) { queue.shift(); return; }
  
  var showNext = function() {
    queue.shift();
    setTimeout(function() { checkAndShowPendingPopups(); }, 200);
  };
  
  var today = (GS.entSim && GS.entSim.cycle) ? (GS.entSim.cycle._gameDayCount || 1) : 1;
  
  switch (item.type) {
    case 'fanLetter': showFanLetterPopup(item.data); if (!GS._entSimLetterHistory) GS._entSimLetterHistory = []; GS._entSimLetterHistory.push({ day: today, data: item.data }); break;
    case 'brandOffer': scheduleEvent('brand', item.data); break;
    case 'award': showAwardPopup(item.data); if (!GS._entSimAwardHistory) GS._entSimAwardHistory = []; GS._entSimAwardHistory.push({ day: today, data: item.data }); break;
    case 'variety': scheduleEvent('variety', item.data); break;
    case 'dispatch': showDispatchPopup(item.data); injectFanReactions(item.data); break;
    case 'magazine': scheduleEvent('magazine', item.data); break;
    case 'rumor': showRumorPopup(item.data); injectFanReactions(item.data); break;
    case 'maleContact': showMaleContactPopup(item.data, item.label); break;
    case 'jobOffer': showGenericEventPopup('📋 通告邀约', item.data); injectFanReactions(item.data); break;
    case 'fansign': showGenericEventPopup('💜 粉丝签售会', item.data); injectFanReactions(item.data); break;
    case 'concert': showGenericEventPopup('🎪 演唱会后记', item.data); injectFanReactions(item.data); break;
    case 'comeback': showGenericEventPopup('🎵 回归周期', item.data); injectFanReactions(item.data); break;
    case 'musicShow': showGenericEventPopup('🎬 打歌节目', item.data); injectFanReactions(item.data); break;
    case 'setback': showGenericEventPopup('⚠️ 事业波折', item.data); injectFanReactions(item.data); break;
    case 'dailyEngage': showGenericEventPopup('📱 今日营业', item.data); injectFanReactions(item.data); generateFanReaction(item.data.t || '今日营业', '').catch(function(){}); break;
    default: break;
  }
  showNext();
}

function showVarietyPopupFromItem(item) {
  if (!item) return;
  var overlay = document.createElement("div");
  overlay.className = "es-stageup-overlay";
  var html = '<div class="es-stageup-card" style="max-width:420px"><div class="es-stageup-icon">🎬</div><div class="es-stageup-label">' + escHtml(item.show || '综艺通告') + '</div>';
  html += '<div class="es-stageup-desc">' + escHtml(item.t) + '</div>';
  if (item.fanReactions) html += '<p style="font-size:11px;color:rgba(255,255,255,.35);margin-top:8px">💬 ' + escHtml(item.fanReactions.slice(0,3).join(' · ')) + '</p>';
  html += '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove();">关闭</button></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  if (item.pop) { GS.entSim.career.popularity = Math.max(0, Math.min(100, (GS.entSim.career.popularity || 0) + (item.pop || 0))); saveGame(); }
  
}

function showDispatchPopup(item) {
  if (!item) return;
  var overlay = document.createElement("div");
  overlay.className = "es-stageup-overlay";
  var html = '<div class="es-stageup-overlay" style="max-width:420px;border-color:rgba(255,80,80,.3)"><div class="es-stageup-label">📰 Dispatch爆料</div>';
  html += '<div class="es-stageup-desc">' + escHtml(item.t) + '</div>';
  if (item.fanReactions) html += '<p style="font-size:11px;color:rgba(255,255,255,.35);margin-top:8px">💬 ' + escHtml(item.fanReactions.slice(0,3).join(' · ')) + '</p>';
  html += '<div style="margin-top:12px">';
  html += '<button class="es-pop-btn" onclick="window.closeEntSimModal()" style="background:#a44">否认</button> ';
  html += '<button class="es-pop-btn" onclick="window.closeEntSimModal()">沉默</button>';
  html += '</div></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  window.closeEntSimModal = function() { closeModalDirect(overlay); };
}

function showRumorPopup(item) {
  if (!item) return;
  var overlay = document.createElement("div");
  overlay.className = "es-stageup-overlay";
  var html = '<div class="es-stageup-overlay" style="max-width:420px;border-color:rgba(255,120,200,.3)"><div class="es-stageup-label">💕 绯闻传闻</div>';
  html += '<div class="es-stageup-desc">' + escHtml(item.t) + '</div>';
  if (item.fanReactions) html += '<p style="font-size:11px;color:rgba(255,255,255,.35);margin-top:8px">💬 ' + escHtml(item.fanReactions.slice(0,3).join(' · ')) + '</p>';
  html += '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove();">关闭</button></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  window.closeEntSimModal = function() { closeModalDirect(overlay); };
}

function showMaleContactPopup(item, label) {
  if (!item) return;
  var overlay = document.createElement("div");
  overlay.className = "es-stageup-overlay";
  var html = '<div class="es-stageup-overlay" style="max-width:400px;border-color:rgba(180,140,255,.3)"><div class="es-stageup-label">' + (label || '📞联络') + '</div>';
  html += '<div class="es-stageup-desc">' + escHtml(item.t) + '</div>';
  if (item.options && item.options.length) {
    html += '<div style="margin-top:12px">';
    for (var i = 0; i < item.options.length; i++) {
      var o = item.options[i];
      html += '<button class="es-pop-btn" onclick="window.pickContactOption(' + o.aff + ',' + o.jealous + ')" style="margin:3px">' + escHtml(o.t) + '</button> ';
    }
    html += '</div>';
  }
  html += '<button class="es-pop-btn" onclick="window.closeEntSimModal()" style="margin-top:10px">好的</button></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  window.pickContactOption = function(affD, jealousD) {
    if (affD) applyEntSimAffection(affD);
    if (jealousD) { GS.entSim._jealousLevel = Math.min(10, Math.max(0, (GS.entSim._jealousLevel || 0) + jealousD)); }
    saveGame();
    closeModalDirect(overlay);
  };
  window.closeEntSimModal = function() { closeModalDirect(overlay); };
}

// 简易弹窗（直接返回容器元素）
function showEntSimModalDirect(title, body, buttons) {
  if (typeof showEntSimModal === 'undefined') return null;
  // 复用现有 showEntSimModal 逻辑：注入临时弹窗然后返回 overlay 以便操作
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.style.zIndex = '9999';
  var btnsHtml = (buttons || []).map(function(b) {
    return '<button id="es-mdl-' + b.id + '" class="' + (b.class || 'primary') + '" style="margin:0 6px">' + escHtml(b.label) + '</button>';
  }).join('');
  overlay.innerHTML = '<div class="es-stageup-card" style="max-width:480px;text-align:center">' +
    '<div style="font-size:16px;font-weight:700;color:#d0c8f0;margin-bottom:12px">' + escHtml(title) + '</div>' +
    body +
    '<div style="margin-top:12px">' + btnsHtml + '</div></div>';
  document.body.appendChild(overlay);
  buttons.forEach(function(b) {
    var btn = document.getElementById('es-mdl-' + b.id);
    if (btn) btn.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  });
  return overlay;
}

function showLetterHistory() {
  var overlay = document.createElement("div");
  overlay.className = "es-stageup-overlay";
  var html = '<div class="es-stageup-card" style="max-width:420px"><div class="es-stageup-label">📬 粉丝信箱</div>';
  var hist = GS._entSimLetterHistory || [];
  if (hist.length) {
    for (var i = hist.length - 1; i >= 0; i--) {
      var h = hist[i];
      var txt = (h.data && h.data.t) ? h.data.t : (typeof h.data === 'string' ? h.data : '');
      html += '<div style="padding:8px;margin:4px 0;background:rgba(255,255,255,.04);border-radius:6px;font-size:13px;color:#ccc">' +
        '<span style="color:#666">第' + (h.day||'?') + '天</span> ' + escHtml(txt) + '</div>';
    }
  } else {
    html += '<p style="opacity:.5">暂无来信记录。出道后每天会收到粉丝来信。</p>';
  }
  html += '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove();">关闭</button></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  GS._entSimPopupQueue = (GS._entSimPopupQueue || []).filter(function(p) { return p.type !== 'fanLetter'; });
  
}

function showBrandHistory() {
  var overlay = document.createElement("div");
  overlay.className = "es-stageup-overlay";
  var html = '<div class="es-stageup-card" style="max-width:420px"><div class="es-stageup-icon">💼</div><div class="es-stageup-label">代言邀约</div>';
  var queue = GS._entSimPopupQueue || [];
  var found = false;
  for (var i = 0; i < queue.length; i++) {
    if (queue[i].type === 'brandOffer' && queue[i].data) {
      found = true;
      var d = queue[i].data;
      html += '<div style="padding:8px;margin:6px 0;background:rgba(255,255,255,.05);border-radius:6px">';
      html += '<b>' + escHtml(d.brand || '品牌') + '</b> · ' + escHtml(d.product || '') + '<br>';
      html += '<span style="font-size:12px;opacity:.6">📍 ' + escHtml(d.loc || '') + ' | 人气+' + (d.pop || 0) + ' 曝光+' + (d.exp || 0) + '</span>';
      if (d.fanReactions) html += '<br><span style="font-size:11px;color:rgba(255,255,255,.35)">💬 ' + escHtml(d.fanReactions.slice(0,3).join(' · ')) + '</span>';
      html += '<div style="margin-top:4px"><button class="es-pop-btn" onclick="window.acceptBrand(' + i + ')" style="background:#4a9">✅ 接受</button> <button class="es-pop-btn" onclick="window.rejectBrand(' + i + ')" style="background:#a44">❌ 拒绝</button></div>';
      html += '</div>';
    }
  }
  if (!found) html += '<p style="opacity:.5">暂无代言邀约。人气≥20后每2天可能收到品牌邀约。</p>';
  html += '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove();">关闭</button></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  window.acceptBrand = function(idx) {
    var q = GS._entSimPopupQueue || [];
    if (q[idx] && q[idx].data) {
      GS.entSim.career.popularity = Math.max(0, Math.min(100, (GS.entSim.career.popularity || 0) + (q[idx].data.pop || 0)));
      addCareerPublicity(q[idx].data.exp || 0, '代言签约·' + (q[idx].data.brand || ''));
      saveGame();
      showToast('✅ 代言签约！人气+' + (q[idx].data.pop || 0));
    }
    q.splice(idx, 1);
    closeModalDirect(overlay);
  };
  window.rejectBrand = function(idx) { showToast('已拒绝该代言'); closeModalDirect(overlay); };
  window.closeEntSimModal = function() { closeModalDirect(overlay); };
}

function showAwardHistory() {
  var overlay = document.createElement("div");
  overlay.className = "es-stageup-overlay";
  var html = '<div class="es-stageup-card" style="max-width:400px"><div class="es-stageup-icon">🏆</div><div class="es-stageup-label">颁奖记录</div>';
  var hist = GS._entSimAwardHistory || [];
  if (hist.length) {
    for (var i = hist.length - 1; i >= 0; i--) {
      var h = hist[i];
      var d = h.data;
      html += '<div style="padding:8px;margin:6px 0;background:rgba(255,255,255,.05);border-radius:6px">';
      html += '<span style="color:#666">第' + (h.day||'?') + '天</span> <b>' + escHtml(d.t || '') + '</b>';
      html += '<br><span style="font-size:12px;opacity:.6">人气+' + (d.pop || 0) + '</span>';
      html += '</div>';
    }
  } else {
    html += '<p style="opacity:.5">暂无颁奖记录。每4天可能触发季度颁奖。</p>';
  }
  html += '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove();">关闭</button></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  window.closeEntSimModal = function() { closeModalDirect(overlay); };
}

// 统一日程事件调度（代言/综艺/画报/CD），passedItem 来自弹窗队列推送
function scheduleEvent(type, passedItem) {
  var E = GS.entSim;
  var pool, label, icon, textFn, locFn;
  if (type === 'variety') { pool = VARIETY_SHOW_POOL; label = '综艺通告'; icon = '🎬'; textFn = function(d) { return '录制' + (d.show || '综艺'); }; locFn = function(d) { return '电视台/摄影棚'; }; }
  else if (type === 'magazine') { pool = MAGAZINE_POOL; label = '画报邀约'; icon = '📸'; textFn = function(d) { return '拍摄' + (d.mag || '画报'); }; locFn = function(d) { return '摄影棚'; }; }
  else if (type === 'brand') { pool = BRAND_OFFER_POOL; label = '代言邀约'; icon = '💼'; textFn = function(d) { return '代言拍摄：' + (d.brand || '品牌'); }; locFn = function(d) { return '摄影棚'; }; }
  else if (type === 'release') { pool = RELEASE_POOL; label = '作品发布'; icon = '📀'; textFn = function(d) { return '发布' + (d.t || '作品'); }; locFn = function(d) { return '工作室/公司'; }; }
  else return;
  // 优先使用 passedItem（弹窗推送）或 pending（上次关闭暂存的）
  var pendingOffers = (typeof GS !== 'undefined' && GS._entSimPendingOffers) || {};
  var pending = pendingOffers[type];
  var item, t, l;
  if (passedItem) {
    // 弹窗队列推送：使用传来的数据
    item = passedItem; t = textFn(item); l = locFn(item);
  } else if (pending && pending.day === (E.cycle._gameDayCount || 1)) {
    // 待处理邀约（上次点了关闭）
    item = pending.item; t = pending.t; l = pending.l;
  } else {
    // 品牌/综艺/画报：不再随机抽→提示没有
    if (type === 'release') {
      if (!pool || !pool.length) { showToast('暂无发布内容'); return; }
      item = pool[Math.floor(Math.random() * pool.length)];
      if (Array.isArray(item)) item = item[Math.floor(Math.random() * item.length)];
    }
    if (!item) { showToast('暂无' + label + '邀约，只能等经纪人联系'); return; }
    t = textFn(item);
    l = locFn(item);
  }
  var detail = (item.show || item.brand || item.mag || item.t || '') + ' · 人气+' + (item.pop || 2) + (item.exp ? ' 曝光+' + item.exp : '');
  // 确认弹窗
  showEntSimModal(icon + ' ' + label, '<p style="text-align:center;padding:8px 0">' + escHtml(detail) + '<br><small style="color:var(--text-muted)">接受后将排入明日日程，AI自动生成工作剧情并结算奖励</small></p>', [
    { id: 'dismiss', label: '关闭' },
    { id: 'cancel', label: '拒绝' },
    { id: 'confirm', label: '接受', primary: true }
  ]).then(function(r) {
    if (r === 'dismiss') {
      // 关闭不消费——存入待处理，当天可再点
      if (!GS._entSimPendingOffers) GS._entSimPendingOffers = {};
      GS._entSimPendingOffers[type] = { type: type, item: item, t: t, l: l, day: E.cycle._gameDayCount || 1 };
      showToast('已暂存，可随时再点');
      rerender(); // v4: dismiss分支补render刷新按钮状态
      return;
    }
    if (r !== 'confirm') return;
    // 接受后清除待处理
    if (GS._entSimPendingOffers) delete GS._entSimPendingOffers[type];
    E._scheduledEvents = E._scheduledEvents || [];
    var targetDay = E.cycle.dayCount + 1;
    E._scheduledEvents.push({ id: type + '_' + targetDay + '_' + randInt(1000, 9999), type: type, data: item, targetDay: targetDay, text: t, loc: l, done: false });
    if (!E.careerHistory) E.careerHistory = [];
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: type, text: '接受' + label + '：' + (item.show || item.brand || item.mag || item.t || '') });
    showToast(icon + ' ' + label + '已排入明天日程！');
    saveGame();
    rerender();
  });
}

function showVarietyPopup() { scheduleEvent('variety'); }
function showMagazinePopup() { scheduleEvent('magazine'); }
function showBrandSchedule() { scheduleEvent('brand'); }
function showReleaseSchedule() { scheduleEvent('release'); }

// 通用事件弹窗（签售/演唱会/回归/打歌/挫折）
function showGenericEventPopup(title, data) {
  if (!data) return;
  var text = (data.t || data.text || '').slice(0, 180);
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card" style="max-width:420px;border-color:rgba(180,160,220,.3)">' +
    '<div class="es-stageup-icon">🎬</div>' +
    '<div class="es-stageup-label">' + escHtml(title) + '</div>' +
    '<div class="es-stageup-desc">' + escHtml(text) + '</div>' +
    (data.fanReactions ? '<p style="font-size:11px;color:rgba(255,255,255,.35);margin:0 0 12px">💬 ' + escHtml(data.fanReactions.join(' · ')) + '</p>' : '') +
    '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove();">关闭</button>' +
  '</div>';
  document.body.appendChild(overlay);
  if (typeof data.pop === 'number') { GS.entSim.career.popularity = Math.max(0, Math.min(100, (GS.entSim.career.popularity || 0) + data.pop)); saveGame(); }
}

// 从事件条目fanReactions抽取3条，带标题存储供星圈帖子渲染
function injectFanReactions(item) {
  if (!item || !item.fanReactions || !item.fanReactions.length) return;
  var reactions = item.fanReactions.slice(0, 3);
  // v4: 智能截断——在30字内找最近的标点/空格断开，避免硬截半句
  var rawTag = item.t || item.text || item.reason || item.cat || '今日热议';
  var tag = smartTruncate(rawTag, 30);
  if (!GS._entSimFanEvents) GS._entSimFanEvents = [];
  GS._entSimFanEvents.push({ title: tag || '今日热议', texts: reactions, day: (GS.entSim.cycle._gameDayCount || 1) });
  // 只保留最近10条，且按day倒序排列
  if (GS._entSimFanEvents.length > 10) GS._entSimFanEvents.splice(0, GS._entSimFanEvents.length - 10);
  GS._entSimFanEvents.sort(function(a, b) { return (b.day || 0) - (a.day || 0); });
}

// v4: 智能截断函数，在极限字数内找最近标点断开
function smartTruncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  var truncated = str.slice(0, maxLen + 5); // 多取5字符找断开点
  // 从末尾向前找最近的标点/空格
  for (var i = maxLen; i >= maxLen - 10; i--) {
    if (i <= 0) break;
    var ch = truncated[i];
    if (ch === '，' || ch === '。' || ch === '、' || ch === ' ' || ch === '！' || ch === '？' || ch === '；' || ch === ',') {
      return truncated.slice(0, i) + '…';
    }
  }
  return str.slice(0, maxLen) + '…';
}

function createOverlay() {
  var d = document.createElement("div");
  d.className = "es-stageup-overlay";
  return d;
}

// P1 #22: 存档槽弹窗（es-stageup-card 风格）
function showSaveSlotsModal() {
  var E = GS.entSim;
  var slots = listSaves();
  var body = '';
  for (var i = 0; i < 3; i++) {
    var s = slots[i];
    if (s) {
      body += '<div style="padding:10px;background:rgba(255,255,255,.05);border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">' +
        '<div><b>📁 槽位' + (i+1) + '</b><br><span style="font-size:10px;color:rgba(255,255,255,.5)">Day ' + (s.day||'?') + ' · ❤' + (s.aff||0) + ' · ' + escHtml(s.member||'?') + '</span></div>' +
        '<div style="display:flex;gap:6px"><button class="es-chip" style="cursor:pointer" onclick="window._saveGameSlot(' + i + ')">💾 存</button><button class="es-chip" style="cursor:pointer" onclick="window._loadGameSlot(' + i + ')">📂 读</button></div></div>';
    } else {
      body += '<div style="padding:10px;background:rgba(255,255,255,.05);border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;color:var(--es-text-dim)">' +
        '<span>📁 槽位' + (i+1) + ' · 空</span><button class="es-chip" style="cursor:pointer" onclick="window._saveGameSlot(' + i + ')">+ 存档</button></div>';
    }
  }
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card">' +
    '<div class="es-stageup-icon">💾</div>' +
    '<div class="es-stageup-label">存档管理</div>' +
    '<div class="es-stageup-desc">' + body + '</div>' +
    '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove()">关闭</button></div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  document.body.appendChild(overlay);
  // 全局回调
  window._saveGameSlot = function(slot) { saveEntSimGame(slot); showToast('💾 已保存到槽位' + (slot+1)); };
  window._loadGameSlot = function(slot) { loadEntSimGame(slot); };
}

// P1 #11: 纪念日弹窗（es-stageup-card 风格）
function showMilestoneModal() {
  var E = GS.entSim;
  var ms = E._romanceMilestones || {};
  var keys = Object.keys(ms);
  if (!keys.length) { showToast('还没有纪念日回忆～'); return; }
  var body = '';
  for (var i = keys.length - 1; i >= 0; i--) {
    var m = ms[keys[i]];
    body += '<div style="padding:8px;background:rgba(255,255,255,.04);border-radius:8px;margin-bottom:4px;border-left:3px solid var(--es-primary2)">' +
      '<span style="font-size:10px;color:var(--es-text-dim)">Day ' + (m.day || '?') + '</span><br>' +
      '<b style="color:var(--es-text)">' + escHtml(m.label || '回忆') + '</b><br>' +
      '<span style="font-size:11px;color:var(--es-text-dim)">' + escHtml(m.desc || '') + '</span></div>';
  }
  var overlay = document.createElement('div');
  overlay.className = 'es-stageup-overlay';
  overlay.innerHTML = '<div class="es-stageup-card">' +
    '<div class="es-stageup-icon">💫</div>' +
    '<div class="es-stageup-label">我们的纪念日</div>' +
    '<div class="es-stageup-desc">' + body + '</div>' +
    '<button class="primary" onclick="var p=this.closest(\'.es-stageup-overlay\');if(p)p.remove()">关闭</button></div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  document.body.appendChild(overlay);
}

function closeModalDirect(overlay) {
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}
