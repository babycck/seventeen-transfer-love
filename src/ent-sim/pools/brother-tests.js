// ============================================================
// 哥哥递进考验池（按好感 15/40/70 触发）
// ============================================================
export var BROTHER_ADVANCE_TESTS = [
  { key: 'test_1', minAff: 15, maxAff: 39, text: '哥哥把你拉到练习室角落："他最近看你的眼神不对，你给我说实话，你们是不是在暧昧？"支持度 +3/-3。', support: 3, failSupport: -3, flag: 'testNudged1' },
  { key: 'test_2', minAff: 40, maxAff: 69, text: '哥哥故意在男主面前安排你和情敌独处（让情敌送你回家），男主脸色变了，但什么都没说。支持度 +5/-5。', support: 5, failSupport: -5, flag: 'testNudged2' },
  { key: 'test_3', minAff: 70, text: '结局前哥哥把你和男主叫到一起，把麦克风塞到你手里："今天你给我一句准话，你要不要他。"支持度 +8/-8。', support: 8, failSupport: -8, flag: 'testNudged3' }
];
