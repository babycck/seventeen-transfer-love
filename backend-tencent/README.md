# SEVENTEEN 换乘恋爱 - 腾讯云激活码后端

提供两种部署方案，根据你的情况选择。

---

## 方案A：腾讯云轻量应用服务器（推荐·最简单）

适合：有一台固定服务器，不想折腾云函数和数据库。

### 1. 购买服务器
腾讯云轻量应用服务器，选最便宜的配置即可（新用户约 50-100元/年）。
系统选 **Ubuntu 22.04** 或 **CentOS 8**。

### 2. 连接服务器
```bash
ssh root@你的服务器IP
```

### 3. 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### 4. 上传后端代码
把 `backend-tencent/` 整个目录上传到你的服务器，例如 `/root/seventeen-auth/`。

可以用 `scp`、FileZilla、或者直接把代码复制粘贴上去。

### 5. 启动服务
```bash
cd /root/seventeen-auth
npm install   # 这个版本没有额外依赖，可省略
ADMIN_KEY=你的管理员密钥 node server.js
```

看到输出 `[Auth Server] 运行在 http://localhost:3000` 即成功。

### 6. 用 Nginx 反向代理 + HTTPS（必须）
安装 Nginx：
```bash
apt-get install nginx
```

编辑配置文件 `/etc/nginx/sites-available/auth`：
```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用配置：
```bash
ln -s /etc/nginx/sites-available/auth /etc/nginx/sites-enabled/
nginx -s reload
```

### 7. 配置 HTTPS（强烈推荐）
用腾讯云免费 SSL 证书，或者 Certbot：
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d 你的域名
```

### 8. 后台持久运行
用 pm2：
```bash
npm install -g pm2
pm2 start server.js --name "seventeen-auth" --env ADMIN_KEY="你的管理员密钥"
pm2 save
pm2 startup
```

### 9. 前端配置
修改 `src/auth.js`：
```javascript
var BACKEND_URL = 'https://你的域名';
```

重新构建前端：`npm run build`，把 dist/ 部署到腾讯云 COS 或任何静态托管。

---

## 方案B：腾讯云云函数 SCF + Redis（Serverless）

适合：不想维护服务器，愿意配 Redis。

### 1. 开通腾讯云 Redis
- 进入腾讯云控制台 → 云数据库 Redis
- 创建实例（选最便宜的按量计费或包年包月）
- 记录 **内网地址**、**端口**、**密码**

### 2. 创建云函数
- 进入腾讯云控制台 → 云函数
- 新建函数 → 从头开始 → 运行环境选 **Node.js 18**
- 把 `scf.js` 的内容粘贴到编辑器
- 添加依赖 `ioredis`（在层管理中配置或上传 node_modules）

### 3. 配置环境变量
在函数配置中添加：
- `REDIS_HOST` = Redis 内网地址
- `REDIS_PORT` = 6379
- `REDIS_PASSWORD` = Redis 密码
- `ADMIN_KEY` = 你的管理员密钥

### 4. 创建 API 网关触发器
- 在函数管理 → 触发管理 → 新建触发器
- 选 **API 网关触发器**
- 选 **发布环境**（生产环境）
- 记住生成的 URL（如 `https://service-xxxxx.gz.apigw.tencentcs.com`）

### 5. 前端配置
修改 `src/auth.js`：
```javascript
var BACKEND_URL = 'https://你的API网关地址';
```

---

## 激活码管理

### 生成激活码（方案A示例）
```bash
curl -X POST https://你的域名/api/admin/generate \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"你的密钥","code":"SVT2024A","maxDevices":3}'
```

### 查看所有激活码
```bash
curl -X POST https://你的域名/api/admin/list \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"你的密钥"}'
```

### 禁用激活码
```bash
curl -X POST https://你的域名/api/admin/disable \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"你的密钥","code":"SVT2024A"}'
```

---

## 两种方案对比

| 维度 | 方案A（轻量服务器） | 方案B（云函数+Redis） |
|------|---------------------|------------------------|
| 月成本 | 4-10元 | Redis 约 5-20元 |
| 维护难度 | 低 | 中 |
| 数据持久化 | 服务器本地文件 | Redis |
| 自动扩缩容 | 无 | 有 |
| 适合 | 小白/小范围 | 有一定基础 |

---

## 常见问题

**Q：前端和后端必须部署在同一个域名吗？**
A：不需要。但注意跨域（CORS），后端已默认设置 `Access-Control-Allow-Origin: *`。

**Q：Token 过期了怎么办？**
A：30 天后 Token 自动过期，玩家需要重新输入激活码激活。

**Q：如何解绑设备？**
A：目前没有自助解绑功能。可以禁用旧激活码，生成新激活码给玩家。
