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

// 注入 prompt 用的记忆摘要（近 7 天关键词 + 全部关键事件）
export function buildMemorySnapshot() {
  var E = GS.entSim;
  if (!E || !E.memory) return '';
  var days = E.memory.dailySummaries.slice(-7);
  var kw = [];
  days.forEach(function(d) { (d.keywords || []).forEach(function(k) { if (kw.indexOf(k) < 0) kw.push(k); }); });
  var recent = days.map(function(d) { return 'Day' + d.day + '：' + (d.keywords || []).join('、'); });
  var events = E.memory.eventLog.slice(-12).map(function(e) { return 'Day' + e.day + ' ' + e.text; });
  var parts = [];
  if (recent.length) parts.push('【近期记忆】\n' + recent.join('\n'));
  if (events.length) parts.push('【关键事件】\n' + events.join('\n'));
  if (kw.length) parts.push('【人物关键词】' + kw.join('、'));
  return parts.join('\n');
}

function safeJson(raw) {
  if (!raw) return null;
  var s = raw.trim();
  var a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) { return null; }
}
