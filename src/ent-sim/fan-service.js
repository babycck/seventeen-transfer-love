// ============================================================
// 系统8 营业：6 型营业 + 反噬 + CP 烟雾弹 + 人设崩塌
// 越营业越被当"工具人"；CP 烟雾弹给情敌 +；高曝光期反噬更狠
// ============================================================
import { GS, saveGame } from '../state.js';
import { FAN_SERVICE_TYPES } from './data.js';
import { applyOpinionImpact } from './public-opinion.js';
import { getRomanceRiskMultiplier } from './cycle.js';
import { advanceRomance } from './romance.js';

// 执行一次营业（subject：营业CP可指定对象——男主→假戏真做，情敌/其他男艺人→烟雾弹掩护）
export function doFanService(type, subject) {
  var E = GS.entSim;
  var def = FAN_SERVICE_TYPES[type];
  if (!def) return { ok: false };
  var deltas = { fan: def.fan, media: def.media, anti: def.anti };
  applyOpinionImpact(deltas, '营业·' + def.label);

  var exposureAccum = 0;
  // 高光期反噬：risk 越高，媒体/黑粉额外涨
  var mult = getRomanceRiskMultiplier();
  if (def.risk >= 3) {
    var back = Math.round(def.risk * (mult - 1) * 2);
    if (back > 0) {
      applyOpinionImpact({ media: back, anti: Math.ceil(back / 2) }, '营业反噬·' + def.label);
      exposureAccum += back;
    }
  }
  // CP 烟雾弹
  var smoke = false;
  if (def.smoke) {
    if (type === 'cp' && subject === '男主') {
      // 营业CP指向男主 → 假戏真做累计，达阈值推进恋爱深度（一次性触发）
      E.misc.cpRealProgress = (E.misc.cpRealProgress || 0) + 1;
      if (!E.misc.cpRealTriggered && E.misc.cpRealProgress >= 3) {
        E.misc.cpRealTriggered = true;
        advanceRomance(1);
        E.careerHistory.push({ round: E.cycle.roundTotal, type: 'romance', text: '与男主的营业CP假戏真做，感情明朗' });
      }
      smoke = true; // 仍抛烟雾弹掩护真实恋情
    } else {
      // 指向情敌 / 其他男艺人 → 烟雾弹掩护，情敌亲密 +3
      var rival = E.npcNetwork.nodes['npc_rival'];
      if (rival) { rival.intimacy = (rival.intimacy || 0) + 3; smoke = true; }
    }
  }
  // 人设崩塌：anti 过高时触发
  var collapse = false;
  if (E.publicOpinion.anti >= 60) { collapse = true; applyOpinionImpact({ fan: -3, media: -2 }, '人设崩塌'); }

  E.misc.exposureAccum = (E.misc.exposureAccum || 0) + exposureAccum;
  E.careerHistory.push({ round: E.cycle.roundTotal, type: 'fanservice', text: '营业：' + def.label });
  saveGame();
  return { ok: true, type: type, deltas: deltas, smoke: smoke, collapse: collapse, exposureAccum: exposureAccum, realCp: (type === 'cp' && subject === '男主') };
}

export function fanServiceTypes() { return FAN_SERVICE_TYPES; }
