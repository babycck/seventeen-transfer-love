---
name: fix-activation-admin-code
overview: 修复管理员码（SVT-ADMIN-2024 等）显示"激活码无效"的问题，增加异常捕获确保鉴权流程稳健
todos:
  - id: fix-admin-code-matching
    content: 修复 src/auth.js 管理员码匹配：新增 normalizeCode 归一化函数，增强 activateCode 管理员码验证逻辑，增加异常保护和调试输出
    status: completed
---

修复激活码系统的管理员码验证问题。用户输入管理员码（SVT-ADMIN-2024 / 换乘恋爱-一万年 / SEVENTEEN-FOREVER）后显示"激活码无效"，无法进入游戏。用户不希望关闭鉴权系统，仅修复管理员码匹配失败的问题。

## 核心功能

- 管理员码输入后能正确匹配并生成本地 Token
- 输入字符变体（全半角、不同连字符类型、大小写差异）不影响匹配
- 异常情况（localStorage 满/不可写）不至于导致激活流程中断

## 根因分析

`auth.js` 中管理员码通过 `ADMIN_CODES.indexOf(code)` 做**严格相等匹配**。用户在浏览器输入框输入的字符（尤其连字符、全半角符号）与硬编码字符串存在微量差异时（如 U+2013 en-dash vs U+002D hyphen-minus、全角 `－` vs 半角 `-`），匹配返回 -1，代码落到远程 API 调用路径 → 远端返回"激活码无效"。

## 修改方案

### 修改范围

仅修改 **`src/auth.js`** 一个文件，不动鉴权系统结构。

### 具体改动

1. **新增 `normalizeCode(str)` 工具函数**：归一化用户输入

- 去除首尾空白
- 统一各类连字符（en-dash `–`、em-dash `—`、连字符 `‐`、全角 `－`）→ 半角 `-` (U+002D)
- 全角字母/数字 → 半角
- 保持原有长度，不做截断

2. **增强 `activateCode()` 管理员码验证**：使用归一化后的输入与归一化后的管理员码做对比，而非 `indexOf` 精确匹配

3. **增加 try-catch 异常保护**：包裹 `localStorage.setItem` 等可能抛出的操作，确保异常时返回明确错误而非静默失败

4. **添加调试控制台输出**：打印实际输入码（转义后）和字符编码信息，便于后续定位

5. **增强 `verifyToken()`**：对 `svt_local_` 前缀的 token 做额外格式校验，避免无效数据导致反复跳回激活页

### 不做的改造

- 不删除/禁用鉴权系统
- 不修改 `init.js`、`ui-renderer.js`
- 不重构现有鉴权架构