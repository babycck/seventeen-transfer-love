const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-admin-key';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filename) {
  const fp = path.join(DATA_DIR, filename + '.json');
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJSON(filename, data) {
  const fp = path.join(DATA_DIR, filename + '.json');
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
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

function jsonResponse(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    jsonResponse(res, {});
    return;
  }

  const urlPath = req.url;

  if (urlPath === '/api/activate' && req.method === 'POST') {
    const { code, deviceFingerprint } = await parseBody(req);
    if (!code || !deviceFingerprint) {
      jsonResponse(res, { success: false, error: '缺少参数' }, 400);
      return;
    }

    const codeData = readJSON('code_' + code);
    if (!codeData) {
      jsonResponse(res, { success: false, error: '激活码无效' });
      return;
    }

    if (codeData.disabled) {
      jsonResponse(res, { success: false, error: '激活码已禁用' });
      return;
    }

    // 检查激活码有效期
    const dateCheck = isCodeDateValid(codeData);
    if (!dateCheck.valid) {
      jsonResponse(res, { success: false, error: dateCheck.error });
      return;
    }

    const deviceIds = codeData.deviceIds || [];
    const isNewDevice = !deviceIds.includes(deviceFingerprint);

    if (isNewDevice && deviceIds.length >= codeData.maxDevices) {
      jsonResponse(res, { success: false, error: `设备数量已达上限（${codeData.maxDevices}台）` });
      return;
    }

    if (isNewDevice) {
      deviceIds.push(deviceFingerprint);
      codeData.deviceIds = deviceIds;
      writeJSON('code_' + code, codeData);
    }

    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    writeJSON('token_' + token, {
      code,
      deviceFingerprint,
      createdAt: Date.now(),
      expiresAt
    });

    jsonResponse(res, { success: true, token, expiresAt });
    return;
  }

  if (urlPath === '/api/verify' && req.method === 'POST') {
    const { token, deviceFingerprint } = await parseBody(req);
    if (!token || !deviceFingerprint) {
      jsonResponse(res, { success: false, error: '缺少参数' }, 400);
      return;
    }

    const tokenData = readJSON('token_' + token);
    if (!tokenData) {
      jsonResponse(res, { success: false, error: 'Token 无效' });
      return;
    }

    if (tokenData.expiresAt < Date.now()) {
      jsonResponse(res, { success: false, error: 'Token 已过期' });
      return;
    }

    // 检查原始激活码是否仍在有效期内
    // 如 code 已过期，即使 Token 未到期也强制失效
    const codeData = readJSON('code_' + tokenData.code);
    if (codeData) {
      const dateCheck = isCodeDateValid(codeData);
      if (!dateCheck.valid) {
        jsonResponse(res, { success: false, error: dateCheck.error });
        return;
      }
    }

    if (tokenData.deviceFingerprint !== deviceFingerprint) {
      jsonResponse(res, { success: false, error: '设备不匹配' });
      return;
    }

    jsonResponse(res, { success: true });
    return;
  }

  if (urlPath === '/api/admin/generate' && req.method === 'POST') {
    const { adminKey, code, maxDevices = 3, validFrom, validUntil } = await parseBody(req);
    if (adminKey !== ADMIN_KEY) {
      jsonResponse(res, { success: false, error: '管理员密钥错误' }, 403);
      return;
    }

    if (!code) {
      jsonResponse(res, { success: false, error: '缺少激活码' }, 400);
      return;
    }

    if (readJSON('code_' + code)) {
      jsonResponse(res, { success: false, error: '激活码已存在' });
      return;
    }

    // 验证日期格式
    if (validFrom && !/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
      jsonResponse(res, { success: false, error: 'validFrom 格式错误，应为 YYYY-MM-DD' }, 400);
      return;
    }
    if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
      jsonResponse(res, { success: false, error: 'validUntil 格式错误，应为 YYYY-MM-DD' }, 400);
      return;
    }

    writeJSON('code_' + code, {
      maxDevices,
      createdAt: Date.now(),
      disabled: false,
      deviceIds: [],
      validFrom: validFrom || null,
      validUntil: validUntil || null
    });

    jsonResponse(res, { success: true, code, maxDevices, validFrom: validFrom || null, validUntil: validUntil || null });
    return;
  }

  if (urlPath === '/api/admin/list' && req.method === 'POST') {
    const { adminKey } = await parseBody(req);
    if (adminKey !== ADMIN_KEY) {
      jsonResponse(res, { success: false, error: '管理员密钥错误' }, 403);
      return;
    }

    const files = fs.readdirSync(DATA_DIR);
    const codes = [];
    for (const file of files) {
      if (file.startsWith('code_') && file.endsWith('.json')) {
        const data = readJSON(file.replace('.json', ''));
        if (data) {
          var today = todayDateStr();
          var expired = data.validUntil && today > data.validUntil;
          var notYet = data.validFrom && today < data.validFrom;
          codes.push({
            code: file.replace('code_', '').replace('.json', ''),
            maxDevices: data.maxDevices,
            usedDevices: (data.deviceIds || []).length,
            disabled: data.disabled,
            createdAt: data.createdAt,
            validFrom: data.validFrom || null,
            validUntil: data.validUntil || null,
            status: data.disabled ? '已禁用' : expired ? '已过期' : notYet ? '未生效' : '有效'
          });
        }
      }
    }

    jsonResponse(res, { success: true, codes });
    return;
  }

  if (urlPath === '/api/admin/disable' && req.method === 'POST') {
    const { adminKey, code } = await parseBody(req);
    if (adminKey !== ADMIN_KEY) {
      jsonResponse(res, { success: false, error: '管理员密钥错误' }, 403);
      return;
    }

    const data = readJSON('code_' + code);
    if (!data) {
      jsonResponse(res, { success: false, error: '激活码不存在' });
      return;
    }

    data.disabled = true;
    writeJSON('code_' + code, data);
    jsonResponse(res, { success: true });
    return;
  }

  jsonResponse(res, { error: 'Not Found' }, 404);
});

server.listen(PORT, () => {
  console.log(`[Auth Server] 运行在 http://localhost:${PORT}`);
  console.log(`[Auth Server] 管理员密钥: ${ADMIN_KEY}`);
  console.log(`[Auth Server] 数据目录: ${DATA_DIR}`);
});
