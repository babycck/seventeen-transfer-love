// ============================================================
// 系统1 周期系统：4 相位（蛰伏/发力/高光/回落）× 阶段（新人/上升/巅峰/传奇）
// 相位推进 + 阶段派生 + 恋爱风险倍率 + 每日日程抽取
// ============================================================
import { GS, saveGame } from '../state.js';
import { randInt } from '../utils.js';
import { CYCLE_PHASES, CYCLE_STAGE_META } from './data.js';
import { popularity, careerLevelOf } from './state.js';

var PHASE_DURATION = 4; // 每个相位持续回合数

// 推进周期：增加各类计数，必要时翻相位 / 重算阶段
export function advanceCycle() {
  var c = GS.entSim.cycle;
  c.roundTotal++;
  c.roundInPhase++;
  c.roundInChapter++;
  var E = GS.entSim;
  E.chapter.roundInChapter = c.roundInChapter;

  var phaseChanged = false;
  if (c.roundInPhase >= PHASE_DURATION) {
    c.roundInPhase = 0;
    c.phaseIndex = (c.phaseIndex + 1) % CYCLE_PHASES.length;
    phaseChanged = true;
  }

  // 阶段由人气阈值派生
  var pop = popularity();
  var newStage = 0;
  for (var i = 0; i < CYCLE_STAGE_META.length; i++) {
    if (pop >= CYCLE_STAGE_META[i].popThreshold) newStage = i;
  }
  var stageChanged = (newStage !== c.stageIndex);
  c.stageIndex = newStage;

  saveGame();
  return {
    phaseChanged: phaseChanged,
    newPhase: CYCLE_PHASES[c.phaseIndex].key,
    phaseIcon: CYCLE_PHASES[c.phaseIndex].icon,
    stageChanged: stageChanged,
    newStage: CYCLE_STAGE_META[c.stageIndex].key,
    stageIcon: CYCLE_STAGE_META[c.stageIndex].icon
  };
}

export function getCyclePhaseLabel() {
  var c = GS.entSim.cycle;
  return CYCLE_PHASES[c.phaseIndex].key;
}
export function getCyclePhaseIcon() {
  return CYCLE_PHASES[GS.entSim.cycle.phaseIndex].icon;
}
export function getCycleStageLabel() {
  return CYCLE_STAGE_META[GS.entSim.cycle.stageIndex].key;
}
export function getCyclePhaseMeaning() {
  return CYCLE_PHASES[GS.entSim.cycle.phaseIndex].meaning;
}

// 恋爱风险倍率（系统5 评估用）：相位 riskMult × 阶段系数
export function getRomanceRiskMultiplier() {
  var phase = CYCLE_PHASES[GS.entSim.cycle.phaseIndex];
  var stageCoef = 1 + GS.entSim.cycle.stageIndex * 0.25;
  return phase.riskMult * stageCoef;
}

// 每日日程抽取（左栏日程区）：主档 / 相关档 / 晚档
var MAIN_POOL = {
  '蛰伏期': ['声乐课', '形体课', '剧本围读', '健身房', '配音课'],
  '发力期': ['新歌录制', '杂志拍摄', '综艺录制', '广告拍摄', '排练室'],
  '高光期': ['颁奖礼彩排', '打歌舞台', '品牌活动', '访谈录制', '演唱会'],
  '回落期': ['复盘会议', '轻量营业', '休息调整', '读书充电', '朋友小聚']
};
var RELATED_POOL = ['经纪人会议', '造型师碰头', '粉丝后援会', '媒体午餐会', '同行酒会'];
var RIVAL_POOL = ['情敌同场活动', '情敌直播', '情敌新剧开机', '情敌获奖', '情敌营业'];

export function rollDailyAgenda() {
  var phase = getCyclePhaseLabel();
  var main = pick(MAIN_POOL[phase]);
  var related = pick(RELATED_POOL);
  var rival = pick(RIVAL_POOL);
  GS.entSim.agenda = { main: main, related: related, rival: rival, doneFlags: {} };
  saveGame();
  return GS.entSim.agenda;
}

function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
