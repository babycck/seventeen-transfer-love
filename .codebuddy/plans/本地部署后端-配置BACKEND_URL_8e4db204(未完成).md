---
name: 本地部署后端-配置BACKEND_URL
overview: 将激活码后端配置为本地运行模式：修改 src/auth.js 的 BACKEND_URL 指向 http://localhost:3000，并整理本地启动后端+前端、生成激活码的操作流程，让用户电脑保持开机即可完整测试激活码有效期功能。
todos:
  - id: modify-backend-url
    content: "修改 src/auth.js 的 BACKEND_URL 为动态本地地址，vite.config.js 添加 host: true"
    status: pending
  - id: create-startup-script
    content: 创建启动本地完整环境.bat 一键启动前后端双服务
    status: pending
    dependencies:
      - modify-backend-url
  - id: test-activation-flow
    content: 启动服务并测试管理员码激活、普通码生成与有效期校验完整流程
    status: pending
    dependencies:
      - create-startup-script
---

## 用户需求

用户要将激活码后端部署到本地电脑运行，电脑保持开机，先完成本地测试，之后再迁移到云端。

## 产品概述

在本地同时运行前端（Vite 5173）和后端（Node.js 3000），使激活码鉴权系统完整可用。支持管理员码（本地永久有效）和普通激活码（带有效期，需后端在线）。局域网内手机也可通过 WiFi 访问测试。

## 核心功能

- 修改前端配置，使 BACKEND_URL 自动适配本地/局域网地址
- 创建一键启动脚本，同时拉起前后端服务
- 测试管理员码激活流程（无需后端）
- 测试普通激活码生成、激活、有效期校验的完整流程

## 技术栈

- 前端：Vite 5.4 + Vanilla JS（ES Modules），端口 5173
- 后端：Node.js 原生 HTTP Server（`backend-tencent/server.js`），端口 3000
- 数据存储：本地 JSON 文件（`backend-tencent/data/` 目录）
- 无新增依赖

## 实现方案

### 核心改动：动态 BACKEND_URL

将 `src/auth.js` 第 10 行从硬编码占位符改为动态拼接：

```js
var BACKEND_URL = 'http://' + location.hostname + ':3000';
```

- 从 `localhost:5173` 访问 → 后端连 `localhost:3000`
- 从 `192.168.x.x:5173` 访问（手机同 WiFi）→ 后端连 `192.168.x.x:3000`
- `isBackendConfigured()` 检测 "你的"/"xxxxx" 关键字，改为动态地址后自动返回 true
- 后端 `server.listen(PORT)` 默认监听 `0.0.0.0`，局域网可直接访问
- 后端 CORS 已配置 `Access-Control-Allow-Origin: *`，无跨域问题

### 一键启动脚本

创建 `启动本地完整环境.bat`，用 `start` 命令分两个窗口启动后端和前端：

- 窗口 1：`cd backend-tencent && node server.js`
- 窗口 2：`node node_modules/vite/bin/vite.js --host`（`--host` 开启局域网访问）

### 测试流程

1. 管理员码测试：输入 `SVT-ADMIN-2024`，本地直接通过，无需后端
2. 普通码测试：用 curl 调用 `/api/admin/generate` 生成带有效期的激活码，然后在前端输入激活
3. 有效期测试：生成一个 `validUntil` 为昨天的码，验证激活被拒绝

## 实现注意事项

- `ADMIN_KEY` 默认为 `change-me-admin-key`（server.js 第 8 行），本地测试可用默认值，上云时务必通过环境变量修改
- 后端数据目录 `backend-tencent/data/` 会在首次运行时自动创建
- `init.js` 中鉴权流程已开启（第 87-98 行），后端未运行时普通码用户会看到"网络错误"，管理员码不受影响
- Vite 配置（`vite.config.js`）需添加 `host: true` 以支持局域网访问，或通过命令行 `--host` 参数实现
- 后续上云时只需将 `BACKEND_URL` 改为云端域名即可，其余代码无需变动

## 目录结构

```
d:\SEVENTEEN\
├── src/
│   └── auth.js                          # [MODIFY] 第10行 BACKEND_URL 改为动态拼接 'http://' + location.hostname + ':3000'
├── vite.config.js                       # [MODIFY] server 配置添加 host: true，支持局域网访问
├── backend-tencent/
│   ├── server.js                        # [无改动] 已有完整有效期功能
│   ├── package.json                     # [无改动]
│   └── data/                            # [自动生成] 首次运行后端时自动创建，存储激活码和 Token 的 JSON 文件
└── 启动本地完整环境.bat                  # [NEW] 一键启动前后端的双窗口批处理脚本
```