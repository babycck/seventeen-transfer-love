# SEVENTEEN 换乘恋爱 - 激活码后端部署指南

## 技术栈
- **Cloudflare Workers**（免费 Serverless 后端）
- **Cloudflare KV**（免费键值存储）

## 部署步骤

### 1. 注册 Cloudflare 账号
访问 https://dash.cloudflare.com/sign-up 注册（已有账号跳过）

### 2. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare
```bash
wrangler login
```
浏览器会弹出授权页面，点击允许。

### 4. 创建 KV Namespace
```bash
wrangler kv:namespace create "AUTH_KV"
```

执行后会返回类似：
```
{ binding = "AUTH_KV", id = "xxxxxxxxxxxxxxxxxxxx" }
```

### 5. 修改 wrangler.toml
打开 `wrangler.toml`，把刚才的 id 填进去：
```toml
[[kv_namespaces]]
binding = "AUTH_KV"
id = "xxxxxxxxxxxxxxxxxxxx"  <-- 替换为你的 id

[vars]
ADMIN_KEY = "your-secret-admin-key-123"  <-- 修改为你的管理员密钥
```

### 6. 部署后端
```bash
wrangler deploy
```

部署成功后会显示：
```
Published seventeen-transfer-auth (xxxxx.workers.dev)
```

### 7. 复制 Worker 地址
把 `https://xxxxx.workers.dev` 这个地址记下来，待会要填到前端代码里。

---

## 激活码管理

### 生成激活码
用 curl 或 Postman 调用：
```bash
curl -X POST https://xxxxx.workers.dev/api/admin/generate \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"your-secret-admin-key-123","code":"SEVENTEEN2024","maxDevices":3}'
```

参数：
- `adminKey`：wrangler.toml 里设置的 ADMIN_KEY
- `code`：你想创建的激活码（自定义）
- `maxDevices`：最多绑定几台设备（默认3）

### 查看所有激活码
```bash
curl -X POST https://xxxxx.workers.dev/api/admin/list \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"your-secret-admin-key-123"}'
```

### 禁用激活码
```bash
curl -X POST https://xxxxx.workers.dev/api/admin/disable \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"your-secret-admin-key-123","code":"SEVENTEEN2024"}'
```

---

## API 接口说明

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/activate` | POST | 玩家激活（输入激活码） |
| `/api/verify` | POST | Token 验证（每次启动游戏时调用） |
| `/api/admin/generate` | POST | 生成新激活码 |
| `/api/admin/list` | POST | 列出所有激活码 |
| `/api/admin/disable` | POST | 禁用激活码 |

---

## 费用
Cloudflare Workers 免费档：
- 每天 100,000 次请求
- KV 读写：每天 100,000 次

一个小游戏完全够用，基本零成本。
