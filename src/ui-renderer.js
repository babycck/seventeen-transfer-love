import {
  MAX_STAY_COUNT, PHASE_ACTION_LIMIT, ZODIAC_SIGNS,
  MEMBERS, PHASES, PHASE_LABELS,
  APPEARANCE_TRAITS, PERSONALITY_TRAITS, MBTI_TYPES, PRIVATE_TRAITS,
  API_PROVIDERS,
  GS, saveGame, resetGame, defaultGameState, randInt, escHtml, testAPIConnection,
  showLoading, hideLoading, showToast, callDeepSeek
} from './core.js';
import { setGS } from './state.js';
import { getAffectionHint, getAffectionDesc } from './affection.js';
import { handleOptionChoice, handleTruthRound, advancePhase, handleRegenerate, goToNextDay, proceedToNextDay, continueToday, handleFreeAction, generatePhaseNarrative, handleExMessageChoice, resetPhaseState, handleQuestionBoxChoice, handleMidnightCall } from './game-engine.js';
import { getZodiacFromBirthday, generateSeasonAndDates, generateDailyWeather } from './formatters.js';
import { generateAllXArchives } from './x-archive.js';
import { showSmsModal, showXArchiveModal, showSmsHistoryModal, showGiftPanel, showHeartNotesModal, showHistoryModal, showHelpModal, showAffectionPanel, showApiSettingsModal, showConfirmModal } from './modals.js';
import { invalidateSystemPromptCache } from './prompts.js';
// 模态弹窗（Phase 5 模块化）
import { showMidnightCallModal } from './modals/midnight-call.js';
// UI 组件（Phase 5 模块化）
import { renderHeader } from './ui/header-bar.js';
import { renderParsedNarrative, renderNarrativeSection, startTypewriter } from './ui/narrative-box.js';
import { renderOptionPanel, renderTruthPanel, renderQuestionBoxPanel } from './ui/option-panel.js';
import { renderActionBar } from './ui/action-bar.js';
import { renderFreeInput } from './ui/free-input.js';
import { extractPendingPromises, extractRevealedInfo } from './promises.js';
import { parseNarrative, completeSecretMission } from './parser.js';
import { loadTestScene } from './api.js';
import { activateCode, saveCodePreference, getSavedCode, isRememberCode } from './auth.js';
import { compressTodayToSummary } from './memory.js';

var _scrollBound = false;

// ==================== 主题切换 ====================
export function applyTheme(theme) {
  if (theme === 'auto') {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('svt_theme', theme);
  // 更新按钮图标
  var btn = document.getElementById('themeToggleBtn');
  if (btn) {
    var currentIsDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = currentIsDark ? '☀️' : '🌙';
  }
}

export function initTheme() {
  var saved = localStorage.getItem('svt_theme') || (GS.theme || 'auto');
  applyTheme(saved);
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = (current === 'dark') ? 'light' : 'dark';
  GS.theme = next;
  applyTheme(next);
}

// ==================== UI 渲染 ====================
export function renderAll() {
  var app = document.getElementById('app');
  if (GS.step < 5) {
    app.innerHTML = renderSetupWizard();
    bindSetupEvents();
  } else {
    app.innerHTML = renderGameScreen();
    bindGameEvents();
    scrollToLatestContent();
    setTimeout(function() {
      var newContent = document.getElementById('narrativeNewContent');
      if (newContent && newContent.getAttribute('data-narrative-html')) {
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
    var hasKey = GS.apiKey && GS.apiKey.length > 0;
    var providerOptions = '';
    for (var pk in API_PROVIDERS) {
      var p = API_PROVIDERS[pk];
      providerOptions += '<option value="' + pk + '"' + (GS.apiProvider === pk ? ' selected' : '') + '>' + p.name + '</option>';
    }
    var modelOptions = buildModelOptionsHtml(GS.apiProvider, GS.apiModel);
    html = '<div class="setup-step"><h2>🔑 Step 1：API 设置</h2>' +
      '<p class="step-desc">选择 AI 提供商并输入 API Key 以启用 AI 剧情生成</p>' +
      '<label>AI 提供商</label>' +
      '<select id="apiProviderSelect" style="width:100%;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;margin-bottom:8px;background:#fff">' +
      providerOptions + '</select>' +
      '<label>AI 模型</label>' +
      '<select id="apiModelSelect" style="width:100%;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;margin-bottom:8px;background:#fff">' +
      modelOptions + '</select>' +
      '<label>API Key' + (hasKey ? ' <span style="color:#4caf50;font-size:12px">✅ 已输入</span>' : '') + '</label>' +
      '<div style="display:flex;gap:4px">' +
      '<input type="password" id="apiKeyInput" placeholder="sk-..." value="' + escHtml(GS.apiKey) + '" style="flex:1">' +
      '<button type="button" id="toggleApiKeyBtn" style="padding:6px 10px;border:1.5px solid #e0c0c0;border-radius:8px;background:#fff;cursor:pointer;font-size:12px">👁</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;margin-top:6px">' +
      '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
      '<input type="checkbox" id="rememberApiKeyCheck" ' + (GS.rememberApiKey ? 'checked' : '') + '> 记住 API Key（仅保存到本地浏览器）</label>' +
      '</div>' +
      '<p style="font-size:11px;color:#8b6b6b;margin-top:4px">🔒 隐私说明：API Key 仅存储在你当前浏览器的本地空间中，不会上传到任何服务器，其他人无法看到。</p>' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
      '<button class="btn-secondary" id="testApiBtn" style="flex:1">🔍 测试连接</button>' +
      '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
      '<input type="checkbox" id="aiEnabledCheck" ' + (GS.aiEnabled ? 'checked' : '') + '> 启用AI</label></div>' +
      '<div id="apiStatus" class="api-status hidden"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-direction:column">' +
      '<button class="btn-primary" id="step1Next">下一步 →</button>' +
      // 测试版入口已暂时屏蔽，取消下面注释即可恢复
      //'<button class="btn-secondary" id="enterTestModeBtn" style="background:#fff8e1;border-color:#ffc107;color:#f57f17;font-size:13px">🧪 进入测试版（跳过API配置）</button>' +
      //'<p style="font-size:11px;color:#8b6b6b;margin:0">测试版使用本地预生成剧情，无需API Key即可体验游戏流程。</p>' +
      '</div></div>';
  } else if (GS.step === 2) {
    var hp = GS.heroineProfile;
    var locked = GS.profileLocked;
    var ro = locked ? ' readonly disabled style="background:#f5f5f5;color:#888;cursor:not-allowed"' : '';
    var chipStyle = locked ? ' style="pointer-events:none;opacity:0.7"' : '';
    html = '<div class="setup-step"><h2>👩 Step 2：女主人设</h2>' +
      '<p class="step-desc">' + (locked ? '✅ 女主人设已设定（只读）' : '设定你的角色（设定后将只读）') + '</p>' +
      '<label>姓名/昵称</label><input type="text" id="hpName" value="' + escHtml(hp.name) + '"' + ro + '>' +
      '<label>年龄</label><input type="number" id="hpAge" value="' + hp.age + '" min="18" max="40"' + ro + '>' +
      '<label>职业（自由填写）</label><input type="text" id="hpJob" value="' + escHtml(hp.job) + '"' + ro + '>' +
      '<label>生日（月 / 日）</label>' +
      '<div style="display:flex;gap:8px">' +
      '<input type="number" id="hpBirthMonth" min="1" max="12" placeholder="月" value="' + (hp.birthday && hp.birthday.month ? hp.birthday.month : '') + '"' + ro + ' style="flex:1">' +
      '<input type="number" id="hpBirthDay" min="1" max="31" placeholder="日" value="' + (hp.birthday && hp.birthday.day ? hp.birthday.day : '') + '"' + ro + ' style="flex:1">' +
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
  } else if (GS.step === 3) {
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
  } else if (GS.step === 4) {
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

  return html;
}

export function bindSetupEvents() {
  if (GS.step === 1) {
    document.getElementById('apiProviderSelect').addEventListener('change', function() {
      GS.apiProvider = this.value;
      var provider = API_PROVIDERS[this.value];
      if (provider && provider.models && provider.models.length > 0) {
        GS.apiModel = provider.models[0].value;
      }
      var modelSelect = document.getElementById('apiModelSelect');
      if (modelSelect) {
        modelSelect.innerHTML = buildModelOptionsHtml(GS.apiProvider, GS.apiModel);
      }
      saveGame();
    });
    document.getElementById('apiModelSelect').addEventListener('change', function() {
      GS.apiModel = this.value;
      saveGame();
    });
    document.getElementById('apiKeyInput').addEventListener('input', function() {
      GS.apiKey = this.value.trim();
      if (GS.rememberApiKey) saveGame();
    });
    document.getElementById('rememberApiKeyCheck').addEventListener('change', function() {
      GS.rememberApiKey = this.checked;
      if (!GS.rememberApiKey) {
        GS.apiKey = '';
        document.getElementById('apiKeyInput').value = '';
      }
      saveGame();
    });
    document.getElementById('aiEnabledCheck').addEventListener('change', function() {
      GS.aiEnabled = this.checked;
      saveGame();
    });
    document.getElementById('testApiBtn').addEventListener('click', async function() {
      var s = document.getElementById('apiStatus');
      s.classList.remove('hidden', 'success', 'error', 'testing');
      s.classList.add('testing');
      s.textContent = '⏳ 正在测试连接...';
      var ok = await testAPIConnection(GS.apiKey, GS.apiProvider);
      s.classList.remove('testing');
      if (ok) {
        s.classList.add('success');
        s.textContent = '✅ 连接成功！API Key 有效';
      } else {
        s.classList.add('error');
        s.textContent = '❌ 连接失败，请检查 API Key 和提供商设置';
      }
    });
    var toggleBtn = document.getElementById('toggleApiKeyBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        var input = document.getElementById('apiKeyInput');
        if (input.type === 'password') {
          input.type = 'text';
          this.textContent = '🙈';
        } else {
          input.type = 'password';
          this.textContent = '👁';
        }
      });
    }
    document.getElementById('step1Next').addEventListener('click', function() {
      if (!GS.apiKey.trim()) {
        showToast('请输入 API Key');
        return;
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
  }

  if (GS.step === 2) {
    if (!GS.profileLocked) {
      document.getElementById('hpName').addEventListener('input', function() {
        GS.heroineProfile.name = this.value;
        saveGame();
      });
      document.getElementById('hpAge').addEventListener('input', function() {
        GS.heroineProfile.age = parseInt(this.value) || 25;
        saveGame();
      });
      document.getElementById('hpJob').addEventListener('input', function() {
        GS.heroineProfile.job = this.value;
        saveGame();
      });
      var updateZodiac = function() {
        var m = parseInt(document.getElementById('hpBirthMonth').value) || 0;
        var d = parseInt(document.getElementById('hpBirthDay').value) || 0;
        GS.heroineProfile.birthday = { month: m, day: d };
        GS.heroineProfile.zodiac = getZodiacFromBirthday(m, d);
        var disp = document.getElementById('zodiacDisplay');
        if (disp) disp.textContent = GS.heroineProfile.zodiac ? '星座：' + GS.heroineProfile.zodiac : '输入生日后自动计算星座';
        saveGame();
      };
      document.getElementById('hpBirthMonth').addEventListener('input', updateZodiac);
      document.getElementById('hpBirthDay').addEventListener('input', updateZodiac);
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

  if (GS.step === 3) {
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

  if (GS.step === 4) {
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
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var actionsRemaining = PHASE_ACTION_LIMIT - (GS.phaseOptionCount + GS.phaseFreeCount);
  var phaseChoicesExhausted = actionsRemaining <= 0;
  var freeInputExhausted = actionsRemaining <= 0;
  var isTruthRound = GS.day === 11 && GS.truthState && GS.truthState.active; var isDay11 = isTruthRound;
  var html = '';

  // Header（使用 UI 组件）
  html += renderHeader();

  // 记忆审查面板（非模态可折叠）
  // 叙事（使用 UI 组件）
  html += renderNarrativeSection();

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
  if (GS.truthState && GS.truthState.active) {
    html += renderTruthPanel();
  } else if (GS.questionBox && GS.questionBox.active) {
    html += renderQuestionBoxPanel();
  } else {
    html += renderOptionPanel(phaseChoicesExhausted, isDay11);
  }

  // Action Bar（使用 UI 组件）
  html += renderActionBar(GS.consequenceNarratives.length > 0, phaseChoicesExhausted, isDay11);

  // 自由输入（使用 UI 组件）
  html += renderFreeInput(freeInputExhausted);

  // 游戏结束
  if (GS.gameOver) {
    html += renderEndingScreen(members);
  }

  html += '<button id="backToTopBtn" title="回到顶部">⬆</button>';

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

  var skipBtn = document.getElementById('btnSkip') || document.getElementById('btnNextPhase');
  if (skipBtn) {
    skipBtn.addEventListener('click', async function() {
      if (GS._advancingPhase) { console.log('[skip btn] already advancing, skip'); return; }
      this.disabled = true;
      await advancePhase();
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

  var xBtn = document.getElementById('xArchiveBtn');
  if (xBtn) xBtn.addEventListener('click', showXArchiveModal);

  var smsHistBtn = document.getElementById('smsHistoryBtn');
  if (smsHistBtn) smsHistBtn.addEventListener('click', showSmsHistoryModal);

  // [P0-2] 小礼物面板
  var giftBtn = document.getElementById('giftBtn');
  if (giftBtn) giftBtn.addEventListener('click', showGiftPanel);

  // 心动笔记
  var heartNotesBtn = document.getElementById('heartNotesBtn');
  if (heartNotesBtn) heartNotesBtn.addEventListener('click', showHeartNotesModal);

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

  var historyBtn = document.getElementById('historyBtn');
  if (historyBtn) historyBtn.addEventListener('click', showHistoryModal);

  var helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', showHelpModal);

  var resetBtn = document.getElementById('resetGameBtn');
  if (resetBtn) resetBtn.addEventListener('click', async function() { await resetGame(); renderAll(); });

  var themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

  var speedSelect = document.getElementById('typewriterSpeedSelect');
  if (speedSelect) {
    speedSelect.value = GS.typewriterSpeed == null ? 30 : GS.typewriterSpeed;
    speedSelect.addEventListener('change', function() {
      GS.typewriterSpeed = parseInt(this.value);
      saveGame();
    });
  }

  // 存档导出
  var saveExportBtn = document.getElementById('saveExportBtn');
  if (saveExportBtn) {
    saveExportBtn.addEventListener('click', async function() {
      if (!(await showConfirmModal('确定要导出存档吗？'))) return;
      var json = JSON.stringify(GS, null, 2);
      var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var d = new Date();
      a.download = 'SEVENTEEN_存档_' + d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0'+d.getDate()).slice(-2) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('✅ 存档已导出');
    });
  }

  // 存档导入
  var saveImportInput = document.getElementById('saveImportInput');
  if (saveImportInput) {
    saveImportInput.addEventListener('change', async function() {
      var file = this.files[0];
      if (!file) return;
      try {
        var text = await file.text();
        var parsed = JSON.parse(text);
        if (!parsed.version || !Array.isArray(parsed.selectedMembers)) {
          showToast('⚠️ 存档文件格式无效');
          return;
        }
        var confirmed = await showConfirmModal('将覆盖当前存档并载入「' + (parsed.heroineProfile ? parsed.heroineProfile.name : '?') + '」（Day ' + parsed.day + '），是否继续？');
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

  var apiSettingsBtn = document.getElementById('apiSettingsBtn');
  if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', showApiSettingsModal);

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

      mc = GS.midnightCall;
      var target = MEMBERS.find(function(m) { return m.id === mc.targetId; });
      var targetName = target ? target.name : '嘉宾';
      var html = '<div class="modal-content" style="max-width:360px">' +
        '<h3>📞 午夜电话记录</h3>' +
        '<p style="font-size:13px;color:#5d3a3a;margin-bottom:8px"><strong>目标：</strong>' + escHtml(targetName) + '</p>' +
        '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px"><strong>你说：</strong></p>' +
        '<p style="font-size:12px;color:#5d3a3a;padding:8px;background:#fff5f5;border-radius:6px;margin-bottom:10px">' + escHtml(mc.content) + '</p>' +
        (mc.feedback ? '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px"><strong>' + targetName + '的内心独白（Day 7）：</strong></p><p style="font-size:12px;color:#5d3a3a;padding:8px;background:#f0faf0;border-radius:6px">' + escHtml(mc.feedback) + '</p>' : '') +
        (mc.reaction ? '<p style="font-size:12px;color:#8b6b6b;margin-bottom:8px"><strong>接听反应：</strong></p><p style="font-size:12px;color:#5d3a3a;padding:8px;background:#f5f5f5;border-radius:6px">' + escHtml(mc.reaction) + '</p>' : '') +
        '<button class="modal-close-x" id="mcRecordClose">✕</button></div>';
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      overlay.querySelector('#mcRecordClose').addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation(); overlay.remove();
      });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
      });
    });
  }

  var exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async function() {
      if (!(await showConfirmModal('确定要导出剧情记录吗？'))) return;
      var text = '';
      for (var i = 0; i < GS.dailyFullTexts.length; i++) {
        text += '========== Day ' + (i + 1) + ' ==========\n\n';
        var dayTexts = GS.dailyFullTexts[i];
        for (var j = 0; j < dayTexts.length; j++) {
          text += dayTexts[j] + '\n\n';
        }
        text += '\n';
      }
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '换乘恋爱_剧情记录.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    });
  }

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

  var backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    if (!_scrollBound) {
      window.addEventListener('scroll', function() {
        var btn = document.getElementById('backToTopBtn');
        if (btn) btn.style.display = window.scrollY > 500 ? 'flex' : 'none';
      });
      _scrollBound = true;
    }
    backToTopBtn.style.display = window.scrollY > 500 ? 'flex' : 'none';
  }
}

export function scrollToLatestContent() {
  setTimeout(function() {
    // 优先滚动到记忆审查面板（如果存在）
    var mrBody = document.getElementById('mrBody');
    if (mrBody) {
      mrBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var box = document.getElementById('narrativeBox');
    if (!box) return;
    var separators = box.querySelectorAll('.separator');
    if (separators.length > 0) {
      // 有后续剧情追加，滚动到最后一个分割线（最新内容开头）
      separators[separators.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // 没有分割线时（第一次生成），不滚动，保持从顶部开始阅读
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


