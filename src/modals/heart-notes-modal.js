import { MEMBERS, GS, HEART_NOTE_TEMPLATES, escHtml } from '../core.js';
import { createModal } from './modal-factory.js';

export function showHeartNotesModal() {
  var members = GS.selectedMembers.map(function(id) {
    return MEMBERS.find(function(m) { return m.id === id; });
  });

  var inner = '<div class="modal-content"><h3>📝 心动笔记</h3>' +
    '<p style="font-size:12px;color:#8b6b6b;margin-bottom:10px">随着好感度提升和秘密任务完成，逐步解锁成员的隐藏细节。</p>';

  var hasAnyNote = false;
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var notes = GS.heartNotes[m.id] || [];
    var allTemplates = HEART_NOTE_TEMPLATES[m.id] || [];
    if (notes.length > 0) hasAnyNote = true;
    inner += '<div style="background:var(--bg-soft,#fff5f5);border-radius:12px;padding:12px;margin-bottom:10px">' +
      '<p style="font-weight:700;font-size:15px;margin-bottom:6px;color:var(--text-primary,#3d2c2c)">' + m.emoji + ' ' + m.name + ' <span style="font-size:12px;color:var(--text-muted,#8b6b6b)">（' + notes.length + '/' + allTemplates.length + '）</span></p>';
    if (notes.length === 0) {
      inner += '<p style="font-size:12px;color:#8b6b6b">（尚未解锁）</p>';
    } else {
      for (var j = 0; j < notes.length; j++) {
        var note = notes[j];
        var ua = note.unlockedAt || {};
        var source = ua.source || 'mission'; // 向后兼容
        var sourceLabel = source === 'affection' ? '💚 好感度解锁（阈值' + (ua.threshold || '?') + '）' : '🎯 秘密任务「' + (ua.mission || '?') + '」';
        var borderColor = source === 'affection' ? '#2e7d32' : '#e91e63';
        inner += '<div style="background:var(--bg-card,#fff);border-radius:8px;padding:8px;margin-bottom:6px;border-left:3px solid ' + borderColor + '">' +
          '<p style="font-size:13px;color:var(--text-secondary,#5d3a3a);margin:0">' + escHtml(note.text) + '</p>' +
          '<p style="font-size:10px;color:var(--text-muted,#8b6b6b);margin-top:4px">解锁于 Day ' + (ua.day || '?') + ' · ' + sourceLabel + '</p></div>';
      }
    }
    inner += '</div>';
  }

  if (!hasAnyNote) {
    inner += '<p style="color:#8b6b6b;text-align:center;padding:20px 0">还没有解锁任何心动笔记。<br>完成秘密任务可以提升好感并解锁笔记。</p>';
  }

  if (GS.secretMissionUnlockFinal) {
    inner += '<div style="background:linear-gradient(135deg,#fce4ec,#f8e8e8);border-radius:12px;padding:12px;margin-bottom:10px;border:2px solid #e91e63">' +
      '<p style="font-weight:700;font-size:14px;color:#c2185b;margin-bottom:6px">💌 特殊解锁：X 的未寄出的信</p>' +
      '<p style="font-size:12px;color:#5d3a3a;line-height:1.7">你在节目中完成了所有秘密任务，制作组在最后一天交给你一封信——是X在参加节目前写下的，从未寄出。<br><br>' +
      '「我以为我已经放下了。但当我签下那份参加节目的同意书时，我知道我在骗自己。<br>我不知道你会不会来。我不知道你会选谁。<br>我只知道，如果这是最后一次能和你共处一室的机会，我不想错过。」</p></div>';
  }

  inner += '<button class="modal-close-x" id="heartNotesClose">✕</button></div>';
  var overlay = createModal(inner);
  overlay.querySelector('#heartNotesClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}
