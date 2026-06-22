// ==================== 常量 ====================
var STORAGE_KEY = 'svt_transfer_v20';
var MAX_STAY_COUNT = 2;
var MAX_PHASE_CHOICES = 2;
var TODAY_TEXT_CAP = 8000;
var PHASE_TAIL_CHARS = 800;
var CONSEQUENCE_TAIL_CHARS = 500;
var SAVE_SIZE_WARN = 1048576;

// [P0-1] API 配置：SiliconFlow + Kimi
var API_ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions';
var API_MODEL = 'Pro/moonshotai/Kimi-K2.7-Code';

var ZODIAC_SIGNS = [
  '白羊座♈','金牛座♉','双子座♊','巨蟹座♋','狮子座♌',
  '处女座♍','天秤座♎','天蝎座♏','射手座♐','摩羯座♑',
  '水瓶座♒','双鱼座♓'
];

var MEMBERS = [
  {
    id: 'scoups', name: '崔胜澈', stageName: 'S.Coups', emoji: '🍒',
    team: 'Hip-hop', desc: '队长·沉稳可靠', age: 1995, pos: 'SEVENTEEN总队长',
    personality: '责任感强、外刚内柔、保护欲旺盛、偶尔脆弱',
    loveStyle: '慢热深情型——不轻易动心，一旦认定就默默守护。表达偏行动而非语言。吃醋时变沉默或更"官方"。',
    traits: '习惯性抿嘴、说话前短暂停顿思考、紧张时摸后颈、酒量一般但喜欢喝',
    zodiac: '狮子座 ♌', secondCareer: '音乐制作人', specialties: '料理、照顾人、调解矛盾',
    appearance: '深色短发、浓眉、眼神有力、肩膀宽厚、身高约178cm',
    xStory: '分手原因：太忙导致陪伴不够，心怀愧疚。场外X：温柔型女性，聚少离多分手。这段恋情从未向团内公开。'
  },
  {
    id: 'jeonghan', name: '尹净汉', stageName: 'Jeonghan', emoji: '👼',
    team: 'Vocal', desc: '温柔细腻·天使', age: 1995, pos: 'Vocal队',
    personality: '温柔体贴、高情商、偶尔腹黑、擅长读心',
    loveStyle: '温柔掌控型——用温柔"圈地盘"，不动声色坐在你旁边。吃醋时用更密集的关注让其他人知难而退。',
    traits: '长发及肩常扎起、笑起来眼睛弯弯、喜欢靠在别人身上、擅长用沉默制造暧昧',
    zodiac: '天秤座 ♎', secondCareer: '心理学在读', specialties: '读心、策略游戏、让人放松',
    appearance: '长发及肩、精致五官、笑容温柔、清瘦优雅、身高约178cm',
    xStory: '分手原因：他太好了让对方有压力。场外X：独立型女性，因"他过度照顾"分手。这段恋情从未向团内公开。'
  },
  {
    id: 'joshua', name: '洪知秀', stageName: 'Joshua', emoji: '🦌',
    team: 'Vocal', desc: '绅士优雅·小鹿', age: 1995, pos: 'Vocal队·美籍韩裔',
    personality: '绅士风度、优雅从容、外柔内刚、偶尔反差',
    loveStyle: '绅士守候型——尊重对方节奏，好感表现为持续稳定的关注。吃醋时微妙减少与情敌互动。',
    traits: '微笑时像小鹿、弹吉他很好听、教堂哥哥气质、偶尔冷幽默',
    zodiac: '摩羯座 ♑', secondCareer: '手工皮具匠人', specialties: '吉他、手作、英语',
    appearance: '小鹿眼、温柔微笑、气质优雅、身高约177cm',
    xStory: '分手原因：文化差异导致理解偏差。场外X：海外背景女性，长期异地分手。这段恋情从未向团内公开。'
  },
  {
    id: 'jun', name: '文俊辉', stageName: 'Jun', emoji: '🐱',
    team: 'Performance', desc: '猫系美男', age: 1996, pos: 'Performance队',
    personality: '安静内敛、猫系性格、对熟人反差大、四次元思维',
    loveStyle: '猫系慢热型——需要时间观察确认心意。好感表现为"开始主动出现在你身边"。吃醋时更安静但眼神追随。',
    traits: '像猫喜欢安静角落、突然的四次元发言、对螺蛳粉有执念、武术功底',
    zodiac: '双子座 ♊', secondCareer: '演员', specialties: '中式料理、模仿、活跃气氛',
    appearance: '猫系长相、五官精致、安静时像画、身高约182cm',
    xStory: '分手原因：太安静让对方觉得不被需要。场外X：主动型女性，沟通模式不匹配分手。这段恋情从未向团内公开。'
  },
  {
    id: 'hoshi', name: '权顺荣', stageName: 'Hoshi', emoji: '🐯',
    team: 'Performance', desc: '活力老虎', age: 1996, pos: 'Performance队',
    personality: '能量充沛、热情执着、偶尔中二、对舞蹈极度认真',
    loveStyle: '热情攻势型——喜欢就全力以赴，像对待舞蹈一样认真。吃醋时更努力表现自己。',
    traits: '自称老虎(虎浪嘿)、永远在动、对舞蹈极度认真、容易激动、笑声有感染力',
    zodiac: '双子座 ♊', secondCareer: '编舞师', specialties: '编舞、带动气氛、认路（方向感好）',
    appearance: '单眼皮、老虎般的眼神、身材结实、身高约177cm',
    xStory: '分手原因：太专注舞蹈忽略对方。场外X：能接受他热情的女性，因关注度不足分手。这段恋情从未向团内公开。'
  },
  {
    id: 'wonwoo', name: '全圆佑', stageName: 'Wonwoo', emoji: '🦊',
    team: 'Hip-hop', desc: '低音炮·眼镜美男', age: 1996, pos: 'Hip-hop队',
    personality: '外冷内热、理性克制、思维深邃、偶尔腹黑',
    loveStyle: '理性克制型——心动也会先冷静分析。越压抑越容易失控。吃醋时用毒舌或冷淡掩饰，眼神藏不住。',
    traits: '推眼镜习惯、低音炮嗓音突出、熬夜打游戏、喜欢在阳台发呆',
    zodiac: '巨蟹座 ♋', secondCareer: '游戏公司策划', specialties: '摄影、围棋、观察细节',
    appearance: '戴眼镜、深色头发、低音炮气质、身高约182cm、常穿深色系',
    xStory: '分手原因：沟通不足导致渐行渐远。表面放下但保留所有聊天记录。场外X：知性型女性，性格不合分手。这段恋情从未向团内公开。'
  },
  {
    id: 'woozi', name: '李知勋', stageName: 'Woozi', emoji: '🍚',
    team: 'Vocal', desc: '天才制作人', age: 1996, pos: 'Vocal队·SEVENTEEN主制作人',
    personality: '专注执着、外冷内热、不善表达、内心柔软',
    loveStyle: '笨拙深情型——用奇怪方式表达好感：突然给对方听自己写的歌。吃醋时把自己关工作间写歌。',
    traits: '个子不高气场强、工作时完全沉浸、偶尔孩子气笑容、对在意的人很温柔',
    zodiac: '天蝎座 ♏', secondCareer: '作曲/制作人', specialties: '多乐器、作词作曲、剪辑',
    appearance: '个子不高但气场强、精致五官、工作时戴耳机、身高约164cm',
    xStory: '分手原因：太沉浸工作忽略对方。场外X：理解他但最终疲惫的女性。这段恋情从未向团内公开。'
  },
  {
    id: 'dk', name: '李硕珉', stageName: 'DK', emoji: '☀️',
    team: 'Vocal', desc: '阳光主唱', age: 1997, pos: 'Vocal队·主唱',
    personality: '阳光开朗、共情力强、笑点低、偶尔感性',
    loveStyle: '温暖陪伴型——用持续温暖包围对方。好感表现为"把最多的笑容留给你"。吃醋时笑不出来是最大信号。',
    traits: '标志性大笑、唱歌时判若两人、容易哭、对食物有执念、会突然感性爆发',
    zodiac: '水瓶座 ♒', secondCareer: '音乐剧演员', specialties: '唱歌、活跃气氛、模仿',
    appearance: '阳光笑容、大白牙、身材修长、身高约179cm',
    xStory: '分手原因：对方觉得他对所有人都一样好。场外X：开朗型女性，因"他太忙"分手。这段恋情从未向团内公开。'
  },
  {
    id: 'mingyu', name: '金珉奎', stageName: 'Mingyu', emoji: '🐶',
    team: 'Hip-hop', desc: '门面大狗狗', age: 1997, pos: 'Hip-hop队',
    personality: '热情开朗、细心体贴、偶尔冒失、情绪外露',
    loveStyle: '直球进攻型——喜欢就表现出来，不玩暧昧。吃醋时会直接问"你和他刚才在聊什么"。',
    traits: '做饭时哼歌、身高187cm、笑时眼睛眯成线、容易脸红、力气大动作温柔',
    zodiac: '白羊座 ♈', secondCareer: '料理师/餐厅主理人', specialties: '料理、手工、篮球',
    appearance: '身高187cm、大长腿、笑起来眼睛眯成线、阳光帅气、像大狗狗',
    xStory: '分手原因：太忙而对方需要更多陪伴。场外X：活泼型女性，聚少离多分手。这段恋情从未向团内公开。'
  },
  {
    id: 'the8', name: '徐明浩', stageName: 'The8', emoji: '🐸',
    team: 'Performance', desc: '艺术灵魂', age: 1997, pos: 'Performance队',
    personality: '艺术气质、内心丰富、外表清冷、对熟人温柔',
    loveStyle: '灵魂共鸣型——追求精神层面契合。好感表现为"开始和你分享他的世界"。吃醋时会画画或编舞表达。',
    traits: '时尚感突出、对茶道有研究、画画很好、舞蹈风格独特、偶尔说出哲学般的话',
    zodiac: '天蝎座 ♏', secondCareer: '当代艺术家', specialties: '绘画、冥想、茶道',
    appearance: '时尚感突出、清冷气质、身材修长、身高约180cm',
    xStory: '分手原因：精神层面渐行渐远。场外X：艺术相关女性，精神共鸣减弱分手。这段恋情从未向团内公开。'
  },
  {
    id: 'seungkwan', name: '夫胜宽', stageName: 'Seungkwan', emoji: '🍊',
    team: 'Vocal', desc: '综艺天才', age: 1998, pos: 'Vocal队',
    personality: '幽默风趣、高敏感、表面活泼内心细腻、胜负欲强',
    loveStyle: '傲娇掩饰型——喜欢时用拌嘴吐槽掩饰，越在意越毒舌。好感表现为"嘴上嫌弃但行动最照顾你"。',
    traits: '反应极快、模仿一流、吐槽精准无恶意、私下很安静、对济州岛有执念、容易水肿',
    zodiac: '摩羯座 ♑', secondCareer: '综艺人/主持人', specialties: '唱歌、济州岛方言、活跃气氛',
    appearance: '圆脸、表情丰富、济州岛橘子般的亲和力、身高约174cm',
    xStory: '分手原因：用搞笑掩饰真心，对方感受不到安全感。场外X：能看穿他内心的女性，沟通不畅分手。这段恋情从未向团内公开。'
  },
  {
    id: 'vernon', name: '崔瀚率', stageName: 'Vernon', emoji: '🦅',
    team: 'Hip-hop', desc: '混血美男·4D灵魂', age: 1998, pos: 'Hip-hop队',
    personality: '自由随性、思维跳跃、真诚直率、四次元',
    loveStyle: '自然流露型——不刻意追求也不刻意回避。好感表现为"愿意和你分享他的世界"。吃醋时直接沉默或走开。',
    traits: '多语混用、走路有自己节奏、经常放空、突然说出发人深省的话、对音乐极其认真',
    zodiac: '水瓶座 ♒', secondCareer: '独立音乐人/DJ', specialties: '说唱、滑板、独特视角',
    appearance: '混血五官、深邃眼神、独特气质、身高约177cm',
    xStory: '分手原因：对方无法理解他的世界。场外X：艺术型女性，精神层面渐行渐远分手。这段恋情从未向团内公开。'
  },
  {
    id: 'dino', name: '李灿', stageName: 'Dino', emoji: '🦦',
    team: 'Performance', desc: '全能忙内', age: 1999, pos: 'Performance队·SEVENTEEN忙内',
    personality: '努力上进、自信阳光、偶尔撒娇、渴望被认可',
    loveStyle: '年下直进型——不在意年龄差，喜欢就直接表达。好感表现为"在你面前格外认真"。吃醋时直接说"我不喜欢那样"。',
    traits: '永远在练习、认真时皱眉、撒娇时反差极大、舞蹈实力超强',
    zodiac: '水瓶座 ♒', secondCareer: '舞者/编舞助理', specialties: '舞蹈、模仿哥哥们、学习能力强',
    appearance: '阳光少年感、永远在动、认真时皱眉、身高约173cm',
    xStory: '分手原因：对方觉得他不够成熟。场外X：同龄或年下女性，因"他太忙且不够成熟"分手。这段恋情从未向团内公开。'
  }
];

// [P0-2] 小礼物模板
// [P1-5] 随机日常事件模板
var RANDOM_EVENTS = {
  weather: [
    '突然下起大雨，所有人被困在客厅里，气氛变得微妙。',
    '停电了，屋里只剩下蜡烛的光。',
    '外面刮起大风，阳台门被吹得砰砰响。'
  ],
  health: [
    '女主突然感冒发烧，有人主动照顾。',
    '有人切菜时不小心划伤了手指。',
    '女主姨妈痛，蜷缩在沙发上。'
  ],
  accident: [
    '做饭时发现食材不够，需要一起外出采购。',
    '洗衣机故障，衣服泡在水里。',
    '冰箱里出现异味，大家一起清理。'
  ],
  member: [
    '金珉奎突然做宵夜，香味弥漫整个屋子。',
    '全圆佑深夜在客厅分享新歌。',
    '尹净汉靠在沙发上睡着了，需要盖毯子。'
  ]
};

function shouldTriggerRandomEvent() {
  // 非约会日、非强制任务时段、当天未触发过、15%概率
  var isDatingDay = ([4, 5, 8, 9, 10].indexOf(GS.day) >= 0);
  if (isDatingDay) return null;
  // 强制任务时段排除
  var mandatoryPhases = {
    1: ['evening'], // Day 1 读信
    3: ['morning'], // Day 3 故事
    7: ['morning'], // Day 7 集体外出
    9: ['morning'], // Day 9 X约会
    11: ['evening'] // Day 11 真心话
  };
  var dayMandatory = mandatoryPhases[GS.day] || [];
  if (dayMandatory.indexOf(PHASES[GS.phaseIndex]) >= 0) return null;
  // 检查今天是否已触发
  if (GS.todayRandomEventTriggered) return null;
  if (Math.random() > 0.15) return null;
  // 随机选择一个事件
  var categories = ['weather', 'health', 'accident', 'member'];
  var cat = categories[Math.floor(Math.random() * categories.length)];
  var events = RANDOM_EVENTS[cat];
  var evt = events[Math.floor(Math.random() * events.length)];
  GS.todayRandomEventTriggered = true;
  return evt;
}

// [P0-3] Day 11 真心话问题卡（18张）
var TRUTH_CARDS = [
  // 轻度（心跳瞬间）6题
  { id: 1,  level: 'light', text: '「今天让你心跳加速的那个人是谁？」' },
  { id: 2,  level: 'light', text: '「来这里之后，最让你意外的一件事是什么？」' },
  { id: 3,  level: 'light', text: '「如果明天是最后一天，你最想和谁一起吃早餐？」' },
  { id: 4,  level: 'light', text: '「你觉得这里有人对你有好感吗？」' },
  { id: 5,  level: 'light', text: '「这几天里，最让你印象深刻的一个瞬间是什么？」' },
  { id: 6,  level: 'light', text: '「如果可以和某人单独待一天，你会选谁？」' },
  // 中度（好感对象）6题
  { id: 7,  level: 'medium', text: '「你现在心里有感兴趣的人吗？」' },
  { id: 8,  level: 'medium', text: '「你收到的最让你心动的一条短信是什么？」' },
  { id: 9,  level: 'medium', text: '「你觉得你和那个人有可能吗？」' },
  { id: 10, level: 'medium', text: '「如果那个人今天对你表白，你会怎么回答？」' },
  { id: 11, level: 'medium', text: '「这几天有没有某个人的某个举动让你开始在意他？」' },
  { id: 12, level: 'medium', text: '「你觉得这里谁最有可能在最后选择你？」' },
  // 深度（放不下的人）6题
  { id: 13, level: 'deep', text: '「你还想着你的X吗？」' },
  { id: 14, level: 'deep', text: '「你和X最后悔的一件事是什么？」' },
  { id: 15, level: 'deep', text: '「如果X现在坐在你面前，你最想问他/她什么？」' },
  { id: 16, level: 'deep', text: '「你觉得自己是来复合的，还是来换乘的？」' },
  { id: 17, level: 'deep', text: '「如果X也在这里，你会怎么面对他/她？」' },
  { id: 18, level: 'deep', text: '「你觉得你真的能放下过去吗？」' }
];

var GIFT_TEMPLATES = [
  { type: 'handcraft', name: '手作手链', desc: '一条用细绳编织的手链，看起来是亲手做的。' },
  { type: 'handcraft', name: '小挂件', desc: '一个精致的小挂件，挂在包上刚刚好。' },
  { type: 'food', name: '自制饼干', desc: '装在透明盒子里的一小叠饼干，散发着黄油香气。' },
  { type: 'food', name: '手工巧克力', desc: '几颗形状不太规则的巧克力，但能看出很用心。' },
  { type: 'emotion', name: '手写便签', desc: '一张折好的便签，上面写了几行字。' },
  { type: 'emotion', name: '拍立得照片', desc: '一张拍立得照片，记录了这一天的某个瞬间。' }
];

var PHASES = ['morning', 'afternoon', 'evening', 'night'];
var PHASE_LABELS = {
  morning: '☀️ 上午',
  afternoon: '🌤 下午',
  evening: '🌅 傍晚',
  night: '🌙 深夜'
};

var PHASE_BOUNDARIES = {
  morning: '⚠️ 你只写上午的剧情。写到午饭前自然结束。不要写午饭、下午或晚上的任何内容。在午饭前的一个自然停顿点结束。',
  afternoon: '⚠️ 你只写下午的剧情。从午饭后开始，写到晚饭前自然结束。不要写晚饭或晚上的任何内容。在晚饭前的一个自然停顿点结束。',
  evening: '⚠️ 你只写傍晚的剧情。从晚饭前/晚饭中开始，写到睡前自然结束。不要写深夜入睡后的内容。在睡前的一个自然停顿点结束。',
  night: '⚠️ 你只写深夜的剧情。从睡前开始，写到入睡结束。这是今天的最后一个时段。在入睡时结束。'
};

var PHASE_TONE = {
  morning: '上午氛围：早安、早餐、清晨光线、一天开始。禁止出现"晚安""深夜"等晚间词汇。',
  afternoon: '下午氛围：午后阳光、日常活动。禁止出现"早安""晚安"。',
  evening: '傍晚氛围：黄昏光线、晚餐、放松。禁止出现"早安"。',
  night: '深夜氛围：睡前、静谧、晚安。禁止出现"早安""下午"等词汇。'
};

var APPEARANCE_TRAITS = ['泪痣','冷白皮','淡颜系','酒窝','小虎牙','双眼皮','高鼻梁','樱桃唇'];
var PERSONALITY_TRAITS = ['慢热但一旦爱了就全力以赴','社恐小透明','外冷内热','温柔细腻','偶尔毒舌','共情力强','独立要强','活泼开朗','敏感多疑','直率坦诚','浪漫理想主义','务实理性'];
var MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
var PRIVATE_TRAITS = ['怕黑','易醉体质','泪失禁','怕打雷','恐高','晕车体质','海鲜过敏','花粉过敏'];

var TOKEN_CONFIG = {
  phaseNarrative: 5000,
  consequence: 3500,
  sms: 3000,
  stay: 3500,
  freeAction: 3500,
  xMainStory: 3500,
  xMemberReason: 1500,
  xItems: 1500,
  dailySummary: 2000,
  todayCompress: 2000,
  finalResult: 4000,
  imagePrompt: 1500
};

var BEHAVIOR_MAP = {
  '慢热但一旦爱了就全力以赴': '初期（Day 1-5）选项偏保守、回避直接表达好感；后期（Day 6-12）某个关键节点出现一次突破性的主动行为——可能是一句直白的话、一次主动的靠近、一条大胆的短信。转折点前后有明显反差。',
  '社恐小透明': '集体场景中倾向于坐在边缘位置；被多人注视时会耳朵红、低头、语速变快或变慢；轮流发言时最后一个开口；在采访间中比在正文中更流畅地表达。但随着天数推移，紧张程度逐渐降低。喝酒后暂时不再社恐——话变多、大胆直视、主动靠近，酒醒后在采访间里震惊于自己刚才的表现。',
  '外冷内热': '表面反应平淡，但内心活动极其丰富。正文中她的回应简短克制，采访间中却暴露出大量细腻的感受。成员可能误读她的冷淡为"不感兴趣"，直到某个瞬间发现她其实一直在意。',
  '温柔细腻': '会第一个注意到成员的情绪变化（谁今天话少了、谁在强颜欢笑）；会在恰当的时机做出恰当的小举动（递一杯水、留一盏灯、说一句"你还好吗"）；成员对她的评价常包含"治愈""安心"。',
  '偶尔毒舌': '对逐渐熟悉的成员会有调侃和吐槽，但分寸精准不伤人。毒舌后常有微小的补救动作（补一句软话、递个东西）。在采访间中可能自嘲"我是不是说得太过分了"。是关系亲近的信号——越熟越毒舌。',
  '共情力强': '容易被他人情绪感染——看到成员难过会跟着眼眶泛红；听到感动的故事会沉默很久；在冲突场景中会感到强烈的不适并试图缓和。采访间中经常反思"他当时那样说，是不是因为……"',
  '独立要强': '不习惯向他人求助，即使需要帮助也会先尝试自己解决。在节目中可能显得"不需要照顾"，让保护欲强的成员感到无从下手。但在某个脆弱时刻会意外地向信任的人袒露柔软一面。',
  '活泼开朗': '笑声是她的标志。在集体场景中是气氛的润滑油，会主动开启话题、活跃僵局。但过于开朗可能让内向型成员需要时间适应。采访间中可能暴露"其实我也有安静的时候"。',
  '敏感多疑': '会过度解读成员的一句话、一个眼神——"他刚才那样说是什么意思？""他是不是对另一个人更有好感？"。采访间中充满自我怀疑。需要成员用明确的行动来打消她的不安。',
  '直率坦诚': '不喜欢暧昧和猜测，会直接表达自己的感受和疑问。在节目中可能打破暧昧气氛——直接问"你刚才说的是认真的吗？"。某些成员会被这种直率吸引，某些可能被吓到。',
  '浪漫理想主义': '对爱情有美好的想象和期待。会被小细节打动——一首歌、一句话、一个眼神。但也容易因为现实与理想的落差而失望。采访间中常有诗意的表达。',
  '务实理性': '用理性分析感情，会在心里衡量"这段关系有没有未来""我们合不合适"。在最终选择时更倾向于"换乘"而非"复合"。采访间中的表达条理清晰，像在分析一个项目。'
};
