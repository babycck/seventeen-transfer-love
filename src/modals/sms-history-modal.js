import { GS, escHtml } from '../core.js';
import { createModal } from './modal-factory.js';

export function showSmsHistoryModal() {
  var inner = '<div class="modal-content"><h3>📜 短信历史</h3>';
  if (GS.smsHistory.length === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无已发送的短信</p>';
  } else {
    for (var i = GS.smsHistory.length - 1; i >= 0; i--) {
      var sms = GS.smsHistory[i];
      inner += '<div style="background:#fff5f5;border-radius:10px;padding:10px;margin-bottom:8px">' +
        '<p style="font-size:11px;color:#8b6b6b;margin-bottom:4px">Day ' + sms.day + ' · 发给 <strong>' +
        escHtml(sms.name) + '</strong></p>' +
        '<p style="font-size:13px;color:#5d3a3a">' + escHtml(sms.content) + '</p></div>';
    }
  }
  inner += '<button class="modal-close-x" id="smsHistoryClose">✕</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#smsHistoryClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
