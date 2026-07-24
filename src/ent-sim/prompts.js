// ============================================================
// 娱乐圈模拟器（entSim）· Prompt 构建（纯恋爱游戏 + 娱乐圈背景）
// buildEntSimSystemPrompt：世界观 + 角色 + 规则 + 输出格式
// buildEntSimUserMessage：玩家动作 + 当前状态快照（含记忆注入）
// ============================================================
import { GS } from '../state.js';
import { getTimeOfDayLabel } from './cycle.js';
import { getRomanceStageLabel, getRomanceStageIcon, AFFECTION_STAGES, affectionStageIndex } from './romance.js';
import { buildMemorySnapshot } from './memory.js';

export function buildEntSimSystemPrompt(mode) {
  var hp = GS.heroineProfile || {};
  var ml = GS.entSim.romance.maleLead;
  var bro = GS.oneHeartRelationCharacter || GS.entSim.brother;
  var rival = GS.entSim.npcNetwork.nodes['npc_rival'];
  var suitor = GS.entSim.npcNetwork.nodes['npc_suitor'];

  var sys = '';
  sys += '你是一个沉浸式娱乐圈恋爱文字游戏的叙事 AI。玩家扮演一名韩国女团爱豆（艺名：' + (hp.name || '你') + '，' + (hp.age || 19) + ' 岁，小糊团成员），在娱乐圈打拼，同时与 SEVENTEEN 成员「' + (ml ? ml.name : '男主') + '」发展一段地下恋。\n';
  sys += '【核心定位】恋爱是主线，娱乐圈是背景层。你的重点是写好「两个人之间的感情发展」：心动、暧昧、吃醋、试探、告白、在一起后的地下甜蜜。娱乐圈的行程/舆论/曝光只是恋爱的张力来源，不要写成经营模拟。\n';
  sys += '【女团队友（背景人物）】女主在 6 人小糊团（女主 + 5 位姐姐），队友（由 AI 按设定具象化客串）：' + sisterSummary() + '。她们是日常背景，可偶尔在剧情里出现（如练习室、待机室、宿舍），增添女团真实感，但不要抢戏。\n';
  sys += '【男主设定】男主「' + (ml ? ml.name : '男主') + '」是 SEVENTEEN 成员，有自己的行程/事业/情绪。让他像真实偶像：会吃醋、会主动、有小动作，不是通用男主。\n';
  if (GS.entSim.romance.seedEvent) {
    sys += '【男主上心契机·种子事件】' + GS.entSim.romance.seedEvent + '\n（这是男主为什么对女主不一样的根，后续告白/吃醋/心动时刻可回溯引用，保持前后一致。）\n';
  }
  if (GS.entSim.romance.mannerisms && GS.entSim.romance.mannerisms.length) {
    sys += '【男主小动作】' + GS.entSim.romance.mannerisms.join('、') + '（每 5-8 回合自然出现一次，用于角色辨识度，不要每次都写）。\n';
  }
  sys += '【称呼演变】男主对女主的称呼随感情推进：初期叫全名或「你妹妹」→ 熟络后叫全名/艺名 → 暧昧期叫「小 X」→ 明确期叫「宝宝/亲爱的」。\n';
  sys += '【男主主动】男主每天约 10% 概率主动发起互动（发消息/探班/吃醋/送东西/约你），按好感阶段解锁类型。\n';
  sys += '【吃醋】当女主和别人同台打歌、被搭话要联系方式、或处在赞助商潜规则感的场景时，男主会吃醋。\n';
  sys += '【哥哥设定】SEVENTEEN 成员、女主亲哥哥（团内队友）「' + (bro ? bro.name : '哥哥') + '」：既是参谋又是潜在阻碍。他担心妹妹、会调侃、会在被拍时打掩护、也会警告。哥哥若被设定为「反对公开」，会卡住男主告白（需玩家先化解他的顾虑）；否则立场是剧情张力来源。\n';
  sys += '【团内竞争者】男主的情敌是 SEVENTEEN 的团内另一位成员（喜欢你、和男主争你）。有递进弧线（初遇→试探→冲突→退出祝福/上位），禁止自创新名字。\n';
  // 8 阶段好感度指引
  sys += '【恋爱阶段（好感度 0-100 派生）】' + AFFECTION_STAGES.map(function(s) { return s.min + '=' + s.icon + s.label; }).join(' / ') + '。好感度由每回合的 affectionDelta(±1-3) 推进。\n';
  sys += '【告白门槛】好感度 ≥ 80（交往）且 未冷战 且 未告白过，下一个或下下个剧情会自然触发告白，不要一到 80 就生硬告白。\n';
  sys += '【心动时刻】好感度跨过「暧昧(50)→心动(60)」时，应有一段约 300 字的沉浸式心动高光描写（粉色氛围、心跳感），插入当前剧情前。\n';
  sys += '【写作风格】现实向、甜宠暗恋、地下恋视角、有压力感。每段正文剧情 400-900 字（JSON 输出下达到 400+ 字即可，不要硬凑字），充分铺陈人物心理、环境与互动细节，避免幼稚甜腻。恋爱慢热有张力。\n';
  sys += '【场景连续性·强制】剧情必须发生在"今日日程"设定的场景内（如主档是「打歌期」，剧情就写在待机室/后台；主档是「合宿」，剧情就在宿舍；主档是「签售会」，就在签售现场）。不要突然跳到无关新地点，场景转换须通过选项或时间推进自然过渡。每次生成都会下发【本场场景·强制锁定】指令，必须严格遵守。\n';
  sys += '【时段写作指引】上午偏练习/工作、下午偏社交/营业/互动、夜晚偏私密/独处/约会，由当前时段标签决定氛围。\n';
  sys += '【称呼规则】女主 ' + (hp.age || 19) + ' 岁，比男主/哥哥年幼，叫男主「XX哥」、叫哥哥「哥」。年长角色可叫女主名或「妹／妹妹」。禁止年幼者对女主用错位称呼。\n';
  sys += '【叙事人称·强制】整段剧情以第二人称「你」写女主的动作、心理、对话，不要用女主名字自称。例：「你推开待机室的门」「你的心跳漏了一拍」「你低下头躲开他的视线」。只有在其他角色对你的称呼中才出现女主名字。\n';
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
    sys += '【输出格式】必须只输出一个 JSON 对象（不要 markdown 代码块）：\n';
    sys += '{"narrative":"剧情正文","options":["选项1","选项2","选项3"],"entSimExtras":{';
    sys += '"affectionDelta":0,';
    sys += '"romanceBeat":{"affectionDelta":0,"emotion":"","note":"","event":""},';
    sys += '"npcEncounter":{"type":"","name":"","intimacyDelta":0,"stance":"","event":"","exposure":0},';
    sys += '"exposureEvent":{"magnitude":0,"note":""},';
    sys += '"brother":{"stance":"","supportDelta":0,"note":""},';
    sys += '"secret":{"item":"","foundByRival":false},';
    sys += '"endingsHint":""}}\n';
    sys += '所有数值增量请用正负整数表示微小变化（如 +2/-3）。options 固定 3 个。\n';
  }
  return sys;
}

export function buildEntSimUserMessage(type, extra) {
  extra = extra || {};
  var E = GS.entSim;
  var msg = '';

  if (type === 'phase') {
    if (extra.nextDayOpening) {
      msg = '【新的一天开始】这是第 ' + (E.cycle.dayCount || 1) + ' 天。请先描写新一天的环境与氛围（天气／练习室／通告安排），让女主从昨夜收束到今晨，再自然推进剧情。';
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

  // 同天上下文：注入今天已发生的全部剧情，保证 AI 场景连续性
  if (!extra.nextDayOpening && GS._entSimCurrent && GS._entSimCurrent.narrative) {
    msg += '\n【今天目前为止发生的所有事（请保持场景、人物、时间连续性，不要跳场景或重复已发生的内容）】\n' + GS._entSimCurrent.narrative + '\n';
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
  } else if (type === 'moment') {
    msg = '【朋友圈】请生成一条女主的朋友圈动态（narrative 即动态正文，options 留空），自然融入当前娱乐圈/恋爱状态，可带 emoji，1-3 句。\n';
  } else if (type === 'theater') {
    msg = '【剧场番外】主题：「' + (extra.themePrompt || '男主视角') + '」。请生成约 800 字番外故事（narrative 即正文，options 留空）。\n';
  }

  // 待注入事件（哥哥/男主主动，由下一回合消费）
  if (GS._entSimPendingEvent) {
    msg += '\n【本回合应融入的事件】\n' + GS._entSimPendingEvent + '\n';
    GS._entSimPendingEvent = '';
  }

  msg += '\n\n【当前状态快照】\n' + buildEntSimContextSnapshot();
  // 强制场景锁定：剧情必须跟随今日日程（除非玩家主动指定了 scene）
  var _ag = GS.entSim.agenda || {};
  if (extra && extra.scene) {
    msg += '\n【本场场景·强制锁定】' + extra.scene + '。本段剧情必须发生在这个场景里，角色位置、对话、动作都要贴合该场景的物理空间与氛围，不要凭空切换到无关地点。\n';
  } else if (type === 'phase' || type === 'choice' || type === 'free') {
    msg += '\n【本场场景·强制锁定】今日核心行程：' + (_ag.main || '待定') + (_ag.mainLoc ? '（地点：' + _ag.mainLoc + '）' : '') + '。本段剧情必须发生在这个行程场景内，角色位置、对话、动作都要贴合该场景的物理空间与氛围，不要凭空切换到无关地点。\n';
  }
  if (extra && extra.extraNote) msg += '\n【补充】' + extra.extraNote + '\n';
  msg += '\n请输出 JSON（narrative + options + entSimExtras）。';
  return msg;
}

function buildEntSimContextSnapshot() {
  var E = GS.entSim;
  var s = '';
  s += '当前时段：' + getTimeOfDayLabel() + '（第' + (E.cycle.dayCount || 1) + '天，第' + (E.cycle.roundTotal || 0) + '回合）\n';
  s += '恋爱阶段：' + getRomanceStageIcon() + getRomanceStageLabel() + '（好感度 ' + E.affection + '/100）\n';
  s += '男主情绪：' + E.romance.emotion + '｜已告白：' + (E.romance.confessionDone ? '是(' + E.romance.confessionResult + ')' : '否') + '\n';
  s += '曝光值：' + (E.misc.exposureAccum || 0) + '（越高越危险）\n';
  var suitorNm = (E.npcNetwork && E.npcNetwork.nodes['npc_suitor']) ? E.npcNetwork.nodes['npc_suitor'].name : '';
  s += '今日日程：主档「' + E.agenda.main + (E.agenda.mainLoc ? '(' + E.agenda.mainLoc + ')' : '') + '」／相关「' + E.agenda.related + '」／' + (suitorNm || '') + '「' + E.agenda.rival + '」' + (E.agenda.brother ? '／哥哥「' + E.agenda.brother + (E.agenda.brotherLoc ? '(' + E.agenda.brotherLoc + ')' : '') + '」' : '') + (E.agenda.maleLead ? '／男主「' + E.agenda.maleLead + (E.agenda.maleLeadLoc ? '(' + E.agenda.maleLeadLoc + ')' : '') + '」' : '') + '\n';
  if (E.brother) s += '哥哥「' + E.brother.name + '」立场：' + E.brother.stance + '｜支持度：' + E.brother.support + '\n';
  // NPC 关系网（精简 4 类）
  var npc = [];
  ['npc_broker', 'npc_fanleader', 'npc_suitor'].forEach(function(id) {
    var n = E.npcNetwork.nodes[id];
    if (n) npc.push(n.name + '(' + n.stance + (n.intimacy ? ',亲密度' + n.intimacy : '') + ')');
  });
  if (npc.length) s += '关系网：' + npc.join('；') + '\n';
  // 秘密
  if (E.secret.items.length) s += '女主秘密：' + E.secret.items.join('；') + (E.secret.foundByRival ? '（已被团内成员发现）' : '') + '\n';
  // 记忆注入（近 7 天关键词 + 全部关键事件）
  var mem = buildMemorySnapshot();
  if (mem) s += '\n' + mem + '\n';
  return s;
}

function sisterSummary() {
  var g = GS.entSim.heroineGroup || [];
  if (!g.length) return '（5 位姐姐，待具象化）';
  return g.map(function(x) { return x.name + '(' + x.roleTag + ')'; }).join('、');
}
