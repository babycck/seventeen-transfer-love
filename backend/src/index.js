export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/activate' && request.method === 'POST') {
      return handleActivate(request, env, corsHeaders);
    }

    if (url.pathname === '/api/verify' && request.method === 'POST') {
      return handleVerify(request, env, corsHeaders);
    }

    if (url.pathname === '/api/admin/generate' && request.method === 'POST') {
      return handleGenerate(request, env, corsHeaders);
    }

    if (url.pathname === '/api/admin/list' && request.method === 'POST') {
      return handleList(request, env, corsHeaders);
    }

    if (url.pathname === '/api/admin/disable' && request.method === 'POST') {
      return handleDisable(request, env, corsHeaders);
    }

    return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
  }
};

async function handleActivate(request, env, corsHeaders) {
  const { code, deviceFingerprint } = await request.json();
  if (!code || !deviceFingerprint) {
    return jsonResponse({ success: false, error: '缺少参数' }, 400, corsHeaders);
  }

  const codeKey = 'code:' + code;
  const codeData = await env.AUTH_KV.get(codeKey, { type: 'json' });

  if (!codeData) {
    return jsonResponse({ success: false, error: '激活码无效' }, 200, corsHeaders);
  }

  if (codeData.disabled) {
    return jsonResponse({ success: false, error: '激活码已禁用' }, 200, corsHeaders);
  }

  var deviceIds = codeData.deviceIds || [];
  var isNewDevice = deviceIds.indexOf(deviceFingerprint) < 0;

  if (isNewDevice && deviceIds.length >= codeData.maxDevices) {
    return jsonResponse({ success: false, error: '设备数量已达上限（' + codeData.maxDevices + '台）' }, 200, corsHeaders);
  }

  if (isNewDevice) {
    deviceIds.push(deviceFingerprint);
    codeData.deviceIds = deviceIds;
    await env.AUTH_KV.put(codeKey, JSON.stringify(codeData));
  }

  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  await env.AUTH_KV.put('token:' + token, JSON.stringify({
    code,
    deviceFingerprint,
    createdAt: Date.now(),
    expiresAt
  }));

  return jsonResponse({ success: true, token, expiresAt }, 200, corsHeaders);
}

async function handleVerify(request, env, corsHeaders) {
  const { token, deviceFingerprint } = await request.json();
  if (!token || !deviceFingerprint) {
    return jsonResponse({ success: false, error: '缺少参数' }, 400, corsHeaders);
  }

  const tokenData = await env.AUTH_KV.get('token:' + token, { type: 'json' });

  if (!tokenData) {
    return jsonResponse({ success: false, error: 'Token 无效' }, 200, corsHeaders);
  }

  if (tokenData.expiresAt < Date.now()) {
    return jsonResponse({ success: false, error: 'Token 已过期' }, 200, corsHeaders);
  }

  if (tokenData.deviceFingerprint !== deviceFingerprint) {
    return jsonResponse({ success: false, error: '设备不匹配' }, 200, corsHeaders);
  }

  return jsonResponse({ success: true }, 200, corsHeaders);
}

async function handleGenerate(request, env, corsHeaders) {
  const { adminKey, code, maxDevices } = await request.json();
  if (adminKey !== env.ADMIN_KEY) {
    return jsonResponse({ success: false, error: '管理员密钥错误' }, 403, corsHeaders);
  }

  if (!code) {
    return jsonResponse({ success: false, error: '缺少激活码' }, 400, corsHeaders);
  }

  const codeKey = 'code:' + code;
  const existing = await env.AUTH_KV.get(codeKey);
  if (existing) {
    return jsonResponse({ success: false, error: '激活码已存在' }, 200, corsHeaders);
  }

  await env.AUTH_KV.put(codeKey, JSON.stringify({
    maxDevices: maxDevices || 3,
    usedDevices: 0,
    createdAt: Date.now(),
    disabled: false,
    deviceIds: []
  }));

  return jsonResponse({ success: true, code, maxDevices: maxDevices || 3 }, 200, corsHeaders);
}

async function handleList(request, env, corsHeaders) {
  const { adminKey } = await request.json();
  if (adminKey !== env.ADMIN_KEY) {
    return jsonResponse({ success: false, error: '管理员密钥错误' }, 403, corsHeaders);
  }

  const list = await env.AUTH_KV.list({ prefix: 'code:' });
  var codes = [];
  for (const key of list.keys) {
    const data = await env.AUTH_KV.get(key.name, { type: 'json' });
    if (data) {
      codes.push({
        code: key.name.replace('code:', ''),
        maxDevices: data.maxDevices,
        usedDevices: (data.deviceIds || []).length,
        disabled: data.disabled,
        createdAt: data.createdAt
      });
    }
  }

  return jsonResponse({ success: true, codes }, 200, corsHeaders);
}

async function handleDisable(request, env, corsHeaders) {
  const { adminKey, code } = await request.json();
  if (adminKey !== env.ADMIN_KEY) {
    return jsonResponse({ success: false, error: '管理员密钥错误' }, 403, corsHeaders);
  }

  const codeKey = 'code:' + code;
  const data = await env.AUTH_KV.get(codeKey, { type: 'json' });
  if (!data) {
    return jsonResponse({ success: false, error: '激活码不存在' }, 200, corsHeaders);
  }

  data.disabled = true;
  await env.AUTH_KV.put(codeKey, JSON.stringify(data));

  return jsonResponse({ success: true }, 200, corsHeaders);
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = 'svt_';
  for (var i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
