// ============================================================
// 记忆系统：每天换天时把当日剧情压缩为关键词标签 + 关键事件累积
// 关键事件：影响恋爱深度/曝光/哥哥态度/情敌状态的事件，全部累积不过期
// AI 提取（要准，慢不怕），失败则兜底为一条时间戳摘要。
// v2 强化：openLoops追踪 + 玩家选择日志 + 人物关系快照 + 3-5天叙事片段 + 多备份
// ============================================================
import { GS, saveGame } from '../state.js';
import { generateWithRetry } from '../ai-generator.js';

// ── 记录玩家选择（每轮选项选择后调用） ──
// choiceText: 玩家选的选项文字，narrative: 对应后果剧情前200字
export function logPlayerChoice(choiceText, narrative) {
  var E = GS.entSim;
  if (!E) return;
  var day = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  E.memory.choiceLog = E.memory.choiceLog || [];
  E.memory.choiceLog.push({
    day: day,
    round: E.cycle.roundTotal || 0,
    choice: choiceText ? choiceText.slice(0, 120) : '',
    narrative: narrative ? narrative.slice(0, 200) : ''
  });
  // 保留最近30条
  if (E.memory.choiceLog.length > 30) E.memory.choiceLog = E.memory.choiceLog.slice(-30);
}

// ── 记录人物关系快照（每3天自动生成一次） ──
export function snapshotRelationships() {
  var E = GS.entSim;
  if (!E) return;
  var day = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  var snap = {
    day: day,
    affection: E.affection || 0,
    stage: GS.oneHeartRomanceStage || 0,
    brotherSupport: (E.brother && E.brother.support) || 0,
    brotherStance: (E.brother && E.brother.stance) || '',
    rivalIntimacy: 0,
    scandalHeat: (E.misc && E.misc.scandalHeat) || 0,
    jealousyLevel: E._jealousLevel || 0
  };
  var rivalNode = E.npcNetwork && E.npcNetwork.nodes && E.npcNetwork.nodes['npc_suitor'];
  if (rivalNode && typeof rivalNode.intimacy === 'number') snap.rivalIntimacy = rivalNode.intimacy;
  E.memory.relSnapshots = E.memory.relSnapshots || [];
  E.memory.relSnapshots.push(snap);
  if (E.memory.relSnapshots.length > 20) E.memory.relSnapshots = E.memory.relSnapshots.slice(-20);
}

// ── 添加/更新 openLoop（未完成剧情线） ──
// loop: {id, type: 'confession'|'scandal'|'brother_test'|'rival'|'other', text, round}
export function addOpenLoop(loop) {
  var E = GS.entSim;
  if (!E) return;
  var openLoops = E.memory.openLoops || E.openLoops || [];
  loop.round = loop.round || (E.cycle && E.cycle.roundTotal) || 0;
  loop.resolved = false;
  openLoops.push(loop);
  if (openLoops.length > 15) openLoops = openLoops.slice(-15);
  // 同步到两个位置（兼容 prompts.js 的 E.openLoops 读取路径）
  E.memory.openLoops = openLoops;
  E.openLoops = openLoops;
  saveGame();
}

// ── 标记 openLoop 为已解决 ──
export function resolveOpenLoop(loopId) {
  var E = GS.entSim;
  if (!E) return;
  var openLoops = E.memory.openLoops || E.openLoops || [];
  for (var i = 0; i < openLoops.length; i++) {
    if (openLoops[i].id === loopId) { openLoops[i].resolved = true; break; }
  }
  E.memory.openLoops = openLoops;
  E.openLoops = openLoops;
  saveGame();
}

// ── 获取未解决的 openLoops（供 prompts.js 注入） ──
export function getPendingLoops() {
  var E = GS.entSim;
  if (!E) return [];
  var openLoops = E.memory.openLoops || E.openLoops || [];
  return openLoops.filter(function(l) { return !l.resolved; });
}

// ── 存储3-5天叙事片段（不压缩，保留原文） ──
export function archiveRecentNarratives(narrativeText) {
  var E = GS.entSim;
  if (!E) return;
  var day = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  E.memory.recentNarratives = E.memory.recentNarratives || [];
  // 追加当日叙事片段
  var existing = E.memory.recentNarratives.find(function(n) { return n.day === day; });
  if (existing) {
    existing.text += '\n' + (narrativeText || '');
    existing.text = existing.text.slice(-3000); // 单天最多3000字
  } else {
    E.memory.recentNarratives.push({ day: day, text: (narrativeText || '').slice(0, 3000) });
  }
  // 只保留近5天
  if (E.memory.recentNarratives.length > 5) {
    E.memory.recentNarratives = E.memory.recentNarratives.slice(-5);
  }
}

// ── 多备份：内存+localStorage双写（防浏览器崩溃丢数据） ──
var BACKUP_KEY = 'svt_entsim_memory_backup';
export function backupMemoryToStorage() {
  var E = GS.entSim;
  if (!E || !E.memory) return;
  try {
    var backup = {
      dailySummaries: E.memory.dailySummaries.slice(-30),
      eventLog: E.memory.eventLog.slice(-50),
      milestones: E.memory.milestones.slice(-10),
      choiceLog: (E.memory.choiceLog || []).slice(-20),
      relSnapshots: (E.memory.relSnapshots || []).slice(-10),
      openLoops: E.memory.openLoops || E.openLoops || [],
      timestamp: Date.now()
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch(e) { /* localStorage 满了则静默失败 */ }
}

// ── 恢复内存备份 ──
export function restoreMemoryFromStorage() {
  var E = GS.entSim;
  if (!E || !E.memory) return;
  try {
    var raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return;
    var backup = JSON.parse(raw);
    if (Array.isArray(backup.dailySummaries)) E.memory.dailySummaries = backup.dailySummaries;
    if (Array.isArray(backup.eventLog)) E.memory.eventLog = backup.eventLog;
    if (Array.isArray(backup.milestones)) E.memory.milestones = backup.milestones;
    if (Array.isArray(backup.choiceLog)) E.memory.choiceLog = backup.choiceLog;
    if (Array.isArray(backup.relSnapshots)) E.memory.relSnapshots = backup.relSnapshots;
    if (Array.isArray(backup.openLoops)) {
      E.memory.openLoops = backup.openLoops;
      E.openLoops = backup.openLoops;
    }
  } catch(e) { /* 备份损坏则跳过 */ }
}

// 把当日缓冲压缩为 { keywords:[..], events:[..] }
export function compressEntSimMemory() {
  var E = GS.entSim;
  if (!E) return Promise.resolve();
  var buf = (GS._entSimNarrativeBuffer || '').slice(-4000);
  var day = E.cycle._gameDayCount || E.cycle.dayCount;
  // 兜底：无内容时跳过
  if (!buf || buf.trim().length < 10) {
    E.memory.lastCompressDay = day;
    saveGame();
    return Promise.resolve();
  }
  // ── 层8：记忆压缩关键词清洗（发送前清洗，防越级事件存入记忆）──
  buf = buf.replace(/写歌|写词|专属暗号|秘密约定|雾中偶遇|浓雾/g, '练习日偶遇');
  var prompt = [
    '你是记忆压缩器。把下面这段娱乐圈地下恋剧情压缩成结构化摘要。',
    '只输出 JSON，不要任何解释。格式：',
    '{"keywords":["标签1","标签2"],"events":["影响恋爱/曝光/哥哥/情敌的关键事件描述"]}',
    'keywords 取 3-5 个名词短语（如「打歌待机室」「男主送水」「情敌试探」「哥哥起疑」）。',
    'events 只列真正改变关系/风险的关键事件，最多 3 条，没有则空数组。',
    '【重要】严禁将女主通过手机私下发送的内容（泡泡/私聊/短信/通话）提取为关键事件或关键词。女主私下发消息≠其他角色知情，这些内容不应进入全局记忆。',
    '',
    '【剧情】',
    buf
  ].join('\n');
  return generateWithRetry('你是记忆压缩器，只输出 JSON。', prompt, { temperature: 0.3, maxTokens: 600, skipValidate: true })
    .then(function(res) {
      var raw = (res && res.raw) ? res.raw : '';
      var obj = safeJson(raw);
      var summary = {
        day: day,
        keywords: (obj && obj.keywords) || ['（当日剧情）'],
        events: (obj && obj.events) || []
      };
      E.memory.dailySummaries.push(summary);
      // 只保留近 30 天摘要（注入时取近 7 天）
      if (E.memory.dailySummaries.length > 30) {
        E.memory.dailySummaries = E.memory.dailySummaries.slice(-30);
      }
      (summary.events || []).forEach(function(ev) {
        E.memory.eventLog.push({ day: day, text: ev });
      });
      E.memory.lastCompressDay = day;
      // ── 层7：每20轮生成阶段摘要（T2）──
      if (day % 20 === 0 && E.memory.dailySummaries.length >= 10) {
        var phaseDays = E.memory.dailySummaries.slice(-20);
        var allKw = [];
        phaseDays.forEach(function(d) { allKw = allKw.concat(d.keywords || []); });
        var phaseText = '第' + (day - 19) + '-' + day + '天关键词：' + allKw.slice(0, 12).join('、');
        E.memory.phaseSummaries = E.memory.phaseSummaries || [];
        E.memory.phaseSummaries.push(phaseText);
        if (E.memory.phaseSummaries.length > 10) E.memory.phaseSummaries = E.memory.phaseSummaries.slice(-10);
      }
      // 压缩后清空缓冲，避免重复压缩
      GS._entSimNarrativeBuffer = '';
      backupMemoryToStorage(); // 多备份：每次压缩后双写localStorage
      saveGame();
    })
    .catch(function() {
      // 兜底：用当天 buffer 前 80 字作为关键词（至少保留剧情片段，不再输出空标签）
      var _fbKw = buf.slice(0, 80).replace(/\n/g, ' ').trim();
      if (_fbKw.length < 5) _fbKw = '（当日剧情）';
      E.memory.dailySummaries.push({ day: day, keywords: [_fbKw], events: [] });
      E.memory.lastCompressDay = day;
      GS._entSimNarrativeBuffer = '';
      backupMemoryToStorage();
      saveGame();
    });
}

// ── 层7+10：三级记忆上下文隔离（T0里程碑/T1近期20轮/T2阶段摘要 + choiceLog + openLoops + 关系快照）──
export function buildMemorySnapshot() {
  var E = GS.entSim;
  if (!E || !E.memory) return '';
  var today = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  // T0: 核心里程碑（重要节点，不设上限但不取超过8条）
  var t0 = E.memory.milestones || [];
  // T1: 最近20轮完整摘要 + careerHistory最近10天
  var days = E.memory.dailySummaries.slice(-20);
  var kw = [];
  days.forEach(function(d) { (d.keywords || []).forEach(function(k) { if (kw.indexOf(k) < 0) kw.push(k); }); });
  var recent = days.map(function(d) { return 'Day' + d.day + '：' + (d.keywords || []).join('、'); });
  var events = E.memory.eventLog.slice(-12).map(function(e) { return 'Day' + e.day + ' ' + e.text; });
  var histEvents = [];
  var seenTexts = {};
  (E.careerHistory || []).slice().reverse().forEach(function(h) {
    var d = h.day != null ? h.day : h.round;
    if (d >= today - 10 && h.text && !seenTexts[h.text]) {
      seenTexts[h.text] = true;
      var tag = ({ popularity:'人气', romance:'恋爱', brother:'哥哥', exposure:'曝光', cover:'掩护', npc:'关系', event:'事件' })[h.type] || h.type;
      histEvents.push('Day' + d + ' ' + tag + '：' + h.text);
    }
  });
  // T2: 阶段摘要（最近3段）
  var t2 = E.memory.phaseSummaries || [];
  var parts = [];
  parts.push('【风格参考·近期】\n' + (recent.length ? recent.join('\n') : '（暂无）'));
  parts.push('【阶段背景】\n' + (t2.length ? t2.slice(-3).join('\n') : '（暂无）'));
  parts.push('【已发生事件·防脑补】\n' + (histEvents.length ? histEvents.slice(0, 20).join('\n') : '（暂无）'));
  if (t0.length) parts.push('【重要里程碑】\n' + t0.slice(-5).map(function(m) { return 'Day' + (m.day || '?') + ' ' + (m.text || ''); }).join('\n'));
  if (kw.length) parts.push('【近期关键词】' + kw.join('、'));

  // ── v2 强化：玩家选择日志（最近10条） ──
  var choiceLog = E.memory.choiceLog || [];
  if (choiceLog.length) {
    var recentChoices = choiceLog.slice(-10).map(function(c) { return 'Day' + c.day + ' 选：' + c.choice; });
    parts.push('【玩家近期选择】\n' + recentChoices.join('\n'));
  }

  // ── v2 强化：未解决剧情线 ──
  var pendingLoops = (E.memory.openLoops || E.openLoops || []).filter(function(l) { return !l.resolved; });
  if (pendingLoops.length) {
    parts.push('【未解决剧情线】\n' + pendingLoops.map(function(l) { return '[' + (l.type || 'loop') + '] ' + (l.text || ''); }).join('\n'));
  }

  // ── v2 强化：人物关系快照（最近3次） ──
  var relSnaps = E.memory.relSnapshots || [];
  if (relSnaps.length) {
    var recentSnaps = relSnaps.slice(-3).map(function(s) {
      return 'Day' + s.day + ' 好感' + s.affection + ' 阶段' + s.stage + ' 哥哥支持' + s.brotherSupport + '(' + s.brotherStance + ') 情敌' + s.rivalIntimacy + ' 曝光' + s.scandalHeat;
    });
    parts.push('【关系变化趋势】\n' + recentSnaps.join('\n'));
  }

  return parts.join('\n');
}

function safeJson(raw) {
  if (!raw) return null;
  var s = raw.trim();
  var a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) { return null; }
}
