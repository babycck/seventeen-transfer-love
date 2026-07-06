// Barrel: re-export all modal functions from individual files
// Each module handles its own imports.
// Keep this file so existing imports from './modals.js' continue to work.

export { createModal } from './modals/modal-factory.js';
export { showSmsModal } from './modals/sms-modal.js';
export { showXArchiveModal } from './modals/x-archive-modal.js';
export { showXItemsModal } from './modals/x-items-modal.js';
export { showSmsHistoryModal } from './modals/sms-history-modal.js';
export { showGiftPanel, sendGift, showRemakeGiftModal } from './modals/gift-panel.js';
export { showHistoryModal } from './modals/history-modal.js';
export { showHelpModal } from './modals/help-modal.js';
export { showHelpManual } from './modals/help-manual.js';
export { showAffectionPanel } from './modals/affection-panel.js';
export { showHeartNotesModal } from './modals/heart-notes-modal.js';
export { showApiSettingsModal } from './modals/api-settings-modal.js';
export { showConfirmModal } from './modals/confirm-modal.js';

// NEW 聚合弹窗（Header 按钮整合）
export { showHelpMergedModal } from './modals/help-merged-modal.js';
export { showReviewModal } from './modals/review-modal.js';
export { showArchiveModal } from './modals/archive-modal.js';

// re-export the modals from the other directories for convenience
export { showDatingDiceModal } from './modals/dating-dice.js';
export { showDay10DatingModal } from './modals/day10-dating.js';
export { showMidnightCallModal } from './modals/midnight-call.js';
export { showDrunkMemberSelectModal } from './modals/drunk-select.js';
export { showTruthAnswerModal } from './modals/truth-answer.js';
// 1v1 模式
export { showDiaryModal } from './modals/diary-modal.js';
export { showChatModal } from './modals/chat-modal.js';
export { showMomentsModal } from './modals/moments-modal.js';
export { showTheaterModal } from './modals/theater-modal.js';
export { showEventCardModal } from './modals/event-card.js';
export { showJealousyEvent, showSurpriseEvent, showPoolEvent } from './modals/event-modal.js';
