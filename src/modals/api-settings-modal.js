import { API_PROVIDERS, GS, saveGame, escHtml, testAPIConnection } from '../core.js';

function buildModelOptionsHtml2(providerKey, selectedModel) {
  var provider = API_PROVIDERS[providerKey] || API_PROVIDERS.deepseek;
  var models = provider.models || [];
  var html = '';
  for (var i = 0; i < models.length; i++) {
    var m = models[i];
    html += '<option value="' + m.value + '"' + (selectedModel === m.value ? ' selected' : '') + '>' + m.label + '</option>';
  }
  return html;
}

export function showApiSettingsModal() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var providerOptions = '';
  for (var pk in API_PROVIDERS) {
    var p = API_PROVIDERS[pk];
    providerOptions += '<option value="' + pk + '"' + (GS.apiProvider === pk ? ' selected' : '') + '>' + p.name + '</option>';
  }
  var modelOptions = buildModelOptionsHtml2(GS.apiProvider, GS.apiModel);

  var inner = '<div class="modal-content" style="width:420px;max-width:98vw">' +
    '<h3>⚙️ API 设置</h3>' +
    '<label>AI 提供商</label>' +
    '<select id="apiProviderSelect" style="width:100%;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;margin-bottom:8px;background:#fff">' +
    providerOptions + '</select>' +
    '<label>AI 模型</label>' +
    '<select id="apiModelSelect" style="width:100%;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px;margin-bottom:10px;background:#fff">' +
    modelOptions + '</select>' +
    '<label>API Key</label>' +
    '<div style="display:flex;gap:4px;margin-bottom:8px">' +
    '<input type="password" id="apiKeyInput" placeholder="sk-..." value="' + escHtml(GS.apiKey) + '" style="flex:1;padding:8px 10px;border:1.5px solid #e0c0c0;border-radius:10px;font-size:13px">' +
    '<button type="button" id="toggleApiKeyBtn" style="padding:6px 10px;border:1.5px solid #e0c0c0;border-radius:8px;background:#fff;cursor:pointer;font-size:12px">👁</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">' +
    '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
    '<input type="checkbox" id="rememberApiKeyCheck" ' + (GS.rememberApiKey ? 'checked' : '') + '> 记住 API Key</label>' +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:10px">' +
    '<button class="btn-secondary" id="testApiBtn" style="flex:1">🔍 测试连接</button>' +
    '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;margin:0">' +
    '<input type="checkbox" id="aiEnabledCheck" ' + (GS.aiEnabled ? 'checked' : '') + '> 启用AI</label>' +
    '</div>' +
    '<div id="apiStatus" class="api-status hidden" style="margin-bottom:10px"></div>' +
    '<p style="font-size:11px;color:#8b6b6b">🔒 API Key 仅存储在本地浏览器，不会上传服务器。</p>' +
    '<button class="modal-close" id="apiSettingsClose">关闭</button></div>';

  overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%">' + inner + '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#apiSettingsClose').addEventListener('click', function(e) {
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
      modelSelect.innerHTML = buildModelOptionsHtml2(GS.apiProvider, GS.apiModel);
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
  overlay.querySelector('#testApiBtn').addEventListener('click', async function() {
    var s = overlay.querySelector('#apiStatus');
    s.classList.remove('hidden', 'success', 'error', 'testing');
    s.classList.add('testing');
    s.textContent = '⏳ 正在测试连接...';
    var ok = await testAPIConnection(GS.apiKey, GS.apiProvider);
    s.classList.remove('testing');
    if (ok) {
      s.classList.add('success');
      s.textContent = '✅ 连接成功！';
    } else {
      s.classList.add('error');
      s.textContent = '❌ 连接失败，请检查 API Key 和提供商';
    }
  });
  var toggleBtn = overlay.querySelector('#toggleApiKeyBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      var input = overlay.querySelector('#apiKeyInput');
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
