// ============================================================
// 情敌主动事件池（rival intimacy 驱动）
// ============================================================
export var RIVAL_ADVANCE_EVENTS = [
  { key: 'rival_nudge', text: '团内成员"无意"在男主面前提起你，眼神却在你这边停留得比正常久了一点。', minIntimacy: 10, exposure: 0 },
  { key: 'rival_close', text: '团内成员借着工作名义坐到你旁边，递了杯咖啡："你最近很累吧，别太拼。"', minIntimacy: 20, exposure: 1 },
  { key: 'rival_confess', text: '团内成员在只有你们两人的楼梯间停下脚步，说："如果先遇见你的人是我，结果会不会不一样？"', minIntimacy: 40, exposure: 2, flag: 'rivalConfession' },
  { key: 'rival_fake_cp', text: '公司安排你和团内成员营业 CP，拍摄花絮里他低头帮你整理耳麦，镜头外男主攥紧了手。', minIntimacy: 30, exposure: 2, flag: 'rivalFakeCp' }
];
