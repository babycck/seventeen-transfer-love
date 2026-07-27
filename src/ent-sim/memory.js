// ============================================================
// 记忆系统：每天换天时把当日剧情压缩为关键词标签 + 关键事件累积
// 关键事件：影响恋爱深度/曝光/哥哥态度/情敌状态的事件，全部累积不过期
// AI 提取（要准，慢不怕），失败则兜底为一条时间戳摘要。
// ============================================================
import { GS, saveGame } from '../state.js';
import { generateWithRetry } from '../ai-generator.js';

// 把当日缓冲压缩为 { keywords:[..], events:[..] }
export function compressEntSimMemory() {
  var E = GS.entSim;
  if (!E) return Promise.resolve();
  var buf = (GS._entSimNarrativeBuffer || '').slice(-4000);
  var day = E.cycle.dayCount;
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
      saveGame();
    })
    .catch(function() {
      // 兜底
      E.memory.dailySummaries.push({ day: day, keywords: ['（当日剧情）'], events: [] });
      E.memory.lastCompressDay = day;
      GS._entSimNarrativeBuffer = '';
      saveGame();
    });
}

// ── 层7+10：三级记忆上下文隔离（T0里程碑/T1近期20轮/T2阶段摘要）──
export function buildMemorySnapshot() {
  var E = GS.entSim;
  if (!E || !E.memory) return '';
  var today = E.cycle.dayCount || 1;
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
  return parts.join('\n');
}

function safeJson(raw) {
  if (!raw) return null;
  var s = raw.trim();
  var a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) { return null; }
}
