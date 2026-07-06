import { GS } from './state.js';
import { MEMBERS, PLAYER_BIRTH_YEAR } from './data.js';

// ==================== AI 一致性校验器（JSON 输出版） ====================
//
// 改造说明：
// 1. 旧版针对 markdown 输出做"标记混入正文/选项缺失/好感度标记缺失"等检查，已全删——
//    这些由 schema.js + parser.js 的字段完整性校验兜底。
// 2. 仍保留的是基于内容的检查：人设偏离、X 身份提前泄露、称呼违规、时间线、抽烟、情感浓度。
//    这些检查在 blocks[*].content 字符串中做正则。

export function validateNarrative(rawText, parsed) {
  var corrections = [];
  var blocks = (parsed && parsed.blocks) || [];
  var content = '';
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i] && blocks[i].content) content += blocks[i].content + '\n';
  }
  var observers = (parsed && parsed.observers) || [];
  for (var j = 0; j < observers.length; j++) {
    if (observers[j]) content += observers[j].name + '：' + observers[j].line + '\n';
  }
  var options = (parsed && parsed.options) || [];
  for (var k = 0; k < options.length; k++) {
    if (options[k] && options[k].text) content += options[k].text + '\n';
  }

  // 空剧情检测（repairJson fallback 或 AI 返回空内容场景）
  // 合并检测：blocks 为空时一次性返回明确 error，避免重复触发多条
  if (!blocks || blocks.length === 0) {
    corrections.push({ severity: 'error', type: 'format', message: '剧情内容为空——AI 可能返回了无效 JSON 或内容缺失，请输出至少一段 narrative 类型正文（≥100字）' });
    return corrections; // blocks 为空时后续检测无意义，直接返回
  }

  // 内容规则校验（severity: warning）
  corrections = corrections.concat(addSeverity(checkPersonalityDeviation(content), 'warning'));
  corrections = corrections.concat(addSeverity(checkXIdentityLeak(content), 'warning'));
  corrections = corrections.concat(addSeverity(checkAddressViolation(blocks, observers), 'warning'));
  corrections = corrections.concat(addSeverity(checkTimelineError(content), 'warning'));
  corrections = corrections.concat(addSeverity(checkFormatViolation(parsed), 'warning'));
  corrections = corrections.concat(addSeverity(checkEmotionalIntensity(content), 'warning'));
  corrections = corrections.concat(addSeverity(checkSmokingViolation(content), 'warning'));

  // 结构化校验（severity: error）
  // 注：blocks 为空的检测已在前置空剧情检测中处理，此处不再重复
  if (!blocks.some(function(b) { return b.type === 'narrative'; })) {
    corrections.push({ severity: 'error', type: 'format', message: '缺少 narrative 类型的正文段落' });
  }
  var narrativeContent = blocks.filter(function(b) { return b.type === 'narrative' || b.type === 'interview'; });
  var totalText = narrativeContent.map(function(b) { return b.content || ''; }).join('');
  if (totalText.length < 100) {
    corrections.push({ severity: 'error', type: 'length', message: '正文过短（' + totalText.length + '字），请输出至少 100 字' });
  }
  if (totalText.length > 3000) {
    corrections.push({ severity: 'warning', type: 'length', message: '正文过长（' + totalText.length + '字），建议控制在 1500 字以内' });
  }
  if (options.length > 4) {
    corrections.push({ severity: 'warning', type: 'format', message: '选项超过 4 个' });
  }

  // [计划B问题4] 剧情重复检测：新剧情与最近3天 dailySummaries 做 Jaccard 相似度，>40% 返回 correction
  if (totalText.length > 100 && GS.dailySummaries && GS.dailySummaries.length > 0) {
    var _recent3d = GS.dailySummaries.slice(-3);
    for (var _di = 0; _di < _recent3d.length; _di++) {
      var _dSum = _recent3d[_di];
      var _dParsed = null;
      try { _dParsed = JSON.parse(_dSum); } catch (e) {}
      var _dText = _dParsed ? (_dParsed.events || []).join('') + (_dParsed.dialogues || []).join('') : _dSum;
      var _dJaccard = _transferJaccard(totalText, _dText);
      if (_dJaccard > 0.4) {
        corrections.push({ severity: 'warning', type: 'repetition', message: '剧情重复检测：本段剧情与近期记忆的关键词重叠度达' + Math.round(_dJaccard * 100) + '%，请换一个切入角度或新的事件展开' });
        break;
      }
    }
  }

  return corrections;
}

function addSeverity(arr, severity) {
  if (!arr || arr.length === 0) return arr;
  return arr.map(function(c) {
    if (!c.severity) c.severity = severity;
    return c;
  });
}

export function formatCorrections(corrections) {
  if (!corrections || corrections.length === 0) return '';
  var severityLabel = '';
  var hasError = corrections.some(function(c) { return c.severity === 'error'; });
  if (hasError) {
    severityLabel = '（必须修正）';
  }
  var lines = ['\n[INSTRUCTION] ⚠️ 上一段剧情修正指令' + severityLabel + '：'];
  for (var i = 0; i < corrections.length; i++) {
    var c = corrections[i];
    var prefix = c.severity === 'error' ? '❌ ' : '⚠️ ';
    lines.push(prefix + '[' + c.type + '] ' + c.message);
  }
  lines.push('\n请在本段剧情中避免上述问题。');
  return lines.join('\n');
}

// ==================== 1. 性格行为偏离检测 ====================

function checkPersonalityDeviation(text) {
  var corrections = [];
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });

  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var rules = PERSONALITY_RULES[m.id];
    if (!rules) continue;
    for (var r = 0; r < rules.length; r++) {
      var rule = rules[r];
      if (rule.pattern.test(text)) {
        corrections.push({
          type: 'personality',
          memberId: m.id,
          memberName: m.name,
          message: m.name + rule.message
        });
      }
    }
  }

  return corrections;
}

// 成员性格规则库：正则 + 修正说明
var PERSONALITY_RULES = {
  scoups: [
    { pattern: /崔胜澈.*(冷漠|不理人|不管|不照顾)/, message: '「责任感强、保护欲旺盛」，不应冷漠或不照顾人' }
  ],
  wonwoo: [
    { pattern: /全圆佑.*(滔滔不绝|话很多|主动.*靠近|热情.*表白|大笑.*灿烂)/, message: '「外冷内热、理性克制」，不应话多、过度主动或过度开朗' }
  ],
  mingyu: [
    { pattern: /金珉奎.*(暧昧|试探|不直接|暗示|犹豫)/, message: '「直球进攻型」，不应玩暧昧或试探，应直接表达' }
  ],
  vernon: [
    { pattern: /崔瀚率.*(刻意.*追求|紧张.*不安|努力.*表现)/, message: '「自然流露型」，不应刻意追求或紧张表现' }
  ],
  jeonghan: [
    { pattern: /尹净汉.*(冷淡|不理人|不温柔|不体贴)/, message: '「温柔掌控型」，不应冷淡或不体贴' }
  ],
  joshua: [
    { pattern: /洪知秀.*(粗鲁|不绅士|不优雅|急躁)/, message: '「绅士优雅型」，行为必须保持绅士风度' }
  ],
  woozi: [
    { pattern: /李知勋.*(主动.*社交|滔滔不绝|外向)/, message: '「专注执着、不善表达」，不应主动社交或话多' }
  ],
  dk: [
    { pattern: /李硕珉.*(冷漠|不关心|不笑)/, message: '「阳光开朗、共情力强」，不应冷漠或不关心他人' }
  ],
  seungkwan: [
    { pattern: /夫胜宽.*(安静.*沉默|不吐槽|不活跃)/, message: '「综艺天才、幽默风趣」，不应全程安静沉默' }
  ],
  jun: [
    { pattern: /文俊辉.*(主动.*社交|热情.*聊天|滔滔不绝|主动.*表白)/, message: '「安静内敛、猫系性格」，不应主动社交或话多' }
  ],
  hoshi: [
    { pattern: /权顺荣.*(冷淡|不积极|退缩|犹豫)/, message: '「能量充沛、热情执着」，不应冷淡或退缩' }
  ],
  the8: [
    { pattern: /徐明浩.*(热情.*外放|主动.*靠近|话很多)/, message: '「艺术气质、外表清冷」，不应热情外放或话多' }
  ],
  dino: [
    { pattern: /李灿.*(成熟.*稳重|深沉|老练)/, message: '「努力上进、自信阳光、偶尔撒娇」，不应表现得过于成熟深沉' }
  ]
};

// ==================== 2. X 身份暴露检测 ====================

function checkXIdentityLeak(text) {
  var corrections = [];
  if (GS.day <= 3 && GS.secretX) {
    var leakPatterns = [
      /我知道你是X/, /你就是X/, /原来你是X/, /X就是你/,
      /我知道.*是.*前任/, /我知道你们.*分手/, /你们.*恋爱过/
    ];
    for (var i = 0; i < leakPatterns.length; i++) {
      if (leakPatterns[i].test(text)) {
        corrections.push({
          type: 'x_identity',
          message: 'Day ' + GS.day + ' 任何成员不得在正文中确认或明示 X 身份。X 身份必须保密至 Day 8 后。'
        });
        break;
      }
    }
  }
  return corrections;
}

// ==================== 3. 称呼违规检测 ====================

function checkAddressViolation(blocks, observers) {
  var corrections = [];
  var violations = [];
  // 收集所有文本
  var allText = '';
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i] && blocks[i].content) allText += blocks[i].content + '\n';
  }
  if (observers) {
    for (var j = 0; j < observers.length; j++) {
      if (observers[j]) allText += observers[j].name + '：' + observers[j].line + '\n';
    }
  }
  // 1. 全局绝对禁止：-xi, 前辈, 后辈
  if (/[가-힣a-zA-Z]+시\b/.test(allText) || /-xi\b/.test(allText) || /xi\b/.test(allText)) {
    violations.push('检测到韩式敬语后缀"-xi"或"-시"');
  }
  if (/前辈/.test(allText) || /后辈/.test(allText)) {
    violations.push('检测到"前辈"或"后辈"称呼');
  }
  // 2. 按 block 精确检测（已知 speaker 的 interview 类型）
  var memberNameMap = {};
  for (var i = 0; i < MEMBERS.length; i++) {
    memberNameMap[MEMBERS[i].name] = MEMBERS[i];
    memberNameMap[MEMBERS[i].stageName] = MEMBERS[i];
  }
  var guestMember = null;
  if (GS.observerGuest) {
    for (var i = 0; i < MEMBERS.length; i++) {
      if (GS.observerGuest.indexOf(MEMBERS[i].name) >= 0 || GS.observerGuest.indexOf(MEMBERS[i].stageName) >= 0) {
        guestMember = MEMBERS[i];
        break;
      }
    }
  }
  // 检查 blocks
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (!block || !block.content) continue;
    var speaker = null;
    if (block.type === 'memberInterview' || block.type === 'xInterview') {
      speaker = memberNameMap[block.member];
    } else if (block.type === 'interview') {
      speaker = { name: '女主', age: PLAYER_BIRTH_YEAR, isPlayer: true };
    } else if (block.type === 'observerOS') {
      continue; // 走 observers 数组
    }
    if (!speaker) continue;
    var content = block.content;
    for (var m = 0; m < MEMBERS.length; m++) {
      var target = MEMBERS[m];
      var firstName = target.name.charAt(0);
      var patterns = [firstName + '哥', target.name + '哥'];
      for (var p = 0; p < patterns.length; p++) {
        if (content.indexOf(patterns[p]) >= 0) {
          if (speaker.isPlayer) {
            violations.push('女主对' + target.name + '称"' + patterns[p] + '"——女主禁止称"哥"，应称"欧巴"（好感度>60）或直呼名字');
          } else if (speaker.age >= target.age) {
            violations.push(speaker.name + '（' + speaker.age + '）对' + target.name + '（' + target.age + '）称"' + patterns[p] + '"——年长者/同龄对年幼者禁止称"哥"');
          }
        }
      }
    }
  }
  // 检查 observers 数组
  if (observers) {
    for (var j = 0; j < observers.length; j++) {
      var obs = observers[j];
      if (!obs || !obs.line) continue;
      var isGuest = false;
      var guestSpeaker = null;
      if (guestMember && obs.name && (obs.name.indexOf(guestMember.name) >= 0 || obs.name.indexOf(guestMember.stageName) >= 0)) {
        isGuest = true;
        guestSpeaker = guestMember;
      }
      for (var m = 0; m < MEMBERS.length; m++) {
        var target = MEMBERS[m];
        var firstName = target.name.charAt(0);
        var patterns = [firstName + '哥', target.name + '哥'];
        for (var p = 0; p < patterns.length; p++) {
          if (obs.line.indexOf(patterns[p]) >= 0) {
            if (isGuest && guestSpeaker) {
              if (guestSpeaker.age >= target.age) {
                violations.push('特约嘉宾' + guestSpeaker.name + '（' + guestSpeaker.age + '）对' + target.name + '（' + target.age + '）称"' + patterns[p] + '"——年长者/同龄对年幼者禁止称"哥"');
              }
            } else {
              violations.push('观察员' + obs.name + '对' + target.name + '称"' + patterns[p] + '"——观察员禁止称"哥"');
            }
          }
        }
      }
    }
  }
  // 3. narrative 类型：保守检测（warning）
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (!block || block.type !== 'narrative' || !block.content) continue;
    var content = block.content;
    for (var m = 0; m < MEMBERS.length; m++) {
      var target = MEMBERS[m];
      var firstName = target.name.charAt(0);
      if (content.indexOf(firstName + '哥') >= 0) {
        violations.push('正文中出现"' + firstName + '哥"，请确认说话者是否比' + target.name + '（' + target.age + '）年幼——年长者/同龄对年幼者禁止称"哥"');
      }
    }
  }
  if (violations.length > 0) {
    corrections.push({
      type: 'address',
      message: violations.join('；') + '。称呼规则：年幼者可对年长者称"哥"，年长者/同龄对年幼者/同龄禁止称"哥"；女主禁止称"哥"（应称"欧巴"或名字）；禁止"前辈""后辈""-xi"。'
    });
  }
  return corrections;
}

// ==================== 4. 时代/时间线错误检测 ====================

function checkTimelineError(text) {
  var corrections = [];

  for (var d = GS.day + 1; d <= 12; d++) {
    var pattern = new RegExp('Day\\\\s*' + d + '|第' + d + '天');
    if (pattern.test(text)) {
      corrections.push({
        type: 'timeline',
        message: '当前 Day ' + GS.day + '，正文中不应提及 Day ' + d + '（尚未发生）。'
      });
      break;
    }
  }

  if (GS.day < 4) {
    if (/约会配对|骰子|第一次约会/.test(text)) {
      corrections.push({
        type: 'timeline',
        message: 'Day ' + GS.day + ' 尚未到约会配对日（Day 4/5/8），不应提及约会配对。'
      });
    }
  }
  if (GS.day < 9) {
    if (/X约会|分手信|X.*读信/.test(text)) {
      corrections.push({
        type: 'timeline',
        message: 'Day ' + GS.day + ' 尚未到 X 约会日（Day 9），不应提及 X 约会或分手信。'
      });
    }
  }

  return corrections;
}

// ==================== 5. 字段完整性校验（取代旧格式违规检测） ====================

function checkFormatViolation(parsed) {
  var corrections = [];

  // blocks 为空 → 完全无内容
  if (!parsed || !parsed.blocks || parsed.blocks.length === 0) {
    corrections.push({
      type: 'format',
      message: 'blocks 字段为空或缺失，输出必须有段落。'
    });
    return corrections;
  }

  // 观察员 OS 缺失
  var hasObserver = false;
  for (var i = 0; i < parsed.blocks.length; i++) {
    if (parsed.blocks[i].type === 'observerOS') { hasObserver = true; break; }
  }
  if (!hasObserver && parsed.observers && parsed.observers.length === 0) {
    corrections.push({
      type: 'format',
      message: '缺少观察员 OS（observers 字段或 observerOS block 至少要有一个）。'
    });
  }

  // 选项缺失（仅类型需要选项时才告警；调用方决定）
  // 此处保持宽松判断，由引擎层在 consequence/phase/stay/freeAction 路径里检查
  if (parsed.options && parsed.options.length === 0 && parsed.blocks.length > 0) {
    // 模糊告警，引擎层会自行兜底
  }

  return corrections;
}

// ==================== 6. 情感浓度超标检测 ====================

function checkEmotionalIntensity(text) {
  var corrections = [];

  if (GS.day <= 3) {
    var intensePatterns = [
      /我喜欢你/, /我爱你/, /心动.*强烈/, /深深.*喜欢/, /表白/,
      /无法.*忘记/, /眼里.*只有/, /命中.*注定/
    ];
    for (var i = 0; i < intensePatterns.length; i++) {
      if (intensePatterns[i].test(text)) {
        corrections.push({
          type: 'intensity',
          message: 'Day ' + GS.day + ' 情感基调应为"克制含蓄"，不应出现强烈表白、心动或深情描写。'
        });
        break;
      }
    }
  }

  if (GS.day <= 7 && GS.secretX) {
    var xMember = MEMBERS.find(function(m) { return m.id === GS.secretX; });
    var xPatterns = [
      new RegExp(xMember.name + '.*(复合|回到.*身边|再给.*机会|还爱着你|从未.*放下)')
    ];
    for (var j = 0; j < xPatterns.length; j++) {
      if (xPatterns[j].test(text)) {
        corrections.push({
          type: 'intensity',
          message: 'Day ' + GS.day + ' X 不应主动表达复合意愿或暗示。X 必须保持克制和隐藏。'
        });
        break;
      }
    }
  }

  return corrections;
}

// ==================== 7. 抽烟描写检测 ====================

function checkSmokingViolation(text) {
  var corrections = [];
  var smokingPatterns = [
    /抽烟/, /吸烟/, /电子烟/, /点烟/, /烟味/, /尼古丁/, /雪茄/,
    /烟灰缸/, /烟蒂/, /烟盒/, /打火机/, /火柴.*点/, /点着.*烟/
  ];
  for (var i = 0; i < smokingPatterns.length; i++) {
    if (smokingPatterns[i].test(text)) {
      corrections.push({
        type: 'smoking',
        message: '检测到抽烟相关描写。所有角色严格禁止抽烟（含电子烟），正文/采访间/观察员OS/回忆场景均不得出现。'
      });
      break;
    }
  }
  return corrections;
}

// [计划B问题4] Jaccard 相似度辅助函数（换乘恋爱剧情重复检测）
var _TRANSFER_STOP_WORDS = { '他说': 1, '她说': 1, '看着': 1, '然后': 1, '一个': 1, '什么': 1, '这个': 1, '那个': 1, '自己': 1, '已经': 1, '可以': 1, '没有': 1, '他们': 1, '但是': 1, '因为': 1, '所以': 1, '如果': 1, '现在': 1, '这里': 1, '那里': 1 };
function _transferJaccard(a, b) {
  var _wordsA = (a || '').match(/[\u4e00-\u9fa5]{2,}/g) || [];
  var _wordsB = (b || '').match(/[\u4e00-\u9fa5]{2,}/g) || [];
  _wordsA = _wordsA.filter(function(w) { return !_TRANSFER_STOP_WORDS[w]; });
  _wordsB = _wordsB.filter(function(w) { return !_TRANSFER_STOP_WORDS[w]; });
  if (_wordsA.length === 0 || _wordsB.length === 0) return 0;
  var _setA = {};
  for (var _i = 0; _i < _wordsA.length; _i++) _setA[_wordsA[_i]] = true;
  var _setB = {};
  for (var _j = 0; _j < _wordsB.length; _j++) _setB[_wordsB[_j]] = true;
  var _inter = 0;
  var _allKeys = {};
  for (var _k in _setA) { _allKeys[_k] = true; if (_setB[_k]) _inter++; }
  for (var _k2 in _setB) { _allKeys[_k2] = true; }
  var _union = 0;
  for (var _k3 in _allKeys) _union++;
  if (_union === 0) return 0;
  return _inter / _union;
}