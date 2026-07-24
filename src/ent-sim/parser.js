// ============================================================
// 娱乐圈模拟器（entSim）· 响应解析
// AI 以 JSON 返回 { narrative, options, entSimExtras }；兜底回退到 markdown 解析。
// ============================================================
import { safeParseJson, parseNarrative } from '../parser.js';

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

// 解析整段 AI 返回：优先 JSON，否则用叙事/截断正则兜底
export function parseEntSimResponse(rawText) {
  if (!rawText) return { narrative: '', options: [], extras: {} };
  var json = safeParseJson(rawText);
  if (json && typeof json === 'object') {
    if (typeof json.narrative === 'string' || Array.isArray(json.options) || json.entSimExtras) {
      return {
        narrative: typeof json.narrative === 'string' ? json.narrative : '',
        options: Array.isArray(json.options) ? json.options : [],
        extras: json.entSimExtras && typeof json.entSimExtras === 'object' ? json.entSimExtras : {}
      };
    }
  }
  // JSON 截断兜底：从原始文本正则提取关键字段
  var fb = regexEntSimFallback(rawText);
  if (fb.narrative || fb.options.length) {
    return { narrative: fb.narrative, options: fb.options, extras: fb.extras };
  }
  // 兜底：作为 markdown 叙事处理
  var parsed = parseNarrative(rawText);
  return { narrative: parsed.narrative || '', options: parsed.options || [], extras: {} };
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
  return out;
}
