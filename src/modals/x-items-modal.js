import { MEMBERS, GS, escHtml, showToast } from '../core.js';
import { createModal } from './modal-factory.js';

export function showXItemsModal() {
  if (GS.gameMode === 'oneHeart') { showToast('X 记忆物品仅换乘模式可用'); return; }
  var xMember = MEMBERS.find(function(m) { return m.id === GS.secretX; });
  if (!xMember) { showToast('尚未设定前任 X'); return; }
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var inner = '<div class="modal-content"><h3>📦 X 记忆物品</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">制作组公开了以下与X相关的记忆物品：</p>';
  var items = GS.xItems[GS.secretX];
  var reveal = GS.xItemsRevealState[GS.secretX];
  if (items && reveal) {
    var lines = items.split('\n');
    var filtered = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (reveal === 'first' && line.indexOf('故事：') === 0) continue;
      filtered.push(line);
    }
    inner += '<div style="background:#fff5f5;border-radius:10px;padding:10px;margin-bottom:8px">' +
      '<p style="font-weight:700;font-size:14px;margin-bottom:4px">' + xMember.emoji + ' ' + escHtml(xMember.name) + '</p>' +
      '<p style="font-size:12px;color:#5d3a3a;white-space:pre-wrap">' + escHtml(filtered.join('\n')).replace(/\n/g, '<br>') + '</p>' +
      (reveal === 'first' ? '<p style="font-size:11px;color:#e91e63;margin-top:6px">⚠️ 故事将在下次公开时解锁</p>' : '') +
      '</div>';
  } else if (!reveal) {
    inner += '<p style="color:var(--text-muted);text-align:center;padding:20px 0">暂未公开记忆物品</p>';
  }
  inner += '<button class="modal-close-x" id="xItemsClose">✕</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#xItemsClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
