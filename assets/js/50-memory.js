// ==================== 记忆系统 ====================
function getTodayFullText() {
  return GS.todayFullText.join('\n\n---\n\n');
}

function getTodayFullTextCapped() {
  var full = getTodayFullText();
  if (full.length <= TODAY_TEXT_CAP) return full;
  return '[当日上下文过长，已压缩为摘要]\n' + (GS._todayCompressedSummary || full.slice(0, 4000));
}

function getTodayNarrativeTail(charCount) {
  var full = getTodayFullText();
  var cleanLines = [];
  var lines = full.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.startsWith('🎬') || t.startsWith('💭') || t.startsWith('🎙') || t.startsWith('🎤') || t.startsWith('🎙️💔')) continue;
    if (t === '---' || t === '') continue;
    if (t === '【选项】' || t.startsWith('【选项】')) continue;
    if (t.startsWith('【短信草稿】')) continue;
    if (t.match(/^\d+[\.、\)]\s/)) continue;
    cleanLines.push(lines[i]);
  }
  var cleanText = cleanLines.join('\n');
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

function getTodayKeyEventsSummary() {
  var full = getTodayFullText();
  if (!full || full.length < 500) return '';
  var interviews = [];
  var lines = full.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.startsWith('🎙') || t.startsWith('🎤') || t.startsWith('🎙️💔')) interviews.push(t);
  }
  if (interviews.length === 0) return '';
  return '今日关键事件（采访间摘要·仅供了解·禁止复述）：\n' + interviews.join('\n');
}

async function compressTodayForInjection() {
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
      '你是记忆压缩助手。将以下一天的恋爱综艺全部剧情压缩为约4000字的详细摘要。保留所有关键对话（含完整"谁对谁说"归属）、情感转折、重要事件、待兑现的约定、角色已揭示的偏好/禁忌/习惯。去掉冗余的环境描写和心理活动。只输出压缩后的文本。',
      '请将以下内容压缩为约4000字的摘要：\n\n' + full,
      TOKEN_CONFIG.todayCompress
    );
    GS._todayCompressedSummary = result.trim();
    return GS._todayCompressedSummary;
  } catch (e) {
    GS._todayCompressedSummary = full.slice(0, 4000);
    return GS._todayCompressedSummary;
  }
}

function addToTodayFullText(rawText) {
  GS.todayFullText.push(rawText);
}

function popTodayFullText() {
  if (GS.todayFullText.length > 0) GS.todayFullText.pop();
}

async function compressTodayToSummary() {
  var full = getTodayFullText();
  if (!full || full.trim().length === 0) return '';
  if (!GS.aiEnabled) return full.slice(0, 1000);
  try {
    var result = await callDeepSeek(
      '你是记忆压缩助手。将以下一天的恋爱综艺剧情压缩为约1000字的详细摘要。\n\n' +
      '必须保留以下内容（缺一不可）：\n' +
      '1. 关键事件：今天发生了什么，按时间顺序\n' +
      '2. 对话归属：所有重要对话必须保留「谁对谁说」的完整归属。格式：A对B说："xxx"。禁止写成「有人提到」「关于xxx的对话」等模糊形式\n' +
      '3. 待兑现约定：今天角色之间约定了什么（如"明天一起做早餐""下午去买东西"）——每条单独列出\n' +
      '4. 今日已揭示信息：女主和每位成员今天说过的偏好、禁忌、习惯、过敏原等（如"女主不喜欢香菜""崔胜澈怕高"）——每条单独列出\n\n' +
      '只输出压缩后的文本。',
      '请将以下Day ' + GS.day + '的全部剧情压缩为约1000字的详细摘要（必须包含关键事件、对话归属、待兑现约定、今日已揭示信息四个部分）：\n\n' + full,
      TOKEN_CONFIG.dailySummary
    );
    return result.trim();
  } catch (e) {
    return full.slice(0, 1000);
  }
}

// ==================== 提取待兑现约定 ====================
function extractPendingPromises(summaryText) {
  var promises = [];
  var lines = summaryText.split('\n');
  var inPromises = false;
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.indexOf('待兑现约定') >= 0 || t.indexOf('约定') >= 0) {
      inPromises = true;
      continue;
    }
    if (inPromises) {
      if (t.startsWith('-') || t.startsWith('•') || t.match(/^\d+[\.、]/)) {
        promises.push(t.replace(/^[-•\d\.、\s]+/, '').trim());
      } else if (t === '' || t.indexOf('今日已揭示') >= 0 || t.indexOf('关键事件') >= 0) {
        inPromises = false;
      }
    }
  }
  return promises;
}

function extractRevealedInfo(summaryText) {
  var info = [];
  var lines = summaryText.split('\n');
  var inInfo = false;
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.indexOf('今日已揭示信息') >= 0 || t.indexOf('已揭示') >= 0) {
      inInfo = true;
      continue;
    }
    if (inInfo) {
      if (t.startsWith('-') || t.startsWith('•') || t.match(/^\d+[\.、]/)) {
        info.push(t.replace(/^[-•\d\.、\s]+/, '').trim());
      } else if (t === '') {
        inInfo = false;
      }
    }
  }
  return info.join('\n');
}
