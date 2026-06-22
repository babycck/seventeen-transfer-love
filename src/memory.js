import {
  TODAY_TEXT_CAP, TOKEN_CONFIG, GS, callDeepSeek
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

export function getTodayNarrativeTail(charCount) {
  // [改造] 从 JSON blocks 提取纯正文，而不是从 emoji 标记过滤
  var full = getTodayFullText();
  var cleanText = '';
  var segments = full.split('\n\n---\n\n');
  for (var si = 0; si < segments.length; si++) {
    var seg = segments[si];
    var narrText = extractNarrativeFromSegment(seg);
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
    for (var i = before.length - 1; i >= 0; i--) {
      if (before[i] === '"' || before[i] === '\u201c' || before[i] === '\u201d' || before[i] === '\u300c' || before[i] === '\u300d') {
        var extended = before.slice(i) + tail;
        if (extended.length <= charCount + 300) {
          return '...（前略）...\n\n' + extended;
        }
        break;
      }
    }
  }

  return '...（前略）...\n\n' + tail;
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
  if (!GS.aiEnabled) {
    GS._todayCompressedSummary = full.slice(0, 4000);
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
    GS._todayCompressedSummary = full.slice(0, 4000);
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
      '你是记忆压缩助手。将以下一天的恋爱综艺剧情压缩为约1000字的详细摘要。\n\n' +
      '必须保留以下内容（缺一不可）：\n' +
      '1. 关键事件：今天发生了什么，按时间顺序\n' +
      '2. 本日重要发言：角色今天说过的关键台词/有信息量的对话节选（每人1-2条，带说话人）\n' +
      '3. 待兑现约定：今天角色之间约定了什么（如"明天一起做早餐""下午去买东西"）——每条单独列出\n' +
      '4. 今日已揭示信息：女主和每位成员今天说过的偏好、禁忌、习惯、过敏原等（如"女主不喜欢香菜""崔胜澈怕高"）——每条单独列出\n\n' +
      '只输出压缩后的文本。',
      '请将以下Day ' + GS.day + '的全部剧情压缩为约1000字的详细摘要（必须包含关键事件、本日重要发言、待兑现约定、今日已揭示信息三个部分）：\n\n' + full,
      TOKEN_CONFIG.dailySummary,
      false,
      0.2
    );
    return result.trim();
  } catch (e) {
    return full.slice(0, 1000);
  }
}



