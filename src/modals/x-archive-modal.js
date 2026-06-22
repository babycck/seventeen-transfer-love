import { MEMBERS, GS, escHtml } from '../core.js';
import { createModal } from './modal-factory.js';

export function showXArchiveModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });
  var xMember = members.find(function(m) { return m.id === GS.secretX; });
  var otherMembers = members.filter(function(m) { return m.id !== GS.secretX; });
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>📋 X 关系档案</h3>' +
    '<p><span class="x-member-name">💔 ' + escHtml(GS.heroineProfile.name) + ' ↔ ' +
    escHtml(xMember.name) + '（' + escHtml(xMember.stageName) + '）· 场内X</span></p>';
  if (GS.xItems[xMember.id]) {
    inner += '<p style="font-size:11px;color:#8b6b6b;background:#fff5f5;padding:6px;border-radius:6px">📦 记忆物品：' + escHtml(GS.xItems[xMember.id]).replace(/\n/g, '<br>') + '</p>';
  }
  inner += '<p>' + (GS.xBackstory || '档案生成中...').replace(/\n/g, '<br>') + '</p>' +
    '<hr style="border-color:#f0d0d0;margin:10px 0">';
  for (var i = 0; i < otherMembers.length; i++) {
    var om = otherMembers[i];
    inner += '<p><span class="x-member-name">' + om.emoji + ' ' +
      escHtml(om.name) + '（' + escHtml(om.stageName) + '）↔ 场外X（女性）</span></p>';
    if (GS.xItems[om.id]) {
      inner += '<p style="font-size:11px;color:#8b6b6b;background:#fff5f5;padding:6px;border-radius:6px">📦 记忆物品：' + escHtml(GS.xItems[om.id]).replace(/\n/g, '<br>') + '</p>';
    }
    inner += '<p>' + (GS.memberXBackstories[om.id] || '档案生成中...').replace(/\n/g, '<br>') + '</p>' +
      '<hr style="border-color:#f0d0d0;margin:10px 0">';
  }
  inner += '<button class="modal-close" id="xArchiveClose">关闭</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#xArchiveClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
