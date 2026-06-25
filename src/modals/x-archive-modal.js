import { MEMBERS, GS, escHtml } from '../core.js';
import { createModal } from './modal-factory.js';

function filterItemsByReveal(memberId, items) {
  if (!items) return '';
  var reveal = GS.xItemsRevealState && GS.xItemsRevealState[memberId];
  if (!reveal) return '';
  if (reveal === 'first') {
    return items.split('\n').filter(function(l) { return l.indexOf('故事：') !== 0; }).map(function(l) { return escHtml(l); }).join('<br>');
  }
  return escHtml(items).replace(/\n/g, '<br>');
}

function formatXStory(text) {
  if (!text) return '';
  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  var html = '';
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('## ') === 0) {
      html += '<div style="font-weight:700;font-size:14px;color:#c2185b;margin:10px 0 4px 0">' + escHtml(line.replace(/^##\s*/, '')) + '</div>';
    } else {
      html += '<p style="margin-bottom:4px;line-height:1.6">' + escHtml(line) + '</p>';
    }
  }
  return html;
}

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
  inner += formatXStory(GS.xBackstory) +
    '<hr style="border-color:#f0d0d0;margin:10px 0">';
  for (var i = 0; i < otherMembers.length; i++) {
    var om = otherMembers[i];
    inner += '<p><span class="x-member-name">' + om.emoji + ' ' +
      escHtml(om.name) + '（' + escHtml(om.stageName) + '）↔ 场外X（女性）</span></p>';
    inner += formatXStory(GS.memberXBackstories[om.id]) +
      '<hr style="border-color:#f0d0d0;margin:10px 0">';
  }
  inner += '<button class="modal-close-x" id="xArchiveClose">✕</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#xArchiveClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
