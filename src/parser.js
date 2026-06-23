import {
  MEMBERS, PHASES, PHASE_LABELS, HEART_NOTE_TEMPLATES,
  GS, saveGame, showToast
} from './core.js';
import { updateAffection, addAffectionLog } from './affection.js';
import { sanitizeScene } from './schema.js';

// ==================== 叙事解析器（JSON 输入版） ====================
// AI 现在只输出 JSON，本地用 schema 做兜底 + 字段拆分。
// 旧版 emoji 状态机解析已废弃（用户已确认重置游戏，不兼容旧 markdown 输出）。

function repairJson(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  // 尝试直接解析
  try { JSON.parse(raw); return raw; } catch (e) {}
  // 常见修复：去掉 JSON 外的前后多余字符
  var s = raw.trim();
  var firstBrace = s.indexOf('{');
  var lastBrace = s.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  try { JSON.parse(s); return s; } catch (e) {}
  // 修复对象和数组末尾的多余逗号
  s = s.replace(/,\s*([}\]])/g, '$1');
  try { JSON.parse(s); return s; } catch (e) {}
  // 修复字符串中未转义的换行符（AI 经常在 JSON 字符串里加换行）
  var inString = false;
  var escape = false;
  var result = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\') { result += ch; escape = true; continue; }
    if (ch === '"' && !escape) { inString = !inString; result += ch; continue; }
    if (inString && (ch === '\n' || ch === '\r')) {
      result += '\\n';
      continue;
    }
    result += ch;
  }
  return result;
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
    console.error('[parseNarrative] JSON 解析失败:', e, '\n原文片段:', rawText.slice(0, 400));
    return empty;
  }
  var s = sanitizeScene(obj);

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
    if (notes && GS.heartNotes[targetId].length < notes.length) {
      var nextNote = notes[GS.heartNotes[targetId].length];
      GS.heartNotes[targetId].push({
        text: nextNote,
        unlockedAt: { day: GS.day, mission: GS.secretMission.title }
      });
    }
    var targetMember = MEMBERS.find(function(m) { return m.id === targetId; });
    if (targetMember) {
      if (typeof showToast === 'function') {
        showToast('✅ 秘密任务完成！' + targetMember.name + ' 好感度 +3 · 心动笔记已解锁');
      } else if (typeof alert === 'function') {
        showToast('✅ 秘密任务完成！' + targetMember.name + ' 好感度 +3 · 心动笔记已解锁');
      }
    }
  } else {
    if (typeof showToast === 'function') {
      showToast('✅ 秘密任务完成！');
    } else if (typeof alert === 'function') {
      showToast('✅ 秘密任务完成！');
    }
  }

  if (GS.secretMissionCompletedCount >= 3 && !GS.secretMissionUnlockFinal) {
    GS.secretMissionUnlockFinal = true;
  }

  GS.secretMission = null;
  saveGame();
}