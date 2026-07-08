import { escHtml } from '../utils.js';

// 自定义确认弹窗（返回 Promise<boolean>，替代原生 confirm）
// 不复用 createModal（其遮罩点击会关闭弹窗，不适合破坏性操作）
// 遮罩点击不做任何事，必须点取消/确认按钮

export function showConfirmModal(message, opts) {
  opts = opts || {};
  var title = opts.title || '确认';
  var confirmText = opts.confirmText || '确定';
  var cancelText = opts.cancelText || '取消';

  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var inner = '<div class="modal-content confirm-modal-content" style="text-align:center">' +
      '<h3 style="margin-bottom:12px;color:var(--text-primary,#3d2c2c)">' + escHtml(title) + '</h3>' +
      '<p style="font-size:14px;color:var(--text-muted,#8b6b6b);margin-bottom:20px;line-height:1.6">' + escHtml(message) + '</p>' +
      '<div style="display:flex;gap:10px;justify-content:center">' +
      '<button class="confirm-cancel-btn" style="flex:1;max-width:120px;padding:10px 20px;border:1.5px solid var(--border-soft,#e0c0c0);border-radius:10px;background:var(--bg-soft,#fff5f5);color:var(--text-muted,#8b6b6b);font-size:14px;cursor:pointer;font-family:inherit">' + cancelText + '</button>' +
      '<button class="confirm-ok-btn" style="flex:1;max-width:120px;padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--accent-primary,#e91e63),#c2185b);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">' + confirmText + '</button>' +
      '</div>' +
      '<button class="modal-close-x" style="position:absolute;top:8px;right:12px;background:none;border:none;font-size:20px;color:var(--text-muted,#8b6b6b);cursor:pointer">✕</button>' +
      '</div>';

    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    // 阻止遮罩点击关闭
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        // 不做任何事，防止误操作
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // 确认按钮
    overlay.querySelector('.confirm-ok-btn').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      resolve(true);
    });

    // 取消按钮
    overlay.querySelector('.confirm-cancel-btn').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      resolve(false);
    });

    // 关闭 X 按钮
    overlay.querySelector('.modal-close-x').addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      resolve(false);
    });
  });
}

// 信息确认弹窗（返回 Promise<boolean>）：正文支持自定义 HTML，但仅用于展示
// 我们自行构造的安全内容（成员名/行程等来自固定数据），调用方需自行对动态文本 escHtml。
export function showActionInfoModal(title, htmlBody, confirmText, cancelText) {
  confirmText = confirmText || '确定';
  cancelText = cancelText || '取消';
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var inner = '<div class="modal-content confirm-modal-content" style="text-align:center;max-width:340px">' +
      '<h3 style="margin-bottom:12px;color:var(--text-primary,#3d2c2c)">' + escHtml(title) + '</h3>' +
      '<div style="font-size:14px;color:var(--text-muted,#8b6b6b);margin-bottom:20px;line-height:1.75;text-align:left">' + htmlBody + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:center">' +
      '<button class="confirm-cancel-btn" style="flex:1;max-width:120px;padding:10px 20px;border:1.5px solid var(--border-soft,#e0c0c0);border-radius:10px;background:var(--bg-soft,#fff5f5);color:var(--text-muted,#8b6b6b);font-size:14px;cursor:pointer;font-family:inherit">' + escHtml(cancelText) + '</button>' +
      '<button class="confirm-ok-btn" style="flex:1;max-width:120px;padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--accent-primary,#e91e63),#c2185b);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">' + escHtml(confirmText) + '</button>' +
      '</div>' +
      '<button class="modal-close-x" style="position:absolute;top:8px;right:12px;background:none;border:none;font-size:20px;color:var(--text-muted,#8b6b6b);cursor:pointer">✕</button>' +
      '</div>';

    overlay.innerHTML = inner;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); }
    });

    overlay.querySelector('.confirm-ok-btn').addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); overlay.remove(); resolve(true);
    });
    overlay.querySelector('.confirm-cancel-btn').addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); overlay.remove(); resolve(false);
    });
    overlay.querySelector('.modal-close-x').addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); overlay.remove(); resolve(false);
    });
  });
}
