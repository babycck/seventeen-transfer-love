var AUTH_TOKEN_KEY = 'svt_auth_token';
var DEVICE_ID_KEY = 'svt_auth_device_id';
var REMEMBER_CODE_KEY = 'svt_auth_remember_code';
var SAVED_CODE_KEY = 'svt_auth_saved_code';

// ⚠️ 部署后替换为你的后端地址
// Cloudflare: https://xxxxx.workers.dev
// 腾讯云服务器: https://你的域名
// 腾讯云 API 网关: https://service-xxxxx.gz.apigw.tencentcs.com
var BACKEND_URL = 'https://seventeen-transfer-auth.seventeen-forever.workers.dev';

// 本地管理员激活码（无需后端·永久有效·一万年）
var ADMIN_CODES = [
  'SVT-ADMIN-2024',
  '换乘恋爱-一万年',
  'SEVENTEEN-FOREVER'
];

// 归一化用户输入的激活码：去首尾空白、统一连字符、全角转半角
function normalizeCode(str) {
  if (!str) return '';
  var s = str.trim();
  // 全角字母/数字/符号 → 半角
  s = s.replace(/[\uFF01-\uFF5E]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });
  // 各类连字符 → 半角横线（en-dash、em-dash、连字符、减号、全角横线）
  s = s.replace(/[\u2013\u2014\u2010\u2212\uFF0D]/g, '-');
  return s;
}

export function getDeviceFingerprint() {
  var id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function generateDeviceId() {
  var raw = navigator.userAgent + '|' + navigator.language + '|' +
    screen.width + 'x' + screen.height + '|' + navigator.platform + '|' +
    Date.now() + '|' + Math.random();
  return hashString(raw);
}

function hashString(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'd_' + Math.abs(hash).toString(16) + Math.random().toString(36).slice(2, 6);
}

function generateLocalToken() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = 'svt_local_';
  for (var i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function isLocalAdminToken(token) {
  return token && token.indexOf('svt_local_') === 0 && token.length >= 20;
}

export async function verifyToken() {
  var token = localStorage.getItem(AUTH_TOKEN_KEY);
  var deviceId = getDeviceFingerprint();
  if (!token) return { valid: false, error: '未激活' };

  // 本地管理员 Token 永不过期
  if (isLocalAdminToken(token)) {
    // 额外格式校验
    if (token.length < 20) {
      console.warn('[Auth] malformed local token, clearing:', token);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return { valid: false, error: 'Token 已损坏，请重新激活' };
    }
    return { valid: true };
  }

  // 后端未配置时，非本地 Token 视为无效
  if (!isBackendConfigured()) {
    return { valid: false, error: '未激活（后端未配置）' };
  }

  try {
    var res = await fetch(BACKEND_URL + '/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, deviceFingerprint: deviceId })
    });
    var data = await res.json();
    if (!data.success) {
      // Token 已过期/无效/激活码已过期，清理旧 Token 让用户重新激活
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    return { valid: data.success, error: data.error };
  } catch (e) {
    // 网络错误临时无法连接，保留 Token 下次重试
    return { valid: false, error: '网络错误，请检查网络连接' };
  }
}

export async function activateCode(code) {
  var deviceId;
  try {
    deviceId = getDeviceFingerprint();
  } catch (e) {
    console.error('[Auth] deviceId generation failed:', e);
    deviceId = 'fallback_' + Date.now();
  }

  var normalized = normalizeCode(code);
  console.log('[Auth] activateCode input:', JSON.stringify(code), 'normalized:', JSON.stringify(normalized));

  // 本地管理员激活码：无需后端·永久有效（用归一化后比对）
  var matched = false;
  for (var i = 0; i < ADMIN_CODES.length; i++) {
    if (normalized === normalizeCode(ADMIN_CODES[i])) {
      matched = true;
      break;
    }
  }

  if (matched) {
    try {
      var token = generateLocalToken();
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      return { success: true, token: token, local: true };
    } catch (e) {
      console.error('[Auth] localStorage write failed:', e);
      var errMsg = typeof e === 'object' && e.message ? e.message : String(e);
      return { success: false, error: '激活失败（浏览器存储异常）：' + errMsg };
    }
  }

  // 后端未配置时，非管理员码无法激活
  if (!isBackendConfigured()) {
    return { success: false, error: '激活码无效（后端未部署）' };
  }

  try {
    var res = await fetch(BACKEND_URL + '/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalized, deviceFingerprint: deviceId })
    });
    var data = await res.json();
    if (data.success) {
      try {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      } catch (e) {
        console.error('[Auth] localStorage write failed:', e);
        return { success: false, error: '激活失败：浏览器存储异常' };
      }
    }
    return data;
  } catch (e) {
    return { success: false, error: '网络错误，请检查网络连接' };
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
}

export function isBackendConfigured() {
  return BACKEND_URL.indexOf('你的') < 0 && BACKEND_URL.indexOf('xxxxx') < 0;
}

// 记住激活码
export function isRememberCode() {
  return localStorage.getItem(REMEMBER_CODE_KEY) === 'true';
}

export function getSavedCode() {
  return localStorage.getItem(SAVED_CODE_KEY) || '';
}

export function saveCodePreference(remember, code) {
  if (remember) {
    localStorage.setItem(REMEMBER_CODE_KEY, 'true');
    localStorage.setItem(SAVED_CODE_KEY, code || '');
  } else {
    localStorage.removeItem(REMEMBER_CODE_KEY);
    localStorage.removeItem(SAVED_CODE_KEY);
  }
}

export function getRememberedAuth() {
  return {
    token: localStorage.getItem(AUTH_TOKEN_KEY),
    rememberCode: isRememberCode(),
    savedCode: getSavedCode()
  };
}
