// ============================================================
// 娱乐圈模拟器（entSim）· 曝光阶梯
// 以 GS.entSim.misc.exposureAccum 为唯一真值源（替代旧四维舆论）。
// 旧四维舆论（fan/media/professional/anti）为不可见僵尸数据，已移除。
// 相关：engine.applySideEffects 累加曝光；endings 按 getExposureTier 定结局档位。
// ============================================================
import { GS, saveGame } from '../state.js';
import { addPopularity } from './state.js';

// 曝光阶梯阈值（以 exposureAccum 为判据）
// 阶梯：安全(<5) → 暗涌(5) → 升温(10) → 哗然(15) → 引爆(25)
export function getExposureTier() {
  var acc = (GS.entSim && GS.entSim.misc && GS.entSim.misc.exposureAccum) || 0;
  if (acc >= 25) return { tier: '引爆', label: '彻底曝光·塌房边缘', icon: '⛈️', color: 'var(--danger)' };
  if (acc >= 15) return { tier: '哗然', label: '舆论哗然', icon: '🔴', color: '#ff4d4f' };
  if (acc >= 10) return { tier: '升温', label: '曝光升温', icon: '🟠', color: '#fa8c16' };
  if (acc >= 5)  return { tier: '暗涌', label: '暗流涌动', icon: '🟡', color: '#faad14' };
  return { tier: '安全', label: '安全低调', icon: '🟢', color: '#52c41a' };
}

// 累加曝光值（正值升危、负值缓和），并记入事业史
export function addExposure(mag, reason) {
  var E = GS.entSim;
  if (!E) return mag;
  mag = mag || 0;
  var oldTier = getExposureTier().tier;
  var oldAccum = E.misc.exposureAccum || 0;
  E.misc.exposureAccum = Math.max(0, oldAccum + mag);
  var newTier = getExposureTier().tier;
  // 曝光升级警告：跨档位时弹 toast
  if (mag > 0 && newTier !== oldTier && newTier !== '安全') {
    try { if (typeof showToast !== 'undefined') showToast('⚠️ 曝光等级上升：' + newTier + ' — ' + getExposureTier().label); } catch(e) {}
  }
  if (reason) {
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'exposure', text: reason + '（曝光' + (mag >= 0 ? '+' : '') + mag + '，累计' + E.misc.exposureAccum + '）' });
  }
  saveGame();
  return E.misc.exposureAccum;
}

// 恋情曝光反噬：口碑下跌 + 事业受挫（人气）
export function applyDiscoveryBlowback(severity) {
  severity = Math.max(1, Math.min(5, severity || 1));
  var E = GS.entSim;
  if (!E) return { severity: severity, popDrop: 0 };
  var popDrop = severity * 7;
  addPopularity(-popDrop, '恋情曝光反噬·粉丝与舆论淹没（严重度' + severity + '）');
  E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle.dayCount, type: 'exposure', text: '恋情曝光反噬·粉丝与舆论淹没（严重度' + severity + '）' });
  saveGame();
  return { severity: severity, popDrop: popDrop };
}
