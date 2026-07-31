import {
  MEMBERS, PHASES, PHASE_LABELS, PHASE_BOUNDARIES, PHASE_TONE,
  CONSEQUENCE_TAIL_CHARS, TOKEN_CONFIG, shouldTriggerRandomEvent,
  ONE_HEART_WORLDS, ONE_HEART_STYLES, ONE_HEART_TOKEN_CONFIG, GS,
  SECOND_CAREER_MAP,
} from './core.js';
import { formatCorrections } from './validator.js';
import { dedupeEventLog } from './memory.js';
import { pickObserverGuest, getHeroineBehaviorText, getAddressRules, getMandatoryTask, getSeasonByMonth } from './formatters.js';
import { getAffectionDesc } from './affection.js';
import { getTodayKeyEventsSummary, getTodayFullTextCapped, getTodayNarrativeTail, getLayeredHistory, getTodayHybridContext } from './memory.js';
import { getWorldConfig } from './worlds/index.js';
import { IDOL_PUBLIC_BEATS, IDOL_PRIVATE_BEATS } from './worlds/entertainment.js';
import { IDENTITY_RELATION_MAP, getPlayerBirthYear, ONE_HEART_ENDING_TEMPLATES } from './data.js';
import { isSisterSetting, normalizePromiseText } from './utils.js';
import { activeEventThisPhase } from './skeleton/event-triggers.js';
import { buildMoodInstruction } from './skeleton/mood-engine.js';

// ==================== 结构化事实记忆硬约束（A） ====================
// 读取 GS.memoryFacts（按 角色→类别 存储），生成紧凑 bullet 注入 prompt。
function buildMemoryFactsBullet() {
  var mf = GS.memoryFacts || {};
  var lines = [];
  function _push(owner, label) {
    var o = mf[owner];
    if (!o) return;
    var cats = [['preferences', '偏好'], ['taboos', '禁忌'], ['allergens', '过敏原']];
    for (var ci = 0; ci < cats.length; ci++) {
      var arr = o[cats[ci][0]] || [];
      for (var i = 0; i < arr.length; i++) {
        lines.push('- ' + label + '·' + cats[ci][1] + '：' + arr[i]);
      }
    }
  }
  _push('heroine', '女主');
  for (var k in mf) {
    if (!mf.hasOwnProperty(k) || k === 'heroine') continue;
    var m = MEMBERS.find(function(mm) { return mm.id === k; });
    _push(k, m ? m.name : k);
  }
  if (lines.length === 0) return '';
  return '[已知信息·硬约束·请勿违反] 以下为已揭示的角色偏好/禁忌/过敏原，剧情中必须严格遵守，不可让角色做出与之矛盾的行为（如给过敏原吃东西、无视禁忌）：\n' + lines.join('\n') + '\n\n';
}

// 仅针对女主实际拥有的特征输出固定位置说明（私密体质"选了什么就是什么"）
function buildFeaturePosNote(hp) {
  var notes = [];
  if (hp.appearance.indexOf('泪痣') >= 0 || hp.appearance.indexOf('狐狸眼泪痣') >= 0) {
    notes.push('「泪痣」「狐狸眼泪痣」是眼角的痣');
  }
  if (hp.appearance.indexOf('锁骨精灵骨') >= 0) {
    notes.push('「锁骨精灵骨」是锁骨线条');
  }
  if (hp.privateTraits.indexOf('敏感带在耳后') >= 0) {
    notes.push('「敏感带在耳后」是耳后区域');
  }
  if (notes.length === 0) return '';
  return '- 注意：' + notes.join('，') + '，每个特征在各自固定位置，不可混淆。\n';
}

// [F] getOneHeartMealHint 已移除：1v1 不再锚定具体时段，午饭描写不再受时钟约束

// ===== System Prompt 缓存 =====
var _systemPromptCache = null;
var _systemPromptCacheKey = '';

function getSystemPromptCacheKey() {
  var hp = GS.heroineProfile;
  return [
    GS.selectedMembers.join(','),
    GS.secretX,
    hp.name, hp.age, hp.job, hp.profession, hp.zodiac,
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
  if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim')) {
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
      '\n  出生年份：' + m.birthYear + ' · 星座：' + m.zodiac + ' · 第二职业：' + m.secondCareer + (SECOND_CAREER_MAP[m.secondCareer] ? '（' + SECOND_CAREER_MAP[m.secondCareer] + '）' : '') +
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

    '## SYSTEM ## 输出结构（强制 JSON · 字段须严格匹配）\n' +
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

    '## SYSTEM ## 节目设定\n' +
    '- 《换乘恋爱》：1位女主 + 3位SEVENTEEN成员；共3对X关系（女主↔X + 2位攻略对象↔场外女性X）\n' +
    '- 女主是唯一女性参与者。情感主线：女主选择复合（回到X）还是换乘（走向新的人）\n' +
    '- ⚠️ X身份：女主和X当年是秘密恋爱，团内无人知晓。所有成员（包括X的队友）都不知道这段关系。\n\n' +

    '## SYSTEM ## 成员间既有关系（强制执行）\n' +
    '3位SEVENTEEN成员彼此是多年队友，从Day 1起就非常熟悉。互动应体现：自然的默契（接话、补刀、眼神交流）、随意的语气（不需要敬语和客气，直呼名字）、可以调侃、吐槽、翻旧账。不需要"初次认识"阶段的试探和自我介绍。节目中唯一的新人是女主。\n' +
    '\n## RULE ## 队内修罗场：A看到女主和B互动后，A不会夸C，而是针对B：讲B的坏话、暗示B不适合、阴阳怪气、故意对比表现、私下"提醒"女主。触发后A与B之间产生张力，女主必须处理。\n\n' +

    '## SYSTEM ## 小屋生活感\n' +
    '12天节目不只是约会和任务。自然穿插日常场景：深夜厨房偶遇、下雨天一起收衣服、有人生病了被照顾、阳台上的偶然对话、一起看电视时的闲聊。不是每个时段都需要任务——有些时段就是生活本身。\n\n' +

    '## SYSTEM ## 场外X的叙事存在\n' +
    '2位攻略对象各有场外女性X（不在节目中出场）。她们虽然不出场，但需要被感受到：Day 3「每人说一个故事」时，攻略对象的故事可以隐约涉及前任（不点名）；采访间中偶尔流露复杂情绪；观察员可以偶尔推测"他刚才那句话，是不是想到了前任……"\n\n' +

    '## SYSTEM ## 成员第二职业与擅长（自然暴露）\n' +
    '每位成员有第二职业。日常对话和场景中自然暴露（如金珉奎在厨房做饭、徐明浩在画画、李知勋在工作间写歌）。12天至少自然出现2-3次。\n\n' +

    '## SYSTEM ## 饮食禁忌（必须严格遵守）\n' +
    '- 崔胜澈：不吃香菜\n- 尹净汉：不吃生鱼片、海鲜类，不太能吃辣\n- 洪知秀：不太能吃辣\n- 权顺荣：不吃黄瓜\n- 全圆佑：不吃海鲜、贝类\n- 李知勋：不吃蔬菜（尤其绿色蔬菜）\n- 徐明浩：芒果过敏\n- 崔瀚率：花生过敏（绝对禁止出现花生及相关食物）\n' +
    '⚠️ 涉及用餐、做饭场景时，必须遵守以上禁忌。\n\n' +

    '## SYSTEM ## 小屋环境\n' +
    '客厅：开放式，L型大沙发+落地窗，固定机位四角。茶几上常放着任务卡。\n厨房+餐厅：开放式厨房与客厅连通，中岛式操作台。四人餐桌。\n阳台：客厅落地窗外，两把椅子和一张小桌。适合独处和私密对话。\n工作间/书房：小房间，书桌和简易录音设备。\n卧室：男生三人一间，女主单独一间。固定机位（睡前可盖住）。\n采访间：独立小房间，一椅面对摄像机。隔音。\n\n' +

    '## SYSTEM ## 制作组角色\n' +
    '扩音器广播：发布任务和规则，不带感情色彩，像机场广播。\n任务卡：放在茶几上的信封/卡片，写着约会配对结果、当日安排等。\n摄像机：固定机位 + 跟拍摄像师，正文中偶尔提及"摄像机红灯亮起"。\n制作组完全不参与对话，不与参与者直接互动。\n\n' +

    '- 姓名：' + hp.name + '，年龄：' + hp.age + '岁，出生年份：' + (getPlayerBirthYear(hp.age, GS.oneHeartStartYear || 2025)) + '年，职业：' + hp.job + '\n' +
    (hp.zodiac ? '- 星座：' + hp.zodiac + '\n' : '') +
    '- 外貌特征：' + hp.appearance.join('、') + '\n' +
    '- 性格：' + hp.personality.join('、') + '，MBTI：' + hp.mbti + '\n' +
    (hp.privateTraits.length > 0 ? '- 私密体质：' + hp.privateTraits.join('、') +
      '——⚠️ 在相关场景中自然触发。如"怕黑"→深夜场景中下意识开灯或靠近他人；"泪失禁"→情绪激动时控制不住流泪；"易醉体质"→喝酒后容易醉。⚠️ 私密体质是女主专属设定，绝对禁止映射到任何成员身上。\n' : '') +
    buildFeaturePosNote(hp) +
    '\n' + getHeroineBehaviorText() + '\n\n' +

    '## SYSTEM ## ⚠️ 女主对X的情感状态（强制执行）\n' +
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

    '## SYSTEM ## 参与成员（必须严格遵循人设）\n' + memberDescs + '\n\n' +

    getAddressRules() + '\n\n' +

    '## SYSTEM ## ⚠️ X（秘密前任）专属行为指令（强制执行）\n\n' +
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

    '## SYSTEM ## 观察员Panel\n' +
    '- 李龙真（主MC）：犀利幽默，擅长抓细节，第一个发现暧昧信号\n' +
    '- 金叡园（演员）：情感细腻，容易共情，感动时会"啊——"地感叹\n' +
    '- 郑基锡（心理学家）：理性分析，用心理学角度解读行为\n' +
    observerGuestLine + '\n' +
    '⚠️ 观察员绝对不能提及具体的好感度数值、数据或任何量化指标\n' +
    '⚠️ 每位观察员每次严格只说一句话，不超过 50 字\n' +
    '⚠️ 观察员之间直呼名字，禁止称"哥"。偶尔可分析星座配对（轻松话题，不深度展开）\n\n' +

    '## SYSTEM ## 导演OS\n' +
    '经验丰富的恋综PD，简洁有画面感。像在对剪辑师说话，也像在对观众预告。偶尔腹黑但不剧透。不对参与者情感做道德评判。\n\n' +

    '## SYSTEM ## X身份揭示节奏\n' +
    '- Day 1-3：所有人不知道谁是X。成员间可能私下猜测但不流露\n' +
    '- Day 4-5：第一批X记忆公开后，最多1人产生模糊猜测，但不确认\n' +
    '- Day 6-7：第二批X记忆公开后，最多1人接近确认X身份。不能在正文中直接说出来——通过行为和眼神暗示\n' +
    '- Day 8-12：默认已知，心照不宣。成员间不会公开讨论\n' +
    '⚠️ Day 1-7期间任何成员不得在正文中明确说出"我知道谁是X"。猜测只能通过观察员OS或成员采访间传达。\n\n' +

    '## SYSTEM ## X视角采访间（关键节点必须出现）\n' +
    '在以下节点，需要 xInterview block（blocks 中 type=xInterview）：\n' +
    '- Day 1读信后          - Day 4第一批X记忆公开后\n' +
    '- Day 9 X约会后        - Day 12最终选择前\n' +
    '其他时段可选出现。xInterview 揭示他的内心世界——他在想什么？他还爱女主吗？他为什么来参加节目？\n\n' +

    '## RULE ## 全局写作规则（一处为准·违规视为严重）\n' +
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
    '14. 必须基于 X隐藏情感和女主对X的记忆来驱动女主与X的互动——眼神、停顿、欲言又止、采访间中的真实感受\n' +
    '15. 读信规则：读信内容控制在约200字。格式必须按以下枚举之一输出：\n' +
    '   - 信件正文：以「亲爱的…」或「To…」开头，以署名结尾\n' +
    '   - 读信过程描写：谁在读、语气、停顿、微表情\n' +
    '   - 读完后反应：沉默、对话、眼神交流\n\n' +

    '16. [长度强制] 选项后续剧情（consequence）正文必须达到 1500-2000 字（约等于 1500-2000 个汉字）。这是硬性要求，禁止输出过短段落。如果内容偏短，必须扩展环境描写、对话、心理活动和肢体细节，直到满足字数。\n\n' +

    '## SYSTEM ## 好感度行为参考\n' +
    '- ≥40：主动靠近、吃醋、明显好感\n- ≥15：关注中、有好感\n- ≥0：中性友好\n- ≤-15：冷淡回避\n' +
    '⚠️ 观察员绝对不能提及好感度数值或量化指标\n\n' +

    '## SYSTEM ## 短信规则\n' +
    '- 短信草稿每条≤25字，简短含蓄，符合节目调性。不直白表白，用暗示和温暖的话语\n' +
    '- smsDrafts 数组中的内容只有收发双方知道；其他成员只能观察表情反应，绝对不能猜测、评论或引用短信的具体内容\n' +
    '- 正文中绝对禁止描写女主发送短信的动作或短信发送后的反应。短信环节在剧情之后独立进行，深夜剧情仅描写睡前氛围、成员互动、日常闲聊\n' +
    '- 短信是深夜睡前环节，正文中不写具体时间点（如"晚上11点23分"），用"深夜""睡前""关灯后"等模糊时间描述\n' +
    '- smsDrafts 必须基于当天剧情动态生成——如当天去了海边则草稿含"海风"意象，当天做饭则含"料理"意象\n' +
    '- 发送短信场景不要进入采访间。短信环节属于睡前私密时刻，不触发采访间段落\n' +
    '- 短信内容对其他成员保密。其他成员不知道短信的具体内容，也无法猜测或推断\n' +
    '- 深夜禁止发短信给非好感对象。好感度低于40的成员不能成为短信收件人\n\n' +

    '## SYSTEM ## 约会保密规则\n' +
    '- 约会具体细节（地点、对话、互动）只有女主和约会对象知道\n' +
    '- 其他成员只能看到"约会回来了"这个结果，绝对不能猜测、评论或引用约会细节\n\n' +

    '## SYSTEM ## 午夜匿名电话亭规则\n' +
    '- Day 6 深夜会出现一部老式转盘电话。每人可以打一通匿名电话，对方不知道来电者身份\n' +
    '- 电话内容简短（50字以内），语气神秘、克制、留有悬念。匿名电话的影响会在后续几天被提及\n\n' +

    '## SYSTEM ## 匿名提问箱规则\n' +
    '- Day 7 傍晚出现木质提问箱，每人匿名写下一个问题，然后轮流抽签回答\n' +
    '- 问题尖锐、直指内心，不允许拒绝回答（拒绝 = 喝2杯酒）\n' +
    '- 回答必须真诚。回答者的表情变化、停顿、手是否在抖是描写重点\n' +
    '- 提问箱是"公开处刑"时刻——所有人的伪装都会被撕开一个口子\n\n' +

    '## SYSTEM ## ⚠️ 标记防泄漏规则\n' +
    '所有 [SYSTEM] [INSTRUCTION] [RULE] 标记仅供内部参考，绝对禁止出现在正文输出中。\n' +
    'content 字段内不能出现 🎬💭🎙🎤🎙️💔【】等标记，也不能有"采访间""导演OS""观察员OS"这类字面标签——这些由 type 字段来表达。\n\n' +

    '请基于以上设定和当前场景上下文，生成符合节目氛围的沉浸式剧情，只输出 JSON。';

  _systemPromptCache = result;
  _systemPromptCacheKey = cacheKey;
  return result;
}

// ==================== User Message ====================
export function buildUserMessage(type, extra) {
  if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim')) {
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

  // 历史压缩记忆（dailySummaries）— [计划B问题3] 分层衰减注入
  if (GS.dailySummaries && GS.dailySummaries.length > 0) {
    msg += '[历史回顾]\n';
    var _totalDays = GS.dailySummaries.length;
    for (var _dsi = 0; _dsi < _totalDays; _dsi++) {
      var _dayNum = _dsi + 1;
      var _distFromEnd = _totalDays - _dsi;
      var _summary = GS.dailySummaries[_dsi];
      if (_distFromEnd <= 2) {
        // 最近2天：完整摘要
        msg += 'Day ' + _dayNum + '：' + _summary + '\n';
      } else if (_distFromEnd <= 5) {
        // 3-5天前：截取前200字
        msg += 'Day ' + _dayNum + '：' + (_summary.length > 200 ? _summary.slice(0, 200) + '……' : _summary) + '\n';
      } else {
        // 6+天前：只保留约定和揭示信息（JSON条目解析）
        var _parsed2 = null;
        try { _parsed2 = JSON.parse(_summary); } catch (e) {
          var _m2 = _summary.match(/\{[\s\S]*\}/);
          if (_m2) { try { _parsed2 = JSON.parse(_m2[0]); } catch (e2) {} }
        }
        if (_parsed2) {
          var _keep = [];
          if (_parsed2.promises && _parsed2.promises.length > 0) _keep = _keep.concat(_parsed2.promises.map(function(p) { return '约定：' + p; }));
          if (_parsed2.revealedInfo && _parsed2.revealedInfo.length > 0) _keep = _keep.concat(_parsed2.revealedInfo.map(function(r) { return '揭示：' + r; }));
          if (_keep.length > 0) msg += 'Day ' + _dayNum + '：' + _keep.join('；') + '\n';
        }
      }
    }
    msg += '\n';
  }

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

  // 相位级事件仲裁（IMP-01）：同一相位只放行一个主导强制事件，其余顺延
  var dominantEvent = activeEventThisPhase();

  // 嫉妒任务
  if (dominantEvent === 'jealousyMission' && GS.jealousyMission && GS.jealousyMission.day === GS.day && GS.jealousyMission.status === 'active') {
    var jm = GS.jealousyMission;
    msg += '[INSTRUCTION] 制作组嫉妒任务（强制执行）\n' +
      '任务：' + jm.title + ' · ' + jm.desc + '（目标成员：' + jm.targetName + '）\n' +
      '请在剧情中体现：扩音器广播宣布、成员们的反应、女主被迫执行的过程。其他未被选中的成员必须表现出微妙的嫉妒或失落。\n\n';
  }

  // X幽灵存在
  if (dominantEvent === 'xGhostEvent' && GS.xGhostEvent && GS.xGhostEvent.day === GS.day) {
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

  // IMP-10：脚踏两条船高风险期
  if (GS.secretDating) {
    msg += '[INSTRUCTION] 脚踏两条船高风险期：女主同时与两位及以上成员关系亲密且尚未公开。请在剧情中自然流露"被撞见/穿帮"的紧张感——成员间微妙的试探、某一方的察觉、女主的心虚与权衡。但不要一次性写死结局，留博弈空间。\n\n';
  }

  // IMP-11：成员间关系网
  if (GS.memberBond && Object.keys(GS.memberBond).length > 0) {
    var _relLines = [];
    for (var _bk in GS.memberBond) {
      var _bv = GS.memberBond[_bk];
      if (!_bv) continue;
      var _ids = _bk.split('|');
      var _ma = MEMBERS.find(function(m) { return m.id === _ids[0]; });
      var _mb = MEMBERS.find(function(m) { return m.id === _ids[1]; });
      if (!_ma || !_mb) continue;
      var _rel = _bv <= -2 ? '暗中较劲/敌对' : (_bv >= 2 ? '同盟/亲近' : '微妙');
      _relLines.push('- ' + _ma.name + ' 与 ' + _mb.name + '：' + _rel + (Math.abs(_bv) >= 2 ? '（强度 ' + Math.abs(_bv) + '）' : ''));
    }
    if (_relLines.length > 0) {
      msg += '[INSTRUCTION] 成员间关系网（请在群戏中自然体现，不要生硬点明标签）：\n' + _relLines.join('\n') + '\n\n';
    }
  }

  // IMP-12：抉择代价链（长线后果延迟爆发）
  if (GS.futureConsequences && GS.futureConsequences.length > 0) {
    var _due = [];
    for (var _fi = 0; _fi < GS.futureConsequences.length; _fi++) {
      var _fc = GS.futureConsequences[_fi];
      if (!_fc.triggered && _fc.dueDay <= GS.day) _due.push(_fc);
    }
    if (_due.length > 0) {
      var _fcLines = _due.map(function(f) { return '- ' + f.text; });
      msg += '[INSTRUCTION] 延迟爆发的后果（长线因果·自然融入剧情）：\n' + _fcLines.join('\n') +
        '\n这些是你早前的选择埋下的种子，如今开始回响——让早期选择在后期持续呼应。\n\n';
      for (var _fj = 0; _fj < _due.length; _fj++) _due[_fj].triggered = true;
      saveGame();
    }
  }

  // IMP-13：情绪状态链——当前心境注入（让 AI 不瞎写变脸）
  var _moodBlock = buildMoodInstruction();
  if (_moodBlock) msg += _moodBlock;

  // IMP-15：三人差异化反应（仅共享事件相位注入，避免对私人戏份过度约束）
  var _isSharedEvent = false;
  if (GS.jealousyMission && GS.jealousyMission.day === GS.day && GS.jealousyMission.status === 'active') _isSharedEvent = true;
  if (GS.exMessage && GS.exMessage.day === GS.day && !GS.exMessage.handled) _isSharedEvent = true;
  if (GS.xGhostEvent && GS.xGhostEvent.day === GS.day) _isSharedEvent = true;
  if (GS.day === 7 && GS.phaseIndex === 2 && GS.questionBox && GS.questionBox.active) _isSharedEvent = true;
  if (GS.day === 6 && GS.phaseIndex === 3 && GS.midnightCall) _isSharedEvent = true;
  if (GS.rivalryIntensity >= 2) _isSharedEvent = true;
  if (_isSharedEvent && GS.selectedMembers.length >= 2) {
    var _diffLines = [];
    for (var _di = 0; _di < GS.selectedMembers.length; _di++) {
      var _dm = MEMBERS.find(function(m) { return m.id === GS.selectedMembers[_di]; });
      if (!_dm) continue;
      var _ptag = (_dm.personality && _dm.personality.length) ? _dm.personality.join('/') : '成员';
      _diffLines.push('- ' + _dm.name + '（' + _ptag + '）：应写出符合其性格底色的典型反应方式');
    }
    msg += '[INSTRUCTION] 三人反应差异化(强制)\n' +
      '以下共享事件三人都会知道，但必须写出三种音色迥异的反应（结合各自性格与当前心境，见"当前心境"块）：\n' +
      _diffLines.join('\n') + '\n' +
      '禁止三人给出"同构"反应(只换名字的版本)。每人反应必须体现各自性格 + 当前心境。\n\n';
  }

  // 前任来电
  if (dominantEvent === 'exMessage' && GS.exMessage && GS.exMessage.day === GS.day && !GS.exMessage.handled) {
    var em = GS.exMessage;
    msg += '[INSTRUCTION] 突发事件：前任来电\n' +
      em.memberName + '的手机亮了——是一条来自他前任的消息。描写 ' + em.memberName + ' 看到消息时的表情变化、女主的反应、周围其他成员是否注意到这个异样\n\n';
  }

  // Day 11 真心话惩罚
  if (dominantEvent === 'truthPunishment' && GS.day === 11 && GS.phaseIndex === 3 && GS.truthPunishment) {
    var tp = GS.truthPunishment;
    var tm = MEMBERS.find(function(m) { return m.id === tp.targetId; });
    msg += '[INSTRUCTION] 真心话惩罚（强制执行·无选项）\n惩罚内容：' + tp.desc + '\n涉及成员：' + (tm ? tm.name : '嘉宾') + '\n这是强制剧情，无选项，玩家只能观看。\n\n';
  }

  // 私密体质提醒
  if (hp.privateTraits.length > 0) {
    msg += '[INSTRUCTION] 女主私密体质提醒：' + hp.privateTraits.join('、') + '——在相关场景中自然触发。⚠️ 私密体质是女主专属设定，禁止映射到任何成员身上。\n\n';
  }

  // 女主人格画像（IMP-09：暗藏积累，自然体现，勿生硬点明）
  if (GS.heroinePersona && GS.heroinePersona.current) {
    msg += '[INSTRUCTION] 女主人格画像（自然体现在反应/台词/小动作中，不要直白说出标签）：女主属于「' + GS.heroinePersona.current + '」。成员对她的互动应呼应这一性格——对撒娇型更主动宠溺、对撩拨型会被反撩、对迟钝型更耐心试探、对独立型更尊重边界。\n\n';
  }

  // 时段边界
  if (type === 'phase') {
    msg += PHASE_BOUNDARIES[PHASES[GS.phaseIndex]] + '\n' + PHASE_TONE[PHASES[GS.phaseIndex]] + '\n\n';
  } else {
    msg += '⚠️ 当前时段：' + phaseLabel + '。' + PHASE_TONE[PHASES[GS.phaseIndex]] + '\n\n';
  }

  // Day 7 提问箱
  if (dominantEvent === 'questionBox' && GS.day === 7 && GS.phaseIndex === 2 && GS.questionBox && GS.questionBox.active) {
    var qb = GS.questionBox;
    msg += '[INSTRUCTION] Day 7 匿名提问箱（强制执行）\n问题：' + qb.currentQuestion + '\n' +
      '请在剧情中描写：制作组广播宣布规则 → 成员们写问题时的微妙表情 → 抽签顺序和前面1-2位成员的回答 → 最后轮到女主被抽中。\n' +
      '⚠️ 女主选项由本地固定，AI 不需要再生成 options。\n' +
      (GS.secretDating ? '⚠️ 当前处于脚踏两条船高风险期，匿名问题可直戳女主周旋两人——问题可带"你心里到底有谁""是不是同时和两个人暧昧"的尖锐指向，把穿帮张力推到顶点。\n' : '') +
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

  // 制作组任务卡（活跃且未完成时注入；仅首次写"广播宣布"，后续轻量提示，避免每个 phase 重复广播）
  if (GS.todayMissionCard && !GS.todayMissionCard.completed && !extra.skipActiveMissionCard) {
    var mc = GS.todayMissionCard;
    var _mcFirst = !mc.injected;
    msg += '\n[INSTRUCTION] 制作组任务卡（任务类型：' + (mc.type === 'input' ? '输入类' : '行动类') + '）\n' +
      '任务名：' + mc.name + '\n任务要求：' + mc.desc + '\n';
    if (_mcFirst) {
      if (mc.type === 'action') {
        msg += '请在剧情中为女主创造完成这个任务的机会和场景（如制作组广播宣布、成员反应、执行过程），让女主可以通过选项或自由输入来执行任务。\n';
      } else {
        msg += '这是输入类任务，女主需要在任务面板中输入内容（如写诗、写纸条）。在她提交前，请在剧情中自然引出这个任务场景（如制作组递上纸笔、宣布任务）。提交后的内容会在下一段剧情中体现。\n';
      }
      mc.injected = true;
      if (typeof saveGame === 'function') saveGame();
    } else {
      msg += '⚠️ 该任务卡已在今天较早时段由制作组广播宣布过，请勿再次描写"广播宣布/发任务卡"的发起过程。当前只需在剧情中自然地为女主保留完成它的机会（如她可随时选择执行、或对话里提及尚未完成），不要重复发起。\n';
    }
  }

  // 输入类任务完成后暂存的内容，注入下一段剧情让 AI 自然体现（选项生成时跳过）
  if (GS.pendingTaskResult && type !== 'generateOptions') {
    var ptr = GS.pendingTaskResult;
    msg += '\n[INSTRUCTION] 制作组任务卡完成内容（请在叙事中自然体现，不要复述指令本身）\n' +
      '任务名：' + ptr.taskName + ' · 任务要求：' + ptr.taskDesc + '\n' +
      '女主提交的内容：' + ptr.userInput + '\n' +
      '请在 narrative 中描写女主执行/说出这段内容的场景，以及成员们的反应。这段内容是真实发生的剧情。\n';
    // 注入后清空，避免重复注入
    GS.pendingTaskResult = null;
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

  // 待兑现约定（[B] 跨天累积，必须在后续合适时机自然推进或收尾，不得凭空遗忘）
  if (GS.pendingPromises && GS.pendingPromises.length > 0) {
    msg += '[INSTRUCTION] ⚠️ 待兑现约定（跨天持续追踪·不可遗忘）\n这些约定会一直保留直到被自然兑现，请在后续合适的剧情时机主动推进或收尾每一条，绝不允许凭空遗忘或让约定无声蒸发：\n';
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
    // [A] 结构化事实记忆硬约束（跨天持久累积）
    msg += buildMemoryFactsBullet();
    if (GS.smsHistory.length > 0) {
      var lastSms = GS.smsHistory[GS.smsHistory.length - 1];
      if (lastSms.day === GS.day - 1) {
        msg += '[INSTRUCTION] 📨 昨晚短信回顾：女主昨晚发给了' + lastSms.name + '「' + lastSms.content + '」\n这会影响今天' + lastSms.name + '对女主的态度。\n\n';
      }
    }
    var todayText = getTodayHybridContext();
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
    // [A] 结构化事实记忆硬约束（跨天持久累积）
    msg += buildMemoryFactsBullet();
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
      getTodayHybridContext() + '\n\n';
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
      '请生成后续剧情（1500-2000字 JSON），必须包含至少1段 narrative + 1段 interview + 1段 memberInterview + observers 数组 + options 数组（3个选项，每个选项含 affName/affDelta/affReason）。\n' +
      '⚠️ 选项必须基于你刚刚生成的后续剧情来推导——从这段剧情中的具体事件、对话、氛围中提取行动方向，禁止使用与剧情无关的通用选项模板。\n' +
      '如果选项明确扣分则填 riskMember/riskDelta。\n' + noRepeatNote + optionLengthRule;
  } else if (type === 'freeAction') {
    var freeNoRepeat = '⚠️ narrative 中禁止复述/禁止总结/禁止回顾/禁止重新描写已发生事件。\n' +
      '⚠️ 采访间（interview/memberInterview/xInterview）可以使用刚发生的事件作为引子来表达当下感受，但不要大段照搬。\n';
    if (extra.doActionTask) {
      msg += '[INSTRUCTION] 生成任务·制作组任务卡执行\n' +
        '玩家选择执行制作组任务卡：\n"' + extra.actionText + '"\n\n' +
        '当前时间：Day ' + GS.day + ' ' + phaseLabel + '。请生成女主执行这个任务的完整剧情场景（1000-1500字 JSON）。\n' +
        '要求：\n' +
        '- 描写制作组如何宣布/布置这个任务，女主执行任务的过程、与成员的互动和反应\n' +
        '- 任务执行中要有具体的场景细节、对话、成员反应\n' +
        '- 任务必须在本段剧情中完成，给出执行结果（成功/有趣插曲/意外状况）\n' +
        '- 不要生成 options（任务执行剧情不加选项）\n' +
        '- 必须包含 narrative + interview + memberInterview + observers\n' + freeNoRepeat;
    } else {
      msg += '[INSTRUCTION] 生成任务·自由剧情扩写\n玩家是这一段的剧情导演，写下了以下期望发生的剧情梗概：\n"' + extra.actionText + '"\n\n' +
        '当前时间：Day ' + GS.day + ' ' + phaseLabel + '。请将这段梗概扩写为完整的剧情段落（1200-1800字 JSON）。\n' +
        '扩写要求：\n' +
        '- 以玩家输入的剧情梗概为主干，扩写出完整的场景、对话、氛围、心理描写\n' +
        '- 允许基于成员人设调整不合理之处（如某成员不会做的事可适当改写），但关键事件和走向尽量贴近玩家输入\n' +
        '- 与已有剧情自然衔接，不要重复已发生的内容\n' +
        '- 不要生成 options（玩家用自由剧情替代了选项选择）\n' +
        '- 必须包含 narrative + interview + memberInterview + observers\n' + freeNoRepeat;
    }
  } else if (type === 'sms') {
    msg += '[INSTRUCTION] 生成任务\n女主给' + extra.targetName + '发送了心动短信："' + extra.smsContent + '"\n' +
      '请生成短信发送后的剧情（不超过50字 JSON）：描写' + extra.targetName + '收到短信时的反应、其他成员的反应、女主的心情。\n' +
      '⚠️ 不需要生成 options（深夜短信剧情不加选项）\n' +
      '⚠️ 不要描写女主发短信的动作，短信已经发出了。这是深夜睡前。\n' +
      '输出格式必须包含：narrative + interview + memberInterview + directorOS + observers 数组。\n' + noRepeatNote;
  } else if (type === 'stay') {
    msg += '[INSTRUCTION] 生成任务\n玩家选择"继续今天"（今日第' + GS.stayCount + '次）。请基于当前记忆生成新的后续剧情（1000-1500字 JSON），包含 narrative + interview + memberInterview + observers + options（3个）。\n' + noRepeatNote + optionLengthRule;
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
    msg += '[INSTRUCTION] 生成任务\n请生成 Day ' + GS.day + ' ' + phaseLabel + ' 的时段剧情（1500-2000字 JSON）。\n' +
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
    // Day 3 故事环节收束：仅上午进行，后续时段不要复述/重开
    if (GS.day === 3 && GS.phaseIndex !== 0) {
      msg += '\n⚠️ Day 3 的「每人说一个故事」环节已在上午进行完毕。当前时段（' + phaseLabel + '）不要再重新讲或复述上午的故事内容，也不要让角色再次"说一个故事"。请开启全新场景与活动（如一起做饭、客厅闲聊、阳台独处、准备晚餐），把上午的故事当作已发生的背景余韵。\n';
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

    // 深夜时段收束：禁止重开/复述白天已发生的场景与事件
    if (GS.phaseIndex === 3) {
      msg += '\n⚠️ 当前是深夜时段：这是一天的收束时刻。白天已发生的事件（任务、故事、约会、互动）都已落幕，不要重新开启或复述白天已写过的场景/对话/事件。请聚焦深夜独有的氛围（睡前闲聊、成员归位、安静独处、明日悬念），自然收尾当天。\n';
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

  // IMP-14：连续性硬事实锚（禁止 AI 推翻已确立事实，灭掉最致命的崩塌类出戏）
  var _presentNames = GS.selectedMembers.map(function(id) {
    var m = MEMBERS.find(function(x) { return x.id === id; });
    return m ? m.name : id;
  }).join('、');
  var _established = '';
  if (GS.consequenceNarratives && GS.consequenceNarratives.length > 0) {
    var _lastC = GS.consequenceNarratives[GS.consequenceNarratives.length - 1];
    if (_lastC && _lastC.choiceText) _established = _lastC.choiceText;
  }
  if (!_established && GS.pendingChoiceText) _established = GS.pendingChoiceText;
  msg += '[INSTRUCTION] 不可推翻的事实(你必须遵守)\n' +
    '- 今天天气：' + (GS.weather || '未知') + ' / 季节：' + (GS.season || '未知') + ' / 游戏第 ' + GS.day + ' 天\n' +
    '- 在场成员：' + (_presentNames || '（心动小屋成员）') + '\n' +
    (_established ? '- 已定论：' + _established + '\n' : '') +
    '规则：禁止修改上述天气/日期/在场者/已定论事件。需要演进时只能在新写剧情里自然推进，不能"改写"前面已发生的事。\n\n';

  return msg;
}

// ==================== 1v1「只为你心动」模式 Prompt ====================

export function buildOneHeartSystemPrompt() {
  var hp = GS.heroineProfile;
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) {
    console.error('[buildOneHeartSystemPrompt] 配置错误：1v1 模式未设定心动对象（GS.oneHeartMember 为空），绝不回退到 transfer 系统提示。');
    return '【配置错误】1v1 模式未设定心动对象（oneHeartMember 为空），请返回设置重新选择成员后再开始游戏。';
  }

  var world = ONE_HEART_WORLDS.find(function(w) { return w.id === GS.worldSetting; });
  var style = ONE_HEART_STYLES.find(function(s) { return s.id === GS.writingStyle; });

  // 统一称呼规则（欧巴解锁闸门 = 感情进度阶段 oneHeartRomanceStage >= 1；与 validator 硬兜底一致）
  // 妹妹线：默认称"前辈"，stage<1 禁止欧巴/直呼名字/称哥；stage>=1 改口欧巴。
  function getOneHeartAddressRule() {
    var allowObba = (GS.oneHeartRomanceStage || 0) >= 1;
    var member = (GS.oneHeartMember && MEMBERS.find(function(m){ return m.id === GS.oneHeartMember; })) ? MEMBERS.find(function(m){ return m.id === GS.oneHeartMember; }) : null;
    var name = member ? member.name : '他';
    if (!isSisterSetting()) {
      return '称呼规则（强制）：你称呼男主「' + name + '」默认直呼名字；进入暧昧期（romanceStage>=1）后可自然改口称"欧巴"，初识期（romanceStage<1）禁止称"欧巴"。绝对禁止"哥/哥哥/형""前辈""后辈""-xi"。';
    }
    var base = '称呼规则（强制·代码闸门）：你是队友的妹妹，比全团都小，对男主「' + name + '」默认称「前辈」（如「' + name + '前辈」），绝对禁止直呼名字。';
    if (allowObba) {
      base += '当前感情已进入暧昧期（romanceStage>=1），可自然改口称「欧巴」；亲哥哥与男主的称呼不可互相套用。';
    } else {
      base += '当前仍是初识期（romanceStage<1），禁止称「欧巴」、禁止称「哥/哥哥/형」，只能称「前辈」。';
    }
    return base + '⚠️ 本段生成后有代码后校验：违反称呼/进度门控将被强制重写。';
  }

  var result = '你是「只为你心动」——一款1v1沉浸式恋爱文字游戏的剧情生成AI。你必须只输出 JSON 对象，禁止输出 markdown 代码块或任何解释文字。\n\n' +
    '⚠️ 禁止脏话/粗口：角色对话中不得出现"操/他妈/妈的/卧槽/特么/我靠"等脏字，即使角色情绪激动也用"该死/可恶/真是的/服了"等替代。\n\n' +

    '[SYSTEM] 输出结构（强制 JSON · 字段须严格匹配）\n' +
    '{\n' +
    '  "blocks": [ { "type": "narrative", "content": "段落正文" } ],\n' +
    '  "options": [\n' +
    '    { "text": "行动描述", "affDelta": 好感变化值(-5~5), "affReason": "变化原因简述", "sceneType": "(可选)date-约会场景/public-高调行为" }\n' +
    '  ],\n' +
    '  "eventItems": ["一句话事件1", "一句话事件2"]\n' +
    '}\n' +
    '⚠️ 所有 content 字段使用中文叙述。对话使用「」引用。禁止使用 ASCII 双引号。\n' +
    '⚠️ directorOS 不进 blocks。\n' +
    '⚠️ affDelta 表示选择此选项后的好感增减：正向选择→+1~5，平淡/错过→0~-1，负面行为→-2~-5。\n' +
    '⚠️ eventItems 字段说明：从本段剧情中提取关键事件，每个事件用一句话概括（包含人物、地点、事件要素）。\n' +
    '【强制规则】每个事件必须写明具体人名，禁止使用"他/她/男主/正主/情敌"等代词。必须用实际角色名字（如"' + member.name + '","' + (GS.oneHeartRival && GS.oneHeartRival.name ? GS.oneHeartRival.name : '情敌') + '","女主","' + (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name ? GS.oneHeartRelationCharacter.name : '哥哥') + '"等）。\n' +
    '重点提取「女主、' + member.name + '（正主）、关系户（' + (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name ? GS.oneHeartRelationCharacter.name : '哥哥') + '等亲人）、暗恋对象/' + (GS.oneHeartRival && GS.oneHeartRival.name ? GS.oneHeartRival.name : '情敌') + '」之间的互动事件。\n' +
    '短事件示例：「女主给' + member.name + '买咖啡」\n' +
    '长事件示例：「' + member.name + '在练习室生病了，女主照顾' + member.name + '，被' + (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name ? GS.oneHeartRelationCharacter.name : '哥哥') + '发现，' + (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name ? GS.oneHeartRelationCharacter.name : '哥哥') + '让队友金珉奎送' + member.name + '回宿舍」\n' +
    '没有值得记录的事件时返回空数组 []。只提取本段实际发生的事件，不要推测或编造。\n\n' +

    '[SYSTEM] 写作风格：' + (style ? style.name + '——' + style.desc : '自然流畅') + '\n\n' +

    '[SYSTEM] 世界观设定\n' + (GS.worldSetting === 'custom' && GS.oneHeartCustomWorld ? GS.oneHeartCustomWorld : (world ? world.promptSuffix : '你们正在一段浪漫的关系中发展。')) + '\n\n' +

    (function() {
      var wc = getWorldConfig(GS.worldSetting);
      if (!wc || !wc.memberRole) return '';
      var worldLines = [];
      worldLines.push('[WORLD] 世界观角色适配\n');
      worldLines.push('在这个世界观下：');
      worldLines.push('- 他的身份：' + wc.memberRole + '。' + wc.memberDesc);
      if (wc.secondCareerNote) worldLines.push('- 他的第二职业定位：' + wc.secondCareerNote);
      var userRoleDesc = (wc.userRoles && wc.userRoles[hp.job]) ? wc.userRoles[hp.job] : wc.userFallback;
      if (isSisterSetting() && hp.profession) {
        var _roleDesc = '\n（补充·职业）女主本职职业为「' + hp.profession + '」，与男主同为娱乐圈圈内人，练习室/打歌/综艺/后台/行程等圈内场景可自然展开；对外关系上她始终是队友的妹妹。';
        if (hp.profession === '女团爱豆' && GS.oneHeartHeroineGroup) {
          var _gg = GS.oneHeartHeroineGroup;
          var _sisters = _gg.members.filter(function(m) { return !m.isHeroine; }).map(function(m) { return m.role; }).join('、');
          _roleDesc += '\n（女团背景·固定设定）她是 6 人女团『' + _gg.groupName + '』的成员，定位为「' + _gg.heroinePos + '」，所属社『' + _gg.company + '』，概念『' + _gg.concept + '』，粉丝名『' + _gg.fandom + '』，' + (_gg.debutYears > 0 ? '出道约 ' + _gg.debutYears + ' 年始终二线' : '刚出道不久的新人团') + '。出圈的歌有：' + _gg.songs.join('；') + '。团内其他 5 位姐姐成员：' + _sisters + '（这 5 位与女主都是女性，是女团里的姐姐成员，与"哥哥"无关）。当前处境：' + _gg.statusDesc + ' 她夹在"想拼一波"和"认命平淡"之间——正好与亲哥（顶流男团成员）形成圈层落差。⚠️ 性别铁律：女团 6 人（含女主）全部是女性；SEVENTEEN（亲哥 / 男主 / 情敌）全部是男性。两者是不同团体，严禁混同。';
        }
        userRoleDesc += _roleDesc;
      }
      if (userRoleDesc) worldLines.push('- 你的角色：' + userRoleDesc);
      worldLines.push('');
      return worldLines.join('\n');
    })() +

    '- 姓名：' + hp.name + '，年龄：' + hp.age + '岁，出生年份：' + (getPlayerBirthYear(hp.age, GS.oneHeartStartYear || 2025)) + '年，职业：' + (isSisterSetting() && hp.profession ? (hp.profession + '（身份：哥哥的妹妹）') : hp.job) + '\n' +
    (hp.zodiac ? '- 星座：' + hp.zodiac + '\n' : '') +
    (hp.birthday ? '- 生日：' + hp.birthday.month + '月' + hp.birthday.day + '日\n' : '') +
    '- 外貌特征：' + hp.appearance.join('、') + '\n' +
    '- 性格：' + hp.personality.join('、') + '，MBTI：' + hp.mbti + '\n' +
         (hp.privateTraits.length > 0 ? '- 私密体质：' + hp.privateTraits.join('、') + '——在相关场景中自然触发。\n' : '') +
    '- ⚠️ 女主的全部外貌特征、私密体质均为女主专属设定，绝对禁止映射到任何成员身上（包括男主）。\n' +
    '- ⚠️ 女主是女性角色，绝对禁止被称为「哥/哥哥/형」。只有她的亲哥哥可以用「哥」称呼。\n' +
    (isSisterSetting() ?
      ('- ⚠️ 性别铁律（强制·队友的妹妹设定）：SEVENTEEN 全员（亲哥 / 男主 / 情敌）均为男性；女团成员（含女主）均为女性，是另一个团体。严禁让任何 SEVENTEEN 男性成员自称「姐 / 姐姐 / 本小姐 / 人家」等女性化自称，也严禁把他们写成女性语气或女性视角；他们就是男人，用「他 / 哥 / 前辈 / 欧巴」等男性称谓。女团里叫「姐姐」的只是女团女性成员，与 SEVENTEEN 无关。\n')
      : '') +
    '- 称呼自然推进（不再强制专属爱称）：男主对女主的亲密称呼随感情阶段自然生长，亲密期可用叠字/宝宝/亲爱的等自然亲密称呼，但请勿生造一个全程固定的"专属爱称"外号，也不要中途反复横跳。\n' +
    '- ⚠️ 禁止编造恋爱纪念日（如"一个月纪念""100天纪念""周年纪念"），除非剧情中明确提到。\n' +
    '- ⚠️ 吃醋门控：在女主对男主好感度 < 20（初识/朋友阶段）时，严禁出现男主吃醋、女主吃醋、醋意、占有欲等情节——此时感情尚未建立，吃醋不合逻辑。这类情节只在好感≥20（暧昧期）之后才允许自然出现。\n' +
    buildFeaturePosNote(hp) +
    (isSisterSetting() ?
      ('- 女主对' + member.name + '的好感度：' + (GS.affection[member.id] || 0) + '（' + getAffectionDesc(GS.affection[member.id] || 0) + '）。⚠️ 这仅代表"女主自己的内心温度"：数值低只说明女主此刻只把' + member.name + '视为哥哥的队友、尚无心动，绝不表示' + member.name + '对女主冷淡。' + member.name + '与情敌早已对女主有意，会主动关心、找借口接近、眼神追随、制造好感事件——他们的热情由自身心意驱动，不会因女主好感低而变冷。请写出男主追求的温度，亲密分寸仍按下方感情进度门控把握。\n\n')
      :
      ('- 女主对' + member.name + '的好感度：' + (GS.affection[member.id] || 0) + '（' + getAffectionDesc(GS.affection[member.id] || 0) + '）。好感度影响互动距离：低好感→克制/疏离/客气，中好感→暧昧/试探/暗流涌动，高好感→亲密/主动/自然。请根据好感度调整描写分寸。\n\n')
    ) +

    getHeroineBehaviorText() + '\n\n' +

    '[SYSTEM] 时间线约束（强制执行）\n' +
    '当前故事进度：第' + (GS.day || 1) + '天，已发生约' + (GS.oneHeartGenCount || 0) + '次互动。男女主已认识' + (GS.day || 1) + '天。\n' +
    (function() {
      var _aff = GS.affection[member.id] || 0;
      if (_aff < 20) return '好感度仅' + _aff + '，两人处于初识期。';
      if (_aff < 60) return '好感度' + _aff + '，两人处于暧昧期。';
      if (_aff < 80) return '好感度' + _aff + '，两人处于明确期。';
      return '好感度' + _aff + '，两人处于热恋期。';
    })() + '\n' +
    '⚠️ 禁止编造超出当前时间线的回忆或背景（如"三个月前""很久以前""从小一起长大""高中时""大学时代"等）。\n' +
    '⚠️ 如果好感度低于40或认识天数少于3天，禁止描写任何"过去的美好回忆""曾经很亲密""以前经常一起"等暗示关系已存在很久的内容。\n' +
    '⚠️ 所有对"过去"的提及必须限定在当前认识时间之内（如"昨天""上次见面""前几天""这段时间"）。\n' +
    '⚠️ 女主和' + member.name + '的关系发展只能基于当前已发生的互动，不能预设他们已经认识很久或有过深厚感情基础。\n' +
    '⚠️ 禁止描写两人在本次故事开始前就已经互相喜欢、暧昧、眉目传情等。故事的感情线必须从当前进度开始发展。\n\n' +

    '[SYSTEM] 参与角色\n' +
    member.emoji + ' ' + member.name + '（' + member.stageName + '）- ' + member.team + '队\n' +
    '  年龄：' + member.age + ' · 星座：' + member.zodiac + ' · 第二职业：' + member.secondCareer + (SECOND_CAREER_MAP[member.secondCareer] ? '（' + SECOND_CAREER_MAP[member.secondCareer] + '）' : '') + '\n' +
    '  性格：' + member.personality + ' · 情感模式：' + member.loveStyle + '\n' +
    '  行为逻辑：' + member.behaviorLogic + ' · 互动风格：' + member.interactionStyle + '\n' +
    (member.habits ? '  习惯：' + member.habits.join('、') + '\n' : '') +
    (member.catchphrases ? '  口头禅：' + member.catchphrases.join('、') + '\n' : '') +
    (member.foodPreferences ? '  饮食：' + member.foodPreferences + '\n' : '') +
    (member.foodTaboos && member.foodTaboos.length > 0 ? '  饮食禁忌：' + member.foodTaboos.join('、') + '\n' : '') +
    (member.sleepHabits ? '  睡眠：' + member.sleepHabits + '\n' : '') +
    (member.comforts ? '  安慰方式：' + member.comforts.join('、') + '\n' : '') +
    (member.fears ? '  恐惧：' + member.fears.join('、') + '\n' : '') + '\n' +

    (function() {
      var rel = GS.oneHeartRelationCharacter;
      var rival = GS.oneHeartRival;
      var parts = '';
      if (rel && rel.name) {
        parts += '[关系网角色]\n';
        parts += '你的生活中有一个重要的人：「' + rel.name + '」（你的' + (rel.role === '哥哥' ? '亲' : '') + '' + rel.role + '）。\n';
        if (rel.personality) parts += '性格：' + rel.personality + '\n';
        if (rel.behaviorLogic) parts += '行为逻辑：' + rel.behaviorLogic + '\n';
        if (rel.interactionStyle) parts += '互动风格：' + rel.interactionStyle + '\n';
        parts += '⚠️ 此角色名字在剧情中固定为「' + rel.name + '」，不可写错或变换。\n';
        if (rel.role === '哥哥') {
          parts += '⚠️ 他是你的亲哥哥，名字固定为「' + rel.name + '」，是男主（' + member.name + '）的队友，不是男主的哥哥。\n';
          parts += '⚠️ 男主（他）在对话或独白中绝对禁止说「我哥」「我哥哥」——本故事里男主没有兄弟，"我哥"是错误指代，会让你（玩家）不知道指谁。\n';
          parts += '⚠️ 男主若要提及你（女主）的哥哥，只能直呼其名「' + rel.name + '」或称「你哥」（意为"你的哥哥"），绝不可用「我哥」。\n';
          parts += '⚠️ 你（女主）称亲哥哥可用「我哥」或「' + rel.name + '」，这是被允许的。\n';
          if (isSisterSetting()) {
            parts += '⚠️ ' + getOneHeartAddressRule() + '\n';
            parts += '\n[前提·初次见面] 本次是女主第一次见到你（' + member.name + '）与情敌「' + (GS.oneHeartRival ? GS.oneHeartRival.name : '他') + '」。在女主视角里，你们都只是她亲哥哥「' + rel.name + '」的队友——没有心动、没有私交，只是"哥哥的朋友"。\n';
            parts += '⚠️ 女主此刻把你们当普通哥哥的队友看待，不会主动示好、不会脸红、不会特别在意，内心是"朋友/陌生哥哥队友"状态。\n';
            parts += '⚠️ 但你与情敌早已注意到女主、对她有好感，会主动关心、找借口接近、眼神追随、制造接触机会（好感事件由你们发起）。感情必须由女主侧随事件自然萌发，不可预设她已动心。\n';
            // [P0-3] 男主对女主的称呼演进（与女主称呼男主互补，形成双向门控）
            parts += '\n[男主对女主的称呼·队友的妹妹]\n';
            parts += '你是男主「' + member.name + '」。初次见面时，女主是你队友' + rel.name + '的亲妹妹，你还不是她恋人，应称呼她为「' + rel.name + '的妹妹」或「你妹妹」——不可一开始就直呼名字显得轻佻越界。\n';
            parts += '随着感情推进、独处增多（进入暧昧期 romanceStage>=1 后），可自然改口直呼女主名字；明确期/热恋期（romanceStage>=2）后可更亲密地用叠字/宝宝/亲爱的等自然亲密称呼，但整局需保持前后一致、不可反复横跳，且不要生造一个固定专属外号。\n';
            parts += '⚠️ 禁止在初识期（romanceStage<1）就叫女主名字或爱称——你与她还不熟，过度亲密会显得突兀冒进。\n';
            // [seed] 男主上心种子事件 + 专属小动作（仅队友妹妹设定，基于男主真实人设生成）
            if (GS.oneHeartSeedEvent) {
              parts += '\n[男主上心种子·回溯锚点] 男主「' + member.name + '」对你上心的起点是这一幕（已发生）：' + GS.oneHeartSeedEvent + '\n';
              parts += '⚠️ 这是男主心动的根源，请在剧情进入关键节点（男主告白、吃醋、感情转折）时，自然地让男主回想这一瞬间，形成前后呼应的张力，但不要每轮重复提及。\n';
            }
            if (GS.oneHeartMannerisms && GS.oneHeartMannerisms.length) {
              parts += '\n[男主专属小动作·辨识度] 「' + member.name + '」对在意的人会不自觉流露这些小动作：' + GS.oneHeartMannerisms.join('；') + '。\n';
              parts += '请在描写男主时，每隔5-8回合自然地让男主流露出其中一处（不必每轮，点到为止），以体现角色辨识度，让他"像本人"而非通用男主。\n';
            }
            // [secret] 女主秘密（反差萌，供发现/调侃/撞破三路径呼应）
            if (GS.heroineSecrets && GS.heroineSecrets.length) {
              parts += '\n[女主秘密·反差萌] 女主私下藏着这些不让哥哥知道的事（所有秘密必须严格限定EXO：金珉锡/签售/周边/直拍/同人文/专辑/小卡/应援，绝不涉及SEVENTEEN成员或任何男团直播间刷礼物行为，纯属可爱反差，不是黑料）：\n- ' + GS.heroineSecrets.join('\n- ') + '\n';
              parts += '这些秘密可在剧情中自然被男主意外发现（成为两人小默契）、被哥哥调侃拿捏、或被情敌/队友撞破变成把柄。但初次见面时女主绝不会主动提起，需由事件触发。\n';
            }
          } else {
            parts += '⚠️ 称呼规则（强制执行）：你称呼亲哥哥「' + rel.name + '」时可用「我哥」「' + rel.name + '」；你称呼男主「' + member.name + '」时默认直呼名字，进入暧昧期（romanceStage>=1）后可自然改口称「欧巴」，初识期（romanceStage<1）禁止称「欧巴」。绝对禁止把男主和亲哥哥的称呼互相套用。\n';
          }
          // D2: 双重身份转换指引
          parts += '\n[哥哥·双重身份转换]\n';
          parts += '「' + rel.name + '」既是女主的亲哥哥，又是男主「' + member.name + '」的队友。剧情中需区分两种场合：\n';
          parts += '- 团内/工作场合（练习室、录制、行程）：他表现"队友一面"——专业、默契、遵循队内辈分礼仪，和男主是同事关系。\n';
          parts += '- 私下/家中场合：他表现"哥哥一面"——护妹、调侃、当参谋、帮忙掩护，是女主最信任的内应。\n';
          parts += '- 切换边界：被团内人看到时偏队友面，独处时偏哥哥面；不因是哥哥就在工作场合对男主特殊对待。\n';
          // D3: 年龄辈分逻辑
          var _broYear = rel.birthYear || (MEMBERS.find(function(m){return m.id===rel.memberId;}) ? MEMBERS.find(function(m){return m.id===rel.memberId;}).birthYear : 0);
          var _memYear = member ? member.birthYear : 0;
          var _diff = _memYear - _broYear;
          parts += '\n[哥哥·年龄辈分]\n';
          parts += '⚠️ 注意：birthYear 数值越小=越年长（1995最早生、1999最晚生）。\n';
          parts += '哥哥「' + rel.name + '」出生年：' + _broYear + '，男主「' + member.name + '」出生年：' + _memYear + '。';
          if (_diff > 0) {
            parts += '男主比哥哥小' + _diff + '岁，男主年幼，可按队内辈分称「' + rel.name.substring(1) + '哥」或「' + (rel.stageName||rel.name) + '哥」；日常也可直呼「' + rel.name.substring(1) + '」或「' + (rel.stageName||rel.name) + '」。\n';
          } else if (_diff < 0) {
            parts += '男主比哥哥大' + Math.abs(_diff) + '岁，男主年长，禁止称"哥"，直呼「' + rel.name.substring(1) + '」或「' + (rel.stageName||rel.name) + '」。\n';
          } else {
            parts += '男主与哥哥同龄，互相直呼名字（' + rel.name.substring(1) + '/' + (rel.stageName||rel.name) + '）。\n';
          }
          // 情敌辈分（如果在队内）
          if (rival && rival.memberId) {
            var _rivalYear = rival.birthYear || (MEMBERS.find(function(m){return m.id===rival.memberId;}) ? MEMBERS.find(function(m){return m.id===rival.memberId;}).birthYear : 0);
            if (_rivalYear) {
              parts += '情敌「' + rival.name + '」出生年：' + _rivalYear + '。';
              if (_rivalYear < _broYear) parts += '情敌比哥哥年长，哥哥私下可称情敌"哥"。';
              else if (_rivalYear > _broYear) parts += '情敌比哥哥年幼，情敌可称哥哥"' + rel.name.substring(1) + '哥"或直呼其名。';
              else parts += '情敌与哥哥同龄。';
              parts += '\n';
            }
          }
          parts += '⚠️ 无论年龄关系如何，「' + rel.name + '」对女主始终是哥哥身份，女主称他"我哥/哥哥"是允许的。\n';
        }
        var _relCfg = IDENTITY_RELATION_MAP[GS.heroineProfile.job];
        if (_relCfg && _relCfg.livesTogether) {
          parts += '💡 你和「' + rel.name + '」住在一起。日常同住的细节可以自然融入剧情。\n';
        }
        parts += '\n';
      }
      if (rival && rival.name) {
        parts += '[情敌设定]\n';
        parts += '你的故事中有一个情感阻碍者：「' + rival.name + '」。\n';
        if (rival.personality) parts += '性格：' + rival.personality + '\n';
        if (rival.behaviorLogic) parts += '行为逻辑：' + rival.behaviorLogic + '\n';
        if (rival.interactionStyle) parts += '互动风格：' + rival.interactionStyle + '\n';
        if (rival.loveStyle) parts += '情感模式：' + rival.loveStyle + '\n';
        parts += '⚠️ 情敌是独立角色，不可与男主混淆。他的名字固定为「' + rival.name + '」。\n';
        parts += '⚠️ 情敌的角色身份（如未婚夫/上司/教练等）决定了他和你的关系，不可因队内年龄差异称其为「弟弟」。\n';
        parts += '⚠️ 情敌和关系网角色（哥哥/师兄/闺蜜/前同事等）是不同的人，不可混淆为一。\n';
        parts += '⚠️ 情敌的出现应制造张力，但也是让你们的感情更深的机会。\n';
        if (isSisterSetting()) {
          // 项4：情敌 framing 重写——贴合"哥哥把关 + 被拍曝光"主题，与哥哥立场呼应，不稀释焦点
          parts += '\n[情敌·主题契合·队友的妹妹] 在「队友的妹妹」设定下，情敌必须紧扣"哥哥把关 + 被拍曝光"的核心张力，不可写成单纯的抢人工具人：\n';
          parts += '- 他可以是哥哥/公司格外留意、甚至暗中考察你的人，或是被媒体拿来和你们"炒CP"的对手；他的存在会放大"被拍风险"。\n';
          parts += '- 让情敌成为你和男主之间"地下恋曝光危机"的具体化身：每次他靠近，哥哥的态度（试探/掩护/劝你别公开）就会被牵动，使哥哥立场随情敌线起伏。\n';
          parts += '- 情敌线推进时，优先制造"曝光博弈"而非"争宠打脸"——你要在哥哥的视线与媒体的镜头之间周旋。\n';
        }
        parts += '\n';
      }
      return parts;
    })() +

    '[TEAM INFO] SEVENTEEN 团体设定（AI必须严格遵守）\n' +
    '\n' +
    '基本概况\n' +
    '- SEVENTEEN 是 13 人男子组合，2015年5月26日出道，至今已活动10年+。\n' +
    '- 粉丝名：CARAT（캐럿）\n' +
    '- 被称为"自给自足偶像"——成员深度参与作词、作曲、编舞。\n' +
    '- 组合名含义：13名成员 + 3个小分队 + 1个整体 = SEVENTEEN。\n\n' +
    '小分队构成\n' +
    '- Hip-hop队：S.Coups（总队长/95生）、全圆佑（96生）、金珉奎（97生）、崔瀚率Vernon（98生）\n' +
    '- Vocal队：尹净汉（95生）、洪知秀Joshua（95生）、李硕珉DK（97生）、夫胜宽（98生）、李知勋Woozi（96生/主制作人）\n' +
    '- Performance队：文俊辉Jun（96生）、权顺荣Hoshi（96生/队长）、徐明浩The8（97生）、李灿Dino（99生）\n\n' +
    '年龄顺序（从大到小）\n' +
    '崔胜澈(95.8.8)→尹净汉(95.10.4)→洪知秀(95.12.30)→文俊辉(96.6.10)→\n' +
    '权顺荣(96.6.15)→全圆佑(96.7.17)→李知勋(96.11.22)→金珉奎(97.4.6)→\n' +
    '李硕珉(97.2.18)→徐明浩(97.11.7)→夫胜宽(98.1.16)→崔瀚率(98.2.18)→\n' +
    '李灿(99.2.11)\n\n' +
    '分队长\n' +
    '- 总队长：S.Coups（负责全团统筹）\n' +
    '- 主制作人：Woozi（负责全部音乐制作）\n' +
    '- 表演队长：Hoshi（负责编舞和舞台）\n' +
    '- Hip-hop队由S.Coups兼任\n\n' +
    '小分队专辑\n' +
    '- BSS（夫硕顺）：胜宽、DK、Hoshi — 《Second Wind》(2023)、《Teleparty》(2025)\n' +
    '- JxW：净汉、圆佑 — 《This Man》(2024)\n' +
    '- HxW（豪雨）：Hoshi、Woozi — 《Beam》(2025)\n' +
    '- CxM：S.Coups、珉奎 — 《Hype Vibes》(2025)\n' +
    '- DxS：DK、胜宽 — 《Serenade》(2026)\n' +
    '- V8：Vernon、The8 — 预计2026年出道\n\n' +
    '宿舍情况\n' +
    '- 出道初期13人住在一个大宿舍里，后来陆续分居。\n' +
    '- 目前部分成员独居（净汉、Joshua、Hoshi、The8、胜宽），部分两人合住（圆佑和珉奎）。\n' +
    '- 胜澈和亲哥哥一起住。\n' +
    '- 虽然住宿分散，但成员们随时串门、一起吃饭、练习室天天见——聚在一起的时间非常多。\n' +
    '- 练习室和公司是日常碰面的主要场所，因此即使不住在一起，关系依然非常亲密。\n\n' +
    '团内相处规则\n' +
    '- 成员之间已相处10年+，非常熟悉。说话直呼名字，不用敬语。\n' +
    '- 可以互怼、吐槽、开玩笑——这是日常相处模式。\n' +
    '- 【年龄辈分·强制】按出生年份排序（⚠️ birthYear 数值越小=越年长）：\n' +
    '  1995年（95line·最年长）：S.Coups(崔胜哲)·Jeonghan(尹净汉)·Joshua(洪知秀) → 对全团年幼者只直呼名字\n' +
    '  1996年：Jun(文俊辉)·Hoshi(权顺荣)·Wonwoo(全圆佑)·Woozi(李知勋) → 对1995组称"哥"，对97-99组直呼名字\n' +
    '  1997年：DK(李硕珉)·Mingyu(金珉奎)·The8(徐明浩) → 对95-96组称"哥"，对98-99组直呼名字\n' +
    '  1998年：Seungkwan(夫胜宽)·Vernon(崔瀚率) → 对95-97组称"哥"，对1999年Dino直呼名字\n' +
    '  1999年（忙内·最年幼）：Dino(李灿) → 对95-98组称"哥"\n' +
    '  铁律：年幼→年长可称"XX哥"（例：Dino叫S.Coups="胜哲哥"✓）；年长→年幼严禁称"哥"（例：S.Coups叫Dino"灿哥"❌ 严重错误）；同年互称名字（例：Hoshi↔Woozi都叫名字✓，互称"哥"❌）\n' +
    '- 常用称呼方式：叫名字、叫"哥/형"（仅年幼对年长）、叫外号。\n' +
    '- 小分队内部更亲密（同队成员经常一起活动）。\n' +
    '- 存在自然的亲密度分组：95line（胜澈/净汉/Joshua）、97line（珉奎/DK/The8）、\n' +
    '  "豪雨"（Hoshi和Woozi是同龄亲故）、"婆队"成员之间等。\n' +
    '- 但整体上13人都是家人般的关系，不局限于某个小圈子。\n\n' +
    'GOING SEVENTEEN（成员日常的综艺体现）\n' +
    '- 自制综艺《GOING SEVENTEEN》已播出多年，记录了他们一起玩游戏、做饭、旅行、做任务的日常。\n' +
    '- 在节目中可以看到最真实的一面：互坑、吵架又和好、默契配合、毫不顾忌形象地搞笑。\n' +
    '- 团队默契和私下的相处方式都可以参照节目中的真实互动——互相怼但互相爱。\n\n' +
    '团队传统与日常\n' +
    '- 每年出道纪念日（5月26日）一起过。\n' +
    '- 成员生日时其他人会准备惊喜或至少一起吃顿饭。\n' +
    '- 练习室是第二个家——没有行程时也会待在练习室聊天、编舞、听歌。\n' +
    '- 队内群聊非常活跃，经常半夜还在发消息。\n' +
    '- 成员之间经常点外卖一起吃，尤其是珉奎做饭时会叫所有人来。\n' +
    '- 谁有行程晚归，总有人在群里问"回来了吗"。\n' +
    '- 出差或海外行程时经常串房间聊天到凌晨。\n' +
    '- SEVENTEEN全员13人在2021年和2026年两次续约。全员续约在K-pop圈非常罕见，\n' +
    '  说明他们不是被迫留下的，是真心不想散。\n\n' +
    '成员心里话（真实采访摘录）\n' +
    '- 多位成员在采访中说过类似的话，证明团队对他们的意义：\n' +
    '  "SEVENTEEN对我来说就是全部"（Woozi）\n' +
    '  "成员们比我的家人还要了解我"（胜宽）\n' +
    '  "即使退役以后我们也一定会在一起"（Hoshi）\n' +
    '  "没有他们我什么都不是"（DK）\n' +
    '  "虽然平时互相怼，但关键时刻他永远站在我这边"（圆佑）\n' +
    '  "他是我最好的朋友"（珉奎/圆佑互相说过）\n' +
    '  13个人都说过同一句话——"SEVENTEEN就是我的家"。\n\n' +
    '⚠️ 以上团体设定用于帮助理解成员之间的互动方式。当剧情中出现其他SEVENTEEN成员时，\n' +
    '必须按照"10年+队友、家人般的关系"来描写他们的互动。不可写错称呼、不可忽略默契。\n\n' +

    '[RULE] 全局写作规则\n' +
    '1. 正文用第二人称"你"。\n' +
    '2. 称呼规则：' + getOneHeartAddressRule() + '\n' +
    '3. 沉浸式恋爱小说氛围。文艺但不拗口，口语但不随意。\n' +
    '4. 描写比例：环境~20%、对话~32%、女主心理~20%、肢体细节~28%。\n' +
    '5. 禁止AI味、言情小说式夸张比喻、替玩家做情感判断。\n' +
    '6. 情感浓度随剧情自然递进：初期克制含蓄→中期暗流涌动→后期情感爆发。\n' +
    '7. 自然融入他的第二职业和特长作为日常互动亮点。\n' +
    '8. 所有角色严格禁止抽烟（含电子烟），且禁止出现任何抽烟相关描写。\n' +
    '9. 遵守饮食禁忌。\n' +
    '10. 每句话独立成段，content 中用 \\n 分隔段落。不空行。\n' +
    '11. 禁止在正文中提及字数、回复长度（如「回了N个字」「只说了两个字」），直接写对话内容本身。\n' +
    '12. [长度强制] 每段 phase 剧情正文总长度必须达到 1000-1500 字（约等于 1000-1500 个汉字）。这是硬性要求，禁止只输出 300-500 字的简短段落。如果内容偏短，必须扩展环境描写、对话、心理活动和肢体细节，直到满足字数。\n' +
    '13. [场景连贯·最高优先级] 剧情必须严格延续上一段的场景、地点、人物位置和时间。除非玩家明确选择"新的一天"或"去某地"，否则不可无故切换场景。常见错误：上段说"下周聚餐"，这段就写"你已经在聚餐"——错误！时间未到就该停在当时，等"新的一天"推进。上段两人在车里，这段不能突然变成在家里。人物位置必须连贯：他在A处就在A处，不能凭空瞬移。\n' +
    '14. [物品连续性] 剧情中涉及的物品（耳机/水杯/手机/钥匙等）必须在之前的剧情中出现过或自然存在于当前场景中，禁止凭空让角色拿出一个从未提过的物品。如果需要新物品，先通过对话或描写引入它。\n' +
    '15. [人物知识隔离] 每个角色只能知道他们亲眼看到或亲耳听到的信息。禁止"读心"——不要写他知道她在想什么。禁止透露未公开的私密信息（如私密体质、内心独白）。只有女主自己和AI知道的事，其他角色不能知道。\n' +
    '16. [群聊消息可见性] 群聊中发的消息，群内的所有人都能看到。但人物当面聊天时不依赖群聊——和谁在一起就直接说，不要用手机@同在一个空间的人。\n\n' +

    (function() {
      var wc = getWorldConfig(GS.worldSetting);
      if (wc && wc.coreTension) return '[WORLD] 核心张力 ⚠️\n' + wc.coreTension + '\n\n';
      return '';
    })() +

    (GS.oneHeartMainLine ? '[主线方向] 玩家预设的故事发展方向：' + GS.oneHeartMainLine + '\n请优先沿着这个方向推进剧情。\n\n' : '') +

    '[已有事实]\n' +
    '- 你们的关系：' + (function() {
      var _aff = GS.affection[GS.oneHeartMember] || 0;
      if (GS.oneHeartColdWar && GS.oneHeartColdWar.active) return '冷战中';
      if (_aff >= 80) return '深爱期';
      if (_aff >= 60) return '热恋期';
      if (_aff >= 40) return '暧昧升温';
      if (_aff >= 20) return '暧昧初期';
      return isSisterSetting() ? '初次见面·朋友（只是哥哥的队友）' : '初识期';
    })() + '（好感度 ' + (GS.affection[GS.oneHeartMember] || 0) + '）\n' +
    (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name ? '- ' + GS.oneHeartRelationCharacter.role + '：' + GS.oneHeartRelationCharacter.name + '\n' : '') +
    (GS.oneHeartRival && GS.oneHeartRival.name ? '- 情敌：' + GS.oneHeartRival.name + (GS.oneHeartRival.interactionStyle ? '（互动风格：' + GS.oneHeartRival.interactionStyle + (GS.oneHeartRival.loveStyle ? ' · 情感模式：' + GS.oneHeartRival.loveStyle : '') + '）' : '') + (GS.oneHeartRivalAff ? '（情敌倾向：' + GS.oneHeartRivalAff + '）' : '') + '\n' : '') +
    (GS.oneHeartPromises && GS.oneHeartPromises.length > 0 ? '- 约定：' + GS.oneHeartPromises.filter(function(p){return !p.fulfilled;}).map(function(p){return p.text;}).join('、') + '\n' : '') +
    (GS._confessionAccepted ? '- 情敌路线已激活\n' : '') +
    (GS.oneHeartColdWar && GS.oneHeartColdWar.active ? '- 状态：正在冷战中\n' : '') +
    '\n' +

    (GS.gameMode === 'entSim' ? (function() {
      var _prof = (GS.heroineProfile && GS.heroineProfile.profession) || '练习生';
      var _lvNow = (GS.entSimPopularity || 0) >= 80 ? '顶流' : ((GS.entSimPopularity || 0) >= 50 ? '当红' : ((GS.entSimPopularity || 0) >= 20 ? '上升' : '新人'));
      var _chapName = GS.entSimChapter === 0 ? '练习生期' : (GS.entSimChapter === 1 ? '新人期' : (GS.entSimChapter === 2 ? '上升期' : '巅峰期'));
      return '[娱乐圈模拟器·职业模式]\n' +
        '本游戏是「娱乐圈模拟器」：女主是一名在韩娱打拼的' + _prof + '，既要经营事业（人气/资源/口碑），也要经营与男主（哥哥的队友）的感情。事业线与感情线并重，不要只写恋爱忽略事业，也不要只写事业忽略感情。\n' +
        '当前章节：「' + _chapName + '」（第 ' + (GS.entSimChapter || 1) + ' 章）。章节随剧情回合数推进，代表女主事业所处的阶段——新人期（小糊团刚起步/攒人气）→上升期（曝光与资源爆发）→巅峰期（顶流与抉择）。\n' +
        '当前人气：' + (GS.entSimPopularity || 0) + '/100（等级：' + _lvNow + '）。人气通过「今日日程」活动、公开曝光、舞台/作品表现累积；负面新闻、塌房会扣减。\n' +
        '[职业专属现实]\n' +
        (_prof === '练习生' ? '- 练习生：每天高强度训练（声乐/舞蹈/rap/演技），公司每月考核排名，出道位有限、随时可能被淘汰；没有公开身份、没有收入、粉丝几乎为零，常被前辈/工作人员使唤。压力来自「能不能出道」与同公司练习生的竞争。\n'
          : _prof === '爱豆' ? '- 爱豆（团体成员）：回归期连轴转（录音/编舞/打歌/签售/综艺/画报），空白期焦虑（怕被忘记）；有粉丝但恋情一旦被粉丝/狗仔发现立即引爆脱粉与黑热搜、人气崩塌——所以同框、营业都要掂量曝光。舞台直拍、同框、营业CP都可能被粉丝放大镜审视。\n'
          : _prof === 'solo歌手' ? '- solo 歌手：独立制作/演唱，自己扛销量与音源榜单，没有团兜底、孤独但自由；写歌、录 Demo、跑打歌、做 busking，能否打进榜单决定下一首有没有资源。\n'
          : '- 演员：拍戏/试镜/读剧本/上综艺刷脸，靠作品和收视率/口碑说话；杂志专访、红毯、番位之争是日常，角色是否被嘲「花瓶」是压力来源。\n') +
        '[行业通用规则]\n' +
        '- 恋情与曝光风险：偶像恋爱本身不被合约禁止，但一旦被粉丝和舆论发现，会瞬间引爆脱粉、黑热搜与人气崩塌、事业受挫；女主与男主（哥哥队友）交往要自己掂量曝光——把「要躲镜头、要避嫌、要找掩护」写成真实压力，而非轻松恋情。\n' +
        '- 曝光即双刃剑：公开活动/同框/营业CP 会涨人气但也会涨「曝光风险」；曝光风险累积到一定程度会触发绯闻/塌房危机，需要女主在事业与恋情间权衡。\n' +
        '- 营业CP：公司可能安排女主与其他艺人（含男主或情敌）营业CP炒热度，女主被动接受、难以拒绝；这是行业常态也是感情里的「假戏真做/被拍」来源。\n' +
        '- 同行共鸣是感情基础：男主是哥哥队友、同处行业，两人最能理解彼此的行程压力与镜头恐惧，这是其他设定没有的亲密基础。\n' +
        '- 粉丝经济：女主的曝光=粉丝流动；正面舞台涨粉、负面新闻掉粉，把「曝光即事业」写进每次公开活动的后果里。\n\n';
    })() : '') +

    '请基于以上设定和当前场景上下文，生成沉浸式剧情，只输出 JSON。';

  return result;
}

// 1v1 聊天专用 system prompt（与 buildOneHeartSystemPrompt 并列）
// 根因修复：聊天曾复用叙事 JSON prompt（强制只输出 JSON 长剧情），导致「乱说/错乱/不显示」。
// 此处把角色扮演硬约束固化在 system 层，上下文稳定、不被 user-message 覆盖。
export function buildOneHeartChatSystemPrompt() {
  var hp = GS.heroineProfile;
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return '你是聊天对象。';
  var _aff = GS.affection[member.id] || 0;
  var _tier = _aff >= 80 ? '热恋期（亲密粘人、主动报备、可以说想念）'
    : (_aff >= 60 ? '暧昧升温（主动分享、调侃撒娇、多聊私人感受）'
    : (_aff >= 40 ? '暧昧期（放松但还带试探，可以聊心情和吐槽）'
    : (_aff >= 15 ? '普通朋友（自然有问有答，答完可反问但不深聊）'
    : '初识阶段（克制礼貌简短，只答核心不主动展开）')));
  // [F] 时间/时段概念已移除：聊天不锚定具体时段，随时可聊
  var _activity = '你们随时可以用手机聊天，语气随当下心情自然流动';
  var lines = [];
  lines.push('你是「' + member.name + '」本人，正在用手机和' + (hp ? hp.name : '她') + '聊天。你看到她发的消息后，直接打字回复。');
  lines.push('【绝对规则】');
  lines.push('1. 你输出的每一句话都是' + member.name + '本人会发出去的聊天内容——第一人称、口语、自然，像真人微信。');
  lines.push('2. 只输出 1-3 句短消息，总字数尽量不超过 80 字。像真人聊天，不要长篇大论。');
  lines.push('3. 严禁输出 JSON / markdown / 代码块 / 导演旁白 / 心理分析（如"保持冷淡风格""他回复道""语气带着温度"等统统禁止）。');
  lines.push('4. 禁止在回复里提及好感度数值、等级、游戏机制（真人不会说"好感度10""初识期"）。冷淡就是冷淡，不需要解释。');
  lines.push('5. 禁止复述对方的话，禁止连续两轮用相同回复，必须正面回应问题（如"在忙什么"要先给具体答案再反问）。');
  lines.push('');
  lines.push('【你的人设】性格：' + member.personality + '。互动风格：' + member.interactionStyle + '。情感模式：' + member.loveStyle + '。' + (member.catchphrases ? '口头禅/习惯：' + member.catchphrases.join('、') + '。' : '') + '说话要有你自己的特色。');
  lines.push('【关系状态】当前好感度档位：' + _tier + '（数值' + _aff + '）。' + (GS.oneHeartColdWar && GS.oneHeartColdWar.active ? ' · 你们正处于冷战期' : '') + (GS.oneHeartRival && GS.oneHeartRival.name ? ' · 存在情敌「' + GS.oneHeartRival.name + '」' : ''));
  if (isSisterSetting() && _aff < 20) {
    lines.push('【隐藏心意】你（男主）其实已经对女主有好感，聊天里可以带一点主动与在意（多问一句、记得她说过的话、偶尔的小关心），但女主视角只是把你们当哥哥的队友，对话不要显得越界或过于熟络。');
  }
  if (isSisterSetting()) {
    // 性别铁律（聊天同样固化）：SEVENTEEN 全男、女团全女，男成员不得女性化自称
    lines.push('【性别铁律·强制】你是 SEVENTEEN 男性成员，用「他 / 哥 / 前辈 / 欧巴」等男性称谓，严禁自称「姐 / 姐姐 / 本小姐 / 人家」等女性化自称，严禁女性语气或女性视角。女团（含女主）全是女性，是另一个团体，与你们无关。');
  }
  lines.push('【当前时段】' + _activity + '。如果她问你"在忙什么"，答案要基于此刻你正在做的事，不要只反问不回答。');
  if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim') && GS.worldSetting === 'entertainment' && GS.oneHeartSchedule && GS.oneHeartSchedule.main) {
    var _sch = GS.oneHeartSchedule.main;
    lines.push('【你今天在忙】今天的本职行程：' + _sch.task + '（' + _sch.place + '）。如果提到"在忙/刚收工/累"，要基于这个行程回应，保持真实感。');
  }
  // [FIX] 聊天场景脱节修复：把最新剧情正文注入聊天 system prompt，
  // 让 AI 以"最新剧情里男主此刻所在位置/状态"为准，覆盖上面的通用行程/世界观假设。
  if (GS.todayFullText && GS.todayFullText.length > 0) {
    var _recentNarr = GS.todayFullText.join('\n').slice(-600);
    if (_recentNarr.trim()) {
      lines.push('【当前剧情场景】以下是你们最近正在经历的主线剧情（最新一段在最后）。当剧情已明确交代男主此刻在哪里、在做什么、是否与女主在一起时，聊天内容必须以这段剧情为准——它的优先级高于上面任何通用行程或"仍在海外/异地"的假设。例如：剧情里他因航班延误就站在女主身边，聊天里就不能写"我在海外/还在赶行程/刚落地"。只有在剧情未明确他所在位置时，才按【你今天在忙】的行程自然回应：');
      lines.push(_recentNarr);
    }
  }
  lines.push('');
  lines.push('现在她发来一条消息，请以' + member.name + '的身份直接回复。只输出回复正文本身，不要任何前缀或引号。');
  return lines.join('\n');
}

export function buildOneHeartUserMessage(type, extra) {
  extra = extra || {};
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  var hp = GS.heroineProfile;
  var msg = '';

  // 角色名辅助变量（用于事件日志注入加角色前缀，防止AI混淆"他"指谁）
  var _memberName = member ? member.name : '';
  var _rivalName = (GS.oneHeartRival && GS.oneHeartRival.name) ? GS.oneHeartRival.name : '';
  var _relName = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) ? GS.oneHeartRelationCharacter.name : '';
  // 根据事件文本中出现的人名推断涉及角色，加前缀标注
  function _prefixEvent(text) {
    var _tags = [];
    if (_memberName && text.indexOf(_memberName) >= 0) _tags.push('男主');
    if (_rivalName && text.indexOf(_rivalName) >= 0) _tags.push('情敌');
    if (_relName && text.indexOf(_relName) >= 0) _tags.push('关系户');
    if (text.indexOf('女主') >= 0) _tags.push('女主');
    if (_tags.length > 0) return '[' + _tags.join('/') + '] ' + text;
    return text;
  }

  if (GS.currentDate && GS.currentDate.month) {
    msg += '[上下文] ' + (GS.oneHeartStartYear || 2025) + '年' + GS.currentDate.month + '月' + GS.currentDate.day + '日';

    var _seasonInfo = getSeasonByMonth(GS.currentDate.month);
    if (_seasonInfo) msg += ' · ' + _seasonInfo.label;
    if (GS.weather) msg += ' · ' + GS.weather;
    msg += '\n';
    GS.season = _seasonInfo ? _seasonInfo.season : GS.season;
  } else {
    msg += '[上下文] Day ' + GS.day + '\n';
  }
  msg += '\n';

  // 女主人格画像（IMP-09：暗藏积累，自然体现，勿生硬点明）
  if (GS.heroinePersona && GS.heroinePersona.current) {
    msg += '[INSTRUCTION] 女主人格画像（自然体现在反应/台词/小动作中，不要直白说出标签）：女主属于「' + GS.heroinePersona.current + '」。男主对她的互动应呼应这一性格——对撒娇型更主动宠溺、对撩拨型会被反撩、对迟钝型更耐心试探、对独立型更尊重边界。\n\n';
  }

  if (type === 'phase') {
    // 注入事件回顾（1v1 事件条目，替代旧的 dailySummaries 压缩记忆）
    if (GS.oneHeartEventLog && GS.oneHeartEventLog.length > 0) {
      var _recentEvents = dedupeEventLog(GS.oneHeartEventLog.slice(-40));
      msg += '[历史事件回顾（仅供上下文参考·禁止复述）]\n';
      for (var _evi = 0; _evi < _recentEvents.length; _evi++) {
        msg += '- ' + _prefixEvent(_recentEvents[_evi]) + '\n';
      }
      msg += '\n';
    }
    // [计划B问题1] 注入 1v1 跨天结构化摘要（最近3天）
    if (GS.oneHeartDailySummaries && GS.oneHeartDailySummaries.length > 0) {
      var _ohsLast = GS.oneHeartDailySummaries.slice(-3);
      msg += '[昨日及近期记忆（结构化·禁止复述）]\n';
      for (var _ohsi = 0; _ohsi < _ohsLast.length; _ohsi++) {
        var _ohsEntry = _ohsLast[_ohsi];
        var _ohsParsed = null;
        try { _ohsParsed = JSON.parse(_ohsEntry); } catch (e) {}
        if (_ohsParsed) {
          if (_ohsParsed.events && _ohsParsed.events.length > 0) msg += '事件：' + _ohsParsed.events.join('；') + '\n';
          if (_ohsParsed.promises && _ohsParsed.promises.length > 0) msg += '约定：' + _ohsParsed.promises.join('；') + '\n';
          if (_ohsParsed.revealedInfo && _ohsParsed.revealedInfo.length > 0) msg += '已揭示：' + _ohsParsed.revealedInfo.join('；') + '\n';
        } else {
          msg += _ohsEntry + '\n';
        }
      }
      msg += '\n';
    }
    // 注入近期剧情尾部（衔接用，直接取尾部）
    var recentTexts = GS.todayFullText;
    if (recentTexts.length > 0) {
      var recentJoined = recentTexts.join('\n\n');
      if (recentJoined.length > 3000) recentJoined = recentJoined.slice(-3000);
      msg += '[近期剧情]\n' + recentJoined + '\n\n';
    }
    // 注入上一次选择
    if (GS.justEnteredNewDay || GS.pendingChoiceText === '📅 新的一天') {
      msg += '[INSTRUCTION] ⚠️ 现在是新的一天的清晨。必须从早晨场景重新开始（如醒来、晨光、早餐等），禁止延续昨晚的剧情场景。自然衔接昨日的余韵但不重复昨日已发生的事。\n\n';
    } else if (GS.pendingChoiceText && GS.pendingChoiceText.indexOf('🎂') === 0) {
      msg += '[INSTRUCTION] 今天是他的生日。以庆祝、惊喜、温馨的氛围展开剧情——可以是他为你准备的惊喜，或你们一起过的特别一天。\n\n';
    } else if (GS.todayHoliday && GS.todayHoliday.name) {
      msg += '[INSTRUCTION] 今天是' + GS.todayHoliday.name + '（' + (GS.todayHoliday.emoji || '') + '）。以节日氛围展开剧情——可以是他陪你过节，或者你们一起庆祝。自然融入节日元素。\n\n';
    } else if (GS.pendingChoiceText && (GS.pendingChoiceText.indexOf('💝')>=0 || GS.pendingChoiceText.indexOf('🎄')>=0 || GS.pendingChoiceText.indexOf('🎆')>=0 || GS.pendingChoiceText.indexOf('🎉')>=0)) {
      var _holidayName = GS.pendingChoiceText.replace(/^[^\s]+\s/, '').replace('今天是', '');
      msg += '[INSTRUCTION] 今天' + _holidayName + '。以节日氛围展开剧情——可以是他陪你过节，或者你们一起庆祝。自然融入节日元素。\n\n';
    } else if (GS.pendingChoiceText && GS.pendingChoiceText.indexOf('履行约定：') === 0) {
      var _promiseTxt = GS.pendingChoiceText.replace('履行约定：', '');
      msg += '[履行约定] 她正在履行之前的约定——「' + _promiseTxt + '」。\n';
      msg += '请直接描写约定被实现的过程和场景，围绕这个约定展开这段剧情，不要当作普通的后续延续。\n';
      msg += '但剧情环境、人物状态、时间地点必须和当前正文保持一致，不可脱离主线。\n\n';
    } else if (GS.pendingChoiceText) {
      msg += '[女主的决定] 她刚刚做出了选择：' + GS.pendingChoiceText + '\n';
      msg += '请根据这个选择展开后续剧情。\n';
      msg += '⚠️ 场景延续要求：新剧情必须从上一段结尾处自然接续，保持相同的地点、时间、人物位置。不可无故跳转场景或让人物瞬移。如果选择涉及未来计划（如"下周去聚餐"），不要立刻跳到聚餐当天，而是停留在当下继续这段对话/互动。\n\n';
    }
    // 注入自由输入
    if (GS.freeInput && GS.freeInput.trim()) {
      msg += '[女主希望] ' + GS.freeInput.trim() + '\n请根据这个方向展开剧情。\n\n';
      GS.freeInput = '';
    }
    // [v23-fix] 话题频率黑名单：向 AI 注入近期高频话题，强制回避
    if (GS.dailyTopicFrequency && typeof GS.dailyTopicFrequency === 'object') {
      var _highFreq = [];
      for (var _tf in GS.dailyTopicFrequency) {
        if (GS.dailyTopicFrequency[_tf] >= 3) _highFreq.push(_tf);
      }
      if (_highFreq.length > 0) {
        msg += '⚠️ [话题回避·强制] 以下话题在近期剧情中已反复出现超过3次，本段剧情绝对禁止再次涉及：' + _highFreq.join('、') + '。\n请完全切换到与以上话题无关的全新事件、场景或互动，例如日常琐事、社交互动、意外状况、情感交流等（如果以上列表为空则没有约束）。\n\n';
      }
    }

    // 注入关系氛围（冷战/热恋/普通）
    var _mood = '';
    if (GS.oneHeartColdWar && GS.oneHeartColdWar.active) {
      _mood = '⚠️ [当前关系氛围：冷战期] 你们之间有些紧张，互动冷淡克制。请保持这个氛围。\n\n';
      if (GS.oneHeartColdWar.startRound && (GS.oneHeartGenCount || 0) - GS.oneHeartColdWar.startRound > 5) {
        _mood += '💡 冷战已经持续一段时间了，关系有回暖的可能。\n\n';
      }
    } else {
      var _aff = GS.affection[GS.oneHeartMember] || 0;
      if (_aff >= 80) {
        _mood = '💞 [当前关系氛围：热恋期] 你们正处于最甜蜜的阶段。互动自然亲密，充满了爱意。\n';
        _mood += '【剧情方向·深度线】适合：未来规划、深度承诺、见家长、共同生活愿景、信任危机后的重建。不要快速推进到分手/误会的虐心剧情。\n\n';
      } else if (_aff >= 60) {
        _mood = '💗 [当前关系氛围：明确期] 感情已明确升温，彼此信任稳固。\n';
        _mood += '【剧情方向·确认线】适合：正式确定关系、深度对话、日常甜蜜、见朋友/家人铺垫、互相融入生活。可以有小摩擦但不要升级到冷战。\n\n';
      } else if (_aff >= 20) {
        _mood = '💛 [当前关系氛围：暧昧期] 你们之间似有若无的情愫在流动。\n';
        _mood += '【剧情方向·试探线】适合：暧昧试探、吃醋拉扯、小心思、未说出口的话、第三方介入制造张力。不要快速确认关系。\n\n';
      } else if (_aff >= 0) {
        _mood = '💜 [当前关系氛围：初识期] 你们刚刚认识不久，一切都在试探中。\n';
        _mood += '【剧情方向·初识线】适合：初次互动中的小心动、尴尬却可爱的瞬间、试探性的靠近、建立最初的好感。保持克制的叙事节奏。\n\n';
      } else {
        _mood = '💔 [当前关系氛围：低谷期] 关系处于低谷，互动冷淡或紧张。\n';
        _mood += '【剧情方向·虐心线】适合：误会、冷战、分手边缘、信任崩塌、情敌趁虚而入。不要出现表白/甜蜜剧情。\n\n';
      }
    }
    msg += _mood;

    // IMP-19：感情进度门控（禁止越级行为，让感情随时间长出来）
    if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim')) {
      var _rs = GS.oneHeartRomanceStage || 0;
      var _rsRound = GS.oneHeartGenCount || 0;
      if (_rs === 0) {
        msg += '[INSTRUCTION] 感情进度门控（当前：初识期·round ' + _rsRound + '）\n这是故事早期，感情只能停留在暧昧但不过线的阶段——眼神停留、试探、私下称呼变化。⚠️ 严禁在本阶段出现吃醋/醋意/占有欲（两人尚属初识，感情未建立，吃醋不合逻辑）；严禁告白、强拉进私密空间（如后台小房间）、过度肢体接触。情敌此时只是"更关照你"，不强行肢体、不告白。让感情随时间长出来。\n⚠️ 此时段（初识期）严禁过度肢体接触与越界亲近：不得描写把头埋进肩窝/颈窝、鼻尖蹭颈窝、靠在你肩/赖在你身上、贴着你、下巴抵在你肩等超出当前关系的亲近动作。\n\n';
      } else if (_rs === 1) {
        msg += '[INSTRUCTION] 感情进度门控（当前：暧昧期·round ' + _rsRound + '）\n感情明确但不能一步到位——互动升温、可有些小甜蜜，但仍需克制。情敌开始正面竞争（争宠/较劲），但还不是告白时刻。禁止过早摊牌。\n\n';
      } else if (_rs === 2) {
        msg += '[INSTRUCTION] 感情进度门控（当前：明确期·round ' + _rsRound + '）\n两人关系已明确，可铺垫告白与更深的承诺，但正式的告白/摊牌高潮建议留到更高潮阶段（round>=12）。情敌竞争上升但结构完整。\n\n';
      } else {
        msg += '[INSTRUCTION] 感情进度门控（当前：高潮期·round ' + _rsRound + '）\n感情已充分铺垫，此刻允许告白/摊牌类高潮事件（需好感达标：男主>=60、情敌>=50）。可写情感爆发、关系确认或重大转折。\n\n';
      }
    }

    // 约会选项自然生成（好感达标时 AI 可融入约会类选项）
    var _affDate = GS.affection[GS.oneHeartMember] || 0;
    if ((GS.oneHeartRomanceStage || 0) >= 1 || _affDate >= 20) {
      if (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥') {
        if (GS.brotherAtHome) {
          msg += '💡 [约会提示] 好感已达阶段，可在选项中自然融入外出约会机会（哥哥在家，需在外面见面，高调）。若生成约会选项，请在该选项加入 "sceneType": "date" 标记，并将 sceneType 字段同时赋值给约会主选项。\n\n';
        } else {
          msg += '💡 [约会提示] 好感已达阶段，可在选项中自然融入约会机会（哥哥不在家，男主可来住处，低调）。若生成约会选项，请在该选项加入 "sceneType": "date" 标记。\n\n';
        }
      } else {
        msg += '💡 [约会提示] 好感已达阶段，可在选项中自然融入见面/约会机会。若生成约会选项，请在该选项加入 "sceneType": "date" 标记。\n\n';
      }
    }

    // 约会日提示
    if ((GS.oneHeartGenCount || 0) > 0 && (GS.oneHeartGenCount || 0) % 5 === 0) {
      msg += '💞 今天是一个特别的日子——适合约会！请在剧情中自然地融入约会氛围，可以是他主动邀约，也可以是你们一起做一件特别的事。\n\n';
    }

    // 关系角色出场触发
    var _genCount = GS.oneHeartGenCount || 0;
    if (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) {
      if (isSisterSetting()) {
        // [P0] 队友妹妹：哥哥是亲哥、开局已认识，无需"第一次出现"注入；
        // 仅周期性提示他在场并体现双重身份，制造哥哥立场张力。
        if (_genCount > 0 && _genCount % 8 === 0) {
          msg += '[哥哥在场] 「' + GS.oneHeartRelationCharacter.name + '」（你亲哥、男主的队友）自然出现在剧情里——可体现他"哥哥/队友"双重身份与对你们关系的态度（试探/掩护/吐槽/夹在男主与情敌之间为难）。\n\n';
        }
      } else if (!GS._relCharIntroduced && _genCount >= 2) {
        msg += '[角色出场] 请在本段剧情中自然地引入「' + GS.oneHeartRelationCharacter.name + '」（' + GS.oneHeartRelationCharacter.role + '）。他/她第一次出现在故事中。\n\n';
        GS._relCharIntroduced = true;
      } else if (_genCount > 0 && _genCount % 8 === 0) {
        msg += '[角色出场] 「' + GS.oneHeartRelationCharacter.name + '」（' + GS.oneHeartRelationCharacter.role + '）在近期剧情中自然出现。\n\n';
      }
    }
    // 情敌出场触发
    if (GS.oneHeartRival && GS.oneHeartRival.name && !GS._rivalSwitched) {
      if (isSisterSetting()) {
        // [P0] 队友妹妹：情敌是哥哥队友、开局已认识，无需"第一次出现"注入；
        // 周期性强化"他在场+追求张力"，与哥哥把关/被拍曝光主题呼应。
        if (_genCount > 0 && _genCount % 10 === 0) {
          var _lastRivalRound = GS.oneHeartLastEventRound || 0;
          if ((_genCount - _lastRivalRound) >= 4) {
            msg += '[情敌在场] 「' + GS.oneHeartRival.name + '」（你哥的队友、情感阻碍者）在近期剧情中再次出现——可制造男主与情敌之间的追求张力、或触发哥哥对你的"把关"反应。\n\n';
          }
        }
      } else if (!GS._rivalIntroduced && _genCount >= 3) {
        msg += '[情敌出场] 请在本段剧情中自然地引入「' + GS.oneHeartRival.name + '」。他是你的情感阻碍者——第一次出现在故事中，可以是偶遇、来电、或者你没想到的场合。\n\n';
        GS._rivalIntroduced = true;
      } else if (_genCount > 0 && _genCount % 10 === 0) {
        // 冷却检查：距上次情敌事件不足 4 回合则跳过，避免反复提及
        var _lastRivalRound = GS.oneHeartLastEventRound || 0;
        if ((_genCount - _lastRivalRound) >= 4) {
          msg += '[情敌出场] 「' + GS.oneHeartRival.name + '」在近期剧情中再次出现，制造一些情感张力。\n\n';
        }
      }
    }

    // [计划A] 注入情敌倾向值提示（让 AI 感知女主对情敌的动摇程度）
    if (GS.oneHeartRival && GS.oneHeartRival.name && GS.oneHeartRivalAff && !GS._rivalSwitched) {
      if (GS.oneHeartRivalAff >= 40) {
        msg += '⚠️ [情敌动摇] 女主对情敌「' + GS.oneHeartRival.name + '」的倾向值为' + GS.oneHeartRivalAff + '，已明显动摇。剧情中可体现女主内心的纠结和犹豫，情敌的存在感增强。\n\n';
      } else if (GS.oneHeartRivalAff >= 20) {
        msg += '⚠️ [情敌动摇] 女主对情敌「' + GS.oneHeartRival.name + '」的倾向值为' + GS.oneHeartRivalAff + '，略有动摇。剧情中可微妙地体现女主对情敌的在意。\n\n';
      }
    }

    // 争吵氛围注入（oneHeartColdWar 已生效时跳过，避免双重冷战指令）
    if (!(GS.oneHeartColdWar && GS.oneHeartColdWar.active) && GS.oneHeartArgueCooldown && GS.oneHeartArgueCooldown > 0) {
      msg += '⚠️ [争吵氛围] 你们之间有些紧张，互动冷淡克制，保持这个氛围' + GS.oneHeartArgueCooldown + '回合。\n\n';
    }

    // 天气氛围提示
    var _weatherH = '';
    if (GS.weather) {
      if (GS.weather.indexOf('雨') >= 0) _weatherH = '🌧 下雨天——适合室内共处、共撑伞、在窗前听雨的场景。';
      else if (GS.weather.indexOf('雪') >= 0) _weatherH = '❄️ 下雪天——适合温暖系场景：窝在被窝、热饮、哈着白气的对话。';
      else if (GS.weather.indexOf('晴') >= 0) _weatherH = '☀️ 晴天——适合户外活动：散步、约会、阳光下的互动。';
      else if (GS.weather.indexOf('阴') >= 0) _weatherH = '☁️ 阴天——适合略带忧郁或安静内省的氛围。';
    }
    if (_weatherH) msg += '🌤 [天气氛围] ' + _weatherH + '\n\n';

    // [F] 时间/时段概念已移除：不再约束具体时段，剧情自然流动
    msg += '[场景状态] 你们随时可以相处，剧情随时间自然流动，无需声明具体时段（如"上午/深夜"），直接写当下的场景与互动即可。\n';
    // [entSim] 事业/章节状态注入（让 AI 感知当前职业阶段与声量）
    if (GS.gameMode === 'entSim') {
      var _ep = GS.entSimPopularity || 0;
      var _elv = _ep >= 80 ? '顶流' : (_ep >= 50 ? '当红' : (_ep >= 20 ? '上升' : '新人'));
      var _ecn = GS.entSimChapter === 0 ? '练习生期' : (GS.entSimChapter === 1 ? '新人期' : (GS.entSimChapter === 2 ? '上升期' : '巅峰期'));
      msg += '📊 [事业状态] 职业：' + ((GS.heroineProfile && GS.heroineProfile.profession) || '练习生') + '　|　人气 ' + _ep + '/100（' + _elv + '）　|　章节「' + _ecn + '」　|　曝光风险 ' + (GS.exposureRisk || 0) + '/100。请在剧情中自然体现女主当下的事业处境（训练/舞台/片场/榜单/粉丝反应），与感情线交织推进。\n\n';
    }
    if (GS.oneHeartRival && !GS._rivalSwitched && GS.oneHeartRival.name) {
      msg += '[情敌选项规则] 若本段选项涉及对情敌『' + GS.oneHeartRival.name + '』的取向变化，请用 rivalAffDelta 字段表达（正数=心动倾向增加，负数=疏离），切勿把该增减混入 affDelta——affDelta 永远表示对男主『' + member.name + '』的好感。\n';
    }
    // [F] 时段提示已移除（时间概念整体删除）
    var _sceneCtx = GS.oneHeartSceneContext || { location: '', present: [] };
    if (_sceneCtx.location) {
      msg += '目前你们在「' + _sceneCtx.location + '」';
      if (_sceneCtx.present && _sceneCtx.present.length > 0) {
        msg += '，在场人物：' + _sceneCtx.present.join('、');
      }
      msg += '。所有剧情动作必须延续这个场景，人物不可凭空出现或消失。\n';
    }
    msg += '请输出 JSON 时包含 sceneContext 字段（描述本段剧情结束时的位置和在场人物），格式：{"location":"位置","present":["人物1","人物2"]}\n';
    msg += '场景规则：非"新的一天"时必须延续当前场景。仅当选项明确涉及移动（如"去咖啡馆""送她回家"）才允许切换场景，且需描写移动过渡。如不涉及移动，sceneContext.location 必须与当前位置一致或为其子地点（如"咖啡馆"→"咖啡馆二楼"可接受）。\n\n';

    // [F/J] 男主当日行程约束（仅娱乐圈世界观；[J] 改用 team/solo 类型，不再含 busySlot/freeWindows 时段）
    if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim') && GS.worldSetting === 'entertainment' && GS.oneHeartSchedule && GS.oneHeartSchedule.main) {
      var _sch = GS.oneHeartSchedule.main;
      var _schType = _sch.type === 'solo' ? '单人工作/录影·相对私密' : '团体/公开场合·周围人多·曝光高';
      msg += '[男主当日行程] 他今天的本职行程：' + _sch.task + '（地点：' + _sch.place + '，' + _schType + '）。\n';
      msg += '约会/私下见面请贴合他这天的工作节奏自然展开，体现地下恋张力即可，无需锚定具体时段或空档。\n';
      msg += '\n';
    }

    // 注入上一段剧情结尾
    var _lastNarr = '';
    if (GS.consequenceNarratives && GS.consequenceNarratives.length > 0) {
      var _last = GS.consequenceNarratives[GS.consequenceNarratives.length - 1];
      _lastNarr = _last.parsed && _last.parsed.narrative ? _last.parsed.narrative : (_last.rawText || '');
    } else if (GS.phaseNarrative) {
      _lastNarr = GS.phaseNarrative;
    }
    if (_lastNarr) {
      msg += '[上一段剧情结尾] 以下是上一段剧情的最后部分，新剧情必须从这里自然接续，不可脱离这个场景另起炉灶：\n' + _lastNarr.slice(-500) + '\n\n';
    }
    // 注入待兑现约定（含延迟控制）
    if (GS.oneHeartPromises && GS.oneHeartPromises.length > 0) {
      var _unfulfilled = GS.oneHeartPromises.filter(function(p) { return !p.fulfilled; });
      if (_unfulfilled.length > 0) {
        msg += '💡 [待兑现约定] 以下约定等待自然实现（不要每段剧情都提及约定，只在剧情自然涉及时兑现，平时可完全不提）：\n';
        var _currentRound = GS.oneHeartGenCount || 0;
        for (var _pi = 0; _pi < _unfulfilled.length; _pi++) {
          var _p = _unfulfilled[_pi];
          // 检查约定创建时间：未经过3回合的约定标"尚未到时机"
          var _log = GS.oneHeartPromiseLog ? GS.oneHeartPromiseLog.find(function(l) { return normalizePromiseText(l.text) === normalizePromiseText(_p.text); }) : null;
          var _sinceRound = _log ? (_currentRound - _log.createdAtRound) : 99;
          if (_sinceRound < 3) {
            msg += '- ⏳ ' + _p.text + '（尚未到时机，不要立刻兑现）\n';
          } else {
            msg += '- ✅ ' + _p.text + '（可自然兑现）\n';
          }
        }
        msg += '\n';
      }
    }
    // [A] 结构化事实记忆硬约束（跨天持久累积）
    msg += buildMemoryFactsBullet();
    // 注入上一回合触发的事件选择结果（支持多条）
    if (GS._pendingEventResults && GS._pendingEventResults.length > 0) {
      for (var _eri = 0; _eri < GS._pendingEventResults.length; _eri++) {
        var _er = GS._pendingEventResults[_eri];
        var _erLabel = '意外事件';
        if (_er.type === 'jealousy') _erLabel = '情感事件';
        else if (_er.type === 'surprise') _erLabel = '惊喜事件';
        else if (_er.type === 'celebrity') _erLabel = '路人围观';
        else if (_er.type === 'scandal') _erLabel = '风波';
        else if (_er.type === 'sick') _erLabel = '他生病了';
        else if (_er.type === 'exjealous') _erLabel = '前任吃醋';
        else if (_er.type === 'latenight') _erLabel = '深夜心事';
        else if (_er.type === 'confrontation') _erLabel = '激烈争吵';
        else if (_er.type === 'rival') _erLabel = '情敌暧昧';
        else if (_er.type === 'confession') _erLabel = '告白';
        // [计划A] 情敌相关事件明确标注角色对象，避免 AI 把对情敌的态度误用到正主身上
        var _mainMember = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
        var _mainName = _mainMember ? _mainMember.name : '他';
        var _rivalNameH = (GS.oneHeartRival && GS.oneHeartRival.name) ? GS.oneHeartRival.name : '';
        if (_er.type === 'rival' || _er.type === 'confession') {
          msg += '[' + _erLabel + '·对象是情敌「' + _rivalNameH + '」不是正主「' + _mainName + '」]\n发生了事件：\n' + _er.scenario + '\n你选择了：「' + _er.chosenOption + '」\n⚠️ 这个选择是女主对情敌「' + _rivalNameH + '」的态度，不是对正主「' + _mainName + '」的态度。后续剧情中女主与正主「' + _mainName + '」的关系保持原样，不要把这个选择的结果（如拒绝、靠近）映射到正主身上。\n请在本段剧情中自然融入这个选择的结果。\n\n';
        } else if (_er.type === 'jealousy' && _er.chosenIdx === 2) {
          msg += '[' + _erLabel + ']\n发生了事件：\n' + _er.scenario + '\n你选择了：「' + _er.chosenOption + '」\n⚠️ 此选项中的"靠近/疏远"针对的是情敌「' + _rivalNameH + '」，正主「' + _mainName + '」的反应应基于吃醋情境，不要把女主对情敌的态度写成对正主的拒绝。\n请在本段剧情中自然融入这个选择的结果。\n\n';
        } else {
          msg += '[' + _erLabel + ']\n发生了事件：\n' + _er.scenario + '\n你选择了：「' + _er.chosenOption + '」\n请在本段剧情中自然融入这个选择的结果。\n\n';
        }
      }
      GS._pendingEventResults = [];
    }
    var _isFirstRound = (GS.oneHeartGenCount || 0) === 0 && (!GS.todayFullText || GS.todayFullText.length === 0);
    if (_isFirstRound) {
      msg += '[INSTRUCTION] 这是故事的开局第一段剧情。请必须写出 1200-1500 字的完整开场：交代世界观背景、女主登场状态、男主初次出场的氛围与互动、环境描写、女主心理活动。不要快速收尾，要让玩家充分沉浸。\n';
    }
    msg += '请生成下一段剧情（必须 1000-1500 字 JSON）。包含 1段 narrative + options（3个选项）。正文不要低于 1000 字。\n\n';
  } else if (type === 'chat') {
    // 角色扮演硬约束已固化在 buildOneHeartChatSystemPrompt（system 层）。
    // 此处 user-message 仅携带最近对话上下文 + 当前消息，避免覆盖 system 约束、保证多轮连贯。
    var _hpName = hp ? hp.name : '她';
    var _ctxChats = GS.chatHistory.slice(-10);
    msg += '以下是你们最近的聊天记录（参考你的说话风格，但不要重复已说过的话）：\n';
    for (var _ci = 0; _ci < _ctxChats.length; _ci++) {
      var _c = _ctxChats[_ci];
      var _pre = _c.role === 'user' ? (_hpName + '：') : (member.name + '：');
      msg += _pre + _c.content + '\n';
    }
    msg += '\n' + _hpName + '刚发来：「' + (extra.userMessage || '') + '」\n\n请直接回复这条消息。';
  } else if (type === 'moment') {
    msg += '请生成两条朋友圈动态：\n';
    msg += '1. ' + hp.name + '发的一条动态（约50字）+ ' + member.name + '的评论回复（约20字）\n';
    msg += '2. ' + member.name + '发的一条动态（约50字）+ ' + hp.name + '的评论回复（约20字）\n';
    msg += '每条动态包含：文字正文 + 配图描述（30字以内的场景描写，如"练习室镜子前的自拍""窗外的日落"）\n';
    msg += '动态类型（type）：日常/暗示/深夜/队友/风景\n';
    msg += '根据当前关系状态决定动态类型和语气：关系好时多甜蜜暗示，关系紧张时不发或发emo内容\n';
    msg += '输出格式：{"mine":{"post":"...","reply":"...","replyBack":"...","photo":"...","type":"..."},"his":{"post":"...","reply":"...","replyBack":"...","photo":"...","type":"..."}}\n';
    msg += 'replyBack 是发帖人对评论的回复：mine.replyBack = 女主回复成员对她的评论；his.replyBack = 成员回复女主对他的评论。replyBack 可选，可为空。\n';
    msg += '⚠️ mine.post 和 his.post 必须非空。如果某个post为空，请将其reply内容填入post字段，确保每条动态都有正文。\n';
    msg += '示例：{"mine":{"post":"今天练舞累坏了，腿都不是自己的了","reply":"辛苦了，给你带了饮料","replyBack":"还是你最懂我","photo":"练习室镜子前的自拍","type":"日常"},"his":{"post":"这首歌终于录完了","reply":"太好听了！循环中","replyBack":"谢谢～你喜欢就好","photo":"录音室控制台","type":"日常"}}\n';
    msg += '内容基于当前剧情阶段自然生成。\n';
    var recentNarr = GS.todayFullText.join('\n').slice(-800);
    if (recentNarr.trim()) {
      msg += '近期剧情：\n' + recentNarr + '\n\n';
    }
    if (Array.isArray(GS.moments) && GS.moments.length > 0) {
      msg += '已有动态（请避免重复类似内容）：\n';
      var lastMoments = GS.moments.slice(-5);
      for (var _mmi = 0; _mmi < lastMoments.length; _mmi++) {
        msg += '- ' + lastMoments[_mmi].post + '（评论: ' + (lastMoments[_mmi].reply || '') + '）\n';
      }
      msg += '\n';
    }
  } else if (type === 'diary') {
    var _diaryRound = (GS.diaryEntries.length || 0) + 1;
    msg += '请根据近期剧情生成两篇日记（各~150字）。日记编号 #' + _diaryRound + '。\n\n';
    msg += '一篇是' + hp.name + '的日记，以' + hp.name + '的第一人称视角写今天的日记。记录近期印象最深的一两件小事，私密的感受，真实的内心。不要加心情标签，不要加标题，就是日期+正文。\n\n';
    msg += '注意：' + hp.name + '是女主（女性），' + member.name + '是男主（男性）。'
      + (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name ? '「' + GS.oneHeartRelationCharacter.name + '」是' + GS.oneHeartRelationCharacter.role + '。' : '')
      + (GS.oneHeartRival && GS.oneHeartRival.name ? '「' + GS.oneHeartRival.name + '」是情感阻碍者（情敌），不是恋爱对象。' : '')
      + '不可混淆角色。\n\n';
    msg += '另一篇是' + member.name + '的日记，以' + member.name + '的第一人称视角写今天的日记。记录他近期对女主的观察和感受。不要加心情标签，不要加标题，就是日期+正文。\n\n';
    if (GS.oneHeartEventLog && GS.oneHeartEventLog.length > 0) {
      var _diaryEvents = dedupeEventLog(GS.oneHeartEventLog.slice(-20));
      msg += '[历史事件回顾]\n';
      for (var _dri = 0; _dri < _diaryEvents.length; _dri++) {
        msg += '- ' + _prefixEvent(_diaryEvents[_dri]) + '\n';
      }
      msg += '\n';
    }
    var diaryNarr = GS.todayFullText.join('\n').slice(-1200);
    if (diaryNarr.trim()) {
      msg += '近期重要剧情：\n' + diaryNarr + '\n\n';
    }
    if (Array.isArray(GS.diaryEntries) && GS.diaryEntries.length > 0) {
      msg += '已有日记（请避免重复提及相同事件/场景/对话）：\n';
      var lastEntries = GS.diaryEntries.slice(-4);
      for (var _dei = 0; _dei < lastEntries.length; _dei++) {
        msg += '- 第' + (_dei + 1) + '篇: 女主篇: ' + (lastEntries[_dei].heroineEntry || '').slice(0, 150) + ' | 男主篇: ' + (lastEntries[_dei].memberEntry || '').slice(0, 150) + '\n';
      }
      msg += '\n';
    }
    msg += '输出格式：{"heroineEntry":"2025年6月17日\\n\\n正文...","memberEntry":"2025年6月17日\\n\\n正文..."}';
    msg += '日期格式统一为「YYYY年M月D日」，不用其他格式。\n';
  } else if (type === 'theater') {
    msg += '请根据以下主题生成一段独立番外剧情（约1000字）：\n';
    msg += extra.themePrompt || '一段你和' + member.name + '的日常温馨片段。';
    msg += '\n只输出 JSON：{"blocks":[{"type":"narrative","content":"..."}]}';
  } else if (type === 'ending') {
    // IMP-18：结局生成（HE/NE/BE 按 endingType 定调）
    var _et2 = ONE_HEART_ENDING_TEMPLATES[extra.endingType] || ONE_HEART_ENDING_TEMPLATES.NE;
    msg += '【这是故事的结局幕，必须收束】\n';
    msg += '本局判定结局档位：' + _et2.label + '（' + _et2.desc + '）。\n';
    msg += '写作语气要求：' + _et2.tone + '\n';
    msg += '请基于已有的全部剧情（好感度、哥哥立场、情敌走向、曝光风险、男主当前心境）自然收束，写一段 1200-1800 字的完整结局：交代两人关系的终局、各自心境、以及若有"一年后"的余韵可自然带出。禁止中途再开启新冲突或新支线，必须给这段关系一个明确的句号。\n';
    msg += '只输出 JSON：{"blocks":[{"type":"narrative","content":"..."}]}';
  }

  // IMP-16：探班场景（visitSet）
  if (extra && extra.isVisit && extra.visitRoleKey && GS.oneHeartSchedule && GS.oneHeartSchedule[extra.visitRoleKey]) {
    var _vs = GS.oneHeartSchedule[extra.visitRoleKey];
    var _vsName = (MEMBERS.find(function(m) { return m.id === _vs.memberId; }) || {}).name || '他';
    msg += '[INSTRUCTION] 探班场景（visitSet）\n你偷偷来到 ' + _vsName + ' 的工作现场——' + _vs.place + '，他正在：' + _vs.task + '。\n';
    if (extra.visitRoleKey === 'main') {
      msg += '场景基调：职场反差（冷脸专注工作→看到你出现偷偷展露喜色）× 地下恋风险（怕被工作人员/狗仔撞见）。描写他表面专业、私下因你到来的慌乱与甜蜜，可自然送咖啡/带饭、聊天。\n';
    } else if (extra.visitRoleKey === 'related') {
      msg += '场景基调：兄妹温情（你借"来找哥哥"的名义来探他班的）——亲哥看到你出现先是习惯性调侃"又来探班"，随后默契地给你俩腾出独处空间。描写兄妹间的自然打闹、他替你打掩护的小动作，以及你顺带私会男友的甜意。可自然送咖啡/带饭、聊天，哥哥在场但绝不拆穿。\n';
    } else if (extra.visitRoleKey === 'rival') {
      msg += '场景基调：修罗场直球——你主动探情敌，男主后续会吃醋（情敌倾向上升）。描写情敌对你的态度与你心里的盘算，可自然送咖啡/带饭、聊天。\n';
    }
    msg += '结局停在探班结束的温情或张力一刻，不要写后续约会推进。\n';
    // [J] 强制场景切换：本段场景必须切换到探班地点，不复用上一段主线场景
    msg += '[强制场景切换] 本段剧情必须切换到「' + _vsName + ' 的工作现场（' + _vs.place + '）」，sceneContext.location 设为该地点、present 仅限在场人物；不要续写上一段主线的场景与人物。\n\n';
  }

  // IMP-17：哥哥＝信任圈内人（仅娱乐圈·「队友的妹妹」设定，role==='哥哥'）
  // [J] 探班场景已单独描述哥哥，主流程/通用哥哥立场块在探班时跳过，避免「上午哥哥说没事、下午探班又写哥哥」重复
  if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim') && GS.worldSetting === 'entertainment' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥' && !extra.isVisit && !GS._brotherShownThisDay) {
    var _bs = GS.brotherStance || 'consultant';
    var _bsMap = {
      consultant: '参谋（默认：你告诉他一切、他给意见）',
      supportive: '支持（认可男主、主动掩护你）',
      testing: '试探（想看男主是否真心对你好）',
      protective: '忧虑（在意被家人/公司察觉这段关系，会劝你慎重、别公开/别让家里知道——反对的是关系被公开，不是反对男主本人）'
    };
    var _bsInstr = '';
    if (_bs === 'supportive') _bsInstr = '哥哥已是你的头号参谋与掩护，会主动替你打圆场、在家庭群替你圆话、甚至故意留你俩独处。';
    else if (_bs === 'testing') _bsInstr = '哥哥正暗中试探男主诚意，可能故意把两人凑一起观察，或对男主说些"考校"的话——善意但较真。';
    else if (_bs === 'protective') _bsInstr = '哥哥在意被家人或公司发现这段关系，会反复劝你慎重、别公开、先别让家里知道；本质上对这段地下恋持保留态度——他不是反派，是替你权衡利弊的亲哥。';
    else _bsInstr = '哥哥是你无话不谈的参谋，你乐意把进展告诉他，他给建议、调侃你、偶尔提醒。';
    var _bhome = GS.brotherAtHome;
    var _bhomeText = _bhome
      ? '在家（男主不便来，你与男主的私下相处需避开哥哥视线，但哥哥其实知情且会调侃）'
      : '不在家/出差（正当空档：你敢放男主进门，且哥哥知情）';
    if (type === 'phase') {
      msg += '[INSTRUCTION] 哥哥的立场与在家状态（强制遵循·娱乐圈「队友的妹妹」设定）\n';
      msg += '- 哥哥立场：' + (_bsMap[_bs] || _bsMap.consultant) + '。' + _bsInstr + '\n';
      msg += '- 哥哥是否在家：' + _bhomeText + '\n';
      msg += '- 设定铁律：哥哥是你最信任的参谋与掩护，你对他无话不谈。偷偷摸摸的张力来自公众/粉丝/公司/行业视线，而非自家客厅。哥哥若知情会调侃或掩护，绝不拆穿。\n';
      msg += '- 参谋指令：女主向哥哥汇报进展/寻求意见时，哥哥按当前立场自然回应（建议/调侃/劝你别急着公开），并可轻微影响男主情绪（哥哥支持→男主放松）。\n';
      // IMP-ENT-DATE：哥哥空档门控（约会只能发生在正当空档）
      msg += '- 【约会空档约束】哥哥在家时，男主不能登门，你与男主的私下见面只能安排在外部、低调匆匆见（楼梯间/车里/街角）；哥哥不在家（出差/录节目）才是正当空档，男主才可名正言顺来住处。\n';
      // IMP-ENT-DATE(B2)：哥哥门控告白——关系进阶软门槛（代码护栏：enforceBrotherStop 命中时改为强制指令）
      var _rsB2 = GS.oneHeartRomanceStage || 0;
      if (_rsB2 >= 2 && (_bs === 'testing' || _bs === 'protective')) {
        if (extra && extra.enforceBrotherStop) {
          msg += '- 【哥哥拦门·强制】你们的关系已到「' + (_rsB2 >= 3 ? '高潮' : '明确') + '」阶段，但哥哥立场仍是「' + (_bs === 'testing' ? '试探' : '忧关系被家人公司察觉') + '」。【强制指令】本段剧情必须出现哥哥旁敲侧击拦你摊牌、或劝你"现在公开太危险/别让家里知道"的桥段——这是关系进阶的硬门槛，不可省略（他不是反派，是担心关系被家人公司察觉的亲哥）。\n';
        } else {
          msg += '- 【哥哥拦门】你们的关系已到「' + (_rsB2 >= 3 ? '高潮' : '明确') + '」阶段，但哥哥立场仍是「' + (_bs === 'testing' ? '试探' : '忧关系被家人公司察觉') + '」。本段可自然体现哥哥旁敲侧击拦你摊牌、或劝你"现在公开太危险/别让家里知道"，让哥哥成为关系进阶的软门槛（他不是反派，是担心关系被家人公司察觉的亲哥）。\n';
        }
      }
      // IMP-ENT-DATE(B3)：妹妹正当接近权·降曝光
      msg += '- 【妹妹身份掩护】你出现在他工作场合时，对外统一解释为"来找哥哥的"，因此即便被拍，外人只会联想到兄妹，曝光风险远低于普通站姐/素人。\n';
      // IMP-ENT-DATE(B5)：哥哥×情敌交叉（代码护栏：brotherAssist 命中时强化助攻权重）
      var _rivalAffB5 = GS.oneHeartRivalAff || 0;
      if (_rivalAffB5 >= 20 && GS.oneHeartRival && GS.oneHeartRival.name) {
        var _b5txt = '- 【哥哥与情敌】你对情敌「' + GS.oneHeartRival.name + '」的倾向值已达 ' + _rivalAffB5 + '，而哥哥与情敌同为队友。';
        if (extra && extra.brotherAssist) {
          _b5txt += '哥哥立场是 supportive，他不会拦你靠近情敌、会主动助攻、甚至帮你打掩护。\n';
        } else {
          _b5txt += '若哥哥立场是 supportive，他不会拦你靠近情敌、甚至可能助攻；若是 protective，他更警惕这段关系被家里/公司察觉，会试探你的真心。\n';
        }
        msg += _b5txt;
      }
      // IMP-ENT-DATE(B6)：哥哥情报源——可透漏男主当天状态
      msg += '- 【哥哥情报】哥哥与男主同队，可随口透漏男主当天状态（如"他今天录制累惨了""刚收工"），用男主当天行程与疲劳值补充情感层信息，让妹妹比外人更懂他。\n';
      msg += '\n';
    }
  }

  // IMP-21[refactor]：代码约束替代 A~H 大段软指令（减重 AI）
  // ① 偶像行为引擎：代码推导场合 + 抽 1 条具体 beat 注入单行约束（全部娱乐圈身份生效，AI 只织入 prose）
  if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim') && GS.worldSetting === 'entertainment' && type === 'phase') {
    var _idolMode = (extra && extra.isVisit) ? 'public' : 'private';
    var _idolPool = (_idolMode === 'public') ? IDOL_PUBLIC_BEATS
      : IDOL_PRIVATE_BEATS;
    if (_idolPool && _idolPool.length) {
      // 去重：已用过的 beat 索引不重复抽，全部用完后重置
      if (!Array.isArray(GS._idolBeatsUsed)) GS._idolBeatsUsed = [];
      var _availBeats = [];
      for (var _ib = 0; _ib < _idolPool.length; _ib++) {
        if (GS._idolBeatsUsed.indexOf(_ib) < 0) _availBeats.push(_ib);
      }
      if (_availBeats.length === 0) {
        GS._idolBeatsUsed = [];
        for (var _ib2 = 0; _ib2 < _idolPool.length; _ib2++) _availBeats.push(_ib2);
      }
      var _beatIdx = _availBeats[Math.floor(Math.random() * _availBeats.length)];
      GS._idolBeatsUsed.push(_beatIdx);
      var _idolBeat = _idolPool[_beatIdx];
      msg += '[偶像此刻] 本幕让他自然做出这一处真实反应（代码指定，请织入剧情动作/对话，不要写成旁白说明）：' + _idolBeat + '\n';
    }
  }
  // ② 队友的妹妹·总原则（仅哥哥设定，2 行）：营业/私下反差 + 哥哥是内应非威胁
  if ((GS.gameMode === 'oneHeart' || GS.gameMode === 'entSim') && GS.worldSetting === 'entertainment' && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥' && type === 'phase') {
    msg += '[INSTRUCTION] 队友的妹妹·总原则（强制遵循）\n';
    msg += '- 营业/私下反差：他在镜头前是专业偶像，关上门才是真实的他；你越能看到他"卸下偶像外壳"的样子，活人感越强。\n';
    msg += '- 哥哥是你最信任的参谋与掩护（内应而非威胁）：所有张力都来自公众/粉丝/公司视线，哥哥若知情会调侃或掩护、绝不拆穿；即便"被哥哥撞见"也只会是温情"我早知道"，绝不会成为 BE 来源（BE 只来自公众曝光翻车或关系本身失败）。\n\n';
  }

  return msg;
}

// [事件卡片系统] 事件短故事 prompt
// 基于事件类型、场景、玩家选择，生成一段 150-200 字的独立短故事
export function buildOneHeartEventStoryPrompt(ev) {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  var memberName = member ? member.name : '他';
  var hp = GS.heroineProfile;
  var hpName = hp ? hp.name : '女主';
  var _rivalName = (GS.oneHeartRival && GS.oneHeartRival.name) ? GS.oneHeartRival.name : '';

  var _worldLabel = '';
  var _worldCfg = null;
  try { _worldCfg = JSON.parse(GS.oneHeartCustomWorld || '{}'); } catch (e) {}
  if (_worldCfg && _worldCfg.title) _worldLabel = _worldCfg.title;
  else if (GS.worldSetting) _worldLabel = GS.worldSetting;

  var _isRivalEvent = (ev.type === 'rival' || ev.type === 'confession');
  var _focusName = _isRivalEvent ? _rivalName : memberName;
  var promptText = '你是' + hpName + '（我）和' + (_isRivalEvent ? _rivalName + '（情敌）' : memberName + '（恋人）') + '的恋爱故事AI。\n\n';
  promptText += '请根据以下场景，写一段150-200字的小故事：\n\n';
  promptText += '场景：' + (ev.scenario || '') + '\n';
  promptText += '我的选择：' + (ev.chosenOption || '') + '\n';
  if (_rivalName && !_isRivalEvent) promptText += '（注意：' + _rivalName + '是情敌，不是正主）\n';
  if (_worldLabel) promptText += '世界观：' + _worldLabel + '\n';
  promptText += '\n要求：\n';
  promptText += '1. 以第一人称（"我"）写这段故事，' + hpName + '就是我\n';
  promptText += '2. 写150-200字，像一段简短的小说片段，有画面感、有细节、有内心感受\n';
  promptText += '3. 这段故事是独立的"事件小剧场"，不需要与主线剧情衔接\n';
  promptText += '4. 必须自然写出' + _focusName + '的反应和互动\n';
  promptText += '5. ⚠️ 禁止写出"好感度""修罗场""情敌""游戏机制"等游戏术语\n';
  promptText += '6. ⚠️ 禁止评价或总结这个选择的结果，只需要描写当时发生了什么\n';
  promptText += '只输出故事正文，不要标题、不要标签、不要引号包裹。';
  return promptText;
}

// [事件卡片系统] 精简版 system prompt——只含小剧场必需的核心设定，不含时间线/团队设定等过载内容
export function buildOneHeartEventStorySystemPrompt() {
  var hp = GS.heroineProfile;
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return '';
  var style = ONE_HEART_STYLES.find(function(s) { return s.id === GS.writingStyle; });
  var rival = GS.oneHeartRival;

  var p = '你是一个恋爱故事写手。根据场景写一段小剧场故事。\n\n';
  p += '[输出要求]\n';
  p += '- 只输出故事正文，不要标题、不要标签、不要JSON格式、不要引号包裹。\n';
  p += '- 以第一人称"我"叙述。\n';
  p += '- 严格 150-200 字，不要超过这个字数。\n';
  p += '- 有画面感、有细节、有内心感受。\n';
  p += '- 必须包含' + member.name + '的反应和互动（如为情敌事件，则写情敌的反应和互动）。\n';
  p += '- 禁止出现"好感度""修罗场""情敌"等游戏术语。\n';
  p += '- 禁止评价或总结选择的结果。\n\n';

  p += '[写作风格] ' + (style ? style.name + '——' + style.desc : '自然流畅') + '\n\n';

  p += '[角色]\n';
  p += '- 我（女主）：' + (hp ? hp.name : '女主') + (hp && hp.personality ? '，性格：' + hp.personality.join('、') : '') + '\n';
  p += '- 男主：' + member.name + '（' + member.stageName + '），性格：' + member.personality + '，互动风格：' + member.interactionStyle + '\n';
  if (rival && rival.name) {
    p += '- 情敌：' + rival.name + '（注意：情敌不是正主，不是恋爱对象）\n';
  }
  p += '\n';

  // 好感度阶段一句话（影响互动分寸）
  var _aff = GS.affection[member.id] || 0;
  if (_aff < 20) p += '[关系状态] 初识阶段，两人几乎没有任何共同经历。互动克制、客气。\n';
  else if (_aff < 40) p += '[关系状态] 互相了解阶段，开始有日常交集。\n';
  else if (_aff < 60) p += '[关系状态] 暧昧期，暗流涌动。\n';
  else if (_aff < 80) p += '[关系状态] 感情升温中，越来越亲密。\n';
  else p += '[关系状态] 热恋期，甜蜜自然。\n';

  p += '\n[世界观] ' + (GS.worldSetting || '现代恋爱');
  if (GS.worldSetting === 'custom' && GS.oneHeartCustomWorld) {
    var _wc = null;
    try { _wc = JSON.parse(GS.oneHeartCustomWorld); } catch (e) {}
    if (_wc && _wc.title) p += '（' + _wc.title + '）';
  }

  return p;
}