// ============================================================
// 系统1 周期系统（精简版）：时段氛围 + 每日行程抽取
// 不再使用「4 相位 × 阶段」经营节奏；换天由玩家点「进入下一天」显式触发。
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';

var TIME_SLOTS = ['上午', '下午', '夜晚'];
var SLOTS_PER_DAY = 3;

// 恋爱风险倍率（曝光评估用）：保留一个温和系数，避免风险单调爆表
export function getRomanceRiskMultiplier() {
  return 1.0;
}

// 获取当前时段标签（场景氛围）
export function getTimeOfDayLabel() {
  var c = GS.entSim.cycle;
  return TIME_SLOTS[(c.timeOfDay || 0) % SLOTS_PER_DAY];
}

// 每日行程抽取：按女主职业分池，主档 / 相关档 / 晚档 / 哥哥档
var COMMON_POOL = [
  { key: '练习', loc: '练习室' },
  { key: '杂志拍摄', loc: '摄影棚' },
  { key: '综艺录制', loc: '录影厅' },
  { key: '品牌站台', loc: '商场中庭' },
  { key: '电台通告', loc: '电台' },
  { key: '采访', loc: '媒体间' },
  { key: '商务会议', loc: '公司会议室' }
];
var GIRLGROUP_POOL = [
  { key: '回归期', loc: '待机室' },
  { key: '打歌期', loc: '音乐节目后台' },
  { key: '签售会', loc: '签售会场' },
  { key: 'Vlive 直播', loc: '宿舍' },
  { key: '合宿', loc: '宿舍' },
  { key: '画报拍摄', loc: '摄影棚' },
  { key: '团综录制', loc: '录影棚' },
  { key: '团务会议', loc: '公司会议室' },
  { key: '空白期兼职', loc: '咖啡厅/健身房' },
  { key: '练习室自拍', loc: '练习室' },
  { key: '粉丝签绘', loc: '签售会场' }
];
var IDOL_POOL = [
  { key: '打歌舞台', loc: '待机室' },
  { key: '签售会', loc: '签售会场' },
  { key: 'Vlive 直播', loc: '宿舍' },
  { key: '回归舞台', loc: '音乐节目' },
  { key: '粉丝见面会', loc: '会场' },
  { key: '巡演排练', loc: '排练场' }
];
var ACTOR_POOL = [
  { key: '剧组拍摄', loc: '片场' },
  { key: '试镜', loc: '选角工作室' },
  { key: '剧本围读', loc: '会议室' },
  { key: '红毯活动', loc: '酒店' },
  { key: '广告拍摄', loc: '片场' },
  { key: '电影首映', loc: '影院' }
];
var SINGER_POOL = [
  { key: '录音棚', loc: '录音室' },
  { key: '音乐节', loc: '户外舞台' },
  { key: '巡演', loc: '巡演大巴' },
  { key: '歌曲宣传', loc: '电视台' },
  { key: 'Live House', loc: 'Live House' }
];
var MODEL_POOL = [
  { key: '走秀排练', loc: 'T台' },
  { key: '画报拍摄', loc: '摄影棚' },
  { key: '时装周', loc: '秀场' },
  { key: '广告拍摄', loc: '片场' }
];
var CREATOR_POOL = [
  { key: '直播', loc: '直播间' },
  { key: '短视频拍摄', loc: '工作室' },
  { key: '商务洽谈', loc: '咖啡厅' },
  { key: '粉丝互动', loc: '线上' }
];
var BACKSTAGE_POOL = [
  { key: '跟妆', loc: '化妆间' },
  { key: '造型会议', loc: '工作室' },
  { key: '编舞会议', loc: '练习室' },
  { key: '作词会议', loc: '会议室' },
  { key: '经纪行程会议', loc: '公司' },
  { key: '现场调度', loc: '后台' }
];
var RELATED_POOL = ['经纪人会议', '造型师碰头', '粉丝后援会', '媒体午餐会', '同行酒会'];
// 团内成员（情敌/哥哥共用）：SEVENTEEN 爱豆常见行程 ~90 条
var BOYGROUP_POOL = [
  { key: '打歌舞台', loc: '放送局' }, { key: '新歌录音', loc: '录音棚' }, { key: '团练', loc: '练习室' },
  { key: '综艺录制', loc: '电视台' }, { key: '签售会', loc: '签售会场' }, { key: '画报拍摄', loc: '摄影棚' },
  { key: '电台节目', loc: '电台' }, { key: '品牌活动', loc: '酒店宴会厅' }, { key: '作曲室', loc: '工作室' },
  { key: '休息日', loc: '宿舍' }, { key: '巡演彩排', loc: '演唱会场地' }, { key: '粉丝见面会', loc: '会场' },
  { key: '颁奖礼', loc: '颁奖礼后台' }, { key: '团体行程', loc: '电视台' }, { key: '练习生指导', loc: '练习室' },
  { key: 'MV 拍摄', loc: '片场' }, { key: '舞蹈编排', loc: '练习室' }, { key: '回归预告拍摄', loc: '摄影棚' },
  { key: '音银上班', loc: '放送局' }, { key: '团体综艺', loc: '录影棚' }, { key: '年末舞台彩排', loc: '演出场地' },
  { key: '广告拍摄', loc: '片场' }, { key: '杂志采访', loc: '媒体间' }, { key: '日程会议', loc: '公司会议室' },
  { key: '专辑内页拍摄', loc: '摄影棚' }, { key: '演唱会排练', loc: '排练场' }, { key: '团体直播', loc: '宿舍' },
  { key: '待机室准备', loc: '待机室' }, { key: '音乐节目录制', loc: '待机室' }, { key: '行程车移动', loc: '保母车' },
  { key: '深夜排练', loc: '练习室' }, { key: '团队聚餐', loc: '烤肉店' }, { key: '生日直播', loc: '宿舍' },
  { key: '制作人会议', loc: '录音棚' }, { key: '代言产品拍摄', loc: '摄影棚' }, { key: '内容拍摄', loc: '片场' },
  { key: '签售排练', loc: '练习室' }, { key: '机场出发', loc: '机场' }, { key: '制作 beat', loc: '工作室' },
  { key: '写词', loc: '工作室' }, { key: '舞蹈练习', loc: '练习室' }, { key: '个人 Vlog', loc: '宿舍' },
  { key: '节目录制', loc: '录影棚' }, { key: '拼盘演唱会', loc: '体育场' }, { key: '慈善活动', loc: '会场' },
  { key: '演唱会', loc: '体育场' }, { key: '新专辑会议', loc: '公司会议室' }, { key: '台本对稿', loc: '待机室' },
  { key: '线上签售', loc: '宿舍' }, { key: '网络节目', loc: '摄影棚' }, { key: '宣传照拍摄', loc: '摄影棚' },
  { key: '语音直播', loc: '宿舍' }, { key: '音乐制作', loc: '工作室' }, { key: '编曲', loc: '工作室' },
  { key: '作词', loc: '工作室' }, { key: '作曲', loc: '工作室' }, { key: '专辑试听会', loc: '公司会议室' },
  { key: 'MV 预告', loc: '编辑室' }, { key: 'MV 反应', loc: '宿舍' }, { key: '采访', loc: '媒体间' },
  { key: 'Showcase', loc: '演出场地' }, { key: '应援活动', loc: '场馆外' }, { key: '自拍时间', loc: '待机室' },
  { key: '海外行程', loc: '机场' }, { key: '行程整理', loc: '宿舍' }, { key: '居家休息', loc: '家里' },
  { key: '健身', loc: '健身房' }, { key: '咖啡店', loc: '咖啡店' }, { key: '逛书店', loc: '书店' },
  { key: '散步', loc: '汉江边' }, { key: '陪宠物', loc: '家里' }, { key: '看电影', loc: '电影院' },
  { key: '吃播', loc: '餐厅' }, { key: '游戏直播', loc: '宿舍' }, { key: '体检', loc: '医院' },
  { key: '美容室', loc: '美容室' }, { key: '购物', loc: '商场' }, { key: '看展', loc: '美术馆' },
  { key: '看音乐剧', loc: '剧院' }, { key: '家庭聚会', loc: '家里' }, { key: '好友聚餐', loc: '餐厅' },
  { key: '看病', loc: '医院' }, { key: '看日落', loc: '展望台' }, { key: '理疗', loc: '理疗中心' },
  { key: '配音', loc: '录音棚' }, { key: '教程录制', loc: '练习室' }, { key: '合作舞台准备', loc: '练习室' },
  { key: '特别舞台排练', loc: '演出场地' }, { key: 'fan meeting', loc: '会场' }, { key: '音源试听', loc: '工作室' },
  { key: '成员聚会', loc: '餐厅' }, { key: '剧本围读', loc: '会议室' }, { key: '工作室加班', loc: '工作室' }
];

// 男主专用池：从 BOYGROUP_POOL 中去掉海外行程
var MALE_LEAD_POOL = [];
for (var _mi = 0; _mi < BOYGROUP_POOL.length; _mi++) {
  if (BOYGROUP_POOL[_mi].key !== '海外行程' && BOYGROUP_POOL[_mi].key !== '机场出发') {
    MALE_LEAD_POOL.push(BOYGROUP_POOL[_mi]);
  }
}

// [废弃] 旧 RIVAL_POOL 已移除，团内成员（SUITOR）复用 BOYGROUP_POOL
var RIVAL_POOL = BOYGROUP_POOL;

// 哥哥行程池：同 BOYGROUP_POOL（可含海外行程，他是 SEVENTEEN 成员有巡演）
var BROTHER_POOL = BOYGROUP_POOL;

function mainPoolByCareer(careerKey) {
  if (careerKey === '女团爱豆') return GIRLGROUP_POOL;
  if (careerKey === '爱豆' || careerKey === '练习生') return IDOL_POOL;
  if (careerKey === '歌手') return SINGER_POOL;
  if (careerKey === '演员') return ACTOR_POOL;
  if (careerKey === '主播') return CREATOR_POOL;
  if (careerKey === '模特') return MODEL_POOL;
  return BACKSTAGE_POOL; // 经纪人 / 化妆师 / 编舞 / 作词
}

export function rollDailyAgenda() {
  var E = GS.entSim;
  var careerKey = (E.career && E.career.careerKey) || '';
  var profession = E.career && E.career.profession;
  var pool = mainPoolByCareer(profession || careerKey);
  // 混合 70% 职业专属 + 30% 通用场景，保留跨职业偶遇可能性
  var main = pick(randPercent(70) ? pool : COMMON_POOL);
  var related = RELATED_POOL[randInt(0, RELATED_POOL.length - 1)];
  var rivalItem = RIVAL_POOL[randInt(0, RIVAL_POOL.length - 1)];
  var rival = rivalItem.key; var rivalLoc = rivalItem.loc || '';
  var maleItem = MALE_LEAD_POOL[randInt(0, MALE_LEAD_POOL.length - 1)];
  var maleLead = maleItem.key; var maleLeadLoc = maleItem.loc || '';
  var brother = (E.brother && E.brother.name) ? pick(BROTHER_POOL) : null;
  E.agenda = {
    main: main.key, mainLoc: main.loc,
    related: related, relatedLoc: '',
    rival: rival, rivalLoc: rivalLoc,
    maleLead: maleLead, maleLeadLoc: maleLeadLoc,
    brother: brother ? brother.key : '', brotherLoc: brother ? brother.loc : '',
    doneFlags: {}
  };
  saveGame();
  return E.agenda;
}

// 兼容旧引用（ui.js 可能用到）
export function getCyclePhaseLabel() { return '地下恋'; }
export function getCyclePhaseIcon() { return '💗'; }
export function getCycleStageLabel() { return '娱乐圈'; }
export function getCyclePhaseMeaning() { return '娱乐圈背景下的地下恋'; }

function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function randPercent(n) { return randInt(1, 100) <= n; }
