// ============================================================
// 娱乐圈模拟器（entSim）· 曝光阶梯（v2 拆分版）
// - scandalHeat：恋情曝光风险（约会/深夜见面/被拍/绯闻），驱动绯闻阶梯与结局
// - careerPublicity：事业曝光度（发布作品/代言/综艺/画报），仅影响人气增长速率
// 旧字段 exposureAccum 保留向后兼容读取，新写入均使用 split 字段。
// 旧四维舆论（fan/media/professional/anti）已移除。
// 相关：engine.applySideEffects 累加曝光；endings 按 getExposureTier 定结局档位。
// v3 强化：PR消耗prRemaining + 主动避风头hidingOut + 曝光衰减规则
// ============================================================
import { GS, saveGame } from '../state.js';
import { addPopularity } from './state.js';

// ── 公关次数管理 ──
// 获取剩余公关次数（初始2次，出道后每跨越章节+1，最多7次）
export function getPrRemaining() {
  var E = GS.entSim;
  if (!E || !E.misc) return 0;
  if (typeof E.misc.prRemaining !== 'number') E.misc.prRemaining = 2;
  return E.misc.prRemaining;
}

// 消耗一次公关（返回是否成功消耗）
export function usePr() {
  var E = GS.entSim;
  if (!E || !E.misc) return false;
  if (typeof E.misc.prRemaining !== 'number') E.misc.prRemaining = 2;
  if (E.misc.prRemaining <= 0) return false;
  E.misc.prRemaining--;
  E.misc.manualPRUsed = (E.misc.manualPRUsed || 0) + 1;
  saveGame();
  return true;
}

// ── 主动避风头 ──
// 玩家选择"避风头"时调用，下一天自动衰减额外+3
export function activateHidingOut() {
  var E = GS.entSim;
  if (!E || !E.misc) return;
  E.misc._hidingOut = true;
  E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'exposure', text: '选择主动避风头，低调行事减少曝光' });
  saveGame();
}

// ── 曝光衰减规则（每日自动调用） ──
// 返回值：{decayed: 衰减量, remaining: 剩余热度}
export function applyExposureDecay() {
  var E = GS.entSim;
  if (!E || !E.misc) return { decayed: 0, remaining: 0 };
  var currentHeat = (typeof E.misc.scandalHeat === 'number') ? E.misc.scandalHeat : (E.misc.exposureAccum || 0);
  if (currentHeat <= 0) return { decayed: 0, remaining: 0 };
  // 基础衰减：max(2, floor(current * 0.4))
  var decayAmount = Math.max(2, Math.floor(currentHeat * 0.4));
  // 被拍到后 3 天内衰减减半
  var gameDay = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  if (E.misc.lastCaughtDay > 0 && (gameDay - E.misc.lastCaughtDay) <= 3) {
    decayAmount = Math.max(1, Math.floor(decayAmount / 2));
  }
  // 主动避风头：额外衰减 +3
  if (E.misc._hidingOut) {
    decayAmount += 3;
    E.misc._hidingOut = false;
    E.careerHistory.push({ round: E.cycle.roundTotal, day: gameDay, type: 'exposure', text: '主动避风头·曝光额外-' + decayAmount });
  }
  E.misc.scandalHeat = Math.max(0, currentHeat - decayAmount);
  // 同步旧字段
  E.misc.exposureAccum = E.misc.scandalHeat;
  E.misc._exposureDecayTimer = gameDay;
  saveGame();
  return { decayed: decayAmount, remaining: E.misc.scandalHeat };
}

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
  // ── 舆论余波：曝光≥10 时启动余波倒计时（3天内衰减减半+随机压力事件） ──
  if (mag > 0 && E.misc.scandalHeat >= 10 && !E.misc._aftershockActive) {
    E.misc._aftershockActive = true;
    E.misc._aftershockDays = 3;
    E.misc._aftershockStartDay = E.cycle._gameDayCount || E.cycle.dayCount || 1;
    E.careerHistory.push({ round: E.cycle.roundTotal, day: E.cycle._gameDayCount || E.cycle.dayCount, type: 'scandal', text: '舆论余波启动：接下来3天曝光衰减减半，可能有记者追问或粉丝质问' });
  }
  saveGame();
  return E.misc.scandalHeat;
}

// 舆论余波：每日换天时调用，返回余波事件文本（null=无余波事件）
export function tickAftershock() {
  var E = GS.entSim;
  if (!E || !E.misc) return null;
  if (!E.misc._aftershockActive) return null;
  var gameDay = E.cycle._gameDayCount || E.cycle.dayCount || 1;
  if (gameDay > E.misc._aftershockStartDay + E.misc._aftershockDays) {
    // 余波结束
    E.misc._aftershockActive = false;
    E.misc._aftershockDays = 0;
    E.careerHistory.push({ round: E.cycle.roundTotal, day: gameDay, type: 'scandal', text: '舆论余波消散，恢复正常节奏' });
    return null;
  }
  // 余波期内随机触发追问事件（每天30%概率）
  if (Math.random() < 0.30) {
    var aftershockPool = [
      { text: '经纪人转来一条记者短信：「关于之前的绯闻，我们还想跟进一下细节，方便聊聊吗？」', severity: 1 },
      { text: '粉丝群里有人匿名发帖：「实锤」二字配上了你前几天被拍的照片。', severity: 1 },
      { text: '公司公关部打来电话：「最近的舆论还在发酵，这几天尽量少公开露面。」', severity: 0 },
      { text: '队友小心翼翼地凑过来：「那个……最近网上有人说你们……是真的吗？」', severity: 2 }
    ];
    var pick = aftershockPool[Math.floor(Math.random() * aftershockPool.length)];
    if (pick.severity > 0) addExposure(pick.severity, '舆论余波·' + pick.text.slice(0, 20));
    return pick.text;
  }
  return null;
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
