import { MEMBERS, GS, escHtml, saveGame } from '../core.js';

export function showEventCardModal() {
  GS._newEvents = false;
  var _oldDot = document.querySelector('.oneheart-tab[data-tab="event"] .tab-notification-dot');
  if (_oldDot) _oldDot.remove();

  var member = MEMBERS.find(function(m) { return m.id === GS.oneHeartMember; });
  if (!member) return;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  var cards = GS.oneHeartEventCards || [];
  var cardHtml = '';
  if (cards.length === 0) {
    cardHtml = '<div style="padding:40px 20px;text-align:center;color:var(--text-muted);font-size:14px">⚡ 暂无事件记录<br><span style="font-size:12px">剧情推进中会触发各种事件</span></div>';
  } else {
    var _typeLabels = {
      jealousy: '❤️‍🔥 吃醋', confrontation: '💢 争吵', rival: '💗 情敌',
      confession: '💗 告白', pool: '🎲 意外', surprise: '💝 惊喜',
      celebrity: '📸 路人围观', scandal: '📱 风波', sick: '🤒 生病',
      exjealous: '📦 吃醋', latenight: '🌙 深夜心事'
    };
    var _typeColors = {
      jealousy: '#fce4ec', confrontation: '#ffebee', rival: '#f3e5f5',
      confession: '#fce4ec', pool: '#fff3e0', surprise: '#e8f5e9',
      celebrity: '#e3f2fd', scandal: '#f3e5f5', sick: '#fff3e0',
      exjealous: '#fce4ec', latenight: '#e8eaf6'
    };
    for (var _ei = cards.length - 1; _ei >= 0; _ei--) {
      var _c = cards[_ei];
      var _label = _typeLabels[_c.type] || '⚡ 事件';
      var _color = _typeColors[_c.type] || '#f5f5f5';
      var _affText = '';
      if (_c.affChange && _c.affChange !== 0) {
        _affText = '<span style="color:' + (_c.affChange > 0 ? '#e53935' : '#43a047') + ';font-weight:600">♥ ' + (_c.affChange > 0 ? '+' : '') + _c.affChange + '</span>';
      }
      if (_c.rivalChange && _c.rivalChange !== 0) {
        _affText += ' <span style="color:' + (_c.rivalChange > 0 ? '#e53935' : '#43a047') + ';font-weight:600">💘 ' + (_c.rivalChange > 0 ? '+' : '') + _c.rivalChange + '</span>';
      }
      var _storyEscaped = escHtml(_c.story || '');
      cardHtml +=
        '<div class="event-card-item" style="background:#fff;border-radius:10px;margin-bottom:10px;padding:12px;border:1px solid var(--border-primary,#e0c0c0);box-shadow:0 1px 3px rgba(0,0,0,0.06)">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">' +
        '<span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;background:' + _color + '">' + _label + '</span>' +
        (_c.memberName ? '<span style="font-size:12px;color:var(--text-muted)">' + escHtml(_c.memberName) + '</span>' : '') +
        _affText +
        '<button class="event-edit-btn" data-ei="' + _ei + '" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-muted);padding:2px 6px;border-radius:4px">✏️</button>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">' + escHtml(_c.scenario || '') + '</div>' +
        '<div style="font-size:13px;color:var(--accent-primary,#c2185b);margin-bottom:8px">👉 ' + escHtml(_c.chosenOption || '') + '</div>' +
        (_c.story
          ? '<div class="event-story" data-ei="' + _ei + '" style="font-size:14px;line-height:1.7;color:var(--text-primary);padding:8px 10px;background:var(--bg-soft,#fff5f5);border-radius:8px;white-space:pre-wrap">' + _storyEscaped + '</div>'
          : '<div style="font-size:13px;color:var(--text-muted);padding:8px">正在生成故事...</div>') +
        '</div>';
    }
  }

  overlay.innerHTML =
    '<div class="modal-content" style="width:92%;max-width:420px;display:flex;flex-direction:column;height:80vh">' +
    '<button class="modal-close-x" id="eventCardModalClose">✕</button>' +
    '<h3 style="text-align:center;margin-bottom:12px">⚡ 事件记录</h3>' +
    '<div id="eventCardContent" style="flex:1;overflow-y:auto;min-height:0">' + cardHtml + '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  // 编辑按钮事件委托
  overlay.addEventListener('click', function(e) {
    var btn = e.target.closest('.event-edit-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      var ei = parseInt(btn.dataset.ei);
      toggleEditStory(ei, overlay, btn);
      return;
    }
    // 点击 textarea 时阻止冒泡，防止触发 overlay 关闭
    if (e.target.classList.contains('event-edit-textarea')) {
      e.stopPropagation();
      return;
    }
    if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); overlay.remove(); }
  });
  overlay.querySelector('#eventCardModalClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); overlay.remove();
  });
}

function toggleEditStory(idx, overlay, btn) {
  // 如果已经处于编辑状态（有 textarea 替代），则保存
  var existingTextarea = overlay.querySelector('.event-edit-textarea[data-ei="' + idx + '"]');
  if (existingTextarea) {
    // 保存
    var newText = existingTextarea.value;
    if (GS.oneHeartEventCards && GS.oneHeartEventCards[idx]) {
      GS.oneHeartEventCards[idx].story = newText;
      saveGame();
    }
    // 恢复为故事展示 div
    var parentEl = existingTextarea.parentNode;
    var displayDiv = document.createElement('div');
    displayDiv.className = 'event-story';
    displayDiv.setAttribute('data-ei', idx);
    displayDiv.style.cssText = 'font-size:14px;line-height:1.7;color:var(--text-primary);padding:8px 10px;background:var(--bg-soft,#fff5f5);border-radius:8px;white-space:pre-wrap';
    displayDiv.textContent = newText;
    parentEl.replaceChild(displayDiv, existingTextarea);
    btn.textContent = '✏️';
    btn.title = '编辑';
    return;
  }

  // 进入编辑模式：将 story div 替换为 textarea
  var storyEl = overlay.querySelector('.event-story[data-ei="' + idx + '"]');
  if (!storyEl) return;
  var currentText = storyEl.textContent;
  var textarea = document.createElement('textarea');
  textarea.className = 'event-edit-textarea';
  textarea.setAttribute('data-ei', idx);
  textarea.value = currentText;
  textarea.style.cssText = 'width:100%;box-sizing:border-box;min-height:120px;font-size:14px;line-height:1.7;padding:8px 10px;border:2px solid var(--accent-primary,#c2185b);border-radius:8px;resize:vertical;font-family:inherit;background:var(--bg-card,#fff);color:var(--text-primary)';
  storyEl.parentNode.replaceChild(textarea, storyEl);
  textarea.focus();
  btn.textContent = '💾';
  btn.title = '保存';
}
