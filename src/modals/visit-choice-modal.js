import { escHtml } from '../utils.js';

// 探班 3 选 1 选择弹窗：列出今天可探的成员行程卡片，玩家选一个去探
// 返回 Promise<roleKey|null>；点卡片 resolve(roleKey)，取消/✕/遮罩外 resolve(null)
// 仅「娱乐圈」世界观有三人行程；调用方负责过滤空行程与已探过的
export function showVisitChoiceModal(choices) {
  choices = choices || [];
  return new Promise(function(resolve) {
    if (!choices.length) { resolve(null); return; }
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var cardsHtml = choices.map(function(c, idx) {
      var _typeTag = c.type === 'team' ? '团队·公开场合' : '单人·较私密';
      var _note = c.note ? '<div class="vc-note">' + escHtml(c.note) + '</div>' : '';
      return '<div class="vc-card" data-idx="' + idx + '">' +
        '<div class="vc-role">' + escHtml(c.label) + '</div>' +
        '<div class="vc-name">' + escHtml(c.name) + '</div>' +
        '<div class="vc-task">在 <b>' + escHtml(c.place) + '</b> 进行「' + escHtml(c.task) + '」</div>' +
        '<div class="vc-type">' + _typeTag + '</div>' +
        _note +
        '</div>';
    }).join('');

    var inner = '<div class="modal-content vc-content">' +
      '<h3 class="vc-title">🎬 今天去探谁的班？</h3>' +
      '<p class="vc-sub">每天只能探一次，选定后不可更改</p>' +
      '<div class="vc-cards">' + cardsHtml + '</div>' +
      '<button class="vc-cancel">再想想</button>' +
      '<button class="modal-close-x" style="position:absolute;top:8px;right:12px;background:none;border:none;font-size:20px;color:var(--text-muted,#8b6b6b);cursor:pointer">✕</button>' +
      '</div>';

    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    // 遮罩外点击不做任何事，必须显式选择或取消，避免误触
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); }
    });

    var cardEls = overlay.querySelectorAll('.vc-card');
    Array.prototype.forEach.call(cardEls, function(cardEl) {
      cardEl.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        var idx = parseInt(cardEl.getAttribute('data-idx'), 10);
        overlay.remove();
        resolve(choices[idx] ? choices[idx].roleKey : null);
      });
    });

    overlay.querySelector('.vc-cancel').addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); overlay.remove(); resolve(null);
    });
    overlay.querySelector('.modal-close-x').addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); overlay.remove(); resolve(null);
    });
  });
}
