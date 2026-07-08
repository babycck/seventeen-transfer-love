import { MEMBERS } from './core.js';

// ==================== 提取待兑现约定 ====================
// 兼容两种摘要格式：
// 1) 旧式文本：含「待兑现约定」段落，逐行以 -/•/数字 开头。
// 2) 新式 JSON：{"promises":["约定1",...]}，直接取数组。
export function extractPendingPromises(summaryText) {
  if (!summaryText) return [];
  // 先尝试 JSON 解析（compressTodayToSummary 返回的是 JSON）
  if (typeof summaryText === 'string' && summaryText.trim().indexOf('{') >= 0) {
    try {
      var _parsed = JSON.parse(summaryText);
      if (_parsed && _parsed.promises && _parsed.promises.length > 0) {
        return _parsed.promises.map(function(p) { return String(p).trim(); }).filter(function(p) { return p.length > 0; });
      }
    } catch (e) {
      var _m = summaryText.match(/\{[\s\S]*\}/);
      if (_m) {
        try {
          var _p2 = JSON.parse(_m[0]);
          if (_p2 && _p2.promises && _p2.promises.length > 0) {
            return _p2.promises.map(function(p) { return String(p).trim(); }).filter(function(p) { return p.length > 0; });
          }
        } catch (e2) {}
      }
    }
  }
  // 回退到旧式文本解析
  var promises = [];
  var lines = summaryText.split('\n');
  var inPromises = false;
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.indexOf('待兑现约定') >= 0) {
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

export function extractRevealedInfo(summaryText) {
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

// ==================== 抽取结构化事实记忆（A） ====================
// 解析摘要的 revealedInfo[]，按关键词分类（偏好/禁忌/过敏原），并按是否含成员名归到对应 memberId 或 heroine。
// 返回 { heroine:{preferences:[],taboos:[],allergens:[]}, '<id>':{...} }，可直接 merge 进 GS.memoryFacts。
export function extractMemoryFacts(summaryJson) {
  var result = {};
  if (!summaryJson) return result;
  var parsed = null;
  if (typeof summaryJson === 'string') {
    try { parsed = JSON.parse(summaryJson); } catch (e) {
      var _m = summaryJson.match(/\{[\s\S]*\}/);
      if (_m) { try { parsed = JSON.parse(_m[0]); } catch (e2) {} }
    }
  } else {
    parsed = summaryJson;
  }
  if (!parsed || !parsed.revealedInfo) return result;
  var items = parsed.revealedInfo;
  for (var i = 0; i < items.length; i++) {
    var t = String(items[i] || '');
    if (!t) continue;
    var cat = 'taboos';
    if (/过敏|过敏原|过敏源/.test(t)) cat = 'allergens';
    else if (/喜欢|爱吃|偏好|中意|爱|好这口/.test(t)) cat = 'preferences';
    else if (/忌|不吃|讨厌|禁忌|不能|反感|避/.test(t)) cat = 'taboos';
    // 归属：含成员名 → 该成员；否则默认 heroine
    var owner = 'heroine';
    for (var mi = 0; mi < MEMBERS.length; mi++) {
      if (t.indexOf(MEMBERS[mi].name) >= 0 || (MEMBERS[mi].stageName && t.indexOf(MEMBERS[mi].stageName) >= 0)) {
        owner = MEMBERS[mi].id;
        break;
      }
    }
    if (!result[owner]) result[owner] = { preferences: [], taboos: [], allergens: [] };
    if (result[owner][cat].indexOf(t) < 0) result[owner][cat].push(t);
  }
  return result;
}
