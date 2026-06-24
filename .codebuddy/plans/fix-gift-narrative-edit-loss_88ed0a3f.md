---
name: fix-gift-narrative-edit-loss
overview: 修复编辑送礼剧情后内容丢失的 bug：saveNarrativeEdit 的段落映射逻辑在「单 block 多段内容」时只保留第一段，导致用户编辑保存后剧情"全没了"。修复方式为最后一个 content block 且剩余段落 >1 时合并剩余段落。
todos:
  - id: fix-paragraph-mapping
    content: 修改 narrative-box.js 的 saveNarrativeEdit 函数：循环结束后追加兜底逻辑，将剩余段落合并到最后一个 content block，修复送礼等单 block 多段剧情编辑后内容丢失问题
    status: completed
---

## 用户需求

用户在送礼后点击「编辑」修改 AI 生成的剧情文本，保存后剧情内容大量丢失。

## 根因

送礼剧情 `sendGift` 走兜底逻辑，将 AI 返回的纯文本（可能含多个自然段，以空行分隔）塞入单个 block（`blocks: [{type:'narrative', content: reaction}]`）。编辑保存时，`saveNarrativeEdit` 用 `split(/\n{2,}/)` 将编辑框文本拆成多段，再 1:1 映射回 blocks。因 blocks 只有 1 个，循环只执行一次，只保留第 1 段，其余段落全部丢弃。

## 核心修复

修改 `saveNarrativeEdit` 的段落映射逻辑：循环结束后若仍有剩余段落（`pi < paragraphs.length`），找到最后一个有 `content` 属性的 block，将剩余段落去除前缀标记后用 `\n\n` 合并追加到该 block 的 content 中，而非丢弃。

## 影响范围

该修复同时惠及所有「单 block 多段」剧情的编辑场景（送礼兜底、短信回复兜底等），不限于送礼。正常多 block 剧情（段落数 == block 数）的 1:1 映射行为不变。

## 技术栈

- 纯 JavaScript（ES Modules），Vanilla JS + Vite
- 遵循项目约定：`var` 声明、`+` 字符串拼接、无模板字符串、无新依赖

## 修改方案

仅修改 `src/ui/narrative-box.js` 的 `saveNarrativeEdit` 函数（第 386-400 行的段落映射循环）。

在现有 for 循环之后追加一段兜底逻辑：检查 `pi < paragraphs.length`（即有剩余段落未消费），若为真则从 blocks 末尾向前找最后一个 `content !== undefined` 的 block，将剩余段落逐个去除前缀标记后用 `\n\n` 拼接，追加到该 block 的 content 末尾。

### 三种场景的行为保证

- **段落数 == block 数**（正常 JSON 剧情）：循环正常 1:1 映射，pi 恰好用尽，兜底逻辑不触发，行为不变
- **段落数 < block 数**：pi 先耗尽，循环退出，剩余 blocks 保持原内容，兜底逻辑不触发，行为不变
- **段落数 > block 数**（送礼/短信兜底单 block 多段）：循环用尽 blocks 后退出，兜底逻辑将剩余段落合并追加到最后一个 content block，不再丢弃

### 渲染兼容性

`renderParsedNarrative` 中 `splitChineseSentences` 会跳过 `\n` 字符并按句末标点断句，因此合并后的 content 中的 `\n\n` 不影响渲染——只要各段落以句号/感叹号/问号结尾，就能正确拆分为多个 `<p>` 标签。

## 实现注意事项

- 前缀去除正则需与现有循环中的完全一致：`/^(🎙 |🎙️💔 |🎤【[^】]*】 |🎬 |💭 )/`
- 追加时使用 `\n\n` 连接，保持与编辑框中双换行分段的一致性
- 兜底逻辑放在现有 for 循环之后、`JSON.stringify` 之前，不改动循环本身
- 不触碰 `extractNarrativeText`、`renderParsedNarrative`、`sendGift` 等其他函数