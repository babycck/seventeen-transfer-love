import {
  MEMBERS, PHASES, PHASE_LABELS, HEART_NOTE_TEMPLATES,
  GS, saveGame, showToast
} from './core.js';
import { updateAffection, addAffectionLog } from './affection.js';
import { sanitizeScene } from './schema.js';
import { checkOneHeartPacing, checkOneHeartAddressing } from './validator.js';

// ==================== 叙事解析器（JSON 输入版） ====================
// AI 现在只输出 JSON，本地用 schema 做兜底 + 字段拆分。
// 旧版 emoji 状态机解析已废弃（用户已确认重置游戏，不兼容旧 markdown 输出）。

// 将未加引号的键名（如 {mine: ...} / {, post: ...}）补成合法 JSON 键名 "mine"
// 字符串感知：仅在非字符串上下文、且键名紧跟 ':' 时修正，避免误伤正文。
function quoteUnquotedKeys(s) {
  if (typeof s !== 'string') return s;
  var out = '';
  var inStr = false;
  var esc = false;
  var n = s.length;
  for (var i = 0; i < n; i++) {
    var c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\') { out += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (!inStr && (c === '{' || c === ',' || c === '[')) {
      var j = i + 1;
      while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r')) j++;
      var k = j;
      while (k < n && /[A-Za-z_$]/.test(s[k])) k++;
      if (k > j) {
        var mm = k;
        while (mm < n && (s[mm] === ' ' || s[mm] === '\t' || s[mm] === '\n' || s[mm] === '\r')) mm++;
        if (s[mm] === ':') {
          out += c + '"' + s.slice(j, k) + '"';
          i = mm - 1; // 跳到 ':' 前，循环 i++ 后正常写入 ':'
          continue;
        }
      }
    }
    out += c;
  }
  return out;
}

// 平衡括号扫描：从首个 '{' 起，按字符串/转义感知找到匹配的最外层 '}'
function extractBalancedObject(s) {
  if (typeof s !== 'string') return null;
  var start = s.indexOf('{');
  if (start < 0) return null;
  var depth = 0;
  var inStr = false;
  var esc = false;
  for (var i = start; i < s.length; i++) {
    var c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

// 稳健解析单个 JSON 对象：直接解析 → 平衡括号提取 + 修复 → repairJson 兜底。
// 任意一步失败都返回 null（不抛错），供调用方优雅降级。
export function safeParseJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  var s = raw.trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch (e) {}
  var balanced = extractBalancedObject(s);
  if (balanced) {
    try { return JSON.parse(balanced); } catch (e) {}
    try { return JSON.parse(repairJson(balanced)); } catch (e) {}
  }
  try { return JSON.parse(repairJson(s)); } catch (e) {}
  return null;
}

function repairJson(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  try { JSON.parse(raw); return raw; } catch (e) {}
  var s = raw.trim();
  var firstBrace = s.indexOf('{');
  var lastBrace = s.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  try { JSON.parse(s); return s; } catch (e) {}
  // 修复未加引号的键名（如 {mine: ...}），再做后续修复
  s = quoteUnquotedKeys(s);
  // 修复对象和数组末尾的多余逗号
  s = s.replace(/,\s*([}\]])/g, '$1');
  try { JSON.parse(s); return s; } catch (e) {}
  // 修复字符串中未转义的换行符 + 处理截断
  var inString = false;
  var escape = false;
  var bracketStack = [];
  var result = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\') { result += ch; escape = true; continue; }
    if (ch === '"' && !escape) { inString = !inString; result += ch; continue; }
    if (!inString) {
      if (ch === '{') bracketStack.push('}');
      if (ch === '[') bracketStack.push(']');
      if (ch === '}' || ch === ']') {
        if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === ch) {
          bracketStack.pop();
        }
      }
    }
    if (inString && (ch === '\n' || ch === '\r')) {
      result += '\\n';
      continue;
    }
    result += ch;
  }
  if (inString) result += '"';
  while (bracketStack.length > 0) { result += bracketStack.pop(); }
  try { JSON.parse(result); return result; } catch (e) {}
  // 修复 blocks 数组中对象之间缺逗号：}{ → },
  result = result.replace(/}(\s*){/g, '},$1{');
  try { JSON.parse(result); return result; } catch (e) {}
  // 修复 content 字段中未转义的 ASCII "（在 CJK 字符之间）
  // 先保存备份，若修复后 JSON.parse 失败则回退，避免破坏后续修复层
  var beforeContentFix = result;
  result = result.replace(/"content":\s*"((?:[^"\\]|\\.)*)"/g, function(m, content) {
    var escaped = '';
    for (var ci = 0; ci < content.length; ci++) {
      var cc = content[ci];
      if (cc === '\\') { escaped += cc + (content[ci+1] || ''); ci++; continue; }
      if (cc === '"') {
        escaped += '\\"';
      } else {
        escaped += cc;
      }
    }
    return '"content": "' + escaped + '"';
  });
  try { JSON.parse(result); return result; } catch (e) { result = beforeContentFix; }
  // 最后手段：用正则提取 blocks 数组，重建合法 JSON
  var blocksMatch = s.match(/"blocks"\s*:\s*\[([\s\S]*?)\]\s*[,\}]/);
  if (blocksMatch) {
    try {
      var blocksRaw = '[' + blocksMatch[1] + ']';
      // 在数组内部，逐对象修复：去掉前后的非JSON字符
      blocksRaw = blocksRaw.replace(/([}\]],\s*)(?:\s*[^\[\]{}"']+\s*)/g, '$1');
      // 尝试用字符状态机提取数组中的每个对象
      var objs = [];
      var buf = '';
      var dep = 0;
      var inStr = false;
      var esc = false;
      for (var ci = 0; ci < blocksRaw.length; ci++) {
        var cc = blocksRaw[ci];
        if (esc) { buf += cc; esc = false; continue; }
        if (cc === '\\') { buf += cc; esc = true; continue; }
        if (cc === '"' && !esc) { inStr = !inStr; buf += cc; continue; }
        if (!inStr) {
          if (cc === '{') dep++;
          if (cc === '}') dep--;
          if (dep === 0 && cc === ',') { /* skip */ }
        }
        buf += cc;
        if (!inStr && cc === ']') break;
      }
      if (buf) {
        var fixedJson = '{"blocks":' + buf + ',"observers":[],"options":[],"smsDrafts":[],"drinks":[]}';
        try { JSON.parse(fixedJson); return fixedJson; } catch (ex) {}
      }
    } catch (ex) {}
  }
  // 第8层：非字符串上下文扫描数组元素缺逗号（6种场景）
  result = fixMissingCommasInArrays(result);
  try { JSON.parse(result); return result; } catch (e) {}
  // 所有修复失败时返回合法空对象，确保 parseNarrative 不会抛错
  return '{"blocks":[],"observers":[],"options":[],"smsDrafts":[],"drinks":[]}';
}

// 非字符串上下文数组缺逗号扫描：6种场景
function fixMissingCommasInArrays(str) {
  var inStr = false;
  var esc = false;
  var result = '';
  for (var i = 0; i < str.length; i++) {
    var ch = str[i];
    if (esc) { result += ch; esc = false; continue; }
    if (ch === '\\') { result += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; result += ch; continue; }
    if (!inStr) {
      // 当前字符是 { " [ → 检查上一个非空白字符是否缺少逗号
      if (ch === '{' || ch === '"' || ch === '[') {
        var trimmed = result.replace(/\s+$/, '');
        var lastChar = trimmed.charAt(trimmed.length - 1);
        if (lastChar === '}' || lastChar === ']' || lastChar === '"') {
          result = trimmed + ',' + result.slice(trimmed.length);
          continue;
        }
      }
    }
    result += ch;
  }
  return result;
}

// 兜底：从 rawText 中直接用括号匹配提取 blocks 数组
// 用于 repairJson 全部修复失败后的最后手段
function _extractBlocksFromRaw(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  var blocksKeyIdx = rawText.indexOf('"blocks"');
  if (blocksKeyIdx < 0) return null;
  var arrStart = rawText.indexOf('[', blocksKeyIdx + 8);
  if (arrStart < 0) return null;

  // 括号匹配找闭合 ]
  var brackets = 1;
  var inStr = false;
  var esc = false;
  var arrEnd = -1;
  for (var i = arrStart + 1; i < rawText.length; i++) {
    var c = rawText[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"' && !esc) { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') brackets++;
    if (c === '}' || c === ']') {
      brackets--;
      if (brackets === 0) { arrEnd = i; break; }
    }
  }

  var blocks = null;
  if (arrEnd > arrStart) {
    var arrStr = rawText.slice(arrStart, arrEnd + 1);
    try { var parsed = JSON.parse(arrStr); if (Array.isArray(parsed)) blocks = parsed; } catch (e) {}
  }

  if (!blocks || blocks.length === 0) {
    // 截断或 parse 失败：逐个提取顶层 {..} 对象
    var src = arrEnd > arrStart ? rawText.slice(arrStart, arrEnd + 1) : rawText.slice(arrStart);
    blocks = [];
    var braceDepth = 0;
    var objStart = -1;
    var inStr2 = false;
    var esc2 = false;
    for (var j = 0; j < src.length; j++) {
      var ch = src[j];
      if (esc2) { esc2 = false; continue; }
      if (ch === '\\') { esc2 = true; continue; }
      if (ch === '"' && !esc2) { inStr2 = !inStr2; continue; }
      if (inStr2) continue;
      if (ch === '{') { if (braceDepth === 0) objStart = j; braceDepth++; }
      if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0 && objStart >= 0) {
          var objStr = src.slice(objStart, j + 1);
          try { var obj = JSON.parse(objStr); if (obj && obj.type && obj.content) blocks.push(obj); } catch (ex) {}
          objStart = -1;
        }
      }
    }
  }

  if (Array.isArray(blocks) && blocks.length > 0) {
    blocks = blocks.filter(function(b) {
      return b && typeof b === 'object' && typeof b.type === 'string' && typeof b.content === 'string';
    });
  }
  return blocks.length > 0 ? blocks : null;
}

export function parseNarrative(rawText) {
  var empty = {
    narrative: '',
    directorOS: '',
    observerOS: '',
    interviews: [],
    memberInterviews: [],
    xInterviews: [],
    options: [],
    blocks: [],
    observers: [],
    affChanges: [],
    drinks: [],
    smsDrafts: [],
    secretMissionDone: false
  };
  if (!rawText || typeof rawText !== 'string') {
    console.warn('[parseNarrative] 收到空或无效输入:', rawText);
    return empty;
  }

  // 解析 JSON，自动修复 AI 常见问题
  var obj = null;
  var repaired = repairJson(rawText);
  try {
    obj = JSON.parse(repaired);
  } catch (e) {
    console.error('[parseNarrative] JSON 解析失败:', e, '\n完整原文:', rawText);
    GS._lastParseError = {
      time: new Date().toISOString(),
      error: e.message,
      position: (e.message.match(/position (\d+)/) || [])[1] || '',
      rawText: rawText
    };
    return empty;
  }
  var s = sanitizeScene(obj);

  // fallback：blocks 为空时尝试从其他字段或 rawText 提取内容，避免完全丢失 AI 返回的剧情
  if (s.blocks.length === 0 && obj) {
    var fallbackFields = ['narrative', 'content', 'text', 'story'];
    for (var fi = 0; fi < fallbackFields.length; fi++) {
      var val = obj[fallbackFields[fi]];
      if (typeof val === 'string' && val.trim().length > 20) {
        s.blocks = [{ type: 'narrative', content: val.trim(), member: '' }];
        console.warn('[parseNarrative] blocks 为空，从 obj.' + fallbackFields[fi] + ' 提取 fallback narrative');
        break;
      }
    }
    // 兜底提取：obj 无文本字段但 rawText 含 blocks 数组时，用括号匹配直接提取
    if (s.blocks.length === 0 && rawText && rawText.indexOf('"blocks"') >= 0) {
      var extractedBlocks = _extractBlocksFromRaw(rawText);
      if (extractedBlocks && extractedBlocks.length > 0) {
        var sanitizedBlocks = sanitizeScene({ blocks: extractedBlocks });
        s.blocks = sanitizedBlocks.blocks;
        console.warn('[parseNarrative] _extractBlocksFromRaw 兜底提取到 ' + s.blocks.length + ' 个 block');
      }
    }
    // 如果 obj 中没有其他文本字段，但 rawText 本身不是 JSON 格式（AI 可能返回了纯文本）
    if (s.blocks.length === 0 && rawText) {
      var trimmedRaw = rawText.trim();
      if (trimmedRaw.charAt(0) !== '{' && trimmedRaw.length > 50) {
        // 检测 AI 思考过程泄漏（模型把内部推理当输出返回，非剧情文本）
        // 这类文本含"我们需要生成/我决定/先构思/blocks[0]/选项A"等推理关键词
        // 检测到时不塞入 narrative，保持 blocks 为空，让 validator 报 error 触发重试
        var reasoningKeywords = [
          '我们需要生成', '先构思', '现在构思', '我这样安排', '基于此',
          '我需要确保', '我们被要求', '所以选项', '调整选项', '可以这样',
          'blocks[0]', '选项A', '选项B', '选项C', 'affName', 'affDelta', 'affReason',
          '生成JSON', '输出格式', '输出JSON', '构思具体内容', '先写具体',
          '或许可以', '为了简化', '按年龄顺序', 'riskMember'
        ]; // BUG-19: 移除易与正常叙事混淆的词（'我决定'/'这段剧情'/'我没想到'/'不太合适'），降低误判触发重试
        var isReasoningLeak = false;
        for (var ri = 0; ri < reasoningKeywords.length; ri++) {
          if (trimmedRaw.indexOf(reasoningKeywords[ri]) >= 0) {
            isReasoningLeak = true;
            break;
          }
        }
        // 额外特征：推理泄漏文本通常含「我」+ 多个换行段落 + JSON 字段名
        if (!isReasoningLeak && trimmedRaw.indexOf('我') >= 0 &&
            trimmedRaw.split('\n').length > 8 &&
            (trimmedRaw.indexOf('affName') >= 0 || trimmedRaw.indexOf('options') >= 0 || trimmedRaw.indexOf('blocks') >= 0)) {
          isReasoningLeak = true;
        }
        if (isReasoningLeak) {
          console.warn('[parseNarrative] 检测到 AI 思考过程泄漏，跳过 fallback，保持 blocks 为空以触发重试');
        } else {
          s.blocks = [{ type: 'narrative', content: trimmedRaw, member: '' }];
          console.warn('[parseNarrative] blocks 为空，rawText 非 JSON，作为 fallback narrative');
        }
      }
    }
  }

  // ---- 按块类型分组，给旧字段做兼容映射 ----
  var narrativeLines = [];
  var directorLines = [];
  var observerLines = [];
  var interviews = [];
  var memberInterviews = [];   // { member, content }
  var xInterviews = [];

  for (var i = 0; i < s.blocks.length; i++) {
    var b = s.blocks[i];
    var c = b.content;
    if (!c) continue;
    if (b.type === 'narrative') {
      narrativeLines.push(c);
    } else if (b.type === 'interview') {
      interviews.push(c);
    } else if (b.type === 'xInterview') {
      xInterviews.push(c);
    } else if (b.type === 'memberInterview') {
      memberInterviews.push({ member: b.member || '', content: c });
    } else if (b.type === 'directorOS') {
      directorLines.push(c);
    } else if (b.type === 'observerOS') {
      observerLines.push(c);
    }
  }

  // 把 observers 数组也拼成 observerOS 文本，兼容旧 ui-renderer 的 observerOS block 渲染
  for (var o = 0; o < s.observers.length; o++) {
    observerLines.push(s.observers[o].name + '：' + s.observers[o].line);
  }

  // ---- 同步 blocks：observers 数组并归入 blocks 末尾（兼容旧 renderParsedNarrative） ----
  var allBlocks = s.blocks.slice();
  if (s.observers.length > 0) {
    // 若 blocks 末尾没有 observerOS block，则把 observers 数组转换为一条 observerOS block 补回去
    var hasObserverBlock = s.blocks.some(function(b) { return b.type === 'observerOS'; });
    if (!hasObserverBlock) {
      allBlocks.push({
        type: 'observerOS',
        member: '',
        content: s.observers.map(function(o) { return o.name + '：' + o.line; }).join('\n')
      });
    }
  }

  // ---- 从 options 提取好感度变化（取代旧版正则） ----
  var affChanges = [];
  for (var j = 0; j < s.options.length; j++) {
    var opt = s.options[j];
    if (opt.affName && opt.affDelta) {
      var affMember = MEMBERS.find(function(m) { return m.name === opt.affName; });
      if (affMember && GS.selectedMembers.indexOf(affMember.id) >= 0) {
        affChanges.push({
          memberId: affMember.id,
          delta: opt.affDelta,
          reason: opt.affReason || ''
        });
      } else {
        // 严格丢弃：affName 指向未出场成员或无效成员时清空
        if (affMember) {
          console.warn('[parseNarrative] 丢弃好感度变化：' + opt.affName + ' 不在 selectedMembers 中');
        }
        opt.affName = '';
        opt.affDelta = 0;
      }
    }
    if (opt.riskMember && opt.riskDelta) {
      var riskMember = MEMBERS.find(function(m) { return m.name === opt.riskMember; });
      if (riskMember && GS.selectedMembers.indexOf(riskMember.id) >= 0) {
        affChanges.push({
          memberId: riskMember.id,
          delta: opt.riskDelta,
          reason: '选项明确扣好感度：' + (opt.affReason || '风险选项')
        });
      } else {
        // 严格丢弃：riskMember 指向未出场成员或无效成员时清空
        if (riskMember) {
          console.warn('[parseNarrative] 丢弃风险好感度变化：' + opt.riskMember + ' 不在 selectedMembers 中');
        }
        opt.riskMember = '';
        opt.riskDelta = 0;
      }
    }
  }

  // ---- 选项归一，保留结构化字段用于 UI 风险标签显示 ----
  var options = s.options.map(function(o, idx) {
    return {
      label: String(idx + 1),
      text: o.text,
      affName: o.affName || '',
      affDelta: o.affDelta || 0,
      affReason: o.affReason || '',
      riskMember: o.riskMember || '',
      riskDelta: o.riskDelta || 0
    };
  });

  // ---- memberInterviews 兼容旧 ui-renderer 期望的"字符串数组" + "字符串" 两种用法 ----
  // 旧 ui-renderer 在 renderParsedNarrative 的兜底分支里把 memberInterviews 当字符串数组处理。
  // 新版 blocks 渲染分支直接读 b.content + b.member，所以这里保留 memberInterviews 为对象数组即可。
  // 旧兜底分支将不再被命中（blocks 一定有内容）。

  return {
    narrative: narrativeLines.join('\n'),
    directorOS: directorLines.join('\n'),
    observerOS: observerLines.join('\n'),
    interviews: interviews,
    memberInterviews: memberInterviews,
    xInterviews: xInterviews,
    options: options,
    blocks: allBlocks,
    observers: s.observers,
    affChanges: affChanges,
    drinks: s.drinks,
    smsDrafts: s.smsDrafts,
    secretMissionDone: false
  };
}

// ==================== 秘密任务完成（副作用触发） ====================
// 旧版在 parser 内根据正则 [秘密任务完成] 触发；新版由引擎层根据
// parsed.secretMissionDone 显式调用本函数。
// 仍保留在此并 export 给 ui-renderer.js / 旧 import 兼容。
export function completeSecretMission() {
  if (!GS.secretMission || GS.secretMission.status !== 'active') return;

  GS.secretMission.status = 'completed';
  GS.secretMission.completedAt = { day: GS.day, phase: PHASES[GS.phaseIndex] };
  GS.secretMissionHistory.push(JSON.parse(JSON.stringify(GS.secretMission)));
  GS.secretMissionCompletedCount++;

  var targetId = GS.secretMission.targetMemberId;
  if (targetId) {
    updateAffection(targetId, 3);
    addAffectionLog(targetId, 3, '完成秘密任务「' + GS.secretMission.title + '」');
    if (!GS.heartNotes[targetId]) GS.heartNotes[targetId] = [];
    var notes = HEART_NOTE_TEMPLATES[targetId];
    if (notes) {
      // 修复 index 交叉取值 Bug：用 text 去重，找第一条未被解锁的笔记
      var existingTexts = GS.heartNotes[targetId].map(function(hn) { return hn.text; });
      var nextNote = null;
      for (var ni = 0; ni < notes.length; ni++) {
        if (existingTexts.indexOf(notes[ni]) < 0) {
          nextNote = notes[ni];
          break;
        }
      }
      if (nextNote) {
        GS.heartNotes[targetId].push({
          text: nextNote,
          unlockedAt: { day: GS.day, source: 'mission', mission: GS.secretMission.title }
        });
      }
    }
    var targetMember = MEMBERS.find(function(m) { return m.id === targetId; });
    if (targetMember) {
      if (typeof showToast === 'function') {
        showToast('✅ 秘密任务完成！' + targetMember.name + ' 好感度 +3 · 心动笔记已解锁');
      }
    }
  } else {
    if (typeof showToast === 'function') {
      showToast('✅ 秘密任务完成！');
    }
  }

  if (GS.secretMissionCompletedCount >= 3 && !GS.secretMissionUnlockFinal) {
    GS.secretMissionUnlockFinal = true;
  }

  GS.secretMission = null;
  saveGame();
}

// ==================== 1v1 叙事解析 ====================

// 归一化 1v1 选项：兼容纯字符串数组 / {text} / {label,content} 形式，
// 保证每个选项都有 text 字段（避免渲染出 undefined），并补齐好感度相关字段。
function normalizeOneHeartOptions(rawOpts) {
  if (!Array.isArray(rawOpts)) return [];
  var out = [];
  for (var i = 0; i < rawOpts.length; i++) {
    var o = rawOpts[i];
    if (o == null) continue;
    if (typeof o === 'string') {
      var st = o.trim();
      if (st) out.push({ text: st, affDelta: 0, affReason: '', affName: '' });
      continue;
    }
    if (typeof o === 'object') {
      var text = (o.text != null) ? o.text : (o.label != null ? o.label : (o.content != null ? o.content : ''));
      text = (typeof text === 'string') ? text.trim() : '';
      if (!text) continue; // 跳过无文本选项，避免显示 undefined
      out.push({
        text: text,
        affDelta: (typeof o.affDelta === 'number') ? o.affDelta : 0,
        affReason: (typeof o.affReason === 'string') ? o.affReason : '',
        affName: (typeof o.affName === 'string') ? o.affName : ''
      });
    }
  }
  return out;
}

export function parseOneHeartNarrative(rawText) {
  var raw = (rawText && typeof rawText === 'string') ? rawText.trim() : '';
  if (!raw) {
    return { narrative: '', options: [], blocks: [], sceneContext: null, eventItems: [], malformed: true };
  }

  // 1) 稳健解析：复用 safeParseJson（剥离 ```json 代码块/前导文字 + 平衡括号 + repairJson 兜底）
  var obj = safeParseJson(raw);

  // 2) 兼容：若仍失败但整体裹在 markdown 代码块，手动剥离后再试
  if (!obj || typeof obj !== 'object') {
    var stripped = raw.replace(/^[\s\S]*?```(?:json)?\s*/i, '').replace(/```[\s\S]*$/, '').trim();
    if (stripped && stripped !== raw) {
      obj = safeParseJson(stripped);
    }
  }

  if (obj && typeof obj === 'object') {
    var options = normalizeOneHeartOptions(obj.options || []);
    var blocks = Array.isArray(obj.blocks) ? obj.blocks : null;
    var narrative = '';
    if (typeof obj.narrative === 'string' && obj.narrative.trim()) {
      narrative = obj.narrative.trim();
    } else if (blocks && blocks.length > 0) {
      var narrBlocks = blocks.filter(function(b) { return b && b.type === 'narrative' && typeof b.content === 'string'; });
      narrative = narrBlocks.map(function(b) { return b.content.trim(); }).join('\n\n');
    }
    // 提取 sceneContext（可选字段）
    var sceneContext = null;
    if (obj.sceneContext && typeof obj.sceneContext === 'object') {
      sceneContext = {
        location: typeof obj.sceneContext.location === 'string' ? obj.sceneContext.location : '',
        present: Array.isArray(obj.sceneContext.present) ? obj.sceneContext.present : [],
        timeOfDay: typeof obj.sceneContext.timeOfDay === 'string' ? obj.sceneContext.timeOfDay : ''
      };
    }
    // 提取 eventItems（1v1 事件条目，可选字段）
    var eventItems = [];
    if (Array.isArray(obj.eventItems)) {
      for (var ei = 0; ei < obj.eventItems.length; ei++) {
        if (typeof obj.eventItems[ei] === 'string' && obj.eventItems[ei].trim()) {
          eventItems.push(obj.eventItems[ei].trim());
        }
      }
    }
    // 提取 AI 声明的时段：顶层 sceneTime 优先，回退 sceneContext.timeOfDay
    var sceneTime = '';
    if (typeof obj.sceneTime === 'string' && obj.sceneTime.trim()) {
      sceneTime = obj.sceneTime.trim();
    } else if (obj.sceneContext && typeof obj.sceneContext.timeOfDay === 'string') {
      sceneTime = obj.sceneContext.timeOfDay.trim();
    }
    if (!narrative) {
      // 解析出对象但无正文：视为异常（可能是纯 options 的脏数据），交由调用方提示重试
      return { narrative: '', options: [], blocks: [], sceneContext: null, eventItems: [], sceneTime: '', malformed: true };
    }
    return {
      narrative: narrative,
      options: options,
      blocks: blocks || [{ type: 'narrative', content: narrative }],
      sceneContext: sceneContext,
      eventItems: eventItems,
      sceneTime: sceneTime,
      malformed: false
    };
  }

  // 3) 完全非 JSON：若文本不含任何 JSON 特征，作为纯剧情文本保留（避免把脏数据塞进正文造成乱码）
  if (raw.indexOf('{') < 0 && raw.indexOf('"') < 0) {
    return { narrative: raw, options: [], blocks: [{ type: 'narrative', content: raw }], sceneContext: null, eventItems: [], sceneTime: '', malformed: false };
  }

  // 4) 解析失败：返回空，由 generateOneHeartRound 提示重试（不再把原始 JSON 塞进正文造成乱码）
  return { narrative: '', options: [], blocks: [], sceneContext: null, eventItems: [], sceneTime: '', malformed: true };
}

/**
 * 校验 1v1 剧情一致性
 * @param {Object} parsed - parseOneHeartNarrative 的返回值
 * @param {Object} GS - 当前游戏状态
 * @returns {string|null} - 有矛盾时返回 correction 描述，否则 null
 */
export function validateOneHeartNarrative(parsed, GS) {
  var corrections = [];

  var oldCtx = GS.oneHeartSceneContext || { location: '', present: [] };
  // 判断是否为新的一天/生日/节日（这些场景允许重新开始）
  var _pct = GS.pendingChoiceText || '';
  var isNewDay = GS.justEnteredNewDay || _pct.indexOf('新的一天') >= 0 || _pct.indexOf('生日') >= 0 || _pct.indexOf('今天是') >= 0;

  // 检测是否为合法场景切换（玩家选择了涉及移动的选项）
  var _isSceneChange = _pct && (
    _pct.indexOf('去') >= 0 || _pct.indexOf('离开') >= 0 || _pct.indexOf('前往') >= 0 ||
    _pct.indexOf('走到') >= 0 || _pct.indexOf('回到') >= 0 || _pct.indexOf('送') >= 0 ||
    _pct.indexOf('搬') >= 0 || _pct.indexOf('出发') >= 0
  );

  // 3. 时段合法性校验（AI 在 sceneTime 声明时段；[F] 时间概念已移除，非法值直接清空，不再回退到代码时段）
  var _validTimes = ['凌晨', '清晨', '上午', '下午', '傍晚', '深夜'];
  if (parsed.sceneTime) {
    if (_validTimes.indexOf(parsed.sceneTime) < 0) {
      // [F] 非法时段直接清空，不再映射为具体时段
      parsed.sceneTime = '';
    }
  }

  // 4. 选项有效性校验（代码硬修正，不返回 correction 重生成）
  if (parsed.options && Array.isArray(parsed.options)) {
    // 选项数量硬修正：少于 2 个补兜底，多于 4 个截断尾部
    if (parsed.options.length > 0 && parsed.options.length < 2) {
      parsed.options = parsed.options.concat(_oneHeartFallbackOptions(parsed.options.length));
    }
    if (parsed.options.length > 4) {
      parsed.options = parsed.options.slice(0, 4);
    }
    // affDelta 范围硬修正（-5 ~ 5）
    for (var oi = 0; oi < parsed.options.length; oi++) {
      var _opt = parsed.options[oi];
      if (_opt && typeof _opt.affDelta === 'number') {
        if (_opt.affDelta < -5) _opt.affDelta = -5;
        if (_opt.affDelta > 5) _opt.affDelta = 5;
      }
    }
  }

  // [计划B问题4] 剧情重复检测：新剧情与最近3天摘要做 Jaccard 相似度，>40% 返回 correction
  if (!isNewDay && parsed.blocks && GS.oneHeartDailySummaries && GS.oneHeartDailySummaries.length > 0) {
    var _narrText = '';
    for (var _bi = 0; _bi < parsed.blocks.length; _bi++) {
      if (parsed.blocks[_bi] && parsed.blocks[_bi].type === 'narrative' && parsed.blocks[_bi].content) {
        _narrText += parsed.blocks[_bi].content;
      }
    }
    if (_narrText.length > 50) {
      var _recent3 = GS.oneHeartDailySummaries.slice(-3);
      for (var _si = 0; _si < _recent3.length; _si++) {
        var _simSummary = _recent3[_si];
        var _simParsed = null;
        try { _simParsed = JSON.parse(_simSummary); } catch (e) {}
        var _simText = _simParsed ? (_simParsed.events || []).join('') + (_simParsed.dialogues || []).join('') : _simSummary;
        var _jaccard = _oneHeartJaccard(_narrText, _simText);
        if (_jaccard > 0.4) {
          corrections.push('剧情重复检测：本段剧情与近期记忆的关键词重叠度达' + Math.round(_jaccard * 100) + '%，请换一个切入角度或新的事件展开');
          break;
        }
      }
    }
  }

  // [事件角色校验] eventItems 中若含"他/她"但没有明确人名，返回 correction
  if (parsed.eventItems && parsed.eventItems.length > 0) {
    var _memberName = (GS.oneHeartMember && MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; })) ? MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }).name : '';
    var _rivalName = (GS.oneHeartRival && GS.oneHeartRival.name) ? GS.oneHeartRival.name : '';
    var _relName = (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.name) ? GS.oneHeartRelationCharacter.name : '';
    for (var _ei = 0; _ei < parsed.eventItems.length; _ei++) {
      var _item = parsed.eventItems[_ei];
      if (/[他她]/.test(_item)) {
        var _hasName = (_memberName && _item.indexOf(_memberName) >= 0) ||
                       (_rivalName && _item.indexOf(_rivalName) >= 0) ||
                       (_relName && _item.indexOf(_relName) >= 0) ||
                       _item.indexOf('女主') >= 0;
        if (!_hasName) {
          corrections.push('eventItems[' + _ei + '] 使用了代词"他/她"但没有明确人名，必须写明具体角色名字（如"' + _memberName + '"或"女主"）');
        }
      }
    }
  }

  // [计划·项6/8] 1v1 确定性代码门控：初识期男主过度热情 + 妹妹线称呼/欧巴硬兜底
  // 命中即返回 correction，由 generateOneHeartRound 触发一次重写（最多重试不污染 userMsg）。
  if (GS.gameMode === 'oneHeart') {
    var _paceText = (parsed.narrative || '');
    var _optTextAll = '';
    if (parsed.options && parsed.options.length > 0) {
      for (var _pi = 0; _pi < parsed.options.length; _pi++) {
        if (parsed.options[_pi] && parsed.options[_pi].text) _optTextAll += parsed.options[_pi].text + '\n';
      }
    }
    var _gateText = _paceText + '\n' + _optTextAll;
    var _gateCorr = checkOneHeartPacing(_gateText).concat(checkOneHeartAddressing(_gateText));
    for (var _gi = 0; _gi < _gateCorr.length; _gi++) corrections.push(_gateCorr[_gi]);
  }

  return corrections.length > 0 ? corrections.join(' | ') : null;
}

// 1v1 选项兜底生成（代码硬修正用，避免整段重生成）
function _oneHeartFallbackOptions(needCount) {
  var member = (GS && GS.oneHeartMember && typeof MEMBERS !== 'undefined') ? MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; }) : null;
  var name = member ? member.name : '他';
  var pool = [
    { text: '静静地看着他，等他先开口', affDelta: 1, affReason: '安静的陪伴让对方放松' },
    { text: '主动找话题，想多了解他一点', affDelta: 2, affReason: '主动靠近' },
    { text: '装作不经意地移开视线', affDelta: 0, affReason: '克制自己的在意' },
    { text: '轻声问他今天累不累', affDelta: 2, affReason: '关心对方' },
    { text: '低头整理衣角，掩饰心跳', affDelta: 1, affReason: '害羞的反应让他心动' }
  ];
  var res = [];
  for (var i = 0; i < needCount && i < pool.length; i++) res.push(pool[i]);
  return res;
}

// [计划B问题4] Jaccard 相似度辅助函数（1v1 剧情重复检测）
var _OH_STOP_WORDS = { '他说': 1, '她说': 1, '看着': 1, '然后': 1, '一个': 1, '什么': 1, '这个': 1, '那个': 1, '自己': 1, '已经': 1, '可以': 1, '没有': 1, '他们': 1, '但是': 1, '因为': 1, '所以': 1, '如果': 1, '现在': 1, '这里': 1, '那里': 1 };
function _oneHeartJaccard(a, b) {
  var _wordsA = (a || '').match(/[\u4e00-\u9fa5]{2,}/g) || [];
  var _wordsB = (b || '').match(/[\u4e00-\u9fa5]{2,}/g) || [];
  // 过滤停用词
  _wordsA = _wordsA.filter(function(w) { return !_OH_STOP_WORDS[w]; });
  _wordsB = _wordsB.filter(function(w) { return !_OH_STOP_WORDS[w]; });
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