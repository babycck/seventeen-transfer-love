import { GS } from './state.js';
import { MEMBERS, PLAYER_BIRTH_YEAR, getPlayerBirthYear, PRIVATE_TRAITS } from './data.js';
import { isSisterSetting } from './utils.js';

// ==================== AI 一致性校验器（JSON 输出版） ====================
//
// 改造说明：
// 1. 旧版针对 markdown 输出做"标记混入正文/选项缺失/好感度标记缺失"等检查，已全删——
//    这些由 schema.js + parser.js 的字段完整性校验兜底。
// 2. 仍保留的是基于内容的检查：人设偏离、X 身份提前泄露、称呼违规、时间线、抽烟、情感浓度。
//    这些检查在 blocks[*].content 字符串中做正则。

// 未选私密体质不得出现在剧情（选了什么就是什么）
function checkPrivateTraitViolation(content) {
  var corrections = [];
  var selected = (GS.heroineProfile && GS.heroineProfile.privateTraits) || [];
  for (var i = 0; i < PRIVATE_TRAITS.length; i++) {
    var t = PRIVATE_TRAITS[i];
    if (selected.indexOf(t) >= 0) continue;
    if (content.indexOf(t) >= 0) {
      corrections.push({ type: 'privateTrait', message: '剧情中出现了未选择的私密体质「' + t + '」，女主并未设定该体质，请删除或改写为与已选体质（' + (selected.length ? selected.join('、') : '无') + '）相关的描写。' });
    }
  }
  return corrections;
}

// ==================== 1v1 初识期男主过度热情·确定性代码门控 ====================
// 仅在 oneHeartRomanceStage < 1（初识期）生效；命中即返回 correction 强制重写。
// 不依赖 AI 遵守 prompt：即便 prompt 被遗忘也会被代码纠正。
// 返回 string[]（与 validateOneHeartNarrative 的 corrections 数组同构）。
// [E] 1v1 感情进度门控（确定性代码兜底，不依赖 AI 遵守 prompt）
// 三档硬门槛：好感<40 全禁 / 40<=好感<60 且未到明确期(stage<2) 仅禁强越界 / 好感>=60 且明确期(stage>=2) 放开。
// 命中即返回 correction 字符串数组，由 generateOneHeartRound 触发一次重写。
export function checkOneHeartPacing(content) {
  var corrections = [];
  if (GS.gameMode !== 'oneHeart' && GS.gameMode !== 'entSim') return corrections;
  var _aff = GS.affection[GS.oneHeartMember] || 0;
  var _stage = GS.oneHeartRomanceStage || 0;
  // 强烈越界行为（表白/强拉/强吻/同床/深夜上门等）——任何未到明确期都禁
  var hotKw = ['发视频', '视频通话', '视频给你', '深夜来你房间', '来你住处', '来你房间', '表白', '我喜欢你', '我爱你', '抱住你', '抱紧你', '亲吻', '脱掉', '同床', '强吻', '把你拉进'];
  // 软亲密（超出当前关系的肢体亲近动作）
  var softKw = ['埋进肩窝', '埋进颈窝', '埋进你怀里', '蹭颈窝', '鼻尖蹭', '鼻尖抵', '靠在你肩', '赖在你身上', '贴着你', '下巴抵', '下巴靠', '搂住腰', '搂腰', '腰被', '公主抱', '环住你', '贴上来'];
  function _hit(list) {
    for (var i = 0; i < list.length; i++) {
      if (content.indexOf(list[i]) >= 0) return list[i];
    }
    return '';
  }
  // 吃醋门控（好感 < 20 初识/朋友阶段）：感情未建立严禁吃醋/醋意
  if (_aff < 20) {
    var jealousKw = ['吃醋', '醋意', '占有欲', '妒火', '嫉妒', '吃味', '酸溜溜', '酸了', '心里发酸', '醋'];
    for (var _ji = 0; _ji < jealousKw.length; _ji++) {
      if (content.indexOf(jealousKw[_ji]) >= 0) {
        corrections.push('[初识期门控] 当前好感仅 ' + _aff + '（<20，初识/朋友阶段），感情尚未建立，严禁出现吃醋/醋意/占有欲——命中「' + jealousKw[_ji] + '」。请改写为误会、朋友式小紧张或单纯好奇，删除任何醋意表达。');
        break;
      }
    }
  }

  // 阶段 < 1（初识期）：全套门控
  if (_stage < 1) {
    var _h = _hit(hotKw);
    if (_h) corrections.push('[初识期门控] 当前仍是初识期（romanceStage<1），男主不应过度热情——命中「' + _h + '」。禁止主动发视频/深夜上门/表白/过度肢体接触/强拉进私密空间，请将互动改写为克制、保留距离感的试探与暧昧。');
    var _s = _hit(softKw);
    if (_s) corrections.push('[初识期门控] 初识期不得有超出关系的肢体亲近——命中「' + _s + '」。未明确亲密前禁止把头埋进肩窝/颈窝、鼻尖蹭颈窝、靠在你肩/赖在你身上、贴着你、搂腰、下巴抵肩等亲近动作，请改为眼神/言语层面的暧昧。');
    return corrections;
  }
  // 好感 / 阶段 双门槛
  if (_aff < 40) {
    // 好感不足：禁强烈越界 + 软亲密
    var _h2 = _hit(hotKw);
    if (_h2) corrections.push('[进度门控] 当前好感仅 ' + _aff + '（<40），关系未到可越界——命中「' + _h2 + '」。请改为更克制的互动。');
    var _s2 = _hit(softKw);
    if (_s2) corrections.push('[进度门控] 当前好感 ' + _aff + '（<40），尚不宜有亲密肢体接触——命中「' + _s2 + '」。请保持距离感。');
  } else if (_aff < 60 && _stage < 2) {
    // 中等：仅禁强烈越界（强吻/同床/强拉/深夜上门），允许轻依赖/轻暧昧
    var heavyKw = ['强吻', '同床', '脱掉', '把你拉进', '深夜来你房间', '来你房间', '来你住处'];
    var _hh = _hit(heavyKw);
    if (_hh) corrections.push('[进度门控] 好感 ' + _aff + ' 且未到明确期（stage<2），禁止强烈越界行为——命中「' + _hh + '」。可写轻依赖/轻暧昧，但暂不宜发生亲密肢体或私密空间推进。');
  }
  // _aff>=60 && _stage>=2：放开，不追加 correction
  return corrections;
}

// ==================== 1v1 妹妹线称呼/欧巴·代码硬兜底 ====================
// 欧巴解锁统一为 oneHeartRomanceStage >= 1 的代码闸门；stage<1 禁止欧巴/直呼男主名、禁止称哥/哥哥/형。
export function checkOneHeartAddressing(content) {
  var corrections = [];
  if ((GS.gameMode !== 'oneHeart' && GS.gameMode !== 'entSim') || !isSisterSetting()) return corrections;
  var member = (GS.oneHeartMember && MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; })) ? MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }) : null;
  var memberName = member ? member.name : '';
  var allowObba = (GS.oneHeartRomanceStage || 0) >= 1;
  if (!allowObba && content.indexOf('欧巴') >= 0) {
    corrections.push('[称呼门控] 感情未到暧昧期（romanceStage<1），不得称男主"欧巴"，应称"' + memberName + '前辈"。');
  }
  // 妹妹线：男主是前辈不是亲哥。仅当男主被叫成"X哥/X형"（如"全圆佑哥""圆佑哥""Wonwoo哥"）才拦截；
  // 女主对亲哥哥称"哥哥"是允许的（亲哥是另一个人），绝不改成男主名。
  if (member) {
    var _fn = member.name.charAt(0);
    var _patterns = [_fn + '哥', member.name + '哥'];
    if (member.stageName) {
      _patterns.push(member.stageName + '哥');
      _patterns.push(member.stageName + '형');
    }
    _patterns.push(member.name + '형');
    for (var _pi = 0; _pi < _patterns.length; _pi++) {
      if (content.indexOf(_patterns[_pi]) >= 0) {
        corrections.push('[称呼门控] 禁止称男主"' + _patterns[_pi] + '"，男主是前辈不是亲哥。请改为"' + memberName + '前辈"或直接描写动作。');
        break;
      }
    }
  }
  // 妹妹线初识期（stage<1）禁止直呼男主名（须带"前辈"）
  if (memberName && (GS.oneHeartRomanceStage || 0) < 1) {
    var _idx = content.indexOf(memberName);
    while (_idx >= 0) {
      var _before = content.substring(Math.max(0, _idx - 4), _idx);
      // 取名字后最多 12 字窗口，去掉标点/空格后再判断是否紧跟"前辈"/"欧巴"，
      // 兼容「全圆佑，前辈」「全圆佑的…前辈」「全圆佑，轻声说，前辈」等自然断句，避免误判为直呼名字
      var _rawAfter = content.substring(_idx + memberName.length, _idx + memberName.length + 12);
      var _after = _rawAfter.replace(/[\s，。、！？~·…—“”‘’"',.!?]/g, '');
      if (_before.indexOf('前辈') < 0 && _after.indexOf('前辈') < 0 && _after.indexOf('欧巴') < 0) {
        corrections.push('[称呼门控] 队友的妹妹设定下初识期须称男主"' + memberName + '前辈"，禁止直呼名字。请补上"前辈"。');
        break;
      }
      _idx = content.indexOf(memberName, _idx + 1);
    }
  }
  return corrections;
}

// ent-sim 专属校验：响应为 { narrative, options, entSimExtras } JSON，不含 blocks 字段，
// 不能用换乘模式的 blocks 校验（否则永远判"剧情内容为空"→ 每次重试 3 次）。
export function validateEntSimNarrative(parsed) {
  var corrections = [];
  var narrative = (parsed && parsed.narrative) || '';
  // 内容模式检测：防止主剧情生成被"粉丝圈反应"任务污染（AI 误输出大粉/路人/黑粉纯文本）
  var _fanMarkers = ['·大粉', '·路人', '·黑粉', '·回踩粉', '大粉：', '路人：', '黑粉：', '回踩粉：'];
  for (var _fi = 0; _fi < _fanMarkers.length; _fi++) {
    if (narrative.indexOf(_fanMarkers[_fi]) >= 0) {
      corrections.push({ severity: 'error', type: 'content', message: '检测到你输出了"粉丝圈反应"纯文本（含「' + _fanMarkers[_fi] + '」），但本任务要求输出剧情 JSON。请改回 JSON 格式：{"narrative":"剧情正文","options":["选项1","选项2","选项3"],"entSimExtras":{...}}，narrative 写剧情而非粉丝讨论。' });
      return corrections;
    }
  }
  // 字数硬校验（代码约束，不交给 AI 自由判断）：仅拦截近乎空内容，250-600 字剧情降为 warning 放行
  if (narrative.length < 200) {
    corrections.push({ severity: 'error', type: 'length', message: '正文过短（仅 ' + narrative.length + ' 字），几乎为空。请扩写至 400-900 字：补充场景细节、人物心理、对话与肢体动作。' });
  } else if (narrative.length < 600) {
    corrections.push({ severity: 'warning', type: 'length', message: '正文偏短（' + narrative.length + ' 字），建议扩写到 400-900 字以增强沉浸感。' });
  } else if (narrative.length > 2200) {
    corrections.push({ severity: 'warning', type: 'length', message: '正文过长（' + narrative.length + ' 字），建议收敛到 400-900 字。' });
  }
  var options = (parsed && parsed.options) || [];
  if (options.length === 0) {
    corrections.push({ severity: 'error', type: 'format', message: '缺少 options，请输出 2-4 个选项' });
  } else if (options.length > 4) {
    corrections.push({ severity: 'warning', type: 'format', message: '选项超过 4 个' });
  }
  // ── 层5：三联内容扫描（narrative + brother.note + romanceBeat.event）──
  if (typeof GS !== 'undefined') {
    var _E = GS.entSim;
    var _stage = (GS.oneHeartRomanceStage !== undefined ? GS.oneHeartRomanceStage : (_E && _E.romance ? (_E.romance.stage === '初遇' ? 0 : _E.romance.stage === '暧昧' ? 1 : _E.romance.stage === '明确' ? 2 : 3) : 0)) || 0;
    var _aff = (_E && typeof _E.affection === 'number') ? _E.affection : 0;
    var _broSup = (_E && _E.brother && typeof _E.brother.support === 'number') ? _E.brother.support : 0;
    var _weatherIsFog = (GS.weather || '').indexOf('雾') >= 0;
    var _extras = parsed && parsed.extras ? parsed.extras : {};
    var _note = (_extras.brother && _extras.brother.note) || '';
    var _rev = (_extras.romanceBeat && _extras.romanceBeat.event) || '';
    var _scanText = narrative + ' ' + _note + ' ' + _rev;
    var _contentBans = [
      { pattern: /写歌|写词|为你创作|专属旋律|给你写了/, gate: _stage === 0 && _aff < 20, msg: '当前初遇阶段禁止写歌/写词/创作' },
      { pattern: /专属暗号|只有(我|你)懂|秘密约定|只属于(我|你)/, gate: _aff < 20, msg: '当前好感禁止专属暗号/秘密约定（允许普通语境下单独出现"暗号"一词）' },
      { pattern: /雾(?!化|霾|散)/, gate: !_weatherIsFog, msg: '当前天气非雾天禁止雾氛描写（允许写"雾散了/没有雾"等明确否定雾气的表达）' },
      { pattern: /拥抱|牵手|靠(在|着)(肩|怀)|擦(泪|眼角)/, gate: true, msg: '当前阶段禁止肢体亲密接触' },
      { pattern: /审查.*感情|牵线|撮合|推.*Kakao|月老/, gate: _broSup < 20, msg: '哥哥支持度不足禁止牵线/审查行为' },
      { pattern: /(只对(你|她)|唯独(对你|给她)|偏偏(找你|看她))/, gate: _stage === 0, msg: '初遇观察模式禁止男主做任何指向女主的特别行为' }
    ];
    // 季节/月份矛盾校验
    var _gm = GS.gameMonth;
    var _se = GS.season;
    if (_E && _E.cycle && _E.cycle.dayCount) {
      var dayCount = _E.cycle.dayCount;
      if (!_gm) _gm = Math.floor(((dayCount - 1) % 365) / 30) + 1;
      if (!_se) _se = (function(m){return m>=12||m<=2?'winter':m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':'autumn';})(_gm);
    }
    var _isWinter = (_gm === 12 || _gm === 1 || _gm === 2);
    var _isMarch = (_gm === 3);
    var seasonBans = [
      { pattern: /初雪|雪花飘|积雪|第一场雪|堆雪人/, gate: !_isWinter, msg: '当前' + _gm + '月非冬季，禁止初雪/雪花描写' },
      { pattern: /白色情人节/, gate: !_isMarch, msg: '只有3月才可出现白色情人节' },
      { pattern: /跨年|新年|除夕|元旦/, gate: _gm === 11 && _se === 'autumn', msg: '当前11月秋天禁止跨年/新年描写' },
      { pattern: /供暖|暖气片|冬天的寒意|寒风凛冽/, gate: _se === 'spring' || _se === 'summer', msg: '当前' + _se + '禁止冬季取暖描写' },
      { pattern: /樱花开了|樱花飘落|樱花树/, gate: _se === 'summer', msg: '当前夏季禁止樱花描写' }
    ];
    for (var _si = 0; _si < seasonBans.length; _si++) {
      var _sb = seasonBans[_si];
      if (_sb.gate && _sb.pattern.test(narrative)) {
        corrections.push({ severity: 'error', type: 'content', message: _sb.msg + '。请重新生成。' });
      }
    }
    for (var _ci = 0; _ci < _contentBans.length; _ci++) {
      var _cb = _contentBans[_ci];
      if (_cb.gate && _cb.pattern.test(_scanText)) {
        corrections.push({ severity: 'error', type: 'content', message: _cb.msg + '。请重新生成。' });
      }
    }
    // ── extras-narrative一致性校验：extras中声明的关键动作若叙事正文未出现，裁剪extras ──
    var _actionWords = ['送了', '递给', '买了', '带来了', '寄来', '放了一', '给了'];
    for (var _aw = 0; _aw < _actionWords.length; _aw++) {
      var _w = _actionWords[_aw];
      if (!_note) break;
      if (_note.indexOf(_w) >= 0 && narrative.indexOf(_w) < 0) {
        corrections.push({ severity: 'warning', type: 'content', message: 'extras中brother.note记录了动作"' + _w + '…"，但叙事正文未出现对应行为。请把动作写进正文或从extras中移除。' });
        break;
      }
    }
  }
  return corrections;
}

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
  corrections = corrections.concat(addSeverity(checkPrivateTraitViolation(content), 'warning'));
  // [F] checkTimeMealMismatch 已移除：1v1 不再锚定具体时段，午饭描写不再受时钟约束

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
  if (!isSisterSetting() && (/前辈/.test(allText) || /后辈/.test(allText))) {
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
      speaker = { name: '女主', age: PLAYER_BIRTH_YEAR, isPlayer: true, birthYear: getPlayerBirthYear(GS.heroineProfile && GS.heroineProfile.age, GS.oneHeartStartYear || 2025) };
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
            // [妹妹人设亲哥豁免] 女主称呼关系网角色中的亲哥哥为"哥"是允许的
            var _rel = GS.oneHeartRelationCharacter;
            var _isBrother = _rel && _rel.role === '哥哥' && _rel.name === target.name;
            if (!_isBrother) {
              if (isSisterSetting()) {
                violations.push('女主对' + target.name + '称"' + patterns[p] + '"——妹妹设定下女主禁止称"哥"，应称"前辈"或"欧巴"');
              } else {
                violations.push('女主对' + target.name + '称"' + patterns[p] + '"——女主禁止称"哥"，应称"欧巴"（好感度>60）或直呼名字');
              }
            }
          } else if ((speaker.birthYear || speaker.age) <= (target.birthYear || target.age)) {
            violations.push(speaker.name + '（' + (speaker.birthYear || speaker.age) + '年生）对' + target.name + '（' + (target.birthYear || target.age) + '年生）称"' + patterns[p] + '"——年长者/同龄对年幼者禁止称"哥"');
          }
        }
      }
    }
    // [妹妹设定·男主禁说"我哥"] 男主在本故事中无兄弟，说出"我哥/我哥哥"是错误指代，强制纠错走重写管线
    if (block.type === 'memberInterview' && block.member === GS.oneHeartMember) {
      if (/我哥\b|我哥哥/.test(content)) {
        var _bname = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) ? GS.oneHeartRelationCharacter.name : '哥哥本名';
        violations.push('男主（' + memberName + '）说出"我哥/我哥哥"——本故事里男主没有兄弟，请改用哥哥本名「' + _bname + '」或"你哥"指代。');
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
      message: violations.join('；') + '。称呼规则：' + (isSisterSetting()
        ? '妹妹设定下女主对成员默认称"前辈"、亲密时称"欧巴"，禁止直呼名字；年幼者可对年长者称"哥"；禁止"-xi"。'
        : '年幼者可对年长者称"哥"，年长者/同龄对年幼者/同龄禁止称"哥"；女主禁止称"哥"（应称"欧巴"或名字）；禁止"前辈""后辈""-xi"。')
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

// ==================== 8. 哥哥身份一致性校验（1v1 妹妹设定） ====================
// 检测其他成员被 AI 误写成女主哥哥（说"我妹/我姐"等亲缘称谓）
export function checkOneHeartBrotherImpersonation(content) {
  var corrections = [];
  if (!isSisterSetting()) return corrections;
  var _rel = GS.oneHeartRelationCharacter;
  if (!_rel || !_rel.name) return corrections;
  var _legalName = _rel.name;
  var _legalId = _rel.memberId;
  var _rivalId = (GS.oneHeartRival && GS.oneHeartRival.memberId) ? GS.oneHeartRival.memberId : '';
  for (var i = 0; i < MEMBERS.length; i++) {
    var m = MEMBERS[i];
    if (m.id === _legalId) continue;
    if (m.id === GS.oneHeartMember) continue;
    if (_rivalId && m.id === _rivalId) continue;
    var _idx = content.indexOf(m.name);
    while (_idx >= 0) {
      var _after = content.substring(_idx + m.name.length, _idx + m.name.length + 4);
      if (/我妹|我姐|我妹妹|我弟弟/.test(_after)) {
        corrections.push('[哥哥身份] 「' + m.name + '」对女主说"我妹/我姐"充当了哥哥角色，但本局哥哥是「' + _legalName + '」。请改写为队友互动或改用「' + _legalName + '」出场。');
        break;
      }
      _idx = content.indexOf(m.name, _idx + 1);
    }
  }
  return corrections;
}

// ==================== 9. 季节一致性校验 ====================
// 检测剧情描写与当前月份/季节的矛盾
export function checkSeasonConsistency(content) {
  var corrections = [];
  var _month = (GS.currentDate && GS.currentDate.month) || 0;
  var _season = '';
  if (_month >= 3 && _month <= 5) _season = 'spring';
  else if (_month >= 6 && _month <= 8) _season = 'summer';
  else if (_month >= 9 && _month <= 11) _season = 'autumn';
  else _season = 'winter';
  var _labels = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
  var _bad = [];
  if (_season === 'summer') {
    _bad = ['冬日', '寒冬', '寒气', '寒风', '羽绒服', '围巾', '暖气', '结冰', '雪花', '哈气成霜', '冻得', '凛冽', '呵出的白气'];
  } else if (_season === 'winter') {
    _bad = ['闷热', '汗蒸', '短袖', '凉席', '蝉鸣', '酷暑', '烈日', '冰美式降温'];
  } else if (_season === 'spring') {
    _bad = ['酷暑', '严寒', '暴雪', '台风', '凛冽'];
  } else if (_season === 'autumn') {
    _bad = ['酷暑', '严寒', '暴雪', '台风', '闷热'];
  }
  for (var i = 0; i < _bad.length; i++) {
    if (content.indexOf(_bad[i]) >= 0) {
      corrections.push('[季节一致性] 当前是' + (_labels[_season] || _season) + '，出现"' + _bad[i] + '"与季节矛盾，请改为符合季节的描写。');
      break;
    }
  }
  return corrections;
}

// ==================== 10. 脏话检测 ====================
// 检测角色对话中的脏话粗口
export function checkProfanity(content) {
  var corrections = [];
  var _bad = ['他妈', '妈的', '我操', '卧槽', '特么', '扯淡', '草泥马', '日你', '你妈'];
  for (var i = 0; i < _bad.length; i++) {
    if (content.indexOf(_bad[i]) >= 0) {
      corrections.push('[禁止脏话] 剧情中出现"' + _bad[i] + '"，角色对话禁止脏话/粗口，请用"该死/可恶/真是的/服了"等替代。');
      break;
    }
  }
  // "操" 单独成字（后跟他/了/的/标点/换行，排除"操作/操心/操练/操持/操守"）
  if (/操[他了，。！？\n]/.test(content)) {
    corrections.push('[禁止脏话] 剧情中"操"字用作脏话，角色对话禁止脏话，请用"该死/可恶/真是的"等替代。');
  }
  // "我靠" 或 "靠！"
  if (/我靠|靠[！!]/.test(content)) {
    corrections.push('[禁止脏话] 剧情中出现"靠"脏话，角色对话禁止脏话，请用"哎呀/完了/不是吧"等替代。');
  }
  return corrections;
}

// [v23-fix] 扫描 narrative 文本检测年龄辈分错误的"X哥"称呼（妹妹设定·男主比哥哥年长时）
export function checkNarrativeAgeHonorific(content) {
  var corrections = [];
  if (!isSisterSetting() || !GS.oneHeartRelationCharacter || !GS.oneHeartRelationCharacter.memberId) return corrections;
  var _broMem = MEMBERS.find(function(mm) { return mm.id === GS.oneHeartRelationCharacter.memberId; });
  if (!_broMem || !_broMem.birthYear) return corrections;
  var _mainMem = MEMBERS.find(function(mm) { return mm.id === GS.oneHeartMember; });
  if (!_mainMem || !_mainMem.birthYear) return corrections;
  // 仅当男主比哥哥年长时检测（男主年幼时称哥哥"哥"是合理的）
  if (_mainMem.birthYear >= _broMem.birthYear) return corrections;
  var _surname = _broMem.name.charAt(0);
  var _given = _broMem.name.substring(1);
  var _patterns = [_surname + '哥', _given + '哥'];
  for (var _ip = 0; _ip < _patterns.length; _ip++) {
    if (content.indexOf(_patterns[_ip]) >= 0) {
      corrections.push('[哥哥身份] 叙事文本中出现「' + _patterns[_ip] + '」——男主「' + _mainMem.name + '」（' + _mainMem.birthYear + '年生）比哥哥「' + _broMem.name + '」（' + _broMem.birthYear + '年生）年长，禁止称"哥"，请改用直呼名字「' + _given + '」或英文名「' + (_broMem.stageName || '') + '」');
    }
  }
  return corrections;
}