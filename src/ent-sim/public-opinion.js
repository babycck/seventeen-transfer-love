// ============================================================
// 娱乐圈模拟器（entSim）· 曝光阶梯（v2 拆分版）
// - scandalHeat：恋情曝光风险（约会/深夜见面/被拍/绯闻），驱动绯闻阶梯与结局
// - careerPublicity：事业曝光度（发布作品/代言/综艺/画报），仅影响人气增长速率
// 旧字段 exposureAccum 保留向后兼容读取，新写入均使用 split 字段。
// 旧四维舆论（fan/media/professional/anti）已移除。
// 相关：engine.applySideEffects 累加曝光；endings 按 getExposureTier 定结局档位。
// ============================================================
import { GS, saveGame } from '../state.js';
import { addPopularity } from './state.js';

// 获取有效的恋情曝光值（兼容旧存档：scandalHeat 不存在时 fallback 到 exposureAccum）
export function getScandalHeat() {
  var E = GS.entSim;
  if (!E || !E.misc) return 0;
  if (typeof E.misc.scandalHeat === 'number') return E.misc.scandalHeat;
  // 迁移过渡：旧存档只有 exposureAccum，全量视为恋情风险
  E.misc.scandalHeat = (typeof E.misc.exposureAccum === 'number') ? E.misc.exposureAccum : 0;
  if (typeof E.misc.careerPublicity !== 'number') E.misc.careerPublicity = 0;
  return E.misc.scandalHeat;
}

function _scandalHeat() { return getScandalHeat(); }

// 恋情曝光阶梯阈值（以 scandalHeat 为判据）
// 阶梯：安全(<5) → 暗涌(5) → 升温(10) → 哗然(15) → 引爆(25)
export function getExposureTier() {
  var acc = _scandalHeat();
  if (acc >= 25) return { tier: '引爆', label: '彻底曝光·塌房边缘', icon: '⛈️', color: 'var(--danger)' };
  if (acc >= 15) return { tier: '哗然', label: '舆论哗然', icon: '🔴', color: '#ff4d4f' };
  if (acc >= 10) return { tier: '升温', label: '曝光升温', icon: '🟠', color: '#fa8c16' };
  if (acc >= 5)  return { tier: '暗涌', label: '暗流涌动', icon: '🟡', color: '#faad14' };
  return { tier: '安全', label: '安全低调', icon: '🟢', color: '#52c41a' };
}

// 累加恋情曝光风险（正值升危、负值缓和），并记入事业史
// 仅用于约会/深夜见面/被拍/绯闻等恋情相关操作，不应用于事业活动。
export function addExposure(mag, reason) {
  var E = GS.entSim;
  if (!E) return mag;
  mag = mag || 0;
  var oldTier = getExposureTier().tier;
  var oldAccum = _scandalHeat();
  E.misc.scandalHeat = Math.max(0, oldAccum + mag);
  // 同步兼容旧字段（过渡期）
  E.misc.exposureAccum = E.misc.scandalHeat;
  var newTier = getExposureTier().tier;
  // 曝光升级警告：跨档位时弹 toast
  if (mag > 0 && newTier !== oldTier && newTier !== '安全') {
    try { if (typeof showToast !== 'undefined') showToast('⚠️ 恋情曝光等级上升：' + newTier + ' — ' + getExposureTier().label); } catch(e) {}
  }
  if (reason) {
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'scandal', text: reason + '（恋情曝光' + (mag >= 0 ? '+' : '') + mag + '，累计' + E.misc.scandalHeat + '）' });
  }
  saveGame();
  return E.misc.scandalHeat;
}

// 累加事业曝光度（发布作品/代言/综艺/画报等正常事业活动）
// 事业曝光涨人气速率，不触发绯闻塌房；正值与负值均可（负面新闻可能扣）。
export function addCareerPublicity(mag, reason) {
  var E = GS.entSim;
  if (!E) return mag;
  mag = mag || 0;
  if (typeof E.misc.careerPublicity !== 'number') E.misc.careerPublicity = 0;
  E.misc.careerPublicity = Math.max(0, E.misc.careerPublicity + mag);
  if (reason) {
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'publicity', text: reason + '（事业曝光' + (mag >= 0 ? '+' : '') + mag + '，累计' + E.misc.careerPublicity + '）' });
  }
  saveGame();
  return E.misc.careerPublicity;
}

// 获取事业曝光度（0-100+），供UI展示与人气增长速率计算
export function getCareerPublicity() {
  return (GS.entSim && GS.entSim.misc && typeof GS.entSim.misc.careerPublicity === 'number') ? GS.entSim.misc.careerPublicity : 0;
}

// 恋情曝光反噬：口碑下跌 + 事业受挫（人气）
export function applyDiscoveryBlowback(severity) {
  severity = Math.max(1, Math.min(5, severity || 1));
  var E = GS.entSim;
  if (!E) return { severity: severity, popDrop: 0 };
  var popDrop = severity * 7;
  addPopularity(-popDrop, '恋情曝光反噬·粉丝与舆论淹没（严重度' + severity + '）');
  E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'exposure', text: '恋情曝光反噬·粉丝与舆论淹没（严重度' + severity + '）' });
  saveGame();
  return { severity: severity, popDrop: popDrop };
}
