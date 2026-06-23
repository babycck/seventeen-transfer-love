import { GS, escHtml } from '../core.js';
import { MEMBERS } from '../data.js';
import { createModal } from './modal-factory.js';

export function showSmsHistoryModal() {
  var inner = '<div class="modal-content"><h3>📜 短信历史</h3>';
  if (GS.smsHistory.length === 0) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">暂无已发送的短信</p>';
  } else {
    for (var i = GS.smsHistory.length - 1; i >= 0; i--) {
      var sms = GS.smsHistory[i];
      var member = MEMBERS.find(function(m) { return m.id === sms.target; });
      var emoji = member ? member.emoji : '💬';
      inner += '<div style="background:#fff5f5;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px">' +
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#fce4ec,#f8bbd0);font-size:18px;flex-shrink:0">' + emoji + '</span>' +
        '<div style="flex:1;min-width:0">' +
        '<p style="font-size:13px;font-weight:600;color:#c2185b;margin-bottom:4px">📨 发给 ' + emoji + ' ' + escHtml(sms.name) + '</p>' +
        '<p style="font-size:11px;color:#8b6b6b;margin-bottom:6px">Day ' + sms.day + '</p>' +
        '<p style="font-size:13px;color:#5d3a3a">' + escHtml(sms.content) + '</p>' +
        '</div></div>';
    }
  }
  inner += '<button class="modal-close-x" id="smsHistoryClose">✕</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#smsHistoryClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
