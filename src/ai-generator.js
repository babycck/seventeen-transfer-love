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
  var temp = opts.temperature || 0.7;
  var sceneType = opts.sceneType || 'phase';
  var maxAttempts = opts.maxAttempts || 2;

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
      if (GS._lastParseError) {
        console.warn('[ai-generator] lastParseError rawText (first 600 chars):', (GS._lastParseError.rawText || '').slice(0, 600));
      }
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
