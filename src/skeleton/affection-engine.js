import { GS, saveGame } from '../state.js';
import { dispatch, actions } from '../store.js';
import { MEMBERS } from '../data.js';
import { updateAffection, addAffectionLog } from '../affection.js';

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
      GS.affFatigue[ch.memberId] = fatigue + 1;
    } else if (finalDelta > 0) {
      GS.affFatigue[ch.memberId] = 0;
    }
    if (finalDelta > 0) GS.affFatigue._lastTarget = ch.memberId;

    updateAffection(ch.memberId, finalDelta);
    addAffectionLog(ch.memberId, finalDelta, reason + (finalDelta !== ch.delta ? '（调整后：原' + ch.delta + '）' : ''));
  }
  GS.pendingAffChanges = [];
  // 修罗场强度检测：结算后若 >=2 位成员好感度 >=60，强度+1
  if (GS.rivalryIntensity === undefined) GS.rivalryIntensity = 0;
  var highAffCount = 0;
  for (var j = 0; j < GS.selectedMembers.length; j++) {
    var mid = GS.selectedMembers[j];
    if ((GS.affection[mid] || 0) >= 60) highAffCount++;
  }
  if (highAffCount >= 2 && GS.rivalryIntensity < 5) {
    GS.rivalryIntensity++;
  }
  saveGame();
}
