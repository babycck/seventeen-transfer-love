// ============================================================
// 娱乐圈模拟器（entSim）· 静态数据层
// 周期 / 作品槽 / 四维舆论 / 关系网 / 地下恋 / 章节 / 营业 / 颁奖 / 合作企划 / 每日舆论
// 全部为纯数据，不依赖运行时状态。图标映射统一用 emoji（移动端可读）。
//
// 注：池子（事件池 / 模板池 / 数据池）已全部迁移至 pools/ 目录统一管理。
// pools/index.js 为统一导出入口，外部只需 import from './pools/index.js'。
// ============================================================

// ---------- 职业（系统4 关系网·职业差异 + 起点差异） ----------
// career key 同时决定起点章节 / 起点人气 / 与 SEVENTEEN 的距离。
export var ENT_SIM_CAREERS = {
  '女团爱豆': {
    label: '女团爱豆', icon: '🎀',
    startChapter: 1, startPopularity: 22,
    diff: '小糊团台前曝光高，恋情一旦被粉丝/狗仔发现立即引爆脱粉与黑热搜，人气与事业双崩；团内有哥哥罩着也是双刃剑。',
    proximity: '团内',
    sisterSetting: true
  },
  '练习生': {
    label: '练习生', icon: '🌱',
    startChapter: 1, startPopularity: 12,
    diff: '准台前，资源最少压力最大，出道即分水岭，暗恋前辈不敢声张。',
    proximity: '团内',
    sisterSetting: true
  }
};

// setup 职业下拉用（派生自 ENT_SIM_CAREERS，保留 name 字段以兼容 buildSisterProfHtml）
export var ENT_SIM_CAREER_LIST = Object.keys(ENT_SIM_CAREERS).map(function(k) {
  return { name: k, startChapter: ENT_SIM_CAREERS[k].startChapter, icon: ENT_SIM_CAREERS[k].icon };
});

// ---------- 系统1 周期 ----------
// 阶段（大节奏）：新人期/上升期/巅峰期/传奇期。阶段由人气阈值 + 章节推进。
export var CYCLE_STAGE_META = [
  { key: '新人期', icon: '🌱', popThreshold: 0 },
  { key: '上升期', icon: '📈', popThreshold: 35 },
  { key: '巅峰期', icon: '👑', popThreshold: 65 },
  { key: '传奇期', icon: '🏆', popThreshold: 88 }
];

// ---------- 系统4 关系网（4 类 NPC） ----------
export var NPC_TYPES = {
  broker: { label: '经纪人', icon: '📋', stanceOptions: ['利益绑定', '暗中提点', '摆烂'] },
  fanleader: { label: '站姐', icon: '📷', stanceOptions: ['护你', '吃瓜', '回踩'] },
  rival: { label: '情敌', icon: '💢', stanceOptions: ['暗恋男主', '试探你', '退出祝福'] },
  suitor: { label: '男主的情敌', icon: '💘', stanceOptions: ['暗恋你', '明争暗斗', '退出祝福'] }
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

// 情敌主动事件（rival intimacy 驱动）
// 情敌6阶段攻势表（对齐1v1）
export var ENT_SIM_RIVAL_STAGES = [
  { stage: 1, minAff: 0,  maxAff: 19, label: '初识' },
  { stage: 2, minAff: 20, maxAff: 39, label: '试探' },
  { stage: 3, minAff: 40, maxAff: 59, label: '主动' },
  { stage: 4, minAff: 60, maxAff: 79, label: '竞争' },
  { stage: 5, minAff: 80, maxAff: 99, label: '最后一搏' },
  { stage: 6, minAff: 100, maxAff: 999, label: '退出祝福' }
];
export var ENT_SIM_RIVAL_ACTIONS = {
  1: [{ id:'r1_meet', desc:'偶遇，他主动打招呼' },{ id:'r1_like', desc:'给动态点赞或评论' },{ id:'r1_chat', desc:'工作间隙闲聊几句' }],
  2: [{ id:'r2_gift', desc:'借口工作送了小礼物' },{ id:'r2_meal', desc:'主动约午餐或咖啡' },{ id:'r2_alone', desc:'找机会独处说话' }],
  3: [{ id:'r3_text', desc:'开始频繁发消息' },{ id:'r3_hint', desc:'聊天中话里藏话暗示' },{ id:'r3_care', desc:'留意你的情绪并安慰' }],
  4: [{ id:'r4_big', desc:'放大招送贵重礼物' },{ id:'r4_mis', desc:'在男主前故意制造误会' },{ id:'r4_comp', desc:'在男主面前主动比较自己' }],
  5: [{ id:'r5_presence', desc:'频繁在你周围刷存在感' },{ id:'r5_recall', desc:'把过去的小事翻出来讲' },{ id:'r5_quit', desc:'试探性问你是不是对他没意思' }]
};

// ---------- 系统7 章节 ----------
export var CHAPTERS = [
  { index: 1, name: '新人出道', icon: '🌱', desc: '刚刚出道的小糊团新人，资源少但冲劲足，恋爱是奢侈品' },
  { index: 2, name: '崭露头角', icon: '🌿', desc: '开始有小型粉丝群，被圈内注意到，打歌能进候补' },
  { index: 3, name: '稳步上升', icon: '🌸', desc: '粉丝稳定增长，综艺商演邀约不断，品牌开始关注' },
  { index: 4, name: '人气偶像', icon: '🔥', desc: '国民级热度，代言接到手软，回归必拿一位' },
  { index: 5, name: '顶流巨星', icon: '👑', desc: '每一步都是头条，恋爱即成核弹，巡演场场秒空' },
  { index: 6, name: '传奇殿堂', icon: '🏆', desc: '封神之后，连恋情都成了大众祝福的童话' }
];

// ── 以下池子已迁移至 pools/ 目录 ──
// GIRLGROUP_EVENTS → pools/girlgroup-events.js
// INDUSTRY_EVENTS → pools/industry-events.js
// RIVAL_ADVANCE_EVENTS → pools/rival-advance-events.js
// SECRET_DISCOVERY_EVENTS → pools/secret-discovery-events.js
// BROTHER_ADVANCE_TESTS → pools/brother-tests.js
// BROTHER_SIDE_PLOTS → pools/brother-side-plots.js
// DAILY_BUZZ_TEMPLATES → pools/daily-buzz-templates.js
// TEAMMATE_FLAVOR → pools/teammate-flavor.js
// SVT_TEAMMATE_PROFILES → pools/svt-teammate-profiles.js
// SVT_TEAMMATE_EVENT_POOL → pools/svt-teammate.js
// DAILY_ENGAGEMENT_POOL → pools/daily-engagement.js
// BRAND_OFFER_POOL → pools/brand-offers.js
// FAN_LETTER_POOL → pools/fan-letters.js

// 结局叙事基调（AI 生成结局正文时的氛围引导）
export var ENDING_TONE = {
  be_exposed: '撕心裂肺的破碎感——事业与爱情同时崩塌，画面要有雨、闪光灯、和再也握不住的手。',
  be_fall: '落寞而克制的退场——聚光灯渐暗，她把奖杯收进抽屉，转身走向普通人的生活。',
  ne_peace: '温和释然的释怀——两个人默契地松开手，没有撕扯，只有各自安好的祝福。',
  ne_ambiguous: '暧昧未明的留白——谁也没先开口，故事停在最好也最遗憾的节点，像没写完的歌。',
  ne_solo: '清亮笃定的独行——事业还在爬坡，爱情尚未开始，她把热爱给了舞台，未来可期。',
  he_underground: '隐秘而甜涩的相拥——地下恋藏得滴水不漏，他们在无人处相拥，甜里带刺。',
  he_public: '璀璨高甜的童话——大方牵手走上红毯，全网祝福，是娱乐圈最甜的公开。',
  he_solo: '独美封神的骄傲——她把所有热爱给了舞台，单身亦封神，光芒万丈。',
  hidden_rival: '温柔错位的遗憾——她最终走向了一直站在身边的人，男主成了回忆里最亮的光。'
};

// 好感阶段升级仪式感文案（idx 4 心动由心动时刻单独处理，这里覆盖其余阶段）
export var STAGE_CEREMONY = {
  0: '你和他还只是点头之交，故事刚刚开场。',
  1: '你们开始真正认识彼此，名字不再只是名字。',
  2: '好感在细节里悄悄发芽，一个眼神你就懂了。',
  3: '暧昧的空气漫上来，谁都不舍得先戳破。',
  4: '心口某个地方，为他轻轻塌陷了一下。',
  5: '他不再只是队友，而是你忍不住想见的人。',
  6: '你们之间有了只属于两人的默契，像悄悄戴上戒指。',
  7: '你清楚自己陷入恋爱了，毫无保留。'
};

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
