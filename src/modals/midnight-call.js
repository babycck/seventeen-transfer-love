import { GS, saveGame } from '../state.js';
import { MEMBERS } from '../data.js';

// 午夜匿名电话亭
export function showMidnightCallModal(onCall) {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>📞 午夜匿名电话亭</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">客厅角落出现了一部老式转盘电话。制作组广播：每人可以打一通匿名电话，对方不知道是谁。</p>' +
    '<p style="font-size:12px;color:#5d3a3a;margin-bottom:10px"><strong>选择你想打给的人：</strong></p>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    inner += '<button class="sms-target-btn" data-member-id="' + m.id + '">' + m.emoji + ' ' + m.name + '</button>';
  }
  inner += '<button class="sms-target-btn" id="callSkip" style="background:#f5f5f5;color:#888">🚫 不打这通电话</button>';
  inner += '</div>' +
    '<div id="callInputArea" style="display:none;margin-top:10px">' +
    '<p style="font-size:11px;color:#8b6b6b;margin-bottom:6px">输入你想说的话（对方不知道是你）：</p>' +
    '<textarea id="callContentInput" style="width:100%;min-height:80px;border:1.5px solid #e0c0c0;border-radius:10px;padding:8px;font-size:13px;font-family:inherit;resize:vertical;" placeholder="写下你想说的话..."></textarea>' +
    '<button class="btn-confirm" id="callSubmit" style="margin-top:8px;width:100%">拨打</button>' +
    '</div>' +
    '<button class="modal-close" id="callClose" style="margin-top:8px">取消</button></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  var selectedTargetId = null;

  overlay.querySelectorAll('.sms-target-btn[data-member-id]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectedTargetId = this.dataset.memberId;
      overlay.querySelectorAll('.sms-target-btn').forEach(function(b) {
        b.style.background = '#fff5f5'; b.style.color = '#5d3a3a'; b.style.borderColor = '#e8c8c8';
      });
      this.style.background = '#e91e63'; this.style.color = '#fff'; this.style.borderColor = '#e91e63';
      document.getElementById('callInputArea').style.display = 'block';
      document.getElementById('callContentInput').focus();
    });
  });

  document.getElementById('callSkip').addEventListener('click', function() {
    overlay.remove();
    if (typeof onCall === 'function') onCall(null, null);
  });

  document.getElementById('callSubmit').addEventListener('click', function() {
    var content = document.getElementById('callContentInput').value.trim();
    if (!content || !selectedTargetId) return;
    overlay.remove();
    if (typeof onCall === 'function') onCall(selectedTargetId, content);
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}
