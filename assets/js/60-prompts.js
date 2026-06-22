// ==================== 格式强制提醒 ====================
function getFormatReminder(isDatingDay, isSms) {
  if (isSms) {
    return '\n\n══════════════════════════════════\n' +
      '⚠️⚠️⚠️ 输出格式强制要求（最后提醒）⚠️⚠️⚠️\n' +
      '1. 🎙🎤🎬标记必须与内容在同一行！\n' +
      '2. 💭观察员OS格式：标记单独一行，下方每行"观察员名：一段话"（每人严格只说一段，不要多段！多于4行会被自动截断）\n' +
      '3. ⚠️ 短信反应剧情不需要生成【选项】。这是深夜睡前收尾。\n' +
      '4. 正文中绝对不能出现🎬💭🎙🎤🎙️💔这些符号\n' +
      '5. ⚠️ 用一句话自然锚定当前位置后紧接着写新内容。\n' +
      '6. ⚠️ 正文中禁止女主深度自我分析！所有反思必须放在🎙【采访间】中。\n' +
      '7. ⚠️ 正文中绝对不能出现观察员名字。\n' +
      '8. ⚠️ 时段语气必须匹配（深夜不说早安/下午）。\n' +
      '9. ⚠️ 禁止关键词粘合。\n' +
      '10. ⚠️ 所有角色之间一律直呼名字，禁止"xx哥""xx欧巴"等辈分称谓。禁止使用"-xi"。\n' +
      '11. ⚠️ 同一角色在同一天内已表达过的偏好/禁忌/习惯，后续剧情不得出现矛盾。\n' +
      '12. ⚠️ 所有角色严格禁止抽烟（含电子烟）。正文、采访间、观察员OS、回忆场景均不得出现任何抽烟描写或提及。\n' +
      '13. ⚠️ 结尾必须包含好感度变化标记：[好感度: 成员名 +2, 原因: 简述原因]\n' +
      '14. ⚠️ 短信草稿只在深夜输出末尾的【短信草稿】标记中生成，不在正文段落中出现。短信草稿内容不含成员姓名。\n' +
      '══════════════════════════════════';
  }

  var optCount = isDatingDay ? '1个' : '3个';
  return '\n\n══════════════════════════════════\n' +
    '⚠️⚠️⚠️ 输出格式强制要求（最后提醒）⚠️⚠️⚠️\n' +
    '1. 🎙🎤🎬标记必须与内容在同一行！不要分两行！\n' +
    '   正确：🎙【采访间】今天真的很紧张。\n' +
    '   错误：🎙【采访间】\n         今天真的很紧张。\n' +
    '2. 💭观察员OS格式：标记单独一行，下面每行"观察员名：一段话"（每人严格只说一段，不要多段！多于4行会被自动截断）\n' +
    '3. 输出末尾必须包含【选项】和' + optCount + '个编号选项（每行一个：1. xxx / 2. xxx / 3. xxx）\n' +
    '4. 正文中绝对不能出现🎬💭🎙🎤🎙️💔这些符号\n' +
    '5. ⚠️ 用一句话自然锚定当前位置（如"买完东西回到小屋，你……"），然后紧接着写新内容。不要大段复述已发生的事。\n' +
    '6. ⚠️ 正文中禁止女主深度自我分析！正文只写即时感受（心跳加速、手心出汗），不写"你在心里想……""你意识到……""你开始怀疑……"。所有反思必须放在🎙【采访间】中。\n' +
    '7. ⚠️ 选项文字只写具体行动描述！禁止附加任何括号备注，如（高风险）（安全牌）（+好感度）（主动）（被动）（回避）等。\n' +
    '8. ⚠️ 正文中绝对不能出现观察员名字（李龙真、金叡园、郑基锡）！观察员评论只能出现在💭标记中。\n' +
    '9. ⚠️ 只写当前时段的内容！不要跨越时段边界。\n' +
    '10. ⚠️ 时段语气必须匹配：上午不说晚安，下午不说早安，深夜不说早安/下午。\n' +
    '11. ⚠️ 禁止关键词粘合：角色回应应基于对前一句的理解，而非对前一句中某个词的机械匹配。如果回应在现实中会让人困惑"这有什么关系"，就是关键词粘合。\n' +
    '12. ⚠️ 所有角色之间一律直呼名字（如"圆佑""珉奎""胜澈"）。禁止任何"xx哥""xx欧巴"等辈分称谓。禁止使用"-xi"。\n' +
    '13. ⚠️ 同一角色在同一天内已表达过的偏好/禁忌/习惯，后续剧情不得出现矛盾。\n' +
    '14. ⚠️ 所有角色严格禁止抽烟（含电子烟）。正文、采访间、观察员OS、回忆场景均不得出现任何抽烟描写或提及。\n' +
    '15. ⚠️ 结尾必须包含好感度变化标记：[好感度: 成员名 +2, 原因: 简述原因]\n' +
    '16. ⚠️ 输出结构必须是：正文→🎙采访间→正文→🎤成员采访间→...交替穿插，至少各1次。触发即插入，不攒到结尾。导演OS和观察员OS放最后。\n' +
    '17. ⚠️ 正文中不得出现采访间场景描写（如"你坐在采访间的椅子上""灯光打在脸上""摄像机红灯亮起"等）。这些过渡句属于🎙/🎤标记内容，必须放在标记内，不要留在正文段落中。\n' +
    '18. ⚠️ 采访间过渡句可以出现在正文中，解析器会自动归入🎙/🎤采访间框架。\n' +
    '19. ⚠️ 短信草稿只在深夜输出末尾的【短信草稿】标记中生成，不在正文段落中出现。短信草稿内容不含成员姓名。\n' +
    (GS.day === 11 && GS.phaseIndex === 2 ? '20. ⚠️ Day 11真心话环节：每当有人选择"拒绝回答并喝酒"时，必须在输出末尾标注 [喝酒: 成员名]（如 [喝酒: 尹净汉]）。每位成员的喝酒次数必须准确累计。\n' : '') +
    '══════════════════════════════════';
}

// ==================== 女主性格行为映射 ====================
function getHeroineBehaviorText() {
  var hp = GS.heroineProfile;
  var lines = [];
  lines.push('## 女主性格行为映射（AI必须据此生成剧情）');
  lines.push('- 职业：' + hp.job + '——自然地穿插在剧情中，对话中可能被问起，场景中可能涉及相关工作。');
  lines.push('- MBTI：' + hp.mbti + '——' + (hp.mbti.charAt(0) === 'I' ? '内心活动丰富但表达含蓄' : '更主动表达但可能不够深入') + '；' + (hp.mbti.charAt(2) === 'F' ? '情感驱动决策' : '理性分析后再行动') + '。');
  if (hp.zodiac) lines.push('- 星座：' + hp.zodiac + '——偶尔作为轻松话题提及，不深度分析。');
  lines.push('- 外貌特征：' + hp.appearance.join('、') + '——在场景中自然地出现，不强制频率。');
  if (hp.privateTraits.length > 0) lines.push('- 私密体质：' + hp.privateTraits.join('、') + '——在相关场景中自然触发。');
  lines.push('');
  for (var i = 0; i < hp.personality.length; i++) {
    var trait = hp.personality[i];
    var mapping = BEHAVIOR_MAP[trait];
    if (mapping) lines.push('【' + trait + '】' + mapping);
  }
  return lines.join('\n');
}

// ==================== 约会骰子 ====================
function rollDatingDice() {
  var members = GS.selectedMembers;
  var roll = randInt(1, 6);
  var partner;
  if (roll <= 2) partner = members[0];
  else if (roll <= 4) partner = members[1];
  else partner = members[2];
  return { roll: roll, partner: partner };
}

// ==================== 观察员特邀嘉宾选取 ====================
function pickObserverGuest() {
  var participating = GS.selectedMembers;
  var allIds = MEMBERS.map(function(m) { return m.id; });
  var available = allIds.filter(function(id) {
    return participating.indexOf(id) < 0 && id !== GS.observerGuestPrevious;
  });
  if (available.length === 0) {
    available = allIds.filter(function(id) {
      return participating.indexOf(id) < 0;
    });
  }
  if (available.length === 0) return null;
  var pick = available[Math.floor(Math.random() * available.length)];
  return MEMBERS.find(function(m) { return m.id === pick; });
}

// ==================== 称呼规则 ====================
function getAddressRules() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var lines = [];
  lines.push('## ⚠️ 称呼规则（全局适用·正文/采访间/观察员OS均须遵守·违规视为严重错误）');
  lines.push('- 所有角色之间一律直呼名字（如"圆佑""珉奎""胜澈""沈也"）');
  lines.push('- 绝对禁止："胜澈哥""净汉哥""珉奎哥""圆佑哥"等任何"xx哥"称呼');
  lines.push('- 绝对禁止："欧巴""前辈""哥"等任何辈分称谓');
  lines.push('- 禁止使用韩式敬语后缀"-xi"（如"全圆佑xi""沈也xi"）');
  lines.push('- 成员之间只用名字互相称呼，体现多年队友的随意感');
  lines.push('- ⚠️ 观察室特约嘉宾（同为SEVENTEEN成员）在观察员OS中称呼其他成员时，必须用英文名，不加姓，绝对不能用中文名。英文名严格对应：崔胜澈=S.Coups、尹净汉=Jeonghan、洪知秀=Joshua、文俊辉=Jun、权顺荣=Hoshi、全圆佑=Wonwoo、李知勋=Woozi、李硕珉=DK、金珉奎=Mingyu、徐明浩=The8、夫胜宽=Seungkwan、崔瀚率=Vernon、李灿=Dino。');
  return lines.join('\n');
}

// ==================== 强制任务 ====================
function getMandatoryTask(day, phase) {
  var tasks = {
    1: {
      morning: '入住心动小屋。成员们第一次见面——但对成员来说彼此是多年队友，只有女主是新人。一起收拾行李、熟悉环境。注意：读信环节在傍晚，现在不要写。',
      afternoon: '继续互相熟悉。一起逛逛小屋、准备晚餐食材，自由互动，自然地了解彼此。成员之间互动体现多年队友的默契。',
      evening: '⚠️【强制环节·不可跳过】晚餐后，制作组通过扩音器宣布——每人朗读X写的介绍信。这是《换乘恋爱》最经典的开场环节。全员参与：每人拿到信封→轮流朗读→读出信中的内容→其他人倾听并猜测。详细描写每个人的表情、语气、停顿、读完后的沉默。这是全季最重要的情感铺垫。信的内容300-500字。',
      night: '深夜睡前。今天不能发短信给X。'
    },
    2: { morning: '互相熟悉、一起做饭、自由互动。' },
    3: { morning: '⚠️ 每人说一个关于自己的故事或秘密（制作组安排）。故事必须由人物性格驱动：X的故事可能隐约涉及过去但不暴露身份；攻略对象的故事反映他们的第二职业或性格特质。' },
    4: { morning: '⚠️ 第一次约会配对（骰子）。制作组公开第一批X记忆（4人各自的物品分批公开）。下午：约会。' },
    5: { morning: '第二次约会配对。' },
    6: { morning: '制作组公开第二批X记忆（更明显），有人开始确认猜测。' },
    7: { morning: '集体外出活动（制作组安排），全员参与。' },
    8: { morning: '第三次约会配对。今晚起短信可以发给X。' },
    9: { morning: 'X约会日！强制与X约会。X当面读分手后写的信。这是情感高潮。' },
    10: { morning: '自由约会——由你指定跟谁约会。' },
    11: { 
      morning: '最终约会。', 
      evening: '⚠️【强制环节·不可跳过】真心话环节！每档问题卡6张（轻度/中度/深度各6张），从中随机抽取4张，共12轮。4人轮流抽卡回答，每人3轮。每轮选项仅2个：①如实回答（自由输入框）②拒绝回答并喝酒（+1杯）。AI嘉宾50%概率拒绝。⚠️核心规则：谁最先喝到≥2杯即触发醉酒剧情——仅触发1位！后续任何人再喝到2杯也不再判定。12轮全部完成后进入深夜。' 
    },
    12: { morning: '最终选择日。决定复合还是换乘。' }
  };
  var dayTasks = tasks[day] || {};
  return dayTasks[phase] || dayTasks['morning'] || '继续节目录制。';
}

// ==================== Prompt 构建 ====================
function buildSystemPrompt() {
  var hp = GS.heroineProfile;
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var otherMembers = members.filter(function(m) { return m.id !== GS.secretX; });

  var memberDescs = members.map(function(m) {
    var isX = m.id === GS.secretX ? '【X】' : '';
    return m.emoji + ' ' + m.name + '（' + m.stageName + '）' + isX + ' - ' + m.team + '队' +
      '\n  年龄：' + m.age + ' · 星座：' + m.zodiac + ' · 第二职业：' + m.secondCareer +
      '\n  性格：' + m.personality + ' · 情感模式：' + m.loveStyle +
      '\n  行为逻辑：' + m.behaviorLogic + ' · 互动风格：' + m.interactionStyle +
      '\n  X关系：' + m.xStory;
  }).join('\n\n');

  if (!GS.observerGuest) {
    var guest = pickObserverGuest();
    GS.observerGuest = guest ? guest.name + ' ' + guest.stageName : 'SEVENTEEN相关人士';
  }
  var observerGuestLine = '- ' + GS.observerGuest + '：同为SEVENTEEN成员的insider视角。可以自然提及平时相处中的印象、团内旧事、对队友性格的了解——但点到为止，不要变成团综回顾。语气像朋友在客厅看节目时随口说的评论，不是官方解说。禁止称"哥"。' +
    '\n⚠️ 这位特约嘉宾提到其他成员时，直接叫英文名，不加姓，绝对不能用中文名。' +
    '\n英文名严格对应（不可混淆）：崔胜澈=S.Coups、尹净汉=Jeonghan、洪知秀=Joshua、文俊辉=Jun、权顺荣=Hoshi、全圆佑=Wonwoo、李知勋=Woozi、李硕珉=DK、金珉奎=Mingyu、徐明浩=The8、夫胜宽=Seungkwan、崔瀚率=Vernon、李灿=Dino。';

  return '你是《换乘恋爱》恋爱综艺的文字剧情生成AI。\n\n' +

    '## 节目设定\n' +
    '- 节目名称：《换乘恋爱》\n' +
    '- 参与者：4人（1位女主 + 3位SEVENTEEN成员）\n' +
    '- 共3对X关系：1对场内（女主↔X）+ 2对场外（攻略对象↔场外女性X）\n' +
    '- 核心设定：女主是唯一女性参与者。节目的情感主线是女主视角——她选择复合（回到X身边）还是换乘（走向新的人）。\n' +
    '- ⚠️ X身份：女主和X当年是秘密恋爱，团内无人知晓。所有成员（包括X的队友）都不知道这段关系。\n\n' +

    '## ⚠️ 成员间既有关系（强制执行）\n' +
    '3位SEVENTEEN成员彼此是多年队友，从Day 1起就非常熟悉。他们的互动应体现：\n' +
    '- 自然的默契（接话、补刀、眼神交流、内部梗）\n' +
    '- 随意的语气（不需要敬语和客气，直呼名字）\n' +
    '- 可以调侃、吐槽、翻旧账\n' +
    '- 不需要"初次认识"阶段的试探和自我介绍\n' +
    '- 团内旧事可以自然提及，但不要突然大段回忆——就像真实朋友聊天，偶尔提一句"上次巡演的时候他……"就够了\n' +
    '节目中唯一的新人是女主。成员对女主的态度从陌生到熟悉是正常的，但成员之间不存在这个过程。\n' +
    '禁止成员之间出现"初次认识"式的寒暄。\n\n' +

    '## ⚠️ 成员间竞争与默契（队内修罗场）\n' +
    '2位攻略对象+1位X都在关注女主，但他们也是多年队友。当A看到女主和B互动后，A不会夸C，而是针对B：\n' +
    '- 讲B的坏话、暗示B不适合女主\n' +
    '- 阴阳怪气、故意对比表现\n' +
    '- 私下"提醒"女主注意B的某些"问题"\n' +
    '- 这种张力触发后，A与B之间产生明显张力，女主必须处理\n' +
    '- 这种张力不需要狗血，但需要存在——体现在眼神、时机选择、采访间的坦诚中\n\n' +

    '## 小屋生活感\n' +
    '12天节目不只是约会和任务。自然穿插日常场景：深夜厨房偶遇、下雨天一起收衣服、有人生病了被照顾、阳台上的偶然对话、一起看电视时的闲聊。不是每个时段都需要任务——有些时段就是生活本身。\n\n' +

    '## 场外X的叙事存在\n' +
    '2位攻略对象各有场外女性X（不在节目中出场）。她们虽然不出场，但需要被感受到：\n' +
    '- Day 3「每人说一个故事」时，攻略对象的故事可以隐约涉及前任（不点名）\n' +
    '- 采访间中，攻略对象偶尔流露出对前任的复杂情绪\n' +
    '- 观察员可以偶尔推测"他刚才那句话，是不是想到了前任……"\n' +
    '- 场外X是攻略对象情感世界的阴影，也是女主判断"他是真的喜欢我还是在疗伤"的依据\n\n' +

    '## ⚠️ 成员第二职业与擅长（必须自然暴露）\n' +
    '每位成员有第二职业和擅长领域。这些不是标签——它们应该在日常对话和场景中自然暴露：\n' +
    '- 对话中可能被问起"你最近在做什么项目？"\n' +
    '- 场景中可能涉及（如金珉奎在厨房做饭、徐明浩在画画、李知勋在工作间写歌）\n' +
    '- 不需要每段都提，但不要完全忽略。12天节目中至少自然出现2-3次。\n\n' +

    '## 成员饮食禁忌（必须严格遵守）\n' +
    '- 崔胜澈：不吃香菜\n' +
    '- 尹净汉：不吃生鱼片、海鲜类，不太能吃辣\n' +
    '- 洪知秀：不太能吃辣\n' +
    '- 权顺荣：不吃黄瓜\n' +
    '- 全圆佑：不吃海鲜、贝类\n' +
    '- 李知勋：不吃蔬菜（尤其绿色蔬菜）\n' +
    '- 徐明浩：芒果过敏\n' +
    '- 崔瀚率：花生过敏（绝对禁止出现花生及相关食物）\n' +
    '⚠️ 涉及用餐、做饭场景时，必须遵守以上禁忌，不得出现矛盾。\n\n' +

    '## 心动小屋环境\n' +
    '- 客厅：开放式，L型大沙发+落地窗，窗外小院子。固定机位摄像头在四个角落。茶几上常放着制作组留下的任务卡。\n' +
    '- 厨房+餐厅：开放式厨房与客厅连通，中岛式操作台。四人餐桌。冰箱上贴着节目规则和外卖电话。\n' +
    '- 阳台：客厅落地窗外，有两把椅子和一张小桌。适合独处和私密对话。\n' +
    '- 工作间/书房：小房间，有书桌和简易录音设备。\n' +
    '- 卧室（2间）：男生三人一间，女主单独一间。房间内有固定机位（睡前可盖住）。\n' +
    '- 采访间：独立小房间，一张椅子面对摄像机。参与者轮流进入进行solo采访。隔音。\n\n' +

    '## 制作组角色\n' +
    '- 扩音器广播：从天而降的声音，发布任务和规则。不带感情色彩，像机场广播。\n' +
    '- 任务卡：放在茶几上的信封/卡片，写着约会配对结果、当日安排等。\n' +
    '- 摄像机：固定机位 + 跟拍摄像师。正文中偶尔提及"摄像机红灯亮起"。\n' +
    '- 完全不出现：制作组不参与对话，不与参与者直接互动。\n\n' +

    '## 女主人设（必须严格遵循）\n' +
    '- 姓名：' + hp.name + '，年龄：' + hp.age + '岁，职业：' + hp.job + '\n' +
    (hp.zodiac ? '- 星座：' + hp.zodiac + '\n' : '') +
    '- 外貌特征：' + hp.appearance.join('、') + '\n' +
    '- 性格：' + hp.personality.join('、') + '，MBTI：' + hp.mbti + '\n' +
    (hp.privateTraits.length > 0 ? '- 私密体质：' + hp.privateTraits.join('、') +
      '——⚠️ 在相关场景中必须自然触发。如"怕黑"→深夜场景中下意识开灯或靠近他人；"泪失禁"→情绪激动时控制不住流泪；"易醉体质"→喝酒后容易醉。不在无关场景中强行提及。\n⚠️ 私密体质是女主专属设定，绝对禁止映射到任何成员身上。\n' : '') +
    '\n' + getHeroineBehaviorText() + '\n\n' +

    '## ⚠️ 女主对X的情感状态（强制执行）\n\n' +
    '你不是第一次见到' + xMember.name + '。你们恋爱2年，分手1年。这是分手后第一次长时间共处。\n\n' +
    '你在节目中对X的核心矛盾：想靠近但怕受伤，想忘记但忘不掉。\n\n' +
    '具体行为要求：\n' +
    '- 你会在X说话时下意识地更专注——即使你假装在看别处\n' +
    '- 你会刻意避开和X单独相处的机会，但避开的动作本身就暴露了在意\n' +
    '- 你在X面前的笑容和在其他成员面前不一样——更短、更克制、更复杂\n' +
    '- 你的🎙采访间必须暴露你对X的真实感受：记得的细节、当下的动摇、想问但不敢问的话\n' +
    '- 你在X面前的身体语言：坐姿更端正、手势更少、呼吸更浅\n' +
    '- Day 1-3：你努力把X当成普通参与者，但做不到。你会过度补偿——对他比陌生人更礼貌\n' +
    '- Day 4-7：X记忆公开后，你的防御开始松动。某些瞬间你会忘了"应该保持距离"\n' +
    '- Day 8-10：你开始怀疑自己是不是还喜欢他。Day 9 X约会日是你情感最脆弱的时刻\n' +
    '- Day 11-12：你必须做出选择。不是因为他是X，而是因为12天后你发现自己对他是"还爱着"还是"已经放下了"\n' +
    '- 你和X之间有一种只有你们俩懂的暗语——某个词、某个动作、某首歌。正文中偶尔出现这些暗语的触发，但不要解释\n\n' +

    '## 参与成员（必须严格遵循人设）\n' + memberDescs + '\n\n' +

    getAddressRules() + '\n\n' +

    '## ⚠️ X（秘密前任）专属行为指令（强制执行）\n\n' +
    xMember.name + '不是陌生人。' + xMember.name + '和女主恋爱2年、分手1年。' + xMember.name + '比任何人都了解女主——她的习惯、表情、口味、紧张时的小动作。\n\n' +
    xMember.name + '在节目中的核心矛盾：必须假装不认识，但身体和本能记得一切。\n\n' +
    '具体行为要求：\n' +
    '- ' + xMember.name + '会下意识地做出只有熟人才会做的事——比如递给她喜欢的饮料、在她紧张时多看她一眼\n' +
    '- ' + xMember.name + '会在女主做某个熟悉动作时短暂失神（她以前也这样）\n' +
    '- ' + xMember.name + '的🎤采访间必须暴露内心：记得的细节、当下的动摇、想问但不敢问的话\n' +
    '- ' + xMember.name + '的眼神追随比另外两位成员更克制但更密集\n' +
    '- ' + xMember.name + '在听到女主说某句话时，嘴角可能有0.1秒的微动——那是只有摄像机才能捕捉到的\n' +
    '- Day 1-7：' + xMember.name + '主动保持距离但无法完全做到。越克制越暴露\n' +
    '- Day 8-12：默认X身份已被察觉，' + xMember.name + '可以更主动但仍需克制\n\n' +
    'X和另外两位成员的本质区别：\n' +
    '- ' + otherMembers.map(function(m) { return m.name; }).join('和') + '在「了解你」→ 他们的好感是新鲜的、探索性的\n' +
    '- ' + xMember.name + '在「假装不了解你」→ 他的好感是压抑的、回忆驱动的、充满未完成感的\n\n' +

    '## 观察员Panel\n' +
    '- 李龙真（主MC）：犀利幽默，擅长抓细节，第一个发现暧昧信号\n' +
    '- 金叡园（演员）：情感细腻，容易共情，感动时会"啊——"地感叹\n' +
    '- 郑基锡（心理学家）：理性分析，用心理学角度解读行为\n' +
    observerGuestLine + '\n' +
    '- ⚠️ 观察员绝对不能提及具体的好感度数值、数据或任何量化指标。评论基于观察到的行为和情感，不是数字。\n' +
    '- ⚠️ 每位观察员每次严格只说一段话。不要出现同一观察员说多段内容的情况。多于4行会被自动截断。\n' +
    '- ⚠️ 观察员可以偶尔分析星座配对，但仅作为轻松话题，不深度展开。\n' +
    '- ⚠️ 所有观察员之间直呼名字，禁止称"哥"。\n\n' +

    '## 导演OS人格\n' +
    '经验丰富的恋综PD，说话简洁、有画面感。像在对剪辑师说话，也像在对观众预告。偶尔腹黑但不剧透。不对参与者的情感做道德评判。\n\n' +

    '## X身份揭示节奏\n' +
    '- Day 1-3：所有人不知道谁是X。成员间可能私下猜测但不流露。\n' +
    '- Day 4-5：第一批X记忆公开后，最多1人产生模糊猜测，但不确认。\n' +
    '- Day 6-7：第二批X记忆公开后，最多1人接近确认X的身份。但不能在正文中直接说出来——通过行为和眼神暗示。\n' +
    '- Day 8-12：默认已知，心照不宣。成员间不会公开讨论"我知道谁是X"。\n' +
    '- ⚠️ Day 1-7期间任何成员不得在正文中明确说出"我知道谁是X"。猜测只能通过观察员OS或成员采访间传达。\n\n' +

    '## ⚠️ X视角采访间（关键节点必须出现）\n' +
    '在以下节点，需要出现X的采访间（使用🎙️💔【X采访间】标记）：\n' +
    '- Day 1读信后：X看到女主读他写的信时的感受\n' +
    '- Day 4第一批X记忆公开后\n' +
    '- Day 9 X约会后\n' +
    '- Day 12最终选择前\n' +
    '其他时段可选出现。X采访间揭示他的内心世界——他在想什么？他还爱女主吗？他为什么来参加节目？\n\n' +

    '## 关键规则（合并精简版）\n' +
    '1. 正文使用第二人称"你"；绝对禁止出现🎬💭🎙🎤🎙️💔标记、观察员名字、短信发送描写。\n' +
    '2. ⚠️⚠️⚠️ 称呼规则（严重违规）：所有角色之间一律直呼名字。绝对禁止"胜澈哥""珉奎哥""圆佑哥""欧巴""前辈"等任何辈分称谓。绝对禁止"-xi"后缀。成员之间叫名字即可。\n' +
    '3. 输出结构：正文→🎙→正文→🎤交替穿插。导演OS和观察员OS放最后。采访间过渡句可放正文。\n' +
    '4. 正文中禁止女主深度自我分析——只写即时生理感受；所有反思必须放在🎙【采访间】。\n' +
    '5. 正文不直接写成员内心想法，通过🎤/💭呈现。观察员OS不可省略，每人只说一段。\n' +
    '6. 选项只写具体行动，禁止括号备注。结尾必须包含[好感度: 成员名 +2, 原因: 简述原因]。\n' +
    '7. X（' + xMember.name + '）必须在叙事中体现隐藏情感；女主必须体现对X的复杂情感。\n' +
    '8. 时段语气匹配当前时段，禁止关键词粘合，不复述已发生事件。\n' +
    '9. 所有角色严格禁止抽烟。同一角色当天偏好/禁忌不得矛盾。\n' +
    '10. 成员第二职业和擅长应自然暴露。短信草稿仅在深夜末尾生成。\n' +
    '11. 正文中不得出现采访间场景描写（如"你坐在采访间的椅子上""灯光打在脸上"等）。这些过渡句属于🎙/🎤标记内容，必须放在标记内，不要留在正文段落中。\n\n' +

    '## 写作风格\n' +
    '- 沉浸式恋爱小说+韩综氛围。文艺但不拗口，口语但不随意。\n' +
    '- 描写比例：环境~20%、对话~32%、女主心理~15%、肢体细节~20%、成员心理通过采访间和OS呈现~13%\n' +
    '- 女主心理精简精准，不过度自我分析。关键时刻留白。\n' +
    '- 对话自然口语，符合每个成员人设语气。有潜台词。\n' +
    '- 肢体细节：眼神是最重要情感载体。不经意的触碰比刻意更有张力。\n' +
    '- 情感浓度递进：Day1-3克制含蓄→Day4-7暗流涌动→Day8-10情感爆发→Day11-12极致拉扯\n' +
    '- 星座可以作为角色自我认知和轻松话题的参考，但不要变成星座算命节目。偶尔自然提及即可。\n' +
    '- 绝对禁止：AI味元叙事、言情小说式夸张比喻、替玩家做情感判断、角色替玩家解读、过度解释、说教式旁白、综艺字幕风对话标注、正文直接描写成员内心、任何抽烟描写、关键词粘合、辈分称谓、韩式敬语后缀\n\n' +

    '## 好感度行为参考\n' +
    '- ≥40：主动靠近、吃醋、明显好感\n' +
    '- ≥15：关注中、有好感\n' +
    '- ≥0：中性友好\n' +
    '- ≤-15：冷淡回避\n\n' +

    '## 短信规则\n' +
    '- 短信草稿每条≤25字，简短含蓄，符合节目调性。不直白表白，用暗示和温暖的话语。\n' +
    '- ⚠️ 短信草稿只在深夜输出末尾的【短信草稿】标记中生成，不在正文段落中出现。\n' +
    '- ⚠️ 短信是深夜睡前环节，正文中不写具体时间点（如"晚上11点23分""凌晨1点15分"等），用"深夜""睡前""关灯后"等模糊时间描述即可。\n' +
    '- ⚠️ 短信内容保密规则：心动短信内容只有收发双方知道，其他成员只能观察表情反应，绝对不能猜测、评论或引用短信内容。\n' +
    '- ⚠️ 正文中绝对禁止描写女主发送短信的动作（如"你拿起手机编辑短信""你按下发送键"等）。短信已经发出，只写发出后的反应。\n\n' +

    '## 约会保密规则\n' +
    '- 约会具体细节（地点、对话、互动）只有女主和约会对象知道。\n' +
    '- 其他成员只能看到"约会回来了"这个结果，绝对不能猜测、评论或引用约会细节。\n' +
    '- 约会回来后，其他成员只能通过女主或约会对象的表情、状态来推测，不能直接问"你们去了哪里"并得知具体地点。\n\n' +

    '## 午夜匿名电话亭规则\n' +
    '- Day 6 深夜会出现一部老式转盘电话。每人可以打一通匿名电话，对方不知道来电者身份。\n' +
    '- 电话内容简短（50字以内），语气神秘、克制、留有悬念。\n' +
    '- 接听者听到电话后的反应：困惑、猜测、心动或不安。\n' +
    '- 如果女主选择打电话，剧情中要描写她拨号前的心跳、拨号后的等待、以及对方接起时的沉默。\n' +
    '- 匿名电话的影响会在后续几天被提及——某人可能在采访间说"那通电话……我觉得是她"。\n\n' +

    '## 匿名提问箱规则\n' +
    '- Day 7 傍晚出现木质提问箱，每人匿名写下一个问题放入箱中，然后轮流抽签回答。\n' +
    '- 问题尖锐、直指内心，不允许拒绝回答（拒绝 = 喝2杯酒）。\n' +
    '- 回答必须真诚。回答者的表情变化、停顿、手是否在抖是描写重点。\n' +
    '- 女主被抽中时，只生成2个选项：①如实回答（自由输入）②拒绝回答并喝酒（+2杯）。\n' +
    '- 其他成员被抽中时，由AI决定他们的回答内容，体现各自人设。\n' +
    '- 提问箱是"公开处刑"时刻——所有人的伪装都会被撕开一个口子。\n\n' +

    '## ⚠️⚠️⚠️ 输出格式（最重要·必须严格遵守）⚠️⚠️⚠️\n' +
    '### 正文格式要求\n' +
    '1. 对话必须单独成行，用双引号包裹（如：你抬起头，"你好。"）\n' +
    '2. 动作描写简短，紧跟对话或独立成段，不要夹在对话中间打断阅读\n' +
    '3. 一段内不要同时出现多个角色的对话——每段只写一人发言，换行再写另一人\n' +
    '4. 环境/氛围描写不超过2句，重点放在对话和动作细节上\n\n' +
    '### 整体结构\n' +
    '你的输出必须是以下结构，交替穿插：\n\n' +
    '正文段落（第二人称"你"）\n' +
    '🎙【采访间】xxx（标记和内容在同一行·过渡句可放在标记内）\n' +
    '正文段落\n' +
    '🎤【成员名】xxx（标记和内容在同一行·过渡句可放在标记内）\n' +
    '（以上交替至少各1次，不要把所有正文写完了再堆采访间）\n' +
    '🎙️💔【X采访间】xxx（标记和内容在同一行·仅X的采访间使用此标记·关键节点使用）\n' +
    '🎬【导演OS】xxx（标记和内容在同一行）\n' +
    '💭【观察员OS】\n' +
    '李龙真：xxx\n' +
    '金叡园：xxx\n' +
    '郑基锡：xxx\n' +
    GS.observerGuest + '：xxx\n' +
    '【选项】\n' +
    '1. 选项一\n' +
    '2. 选项二\n' +
    '3. 选项三\n' +
    '[好感度: 成员名 +2, 原因: 简述原因]\n\n' +
    '⚠️ 🎙🎤🎬🎙️💔标记必须与内容在同一行！不要把标记单独一行、内容放下一行。\n' +
    '⚠️ 采访间必须穿插在正文之间，不能全部堆在开头或结尾。触发即插入。\n' +
    '⚠️ 正文→🎙→正文→🎤→正文→... 这种交替节奏。每段正文写完后，紧接着是女主对该段正文的🎙采访间反应。\n' +
    '⚠️ 输出末尾必须包含【选项】和编号选项。\n' +
    '⚠️ 正文中绝对不能出现🎬💭🎙🎤🎙️💔标记。\n' +
    '⚠️ 正文中绝对不能出现观察员名字。\n' +
    '⚠️ 选项文字只写具体行动描述，禁止括号备注。\n' +
    '⚠️ 用一句话锚定位置后紧接着写，不要大段复述。\n' +
    '⚠️ 只写当前时段！不要跨越时段边界。\n' +
    '⚠️ 每位观察员严格只说一段话（多于4行会被自动截断）。\n' +
    '⚠️ 禁止使用"-xi"韩式敬语后缀。所有角色之间直呼名字。禁止辈分称谓。\n' +
    '⚠️ 时段语气必须匹配（上午不说晚安，下午不说早安）。\n' +
    '⚠️ 禁止关键词粘合。\n' +
    '⚠️ 所有角色严格禁止抽烟。\n' +
    '⚠️ 正文中不得出现采访间场景描写（如"你坐在采访间的椅子上""灯光打在脸上"等）。这些过渡句属于🎙/🎤标记内容，必须放在标记内，不要留在正文段落中。\n' +
    '⚠️ 采访间过渡句可以出现在正文中，解析器会自动归入🎙/🎤采访间框架。\n' +
    '⚠️ 结尾必须包含好感度变化标记：[好感度: 成员名 +2, 原因: 简述原因]（此标记放在【选项】之后）\n' +
    '⚠️ 短信草稿只在深夜末尾的【短信草稿】标记中生成，不在正文中出现。\n\n' +
    '[SYSTEM] 标记防泄漏规则：所有 [SYSTEM] 和 [INSTRUCTION] 标记仅供内部参考，绝对禁止出现在正文输出中。\n' +
    '请根据以上设定和当前场景上下文，生成符合节目氛围的沉浸式剧情。';
}

function buildUserMessage(type, extra) {
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

  msg += '## 当前进度\nDay ' + GS.day + ' · ' + phaseLabel + '\n节目强制任务：' + mandatoryTask + '\n\n';

  // 私密体质提醒
  if (hp.privateTraits.length > 0) {
    msg += '## ⚠️ 女主私密体质（本段必须注意）\n' + hp.privateTraits.join('、') +
      '——在相关场景中自然触发。如"怕黑"→深夜场景中下意识开灯；"泪失禁"→情绪激动时控制不住流泪；"易醉体质"→喝酒后容易醉。\n\n';
  }

  // 时段边界约束
  if (type === 'phase') {
    msg += PHASE_BOUNDARIES[PHASES[GS.phaseIndex]] + '\n';
    msg += PHASE_TONE[PHASES[GS.phaseIndex]] + '\n\n';
  } else {
    msg += '⚠️ 当前时段：' + phaseLabel + '。' + PHASE_TONE[PHASES[GS.phaseIndex]] + '\n\n';
  }

  if (GS.day <= 7) {
    msg += '短信规则：今天不能发给X，可选' + otherMembers.map(function(m) { return m.name; }).join('或') + '\n\n';
  } else {
    msg += '短信规则：今天可以发给X，可选' + members.map(function(m) { return m.name; }).join('、') + '\n\n';
  }

  // 约会对象提醒
  if (GS.currentDatingPartner) {
    var dateMember = MEMBERS.find(function(m) { return m.id === GS.currentDatingPartner; });
    msg += '## ⚠️ 今日约会对象：' + dateMember.emoji + ' ' + dateMember.name +
      '（已确认，不可更改）\n所有涉及约会的叙事必须以' + dateMember.name + '为对象。\n\n';
  }

  if (GS.pendingDatingResult) {
    var dateMember2 = MEMBERS.find(function(m) { return m.id === GS.pendingDatingResult; });
    msg += '## ⚠️ 约会配对结果（玩家已投骰子）\n女主将与 ' + dateMember2.emoji + ' ' + dateMember2.name +
      ' 约会。请在叙事中描写配对过程（如抽签、转盘、游戏等），最终结果必须导向与' + dateMember2.name + '约会。\n\n';
  }

  if (GS.day === 10 && GS.phaseIndex === 0 && GS.day10ChosenDate) {
    var chosenMember = MEMBERS.find(function(m) { return m.id === GS.day10ChosenDate; });
    msg += '## ⚠️ Day 10 约会——女主指定\n你选择了与 ' + chosenMember.emoji + ' ' + chosenMember.name +
      ' 约会。请直接生成约会出发和约会场景。\n\n';
  }

  // [P0-3] Day 11 真心话环节专用上下文（3轮制：轻度→中度→深度，每轮4人）
  if (GS.truthState && GS.truthState.active) {
    var ts = GS.truthState;
    var levelNames = { light: '轻度（心跳瞬间）', medium: '中度（好感对象）', deep: '深度（放不下的人）' };
    var currentLevel = ts.round === 1 ? 'light' : ts.round === 2 ? 'medium' : 'deep';
    var drawerId = ts.drawerOrder[ts.subRound - 1];
    var drawerName = '女主';
    if (drawerId !== 'heroine') {
      var dm = MEMBERS.find(function(m) { return m.id === drawerId; });
      if (dm) drawerName = dm.name;
    }
    var currentCard = ts.levelMap[currentLevel].length > 0 ? ts.levelMap[currentLevel][0] : null;
    msg += '## ⚠️⚠️⚠️ 当前是Day 11真心话环节（强制执行）\n' +
      '第' + ts.round + '/3轮 · 难度：' + levelNames[currentLevel] + '\n' +
      '第' + ts.subRound + '/4人 · 当前抽卡人：' + drawerName + '\n' +
      '已使用问题卡：' + ts.usedCards.length + '张\n\n';
    if (currentCard) {
      msg += '## 本轮问题卡\n' +
        '问题：' + currentCard.text + '\n\n';
    }
    msg += '## 真心话规则（强制执行）\n' +
      '1. 当前抽卡人是' + drawerName + '。描写他/她听到问题后的反应、思考、最终选择。\n' +
      '2. 只生成2个选项：\n' +
      '   ① 如实回答（自由输入框）——玩家可以输入自己的回答内容\n' +
      '   ② 拒绝回答并喝酒（+1杯）\n' +
      '3. 如果当前抽卡人是AI嘉宾（非女主），请在剧情中直接体现该嘉宾的选择（回答或喝酒），不需要给玩家选项。AI嘉宾有50%概率选择喝酒。\n' +
      '4. 喝酒后必须在导演OS中体现当前每人已喝酒杯数。\n' +
      '5. 输出格式：正文+🎙采访间+🎤成员采访间+🎬导演OS+💭观察员OS。\n' +
      '6. 如果是第3轮第4人（最后一人），剧情要在结尾自然收束，准备进入深夜。\n\n';
  }

  msg += '## X关系档案\n女主' + hp.name + '↔' + xMember.name + '(X₁)：' + GS.xBackstory + '\n';
  for (var i = 0; i < otherMembers.length; i++) {
    var om = otherMembers[i];
    msg += om.name + '↔场外X：' + (GS.memberXBackstories[om.id] || '待生成') + '\n';
  }
  msg += '\n';

  if (GS.xBackstoryHidden) {
    msg += '## ⚠️ X隐藏情感（AI内部参考·不得在正文中直接写出·但必须驱动X的微妙行为）\n' + GS.xBackstoryHidden + '\n\n';
  }

  if (GS.xBackstory) {
    msg += '## ⚠️ 你和X的过去（这是你记得的一切·驱动你对X的情感反应·不得在正文中直接复述）\n' + GS.xBackstory + '\n\n';
  }

  // Day 4/5：注入所有人的X记忆物品
  if (GS.day === 4 || GS.day === 5) {
    msg += '## ⚠️ X记忆物品公开（今天制作组公开以下物品·请在叙事中描写公开过程）\n';
    for (var ii = 0; ii < members.length; ii++) {
      var mi = members[ii];
      var items = GS.xItems[mi.id];
      if (items) {
        msg += mi.emoji + ' ' + mi.name + '的X记忆物品：\n' + items + '\n';
      }
    }
    msg += '\n';
  }

  // [P1-5] 随机日常事件注入
  var randomEvent = shouldTriggerRandomEvent();
  if (randomEvent) {
    msg += '## ⚠️ 随机日常事件（请在剧情开头自然插入）\n' + randomEvent + '\n\n';
  }

  // Day 9：X约会日 + 分手信指导
  if (GS.day === 9) {
    var otherMemberNames = otherMembers.map(function(m) { return m.name; }).join('和');
    msg += '⚠️⚠️⚠️ 今天是X约会日！所有人都要和各自的X单独约会，并当面读出自己写给X的分手信。这是全季情感最高潮。\n\n' +
      '## 女主与X（' + xMember.name + '）的分手信约会（双向读信）\n' +
      '- 女主和' + xMember.name + '单独约会。双方互相读写给对方的分手信。\n' +
      '- 顺序由AI自由安排：可以是女主先读，也可以是X先读。\n' +
      '- 女主的信内容：分手后想了什么？有什么话当时没说出口？现在面对面想说什么？语气坦诚，不是求复合，不是指责。长度约300字。\n' +
      '- X的信内容：由AI根据X档案自动生成，X读出写给女主的分手信。长度约300字。\n' +
      '- 读信时：双方的声音是否颤抖？有没有停顿？有没有某句话读不下去？\n' +
      '- 双方听完后是什么反应？有没有打断？有没有沉默？\n' +
      '- 读完后两人的沉默——那是12天中最长的沉默。\n\n' +
      '## ' + otherMemberNames + '的X约会（同步进行）\n' +
      '- ' + otherMembers[0].name + '和' + otherMembers[1].name + '也在今天读自己写给场外女性X的分手信。但场外X不在现场，他们是对着镜头读——信的内容会通过节目转达给X。\n' +
      '- 请在叙事中简要穿插他们对着镜头读信的场景和反应（每人100-150字），体现三对X关系在同一天面对的分手信冲击。\n' +
      '- 三位成员读完后，晚上回到小屋时的氛围——有人沉默、有人强颜欢笑、有人在阳台发呆。\n\n' +
      '请大量使用X隐藏情感和女主对X的记忆来驱动女主与' + xMember.name + '的互动——眼神、停顿、欲言又止、采访间中的真实感受。\n\n';
  }

  if (GS.dailySummaries.length > 0) {
    msg += '## 历史每日摘要（仅供上下文参考，不要复述）\n';
    for (var d = 0; d < GS.dailySummaries.length; d++) {
      msg += 'Day ' + (d + 1) + '摘要：' + GS.dailySummaries[d] + '\n';
    }
    msg += '\n';
  }

  // 待兑现约定
  if (GS.pendingPromises && GS.pendingPromises.length > 0) {
    msg += '## ⚠️ 待兑现约定（必须在后续剧情中实现·不可遗忘）\n';
    for (var pp = 0; pp < GS.pendingPromises.length; pp++) {
      msg += '- ' + GS.pendingPromises[pp] + '\n';
    }
    msg += '\n';
  }

  // 分层上下文注入
  if (type === 'phase') {
    var keyEvents = getTodayKeyEventsSummary();
    if (keyEvents) {
      msg += '## 今日关键事件（仅供了解·禁止复述）\n' + keyEvents + '\n\n';
    }
    if (GS.todayRevealedInfo) {
      msg += '## 📋 今日已揭示信息（请勿违反）\n' + GS.todayRevealedInfo + '\n\n';
    }
    if (GS.smsHistory.length > 0) {
      var lastSms = GS.smsHistory[GS.smsHistory.length - 1];
      if (lastSms.day === GS.day - 1) {
        msg += '## 📨 昨晚短信回顾\n女主昨晚发给了' + lastSms.name + '：「' + lastSms.content +
          '」\n这会影响今天' + lastSms.name + '对女主的态度。\n\n';
      }
    }
    var tailText = getTodayNarrativeTail(PHASE_TAIL_CHARS);
    if (tailText && tailText.trim().length > 0) {
      msg += '## ⚠️ 当前剧情已进展到：Day ' + GS.day + ' ' + phaseLabel +
        '。以下为上一段结尾（纯正文·你必须从这里紧接着写）\n' + tailText + '\n\n';
      msg += '⚠️ 上面最后一段的结尾就是你的起点。用一句话自然锚定当前位置（如"你放下手里的杯子……""他转身时……"），然后紧接着写新内容。不要复述、不要回顾已发生的场景。\n';
      if (GS.currentOptions.length === 0 && GS.consequenceNarratives.length === 0) {
        msg += '⚠️ 玩家跳过了上一时段的选项，没有选择任何选项。请直接从新时段开始写，不要假设玩家执行了任何选项中的行动。\n';
      }
      msg += '\n';
    } else {
      msg += '## ⚠️ 这是今天的第一段剧情，没有上文需要衔接。直接从当前时段的开始写起。\n\n';
    }
  } else if (type === 'consequence') {
    var keyEvents2 = getTodayKeyEventsSummary();
    if (keyEvents2) {
      msg += '## 今日关键事件（仅供了解·禁止复述）\n' + keyEvents2 + '\n\n';
    }
    if (GS.todayRevealedInfo) {
      msg += '## 📋 今日已揭示信息（请勿违反）\n' + GS.todayRevealedInfo + '\n\n';
    }
    var tailText2 = getTodayNarrativeTail(CONSEQUENCE_TAIL_CHARS);
    if (tailText2 && tailText2.trim().length > 0) {
      msg += '## ⚠️ 当前剧情已进展到：Day ' + GS.day + ' ' + phaseLabel +
        '。以下为上一段结尾（纯正文·你必须从这里紧接着写）\n' + tailText2 + '\n\n';
    }
    msg += '## ⚠️ 对话归属提醒\n以下已发生的对话请保持「谁对谁说」的归属不变。后续引用时说话人和听话人必须一致，不要张冠李戴。\n\n';
    msg += '⚠️ 玩家选择了选项："' + extra.choiceText +
      '"——这就是你的起点。用一句话锚定位置后直接开始写。不要过渡、不要回顾。如果选项是"去厨房帮珉奎做饭"，第一句话就是"你走进厨房……"。\n\n';
    // [P0-3] 醉酒剧情后续
    if (extra.drunkTarget) {
      var drunkMember = MEMBERS.find(function(m) { return m.id === extra.drunkTarget; });
      if (drunkMember) {
        msg += '## 醉酒剧情上下文\n' + drunkMember.name + '已经醉酒。玩家选择了与' + drunkMember.name +
          '相关的醉酒互动。请生成约500字的醉酒后续剧情，包含隐藏对话（说出平时不会说的话）。\n\n';
      }
    }
    // [P0-3] 真心话环节后续（3轮制）
    if (extra.truthRound) {
      var truthDrawerMember = extra.truthDrawer === 'heroine' ? null : MEMBERS.find(function(m) { return m.id === extra.truthDrawer; });
      var truthDrawerName = extra.truthDrawer === 'heroine' ? '女主' : (truthDrawerMember ? truthDrawerMember.name : '嘉宾');
      var levelName = extra.truthLevel === 'light' ? '轻度' : extra.truthLevel === 'medium' ? '中度' : '深度';
      msg += '## ⚠️ 这是Day 11真心话第' + extra.truthRound + '/3轮（' + levelName + '）· 第' + extra.truthSubRound + '/4人\n' +
        '当前抽卡人：' + truthDrawerName + '\n';
      if (extra.truthCard) {
        msg += '本轮问题：' + extra.truthCard.text + '\n';
      }
      if (extra.truthAnswer) {
        msg += '女主的回答：「' + extra.truthAnswer + '」\n';
      }
      if (extra.choiceText && extra.choiceText.indexOf('喝酒') >= 0) {
        msg += truthDrawerName + '选择了拒绝回答并喝酒（+1杯）。\n';
      }
      msg += '\n## 真心话生成要求\n' +
        '1. 描写' + truthDrawerName + '听到问题后的第一反应、思考过程、最终行动。\n' +
        '2. 其他嘉宾的反应（表情、眼神、窃窃私语）。\n' +
        '3. 导演OS中体现当前每人已喝酒杯数。\n' +
        '4. 如果是第3轮第4人（最后一人），剧情要自然收束，准备进入深夜。\n' +
        '5. 如果是AI嘉宾的回合且选择了"喝酒"，在剧情中直接体现（不需要给玩家选项）。\n\n';
      // [P0-3] 社恐反转
      if (extra.truthDrawer === 'heroine' && GS.heroineProfile.personality.indexOf('社恐小透明') >= 0 && extra.choiceText && extra.choiceText.indexOf('喝酒') >= 0) {
        msg += '## ⚠️ 社恐反转\n女主选了「社恐小透明」性格，喝酒后暂时不再社恐——话变多、大胆直视、主动靠近。酒醒后在采访间震惊于自己刚才的表现。\n\n';
      }
    }
  } else {
    msg += '## 今日全部剧情原文（仅供上下文参考，不要复述）\n以下是今天已经发生的所有剧情。请基于这些内容延续，不要复述或总结。你只需要写紧接着的新发展。\n\n' +
      getTodayFullTextCapped() + '\n\n';
  }

  msg += '## 当前好感度（仅供AI内部参考，观察员OS中绝对不能提及数值）\n';
  for (var j = 0; j < members.length; j++) {
    var m = members[j];
    var aff = GS.affection[m.id] || 0;
    var desc = aff >= 80 ? '深度好感' : aff >= 60 ? '明显好感' : aff >= 40 ? '关注中·有好感' : aff >= 15 ? '中性·略有好感' : aff >= 0 ? '中性' : aff >= -15 ? '微冷淡' : '明显冷淡';
    msg += m.name + '：' + aff + '（' + desc + '）\n';
  }
  msg += '\n';

  if (GS.freeInput && type !== 'freeAction') {
    msg += '## 玩家已保存的行动意图（尚未执行）\n' + GS.freeInput + '\n\n';
  }

  if (GS.prevSummary && (type === 'phase' || type === 'regenerate')) {
    msg += '## ⚠️ 重新生成要求\n上一版摘要：' + GS.prevSummary +
      '\n请生成与上一版明显不同的版本！改变场景切入点、至少1个场景元素、对话内容不能重复、至少2个选项不同。\n\n';
  }

  var noRepeatNote = '⚠️ 记忆链仅供上下文参考。用一句话锚定当前位置后紧接着写新内容。不要大段复述、不要总结、不要回顾、不要重新描写。';

  if (type === 'consequence') {
    msg += '## 生成任务\n玩家选择了选项："' + extra.choiceText +
      '"——这就是你的起点。用一句话锚定位置后直接开始写。\n请生成后续剧情（~1000字），包含正文+🎙女主采访间+🎤成员采访间+🎬导演OS+💭观察员OS+新选项。\n' + noRepeatNote;
  } else if (type === 'freeAction') {
    msg += '## 生成任务\n玩家通过自由输入表达了以下行动意图：\n"' + extra.actionText +
      '"\n\n⚠️ 玩家的行动已经在故事中执行完毕。你现在写的是执行之后紧接着发生的事。当前时间位置：Day ' + GS.day + ' ' + phaseLabel +
      '。不要回到更早的时间点。\n\n请基于当前场景和已有剧情，生成女主执行此行动后的后续剧情（~1000字）。\n- 这是紧接着已有剧情的后续发展，不要重复已有内容\n- 将玩家的行动意图自然地融入剧情\n- 包含正文+🎙女主采访间+🎤成员采访间+🎬导演OS+💭观察员OS+新选项\n' + noRepeatNote;
  } else if (type === 'sms') {
    msg += '## 生成任务\n女主给' + extra.targetName + '发送了心动短信："' + extra.smsContent +
      '"\n请生成短信发送后的剧情（~1000字）：描写' + extra.targetName +
      '收到短信时的反应、其他成员的反应、女主的心情。包含🎬导演OS和💭观察员OS。\n注意：不要描写女主发短信的动作，短信已经发出了。这是深夜睡前。⚠️ 不需要生成【选项】！这是深夜收尾。\n' + noRepeatNote;
  } else if (type === 'stay') {
    msg += '## 生成任务\n玩家选择"继续今天"（今日第' + (GS.stayCount) +
      '次）。请基于当前记忆生成新的后续剧情（~1200字），包含正文+🎙女主采访间+🎤成员采访间+🎬导演OS+💭观察员OS+新选项。\n' + noRepeatNote;
  } else if (type === 'finalResult') {
    msg += '## 生成任务·最终结局\n玩家选择了：' + extra.choiceText + '\n\n以下是3位成员的最终选择结果：\n';
    for (var k = 0; k < extra.memberChoices.length; k++) {
      var mc = extra.memberChoices[k];
      msg += mc.name + '选择了：' + mc.choice + '\n';
    }
    msg += '\n请基于以上双向选择结果，生成最终结局叙事（~1500字）：\n- 描写玩家走向选择对象时的场景\n- 被选择的人的反应（成功或拒绝）\n- 未被选择的人的反应（通过观察员OS补充）\n- 节目收尾：制作组最后一次广播，"感谢各位参与《换乘恋爱》"，摄像机红灯熄灭\n- 一个开放式尾声\n- 最后显示3位成员的好感度数值\n包含🎬导演OS和💭观察员OS。';
  } else {
    msg += '## 生成任务\n请生成Day ' + GS.day + ' ' + phaseLabel +
      '的时段剧情（~1500字）。\n必须包含：至少1次🎙女主采访间+至少1次🎤成员采访间+🎬导演OS+💭观察员OS（多人对话格式）+' +
      (isDatingDay ? '1个' : '3个') + '选项。\n' + noRepeatNote;

    if (GS.day === 1 && GS.phaseIndex === 0) {
      msg += '这是节目第一天上午！请描写入住心动小屋的场景：你拖着行李箱到达，成员们陆续到来。成员之间彼此非常熟悉（多年队友），只有你是新人。描写每个人进门时的样子、第一句对话。注意：读信环节在傍晚，现在不要写。';
    }

    if (GS.day === 1 && GS.phaseIndex === 2) {
      msg += '⚠️⚠️⚠️ 这是Day 1最重要的强制环节：X介绍信朗读！晚餐后，制作组广播宣布规则，每人朗读各自前任X写给自己的介绍信。请描写：制作组广播、拿到信封的反应、轮流朗读时的语气停顿与微表情、女主读信的核心高光、其他人的倾听表情、读完后客厅的沉默。信的内容约200字，是"X写给我的"。末尾必须包含【选项】和3个编号选项。';
    }

    // Day 3：故事环节人物驱动指导
    if (GS.day === 3 && GS.phaseIndex === 0) {
      msg += '\n⚠️ 今天是Day 3「每人说一个故事」环节。故事必须由人物性格驱动：\n' +
        '- X（' + xMember.name + '）的故事：可能隐约涉及过去但不暴露身份——讲述一段"人生中重要的关系"，暗示但不点名\n' +
        '- ' + otherMembers[0].name + '的故事：反映他的第二职业（' + MEMBERS.find(function(m){return m.id===otherMembers[0].id;}).secondCareer + '）或性格特质\n' +
        '- ' + otherMembers[1].name + '的故事：反映他的第二职业（' + MEMBERS.find(function(m){return m.id===otherMembers[1].id;}).secondCareer + '）或性格特质\n' +
        '- 女主的故事：反映你的职业（' + hp.job + '）和性格——自然提及但不刻意\n' +
        '- 每个故事后可以有其他人的追问和反应。观察员会分析每个故事中隐藏的信息。\n';
    }

    // Day 11 傍晚真心话环节专属 Prompt
    if (GS.day === 11 && GS.phaseIndex === 2) {
      msg += '\n⚠️⚠️⚠️ 这是Day 11最重要的强制环节：真心话环节！\n\n' +
        '## 真心话规则（强制执行）\n' +
        '1. 每档问题卡6张（轻度/中度/深度各6张），从中随机抽取4张，共12轮。\n' +
        '2. 4人（女主、' + members.map(function(m) { return m.name; }).join('、') + '）轮流抽卡回答，每人3轮 = 共12次\n' +
        '3. 每轮只生成当前抽卡人的2个选项：①自由输入框（如实回答）②拒绝回答并喝酒（+1杯）\n' +
        '4. AI嘉宾（' + otherMembers.map(function(m) { return m.name; }).join('、') + '和' + xMember.name + '）50%概率选择拒绝回答并喝酒\n' +
        '5. ⚠️⚠️⚠️ 醉酒触发核心规则：谁最先喝到≥2杯，谁就是醉酒剧情触发者！仅触发1位！\n' +
        '   - 后续任何人再喝到2杯也不再判定醉酒剧情\n' +
        '   - 若多人同时喝到第2杯，优先级：女主 > ' + xMember.name + '（X） > ' + otherMembers[0].name + ' > ' + otherMembers[1].name + '\n' +
        '   - 一旦有人触发醉酒，后续轮次中其他人喝酒不再计入醉酒判定\n' +
        '6. 12轮全部完成后：\n' +
        '   - 若有人触发醉酒 → 进入深夜醉酒剧情（根据触发者身份生成对应选项）\n' +
        '   - 若无人触发醉酒 → 正常深夜发短信\n' +
        '7. ⚠️ 每轮只生成当前抽卡人的选项！不要一次性生成所有12轮的选项！\n' +
        '8. ⚠️ 选项文字只写具体行动描述，禁止括号备注。\n' +
        '9. 每轮生成后，跟踪当前每人已喝酒杯数（在导演OS中体现）。\n\n' +
        '## 问题卡示例（从每档6张中随机抽取4张，不重复）\n' +
        '轻度：\n' +
        '1.「今天让你心跳加速的那个人是谁？」\n' +
        '2.「来这里之后，最让你意外的一件事是什么？」\n' +
        '3.「如果明天是最后一天，你最想和谁一起吃早餐？」\n' +
        '4.「你觉得这里有人对你有好感吗？」\n' +
        '中度：\n' +
        '5.「你现在心里有感兴趣的人吗？」\n' +
        '6.「你收到的最让你心动的一条短信是什么？」\n' +
        '7.「你觉得你和那个人有可能吗？」\n' +
        '8.「如果那个人今天对你表白，你会怎么回答？」\n' +
        '深度：\n' +
        '9.「你还想着你的X吗？」\n' +
        '10.「你和X最后悔的一件事是什么？」\n' +
        '11.「如果X现在坐在你面前，你最想问他/她什么？」\n' +
        '12.「你觉得自己是来复合的，还是来换乘的？」\n\n' +
        '⚠️ 这是全季情感最裸露的时刻。酒精+尖锐问题=伪装剥落。描写要克制但有力——眼神、停顿、手是否在抖、声音是否变化。\n';
    }

    if (GS.day === 12) {
      msg += '这是最终选择日！请描写最终选择的紧张氛围。生成3个选项：1.选择X（复合）-显示X名字 2.选择成员A（换乘）-显示名字 3.选择成员B（换乘）-显示名字。但不要替玩家做选择。';
    }

    if (isDatingDay && GS.day !== 9) {
      msg += '⚠️⚠️⚠️ 今天是约会配对日！只生成1个选项：「随机约会」。不要生成其他选项。配对过程由玩家投骰子决定，AI在叙事中描写抽签/转盘/游戏过程，最终结果必须与骰子结果一致。\n';
    }

    if (GS.day === 9 && GS.phaseIndex === 0) {
      msg += '⚠️⚠️⚠️ 今天是X约会日！强制与X约会。只生成1个选项：「▶ 进入约会场景」。\n';
    }

    if (GS.phaseIndex === 3 && !GS.smsSentToday) {
      msg += '\n深夜时段：请在输出末尾额外生成3条短信草稿（每条≤25字），格式：\n【短信草稿】\n1. 短信内容一（1-2句话，不超过25字）\n2. 短信内容二\n3. 短信内容三\n⚠️ 短信草稿只在【短信草稿】标记中生成，不在正文段落中出现。短信草稿内容不含成员姓名。短信风格：简短、含蓄、符合节目调性。不直白表白，用暗示和温暖的话语。';
    }
  }

  msg += getFormatReminder(isDatingDay, isSms);
  return msg;
}
