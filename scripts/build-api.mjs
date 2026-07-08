// build:api — 用 Vite JS API 直接构建，绕过 CLI 二进制可能注入的干扰字符。
// 适用场景：在某些命令执行环境里 `vite build` 会报
//   Could not resolve entry module ";/index.html"
// 这是 harness 把 `;` 拼进 root 路径导致（D:/SEVENTEEN; + /index.html），
// 跟项目源码无关。改用 JS API 显式传 root 即可消除。
import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

build({
  root,
  configFile: resolve(root, 'vite.config.js'),
})
  .then((r) => {
    var n = r && r.modules ? r.modules.length : '?';
    console.log('BUILD_OK via JS API, modules=' + n);
    process.exit(0);
  })
  .catch((e) => {
    console.error('BUILD_FAIL');
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  });
