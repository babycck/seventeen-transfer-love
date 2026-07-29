// ============================================================
// 娱乐圈模拟器（entSim）· 响应解析
// AI 以 JSON 返回 { narrative, options, entSimExtras }；兜底回退到 markdown 解析。
// ============================================================
import { safeParseJson, parseNarrative } from '../parser.js';
export { safeParseJson };

// 截断兜底：从原始文本正则/括号匹配提取关键字段（AI 返回 JSON 被 max_tokens 截断时仍可部分恢复）
function extractBalancedObj(raw, key) {
  var i = raw.indexOf('"' + key + '"');
  if (i < 0) return null;
  var colon = raw.indexOf(':', i);
  var j = raw.indexOf('{', colon);
  if (j < 0) return null;
  var depth = 0, k = j;
  for (; k < raw.length; k++) {
    var ch = raw[k];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  var s = raw.slice(j, k);
  try { return JSON.parse(s); } catch (e) { return null; }
}

function regexEntSimFallback(rawText) {
  var res = { narrative: '', options: [], extras: {} };
  var om = rawText.match(/"options"\s*:\s*\[([\s\S]*?)\]\s*[,}\]]/);
  if (om) {
    var arr = om[1].match(/"((?:[^"\\]|\\.)*)"/g);
    if (arr) res.options = arr.map(function(s) {
      return s.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n');
    });
  }
  var nm = rawText.match(/"narrative"\s*:\s*"([\s\S]*?)"\s*,\s*"/);
  if (nm) res.narrative = nm[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  var am = rawText.match(/"affectionDelta"\s*:\s*(-?\d+)/); if (am) res.extras.affectionDelta = parseInt(am[1], 10);
  var rb = extractBalancedObj(rawText, 'romanceBeat'); if (rb && typeof rb === 'object') res.extras.romanceBeat = rb;
  var ev = extractBalancedObj(rawText, 'exposureEvent'); if (ev && typeof ev === 'object') res.extras.exposureEvent = ev;
  var ne = extractBalancedObj(rawText, 'npcEncounter'); if (ne && typeof ne === 'object') res.extras.npcEncounter = ne;
  var eh = rawText.match(/"endingsHint"\s*:\s*"([^"]*)"/); if (eh) res.extras.endingsHint = eh[1];
  return res;
}

// 给 parseEntSimResponse 返回值补 blocks 字段（validator.js 检查 parsed.blocks.length）
function _addBlocks(result) {
  if (!result.blocks || !result.blocks.length) {
    result.blocks = result.narrative ? [{ type: 'narrative', content: result.narrative }] : [];
  }
}

// 解析整段 AI 返回：优先 JSON，否则用叙事/截断正则兜底
// 返回值始终包含 blocks 字段（与 validator.js 期望的 {narrative,options,blocks,extras} 对齐）
export function parseEntSimResponse(rawText) {
  var result = { narrative: '', options: [], extras: {}, blocks: [] };
  if (!rawText) return result;
  var json = safeParseJson(rawText);
  if (json && typeof json === 'object') {
    // 标准格式：{narrative, options, entSimExtras}
    if (typeof json.narrative === 'string' || Array.isArray(json.options) || json.entSimExtras) {
      result = {
        narrative: typeof json.narrative === 'string' ? json.narrative : '',
        options: Array.isArray(json.options) ? json.options : [],
        extras: json.entSimExtras && typeof json.entSimExtras === 'object' ? json.entSimExtras : {},
        blocks: []
      };
      _addBlocks(result);
      return result;
    }
    // 兜底：AI 偶尔返回 {blocks:[{type:"narrative",content:"..."}]} 格式
    if (Array.isArray(json.blocks) && json.blocks.length) {
      var narrative = '';
      var options = [];
      var extras = {};
      for (var i = 0; i < json.blocks.length; i++) {
        var blk = json.blocks[i];
        if (!blk) continue;
        if (blk.type === 'narrative' && typeof blk.content === 'string') narrative += (narrative ? '\n\n' : '') + blk.content;
        if (blk.type === 'options' && Array.isArray(blk.options)) options = options.concat(blk.options);
        if (blk.type === 'options' && Array.isArray(blk.content)) options = options.concat(blk.content);
        if (blk.type === 'extras' && typeof blk.content === 'object') extras = blk.content;
      }
      if (!options.length && narrative) {
        // 尝试从原始文本提取 options
        var om = rawText.match(/"options"\s*:\s*\[([\s\S]*?)\]\s*[,}\]]/);
        if (om) {
          var arr = om[1].match(/"((?:[^"\\]|\\.)*)"/g);
          if (arr) options = arr.map(function(s) { return s.replace(/^"|"$/g,'').replace(/\\"/g,'"').replace(/\\n/g,'\n'); });
        }
        // 仍为空：生成通用 fallback，避免 validator 报 error 浪费重试 token
        if (!options.length) options = ['继续', '换个话题', '自由行动'];
      }
      if (narrative || options.length) {
        result = { narrative: narrative, options: options, extras: extras, blocks: [] };
        _addBlocks(result);
        return result;
      }
    }
  }
  // blocks 正则兜底：safeParseJson 解析失败时（如 content 中含未转义引号/换行），直接从原始文本提取
  if (!json && rawText.indexOf('"blocks"') >= 0) {
    var bn = extractBlocksNarrative(rawText);
    if (bn) { result = { narrative: bn, options: ['继续', '换个话题', '自由行动'], extras: {}, blocks: [] }; _addBlocks(result); return result; }
  }
  // JSON 截断兜底：从原始文本正则提取关键字段
  var fb = regexEntSimFallback(rawText);
  if (fb.narrative || fb.options.length) {
    result = { narrative: fb.narrative, options: fb.options, extras: fb.extras, blocks: [] };
    _addBlocks(result);
    return result;
  }
  // 兜底：作为 markdown 叙事处理
  var parsed = parseNarrative(rawText);
  result = { narrative: parsed.narrative || '', options: parsed.options || [], extras: {}, blocks: [] };
  _addBlocks(result);
  return result;
}

// 当 safeParseJson 失败时，从原始文本正则提取 blocks 中的 narrative content
function extractBlocksNarrative(rawText) {
  var narrative = '';
  // 匹配 "type": "narrative" 后紧跟的 "content": "..." 字段
  // 使用字符串搜索而非正则，更稳健地处理超长中文内容
  var searchFrom = 0;
  while (true) {
    var typeIdx = rawText.indexOf('"type"', searchFrom);
    if (typeIdx < 0) break;
    // 找到 "type" 后确认值为 "narrative"
    var typeColon = rawText.indexOf(':', typeIdx);
    var typeVal = rawText.slice(typeColon + 1, typeColon + 30).replace(/[\s"]/g, '');
    if (typeVal.indexOf('narrative') < 0) { searchFrom = typeIdx + 1; continue; }
    // 找到后续的 "content" 字段
    var contentIdx = rawText.indexOf('"content"', typeIdx);
    if (contentIdx < 0) break;
    var contentColon = rawText.indexOf(':', contentIdx);
    if (contentColon < 0) break;
    // 跳过冒号后的空白和第一个引号
    var start = contentColon + 1;
    while (start < rawText.length && (rawText[start] === ' ' || rawText[start] === '\t' || rawText[start] === '\n' || rawText[start] === '\r')) start++;
    if (start >= rawText.length || rawText[start] !== '"') { searchFrom = contentIdx + 1; continue; }
    // 提取 content 字符串内容（处理转义）
    var content = '';
    var pos = start + 1; // 跳过开引号
    while (pos < rawText.length) {
      var ch = rawText[pos];
      if (ch === '\\') {
        pos++;
        if (pos < rawText.length) {
          var next = rawText[pos];
          if (next === 'n') content += '\n';
          else if (next === 't') content += '\t';
          else if (next === 'r') content += '\r';
          else content += next; // 包括 \\ → \, \" → ", 等
          pos++;
        }
      } else if (ch === '"') {
        pos++;
        break; // 到达 content 字符串结束
      } else {
        content += ch;
        pos++;
      }
    }
    if (content.length > 0) narrative += (narrative ? '\n\n' : '') + content;
    searchFrom = pos;
  }
  return narrative;
}

// 规范化 entSimExtras 字段（防脏数据）
export function parseEntSimExtras(extras) {
  if (!extras || typeof extras !== 'object') return {};
  function num(v) { return typeof v === 'number' ? v : 0; }
  var out = {};
  if (extras.romanceBeat) {
    out.romanceBeat = {
      depthDelta: num(extras.romanceBeat.depthDelta),
      affectionDelta: num(extras.romanceBeat.affectionDelta),
      emotion: typeof extras.romanceBeat.emotion === 'string' ? extras.romanceBeat.emotion : '',
      note: typeof extras.romanceBeat.note === 'string' ? extras.romanceBeat.note : '',
      event: typeof extras.romanceBeat.event === 'string' ? extras.romanceBeat.event : ''
    };
  }
  if (typeof extras.affectionDelta === 'number') out.affectionDelta = extras.affectionDelta;
  if (extras.npcEncounter && extras.npcEncounter.type) {
    out.npcEncounter = {
      type: extras.npcEncounter.type,
      name: typeof extras.npcEncounter.name === 'string' ? extras.npcEncounter.name : '',
      intimacyDelta: num(extras.npcEncounter.intimacyDelta),
      stance: typeof extras.npcEncounter.stance === 'string' ? extras.npcEncounter.stance : '',
      event: typeof extras.npcEncounter.event === 'string' ? extras.npcEncounter.event : '',
      exposure: num(extras.npcEncounter.exposure)
    };
  }
  if (extras.exposureEvent) {
    out.exposureEvent = {
      magnitude: num(extras.exposureEvent.magnitude),
      note: typeof extras.exposureEvent.note === 'string' ? extras.exposureEvent.note : ''
    };
  }
  if (typeof extras.endingsHint === 'string') out.endingsHint = extras.endingsHint;
  if (extras.brother) {
    out.brother = {
      stance: typeof extras.brother.stance === 'string' ? extras.brother.stance : '',
      supportDelta: num(extras.brother.supportDelta),
      note: typeof extras.brother.note === 'string' ? extras.brother.note : ''
    };
  }
  if (extras.secret) {
    out.secret = {
      item: typeof extras.secret.item === 'string' ? extras.secret.item : '',
      foundByRival: !!extras.secret.foundByRival
    };
  }
  if (Array.isArray(extras.appointments)) {
    out.appointments = extras.appointments.filter(function(a) {
      return a && a.place && a.summary;
    }).map(function(a) {
      return {
        with: a.with || 'maleLead',
        place: typeof a.place === 'string' ? a.place : '',
        timeHint: typeof a.timeHint === 'string' ? a.timeHint : '',
        summary: typeof a.summary === 'string' ? a.summary : ''
      };
    });
  }
  return out;
}
