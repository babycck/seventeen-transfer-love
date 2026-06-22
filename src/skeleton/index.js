// 游戏骨架入口
// 骨架负责所有"游戏逻辑"：日程推进、选项生成、好感度结算、事件触发
// AI 只负责生成剧情文案

export { settlePendingAffChanges, settleChoiceAffection, determineMemberChoice } from './affection-engine.js';
export { autoTruthJudge, heroineRefuseDrink, checkDrunkTrigger, applyDrinksFromParsed } from './drink-engine.js';
export { generateOptions } from './option-engine.js';
export {
  checkJealousyMissionTrigger, checkExMessageTrigger,
  handleExMessageChoice, checkJealousyEvent, checkRandomEvent
} from './event-triggers.js';
export {
  resetDayState, cleanupSecretMission, updateObserverGuestPrevious,
  generateDayGifts, advanceDateAndWeather
} from './scheduler.js';
