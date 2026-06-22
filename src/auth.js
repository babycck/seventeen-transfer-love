var AUTH_TOKEN_KEY = 'svt_auth_token';
var DEVICE_ID_KEY = 'svt_auth_device_id';
var REMEMBER_CODE_KEY = 'svt_auth_remember_code';
var SAVED_CODE_KEY = 'svt_auth_saved_code';

// ⚠️ 部署后替换为你的后端地址
// Cloudflare: https://xxxxx.workers.dev
// 腾讯云服务器: https://你的域名
// 腾讯云 API 网关: https://service-xxxxx.gz.apigw.tencentcs.com
var BACKEND_URL = 'https://你的后端地址';

// 本地管理员激活码（无需后端·永久有效·一万年）
var ADMIN_CODES = [
  'SVT-ADMIN-2024',
  '换乘恋爱-一万年',
  'SEVENTEEN-FOREVER'
];

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
  return token && token.indexOf('svt_local_') === 0;
}

export async function verifyToken() {
  var token = localStorage.getItem(AUTH_TOKEN_KEY);
  var deviceId = getDeviceFingerprint();
  if (!token) return { valid: false, error: '未激活' };

  // 本地管理员 Token 永不过期
  if (isLocalAdminToken(token)) {
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
    return { valid: data.success, error: data.error };
  } catch (e) {
    return { valid: false, error: '网络错误，请检查网络连接' };
  }
}

export async function activateCode(code) {
  var deviceId = getDeviceFingerprint();

  // 本地管理员激活码：无需后端·永久有效
  if (ADMIN_CODES.indexOf(code) >= 0) {
    var token = generateLocalToken();
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return { success: true, token: token, local: true };
  }

  // 后端未配置时，非管理员码无法激活
  if (!isBackendConfigured()) {
    return { success: false, error: '激活码无效（后端未部署）' };
  }

  try {
    var res = await fetch(BACKEND_URL + '/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceFingerprint: deviceId })
    });
    var data = await res.json();
    if (data.success) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
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
