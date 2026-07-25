// ============================================================
// 娱乐圈地下恋（entSim）· UI 驾驶舱
// 三栏：左=娱乐圈背景(日程/队友/曝光) / 中=剧情·选项·自由输入 / 右=圈内态势(热搜/粉丝/关系网)
// 底部：8阶段好感度条 + 快捷指令(拉回主线/随机事件/探班/走向结局/进入下一天) + 4 Tab(剧情/聊天/朋友圈/剧场)
// ============================================================
import { GS, saveGame } from '../state.js';
import { popularity, careerLevel } from './state.js';
import { buildEntSimHeroineGroup, buildEntSimGroupMeta } from '../data.js';
import { escHtml, showToast, randInt } from '../utils.js';
import { showApiSettingsModal } from '../modals.js';
import { showActionInfoModal } from '../modals/confirm-modal.js';
import { showVisitChoiceModal } from '../modals/visit-choice-modal.js';
import { getTimeOfDayLabel } from './cycle.js';
import { getDailyBuzz, generateFanReaction, generateBuzzRepliesAI, buzzTitle, buzzContent } from './immersion.js';
import { getNpcNodes, interactNpc, getNpcInteractions } from './npc-network.js';
import {
  getRomanceStageLabel, getRomanceStageIcon, affectionStageIndex,
  tryConfession, applyConfessionResult, assessRomanceRisk, getCoverMechanisms, applyCover, canUseCover
} from './romance.js';
import {
  getEntSimCurrent, handleEntSimChoice, handleEntSimFreeInput,
  continueEntSimMain, triggerEntSimEvent, enterEntSimEnding,
  goEntSimNextDay, initiateEntSimDate, generateEntSimConfession,
  generateEntSimChat, generateEntSimMoment, generateEntSimTheater, handleEntSimRegenerate,
  generateEntSimRound, runEntSimEnding, triggerTeammateEvent, triggerSVTTeammateEvent, restartEntSim
} from './engine.js';
import { STAGE_CEREMONY, TEAMMATE_FLAVOR, SVT_TEAMMATE_PROFILES } from './data.js';

var SHOW_NPC = ['broker', 'fanleader', 'suitor'];

// 通用评论池：展开讨论串时随机抽 2 条（无需 AI，省额度）
var BUZZ_COMMENT_POOL = [
  '前排吃瓜 蹲后续','已阅 下一个','笑死 评论区比正文精彩','这是真的吗 有没有锤',
  '有人科普一下前因后果吗','大家都好激动 冷静冷静','不管怎样 作品才是最重要的',
  '说实话 我觉得还行 没那么夸张','一看就是对家买的 太明显了','走过路过不要错过 粉丝别吵了',
  '这话题居然上热搜了 是不是有人花钱了','看了三遍 还是没看懂大家在吵什么',
  '有一说一 这个讨论挺低质的','求指路 原帖在哪','非粉 但这个真挺好笑的',
  '我也觉得 终于有人说了','不懂就问 这是在说谁','关注作品 别关注私生活',
  '相信她 这么多年了还没看清吗','这圈子不就是这样 习惯就好','粉丝都散了吧 越吵越热',
  '别理黑子 专注自家','纯路人 觉得还挺有意思的','刚吃完饭回来 发生了什么',
  '反正我不信 等官方回应','心疼妹妹 又被拉出来挡枪','为什么大家都在骂 我觉得挺正常啊',
  '路转粉了 就喜欢这种真实感','果然是饭圈 这也能吵起来','真相只有一个 吃瓜不信瓜',
  '好家伙 今天这瓜可真多','默默点个赞 不敢说话','没有人觉得她最近状态超好吗',
  '这个舞台看了四五遍了 出不去了','路人表示被圈粉了','今天妆造绝了谁懂',
  '什么时候打歌 我想看完整版','这次回归的歌真的越听越上头','她瘦了好多 心疼',
  '说真的 这次编舞比上次好','我投一票 这绝对今年最佳','官方什么时候出高清图',
  '不知道有没有练习室版','笑死 黑粉今天又破费了','别吵了 听歌不香吗',
  '有人跟我一样从出道就在追吗','第一次看她舞台 被震撼到了','舞蹈力度绝了好吧',
  '声音太有辨识度了 闭眼都能听出','新造型好适合她','这个表情管理真是没谁了',
  '眼睛里真的有光','今天又是被治愈的一天','不懂就问 这是仙女吗',
  '颜值这块真的没输过','路人想问一句 这个妹妹多大了','想去看现场 有一起的吗',
  '今天直播有人录屏吗 错过了一半','就喜欢这种又甜又有态度的','看了一圈 还是她的舞台最舒服',
  '我觉得挺好听的啊为什么有人在骂','就她一个还在认真对嘴 其他人呢','这反应速度真的快 综艺感拉满',
  '刚下班就刷到这个 太幸福了','感觉她最近是真的开心啊','有人知道她用什么香水吗 好好闻的样子',
  '签名好认真啊 每个都写了小爱心','为什么有人不喜欢 我无法理解','这个直拍我可以看一辈子',
  '新人求安利 从哪里补比较好','看完这期综艺彻底入坑了','太可爱了 想把她带回家',
  '这团真的越来越好了 肉眼可见的进步','粉丝发的应援视频好好哭','凌晨还在练舞 真的太拼了',
  '今天打歌舞台的灯光绝了','有没有人去拼盘演唱会 组队吗','求一个原图 当壁纸',
  '这个背景音是谁唱的 好好听','我宣布我是她的新粉了','生图都能打 这就是天生爱豆',
  '饭圈能不能少点撕 多看舞台','今天上班路上偶遇 本人真的好小一只','吃了安利来了 已关注',
  '每天靠她的动态续命','这种实力真的不需要解释','拍手会去了 本人比照片好看一万倍',
  '粉丝别招黑了 让她安静发展吧','弹幕刷屏的好烦 能不能让人好好看','她演的综艺这段我笑了十分钟',
  '听她唱歌真的好治愈','这才是真正的全能','路人粉也忍不住评论一下了',
  '好想知道她用的什么护肤品','这舞到底怎么跳的 太快了','今天这波操作真的牛',
  '有人说她划水 我笑了 看直拍了吗','这明明就很真诚啊 哪装了','别带节奏了 人挺好的',
  '有人囤了专辑吗 出不出小卡','今天签售的动图有人有吗 求私','音乐银行这周的直拍必看',
  '黑粉别来沾边好吧','看到她拿奖了 真替她开心','有没有粉丝群 想加',
  '这个团的团综太下饭了','今天的新歌听了吗 好听到炸','这个发色染到我心巴上了',
  '路人来看热闹 结果出不去了','终于有人说实话了','最喜欢这种安静做事的人',
  '站姐拍的这套图美疯了','二倍速跳舞那一段我反复拖进度条','又有yxh在带节奏了 别上当',
  '她写的这首词……真的有点东西','这个表情我真的存了 太好用了','今晚直播蹲到了 幸福',
  '人家说了最近在好好练习 别再问了','官咖的手写信有人翻译吗','搞笑和实力共存 有点意思',
  '出道到现在 肉眼可见的进步','不理解骂她的人 是作业太少吗','今天音源排名涨了 大家继续冲',
  '这次回归的造型团队真的强','不知道她看过这些评论没 希望能看到好的','这编舞细节太多了 每遍都有新发现',
  '考古了一下 她从小就这么可爱','为什么每次回归都有人拿她开刀','请公司做人 给点资源吧',
  '刚从签售回来 她主动跟我击掌了','纯好奇 有多少人是男粉','这次回归后涨粉好快',
  '感觉这波黑有点过了 没实锤的事到处传','每次看她跳舞都起鸡皮疙瘩','今天舞台ending是她设计的吗 太会了',
  '黑子：没表情 粉丝：这不叫没表情这叫情绪控制','综艺上被整蛊那段真的笑死我了','有没有人发现她今天换了新耳麦',
  '你可以永远相信她的舞台','这才出道几年啊就这么稳了','团里最努力的就是她了 有目共睹',
  '今天下班图 她好像累了 眼神有点疲惫','别说了 我已经开始单曲循环了','这个团真的需要更多关注 实力被低估',
  '刚看完直拍 准备去看第二遍','有没有去签售的姐妹分享一下后记','粉色那套打歌服真的封神',
  '看到有人吐槽她穿搭 我笑了 这还不好看？','路人表示 已经被圈粉了','她真的很努力 每次舞台都进步',
  'get不到的人有难了','这个团什么时候开演唱会 我一定去','有被惊艳到 谢谢',
  '这期综艺值得反复看 太搞笑了','什么时候出个人综艺 想看','今天就指着这个视频活',
  '别吵了别吵了 和和气气看妹妹不好吗','黑酸请退散','看到这么多人喜欢她 好感动',
  '某站热点又被屠了 笑死','谁懂 今晚刷到根本停不下来','为了她买的第一张专辑 值得'
];


// 判断一条舆论是否与女主相关（含 {name} 或被 fill 替换后的女主名）
function isHeroineRelated(item) {
  var t = typeof item === 'object' ? (item.t || '') : (item || '');
  var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '';
  return hpName && t.indexOf(hpName) >= 0;
}
function suitorName() { var n = GS.entSim.npcNetwork.nodes['npc_suitor']; return (n && n.name) ? n.name : '团员'; }
var DATE_VENUES = ['私人影院', '深夜江边', '他家', '车里', '天台', '地下停车场'];
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
    // 剧情生成后自动跳到最新内容
    setTimeout(function() {
      var endEl = document.getElementById('es-narrative-end');
      if (endEl) endEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    if (GS._entSimStageUpPending) showStageUpCeremony();
  };
  return renderHtml();
}

function renderHtml() {
  var tab = currentTab();
  var heartPending = GS._entSimHeartbeatPending;
  // 主剧情：首轮未生成时自动生成（用 started 标志，避免每次渲染都重复触发生成）
  var E = GS.entSim;
  if (!E.started && !GS._entSimGenerating) {
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
      renderDepthTop() +
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
  var chName = (E.chapter && E.chapter.name) ? (' ' + (E.chapter.icon || '') + ' ' + E.chapter.name) : '';
  return '' +
    '<div class="es-header">' +
      '<div class="es-h-left">' +
        '<span class="es-cycle-tag">💗 地下恋 · Day' + (E.cycle.dayCount || 1) + ' ' + getTimeOfDayLabel() + '</span>' +
        (chName ? '<span class="es-chap-badge">' + chName + '</span>' : '') +
        '<span class="es-chap-badge">' + getRomanceStageIcon() + ' ' + getRomanceStageLabel() + '</span>' +
      '</div>' +
      '<div class="es-h-right">' +
        '<span class="es-pop" id="es-pop-btn" style="cursor:pointer" title="点击查看人气变动日志">人气 <b>' + popularity() + '</b> <i style="font-style:normal;color:#9D8BFF">(' + careerLevel() + ')</i></span>' +
        '<span class="es-aff-mini">好感 ' + E.affection + '/100</span>' +
        '<span class="es-icon-btn" id="es-settings-btn" title="设置">⚙️</span>' +
      '</div>' +
    '</div>';
}

// ---------- Left · 娱乐圈背景 ----------
function renderLeft() {
  var E = GS.entSim;
  var gm = E.groupMeta || {};
  var sisters = (E.heroineGroup || []).map(function(s, i) {
    return '<button class="es-sis" data-sis="' + i + '"><span class="es-sis-name">' + escHtml(s.name) + '</span><small>' + escHtml(s.roleTag) + '</small></button>';
  }).join('');
  var exp = Math.min(100, (E.misc.exposureAccum || 0) * 4);
  var tier = getExposureTierLabel(E.misc.exposureAccum || 0);
  var expBarColor = exp >= 80 ? 'var(--es-danger)' : exp >= 60 ? '#ff7e7e' : exp >= 40 ? '#ffd166' : exp >= 20 ? '#ffee88' : '#7ee787';
  // 团设卡片
  var groupCard = '';
  if (gm.groupName) {
    var songsHtml = (gm.songs || []).map(function(s) { return '<span class="es-gm-song">' + escHtml(s) + '</span>'; }).join('');
    groupCard = '<div class="es-gm-card">' +
      '<div class="es-gm-name">' + escHtml(gm.groupName) + '</div>' +
      '<div class="es-gm-line">🏢 ' + escHtml(gm.company || '') + '  ·  🎵 ' + escHtml(gm.concept || '') + '</div>' +
      '<div class="es-gm-line">💎 粉丝：' + escHtml(gm.fandom || '') + '  ·  ' + (gm.debutYears ? '出道 ' + gm.debutYears + ' 年' : '刚出道新人团') + '</div>' +
      (songsHtml ? '<div class="es-gm-songs">🔥 出圈曲：' + songsHtml + '</div>' : '') +
    '</div>';
  }
  return '' +
    '<div class="es-panel">' +
      groupCard +
      '<div class="es-col-title">🗓️ 今日日程</div>' +
      renderAgenda() +
      '<div class="es-col-title" style="margin-top:6px">👯 女团队友</div>' +
      '<div class="es-sis-list">' + (sisters || '<div class="es-empty">—</div>') + '</div>' +
      '<div class="es-col-title" style="margin-top:6px">🔍 曝光 ' + tier.label + '</div>' +
      '<div class="es-exp-bar"><span style="width:' + exp + '%;background:' + expBarColor + '"></span></div>' +
      '<small style="color:var(--text-dim)">曝光值 ' + (E.misc.exposureAccum || 0) + ' · ' + tier.desc + '</small>' +
    '</div>';
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
  var tod = E.cycle.timeOfDay || 0;
  var slotIcons = ['☀️', '🌤️', '🌙'];
  var slotLabel = getTimeOfDayLabel();
  // 时段指示器：当前在哪个时段
  var header = '<div class="es-agenda-time">' + slotIcons[tod] + ' 当前 · ' + slotLabel + '（第' + (tod + 1) + '/3 档）</div>';
  // 不同时段高亮自己的行程
  var highlightKey = tod === 0 ? 'main' : tod === 1 ? 'related' : '';
  var items = [
    { key: 'main', icon: '🎤', text: (E.agenda.main || '主档') + (E.agenda.mainLoc ? '（' + E.agenda.mainLoc + '）' : ''), active: highlightKey === 'main' },
    { key: 'maleLead', icon: '💜', text: '男主：' + (E.agenda.maleLead || '行程中') + (E.agenda.maleLeadLoc ? '（' + E.agenda.maleLeadLoc + '）' : ''), active: false },
    { key: 'related', icon: '📺', text: E.agenda.related || '相关', active: highlightKey === 'related' },
    { key: 'rival', icon: '💢', text: suitorName() + '：' + (E.agenda.rival || '行程中') + (E.agenda.rivalLoc ? '（' + E.agenda.rivalLoc + '）' : ''), active: false }
  ];
  if (E.agenda.brother && E.brother && E.brother.name) {
    items.push({ key: 'brother', icon: '👨', text: (E.agenda.brother || '哥哥') + (E.agenda.brotherLoc ? '（' + E.agenda.brotherLoc + '）' : ''), active: false });
  }
  // 约定卡片：可点击赴约
  var aptCards = '';
  var apts = (E.appointments || []).filter(function(a) { return !a.done; });
  if (apts.length) {
    aptCards = '<div class="es-col-title" style="margin-top:6px">📅 约定</div>' +
      apts.map(function(a, i) {
        var canGo = tod >= 2 || a.timeHint === '今晚' || a.timeHint === slotLabel;
        var cls = canGo ? '' : ' es-apt-locked';
        return '<button class="es-ag-btn es-apt-btn' + cls + '" data-apt="' + i + '"' + (canGo ? '' : ' disabled') + '>' +
          '<span class="es-ic">' + (canGo ? '📍' : '🔒') + '</span>' +
          escHtml(a.summary || a.place) + ' <small>' + escHtml(a.timeHint || '') + ' · ' + escHtml(a.place || '') + '</small>' +
          '</button>';
      }).join('');
  }
  return '<div class="es-agenda">' + header + items.map(function(it) {
    var cls = 'es-ag-tag' + (it.active ? ' es-ag-active' : '');
    return '<div class="' + cls + '"><span class="es-ic">' + it.icon + '</span>' + escHtml(it.text) + '</div>';
  }).join('') + aptCards + '</div>';
}

// ---------- Center · 剧情 ----------
function renderCenter(cur, heartPending) {
  var E = GS.entSim;
  if (!cur) {
    return '<div class="es-narrative">⏳ 剧情加载中…</div>' + renderFreeInput() + renderQuickActions();
  }
  var nCls = heartPending ? 'es-narrative es-heartbeat' : 'es-narrative';
  var optionsHtml = (cur.options && cur.options.length) ?
    cur.options.map(function(o, i) {
      var rb = optionRiskBadge(o);
      return '<button class="es-option' + (rb ? ' es-opt-risk' : '') + '" data-idx="' + i + '"' + (rb ? ' data-risk="1"' : '') + '>' + escHtml(o) + (rb ? ' <span class="es-risk">' + rb + '</span>' : '') + '</button>';
    }).join('') : '<div class="es-empty">（等待剧情推进…）</div>';
  var romanceBtns = renderRomanceButtons();
  var heartTitle = heartPending ? '<div class="es-heartbeat-title">💗 心动时刻</div>' : '';
  var nHtml = cur.narrative ? escHtml(cur.narrative).replace(/\n/g, '<br>') : '';
  nHtml = nHtml.replace(/── (.+?) ──/g, '<div class="es-branch-sep">$1</div>');
  return '' +
    '<div class="es-panel es-center-panel">' +
      '<div class="es-col-title">📖 剧情 · Day ' + (E.cycle.dayCount || 1) + ' ' + getTimeOfDayLabel() + '</div>' +
      heartTitle +
      '<div class="' + nCls + '" id="es-narrative">' + nHtml + '<div id="es-narrative-end"></div></div>' +
      '<div class="es-opts" id="es-options">' + optionsHtml + '</div>' +
      renderFreeInput() +
      romanceBtns +
      renderQuickActions() +
    '</div>' +
    renderTabBar();
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
  var quick = [
    { q: 'regenerate', label: '重新生成' },
    { q: 'nextagenda', label: '下一个行程' + (GS.entSim.cycle.timeOfDay >= 2 ? ' → 换天' : '') },
    { q: 'cover', label: '🛡️ 掩护(' + (5 - (E.romance.coverUsed || 0)) + '/5)', act: 'cover' },
    { q: 'event', label: '随机事件' },
    { q: 'visit', label: '探班' },
    { q: 'svtvisit', label: 'SEVENTEEN队友' },
    { q: 'ending', label: '走向结局' },
    { q: 'nextday', label: '进入下一天' }
  ].map(function(b) {
    var hasQ = !b.act;
    return '<button class="es-quick-btn' + (b.act ? ' es-quick-sm' : '') + '"' +
      (hasQ ? ' data-q="' + b.q + '"' : '') +
      (b.act ? ' data-act="' + b.act + '"' : '') +
      '>' + b.label + '</button>';
  }).join('');
  return '<div class="es-quick es-quick-center">' + quick + '</div>';
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
  var npcs = renderNpcList();
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
      '<div class="es-col-title" style="margin-top:4px">🕸️ 关系网 <small>剩' + (1 - (E.misc.npcInteractionUsed || 0)) + '/1</small></div>' +
      '<div class="es-npc-grid">' + npcs + '</div>' +
      '<button class="es-rom-btn es-fan-btn" id="es-fan-btn" style="margin-top:8px;width:100%">📝 营业反馈</button>' +
      '<button class="es-rom-btn" id="es-memory-btn" style="margin-top:8px;width:100%">📖 记忆回顾</button>' +
    '</div>';
}
// 右栏恋情面板：阶段 / 好感 / 曝光 / 已用掩护 / 哥哥支持度
function renderLovePanel() {
  var E = GS.entSim;
  var stage = getRomanceStageLabel();
  var exp = E.misc.exposureAccum || 0;
  var tier = getExposureTierLabel(exp);
  var cover = E.romance.coverUsed || 0;
  var html = '<div style="margin-top:4px;padding:8px;background:rgba(255,255,255,.04);border-radius:8px">' +
    '<div class="es-col-title" style="margin:0 0 4px 0">💗 恋情面板</div>' +
    '<div class="es-risk-row"><span>阶段</span><span>' + getRomanceStageIcon() + ' ' + stage + '</span></div>' +
    '<div class="es-risk-row"><span>好感</span><span>' + E.affection + '/100</span></div>' +
    '<div class="es-risk-row"><span>曝光</span><span>' + tier.label + ' (' + exp + ')</span></div>' +
    '<div class="es-risk-row"><span>掩护</span><span>' + cover + '/5</span></div>';
  if (E.brother && E.brother.name) {
    html += '<div class="es-risk-row"><span>哥哥支持度</span><span>' + (E.brother.support || 0) + ' · ' + escHtml(E.brother.stance || '参谋') + '</span></div>';
  }
  html += '</div>';
  return html;
}
function renderNpcList() {
  return getNpcNodes().filter(function(n) { return SHOW_NPC.indexOf(n.type) >= 0; }).map(function(n) {
    var warn = (stanceClass(n.stance) === 'bad') ? ' warn' : '';
    var sub = n.type === 'rival' || n.type === 'suitor' ? '亲密度' + (n.intimacy || 0) : n.stance;
    return '<div class="es-npc-node es-npc-click' + warn + '" data-npc="' + n.type + '" title="点击互动（剩' + (1 - (GS.entSim.misc.npcInteractionUsed || 0)) + '/1次）">' +
      '<div class="es-npc-avatar">' + (n.icon || '👤') + '</div>' +
      '<div class="es-npc-name">' + escHtml(n.name) + '</div>' +
      '<small style="font-size:9px;color:var(--text-dim)">' + escHtml(sub) + '</small>' +
      '</div>';
  }).join('');
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

// ---------- 顶部全宽好感度进度条 + 剧情框下方 Tab 条 ----------
function renderDepthTop() {
  var aff = GS.entSim.affection;
  var idx = affectionStageIndex(aff);
  var cells = '';
  for (var i = 0; i < 8; i++) cells += '<span class="es-depth-cell' + (i <= idx ? ' on' : '') + '"></span>';
  return '' +
    '<div class="es-depth-top">' +
      '<span class="es-depth-ic">' + getRomanceStageIcon() + '</span>' +
      '<div class="es-depth-bar">' + cells + '</div>' +
      '<span class="es-depth-label">' + getRomanceStageLabel() + ' · 好感 ' + aff + '/100</span>' +
    '</div>';
}
// 剧情框下方的 Tab 切换条（剧情/聊天/朋友圈/剧场/日记/信箱）—— 装进圆角框
function renderTabBar() {
  var labels = { story: '剧情', chat: '聊天', moments: '朋友圈', theater: '剧场', diary: '日记', letters: '信箱' };
  var tabs = ['story', 'chat', 'moments', 'theater', 'diary', 'letters'].map(function(t) {
    return '<span class="es-tab' + (currentTab() === t ? ' on' : '') + '" data-tab="' + t + '">' + labels[t] + '</span>';
  }).join('');
  return '<div class="es-panel es-tab-panel"><div class="es-tabbar">' + tabs + '</div></div>';
}

// ---------- Tab 渲染 ----------
// ---------- Tab 内容（剧情框下方内联，单页滚动）----------
function renderTabContent(tab) {
  if (tab === 'chat') return renderChatInner();
  if (tab === 'moments') return renderMomentsInner();
  if (tab === 'theater') return renderTheaterInner();
  return '';
}
function renderChatInner() {
  var history = (GS.entSim.chatHistory || []);
  var msgs = history.map(function(c) {
    if (c.role === 'user') return '<div class="es-chat-msg user">' + escHtml(c.content) + '</div>';
    return '<div class="es-chat-msg ai">' + escHtml(c.content) + '</div>';
  }).join('');
  return '<div class="es-chat-panel es-tab-inner">' +
    '<div class="es-chat-header">💬 与男主聊天</div>' +
    '<div class="es-chat-messages" id="es-chat-msgs">' + (msgs || '<div class="es-empty">开始和 ' + escHtml(GS.entSim.romance.maleLead.name) + ' 聊天吧 💬</div>') + '</div>' +
    '<div class="es-chat-input-area">' +
      '<input class="es-chat-input" id="es-chat-input" placeholder="输入消息…">' +
      '<button class="es-chat-send" id="es-chat-send">发送</button>' +
    '</div>' +
  '</div>';
}
function renderMomentsInner() {
  var moments = (GS.entSim.moments || []);
  var html = moments.map(function(m) {
    return '<div class="es-moment-item"><div class="es-moment-post">' + escHtml(m.post || '') + '</div>' +
      (m.reply ? '<div class="es-moment-reply">💬 ' + escHtml(GS.entSim.romance.maleLead.name) + '：' + escHtml(m.reply) + '</div>' : '') + '</div>';
  }).join('');
  return '<div class="es-moments-panel es-tab-inner">' +
    '<div class="es-chat-header">📸 朋友圈</div>' +
    '<div class="es-moments-list">' + (html || '<div class="es-empty">暂无动态</div>') + '</div>' +
    '<button class="es-btn es-wide" id="es-gen-moment" style="margin-top:8px">生成新动态</button>' +
  '</div>';
}
function renderTheaterInner() {
  var aff = GS.entSim.affection;
  var html = THEATER_TYPES.map(function(t) {
    var locked = aff < t.minAff;
    return '<button class="es-modal-btn es-theater-type' + (locked ? ' locked' : '') + '" data-theater="' + t.type + '" data-label="' + t.label + '"' + (locked ? ' disabled' : '') + '>' +
      (locked ? '🔒 ' : '🎬 ') + t.label + (locked ? '（需好感≥' + t.minAff + '）' : '') + '</button>';
  }).join('');
  return '<div class="es-theater-panel es-tab-inner">' +
    '<div class="es-chat-header">🎬 剧场番外</div>' +
    '<div class="es-theater-list">' + html + '</div>' +
    '<div id="es-theater-content" style="margin-top:12px"></div>' +
  '</div>';
}

// ---------- 事件绑定 ----------
export function bindEntSimEvents() {
  // 惰性初始化
  if (!GS.entSim || !GS.entSim.romance || !GS.entSim.romance.maleLead || !GS.entSim.romance.maleLead.memberId) {
    return;
  }
  // 通用绑定：底部 Tab 切换 + 「‹ 返回」（所有 Tab 页均需可切换/返回，修复进聊天页卡死）
  bindCommonNav();
  var tab = currentTab();
  if (tab === 'story') {
    var cur = getEntSimCurrent();
    var autoTries = GS._entSimAutoTries || 0;
    if (!cur.narrative && !GS._entSimGenerating) {
      if (autoTries >= 2) {
        GS._entSimCurrent = { narrative: '（剧情生成较慢，请点击「拉回主线」重试）', options: ['拉回主线'], extras: {}, failed: true };
      } else {
        GS._entSimAutoTries = autoTries + 1;
        var loading = document.getElementById('es-narrative');
        if (loading) loading.innerHTML = '<div class="es-loading">✨ 剧情生成中…</div>';
        continueEntSimMain().then(function() { if (window.__renderEntSim) window.__renderEntSim(); });
      }
    }
  }
  // 同页内联：所有区块事件统一绑定（不再按 Tab 提前 return）
  bindStoryEvents();
  bindChatEvents();
  bindMomentsEvents();
  bindTheaterEvents();
  bindBuzzClicks();
}

// 底部 Tab 切换：story 切到剧情视图，其余弹出手机框蒙层
function bindCommonNav() {
  document.querySelectorAll('.es-tab[data-tab]').forEach(function(el) {
    el.addEventListener('click', function() {
      var tab = el.dataset.tab;
      if (tab === 'story') { switchEntSimTab('story'); }
      else if (tab === 'chat') { showEntSimChatModal(); }
      else if (tab === 'moments') { showEntSimMomentsModal(); }
      else if (tab === 'theater') { showEntSimTheaterModal(); }
      else if (tab === 'diary') { showEntSimDiaryModal(); }
      else if (tab === 'letters') { showEntSimLetterModal(); }
    });
  });
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
  bindId('es-pop-btn', onPopLog);
  bindId('es-memory-btn', onMemoryLog);
  document.querySelectorAll('.es-ag-btn[data-agenda]').forEach(function(b) {
    b.addEventListener('click', function() { onAgendaClick(b.dataset.agenda); });
  });
  document.querySelectorAll('.es-ag-btn[data-apt]').forEach(function(b) {
    b.addEventListener('click', function() { onAppointmentClick(parseInt(b.dataset.apt, 10)); });
  });
  document.querySelectorAll('.es-sis[data-sis]').forEach(function(b) {
    b.addEventListener('click', function() { showNarrativeLoading(); triggerTeammateEvent(GS.entSim.heroineGroup[parseInt(b.dataset.sis, 10)]); });
  });
  bindId('es-fan-btn', onFanReaction);
  document.querySelectorAll('.es-npc-node[data-npc]').forEach(function(el) {
    el.addEventListener('click', function() { onNpcInteract(el.dataset.npc); });
  });
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
function onNpcInteract(type) {
  var E = GS.entSim;
  if ((E.misc.npcInteractionUsed || 0) >= 1) { showToast('今日互动次数已用完，明天再来'); return; }
  var acts = getNpcInteractions(type);
  var node = getNpcNodes().filter(function(n) { return n.type === type; })[0];
  var label = node ? node.name : 'NPC';
  var html = '<p>主动互动 · <b>' + escHtml(label) + '</b></p>' + acts.map(function(a) {
    var tags = [];
    if (a.pop) tags.push('<span class="es-ni-tag es-ni-pop">人气' + (a.pop > 0 ? '+' : '') + a.pop + '</span>');
    if (a.exposure) tags.push('<span class="es-ni-tag es-ni-exp">曝光' + (a.exposure > 0 ? '+' : '') + a.exposure + '</span>');
    return '<button class="es-modal-btn" data-ni="' + a.key + '">' + a.icon + ' ' + a.label + ' ' + tags.join('') + '<span class="es-modal-sub">' + a.note + '</span></button>';
  }).join('');
  showEntSimModal('🕸️ 互动 · ' + label, html, []);
  document.querySelectorAll('[data-ni]').forEach(function(b) {
    b.addEventListener('click', function() {
      var r = interactNpc(type, b.dataset.ni);
      closeEntSimModal();
      if (r.success) {
        // 在剧情区插入互动结果卡片
        var nEl = document.getElementById('es-narrative');
        if (nEl) {
          nEl.insertAdjacentHTML('beforeend',
            '<div class="es-npc-interact-result">' +
              '<span class="es-npc-interact-icon">' + (node.icon || '👤') + '</span>' +
              '<span class="es-npc-interact-text">' + escHtml(r.note) + '</span>' +
            '</div>');
          nEl.scrollTop = nEl.scrollHeight;
        }
      }
      rerender();
    });
  });
}

// 快捷指令
function onQuick(q) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }

  // visit 先弹选择框不立即生成，ending/nextday 有自己的 loading 入口
  if (q === 'visit') { showEntSimVisitChoice(); return; }
  if (q === 'svtvisit') { showSVTVisitPanel(); return; }
  if (q === 'ending') { onEnding(); return; }
  if (q === 'nextday') { showNarrativeLoading(); goEntSimNextDay().then(rerender); return; }

  // 重新生成/下一个行程 加确认防误触
  var confirmActions = { regenerate: '重新生成', nextagenda: '下一个行程' };
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
      function() {
        closeEntSimModal();
        showNarrativeLoading();
        triggerEntSimEvent('探班：你借口工作去看' + sel.name + '（他今天在' + sel.task + '），两人在工作间隙偷偷见面').then(rerender);
      }
    );
  });
}

// SEVENTEEN 队友探班面板：12 人选单（排除男主/哥哥/情敌）
function showSVTVisitPanel() {
  var E = GS.entSim;
  var mlId = (E.romance && E.romance.maleLead) ? E.romance.maleLead.id : (GS.oneHeartMember || '');
  var broId = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.id) || '';
  var suitorId = '';
  if (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor']) {
    suitorId = E.npcNetwork.nodes['npc_suitor'].id || '';
  }
  var excluded = [mlId, broId, suitorId];
  var available = SVT_TEAMMATE_PROFILES.filter(function(p) { return excluded.indexOf(p.id) < 0; });
  if (!available.length) { showToast('没有其他 SEVENTEEN 成员可互动'); return; }
  var html = '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:10px 0">';
  for (var i = 0; i < available.length; i++) {
    var p = available[i];
    html += '<button class="es-svt-btn" data-svtid="' + p.id + '" style="padding:10px 14px;border:1px solid var(--es-card-border);border-radius:10px;background:rgba(185,174,224,.08);cursor:pointer;text-align:center;min-width:90px">' +
      '<div style="font-size:24px">' + p.emoji + '</div>' +
      '<div style="font-size:13px;font-weight:600;color:var(--es-text)">' + escHtml(p.name) + '</div>' +
      '<div style="font-size:11px;color:var(--es-muted)">' + escHtml(p.desc) + '</div>' +
      '</button>';
  }
  html += '</div>';
  showEntSimModal('SEVENTEEN 队友', html, [
    { id: 'cancel', label: '取消' }
  ]);
  // 绑定点击事件
  setTimeout(function() {
    document.querySelectorAll('.es-svt-btn[data-svtid]').forEach(function(b) {
      b.addEventListener('click', function() {
        var sid = b.getAttribute('data-svtid');
        closeEntSimModal();
        showNarrativeLoading();
        triggerSVTTeammateEvent(sid);
        setTimeout(rerender, 500);
      });
    });
  }, 50);
}

// 恋爱动作
function onRomanceAct(act) {
  if (GS._entSimGenerating) { showToast('生成中，请稍候'); return; }
  if (act === 'date') {
    var venue = DATE_VENUES[Math.floor(Math.random() * DATE_VENUES.length)];
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

// ---------- 记忆回顾（可编辑，包括当天实时剧情） ----------
function onMemoryLog() {
  var E = GS.entSim;
  // 当天实时剧情 — 可编辑
  var todayBlock = '';
  var todayText = '';
  if (GS._entSimCurrent && GS._entSimCurrent.narrative) {
    todayText = GS._entSimCurrent.narrative;
    todayBlock = '<div class="es-mem-today">' +
      '<div class="es-col-title">📋 今天 (Day ' + (E.cycle.dayCount || 1) + ') — 实时剧情 <small>（可直接编辑，改完点保存）</small></div>' +
      '<textarea class="es-mem-textarea" id="es-mem-today-text" rows="4" placeholder="（暂无今日剧情）">' + escHtml(todayText) + '</textarea>' +
      '</div>';
  }
  // 过往压缩记忆
  var summaries = (E.memory.dailySummaries || []).slice().reverse();
  var daysHtml = summaries.map(function(d, di) {
    var eventsText = (d.events || []).join('\n');
    var idx = summaries.length - 1 - di;
    return '<div class="es-mem-day-edit">' +
      '<div class="es-mem-day-head"><b>Day ' + d.day + '</b> <span class="es-mem-kw">' + escHtml((d.keywords || []).join('、')) + '</span></div>' +
      '<textarea class="es-mem-textarea" data-mem="' + idx + '" rows="2" placeholder="（无压缩记忆）">' + escHtml(eventsText) + '</textarea>' +
      '</div>';
  }).join('');
  if (!daysHtml) daysHtml = '<div class="es-empty">暂无压缩记忆（进入下一天后自动生成）</div>';

  // 直接创建 overlay，不用 showEntSimModal（避免 Promise/按钮事件冲突）
  var overlay = document.createElement('div');
  overlay.className = 'es-modal-overlay';
  overlay.innerHTML = '<div class="es-modal">' +
    '<div class="es-modal-title">📖 记忆回顾</div>' +
    '<div class="es-modal-body"><div class="es-mem">' +
    todayBlock +
    '<div class="es-col-title" style="margin-top:10px">📦 前日压缩记忆 <small>（可直接编辑文本，改完点保存）</small></div>' +
    daysHtml +
    '<div class="es-modal-btns" style="margin-top:10px;display:flex;gap:8px">' +
    '<button class="es-modal-btn" id="es-mem-save">💾 保存修改</button>' +
    '<button class="es-modal-btn" id="es-mem-close">关闭</button>' +
    '</div>' +
    '</div></div></div>';

  document.body.appendChild(overlay);

  // 关闭
  var closeBtn = overlay.querySelector('#es-mem-close');
  closeBtn.addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation();
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
  });

  // 保存
  overlay.querySelector('#es-mem-save').addEventListener('click', function() {
    // 今天实时剧情 — 存入 memory.todayNote
    var todayTa = overlay.querySelector('#es-mem-today-text');
    if (todayTa && GS._entSimCurrent) {
      E.memory.todayNote = E.memory.todayNote || '';
      E.memory.todayNote = todayTa.value.trim();
    }
    // 过往压缩记忆
    var textareas = overlay.querySelectorAll('.es-mem-textarea[data-mem]');
    textareas.forEach(function(ta) {
      var idx = parseInt(ta.getAttribute('data-mem'), 10);
      var val = ta.value.trim();
      var sum = E.memory.dailySummaries[idx];
      if (sum && !isNaN(idx)) {
        sum.events = val ? val.split('\n').filter(function(l) { return l.trim(); }) : [];
      }
    });
    saveGame();
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    showToast('记忆已保存');
  });
}

// ---------- 人气变动日志（含曝光、关键事件等全部 careerHistory） ----------
var _popLogTypeMeta = {
  popularity: { label: '人气', cls: 'pop' },
  exposure: { label: '曝光', cls: 'exp' },
  romance: { label: '恋爱', cls: 'rom' },
  cover: { label: '掩护', cls: 'cov' },
  npc: { label: '关系', cls: 'npc' },
  brother: { label: '哥哥', cls: 'bro' },
  event: { label: '事件', cls: 'evt' }
};
function onPopLog() {
  var E = GS.entSim;
  var logs = (E.careerHistory || []).slice().reverse();
  var html = logs.length ? logs.map(function(h) {
    var meta = _popLogTypeMeta[h.type] || { label: h.type, cls: 'etc' };
    return '<div class="es-pop-log-item"><small>Day' + (h.day != null ? h.day : h.round) + '</small>' +
      '<span class="es-pop-tag ' + meta.cls + '">' + meta.label + '</span>' + escHtml(h.text) + '</div>';
  }).join('') : '<div class="es-empty">暂无变动记录</div>';
  showEntSimModal('📈 人气变动日志', '<div class="es-pop-log">当前人气：<b>' + popularity() + '</b>（' + careerLevel() + '）· 累计曝光：<b>' + ((E.misc && E.misc.exposureAccum) || 0) + '</b></div>' + html, [{ id: 'close', label: '关闭' }]);
}

// ---------- 📱 手机框弹窗：聊天 ----------
function showEntSimChatModal() {
  var E = GS.entSim;
  var ml = (E.romance && E.romance.maleLead) || { name: '他' };
  var memberName = ml.name;
  var memberEmoji = '💜';

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';

  var msgsHtml = '';
  var history = E.chatHistory || [];
  for (var i = 0; i < history.length; i++) {
    var c = history[i];
    var cContent = typeof c.content === 'string' ? c.content : (c.content && c.content.text ? c.content.text : String(c.content || ''));
    msgsHtml += c.role === 'user'
      ? '<div class="oneheart-chat-msg user">' + escHtml(cContent) + '</div>'
      : '<div class="oneheart-chat-msg ai">' + escHtml(cContent) + '</div>';
  }
  if (!msgsHtml) msgsHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">开始和 ' + escHtml(memberName) + ' 聊天吧 💬</div>';

  overlay.innerHTML = '<div class="modal-content es-phone-shell" style="width:92%;max-width:420px;padding:0;overflow:hidden;border-radius:16px">' +
    '<button class="modal-close-x" id="esChatClose">✕</button>' +
    '<div class="oneheart-chat-modal">' +
    '<div class="oneheart-chat-header"><span class="oneheart-chat-avatar">' + memberEmoji + '</span><span class="oneheart-chat-name">' + escHtml(memberName) + '</span></div>' +
    '<div class="oneheart-chat-messages" id="esChatMsgs">' + msgsHtml + '</div>' +
    '<div class="oneheart-chat-input-area">' +
    '<input class="oneheart-chat-input" id="esChatInput" placeholder="输入消息...">' +
    '<button class="oneheart-chat-send" id="esChatSend">发送</button>' +
    '</div></div></div>';

  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); } });
  document.getElementById('esChatClose').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });

  var chatMsgs = document.getElementById('esChatMsgs');
  function scrollMsgs() { if (chatMsgs) chatMsgs.scrollTop = chatMsgs.scrollHeight; }
  setTimeout(scrollMsgs, 50);

  function doSend() {
    var input = document.getElementById('esChatInput');
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = ''; input.disabled = true;
    document.getElementById('esChatSend').disabled = true;

    var userDiv = document.createElement('div');
    userDiv.className = 'oneheart-chat-msg user'; userDiv.textContent = text;
    chatMsgs.appendChild(userDiv);
    var typingDiv = document.createElement('div');
    typingDiv.className = 'oneheart-chat-typing'; typingDiv.textContent = memberName + ' 正在输入...';
    chatMsgs.appendChild(typingDiv);
    scrollMsgs();

    // 好感度影响"正在输入"时长
    var aff = E.affection || 0;
    var wait = aff >= 60 ? (500 + Math.random() * 500) : (aff >= 20 ? (1500 + Math.random() * 1500) : (3000 + Math.random() * 2000));
    setTimeout(function() {
      generateEntSimChat(text).then(function(reply) {
        chatMsgs.removeChild(typingDiv);
        if (reply) {
          var aiDiv = document.createElement('div');
          aiDiv.className = 'oneheart-chat-msg ai'; aiDiv.textContent = reply;
          chatMsgs.appendChild(aiDiv);
        }
        input.disabled = false;
        document.getElementById('esChatSend').disabled = false;
        input.focus();
        scrollMsgs();
      }).catch(function() {
        chatMsgs.removeChild(typingDiv);
        input.disabled = false;
        document.getElementById('esChatSend').disabled = false;
      });
    }, wait);
  }

  document.getElementById('esChatSend').addEventListener('click', doSend);
  document.getElementById('esChatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
}

// ---------- 📱 手机框弹窗：朋友圈 ----------
function showEntSimMomentsModal() {
  var E = GS.entSim;
  var ml = (E.romance && E.romance.maleLead) || { name: '他' };
  var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '我';
  var moments = E.moments || [];

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';

  var itemsHtml = '';
  if (moments.length === 0) {
    itemsHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有朋友圈动态 📸</div>';
  } else {
    for (var i = moments.length - 1; i >= 0; i--) {
      var m = moments[i];
      var ts = m.ts ? new Date(m.ts) : new Date();
      var timeStr = (ts.getMonth() + 1) + '月' + ts.getDate() + '日 ' + ts.getHours() + ':' + String(ts.getMinutes()).padStart(2, '0');
      var posterName = m.name || (m.isHeroine ? hpName : ml.name);
      var isHer = m.isHeroine;
      itemsHtml += '<div class="oneheart-moment-card">' +
        '<div class="oneheart-moment-time">' + (isHer ? '📸 ' : '💜 ') + escHtml(timeStr) + ' · ' + escHtml(m.type || '日常') + '</div>' +
        (m.photo ? '<div class="oneheart-moment-photo">📷 ' + escHtml(m.photo) + '</div>' : '') +
        '<div class="oneheart-moment-content"><strong>' + escHtml(posterName) + '</strong> ' + escHtml(m.post || '') + '</div>' +
        (m.reply ? '<div class="oneheart-moment-reply">└ <strong>' + escHtml(m.isHeroine ? (ml.name || '他') : hpName) + '</strong> ' + escHtml(m.reply) + '</div>' : '') +
        (m.replyBack ? '<div class="oneheart-moment-reply">　 <strong>' + escHtml(posterName) + '</strong> ' + escHtml(m.replyBack) + '</div>' : '') +
        (m.rivalComment ? '<div class="oneheart-moment-rival">⚡ ' + escHtml(m.rivalComment) + '</div>' : '') +
        '<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">❤️ ' + (m.liked ? '已赞' : '点赞') + '</div>' +
      '</div>';
    }
  }

  overlay.innerHTML = '<div class="modal-content es-phone-shell" style="width:92%;max-width:420px;padding:0;overflow:hidden;border-radius:16px">' +
    '<button class="modal-close-x" id="esMomentsClose">✕</button>' +
    '<div class="oneheart-chat-modal">' +
    '<div class="oneheart-chat-header"><span>📸</span><span class="oneheart-chat-name">朋友圈</span></div>' +
    '<div class="oneheart-chat-messages" style="padding:12px">' + itemsHtml + '</div>' +
    '<div style="padding:10px"><button class="es-btn primary es-wide" id="esGenMoment">生成新动态</button></div>' +
    '</div></div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); } });
  document.getElementById('esMomentsClose').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });
  var genBtn = document.getElementById('esGenMoment');
  if (genBtn) {
    genBtn.addEventListener('click', function() {
      genBtn.disabled = true; genBtn.textContent = '生成中…';
      generateEntSimMoment().then(function() {
        overlay.remove();
        showEntSimMomentsModal();
      }).catch(function() { overlay.remove(); });
    });
  }
}

// ---------- 📱 手机框弹窗：秘密信箱 ----------
function showEntSimLetterModal() {
  var E = GS.entSim;
  var ml = (E.romance && E.romance.maleLead) || { name: '他' };
  var letters = E.letters || [];

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';

  var itemsHtml = '';
  for (var i = letters.length - 1; i >= 0; i--) {
    var l = letters[i];
    var ts = l.ts ? new Date(l.ts) : new Date();
    var dateStr = (ts.getMonth() + 1) + '月' + ts.getDate() + '日';
    itemsHtml += '<div class="es-letter-card">' +
      '<div class="es-letter-date">💌 ' + escHtml(ml.name) + ' · ' + escHtml(dateStr) + '</div>' +
      '<div class="es-letter-body">' + escHtml(l.content || '') + '</div>' +
    '</div>';
  }
  if (!itemsHtml) itemsHtml = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有收到信件 💌<br>每 7-10 轮自动生成一封</div>';

  overlay.innerHTML = '<div class="modal-content es-phone-shell" style="width:92%;max-width:420px;padding:0;overflow:hidden;border-radius:16px;display:flex;flex-direction:column;height:75vh">' +
    '<button class="modal-close-x" id="esLetterClose">✕</button>' +
    '<div class="oneheart-chat-modal">' +
    '<div class="oneheart-chat-header"><span>💌</span><span class="oneheart-chat-name">秘密信箱</span></div>' +
    '<div style="flex:1;overflow-y:auto;padding:12px">' + itemsHtml + '</div>' +
    '</div></div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); } });
  document.getElementById('esLetterClose').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); overlay.remove(); });
}

// ---------- 📱 手机框弹窗：剧场 ----------
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
    '<h3 style="text-align:center;margin-bottom:12px">🎬 ' + escHtml(title) + '</h3>' +
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
    '<h3 style="text-align:center;margin:12px 0 8px">📝 日记 & 碎片</h3>' +
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
    overlay.addEventListener('click', function(e) { if (e.target === overlay && !btns) { closeEntSimModal(); resolve(null); } });
  });
}
function closeEntSimModal() { if (_modalEl && _modalEl.parentNode) { _modalEl.parentNode.removeChild(_modalEl); _modalEl = null; }
}

// ---------- 营业反馈（三色卡片 + 历史卡片化） ----------
function onFanReaction() {
  var E = GS.entSim;
  var list = E.fanReactions || [];
  if (!list.length) { showToast('还没有营业反馈——发生曝光/营业事件后会出现粉丝圈反应'); return; }
  var latest = list[list.length - 1];
  // 解析最新反馈三段：·大粉： / ·路人： / ·黑粉：
  var parts = { fan: '', passer: '', hater: '' };
  var raw = latest.text || '';
  var m1 = raw.match(/·大粉[：:]([\s\S]*?)(?=·路人[：:]|·黑粉[：:]|$)/);
  var m2 = raw.match(/·路人[：:]([\s\S]*?)(?=·黑粉[：:]|$)/);
  var m3 = raw.match(/·黑粉[：:]([\s\S]*?)$/);
  if (m1) parts.fan = m1[1].trim();
  if (m2) parts.passer = m2[1].trim();
  if (m3) parts.hater = m3[1].trim();
  // 三段卡
  var cards = '';
  if (parts.fan) cards += '<div class="es-fan-card es-fan-pink"><div class="es-fan-card-icon">💗 大粉</div><div class="es-fan-card-body">' + escHtml(parts.fan) + '</div></div>';
  if (parts.passer) cards += '<div class="es-fan-card es-fan-blue"><div class="es-fan-card-icon">😐 路人</div><div class="es-fan-card-body">' + escHtml(parts.passer) + '</div></div>';
  if (parts.hater) cards += '<div class="es-fan-card es-fan-dark"><div class="es-fan-card-icon">⚡ 黑粉</div><div class="es-fan-card-body">' + escHtml(parts.hater) + '</div></div>';
  if (!cards) cards = '<div class="es-fan-card es-fan-blue"><div class="es-fan-card-body">' + escHtml(raw) + '</div></div>'; // 兜底

  // 触发事件区块
  var eventBlock = '';
  if (latest.event) {
    eventBlock = '<div class="es-fan-event"><div class="es-fan-event-label">📌 触发事件</div><div class="es-fan-event-body">' + escHtml(latest.event) + '</div></div>';
  }

  var html = '<div class="es-fanreact">' +
    '<div class="es-fanreact-head">📝 营业反馈 · 第 ' + latest.round + ' 回合</div>' +
    eventBlock +
    '<div class="es-fanreact-reason">' + (latest.reason ? '<span class="es-fan-badge">' + escHtml(latest.reason) + '</span>' : '') + '</div>' +
    '<div class="es-fan-cards">' + cards + '</div>' +
    '</div>';
  showEntSimModal('📱 粉丝圈反应', html, [{ id: 'close', label: '关闭'}]);
}

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
    // 已有缓存：自动展示回复
    var cacheKey = type + '_' + idx;
    var E = GS.entSim;
    E.buzzReplies = E.buzzReplies || {};
    var cached = E.buzzReplies[cacheKey];
    if (cached && cached.lines) {
      renderBuzzReplies(cached.lines);
      var expandBtn2 = document.getElementById('es-buzz-expand');
      if (expandBtn2) { expandBtn2.disabled = true; expandBtn2.textContent = '✅ 已展开'; }
    }
    // 非女主相关：直接从池子抽 2 条展示，不需要点击
    if (!isHeroineRelated(item) && !cached) {
      var pool = BUZZ_COMMENT_POOL.slice();
      var autoLines = [];
      for (var ai = 0; ai < 2 && pool.length; ai++) {
        var ri = Math.floor(Math.random() * pool.length);
        autoLines.push(pool.splice(ri, 1)[0]);
      }
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
    // AI 失败时回退到池子
    if (!lines || lines.length < 2) {
      var pool = BUZZ_COMMENT_POOL.slice();
      lines = [];
      for (var i = 0; i < 2 && pool.length; i++) {
        var ri = Math.floor(Math.random() * pool.length);
        lines.push(pool.splice(ri, 1)[0]);
      }
    }
  } else {
    // 非女主条目 → 预写池子随机抽 2 条
    var n = 2;
    var pool2 = BUZZ_COMMENT_POOL.slice();
    lines = [];
    for (var j = 0; j < n && pool2.length; j++) {
      var ri2 = Math.floor(Math.random() * pool2.length);
      lines.push(pool2.splice(ri2, 1)[0]);
    }
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
  var flavor = TEAMMATE_FLAVOR[sis.roleTag] || '队友找你聊了聊近况。';
  var html = '和 <b>' + escHtml(sis.name) + '（' + escHtml(sis.roleTag) + '）</b> 聊聊？<br><br>' + escHtml(flavor);
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
      '<button id="es-ending-close" class="ghost">关闭</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  var closeBtn = document.getElementById('es-ending-close');
  var restartBtn = document.getElementById('es-ending-restart');
  if (closeBtn) closeBtn.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); });
  if (restartBtn) restartBtn.addEventListener('click', function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); restartEntSim(); });
}

// ---------- 好感阶段升级仪式感 ----------
function showStageUpCeremony() {
  var p = GS._entSimStageUpPending;
  if (!p) return;
  GS._entSimStageUpPending = null;
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
