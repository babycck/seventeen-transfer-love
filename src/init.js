import {
  setGS, GS, defaultGameState, loadGame, saveGame, migrateSave, resetGame, escHtml
} from './core.js';
import { renderAll, initTheme } from './ui-renderer.js';
import { generatePhaseNarrative } from './game-engine.js';

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
  // 激活码鉴权已关闭（后端未运行），直接进入游戏
  initGame();
}

function initGame() {
  try {
    if (!loadGame()) {
      setGS(defaultGameState());
      saveGame();
    }
    initTheme();
    renderAll();

    // 如果已在游戏中且当前没有剧情，自动生成时段剧情
    if (GS.step >= 5 && !GS.gameOver && GS.aiEnabled && !GS.phaseNarrative) {
      generatePhaseNarrative();
    }
  } catch (e) {
    console.error('[Init] initGame error:', e);
    var app = document.getElementById('app');
    if (app) {
      app.innerHTML = '<div style="padding:40px;text-align:center;color:#c62828">' +
        '<h3>⚠️ 加载失败</h3>' +
        '<p style="margin-top:12px;font-size:13px">' + escHtml(e && e.message ? e.message : String(e)) + '</p>' +
        '<p style="margin-top:8px;font-size:12px;color:#8b6b6b">请截图此错误信息并联系开发者</p></div>';
    }
  }
}
init();


