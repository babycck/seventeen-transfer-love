import { callDeepSeek } from './api.js';
import { parseNarrative } from './parser.js';
import { validateNarrative, formatCorrections } from './validator.js';
import { dispatch } from './store.js';
import { GS } from './state.js';

// 带自动重试的 AI 生成包装
// 如果 validator 返回 error 级问题，自动重试一次并带修正反馈
export async function generateWithRetry(sysPrompt, userMsg, opts) {
  opts = opts || {};
  var tokens = opts.tokens || 5000;
  var temp = opts.temperature || 0.8;
  var sceneType = opts.sceneType || 'phase';
  var maxAttempts = opts.maxAttempts || 2;
  var skipValidate = opts.skipValidate || false;

  var lastResult = null;

  var currentUserMsg = userMsg;

  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var raw;
    try {
      raw = await callDeepSeek(sysPrompt, currentUserMsg, tokens, true, temp, sceneType);
    } catch (e) {
      console.warn('[ai-generator] attempt ' + (attempt + 1) + ' network error: ' + e.message);
      if (attempt < maxAttempts - 1) continue;
      throw e;
    }
    var parsed = parseNarrative(raw);

    // skipValidate：选项生成等非 narrative 任务跳过 validator（validator 针对 blocks 设计，
    // 对 {"options":[...]} 格式会误判 blocks 为空触发 error）
    if (skipValidate) {
      return { raw: raw, parsed: parsed, corrections: [], attempts: attempt + 1 };
    }

    var corr = validateNarrative(raw, parsed);

    // 分离 error 和 warning
    var errors = corr.filter(function(c) { return c.severity === 'error'; });
    var warnings = corr.filter(function(c) { return c.severity === 'warning'; });

    // 推送 warning
    if (warnings.length > 0) {
      dispatch({ type: 'PUSH_CORRECTIONS', payload: { corrections: warnings } });
    }

    // 无 error，通过
    if (errors.length === 0) {
      return { raw: raw, parsed: parsed, corrections: corr, attempts: attempt + 1 };
    }

    // 有 error，带反馈重试
    lastResult = { raw: raw, parsed: parsed, corrections: corr, attempts: attempt + 1 };

    if (attempt < maxAttempts - 1) {
      var errMsgs = errors.map(function(e) { return '[' + (e.type || '?') + '] ' + e.message; }).join(' | ');
      console.warn('[ai-generator] attempt ' + (attempt + 1) + ' failed with ' + errors.length + ' error(s): ' + errMsgs);
      // 总是记录 rawText 前 800 字符，方便定位 AI 返回了什么
      console.warn('[ai-generator] attempt ' + (attempt + 1) + ' rawText (first 800 chars):', (raw || '').slice(0, 800));
      // 额外记录 parsed.blocks 状态，判断是解析失败还是 AI 返回空内容
      console.warn('[ai-generator] attempt ' + (attempt + 1) + ' parsed.blocks.length:', (parsed.blocks || []).length);
      currentUserMsg = currentUserMsg + '\n\n' + formatCorrections(errors);
      continue;
    }
  }

  // 全部重试失败，接受最后一次结果
  console.error('[ai-generator] all ' + maxAttempts + ' attempts failed');
  if (lastResult) {
    return lastResult;
  }
  return { raw: '', parsed: parseNarrative('{}'), corrections: [], attempts: maxAttempts };
}
