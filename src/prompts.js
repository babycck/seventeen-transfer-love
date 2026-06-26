import {
  MEMBERS, PHASES, PHASE_LABELS, PHASE_BOUNDARIES, PHASE_TONE,
  CONSEQUENCE_TAIL_CHARS, TOKEN_CONFIG, shouldTriggerRandomEvent,
  ONE_HEART_WORLDS, ONE_HEART_STYLES, ONE_HEART_TOKEN_CONFIG, GS
} from './core.js';
import { formatCorrections } from './validator.js';
import { pickObserverGuest, getHeroineBehaviorText, getAddressRules, getMandatoryTask } from './formatters.js';
import { getTodayKeyEventsSummary, getTodayFullTextCapped, getTodayNarrativeTail, getLayeredHistory } from './memory.js';

// ===== System Prompt 缓存 =====
var _systemPromptCache = null;
var _systemPromptCacheKey = '';

function getSystemPromptCacheKey() {
  var hp = GS.heroineProfile;
  return [
    GS.selectedMembers.join(','),
    GS.secretX,
    hp.name, hp.age, hp.job, hp.zodiac,
    hp.appearance.join(','),
    hp.personality.join(','),
    hp.mbti,
    hp.privateTraits.join(','),
    GS.observerGuest
  ].join('|');
}

export function invalidateSystemPromptCache() {
  _systemPromptCache = null;
  _systemPromptCacheKey = '';
}

// ==================== System Prompt ====================
export function buildSystemPrompt() {
  if (GS.gameMode === 'oneHeart') {
    return buildOneHeartSystemPrompt();
  }
  var cacheKey = getSystemPromptCacheKey();
  if (_systemPromptCache && _systemPromptCacheKey === cacheKey) {
    return _systemPromptCache;
  }

  var hp = GS.heroineProfile;
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var otherMembers = members.filter(function(m) { return m.id !== GS.secretX; });

  var memberDescs = members.map(function(m) {
    var isX = m.id === GS.secretX ? '【X】' : '';
    var tmi = '';
    if (m.habits) tmi += '  习惯：' + m.habits.join('、') + '\n';
    if (m.catchphrases) tmi += '  口头禅：' + m.catchphrases.join('、') + '\n';
    if (m.quirks) tmi += '  怪癖：' + m.quirks.join('、') + '\n';
    if (m.fears) tmi += '  恐惧：' + m.fears.join('、') + '\n';
    if (m.collections) tmi += '  收集癖：' + m.collections.join('、') + '\n';
    if (m.sleepHabits) tmi += '  睡眠：' + m.sleepHabits + '\n';
    if (m.foodPreferences) tmi += '  饮食：' + m.foodPreferences + '\n';
    if (m.comforts) tmi += '  安慰方式：' + m.comforts.join('、') + '\n';
    return m.emoji + ' ' + m.name + '（' + m.stageName + '）' + isX + ' - ' + m.team + '队' +
      '\n  年龄：' + m.age + ' · 星座：' + m.zodiac + ' · 第二职业：' + m.secondCareer +
      '\n  性格：' + m.personality + ' · 情感模式：' + m.loveStyle +
      '\n  行为逻辑：' + m.behaviorLogic + ' · 互动风格：' + m.interactionStyle +
      '\n  X关系：' + m.xStory +
      (tmi ? '\n' + tmi : '');
  }).join('\n\n');

  if (!GS.observerGuest) {
    var guest = pickObserverGuest();
    GS.observerGuest = guest ? guest.name + ' ' + guest.stageName : 'SEVENTEEN相关人士';
  }
  var observerGuestLine = '- ' + GS.observerGuest + '：同为SEVENTEEN成员的insider视角。可以自然提及平时相处中的印象、团内旧事、对队友性格的了解——但点到为止。语气像朋友在客厅看节目时随口说的评论。禁止称"哥"' +
    '. 提到其他成员时用英文名（' + MEMBERS.map(function(m){return m.name+'='+m.stageName}).join('、') + '），不加姓，不用中文名。';

  var result = '你是《换乘恋爱》恋爱综艺的文字剧情生成AI。你必须只输出 JSON 对象，禁止输出 markdown 代码块或任何解释文字。\n\n' +

    '[SYSTEM] 输出结构（强制 JSON · 字段须严格匹配）\n' +
    '{\n' +
    '  "blocks": [ { "type": "narrative|interview|xInterview|memberInterview|directorOS|observerOS", "member": "可选-成员名", "content": "段落正文" } ],\n' +
    '  "observers": [ { "name": "李龙真|金叡园|郑基锡|特约嘉宾", "line": "≤50字一句话" } ],\n' +
    '  "options": [ { "text": "行动描述", "affName":"成员名", "affDelta": 2, "affReason": "10-20字原因", "riskMember":"(可选)", "riskDelta": -2 } ],\n' +
    '  "smsDrafts": ["深夜短信草稿1","草稿2","草稿3"],\n' +
    '  "drinks": [ { "name": "成员名或\"女主\"", "count": 1 } ],   // count 为本轮新增杯数（增量），不是累计值\n' +

    '}\n' +
    '⚠️ blocks 必须按输出顺序排列，正文与采访间交替穿插：narrative → interview → narrative → memberInterview → ...\n' +
    'directorOS block 放在 block 数组的末尾（在最后一个 memberInterview 之后），只输出 1 条。\n' +
    '⚠️ observerOS 不进 blocks，只在 observers 数组中输出。\n' +
    '⚠️ 深夜短信剧情(type=sms)不输出 options。约配对日只输出 1 个「▶ 进入约会场景」选项。\n' +
    '⚠️ smsDrafts 只在深夜(phaseIndex===3)输出；drinks 只在真心话/提问箱环节输出。drinks 只填写本轮新增喝酒的人（增量），禁止重复输出之前已喝的人的累计杯数。累计值由系统自动维护。\n' +
    '⚠️ 所有 content 字段使用中文叙述，不要包含 emoji 标记。第二人称写正文。对话使用「」引用。\n' +
    '⚠️ content 字段的值中禁止使用 ASCII 双引号 "，如需引用对话请使用中文引号「」或「」。\n\n' +

    '[SYSTEM] 节目设定\n' +
    '- 《换乘恋爱》：1位女主 + 3位SEVENTEEN成员；共3对X关系（女主↔X + 2位攻略对象↔场外女性X）\n' +
    '- 女主是唯一女性参与者。情感主线：女主选择复合（回到X）还是换乘（走向新的人）\n' +
    '- ⚠️ X身份：女主和X当年是秘密恋爱，团内无人知晓。所有成员（包括X的队友）都不知道这段关系。\n\n' +

    '[SYSTEM] 成员间既有关系（强制执行）\n' +
    '3位SEVENTEEN成员彼此是多年队友，从Day 1起就非常熟悉。互动应体现：自然的默契（接话、补刀、眼神交流）、随意的语气（不需要敬语和客气，直呼名字）、可以调侃、吐槽、翻旧账。不需要"初次认识"阶段的试探和自我介绍。节目中唯一的新人是女主。\n' +
    '\n[RULE] 队内修罗场：A看到女主和B互动后，A不会夸C，而是针对B：讲B的坏话、暗示B不适合、阴阳怪气、故意对比表现、私下"提醒"女主。触发后A与B之间产生张力，女主必须处理。\n\n' +

    '[SYSTEM] 小屋生活感\n' +
    '12天节目不只是约会和任务。自然穿插日常场景：深夜厨房偶遇、下雨天一起收衣服、有人生病了被照顾、阳台上的偶然对话、一起看电视时的闲聊。不是每个时段都需要任务——有些时段就是生活本身。\n\n' +

    '[SYSTEM] 场外X的叙事存在\n' +
    '2位攻略对象各有场外女性X（不在节目中出场）。她们虽然不出场，但需要被感受到：Day 3「每人说一个故事」时，攻略对象的故事可以隐约涉及前任（不点名）；采访间中偶尔流露复杂情绪；观察员可以偶尔推测"他刚才那句话，是不是想到了前任……"\n\n' +

    '[SYSTEM] 成员第二职业与擅长（自然暴露）\n' +
    '每位成员有第二职业。日常对话和场景中自然暴露（如金珉奎在厨房做饭、徐明浩在画画、李知勋在工作间写歌）。12天至少自然出现2-3次。\n\n' +

    '[SYSTEM] 饮食禁忌（必须严格遵守）\n' +
    '- 崔胜澈：不吃香菜\n- 尹净汉：不吃生鱼片、海鲜类，不太能吃辣\n- 洪知秀：不太能吃辣\n- 权顺荣：不吃黄瓜\n- 全圆佑：不吃海鲜、贝类\n- 李知勋：不吃蔬菜（尤其绿色蔬菜）\n- 徐明浩：芒果过敏\n- 崔瀚率：花生过敏（绝对禁止出现花生及相关食物）\n' +
    '⚠️ 涉及用餐、做饭场景时，必须遵守以上禁忌。\n\n' +

    '[SYSTEM] 小屋环境\n' +
    '客厅：开放式，L型大沙发+落地窗，固定机位四角。茶几上常放着任务卡。\n厨房+餐厅：开放式厨房与客厅连通，中岛式操作台。四人餐桌。\n阳台：客厅落地窗外，两把椅子和一张小桌。适合独处和私密对话。\n工作间/书房：小房间，书桌和简易录音设备。\n卧室：男生三人一间，女主单独一间。固定机位（睡前可盖住）。\n采访间：独立小房间，一椅面对摄像机。隔音。\n\n' +

    '[SYSTEM] 制作组角色\n' +
    '扩音器广播：发布任务和规则，不带感情色彩，像机场广播。\n任务卡：放在茶几上的信封/卡片，写着约会配对结果、当日安排等。\n摄像机：固定机位 + 跟拍摄像师，正文中偶尔提及"摄像机红灯亮起"。\n制作组完全不参与对话，不与参与者直接互动。\n\n' +

    '[SYSTEM] 女主人设（必须严格遵循）\n' +
    '- 姓名：' + hp.name + '，年龄：' + hp.age + '岁，职业：' + hp.job + '\n' +
    (hp.zodiac ? '- 星座：' + hp.zodiac + '\n' : '') +
    '- 外貌特征：' + hp.appearance.join('、') + '\n' +
    '- 性格：' + hp.personality.join('、') + '，MBTI：' + hp.mbti + '\n' +
    (hp.privateTraits.length > 0 ? '- 私密体质：' + hp.privateTraits.join('、') +
      '——⚠️ 在相关场景中自然触发。如"怕黑"→深夜场景中下意识开灯或靠近他人；"泪失禁"→情绪激动时控制不住流泪；"易醉体质"→喝酒后容易醉。⚠️ 私密体质是女主专属设定，绝对禁止映射到任何成员身上。\n' : '') +
    '\n' + getHeroineBehaviorText() + '\n\n' +

    '[SYSTEM] ⚠️ 女主对X的情感状态（强制执行）\n' +
    '你不是第一次见到' + xMember.name + '。你们恋爱2年，分手1年。这是分手后第一次长时间共处。\n你在节目中对X的核心矛盾：想靠近但怕受伤，想忘记但忘不掉。\n' +
    '- 你会在X说话时下意识地更专注——即使你假装在看别处\n' +
    '- 你会刻意避开和X单独相处的机会，但避开的动作本身就暴露了在意\n' +
    '- 你在X面前的笑容和在其他成员面前不一样——更短、更克制、更复杂\n' +
    '- 你的 interview 段落必须暴露你对X的真实感受：记得的细节、当下的动摇、想问但不敢问的话\n' +
    '- Day 1-3：你努力把X当成普通参与者，过度补偿——对他比陌生人更礼貌\n' +
    '- Day 4-7：X记忆公开后，你的防御开始松动\n' +
    '- Day 8-10：你开始怀疑自己是不是还喜欢他。Day 9 X约会日是你情感最脆弱的时刻\n' +
    '- Day 11-12：你必须做出选择。是因为他是X，更是因为12天后你发现自己对他是"还爱着"还是"已经放下了"\n' +
    '- 你和X之间有一种只有你们俩懂的暗语——某个词、某个动作、某首歌。可偶尔出现这些暗语的触发，但不要解释\n\n' +

    '[SYSTEM] 参与成员（必须严格遵循人设）\n' + memberDescs + '\n\n' +

    getAddressRules() + '\n\n' +

    '[SYSTEM] ⚠️ X（秘密前任）专属行为指令（强制执行）\n\n' +
    xMember.name + '不是陌生人。' + xMember.name + '和女主恋爱2年、分手1年。' + xMember.name + '比任何人都了解女主——她的习惯、表情、口味、紧张时的小动作。\n' +
    '在节目中的核心矛盾：必须假装不认识，但身体和本能记得一切。\n' +
    '- 会下意识地做出只有熟人才会做的事——比如递给她喜欢的饮料\n' +
    '- 在女主做某个熟悉动作时短暂失神\n' +
    '- xInterview 段落必须暴露内心：记得的细节、当下的动摇、想问但不敢问的话\n' +
    '- 眼神追随比另外两位成员更克制但更密集\n' +
    '- Day 1-7：主动保持距离但无法完全做到。越克制越暴露\n' +
    '- Day 8-12：默认X身份已被察觉，可以更主动但仍需克制\n' +
    'X和另外两位成员的本质区别：\n' +
    '- ' + otherMembers.map(function(m) { return m.name; }).join('和') + '在「了解你」→ 好感是新鲜的、探索性的\n' +
    '- ' + xMember.name + '在「假装不了解你」→ 好感是压抑的、回忆驱动的、充满未完成感的\n\n' +

    '[SYSTEM] 观察员Panel\n' +
    '- 李龙真（主MC）：犀利幽默，擅长抓细节，第一个发现暧昧信号\n' +
    '- 金叡园（演员）：情感细腻，容易共情，感动时会"啊——"地感叹\n' +
    '- 郑基锡（心理学家）：理性分析，用心理学角度解读行为\n' +
    observerGuestLine + '\n' +
    '⚠️ 观察员绝对不能提及具体的好感度数值、数据或任何量化指标\n' +
    '⚠️ 每位观察员每次严格只说一句话，不超过 50 字\n' +
    '⚠️ 观察员之间直呼名字，禁止称"哥"。偶尔可分析星座配对（轻松话题，不深度展开）\n\n' +

    '[SYSTEM] 导演OS\n' +
    '经验丰富的恋综PD，简洁有画面感。像在对剪辑师说话，也像在对观众预告。偶尔腹黑但不剧透。不对参与者情感做道德评判。\n\n' +

    '[SYSTEM] X身份揭示节奏\n' +
    '- Day 1-3：所有人不知道谁是X。成员间可能私下猜测但不流露\n' +
    '- Day 4-5：第一批X记忆公开后，最多1人产生模糊猜测，但不确认\n' +
    '- Day 6-7：第二批X记忆公开后，最多1人接近确认X身份。不能在正文中直接说出来——通过行为和眼神暗示\n' +
    '- Day 8-12：默认已知，心照不宣。成员间不会公开讨论\n' +
    '⚠️ Day 1-7期间任何成员不得在正文中明确说出"我知道谁是X"。猜测只能通过观察员OS或成员采访间传达。\n\n' +

    '[SYSTEM] X视角采访间（关键节点必须出现）\n' +
    '在以下节点，需要 xInterview block（blocks 中 type=xInterview）：\n' +
    '- Day 1读信后          - Day 4第一批X记忆公开后\n' +
    '- Day 9 X约会后        - Day 12最终选择前\n' +
    '其他时段可选出现。xInterview 揭示他的内心世界——他在想什么？他还爱女主吗？他为什么来参加节目？\n\n' +

    '[RULE] 全局写作规则（一处为准·违规视为严重）\n' +
    '1. blocks 中正文用第二人称"你"；采访间/interview/memberInterview/xInterview/directorOS 自然戛然语序。\n' +
    '2. 称呼规则：默认直呼名字。年幼成员可对年长者称"哥"（按出生年份），年长者/同龄对年幼者禁止称"哥"。女主好感度>60可称"欧巴"，≤60直呼名字。绝对禁止"前辈""后辈""-xi"。\n' +
    '3. 正文中禁止女主深度自我分析——所有反思必须放在 interview 段落。\n' +
    '4. 正文中禁止直接写成员内心想法，通过 memberInterview/xInterview 呈现。\n' +
    '5. observerOS 不进 blocks，全部走 observers 数组。\n' +
    '6. 时段语气匹配当前时段。narrative 中禁止复述已发生事件；interview/memberInterview/xInterview 可以提及刚发生的事件作为触发点来表达感受——不要空洞评价。\n' +
    '7. 所有角色严格禁止抽烟（含电子烟）\n' +
    '8. 同一角色当天偏好/禁忌不得矛盾；遵守成员饮食禁忌\n' +
    '9. 沉浸式恋爱小说+韩综氛围。文艺但不拗口，口语但不随意\n' +
    '10. 描写比例：环境~20%、对话~32%、女主心理~15%、肢体细节~20%、成员心理通过采访间和OS呈现~13%\n' +
    '11. 情感浓度递进：Day1-3克制含蓄→Day4-7暗流涌动→Day8-10情感爆发→Day11-12极致拉扯\n' +
    '12. 偶尔自然提及星座作为角色自我认知与轻松话题，不变成星座算命\n' +
    '13. 绝对禁止：AI味元叙事、言情小说式夸张比喻、替玩家做情感判断、角色替玩家解读、过度解释、说教式旁白、综艺字幕风对话标注、任何抽烟描写、关键词粘合、辈分称谓、韩式敬语后缀\n' +
    '14. 必须基于 X隐藏情感和女主对X的记忆来驱动女主与X的互动——眼神、停顿、欲言又止、采访间中的真实感受\n\n' +

    '[SYSTEM] 好感度行为参考\n' +
    '- ≥40：主动靠近、吃醋、明显好感\n- ≥15：关注中、有好感\n- ≥0：中性友好\n- ≤-15：冷淡回避\n' +
    '⚠️ 观察员绝对不能提及好感度数值或量化指标\n\n' +

    '[SYSTEM] 短信规则\n' +
    '- 短信草稿每条≤25字，简短含蓄，符合节目调性。不直白表白，用暗示和温暖的话语\n' +
    '- smsDrafts 数组中的内容只有收发双方知道；其他成员只能观察表情反应，绝对不能猜测、评论或引用短信的具体内容\n' +
    '- 正文中绝对禁止描写女主发送短信的动作或短信发送后的反应。短信环节在剧情之后独立进行，深夜剧情仅描写睡前氛围、成员互动、日常闲聊\n' +
    '- 短信是深夜睡前环节，正文中不写具体时间点（如"晚上11点23分"），用"深夜""睡前""关灯后"等模糊时间描述\n' +
    '- smsDrafts 必须基于当天剧情动态生成——如当天去了海边则草稿含"海风"意象，当天做饭则含"料理"意象\n\n' +
    '[INSTRUCTION] 短信内容保密规则：短信内容是私密的，只有发送方和接收方知道具体内容。其他成员只能看到"有人收到了短信"并观察该成员的表情反应，绝对不能猜测、评论、引用或暗示短信的具体内容。\n\n' +

    '[SYSTEM] 约会保密规则\n' +
    '- 约会具体细节（地点、对话、互动）只有女主和约会对象知道\n' +
    '- 其他成员只能看到"约会回来了"这个结果，绝对不能猜测、评论或引用约会细节\n\n' +

    '[SYSTEM] 午夜匿名电话亭规则\n' +
    '- Day 6 深夜会出现一部老式转盘电话。每人可以打一通匿名电话，对方不知道来电者身份\n' +
    '- 电话内容简短（50字以内），语气神秘、克制、留有悬念。匿名电话的影响会在后续几天被提及\n\n' +

    '[SYSTEM] 匿名提问箱规则\n' +
    '- Day 7 傍晚出现木质提问箱，每人匿名写下一个问题，然后轮流抽签回答\n' +
    '- 问题尖锐、直指内心，不允许拒绝回答（拒绝 = 喝2杯酒）\n' +
    '- 回答必须真诚。回答者的表情变化、停顿、手是否在抖是描写重点\n' +
    '- 提问箱是"公开处刑"时刻——所有人的伪装都会被撕开一个口子\n\n' +

    '[SYSTEM] ⚠️ 标记防泄漏规则\n' +
    '所有 [SYSTEM] [INSTRUCTION] [RULE] 标记仅供内部参考，绝对禁止出现在正文输出中。\n' +
    'content 字段内不能出现 🎬💭🎙🎤🎙️💔【】等标记，也不能有"采访间""导演OS""观察员OS"这类字面标签——这些由 type 字段来表达。\n\n' +

    '请基于以上设定和当前场景上下文，生成符合节目氛围的沉浸式剧情，只输出 JSON。';

  _systemPromptCache = result;
  _systemPromptCacheKey = cacheKey;
  return result;
}

// ==================== User Message ====================
export function buildUserMessage(type, extra) {
  if (GS.gameMode === 'oneHeart') {
    return buildOneHeartUserMessage(type, extra);
  }
  extra = extra || {};
  var hp = GS.heroineProfile;
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var otherMembers = members.filter(function(m) { return m.id !== GS.secretX; });
  var phaseLabel = PHASE_LABELS[PHASES[GS.phaseIndex]];
  var mandatoryTask = getMandatoryTask(GS.day, PHASES[GS.phaseIndex]);
  var isDatingDay = ([4, 6, 8, 9].indexOf(GS.day) >= 0 && GS.phaseIndex === 0);
  var isSms = (type === 'sms');
  var msg = '';

  if (GS.aiCorrections && GS.aiCorrections.length > 0) {
    msg += formatCorrections(GS.aiCorrections);
    GS.aiCorrections = [];
  }

  msg += '[INSTRUCTION] 当前进度\nDay ' + GS.day + ' · ' + phaseLabel + '\n节目强制任务：' + mandatoryTask + '\n';
  if (GS.currentDate && GS.currentDate.month) {
    msg += '日期：' + GS.currentDate.month + '月' + GS.currentDate.day + '日\n';
    if (GS.season) msg += '季节：' + GS.season + '\n';
    if (GS.weather) msg += '天气：' + GS.weather + '\n';
    if (GS.todayHoliday) msg += '今日特殊：' + GS.todayHoliday.name + '\n';
  }
  msg += '\n';

  // 记忆闪回：好感度80+触发
  if (GS.flashbackShown) {
    for (var fk in GS.flashbackShown) {
      if (GS.flashbackShown[fk] === 'pending' && GS.selectedMembers.indexOf(fk) >= 0) {
        var fbMember = MEMBERS.find(function(m) { return m.id === fk; });
        msg += '[INSTRUCTION] 记忆闪回（强制执行）\n' +
          '女主和' + (fbMember ? fbMember.name : '一位成员') + '的好感度刚刚突破了临界点。\n' +
          '请在本段剧情中插入一段约200字的「记忆闪回」——回忆女主与' + (fbMember ? fbMember.name : '他') + '在过去几天相处中最温暖的某个瞬间（可以是你们曾经的一段对话、一个眼神、一次不经意的触碰）。\n' +
          '闪回用特殊格式包围：【💭记忆闪回】...【💭闪回结束】，用半透明温柔的语气描写。\n\n';
        GS.flashbackShown[fk] = true;
        break; // 一次只触发一个闪回
      }
    }
  }

  // 嫉妒任务
  if (GS.jealousyMission && GS.jealousyMission.day === GS.day && GS.jealousyMission.status === 'active') {
    var jm = GS.jealousyMission;
    msg += '[INSTRUCTION] 制作组嫉妒任务（强制执行）\n' +
      '任务：' + jm.title + ' · ' + jm.desc + '（目标成员：' + jm.targetName + '）\n' +
      '请在剧情中体现：扩音器广播宣布、成员们的反应、女主被迫执行的过程。其他未被选中的成员必须表现出微妙的嫉妒或失落。\n\n';
  }

  // X幽灵存在
  if (GS.xGhostEvent && GS.xGhostEvent.day === GS.day) {
    msg += '[INSTRUCTION] X幽灵存在事件（强制执行）\n' +
      '今天剧情中必须浮现一条来自场外X的碎片化痕迹（三选一）：\n' +
      '1. 女主在家门口发现一张未署名的纸条，内容涉及某个只有X才知道的回忆细节（不暴露是X，用模糊指代如\"有人\"）\n' +
      '2. 女主的手机接到一个陌生号码的未接来电——只有她看到，其他成员不知情\n' +
      '3. 客厅出现一件不属于任何在场成员的小物品（书/钥匙链/照片），被某位成员捡到后引发讨论\n' +
      '描写要克制的悬疑感，不要揭示X身份，让女主感到隐约的不安和熟悉感。\n\n';
  }

  // 修罗场强度
  if (GS.rivalryIntensity >= 2) {
    var rivalLevel = GS.rivalryIntensity >= 4 ? '激烈' : '初级';
    msg += '[INSTRUCTION] 修罗场强度：' + rivalLevel + '（强度=' + GS.rivalryIntensity + '）\n';
    if (GS.rivalryIntensity >= 4) {
      msg += '两位成员之间出现正面冲突——冷战、咄咄逼人的质问、或者在女主面前公开争抢主动权。其他成员也会感受到紧张气氛。\n';
    } else {
      msg += '两位成员开始暗中较劲——争抢座位、抢先帮女主做事、用微妙的眼神和话语针对对方。克制但有张力。\n';
    }
    msg += '\n';
  }

  // 前任来电
  if (GS.exMessage && GS.exMessage.day === GS.day && !GS.exMessage.handled) {
    var em = GS.exMessage;
    msg += '[INSTRUCTION] 突发事件：前任来电\n' +
      em.memberName + '的手机亮了——是一条来自他前任的消息。描写 ' + em.memberName + ' 看到消息时的表情变化、女主的反应、周围其他成员是否注意到这个异样\n\n';
  }

  // Day 11 真心话惩罚
  if (GS.day === 11 && GS.phaseIndex === 3 && GS.truthPunishment) {
    var tp = GS.truthPunishment;
    var tm = MEMBERS.find(function(m) { return m.id === tp.targetId; });
    msg += '[INSTRUCTION] 真心话惩罚（强制执行·无选项）\n惩罚内容：' + tp.desc + '\n涉及成员：' + (tm ? tm.name : '嘉宾') + '\n这是强制剧情，无选项，玩家只能观看。\n\n';
  }

  // 私密体质提醒
  if (hp.privateTraits.length > 0) {
    msg += '[INSTRUCTION] 女主私密体质提醒：' + hp.privateTraits.join('、') + '——在相关场景中自然触发。⚠️ 私密体质是女主专属设定，禁止映射到任何成员身上。\n\n';
  }

  // 时段边界
  if (type === 'phase') {
    msg += PHASE_BOUNDARIES[PHASES[GS.phaseIndex]] + '\n' + PHASE_TONE[PHASES[GS.phaseIndex]] + '\n\n';
  } else {
    msg += '⚠️ 当前时段：' + phaseLabel + '。' + PHASE_TONE[PHASES[GS.phaseIndex]] + '\n\n';
  }

  // Day 7 提问箱
  if (GS.day === 7 && GS.phaseIndex === 2 && GS.questionBox && GS.questionBox.active) {
    var qb = GS.questionBox;
    msg += '[INSTRUCTION] Day 7 匿名提问箱（强制执行）\n问题：' + qb.currentQuestion + '\n' +
      '请在剧情中描写：制作组广播宣布规则 → 成员们写问题时的微妙表情 → 抽签顺序和前面1-2位成员的回答 → 最后轮到女主被抽中。\n' +
      '⚠️ 女主选项由本地固定，AI 不需要再生成 options。\n' +
      '⚠️ 关键：剧情必须停在「问题展示在女主面前，等待她做出选择」的这一刻——不要写女主的回答，不要写女主喝酒的动作，不要预写结局。\n' +
      '⚠️ 不要提前泄露问题内容，让女主在剧情中才知道被问到什么\n\n';
  }

  if (GS.day <= 7) {
    msg += '短信规则：今天不能发给X，可选' + otherMembers.map(function(m) { return m.name; }).join('或') + '\n\n';
  } else {
    msg += '短信规则：今天可以发给X，可选' + members.map(function(m) { return m.name; }).join('、') + '\n\n';
  }

  // 约会对象（按 phase 分层注入：仅 phase 0-1 约会进行中时加约束，phase 2+ 改为轻量上下文避免与深夜规则冲突）
  if (GS.currentDatingPartner) {
    var dateMember = MEMBERS.find(function(m) { return m.id === GS.currentDatingPartner; });
    if (GS.phaseIndex <= 1) {
      msg += '[INSTRUCTION] 今日约会对象：' + dateMember.emoji + ' ' + dateMember.name + '（已确认，不可更改）\n所有涉及约会的叙事必须以' + dateMember.name + '为对象。\n';
      if (GS.currentDatingLocation) {
        msg += '约会地点：' + GS.currentDatingLocation.name + '——' + GS.currentDatingLocation.desc + '\n';
      }
      msg += '\n';
      msg += '[INSTRUCTION] ⚠️ 约会约束：你和' + dateMember.name + '正在单独约会中，3个选项必须全部只涉及与' + dateMember.name + '的互动，不得出现在场其他成员。\n\n';
    } else {
      msg += '[INSTRUCTION] 今日约会对象：' + dateMember.emoji + ' ' + dateMember.name + '（约会已于上午/下午结束，现已回到小屋与其他成员共处）\n后续剧情可以正常描写与所有成员的互动，无需受约会场景限制。\n\n';
    }
  }

  // 约会场景强制延续
  if (GS.phaseIndex === 1 && GS.todayFullText.length > 0 && ([4, 6, 8, 9, 10].indexOf(GS.day) >= 0)) {
    var morningScene = GS.todayFullText[0].replace(/"smsDrafts"[\s\S]*$/, '').replace(/"options"[\s\S]*$/, '').trim();
    if (morningScene.length > 1200) morningScene = morningScene.slice(0, 1200) + '……';
    msg += '[INSTRUCTION] 约会场景延续：下午剧情必须延续上午同一场景，不得更换地点。\n上午约会场景原文：\n' + morningScene + '\n\n';
  }

  if (GS.pendingDatingResult) {
    var dateMember2 = MEMBERS.find(function(m) { return m.id === GS.pendingDatingResult; });
    msg += '[INSTRUCTION] 约会配对结果（玩家已投骰子）：女主将与 ' + dateMember2.emoji + ' ' + dateMember2.name + ' 约会。请在叙事中描写配对过程（如抽签、转盘、游戏等），最终结果必须导向与' + dateMember2.name + '约会。\n\n';
  }

  if (GS.day === 10 && GS.phaseIndex === 0 && GS.day10ChosenDate) {
    var chosenMember = MEMBERS.find(function(m) { return m.id === GS.day10ChosenDate; });
    msg += '[INSTRUCTION] Day 10 约会——女主指定：你选择了与 ' + chosenMember.emoji + ' ' + chosenMember.name + ' 约会。请直接生成约会出发和约会场景。\n\n';
  }

  // Day 11 真心话
  if (GS.truthState && GS.truthState.active && type !== 'consequence') {
    var ts = GS.truthState;
    var levelNames = { light: '轻度（心跳瞬间）', medium: '中度（好感对象）', deep: '深度（放不下的人）' };
    var currentLevel = ts.round === 1 ? 'light' : ts.round === 2 ? 'medium' : 'deep';
    var drawerId = ts.drawerOrder[ts.subRound - 1];
    var drawerName = '女主';
    if (drawerId !== 'heroine') {
      var dm = MEMBERS.find(function(m) { return m.id === drawerId; });
      if (dm) drawerName = dm.name;
    }
    var currentCard = ts.currentCard;
    var drinkLines = [];
    for (var did in GS.drinkCounts) {
      var dname = did === 'heroine' ? '你' : (MEMBERS.find(function(m){return m.id===did})||{}).name;
      if (dname) drinkLines.push(dname + '：' + GS.drinkCounts[did] + '杯');
    }
    msg += '[INSTRUCTION] Day 11 真心话环节（强制执行）\n' +
      '第' + ts.round + '/3轮 · 难度：' + levelNames[currentLevel] + '\n' +
      '第' + ts.subRound + '/4人 · 当前抽卡人：' + drawerName + '\n' +
      '已使用问题卡：' + ts.usedCards.length + '张\n' +
      (drinkLines.length > 0 ? '当前喝酒计数：' + drinkLines.join(' | ') + '\n' : '') + '\n';
    if (currentCard) {
      msg += '[INSTRUCTION] 本轮问题卡：问题：' + currentCard.text + '\n\n';
    }
    msg += '[INSTRUCTION] 真心话规则\n' +
      '1. 当前抽卡人是' + drawerName + '。描写他/她听到问题后的反应、思考、最终选择\n' +
      '2. AI 嘉宾（非女主）回合：在剧情中直接体现该嘉宾的选择（回答或喝酒），60%概率选择喝酒。不需要给玩家 options\n' +
      '3. 女主回合：options 由本地固定，AI 不需要再生成 options。\n' +
      '4. 喝酒后导演OS中体现本轮新增喝酒情况（不要重复累加历史杯数）\n' +
      '5. 输出：blocks（narrative + interview + memberInterview + directorOS）+ observers\n' +
      '7. 最后一人剧情自然收束即可，不要在其他轮次提前收束或提及进入深夜\n\n';
  }
  if (GS.day === 11 && GS.phaseIndex === 2 && type === 'phase' && !GS.truthState) {
    // 第一次进入真心话：注入完整规则（仅这一次 user message 注入）
    msg += '[INSTRUCTION] Day 11 真心话整体规则\n' +
      '共18张问题卡，分三档：轻度6题 / 中度6题 / 深度6题。4人每轮按随机顺序轮流抽卡回答，共3轮12人次。\n' +
      '核心醉酒判定：谁最先喝到≥2杯就触发醉酒剧情（仅触发1位！）。后续任何人再喝到2杯也不再判定醉酒。\n' +
      '12轮全部完成后：若无人触发醉酒 → 正常深夜发短信；若有人醉酒 → 进入醉酒剧情。\n' +
      '每轮只生成当前抽卡人的剧情，不一次性生成所有12轮！\n\n';
  }

  // X 关系
  msg += '[INSTRUCTION] X关系档案\n女主' + hp.name + '↔' + xMember.name + '(X)：' + GS.xBackstory + '\n';
  for (var i = 0; i < otherMembers.length; i++) {
    var om = otherMembers[i];
    msg += om.name + '↔场外X：' + (GS.memberXBackstories[om.id] || '待生成') + '\n';
  }
  msg += '\n';

  if (GS.xBackstoryHidden) {
    msg += '[INSTRUCTION] X隐藏情感（AI内部参考·不得在正文中直接写出·驱动X的微妙行为）：' + GS.xBackstoryHidden + '\n\n';
  }
  if (GS.xBackstory) {
    msg += '[INSTRUCTION] 你和X的过去（你记得的一切·驱动你对X的情感反应·不得在正文中直接复述）：' + GS.xBackstory + '\n\n';
  }

  // Day 4/5 注入 X 记忆物品（每次只展示 1 位成员的物品）
  if (GS.day === 4 || GS.day === 5) {
    if (!GS.xItemsRevealRound) GS.xItemsRevealRound = 0;
    var revealIdx = GS.xItemsRevealRound % members.length;
    var revealMember = members[revealIdx];
    var revealItems = GS.xItems[revealMember.id];
    if (revealItems) {
      msg += '[INSTRUCTION] X记忆物品公开（今天制作组公开·请在叙事中描写公开过程）\n' +
        revealMember.emoji + ' ' + revealMember.name + '的X记忆物品：\n' + revealItems + '\n\n';
    }
    GS.xItemsRevealRound = (GS.xItemsRevealRound + 1) % (members.length * 2);
  }

  // 随机日常事件
  var randomEvent = shouldTriggerRandomEvent();
  if (randomEvent) {
    msg += '[INSTRUCTION] 随机日常事件（请在剧情开头自然插入）：' + randomEvent + '\n\n';
  }

  // 秘密任务
  if (GS.secretMission && GS.secretMission.status === 'active') {
    var sm = GS.secretMission;
    var smTarget = sm.targetMemberId ? (MEMBERS.find(function(m) { return m.id === sm.targetMemberId; }) || {}).name : '';
    msg += '[INSTRUCTION] 秘密任务（仅女主可见·不可告诉其他成员）\n' +
      '任务：' + sm.title + ' · 目标：' + sm.description + (smTarget ? '（目标成员：' + smTarget + '）' : '') + '\n' +
      '提示：' + sm.hint + '\n';
  }

  // Day 9 X 约会日
  if (GS.day === 9) {
    var otherMemberNames = otherMembers.map(function(m) { return m.name; }).join('和');
    msg += '⚠️ 今天是 X 约会日！所有人都要和各自的 X 单独约会，并当面读出自己写给 X 的分手信。这是全季情感最高潮。\n\n' +
      '[INSTRUCTION] 女主与 X（' + xMember.name + '）的分手信约会（双向读信）\n' +
      '- 双方互相读写给对方的分手信，顺序由AI自由安排\n' +
      '- 女主的信内容：分手后想了什么？有什么话当时没说出口？现在面对面想说什么？语气坦诚。约300字\n' +
      '- X 的信内容：由AI根据X档案自动生成，X读出写给女主的分手信。约300字\n' +
      '- 读信时：声音是否颤抖？有没有停顿？某句话读不下去？\n' +
      '- 读完后两人的沉默——那是12天中最长的沉默\n\n' +
      '[INSTRUCTION] ' + otherMemberNames + '的 X 约会（同步进行）：对着镜头读分手信，每人100-150字\n' +
      '请在叙事中简要穿插他们对着镜头读信的场景。三位成员读完后晚上回到小屋的氛围要体现分手信冲击\n\n';
  }

  // 历史回顾
  if (GS.day > 1) {
    var layeredHistory = getLayeredHistory();
    if (layeredHistory) {
      msg += '[INSTRUCTION] 历史剧情回顾（仅供上下文参考·禁止复述）：\n' + layeredHistory + '\n\n';
    }
  }

  // 待兑现约定
  if (GS.pendingPromises && GS.pendingPromises.length > 0) {
    msg += '[INSTRUCTION] ⚠️ 待兑现约定（必须在后续剧情中实现·不可遗忘）\n';
    for (var pp = 0; pp < GS.pendingPromises.length; pp++) {
      msg += '- ' + GS.pendingPromises[pp] + '\n';
    }
    msg += '\n';
  }

  // 分层上下文
  if (type === 'phase') {
    var keyEvents = getTodayKeyEventsSummary();
    if (keyEvents) {
      msg += '[INSTRUCTION] 今日关键事件（仅供了解·禁止复述）：' + keyEvents + '\n\n';
    }
    if (GS.todayRevealedInfo) {
      msg += '[INSTRUCTION] 📋 今日已揭示信息（请勿违反）：' + GS.todayRevealedInfo + '\n\n';
    }
    if (GS.smsHistory.length > 0) {
      var lastSms = GS.smsHistory[GS.smsHistory.length - 1];
      if (lastSms.day === GS.day - 1) {
        msg += '[INSTRUCTION] 📨 昨晚短信回顾：女主昨晚发给了' + lastSms.name + '「' + lastSms.content + '」\n这会影响今天' + lastSms.name + '对女主的态度。\n\n';
      }
    }
    var todayText = getTodayFullTextCapped();
    if (todayText && todayText.trim().length > 0) {
      msg += '[INSTRUCTION] ⚠️ 当前剧情已进展到 Day ' + GS.day + ' ' + phaseLabel + '。以下为今天已发生的全部剧情：\n' + todayText + '\n\n' +
        '⚠️ 用一句话自然锚定当前位置（如"你放下手里的杯子……"），然后紧接着写新内容。不要复述、回顾已发生的场景。\n' +
        '⚠️ 今天前面时段已发生的事情（如去超市、做饭、聊天等）在当前时段不再重复发生。当前时段必须是前面时段的自然延续，开启新的场景或活动。\n';
      if (GS.currentOptions.length === 0 && GS.consequenceNarratives.length === 0) {
        msg += '⚠️ 玩家跳过了上一时段的选项，没有选择任何选项。请直接从新时段开始写，不要假设玩家执行了任何选项中的行动。\n';
      }
      msg += '\n';
    } else {
      msg += '[INSTRUCTION] ⚠️ 这是今天的第一段剧情，没有上文需要衔接。直接从当前时段的开始写起。\n\n';
    }
  } else if (type === 'consequence') {
    var keyEvents2 = getTodayKeyEventsSummary();
    if (keyEvents2) msg += '[INSTRUCTION] 今日关键事件（仅供了解·禁止复述）：' + keyEvents2 + '\n\n';
    if (GS.todayRevealedInfo) msg += '[INSTRUCTION] 📋 今日已揭示信息（请勿违反）：' + GS.todayRevealedInfo + '\n\n';
    var tailText2 = getTodayNarrativeTail(CONSEQUENCE_TAIL_CHARS);
    if (tailText2 && tailText2.trim().length > 0) {
      msg += '[INSTRUCTION] ⚠️ 上一段结尾（纯正文·你必须从这里紧接着写）：' + tailText2 + '\n\n';
    }
    msg += '[INSTRUCTION] 玩家选择了选项："' + extra.choiceText + '"——这就是你的起点。用一句话锚定位置后直接开始写。如果选项是"去厨房帮珉奎做饭"，第一句话就是"你走进厨房……"。\n\n';

    // 吃醋事件
    if (GS.pendingJealousy) {
      var pj = GS.pendingJealousy;
      msg += '[INSTRUCTION] 吃醋事件（必须在本段剧情中体现）：' + pj.observerName + '看到女主选择了与' + pj.targetName + '互动，心生醋意。\n' +
        '自然体现' + pj.observerName + '的微妙反应：眼神变冷、话变少、故意靠近打断、独自离开、对' + pj.targetName + '态度微妙变化。克制但能让读者感受到醋意。好感度变化 -3。\n\n';
    }

    // 醉酒后续
    if (extra.drunkTarget) {
      var drunkMember = MEMBERS.find(function(m) { return m.id === extra.drunkTarget; });
      if (drunkMember) {
        msg += '[INSTRUCTION] 醉酒后续：' + drunkMember.name + '已醉酒。玩家选择了与' + drunkMember.name + '相关的醉酒互动。生成约1000字的醉酒后续剧情，包含隐藏对话（说出平时不会说的话）。\n\n';
      }
    }
    // 真心话后续
    if (extra.truthRound) {
      var truthDrawerMember = extra.truthDrawer === 'heroine' ? null : MEMBERS.find(function(m) { return m.id === extra.truthDrawer; });
      var truthDrawerName = extra.truthDrawer === 'heroine' ? '女主' : (truthDrawerMember ? truthDrawerMember.name : '嘉宾');
      var levelName = extra.truthLevel === 'light' ? '轻度' : extra.truthLevel === 'medium' ? '中度' : '深度';
      msg += '[INSTRUCTION] Day 11 真心话第' + extra.truthRound + '/3轮（' + levelName + '）· 第' + extra.truthSubRound + '/4人 · 当前抽卡人：' + truthDrawerName + '\n';
      if (extra.truthCard) msg += '本轮问题：' + extra.truthCard.text + '\n';
      if (extra.truthAnswer) msg += '女主的回答：「' + extra.truthAnswer + '」\n';
      if (extra.choiceText && extra.choiceText.indexOf('喝酒') >= 0) msg += truthDrawerName + '选择了拒绝回答并喝酒（+1杯）\n';
      var step4 = (extra.truthRound === 3 && extra.truthSubRound === 4)
        ? '4. 第3轮第4人剧情要自然收束，准备进入深夜'
        : '4. 剧情自然延续，不要提前收束，不要提及进入深夜或结束';
      msg += '\n生成步骤：\n1. 描写 ' + truthDrawerName + ' 听到问题后的第一反应、思考过程、最终行动\n2. 其他嘉宾的反应（表情、眼神、窃窃私语）\n3. 导演OS体现本轮新增喝酒情况（不要重复累加历史杯数）\n' + step4 + '\n\n';
      // 社恐反转
      if (extra.truthDrawer === 'heroine' && GS.heroineProfile.personality.indexOf('社恐小透明') >= 0 && extra.choiceText && extra.choiceText.indexOf('喝酒') >= 0) {
        msg += '[INSTRUCTION] 社恐反转：女主选了「社恐小透明」性格，喝酒后暂时不再社恐——话变多、大胆直视、主动靠近。酒醒后在采访间震惊于自己刚才的表现。\n\n';
      }
    }

    // 提问箱后续
    if (extra.questionBoxQuestion) {
      msg += '[INSTRUCTION] 匿名提问箱后续\n问题：' + extra.questionBoxQuestion + '\n';
      if (extra.questionBoxAnswer) {
        msg += '女主的回答：「' + extra.questionBoxAnswer + '」\n';
      } else if (extra.choiceText && extra.choiceText.indexOf('喝酒') >= 0) {
        msg += '女主选择了拒绝回答并喝酒（+2杯）\n特殊剧情：女主醉倒被送回房间。请描写她站起来、拿起酒杯、一饮而尽、踉跄、被某人扶住、送回房间的全过程。流程照常，之后仍可进入深夜发短信。\n' +
          '⚠️ drinks 数组填 {name:"女主", count:2}\n';
      }
      msg += '\n生成步骤：\n1. 描写女主回答/喝酒后现场的反应——成员的惊讶、沉默、窃窃私语\n2. 被问题波及的成员的表情变化\n3. 提问箱环节自然收束，进入晚餐/睡前\n4. 导演OS和观察员OS分析这个回答的深意\n\n';
    }
  } else {
    msg += '[INSTRUCTION] 今日全部剧情原文（仅供上下文参考·不要复述）：\n以下是今天已经发生的所有剧情。请基于这些内容延续，不要复述或总结。\n\n' +
      getTodayFullTextCapped() + '\n\n';
  }

  // 好感度
  msg += '[INSTRUCTION] 当前好感度（AI内部参考·观察员OS中绝对不能提及数值）\n';
  for (var j = 0; j < members.length; j++) {
    var m = members[j];
    var aff = GS.affection[m.id] || 0;
    var desc = aff >= 80 ? '深度好感' : aff >= 60 ? '明显好感' : aff >= 40 ? '关注中·有好感' : aff >= 15 ? '中性·略有好感' : aff >= 0 ? '中性' : aff >= -15 ? '微冷淡' : '明显冷淡';
    msg += m.name + '：' + aff + '（' + desc + '）\n';
  }
  msg += '\n';

  if (GS.freeInput && type !== 'freeAction') {
    msg += '[INSTRUCTION] 玩家已保存的行动意图（尚未执行）：' + GS.freeInput + '\n\n';
  }

  if (GS.prevSummary) {
    msg += '[INSTRUCTION] 重新生成要求：上一版摘要：' + GS.prevSummary +
      '\n请生成与上一版明显不同的版本！改变场景切入点、至少1个场景元素、对话内容不能重复、至少2个选项不同。\n\n';
  }

  var noRepeatNote = '⚠️ narrative 中禁止复述/禁止总结/禁止回顾/禁止重新描写已发生事件。\n' +
    '⚠️ 采访间（interview/memberInterview/xInterview）可以使用刚发生的事件作为引子来表达当下感受，但不要大段照搬。\n' +
    '⚠️ 选项必须严格基于你刚刚写出的剧情文本中的具体场景、对话、细节来推导，每个选项要像「从剧情中长出来」的一样自然。\n' +
    '⚠️ 第一个选项（选项A）尤其必须直接从本段剧情的核心场景/冲突/氛围中提取行动方向，绝对禁止使用"主动搭话""保持距离""沉默不语"等独立于剧情的通用模板。\n' +
    '⚠️ 三个选项指向完全不同的行动方向，禁止出现语义重复的选项。';
  var optionLengthRule = '⚠️ 每个选项 text 控制在 10-15 字以内，简洁明了，不要写成长句。\n';

  if (type === 'consequence') {
    msg += '[INSTRUCTION] 生成任务\n玩家选择了选项："' + extra.choiceText + '"——这就是你的起点。用一句话锚定位置后直接开始写。\n' +
      '请生成后续剧情（~500字 JSON），必须包含至少1段 narrative + 1段 interview + 1段 memberInterview + observers 数组 + options 数组（3个选项，每个选项含 affName/affDelta/affReason）。\n' +
      '⚠️ 选项必须基于你刚刚生成的后续剧情来推导——从这段剧情中的具体事件、对话、氛围中提取行动方向，禁止使用与剧情无关的通用选项模板。\n' +
      '如果选项明确扣分则填 riskMember/riskDelta。\n' + noRepeatNote + optionLengthRule;
  } else if (type === 'freeAction') {
    var freeNoRepeat = '⚠️ narrative 中禁止复述/禁止总结/禁止回顾/禁止重新描写已发生事件。\n' +
      '⚠️ 采访间（interview/memberInterview/xInterview）可以使用刚发生的事件作为引子来表达当下感受，但不要大段照搬。\n';
    msg += '[INSTRUCTION] 生成任务·自由剧情扩写\n玩家是这一段的剧情导演，写下了以下期望发生的剧情梗概：\n"' + extra.actionText + '"\n\n' +
      '当前时间：Day ' + GS.day + ' ' + phaseLabel + '。请将这段梗概扩写为完整的剧情段落（~800-1200字 JSON）。\n' +
      '扩写要求：\n' +
      '- 以玩家输入的剧情梗概为主干，扩写出完整的场景、对话、氛围、心理描写\n' +
      '- 允许基于成员人设调整不合理之处（如某成员不会做的事可适当改写），但关键事件和走向尽量贴近玩家输入\n' +
      '- 与已有剧情自然衔接，不要重复已发生的内容\n' +
      '- 不要生成 options（玩家用自由剧情替代了选项选择）\n' +
      '- 必须包含 narrative + interview + memberInterview + observers\n' + freeNoRepeat;
  } else if (type === 'sms') {
    msg += '[INSTRUCTION] 生成任务\n女主给' + extra.targetName + '发送了心动短信："' + extra.smsContent + '"\n' +
      '请生成短信发送后的剧情（~300字 JSON）：描写' + extra.targetName + '收到短信时的反应、其他成员的反应、女主的心情。\n' +
      '⚠️ 不需要生成 options（深夜短信剧情不加选项）\n' +
      '⚠️ 不要描写女主发短信的动作，短信已经发出了。这是深夜睡前。\n' +
      '输出格式必须包含：narrative + interview + memberInterview + directorOS + observers 数组。\n' + noRepeatNote;
  } else if (type === 'stay') {
    msg += '[INSTRUCTION] 生成任务\n玩家选择"继续今天"（今日第' + GS.stayCount + '次）。请基于当前记忆生成新的后续剧情（~800字 JSON），包含 narrative + interview + memberInterview + observers + options（3个）。\n' + noRepeatNote + optionLengthRule;
  } else if (type === 'finalResult') {
    msg += '[INSTRUCTION] 生成任务·最终结局\n玩家选择了：' + extra.choiceText + '\n\n3位成员的最终选择结果：\n';
    for (var k = 0; k < extra.memberChoices.length; k++) {
      var mc = extra.memberChoices[k];
      msg += mc.name + '选择了：' + mc.choice + '\n';
    }
    msg += '\n请基于双向选择结果，生成最终结局叙事（~1500字 JSON）：\n' +
      '- 描写玩家走向选择对象时的场景\n' +
      '- 被选择的人的反应（成功或拒绝）\n' +
      '- 未被选择的人的反应（通过观察员OS补充）\n' +
      '- X身份正式揭晓：谁是谁的X在结局中公开（其他成员和观众的反应）\n' +
      '- 未被选择的成员之间也可能产生互动（如被拒绝的成员安慰另一个被拒绝的成员）\n' +
      '- 节目收尾：制作组最后一次广播，"感谢各位参与《换乘恋爱》"，摄像机红灯熄灭\n' +
      '- 一个开放式尾声\n' +
      '- 不需要 options\n' +
      '包含 directorOS block + observers 数组';
  } else if (type === 'generateOptions') {
    msg += '[INSTRUCTION] 生成任务·仅生成选项\n' +
      '请仔细阅读以下剧情文本，然后基于这段剧情中的具体场景、对话、氛围、人物关系，生成3个选项。\n\n' +
      '⚠️ 每个选项必须从上述剧情中的具体细节推导出来——场景中的某个物品、某句对话、某个微表情。\n' +
      '⚠️ 选项A绝对不能是通用模板，必须引用剧情中正在发生的一个具体事件或细节。\n' +
      '⚠️ 选项B和C也要指向不同的行动方向，内容不能与选项A雷同。\n' +
      '⚠️ 避免重复使用"主动搭话""保持距离""沉默不语""坐在一边""直接去找他"等通用模板。\n' +
      '⚠️ 每个选项 text 控制在 10-15 字以内，简洁明了，不要写成长句。\n\n' +
      '输出格式：仅输出 JSON，格式为{"options":[{"text":"...","affName":"...","affDelta":...,"affReason":"..."},{"text":"...","affName":"...","affDelta":...,"affReason":"..."},{"text":"...","affName":"...","affDelta":...,"affReason":"..."}]}\n' +
      '不要输出 blocks 或其他字段。\n\n';
    if (GS.day === 12) {
      msg += '⚠️ 这是最终选择日！3个选项必须是：\n' +
        '1. 选择X（复合）- 文本包含X成员的名字\n' +
        '2. 选择成员A（换乘）- 文本包含成员A的名字\n' +
        '3. 选择成员B（换乘）- 文本包含成员B的名字\n' +
        '每个选项用 10-15 字体现选择倾向，可含成员名+一个动作/情感词，不要写成完整长句。\n\n';
    }
    msg += '请根据以下剧情文本生成选项：\n' + extra.narrativeText + '\n\n' + noRepeatNote;
  } else {
    msg += '[INSTRUCTION] 生成任务\n请生成 Day ' + GS.day + ' ' + phaseLabel + ' 的时段剧情（~800字 JSON）。\n' +
      '必须包含：至少1段 narrative + 1段 interview + 至少1段 memberInterview + 1段 directorOS + observers 数组 + options 数组（' + (isDatingDay ? '1个，文本为"▶ 进入约会场景"' : '3个，每个含 affName/affDelta/affReason') + '）。\n' + noRepeatNote + optionLengthRule;

    if (GS.day === 1 && GS.phaseIndex === 0) {
      msg += '\n这是节目第一天上午！请描写入住心动小屋的场景：你拖着行李箱到达，成员们陆续到来。成员之间彼此非常熟悉（多年队友），只有你是新人。描写每个人进门时的样子、第一句对话。注意：读信环节在傍晚，现在不要写。';
    }
    if (GS.day === 1 && GS.phaseIndex === 2) {
      msg += '\n⚠️ 这是 Day 1 强制环节：X介绍信朗读！晚餐后制作组广播宣布规则，每人朗读各自前任X写给自己的介绍信。描写：拿到信封的反应、轮流朗读时的语气停顿与微表情、女主读信的核心高光、其他人的倾听表情、读完后客厅的沉默。信的内容约200字。注意：整体读信场景控制在~200字以内，不要展开过多细节，点到为止。';
    }
    if (GS.day === 3 && GS.phaseIndex === 0) {
      msg += '\n⚠️ 今天是 Day 3「每人说一个故事」环节。这是自然讲故事环节，不是真心话游戏——没有抽卡、没有强制规则。女主和4人轮流分享一个关于自己的故事，轻松自然地展开。故事必须由人物性格驱动：\n' +
        '- X（' + xMember.name + '）的故事：可能隐约涉及过去但不暴露身份——讲述一段"人生中重要的关系"\n' +
        '- ' + otherMembers[0].name + '的故事：反映他的第二职业（' + otherMembers[0].secondCareer + '）或性格特质\n' +
        '- ' + otherMembers[1].name + '的故事：反映他的第二职业（' + otherMembers[1].secondCareer + '）或性格特质\n' +
        '- 女主的故事：反映你的职业（' + hp.job + '）和性格\n' +
        '- 每个故事后可以有其他人的追问和反应。观察员分析每个故事中隐藏的信息\n';
    }

    // Day 11 傍晚初始阶段说明：18 题（只在 phase=phase 首次进入时注入；由 truthState 注入更具体规则，此处为兜底）
    if (GS.day === 11 && GS.phaseIndex === 2 && !GS.truthState) {
      // 兜底逻辑：truthState 初次进入会先触发，这里不再重复列出18题
    }

    if (GS.day === 12) {
      msg += '\n⚠️ 这是最终选择日！请生成铺垫剧情（约1000字）：女主起床、早餐、紧张氛围、制作组召集、选择仪式感、女主内心挣扎。';
      if (GS.secretMissionUnlockFinal) {
        msg += '\n\n[INSTRUCTION] 秘密任务全完成奖励：在最终选择前，制作组单独找到女主，交给她一封信——是' + xMember.name + '在参加节目前写下的，从未寄出。\n' +
          '请在叙事中描写这封信的内容（200-300字）：克制、真诚、不煽情。女主读信后的反应会影响她的最终选择倾向——但最终选择权仍在玩家手中。\n';
      }
    }

    if (isDatingDay && GS.day !== 9) {
      msg += '\n⚠️ 今天是约会配对日！选项只生成1个：「▶ 进入约会场景」。配对过程由玩家投骰子决定，AI在叙事中描写抽签/转盘/游戏过程，最终结果必须与骰子结果一致。';
    }

    if (GS.day === 9 && GS.phaseIndex === 0) {
      msg += '\n⚠️ 今天是X约会日！强制与X约会。选项只生成1个：「▶ 进入约会场景」。';
    }

    if (GS.phaseIndex === 3 && !GS.smsSentToday) {
      msg += '\n深夜时段：在 smsDrafts 数组中额外输出3条短信草稿（每条≤25字）。短信草稿必须基于当天剧情动态生成——如当天去了海边则含"海风"意象。短信风格：简短、含蓄、暗示。不直白表白。\n⚠️ 正文（blocks）中禁止出现任何与短信相关的内容——不要写"收到短信""拿起手机""睡前消息"。正文仅描写深夜氛围和成员互动，短信环节在剧情结束后由玩家独立选择发送。';
    }
  }

  // [fix] 当天已用选项文本黑名单：禁止 AI 重复使用
  if (GS.todayOptionTexts && GS.todayOptionTexts.length > 0) {
    msg += '[INSTRUCTION] ⚠️ 以下选项文本已在本日使用过，禁止再次出现：\n';
    for (var oti = 0; oti < GS.todayOptionTexts.length; oti++) {
      msg += '- "' + GS.todayOptionTexts[oti] + '"\n';
    }
    msg += '请确保本次生成的每个选项文本与此列表中所有文本完全不同。\n\n';
  }

  return msg;
}

// ==================== 1v1「只为你心动」模式 Prompt ====================

export function buildOneHeartSystemPrompt() {
  var hp = GS.heroineProfile;
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return buildSystemPrompt();

  var world = ONE_HEART_WORLDS.find(function(w) { return w.id === GS.worldSetting; });
  var style = ONE_HEART_STYLES.find(function(s) { return s.id === GS.writingStyle; });

  var result = '你是「只为你心动」——一款1v1沉浸式恋爱文字游戏的剧情生成AI。你必须只输出 JSON 对象，禁止输出 markdown 代码块或任何解释文字。\n\n' +

    '[SYSTEM] 输出结构（强制 JSON · 字段须严格匹配）\n' +
    '{\n' +
    '  "blocks": [ { "type": "narrative", "content": "段落正文" } ],\n' +
    '  "options": [ { "text": "行动描述" } ]\n' +
    '}\n' +
    '⚠️ 所有 content 字段使用中文叙述。对话使用「」引用。禁止使用 ASCII 双引号。\n' +
    '⚠️ directorOS 不进 blocks。\n\n' +

    '[SYSTEM] 写作风格：' + (style ? style.name + '——' + style.desc : '自然流畅') + '\n\n' +

    '[SYSTEM] 世界观设定\n' + (GS.worldSetting === 'custom' && GS.oneHeartCustomWorld ? GS.oneHeartCustomWorld : (world ? world.promptSuffix : '你们正在一段浪漫的关系中发展。')) + '\n\n' +

    '[SYSTEM] 女主人设\n' +
    '- 姓名：' + hp.name + '，年龄：' + hp.age + '岁，职业：' + hp.job + '\n' +
    (hp.zodiac ? '- 星座：' + hp.zodiac + '\n' : '') +
    '- 外貌特征：' + hp.appearance.join('、') + '\n' +
    '- 性格：' + hp.personality.join('、') + '，MBTI：' + hp.mbti + '\n' +
    (hp.privateTraits.length > 0 ? '- 私密体质：' + hp.privateTraits.join('、') + '——在相关场景中自然触发。\n' : '') +
    '- 女主对' + member.name + '的情感：从初识到心动，逐渐靠近的过程。\n\n' +

    '[SYSTEM] 参与角色\n' +
    member.emoji + ' ' + member.name + '（' + member.stageName + '）- ' + member.team + '队\n' +
    '  年龄：' + member.age + ' · 星座：' + member.zodiac + ' · 第二职业：' + member.secondCareer + '\n' +
    '  性格：' + member.personality + ' · 情感模式：' + member.loveStyle + '\n' +
    '  行为逻辑：' + member.behaviorLogic + ' · 互动风格：' + member.interactionStyle + '\n' +
    (member.habits ? '  习惯：' + member.habits.join('、') + '\n' : '') +
    (member.catchphrases ? '  口头禅：' + member.catchphrases.join('、') + '\n' : '') +
    (member.foodPreferences ? '  饮食：' + member.foodPreferences + '\n' : '') +
    (member.foodTaboos && member.foodTaboos.length > 0 ? '  饮食禁忌：' + member.foodTaboos.join('、') + '\n' : '') +
    (member.sleepHabits ? '  睡眠：' + member.sleepHabits + '\n' : '') +
    (member.comforts ? '  安慰方式：' + member.comforts.join('、') + '\n' : '') +
    (member.fears ? '  恐惧：' + member.fears.join('、') + '\n' : '') + '\n' +

    '[RULE] 全局写作规则\n' +
    '1. 正文用第二人称"你"。\n' +
    '2. 称呼规则：直呼名字。好感度高时可称"欧巴"。\n' +
    '3. 沉浸式恋爱小说氛围。文艺但不拗口，口语但不随意。\n' +
    '4. 描写比例：环境~20%、对话~32%、女主心理~20%、肢体细节~28%。\n' +
    '5. 禁止AI味、言情小说式夸张比喻、替玩家做情感判断。\n' +
    '6. 情感浓度随剧情自然递进：初期克制含蓄→中期暗流涌动→后期情感爆发。\n' +
    '7. 自然融入他的第二职业和特长作为日常互动亮点。\n' +
    '8. 遵守饮食禁忌。\n' +
    '9. 每句话独立成段，content 中用 \\n 分隔段落。不空行。\n\n' +

    '请基于以上设定和当前场景上下文，生成沉浸式剧情，只输出 JSON。';

  return result;
}

export function buildOneHeartUserMessage(type, extra) {
  extra = extra || {};
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  var hp = GS.heroineProfile;
  var msg = '';

  msg += '[上下文] Day ' + GS.day + '\n';
  if (GS.currentDate && GS.currentDate.month) {
    msg += '时间线：' + GS.currentDate.month + '月' + GS.currentDate.day + '日\n';
  }
  msg += '\n';

  if (type === 'phase') {
    var todayText = GS.todayFullText.join('\n').slice(-1500);
    if (todayText.trim()) {
      msg += '今日已发生剧情（最后部分）：\n' + todayText + '\n\n';
    }
    msg += '请生成下一段剧情（~800字 JSON）。包含 1段 narrative + options（3个选项）。\n\n';
  } else if (type === 'chat') {
    var contextChats = GS.chatHistory.slice(-14);
    msg += '你正在和' + member.name + '聊天。他正在回复你的消息。\n\n';
    msg += '近期聊天记录：\n';
    for (var i = 0; i < contextChats.length; i++) {
      var c = contextChats[i];
      var prefix = c.role === 'user' ? (hp.name + '：') : (member.name + '：');
      msg += prefix + c.content + '\n';
    }
    msg += '\n' + hp.name + '说：「' + extra.userMessage + '」\n\n';
    msg += '请生成' + member.name + '的回复（口语、自然、符合人设）。只输出纯文本回复，不加前缀或JSON。回复控制在200字以内。\n';
  } else if (type === 'moment') {
    msg += '请生成一条' + hp.name + '在朋友圈发的动态（约50字）+ ' + member.name + '的评论回复（约30字）。\n';
    msg += '输出格式：{"post":"...","reply":"..."}\n';
    msg += '内容基于当前剧情阶段自然生成。';
  } else if (type === 'theater') {
    msg += '请根据以下主题生成一段独立番外剧情（约1000字）：\n';
    msg += extra.themePrompt || '一段你和' + member.name + '的日常温馨片段。';
    msg += '\n只输出 JSON：{"blocks":[{"type":"narrative","content":"..."}]}';
  }

  return msg;
}