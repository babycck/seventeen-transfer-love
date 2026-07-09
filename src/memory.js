import {
  TODAY_TEXT_CAP, TOKEN_CONFIG, GS, callDeepSeek, HYBRID_TAIL_CHARS
} from './core.js';
import { parseNarrative } from './parser.js';

// [改造] 从 JSON 剧情段中提取纯正文文本（用于 tail / 上下文注入）
function extractNarrativeFromSegment(segment) {
  var parsed = parseNarrative(segment);
  if (parsed.blocks && parsed.blocks.length > 0) {
    var narrLines = [];
    for (var i = 0; i < parsed.blocks.length; i++) {
      if (parsed.blocks[i].type === 'narrative') narrLines.push(parsed.blocks[i].content);
    }
    if (narrLines.length > 0) return narrLines.join('\n');
  }
  // fallback：直接返回原始段落（非 JSON 兼容）
  return segment;
}

// [改造] 从 JSON 剧情段中提取采访间文本（用于关键事件摘要）
function extractInterviewsFromSegment(segment) {
  var parsed = parseNarrative(segment);
  var lines = [];
  if (parsed.blocks && parsed.blocks.length > 0) {
    for (var i = 0; i < parsed.blocks.length; i++) {
      var b = parsed.blocks[i];
      if (b.type === 'interview' || b.type === 'xInterview') {
        lines.push(b.content);
      } else if (b.type === 'memberInterview') {
        lines.push(b.member ? b.member + '：' + b.content : b.content);
      }
    }
  }
  // 如果没有 blocks，fallback 到旧格式
  if (lines.length === 0) {
    if (parsed.interviews && parsed.interviews.length > 0) {
      for (var j = 0; j < parsed.interviews.length; j++) lines.push(parsed.interviews[j]);
    }
  }
  return lines;
}
// ==================== 记忆系统 ====================
export function getTodayFullText() {
  return GS.todayFullText.join('\n\n---\n\n');
}

export function getTodayFullTextCapped() {
  var full = getTodayFullText();
  if (full.length <= TODAY_TEXT_CAP) return full;
  return '[当日上下文过长，已压缩为摘要]\n' + (GS._todayCompressedSummary || full.slice(0, 4000));
}

// ==================== 连贯降级：抽取任意文本的近期叙事 tail（D） ====================
// 由 getTodayNarrativeTail 内部逻辑重构为可接收任意文本（含 '\n\n---\n\n' 分隔段）。
// 抽取纯 narrative 正文，按引号边界对齐切口，避免断句或丢掉引用的约定。
export function extractNarrativeTail(text, charCount) {
  if (!text) return '';
  charCount = charCount || 3000;
  var cleanText = '';
  var segments = String(text).split('\n\n---\n\n');
  for (var si = 0; si < segments.length; si++) {
    var narrText = extractNarrativeFromSegment(segments[si]);
    if (narrText) cleanText += (cleanText ? '\n' : '') + narrText;
  }
  if (cleanText.length <= charCount) return cleanText;

  var tail = cleanText.slice(-charCount);
  var openQuote = false;
  for (var i = 0; i < tail.length; i++) {
    if (tail[i] === '"' || tail[i] === '\u201c' || tail[i] === '\u201d' || tail[i] === '\u300c' || tail[i] === '\u300d') {
      openQuote = !openQuote;
    }
  }
  if (openQuote) {
    var before = cleanText.slice(0, cleanText.length - charCount);
    for (var j = before.length - 1; j >= 0; j--) {
      if (before[j] === '"' || before[j] === '\u201c' || before[j] === '\u201d' || before[j] === '\u300c' || before[j] === '\u300d') {
        var extended = before.slice(j) + tail;
        if (extended.length <= charCount + 300) {
          return '...（前略）...\n\n' + extended;
        }
        break;
      }
    }
  }

  return '...（前略）...\n\n' + tail;
}

export function getTodayNarrativeTail(charCount) {
  // [改造] 复用共享 extractNarrativeTail（D）
  return extractNarrativeTail(getTodayFullText(), charCount);
}

// ==================== 混合当日注入（C） ====================
// 注入 = 压缩早期摘要 + 近期 narrative tail，避免缓存抹平后段细节。
export function getTodayHybridContext() {
  var full = getTodayFullText();
  if (full.length <= TODAY_TEXT_CAP) return full;
  var summary = GS._todayCompressedSummary || '';
  if (summary) {
    return summary + '\n\n[近期剧情原文]\n' + extractNarrativeTail(full, HYBRID_TAIL_CHARS || 3000);
  }
  // 超长但尚未生成压缩摘要：退回全量（压缩流程随后会补摘要）
  return full;
}

export function getTodayKeyEventsSummary() {
  var full = getTodayFullText();
  if (!full || full.length < 500) return '';
  // [改造] 从 JSON blocks 提取采访间内容
  var interviews = [];
  var segments = full.split('\n\n---\n\n');
  for (var si = 0; si < segments.length; si++) {
    interviews = interviews.concat(extractInterviewsFromSegment(segments[si]));
  }
  if (interviews.length === 0) return '';
  // 格式化：批量拼接到一行避免 token 膨胀
  var summary = interviews.join('；');
  if (summary.length > 2000) summary = summary.slice(0, 2000) + '……';
  return '今日关键事件（采访间摘要·仅供了解·禁止复述）：\n' + summary;
}

export function getLayeredHistory() {
  var result = [];
  var yesterdayIdx = GS.day - 2;
  for (var d = 0; d < GS.dailySummaries.length; d++) {
    var dayNum = d + 1;
    if (d === yesterdayIdx && GS.dailyFullTexts[d]) {
      var fullTexts = GS.dailyFullTexts[d];
      result.push('Day ' + dayNum + '（昨日·完整全文）：\n' + fullTexts.join('\n\n---\n\n'));
    } else {
      result.push('Day ' + dayNum + '摘要：' + GS.dailySummaries[d]);
    }
  }
  return result.join('\n\n');
}

export async function compressTodayForInjection() {
  var full = getTodayFullText();
  if (full.length <= TODAY_TEXT_CAP) {
    GS._todayCompressedSummary = '';
    return full;
  }
  // BUG-07: 同天已压缩过则复用缓存，避免每次进入时段重复烧 token 且注入内容前后不一致
  if (GS._todayCompressedSummary) {
    // [v23-fix] 若缓存是测试模式占位文本或 fallback 关键词，清空重压
    if (GS._todayCompressedSummary.indexOf('测试模式') >= 0 || GS._todayCompressedSummary.indexOf('fallback') >= 0) {
      GS._todayCompressedSummary = '';
    } else {
      return GS._todayCompressedSummary;
    }
  }
  if (!GS.aiEnabled) {
    GS._todayCompressedSummary = extractNarrativeTail(full, 4000);
    return GS._todayCompressedSummary;
  }
  try {
    var result = await callDeepSeek(
      '你是记忆压缩助手。将以下一天的恋爱综艺全部剧情压缩为约4000字的详细摘要。保留关键对话（含重要发言原文）、情感转折、重要事件、待兑现的约定、角色已揭示的偏好/禁忌/习惯。去掉冗余的环境描写和心理活动。只输出压缩后的文本。',
      '请将以下内容压缩为约4000字的摘要：\n\n' + full,
      TOKEN_CONFIG.todayCompress,
      false,
      0.2
    );
    GS._todayCompressedSummary = result.trim();
    return GS._todayCompressedSummary;
  } catch (e) {
    GS._todayCompressedSummary = extractNarrativeTail(full, 4000);
    return GS._todayCompressedSummary;
  }
}


export function popTodayFullText() {
  if (GS.todayFullText.length > 0) GS.todayFullText.pop();
}

export async function compressTodayToSummary() {
  var full = getTodayFullText();
  if (!full || full.trim().length === 0) return '';
  if (!GS.aiEnabled) return full.slice(0, 1000);
  try {
    var result = await callDeepSeek(
      '你是记忆压缩助手。将以下一天的恋爱综艺剧情压缩为结构化 JSON 摘要。\n\n' +
      '必须包含以下字段：\n' +
      '{"events":["关键事件1","关键事件2"],"dialogues":["重要台词1"],"promises":["约定1"],"revealedInfo":["已揭示偏好/禁忌1"]}\n\n' +
      '规则：\n1. events：今天发生了什么关键事件（按时间顺序，每条简洁一句话）\n2. dialogues：角色说过的关键台词/有信息量的对话节选\n3. promises：角色之间约定了什么（每条单独列出）\n4. revealedInfo：女主和每位成员说过的偏好、禁忌、习惯、过敏原等（每条单独列出）\n\n只输出 JSON，不要其他文本。',
      '请将以下Day ' + GS.day + '的全部剧情压缩为结构化 JSON 摘要：\n\n' + full,
      TOKEN_CONFIG.dailySummary,
      false,
      0.2
    );
    var _parsed = null;
    try { _parsed = JSON.parse(result); } catch (e) {
      var _m = result.match(/\{[\s\S]*\}/);
      if (_m) { try { _parsed = JSON.parse(_m[0]); } catch (e2) {} }
    }
    if (_parsed && (_parsed.events || _parsed.dialogues || _parsed.promises || _parsed.revealedInfo)) {
      return JSON.stringify(_parsed);
    }
    return result.trim();
  } catch (e) {
    return full.slice(0, 1000);
  }
}

// ==================== 1v1 模式昨日压缩（计划B问题1） ====================
// 在"新的一天"时压缩昨日全文为结构化 JSON 摘要
// 结果存入 GS.oneHeartYesterdaySummary + GS.oneHeartDailySummaries（限7条）
export async function compressOneHeartYesterday() {
  if (!GS.todayFullText || GS.todayFullText.length === 0) return '';
  var startIdx = GS.oneHeartLastDayStartIdx || 0;
  var yTexts = GS.todayFullText.slice(startIdx);
  if (yTexts.length < 2) return '';
  var yJoined = yTexts.join('\n\n---\n\n');
  if (yJoined.length < 200) return '';
  if (!GS.aiEnabled) {
    var _fallback = extractNarrativeTail(yJoined, 1000);
    GS.oneHeartYesterdaySummary = _fallback;
    if (!Array.isArray(GS.oneHeartDailySummaries)) GS.oneHeartDailySummaries = [];
    GS.oneHeartDailySummaries.push(_fallback);
    if (GS.oneHeartDailySummaries.length > 7) GS.oneHeartDailySummaries.shift();
    return _fallback;
  }
  try {
    var result = await callDeepSeek(
      '你是记忆压缩助手。将以下一天的恋爱剧情压缩为结构化 JSON 摘要。\n\n' +
      '必须包含以下字段：\n' +
      '{"events":["关键事件1"],"dialogues":["重要台词1"],"promises":["约定1"],"revealedInfo":["已揭示偏好1"]}\n\n' +
      '规则：\n1. events：发生了什么关键事件（按时间顺序，每条简洁一句话）\n2. dialogues：角色说过的关键台词/有信息量的对话节选\n3. promises：角色之间约定了什么（每条单独列出）\n4. revealedInfo：女主和成员说过的偏好、禁忌、习惯、过敏原等（每条单独列出）\n\n只输出 JSON，不要其他文本。',
      '请将以下昨日剧情压缩为结构化 JSON 摘要：\n\n' + yJoined.slice(0, 8000),
      TOKEN_CONFIG.dailySummary,
      false,
      0.2
    );
    var parsed = null;
    try { parsed = JSON.parse(result); } catch (e) {
      var m = result.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (e2) {} }
    }
    var summary;
    if (parsed && (parsed.events || parsed.dialogues || parsed.promises || parsed.revealedInfo)) {
      summary = JSON.stringify(parsed);
    } else {
      summary = extractNarrativeTail(yJoined, 1000);
    }
    GS.oneHeartYesterdaySummary = summary;
    if (!Array.isArray(GS.oneHeartDailySummaries)) GS.oneHeartDailySummaries = [];
    GS.oneHeartDailySummaries.push(summary);
    if (GS.oneHeartDailySummaries.length > 7) GS.oneHeartDailySummaries.shift();
    return summary;
  } catch (e) {
    var fallback = extractNarrativeTail(yJoined, 1000);
    GS.oneHeartYesterdaySummary = fallback;
    if (!Array.isArray(GS.oneHeartDailySummaries)) GS.oneHeartDailySummaries = [];
    GS.oneHeartDailySummaries.push(fallback);
    if (GS.oneHeartDailySummaries.length > 7) GS.oneHeartDailySummaries.shift();
    return fallback;
  }
}

// ==================== 结构化事实记忆合并（A/B） ====================
// 按「角色+类别」用指纹（前8+后8字）去重合并，复用 dedupeEventLog 思路。
export function mergeMemoryFacts(existing, incoming) {
  existing = existing || {};
  incoming = incoming || {};
  var owners = {};
  // 角色键集合：已有 + 新来
  var keys = {};
  for (var k in existing) { if (existing.hasOwnProperty(k)) keys[k] = true; }
  for (var k2 in incoming) { if (incoming.hasOwnProperty(k2)) keys[k2] = true; }
  for (var owner in keys) {
    if (!keys.hasOwnProperty(owner)) continue;
    var _e = existing[owner] || { preferences: [], taboos: [], allergens: [] };
    var _i = incoming[owner] || { preferences: [], taboos: [], allergens: [] };
    owners[owner] = {
      preferences: dedupeEventLog((_e.preferences || []).concat(_i.preferences || [])),
      taboos: dedupeEventLog((_e.taboos || []).concat(_i.taboos || [])),
      allergens: dedupeEventLog((_e.allergens || []).concat(_i.allergens || []))
    };
  }
  return owners;
}

// 约定跨天累积去重（B）：保留既有，新增不重复。
export function mergePromises(oldArr, newArr) {
  oldArr = oldArr || [];
  newArr = newArr || [];
  var seen = {};
  var result = [];
  for (var i = 0; i < oldArr.length; i++) {
    var s = String(oldArr[i] || '');
    if (!s || seen[s]) continue;
    seen[s] = true;
    result.push(oldArr[i]);
  }
  for (var j = 0; j < newArr.length; j++) {
    var s2 = String(newArr[j] || '');
    if (!s2 || seen[s2]) continue;
    seen[s2] = true;
    result.push(newArr[j]);
  }
  return result;
}

// ==================== 事件日志去重（计划B问题6） ====================
// 对事件条目按"前8字+后8字"指纹去重，保留首次出现的条目
// AI 提取的 eventItems 可能有微小措辞差异但实质相同，指纹匹配命中即视为重复
export function dedupeEventLog(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return arr;
  var seen = {};
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    var item = String(arr[i] || '');
    if (item.length === 0) continue;
    var fingerprint = item.slice(0, 8) + '|' + item.slice(-8);
    if (seen[fingerprint]) continue;
    seen[fingerprint] = true;
    result.push(arr[i]);
  }
  return result;
}



