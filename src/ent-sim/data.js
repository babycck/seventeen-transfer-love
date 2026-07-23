// ============================================================
// 娱乐圈模拟器（entSim）· 静态数据层
// 周期 / 作品槽 / 四维舆论 / 关系网 / 地下恋 / 章节 / 营业 / 颁奖 / 合作企划 / 每日舆论
// 全部为纯数据，不依赖运行时状态。图标映射统一用 emoji（移动端可读）。
// ============================================================

// ---------- 职业（系统4 关系网·职业差异 + 起点差异） ----------
// career key 同时决定起点章节 / 起点人气 / 与 SEVENTEEN 的距离。
export var ENT_SIM_CAREERS = {
  '爱豆': {
    label: '爱豆', icon: '🎤',
    startChapter: 2, startPopularity: 40,
    diff: '台前曝光极高，恋情一旦被粉丝/狗仔发现立即引爆脱粉与黑热搜，人气与事业双崩。',
    proximity: '团内', // 与 SEVENTEEN 同公司/同圈
    sisterSetting: true
  },
  '演员': {
    label: '演员', icon: '🎬',
    startChapter: 3, startPopularity: 45,
    diff: '台前但曝光可塑，营业 CP 常被安排，地下恋靠资源掩护。',
    proximity: '圈内合作',
    sisterSetting: false
  },
  '歌手': {
    label: '歌手', icon: '🎧',
    startChapter: 2, startPopularity: 38,
    diff: '台前音乐人，巡演异地是恋爱最大敌人，同行共鸣是情感基础。',
    proximity: '圈内合作',
    sisterSetting: false
  },
  '主播': {
    label: '主播', icon: '📺',
    startChapter: 1, startPopularity: 25,
    diff: '半台前，粉丝黏性强但舆论脆，直播口误即塌房，男友易被粉丝扒。',
    proximity: '圈外跨界',
    sisterSetting: false
  },
  '模特': {
    label: '模特', icon: '👗',
    startChapter: 2, startPopularity: 35,
    diff: '台前时尚圈，红毯/杂志曝光高，营业 CP 多为时尚联名，恋情靠避嫌。',
    proximity: '圈外跨界',
    sisterSetting: false
  },
  '经纪人': {
    label: '经纪人', icon: '📋',
    startChapter: 3, startPopularity: 20,
    diff: '幕后，能跟男主团队天天互动，营业 CP 是帮别人拉郎，自己吃醋旁观。',
    proximity: '团内',
    sisterSetting: false
  },
  '化妆师': {
    label: '化妆师', icon: '💄',
    startChapter: 2, startPopularity: 15,
    diff: '幕后，贴身跟妆男主，天然掩护但被拍到亲密会被说"利用职务之便"，刺激感拉满。',
    proximity: '团内',
    sisterSetting: false
  },
  '练习生': {
    label: '练习生', icon: '🌱',
    startChapter: 1, startPopularity: 12,
    diff: '准台前，资源最少压力最大，出道即分水岭，暗恋前辈不敢声张。',
    proximity: '团内',
    sisterSetting: true
  },
  '编舞': {
    label: '编舞', icon: '💃',
    startChapter: 2, startPopularity: 18,
    diff: '幕后创作，和男主在练习室独处多，肢体接触自然，恋情藏于编舞笔记。',
    proximity: '团内',
    sisterSetting: false
  },
  '作词人': {
    label: '作词人', icon: '✍️',
    startChapter: 2, startPopularity: 16,
    diff: '幕后创作，歌词藏心事，男主唱了她的词＝公开暗恋现场。',
    proximity: '团内',
    sisterSetting: false
  }
};

// setup 职业下拉用（派生自 ENT_SIM_CAREERS，保留 name 字段以兼容 buildSisterProfHtml）
export var ENT_SIM_CAREER_LIST = Object.keys(ENT_SIM_CAREERS).map(function(k) {
  return { name: k, startChapter: ENT_SIM_CAREERS[k].startChapter, icon: ENT_SIM_CAREERS[k].icon };
});

// ---------- 系统1 周期 ----------
// 4 相位（不绑定日历日）：蛰伏期/发力期/高光期/回落期。
export var CYCLE_PHASES = [
  { key: '蛰伏期', icon: '🌫️', meaning: '资源少、曝光低，适合沉淀与地下恋', riskMult: 0.7 },
  { key: '发力期', icon: '🔥', meaning: '作品推进、曝光上升，恋情易被拍', riskMult: 1.0 },
  { key: '高光期', icon: '🌟', meaning: '顶流焦点，一切被放大，地下恋高危', riskMult: 1.6 },
  { key: '回落期', icon: '🍂', meaning: '热度自然衰减，危机缓和，适合补恋爱', riskMult: 0.9 }
];

// 阶段（大节奏）：新人期/上升期/巅峰期/传奇期。阶段由人气阈值 + 章节推进。
export var CYCLE_STAGE_META = [
  { key: '新人期', icon: '🌱', popThreshold: 0 },
  { key: '上升期', icon: '📈', popThreshold: 35 },
  { key: '巅峰期', icon: '👑', popThreshold: 65 },
  { key: '传奇期', icon: '🏆', popThreshold: 88 }
];

// ---------- 系统2 作品槽 ----------
// 四阶段：筹备期(0)→拍摄/制作期(1)→宣发/在播期(2)→已完结/收官期(3)。在播作品数 ×2 = 资源等级加成；在播期满 6 回合自动收官下档，资源加成归零。
export var WORK_TYPES = {
  drama: { label: '剧集', icon: '🎬', defaultTitle: '未命名剧集', sweet: false, riskBase: 2 },
  movie: { label: '电影', icon: '🎥', defaultTitle: '未命名电影', sweet: false, riskBase: 3 },
  variety: { label: '综艺', icon: '🎪', defaultTitle: '未命名综艺', sweet: false, riskBase: 2 },
  album: { label: '专辑', icon: '💿', defaultTitle: '未命名专辑', sweet: false, riskBase: 2 },
  ost: { label: 'OST', icon: '🎵', defaultTitle: '未命名 OST', sweet: false, riskBase: 1 },
  collab: { label: '合作曲', icon: '🤝', defaultTitle: '未命名合作曲', sweet: true, riskBase: 2 }
};

// 开新作品命名候选池：用户不填时随机取一个，避免「未命名」
export var WORK_TITLE_SUGGEST = {
  drama: ['月光下的我们', '十七岁的雨季', '幕后玩家', '心动信号', '逆光之城', '夏夜未眠'],
  movie: ['盛夏告白', '星河彼岸', '无名之辈', '初恋限定', '时光信使', '白色信封'],
  variety: ['出其不意的周末', '心动营业中', '卧底日记', '好朋友挑战赛', '深夜食光', '反差萌现场'],
  album: ['二十岁的情书', '蓝色海岸', '夜色温柔', '小确幸', '蒸发', '晚安电波'],
  ost: ['你是我眼里的光', '晚风轻语', '心跳节拍', '未完成的告白', '星轨', '晴天的你'],
  collab: ['双生', '同频', '巧合', '半糖', '限定旋律', '合拍']
};

// ---------- 系统3 四维舆论 ----------
export var OPINION_DIMS = [
  { key: 'fan', label: '粉丝', icon: '💖' },
  { key: 'media', label: '媒体', icon: '📰' },
  { key: 'professional', label: '专业', icon: '🎓' },
  { key: 'anti', label: '黑粉', icon: '⚫' }
];

// 危机公关（手动，每次 -哥哥支持度 3，限量）
export var PR_ACTIONS = {
  deny: { label: '否认', icon: '🛡️', deltas: { fan: -1, media: -3, professional: 0, anti: 2 }, note: '嘴硬但留实锤风险，黑粉涨' },
  preempt: { label: '自曝', icon: '💡', deltas: { fan: -5, media: 3, professional: 1, anti: -3 }, note: '先发制人抢叙事，粉丝掉但媒体转正面' },
  buyout: { label: '买断料', icon: '💰', deltas: { fan: 0, media: 4, professional: 0, anti: -2 }, note: '花钱消灾，媒体闭嘴，烧资源' },
  divert: { label: '转移焦点', icon: '🎯', deltas: { fan: 2, media: 1, professional: 0, anti: 0 }, note: '抛新话题盖旧料，治标不治本' }
};

// ---------- 系统4 关系网（7 类 NPC） ----------
export var NPC_TYPES = {
  broker: { label: '经纪人', icon: '📋', stanceOptions: ['利益绑定', '暗中提点', '摆烂'] },
  paparazzi: { label: '狗仔', icon: '📸', stanceOptions: ['盯梢', '已买断', '放料'] },
  fanleader: { label: '站姐', icon: '📷', stanceOptions: ['护你', '吃瓜', '回踩'] },
  media: { label: '媒体人', icon: '🎙️', stanceOptions: ['捧', '中立', '黑'] },
  rival: { label: '情敌', icon: '💢', stanceOptions: ['暗恋男主', '试探你', '退出祝福'] },
  suitor: { label: '男主的情敌', icon: '💘', stanceOptions: ['暗恋你', '明争暗斗', '退出祝福'] },
  senior: { label: '圈内前辈', icon: '🧑', stanceOptions: ['提携', '嫉妒', '中立'] },
  brand: { label: '品牌方', icon: '👜', stanceOptions: ['想续约', '观望', '撤资'] }
};

// NPC 事件池（按类型 + 周期相位）。每个事件：{text, intimacy, stance, exposure, flag?}
// exposure = 该事件带来的曝光/实锤风险（正值升高危）
export var NPC_EVENT_POOLS = {
  broker: {
    all: [
      { text: '经纪人把你和男主的航班重合当成巧合，提醒你“别被拍到同框”', intimacy: 1, stance: '暗中提点', exposure: 1 },
      { text: '经纪人提醒你恋情要是被狗仔拍到，粉丝反噬会直接冲垮事业，让你近期低调、别在公开场合同框', intimacy: -1, stance: '利益绑定', exposure: 0, flag: 'contractRead' },
      { text: '经纪人帮你把深夜探班安排成“工作会议”，打了掩护', intimacy: 2, stance: '暗中提点', exposure: -1 }
    ]
  },
  paparazzi: {
    all: [
      { text: '狗仔在你们常去的店外蹲了三小时，发了条意味深长的微博', intimacy: 0, stance: '盯梢', exposure: 3 },
      { text: '狗仔私信经纪人开价买断一组同框图', intimacy: 0, stance: '放料', exposure: 4, flag: 'paparazziArmed' },
      { text: '狗仔被竞品买断，暂时收手', intimacy: 0, stance: '已买断', exposure: -2 }
    ]
  },
  fanleader: {
    all: [
      { text: '站姐在超话发你单人直拍，配文“姐姐状态绝了”', intimacy: 1, stance: '护你', exposure: 0 },
      { text: '站姐把你和男主的同款卫衣拼图发出来，评论区开始嗑', intimacy: 0, stance: '吃瓜', exposure: 2 },
      { text: '站姐发现你删了和男主的合照，深夜发长文“脱粉预警”', intimacy: -2, stance: '回踩', exposure: 3 }
    ]
  },
  media: {
    all: [
      { text: '媒体人约你做专访，话术里套你和男主的关系', intimacy: 0, stance: '中立', exposure: 2 },
      { text: '媒体人写了篇夸你业务能力的稿子，顺带提了你和男主的“革命友谊”', intimacy: 1, stance: '捧', exposure: 1 },
      { text: '媒体人拿到匿名爆料，准备做一期“顶流恋爱疑云”', intimacy: -1, stance: '黑', exposure: 4 }
    ]
  },
  rival: {
    all: [
      { text: '情敌在男主面前故意提起你，眼神里藏着不服', intimacy: 0, stance: '试探你', exposure: 1 },
      { text: '情敌借着营业 CP 名义靠近男主，被狗仔拍到', intimacy: -1, stance: '暗恋男主', exposure: 3 },
      { text: '情敌看你和男主越来越近，私下跟你说了句“祝你幸福”', intimacy: 1, stance: '退出祝福', exposure: 0, flag: 'rivalQuit' }
    ]
  },
  suitor: {
    all: [
      { text: '男主的情敌在团综里故意坐到你身边，借着游戏名义和你肢体接触，男主在旁边看得眯起眼', intimacy: 1, stance: '明争暗斗', exposure: 1 },
      { text: '男主的情敌给你发深夜消息“今天和你聊天很开心”，话里话外都在试探你对男主的态度', intimacy: 0, stance: '暗恋你', exposure: 1 },
      { text: '男主的情敌借着送你回家的机会，在车里低声说“其实我比他更早注意到你”', intimacy: 2, stance: '暗恋你', exposure: 2 },
      { text: '男主的情敌看你跟男主越来越近，私下跟你说“你们挺配的，我退出，不抢了”', intimacy: 1, stance: '退出祝福', exposure: 0, flag: 'suitorQuit' }
    ]
  },
  senior: {
    all: [
      { text: '前辈在颁奖礼后台拉你聊了句“年轻人谈恋爱要藏好”', intimacy: 1, stance: '提携', exposure: 0 },
      { text: '前辈在采访里暗讽“现在的小花靠绯闻上热搜”，疑似内涵你', intimacy: -1, stance: '嫉妒', exposure: 1 }
    ]
  },
  brand: {
    all: [
      { text: '品牌方看中你近期热度，想加签一份代言', intimacy: 1, stance: '想续约', exposure: 0 },
      { text: '品牌方听说绯闻传闻，暂缓了新一季合作', intimacy: -1, stance: '观望', exposure: 1 },
      { text: '品牌方因舆论风险直接撤了你的代言', intimacy: -2, stance: '撤资', exposure: 0, flag: 'brandPull' }
    ]
  }
};

// ---------- 系统5 地下恋 ----------
export var ROMANCE_DEPTH_LABELS = [
  { depth: 0, label: '初遇', icon: '🌱', desc: '他还只是你世界里的影子' },
  { depth: 1, label: '暧昧', icon: '🌸', desc: '眼神开始躲闪，却没说破' },
  { depth: 2, label: '暧昧明朗', icon: '💞', desc: '彼此都懂了，只是没点名' },
  { depth: 3, label: '恋情', icon: '💗', desc: '私下已是恋人，公开仍是禁区' },
  { depth: 4, label: '浓情', icon: '🔥', desc: '难舍难分，越藏越想公开' },
  { depth: 5, label: '公开', icon: '💍', desc: '走到台前，接受所有目光' }
];

export var ROMANCE_EMOTIONS = ['思念', '吃醋', '不安', '坚定', '温柔'];

// 5 种掩护手段（系统5）
export var COVER_MECHANISMS = {
  pretend: { label: '假装不熟', icon: '🤐', cost: '哥哥支持度 -3（可能转试探）', suspicion: 0 },
  brother: { label: '借哥哥打掩护', icon: '👨', cost: '哥哥支持度 -3（可能转 testing）', suspicion: 0 },
  avoid: { label: '避嫌约会', icon: '🚫', cost: '约会质量 +，被拍风险 +', suspicion: 1 },
  business: { label: '营业掩护', icon: '📺', cost: '情敌 +（被安排当 CP）', suspicion: 0 },
  company: { label: '公司掩护', icon: '🏢', cost: '看哥哥支持度，限量', suspicion: 0 }
};

// ---------- 系统7 章节 ----------
export var CHAPTERS = [
  { index: 1, name: '练习生期', icon: '🌱', desc: '资源最少，压力最大，暗恋不敢声张' },
  { index: 2, name: '出道期', icon: '🚀', desc: '第一次站上舞台，聚光灯与狗仔同时到来' },
  { index: 3, name: '巅峰期', icon: '👑', desc: '顶流焦点，恋爱即成头条，每一步都踩在刀尖' },
  { index: 4, name: '传奇期', icon: '🏆', desc: '封神之后，连恋情都成了大众祝福的童话' }
];

// ---------- 系统C 颁奖 ----------
export var AWARDS_POOL = [
  '年度最佳新人', '年度歌手', '年度专辑', '最受欢迎女艺人', '年度突破', '年度舞台'
];

// ---------- 系统14 合作企划（6 型） ----------
export var COLLAB_TYPES = {
  song: { label: '合唱', icon: '🤝', risk: 2, sweetness: 3, subjectOptions: ['男主', '情敌', '哥哥团'] },
  drama: { label: '对手戏', icon: '🎭', risk: 3, sweetness: 2, subjectOptions: ['男主', '情敌'] },
  variety: { label: '综艺同框', icon: '🎪', risk: 3, sweetness: 2, subjectOptions: ['男主', '哥哥团'] },
  mv: { label: 'MV 出演', icon: '🎬', risk: 2, sweetness: 3, subjectOptions: ['男主', '情敌'] },
  cf: { label: '广告代言', icon: '👜', risk: 1, sweetness: 1, subjectOptions: ['男主', '哥哥团'] },
  stage: { label: '合作舞台', icon: '🌟', risk: 4, sweetness: 4, subjectOptions: ['男主', '情敌', '哥哥团'] }
};

// ---------- 系统8 营业（6 型） ----------
export var FAN_SERVICE_TYPES = {
  photobook: { label: '写真集', icon: '📸', fan: 4, media: 2, anti: 1, risk: 1 },
  livestream: { label: '直播', icon: '📺', fan: 3, media: 1, anti: 1, risk: 2 },
  magazine: { label: '杂志大片', icon: '📖', fan: 2, media: 3, anti: 0, risk: 1 },
  variety: { label: '综艺营业', icon: '🎪', fan: 3, media: 2, anti: 1, risk: 2 },
  cp: { label: '营业 CP', icon: '💏', fan: 5, media: 4, anti: 2, risk: 3, smoke: true, subjectOptions: ['男主', '情敌', '其他男艺人'], realCpPotential: true },
  event: { label: '粉丝见面会', icon: '🎉', fan: 6, media: 1, anti: 1, risk: 1 }
};

// ---------- 系统6 每日舆论（被动生成素材） ----------
export var DAILY_BUZZ_TEMPLATES = {
  hotSearch: [
    '#{name} 新舞台封神#',
    '#{name} 疑似恋情#',
    '#{name} 红毯造型#',
    '#{name} 新剧路透#',
    '#{name} 黑料#'
  ],
  fanDiscussion: [
    '哥哥今天状态绝了，姐姐配得上',
    '姐姐和某男星的同款被扒了……',
    '姐姐独美！不嗑任何 CP',
    '这波营业我嗑到了但心疼'
  ],
  mediaTitle: [
    '{name} 近期商业价值攀升',
    '业内：{name} 团队对绯闻管控严格',
    '{name} 新作品口碑两极',
    '{name} 被传私下关系复杂'
  ]
};

// ---------- 通用随机事件池（triggerEntSimEvent） ----------
export var ENTRAINMENT_EVENT_POOL = [
  { id: 'ev_airport', text: '机场被粉丝围堵，你和男主前后脚出现被拼图', exposure: 3, opinion: { fan: 1, media: 1, anti: 1 } },
  { id: 'ev_interview', text: '采访被问理想型，你答得太像男主惹怀疑', exposure: 2, opinion: { media: 1, anti: 1 } },
  { id: 'ev_birthday', text: '男主生日，你卡点祝福被粉丝解读', exposure: 2, opinion: { fan: 2 } },
  { id: 'ev_scandal', text: '突然爆出你和某人的旧照，舆论发酵', exposure: 4, opinion: { media: -2, anti: 3 } },
  { id: 'ev_award_nom', text: '你入围年度奖项，风评好转', exposure: 1, opinion: { fan: 2, media: 2, professional: 1 } },
  { id: 'ev_rest', text: '难得的休息日，你在酒店刷到男主动态', exposure: 0, opinion: {} }
];

// ---------- 图标映射（UI 用） ----------
export function cycleIcon(phaseIndex) {
  return (CYCLE_PHASES[phaseIndex] && CYCLE_PHASES[phaseIndex].icon) || '🌫️';
}
export function opinionIcon(dim) {
  var m = { fan: '💖', media: '📰', professional: '🎓', anti: '⚫' };
  return m[dim] || '•';
}
export function npcIcon(type) {
  return (NPC_TYPES[type] && NPC_TYPES[type].icon) || '•';
}
export function romanceIcon(depth) {
  return (ROMANCE_DEPTH_LABELS[depth] && ROMANCE_DEPTH_LABELS[depth].icon) || '🌱';
}
export var RIVAL_NAMES = [
  '林夏允', '徐恩菲', '高允真', '崔艺珍', '韩书妍',
  '郑素拉', '吴荷娜', '宋敏书', '尹瑞雅', '申知妍'
];

export function chapterIcon(index) {
  return (CHAPTERS[index - 1] && CHAPTERS[index - 1].icon) || '🌱';
}

// 恋爱风险等级文案
export function riskLevelText(score) {
  if (score >= 80) return '🔴 塌房级';
  if (score >= 60) return '🟠 高危';
  if (score >= 40) return '🟡 警惕';
  if (score >= 20) return '🟢 可控';
  return '⚪ 安全';
}
