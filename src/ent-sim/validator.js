// ============================================================
// 娱乐圈模拟器（entSim）· AI输出跑偏检测器
// 检测AI生成剧情中的禁忌词/越级选项/异常affectionDelta
// 返回 corrections 反馈让AI重写
// ============================================================
import { GS } from '../state.js';
import { affectionStageIndex } from './romance.js';

// —— 阶段禁忌关键词（按 affectionStageIndex 0-4 对应 初遇/相识/好感/暧昧/心动+） ——
// stage=0(好感0-19)力度最强，stage=4(交往+)最宽松
var STAGE_FORBIDDEN = {
  0: ['告白','表白','在一起','交往','恋爱','我喜欢你','我爱你','接吻','kiss','同居','同床','女朋友','男友','恋爱关系','为你写','秘密约定','深夜约会','送回家','家里见面','牵手','拥抱','抱你','抱抱'],
  1: ['告白','表白','在一起','交往','接吻','kiss','同居','同床','女朋友','男友','恋爱关系','送回家','家里见面'],
  2: ['同居','同床','公开恋情','结婚','求婚','订婚','怀孕','见父母'],
  3: ['同居','公开恋情','结婚','求婚'],
  4: ['公开恋情但需慎重']
};

// —— 越级选项关键词（好感<阈值时选项不应出现这些词） ——
var OPTION_THRESHOLDS = [
  { words: ['牵手','拉手','十指相扣'], minAff: 15, label: '牵手(好感≥15)' },
  { words: ['拥抱','抱你','抱抱'], minAff: 30, label: '拥抱(好感≥30)' },
  { words: ['接吻','亲吻','kiss','亲你','吻'], minAff: 60, label: '接吻(好感≥60)' },
  { words: ['告白','表白','我喜欢你','在一起'], minAff: 60, label: '告白(好感≥60)' },
  { words: ['过夜','同床','同居'], minAff: 80, label: '过夜(好感≥80)' },
  { words: ['公开','公佈','宣布恋情','发布关系'], minAff: 85, label: '公开恋情(好感≥85)' }
];

// —— affectionDelta异常阈值（按affectionStageIndex而非oneHeartRomanceStage） ——
var AFF_STAGE_MAX = { 0: 3, 1: 4, 2: 4, 3: 5, 4: 5 }; // 每阶段单次最大delta

/**
 * 主入口：校验parsed结果，返回corrections数组
 * 改用 affectionStageIndex(E.affection) 而非 GS.oneHeartRomanceStage（plan #7）
 * @param {object} parsed - parseEntSimResponse的结果
 * @param {object} E - GS.entSim
 * @returns {string[]} corrections - 反馈信息列表（空数组=通过）
 */
export function validateEntSimOutput(parsed, E) {
  if (!E || !parsed) return [];
  var corrections = [];

  // ═══ 阶段改用 affectionStageIndex（plan #7：统一字段来源，不再读 oneHeartRomanceStage）═══
  var aff = E.affection || 0;
  var stage = affectionStageIndex(aff); // 0=初遇 1=相识 2=好感 3=暧昧 4=心动+

  // 1. 禁忌词检测（具体化反馈：给出段落原文+改写示例）
  var narrative = parsed.narrative || '';
  var forbidden = STAGE_FORBIDDEN[stage] || [];
  for (var i = 0; i < forbidden.length; i++) {
    var idx = narrative.indexOf(forbidden[i]);
    if (idx >= 0) {
      // 提取包含禁止词的上下文段落（前后各40字）
      var snippetStart = Math.max(0, idx - 40);
      var snippetEnd = Math.min(narrative.length, idx + forbidden[i].length + 40);
      var snippet = narrative.slice(snippetStart, snippetEnd).replace(/\n/g, ' ');
      // 按阶段给出改写建议
      var suggestion = _stageRewriteHint(stage, forbidden[i]);
      corrections.push(
        '【禁忌词检测·具体化】剧情出现阶段禁止词「' + forbidden[i] + '」（当前好感' + aff + '→阶段' + stage + '不允许）。\n' +
        '原文段落：…' + snippet + '…\n' +
        '改写建议：' + suggestion
      );
      break; // 一条足够触发重试
    }
  }

  // 2. 越级选项检测（具体化反馈：给出原选项+建议改写方向）
  var options = parsed.options || [];
  for (var oi = 0; oi < options.length; oi++) {
    var opt = options[oi] || '';
    for (var ti = 0; ti < OPTION_THRESHOLDS.length; ti++) {
      var t = OPTION_THRESHOLDS[ti];
      if (aff >= t.minAff) continue; // 好感够了就跳过
      for (var wi = 0; wi < t.words.length; wi++) {
        if (opt.indexOf(t.words[wi]) >= 0) {
          corrections.push(
            '【越级选项检测·具体化】选项「' + opt.substring(0, 50) + '」包含越级行为「' + t.words[wi] + '」' +
            '（需好感≥' + t.minAff + '，当前好感' + aff + '）。\n' +
            '改写方向：将「' + t.words[wi] + '」替换为当前阶段允许的行为，如「并肩走」「聊天」「发消息关心」等。'
          );
          wi = t.words.length; // 跳出内层
          ti = OPTION_THRESHOLDS.length; // 跳出外层
        }
      }
    }
  }

  // 3. affectionDelta异常检测
  var extras = parsed.extras || {};
  var delta = typeof extras.affectionDelta === 'number' ? extras.affectionDelta : 0;
  var maxDelta = AFF_STAGE_MAX[Math.min(4, stage)] || 3;
  if (delta > maxDelta && stage < 3) {
    corrections.push('【affectionDelta异常】当前好感' + aff + '（阶段' + stage + '）单次最大好感增幅为' + maxDelta + '，但AI返回了' + delta + '。请将affectionDelta降至' + maxDelta + '以内。');
  }
  // 负值下限：低于-3仅在极严重负面事件才允许
  if (delta < -3 && stage < 2) {
    corrections.push('【affectionDelta异常】当前阶段单次最大好感降幅为-3，但AI返回了' + delta + '。除非本段是重大负面事件（背叛/严重冲突），请将affectionDelta调整至-3以内。');
  }

  // 4. 男主未出场但给了affectionDelta（软提示，不触发重试）
  var mlName = (E.romance && E.romance.maleLead && E.romance.maleLead.name) || '男主';
  var hasMaleLead = narrative.indexOf(mlName) >= 0 || narrative.indexOf('他') >= 0;
  if (delta !== 0 && !hasMaleLead && narrative.length < 200) {
    // 预留：若narrative极短且delta非零且没提到男主，可能是解析问题
    // 不在这里强行纠正，只做提示级别（不触发重试）
  }

  return corrections;
}

// 按阶段给出禁止词的改写建议（validator 具体化反馈，plan #19）
function _stageRewriteHint(stage, word) {
  var hints = {
    '告白': '可用「想多了解你」「对你印象特别好」替代',
    '表白': '可用「表达了好感」「说了让人心跳加快的话」替代',
    '接吻': '可用「靠得很近」「呼吸交错的瞬间」替代',
    'kiss': '可用「目光落在对方嘴唇上又移开」替代',
    '同居': '可用「最近常来练习室找你」「给你带了宵夜」替代',
    '同床': '可用「聊天聊到很晚才分开」替代',
    '牵手': '可用「不经意碰到手指」「并肩走时肩膀轻碰」替代',
    '拥抱': '可用「帮你披上外套」「拍肩膀鼓励」替代',
    '抱你': '可用「接住你手里的东西」「扶了你一把」替代',
    '女朋友': '可用「特别的朋友」「放在心上的人」替代',
    '男友': '可用「那位前辈」「他」替代',
    '恋爱关系': '可用「走得比较近」替代',
    '专属': '可用「特别在意」替代',
    '送回家': '可用「说路上小心」「让哥哥顺路送你」替代',
    '家里见面': '可用「在公司碰面」「约在咖啡厅」替代',
    '公开恋情': '可用「不再刻意避嫌」替代（仅stage≥4可用原词）'
  };
  if (hints[word]) return hints[word];
  if (stage <= 1) return '请替换为符合前后辈关系的温和表达（如关心/帮助/聊天），避免越界词汇。';
  if (stage === 2) return '请替换为暧昧期允许的互动（如并肩走/分享零食/发消息），避免明确亲密词。';
  if (stage === 3) return '请替换为恋爱期的含蓄表达，不要直接写同居/公开等高级阶段词。';
  return '请确保该词与当前阶段匹配。';
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
