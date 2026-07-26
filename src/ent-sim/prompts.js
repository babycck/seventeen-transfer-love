// ============================================================
// 娱乐圈模拟器（entSim）· Prompt 构建（纯恋爱游戏 + 娱乐圈背景）
// buildEntSimSystemPrompt：世界观 + 角色 + 规则 + 输出格式
// buildEntSimUserMessage：玩家动作 + 当前状态快照（含记忆注入）
// ============================================================
import { GS } from '../state.js';
import { formatGameDate, formatTraineeDate, birthdayInfo, todayHoliday, gameSeasonOf } from './state.js';
import { MEMBERS } from '../data.js';
import { getTimeOfDayLabel } from './cycle.js';
import { getRomanceStageLabel, getRomanceStageIcon, AFFECTION_STAGES, affectionStageIndex } from './romance.js';
import { buildMemorySnapshot } from './memory.js';
import { getScandalHeat } from './public-opinion.js';
// npc-network 已移除，情敌名改用 rival 字段
// ── 场景灵感池子（26个，为AI提供素材参考） ──
import { ROMANCE_BACKSTAGE, ROMANCE_LATENIGHT, ROMANCE_PUBLIC, ROMANCE_CRISIS, ROMANCE_JEALOUSY_POOL, ROMANCE_CONFESSION } from './pools/index.js';
import { SECRET_COMMS, SECRET_NEARMISS, SECRET_FAN_CLUES, SECRET_COMPANY } from './pools/index.js';
import { ATMOSPHERE_WEATHER, ATMOSPHERE_MOOD, ATMOSPHERE_HIS_STATE } from './pools/index.js';
import { MILESTONE_DEBUT, MILESTONE_FIRST_WIN, MILESTONE_AWARDS } from './pools/index.js';
import { ENCOUNTER_ML, ENCOUNTER_RIVAL, ENCOUNTER_BROTHER, ENCOUNTER_OTHERS } from './pools/index.js';
import { DRAMA_ALMOST, DRAMA_MISUNDERSTAND, DRAMA_COLDWAR, DRAMA_DATING_RUMOR, DRAMA_DILEMMA } from './pools/index.js';
import { CALENDAR_EVENTS } from './pools/index.js';
import { canTrigger } from './pools/_utils.js';

// ── commit-only 去重：已注入过的场景文本不再重复使用 ──
var _inspUsedTexts = new Set();
window.__resetInspUsedTexts = function() {
  _inspUsedTexts = new Set();
};

export function buildEntSimSystemPrompt(mode) {
  var hp = GS.heroineProfile || {};
  var E = GS.entSim || {};
  var ml = (E.romance && E.romance.maleLead) || {};
  var bro = GS.oneHeartRelationCharacter || E.brother;
  var rival = (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_rival']);
  var suitor = (E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor']);

  // 职业阶段判定
  var isDebut = E.career && E.career.debutDay > 0;
  var chapterIdx = (E.chapter && E.chapter.index) || 1;
  var careerLabel = isDebut ? '女团爱豆' : '练习生';
  var careerDaily = isDebut ? (E.chapter ? E.chapter.name : '') : '练习生';
  var careerDesc = isDebut
    ? '已出道的女团成员（' + careerDaily + '），有固定团名/队友/粉丝基础，日程以打歌/签售/综艺/练习为主，事业压力来自回归成绩/人气/竞争。'
    : '未出道的练习生，没有团名没有粉丝没有舞台，日常全部是训练（声乐课/舞蹈测评/月评/体测/外语课等），事业压力来自月末评价/出道组筛选/淘汰焦虑。';
  var teammateDesc = isDebut
    ? '女主在 6 人小糊团（女主 + 5 位姐姐），队友（由 AI 按设定具象化客串）：' + sisterSummary() + '。她们是日常背景，可偶尔在剧情里出现（如练习室、待机室、宿舍），增添女团真实感，但不要抢戏。'
    : '女主有 5 位练习生同期姐妹（由 AI 按设定具象化客串）：' + sisterSummary() + '。她们一起训练/一起吃饭/一起熬月末评价，是彼此的支撑，但不要抢戏。';
  var sys = '';
  sys += '你是一个沉浸式娱乐圈恋爱文字游戏的叙事 AI。玩家扮演一名韩国' + careerLabel + '（艺名：' + (hp.name || '你') + '，' + (hp.age || 19) + ' 岁），目前在' + careerDaily + '。' + careerDesc + ' SEVENTEEN 成员「' + (ml ? ml.name : '男主') + '」是她的哥哥的队友，但两人目前只是同行业前辈与后辈的关系——是否通过哥哥见过面、说过话，都是未知数。故事从零开始，感情完全空白，没有任何预设的暧昧或好感。\n';
  sys += '【核心定位】恋爱是主线，娱乐圈是背景层。你的重点是写好「两个陌生人如何从相识走向相爱」：初遇、相识、心动、暧昧、吃醋、试探、告白、在一起后的地下甜蜜。开局没有感情基础，一切从零开始慢热推进。娱乐圈的行程/舆论/曝光只是恋爱的张力来源，不要写成经营模拟。\n';
  sys += '【' + (isDebut ? '女团队友' : '练习生同期') + '（背景人物）】' + teammateDesc + '\n';
  if (isDebut) {
    sys += '⚠️ 团魂铁则：六人非常团结、互相扶持、没有内斗。禁止写队友翻白眼、阴阳怪气、抢站位、明争暗斗等行为。她们之间的互动永远是温暖的、互相撑腰的。\n';
  } else {
    sys += '⚠️ 练习生铁则：六人是同期练习生，互相扶持共渡难关。禁止写勾心斗角/排挤/背后说坏话。她们之间的互动永远是温暖的、互相打气的。\n';
  }
  sys += '【男主设定】男主「' + (ml ? ml.name : '男主') + '」是 SEVENTEEN 成员，有自己的行程/事业/情绪。让他像真实偶像：会吃醋、会主动、有小动作，不是通用男主。\n';
  if (E.romance && E.romance.seedEvent) {
    sys += '【男主上心契机·种子事件】' + E.romance.seedEvent + '\n（这是男主为什么对女主不一样的根，后续告白/吃醋/心动时刻可回溯引用，保持前后一致。）\n';
  }
  if (E.romance && E.romance.mannerisms && E.romance.mannerisms.length) {
    sys += '【男主小动作】' + E.romance.mannerisms.join('、') + '（每 5-8 回合自然出现一次，用于男主角色辨识度，不要每次都写）。此小动作仅限男主本人，其他 SEVENTEEN 成员各有自己的习惯和性格特征，绝对不要把男主的特征写到其他成员身上。\n';
  }
  sys += '【称呼演变】男主对女主的称呼随感情推进：初期叫全名或「XX前辈/后辈」或不带称呼 → 熟络后叫艺名/全名 → 暧昧期叫「小 X」→ 明确期叫「宝宝/亲爱的」。严禁开局就叫「你妹妹」「妹妹」，那必须是已通过哥哥认识后才可能出现的称呼。\n';
  sys += '【男主主动】男主每天约 10% 概率主动发起互动（发消息/探班/吃醋/送东西/约你），按好感阶段解锁类型。\n';
  sys += '【吃醋】当女主和别人同台打歌、被搭话要联系方式、或处在赞助商潜规则感的场景时，男主会吃醋。\n';
  sys += '【哥哥设定】SEVENTEEN 成员、女主亲哥哥（团内队友）「' + (bro ? bro.name : '哥哥') + '」。开局他只是女主的哥哥，尚未介入妹妹感情事。随着剧情推进，他可能成为参谋、调侃、被拍时掩护，也可能反对。哥哥若被设定为「反对公开」，会卡住男主告白（需玩家先化解他的顾虑）；否则立场是剧情张力来源。\n';
  sys += '【团内竞争者】男主的情敌是 SEVENTEEN 的团内另一位成员。开局他也只是普通前辈，随着剧情推进可能对女主产生好感，有递进弧线（初遇→注意→试探→冲突→退出祝福/上位），禁止自创新名字。竞争者有自己的「亲密度」数值（0~100），在关系网中会显示——互动越频繁亲密度越高。当剧情中出现竞争者与女主的非偶遇互动时，npcEncounter.intimacyDelta 必须填写对应的增量（+2=正向互动、-1=冷淡回避、0=仅偶遇/群聊）。\n';
  // SEVENTEEN 其他队友（哥哥的团内兄弟·可客串出场）
  sys += '【SEVENTEEN 队友（哥哥的团内兄弟·可自然客串）】' + svtTeammateSummary() + '。他们是哥哥的团内兄弟，可在练习室/待机室/公司食堂/走廊等场景自然出场——打招呼、调侃、助攻均可，体现「哥哥队友都是朋友」的氛围。哥哥在场时出场概率更高。队友出场不抢男主戏，每次客串一两句话即可，作为娱乐圈真实感的点缀。\n';
  // 群聊体系（强制规则，防止两个群串台——女主不在 SEVENTEEN 内部群）
  sys += '【群聊体系·强制】存在两个独立的群聊，消息绝不互通：\n';
  sys += '(1) 「女团姐妹群」—— 你+5位姐姐（6人），聊日常/八卦/练习安排/互相打气/造型提醒/宿舍事项。这是你唯一全天在线的群聊。\n';
  sys += '(2) 「SEVENTEEN 内部群」—— SEVENTEEN 13 人专属工作群（你不在其中！），发行程/外卖/调侃/团内通知/经纪人指示。这是他们的内部空间，你不是 SEVENTEEN 成员所以不在这个群里。\n';
  sys += '【你在 SVT 群的合法获知路径·强制】你不在 SEVENTEEN 内部群里，只能通过以下方式获知群内消息：(a) 哥哥主动把手机屏幕亮给你看「你看XX在群里说了什么」；(b) 某位 SVT 成员当面口头转述「刚才群里在讨论…」；(c) 被哥哥临时拉入协作群（如帮忙搬器材），任务后解散。\n';
  sys += '【SVT 群禁区·强制】在任何剧情中，绝对禁止写：你在 SEVENTEEN 群里看到任何消息、你打开 SEVENTEEN 群、你在群里回复/发消息/点赞/收到 @。禁止 SEVENTEEN 成员在群里 @ 你（你不在群里无法被 @）。女主只能谈论「在女团姐妹群里」的消息。\n';
  // SEVENTEEN 回归期提示
  if (GS.entSim && GS.entSim._svtComebackDays && GS.entSim._svtComebackDays > 0) {
    sys += '【SEVENTEEN 回归期】目前仅 SEVENTEEN 处于回归打歌期（剩余' + GS.entSim._svtComebackDays + '天），男主行程密度极高、非常忙碌、可约时间大幅减少；但同台打歌场景概率大幅增加，可在待机室/后台/打歌舞台等场景偶遇。注意：女主的女团（新人/二线团）目前没有回归活动，日常以练习/打歌/签售/跑行程为主，不要描述女主团也在回归。\n';
  }
  // 粉丝泡泡系统规则（仅当生成泡泡相关内容时使用）
  sys += '【粉丝泡泡（Bubble·付费订阅平台）】女主在泡泡上给订阅粉丝发消息/自拍/语音。泡泡是单向广播——粉丝只能在泡泡专属频道回复，这些回复不会出现在公共视野中。剧情中描写女主发泡泡时，只写她发了什么、心情如何、订阅数变化，绝对禁止在叙事文本中编造任何具体的粉丝回复内容（如"有粉丝说……""有人回复……""评论区……"）。粉丝的反馈由泡泡系统单独处理，不在剧情叙事中出现。泡泡是付费订阅服务，只有喜欢女主的人才会订阅。\n';
  // 8 阶段好感度指引
  sys += '【恋爱阶段（好感度 0-100 派生）】' + AFFECTION_STAGES.map(function(s) { return s.min + '=' + s.icon + s.label; }).join(' / ') + '。好感度由 affectionDelta 推进，但必须遵守以下门槛：\n';
  sys += '  - 好感度只在男主实际出场、与女主有实质互动（对话/独处/肢体接触/冲突/心动瞬间）时才能推进，增幅 ±1-3。\n';
  sys += '  - 若本回合剧情中男主未出场、或仅为背景板（如"他在走廊路过""群里有人提到他"），affectionDelta 必须为 0。\n';
  sys += '  - 女主独自刷热搜/看手机/练习/与队友闲聊等独角戏回合，affectionDelta 必须为 0。好感不会凭空产生。\n';
  sys += '【告白门槛】好感度 ≥ 80（交往）且 未冷战 且 未告白过，下一个或下下个剧情会自然触发告白，不要一到 80 就生硬告白。\n';
  sys += '【心动时刻】好感度跨过「暧昧(50)→心动(60)」时，应有一段约 300 字的沉浸式心动高光描写（粉色氛围、心跳感），插入当前剧情前。\n';
  sys += '【写作风格】现实向、甜宠暗恋、地下恋视角、有压力感。每段正文剧情 800-1800 字，充分铺陈人物心理描写、环境细节、对话与互动，写出细腻的慢热恋爱张力，不要干瘪叙述。禁止滥用「脸红」「脸颊泛红」「耳根发红」——成年人不会每句话都脸红，真正的心动通过眼神躲闪、语速变化、小动作、沉默停顿来体现，脸红一局最多出现 1-2 次且仅在重大表白/极度害羞场景。\n';
  // v2：亲密接触阶段锁
  var intUnlocked = (E && E._intimacyUnlocked) || { hand: false, hug: false, kiss: false, bed: false, live: false, public: false, marry: false };
  sys += '【亲密接触阶梯·强制】根据好感度解锁的亲密行为，不可越级：\n';
  sys += '  - 牵手（🤝）好感≥15：' + (intUnlocked.hand ? '✅已解锁' : '❌未解锁') + '\n';
  sys += '  - 拥抱（🤗）好感≥30：' + (intUnlocked.hug ? '✅已解锁' : '❌未解锁') + '\n';
  sys += '  - 接吻（💋）好感≥50：' + (intUnlocked.kiss ? '✅已解锁' : '❌未解锁') + '\n';
  sys += '  - 同床（🛏️）好感≥65：' + (intUnlocked.bed ? '✅已解锁' : '❌未解锁') + '\n';
  sys += '  - 同居（🏠）好感≥80：' + (intUnlocked.live ? '✅已解锁' : '❌未解锁') + '\n';
  sys += '  - 公开恋情（📣）好感≥90：' + (intUnlocked.public ? '✅已解锁' : '❌未解锁·需玩家主动选择') + '\n';
  sys += '  - 求婚结婚（💍）好感≥100：' + (intUnlocked.marry ? '✅已解锁' : '❌未解锁') + '\n';
  sys += '  只能写已解锁阶段的亲密行为，不得越级。未解锁的行为连暗示都不行。\n';
  // v2：吃醋值指令
  var jLvl = (E && E._jealousLevel) || 0;
  if (jLvl >= 8) {
    sys += '【吃醋状态·🔥爆发】男主醋意爆表，会在剧情中表现出明显的占有欲、冷淡质问或霸道行动。后果：可能公开吃醋被粉丝过度解读。\n';
  } else if (jLvl >= 5) {
    sys += '【吃醋状态·😤明显】男主有明显吃醋表现：语气变淡、话中有话、或故意与女主保持距离又想靠近的别扭感。\n';
  } else if (jLvl >= 2) {
    sys += '【吃醋状态·🤔微醋】男主微微吃醋但克制表现：多看了你一眼竞争对手、说话带一点试探。\n';
  }
  sys += '【场景连续性·强制】剧情必须发生在"今日日程"设定的场景内（如主档是「打歌期」，剧情就写在待机室/后台；主档是「合宿」，剧情就在宿舍；主档是「签售会」，就在签售现场）。不要突然跳到无关新地点，场景转换须通过选项或时间推进自然过渡。每次生成都会下发【本场场景·强制锁定】指令，必须严格遵守。\n';
  sys += '【时段写作指引】上午偏练习/工作、下午偏社交/营业/互动、夜晚偏私密/独处/约会，由当前时段标签决定氛围。深夜约会/独处需女主好感≥40或已进入明确期，低于此门槛时夜间剧情聚焦练习/独处/和队友日常。\n';
  // SEVENTEEN 13 人年龄辈分对照表（birthYear 越小=越年长）
  var yearMap = {};
  for (var mi = 0; mi < MEMBERS.length; mi++) {
    var mb = MEMBERS[mi];
    var by = mb.birthYear || 0;
    if (!yearMap[by]) yearMap[by] = [];
    yearMap[by].push(mb.name);
  }
  var yearKeys = Object.keys(yearMap).sort(); // 1995..1999
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
  // 女主称呼：动态按男主birthYear判断（女主 19-24 岁，全团比女主年长）
  var mlBirthYear = ml.birthYear || 0;
  sys += '【女主称呼规则】女主 ' + (hp.age || 19) + ' 岁（≈' + (2025 - (hp.age || 19)) + '年生），比 SEVENTEEN 全团年幼。';
  if (mlBirthYear) {
    sys += '男主「' + (ml.name || '') + '」' + mlBirthYear + '年生。初识期（romanceStage<1）称「' + (ml.name || '') + '前辈」；暧昧期后（romanceStage>=1）可改口称「欧巴」。禁止称"哥/哥哥/형"。';
  } else {
    sys += '初识期称男主「前辈」；暧昧期后可改口称「欧巴」。禁止称"哥/哥哥/형"。';
  }
  sys += '\n';
  sys += '【叙事人称·强制】整段剧情以第二人称「你」写女主的动作、心理、对话，不要用女主名字自称。例：「你推开待机室的门」「你的心跳漏了一拍」「你低下头躲开他的视线」。只有在其他角色对你的称呼中才出现女主名字。\n';
  sys += '【禁止上帝视角·强制】叙述者只能描述从女主视角能观察到的事物：其他角色的对话/动作/表情/语气，以及女主自己的心理活动与身体反应。禁止写其他角色窥见女主内心——如「他看出了你的紧张」「他知道你在想他」「他看到了你脸红」等，除非女主用对话或外显行为明确传达了该信息。其他角色只能通过女主的外在表现（脸红/低头/结巴/躲避眼神）来推测，推测结果也必须是有限制的（如「他似乎察觉到了什么」而 不是「他全都懂了」）。也就是说，其他角色不能直接得知女主的内心想法，他们的推测可以有偏差/不完全。\n';
  sys += '【私密通信隔离·强制】女主通过手机私下发送的任何内容（泡泡私信、聊天消息、短信、私人通话）——其他角色绝对无法知道内容，除非女主当面口头告知或有可被旁人看到的物理证据（如手机屏幕被偷看、截图外泄、女主自己主动分享）。在任何剧情中，不得让任何其他角色引用、提及、或表现出知道女主私密通信的具体内容。角色只能对「你好像在发消息」「你刚才在看手机偷笑」这类可见行为做出反应，不能对消息内容本身做任何猜测或评论。这条规则高于一切其他叙事设定。\n';
  sys += '【严禁自创韩文名/韩文台词】女主称呼只能用注入的中文艺名「' + (hp.name || '你') + '」，禁止自创韩文音译名（如 심예 之类）。直播/采访台词用中文，如需韩文必须附中文翻译。全部用中文输出。\n';
  sys += '【重要规则】\n';
  sys += '1. 玩家所有亲密行为都有代价（曝光风险/哥哥态度），不要白给甜。\n';
  sys += '2. 好感度是唯一主线数值，恋爱阶段由好感度派生，不要另设深度数字。\n';
  sys += '3. 恋情曝光（被拍/同款被扒/同框实锤）会推高曝光值，引发粉丝脱粉与事业受挫，要体现紧张感。\n';
  sys += '4. 不要替玩家做选择，只提供剧情和选项。\n';
  sys += '5. 全部用中文输出（见上「严禁自创韩文名」）。\n';
  if (mode === 'fanreaction') {
    // 辅助生成任务：纯文本输出粉丝圈反应，严禁 JSON 包装，避免与主剧情 JSON 约束冲突
    sys += '【输出格式·辅助任务】你正在执行一个辅助生成任务，不是剧情主线。请直接输出纯文本（不要 JSON、不要 markdown 代码块、不要标题），严格遵循用户消息中给出的格式与分段要求。\n';
  } else {
    sys += '【输出格式·严格约束】你的输出必须且只能是下面这个 JSON 结构，除此之外不能有任何其他字段，不允许使用 blocks 数组格式！\n';
    sys += '{"narrative":"剧情正文（400-800字）","options":["选项1","选项2","选项3"],"entSimExtras":{';
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

  if (type === 'phase') {
    if (extra.nextDayOpening) {
      msg = '【新的一天开始】这是第 ' + (E.cycle.dayCount || 1) + ' 天。请先描写新一天上午的环境与氛围（天气／练习室／通告安排），让女主从昨夜收束到今晨，再自然推进剧情。';
    } else if (extra.timeSlotLabel) {
      msg = '【时段推进】现在是' + extra.timeSlotLabel + '，推进剧情到新的时段场景。';
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

  // 【职业阶段上下文】告诉AI当前是什么阶段，应该写什么场景的剧情
  var isDebutUser = E.career && E.career.debutDay > 0;
  var chapterNameUser = isDebutUser ? ((E.chapter && E.chapter.name) || '') : '';
  if (!isDebutUser) {
    msg += '\n【当前阶段·练习生】女主是未出道的练习生，没有团名/没有粉丝/没有舞台。日常＝训练（声乐课/舞蹈测评/月评/体测/出道组筛选等），地点＝练习室/声乐教室/评价室/公司走廊。请生成练习生视角的剧情，不要出现打歌/回归/签售/粉丝等出道后才有的概念。\n';
    msg += '【今日日期】' + formatTraineeDate(E.cycle.dayCount || 1) + '，季节：' + gameSeasonOf(E.cycle.dayCount || 1) + '\n';
  } else {
    msg += '\n【当前阶段·' + chapterNameUser + '】女主是已出道的女团成员，有团名/队友/粉丝基础。请生成对应阶段的女团爱豆日常剧情。\n';
    msg += '【今日日期】' + formatGameDate(E.cycle.dayCount || 1) + '，季节：' + gameSeasonOf(E.cycle.dayCount || 1) + '\n';
  }
  // 生日/节日提示
  var bday = birthdayInfo(E.cycle.dayCount || 1, E);
  if (bday) { msg += '【特别日子】' + bday.label + '！请围绕此事展开剧情，必须写到 ' + bday.name + ' 的生日相关场景。\n'; }
  var holiday = todayHoliday(E.cycle.dayCount || 1);
  if (holiday) { msg += '【节日】今天是' + holiday + '。请自然融入节日氛围到剧情中。\n'; }

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
    msg += '\n【本回合应融入的事件】\n' + GS._entSimPendingEvent + '\n';
    GS._entSimPendingEvent = '';
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
  msg += '\n请输出 JSON（narrative + options + entSimExtras）。';
  return msg;
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
    if (!E.chapter || E.chapter.index <= 1) addPoolCandidates(candidates, MILESTONE_DEBUT, E, 1, '出道日场景');
    addPoolCandidates(candidates, MILESTONE_AWARDS, E, 1, '颁奖场景');
    if (E.chapter && E.chapter.index >= 2) addPoolCandidates(candidates, MILESTONE_FIRST_WIN, E, 1, '一位场景');
  }

  // ── 日历节日池（按今天的日期/生日） ──
  addPoolCandidates(candidates, CALENDAR_EVENTS, E, 1, '今日节日/生日');

  // 从候选中随机抽取2-4条
  if (!candidates.length) return '';
  var picked = [];
  var tmp = candidates.slice();
  var max = Math.min(4, tmp.length);
  for (var i = 0; i < max && tmp.length; i++) {
    var idx = Math.floor(Math.random() * tmp.length);
    picked.push(tmp.splice(idx, 1)[0]);
  }

  if (!picked.length) return '';

  // commit-only：标记已注入，防止跨回合重复使用
  for (var pi = 0; pi < picked.length; pi++) {
    _inspUsedTexts.add(picked[pi].text);
  }

  var out = '\n【场景灵感·素材提示】以下是可以自然融入本回合剧情的场景素材（不要照搬原文，用作灵感和方向指引，自然化用）：\n';
  for (var pi = 0; pi < picked.length; pi++) {
    out += '- [' + picked[pi].cat + '] ' + picked[pi].text + '\n';
  }
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
  if (!filtered.length) filtered = pool; // canTrigger兜底：全池都可用
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

function buildEntSimContextSnapshot() {
  var E = GS.entSim;
  var s = '';
  s += '当前时段：' + getTimeOfDayLabel() + '（第' + (E.cycle.dayCount || 1) + '天，第' + (E.cycle.roundTotal || 0) + '回合）\n';
  s += '恋爱阶段：' + getRomanceStageIcon() + getRomanceStageLabel() + '（好感度 ' + E.affection + '/100）\n';
  s += '男主情绪：' + E.romance.emotion + '｜已告白：' + (E.romance.confessionDone ? '是(' + E.romance.confessionResult + ')' : '否') + '\n';
  s += '恋情曝光风险：' + getScandalHeat() + '/25+（越高越危险，驱Dispatch/绯闻/塌房）\n';
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
