const crypto = require('crypto');

// 腾讯云 SCF + API 网关触发器版本
// 需要配合 Redis 使用（腾讯云 Redis）

// 安装依赖: npm i ioredis
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  console.error('请先安装 ioredis: npm install ioredis');
}

const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-admin-key';

let redisClient = null;
function getRedis() {
  if (!redisClient && Redis) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: 0,
      connectTimeout: 5000,
      commandTimeout: 5000
    });
  }
  return redisClient;
}

function generateToken() {
  return 'svt_' + crypto.randomBytes(24).toString('hex');
}

// 获取今天的日期字符串 (YYYY-MM-DD)
function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

// 检查激活码是否在有效期内
function isCodeDateValid(codeData) {
  var today = todayDateStr();
  if (codeData.validFrom && today < codeData.validFrom) {
    return { valid: false, error: '激活码尚未生效（生效日：' + codeData.validFrom + '）' };
  }
  if (codeData.validUntil && today > codeData.validUntil) {
    return { valid: false, error: '激活码已过期（有效期至：' + codeData.validUntil + '）' };
  }
  return { valid: true };
}

function jsonResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(data)
  };
}

exports.main_handler = async (event, context) => {
  const { path, httpMethod, body } = event;

  if (httpMethod === 'OPTIONS') {
    return jsonResponse({});
  }

  const parsedBody = JSON.parse(body || '{}');

  if (path === '/api/activate' && httpMethod === 'POST') {
    const { code, deviceFingerprint } = parsedBody;
    if (!code || !deviceFingerprint) {
      return jsonResponse({ success: false, error: '缺少参数' }, 400);
    }

    const redis = getRedis();
    const codeKey = 'code:' + code;
    const codeDataRaw = await redis.get(codeKey);
    if (!codeDataRaw) {
      return jsonResponse({ success: false, error: '激活码无效' });
    }

    const codeData = JSON.parse(codeDataRaw);
    if (codeData.disabled) {
      return jsonResponse({ success: false, error: '激活码已禁用' });
    }

    // 检查激活码有效期
    const dateCheck = isCodeDateValid(codeData);
    if (!dateCheck.valid) {
      return jsonResponse({ success: false, error: dateCheck.error });
    }

    const deviceIds = codeData.deviceIds || [];
    const isNewDevice = !deviceIds.includes(deviceFingerprint);

    if (isNewDevice && deviceIds.length >= codeData.maxDevices) {
      return jsonResponse({ success: false, error: `设备数量已达上限（${codeData.maxDevices}台）` });
    }

    if (isNewDevice) {
      deviceIds.push(deviceFingerprint);
      codeData.deviceIds = deviceIds;
      await redis.set(codeKey, JSON.stringify(codeData));
    }

    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await redis.setex('token:' + token, 30 * 24 * 60 * 60, JSON.stringify({
      code,
      deviceFingerprint,
      createdAt: Date.now(),
      expiresAt
    }));

    return jsonResponse({ success: true, token, expiresAt });
  }

  if (path === '/api/verify' && httpMethod === 'POST') {
    const { token, deviceFingerprint } = parsedBody;
    if (!token || !deviceFingerprint) {
      return jsonResponse({ success: false, error: '缺少参数' }, 400);
    }

    const redis = getRedis();
    const tokenDataRaw = await redis.get('token:' + token);
    if (!tokenDataRaw) {
      return jsonResponse({ success: false, error: 'Token 无效' });
    }

    const tokenData = JSON.parse(tokenDataRaw);
    if (tokenData.expiresAt < Date.now()) {
      return jsonResponse({ success: false, error: 'Token 已过期' });
    }

    // 检查原始激活码是否仍在有效期内
    const codeDataRaw = await redis.get('code:' + tokenData.code);
    if (codeDataRaw) {
      const codeData = JSON.parse(codeDataRaw);
      const dateCheck = isCodeDateValid(codeData);
      if (!dateCheck.valid) {
        return jsonResponse({ success: false, error: dateCheck.error });
      }
    }

    if (tokenData.deviceFingerprint !== deviceFingerprint) {
      return jsonResponse({ success: false, error: '设备不匹配' });
    }

    return jsonResponse({ success: true });
  }

  if (path === '/api/admin/generate' && httpMethod === 'POST') {
    const { adminKey, code, maxDevices = 3, validFrom, validUntil } = parsedBody;
    if (adminKey !== ADMIN_KEY) {
      return jsonResponse({ success: false, error: '管理员密钥错误' }, 403);
    }
    if (!code) {
      return jsonResponse({ success: false, error: '缺少激活码' }, 400);
    }

    // 验证日期格式
    if (validFrom && !/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
      return jsonResponse({ success: false, error: 'validFrom 格式错误，应为 YYYY-MM-DD' }, 400);
    }
    if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
      return jsonResponse({ success: false, error: 'validUntil 格式错误，应为 YYYY-MM-DD' }, 400);
    }

    const redis = getRedis();
    const exists = await redis.get('code:' + code);
    if (exists) {
      return jsonResponse({ success: false, error: '激活码已存在' });
    }

    await redis.set('code:' + code, JSON.stringify({
      maxDevices,
      createdAt: Date.now(),
      disabled: false,
      deviceIds: [],
      validFrom: validFrom || null,
      validUntil: validUntil || null
    }));

    return jsonResponse({ success: true, code, maxDevices, validFrom: validFrom || null, validUntil: validUntil || null });
  }

  if (path === '/api/admin/list' && httpMethod === 'POST') {
    const { adminKey } = parsedBody;
    if (adminKey !== ADMIN_KEY) {
      return jsonResponse({ success: false, error: '管理员密钥错误' }, 403);
    }

    const redis = getRedis();
    const keys = await redis.keys('code:*');
    const codes = [];
    for (const key of keys) {
      const data = JSON.parse(await redis.get(key));
      var today = todayDateStr();
      var expired = data.validUntil && today > data.validUntil;
      var notYet = data.validFrom && today < data.validFrom;
      codes.push({
        code: key.replace('code:', ''),
        maxDevices: data.maxDevices,
        usedDevices: (data.deviceIds || []).length,
        disabled: data.disabled,
        createdAt: data.createdAt,
        validFrom: data.validFrom || null,
        validUntil: data.validUntil || null,
        status: data.disabled ? '已禁用' : expired ? '已过期' : notYet ? '未生效' : '有效'
      });
    }

    return jsonResponse({ success: true, codes });
  }

  if (path === '/api/admin/disable' && httpMethod === 'POST') {
    const { adminKey, code } = parsedBody;
    if (adminKey !== ADMIN_KEY) {
      return jsonResponse({ success: false, error: '管理员密钥错误' }, 403);
    }

    const redis = getRedis();
    const dataRaw = await redis.get('code:' + code);
    if (!dataRaw) {
      return jsonResponse({ success: false, error: '激活码不存在' });
    }

    const data = JSON.parse(dataRaw);
    data.disabled = true;
    await redis.set('code:' + code, JSON.stringify(data));

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not Found' }, 404);
};
