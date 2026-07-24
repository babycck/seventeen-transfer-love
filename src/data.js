// ==================== 常量 ====================
export var STORAGE_KEY = 'svt_transfer_v20';
export var PLAYER_BIRTH_YEAR = 2000; // 已废弃，请使用 getPlayerBirthYear()
export function getPlayerBirthYear(age, year) {
  year = year || 2025;
  return year - (age || 22);
}

export var MAX_STAY_COUNT = 2;
export var PHASE_ACTION_LIMIT = 3; // 每时段总行动次数上限（选项+自由输入合并计数）
export var OPTION_PHASE_LIMIT = PHASE_ACTION_LIMIT; // 向下兼容（旧引用值不变）
export var FREE_INPUT_PHASE_LIMIT = PHASE_ACTION_LIMIT; // 向下兼容（旧引用值不变）
export var TODAY_TEXT_CAP = 12000;
export var HYBRID_TAIL_CHARS = 3000; // [C] 混合当日注入：压缩摘要之外附加的近期叙事 tail 字符数
export var DAILY_EXPOSURE_DECAY = 12; // [H] 曝光风险每日自然衰减量

// ---------- 女团队友具象化（entSim 模式）：5 位姐姐（化名 + 性格标签 + 与女主关系） ----------
// 注意：1v1 模式另有同名 buildHeroineGirlGroup(heroineName)（见本文件下文），二者结构不同，此处加 EntSim 前缀避免碰撞。
import { randInt } from './utils.js';
export function buildEntSimHeroineGroup() {
  var namePool = ['恩率', '知允', '秀妍', '宥娜', '彩琳', '瑞胤', '河英', '允真', '艺璘', '多彬'];
  var roles = [
    { tag: '最疼你的大姐', rel: 'r1' },
    { tag: '总抢 part 的', rel: 'r2' },
    { tag: '想退团的', rel: 'r3' },
    { tag: '争门面的', rel: 'r4' },
    { tag: '佛系躺平的', rel: 'r5' }
  ];
  var used = {};
  var out = [];
  for (var i = 0; i < roles.length; i++) {
    var nm;
    do { nm = namePool[randInt(0, namePool.length - 1)]; } while (used[nm]);
    used[nm] = true;
    out.push({ name: nm, roleTag: roles[i].tag, rel: roles[i].rel });
  }
  return out;
}

// 生成女团全套设定（团名/公司/概念/粉丝名/出圈歌），与 buildEntSimHeroineGroup() 配合
export function buildEntSimGroupMeta() {
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  var gi = Math.floor(Math.random() * GIRLGROUP_PRESETS.groupNames.length);
  var pool = GIRLGROUP_PRESETS.songs.slice();
  var songCount = 2 + (Math.random() < 0.5 ? 0 : 1);
  var songs = [];
  for (var i = 0; i < songCount && pool.length; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    songs.push(pool.splice(idx, 1)[0]);
  }
  return {
    groupName: GIRLGROUP_PRESETS.groupNames[gi],
    company: GIRLGROUP_PRESETS.company,
    concept: pick(GIRLGROUP_PRESETS.concepts),
    fandom: GIRLGROUP_PRESETS.fandoms[gi],
    songs: songs,
    debutYears: 2 + Math.floor(Math.random() * 2)
  };
}
export var LOWKEY_BONUS = 5; // [H] 低调日（未约高风险约会）额外减值
export var PHASE_TAIL_CHARS = 800;
export var CONSEQUENCE_TAIL_CHARS = 500;
export var SAVE_SIZE_WARN = 1048576;

// [P0-1] API 多提供商配置
// endpoint = base URL（不含 /chat/completions）
// models = 该提供商支持的模型列表（供下拉选择）
export var API_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    supportsJson: true,
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek-V3' },
      { value: 'deepseek-v4-pro', label: 'DeepSeek-V4 Pro' },
      { value: 'deepseek-v4-flash', label: 'DeepSeek-V4 Flash' }
    ],
    sceneModels: {
      heavy: 'deepseek-chat',
      light: 'deepseek-chat',
      cheap: 'deepseek-chat'
    }
  },
  siliconflow: {
    name: '硅基流动 (SiliconFlow)',
    endpoint: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    supportsJson: true,
    models: [
      { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
      { value: 'deepseek-ai/DeepSeek-V4-Pro', label: 'DeepSeek-V4 Pro' },
      { value: 'deepseek-ai/DeepSeek-V4-Flash', label: 'DeepSeek-V4 Flash' },
      { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1' },
      { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B' },
      { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', label: 'Llama-3.1-70B' }
    ],
    sceneModels: {
      heavy: 'deepseek-ai/DeepSeek-V3',
      light: 'Qwen/Qwen2.5-72B-Instruct',
      cheap: 'Qwen/Qwen2.5-72B-Instruct'
    }
  },
  qwen: {
    name: '千问 (Qwen)',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.7-plus',
    supportsJson: true,
    models: [
      { value: 'qwen3.7-plus', label: 'Qwen 3.7 Plus' },
      { value: 'qwen3.7-max-2026-05-17', label: 'Qwen 3.7 Max (2026-05-17)' },
      { value: 'qwen3.6-flash-2026-04-16', label: 'Qwen 3.6 Flash (2026-04-16)' }
    ],
    sceneModels: {
      heavy: 'qwen3.7-plus',
      light: 'qwen3.6-flash-2026-04-16',
      cheap: 'qwen3.6-flash-2026-04-16'
    }
  },
  claude: {
    name: 'Claude (Anthropic)',
    endpoint: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    supportsJson: false,
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
    ],
    sceneModels: {
      heavy: 'claude-3-5-sonnet-20241022',
      light: 'claude-3-5-haiku-20241022',
      cheap: 'claude-3-5-haiku-20241022'
    }
  },
  alading: {
    name: 'Alading API',
    endpoint: 'https://www.aladingapi.com/v1',
    model: 'kiro-claude-sonnet-5',
    supportsJson: true,
    dynamicModels: false,
    models: [
      { value: 'kiro-claude-sonnet-5', label: 'Kiro Claude Sonnet 5' }
    ],
    sceneModels: {}
  },
  custom: {
    name: '自定义 API',
    endpoint: '',
    model: '',
    supportsJson: true,
    dynamicModels: false,
    models: [],
    sceneModels: {}
  }

};

// 保留旧常量以兼容直接引用（已废弃·请使用 API_PROVIDERS）
export var API_ENDPOINT = API_PROVIDERS.deepseek.endpoint;
export var API_MODEL = API_PROVIDERS.deepseek.model;

export var ZODIAC_SIGNS = [
  '白羊座♈','金牛座♉','双子座♊','巨蟹座♋','狮子座♌',
  '处女座♍','天秤座♎','天蝎座♏','射手座♐','摩羯座♑',
  '水瓶座♒','双鱼座♓'
];

export var MEMBERS = [
  {
    id: 'scoups', name: '崔胜澈', stageName: 'S.Coups', emoji: '🍒',
    team: 'Hip-hop', desc: '队长·沉稳可靠', age: 1995, birthYear: 1995, pos: 'SEVENTEEN总队长',
    personality: '责任感强、外刚内柔、保护欲旺盛、偶尔脆弱',
    loveStyle: '慢热深情型——不轻易动心，一旦认定就默默守护。表达偏行动而非语言。吃醋时变沉默或更"官方"。',
    traits: '习惯性抿嘴、说话前短暂停顿思考、紧张时摸后颈、酒量一般但喜欢喝',
    zodiac: '狮子座 ♌', secondCareer: '音乐制作人', specialties: '料理、照顾人、调解矛盾',
    appearance: '深色短发、浓眉、眼神有力、肩膀宽厚、身高约178cm',
    xStory: '分手原因：太忙导致陪伴不够，心怀愧疚。场外X：温柔型女性，聚少离多分手。这段恋情从未向团内公开。',
    behaviorLogic: '作为队长习惯了照顾所有人，在节目中会自然地承担起「大哥」角色。会主动安排家务、照顾情绪、调解气氛。但内心深处渴望被照顾，只是不习惯表达',
    interactionStyle: '稳重温和，说话有分寸。会先观察再行动。好感度≥40 时主动关照生活细节，≥60 时会罕见地露出疲惫和柔软的一面',
    foodTaboos: ['香菜'],
    habits: ['习惯性抿嘴', '说话前停顿思考', '紧张时摸后颈', '酒量一般但爱喝', '睡前一定要整理第二天行程', '喜欢把成员们聚在一起吃饭', '害怕孤独但主动独处', '洗完头不吹造型不出门'],
    catchphrases: ['孩子们...', '哥来', '不要受伤', '想做的都去做', '成员们比什么都重要', '我相信你', '吃饭了'],
    collections: ['帽子', '运动鞋', '黑胶唱片'],
    sleepHabits: '入睡较慢，需要安静环境；有时会因压力失眠，躺在床上一动不动睁着眼',
    foodPreferences: '喜欢烤肉、大酱汤、辣炒年糕；不挑食但讨厌香菜；喝醉后会撒娇',
    quirks: ['自称队内"实权队长"但最怕尹净汉', '生气时反而更冷静', '对成员们说过的话记得很清楚', '害怕孤独但不说', '容易心软，对弟弟们很宠溺', '说狠话时嘴角不自觉地翘一下', '睡前不清点成员人数睡不着', '喝醉后对每个成员说"我爱你"'],
    fears: ['成员受伤', '孤独', '被误解', '蜘蛛'],
    comforts: ['和成员们一起吃饭', '听hip-hop音乐', '整理房间', '给妈妈打电话'],
    height: '178cm',
    mbti: 'INFP/ISTP',
    bloodType: 'AB',
    birthPlace: '大邱广域市',
    nicknameOrigin: '本名"胜澈"中取"澈"（철）+ coup d\'état（成功）→ S.Coups',
    signatureBehaviors: ['生气时反而更冷静', '说狠话时嘴角不自觉地翘一下', '洗完头花一小时吹造型', '睡前会清点成员人数']
  },
  {
    id: 'jeonghan', name: '尹净汉', stageName: 'Jeonghan', emoji: '👼',
    team: 'Vocal', desc: '温柔细腻·天使', age: 1995, birthYear: 1995, pos: 'Vocal队',
    personality: '温柔体贴、高情商、偶尔腹黑、擅长读心',
    loveStyle: '温柔掌控型——用温柔"圈地盘"，不动声色坐在你旁边。吃醋时用更密集的关注让其他人知难而退。',
    traits: '长发及肩常扎起、笑起来眼睛弯弯、喜欢靠在别人身上、擅长用沉默制造暧昧',
    zodiac: '天秤座 ♎', secondCareer: '心理学在读', specialties: '读心、策略游戏、让人放松',
    appearance: '长发及肩、精致五官、笑容温柔、清瘦优雅、身高约178cm',
    xStory: '分手原因：他太好了让对方有压力。场外X：独立型女性，因"他过度照顾"分手。这段恋情从未向团内公开。',
    behaviorLogic: '表面温柔无害，实则洞察一切。用温柔的方式掌控局面——不动声色地坐在你旁边、恰到好处地递上一杯水',
    interactionStyle: '温柔中带锋芒。好感度≥40 时开始用"我们"代替"你"，≥60 时会直接表达"我希望你选我"',
    foodTaboos: ['生鱼片', '海鲜', '辣食'],
    habits: ['选择困难症严重时直接买整套', '说话尾音自然上扬', '边刷牙边串门', '准时吃饭，到饭点就问"饭来了吗"', '压力大时对自己生气', '委屈时嘴角下垂', '常靠在别人身上（站着也要找人靠）', '拍照表情管理完美但背后使劲摆角度'],
    catchphrases: ['如同流水一般但更用心地生活', '我需要出去透透气', '那是从天上和我一起下来的天使朋友哦', '净汉的一杯热牛奶', '骗子啊（사기꾼）', '我吗？（나야？）'],
    collections: ['好看的袜子', '贴纸', '盲盒花束', '石头（宠物石小净）', '乐高'],
    sleepHabits: '必须无光、完全无声环境；理想睡眠10小时；喜欢趴着睡或抱枕头；怕冷，手脚易冰冷',
    foodPreferences: '喜欢草莓、酱蟹、辣炖安康鱼、意大利面、寿司、开心果冰淇淋、薄荷巧克力；讨厌胡萝卜、水芹菜、鳄梨、蚕蛹、海鞘；因咖啡因不耐受喝脱因咖啡或冰可可',
    quirks: ['轻微的洁癖和整理癖', '不喜欢别人坐自己的床', '脖子戴饰品会迅速解开', '常崴着脚站', '衣服有时穿反', '选择困难症极其严重', '自我感觉低，常贬低自己', '胜负欲强但嘴上说"无所谓"——游戏前说不行玩起来比谁都认真', '用最温柔的语气说最狠的话——笑着说出让人无法反驳的话', '拍照要找完美角度拍到满意为止', '跑步姿势很有特色被成员模仿过', '表面上不怕高实际心里恐高', '夏天也怕冷常穿长袖开暖气'],
    fears: ['被看穿', '选择', '自我评价低', '热和闷的环境', '高处'],
    comforts: ['散步', '逛公园', '订盲盒花束', '做公益', '和DK打游戏'],
    height: '178cm',
    mbti: 'ISFJ',
    bloodType: 'B',
    birthPlace: '京畿道华城市',
    nicknameOrigin: '生日1004（천사）音同韩语"天使"→ 外号"天使"',
    signatureBehaviors: ['用最温柔的语气说最狠的话', '拍照找完美角度拍到满意为止', '跑步姿势有特色被成员模仿过', '胜负欲强但嘴上说"无所谓"']
  },
  {
    id: 'joshua', name: '洪知秀', stageName: 'Joshua', emoji: '🦌',
    team: 'Vocal', desc: '绅士优雅·小鹿', age: 1995, birthYear: 1995, pos: 'Vocal队·美籍韩裔',
    personality: '绅士风度、优雅从容、外柔内刚、偶尔反差',
    loveStyle: '绅士守候型——尊重对方节奏，好感表现为持续稳定的关注。吃醋时微妙减少与情敌互动。',
    traits: '微笑时像小鹿、弹吉他很好听、教堂哥哥气质、偶尔冷幽默',
    zodiac: '摩羯座 ♑', secondCareer: '手工皮具匠人', specialties: '吉他、手作、英语',
    appearance: '小鹿眼、温柔微笑、气质优雅、身高约177cm',
    xStory: '分手原因：文化差异导致理解偏差。场外X：海外背景女性，长期异地分手。这段恋情从未向团内公开。',
    behaviorLogic: '绅士举止贯穿始终——开门、拉椅子、递东西。但优雅之下有原则。偶尔的反差（冷幽默、突然的直球）让人措手不及',
    interactionStyle: '优雅温和。好感度≥40 时开始记住你的所有小偏好，≥60 时会弹吉他给你听',
    foodTaboos: ['辛辣食物'],
    habits: ['弹吉他时先调音很久', '说冷笑话前抿嘴角', '祈祷时闭左眼', '随身携带吉他拨片（左口袋）', '优雅地维持餐桌礼仪', '经常为成员们祷告', '冷幽默说完自己先笑', '认真时眼睛睁得比平时大'],
    catchphrases: ['God bless you', 'Let me think...', 'It\'s okay', '在教会学过', '这就像……你知道吗', '哈利路亚'], // eslint-disable-line no-useless-escape
    collections: ['吉他拨片', '圣经', '复古小物件', '皮具工具'],
    sleepHabits: '睡前习惯祷告；需要安静环境；有时因思念美国家人而失眠',
    foodPreferences: '喜欢美式食物和韩餐结合；喜欢手工汉堡、烤肉；讨厌辛辣食物；喜欢喝冰美式',
    quirks: ['说冷笑话前抿嘴角', '祈祷时闭左眼', '吉他拨片永远放左口袋', '会突然说出让人措手不及的直球', '优雅但有原则', '偶尔展现美式幽默', '冷幽默来得突然自己说完先笑', '认真时眼睛睁得比平时大', '教堂弹吉他会闭眼'],
    fears: ['孤独', '被遗忘', '文化隔阂', '高处'],
    comforts: ['弹吉他', '读圣经', '做手工皮具', '和成员们聊天', '回忆美国生活'],
    height: '177cm',
    mbti: 'ENFJ/ESTJ',
    bloodType: 'A',
    birthPlace: '美国加利福尼亚州洛杉矶',
    nicknameOrigin: '本名洪知秀（Hong Jisoo），因美籍身份使用英文名Joshua',
    signatureBehaviors: ['说冷幽默前先抿嘴角', '祈祷时闭左眼', '弹吉他前调音很久', '突然说出让人措手不及的直球']
  },
  {
    id: 'jun', name: '文俊辉', stageName: 'Jun', emoji: '🐱',
    team: 'Performance', desc: '猫系美男', age: 1996, birthYear: 1996, pos: 'Performance队',
    personality: '安静内敛、猫系性格、对熟人反差大、四次元思维',
    loveStyle: '猫系慢热型——需要时间观察确认心意。好感表现为"开始主动出现在你身边"。吃醋时更安静但眼神追随。',
    traits: '像猫喜欢安静角落、突然的四次元发言、对螺蛳粉有执念、武术功底',
    zodiac: '双子座 ♊', secondCareer: '演员', specialties: '中式料理、模仿、活跃气氛',
    appearance: '猫系长相、五官精致、安静时像画、身高约182cm',
    xStory: '分手原因：太安静让对方觉得不被需要。场外X：主动型女性，沟通模式不匹配分手。这段恋情从未向团内公开。',
    behaviorLogic: '像猫——大部分时间安静待在自己的角落，偶尔主动靠近又迅速撤回。对熟人反差极大，四次元发言让人措手不及',
    interactionStyle: '安静但存在感强。好感度≥40 时开始在你附近晃悠，≥60 时会突然说出让你心跳加速的话然后假装什么都没发生',
    foodTaboos: [],
    habits: ['像猫一样找安静角落待着', '突然说出四次元发言', '对螺蛳粉异常执着', '练武术时专注到忘记时间', '安静地观察别人', '模仿能力很强', '饿的时候眼神涣散', '走路有时八字步'],
    catchphrases: ['我是文俊辉', '这...', '喵', '我想吃螺蛳粉', '这个有意思'],
    collections: ['螺蛳粉', '动漫周边', '武术相关书籍', '猫的图片'],
    sleepHabits: '睡姿像猫一样蜷缩；喜欢抱着东西睡；容易因环境改变而失眠；睡觉很轻',
    foodPreferences: '极度热爱螺蛳粉（来自某次深夜）；喜欢中式料理；喜欢火锅、麻辣；喜欢喝奶茶',
    quirks: ['像猫一样喜欢高处', '安静时像一幅画', '突然说出让人措手不及的话', '武术留下的旧伤阴雨天会疼', '对熟人反差极大', '会突然模仿成员', '安静时像不存在但饿了一定被发现', '对螺蛳粉的执着已到被全团嘲笑的程度', '练武术后遗症走路有时不自觉走八字'],
    fears: ['被忽视', '吵闹', '人群', '突然的巨响'],
    comforts: ['安静的角落', '螺蛳粉', '看动漫', '练武术', '和熟悉的成员在一起'],
    height: '182cm',
    mbti: 'ESFP',
    bloodType: 'B',
    birthPlace: '中国广东省深圳市',
    nicknameOrigin: '取自中文名"俊"（Jun）',
    signatureBehaviors: ['安静时像不存在饿了一定被发现', '对螺蛳粉执着被全团嘲笑', '练武术后遗症走路不自觉八字步', '突然说四次元发言后若无其事']
  },
  {
    id: 'hoshi', name: '权顺荣', stageName: 'Hoshi', emoji: '🐯',
    team: 'Performance', desc: '活力老虎', age: 1996, birthYear: 1996, pos: 'Performance队',
    personality: '能量充沛、热情执着、偶尔中二、对舞蹈极度认真',
    loveStyle: '热情攻势型——喜欢就全力以赴，像对待舞蹈一样认真。吃醋时更努力表现自己。',
    traits: '自称老虎(虎浪嘿)、永远在动、对舞蹈极度认真、容易激动、笑声有感染力',
    zodiac: '双子座 ♊', secondCareer: '编舞师', specialties: '编舞、带动气氛、认路（方向感好）',
    appearance: '单眼皮、老虎般的眼神、身材结实、身高约177cm',
    xStory: '分手原因：太专注舞蹈忽略对方。场外X：能接受他热情的女性，因关注度不足分手。这段恋情从未向团内公开。',
    behaviorLogic: '永远在动。能量溢出感染所有人。对舞蹈的认真程度让人肃然起敬。偶尔中二发言（自称老虎），但真诚让人无法嘲笑',
    interactionStyle: '热情直接。好感度≥40 时主动邀你一起做所有事，≥60 时会认真地说"我希望你选我"',
    foodTaboos: ['黄瓜'],
    habits: ['自称老虎（虎浪嘿）', '永远在动，坐不住', '对舞蹈极度认真到忘记吃饭', '容易激动', '笑声极具感染力', '方向感很好', '练习完会多吃一碗饭', '自称老虎没人理也会继续'],
    catchphrases: ['虎浪嘿！', '我是老虎不是仓鼠', '再来一遍', '练习！', '孩子们集合！'],
    collections: ['老虎周边', '舞鞋', '运动装备', '帽子'],
    sleepHabits: '入睡很快，但睡眠浅；经常因练舞太累而倒头就睡；偶尔说梦话；睡姿多变',
    foodPreferences: '喜欢肉、米饭、能量棒；不挑食但讨厌黄瓜；因练舞常忘记吃饭；喜欢喝能量饮料',
    quirks: ['自称老虎但最怕蟑螂', '跳舞时忘记时间', '哭起来没有声音', '对舞蹈认真到让人肃然起敬', '偶尔中二但真诚', '热情溢出', '自称老虎但被蟑螂吓得跳起来', '哭的时候没有声音眼泪大颗大颗掉', '跳舞时太专注踩到别人脚自己先喊痛', '认真宣传"虎浪嘿"不管对方是否接梗'],
    fears: ['蟑螂', '舞蹈跳不好', '被忽视', '独处', '一个人吃饭'],
    comforts: ['跳舞', '和成员们一起练习', '吃妈妈做的饭', '运动', '听节奏感强的音乐'],
    height: '177cm',
    mbti: 'INFP/INTJ',
    bloodType: 'B',
    birthPlace: '京畿道南杨州市',
    nicknameOrigin: '名字"虎视"（호시）的韩语发音，意为老虎的视线；也取自日文"星"（ほし）',
    signatureBehaviors: ['自称"虎浪嘿"不管对方是否接梗', '跳舞太专注踩到别人脚先喊痛', '哭时无声音眼泪大颗掉', '被蟑螂吓得跳起来']
  },
  {
    id: 'wonwoo', name: '全圆佑', stageName: 'Wonwoo', emoji: '🦊',
    team: 'Hip-hop', desc: '低音炮·眼镜美男', age: 1996, birthYear: 1996, pos: 'Hip-hop队',
    personality: '外冷内热、理性克制、思维深邃、偶尔腹黑',
    loveStyle: '理性克制型——心动也会先冷静分析。越压抑越容易失控。吃醋时用毒舌或冷淡掩饰，眼神藏不住。',
    traits: '推眼镜习惯、低音炮嗓音突出、熬夜打游戏、喜欢在阳台发呆',
    zodiac: '巨蟹座 ♋', secondCareer: '游戏公司策划', specialties: '摄影、围棋、观察细节',
    appearance: '戴眼镜、深色头发、低音炮气质、身高约182cm、常穿深色系',
    xStory: '分手原因：沟通不足导致渐行渐远。表面放下但保留所有聊天记录。场外X：知性型女性，性格不合分手。这段恋情从未向团内公开。',
    behaviorLogic: '表面冷淡实则观察一切。话少但每句精准。在集体中倾向于坐在角落，但眼神比任何人都敏锐',
    interactionStyle: '安静但存在感强。好感度≥40 时开始主动开启话题，≥60 时会在深夜发来一条简短的"还没睡？"',
    foodTaboos: ['海鲜', '贝类'],
    habits: ['推眼镜', '熬夜打游戏', '在阳台发呆（通常是凌晨两点）', '保留所有聊天记录（包括群聊）', '说话少但精准', '坐在角落观察一切', '整理癖但对床妥协', '被夸时会抿嘴笑'],
    catchphrases: ['...', '嗯', '无所谓', '还不错', '你还没睡？'],
    collections: ['游戏', '眼镜', '摄影器材', '书籍'],
    sleepHabits: '熬夜型，凌晨两点还在打游戏或发呆；入睡困难；喜欢把床让给电脑，自己睡客厅；睡眠质量差',
    foodPreferences: '喜欢便利店食物、拉面、炸鸡；讨厌海鲜和贝类；喜欢喝冰美式；饮食不规律',
    quirks: ['推眼镜时很性感', '把床让给电脑自己睡客厅', '保留所有聊天记录', '表面冷淡实则观察一切', '话少但精准', '毒舌但关心人', '推眼镜是思考的标志', '把床让给电脑自己睡客厅沙发', '毒舌完下一秒若无其事地帮你忙', '笑容露牙龈但自己不知道', '被夸时会抿嘴笑'],
    fears: ['被误解', '失去', '海鲜', '表达感情'],
    comforts: ['打游戏', '在阳台发呆', '摄影', '听音乐', '深夜独处的时光'],
    height: '182cm',
    mbti: 'INFJ/INFP',
    bloodType: 'A',
    birthPlace: '庆尚南道昌原市',
    nicknameOrigin: '本名全圆佑（전원우），"圆佑"意为"圆满地守护"',
    signatureBehaviors: ['推眼镜是思考的标志', '把床让给电脑自己睡沙发', '毒舌完下一秒若无其事地帮你', '被夸时会抿嘴笑']
  },
  {
    id: 'woozi', name: '李知勋', stageName: 'Woozi', emoji: '🍚',
    team: 'Vocal', desc: '天才制作人', age: 1996, birthYear: 1996, pos: 'Vocal队·SEVENTEEN主制作人',
    personality: '专注执着、外冷内热、不善表达、内心柔软',
    loveStyle: '笨拙深情型——用奇怪方式表达好感：突然给对方听自己写的歌。吃醋时把自己关工作间写歌。',
    traits: '个子不高气场强、工作时完全沉浸、偶尔孩子气笑容、对在意的人很温柔',
    zodiac: '天蝎座 ♏', secondCareer: '作曲/制作人', specialties: '多乐器、作词作曲、剪辑',
    appearance: '个子不高但气场强、精致五官、工作时戴耳机、身高约166cm',
    xStory: '分手原因：太沉浸工作忽略对方。场外X：理解他但最终疲惫的女性。这段恋情从未向团内公开。',
    behaviorLogic: '大部分时间沉浸在工作中。不擅长社交但并非冷漠——只是不知道怎么说。用音乐表达情感比用语言更流畅',
    interactionStyle: '笨拙但真诚。好感度≥40 时会在你附近多待一会儿，≥60 时会为你写一首歌',
    foodTaboos: ['蔬菜', '青椒'],
    habits: ['工作到完全沉浸', '写歌时戴耳机（已用四年）', '写歌卡住时用铅笔敲桌面', '个子不高但气场填满房间', '对在意的人温柔', '偶尔孩子气笑容', '笑的时候眼睛会消失', '吃饭时看节目但不跟别人聊天'],
    catchphrases: ['嗯...', '这个不错', '我写了首歌', '你听听', '我先去工作'],
    collections: ['耳机', '乐器', '作曲笔记', '铅笔'],
    sleepHabits: '工作到很晚才睡；睡眠质量差；因灵感常在深夜工作；睡姿蜷缩',
    foodPreferences: '喜欢肉、米饭、拉面；讨厌蔬菜和青椒；因工作常忘记吃饭；喜欢喝能量饮料',
    quirks: ['写歌卡住时敲桌面（节奏固定）', '工作时戴的耳机已用四年', '对乐器极其熟悉', '不善表达但用音乐说话', '孩子气笑容', '工作时会忘记时间', '写歌卡住时用铅笔敲桌面有固定节奏', '笑的时候眼睛会消失', '吃饭时看节目但绝对不跟别人聊天', '说自己社恐但在台上气场拉满'],
    fears: ['灵感枯竭', '被误解', '表达感情', '高处'],
    comforts: ['写歌', '弹钢琴', '工作间的独处', '听音乐', '和成员们讨论音乐'],
    height: '166cm',
    mbti: 'INFJ/INTJ',
    bloodType: 'A',
    birthPlace: '釜山广域市',
    nicknameOrigin: '取自"우지"（woozi），意为"我们的音乐"',
    signatureBehaviors: ['写歌卡住时用铅笔敲桌面固定节奏', '笑的时候眼睛会消失', '说自己社恐但在台上气场拉满', '吃饭时看节目但不跟别人聊天']
  },
  {
    id: 'dk', name: '李硕珉', stageName: 'DK', emoji: '☀️',
    team: 'Vocal', desc: '阳光主唱', age: 1997, birthYear: 1997, pos: 'Vocal队·主唱',
    personality: '阳光开朗、共情力强、笑点低、偶尔感性',
    loveStyle: '温暖陪伴型——用持续温暖包围对方。好感表现为"把最多的笑容留给你"。吃醋时笑不出来是最大信号。',
    traits: '标志性大笑、唱歌时判若两人、容易哭、对食物有执念、会突然感性爆发',
    zodiac: '水瓶座 ♒', secondCareer: '音乐剧演员', specialties: '唱歌、活跃气氛、模仿',
    appearance: '阳光笑容、大白牙、身材修长、身高约179cm',
    xStory: '分手原因：对方觉得他对所有人都一样好。场外X：开朗型女性，因"他太忙"分手。这段恋情从未向团内公开。',
    behaviorLogic: '笑声是所有人的背景音。能瞬间活跃气氛，也能在关键时刻安静下来认真倾听。情感丰富——笑和哭都来得很快',
    interactionStyle: '温暖治愈。好感度≥40 时主动逗你笑，≥60 时会突然感性爆发说"你知道吗，我真的很喜欢和你在一起"',
    foodTaboos: [],
    habits: ['标志性大笑', '唱歌时判若两人', '容易哭', '对食物有执念', '感性爆发', '配合尹净汉玩游戏', '唱歌前偷偷清嗓子', '生气时笑得更大声'],
    catchphrases: ['哈哈哈哈', '太棒了', '我要哭了', '你还好吗', '我会一直支持你', '我会一直陪着你'],
    collections: ['麦克风', '搞笑贴纸', '拼图', '音乐剧DVD'],
    sleepHabits: '睡眠质量很好；喜欢配合尹净汉的游戏；睡觉老实；容易因感性而失眠',
    foodPreferences: '喜欢各种食物，尤其喜欢烤肉、火锅；不挑食；喜欢喝可乐；容易饿',
    quirks: ['容易哭但从不承认', '唱歌前偷偷清嗓子', '生气时大声笑（笑得越开心越生气）', '标志性大笑有感染力', '感性爆发说来就来', '对食物异常执着', '哭的时候头仰着不让眼泪掉下来但还是会掉', '唱歌前偷偷清嗓子以为没人发现', '生气时笑得越大声越生气', '听到感人的话嘴角先往下撇再往上翘'],
    fears: ['安静', '被误解', '失去笑容', '独自一人'],
    comforts: ['唱歌', '和成员们在一起', '吃东西', '看搞笑视频', '逗别人笑'],
    height: '179cm',
    mbti: 'ISFJ',
    bloodType: 'O',
    birthPlace: '京畿道龙仁市水枝区',
    nicknameOrigin: 'DK是"Dokyeom（도겸）"缩写，"道兼"意为"兼顾多条道路"',
    signatureBehaviors: ['哭时仰头不让眼泪掉下来但还是会掉', '唱歌前偷偷清嗓子以为没人发现', '生气时笑得越大声越生气', '听到感人的话嘴角先撇后翘']
  },
  {
    id: 'mingyu', name: '金珉奎', stageName: 'Mingyu', emoji: '🐶',
    team: 'Hip-hop', desc: '门面大狗狗', age: 1997, birthYear: 1997, pos: 'Hip-hop队',
    personality: '热情开朗、细心体贴、偶尔冒失、情绪外露',
    loveStyle: '直球进攻型——喜欢就表现出来，不玩暧昧。吃醋时会直接问"你和他刚才在聊什么"。',
    traits: '做饭时哼歌、身高187cm、笑时眼睛眯成线、容易脸红、力气大动作温柔',
    zodiac: '白羊座 ♈', secondCareer: '料理师/餐厅主理人', specialties: '料理、手工、篮球',
    appearance: '身高187cm、大长腿、笑起来眼睛眯成线、阳光帅气、像大狗狗',
    xStory: '分手原因：太忙而对方需要更多陪伴。场外X：活泼型女性，聚少离多分手。这段恋情从未向团内公开。',
    behaviorLogic: '热情外放，想到什么就做什么。喜欢照顾人，尤其是做饭。情绪写在脸上，开心时哼歌，不开心时沉默',
    interactionStyle: '温暖直接。好感度≥40 时主动做饭给你吃，≥60 时会记住你的口味偏好并专门准备',
    foodTaboos: [],
    habits: ['做饭时哼歌', '情绪写在脸上', '开心时哼歌，不开心时沉默', '力气大但动作温柔', '容易脸红', '喜欢照顾人', '洗手洗很多次且必须擦干', '做饭一定要别人试吃并问好不好吃'],
    catchphrases: ['让我来', '我来做', '你想吃什么', '交给我', '别担心', '好吃吗'],
    collections: ['料理工具', '篮球', '手工材料', '帽子'],
    sleepHabits: '入睡快，但睡眠浅；容易因兴奋或担心而失眠；喜欢大字型睡姿',
    foodPreferences: '喜欢各种食物，尤其喜欢做料理；喜欢尝试新食谱；喜欢喝冰美式；不挑食',
    quirks: ['做饭时哼同一首歌', '手指很长但握东西很用力', '容易脸红从耳朵开始', '情绪完全写在脸上', '力气大但动作温柔', '喜欢照顾人', '做起事来太投入听不见别人叫他', '脸红从耳朵开始蔓延到脖子', '刚睡醒头发乱得夸张但本人不在意', '做饭一定要人夸才罢休'],
    fears: ['被忽视', '黑暗', '独处', '蜘蛛', '鬼怪'],
    comforts: ['做饭', '打篮球', '做手工', '和成员们吃饭', '听音乐'],
    height: '187cm',
    mbti: 'ENFJ/ENTJ',
    bloodType: 'B',
    birthPlace: '京畿道安养市',
    nicknameOrigin: '本名金珉奎（김민규）',
    signatureBehaviors: ['做事太投入听不见别人叫他', '脸红从耳朵开始蔓延到脖子', '刚睡醒头发乱但不在意', '做饭一定要人夸才罢休']
  },
  {
    id: 'the8', name: '徐明浩', stageName: 'The8', emoji: '🐸',
    team: 'Performance', desc: '艺术灵魂', age: 1997, birthYear: 1997, pos: 'Performance队',
    personality: '艺术气质、内心丰富、外表清冷、对熟人温柔',
    loveStyle: '灵魂共鸣型——追求精神层面契合。好感表现为"开始和你分享他的世界"。吃醋时会画画或编舞表达。',
    traits: '时尚感突出、对茶道有研究、画画很好、舞蹈风格独特、偶尔说出哲学般的话',
    zodiac: '天蝎座 ♏', secondCareer: '当代艺术家', specialties: '绘画、冥想、茶道',
    appearance: '时尚感突出、清冷气质、身材修长、身高约180cm',
    xStory: '分手原因：精神层面渐行渐远。场外X：艺术相关女性，精神共鸣减弱分手。这段恋情从未向团内公开。',
    behaviorLogic: '外表清冷疏离，内心世界极其丰富。用艺术表达情感——画画、编舞、茶道。对熟人温柔得判若两人',
    interactionStyle: '安静深沉。好感度≥40 时开始和你聊艺术和人生，≥60 时会为你画一幅画',
    foodTaboos: ['芒果'],
    habits: ['画画时用左手压着纸', '茶道练习', '冥想', '偶尔说出哲学般的话', '时尚感突出', '舞蹈风格独特', '泡茶时做"嘘"的手势', '外表清冷但自拍笑得很甜'],
    catchphrases: ['我觉得...', '艺术是...', '茶道', '冥想', '你看这个'],
    collections: ['画材', '茶具', '冥想用品', '时尚单品'],
    sleepHabits: '冥想后入睡；喜欢安静环境；有时会因思考而失眠；睡姿优雅',
    foodPreferences: '喜欢中式茶点、清淡食物；喜欢喝茶；讨厌芒果；饮食清淡',
    quirks: ['画画时左手压纸', '茶道师傅是七十岁老奶奶', '说哲学话前先停顿三秒', '外表清冷对熟人温柔', '时尚感极强', '舞蹈风格独特', '说哲理的话前会停顿三秒制造仪式感', '泡茶时别人说话先做"嘘"的手势', '外表清冷但对镜自拍时笑得很甜'],
    fears: ['被误解', '精神孤独', '失去艺术灵感', '高处'],
    comforts: ['画画', '泡茶', '冥想', '跳舞', '和成员们讨论艺术'],
    height: '180cm',
    mbti: 'INFJ/INTJ',
    bloodType: 'O',
    birthPlace: '中国辽宁省海城市',
    nicknameOrigin: '8横过来是无限符号（∞），在中文文化中8是幸运数字',
    signatureBehaviors: ['说哲理的话前停顿三秒制造仪式感', '泡茶时先做"嘘"手势', '外表清冷但自拍笑得很甜']
  },
  {
    id: 'seungkwan', name: '夫胜宽', stageName: 'Seungkwan', emoji: '🍊',
    team: 'Vocal', desc: '综艺天才', age: 1998, birthYear: 1998, pos: 'Vocal队',
    personality: '幽默风趣、高敏感、表面活泼内心细腻、胜负欲强',
    loveStyle: '傲娇掩饰型——喜欢时用拌嘴吐槽掩饰，越在意越毒舌。好感表现为"嘴上嫌弃但行动最照顾你"。',
    traits: '反应极快、模仿一流、吐槽精准无恶意、私下很安静、对济州岛有执念、容易水肿',
    zodiac: '摩羯座 ♑', secondCareer: '综艺人/主持人', specialties: '唱歌、济州岛方言、活跃气氛',
    appearance: '圆脸、表情丰富、济州岛橘子般的亲和力、身高约174cm',
    xStory: '分手原因：用搞笑掩饰真心，对方感受不到安全感。场外X：能看穿他内心的女性，沟通不畅分手。这段恋情从未向团内公开。',
    behaviorLogic: '综艺感爆棚——吐槽精准、模仿一流、反应极快。但私下很安静。用搞笑掩饰真心，越认真的事越用玩笑包裹',
    interactionStyle: '毒舌但温暖。好感度≥40 时吐槽你最多但也最照顾你，≥60 时会罕见地认真说"我其实……算了当我没说"',
    foodTaboos: [],
    habits: ['反应极快', '模仿一流', '吐槽精准', '私下安静', '对济州岛有执念', '容易水肿', '济州岛方言累时崩出来', '笑到一半突然静音'],
    catchphrases: ['哎哟', '真是的', '你们这些人', '济州岛', '我要水肿了'],
    collections: ['济州岛橘子', '搞笑道具', '综艺DVD', '济州岛特产'],
    sleepHabits: '私下很安静；睡觉很老实；容易因压力而失眠；水肿时早上喝冰美式消肿',
    foodPreferences: '喜欢济州岛橘子、酱蟹、大酱汤；容易水肿；喜欢喝冰美式消肿；喜欢甜食',
    quirks: ['济州岛方言累的时候露出来', '水肿时早上喝冰美式', '吐槽最狠的人往往是他在意的人', '私下很安静', '反应极快', '模仿一流', '济州岛方言累的时候自动崩出来', '水肿时边喝冰美式边捏自己的脸', '吐槽最狠的人往往是他最在意的人', '笑到一半突然静音然后又开始笑'],
    fears: ['被误解真心', '水肿', '失去综艺感', '被忽视', '冷场'],
    comforts: ['济州岛橘子', '和成员们搞笑', '唱歌', '模仿别人', '回济州岛'],
    height: '174cm',
    mbti: 'ENFP',
    bloodType: 'B',
    birthPlace: '釜山广域市（济州岛长大）',
    nicknameOrigin: '本名夫胜宽（부승관）',
    signatureBehaviors: ['济州岛方言累时自动崩出来', '水肿时边喝冰美式边捏脸', '吐槽最狠的人是在意的人', '笑到一半突然静音又笑']
  },
  {
    id: 'vernon', name: '崔瀚率', stageName: 'Vernon', emoji: '🦅',
    team: 'Hip-hop', desc: '混血美男·4D灵魂', age: 1998, birthYear: 1998, pos: 'Hip-hop队',
    personality: '自由随性、思维跳跃、真诚直率、四次元',
    loveStyle: '自然流露型——不刻意追求也不刻意回避。好感表现为"愿意和你分享他的世界"。吃醋时直接沉默或走开。',
    traits: '多语混用、走路有自己节奏、经常放空、突然说出发人深省的话、对音乐极其认真',
    zodiac: '水瓶座 ♒', secondCareer: '独立音乐人/DJ', specialties: '说唱、滑板、独特视角',
    appearance: '混血五官、深邃眼神、独特气质、身高约178cm',
    xStory: '分手原因：对方无法理解他的世界。场外X：艺术型女性，精神层面渐行渐远分手。这段恋情从未向团内公开。',
    behaviorLogic: '不按常理出牌。对话中可能突然跳到一个完全不同的主题。不刻意社交，但真诚让人无法讨厌',
    interactionStyle: '随性自然。好感度≥40 时会和你分享他正在听的歌，≥60 时会罕见地认真表达',
    foodTaboos: ['花生', '坚果'],
    habits: ['多语混用', '走路有自己节奏', '经常放空', '突然说出深奥的话', '对音乐极其认真', '不刻意社交', '走路有自己的节奏', '放空时眼神像在看另一个世界'],
    catchphrases: ['随便', '无所谓', '还行', '听这个', '随便你'],
    collections: ['黑胶唱片', '滑板', '帽子', '独立音乐'],
    sleepHabits: '睡眠质量好；喜欢放空；容易因灵感而突然醒来；睡姿随意',
    foodPreferences: '喜欢美式食物、汉堡、披萨；讨厌花生和坚果（过敏）；喜欢喝冰美式；饮食随意',
    quirks: ['走路有自己节奏（踩不准节拍）', '放空时像在看另一个世界', '对音乐认真程度和平常判若两人', '多语混用', '思维跳跃', '不刻意社交', '走路有自己的节奏（踩不准但很自洽）', '放空时眼神像在看另一个次元', '认真程度和平常判若两人反差极大'],
    fears: ['被束缚', '失去自由', '花生过敏', '表达感情'],
    comforts: ['听音乐', '滑板', '放空', '独自创作', '和成员们随性聊天'],
    height: '178cm',
    mbti: 'ISTP/ENTP',
    bloodType: 'A',
    birthPlace: '美国纽约州纽约市',
    nicknameOrigin: '母亲填写出生证明时姓氏拼错为Chwe，艺名取自"春"的谐音',
    signatureBehaviors: ['走路有自己的节奏（踩不准但自洽）', '放空时眼神像在看另一个世界', '认真程度和平常判若两人']
  },
  {
    id: 'dino', name: '李灿', stageName: 'Dino', emoji: '🦦',
    team: 'Performance', desc: '全能忙内', age: 1999, birthYear: 1999, pos: 'Performance队·SEVENTEEN忙内',
    personality: '努力上进、自信阳光、偶尔撒娇、渴望被认可',
    loveStyle: '年下直进型——不在意年龄差，喜欢就直接表达。好感表现为"在你面前格外认真"。吃醋时直接说"我不喜欢那样"。',
    traits: '永远在练习、认真时皱眉、撒娇时反差极大、舞蹈实力超强',
    zodiac: '水瓶座 ♒', secondCareer: '舞者/编舞助理', specialties: '舞蹈、模仿哥哥们、学习能力强',
    appearance: '阳光少年感、永远在动、认真时皱眉、身高约174cm',
    xStory: '分手原因：对方觉得他不够成熟。场外X：同龄或年下女性，因"他太忙且不够成熟"分手。这段恋情从未向团内公开。',
    behaviorLogic: '永远在练习。渴望被认可，认真时皱眉的样子让人心疼。偶尔撒娇——在年长者面前还是忙内，但在你面前想被当成男人',
    interactionStyle: '阳光直进。好感度≥40 时在你面前格外认真表现，≥60 时会直接说"我真的很喜欢你"',
    foodTaboos: [],
    habits: ['永远在练习', '认真时皱眉', '撒娇反差极大', '模仿哥哥们', '学习能力强', '渴望被认可', '练习到忘记吃饭被哥哥们抓回来', '睡前会复盘今天的练习'],
    catchphrases: ['练习！', '再来一遍', '哥哥们', '我想做好', '让我来'],
    collections: ['舞蹈视频', '哥哥们的模仿素材', '练习用品', '帽子'],
    sleepHabits: '因练习太累而快速入睡；睡眠浅；容易因压力而失眠；睡姿蜷缩',
    foodPreferences: '喜欢各种食物，尤其喜欢肉、米饭；不挑食；喜欢喝能量饮料；容易饿',
    quirks: ['认真时皱眉像个大人', '撒娇只在信任的人面前', '模仿哥哥们的精髓在语气', '永远在练习', '学习能力强', '渴望被认可', '撒娇前先看周围有没有人', '厕所唱歌被哥哥们录下来', '认真时皱眉的样子被说像大叔', '练习到忘记吃饭被哥哥们抓回来'],
    fears: ['被说不够成熟', '舞蹈跳不好', '被哥哥们忽视', '独处'],
    comforts: ['跳舞', '练习', '和哥哥们在一起', '被认可', '模仿哥哥们'],
    height: '174cm',
    mbti: 'INFJ',
    bloodType: 'A',
    birthPlace: '全罗北道益山市',
    nicknameOrigin: '艺名Dino取自"恐龙"（Dinosaur），实为"做到极致"之意',
    signatureBehaviors: ['撒娇前先看周围有没有人', '厕所唱歌被哥哥们录下来', '认真时皱眉被说像大叔', '练习到忘记吃饭被哥哥们抓回来']
  }
];

export var SECRET_MISSIONS = {
  // 仅 Day2（常规上午）+ Day7（上午空闲，傍晚 questionBox 占用）可触发；
  // Day5/10 为约会日、Day7 曾被强制任务日排除，原 8 个任务里仅 Day2 的 2 个能触发，其余为死数据，已删除。
  2: [
    { id: 'sm_d2_1', type: 'interaction', title: '破冰微笑', desc: '让某位成员在今天上午主动对你笑一次。', targetType: 'any', hint: '试着主动开启一个轻松的话题。' },
    { id: 'sm_d2_2', type: 'info', title: '职业探秘', desc: '在对话中套出金珉奎的第二职业，不能直问。', targetType: 'member', targetId: 'mingyu', hint: '聊聊大家最近都在忙什么。' }
  ],
  7: [
    { id: 'sm_d7_1', type: 'exploration', title: '寻宝游戏', desc: '在集体外出时，找到「那个蓝色的马克杯」并提及它。', targetType: 'none', hint: '仔细观察周围环境中的小物件。' },
    { id: 'sm_d7_2', type: 'interaction', title: '意外助攻', desc: '在集体活动中，让崔胜澈主动为你做一件事（递水、拿东西等）。', targetType: 'member', targetId: 'scoups', hint: '制造一个需要被照顾的小契机。' }
  ]
};

// 心动笔记模板：index 0/1/2 对应好感度阈值 40/60/80（affection.js 解锁），index 3/4 对应秘密任务解锁（parser.js）
export var HEART_NOTE_TEMPLATES = {
  scoups:    ['他其实怕黑，但从来不说。', '他紧张时会摸后颈，那是他心虚的标志。', '他写歌时会无意识哼同一段旋律。', '他睡前一定要整理第二天的行程。', '他自称实权队长但最怕尹净汉。'],
  jeonghan:  ['他的长发扎起来只需要三秒钟。', '他擅长读心，但最怕被人读懂。', '他靠在沙发上睡着时，呼吸声很轻。', '他选择困难症严重时会买整套。', '他养了一只叫"石小净"的宠物石头。'],
  joshua:    ['他的吉他拨片总是放在左口袋。', '他说冷笑话前会先抿一下嘴角。', '他祈祷时会下意识闭上左眼。', '他优雅但有原则。', '他偶尔会突然说出让人措手不及的直球。'],
  jun:       ['他安静时像幅画，连呼吸都没有声音。', '他对螺蛳粉的执念来自某次深夜。', '他练武术留下的旧伤在阴雨天会疼。', '他像猫一样喜欢高处。', '他安静时像一幅画。'],
  hoshi:     ['他自称老虎，但最怕蟑螂。', '他跳舞时会忘记时间，也忘记吃饭。', '他的笑声有感染力，但哭起来没声音。', '他中二但真诚。', '他热情溢出让人无法拒绝。'],
  wonwoo:    ['他熬夜打游戏时喜欢把眼镜推得很高。', '他的阳台发呆时间通常是凌晨两点。', '他保留所有聊天记录，包括群聊。', '他把床让给电脑自己睡客厅。', '他表面冷淡实则观察一切。'],
  woozi:     ['他工作时戴的那副耳机已经用了四年。', '他写歌卡住时会用铅笔敲桌面，节奏固定。', '他个子不高，但气场能填满整个房间。', '他写歌卡住时敲桌面的节奏是固定的。', '他用音乐表达比用语言更流畅。'],
  dk:        ['他容易哭，但从不承认。', '他唱歌前会偷偷清嗓子，以为没人听见。', '他生气时会大声笑，笑得越开心越生气。', '他标志性大笑有感染力。', '他感性爆发说来就来。'],
  mingyu:    ['他做饭时哼的歌总是同一首。', '他的手指很长，但握东西很用力。', '他容易脸红，从耳朵开始红。', '他情绪完全写在脸上。', '他力气大但动作温柔。'],
  the8:      ['他画画时习惯用左手压着纸。', '他的茶道师傅是一位七十岁的老奶奶。', '他说哲学话时会先停顿三秒。', '他外表清冷对熟人温柔。', '他时尚感极强。'],
  seungkwan: ['他的济州岛方言在累的时候会露出来。', '他水肿时早上要喝冰美式才能消肿。', '他吐槽最狠的人，往往是他在意的人。', '他私下其实很安静。', '他反应极快模仿一流。'],
  vernon:    ['他走路有自己的节奏，踩不准节拍。', '他放空时的眼神像在看另一个世界。', '他对音乐的认真程度和平时判若两人。', '他多语混用。', '他思维跳跃不刻意社交。'],
  dino:      ['他认真时会皱眉，像个大人。', '他撒娇只会在很信任的人面前。', '他模仿哥哥们时的精髓在语气而不是动作。', '他永远在练习。', '他渴望被认可。']
};

// ==================== 任务卡系统（10张） ====================
export var MISSION_CARDS = [
  { id: 'mc_1', name: '沉默游戏', desc: '从现在起 1 小时内，你不能和你的好感对象说话。违者罚酒 1 杯。', dayMin: 3, dayMax: 10, phase: 'any', type: 'action' },
  { id: 'mc_2', name: '换位晚餐', desc: '今晚你必须坐在你最少接触的成员旁边吃饭。', dayMin: 3, dayMax: 10, phase: 'evening', type: 'action' },
  { id: 'mc_3', name: '真心话抽取', desc: '从盒子里抽一张问题卡，必须如实回答。', dayMin: 3, dayMax: 10, phase: 'any', type: 'input', inputLabel: '你抽到的问题 & 你的回答' },
  { id: 'mc_4', name: '一日经纪人', desc: '为一位成员完成一个私人请求。晚餐前完成。', dayMin: 3, dayMax: 10, phase: 'afternoon', type: 'action' },
  { id: 'mc_5', name: '秘密信号', desc: '对指定成员做一个只有你们懂的暗号/动作。如果他识别并回应了，任务成功。', dayMin: 4, dayMax: 10, phase: 'any', type: 'action' },
  { id: 'mc_6', name: '交换物品', desc: '从身上取下一件物品，和一位成员交换。直到明天才能归还。', dayMin: 3, dayMax: 10, phase: 'any', type: 'input', inputLabel: '你想交换什么物品 & 交换对象' },
  { id: 'mc_7', name: '三行诗', desc: '以某位成员的名字为题，即兴作一首三行诗。', dayMin: 3, dayMax: 10, phase: 'any', type: 'input', inputLabel: '你的三行诗（写给谁）' },
  { id: 'mc_8', name: '幕后采访', desc: '去采访间录制一段 30 秒的视频，说出今天让你心动的一个瞬间。制作组会播给所有人看。', dayMin: 5, dayMax: 10, phase: 'evening', type: 'input', inputLabel: '你想在采访里说的话' },
  { id: 'mc_9', name: '双人任务', desc: '和 X 一起完成一道菜/一项家务。期间不准谈感情话题。', dayMin: 3, dayMax: 10, phase: 'afternoon', type: 'action' },
  { id: 'mc_10', name: '最终告白预演', desc: '写一张纸条，假设今天是最后一天，你会选择和谁一起离开？不用署名，放进信箱。制作组会在晚餐时匿名朗读。', dayMin: 8, dayMax: 11, phase: 'evening', type: 'input', inputLabel: '你在纸条上写的内容' }
];

// ==================== 随机日常事件池（共 18 项） ====================
export var RANDOM_EVENTS_POOL = [
  // 日常暖色（11项，re_2 空调坏了含四季变体）
  { id: 're_1', name: '快递到了', desc: '某成员收到包裹，是家人/朋友寄来的东西，引发关于家的闲聊', cond: 'day>=2', weight: 1 },
  { id: 're_2_spring', name: '空调坏了', desc: '初春小屋空调时好时坏，忽冷忽热，全员裹着薄毯调试温度', cond: "season==spring", weight: 1 },
  { id: 're_2_summer', name: '空调坏了', desc: '盛夏小屋空调故障，全员被迫聚在客厅汗蒸', cond: "season==summer", weight: 1 },
  { id: 're_2_autumn', name: '空调坏了', desc: '秋燥时节空调调试静电噼啪，全员围着取暖器闲聊', cond: "season==autumn", weight: 1 },
  { id: 're_2_winter', name: '空调坏了', desc: '寒冬小屋空调故障，全员被迫裹毯子聚在客厅', cond: "season==winter", weight: 1 },
  { id: 're_3', name: '停水了', desc: '傍晚停水，全员去便利店买水，路上自然聊天', cond: 'phase==evening', weight: 1 },
  { id: 're_4', name: '一只猫跑进来', desc: '流浪猫从窗户跳入，怕猫的成员躲到某人身后', cond: 'day>=3', weight: 1 },
  { id: 're_5', name: '外卖惊喜', desc: '制作组点了炸鸡/夜宵，喝酒聊天', cond: 'phase==night', weight: 1 },
  { id: 're_6', name: '拍立得时间', desc: '制作组拿出一台拍立得，让全员合影/自拍', cond: 'phase==afternoon', weight: 1 },
  { id: 're_7', name: '晨间广播放歌', desc: '某成员的歌/自作曲通过广播播放，全员反应', cond: 'phase==morning', weight: 1 },
  { id: 're_8', name: '晚霞特别美', desc: '所有人不约而同到阳台看日落，自动触发闲聊', cond: 'phase==evening&&weather==晴朗', weight: 1 },
  // 情感冲击 5项
  { id: 're_9', name: '前任的旧物', desc: '你发现自己带来的某件物品（以为是自己的）其实是 X 当年送的', cond: 'day>=3', weight: 1 },
  { id: 're_10', name: '撞见旧伤', desc: '某成员注意到你身上的旧伤疤/痕迹，追问来历', cond: 'day>=4', weight: 1 },
  { id: 're_11', name: '成员也失眠', desc: '深夜你发现另一位成员也没睡，在客厅/阳台相遇', cond: 'phase==night', weight: 1 },
  { id: 're_12', name: '电话打错了', desc: '某个成员误拨了你的电话', cond: 'day>=4', weight: 1 },
  { id: 're_13', name: '酒后的坦白', desc: '某成员喝到微醺，对着你说出一段关于过去的话', cond: 'memberDrinkCount>=1', weight: 1 },
  // 戏剧冲突 2项
  { id: 're_14', name: '公开的信', desc: '制作组误将一封私人信件当成 X 记忆物品公开，内容让全场沉默', cond: 'day>=4&&day<=6', weight: 1 },
  { id: 're_15', name: '有人哭了', desc: '晚餐时某位成员突然情绪崩溃离席，全员沉默', cond: 'day>=5', weight: 1 }
];

// [P0-3] Day 11 真心话问题卡（18张）
export var TRUTH_CARDS = [
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

export var GIFT_TEMPLATES = [
  { type: 'handcraft', name: '手作手链', desc: '一条用细绳编织的手链，看起来是亲手做的。' },
  { type: 'handcraft', name: '小挂件', desc: '一个精致的小挂件，挂在包上刚刚好。' },
  { type: 'handcraft', name: '手工钥匙扣', desc: '一个皮质的钥匙扣，边缘有手工缝线的痕迹。' },
  { type: 'food', name: '自制饼干', desc: '装在透明盒子里的一小叠饼干，散发着黄油香气。' },
  { type: 'food', name: '手工巧克力', desc: '几颗形状不太规则的巧克力，但能看出很用心。' },
  { type: 'food', name: '手工果酱', desc: '一小瓶自制果酱，标签上手写着日期。' },
  { type: 'emotion', name: '手写便签', desc: '一张折好的便签，上面写了几行字。' },
  { type: 'emotion', name: '拍立得照片', desc: '一张拍立得照片，记录了这一天的某个瞬间。' },
  { type: 'emotion', name: '手写歌单', desc: '一张手写的歌单，列出了几首歌名。' }
];

// ==================== 成员回礼池（每人8种，随机抽取，同一成员不重复） ====================
export var RETURN_GIFTS = {
  scoups: ['「咖啡畅饮券」手写卡', '车载充电器', '深夜毛毯', '他常吃的解酒药', '手写「明日行程表」便签', '黑色棒球帽（"多买了一顶"）', '黑胶唱片试听邀请卡', '亲手做的紫菜包饭便当'],
  jeonghan: ['一盆多肉植物', '晚安便签', '他编的手绳', '他的眼罩（"多了一个"）', '乐高袖珍积木包', '宠物石「小净」同款小石头', '盲盒花束里的干花束', '冰可可冲剂包（他常喝的）'],
  joshua: ['英文诗集（书签夹在他最喜欢的那页）', '小瓶香水试用', '爵士歌单', '护手霜', '手工皮具钥匙扣', '吉他拨片（"多出来的"）', '自制柠檬水配方卡', '复古明信片套装'],
  jun: ['手工折纸小动物', '螺蛳粉调料包', '武术表演拍立得', '他代言的零食', '深圳老家特产', '自拍小卡（"拍多了"）', '猫耳发箍（玩笑礼物）', '手工编织中国结'],
  hoshi: ['老虎小挂件', '练舞拍立得', '一天陪玩券', '他代言的虎年零食', '虎纹发带', '舞蹈课体验券手写卡', '应援棒同款钥匙扣', '自制虎年贴纸包'],
  wonwoo: ['歌单QR码打印卡', '书签（"多出来的"）', '墨镜（"你上次说好看"）', '便利店随手买的糖果', '复古相机胶片', '游戏兑换码小卡片', '书店印章收集册', '他常戴的银框眼镜清洁布'],
  woozi: ['15秒钢琴旋律录音', '手写歌词纸', '作曲笔记复印件', '耳机分线器', '迷你键盘钥匙扣', '他收藏的CD（"借你听"）', '手绘五线谱便签', '能量饮料兑换券'],
  dk: ['搞笑贴纸', '拼图挂件', '「紧急开心药」小罐子（装糖果）', '他录的手机铃声', '小狗图案眼罩', '迷你小风扇', '他唱的歌demo录音', '搞笑大头贴'],
  mingyu: ['第二天早餐多做一份', '自制小饼干', '保温杯（"看你总喝凉的"）', '他腌的小菜', '手写菜谱卡片', '小狗图案暖手宝', '野餐垫（"下次一起去"）', '他代言的拉面大礼包'],
  the8: ['一幅小水墨画', '中国茶包+手写泡法说明', '冥想歌单', '檀香小样', '毛笔字帖（他写的）', '太极入门指南手册', '中国风书签套装', '海盐薄荷糖'],
  seungkwan: ['你提过一次的零食', '润唇膏（"天气干"）', '暖宝宝', '济州岛橘子酱', '济州岛风景明信片', '综艺推荐清单手写卡', '搞笑模仿音频U盘', '橘子味护手霜'],
  vernon: ['一张空白明信片', '独立乐队演出票根', '他的一顶旧帽子', '随机CD', '漫画推荐清单', '滑板贴纸', '英文诗集摘抄卡', '电影票根收藏册'],
  dino: ['手工折纸', '运动发带', '他珍藏的徽章', '自制柠檬水兑奖券', '舞蹈挑战教程手卡', '迷你小夜灯', '偶像小卡卡片包', '亲笔签名拍立得']
};

export var MEMBER_GIFT_PREFERENCE = {
  scoups: 'handcraft',
  jeonghan: 'emotion',
  joshua: 'handcraft',
  jun: 'handcraft',
  hoshi: 'food',
  wonwoo: 'emotion',
  woozi: 'handcraft',
  dk: 'food',
  mingyu: 'food',
  the8: 'handcraft',
  seungkwan: 'emotion',
  vernon: 'emotion',
  dino: 'food'
};

export var PHASES = ['morning', 'afternoon', 'evening', 'night'];
export var PHASE_LABELS = {
  morning: '☀️ 上午',
  afternoon: '🌤 下午',
  evening: '🌅 傍晚',
  night: '🌙 深夜'
};

export var PHASE_BOUNDARIES = {
  morning: '⚠️ 你只写上午的剧情。写到午饭前自然结束。不要写午饭、下午或晚上的任何内容。在午饭前的一个自然停顿点结束。',
  afternoon: '⚠️ 你只写下午的剧情。从午饭后开始，写到晚饭前自然结束。不要写晚饭或晚上的任何内容。在晚饭前的一个自然停顿点结束。',
  evening: '⚠️ 你只写傍晚的剧情。从晚饭前/晚饭中开始，写到睡前自然结束。不要写深夜入睡后的内容。在睡前的一个自然停顿点结束。',
  night: '⚠️ 你只写深夜的剧情。从睡前开始，写到入睡结束。这是今天的最后一个时段。在入睡时结束。'
};

export var PHASE_TONE = {
  morning: '上午氛围：早安、早餐、清晨光线、一天开始。禁止出现"晚安""深夜"等晚间词汇。',
  afternoon: '下午氛围：午后阳光、日常活动。禁止出现"早安""晚安"。',
  evening: '傍晚氛围：黄昏光线、晚餐、放松。禁止出现"早安"。',
  night: '深夜氛围：睡前、静谧、晚安。禁止出现"早安""下午"等词汇。'
};

export var APPEARANCE_TRAITS = ['泪痣','冷白皮','淡颜系','酒窝','小虎牙','双眼皮','高鼻梁','樱桃唇','万人迷','纯欲小白花','童颜巨乳','声音甜软','狐狸眼泪痣','天生媚骨','盈盈一握小蛮腰','病弱易推倒','眉目如画','浓颜系','御姐长相','幼态脸','蜜糖色健康肤','黑长直女神','锁骨精灵骨','腿精大长腿','厌世脸高级感','雀斑氛围感'];
export var PERSONALITY_TRAITS = ['慢热但一旦爱了就全力以赴','社恐小透明','外冷内热','温柔细腻','偶尔毒舌','共情力强','独立要强','活泼开朗','敏感多疑','直率坦诚','浪漫理想主义','务实理性','占有欲强','被动等待型','嘴硬心软','撒娇体质','好奇心旺盛','回避型依恋','讨好型人格','记仇小本本','钓系海后','腹黑绿茶','傲娇大小姐','温柔解语花','疯批美人','软糯甜妹','没心没肺搞笑女','佛系咸鱼','黑莲花心机girl','情绪稳定内核强大','资深颜控','事业脑','恋爱脑重症患者','天然呆无自觉','人间清醒理智挂'];
export var MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
export var PRIVATE_TRAITS = ['怕黑','易醉体质','泪失禁','怕打雷','恐高','晕车体质','海鲜过敏','花粉过敏','姨妈痛','容易脸红','手脚冰凉','容易饿/低血糖','睡觉说梦话','被吓容易尖叫','不能吃辣','喝水容易呛','容易被晒伤','蚊子叮咬过敏','敏感带在耳后','高潮易泣','极品名器','体香醉人'];

// 公开身份（13 种）—— 这是「身份/关系」选择器，决定关系网（哥哥/闺蜜/情敌等），不是职业
export var HEROINE_PUBLIC_IDENTITIES = [
  '站姐/大粉','素人','同公司师妹','女团爱豆','队友的妹妹','财阀千金',
  '品牌方助理','女演员','百万网红博主','超模/平面模特','带货女主播',
  '独立音乐人','体育生/运动员'
];

// 队友的妹妹设定·专用纯职业池（身份固定为「哥哥的妹妹」，职业从本池选，必须能跟队友互动，不含任何身份类项）
export var SISTER_PROFESSIONS = [
  '女团爱豆','练习生','化妆师','造型师','编舞助理','电台PD','综艺作家',
  '品牌方助理','女演员','百万网红博主','超模/平面模特','带货女主播',
  '独立音乐人','体育生/运动员'
];

// 预设人设模板（11 个常用组合）
export var HEROINE_TEMPLATES = [
  { id: 'finance_heiress', name: '财阀千金', publicIdentity: '财阀千金',
    age: 24, appearance: ['眉目如画','冷白皮牛奶肌','御姐长相'],
    personality: ['傲娇大小姐','情绪稳定内核强大'], mbti: 'ENTJ',
    privateTraits: ['怕打雷'] },
  { id: 'secret_idol_fan', name: '暗恋爱豆的女大', publicIdentity: '站姐/大粉',
    age: 21, appearance: ['童颜巨乳','酒窝甜心','幼态脸'],
    personality: ['软糯甜妹','恋爱脑重症患者','慢热但一旦爱了就全力以赴'],
    mbti: 'INFP', privateTraits: ['容易脸红'] },
  { id: 'cool_senior', name: '清冷学姐', publicIdentity: '素人',
    age: 25, appearance: ['厌世脸高级感','浓颜系','黑长直女神'],
    personality: ['人间清醒理智挂','嘴硬心软刀子嘴'],
    mbti: 'INTJ', privateTraits: ['敏感带在耳后'] },
  { id: 'playful_siren', name: '钓系海后', publicIdentity: '超模/平面模特',
    age: 23, appearance: ['天生媚骨','狐狸眼泪痣','御姐长相'],
    personality: ['钓系海后','撒娇体质','事业脑'],
    mbti: 'ENFP', privateTraits: ['体香醉人'] },
  { id: 'sweet_soft', name: '软糯甜妹', publicIdentity: '同公司师妹',
    age: 20, appearance: ['纯欲小白花','声音甜软','幼态脸'],
    personality: ['软糯甜妹','温柔细腻','社恐小透明'],
    mbti: 'ISFJ', privateTraits: ['容易脸红','泪失禁'] },
  { id: 'crazy_beauty', name: '疯批美人', publicIdentity: '女演员',
    age: 26, appearance: ['天生媚骨','浓颜系','厌世脸高级感'],
    personality: ['疯批美人','占有欲强','直率坦诚'],
    mbti: 'ENFJ', privateTraits: ['高潮易泣'] },
  { id: 'funny_girl', name: '没心没肺搞笑女', publicIdentity: '带货女主播',
    age: 22, appearance: ['酒窝甜心','雀斑氛围感','蜜糖色健康肤'],
    personality: ['没心没肺搞笑女','活泼开朗','偶尔毒舌'],
    mbti: 'ESFP', privateTraits: ['易醉体质'] },
  { id: 'scheming_girl', name: '腹黑绿茶', publicIdentity: '品牌方助理',
    age: 24, appearance: ['纯欲小白花','酒窝甜心','盈盈一握小蛮腰'],
    personality: ['腹黑绿茶','温柔解语花','黑莲花心机girl'],
    mbti: 'ENTP', privateTraits: ['敏感带在耳后'] },
  { id: 'indie_musician', name: '独立音乐人', publicIdentity: '独立音乐人',
    age: 27, appearance: ['锁骨精灵骨','厌世脸高级感','冷白皮'],
    personality: ['人间清醒理智挂','外冷内热','浪漫理想主义'],
    mbti: 'INTJ', privateTraits: ['怕黑'] },
  { id: 'influencer', name: '百万网红博主', publicIdentity: '百万网红博主',
    age: 22, appearance: ['万人迷','御姐长相','腿精大长腿'],
    personality: ['钓系海后','撒娇体质','资深颜控'],
    mbti: 'ENFJ', privateTraits: ['体香醉人'] },
  { id: 'gamer_girl', name: '电竞少女', publicIdentity: '体育生/运动员',
    age: 20, appearance: ['蜜糖色健康肤','黑长直女神','幼态脸'],
    personality: ['没心没肺搞笑女','活泼开朗','好奇心旺盛'],
    mbti: 'ESTP', privateTraits: ['易醉体质','容易饿/低血糖'] }
];

// 1v1 专属随机事件池（60个，不依赖时段/day系统，AI根据世界观自然适配）
export var ONE_HEART_RANDOM_EVENTS = [
  // ❤️ 暧昧升温 1-22
  { id: 'ohr_1', name: '不小心碰到手', desc: '两人同时去拿同一个东西，指尖无意触碰，空气突然安静' },
  { id: 'ohr_2', name: '他为你整理头发', desc: '你头发上沾了东西，他自然地伸手帮你拿掉，动作轻柔' },
  { id: 'ohr_3', name: '对视超过三秒', desc: '谈话间突然对视，谁都没有先移开目光' },
  { id: 'ohr_4', name: '他吃醋了', desc: '有别人对你表现出好感，他的反应不自在了' },
  { id: 'ohr_5', name: '他记得你的喜好', desc: '他记住了你随口提过的一句话——喜欢的食物、想去的地方——不经意间就兑现了' },
  { id: 'ohr_6', name: '游戏他故意输了', desc: '你们玩了一个小游戏（打赌/猜拳），他明显故意输给了你' },
  { id: 'ohr_7', name: '拍照时靠很近', desc: '拍照时他自然地靠得很近，你们的肩膀几乎贴在一起' },
  { id: 'ohr_8', name: '一条不像他的消息', desc: '他发来一条不像他会发的消息，你反复看了好几遍' },
  { id: 'ohr_9', name: '过马路拉你一把', desc: '过马路时有车经过，他下意识把你拉到身侧' },
  { id: 'ohr_10', name: '他披了外套给你', desc: '他在你睡着时给你披了件外套，你醒来闻到他的气息' },
  { id: 'ohr_11', name: '他在你耳边说话', desc: '因为环境嘈杂，他俯身在你耳边说话，呼吸拂过耳畔' },
  { id: 'ohr_12', name: '他为你挡阳光', desc: '他用手或身体为你挡住刺眼的阳光，阴影恰好笼住你' },
  { id: 'ohr_13', name: '他叫了很多次你的名字', desc: '他今天叫了你的名字很多次，每一次的语气都不太一样' },
  { id: 'ohr_14', name: '醉酒靠在你肩上', desc: '他喝得微醺，无意中靠在你肩上睡着了，你没有动' },
  { id: 'ohr_15', name: '他看到就想到你', desc: '他送你一份小礼物，说是看到这个自然就想到了你' },
  { id: 'ohr_17', name: '他在你难过时陪着', desc: '你情绪低落时他什么都没问，只是静静坐在你身边' },
  { id: 'ohr_18', name: '他挡在你前面', desc: '遇到突发状况（冲过来的狗/拥挤的人群），他本能地挡在你前面' },
  { id: 'ohr_19', name: '练习约会', desc: '他假装正经地说需要练习约会，一脸认真地问你要不要当搭档' },
  { id: 'ohr_20', name: '为他系领带', desc: '他穿了正装，领带怎么也系不好，站在那里让你帮忙' },
  { id: 'ohr_21', name: '他模仿你说话', desc: '他学你说话的语气和口头禅，学得很像但你假装生气' },
  // ☀️ 日常甜暖 23-38
  { id: 'ohr_23', name: '一起逛超市', desc: '你们一起去超市采购，他自然地接过你手里的购物袋' },
  { id: 'ohr_24', name: '他递外套给你', desc: '他注意到你有点冷，默默把外套递给你' },
  { id: 'ohr_25', name: '一起做手工', desc: '你们一起拼乐高/做手工，他专注的侧脸让你走神' },
  { id: 'ohr_26', name: '他说了冷笑话', desc: '他给你讲了一个冷笑话，自己先笑到说不下去' },
  { id: 'ohr_27', name: '一起看电影', desc: '你们一起看了部电影，他全程都在偷偷看你而非屏幕' },
  { id: 'ohr_28', name: '他教你做一件事', desc: '他教你做某件事（弹琴/跳舞/打游戏），手把手时呼吸交错' },
  { id: 'ohr_29', name: '一起下厨', desc: '你们一起做饭，他在旁边给你递调料打下手，配合默契' },
  { id: 'ohr_30', name: '他分享童年照片', desc: '他翻出小时候的照片/故事和你分享，你看到了他没对别人展示过的一面' },
  { id: 'ohr_31', name: '一起看星星', desc: '你们一起在阳台看星星，他指着夜空讲故事' },
  { id: 'ohr_32', name: '他拍了张照片发你', desc: '他随手拍了张天空/街角的照片发给你，说是刚才想到你' },
  { id: 'ohr_33', name: '同时拿同一样东西', desc: '你们在便利店同时伸手去拿同一样东西，一起笑了' },
  { id: 'ohr_34', name: '他做拿手菜给你吃', desc: '他做了一道拿手菜给你尝，期待地看着你等评价' },
  { id: 'ohr_35', name: '突然下雨共伞', desc: '突然下雨，你们不得不共用一把伞或躲在一个屋檐下' },
  { id: 'ohr_36', name: '他送你到家门口', desc: '天色晚了，他坚持送你到门口，站在路灯下欲言又止' },
  { id: 'ohr_37', name: '一起听歌分耳机', desc: '他分给你一只耳机，歌单里的歌暴露了他此刻的心情' },
  { id: 'ohr_38', name: '比谁能逗对方笑', desc: '他突发奇想要和你比赛——谁先逗对方笑谁赢，结果两个人都输了' },
  { id: 'ohr_16', name: '散步时牵手了', desc: '你们的手在散步时不小心碰到几次后，他牵住了你' },
  { id: 'ohr_22', name: '你身上有他的味道', desc: '你穿了他的外套或用了他的东西，身上全是他的气息' },
  // 🌧 情感冲击 39-50
  { id: 'ohr_39', name: '他提起过去的感情', desc: '他无意中提到了一段过去的感情经历，语气里有未愈合的痕迹' },
  { id: 'ohr_40', name: '看到他的另一面', desc: '你撞见他独自发呆/情绪低落的样子，和平时判若两人' },
  { id: 'ohr_41', name: '他以为你生气了', desc: '因为一个误会，他小心翼翼地来哄你，笨拙却真诚' },
  { id: 'ohr_42', name: '深夜来电', desc: '他深夜打来电话，声音有点不一样，说没什么事就是想听听你的声音' },
  { id: 'ohr_44', name: '发现他在偷看你', desc: '你发现他其实一直在默默注视你，被撞破后慌乱地移开视线' },
  { id: 'ohr_45', name: '他手机里有很多你的照片', desc: '你无意中看到他手机里存了很多你的照片/截图，不知道是什么时候拍的' },
  { id: 'ohr_46', name: '他坦白他变了', desc: '他坦言自己以前不太相信感情，但你让他改变了' },
  { id: 'ohr_47', name: '你会后悔认识我吗', desc: '你问他会不会后悔认识你，他的回答让你久久说不出话' },
  { id: 'ohr_48', name: '他突然沉默了', desc: '他沉默了很长时间，然后说了一句让你整晚都睡不着的话' },
  { id: 'ohr_49', name: '如果先遇到的是你', desc: '他问你如果你们先遇到彼此，结果会不会不一样' },
  { id: 'ohr_50', name: '他总是不由自主想起你', desc: '他告诉你他最近总是莫名其妙地想起你，吃饭的时候、睡觉之前' },
  { id: 'ohr_43', name: '他问你你们的关系', desc: '他突然很认真地问你，你们现在算是什么关系' },
  // ⚡ 戏剧冲突 51-60
  { id: 'ohr_51', name: '意想不到的人来找他', desc: '一个意想不到的人突然来找他（前任/朋友/家人），气氛瞬间微妙' },
  { id: 'ohr_52', name: '他受伤了', desc: '他受了点小伤（切到手/扭到脚），你帮他处理伤口' },
  { id: 'ohr_53', name: '被迫共处一室', desc: '因为某种原因你们被困在同一个空间（电梯故障/房间被锁），不得不独处' },
  { id: 'ohr_54', name: '他做了一个决定', desc: '他告诉你他做了一个关于你们关系的决定，表情认真' },
  { id: 'ohr_55', name: '联系不上你他急了', desc: '你的手机没电/丢了，他联系不上你时急得到处找' },
  { id: 'ohr_56', name: '他收到必须离开的消息', desc: '他收到一个必须离开的消息/通知，你们的时间突然变得有限' },
  { id: 'ohr_57', name: '遇到他的熟人', desc: '遇到了他的熟人/粉丝，场面一度尴尬又微妙' },
  { id: 'ohr_58', name: '有人当着他的面搭讪你', desc: '有人当着他的面搭讪你/表现出好感，他的反应出乎你的意料' },
  { id: 'ohr_59', name: '他准备了惊喜被你提前发现', desc: '他在给你准备一个惊喜，但你提前发现了——要不要装作不知道' },
  { id: 'ohr_60', name: '一个小争执后他先低头', desc: '你们因为一个小误会争执了几句，然后他先低下头来哄你' },
];

export var TOKEN_CONFIG = {
  phaseNarrative: 8000,
  consequence: 4000,
  sms: 3000,
  stay: 3000,
  freeAction: 6000,
  xMainStory: 8000,
  xMemberReason: 2000,
  xItems: 2000,
  dailySummary: 3000,
  todayCompress: 8000,
  finalResult: 6000
};

export var BEHAVIOR_MAP = {
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
  '务实理性': '用理性分析感情，会在心里衡量"这段关系有没有未来""我们合不合适"。在最终选择时更倾向于"换乘"而非"复合"。采访间中的表达条理清晰，像在分析一个项目。',
  '占有欲强': '对有好感的人表现出明显的占有欲——看到他和别人互动会不舒服，会下意识地靠近他、打断对话、或者用眼神"宣示主权"。采访间中坦诚"我就是不想他和别人太亲近"。吃醋剧情更强烈，与照顾型成员（崔胜澈）可能形成"谁更占有欲"的张力。',
  '被动等待型': '不主动出击，但内心期待对方来找自己。会故意在对方可能出现的地方待着，却不主动打招呼。采访间中充满"他会不会来找我""他为什么不主动"的纠结。需要对方足够主动才能打破这层壳。',
  '嘴硬心软': '说话时语气强硬、可能说反话（"我才不在意呢"），但行动上却温柔体贴。被对方看穿时会恼羞成怒。采访间中承认"其实我刚才说的不是真心话"。与毒舌型成员（全圆佑、夫胜宽）形成有趣的"嘴硬对决"。',
  '撒娇体质': '自然地撒娇，不是刻意而是本能——累了会靠在别人身上、饿了会嘟嘴、想要什么会用软软的语气说。年下成员（李灿）可能被这种撒娇"击倒"，温柔型成员（尹净汉）会享受被撒娇的感觉。采访间中可能自嘲"我是不是太黏人了"。',
  '好奇心旺盛': '对成员的一切都好奇——他的过去、他的习惯、他为什么这样说话。会主动提问、探索、观察。推动剧情发展，因为好奇心会让她主动靠近成员。采访间中充满"我想知道更多关于他的事"。',
  '回避型依恋': '想靠近又害怕亲密关系——当关系升温时会本能后退，当对方冷淡时又想靠近。形成复杂的情感张力。采访间中暴露矛盾"我明明想靠近，但靠近了就想逃"。适合虐心剧情，与深情型成员可能形成"追-逃"模式。',
  '讨好型人格': '总是想让对方开心，会迁就对方的喜好、压抑自己的需求。可能被某些成员察觉并心疼，也可能被某些成员误解为"没有个性"。采访间中反思"我是不是太忽略自己了"。与独立型成员形成对比，可能被对方提醒"你也可以表达自己的需求"。',
  '记仇小本本': '会记住对方的小失误——谁说过的话没兑现、谁曾经忽略了她。不是恶意记仇，而是心里有个"小账本"。偶尔翻旧账时会让对方措手不及。采访间中可能吐槽"他上次明明说……"。与某些成员形成有趣的日常互动。',
  '傲娇大小姐': '嘴上不饶人但行动上很照顾人。明明关心却用嫌弃的方式表达——"谁要管你啊"但下一秒就把外套递过去了。被看穿时会脸红否认。在采访间中嘴硬"我才没有在意他"，但下一句就暴露了其实记得关于他的所有细节。',
  '人间清醒理智挂': '用理性分析感情问题，不轻易上头。在别人情绪化时她是那个冷静指出关键的人。不会因为甜言蜜语就动摇，但会被真诚和坚持打动。采访间中的表达像在做逻辑推导——但偶尔的感性泄露反而更动人。',
  '钓系海后': '擅长营造暧昧氛围但不轻易交心。知道什么表情、什么距离最让人心动。可能同时和多人保持暧昧——不是故意伤害，而是她自己也分不清真心还是习惯。但在某个瞬间会发现：有人让她不想再钓了。',
  '事业脑': '生活重心在工作/学业上，恋爱只是"锦上添花"。约会也可能接工作电话、在纪念日加班。不是不重视对方，而是她的人生排序里事业永远在前面。但愿意为真正重要的人调整排序——那才是她最大的诚意。',
  '没心没肺搞笑女': '用幽默感化解一切尴尬和紧张。不把情绪写在脸上，即使难过也会用玩笑带过。是大家的开心果，但也因此没人发现她真正难过的时候。采访间中可能在笑着说一件其实很伤心的事——笑着笑着就安静了。',
  '疯批美人': '情感极端浓烈，爱和恨都毫不掩饰。会做出让周围人惊讶的举动——在众人面前直接表达好感、在对方退缩时反而追得更紧。采访间中毫不避讳"我就是想要他"。让人害怕也让人着迷，不敢靠近又移不开眼。',
  '软糯甜妹': '说话软、动作软、被欺负了也只是扁扁嘴不说话。让人忍不住想保护她。但不是没有脾气——她的底线被触碰时也会反击，只是反击的方式也是软软的，反而更让人心疼。',
  '恋爱脑重症患者': '一旦动心就全身心投入。会反复翻看对方的消息、在社交媒体上研究他的每一个点赞、和朋友聊他的时候眼睛发光。容易因为对方的一句话开心一整天、也因为对方没回消息而失眠。采访间中自嘲"我知道我这样不好，但我控制不住"。',
  '嘴硬心软刀子嘴': '说话锋利、不留情面，但说完就后悔。被反怼时会愣住——"你怎么还真生气了？"。和嘴硬心软的区别在于：她的嘴更硬，硬到能把人气哭，但气完之后她会默默地做对方喜欢吃的菜来道歉。',
  '情绪稳定内核强大': '遇事不慌、处变不惊。在混乱中她是稳定的锚点。别人慌的时候她在想解决方案，别人哭的时候她递纸巾。但不代表她没有情绪——只是她的情绪不表现给外人看。在信任的人面前才会露出脆弱。',
  '温柔解语花': '擅长倾听和安慰。不是那种张扬的温柔，而是恰到好处的理解——你说上半句她能接下半句，你不说她也不问。和她相处像泡在温水里，舒服到不想离开。但正因为太善解人意，有时会被忽略她自己的感受。',
  '黑莲花心机girl': '表面无害但每一步都有算计。知道什么时候示弱、什么时候出击、什么话能说到对方心坎里。不是恶意的心机——而是在感情里她习惯掌握主动权。采访间中坦诚"我知道我这样做很心机，但有效就行"。',
  '资深颜控': '对好看的人没有抵抗力。看到好看的脸会不自觉地态度变好、忍不住多看两眼、说话语气都温柔了。但颜控不代表肤浅——她很清楚颜值不是全部，只是好看的人确实更容易获得她的好感度加成。',
  '佛系咸鱼': '对什么都不太争，随遇而安。别人在争风吃醋的时候她在发呆，别人在精心策划约会的时候她想的是"随便啦都可以"。但佛系不代表没有底线——惹到她在意的人和事，她也会认真起来。而且她认真的时候，往往比谁都厉害。',
  '天然呆无自觉': '做出让人心跳加速的事却完全不知道发生了什么——靠得很近说话、自然地挽住对方手臂、说出"你嘴巴好好看"这种话之后毫无察觉。是最"危险"的类型：她的撩不是故意的，所以更加致命。采访间中无辜地问"我说错什么了吗"。'
};

// 匿名提问箱问题库（尖锐·恶毒·无处可逃）
export var QUESTION_BOX_QUESTIONS = [
  '你和X分手的真正原因，真的是你说的那样吗？',
  '在场的人里，有没有谁是你在利用来忘记X的？',
  '你有没有在半夜偷偷想过，如果当初不分手现在会怎样？',
  '你觉得在场的人里，谁对你的好是最假的？',
  '如果明天节目结束，你只能带走一个人——但你带走的人必须放弃所有事业跟你走，你还会选他吗？',
  '你有没有在我们看不到的时候，一个人哭过？',
  '你对这里的人说的"没事"，有多少次是真的没事？',
  '如果你的X此刻就在门外，你会开门吗？',
  '你有没有故意在某个人面前表现，只为让另一个人吃醋？',
  '你觉得这里谁最会演？谁的温柔是装出来的？',
  '你有没有后悔过，没有把X留住？',
  '如果X现在有新的交往对象了，你是什么感觉？',
  '你有没有在心里比较过——X和这里的人，谁更好？',
  '你觉得这里谁最不可能在节目里找到真爱？为什么？',
  '你有没有想过，也许你来这里不是为了换乘，只是为了确认X还爱不爱你？',
  '如果你的X和这里的某个人同时向你伸出手，你会先握住谁？'
];

// ==================== 天气系统 ====================
export var WEATHER_POOLS = {
  spring: ['晴朗','多云','微风','小雨','阵雨','晴朗','多云','微风'],
  summer: ['晴朗','炎热','雷阵雨','多云','台风前夕','晴朗','炎热','雷阵雨'],
  autumn: ['晴朗','凉爽','多云','小雨','大雾','晴朗','凉爽','多云'],
  winter: ['晴朗','寒冷','多云','小雨','雪','晴朗','寒冷','多云']
};

// ==================== 节日与生日系统 ====================
export var HOLIDAYS = [
  { month: 2, day: 14, name: '情人节', type: 'holiday' },
  { month: 8, day: 29, name: '七夕', type: 'holiday' },
  { month: 12, day: 25, name: '圣诞节', type: 'holiday' },
  { month: 1, day: 16, name: '夫胜宽生日', type: 'birthday', memberId: 'seungkwan' },
  { month: 2, day: 11, name: '李灿生日', type: 'birthday', memberId: 'dino' },
  { month: 2, day: 18, name: '李硕珉生日', type: 'birthday', memberId: 'dk' },
  { month: 2, day: 18, name: '崔瀚率生日', type: 'birthday', memberId: 'vernon' },
  { month: 4, day: 6, name: '金珉奎生日', type: 'birthday', memberId: 'mingyu' },
  { month: 6, day: 10, name: '文俊辉生日', type: 'birthday', memberId: 'jun' },
  { month: 6, day: 15, name: '权顺荣生日', type: 'birthday', memberId: 'hoshi' },
  { month: 7, day: 17, name: '全圆佑生日', type: 'birthday', memberId: 'wonwoo' },
  { month: 8, day: 8, name: '崔胜澈生日', type: 'birthday', memberId: 'scoups' },
  { month: 10, day: 4, name: '尹净汉生日', type: 'birthday', memberId: 'jeonghan' },
  { month: 11, day: 7, name: '徐明浩生日', type: 'birthday', memberId: 'the8' },
  { month: 11, day: 22, name: '李知勋生日', type: 'birthday', memberId: 'woozi' },
  { month: 12, day: 30, name: '洪知秀生日', type: 'birthday', memberId: 'joshua' }
];

// ==================== 约会地点池 ====================
export var DATING_LOCATIONS = {
  nature: [
    { name: '樱花林', desc: '粉色花瓣如雨飘落，空气中弥漫着淡甜香气', season: 'spring' },
    { name: '海边栈道', desc: '海浪轻拍礁石，咸湿海风裹着夕阳余温', season: 'summer' },
    { name: '山顶观景台', desc: '城市灯火在脚下铺展，晚风带着秋夜凉意', season: 'autumn' },
    { name: '湖边野餐', desc: '湖面波光粼粼，柳枝轻拂水面荡起涟漪', season: 'spring' }
  ],
  city: [
    { name: '深夜便利店', desc: '荧光灯在货架间投下冷白光，关东煮的热气模糊了玻璃窗', season: 'any', night: true },
    { name: '旧书店', desc: '泛黄书页散发旧纸气息，木质地板在脚下吱呀作响', season: 'any' },
    { name: '复古游戏厅', desc: '霓虹灯牌闪烁，投币声与8-bit音乐交织成怀旧背景音', season: 'any' },
    { name: '天台篮球场', desc: '城市天际线作背景框，夜风卷着橡胶地面的淡淡气味', season: 'any' }
  ],
  indoor: [
    { name: '私人影院', desc: '遮光帘隔绝外界光线，宽大沙发陷下去像一团云', season: 'any' },
    { name: '陶艺工坊', desc: '陶土湿润的气息弥漫，拉坯机低低嗡鸣着转圈', season: 'any' },
    { name: '猫咪咖啡馆', desc: '阳光从落地窗倾泻，猫爪肉垫踩过木地板没有声音', season: 'any' },
    { name: '录音棚', desc: '隔音墙吸收所有杂音，耳机里只剩彼此呼吸的电流声', season: 'any' }
  ],
  special: [
    { name: '废弃车站', desc: '铁轨锈迹斑斑，站牌字迹剥落，野草丛生的月台尽头是日落', season: 'any' },
    { name: '凌晨的急诊室', desc: '消毒水气味冰冷刺骨，走廊长椅映着惨白顶灯，寂静中只剩彼此的体温', season: 'any' },
    { name: '24小时投币洗衣房', desc: '滚筒持续转动发出低频轰鸣，烘干的热气让玻璃窗蒙上白雾', season: 'any' }
  ]
};

// ==================== 1v1「只为你心动」模式 ====================
// 世界观模板
export var ONE_HEART_WORLDS = [
  {
    id: 'transfer_house',
    name: '心动小屋同居',
    desc: '你和他在《换乘恋爱》心动小屋中展开一对一的同居生活。没有其他参与者，只有你和他在摄像机下共度数日。',
    promptSuffix: '节目设定：你和他是《换乘恋爱》节目的唯一一对参与者。心动小屋中只有你们两个入住。没有其他参与者，没有X关系。有制作组、摄像机、采访间。日常：一起做饭、散步、做任务、在阳台聊天约会。氛围：在镜头前克制但在私下放松的新恋情。'
  },
  {
    id: 'college',
    name: '校园恋爱',
    desc: '你和他是同一所大学的学生，在一次社团活动中相识。青涩甜蜜的校园恋爱。',
    promptSuffix: '校园设定：你们在同一所大学，他比你高一级。偶遇在图书馆/社团活动/校园祭。日常：一起上课、图书馆自习、食堂吃饭、夜晚操场上散步。氛围：青涩、心动、偷偷喜欢的感觉。时间线从初遇开始自然推进。'
  },
  {
    id: 'office',
    name: '办公室恋情',
    desc: '你和他是同一家公司的同事，在朝夕相处的工作中日久生情。',
    promptSuffix: '职场设定：你和他在同一家公司工作，不同部门但有业务交集。日常：一起开会、午休吃饭、加班后一起走、公司团建。氛围：克制但暧昧的办公室恋情，不想被同事知道但忍不住靠近。'
  },
  {
    id: 'neighbor',
    name: '邻居日常',
    desc: '你们是住在隔壁的邻居，从阳台偶遇开始慢慢走进彼此的生活。',
    promptSuffix: '邻居设定：你刚搬来这个小区，发现隔壁住着他。你们的阳台只隔了一堵矮墙。日常：阳台偶遇、一起遛狗、借东西、楼下便利店偶遇、周末一起看电影。氛围：温暖治愈的日常，从陌生人到熟人的自然靠近。'
  },
  {
    id: 'travel',
    name: '旅途中相遇',
    desc: '在一场独自旅行中偶遇他，异国他乡的浪漫邂逅。',
    promptSuffix: '旅行设定：你在独自旅行中遇到了同样旅行的他。异国他乡的某个转角/咖啡厅/青旅/火车上。日常：一起探索城市、分享食物、看日落、在陌生街道迷路。氛围：短暂但深刻的旅途浪漫，不必担心未来——珍惜当下。'
  },
  {
    id: 'variety_show',
    name: '恋综修罗场',
    desc: '综艺录制后期进入心动小屋同居，和其他参与者之间展开的多角感情线。他有镜头外的野心，你是他唯一的变数。',
    promptSuffix: '综艺设定：《换乘恋爱》综艺录制现场。你和他是节目中的一对，但场上还有其他参与者。镜头前克制礼貌，镜头后暗流涌动。有制作组、采访间、观察室。日常：集体录制、秘密约会、深夜天台对话。暧昧和占有欲在镜头下放大。节奏：每一帧都是戏，每一个对视都可能是爆点。'
  },
  {
    id: 'ancient',
    name: '古风仙侠',
    desc: '仙门背景下，你是被保护的小师妹，他是威严的大师兄。山门之内，情愫暗生。',
    promptSuffix: '仙侠设定：你是仙门中的小师妹，他是众弟子之首的大师兄。山门规矩森严，师尊严厉。日常：晨练剑法、后山采药、藏经阁偶遇、执行门派任务。氛围：古风含蓄克制，发乎情止乎礼，却在夜色中藏不住眼神。禁忌感：仙门清规戒律下，师兄妹之间的越界是最大禁忌。'
  },
  {
    id: 'esports',
    name: '热血电竞圈',
    desc: '你是战队经理/领队，他是队内王牌选手。赛场内外，你们是并肩作战的伙伴。',
    promptSuffix: '电竞设定：你是战队的经理兼领队，他是队伍的核心选手。训练基地同居。日常：训练赛复盘、一起外卖、深夜双排、比赛出征。氛围：热血青春，电子竞技的胜负欲和团队羁绊。关系：战队纪律禁止内部恋爱，但比赛胜利时的拥抱和失利时的安慰——都在犯规边缘。'
  },
  {
    id: 'apocalypse',
    name: '末世废土求生',
    desc: '末日废土背景下，你们是彼此的生存搭档。在废墟中寻找物资，也寻找继续活下去的理由。',
    promptSuffix: '末世设定：世界崩坏后第X年，丧尸/辐射/资源短缺。你们是一个小型幸存者团队的成员。日常：外出搜刮物资、修缮避难所、警戒放哨、分配食物。氛围：绝望中的人性光辉，弱肉强食的残酷法则下，他是你唯一可以后背相托的人。关系：末日中建立的感情——不是因为浪漫，而是因为信任。'
  },
  {
    id: 'custom',
    name: '✍️ 自定义世界',
    desc: '由你亲手书写世界观设定，一切由你做主。',
    promptSuffix: ''
  }
];

// [entSim] 娱乐圈模拟器·职业（4 选 1，身份锁定=队友的妹妹）
// name = 显示名；startChapter = 开局章节（1=练习生期 / 2=出道期，练习生经历后出道转 2）
export var ENT_SIM_PROFESSIONS = [
  { name: '练习生', startChapter: 1 },
  { name: '爱豆', startChapter: 2 },
  { name: 'solo歌手', startChapter: 2 },
  { name: '演员', startChapter: 2 }
];

// [entSim] 娱乐圈模拟器·职业初始人气（0-100，按职业差异化）
export var ENT_SIM_PROF_POPULARITY = {
  '练习生': 10,
  '爱豆': 40,
  'solo歌手': 35,
  '演员': 30
};

// [entSim] 娱乐圈模拟器·每日日程池（按职业）
// 每项：task 活动 / place 地点 / cat 类别 / type team(团体公开·易遇人) | solo(单人·易刷手机) / exposure 公开活动曝光加成
// encounterHint：该活动自然会「遇到谁 / 看到什么」，供 AI 生成分支剧情参考
export var ENT_SIM_AGENDA_POOLS = {
  '练习生': [
    { task: '月末评价排练', place: '公司练习室', cat: '练习', type: 'solo', exposure: 0, encounterHint: '练习间隙刷手机，看到男主新物料推送被队友调侃"你看得挺认真啊"；也可能撞见来探班的哥哥' },
    { task: '声乐课', place: '声乐教室', cat: '练习', type: 'solo', exposure: 0, encounterHint: '上课时收到公司群消息，看到男主团体回归预告，心里小小期待' },
    { task: '舞蹈课', place: '舞蹈教室', cat: '练习', type: 'team', exposure: 0, encounterHint: '和同期练习生一起练，聊起"你哥他们又上音银了"，你表面淡定' },
    { task: '公司宿舍夜话', place: '练习生宿舍', cat: '生活', type: 'team', exposure: 0, encounterHint: '舍友八卦谁谁被淘汰，你担心自己，也想起哥哥说过"别给自己太大压力"' },
    { task: '前辈探班', place: '公司走廊', cat: '社交', type: 'team', exposure: 0, encounterHint: '遇到出道的前辈，被鼓励几句；也可能偶遇来公司的哥哥和男主' },
    { task: '出道组选拔观摩', place: '评审室门外', cat: '评价', type: 'solo', exposure: 0, encounterHint: '远远看到评审进出，紧张得手心出汗，偷偷给哥哥发消息求鼓励' }
  ],
  '爱豆': [
    { task: '音乐节目打歌', place: '音乐节目待机室', cat: '打歌', type: 'team', exposure: 2, encounterHint: '后台撞见同期的 SEVENTEEN 候补舞台，哥哥悄悄对你比"加油"；也可能和男主舞台擦肩' },
    { task: '回归 showcase', place: '演唱会场馆', cat: '回归', type: 'team', exposure: 2, encounterHint: '台上表演时余光扫到观众席里的男主，心跳漏一拍；签售时粉丝问"姐姐有男朋友吗"' },
    { task: '签售会', place: '签售现场', cat: '粉丝', type: 'team', exposure: 1, encounterHint: '粉丝问"姐姐理想型""有没有喜欢的人"，你笑着打太极；有人递来男主相关应援被你悄悄收下' },
    { task: '练习室合宿', place: '团体宿舍', cat: '练习', type: 'team', exposure: 0, encounterHint: '和姐姐们一起练，某位姐姐（争门面的）抢了你 part，你有点闷；哥哥发消息问你们吃了没' },
    { task: '画报拍摄', place: '摄影棚', cat: '拍摄', type: 'solo', exposure: 3, encounterHint: '拍照时被站姐拍到戴了和男主同款饰品，后来网上有人扒"同款"，你一阵心虚' },
    { task: 'Vlive 直播', place: '宿舍直播间', cat: '粉丝', type: 'solo', exposure: 1, encounterHint: '直播时粉丝刷"想看你和哥哥同框"，你岔开话题；弹幕有人问恋爱观' },
    { task: '综艺录制', place: '综艺摄影棚', cat: '综艺', type: 'team', exposure: 2, encounterHint: '和哥哥同台当嘉宾，被主持人起哄"兄妹默契"，男主在台下看着笑' },
    { task: '海外签售', place: '海外场馆', cat: '粉丝', type: 'team', exposure: 1, encounterHint: '海外行程和男主巡演撞期，两人都忙见不到，视频时各自叹气' }
  ],
  'solo歌手': [
    { task: '写歌 / 编曲 demo', place: '个人工作室', cat: '创作', type: 'solo', exposure: 0, encounterHint: '写歌时灵感卡壳，想起男主某句随口哼的旋律，默默写进副歌；收到男主"写歌顺利吗"的微信' },
    { task: '录音棚录制', place: '录音棚', cat: '录制', type: 'solo', exposure: 0, encounterHint: '录音时耳机里放男主写的歌找感觉，被制作人问"你笑什么"' },
    { task: '个人舞台彩排', place: '电视台舞台', cat: '舞台', type: 'team', exposure: 2, encounterHint: '彩排遇到男主当天也有通告，两人后台点头示意，被站姐拍到"同框"' },
    { task: '音源发布日', place: '公司会议室', cat: '发布', type: 'solo', exposure: 2, encounterHint: '音源空降榜单，你紧张刷新；男主发来祝贺，你嘴硬"运气好"' },
    { task: '音乐节', place: '音乐节现场', cat: '舞台', type: 'team', exposure: 2, encounterHint: '音乐节和男主乐队同台不同场，演出完在后台聊两句被拍' },
    { task: '颁奖礼提名', place: '颁奖礼红毯', cat: '典礼', type: 'team', exposure: 3, encounterHint: '红毯被问"和某某（男主）认识吗"，你淡定否认；台下座位紧挨' }
  ],
  '演员': [
    { task: '片场拍摄', place: '影视基地', cat: '拍摄', type: 'team', exposure: 1, encounterHint: '片场遇到同剧男主客串（若同剧），对手戏心跳加速；或被拍到和男主同剧组' },
    { task: '剧本研读会', place: '剧组会议室', cat: '研读', type: 'team', exposure: 0, encounterHint: '和演员们围读，聊角色感情线，你想起自己和男主"戏外"的暧昧' },
    { task: '试镜', place: '制片公司', cat: '试镜', type: 'solo', exposure: 0, encounterHint: '试镜等待时刷到男主新剧预告，暗暗较劲要演得更好' },
    { task: '杂志专访', place: '采访间', cat: '采访', type: 'solo', exposure: 3, encounterHint: '被问"现实里有在追的人吗"，你答"专注事业"，编辑笑着记下' },
    { task: '杀青感言', place: '杀青宴', cat: '典礼', type: 'team', exposure: 2, encounterHint: '杀青宴上被起哄和男主（若客串）"戏里戏外"，你举杯掩饰脸红' },
    { task: '收视率之夜', place: '公司直播间', cat: '播剧', type: 'solo', exposure: 2, encounterHint: '守着收视率刷新，男主发"加油"，你回了个表情包' }
  ]
};

// 写作风格
export var ONE_HEART_STYLES = [
  { id: 'sweet', name: '甜宠风', desc: '温暖甜蜜，互相宠溺。日常互动处处是糖。' },
  { id: 'realistic', name: '现实风', desc: '真实细腻，有甜有苦。关系发展有起伏和矛盾。' },
  { id: 'slowburn', name: '慢热风', desc: '从暧昧到确定，循序渐进。情感积累层层递进。' },
  { id: 'passionate', name: '热烈风', desc: '直球热烈，一见钟情。感情浓烈，毫不掩饰。' }
];

export var MEMBER_BIRTHDAYS = {
  scoups: { month: 8, day: 8 },
  jeonghan: { month: 10, day: 4 },
  joshua: { month: 12, day: 30 },
  jun: { month: 6, day: 10 },
  hoshi: { month: 6, day: 15 },
  wonwoo: { month: 7, day: 17 },
  woozi: { month: 11, day: 22 },
  dk: { month: 2, day: 18 },
  mingyu: { month: 4, day: 6 },
  the8: { month: 11, day: 7 },
  seungkwan: { month: 1, day: 16 },
  vernon: { month: 2, day: 18 },
  dino: { month: 2, day: 11 }
};

export var HOLIDAYS_1V1 = [
  { month: 2, day: 14, name: '情人节', emoji: '💝' },
  { month: 12, day: 25, name: '圣诞节', emoji: '🎄' },
  { month: 12, day: 31, name: '跨年夜', emoji: '🎆' },
  { month: 1, day: 1, name: '新年', emoji: '🎉' }
];

// 1v1 模式 Token 配置
export var ONE_HEART_TOKEN_CONFIG = {
  phaseNarrative: 4000,
  chatReply: 400,
  momentGen: 800,
  diaryGen: 1200,
  eventStoryGen: 1500,
  theaterGen: 3000
};

// ==================== 公开身份行为描述 ====================
export var PUBLIC_IDENTITY_MAP = {
  '站姐/大粉': '擅长拍照和修图，对偶像产业非常熟悉。在剧情中可能自然地聊起追星经历、站姐日常。习惯用粉丝视角观察成员，对行程和通告比一般人敏感。',
  '素人': '和娱乐圈没有关系的普通人。对偶像/艺人的世界感到新奇但不熟悉。生活简单直白，社交圈干净。正因为"不知道"，反而让艺人觉得很轻松。',
  '同公司师妹': '同公司的后辈艺人。熟悉娱乐圈运作但还没真正出道/走红。在公司里遇到前辈会紧张，但也在努力学习。身份介于"圈内人"和"新人"之间。',
  '女团爱豆': '正在活动中的女团成员。有舞台经验和镜头感，理解艺人的所有压力和规则。和男主是同行，最能理解彼此——但也最清楚这段恋情的风险。',
  '队友的妹妹': '因为哥哥的关系而认识他。和哥哥的队友们像半个家人一样长大，但正因为这层关系——有些感情不能说出口。在哥哥面前是妹妹，在他面前是另一个人。',
  '财阀千金': '出身富裕家庭，受过良好教育。举止得体但可能对普通生活经验不足。习惯被照顾但不娇气。在感情中可能比想象中更大胆——因为她习惯"想要的就得到"。',
  '品牌方助理': '在品牌方工作，负责艺人对接。专业、干练、熟悉行业规则。工作能力被认可，但也因为工作关系而接触到台前幕后。职业习惯让她擅长社交——但真心很难给出去。',
  '女演员': '有表演经验的演员。在镜头前和镜头后都习惯"管理表情"，但也会因为在戏里投入太多而分不清真假。和同行恋爱最大的问题是：分不清哪些是真的、哪些是演出来的。',
  '百万网红博主': '社交媒体上的红人，拥有大量粉丝。擅长内容创作和粉丝互动，习惯了在镜头前展现生活。但真实的自己和网络人设之间可能有差距。对舆论敏感——知道被网络暴力的滋味。',
  '超模/平面模特': '时尚圈的模特，走过秀、拍过大片。外形出众但可能被外界低估了智商和内涵。时尚圈和娱乐圈有交集但不完全重叠。见过太多浮华，反而珍惜真诚的人。',
  '带货女主播': '直播间里能说会道、气氛担当。镜头前开朗活泼，下了播可能很安静。收入不错但工作强度大、作息不规律。擅长和人互动但对真实的关系反而笨拙。',
  '独立音乐人': '做小众音乐的创作者。有自己的音乐审美和坚持。不追求主流认可，更在意作品本身。敏感、细腻、可能有点孤僻——但她的歌里藏着她所有没说出口的话。',
  '体育生/运动员': '训练场和赛场是她的日常。自律、能吃苦、胜负欲强。生活圈子简单规律，和娱乐圈隔得很远。但不代表她不懂浪漫——她的浪漫可能是陪你跑完五公里后递过来的一瓶水。'
};

// ==================== 外貌特征叙事描述 ====================
export var APPEARANCE_MAP = {
  '泪痣': '眼睛下方有一颗泪痣，安静时格外明显。在特写描写中可以成为被凝视的焦点——"你的泪痣……从第一次见面就注意到了"。',
  '冷白皮': '肤色白皙，在人群中一眼就能看到。阳光下白到发光，穿深色衣服时对比强烈。在一些场景中可以被描写为"像在发光"。',
  '淡颜系': '五官清淡耐看，不是第一眼惊艳但越看越舒服。妆前妆后差别不大。适合描写"干净的、像水一样的气质"。',
  '酒窝': '笑起来有酒窝/梨涡。不笑的时候是高冷脸，一笑就破功。酒窝在暧昧场景中可能成为对方的视线焦点。',
  '小虎牙': '笑起来会露出可爱的小虎牙。在不自觉的笑、忍笑、偷笑时虎牙会出现。增加可爱和少年感。',
  '双眼皮': '明显的双眼皮，让眼睛看起来又大又有神。在眼神交汇的描写中可以作为细节——"他盯着你双眼皮的折痕看了三秒"。',
  '高鼻梁': '鼻梁高挺，侧脸线条立体。在侧脸描写、低头时、光线从侧面打过来时被突出。',
  '樱桃唇': '嘴唇小巧饱满，像樱桃。涂口红时很好看。在靠近的暧昧场景中有存在感——"你的嘴唇……很适合接吻"这类对白可以出现。',
  '万人迷': '天生有吸引人的磁场，走到哪里都会成为焦点。不是刻意打扮的结果，而是一种气质——让人忍不住想看第二眼。',
  '纯欲小白花': '长相清纯无辜、皮肤白皙、眼神干净。给人"需要被保护"的第一印象。在描写中强调眼神的清澈和表情的天真——让人想靠近又不忍心亵渎。',
  '童颜巨乳': '脸看起来比实际年龄小很多，但身材有反差感。这种反差本身就是一种魅力。在穿衣、运动、淋湿等场景中可以自然体现。',
  '声音甜软': '声音天生甜软，说话像在撒娇。即使说很普通的话也让人耳朵发痒。在电话、语音消息、深夜聊天的场景中特别突出。',
  '狐狸眼泪痣': '眼型偏长、眼尾上挑，右眼或左眼下方有一颗泪痣。天生带一种魅惑感，安静时像在放电。泪痣在特定场景中可成为话题。',
  '天生媚骨': '举手投足间带着不经意的性感。不是刻意卖弄，而是骨子里的气质——一个回眸、一个懒腰、一个托腮的动作都让人移不开眼。',
  '盈盈一握小蛮腰': '腰很细，一只手就能环住。在拥抱、搂腰、穿收腰衣服时被突出。"盈盈一握"本身就是一个暧昧的动作描述。',
  '病弱易推倒': '看起来身体不太好、容易疲惫。脸色苍白、走几步就喘、容易晕倒。这种脆弱感会激发保护欲，但也让人担心。在照顾场景中自然触发。',
  '眉目如画': '眉眼精致得像画出来的一样。眉眼是五官中最出彩的部分。在眼神戏、对视、含泪等场景中重点刻画眉眼的情绪。',
  '浓颜系': '五官浓烈立体、存在感强。妆前冷艳、妆后惊艳。适合描写"像一杯烈酒"的长相——不是所有人都敢直视，但看过就忘不掉。',
  '御姐长相': '成熟大气、有气场的长相。不笑的时候显得高冷有距离感，但其实是靠谱的姐姐类型。在职场、专业场景、照顾他人时自然展现魅力。',
  '幼态脸': '脸型圆润、五官分布偏下、看起来像未成年。长相显小，容易被误认为学生。在搞怪、撒娇、生气鼓脸等表情中更明显。',
  '蜜糖色健康肤': '肤色是健康的小麦色/蜜糖色，一看就是经常运动或在户外活动。给人一种阳光、活力、健康的感觉。和白皙皮肤形成反差美。',
  '黑长直女神': '黑色长直发是标志。发质好、有光泽。在风吹起头发、低头时头发滑落、他从背后帮你拢头发等场景中发挥作用。',
  '锁骨精灵骨': '锁骨线条优美明显。在穿一字领、吊带、衬衫解开第一颗扣子时格外性感。锁骨是"不经意间的性感"的经典描写对象。',
  '腿精大长腿': '腿又长又直，占身材比例很大。穿短裙/短裤/紧身裤时视觉效果突出。走路、奔跑、上下楼梯时都可以被描写。',
  '厌世脸高级感': '五官线条偏冷、不笑时显得高冷疏离。但笑起来有强烈反差——冷脸时像冰山，笑起来像冰雪消融。在别人眼中是"很难接近的长相"。',
  '雀斑氛围感': '脸上有淡淡的雀斑，不是瑕疵而是氛围感。近距离时雀斑会显得真实而可爱。在阳光下的特写、他近距离看你时被注意到。'
};

// ==================== MBTI 叙事描述 ====================
export var MBTI_MAP = {
  'INTJ': '独立思考者，习惯用逻辑分析一切。在感情中也保持理性，不轻易表露情绪。但一旦认定就是深思熟虑的结果——不会冲动，也不会轻易放弃。',
  'INTP': '喜欢思考和探索，对世界充满好奇。在感情中表达方式比较特别——可能不太会说甜言蜜语，但会用行动和研究精神去了解对方。',
  'ENTJ': '天生的领导者，目标感强。在感情中也主动出击，知道想要什么并直接行动。不喜欢暧昧和拖泥带水——"我喜欢你，所以呢？"。',
  'ENTP': '聪明活泼、善于辩论。在感情中喜欢有趣的互动和思想碰撞。太容易得到的会觉得无聊——需要对方能跟上她的节奏。',
  'INFJ': '理想主义者，对深层连接有强烈的渴望。直觉敏锐，能感知到别人未说出口的情绪。在感情中追求灵魂共鸣而非表面融洽。',
  'INFP': '内心世界丰富，重视真诚和深度连接。在集体中可能安静但并非不合群。情感细腻，容易被细节打动——一首歌、一句话、一个眼神。',
  'ENFJ': '天生的引领者，擅长照顾周围人的情绪。在集体中自然成为凝聚者，但有时会忽略自己的需求。在感情中投入且希望对方也幸福。',
  'ENFP': '热情开朗、充满活力。在感情中主动而真诚，喜欢制造惊喜和浪漫。但可能因为太热情而让对方有压力——需要学会克制和节奏。',
  'ISTJ': '踏实可靠、注重细节。在感情中用行动而非语言表达。可能不太浪漫但极其靠谱——你说过的话她都记得，答应的事一定会做到。',
  'ISFJ': '温柔体贴、默默付出的类型。在感情中习惯照顾对方，把对方的需求放在自己前面。需要被提醒——"你也可以为自己考虑"。',
  'ESTJ': '执行力强、有条理。在感情中也讲究效率和计划。可能不太习惯暧昧和不确定性——"我们到底是什么关系？需要明确一下"。',
  'ESFJ': '热情好客、重视人际关系。在感情中大方体贴，会主动把对方介绍给朋友和家人。但也可能因为太在意外界眼光而忽略自己的真实感受。',
  'ISTP': '冷静务实、擅长解决实际问题。在感情中不擅长甜言蜜语，但会在你需要的时候第一时间出现。动手能力强——修理东西、做饭、开车都做得很好。',
  'ISFP': '安静温柔、有艺术气质。在感情中用行动表达——画一幅画、做一顿饭、选一首歌。不习惯直接说"喜欢"，但每个细节都在说。',
  'ESTP': '行动派、喜欢冒险和新鲜感。在感情中直球热烈，喜欢就追、不拖泥带水。有时候显得不够认真——但其实认真起来很可怕。',
  'ESFP': '派对中心、天生表演型人格。在感情中大方主动，喜欢被关注和赞美。享受恋爱的过程但可能不太擅长处理深层问题。需要有人让她停下来。'
};

// ==================== 私密体质触发描述 ====================
export var PRIVATE_TRAIT_MAP = {
  '怕黑': '深夜场景中下意识开灯或靠近他人。停电/走夜路时明显紧张，走在光线不足的地方会不自觉地抓住身边的人。曾在半夜被吓醒后不敢再关灯睡觉。',
  '易醉体质': '喝一点点酒就上头——脸红、话变多、胆子变大。第二天完全不记得自己做了什么。在喝酒场景中需要特别关注，醉酒后可能做出平时不会做的事。',
  '泪失禁': '情绪激动时控制不住流泪——即使不想哭、即使正在吵架、即使在公共场合。眼泪不受控制地往下掉，越不想哭越停不下来。不是软弱，是生理反应。',
  '怕打雷': '雷雨天气时会明显不安。打雷时会下意识捂耳朵或缩起来。在雷雨夜的剧情中这是一个天然的靠近契机——他会发现你怕打雷。',
  '恐高': '在高处会腿软、头晕、心跳加速。不能坐摩天轮、不能站在阳台边缘、爬山时不敢往下看。但可能为了陪他而硬着头皮尝试——然后被他看穿。',
  '晕车体质': '坐车容易晕——尤其是山路、堵车、空调不好的车。包里常备晕车药和薄荷糖。长途旅行时可能会靠在他肩上睡着。',
  '海鲜过敏': '吃了海鲜会起疹子/过敏。在吃海鲜的场合需要特别注意——他需要记住你不能吃海鲜这件事。如果记不住……扣分。',
  '花粉过敏': '春天/花丛中会打喷嚏流眼泪。浪漫的花海场景对你来说是灾难。他送你花时需要注意花的品种。',
  '姨妈痛': '生理期前两天会痛到没法正常活动。可能因此缺席行程、需要被照顾。他会记住你的周期并且提前准备好暖宝宝和红糖水。',
  '容易脸红': '被注视、被夸奖、被靠近时脸红控制不住。即使心理上想装镇定，生理反应直接出卖了她。脸红可能成为对方调侃的话题——"你耳朵红了"。',
  '手脚冰凉': '天气一冷手脚就冰凉，像冰块一样。冬天时他的口袋/外套是你最想去的地方。他会习惯性地握住你的手帮你暖——"怎么又这么冰"。',
  '容易饿/低血糖': '饿的时候会手抖、心慌、脾气变差。包里永远有零食。他需要学会在你饿的时候及时投喂——不然会被你无意识地凶。',
  '睡觉说梦话': '睡着后会自言自语，甚至会和梦境对话。可能说一些白天不会说的话——包括他的名字。和他一起过夜时要注意这个秘密会不会暴露。',
  '被吓容易尖叫': '被突然吓到时反应很大——会尖叫、会跳起来、可能会条件反射地打人。看恐怖片/被恶作剧时的反应是全场焦点。',
  '不能吃辣': '一点点辣就受不了——嘴巴红、额头冒汗、疯狂喝水。在聚餐时这是一个明显的特征，他会注意到并默默地帮你把辣菜挪远一点。',
  '喝水容易呛': '喝水/喝饮料时容易呛到——喝太急、边喝边笑、喝水时被逗。经常被呛到咳嗽，他可能会无奈地帮你拍背。',
  '容易被晒伤': '皮肤对阳光敏感，晒一会儿就红、脱皮。夏天出门需要严格防晒。去海边的剧情中这是一个明显的细节。',
  '蚊子叮咬过敏': '被蚊子叮了会肿很大的包，又红又痒好几天。夏天的户外场景中他可能会帮你喷驱蚊水、帮你挠被咬的地方。',
  '敏感带在耳后': '耳后是敏感区域——被触碰时会有明显反应（缩脖子、脸红、呼吸变化）。在靠近说话、整理头发、亲密接触的场景中自然触发。',
  '高潮易泣': '在亲密时刻情绪容易过载——到达高潮时会控制不住流泪。不是难过，是生理性的情绪释放。他可能会被吓到，然后把你抱得更紧。',
  '极品名器': '身体构造特殊，亲密时会带来极致的体验。在有亲密描写的剧情中作为细节提及。',
  '体香醉人': '身上自带好闻的体香——不是香水味，是皮肤和体温混合的气息。在拥抱、靠近、同床共枕时会被提到"你身上的味道真好闻"。'
};

// ==================== 第二职业叙事描述 ====================
export var SECOND_CAREER_MAP = {
  '音乐制作人': '日常与录音设备、编曲软件为伴。习惯深夜工作灵感最好。会用音乐表达感情——写一段旋律、调一个音色、把说不出口的话写进歌词里。',
  '心理学在读': '习惯观察和分析他人。说话时偶尔蹦出专业术语又赶紧解释。擅长引导对话，但被问到自己时反而回避。和他聊天要小心——他可能比你自己还了解你。',
  '手工皮具匠人': '手上经常有胶水或皮革的味道。喜欢动手做东西，耐心十足。他送的礼物大概率是自己亲手做的——每一针每一线都是时间。',
  '演员': '情绪表达能力强，但不一定都是演的。习惯观察别人的表情和肢体语言。可能在暧昧时故意"演"一下来试探反应。但真正的感情——演不出来。',
  '编舞师': '身体协调性好，节奏感强。走路、站姿都比普通人好看。可能不自觉地用身体打拍子。在教人跳舞时特别有魅力——但也特别严格。',
  '游戏公司策划': '逻辑思维强，擅长系统化思考。打游戏时不只是玩——会分析设计逻辑。脑洞大，经常冒出奇怪的想法。约会也可能变成"帮我看看这个游戏设定"。',
  '作曲/制作人': '脑子里随时有旋律在转。会在桌上敲节奏、用手机录灵感。他的浪漫是一首为你写的歌——但可能要等到专辑发行你才能听到。',
  '音乐剧演员': '声乐和形体训练是日常。说话声音好听、气息足。在朋友聚会中最可能是被推出来唱歌的那个人。情感表达充沛但不浮夸。',
  '料理师/餐厅主理人': '味蕾敏感，对食材和调味有要求。做饭是表达爱意的方式——"你最近瘦了，给你做了补的"。厨房是他的领地，认真做饭的时候不要打扰他。',
  '当代艺术家': '审美独特，思维发散。做作品时很专注，可能几天不见人。他的浪漫可能是一幅画、一个装置、一场行为艺术——不是所有人都懂，但你懂就够了。',
  '综艺人/主持人': '反应快、口才好、气氛担当。在人群中永远不会冷场。但台下可能比台上安静很多。幽默是他的保护色——真正的感情反而不会拿来开玩笑。',
  '独立音乐人/DJ': '在自己的音乐世界里很自在。深夜打碟、写歌、混音。有自己的品味和坚持，不随波逐流。在人群中最耀眼的是他在台上的时候——但台下他只想安静地和你待着。',
  '舞者/编舞助理': '身体是表达的工具。练习时很拼命，身上经常有淤青。在练习室是最认真的那个，但平时可能懒懒的。反差感——台上台下两个人。'
};

// ==================== 1v1 吃醋事件池 ====================
export var JEALOUSY_EVENTS = [
  { minAff: 60, affDeltas: [3, -1, 1], scenario: '你和同事在咖啡厅聊了半小时项目，他隔着玻璃看到了你们笑得很开心。', options: ['走过去大方介绍你们在聊什么', '假装没看见继续聊天', '发消息说「你要不要一起喝一杯？」'] },
  { minAff: 60, affDeltas: [2, 1, -1], scenario: '你的朋友圈发了一张和异性朋友的合影，他留言「这个谁啊」下面还跟了个不笑的 emoji。', options: ['私聊回复「吃醋了？」', '公开回复「从小一起长大的哥们儿」', '不回复，看他会不会憋不住来找你'] },
  { minAff: 60, affDeltas: [3, 0, -2], scenario: '他看到你手机上弹出一条异性消息：「在吗？上次的事谢谢你啦～」', options: ['主动把手机递给他看：「你自己翻」', '轻描淡写说「工作上的事」', '反问他「你这么紧张干嘛」'] },
  { minAff: 70, affDeltas: [3, 1, -1], scenario: '你等他收工的时候，他被女粉丝拉去合影，那个女生搂着他的腰比了个心。', options: ['等他拍完走过去牵他的手', '在旁边笑着看，等他主动走过来', '转身去角落给他发消息「拍够了吗」'] },
  { minAff: 70, affDeltas: [2, 0, 3], scenario: '你哥/朋友当面跟他说：「你到底对我妹什么态度？不喜欢别耽误她。」', options: ['帮你男友解围：「你别乱说」', '沉默，等他回答', '拉着他走：「我们的事我们自己说」'] },
  { minAff: 70, affDeltas: [2, -1, -2], scenario: '他在你包里发现了一张别人写的小纸条——虽然是三年前的旧物，但上面写着「我喜欢你」。', options: ['实话实说：「很久以前的了」', '逗他：「你猜是谁写的」', '直接扔掉：「没意义的人」'] },
  { minAff: 80, affDeltas: [2, 1, 3], scenario: '他无意翻到你的旧微博，里面写着对另一个男生的崇拜——那个人是他认识的人。', options: ['承认：「那都是过去的事了」', '解释：「那时候还不认识你」', '反撩他：「现在眼里只有你」'] },
  { minAff: 80, affDeltas: [3, -2, 1], scenario: '练习室门口，他看到你和一个男同事有说有笑地走出来，没说一句话掉头走了。', options: ['追上去拉住他手：「听我解释」', '让他走，等消气了再说', '给他打电话：「你再走一步晚上不给你做饭」'] },
  { minAff: 80, affDeltas: [1, 2, 3], scenario: '你整理旧手机相册，被他瞄到一张和前任的合影——虽然只有半张脸。', options: ['迅速划过：「没什么好看的」', '坦白：「那都是过去式了」', '递给他：「你想看吗？这是他」'] },
  { minAff: 85, affDeltas: [3, -3, 2], scenario: '他跟别人聊天时听到：「她说过你其实不是她第一眼喜欢的那种类型。」', options: ['承认：「但你是我最后喜欢的那个人」', '否认：「他听错了吧」', '抱住他：「第一眼不重要，现在最重要」'] },
  { minAff: 85, affDeltas: [1, -1, 2], scenario: '大合照的站位里，他发现你的座位紧贴着另一个男生，中间隔着两个人的距离。', options: ['解释：「拍照时被推过去的」', '调侃他：「观察得挺仔细啊」', '内疚：「下次我站你旁边」'] },
  { minAff: 85, affDeltas: [1, 2, -2], scenario: '你们在阳台聊天，你哥走过来说「我跟他说了你小时候的糗事」。他听完后笑得不自然。', options: ['追问他：「我哥到底说了什么」', '假装生气：「不许听我哥乱讲」', '转移话题：「那天天气真好」'] }
];

// ==================== 1v1 惊喜事件池 ====================
export var SURPRISE_EVENTS = [
  { minAff: 50, affDeltas: [3, 2, 1], scenario: '你加完班走出公司，发现他在楼下等你——手里提着热乎乎的宵夜。', options: ['冲过去抱住他：「你怎么来了」', '接过来笑着说：「等很久了吧」', '拉他去旁边的长椅坐着一起吃'] },
  { minAff: 50, affDeltas: [2, 1, 1], scenario: '半夜收到他发来的语音——他弹了一小段钢琴曲，说「刚写的，还没取名字」。', options: ['回他：「这是写给我的吗」', '认真听完+发语音评价', '第二天当面问他：「那首歌叫什么」'] },
  { minAff: 50, affDeltas: [2, 1, 1], scenario: '你随口说了一句想吃什么，第二天桌上就出现了。附了一张便签：「路过顺便买的」。', options: ['拍照发给他：「谢谢顺便先生」', '问他地址说要回请', '吃掉并留着那张便签'] },
  { minAff: 60, affDeltas: [2, 2, 3], scenario: '下雨了你没带伞，他撑着伞突然出现在你面前——头发还是湿的。', options: ['躲进伞下：「你怎么知道我在这儿」', '接过伞：「我帮你擦擦头发」', '拉着他一起在雨里跑回家'] },
  { minAff: 60, affDeltas: [1, 0, 2], scenario: '你在忙的时候他说「别动」，然后帮你系好松开的鞋带。抬头若无其事地继续看手机。', options: ['低头看他说了声「谢谢」', '等他走了跟朋友说「他刚刚……！」', '偷偷给他发了句「你刚超帅」'] },
  { minAff: 60, affDeltas: [3, -1, 1], scenario: '你感冒了，他戴着口罩出现在你家门口，手里提着药和一碗热粥。', options: ['让他进屋：「你也别被传染了」', '隔着门说谢谢让他回去', '喝粥后给他发照片：「喝完了」'] },
  { minAff: 70, affDeltas: [1, 2, 3], scenario: '你在他口袋里发现了一张手写的便签——上面是你的名字和他的字迹：「今天也想见你」。', options: ['等他发现时假装不知道', '拍下来设成聊天背景', '走到他面前摊开纸条看着他笑'] },
  { minAff: 70, affDeltas: [1, 2, 1], scenario: '他提前结束了行程，发消息说「十分钟后你家楼下」。你下楼看到他靠在车上，手里拿着一束花。', options: ['笑他：「这么正式？」', '接过来问「今天什么日子」', '把花举到脸前说「好看还是花好看」'] },
  { minAff: 70, affDeltas: [2, 2, 1], scenario: '凌晨三点你还没睡，收到他的消息：「醒着吗？」接着电话就响了。', options: ['接起来：「你怎么也没睡」', '挂掉打视频过去', '回他：「睡了」然后等他打来再接'] },
  { minAff: 80, affDeltas: [1, 2, 1], scenario: '他说要给你看个东西，然后拿出一张画——不专业但很认真，画的是你的侧脸。', options: ['问他什么时候画的','要拍照收藏','说你画得不像让你现场教你'] },
  { minAff: 80, affDeltas: [3, 2, 1], scenario: '他给你发了一段录音——是他唱的一整首歌，你说过喜欢的那首。最后加了句「晚安」', options: ['回他：「我循环了一天」','录一段自己唱的回赠','第二天当面问他嗓子疼不疼'] },
  { minAff: 80, affDeltas: [1, -1, 2], scenario: '你累到在沙发上睡着，醒来时身上盖着他的外套，他在旁边安静地打游戏——声音关到了最小。', options: ['假装没醒继续躺着','坐起来说「你怎么不叫我」','反过来把头靠在他腿上'] }
];

// ==================== 1v1 路人围观事件池 ====================
export var CELEBRITY_EVENTS = [
  { minAff: 15, affDeltas: [1, 2, 1], scenario: '你们在商场吃饭，隔壁桌的女生开始偷拍。他注意到你的表情变了。', options: ['假装没发现继续吃', '看向镜头笑了一下', '拉着他换桌'] },
  { minAff: 15, affDeltas: [0, 2, 1], scenario: '机场到达大厅，有粉丝举着应援牌冲过来。你被挤到了一边。', options: ['退到旁边等他自己处理', '站在他身边帮他挡一下', '开玩笑说「你粉丝比我想的还多」'] },
  { minAff: 20, affDeltas: [1, 2, 1], scenario: '你们在公园散步被路人认出，有人开始拍照窃窃私语。', options: ['拉着他快走离开', '大方打招呼然后继续散步', '问他「会介意吗」'] },
  { minAff: 20, affDeltas: [1, 2, 1], scenario: '他在直播时你从他身后走过，弹幕瞬间刷屏问「那是谁」。', options: ['悄悄退出去不打扰', '走到镜头前打个招呼', '等他下播后调侃他'] },
  { minAff: 25, affDeltas: [1, 2, 1], scenario: '签售会上你混在粉丝队伍里，轮到你的那一秒他愣住了。', options: ['忍着笑签完说「谢谢」', '悄悄眨了眨眼', '小声说「惊喜吗」'] },
  { minAff: 15, affDeltas: [2, 1, 0], scenario: '你们在餐厅吃饭被隔壁桌要合影，他下意识看向你等你点头。', options: ['大方答应一起拍', '说「我们在约会呢不太方便」', '让他自己去拍你等着'] },
  { minAff: 20, affDeltas: [1, 2, 0], scenario: '你在他颁奖礼后台等他，工作人员拦住你说「无关人员不能进」。', options: ['退到外面给他发消息', '说「我是他家属」', '等他出来时故意装作生气了'] },
  { minAff: 30, affDeltas: [2, 1, 1], scenario: '有私生饭跟到你家楼下，拍了你进单元门的照片发在网上。他看到后脸色变了。', options: ['安慰他说「没事我小心点」', '问他要不要搬家', '发消息说「你别担心啦」'] },
  { minAff: 15, affDeltas: [1, 2, 1], scenario: '你在超市买菜时被他的粉丝认出来了，对方激动地问「你是不是那个……」。', options: ['否认：「你认错人了」', '微笑点头后快步离开', '承认后请她保密'] },
  { minAff: 30, affDeltas: [2, 1, 0], scenario: '他的综艺节目里被MC问到「最近有在谈的人吗」。他的回答让你心跳漏了一拍。', options: ['等他下播后问他怎么回答的', '发消息说「我在看」', '装作没看等他主动说'] }
];

// ==================== 1v1 社交媒体风波事件池 ====================
export var SCANDAL_EVENTS = [
  { minAff: 35, affDeltas: [2, -2, 1], scenario: '一张你和情敌在咖啡店的合照被传到了网上。他的手机一直在响。', options: ['第一时间联系他解释', '等他来找你再说', '发条朋友圈澄清'] },
  { minAff: 35, affDeltas: [2, 1, 0], scenario: '有人在论坛发帖讨论他的恋情，帖子里有你的照片。转发在发酵。', options: ['告诉他自己来处理', '问他「你公司那边怎么说」', '暂时不出门等热度过去'] },
  { minAff: 40, affDeltas: [2, 0, 1], scenario: '私生跟了你们一整天，你发现时已经晚了——他们拍了你们的合照。', options: ['拉着他快步离开', '直接报警处理', '让他先走你来解决'] },
  { minAff: 30, affDeltas: [0, 1, 2], scenario: '你在他的直播弹幕里被粉丝认出来了。弹幕在刷你的名字。', options: ['假装没看到继续看直播', '发一条弹幕说「你们认错人了」', '给他发消息说「好像被发现了」'] },
  { minAff: 40, affDeltas: [1, 1, 2], scenario: '狗仔拍到你们在车里靠得很近的照片，标题写着「疑似恋情曝光」。', options: ['问他公司那边怎么说', '让他别回应冷处理', '开玩笑说「拍得好看吗」'] },
  { minAff: 25, affDeltas: [2, 1, 0], scenario: '他的前队友在节目上开玩笑说「他最近总是对着手机傻笑」。你收到了他无奈的表情。', options: ['回他「你确实在傻笑」', '问他「前队友知道我的事吗」', '装作没发现心情很好'] },
  { minAff: 35, affDeltas: [1, 0, 2], scenario: '有人在粉丝群里扒出了你的社交账号，翻出了你和他同款衣服的ins截图。', options: ['把账号设成私密', '发一条模棱两可的动态', '跟他说「好像被发现了怎么办」'] },
  { minAff: 30, affDeltas: [1, 0, 2], scenario: '你们在练习室单独待着时，窗户外面好像有人在举着手机拍。', options: ['拉上窗帘继续', '出去看看是谁', '说「我们换个地方吧」'] },
  { minAff: 40, affDeltas: [1, 2, -1], scenario: '你的社交账号被营销号搬运了，标题写「疑似SEVENTEEN成员女友账号曝光」。评论区炸了。', options: ['暂时关掉评论区', '跟他说「对不起给你添麻烦了」', '卸载社交软件冷静几天'] },
  { minAff: 50, affDeltas: [2, -1, 3], scenario: '经纪公司打来电话，说「这段时间先不要公开露面」。他握着你的手说「等我」。', options: ['点头说「我等你」', '问他「要多久」', '说「不如公开吧我不想躲了」'] }
];

// ==================== 1v1 生病事件池 ====================
export var SICK_EVENTS = [
  { minAff: 20, affDeltas: [2, 3, 2], scenario: '他发烧38.5度，拒绝去医院说「睡一觉就好」。你看着他烧红的脸。', options: ['强行拉他去医院', '在家照顾他一整晚', '煮粥给他吃然后守着他睡'] },
  { minAff: 15, affDeltas: [1, 2, 1], scenario: '连续行程太多他嗓子哑了，明天还有签售会。他看着你苦笑。', options: ['帮他煮润喉茶', '让他少说话你来替他接电话', '开玩笑说「那明天我替你去签售」'] },
  { minAff: 20, affDeltas: [1, 3, 2], scenario: '他背伤复发疼到站不直，但坚持说要去练习室。', options: ['拦着他逼他休息', '说「那我陪你在家练」', '打电话叫经纪人帮忙劝'] },
  { minAff: 25, affDeltas: [3, 3, -1], scenario: '他食物中毒半夜给你打电话，声音虚弱。你赶去他家。', options: ['马上送他去急诊', '照顾他吐了一整晚', '骂他「让你乱吃」但手在发抖'] },
  { minAff: 20, affDeltas: [2, 1, 3], scenario: '他练习时膝盖旧伤复发，坐在角落说「不用管我」。额头全是汗。', options: ['蹲下来帮他冰敷', '打电话叫经纪人来', '坐在他旁边说「我陪你歇会儿」'] },
  { minAff: 20, affDeltas: [2, 1, 3], scenario: '连轴转了好几天，他在你面前突然眼前一黑差点倒下。你扶住他时他还在说「没事」。', options: ['强行让他坐下塞了颗糖', '凶他「你再这样我生气了」', '给他请假让他休息一天'] },
  { minAff: 15, affDeltas: [1, 0, 2], scenario: '他眼睛发炎红得像兔子，但坚持说「明天还有行程」。你看着他倔强的脸。', options: ['翻出眼药水给他滴', '说「丑成这样还去」实际很心疼', '陪着去医院开药'] },
  { minAff: 20, affDeltas: [3, 1, 2], scenario: '他扭伤了脚踝，你一急直接在他面前蹲下说「上来我背你」。他笑了。', options: ['坚持背他到了车上', '改成扶着他走', '说「笑什么我很认真的」'] },
  { minAff: 20, affDeltas: [2, 1, 3], scenario: '他过敏发作身上起了红疹，痒得一直抓但又嘴硬说「很快就好了」。', options: ['翻箱倒柜找抗过敏药', '按住他的手「别抓了会留疤」', '催着去医院打针'] },
  { minAff: 25, affDeltas: [3, 2, 2], scenario: '他压力性失眠好几天了，凌晨四点在客厅发呆。听到你开门的声音回头挤出一个笑。', options: ['走过去坐在他旁边不说话', '给他泡了杯热牛奶', '说「我陪你聊到睡着」'] }
];

// ==================== 1v1 前任吃醋事件池 ====================
export var EX_JEALOUSY_EVENTS = [
  { minAff: 35, affDeltas: [0, 2, 3], scenario: '他在帮你搬家时发现了一个盒子——里面是你和前任的东西。他看了很久没说话。', options: ['说「留着是因为懒得扔」', '当着他的面直接扔掉', '坦白说「那是我的一部分，但已经过去了」'] },
  { minAff: 40, affDeltas: [3, 0, 2], scenario: '前任突然发来一条消息：「最近还好吗？」他刚好看到通知栏。', options: ['当着他的面回复「挺好的，别联系了」', '解释说是好久没联系的人', '没回复但把聊天记录给他看'] },
  { minAff: 35, affDeltas: [3, 1, 2], scenario: '共同朋友聚会上，有人提起了你和前任的往事。他说笑的表情停了一瞬。', options: ['在桌下握住他的手', '转移话题聊别的', '结束后主动解释那段往事'] },
  { minAff: 40, affDeltas: [2, 1, -1], scenario: '他无意中听到你朋友说「她以前很喜欢那个人」。他装作没听到。', options: ['找机会主动告诉他「那是过去的事了」', '装作不知道给他更多关心', '等他自己开口问'] },
  { minAff: 35, affDeltas: [2, 1, 1], scenario: '你的手机壁纸还是和前任的合照——忘记换了。他拿起你手机时停了一下。', options: ['当场换掉：「忘了换」', '解释「那是很久以前的」', '说「现在换还来得及吗」'] },
  { minAff: 35, affDeltas: [-1, 2, 1], scenario: '你的日历弹出了一个提醒：今天是前任的生日。不小心被他看到了。', options: ['直接关掉当没发生过', '跟他说「我早就不过了」', '自嘲说「忘了删」'] },
  { minAff: 40, affDeltas: [2, 1, 0], scenario: '你收到了一个快递，打开是前任寄回来的东西——上面还有他写的小纸条。', options: ['当着他的面扔掉', '看完放一边说「没意义了」', '让他帮你也写一张新的'] },
  { minAff: 45, affDeltas: [3, -2, 0], scenario: '你们逛街时迎面走来一个人——你下意识松开了他的手。那是你前任。', options: ['重新牵紧他继续走', '等他问了你才解释', '小声说「我们走吧」'] },
  { minAff: 35, affDeltas: [1, 1, 0], scenario: '你的社交媒体突然推送「你们可能认识的人」——是前任的头像。他刚好在旁边。', options: ['划过不看：「不认识」', '跟他说「算法真烦人」', '笑了一下没当回事'] },
  { minAff: 40, affDeltas: [0, 2, 3], scenario: '他在你车里随手播歌，你的歌单里还有前任推荐给你的歌。前奏响起时他看向你。', options: ['切歌：「好久没听了」', '跟他讲这首歌的故事', '说「现在这首歌是我们的了」'] }
];

// ==================== 1v1 女团爱豆背景预设（队友的妹妹·女团线） ====================
// 女主固定为「门面(Visual) + 忙内(Maknae)」，其余 5 位姐姐成员从池里拼装。
// 参考质感：Brave Girls《Rollin》翻红前 / LABOUM《Hwi Hwi》 / fromis_9 / Lovelyz —— 有 1-2 首出圈歌但始终二线、不温不火、随时担心解散。
export var GIRLGROUP_PRESETS = {
  groupNames: ['LUMINA', 'VELVETINE', 'AURORA SIX', 'SOLARIA', 'PRISM', 'MOONVEIL'],
  company: 'PLEDIS Entertainment', // 和 SEVENTEEN 同公司
  concepts: ['感性抒情舞曲', '清冷风舞曲', '复古 City Pop', '梦幻 synth-pop', '中低音 R&B'],
  fandoms: ['Lumis', 'Velvets', 'Auroras', 'Solas', 'Prisms', 'Veils'], // 与团名 index 对应
  songs: [
    '出道曲《Moonlight Letter(월광염서)》——中规中矩，没水花但有粉丝情怀',
    '小爆曲《Stay With Me》——曾进音源榜前 30，成了"你们团的歌"，综艺常被点名',
    '抒情曲《Rainy Day》——被用作某韩剧 OST 后小范围出圈',
    '夏日曲《Sugar High》——打歌舞台点击尚可，但没能破圈',
    '再出道曲《Echo》——概念反转尝试，圈内评价两极'
  ],
  // 5 位姐姐的定位（女主占第 6 位：门面 + 忙内）
  sisterRoles: ['队长 / 主唱（操心老妈子，像大姐）', '主唱（唱功最强，稳定输出）', '主舞 / C位（舞台核心，镜头多）', 'Rapper（冷面氛围组）', '领舞 / 综艺担当（搞笑担）']
};

// 程序化拼装女主所在的 6 人女团背景。heroineName 为女主名（用于占位）。
// 返回对象存入 GS.oneHeartHeroineGroup，由 prompts.js 注入 system prompt。
export function buildHeroineGirlGroup(heroineName) {
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  var gi = Math.floor(Math.random() * GIRLGROUP_PRESETS.groupNames.length);
  var groupName = GIRLGROUP_PRESETS.groupNames[gi];
  var company = GIRLGROUP_PRESETS.company;
  var concept = pick(GIRLGROUP_PRESETS.concepts);
  var fandom = GIRLGROUP_PRESETS.fandoms[gi]; // 与团名同 index 匹配
  // 随机 2-3 首"出名"的歌
  var pool = GIRLGROUP_PRESETS.songs.slice();
  var songCount = 2 + (Math.random() < 0.5 ? 0 : 1);
  var songs = [];
  for (var i = 0; i < songCount && pool.length; i++) {
    var idx = Math.floor(Math.random() * pool.length);
    songs.push(pool.splice(idx, 1)[0]);
  }
  var debutYears = 2 + Math.floor(Math.random() * 2); // 出道 2-3 年
  // 5 位姐姐成员 + 女主（第 6 位）
  var members = GIRLGROUP_PRESETS.sisterRoles.map(function(role, i) {
    return { pos: i + 1, role: role, name: '姐姐' + (i + 1) };
  });
  members.push({ pos: 6, role: '门面(Visual) + 忙内(Maknae)', isHeroine: true, name: heroineName || '你' });
  return {
    groupName: groupName,
    company: company,
    concept: concept,
    fandom: fandom,
    debutYears: debutYears,
    songs: songs,
    members: members,
    heroinePos: '门面(Visual) + 忙内(Maknae)',
    statusDesc: '出道 ' + debutYears + ' 年始终二线，偶尔音源突入围榜单但没能破圈；公司资源紧，多靠打歌舞台 + 综艺刷脸；团里私下常聊"我们不会也轮到解散吧"。'
  };
}

// ==================== 1v1 深夜脆弱事件池 ====================
export var LATE_NIGHT_EVENTS = [
  { minAff: 40, affDeltas: [3, 2, 1], scenario: '凌晨三点他发来消息：「你睡了吗？」「其实有好多想跟你说……」「算了就当没看见。」', options: ['回他「我一直在，你说」', '直接打电话过去', '明天见面时问他昨晚想说什么'] },
  { minAff: 40, affDeltas: [2, 1, 1], scenario: '他打电话给你，接起来他不说话——你听到他在练习室里弹钢琴。', options: ['安静听着不挂断', '问他「你怎么了」', '说「弹得很好听」打破沉默'] },
  { minAff: 35, affDeltas: [3, 2, 1], scenario: '他发了一首歌曲的链接，什么都没说。你点开发现是第一次约会时车里放的。', options: ['回他「你记得啊」', '也回一首歌给他', '已读明天再说但心里很开心'] },
  { minAff: 35, affDeltas: [1, 2, 1], scenario: '你半夜醒来发现手机亮着——他凌晨两点发了条朋友圈又秒删了，但你看到了。', options: ['截图了但假装没看到', '发消息问他「睡不着吗」', '明天见面时装作不经意地问'] },
  { minAff: 40, affDeltas: [2, 1, 2], scenario: '半夜收到他发来的自拍——在录音室闭着眼靠着话筒，配文「还在」。', options: ['回他「我等你」', '打电话过去听他说说话', '说「早点休息明天我来看你」'] },
  { minAff: 30, affDeltas: [2, 1, 3], scenario: '他发来一张窗外的月亮的照片：「今晚的月亮很好看，你也看到了吗。」', options: ['也拍一张月亮回过去', '回他「你那边月亮更圆」', '说「你在哪我过去找你」'] },
  { minAff: 50, affDeltas: [2, 1, 3], scenario: '凌晨三点你听到门口有动静——他靠在墙上坐在地上睡着了，手机屏幕亮着你们的聊天框。', options: ['蹲下来轻声叫醒他', '拿件外套盖在他身上', '把他拉进屋说「进来睡」'] },
  { minAff: 50, affDeltas: [1, 2, 3], scenario: '他喝多了发来一条语音，你点开听到他说「我好想你啊……」。然后是一条撤回提示。', options: ['当没看到明天再说', '回他「我也想你」然后撤回', '打电话过去听他说醉话'] },
  { minAff: 35, affDeltas: [2, 0, 1], scenario: '他深夜更新了一条社交动态——只有你们俩懂的暗语。底下的粉丝都在猜是什么意思。', options: ['在评论区回了一个同样的emoji', '私信他说「我看到了」', '截图存档什么都不说'] },
  { minAff: 45, affDeltas: [3, 1, 2], scenario: '他半夜发烧到39度，但死活不肯去医院，打电话给你说「你在就好了」。', options: ['赶过去照顾他到天亮', '打电话教他吃药量体温', '说「那我过去陪你去医院」'] }
];

// ==================== 1v1 结局文案池（IMP-18：HE/NE/BE） ====================
// 供结局生成时注入基调提示，让 AI 写出贴合档位的收束
export var ONE_HEART_ENDING_TEMPLATES = {
  // —— 通用兜底档（保留，避免缺键）——
  HE: { label: '修成正果', desc: '曝光可控 + 男主表现好（哥哥给出祝福）+ 情敌未翻车 + 好感达标。公开被祝福的圆满结局。', tone: '温暖、笃定、有未来感。可写公开的一刻、哥哥的祝福、两人对未来的规划。' },
  NE: { label: '相守于暗', desc: '仍在地下但稳定——中等所有 meter，未公开也未崩盘，平淡相守。', tone: '温柔、克制、余韵悠长。仍藏在公众视线之外，但彼此安心，不急着公开。' },
  BE: { label: '分道扬镳', desc: '公众曝光翻车 / 情敌赢了 / 关系本身失败，任一爆表即触发。', tone: '遗憾或释然。可写曝光风波、误会难解、或男主选择放手，但保持人物尊严，不狗血。' },
  // —— HE 细分 ——
  HE_PUBLIC: { label: '公开婚礼', desc: '曝光可控 + 哥哥祝福 + 公开承认，盛大公开的一刻。', tone: '璀璨、笃定、有未来感。写公开的那一刻、哥哥的祝福、两人对未来的规划。' },
  HE_UNDERGROUND: { label: '地下永久', desc: '仍藏在公众视线外但稳定相守，彼此安心。', tone: '温柔、克制、余韵悠长，不急着公开却笃定。' },
  HE_BABY: { label: '带球跑', desc: '热恋极深、关系稳固，意外迎来新生命，甜蜜升级。', tone: '惊喜、柔软、生活感，写新的小生命带来的温暖。' },
  // —— NE 细分 ——
  NE_PEACE: { label: '和平分手', desc: '中等所有 meter，好聚好散，留给彼此体面。', tone: '温柔释然，不撕破脸，写体面的告别。' },
  NE_DISTANCE: { label: '远距离', desc: '因行程/异地难常见，但心里有彼此。', tone: '克制、思念、相望，写距离中的牵挂。' },
  NE_AMBIGUOUS: { label: '暧昧未明', desc: '好感未足、关系停在暧昧，无明确结局。', tone: '朦胧、留白、余韵，写未说破的心动。' },
  // —— BE 细分 ——
  BE_SCANDAL: { label: '曝光塌房', desc: '绯闻彻底爆表，公众风波压垮关系。', tone: '遗憾或释然，保持尊严不狗血，写风波后的清醒。' },
  BE_RIVAL: { label: '情敌上位', desc: '情敌趁虚而入、反客为主，原男主出局。', tone: '苦涩、错位，写立场的悄然反转。' },
  BE_BROTHER: { label: '哥哥反对', desc: '哥哥强烈反对，关系被迫止步。', tone: '无奈、拉扯，写亲情与爱情的冲突。' },
  // —— 隐藏结局 ——
  HIDDEN_RIVAL: { label: '和情敌在一起', desc: '你最终接受了情敌的心意，原男主成了过去式。', tone: '意外、反转、新的开始，写心之所向的坦诚。' },
  // —— 娱乐圈模拟器·事业向结局（entSim）——
  HE_STAR: { label: '顶流情侣', desc: '人气冲顶（顶流）+ 感情稳固 + 哥哥祝福，事业爱情双丰收的圆满。', tone: '璀璨、笃定、有未来感。写两人各自在事业巅峰仍紧握彼此的手，公开或被祝福的那一刻，以及并肩走下去的底气。' },
  NE_CAREER: { label: '事业独美', desc: '人气冲顶但感情没走到一起——女主选择专注事业，活成自己的光。', tone: '清醒、疏离却从容。写她在事业巅峰时的独当一面，对那段无果的感情只剩淡淡余温，不遗憾、不回头。' },
  BE_CAREER: { label: '事业塌房', desc: '人气崩盘 + 曝光翻车，人设与事业一起垮掉。', tone: '狼狈、清醒、余震不断。写从高处跌落的过程，以及她在废墟里重新审视自己，保持人物尊严不彻底狗血。' }
};

// ==================== 1v1 情敌专属事件池 ====================
export var RIVAL_EVENTS = [
  { minAff: 20, affDeltas: [-1, 1, -2], scenario: '他路过你公司楼下说"顺路"——但你公司和他公司完全不顺路。', options: ['客气道谢：「辛苦了」', '拆穿他：「你公司不在这边吧」', '心里有点动摇但没戳破'] },
  { minAff: 20, affDeltas: [-2, 1, -1], scenario: '你随口说过喜欢的东西，第二天他就买来给你了。他说「刚好看到」。', options: ['收下并道谢', '拒绝：「太贵了不能收」', '收下了但心里有些复杂'] },
  { minAff: 30, affDeltas: [-2, 1, 1], scenario: '下雨天他把伞塞给你，自己淋雨跑了。你喊都喊不住。', options: ['追上去一起撑', '站在原地看他跑远', '第二天把伞洗干净还他'] },
  { minAff: 30, affDeltas: [-2, 1, 2], scenario: '深夜他发来一条消息：「我知道不该找你，但我还是想问——你今天过得好吗。」', options: ['回他：「挺好的，你呢」', '装作没看到明天再说', '回他：「你找我……不太好吧」'] },
  { minAff: 20, affDeltas: [-2, 1, -1], scenario: '你加班到很晚走出公司，发现他在门口——说"刚好路过"。', options: ['一起走一段路', '说「太晚了快回去吧」', '请他喝杯咖啡当感谢'] },
  { minAff: 20, affDeltas: [-2, 0, 1], scenario: '共同朋友组局，他坐在你对面，全程眼神躲闪。你们一整晚没说上一句话。', options: ['主动找他喝一杯', '当作没发现继续玩', '提前离场回避尴尬'] },
  { minAff: 25, affDeltas: [-1, 1, 0], scenario: '他帮你解决了一个工作上的大难题，却说「举手之劳」。你知道没那么简单。', options: ['认真请他吃饭道谢', '发消息说「真的很感谢」', '心里记下了但没多说'] },
  { minAff: 25, affDeltas: [-2, 0, -1], scenario: '他在朋友圈发了你提过想去的地方的照片——配文只写了一个词：下次？', options: ['评论：「去！」', '点赞但没留言', '截图发给朋友说"他什么意思"'] },
  { minAff: 30, affDeltas: [0, 1, -2], scenario: '你们单独相处时他突然很安静，你看向他——他正看着你，眼神来不及躲开。', options: ['假装没发现继续聊', '问他「怎么了」', '也看着他，等他说什么'] },
  { minAff: 30, affDeltas: [1, -1, 0], scenario: '他喝多了给你打电话，说了很多话。第二天发消息：「昨晚我没说什么不该说的吧？」', options: ['说「没有啊」', '回他「你说了很多」', '没有回复让他自己猜'] }
];

// ==================== 身份关系网映射 ====================
export var IDENTITY_RELATION_MAP = {
  '队友的妹妹': { role: '哥哥', gender: 'male', fromSEVENTEEN: true, isRival: false, needExtraRival: true, livesTogether: true },
  '同公司师妹': { role: '师兄', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false },
  '女团爱豆': { role: '队友', gender: 'female', fromSEVENTEEN: false, isRival: false, needExtraRival: true },
  '站姐/大粉': { role: '前同事', gender: 'female', fromSEVENTEEN: false, isRival: false, needExtraRival: true },
  '素人': { role: '闺蜜', gender: 'female', fromSEVENTEEN: false, isRival: false, needExtraRival: true },
  '财阀千金': { role: '未婚夫', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false },
  '品牌方助理': { role: '上司', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false },
  '女演员': { role: '戏内搭档', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false },
  '百万网红博主': { role: '经纪人', gender: 'female', fromSEVENTEEN: false, isRival: false, needExtraRival: true },
  '超模/平面模特': { role: '摄影师', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false },
  '带货女主播': { role: 'MCN老板', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false },
  '独立音乐人': { role: '音乐制作人', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false },
  '体育生/运动员': { role: '教练', gender: 'male', fromSEVENTEEN: true, isRival: true, needExtraRival: false }
};

// ==================== 世界观与公开身份兼容性映射 ====================
export var WORLD_IDENTITY_COMPATIBILITY = {
  ancient: ['素人', '体育生/运动员', '独立音乐人'],
  apocalypse: ['素人', '体育生/运动员', '独立音乐人'],
  esports: ['素人', '体育生/运动员', '独立音乐人'],
  college: ['站姐/大粉', '素人', '女团爱豆', '财阀千金', '品牌方助理', '女演员', '百万网红博主', '超模/平面模特', '带货女主播', '独立音乐人', '体育生/运动员'],
  neighbor: ['站姐/大粉', '素人', '女团爱豆', '财阀千金', '品牌方助理', '女演员', '百万网红博主', '超模/平面模特', '带货女主播', '独立音乐人', '体育生/运动员'],
  travel: ['站姐/大粉', '素人', '女团爱豆', '财阀千金', '品牌方助理', '女演员', '百万网红博主', '超模/平面模特', '带货女主播', '独立音乐人', '体育生/运动员'],
  office: ['站姐/大粉', '素人', '女团爱豆', '财阀千金', '品牌方助理', '女演员', '百万网红博主', '超模/平面模特', '带货女主播', '独立音乐人', '体育生/运动员'],
  transfer_house: 'all',
  variety_show: 'all',
  entertainment: 'all',
  custom: 'all'
};

// ==================== 娱乐圈新闻模板（1v1）====================
export var NEWS_TEMPLATES = [
  // 🎵 作品/舞台 30
  { id: 'nw_01', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 新曲音中初舞台，直拍破百万', source: '热搜榜' },
  { id: 'nw_02', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 最新自作曲公开，制作人好评', source: 'OSEN' },
  { id: 'nw_03', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 回归预告照公开，概念感拉满', source: '官方' },
  { id: 'nw_04', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 主打曲 MV 播放量破千万', source: '热搜榜' },
  { id: 'nw_05', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 演唱会饭拍出圈，被赞舞台王者', source: '粉丝站' },
  { id: 'nw_06', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 参与专辑制作，收录曲获好评', source: '体育京乡' },
  { id: 'nw_07', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 舞蹈挑战视频爆红，翻跳热潮', source: '热搜榜' },
  { id: 'nw_08', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 打歌舞台直拍连续四周破百万', source: '粉丝站' },
  { id: 'nw_09', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 为 OST 献声，音源空降榜单', source: 'OSEN' },
  { id: 'nw_10', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 演唱会安可舞台感动全场', source: '官方' },
  { id: 'nw_11', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 编舞视频公开，展现创作才华', source: '官方' },
  { id: 'nw_12', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 合作舞台破圈，被前辈盛赞', source: 'OSEN' },
  { id: 'nw_13', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 回归预告照风格大变，引发热议', source: '热搜榜' },
  { id: 'nw_14', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 音乐节现场圈粉无数', source: '路透社' },
  { id: 'nw_15', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 合作曲成绩亮眼，榜单逆袭', source: '体育京乡' },
  { id: 'nw_16', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 自作曲被选为电视剧 OST', source: 'OSEN' },
  { id: 'nw_17', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 年末舞台特别编排，期待值拉满', source: '官方' },
  { id: 'nw_18', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 练习室视频公开，全新编舞引关注', source: '官方' },
  { id: 'nw_19', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 巡演门票秒罄，加场呼声高', source: '热搜榜' },
  { id: 'nw_20', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 庆功宴上即兴表演被偷拍曝光', source: '路透社' },
  { id: 'nw_21', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 录音室花絮公开，素颜状态超好', source: '粉丝站' },
  { id: 'nw_22', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 海外粉丝应援牌被本人认证', source: '粉丝站' },
  { id: 'nw_23', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 新歌编曲细节被扒，全员创作型', source: '粉丝站' },
  { id: 'nw_24', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 中场休息花絮流出，私下可爱反差', source: '热搜榜' },
  { id: 'nw_25', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 年末颁奖礼表演被评最佳舞台', source: 'OSEN' },
  { id: 'nw_26', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 特别舞台合作达成，粉丝狂喜', source: '热搜榜' },
  { id: 'nw_27', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 连续作战仍坚持自拍营业', source: '粉丝站' },
  { id: 'nw_28', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 新曲舞蹈版 MV 公开，质量炸裂', source: '官方' },
  { id: 'nw_29', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 翻唱视频登上热趋，嗓音获好评', source: '热搜榜' },
  { id: 'nw_30', type: 'work', emoji: '🎵', sentiment: 'positive', title: '{memberName} 练习到深夜被拍，敬业态度感动粉丝', source: '路透社' },

  // 📺 综艺/活动 22
  { id: 'nw_31', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 综艺反应慢半拍，可爱出圈', source: '热搜榜' },
  { id: 'nw_32', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 综艺上模仿队友，笑翻全场', source: '热搜榜' },
  { id: 'nw_33', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 成为品牌代言人，广告大片公开', source: '官方' },
  { id: 'nw_34', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 杂志画报公开，氛围感拉满', source: '官方' },
  { id: 'nw_35', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 时尚活动造型出圈，被赞行走衣架', source: '热搜榜' },
  { id: 'nw_36', type: 'variety', emoji: '📺', sentiment: 'neutral', title: '{memberName} 担任特别 MC 主持，表现自然', source: 'OSEN' },
  { id: 'nw_37', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 电台节目展现反转魅力', source: '官方' },
  { id: 'nw_38', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 综艺上被队友爆料日常糗事', source: '热搜榜' },
  { id: 'nw_39', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 品牌活动生图出圈，状态满分', source: '粉丝站' },
  { id: 'nw_40', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 综艺游戏环节意外摔倒但反应超快', source: '热搜榜' },
  { id: 'nw_41', type: 'variety', emoji: '📺', sentiment: 'neutral', title: '{memberName} 直播中不小心剧透回归内容', source: '粉丝站' },
  { id: 'nw_42', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 粉丝签售会暖心语录刷屏', source: '粉丝站' },
  { id: 'nw_43', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 被拍到在待机室认真记笔记', source: '路透社' },
  { id: 'nw_44', type: 'variety', emoji: '📺', sentiment: 'neutral', title: '{memberName} 综艺上被问到理想型，回答引热议', source: '热搜榜' },
  { id: 'nw_45', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 粉丝见面会上弹唱自作曲', source: '粉丝站' },
  { id: 'nw_46', type: 'variety', emoji: '📺', sentiment: 'neutral', title: '{memberName} 参加品牌站台活动，现场人山人海', source: '热搜榜' },
  { id: 'nw_47', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 综艺感爆发，被 PD 夸有艺能感', source: 'OSEN' },
  { id: 'nw_48', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 机场穿搭被粉丝称为男友风教科书', source: '粉丝站' },
  { id: 'nw_49', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 综艺上表演拿手料理，被赞厨艺', source: '热搜榜' },
  { id: 'nw_50', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 采访中提及童年梦想，坦诚圈粉', source: 'OSEN' },
  { id: 'nw_51', type: 'variety', emoji: '📺', sentiment: 'neutral', title: '{memberName} 直播时被粉丝刷屏提问谈恋爱', source: '热搜榜' },
  { id: 'nw_52', type: 'variety', emoji: '📺', sentiment: 'positive', title: '{memberName} 海外签售会上说中文宠粉', source: '粉丝站' },

  // 💔 绯闻传闻 24
  { id: 'nw_53', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 被拍到与神秘女性深夜同行', source: 'D社' },
  { id: 'nw_54', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '疑似 {memberName} 恋情曝光，女方身份引猜测', source: '热搜榜' },
  { id: 'nw_55', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 同款手链引发恋爱传闻', source: '粉丝站' },
  { id: 'nw_56', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 被曝深夜出入某公寓', source: 'D社' },
  { id: 'nw_57', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '网传 {memberName} 与某女爱豆关系密切', source: '热搜榜' },
  { id: 'nw_58', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 手机壳被发现疑似情侣款', source: '粉丝站' },
  { id: 'nw_59', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{rivalName} 在采访中坦言最近有心动的感觉', source: 'OSEN' },
  { id: 'nw_60', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '粉丝扒出 {memberName} 近期行踪反常', source: '粉丝站' },
  { id: 'nw_61', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 和某女性同款背景被扒同游', source: '热搜榜' },
  { id: 'nw_62', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '狗仔拍到 {memberName} 车内与神秘人交谈', source: 'D社' },
  { id: 'nw_63', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 粉丝站关站，疑似因恋情', source: '粉丝站' },
  { id: 'nw_64', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 经纪公司拒绝回应恋情传闻', source: '热搜榜' },
  { id: 'nw_65', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 被拍到与友人聚餐，女方身份成谜', source: '路透社' },
  { id: 'nw_66', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '论坛热帖：扒一扒 {memberName} 最近的异常', source: '热搜榜' },
  { id: 'nw_67', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 品牌活动上被记者问到恋爱问题', source: 'OSEN' },
  { id: 'nw_68', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '疑似 {memberName} 社交账号小号被挖', source: '粉丝站' },
  { id: 'nw_69', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '营销号爆料 {memberName} 正在秘密恋爱', source: '热搜榜' },
  { id: 'nw_70', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 直播时背景出现疑似女性物品', source: '粉丝站' },
  { id: 'nw_71', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{rivalName} 被拍到在 {memberName} 家楼下徘徊', source: '路透社' },
  { id: 'nw_72', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 取消关注引猜测，粉丝追问真相', source: '热搜榜' },
  { id: 'nw_73', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{brotherName} 被问及 {memberName} 感情状况时沉默', source: 'OSEN' },
  { id: 'nw_74', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '私生拍到 {memberName} 与神秘女性并肩走路', source: 'D社' },
  { id: 'nw_75', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 网综里说漏嘴，疑似已有对象', source: '热搜榜' },
  { id: 'nw_76', type: 'scandal', emoji: '💔', sentiment: 'negative', title: '{memberName} 手机屏保被拍到角落在场粉丝炸锅', source: '粉丝站' },

  // 🚨 争议/翻车 16
  { id: 'nw_77', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 私生跟车事件引发安保争议', source: '热搜榜' },
  { id: 'nw_78', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 线上直播遭遇恶评攻击', source: '粉丝站' },
  { id: 'nw_79', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 机场被围堵，安保升级', source: '路透社' },
  { id: 'nw_80', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '粉丝抗议公司对 {memberName} 行程安排', source: '粉丝站' },
  { id: 'nw_81', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 被恶意剪辑引发争议', source: '热搜榜' },
  { id: 'nw_82', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '私生饭潜入 {memberName} 休息室被曝光', source: '热搜榜' },
  { id: 'nw_83', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 粉丝之间爆发网络骂战', source: '热搜榜' },
  { id: 'nw_84', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 未公开行程被泄露，公司追责', source: 'OSEN' },
  { id: 'nw_85', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 旧照被翻出，被人恶意解读', source: '热搜榜' },
  { id: 'nw_86', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '代拍扰乱 {memberName} 机场秩序被制止', source: '路透社' },
  { id: 'nw_87', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '网络黑帖造谣 {memberName} 人品争议', source: '粉丝站' },
  { id: 'nw_88', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 被恶意 AI 换脸视频困扰', source: '热搜榜' },
  { id: 'nw_89', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 演出行程过密引粉丝担忧健康', source: '粉丝站' },
  { id: 'nw_90', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 回归造型被批背离风格', source: '热搜榜' },
  { id: 'nw_91', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 商演现场音响故障导致表演中断', source: '路透社' },
  { id: 'nw_92', type: 'controversy', emoji: '🚨', sentiment: 'negative', title: '{memberName} 被拍到私下冷脸，黑粉拿来做文章', source: '热搜榜' },

  // 👥 团队动态 24
  { id: 'nw_93', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 团体综艺定档，预告片公开', source: '官方' },
  { id: 'nw_94', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 新专辑预售开启，配置公开', source: '官方' },
  { id: 'nw_95', type: 'team', emoji: '👥', sentiment: 'positive', title: '{team} 团体舞台完整版公开被赞刀群舞', source: '热搜榜' },
  { id: 'nw_96', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 海外巡演日程公开', source: '官方' },
  { id: 'nw_97', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 回归发布会媒体采访全文公开', source: 'OSEN' },
  { id: 'nw_98', type: 'team', emoji: '👥', sentiment: 'positive', title: '{team} 团体综艺幕后花絮暖心', source: '粉丝站' },
  { id: 'nw_99', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 团体代言新品牌，广告将在下月释出', source: '官方' },
  { id: 'nw_100', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 出道周年纪念周边发售', source: '官方' },
  { id: 'nw_101', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 线上粉丝见面会时间确定', source: '官方' },
  { id: 'nw_102', type: 'team', emoji: '👥', sentiment: 'positive', title: '{team} 团体票房纪录刷新，海外人气认证', source: '体育京乡' },
  { id: 'nw_103', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 全员参与公益项目获好评', source: 'OSEN' },
  { id: 'nw_104', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 团综拍摄路透曝光', source: '路透社' },
  { id: 'nw_105', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 团体画报拍摄花絮公开', source: '官方' },
  { id: 'nw_106', type: 'team', emoji: '👥', sentiment: 'positive', title: '{team} 年末颁奖礼表演舞台公开', source: '官方' },
  { id: 'nw_107', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 团体休假照流出，氛围温馨', source: '粉丝站' },
  { id: 'nw_108', type: 'team', emoji: '👥', sentiment: 'positive', title: '{team} 成员互相应援团魂满满', source: '粉丝站' },
  { id: 'nw_109', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 官方会员招募开放', source: '官方' },
  { id: 'nw_110', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 团体直播聊本周近况', source: '官方' },
  { id: 'nw_111', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 红毯造型全员登场，各具风格', source: '热搜榜' },
  { id: 'nw_112', type: 'team', emoji: '👥', sentiment: 'positive', title: '{team} 练习室群舞整齐划一获盛赞', source: '粉丝站' },
  { id: 'nw_113', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 粉丝见面会互动环节设计曝光', source: '粉丝站' },
  { id: 'nw_114', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 被拍到集体聚餐，氛围融洽', source: '路透社' },
  { id: 'nw_115', type: 'team', emoji: '👥', sentiment: 'neutral', title: '{team} 团队综艺最新一集收视率出炉', source: 'OSEN' },
  { id: 'nw_116', type: 'team', emoji: '👥', sentiment: 'positive', title: '{team} 海外粉丝应援项目达成新纪录', source: '粉丝站' },

  // 🎂 个人/生日 14
  { id: 'nw_117', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '今天是 {memberName} 的生日，粉丝应援破纪录', source: '粉丝站' },
  { id: 'nw_118', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 生日直播感谢粉丝支持', source: '官方' },
  { id: 'nw_119', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 个人杂志创刊号开售秒空', source: '官方' },
  { id: 'nw_120', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 个人行程花絮公开，私下真实模样', source: '粉丝站' },
  { id: 'nw_121', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 被选为全球品牌大使', source: '官方' },
  { id: 'nw_122', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 个人 YouTube 频道订阅破百万', source: '热搜榜' },
  { id: 'nw_123', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 捐赠善款被媒体报道，人帅心善', source: 'OSEN' },
  { id: 'nw_124', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 最新直播截图被赞颜值绝了', source: '粉丝站' },
  { id: 'nw_125', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 被拍到逛书店，文艺气质拉满', source: '路透社' },
  { id: 'nw_126', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 综艺中提及个人爱好撞脸同款', source: '热搜榜' },
  { id: 'nw_127', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 社交平台更新日常照引粉丝狂欢', source: '粉丝站' },
  { id: 'nw_128', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 被偶遇在便利店的可爱瞬间', source: '路透社' },
  { id: 'nw_129', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 自拍营业频率上升，粉丝幸福', source: '粉丝站' },
  { id: 'nw_130', type: 'personal', emoji: '🎂', sentiment: 'positive', title: '{memberName} 休假日照曝光，私下穿搭休闲', source: '路透社' }
];
