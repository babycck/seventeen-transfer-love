// prompts 模块入口
// 逐步拆分原有 prompts.js 到子模块中
// 当前阶段：直接重新导出，保持向后兼容

export { buildSystemPrompt, buildUserMessage, invalidateSystemPromptCache } from '../prompts.js';
export { buildContextSnapshot, snapshotToText } from './context-snapshot.js';
