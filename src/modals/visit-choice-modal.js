import { escHtml } from '../utils.js';

// 探班 3 选 1 选择弹窗：列出今天可探的成员行程卡片，玩家选一个去探
// 返回 Promise<roleKey|null>；点卡片 resolve(roleKey)，取消/✕/遮罩外 resolve(null)
// 暗紫色 es-modal 主题，与其他 entSim 弹窗统一
export function showVisitChoiceModal(choices) {
  choices = choices || [];
  return new Promise(function(resolve) {
    if (!choices.length) { resolve(null); return; }
    var overlay = document.createElement('div');
    overlay.className = 'es-modal-overlay es-modal-dark';

    var cardsHtml = choices.map(function(c, idx) {
      var _typeTag = c.type === 'team' ? '团队·公开场合' : '单人·较私密';
      var _note = c.note ? '<div class="es-visit-note">' + escHtml(c.note) + '</div>' : '';
      return '<div class="es-visit-card" data-idx="' + idx + '">' +
        '<span class="es-visit-role">' + escHtml(c.label) + '</span>' +
        '<div class="es-visit-name">' + escHtml(c.name) + '</div>' +
        '<div class="es-visit-task">在 <b>' + escHtml(c.place) + '</b> ' + escHtml(c.task) + '</div>' +
        '<span class="es-visit-type">' + _typeTag + '</span>' +
        _note +
        '</div>';
    }).join('');

    var inner = '<div class="es-modal">' +
      '<div class="es-modal-title">🎬 今天去探谁的班？</div>' +
      '<div class="es-modal-body"><p style="text-align:center;color:var(--text-muted);font-size:12.5px;margin:0 0 14px">每天只能探一次，选定后不可更改</p>' +
      '<div class="es-visit-cards">' + cardsHtml + '</div></div>' +
      '<div class="es-modal-btns"><button class="es-modal-btn" id="es-visit-cancel">再想想</button></div>' +
      '</div>';

    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { overlay.remove(); resolve(null); }
    });

    var cardEls = overlay.querySelectorAll('.es-visit-card');
    Array.prototype.forEach.call(cardEls, function(cardEl) {
      cardEl.addEventListener('click', function(e) {
        var idx = parseInt(cardEl.getAttribute('data-idx'), 10);
        overlay.remove();
        resolve(choices[idx] ? choices[idx].roleKey : null);
      });
    });

    overlay.querySelector('#es-visit-cancel').addEventListener('click', function() {
      overlay.remove(); resolve(null);
    });
  });
}
