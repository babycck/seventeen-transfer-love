import {
  setGS, GS, defaultGameState, loadGame, saveGame, migrateSave, resetGame
} from './core.js';
import { renderAll, renderAuthScreen, bindAuthEvents } from './ui-renderer.js';
import { generatePhaseNarrative } from './game-engine.js';
import { verifyToken, isBackendConfigured } from './auth.js';

// 将 renderAll 挂到全局，供循环依赖模块（sms.js / modals.js）使用
window.__renderAll = renderAll;

// Phase 4 骨架调试工具：optionEngine 默认已启用
// 使用：__skeleton.disable('optionEngine') 可切回 AI 生成选项
window.__skeleton = {
  toggle: function(module) {
    if (!GS.skeletonConfig) GS.skeletonConfig = {};
    GS.skeletonConfig[module] = !GS.skeletonConfig[module];
    saveGame();
    console.log('[Skeleton]', module, '->', GS.skeletonConfig[module]);
  },
  enable: function(module) {
    if (!GS.skeletonConfig) GS.skeletonConfig = {};
    GS.skeletonConfig[module] = true;
    saveGame();
    console.log('[Skeleton]', module, '-> ON');
  },
  disable: function(module) {
    if (!GS.skeletonConfig) GS.skeletonConfig = {};
    GS.skeletonConfig[module] = false;
    saveGame();
    console.log('[Skeleton]', module, '-> OFF');
  },
  status: function() {
    console.table(GS.skeletonConfig || {});
    return GS.skeletonConfig || {};
  }
};

// ==================== 全局错误捕获 ====================
var ERROR_LOG_KEY = 'svt_error_log';

function saveError(entry) {
  try {
    var raw = localStorage.getItem(ERROR_LOG_KEY) || '[]';
    var logs = JSON.parse(raw);
    if (!Array.isArray(logs)) logs = [];
    logs.push(entry);
    // 只保留最近 50 条
    if (logs.length > 50) logs = logs.slice(-50);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(logs));
  } catch (e) {
    // 如果连错误日志都存不下，至少打印到控制台
    console.error('[ErrorLogger] failed to save error:', e);
  }
}

window.onerror = function(message, source, lineno, colno, error) {
  var entry = {
    type: 'error',
    time: new Date().toISOString(),
    message: message,
    source: source,
    line: lineno,
    column: colno,
    stack: error && error.stack ? error.stack : '',
    url: location.href,
    ua: navigator.userAgent
  };
  saveError(entry);
  // 继续向上抛出，保留默认控制台输出
  return false;
};

window.onunhandledrejection = function(event) {
  var reason = event.reason;
  var entry = {
    type: 'unhandledrejection',
    time: new Date().toISOString(),
    message: reason && reason.message ? reason.message : String(reason),
    stack: reason && reason.stack ? reason.stack : '',
    url: location.href,
    ua: navigator.userAgent
  };
  saveError(entry);
};

// ==================== 初始化 ====================
export async function init() {
  // 激活码功能已关闭（如需开启，取消下方注释并部署后端）
  initGame();
  return;

  /* 激活码鉴权（需要部署后端后开启）
  if (!isBackendConfigured()) {
    console.log('[Auth] 后端未配置，跳过鉴权');
    initGame();
    return;
  }

  var result = await verifyToken();
  if (result.valid) {
    initGame();
  } else {
    renderAuthScreen(result.error);
    bindAuthEvents(initGame);
  }
  */
}

function initGame() {
  if (!loadGame()) {
    setGS(defaultGameState());
    saveGame();
  }
  renderAll();

  // 如果已在游戏中且当前没有剧情，自动生成时段剧情
  if (GS.step >= 5 && !GS.gameOver && GS.aiEnabled && !GS.phaseNarrative) {
    generatePhaseNarrative();
  }
}
init();


