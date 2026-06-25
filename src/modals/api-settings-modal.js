import { API_PROVIDERS, GS, saveGame, resetGame, resetCache, escHtml, testAPIConnection, showToast } from '../core.js';
import { STORAGE_KEY } from '../data.js';
import { setGS } from '../state.js';
import { showConfirmModal } from './confirm-modal.js';

function buildModelOptionsHtml(providerKey, selectedModel) {
  var provider = API_PROVIDERS[providerKey] || API_PROVIDERS.deepseek;
  var models = provider.models || [];
  var html = '';
  for (var i = 0; i < models.length; i++) {
    var m = models[i];
    html += '<option value="' + m.value + '"' + (selectedModel === m.value ? ' selected' : '') + '>' + m.label + '</option>';
  }
  return html;
}

function applyThemeDirect(theme) {
  if (theme === 'auto') {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('svt_theme', theme);
}

function exportStoryTxt() {
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
}

function saveExportJson() {
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
}

function saveImportJson(overlay, file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = async function(e) {
    try {
      var text = e.target.result;
      var parsed = JSON.parse(text);
      if (!parsed.version || !Array.isArray(parsed.selectedMembers)) {
        showToast('⚠️ 存档文件格式无效');
        return;
      }
      var confirmed = await showConfirmModal(
        '将覆盖当前存档并载入「' + (parsed.heroineProfile ? parsed.heroineProfile.name : '?') + '」（Day ' + parsed.day + '），是否继续？'
      );
      if (!confirmed) { return; }
      setGS(parsed);
      saveGame();
      overlay.remove();
      if (window.__renderAll) window.__renderAll();
      showToast('✅ 存档已导入');
    } catch (e2) {
      showToast('⚠️ 存档文件损坏或格式错误');
    }
  };
  reader.readAsText(file);
}

export function showApiSettingsModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '300';

  var providerOptions = '';
  for (var pk in API_PROVIDERS) {
    var p = API_PROVIDERS[pk];
    providerOptions += '<option value="' + pk + '"' + (GS.apiProvider === pk ? ' selected' : '') + '>' + p.name + '</option>';
  }
  var modelOptions = buildModelOptionsHtml(GS.apiProvider, GS.apiModel);
  var themeVal = GS.theme || 'auto';

  var inner = '<div class="modal-content" style="width:460px;max-width:98vw;max-height:90vh;display:flex;flex-direction:column">' +
    '<h3 style="flex-shrink:0">⚙️ 设置</h3>' +
    '<div class="settings-scroll" style="flex:1;overflow-y:auto;padding-right:4px">' +

    // === 区块 1：API 设置 ===
    '<div class="settings-section">' +
    '<p class="settings-section-title">🔌 API 设置</p>' +
    '<label>AI 提供商</label>' +
    '<select id="apiProviderSelect" class="settings-select">' + providerOptions + '</select>' +
    '<label>AI 模型</label>' +
    '<select id="apiModelSelect" class="settings-select">' + modelOptions + '</select>' +
    '<label>API Key</label>' +
    '<div style="display:flex;gap:4px;margin-bottom:6px">' +
    '<input type="password" id="apiKeyInput" placeholder="sk-..." value="' + escHtml(GS.apiKey) + '" class="settings-input" style="flex:1">' +
    '<button type="button" id="toggleApiKeyBtn" class="btn-icon" style="padding:6px 10px;border:1px solid var(--border-primary);border-radius:8px;cursor:pointer;font-size:12px;background:var(--bg-card);color:var(--text-secondary)">👁</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">' +
    '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
    '<input type="checkbox" id="rememberApiKeyCheck" ' + (GS.rememberApiKey ? 'checked' : '') + '> 记住 Key</label>' +
    '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
    '<input type="checkbox" id="aiEnabledCheck" ' + (GS.aiEnabled ? 'checked' : '') + '> 启用 AI</label>' +
    '</div>' +
    '<button class="btn-secondary" id="testApiBtn" style="width:100%;padding:7px;margin-bottom:6px">🔍 测试连接</button>' +
    '<div id="settingsApiStatus" class="api-status hidden" style="margin-bottom:4px"></div>' +
    '<p style="font-size:10px;color:var(--text-muted);margin:4px 0">🔒 API Key 仅存储在本地浏览器，不会上传服务器。</p>' +
    '</div>' +

    // === 区块 2：主题切换 ===
    '<div class="settings-section">' +
    '<p class="settings-section-title">🎨 主题切换</p>' +
    '<div style="display:flex;gap:6px">' +
    '<button class="theme-opt-btn' + (themeVal === 'auto' ? ' active' : '') + '" data-theme="auto">🔄 自动</button>' +
    '<button class="theme-opt-btn' + (themeVal === 'light' ? ' active' : '') + '" data-theme="light">☀️ 浅色</button>' +
    '<button class="theme-opt-btn' + (themeVal === 'dark' ? ' active' : '') + '" data-theme="dark">🌙 深色</button>' +
    '</div>' +
    '</div>' +

    // === 区块 3：打字机速度 ===
    '<div class="settings-section">' +
    '<p class="settings-section-title">⌨️ 打字机速度</p>' +
    '<select id="settingsTypewriterSpeed" class="settings-select">' +
    '<option value="0"' + (GS.typewriterSpeed === 0 ? ' selected' : '') + '>即时</option>' +
    '<option value="100"' + (GS.typewriterSpeed === 100 ? ' selected' : '') + '>慢</option>' +
    '<option value="50"' + (GS.typewriterSpeed === 50 ? ' selected' : '') + '>中</option>' +
    '<option value="20"' + (GS.typewriterSpeed === 20 ? ' selected' : '') + '>快</option>' +
    '<option value="10"' + (GS.typewriterSpeed === 10 ? ' selected' : '') + '>极快</option>' +
    '</select>' +
    '</div>' +

    // === 区块 4：导入存档 ===
    '<div class="settings-section">' +
    '<p class="settings-section-title">📂 导入存档</p>' +
    '<p style="font-size:11px;color:var(--text-muted);margin:0 0 6px 0">从 JSON 文件恢复游戏进度</p>' +
    '<div style="display:flex;gap:6px">' +
    '<input type="file" id="settingsImportInput" accept=".json" style="flex:1;font-size:12px;padding:4px">' +
    '</div>' +
    '</div>' +

    // === 区块 5：导出存档 ===
    '<div class="settings-section">' +
    '<p class="settings-section-title">💾 导出存档</p>' +
    '<p style="font-size:11px;color:var(--text-muted);margin:0 0 6px 0">将当前游戏进度导出为 JSON 文件</p>' +
    '<button class="btn-secondary" id="settingsExportBtn" style="width:100%;padding:7px">💾 导出存档</button>' +
    '</div>' +

    // === 区块 6：导出完整剧情 ===
    '<div class="settings-section">' +
    '<p class="settings-section-title">📥 导出完整剧情</p>' +
    '<p style="font-size:11px;color:var(--text-muted);margin:0 0 6px 0">导出所有天数的剧情文字（TXT 格式）</p>' +
    '<button class="btn-secondary" id="settingsExportStoryBtn" style="width:100%;padding:7px">📥 导出剧情记录</button>' +
    '</div>' +

    // === 区块 7：重置游戏 ===
    '<div class="settings-section">' +
    '<p class="settings-section-title">🔄 重置游戏</p>' +
    '<p style="font-size:11px;color:var(--text-muted);margin:0 0 6px 0">清空游戏进度，保留 API/主题/速度设置</p>' +
    '<button class="btn-secondary" id="settingsResetGameBtn" style="width:100%;padding:7px;color:var(--accent-danger)">🔄 重置游戏</button>' +
    '</div>' +

    // === 区块 8：重置缓存 ===
    '<div class="settings-section" style="margin-bottom:6px">' +
    '<p class="settings-section-title">🗑️ 重置缓存</p>' +
    '<p style="font-size:11px;color:var(--accent-danger);margin:0 0 6px 0">⚠️ 清除所有本地数据（含 API 设置），所有剧情需重新生成</p>' +
    '<button class="btn-secondary" id="settingsResetCacheBtn" style="width:100%;padding:7px;color:var(--accent-danger);border-color:var(--accent-danger)">🗑️ 重置缓存</button>' +
    '</div>' +

    '</div>' + // end settings-scroll
    '<button class="modal-close-x" id="settingsClose">✕</button></div>';

  overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%">' + inner + '</div>';
  document.body.appendChild(overlay);

  // === API 设置事件 ===
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#settingsClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });

  overlay.querySelector('#apiProviderSelect').addEventListener('change', function() {
    GS.apiProvider = this.value;
    var provider = API_PROVIDERS[this.value];
    if (provider && provider.models && provider.models.length > 0) {
      GS.apiModel = provider.models[0].value;
    }
    var modelSelect = overlay.querySelector('#apiModelSelect');
    if (modelSelect) {
      modelSelect.innerHTML = buildModelOptionsHtml(GS.apiProvider, GS.apiModel);
    }
    saveGame();
  });
  overlay.querySelector('#apiModelSelect').addEventListener('change', function() {
    GS.apiModel = this.value;
    saveGame();
  });
  overlay.querySelector('#apiKeyInput').addEventListener('input', function() {
    GS.apiKey = this.value.trim();
    if (GS.rememberApiKey) saveGame();
  });
  overlay.querySelector('#rememberApiKeyCheck').addEventListener('change', function() {
    GS.rememberApiKey = this.checked;
    if (!GS.rememberApiKey) {
      GS.apiKey = '';
      overlay.querySelector('#apiKeyInput').value = '';
    }
    saveGame();
  });
  overlay.querySelector('#aiEnabledCheck').addEventListener('change', function() {
    GS.aiEnabled = this.checked;
    saveGame();
  });

  overlay.querySelector('#toggleApiKeyBtn').addEventListener('click', function() {
    var input = overlay.querySelector('#apiKeyInput');
    if (input.type === 'password') { input.type = 'text'; this.textContent = '🙈'; }
    else { input.type = 'password'; this.textContent = '👁'; }
  });

  overlay.querySelector('#testApiBtn').addEventListener('click', async function() {
    var s = overlay.querySelector('#settingsApiStatus');
    s.classList.remove('hidden', 'success', 'error', 'testing');
    s.classList.add('testing');
    s.textContent = '⏳ 正在测试连接...';
    var ok = await testAPIConnection(GS.apiKey, GS.apiProvider);
    s.classList.remove('testing');
    s.classList.add(ok ? 'success' : 'error');
    s.textContent = ok ? '✅ 连接成功！' : '❌ 连接失败，请检查 API Key 和提供商';
  });

  // === 主题切换事件 ===
  overlay.querySelectorAll('.theme-opt-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      overlay.querySelectorAll('.theme-opt-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var theme = this.dataset.theme;
      GS.theme = theme;
      applyThemeDirect(theme);
      saveGame();
    });
  });

  // === 打字机速度事件 ===
  overlay.querySelector('#settingsTypewriterSpeed').addEventListener('change', function() {
    GS.typewriterSpeed = parseInt(this.value);
    saveGame();
  });

  // === 导入存档事件 ===
  overlay.querySelector('#settingsImportInput').addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    saveImportJson(overlay, file);
    this.value = '';
  });

  // === 导出存档事件 ===
  overlay.querySelector('#settingsExportBtn').addEventListener('click', function() {
    saveExportJson();
  });

  // === 导出剧情事件 ===
  overlay.querySelector('#settingsExportStoryBtn').addEventListener('click', async function() {
    if (!(await showConfirmModal('确定要导出剧情记录吗？'))) return;
    exportStoryTxt();
    showToast('✅ 剧情已导出');
  });

  // === 重置游戏事件 ===
  overlay.querySelector('#settingsResetGameBtn').addEventListener('click', async function() {
    await resetGame();
    overlay.remove();
    if (window.__renderAll) window.__renderAll();
  });

  // === 重置缓存事件 ===
  overlay.querySelector('#settingsResetCacheBtn').addEventListener('click', function() {
    resetCache();
  });
}
