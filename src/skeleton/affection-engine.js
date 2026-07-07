import { GS, saveGame } from '../state.js';
import { dispatch, actions } from '../store.js';
import { MEMBERS } from '../data.js';
import { updateAffection, addAffectionLog } from '../affection.js';
import { updateSecretDating, updateMemberBond } from './event-triggers.js';
import { updateMoodFromAffChange } from './mood-engine.js';

// 结算 pending 好感度（带递减/疲劳/负面增强）
export function settlePendingAffChanges() {
  if (!GS.pendingAffChanges || GS.pendingAffChanges.length === 0) return;
  for (var i = 0; i < GS.pendingAffChanges.length; i++) {
    var ch = GS.pendingAffChanges[i];
    var finalDelta = ch.delta;
    var reason = ch.reason || '';

    // 负面行为扣分增加
    if ((reason.indexOf('吃醋') >= 0 || reason.indexOf('嫉妒') >= 0) && finalDelta < 0) {
      finalDelta = -5;
    }
    if ((reason.indexOf('未收到') >= 0 || reason.indexOf('忽略') >= 0) && finalDelta < 0) {
      finalDelta = -3;
    }

    // 同一行为重复做效果递减
    if (!GS.affActionHistory) GS.affActionHistory = {};
    var actionKey = ch.memberId + '_' + reason;
    var count = GS.affActionHistory[actionKey] || 0;
    if (count >= 1 && finalDelta > 0) {
      if (count === 1) finalDelta = Math.max(1, finalDelta - 2);
      else if (count >= 2) finalDelta = Math.max(1, finalDelta - 4);
    }
    GS.affActionHistory[actionKey] = count + 1;

    // 好感度疲劳值：连续对同一人行动效率下降
    if (!GS.affFatigue) GS.affFatigue = {};
    var lastTarget = GS.affFatigue._lastTarget;
    if (lastTarget === ch.memberId && finalDelta > 0) {
      var fatigue = GS.affFatigue[ch.memberId] || 0;
      finalDelta = Math.max(1, finalDelta - Math.floor(fatigue / 2));
      GS.affFatigue[ch.memberId] = Math.min(5, fatigue + 1); // BUG-12: 封顶 5，避免过度抑制好感（与 SEVENTEEN.txt 一致）
    } else if (finalDelta > 0) {
      GS.affFatigue[ch.memberId] = 0;
    }
    if (finalDelta > 0) GS.affFatigue._lastTarget = ch.memberId;

    updateAffection(ch.memberId, finalDelta);
    addAffectionLog(ch.memberId, finalDelta, reason + (finalDelta !== ch.delta ? '（调整后：原' + ch.delta + '）' : ''));
    updateMoodFromAffChange(ch.memberId, finalDelta, reason); // IMP-13：好感变化驱动情绪
  }
  GS.pendingAffChanges = [];
  // 修罗场强度检测：仅在跃迁瞬间 +1（BUG-04，避免稳态重复累加）
  // IMP-02：判定由绝对阈值(>=2人>=60)改为相对阈值——最高两位差距<=15 且两者都>=40
  // 即"只要在争、且都够格"就升温，与数值通胀/平衡压价脱钩。
  if (GS.rivalryIntensity === undefined) GS.rivalryIntensity = 0;
  if (GS.rivalryHighActive === undefined) GS.rivalryHighActive = false;
  var sortedAff = GS.selectedMembers
    .map(function(mid) { return GS.affection[mid] || 0; })
    .sort(function(a, b) { return b - a; });
  var top1 = sortedAff[0] || 0;
  var top2 = sortedAff[1] || 0;
  var isRivalryHigh = (top1 >= 40 && top2 >= 40) && (top1 - top2 <= 15);
  if (isRivalryHigh && !GS.rivalryHighActive) {
    GS.rivalryHighActive = true;
    if (GS.rivalryIntensity < 5) GS.rivalryIntensity++;
    // IMP-11：好感最高的两位在争，彼此 bond 恶化（关系网从"三角"升级）
    var _topIds = GS.selectedMembers.slice().sort(function(a, b) { return (GS.affection[b] || 0) - (GS.affection[a] || 0); });
    if (_topIds.length >= 2) updateMemberBond(_topIds[0], _topIds[1], -1);
  } else if (!isRivalryHigh) {
    // 退出高危态后允许下次再次跃迁触发（同一局内可多次升温，但受上限 5 约束）
    GS.rivalryHighActive = false;
  }
  updateSecretDating(); // IMP-10：好感结算后刷新脚踏两条船高风险状态
  saveGame();
}
