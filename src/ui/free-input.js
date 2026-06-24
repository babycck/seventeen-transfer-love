import { escHtml } from '../core.js';
import { GS } from '../state.js';
import { MAX_STAY_COUNT, PHASE_ACTION_LIMIT } from '../data.js';

// 渲染自由输入区域
export function renderFreeInput(freeInputExhausted) {
  var isNight = GS.phaseIndex === 3;
  var stayExhausted = GS.stayCount >= MAX_STAY_COUNT;
  var smsSent = GS.smsSentToday;
  var freeDisabled = (smsSent && isNight && stayExhausted) || freeInputExhausted;

  var remaining = Math.max(0, PHASE_ACTION_LIMIT - ((GS.phaseOptionCount || 0) + (GS.phaseFreeCount || 0)));
  var html = '<div class="card">';
  if (freeInputExhausted) {
    html += '<p style="font-size:10px;color:#e65100;text-align:right;margin-bottom:4px">本时段行动次数已用完（' + PHASE_ACTION_LIMIT + '/' + PHASE_ACTION_LIMIT + '）</p>';
  } else {
    html += '<p style="font-size:10px;color:#8b6b6b;text-align:right;margin-bottom:4px">本时段剩余行动次数：' + remaining + '/' + PHASE_ACTION_LIMIT + '</p>';
  }
  html += '<div class="free-input-area">' +
    '<input type="text" id="freeInput" placeholder="✍️ 写下你想发生的一段剧情..." value="' +
    escHtml(GS.freeInput || '') + '"' + (freeDisabled ? ' disabled' : '') + '>' +
    '<button class="btn-save-input" id="btnSaveInput">💾</button>' +
    '<button class="btn-clear-input" id="btnClearInput">❌</button>' +
    '<button class="btn-act-input" id="btnActInput"' + (freeDisabled ? ' disabled' : '') + '>✍️ 生成剧情</button></div></div>';
  return html;
}
