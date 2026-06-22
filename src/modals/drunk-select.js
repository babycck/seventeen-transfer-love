import { GS } from '../state.js';
import { MEMBERS } from '../data.js';
import { escHtml } from '../core.js';

// 醉酒选择成员弹窗
export function showDrunkMemberSelectModal(choiceText, onSelected) {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>选择一位成员</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">' + escHtml(choiceText) + '</p>' +
    '<div style="display:flex;flex-direction:column;gap:8px">';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    inner += '<button class="sms-target-btn" data-member-id="' + m.id + '">' + m.emoji + ' ' + m.name + '</button>';
  }
  inner += '</div><button class="modal-close" id="drunkSelectClose" style="margin-top:10px">取消</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('#drunkSelectClose').addEventListener('click', function() {
    overlay.remove();
  });

  overlay.querySelectorAll('.sms-target-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var memberId = this.dataset.memberId;
      overlay.remove();
      if (typeof onSelected === 'function') await onSelected(choiceText, memberId);
    });
  });
}
