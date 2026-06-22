import { GS, saveGame } from '../state.js';
import { MEMBERS } from '../data.js';

// Day 10 自由约会选择弹窗
export function showDay10DatingModal(onChosen) {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>👆 Day 10 · 指定约会对象</h3>' +
    '<p style="color:#8b6b6b;font-size:12px;margin-bottom:12px">今天是自由约会日——由你来指定跟谁约会。请选择：</p>' +
    '<div class="sms-target-options">';
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var isX = m.id === GS.secretX;
    inner += '<button class="sms-target-btn" data-id="' + m.id + '" style="font-size:15px;padding:14px">' +
      m.emoji + ' ' + m.name + '（' + m.stageName + '）' + (isX ? ' 💔' : '') + '</button>';
  }
  inner += '</div></div>';
  overlay.innerHTML = inner;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.sms-target-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var chosenId = this.dataset.id;
      overlay.remove();
      GS.day10ChosenDate = chosenId;
      saveGame();
      if (typeof onChosen === 'function') await onChosen();
    });
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}
