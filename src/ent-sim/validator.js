// ============================================================
// 娱乐圈模拟器（entSim）· AI输出跑偏检测器
// 检测AI生成剧情中的禁忌词/越级选项/异常affectionDelta
// 返回 corrections 反馈让AI重写
// ============================================================
import { GS } from '../state.js';

// —— 阶段禁忌关键词（stage=0观察期力度最强） ——
var STAGE_FORBIDDEN = {
  0: ['告白','表白','在一起','交往','恋爱','我喜欢你','我爱你','接吻','kiss','同居','同床','女朋友','男友','恋爱关系','专属','只有你','为你写','秘密约定','深夜约会','送回家','家里见面'],
  1: ['同居','同床','公开恋情','结婚','求婚','订婚','怀孕','见父母'],
  2: ['同居','公开恋情','结婚','求婚'],
  3: ['公开恋情但需慎重']
};

// —— 越级选项关键词（好感<阈值时选项不应出现这些词） ——
var OPTION_THRESHOLDS = [
  { words: ['牵手','拉手','十指相扣'], minAff: 15, label: '牵手(好感≥15)' },
  { words: ['拥抱','抱你','抱抱'], minAff: 30, label: '拥抱(好感≥30)' },
  { words: ['接吻','亲吻','kiss','亲你','吻'], minAff: 50, label: '接吻(好感≥50)' },
  { words: ['告白','表白','我喜欢你','在一起'], minAff: 60, label: '告白(好感≥60)' },
  { words: ['过夜','同床','同居'], minAff: 65, label: '过夜(好感≥65)' },
  { words: ['公开','公佈','宣布恋情','发布关系'], minAff: 85, label: '公开恋情(好感≥85)' }
];

// —— affectionDelta异常阈值 ——
var AFF_STAGE_MAX = { 0: 3, 1: 4, 2: 4, 3: 5, 4: 5 }; // 每阶段单次最大delta

/**
 * 主入口：校验parsed结果，返回corrections数组
 * @param {object} parsed - parseEntSimResponse的结果
 * @param {object} E - GS.entSim
 * @returns {string[]} corrections - 反馈信息列表（空数组=通过）
 */
export function validateEntSimOutput(parsed, E) {
  if (!E || !parsed) return [];
  var corrections = [];

  // 1. 禁忌词检测
  var stage = GS.oneHeartRomanceStage || 0;
  var narrative = parsed.narrative || '';
  var forbidden = STAGE_FORBIDDEN[stage] || [];
  for (var i = 0; i < forbidden.length; i++) {
    if (narrative.indexOf(forbidden[i]) >= 0) {
      corrections.push('【禁忌词检测】剧情中出现阶段禁止词「' + forbidden[i] + '」（当前阶段' + stage + '不允许）。请移除或替换该词，改用符合当前阶段的表达。');
      break; // 一条足够触发重试
    }
  }

  // 2. 越级选项检测
  var options = parsed.options || [];
  var aff = E.affection || 0;
  for (var oi = 0; oi < options.length; oi++) {
    var opt = options[oi] || '';
    for (var ti = 0; ti < OPTION_THRESHOLDS.length; ti++) {
      var t = OPTION_THRESHOLDS[ti];
      if (aff >= t.minAff) continue; // 好感够了就跳过
      for (var wi = 0; wi < t.words.length; wi++) {
        if (opt.indexOf(t.words[wi]) >= 0) {
          corrections.push('【越级选项检测】选项「' + opt.substring(0, 30) + '」包含越级行为「' + t.words[wi] + '」（需好感≥' + t.minAff + '，当前' + aff + '）。请替换为符合当前阶段的选项。');
          wi = t.words.length; // 跳出内层
          ti = OPTION_THRESHOLDS.length; // 跳出外层
        }
      }
    }
  }

  // 3. affectionDelta异常检测
  var extras = parsed.extras || {};
  var delta = typeof extras.affectionDelta === 'number' ? extras.affectionDelta : 0;
  var maxDelta = AFF_STAGE_MAX[stage] || 3;
  if (delta > maxDelta && stage < 3) {
    corrections.push('【affectionDelta异常】当前阶段' + stage + '单次最大好感增幅为' + maxDelta + '，但AI返回了' + delta + '。请将affectionDelta降至' + maxDelta + '以内。');
  }
  // 负值下限：低于-3仅在极严重负面事件才允许
  if (delta < -3 && stage < 2) {
    corrections.push('【affectionDelta异常】当前阶段单次最大好感降幅为-3，但AI返回了' + delta + '。除非本段是重大负面事件（背叛/严重冲突），请将affectionDelta调整至-3以内。');
  }

  // 4. 男主未出场但给了affectionDelta
  var mlName = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '男主';
  var hasMaleLead = narrative.indexOf(mlName) >= 0 || narrative.indexOf('他') >= 0;
  if (delta !== 0 && !hasMaleLead && narrative.length < 200) {
    // 预留：若narrative极短且delta非零且没提到男主，可能是解析问题
    // 不在这里强行纠正，只做提示级别（不触发重试）
  }

  return corrections;
}

/**
 * 生成correction反馈文本（注入到重试prompt中）
 */
export function buildCorrectionFeedback(corrections) {
  if (!corrections || !corrections.length) return '';
  var fb = '\n【⚠️ 上一轮生成的问题·请修正后重新生成】\n';
  for (var i = 0; i < corrections.length; i++) {
    fb += (i + 1) + '. ' + corrections[i] + '\n';
  }
  fb += '请根据以上反馈修改你的输出，确保符合当前游戏阶段。\n';
  return fb;
}
