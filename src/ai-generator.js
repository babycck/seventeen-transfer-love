import { callDeepSeek } from './api.js';
import { parseNarrative } from './parser.js';
import { validateNarrative, formatCorrections } from './validator.js';
import { dispatch } from './store.js';
import { GS } from './state.js';

var _sleep = function(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
};

// 带自动重试的 AI 生成包装
// 如果 validator 返回 error 级问题，自动重试一次并带修正反馈
export async function generateWithRetry(sysPrompt, userMsg, opts) {
  opts = opts || {};
  var tokens = opts.tokens || 5000;
  var temp = opts.temperature || 0.8;
  var sceneType = opts.sceneType || 'phase';
  var maxAttempts = opts.maxAttempts || 3;
  var skipValidate = opts.skipValidate || false;

  var lastResult = null;

  var currentUserMsg = userMsg;

  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var raw;
    try {
      raw = await callDeepSeek(sysPrompt, currentUserMsg, tokens, true, temp, sceneType);
    } catch (e) {
      if (e.retryable === false) {
        // 不可重试错误（401/400/403）直接抛出，不浪费重试次数
        console.warn('[ai-generator] attempt ' + (attempt + 1) + ' non-retryable error: ' + e.message);
        throw e;
      }
      console.warn('[ai-generator] attempt ' + (attempt + 1) + ' network error: ' + e.message);
      if (attempt < maxAttempts - 1) {
        var backoffMs = 1500 * Math.pow(2, attempt);
        console.warn('[ai-generator] retrying in ' + backoffMs + 'ms...');
        await _sleep(backoffMs);
        continue;
      }
      throw e;
    }
    // skipValidate: 1v1 纯文本模式下跳过 JSON blocks 解析
    //（callDeepSeek 返回的是纯叙事文本，非 JSON blocks 格式）
    if (skipValidate) {
      return { raw: raw, parsed: { narrative: raw, blocks: [] }, corrections: [], attempts: attempt + 1 };
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

// 根据错误类型生成用户友好的提示文案
export function formatAIError(e) {
  if (!e) return 'AI 生成失败，请刷新重试';
  if (e.isNetworkError) {
    return '网络连接中断，请检查网络后重试';
  }
  if (e.httpStatus === 401) {
    return 'API Key 无效或已过期，请在设置中检查 API Key';
  }
  if (e.httpStatus === 403) {
    return 'API Key 权限不足，请在设置中检查 API Key';
  }
  if (e.httpStatus === 429) {
    return 'API 调用频率超限，请稍后再试';
  }
  if (e.httpStatus >= 500) {
    return 'AI 服务暂时不可用（' + e.httpStatus + '），请稍后刷新重试';
  }
  if (e.httpStatus) {
    return 'AI 请求失败（' + e.httpStatus + '），请检查 API 设置后重试';
  }
  return 'AI 生成失败：' + e.message + '，请点击刷新按钮重试';
}
