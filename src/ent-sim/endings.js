// ============================================================
// 系统10 结局：全维度矩阵 v4
// 好感度(5档) × 曝光(5档) × 事业(3档) × 告白状态 × 哥哥立场
// 含 情敌隐藏结局(需rivalConfessionAccepted) + HIDDEN_ROUTE_POOL
// ============================================================
import { GS } from '../state.js';
import { getExposureTier } from './public-opinion.js';
import { popularity, careerLevel } from './state.js';
import { affectionDepth } from './romance.js';
import { HIDDEN_ROUTE_POOL } from './pools/hidden-route.js';

// 结局矩阵：好感×曝光×事业×告白状态×哥哥立场 → 12+种结局
function pickEnding(tier, careerLv, depth, confessResult, brotherStance, rivalLean) {
  var E = GS.entSim;
  var aff = E.affection || 0;
  var unlock = E.romance ? { stage: E.romance.confessionDone ? 3 : (depth >= 4 ? 2 : depth >= 2 ? 1 : 0) } : { stage: 0 };

  // ── 隐藏结局(1)：情敌隐藏结局——必须玩家主动接受情敌告白 ──
  if (E.flags && E.flags.rivalConfessionAccepted && rivalLean >= 50 && aff < 40) {
    return { type: 'hidden_rival', label: '藏在掌声里的他',
      text: '你最终走向了那个一直站在你身边的人。男主成了回忆里最亮的光——不是遗憾，是你们选择的路不同。他在安可舞台上看到的第一排，是你的位置。', icon: '💞' };
  }

  // ── 隐藏结局(2)：独美封神——顶流事业+无恋爱线 ──
  if ((careerLv === '传奇' || careerLv === '顶流' || (E.career.popularity || 0) >= 85) && aff < 20) {
    return { type: 'hidden_solo', label: '独美封神',
      text: '你把所有热爱给了舞台，单身亦封神。聚光灯下没有恋爱的位置，但有你的整个时代。', icon: '👑' };
  }

  // ── 隐藏路线(3)：HIDDEN_ROUTE_POOL 特殊触发 ──
  // 修复: 原逻辑遍历每条都有30%概率，N条同时满足时触发率=1-0.7^N几乎必然触发
  // 改为: 先收集所有满足条件的条目，随机选1条，再按30%概率决定是否触发
  if (HIDDEN_ROUTE_POOL && HIDDEN_ROUTE_POOL.length) {
    var matched = [];
    for (var hi = 0; hi < HIDDEN_ROUTE_POOL.length; hi++) {
      var hr = HIDDEN_ROUTE_POOL[hi];
      var meets = true;
      if (hr.require) {
        var rq = hr.require.split('&&');
        for (var ri = 0; ri < rq.length && meets; ri++) {
          var item = rq[ri].trim();
          if (item.indexOf('aff>=') === 0 && aff < parseInt(item.slice(5), 10)) meets = false;
          if (item.indexOf('popularity>=') === 0 && (E.career.popularity || 0) < parseInt(item.slice(11), 10)) meets = false;
        }
      }
      if (meets) matched.push(hr);
    }
    if (matched.length && Math.random() < 0.3) {
      var picked = matched[Math.floor(Math.random() * matched.length)];
      return { type: 'hidden_route', label: '隐藏路线',
        text: picked.text, icon: '🔮' };
    }
  }

  // ── HE 系列：必须已接受告白 + 哥哥不反对公开 ──
  var brotherOk = (brotherStance === '支持' || brotherStance === '参谋' || brotherStance === '观望' || !brotherStance);
  var pop = (E.career && typeof E.career.popularity === 'number') ? E.career.popularity : 0;
  if (confessResult === 'accepted') {
    // HE1: 公开童话 — 高好感+顶流+安全曝光+公开线
    if (depth >= 5 && pop >= 75 && (tier === '安全' || tier === '暗涌') && E.romance && E.romance.publicLine) {
      return { type: 'he_public_fairytale', label: '台前的童话',
        text: '你们大方牵手走上红毯，全网祝福。不是藏不住了才公开——是爱到了再也藏不住。记者问他恋爱秘诀，他说"她是我的全部歌词"。', icon: '💍' };
    }
    // HE2: 顶流地下永久 — 高好感+顶流+高曝光风险+不公开
    if (depth >= 4 && pop >= 75 && (tier === '升温' || tier === '哗然') && !(E.romance && E.romance.publicLine)) {
      return { type: 'he_underground_top', label: '顶流地下恋',
        text: '你们在娱乐圈最顶端各自闪耀，在无人处相拥。没有人知道——当他在颁奖礼上对你微不可察地点头时，那句话是"我爱你"。你们的秘密比所有奖杯都重，但也比所有奖杯都珍贵。', icon: '🌙' };
    }
    // HE3: 二线甜蜜 — 中人气+甜蜜恋情
    if (depth >= 3 && pop >= 20 && pop < 75 && brotherOk) {
      return { type: 'he_sweet_mid', label: '恰好的距离',
        text: '你们不是最红的，但在一起是最对的。偶尔被拍到戴口罩逛街——粉丝说"看起来像"。你们笑着否认，然后继续在便利店买他爱喝的香蕉牛奶和你爱喝的巧克力奶。你们用不多的人气换了一个刚好的距离。', icon: '💝' };
    }
    // HE4: 糊团小幸福 — 低人气+温暖恋情
    if (pop < 20 && depth >= 2 && brotherOk) {
      return { type: 'he_low_warm', label: '我们的那道光',
        text: '别人都在追顶流，你们在照顾彼此。没有狗仔跟拍，没有公司压力——你们的恋情藏得不用太费劲，因为本来就没有太多人关注。但每个凌晨练习结束，他都在楼下等你——不是避风港，是你要回的同一个方向。你不红，但有人每天都为你留灯。', icon: '💡' };
    }
    // HE5: 甜宠相守 — 通用HE
    if (depth >= 3 && brotherOk && tier !== '引爆') {
      return { type: 'he_sweet', label: '甜宠相守',
        text: '从练习室到万人舞台，从偷瞄到十指相扣。哥哥终于点了头——他说"好好对我妹妹"。队长在群聊里发了一个"终于"的表情包。', icon: '💝' };
    }
    // HE6: 地下永久 — 安全/暗涌曝光(恋情藏得好)
    if (tier === '安全' || tier === '暗涌') {
      return { type: 'he_underground', label: '地下永久',
        text: '事业巅峰，爱情藏得滴水不漏。你们在无人处相拥，在聚光灯下相视而笑——只有你们知道那微笑的含义。你们把彼此写进歌里，只有彼此听得出来。', icon: '🌙' };
    }
  }

  // ── NE 系列 ──
  // NE1: 和平分手 — 告白过但好感冷却
  if (confessResult === 'accepted' && depth < 3) {
    if (pop >= 50) {
      return { type: 'ne_breakup_busy', label: '和平分手',
        text: '聚少离多，默契地松开手。不是不爱了——是爱被日程推散了。最后一次约会，你们交换了对方的专辑。他说"下个季度回归，我会给你留一张票"——然后你们没有再联系。', icon: '🌿' };
    }
    return { type: 'ne_breakup', label: '安静的告别',
      text: '没有争吵，没有曝光——你们只是在某个凌晨练习室互道了晚安之后，没再说过早安。不是谁的错，只是喜欢变淡了。多年后你听到他的新歌，发现副歌还是你熟悉的和弦走向。你笑了——不是难过。', icon: '🍂' };
  }
  // NE2: 远距离 — 未告白 + 中等好感 + 事业错开
  if (confessResult !== 'accepted' && depth >= 2) {
    return { type: 'ne_distance', label: '远距离光环',
      text: '你的巡演和他的回归完美错开。偶尔在音乐节目后台四目相对——点头、微笑、擦肩。你们在不同的平行线里各自闪耀。粉丝说"他们看起来像认识"，你们都知道不是"像"。', icon: '🌌' };
  }
  // NE3: 暧昧未明 — 有好感但告白被拖延/未发生
  if (depth >= 1 && confessResult !== 'accepted') {
    return { type: 'ne_ambiguous', label: '暧昧未明',
      text: '谁也没先开口。故事停在最好也最遗憾的节点——那时你总想"下一次"，但他已经在下一个路口。你写的歌里有一句只有他听得懂的词，但你也知道——他不会点开听了。', icon: '🌸' };
  }

  // ── BE 系列 ──
  // BE1: 曝光塌房 — 引爆/哗然
  if (tier === '引爆' || tier === '哗然') {
    return { type: 'be_collapse', label: '曝光即塌房',
      text: '恋情在你事业最低谷被曝光。热搜挂了三天，脱粉站开了八个。你删掉了所有泡泡记录，注销了小号。那张偷拍照成了最后一张你们在一起的照片——背景是凌晨三点的汉江。', icon: '⛈️' };
  }
  // BE2: 哥哥反对 — 哥哥protective + 中低好感
  if ((brotherStance === '反对公开' || brotherStance === '反对') && aff < 50) {
    return { type: 'be_brother_against', label: '哥哥的视线',
      text: '哥哥发现了。他说"你是偶像，他是队友，你们不可以。"你第一次看到他这样看着你——不是SEVENTEEN的队长，是和你一起长大的哥哥。最终你先放开了手。', icon: '💔' };
  }
  // BE3: 情敌上位 — 女主对男主好感低+情敌告白被接受
  if (aff < 30 && rivalLean >= 60) {
    return { type: 'be_rival_wins', label: '恰到好处的陪伴',
      text: '他一直等你——不是以"情敌"的姿态，是以"愿意等待的人"的姿态。某天你看到他一个人在公司楼下啃三明治——那个画面让你想起自己也曾这样等过别人。你所决定不再让任何人等了——包括自己。', icon: '💞' };
  }
  // BE4: 糊团自卑放手 — 低人气+好感不足
  if (pop < 15 && aff < 40 && confessResult !== 'accepted') {
    return { type: 'be_insecurity', label: '还差一个台阶',
      text: '你觉得你们之间的距离不是练习室到录音室——是两个人气档位之间的距离。他值得更好的人——你告诉自己。后来你在便利店听到他的歌，放下手里的年糕——那首歌的钢琴前奏很像你以前写过的。只是他不会知道。', icon: '🥀' };
  }

  // ── 默认：事业向 ──
  if (pop >= 75) {
    return { type: 'ne_solo_rising', label: '独自闪耀',
      text: '事业正在上升期，恋爱还没开始。站在颁奖台的那一刻你想——也许这就是你的路。未来还很长，恋爱可以等。', icon: '🌱' };
  }

  // 保底结局
  return { type: 'be_fade', label: '渐行渐远',
    text: '你们在同一个娱乐圈里越来越远。偶尔在新闻里看到彼此——那眼神像认识，又像只是听说过。他用你以前常喝的咖啡点了一单杯，店员问他名字——他说不用写。', icon: '🍂' };
}

// 评估结局（终局调用）
export function evaluateEnding() {
  var E = GS.entSim;
  var tier = getExposureTier().tier; // 安全/暗涌/升温/哗然/引爆
  var careerLv = careerLevel();       // 新人/稳步/顶流/传奇/挣扎
  var depth = affectionDepth(E.affection); // 0-5 恋爱深度
  var confessResult = (E.romance && E.romance.confessionResult) ? E.romance.confessionResult : 'none';
  var brotherStance = (E.brother && E.brother.stance) ? E.brother.stance : '';
  var rivalNode = E.npcNetwork && E.npcNetwork.nodes ? E.npcNetwork.nodes['npc_suitor'] : null;
  var rivalLean = rivalNode ? (rivalNode.intimacy || 0) : 0;

  var ending = pickEnding(tier, careerLv, depth, confessResult, brotherStance, rivalLean);

  // 事业线结局
  var pop = (E.career && E.career.popularity) ? E.career.popularity : 0;
  if (pop >= 80) ending.careerOutcome = { tier: '顶流', desc: '你成为无可争议的顶级艺人' };
  else if (pop >= 50) ending.careerOutcome = { tier: '稳步', desc: '稳扎稳打走着自己的路' };
  else ending.careerOutcome = { tier: '挣扎', desc: '演艺圈不易，但你还在坚持' };

  E.endings = {
    hint: ending.label,
    locked: true,
    type: ending.type,
    eligible: true,
    text: ending.text,
    icon: ending.icon || ''
  };
  return ending;
}

export function getEndingHint() {
  return GS.entSim && GS.entSim.endings ? (GS.entSim.endings.hint || '') : '';
}
