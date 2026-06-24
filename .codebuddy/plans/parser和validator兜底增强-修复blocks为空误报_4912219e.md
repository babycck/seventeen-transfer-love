---
name: parser和validator兜底增强-修复blocks为空误报
overview: 当AI返回的JSON合法但blocks字段被sanitizeScene过滤为空时（字段名错或结构异常），增强诊断日志+字段名兼容+字符串block兜底，避免误触发"剧情内容为空"error
todos:
  - id: add-diagnostic-logging
    content: 在 parser.js 的 parseNarrative 中，JSON.parse 成功后添加诊断日志：当 obj.blocks 不存在时 console.warn 打印 obj 顶层 keys
    status: completed
  - id: add-field-name-compat
    content: 在 schema.js 的 sanitizeScene 中，obj.blocks 不存在时自动探测别名(narrative/story/paragraphs/scenes/contents/segments)并赋值
    status: completed
    dependencies:
      - add-diagnostic-logging
  - id: add-block-structure-fallback
    content: 在 schema.js 的 sanitizeScene filter 之前，将字符串元素包装为 {type:'narrative',content:str}，补全缺失 type 字段，转换非字符串 content
    status: completed
    dependencies:
      - add-field-name-compat
  - id: add-empty-blocks-warning
    content: 在 schema.js 的 sanitizeScene 中，最终 blocks 为空时 console.warn 打印原始 obj keys 和前 500 字符
    status: completed
    dependencies:
      - add-block-structure-fallback
---

## 用户需求

修复 AI 剧情生成时 `blocks` 为空导致重试失败的问题。当前 `JSON.parse` 成功但 `sanitizeScene` 过滤后 `blocks` 数组为空，触发 validator 返回 error，重试 2 次仍失败。需要做长期代码修复（三层防御），而非临时重新生成。

## 根因

`schema.js` 的 `sanitizeScene` 在 L157-167 对 `obj.blocks` 做严格过滤，要求每个元素是含 `type`(string) + `content`(非空string) 的对象。当 AI 返回的 JSON 格式正确但字段名/结构与预期不符时（如用 `narrative` 替代 `blocks`、数组里放字符串而非对象、content 为空），blocks 被过滤为空，且无任何日志输出，导致无法诊断。

## 修复范围

仅涉及 2 个文件，改动集中在 3 个函数：

- `src/schema.js` — `sanitizeScene`（L152-196）增加字段名兼容 + block 结构兜底 + 诊断日志
- `src/parser.js` — `parseNarrative`（L134-277）在 sanitizeScene 返回空 blocks 时补充诊断日志

## 技术方案

### 方案：三层防御（诊断日志 + 字段名兼容 + 结构兜底）

在 `sanitizeScene` 函数中，在现有 filter 逻辑之前插入预处理步骤，兜底三种 AI 返回异常场景：

**第1层：诊断日志**

- 在 `parseNarrative` 中，`JSON.parse` 成功后立即检查 `obj` 顶层 keys
- 在 `sanitizeScene` 中，当最终 blocks 为空时，`console.warn` 打印原始 obj 的 keys 和前 500 字符
- 使下次出现时能立刻定位 AI 返回了什么

**第2层：字段名兼容**

- 在 `sanitizeScene` 中，如果 `obj.blocks` 不存在或不是数组，自动探测常见别名：`narrative`、`story`、`paragraphs`、`scenes`、`contents`、`segments`
- 找到别名后赋值给 `obj.blocks`，让后续 filter 逻辑正常处理

**第3层：block 结构兜底**

- 在 filter 之前，遍历 blocks 数组，如果发现元素是字符串（非对象），自动包装成 `{type:'narrative', content: 该字符串}`
- 如果发现元素是对象但缺少 `type` 字段，默认补 `type:'narrative'`
- 如果发现元素是对象但 `content` 不是字符串，尝试 `String(b.content)` 转换

### 性能考量

- 预处理仅在实际存在异常时触发额外开销（正常路径 blocks 字段名正确、结构合规，预处理直接跳过）
- 无新增依赖，无异步操作，纯同步函数

### 代码风格

- 使用 `var` 声明（与现有代码一致）
- 字符串拼接用 `+` 运算符（与现有代码一致）
- 不引入新依赖