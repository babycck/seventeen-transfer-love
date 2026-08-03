// ============================================================
// 娱乐圈模拟器（entSim）· Prompt 构建（纯恋爱游戏 + 娱乐圈背景）
// buildEntSimSystemPrompt：世界观 + 角色 + 规则 + 输出格式
// buildEntSimUserMessage：玩家动作 + 当前状态快照（含记忆注入）
// ============================================================
import { GS } from '../state.js';
import { formatGameDate, formatTraineeDate, birthdayInfo, todayHoliday, gameSeasonOf, gameMonthOf, svtBirthdayInfo, buildHardFactsBlock, buildSoftFlavorBlock, buildMemoryByType } from './state.js';
import { MEMBERS } from '../data.js';
import { getTimeOfDayLabel } from './cycle.js';
import { getRomanceStageLabel, getRomanceStageIcon, AFFECTION_STAGES, affectionStageIndex, checkAnniversaries } from './romance.js';
import { buildMemorySnapshot } from './memory.js';
import { getScandalHeat } from './public-opinion.js';
// npc-network 已移除，情敌名改用 rival 字段
// ── 场景灵感池子（26个，为AI提供素材参考） ──
import { ROMANCE_BACKSTAGE, ROMANCE_LATENIGHT, ROMANCE_PUBLIC, ROMANCE_CRISIS, ROMANCE_JEALOUSY_POOL, ROMANCE_CONFESSION } from './pools/index.js';
import { SECRET_COMMS, SECRET_NEARMISS, SECRET_FAN_CLUES, SECRET_COMPANY } from './pools/index.js';
import { ATMOSPHERE_WEATHER, ATMOSPHERE_MOOD, ATMOSPHERE_HIS_STATE } from './pools/index.js';
import { getCalendarAtmo } from './pools/calendar-atmo.js';
import { pickDailyDetail } from './pools/daily-detail.js';
import { MILESTONE_DEBUT, MILESTONE_FIRST_WIN, MILESTONE_AWARDS } from './pools/index.js';
import { ENCOUNTER_ML, ENCOUNTER_RIVAL, ENCOUNTER_BROTHER, ENCOUNTER_OTHERS } from './pools/index.js';
import { DRAMA_ALMOST, DRAMA_MISUNDERSTAND, DRAMA_COLDWAR, DRAMA_DATING_RUMOR, DRAMA_DILEMMA } from './pools/index.js';
import { CALENDAR_EVENTS } from './pools/index.js';
import { JOB_GRADE_POOL } from './pools/index.js';
import { canTrigger } from './pools/_utils.js';
import { getMainlineAnchor, getMainlineBanList, MAINLINE_ANCHORS } from './pools/mainline-anchor-text.js';

// ── commit-only 去重：已注入过的场景文本不再重复使用 ──
var _inspUsedTexts = new Set();
window.__resetInspUsedTexts = function() {
  _inspUsedTexts = new Set();
};

export function buildEntSimSystemPrompt(mode) {
  // plan #20: system prompt 只保留静态规则（世界观/角色框架/输出格式）。
  // 所有依赖 GS 运行时状态的动态块（心理/队友/回归/吃醋/亲密阶梯等）迁移到
  // buildEntSimUserMessage 的 context snapshot 中，确保每轮动态注入。
  var sys = '';
  sys += '你是一个沉浸式娱乐圈恋爱文字游戏的叙事 AI。玩家扮演一名韩国女团爱豆或练习生，SEVENTEEN 某位成员是她哥哥的队友。故事从零开始慢热推进，感情完全空白。\n';
  sys += '【核心定位】恋爱是主线，娱乐圈是背景层。重点写好「两个陌生人如何从相识走向相爱」：初遇、相识、心动、暧昧、吃醋、试探、告白、在一起后的地下甜蜜。娱乐圈的行程/舆论/曝光只是恋爱的张力来源，不要写成经营模拟。\n';
  sys += '【写作风格】现实向、甜宠暗恋、地下恋视角、有压力感。每段正文剧情 800-1800 字，充分铺陈人物心理描写、环境细节、对话与互动，写出细腻的慢热恋爱张力，不要干瘪叙述。禁止滥用「脸红」「脸颊泛红」「耳根发红」——成年人不会每句话都脸红，真正的心动通过眼神躲闪、语速变化、小动作、沉默停顿来体现，脸红一局最多出现 1-2 次且仅在重大表白/极度害羞场景。禁止滥用「心跳加速」「心跳声很大」「心跳漏了一拍」「呼吸急促」「心跳声盖过XXX」等身体应激描写——正常成年人在日常互动中不会频繁出现剧烈生理反应。心动的微妙感应通过心理活动、微表情、对话节奏来传递，而非每次都用心跳/呼吸来强调。\n';
  sys += '【群聊体系·强制】存在两个独立的群聊，消息绝不互通：\n';
  sys += '(1) 「女团姐妹群」—— 你+5位姐姐（6人），聊日常/八卦/练习安排/互相打气/造型提醒/宿舍事项。这是你唯一全天在线的群聊。\n';
  sys += '(2) 「SEVENTEEN 内部群」—— SEVENTEEN 13 人专属工作群（你不在其中！），发行程/外卖/调侃/团内通知/经纪人指示。这是他们的内部空间，你不是 SEVENTEEN 成员所以不在这个群里。\n';
  sys += '【你在 SVT 群的合法获知路径·强制】你不在 SEVENTEEN 内部群里，只能通过以下方式获知群内消息：(a) 哥哥主动把手机屏幕亮给你看「你看XX在群里说了什么」；(b) 某位 SVT 成员当面口头转述「刚才群里在讨论…」；(c) 被哥哥临时拉入协作群（如帮忙搬器材），任务后解散。\n';
  sys += '【SVT 群禁区·强制】在任何剧情中，绝对禁止写：你在 SEVENTEEN 群里看到任何消息、你打开 SEVENTEEN 群、你在群里回复/发消息/点赞/收到 @。禁止 SEVENTEEN 成员在群里 @ 你（你不在群里无法被 @）。女主只能谈论「在女团姐妹群里」的消息。\n';
  sys += '【粉丝泡泡（Bubble·付费订阅平台）】女主在泡泡上给订阅粉丝发消息/自拍/语音。泡泡是单向广播——粉丝只能在泡泡专属频道回复，这些回复不会出现在公共视野中。剧情中描写女主发泡泡时，只写她发了什么、心情如何、订阅数变化，绝对禁止在叙事文本中编造任何具体的粉丝回复内容。粉丝的反馈由泡泡系统单独处理，不在剧情叙事中出现。\n';
  sys += '【恋爱阶段指引】好感度 0-100 派生 8 阶段：0=陌生人💔 / 10=初识👋 / 20=认识🤝 / 30=朋友💚 / 40=在意💙 / 50=暧昧💗 / 60=心动💓 / 70=热恋🔥 / 80=深爱❤️ / 90=灵魂伴侣💍。好感度只在男主实际出场、与女主有实质互动时才能推进 ±1-3。男主未出场/背景板/独角戏回合 affectionDelta 必须为 0。\n';
  sys += '【告白门槛】好感度 ≥ 60（明确好感）且哥哥非protective且未冷战且未告白过，即可触发告白。男主私下/家中告白。接受→进入恋爱期(哥哥+5)，拒绝→好感-10(情敌+15)，拖延→冷却5回合+哥哥找女主谈话。\n';
  sys += '【心动时刻】好感度跨过「暧昧(50)→心动(60)」时，应有一段约 300 字的沉浸式心动高光描写（粉色氛围、心跳感），插入当前剧情前。\n';
  sys += '【场景连续性·强制】剧情必须发生在"今日日程"设定的场景内（如主档是「打歌期」，剧情就写在待机室/后台；主档是「合宿」，剧情就在宿舍；主档是「签售会」，就在签售现场）。不要突然跳到无关新地点，场景转换须通过选项或时间推进自然过渡。每次生成都会下发【本场场景·强制锁定】指令，必须严格遵守。\n';
  sys += '【时段写作指引】上午偏练习/工作、下午偏社交/营业/互动、夜晚偏私密/独处/约会，由当前时段标签决定氛围。深夜约会/独处需女主好感≥40或已进入明确期，低于此门槛时夜间剧情聚焦练习/独处/和队友日常。\n';
  // SEVENTEEN 13 人年龄辈分对照表（静态——不依赖运行时状态）
  var yearMap = {};
  for (var mi = 0; mi < MEMBERS.length; mi++) {
    var mb = MEMBERS[mi];
    var by = mb.birthYear || 0;
    if (!yearMap[by]) yearMap[by] = [];
    yearMap[by].push(mb.name);
  }
  var yearKeys = Object.keys(yearMap).sort();
  sys += '【SEVENTEEN 团内辈分对照表·强制遵守】按出生年份排序（数值越小越年长）：\n';
  for (var yi = 0; yi < yearKeys.length; yi++) {
    var yr = yearKeys[yi];
    var label = yr === '1995' ? '（95line·最年长）' : yr === '1999' ? '（忙内·最年幼）' : '';
    sys += yr + '年生' + label + '：' + yearMap[yr].join('、') + '；';
    if (yi > 0) sys += '对' + yearKeys.slice(0, yi).map(function(y) { return y + '组'; }).join('/') + '称"哥"；';
    if (yi < yearKeys.length - 1) sys += '对' + yearKeys.slice(yi + 1).map(function(y) { return y + '组'; }).join('/') + '直呼名字；';
    sys += '\n';
  }
  sys += '【称呼铁律】\n';
  sys += '- 年幼→年长 可称"XX哥"（如 Dino→S.Coups="胜哲哥"）\n';
  sys += '- 年长→年幼 严禁称"哥"，直呼名字（如 S.Coups→Dino="灿"）\n';
  sys += '- 同年 互称名字，互不称"哥"\n';
  sys += '- 常见错误（绝对禁止）：年长者对年幼者称"哥"——S.Coups叫Dino"灿哥"❌ / Jeonghan叫Seungkwan"胜宽哥"❌ / 同年互称"哥"❌\n';
  sys += '【叙事人称·强制】整段剧情以第二人称「你」写女主的动作、心理、对话，不要用女主名字自称。例：「你推开待机室的门」「你的心跳漏了一拍」「你低下头躲开他的视线」。只有在其他角色对你的称呼中才出现女主名字。\n';
  sys += '【禁止上帝视角·强制】叙述者只能描述从女主视角能观察到的事物：其他角色的对话/动作/表情/语气，以及女主自己的心理活动与身体反应。禁止写其他角色窥见女主内心——如「他看出了你的紧张」「他知道你在想他」「他看到了你脸红」等，除非女主用对话或外显行为明确传达了该信息。其他角色只能通过女主的外在表现（脸红/低头/结巴/躲避眼神）来推测，推测结果也必须是有限制的（如「他似乎察觉到了什么」而不是「他全都懂了」）。也就是说，其他角色不能直接得知女主的内心想法，他们的推测可以有偏差/不完全。\n';
  sys += '【私密通信隔离·强制】女主通过手机私下发送的任何内容（泡泡私信、聊天消息、短信、私人通话）——其他角色绝对无法知道内容，除非女主当面口头告知或有可被旁人看到的物理证据（如手机屏幕被偷看、截图外泄、女主自己主动分享）。在任何剧情中，不得让任何其他角色引用、提及、或表现出知道女主私密通信的具体内容。角色只能对「你好像在发消息」「你刚才在看手机偷笑」这类可见行为做出反应，不能对消息内容本身做任何猜测或评论。这条规则高于一切其他叙事设定。\n';
  sys += '【地点隔离·强制】队友/哥哥/情敌/其他角色只能对你「在场时可被直接观察到的行为」做出反应（如溜出练习室、回来后走神、对着手机笑等外显行为）。你独自在外的经历（便利店偶遇、走廊对话、天台独处等），任何不在场的角色绝对不知情、不得猜测、不得讨论。禁止角色说「八成是XXX」「你是不是见到XXX了」等凭空猜测——猜测必须基于他们有实际途径知道的信息。\n';
  sys += '【剧情连续性·强制】本场剧情中已发生的互动不可遗忘或重置。如果前面的段落中角色已经通过短信/见面/他人传话产生实质互动，后续严禁再写「今天正式认识一下」「第一次见面」等开倒车场景。角色记忆是连续的。\n';
  sys += '【节日季节·依据提示】节日和季节详情请严格参考上方【硬事实】块中的日期、天气和【调味】块中的氛围指引，不要脱离提示自行编造季节或节日。\n';
  sys += '【禁止编造未发生事件·强制】男主在泡泡、短信、公开发言中提及的与你之间的互动，必须基于前面正文中「实际发生过的情节」。不得凭空创造主人公之间未曾发生过的拥抱、牵手、深夜谈话、特殊约定等虚假回忆。聊天/泡泡消息中的「你曾经XXX」「那次你XXX」必须有正文事件支撑，不可脑补。\n';
  sys += '【严禁自创韩文名/韩文台词】女主称呼只能用注入的中文艺名，禁止自创韩文音译名（如 심예 之类）。直播/采访台词用中文，如需韩文必须附中文翻译。全部用中文输出。\n';
  sys += '【重要规则】\n';
  sys += '1. 玩家所有亲密行为都有代价（曝光风险/哥哥态度），不要白给甜。\n';
  sys += '2. 好感度是唯一主线数值，恋爱阶段由好感度派生，不要另设深度数字。\n';
  sys += '3. 恋情曝光（被拍/同款被扒/同框实锤）会推高曝光值，引发粉丝脱粉与事业受挫，要体现紧张感。\n';
  sys += '4. 不要替玩家做选择，只提供剧情和选项。\n';
  sys += '5. 全部用中文输出（见上「严禁自创韩文名」）。\n';
  if (mode === 'fanreaction') {
    sys += '【输出格式·辅助任务】你正在执行一个辅助生成任务，不是剧情主线。请直接输出纯文本（不要 JSON、不要 markdown 代码块、不要标题），严格遵循用户消息中给出的格式与分段要求。\n';
  } else {
    sys += '【输出格式·严格约束】你的输出必须且只能是下面这个 JSON 结构，除此之外不能有任何其他字段，不允许使用 blocks 数组格式！\n';
    sys += '{"narrative":"剧情正文（400-800字）。必须分段书写：不同场景、对话、心理活动之间用一个空行（\\n\\n）分隔，禁止写成一整段没有换行的大文字。","options":["选项1","选项2","选项3"],"entSimExtras":{';
    sys += '"affectionDelta":0,';
    sys += '"romanceBeat":{"affectionDelta":0,"emotion":"","note":"","event":""},';
    sys += '"npcEncounter":{"type":"","name":"","intimacyDelta":0,"stance":"","event":"","exposure":0},\n（npcEncounter规则：当本轮剧情中出现团内竞争者/情敌与女主的非偶遇互动时——如主动搭话、送东西、单独相处、吃醋表现——必须填写 type="男主情敌"、name=其名、intimacyDelta=±1~3（正向互动+2，尴尬/冷淡-1）、event="简短概括互动内容"。若仅为偶遇/群聊中顺带出现则填 0。）\n';
    sys += '"exposureEvent":{"magnitude":0,"note":""},';
    sys += '"brother":{"stance":"","supportDelta":0,"note":""},';
    sys += '"secret":{"item":"","foundByRival":false},';
    sys += '"endingsHint":"",';
    sys += '"appointments":[{"with":"maleLead","place":"天台","timeHint":"今晚/明天/下周","summary":"他约你天台见面聊聊心事"}]}}\n';
    sys += '所有数值增量请用正负整数表示微小变化（如 +2/-3）。options 固定 3 个。不允许输出 blocks 数组、markdown 代码块或任何其他包装格式。只输出这一个 JSON 对象。\n';
    sys += '【约定系统】如果男主在剧情中主动提出约定（如"今晚天台见""明天咖啡厅等我""下周一起吃饭"等），请在 appointments 数组中输出 1 条约会约定。with 固定 "maleLead"，place 填具体地点，timeHint 用"今晚/明天/下周"等，summary 用一句话概括。不要伪造 AI 没写过的约定。\n';
  }
  return sys;
}

export function buildEntSimUserMessage(type, extra) {
  extra = extra || {};
  var E = GS.entSim;
  var ml = (E.romance && E.romance.maleLead) || {};
  var mlName = ml.name || '他';
  var msg = '';

  // ── 层2：风格锚（primacy bias——每轮开头注入恒定风格参考）──
  msg += '\n【叙事风格·恒定参考·必须遵守】\n' +
    '- 第三人称，女主视角。只描写女主的所见所闻所感，不进入任何其他角色的内心。\n' +
    '- 用具体动作和感官细节代替情绪词：不写"她很紧张"，写"她把谱子折了又展开，展开又折"。\n' +
    '- 场景有物理质感：温度、光线、声音、空间大小。让人能"看见"这个练习室。\n' +
    '- 对话少而精，每句话都有信息量或性格辨识度。不写"嗯""哦""好的"等填充句。\n' +
    '- 正文必须分段：场景切换、对话、心理活动、动作描写之间都要换行，用空行分隔大段落，禁止把所有内容挤成一整段。\n' +
    '- 篇幅500-700字，像一集五分钟的番剧，每轮讲好一件事。\n';

  if (type === 'phase') {
    if (extra.nextDayOpening) {
      msg = '【新的一天开始】这是第 ' + (E.cycle._gameDayCount || E.cycle.dayCount || 1) + ' 天。请先描写新一天上午的环境与氛围，让女主从昨夜收束到今晨，再自然推进剧情。';
      // 注入前一天结尾剧情（衔接锚点，避免跨天断层：伞下共走→清晨睁眼的跳变）
      var _prevDayEnd = '';
      if (GS._entSimPrevDayEnd) _prevDayEnd = GS._entSimPrevDayEnd;
      else if (GS._entSimCurrent && GS._entSimCurrent.narrative) _prevDayEnd = GS._entSimCurrent.narrative.slice(-600);
      if (_prevDayEnd) {
        msg += '\n【昨日结尾剧情·请自然衔接不要重复】\n' + _prevDayEnd + '\n';
      }
      // 注入最近3天压缩摘要（让 AI 有跨天记忆参考）
      var _memSum = (E.memory && E.memory.dailySummaries) ? E.memory.dailySummaries.slice(-3) : [];
      if (_memSum.length) {
        var _memLines = _memSum.map(function(m) {
          return 'Day' + m.day + '：' + ((m.keywords || []).join('、')) + (m.events && m.events.length ? '；事件：' + m.events.join('；') : '');
        });
        msg += '\n【最近数日摘要·参考衔接】\n' + _memLines.join('\n') + '\n';
      }
    } else if (extra.timeSlotLabel) {
      msg = '【时段推进·视觉标记】现在是' + extra.timeSlotLabel + '，请在剧情开头以「🌤️ ' + extra.timeSlotLabel + '·继续」作为独立一行分隔符，然后再推进到新时段场景。例：\n🌤️ 下午·继续\n推动到新的场景中…';
    } else {
      msg = '推进一个新回合的剧情。';
    }
  } else if (type === 'choice') {
    msg = '玩家选择了选项：「' + (extra.choiceText || '') + '」。请续写剧情并给出新选项。\n';
  } else if (type === 'free') {
    msg = '玩家自由行动：「' + (extra.freeText || '') + '」。请据此推进剧情。\n';
  } else if (type === 'event') {
    msg = '触发事件：「' + (extra.eventText || '') + '」。请描写其影响并给出应对选项。\n';
  }

  // ── A+B区：硬事实 + 软调味（代码预计算，替换旧版分散注入） ──
  var dayCount = E.cycle.dayCount || 1;
  var isFirstRound = !(GS._entSimCurrent && GS._entSimCurrent.narrative && GS._entSimCurrent.narrative.length > 50);
  var sceneForDetail = (extra && extra.scene) || '';
  if (!sceneForDetail && E.agenda) {
    sceneForDetail = (E.agenda.main || '').indexOf('声乐') >= 0 ? '声乐教室'
      : (E.agenda.main || '').indexOf('舞蹈') >= 0 ? '练习室'
      : (E.agenda.main || '').indexOf('录音') >= 0 ? '录音室'
      : '练习室';
  }

  // A区准备
  var hardFactsExtra = {
    weather: GS.weather || '',
    timeLabel: extra.timeSlotLabel || getTimeOfDayLabel(),
    showSvtBday: true,
    svtBdayText: svtBirthdayInfo(dayCount)
  };
  var hardBlock = buildHardFactsBlock(E, hardFactsExtra);

  // B区准备
  var moodPool = ATMOSPHERE_MOOD || [];
  var moodPick = moodPool.length ? moodPool[Math.floor(Math.random() * moodPool.length)] : '';
  var moodText = typeof moodPick === 'string' ? moodPick : (moodPick.text || moodPick.mood || '');

  var softExtra = {
    isFirstRound: isFirstRound,
    atmoText: isFirstRound ? getCalendarAtmo(dayCount) : '',
    moodText: moodText,
    detailText: pickDailyDetail(sceneForDetail),
    phoneCorner: '',
    memoryByType: buildMemoryByType(E)
  };
  var softBlock = buildSoftFlavorBlock(E, softExtra);

  // 注入A+B块（替代旧版日期/季节/生日/节日分散注入）
  msg += '\n' + hardBlock + '\n';
  if (softBlock) msg += softBlock;

  // 旧版独立注入保留：生日/节日（作为"强力提示"而非代码预计算）仅当有对应日子时注入
  var bday = birthdayInfo(dayCount, E);
  if (bday) { msg += '【特别日子·必须重点描写】' + bday.label + '！请围绕此事展开剧情，必须写到 ' + bday.name + ' 的生日相关场景。\n'; }
  var holiday = todayHoliday(dayCount);
  if (holiday) { msg += '【节日·请自然融入】今天是' + holiday + '。请自然融入节日氛围到剧情中。\n'; }

  // ── plan #20: 动态块（从 system prompt 迁移至此，确保每轮动态注入） ──
  var dynBlock = buildDynamicStateBlock(E);
  if (dynBlock) msg += dynBlock + '\n';

  // ── C区补充规则（代码不能覆盖的AI约束） ──
  var isTrainee = E.career.debutDay <= 0;
  if (isTrainee) {
    msg += '【选项规则·练习生阶段】若本段剧情中男主有出场（哪怕是路过/背景），你必须确保3个选项中至少有1个与男主相关。互动必须温和、符合前后辈关系：如"和哥哥一起找他吃饭""在走廊偷看他一眼""让哥哥帮忙带句话"等。禁止越界互动（独处/肢体接触/暧昧暗示）。\n';
  }
  msg += '【场景描写·去重规则】禁止重复使用最近3轮剧情中出现过的场景感官描写关键词，特别是：地板打蜡、空调出风口争夺、无声搞笑、柚子/橘子味饮料等。每轮若场景相同（如练习室），必须换不同的环境细节（窗外天气变化、音响设备、不同时段光线、镜子倒影、墙上海报、某人带来的新物品等），避免连续多天用同一个场景描写模板。\n';
  msg += '【好感度规则】若本段男主有实际互动（对话/同框/独处），你必须在extras.affectionDelta中返回+1~+3的正值。仅背景路过或无互动时返回0。禁止返回负值除非是明显的负面事件。\n';

  // 同天上下文：注入最近剧情摘要，限制 1200 字避免 AI 镜像循环
  if (!extra.nextDayOpening && GS._entSimCurrent && GS._entSimCurrent.narrative) {
    var fullNar = GS._entSimCurrent.narrative;
    var clipNar = fullNar.length > 1200 ? '（...前面剧情已折叠，以下是最近发生的事）\n' + fullNar.slice(-1200) : fullNar;
    msg += '\n【今天最近发生的剧情·请保持连续性但不要重复已发生的内容】\n' + clipNar + '\n';
  } else if (type === 'date') {
    msg = '【约会场景】' + (extra.dateVenue || '私人影院') + ' · ' + getTimeOfDayLabel() + '。请生成约会的沉浸式剧情与 3 个选项（每选项标注 affectionDelta 与曝光风险）。\n';
  } else if (type === 'confess') {
    msg = '【告白场景】私下/家中，只有你们两人。请生成约 500 字告白剧情（男主鼓起勇气的心理与表白），并给出 3 个选项：接受／拒绝／拖延。\n';
  } else if (type === 'chat') {
    var history = (GS.entSim.chatHistory || []).slice(-15);
    var ctx = history.map(function(c) {
      return (c.role === 'user' ? '女主：' : '男主：') + c.content;
    }).join('\n');
    msg = '【聊天】以下是最近 ' + history.length + ' 条对话上下文（越靠下越近）：\n' + (ctx ? ctx + '\n' : '') + '女主新消息：「' + (extra.msg || '') + '」。请以男主口吻写一条回复（narrative 即回复正文，options 留空）。语气按当前好感阶段：' + getRomanceStageLabel() + '，保持人设连贯。\n';
  } else if (type === 'momentDual') {
    msg = '【朋友圈·双人】请生成两条朋友圈动态，输出 JSON：\n' +
      '{"mine":{"post":"女主朋友圈正文 1-2句","reply":"男主回复 1句","replyBack":"女主再回复 1句（可选，留空也行）","photo":"配图描述（可选）","type":"日常/暧昧/吃醋/营业/练习"},"his":{"post":"男主朋友圈正文 1-2句","reply":"女主回复 1句","replyBack":"","photo":"","type":"日常/工作/暧昧/想念"}}\n' +
      '语气自然带emoji，两条动态内容不要重复。';
    if (extra.rivalComment) {
      var E_ = GS.entSim;
      var rvName = (E_.rival && E_.rival.name) || (E_.romance && E_.romance.maleLead && E_.romance.maleLead.name) || '团内成员';
      msg += '\n\n[暗斗彩蛋] 情敌「' + rvName + '」在评论区留一句暗戳戳的较劲发言（20字内），随机出现在 mine 或 his 的 rivalComment 字段。';
    }
  } else if (type === 'diary' || type === 'diaryHis') {
    var isHis = type === 'diaryHis';
    var hpName = (GS.heroineProfile && GS.heroineProfile.name) || '女主';
    var whoLabel = isHis ? '男主「' + mlName + '」' : '女主「' + hpName + '」';
    var whoPronoun = isHis ? '他' : '你';
    var narBuf = (GS._entSimNarrativeBuffer || '');
    // 注入近期剧情（对齐 1v1 的 todayFullText 注入，取最近 ~1200 字）
    var recentNar = narBuf.length > 1200 ? narBuf.slice(-1200) : narBuf;
    // 注入已有日记防重复（最近 4 篇）
    var prevDiaries = '';
    var prevList = isHis ? (GS.entSim.diaryHis || []) : (GS.entSim.diary || []);
    if (prevList.length > 0) {
      var recent = prevList.slice(-4);
      for (var pdi = 0; pdi < recent.length; pdi++) {
        prevDiaries += '- 第' + (pdi + 1) + '篇: ' + (recent[pdi].content || '').slice(0, 80) + '\n';
      }
    }
    msg = '【日记·' + whoLabel + '】请以' + whoLabel + '的第一人称写一篇约 200 字的私人日记（narrative 即日记正文，options 留空）。\n';
    msg += '格式要求（必须遵守）：\n';
    msg += '① 全文以「我」为主语' + (isHis ? '（我=' + mlName + '），绝不能使用「你」（你=女主只适用于主剧情叙事，日记中不会对空气说话）' : '') + '。\n';
    msg += '② 只能写' + whoPronoun + '亲眼看到、亲耳听到、自己心里想的内容。禁止描述任何' + whoPronoun + '没有亲眼目睹的事（如对方独自一人时的动作/心理）。\n';
    msg += '③ 基于近期剧情写真实感受，不要编造没发生过的事，不要写成第三人称叙事。1-2 段即可，可带 emoji。\n';
    if (recentNar.trim()) {
      msg += '\n【近期剧情·基于此写日记】\n' + recentNar.trim() + '\n';
    }
    if (prevDiaries) {
      msg += '\n【已有日记·请避免重复提及相同事件】\n' + prevDiaries;
    }
    msg += '\n';
  } else if (type === 'letter') {
    msg = '【秘密信箱】请以男主「' + mlName + '」的第一人称写一封约 200 字的私密信（narrative 即信件正文，options 留空）。语气温暖、私密，像写给不会寄出的情书：记录此刻他对女主的真实感受、担忧、无法当面说的话。\n';
  } else if (type === 'theater') {
    msg = '【剧场番外】主题：「' + (extra.themePrompt || '男主视角') + '」。请生成约 800 字番外故事（narrative 即正文，options 留空）。\n';
  }

  // 待注入事件（哥哥/男主主动，由下一回合消费）
  if (GS._entSimPendingEvent) {
    msg += '\n【本回合必须围绕展开的核心事件·强制】以下事件是本回合的核心主线，你必须围绕它展开剧情，将其作为叙事骨架。可丰富细节、对话、心理描写，但不得偏离事件走向、不得用无关日常替代、不得发明新的主线转折。\n' + GS._entSimPendingEvent + '\n';
    GS._entSimPendingEvent = '';
  }
  // v5: 上轮validator反馈注入——让AI知道上一轮哪里跑偏了
  if (GS._entSimPendingCorrections) {
    msg += '\n' + GS._entSimPendingCorrections;
    GS._entSimPendingCorrections = '';
  }

  msg += '\n\n【当前状态快照】\n' + buildEntSimContextSnapshot();
  // 强制场景锁定：根据当前时段切换场景
  var _ag = GS.entSim.agenda || {};
  if (extra && extra.scene) {
    msg += '\n【本场场景·强制锁定】' + extra.scene + '。本段剧情必须发生在这个场景里，角色位置、对话、动作都要贴合该场景的物理空间与氛围，不要凭空切换到无关地点。\n';
  } else if (extra && extra.freeSlot) {
    // 夜晚自由时段：无固定行程，可赴约/社交/回顾/创作
    msg += '\n【时段·自由】现在是' + (extra.timeSlotLabel || '夜晚') + '，你的核心行程已结束，这是你自己的时间。可以安排约会、和队友聊天、写日记、刷手机、或者回顾今天发生的事。不需要锁定特定场景。\n';
  } else if (extra && extra.timeSlot === 1) {
    // 下午：次要行程
    msg += '\n【本场场景·强制锁定】现在是下午，你的行程：' + (_ag.related || '相关活动') + (_ag.relatedLoc ? '（地点：' + _ag.relatedLoc + '）' : '') + '。本段剧情必须发生在这个行程场景内，角色位置、对话、动作都要贴合该场景的物理空间与氛围，不要凭空切换到无关地点。\n';
  } else if (type === 'phase' || type === 'choice' || type === 'free') {
    // 上午（默认）：主档行程
    msg += '\n【本场场景·强制锁定】现在是上午，今日核心行程：' + (_ag.main || '待定') + (_ag.mainLoc ? '（地点：' + _ag.mainLoc + '）' : '') + '。本段剧情必须发生在这个行程场景内，角色位置、对话、动作都要贴合该场景的物理空间与氛围，不要凭空切换到无关地点。\n';
  }
  if (extra && extra.extraNote) msg += '\n【补充】' + extra.extraNote + '\n';

  // ── 层3+9：阶段行为禁制卡（recency bias——每轮末尾注入，含范例+公共场合+叙事模式）──
  var banCard = buildStageBanCard(E);
  if (banCard) msg += '\n' + banCard + '\n';

  // ── 层4：主线进度锚定·每回合注入（v5新增）──
  var mainlineAnchor = buildMainlineAnchor(E);
  if (mainlineAnchor) msg += '\n' + mainlineAnchor + '\n';

  msg += '\n请输出 JSON（narrative + options + entSimExtras）。';
  return msg;
}

// ── 层3+9：阶段行为禁制卡（根据当前状态动态生成禁止清单+范例+叙事模式）──
// plan #7: 改用 affectionStageIndex(E.affection) 而非 GS.oneHeartRomanceStage
function buildStageBanCard(E) {
  if (!E) return '';
  var stage = affectionStageIndex(E.affection || 0);
  var aff = E.affection || 0;
  var broSup = (E.brother && E.brother.support) || 0;
  var genCount = GS.oneHeartGenCount || 0;
  var weather = GS.weather || '';
  var bans = [];
  // 写歌/创作禁制
  if (stage === 0 && aff < 20) {
    bans.push({ ban: '禁止男主写歌/写词/创作/专属旋律/专属暗示',
      example: '正确范例：他路过练习室门口时停了半步，然后继续走过去，没有推门。错误：他为你写了半首曲子。' });
    bans.push({ ban: '禁止"专属暗号""只有我们懂""秘密约定"，男主对女主不搞特殊对待',
      example: '正确范例：他叫了你的名字——和叫其他练习生时一样。错误：镜头扫过你的站位，他微微侧头——只有你懂的角度。' });
  }
  // 哥哥禁制
  if (genCount < 10 || broSup < 20) {
    bans.push({ ban: '禁止哥哥审查男主感情/牵线/撮合/推Kakao/当月老',
      example: '正确范例：哥发消息问今天练习怎么样。错误：哥把全圆佑的Kakao推给你。' });
  }
  // 天气禁制
  if (weather.indexOf('雾') < 0) {
    bans.push({ ban: '禁止雾/雾气/浓雾作为氛围描写（当前天气非雾）',
      example: '正确范例：阳光透过练习室窗户照在地板上。错误：雾气弥漫的走廊里，他的身影若隐若现。' });
  }
  // ⚠️ 季节/月份负面禁止规则已删除——改为A区硬事实块中的正面氛围描述引导AI
  // 公共场合禁制
  if (stage < 2) {
    bans.push({ ban: '禁止男主与女主二人独处。所有互动必须有第三人在场。',
      example: '正确范例：敏珠在角落拉伸，还有两个练习生在讨论编舞。错误：练习室只剩你们两个人。' });
  }
  // 叙事模式约束（层9）
  // v4: 修复观察模式死循环——允许男主有微弱的注意反应，但仍不能主动搭话/接近
  if (stage === 0) {
    bans.push({ ban: '【叙事模式·初遇=观察模式】男主可以"存在"并被女主注意到——他在走廊经过、休息室打游戏、声音从某房间传出。允许男主偶尔对女主有微弱反应（视线短暂停留/无意间的目光相遇/不经意听到对话后微小的停顿），但**不允许他主动搭话、不允许特意走近、不允许以帮助为名的接近**。他只是作为场景中的"那个人"被女主感知，互动感由女主单向观察产生。',
      example: '正确范例：他经过时视线在你这边停了半秒，然后转向自己的咖啡。轻微：他停下脚步似乎想说什么，但最终只是推门进了录音室。错误：他主动走过来帮你搬箱子/他特意靠近你问"今天累吗"。' });
  }
  if (!bans.length) return '';
  var result = '【本轮行为禁制·强制】请逐条确认以下行为在本轮不可出现：\n';
  for (var i = 0; i < bans.length; i++) {
    result += '- ❌ 禁止：' + bans[i].ban + '\n  ' + bans[i].example + '\n';
  }
  result += '如果上一轮已有的标志性事件与本轮阶段冲突，本轮主角应刻意拉开距离，不要延续上轮的越级行为。';
  return result;
}

// ── v5·主线进度锚定：每回合注入当前节点+方向+禁忌 ──
// plan #7: 改用 affectionStageIndex 而非 oneHeartRomanceStage
function buildMainlineAnchor(E) {
  if (!E) return '';
  // 初始化主线完成列表（首次调用）
  if (!E._mainlineCompleted) E._mainlineCompleted = [];
  var completed = E._mainlineCompleted;
  var stage = affectionStageIndex(E.affection || 0);
  var aff = E.affection || 0;

  // 按好感推进主线节点
  maybeAdvanceMainline(E, completed, stage, aff);

  // 获取当前未完成的最近节点作为锚定目标
  var allNodes = [];
  // 爱情线节点
  if (typeof MAINLINE_ANCHORS !== 'undefined') {
    for (var key in MAINLINE_ANCHORS) {
      if (key.indexOf('ml_') === 0) allNodes.push(key);
    }
    for (var rvKey in MAINLINE_ANCHORS) {
      if (rvKey.indexOf('rv_') === 0) allNodes.push(rvKey);
    }
  }

  // 找下一个未完成的节点
  var nextNode = null;
  for (var ni = 0; ni < allNodes.length; ni++) {
    if (completed.indexOf(allNodes[ni]) < 0) {
      nextNode = allNodes[ni];
      break;
    }
  }
  if (!nextNode) return ''; // 全部完成

  var anchor = getMainlineAnchor(nextNode);
  if (!anchor) return '';

  var banList = getMainlineBanList(stage);
  var out = '\n【主线进度·v5锚定】\n';
  out += '当前聚焦节点：' + nextNode + '（未完成）\n';
  out += anchor + '\n';
  if (banList) out += '【阶段通用禁忌】' + banList + '\n';
  out += '已完成节点数：' + completed.length + ' / ' + allNodes.length + '\n';
  return out;
}

// 按好感/阶段推进主线节点完成状态
function maybeAdvanceMainline(E, completed, stage, aff) {
  // 自动完成标准：前置节点已全部完成 + 好感达标
  var nodeAffMin = {
    ml_first_meet: 0, ml_again_meet: 3, ml_small_talk: 8, ml_notice: 15,
    ml_help: 20, ml_jealous_1: 25, ml_heart_seed: 30, ml_private_contact: 40,
    ml_date_first: 45, ml_almost_confess: 50, ml_confess: 60,
    ml_together: 65, ml_crisis_exposure: 70, ml_crisis_brother: 75, ml_final_choice: 85,
    rv_first_meet: 5, rv_notice: 10, rv_approach: 20, rv_male_notice: 25,
    rv_conflict: 30, rv_confess: 35, rv_exit: 40
  };

  // 从 MAINLINE_BEATS 数据中获取节点依赖关系
  var allBeats = [];
  // 尝试获取完整的beat数据（含requires）
  try {
    var mlBeats = null, rvBeats = null;
    // 动态导入避免循环依赖
    var beats = {};
    try { beats = require ? require('./pools/mainline-beats.js') : null; } catch(e) {}
    if (!beats || !beats.MAINLINE_ROMANCE) {
      // fallback: 内联依赖定义
    }
  } catch(e) {}

  // 简化版本：按好感自动解锁（前置by顺序号）
  var nodeOrder = [
    'ml_first_meet','ml_again_meet','ml_small_talk','ml_notice',
    'ml_help','ml_jealous_1','ml_heart_seed','ml_private_contact',
    'ml_date_first','ml_almost_confess','ml_confess','ml_together',
    'ml_crisis_exposure','ml_crisis_brother','ml_final_choice',
    'rv_first_meet','rv_notice','rv_approach','rv_male_notice',
    'rv_conflict','rv_confess','rv_exit'
  ];

  for (var oi = 0; oi < nodeOrder.length; oi++) {
    var nodeId = nodeOrder[oi];
    if (completed.indexOf(nodeId) >= 0) continue; // 已完成跳过
    var minAff = nodeAffMin[nodeId] || 0;
    if (aff >= minAff) {
      completed.push(nodeId);
    } else {
      break; // 好感不够，后续不继续
    }
  }
}


// ── 场景灵感注入：从34个池子中按当前状态筛选2-3条最相关的场景素材，
// 注入到AI的用户消息中作为创作灵感，让AI写剧情时有具体场景可参考。
function injectPoolInspirations(E) {
  if (!E) return '';
  // 收集所有候选池子+权重
  var candidates = [];

  // ── 恋爱场景池（按好感阶段活跃） ──
  var aff = E.affection || 0;
  if (aff >= 20) addPoolCandidates(candidates, ROMANCE_BACKSTAGE, E, 2, '后台相遇');
  // 深夜场景需好感>=40 或明确期（与原始设计一致：深夜档更高门槛）
  if (aff >= 40 || (GS.oneHeartRomanceStage || 0) >= 2) addPoolCandidates(candidates, ROMANCE_LATENIGHT, E, 2, '深夜联系');
  if (aff >= 20) addPoolCandidates(candidates, ROMANCE_PUBLIC, E, 2, '公共克制');
  if (aff >= 40) addPoolCandidates(candidates, ROMANCE_CRISIS, E, 2, '危机守护');
  if (aff >= 30) addPoolCandidates(candidates, ROMANCE_JEALOUSY_POOL, E, 1, '吃醋触发');
  if (aff >= 60) addPoolCandidates(candidates, ROMANCE_CONFESSION, E, 1, '告白节点');

  // ── 地下恋专属池（好感≥30且恋情曝光≥升温(10)后活跃） ──
  if (aff >= 30 && getScandalHeat() >= 10) {
    addPoolCandidates(candidates, SECRET_COMMS, E, 1, '秘密通讯');
    addPoolCandidates(candidates, SECRET_NEARMISS, E, 1, '差点暴露');
    addPoolCandidates(candidates, SECRET_FAN_CLUES, E, 1, '粉丝线索');
    addPoolCandidates(candidates, SECRET_COMPANY, E, 1, '公司警告');
  }

  // ── 氛围池（每天1条） ──
  addPoolCandidates(candidates, ATMOSPHERE_WEATHER, E, 1, '天气氛围');
  addPoolCandidates(candidates, ATMOSPHERE_MOOD, E, 1, '心情基调');
  addPoolCandidates(candidates, ATMOSPHERE_HIS_STATE, E, 1, '男主今日状态');

  // ── 偶遇池（按好感阶段） ──
  if (aff >= 20) addPoolCandidates(candidates, ENCOUNTER_ML, E, 2, '偶遇男主');
  if (aff >= 20) addPoolCandidates(candidates, ENCOUNTER_RIVAL, E, 1, '偶遇情敌');
  if (aff >= 20) addPoolCandidates(candidates, ENCOUNTER_BROTHER, E, 1, '哥哥撞见');
  if (aff >= 30) addPoolCandidates(candidates, ENCOUNTER_OTHERS, E, 1, '旁人起哄');

  // ── 剧情节奏池（按好感/阶段） ──
  if (aff >= 50) addPoolCandidates(candidates, DRAMA_ALMOST, E, 1, '差点告白');
  if (aff >= 30) addPoolCandidates(candidates, DRAMA_MISUNDERSTAND, E, 1, '误会');
  if (aff >= 40) addPoolCandidates(candidates, DRAMA_COLDWAR, E, 1, '冷战和解');
  if (aff >= 40) addPoolCandidates(candidates, DRAMA_DATING_RUMOR, E, 1, '绯闻危机');
  if (aff >= 50) addPoolCandidates(candidates, DRAMA_DILEMMA, E, 1, '二选一困境');

  // ── 里程碑池（按章节/出道状态） ──
  var isDebut = E.career && E.career.debutDay > 0;
  if (isDebut) {
    // 出道日场景只在出道后3天内注入，避免长期重复
    var debutDays = E.career.debutGameDay ? (E.cycle._gameDayCount - E.career.debutGameDay) : 999;
    if (debutDays <= 3) addPoolCandidates(candidates, MILESTONE_DEBUT, E, 1, '出道日场景');
    addPoolCandidates(candidates, MILESTONE_AWARDS, E, 1, '颁奖场景');
    if (E.chapter && E.chapter.index >= 2) addPoolCandidates(candidates, MILESTONE_FIRST_WIN, E, 1, '一位场景');
  }

  // v4: 池子接入⑫ JOB_GRADE_POOL — 按人气分级注入场景素材
  if (isDebut) addPoolCandidates(candidates, JOB_GRADE_POOL, E, 1, '通告分级场景');

  // ── 日历节日池（按今天的日期/生日） ──
  addPoolCandidates(candidates, CALENDAR_EVENTS, E, 1, '今日节日/生日');

  // 从候选中随机抽取2-4条
  if (!candidates.length) return '';
  var picked = [];
  var tmp = candidates.slice();
  var max = Math.min(2, tmp.length); // v4: 从4条降为2条，减少prompt稀释
  for (var i = 0; i < max && tmp.length; i++) {
    var idx = Math.floor(Math.random() * tmp.length);
    picked.push(tmp.splice(idx, 1)[0]);
  }

  if (!picked.length) return '';

  // commit-only：标记已注入，防止跨回合重复使用
  for (var pi = 0; pi < picked.length; pi++) {
    _inspUsedTexts.add(picked[pi].text);
  }

  var out = '\n【本场核心事件·强引导】以下是本回合必须围绕展开的核心事件素材。你必须以其为剧情主线，可丰富对话/心理/环境细节，但不得替换主线走向、不得自行发明新的主线冲突或新事件。请将这些素材自然融入到剧情中，而非照搬原文：\n';
  for (var pi = 0; pi < picked.length; pi++) {
    out += '- [' + picked[pi].cat + '] ' + picked[pi].text + '\n';
  }
  // ── 层4：反向场景禁制 ──
  var _aff = E.affection || 0;
  var _stage = GS.oneHeartRomanceStage || 0;
  var banLabel = '';
  if (_aff < 20) banLabel = '禁止男主"为你写歌""专属暗示""特殊对待"，禁止哥哥"审查感情""推Kakao牵线"';
  if (_stage < 2) banLabel += (banLabel ? '，' : '') + '禁止二人深夜独处，禁止男主私下主动联系女主';
  // 季节/月份矛盾禁制
  var _gm = GS.gameMonth || gameMonthOf(E.cycle.dayCount || 1);
  var _se = GS.season || gameSeasonOf(E.cycle.dayCount || 1);
  if (_gm !== 12 && _gm !== 1 && _gm !== 2) banLabel += (banLabel ? '，' : '') + '禁止"初雪""雪花""第一场雪"';
  if (_gm !== 3) banLabel += (banLabel ? '，' : '') + '禁止"白色情人节"';
  if (_se === 'spring') banLabel += (banLabel ? '，' : '') + '禁止"冬天""供暖""暖气片"';
  if (_se === 'summer') banLabel += (banLabel ? '，' : '') + '禁止"冬天""供暖""樱花"';
  if (_gm === 11 && _se === 'autumn') banLabel += (banLabel ? '，' : '') + '禁止"跨年""新年""除夕""圣诞""Pepero"';
  if (banLabel) out += '\n【场景禁制】本轮禁止出现的场景类型：' + banLabel + '\n';
  return out;
}

// 从池子中筛出满足require条件的条目，跳过已用文本，打上类别标签后加入候选列表
function addPoolCandidates(arr, pool, E, count, catLabel) {
  if (!pool || !pool.length) return;
  // 第一步：require条件过滤
  var filtered = [];
  for (var i = 0; i < pool.length; i++) {
    if (canTrigger(pool[i], E)) filtered.push(pool[i]);
  }
  if (!filtered.length) return; // 无匹配条目：跳过该池（不再兜底全放行，避免生日/节日幻觉）
  // 第二步：commit-only去重，跳过已注入过的条目
  var unused = [];
  for (var j = 0; j < filtered.length; j++) {
    if (!_inspUsedTexts.has(filtered[j].text)) unused.push(filtered[j]);
  }
  if (!unused.length) return; // 该池全部用完，静默退出
  // 第三步：随机抽取 count 条
  var n = Math.min(count, unused.length);
  var tmp = unused.slice();
  for (var k = 0; k < n && tmp.length; k++) {
    var idx = Math.floor(Math.random() * tmp.length);
    var entry = tmp.splice(idx, 1)[0];
    arr.push({ cat: catLabel, text: entry.text });
  }
}

// plan #20: 动态状态块（从 system prompt 迁移至此，每轮 user message 动态注入）
// 包含：职业/队友/心理/男主种子/小动作/哥哥/亲密阶梯/吃醋/SVT回归期
function buildDynamicStateBlock(E) {
  if (!E) return '';
  var hp = GS.heroineProfile || {};
  var ml = (E.romance && E.romance.maleLead) || {};
  var bro = GS.oneHeartRelationCharacter || E.brother;
  var isDebut = E.career && E.career.debutDay > 0;
  var careerLabel = isDebut ? '女团爱豆' : '练习生';
  var careerDaily = isDebut ? (E.chapter ? E.chapter.name : '') : '练习生';
  var careerDesc = isDebut
    ? '已出道的女团成员（' + careerDaily + '），有固定团名/队友/粉丝基础，日程以打歌/签售/综艺/练习为主，事业压力来自回归成绩/人气/竞争。'
    : '未出道的练习生，没有团名没有粉丝没有舞台，日常全部是训练（声乐课/舞蹈测评/月评/体测/外语课等），事业压力来自月末评价/出道组筛选/淘汰焦虑。';
  var teammateDesc = isDebut
    ? '女主在 6 人小糊团（女主 + 5 位姐姐），队友（由 AI 按设定具象化客串）：' + sisterSummary() + '。她们是日常背景，可偶尔在剧情里出现（如练习室、待机室、宿舍），增添女团真实感，但不要抢戏。'
    : '女主有 5 位练习生同期姐妹（由 AI 按设定具象化客串）：' + sisterSummary() + '。她们一起训练/一起吃饭/一起熬月末评价，是彼此的支撑，但不要抢戏。';
  var block = '';
  block += '【玩家身份·动态】韩国' + careerLabel + '（艺名：' + (hp.name || '你') + '，' + (hp.age || 19) + ' 岁），目前在' + careerDaily + '。' + careerDesc + ' SEVENTEEN 成员「' + (ml.name || '男主') + '」是她哥哥的队友。\n';
  // 心理状态
  if (E.psyche) {
    var psy = E.psyche;
    block += '【女主心理状态·叙事基调】';
    if (psy.stress > 60) block += '高压力（' + psy.stress + '/100），走路脚步沉重、容易被小事触动、独自时会有放空或叹气的片刻，但工作中仍会保持专业态度。';
    else if (psy.stress > 30) block += '中等压力（' + psy.stress + '/100），偶尔会在意他人的评价，夜深时想得比白天多。';
    if (psy.anxiety > 50) block += '高焦虑（' + psy.anxiety + '/100），对不确定性敏感、可能过度解读信息或回避正面冲突。';
    if (psy.fatigue > 60) block += '严重疲劳（' + psy.fatigue + '/100），黑眼圈、反应稍慢、对玩笑话只能勉强配合笑。';
    else if (psy.fatigue > 30) block += '中等疲劳（' + psy.fatigue + '/100），结束工作后只想躺平、聊天回得简短一些。';
    if (psy.confidence < 30) block += '自信偏低（' + psy.confidence + '/100），怀疑自己的能力、面对夸奖会想"是不是客套"。';
    else if (psy.confidence > 70) block += '自信充沛（' + psy.confidence + '/100），舞台上眼神更稳、面对前辈不怯场。';
    block += '请在叙事中反映这些状态——让压力落在微动作里（揉太阳穴、靠着墙歇一会、多喝了两杯咖啡、不自觉地转笔等），而非每句话都写"压力很大"。';
    if (!psy.stress && !psy.anxiety && !psy.fatigue && Math.abs(psy.confidence - 50) < 10) block += '目前心理状态平稳，日常节奏正常。';
    block += '\n';
  }
  // 女团队友/练习生同期
  block += '【' + (isDebut ? '女团队友' : '练习生同期') + '（背景人物）】' + teammateDesc + '\n';
  if (isDebut) {
    block += '⚠️ 团魂铁则：六人非常团结、互相扶持、没有内斗。禁止写队友翻白眼、阴阳怪气、抢站位、明争暗斗等行为。她们之间的互动永远是温暖的、互相撑腰的。\n';
  } else {
    block += '⚠️ 练习生铁则：六人是同期练习生，互相扶持共渡难关。禁止写勾心斗角/排挤/背后说坏话。她们之间的互动永远是温暖的、互相打气的。\n';
  }
  // 男主设定
  block += '【男主设定】男主「' + (ml.name || '男主') + '」是 SEVENTEEN 成员，有自己的行程/事业/情绪。让他像真实偶像：会吃醋、会主动、有小动作，不是通用男主。\n';
  if (E.romance && E.romance.seedEvent) {
    block += '【男主上心契机·种子事件】' + E.romance.seedEvent + '\n（这是男主为什么对女主不一样的根，后续告白/吃醋/心动时刻可回溯引用，保持前后一致。）\n';
  }
  if (E.romance && E.romance.mannerisms && E.romance.mannerisms.length) {
    block += '【男主小动作】' + E.romance.mannerisms.join('、') + '（每 10-15 回合自然出现一次，用于男主角色辨识度，不要每次都写）。此小动作仅限男主本人，其他 SEVENTEEN 成员各有自己的习惯和性格特征，绝对不要把男主的特征写到其他成员身上。\n';
  }
  block += '【称呼演变】男主对女主的称呼随感情推进：初期叫全名或「XX前辈/后辈」或不带称呼 → 熟络后叫艺名/全名 → 暧昧期叫「小 X」→ 明确期叫「宝宝/亲爱的」。严禁开局就叫「你妹妹」「妹妹」，那必须是已通过哥哥认识后才可能出现的称呼。\n';
  block += '【男主主动】男主每天约 10% 概率主动发起互动（发消息/探班/吃醋/送东西/约你），按好感阶段解锁类型。\n';
  block += '【吃醋】当女主和别人同台打歌、被搭话要联系方式、或处在赞助商潜规则感的场景时，男主会吃醋。\n';
  // 哥哥设定
  block += '【哥哥设定】SEVENTEEN 成员、女主亲哥哥（团内队友）「' + (bro ? bro.name : '哥哥') + '」。开局他只是女主的哥哥，尚未介入妹妹感情事。随着剧情推进，他可能成为参谋、调侃、被拍时掩护，也可能反对。哥哥若被设定为「反对公开」，会卡住男主告白（需玩家先化解他的顾虑）；否则立场是剧情张力来源。\n';
  // 团内竞争者（按女主对男主好感度分层，计划 #25）
  block += '【团内竞争者】男主的情敌是 SEVENTEEN 的团内另一位成员。开局他也只是普通前辈，随着剧情推进可能对女主产生好感，有递进弧线（初遇→注意→试探→冲突→退出祝福/上位），禁止自创新名字。竞争者有自己的「亲密度」数值（0~100），在关系网中会显示——互动越频繁亲密度越高。\n';
  block += '  · 情敌攻势分层（按女主对男主好感度）：\n';
  block += '    好感0-19（初识期）：情敌温和接近，以队友身份自然出现，不刻意追求。\n';
  block += '    好感20-39（试探期）：情敌开始主动找话题、邀约午餐、送小礼物，增加接触频率。\n';
  block += '    好感40-59（主动期）：情敌加大追求力度——频繁发消息、话里藏话暗示、在男主面前刷存在感。\n';
  block += '    好感60-79（竞争期）：情敌正面与男主较劲——送贵重礼物、在男主面前故意制造误会或比较自己。\n';
  block += '    好感80-99（最后一搏）：情敌激烈追求——频繁出现在你周围、反复提起过去的小事、试探你对他的感觉。\n';
  block += '    好感100（退出祝福）：情敌认输，转为温和祝福态度，不再主动进攻。\n';
  block += '  当剧情中出现竞争者与女主的非偶遇互动时，npcEncounter.intimacyDelta 必须填写对应的增量（+2=正向互动、-1=冷淡回避、0=仅偶遇/群聊）。\n';
  // SEVENTEEN 其他队友
  block += '【SEVENTEEN 队友（哥哥的团内兄弟·可自然客串）】' + svtTeammateSummary() + '。他们是哥哥的团内兄弟，可在练习室/待机室/公司食堂/走廊等场景自然出场——打招呼、调侃、助攻均可，体现「哥哥队友都是朋友」的氛围。哥哥在场时出场概率更高。队友出场不抢男主戏，每次客串一两句话即可，作为娱乐圈真实感的点缀。\n';
  // SVT 回归期
  if (GS.entSim && GS.entSim._svtComebackDays && GS.entSim._svtComebackDays > 0) {
    block += '【SEVENTEEN 回归期】目前仅 SEVENTEEN 处于回归打歌期（剩余' + GS.entSim._svtComebackDays + '天），男主行程密度极高、非常忙碌、可约时间大幅减少；但同台打歌场景概率大幅增加，可在待机室/后台/打歌舞台等场景偶遇。注意：女主的女团（新人/二线团）目前没有回归活动，日常以练习/打歌/签售/跑行程为主，不要描述女主团也在回归。\n';
  }
  // 亲密接触阶梯
  var intUnlocked = (E && E._intimacyUnlocked) || { hand: false, hug: false, kiss: false, bed: false, live: false, public: false, marry: false };
  block += '【亲密接触阶梯·强制】根据好感度解锁的亲密行为，不可越级：\n';
  block += '  - 牵手（🤝）好感≥15：' + (intUnlocked.hand ? '✅已解锁' : '❌未解锁') + '\n';
  block += '  - 拥抱（🤗）好感≥30：' + (intUnlocked.hug ? '✅已解锁' : '❌未解锁') + '\n';
  block += '  - 接吻（💋）好感≥60：' + (intUnlocked.kiss ? '✅已解锁' : '❌未解锁') + '\n';
  block += '  - 同床（🛏️）好感≥80：' + (intUnlocked.bed ? '✅已解锁' : '❌未解锁') + '\n';
  block += '  - 同居（🏠）好感≥80：' + (intUnlocked.live ? '✅已解锁' : '❌未解锁') + '\n';
  block += '  - 公开恋情（📣）好感≥90：' + (intUnlocked.public ? '✅已解锁' : '❌未解锁·需玩家主动选择') + '\n';
  block += '  - 求婚结婚（💍）好感≥100：' + (intUnlocked.marry ? '✅已解锁' : '❌未解锁') + '\n';
  block += '  只能写已解锁阶段的亲密行为，不得越级。未解锁的行为连暗示都不行。\n';
  // 吃醋值
  var jLvl = (E && E._jealousLevel) || 0;
  if (jLvl >= 8) {
    block += '【吃醋状态·🔥爆发】男主醋意爆表，会在剧情中表现出明显的占有欲、冷淡质问或霸道行动。后果：可能公开吃醋被粉丝过度解读。\n';
  } else if (jLvl >= 5) {
    block += '【吃醋状态·😤明显】男主有明显吃醋表现：语气变淡、话中有话、或故意与女主保持距离又想靠近的别扭感。\n';
  } else if (jLvl >= 2) {
    block += '【吃醋状态·🤔微醋】男主微微吃醋但克制表现：多看了你一眼竞争对手、说话带一点试探。\n';
  }
  // 女主称呼规则
  var mlBirthYear = ml.birthYear || 0;
  block += '【女主称呼规则】女主 ' + (hp.age || 19) + ' 岁（≈' + (2025 - (hp.age || 19)) + '年生），比 SEVENTEEN 全团年幼。';
  if (mlBirthYear) {
    block += '男主「' + (ml.name || '') + '」' + mlBirthYear + '年生。初识期（romanceStage<1）称「' + (ml.name || '') + '前辈」；暧昧期后（romanceStage>=1）可改口称「欧巴」。禁止称"哥/哥哥/형"。';
  } else {
    block += '初识期称男主「前辈」；暧昧期后可改口称「欧巴」。禁止称"哥/哥哥/형"。';
  }
  block += '\n';
  return block;
}

function buildEntSimContextSnapshot() {
  var E = GS.entSim;
  var s = '';
  s += '当前时段：' + getTimeOfDayLabel() + '（第' + (E.cycle._gameDayCount || E.cycle.dayCount || 1) + '天，第' + (E.cycle.roundTotal || 0) + '回合）\n';
  s += '恋爱阶段：' + getRomanceStageIcon() + getRomanceStageLabel() + '（好感度 ' + E.affection + '/100）\n';
  s += '男主情绪：' + E.romance.emotion + '｜已告白：' + (E.romance.confessionDone ? '是(' + E.romance.confessionResult + ')' : '否') + '\n';
  s += '恋情曝光风险：' + getScandalHeat() + '/25+（越高越危险，驱Dispatch/绯闻/塌房）\n';
  // plan #6: 注入掩护使用情况
  s += '已使用掩护次数：' + (E.romance.coverUsed || 0) + '/5（剩余' + (5 - (E.romance.coverUsed || 0)) + '次）\n';
  // plan #6: 注入吃醋等级
  var jLvl = E._jealousLevel || 0;
  if (jLvl > 0) s += '男主吃醋等级：' + jLvl + '/10（' + (jLvl >= 8 ? '爆发' : jLvl >= 5 ? '明显' : jLvl >= 2 ? '微醋' : '平静') + '）\n';
  var suitorNm = (E.npcNetwork && E.npcNetwork.nodes['npc_suitor']) ? E.npcNetwork.nodes['npc_suitor'].name : '';
  s += '今日日程：主档「' + E.agenda.main + (E.agenda.mainLoc ? '(' + E.agenda.mainLoc + ')' : '') + '」／相关「' + E.agenda.related + '」／' + (suitorNm || '') + '「' + E.agenda.rival + '」' + (E.agenda.brother ? '／哥哥「' + E.agenda.brother + (E.agenda.brotherLoc ? '(' + E.agenda.brotherLoc + ')' : '') + '」' : '') + (E.agenda.maleLead ? '／男主「' + E.agenda.maleLead + (E.agenda.maleLeadLoc ? '(' + E.agenda.maleLeadLoc + ')' : '') + '」' : '') + '\n';
  if (E.brother) s += '哥哥「' + E.brother.name + '」立场：' + E.brother.stance + '｜支持度：' + E.brother.support + '\n';
  // NPC 关系网（精简 4 类）
  var npc = [];
  ['npc_broker', 'npc_fanleader', 'npc_suitor'].forEach(function(id) {
    var n = E.npcNetwork.nodes[id];
    if (n) npc.push(n.name + '(' + n.stance + ',亲密度' + (n.intimacy || 0) + ')');
  });
  if (npc.length) s += '关系网：' + npc.join('；') + '\n';
  // 秘密
  if (E.secret.items.length) s += '女主秘密：' + E.secret.items.join('；') + (E.secret.foundByRival ? '（已被团内成员发现）' : '') + '\n';
  // plan #6: 注入未解决约定
  if (E.appointments && E.appointments.length) {
    var pendingApts = E.appointments.filter(function(a) { return !a.done; });
    if (pendingApts.length) {
      s += '待履行约定：' + pendingApts.map(function(a) { return '与' + a.with + '在' + a.place + '——' + a.summary; }).join('；') + '\n';
    }
  }
  // plan #6: 注入纪念日
  var ann = checkAnniversaries();
  if (ann) s += '🎉 今日纪念日：' + ann.icon + ann.label + '（' + ann.days + '天）\n';
  // plan #6: 注入 flags
  var flagKeys = Object.keys(E.flags || {}).filter(function(k) { return E.flags[k] === true && k.indexOf('milestone_') !== 0; });
  if (flagKeys.length) s += '已触发关键事件：' + flagKeys.join('、') + '\n';
  // plan #12: 注入 open loops（未解决悬念）
  if (E.openLoops && E.openLoops.length) {
    var pendingLoops = E.openLoops.filter(function(l) { return !l.resolved; });
    if (pendingLoops.length) {
      s += '未解决悬念（需在本段或后续剧情中呼应）：\n';
      for (var li = 0; li < Math.min(3, pendingLoops.length); li++) {
        s += '  - [' + pendingLoops[li].type + '] ' + pendingLoops[li].text + '\n';
      }
    }
  }
  // SVT 队友今日互动（轻量记录，避免重复出场同一人）
  var svtToday = E._svtTodaySeen || [];
  if (svtToday.length) s += '今天见过的SEVENTEEN队友：' + svtToday.map(function(x) { return x.name + '(' + x.desc + ')'; }).join('、') + '（本轮避免让这些人再出场）\n';
  // 记忆注入（近 7 天关键词 + 全部关键事件）
  var mem = buildMemorySnapshot();
  if (mem) s += '\n' + mem + '\n';
  // 场景灵感注入（从34个池子筛选2-4条素材）
  var insp = injectPoolInspirations(E);
  if (insp) s += insp;
  return s;
}

function sisterSummary() {
  var g = GS.entSim.heroineGroup || [];
  if (!g.length) return '（5 位姐姐，待具象化）';
  return g.map(function(x) { return x.name + '(' + x.roleTag + ')'; }).join('、');
}

// SEVENTEEN 队友概要（排除男主/哥哥/情敌 3 人后剩余 ~10 人，emoji + 名字 + 标签）
function svtTeammateSummary() {
  var E = GS.entSim || {};
  var mlId = (E.romance && E.romance.maleLead) ? E.romance.maleLead.id : (GS.oneHeartMember || '');
  var broId = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.id) || '';
  var suitorId = '';
  if (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor']) {
    suitorId = E.npcNetwork.nodes['npc_suitor'].id || '';
  }
  var excluded = [mlId, broId, suitorId];
  var teammates = MEMBERS.filter(function(m) {
    return excluded.indexOf(m.id) < 0;
  });
  if (!teammates.length) return '（无其他队友）';
  return teammates.map(function(m) {
    return m.emoji + m.name + '·' + (m.desc || m.pos || '成员');
  }).join('、');
}
