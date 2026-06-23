import { MEMBERS, GS, escHtml } from '../core.js';
import { getAffectionDesc } from '../affection.js';

export function showAffectionPanel() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content" style="width:480px;max-width:98vw"><h3>💕 好感度面板</h3>';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var aff = GS.affection[m.id] || 0;
    var logs = GS.affectionLog[m.id] || [];
    inner += '<div style="background:#fff5f5;border-radius:12px;padding:12px;margin-bottom:10px">' +
      '<p style="font-weight:700;font-size:15px;margin-bottom:6px">' +
      m.emoji + ' ' + m.name + ' <span style="font-size:18px">' + getAffectionDesc(aff) + '</span> ' +
      '<span style="font-size:13px;color:#8b6b6b">' + aff + '</span></p>';
    if (logs.length === 0) {
      inner += '<p style="font-size:12px;color:#8b6b6b">（暂无变化记录）</p>';
    } else {
      var recentLogs = logs.slice(-3);
      for (var j = recentLogs.length - 1; j >= 0; j--) {
        var log = recentLogs[j];
        var changeClass = log.change > 0 ? 'aff-change-pos' : 'aff-change-neg';
        inner += '<div class="aff-log-item">Day ' + log.day + ' ' + log.phase + '：' +
          '<span class="' + changeClass + '">' + (log.change > 0 ? '+' : '') + log.change + '</span> ' +
          escHtml(log.reason) + ' <span class="aff-total">→ ' + log.total + '</span></div>';
      }
    }
    inner += '</div>';
  }
  inner += '<button class="modal-close-x" id="affPanelClose">✕</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#affPanelClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
