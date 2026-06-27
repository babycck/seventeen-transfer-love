import { MEMBERS, GS, escHtml } from '../core.js';

export function showDiaryModal() {
  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML =
    '<div class="modal-content" style="width:92%;max-width:420px;display:flex;flex-direction:column;height:80vh">' +
    '<button class="modal-close-x" id="diaryModalClose">✕</button>' +
    '<h3 style="text-align:center;margin-bottom:12px">📝 日记</h3>' +
    '<div style="display:flex;gap:4px;margin-bottom:12px;border-bottom:1.5px solid var(--border-primary)">' +
    '<button class="diary-tab active" id="diaryTabMine" style="flex:1;padding:8px;border:none;background:var(--accent-primary-light);border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:var(--accent-primary);font-weight:600">📖 我的</button>' +
    '<button class="diary-tab" id="diaryTabHis" style="flex:1;padding:8px;border:none;background:transparent;border-radius:8px 8px 0 0;font-size:13px;cursor:pointer;color:var(--text-muted)">📖 他的</button>' +
    '</div>' +
    '<div id="diaryTabContent" style="flex:1;overflow-y:auto;min-height:0">' +
    renderDiaryEntries('heroine') +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#diaryModalClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });

  overlay.querySelector('#diaryTabMine').addEventListener('click', function() {
    document.getElementById('diaryTabContent').innerHTML = renderDiaryEntries('heroine');
    document.querySelectorAll('.diary-tab').forEach(function(t) {
      t.style.background = 'transparent'; t.style.color = 'var(--text-muted)'; t.style.fontWeight = 'normal';
    });
    this.style.background = 'var(--accent-primary-light)'; this.style.color = 'var(--accent-primary)'; this.style.fontWeight = '600';
  });

  overlay.querySelector('#diaryTabHis').addEventListener('click', function() {
    document.getElementById('diaryTabContent').innerHTML = renderDiaryEntries('member');
    document.querySelectorAll('.diary-tab').forEach(function(t) {
      t.style.background = 'transparent'; t.style.color = 'var(--text-muted)'; t.style.fontWeight = 'normal';
    });
    this.style.background = 'var(--accent-primary-light)'; this.style.color = 'var(--accent-primary)'; this.style.fontWeight = '600';
  });
}

function renderDiaryEntries(view) {
  var entries = GS.diaryEntries || [];
  if (entries.length === 0) {
    return '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有日记 📝<br>继续剧情会自动生成</div>';
  }

  var html = '';
  for (var i = entries.length - 1; i >= 0; i--) {
    var e = entries[i];
    var content = view === 'heroine' ? e.heroineEntry : e.memberEntry;
    if (!content) continue;
    html += '<div class="diary-card">' +
      '<div class="diary-card-date">' + escHtml(e.date || '') + '</div>' +
      '<div class="diary-card-body">' + escHtml(content).replace(/\n/g, '<br>') + '</div>' +
      '</div>';
  }

  if (!html) {
    return '<div style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:13px">还没有日记 📝<br>继续剧情会自动生成</div>';
  }

  return html;
}
