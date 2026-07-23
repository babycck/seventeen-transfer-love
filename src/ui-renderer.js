import {
  MAX_STAY_COUNT, PHASE_ACTION_LIMIT, ZODIAC_SIGNS,
  MEMBERS, PHASES, PHASE_LABELS,
  APPEARANCE_TRAITS, PERSONALITY_TRAITS, MBTI_TYPES, PRIVATE_TRAITS,
  HEROINE_PUBLIC_IDENTITIES, HEROINE_TEMPLATES,
  API_PROVIDERS, ONE_HEART_WORLDS, ONE_HEART_STYLES,
  GS, saveGame, resetGame, defaultGameState, randInt, escHtml, testAPIConnection, fetchModels,
  showLoading, hideLoading, showToast, callDeepSeek
} from './core.js';
import { isSisterSetting } from './utils.js';
import { safeParseJson } from './parser.js';
import { setGS } from './state.js';
import { getAffectionHint, getAffectionDesc, spawnAffFloat, updateAffection, addAffectionLog, updateRivalTendency } from './affection.js';
import { handleOptionChoice, handleTruthRound, advancePhase, handleRegenerate, goToNextDay, proceedToNextDay, continueToday, handleFreeAction, generatePhaseNarrative, generateOneHeartRound, generateEventStory, handleExMessageChoice, resetPhaseState, handleQuestionBoxChoice, handleMidnightCall, applyOneHeartOptionAffection, applyOneHeartEventEffects, doActionTask, completeMissionCard, doVisitMember, generateOneHeartSchedule } from './game-engine.js';
import { getZodiacFromBirthday, generateSeasonAndDates, generateOneHeartDates, generateDailyWeather, getSeasonByMonth } from './formatters.js';
import { IDENTITY_RELATION_MAP, MEMBER_BIRTHDAYS, HOLIDAYS_1V1, WORLD_IDENTITY_COMPATIBILITY, ONE_HEART_ENDING_TEMPLATES } from './data.js';
import { generateAllXArchives } from './x-archive.js';
import { showSmsModal, showGiftPanel, showAffectionPanel, showApiSettingsModal, showConfirmModal, showHelpMergedModal, showReviewModal, showArchiveModal, showTaskPanel, showNewsModal, setSwitchOneHeartTab } from './modals.js';
import { invalidateSystemPromptCache } from './prompts.js';
// 模态弹窗（Phase 5 模块化）
import { showMidnightCallModal } from './modals/midnight-call.js';
// 1v1 模态弹窗
import { showDiaryModal, showChatModal, showMomentsModal, showTheaterModal, showEventCardModal } from './modals.js';
// UI 组件（Phase 5 模块化）
import { renderHeader } from './ui/header-bar.js';
import { renderParsedNarrative, renderNarrativeSection, startTypewriter, showEditButton } from './ui/narrative-box.js';
import { renderOptionPanel, renderTruthPanel, renderQuestionBoxPanel } from './ui/option-panel.js';
import { renderActionBar } from './ui/action-bar.js';
import { renderFreeInput } from './ui/free-input.js';
import { parseNarrative, completeSecretMission } from './parser.js';
import { loadTestScene } from './api.js';
import { activateCode, saveCodePreference, getSavedCode, isRememberCode } from './auth.js';
import { compressTodayToSummary } from './memory.js';

var _scrollBound = false;
var _firstRender = true;

// ==================== 主题切换 ====================
export function applyTheme(theme) {
  if (theme === 'auto') {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('svt_theme', theme);
}

export function initTheme() {
  var saved = localStorage.getItem('svt_theme') || (GS.theme || 'auto');
  applyTheme(saved);
}


// ==================== UI 渲染 ====================
export function renderAll() {
  var app = document.getElementById('app');
  // 1v1 模式标识，供 CSS 做差异化布局
  if (GS.gameMode === 'oneHeart' && GS.step >= 5) {
    app.classList.add('oneheart-mode');
  } else {
    app.classList.remove('oneheart-mode');
  }
  if (GS.step < 5) {
    app.innerHTML = renderSetupWizard();
    bindSetupEvents();
  } else {
    app.innerHTML = renderGameScreen();
    bindGameEvents();
    scrollToLatestContent();
    setTimeout(function() {
      var newContent = document.getElementById('narrativeNewContent');
      if (_firstRender) {
        // 初次加载（刷新/打开）：已有内容直接显示，不打字机
        _firstRender = false;
        showEditButton();
      } else if (newContent && newContent.getAttribute('data-narrative-html')) {
        startTypewriter('narrativeNewContent', GS.typewriterSpeed == null ? 30 : GS.typewriterSpeed);
      } else {
        startTypewriter('narrativeBox', GS.typewriterSpeed == null ? 30 : GS.typewriterSpeed);
      }
      drawAffectionChart();
    }, 50);
  }
}

// 绘制好感度折线图
function drawAffectionChart() {
  var canvas = document.getElementById('affectionChart');
  if (!canvas || !GS.affectionHistory || GS.affectionHistory.length < 2) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 280 * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '280px';
  ctx.scale(dpr, dpr);

  var w = rect.width;
  var h = 280;
  var pad = { top: 30, right: 20, bottom: 40, left: 50 };
  var plotW = w - pad.left - pad.right;
  var plotH = h - pad.top - pad.bottom;

  var colors = ['#e91e63', '#2196f3', '#4caf50'];
  var members = GS.selectedMembers;

  // 背景
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  // 网格线
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 0.5;
  for (var gy = 0; gy <= 5; gy++) {
    var y = pad.top + plotH * gy / 5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = '#999';
    ctx.font = '11px PingFang SC';
    ctx.textAlign = 'right';
    var val = Math.round(100 - gy * 40);
    ctx.fillText(val, pad.left - 8, y + 4);
  }

  // X轴标签
  var days = GS.affectionHistory.length;
  ctx.textAlign = 'center';
  for (var dx = 0; dx < days; dx++) {
    var x = pad.left + plotW * dx / (days - 1 || 1);
    ctx.fillStyle = '#999';
    ctx.font = '11px PingFang SC';
    ctx.fillText('D' + GS.affectionHistory[dx].day, x, h - pad.bottom + 20);

    // 网格竖线
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.stroke();
  }

  // 数据线
  for (var mi = 0; mi < members.length; mi++) {
    var mid = members[mi];
    ctx.strokeStyle = colors[mi % colors.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var pi = 0; pi < GS.affectionHistory.length; pi++) {
      var point = GS.affectionHistory[pi];
      var aff = point.aff[mid] || 0;
      var px = pad.left + plotW * pi / (GS.affectionHistory.length - 1 || 1);
      var py = pad.top + plotH * (100 - aff) / 200;
      if (pi === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 数据点
    for (var qi = 0; qi < GS.affectionHistory.length; qi++) {
      var point2 = GS.affectionHistory[qi];
      var aff2 = point2.aff[mid] || 0;
      var px2 = pad.left + plotW * qi / (GS.affectionHistory.length - 1 || 1);
      var py2 = pad.top + plotH * (100 - aff2) / 200;
      ctx.fillStyle = colors[mi % colors.length];
      ctx.beginPath();
      ctx.arc(px2, py2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 图例
  var legendX = pad.left + 8;
  for (var li = 0; li < members.length; li++) {
    var mm = MEMBERS.find(function(m) { return m.id === members[li]; });
    ctx.fillStyle = colors[li % colors.length];
    ctx.fillRect(legendX, h - 12, 10, 10);
    ctx.fillStyle = '#666';
    ctx.font = '11px PingFang SC';
    ctx.textAlign = 'left';
    ctx.fillText((mm ? mm.name : members[li]) + ' (' + (GS.affection[members[li]] || 0) + ')', legendX + 14, h - 2);
    legendX += ctx.measureText((mm ? mm.name : members[li]) + ' (' + (GS.affection[members[li]] || 0) + ')').width + 30;
  }
}

export function buildModelOptionsHtml(providerKey, selectedModel) {
  var provider = API_PROVIDERS[providerKey] || API_PROVIDERS.deepseek;
  var models = provider.models || [];
  var html = '';
  for (var i = 0; i < models.length; i++) {
    var m = models[i];
    html += '<option value="' + m.value + '"' + (selectedModel === m.value ? ' selected' : '') + '>' + m.label + '</option>';
  }
  return html;
}

export function renderSetupWizard() {
  var html = '';

  if (GS.step === 1) {
    var modeSel = (GS.gameMode || 'transfer') === 'oneHeart' ? 'oneHeart' : 'transfer';
    var hasKey = GS.apiKey && GS.apiKey.length > 0;
    var providerOptions = '';
    for (var pk in API_PROVIDERS) {
      var p = API_PROVIDERS[pk];
      providerOptions += '<option value="' + pk + '"' + (GS.apiProvider === pk ? ' selected' : '') + '>' + p.name + '</option>';
    }
    var modelOptions = buildModelOptionsHtml(GS.apiProvider, GS.apiModel);
    var provider = API_PROVIDERS[GS.apiProvider] || API_PROVIDERS.deepseek;
    var showFetchBtn = provider.dynamicModels ? '' : 'display:none;';
    var isOneHeart = modeSel === 'oneHeart';
    var useSep = GS.useSeparateApi && isOneHeart;
    var sepToggleHtml = '';
    if (isOneHeart) {
      sepToggleHtml = '<div style="display:flex;gap:8px;margin:10px 0;padding:8px;background:var(--bg-card,#faf5f5);border:1.5px solid var(--border-primary,#e0c0c0);border-radius:10px">' +
        '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;margin:0;flex:1;justify-content:center;padding:6px;border-radius:8px;background:' + (!useSep ? 'var(--accent-primary,#e91e63);color:#fff' : 'transparent') + '" id="apiModeUnified">' +
        '<input type="radio" name="apiMode" style="display:none"' + (!useSep ? ' checked' : '') + '>📦 统一 API（所有功能用一个模型）</label>' +
        '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;margin:0;flex:1;justify-content:center;padding:6px;border-radius:8px;background:' + (useSep ? 'var(--accent-primary,#e91e63);color:#fff' : 'transparent') + '" id="apiModeSeparate">' +
        '<input type="radio" name="apiMode" style="display:none"' + (useSep ? ' checked' : '') + '>⚡ 分离 API（正文 + 其他分别配置）</label></div>';
    }
    // 统一 API 块（默认 API，所有功能共用）
    var buildApiBlock = function(opts) {
      var _idPrefix = opts.idPrefix || '';
      var _provider = API_PROVIDERS[opts.provider] || API_PROVIDERS.deepseek;
      var _isCustom = opts.provider === 'custom';
      var _showFetchBtn = (!_isCustom && _provider.dynamicModels) ? '' : 'display:none;';
      var _modelOpts = buildModelOptionsHtml(opts.provider, opts.model);
      var _hasKey = opts.apiKey && opts.apiKey.length > 0;
      var _providerOpts = '';
      for (var _pk in API_PROVIDERS) {
        var _pp = API_PROVIDERS[_pk];
        _providerOpts += '<option value="' + _pk + '"' + (opts.provider === _pk ? ' selected' : '') + '>' + _pp.name + '</option>';
      }
      var _title = opts.title || 'API 设置';
      var _subtitle = opts.subtitle || '选择 AI 提供商并输入 API Key 以启用 AI 剧情生成';
      var _showTest = opts.showTest !== false;
      var _showAiEnabled = opts.showAiEnabled !== false;
      var _testBtnId = _idPrefix + 'testApiBtn';
      var _statusId = _idPrefix + 'apiStatus';
      var _customFields = '<div id="' + _idPrefix + 'customFieldsWrap" style="' + (_isCustom ? '' : 'display:none;') + '">' +
        '<label>自定义接口地址</label>' +
        '<input type="text" id="' + _idPrefix + 'customApiEndpointInput" placeholder="https://api.example.com/v1" value="' + escHtml(opts.customEndpoint || '') + '" style="width:100%;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;margin-bottom:8px;background:#fff">' +
        '<label>自定义模型名</label>' +
        '<input type="text" id="' + _idPrefix + 'customApiModelInput" placeholder="gpt-4o" value="' + escHtml(opts.customModel || '') + '" style="width:100%;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;margin-bottom:8px;background:#fff">' +
        '</div>';
      return '<h3 style="font-size:14px;margin:0 0 6px;color:var(--text-primary)">' + _title + '</h3>' +
        '<p class="step-desc" style="font-size:12px;margin:0 0 8px">' + _subtitle + '</p>' +
        '<label>AI 提供商</label>' +
        '<select id="' + _idPrefix + 'apiProviderSelect" style="width:100%;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;margin-bottom:8px;background:#fff">' + _providerOpts + '</select>' +
        _customFields +
        '<div id="' + _idPrefix + 'modelSelectWrap" style="' + (_isCustom ? 'display:none;' : '') + '">' +
        '<label>AI 模型</label>' +
        '<div style="display:flex;gap:4px;margin-bottom:8px">' +
        '<select id="' + _idPrefix + 'apiModelSelect" style="flex:1;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;background:#fff">' + _modelOpts + '</select>' +
        '<button class="btn-secondary" id="' + _idPrefix + 'fetchModelsBtn" style="padding:6px 10px;border:1.5px solid #e0c0c0;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;white-space:nowrap;' + _showFetchBtn + '">🔄 获取模型</button>' +
        '</div></div>' +
        '<label>API Key' + (_hasKey ? ' <span style="color:#4caf50;font-size:12px">✅ 已输入</span>' : '') + '</label>' +
        '<div style="display:flex;gap:4px">' +
        '<input type="password" id="' + _idPrefix + 'apiKeyInput" placeholder="sk-..." value="' + escHtml(opts.apiKey) + '" style="flex:1">' +
        '<button type="button" id="' + _idPrefix + 'toggleApiKeyBtn" style="padding:6px 10px;border:1.5px solid #e0c0c0;border-radius:8px;background:#fff;cursor:pointer;font-size:12px">👁</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:6px">' +
        '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
        '<input type="checkbox" id="' + _idPrefix + 'rememberApiKeyCheck" ' + (GS.rememberApiKey ? 'checked' : '') + '> 记住 API Key（仅保存到本地浏览器）</label>' +
        '</div>' +
        (_showTest || _showAiEnabled ? '<div style="display:flex;gap:6px;margin-top:6px">' : '') +
        (_showTest ? '<button class="btn-secondary" id="' + _testBtnId + '" style="flex:1">🔍 测试连接</button>' : '') +
        (_showAiEnabled ? '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0"><input type="checkbox" id="' + _idPrefix + 'aiEnabledCheck" ' + (GS.aiEnabled ? 'checked' : '') + '> 启用AI</label>' : '') +
        (_showTest || _showAiEnabled ? '</div>' : '') +
        '<div id="' + _statusId + '" class="api-status hidden"></div>';
    };
    var unifiedHtml = buildApiBlock({ idPrefix: '', provider: GS.apiProvider, model: GS.apiModel, apiKey: GS.apiKey, customEndpoint: GS.customApiEndpoint, customModel: GS.customApiModel, title: '🔑 API 设置', subtitle: '选择 AI 提供商并输入 API Key 以启用 AI 剧情生成', showTest: true, showAiEnabled: true });
    var otherHtml = buildApiBlock({ idPrefix: 'other', provider: GS.apiProvider, model: GS.apiModel, apiKey: GS.apiKey, customEndpoint: GS.customApiEndpoint, customModel: GS.customApiModel, title: '🔌 其他功能 API', subtitle: '用于聊天、朋友圈、短信、日记等辅助功能', showTest: true, showAiEnabled: false });
    var mainHtml = buildApiBlock({ idPrefix: 'main', provider: GS.mainApiProvider || GS.apiProvider, model: GS.mainApiModel || GS.apiModel, apiKey: GS.mainApiKey || GS.apiKey, customEndpoint: GS.mainCustomApiEndpoint, customModel: GS.mainCustomApiModel, title: '📝 正文专用 API', subtitle: '用于 1v1 模式的剧情正文生成', showTest: true, showAiEnabled: false });
    html = '<div class="setup-step">' +
      '<h2>🎮 选择游戏模式</h2>' +
      '<div class="mode-select">' +
      '<button class="mode-option' + (modeSel === 'transfer' ? ' selected' : '') + '" id="modeTransfer">' +
      '<span class="mode-emoji">💔</span><span class="mode-name">换乘恋爱</span>' +
      '<span class="mode-desc">经典模式 · 与 3 位成员在心动小屋共度 12 天</span></button>' +
      '<button class="mode-option' + (modeSel === 'oneHeart' ? ' selected' : '') + '" id="modeOneHeart">' +
      '<span class="mode-emoji">💗</span><span class="mode-name">只为你心动</span>' +
      '<span class="mode-desc">1v1 模式 · 与 1 位成员展开专属恋爱</span></button></div>' +
      '<hr style="margin:16px 0;border:none;border-top:1px solid #f0e0e0">' +
      sepToggleHtml +
      (useSep ? otherHtml + '<hr style="margin:12px 0;border:none;border-top:1px solid #f0e0e0">' + mainHtml : unifiedHtml) +
      '<p style="font-size:11px;color:#8b6b6b;margin-top:4px">🔒 隐私说明：API Key 仅存储在你当前浏览器的本地空间中，不会上传到任何服务器，其他人无法看到。</p>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-direction:column">' +
      '<button class="btn-primary" id="step1Next">下一步 →</button>' +
      '<button class="btn-secondary" id="step1ImportBtn" style="background:#f0f7ff;border-color:#5b9bd5;color:#2e5c8a">📂 导入存档（继续之前的游戏）</button>' +
      '<input type="file" id="step1ImportInput" accept=".json" style="display:none">' +
      '</div></div>';
  } else if (GS.step === 2) {
    if (GS.gameMode === 'oneHeart') {
      var hp = GS.heroineProfile;
      html = '<div class="setup-step"><h2>💗 Step 2：心动对象 + 女主</h2>' +
        '<p class="step-desc">选择 1 位成员并设定你的角色</p>' +
        '<h4 style="margin:12px 0 6px;font-size:14px;color:var(--text-primary)">选择心动对象</h4>' +
        '<div class="member-grid" id="oneHeartMemberGrid">' +
        MEMBERS.map(function(m) {
          var sel = GS.oneHeartMember === m.id;
          return '<div class="member-chip' + (sel ? ' selected' : '') + '" data-id="' + m.id + '">' +
            m.emoji + '<br>' + m.name + '<br><small>' + m.stageName + '</small></div>';
        }).join('') + '</div>' +
        // 分割线
        '<hr style="margin:16px 0;border:none;border-top:1px solid var(--border-primary);opacity:0.3">' +
        '<h4 style="margin:0 0 8px;font-size:14px;color:var(--text-primary)">设定你的角色</h4>' +
        // 人设模板
        '<div style="display:flex;gap:6px;margin-bottom:10px">' +
        '<select id="templateSelect" style="flex:2;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;background:var(--bg-card);color:var(--text-primary);font-family:inherit">' +
        '<option value="">💎 人设模板（选填）</option>' +
        HEROINE_TEMPLATES.map(function(t) {
          return '<option value="' + t.id + '">' + t.name + '</option>';
        }).join('') + '</select>' +
        '<button class="btn-secondary" id="randomTemplateBtn" style="flex:1;padding:8px;font-size:12px">🎲 随机</button></div>' +
        '<label>姓名/昵称</label><input type="text" id="hpName" value="' + escHtml(hp.name) + '">' +
        '<label>年龄</label><input type="number" id="hpAge" value="' + hp.age + '" min="18" max="40">' +
        '<label>公开身份</label>' +
        '<select id="hpJob" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;background:var(--bg-card);color:var(--text-primary);font-family:inherit;margin-bottom:6px">' +
        '<option value="">-- 选择公开身份 --</option>' +
        HEROINE_PUBLIC_IDENTITIES.map(function(id) {
          return '<option value="' + id + '"' + (hp.job === id ? ' selected' : '') + '>' + id + '</option>';
        }).join('') +
        '<option value="__custom__"' + (hp.job && HEROINE_PUBLIC_IDENTITIES.indexOf(hp.job) < 0 ? ' selected' : '') + '>✍️ 自定义</option></select>' +
        (hp.job && HEROINE_PUBLIC_IDENTITIES.indexOf(hp.job) < 0 ? '<input type="text" id="hpJobCustom" value="' + escHtml(hp.job) + '" placeholder="输入自定义身份" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit;margin-bottom:10px">' : '<input type="text" id="hpJobCustom" placeholder="输入自定义身份" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit;margin-bottom:10px;display:none">') +
        '<label>生日</label>' +
        '<div style="display:flex;gap:8px">' +
        '<select id="hpBirthMonth" style="flex:1;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit">' +
        (function(){ var opts = ''; for (var mi = 1; mi <= 12; mi++) { opts += '<option value="' + mi + '"' + (hp.birthday && hp.birthday.month === mi ? ' selected' : '') + '>' + mi + '月</option>'; } return opts; })() +
        '</select>' +
        '<select id="hpBirthDay" style="flex:1;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit">' +
        (function(){ var opts = ''; for (var di = 1; di <= 31; di++) { opts += '<option value="' + di + '"' + (hp.birthday && hp.birthday.day === di ? ' selected' : '') + '>' + di + '日</option>'; } return opts; })() +
        '</select>' +
        '</div>' +
        '<p id="zodiacDisplay" style="font-size:12px;color:var(--text-muted);margin-top:4px">' + (hp.zodiac ? '星座：' + hp.zodiac : '输入生日后自动计算星座') + '</p>' +
        '<label>外貌特征（多选）</label><div class="chip-row" id="appearanceChips">' +
        APPEARANCE_TRAITS.map(function(s) {
          return '<span class="chip' + (hp.appearance.indexOf(s) >= 0 ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        '<label>性格（多选）</label><div class="chip-row" id="personalityChips">' +
        PERSONALITY_TRAITS.map(function(s) {
          return '<span class="chip' + (hp.personality.indexOf(s) >= 0 ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        '<label>MBTI</label><div class="chip-row" id="mbtiChips">' +
        MBTI_TYPES.map(function(s) {
          return '<span class="chip' + (hp.mbti === s ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        '<label>私密体质（多选，可选）</label><div class="chip-row" id="privateChips">' +
        PRIVATE_TRAITS.map(function(s) {
          return '<span class="chip' + (hp.privateTraits.indexOf(s) >= 0 ? ' selected' : '') + '" data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        '<button class="btn-primary" id="step2Next" ' + (GS.oneHeartMember ? '' : 'disabled') + '>' +
        (GS.oneHeartMember ? '下一步 →' : '请选择 1 位成员') + '</button>' +
        '<button class="btn-secondary" id="step2Back">← 返回</button></div>';
    } else {
      var hp = GS.heroineProfile;
      var locked = GS.profileLocked;
      var ro = locked ? ' readonly disabled style="background:#f5f5f5;color:#888;cursor:not-allowed"' : '';
      var chipStyle = locked ? ' style="pointer-events:none;opacity:0.7"' : '';
      // 队友的妹妹设定：身份固定为「哥哥的妹妹」，额外显示职业子下拉（纯职业池，可圈内互动）
      var isSisterId = hp.job === '队友的妹妹';
      var sisterProfHtml = '';
      if (GS.gameMode === 'oneHeart' && isSisterId) {
        var _profVal = hp.profession || '女团爱豆';
        if (!hp.profession) hp.profession = _profVal;
        if (locked) {
          sisterProfHtml = '<label>职业</label><input type="text" id="hpProfession" value="' + escHtml(_profVal) + '"' + ro + '>';
        } else {
          sisterProfHtml = '<label>你的职业（圈内·可互动）</label>' +
            '<select id="hpProfession" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;background:var(--bg-card);color:var(--text-primary);font-family:inherit;margin-bottom:10px">' +
            SISTER_PROFESSIONS.map(function(p) {
              return '<option value="' + p + '"' + (_profVal === p ? ' selected' : '') + '>' + p + '</option>';
            }).join('') + '</select>';
        }
      }
      html = '<div class="setup-step"><h2>👩 Step 2：女主人设</h2>' +
        '<p class="step-desc">' + (locked ? '✅ 女主人设已设定（只读）' : '设定你的角色（设定后将只读）') + '</p>' +
        (!locked ? '<div style="display:flex;gap:6px;margin-bottom:10px">' +
        '<select id="templateSelect" style="flex:2;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;background:var(--bg-card);color:var(--text-primary);font-family:inherit">' +
        '<option value="">💎 人设模板（选填）</option>' +
        HEROINE_TEMPLATES.map(function(t) {
          return '<option value="' + t.id + '">' + t.name + '</option>';
        }).join('') + '</select>' +
        '<button class="btn-secondary" id="randomTemplateBtn" style="flex:1;padding:8px;font-size:12px">🎲 随机</button></div>' : '') +
        '<label>姓名/昵称</label><input type="text" id="hpName" value="' + escHtml(hp.name) + '"' + ro + '>' +
        '<label>年龄</label><input type="number" id="hpAge" value="' + hp.age + '" min="18" max="40"' + ro + '>' +
        (!locked ? '<label>公开身份</label>' +
        '<select id="hpJob" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;background:var(--bg-card);color:var(--text-primary);font-family:inherit;margin-bottom:6px">' +
        '<option value="">-- 选择公开身份 --</option>' +
        HEROINE_PUBLIC_IDENTITIES.map(function(id) {
          return '<option value="' + id + '"' + (hp.job === id ? ' selected' : '') + '>' + id + '</option>';
        }).join('') +
        '<option value="__custom__"' + (hp.job && HEROINE_PUBLIC_IDENTITIES.indexOf(hp.job) < 0 ? ' selected' : '') + '>✍️ 自定义</option></select>' +
        (hp.job && HEROINE_PUBLIC_IDENTITIES.indexOf(hp.job) < 0 ? '<input type="text" id="hpJobCustom" value="' + escHtml(hp.job) + '" placeholder="输入自定义身份" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit;margin-bottom:10px">' : '<input type="text" id="hpJobCustom" placeholder="输入自定义身份" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit;margin-bottom:10px;display:none">') : '<label>职业</label><input type="text" id="hpJob" value="' + escHtml(hp.job) + '"' + ro + '>') + sisterProfHtml +
        '<label>生日</label>' +
        '<div style="display:flex;gap:8px">' +
        '<select id="hpBirthMonth" style="flex:1;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit"' + ro + '>' +
        (function(){ var opts = ''; for (var mi = 1; mi <= 12; mi++) { opts += '<option value="' + mi + '"' + (hp.birthday && hp.birthday.month === mi ? ' selected' : '') + '>' + mi + '月</option>'; } return opts; })() +
        '</select>' +
        '<select id="hpBirthDay" style="flex:1;padding:8px 10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:12px;font-family:inherit"' + ro + '>' +
        (function(){ var opts = ''; for (var di = 1; di <= 31; di++) { opts += '<option value="' + di + '"' + (hp.birthday && hp.birthday.day === di ? ' selected' : '') + '>' + di + '日</option>'; } return opts; })() +
        '</select>' +
        '</div>' +
        '<p id="zodiacDisplay" style="font-size:12px;color:#8b6b6b;margin-top:4px">' + (hp.zodiac ? '星座：' + hp.zodiac : '输入生日后自动计算星座') + '</p>' +
        '<label>外貌特征（多选）</label><div class="chip-row" id="appearanceChips">' +
        APPEARANCE_TRAITS.map(function(s) {
          return '<span class="chip' + (hp.appearance.indexOf(s) >= 0 ? ' selected' : '') + '"' + chipStyle + ' data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        '<label>性格（多选）</label><div class="chip-row" id="personalityChips">' +
        PERSONALITY_TRAITS.map(function(s) {
          return '<span class="chip' + (hp.personality.indexOf(s) >= 0 ? ' selected' : '') + '"' + chipStyle + ' data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        '<label>MBTI</label><div class="chip-row" id="mbtiChips">' +
        MBTI_TYPES.map(function(s) {
          return '<span class="chip' + (hp.mbti === s ? ' selected' : '') + '"' + chipStyle + ' data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        '<label>私密体质（多选，可选）</label><div class="chip-row" id="privateChips">' +
        PRIVATE_TRAITS.map(function(s) {
          return '<span class="chip' + (hp.privateTraits.indexOf(s) >= 0 ? ' selected' : '') + '"' + chipStyle + ' data-val="' + s + '">' + s + '</span>';
        }).join('') + '</div>' +
        (locked ? '<button class="btn-primary" id="step2Next">继续到成员选择 →</button>' :
          '<button class="btn-primary" id="step2Next">下一步 →</button>' +
          '<button class="btn-secondary" id="step2Back">← 返回</button>') + '</div>';
    }
  } else if (GS.step === 3) {
    if (GS.gameMode === 'oneHeart') {
      // 超过 6 个世界观时使用下拉条而非卡片网格
      var worlds = ONE_HEART_WORLDS;
      var useDropdown = worlds.length > 6;
      var isCustomWorld = GS.worldSetting === 'custom';
      html = '<div class="setup-step"><h2>🌍 Step 3：世界设定</h2>' +
        '<p class="step-desc">选择你们相遇的世界</p>';
      if (useDropdown) {
        html += '<select id="worldSelect" style="width:100%;padding:10px 12px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:13px;background:var(--bg-card);color:var(--text-primary);margin-bottom:12px;font-family:inherit">' +
          '<option value="">-- 请选择世界观 --</option>' +
          worlds.map(function(w) {
            return '<option value="' + w.id + '"' + (GS.worldSetting === w.id ? ' selected' : '') + '>' + w.name + '</option>';
          }).join('') + '</select>' +
          '<div id="worldDesc" style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px 12px;background:var(--bg-soft,#fff5f5);border-radius:8px">' +
          (isCustomWorld ? '自定义世界观，请在下方描述。' : (GS.worldSetting ? ((worlds.find(function(w){return w.id===GS.worldSetting})||{}).desc || '') : '')) +
          '</div>';
      } else {
        html += '<div class="world-grid" id="worldGrid">' +
        worlds.map(function(w) {
          var sel = GS.worldSetting === w.id;
          return '<div class="world-card' + (sel ? ' selected' : '') + '" data-id="' + w.id + '">' +
            '<div class="world-name">' + w.name + '</div>' +
            '<div class="world-desc">' + w.desc + '</div></div>';
        }).join('') + '</div>';
      }
      // 自定义世界观文本输入
      if (isCustomWorld) {
        html += '<div id="customWorldArea"><label style="font-size:12px;color:var(--text-muted)">世界设定描述（最多 1500 字）：</label>' +
          '<textarea id="customWorldInput" maxlength="1500" style="width:100%;padding:10px 12px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:13px;resize:vertical;min-height:100px;background:var(--bg-card);color:var(--text-primary);font-family:inherit;margin-top:4px" placeholder="写下你想要的完整世界设定，包括背景、人物关系、氛围……">' + escHtml(GS.oneHeartCustomWorld || '') + '</textarea>' +
          '<div style="text-align:right;font-size:11px;color:var(--text-muted);margin-top:2px"><span id="customWorldCount">' + (GS.oneHeartCustomWorld ? GS.oneHeartCustomWorld.length : 0) + '</span>/1500</div></div>';
      }
      // 自定义场景的保存按钮
      if (isCustomWorld) {
        html += '<button class="btn-secondary" id="saveCustomWorldBtn" style="width:100%;margin-bottom:12px">💾 保存世界观设定</button>';
      }
      html += '<label style="margin-top:16px;display:block">写作风格</label>' +
        '<div class="style-grid" id="styleGrid">' +
        ONE_HEART_STYLES.map(function(s) {
          var sel = GS.writingStyle === s.id;
          return '<div class="style-chip' + (sel ? ' selected' : '') + '" data-id="' + s.id + '">' +
            '<div class="style-name">' + s.name + '</div>' +
            '<div class="style-desc">' + s.desc + '</div></div>';
        }).join('') + '</div>' +
        '<button class="btn-primary" id="step3Next" ' + ((useDropdown ? GS.worldSetting : GS.worldSetting) && GS.writingStyle ? '' : 'disabled') + '>' +
        (GS.worldSetting && GS.writingStyle ? (isCustomWorld && !GS.oneHeartCustomWorld ? '请设定世界观' : '下一步 →') : '请选择世界观和写作风格') + '</button>' +
        '<button class="btn-secondary" id="step3Back">← 返回</button></div>';
    } else {
      html = '<div class="setup-step"><h2>⭐ Step 3：选择成员</h2>' +
        '<p class="step-desc">从 13 位 SEVENTEEN 成员中选择 3 位参加节目 <small>（已选 ' + GS.selectedMembers.length + '/3）</small></p>' +
        '<div class="member-grid" id="memberGrid">' +
        MEMBERS.map(function(m) {
          var sel = GS.selectedMembers.indexOf(m.id) >= 0;
          return '<div class="member-chip' + (sel ? ' selected' : '') + '" data-id="' + m.id + '">' +
            m.emoji + '<br>' + m.name + '<br><small>' + m.stageName + '</small></div>';
        }).join('') + '</div>' +
        '<button class="btn-primary" id="step3Next" ' + (GS.selectedMembers.length !== 3 ? 'disabled' : '') + '>' +
        (GS.selectedMembers.length === 3 ? '下一步 →' : '请选择 3 位成员') + '</button>' +
        '<button class="btn-secondary" id="step3Back">← 返回</button></div>';
    }
  } else if (GS.step === 4) {
    if (GS.gameMode === 'oneHeart') {
      var confirmMember = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
      var confirmWorld = ONE_HEART_WORLDS.find(function(w) { return w.id === GS.worldSetting; });
      var confirmStyle = ONE_HEART_STYLES.find(function(s) { return s.id === GS.writingStyle; });
      var hp = GS.heroineProfile;
      var _relCharId = GS.oneHeartRelationCharacter ? GS.oneHeartRelationCharacter.memberId : '';
      var _rivalOpts = MEMBERS.filter(function(m) { return m.id !== GS.oneHeartMember && m.id !== _relCharId; });
      var _rivalHtml = '<option value="">🎲 随机情敌（默认）</option>';
      for (var _ri = 0; _ri < _rivalOpts.length; _ri++) {
        _rivalHtml += '<option value="' + _rivalOpts[_ri].id + '">' + _rivalOpts[_ri].emoji + ' ' + _rivalOpts[_ri].name + '</option>';
      }
      html = '<div class="setup-step"><h2>💗 准备开始</h2>' +
        '<p class="step-desc">确认你的设定，然后开始你的专属恋爱故事</p>' +
        '<div class="confirm-card">' +
        '<div class="confirm-row"><span class="confirm-label">游戏模式</span><span>只为你心动（1v1）</span></div>' +
        '<div class="confirm-row"><span class="confirm-label">心动对象</span><span>' + (confirmMember ? confirmMember.emoji + ' ' + confirmMember.name + '（' + confirmMember.stageName + '）' : '未选择') + '</span></div>' +
        '<div class="confirm-row"><span class="confirm-label">世界观</span><span>' + (confirmWorld ? confirmWorld.name : '未选择') + '</span></div>' +
        (GS.worldSetting === 'custom' && GS.oneHeartCustomWorld ? '<div class="confirm-row"><span class="confirm-label">世界设定</span><span style="font-size:11px;max-height:60px;overflow-y:auto">' + escHtml(GS.oneHeartCustomWorld.substring(0, 200)) + (GS.oneHeartCustomWorld.length > 200 ? '...' : '') + '</span></div>' : '') +
        '<div class="confirm-row"><span class="confirm-label">写作风格</span><span>' + (confirmStyle ? confirmStyle.name : '未选择') + '</span></div>' +
        '<div class="confirm-row"><span class="confirm-label">女主</span><span>' + escHtml(hp.name) + ' · ' + hp.age + '岁 · ' + (isSisterSetting() && hp.profession ? escHtml(hp.profession + '（哥哥的妹妹）') : escHtml(hp.job)) + '</span></div>' +
        '</div>' +
        '<div style="margin-top:12px"><label>情敌选择（影响剧情发展方向）</label>' +
        '<select id="rivalSelect" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-primary);font-size:13px;font-family:inherit;margin-top:6px">' + _rivalHtml + '</select></div>' +
        '<div style="margin-top:12px"><label>专属昵称（他叫你的爱称，留空让他自己定一个并固定）</label>' +
        '<input id="petNameInput" type="text" maxlength="12" placeholder="如：小柚子 / 小笨蛋 / 留空随机" value="' + escHtml(GS.oneHeartPetName || '') + '" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-primary);font-size:13px;font-family:inherit;margin-top:6px" />' +
        '</div>' +
        '<button class="btn-primary" id="step4Start" style="margin-top:12px">🎮 开始故事！</button>' +
        '<button class="btn-secondary" id="step4Back">← 返回修改</button></div>';
    } else {
      var selMembers = GS.selectedMembers.map(function(id) {
        return MEMBERS.find(function(m) { return m.id === id; });
      });
      html = '<div class="setup-step"><h2>💔 Step 4：标记秘密前任 X</h2>' +
        '<p class="step-desc">从 3 位成员中选择 1 位作为你的秘密前任（恋爱2年，分手1年）</p>' +
        '<div class="member-grid" id="xGrid">' +
        selMembers.map(function(m) {
          var isX = GS.secretX === m.id;
          return '<div class="member-chip' + (isX ? ' x-marked' : '') + '" data-id="' + m.id + '">' +
            m.emoji + '<br>' + m.name + '<br><small>' + (isX ? '💔 前任X' : '攻略对象') + '</small></div>';
        }).join('') + '</div>' +
        '<p style="color:#8b6b6b;font-size:11px;margin-top:6px">💡 其余2位成员各有场外女性X。X身份在节目中保密——当年是秘密恋爱，团内无人知晓。</p>' +
        '<button class="btn-primary" id="step4Start" ' + (!GS.secretX ? 'disabled' : '') + '>' +
        (GS.secretX ? '🎮 开始游戏！' : '请选择你的秘密前任') + '</button>' +
        '<button class="btn-secondary" id="step4Back">← 返回</button></div>';
    }
  }

  return html;
}

export function bindSetupEvents() {
  if (GS.step === 1) {
    // 模式选择
    var modeTransfer = document.getElementById('modeTransfer');
    var modeOneHeart = document.getElementById('modeOneHeart');
    if (modeTransfer) {
      modeTransfer.addEventListener('click', function() {
        GS.gameMode = 'transfer';
        GS.oneHeartMember = '';
        GS.worldSetting = '';
        GS.writingStyle = '';
        GS.chatHistory = [];
        GS.moments = [];
        GS.theaterHistory = [];
        saveGame();
        renderAll();
      });
    }
    if (modeOneHeart) {
      modeOneHeart.addEventListener('click', function() {
        GS.gameMode = 'oneHeart';
        GS.selectedMembers = [];
        GS.secretX = '';
        saveGame();
        renderAll();
      });
    }
    // 分离 API 模式切换
    var apiModeUnified = document.getElementById('apiModeUnified');
    var apiModeSeparate = document.getElementById('apiModeSeparate');
    if (apiModeUnified) {
      apiModeUnified.addEventListener('click', function() {
        GS.useSeparateApi = false;
        saveGame();
        renderAll();
      });
    }
    if (apiModeSeparate) {
      apiModeSeparate.addEventListener('click', function() {
        GS.useSeparateApi = true;
        saveGame();
        renderAll();
      });
    }
    // 绑定 API 配置块事件
    function bindApiBlockEvents(idPrefix, setProvider, setModel, setKey, setCustomEndpoint, setCustomModel) {
      var prefix = idPrefix || '';
      var providerSelect = document.getElementById(prefix + 'apiProviderSelect');
      if (providerSelect) {
        providerSelect.addEventListener('change', function() {
          setProvider(this.value);
          var provider = API_PROVIDERS[this.value];
          var isCustom = this.value === 'custom';
          // 切换自定义字段显示
          var customWrap = document.getElementById(prefix + 'customFieldsWrap');
          if (customWrap) customWrap.style.display = isCustom ? '' : 'none';
          var modelWrap = document.getElementById(prefix + 'modelSelectWrap');
          if (modelWrap) modelWrap.style.display = isCustom ? 'none' : '';
          var fetchBtn = document.getElementById(prefix + 'fetchModelsBtn');
          if (fetchBtn) fetchBtn.style.display = (provider && provider.dynamicModels && !isCustom) ? '' : 'none';
          if (!isCustom && provider && provider.models && provider.models.length > 0) {
            setModel(provider.models[0].value);
          }
          var modelSelect = document.getElementById(prefix + 'apiModelSelect');
          if (modelSelect) {
            modelSelect.innerHTML = buildModelOptionsHtml(setProvider(), setModel());
          }
          saveGame();
        });
      }
      var modelSelect = document.getElementById(prefix + 'apiModelSelect');
      if (modelSelect) {
        modelSelect.addEventListener('change', function() {
          setModel(this.value);
          saveGame();
        });
      }
      var apiKeyInput = document.getElementById(prefix + 'apiKeyInput');
      if (apiKeyInput) {
        apiKeyInput.addEventListener('input', function() {
          setKey(this.value.trim());
          if (GS.rememberApiKey) saveGame();
        });
      }
      var customEndpointInput = document.getElementById(prefix + 'customApiEndpointInput');
      if (customEndpointInput) {
        customEndpointInput.addEventListener('input', function() {
          if (setCustomEndpoint) {
            setCustomEndpoint(this.value.trim());
            if (GS.rememberApiKey) saveGame();
          }
        });
      }
      var customModelInput = document.getElementById(prefix + 'customApiModelInput');
      if (customModelInput) {
        customModelInput.addEventListener('input', function() {
          if (setCustomModel) {
            setCustomModel(this.value.trim());
            if (GS.rememberApiKey) saveGame();
          }
        });
      }
      var fetchBtn = document.getElementById(prefix + 'fetchModelsBtn');
      if (fetchBtn) {
        fetchBtn.addEventListener('click', async function() {
          var self = this;
          self.textContent = '⏳ 获取中...';
          self.disabled = true;
          try {
            var models = await fetchModels(setKey(), setProvider());
            if (models.length > 0) {
              API_PROVIDERS[setProvider()].models = models;
              setModel(models[0].value);
              var ms = document.getElementById(prefix + 'apiModelSelect');
              if (ms) ms.innerHTML = buildModelOptionsHtml(setProvider(), setModel());
              showToast('✅ 已获取 ' + models.length + ' 个模型');
            } else {
              showToast('⚠️ 未获取到模型，请检查 API Key 和提供商');
            }
          } catch (e) {
            showToast('⚠️ 获取模型失败：' + e.message);
          }
          self.textContent = '🔄 获取模型';
          self.disabled = false;
        });
      }
      var testBtn = document.getElementById(prefix + 'testApiBtn');
      if (testBtn) {
        testBtn.addEventListener('click', async function() {
          var s = document.getElementById(prefix + 'apiStatus');
          s.classList.remove('hidden', 'success', 'error', 'testing');
          s.classList.add('testing');
          s.textContent = '⏳ 正在测试连接...';
          var res = await testAPIConnection(setKey(), setProvider());
          s.classList.remove('testing');
          if (res.ok) {
            s.classList.add('success');
            s.textContent = '✅ 连接成功！API Key 有效';
          } else {
            s.classList.add('error');
            var _msg = '❌ 连接失败';
            if (res.status === 503) _msg += '（503 服务暂不可用，可能是 Alading 服务器维护或模型额度耗尽）';
            else if (res.status === 401) _msg += '（401 鉴权失败，请检查 API Key）';
            else if (res.status === 429) _msg += '（429 请求过于频繁，请稍后再试）';
            else if (res.status === 0) _msg += '（网络错误：' + (res.text || '无法连接到服务器') + '）';
            else _msg += '（HTTP ' + res.status + '：' + (res.text || '未知错误') + '）';
            s.textContent = _msg;
          }
        });
      }
      var toggleBtn = document.getElementById(prefix + 'toggleApiKeyBtn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
          var input = document.getElementById(prefix + 'apiKeyInput');
          if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '🙈';
          } else {
            input.type = 'password';
            this.textContent = '👁';
          }
        });
      }
    }
    bindApiBlockEvents('', function(v) { if (v !== undefined) GS.apiProvider = v; return GS.apiProvider; }, function(v) { if (v !== undefined) GS.apiModel = v; return GS.apiModel; }, function(v) { if (v !== undefined) GS.apiKey = v; return GS.apiKey; }, function(v) { if (v !== undefined) GS.customApiEndpoint = v; return GS.customApiEndpoint; }, function(v) { if (v !== undefined) GS.customApiModel = v; return GS.customApiModel; });
    bindApiBlockEvents('other', function(v) { if (v !== undefined) GS.apiProvider = v; return GS.apiProvider; }, function(v) { if (v !== undefined) GS.apiModel = v; return GS.apiModel; }, function(v) { if (v !== undefined) GS.apiKey = v; return GS.apiKey; }, function(v) { if (v !== undefined) GS.customApiEndpoint = v; return GS.customApiEndpoint; }, function(v) { if (v !== undefined) GS.customApiModel = v; return GS.customApiModel; });
    bindApiBlockEvents('main', function(v) { if (v !== undefined) GS.mainApiProvider = v; return GS.mainApiProvider; }, function(v) { if (v !== undefined) GS.mainApiModel = v; return GS.mainApiModel; }, function(v) { if (v !== undefined) GS.mainApiKey = v; return GS.mainApiKey; }, function(v) { if (v !== undefined) GS.mainCustomApiEndpoint = v; return GS.mainCustomApiEndpoint; }, function(v) { if (v !== undefined) GS.mainCustomApiModel = v; return GS.mainCustomApiModel; });
    var rememberCheck = document.getElementById('rememberApiKeyCheck');
    var otherRememberCheck = document.getElementById('otherrememberApiKeyCheck');
    var mainRememberCheck = document.getElementById('mainrememberApiKeyCheck');
    function handleRememberChange(checked) {
      GS.rememberApiKey = checked;
      if (!GS.rememberApiKey) {
        GS.apiKey = '';
        GS.mainApiKey = '';
        var inp = document.getElementById('apiKeyInput');
        if (inp) inp.value = '';
        var oinp = document.getElementById('otherapiKeyInput');
        if (oinp) oinp.value = '';
        var minp = document.getElementById('mainapiKeyInput');
        if (minp) minp.value = '';
      }
      saveGame();
    }
    if (rememberCheck) rememberCheck.addEventListener('change', function() { handleRememberChange(this.checked); });
    if (otherRememberCheck) otherRememberCheck.addEventListener('change', function() { handleRememberChange(this.checked); });
    if (mainRememberCheck) mainRememberCheck.addEventListener('change', function() { handleRememberChange(this.checked); });
    var aiEnabledCheck = document.getElementById('aiEnabledCheck');
    if (aiEnabledCheck) {
      aiEnabledCheck.addEventListener('change', function() {
        GS.aiEnabled = this.checked;
        saveGame();
      });
    }
    document.getElementById('step1Next').addEventListener('click', function() {
      if (!GS.apiKey.trim()) {
        showToast('请输入 API Key');
        return;
      }
      if (GS.gameMode === 'oneHeart' && GS.useSeparateApi) {
        if (!GS.mainApiKey.trim()) {
          showToast('请输入正文专用 API Key');
          return;
        }
      }
      GS.step = 2;
      saveGame();
      renderAll();
    });
    var testBtn = document.getElementById('enterTestModeBtn');
    if (testBtn) {
      testBtn.addEventListener('click', async function() {
        if (!(await showConfirmModal('进入测试版将跳过API配置和角色设定，使用随机生成的女主信息和本地预生成剧情。是否继续？'))) return;
        await enterTestMode();
      });
    }
    // Step 1 导入存档
    var step1ImportBtn = document.getElementById('step1ImportBtn');
    var step1ImportInput = document.getElementById('step1ImportInput');
    if (step1ImportBtn && step1ImportInput) {
      step1ImportBtn.addEventListener('click', function() {
        step1ImportInput.click();
      });
      step1ImportInput.addEventListener('change', async function() {
        var file = this.files[0];
        if (!file) return;
        try {
          var text = await file.text();
          var parsed = JSON.parse(text);
          if (!parsed.version || !Array.isArray(parsed.selectedMembers)) {
            showToast('⚠️ 存档文件格式无效');
            this.value = '';
            return;
          }
          var confirmed = await showConfirmModal('将载入「' + (parsed.heroineProfile ? parsed.heroineProfile.name : '?') + '」的存档（Day ' + parsed.day + '），是否继续？');
          if (!confirmed) { this.value = ''; return; }
          setGS(parsed);
          saveGame();
          renderAll();
          showToast('✅ 存档已导入');
        } catch (e) {
          showToast('⚠️ 存档文件损坏或格式错误');
        }
        this.value = '';
      });
    }
  }

  if (GS.step === 2) {
    // 公共绑定：模板下拉 + 随机按钮 + 女主档案（不分模式）
    var templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.addEventListener('change', function() {
        var tpl = HEROINE_TEMPLATES.find(function(t) { return t.id === this.value; }.bind(this));
        if (!tpl) return;
        GS.heroineProfile.name = '沈' + ['也','安','希','晴','薇','樱','琳','菲','雅','媛'][Math.floor(Math.random()*10)];
        GS.heroineProfile.age = tpl.age;
        GS.heroineProfile.job = tpl.publicIdentity;
        if (tpl.publicIdentity === '队友的妹妹' && !GS.heroineProfile.profession) {
          GS.heroineProfile.profession = '女团爱豆';
        }
        GS.heroineProfile.appearance = tpl.appearance.slice();
        GS.heroineProfile.personality = tpl.personality.slice();
        GS.heroineProfile.mbti = tpl.mbti;
        GS.heroineProfile.privateTraits = tpl.privateTraits.slice();
        GS.heroineProfile.birthday = { month: Math.floor(Math.random()*12)+1, day: Math.floor(Math.random()*28)+1 };
        GS.heroineProfile.zodiac = getZodiacFromBirthday(GS.heroineProfile.birthday.month, GS.heroineProfile.birthday.day);
        saveGame();
        renderAll();
        showToast('✅ 已套用人设模板：' + tpl.name);
      });
    }

    var randomBtn = document.getElementById('randomTemplateBtn');
    if (randomBtn) {
      randomBtn.addEventListener('click', function() {
        var identities = HEROINE_PUBLIC_IDENTITIES;
        GS.heroineProfile.name = '沈' + ['也','安','希','晴','薇','樱','琳','菲','雅','媛'][Math.floor(Math.random()*10)];
        GS.heroineProfile.age = 18 + Math.floor(Math.random()*18);
        GS.heroineProfile.job = identities[Math.floor(Math.random()*identities.length)];
        // 随机抽 2-4 项外貌
        var shuffledApp = APPEARANCE_TRAITS.slice().sort(function(){return Math.random()-0.5});
        GS.heroineProfile.appearance = shuffledApp.slice(0, 2 + Math.floor(Math.random()*3));
        // 随机抽 2 项性格
        var shuffledPer = PERSONALITY_TRAITS.slice().sort(function(){return Math.random()-0.5});
        GS.heroineProfile.personality = shuffledPer.slice(0, 2);
        // 随机 MBTI
        GS.heroineProfile.mbti = MBTI_TYPES[Math.floor(Math.random()*MBTI_TYPES.length)];
        // 50% 概率随机 0-1 项私密体质
        GS.heroineProfile.privateTraits = Math.random() < 0.5 ? [PRIVATE_TRAITS[Math.floor(Math.random()*PRIVATE_TRAITS.length)]] : [];
        GS.heroineProfile.birthday = { month: Math.floor(Math.random()*12)+1, day: Math.floor(Math.random()*28)+1 };
        GS.heroineProfile.zodiac = getZodiacFromBirthday(GS.heroineProfile.birthday.month, GS.heroineProfile.birthday.day);
        saveGame();
        renderAll();
        showToast('🎲 已随机生成女主人设');
      });
    }

    // 公开身份下拉 + 自定义输入
    var hpJobSelect = document.getElementById('hpJob');
    if (hpJobSelect) {
      hpJobSelect.addEventListener('change', function() {
        var customInput = document.getElementById('hpJobCustom');
        if (this.value === '__custom__') {
          GS.heroineProfile.job = customInput ? customInput.value.trim() : '';
          if (customInput) customInput.style.display = '';
        } else {
          GS.heroineProfile.job = this.value;
          if (customInput) { customInput.style.display = 'none'; customInput.value = ''; }
        }
        if (GS.gameMode === 'oneHeart' && this.value === '队友的妹妹' && !GS.heroineProfile.profession) {
          GS.heroineProfile.profession = '女团爱豆';
        }
        saveGame();
        renderAll();
      });
    }
    // 姐姐设定·职业子下拉监听
    var hpProfSelect = document.getElementById('hpProfession');
    if (hpProfSelect) {
      hpProfSelect.addEventListener('change', function() {
        GS.heroineProfile.profession = this.value;
        saveGame();
      });
    }
    var hpJobCustom = document.getElementById('hpJobCustom');
    if (hpJobCustom) {
      hpJobCustom.addEventListener('input', function() {
        GS.heroineProfile.job = this.value.trim();
        saveGame();
      });
    }

    // 女主档案基础字段（不分模式）
    var hpName = document.getElementById('hpName');
    if (hpName) {
      hpName.addEventListener('input', function() {
        GS.heroineProfile.name = this.value;
        saveGame();
      });
    }
    var hpAge = document.getElementById('hpAge');
    if (hpAge) {
      hpAge.addEventListener('input', function() {
        GS.heroineProfile.age = parseInt(this.value) || 25;
        saveGame();
      });
    }
    var updateZodiac = function() {
      var m = parseInt(document.getElementById('hpBirthMonth').value) || 0;
      var d = parseInt(document.getElementById('hpBirthDay').value) || 0;
      GS.heroineProfile.birthday = { month: m, day: d };
      GS.heroineProfile.zodiac = getZodiacFromBirthday(m, d);
      var disp = document.getElementById('zodiacDisplay');
      if (disp) disp.textContent = GS.heroineProfile.zodiac ? '星座：' + GS.heroineProfile.zodiac : '输入生日后自动计算星座';
      saveGame();
    };
    var hpBirthMonth = document.getElementById('hpBirthMonth');
    if (hpBirthMonth) hpBirthMonth.addEventListener('change', updateZodiac);
    var hpBirthDay = document.getElementById('hpBirthDay');
    if (hpBirthDay) hpBirthDay.addEventListener('change', updateZodiac);
    bindChipGroup('appearanceChips', function(val) {
      toggleArrayItem(GS.heroineProfile.appearance, val);
      saveGame();
    }, false);
    bindChipGroup('personalityChips', function(val) {
      toggleArrayItem(GS.heroineProfile.personality, val);
      saveGame();
    }, false);
    bindChipGroup('mbtiChips', function(val) {
      GS.heroineProfile.mbti = val;
      saveGame();
    }, true);
    bindChipGroup('privateChips', function(val) {
      toggleArrayItem(GS.heroineProfile.privateTraits, val);
      saveGame();
    }, false);

    // 模式特定绑定
    if (GS.gameMode === 'oneHeart') {
      document.querySelectorAll('#oneHeartMemberGrid .member-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          GS.oneHeartMember = this.dataset.id;
          saveGame();
          renderAll();
        });
      });
      document.getElementById('step2Next').addEventListener('click', function() {
        if (!GS.oneHeartMember) { showToast('请选择 1 位成员'); return; }
        GS.step = 3;
        saveGame();
        renderAll();
      });
      document.getElementById('step2Back').addEventListener('click', function() {
        GS.step = 1;
        saveGame();
        renderAll();
      });
    } else {
      if (GS.profileLocked) {
        // 锁定状态：只保留 hpJob 为静态显示（已用 label 替代）
      }
      document.getElementById('step2Next').addEventListener('click', function() {
        if (!GS.profileLocked) {
          GS.profileLocked = true;
          GS.secretX = '';
        }
        GS.step = 3;
        saveGame();
        renderAll();
      });
      if (!GS.profileLocked) {
        document.getElementById('step2Back').addEventListener('click', function() {
          GS.step = 1;
          saveGame();
          renderAll();
        });
      }
    }
  }

  if (GS.step === 3) {
    if (GS.gameMode === 'oneHeart') {
      var worlds = ONE_HEART_WORLDS;
      var useDropdown = worlds.length > 6;
      if (useDropdown) {
        var worldSelect = document.getElementById('worldSelect');
        if (worldSelect) {
          worldSelect.addEventListener('change', function() {
            GS.worldSetting = this.value;
            if (this.value !== 'custom') {
              GS.oneHeartCustomWorld = '';
            }
            // 身份兼容性检查
            var _compat = WORLD_IDENTITY_COMPATIBILITY[GS.worldSetting];
            if (_compat && _compat !== 'all' && GS.heroineProfile && GS.heroineProfile.job && _compat.indexOf(GS.heroineProfile.job) < 0) {
              showToast('⚠️ 当前身份「' + GS.heroineProfile.job + '」和这个世界观不太匹配，建议在 Step 2 更换身份');
            }
            saveGame();
            renderAll();
          });
        }
        var saveCustomBtn = document.getElementById('saveCustomWorldBtn');
        if (saveCustomBtn) {
          saveCustomBtn.addEventListener('click', function() {
            var input = document.getElementById('customWorldInput');
            if (input) {
              GS.oneHeartCustomWorld = input.value.trim();
              saveGame();
              showToast('✅ 世界观已保存');
              renderAll();
            }
          });
        }
        var customInput = document.getElementById('customWorldInput');
        if (customInput) {
          customInput.addEventListener('input', function() {
            var count = document.getElementById('customWorldCount');
            if (count) count.textContent = this.value.length;
          });
        }
      } else {
        document.querySelectorAll('#worldGrid .world-card').forEach(function(card) {
          card.addEventListener('click', function() {
            GS.worldSetting = this.dataset.id;
            // 身份兼容性检查
            var _compat = WORLD_IDENTITY_COMPATIBILITY[GS.worldSetting];
            if (_compat && _compat !== 'all' && GS.heroineProfile && GS.heroineProfile.job && _compat.indexOf(GS.heroineProfile.job) < 0) {
              showToast('⚠️ 当前身份「' + GS.heroineProfile.job + '」和这个世界观不太匹配，建议在 Step 2 更换身份');
            }
            saveGame();
            renderAll();
          });
        });
      }
      document.querySelectorAll('#styleGrid .style-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          GS.writingStyle = this.dataset.id;
          saveGame();
          renderAll();
        });
      });
      document.getElementById('step3Next').addEventListener('click', function() {
        var isCustomWorld = GS.worldSetting === 'custom';
        if (isCustomWorld && !GS.oneHeartCustomWorld) { showToast('请先填写并保存自定义世界观设定'); return; }
        if (!GS.worldSetting || !GS.writingStyle) { showToast('请选择世界观和写作风格'); return; }
        GS.step = 4;
        saveGame();
        renderAll();
      });
      document.getElementById('step3Back').addEventListener('click', function() {
        GS.step = 2;
        saveGame();
        renderAll();
      });
    } else {
      document.querySelectorAll('#memberGrid .member-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var id = this.dataset.id;
          if (GS.selectedMembers.indexOf(id) >= 0) {
            GS.selectedMembers = GS.selectedMembers.filter(function(x) { return x !== id; });
          } else if (GS.selectedMembers.length < 3) {
            GS.selectedMembers.push(id);
          }
          saveGame();
          renderAll();
        });
      });
      document.getElementById('step3Next').addEventListener('click', function() {
        if (GS.selectedMembers.length !== 3) return;
        GS.step = 4;
        GS.secretX = '';
        saveGame();
        renderAll();
      });
      document.getElementById('step3Back').addEventListener('click', function() {
        GS.step = 2;
        saveGame();
        renderAll();
      });
    }
  }

  if (GS.step === 4) {
    if (GS.gameMode === 'oneHeart') {
      document.getElementById('step4Start').addEventListener('click', async function() {
        if (!GS.oneHeartMember) return;
        // 身份与世界观兼容性检查
        var _compat = WORLD_IDENTITY_COMPATIBILITY[GS.worldSetting];
        if (_compat && _compat !== 'all' && GS.heroineProfile && GS.heroineProfile.job && _compat.indexOf(GS.heroineProfile.job) < 0) {
          showToast('⚠️ 身份「' + GS.heroineProfile.job + '」与世界观不匹配，请返回 Step 2 更换身份');
          return;
        }
        GS.selectedMembers = [GS.oneHeartMember];
        GS.affection = {};
        // 队友妹妹设定：开局第一次见面，女主只把男主当哥哥的队友、零心动
        GS.affection[GS.oneHeartMember] = isSisterSetting() ? randInt(0, 5) : randInt(10, 19);
        // [fix] 锁定专属昵称：读取确认页输入；留空则开局由 AI 生成唯一一个并固定（全程保持统一）
        var _petInput = document.getElementById('petNameInput');
        GS.oneHeartPetName = _petInput && _petInput.value ? _petInput.value.trim().slice(0, 12) : '';
        if (!GS.oneHeartPetName && GS.aiEnabled) {
          try {
            var _pnRes = await callDeepSeek(
              '恋爱手游里，男主会给女主起一个专属爱称（如「小柚子」「小笨蛋」「小哭包」这类「小+字」或叠字昵称）。女主名字叫「' + (GS.heroineProfile ? GS.heroineProfile.name : '你') + '」。请只返回一个最贴合的 2-4 字中文昵称，不要解释、不要标点。',
              '生成专属昵称', 50, false, 0.9
            );
            var _pn = (_pnRes || '').replace(/[^\u4e00-\u9fa5]/g, '').trim();
            if (_pn.length >= 2 && _pn.length <= 6) GS.oneHeartPetName = _pn;
          } catch (e) { /* 失败走兜底 */ }
        }
        if (!GS.oneHeartPetName) {
          // 兜底：取女主名首字，保证至少稳定（不依赖 AI）
          var _firstChar = (GS.heroineProfile && GS.heroineProfile.name) ? GS.heroineProfile.name.charAt(0) : '宝';
          GS.oneHeartPetName = '小' + _firstChar;
        }
        GS.step = 5;
        GS.day = 1;
        GS.currentDatingLocation = null;
        GS.phaseIndex = 0;
        GS.stayCount = 0;
        GS.phaseOptionCount = 0; GS.phaseFreeCount = 0;
        GS.todayFullText = [];
        GS.consequenceNarratives = [];
        GS.currentOptions = [];
        GS.phaseNarrative = '';
        GS._isGenerating = false;

        // 1v1 生成 365 天日期
        var seasonResult = generateOneHeartDates();
        GS.season = seasonResult.season;
        GS.gameMonth = seasonResult.month;
        GS.gameDates = seasonResult.dates;
        GS.currentDate = seasonResult.dates[0];
        // 初始季节根据当前月份动态确定
        var _initSeason = getSeasonByMonth(GS.currentDate.month);
        if (_initSeason) GS.season = _initSeason.season;
        GS.weather = generateDailyWeather('', GS.season);
        GS.weathers = [];
        GS._pendingEventResults = [];
        GS.oneHeartDateIdx = 0;
        // [F] 时间/时段/回合计数已移除（1v1 不再锚定具体时段）


        // 生成关系网角色 + 情敌
        var hp = GS.heroineProfile;
        var relConfig = IDENTITY_RELATION_MAP[hp.job];
        if (relConfig) {
          // 可选的 SEVENTEEN 成员（排除恋爱对象）
          var pool = MEMBERS.filter(function(m) { return m.id !== GS.oneHeartMember; });

          if (relConfig.fromSEVENTEEN) {
            // 男性：从 SEVENTEEN 选
            var pickIdx = Math.floor(Math.random() * pool.length);
            var picked = pool[pickIdx];
            GS.oneHeartRelationCharacter = {
              name: picked.name,
              role: relConfig.role,
              gender: 'male',
              memberId: picked.id,
              personality: picked.personality || '',
              behaviorLogic: picked.behaviorLogic || '',
              interactionStyle: picked.interactionStyle || '',
              birthYear: picked.birthYear || 0,
              isRival: relConfig.isRival
            };
            // 从池中移除已选的关系角色
            pool = pool.filter(function(m) { return m.id !== picked.id; });
          } else {
            // 女性：AI 生成名字 + 性格
            var genRes = '';
            try {
              genRes = await callDeepSeek(
                '为「' + hp.job + '」生成一个关系更紧密的同性角色。她作为女主剧情的一部分出现，与女主的关系是「' + relConfig.role + '」。请生成一个中文名（2-3字）和30字以内的性格描述。\n输出格式：{"name":"名字","personality":"性格描述"}',
                '生成关系角色', 200, false, 0.8
              );
            } catch (e) { genRes = ''; }
            var parsedRel;
            try { parsedRel = JSON.parse(genRes); } catch (e) {
              var rm = genRes.match(/\{[\s\S]*\}/);
              if (rm) try { parsedRel = JSON.parse(rm[0]); } catch (e2) { parsedRel = null; }
            }
            GS.oneHeartRelationCharacter = {
              name: parsedRel && parsedRel.name ? parsedRel.name : (relConfig.role === '闺蜜' ? '林小溪' : '小泉'),
              role: relConfig.role,
              gender: 'female',
              memberId: '',
              personality: parsedRel && parsedRel.personality ? parsedRel.personality : '性格温和体贴',
              behaviorLogic: relConfig.role + '，和女主关系密切',
              isRival: false
            };
          }

        // Step4 情敌选择
        if (!relConfig.needExtraRival && relConfig.isRival) {
          // 关系角色本身就是情敌（如师兄/未婚夫/上司），直接使用关系角色数据
          var _rc = GS.oneHeartRelationCharacter;
          GS.oneHeartRival = {
            name: _rc.name,
            memberId: _rc.memberId,
            personality: _rc.personality || '',
            behaviorLogic: _rc.behaviorLogic || '',
            interactionStyle: '',
            loveStyle: ''
          };
        } else {
          // needExtraRival: true，需要生成独立情敌
          var _rivalSelect = document.getElementById('rivalSelect');
          var _chosenRivalId = _rivalSelect ? _rivalSelect.value : '';
          var rivalPicked = null;
          if (_chosenRivalId) {
            // 排除已抽中关系角色的成员，避免情敌和哥哥/闺蜜是同一人
            var _relMemId = GS.oneHeartRelationCharacter ? GS.oneHeartRelationCharacter.memberId : '';
            if (_chosenRivalId !== _relMemId) {
              rivalPicked = MEMBERS.find(function(m) { return m.id === _chosenRivalId; });
            }
          }
          if (!rivalPicked && pool.length > 0) {
            var rivalIdx = Math.floor(Math.random() * pool.length);
            rivalPicked = pool[rivalIdx];
          }
          if (rivalPicked) {
            // 兜底校验：情敌不可与关系角色为同一人
            var _relId2 = GS.oneHeartRelationCharacter ? GS.oneHeartRelationCharacter.memberId : '';
            if (_relId2 && rivalPicked.id === _relId2) {
              var _altPool = pool.filter(function(m) { return m.id !== _relId2; });
              if (_altPool.length > 0) {
                rivalPicked = _altPool[Math.floor(Math.random() * _altPool.length)];
              } else {
                rivalPicked = null;
              }
            }
          }
          if (rivalPicked) {
            GS.oneHeartRival = {
              name: rivalPicked.name,
              memberId: rivalPicked.id,
              personality: rivalPicked.personality || '',
              behaviorLogic: rivalPicked.behaviorLogic || '',
              interactionStyle: rivalPicked.interactionStyle || '',
              loveStyle: rivalPicked.loveStyle || ''
            };
          }
        }
        // 最终防御检查：情敌不可与关系网角色为同一人（两者均为 SEVENTEEN 成员且有 memberId 时）
        if (GS.oneHeartRival && GS.oneHeartRival.memberId && GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.memberId) {
          if (GS.oneHeartRival.memberId === GS.oneHeartRelationCharacter.memberId) {
            console.warn('[1v1] 防御检查：情敌与关系网角色为同一人，清空情敌避免混淆', GS.oneHeartRival.memberId);
            GS.oneHeartRival = null;
          }
        }
        // [P0] 队友妹妹设定：开局第一次见面已同时认识哥哥与情敌（都是哥哥队友），
        // 置位避免后续 userMessage 注入"第一次出现"造成与前提冲突。
        if (isSisterSetting()) {
          GS._relCharIntroduced = true;
          GS._rivalIntroduced = true;
          // [seed] 基于男主真实人设，一次性生成「上心种子事件」(200字) + 专属小动作(1主+1备)
          var _seedMember = MEMBERS.find(function(m){ return m.id === GS.oneHeartMember; });
          var _seedRel = GS.oneHeartRelationCharacter;
          GS.oneHeartSeedEvent = '';
          GS.oneHeartMannerisms = [];
          // [secret] 女主秘密（EXO追星向，setup随机2-3个，作为反差萌与剧情钩子）
          var _secPool = [
            '你曾是 EXO 的粉丝，手机里至今存着当年追星时的 photo card 和应援棒',
            '你瞒着哥哥偷偷跑去 EXO 的签售会，还排了队要到了签名',
            '你高中时写过 EXO 的同人文，存在某个没告诉任何人的旧文档里',
            '你会在 SEVENTEEN 某位成员的直播间悄悄刷礼物，假装是路人粉丝',
            '你买过 EXO 的小卡、专辑和海报，藏在自己房间最里层的抽屉',
            '你偷偷收集过「' + (_seedMember ? _seedMember.name : '男主') + '」的小卡和周边，混在 EXO 周边里没人发现'
          ];
          _secPool.sort(function(){ return Math.random() - 0.5; });
          GS.heroineSecrets = _secPool.slice(0, randInt(2, 3));
          if (GS.aiEnabled && _seedMember && _seedRel) {
            try {
              var _seedPrompt =
                '你是恋爱手游编剧。背景：SEVENTEEN成员「' + _seedMember.name + '」（性格：' + (_seedMember.personality || '') +
                '；习惯：' + (_seedMember.habits || []).join('，') + '；怪习惯：' + (_seedMember.quirks || []).join('，') +
                '；口头禅：' + (_seedMember.catchphrases || []).join('，') + '）是男主，女主是他亲哥哥「' + _seedRel.name + '」的妹妹。' +
                '两人初次见面，女主只当他是哥哥队友、毫无心动，但男主已对她有意。\n请返回JSON：\n{\n' +
                '  "seed": "200字以内的「男主对女主上心的种子事件」：一个具体小场景 + 男主隐藏的心动反应，后续可在告白或吃醋时被男主回溯回忆。类型自由（如：女主无意哼了男主写的歌 / 女主帮男主解围 / 女主某句话戳中男主 / 女主被哥哥吐槽的瞬间被男主看到等），不要每次都是哼歌。",\n' +
                '  "mannerisms": ["对在意的人不自觉流露的专属小动作1（≤20字，需体现角色辨识度）","专属小动作2（≤20字）"]\n}\n只返回JSON，不要解释。';
              var _seedRes = await callDeepSeek(_seedPrompt, '生成种子事件与小动作', 600, false, 0.9);
              var _seedParsed = safeParseJson(_seedRes);
              if (_seedParsed) {
                if (_seedParsed.seed && typeof _seedParsed.seed === 'string' && _seedParsed.seed.trim().length >= 40) {
                  GS.oneHeartSeedEvent = _seedParsed.seed.trim();
                }
                if (_seedParsed.mannerisms && _seedParsed.mannerisms.length) {
                  GS.oneHeartMannerisms = _seedParsed.mannerisms
                    .filter(function(x){ return x && typeof x === 'string' && x.length <= 30; })
                    .slice(0, 2);
                }
              }
            } catch (e) { /* 失败走兜底 */ }
          }
          // 兜底：种子事件固定模板
          if (!GS.oneHeartSeedEvent) {
            GS.oneHeartSeedEvent = '练习室里女主无聊哼起男主写的一首冷门歌的副歌，男主推门听见时脚步顿了半拍——那是全专最没人记得的一首，却被她哼得正好。他没说话，只是后来录音时悄悄把那段副歌加了一轨和她哼的一样的即兴转音。';
          }
          // 兜底：从男主习惯取两条动作类小动作
          if (!GS.oneHeartMannerisms || GS.oneHeartMannerisms.length === 0) {
            GS.oneHeartMannerisms = [
              (_seedMember && _seedMember.habits && _seedMember.habits[0]) || '不自觉多看女主一眼',
              (_seedMember && _seedMember.habits && _seedMember.habits[1]) || '说话时放慢语速'
            ];
          }
        }
        }

        GS.todayHoliday = null;
        saveGame();
        if (GS.gameMode === 'oneHeart' && GS.worldSetting === 'entertainment') {
          generateOneHeartSchedule();
        }
        if (GS.aiEnabled) {
          showLoading('正在准备第一天...');
        }
        renderAll();
        if (GS.aiEnabled) {
          hideLoading();
          await generatePhaseNarrative();
          // 首段空结果自动重试，与 transfer 模式对齐，避免偶发空返回留下死空白
          if (!GS.phaseNarrative) {
            await generatePhaseNarrative();
          }
        }
      });
      document.getElementById('step4Back').addEventListener('click', function() {
        GS.step = 3;
        saveGame();
        renderAll();
      });
    } else {
      document.querySelectorAll('#xGrid .member-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          GS.secretX = this.dataset.id;
          saveGame();
          renderAll();
        });
      });
      document.getElementById('step4Start').addEventListener('click', async function() {
        if (!GS.secretX) return;
        invalidateSystemPromptCache();
      var otherMembers = GS.selectedMembers.filter(function(id) { return id !== GS.secretX; });
      GS.affection = {};
      GS.affection[GS.secretX] = randInt(35, 50);
      for (var i = 0; i < otherMembers.length; i++) {
        GS.affection[otherMembers[i]] = randInt(0, 5);
      }
      GS.step = 5;
      GS.day = 1;
      GS.phaseIndex = 0;
      GS.stayCount = 0;
      GS.phaseOptionCount = 0; GS.phaseFreeCount = 0;
      GS.todayFullText = [];
      GS.dailyFullTexts = [];
      GS.dailySummaries = [];
      GS.observerGuest = '';
      GS.observerGuestPrevious = '';
      GS.pendingDatingResult = null;
      GS.currentDatingPartner = null;
      GS.datingDiceResult = null;
      GS.day10ChosenDate = null;
      GS.pendingPromises = [];
      GS.todayRevealedInfo = '';
      GS.affectionLog = {};
      GS.prevRawText = '';
      GS.pendingMemoryReview = null;
      GS.drunkTrigger = null;
      GS.gifts = [];
      // 生成季节与12天日期
      var seasonResult = generateSeasonAndDates();
      GS.season = seasonResult.season;
      GS.gameMonth = seasonResult.month;
      GS.gameDates = seasonResult.dates;
      GS.currentDate = seasonResult.dates[0];
      // 预生成12天天气
      GS.weathers = [];
      var prevW = '';
      for (var wi = 0; wi < 12; wi++) {
        prevW = generateDailyWeather(prevW, GS.season);
        GS.weathers.push(prevW);
      }
      GS.weather = GS.weathers[0];
      GS.todayHoliday = null;
      GS.phaseNarrative = '';
      GS._isGenerating = false;
      GS.parsedNarrative = {
        narrative: '', directorOS: '', observerOS: '',
        interviews: [], memberInterviews: [], xInterviews: [], options: []
      };
      GS.currentOptions = [];
      GS.consequenceNarratives = [];
      GS.isInConsequence = false;
      saveGame();
      if (GS.aiEnabled) {
        showLoading('正在准备第一天...');
        await generateAllXArchives();
      } else {
        GS.xBackstory = 'AI未启用，X背景故事将在AI启用后生成。';
        saveGame();
      }
      await generatePhaseNarrative();
    });
    document.getElementById('step4Back').addEventListener('click', function() {
      GS.step = 3;
      saveGame();
      renderAll();
    });
    }
  }
}

export function bindChipGroup(containerId, callback, isSingle) {
  var c = document.getElementById(containerId);
  if (!c) return;
  c.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var val = this.dataset.val;
      if (isSingle) {
        c.querySelectorAll('.chip').forEach(function(x) { x.classList.remove('selected'); });
        this.classList.add('selected');
      } else {
        this.classList.toggle('selected');
      }
      callback(val);
    });
  });
}

export function toggleArrayItem(arr, val) {
  var idx = arr.indexOf(val);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(val);
}

// ==================== 游戏界面渲染 ====================
export function renderGameScreen() {
  if (GS.gameMode === 'oneHeart') {
    return renderOneHeartGameScreen();
  }
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var actionsRemaining = PHASE_ACTION_LIMIT - (GS.phaseOptionCount + GS.phaseFreeCount);
  var phaseChoicesExhausted = actionsRemaining <= 0;
  var freeInputExhausted = actionsRemaining <= 0;
  var isTruthRoundActive = GS.day === 11 && GS.truthState && GS.truthState.active;
  var html = '';

  // Header（使用 UI 组件）
  html += renderHeader();

  // 记忆审查面板（非模态可折叠）
  // 叙事（使用 UI 组件）
  html += renderNarrativeSection();

  // 制作组任务卡提示条
  if (GS.todayMissionCard && !GS.todayMissionCard.completed && GS.gameMode === 'transfer') {
    var mc = GS.todayMissionCard;
    var mcTypeLabel = mc.type === 'input' ? '✍️ 输入类' : '🏃 行动类';
    var mcTypeColor = mc.type === 'input' ? '#1565c0' : '#e65100';
    var mcHint = mc.type === 'input'
      ? '点击下方「打开任务面板」输入任务内容'
      : '通过剧情执行任务，或点击底部「🎴 做任务」按钮生成任务剧情';
    html += '<div class="card" style="border-left:3px solid #c62828;background:linear-gradient(135deg,#fce4ec,#fff3e0)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer" id="mcToggle">' +
      '<div><span style="font-size:13px;font-weight:700;color:#c62828">🎴 制作组任务卡</span>' +
      '<span style="font-size:11px;color:' + mcTypeColor + ';margin-left:6px;background:rgba(255,255,255,0.7);padding:1px 6px;border-radius:8px">' + mcTypeLabel + '</span></div>' +
      '<span id="mcToggleIcon" style="font-size:11px;color:#c62828">▾</span></div>' +
      '<div id="mcBody" style="margin-top:8px;font-size:12px;color:#5d3a3a;line-height:1.7">' +
      '<p style="margin-bottom:4px"><strong>' + escHtml(mc.name) + '</strong></p>' +
      '<p style="margin-bottom:4px">' + escHtml(mc.desc) + '</p>' +
      '<p style="font-size:11px;color:#8b6b6b">💡 ' + mcHint + '</p>' +
      '<button id="mcOpenPanelBtn" style="margin-top:8px;padding:5px 12px;border:1px solid #c62828;border-radius:6px;background:#fff;color:#c62828;font-size:11px;cursor:pointer;font-weight:600;">🎴 打开任务面板</button>' +
      '</div></div>';
  }

  // 秘密任务通知条
  if (GS.secretMission && GS.secretMission.status === 'active') {
    var smTargetName = GS.secretMission.targetMemberId ? (MEMBERS.find(function(m) { return m.id === GS.secretMission.targetMemberId; }) || {}).name : '';
    html += '<div class="card" style="border-left:3px solid #ff9800;background:linear-gradient(135deg,#fff8e1,#fff3e0)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer" id="missionToggle">' +
      '<div><span style="font-size:13px;font-weight:700;color:#e65100">📢 制作组秘密任务</span>' +
      '<span style="font-size:11px;color:#8b6b6b;margin-left:6px">（仅你可见）</span></div>' +
      '<span id="missionToggleIcon" style="font-size:11px;color:#e65100">▾</span></div>' +
      '<div id="missionBody" style="margin-top:8px;font-size:12px;color:#5d3a3a;line-height:1.7">' +
      '<p style="margin-bottom:4px"><strong>' + escHtml(GS.secretMission.title) + '</strong>' + (smTargetName ? ' · 目标：' + escHtml(smTargetName) : '') + '</p>' +
      '<p style="margin-bottom:4px">' + escHtml(GS.secretMission.description) + '</p>' +
      '<p style="font-size:11px;color:#8b6b6b">💡 提示：' + escHtml(GS.secretMission.hint) + '</p>' +
      '<button id="missionCompleteBtn" style="margin-top:8px;padding:5px 12px;border:1px solid #e65100;border-radius:6px;background:#fff;color:#e65100;font-size:11px;cursor:pointer;font-weight:600;">✅ 我已完成任务</button>' +
      '</div></div>';
  }

  // 嫉妒任务通知条
  if (GS.jealousyMission && GS.jealousyMission.day === GS.day && GS.jealousyMission.status === 'active') {
    var jm = GS.jealousyMission;
    html += '<div class="card" style="border-left:3px solid #e91e63;background:linear-gradient(135deg,#fce4ec,#f8e8e8)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<div><span style="font-size:13px;font-weight:700;color:#c2185b">📢 制作组嫉妒任务</span>' +
      '<span style="font-size:11px;color:#8b6b6b;margin-left:6px">（强制执行）</span></div></div>' +
      '<div style="margin-top:8px;font-size:12px;color:#5d3a3a;line-height:1.7">' +
      '<p style="margin-bottom:4px"><strong>' + escHtml(jm.title) + '</strong></p>' +
      '<p>' + escHtml(jm.desc) + '（目标：' + escHtml(jm.targetName) + '）</p>' +
      '<p style="font-size:11px;color:#8b6b6b;margin-top:4px">💡 其他成员好感度已发生变化</p>' +
      '</div></div>';
  }

  // 前任来电/来信通知条
  if (GS.exMessage && GS.exMessage.day === GS.day && !GS.exMessage.handled) {
    var em = GS.exMessage;
    html += '<div class="card" style="border-left:3px solid #2196f3;background:linear-gradient(135deg,#e3f2fd,#e8f4f8)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<div><span style="font-size:13px;font-weight:700;color:#1565c0">📱 突发事件</span>' +
      '<span style="font-size:11px;color:#8b6b6b;margin-left:6px">（必须选择）</span></div></div>' +
      '<div style="margin-top:8px;font-size:12px;color:#5d3a3a;line-height:1.7">' +
      '<p>' + escHtml(em.memberName) + '的手机亮了——是一条来自他前任的消息。</p>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
      '<button class="option-btn" id="exIgnore" style="flex:1;min-width:100px"><span class="opt-label">A</span>假装没看见</button>' +
      '<button class="option-btn" id="exComfort" style="flex:1;min-width:100px"><span class="opt-label">B</span>安慰他</button>' +
      '<button class="option-btn" id="exQuestion" style="flex:1;min-width:100px"><span class="opt-label">C</span>追问详情</button>' +
      '</div></div></div>';
  }

  // 选项面板（使用 UI 组件）
  html += '<div id="actionSection" style="position:relative">';
  if (GS.truthState && GS.truthState.active) {
    html += renderTruthPanel();
  } else if (GS.questionBox && GS.questionBox.active) {
    html += renderQuestionBoxPanel();
  } else {
    html += renderOptionPanel(phaseChoicesExhausted, isTruthRoundActive);
  }

  // Action Bar（使用 UI 组件）
    html += renderActionBar(GS.consequenceNarratives.length > 0, phaseChoicesExhausted, isTruthRoundActive);

  // 自由输入（使用 UI 组件）
  html += renderFreeInput(freeInputExhausted);

  // 局部 loading 遮罩（仅覆盖操作区，不遮挡剧情区）
  html += '<div id="actionLoading" class="action-loading hidden"><div class="spinner"></div><div id="actionLoadingText" style="margin-top:10px;color:#c2185b;font-weight:600;font-size:13px">加载中...</div></div>';
  html += '</div>';

  // 游戏结束
  if (GS.gameOver) {
    html += renderEndingScreen(members);
  }

  return html;
}

// ==================== 1v1 游戏界面 ====================
function renderOneHeartGameScreen() {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  var html = '';

  // Header (使用通用组件)
  html += renderHeader();

  // Narrative
  html += renderNarrativeSection();

  // 事件提醒横幅
  if (GS._pendingEvents && GS._pendingEvents.length > 0) {
    html += '<div id="pendingBanner" class="pending-banner">📌 有 ' + GS._pendingEvents.length + ' 个待处理事件</div>';
  }

  // Quick command toggle + drawer（在正文和选项之间）removed: 改为 2×3 网格按钮，选项折叠

  // 操作区浮层（合并选项+输入框+2×3网格，默认收起）
  if (!GS.gameOver) {
    var hasOptions = GS.currentOptions && GS.currentOptions.length > 0;
    html += '<div class="oneheart-operation-overlay" id="operationOverlay">' +
      '<div class="interact-area">' +
      '<div class="interact-toggle" id="operationToggle">' +
      '<span class="toggle-bar">━</span>' +
      '<span class="toggle-label">展开</span>' +
      '</div>' +
      '<div class="interact-body" id="operationBody" style="display:none">' +
      // 选项区（有事件时显示事件卡片，无事件时显示主线选项）
      '<div class="operation-options" id="operationOptions"' + (hasOptions ? '' : ' style="display:none"') + '>';
    var _hasPendingEvent = GS._pendingEvents && GS._pendingEvents.length > 0;
    if (_hasPendingEvent) {
      // 事件内嵌：渲染事件场景卡片 + 事件选项 + 忽略按钮
      var _ev = GS._pendingEvents[0];
      var _evTypeLabel = {
        jealousy: '❤️‍🔥 吃醋事件', surprise: '💝 惊喜事件', pool: '🎲 意外事件',
        rival: '💗 情敌事件', confrontation: '💢 激烈争吵', confession: '💗 他表白了',
        celebrity: '📸 路人围观', scandal: '📱 媒体风波', sick: '🤒 他生病了',
        exjealous: '📦 他吃醋了', latenight: '🌙 深夜心事'
      }[_ev.type] || '📌 事件';
      var _evMem = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
      var _evMemName = _evMem ? _evMem.name : '男主';
      var _evRivalName = (GS.oneHeartRival && GS.oneHeartRival.name) || '情敌';
      var _evTargetLabel = {
        jealousy: '涉及：' + _evMemName + '、' + (_evRivalName !== '情敌' ? _evRivalName : '情敌'),
        surprise: '与' + _evMemName + '的甜蜜时刻',
        pool: '与' + _evMemName + '之间',
        rival: '涉及：情敌 ' + _evRivalName,
        confrontation: '与' + _evMemName + '的争吵',
        confession: _evRivalName + '向女主表白',
        celebrity: _evMemName + '被路人围观',
        scandal: '你们的恋情被传播',
        sick: '照顾' + _evMemName,
        exjealous: _evMemName + '吃醋了',
        latenight: '与' + _evMemName + '的深夜对话'
      }[_ev.type] || '';
      var _evScenario = _ev.scenario || _ev.rivalName ? ('「' + _ev.rivalName + '」站在你面前，认真地看着你：他知道他没有立场说这些话——但你在他这里，从来不是路过。他表白了。') : '';
      if (_ev.type === 'confession' && !_ev.scenario) {
        _evScenario = '「' + (_ev.rivalName || '他') + '」站在你面前，认真地看着你：他知道他没有立场说这些话——但你在他这里，从来不是路过。他表白了。';
      } else {
        _evScenario = _ev.scenario || '';
      }
      html += '<div style="background:var(--bg-secondary);border-radius:12px;padding:12px;margin-bottom:10px;border-left:3px solid var(--accent-primary)">' +
        '<div style="font-size:13px;font-weight:700;color:var(--accent-primary);margin-bottom:2px">' + _evTypeLabel + '</div>' +
        (_evTargetLabel ? '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">' + _evTargetLabel + '</div>' : '') +
        '<div style="font-size:14px;color:var(--text-primary);line-height:1.7">' + escHtml(_evScenario) + '</div>' +
        '</div>';
      // 事件选项
      if (_ev.options && _ev.options.length > 0) {
        for (var eoi = 0; eoi < _ev.options.length; eoi++) {
          var _evOptText = typeof _ev.options[eoi] === 'string' ? _ev.options[eoi] : ((_ev.options[eoi] && _ev.options[eoi].text) || '');
          html += '<button class="option-btn" data-event-idx="' + eoi + '"><span class="opt-label">' + ['A','B','C'][eoi] + '</span>' + escHtml(_evOptText) + '</button>';
        }
      }
      // 忽略按钮
      html += '<button class="option-btn" data-event-idx="-1" style="background:var(--bg-secondary);color:var(--text-muted);font-size:13px"><span class="opt-label">⊘</span>忽略此次事件</button>';
    } else if (hasOptions) {
      for (var oi = 0; oi < GS.currentOptions.length; oi++) {
        var opt = GS.currentOptions[oi];
        var affTag = opt && opt.affDelta ? ' <span style="font-size:11px;color:' + (opt.affDelta > 0 ? '#2e7d32' : '#c62828') + ';font-weight:600">(' + (opt.affDelta > 0 ? '+' : '') + opt.affDelta + ')</span>' : '';
        html += '<button class="option-btn" data-idx="' + oi + '"><span class="opt-label">' + ['A','B','C'][oi] + '</span>' +
          escHtml(opt.text) + affTag + '</button>';
      }
    }
    html += '</div>' +
      // 自由输入（输入框 + 提交小方格）
      '<div style="display:flex;gap:6px;align-items:stretch">' +
      '<textarea id="freeInput" class="operation-input" placeholder="写下你想发生的一段剧情…" style="flex:1;min-height:38px;resize:none"></textarea>' +
      '<button id="btnSubmitFreeInput" class="operation-submit-sm" title="提交剧情">▶</button>' +
      '</div>' +
      '<button id="btnNewDay" class="operation-submit" style="margin-top:6px">📅 新的一天</button>' +
      // IMP-16：娱乐圈今日行程条容器（由 JS 按世界观填充）
      '<div id="oneHeartScheduleStrip"></div>' +
      // 2×3 网格
      '<div class="oneheart-action-grid">' +
      '<button class="oneheart-action-btn" data-cmd="regenerate">🔄 重新生成</button>' +
      '<button class="oneheart-action-btn" data-cmd="rewind">🔄 自由推演</button>' +
      '<button class="oneheart-action-btn" data-cmd="set_mainline">📌 设定主线</button>' +
      '<button class="oneheart-action-btn" data-cmd="mainline">📌 拉回主线</button>' +
      '<button class="oneheart-action-btn" data-cmd="random">🎲 随机事件</button>' +
      (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥' ? '<button class="oneheart-action-btn" data-cmd="brother_chat"' + (GS.oneHeartBrotherChatToday ? ' disabled style="opacity:.5;cursor:not-allowed"' : '') + '>💬 找哥哥聊聊' + (GS.oneHeartBrotherChatToday ? '（今日已聊）' : '') + '</button>' : '') +
      '<button class="oneheart-action-btn" data-cmd="ending">🏁 走向大结局</button>' +
      '</div>' +
      '</div></div></div>' +
      '<div id="actionLoading" class="action-loading hidden"><div class="spinner"></div><div id="actionLoadingText" style="margin-top:10px;color:var(--accent-primary);font-weight:600;font-size:13px">正在生成剧情...</div></div>';
  }

  // Bottom tab bar
  var _diaryDot = GS._newDiary ? '<span class="tab-notification-dot"></span>' : '';
  var _eventDot = GS._newEvents ? '<span class="tab-notification-dot"></span>' : '';
  var _momentDot = GS._newMoments ? '<span class="tab-notification-dot"></span>' : '';
  var _newsDot = GS._newNews ? '<span class="tab-notification-dot"></span>' : '';
  html += '<div class="oneheart-bottom-bar" id="oneHeartTabs">' +
    '<button class="oneheart-tab active" data-tab="story"><span class="tab-emoji">📖</span>剧情</button>' +
    '<button class="oneheart-tab" data-tab="diary" style="position:relative"><span class="tab-emoji">📝</span>日记' + _diaryDot + '</button>' +
    '<button class="oneheart-tab" data-tab="event" style="position:relative"><span class="tab-emoji">⚡</span>事件' + _eventDot + '</button>' +
    '<button class="oneheart-tab" data-tab="moments" style="position:relative"><span class="tab-emoji">📸</span>朋友圈' + _momentDot + '</button>' +
    '<button class="oneheart-tab" data-tab="news" style="position:relative"><span class="tab-emoji">📰</span>新闻' + _newsDot + '</button>' +
    '<button class="oneheart-tab" data-tab="chat" style="position:relative"><span class="tab-emoji">💬</span>聊天' + (GS._newChat ? '<span class="tab-notification-dot"></span>' : '') + '</button>' +
    '<button class="oneheart-tab" data-tab="theater"><span class="tab-emoji">🎭</span>剧场</button></div>';

  // Game over
  if (GS.gameOver) {
    var _member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
    var _memberName = _member ? _member.name : '';
    var _finalAff = GS.affection[GS.oneHeartMember] || 0;
    var _affLabel = getAffectionDesc(_finalAff);
    var _endType = GS.oneHeartEnding || 'NE';
    var _cat = (_endType && _endType.indexOf('HE') === 0) ? 'HE' : ((_endType && _endType.indexOf('BE') === 0) ? 'BE' : (_endType === 'HIDDEN_RIVAL' ? 'HIDDEN' : 'NE'));
    var _endMeta = (ONE_HEART_ENDING_TEMPLATES && ONE_HEART_ENDING_TEMPLATES[_endType]) || (ONE_HEART_ENDING_TEMPLATES && ONE_HEART_ENDING_TEMPLATES.NE);
    var _endLabel = _endMeta ? _endMeta.label : '结局';
    var _endBanner = _cat === 'HE' ? '#2e7d32' : (_cat === 'BE' ? '#c62828' : (_cat === 'HIDDEN' ? '#ad1457' : '#7b1fa2'));
    var _endIcon = _cat === 'HE' ? '💍' : (_cat === 'BE' ? '💔' : (_cat === 'HIDDEN' ? '🖤' : '🌙'));
    var _finalResult = GS.finalResult || '';
    html += '<div style="text-align:center;padding:30px 20px">' +
      '<div style="font-size:30px;margin-bottom:8px">' + _endIcon + '</div>' +
      '<div style="display:inline-block;padding:4px 16px;border-radius:20px;color:#fff;font-weight:700;font-size:16px;background:' + _endBanner + ';margin-bottom:10px">' + escHtml(_endLabel) + '</div>' +
      '<div style="font-size:20px;font-weight:700;color:var(--accent-primary);margin-bottom:6px">故事结束</div>' +
      '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">' +
      (_memberName ? '你与 ' + escHtml(_memberName) + ' 的专属故事' : '只为你心动的故事') +
      ' · 最终好感度：' + _finalAff + '（' + _affLabel + '）</div>' +
      (_finalResult ? '<div style="max-width:520px;margin:0 auto;padding:16px;background:var(--bg-card);border-radius:12px;font-size:13px;color:var(--text-primary);line-height:1.8;text-align:left">' +
      escHtml(_finalResult) + '</div>' : '') +
      (GS.endingMeters ? '<div style="max-width:520px;margin:14px auto 0;padding:12px 16px;background:var(--bg-card);border-radius:12px;font-size:12px;color:var(--text-secondary);text-align:left">' +
        '<b style="color:var(--text-primary)">📊 结局仪表盘</b><br/>' +
        '哥哥立场：' + escHtml(GS.endingMeters.brotherStance || '-') + ' · ' +
        '情敌倾向：' + (GS.endingMeters.rivalAff || 0) + ' · ' +
        '曝光风险：' + (GS.endingMeters.scandal || 0) + ' · ' +
        '男主心境值：' + (GS.endingMeters.moodValue || 0) +
      '</div>' : '') +
      '<button id="restartOneHeartBtn" style="margin-top:20px;padding:10px 24px;border:none;border-radius:10px;background:var(--accent-primary);color:#fff;font-size:14px;font-weight:600;cursor:pointer">开始新的故事</button>' +
      '</div>';
  }

  return html;
}

export function showEndingArchiveModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  var inner = '<div class="modal-content"><h3>📚 结局图鉴</h3>';
  if (!GS.endingArchive || GS.endingArchive.length === 0) {
    inner += '<p style="text-align:center;color:#8b6b6b;padding:20px 0">还没有通关记录，玩到结局后会自动保存。</p>';
  } else {
    for (var ai = GS.endingArchive.length - 1; ai >= 0; ai--) {
      var e = GS.endingArchive[ai];
      var isGood = e.endingType.indexOf('成功') >= 0;
      var isLonely = e.endingType.indexOf('独自离开') >= 0;
      var color = isLonely ? '#757575' : (isGood ? '#2e7d32' : '#c62828');
      inner += '<div style="background:#fff5f5;border-radius:12px;padding:12px;margin-bottom:10px;border-left:4px solid ' + color + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<span style="font-weight:700;font-size:14px;color:' + color + '">' + escHtml(e.endingType) + '</span>' +
        '<span style="font-size:11px;color:#8b6b6b">' + e.date + '</span></div>' +
        '<p style="font-size:12px;color:#5d3a3a;margin-top:4px">' + escHtml(e.finalChoice) + '</p>';
      if (e.affections) {
        inner += '<div style="font-size:11px;color:#8b6b6b;margin-top:4px">好感度：';
        var first = true;
        for (var aid in e.affections) {
          var aname = (MEMBERS.find(function(m) { return m.id === aid; }) || {}).name || aid;
          if (!first) inner += ' · ';
          inner += aname + ' ' + e.affections[aid];
          first = false;
        }
        inner += '</div>';
      }
      inner += '</div>';
    }
  }
  inner += '<button class="modal-close-x" id="archiveModalClose">✕</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);
  overlay.querySelector('#archiveModalClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
}

export function renderEndingScreen(members) {
  var endingType = GS.finalChoice.split(' —— ').pop() || '结局';
  var isGood = endingType.indexOf('成功') >= 0;
  var isLonely = endingType.indexOf('独自离开') >= 0;
  var bannerColor = isLonely ? '#757575' : (isGood ? '#2e7d32' : '#c62828');

  var html = '<div class="ending-screen">' +
    '<div class="ending-banner" style="background:' + bannerColor + '">' +
    '<div class="ending-banner-icon">' + (isLonely ? '💔' : '❤️') + '</div>' +
    '<div class="ending-banner-title">' + escHtml(endingType) + '</div>' +
    '<div class="ending-banner-sub">你的最终选择</div>' +
    '<div class="ending-banner-choice">' + escHtml(GS.finalChoice) + '</div>' +
    '</div>';

  // 成员反应卡片
  if (GS.endingMemberChoices && GS.endingMemberChoices.length > 0) {
    html += '<div class="ending-member-reactions">';
    html += '<h4 class="ending-section-title">成员的反应</h4>';
    for (var i = 0; i < GS.endingMemberChoices.length; i++) {
      var mc = GS.endingMemberChoices[i];
      var mem = members.find(function(m) { return m.id === mc.id; });
      if (!mem) continue;
      var isChosen = mc.id === GS.endingChosenId;
      var aff = GS.affection[mc.id] || 0;
      html += '<div class="ending-member-card' + (isChosen ? ' chosen' : '') + '">' +
        '<div class="ending-member-avatar">' + mem.emoji + '</div>' +
        '<div class="ending-member-info">' +
        '<div class="ending-member-name">' + escHtml(mem.name) +
        (isChosen ? ' <span class="ending-chosen-badge">你的选择</span>' : '') + '</div>' +
        '<div class="ending-member-affection">' + getAffectionDesc(aff) + ' (' + aff + ')</div>' +
        '<div class="ending-member-choice">' + escHtml(mc.choice) + '</div>' +
        '</div></div>';
    }
    html += '</div>';
  }

  // 好感度汇总
  html += '<div class="ending-card ending-summary">' +
    '<h4 class="ending-section-title">📊 数据总览</h4>';
  for (var j = 0; j < members.length; j++) {
    var m2 = members[j];
    var aff2 = GS.affection[m2.id] || 0;
    html += '<div class="ending-stat-row"><span class="ending-stat-label">' + m2.emoji + ' ' + m2.name +
      '</span><span>' + getAffectionDesc(aff2) + ' (' + aff2 + ')</span></div>';
  }
  if (GS.smsHistory.length > 0) {
    var smsCount = {};
    for (var s = 0; s < GS.smsHistory.length; s++) {
      var t = GS.smsHistory[s].name;
      smsCount[t] = (smsCount[t] || 0) + 1;
    }
    html += '<div class="ending-stat-row ending-stat-sms">📨 短信：';
    var first = true;
    for (var name in smsCount) {
      if (!first) html += ' · ';
      html += escHtml(name) + ' ' + smsCount[name] + '条';
      first = false;
    }
    html += '（共' + GS.smsHistory.length + '条）</div>';
  }
  html += '</div>';

  // 好感度折线图
  if (GS.affectionHistory && GS.affectionHistory.length >= 2) {
    html += '<div class="ending-card ending-chart">' +
      '<h4 class="ending-section-title">📈 好感度走势</h4>' +
      '<canvas id="affectionChart" style="width:100%;height:280px;border-radius:10px;background:var(--bg-soft,#fff5f5)"></canvas></div>';
  }

  // Epilogue
  if (GS.endingEpilogue) {
    var epiHtml = renderParsedNarrative(GS.endingEpilogue);
    if (epiHtml) {
      html += '<div class="ending-card ending-epilogue">' +
        '<h4 class="ending-section-title">📖 一年后</h4>' +
        '<div class="ending-epilogue-text">' + epiHtml + '</div></div>';
    }
  }

  // 致谢
  html += '<div class="ending-card ending-credits">' +
    '<h4 class="ending-section-title">🎬 制作组</h4>' +
    '<div class="ending-credits-text">' +
    '<p>《换乘恋爱 × SEVENTEEN》</p>' +
    '<p>感谢你参与这 12 天的旅程</p>' +
    '<p class="ending-credit-line">— 愿每个选择都不留遗憾 —</p>' +
    '</div></div>';

  // 按钮
  html += '<div class="ending-actions">' +
    '<button class="btn-primary" id="btnRestart" style="flex:1">🔄 重新开始</button>' +
    '<button class="btn-secondary" id="btnEndingArchive" style="flex:1">📚 结局图鉴</button>' +
    '<button class="btn-secondary" id="btnEndingExport" style="flex:1">📥 导出结局</button>' +
    '</div></div>';
  return html;
}

export function bindGameEvents() {
  window.showOneHeartMainlineModal = showOneHeartMainlineModal;
  // 1v1 模式事件绑定
  if (GS.gameMode === 'oneHeart') {
    bindOneHeartEvents();
    return;
  }
  // 记忆审查面板事件
  var mrToggle = document.getElementById('mrToggle');
  if (mrToggle) {
    mrToggle.addEventListener('click', function() {
      var body = document.getElementById('mrBody');
      var icon = document.getElementById('mrToggleIcon');
      if (body) {
        body.classList.toggle('hidden');
        if (icon) icon.textContent = body.classList.contains('hidden') ? '▸' : '▾';
      }
    });
  }

  document.querySelectorAll('#optionsArea .option-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var idx = parseInt(this.dataset.idx);

      // [P0-3] 真心话模式选项处理（3轮制）
      if (GS.truthState && GS.truthState.active) {
        var ts = GS.truthState;
        var drawerId = ts.drawerOrder[ts.subRound - 1];
        var isHeroineTurn = (drawerId === 'heroine');
        var optText = '';
        if (isHeroineTurn) {
          optText = idx === 0 ? '如实回答' : '拒绝回答并喝酒';
        } else {
          optText = '观看' + (MEMBERS.find(function(m){return m.id===drawerId})||{}).name + '的回合';
        }
        this.innerHTML = '<span class="opt-label">⋯</span>';
        document.querySelectorAll('#optionsArea .option-btn').forEach(function(b) { b.disabled = true; });
        await handleTruthRound({ text: optText });
        return;
      }

      // 匿名提问箱选项处理
      if (GS.questionBox && GS.questionBox.active) {
        this.innerHTML = '<span class="opt-label">⋯</span>';
        document.querySelectorAll('#optionsArea .option-btn').forEach(function(b) { b.disabled = true; });
        if (idx === 0) {
          await handleQuestionBoxChoice({ text: '如实回答' });
        } else {
          await handleQuestionBoxChoice({ text: '拒绝回答并喝酒' });
        }
        return;
      }

      var opt = GS.currentOptions[idx];
      if (!opt) return;

      // 处理「进入约会场景」按钮
      if (opt.text.indexOf('进入约会场景') >= 0) {
        this.innerHTML = '<span class="opt-label">⋯</span>';
        document.querySelectorAll('#optionsArea .option-btn').forEach(function(b) { b.disabled = true; });
        GS.phaseIndex = 1; // 跳到下午
        resetPhaseState();
        saveGame();
        renderAll();
      await generatePhaseNarrative();
      if (!GS.phaseNarrative && GS.aiEnabled) {
        console.warn('[setup] first generation empty, retrying...');
        await generatePhaseNarrative();
      }
        return;
      }

      this.innerHTML = '<span class="opt-label">⋯</span>';
      document.querySelectorAll('#optionsArea .option-btn').forEach(function(b) { b.disabled = true; });
      await handleOptionChoice(opt);
    });
  });

  var regenBtn = document.getElementById('btnRegenerate');
  if (regenBtn) {
    regenBtn.addEventListener('click', async function() {
      this.disabled = true;
      await handleRegenerate();
      this.disabled = false;
    });
  }

  var skipTruthBtn = document.getElementById('btnSkipTruth');
  if (skipTruthBtn) {
    skipTruthBtn.addEventListener('click', function() {
      this.disabled = true;
      if (window.skipTruthRound) {
        window.skipTruthRound();
      }
      this.disabled = false;
    });
  }

  var skipBtn = document.getElementById('btnSkip') || document.getElementById('btnNextPhase');
  if (skipBtn) {
    skipBtn.addEventListener('click', async function() {
      if (GS._advancingPhase) { console.log('[skip btn] already advancing, skip'); return; }
      this.disabled = true;
      await advancePhase();
      this.disabled = false;
    });
  }

  // 做任务按钮（行动类任务卡）
  var doTaskBtn = document.getElementById('btnDoTask');
  if (doTaskBtn) {
    doTaskBtn.addEventListener('click', async function() {
      this.disabled = true;
      await doActionTask();
      this.disabled = false;
    });
  }

  var smsBtn = document.getElementById('btnSms');
  if (smsBtn) smsBtn.addEventListener('click', function() { showSmsModal(); });

  var midnightCallBtn = document.getElementById('btnMidnightCall');
  if (midnightCallBtn) midnightCallBtn.addEventListener('click', function() { showMidnightCallModal(handleMidnightCall); });

  var nextDayBtn = document.getElementById('btnNextDay');
  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', async function() {
      this.disabled = true;
      await goToNextDay();
      this.disabled = false;
    });
  }

  var contBtn = document.getElementById('btnContinue');
  if (contBtn) {
    contBtn.addEventListener('click', async function() {
      this.disabled = true;
      await continueToday();
      this.disabled = false;
    });
  }

  // [NEW] 设置按钮 → 设置面板（含API/主题/速度/存档/重置）
  var settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', showApiSettingsModal);

  // [NEW] 帮助按钮 → Tab弹窗（规则速览+使用说明）
  var helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', showHelpMergedModal);

  // [NEW] 回顾按钮 → Tab弹窗（历史剧情+短信历史）
  var reviewBtn = document.getElementById('reviewBtn');
  if (reviewBtn) reviewBtn.addEventListener('click', showReviewModal);

  // [NEW] 档案按钮 → Tab弹窗（X档案+记忆物品+心动笔记+秘密任务）
  var archiveBtn = document.getElementById('archiveBtn');
  if (archiveBtn) archiveBtn.addEventListener('click', showArchiveModal);

  // [NEW] 任务面板按钮 → 统一任务面板（任务卡+秘密任务）
  var taskPanelBtn = document.getElementById('taskPanelBtn');
  if (taskPanelBtn) taskPanelBtn.addEventListener('click', showTaskPanel);

  // [P0-2] 小礼物面板
  var giftBtn = document.getElementById('giftBtn');
  if (giftBtn) giftBtn.addEventListener('click', showGiftPanel);

  // 制作组任务卡提示条折叠 + 打开面板
  var mcToggle = document.getElementById('mcToggle');
  if (mcToggle) {
    mcToggle.addEventListener('click', function() {
      var body = document.getElementById('mcBody');
      var icon = document.getElementById('mcToggleIcon');
      if (body) {
        body.classList.toggle('hidden');
        if (icon) icon.textContent = body.classList.contains('hidden') ? '▸' : '▾';
      }
    });
  }
  var mcOpenPanelBtn = document.getElementById('mcOpenPanelBtn');
  if (mcOpenPanelBtn) mcOpenPanelBtn.addEventListener('click', showTaskPanel);

  // 秘密任务通知条折叠
  var missionToggle = document.getElementById('missionToggle');
  if (missionToggle) {
    missionToggle.addEventListener('click', function() {
      var body = document.getElementById('missionBody');
      var icon = document.getElementById('missionToggleIcon');
      if (body) {
        body.classList.toggle('hidden');
        if (icon) icon.textContent = body.classList.contains('hidden') ? '▸' : '▾';
      }
    });
  }

  // 秘密任务手动完成
  var missionCompleteBtn = document.getElementById('missionCompleteBtn');
  if (missionCompleteBtn) {
    missionCompleteBtn.addEventListener('click', async function() {
      if (this.disabled) return;
      if (await showConfirmModal('确认已完成「' + GS.secretMission.title + '」任务？')) {
        completeSecretMission();
        if (window.__renderAll) window.__renderAll();
      }
    });
  }

  // 午夜电话记录按钮
  var midnightCallRecordBtn = document.getElementById('midnightCallRecordBtn');
  if (midnightCallRecordBtn) {
    midnightCallRecordBtn.addEventListener('click', async function() {
      var mc = GS.midnightCall;
      if (!mc || !mc.targetId) return;

      // Day 7：首次点击时生成成员反馈（调用 AI）
      if (GS.day === 7 && !mc.feedback && mc.status === 'done' && mc.content) {
        var target = MEMBERS.find(function(m) { return m.id === mc.targetId; });
        if (target && GS.aiEnabled) {
          showLoading('正在生成成员的反馈...');
          try {
            var prompt = '你正在扮演《换乘恋爱》的成员' + target.name + '（' + target.stageName + '）。' +
              '昨晚的心动小屋出现了午夜匿名电话亭，你接到了一个匿名电话，对方说了一段话。' +
              '你在节目中，不知道对方是谁，但隐约能感受到对方的情绪。' +
              '电话内容如下：\n"' + mc.content + '"\n\n' +
              '请以第一人称「我」写一段你的内心独白（50-80字），表达你在挂断电话后第二天回想起来时的真实感受。' +
              '不要写选项、不要写采访间格式、不要写导演OS，只输出内心独白的正文。';
            var feedback = await callDeepSeek('你是《换乘恋爱》的成员，请根据要求输出内心独白。', prompt, 500, false, 0.7);
            mc.feedback = feedback;
            saveGame();
          } catch (e) {
            console.warn('[midnightCall] 反馈生成失败:', e);
          }
          hideLoading();
        }
      }
    });
  }

  // ==================== 1v1 设定主线大弹窗 ====================
function showOneHeartMainlineModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content" style="max-width:480px">' +
    '<h3 style="margin:0 0 12px;font-size:16px;color:var(--text-primary)">📌 设定主线方向</h3>' +
    '<p style="font-size:12px;color:var(--text-muted);margin:0 0 12px">设定后 AI 会在每次生成剧情时记住这个方向。如果剧情偏离了，用「拉回主线」按钮拉回来。</p>' +
    '<textarea id="mainlineTextarea" placeholder="例如：我想发展一段温馨的日常，他想要向我告白但犹豫不决……" style="width:100%;min-height:100px;padding:10px;border:1.5px solid var(--border-primary);border-radius:10px;font-size:13px;font-family:inherit;background:var(--bg-card);color:var(--text-primary);resize:vertical;box-sizing:border-box">' + escHtml(GS.oneHeartMainLine || '') + '</textarea>' +
    '<div style="display:flex;gap:8px;margin-top:12px">' +
    '<button id="mainlineSaveBtn" class="btn-primary" style="flex:1">保存</button>' +
    '<button id="mainlineCancelBtn" class="btn-secondary" style="flex:1">取消</button></div></div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#mainlineCancelBtn').onclick = function() { overlay.remove(); };
  overlay.querySelector('#mainlineSaveBtn').onclick = function() {
    var val = (document.getElementById('mainlineTextarea') || {}).value || '';
    GS.oneHeartMainLine = val.trim();
    saveGame();
    showToast('📌 主线已设定');
    overlay.remove();
  };
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}
window.showOneHeartMainlineModal = showOneHeartMainlineModal;


  var affHint = document.getElementById('affectionHint');
  if (affHint) affHint.addEventListener('click', showAffectionPanel);

  var saveInputBtn = document.getElementById('btnSaveInput');
  if (saveInputBtn) {
    saveInputBtn.addEventListener('click', function() {
      GS.freeInput = (document.getElementById('freeInput') || {}).value || '';
      saveGame();
      showToast('✅ 已保存');
    });
  }

  var clearInputBtn = document.getElementById('btnClearInput');
  if (clearInputBtn) {
    clearInputBtn.addEventListener('click', function() {
      GS.freeInput = '';
      var input = document.getElementById('freeInput');
      if (input) input.value = '';
      saveGame();
    });
  }

  var actInputBtn = document.getElementById('btnActInput');
  if (actInputBtn) {
    actInputBtn.addEventListener('click', async function() {
      var inputText = ((document.getElementById('freeInput') || {}).value || '').trim();
      if (!inputText) {
        showToast('请先写下你想发生的一段剧情');
        return;
      }
      this.disabled = true;
      await handleFreeAction(inputText);
      this.disabled = false;
      // 提交后清空输入框
      var freeInputEl = document.getElementById('freeInput');
      if (freeInputEl) freeInputEl.value = '';
    });
  }

  var restartBtn = document.getElementById('btnRestart');
  if (restartBtn) {
    restartBtn.addEventListener('click', function() {
      resetGame();
      renderAll();
    });
  }

  var endingArchiveBtn = document.getElementById('btnEndingArchive');
  if (endingArchiveBtn) {
    endingArchiveBtn.addEventListener('click', showEndingArchiveModal);
  }

  var endingExportBtn = document.getElementById('btnEndingExport');
  if (endingExportBtn) {
    endingExportBtn.addEventListener('click', function() {
      var text = '=== 换乘恋爱 — 结局记录 ===\n\n';
      text += '最终选择：' + GS.finalChoice + '\n\n=== 结局叙事 ===\n';
      if (GS.todayFullText) text += GS.todayFullText.join('\n\n');
      if (GS.endingEpilogue) {
        text += '\n\n=== 一年后 ===\n';
        var epiText = GS.endingEpilogue.narrative || '';
        text += epiText;
      }
      text += '\n\n=== 成员好感度 ===\n';
      var mems = GS.selectedMembers.map(function(id) {
        return MEMBERS.find(function(m) { return m.id === id; });
      });
      for (var ei = 0; ei < mems.length; ei++) {
        var mem = mems[ei];
        if (mem) text += mem.name + '：' + (GS.affection[mem.id] || 0) + '\n';
      }
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '换乘恋爱_结局_' + GS.finalChoice.replace(/[❤️💔]/g, '').trim().slice(0, 10) + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    });
  }

  // 前任来电/来信事件绑定
  var exIgnore = document.getElementById('exIgnore');
  if (exIgnore) exIgnore.addEventListener('click', function() { handleExMessageChoice('ignore'); });
  var exComfort = document.getElementById('exComfort');
  if (exComfort) exComfort.addEventListener('click', function() { handleExMessageChoice('comfort'); });
  var exQuestion = document.getElementById('exQuestion');
  if (exQuestion) exQuestion.addEventListener('click', function() { handleExMessageChoice('question'); });
}

export function scrollToLatestContent() {
  setTimeout(function() {
    // 优先滚动到记忆审查面板（如果存在）
    var mrBody = document.getElementById('mrBody');
    if (mrBody) {
      mrBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // 优先滚动到最新剧情区域
    var newContent = document.getElementById('narrativeNewContent');
    if (newContent) {
      newContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var box = document.getElementById('narrativeBox');
    if (!box) return;
    // 其次：最后一个 consequence-item
    var items = box.querySelectorAll('.consequence-item');
    if (items.length > 0) {
      items[items.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // 兜底：旧格式 .separator
    var separators = box.querySelectorAll('.separator');
    if (separators.length > 0) {
      separators[separators.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // 无匹配时不滚动，保持从顶部开始阅读
  }, 100);
}

// ==================== 激活码鉴权界面 ====================
export function renderAuthScreen(errorMsg) {
  var savedCode = getSavedCode();
  var remember = isRememberCode();
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="setup-step" style="text-align:center;max-width:400px;margin:0 auto;padding-top:60px">' +
    '<h2>🔐 激活验证</h2>' +
    '<p class="step-desc">请输入你的激活码以开始游戏</p>' +
    '<div style="margin:20px 0">' +
    '<input type="text" id="authCodeInput" placeholder="输入激活码..." value="' + escHtml(savedCode) + '" ' +
    'style="width:100%;padding:12px 16px;border:1.5px solid #e0c0c0;border-radius:12px;font-size:15px;text-align:center;letter-spacing:1px">' +
    '</div>' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:14px">' +
    '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;color:#5d3a3a;margin:0">' +
    '<input type="checkbox" id="rememberCodeCheck" ' + (remember ? 'checked' : '') + '> 记住激活码（仅保存到本地浏览器）</label>' +
    '</div>' +
    (errorMsg ? '<p id="authError" style="color:#e91e63;font-size:13px;margin-bottom:12px">❌ ' + escHtml(errorMsg) + '</p>' : '<p id="authError" style="color:#e91e63;font-size:13px;margin-bottom:12px;min-height:20px"></p>') +
    '<button class="btn-primary" id="authSubmit" style="width:100%;margin-bottom:10px">激活</button>' +
    '<p style="font-size:11px;color:#8b6b6b">每个激活码最多绑定 3 台设备</p>' +
    '</div>';
}

export function bindAuthEvents(onSuccess) {
  var submitBtn = document.getElementById('authSubmit');
  var input = document.getElementById('authCodeInput');
  var errorEl = document.getElementById('authError');
  var rememberCheck = document.getElementById('rememberCodeCheck');

  async function doActivate() {
    var code = (input.value || '').trim();
    if (!code) {
      errorEl.textContent = '❌ 请输入激活码';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '验证中...';
    var result = await activateCode(code);
    if (result.success) {
      saveCodePreference(rememberCheck && rememberCheck.checked, code);
      errorEl.textContent = '';
      errorEl.style.color = '#4caf50';
      errorEl.textContent = '✅ 激活成功！';
      setTimeout(onSuccess, 300);
    } else {
      errorEl.style.color = '#e91e63';
      errorEl.textContent = '❌ ' + (result.error || '激活失败');
      submitBtn.disabled = false;
      submitBtn.textContent = '激活';
    }
  }

  if (submitBtn) submitBtn.addEventListener('click', doActivate);
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doActivate();
    });
    input.focus();
  }
}

// ==================== 测试版快速入口 ====================

var TEST_HEROINE_NAMES = ['沈也', '林知', '夏晚', '顾言', '苏晴', '江念', '白澄', '宋予'];
var TEST_JOBS = ['插画师', '编辑', '摄影师', '咖啡师', '设计师', '翻译', '程序员', '自由撰稿人'];

var TEST_X_BACKSTORIES = {
  generic: '相识经过：两人在一次朋友聚会上认识，因为都喜欢深夜便利店的氛围而开始聊天。\n\n' +
    '恋爱关键回忆：\n- 第一次约会是在凌晨的便利店，他给她倒了一杯温水。\n- 他记得她喝温水、不吃芒果、容易紧张时摸手腕。\n- 他们有一个暗语：「便利店见」，意思是「我想你了」。\n\n' +
    '分手原因：聚少离多，他太忙，她太安静。最后一次见面是在机场，他说「好」，她说「算了」。分手后一年没有联系。\n\n' +
    '【隐藏信息】\n他其实下飞机后打车回了她家楼下，在车里坐了一小时，没上楼。他保留了所有聊天记录，包括她撤回的那条「我后悔了」。他不知道自己为什么要来参加这个节目，但收到邀请信的时候，第一反应是：她会不会也在。'
};

var TEST_X_ITEMS = {
  generic: '【记忆物品1】\n名称：半杯温水\n样式：透明玻璃杯，杯壁上有浅浅的水渍痕迹\n故事：分手后她最后一次去他家，他习惯性倒了一杯温水放在茶几上。她没喝，他也没收。那杯水在桌上放了一整晚，直到凌晨蒸发了一半。\n\n' +
    '【记忆物品2】\n名称：便利店收据\n样式：7-11的热敏纸小票，字迹已经有点褪色\n故事：他们第一次约会后去便利店买关东煮，他把她没吃完的年糕串包进纸巾里带走。这张收据是他从口袋里翻出来的，上面还有当时的日期和时间：凌晨1:47。'
};

var TEST_MEMBER_X_BACKSTORIES = {
  scoups: '场外X：温柔型女性，聚少离多分手。他心怀愧疚，总觉得是自己陪得不够。',
  jeonghan: '场外X：独立型女性，因「他过度照顾」而感到压力分手。他至今不知道自己哪里做错了。',
  joshua: '场外X：海外背景女性，长期异地分手。文化差异让他们对「亲密」的理解完全不同。',
  jun: '场外X：主动型女性，沟通模式不匹配分手。她觉得他太安静，他觉得她太累。',
  hoshi: '场外X：能接受他热情的女性，因「他总忘记吃饭」而疲惫分手。她走之前留了张便利贴：「记得吃饭」。',
  wonwoo: '场外X：知性型女性，性格不合分手。表面和平分手，但他保留了所有聊天记录。',
  woozi: '场外X：理解他但最终疲惫的女性。她说「你很好，但你的世界太小了」。',
  dk: '场外X：开朗型女性，因「他对所有人都一样好」而分手。她想要的是「只对我好」。',
  mingyu: '场外X：活泼型女性，聚少离多分手。他最后一次见她是三个月前，她已经有了新的约会对象。',
  the8: '场外X：艺术相关女性，精神共鸣减弱分手。她说「我们不再聊同一件事了」。',
  seungkwan: '场外X：能看穿他内心的女性，沟通不畅分手。她走之前说「你能不能认真一次」。',
  vernon: '场外X：艺术型女性，精神层面渐行渐远分手。她听不懂他聊的音乐，他也看不懂她画的画。',
  dino: '场外X：同龄或年下女性，因「他太忙且不够成熟」分手。她说「你先长大吧」。'
};

var TEST_MEMBER_X_ITEMS = {
  scoups: '1. 褪色的手环——她送的生日礼物，他戴了两年，接口处已经磨损。\n2. 演唱会门票存根——她第一次来看他演出，票根上还有她的指纹。',
  jeonghan: '1. 护手霜——她常用的那支薰衣草味，他偶然在便利店看到就买了，从没打开过。\n2. 雨伞——两人共撑过的那把，断了一根骨架，他没扔。',
  joshua: '1. 吉他拨片——她在美国买的，背面刻着两人名字缩写。\n2. 教堂礼拜单——她第一次去教堂听他弹琴，把单子折成了纸鹤。',
  jun: '1. 螺蛳粉包装袋——她陪他吃的第一碗，包装袋被压平夹在书里。\n2. 武术表演视频U盘——她录的，他练完棍法后冲镜头笑了一下。',
  hoshi: '1. 老虎发箍——她逛街时买的，说他跳舞时像老虎。\n2. 舞鞋——她偷偷放进他包里的，鞋垫上用马克笔写着「加油」。',
  wonwoo: '1. 眼镜布——她绣的，角落有个小小的「W」。\n2. 游戏手柄——两人一起打通关的那只，右摇杆有点漂移。',
  woozi: '1. 耳机线缠绕器——她手工做的，小熊形状，线已经缠不上了。\n2. 便利店饭团包装——他写歌错过饭点，她半夜送来的，包装上有她的字迹「趁热」。',
  dk: '1. 音乐剧节目册——她陪他看的第一场，他在她名字旁边画了颗心。\n2. 润喉糖铁盒——她知道他嗓子容易哑，走之前塞了满满一盒。',
  mingyu: '1. 围裙——她嫌他做饭总溅油，买了条印着小花的。\n2. 食谱便签——她手写的咖喱做法，第三步被水渍晕开了。',
  the8: '1. 茶则——她送的第一套茶具里的，竹制的，用了三年有了包浆。\n2. 素描本——她画了他的侧脸，只画了轮廓，没画眼睛。',
  seungkwan: '1. 橘子钥匙扣——济州岛买的，说看到橘子就想到她。\n2. 综艺截图——她帮他截的第一次上综艺的画面，背后写着「我的明星」。',
  vernon: '1. 黑胶唱片——她听不懂但陪他逛了一下午唱片店挑的。\n2. 滑板轮——她摔坏的那块板子上拆下来的，轴承还顺滑。',
  dino: '1. 练习室门禁卡——她偷偷复制了一张，方便给他送宵夜。\n2. 舞蹈视频截图——她打印出来的，他在C位，她在空白处写了「最棒」。'
};

export async function enterTestMode() {
  // 1. 随机生成女主信息
  var hp = GS.heroineProfile;
  hp.name = TEST_HEROINE_NAMES[randInt(0, TEST_HEROINE_NAMES.length - 1)];
  hp.age = randInt(22, 30);
  hp.job = TEST_JOBS[randInt(0, TEST_JOBS.length - 1)];
  var bm = randInt(1, 12);
  var bd = randInt(1, 28);
  hp.birthday = { month: bm, day: bd };
  hp.zodiac = getZodiacFromBirthday(bm, bd);
  hp.appearance = [];
  var appTraits = APPEARANCE_TRAITS.slice();
  for (var a = 0; a < 3; a++) {
    var idx = randInt(0, appTraits.length - 1);
    hp.appearance.push(appTraits.splice(idx, 1)[0]);
  }
  hp.personality = [];
  var perTraits = PERSONALITY_TRAITS.slice();
  for (var p = 0; p < 2; p++) {
    var idx2 = randInt(0, perTraits.length - 1);
    hp.personality.push(perTraits.splice(idx2, 1)[0]);
  }
  hp.mbti = MBTI_TYPES[randInt(0, MBTI_TYPES.length - 1)];
  hp.privateTraits = [];
  if (Math.random() < 0.5) {
    var idx3 = randInt(0, PRIVATE_TRAITS.length - 1);
    hp.privateTraits.push(PRIVATE_TRAITS[idx3]);
  }
  GS.profileLocked = true;

  // 2. 随机选3个成员
  var allIds = MEMBERS.map(function(m) { return m.id; });
  var selected = [];
  while (selected.length < 3) {
    var r = allIds[randInt(0, allIds.length - 1)];
    if (selected.indexOf(r) < 0) selected.push(r);
  }
  GS.selectedMembers = selected;

  // 3. 随机选1个X
  GS.secretX = selected[randInt(0, 2)];

  // 4. 设置测试模式
  GS.testMode = true;
  GS.aiEnabled = true;
  GS.apiKey = '';

  // 5. 初始化好感度
  var otherMembers = selected.filter(function(id) { return id !== GS.secretX; });
  GS.affection = {};
  GS.affection[GS.secretX] = randInt(35, 50);
  for (var i = 0; i < otherMembers.length; i++) {
    GS.affection[otherMembers[i]] = randInt(0, 5);
  }

  // 6. 初始化游戏状态
  GS.step = 5;
  GS.day = 1;
  GS.phaseIndex = 0;
  GS.stayCount = 0;
  GS.phaseOptionCount = 0; GS.phaseFreeCount = 0;
  GS.todayFullText = [];
  GS.dailyFullTexts = [];
  GS.dailySummaries = [];
  GS.observerGuest = '';
  GS.observerGuestPrevious = '';
  GS.pendingDatingResult = null;
  GS.currentDatingPartner = null;
  GS.datingDiceResult = null;
  GS.day10ChosenDate = null;
  GS.pendingPromises = [];
  GS.todayRevealedInfo = '';
  GS.affectionLog = {};
  GS.prevRawText = '';
  GS.pendingMemoryReview = null;
  GS.drunkTrigger = null;
  GS.consequenceNarratives = [];
  GS.currentOptions = [];
  GS.phaseNarrative = '';
  GS.smsSentToday = false;
  GS.smsHistory = [];
  GS.freeInput = '';
  GS.xItemsRevealState = {};
  GS.xItems = {};
  GS.secretMission = null;
  GS.secretMissionInteracted = false;
  GS.secretMissionHistory = [];
  GS.todayMissionCard = null;
  GS.missionCardHistory = [];
  GS.missionCardUsedIds = [];
  GS.pendingTaskResult = null;
  GS.jealousyMission = null;
  GS.jealousyMissionTriggeredDays = [];
  if (GS.day >= 8) GS.midnightCall = null;
  GS.questionBox = null;
  GS.truthPunishment = null;
  GS.truthState = null;
  GS.drinkCounts = {};
  GS.todayRandomEventTriggered = false;

  // 7. 生成季节与12天日期
  var seasonResult = generateSeasonAndDates();
  GS.season = seasonResult.season;
  GS.gameMonth = seasonResult.month;
  GS.gameDates = seasonResult.dates;
  GS.currentDate = seasonResult.dates[0];
  GS.weathers = [];
  var prevW = '';
  for (var wi = 0; wi < 12; wi++) {
    prevW = generateDailyWeather(prevW, GS.season);
    GS.weathers.push(prevW);
  }
  GS.weather = GS.weathers[0];
  GS.todayHoliday = null;

  // 8. 加载本地 X 档案和物品
  GS.xBackstory = TEST_X_BACKSTORIES.generic;
  GS.xBackstoryHidden = '他其实下飞机后打车回了她家楼下，在车里坐了一小时，没上楼。他保留了所有聊天记录，包括她撤回的那条「我后悔了」。';
  GS.xItems[GS.secretX] = TEST_X_ITEMS.generic;

  for (var mi = 0; mi < otherMembers.length; mi++) {
    var mid = otherMembers[mi];
    GS.memberXBackstories[mid] = TEST_MEMBER_X_BACKSTORIES[mid] || '场外X档案（测试数据）。';
    GS.xItems[mid] = TEST_MEMBER_X_ITEMS[mid] || '记忆物品（测试数据）。';
  }

  // 9. 加载初始剧情（测试版从剧情记录文件读取 Day 1 上午）
  try {
    var sceneJson = await loadTestScene('phase');
    if (sceneJson) {
      GS.phaseNarrative = sceneJson;
      GS.parsedNarrative = parseNarrative(sceneJson);
      GS.pendingAffChanges = GS.parsedNarrative.affChanges || [];
      GS.currentOptions = GS.parsedNarrative.options;
      GS.consequenceNarratives = [];
      GS.isInConsequence = false;
      GS.phaseOptionCount = 0; GS.phaseFreeCount = 0;
      var phaseTagMap = { morning: '【上午】', afternoon: '【下午】', evening: '【傍晚】', night: '【深夜】' };
      GS.todayFullText.push((phaseTagMap[PHASES[GS.phaseIndex]] || '') + sceneJson);
      GS.mainInterview = (GS.parsedNarrative.interviews || []).join(' ').slice(0, 100);
      GS.prevSummary = sceneJson.slice(0, 200);
      GS.prevRawText = sceneJson;
    }
  } catch (e) {
    console.warn('测试模式加载初始剧情失败:', e);
  }

  // 10. 渲染
  invalidateSystemPromptCache();
  saveGame();
  renderAll();
}

// ==================== 1v1 事件绑定 ====================

// IMP-16：渲染娱乐圈今日行程条 + 探班按钮（仅娱乐圈世界观）
function renderOneHeartActions() {
  // [F] 移除 24h 行程条：探班/约会改为独立按钮（与时钟/空档/疲劳概念脱钩）
  var box = document.getElementById('oneHeartScheduleStrip');
  if (!box) return;
  if (GS.gameMode !== 'oneHeart' || GS.worldSetting !== 'entertainment') {
    box.innerHTML = '';
    return;
  }
  // [约会按钮已移除] 约会已融入叙事选项（sceneType===date），由 applyDateEffects 取代
  var _visitLocked = GS.oneHeartVisitLocked === 'done' || !!GS.oneHeartDateToday; // 与约会互斥、每天一次
  var html = '<div style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
  html += '<button id="btnOneHeartVisit" class="oneheart-action-btn"' + (_visitLocked ? ' disabled style="opacity:.5;cursor:not-allowed"' : '') + '>🎬 探班' + (GS.oneHeartDateToday ? '（今日已约）' : (_visitLocked ? '（今日已探）' : '')) + '</button>';
  // 哥哥立场 + 曝光风险指示（保留信息可视化，去掉时段/行程条）
  if (GS.oneHeartRelationCharacter && GS.oneHeartRelationCharacter.role === '哥哥') {
    var _bs = GS.brotherStance || 'consultant';
    var _bsText = { consultant: '参谋', supportive: '支持', testing: '试探', protective: '忧被察觉' }[_bs] || '参谋';
    var _bhome = GS.brotherAtHome ? '🏠在家' : '✈️不在家(空档)';
    var _risk = GS.exposureRisk || 0;
    var _riskColor = _risk >= 60 ? '#ff6b6b' : (_risk >= 30 ? '#ffb84d' : '#9ad0a0');
    html += '<span style="font-size:11px;color:#b9aee0">🤝哥哥立场：' + _bsText + ' · ' + _bhome + ' · 🔥绯闻热度 ' + _risk + '/100</span>';
  }
  html += '</div>';
  box.innerHTML = html;
  var visitBtn = document.getElementById('btnOneHeartVisit');
  if (visitBtn && !_visitLocked) {
    visitBtn.addEventListener('click', function() { doVisitMember(); });
  }
}

function switchOneHeartTab(tab) {
  var target = document.querySelector('.oneheart-tab[data-tab="' + tab + '"]');
  if (target) target.click();
}

function bindOneHeartEvents() {
  // 注册新闻 modal 的 tab 切换回调
  if (typeof setSwitchOneHeartTab === 'function') setSwitchOneHeartTab(switchOneHeartTab);
  // 更新约会/探班按钮锁定文案
  var _visitBtn = document.getElementById('btnOneHeartVisit');
  if (_visitBtn && GS.oneHeartDateToday) _visitBtn.innerHTML = '🎬 探班（今日已约）';
  renderOneHeartActions();

  // 操作区浮层 toggle（默认收起）
  var operationToggle = document.getElementById('operationToggle');
  var operationBody = document.getElementById('operationBody');
  if (operationToggle && operationBody) {
    operationToggle.addEventListener('click', function() {
      var isHidden = operationBody.style.display === 'none';
      operationBody.style.display = isHidden ? 'block' : 'none';
      var label = operationToggle.querySelector('.toggle-label');
      if (label) label.textContent = isHidden ? '收起' : '展开';
    });
  }

  // 选项（1v1 简化处理）
  document.querySelectorAll('#operationOptions .option-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var idx = parseInt(this.dataset.idx);
      var opt = GS.currentOptions[idx];
      if (!opt) return;
      this.innerHTML = '<span class="opt-label">⋯</span>';
      document.querySelectorAll('#operationOptions .option-btn').forEach(function(b) { b.disabled = true; });
      // 1v1 模式：应用好感变化（防通胀+下限+日志，统一走 applyOneHeartOptionAffection）
      applyOneHeartOptionAffection(opt);
      // 设置选择文本，清空选项，推进
      GS.pendingChoiceText = (opt && opt.text) || '';
      GS.currentOptions = [];
      saveGame();
      var _ob = document.getElementById('operationBody'); if (_ob) _ob.style.display = 'none';
      await generateOneHeartRound();
    });
  });

  // 动作网格按钮（统一事件委托）
  document.querySelectorAll('.oneheart-action-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var cmd = this.dataset.cmd;
      switch (cmd) {
        case 'regenerate':
          this.disabled = true;
          // 删除当前回合内容（替换而非追加）；先暂存被移除的条目以便失败时恢复
          var prevChoiceText = '';
          var _poppedCn = null;
          var _poppedFull = null;
          if (GS.consequenceNarratives.length > 0) {
            _poppedCn = GS.consequenceNarratives.pop();
            prevChoiceText = _poppedCn.choiceText || '';
          }
          if (GS.todayFullText.length > 0) {
            _poppedFull = GS.todayFullText.pop();
          }
          // 自由输入框文字作为 freeInput 传递
          var freeText = ((document.getElementById('freeInput') || {}).value || '').trim();
          GS.freeInput = freeText || '';
          GS.pendingChoiceText = prevChoiceText;
          GS.phaseNarrative = '';
          GS.currentOptions = [];
          GS._isGenerating = false;
          saveGame();
          var _ob1 = document.getElementById('operationBody'); if (_ob1) _ob1.style.display = 'none';
          var _cnLenBefore = GS.consequenceNarratives.length;
          await generateOneHeartRound({ isRegenerate: true });
          // 失败兜底：若重新生成未产生新内容（多为 AI 返回格式异常），恢复被移除的段落，避免丢进度
          if (GS.consequenceNarratives.length === _cnLenBefore && !GS.phaseNarrative && _poppedCn) {
            GS.consequenceNarratives.push(_poppedCn);
            if (_poppedFull != null) GS.todayFullText.push(_poppedFull);
            showToast('⚠️ 重新生成失败，已恢复上一段内容，可重试或换指令');
            saveGame();
            if (window.__renderAll) window.__renderAll();
          }
          this.disabled = false;
          break;
        case 'rewind':
          showToast('🔄 自由推演中...');
          GS.pendingChoiceText = '顺其自然的发展';
          var _ob2 = document.getElementById('operationBody'); if (_ob2) _ob2.style.display = 'none';
          await generateOneHeartRound({ isFreeDeduction: true });
          break;
        case 'set_mainline':
          showOneHeartMainlineModal();
          break;
        case 'mainline':
          if (!GS.oneHeartMainLine) {
            showToast('请先在快捷指令中「设定主线」'); return;
          }
          showToast('📌 拉回主线中...');
          GS.pendingChoiceText = '📌 拉回主线';
          GS.freeInput = '(按照主线推进剧情：' + GS.oneHeartMainLine + ')';
          saveGame();
          var _ob3 = document.getElementById('operationBody'); if (_ob3) _ob3.style.display = 'none';
          await generateOneHeartRound();
          break;
        case 'random':
          showToast('🎲 触发随机事件...');
          GS.pendingChoiceText = '🎲 随机事件';
          var _ob4 = document.getElementById('operationBody'); if (_ob4) _ob4.style.display = 'none';
          await generateOneHeartRound({ isRandom: true });
          break;
        case 'ending':
          if (await showConfirmModal('确定要走向大结局吗？AI将根据主线方向和当前剧情生成结局。')) {
            var _ob5 = document.getElementById('operationBody'); if (_ob5) _ob5.style.display = 'none';
            await generateOneHeartRound({ isEnding: true });
            renderAll();
          }
          break;
        case 'brother_chat':
          if (window.handleBrotherChat) await window.handleBrotherChat();
          break;
      }
    });
  });

  // 提交剧情按钮
  var submitBtn = document.getElementById('btnSubmitFreeInput');
  if (submitBtn) {
    submitBtn.addEventListener('click', async function() {
      var freeText = ((document.getElementById('freeInput') || {}).value || '').trim();
      if (!freeText) { showToast('请先写下你想发生的剧情'); return; }
      GS.freeInput = freeText;
      GS.pendingChoiceText = freeText;
      GS._pendingSource = 'freeInput';
      if (GS.todayFullText.length > 0) {
        GS.todayFullText[GS.todayFullText.length - 1] += '\n\n❥ 自由行动：' + freeText;
      }
      document.getElementById('freeInput').value = '';
      GS.phaseNarrative = '';
      GS.currentOptions = [];
      saveGame();
      var _ob6 = document.getElementById('operationBody'); if (_ob6) _ob6.style.display = 'none';
      // [romance] 自由输入也可能是在回应仍 active 的事件（男主告白/营业CP曝光/彻底曝光抉择），先结算固定后果，避免事件被悄悄吞掉
      if (GS.gameMode === 'oneHeart' && applyOneHeartEventEffects({ text: freeText, choiceText: freeText })) {
        // 事件已结算（showToast 已提示），不重复处理，继续生成下一段剧情
      }
      await generateOneHeartRound();
    });
  }

  // Bottom Tab 切换
  document.querySelectorAll('.oneheart-tab').forEach(function(tab) {
    tab.addEventListener('click', async function() {
      var tabName = this.dataset.tab;
      document.querySelectorAll('.oneheart-tab').forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      switch (tabName) {
        case 'story':
          // Already showing story, scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'diary':
          showDiaryModal();
          break;
        case 'event':
          showEventCardModal();
          break;
        case 'moments':
          showMomentsModal();
          break;
        case 'theater':
          showTheaterModal();
          break;
        case 'chat':
          showChatModal();
          break;
        case 'news':
          showNewsModal();
          break;
      }
    });
  });

  // 顶部功能按钮（同 transfer 模式）
  var settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', showApiSettingsModal);

  var helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', showHelpMergedModal);

  var reviewBtn = document.getElementById('reviewBtn');
  if (reviewBtn) reviewBtn.addEventListener('click', showReviewModal);

  // 礼物按钮
  var giftBtn = document.getElementById('giftBtn');
  if (giftBtn) giftBtn.addEventListener('click', showGiftPanel);

  // 好感度提示点击
  var affectionHint = document.getElementById('affectionHint');
  if (affectionHint) affectionHint.addEventListener('click', showAffectionPanel);

  // 自由输入删除按钮
  document.getElementById('narrativeBox').addEventListener('click', async function(e) {
    var delBtn = e.target.closest('.consequence-delete');
    if (!delBtn) return;
    var idx = parseInt(delBtn.dataset.idx);
    if (isNaN(idx) || idx < 0 || idx >= GS.consequenceNarratives.length) return;
    var confirmed = await showConfirmModal('确定要删除这段剧情吗？');
    if (!confirmed) return;
    GS.consequenceNarratives.splice(idx, 1);
    if (GS.todayFullText && idx < GS.todayFullText.length) {
      GS.todayFullText.splice(idx, 1);
    }
    saveGame();
    window.__renderAll();
  });

  // 新的一天按钮
  var newDayBtn = document.getElementById('btnNewDay');
  if (newDayBtn) {
    newDayBtn.addEventListener('click', async function() {
      if (GS.oneHeartDateIdx === undefined) GS.oneHeartDateIdx = 0;
      var nextIdx = GS.oneHeartDateIdx + 1;
      if (!GS.gameDates || nextIdx >= GS.gameDates.length) {
        showToast('⚠️ 已到达故事时间线尽头');
        return;
      }
      var nextDate = GS.gameDates[nextIdx];
      var confirmed = await showConfirmModal('确定进入新的一天吗？\n' + nextDate.month + '月' + nextDate.day + '日 → 新的一天开始');
      if (!confirmed) return;
      GS.oneHeartDateIdx = nextIdx;
      GS.day++;
      GS.currentDate = GS.gameDates[GS.oneHeartDateIdx];
      // [F] 时间/时段/回合计数已移除
      GS.oneHeartTimeProgress = 0;
      GS.oneHeartSceneContext = { location: '', present: [] };
      GS.weather = generateDailyWeather(GS.weather, GS.season);
      // 根据月份动态更新季节
      var _newSeason = getSeasonByMonth(GS.currentDate.month);
      if (_newSeason) GS.season = _newSeason.season;
      saveGame();
      window.__renderAll();
      hideLoading();
      showLoading('📅 ' + GS.currentDate.month + '月' + GS.currentDate.day + '日 · 新的一天，新的故事...');
      // 检查生日/节日
      if (GS.currentDate) {
        var _bday = MEMBER_BIRTHDAYS[GS.oneHeartMember];
        var _holiday = HOLIDAYS_1V1.find(function(h){return h.month===GS.currentDate.month&&h.day===GS.currentDate.day;});
        if (_bday && _bday.month===GS.currentDate.month && _bday.day===GS.currentDate.day) {
          GS.pendingChoiceText = '🎂 今天是他的生日';
        } else if (_holiday) {
          GS.pendingChoiceText = _holiday.emoji + ' 今天是' + _holiday.name;
        } else {
          GS.pendingChoiceText = '📅 新的一天';
          GS.justEnteredNewDay = true;
        }
      } else {
        GS.pendingChoiceText = '📅 新的一天';
        GS.justEnteredNewDay = true;
      }
      var _ob7 = document.getElementById('operationBody'); if (_ob7) _ob7.style.display = 'none';
      await generateOneHeartRound();
    });
  }

  // 事件内嵌：事件选项点击绑定（替代原来的 pendingEventBtn 弹窗流程）
  var _eventBtns = document.querySelectorAll('#operationOptions .option-btn[data-event-idx]');
  _eventBtns.forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var eventIdx = parseInt(this.dataset.eventIdx);
      if (!GS._pendingEvents || GS._pendingEvents.length === 0) return;
      var ev = GS._pendingEvents.shift();
      // 禁用所有按钮
      document.querySelectorAll('#operationOptions .option-btn').forEach(function(b) { b.disabled = true; });

      if (eventIdx === -1) {
        // 忽略事件：标记已用、不存结果、不做好感变动，显示主线选项
        if (ev.scenario && window.markEventUsed) window.markEventUsed(ev.scenario);
        saveGame();
        renderAll();
        return;
      }

      var chosenIdx = eventIdx;
      // 处理好感度变化（走正规路径 updateAffection + addAffectionLog）
      // 优先使用 ev.affDeltas（来自 data.js 事件定义），否则 fallback 硬编码
      var _memId = GS.oneHeartMember;
      var _deltaVal = (ev.affDeltas && ev.affDeltas.length > chosenIdx) ? ev.affDeltas[chosenIdx] : null;
      if (_deltaVal !== null && _memId && _deltaVal !== 0) {
        updateAffection(_memId, _deltaVal);
        addAffectionLog(_memId, _deltaVal, ev.type + '事件');
      }
      if (ev.type === 'jealousy' && _deltaVal === null) {
        if (chosenIdx === 0) { if (_memId) { updateAffection(_memId, 2); addAffectionLog(_memId, 2, '吃醋事件：你选择了靠近他'); } }
        else if (chosenIdx === 1) { /* 中立选项，不变 */ }
        else if (chosenIdx === 2) { if (_memId) { updateAffection(_memId, -1); addAffectionLog(_memId, -1, '吃醋事件：你选择了靠近情敌'); } updateRivalTendency(1, '吃醋事件：靠近情敌'); }
      } else if (ev.type === 'confrontation' && _deltaVal === null) {
        var _deltas = [2, -2, -3];
        var _d = _deltas[chosenIdx] || 0;
        if (_memId && _d !== 0) { updateAffection(_memId, _d); addAffectionLog(_memId, _d, '争吵事件选项'); }
      } else if (ev.type === 'rival') {
        if (chosenIdx === 0) { updateRivalTendency(2, '情敌事件：主动靠近情敌'); }
        else if (chosenIdx === 1) { updateRivalTendency(-1, '情敌事件：保持距离'); }
        else if (chosenIdx === 2) { showToast('🤫 你装作没发现，但心里有些在意'); updateRivalTendency(1, '情敌事件：装作没发现'); }
      } else if (ev.type === 'confession') {
        if (chosenIdx === 0) {
          GS._confessionAccepted = true;
          // Rival→main swap: 情敌转正为主角（不依赖 rivalAff，新主角好感度设为40）
          if (GS.oneHeartRival && GS.oneHeartRival.memberId) {
            var _oldMember = GS.oneHeartMember;
            var _newMember = GS.oneHeartRival.memberId;
            GS.oneHeartMember = _newMember;
            GS.oneHeartRival.memberId = _oldMember;
            var _oldMemberObj = MEMBERS.find(function(m) { return m.id === _oldMember; });
            GS.oneHeartRival.name = _oldMemberObj ? _oldMemberObj.name : '';
            GS._rivalSwitched = true;
            if (!GS.affection[_newMember]) GS.affection[_newMember] = 40;
            addAffectionLog(_newMember, 40, '接受告白，情敌转正为新主角');
            // 清理旧情敌档案免干扰
            GS.oneHeartRival.personality = '';
            GS.oneHeartRival.behaviorLogic = '';
            GS.oneHeartRival.interactionStyle = '';
            GS.oneHeartRival.loveStyle = '';
          }
          showToast('💗 情敌转正！你选择了接受 ' + escHtml(ev.rivalName || '他') + ' 的心意');
        }
        else if (chosenIdx === 1) { GS._confessionCooldown = 99; }
        else GS._confessionCooldown = 5;
      }
      // 标记事件为已用
      if (ev.scenario && window.markEventUsed) window.markEventUsed(ev.scenario);

      // [事件卡片系统] 生成独立短故事并存入事件卡片（不再注入主线 prompt）
      // 情敌事件的 memberName 使用情敌名而非男主名
      var _mName = '';
      if (ev.type === 'rival' || ev.type === 'confession') {
        _mName = (GS.oneHeartRival && GS.oneHeartRival.name) ? GS.oneHeartRival.name : '';
      }
      if (!_mName) {
        var _memberName_ = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
        _mName = _memberName_ ? _memberName_.name : '';
      }
      // 估算好感度变化（优先使用 ev.affDeltas）
      var _affDelta = (ev.affDeltas && ev.affDeltas.length > chosenIdx) ? (ev.affDeltas[chosenIdx] || 0) : 0;
      var _rivDelta = 0;
      if (_affDelta === 0) {
        if (ev.type === 'jealousy') { _affDelta = chosenIdx === 0 ? 2 : (chosenIdx === 2 ? -1 : 0); _rivDelta = chosenIdx === 2 ? 1 : 0; }
        else if (ev.type === 'confrontation') { _affDelta = [2, -2, -3][chosenIdx] || 0; }
        else if (ev.type === 'rival') { _affDelta = chosenIdx === 0 ? -2 : (chosenIdx === 1 ? 1 : 0); _rivDelta = chosenIdx === 0 ? 2 : (chosenIdx === 1 ? -1 : (chosenIdx === 2 ? 1 : 0)); }
        else if (ev.type === 'confession' && chosenIdx === 0) { _affDelta = 40; }
      }
      if (ev.type === 'rival' && _rivDelta === 0 && chosenIdx === 2) _rivDelta = 1;
      // 生成事件短故事（遮罩 loading 防卡住感）
      showLoading('正在生成事件故事...');
      var _evCopy = { type: ev.type, scenario: ev.scenario || '', chosenOption: (ev.options || [])[chosenIdx] || '', options: ev.options };
      try {
        var _story = await generateEventStory(_evCopy);
      } finally {
        hideLoading();
      }
      // 存入事件卡片
      if (!GS.oneHeartEventCards) GS.oneHeartEventCards = [];
      GS._newEvents = true;
      GS.oneHeartEventCards.push({
        type: ev.type,
        scenario: ev.scenario || '',
        chosenOption: (ev.options || [])[chosenIdx] || '',
        story: _story,
        affChange: _affDelta,
        rivalChange: _rivDelta,
        memberName: _mName,
        timestamp: Date.now()
      });
      // 限制50条上限
      if (GS.oneHeartEventCards.length > 50) GS.oneHeartEventCards.shift();
      showToast('⚡ 事件已记录，可点击底部"事件"Tab查看详情');

      saveGame();
      var _ob8 = document.getElementById('operationBody'); if (_ob8) _ob8.style.display = 'none';
      renderAll();
    });
  });

  // 事件横幅 5 秒后自动消失
  setTimeout(function() {
    var banner = document.getElementById('pendingBanner');
    if (banner) banner.remove();
  }, 5000);
}


