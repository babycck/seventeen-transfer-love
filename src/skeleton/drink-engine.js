import { GS } from '../state.js';
import { MEMBERS } from '../data.js';
import { dispatch, actions } from '../store.js';

// 累加喝酒计数（兼容 AI 输出 drinks 数组）
export function applyDrinksFromParsed(parsed) {
  if (!parsed || !parsed.drinks || parsed.drinks.length === 0) return;
  for (var i = 0; i < parsed.drinks.length; i++) {
    var d = parsed.drinks[i];
    if (!d || !d.name) continue;
    var drinkerId = null;
    if (d.name === '女主' || d.name === '你') {
      drinkerId = 'heroine';
    } else {
      var m = MEMBERS.find(function(mm) { return mm.name === d.name; });
      if (m && GS.selectedMembers.indexOf(m.id) >= 0) drinkerId = m.id;
    }
    if (!drinkerId) continue;
    var cnt = d.count || 1;
    dispatch(actions.addDrink(drinkerId, cnt));
    if (!GS.drunkTrigger && (GS.drinkCounts[drinkerId] || 0) >= 2) {
      GS.drunkTrigger = drinkerId;
      if (GS.truthState) GS.truthState.drunkDeclared = true;
    }
  }
}
